'use client'
import { useState } from 'react'
import type { CardioPatient, RiskResult, MedRecommendation, Medication, DrugClass, UserRole } from '@/lib/types'
import { saveDoctorRecord, hasSupabaseEnv } from '@/lib/supabaseData'
import {
  DRUG_GROUPS, PRIMARY_DRUG_CLASSES, FREQ_OPTIONS,
  getDrugGroup, conflictReason, inSystemConflicts, populationAlerts, avoidLabels,
} from '@/lib/medicationGuide'
import styles from './HyperSense.module.css'

// คลาสยาเรียงลำดับ: 7 กลุ่มหลักก่อน แล้วตามด้วยกลุ่มเสริม
const ORDERED_CLASSES: DrugClass[] = [
  ...PRIMARY_DRUG_CLASSES,
  ...DRUG_GROUPS.map(g => g.class).filter(c => !PRIMARY_DRUG_CLASSES.includes(c)),
]

/**
 * กลุ่มยาที่ห้ามเลือกในแถวนี้:
 *   - กลุ่มเดียวกับแถวอื่น (ห้ามซ้ำ)
 *   - กลุ่มที่มี severity='avoid' กับยาที่เลือกไว้แล้ว
 * ⇒ options เหล่านี้จะถูก filter ออกจาก DOM เลย (ไม่ใช้แค่ disabled)
 */
