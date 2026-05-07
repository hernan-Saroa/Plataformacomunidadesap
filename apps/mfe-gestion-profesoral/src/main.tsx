import React from 'react'
import ReactDOM from 'react-dom/client'
import { GestionProfesoralApp } from './components/gestion-profesoral/GestionProfesoralApp'
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

const mockUser = {
  nombre: 'Dr. Carlos Alberto Méndez Rivera',
  email: 'carlos.mendez@esap.edu.co',
  rol: 'docente' as const,
  cedula: '1234567890'
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="p-4 bg-gray-50 min-h-screen">
      <GestionProfesoralApp 
        usuario={mockUser} 
        onLogout={() => console.log('Logout')} 
      />
    </div>
  </React.StrictMode>,
)
