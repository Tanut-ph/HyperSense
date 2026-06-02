/**
 * medicationGuide.ts
 * ──────────────────────────────────────────────────────────────────────────
 * ฐานความรู้ยาความดันโลหิต 7 กลุ่มหลัก (+ กลุ่มเสริม)
 *   - กลุ่มย่อย (subgroups) + ชื่อยาในแต่ละกลุ่ม
 *   - ผลข้างเคียงสำคัญ
 *   - ยา/กลุ่มที่ "ใช้ร่วมได้" (เสริมฤทธิ์) และ "ใช้ร่วมไม่ได้/ควรระวัง"
 *   - ข้อบ่งใช้ / อาการ และข้อควรระวังในประชากรพิเศษ (ตั้งครรภ์ ฯลฯ)
 *
 * ข้อมูลนี้ใช้ประกอบการตัดสินใจของแพทย์เท่านั้น
 */

import type { DrugClass, Comorbidities, PatientProfile } from './types'

export type InteractionSeverity = 'avoid' | 'caution'

export interface DrugInteraction {
  /** กลุ่มยาในระบบ หรือชื่อยา/กลุ่มภายนอก */
  with: DrugClass | string
  /** เป็นกลุ่มยาในระบบหรือไม่ (ใช้ทำ dropdown disable) */
  inSystem: boolean
  reason: string
  severity: InteractionSeverity
}

export interface DrugSubgroup {
  name: string
  drugs: string[]
  note?: string
}

export type PregnancySafety = 'safe' | 'caution' | 'contraindicated'

export interface DrugGroup {
  class: DrugClass
  label: string          // ชื่อกลุ่มภาษาไทย (เต็ม)
  short: string          // ชื่อย่อ / อังกฤษ
  indication: string
  drugs: string[]
  subgroups?: DrugSubgroup[]   // การแบ่งกลุ่มย่อย (ตามตารางอ้างอิง)
  sideEffects: string[]
  avoidWith: DrugInteraction[] // ใช้ร่วมไม่ได้ / ควรระวัง
  synergyWith: DrugClass[]     // ใช้ร่วมได้ (เสริมฤทธิ์)
  usageNote?: string           // ข้อบ่งใช้ / อาการ / เมื่อใดควรใช้
  pregnancy: PregnancySafety
  pregnancyNote?: string
  color: string
}

