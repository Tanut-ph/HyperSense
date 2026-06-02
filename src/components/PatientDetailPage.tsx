'use client'
import { useState, useEffect } from 'react'
import type { CardioPatient, BPVisit, UserRole, MLRiskPrediction } from '@/lib/types'
import { runMLSimilarityAsync } from '@/lib/mlEngine'
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

const SEV_COLOR = { low: '#00a872', moderate: '#d97706', high: '#dc2626' }
const SEV_BG    = { low: 'rgba(0,168,114,.08)', moderate: 'rgba(217,119,6,.08)', high: 'rgba(220,38,38,.08)' }
const SEV_BORDER = { low: 'rgba(0,168,114,.25)', moderate: 'rgba(217,119,6,.25)', high: 'rgba(220,38,38,.3)' }

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

// ── ML Similarity Panel ─────────────────────────────────────────────────────
function MLPanel({ patient }: { patient: CardioPatient }) {
  const [predictions, setPredictions] = useState<MLRiskPrediction[]>([])
  const [loading,     setLoading]     = useState(true)
  const [source,      setSource]      = useState<'api' | 'fallback'>('fallback')

  useEffect(() => {
    setLoading(true)
    runMLSimilarityAsync(patient).then(results => {
      // ตรวจสอบว่าได้จาก API จริง (มี SHAP basis) หรือ fallback
      const fromAPI = results.some(r => r.basis[0]?.includes('SHAP'))
      setSource(fromAPI ? 'api' : 'fallback')
      setPredictions(results)
      setLoading(false)
    })
  }, [patient.id])

  if (loading) {
    return (
      <div style={{
        background: 'rgba(59,130,246,.03)', border: '1.5px solid rgba(59,130,246,.15)',
        borderRadius: 'var(--r)', padding: '16px 18px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)', fontSize: 13,
      }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #3b82f6', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        กำลังวิเคราะห์ความเสี่ยงจาก ML...
      </div>
    )
  }

  if (predictions.length === 0) return null

  return (
    <div style={{
      background: 'rgba(59,130,246,.03)', border: '1.5px solid rgba(59,130,246,.2)',
      borderRadius: 'var(--r)', padding: '16px 18px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: source === 'api' ? '#00a872' : '#3b82f6', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', fontFamily: 'var(--mono)', letterSpacing: '.06em' }}>
          ML RISK ANALYSIS
        </span>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 20,
          background: source === 'api' ? 'rgba(0,168,114,.1)' : 'rgba(107,114,128,.1)',
          color: source === 'api' ? '#00a872' : '#6b7280',
          border: `1px solid ${source === 'api' ? 'rgba(0,168,114,.3)' : 'rgba(107,114,128,.2)'}`,
          fontFamily: 'var(--mono)', fontWeight: 600,
        }}>
          {source === 'api' ? 'XGBoost + SHAP' : 'Rule-based'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {predictions.map((p, i) => (
          <div key={i} style={{
            background: SEV_BG[p.severity], border: `1.5px solid ${SEV_BORDER[p.severity]}`,
            borderRadius: 'var(--rs)', padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{p.condition}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 80, height: 6, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${p.probability}%`, height: '100%', background: SEV_COLOR[p.severity], borderRadius: 3 }} />
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: SEV_COLOR[p.severity] }}>
                  {p.probability}%
                </span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.7 }}>
              {p.basis.slice(0, 3).map((b, bi) => (
                <div key={bi} style={{ fontFamily: 'var(--mono)' }}>{b}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
        {source === 'api'
          ? 'XGBoost trained บน dataset จริง · SHAP explainability'
          : 'Rule-based fallback — รัน python train.py เพื่อใช้ XGBoost จริง'}
      </div>
    </div>
  )
}

// ── BP Section ───────────────────────────────────────────────────────────────
function BPSection({
  patient, doctorName, userRole, onNewVisit,
}: {
  patient: CardioPatient
  doctorName: string
  userRole: UserRole
  onNewVisit: (v: BPVisit | null) => void
}) {
  const lastVisit   = patient.visits[patient.visits.length - 1]
  const alreadyToday = isToday(lastVisit.date)

  const [mode,    setMode]    = useState<'auto' | 'manual'>('auto')
  const [sbp,     setSbp]     = useState('')
  const [dbp,     setDbp]     = useState('')
  const [hr,      setHr]      = useState('')
  const [wt,      setWt]      = useState(String(lastVisit.weight))
  const [err,     setErr]     = useState('')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [dbStatus,setDbStatus]= useState<'idle'|'ok'|'warn'>('idle')

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

  // ถ้า role ไม่ใช่ doctor หรือ nurse ก็ไม่ให้กรอก BP
  if (userRole === 'medtech') {
    return (
      <div style={{
        background: 'rgba(139,92,246,.04)', border: '1.5px solid rgba(139,92,246,.2)',
        borderRadius: 'var(--r)', padding: '14px 18px', fontSize: 13, color: 'var(--text2)',
      }}>
        บทบาทเทคนิคการแพทย์ไม่มีสิทธิ์กรอกค่าความดัน — ข้อมูลยังไม่ได้บันทึกวันนี้
      </div>
    )
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
    const newVisit: BPVisit = { date: today, sbp: s, dbp: d, heartRate: h, weight, bmi }

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
      {err && <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 10 }}>{err}</div>}
      <button className={styles.btnP} onClick={handleSave} disabled={saving}>
        {saving ? 'กำลังบันทึก...' : 'บันทึกค่าความดัน'}
      </button>
    </div>
  )
}

// ── Visit History ─────────────────────────────────────────────────────────────
function VisitHistory({ visits }: { visits: CardioPatient['visits'] }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? visits : visits.slice(-3)
  const fmt = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  return (
    <div>
      {[...shown].reverse().map((v, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', marginBottom: 6,
          background: isToday(v.date) ? 'rgba(0,184,148,.05)' : 'var(--bg3)',
          border: `1px solid ${isToday(v.date) ? 'rgba(0,168,114,.3)' : 'var(--border)'}`,
          borderRadius: 'var(--rs)', fontSize: 13,
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
        </div>
      ))}
      {visits.length > 3 && (
        <button onClick={() => setExpanded(!expanded)} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
          {expanded ? '▲ ซ่อนข้อมูลเก่า' : `▼ ดูทั้งหมด ${visits.length} ครั้ง`}
        </button>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PatientDetailPage({
  patient, doctorName, userRole, onBack, onNext,
}: {
  patient: CardioPatient
  doctorName: string
  userRole: UserRole
  onBack: () => void
  onNext: (newVisit: BPVisit | null) => void
}) {
  const [newVisit, setNewVisit] = useState<BPVisit | null>(null)
  const lastV = patient.visits[patient.visits.length - 1]
  const hasComorbidities = Object.values(patient.comorbidities).some(Boolean)

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

      {/* ML Panel */}
      <div className={styles.lbl} style={{ marginBottom: 10 }}>การวิเคราะห์ความเสี่ยงจาก ML (ข้อมูลในอดีต)</div>
      <MLPanel patient={patient} />

      <div className={styles.divider} />

      {/* BP Today */}
      <div className={styles.lbl} style={{ marginBottom: 10 }}>ค่าความดันโลหิต</div>
      <BPSection patient={patient} doctorName={doctorName} userRole={userRole} onNewVisit={setNewVisit} />

      <div className={styles.divider} />

      {/* Visit History */}
      <div className={styles.lbl} style={{ marginBottom: 10 }}>ประวัติการรักษา (Visit History)</div>
      <VisitHistory visits={patient.visits} />

      {patient.clinicalNotes && (
        <>
          <div className={styles.divider} />
          <div className={styles.lbl}>หมายเหตุแพทย์</div>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
            {patient.clinicalNotes}
          </div>
        </>
      )}

      <div className={styles.btnRow}>
        <button className={styles.btnS} onClick={onBack}>← กลับ</button>
        <button className={styles.btnP} onClick={() => onNext(newVisit)}>
          ดู BP Trend →
        </button>
      </div>
    </div>
  )
}
