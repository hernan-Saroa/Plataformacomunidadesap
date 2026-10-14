import {
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { cdpPermiteRadicar, CdpService, NUMERAL_EXPEDICION_CDP } from './cdp.service';
import { Cdp } from '../../entities/cdp.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';

/**
 * El CDP gestionado desde el estudio previo (migración 100).
 *
 * Lo que se fija aquí es lo que no se puede confundir: pedir el CDP no envía
 * ni aprueba el estudio previo, registrar uno existente lo deja expedido sin
 * pasar por la Financiera, y al cerrarse la etapa 3 se sigue con el que hay en
 * vez de crear otro.
 */
describe('cdpPermiteRadicar', () => {
  it('opcional: se radica sin CDP', () => {
    expect(cdpPermiteRadicar({ aplica: true, obligatorio: false, enCurso: false }).permite).toBe(true);
  });

  it('obligatorio y sin CDP en curso: no se radica, y se dice por qué', () => {
    const r = cdpPermiteRadicar({ aplica: true, obligatorio: true, enCurso: false });
    expect(r.permite).toBe(false);
    expect(r.motivo).toMatch(/gestiona el CDP/);
  });

  it('obligatorio con el CDP solicitado basta: el área no espera a la Financiera', () => {
    expect(cdpPermiteRadicar({ aplica: true, obligatorio: true, enCurso: true }).permite).toBe(true);
  });

  it('una modalidad sin CDP nunca frena el envío', () => {
    expect(cdpPermiteRadicar({ aplica: false, obligatorio: true, enCurso: false }).permite).toBe(true);
  });
});

describe('CdpService · gestión desde el estudio previo', () => {
  const acceso = { userId: 'u-1', userName: 'area@esap.edu.co' } as any;
  const archivo = { filename: 'abc.pdf', originalname: 'cdp.pdf', mimetype: 'application/pdf', size: 10 };
  const registro = { numero: 'CDP-7', valor: 2_000_000, rubro: 'A-02', fechaExpedicion: '2026-10-01' };

  const montar = (opciones: { cdp?: Partial<Cdp> | null; obligatorio?: boolean; etapa?: number } = {}) => {
    const proceso = {
      id: 'p-1',
      modalidad: 'MINIMA_CUANTIA',
      valorEstimado: 2_000_000,
      etapa: opciones.etapa ?? 3,
      estado: 'EN_CURSO',
    } as unknown as Proceso;
    const cdp = opciones.cdp ? ({ id: 'cdp-1', procesoId: 'p-1', ...opciones.cdp } as Cdp) : null;
    const guardados: any[] = [];
    const trazas: { accion: string; detalle: any }[] = [];
    const actividades: Record<string, string> = { '4.1': 'BORRADOR', [NUMERAL_EXPEDICION_CDP]: 'BORRADOR' };
    const actualizaciones: any[] = [];

    const em: any = {
      getRepository: (entidad: unknown) => ({
        findOne: async () => (entidad === Proceso ? proceso : null),
        find: async () =>
          entidad === ProcesoActividad
            ? Object.entries(actividades).map(([numeral, estado]) => ({ numeral, estado }))
            : [],
      }),
      findOne: async () => ({ id: 'exp-1' }),
      create: (_: unknown, datos: any) => ({ ...datos }),
      save: async (a: any, b?: any) => {
        const guardado = b ?? a;
        if (guardado?.accion) trazas.push({ accion: guardado.accion, detalle: guardado.detalle });
        else guardados.push(guardado);
        if (guardado?.archivoUrl) return { ...guardado, id: 'doc-1' };
        return guardado.id ? guardado : { ...guardado, id: 'nuevo' };
      },
      update: async (...args: any[]) => actualizaciones.push(args),
    };
    const cierre = {
      exigeFirma: jest.fn().mockResolvedValue(false),
      exigirFirmaValida: jest.fn(),
      resolverCierre: jest.fn().mockResolvedValue({ estado: 'APROBADO', cierra: true }),
    };
    const dataSource: any = { transaction: (fn: any) => fn(em), manager: em };
    const service = new CdpService(dataSource, cierre as any, {} as any);

    jest.spyOn(service, 'aplicaCdp').mockResolvedValue(true);
    jest.spyOn(service, 'delProceso').mockResolvedValue(cdp);
    jest.spyOn(service, 'exigeCdpAntesDeRadicar').mockResolvedValue(opciones.obligatorio ?? false);
    jest.spyOn(service, 'instanciarEtapa4').mockResolvedValue([]);
    jest.spyOn(service as any, 'etapa3Cerrada').mockResolvedValue(true);

    return { service, em, proceso, cdp, cierre, guardados, trazas, actualizaciones };
  };

  describe('solicitar', () => {
    it('crea la solicitud de la etapa 4 sin mover el proceso ni tocar el estudio previo', async () => {
      const { service, em, proceso, cierre, guardados, trazas } = montar();

      const r = await service.solicitarDesdeElEstudioPrevio(em, 'p-1', {}, acceso);

      expect(r).toMatchObject({
        estado: 'SOLICITADO',
        origen: 'SOLICITADO_EN_ETAPA_3',
        valor: 2_000_000,
        solicitadoPor: 'area@esap.edu.co',
      });
      // Pedir el CDP no es enviar el estudio previo: la etapa sigue en la 3.
      expect(proceso.etapa).toBe(3);
      expect(guardados.some((g) => g?.numeral === '3.1')).toBe(false);
      // La 4.1 es «radicar la solicitud»: queda hecha, y la Financiera recibe su turno.
      expect(cierre.resolverCierre.mock.calls.map((c) => c[2])).toEqual(['4.1']);
      expect(trazas[0]).toMatchObject({ accion: 'SOLICITAR', detalle: { desdeElEstudioPrevio: true } });
    });

    it('no duplica: con un CDP en curso, choca', async () => {
      const { service, em } = montar({ cdp: { estado: 'SOLICITADO', origen: 'ETAPA_4' } });
      await expect(service.solicitarDesdeElEstudioPrevio(em, 'p-1', {}, acceso)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('registrar uno existente', () => {
    it('queda expedido de una vez, con su soporte y sin cerrar nada todavía', async () => {
      const { service, em, cierre } = montar();

      const r = await service.registrarDesdeElEstudioPrevio(em, 'p-1', registro, archivo, 'hash', acceso);

      expect(r).toMatchObject({
        estado: 'EXPEDIDO',
        origen: 'REGISTRADO_EN_ETAPA_3',
        numero: 'CDP-7',
        rubro: 'A-02',
        documentoId: 'doc-1',
        vigenciaFiscal: 2026,
      });
      // La 4.1 y la 4.2 se dan por atendidas al cerrarse la etapa 3, no antes:
      // mientras el área tenga el estudio previo, el registro se corrige.
      expect(cierre.resolverCierre).not.toHaveBeenCalled();
    });

    it('sin soporte no se registra', async () => {
      const { service, em } = montar();
      await expect(
        service.registrarDesdeElEstudioPrevio(em, 'p-1', registro, null, null, acceso),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('si ya lo registró el área, lo corrige sin crear otro y sin exigir de nuevo el soporte', async () => {
      const { service, em, cdp, trazas } = montar({
        cdp: { estado: 'EXPEDIDO', origen: 'REGISTRADO_EN_ETAPA_3', numero: 'CDP-6', documentoId: 'doc-0' },
      });

      const r = await service.registrarDesdeElEstudioPrevio(em, 'p-1', registro, null, null, acceso);

      expect(r.id).toBe('cdp-1');
      expect(cdp).toMatchObject({ numero: 'CDP-7', documentoId: 'doc-0' });
      expect(trazas[0].accion).toBe('GUARDAR');
    });

    it('no pisa una solicitud que ya está en la Financiera', async () => {
      const { service, em } = montar({ cdp: { estado: 'VERIFICADO', origen: 'SOLICITADO_EN_ETAPA_3' } });
      await expect(
        service.registrarDesdeElEstudioPrevio(em, 'p-1', registro, archivo, 'hash', acceso),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('retirar', () => {
    it('anula la solicitud que nadie ha tramitado y deja la 4.1 pendiente otra vez', async () => {
      const { service, em, cdp, actualizaciones } = montar({
        cdp: { estado: 'SOLICITADO', origen: 'SOLICITADO_EN_ETAPA_3' },
      });

      await service.retirarDesdeElEstudioPrevio(em, 'p-1', 'Ya teníamos el CDP', acceso);

      expect(cdp!.estado).toBe('ANULADO');
      expect(actualizaciones[0][1]).toEqual({ procesoId: 'p-1', numeral: '4.1' });
      expect(actualizaciones[0][2]).toMatchObject({ estado: 'BORRADOR' });
    });

    it('lo que la Financiera ya verificó no se retira desde el estudio previo', async () => {
      const { service, em, cdp } = montar({ cdp: { estado: 'VERIFICADO', origen: 'SOLICITADO_EN_ETAPA_3' } });
      await expect(service.retirarDesdeElEstudioPrevio(em, 'p-1', undefined, acceso)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(cdp!.estado).toBe('VERIFICADO');
    });
  });

  describe('al enviar el estudio previo', () => {
    it('obligatorio y sin CDP: el backend frena el envío aunque la pantalla no lo haga', async () => {
      const { service, em, proceso } = montar({ obligatorio: true });
      await expect(service.exigirGestionAntesDeRadicar(em, proceso)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });

    it('obligatorio con el CDP solicitado: pasa', async () => {
      const { service, em, proceso } = montar({
        obligatorio: true,
        cdp: { estado: 'SOLICITADO', origen: 'SOLICITADO_EN_ETAPA_3' },
      });
      await expect(service.exigirGestionAntesDeRadicar(em, proceso)).resolves.toBeUndefined();
    });
  });

  describe('al cerrarse la etapa 3', () => {
    it('con un CDP registrado por el área: pasa a la etapa 4 y da por atendidas la 4.1 y la 4.2', async () => {
      const { service, em, proceso, cierre, guardados } = montar({
        cdp: { estado: 'EXPEDIDO', origen: 'REGISTRADO_EN_ETAPA_3' },
      });

      const creado = await service.crearSolicitudSiCerroLaEtapa3(em, 'p-1', acceso);

      expect(creado).toBeNull();
      expect(guardados.some((g) => g?.estado === 'SOLICITADO')).toBe(false);
      expect(proceso.etapa).toBe(4);
      expect(cierre.resolverCierre.mock.calls.map((c) => c[2])).toEqual(['4.1', NUMERAL_EXPEDICION_CDP]);
      expect(cierre.resolverCierre.mock.calls[0][4].userName).toBe('Sistema');
    });

    it('con una solicitud anticipada en trámite: pasa a la etapa 4 y la 4.2 sigue para la Financiera', async () => {
      const { service, em, proceso, cierre } = montar({
        cdp: { estado: 'SOLICITADO', origen: 'SOLICITADO_EN_ETAPA_3' },
      });

      await service.crearSolicitudSiCerroLaEtapa3(em, 'p-1', acceso);

      expect(proceso.etapa).toBe(4);
      // La 4.1 figura abierta en este montaje: se cierra; la 4.2 no se toca.
      expect(cierre.resolverCierre.mock.calls.map((c) => c[2])).toEqual(['4.1']);
    });

    it('sin nada gestionado: nace la solicitud de siempre', async () => {
      const { service, em, proceso, guardados } = montar();

      await service.crearSolicitudSiCerroLaEtapa3(em, 'p-1', acceso);

      expect(guardados.find((g) => g?.estado === 'SOLICITADO')).toMatchObject({ solicitadoPor: 'Sistema' });
      expect(proceso.etapa).toBe(4);
    });
  });
});