function getBlockedClasses(meds: Medication[], currentIdx: number): Set<DrugClass> {
  const blocked = new Set<DrugClass>()
  meds.forEach((m, i) => {
    if (i === currentIdx) return
    blocked.add(m.drugClass)
    for (const c of inSystemConflicts(m.drugClass)) {
      if (c.severity === 'avoid') blocked.add(c.cls)
    }
  })
  return blocked
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
  const blocked = getBlockedClasses(allMeds, index)
  const group = getDrugGroup(med.drugClass)
  const drugNames = group?.drugs ?? []
  const missing = !med.drugName || !med.dose || !med.frequency
  // classes ที่แสดงได้ = ยังไม่ถูก block หรือเป็นตัวที่เลือกอยู่แล้ว
  const availableClasses = ORDERED_CLASSES.filter(c => !blocked.has(c) || c === med.drugClass)

  return (
    <div style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--bg)', border: `1.5px solid ${missing ? 'rgba(220,38,38,.3)' : 'var(--border2)'}`, borderRadius: 'var(--rs)' }}>
      {blocked.size > 0 && (
        <div style={{ fontSize: 11, color: '#b45309', background: 'rgba(217,119,6,.07)', border: '1px solid rgba(217,119,6,.25)', borderRadius: 'var(--rs)', padding: '5px 10px', marginBottom: 8 }}>
          ⚠ กลุ่มที่ห้ามใช้ร่วมถูกซ่อนออกจากรายการแล้ว
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>กลุ่มยา *</label>
          <select
            value={med.drugClass}
            onChange={e => {
              const next = e.target.value as DrugClass
              // guard ชั้นที่ 2 — ป้องกันกรณีเบราว์เซอร์ส่งค่าที่ถูก block มา
              if (blocked.has(next) && next !== med.drugClass) return
              onChange({ ...med, drugClass: next, drugName: '' })
            }}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--rs)', border: '1.5px solid var(--border2)', background: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            {availableClasses.map(c => {
              const g = getDrugGroup(c)!
              return <option key={c} value={c}>{g.short}</option>
            })}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>ชื่อยา *</label>
          <select
            value={med.drugName}
            onChange={e => onChange({ ...med, drugName: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--rs)', border: `1.5px solid ${!med.drugName ? 'rgba(220,38,38,.4)' : 'var(--border2)'}`, background: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            <option value="">— เลือกชื่อยา —</option>
            {drugNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>ขนาดยา *</label>
          <input type="text" value={med.dose}
            onChange={e => onChange({ ...med, dose: e.target.value })}
            placeholder="เช่น 5 mg, 50 mg"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--rs)', border: `1.5px solid ${!med.dose ? 'rgba(220,38,38,.4)' : 'var(--border2)'}`, background: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>ความถี่ *</label>
          <select
            value={med.frequency}
            onChange={e => onChange({ ...med, frequency: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--rs)', border: `1.5px solid ${!med.frequency ? 'rgba(220,38,38,.4)' : 'var(--border2)'}`, background: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            <option value="">— เลือกความถี่ —</option>
            {FREQ_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {group && <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>{group.indication}</div>}
        <button onClick={onRemove} style={{ marginLeft: 'auto', background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.2)', color: '#dc2626', borderRadius: 'var(--rs)', padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>ลบ</button>
      </div>
      {missing && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>⚠ กรุณากรอกข้อมูลให้ครบทุกช่อง</div>}
    </div>
  )
}

// ─── Drug knowledge panel: ผลข้างเคียง + ยาที่ห้าม/ควรใช้ร่วม ────────────────
function DrugInfoPanel({ meds }: { meds: Medication[] }) {
  const classes = [...new Set(meds.map(m => m.drugClass))]
  if (classes.length === 0) return null
  return (
    <div style={{ marginBottom: 14 }}>
      <div className={styles.lbl} style={{ marginBottom: 8 }}>ข้อมูลยาที่ใช้ (ผลข้างเคียง / การใช้ร่วม)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {classes.map(c => {
          const g = getDrugGroup(c)
          if (!g) return null
          return (
            <div key={c} style={{ background: 'var(--bg3)', border: `1px solid ${g.color}40`, borderLeft: `3px solid ${g.color}`, borderRadius: 'var(--rs)', padding: '10px 14px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: g.color, marginBottom: 4 }}>{g.label}</div>
              {g.subgroups && g.subgroups.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 2 }}>
                  <strong>กลุ่มย่อย:</strong> {g.subgroups.map(s => `${s.name} (${s.drugs.join(', ')})`).join(' · ')}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
                <strong>ผลข้างเคียง:</strong> {g.sideEffects.join(' · ')}
              </div>
              {g.synergyWith.length > 0 && (
                <div style={{ fontSize: 11, color: '#047857', lineHeight: 1.6, marginTop: 2 }}>
                  <strong>ใช้ร่วมได้ (เสริมฤทธิ์):</strong> {g.synergyWith.map(s => getDrugGroup(s)?.short ?? s).join(', ')}
                </div>
              )}
              {g.avoidWith.length > 0 && (
                <div style={{ fontSize: 11, color: '#b45309', lineHeight: 1.6, marginTop: 2 }}>
                  <strong>ใช้ร่วมไม่ได้ / ระวัง:</strong> {avoidLabels(g).join(', ')}
                </div>
              )}
              {g.usageNote && (
                <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6, marginTop: 2, fontStyle: 'italic' }}>
                  {g.usageNote}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const LEVEL_TH: Record<string, string> = {
  Low: 'ความเสี่ยงต่ำ', Moderate: 'ความเสี่ยงปานกลาง',
  High: 'ความเสี่ยงสูง', Critical: 'ความเสี่ยงวิกฤต',
}
const COMORBIDITY_LABEL: Record<string, string> = {
  diabetes: 'เบาหวาน', ckd: 'CKD', cad: 'CAD (หลอดเลือดหัวใจ)',
  heartFailure: 'Heart Failure', stroke: 'Stroke', pad: 'PAD (หลอดเลือดส่วนปลาย)',
  plaque: 'พบ Plaque', af: 'AF', arrhythmias: 'หัวใจเต้นผิดจังหวะ',
  dementia: 'สมองเสื่อม', dyslipidemia: 'ไขมันผิดปกติ',
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
    .filter(([, v]) => v).map(([k]) => COMORBIDITY_LABEL[k]).filter(Boolean)

  const today = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })

  // คำเตือนยาที่ห้ามใช้ร่วม (active conflicts) + ประชากรพิเศษ
  const activeConflicts: { severity: string; reason: string }[] = (() => {
    const classes = meds.map(m => m.drugClass)
    const seen = new Set<string>()
    const out: { severity: string; reason: string }[] = []
    for (let i = 0; i < classes.length; i++) {
      for (let j = i + 1; j < classes.length; j++) {
        const r = conflictReason(classes[i], classes[j])
        if (r && !seen.has(r.reason)) { seen.add(r.reason); out.push(r) }
      }
    }
    return out
  })()
  const popAlerts = populationAlerts(meds.map(m => m.drugClass), patient.comorbidities, patient.profile)

  const handleSave = async () => {
    const incompleteMed = meds.find(m => !m.drugName || !m.dose || !m.frequency)
    if (incompleteMed) { setSaveErr('กรุณากรอกข้อมูลยาให้ครบทุกช่อง (ชื่อยา, ขนาด, ความถี่)'); return }

    setSaving(true); setSaveErr('')
    if (hasSupabaseEnv && patient.dbId) {
      const result = await saveDoctorRecord({ patientDbId: patient.dbId, riskResult: risk, recommendation, doctorName, notes, apptDate, apptNote, medications: meds, refId })
      if (result.success) { setDbSaved(true) }
      else { setSaveErr(`บันทึกลง Supabase ไม่สำเร็จ: ${result.error}`); setSaving(false); return }
    } else {
      await new Promise(r => setTimeout(r, 600))
    }
    setSaving(false); setSaved(true); setEditMode(false)
  }

  // ── Success screen ───────────────────────────────────────────────────────
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
              <polyline points="8,22 17,31 32,12" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className={styles.confirmTitle}>บันทึกข้อมูลสำเร็จ</div>
          <div className={styles.confirmSub}>ข้อมูลถูกบันทึกใน HyperSense แล้ว</div>
          <div className={styles.refId}>{refId}</div>
          <div style={{ marginTop: 8, fontSize: 12, fontFamily: 'var(--mono)', color: dbSaved ? '#00a872' : '#9a6700' }}>
            {dbSaved ? 'บันทึกลง Supabase สำเร็จ' : 'Session only (ยังไม่เชื่อมต่อ Supabase)'}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.lbl} style={{ marginBottom: 8 }}>สรุปการบันทึก</div>
          {[
            ['ผู้ป่วย', patient.name],
            ['รหัสผู้ป่วย', patient.id],
            ['แพทย์ผู้บันทึก', doctorName],
            ['วันที่บันทึก', today],
            ['ระดับความเสี่ยง', LEVEL_TH[risk.riskLevel]],
            ...(comorbList.length > 0 ? [['โรคร่วม', comorbList.join(', ')]] : []),
            ['คำแนะนำยา', recommendation.thai],
            ['ยาที่ใช้', meds.map(m => `${getDrugGroup(m.drugClass)?.short ?? m.drugClass} ${m.dose}`).join(', ')],
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
          ในระบบจริงจะส่งข้อมูลนี้ไปยัง HIS/EMR ของโรงพยาบาลโดยอัตโนมัติ
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
      <p className={styles.stepDesc}>ตรวจสอบ แก้ไข และบันทึกผลการประเมิน (เฉพาะแพทย์)</p>

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

      {/* Comorbidities */}
      {comorbList.length > 0 && (
        <div style={{ marginBottom: 14, padding: '14px 16px', background: 'rgba(220,38,38,.04)', border: '1.5px solid rgba(220,38,38,.2)', borderRadius: 'var(--rs)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>โรคร่วม / ความเสี่ยงสำคัญ</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {comorbList.map(c => (
              <span key={c} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)', color: '#dc2626' }}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Population alerts: ตั้งครรภ์/บุหรี่/เหล้า/ผ่าตัด */}
      {popAlerts.length > 0 && (
        <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {popAlerts.map((a, i) => (
            <div key={i} style={{
              padding: '8px 12px', borderRadius: 'var(--rs)', fontSize: 12, fontWeight: 500,
              background: a.level === 'danger' ? 'rgba(220,38,38,.07)' : a.level === 'warn' ? 'rgba(217,119,6,.07)' : 'rgba(59,130,246,.06)',
              border: `1px solid ${a.level === 'danger' ? 'rgba(220,38,38,.3)' : a.level === 'warn' ? 'rgba(217,119,6,.3)' : 'rgba(59,130,246,.25)'}`,
              color: a.level === 'danger' ? '#dc2626' : a.level === 'warn' ? '#b45309' : '#1d4ed8',
            }}>{a.text}</div>
          ))}
        </div>
      )}

      {/* Medications */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className={styles.lbl} style={{ marginBottom: 0 }}>คำแนะนำยาความดัน</div>
        {canEdit && !editMode && (
          <button onClick={() => setEditMode(true)} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 20, background: 'rgba(0,168,114,.08)', border: '1px solid rgba(0,168,114,.25)', color: 'var(--accent)', cursor: 'pointer' }}>แก้ไขยา / นัดหมาย</button>
        )}
        {!canEdit && (
          <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>เฉพาะแพทย์เท่านั้นที่แก้ไขได้</span>
        )}
      </div>

      {editMode ? (
        <div style={{ background: 'rgba(0,168,114,.03)', border: '1.5px solid rgba(0,168,114,.2)', borderRadius: 'var(--r)', padding: '16px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
            แก้ไขรายการยา — ยาชนิดเดียวกันและยาที่ห้ามใช้ร่วมกันจะเลือกซ้ำไม่ได้
          </div>
          {meds.map((m, i) => (
            <MedEditRow
              key={i} med={m} allMeds={meds} index={i}
              onChange={nm => setMeds(prev => prev.map((p, pi) => pi === i ? nm : p))}
              onRemove={() => setMeds(prev => prev.filter((_, pi) => pi !== i))}
            />
          ))}
          <button
            onClick={() => setMeds(prev => [...prev, { drugClass: 'CCB', drugName: '', dose: '', frequency: '1x/วัน' }])}
            style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: '1.5px dashed rgba(0,168,114,.4)', borderRadius: 'var(--rs)', padding: '7px 14px', cursor: 'pointer', width: '100%', marginTop: 4 }}
          >+ เพิ่มยา</button>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>หมายเหตุแพทย์</div>
            <textarea className={styles.noteField} value={notes} onChange={e => setNotes(e.target.value)} placeholder="บันทึกการรักษา, แผนการรักษา..." style={{ marginBottom: 0 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className={styles.btnP} onClick={() => setEditMode(false)}>ยืนยันการแก้ไข</button>
            <button className={styles.btnS} onClick={() => { setEditMode(false); setMeds(patient.medications); setNotes(patient.clinicalNotes ?? '') }}>ยกเลิก</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {meds.map((m, i) => {
            const g = getDrugGroup(m.drugClass)
            return (
              <div key={i} style={{ background: 'var(--bg3)', border: `1.5px solid ${g?.color ?? '#999'}40`, borderRadius: 'var(--rs)', padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: g?.color ?? '#999', fontFamily: 'var(--mono)', marginBottom: 2 }}>{g?.short ?? m.drugClass}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{m.drugName}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.dose} · {m.frequency}</div>
              </div>
            )
          })}
          {meds.length === 0 && <div style={{ fontSize: 13, color: 'var(--text3)' }}>ยังไม่มีรายการยา</div>}
        </div>
      )}

      {/* Active conflict warnings */}
      {activeConflicts.map((c, i) => (
        <div key={i} style={{ padding: '10px 12px', marginBottom: 8, background: c.severity === 'avoid' ? 'rgba(220,38,38,.07)' : 'rgba(217,119,6,.07)', border: `1.5px solid ${c.severity === 'avoid' ? 'rgba(220,38,38,.3)' : 'rgba(217,119,6,.3)'}`, borderRadius: 'var(--rs)', fontSize: 12, color: c.severity === 'avoid' ? '#dc2626' : '#b45309', fontWeight: 600 }}>
          {c.severity === 'avoid' ? 'ห้ามใช้ร่วม: ' : 'ข้อควรระวัง: '}{c.reason}
        </div>
      ))}

      {/* Drug knowledge */}
      <DrugInfoPanel meds={meds} />

      {!editMode && notes && (
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '12px 14px', marginBottom: 14, fontSize: 13, lineHeight: 1.7 }}>
          {notes}
        </div>
      )}

      <div className={styles.divider} />

      {/* นัดหมายครั้งต่อไป — มีที่เดียว */}
      <div className={styles.lbl} style={{ marginBottom: 10 }}>นัดหมายครั้งต่อไป *</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 600 }}>วันที่นัด (พ.ศ.) — วัน/เดือน/ปี</label>
          <input type="text" value={thaiDateInput} onChange={e => handleThaiDateChange(e.target.value)}
            placeholder="เช่น 30/06/2569"
            style={{ width: '100%', padding: '10px 14px', background: '#fff', border: `1.5px solid ${thaiDateErr ? '#dc2626' : !apptDate ? 'rgba(220,38,38,.4)' : 'var(--border2)'}`, borderRadius: 'var(--rs)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = thaiDateErr ? '#dc2626' : ''}
          />
          {thaiDateErr && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{thaiDateErr}</div>}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 600 }}>หมายเหตุการนัด</label>
          <input type="text" value={apptNote} onChange={e => setApptNote(e.target.value)}
            placeholder="เช่น ติดตาม BP, ตรวจเลือด..."
            style={{ width: '100%', padding: '10px 14px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 'var(--rs)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
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
              onClick={() => { setApptDate(val); setThaiDateInput(thaiStr); setThaiDateErr('') }}>{label}</button>
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
