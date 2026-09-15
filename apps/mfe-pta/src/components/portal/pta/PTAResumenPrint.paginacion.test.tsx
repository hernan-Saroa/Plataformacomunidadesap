import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PTAResumenPrint } from './PTAResumenPrint';

/**
 * El reporte se descarga con window.print(), así que la calidad del PDF depende
 * por completo del bloque @media print. Estas pruebas fijan las reglas de
 * paginación: sin ellas el contenido se parte a mitad de fila, las tablas
 * pierden su cabecera al pasar de página y el documento arrastra una última
 * hoja en blanco.
 */

const ptaBase = {
  id: '5922e6f7-0716-4aaa-bbbb-cccccccccccc',
  periodo: '2026-2',
  estado: 'Borrador',
  dedicacion: 'Tiempo Completo',
  semanas_vinculacion: 20,
  horas_asignables: 800,
  asignaturas: [
    { nombre: 'Economia De Lo Público I', creditos: 3, estudiantes: 100, total_horas: 144 },
  ],
};

function montar() {
  // La hoja se monta con createPortal en document.body, así que el árbol a
  // inspeccionar es baseElement (document.body), no container.
  const { baseElement } = render(
    <PTAResumenPrint pta={ptaBase} onClose={() => {}} userPersonId="9bd56f7b-381b" userName="ALIX HURTADO" />,
  );
  const css = Array.from(baseElement.querySelectorAll('style'))
    .map(node => node.textContent || '')
    .join('\n');
  return { baseElement, css };
}

describe('PTAResumenPrint — paginación del PDF', () => {
  it('monta la hoja como hijo directo de body para poder aislar la impresión', () => {
    const { baseElement } = montar();
    const overlay = baseElement.querySelector('.resumen-pta-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.parentElement).toBe(document.body);
  });

  it('apaga el resto de la página con display:none, no con visibility:hidden', () => {
    // visibility:hidden deja el layout en pie: el documento heredaba la altura
    // del portal docente completo y salía una hoja final en blanco.
    const { css } = montar();
    expect(css).toMatch(/body > \*:not\(\.resumen-pta-overlay\)\s*\{[^}]*display:\s*none/);
    expect(css).not.toMatch(/body \*\s*\{\s*visibility:\s*hidden/);
  });

  it('deja el overlay y la hoja sin alto ni posicionamiento fijos al imprimir', () => {
    const { css } = montar();
    expect(css).toMatch(/\.resumen-pta-overlay\s*\{[^}]*position:\s*static/);
    expect(css).toMatch(/\.resumen-pta-overlay\s*\{[^}]*height:\s*auto/);
    expect(css).toMatch(/\.resumen-pta-sheet\s*\{[^}]*height:\s*auto/);
    expect(css).toMatch(/html,\s*body\s*\{[^}]*height:\s*auto/);
  });

  it('define el tamaño de página y márgenes con @page', () => {
    const { css } = montar();
    expect(css).toContain('@page');
    expect(css).toMatch(/size:\s*A4 portrait/);
  });

  it('ajusta las tablas al ancho real de la página en lugar de recortarlas', () => {
    // En pantalla las tablas llevan min-width de 620 a 760px; en A4 vertical el
    // ancho útil es menor y la última columna quedaba cortada.
    const { css } = montar();
    expect(css).toMatch(/\.resumen-pta-body table\s*\{[^}]*min-width:\s*0/);
    expect(css).toMatch(/\.resumen-pta-body table\s*\{[^}]*max-width:\s*100%/);
  });

  it('impide que una fila de tabla se parta entre dos páginas', () => {
    const { css } = montar();
    expect(css).toMatch(/\.resumen-pta-body tr\s*\{[^}]*break-inside:\s*avoid/);
    // Fallback para motores que solo entienden la propiedad antigua.
    expect(css).toMatch(/\.resumen-pta-body tr\s*\{[^}]*page-break-inside:\s*avoid/);
  });

  it('repite la cabecera de cada tabla en las páginas siguientes', () => {
    const { css } = montar();
    expect(css).toMatch(/thead\s*\{\s*display:\s*table-header-group/);
  });

  it('deja que las tablas largas se repartan entre páginas', () => {
    // Si la tabla fuera atómica, una tabla de 40 asignaturas saltaría entera a
    // la página siguiente dejando un hueco enorme.
    const { css } = montar();
    expect(css).toMatch(/\.resumen-pta-body table\s*\{[^}]*break-inside:\s*auto/);
  });

  it('mantiene enteros los bloques atómicos y no deja títulos huérfanos', () => {
    const { css } = montar();
    expect(css).toMatch(/\.resumen-pta-firmas\s*\{[^}]*break-inside:\s*avoid/);
    expect(css).toMatch(/\.resumen-pta-titulo\s*\{[^}]*break-after:\s*avoid/);
  });

  it('marca en el DOM los bloques que la paginación necesita anclar', () => {
    const { baseElement } = montar();
    expect(baseElement.querySelector('.resumen-pta-membrete')).not.toBeNull();
    expect(baseElement.querySelector('.resumen-pta-card')).not.toBeNull();
    expect(baseElement.querySelector('.resumen-pta-firmas')).not.toBeNull();
    expect(baseElement.querySelectorAll('.resumen-pta-titulo').length).toBeGreaterThan(0);
    expect(baseElement.querySelectorAll('.resumen-pta-seccion').length).toBeGreaterThan(0);
  });

  it('neutraliza el overflow para que el scroll horizontal no recorte la tabla en papel', () => {
    const { css } = montar();
    expect(css).toMatch(/\.resumen-pta-body \*\s*\{[^}]*overflow:\s*visible/);
  });

  it('conserva los colores de fondo al imprimir', () => {
    const { css } = montar();
    expect(css).toMatch(/print-color-adjust:\s*exact/);
  });
});
