/**
 * supabaseData.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Supabase data access layer for CardioGuard AI.
 * All functions return null / { success: false } when Supabase is not
 * configured so the app can gracefully fall back to mock data.
 */

import { supabase, hasSupabaseEnv } from '@/lib/supabase'
import type {
  CardioPatient, BPVisit, PatientLab,
  Medication, Comorbidities,
  RiskResult, MedRecommendation,
} from './types'

// ── Raw Supabase row types ───────────────────────────────────────────────────
interface RawVisit {
  id: string
  visit_date: string
  sbp: number
  dbp: number
  heart_rate: number
  weight_kg: number | null
  bmi: number | null
}

interface RawLab {
  lab_date: string
  hba1c: number | null
  ldl: number | null
  hdl: number | null
  creatinine: number | null
  egfr: number | null
  potassium: number | null
}

interface RawComorbidity {
  diabetes: boolean
  ckd: boolean
  cad: boolean
  heart_failure: boolean
  stroke: boolean
  af: boolean
  arrhythmias?: boolean
  dementia?: boolean
}

interface RawMedication {
  drug_class: string
  drug_name: string
  dose: string | null
  frequency: string | null
  is_active: boolean
}

interface RawPatient {
  id: string
  patient_code: string
  national_id: string
  full_name: string
  age: number
  sex: 'ชาย' | 'หญิง'
  bp_target: number | null
  visits: RawVisit[]
  labs: RawLab[]
  comorbidities: RawComorbidity[] | RawComorbidity   // PostgREST may return object or array
  medications: RawMedication[]
}

// ── Mapper: Supabase → CardioPatient ────────────────────────────────────────
function mapPatient(row: RawPatient): CardioPatient {
  // Visits — sort by date ascending
  const visits: BPVisit[] = [...(row.visits ?? [])]
    .sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime())
    .map(v => ({
      date: v.visit_date,
      sbp: v.sbp,
      dbp: v.dbp,
      heartRate: v.heart_rate,
      weight: Number(v.weight_kg ?? 0),
      bmi: Number(v.bmi ?? 0),
    }))

  // Labs — take most recent
  const sortedLabs = [...(row.labs ?? [])].sort(
    (a, b) => new Date(b.lab_date).getTime() - new Date(a.lab_date).getTime()
  )
  const lr = sortedLabs[0]
  const labs: PatientLab = lr
    ? {
        date: lr.lab_date,
        hba1c:      lr.hba1c      ?? undefined,
        ldl:        lr.ldl        ?? undefined,
        hdl:        lr.hdl        ?? undefined,
        creatinine: lr.creatinine ?? undefined,
        egfr:       lr.egfr       ?? undefined,
        potassium:  lr.potassium  ?? undefined,
      }
    : { date: '' }

  // Comorbidities — PostgREST returns array for 1-to-1 via FK
  const comorbArr = Array.isArray(row.comorbidities)
    ? row.comorbidities
    : row.comorbidities ? [row.comorbidities] : []
  const cr = comorbArr[0]
  const comorbidities: Comorbidities = {
    diabetes:    cr?.diabetes     ?? false,
    ckd:         cr?.ckd          ?? false,
    cad:         cr?.cad          ?? false,
    heartFailure: cr?.heart_failure ?? false,
    stroke:      cr?.stroke       ?? false,
    af:          cr?.af           ?? false,
    arrhythmias: cr?.arrhythmias  ?? false,
    dementia:    cr?.dementia     ?? false,
  }

  // Medications — active only
  const medications: Medication[] = (row.medications ?? [])
    .filter(m => m.is_active)
    .map(m => ({
      drugClass:  m.drug_class as Medication['drugClass'],
      drugName:   m.drug_name,
      dose:       m.dose       ?? '',
      frequency:  m.frequency  ?? '',
    }))

  return {
    id:         row.patient_code,
    dbId:       row.id,          // Supabase UUID — kept for write operations
    nationalId: row.national_id,
    name:       row.full_name,
    age:        row.age,
    sex:        row.sex,
    bpTarget:   row.bp_target ?? 130,
    comorbidities,
    medications,
    visits,
    labs,
  }
}

// ── SELECT query helper ──────────────────────────────────────────────────────
const PATIENT_SELECT = `
  *,
  visits (*),
  labs (*),
  comorbidities (*),
  medications (*)
`

