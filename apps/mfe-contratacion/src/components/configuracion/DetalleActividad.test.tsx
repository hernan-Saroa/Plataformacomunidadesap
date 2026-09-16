import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DetalleActividad } from './DetalleActividad';
import { contratacionService } from '../../services/contratacionService';
import { FilaMatriz } from '../../types';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// La ficha solo usa del detalle del proceso las listas de paneles; montar el
// detalle entero en la prueba no aporta nada.
vi.mock('../proceso/DetalleProceso', () => ({
  ACTIVIDADES_CON_REGISTRO: { '3.2': 'Análisis del sector' },
  TIENEN_PANEL: (n: string) => ['3.1', '3.2', '5.2'].includes(n),
}));

const MODALIDADES = [
  { codigo: 'LP', nombre: 'Licitación Pública', orden: 1 },
  { codigo: 'MC', nombre: 'Mínima Cuantía', orden: 2 },
];

const fila = (numeral: string, noAplicaEn: string[] = []): FilaMatriz => ({
  numeral,
  etapa: 3,
  nombre: 'Actividad de prueba',
  descripcion: null,
  campos: 0,
  celdas: MODALIDADES.map((m) => ({
    modalidad: m.codigo,
    estado: noAplicaEn.includes(m.codigo) ? 'NO_APLICA' : 'APLICA',
    motivo: null,
    variante: null,
    reglas: 0,
    reglasPropias: 0,
  })),
});

const pintar = (f: FilaMatriz, onCambioFila = vi.fn()) =>
  render(
    <DetalleActividad
      fila={f}
      modalidades={MODALIDADES}
      resaltada={null}
      campos={[]}
      cargandoCampos={false}
      onCambioFila={onCambioFila}
      onAgregarCampo={vi.fn()}
      onRenombrarCampo={vi.fn()}
      onExigirCampo={vi.fn()}
      onQuitarCampo={vi.fn()}
    />,
  );

/** La ficha de la actividad en una sola página, diciendo lo que de verdad pasa (EFDS-1183). */
describe('DetalleActividad', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'plantillas').mockResolvedValue([]);
    vi.spyOn(contratacionService, 'aprobacionDeActividad').mockResolvedValue({
      requiereAprobacion: false,
      aprobadores: [],
    });
  });

  it('no ofrece campos configurables donde el gestor nunca los vería', async () => {
    // Solo la 3.1 pinta el formulario configurable; en las de registro, agregar
    // un campo creaba algo que nadie iba a ver.
    pintar(fila('3.2'));

    expect(
      await screen.findByText('Registra la fecha en que ocurrió, una nota de lo que se hizo y el soporte.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pedir algo más/ })).toBeNull();
  });

  it('dice cuándo una actividad todavía no tiene pantalla', async () => {
    pintar(fila('9.9'));

    expect(await screen.findByText(/Todavía no tiene pantalla/)).toBeInTheDocument();
  });

  it('muestra las modalidades juntas y se salta la vista previa donde no es cierta', async () => {
    pintar(fila('3.2', ['MC']));

    expect(await screen.findByRole('button', { name: /Licitación Pública/, pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mínima Cuantía/, pressed: false })).toBeInTheDocument();
    expect(screen.queryByText('Cómo lo verá el gestor')).toBeNull();
  });

  it('dejar de exigirla en una modalidad pide el motivo y lo guarda', async () => {
    const cambiar = vi
      .spyOn(contratacionService, 'cambiarAplicabilidad')
      .mockResolvedValue({} as never);
    const onCambioFila = vi.fn();
    pintar(fila('3.2'), onCambioFila);

    await userEvent.click(await screen.findByRole('button', { name: /Licitación Pública/ }));
    await userEvent.type(screen.getByRole('textbox', { name: /por qué/i }), 'No aplica en licitación');
    await userEvent.click(screen.getByRole('button', { name: 'Ya no se exige' }));

    expect(cambiar).toHaveBeenCalledWith('3.2', {
      modalidad: 'LP',
      aplica: false,
      motivo: 'No aplica en licitación',
    });
    expect(onCambioFila).toHaveBeenCalled();
  });
});
