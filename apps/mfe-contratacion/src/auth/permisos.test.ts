import { afterEach, describe, expect, it } from 'vitest';

import { PERMISOS, tienePermiso } from './permisos';

/**
 * Qué esconde la pantalla y qué no (EFDS-1183).
 *
 * Esconder lo que la API va a rechazar no es seguridad —el guard del servicio
 * ya niega lo que corresponda— sino no pintar puertas falsas: ofrecerle «Nuevo
 * proceso» a un ente de control lo lleva a un 403 que no puede interpretar.
 */
describe('tienePermiso', () => {
  const sesion = (datos: unknown) =>
    localStorage.setItem('user', JSON.stringify(datos));

  afterEach(() => {
    localStorage.clear();
    delete (window as any).__esap_auth_cache;
  });

  it('deja pasar el permiso que la sesión trae', () => {
    sesion({ roles: [], permissions: ['contratacion.config.manage'] });

    expect(tienePermiso(PERMISOS.configurar)).toBe(true);
  });

  it('niega el que no está', () => {
    // Quien solo consulta los informes no debe ver la configuración.
    sesion({ roles: [], permissions: ['contratacion.reporte.view'] });

    expect(tienePermiso(PERMISOS.configurar)).toBe(false);
  });

  it('lee los permisos que vienen como objeto', () => {
    // El shell los manda como {code}; otras versiones, como texto plano.
    sesion({ roles: [], permissions: [{ code: 'contratacion.config.manage' }] });

    expect(tienePermiso(PERMISOS.configurar)).toBe(true);
  });

  it('al superadministrador no le esconde nada', () => {
    sesion({ roles: [{ code: 'SUPER_ADMIN' }], permissions: [] });

    expect(tienePermiso(PERMISOS.configurar)).toBe(true);
  });

  it('sin sesión no esconde nada', () => {
    // Otro shell, o la sesión aún sin escribir: esconderlo todo dejaría la
    // pantalla vacía sin explicación. Lo que se niega, lo niega el servicio.
    expect(tienePermiso(PERMISOS.configurar)).toBe(true);
  });

  it('con la sesión rota tampoco esconde nada', () => {
    localStorage.setItem('user', 'esto no es json');

    expect(tienePermiso(PERMISOS.configurar)).toBe(true);
  });

  it('sin lista de permisos no esconde nada', () => {
    // Es más probable que la sesión venga incompleta a que el usuario no
    // tenga ninguno.
    sesion({ roles: [{ code: 'GESTOR_CONTRATACION' }] });

    expect(tienePermiso(PERMISOS.configurar)).toBe(true);
  });

  it('lee la sesion del cache en memoria del shell', () => {
    // Donde el shell la publica de verdad: la restaura del backend y la deja
    // en memoria. Buscarla solo en localStorage la daba siempre por ausente,
    // asi que no se escondia nada.
    (window as any).__esap_auth_cache = {
      roles: [],
      permissions: ['contratacion.reporte.view'],
    };

    expect(tienePermiso(PERMISOS.configurar)).toBe(false);
    expect(tienePermiso('contratacion.reporte.view')).toBe(true);
  });

  it('el cache en memoria manda sobre el almacenamiento', () => {
    // Si quedo una sesion vieja en disco, la del shell es la que vale.
    localStorage.setItem('user', JSON.stringify({ roles: [], permissions: ['contratacion.config.manage'] }));
    (window as any).__esap_auth_cache = { roles: [], permissions: ['contratacion.proceso.view-all'] };

    expect(tienePermiso(PERMISOS.configurar)).toBe(false);
  });
});
