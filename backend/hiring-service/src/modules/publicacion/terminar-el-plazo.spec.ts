import { ConflictException } from '@nestjs/common';

import { PublicacionService } from './publicacion.service';
import { PERMISO_PLAZO_TERMINAR, permisosDelUsuario, tienePermiso } from '../../auth/permisos';

/**
 * La llave de pruebas para no esperar los días hábiles de un término.
 *
 * Los dos plazos que bloquean —el de publicidad del pliego, que la 5.3
 * necesita vencido para cerrarse sin observaciones, y el de subsanaciones de
 * la 6.5— duran días hábiles reales, así que recorrer un proceso completo en
 * una sesión de QA exigía esperarlos.
 *
 * Ya hubo un intento con una variable de entorno (EFDS-2064) que nunca llegó a
 * servir: exige además `NODE_ENV <> 'production'` y todos los servicios del
 * compose, incluido el de desarrollo, corren con `NODE_ENV: production`. Esto
 * lo resuelve con un permiso, que es lo que la plataforma ya sabe administrar.
 */
describe('contratacion.plazo.terminar · quién puede acortar un término', () => {
  const con = (...roles: string[]) => ({ roles });

  it('lo tiene el superadministrador', () => {
    expect(permisosDelUsuario(con('SUPER_ADMIN'))).toContain(PERMISO_PLAZO_TERMINAR);
  });

  it('y ningún rol funcional, ni siquiera los que llevan el proceso', () => {
    // A propósito: acortar un término legal no es una competencia del negocio.
    // Si algún día lo fuera, sería otro permiso y con otro nombre.
    for (const rol of [
      'GESTOR_CONTRATACION',
      'DIRECTOR_CONTRATACION',
      'ORDENADOR_GASTO',
      'ADMINISTRADOR_CONTRATACION',
      'REVISOR_CONTRATACION',
      'ESTRUCTURADOR_TECNICO',
    ]) {
      expect(permisosDelUsuario(con(rol))).not.toContain(PERMISO_PLAZO_TERMINAR);
    }
  });

  it('y quien no trae rol tampoco', () => {
    expect(tienePermiso(undefined, PERMISO_PLAZO_TERMINAR)).toBe(false);
  });
});

/**
 * Terminar el plazo mueve la fecha, no finge el vencimiento.
 *
 * De eso depende que lo que viene después —el cierre de la 5.3, el
 * `fueraDeTermino` de lo que llegue tarde, el conteo de días— se comporte
 * exactamente como en producción, que es justo lo que hay que poder probar.
 */
