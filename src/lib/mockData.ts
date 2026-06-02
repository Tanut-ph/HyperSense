import type { CardioPatient } from './types'

const TODAY = '2026-06-01'

const VISITS_BASE = [
  '2025-12-05', '2026-01-08', '2026-02-12',
  '2026-03-05', '2026-04-09', '2026-05-14',
]

// ID: 5 หลัก — nationalId เก็บไว้สำหรับค้นหาเท่านั้น ไม่แสดงบน UI
export const MOCK_PATIENTS: CardioPatient[] = [
  {
    id: '10001',
    dbId: 'a1000000-0000-0000-0000-000000000001',
    nationalId: '1100101234561',
    name: 'นาย สมชาย ใจดี',
    age: 67,
    sex: 'ชาย',
    bpTarget: 130,
    treatingDoctor: 'นพ. วิชาญ สุขใจ',
    comorbidities: {
      diabetes: true, ckd: true, cad: false, heartFailure: false,
      stroke: false, af: false, arrhythmias: false, dementia: false,
    },
    medications: [
      { drugClass: 'ARB',     drugName: 'Losartan',   dose: '50 mg', frequency: '1x/วัน' },
      { drugClass: 'CCB-DHP', drugName: 'Amlodipine', dose: '5 mg',  frequency: '1x/วัน' },
    ],
    visits: [
      { date: VISITS_BASE[0], sbp: 145, dbp: 88, heartRate: 76, weight: 74, bmi: 26.1 },
      { date: VISITS_BASE[1], sbp: 148, dbp: 90, heartRate: 78, weight: 74, bmi: 26.1 },
      { date: VISITS_BASE[2], sbp: 152, dbp: 92, heartRate: 80, weight: 75, bmi: 26.4 },
      { date: VISITS_BASE[3], sbp: 155, dbp: 93, heartRate: 77, weight: 75, bmi: 26.4 },
      { date: VISITS_BASE[4], sbp: 157, dbp: 95, heartRate: 79, weight: 76, bmi: 26.8 },
      { date: VISITS_BASE[5], sbp: 158, dbp: 94, heartRate: 81, weight: 76, bmi: 26.8 },
      { date: TODAY,          sbp: 160, dbp: 96, heartRate: 82, weight: 76, bmi: 26.8 },
    ],
    labs: {
      date: '2026-04-09', hba1c: 7.8, ldl: 128, hdl: 42,
      creatinine: 1.4, egfr: 52, potassium: 4.2, fpg: 148, tg: 160,
    },
    clinicalNotes: 'ผู้ป่วยความดันสูงเรื้อรังมีเบาหวานและ CKD แนะนำลดเค็ม ออกกำลังกาย',
    doctorRecords: [
      {
        date: '2026-02-12', doctorName: 'นพ. วิชาญ สุขใจ',
        notes: 'ความดันยังสูงต่อเนื่อง ปรับขนาด Losartan เป็น 100 mg ติดตามค่า K+ ทุก 1 เดือน',
        recommendation: 'INTENSIFY', nextApptDate: '2026-03-05', refId: 'HS-A1B2C3',
      },
      {
        date: '2026-04-09', doctorName: 'นพ. วิชาญ สุขใจ',
        notes: 'ค่า eGFR ลดลงเล็กน้อย (52) ระวังการใช้ ARB ปรับแผนลดเค็ม < 2g/วัน และออกกำลังกาย 30 นาที/วัน',
        recommendation: 'CONTINUE', nextApptDate: '2026-05-14', refId: 'HS-D4E5F6',
      },
    ],
  },

  {
    id: '10002',
    dbId: 'a1000000-0000-0000-0000-000000000002',
    nationalId: '1100205678902',
    name: 'นาง สุดา รักสุขภาพ',
    age: 55,
    sex: 'หญิง',
    bpTarget: 130,
    treatingDoctor: 'พญ. สมหญิง รักษาดี',
    comorbidities: {
      diabetes: false, ckd: false, cad: false, heartFailure: false,
      stroke: false, af: false, arrhythmias: false, dementia: false,
    },
    medications: [
      { drugClass: 'CCB-DHP', drugName: 'Amlodipine', dose: '5 mg', frequency: '1x/วัน' },
    ],
    visits: [
      { date: VISITS_BASE[0], sbp: 136, dbp: 84, heartRate: 70, weight: 62, bmi: 24.8 },
      { date: VISITS_BASE[1], sbp: 132, dbp: 82, heartRate: 68, weight: 62, bmi: 24.8 },
      { date: VISITS_BASE[2], sbp: 129, dbp: 80, heartRate: 72, weight: 61, bmi: 24.4 },
      { date: VISITS_BASE[3], sbp: 130, dbp: 81, heartRate: 69, weight: 61, bmi: 24.4 },
      { date: VISITS_BASE[4], sbp: 127, dbp: 79, heartRate: 71, weight: 60, bmi: 24.0 },
      { date: VISITS_BASE[5], sbp: 129, dbp: 80, heartRate: 70, weight: 60, bmi: 24.0 },
    ],
    labs: { date: '2026-03-05', hba1c: 5.4, ldl: 105, hdl: 58, creatinine: 0.8, egfr: 82, potassium: 4.0 },
  },

  {
    id: '10003',
    dbId: 'a1000000-0000-0000-0000-000000000003',
    nationalId: '1100309876543',
    name: 'นาย ประเสริฐ มีสุข',
    age: 72,
    sex: 'ชาย',
    bpTarget: 130,
    treatingDoctor: 'นพ. วิชาญ สุขใจ',
    comorbidities: {
      diabetes: true, ckd: false, cad: true, heartFailure: true,
      stroke: false, af: true, arrhythmias: true, dementia: false,
    },
    medications: [
      { drugClass: 'ACEI',         drugName: 'Enalapril',  dose: '10 mg', frequency: '2x/วัน' },
      { drugClass: 'CCB-DHP',      drugName: 'Amlodipine', dose: '10 mg', frequency: '1x/วัน' },
      { drugClass: 'Beta-blocker', drugName: 'Bisoprolol', dose: '5 mg',  frequency: '1x/วัน' },
    ],
    visits: [
      { date: VISITS_BASE[0], sbp: 165, dbp: 96,  heartRate: 82, weight: 82, bmi: 28.9 },
      { date: VISITS_BASE[1], sbp: 170, dbp: 98,  heartRate: 84, weight: 83, bmi: 29.2 },
      { date: VISITS_BASE[2], sbp: 168, dbp: 97,  heartRate: 80, weight: 83, bmi: 29.2 },
      { date: VISITS_BASE[3], sbp: 175, dbp: 100, heartRate: 86, weight: 84, bmi: 29.6 },
      { date: VISITS_BASE[4], sbp: 178, dbp: 102, heartRate: 88, weight: 84, bmi: 29.6 },
      { date: VISITS_BASE[5], sbp: 180, dbp: 104, heartRate: 90, weight: 85, bmi: 29.9 },
    ],
    labs: {
      date: '2026-04-09', hba1c: 8.5, ldl: 142, hdl: 38,
      creatinine: 1.0, egfr: 68, potassium: 4.5, fpg: 195, tg: 210, proBNP: 380,
    },
  },

  {
    id: '10004',
    dbId: 'a1000000-0000-0000-0000-000000000004',
    nationalId: '1100412345674',
    name: 'นางสาว พิมพ์ใจ แสงทอง',
    age: 48,
    sex: 'หญิง',
    bpTarget: 130,
    treatingDoctor: 'พญ. สมหญิง รักษาดี',
    comorbidities: {
      diabetes: false, ckd: false, cad: false, heartFailure: false,
      stroke: false, af: false, arrhythmias: false, dementia: false,
    },
    medications: [
      { drugClass: 'Diuretic-Thiazide', drugName: 'Hydrochlorothiazide', dose: '12.5 mg', frequency: '1x/วัน' },
    ],
    visits: [
      { date: VISITS_BASE[0], sbp: 126, dbp: 78, heartRate: 66, weight: 56, bmi: 22.4 },
      { date: VISITS_BASE[1], sbp: 122, dbp: 76, heartRate: 68, weight: 56, bmi: 22.4 },
      { date: VISITS_BASE[2], sbp: 120, dbp: 74, heartRate: 65, weight: 55, bmi: 22.0 },
      { date: VISITS_BASE[3], sbp: 118, dbp: 74, heartRate: 67, weight: 55, bmi: 22.0 },
      { date: VISITS_BASE[4], sbp: 122, dbp: 76, heartRate: 66, weight: 56, bmi: 22.4 },
      { date: VISITS_BASE[5], sbp: 120, dbp: 75, heartRate: 65, weight: 56, bmi: 22.4 },
    ],
    labs: { date: '2026-02-12', hba1c: 5.1, ldl: 95, hdl: 62, creatinine: 0.7, egfr: 95, potassium: 3.8 },
  },

  {
    id: '10005',
    dbId: 'a1000000-0000-0000-0000-000000000005',
    nationalId: '1100515678905',
    name: 'นาง วันเพ็ญ สุขสวัสดิ์',
    age: 78,
    sex: 'หญิง',
    bpTarget: 140,
    treatingDoctor: 'นพ. วิชาญ สุขใจ',
    comorbidities: {
      diabetes: false, ckd: true, cad: false, heartFailure: false,
      stroke: false, af: false, arrhythmias: false, dementia: false,
    },
    medications: [
      { drugClass: 'ACEI',           drugName: 'Ramipril',              dose: '10 mg', frequency: '1x/วัน' },
      { drugClass: 'Diuretic-Loop',  drugName: 'Furosemide',            dose: '40 mg', frequency: '1x/วัน' },
      { drugClass: 'CCB-DHP',        drugName: 'Nifedipine',            dose: '30 mg', frequency: '1x/วัน' },
    ],
    visits: [
      { date: VISITS_BASE[0], sbp: 108, dbp: 65, heartRate: 58, weight: 52, bmi: 21.2 },
      { date: VISITS_BASE[1], sbp: 104, dbp: 62, heartRate: 55, weight: 51, bmi: 20.8 },
      { date: VISITS_BASE[2], sbp: 100, dbp: 61, heartRate: 53, weight: 51, bmi: 20.8 },
      { date: VISITS_BASE[3], sbp:  98, dbp: 60, heartRate: 52, weight: 50, bmi: 20.4 },
      { date: VISITS_BASE[4], sbp:  94, dbp: 58, heartRate: 50, weight: 50, bmi: 20.4 },
      { date: VISITS_BASE[5], sbp:  95, dbp: 58, heartRate: 51, weight: 50, bmi: 20.4 },
    ],
    labs: {
      date: '2026-04-09', hba1c: 5.6, ldl: 112, hdl: 52,
      creatinine: 1.6, egfr: 44, potassium: 5.1, uacr: 42,
    },
  },

  // ── 10006: ผู้ป่วยปกติ — ความดันคุมได้ดี ──────────────────────────────────
  {
    id: '10006',
    dbId: 'a1000000-0000-0000-0000-000000000006',
    nationalId: '1100611223344',
    name: 'นาย อนุรักษ์ สมบูรณ์',
    age: 42,
    sex: 'ชาย',
    bpTarget: 130,
    treatingDoctor: 'พญ. สมหญิง รักษาดี',
    comorbidities: {
      diabetes: false, ckd: false, cad: false, heartFailure: false,
      stroke: false, af: false, arrhythmias: false, dementia: false,
    },
    medications: [
      { drugClass: 'CCB-DHP', drugName: 'Amlodipine', dose: '2.5 mg', frequency: '1x/วัน' },
    ],
    visits: [
      { date: VISITS_BASE[0], sbp: 132, dbp: 84, heartRate: 72, weight: 70, bmi: 23.1 },
      { date: VISITS_BASE[1], sbp: 128, dbp: 82, heartRate: 70, weight: 70, bmi: 23.1 },
      { date: VISITS_BASE[2], sbp: 126, dbp: 80, heartRate: 68, weight: 69, bmi: 22.8 },
      { date: VISITS_BASE[3], sbp: 124, dbp: 79, heartRate: 71, weight: 69, bmi: 22.8 },
      { date: VISITS_BASE[4], sbp: 122, dbp: 78, heartRate: 69, weight: 68, bmi: 22.5 },
      { date: VISITS_BASE[5], sbp: 120, dbp: 76, heartRate: 67, weight: 68, bmi: 22.5 },
    ],
    labs: { date: '2026-03-05', hba1c: 5.2, ldl: 92, hdl: 65, creatinine: 0.9, egfr: 90, potassium: 4.1, fpg: 95 },
    clinicalNotes: 'ผู้ป่วยปฏิบัติตามคำแนะนำดี ออกกำลังกายสม่ำเสมอ ความดันลดลงอย่างต่อเนื่อง',
    doctorRecords: [
      {
        date: '2026-03-05', doctorName: 'พญ. สมหญิง รักษาดี',
        notes: 'ความดันคุมได้ดีมาก แนะนำคงการรักษาและออกกำลังกาย 150 นาที/สัปดาห์',
        recommendation: 'CONTINUE', nextApptDate: '2026-06-05', refId: 'HS-G7H8I9',
      },
    ],
  },

  // ── 10007: ผู้ป่วยใหม่ — เพิ่งได้รับการวินิจฉัย ──────────────────────────
  {
    id: '10007',
    dbId: 'a1000000-0000-0000-0000-000000000007',
    nationalId: '1100755667788',
    name: 'นาง ณัฐฐา พึ่งพา',
    age: 51,
    sex: 'หญิง',
    bpTarget: 130,
    treatingDoctor: undefined,
    comorbidities: {
      diabetes: false, ckd: false, cad: false, heartFailure: false,
      stroke: false, af: false, arrhythmias: false, dementia: false,
    },
    medications: [],
    visits: [
      { date: '2026-05-28', sbp: 158, dbp: 96, heartRate: 82, weight: 66, bmi: 25.4, note: 'ตรวจสุขภาพประจำปี พบความดันสูง ส่งต่อคลินิกความดัน' },
    ],
    labs: { date: '2026-05-28', ldl: 118, hdl: 52, creatinine: 0.8, egfr: 88, fpg: 102 },
    clinicalNotes: 'ผู้ป่วยใหม่ พบความดันสูงครั้งแรกจากการตรวจสุขภาพ ยังไม่ได้รับยา',
  },

  // ── 10008: ความดันแกว่ง — ค่าผันผวนสูง ───────────────────────────────────
  {
    id: '10008',
    dbId: 'a1000000-0000-0000-0000-000000000008',
    nationalId: '1100899887766',
    name: 'นาย วีระ ขึ้นลง',
    age: 60,
    sex: 'ชาย',
    bpTarget: 130,
    treatingDoctor: 'นพ. ทวีศักดิ์ มีโชค',
    comorbidities: {
      diabetes: true, ckd: false, cad: false, heartFailure: false,
      stroke: false, af: false, arrhythmias: true, dementia: false,
    },
    medications: [
      { drugClass: 'ARB',           drugName: 'Valsartan',   dose: '80 mg',  frequency: '1x/วัน' },
      { drugClass: 'Beta-blocker',  drugName: 'Atenolol',    dose: '50 mg',  frequency: '1x/วัน' },
    ],
    visits: [
      { date: VISITS_BASE[0], sbp: 162, dbp: 98,  heartRate: 88, weight: 80, bmi: 27.7, note: 'กินยาไม่สม่ำเสมอ' },
      { date: VISITS_BASE[1], sbp: 128, dbp: 80,  heartRate: 72, weight: 80, bmi: 27.7 },
      { date: VISITS_BASE[2], sbp: 174, dbp: 104, heartRate: 94, weight: 81, bmi: 28.0, note: 'มีความเครียดสูง ลืมกินยา' },
      { date: VISITS_BASE[3], sbp: 135, dbp: 84,  heartRate: 76, weight: 81, bmi: 28.0 },
      { date: VISITS_BASE[4], sbp: 168, dbp: 100, heartRate: 90, weight: 82, bmi: 28.4, note: 'ดื่มกาแฟมากขึ้น นอนดึก' },
      { date: VISITS_BASE[5], sbp: 130, dbp: 82,  heartRate: 74, weight: 82, bmi: 28.4 },
    ],
    labs: {
      date: '2026-04-09', hba1c: 7.2, ldl: 122, hdl: 44,
      creatinine: 1.1, egfr: 72, potassium: 4.3, fpg: 138, tg: 180,
    },
    clinicalNotes: 'ผู้ป่วยกินยาไม่สม่ำเสมอ ความดันผันผวนมากตามพฤติกรรม แนะนำ medication adherence',
    doctorRecords: [
      {
        date: '2026-02-12', doctorName: 'นพ. ทวีศักดิ์ มีโชค',
        notes: 'BP แกว่งมาก เน้นย้ำเรื่องการกินยาสม่ำเสมอ แนะนำวัด BP ที่บ้านทุกวัน',
        recommendation: 'MONITOR', nextApptDate: '2026-03-05', refId: 'HS-J1K2L3',
      },
      {
        date: '2026-04-09', doctorName: 'นพ. ทวีศักดิ์ มีโชค',
        notes: 'BP ยังแกว่ง พิจารณาเพิ่ม CCB-DHP เพื่อช่วยควบคุม ส่ง pharmacy review เรื่อง adherence',
        recommendation: 'INTENSIFY', nextApptDate: '2026-05-14', refId: 'HS-M4N5O6',
      },
    ],
  },
]

export function findPatientByNationalId(id: string): CardioPatient | null {
  const clean = id.replace(/\D/g, '')
  // ค้นหาจาก patient ID (5 หลัก) หรือ nationalId (เก็บไว้ใช้ backend เท่านั้น)
  return MOCK_PATIENTS.find(p => p.id === id.trim() || p.nationalId === clean) ?? null
}
