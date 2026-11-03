import {
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { cdpPermiteRadicar, CdpService, NUMERAL_CARGUE_CDP } from './cdp.service';
import { Cdp } from '../../entities/cdp.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';

/**
 * El CDP cargado desde el estudio previo (migraciones 100 y 103).
 *
 * Lo que se fija aquí es lo que no se puede confundir: cargar el CDP no envía
 * ni aprueba el estudio previo, queda expedido sin pasar por la Financiera, y
 * al cerrarse la etapa 3 se sigue con el que hay. Desde la 103 el aplicativo
 * no solicita el CDP: sin cargue, la 4.2 espera a que el área lo cargue.
 */
describe('cdpPermiteRadicar', () => {
  it('opcional: se radica sin CDP', () => {
    expect(cdpPermiteRadicar({ aplica: true, obligatorio: false, cargado: false }).permite).toBe(true);
  });

  it('obligatorio y sin CDP cargado: no se radica, y se dice por qué', () => {
    const r = cdpPermiteRadicar({ aplica: true, obligatorio: true, cargado: false });
    expect(r.permite).toBe(false);
    expect(r.motivo).toMatch(/carga el CDP/);
  });

  it('obligatorio con el CDP cargado: se radica', () => {
    expect(cdpPermiteRadicar({ aplica: true, obligatorio: true, cargado: true }).permite).toBe(true);
  });

  it('una modalidad sin CDP nunca frena el envío', () => {
    expect(cdpPermiteRadicar({ aplica: false, obligatorio: true, cargado: false }).permite).toBe(true);
  });
});

describe('CdpService · gestión desde el estudio previo', () => {
  const acceso = { userId: 'u-1', userName: 'area@esap.edu.co' } as any;
  const archivo = { filename: 'abc.pdf', originalname: 'cdp.pdf', mimetype: 'application/pdf', size: 10 };
  const registro = { numero: 'CDP-7', valor: 2_000_000, rubro: 'A-02', fechaExpedicion: '2026-10-01' };

  const montar = (
    opciones: { cdp?: Partial<Cdp> | null; obligatorio?: boolean; etapa?: number; cargue?: string } = {},
  ) => {
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
    const cargue = { numeral: NUMERAL_CARGUE_CDP, estado: opciones.cargue ?? 'BORRADOR' };

    const em: any = {
      getRepository: (entidad: unknown) => ({
        findOne: async () => (entidad === Proceso ? proceso : entidad === ProcesoActividad ? cargue : null),
        find: async () => [],
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

    return { service, em, proceso, cdp, cierre, guardados, trazas };
  };

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
      // La 4.2 se da por atendida al cerrarse la etapa 3, no antes:
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

    it('no pisa una solicitud de antes de la 103: primero se retira', async () => {
      const { service, em } = montar({ cdp: { estado: 'VERIFICADO', origen: 'SOLICITADO_EN_ETAPA_3' } });
      await expect(
        service.registrarDesdeElEstudioPrevio(em, 'p-1', registro, archivo, 'hash', acceso),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('retirar', () => {
    it('anula el CDP que cargó el área', async () => {
      const { service, em, cdp, trazas } = montar({
        cdp: { estado: 'EXPEDIDO', origen: 'REGISTRADO_EN_ETAPA_3' },
      });

      await service.retirarDesdeElEstudioPrevio(em, 'p-1', 'Número equivocado', acceso);

      expect(cdp!.estado).toBe('ANULADO');
      expect(trazas[0]).toMatchObject({ accion: 'ANULAR', detalle: { motivo: 'Número equivocado' } });
    });

    it('anula una solicitud de antes de la 103, que ya nadie va a atender', async () => {
      const { service, em, cdp } = montar({ cdp: { estado: 'VERIFICADO', origen: 'SOLICITADO_EN_ETAPA_3' } });

      await service.retirarDesdeElEstudioPrevio(em, 'p-1', undefined, acceso);

      expect(cdp!.estado).toBe('ANULADO');
    });

    it('lo cargado en la 4.2 no se retira desde el estudio previo', async () => {
      const { service, em, cdp } = montar({ cdp: { estado: 'EXPEDIDO', origen: 'ETAPA_4' } });
      await expect(service.retirarDesdeElEstudioPrevio(em, 'p-1', undefined, acceso)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(cdp!.estado).toBe('EXPEDIDO');
    });
  });

  describe('al enviar el estudio previo', () => {
    it('obligatorio y sin CDP: el backend frena el envío aunque la pantalla no lo haga', async () => {
      const { service, em, proceso } = montar({ obligatorio: true });
      await expect(service.exigirGestionAntesDeRadicar(em, proceso)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });

    it('obligatorio con una solicitud sin expedir: no basta', async () => {
      const { service, em, proceso } = montar({
        obligatorio: true,
        cdp: { estado: 'SOLICITADO', origen: 'SOLICITADO_EN_ETAPA_3' },
      });
      await expect(service.exigirGestionAntesDeRadicar(em, proceso)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });

    it('obligatorio con el CDP cargado: pasa', async () => {
      const { service, em, proceso } = montar({
        obligatorio: true,
        cdp: { estado: 'EXPEDIDO', origen: 'REGISTRADO_EN_ETAPA_3' },
      });
      await expect(service.exigirGestionAntesDeRadicar(em, proceso)).resolves.toBeUndefined();
    });
  });

  describe('al cerrarse la etapa 3', () => {
    it('con el CDP cargado por el área: pasa a la etapa 4 y da por atendida la 4.2', async () => {
      const { service, em, proceso, cierre, guardados } = montar({
        cdp: { estado: 'EXPEDIDO', origen: 'REGISTRADO_EN_ETAPA_3' },
      });

      await service.abrirEtapa4SiCerroLaEtapa3(em, 'p-1', acceso);

      expect(guardados.some((g) => g?.estado === 'SOLICITADO')).toBe(false);
      expect(proceso.etapa).toBe(4);
      expect(cierre.resolverCierre.mock.calls.map((c) => c[2])).toEqual([NUMERAL_CARGUE_CDP]);
      expect(cierre.resolverCierre.mock.calls[0][4].userName).toBe('Sistema');
    });

    it('sin CDP cargado: pasa a la etapa 4 sin pedir nada, y la 4.2 espera al área', async () => {
      const { service, em, proceso, cierre, guardados } = montar();

      await service.abrirEtapa4SiCerroLaEtapa3(em, 'p-1', acceso);

      expect(proceso.etapa).toBe(4);
      expect(guardados.some((g) => g?.estado === 'SOLICITADO')).toBe(false);
      expect(cierre.resolverCierre).not.toHaveBeenCalled();
    });

    it('con una solicitud de antes de la 103: la 4.2 sigue abierta para cargarla', async () => {
      const { service, em, cierre } = montar({ cdp: { estado: 'SOLICITADO', origen: 'SOLICITADO_EN_ETAPA_3' } });

      await service.abrirEtapa4SiCerroLaEtapa3(em, 'p-1', acceso);

      expect(cierre.resolverCierre).not.toHaveBeenCalled();
    });

    it('si la 4.2 ya estaba cerrada, no la vuelve a cerrar', async () => {
      const { service, em, cierre } = montar({
        cdp: { estado: 'EXPEDIDO', origen: 'REGISTRADO_EN_ETAPA_3' },
        cargue: 'APROBADO',
      });

      await service.abrirEtapa4SiCerroLaEtapa3(em, 'p-1', acceso);

      expect(cierre.resolverCierre).not.toHaveBeenCalled();
    });
  });
});