// ── 7 กลุ่มหลัก + กลุ่มเสริม ────────────────────────────────────────────────
export const DRUG_GROUPS: DrugGroup[] = [
  {
    class: 'Diuretic',
    label: 'ยาขับปัสสาวะ (Diuretics)',
    short: 'Diuretic',
    indication: 'First-line ความดันสูงทั่วไป / บวมน้ำ / HF',
    drugs: ['Hydrochlorothiazide (HCTZ)', 'Chlorthalidone', 'Indapamide', 'Furosemide', 'Amiloride', 'Triamterene', 'Spironolactone'],
    subgroups: [
      { name: 'Thiazide', drugs: ['HCTZ', 'Chlorthalidone', 'Indapamide'], note: 'ใช้ร่วมได้เกือบทุกกลุ่ม (first-line)' },
      { name: 'Loop diuretic', drugs: ['Furosemide'], note: 'ใช้ในภาวะบวมน้ำ / CKD / HF' },
      { name: 'K-sparing', drugs: ['Amiloride', 'Triamterene'] },
      { name: 'Aldosterone antagonist', drugs: ['Spironolactone'], note: 'ใช้ร่วม ACEI/ARB ต้องระวังโพแทสเซียมสูง' },
    ],
    sideEffects: [
      'ปัสสาวะบ่อย ร่างกายขาดน้ำ',
      'ระดับโพแทสเซียมผิดปกติ (สูง/ต่ำ ขึ้นกับชนิดยา)',
      'กรดยูริกสูง อาจกระตุ้นโรคเกาต์',
    ],
    avoidWith: [
      { with: 'NSAIDs (Ibuprofen, Diclofenac)', inSystem: false, severity: 'caution', reason: 'ลดฤทธิ์ลดความดันและเพิ่มความเสี่ยงไตวาย' },
      { with: 'Lithium', inSystem: false, severity: 'caution', reason: 'ทำให้ระดับลิเทียมในเลือดสูงจนเป็นพิษ' },
      { with: 'ACEI', inSystem: true, severity: 'caution', reason: 'ชนิด Aldosterone antagonist (Spironolactone) + ACEI/ARB เสี่ยงโพแทสเซียมสูง' },
    ],
    synergyWith: ['ACEI', 'ARB', 'CCB'],
    usageNote: 'Thiazide เป็นยาตัวแรกที่ใช้บ่อย · Spironolactone (aldosterone antagonist) ระวังโพแทสเซียมสูงเมื่อใช้ร่วม ACEI/ARB',
    pregnancy: 'caution',
    pregnancyNote: 'ไม่ใช่ยาตัวแรกในหญิงตั้งครรภ์',
    color: '#14b8a6',
  },
  {
    class: 'ACEI',
    label: 'ยายับยั้งเอนไซม์ ACE (กลุ่ม RAAS)',
    short: 'ACEI',
    indication: 'ความดันสูง / เบาหวานลงไต / HF',
    drugs: ['Enalapril', 'Captopril', 'Ramipril', 'Lisinopril', 'Perindopril'],
    sideEffects: [
      'ไอแห้งๆ (พบบ่อยมาก)',
      'ระดับโพแทสเซียมในเลือดสูง',
      'หน้า/ปากบวม (Angioedema — พบน้อยแต่อันตราย)',
    ],
    avoidWith: [
      { with: 'ARB', inSystem: true, severity: 'avoid', reason: 'Dual RAS blockade — เสี่ยงไตวาย + โพแทสเซียมสูง (ห้ามใช้ร่วมเด็ดขาด)' },
      { with: 'ARNI', inSystem: true, severity: 'avoid', reason: 'ต้องหยุด ACEI ≥36 ชม. ก่อนเริ่ม ARNI (เสี่ยง angioedema)' },
      { with: 'Diuretic', inSystem: true, severity: 'caution', reason: 'หากเป็นชนิดสงวนโพแทสเซียม (Spironolactone) เสี่ยงโพแทสเซียมสูง' },
      { with: 'NSAIDs', inSystem: false, severity: 'caution', reason: 'ลดฤทธิ์ลดความดัน เพิ่มความเสี่ยงไตวาย' },
    ],
    synergyWith: ['Diuretic', 'CCB'],
    usageNote: 'ใช้ร่วม Diuretic หรือ CCB ได้ดี · ห้ามใช้ร่วม ARB',
    pregnancy: 'contraindicated',
    pregnancyNote: 'ห้ามใช้ในหญิงตั้งครรภ์ — ทำให้ทารกพิการ (teratogenic)',
    color: '#3b82f6',
  },
  {
    class: 'ARB',
    label: 'ยาต้านตัวรับแองจิโอเทนซิน (กลุ่ม RAAS)',
    short: 'ARB',
    indication: 'แทน ACEI กรณีไอแห้ง / HF / CKD',
    drugs: ['Losartan', 'Valsartan', 'Candesartan', 'Irbesartan', 'Telmisartan', 'Olmesartan'],
    sideEffects: [
      'เวียนศีรษะ',
      'ระดับโพแทสเซียมในเลือดสูง',
      'ไม่มีอาการไอแห้ง (ต่างจาก ACEI)',
    ],
    avoidWith: [
      { with: 'ACEI', inSystem: true, severity: 'avoid', reason: 'Dual RAS blockade — เสี่ยงไตวาย + โพแทสเซียมสูง (ห้ามใช้ร่วมเด็ดขาด)' },
      { with: 'ARNI', inSystem: true, severity: 'avoid', reason: 'ARNI มี valsartan (ARB) อยู่แล้ว — ห้ามซ้ำซ้อน' },
      { with: 'NSAIDs / ยาเสริมโพแทสเซียม', inSystem: false, severity: 'caution', reason: 'เพิ่มความเสี่ยงไตวายและโพแทสเซียมสูง' },
    ],
    synergyWith: ['Diuretic', 'CCB'],
    usageNote: 'ใช้ร่วม Diuretic หรือ CCB ได้ดี · ห้ามใช้ร่วม ACEI',
    pregnancy: 'contraindicated',
    pregnancyNote: 'ห้ามใช้ในหญิงตั้งครรภ์ — ทำให้ทารกพิการ (teratogenic)',
    color: '#8b5cf6',
  },
  {
    class: 'CCB',
    label: 'ยาปิดกั้นแคลเซียมแชนแนล (CCBs)',
    short: 'CCB',
    indication: 'ลดความดัน / ขยายหลอดเลือด (DHP) · ลด HR/AF (Non-DHP)',
    drugs: ['Amlodipine', 'Nifedipine', 'Felodipine', 'Lercanidipine', 'Verapamil', 'Diltiazem'],
    subgroups: [
      { name: 'Dihydropyridine (DHP)', drugs: ['Amlodipine', 'Nifedipine', 'Felodipine'], note: 'ใช้ร่วม Alpha-1 blockers ได้' },
      { name: 'Non-Dihydropyridine', drugs: ['Verapamil', 'Diltiazem'], note: 'ห้ามใช้ร่วม Beta-blocker (หัวใจเต้นช้ามาก)' },
    ],
    sideEffects: [
      'ข้อเท้าบวม ขาบวม (พบบ่อยใน Amlodipine)',
      'หน้าแดง ปวดศีรษะ ใจสั่น',
      'ท้องผูก (โดยเฉพาะ Verapamil)',
    ],
    avoidWith: [
      { with: 'Beta-blocker', inSystem: true, severity: 'caution', reason: 'ชนิด Non-DHP (Verapamil, Diltiazem) + Beta-blocker เสี่ยงหัวใจเต้นช้ามาก / heart block' },
    ],
    synergyWith: ['ACEI', 'ARB', 'Diuretic', 'Alpha-blocker'],
    usageNote: 'DHP (Amlodipine) ใช้ร่วม ACEI/ARB/Diuretic/Alpha-blocker ได้ · Non-DHP ห้ามร่วม Beta-blocker',
    pregnancy: 'caution',
    pregnancyNote: 'Nifedipine ใช้ได้ในหญิงตั้งครรภ์',
    color: '#f59e0b',
  },
  {
    class: 'Beta-blocker',
    label: 'ยาปิดกั้นเบต้า (Beta-blockers)',
    short: 'Beta-blocker',
    indication: 'HF / หัวใจเต้นเร็ว / หลัง MI',
    drugs: ['Atenolol', 'Metoprolol', 'Bisoprolol', 'Propranolol', 'Carvedilol', 'Labetalol'],
    subgroups: [
      { name: 'Cardioselective', drugs: ['Atenolol', 'Metoprolol', 'Bisoprolol'] },
      { name: 'Non-Selective', drugs: ['Propranolol'], note: 'ระวังในผู้ป่วยหอบหืด' },
      { name: 'Mixed Alpha/Beta', drugs: ['Carvedilol', 'Labetalol'], note: 'Labetalol ปลอดภัยในหญิงตั้งครรภ์' },
    ],
    sideEffects: [
      'หัวใจเต้นช้า อ่อนเพลีย',
      'ปลายมือปลายเท้าเย็น เสื่อมสมรรถภาพทางเพศ',
      'อาจบดบังอาการใจสั่นเมื่อน้ำตาลในเลือดต่ำ (ในผู้ป่วยเบาหวาน)',
    ],
    avoidWith: [
      { with: 'CCB', inSystem: true, severity: 'caution', reason: 'ห้ามใช้ร่วมกับ Non-DHP CCB (Verapamil, Diltiazem) — กดการเต้นของหัวใจรุนแรง' },
      { with: 'Alpha2-Agonist', inSystem: true, severity: 'caution', reason: 'ใช้ร่วม Clonidine แล้วหยุดยากะทันหันเสี่ยง rebound hypertension รุนแรง' },
      { with: 'โรคหอบหืด (Asthma)', inSystem: false, severity: 'caution', reason: 'Beta-blocker บางตัวทำให้หลอดลมหดตัว' },
    ],
    synergyWith: ['ACEI', 'ARB', 'Diuretic'],
    usageNote: 'ใช้ร่วม ACEI/ARB/Diuretic ได้ · ใช้ร่วมไม่ได้กับ Non-DHP CCB และ Alpha-2 Agonist (Clonidine)',
    pregnancy: 'caution',
    pregnancyNote: 'Labetalol (Mixed Alpha/Beta) เป็นทางเลือกที่ปลอดภัยในหญิงตั้งครรภ์',
    color: '#ef4444',
  },
  {
    class: 'Alpha-blocker',
    label: 'ยาปิดกั้นอัลฟา (Alpha-blockers)',
    short: 'Alpha-blocker',
    indication: 'ยาเสริมกรณีคุมความดันยาก / ต่อมลูกหมากโต',
    drugs: ['Doxazosin', 'Prazosin', 'Terazosin'],
    sideEffects: [
      'หน้ามืดเวลาเปลี่ยนอิริยาบถ (Postural hypotension — พบบ่อยในมื้อแรก)',
      'เวียนศีรษะ ใจสั่น',
    ],
    avoidWith: [
      { with: 'ยารักษาเสื่อมสมรรถภาพ (PDE5 เช่น Sildenafil/Viagra)', inSystem: false, severity: 'avoid', reason: 'ความดันโลหิตตกอย่างรุนแรงจนช็อกได้' },
      { with: 'Beta-blocker', inSystem: true, severity: 'caution', reason: 'ระวัง postural hypotension เมื่อใช้ร่วม Beta-blocker' },
    ],
    synergyWith: ['Diuretic', 'CCB', 'Beta-blocker'],
    usageNote: 'ใช้ได้เกือบทุกกลุ่ม (ระวังร่วม BBs) · ไม่ใช่ยาตัวแรก เหมาะกับผู้สูงอายุที่มีต่อมลูกหมากโต (BPH)',
    pregnancy: 'caution',
    color: '#84cc16',
  },
  {
    class: 'Alpha2-Agonist',
    label: 'ยาออกฤทธิ์ต่อระบบประสาทส่วนกลาง (Alpha-2 Agonist)',
    short: 'Central / Alpha-2',
    indication: 'ยาเสริม / ใช้ในหญิงตั้งครรภ์ (Methyldopa)',
    drugs: ['Methyldopa', 'Clonidine'],
    sideEffects: [
      'ง่วงซึม ปากแห้ง ท้องผูก',
      'หากหยุดยากะทันหัน ความดันเด้งกลับสูงมาก (Rebound hypertension)',
    ],
    avoidWith: [
      { with: 'Beta-blocker', inSystem: true, severity: 'caution', reason: 'Clonidine + Beta-blocker แล้วหยุดยากะทันหันเสี่ยง rebound hypertension รุนแรง' },
      { with: 'ACEI', inSystem: true, severity: 'caution', reason: 'ตามตารางอ้างอิงจัดเป็นคู่ที่ควรระวังเมื่อใช้ร่วม' },
      { with: 'ARB', inSystem: true, severity: 'caution', reason: 'ตามตารางอ้างอิงจัดเป็นคู่ที่ควรระวังเมื่อใช้ร่วม' },
    ],
    synergyWith: ['Diuretic', 'CCB'],
    usageNote: 'Methyldopa = ยาตัวแรกในหญิงตั้งครรภ์ · Clonidine ใช้ร่วมไม่ได้กับ Beta-blocker · ห้ามหยุดยากะทันหัน',
    pregnancy: 'safe',
    pregnancyNote: 'Methyldopa เป็นยาความดันที่ปลอดภัยและนิยมใช้ในหญิงตั้งครรภ์',
    color: '#65a30d',
  },
  // ── กลุ่มเสริม (พบในชุดข้อมูล) ──────────────────────────────────────────
  {
    class: 'ARNI',
    label: 'ARNI (Neprilysin Inhibitor)',
    short: 'ARNI',
    indication: 'หัวใจล้มเหลว (HFrEF)',
    drugs: ['Sacubitril/Valsartan'],
    sideEffects: ['ความดันต่ำ', 'โพแทสเซียมสูง', 'angioedema'],
    avoidWith: [
      { with: 'ACEI', inSystem: true, severity: 'avoid', reason: 'ต้องหยุด ACEI ≥36 ชม. ก่อนเริ่ม — เสี่ยง angioedema' },
      { with: 'ARB', inSystem: true, severity: 'avoid', reason: 'ARNI มี valsartan (ARB) อยู่แล้ว — ห้ามซ้ำซ้อน' },
    ],
    synergyWith: ['Beta-blocker', 'Diuretic'],
    usageNote: 'ใช้ในภาวะหัวใจล้มเหลว · ห้ามใช้ร่วม ACEI/ARB',
    pregnancy: 'contraindicated',
    pregnancyNote: 'ห้ามใช้ในหญิงตั้งครรภ์',
    color: '#6366f1',
  },
  {
    class: 'Alpha-Beta-blocker',
    label: 'ยาปิดกั้นอัลฟา-เบต้า (Mixed Alpha/Beta)',
    short: 'Alpha-Beta',
    indication: 'HF / ความดันวิกฤต / หญิงตั้งครรภ์ (Labetalol)',
    drugs: ['Carvedilol', 'Labetalol'],
    sideEffects: ['หัวใจเต้นช้า', 'หน้ามืดเวลาเปลี่ยนท่า', 'อ่อนเพลีย'],
    avoidWith: [
      { with: 'CCB', inSystem: true, severity: 'caution', reason: 'ระวังการใช้ร่วมกับ Non-DHP CCB — กดการเต้นของหัวใจ' },
    ],
    synergyWith: ['ACEI', 'ARB', 'Diuretic'],
    usageNote: 'Labetalol เป็นยาทางเลือกแรกในหญิงตั้งครรภ์',
    pregnancy: 'safe',
    pregnancyNote: 'Labetalol ปลอดภัยในหญิงตั้งครรภ์',
    color: '#f97316',
  },
  {
    class: 'Direct-Vasodilator',
    label: 'ยาขยายหลอดเลือดโดยตรง (Direct Vasodilator)',
    short: 'Vasodilator',
    indication: 'ความดันคุมยาก / HF / หญิงตั้งครรภ์',
    drugs: ['Hydralazine', 'Minoxidil'],
    sideEffects: ['ใจสั่น หัวใจเต้นเร็ว', 'ปวดศีรษะ', 'อาการคล้าย lupus (Hydralazine ใช้นานๆ)'],
    avoidWith: [],
    synergyWith: ['ACEI', 'ARB', 'Diuretic', 'Alpha-blocker', 'CCB'],
    usageNote: 'Hydralazine = ยาตัวแรกในหญิงตั้งครรภ์ (ใช้ได้ทั้งระยะสั้น/ยาว) · Minoxidil ใช้เฉพาะผู้เชี่ยวชาญในความดันรุนแรงดื้อยา · ใช้ร่วม Alpha-1 blocker (Doxazosin) หรือ CCB (Amlodipine) ได้',
    pregnancy: 'safe',
    pregnancyNote: 'Hydralazine ใช้ได้ในหญิงตั้งครรภ์',
    color: '#a3e635',
  },
]

