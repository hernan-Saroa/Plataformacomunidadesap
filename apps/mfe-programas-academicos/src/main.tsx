import React from 'react'
import ReactDOM from 'react-dom/client'
import { ProgramasAcademicosModule } from './components/ProgramasAcademicosModule'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="p-4 bg-gray-50 min-h-screen">
      <ProgramasAcademicosModule />
    </div>
  </React.StrictMode>,
)
