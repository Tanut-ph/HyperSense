'use client'
import { useEffect, useState, useRef } from 'react'
import { Patient } from '@/lib/patient'
import { Card, Label, Title, Desc, BtnRow, Divider, DnaBadge, AiPanel } from '@/components/UI'
import styles from './Steps.module.css'

function riskClass(pct: number) {
  if (pct >= 60) return 'Hi'
  if (pct >= 30) return 'Md'
  return 'Lo'
}

function riskEmoji(pct: number) {
  if (pct >= 60) return { emoji: '🔴', label: 'ความเสี่ยงสูง', css: styles.rpctHi }
  if (pct >= 30) return { emoji: '🟡', label: 'ความเสี่ยงปานกลาง', css: styles.rpctMd }
  return              { emoji: '🟢', label: 'ความเสี่ยงต่ำ', css: styles.rpctLo }
}

function buildRisks(p: Patient) {
  return [
    {
      key: 'diabetes',
      name: 'เบาหวานประเภท 2 (T2DM)',
      gene: 'rs7903146·TCF7L2 · rs1801282·PPARG',
      pct: p.risks.diabetes,
      cls: riskClass(p.risks.diabetes),
      dna: true,
    },
    {
      key: 'crc',
      name: 'มะเร็งลำไส้ใหญ่ (Colorectal Cancer)',
      gene: 'rs6983267·MYC · rs4779584·SMAD7',
      pct: p.risks.crc,
      cls: riskClass(p.risks.crc),
      dna: true,
    },
    {
      key: 'dyslip',
      name: 'ไขมันในเลือดสูง (Dyslipidemia)',
      gene: 'rs1800588·LIPC · Clinical data',
      pct: p.risks.dyslip,
      cls: riskClass(p.risks.dyslip),
      dna: false,
    },
  ]
}

