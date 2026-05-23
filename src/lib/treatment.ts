import { assertSupabaseConnected } from './supabase'
import { Mode } from '@/app/page'

export async function saveTreatmentRecord(payload: {
  patientId: string
  mode: Mode
  aiSummary?: string
  doctorNote?: string
  diagnosisNote?: string
  drugNote?: string
  appointmentDate?: string | null
  appointmentTime?: string | null
  referralHospital?: string | null
  referralDepartment?: string | null
}) {
  const db = assertSupabaseConnected()

  const { data, error } = await db
    .from('treatment_records')
    .insert({
      patient_id: payload.patientId,
      mode: payload.mode,
      ai_summary: payload.aiSummary || null,
      doctor_note: payload.doctorNote || null,
      diagnosis_note: payload.diagnosisNote || null,
      drug_note: payload.drugNote || null,
      appointment_date: payload.appointmentDate,
      appointment_time: payload.appointmentTime,
      referral_hospital: payload.referralHospital,
      referral_department: payload.referralDepartment,
      status: 'completed',
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}