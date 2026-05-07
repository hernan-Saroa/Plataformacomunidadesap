import React from 'react'
import ReactDOM from 'react-dom/client'
import { ControlDisciplinarioFull } from './components/ControlDisciplinarioFull'
import { toast } from '@esap-mfe/shared-ui'
import { setToastCallback } from '../utils/toast'
import './index.css'

const _cspNonce = document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content ?? '';
if (_cspNonce) {
  const _origCreate = document.createElement.bind(document);
  document.createElement = function(tag: string, opts?: ElementCreationOptions) {
    const el = _origCreate(tag as 'div', opts);
    if (tag.toLowerCase() === 'style') el.setAttribute('nonce', _cspNonce);
    return el;
  } as typeof document.createElement;
}

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
