import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Plantilla docente con los mismos párrafos de la plantilla por defecto pero
// SIN el marco del bloque de funciones (como queda al pegar desde el Bloc de notas).
const intro =
  'Conforme lo establece el Manual Específico de Funciones y Competencias Laborales de los empleos de la planta de personal administrativo de la Escuela Superior de Administración Pública – ESAP -.';
const contenidoSinMarco =
  '<p>Que [NOMBRE_EMPLEADO] identificado(a) con cédula de ciudadanía No. [DOCUMENTO].</p>' +
  `<p>${intro}</p><p>Las funciones para el cargo de son:</p><p>[FUNCIONES]</p>` +
  '<p>Se expide en la ciudad de Bogotá D.C.</p>';

vi.mock('../../services/api/certificados.service', () => ({
  certificadosService: {
    plantilla: {
      obtenerConfiguracion: vi.fn(async () => ({
        id: 1,
        version: '1.0.0',
        status: 'published',
        certificateContentHtml: contenidoSinMarco,
        typography: { font: 'Arial', size: 12, color: '#000000' },
        firmante: { nombre: 'Firmante' },
      })),
      obtenerHistorialCambios: vi.fn(async () => ({ items: [], total: 0 })),
    },
  },
}));
vi.mock('qrcode.react', () => ({ QRCodeCanvas: () => null }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }) }));

import { ConfiguracionPlantilla } from './ConfiguracionPlantilla';

async function abrirEditor() {
  render(<ConfiguracionPlantilla canEdit currentUserEmail="admin@esap.edu.co" />);
  return waitFor(() => {
    const editor = document.querySelector<HTMLDivElement>('[contenteditable="true"]');
    if (!editor || !editor.querySelector('.variable-token')) throw new Error('editor sin contenido');
    return editor;
  }, { timeout: 4000 });
}

const avisoFueraDelBloque = () => screen.queryByText(/sin el marco del bloque de funciones|quedó fuera del bloque de funciones/);

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('ConfiguracionPlantilla — texto pegado desde el Bloc de notas', () => {
  it('una plantilla que perdió el marco se arregla con "Corregir automáticamente"', async () => {
    const editor = await abrirEditor();
    expect(avisoFueraDelBloque()).not.toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Corregir automáticamente' }));
    });

    const bloque = editor.querySelector('section[data-functions-template="true"]');
    expect(bloque).not.toBeNull();
    expect(bloque!.textContent).toContain('Las funciones para el cargo de son:');
    expect(bloque!.textContent).toContain('[FUNCIONES]');
    expect(bloque!.textContent).not.toContain('Que ');
    expect(avisoFueraDelBloque()).toBeNull();
  });

  it('pegar el mismo contenido como texto plano (Ctrl+A, Ctrl+V) arma el bloque y no muestra el aviso', async () => {
    const editor = await abrirEditor();
    const textoPlano = [
      'Que [NOMBRE_EMPLEADO] identificado(a) con cédula de ciudadanía No. [DOCUMENTO]. ',
      '',
      `${intro} `,
      '',
      'Las funciones para el cargo de son: ',
      '',
      '[FUNCIONES] ',
      '',
      'Se expide en la ciudad de Bogotá D.C.',
    ].join('\r\n');

    const rango = document.createRange();
    rango.selectNodeContents(editor);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(rango);
    await act(async () => {
      fireEvent.paste(editor, { clipboardData: { getData: (tipo: string) => (tipo === 'text/plain' ? textoPlano : '') } });
    });

    const bloques = editor.querySelectorAll('section[data-functions-template="true"]');
    expect(bloques).toHaveLength(1);
    expect(bloques[0].textContent).toContain('[FUNCIONES]');
    expect(editor.textContent).toContain('Se expide en la ciudad de Bogotá D.C.');
    expect(avisoFueraDelBloque()).toBeNull();
  });
});