/** 7 กลุ่มหลักที่ใช้บ่อย — แสดงเป็นตัวเลือกหลักในฟอร์ม */
export const PRIMARY_DRUG_CLASSES: DrugClass[] = [
  'Diuretic', 'ACEI', 'ARB', 'CCB', 'Beta-blocker', 'Alpha-blocker', 'Alpha2-Agonist',
]

export const FREQ_OPTIONS = ['1x/วัน', '2x/วัน', '3x/วัน', 'เช้า-เย็น', 'ก่อนนอน', 'ตามแพทย์สั่ง']

const GROUP_MAP: Record<string, DrugGroup> = Object.fromEntries(
  DRUG_GROUPS.map(g => [g.class, g]),
) as Record<string, DrugGroup>

export function getDrugGroup(c: DrugClass): DrugGroup | undefined {
  return GROUP_MAP[c]
}

export function drugColor(c: DrugClass): string {
  return GROUP_MAP[c]?.color ?? '#999'
}

export function drugLabel(c: DrugClass): string {
  return GROUP_MAP[c]?.short ?? c
}

/** ชื่อกลุ่มที่ "ใช้ร่วมไม่ได้/ควรระวัง" สำหรับแสดงผล (รวมทั้งในระบบและภายนอก) */
export function avoidLabels(g: DrugGroup): string[] {
  return g.avoidWith.map(a => (a.inSystem ? (getDrugGroup(a.with as DrugClass)?.short ?? String(a.with)) : String(a.with)))
}

