import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BancoDocentesService } from './banco-docentes.service';
import { quitarTitulo, renombrarTitulo } from './rund-titulo-soporte';
import { dataReviewContext } from './rund-data-review';

describe('renombrarTitulo (editar el nombre de un título)', () => {
  it('cambia el título precargado conservando los adicionales', () => {
    const c = renombrarTitulo('Economía', ['Contador'], 'economia', '  Ingeniería Industrial ');
    expect(c).toMatchObject({ destino: 'principal', principal: 'Ingeniería Industrial', adicionales: ['Contador'], anterior: 'Economía', nuevo: 'Ingeniería Industrial' });
  });

  it('cambia un adicional en su misma posición', () => {
    const c = renombrarTitulo('A', ['B', 'C', 'D'], 'c', 'Nuevo C');
    expect(c.destino).toBe('adicional');
    expect(c.adicionales).toEqual(['B', 'Nuevo C', 'D']);
    expect(c.principal).toBe('A');
  });

  it('permite corregir solo mayúsculas o tildes del mismo título', () => {
    expect(renombrarTitulo('administracion publica', [], 'administracion publica', 'Administración Pública').principal).toBe('Administración Pública');
  });

  it('rechaza vacío, demasiado largo, repetido con otro título y título inexistente', () => {
    expect(() => renombrarTitulo('A', ['B'], 'A', '   ')).toThrow(BadRequestException);
    expect(() => renombrarTitulo('A', ['B'], 'A', 'x'.repeat(301))).toThrow(BadRequestException);
    expect(() => renombrarTitulo('A', ['B'], 'A', 'b')).toThrow(/Ya existe un título/);
    expect(() => renombrarTitulo('A', ['B'], 'Z', 'Nuevo')).toThrow(/ya no existe/);
    expect(() => renombrarTitulo('A', ['B'], '', 'Nuevo')).toThrow(BadRequestException);
  });
});

describe('quitarTitulo (eliminar un título de la lista)', () => {
  it('quita un adicional y deja el resto en orden', () => {
    const c = quitarTitulo('A', ['B', 'C', 'D'], 'C');
    expect(c).toMatchObject({ destino: 'adicional', principal: 'A', adicionales: ['B', 'D'], anterior: 'C', nuevo: null });
  });

  it('al quitar el precargado, el primer adicional ocupa su lugar para no alterar el orden de la lista', () => {
    const c = quitarTitulo('A', ['B', 'C'], 'A');
    expect(c).toMatchObject({ destino: 'principal', principal: 'B', adicionales: ['C'] });
  });

  it('quitar el único título deja el nivel vacío', () => {
    expect(quitarTitulo('A', [], 'a')).toMatchObject({ principal: null, adicionales: [] });
  });

  it('un título inexistente se rechaza', () => {
    expect(() => quitarTitulo('A', ['B'], 'Z')).toThrow(/ya no existe/);
  });
});

