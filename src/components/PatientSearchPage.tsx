'use client'
import { useState } from 'react'
import { fetchPatientByQuery, hasSupabaseEnv } from '@/lib/supabaseData'
import { findPatientByNationalId }              from '@/lib/mockData'
import type { CardioPatient } from '@/lib/types'
import styles from './HyperSense.module.css'

async function searchPatient(query: string): Promise<CardioPatient | null> {
  if (hasSupabaseEnv) return fetchPatientByQuery(query)
  return findPatientByNationalId(query)
}

const DEMO = [
  { label: '10001 — High Risk (BP วันนี้แล้ว)',    val: '10001' },
  { label: '10002 — Moderate (ต้องกรอก BP)',         val: '10002' },
  { label: '10003 — Critical (4 โรคร่วม)',           val: '10003' },
  { label: '10005 — REDUCE (ความดันต่ำ / CKD)',      val: '10005' },
]

export default function PatientSearchPage({
  onFound, onBack,
}: {
  onFound: (p: CardioPatient) => void
  onBack: () => void
}) {
  const [query,   setQuery]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const doSearch = async () => {
    const q = query.trim()
    if (!q) { setError('กรุณากรอกรหัสผู้ป่วย (5-7 หลัก)'); return }
    setLoading(true); setError('')
    try {
      const found = await searchPatient(q)
      if (found) { onFound(found) }
      else {
        setError(
          hasSupabaseEnv
            ? 'ไม่พบผู้ป่วยในฐานข้อมูล — ตรวจสอบรหัสผู้ป่วย'
            : 'ไม่พบผู้ป่วยใน Demo Data — ลองใช้ตัวอย่างด้านล่าง',
        )
      }
    } catch (err: any) {
      setError(`เกิดข้อผิดพลาด: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') doSearch() }

  return (
    <div>
      <div className={styles.stepHdr}>
        <span className={styles.stepNum}>01 / 05</span>
        <h1 className={styles.stepTitle}>ค้นหาผู้ป่วย</h1>
      </div>
      <p className={styles.stepDesc}>กรอกรหัสผู้ป่วย 5-7 หลัก</p>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 16, padding: '8px 14px',
        borderRadius: 'var(--rs)', fontSize: 12, fontFamily: 'var(--mono)',
        background: hasSupabaseEnv ? 'rgba(0,184,148,.08)' : 'rgba(243,156,18,.08)',
        border: `1.5px solid ${hasSupabaseEnv ? 'rgba(0,184,148,.3)' : 'rgba(243,156,18,.3)'}`,
        color: hasSupabaseEnv ? '#007d60' : '#9a6700',
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: hasSupabaseEnv ? '#00a872' : '#d97706', flexShrink: 0, display: 'inline-block' }} />
        <span>
          {hasSupabaseEnv
            ? 'เชื่อมต่อ Supabase — ดึงข้อมูลจากฐานข้อมูลจริง'
            : 'Demo Mode — ตั้งค่า NEXT_PUBLIC_SUPABASE_URL เพื่อเชื่อมต่อจริง'}
        </span>
      </div>

      <div style={{
        background: 'var(--bg2)', border: '1.5px solid var(--border2)',
        borderRadius: 'var(--r)', padding: '28px 24px', marginBottom: 16,
        boxShadow: '0 2px 12px rgba(0,160,114,.06)',
      }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>
          รหัสผู้ป่วย (Patient ID)
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setError('') }}
            onKeyDown={handleKey}
            placeholder="เช่น  10001  หรือ  10003"
            maxLength={7}
            style={{
              flex: 1, padding: '14px 16px',
              background: 'var(--bg)', border: '1.5px solid var(--border2)',
              borderRadius: 'var(--rs)', color: 'var(--text)',
              fontFamily: 'var(--mono)', fontSize: 18, outline: 'none',
              letterSpacing: '0.1em', minHeight: 52,
              transition: 'border-color .2s, box-shadow .2s',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,168,114,.1)' }}
            onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = '' }}
          />
          <button className={styles.btnP} onClick={doSearch} disabled={loading} style={{ minWidth: 110, fontSize: 15 }}>
            {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
          </button>
        </div>

        {error && (
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: 'rgba(220,38,38,.06)', border: '1.5px solid rgba(220,38,38,.25)',
            borderRadius: 'var(--rs)', fontSize: 13, color: '#dc2626',
          }}>{error}</div>
        )}

        {/* Quick picks */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>ตัวอย่างผู้ป่วย Demo</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DEMO.map(d => (
              <button key={d.val} onClick={() => { setQuery(d.val); setError('') }} style={{
                fontSize: 12, padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                background: query === d.val ? 'rgba(0,168,114,.1)' : 'var(--bg3)',
                border: `1.5px solid ${query === d.val ? 'var(--accent)' : 'var(--border2)'}`,
                color: query === d.val ? 'var(--accent)' : 'var(--text2)',
                fontFamily: 'var(--mono)', transition: 'all .15s',
              }}>{d.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text3)' }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>PDPA:</span>{' '}
          ข้อมูลเข้ารหัสและเข้าถึงได้เฉพาะบุคลากรที่ได้รับสิทธิ์เท่านั้น
        </div>
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnS} onClick={onBack}>← ออกจากระบบ</button>
      </div>
    </div>
  )
}
