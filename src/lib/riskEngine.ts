import type { CardioPatient, RiskResult, RiskLevel, BPTrend, RiskFactor } from './types'

function mean(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function stdDev(arr: number[]) {
  const m = mean(arr)
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length)
}

function calcTrend(arr: number[]): BPTrend {
  if (arr.length < 3) return 'Stable'
  const recent = mean(arr.slice(-3))
  const old = mean(arr.slice(0, 3))
  if (recent - old > 5) return 'Increasing'
  if (old - recent > 5) return 'Decreasing'
  return 'Stable'
}

export function calculateRisk(patient: CardioPatient): RiskResult {
  const { visits, comorbidities, age, labs, bpTarget } = patient
  const sbps = visits.map(v => v.sbp)
  const dbps = visits.map(v => v.dbp)
  const last = visits[visits.length - 1]

  const avgSBP = Math.round(mean(sbps))
  const avgDBP = Math.round(mean(dbps))
  const bpVariability = Math.round(stdDev(sbps) * 10) / 10
  const bpTrend = calcTrend(sbps)
  const cumulativeSBP = sbps.reduce((a, b) => a + b, 0)

  let score = 0
  const riskFactors: RiskFactor[] = []

  const addFactor = (factor: string, weight: number) => {
    score += weight
    riskFactors.push({ factor, weight })
  }

  // BP scoring
  if (avgSBP > 160) addFactor('SBP เฉลี่ยสูงมาก (>160 mmHg)', 25)
  else if (avgSBP > 150) addFactor('SBP เฉลี่ยสูง (>150 mmHg)', 18)
  else if (avgSBP > bpTarget + 10) addFactor(`SBP เฉลี่ยสูงกว่าเป้าหมาย ${bpTarget} mmHg`, 12)
  else if (avgSBP > bpTarget) addFactor(`SBP เฉลี่ยสูงกว่าเป้าหมาย (${bpTarget} mmHg)`, 6)

  // Hypotension check
  if (avgSBP < 100) addFactor('SBP เฉลี่ยต่ำเกินไป (<100 mmHg)', 15)

  // BP variability
  if (bpVariability > 12) addFactor(`BP Variability สูงมาก (${bpVariability} mmHg)`, 14)
  else if (bpVariability > 8) addFactor(`BP Variability สูง (${bpVariability} mmHg)`, 8)

  // Trend
  if (bpTrend === 'Increasing') addFactor('แนวโน้ม BP เพิ่มขึ้นต่อเนื่อง', 8)

  // Age
  if (age >= 70) addFactor(`อายุ ${age} ปี (≥70)`, 15)
  else if (age >= 60) addFactor(`อายุ ${age} ปี (≥60)`, 10)
  else if (age >= 50) addFactor(`อายุ ${age} ปี (≥50)`, 5)

  // Comorbidities
  if (comorbidities.stroke) addFactor('ประวัติโรคหลอดเลือดสมอง (Stroke)', 20)
  if (comorbidities.cad) addFactor('โรคหลอดเลือดหัวใจ (CAD)', 18)
  if (comorbidities.heartFailure) addFactor('ภาวะหัวใจล้มเหลว (Heart Failure)', 15)
  if (comorbidities.pad) addFactor('หลอดเลือดส่วนปลายตีบ (PAD)', 12)
  if (comorbidities.diabetes) addFactor('โรคเบาหวาน (Diabetes)', 12)
  if (comorbidities.ckd) addFactor('โรคไตเรื้อรัง (CKD)', 12)
  if (comorbidities.af) addFactor('ภาวะหัวใจเต้นผิดจังหวะ (AF)', 10)
  if (comorbidities.plaque) addFactor('พบ Plaque หลอดเลือด (ASCVD)', 8)
  if (comorbidities.dyslipidemia) addFactor('ไขมันในเลือดผิดปกติ', 5)

  // Labs
  if (labs.egfr && labs.egfr < 45) addFactor(`eGFR ต่ำมาก (${labs.egfr} mL/min)`, 12)
  else if (labs.egfr && labs.egfr < 60) addFactor(`eGFR ต่ำ (${labs.egfr} mL/min)`, 7)

  if (labs.hba1c && labs.hba1c > 9) addFactor(`HbA1c สูงมาก (${labs.hba1c}%)`, 8)
  else if (labs.hba1c && labs.hba1c > 7.5) addFactor(`HbA1c สูง (${labs.hba1c}%)`, 5)

  if (labs.potassium && labs.potassium > 5.5) addFactor(`Potassium สูง (${labs.potassium} mEq/L)`, 6)

  score = Math.min(score, 100)

  let riskLevel: RiskLevel
  if (score < 20) riskLevel = 'Low'
  else if (score < 40) riskLevel = 'Moderate'
  else if (score < 65) riskLevel = 'High'
  else riskLevel = 'Critical'

  const base = score / 100
  const strokeRisk = Math.min(95, Math.round((base * 82 + 5) * 10) / 10)
  const maceRisk = Math.min(95, Math.round((base * 78 + 5) * 10) / 10)
  const progressionRisk = Math.min(95, Math.round((base * 86 + 5) * 10) / 10)

  return {
    avgSBP, avgDBP,
    lastSBP: last.sbp, lastDBP: last.dbp, lastHR: last.heartRate,
    bpVariability, bpTrend, cumulativeSBP,
    strokeRisk, maceRisk, progressionRisk,
    riskLevel, riskScore: score,
    riskFactors,
  }
}
