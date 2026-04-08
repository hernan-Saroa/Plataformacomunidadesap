import React from 'react'
import ReactDOM from 'react-dom/client'
import { UsersPersonsModulePremium } from './components/admin/UsersPersonsModulePremium'
import { Toaster } from '@esap-mfe/shared-ui'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="p-4 bg-gray-50 min-h-screen">
      <UsersPersonsModulePremium />
      <Toaster />
    </div>
  </React.StrictMode>,
)
