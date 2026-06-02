'use client'
import { useState } from 'react'
import type { UserRole } from '@/lib/types'
import styles from './Login.module.css'

interface Account {
  user: string
  pass: string
  name: string
  role: UserRole
  dept: string
  badge: string
  badgeColor: string
}

const DEMO_ACCOUNTS: Account[] = [
  { user: 'doctor1',  pass: '1234', name: 'นพ. วิชาญ สุขใจ',       role: 'doctor',   dept: 'อายุรกรรม',    badge: 'แพทย์',          badgeColor: '#00a872' },
  { user: 'doctor2',  pass: '1234', name: 'พญ. สมหญิง รักษาดี',    role: 'doctor',   dept: 'ต่อมไร้ท่อ',  badge: 'แพทย์',          badgeColor: '#00a872' },
  { user: 'nurse1',   pass: '1234', name: 'น.ส. พรทิพย์ ใจดี',     role: 'nurse',    dept: 'การพยาบาล',   badge: 'พยาบาล',         badgeColor: '#3b82f6' },
  { user: 'medtech1', pass: '1234', name: 'นาย ชาญณรงค์ วิชาการ', role: 'medtech',  dept: 'เทคนิคการแพทย์', badge: 'เทคนิคการแพทย์', badgeColor: '#8b5cf6' },
]

const ROLE_TH: Record<UserRole, string> = {
  doctor:  'แพทย์ — เข้าถึงได้ทุกส่วน',
  nurse:   'พยาบาล — กรอกค่าความดันโลหิต',
  medtech: 'เทคนิคการแพทย์ — บันทึกผลแลป',
}

export default function LoginPage({
  onLogin,
}: {
  onLogin: (name: string, role: UserRole) => void
}) {
  const [user,    setUser]    = useState('')
  const [pass,    setPass]    = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const doLogin = async () => {
    if (!user.trim() || !pass.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'); return
    }
    setLoading(true); setError('')
    await new Promise(r => setTimeout(r, 500))
    const found = DEMO_ACCOUNTS.find(a => a.user === user.trim() && a.pass === pass)
    if (found) {
      onLogin(found.name, found.role)
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') doLogin() }

  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <div className={styles.loginLogo}>HS</div>
        <div className={styles.loginTitle}>HyperSense</div>
        <div className={styles.loginSub}>
          แพลตฟอร์มคาดการณ์ความเสี่ยงโรคและ<br />วิเคราะห์การใช้ยาในผู้ป่วยความดันโลหิต<br />
          Intelligent Hypertension Prediction and
          Medication Analysis Platform
        </div>

        <div className={styles.loginField}>
          <label className={styles.loginLabel}>ชื่อผู้ใช้ (Username)</label>
          <input
            className={styles.loginInput}
            type="text"
            placeholder="กรอกชื่อผู้ใช้"
            value={user}
            onChange={e => setUser(e.target.value)}
            onKeyDown={handleKey}
          />
        </div>
        <div className={styles.loginField}>
          <label className={styles.loginLabel}>รหัสผ่าน (Password)</label>
          <input
            className={styles.loginInput}
            type="password"
            placeholder="กรอกรหัสผ่าน"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={handleKey}
          />
        </div>

        {error && <div className={styles.loginErr}>{error}</div>}

        <button className={styles.loginBtn} onClick={doLogin} disabled={loading}>
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>

        <div className={styles.loginHint}>
          <div className={styles.loginHintT}>บัญชีทดสอบ (Demo) — รหัสผ่านทุกบัญชี: 1234</div>
          {DEMO_ACCOUNTS.map(a => (
            <div key={a.user} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 20,
                background: `${a.badgeColor}18`, color: a.badgeColor,
                border: `1px solid ${a.badgeColor}40`, fontWeight: 600,
                whiteSpace: 'nowrap',
              }}>{a.badge}</span>
              <span style={{ fontSize: 12 }}>
                <strong>{a.user}</strong> — {a.name}
              </span>
            </div>
          ))}
        </div>

        {/* Role permission table */}
        <div style={{
          marginTop: 14, padding: '12px 14px',
          background: '#f8fffe', border: '1px solid rgba(0,168,114,.2)',
          borderRadius: 8, textAlign: 'left', fontSize: 11,
        }}>
          <div style={{ fontWeight: 700, color: '#00a872', marginBottom: 6, fontSize: 12 }}>สิทธิ์การเข้าถึงตาม Role</div>
          {(Object.entries(ROLE_TH) as [UserRole, string][]).map(([r, label]) => (
            <div key={r} style={{ display: 'flex', gap: 8, marginBottom: 3, color: '#374151', lineHeight: 1.5 }}>
              <span style={{ color: '#00a872', fontFamily: 'monospace', minWidth: 70 }}>{r}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
