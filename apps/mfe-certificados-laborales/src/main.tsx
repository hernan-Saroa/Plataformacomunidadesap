import React from 'react'
import ReactDOM from 'react-dom/client'
import { CertificadosLaboralesRouter } from './components/CertificadosLaboralesRouter'

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="bg-gray-50 min-h-screen">
      <CertificadosLaboralesRouter userRoles={['admin']} userEmail="test@esap.edu.co" />
    </div>
  </React.StrictMode>,
)
