'use client'

import styles from './Header.module.css'
import { supabase } from '@/lib/supabase'

export default function Header({ doctorName, onLogout }: { doctorName?: string; onLogout?: () => void }) {
  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut()
    onLogout?.()
  }

  return (
    <div className={styles.hdr}>
      <div className={styles.logo}>Gx</div>

      <div className={styles.name}>GenomeMed AI</div>

      {doctorName && (
        <div className={styles.doctorInfo}>
          <div className={styles.doctorAvatar}>👨‍⚕️</div>
          <span>{doctorName}</span>
        </div>
      )}

      <div className={styles.pill} style={doctorName ? {} : { marginLeft: 'auto' }}>
        <span className={styles.pulse} />
        AI LIVE
      </div>

      {onLogout && (
        <button className={styles.logoutBtn} onClick={handleLogout}>
          ออกจากระบบ
        </button>
      )}
    </div>
  )
}