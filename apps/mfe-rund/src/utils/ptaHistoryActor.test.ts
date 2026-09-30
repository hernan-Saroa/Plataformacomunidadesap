import { describe, expect, it } from 'vitest';
import { getPtaHistoryActorName, getPtaHistoryActorLabel } from './ptaHistoryActor';

describe('autor legible del historial PTA', () => {
  const docenteId = '413f1db0-c89e-4d20-9935-eb89beed6355';
  const pta = { docente_id: 'docente-interno', docente_nombre: 'Ana María Torres' };

  it('resuelve las entradas antiguas del docente por su identidad del portal', () => {
    expect(getPtaHistoryActorName({ actorId: docenteId, actorRol: 'Docente' }, pta, 'Ana María Torres', docenteId))
      .toBe('Ana María Torres');
    expect(getPtaHistoryActorName({ actorId: pta.docente_id }, pta)).toBe('Ana María Torres');
  });
  it('prefiere el nombre real del revisor recibido del servidor', () => {
    expect(getPtaHistoryActorName({ actorId: docenteId, actorNombre: 'Carlos Pérez', actorRol: 'Revisor' }, pta))
      .toBe('Carlos Pérez');
  });
  it('nunca muestra UUID, correo o ID numérico como nombre ni atribuye un actor desconocido al docente', () => {
    for (const actor of [docenteId, '900014', 'actor@example.test']) {
      expect(getPtaHistoryActorName({ actorId: actor, actorNombre: actor, actorRol: 'Docente' }, pta))
        .toBe('Nombre no disponible');
    }
  });
  it('conserva nombres legacy y distingue las acciones del sistema', () => {
    expect(getPtaHistoryActorName({ actor: 'Carlos Pérez' }, pta)).toBe('Carlos Pérez');
    expect(getPtaHistoryActorName({ actorId: 'sistema' }, pta)).toBe('Sistema');
    expect(getPtaHistoryActorName({ actorRol: 'Docente' }, pta)).toBe('Ana María Torres');
  });
  it('muestra el rol disponible cuando no se puede recuperar el nombre del administrador', () => {
    expect(getPtaHistoryActorLabel({ actorId: 'desconocido', actorRol: 'SUPER_ADMIN' }, pta))
      .toBe('Administrador del sistema');
    expect(getPtaHistoryActorLabel({ actor_id: docenteId, actor_rol: 'Revisor Docencia Pregrado' }, pta))
      .toBe('Revisor Docencia Pregrado');
    expect(getPtaHistoryActorLabel({ actorId: docenteId, actorRol: 'Docente' }, pta)).toBe('Docente');
  });
  it('conserva nombre y rol cuando existen y evita repetir el mismo texto', () => {
    expect(getPtaHistoryActorLabel({ actorNombre: 'Super User', actorRol: 'SUPER_ADMIN' }, pta))
      .toBe('Super User — Administrador del sistema');
    expect(getPtaHistoryActorLabel({ actorId: 'sistema', actorRol: 'Sistema' }, pta)).toBe('Sistema');
  });
  it('no inventa un rol ni expone identificadores cuando el registro está incompleto', () => {
    expect(getPtaHistoryActorLabel({ tipoAccion: 'reenviar_corregido' }, pta)).toBe('Autor no registrado');
    expect(getPtaHistoryActorLabel({ actorId: docenteId, actorRol: docenteId }, pta)).toBe('Autor no registrado');
  });
});
