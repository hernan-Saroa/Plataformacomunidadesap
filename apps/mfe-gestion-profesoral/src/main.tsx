import React from 'react'
import ReactDOM from 'react-dom/client'
import { GestionProfesoralApp } from './components/gestion-profesoral/GestionProfesoralApp'
import './index.css'

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
