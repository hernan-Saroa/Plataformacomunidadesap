import React from 'react'
import ReactDOM from 'react-dom/client'
import { ReportsModuleV2 } from './components/ReportsModuleV2'
import { Toaster } from '@esap-mfe/shared-ui'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="bg-gray-50 min-h-screen">
      <ReportsModuleV2 />
      <Toaster />
    </div>
  </React.StrictMode>,
)
