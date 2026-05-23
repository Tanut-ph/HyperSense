'use client'
import { useState } from 'react'
import { Card, Label, Title, Desc, BtnRow } from '@/components/UI'
import styles from './Steps.module.css'

export default function SearchPage({
  onSearch,
  loading = false,
  error = '',
}: {
  onSearch: (params: { patientCode?: string; nationalId?: string }) => void
  loading?: boolean
  error?: string
}) {
  const [pid, setPid] = useState('')
  const [nid, setNid] = useState('')

  const search = () => {
    if (!pid.trim() && !nid.trim()) {
      alert('กรุณากรอกรหัสผู้ป่วยหรือเลขบัตรประชาชน')
      return
    }
    onSearch({ patientCode: pid, nationalId: nid })
  }

  return (
    <Card>
      <Label>ขั้นตอนที่ 01</Label>
      <Title>ค้นหาผู้ป่วย</Title>
      <Desc>กรอกรหัสผู้ป่วยหรือเลขบัตรประชาชนเพื่อดึงข้อมูลจริงจาก Supabase เท่านั้น</Desc>
      <div className={styles.row2}>
        <div className={styles.ig}>
          <label>รหัสผู้ป่วย</label>
          <input type="text" placeholder="PT-XXXXXXXX" value={pid} onChange={e => setPid(e.target.value)} />
        </div>
        <div className={styles.ig}>
          <label>เลขบัตรประชาชน</label>
          <input type="text" placeholder="X-XXXX-XXXXX-XX-X" value={nid} onChange={e => setNid(e.target.value)} />
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: 12,
          padding: '10px 12px',
          border: '1px solid rgba(248,113,113,.35)',
          borderRadius: 'var(--rs)',
          background: 'rgba(248,113,113,.08)',
          color: 'var(--danger)',
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          {error}
        </div>
      )}

      <BtnRow>
        <button className={styles.btnP} onClick={search} disabled={loading}>
          {loading ? 'กำลังค้นหา...' : 'ค้นหาผู้ป่วย →'}
        </button>
      </BtnRow>
    </Card>
  )
}
