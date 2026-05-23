'use client'
import { useState } from 'react'
import { Patient } from '@/lib/patient'
import { Card, Label, Title, Desc, BtnRow, AiPanel, Divider } from '@/components/UI'
import styles from './Steps.module.css'

const SOURCE_HOSPITALS = [
  'โรงพยาบาลราชวิถี',
  'โรงพยาบาลนพรัตนราชธานี',
  'โรงพยาบาลเลิดสิน',
  'โรงพยาบาลสงขลานครินทร์',
  'โรงพยาบาลมหาราชนครเชียงใหม่',
  'โรงพยาบาลศรีนครินทร์ ขอนแก่น',
]

const TARGET_HOSPITALS = [
  'โรงพยาบาลศิริราช',
  'โรงพยาบาลรามาธิบดี',
  'โรงพยาบาลจุฬาลงกรณ์',
  'โรงพยาบาลพระมงกุฎเกล้า',
  'โรงพยาบาลภูมิพลอดุลยเดช',
  'โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ',
  'โรงพยาบาลสมเด็จพระปิ่นเกล้า',
  'โรงพยาบาลมหาวิทยาลัยนเรศวร',
]

const DEPARTMENTS = [
  'อายุรกรรม',
  'ต่อมไร้ท่อ (Endocrinology)',
  'โรคหัวใจ (Cardiology)',
  'มะเร็งวิทยา (Oncology)',
  'ระบบทางเดินอาหาร (Gastroenterology)',
  'พันธุศาสตร์การแพทย์ (Medical Genetics)',
  'เวชกรรมป้องกัน (Preventive Medicine)',
  'ศัลยกรรม (Surgery)',
]

const INSURANCE_TYPES = [
  'สิทธิ์ 30 บาท / บัตรทอง (UC)',
  'สวัสดิการข้าราชการ (CSMBS)',
  'ประกันสังคม (SSO)',
  'ประกันชีวิต / ประกันสุขภาพเอกชน',
  'จ่ายเอง (OPD/IPD)',
  'บัตรทองต่างด้าว',
]

