import { assertSupabaseConnected } from './supabase'

export interface Patient {
  id: string
  dbId: string
  nationalId: string
  name: string
  age: number
  sex: string
  blood: string
  weight: number
  height: number
  bmi: number
  bp: string
  glucose: number
  chol: number
  smoking: string
  meds: string[]
  history: { date: string; note: string; type: 'green' | 'yellow' | 'blue' }[]
  risks: { diabetes: number; crc: number; dyslip: number }
  snps: string[]
}

type HistoryType = 'green' | 'yellow' | 'blue'

type PatientRow = {
  id: string
  patient_code: string | null
  national_id: string | null
  full_name: string | null
  age: number | null
  sex: string | null
  blood_type: string | null
  weight_kg: number | null
  height_cm: number | null
  bmi: number | null
  blood_pressure: string | null
  glucose_mg_dl: number | null
  cholesterol_mg_dl: number | null
  smoking_status: string | null
  current_meds: string[] | null
  risks: { diabetes?: number; crc?: number; dyslip?: number } | null
  snps: string[] | null
  patient_histories?: {
    history_date: string | null
    note: string | null
    type: HistoryType | null
  }[]
}

export const DISEASE_SNPS: Record<string, { gene: string; variant: string }[]> = {
  diabetes: [
    { gene: 'TCF7L2', variant: 'rs7903146' },
    { gene: 'PPARG', variant: 'rs1801282' },
  ],
  crc: [
    { gene: 'MYC', variant: 'rs6983267' },
    { gene: 'SMAD7', variant: 'rs4779584' },
  ],
  dyslip: [{ gene: 'LIPC', variant: 'rs1800588' }],
}

function formatThaiDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

/**
 * Convert a Supabase row into the UI shape used by the app.
 * This mapper is the only place that translates database column names
 * such as full_name / blood_pressure into UI names such as name / bp.
 */
function mapPatient(row: PatientRow): Patient {
  const risks = row.risks ?? {}

  return {
    dbId: row.id,
    id: row.patient_code || row.id,
    nationalId: row.national_id || '-',
    name: row.full_name || 'ไม่ระบุชื่อ',
    age: row.age ?? 0,
    sex: row.sex || '-',
    blood: row.blood_type || '-',
    weight: Number(row.weight_kg ?? 0),
    height: Number(row.height_cm ?? 0),
    bmi: Number(row.bmi ?? 0),
    bp: row.blood_pressure || '-',
    glucose: Number(row.glucose_mg_dl ?? 0),
    chol: Number(row.cholesterol_mg_dl ?? 0),
    smoking: row.smoking_status || '-',
    meds: row.current_meds?.length ? row.current_meds : [],
    history: row.patient_histories?.length
      ? row.patient_histories.map((h) => ({
          date: formatThaiDate(h.history_date),
          note: h.note || '-',
          type: h.type || 'blue',
        }))
      : [],
    risks: {
      diabetes: Number(risks.diabetes ?? 0),
      crc: Number(risks.crc ?? 0),
      dyslip: Number(risks.dyslip ?? 0),
    },
    snps: row.snps?.length ? row.snps : [],
  }
}

/**
 * Search patient from Supabase only.
 * No mock patient is used here. If Supabase is not configured or the patient
 * does not exist in the database, the function throws an error for the UI to show.
 */
export async function findPatient(params: { patientCode?: string; nationalId?: string }) {
  const patientCode = params.patientCode?.trim()
  const nationalId = params.nationalId?.trim()

  if (!patientCode && !nationalId) {
    throw new Error('กรุณากรอกรหัสผู้ป่วยหรือเลขบัตรประชาชน')
  }

  const db = assertSupabaseConnected()

  let query = db.from('patients').select('*, patient_histories(*)')

  if (patientCode) {
    query = query.eq('patient_code', patientCode)
  } else if (nationalId) {
    query = query.eq('national_id', nationalId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`)
  }

  if (!data) {
    throw new Error('ไม่พบข้อมูลผู้ป่วยในฐานข้อมูล Supabase')
  }

  return mapPatient(data as PatientRow)
}