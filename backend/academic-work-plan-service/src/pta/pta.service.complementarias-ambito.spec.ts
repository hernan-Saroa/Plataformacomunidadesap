import { PtaService } from './pta.service';
import {
  hasComponentPermission,
  hasReviewPermission,
  COMPLEMENTARIAS_COMPONENT_KEYS,
  isTerritorialComponent,
} from './auth/pta-permissions.constants';

/**
 * EFDS-1353 — Complementarias deja de compartir los permisos de Docencia y gana
 * los ámbitos Territorial (Decanatura) y Gestión Profesoral.
 */
describe('PtaService - ámbitos de Complementarias (EFDS-1353)', () => {
  // El catálogo define el ámbito por TIPO de actividad, no por instancia.
  const conCatalogo = (actividades: any[]) => {
    const service = Object.create(PtaService.prototype) as any;
    service.getCatalogoActividadesComplementarias = jest.fn().mockResolvedValue(actividades);
    service.getCatalogoActividadesAcademicoAdmin = jest.fn().mockResolvedValue([]);
    return service;
  };

  const clasificar = (service: any, complementarias: any[]) =>
    service.clasificarComplementarias({ complementarias });

  it('enruta cada actividad al componente de su ámbito', async () => {
    const service = conCatalogo([
      { id: 'A_PRE', nivel_programa: 'pregrado' },
      { id: 'A_POS', nivel_programa: 'posgrado' },
      { id: 'A_TER', tipo_aprobacion: 'decanatura' },
      { id: 'A_GP', tipo_aprobacion: 'gestion_profesoral' },
    ]);

    const part = await clasificar(service, [
      { actividad_id: 'A_PRE', horas: 10 },
      { actividad_id: 'A_POS', horas: 20 },
      { actividad_id: 'A_TER', horas: 30 },
      { actividad_id: 'A_GP', horas: 40 },
    ]);

    expect(part.complementarias_pregrado).toHaveLength(1);
    expect(part.complementarias_posgrado).toHaveLength(1);
    expect(part.complementarias_territorial).toHaveLength(1);
    expect(part.complementarias_gestion_profesoral).toHaveLength(1);
    expect(part.complementarias).toHaveLength(0);
  });

  // Misma regla que Docencia: lo dictado/gestionado por una territorial se
  // aprueba por territorial aunque tenga nivel de programa.
  it('la territorialidad manda sobre el nivel', async () => {
    const service = conCatalogo([
      { id: 'A_MIX', nivel_programa: 'posgrado', tipo_aprobacion: 'decanatura' },
    ]);

    const part = await clasificar(service, [{ actividad_id: 'A_MIX', horas: 10 }]);

    expect(part.complementarias_territorial).toHaveLength(1);
    expect(part.complementarias_posgrado).toHaveLength(0);
  });

  // Config previa a EFDS-1353: sin ámbito declarado se mantiene el catch-all,
  // que es el comportamiento que ya tenían esos datos.
  it('conserva en el catch-all las actividades sin ámbito configurado', async () => {
    const service = conCatalogo([{ id: 'A_LEGACY' }]);

    const part = await clasificar(service, [
      { actividad_id: 'A_LEGACY', horas: 10 },
      { actividad_id: 'DESCONOCIDA', horas: 5 },
    ]);

    // A_LEGACY existe en catálogo sin nivel → default gestion_profesoral.
    expect(part.complementarias_gestion_profesoral).toHaveLength(1);
    // Una actividad que ni siquiera está en el catálogo no puede clasificarse.
    expect(part.complementarias).toHaveLength(1);
  });

  it('Complementarias ya no se autoriza con los permisos de Docencia', () => {
    const soloDocencia = new Set([
      'pta.approve.academica.pregrado',
      'pta.review.academica.pregrado',
    ]);

    expect(hasComponentPermission(soloDocencia, 'academica_pregrado')).toBe(true);
    expect(hasComponentPermission(soloDocencia, 'complementarias_pregrado')).toBe(false);
    expect(hasReviewPermission(soloDocencia, 'complementarias_pregrado', 'docencia')).toBe(false);

    const conComplementarias = new Set([
      'pta.approve.complementarias.pregrado',
      'pta.review.complementarias.pregrado',
    ]);
    expect(hasComponentPermission(conComplementarias, 'complementarias_pregrado')).toBe(true);
    expect(hasReviewPermission(conComplementarias, 'complementarias_pregrado', 'docencia')).toBe(true);
  });

  it('el ámbito territorial de Complementarias se habilita por nivel', () => {
    const soloPregrado = new Set(['pta.approve.complementarias.territorial.pregrado']);
    expect(hasComponentPermission(soloPregrado, 'complementarias_territorial')).toBe(true);

    // No debe habilitarse con el territorial de Docencia.
    const territorialDocencia = new Set(['pta.approve.academica.territorial.pregrado']);
    expect(hasComponentPermission(territorialDocencia, 'complementarias_territorial')).toBe(false);
  });

  it('declara los componentes territoriales y el juego completo de Complementarias', () => {
    expect(isTerritorialComponent('complementarias_territorial')).toBe(true);
    expect(isTerritorialComponent('academica_territorial')).toBe(true);
    expect(isTerritorialComponent('complementarias_pregrado')).toBe(false);

    expect(COMPLEMENTARIAS_COMPONENT_KEYS).toEqual(expect.arrayContaining([
      'complementarias',
      'complementarias_pregrado',
      'complementarias_posgrado',
      'complementarias_territorial',
      'complementarias_gestion_profesoral',
    ]));
  });
});
