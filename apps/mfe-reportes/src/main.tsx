import React from 'react'
import ReactDOM from 'react-dom/client'
import { ReportsModuleV2 } from './components/ReportsModuleV2'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="bg-gray-50 min-h-screen">
      <ReportsModuleV2 />
    </div>
  </React.StrictMode>,
)
