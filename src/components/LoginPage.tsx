'use client'
import { useState } from 'react'
import type { UserRole } from '@/lib/types'
import styles from './Login.module.css'

interface Account {
  staffId:    string      // รหัสพนักงาน — DR001, DR002, NR001, MT001
  pass:       string
  name:       string
  role:       UserRole
  dept:       string
  badge:      string
  badgeColor: string
}

const DEMO_ACCOUNTS: Account[] = [
  { staffId: 'DR001', pass: '1234', name: 'นพ. วิชาญ สุขใจ',       role: 'doctor',  dept: 'อายุรกรรม',       badge: 'แพทย์',           badgeColor: '#00a872' },
  { staffId: 'DR002', pass: '1234', name: 'พญ. สมหญิง รักษาดี',    role: 'doctor',  dept: 'ต่อมไร้ท่อ',     badge: 'แพทย์',           badgeColor: '#00a872' },
  { staffId: 'DR003', pass: '1234', name: 'นพ. ทวีศักดิ์ มีโชค',   role: 'doctor',  dept: 'โรคหัวใจ',       badge: 'แพทย์',           badgeColor: '#00a872' },
  { staffId: 'NR001', pass: '1234', name: 'น.ส. พรทิพย์ ใจดี',     role: 'nurse',   dept: 'การพยาบาล',      badge: 'พยาบาล',          badgeColor: '#3b82f6' },
  { staffId: 'MT001', pass: '1234', name: 'นาย ชาญณรงค์ วิชาการ', role: 'medtech', dept: 'เทคนิคการแพทย์',  badge: 'เทคนิคการแพทย์',  badgeColor: '#8b5cf6' },
]

const ROLE_TH: Record<UserRole, string> = {
  doctor:  'แพทย์ — เห็นข้อมูลครบ วิเคราะห์ความเสี่ยง แก้ไขยา/นัดหมาย และบันทึกการรักษา',
  nurse:   'พยาบาล — ค้นหาผู้ป่วยและกรอก/แก้ไขค่าความดันโลหิต',
  medtech: 'เทคนิคการแพทย์ — ค้นหาผู้ป่วยและกรอก/แก้ไขผลตรวจทางห้องปฏิบัติการ',
}

export default function LoginPage({
  onLogin,
}: {
  onLogin: (name: string, role: UserRole) => void
}) {
  const [staffId, setStaffId] = useState('')
  const [pass,    setPass]    = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const doLogin = async () => {
    if (!staffId.trim() || !pass.trim()) {
      setError('กรุณากรอกรหัสพนักงานและรหัสผ่าน'); return
    }
    setLoading(true); setError('')
    await new Promise(r => setTimeout(r, 400))
    const found = DEMO_ACCOUNTS.find(
      a => a.staffId.toLowerCase() === staffId.trim().toLowerCase() && a.pass === pass
    )
    if (found) {
      onLogin(found.name, found.role)
    } else {
      setError('รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง')
      setLoading(false)
    }
  }

  const quickLogin = (a: Account) => {
    setStaffId(a.staffId); setPass(a.pass); setError('')
  }

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') doLogin() }

  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <div className={styles.loginTitle}>HyperSense</div>
        <div className={styles.loginSub}>
          แพลตฟอร์มคาดการณ์ความเสี่ยงโรคและ<br />วิเคราะห์การใช้ยาในผู้ป่วยความดันโลหิต<br />
          Intelligent Hypertension Prediction and
          Medication Analysis Platform
        </div>

        <div className={styles.loginField}>
          <label className={styles.loginLabel}>รหัสพนักงาน (Staff ID)</label>
          <input
            className={styles.loginInput}
            type="text"
            placeholder="เช่น DR001, NR001, MT001"
            value={staffId}
            onChange={e => setStaffId(e.target.value)}
            onKeyDown={handleKey}
            autoComplete="username"
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
            autoComplete="current-password"
          />
        </div>

        {error && <div className={styles.loginErr}>{error}</div>}

        <button className={styles.loginBtn} onClick={doLogin} disabled={loading}>
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>

        {/* Quick login chips */}
        <div className={styles.loginHint}>
          <div className={styles.loginHintT}>บัญชีทดสอบ — คลิกเพื่อกรอกอัตโนมัติ (รหัสผ่านทุกบัญชี: 1234)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {DEMO_ACCOUNTS.map(a => (
              <button
                key={a.staffId}
                onClick={() => quickLogin(a)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', borderRadius: 20, cursor: 'pointer',
                  background: staffId === a.staffId ? `${a.badgeColor}18` : 'var(--bg3, #f5f5f5)',
                  border: `1.5px solid ${staffId === a.staffId ? `${a.badgeColor}60` : 'var(--border, #e5e7eb)'}`,
                  transition: 'all .15s',
                }}
              >
                <span style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 20,
                  background: `${a.badgeColor}18`, color: a.badgeColor,
                  border: `1px solid ${a.badgeColor}40`, fontWeight: 700, whiteSpace: 'nowrap',
                }}>{a.staffId}</span>
                <span style={{ fontSize: 12, color: '#374151' }}>{a.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Role permission table */}
        <div style={{
          marginTop: 14, padding: '12px 14px',
          background: '#f8fffe', border: '1px solid rgba(0,168,114,.2)',
          borderRadius: 8, textAlign: 'left', fontSize: 11,
        }}>
          <div style={{ fontWeight: 700, color: '#00a872', marginBottom: 6, fontSize: 12 }}>สิทธิ์การเข้าถึงตาม Role</div>
          {(Object.entries(ROLE_TH) as [UserRole, string][]).map(([r, label]) => (
            <div key={r} style={{ display: 'flex', gap: 8, marginBottom: 4, color: '#374151', lineHeight: 1.5 }}>
              <span style={{ color: '#00a872', fontFamily: 'monospace', minWidth: 72, fontWeight: 600 }}>{r}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
