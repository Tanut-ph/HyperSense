import type { CardioPatient, RiskResult, MedRecommendation, FeatureImportance } from './types'

export function getMedicationRecommendation(
  patient: CardioPatient,
  risk: RiskResult,
): MedRecommendation {
  const { avgSBP, lastSBP, lastDBP, lastHR, bpVariability, bpTrend, riskLevel } = risk
  const { comorbidities, labs, bpTarget, age } = patient
  const reasons: string[] = []
  const warnings: string[] = []

  // ── Safety override: REDUCE ───────────────────────────────────────────
  const hypotension = lastSBP < 100 || lastDBP < 62
  const bradycardia = lastHR < 55

  if (hypotension || bradycardia) {
    if (hypotension) reasons.push(`ความดันโลหิตต่ำ: SBP ${lastSBP} / DBP ${lastDBP} mmHg`)
    if (bradycardia) reasons.push(`Heart Rate ต่ำ: ${lastHR} bpm (เสี่ยง bradycardia)`)
    if (age >= 70) reasons.push('ผู้ป่วยสูงอายุ เสี่ยงหกล้มจากความดันต่ำ')
    if (comorbidities.ckd) warnings.push('CKD: ระวังการปรับยาที่ขับออกทางไต')

    const fi: FeatureImportance[] = [
      { factor: `SBP ต่ำ (${lastSBP} mmHg)`, impact: 95, direction: 'negative' },
      { factor: `Heart Rate (${lastHR} bpm)`, impact: bradycardia ? 85 : 30, direction: 'negative' },
      { factor: `อายุ ${age} ปี`, impact: age >= 70 ? 65 : 40, direction: 'negative' },
    ]

    return {
      type: 'REDUCE',
      title: 'พิจารณาลดโดสยาหรือทบทวนแผนยา',
      thai: 'ลดโดสยา',
      reasons,
      safetyWarnings: [
        'ควรพิจารณาลดหรือหยุดยาที่ทำให้ความดันต่ำ',
        'ติดตามอาการวิงเวียน หน้ามืด ใจสั่น',
        ...warnings,
      ],
      featureImportance: fi,
    }
  }

  // ── INTENSIFY ─────────────────────────────────────────────────────────
  const aboveTarget = avgSBP > bpTarget + 8
  const urgentBP = lastSBP >= 180 || lastDBP >= 110
  const criticalCombo = comorbidities.heartFailure && lastSBP > 160
  const multiHighRisk = [comorbidities.cad, comorbidities.stroke, comorbidities.heartFailure].filter(Boolean).length >= 2

  if (
    aboveTarget &&
    (riskLevel === 'High' || riskLevel === 'Critical' || urgentBP || criticalCombo || multiHighRisk ||
      bpTrend === 'Increasing' || comorbidities.diabetes || comorbidities.ckd)
  ) {
    reasons.push(`SBP เฉลี่ย ${avgSBP} mmHg สูงกว่าเป้าหมาย ${bpTarget} mmHg`)
    if (urgentBP) reasons.push(`SBP/DBP สูงมาก: ${lastSBP}/${lastDBP} mmHg`)
    if (bpTrend === 'Increasing') reasons.push('แนวโน้ม BP เพิ่มขึ้นต่อเนื่อง')
    if (bpVariability > 8) reasons.push(`BP Variability สูง (${bpVariability} mmHg) เพิ่มความเสี่ยง CVD`)
    if (comorbidities.diabetes) reasons.push('มีเบาหวาน เป้าหมาย BP ควรควบคุมเข้มงวด (<130/80 mmHg)')
    if (comorbidities.ckd) reasons.push('มี CKD ความดันสูงเร่งการเสื่อมของไต')
    if (comorbidities.heartFailure) reasons.push('ภาวะหัวใจล้มเหลว ต้องประเมินอย่างระมัดระวัง')
    if (comorbidities.cad) reasons.push('โรคหลอดเลือดหัวใจ ความเสี่ยงต่อ MACE สูง')
    if (comorbidities.stroke) reasons.push('ประวัติ stroke เพิ่มความเสี่ยงซ้ำซ้อน')
    if (multiHighRisk) reasons.push('มีโรคร่วมความเสี่ยงสูงหลายโรคพร้อมกัน')
    reasons.push(`Risk Level: ${riskLevel}`)

    if (labs.potassium && labs.potassium > 5.0) {
      warnings.push('Potassium สูง (ระวังการใช้ ACEI/ARB เพิ่ม)')
    }
    if (labs.egfr && labs.egfr < 45) {
      warnings.push('eGFR ต่ำ ควรปรับขนาดยาตาม renal function')
    }
    if (age >= 70) {
      warnings.push('ผู้ป่วยสูงอายุ ระวังความดันตกเมื่อเปลี่ยนท่า')
    }

    const fi: FeatureImportance[] = [
      { factor: `SBP เฉลี่ย ${avgSBP} mmHg`, impact: 90, direction: 'negative' },
      { factor: 'BP Variability', impact: Math.min(80, Math.round(bpVariability * 6)), direction: 'negative' },
      { factor: 'BP Trend', impact: bpTrend === 'Increasing' ? 75 : 45, direction: 'negative' },
      { factor: `Risk Level ${riskLevel}`, impact: 78, direction: 'negative' },
    ]
    if (comorbidities.diabetes) fi.push({ factor: 'โรคเบาหวาน', impact: 70, direction: 'negative' })
    if (comorbidities.ckd) fi.push({ factor: 'CKD', impact: 68, direction: 'negative' })

    return {
      type: 'INTENSIFY',
      title: 'พิจารณาเพิ่มความเข้มข้นของการรักษา',
      thai: 'เพิ่มโดสยา',
      reasons,
      safetyWarnings: warnings,
      featureImportance: fi,
    }
  }

  // ── CONTINUE ──────────────────────────────────────────────────────────
  const controlled = avgSBP <= bpTarget + 5 && avgSBP >= 90
  if (controlled && riskLevel !== 'High') {
    reasons.push(`SBP เฉลี่ย ${avgSBP} mmHg อยู่ในเกณฑ์ควบคุมได้`)
    if (bpTrend === 'Stable') reasons.push('BP Trend: คงที่')
    if (bpTrend === 'Decreasing') reasons.push('BP Trend: มีแนวโน้มลดลง ซึ่งเป็นสัญญาณดี')
    if (bpVariability <= 8) reasons.push(`BP Variability อยู่ในเกณฑ์ปกติ (${bpVariability} mmHg)`)
    reasons.push(`Risk Level: ${riskLevel} — ยังไม่จำเป็นต้องปรับยา`)

    return {
      type: 'CONTINUE',
      title: 'คงแผนยาเดิมและติดตามตามนัด',
      thai: 'คงยาเดิม',
      reasons,
      safetyWarnings: [],
      featureImportance: [
        { factor: `SBP เฉลี่ย ${avgSBP} mmHg`, impact: 88, direction: 'positive' },
        { factor: `BP Variability ${bpVariability}`, impact: 72, direction: 'positive' },
        { factor: 'BP Trend', impact: 68, direction: 'positive' },
        { factor: `Risk Level ${riskLevel}`, impact: 65, direction: 'positive' },
      ],
    }
  }

  // ── MONITOR ───────────────────────────────────────────────────────────
  reasons.push(`SBP เฉลี่ย ${avgSBP} mmHg — ควรติดตามต่อเนื่อง`)
  if (bpVariability > 6) reasons.push(`BP Variability ${bpVariability} mmHg — ควรเฝ้าระวัง`)
  if (bpTrend === 'Increasing') reasons.push('แนวโน้ม BP เพิ่มขึ้นเล็กน้อย')

  return {
    type: 'MONITOR',
    title: 'ติดตามอาการและค่าความดันอย่างใกล้ชิด',
    thai: 'ติดตามใกล้ชิด',
    reasons,
    safetyWarnings: [],
    featureImportance: [
      { factor: `SBP เฉลี่ย ${avgSBP} mmHg`, impact: 62, direction: 'negative' },
      { factor: `BP Variability ${bpVariability}`, impact: 50, direction: 'negative' },
    ],
  }
}
