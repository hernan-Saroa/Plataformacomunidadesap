import { ConflictException } from '@nestjs/common';

import { DocumentosActividadService } from './documentos-actividad.service';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Revision } from '../../entities/revision.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';

const abogado = { userId: 'u-abogado', userName: 'luis@esap.edu.co', roles: [], puedeEditar: false };
const otro = { userId: 'u-otro', userName: 'ana@esap.edu.co', roles: [], puedeEditar: false };
const archivo = {
  originalname: 'estudio-con-correcciones.pdf',
  filename: 'abc123.pdf',
  mimetype: 'application/pdf',
  size: 1024,
} as any;

/**
 * Los soportes de una devolución (migraciones 091 y 093).
 *
 * Solo quien devolvió lo adjunta, sobre su última devolución y mientras el
 * área no haya reenviado: el archivo explica esa vuelta y nada más.
 */
function montar(opciones: {
  estado?: string;
  ultima?: Partial<Revision> | null;
}) {
  const guardados: any[] = [];
  const revision =
    opciones.ultima === null
      ? null
      : ({
          id: 'r-1',
          decision: 'DEVUELTO',
          revisadoPor: abogado.userName,
          revisadoPorId: abogado.userId,
          soportesDocumentoIds: [],
          ...opciones.ultima,
        } as Revision);

  const repos = new Map<any, any>([
    [Proceso, { findOne: async () => ({ id: 'p-1' }) }],
    [ProcesoActividad, { findOne: async () => ({ id: 'pa-1', estado: opciones.estado ?? 'BORRADOR' }) }],
    [Revision, { findOne: async () => revision }],
    [Expediente, { findOne: async () => ({ id: 'e-1', estado: 'ABIERTO' }) }],
  ]);

  const m = {
    getRepository: (entidad: any) => repos.get(entidad),
    create: (_entidad: any, datos: any) => ({ ...datos }),
    save: async (a: any, b?: any) => {
      const fila = b ?? a;
      if (a === Documento || fila?.archivoUrl) fila.id = fila.id ?? 'd-1';
      guardados.push({ entidad: b ? a : null, fila });
      return fila;
    },
  };
  const dataSource = { transaction: async (cb: any) => cb(m) };
  const service = new DocumentosActividadService(dataSource as never, {} as never);
  return { service, guardados, revision };
}

describe('soporte de la devolución', () => {
  it('quien devolvió lo adjunta y la decisión queda señalándolo', async () => {
    const { service, revision } = montar({});

    const resultado = await service.cargarSoporteDeDevolucion('p-1', '3.1', archivo, 'hash', abogado);

    expect(resultado.nombre).toMatch(/^Soporte de la devolución/);
    expect(resultado.descargaUrl).toBe('/files/abc123.pdf');
    expect(revision!.soportesDocumentoIds).toEqual([resultado.id]);
  });

  it('otra persona no puede adjuntarlo, aunque pueda aprobar', async () => {
    const { service } = montar({});

    await expect(
      service.cargarSoporteDeDevolucion('p-1', '3.1', archivo, 'hash', otro),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('no se adjunta a una aprobación', async () => {
    const { service } = montar({ ultima: { decision: 'APROBADO' } as any });

    await expect(
      service.cargarSoporteDeDevolucion('p-1', '4.1', archivo, 'hash', abogado),
    ).rejects.toThrow(/quien devolvió/);
  });

  it('llega tarde si el área ya reenvió', async () => {
    const { service } = montar({ estado: 'EN_REVISION' });

    await expect(
      service.cargarSoporteDeDevolucion('p-1', '3.1', archivo, 'hash', abogado),
    ).rejects.toThrow(/llegaría tarde/);
  });

  it('una devolución puede llevar varios soportes, en el orden en que llegan', async () => {
    const { service, revision } = montar({
      ultima: { soportesDocumentoIds: ['d-anterior'] } as any,
    });

    const resultado = await service.cargarSoporteDeDevolucion('p-1', '3.1', archivo, 'hash', abogado);

    expect(revision!.soportesDocumentoIds).toEqual(['d-anterior', resultado.id]);
  });

  it('deja traza de que es el soporte de una devolución', async () => {
    const { service, guardados } = montar({});

    await service.cargarSoporteDeDevolucion('p-1', '3.1', archivo, 'hash', abogado);

    const traza = guardados.find((g) => g.fila?.accion === 'ADJUNTAR');
    expect(traza?.fila.detalle).toMatchObject({ soporteDeDevolucion: true, revision: 'r-1' });
    // Trazabilidad se importa para dejar claro de qué entidad es la fila.
    expect(Trazabilidad).toBeDefined();
  });
});
