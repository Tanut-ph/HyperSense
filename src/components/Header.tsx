'use client'

import type { UserRole } from '@/lib/types'
import styles from './Header.module.css'
import { supabase } from '@/lib/supabase'

const ROLE_LABEL: Record<UserRole, string> = {
  doctor:  'แพทย์',
  nurse:   'พยาบาล',
  medtech: 'เทคนิคการแพทย์',
}

const ROLE_COLOR: Record<UserRole, string> = {
  doctor:  '#00a872',
  nurse:   '#3b82f6',
  medtech: '#8b5cf6',
}

export default function Header({
  doctorName, userRole, onLogout,
}: {
  doctorName?: string
  userRole?: UserRole
  onLogout?: () => void
}) {
  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut()
    onLogout?.()
  }

  return (
    <div className={styles.hdr}>
      <div className={styles.logo}>HS</div>
      <div className={styles.name}>HyperSense</div>

      {doctorName && userRole && (
        <div className={styles.doctorInfo}>
          <div className={styles.doctorAvatar}>
            {ROLE_LABEL[userRole].charAt(0)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{doctorName}</span>
            <span style={{
              fontSize: 10, padding: '1px 7px', borderRadius: 20,
              background: `${ROLE_COLOR[userRole]}18`,
              color: ROLE_COLOR[userRole],
              border: `1px solid ${ROLE_COLOR[userRole]}40`,
              fontWeight: 600, alignSelf: 'flex-start',
            }}>
              {ROLE_LABEL[userRole]}
            </span>
          </div>
        </div>
      )}

      {onLogout && (
        <button className={styles.logoutBtn} onClick={handleLogout}>
          ออกจากระบบ
        </button>
      )}
    </div>
  )
}
