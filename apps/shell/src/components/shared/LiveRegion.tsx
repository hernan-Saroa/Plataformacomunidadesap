/**
 * LiveRegion Component
 * Región ARIA live para anuncios dinámicos a lectores de pantalla
 */

import { useLiveAnnouncements } from '../../hooks/useAccessibility';
import { useEffect } from 'react';

interface LiveRegionProps {
  message?: string;
  level?: 'polite' | 'assertive';
  duration?: number;
  className?: string;
}

export function LiveRegion({ 
  message = '', 
  level = 'polite', 
  duration = 3000,
  className = '' 
}: LiveRegionProps) {
  const { announcement, announce } = useLiveAnnouncements();

  useEffect(() => {
    if (message) {
      announce(message, level, duration);
    }
  }, [message, level, duration, announce]);

  return (
    <div
      role="status"
      aria-live={level}
      aria-atomic="true"
      className={`sr-only ${className}`}
    >
      {announcement}
    </div>
  );
}

/**
 * Hook para usar LiveRegion programáticamente
 */
export function useLiveRegion() {
  const { announcement, announce } = useLiveAnnouncements();

  return {
    announcement,
    announcePolite: (message: string, duration?: number) => announce(message, 'polite', duration),
    announceAssertive: (message: string, duration?: number) => announce(message, 'assertive', duration),
  };
}
