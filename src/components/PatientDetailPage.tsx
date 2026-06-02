'use client'
import { useState, useEffect } from 'react'
import type { CardioPatient, BPVisit, UserRole, PatientLab, DoctorRecord } from '@/lib/types'
import { saveVisit, hasSupabaseEnv } from '@/lib/supabaseData'
import styles from './HyperSense.module.css'

function isToday(dateStr: string) {
  const t = new Date(); const d = new Date(dateStr)
  return d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

const COMORBIDITY_LABEL: Record<string, string> = {
  diabetes: 'เบาหวาน (DM)', ckd: 'โรคไตเรื้อรัง (CKD)',
  cad: 'หลอดเลือดหัวใจ (CAD)', heartFailure: 'หัวใจล้มเหลว (HF)',
  stroke: 'Stroke', af: 'AF', arrhythmias: 'หัวใจเต้นผิดจังหวะ', dementia: 'สมองเสื่อม',
}

const DRUG_COLOR: Record<string, string> = {
  'ACEI': '#3b82f6', 'ARB': '#8b5cf6', 'ARNI': '#6366f1',
  'CCB-DHP': '#f59e0b', 'CCB-NonDHP': '#d97706',
  'Beta-blocker': '#ef4444',
  'Diuretic-Thiazide': '#14b8a6', 'Diuretic-Loop': '#0891b2', 'Diuretic-KSparing': '#0d9488',
  'Alpha-blocker': '#84cc16', 'Alpha2-agonist': '#65a30d', 'Direct-Vasodilator': '#a3e635',
}

function PatientAvatar({ patient }: { patient: CardioPatient }) {
  const colors = [['#00a872','#00b5a0'], ['#8b5cf6','#6366f1'], ['#f59e0b','#d97706'], ['#3b82f6','#2563eb'], ['#dc2626','#b91c1c']]
  const [c1, c2] = colors[parseInt(patient.id) % colors.length]
  return (
    <div style={{
      width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 28, fontWeight: 700, color: '#fff',
      border: '3px solid rgba(255,255,255,.5)',
      boxShadow: `0 4px 16px ${c1}44`,
    }}>
      {patient.name.charAt(3) || '?'}
    </div>
  )
}

// ── Lab Entry (medtech) ───────────────────────────────────────────────────────
function LabEntrySection({ patient, onLabSaved }: { patient: CardioPatient; onLabSaved?: (labs: Partial<PatientLab>) => void }) {
  const labs = patient.labs
  type LabKey = keyof typeof fields
  const fields = {
    fpg:        { label: 'น้ำตาลในเลือด FPG (mg/dL)',     placeholder: String(labs.fpg ?? ''), unit: 'mg/dL', warn: (v: number) => v > 126 },
    hba1c:      { label: 'HbA1c (%)',                      placeholder: String(labs.hba1c ?? ''), unit: '%',    warn: (v: number) => v > 7.5 },
    uacr:       { label: 'ผลปัสสาวะ uACR (mg/g)',          placeholder: String(labs.uacr ?? ''), unit: 'mg/g', warn: (v: number) => v > 30 },
    creatinine: { label: 'Creatinine (mg/dL)',             placeholder: String(labs.creatinine ?? ''), unit: 'mg/dL', warn: (v: number) => v > 1.3 },
    egfr:       { label: 'eGFR (mL/min/1.73m²)',           placeholder: String(labs.egfr ?? ''), unit: '', warn: (v: number) => v < 60 },
    ldl:        { label: 'LDL Cholesterol (mg/dL)',        placeholder: String(labs.ldl ?? ''), unit: 'mg/dL', warn: (v: number) => v > 130 },
    hdl:        { label: 'HDL Cholesterol (mg/dL)',        placeholder: String(labs.hdl ?? ''), unit: 'mg/dL', warn: (v: number) => v < 40 },
    tg:         { label: 'Triglyceride (mg/dL)',           placeholder: String(labs.tg ?? ''), unit: 'mg/dL', warn: (v: number) => v > 150 },
    chol:       { label: 'Total Cholesterol (mg/dL)',      placeholder: String(labs.chol ?? ''), unit: 'mg/dL', warn: (v: number) => v > 200 },
    potassium:  { label: 'Potassium K⁺ (mEq/L)',           placeholder: String(labs.potassium ?? ''), unit: 'mEq/L', warn: (v: number) => v > 5.0 },
    sodium:     { label: 'Sodium Na⁺ (mEq/L)',             placeholder: String(labs.sodium ?? ''), unit: 'mEq/L', warn: (v: number) => v < 135 || v > 145 },
    hemoglobin: { label: 'Hemoglobin Hb (g/dL)',           placeholder: String(labs.hemoglobin ?? ''), unit: 'g/dL', warn: (v: number) => v < 12 },
    wbc:        { label: 'WBC (×10³/µL)',                  placeholder: String(labs.wbc ?? ''), unit: '×10³/µL', warn: (v: number) => v > 10 || v < 4 },
    troponin:   { label: 'Troponin (ng/mL)',               placeholder: String(labs.troponin ?? ''), unit: 'ng/mL', warn: (v: number) => v > 0.04 },
    proBNP:     { label: 'NT-proBNP (pg/mL)',              placeholder: String(labs.proBNP ?? ''), unit: 'pg/mL', warn: (v: number) => v > 125 },
  }

  const [vals, setVals] = useState<Partial<Record<string, string>>>({})
  const [saved, setSaved] = useState(false)

  const set = (k: string, v: string) => setVals(p => ({ ...p, [k]: v }))

  const groups = [
    { title: 'น้ำตาลและเบาหวาน', keys: ['fpg', 'hba1c'] as LabKey[] },
    { title: 'ผลตรวจปัสสาวะและไต', keys: ['uacr', 'creatinine', 'egfr'] as LabKey[] },
    { title: 'ไขมันในเลือด', keys: ['ldl', 'hdl', 'tg', 'chol'] as LabKey[] },
    { title: 'เกลือแร่', keys: ['potassium', 'sodium'] as LabKey[] },
    { title: 'ความสมบูรณ์ของเลือด (CBC)', keys: ['hemoglobin', 'wbc'] as LabKey[] },
    { title: 'ค่าหัวใจขั้นสูง', keys: ['troponin', 'proBNP'] as LabKey[] },
  ]

  // UA Dipstick (qualitative — text select)
  const UA_FIELDS: { key: string; label: string; opts: string[] }[] = [
    { key: 'ua_protein',  label: 'Protein',  opts: ['Negative', 'Trace', '1+', '2+', '3+', '4+'] },
    { key: 'ua_glucose',  label: 'Glucose',  opts: ['Negative', '1+', '2+', '3+', '4+'] },
    { key: 'ua_blood',    label: 'Blood',    opts: ['Negative', 'Trace', '1+', '2+', '3+'] },
    { key: 'ua_nitrite',  label: 'Nitrite',  opts: ['Negative', 'Positive'] },
    { key: 'ua_ketone',   label: 'Ketone',   opts: ['Negative', 'Trace', '1+', '2+', '3+'] },
    { key: 'ua_leukocyte',label: 'Leukocyte',opts: ['Negative', 'Trace', '1+', '2+', '3+'] },
    { key: 'ua_ph',       label: 'pH',       opts: ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5'] },
    { key: 'ua_sg',       label: 'Sp.Gravity',opts: ['1.005', '1.010', '1.015', '1.020', '1.025', '1.030'] },
  ]
  const [uaVals,  setUaVals]  = useState<Record<string, string>>({})
  const [ecgNote, setEcgNote] = useState('')
  const [extraNote, setExtraNote] = useState('')

  const setUa = (k: string, v: string) => setUaVals(p => ({ ...p, [k]: v }))

  const handleLabSave = () => {
    const saved: Partial<PatientLab> = { date: new Date().toISOString().split('T')[0] }
    for (const [k, v] of Object.entries(vals)) {
      const num = parseFloat(v ?? '')
      if (!isNaN(num)) (saved as Record<string, number | string>)[k] = num
    }
    onLabSaved?.(saved)
    setSaved(true)
  }

  if (saved) return (
    <div style={{ background: 'rgba(139,92,246,.04)', border: '1.5px solid rgba(139,92,246,.25)', borderRadius: 'var(--r)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontWeight: 700, color: '#7c3aed', flex: 1 }}>บันทึกผลการตรวจแล้ว</div>
        <button onClick={() => setSaved(false)}
          style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.3)', color: '#7c3aed' }}>
          แก้ไข
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>กด <strong>แก้ไข</strong> เพื่อแก้ไขค่า หรือดำเนินการต่อเพื่อดูผลการวิเคราะห์</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {Object.entries(vals).filter(([, v]) => v).map(([k, v]) => {
          const f = fields[k as LabKey]
          const num = parseFloat(v!)
          const hi = !isNaN(num) && f.warn(num)
          return (
            <div key={k} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 'var(--rs)', background: hi ? 'rgba(220,38,38,.08)' : 'var(--bg3)', border: `1px solid ${hi ? 'rgba(220,38,38,.3)' : 'var(--border)'}`, color: hi ? '#dc2626' : 'var(--text2)', fontFamily: 'var(--mono)' }}>
              {f.label.split(' ')[0]}: <strong>{v}</strong>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{ background: 'rgba(139,92,246,.04)', border: '1.5px solid rgba(139,92,246,.2)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
      <div style={{ fontWeight: 700, color: '#7c3aed', fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        บันทึกผลการตรวจทางห้องปฏิบัติการ
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: '#8b5cf6' }}>[เทคนิคการแพทย์]</span>
      </div>
      {groups.map(g => (
        <div key={g.title} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>{g.title}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {g.keys.map(k => {
              const f = fields[k]
              const num = parseFloat(vals[k] ?? '')
              const hi = vals[k] && !isNaN(num) && f.warn(num)
              return (
                <div key={k}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4, fontWeight: 600 }}>{f.label}</label>
                  <input
                    type="number" value={vals[k] ?? ''} placeholder={f.placeholder || '—'}
                    onChange={e => set(k, e.target.value)}
                    style={{ width: '100%', padding: '9px 11px', background: '#fff', border: `1.5px solid ${hi ? 'rgba(220,38,38,.5)' : 'var(--border2)'}`, borderRadius: 'var(--rs)', color: hi ? '#dc2626' : 'var(--text)', fontFamily: 'var(--mono)', fontSize: 14, outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                    onBlur={e => e.target.style.borderColor = hi ? 'rgba(220,38,38,.5)' : ''}
                  />
                  {hi && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>⚠ ค่าผิดปกติ</div>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {/* UA Dipstick */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>ผลตรวจปัสสาวะ (UA Dipstick)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {UA_FIELDS.map(f => {
            const isAbnormal = uaVals[f.key] && uaVals[f.key] !== 'Negative' && f.key !== 'ua_ph' && f.key !== 'ua_sg'
            return (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4, fontWeight: 600 }}>{f.label}</label>
                <select value={uaVals[f.key] ?? ''} onChange={e => setUa(f.key, e.target.value)}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: 'var(--rs)', border: `1.5px solid ${isAbnormal ? 'rgba(220,38,38,.5)' : 'var(--border2)'}`, background: '#fff', fontSize: 12, cursor: 'pointer', color: isAbnormal ? '#dc2626' : 'var(--text)' }}>
                  <option value="">—</option>
                  {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )
          })}
        </div>
      </div>

      {/* ECG */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>ผล ECG / คลื่นหัวใจ (ถ้ามี)</div>
        <textarea value={ecgNote} onChange={e => setEcgNote(e.target.value)}
          placeholder="เช่น Sinus rhythm, HR 72 bpm, no ST change / Atrial fibrillation HR 88..."
          rows={2}
          style={{ width: '100%', padding: '9px 11px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 'var(--rs)', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = '#8b5cf6'}
          onBlur={e => e.target.style.borderColor = ''}
        />
      </div>

      {/* หมายเหตุเพิ่มเติม */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>หมายเหตุ / ข้อสังเกตเพิ่มเติม</div>
        <textarea value={extraNote} onChange={e => setExtraNote(e.target.value)}
          placeholder="ข้อสังเกตอื่นๆ จากการตรวจ..."
          rows={2}
          style={{ width: '100%', padding: '9px 11px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 'var(--rs)', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = '#8b5cf6'}
          onBlur={e => e.target.style.borderColor = ''}
        />
      </div>

      <button className={styles.btnP} style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', marginTop: 4 }} onClick={handleLabSave}>
        บันทึกผลการตรวจ
      </button>
    </div>
  )
}

// ── BP Section ───────────────────────────────────────────────────────────────
function BPSection({
  patient, doctorName, userRole, onNewVisit, onLabSaved, selDoctor, onDoctorChange,
}: {
  patient: CardioPatient
  doctorName: string
  userRole: UserRole
  onNewVisit: (v: BPVisit | null) => void
  onLabSaved?: (labs: Partial<PatientLab>) => void
  selDoctor: string
  onDoctorChange: (d: string) => void
}) {
  const lastVisit   = patient.visits[patient.visits.length - 1]
  const alreadyToday = isToday(lastVisit.date)

  const DOCTORS = ['นพ. วิชาญ สุขใจ', 'พญ. สมหญิง รักษาดี', 'นพ. ทวีศักดิ์ มีโชค']

  const [mode,      setMode]      = useState<'auto' | 'manual'>('auto')
  const [sbp,       setSbp]       = useState('')
  const [dbp,       setDbp]       = useState('')
  const [hr,        setHr]        = useState('')
  const [wt,        setWt]        = useState(String(lastVisit.weight))
  const [note,      setNote]      = useState('')
  const [err,       setErr]       = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [dbStatus,  setDbStatus]  = useState<'idle'|'ok'|'warn'>('idle')

  // พยาบาล/เทคนิคการแพทย์: ถ้าวัดแล้ววันนี้จะเห็นเป็น read-only ด้วย
  if (alreadyToday) {
    return (
      <div style={{
        background: 'rgba(0,184,148,.04)', border: '1.5px solid rgba(0,168,114,.25)',
        borderRadius: 'var(--r)', padding: '18px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#00a872', display: 'inline-block' }} />
          <span style={{ fontWeight: 700, color: '#007d60' }}>วัดค่าความดันวันนี้แล้ว</span>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>
            {new Date(lastVisit.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { l: 'SBP', v: lastVisit.sbp,       u: 'mmHg', hi: lastVisit.sbp > 140 },
            { l: 'DBP', v: lastVisit.dbp,       u: 'mmHg', hi: lastVisit.dbp > 90 },
            { l: 'HR',  v: lastVisit.heartRate, u: 'bpm',  hi: lastVisit.heartRate < 55 },
            { l: 'น้ำหนัก', v: lastVisit.weight, u: 'kg', hi: false },
          ].map(({ l, v, u, hi }) => (
            <div key={l} style={{ background: '#fff', borderRadius: 'var(--rs)', padding: '12px', textAlign: 'center', border: `1px solid ${hi ? 'rgba(220,38,38,.25)' : 'var(--border)'}` }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--mono)', color: hi ? 'var(--danger)' : 'var(--accent)' }}>{v}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{l} ({u})</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>
          ข้อมูลความดันวันนี้ถูกบันทึกแล้ว — ไม่สามารถแก้ไขได้
        </div>
      </div>
    )
  }

  if (userRole === 'medtech') {
    return <LabEntrySection patient={patient} onLabSaved={onLabSaved} />
  }

  if (saved) {
    const s = parseInt(sbp), d = parseInt(dbp), h = parseInt(hr)
    return (
      <div style={{ background: 'rgba(0,184,148,.04)', border: '1.5px solid rgba(0,168,114,.25)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
        <div style={{ fontWeight: 700, color: '#007d60', marginBottom: 12 }}>
          บันทึกค่าความดันวันนี้แล้ว
          {hasSupabaseEnv && <span style={{ marginLeft: 10, fontSize: 11, fontFamily: 'var(--mono)', color: dbStatus === 'ok' ? '#007d60' : '#9a6700' }}>
            {dbStatus === 'ok' ? '(Supabase)' : '(Session)'}
          </span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[['SBP', s, 'mmHg', s > 140], ['DBP', d, 'mmHg', d > 90], ['HR', h, 'bpm', h < 55], ['น้ำหนัก', parseFloat(wt)||lastVisit.weight, 'kg', false]].map(([l, v, u, hi]) => (
            <div key={String(l)} style={{ background: '#fff', borderRadius: 'var(--rs)', padding: '10px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--mono)', color: hi ? 'var(--danger)' : 'var(--accent)' }}>{v}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{l} ({u})</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const handleSave = async () => {
    const s = parseInt(sbp), d = parseInt(dbp), h = parseInt(hr), w = parseFloat(wt)
    if (!s || !d || !h) { setErr('กรุณากรอก SBP, DBP และ Heart Rate'); return }
    if (s < 60 || s > 250) { setErr('SBP ไม่อยู่ในช่วงที่เป็นไปได้ (60–250)'); return }
    if (d < 40 || d > 160) { setErr('DBP ไม่อยู่ในช่วงที่เป็นไปได้ (40–160)'); return }
    if (h < 30 || h > 200) { setErr('Heart Rate ไม่อยู่ในช่วงที่เป็นไปได้'); return }

    const today = new Date().toISOString().split('T')[0]
    const weight = w || lastVisit.weight
    const bmi    = w ? parseFloat((w / (1.65 ** 2)).toFixed(1)) : lastVisit.bmi
    const newVisit: BPVisit = { date: today, sbp: s, dbp: d, heartRate: h, weight, bmi, note: note.trim() || undefined, recordedBy: doctorName }

    setSaving(true); setErr('')
    if (hasSupabaseEnv && patient.dbId) {
      const result = await saveVisit(patient.dbId, newVisit, doctorName)
      setDbStatus(result.success ? 'ok' : 'warn')
    }
    setSaving(false); onNewVisit(newVisit); setSaved(true)
  }

  // เปรียบเทียบค่าล่าสุดจาก history
  const historyAvg = patient.visits.length >= 3
    ? Math.round(patient.visits.slice(-3).reduce((s, v) => s + v.sbp, 0) / 3)
    : null

  return (
    <div style={{ background: 'rgba(217,119,6,.04)', border: '1.5px solid rgba(217,119,6,.2)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
      {/* Doctor selection (nurse only, optional) */}
      {userRole === 'nurse' && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }}>
            แพทย์ผู้ดูแล <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(ถ้าเลือก — แพทย์คนนั้นจะรับผิดชอบเคสนี้)</span>
          </label>
          <select value={selDoctor} onChange={e => onDoctorChange(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', background: '#fff', border: `1.5px solid ${selDoctor ? '#3b82f6' : 'var(--border2)'}`, borderRadius: 'var(--rs)', fontSize: 13, cursor: 'pointer', color: 'var(--text)' }}>
            <option value="">— ไม่ระบุ (ผู้บันทึกล่าสุดเป็นผู้ดูแล) —</option>
            {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {selDoctor && <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 3 }}>แพทย์ {selDoctor} จะเป็นผู้รับผิดชอบเคสนี้</div>}
        </div>
      )}

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <span style={{ fontWeight: 700, color: 'var(--warn)', fontSize: 14, alignSelf: 'center', flex: 1 }}>
          กรอกค่าความดันวันนี้
          {userRole === 'nurse' && <span style={{ fontSize: 11, color: '#3b82f6', marginLeft: 8, fontFamily: 'var(--mono)' }}>[พยาบาล]</span>}
        </span>
        <button
          onClick={() => setMode('auto')}
          style={{
            fontSize: 11, padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
            background: mode === 'auto' ? 'rgba(0,168,114,.1)' : 'transparent',
            border: `1.5px solid ${mode === 'auto' ? 'var(--accent)' : 'var(--border2)'}`,
            color: mode === 'auto' ? 'var(--accent)' : 'var(--text3)',
          }}
        >ดึงค่าล่าสุด</button>
        <button
          onClick={() => setMode('manual')}
          style={{
            fontSize: 11, padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
            background: mode === 'manual' ? 'rgba(217,119,6,.1)' : 'transparent',
            border: `1.5px solid ${mode === 'manual' ? 'var(--warn)' : 'var(--border2)'}`,
            color: mode === 'manual' ? 'var(--warn)' : 'var(--text3)',
          }}
        >กรอกเอง</button>
      </div>

      {/* Auto mode: แสดงค่าล่าสุดจาก history เป็น hint */}
      {mode === 'auto' && historyAvg && (
        <div style={{
          background: 'rgba(59,130,246,.05)', border: '1px solid rgba(59,130,246,.2)',
          borderRadius: 'var(--rs)', padding: '10px 14px', marginBottom: 14, fontSize: 12,
        }}>
          <strong style={{ color: '#3b82f6' }}>ข้อมูลจาก 3 visit ล่าสุด:</strong>
          {' '}SBP เฉลี่ย {historyAvg} mmHg ·{' '}
          DBP เฉลี่ย {Math.round(patient.visits.slice(-3).reduce((s, v) => s + v.dbp, 0) / 3)} mmHg ·{' '}
          HR เฉลี่ย {Math.round(patient.visits.slice(-3).reduce((s, v) => s + v.heartRate, 0) / 3)} bpm
          <br />
          <span style={{ color: 'var(--text3)' }}>กรุณาวัดใหม่วันนี้และกรอกค่าจริงด้านล่าง</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        {[
          { l: 'SBP (mmHg)*', val: sbp, set: setSbp, ph: historyAvg ? String(historyAvg) : '120' },
          { l: 'DBP (mmHg)*', val: dbp, set: setDbp, ph: '80' },
          { l: 'HR (bpm)*',   val: hr,  set: setHr,  ph: '72' },
          { l: 'น้ำหนัก (kg)', val: wt, set: setWt, ph: String(lastVisit.weight) },
        ].map(({ l, val, set, ph }) => (
          <div key={l}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 5, fontWeight: 600 }}>{l}</label>
            <input
              type="number" value={val}
              onChange={e => set(e.target.value)} placeholder={ph}
              style={{
                width: '100%', padding: '10px 12px',
                background: '#fff', border: '1.5px solid var(--border2)',
                borderRadius: 'var(--rs)', color: 'var(--text)',
                fontFamily: 'var(--mono)', fontSize: 15, outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = ''}
            />
          </div>
        ))}
      </div>
      {/* หมายเหตุ */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 5, fontWeight: 600 }}>หมายเหตุการกรอกความดัน (ถ้ามี)</label>
        <input
          type="text" value={note} onChange={e => setNote(e.target.value)}
          placeholder="เช่น ผู้ป่วยมีอาการเจ็บหน้าอก, วัดซ้ำ 2 ครั้ง..."
          style={{ width: '100%', padding: '10px 12px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 'var(--rs)', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = ''}
        />
      </div>
      {err && <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 10 }}>{err}</div>}
      <button className={styles.btnP} onClick={handleSave} disabled={saving}>
        {saving ? 'กำลังบันทึก...' : 'บันทึกค่าความดัน'}
      </button>
    </div>
  )
}

// ── Visit History ─────────────────────────────────────────────────────────────
function VisitHistory({ visits, defaultExpanded }: { visits: CardioPatient['visits']; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false)
  const shown = expanded
    ? visits
    : visits.length <= 2
      ? visits
      : [visits[0], visits[visits.length - 1]]
  const fmt = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  return (
    <div>
      {[...shown].reverse().map((v, i) => (
        <div key={i} style={{ marginBottom: v.note ? 2 : 6 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px',
            background: isToday(v.date) ? 'rgba(0,184,148,.05)' : 'var(--bg3)',
            border: `1px solid ${isToday(v.date) ? 'rgba(0,168,114,.3)' : 'var(--border)'}`,
            borderRadius: v.note ? 'var(--rs) var(--rs) 0 0' : 'var(--rs)', fontSize: 13,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: v.sbp > 160 ? '#dc2626' : v.sbp > 140 ? '#d97706' : '#00b894', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', width: 80, flexShrink: 0 }}>
              {fmt(v.date)}{isToday(v.date) ? ' *' : ''}
            </span>
            <span style={{ fontWeight: 700, color: v.sbp > 140 ? 'var(--warn)' : 'var(--text)' }}>
              {v.sbp}/{v.dbp}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>mmHg</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text2)' }}>HR {v.heartRate} · {v.weight} kg</span>
            {v.recordedBy && <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginLeft: 6 }}>by {v.recordedBy}</span>}
          </div>
          {v.note && (
            <div style={{ fontSize: 11, color: '#92400e', background: 'rgba(217,119,6,.07)', border: '1px solid rgba(217,119,6,.2)', borderTop: 'none', borderRadius: '0 0 var(--rs) var(--rs)', padding: '5px 14px', marginBottom: 6 }}>
              หมายเหตุ: {v.note}
            </div>
          )}
        </div>
      ))}
      {visits.length > 2 && (
        <button onClick={() => setExpanded(!expanded)} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
          {expanded ? '▲ ซ่อนข้อมูลเก่า' : `▼ ดูทั้งหมด ${visits.length} ครั้ง`}
        </button>
      )}
    </div>
  )
}

// ── Doctor Records ────────────────────────────────────────────────────────────
function DoctorRecordsSection({ records }: { records: DoctorRecord[] }) {
  const [expanded, setExpanded] = useState(false)
  const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const shown = expanded ? sorted : sorted.slice(-2)
  const REC_COLOR: Record<string, string> = {
    INTENSIFY: '#ef4444', URGENT_REVIEW: '#dc2626',
    REDUCE: '#f59e0b', CONTINUE: '#00a872', MONITOR: '#6b7280', SWITCH: '#8b5cf6',
  }
  const REC_TH: Record<string, string> = {
    INTENSIFY: 'เพิ่มยา', URGENT_REVIEW: 'เร่งด่วน',
    REDUCE: 'ลดยา', CONTINUE: 'คงยาเดิม', MONITOR: 'ติดตาม', SWITCH: 'เปลี่ยนยา',
  }
  const fmt = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })

  return (
    <div>
      {shown.map((r, i) => (
        <div key={i} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '12px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)', width: 76, flexShrink: 0 }}>{fmt(r.date)}</span>
            <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{r.doctorName}</span>
            {r.recommendation && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)', fontWeight: 700,
                background: `${REC_COLOR[r.recommendation] ?? '#6b7280'}15`,
                color: REC_COLOR[r.recommendation] ?? '#6b7280',
                border: `1px solid ${REC_COLOR[r.recommendation] ?? '#6b7280'}40`,
              }}>{REC_TH[r.recommendation] ?? r.recommendation}</span>
            )}
            {r.refId && <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{r.refId}</span>}
          </div>
          {r.notes && <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.7, marginBottom: 4 }}>{r.notes}</div>}
          {r.nextApptDate && (
            <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
              นัดครั้งต่อไป: {new Date(r.nextApptDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
              {r.nextApptNote && <span style={{ color: 'var(--text3)' }}> — {r.nextApptNote}</span>}
            </div>
          )}
        </div>
      ))}
      {sorted.length > 2 && (
        <button onClick={() => setExpanded(!expanded)} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
          {expanded ? '▲ ซ่อน' : `▼ ดูทั้งหมด ${sorted.length} บันทึก`}
        </button>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PatientDetailPage({
  patient, doctorName, userRole, onBack, onNext, onNurseDone, onNurseNext,
}: {
  patient: CardioPatient
  doctorName: string
  userRole: UserRole
  onBack: () => void
  onNext: (newVisit: BPVisit | null) => void
  onNurseDone?: () => void
  onNurseNext?: (newVisit: BPVisit, selectedDoctor: string) => void
}) {
  const [newVisit,      setNewVisit]      = useState<BPVisit | null>(null)
  const [savedLabs,     setSavedLabs]     = useState<Partial<PatientLab> | null>(null)
  const [nurseSelDoctor, setNurseSelDoctor] = useState(patient.treatingDoctor ?? '')
  const lastV = patient.visits[patient.visits.length - 1]
  const hasComorbidities = Object.values(patient.comorbidities).some(Boolean)

  const handleLabSaved = (labs: Partial<PatientLab>) => setSavedLabs(labs)

  return (
    <div>
      <div className={styles.stepHdr}>
        <span className={styles.stepNum}>02 / 05</span>
        <h1 className={styles.stepTitle}>ข้อมูลผู้ป่วย</h1>
      </div>
      <p className={styles.stepDesc}>ข้อมูลพื้นฐาน ประวัติการรักษา และบันทึกค่าความดัน</p>

      {/* Patient Card */}
      <div style={{
        background: 'var(--bg2)', border: '1.5px solid var(--border2)',
        borderRadius: 'var(--r)', padding: '22px', marginBottom: 16,
        boxShadow: '0 2px 12px rgba(0,160,114,.06)',
      }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <PatientAvatar patient={patient} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{patient.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
              อายุ <strong>{patient.age}</strong> ปี · เพศ{patient.sex}
              {patient.treatingDoctor && <> · แพทย์ผู้ดูแล: <strong>{patient.treatingDoctor}</strong></>}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
              รหัสผู้ป่วย: {patient.id}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <span className={[styles.riskBadge, styles.riskLow].join(' ')}>
                {patient.medications.length} กลุ่มยา
              </span>
              <span className={[styles.riskBadge, styles.riskModerate].join(' ')}>
                {patient.visits.length} visits
              </span>
              {hasComorbidities && (
                <span className={[styles.riskBadge, styles.riskHigh].join(' ')}>มีโรคร่วม</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className={styles.detailGrid} style={{ marginBottom: 16 }}>
        {[
          { l: 'BMI', v: `${lastV.bmi}`, warn: lastV.bmi >= 25 },
          { l: 'HbA1c', v: `${patient.labs.hba1c ?? '-'}%`, warn: (patient.labs.hba1c ?? 0) > 7.5 },
          { l: 'eGFR', v: `${patient.labs.egfr ?? '-'}`, warn: (patient.labs.egfr ?? 100) < 60 },
          { l: 'LDL', v: `${patient.labs.ldl ?? '-'} mg/dL`, warn: (patient.labs.ldl ?? 0) > 130 },
          { l: 'Creatinine', v: `${patient.labs.creatinine ?? '-'} mg/dL`, warn: (patient.labs.creatinine ?? 0) > 1.3 },
          { l: 'Potassium', v: `${patient.labs.potassium ?? '-'} mEq/L`, warn: (patient.labs.potassium ?? 0) > 5.0 },
        ].map(({ l, v, warn }) => (
          <div key={l} className={styles.detailBox}>
            <div className={styles.detailLabel}>{l}</div>
            <div className={[styles.detailValue, warn ? styles.detailWarn : ''].join(' ')}>{v}</div>
          </div>
        ))}
      </div>

      {/* Comorbidities */}
      <div className={styles.lbl}>โรคร่วม</div>
      <div className={styles.comorbRow} style={{ marginBottom: 16 }}>
        {!hasComorbidities && (
          <span className={[styles.comorbTag, styles.comorbNone].join(' ')}>ไม่มีโรคร่วมสำคัญ</span>
        )}
        {Object.entries(patient.comorbidities).map(([k, v]) =>
          v ? <span key={k} className={styles.comorbTag}>{COMORBIDITY_LABEL[k]}</span> : null
        )}
      </div>

      {/* Medications */}
      <div className={styles.lbl}>ยาที่ใช้อยู่ปัจจุบัน</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {patient.medications.map((m, i) => (
          <div key={i} style={{
            background: 'var(--bg3)', border: `1.5px solid ${DRUG_COLOR[m.drugClass] ?? '#999'}40`,
            borderRadius: 'var(--rs)', padding: '10px 14px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: DRUG_COLOR[m.drugClass] ?? '#999', fontFamily: 'var(--mono)', marginBottom: 2 }}>{m.drugClass}</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{m.drugName}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{m.dose} · {m.frequency}</div>
          </div>
        ))}
      </div>

      <div className={styles.divider} />

      {/* BP / Lab Today */}
      <div className={styles.lbl} style={{ marginBottom: 10 }}>
        {userRole === 'medtech' ? 'บันทึกผลการตรวจทางห้องปฏิบัติการ' : 'ค่าความดันโลหิต'}
      </div>
      <BPSection patient={patient} doctorName={doctorName} userRole={userRole} onNewVisit={setNewVisit} onLabSaved={handleLabSaved} selDoctor={nurseSelDoctor} onDoctorChange={setNurseSelDoctor} />

      <div className={styles.divider} />

      {/* Doctor Records */}
      {(patient.doctorRecords?.length ?? 0) > 0 && (
        <>
          <div className={styles.lbl} style={{ marginBottom: 10 }}>บันทึกจากแพทย์ (ครั้งก่อนๆ)</div>
          <DoctorRecordsSection records={patient.doctorRecords!} />
          <div className={styles.divider} />
        </>
      )}

      {/* Clinical Notes */}
      {patient.clinicalNotes && !(patient.doctorRecords?.length) && (
        <>
          <div className={styles.lbl}>หมายเหตุแพทย์</div>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.7, marginBottom: 14 }}>
            {patient.clinicalNotes}
          </div>
          <div className={styles.divider} />
        </>
      )}

      {/* Visit History */}
      <div className={styles.lbl} style={{ marginBottom: 10 }}>
        ประวัติการรักษา (Visit History)
        {userRole === 'nurse' && <span style={{ fontSize: 11, color: '#3b82f6', marginLeft: 8, fontFamily: 'var(--mono)' }}>— รวมหมายเหตุครั้งก่อนๆ</span>}
      </div>
      <VisitHistory visits={patient.visits} defaultExpanded={userRole === 'nurse'} />

      <div className={styles.btnRow}>
        <button className={styles.btnS} onClick={onBack}>← กลับ</button>
        {userRole === 'medtech' ? (
          <button
            className={styles.btnP}
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}
            onClick={() => onNext(null)}
          >
            ดู BP Trend →
          </button>
        ) : userRole === 'nurse' ? (
          <>
            <button
              className={styles.btnS}
              style={{ opacity: newVisit ? 1 : 0.5 }}
              onClick={() => newVisit ? onNurseDone?.() : undefined}
              disabled={!newVisit}
              title={!newVisit ? 'กรุณาบันทึกค่าความดันก่อน' : undefined}
            >
              บันทึกและเสร็จสิ้น ✓
            </button>
            <button
              className={styles.btnP}
              style={{ background: newVisit ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : undefined, opacity: newVisit ? 1 : 0.5 }}
              onClick={() => newVisit ? onNurseNext?.(newVisit, nurseSelDoctor) : undefined}
              disabled={!newVisit}
              title={!newVisit ? 'กรุณาบันทึกค่าความดันก่อน' : undefined}
            >
              ดู BP Trend →
            </button>
          </>
        ) : (
          <button className={styles.btnP} onClick={() => onNext(newVisit)}>
            ดู BP Trend →
          </button>
        )}
      </div>
    </div>
  )
}
