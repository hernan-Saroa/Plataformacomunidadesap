import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type Theme = 'light' | 'dark' | 'system';

export function DarkModeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('light');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Detectar preferencia del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    // IMPORTANTE: Cargar tema guardado o establecer 'light' como predeterminado
    const saved = localStorage.getItem('esap-theme') as Theme;
    if (saved) {
      setTheme(saved);
    } else {
      // Si no hay preferencia guardada, establecer 'light' como predeterminado
      setTheme('light');
      localStorage.setItem('esap-theme', 'light');
    }
  }, []);

  useEffect(() => {
    // Aplicar tema
    const root = document.documentElement;
    const effectiveTheme = theme === 'system' ? systemPreference : theme;

    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
      // Aplicar variables CSS para dark mode
      root.style.setProperty('--esap-bg', '#0f172a');
      root.style.setProperty('--esap-surface', '#1e293b');
      root.style.setProperty('--esap-gray-900', '#f1f5f9');
      root.style.setProperty('--esap-gray-800', '#e2e8f0');
      root.style.setProperty('--esap-gray-700', '#cbd5e1');
      root.style.setProperty('--esap-gray-600', '#94a3b8');
      root.style.setProperty('--esap-gray-500', '#64748b');
      root.style.setProperty('--esap-gray-400', '#475569');
      root.style.setProperty('--esap-gray-300', '#334155');
      root.style.setProperty('--esap-gray-200', '#1e293b');
      root.style.setProperty('--esap-gray-100', '#0f172a');
      root.style.setProperty('--esap-gray-50', '#020617');
    } else {
      root.classList.remove('dark');
      // Restaurar variables CSS para light mode
      root.style.removeProperty('--esap-bg');
      root.style.removeProperty('--esap-surface');
      root.style.removeProperty('--esap-gray-900');
      root.style.removeProperty('--esap-gray-800');
      root.style.removeProperty('--esap-gray-700');
      root.style.removeProperty('--esap-gray-600');
      root.style.removeProperty('--esap-gray-500');
      root.style.removeProperty('--esap-gray-400');
      root.style.removeProperty('--esap-gray-300');
      root.style.removeProperty('--esap-gray-200');
      root.style.removeProperty('--esap-gray-100');
      root.style.removeProperty('--esap-gray-50');
    }

    localStorage.setItem('esap-theme', theme);
  }, [theme, systemPreference]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  const effectiveTheme = theme === 'system' ? systemPreference : theme;

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-10 h-10 rounded-lg border-2 border-[--esap-gray-400] bg-white hover:bg-[--esap-gray-50] hover:border-[--esap-gray-500] transition-all flex items-center justify-center active:scale-95"
            aria-label="Cambiar tema"
          >
            <AnimatePresence mode="wait">
              {effectiveTheme === 'dark' ? (
                <motion.div
                  key="moon"
                  initial={{ opacity: 0, rotate: -180 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon className="w-5 h-5 text-[--esap-gray-700]" strokeWidth={2} />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ opacity: 0, rotate: 180 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -180 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="w-5 h-5 text-[--esap-gray-700]" strokeWidth={2} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          Tema actual: {theme === 'system' ? `Sistema (${systemPreference})` : theme === 'dark' ? 'Oscuro' : 'Claro'}
        </TooltipContent>
      </Tooltip>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              className="absolute right-0 top-full mt-2 w-48 bg-white border-2 border-[--esap-gray-300] rounded-xl overflow-hidden z-50"
              style={{ boxShadow: 'var(--esap-shadow-xl)' }}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <button
                onClick={() => handleThemeChange('light')}
                className={`w-full px-4 py-3 text-left hover:bg-[--esap-gray-50] transition-colors flex items-center gap-3 ${
                  theme === 'light' ? 'bg-blue-50 text-[--esap-primary]' : 'text-[--esap-gray-700]'
                }`}
              >
                <Sun className="w-4 h-4" strokeWidth={2} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Claro</p>
                  <p className="text-xs opacity-70">Siempre claro</p>
                </div>
                {theme === 'light' && (
                  <div className="w-2 h-2 rounded-full bg-[--esap-primary]" />
                )}
              </button>

              <button
                onClick={() => handleThemeChange('dark')}
                className={`w-full px-4 py-3 text-left hover:bg-[--esap-gray-50] transition-colors flex items-center gap-3 ${
                  theme === 'dark' ? 'bg-blue-50 text-[--esap-primary]' : 'text-[--esap-gray-700]'
                }`}
              >
                <Moon className="w-4 h-4" strokeWidth={2} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Oscuro</p>
                  <p className="text-xs opacity-70">Siempre oscuro</p>
                </div>
                {theme === 'dark' && (
                  <div className="w-2 h-2 rounded-full bg-[--esap-primary]" />
                )}
              </button>

              <button
                onClick={() => handleThemeChange('system')}
                className={`w-full px-4 py-3 text-left hover:bg-[--esap-gray-50] transition-colors flex items-center gap-3 ${
                  theme === 'system' ? 'bg-blue-50 text-[--esap-primary]' : 'text-[--esap-gray-700]'
                }`}
              >
                <Monitor className="w-4 h-4" strokeWidth={2} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Sistema</p>
                  <p className="text-xs opacity-70">Detectar automático</p>
                </div>
                {theme === 'system' && (
                  <div className="w-2 h-2 rounded-full bg-[--esap-primary]" />
                )}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