describe('editarTituloFormacion / eliminarTituloFormacion', () => {
  const armar = (docente: any) => {
    const manager: any = { findOne: jest.fn().mockResolvedValue(docente), update: jest.fn().mockResolvedValue(undefined) };
    const service: any = Object.create(BancoDocentesService.prototype);
    service.resolveDocenteId = jest.fn().mockResolvedValue('doc-1');
    service.dataSource = { transaction: (cb: any) => cb(manager) };
    service.writeAuditWithManager = jest.fn().mockResolvedValue(undefined);
    return { service: service as BancoDocentesService, manager, audit: service.writeAuditWithManager as jest.Mock };
  };
  const actor = { actorId: 'actor-1', ip: '10.0.0.1' };

  it('editar el precargado actualiza la columna y audita anterior y nuevo', async () => {
    const { service, manager, audit } = armar({ id: 'doc-1', pregrado: 'Economía', titulosAdicionales: null });
    const r = await service.editarTituloFormacion('doc-1', { tipoSoporte: 'diploma_pregrado', titulo: 'Economía', nuevoTitulo: 'Ingeniería Industrial', ...actor });
    expect(r).toEqual({ nivel: 'pregrado', titulo: 'Ingeniería Industrial', anterior: 'Economía' });
    expect(manager.update).toHaveBeenCalledWith(expect.anything(), { id: 'doc-1' }, { pregrado: 'Ingeniería Industrial', titulosAdicionales: null });
    expect(audit).toHaveBeenCalledWith(manager, expect.objectContaining({
      accion: 'EDITAR_TITULO_FORMACION', bloque: 'FORMACION', campoAfectado: 'PREGRADO', datoPrevio: 'Economía', datoNuevo: 'Ingeniería Industrial',
      metadata: expect.objectContaining({ cambios: { PREGRADO: { anterior: 'Economía', nuevo: 'Ingeniería Industrial' } } }),
    }));
  });

  it('editar un adicional conserva los adicionales de los demás niveles', async () => {
    const { service, manager, audit } = armar({ id: 'doc-1', maestria: 'M1', titulosAdicionales: { maestria: ['M2', 'M3'], doctorado: ['D1'] } });
    await service.editarTituloFormacion('doc-1', { tipoSoporte: 'diploma_maestria', titulo: 'M2', nuevoTitulo: 'M2 corregida', ...actor });
    expect(manager.update).toHaveBeenCalledWith(expect.anything(), { id: 'doc-1' }, { maestria: 'M1', titulosAdicionales: { maestria: ['M2 corregida', 'M3'], doctorado: ['D1'] } });
    expect(audit).toHaveBeenCalledWith(manager, expect.objectContaining({ campoAfectado: 'TITULOS_ADICIONALES_MAESTRIA', datoPrevio: 'M2; M3', datoNuevo: 'M2 corregida; M3' }));
  });

  it('eliminar el precargado asciende al primer adicional y audita ambos campos', async () => {
    const { service, manager, audit } = armar({ id: 'doc-1', pregrado: 'A', titulosAdicionales: { pregrado: ['B', 'C'] } });
    await service.eliminarTituloFormacion('doc-1', { tipoSoporte: 'diploma_pregrado', titulo: 'A', ...actor });
    expect(manager.update).toHaveBeenCalledWith(expect.anything(), { id: 'doc-1' }, { pregrado: 'B', titulosAdicionales: { pregrado: ['C'] } });
    expect(audit).toHaveBeenCalledWith(manager, expect.objectContaining({
      accion: 'ELIMINAR_TITULO_FORMACION',
      metadata: expect.objectContaining({ cambios: { PREGRADO: { anterior: 'A', nuevo: 'B' }, TITULOS_ADICIONALES_PREGRADO: { anterior: 'B; C', nuevo: 'C' } } }),
    }));
  });

  it('eliminar el único título deja el nivel y los adicionales vacíos (null)', async () => {
    const { service, manager } = armar({ id: 'doc-1', doctorado: 'Doctor en Derecho', titulosAdicionales: { doctorado: [] } });
    await service.eliminarTituloFormacion('doc-1', { tipoSoporte: 'diploma_doctorado', titulo: 'Doctor en Derecho', ...actor });
    expect(manager.update).toHaveBeenCalledWith(expect.anything(), { id: 'doc-1' }, { doctorado: null, titulosAdicionales: null });
  });

  it('un título que no existe, un soporte que no es título y un docente inexistente se rechazan sin escribir', async () => {
    const { service, manager, audit } = armar({ id: 'doc-1', pregrado: 'A', titulosAdicionales: null });
    await expect(service.editarTituloFormacion('doc-1', { tipoSoporte: 'diploma_pregrado', titulo: 'Z', nuevoTitulo: 'Y', ...actor })).rejects.toThrow(BadRequestException);
    await expect(service.eliminarTituloFormacion('doc-1', { tipoSoporte: 'diploma_bachiller', titulo: 'A', ...actor })).rejects.toThrow(BadRequestException);
    expect(manager.update).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
    const { service: sin } = armar(null);
    await expect(sin.eliminarTituloFormacion('doc-1', { tipoSoporte: 'diploma_pregrado', titulo: 'A', ...actor })).rejects.toThrow(NotFoundException);
  });
});

describe('validación de datos de formación reacciona a los títulos adicionales', () => {
  const huella = (profile: any) => dataReviewContext('FORMACION', profile, [], []).diploma_pregrado.huella;

  it('agregar, renombrar o quitar un título adicional cambia la huella y reabre la decisión', () => {
    const base = huella({ pregrado: 'A', titulosAdicionales: null });
    const conB = huella({ pregrado: 'A', titulosAdicionales: { pregrado: ['B'] } });
    expect(conB).not.toBe(base);
    expect(huella({ pregrado: 'A', titulosAdicionales: { pregrado: ['B corregido'] } })).not.toBe(conB);
    expect(huella({ pregrado: 'A', titulosAdicionales: { pregrado: [] } })).toBe(base);
  });

  it('sin títulos adicionales la huella no cambia: no invalida decisiones anteriores', () => {
    expect(huella({ pregrado: 'A', titulosAdicionales: null })).toBe(huella({ pregrado: 'A' }));
    expect(huella({ pregrado: 'A', titulosAdicionales: { maestria: ['M'] } })).toBe(huella({ pregrado: 'A' }));
  });

  it('una decisión aprobada con la huella vigente se mantiene, y deja de valer si cambia la lista de títulos', () => {
    const perfil = { pregrado: 'A', titulosAdicionales: { pregrado: ['B'] } };
    const h = huella(perfil);
    const aprobada = [{ bloque: 'FORMACION', metadata: { campo: 'diploma_pregrado', huella: h, estado: 'Aprobado' }, actor_id: 'x', createdAt: new Date() }];
    expect(dataReviewContext('FORMACION', perfil, [], aprobada).diploma_pregrado.estado).toBe('Aprobado');
    const editado = { pregrado: 'A', titulosAdicionales: { pregrado: ['B', 'C'] } };
    expect(dataReviewContext('FORMACION', editado, [], aprobada).diploma_pregrado.estado).toBe('Pendiente');
  });
});