export default function AnalysisPage({ patient: p, onBack, onNext }: {
  patient: Patient
  onBack: () => void
  onNext: (d: Record<string, string>) => void
}) {
  const [bars, setBars] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(true)
  const [note, setNote] = useState('')
  const [followUp, setFollowUp] = useState('3 เดือน')
  const [showEdit, setShowEdit] = useState(false)
  const [editNote, setEditNote] = useState('')
  const risks = buildRisks(p)
  const called = useRef(false)

  useEffect(() => {
    setTimeout(() => setBars(true), 300)
    if (called.current) return
    called.current = true
    fetchAI()
  }, [])

  const fetchAI = async () => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: p,
          visit: {
            bloodPressure: p.bp,
            glucose: p.glucose,
            cholesterol: p.chol,
            bmi: p.bmi,
            smoking: p.smoking,
            currentMeds: p.meds,
          },
          genetic: { snps: p.snps, risks: p.risks },
        }),
      })
      const raw = await res.text()
      let result
      try { result = JSON.parse(raw) } catch { throw new Error(raw || 'AI ไม่ตอบสนอง') }
      if (!res.ok || !result.ok) throw new Error(result.error || 'AI วิเคราะห์ไม่สำเร็จ')
      typeWriter(result.analysis || 'ไม่สามารถวิเคราะห์ได้')
    } catch (err: any) {
      typeWriter('ไม่สามารถเชื่อมต่อ AI ได้ในขณะนี้ กรุณาตรวจสอบ API key')
    }
  }

  const typeWriter = (text: string) => {
    setAiLoading(false)
    let i = 0
    const iv = setInterval(() => {
      if (i < text.length) { setAiText(text.slice(0, ++i)) }
      else clearInterval(iv)
    }, 14)
  }

  const handleNext = () => {
    const topRisk = [...risks].sort((a, b) => b.pct - a.pct)[0]
    onNext({
      type: 'analyze',
      patientDbId: p.dbId,
      patient: `${p.name} (${p.id})`,
      note,
      followUp,
      aiSummary: aiText,
      topRisk: `${topRisk.name} — ${topRisk.pct}%`,
      snp: p.snps.length
        ? `VCF verified · ${p.snps.length} SNP markers`
        : 'ยังไม่มีข้อมูล SNP ในฐานข้อมูล',
      editNote,
    })
  }

  return (
    <Card>
      <Label>ขั้นตอนที่ 05 — ผลการวิเคราะห์</Label>
      <Title>ผลวิเคราะห์ความเสี่ยงโรค</Title>
      <Desc>รวมจาก ML Clinical Model + Polygenic Risk Score (PRS) จาก DNA <DnaBadge /></Desc>

      {/* Currently treating */}
      <Label>โรคที่กำลังรักษา</Label>
      <div className={styles.curDisease}>
        <div className={styles.curName}>ความดันโลหิตสูง (Hypertension)</div>
        <div className={[styles.badge, styles.badgeOn].join(' ')}>กำลังรักษา</div>
      </div>
      <div className={styles.drugs}>
        <span className={styles.dtag}>Amlodipine 5mg</span>
        <span className={styles.dtag}>ลดเกลือ &lt;2g/วัน</span>
      </div>

      <Divider />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Label>ความเสี่ยงที่ตรวจพบ (DNA + Clinical)</Label>
        <button className={styles.editBtn} onClick={() => setShowEdit(v => !v)}>
          ✏️ {showEdit ? 'ปิดแก้ไข' : 'แก้ไขข้อมูล'}
        </button>
      </div>

      {/* Edit panel */}
      {showEdit && (
        <div style={{ padding: '14px 16px', background: 'var(--bg3)', borderRadius: 'var(--rs)', border: '1.5px solid var(--border2)', marginBottom: 14 }}>
          <div className={styles.eLbl}>บันทึกการแก้ไขของแพทย์</div>
          <textarea
            className={styles.editTextarea}
            placeholder="ระบุเหตุผลในการแก้ไข / ข้อสังเกตเพิ่มเติม..."
            value={editNote}
            onChange={e => setEditNote(e.target.value)}
          />
        </div>
      )}

      {/* Risk cards with emoji */}
      {risks.map(r => {
        const em = riskEmoji(r.pct)
        return (
          <div key={r.key} className={styles.rcard}>
            <div className={styles.rcardHdr}>
              <div className={styles.rcInfo}>
                <div className={styles.rcName}>{r.name}</div>
                <div className={styles.rcGene}>{r.gene} {r.dna && <DnaBadge />}</div>
              </div>
              <div className={[styles.rpctWrap, em.css].join(' ')}>
                <div className={styles.rpctEmoji}>{em.emoji}</div>
                <div className={styles.rpctLbl}>{em.label}</div>
              </div>
            </div>
            <div className={styles.rbarBg}>
              <div
                className={[styles.rbarFill, styles[`rbar${r.cls}`]].join(' ')}
                style={{ width: bars ? `${r.pct}%` : '0%' }}
              />
            </div>
          </div>
        )
      })}

      {/* AI analysis */}
      <AiPanel>
        <div className={styles.aiHdr}>
          <span className={styles.aiIcon}>✦</span>
          <span className={styles.aiTitle}>AI CLINICAL ANALYSIS</span>
        </div>
        <div className={styles.aiBody}>
          {aiLoading
            ? <div className={styles.aiLoading}>
                กำลังวิเคราะห์ข้อมูลคลินิกและ DNA
                <span className={styles.dots}><span>.</span><span>.</span><span>.</span></span>
              </div>
            : aiText}
        </div>
      </AiPanel>

      {/* Doctor notes + follow-up */}
      <div className={styles.editSec}>
        <label className={styles.eLbl}>หมายเหตุแพทย์</label>
        <textarea
          className={styles.editTextarea}
          placeholder="เพิ่มหมายเหตุ ปรับแผนการรักษา..."
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        <div className={styles.mt12}>
          <label className={styles.eLbl}>วันนัดหมายติดตาม</label>
          <select className={styles.editSelect} value={followUp} onChange={e => setFollowUp(e.target.value)}>
            <option>1 เดือน</option>
            <option>3 เดือน</option>
            <option>6 เดือน</option>
            <option>1 ปี</option>
          </select>
        </div>
      </div>

      <BtnRow>
        <button className={styles.btnS} onClick={onBack}>← กลับ</button>
        <button className={styles.btnP} onClick={handleNext}>ดูยาและการรักษา →</button>
      </BtnRow>
    </Card>
  )
}
