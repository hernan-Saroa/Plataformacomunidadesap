import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
vi.mock('../../services/api/ptaApi', () => ({
  getComponentesAprobacion: vi.fn().mockResolvedValue({ success: false }),
}));

import { ReporteIndividualPTA } from './ReporteIndividualPTA';

/**
 * El R-01 se exportaba rasterizando TODO el informe con html2canvas en una sola
 * imagen y cortándola por píxeles entre páginas: cada salto partía por la mitad
 * la fila, la tarjeta o el título que cayera ahí, el texto no quedaba
 * seleccionable y el archivo pesaba de más.
 *
 * Ahora se imprime de verdad y el bloque @media print controla los saltos.
 * Estas pruebas fijan esas reglas: nadie las revisa mirando la pantalla.
 */
afterEach(cleanup);

describe('ReporteIndividualPTA — exportación y paginación', () => {
  const pta = {
    id: '5922e6f7-0716-4d65-bee5-c1385f57da39',
    periodo: '2026-2',
    estado: 'Borrador',
    dedicacion: 'Tiempo Completo',
    tipo_vinculacion: 'OCASIONAL',
    semanas_vinculacion: 20,
    horas_asignables: 800,
    docente_nombre: 'ALIX ZULAY HURTADO SOTO',
    documento_identidad: '37291100',
    asignaturas: [
      { nombre: 'Economia De Lo Público I', creditos: 3, estudiantes: 100, total_horas: 144 },
    ],
  };

  const montar = () => {
    const { baseElement, container } = render(
      <ReporteIndividualPTA pta={pta} onClose={() => {}} />,
    );
    const css = Array.from(baseElement.querySelectorAll('style'))
      .map((node) => node.textContent || '')
      .join('\n');
    return { baseElement, container, css };
  };

  it('exporta abriendo el diálogo de impresión, sin rasterizar', () => {
    const spy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const { baseElement } = montar();

    const boton = Array.from(baseElement.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('Exportar PDF'),
    );
    expect(boton).toBeTruthy();
    boton?.click();

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('NO se monta con portal: varios paneles del backoffice ya se portan a body', () => {
    // Portearlo aparte lo dejaba como hermano del panel que lo contiene, el
    // panel le pasaba por encima y la pantalla quedaba inutilizable.
    const { container, baseElement } = montar();
    const overlay = baseElement.querySelector('.r01-overlay');
    expect(overlay).not.toBeNull();
    expect(container.contains(overlay)).toBe(true);
  });

  it('colapsa con display:none todo lo que no contenga el reporte', () => {
    //  funciona sin importar cuán anidado esté el reporte; es lo que
    // evita que el documento arrastre hojas en blanco.
    const { css } = montar();
    expect(css).toMatch(/body > \*:not\(:has\(\.r01-overlay\)\)\s*\{[^}]*display:\s*none/);
  });

  it('deja un respaldo de visibilidad para motores sin :has()', () => {
    const { css } = montar();
    expect(css).toMatch(/body \*\s*\{[^}]*visibility:\s*hidden/);
    expect(css).toMatch(/\.r01-overlay \*\s*\{[^}]*visibility:\s*visible/);
  });

  it('neutraliza los ancestros que recortan el reporte', () => {
    // El reporte se abre dentro de paneles position:fixed con max-height y
    // overflow:hidden. Sin resetear los ancestros, el padre lo recorta y el PDF
    // sale con UNA sola pagina y el contenido cortado.
    const { css } = montar();
    const regla = css.match(/body :has\(\.r01-overlay\)\s*\{[^}]*\}/)?.[0] || '';
    expect(regla).toMatch(/overflow:\s*visible/);
    expect(regla).toMatch(/max-height:\s*none/);
    expect(regla).toMatch(/position:\s*static/);
  });

  it('define tamaño y márgenes de página', () => {
    const { css } = montar();
    expect(css).toContain('@page');
    expect(css).toMatch(/size:\s*A4 portrait/);
  });

  it('impide que una fila se parta entre dos páginas', () => {
    const { css } = montar();
    expect(css).toMatch(/\.r01-hoja tr\s*\{[^}]*break-inside:\s*avoid/);
    expect(css).toMatch(/\.r01-hoja tr\s*\{[^}]*page-break-inside:\s*avoid/);
  });

  it('repite la cabecera de cada tabla en las páginas siguientes', () => {
    const { css } = montar();
    expect(css).toMatch(/thead\s*\{\s*display:\s*table-header-group/);
  });

  it('deja que las tablas largas se repartan entre páginas', () => {
    const { css } = montar();
    expect(css).toMatch(/\.r01-hoja table\s*\{[^}]*break-inside:\s*auto/);
  });

  it('no deja un encabezado de sección solo al pie de página', () => {
    const { css } = montar();
    expect(css).toMatch(/\.r01-seccion-titulo\s*\{[^}]*break-after:\s*avoid/);
  });

  it('oculta la barra de acciones en el PDF con una clase propia', () => {
    // `print:hidden` de Tailwind no existe en el snapshot precompilado del MFE.
    const { baseElement, css } = montar();
    expect(baseElement.querySelector('.r01-no-print')).not.toBeNull();
    expect(css).toMatch(/\.r01-no-print\s*\{[^}]*display:\s*none/);
  });

  it('neutraliza el scroll para que no recorte el contenido en papel', () => {
    const { css } = montar();
    expect(css).toMatch(/\.r01-overlay \*\s*\{[^}]*overflow:\s*visible/);
  });

  it('conserva los colores de fondo al imprimir', () => {
    const { css } = montar();
    expect(css).toMatch(/print-color-adjust:\s*exact/);
  });

  it('marca en el DOM los bloques que la paginación necesita anclar', () => {
    const { baseElement } = montar();
    expect(baseElement.querySelector('.r01-hoja')).not.toBeNull();
    expect(baseElement.querySelectorAll('.r01-seccion-titulo').length).toBeGreaterThan(0);
  });
});
