'use client'

import styles from './Header.module.css'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Header({ doctorName }: { doctorName?: string }) {
  const router = useRouter()

  const handleLogout = async () => {
    if (!supabase) return
 
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className={styles.hdr}>
      <div className={styles.logo}>Gx</div>

      <div
        className={styles.name}
        onClick={handleLogout}
        style={{ cursor: 'pointer' }}
      >
        GenomeMed AI
      </div>

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
    </div>
  )
}