'use client'
import { useState } from 'react'
import type { CardioPatient, BPVisit, UserRole, PatientLab, DoctorRecord, PatientProfile, SmokingStatus, AlcoholStatus } from '@/lib/types'
import { saveVisit, saveLab, savePatientHistory, hasSupabaseEnv } from '@/lib/supabaseData'

import { drugColor, drugLabel } from '@/lib/medicationGuide'
import styles from './HyperSense.module.css'

/** คืน string ที่ clamp ไม่ให้ติดลบ (ใช้กับ onChange ของ type="number" ทุกช่อง) */
const nn = (v: string) => v === '' ? '' : String(Math.max(0, Number(v)))

function isToday(dateStr: string) {
  const t = new Date(); const d = new Date(dateStr)
  return d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

const COMORBIDITY_LABEL: Record<string, string> = {
  diabetes: 'เบาหวาน (DM)', ckd: 'โรคไตเรื้อรัง (CKD)',
  cad: 'หลอดเลือดหัวใจ (CAD)', heartFailure: 'หัวใจล้มเหลว (HF)',
  stroke: 'หลอดเลือดสมอง (Stroke)', pad: 'หลอดเลือดส่วนปลาย (PAD)',
  plaque: 'พบ Plaque', af: 'AF (หัวใจห้องบนสั่นพลิ้ว)',
  arrhythmias: 'หัวใจเต้นผิดจังหวะ', dementia: 'สมองเสื่อม', dyslipidemia: 'ไขมันในเลือดผิดปกติ',
}

const SMOKING_TH: Record<string, string> = { never: 'ไม่สูบ', former: 'เคยสูบ (เลิกแล้ว)', current: 'สูบอยู่' }
const ALCOHOL_TH: Record<string, string> = { never: 'ไม่ดื่ม', occasional: 'ดื่มเป็นครั้งคราว', regular: 'ดื่มประจำ', heavy: 'ดื่มหนัก' }

function PatientAvatar({ patient }: { patient: CardioPatient }) {
  const colors = [['#00a872','#00b5a0'], ['#8b5cf6','#6366f1'], ['#f59e0b','#d97706'], ['#3b82f6','#2563eb'], ['#dc2626','#b91c1c']]
  const [c1, c2] = colors[parseInt(patient.id) % colors.length] ?? colors[0]
  return (
    <div style={{
      width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 28, fontWeight: 700, color: '#fff',
      border: '3px solid rgba(255,255,255,.5)', boxShadow: `0 4px 16px ${c1}44`,
    }}>
      {patient.name.charAt(3) || '?'}
    </div>
  )
}

// ── ประวัติ / ข้อมูลซักถามสำคัญ (ประกอบการตัดสินใจของแพทย์) ───────────────────
function PatientHistoryCard({ patient }: { patient: CardioPatient }) {
  const p = patient.profile
  const lastV = patient.visits[patient.visits.length - 1]
  const ascvd = [
    patient.comorbidities.cad && 'หลอดเลือดหัวใจตีบ (CAD)',
    patient.comorbidities.stroke && 'หลอดเลือดสมองตีบ/TIA',
    patient.comorbidities.pad && 'หลอดเลือดส่วนปลายตีบ (PAD)',
    patient.comorbidities.plaque && 'พบ Plaque',
  ].filter(Boolean) as string[]

  const fmtDuration = (y?: number, m?: number, d?: number): string | undefined => {
    const parts: string[] = []
    if (y) parts.push(`${y} ปี`)
    if (m) parts.push(`${m} เดือน`)
    if (d) parts.push(`${d} วัน`)
    return parts.length ? parts.join(' ') : undefined
  }

  const rows: [string, string | undefined][] = [
    ['ความดันสูงมานาน', fmtDuration(p?.htDurationYears, p?.htDurationMonths, p?.htDurationDays)],
    ['เบาหวาน', patient.comorbidities.diabetes
      ? [p?.dmType, p?.dmDiagnosisYear ? `วินิจฉัยปี ${p.dmDiagnosisYear}` : null, p?.dmDurationYears != null ? `${p.dmDurationYears} ปี` : null].filter(Boolean).join(' · ') || 'มี'
      : undefined],
    ['ไขมันในเลือดผิดปกติ', patient.comorbidities.dyslipidemia ? 'มี' : undefined],
    ['โรคไตเรื้อรัง (CKD)', patient.comorbidities.ckd ? (p?.ckdDurationYears != null ? `${p.ckdDurationYears} ปี` : 'มี') : undefined],
    ['ASCVD (หลอดเลือดแดงแข็ง)', ascvd.length ? ascvd.join(', ') : undefined],
    ['ส่วนสูง', p?.heightCm ? `${p.heightCm} ซม.` : undefined],
    ['น้ำหนัก', lastV ? `${lastV.weight} กก.` : undefined],
    ['BMI', lastV ? `${lastV.bmi}` : undefined],
    ['เส้นรอบเอว', p?.waistCm ? `${p.waistCm} ซม.` : undefined],
    ['อ้วนลงพุง', p?.centralObesity ? 'ใช่' : undefined],
    ['สูบบุหรี่', p?.smokingStatus
      ? `${SMOKING_TH[p.smokingStatus]}${fmtDuration(p.smokingYears, p.smokingMonths, p.smokingDays) ? ` (${fmtDuration(p.smokingYears, p.smokingMonths, p.smokingDays)})` : ''}`
      : undefined],
    ['ดื่มแอลกอฮอล์', p?.alcohol ? ALCOHOL_TH[p.alcohol] : undefined],
  ]
  const filled = rows.filter(([, v]) => v)

  const flags: { text: string; level: 'danger' | 'warn' }[] = []
  if (p?.pregnant) flags.push({ text: 'ตั้งครรภ์ — เลี่ยงยา ACEI/ARB/ARNI', level: 'danger' })
  if (p?.recentSurgery) flags.push({ text: `ผ่าตัด/หัตถการ: ${p.recentSurgery}`, level: 'warn' })
  if (p?.smokingStatus === 'current') flags.push({ text: 'สูบบุหรี่อยู่', level: 'warn' })
  if (p?.alcohol === 'heavy' || p?.alcohol === 'regular') flags.push({ text: 'ดื่มแอลกอฮอล์ประจำ', level: 'warn' })

  const isEmpty = filled.length === 0 && flags.length === 0 && !p?.importantNotes

  return (
    <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border2)', borderRadius: 'var(--r)', padding: '16px 18px', marginBottom: 16 }}>
      <div className={styles.lbl} style={{ marginBottom: 10 }}>ประวัติและข้อมูลสำคัญ (ประกอบการตัดสินใจ)</div>

      {flags.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {flags.map((f, i) => (
            <span key={i} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: f.level === 'danger' ? 'rgba(220,38,38,.1)' : 'rgba(217,119,6,.1)',
              border: `1px solid ${f.level === 'danger' ? 'rgba(220,38,38,.35)' : 'rgba(217,119,6,.35)'}`,
              color: f.level === 'danger' ? '#dc2626' : '#b45309',
            }}>{f.text}</span>
          ))}
        </div>
      )}

      {filled.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px 18px' }}>
          {filled.map(([k, v]) => (
            <div key={k} style={{ fontSize: 12.5, display: 'flex', justifyContent: 'space-between', gap: 8, borderBottom: '1px dashed var(--border)', paddingBottom: 3 }}>
              <span style={{ color: 'var(--text3)' }}>{k}</span>
              <span style={{ color: 'var(--text)', fontWeight: 600, textAlign: 'right' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
      {isEmpty && (
        <div style={{ fontSize: 12.5, color: 'var(--text3)', fontStyle: 'italic' }}>
          ยังไม่มีข้อมูลซักประวัติเพิ่มเติม — แนะนำให้ซักประวัติ (ระยะเวลาเป็นโรค, ASCVD, สูบบุหรี่/ดื่มเหล้า, ตั้งครรภ์ ฯลฯ) และบันทึกในระบบ
        </div>
      )}

      {p?.importantNotes && (
        <div style={{ marginTop: 12, background: 'rgba(59,130,246,.05)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 'var(--rs)', padding: '10px 12px', fontSize: 12.5, color: 'var(--text)', lineHeight: 1.7 }}>
          <strong style={{ color: '#1d4ed8' }}>หมายเหตุสำคัญ:</strong> {p.importantNotes}
        </div>
      )}
    </div>
  )
}

// ── History Entry (nurse) — ซักประวัติผู้ป่วยใหม่ ────────────────────────────
function HistoryEntrySection({
  patient,
  onSaved,
}: {
  patient: CardioPatient
  onSaved?: (profile: Partial<PatientProfile>) => void
}) {
  const existing = patient.profile
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [dbStatus, setDbStatus] = useState<'idle'|'ok'|'warn'>('idle')

  // ── form state ──
  const [htYears,       setHtYears]       = useState(String(existing?.htDurationYears  ?? ''))
  const [htMonths,      setHtMonths]      = useState(String(existing?.htDurationMonths ?? ''))
  const [htDays,        setHtDays]        = useState(String(existing?.htDurationDays   ?? ''))
  const [heightCm,      setHeightCm]      = useState(String(existing?.heightCm ?? ''))
  const [waistCm,       setWaistCm]       = useState(String(existing?.waistCm ?? ''))
  const [centralObesity,setCentralObesity]= useState(existing?.centralObesity ?? false)
  const [smoking,       setSmoking]       = useState<SmokingStatus>(existing?.smokingStatus ?? 'never')
  const [smokingYears,  setSmokingYears]  = useState(String(existing?.smokingYears  ?? ''))
  const [smokingMonths, setSmokingMonths] = useState(String(existing?.smokingMonths ?? ''))
  const [smokingDays,   setSmokingDays]   = useState(String(existing?.smokingDays   ?? ''))
  const [alcohol,       setAlcohol]       = useState<AlcoholStatus>(existing?.alcohol ?? 'never')
  const [pregnant,      setPregnant]      = useState(existing?.pregnant ?? false)
  const [recentSurgery, setRecentSurgery] = useState(existing?.recentSurgery ?? '')
  const [importantNotes,setImportantNotes]= useState(existing?.importantNotes ?? '')
  // เบาหวาน
  const [dmType,        setDmType]        = useState(existing?.dmType ?? '')
  const [dmDiagYear,    setDmDiagYear]    = useState(String(existing?.dmDiagnosisYear ?? ''))
  const [dmYears,       setDmYears]       = useState(String(existing?.dmDurationYears ?? ''))
  // CKD
  const [ckdYears,      setCkdYears]      = useState(String(existing?.ckdDurationYears ?? ''))

  const collect = (): Partial<PatientProfile> => ({
    htDurationYears:  htYears  ? parseInt(htYears)  : undefined,
    htDurationMonths: htMonths ? parseInt(htMonths) : undefined,
    htDurationDays:   htDays   ? parseInt(htDays)   : undefined,
    heightCm:         heightCm ? parseFloat(heightCm) : undefined,
    waistCm:          waistCm ? parseFloat(waistCm) : undefined,
    centralObesity:   centralObesity || undefined,
    smokingStatus:    smoking,
    smokingYears:  smoking !== 'never' && smokingYears  ? parseInt(smokingYears)  : undefined,
    smokingMonths: smoking !== 'never' && smokingMonths ? parseInt(smokingMonths) : undefined,
    smokingDays:   smoking !== 'never' && smokingDays   ? parseInt(smokingDays)   : undefined,
    alcohol:          alcohol,
    pregnant:         pregnant || undefined,
    recentSurgery:    recentSurgery.trim() || undefined,
    importantNotes:   importantNotes.trim() || undefined,
    dmType:           dmType.trim() || undefined,
    dmDiagnosisYear:  dmDiagYear ? parseInt(dmDiagYear) : undefined,
    dmDurationYears:  dmYears ? parseInt(dmYears) : undefined,
    ckdDurationYears: ckdYears ? parseInt(ckdYears) : undefined,
  })

  const handleSave = async () => {
    const profile = collect()
    setSaving(true)
    if (hasSupabaseEnv && patient.dbId) {
      const res = await savePatientHistory(patient.dbId, profile)
      setDbStatus(res.success ? 'ok' : 'warn')
    }
    setSaving(false)
    onSaved?.(profile)
    setSaved(true)
  }

  const inputStyle = (highlight = false): React.CSSProperties => ({
    width: '100%', padding: '8px 10px', background: '#fff',
    border: `1.5px solid ${highlight ? '#3b82f6' : 'var(--border2)'}`,
    borderRadius: 'var(--rs)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  })
  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', background: '#fff',
    border: '1.5px solid var(--border2)', borderRadius: 'var(--rs)', fontSize: 13, cursor: 'pointer',
  }
  const lbl = (text: string) => (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>
      {text}
    </label>
  )

  if (saved) {
    const profile = collect()
    const highlights: string[] = []
    if (pregnant) highlights.push('ตั้งครรภ์')
    if (smoking === 'current') highlights.push('สูบบุหรี่')
    if (alcohol === 'regular' || alcohol === 'heavy') highlights.push('ดื่มแอลกอฮอล์')
    if (recentSurgery) highlights.push(`ผ่าตัด: ${recentSurgery}`)

    return (
      <div style={{ background: 'rgba(59,130,246,.04)', border: '1.5px solid rgba(59,130,246,.25)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontWeight: 700, color: '#1d4ed8', flex: 1 }}>
            บันทึกประวัติผู้ป่วยแล้ว
            {hasSupabaseEnv && <span style={{ marginLeft: 8, fontSize: 11, fontFamily: 'var(--mono)', color: dbStatus === 'ok' ? '#007d60' : '#9a6700' }}>{dbStatus === 'ok' ? '(Supabase)' : '(Session)'}</span>}
          </div>
          <button onClick={() => setSaved(false)}
            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.3)', color: '#1d4ed8' }}>
            แก้ไข
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(htYears || htMonths || htDays) && (
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--bg3)', border: '1px solid var(--border)', fontFamily: 'var(--mono)' }}>
              ความดันมา {[htYears && `${htYears} ปี`, htMonths && `${htMonths} เดือน`, htDays && `${htDays} วัน`].filter(Boolean).join(' ')}
            </span>
          )}
          {heightCm && <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--bg3)', border: '1px solid var(--border)', fontFamily: 'var(--mono)' }}>{heightCm} ซม.</span>}
          {waistCm && <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--bg3)', border: '1px solid var(--border)', fontFamily: 'var(--mono)' }}>เอว {waistCm} ซม.</span>}
          {highlights.map(h => (
            <span key={h} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.25)', color: '#dc2626', fontWeight: 600 }}>{h}</span>
          ))}
          {importantNotes && <span style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>{importantNotes}</span>}
        </div>
      </div>
    )
  }

  const hasDiabetes    = patient.comorbidities.diabetes
  const hasCKD         = patient.comorbidities.ckd

  return (
    <div style={{ background: 'rgba(59,130,246,.04)', border: '1.5px solid rgba(59,130,246,.2)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
      <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        ซักประวัติผู้ป่วย
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: '#3b82f6' }}>[พยาบาล]</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
        {existing ? 'มีข้อมูลประวัติบางส่วนในระบบ — กรอกเพิ่มหรือแก้ไขได้' : 'ผู้ป่วยใหม่ — กรุณาซักประวัติเพิ่มเติม (กรอกเฉพาะที่ทราบ)'}
      </div>

      {/* แถว 1: ข้อมูลพื้นฐาน */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>ข้อมูลพื้นฐาน</div>

      {/* ความดันสูงมานาน: ปี / เดือน / วัน */}
      <div style={{ marginBottom: 14 }}>
        {lbl('ความดันสูงมานาน (กรอกเฉพาะที่ทราบ)')}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <input type="number" min="0" value={htYears} onChange={e => setHtYears(nn(e.target.value))} placeholder="0"
              style={{ ...inputStyle(), textAlign: 'center' }} />
            <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', marginTop: 3 }}>ปี</div>
          </div>
          <div style={{ color: 'var(--text3)', paddingBottom: 16 }}>:</div>
          <div style={{ flex: 1 }}>
            <input type="number" min="0" max="11" value={htMonths} onChange={e => setHtMonths(nn(e.target.value))} placeholder="0"
              style={{ ...inputStyle(), textAlign: 'center' }} />
            <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', marginTop: 3 }}>เดือน</div>
          </div>
          <div style={{ color: 'var(--text3)', paddingBottom: 16 }}>:</div>
          <div style={{ flex: 1 }}>
            <input type="number" min="0" max="30" value={htDays} onChange={e => setHtDays(nn(e.target.value))} placeholder="0"
              style={{ ...inputStyle(), textAlign: 'center' }} />
            <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', marginTop: 3 }}>วัน</div>
          </div>
          {(htYears || htMonths || htDays) && (
            <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, paddingBottom: 14, whiteSpace: 'nowrap' }}>
              = {[htYears && `${htYears} ปี`, htMonths && `${htMonths} เดือน`, htDays && `${htDays} วัน`].filter(Boolean).join(' ')}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
        <div>
          {lbl('ส่วนสูง (ซม.)')}
          <input type="number" min="0" value={heightCm} onChange={e => setHeightCm(nn(e.target.value))} placeholder="ซม." style={inputStyle()} />
        </div>
        <div>
          {lbl('เส้นรอบเอว (ซม.)')}
          <input type="number" min="0" value={waistCm} onChange={e => setWaistCm(nn(e.target.value))} placeholder="ซม." style={inputStyle()} />
        </div>
      </div>

      {/* แถว 2: ไลฟ์สไตล์ */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>ไลฟ์สไตล์</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        <div>
          {lbl('สูบบุหรี่')}
          <select value={smoking} onChange={e => setSmoking(e.target.value as SmokingStatus)} style={selectStyle}>
            <option value="never">ไม่สูบ</option>
            <option value="former">เคยสูบ (เลิกแล้ว)</option>
            <option value="current">สูบอยู่</option>
          </select>
        </div>
        {smoking !== 'never' && (
          <div style={{ gridColumn: '1 / -1' }}>
            {lbl('สูบมานาน (กรอกเฉพาะที่ทราบ)')}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <input type="number" min="0" value={smokingYears} onChange={e => setSmokingYears(nn(e.target.value))} placeholder="0"
                  style={{ ...inputStyle(), textAlign: 'center' }} />
                <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', marginTop: 3 }}>ปี</div>
              </div>
              <div style={{ color: 'var(--text3)', paddingBottom: 16 }}>:</div>
              <div style={{ flex: 1 }}>
                <input type="number" min="0" max="11" value={smokingMonths} onChange={e => setSmokingMonths(nn(e.target.value))} placeholder="0"
                  style={{ ...inputStyle(), textAlign: 'center' }} />
                <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', marginTop: 3 }}>เดือน</div>
              </div>
              <div style={{ color: 'var(--text3)', paddingBottom: 16 }}>:</div>
              <div style={{ flex: 1 }}>
                <input type="number" min="0" max="30" value={smokingDays} onChange={e => setSmokingDays(nn(e.target.value))} placeholder="0"
                  style={{ ...inputStyle(), textAlign: 'center' }} />
                <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', marginTop: 3 }}>วัน</div>
              </div>
              {(smokingYears || smokingMonths || smokingDays) && (
                <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, paddingBottom: 14, whiteSpace: 'nowrap' }}>
                  = {[smokingYears && `${smokingYears} ปี`, smokingMonths && `${smokingMonths} เดือน`, smokingDays && `${smokingDays} วัน`].filter(Boolean).join(' ')}
                </div>
              )}
            </div>
          </div>
        )}
        <div>
          {lbl('ดื่มแอลกอฮอล์')}
          <select value={alcohol} onChange={e => setAlcohol(e.target.value as AlcoholStatus)} style={selectStyle}>
            <option value="never">ไม่ดื่ม</option>
            <option value="occasional">ดื่มเป็นครั้งคราว</option>
            <option value="regular">ดื่มประจำ</option>
            <option value="heavy">ดื่มหนัก</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 18 }}>
          <input type="checkbox" id="centralObesity" checked={centralObesity} onChange={e => setCentralObesity(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }} />
          <label htmlFor="centralObesity" style={{ fontSize: 13, cursor: 'pointer' }}>อ้วนลงพุง</label>
        </div>
      </div>

      {/* แถว 3: ตั้งครรภ์ + ผ่าตัด */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: pregnant ? 'rgba(220,38,38,.05)' : '#fff', border: `1.5px solid ${pregnant ? 'rgba(220,38,38,.3)' : 'var(--border2)'}`, borderRadius: 'var(--rs)', padding: '10px 14px' }}>
          <input type="checkbox" id="pregnant" checked={pregnant} onChange={e => setPregnant(e.target.checked)}
            style={{ width: 18, height: 18, cursor: 'pointer' }} />
          <label htmlFor="pregnant" style={{ fontSize: 13, cursor: 'pointer', color: pregnant ? '#dc2626' : 'var(--text)', fontWeight: pregnant ? 700 : 400 }}>
            ตั้งครรภ์ {pregnant && '⚠️ (ระวังการเลือกยา)'}
          </label>
        </div>
        <div>
          {lbl('ประวัติการผ่าตัด / หัตถการล่าสุด')}
          <input type="text" value={recentSurgery} onChange={e => setRecentSurgery(e.target.value)}
            placeholder="เช่น ผ่าตัดหัวใจ 3 เดือนก่อน..."
            style={inputStyle()} />
        </div>
      </div>

      {/* แถว 4: เบาหวาน (แสดงเมื่อมีในโรคร่วม) */}
      {hasDiabetes && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>เบาหวาน</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
            <div>
              {lbl('ชนิดเบาหวาน')}
              <select value={dmType} onChange={e => setDmType(e.target.value)} style={selectStyle}>
                <option value="">— เลือก —</option>
                <option value="เบาหวานชนิดที่ 1">ชนิดที่ 1</option>
                <option value="เบาหวานชนิดที่ 2">ชนิดที่ 2</option>
                <option value="เบาหวานขณะตั้งครรภ์">ขณะตั้งครรภ์ (GDM)</option>
              </select>
            </div>
            <div>
              {lbl('ปีที่วินิจฉัย (พ.ศ.)')}
              <input type="number" min="1900" max="2600" value={dmDiagYear} onChange={e => setDmDiagYear(nn(e.target.value))} placeholder="เช่น 2560" style={inputStyle()} />
            </div>
            <div>
              {lbl('เป็นมากี่ปี')}
              <input type="number" min="0" value={dmYears} onChange={e => setDmYears(nn(e.target.value))} placeholder="ปี" style={inputStyle()} />
            </div>
          </div>
        </>
      )}

      {/* แถว 5: CKD */}
      {hasCKD && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>โรคไตเรื้อรัง (CKD)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
            <div>
              {lbl('เป็นมากี่ปี')}
              <input type="number" min="0" value={ckdYears} onChange={e => setCkdYears(nn(e.target.value))} placeholder="ปี" style={inputStyle()} />
            </div>
          </div>
        </>
      )}

      {/* หมายเหตุสำคัญ */}
      <div style={{ marginBottom: 14 }}>
        {lbl('หมายเหตุสำคัญอื่นๆ')}
        <textarea value={importantNotes} onChange={e => setImportantNotes(e.target.value)}
          placeholder="ข้อมูลสำคัญที่แพทย์ควรทราบ เช่น แพ้ยา ประวัติครอบครัว โรคอื่นๆ..."
          rows={2}
          style={{ width: '100%', padding: '9px 11px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 'var(--rs)', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = ''} />
      </div>

      <button
        onClick={handleSave} disabled={saving}
        style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: 'var(--rs)', padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'กำลังบันทึก...' : 'บันทึกประวัติ'}
      </button>
    </div>
  )
}

// ── Lab Entry (medtech) — ครบตาม data dictionary ─────────────────────────────
function LabEntrySection({ patient, onLabSaved }: { patient: CardioPatient; onLabSaved?: (labs: Partial<PatientLab>) => void }) {
  const labs = patient.labs
  type LabKey = keyof typeof fields
  const fields = {
    fpg:        { label: 'FPG (mg/dL)',            ph: String(labs.fpg ?? ''),        warn: (v: number) => v > 126 },
    hba1c:      { label: 'HbA1c (%)',              ph: String(labs.hba1c ?? ''),      warn: (v: number) => v > 7.5 },
    ldl:        { label: 'LDL (mg/dL)',            ph: String(labs.ldl ?? ''),        warn: (v: number) => v > 130 },
    hdl:        { label: 'HDL (mg/dL)',            ph: String(labs.hdl ?? ''),        warn: (v: number) => v < 40 },
    tg:         { label: 'Triglyceride (mg/dL)',   ph: String(labs.tg ?? ''),         warn: (v: number) => v > 150 },
    chol:       { label: 'Total Chol (mg/dL)',     ph: String(labs.chol ?? ''),       warn: (v: number) => v > 200 },
    creatinine: { label: 'Creatinine (mg/dL)',     ph: String(labs.creatinine ?? ''), warn: (v: number) => v > 1.3 },
    egfr:       { label: 'eGFR',                   ph: String(labs.egfr ?? ''),       warn: (v: number) => v < 60 },
    uacr:       { label: 'uACR (mg/g)',            ph: String(labs.uacr ?? ''),       warn: (v: number) => v > 30 },
    upcr:       { label: 'uPCR (mg/g)',            ph: String(labs.upcr ?? ''),       warn: (v: number) => v > 150 },
    proteinUrine24: { label: 'Protein urine 24hr (mg)', ph: String(labs.proteinUrine24 ?? ''), warn: (v: number) => v > 150 },
    potassium:  { label: 'Potassium K⁺ (mEq/L)',   ph: String(labs.potassium ?? ''),  warn: (v: number) => v > 5.0 || v < 3.5 },
    sodium:     { label: 'Sodium Na⁺ (mEq/L)',     ph: String(labs.sodium ?? ''),     warn: (v: number) => v < 135 || v > 145 },
    calcium:    { label: 'Calcium (mg/dL)',        ph: String(labs.calcium ?? ''),    warn: (v: number) => v < 8.5 || v > 10.5 },
    co2:        { label: 'CO₂ (mEq/L)',            ph: String(labs.co2 ?? ''),        warn: (v: number) => v < 22 || v > 29 },
    cl:         { label: 'Chloride (mEq/L)',       ph: String(labs.cl ?? ''),         warn: (v: number) => v < 96 || v > 106 },
    po4:        { label: 'Phosphate (mg/dL)',      ph: String(labs.po4 ?? ''),        warn: (v: number) => v < 2.5 || v > 4.5 },
    uric:       { label: 'Uric acid (mg/dL)',      ph: String(labs.uric ?? ''),       warn: (v: number) => v > 7 },
    hemoglobin: { label: 'Hemoglobin (g/dL)',      ph: String(labs.hemoglobin ?? ''), warn: (v: number) => v < 12 },
    hematocrit: { label: 'Hematocrit (%)',         ph: String(labs.hematocrit ?? ''), warn: (v: number) => v < 36 },
    wbc:        { label: 'WBC (×10³/µL)',          ph: String(labs.wbc ?? ''),        warn: (v: number) => v > 10 || v < 4 },
    platelet:   { label: 'Platelet (×10³/µL)',     ph: String(labs.platelet ?? ''),   warn: (v: number) => v < 150 || v > 400 },
    t3:         { label: 'T3',                      ph: String(labs.t3 ?? ''),         warn: () => false },
    t4:         { label: 'T4 (Free T4)',           ph: String(labs.t4 ?? ''),         warn: () => false },
    troponin:   { label: 'Troponin (ng/mL)',       ph: String(labs.troponin ?? ''),   warn: (v: number) => v > 0.04 },
    proBNP:     { label: 'NT-proBNP (pg/mL)',      ph: String(labs.proBNP ?? ''),     warn: (v: number) => v > 125 },
  }

  const [vals, setVals] = useState<Partial<Record<string, string>>>({})
  const [saved, setSaved] = useState(false)
  const [dbStatus, setDbStatus] = useState<'idle'|'ok'|'warn'>('idle')
  const [savingLab, setSavingLab] = useState(false)
  const set = (k: string, v: string) => setVals(p => ({ ...p, [k]: v }))

  const groups = [
    { title: 'น้ำตาลและเบาหวาน', keys: ['fpg', 'hba1c'] as LabKey[] },
    { title: 'ไขมันในเลือด', keys: ['ldl', 'hdl', 'tg', 'chol'] as LabKey[] },
    { title: 'ไต / ปัสสาวะ', keys: ['creatinine', 'egfr', 'uacr', 'upcr', 'proteinUrine24'] as LabKey[] },
    { title: 'เกลือแร่ / เมตาบอลิก', keys: ['potassium', 'sodium', 'calcium', 'co2', 'cl', 'po4', 'uric'] as LabKey[] },
    { title: 'ความสมบูรณ์ของเลือด (CBC)', keys: ['hemoglobin', 'hematocrit', 'wbc', 'platelet'] as LabKey[] },
    { title: 'ไทรอยด์', keys: ['t3', 't4'] as LabKey[] },
    { title: 'ค่าหัวใจขั้นสูง', keys: ['troponin', 'proBNP'] as LabKey[] },
  ]

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

  const collectLabs = (): Partial<PatientLab> => {
    const out: Partial<PatientLab> = { date: new Date().toISOString().split('T')[0] }
    for (const [k, v] of Object.entries(vals)) {
      const num = parseFloat(v ?? '')
      if (!isNaN(num)) (out as Record<string, number | string>)[k] = num
    }
    return out
  }

  const handleLabSave = async () => {
    const collected = collectLabs()
    onLabSaved?.(collected)
    setSavingLab(true)
    if (hasSupabaseEnv && patient.dbId) {
      const res = await saveLab(patient.dbId, collected, { ua: uaVals, ecgNote, extraNote })
      setDbStatus(res.success ? 'ok' : 'warn')
    }
    setSavingLab(false); setSaved(true)
  }

  if (saved) return (
    <div style={{ background: 'rgba(139,92,246,.04)', border: '1.5px solid rgba(139,92,246,.25)', borderRadius: 'var(--r)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontWeight: 700, color: '#7c3aed', flex: 1 }}>
          บันทึกผลการตรวจแล้ว
          {hasSupabaseEnv && <span style={{ marginLeft: 8, fontSize: 11, fontFamily: 'var(--mono)', color: dbStatus === 'ok' ? '#007d60' : '#9a6700' }}>{dbStatus === 'ok' ? '(Supabase)' : '(Session)'}</span>}
        </div>
        <button onClick={() => setSaved(false)}
          style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.3)', color: '#7c3aed' }}>
          แก้ไข
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>กด <strong>แก้ไข</strong> เพื่อแก้ไขค่า แล้วบันทึกซ้ำได้</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {Object.entries(vals).filter(([, v]) => v).map(([k, v]) => {
          const f = fields[k as LabKey]; const num = parseFloat(v!); const hi = !isNaN(num) && f.warn(num)
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
              const f = fields[k]; const num = parseFloat(vals[k] ?? ''); const hi = vals[k] && !isNaN(num) && f.warn(num)
              return (
                <div key={k}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4, fontWeight: 600 }}>{f.label}</label>
                  <input type="number" min="0" value={vals[k] ?? ''} placeholder={f.ph || '—'}
                    onChange={e => set(k, nn(e.target.value))}
                    style={{ width: '100%', padding: '9px 11px', background: '#fff', border: `1.5px solid ${hi ? 'rgba(220,38,38,.5)' : 'var(--border2)'}`, borderRadius: 'var(--rs)', color: hi ? '#dc2626' : 'var(--text)', fontFamily: 'var(--mono)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                    onBlur={e => e.target.style.borderColor = hi ? 'rgba(220,38,38,.5)' : ''} />
                  {hi && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2 }}>⚠ ค่าผิดปกติ</div>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
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
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>ผล ECG / คลื่นหัวใจ (ถ้ามี)</div>
        <textarea value={ecgNote} onChange={e => setEcgNote(e.target.value)}
          placeholder="เช่น Sinus rhythm, HR 72 bpm, no ST change / Atrial fibrillation..." rows={2}
          style={{ width: '100%', padding: '9px 11px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 'var(--rs)', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = '#8b5cf6'} onBlur={e => e.target.style.borderColor = ''} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>หมายเหตุ / ข้อสังเกตเพิ่มเติม</div>
        <textarea value={extraNote} onChange={e => setExtraNote(e.target.value)}
          placeholder="ข้อสังเกตอื่นๆ จากการตรวจ..." rows={2}
          style={{ width: '100%', padding: '9px 11px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 'var(--rs)', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = '#8b5cf6'} onBlur={e => e.target.style.borderColor = ''} />
      </div>
      <button className={styles.btnP} style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', marginTop: 4 }} onClick={handleLabSave} disabled={savingLab}>
        {savingLab ? 'กำลังบันทึก...' : 'บันทึกผลการตรวจ'}
      </button>
    </div>
  )
}

// ── BP Section (nurse & doctor) — แก้ไขได้หลังกดยืนยัน ────────────────────────
function BPSection({
  patient, doctorName, userRole, onNewVisit,
}: {
  patient: CardioPatient
  doctorName: string
  userRole: UserRole
  onNewVisit: (v: BPVisit | null) => void
}) {
  const lastVisit     = patient.visits[patient.visits.length - 1]
  const recordedToday = lastVisit ? isToday(lastVisit.date) : false

  const [sbp,    setSbp]    = useState(recordedToday ? String(lastVisit.sbp) : '')
  const [dbp,    setDbp]    = useState(recordedToday ? String(lastVisit.dbp) : '')
  const [hr,     setHr]     = useState(recordedToday ? String(lastVisit.heartRate) : '')
  const [wt,     setWt]     = useState(lastVisit ? String(lastVisit.weight) : '')
  // ส่วนสูง — prefill จาก profile, เก็บ/อัปเดต patient_history เมื่อบันทึก
  const [ht,     setHt]     = useState(String(patient.profile?.heightCm ?? ''))
  const [resp,   setResp]   = useState(recordedToday && lastVisit.resp ? String(lastVisit.resp) : '')
  const [o2sat,  setO2sat]  = useState(recordedToday && lastVisit.o2sat ? String(lastVisit.o2sat) : '')
  const [temp,   setTemp]   = useState(recordedToday && lastVisit.temp ? String(lastVisit.temp) : '')
  const [note,   setNote]   = useState('')
  const [err,    setErr]    = useState('')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [dbStatus, setDbStatus] = useState<'idle'|'ok'|'warn'>('idle')

  // BMI preview: คำนวณเมื่อใส่ทั้งน้ำหนักและส่วนสูง
  const wtNum = parseFloat(wt), htNum = parseFloat(ht)
  const bmiPreview = wtNum > 0 && htNum > 0
    ? parseFloat((wtNum / ((htNum / 100) ** 2)).toFixed(1))
    : null

  const handleSave = async () => {
    const s = parseInt(sbp), d = parseInt(dbp), h = parseInt(hr), w = parseFloat(wt)
    if (!s || !d || !h) { setErr('กรุณากรอก SBP, DBP และ Heart Rate'); return }
    if (s < 60 || s > 250) { setErr('SBP ไม่อยู่ในช่วงที่เป็นไปได้ (60–250)'); return }
    if (d < 40 || d > 160) { setErr('DBP ไม่อยู่ในช่วงที่เป็นไปได้ (40–160)'); return }
    if (h < 30 || h > 200) { setErr('Heart Rate ไม่อยู่ในช่วงที่เป็นไปได้'); return }

    const today  = new Date().toISOString().split('T')[0]
    const weight = w || lastVisit?.weight || 0
    const htM    = htNum > 0 ? htNum / 100 : (patient.profile?.heightCm ?? 165) / 100
    const bmi    = weight > 0 ? parseFloat((weight / (htM ** 2)).toFixed(1)) : lastVisit?.bmi ?? 0
    const newVisit: BPVisit = {
      date: today, sbp: s, dbp: d, heartRate: h, weight, bmi,
      resp: resp ? parseFloat(resp) : undefined,
      o2sat: o2sat ? parseFloat(o2sat) : undefined,
      temp: temp ? parseFloat(temp) : undefined,
      note: note.trim() || undefined, recordedBy: doctorName,
    }

    setSaving(true); setErr('')
    if (hasSupabaseEnv && patient.dbId) {
      const result = await saveVisit(patient.dbId, newVisit, doctorName)
      setDbStatus(result.success ? 'ok' : 'warn')
      // อัปเดตส่วนสูงใน patient_history เมื่อกรอกใหม่
      if (htNum > 0) await savePatientHistory(patient.dbId, { heightCm: htNum })
    }
    setSaving(false); onNewVisit(newVisit); setSaved(true)
  }

  if (saved) {
    const s = parseInt(sbp), d = parseInt(dbp), h = parseInt(hr)
    return (
      <div style={{ background: 'rgba(0,184,148,.04)', border: '1.5px solid rgba(0,168,114,.25)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: '#007d60', flex: 1 }}>
            บันทึกค่าความดันวันนี้แล้ว
            {hasSupabaseEnv && <span style={{ marginLeft: 10, fontSize: 11, fontFamily: 'var(--mono)', color: dbStatus === 'ok' ? '#007d60' : '#9a6700' }}>{dbStatus === 'ok' ? '(Supabase)' : '(Session)'}</span>}
          </div>
          <button onClick={() => setSaved(false)}
            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', background: 'rgba(0,168,114,.08)', border: '1px solid rgba(0,168,114,.3)', color: '#007d60' }}>
            แก้ไขค่าความดัน
          </button>
        </div>
        {/* ตาราง summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
          {[
            ['SBP', s, 'mmHg', s > 140], ['DBP', d, 'mmHg', d > 90], ['HR', h, 'bpm', h < 55],
            ['น้ำหนัก', parseFloat(wt) || lastVisit?.weight || 0, 'kg', false],
            ['ส่วนสูง', htNum || (patient.profile?.heightCm ?? '—'), 'ซม.', false],
          ].map(([l, v, u, hi]) => (
            <div key={String(l)} style={{ background: '#fff', borderRadius: 'var(--rs)', padding: '10px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--mono)', color: hi ? 'var(--danger)' : 'var(--accent)' }}>{v as string|number}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{l} ({u})</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>กด <strong>แก้ไขค่าความดัน</strong> หากต้องการปรับค่าที่บันทึก</div>
      </div>
    )
  }

  return (
    <div style={{ background: 'rgba(217,119,6,.04)', border: '1.5px solid rgba(217,119,6,.2)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <span style={{ fontWeight: 700, color: 'var(--warn)', fontSize: 14, flex: 1 }}>
          กรอกค่าความดันวันนี้
          <span style={{ fontSize: 11, color: userRole === 'nurse' ? '#3b82f6' : 'var(--accent)', marginLeft: 8, fontFamily: 'var(--mono)' }}>
            [{userRole === 'nurse' ? 'พยาบาล' : 'แพทย์'}]
          </span>
        </span>
      </div>

      {/* ค่าล่าสุดในระบบ */}
      {lastVisit && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
            ค่าล่าสุดในระบบ · {new Date(lastVisit.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
            {lastVisit.recordedBy ? ` · โดย ${lastVisit.recordedBy}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontFamily: 'var(--mono)', fontSize: 13 }}>
            <span>SBP/DBP <strong style={{ color: lastVisit.sbp > 140 ? '#dc2626' : 'var(--accent)' }}>{lastVisit.sbp}/{lastVisit.dbp}</strong></span>
            <span>HR <strong>{lastVisit.heartRate}</strong></span>
            <span>น้ำหนัก <strong>{lastVisit.weight} kg</strong></span>
          </div>
        </div>
      )}

      {recordedToday && (
        <div style={{ background: 'rgba(59,130,246,.05)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 'var(--rs)', padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#1d4ed8' }}>
          มีการบันทึกค่าความดันวันนี้ไว้แล้ว — คุณสามารถแก้ไขและบันทึกซ้ำได้
        </div>
      )}

      {/* ── Clinic BP + vitals ── */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
        ความดันโลหิต + สัญญาณชีพ
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 10 }}>
        {[
          { l: 'SBP (mmHg)*', val: sbp, set: setSbp, ph: '120' },
          { l: 'DBP (mmHg)*', val: dbp, set: setDbp, ph: '80' },
          { l: 'HR (bpm)*',   val: hr,  set: setHr,  ph: '72' },
          { l: 'น้ำหนัก (kg)', val: wt, set: setWt, ph: String(lastVisit?.weight ?? '') },
          { l: 'ส่วนสูง (ซม.)', val: ht, set: setHt, ph: String(patient.profile?.heightCm ?? '') },
        ].map(({ l, val, set, ph }) => (
          <div key={l}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 5, fontWeight: 600 }}>{l}</label>
            <input type="number" min="0" value={val} onChange={e => set(nn(e.target.value))} placeholder={ph}
              style={{ width: '100%', padding: '10px 8px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 'var(--rs)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 14, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = ''} />
          </div>
        ))}
      </div>
      {/* BMI preview */}
      {bmiPreview && (
        <div style={{ fontSize: 12, color: bmiPreview >= 25 ? '#b45309' : 'var(--accent)', marginBottom: 10, fontFamily: 'var(--mono)' }}>
          BMI (คำนวณ): <strong>{bmiPreview}</strong> kg/m² {bmiPreview >= 30 ? '(อ้วน)' : bmiPreview >= 25 ? '(น้ำหนักเกิน)' : '(ปกติ)'}
        </div>
      )}

      {/* สัญญาณชีพเพิ่มเติม */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        {[
          { l: 'RR (/min)', val: resp, set: setResp, ph: '18' },
          { l: 'O₂ Sat (%)', val: o2sat, set: setO2sat, ph: '98' },
          { l: 'อุณหภูมิ (°C)', val: temp, set: setTemp, ph: '36.8' },
        ].map(({ l, val, set, ph }) => (
          <div key={l}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 5, fontWeight: 600 }}>{l}</label>
            <input type="number" min="0" value={val} onChange={e => set(nn(e.target.value))} placeholder={ph}
              style={{ width: '100%', padding: '9px 12px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 'var(--rs)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = ''} />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 5, fontWeight: 600 }}>หมายเหตุการกรอกความดัน (ถ้ามี)</label>
        <input type="text" value={note} onChange={e => setNote(e.target.value)}
          placeholder="เช่น ผู้ป่วยมีอาการเจ็บหน้าอก, วัดซ้ำ 2 ครั้ง..."
          style={{ width: '100%', padding: '10px 12px', background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 'var(--rs)', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = ''} />
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
  const shown = expanded ? visits : visits.length <= 2 ? visits : [visits[0], visits[visits.length - 1]]
  const fmt = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  return (
    <div>
      {[...shown].reverse().map((v, i) => (
        <div key={i} style={{ marginBottom: v.note ? 2 : 6 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
            background: isToday(v.date) ? 'rgba(0,184,148,.05)' : 'var(--bg3)',
            border: `1px solid ${isToday(v.date) ? 'rgba(0,168,114,.3)' : 'var(--border)'}`,
            borderRadius: v.note ? 'var(--rs) var(--rs) 0 0' : 'var(--rs)', fontSize: 13,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: v.sbp > 160 ? '#dc2626' : v.sbp > 140 ? '#d97706' : '#00b894', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', width: 80, flexShrink: 0 }}>
              {fmt(v.date)}{isToday(v.date) ? ' *' : ''}
            </span>
            <span style={{ fontWeight: 700, color: v.sbp > 140 ? 'var(--warn)' : 'var(--text)' }}>{v.sbp}/{v.dbp}</span>
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
  const REC_COLOR: Record<string, string> = { INTENSIFY: '#ef4444', URGENT_REVIEW: '#dc2626', REDUCE: '#f59e0b', CONTINUE: '#00a872', MONITOR: '#6b7280', SWITCH: '#8b5cf6' }
  const REC_TH: Record<string, string> = { INTENSIFY: 'เพิ่มยา', URGENT_REVIEW: 'เร่งด่วน', REDUCE: 'ลดยา', CONTINUE: 'คงยาเดิม', MONITOR: 'ติดตาม', SWITCH: 'เปลี่ยนยา' }
  const fmt = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  return (
    <div>
      {shown.map((r, i) => (
        <div key={i} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '12px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)', width: 76, flexShrink: 0 }}>{fmt(r.date)}</span>
            <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{r.doctorName}</span>
            {r.recommendation && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)', fontWeight: 700, background: `${REC_COLOR[r.recommendation] ?? '#6b7280'}15`, color: REC_COLOR[r.recommendation] ?? '#6b7280', border: `1px solid ${REC_COLOR[r.recommendation] ?? '#6b7280'}40` }}>{REC_TH[r.recommendation] ?? r.recommendation}</span>
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
  patient, doctorName, userRole, onBack, onNext, onFinish,
}: {
  patient: CardioPatient
  doctorName: string
  userRole: UserRole
  onBack: () => void
  onNext: (newVisit: BPVisit | null) => void
  onFinish?: (newVisit: BPVisit | null) => void
}) {
  const [newVisit,     setNewVisit]     = useState<BPVisit | null>(null)
  const [savedLabs,    setSavedLabs]    = useState<Partial<PatientLab> | null>(null)
  const [savedHistory, setSavedHistory] = useState<Partial<PatientProfile> | null>(null)
  const [showHistory,  setShowHistory]  = useState(false)
  const lastV = patient.visits[patient.visits.length - 1]
  const hasComorbidities = Object.values(patient.comorbidities).some(Boolean)
  const visitCount = patient.visits.length
  const apptCount  = patient.doctorRecords?.filter(r => r.nextApptDate).length ?? 0

  const needsHistory = !patient.profile && userRole === 'nurse'

  const recordedToday = lastV ? isToday(lastV.date) : false
  const nurseReady   = !!newVisit || recordedToday
  const medtechReady = !!savedLabs

  return (
    <div>
      <div className={styles.stepHdr}>
        <span className={styles.stepNum}>{userRole === 'doctor' ? '02 / 05' : '02 / 02'}</span>
        <h1 className={styles.stepTitle}>ข้อมูลผู้ป่วย</h1>
      </div>
      <p className={styles.stepDesc}>ข้อมูลพื้นฐาน ประวัติการรักษา และบันทึกค่าตามบทบาท</p>

      {/* Patient Card */}
      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border2)', borderRadius: 'var(--r)', padding: '22px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,160,114,.06)' }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <PatientAvatar patient={patient} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{patient.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
              อายุ <strong>{patient.age}</strong> ปี · เพศ{patient.sex}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>รหัสผู้ป่วย: {patient.id}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <span className={[styles.riskBadge, styles.riskLow].join(' ')}>{patient.medications.length} กลุ่มยา</span>
              <span className={[styles.riskBadge, styles.riskModerate].join(' ')}>มาตรวจ {visitCount} ครั้ง</span>
              <span className={[styles.riskBadge, styles.riskLow].join(' ')}>นัดจากแพทย์ {apptCount} ครั้ง</span>
              {hasComorbidities && <span className={[styles.riskBadge, styles.riskHigh].join(' ')}>มีโรคร่วม</span>}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>นับจากข้อมูลที่บันทึกใน Supabase</div>
          </div>
        </div>
      </div>

      {/* ประวัติและข้อมูลสำคัญ — ให้แพทย์เห็นมากกว่าแค่ค่าความดัน */}
      <PatientHistoryCard patient={savedHistory ? { ...patient, profile: { ...patient.profile, ...savedHistory } } : patient} />

      {/* ฟอร์มซักประวัติ — กดปุ่มแก้ไขเพื่อเปิด */}
      {userRole === 'nurse' && (
        <div style={{ marginBottom: 16 }}>
          {!showHistory ? (
            <button
              onClick={() => setShowHistory(true)}
              style={{
                width: '100%', padding: '10px 16px', borderRadius: 'var(--rs)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: needsHistory ? 'rgba(59,130,246,.06)' : 'var(--bg3)',
                border: `1.5px solid ${needsHistory ? 'rgba(59,130,246,.3)' : 'var(--border2)'}`,
                color: needsHistory ? '#1d4ed8' : 'var(--text2)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
              <span>{needsHistory ? '⚠ ผู้ป่วยใหม่ — กรอกประวัติก่อนบันทึกความดัน' : '✏ แก้ไขประวัติผู้ป่วย'}</span>
              <span style={{ fontSize: 11 }}>คลิกเพื่อเปิด ▼</span>
            </button>
          ) : (
            <HistoryEntrySection
              patient={patient}
              onSaved={profile => { setSavedHistory(profile); setShowHistory(false) }}
            />
          )}
        </div>
      )}

      {/* Vitals Grid */}
      <div className={styles.detailGrid} style={{ marginBottom: 16 }}>
        {[
          { l: 'BMI', v: `${lastV?.bmi ?? '-'}`, warn: (lastV?.bmi ?? 0) >= 25 },
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
        {!hasComorbidities && <span className={[styles.comorbTag, styles.comorbNone].join(' ')}>ไม่มีโรคร่วมสำคัญ</span>}
        {Object.entries(patient.comorbidities).map(([k, v]) => v ? <span key={k} className={styles.comorbTag}>{COMORBIDITY_LABEL[k]}</span> : null)}
      </div>

      {/* Medications */}
      <div className={styles.lbl}>ยาที่ใช้อยู่ปัจจุบัน</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {patient.medications.length === 0 && <span style={{ fontSize: 13, color: 'var(--text3)' }}>ยังไม่มีรายการยา</span>}
        {patient.medications.map((m, i) => (
          <div key={i} style={{ background: 'var(--bg3)', border: `1.5px solid ${drugColor(m.drugClass)}40`, borderRadius: 'var(--rs)', padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: drugColor(m.drugClass), fontFamily: 'var(--mono)', marginBottom: 2 }}>{drugLabel(m.drugClass)}</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{m.drugName}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{m.dose} · {m.frequency}</div>
          </div>
        ))}
      </div>

      <div className={styles.divider} />

      {/* BP / Lab Today — ตามบทบาท */}
      <div className={styles.lbl} style={{ marginBottom: 10 }}>
        {userRole === 'medtech' ? 'บันทึกผลการตรวจทางห้องปฏิบัติการ' : 'บันทึกค่าความดันโลหิตวันนี้'}
      </div>
      {userRole === 'medtech'
        ? <LabEntrySection patient={patient} onLabSaved={setSavedLabs} />
        : <BPSection patient={patient} doctorName={doctorName} userRole={userRole}
            onNewVisit={(v) => setNewVisit(v)} />
      }

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
      <div className={styles.lbl} style={{ marginBottom: 10 }}>ประวัติการรักษา (Visit History)</div>
      <VisitHistory visits={patient.visits} defaultExpanded={userRole === 'nurse'} />

      <div className={styles.btnRow}>
        <button className={styles.btnS} onClick={onBack}>← กลับ</button>
        {userRole === 'doctor' ? (
          <button className={styles.btnP} onClick={() => onNext(newVisit)}>
            ดู BP Trend →
          </button>
        ) : userRole === 'nurse' ? (
          <button className={styles.btnP} style={{ opacity: nurseReady ? 1 : 0.5, minWidth: 180 }}
            onClick={() => nurseReady ? onFinish?.(newVisit) : undefined} disabled={!nurseReady}
            title={!nurseReady ? 'กรุณาบันทึกค่าความดันก่อน' : undefined}>
            บันทึกและเสร็จสิ้น ✓
          </button>
        ) : (
          <button className={styles.btnP} style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', opacity: medtechReady ? 1 : 0.5, minWidth: 180 }}
            onClick={() => medtechReady ? onFinish?.(null) : undefined} disabled={!medtechReady}
            title={!medtechReady ? 'กรุณาบันทึกผลแลปก่อน' : undefined}>
            บันทึกและเสร็จสิ้น ✓
          </button>
        )}
      </div>
    </div>
  )
}
