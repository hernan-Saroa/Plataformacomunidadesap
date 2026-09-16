import { describe, expect, it } from 'vitest';
import { getPtaComponentDisplayStatus, getPtaApprovalDisplayStatus, getPtaApprovalGroupStatus } from './ptaComponentStatus';

describe('estados visuales de componentes PTA', () => {
  it.each(['Aprobado', 'En Firme', 'Finalizado', 'Borrador', 'Pendiente Jefatura'])('prioriza No aplica en %s', estado => {
    const pta = { estado, horas_extension: 0, componentes_estado: [{ key: 'extension', estado: 'aprobado' }] };
    expect(getPtaComponentDisplayStatus(pta, 'extension')).toBe('no_aplica');
    expect(getPtaApprovalDisplayStatus(pta, { componente: 'ext_capacitacion', estado: 'aprobado', aprobadorNombre: 'Sistema' })).toBe('no_aplica');
  });

  it('reproduce las cuatro tarjetas del ejemplo sin aprobar Extensión', () => {
    const pta = { estado: 'Aprobado', horas_docencia: 384, horas_investigacion: 200, horas_extension: 0, horas_complementarias: 170 };
    expect(['academica', 'investigacion', 'extension', 'complementarias'].map(k => getPtaComponentDisplayStatus(pta, k)))
      .toEqual(['aprobado', 'aprobado', 'no_aplica', 'aprobado']);
  });

  it.each(['devuelto', 'en_revision', 'pendiente', 'aprobado', 'no_iniciado'])('respeta el estado real %s con contenido', estado => {
    expect(getPtaComponentDisplayStatus({ estado: 'Pendiente Jefatura', componentes_estado: [{ key: 'extension', horas: 24, estado }] }, 'extension')).toBe(estado);
  });

  it('no confunde un aprobador Sistema con ausencia de actividades', () => {
    expect(getPtaApprovalDisplayStatus({ estado: 'Aprobado', horas_complementarias: 170 }, {
      componente: 'complementarias_gestion_profesoral', estado: 'aprobado', aprobadorNombre: 'Sistema', horas: 170, aplica: true,
    })).toBe('aprobado');
  });

  it('excluye subcomponentes vacíos de una aprobación parcial', () => {
    const rows = [
      { componente: 'academica_pregrado', estado: 'pendiente', horas: 0 },
      { componente: 'academica_territorial', estado: 'aprobado', horas: 384 },
    ];
    expect(getPtaApprovalGroupStatus({ estado: 'Pendiente Jefatura' }, rows)).toBe('aprobado');
    expect(getPtaApprovalGroupStatus({}, [rows[0]])).toBe('no_aplica');
    expect(rows[0].estado).toBe('pendiente');
  });

  it('conserva la decisión humana al eliminar la última actividad mediante solicitud de edición', () => {
    expect(getPtaComponentDisplayStatus({ horas_extension: 0, componentes_estado: [
      { key: 'extension', horas: 0, estado: 'pendiente', requiere_reaprobacion: true },
    ] }, 'extension')).toBe('pendiente');
    expect(getPtaApprovalDisplayStatus({ horas_extension: 0 }, {
      componente: 'ext_capacitacion', estado: 'pendiente', scope: 'solicitud_edicion', horas: 0,
    })).toBe('pendiente');
  });

  it('datos desconocidos no equivalen a un componente vacío', () => {
    expect(getPtaComponentDisplayStatus({ horas_extension: null }, 'extension')).toBe('pendiente');
    expect(getPtaApprovalGroupStatus({}, [])).toBe('pendiente');
  });

  it('admite DTOs de detalle sin agregados y respuestas granulares', () => {
    expect(getPtaComponentDisplayStatus({ estado: 'Aprobado', extension_actividades: [] }, 'extension')).toBe('no_aplica');
    expect(getPtaComponentDisplayStatus({ estado: 'Aprobado' }, 'extension', [
      { componente: 'ext_capacitacion', estado: 'aprobado', aplica: false, horas: 0 },
    ])).toBe('no_aplica');
    expect(getPtaComponentDisplayStatus({ estado: 'Aprobado', complementarias: [], academico_admin: [{ horas: 170 }] }, 'complementarias')).toBe('aprobado');
  });
});
