import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuditModulePremium } from './components/AuditModulePremium'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="bg-gray-50 min-h-screen">
      <AuditModulePremium />
    </div>
  </React.StrictMode>,
)
