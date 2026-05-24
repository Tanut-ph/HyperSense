'use client'
import { useState } from 'react'
import { Mode } from '@/app/page'
import { Card, Label, BtnRow, Divider } from '@/components/UI'
import { saveTreatmentRecord } from '@/lib/treatment'
import styles from './Steps.module.css'

export default function ConfirmPage({
  mode,
  data,
  onReset,
  onBack,
}: {
  mode: Mode
  data: Record<string, string>
  onReset: () => void
  onBack?: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const recId = savedId || `REC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`
  const date = new Date().toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const patientLabel = data.patient || 'ไม่ระบุผู้ป่วย'

  type Row = { l: string; v: string; hl?: boolean; dna?: boolean }
  const rows: Row[] =
    mode === 'analyze'
      ? [
          { l: 'วันที่บันทึก',    v: date },
          { l: 'DNA Analysis',    v: data.snp || '-',          dna: true },
          { l: 'ความเสี่ยงสูงสุด', v: data.topRisk || '-',       hl: true },
          { l: 'วันนัดหมาย',      v: data.followUp || '-' },
          { l: 'ส่งต่อไป',        v: data.hospital || 'ไม่ได้ส่งต่อ' },
          { l: 'แผนก',            v: data.dept || '-' },
          { l: 'สิทธิ์การรักษา', v: data.insurance || '-' },
          ...(data.note ? [{ l: 'หมายเหตุแพทย์', v: data.note }] : []),
        ]
      : [
          { l: 'วันที่ส่งต่อ',    v: date },
          { l: 'ต้นทาง',          v: data.fromHospital || '-' },
          { l: 'ส่งต่อไป',        v: data.hospital || '-',     hl: true },
          { l: 'แผนก',            v: data.dept || '-' },
          { l: 'สิทธิ์การรักษา', v: data.insurance || '-' },
          { l: 'AI Referral',     v: data.aiSummary ? 'สรุปแล้ว ✓' : '-', dna: true },
          { l: 'ความยินยอม',      v: 'ผู้ป่วยยินยอมแล้ว ✅' },
        ]

  async function handleSave() {
    if (savedId) return savedId
    if (!data.patientDbId) throw new Error('ไม่พบ patientDbId กรุณาค้นหาผู้ป่วยจาก Supabase ก่อน')
    const result = await saveTreatmentRecord({
      patientId: data.patientDbId,
      mode,
      aiSummary:         data.aiSummary || '',
      doctorNote:        data.note || '',
      diagnosisNote:     data.topRisk || '',
      drugNote:          data.snp || '',
      appointmentDate:   data.followUpDate || null,
      appointmentTime:   data.followUpTime || null,
      referralHospital:  data.hospital || null,
      referralDepartment:data.dept || null,
    })
    setSavedId(result.id)
    return result.id
  }

  async function handleNewPatient() {
    try { setSaving(true); setError(''); await handleSave(); onReset() }
    catch (err: any) { setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  async function handlePrint() {
    try {
      setSaving(true); setError('')
      await handleSave()
      setTimeout(() => window.print(), 300)
    } catch (err: any) { setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  return (
    <Card>
      {/* Green checkmark banner */}
      <div className={styles.okBanner}>
        <div className={styles.okCircle}>
          <svg className={styles.okCheckSvg} viewBox="0 0 50 50" fill="none">
            <polyline
              points="10,27 20,38 40,16"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 100,
                strokeDashoffset: 0,
                animation: 'checkDraw 0.6s ease 0.2s both',
              }}
            />
          </svg>
        </div>
        <div className={styles.okT}>
          {mode === 'analyze' ? 'สรุปผลการรักษา' : 'สรุปการส่งต่อผู้ป่วย'}
        </div>
        <div className={styles.okD}>
          {mode === 'analyze'
            ? 'ตรวจสอบข้อมูลก่อนบันทึกหรือพิมพ์รายงาน'
            : 'ตรวจสอบข้อมูลการส่งต่อก่อนบันทึกหรือพิมพ์รายงาน'}
        </div>
        <div className={styles.okId}>{recId}</div>
      </div>

      <Divider />

      {/* Patient name highlight */}
      <div className={styles.cfPatient}>
        <span style={{ fontSize: 22 }}>👤</span>
        <div>
          <div>ผู้ป่วย: {patientLabel}</div>
        </div>
      </div>

      <Label>สรุปบันทึก</Label>
      {rows.map((r, i) => (
        <div key={i} className={styles.cfRow}>
          <span className={styles.cfL}>{r.l}</span>
          <span className={[
            styles.cfV,
            r.hl  ? styles.cfVHl  : '',
            r.dna ? styles.cfVDna : '',
          ].join(' ')}>
            {r.v}
          </span>
        </div>
      ))}

      {error && (
        <div style={{ marginTop: 12, color: 'var(--danger)', fontSize: 14 }}>
          ⚠️ {error}
        </div>
      )}

      <BtnRow>
        {onBack && (
          <button className={styles.btnS} onClick={onBack} disabled={saving}>← กลับ</button>
        )}
        <button className={styles.btnS} onClick={handleNewPatient} disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'เริ่มผู้ป่วยใหม่'}
        </button>
        <button className={styles.btnG} onClick={handlePrint} disabled={saving}>
          {saving ? 'กำลังบันทึก...' : '🖨️ พิมพ์รายงาน'}
        </button>
      </BtnRow>
    </Card>
  )
}
