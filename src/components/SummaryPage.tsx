'use client'
import { useState } from 'react'
import type { CardioPatient, RiskResult, MedRecommendation, Medication, DrugClass, UserRole } from '@/lib/types'
import { saveDoctorRecord, hasSupabaseEnv } from '@/lib/supabaseData'
import styles from './HyperSense.module.css'

// ─── Drug Classes พร้อม sub-type และ indication ──────────────────────────────
const DRUG_CLASSES: { class: DrugClass; label: string; indication: string }[] = [
  { class: 'ACEI',              label: 'ACEI',              indication: 'ความดันสูง / ไตจากเบาหวาน / HF' },
  { class: 'ARB',               label: 'ARB',               indication: 'แทน ACEI กรณีไอแห้ง / HF' },
  { class: 'ARNI',              label: 'ARNI',              indication: 'HF ที่บีบตัวลดลง (เฉพาะทาง)' },
  { class: 'CCB-DHP',           label: 'CCB-DHP',           indication: 'Amlodipine — ลดความดัน / ขยายหลอดเลือด' },
  { class: 'CCB-NonDHP',        label: 'CCB-NonDHP',        indication: 'Verapamil — ลดความดัน + ลด HR' },
  { class: 'Beta-blocker',      label: 'Beta-blocker',      indication: 'HF / หัวใจเต้นเร็ว / หลัง MI' },
  { class: 'Diuretic-Thiazide', label: 'Diuretic-Thiazide', indication: 'HCTZ — first-line ยาขับปัสสาวะ' },
  { class: 'Diuretic-Loop',     label: 'Diuretic-Loop',     indication: 'Furosemide — บวมน้ำ / HF / CKD' },
  { class: 'Diuretic-KSparing', label: 'Diuretic-KSparing', indication: 'Spironolactone — ดื้อยา / ความดันต่ำไม่ลง' },
  { class: 'Alpha-blocker',     label: 'Alpha-blocker',     indication: 'ยาเสริม / ต่อมลูกหมากโต (ชาย)' },
  { class: 'Alpha2-agonist',    label: 'Alpha2-agonist',    indication: 'Methyldopa — ทางเลือก / ขณะตั้งครรภ์' },
  { class: 'Direct-Vasodilator',label: 'Direct-Vasodilator',indication: 'Hydralazine — ดื้อยาหลายชนิด' },
]

// ─── Drug conflict map: ห้ามใช้ร่วมกันเด็ดขาด ──────────────────────────────
const DRUG_CONFLICT_MAP: Partial<Record<DrugClass, DrugClass[]>> = {
  'ACEI':        ['ARB', 'ARNI'],
  'ARB':         ['ACEI', 'ARNI'],
  'ARNI':        ['ACEI', 'ARB'],
  'CCB-NonDHP':  ['Beta-blocker'],
  'Beta-blocker':['CCB-NonDHP'],
}

const DRUG_CONFLICT_REASON: Partial<Record<string, string>> = {
  'ACEI+ARB':          'Dual RAS blockade — เสี่ยงไตวาย + hyperkalemia',
  'ACEI+ARNI':         'ต้องหยุด ACEI ≥36 ชม. ก่อนเริ่ม ARNI',
  'ARB+ARNI':          'ARNI มี valsartan (ARB) อยู่แล้ว — ห้ามซ้ำซ้อน',
  'CCB-NonDHP+Beta-blocker': 'เสี่ยง bradycardia รุนแรง / heart block',
}

function getDisabledClasses(otherMeds: Medication[], currentIdx: number): DrugClass[] {
  const others = otherMeds.filter((_, i) => i !== currentIdx)
  const disabled: DrugClass[] = []
  for (const med of others) {
    const conflicts = DRUG_CONFLICT_MAP[med.drugClass] ?? []
    disabled.push(...conflicts)
  }
  return [...new Set(disabled)]
}

function getConflictReason(a: DrugClass, b: DrugClass): string {
  return DRUG_CONFLICT_REASON[`${a}+${b}`] ?? DRUG_CONFLICT_REASON[`${b}+${a}`] ?? 'ห้ามใช้ร่วมกัน'
}

