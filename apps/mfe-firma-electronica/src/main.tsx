import React from 'react'
import ReactDOM from 'react-dom/client'
import { ModuloFirmaElectronicaWorldClass } from './components/ModuloFirmaElectronicaWorldClass'
import { Toaster } from '@esap-mfe/shared-ui'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="bg-gray-50 min-h-screen">
      <ModuloFirmaElectronicaWorldClass />
      <Toaster />
    </div>
  </React.StrictMode>,
)
