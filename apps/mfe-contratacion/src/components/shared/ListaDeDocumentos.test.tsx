import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ListaDeDocumentos } from './ListaDeDocumentos';
import { contratacionService } from '../../services/contratacionService';
import { DocumentoDeLaActividad, EstadoDocumentosActividad } from '../../types';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const documento = (cambios: Partial<DocumentoDeLaActividad> = {}): DocumentoDeLaActividad => ({
  requisitoId: 'r-1',
  codigo: 'MEMORANDO',
  nombre: 'Memorando de solicitud',
  descripcion: 'Firmado por el jefe del área que remite el proceso.',
  obligatorio: true,
  informativo: false,
  confirmado: true,
  estado: 'PENDIENTE',
  plantilla: null,
  cargado: null,
  ...cambios,
});

const estado = (
  documentos: DocumentoDeLaActividad[],
  cambios: Partial<EstadoDocumentosActividad> = {},
): EstadoDocumentosActividad => ({
  numeral: '3.1',
  modalidad: 'MINIMA_CUANTIA',
  tipologia: null,
  documentos,
  adicionales: [],
  faltantes: documentos
    .filter((d) => d.obligatorio && !d.cargado)
    .map((d) => ({ codigo: d.codigo, nombre: d.nombre })),
  completo: documentos.every((d) => !d.obligatorio || d.cargado),
  puedeCargar: true,
  ...cambios,
});

const cargado = {
  id: 'e-1',
  documentoId: 'd-1',
  nombre: 'memorando.pdf',
  descargaUrl: '/files/abc.pdf',
  subidoPor: 'gestor@esap.edu.co',
  cargadoAt: '2026-09-20T10:00:00.000Z',
};

/**
 * La lista de chequeo de una actividad (EFDS-2066).
 *
 * Es la misma pieza para las sesenta y tres: lo que cambia es lo que el
 * catálogo le pida a cada una. Estas pruebas fijan lo que el usuario tiene que
 * poder hacer en cada fila sin salir de ella.
 */
