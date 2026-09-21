import type { Metadata } from 'next'
import './styles/globals.css'
import './styles/markdown.scss'

export const metadata: Metadata = {
  title: '越海 · 跨境电商 AI 知识助手',
  description: '围绕 Amazon、Temu、TikTok Shop、Shopee 的运营、广告、物流与合规问题，梳理思路与下一步行动。',
  icons: { icon: '/icon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang='zh-CN'><body>{children}</body></html>
}
