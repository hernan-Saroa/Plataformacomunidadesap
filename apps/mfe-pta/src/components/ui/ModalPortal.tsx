/**
 * MODAL PORTAL
 * 
 * Renderiza modales directamente en document.body usando React Portals
 * Esto asegura que los modales SIEMPRE estén en la capa superior,
 * sin importar overflow o stacking context del contenedor padre
 * 
 * @version 1.0.0
 * @date 2026-03-02
 */

import { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: ReactNode;
  isOpen: boolean;
}

export function ModalPortal({ children, isOpen }: ModalPortalProps) {
  const portalRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Crear contenedor del portal si no existe
    if (!portalRootRef.current) {
      const portalRoot = document.createElement('div');
      portalRoot.id = 'modal-portal-root';
      portalRoot.style.position = 'fixed';
      portalRoot.style.top = '0';
      portalRoot.style.left = '0';
      portalRoot.style.width = '100%';
      portalRoot.style.height = '100%';
      portalRoot.style.pointerEvents = 'all'; // ✅ Cambio: permitir eventos
      portalRoot.style.zIndex = '100000'; // ✅ Z-index SUPER ALTO para estar sobre TODO
      document.body.appendChild(portalRoot);
      portalRootRef.current = portalRoot;
    }

    // Limpiar al desmontar
    return () => {
      if (portalRootRef.current && !document.getElementById('modal-portal-root')?.hasChildNodes()) {
        portalRootRef.current.remove();
        portalRootRef.current = null;
      }
    };
  }, []);

  // No renderizar si el modal no está abierto
  if (!isOpen || !portalRootRef.current) {
    return null;
  }

  // Renderizar en el portal
  return createPortal(children, portalRootRef.current);
}