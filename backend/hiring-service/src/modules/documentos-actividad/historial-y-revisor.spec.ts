import { ConflictException } from '@nestjs/common';

import { DocumentosActividadService } from './documentos-actividad.service';
import { Documento } from '../../entities/documento.entity';
import { DocumentoProceso } from '../../entities/documento-proceso.entity';
import { Expediente } from '../../entities/expediente.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Revision } from '../../entities/revision.entity';

const fecha = (dia: number) => new Date(`2026-10-0${dia}T10:00:00.000Z`);

const archivo = (id: string, nombre: string) =>
  ({
    id,
    nombre,
    archivoNombreOriginal: nombre,
    archivoUrl: `hiring/files/${id}.pdf`,
    archivoMimeType: 'application/pdf',
    subidoPor: 'gestor@esap.edu.co',
    tipo: 'ADJUNTO',
    numeral: '3.1',
    createdAt: fecha(1),
  }) as unknown as Documento;

/**
 * La lista de documentos de una actividad: las versiones sustituidas de cada
 * requisito y, aparte, lo que adjuntó quien la devolvió.
 */
function montar() {
  const archivos = [
    archivo('d-v2', 'estudio-v2.pdf'),
    archivo('d-v1', 'estudio-v1.pdf'),
    archivo('d-rev', 'correcciones.pdf'),
    archivo('d-anexo', 'cotizacion.pdf'),
  ];
  const entregas = [
    {
      id: 'e-2',
      codigo: 'EP',
      documentoId: 'd-v2',
      cargadoPor: 'gestor@esap.edu.co',
      createdAt: fecha(3),
      anuladoAt: null,
      anuladoPor: null,
    },
    {
      id: 'e-1',
      codigo: 'EP',
      documentoId: 'd-v1',
      cargadoPor: 'gestor@esap.edu.co',
      createdAt: fecha(1),
      anuladoAt: fecha(3),
      anuladoPor: 'gestor@esap.edu.co',
    },
  ];
  const revisiones = [
    {
      id: 'r-1',
      decision: 'DEVUELTO',
      revisadoPor: 'abogado@esap.edu.co',
      createdAt: fecha(2),
      soportesDocumentoIds: ['d-rev'],
    },
  ];

  const repos = new Map<any, any>([
    [Expediente, { findOne: async () => ({ id: 'x-1' }) }],
    [Documento, { find: async () => archivos }],
    [DocumentoProceso, { find: async () => entregas }],
    [ProcesoActividad, { findOne: async () => ({ id: 'pa-1' }) }],
    [Revision, { find: async () => revisiones }],
  ]);
  const em = { getRepository: (entidad: any) => repos.get(entidad) };
  const service = new DocumentosActividadService({ manager: em } as never, {} as never);
  Object.assign(service as any, {
    exigirProceso: async () => ({ id: 'p-1', modalidad: 'LICITACION' }),
    tipologiaDe: async () => null,
    plantillasVigentes: async () => new Map(),
    requeridosDe: async () => [
      { id: 'q-1', codigo: 'EP', nombre: 'Estudio previo', obligatorio: true, confirmado: true },
    ],
  });
  return service;
}

describe('lista de documentos · historial y observaciones del revisor', () => {
  it('cada requisito trae las versiones que se sustituyeron', async () => {
    const estado = await montar().estado('p-1', '3.1');

    const [ep] = estado.documentos;
    expect(ep.cargado?.nombre).toBe('estudio-v2.pdf');
    expect(ep.anteriores).toEqual([
      expect.objectContaining({
        nombre: 'estudio-v1.pdf',
        sustituidoPor: 'gestor@esap.edu.co',
        sustituidoAt: fecha(3).toISOString(),
        descargaUrl: '/files/d-v1.pdf',
      }),
    ]);
  });

  it('lo que adjuntó quien devolvió va aparte y no como anexo del gestor', async () => {
    const estado = await montar().estado('p-1', '3.1');

    expect(estado.soportesDelRevisor).toEqual([
      expect.objectContaining({ id: 'd-rev', revisadoPor: 'abogado@esap.edu.co' }),
    ]);
    expect(estado.adicionales.map((a) => a.id)).toEqual(['d-anexo']);
  });

  it('las observaciones del revisor no se retiran del expediente', async () => {
    const documento = archivo('d-rev', 'correcciones.pdf');
    const repos = new Map<any, any>([
      [Expediente, { findOne: async () => ({ id: 'x-1', estado: 'ABIERTO' }) }],
      [Documento, { findOne: async () => documento, remove: jest.fn() }],
      [DocumentoProceso, { findOne: async () => null }],
      [
        Revision,
        { createQueryBuilder: () => ({ where: () => ({ getCount: async () => 1 }) }) },
      ],
    ]);
    const em = { getRepository: (entidad: any) => repos.get(entidad) };
    const service = new DocumentosActividadService(
      { transaction: async (cb: any) => cb(em) } as never,
      {} as never,
    );

    await expect(
      service.retirar('p-1', 'd-rev', { userId: 'u', userName: 'g', roles: [] } as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repos.get(Documento).remove).not.toHaveBeenCalled();
  });
});
