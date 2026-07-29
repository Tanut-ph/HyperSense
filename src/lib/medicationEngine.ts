import type { CardioPatient, RiskResult, MedRecommendation, FeatureImportance, Medication, DrugClass } from './types'

/**
 * ตรวจคู่ยาที่ห้ามใช้ร่วมกัน / ต้องระวังเมื่อใช้ร่วมกัน
 * อ้างอิงแนวทางความดันโลหิตสูง (หลีกเลี่ยงการกด RAAS ซ้ำซ้อน ฯลฯ)
 */
export function checkDrugInteractions(medications: Medication[]): string[] {
  const warnings: string[] = []
  const has = (c: DrugClass) => medications.some(m => m.drugClass === c)

  // ห้ามกด RAAS ซ้ำซ้อน — เสี่ยง hyperkalemia, ไตวายเฉียบพลัน, ความดันต่ำ
  if (has('ACEI') && has('ARB')) {
    warnings.push('⛔ ห้ามใช้ร่วม: ACEI + ARB — กด RAAS ซ้ำซ้อน เสี่ยง hyperkalemia และไตวายเฉียบพลัน')
  }
  // ARNI มี ARB (valsartan) อยู่แล้ว — ห้ามใช้ร่วมกับ ARB/ACEI
  if (has('ARNI') && has('ARB')) {
    warnings.push('⛔ ห้ามใช้ร่วม: ARNI + ARB — ARNI มี ARB อยู่ในตัวแล้ว ถือเป็นการใช้ซ้ำซ้อน')
  }
  if (has('ARNI') && has('ACEI')) {
    warnings.push('⛔ ห้ามใช้ร่วม: ARNI + ACEI — เสี่ยง angioedema รุนแรง ต้องเว้นอย่างน้อย 36 ชม. หลังหยุด ACEI')
  }
  // เบต้าซ้ำซ้อน
  if (has('Beta-blocker') && has('Alpha-Beta-blocker')) {
    warnings.push('⛔ ห้ามใช้ร่วม: Beta-blocker + Alpha-Beta-blocker — ออกฤทธิ์เบต้าซ้ำซ้อน เสี่ยงหัวใจเต้นช้า')
  }
  // ต้องระวัง — non-DHP CCB ร่วมกับยากลุ่มเบต้า
  if (has('CCB') && (has('Beta-blocker') || has('Alpha-Beta-blocker'))) {
    warnings.push('⚠ ระวังเมื่อใช้ร่วม: CCB (กลุ่ม non-DHP เช่น verapamil/diltiazem) + Beta-blocker — เสี่ยง bradycardia / AV block')
  }
  // Alpha2-Agonist ร่วมกับเบต้า — เสี่ยง rebound HT เมื่อหยุดยา
  if (has('Alpha2-Agonist') && (has('Beta-blocker') || has('Alpha-Beta-blocker'))) {
    warnings.push('⚠ ระวังเมื่อใช้ร่วม: Alpha2-Agonist + Beta-blocker — เสี่ยงหัวใจเต้นช้า และ rebound hypertension เมื่อหยุดยากะทันหัน')
  }

  return warnings
}

/**
 * คำที่ใช้จับว่าผู้ป่วยแพ้ยากลุ่มใด จากข้อความแพ้ยา (free text)
 */
const ALLERGY_KEYWORDS: { cls: DrugClass; words: string[] }[] = [
  { cls: 'ACEI',               words: ['acei', 'ace inhibitor', 'enalapril', 'lisinopril', 'ramipril', 'captopril', 'perindopril', 'pril'] },
  { cls: 'ARB',                words: ['arb', 'losartan', 'valsartan', 'candesartan', 'irbesartan', 'olmesartan', 'telmisartan', 'sartan'] },
  { cls: 'ARNI',               words: ['arni', 'sacubitril', 'entresto', 'neprilysin'] },
  { cls: 'CCB',                words: ['ccb', 'amlodipine', 'felodipine', 'nifedipine', 'diltiazem', 'verapamil', 'calcium channel'] },
  { cls: 'Beta-blocker',       words: ['beta-blocker', 'beta blocker', 'betablocker', 'atenolol', 'metoprolol', 'bisoprolol', 'propranolol', 'olol'] },
  { cls: 'Alpha-blocker',      words: ['alpha-blocker', 'alpha blocker', 'doxazosin', 'prazosin', 'terazosin'] },
  { cls: 'Alpha2-Agonist',     words: ['alpha2', 'methyldopa', 'clonidine'] },
  { cls: 'Alpha-Beta-blocker', words: ['carvedilol', 'labetalol'] },
  { cls: 'Diuretic',           words: ['diuretic', 'ขับปัสสาวะ', 'hydrochlorothiazide', 'hctz', 'furosemide', 'thiazide', 'indapamide', 'spironolactone'] },
  { cls: 'Direct-Vasodilator', words: ['hydralazine', 'minoxidil'] },
]

