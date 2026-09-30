import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RevisionDeActividad } from './RevisionDeActividad';
import { contratacionService } from '../../services/contratacionService';
import { fijarAlcance } from '../../auth/alcance';
import { olvidarResponsables } from '../../auth/responsables';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const abogado = { nombre: 'Andrés Rojas', usuarioNombre: 'andres@esap', cargo: null };

const estudio = (cambios: Record<string, unknown> = {}) => ({
  proceso: {
    id: 'p-1',
    radicado: 'CTO-2026-0010',
    objeto: 'Apoyo jurídico a la Dirección',
    modalidad: 'MINIMA_CUANTIA',
    modalidadNombre: 'Mínima Cuantía',
    valorEstimado: 20000000,
    etapa: 3,
  },
  estado: 'EN_REVISION',
  version: 2,
  datos: { objeto_contrato: 'Asesoría jurídica especializada' },
  definicionCampos: [
    {
      id: 'c-1',
      numeral: '3.1',
      codigo: 'objeto_contrato',
      etiqueta: 'Objeto del contrato',
      tipo: 'texto_largo',
      obligatorio: true,
      grupo: 'Necesidad',
      orden: 1,
    },
  ],
  editable: false,
  revision: { abogado, puedeDecidir: true, motivo: null },
  ...cambios,
});

/**
 * La revisión del estudio previo, en su propia pantalla.
 *
 * El abogado lee el estudio como documento —no el formulario apagado de quien
 * redactó— y decide al lado, sabiendo a dónde pasa el proceso.
 */
describe('RevisionDeActividad · estudio previo', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    olvidarResponsables();
    fijarAlcance({ alcances: [{ accion: 'aprobar', lugar: '3.4' }], transversales: [] });
    vi.spyOn(contratacionService, 'actividades').mockResolvedValue([
      { numeral: '3.1', nombre: 'Estudio previo', etapa: 3, aplica: true, estado: 'EN_REVISION' },
      { numeral: '3.3', nombre: 'Radicación', etapa: 3, aplica: true, estado: 'APROBADO' },
      { numeral: '3.5', nombre: 'Definir modalidad de contratación', etapa: 3, aplica: true, estado: 'BORRADOR' },
    ] as never);
    vi.spyOn(contratacionService, 'participacion').mockResolvedValue({
      contratacion: { nombre: 'Laura Pineda', esMio: false },
      abogado: { nombre: 'Andrés Rojas', esMio: true },
      financiera: null,
    } as never);
    vi.spyOn(contratacionService, 'responsables').mockResolvedValue([
      { rol: 'Gestor de contratación', accion: 'editar', lugar: 'E3' },
    ] as never);
    vi.spyOn(contratacionService, 'revisiones').mockResolvedValue([] as never);
  });

  const pintar = (datos: Record<string, unknown>, onVerProceso = vi.fn()) => {
    vi.spyOn(contratacionService, 'obtenerEstudioPrevio').mockResolvedValue(datos as never);
    render(
      <RevisionDeActividad
        procesoId="p-1"
        numeral="3.1"
        volverA="Por revisar"
        onVolver={vi.fn()}
        onVerProceso={onVerProceso}
      />,
    );
    return onVerProceso;
  };

  it('enseña el estudio para leerlo, no el formulario', async () => {
    pintar(estudio());

    expect(await screen.findByText('Asesoría jurídica especializada')).toBeInTheDocument();
    // Ni un campo editable: es un documento.
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('al abogado le ofrece decidir y le dice a dónde pasa el proceso', async () => {
    pintar(estudio());

    expect(await screen.findByText('Tu decisión')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aprobar/ })).toBeInTheDocument();
    expect(
      await screen.findByText(/Definir modalidad de contratación · Gestor de contratación/),
    ).toBeInTheDocument();
  });

  it('a quien no le toca le dice de quién es', async () => {
    pintar(estudio({ revision: { abogado, puedeDecidir: false, motivo: 'NO_ES_TUYO' } }));

    expect(await screen.findByText(/Lo revisa Andrés Rojas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).toBeNull();
  });

  it('resuelto, dice en qué quedó y no ofrece decidir otra vez', async () => {
    pintar(estudio({ estado: 'APROBADO' }));

    expect(await screen.findByText('Estudio previo aprobado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).toBeNull();
  });

  it('deja ir al proceso completo para ver el contexto', async () => {
    const onVerProceso = pintar(estudio());

    await userEvent.click(await screen.findByRole('button', { name: /Ver el proceso completo/ }));

    expect(onVerProceso).toHaveBeenCalledWith('3.1');
  });
});
