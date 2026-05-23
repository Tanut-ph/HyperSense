'use client'
import { useState } from 'react'
import styles from './Steps.module.css'

const DEMO_ACCOUNTS = [
  { user: 'doctor1', pass: '1234', name: 'นพ. วิชาญ สุขใจ', role: 'อายุรแพทย์', dept: 'อายุรกรรม' },
  { user: 'doctor2', pass: '1234', name: 'พญ. สมหญิง รักษาดี', role: 'แพทย์เฉพาะทาง', dept: 'ต่อมไร้ท่อ' },
  { user: 'admin',   pass: '1234', name: 'ผู้ดูแลระบบ',        role: 'System Admin',  dept: 'IT' },
]

export default function LoginPage({ onLogin }: { onLogin: (name: string) => void }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const doLogin = async () => {
    if (!user.trim() || !pass.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน')
      return
    }
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 600))
    const found = DEMO_ACCOUNTS.find(a => a.user === user.trim() && a.pass === pass)
    if (found) {
      onLogin(found.name)
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doLogin()
  }

  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <div className={styles.loginLogo}>Gx</div>
        <div className={styles.loginTitle}>GenomeMed AI</div>
        <div className={styles.loginSub}>ระบบวิเคราะห์ความเสี่ยงและส่งต่อผู้ป่วย<br />สำหรับบุคลากรทางการแพทย์</div>

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

        {error && <div className={styles.loginErr}>⚠️ {error}</div>}

        <button className={styles.loginBtn} onClick={doLogin} disabled={loading}>
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ →'}
        </button>

        <div className={styles.loginHint}>
          <div className={styles.loginHintT}>บัญชีทดสอบ (Demo)</div>
          <div>doctor1 / 1234 — นพ. วิชาญ สุขใจ</div>
          <div>doctor2 / 1234 — พญ. สมหญิง รักษาดี</div>
        </div>
      </div>
    </div>
  )
}
