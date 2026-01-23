import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  User, 
  LogOut, 
  Settings, 
  HelpCircle,
  Menu,
  X,
  Home
} from 'lucide-react';

interface PortalNavbarProps {
  user: any; // TODO: Tipo UsuarioPersona
  notificacionesCount?: number;
  onLogout?: () => void;
}

/**
 * Navbar del Portal Transaccional Unificado
 */
export function PortalNavbar({ 
  user, 
  notificacionesCount = 0,
  onLogout 
}: PortalNavbarProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      // Logout por defecto
      localStorage.removeItem('auth-token');
      navigate('/login');
    }
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo y Nombre */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-gray-600" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {/* Logo */}
              <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => navigate('/portal')}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-[#2962FF] to-[#003DA5] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">E</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-medium text-[#003DA5]">
                    Portal ESAP
                  </h1>
                  <p className="text-xs text-gray-500">
                    ComUNIdad Universitaria
                  </p>
                </div>
              </div>
            </div>

            {/* Navegación Desktop */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => navigate('/portal')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[#E0EDFF] transition-colors text-gray-700 hover:text-[#003DA5]"
              >
                <Home className="w-4 h-4" />
                <span className="text-sm font-medium">Inicio</span>
              </button>

              <button
                onClick={() => navigate('/portal/ayuda')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[#E0EDFF] transition-colors text-gray-700 hover:text-[#003DA5]"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Ayuda</span>
              </button>
            </div>

            {/* Acciones de Usuario */}
            <div className="flex items-center gap-2">
              {/* Notificaciones */}
              <button
                onClick={() => navigate('/portal/notificaciones')}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {notificacionesCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-[#F57C00] text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {notificacionesCount > 9 ? '9+' : notificacionesCount}
                  </span>
                )}
              </button>

              {/* Usuario Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-[#2962FF] to-[#003DA5] rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.nombres?.[0]}{user?.apellidos?.[0]}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.nombres} {user?.apellidos}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.rolActivo || user?.roles?.[0]}
                    </p>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    {/* Overlay para cerrar el menú */}
                    <div 
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {user?.nombres} {user?.apellidos}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {user?.email}
                        </p>
                        {user?.sede && (
                          <p className="text-xs text-gray-500 mt-1">
                            Sede {user.sede.nombre}
                          </p>
                        )}
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <button
                          onClick={() => {
                            navigate('/portal/perfil');
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#E0EDFF] transition-colors text-gray-700"
                        >
                          <User className="w-4 h-4" />
                          <span className="text-sm">Mi Perfil</span>
                        </button>

                        <button
                          onClick={() => {
                            navigate('/portal/configuracion');
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#E0EDFF] transition-colors text-gray-700"
                        >
                          <Settings className="w-4 h-4" />
                          <span className="text-sm">Configuración</span>
                        </button>

                        <button
                          onClick={() => {
                            navigate('/portal/ayuda');
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#E0EDFF] transition-colors text-gray-700"
                        >
                          <HelpCircle className="w-4 h-4" />
                          <span className="text-sm">Ayuda</span>
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-gray-100 pt-2">
                        <button
                          onClick={() => {
                            handleLogout();
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-red-600"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm font-medium">Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 py-3 space-y-1">
            <button
              onClick={() => {
                navigate('/portal');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#E0EDFF] transition-colors text-gray-700"
            >
              <Home className="w-5 h-5" />
              <span className="text-sm font-medium">Inicio</span>
            </button>

            <button
              onClick={() => {
                navigate('/portal/ayuda');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#E0EDFF] transition-colors text-gray-700"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Ayuda</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
