import { afterEach, describe, expect, it } from 'vitest';

import { PERMISOS, tieneAlguno, tienePermiso } from './permisos';

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

  afterEach(() => localStorage.clear());

  it('deja pasar el permiso que la sesión trae', () => {
    sesion({ roles: [], permissions: ['contratacion.proceso.create'] });

    expect(tienePermiso(PERMISOS.procesoCrear)).toBe(true);
  });

  it('niega el que no está', () => {
    // El ente de control llega con uno solo: no debe ver «Nuevo proceso».
    sesion({ roles: [], permissions: ['contratacion.expediente.auditar'] });

    expect(tienePermiso(PERMISOS.procesoCrear)).toBe(false);
  });

  it('lee los permisos que vienen como objeto', () => {
    // El shell los manda como {code}; otras versiones, como texto plano.
    sesion({ roles: [], permissions: [{ code: 'contratacion.proceso.create' }] });

    expect(tienePermiso(PERMISOS.procesoCrear)).toBe(true);
  });

  it('al superadministrador no le esconde nada', () => {
    sesion({ roles: [{ code: 'SUPER_ADMIN' }], permissions: [] });

    expect(tienePermiso(PERMISOS.configurar)).toBe(true);
  });

  it('sin sesión no esconde nada', () => {
    // Otro shell, o la sesión aún sin escribir: esconderlo todo dejaría la
    // pantalla vacía sin explicación. Lo que se niega, lo niega el servicio.
    expect(tienePermiso(PERMISOS.procesoCrear)).toBe(true);
  });

  it('con la sesión rota tampoco esconde nada', () => {
    localStorage.setItem('user', 'esto no es json');

    expect(tienePermiso(PERMISOS.procesoCrear)).toBe(true);
  });

  it('sin lista de permisos no esconde nada', () => {
    // Es más probable que la sesión venga incompleta a que el usuario no
    // tenga ninguno.
    sesion({ roles: [{ code: 'GESTOR_CONTRATACION' }] });

    expect(tienePermiso(PERMISOS.procesoCrear)).toBe(true);
  });

  it('basta uno de varios', () => {
    sesion({ roles: [], permissions: ['contratacion.actividad.approve'] });

    expect(tieneAlguno(PERMISOS.procesoCrear, PERMISOS.actividadAprobar)).toBe(true);
    expect(tieneAlguno(PERMISOS.procesoCrear, PERMISOS.configurar)).toBe(false);
  });
});
