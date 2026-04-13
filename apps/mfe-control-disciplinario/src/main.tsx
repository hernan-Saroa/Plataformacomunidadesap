import React from 'react'
import ReactDOM from 'react-dom/client'
import { ControlDisciplinarioFull } from './components/ControlDisciplinarioFull'
import { Toaster } from '@esap-mfe/shared-ui'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="bg-gray-50 min-h-screen">
      <ControlDisciplinarioFull />
      <Toaster />
    </div>
  </React.StrictMode>,
)
