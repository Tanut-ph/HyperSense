'use client'
import { useState } from 'react'
import { Card, Label, Title, Desc, BtnRow } from '@/components/UI'
import styles from './Steps.module.css'

const SNP_STEPS = [
  'PARSING VCF FILE...', 'READING CHROMOSOME DATA...', 'DETECTING VARIANTS...',
  'CHECKING rs7903146 (TCF7L2) ✓', 'CHECKING rs1801282 (PPARG) ✓',
  'CHECKING rs6983267 (MYC) ✓', 'CHECKING rs4779584 (SMAD7) ✓',
  'CHECKING rs1800588 (LIPC) ✓', 'COMPUTING PRS SCORES...',
  'MERGING WITH CLINICAL DATA...', 'ANALYSIS READY ✓'
]

export default function DnaUploadPage({ vcfDone, onVcfDone, onBack, onNext }: {
  vcfDone: boolean; onVcfDone: () => void; onBack: () => void; onNext: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [lbl, setLbl] = useState('')
  const [log, setLog] = useState<string[]>([])

  const simulate = () => {
    if (vcfDone || loading) return
    setLoading(true)
    let i = 0
    const iv = setInterval(() => {
      if (i < SNP_STEPS.length) {
        setLbl(SNP_STEPS[i])
        if (i > 2 && i < 9) setLog(prev => [...prev, SNP_STEPS[i - 1]])
        i++
      } else {
        clearInterval(iv)
        setLoading(false)
        onVcfDone()
      }
    }, 380)
  }

  return (
    <Card>
      <Label>ขั้นตอนที่ 04</Label>
      <Title>อัปโหลดข้อมูล DNA</Title>
      <Desc>อัปโหลดไฟล์ VCF (Variant Call Format) ระบบจะตรวจ SNP variants ที่เกี่ยวข้องกับความเสี่ยงโรค</Desc>

      {!loading && (
        <div className={[styles.upzone, vcfDone ? styles.upzoneDone : ''].join(' ')} onClick={simulate}>
          <div className={[styles.upIc, vcfDone ? styles.upIcDone : ''].join(' ')}>
            {vcfDone ? '✓' : '🧬'}
          </div>
          <div className={styles.upT}>{vcfDone ? 'sample_PT20240087.vcf' : 'คลิกเพื่ออัปโหลด หรือลากไฟล์มาวาง'}</div>
          <div className={styles.upD}>{vcfDone ? '5 disease-linked SNP clusters detected' : 'รองรับไฟล์ .vcf เท่านั้น — ข้อมูลจะถูกเข้ารหัส'}</div>
          {!vcfDone && <div className={styles.upTag}>.VCF FORMAT</div>}
        </div>
      )}

      {loading && (
        <div className={styles.dnaWrap}>
          <div className={styles.dnaLbl}>{lbl}</div>
          <div className={styles.dnaRow}>
            <div className={styles.strand}>
              {['A','T','G','C','A'].map((b,i) => (
                <div key={i} className={[styles.base, styles[`base${b}`]].join(' ')} style={{ animationDelay: `${i*.18}s` }} />
              ))}
            </div>
            <div className={styles.bonds}>
              {[0,1,2,3,4].map(i => <div key={i} className={styles.bond} style={{ animationDelay: `${i*.18}s` }} />)}
            </div>
            <div className={styles.strand}>
              {['T','A','C','G','T'].map((b,i) => (
                <div key={i} className={[styles.base, styles[`base${b}`]].join(' ')} style={{ animationDelay: `${i*.18+.09}s` }} />
              ))}
            </div>
          </div>
          <div className={styles.snpLog}>{log.map((l,i) => <div key={i}>{l}</div>)}</div>
        </div>
      )}

      <BtnRow>
        <button className={styles.btnS} onClick={onBack}>← กลับ</button>
        <button className={styles.btnP} onClick={onNext} disabled={!vcfDone}>วิเคราะห์ด้วย AI →</button>
      </BtnRow>
    </Card>
  )
}
