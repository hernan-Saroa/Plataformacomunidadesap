import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';

const usuario = { userId: 'u1', username: 'admin', email: 'admin@esap.edu.co' };

function armar(opciones: { modulo?: any; evento?: any; creada?: any; correo?: any } = {}) {
  const modulos = { findOneBy: jest.fn().mockResolvedValue(opciones.modulo ?? null), save: jest.fn(async (m) => m) };
  const eventos = {
    findOneBy: jest.fn().mockResolvedValue(opciones.evento ?? null),
    save: jest.fn(async (e) => e),
    update: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
  };
  const historial = { insert: jest.fn().mockResolvedValue(undefined), find: jest.fn().mockResolvedValue([]) };
  const omitidas = { find: jest.fn().mockResolvedValue([]) };
  const dataSource = { query: jest.fn().mockResolvedValue([]) };
  const compuerta = { invalidar: jest.fn() };
  const notificaciones = { create: jest.fn().mockResolvedValue(opciones.creada ?? { id_notificacion: 'n1' }) };
  const correos = { enviarSiPermitido: jest.fn().mockResolvedValue(opciones.correo ?? { sent: true, message: 'Correo enviado' }) };
  const service = new ConfiguracionService(
    modulos as any, eventos as any, historial as any, omitidas as any, dataSource as any,
    compuerta as any, notificaciones as any, correos as any,
  );
  return { service, modulos, eventos, historial, compuerta, notificaciones, correos, dataSource };
}

const evento = (extra: any = {}) => ({
  clave: 'pta_aprobado', codigo_modulo: 'pta', nombre: 'PTA aprobado', descripcion: null, activo: true, canal: null,
  obligatorio: false, prioridad: null, prioridad_codigo: 'Alta', envia_correo: true,
  roles_adicionales: [], dependencias_adicionales: [], sedes_adicionales: [], verificado_en: null, ...extra,
});

