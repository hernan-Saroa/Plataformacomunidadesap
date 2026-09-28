import { repartirLaBandeja, SolicitudEnBandeja } from './cdp.service';

/**
 * Cómo se reparte la bandeja de la Dirección Financiera.
 *
 * La bandeja es compartida (069): quien llega primero se queda con la solicitud.
 * De este reparto depende que dos personas no se sienten a verificar la misma
 * disponibilidad, así que se fija aquí y no contra la base.
 */
describe('repartirLaBandeja', () => {
  const YO = 'u-marta';
  const OTRO = 'u-jorge';

  const solicitud = (financieraId: string | null, radicado: string): SolicitudEnBandeja => ({
    financieraId,
    procesoId: `p-${radicado}`,
    radicado,
    objeto: 'Servicio de aseo',
    modalidad: 'MINIMA_CUANTIA',
    valor: 12_000_000,
    valorEsEstimado: false,
    rubro: null,
    estado: 'SOLICITADO',
    solicitadoPor: 'carlos.mendoza@esap.edu.co',
    solicitadoAt: '2026-09-01T10:00:00.000Z',
    diasEsperando: 1,
    demorada: false,
    aCargoDe: financieraId ? 'Alguien' : null,
  });

  it('lo que nadie ha tomado es lo que hay que recoger', () => {
    const { sinTomar, mias, deOtros } = repartirLaBandeja([solicitud(null, 'R-1')], YO);

    expect(sinTomar.map((s) => s.radicado)).toEqual(['R-1']);
    expect(mias).toHaveLength(0);
    expect(deOtros).toHaveLength(0);
  });

  it('lo que tomé yo es mi trabajo pendiente', () => {
    const { sinTomar, mias, deOtros } = repartirLaBandeja([solicitud(YO, 'R-2')], YO);

    expect(mias.map((s) => s.radicado)).toEqual(['R-2']);
    expect(sinTomar).toHaveLength(0);
    expect(deOtros).toHaveLength(0);
  });

  it('lo que lleva un compañero se ve, pero aparte', () => {
    // No se oculta a propósito: saber que ya está atendida —y por quién— es lo
    // que evita que dos personas verifiquen la misma disponibilidad.
    const { sinTomar, mias, deOtros } = repartirLaBandeja([solicitud(OTRO, 'R-3')], YO);

    expect(deOtros.map((s) => s.radicado)).toEqual(['R-3']);
    expect(sinTomar).toHaveLength(0);
    expect(mias).toHaveLength(0);
  });

  it('cada solicitud cae en un montón y en uno solo', () => {
    const { sinTomar, mias, deOtros } = repartirLaBandeja(
      [solicitud(null, 'R-1'), solicitud(YO, 'R-2'), solicitud(OTRO, 'R-3')],
      YO,
    );

    expect(sinTomar.length + mias.length + deOtros.length).toBe(3);
  });

  it('sin usuario identificado nada es mío, y no por eso está libre', () => {
    // Pasa si el token no trae `userId`. Dar por propias las ajenas ofrecería
    // expedir un CDP que la API va a rechazar; darlas por libres ofrecería
    // tomar una que ya tiene dueño.
    const { sinTomar, mias, deOtros } = repartirLaBandeja([solicitud(OTRO, 'R-3')], undefined);

    expect(mias).toHaveLength(0);
    expect(sinTomar).toHaveLength(0);
    expect(deOtros).toHaveLength(1);
  });

  it('no filtra hacia la pantalla de quién es cada solicitud', () => {
    // `financieraId` reparte y se queda dentro: fuera basta el nombre en
    // `aCargoDe`, y el id de usuario de un compañero no es dato de pantalla.
    const { deOtros } = repartirLaBandeja([solicitud(OTRO, 'R-3')], YO);

    expect(deOtros[0]).not.toHaveProperty('financieraId');
    expect(deOtros[0].aCargoDe).toBe('Alguien');
  });
});