/** กลุ่มยาในระบบที่ห้าม/ควรระวังเมื่อใช้ร่วมกับ class ที่กำหนด */
export function inSystemConflicts(c: DrugClass): { cls: DrugClass; severity: InteractionSeverity; reason: string }[] {
  const g = GROUP_MAP[c]
  if (!g) return []
  return g.avoidWith
    .filter(i => i.inSystem)
    .map(i => ({ cls: i.with as DrugClass, severity: i.severity, reason: i.reason }))
}

/** หาเหตุผลความขัดแย้งระหว่างสองกลุ่ม (ทิศใดก็ได้) */
export function conflictReason(a: DrugClass, b: DrugClass): { severity: InteractionSeverity; reason: string } | null {
  const ga = GROUP_MAP[a]
  const direct = ga?.avoidWith.find(i => i.inSystem && i.with === b)
  if (direct) return { severity: direct.severity, reason: direct.reason }
  const gb = GROUP_MAP[b]
  const rev = gb?.avoidWith.find(i => i.inSystem && i.with === a)
  if (rev) return { severity: rev.severity, reason: rev.reason }
  return null
}

/**
 * แจ้งเตือนเฉพาะรายผู้ป่วย — ประชากรพิเศษ (ตั้งครรภ์ ฯลฯ) เทียบกับยาที่ใช้อยู่
 */
