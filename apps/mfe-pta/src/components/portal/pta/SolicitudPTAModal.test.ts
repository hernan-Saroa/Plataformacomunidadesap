import { describe, expect, it, vi } from 'vitest';
// Estas pruebas de reglas no necesitan inicializar clientes HTTP ni IndexedDB.
vi.mock('../../../services/api/ptaApi', () => ({}));
import {
  admiteSolicitudEdicion,
  CASOS,
  normalizeEstado,
  obtenerEstadoMotivo,
} from './SolicitudPTAModal';

describe('SolicitudPTAModal - Reglas de Habilitación y Deshabilitación de Solicitudes', () => {
  describe('normalizeEstado', () => {
    it('normaliza mayúsculas, tildes y espacios', () => {
      expect(normalizeEstado('En Firme')).toBe('EN_FIRME');
      expect(normalizeEstado('Edición')).toBe('EDICION');
      expect(normalizeEstado('Pendiente Gestión Profesoral')).toBe('PENDIENTE_GESTION_PROFESORAL');
    });
  });

  describe('admiteSolicitudEdicion', () => {
    it('retorna false si el PTA no tiene ID o es nulo', () => {
      expect(admiteSolicitudEdicion(null)).toBe(false);
      expect(admiteSolicitudEdicion({})).toBe(false);
      expect(admiteSolicitudEdicion({ id: '' })).toBe(false);
    });

    it('respeta el flag explícito `admite_solicitud_edicion` enviado por el backend', () => {
      expect(admiteSolicitudEdicion({ id: 'pta-1', admite_solicitud_edicion: true })).toBe(true);
      expect(admiteSolicitudEdicion({ id: 'pta-1', admite_solicitud_edicion: false })).toBe(false);
    });

    it('habilita edición en estados aprobados totales', () => {
      const estadosValidos = ['Aprobado', 'APROBADO_DEF', 'En Firme', 'Radicado', 'En Ejecución', 'Finalizado', 'Terminado'];
      for (const estado of estadosValidos) {
        expect(admiteSolicitudEdicion({ id: 'pta-1', estado })).toBe(true);
      }
    });

    it('deshabilita edición en estados no aprobados o en proceso', () => {
      const estadosInvalidos = ['Borrador', 'Pendiente Jefatura', 'Pendiente Decanatura', 'Devuelto', 'REVISION_DOCENTE_N1'];
      for (const estado of estadosInvalidos) {
        expect(admiteSolicitudEdicion({ id: 'pta-1', estado })).toBe(false);
      }
    });
  });

  describe('obtenerEstadoMotivo cuando NO hay PTA creado (hasPtaCreado === false)', () => {
    it('deshabilita todos los motivos de solicitud con sus mensajes explicativos', () => {
      for (const c of CASOS) {
        const result = obtenerEstadoMotivo(c.key, false, 0);
        expect(result.disabled).toBe(true);
        expect(result.desc).toBeTruthy();
      }
    });

    it('muestra el mensaje correcto para edicion_pta sin PTA creado', () => {
      const result = obtenerEstadoMotivo('edicion_pta', false, 0);
      expect(result.disabled).toBe(true);
      expect(result.desc).toBe('Disponible únicamente cuando tengas un PTA registrado y aprobado en su totalidad.');
    });

    it('muestra el mensaje correcto para caso_1 (otra territorial) sin PTA creado', () => {
      const result = obtenerEstadoMotivo('caso_1', false, 0);
      expect(result.disabled).toBe(true);
      expect(result.desc).toBe('Disponible únicamente tras haber creado tu primer PTA.');
    });

    it('muestra el mensaje correcto para caso_2 (rehacer PTA) sin PTA creado', () => {
      const result = obtenerEstadoMotivo('caso_2', false, 0);
      expect(result.disabled).toBe(true);
      expect(result.desc).toBe('Disponible únicamente si ya cuentas con un PTA registrado.');
    });

    it('muestra el mensaje correcto para caso_3 (otro caso) sin PTA creado', () => {
      const result = obtenerEstadoMotivo('caso_3', false, 0);
      expect(result.disabled).toBe(true);
      expect(result.desc).toBe('Disponible únicamente tras haber creado tu PTA.');
    });
  });

  describe('obtenerEstadoMotivo cuando SI hay PTA creado pero NO está aprobado (ptasEditablesCount === 0)', () => {
    it('deshabilita edicion_pta indicando que debe estar aprobado', () => {
      const result = obtenerEstadoMotivo('edicion_pta', true, 0);
      expect(result.disabled).toBe(true);
      expect(result.desc).toContain('Disponible solo cuando tu PTA esté aprobado en su totalidad');
    });

    it('habilita caso_1, caso_2 y caso_3 con sus descripciones operativas', () => {
      const r1 = obtenerEstadoMotivo('caso_1', true, 0);
      expect(r1.disabled).toBe(false);
      expect(r1.desc).toBe('Tengo asignación en una segunda territorial y necesito un PTA separado.');

      const r2 = obtenerEstadoMotivo('caso_2', true, 0);
      expect(r2.disabled).toBe(false);
      expect(r2.desc).toBe('Mi PTA actual tiene errores graves y necesito empezar de cero.');

      const r3 = obtenerEstadoMotivo('caso_3', true, 0);
      expect(r3.disabled).toBe(false);
      expect(r3.desc).toBe('Tengo un motivo diferente que requiere aprobación del administrador.');
    });
  });

  describe('obtenerEstadoMotivo cuando hay PTA creado y APROBADO (ptasEditablesCount > 0)', () => {
    it('habilita edicion_pta y todos los demás motivos', () => {
      const rEdicion = obtenerEstadoMotivo('edicion_pta', true, 1);
      expect(rEdicion.disabled).toBe(false);
      expect(rEdicion.desc).toBe('Habilita uno o varios componentes sin crear un nuevo PTA.');

      const r1 = obtenerEstadoMotivo('caso_1', true, 1);
      expect(r1.disabled).toBe(false);

      const r2 = obtenerEstadoMotivo('caso_2', true, 1);
      expect(r2.disabled).toBe(false);

      const r3 = obtenerEstadoMotivo('caso_3', true, 1);
      expect(r3.disabled).toBe(false);
    });
  });
});
