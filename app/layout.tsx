import type { Metadata } from 'next'
import './styles/globals.css'
import './styles/markdown.scss'
import SiteShell from './components/site-shell'

export const metadata: Metadata = {
  title: '越海 AI · 跨境电商经营问题入口',
  description: '从平台规则、违规处理、退款售后到上架合规，基于跨境电商知识库梳理经营问题与下一步行动。',
  icons: { icon: '/icon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang='zh-CN'><body><SiteShell>{children}</SiteShell></body></html>
}