export interface PopulationAlert {
  level: 'danger' | 'warn' | 'info'
  text: string
}

export function populationAlerts(
  classes: DrugClass[],
  comorbidities: Partial<Comorbidities>,
  profile?: PatientProfile,
): PopulationAlert[] {
  const alerts: PopulationAlert[] = []
  const has = (c: DrugClass) => classes.includes(c)

  if (profile?.pregnant) {
    const contraind = classes.filter(c => GROUP_MAP[c]?.pregnancy === 'contraindicated')
    if (contraind.length) {
      alerts.push({ level: 'danger', text: `ผู้ป่วยตั้งครรภ์: ห้ามใช้ ${contraind.map(c => GROUP_MAP[c]!.short).join(', ')} (teratogenic) — พิจารณา Methyldopa / Labetalol / Nifedipine / Hydralazine แทน` })
    } else {
      alerts.push({ level: 'info', text: 'ผู้ป่วยตั้งครรภ์: เลือกยากลุ่มที่ปลอดภัย เช่น Methyldopa, Labetalol, Nifedipine, Hydralazine' })
    }
  }

  if (has('Diuretic')) {
    alerts.push({ level: 'info', text: 'ยาขับปัสสาวะอาจเพิ่มกรดยูริก — ระวังในผู้ป่วยเกาต์ และติดตามระดับโพแทสเซียม' })
  }

  if (profile?.smokingStatus === 'current') {
    alerts.push({ level: 'warn', text: 'ผู้ป่วยสูบบุหรี่: เพิ่มความเสี่ยงโรคหัวใจและหลอดเลือด แนะนำเลิกบุหรี่ควบคู่การรักษา' })
  }

  if (profile?.alcohol === 'regular' || profile?.alcohol === 'heavy') {
    alerts.push({ level: 'warn', text: 'ผู้ป่วยดื่มแอลกอฮอล์ประจำ: ทำให้ควบคุมความดันยากขึ้น และอาจเสริมฤทธิ์ยาลดความดันจนความดันตก' })
  }

  if (profile?.recentSurgery) {
    if (has('ACEI') || has('ARB') || has('ARNI')) {
      alerts.push({ level: 'warn', text: `มีประวัติผ่าตัด/หัตถการ (${profile.recentSurgery}): ACEI/ARB อาจต้องงดก่อนผ่าตัด — ประเมินร่วมกับวิสัญญีแพทย์` })
    }
    if (has('Beta-blocker')) {
      alerts.push({ level: 'info', text: 'ห้ามหยุด Beta-blocker กะทันหันช่วงผ่าตัด — เสี่ยงหัวใจเต้นเร็ว/ความดันพุ่ง' })
    }
  }

  return alerts
}
