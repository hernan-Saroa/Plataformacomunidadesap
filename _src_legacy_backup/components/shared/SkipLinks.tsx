/**
 * COMPONENTE: SKIP LINKS
 * 
 * Enlaces de salto para navegación por teclado
 * - WCAG 2.4.1 Bypass Blocks (Level A)
 * - Permite a usuarios de teclado saltar al contenido principal
 * - Oculto visualmente, visible al recibir focus
 * - Mejora dramática en UX para screen readers
 */

import React from 'react';

interface SkipLink {
  href: string;
  label: string;
}

const defaultSkipLinks: SkipLink[] = [
  { href: '#main-content', label: 'Saltar al contenido principal' },
  { href: '#sidebar-navigation', label: 'Saltar a la navegación' },
  { href: '#search', label: 'Saltar a la búsqueda' },
];

interface SkipLinksProps {
  links?: SkipLink[];
}

export function SkipLinks({ links = defaultSkipLinks }: SkipLinksProps) {
  return (
    <nav aria-label="Enlaces de navegación rápida" className="sr-only-focusable">
      {links.map((link, index) => (
        <a
          key={index}
          href={link.href}
          className="skip-link"
          onClick={(e) => {
            // Smooth scroll al target
            e.preventDefault();
            const target = document.querySelector(link.href);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
              // Dar focus al target si es focuseable
              if (target instanceof HTMLElement && target.tabIndex >= 0) {
                target.focus();
              }
            }
          }}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
