import React from 'react'
import ReactDOM from 'react-dom/client'
import { ControlDisciplinarioFull } from './components/ControlDisciplinarioFull'
import { toast } from '@esap-mfe/shared-ui'
import { setToastCallback } from '../utils/toast'
import './index.css'

// Configurar el callback para que la utilidad de toast use sonner
setToastCallback(({ type, message, description }) => {
  switch (type) {
    case 'success':
      toast.success(message, { description });
      break;
    case 'error':
      toast.error(message, { description });
      break;
    case 'warning':
      toast.warning(message, { description });
      break;
    case 'info':
      toast.info(message, { description });
      break;
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="bg-gray-50 min-h-screen">
      <ControlDisciplinarioFull />
    </div>
  </React.StrictMode>,
)
