import { Step, Mode } from '@/app/page'
import styles from './StepIndicator.module.css'

const ANALYZE_STEPS = ['ค้นหา', 'ข้อมูล', 'โหมด', 'DNA', 'วิเคราะห์', 'การรักษา', 'ส่งต่อ', 'ยืนยัน']
const REFER_STEPS   = ['ค้นหา', 'ข้อมูล', 'โหมด', 'ส่งต่อ', 'ยืนยัน']

function getStepIndex(step: Step, mode: Mode): number {
  if (mode === 'refer') {
    if (step <= 3) return step - 1
    if (step === 4) return 3
    return 4
  }
  return step - 1
}

export default function StepIndicator({ step, mode }: { step: Step; mode: Mode }) {
  const labels = mode === 'refer' ? REFER_STEPS : ANALYZE_STEPS
  const activeIdx = getStepIndex(step, mode)

  return (
    <div className={styles.steps}>
      {labels.map((label, i) => (
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