// ── fetchPatientByQuery ──────────────────────────────────────────────────────
/**
 * Search by national_id (13-digit string) OR patient_code (P001 etc.).
 * Returns null if not found, throws on network / query error.
 */
export async function fetchPatientByQuery(
  query: string,
): Promise<CardioPatient | null> {
  if (!supabase) return null

  const trimmed      = query.trim()
  const digitsOnly   = trimmed.replace(/\D/g, '')
  const isNationalId = digitsOnly.length >= 10          // looks like an ID number
  const byCode       = trimmed.toUpperCase()

  console.log('[CardioGuard] search →', { byCode, digitsOnly, isNationalId })

  // ── 1. Try national_id (only when query looks like a number) ──────────────
  if (isNationalId) {
    const r1 = await supabase
      .from('patients')
      .select(PATIENT_SELECT)
      .eq('national_id', digitsOnly)
      .maybeSingle()

    console.log('[CardioGuard] national_id result →', { data: r1.data?.patient_code, error: r1.error?.message })
    if (r1.error) throw new Error(r1.error.message)
    if (r1.data)  return mapPatient(r1.data as RawPatient)
  }

  // ── 2. Try patient_code (P001 etc.) ───────────────────────────────────────
  const r2 = await supabase
    .from('patients')
    .select(PATIENT_SELECT)
    .eq('patient_code', byCode)
    .maybeSingle()

  console.log('[CardioGuard] patient_code result →', { data: r2.data?.patient_code, error: r2.error?.message })
  if (r2.error) throw new Error(r2.error.message)
  if (r2.data)  return mapPatient(r2.data as RawPatient)

  return null
}

// ── saveVisit ────────────────────────────────────────────────────────────────
/**
 * Insert a new BP visit row.
 * Called immediately when the doctor records today's BP in CardioPatientPage.
 */
export async function saveVisit(
  patientDbId: string,
  visit: BPVisit,
  recordedBy?: string,
): Promise<{ success: boolean; visitId?: string; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  const { data, error } = await supabase
    .from('visits')
    .insert({
      patient_id:  patientDbId,
      visit_date:  visit.date,
      sbp:         visit.sbp,
      dbp:         visit.dbp,
      heart_rate:  visit.heartRate,
      weight_kg:   visit.weight || null,
      bmi:         visit.bmi    || null,
      recorded_by: recordedBy   || null,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, visitId: data.id }
}

// ── saveDoctorRecord ─────────────────────────────────────────────────────────
/**
 * Persist AI prediction + doctor assessment in one transaction-like sequence.
 * Called when doctor clicks "บันทึกข้อมูล" on SummaryPage.
 */
export interface SaveDoctorRecordParams {
  patientDbId:    string
  riskResult:     RiskResult
  recommendation: MedRecommendation
  doctorName:     string
  notes:          string
  apptDate:       string        // ISO date string or ''
  apptNote:       string
  medications:    Medication[]  // snapshot after any edits
  refId:          string
}

export async function saveDoctorRecord(
  params: SaveDoctorRecordParams,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  try {
    // ── Step 1: insert AI prediction ────────────────────────────────────────
    const { data: pred, error: predErr } = await supabase
      .from('ai_predictions')
      .insert({
        patient_id:       params.patientDbId,
        stroke_risk:      params.riskResult.strokeRisk,
        mace_risk:        params.riskResult.maceRisk,
        progression_risk: params.riskResult.progressionRisk,
        overall_risk:     params.riskResult.riskLevel,
        risk_score:       params.riskResult.riskScore,
        recommendation:   params.recommendation.type,
      })
      .select('id')
      .single()

    if (predErr) throw new Error(`ai_predictions: ${predErr.message}`)

    // ── Step 2: insert doctor record ─────────────────────────────────────────
    const { error: recErr } = await supabase
      .from('doctor_records')
      .insert({
        patient_id:     params.patientDbId,
        prediction_id:  pred.id,
        doctor_id:      params.doctorName,
        clinical_notes: params.notes    || null,
        next_appt_date: params.apptDate || null,
        appt_note:      params.apptNote || null,
        medications:    params.medications,    // stored as JSONB
        ref_id:         params.refId,
      })

    if (recErr) throw new Error(`doctor_records: ${recErr.message}`)

    return { success: true }
  } catch (err: any) {
    console.error('[CardioGuard] saveDoctorRecord error:', err)
    return { success: false, error: err.message }
  }
}

// ── Export connection status helper ─────────────────────────────────────────
export { hasSupabaseEnv }
