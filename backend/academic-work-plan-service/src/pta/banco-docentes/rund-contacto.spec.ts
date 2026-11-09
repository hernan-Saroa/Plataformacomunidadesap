import { BadRequestException } from '@nestjs/common';
import { BancoDocentesService } from './banco-docentes.service';
import { isRundContactoCampo, normalizarContacto, RUND_CONTACTO_MENSAJES } from './rund-contacto';
import { buildRundPerfilCabezote } from './rund-perfil-cabezote';

const mensaje = (fn: () => unknown) => {
  try { fn(); } catch (e: any) { return e.getResponse?.().message ?? e.message; }
  return null;
};

describe('RUND-013 normalizarContacto', () => {
  it('acepta el campo solo si es uno de los tres de contacto', () => {
    expect(isRundContactoCampo('TELEFONO')).toBe(true);
    expect(isRundContactoCampo('PUNTAJE_SALARIAL')).toBe(false);
    expect(isRundContactoCampo(undefined)).toBe(false);
  });

  it('correo institucional: minúsculas, dominio @esap.edu.co y obligatorio', () => {
    expect(normalizarContacto('CORREO_INSTITUCIONAL', '  PedrPaez@ESAP.edu.co ')).toBe('pedrpaez@esap.edu.co');
    expect(mensaje(() => normalizarContacto('CORREO_INSTITUCIONAL', 'x@gmail.com'))).toBe(RUND_CONTACTO_MENSAJES.institucional);
    expect(mensaje(() => normalizarContacto('CORREO_INSTITUCIONAL', 'sin-arroba'))).toBe(RUND_CONTACTO_MENSAJES.institucional);
    expect(mensaje(() => normalizarContacto('CORREO_INSTITUCIONAL', '  '))).toBe(RUND_CONTACTO_MENSAJES.institucionalVacio);
  });

  it('correo personal: formato válido, vacío lo borra y no puede igualar al institucional', () => {
    expect(normalizarContacto('CORREO_ALTERNATIVO', 'Pedro@Gmail.com')).toBe('pedro@gmail.com');
    expect(normalizarContacto('CORREO_ALTERNATIVO', '')).toBeNull();
    expect(mensaje(() => normalizarContacto('CORREO_ALTERNATIVO', 'pedro@'))).toBe(RUND_CONTACTO_MENSAJES.personal);
    expect(mensaje(() => normalizarContacto('CORREO_ALTERNATIVO', 'A@esap.edu.co', 'a@ESAP.edu.co'))).toBe(RUND_CONTACTO_MENSAJES.personalIgual);
  });

  it('teléfono: admite varios números y rechaza letras o largos inválidos', () => {
    expect(normalizarContacto('TELEFONO', '3183918243 - 6452018')).toBe('3183918243 - 6452018');
    expect(normalizarContacto('TELEFONO', '3183918243, 6452018')).toBe('3183918243 - 6452018');
    expect(normalizarContacto('TELEFONO', '')).toBeNull();
    expect(mensaje(() => normalizarContacto('TELEFONO', 'abc'))).toBe(RUND_CONTACTO_MENSAJES.telefono);
    expect(mensaje(() => normalizarContacto('TELEFONO', '123'))).toBe(RUND_CONTACTO_MENSAJES.telefono);
  });
});

describe('RUND-013 cabezote expone el contacto', () => {
  it('toma correos y teléfono del perfil', () => {
    const c = buildRundPerfilCabezote({ correo_institucional: 'a@esap.edu.co', correo_personal: 'b@x.com', telefono: '3001234567' });
    expect([c.correo_institucional, c.correo_personal, c.telefono]).toEqual(['a@esap.edu.co', 'b@x.com', '3001234567']);
  });
  it('sin datos devuelve null', () => {
    const c = buildRundPerfilCabezote({});
    expect([c.correo_institucional, c.correo_personal, c.telefono]).toEqual([null, null, null]);
  });
});