export default function ReferPage({
  patient: p,
  onBack,
  onConfirm,
}: {
  patient: Patient
  onBack: () => void
  onConfirm: (d: Record<string, string>) => void
}) {
  const [sourceHospital, setSourceHospital] = useState(SOURCE_HOSPITALS[0])
  const [hospital, setHospital] = useState(TARGET_HOSPITALS[0])
  const [dept, setDept] = useState(DEPARTMENTS[0])
  const [reason, setReason] = useState('')
  const [insurance, setInsurance] = useState(INSURANCE_TYPES[0])
  const [insuranceId, setInsuranceId] = useState('')
  const [consent, setConsent] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDone, setAiDone] = useState(false)

  const doAI = async () => {
    setAiLoading(true)
    setAiText('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'refer',
          data: {
            ...p,
            fromHospital: sourceHospital,
            hospital,
            dept,
            insurance,
            reason: reason || 'ส่งต่อเพื่อการรักษาต่อเนื่อง',
          },
        }),
      })
      const data = await res.json()
      typeWriter(data.text || data.analysis || 'ไม่สามารถสร้างสรุปได้')
    } catch {
      setAiText('ไม่สามารถเชื่อมต่อ AI ได้')
      setAiLoading(false)
      setAiDone(true)
    }
  }

  const typeWriter = (text: string) => {
    setAiLoading(false)
    let i = 0
    const iv = setInterval(() => {
      if (i < text.length) { setAiText(text.slice(0, ++i)) }
      else { clearInterval(iv); setAiDone(true) }
    }, 14)
  }

  const handleConfirm = () => {
    if (!consent) { alert('กรุณาขอความยินยอมจากผู้ป่วยก่อน'); return }
    onConfirm({
      type: 'refer',
      patient: `${p.name} (${p.id})`,
      patientDbId: p.dbId,
      fromHospital: sourceHospital,
      hospital,
      dept,
      insurance,
      insuranceId,
      aiSummary: aiText,
      reason,
    })
  }

  const needsId = insurance.includes('ประกันชีวิต') || insurance.includes('เอกชน')

  return (
    <Card>
      <Label>ส่งต่อผู้ป่วย</Label>
      <Title>ข้อมูลการส่งต่อ</Title>
      <Desc>ระบุโรงพยาบาลต้นทาง ปลายทาง และสิทธิ์การรักษา AI จะสรุปประวัติและเตรียมเอกสารให้อัตโนมัติ</Desc>

      {/* Patient name confirmation */}
      <div style={{
        padding: '12px 16px', background: 'var(--bg3)', borderRadius: 'var(--rs)',
        border: '1.5px solid var(--border2)', marginBottom: 18,
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 600
      }}>
        <span style={{ fontSize: 22 }}>👤</span>
        <div>
          <div style={{ color: 'var(--text)' }}>{p.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 400 }}>{p.id} · {p.nationalId}</div>
        </div>
      </div>

      {/* Source hospital */}
      <div className={styles.sectionTitle}>🏥 ต้นทาง</div>
      <div className={styles.ig} style={{ marginBottom: 14 }}>
        <label>โรงพยาบาลต้นทาง (ที่ส่ง)</label>
        <select value={sourceHospital} onChange={e => setSourceHospital(e.target.value)}>
          {SOURCE_HOSPITALS.map(h => <option key={h}>{h}</option>)}
        </select>
      </div>

      {/* Target hospital + dept */}
      <div className={styles.sectionTitle}>🎯 ปลายทาง</div>
      <div className={styles.ig} style={{ marginBottom: 12 }}>
        <label>โรงพยาบาลปลายทาง</label>
        <select value={hospital} onChange={e => setHospital(e.target.value)}>
          {TARGET_HOSPITALS.map(h => <option key={h}>{h}</option>)}
        </select>
      </div>
      <div className={styles.ig} style={{ marginBottom: 14 }}>
        <label>แผนก</label>
        <select value={dept} onChange={e => setDept(e.target.value)}>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* Insurance */}
      <div className={styles.sectionTitle}>🛡️ สิทธิ์การรักษา (ประกัน)</div>
      <div className={styles.ig} style={{ marginBottom: 12 }}>
        <label>ประเภทสิทธิ์</label>
        <select value={insurance} onChange={e => setInsurance(e.target.value)}>
          {INSURANCE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      {needsId && (
        <div className={styles.ig} style={{ marginBottom: 14 }}>
          <label>เลขที่กรมธรรม์ / บัตรสมาชิก</label>
          <input
            type="text"
            placeholder="กรอกเลขกรมธรรม์..."
            value={insuranceId}
            onChange={e => setInsuranceId(e.target.value)}
          />
        </div>
      )}

      {/* Reason */}
      <div className={styles.ig} style={{ marginBottom: 14 }}>
        <label>เหตุผลการส่งต่อ</label>
        <textarea placeholder="ระบุเหตุผลและความเร่งด่วน..." value={reason} onChange={e => setReason(e.target.value)} />
      </div>

      {/* Consent */}
      <div className={styles.consentBox}>
        <div className={styles.consentNote}>
          ⚠️ <strong>การขอความยินยอมจากผู้ป่วย</strong><br />
          การส่งต่อข้อมูลผู้ป่วยต้องได้รับความยินยอมก่อนเสมอ ตาม พ.ร.บ.สุขภาพแห่งชาติ มาตรา 7
        </div>
        <label className={styles.consentLabel}>
          <input
            type="checkbox"
            className={styles.consentCheck}
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
          />
          ผู้ป่วย <strong style={{ color: 'var(--accent)' }}>{p.name}</strong> ยินยอมให้ส่งต่อข้อมูลแล้ว
        </label>
      </div>

      <button
        className={[styles.btnP, styles.btnFull].join(' ')}
        onClick={doAI}
        disabled={aiLoading}
      >
        {aiLoading ? '✦ กำลังสรุป...' : '✦ ให้ AI สรุปและเตรียมเอกสารส่งต่อ'}
      </button>

      {(aiLoading || aiText) && (
        <AiPanel purple>
          <div className={styles.aiHdr}>
            <span className={styles.aiIcon}>✦</span>
            <span className={[styles.aiTitle, styles.aiTitleP].join(' ')}>AI REFERRAL SUMMARY</span>
          </div>
          <div className={styles.aiBody}>
            {aiLoading
              ? <div className={styles.aiLoading}>
                  กำลังเตรียมเอกสาร
                  <span className={styles.dots}><span>.</span><span>.</span><span>.</span></span>
                </div>
              : aiText}
          </div>
        </AiPanel>
      )}

      <BtnRow>
        <button className={styles.btnS} onClick={onBack}>← กลับ</button>
        <button
          className={styles.btnG}
          onClick={handleConfirm}
          disabled={!aiDone || !consent}
        >
          ยืนยันและส่งต่อ →
        </button>
      </BtnRow>
    </Card>
  )
}
