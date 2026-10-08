'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Popover } from '@headlessui/react'
import { ChevronDownIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import { EnvironmentProvider, useOperatingEnvironment } from './environment'
import { PLATFORMS, environmentLabel } from '@/config/operating-environment'

const navigation = [
  { href: '/', label: '首页' },
  { href: '/compliance', label: '规则与合规' },
  { href: '/issues', label: '问题处理' },
  { href: '/tools', label: '经营工具' },
]

function EnvironmentForm({ close }: { close: () => void }) {
  const { environment, saveEnvironment, storageUnavailable } = useOperatingEnvironment()
  const [platformId, setPlatformId] = useState(environment?.platform || '')
  const [marketId, setMarketId] = useState(environment?.market || '')
  const platform = PLATFORMS.find(item => item.id === platformId)

  return <form onSubmit={(event) => {
    event.preventDefault()
    if (!platform || !platform.markets.some(item => item.id === marketId))
      return
    saveEnvironment({ platform: platform.id, market: marketId })
    close()
  }}>
    <h2 id='environment-heading'>当前经营环境</h2>
    <p className='environment-description'>选择你关注的平台与站点，方便下次使用。</p>
    <label htmlFor='environment-platform'>平台</label>
    <select id='environment-platform' value={platformId} required onChange={(event) => {
      setPlatformId(event.target.value)
      setMarketId('')
    }}>
      <option value=''>选择平台</option>
      {PLATFORMS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
    <label htmlFor='environment-market'>站点 / 市场</label>
    <select id='environment-market' value={marketId} required disabled={!platform} onChange={event => setMarketId(event.target.value)}>
      <option value=''>{platform ? '选择站点 / 市场' : '请先选择平台'}</option>
      {platform?.markets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
    <p className='environment-note'>选择将作为提问上下文发送，问题中明确指定的平台或站点优先。</p>
    {storageUnavailable && <p className='environment-note' role='status'>浏览器暂不支持保存，选择仅在本次页面使用。</p>}
    <div className='environment-actions'>
      <button type='button' className='text-button' onClick={() => {
        saveEnvironment(null)
        close()
      }}>清除选择</button>
      <button className='submit-button' type='submit' disabled={!platform || !marketId}>保存选择</button>
    </div>
  </form>
}

function Header() {
  const pathname = usePathname()
  const { environment } = useOperatingEnvironment()
  return <header className='site-header'>
    <div className='header-inner'>
      <Link className='brand' href='/' aria-label='越海 AI 首页'>
        <svg className='brand-mark' viewBox='0 0 40 40' aria-hidden='true'>
          <rect width='40' height='40' rx='12' fill='currentColor' />
          <path d='m12 27 7-16 3 10 7 6H12Z M10 31h20' fill='none' stroke='white' strokeWidth='1.8' strokeLinejoin='round' strokeLinecap='round' />
        </svg>
        <span>越海 AI</span>
      </Link>
      <nav className='main-nav' aria-label='主导航'>
        {navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>)}
      </nav>
      <Popover className='environment-picker'>
        {({ close }) => <>
          <Popover.Button className='environment-trigger' aria-label={`当前经营环境：${environmentLabel(environment)}`}>
            <GlobeAltIcon aria-hidden='true' /><span>{environmentLabel(environment)}</span><ChevronDownIcon aria-hidden='true' />
          </Popover.Button>
          <Popover.Panel focus className='environment-panel' aria-labelledby='environment-heading'>
            <EnvironmentForm close={close} />
          </Popover.Panel>
        </>}
      </Popover>
    </div>
  </header>
}

export default function SiteShell({ children }: { children: React.ReactNode }) {
  return <EnvironmentProvider><div className='site-shell'>
    <a className='skip-link' href='#main-content'>跳到主要内容</a>
    <Header />
    {children}
    <footer className='site-footer'><span>越海 AI · 跨境电商知识助手</span><span>重要平台规则请以平台最新官方政策为准。</span></footer>
  </div></EnvironmentProvider>
}