/**
 * ตรวจว่ายาที่ผู้ป่วยใช้อยู่ชนกับประวัติแพ้ยาหรือไม่ → ห้ามใช้
 */
export function checkAllergyConflicts(patient: CardioPatient): string[] {
  const raw = patient.profile?.drugAllergies
  if (!raw) return []
  const text = raw.toLowerCase()
  // ข้ามกรณี "ปฏิเสธการแพ้ยา" / "ไม่มี"
  if (/ปฏิเสธ|ไม่มี|none|nkda|ยังไม่ได้ซัก/.test(text)) return []

  const warnings: string[] = []
  const allergicClasses = new Set<DrugClass>()
  for (const { cls, words } of ALLERGY_KEYWORDS) {
    if (words.some(w => text.includes(w))) allergicClasses.add(cls)
  }

  for (const cls of allergicClasses) {
    const inUse = patient.medications.some(m => m.drugClass === cls)
    if (inUse) {
      warnings.push(`⛔ ผู้ป่วยแพ้ยากลุ่ม ${cls} แต่กำลังใช้ยากลุ่มนี้อยู่ — ต้องหยุด/เปลี่ยนยาทันที (ห้ามใช้)`)
    } else {
      warnings.push(`⛔ ห้ามสั่งยากลุ่ม ${cls} — ผู้ป่วยมีประวัติแพ้ยา (${raw})`)
    }
  }
  return warnings
}

export function getMedicationRecommendation(
  patient: CardioPatient,
  risk: RiskResult,
): MedRecommendation {
  const { avgSBP, lastSBP, lastDBP, lastHR, bpVariability, bpTrend, riskLevel } = risk
  const { comorbidities, labs, bpTarget, age } = patient
  const reasons: string[] = []
  const warnings: string[] = []
  const allergyWarnings = checkAllergyConflicts(patient)
  const interactionWarnings = [...allergyWarnings, ...checkDrugInteractions(patient.medications)]

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
        ...interactionWarnings,
      ],
      featureImportance: fi,
    }
  }

  // ── NOTHING: ผู้ป่วยปกติ ยังไม่จำเป็นต้องใช้ยา ───────────────────────────
  const noMeds   = patient.medications.length === 0
  const normalBP = avgSBP <= bpTarget && lastSBP <= bpTarget + 5 && avgSBP >= 90
  const hasMajorComorbidity = comorbidities.diabetes || comorbidities.ckd ||
    comorbidities.cad || comorbidities.heartFailure || comorbidities.stroke ||
    comorbidities.pad || comorbidities.af
  if (noMeds && normalBP && riskLevel === 'Low' && !hasMajorComorbidity) {
    reasons.push(`ความดันอยู่ในเกณฑ์ปกติ (SBP เฉลี่ย ${avgSBP} mmHg ≤ เป้าหมาย ${bpTarget} mmHg)`)
    if (bpTrend === 'Decreasing') reasons.push('แนวโน้มความดันลดลง เป็นสัญญาณที่ดี')
    else if (bpTrend === 'Stable') reasons.push('ความดันคงที่ในเกณฑ์ดี')
    reasons.push('ยังไม่พบโรคร่วมที่มีความเสี่ยงสูง')
    return {
      type: 'NOTHING',
      title: 'ผู้ป่วยปกติ — ยังไม่จำเป็นต้องใช้ยา',
      thai: 'ปกติ / ดูแลสุขภาพต่อเนื่อง',
      reasons,
      safetyWarnings: [
        'เน้นปรับพฤติกรรม: ลดเค็ม (โซเดียม < 2 g/วัน), ออกกำลังกาย 150 นาที/สัปดาห์',
        'งดบุหรี่ จำกัดแอลกอฮอล์ และควบคุมน้ำหนัก',
        'วัดความดันที่บ้านสม่ำเสมอ และติดตามตามนัด',
        ...interactionWarnings,
      ],
      featureImportance: [
        { factor: `SBP เฉลี่ย ${avgSBP} mmHg`, impact: 88, direction: 'positive' },
        { factor: `BP Trend ${bpTrend}`, impact: 70, direction: 'positive' },
        { factor: `Risk Level ${riskLevel}`, impact: 66, direction: 'positive' },
      ],
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
      safetyWarnings: [...warnings, ...interactionWarnings],
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

    const improving = bpTrend === 'Decreasing'
    return {
      type: 'CONTINUE',
      title: improving ? 'อาการดีขึ้น — คงแผนยาเดิมและติดตามตามนัด' : 'คงแผนยาเดิมและติดตามตามนัด',
      thai: improving ? 'ดีขึ้น / คงยาเดิม' : 'คงยาเดิม',
      reasons,
      safetyWarnings: [...interactionWarnings],
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
    safetyWarnings: [...interactionWarnings],
    featureImportance: [
      { factor: `SBP เฉลี่ย ${avgSBP} mmHg`, impact: 62, direction: 'negative' },
      { factor: `BP Variability ${bpVariability}`, impact: 50, direction: 'negative' },
    ],
  }
}
