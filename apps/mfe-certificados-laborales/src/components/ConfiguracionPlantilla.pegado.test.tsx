import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const contenidoGuardado =
  '<p>Que [NOMBRE_EMPLEADO] identificado con No. [DOCUMENTO].</p>' +
  '<section class="labor-functions-template-block" data-functions-template="true"><p>Intro</p><p>[FUNCIONES]</p></section>' +
  '<p>Fin.</p>';

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

const portapapeles = (datos: Record<string, string>) => ({
  clipboardData: { getData: (tipo: string) => datos[tipo] || '', types: Object.keys(datos), files: [] },
});

async function abrirEditor() {
  render(<ConfiguracionPlantilla canEdit currentUserEmail="admin@esap.edu.co" />);
  const editor = await waitFor(() => {
    const elemento = document.querySelector<HTMLDivElement>('[contenteditable="true"]');
    if (!elemento || !elemento.innerHTML.includes('[FUNCIONES]')) throw new Error('editor sin contenido');
    return elemento;
  }, { timeout: 4000 });
  return editor;
}

/** Deja el cursor al final del último párrafo del editor. */
function cursorAlFinal(editor: HTMLElement) {
  const ultimo = editor.lastElementChild || editor;
  const rango = document.createRange();
  rango.selectNodeContents(ultimo);
  rango.collapse(false);
  const seleccion = window.getSelection()!;
  seleccion.removeAllRanges();
  seleccion.addRange(rango);
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('ConfiguracionPlantilla — pegar desde otra plantilla', () => {
  it('pega sin estilos externos, con variables resaltadas y sin duplicar el bloque de funciones', async () => {
    const editor = await abrirEditor();
    cursorAlFinal(editor);

    const copiado =
      '<!--StartFragment--><p style="font-family: Arial; font-size: 16px; color: rgb(0, 0, 0);">Que ' +
      '<span class="variable-token bg-yellow-200" style="background-color: rgb(254, 240, 138);">[CARGO]</span> nuevo</p>' +
      '<section class="labor-functions-template-block" data-functions-template="true"><p>Otra intro</p><p>[FUNCIONES]</p></section><!--EndFragment-->';

    await act(async () => {
      fireEvent.paste(editor, portapapeles({ 'text/html': copiado, 'text/plain': 'Que [CARGO] nuevo' }));
    });

    const html = editor.innerHTML;
    expect(html).toContain('[CARGO]');
    expect(html).not.toMatch(/font-family|font-size: 16px|background-color|StartFragment/);
    // La plantilla ya tenía su bloque de funciones: no se duplica.
    expect(html.match(/data-functions-template="true"/g)).toHaveLength(1);
    expect(toast.info).toHaveBeenCalledWith('Contenido pegado y limpiado', expect.anything());
  });

  it('al reemplazar todo (Ctrl+A) conserva el bloque de funciones que viene en lo pegado', async () => {
    const editor = await abrirEditor();
    const rango = document.createRange();
    rango.selectNodeContents(editor);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(rango);

    const plantillaCompleta =
      '<p>Que [NOMBRE_EMPLEADO] con No. [DOCUMENTO].</p>' +
      '<section class="labor-functions-template-block" data-functions-template="true"><p>Intro nueva</p><p>[FUNCIONES]</p></section>';

    await act(async () => {
      fireEvent.paste(editor, portapapeles({ 'text/html': plantillaCompleta }));
    });

    expect(editor.innerHTML.match(/data-functions-template="true"/g)).toHaveLength(1);
    expect(editor.textContent).toContain('Intro nueva');
    expect(editor.textContent).not.toContain('Fin.');
  });

  it('muestra la revisión cuando se pega el texto de un certificado ya generado', async () => {
    const editor = await abrirEditor();
    cursorAlFinal(editor);

    await act(async () => {
      fireEvent.paste(editor, portapapeles({ 'text/plain': 'Que DIANA MARIA identificado con No. 53062883 percibe $1.000.000' }));
    });

    const revision = await screen.findByTestId('revision-variables-plantilla');
    expect(revision.textContent).toContain('"53062883" parece un dato de un certificado ya generado');
    expect(revision.textContent).toContain('"$1.000.000" parece un dato de un certificado ya generado');
  });

  it('copiar y pegar el contenido completo conserva el bloque de funciones aunque el navegador lo pierda al insertar', async () => {
    const editor = await abrirEditor();

    // 1. Copiar todo (Ctrl+A, Ctrl+C) desde el editor.
    const seleccionarTodo = () => {
      const rango = document.createRange();
      rango.selectNodeContents(editor);
      window.getSelection()!.removeAllRanges();
      window.getSelection()!.addRange(rango);
    };
    seleccionarTodo();
    const copiado: Record<string, string> = {};
    fireEvent.copy(editor, { clipboardData: { setData: (tipo: string, valor: string) => { copiado[tipo] = valor; } } });
    expect(copiado['text/html']).toContain('data-functions-template="true"');

    // 2. Pegar sobre todo (Ctrl+A, Ctrl+V) con un insertHTML que, como puede
    //    hacer Chrome, descarta el marco <section> del bloque de funciones.
    const execOriginal = document.execCommand;
    (document as any).execCommand = vi.fn((comando: string, _ui: boolean, html: string) => {
      if (comando !== 'insertHTML') return false;
      const rango = window.getSelection()!.getRangeAt(0);
      rango.deleteContents();
      rango.insertNode(rango.createContextualFragment(html.replace(/<\/?section\b[^>]*>/g, '')));
      return true;
    });
    try {
      seleccionarTodo();
      await act(async () => {
        fireEvent.paste(editor, portapapeles(copiado));
      });
    } finally {
      (document as any).execCommand = execOriginal;
    }

    const bloques = editor.querySelectorAll('section[data-functions-template="true"]');
    expect(bloques).toHaveLength(1);
    expect(bloques[0].textContent).toContain('[FUNCIONES]');
    expect(bloques[0].textContent).toContain('Intro');
    expect(editor.textContent).toContain('Fin.');
    expect(screen.queryByText(/quedó fuera del bloque de funciones/)).toBeNull();
  });

  it('una variable sola sigue pegándose como antes', async () => {
    const editor = await abrirEditor();
    cursorAlFinal(editor);

    await act(async () => {
      fireEvent.paste(editor, portapapeles({ 'text/plain': '[cargo]' }));
    });

    expect(editor.innerHTML).toMatch(/<span class="variable-token[^"]*"[^>]*>\[CARGO\]<\/span>/);
  });
});
