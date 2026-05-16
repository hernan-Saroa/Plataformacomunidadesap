import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, RefreshCw, Lightbulb, LogOut, ArrowLeftRight } from 'lucide-react';
import { useConfirmation } from './ConfirmationModal';
import { resetAllTips, getHiddenTipsCount } from '../../hooks';
import { toast } from 'sonner';

interface UserMenuProps {
  userName: string;
  userEmail: string;
  userRole: string;
  userInitials: string;
  onLogout: () => void;
  onViewProfile?: () => void;
  onBackToSystemSelector?: () => void;
  onSystemChange?: (system: 'backoffice' | 'portal') => void;
  currentSystem?: 'backoffice' | 'portal';
  hasBothSystemsAccess?: boolean;
}

export function UserMenu({ 
  userName, 
  userEmail, 
  userRole, 
  userInitials,
  onLogout,
  onViewProfile,
  onBackToSystemSelector,
  onSystemChange,
  currentSystem,
  hasBothSystemsAccess
}: UserMenuProps) {
  const { ConfirmationDialog } = useConfirmation();
  const [showMenu, setShowMenu] = useState(false);
  const [hiddenTipsCount, setHiddenTipsCount] = useState(getHiddenTipsCount());

  const handleAvatarClick = () => {
    if (onViewProfile) {
      onViewProfile();
    }
  };

  const handleResetTips = () => {
    resetAllTips();
    setHiddenTipsCount(0);
    setShowMenu(false);
    toast.success('Tips reseteados', {
      description: 'Todos los tips contextuales volverán a mostrarse.',
      duration: 3000,
    });
    
    // Recargar la página para que los tips se muestren
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleLogoutClick = () => {
    setShowMenu(false);
    // Mostrar diálogo de confirmación
    onLogout();
    ConfirmationDialog({
      title: '¿Cerrar sesión?',
      message: '¿Estás seguro que deseas cerrar tu sesión? Tendrás que iniciar sesión nuevamente para acceder al backoffice.',
      confirmLabel: 'Sí, cerrar sesión',
      cancelLabel: 'Cancelar',
      variant: 'warning',
      onConfirm: () => {
        toast.success('Sesión cerrada', {
          description: 'Has cerrado sesión exitosamente.',
          duration: 2000,
        });
        // Ejecutar logout después de un breve delay para que se vea el toast
        setTimeout(() => {
          onLogout();
        }, 500);
      },
    });
  };

  const handleSwitchSystemClick = () => {
    setShowMenu(false);
    
    // Cambiar directamente sin confirmación
    if (onBackToSystemSelector) {
      toast.success('🔄 Cambiando de sistema...', {
        description: 'Redirigiendo al selector de sistema',
        duration: 1500,
      });
      
      // Pequeño delay para que se vea el toast
      setTimeout(() => {
        onBackToSystemSelector();
      }, 300);
    }
  };

  const handleSystemChangeClick = (system: 'backoffice' | 'portal') => {
    setShowMenu(false);
    
    // Cambiar directamente sin confirmación
    if (onSystemChange) {
      toast.success(`🔄 Cambiando a ${system}...`, {
        description: 'Redirigiendo al sistema seleccionado',
        duration: 1500,
      });
      
      // Pequeño delay para que se vea el toast
      setTimeout(() => {
        onSystemChange(system);
      }, 300);
    }
  };

  return (
    <>
      <ConfirmationDialog />
      
      <div className="relative">
        {/* Avatar Button con menú contextual */}
        <div className="flex items-center gap-2">
          {/* Botón de avatar principal */}
          <button
            onClick={handleAvatarClick}
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:-translate-y-0.5 hover:scale-105 transition-all active:scale-95 relative"
            style={{
              background: 'linear-gradient(135deg, #2a6dbd 0%, #1e5da8 100%)',
              boxShadow: 'var(--esap-shadow-md)',
            }}
            aria-label="Ver perfil"
            title="Ver mi perfil"
          >
            {userInitials}
          </button>

          {/* Botón de menú contextual (tres puntos) */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[--esap-gray-600] hover:bg-[--esap-gray-100] hover:text-[#1e5da8] transition-all"
            aria-label="Opciones de usuario"
            title="Opciones"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>
        </div>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {showMenu && (
            <>
              {/* Backdrop para cerrar el menú */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />

              {/* Menú desplegable */}
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-[--esap-gray-200] overflow-hidden z-50"
                style={{
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                }}
              >
                {/* Opciones del menú */}
                <div className="p-2">
                  {/* Reset Tips */}
                  {hiddenTipsCount > 0 && (
                    <button
                      onClick={handleResetTips}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[--esap-gray-100] transition-colors text-left group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <RefreshCw className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[--esap-gray-900]">
                          Resetear tips
                        </p>
                        <p className="text-xs text-[--esap-gray-600]">
                          {hiddenTipsCount} tip{hiddenTipsCount > 1 ? 's' : ''} oculto{hiddenTipsCount > 1 ? 's' : ''}
                        </p>
                      </div>
                      <Lightbulb className="w-4 h-4 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}

                  {hiddenTipsCount === 0 && (
                    <div className="px-4 py-3 text-center">
                      <Lightbulb className="w-8 h-8 text-[--esap-gray-400] mx-auto mb-2" />
                      <p className="text-sm text-[--esap-gray-600]">
                        No hay tips ocultos
                      </p>
                      <p className="text-xs text-[--esap-gray-500] mt-1">
                        Todos los tips están visibles
                      </p>
                    </div>
                  )}

                  {/* Separador */}
                  {hiddenTipsCount > 0 && (
                    <div className="h-px bg-[--esap-gray-200] my-2" />
                  )}

                  {/* Cambiar de sistema */}
                  {hasBothSystemsAccess && onSystemChange && currentSystem && (
                    <>
                      <button
                        onClick={() => handleSystemChangeClick(currentSystem === 'backoffice' ? 'portal' : 'backoffice')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors text-left group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-100 to-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[--esap-gray-900]">
                            Cambiar a {currentSystem === 'backoffice' ? 'Portal' : 'Backoffice'}
                          </p>
                          <p className="text-xs text-[--esap-gray-600]">
                            {currentSystem === 'backoffice' ? 'Red social universitaria' : 'Sistema de gestión'}
                          </p>
                        </div>
                      </button>
                      <div className="h-px bg-[--esap-gray-200] my-2" />
                    </>
                  )}

                  {/* Cerrar Sesión */}
                  <button
                    onClick={handleLogoutClick}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <LogOut className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[--esap-gray-900] group-hover:text-red-600 transition-colors">
                        Cerrar sesión
                      </p>
                      <p className="text-xs text-[--esap-gray-600]">
                        Volver al inicio
                      </p>
                    </div>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}