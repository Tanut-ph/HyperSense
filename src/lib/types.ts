export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical'
export type RecommendationType = 'NOTHING' | 'CONTINUE' | 'INTENSIFY' | 'REDUCE' | 'SWITCH' | 'MONITOR' | 'URGENT_REVIEW'
export type UserRole = 'doctor' | 'nurse' | 'medtech'

/**
 * กลุ่มยาความดันโลหิต — ตั้งชื่อให้ตรงกับ data dictionary (คอลัมน์ med_*)
 *   7 กลุ่มหลักตามแนวทางเวชปฏิบัติ + กลุ่มเสริมที่พบในชุดข้อมูล
 */
export type DrugClass =
  | 'Diuretic'           // med_diuretics — ยาขับปัสสาวะ
  | 'ACEI'               // med_acei — ยับยั้งเอนไซม์ ACE
  | 'ARB'                // med_arb — ต้านตัวรับ Angiotensin II
  | 'CCB'                // med_ccb — ปิดกั้นแคลเซียมแชนแนล
  | 'Beta-blocker'       // med_beta_blocker — ปิดกั้นเบต้า
  | 'Alpha-blocker'      // med_alpha_blocker — ปิดกั้นอัลฟา
  | 'Alpha2-Agonist'     // med_alpha2_agonist — ออกฤทธิ์ต่อระบบประสาทส่วนกลาง
  | 'ARNI'               // med_neprilysin_inhibitor — Angiotensin Receptor-Neprilysin Inhibitor
  | 'Alpha-Beta-blocker' // med_alpha_beta_blocker — ปิดกั้นทั้งอัลฟาและเบต้า
  | 'Direct-Vasodilator' // med_hydralazine — ขยายหลอดเลือดโดยตรง

export type BPTrend = 'Increasing' | 'Decreasing' | 'Stable'

export type SmokingStatus = 'never' | 'former' | 'current'
export type AlcoholStatus = 'never' | 'occasional' | 'regular' | 'heavy'

export interface BPVisit {
  date: string
  sbp: number                 // vitalsign_sbp_P
  dbp: number                 // vitalsign_dbp_P
  heartRate: number           // vitalsign_hr_P
  weight: number              // vitalsign_wt_P
  bmi: number                 // vitalsign_bmi_P
  resp?: number               // vitalsign_resp_P — อัตราการหายใจ
  o2sat?: number              // vitalsign_o2sat_P — ความอิ่มตัวออกซิเจน
  temp?: number               // vitalsign_temp_P — อุณหภูมิร่างกาย
  note?: string
  recordedBy?: string
}

/**
 * ผลตรวจทางห้องปฏิบัติการ — คอลัมน์ตรงกับ data dictionary (lab_*_P)
 */
export interface PatientLab {
  date: string
  // ── น้ำตาลและเบาหวาน ──
  fpg?: number                // lab_fpg_P
  hba1c?: number              // lab_hba1c_P
  // ── ไขมันในเลือด ──
  ldl?: number                // lab_ldl_P
  hdl?: number                // lab_hdl_P
  tg?: number                 // lab_tg_P
  chol?: number               // lab_chol_P
  // ── ไต / ปัสสาวะ ──
  creatinine?: number         // lab_creatinine_P
  egfr?: number               // eGFR (คำนวณ)
  uacr?: number               // lab_uacr_P
  upcr?: number               // lab_upcr_P
  proteinUrine24?: number     // lab_protein_in_urine_24_hrs_P
  // ── เกลือแร่ / เมตาบอลิก ──
  potassium?: number          // lab_potassium_P
  sodium?: number             // lab_sodium_P
  calcium?: number            // lab_calcium_P
  co2?: number                // lab_co2_P
  cl?: number                 // lab_cl_P
  po4?: number                // lab_po4_P
  uric?: number               // lab_uric_P
  // ── ความสมบูรณ์ของเลือด (CBC) ──
  hemoglobin?: number         // lab_hemoglobin_P
  hematocrit?: number         // lab_hematocrit_P
  wbc?: number                // lab_wbc_P
  platelet?: number           // lab_platelet_P
  // ── ไทรอยด์ ──
  t3?: number                 // lab_t3_P
  t4?: number                 // lab_t4_P
  // ── หัวใจขั้นสูง ──
  troponin?: number           // lab_troponin_P
  proBNP?: number             // lab_probnp_P
}

export interface Medication {
  drugClass: DrugClass
  drugName: string
  dose: string
  frequency: string
}

/**
 * โรคร่วม — ตรงกับ data dictionary (คอลัมน์ co_*)
 * กลุ่ม ASCVD (หลอดเลือดแดงแข็ง) = cad + stroke + pad + plaque
 */
export interface Comorbidities {
  diabetes: boolean       // co_dm
  ckd: boolean            // co_ckd
  cad: boolean            // co_cad — หลอดเลือดหัวใจตีบ (ASCVD)
  heartFailure: boolean   // co_hf
  stroke: boolean         // co_stroke — หลอดเลือดสมองตีบ/TIA (ASCVD)
  pad: boolean            // หลอดเลือดส่วนปลายตีบ PAD (ASCVD)
  plaque: boolean         // พบ plaque จากการตรวจ (ASCVD)
  af: boolean             // co_atrial_fibrillation
  arrhythmias: boolean    // co_arrhythmias
  dementia: boolean       // co_dementia
  dyslipidemia: boolean   // ไขมันในเลือดผิดปกติ
}

/**
 * ประวัติซักถาม / ข้อมูลพื้นฐานผู้ป่วย (ตามแบบฟอร์มซักประวัติ)
 * ใช้ประกอบการตัดสินใจของแพทย์ — ไม่ใช่แค่ค่าความดัน
 */
export interface PatientProfile {
  // ── ระยะเวลาความดันสูง (ปี / เดือน / วัน) ──
  htDurationYears?: number
  htDurationMonths?: number
  htDurationDays?: number
  // ── เบาหวาน ──
  dmType?: string
  dmDiagnosisYear?: number
  dmDurationYears?: number
  ckdDurationYears?: number
  // ── ข้อมูลร่างกาย ──
  heightCm?: number
  waistCm?: number
  centralObesity?: boolean
  // ── การสูบบุหรี่ (ปี / เดือน / วัน) ──
  smokingStatus?: SmokingStatus
  smokingYears?: number
  smokingMonths?: number
  smokingDays?: number
  // ── ไลฟ์สไตล์อื่นๆ ──
  alcohol?: AlcoholStatus
  pregnant?: boolean
  recentSurgery?: string
  drugAllergies?: string      // แพ้ยา — เช่น "Penicillin, Sulfa, ACEI (ไอแห้ง)"
  importantNotes?: string
}

export interface DoctorRecord {
  id?: string
  date: string
  doctorName: string
  notes: string
  recommendation?: string
  nextApptDate?: string
  nextApptNote?: string
  refId?: string
}

export interface CardioPatient {
  id: string                  // รหัสผู้ป่วย 5-7 หลัก
  dbId?: string
  nationalId: string          // ใช้สำหรับค้นหาเท่านั้น ไม่แสดงบน UI
  name: string
  age: number
  sex: 'ชาย' | 'หญิง'
  bpTarget: number
  photo?: string
  comorbidities: Comorbidities
  medications: Medication[]
  visits: BPVisit[]
  labs: PatientLab
  profile?: PatientProfile
  clinicalNotes?: string
  nextAppointment?: string
  doctorRecords?: DoctorRecord[]
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
