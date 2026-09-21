import React from 'react'

import Main from '@/app/components'
import { hasAppConfig } from '@/config/server'

const App = () => {
  return (
    <Main isConfigured={hasAppConfig} />
  )
}

export default React.memo(App)
