import React from 'react'
import ReactDOM from 'react-dom/client'
import { EstructuraOrganizacionalModule } from './components/estructura-organizacional/EstructuraOrganizacionalModule'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="p-8 bg-gray-50 min-h-screen">
      <EstructuraOrganizacionalModule />
    </div>
  </React.StrictMode>,
)
