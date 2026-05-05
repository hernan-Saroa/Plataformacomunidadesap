/**
 * Gestión Profesoral App - Aplicación Completa Integrada
 * Integra TODAS las fases y componentes del sistema PTA
 */

import { useState } from 'react';
import { PTAProvider } from '../../../contexts/PTAContext';
import { MiPTADashboardV3 } from './MiPTADashboardV3';
import { BandejaAprobadores } from './BandejaAprobadores';
import { CommandPalette } from './CommandPalette';
import { ModalShortcuts } from './ModalShortcuts';
import { PTAOnboarding } from './PTAOnboarding';
import { useKeyboardShortcuts, SHORTCUTS } from '../../../hooks/useKeyboardShortcuts';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Search, 
  Menu,
  X,
  Zap,
  User,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Vista = 'dashboard' | 'bandeja-aprobadores';
type Rol = 'docente' | 'aprobador';

export function GestionProfesoralApp() {
  // Estados principales
  const [vistaActual, setVistaActual] = useState<Vista>('dashboard');
  const [rolActivo, setRolActivo] = useState<Rol>('docente');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [menuMobileOpen, setMenuMobileOpen] = useState(false);

  // Verificar si es primera vez
  const esPrimeraVez = !localStorage.getItem('pta_onboarding_completed');

  // Keyboard shortcuts globales
  useKeyboardShortcuts([
    {
      ...SHORTCUTS.COMMAND_PALETTE,
      callback: () => setCommandPaletteOpen(true)
    },
    {
      ...SHORTCUTS.AYUDA,
      callback: () => setShortcutsModalOpen(true)
    }
  ]);

  const handleVistaChange = (vista: Vista) => {
    setVistaActual(vista);
    setMenuMobileOpen(false);
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('pta_onboarding_completed', 'true');
    setOnboardingOpen(false);
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Mi PTA',
      icon: LayoutDashboard,
      vista: 'dashboard' as Vista,
      roles: ['docente']
    },
    {
      id: 'bandeja',
      label: 'Bandeja Aprobación',
      icon: CheckSquare,
      vista: 'bandeja-aprobadores' as Vista,
      roles: ['aprobador']
    }
  ];

  return (
    <PTAProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-40">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo y título */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setMenuMobileOpen(!menuMobileOpen)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {menuMobileOpen ? (
                    <X className="w-6 h-6 text-gray-700" />
                  ) : (
                    <Menu className="w-6 h-6 text-gray-700" />
                  )}
                </button>

                <div>
                  <h1 className="text-xl font-bold text-[#003DA5]">
                    Gestión Profesoral ESAP
                  </h1>
                  <p className="text-xs text-gray-600">
                    Sistema de Plan de Trabajo Académico
                  </p>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-3">
                {/* Botón búsqueda */}
                <button
                  onClick={() => setCommandPaletteOpen(true)}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Search className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600 hidden md:inline">
                    Buscar...
                  </span>
                  <kbd className="hidden md:inline px-2 py-1 text-xs bg-white rounded border border-gray-300">
                    ⌘K
                  </kbd>
                </button>

                {/* Botón shortcuts */}
                <button
                  onClick={() => setShortcutsModalOpen(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Ver atajos (?)"
                >
                  <Zap className="w-5 h-5 text-gray-600" />
                </button>

                {/* Selector de rol */}
                <div className="hidden sm:block">
                  <select
                    value={rolActivo}
                    onChange={(e) => {
                      const nuevoRol = e.target.value as Rol;
                      setRolActivo(nuevoRol);
                      
                      // Cambiar vista según rol
                      if (nuevoRol === 'docente') {
                        setVistaActual('dashboard');
                      } else {
                        setVistaActual('bandeja-aprobadores');
                      }
                    }}
                    className="px-3 py-2 bg-[#003DA5] text-white rounded-lg text-sm font-medium cursor-pointer border-2 border-[#003DA5] hover:bg-[#002d80] transition-colors"
                  >
                    <option value="docente">👨‍🏫 Docente</option>
                    <option value="aprobador">✅ Aprobador</option>
                  </select>
                </div>

                {/* Usuario */}
                <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {rolActivo === 'docente' ? 'Juan Pérez' : 'Dr. Carlos Méndez'}
                  </span>
                </div>

                {/* Logout */}
                <button
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-5 h-5 text-gray-600 group-hover:text-red-600" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuMobileOpen && (
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="lg:hidden fixed inset-0 top-16 bg-white z-30 border-r-2 border-gray-200 p-4"
            >
              <nav className="space-y-2">
                {/* Selector de rol mobile */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol actual
                  </label>
                  <select
                    value={rolActivo}
                    onChange={(e) => {
                      const nuevoRol = e.target.value as Rol;
                      setRolActivo(nuevoRol);
                      
                      if (nuevoRol === 'docente') {
                        setVistaActual('dashboard');
                      } else {
                        setVistaActual('bandeja-aprobadores');
                      }
                      
                      setMenuMobileOpen(false);
                    }}
                    className="w-full px-3 py-2 bg-[#003DA5] text-white rounded-lg font-medium"
                  >
                    <option value="docente">👨‍🏫 Docente</option>
                    <option value="aprobador">✅ Aprobador</option>
                  </select>
                </div>

                {menuItems
                  .filter(item => item.roles.includes(rolActivo))
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleVistaChange(item.vista)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                        ${vistaActual === item.vista
                          ? 'bg-[#003DA5] text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}

                <hr className="my-4" />

                <button
                  onClick={() => {
                    setOnboardingOpen(true);
                    setMenuMobileOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                >
                  <Zap className="w-5 h-5" />
                  <span className="font-medium">Ver tutorial</span>
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layout principal */}
        <div className="flex">
          {/* Sidebar Desktop */}
          <aside className="hidden lg:block w-64 bg-white border-r-2 border-gray-200 min-h-[calc(100vh-64px)] sticky top-16">
            <nav className="p-4 space-y-2">
              {menuItems
                .filter(item => item.roles.includes(rolActivo))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleVistaChange(item.vista)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                      ${vistaActual === item.vista
                        ? 'bg-[#003DA5] text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}

              <hr className="my-4" />

              <button
                onClick={() => setOnboardingOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors"
              >
                <Zap className="w-5 h-5" />
                <span className="font-medium">Ver tutorial</span>
              </button>

              {/* Info card */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2 mb-2">
                  <Search className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900">
                      Búsqueda rápida
                    </h4>
                    <p className="text-xs text-blue-700 mt-1">
                      Presiona <kbd className="px-1 py-0.5 bg-white rounded border border-blue-300 text-[10px]">⌘K</kbd> para buscar
                    </p>
                  </div>
                </div>
              </div>
            </nav>
          </aside>

          {/* Contenido principal */}
          <main className="flex-1 min-h-[calc(100vh-64px)]">
            <AnimatePresence mode="wait">
              {vistaActual === 'dashboard' && rolActivo === 'docente' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <MiPTADashboardV3 />
                </motion.div>
              )}

              {vistaActual === 'bandeja-aprobadores' && rolActivo === 'aprobador' && (
                <motion.div
                  key="bandeja"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <BandejaAprobadores />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* Modales globales */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />

        <ModalShortcuts
          isOpen={shortcutsModalOpen}
          onClose={() => setShortcutsModalOpen(false)}
        />

        {/* Onboarding */}
        {(onboardingOpen || esPrimeraVez) && (
          <PTAOnboarding
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingComplete}
          />
        )}

        {/* Floating action button - Mobile */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#003DA5] hover:bg-[#002d80] text-white rounded-full shadow-2xl flex items-center justify-center z-30 transition-all hover:scale-110"
        >
          <Search className="w-6 h-6" />
        </button>
      </div>
    </PTAProvider>
  );
}
