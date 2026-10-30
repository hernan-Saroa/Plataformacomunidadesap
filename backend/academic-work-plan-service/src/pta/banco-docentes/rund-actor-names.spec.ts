import { resolveRundActorNames, rundActorName } from './rund-actor-names';
import { RundDocumentosService } from './rund-documentos.service';
import { BancoDocentesService } from './banco-docentes.service';

const author = '770e8400-e29b-41d4-a716-446655440001';
const reviewer = '770e8400-e29b-41d4-a716-446655440002';

describe('Nombres de actores documentales RUND', () => {
  it('resuelve autores y revisores en una consulta sin cambiar sus identificadores', async () => {
    const db = { query: jest.fn().mockResolvedValue([
      { actor_id: author, nombre: 'Gestor Documental' }, { actor_id: reviewer, nombre: 'Revisora Académica' },
      { actor_id: 'AUTOGESTION:invitacion', nombre: 'Docente de Prueba' },
    ]) };
    const actors = [author, reviewer, author, 'SISTEMA', 'AUTOGESTION:invitacion'];
    const original = [...actors];
    const names = await resolveRundActorNames(db as any, actors);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1]).toEqual([[author, reviewer, 'AUTOGESTION:invitacion']]);
    expect(rundActorName(names, author)).toBe('Gestor Documental');
    expect(rundActorName(names, reviewer)).toBe('Revisora Académica');
    expect(rundActorName(names, 'AUTOGESTION:invitacion')).toBe('Docente de Prueba');
    expect(rundActorName(names, 'SISTEMA')).toBe('Sistema');
    expect(actors).toEqual(original);
  });

  it('no consulta identidades para acciones automáticas ni respuestas vacías', async () => {
    const db = { query: jest.fn() };
    expect((await resolveRundActorNames(db as any, [])).size).toBe(0);
    const names = await resolveRundActorNames(db as any, ['SYSTEM', 'SISTEMA', null]);
    expect(rundActorName(names, 'SYSTEM')).toBe('Sistema');
    expect(db.query).not.toHaveBeenCalled();
  });

  it('no presenta UUID, correos ni referencias de invitación como si fueran nombres', async () => {
    const db = { query: jest.fn().mockResolvedValue([{ actor_id: author, nombre: author }]) };
    const names = await resolveRundActorNames(db as any, [author, 'antiguo@example.test', 'AUTOGESTION:invitacion', 'Ana Pérez']);
    expect(rundActorName(names, author)).toBe('Usuario no disponible');
    expect(rundActorName(names, 'antiguo@example.test')).toBe('Usuario no disponible');
    expect(rundActorName(names, 'AUTOGESTION:invitacion')).toBe('Docente (autogestión)');
    expect(rundActorName(names, 'Ana Pérez')).toBe('Ana Pérez');
    expect(rundActorName(names, null)).toBe('Usuario no disponible');
  });

  it('mantiene consultable el historial si el directorio no responde', async () => {
    const names = await resolveRundActorNames({ query: jest.fn().mockRejectedValue(new Error('offline')) } as any, [author]);
    expect(rundActorName(names, author)).toBe('Usuario no disponible');
  });

  it('incluye nombres del cargador, revisor y eliminador en los documentos y conserva las referencias', async () => {
    const db = { query: jest.fn().mockResolvedValueOnce([{ id: 'docente' }]).mockResolvedValueOnce([
      { id: 'archivo', docente_id: 'docente', creado_por: author, revisado_por: reviewer, eliminado_por: author },
    ]).mockResolvedValueOnce([{ actor_id: author, nombre: 'Gestor Documental' }, { actor_id: reviewer, nombre: 'Revisora Académica' }]) };
    const [document] = await new RundDocumentosService(db as any, {} as any).list('docente', undefined, true);
    expect(document).toMatchObject({ creadoPor: author, creadoPorNombre: 'Gestor Documental',
      revisadoPor: reviewer, revisadoPorNombre: 'Revisora Académica', eliminadoPor: author, eliminadoPorNombre: 'Gestor Documental' });
  });

  it('resuelve nombres en bloques, soportes y decisiones por fila sin afectar la separación de actores', async () => {
    const service = Object.create(BancoDocentesService.prototype) as any;
    service.resolveDocenteId = jest.fn().mockResolvedValue('docente');
    const blocks = ['IDENTIDAD', 'CONTACTO', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'].map(bloque => ({ bloque, cargado_por: author, revisado_por: reviewer }));
    service.dataSource = { query: jest.fn().mockResolvedValueOnce(blocks).mockResolvedValueOnce([
      { bloque: 'IDENTIDAD', cargado_por: author, revisiones_campos: { NOMBRE_COMPLETO: { revisadoPor: reviewer } } },
    ]).mockResolvedValueOnce([{ actor_id: author, nombre: 'Gestor Documental' }, { actor_id: reviewer, nombre: 'Revisora Académica' }]) };
    const result = await service.getBloques('docente');
    expect(result[0]).toMatchObject({ cargado_por: author, cargadoPorNombre: 'Gestor Documental',
      revisado_por: reviewer, revisadoPorNombre: 'Revisora Académica' });
    expect(result[0].soportes[0]).toMatchObject({ cargado_por: author, cargadoPorNombre: 'Gestor Documental',
      revisiones_campos: { NOMBRE_COMPLETO: { revisadoPor: reviewer, revisadoPorNombre: 'Revisora Académica' } } });
    expect(service.dataSource.query).toHaveBeenCalledTimes(3);
  });

  it('agrega el nombre a la trazabilidad sin reescribir registros históricos', async () => {
    const service = Object.create(BancoDocentesService.prototype) as any;
    service.resolveDocenteId = jest.fn().mockResolvedValue('docente');
    const log = { id: 'log', actorId: author, accion: 'CARGAR_DOCUMENTO' };
    service.auditLogRepo = { find: jest.fn().mockResolvedValue([log]) };
    service.dataSource = { query: jest.fn().mockResolvedValue([{ actor_id: author, nombre: 'Gestor Documental' }]) };
    expect(await service.getAuditoria('docente')).toEqual([{ ...log, actorNombre: 'Gestor Documental' }]);
    expect(log).not.toHaveProperty('actorNombre');
  });
});
