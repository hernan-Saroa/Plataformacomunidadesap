import { DocumentosActividadService } from './documentos-actividad.service';
import { Documento } from '../../entities/documento.entity';
import { DocumentoProceso } from '../../entities/documento-proceso.entity';
import { DocumentoRequerido } from '../../entities/documento-requerido.entity';
import { Expediente } from '../../entities/expediente.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Revision } from '../../entities/revision.entity';

const fecha = new Date('2026-10-05T10:00:00.000Z');

const archivo = (id: string, nombre: string) =>
  ({
    id,
    nombre,
    archivoNombreOriginal: nombre,
    archivoUrl: `hiring/files/${id}.pdf`,
    archivoMimeType: 'application/pdf',
    tipo: 'ADJUNTO',
    numeral: '3.1',
    createdAt: fecha,
  }) as unknown as Documento;

const entrega = (id: string, codigo: string, documentoId: string) => ({
  id,
  codigo,
  documentoId,
  cargadoPor: 'area@esap.edu.co',
  createdAt: fecha,
  anuladoAt: null,
  anuladoPor: null,
});

/**
 * El área cargó el estudio previo y el certificado de idoneidad pensando en
 * contratación directa, y después cambió la modalidad en la 3.1. La lista de
 * la nueva ya no pide el certificado.
 */
function montar() {
  const repos = new Map<any, any>([
    [Expediente, { findOne: async () => ({ id: 'x-1' }) }],
    [
      Documento,
      {
        find: async () => [
          archivo('d-ep', 'estudio.pdf'),
          archivo('d-cert', 'certificado.pdf'),
        ],
      },
    ],
    [
      DocumentoProceso,
      { find: async () => [entrega('e-ep', 'EP', 'd-ep'), entrega('e-cert', 'CERT', 'd-cert')] },
    ],
    [
      DocumentoRequerido,
      { find: async () => [{ codigo: 'CERT', nombre: 'Certificado de idoneidad' }] },
    ],
    [ProcesoActividad, { findOne: async () => ({ id: 'pa-1' }) }],
    [Revision, { find: async () => [] }],
  ]);
  const em = { getRepository: (entidad: any) => repos.get(entidad) };
  const service = new DocumentosActividadService({ manager: em } as never, {} as never);
  Object.assign(service as any, {
    exigirProceso: async () => ({ id: 'p-1', modalidad: 'MINIMA_CUANTIA' }),
    tipologiaDe: async () => null,
    plantillasVigentes: async () => new Map(),
    requeridosDe: async () => [
      { id: 'q-1', codigo: 'EP', nombre: 'Estudio previo', obligatorio: true, confirmado: true },
    ],
  });
  return service;
}

describe('lista de documentos · lo cargado para otra modalidad', () => {
  it('no se pierde: aparece aparte, con el nombre del requisito que cubría', async () => {
    const estado = await montar().estado('p-1', '3.1');

    expect(estado.deOtraModalidad).toEqual([
      expect.objectContaining({
        id: 'e-cert',
        requisito: 'Certificado de idoneidad',
        nombre: 'certificado.pdf',
        descargaUrl: '/files/d-cert.pdf',
      }),
    ]);
  });

  it('no cuenta para la lista ni pasa a ser un anexo más', async () => {
    const estado = await montar().estado('p-1', '3.1');

    expect(estado.documentos.map((d) => d.codigo)).toEqual(['EP']);
    expect(estado.completo).toBe(true);
    expect(estado.adicionales).toEqual([]);
  });
});
