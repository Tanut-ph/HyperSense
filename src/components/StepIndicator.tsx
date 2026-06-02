import styles from './StepIndicator.module.css'

const STEPS = ['ค้นหาผู้ป่วย', 'ข้อมูลผู้ป่วย', 'BP Trend', 'ความเสี่ยง + ยา', 'สรุปและบันทึก']

export type CardioStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

export default function CardioStepIndicator({ step }: { step: CardioStep }) {
  const activeIdx = step - 2   // step 1 = login (hidden), step 2 = search (index 0)

  if (step < 2) return null

  return (
    <div className={styles.steps}>
      {STEPS.map((label, i) => (
        <div key={i} className={[
          styles.stp,
          activeIdx === i ? styles.active : '',
          activeIdx > i  ? styles.done  : '',
        ].join(' ')}>
          <span className={styles.num}>0{i + 1}</span>
          {label}
        </div>
      ))}
    </div>
  )
}
