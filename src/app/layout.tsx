import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GenomeMed AI — ระบบวิเคราะห์ความเสี่ยงโรค',
  description: 'AI-powered clinical decision support with genomic risk assessment',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
