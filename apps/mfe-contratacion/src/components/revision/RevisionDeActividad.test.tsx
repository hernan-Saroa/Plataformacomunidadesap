import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RevisionDeActividad } from './RevisionDeActividad';
import { contratacionService } from '../../services/contratacionService';
import { fijarAlcance } from '../../auth/alcance';
import { olvidarResponsables } from '../../auth/responsables';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));


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
  revision: { puedeDecidir: true, motivo: null, acciones: ['APROBAR', 'DEVOLVER', 'NEGAR'] },
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
      { numeral: '3.6', nombre: 'Causal de contratación', etapa: 3, aplica: true, estado: 'BORRADOR' },
    ] as never);
    vi.spyOn(contratacionService, 'participacion').mockResolvedValue({
      contratacion: { nombre: 'Laura Pineda', esMio: false },
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
      await screen.findByText(/Causal de contratación · Gestor de contratación/),
    ).toBeInTheDocument();
  });

  it('a quien no le toca le dice a quién espera', async () => {
    pintar(
      estudio({
        revision: { puedeDecidir: false, motivo: 'EN_CADENA', espera: 'Espera al escalón 1, Abogado: Andrés Rojas (Abogado).' },
      }),
    );

    expect(await screen.findByText(/Espera al escalón 1, Abogado: Andrés Rojas/)).toBeInTheDocument();
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

/**
 * La revisión del pliego definitivo (5.6.1) se aprueba sobre el proceso
 * entero: el estudio previo, el CDP y los documentos de etapas anteriores se
 * leen en la misma pantalla, no solo lo que se cargó en la 5.6.1.
 */
describe('RevisionDeActividad · pliego definitivo', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    olvidarResponsables();
    fijarAlcance({ alcances: [{ accion: 'aprobar', lugar: '5.6.1' }], transversales: [] });
    vi.spyOn(contratacionService, 'obtenerEstudioPrevio').mockResolvedValue(
      estudio({ estado: 'APROBADO' }) as never,
    );
    vi.spyOn(contratacionService, 'actividades').mockResolvedValue([
      { numeral: '3.1', nombre: 'Estudio previo', etapa: 3, aplica: true, estado: 'APROBADO' },
      { numeral: '4.2', nombre: 'Expedición del CDP', etapa: 4, aplica: true, estado: 'APROBADO' },
      { numeral: '5.1', nombre: 'Documentos del proceso', etapa: 5, aplica: true, estado: 'APROBADO' },
      { numeral: '5.6.1', nombre: 'Pliego definitivo', etapa: 5, aplica: true, estado: 'EN_REVISION' },
    ] as never);
    vi.spyOn(contratacionService, 'participacion').mockResolvedValue({
      contratacion: { nombre: 'Laura Pineda', esMio: false },
      financiera: null,
    } as never);
    vi.spyOn(contratacionService, 'responsables').mockResolvedValue([] as never);
    vi.spyOn(contratacionService, 'revisiones').mockResolvedValue([] as never);
    vi.spyOn(contratacionService, 'aprobadoresDeActividad').mockRejectedValue(new Error('sin red'));
    vi.spyOn(contratacionService, 'segundaSesionComite').mockResolvedValue({
      aplica: true,
      estado: 'EN_REVISION',
      cdp: { cumplido: true, motivo: null },
      documentos: [],
      sesiones: [],
      puedeAjustar: false,
      puedeRetirar: false,
      puedeRegistrar: false,
      puedeCargarActa: false,
    } as never);
    vi.spyOn(contratacionService, 'obtenerExpediente').mockResolvedValue({
      numeroExpediente: 'EXP-2026-0010',
      estado: 'ABIERTO',
      fechaApertura: '2026-09-01',
      documentos: [
        {
          id: 'd-cdp',
          tipo: 'ADJUNTO',
          nombre: 'CDP 1234.pdf',
          numeral: '4.2',
          requisito: null,
          requisitoNombre: null,
          sustituido: false,
          mimeType: 'application/pdf',
          tamano: 1000,
          hashSha256: 'abc',
          version: 1,
          subidoPor: 'Laura Pineda',
          createdAt: '2026-09-10T10:00:00Z',
          descargaUrl: '/files/cdp.pdf',
        },
      ],
    } as never);
  });

  const pintar = () =>
    render(
      <RevisionDeActividad
        procesoId="p-1"
        numeral="5.6.1"
        volverA="Por revisar"
        onVolver={vi.fn()}
        onVerProceso={vi.fn()}
      />,
    );

  it('enseña los documentos de todo el proceso, con el CDP de la etapa 4', async () => {
    pintar();

    await userEvent.click(await screen.findByRole('button', { name: /Documentos del proceso/ }));

    expect(await screen.findByText('CDP 1234.pdf')).toBeInTheDocument();
    expect(screen.getByText('Expedición del CDP')).toBeInTheDocument();
    // Solo lectura: quien revisa no adjunta.
    expect(screen.queryByRole('button', { name: /Adjuntar/ })).toBeNull();
  });

  it('deja leer el estudio previo sin salir de la revisión', async () => {
    pintar();

    await userEvent.click(await screen.findByRole('button', { name: /^Estudio previo$/ }));

    expect(await screen.findByText('Asesoría jurídica especializada')).toBeInTheDocument();
  });
});
