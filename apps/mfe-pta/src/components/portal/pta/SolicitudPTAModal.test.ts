import { describe, expect, it, vi } from 'vitest';
// Estas pruebas de reglas no necesitan inicializar clientes HTTP ni IndexedDB.
vi.mock('../../../services/api/ptaApi', () => ({}));
import {
  admiteSolicitudEdicion,
  CASOS,
  CASOS_SELECCIONABLES,
  haySolicitudDisponible,
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

  describe('CASOS_SELECCIONABLES (motivos visibles para el docente)', () => {
    it('solo ofrece la solicitud de edición', () => {
      expect(CASOS_SELECCIONABLES.map(c => c.key)).toEqual(['edicion_pta']);
    });

    it('conserva caso_1, caso_2 y caso_3 en el catálogo CASOS para el backoffice', () => {
      // El backoffice los sigue etiquetando y resolviendo para las solicitudes
      // históricas; quitarlos del catálogo dejaría esos registros sin etiqueta.
      const keys = CASOS.map(c => c.key);
      expect(keys).toContain('caso_1');
      expect(keys).toContain('caso_2');
      expect(keys).toContain('caso_3');
    });
  });

  describe('haySolicitudDisponible (gate del formulario)', () => {
    it('bloquea el formulario cuando no hay PTA creado', () => {
      expect(haySolicitudDisponible(false, 0)).toBe(false);
    });

    it('bloquea el formulario con PTA creado pero sin aprobar: el único motivo está deshabilitado', () => {
      // Este era el hueco: la opción se veía en gris y aun así la
      // justificación y el adjunto quedaban activos.
      expect(obtenerEstadoMotivo('edicion_pta', true, 0).disabled).toBe(true);
      expect(haySolicitudDisponible(true, 0)).toBe(false);
    });

    it('habilita el formulario cuando hay un PTA aprobado en su totalidad', () => {
      expect(obtenerEstadoMotivo('edicion_pta', true, 1).disabled).toBe(false);
      expect(haySolicitudDisponible(true, 1)).toBe(true);
    });

    it('queda alineado con el estado del motivo en todos los escenarios', () => {
      const escenarios: Array<[boolean, number]> = [[false, 0], [false, 1], [true, 0], [true, 1], [true, 3]];
      for (const [hasPta, editables] of escenarios) {
        const algunoHabilitado = CASOS_SELECCIONABLES.some(
          c => !obtenerEstadoMotivo(c.key, hasPta, editables).disabled,
        );
        expect(haySolicitudDisponible(hasPta, editables)).toBe(algunoHabilitado);
      }
    });
  });
});
