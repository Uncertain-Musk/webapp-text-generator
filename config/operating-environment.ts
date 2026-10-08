// A small UI selection list, not a statement of store integration or policy coverage.
export const PLATFORMS = [
  { id: 'amazon', name: 'Amazon', markets: [{ id: 'us', name: '美国站' }, { id: 'uk', name: '英国站' }, { id: 'de', name: '德国站' }, { id: 'jp', name: '日本站' }] },
  { id: 'tiktok', name: 'TikTok Shop', markets: [{ id: 'us', name: '美国站' }, { id: 'uk', name: '英国站' }, { id: 'sg', name: '新加坡站' }] },
  { id: 'temu', name: 'Temu', markets: [{ id: 'us', name: '美国市场' }, { id: 'uk', name: '英国市场' }, { id: 'de', name: '德国市场' }] },
  { id: 'shopee', name: 'Shopee', markets: [{ id: 'sg', name: '新加坡站' }, { id: 'my', name: '马来西亚站' }, { id: 'ph', name: '菲律宾站' }] },
  { id: 'ebay', name: 'eBay', markets: [{ id: 'us', name: '美国站' }, { id: 'uk', name: '英国站' }, { id: 'de', name: '德国站' }, { id: 'au', name: '澳大利亚站' }] },
  { id: 'aliexpress', name: 'AliExpress', markets: [{ id: 'us', name: '美国市场' }, { id: 'es', name: '西班牙市场' }, { id: 'fr', name: '法国市场' }] },
] as const

export type OperatingEnvironment = { platform: typeof PLATFORMS[number]['id']; market: string }
export const ENVIRONMENT_STORAGE_KEY = 'yuehai.operating-environment.v1'

export function toWorkflowContext(environment: OperatingEnvironment | null) {
  const platform = PLATFORMS.find(item => item.id === environment?.platform)
  const market = platform?.markets.find(item => item.id === environment?.market)
  return {
    platform_context: platform && market ? platform.name : '',
    market_context: platform && market ? market.id.toUpperCase() : '',
  }
}

export function parseOperatingEnvironment(raw: string | null): OperatingEnvironment | null {
  try {
    const value = JSON.parse(raw || 'null')
    const platform = PLATFORMS.find(item => item.id === value?.platform)
    if (!platform?.markets.some(market => market.id === value?.market))
      return null
    return { platform: platform.id, market: value.market }
  }
  catch {
    return null
  }
}

export function environmentLabel(environment: OperatingEnvironment | null) {
  const platform = PLATFORMS.find(item => item.id === environment?.platform)
  const market = platform?.markets.find(item => item.id === environment?.market)
  return platform && market ? `${platform.name} · ${market.name}` : '选择平台 / 站点'
}
