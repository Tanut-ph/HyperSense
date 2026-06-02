import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HyperSenseProgram — ระบบช่วยตัดสินใจทางคลินิก ความดันโลหิตสูง',
  description: 'ระบบ AI ช่วยวิเคราะห์ความเสี่ยงโรคหัวใจและหลอดเลือด แนะนำแนวทางการรักษาความดันโลหิตสูง',
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
