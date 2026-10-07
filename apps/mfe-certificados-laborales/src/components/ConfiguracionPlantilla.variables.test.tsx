import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const contenidoGuardado =
  '<p>Percibe una asignación salarial de [SALARIO][SALARIO_LETRAS] pesos m/cte.</p>' +
  '<p>Que [NOMBRE_EMPLEADO] identificado con No. [DOCUMENTO].</p>' +
  '<p><font color="#ff0000">Texto rojo [CARGO] más texto</font></p>';

vi.mock('../../services/api/certificados.service', () => ({
  certificadosService: {
    plantilla: {
      obtenerConfiguracion: vi.fn(async () => ({
        id: 1,
        version: '1.0.0',
        status: 'published',
        certificateContentHtml: contenidoGuardado,
        typography: { font: 'Arial', size: 12, color: '#000000' },
        firmante: { nombre: 'Firmante' },
      })),
      obtenerHistorialCambios: vi.fn(async () => ({ items: [], total: 0 })),
    },
  },
}));
vi.mock('qrcode.react', () => ({ QRCodeCanvas: () => null }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }) }));

import { toast } from 'sonner';
import { ConfiguracionPlantilla } from './ConfiguracionPlantilla';

async function abrirEditor() {
  render(<ConfiguracionPlantilla canEdit currentUserEmail="admin@esap.edu.co" />);
  return waitFor(() => {
    const editor = document.querySelector<HTMLDivElement>('[contenteditable="true"]');
    if (!editor || !editor.querySelector('.variable-token')) throw new Error('editor sin contenido');
    return editor;
  }, { timeout: 4000 });
}

const seleccionar = (nodo: Node) => {
  const rango = document.createRange();
  rango.selectNodeContents(nodo);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(rango);
};

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('ConfiguracionPlantilla — color exclusivo de las variables', () => {
  it('una variable a la que se le borra un corchete pierde el resaltado al instante', async () => {
    const editor = await abrirEditor();
    const documento = Array.from(editor.querySelectorAll('.variable-token')).find((t) => t.textContent === '[DOCUMENTO]')!;
    documento.textContent = '[DOCUMENTO';

    await act(async () => {
      fireEvent.input(editor);
    });

    expect(Array.from(editor.querySelectorAll('.variable-token')).map((t) => t.textContent)).not.toContain('[DOCUMENTO');
    expect(editor.textContent).toContain('[DOCUMENTO');
    // Las demás variables siguen resaltadas.
    expect(Array.from(editor.querySelectorAll('.variable-token')).map((t) => t.textContent)).toContain('[NOMBRE_EMPLEADO]');
  });

  it('la paleta no cambia ni quita el color de las variables seleccionadas', async () => {
    const editor = await abrirEditor();
    const cargo = Array.from(editor.querySelectorAll('.variable-token')).find((t) => t.textContent === '[CARGO]')!;
    expect(cargo.closest('font')).not.toBeNull(); // venía dentro del rojo

    seleccionar(editor.lastElementChild!);
    await act(async () => {
      fireEvent.click(screen.getByTitle('Negro'));
    });

    const cargoDespues = Array.from(editor.querySelectorAll('.variable-token')).find((t) => t.textContent === '[CARGO]')!;
    // Ninguna etiqueta entre la variable y su párrafo le pone color.
    const conColor: string[] = [];
    for (let el = cargoDespues.parentElement; el && el.tagName !== 'P'; el = el.parentElement) {
      if (el.tagName === 'FONT' || el.style.color) conColor.push(el.outerHTML);
    }
    expect(conColor).toEqual([]);
    // El texto alrededor conserva su color.
    expect(editor.lastElementChild!.querySelectorAll('font[color]').length).toBeGreaterThan(0);
    expect(editor.textContent).toContain('Texto rojo [CARGO] más texto');
    expect(toast.info).toHaveBeenCalledWith('Las variables conservan su color', expect.anything());
  });

  it('una variable pegada solo se avisa (completa) y no se obliga a corregir', async () => {
    const editor = await abrirEditor();
    const revision = await screen.findByTestId('revision-variables-plantilla');
    expect(revision.textContent).toContain(
      '[SALARIO] está pegada a otro texto ("[SALARIO][SALARIO_LETRAS]"). En el certificado saldrá así, sin espacio; si no es intencional, agrega uno.',
    );
    expect(screen.queryByRole('button', { name: 'Corregir automáticamente' })).toBeNull();
    // El contenido no se modifica: siguen juntas, tal cual se escribieron.
    expect(editor.textContent).toContain('[SALARIO][SALARIO_LETRAS]');
  });

  it('borrar un párrafo no muestra el aviso de estilos aunque el navegador deje estilos iguales a los de alrededor', async () => {
    const editor = await abrirEditor();
    // Lo que hace Chrome al borrar: envuelve el texto que queda con los mismos
    // estilos que ya tiene el editor.
    const parrafo = Array.from(editor.querySelectorAll('p')).find((p) => p.textContent?.startsWith('Que '))!;
    const span = document.createElement('span');
    span.setAttribute('style', `font-family: ${editor.style.fontFamily}; font-size: ${editor.style.fontSize}; line-height: ${editor.style.lineHeight};`);
    while (parrafo.firstChild) span.appendChild(parrafo.firstChild);
    parrafo.appendChild(span);
    // Las variables y el texto se mantienen; se reconstruye el editor desde ese DOM.
    await act(async () => {
      fireEvent.input(editor);
    });

    expect(span.hasAttribute('style')).toBe(false);
    expect(screen.queryByText(/estilos de fuente, tamaño o fondo/)).toBeNull();
  });

  it('el color Café es un color válido', async () => {
    await abrirEditor();
    expect((screen.getByTitle('Cafe') as HTMLElement).style.backgroundColor).toBe('rgb(165, 42, 42)');
  });
});