describe('PublicacionService · terminarPlazo', () => {
  const acceso = { userId: 'u-1', userName: 'super@esap.edu.co', roles: ['SUPER_ADMIN'] } as never;

  const servicio = (publicacion: any) => {
    const trazas: any[] = [];
    const em = { save: async (x: any) => x };

    const instancia = new PublicacionService({
      transaction: async (cb: (em: any) => Promise<any>) => cb(em),
    } as never, {} as never);

    (instancia as any).exigirPublicacion = async () => publicacion;
    (instancia as any).estadoPublicacion = async () => ({ publicacion });
    (instancia as any).traza = async (
      _em: any,
      _procesoId: string,
      _id: string,
      _accion: string,
      _acceso: any,
      detalle: any,
    ) => {
      trazas.push(detalle);
    };

    return { instancia, trazas };
  };

  /** Una fecha a `dias` de hoy, en el formato de los plazos del módulo. */
  const enDias = (dias: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  };

  it('deja el vencimiento en ayer', async () => {
    const publicacion: any = {
      id: 'p-1',
      fechaPublicacion: enDias(-5),
      fechaVencimiento: enDias(10),
      plazoDiasHabiles: 10,
    };
    const { instancia } = servicio(publicacion);

    await instancia.terminarPlazo('proc-1', acceso);

    expect(publicacion.fechaVencimiento).toBe(enDias(-1));
  });

  /**
   * Un término no puede terminar antes de empezar.
   *
   * La base lo sostiene con `publicacion_vencimiento_posterior`
   * (`fecha_vencimiento >= fecha_publicacion`), así que un pliego publicado hoy
   * no tiene ningún vencimiento anterior a hoy que sea válido: mover solo el
   * vencimiento reventaba el CHECK y la pantalla recibía un 500.
   */
  it('un pliego publicado hoy retrocede también su fecha de publicación', async () => {
    const publicacion: any = {
      id: 'p-1',
      fechaPublicacion: enDias(0),
      fechaVencimiento: enDias(10),
    };
    const { instancia } = servicio(publicacion);

    await instancia.terminarPlazo('proc-1', acceso);

    expect(publicacion.fechaVencimiento).toBe(enDias(-1));
    // Y queda el invariante que la base exige.
    expect(publicacion.fechaPublicacion <= publicacion.fechaVencimiento).toBe(true);
  });

  it('pero no la toca cuando el pliego ya se había publicado antes', async () => {
    // Se mueve lo mínimo: la fecha de publicación es un hecho registrado, y
    // reescribirla sin necesidad falsearía cuándo salió el pliego a SECOP II.
    const publicacion: any = {
      id: 'p-1',
      fechaPublicacion: enDias(-5),
      fechaVencimiento: enDias(10),
    };
    const { instancia } = servicio(publicacion);

    await instancia.terminarPlazo('proc-1', acceso);

    expect(publicacion.fechaPublicacion).toBe(enDias(-5));
  });

  it('la traza dice si hubo que mover la publicación', async () => {
    const publicacion: any = {
      id: 'p-1',
      fechaPublicacion: enDias(0),
      fechaVencimiento: enDias(10),
    };
    const { instancia, trazas } = servicio(publicacion);

    await instancia.terminarPlazo('proc-1', acceso);

    expect(trazas[0]).toMatchObject({
      publicacionOriginal: enDias(0),
      publicacionMovida: true,
    });
  });

  it('no toca el plazo aplicado: el expediente tiene que poder decir cuál era', async () => {
    const publicacion: any = {
      id: 'p-1',
      fechaPublicacion: enDias(-5),
      fechaVencimiento: enDias(10),
      plazoDiasHabiles: 10,
    };
    const { instancia } = servicio(publicacion);

    await instancia.terminarPlazo('proc-1', acceso);

    expect(publicacion.plazoDiasHabiles).toBe(10);
  });

  it('deja traza con el vencimiento original', async () => {
    // Un término acortado a mano no puede ser indistinguible de uno cumplido.
    const original = enDias(10);
    const publicacion: any = { id: 'p-1', fechaPublicacion: enDias(-5), fechaVencimiento: original };
    const { instancia, trazas } = servicio(publicacion);

    await instancia.terminarPlazo('proc-1', acceso);

    expect(trazas[0]).toMatchObject({
      accion: 'TERMINAR_PLAZO',
      pruebas: true,
      vencimientoOriginal: original,
      vencimientoNuevo: enDias(-1),
    });
  });

  it('no admite terminar uno que ya había vencido', async () => {
    const { instancia } = servicio({ id: 'p-1', fechaVencimiento: enDias(-3) });

    await expect(instancia.terminarPlazo('proc-1', acceso)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('ni uno que no existe: la modalidad puede no tener plazo parametrizado', async () => {
    const { instancia } = servicio({ id: 'p-1', fechaVencimiento: null });

    await expect(instancia.terminarPlazo('proc-1', acceso)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('el que vence hoy todavía se puede terminar', async () => {
    // `plazoVencido` es estricto (`fechaVencimiento < hoy`): el propio día del
    // vencimiento el término sigue corriendo, así que aún hay algo que acortar.
    const publicacion: any = { id: 'p-1', fechaPublicacion: enDias(-5), fechaVencimiento: enDias(0) };
    const { instancia } = servicio(publicacion);

    await instancia.terminarPlazo('proc-1', acceso);

    expect(publicacion.fechaVencimiento).toBe(enDias(-1));
  });
});
