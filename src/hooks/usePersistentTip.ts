import { useState, useEffect } from 'react';

/**
 * Hook para manejar tips con persistencia en localStorage
 * Los tips cerrados no vuelven a aparecer hasta que el usuario los resetee
 * 
 * @param tipId - Identificador único del tip (ej: 'tip_graduados_gestion')
 * @param defaultShow - Valor por defecto si no hay preferencia guardada
 * @returns [showTip, setShowTip, resetTip]
 * 
 * @example
 * const [showTip, setShowTip, resetTip] = usePersistentTip('tip_graduados', true);
 * 
 * // Cerrar tip (se guarda en localStorage)
 * <InlineTip onDismiss={() => setShowTip(false)} />
 * 
 * // Resetear tip manualmente
 * <Button onClick={resetTip}>Mostrar tips de nuevo</Button>
 */
export function usePersistentTip(
  tipId: string,
  defaultShow: boolean = true
): [boolean, (show: boolean) => void, () => void] {
  // Inicializar desde localStorage o usar valor por defecto
  const [showTip, setShowTipState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(tipId);
      if (stored === null) return defaultShow;
      return stored === 'true';
    } catch (error) {
      console.warn(`Error reading tip preference for ${tipId}:`, error);
      return defaultShow;
    }
  });

  // Sincronizar con localStorage cuando cambie
  const setShowTip = (show: boolean) => {
    try {
      localStorage.setItem(tipId, String(show));
      setShowTipState(show);
    } catch (error) {
      console.warn(`Error saving tip preference for ${tipId}:`, error);
      setShowTipState(show);
    }
  };

  // Función para resetear el tip (mostrarlo de nuevo)
  const resetTip = () => {
    setShowTip(true);
  };

  return [showTip, setShowTip, resetTip];
}

/**
 * Resetea todos los tips de la aplicación
 * Útil para "comenzar de nuevo" la experiencia de tips
 */
export function resetAllTips(): void {
  try {
    // Lista de todos los tips en la aplicación
    const allTipIds = [
      // Graduados (3 submódulos)
      'tip_graduados_gestion',
      'tip_graduados_verificacion',
      'tip_graduados_documentos',
      
      // Otros módulos
      'tip_aspirantes',
      'tip_enrolamiento',
      'tip_bolsa_empleo',
      'tip_posts',
      'tip_eventos',
      'tip_convocatorias',
      'tip_certificados',
      'tip_comunidad',
    ];

    // Resetear todos
    allTipIds.forEach(tipId => {
      localStorage.setItem(tipId, 'true');
    });

    console.log('✅ Todos los tips han sido reseteados');
  } catch (error) {
    console.warn('Error resetting tips:', error);
  }
}

/**
 * Verifica cuántos tips están actualmente ocultos
 * Útil para mostrar estadísticas o botón de reseteo
 */
export function getHiddenTipsCount(): number {
  try {
    const allTipIds = [
      'tip_graduados_gestion',
      'tip_graduados_verificacion',
      'tip_graduados_documentos',
      'tip_aspirantes',
      'tip_enrolamiento',
      'tip_bolsa_empleo',
      'tip_posts',
      'tip_eventos',
      'tip_convocatorias',
      'tip_certificados',
      'tip_comunidad',
    ];

    return allTipIds.filter(tipId => {
      const stored = localStorage.getItem(tipId);
      return stored === 'false';
    }).length;
  } catch (error) {
    console.warn('Error counting hidden tips:', error);
    return 0;
  }
}
