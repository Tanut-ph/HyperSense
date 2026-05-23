'use client'
import { Mode } from '@/app/page'
import { Card, Label, Title, Desc, BtnRow } from '@/components/UI'
import styles from './Steps.module.css'

export default function ModePage({ mode, onSelect, onBack, onNext }: {
  mode: Mode; onSelect: (m: Mode) => void; onBack: () => void; onNext: () => void
}) {
  return (
    <Card>
      <Label>ขั้นตอนที่ 03</Label>
      <Title>เลือกโหมดการดำเนินการ</Title>
      <Desc>เลือกว่าต้องการวิเคราะห์ความเสี่ยงโรคด้วย DNA หรือส่งต่อผู้ป่วยไปยังโรงพยาบาลอื่น</Desc>
      <div className={styles.modeGrid}>
        <div className={[styles.modeCard, mode === 'analyze' ? styles.modeSelA : ''].join(' ')} onClick={() => onSelect('analyze')}>
          <div className={styles.modeIc}>🧬</div>
          <div className={styles.modeT}>วิเคราะห์ความเสี่ยงโรค</div>
          <div className={styles.modeD}>อัปโหลด DNA (VCF) ร่วมกับข้อมูลคลินิก ให้ AI วิเคราะห์ความเสี่ยงและแนะนำการรักษา</div>
        </div>
        <div className={[styles.modeCard, mode === 'refer' ? styles.modeSelR : ''].join(' ')} onClick={() => onSelect('refer')}>
          <div className={styles.modeIc}>📋</div>
          <div className={styles.modeT}>ส่งต่อผู้ป่วย</div>
          <div className={styles.modeD}>ส่งประวัติการรักษาไปยังโรงพยาบาลอื่น พร้อมขอความยินยอมจากผู้ป่วยและ AI สรุปเอกสาร</div>
        </div>
      </div>
      <BtnRow>
        <button className={styles.btnS} onClick={onBack}>← กลับ</button>
        <button className={styles.btnP} onClick={onNext} disabled={!mode}>ดำเนินการต่อ →</button>
      </BtnRow>
    </Card>
  )
}
