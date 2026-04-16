import React from 'react'
import ReactDOM from 'react-dom/client'
import { CertificadosLaboralesRouter } from './components/CertificadosLaboralesRouter'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="bg-gray-50 min-h-screen">
      <CertificadosLaboralesRouter userRoles={['admin']} userEmail="test@esap.edu.co" />
    </div>
  </React.StrictMode>,
)