describe('RUND-013 updateContactoDocente', () => {
  const armar = (docente: any, persona: any, userDup = false) => {
    const queries: Array<[string, any[]]> = [];
    const manager: any = {
      findOne: jest.fn().mockResolvedValue(docente),
      update: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(async (sql: string, params: any[]) => {
        queries.push([sql, params]);
        if (/FROM auth\.personas/.test(sql)) return [persona];
        if (/FROM auth\."user"/.test(sql)) return userDup ? [{ dup: 1 }] : [];
        return [];
      }),
    };
    const service: any = Object.create(BancoDocentesService.prototype);
    service.resolveDocenteId = jest.fn().mockResolvedValue('doc-1');
    service.dataSource = { transaction: (cb: any) => cb(manager) };
    service.writeAuditWithManager = jest.fn().mockResolvedValue(undefined);
    return { service: service as BancoDocentesService, manager, queries, audit: service.writeAuditWithManager as jest.Mock };
  };
  const docente = { id: 'doc-1', personaId: 'p-1', correoInstitucional: 'a@esap.edu.co', correoAlternativo: 'b@x.com' };
  const persona = { id_person: 'p-1', dir_email: 'a@esap.edu.co', tel_celular: '3000000000' };

  it('rechaza un campo que no es de contacto', async () => {
    const { service } = armar(docente, persona);
    await expect(service.updateContactoDocente('doc-1', { campo: 'PUNTAJE_SALARIAL', valor: '1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('teléfono: actualiza auth.personas y audita usuario, valor anterior y nuevo', async () => {
    const { service, queries, audit } = armar(docente, persona);
    const r = await service.updateContactoDocente('doc-1', { campo: 'TELEFONO', valor: '3183918243 - 6452018', actorId: 'u-9', ip: '1.1.1.1' });
    expect(r).toEqual({ campo: 'TELEFONO', valor: '3183918243 - 6452018', valor_anterior: '3000000000' });
    expect(queries.some(([sql, p]) => /UPDATE auth\.personas SET tel_celular/.test(sql) && p[1] === '3183918243 - 6452018')).toBe(true);
    expect(audit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      accion: 'EDITAR_CONTACTO', actorId: 'u-9', campoAfectado: 'TELEFONO', datoPrevio: '3000000000', datoNuevo: '3183918243 - 6452018',
    }));
  });

  it('correo personal: guarda en Docente y permite borrarlo', async () => {
    const { service, manager } = armar(docente, persona);
    const r = await service.updateContactoDocente('doc-1', { campo: 'CORREO_ALTERNATIVO', valor: '' });
    expect(r.valor).toBeNull();
    expect(manager.update).toHaveBeenCalledWith(expect.anything(), { id: 'doc-1' }, { correoAlternativo: null });
  });

  it('correo institucional: sincroniza persona y usuario de ingreso', async () => {
    const { service, manager, queries } = armar(docente, persona);
    await service.updateContactoDocente('doc-1', { campo: 'CORREO_INSTITUCIONAL', valor: 'nuevo@esap.edu.co' });
    expect(manager.update).toHaveBeenCalledWith(expect.anything(), { id: 'doc-1' }, { correoInstitucional: 'nuevo@esap.edu.co' });
    expect(queries.some(([sql]) => /UPDATE auth\.personas SET dir_email/.test(sql))).toBe(true);
    expect(queries.some(([sql]) => /UPDATE auth\."user" SET username/.test(sql))).toBe(true);
  });

  it('correo institucional duplicado en otra cuenta: no guarda ni audita', async () => {
    const { service, manager, audit } = armar(docente, persona, true);
    await expect(service.updateContactoDocente('doc-1', { campo: 'CORREO_INSTITUCIONAL', valor: 'otro@esap.edu.co' })).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.update).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it('valor inválido: no escribe nada', async () => {
    const { service, manager, audit } = armar(docente, persona);
    await expect(service.updateContactoDocente('doc-1', { campo: 'TELEFONO', valor: 'abc' })).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.update).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it('sin cambios: no escribe ni audita', async () => {
    const { service, audit } = armar(docente, persona);
    await service.updateContactoDocente('doc-1', { campo: 'TELEFONO', valor: '3000000000' });
    expect(audit).not.toHaveBeenCalled();
  });
});
