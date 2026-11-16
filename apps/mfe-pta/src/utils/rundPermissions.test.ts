import { describe, expect, it } from 'vitest';
import { expandRundPermissions, isRundReadOnly, RUND_PROFILE_CAPABILITIES, RUND_PROFILE_PERMISSIONS } from '../../../shared/rund-permissions';
import { RUND_PROFILE_CAPABILITIES as backendCapabilities, isRundReadOnly as backendIsReadOnly } from '../../../../backend/academic-work-plan-service/src/pta/banco-docentes/rund-permission-policy';
import { retainLegacyRundPermissions, simplifyRundPermissionModules } from '../../../shared/rund-permission-catalog';

describe('Perfiles operativos y de consulta RUND', () => {
  it('conserva visibles y asignables los permisos específicos de fotos sin inferirlos del perfil', () => {
    const photos = ['banco-docentes.rund.photos.manage', 'banco-docentes.rund.photos.validate'];
    const permissions = [...Object.values(RUND_PROFILE_PERMISSIONS), ...photos].map(code => ({ id: code, code }));
    expect(simplifyRundPermissionModules([{ permissions }])[0].permissions).toHaveLength(6);
    for (const profile of Object.values(RUND_PROFILE_PERMISSIONS)) {
      for (const permission of photos) expect(expandRundPermissions([profile]).has(permission)).toBe(false);
    }
  });
  it('conserva la misma matriz de autorización en navegador y servidor', () => {
    expect(RUND_PROFILE_CAPABILITIES).toEqual(backendCapabilities);
    expect(Object.keys(RUND_PROFILE_PERMISSIONS)).toHaveLength(4);
  });
  it('carga permite registro e importación sin aprobación ni administración general', () => {
    const permissions = expandRundPermissions([RUND_PROFILE_PERMISSIONS.CARGADOR]);
    expect(permissions.has('banco-docentes.rund.create')).toBe(true);
    expect(permissions.has('banco-docentes.rund.import')).toBe(true);
    expect(permissions.has('banco-docentes.rund.validate')).toBe(false);
    expect(permissions.has('banco-docentes.rund.manage')).toBe(false);
  });
  it('revisión e incorporación no conceden edición general de perfiles', () => {
    for (const profile of [RUND_PROFILE_PERMISSIONS.REVISOR, RUND_PROFILE_PERMISSIONS.INCORPORADOR]) {
      const permissions = expandRundPermissions([profile]);
      expect(permissions.has('banco-docentes.rund.edit')).toBe(false);
      expect(permissions.has('banco-docentes.rund.documents.manage')).toBe(false);
    }
  });
  it('el editor muestra los cuatro permisos de perfil RUND y conserva otros módulos', () => {
    const permissions = [
      ...Object.values(RUND_PROFILE_PERMISSIONS).map(code => ({ id: code, code })),
      { id: 'legacy', code: 'banco-docentes.rund.documents.manage' }, { id: 'other', code: 'personas.view' },
    ];
    const result = simplifyRundPermissionModules([{ permissions }]);
    expect(result[0].permissions).toHaveLength(5);
    expect(result[0].permissions.some(permission => permission.id === 'legacy')).toBe(false);
    expect(result[0].permissions.some(permission => permission.id === 'other')).toBe(true);
  });
  it('editar permisos de otro módulo conserva accesos RUND anteriores; elegir un perfil los sustituye', () => {
    const initial = new Set<string>(), profiles = new Set(['carga', 'revision', 'incorporacion', 'consulta']), legacy = new Set(['antiguo']);
    expect(retainLegacyRundPermissions(new Set(['otro']), initial, profiles, legacy)).toEqual(['otro', 'antiguo']);
    expect(retainLegacyRundPermissions(new Set(['otro', 'revision']), initial, profiles, legacy)).toEqual(['otro', 'revision']);
  });
  it('mantiene el catálogo anterior durante un despliegue sin migración', () => {
    const modules = [{ permissions: [{ id: 'legacy', code: 'banco-docentes.rund.view' }] }];
    expect(simplifyRundPermissionModules(modules)).toBe(modules);
  });
});

describe('Perfil Consulta RUND (solo lectura)', () => {
  const consulta = RUND_PROFILE_PERMISSIONS.CONSULTA;
  it('se expande solo a ver ficha y abrir soportes en el visor', () => {
    expect([...expandRundPermissions([consulta])].sort())
      .toEqual([consulta, 'banco-docentes.rund.sensitive.view', 'banco-docentes.rund.view'].sort());
  });
  it('es solo lectura con el perfil expandido y deja de serlo con cualquier otro permiso RUND', () => {
    expect(isRundReadOnly([...expandRundPermissions([consulta])])).toBe(true);
    for (const otro of [RUND_PROFILE_PERMISSIONS.CARGADOR, RUND_PROFILE_PERMISSIONS.REVISOR, 'banco-docentes.rund.export', 'banco-docentes.rund.manage'])
      expect(isRundReadOnly([...expandRundPermissions([consulta, otro])])).toBe(false);
  });
  it('un rol antiguo con solo view, el superusuario y los valores vacíos no son solo lectura', () => {
    expect(isRundReadOnly(['banco-docentes.rund.view'])).toBe(false);
    expect(isRundReadOnly([...expandRundPermissions([consulta])], true)).toBe(false);
    expect(isRundReadOnly(undefined)).toBe(false);
    expect(isRundReadOnly([])).toBe(false);
  });
  it('navegador y servidor deciden igual', () => {
    for (const set of [[consulta], [consulta, 'banco-docentes.rund.edit'], ['banco-docentes.rund.view'], [consulta, 'pta.approve.all']]) {
      const expanded = [...expandRundPermissions(set)];
      expect(isRundReadOnly(expanded)).toBe(backendIsReadOnly(expanded));
    }
  });
});