describe('ConfiguracionService — la consola (EFDS-2406)', () => {
  it('al apagar un módulo guarda el valor anterior y el nuevo, y refresca la compuerta (RN5)', async () => {
    const { service, modulos, historial, compuerta } = armar({ modulo: { codigo: 'pta', nombre: 'PTA', activo: true, canal_defecto: 'ambos' } });
    const r = await service.actualizarModulo('pta', { activo: false }, usuario);
    expect(r.activo).toBe(false);
    expect(r.actualizado_por).toBe('admin');
    expect(modulos.save).toHaveBeenCalled();
    expect(historial.insert).toHaveBeenCalledWith(expect.objectContaining({
      entidad: 'modulo', codigo_modulo: 'pta', clave: 'pta', anterior: { activo: true }, nuevo: { activo: false }, usuario: 'admin',
    }));
    expect(compuerta.invalidar).toHaveBeenCalled();
  });

  it('un cambio que no cambia nada no deja historial', async () => {
    const { service, historial, modulos } = armar({ modulo: { codigo: 'pta', nombre: 'PTA', activo: true, canal_defecto: 'ambos' } });
    await service.actualizarModulo('pta', { activo: true, canal_defecto: 'ambos' }, usuario);
    expect(historial.insert).not.toHaveBeenCalled();
    expect(modulos.save).not.toHaveBeenCalled();
  });

  it('evento inexistente: 404', async () => {
    const { service } = armar();
    await expect(service.actualizarEvento('pta', 'nada', { activo: false }, usuario)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.enviarPrueba('pta', 'nada', usuario)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('un módulo de Gestión de módulos que aún no notifica se crea con el primer cambio y queda configurado de antemano', async () => {
    const { service, modulos, historial } = armar();
    const execute = jest.fn().mockResolvedValue(undefined);
    const valores: any[] = [];
    const qb: any = { insert: () => qb, values: (v: any) => { valores.push(v); return qb; }, orIgnore: () => qb, execute };
    (modulos as any).createQueryBuilder = jest.fn(() => qb);
    (modulos as any).findOneByOrFail = jest.fn(async () => ({ ...valores[0] }));
    const r = await service.actualizarModulo('auditoria', { activo: false, nombre: 'Auditoría' }, usuario);
    expect(valores[0]).toMatchObject({ codigo: 'auditoria', nombre: 'Auditoría', activo: true, canal_defecto: 'ambos' });
    expect(r.activo).toBe(false);
    expect(historial.insert).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'modulo', clave: 'auditoria', nuevo: { activo: false } }));
  });

  it('un código de módulo inválido no crea nada: 404', async () => {
    const { service, modulos } = armar();
    (modulos as any).createQueryBuilder = jest.fn();
    await expect(service.actualizarModulo('No Valido!', { activo: false }, usuario)).rejects.toBeInstanceOf(NotFoundException);
    expect((modulos as any).createQueryBuilder).not.toHaveBeenCalled();
  });

  it('"solo correo" no se puede elegir en un evento que no manda correo', async () => {
    const { service } = armar({ evento: evento({ envia_correo: false }) });
    await expect(service.actualizarEvento('pta', 'pta_aprobado', { canal: 'correo' }, usuario)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marcar obligatorio enciende el evento y no se puede apagar mientras lo sea (RN3)', async () => {
    const { service, historial } = armar({ evento: evento({ activo: false }) });
    const r = await service.actualizarEvento('pta', 'pta_aprobado', { obligatorio: true }, usuario);
    expect(r).toMatchObject({ obligatorio: true, activo: true });
    expect(historial.insert).toHaveBeenCalledWith(expect.objectContaining({
      entidad: 'evento', codigo_modulo: 'pta', clave: 'pta_aprobado', anterior: { activo: false, obligatorio: false }, nuevo: { activo: true, obligatorio: true },
    }));

    const { service: s2 } = armar({ evento: evento({ obligatorio: true }) });
    const r2 = await s2.actualizarEvento('pta', 'pta_aprobado', { activo: false }, usuario);
    expect(r2.activo).toBe(true);
  });

  it('los roles adicionales se guardan en mayúsculas y sin espacios', async () => {
    const { service } = armar({ evento: evento() });
    const r = await service.actualizarEvento('pta', 'pta_aprobado', { roles_adicionales: [' jefe_oci ', 'Auditor', ''] }, usuario);
    expect(r.roles_adicionales).toEqual(['JEFE_OCI', 'AUDITOR']);
  });

  it('la prueba sale por el camino normal, a quien está en la consola, y marca el evento como verificado', async () => {
    const { service, notificaciones, correos, eventos } = armar({ evento: evento() });
    const r = await service.enviarPrueba('pta', 'pta_aprobado', usuario);
    expect(notificaciones.create).toHaveBeenCalledWith(expect.objectContaining({
      id_usuario_destinatario: 'u1', tipo_notificacion: 'pta_aprobado', modulo: 'pta', prioridad: 'Alta',
      datos_adicionales: { prueba: true, consola: true },
    }));
    expect(correos.enviarSiPermitido).toHaveBeenCalledWith(expect.objectContaining({ to: 'admin@esap.edu.co', evento: 'pta_aprobado', modulo: 'pta' }));
    expect(r).toEqual({ plataforma: { estado: 'enviado' }, correo: { estado: 'enviado' }, verificado: true });
    expect(eventos.update).toHaveBeenCalledWith({ codigo_modulo: 'pta', clave: 'pta_aprobado' }, expect.objectContaining({ verificado_por: 'admin' }));
  });

  it('si la configuración omite la prueba, lo dice y no marca verificado', async () => {
    const { service, eventos } = armar({
      evento: evento({ activo: false, envia_correo: false }),
      creada: { omitida: true, motivo: 'evento_inactivo', modulo: 'pta', tipo_notificacion: 'pta_aprobado' },
    });
    const r = await service.enviarPrueba('pta', 'pta_aprobado', usuario);
    expect(r).toEqual({ plataforma: { estado: 'omitido', motivo: 'evento_inactivo' }, correo: { estado: 'sin_correo' }, verificado: false });
    expect(eventos.update).not.toHaveBeenCalled();
  });

  it('un correo que falla en la prueba no tumba la respuesta', async () => {
    const { service, correos } = armar({ evento: evento() });
    correos.enviarSiPermitido.mockRejectedValueOnce(new Error('SMTP no configurado'));
    const r = await service.enviarPrueba('pta', 'pta_aprobado', usuario);
    expect(r.correo).toEqual({ estado: 'error', motivo: 'SMTP no configurado' });
    expect(r.verificado).toBe(true);
  });

  it('permisosDe consulta los permisos del rol, no el código del rol', async () => {
    const { service, dataSource } = armar();
    dataSource.query.mockResolvedValueOnce([{ code: 'notificaciones.configuracion.gestionar' }]);
    expect((await service.permisosDe(['ADMIN'])).gestionar).toBe(true);
    expect((await service.permisosDe(['ADMIN'])).gestionar).toBe(false);
    expect((await service.permisosDe([])).gestionar).toBe(false);
  });

  it('el aviso se busca por módulo + clave: la misma clave en otro módulo es otro aviso', async () => {
    const { service, eventos } = armar({ evento: evento({ clave: 'PROCESO_ASIGNADO', codigo_modulo: 'gestion-legal' }) });
    await service.actualizarEvento('gestion-legal', 'PROCESO_ASIGNADO', { activo: false }, usuario);
    expect(eventos.findOneBy).toHaveBeenCalledWith({ codigo_modulo: 'gestion-legal', clave: 'PROCESO_ASIGNADO' });
  });

  describe('buzón de desvío', () => {
    const modulo = () => ({ codigo: 'pta', nombre: 'PTA', activo: true, canal_defecto: 'ambos', correo_desvio: null });
    afterEach(() => delete process.env.NOTIFICACIONES_DOMINIOS_DESVIO);

    it('guarda un correo del dominio permitido (en minúsculas) y lo deja en el historial', async () => {
      const { service, historial } = armar({ modulo: modulo() });
      const r = await service.actualizarModulo('pta', { correo_desvio: ' Buzon.PTA@ESAP.edu.co ' }, usuario);
      expect(r.correo_desvio).toBe('buzon.pta@esap.edu.co');
      expect(historial.insert).toHaveBeenCalledWith(expect.objectContaining({
        entidad: 'modulo', clave: 'pta', anterior: { correo_desvio: null }, nuevo: { correo_desvio: 'buzon.pta@esap.edu.co' },
      }));
    });

    it('rechaza con 400 un correo mal formado o de un dominio no permitido', async () => {
      const { service, modulos } = armar({ modulo: modulo() });
      await expect(service.actualizarModulo('pta', { correo_desvio: 'sin-arroba' }, usuario)).rejects.toThrow(/no es un correo válido/);
      await expect(service.actualizarModulo('pta', { correo_desvio: 'alguien@gmail.com' }, usuario)).rejects.toThrow(/@esap\.edu\.co/);
      await expect(service.actualizarModulo('pta', { correo_desvio: 'a@esap.edu.co.evil.com' }, usuario)).rejects.toBeInstanceOf(BadRequestException);
      expect(modulos.save).not.toHaveBeenCalled();
    });

    it('los dominios permitidos salen de NOTIFICACIONES_DOMINIOS_DESVIO', async () => {
      process.env.NOTIFICACIONES_DOMINIOS_DESVIO = 'esap.edu.co, otra.gov.co';
      const { service } = armar({ modulo: modulo() });
      expect((await service.actualizarModulo('pta', { correo_desvio: 'x@otra.gov.co' }, usuario)).correo_desvio).toBe('x@otra.gov.co');
      await expect(service.actualizarModulo('pta', { correo_desvio: 'x@gmail.com' }, usuario)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('null o vacío borran el buzón', async () => {
      const { service } = armar({ modulo: { ...modulo(), correo_desvio: 'a@esap.edu.co' } });
      expect((await service.actualizarModulo('pta', { correo_desvio: '' }, usuario)).correo_desvio).toBeNull();
      const { service: s2 } = armar({ modulo: { ...modulo(), correo_desvio: 'a@esap.edu.co' } });
      expect((await s2.actualizarModulo('pta', { correo_desvio: null }, usuario)).correo_desvio).toBeNull();
    });
  });
});
