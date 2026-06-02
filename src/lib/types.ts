export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical'
export type RecommendationType = 'CONTINUE' | 'INTENSIFY' | 'REDUCE' | 'SWITCH' | 'MONITOR' | 'URGENT_REVIEW'
export type UserRole = 'doctor' | 'nurse' | 'medtech'

export type DrugClass =
  | 'ACEI'
  | 'ARB'
  | 'ARNI'
  | 'CCB-DHP'
  | 'CCB-NonDHP'
  | 'Beta-blocker'
  | 'Diuretic-Thiazide'
  | 'Diuretic-Loop'
  | 'Diuretic-KSparing'
  | 'Alpha-blocker'
  | 'Alpha2-agonist'
  | 'Direct-Vasodilator'

export type BPTrend = 'Increasing' | 'Decreasing' | 'Stable'

export interface BPVisit {
  date: string
  sbp: number
  dbp: number
  heartRate: number
  weight: number
  bmi: number
}

export interface PatientLab {
  date: string
  hba1c?: number
  ldl?: number
  hdl?: number
  creatinine?: number
  egfr?: number
  potassium?: number
  sodium?: number
  troponin?: number
  proBNP?: number
  uacr?: number
  tg?: number
  chol?: number
  fpg?: number
  wbc?: number
  hemoglobin?: number
}

export interface Medication {
  drugClass: DrugClass
  drugName: string
  dose: string
  frequency: string
}

export interface Comorbidities {
  diabetes: boolean
  ckd: boolean
  cad: boolean
  heartFailure: boolean
  stroke: boolean
  af: boolean
  arrhythmias: boolean
  dementia: boolean
}

export interface CardioPatient {
  id: string                  // 5-7 digit ID
  dbId?: string
  nationalId: string          // kept for search only, never displayed
  name: string
  age: number
  sex: 'ชาย' | 'หญิง'
  bpTarget: number
  photo?: string
  treatingDoctor?: string
  comorbidities: Comorbidities
  medications: Medication[]
  visits: BPVisit[]
  labs: PatientLab
  clinicalNotes?: string
  nextAppointment?: string
}

export interface AppointmentRecord {
  nextDate: string
  note: string
}

export interface SavedRecord {
  patientId: string
  savedAt: string
  riskLevel: RiskLevel
  recommendation: RecommendationType
  doctorNote: string
  nextAppointment: string
  medications: Medication[]
}

export interface RiskFactor {
  factor: string
  weight: number
}

export interface RiskResult {
  avgSBP: number
  avgDBP: number
  lastSBP: number
  lastDBP: number
  lastHR: number
  bpVariability: number
  bpTrend: BPTrend
  cumulativeSBP: number
  strokeRisk: number
  maceRisk: number
  progressionRisk: number
  riskLevel: RiskLevel
  riskScore: number
  riskFactors: RiskFactor[]
}

export interface FeatureImportance {
  factor: string
  impact: number
  direction: 'positive' | 'negative'
}

export interface MedRecommendation {
  type: RecommendationType
  title: string
  thai: string
  reasons: string[]
  safetyWarnings: string[]
  featureImportance: FeatureImportance[]
}

export interface MLRiskPrediction {
  condition: string
  probability: number
  basis: string[]
  severity: 'low' | 'moderate' | 'high'
}

export interface DoctorDecision {
  decision: 'Approve' | 'Modify' | 'Reject'
  note: string
  followUpWeeks: number
}
