import React from 'react'
import ReactDOM from 'react-dom/client'
import { EnrollmentManagementModule } from './components/EnrollmentManagementModule'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="bg-gray-50 min-h-screen">
      <EnrollmentManagementModule />
    </div>
  </React.StrictMode>,
)