// ─── Edit Medication Row ─────────────────────────────────────────────────────
function MedEditRow({
  med, allMeds, index, onChange, onRemove,
}: {
  med: Medication
  allMeds: Medication[]
  index: number
  onChange: (m: Medication) => void
  onRemove: () => void
}) {
  const disabledClasses = getDisabledClasses(allMeds, index)
  const info = DRUG_CLASSES.find(d => d.class === med.drugClass)

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={med.drugClass}
          onChange={e => onChange({ ...med, drugClass: e.target.value as DrugClass })}
          style={{
            padding: '8px 10px', borderRadius: 'var(--rs)',
            border: '1.5px solid var(--border2)', background: '#fff',
            fontSize: 12, fontFamily: 'var(--mono)', cursor: 'pointer', minWidth: 160,
          }}
        >
          {DRUG_CLASSES.map(dc => (
            <option
              key={dc.class}
              value={dc.class}
              disabled={disabledClasses.includes(dc.class)}
              style={{
                color: disabledClasses.includes(dc.class) ? '#aaa' : 'inherit',
                background: disabledClasses.includes(dc.class) ? '#fef2f2' : 'inherit',
              }}
            >
              {disabledClasses.includes(dc.class) ? `${dc.label} — ห้ามใช้ร่วม` : dc.label}
            </option>
          ))}
        </select>
        <input type="text" value={med.drugName}
          onChange={e => onChange({ ...med, drugName: e.target.value })}
          placeholder="ชื่อยา" style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--rs)', border: '1.5px solid var(--border2)', background: '#fff', fontSize: 13, outline: 'none' }} />
        <input type="text" value={med.dose}
          onChange={e => onChange({ ...med, dose: e.target.value })}
          placeholder="ขนาด" style={{ width: 80, padding: '8px 10px', borderRadius: 'var(--rs)', border: '1.5px solid var(--border2)', background: '#fff', fontSize: 13, outline: 'none' }} />
        <button onClick={onRemove} style={{ background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.2)', color: '#dc2626', borderRadius: 'var(--rs)', padding: '7px 10px', cursor: 'pointer', fontSize: 13 }}>x</button>
      </div>
      {info && (
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, marginLeft: 2, fontStyle: 'italic' }}>
          {info.indication}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const LEVEL_TH: Record<string, string> = {
  Low: 'ความเสี่ยงต่ำ', Moderate: 'ความเสี่ยงปานกลาง',
  High: 'ความเสี่ยงสูง', Critical: 'ความเสี่ยงวิกฤต',
}
const COMORBIDITY_LABEL: Record<string, string> = {
  diabetes: 'เบาหวาน', ckd: 'CKD', cad: 'CAD',
  heartFailure: 'Heart Failure', stroke: 'Stroke', af: 'AF',
  arrhythmias: 'Arrhythmias', dementia: 'Dementia',
}
const LEVEL_COLOR: Record<string, string> = {
  Low: '#00b894', Moderate: '#d97706', High: '#e67e22', Critical: '#dc2626',
}

function genRefId() { return 'HS-' + Math.random().toString(36).slice(2, 8).toUpperCase() }

// ─── Main ────────────────────────────────────────────────────────────────────
export default function SummaryPage({
  patient, risk, recommendation, doctorName, userRole, onBack, onHome,
}: {
  patient: CardioPatient
  risk: RiskResult
  recommendation: MedRecommendation
  doctorName: string
  userRole: UserRole
  onBack: () => void
  onHome: () => void
}) {
  const [editMode, setEditMode] = useState(false)
  const [meds,     setMeds]     = useState<Medication[]>(patient.medications)
  const [notes,    setNotes]    = useState(patient.clinicalNotes ?? '')
  const [apptDate, setApptDate] = useState('')
  const [thaiDateInput, setThaiDateInput] = useState('')
  const [thaiDateErr,   setThaiDateErr]   = useState('')
  const [apptNote, setApptNote] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [saveErr,  setSaveErr]  = useState('')
  const [dbSaved,  setDbSaved]  = useState(false)
  const [refId]                 = useState(genRefId)

  const canEdit = userRole === 'doctor'

  const parseThaiDate = (input: string) => {
    const parts = input.trim().split(/[\/\-]/)
    if (parts.length !== 3) return null
    const [d, m, yBE] = parts.map(Number)
    if (!d || !m || !yBE) return null
    const yCE = yBE > 2400 ? yBE - 543 : yBE
    const date = new Date(yCE, m - 1, d)
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
  }

  const handleThaiDateChange = (val: string) => {
    setThaiDateInput(val); setThaiDateErr('')
    if (!val.trim()) { setApptDate(''); return }
    const iso = parseThaiDate(val)
    if (iso) setApptDate(iso)
    else setThaiDateErr('รูปแบบไม่ถูกต้อง — กรอก วัน/เดือน/ปีพ.ศ. เช่น 30/06/2569')
  }

  const comorbList = Object.entries(patient.comorbidities)
    .filter(([, v]) => v).map(([k]) => COMORBIDITY_LABEL[k])

  const today = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })

  const handleSave = async () => {
    setSaving(true); setSaveErr('')
    if (hasSupabaseEnv && patient.dbId) {
      const result = await saveDoctorRecord({ patientDbId: patient.dbId, riskResult: risk, recommendation, doctorName, notes, apptDate, apptNote, medications: meds, refId })
      if (result.success) { setDbSaved(true) }
      else { setSaveErr(`บันทึกลง Supabase ไม่สำเร็จ: ${result.error}`); setSaving(false); return }
    } else {
      await new Promise(r => setTimeout(r, 800))
    }
    setSaving(false); setSaved(true); setEditMode(false)
  }

  if (saved) {
    return (
      <div>
        <div className={styles.stepHdr}>
          <span className={styles.stepNum}>05 / 05</span>
          <h1 className={styles.stepTitle}>บันทึกเรียบร้อย</h1>
        </div>
        <div className={styles.confirmBanner}>
          <div className={[styles.confirmCircle, styles.confirmCircleApprove].join(' ')}>
            <svg viewBox="0 0 40 40" style={{ width: 36, height: 36 }}>
              <polyline points="8,22 17,31 32,12" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 100, strokeDashoffset: 0 }} />
            </svg>
          </div>
          <div className={styles.confirmTitle}>บันทึกข้อมูลสำเร็จ</div>
          <div className={styles.confirmSub}>ข้อมูลถูกบันทึกใน HyperSense แล้ว</div>
          <div className={styles.refId}>{refId}</div>
          <div style={{ marginTop: 8, fontSize: 12, fontFamily: 'var(--mono)', color: dbSaved ? '#00a872' : '#9a6700' }}>
            {dbSaved ? 'บันทึกลง Supabase สำเร็จ' : 'Session only (Demo mode)'}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.lbl} style={{ marginBottom: 8 }}>สรุปการบันทึก</div>
          {[
            ['ผู้ป่วย', patient.name],
            ['รหัสผู้ป่วย', patient.id],
            ['แพทย์', `แพทย์ ${doctorName}`],
            ['วันที่บันทึก', today],
            ['ระดับความเสี่ยง', LEVEL_TH[risk.riskLevel]],
            ...(comorbList.length > 0 ? [['โรคร่วม', comorbList.join(', ')]] : []),
            ['คำแนะนำยา', recommendation.thai],
            ['ยาที่ใช้', meds.map(m => `${m.drugClass} ${m.dose}`).join(', ')],
            ...(apptDate ? [['นัดหมายครั้งต่อไป', new Date(apptDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })]] : []),
            ...(notes ? [['หมายเหตุแพทย์', notes]] : []),
          ].map(([k, v]) => (
            <div key={k} className={styles.summaryRow}>
              <span className={styles.summaryKey}>{k}</span>
              <span className={styles.summaryVal} style={{ color: k === 'ระดับความเสี่ยง' ? LEVEL_COLOR[risk.riskLevel] : undefined }}>{v}</span>
            </div>
          ))}
        </div>

        <div className={styles.aiNote}>
          ในระบบจริงจะส่งข้อมูลนี้ไปยัง HIS/EMR โดยอัตโนมัติ
        </div>
        <div className={styles.btnRow}>
          <button className={styles.btnS} onClick={onBack}>← ดูสรุปอีกครั้ง</button>
          <button className={styles.btnP} onClick={onHome}>ค้นหาผู้ป่วยใหม่</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.stepHdr}>
        <span className={styles.stepNum}>05 / 05</span>
        <h1 className={styles.stepTitle}>สรุปและบันทึกข้อมูล</h1>
      </div>
      <p className={styles.stepDesc}>ตรวจสอบ แก้ไข และบันทึกผลการประเมิน</p>

      {/* Patient Card */}
      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border2)', borderRadius: 'var(--r)', padding: '18px 20px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {patient.name.charAt(3)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 2 }}>{patient.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>
              อายุ {patient.age} ปี · เพศ{patient.sex} · รหัส {patient.id}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>ระดับความเสี่ยง</div>
            <span className={[styles.riskBadge,
              risk.riskLevel === 'Low' ? styles.riskLow : risk.riskLevel === 'Moderate' ? styles.riskModerate
              : risk.riskLevel === 'High' ? styles.riskHigh : styles.riskCritical
            ].join(' ')} style={{ fontSize: 13, padding: '6px 16px' }}>
              {LEVEL_TH[risk.riskLevel]}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div style={{ background: 'var(--bg3)', borderRadius: 'var(--rs)', padding: '12px 14px', border: '1px solid var(--border)' }}>
            <div className={styles.lbl} style={{ marginBottom: 6 }}>ค่าความดัน</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--mono)', color: risk.lastSBP > 140 ? '#dc2626' : 'var(--accent)' }}>
              {risk.lastSBP}/{risk.lastDBP}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>SBP/DBP (mmHg)</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>เฉลี่ย: {risk.avgSBP}/{risk.avgDBP}</div>
          </div>
          <div style={{ background: 'var(--bg3)', borderRadius: 'var(--rs)', padding: '12px 14px', border: '1px solid var(--border)' }}>
            <div className={styles.lbl} style={{ marginBottom: 6 }}>ความเสี่ยง</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
              Stroke: <strong style={{ fontFamily: 'var(--mono)', color: risk.strokeRisk >= 60 ? '#dc2626' : 'var(--text)' }}>{risk.strokeRisk}%</strong><br />
              MACE: <strong style={{ fontFamily: 'var(--mono)', color: risk.maceRisk >= 60 ? '#dc2626' : 'var(--text)' }}>{risk.maceRisk}%</strong>
            </div>
          </div>
          <div style={{ background: 'var(--bg3)', borderRadius: 'var(--rs)', padding: '12px 14px', border: '1px solid var(--border)' }}>
            <div className={styles.lbl} style={{ marginBottom: 6 }}>คำแนะนำ</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{recommendation.thai}</div>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{recommendation.type}</div>
          </div>
        </div>
      </div>

      {/* Comorbidities — เน้นเป็นโรคเสี่ยง */}
      {comorbList.length > 0 && (
        <div style={{ marginBottom: 14, padding: '14px 16px', background: 'rgba(220,38,38,.04)', border: '1.5px solid rgba(220,38,38,.2)', borderRadius: 'var(--rs)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>โรคร่วม / ความเสี่ยงสำคัญ</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {comorbList.map(c => (
              <span key={c} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)',
                color: '#dc2626',
              }}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Medications */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className={styles.lbl} style={{ marginBottom: 0 }}>คำแนะนำยาความดัน</div>
        {canEdit && !editMode && (
          <button onClick={() => setEditMode(true)} style={{
            fontSize: 12, padding: '5px 14px', borderRadius: 20,
            background: 'rgba(0,168,114,.08)', border: '1px solid rgba(0,168,114,.25)',
            color: 'var(--accent)', cursor: 'pointer',
          }}>แก้ไขข้อมูลผู้ป่วย</button>
        )}
        {!canEdit && (
          <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>
            เฉพาะแพทย์เท่านั้นที่สามารถแก้ไขได้
          </span>
        )}
      </div>

      {editMode ? (
        <div style={{ background: 'rgba(0,168,114,.03)', border: '1.5px solid rgba(0,168,114,.2)', borderRadius: 'var(--r)', padding: '16px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
            แก้ไขรายการยา — ยาที่ห้ามใช้ร่วมกันจะไม่สามารถเลือกได้ในช่อง dropdown
          </div>
          {meds.map((m, i) => (
            <MedEditRow
              key={i} med={m} allMeds={meds} index={i}
              onChange={nm => setMeds(prev => prev.map((p, pi) => pi === i ? nm : p))}
              onRemove={() => setMeds(prev => prev.filter((_, pi) => pi !== i))}
            />
          ))}
          <button
            onClick={() => setMeds(prev => [...prev, { drugClass: 'CCB-DHP', drugName: '', dose: '', frequency: '1x/วัน' }])}
            style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: '1.5px dashed rgba(0,168,114,.4)', borderRadius: 'var(--rs)', padding: '7px 14px', cursor: 'pointer', width: '100%', marginTop: 4 }}
          >+ เพิ่มยา</button>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>หมายเหตุแพทย์</div>
            <textarea className={styles.noteField} value={notes} onChange={e => setNotes(e.target.value)} placeholder="บันทึกการรักษา, ผลการตรวจ, แผนการรักษา..." style={{ marginBottom: 0 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className={styles.btnP} onClick={() => setEditMode(false)}>ยืนยันการแก้ไข</button>
            <button className={styles.btnS} onClick={() => { setEditMode(false); setMeds(patient.medications); setNotes(patient.clinicalNotes ?? '') }}>ยกเลิก</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {meds.map((m, i) => {
            const info = DRUG_CLASSES.find(d => d.class === m.drugClass)
            return (
              <div key={i} style={{ background: 'var(--bg3)', border: '1.5px solid var(--border2)', borderRadius: 'var(--rs)', padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--mono)', marginBottom: 2 }}>{m.drugClass}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{m.drugName}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.dose} · {m.frequency}</div>
                {info && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, fontStyle: 'italic' }}>{info.indication}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Check active conflicts (display only when conflict exists but selected) */}
      {(() => {
        const classes = meds.map(m => m.drugClass)
        const found: string[] = []
        for (const [dc, conflicts] of Object.entries(DRUG_CONFLICT_MAP) as [DrugClass, DrugClass[]][]) {
          for (const c of conflicts) {
            if (classes.includes(dc) && classes.includes(c)) {
              const key = `${dc}+${c}`
              const reason = DRUG_CONFLICT_REASON[key] ?? DRUG_CONFLICT_REASON[`${c}+${dc}`]
              if (reason && !found.includes(reason)) found.push(reason)
            }
          }
        }
        return found.map((msg, i) => (
          <div key={i} style={{ padding: '10px 12px', marginBottom: 8, background: 'rgba(220,38,38,.07)', border: '1.5px solid rgba(220,38,38,.3)', borderRadius: 'var(--rs)', fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
            ข้อควรระวัง: {msg}
          </div>
        ))
      })()}

      {!editMode && notes && (
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '12px 14px', marginBottom: 14, fontSize: 13, lineHeight: 1.7 }}>
          {notes}
        </div>
      )}

      <div className={styles.divider} />

      {/* Next Appointment */}
      <div className={styles.lbl} style={{ marginBottom: 10 }}>นัดหมายครั้งต่อไป</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 600 }}>วันที่นัด (พ.ศ.) — วัน/เดือน/ปี</label>
          <input type="text" value={thaiDateInput} onChange={e => handleThaiDateChange(e.target.value)}
            placeholder="เช่น 30/06/2569"
            style={{ width: '100%', padding: '10px 14px', background: '#fff', border: `1.5px solid ${thaiDateErr ? '#dc2626' : 'var(--border2)'}`, borderRadius: 'var(--rs)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 14, outline: 'none' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = thaiDateErr ? '#dc2626' : ''}
          />
          {thaiDateErr && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{thaiDateErr}</div>}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 600 }}>หมายเหตุการนัด</label>
          <input type="text" value={apptNote} onChange={e => setApptNote(e.target.value)}
            placeholder="เช่น ติดตาม BP, ตรวจเลือด..."
            style={{ width: '100%', padding: '10px 14px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 'var(--rs)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = ''}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ label: '1 สัปดาห์', days: 7 }, { label: '2 สัปดาห์', days: 14 }, { label: '1 เดือน', days: 30 }, { label: '3 เดือน', days: 90 }].map(({ label, days }) => {
          const d = new Date(); d.setDate(d.getDate() + days)
          const val = d.toISOString().split('T')[0]
          const thaiStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()+543}`
          return (
            <button key={label} className={[styles.followUpBtn, apptDate === val ? styles.followUpActive : ''].join(' ')}
              onClick={() => { setApptDate(val); setThaiDateInput(thaiStr); setThaiDateErr('') }}
            >{label}</button>
          )
        })}
      </div>

      {apptDate && (
        <div style={{ background: 'rgba(0,168,114,.06)', border: '1.5px solid rgba(0,168,114,.25)', borderRadius: 'var(--rs)', padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
          นัดหมาย: <strong>{new Date(apptDate).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
          {apptNote && <> — {apptNote}</>}
        </div>
      )}

      {saveErr && (
        <div style={{ padding: '10px 14px', marginBottom: 12, background: 'rgba(220,38,38,.06)', border: '1.5px solid rgba(220,38,38,.25)', borderRadius: 'var(--rs)', fontSize: 13, color: '#dc2626' }}>{saveErr}</div>
      )}

      <div className={styles.btnRow}>
        <button className={styles.btnS} onClick={onBack}>← กลับ</button>
        <button className={styles.btnP} onClick={handleSave} disabled={saving} style={{ minWidth: 160 }}>
          {saving ? (hasSupabaseEnv ? 'กำลังบันทึกลง Supabase...' : 'กำลังบันทึก...') : 'บันทึกข้อมูล'}
        </button>
      </div>
    </div>
  )
}
