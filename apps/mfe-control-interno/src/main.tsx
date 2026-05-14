import React from 'react'
import ReactDOM from 'react-dom/client'
import { ControlInternoFull } from './components/ControlInternoFull'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="bg-gray-50 min-h-screen">
      <ControlInternoFull />
    </div>
  </React.StrictMode>,
)
