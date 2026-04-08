/**
 * UXPremiumProvider Component
 * 
 * Provider que integra las 4 características principales del sistema UX Premium:
 * 1. Microinteracciones Premium
 * 2. Navegación por Teclado Extendida
 * 3. Accesibilidad ARIA Completa
 * 4. Sistema de Notificaciones y Feedback
 */

import { useEffect, useState } from 'react';
import { SkipLinks } from './SkipLinks';
import { LiveRegion } from './LiveRegion';
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';
import { useKeyboardNavigation, ESAP_GLOBAL_SHORTCUTS, KeyboardShortcut } from '../../hooks/useKeyboardNavigation';
import { useAccessibility } from '../../hooks/useAccessibility';

interface UXPremiumProviderProps {
  children: React.ReactNode;
  customShortcuts?: KeyboardShortcut[];
  skipLinks?: Array<{
    id: string;
    label: string;
    targetId: string;
  }>;
  enableSkipLinks?: boolean;
  enableKeyboardShortcuts?: boolean;
  enableLiveRegion?: boolean;
}

/**
 * Provider principal que debe envolver la aplicación completa
 */
export function UXPremiumProvider({
  children,
  customShortcuts = [],
  skipLinks,
  enableSkipLinks = true,
  enableKeyboardShortcuts = true,
  enableLiveRegion = true,
}: UXPremiumProviderProps) {
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const { isKeyboardUser, announce } = useAccessibility();

  // Shortcuts específicos del provider
  const providerShortcuts: KeyboardShortcut[] = [
    {
      key: '?',
      shift: true,
      description: 'Mostrar panel de atajos de teclado',
      action: () => setShowShortcutsPanel(true),
      global: true,
    },
  ];

  // Combinar todos los shortcuts
  const allShortcuts = [
    ...ESAP_GLOBAL_SHORTCUTS,
    ...providerShortcuts,
    ...customShortcuts,
  ];

  // Registrar shortcuts
  useKeyboardNavigation(allShortcuts);

  // Anunciar cuando el usuario cambia a navegación por teclado
  useEffect(() => {
    if (isKeyboardUser) {
      setLiveMessage('Modo de navegación por teclado activado');
      announce('Navegación por teclado activada. Presiona Shift + ? para ver atajos disponibles', 'polite');
    }
  }, [isKeyboardUser, announce]);

  // Escuchar eventos globales para anuncios
  useEffect(() => {
    const handleGlobalAnnouncement = (event: CustomEvent) => {
      setLiveMessage(event.detail.message);
      announce(event.detail.message, event.detail.level || 'polite');
    };

    window.addEventListener('ux:announce' as any, handleGlobalAnnouncement);
    return () => window.removeEventListener('ux:announce' as any, handleGlobalAnnouncement);
  }, [announce]);

  return (
    <>
      {/* Skip Links para navegación rápida */}
      {enableSkipLinks && <SkipLinks links={skipLinks} />}

      {/* Live Region para anuncios a lectores de pantalla */}
      {enableLiveRegion && <LiveRegion message={liveMessage} />}

      {/* Panel de atajos de teclado */}
      {enableKeyboardShortcuts && (
        <KeyboardShortcutsPanel
          isOpen={showShortcutsPanel}
          onClose={() => setShowShortcutsPanel(false)}
          customShortcuts={customShortcuts}
        />
      )}

      {/* Indicador visual de navegación por teclado */}
      {isKeyboardUser && (
        <div
          className="fixed bottom-4 right-4 z-[9998] pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div className="bg-[#1e5da8] text-white px-3 py-2 rounded-lg shadow-lg text-xs flex items-center gap-2 animate-fadeIn">
            <kbd className="px-2 py-0.5 bg-white/20 rounded text-xs font-mono">
              ⌨️
            </kbd>
            <span>Navegación por teclado activa</span>
          </div>
        </div>
      )}

      {/* Contenido de la aplicación */}
      {children}
    </>
  );
}

/**
 * Hook para anunciar mensajes globalmente desde cualquier componente
 */
export function useGlobalAnnounce() {
  return (message: string, level: 'polite' | 'assertive' = 'polite') => {
    window.dispatchEvent(
      new CustomEvent('ux:announce', {
        detail: { message, level },
      })
    );
  };
}

/**
 * Skip Links por defecto para La Comunidad ESAP
 */
export const DEFAULT_SKIP_LINKS = [
  { id: 'skip-main', label: 'Ir al contenido principal', targetId: 'main-content' },
  { id: 'skip-nav', label: 'Ir a navegación', targetId: 'main-navigation' },
  { id: 'skip-search', label: 'Ir a búsqueda', targetId: 'search-section' },
  { id: 'skip-footer', label: 'Ir a pie de página', targetId: 'footer-section' },
];
