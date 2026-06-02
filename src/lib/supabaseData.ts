/**
 * supabaseData.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Data access layer (Supabase only — ไม่มี mock fallback)
 * ทุกฟังก์ชันคืน null / { success:false } เมื่อยังไม่ได้เชื่อมต่อ Supabase
 */

import { supabase, hasSupabaseEnv } from '@/lib/supabase'
import type {
  CardioPatient, BPVisit, PatientLab,
  Medication, Comorbidities, PatientProfile,
  RiskResult, MedRecommendation, DoctorRecord,
} from './types'

// ── Raw Supabase row types ───────────────────────────────────────────────────
interface RawVisit {
  visit_date: string
  sbp: number; dbp: number; heart_rate: number
  weight_kg: number | null; bmi: number | null
  resp: number | null; o2sat: number | null; temp: number | null
}

interface RawLab {
  lab_date: string
  fpg: number | null; hba1c: number | null
  ldl: number | null; hdl: number | null; tg: number | null; chol: number | null
  creatinine: number | null; egfr: number | null; uacr: number | null; upcr: number | null
  protein_urine_24: number | null
  potassium: number | null; sodium: number | null; calcium: number | null
  co2: number | null; cl: number | null; po4: number | null; uric: number | null
  hemoglobin: number | null; hematocrit: number | null; wbc: number | null; platelet: number | null
  t3: number | null; t4: number | null
  troponin: number | null; pro_bnp: number | null
}

interface RawComorbidity {
  diabetes: boolean; ckd: boolean; cad: boolean; heart_failure: boolean
  stroke: boolean; pad?: boolean; plaque?: boolean
  af: boolean; arrhythmias?: boolean; dementia?: boolean; dyslipidemia?: boolean
}

interface RawHistory {
  ht_duration_years: number | null
  ht_duration_months: number | null
  ht_duration_days: number | null
  dm_type: string | null; dm_diagnosis_year: number | null; dm_duration_years: number | null
  ckd_duration_years: number | null
  height_cm: number | null; waist_cm: number | null; central_obesity: boolean | null
  smoking_status: string | null; smoking_years: number | null
  smoking_months: number | null; smoking_days: number | null
  alcohol: string | null; pregnant: boolean | null
  recent_surgery: string | null; important_notes: string | null
}

interface RawMedication {
  drug_class: string; drug_name: string
  dose: string | null; frequency: string | null; is_active: boolean
}

interface RawDoctorRecord {
  id: string; created_at: string; doctor_name: string | null
  clinical_notes: string | null; recommendation: string | null
  next_appt_date: string | null; appt_note: string | null; ref_id: string | null
}

interface RawPatient {
  id: string; patient_code: string; national_id: string
  full_name: string; age: number; sex: 'ชาย' | 'หญิง'; bp_target: number | null
  clinical_notes: string | null
  visits: RawVisit[]; labs: RawLab[]
  comorbidities: RawComorbidity[] | RawComorbidity
  patient_history: RawHistory[] | RawHistory | null
  medications: RawMedication[]; doctor_records: RawDoctorRecord[]
}

const num = (v: number | null | undefined) => (v == null ? undefined : Number(v))

