import { useState } from 'react';
import { 
  Home, 
  FileText, 
  Calendar, 
  Bell, 
  User, 
  LogOut,
  BookOpen,
  Briefcase,
  Award,
  MessageSquare
} from 'lucide-react';

/**
 * ============================================
 * PORTAL TRANSACCIONAL - ESAP
 * ============================================
 * 
 * Portal para usuarios externos (estudiantes, egresados, docentes)
 * que permite:
 * - Consultar información académica
 * - Solicitar certificados
 * - Ver noticias y eventos
 * - Gestionar perfil
 */

interface Usuario {
  id: string;
  nombre: string;
  tipo: 'externo' | 'interno';
  email: string;
}

interface PortalTransaccionalProps {
  usuario: Usuario;
  onLogout: () => void;
}

type SeccionPortal = 'inicio' | 'academico' | 'certificados' | 'eventos' | 'perfil';

export function PortalTransaccional({ usuario, onLogout }: PortalTransaccionalProps) {
  const [seccionActual, setSeccionActual] = useState<SeccionPortal>('inicio');

  const menuItems = [
    { id: 'inicio' as SeccionPortal, label: 'Inicio', icon: Home },
    { id: 'academico' as SeccionPortal, label: 'Académico', icon: BookOpen },
    { id: 'certificados' as SeccionPortal, label: 'Certificados', icon: Award },
    { id: 'eventos' as SeccionPortal, label: 'Eventos', icon: Calendar },
    { id: 'perfil' as SeccionPortal, label: 'Perfil', icon: User },
  ];

  const renderContenido = () => {
    switch (seccionActual) {
      case 'inicio':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Bienvenido, {usuario.nombre}!
              </h2>
              <p className="text-gray-600">
                Este es tu portal transaccional ESAP
              </p>
            </div>

            {/* Tarjetas de acceso rápido */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-[#003DA5]" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Académico</h3>
                <p className="text-sm text-gray-600">
                  Consulta tus notas, horarios y más
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Certificados</h3>
                <p className="text-sm text-gray-600">
                  Solicita y descarga certificados
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Eventos</h3>
                <p className="text-sm text-gray-600">
                  Conoce eventos y noticias
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Briefcase className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Bolsa de Empleo</h3>
                <p className="text-sm text-gray-600">
                  Encuentra oportunidades laborales
                </p>
              </div>
            </div>

            {/* Noticias recientes */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#003DA5]" />
                Noticias Recientes
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4 pb-4 border-b border-gray-100">
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      Inscripciones abiertas para el periodo 2025-1
                    </h4>
                    <p className="text-sm text-gray-600">
                      Ya están disponibles las inscripciones para todos los programas
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Hace 2 días</p>
                  </div>
                </div>
                <div className="flex gap-4 pb-4 border-b border-gray-100">
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      Nueva plataforma de certificados digitales
                    </h4>
                    <p className="text-sm text-gray-600">
                      Solicita tus certificados 100% en línea
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Hace 5 días</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'academico':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Información Académica</h2>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Contenido académico en desarrollo</p>
            </div>
          </div>
        );

      case 'certificados':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Certificados</h2>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
              <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Módulo de certificados en desarrollo</p>
            </div>
          </div>
        );

      case 'eventos':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Eventos y Noticias</h2>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Calendario de eventos en desarrollo</p>
            </div>
          </div>
        );

      case 'perfil':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h2>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nombre</label>
                  <p className="text-gray-900 mt-1">{usuario.nombre}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Correo electrónico</label>
                  <p className="text-gray-900 mt-1">{usuario.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Tipo de usuario</label>
                  <p className="text-gray-900 mt-1">Usuario Externo</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#003DA5] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ESAP</span>
              </div>
              <div>
                <div className="font-bold text-gray-900">Portal Transaccional</div>
                <div className="text-xs text-gray-500">Escuela Superior de Administración Pública</div>
              </div>
            </div>

            {/* Usuario y logout */}
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-gray-900">{usuario.nombre}</div>
                <div className="text-xs text-gray-500">{usuario.email}</div>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-[#003DA5] hover:bg-gray-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setSeccionActual(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                    seccionActual === item.id
                      ? 'bg-[#003DA5] text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContenido()}
      </main>
    </div>
  );
}