describe('ListaDeDocumentos', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'obtenerExpediente').mockResolvedValue({
      documentos: [],
    } as never);
  });

  const pintar = (datos: EstadoDocumentosActividad, props: Record<string, unknown> = {}) => {
    vi.spyOn(contratacionService, 'documentosDeActividad').mockResolvedValue(datos);
    return render(<ListaDeDocumentos procesoId="p-1" numeral="3.1" {...props} />);
  };

  it('dice qué es cada documento, si es obligatorio y si falta', async () => {
    pintar(
      estado([
        documento(),
        documento({ codigo: 'ANEXO', nombre: 'Anexo técnico', obligatorio: false, descripcion: null }),
      ]),
    );

    expect(await screen.findByText('Memorando de solicitud')).toBeInTheDocument();
    expect(screen.getByText(/Firmado por el jefe del área/)).toBeInTheDocument();
    expect(screen.getByText('Obligatorio')).toBeInTheDocument();
    expect(screen.getByText('Opcional')).toBeInTheDocument();
    // Solo cuentan los obligatorios: el anexo opcional no «falta».
    expect(screen.getByText('Falta 1 de 1 obligatorios')).toBeInTheDocument();
  });

  it('ofrece los de consulta para descargar, sin carga ni pendiente', async () => {
    pintar(
      estado([
        documento({
          codigo: 'GUIA',
          nombre: 'Guía de estudios previos',
          obligatorio: false,
          informativo: true,
          plantilla: { codigo: 'BS-GU-001', nombre: 'Guía', version: '1', descargaUrl: '/files/guia.pdf' },
        }),
      ]),
    );

    expect(await screen.findByText('Para consultar')).toBeInTheDocument();
    expect(screen.getByText('Guía de estudios previos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Descargar \(BS-GU-001, versión 1\)/ })).toBeInTheDocument();
    expect(screen.queryByText('Pendiente')).not.toBeInTheDocument();
    expect(screen.queryByText('Opcional')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cargar/ })).not.toBeInTheDocument();
  });

  it('no lista como documento la copia del formulario que sella el envío', async () => {
    vi.spyOn(contratacionService, 'obtenerExpediente').mockResolvedValue({
      documentos: [
        {
          id: 's-1',
          numeral: '3.1',
          tipo: 'SNAPSHOT_FORMULARIO',
          nombre: 'Estudio previo',
          descargaUrl: null,
          subidoPor: 'gestor@esap.edu.co',
          createdAt: '2026-09-30T10:00:00.000Z',
        },
      ],
    } as never);
    pintar(estado([documento({ codigo: 'P1', nombre: 'p1', cargado })]));

    expect(await screen.findByText('p1')).toBeInTheDocument();
    expect(screen.queryByText('Estudio previo')).not.toBeInTheDocument();
    expect(screen.queryByText('Otros documentos adjuntos')).not.toBeInTheDocument();
  });

  it('ofrece la plantilla donde el documento tiene una', async () => {
    pintar(
      estado([
        documento({
          plantilla: {
            codigo: 'BS-FO-047',
            nombre: 'Estudio previo',
            version: '2',
            descargaUrl: '/files/formato.docx',
          },
        }),
      ]),
    );

    expect(await screen.findByText(/Descargar la plantilla \(BS-FO-047, versión 2\)/)).toBeInTheDocument();
  });

  it('avisa, sin bloquear, cuando la plantilla aún no tiene archivo', async () => {
    pintar(
      estado([
        documento({
          plantilla: { codigo: 'BS-FO-047', nombre: 'Estudio previo', version: '2', descargaUrl: null },
        }),
      ]),
    );

    expect(await screen.findByText(/La plantilla BS-FO-047 aún no está disponible/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cargar documento/ })).toBeEnabled();
  });

  it('carga el documento contra su código, para que cubra esa fila', async () => {
    pintar(estado([documento()]));
    const cargar = vi
      .spyOn(contratacionService, 'cargarDocumentoDeActividad')
      .mockResolvedValue({ id: 'd-9', nombre: 'Memorando de solicitud' });

    await screen.findByText('Memorando de solicitud');
    const archivo = new File(['x'], 'memorando.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]:not([multiple])') as HTMLInputElement;
    await userEvent.upload(input, archivo);

    await waitFor(() =>
      expect(cargar).toHaveBeenCalledWith('p-1', '3.1', archivo, 'MEMORANDO'),
    );
  });

  it('sustituir anula la entrega vigente antes de cargar la nueva', async () => {
    pintar(estado([documento({ estado: 'CARGADO', cargado })]));
    const anular = vi
      .spyOn(contratacionService, 'anularDocumentoDeActividad')
      .mockResolvedValue({ anulado: true });
    const cargar = vi
      .spyOn(contratacionService, 'cargarDocumentoDeActividad')
      .mockResolvedValue({ id: 'd-9', nombre: 'Memorando de solicitud' });

    await userEvent.click(await screen.findByRole('button', { name: /Reemplazar archivo/ }));
    const archivo = new File(['y'], 'memorando-v2.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]:not([multiple])') as HTMLInputElement;
    await userEvent.upload(input, archivo);

    await waitFor(() => expect(cargar).toHaveBeenCalled());
    expect(anular).toHaveBeenCalledWith('p-1', '3.1', 'e-1');
    expect(anular.mock.invocationCallOrder[0]).toBeLessThan(cargar.mock.invocationCallOrder[0]);
  });

  it('con la actividad bloqueada lista y explica, pero no ofrece cargar', async () => {
    pintar(estado([documento()]), { bloqueo: 'El estudio previo está en revisión' });

    expect(await screen.findByText(/El estudio previo está en revisión\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cargar documento/ })).toBeNull();
    expect(screen.queryByText(/Adjuntar otros documentos/)).toBeNull();
  });

  it('sin permiso para cargar no pinta los botones que el servicio rechazaría', async () => {
    pintar(estado([documento()], { puedeCargar: false }));

    expect(await screen.findByText(/El gestor aún no ha cargado este documento/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cargar documento/ })).toBeNull();
  });

  it('marca lo que aún no está contrastado con el formato oficial', async () => {
    pintar(estado([documento({ confirmado: false })]));

    expect(await screen.findByText(/aún debe confirmarlos con el formato oficial/)).toBeInTheDocument();
  });

  it('sube a quien la monta cuántos obligatorios faltan', async () => {
    const onFaltantes = vi.fn();
    pintar(estado([documento(), documento({ codigo: 'LISTA', nombre: 'Lista de chequeo' })]), {
      onFaltantes,
    });

    await waitFor(() => expect(onFaltantes).toHaveBeenLastCalledWith(2));
  });

  it('una actividad que no pide ni tiene documentos no pinta nada', async () => {
    const { container } = pintar(estado([]));

    await waitFor(() => expect(contratacionService.documentosDeActividad).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('separa lo que adjuntó quien devolvió de los anexos del gestor', async () => {
    pintar(
      estado([documento({ cargado })], {
        adicionales: [{ ...cargado, id: 'd-anexo', nombre: 'cotizacion.pdf' }],
        soportesDelRevisor: [
          {
            id: 'd-rev',
            nombre: 'correcciones.pdf',
            descargaUrl: '/files/rev.pdf',
            revisadoPor: 'abogado@esap.edu.co',
            devueltaAt: '2026-10-02T10:00:00.000Z',
          },
        ],
      }),
    );

    const grupo = await screen.findByRole('group', { name: 'Observaciones del revisor' });
    expect(grupo).toHaveTextContent('correcciones.pdf');
    expect(grupo).toHaveTextContent(/Devolución de abogado@esap.edu.co/);
    // No se retira: son del revisor, no del gestor.
    expect(grupo.querySelector('[title="Retirar del expediente"]')).toBeNull();
    expect(screen.getByText('Otros documentos adjuntos')).toBeInTheDocument();
    expect(screen.getByText('cotizacion.pdf')).toBeInTheDocument();
  });

  it('guarda el historial de las versiones sustituidas', async () => {
    pintar(
      estado([
        documento({
          cargado: { ...cargado, nombre: 'memorando-v2.pdf' },
          anteriores: [
            {
              id: 'e-0',
              documentoId: 'd-0',
              nombre: 'memorando-v1.pdf',
              descargaUrl: '/files/v1.pdf',
              subidoPor: 'gestor@esap.edu.co',
              cargadoAt: '2026-09-18T10:00:00.000Z',
              sustituidoAt: '2026-09-20T10:00:00.000Z',
              sustituidoPor: 'gestor@esap.edu.co',
            },
          ],
        }),
      ]),
    );

    const historial = await screen.findByRole('button', { name: /Historial · 1 versión anterior/ });
    expect(screen.queryByText('memorando-v1.pdf')).toBeNull();
    await userEvent.click(historial);
    expect(screen.getByText('memorando-v1.pdf')).toBeInTheDocument();
    expect(screen.getByTitle('Descargar memorando-v1.pdf')).toBeInTheDocument();
  });

  it('sin sustituciones no ofrece historial', async () => {
    pintar(estado([documento({ cargado })]));

    expect(await screen.findByText('memorando.pdf', { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Historial/ })).toBeNull();
  });

  it('lo cargado para la modalidad anterior se ve aparte, sin contar ni retirarse', async () => {
    pintar(
      estado([documento({ estado: 'CARGADO', cargado })], {
        deOtraModalidad: [
          {
            id: 'e-9',
            documentoId: 'd-9',
            requisito: 'Certificado de idoneidad',
            nombre: 'certificado.pdf',
            descargaUrl: '/files/d-9.pdf',
            subidoPor: 'area@esap.edu.co',
            cargadoAt: '2026-09-20T10:00:00.000Z',
          },
        ],
      }),
    );

    expect(await screen.findByText('De la modalidad anterior')).toBeInTheDocument();
    expect(screen.getByText('Certificado de idoneidad')).toBeInTheDocument();
    expect(screen.getByText('certificado.pdf')).toBeInTheDocument();
    expect(screen.getByText('Obligatorios completos')).toBeInTheDocument();
    expect(screen.queryByTitle('Retirar del expediente')).toBeNull();
  });
});
