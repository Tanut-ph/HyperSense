import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HyperSenseProgram — ระบบช่วยตัดสินใจทางคลินิก ความดันโลหิตสูง',
  description: 'ระบบช่วยตัดสินใจทางคลินิก วิเคราะห์ความเสี่ยงโรคหัวใจและหลอดเลือด และแนะนำแนวทางการรักษาความดันโลหิตสูง',
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
