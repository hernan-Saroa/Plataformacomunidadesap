import { describe, expect, it } from 'vitest';
import { deriveFromGranular, type PerfilRolPTA } from '../PermisosPTAContext';
import { PTA_MANAGE_CONFIGURATION_PERMISSION } from './ptaComponentPermissions';
import { canAccessPTAView, canViewPTAReports, defaultPTAView } from './ptaNavigation';

const perfil: PerfilRolPTA = { rol: 'docente', nombre: '', email: '', territorial_ids: [], programa_ids: [] };
const access = (permissions: string[]) => {
  const vistas = deriveFromGranular(permissions, perfil)?.vistasPerm || [];
  return (vista: string) => vistas.includes(vista);
};

describe('Navegación PTA según permisos', () => {
  it('con solo Configuración entra en esa pestaña y no habilita Reportes', () => {
    const tieneVista = access([PTA_MANAGE_CONFIGURATION_PERMISSION]);
    expect(defaultPTAView(tieneVista)).toBe('configuracion');
    expect(canViewPTAReports(tieneVista)).toBe(false);
    expect(canAccessPTAView('tablero_unificado', tieneVista)).toBe(false);
    expect(tieneVista('gestion')).toBe(false);
  });

  it('con Configuración y Gestión conserva Gestión como vista inicial', () => {
    expect(defaultPTAView(access([PTA_MANAGE_CONFIGURATION_PERMISSION, 'pta.backoffice.ver_gestion']))).toBe('gestion');
  });

  it.each(['pta.backoffice.centro_reportes', 'pta.backoffice.tablero_control', 'pta.backoffice.reporte_nacional', 'pta.backoffice.metricas_sla'])('%s mantiene visible la entrada de Reportes', permiso => {
    expect(canViewPTAReports(access([permiso]))).toBe(true);
    expect(canAccessPTAView('tablero_unificado', access([permiso]))).toBe(true);
    expect(canAccessPTAView('configuracion', access([permiso]))).toBe(false);
  });
});
