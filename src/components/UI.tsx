import styles from './UI.module.css'

export function Card({ children }: { children: React.ReactNode }) {
  return <div className={styles.card}>{children}</div>
}
export function Label({ children }: { children: React.ReactNode }) {
  return <div className={styles.lbl}>{children}</div>
}
export function Title({ children }: { children: React.ReactNode }) {
  return <div className={styles.ttl}>{children}</div>
}
export function Desc({ children }: { children: React.ReactNode }) {
  return <div className={styles.desc}>{children}</div>
}
export function BtnRow({ children }: { children: React.ReactNode }) {
  return <div className={styles.btnRow}>{children}</div>
}
export function Divider() {
  return <div className={styles.divider} />
}
export function DnaBadge() {
  return <span className={styles.dnaBadge}><span className={styles.pulse} />DNA</span>
}
export function AiPanel({ children, purple }: { children: React.ReactNode; purple?: boolean }) {
  return <div className={[styles.aiPanel, purple ? styles.aiPurple : ''].join(' ')}>{children}</div>
}
