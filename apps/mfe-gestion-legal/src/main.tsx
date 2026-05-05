import React from 'react'
import ReactDOM from 'react-dom/client'
import { GestionLegalFull } from './components/core/GestionLegalFull'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="bg-gray-50 min-h-screen">
      <GestionLegalFull />
    </div>
  </React.StrictMode>,
)