// ── Mapper: Supabase → CardioPatient ────────────────────────────────────────
function mapPatient(row: RawPatient): CardioPatient {
  const visits: BPVisit[] = [...(row.visits ?? [])]
    .sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime())
    .map(v => ({
      date: v.visit_date, sbp: v.sbp, dbp: v.dbp, heartRate: v.heart_rate,
      weight: Number(v.weight_kg ?? 0), bmi: Number(v.bmi ?? 0),
      resp: num(v.resp), o2sat: num(v.o2sat), temp: num(v.temp),
    }))

  const sortedLabs = [...(row.labs ?? [])].sort(
    (a, b) => new Date(b.lab_date).getTime() - new Date(a.lab_date).getTime())
  const lr = sortedLabs[0]
  const labs: PatientLab = lr
    ? {
        date: lr.lab_date,
        fpg: num(lr.fpg), hba1c: num(lr.hba1c),
        ldl: num(lr.ldl), hdl: num(lr.hdl), tg: num(lr.tg), chol: num(lr.chol),
        creatinine: num(lr.creatinine), egfr: num(lr.egfr), uacr: num(lr.uacr), upcr: num(lr.upcr),
        proteinUrine24: num(lr.protein_urine_24),
        potassium: num(lr.potassium), sodium: num(lr.sodium), calcium: num(lr.calcium),
        co2: num(lr.co2), cl: num(lr.cl), po4: num(lr.po4), uric: num(lr.uric),
        hemoglobin: num(lr.hemoglobin), hematocrit: num(lr.hematocrit), wbc: num(lr.wbc), platelet: num(lr.platelet),
        t3: num(lr.t3), t4: num(lr.t4),
        troponin: num(lr.troponin), proBNP: num(lr.pro_bnp),
      }
    : { date: '' }

  const comorbArr = Array.isArray(row.comorbidities)
    ? row.comorbidities : row.comorbidities ? [row.comorbidities] : []
  const cr = comorbArr[0]
  const comorbidities: Comorbidities = {
    diabetes: cr?.diabetes ?? false, ckd: cr?.ckd ?? false, cad: cr?.cad ?? false,
    heartFailure: cr?.heart_failure ?? false, stroke: cr?.stroke ?? false,
    pad: cr?.pad ?? false, plaque: cr?.plaque ?? false,
    af: cr?.af ?? false, arrhythmias: cr?.arrhythmias ?? false,
    dementia: cr?.dementia ?? false, dyslipidemia: cr?.dyslipidemia ?? false,
  }

  const histArr = Array.isArray(row.patient_history)
    ? row.patient_history : row.patient_history ? [row.patient_history] : []
  const hr = histArr[0]
  const profile: PatientProfile | undefined = hr ? {
    htDurationYears:  num(hr.ht_duration_years),
    htDurationMonths: num(hr.ht_duration_months),
    htDurationDays:   num(hr.ht_duration_days),
    dmType: hr.dm_type ?? undefined,
    dmDiagnosisYear: num(hr.dm_diagnosis_year), dmDurationYears: num(hr.dm_duration_years),
    ckdDurationYears: num(hr.ckd_duration_years),
    heightCm: num(hr.height_cm), waistCm: num(hr.waist_cm),
    centralObesity: hr.central_obesity ?? undefined,
    smokingStatus: (hr.smoking_status as PatientProfile['smokingStatus']) ?? undefined,
    smokingYears:  num(hr.smoking_years),
    smokingMonths: num(hr.smoking_months),
    smokingDays:   num(hr.smoking_days),
    alcohol: (hr.alcohol as PatientProfile['alcohol']) ?? undefined,
    pregnant: hr.pregnant ?? undefined,
    recentSurgery: hr.recent_surgery ?? undefined,
    importantNotes: hr.important_notes ?? undefined,
  } : undefined

  const medications: Medication[] = (row.medications ?? [])
    .filter(m => m.is_active)
    .map(m => ({
      drugClass: m.drug_class as Medication['drugClass'],
      drugName: m.drug_name, dose: m.dose ?? '', frequency: m.frequency ?? '',
    }))

  const doctorRecords: DoctorRecord[] = [...(row.doctor_records ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(r => ({
      id: r.id, date: r.created_at.split('T')[0],
      doctorName: r.doctor_name ?? 'แพทย์', notes: r.clinical_notes ?? '',
      recommendation: r.recommendation ?? undefined,
      nextApptDate: r.next_appt_date ?? undefined, nextApptNote: r.appt_note ?? undefined,
      refId: r.ref_id ?? undefined,
    }))

  return {
    id: row.patient_code, dbId: row.id, nationalId: row.national_id,
    name: row.full_name, age: row.age, sex: row.sex, bpTarget: row.bp_target ?? 130,
    comorbidities, medications, visits, labs, profile,
    clinicalNotes: row.clinical_notes ?? undefined,
    doctorRecords: doctorRecords.length > 0 ? doctorRecords : undefined,
  }
}

const PATIENT_SELECT = `
  *,
  visits:bp_visits (*),
  labs:patient_labs (*),
  comorbidities:patient_comorbidities (*),
  patient_history (*),
  medications:patient_medications (*),
  doctor_records (*)
`

// ── fetchPatientByQuery ──────────────────────────────────────────────────────
export async function fetchPatientByQuery(query: string): Promise<CardioPatient | null> {
  if (!supabase) return null
  const trimmed    = query.trim()
  const digitsOnly = trimmed.replace(/\D/g, '')
  const isNationalId = digitsOnly.length >= 10
  const byCode = trimmed.toUpperCase()

  if (isNationalId) {
    const r1 = await supabase.from('patients').select(PATIENT_SELECT).eq('national_id', digitsOnly).maybeSingle()
    if (r1.error) throw new Error(r1.error.message)
    if (r1.data)  return mapPatient(r1.data as unknown as RawPatient)
  }

  const r2 = await supabase.from('patients').select(PATIENT_SELECT).eq('patient_code', byCode).maybeSingle()
  if (r2.error) throw new Error(r2.error.message)
  if (r2.data)  return mapPatient(r2.data as unknown as RawPatient)

  return null
}

// ── saveVisit (upsert — แก้ไขค่าความดันวันเดียวกันได้) ───────────────────────
export async function saveVisit(
  patientDbId: string, visit: BPVisit, recordedBy?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not configured' }
  const { error } = await supabase
    .from('bp_visits')
    .upsert({
      patient_id: patientDbId, visit_date: visit.date,
      sbp: visit.sbp, dbp: visit.dbp, heart_rate: visit.heartRate,
      weight_kg: visit.weight || null, bmi: visit.bmi || null,
      resp: visit.resp ?? null, o2sat: visit.o2sat ?? null, temp: visit.temp ?? null,
      note: visit.note ?? null, recorded_by: recordedBy || null,
    }, { onConflict: 'patient_id,visit_date' })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── saveLab (upsert — แก้ไขผลแลปวันเดียวกันได้) ──────────────────────────────
export interface LabExtra {
  ua?: Record<string, string>
  ecgNote?: string
  extraNote?: string
}

export async function saveLab(
  patientDbId: string, labs: Partial<PatientLab>, extra?: LabExtra, recordedBy?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not configured' }
  const ua = extra?.ua ?? {}
  const { error } = await supabase
    .from('patient_labs')
    .upsert({
      patient_id: patientDbId,
      lab_date: labs.date || new Date().toISOString().split('T')[0],
      fpg: labs.fpg ?? null, hba1c: labs.hba1c ?? null,
      ldl: labs.ldl ?? null, hdl: labs.hdl ?? null, tg: labs.tg ?? null, chol: labs.chol ?? null,
      creatinine: labs.creatinine ?? null, egfr: labs.egfr ?? null,
      uacr: labs.uacr ?? null, upcr: labs.upcr ?? null, protein_urine_24: labs.proteinUrine24 ?? null,
      potassium: labs.potassium ?? null, sodium: labs.sodium ?? null, calcium: labs.calcium ?? null,
      co2: labs.co2 ?? null, cl: labs.cl ?? null, po4: labs.po4 ?? null, uric: labs.uric ?? null,
      hemoglobin: labs.hemoglobin ?? null, hematocrit: labs.hematocrit ?? null,
      wbc: labs.wbc ?? null, platelet: labs.platelet ?? null,
      t3: labs.t3 ?? null, t4: labs.t4 ?? null,
      troponin: labs.troponin ?? null, pro_bnp: labs.proBNP ?? null,
      ua_protein: ua.ua_protein ?? null, ua_glucose: ua.ua_glucose ?? null, ua_blood: ua.ua_blood ?? null,
      ua_nitrite: ua.ua_nitrite ?? null, ua_ketone: ua.ua_ketone ?? null, ua_leukocyte: ua.ua_leukocyte ?? null,
      ua_ph: ua.ua_ph ?? null, ua_sg: ua.ua_sg ?? null,
      ecg_note: extra?.ecgNote || null, extra_note: extra?.extraNote || null,
      recorded_by: recordedBy || null,
    }, { onConflict: 'patient_id,lab_date' })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── savePatientHistory (upsert — พยาบาลซักประวัติผู้ป่วยใหม่) ────────────────
export async function savePatientHistory(
  patientDbId: string,
  profile: Partial<import('./types').PatientProfile>,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not configured' }
  const { error } = await supabase
    .from('patient_history')
    .upsert({
      patient_id:        patientDbId,
      ht_duration_years:  profile.htDurationYears  ?? null,
      ht_duration_months: profile.htDurationMonths ?? null,
      ht_duration_days:   profile.htDurationDays   ?? null,
      dm_type:           profile.dmType ?? null,
      dm_diagnosis_year: profile.dmDiagnosisYear ?? null,
      dm_duration_years: profile.dmDurationYears ?? null,
      ckd_duration_years:profile.ckdDurationYears ?? null,
      height_cm:         profile.heightCm ?? null,
      waist_cm:          profile.waistCm ?? null,
      central_obesity:   profile.centralObesity ?? null,
      smoking_status:    profile.smokingStatus ?? null,
      smoking_years:  profile.smokingYears  ?? null,
      smoking_months: profile.smokingMonths ?? null,
      smoking_days:   profile.smokingDays   ?? null,
      alcohol:           profile.alcohol ?? null,
      pregnant:          profile.pregnant ?? null,
      recent_surgery:    profile.recentSurgery ?? null,
      important_notes:   profile.importantNotes ?? null,
    }, { onConflict: 'patient_id' })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── saveDoctorRecord ─────────────────────────────────────────────────────────
export interface SaveDoctorRecordParams {
  patientDbId: string
  riskResult: RiskResult
  recommendation: MedRecommendation
  doctorName: string
  notes: string
  apptDate: string
  apptNote: string
  medications: Medication[]
  refId: string
}

export async function saveDoctorRecord(
  params: SaveDoctorRecordParams,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not configured' }
  try {
    const { error } = await supabase
      .from('doctor_records')
      .insert({
        patient_id: params.patientDbId,
        doctor_name: params.doctorName,
        clinical_notes: params.notes || null,
        recommendation: params.recommendation.type,
        risk_level: params.riskResult.riskLevel,
        risk_score: params.riskResult.riskScore,
        stroke_risk: Math.round(params.riskResult.strokeRisk),
        mace_risk: Math.round(params.riskResult.maceRisk),
        sbp_at_visit: params.riskResult.lastSBP,
        dbp_at_visit: params.riskResult.lastDBP,
        next_appt_date: params.apptDate || null,
        appt_note: params.apptNote || null,
        medications_json: params.medications,
        ref_id: params.refId,
      })
    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    console.error('[HyperSense] saveDoctorRecord error:', err)
    return { success: false, error: err.message }
  }
}

export { hasSupabaseEnv }
