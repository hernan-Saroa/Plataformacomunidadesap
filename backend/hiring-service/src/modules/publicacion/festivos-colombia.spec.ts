import { domingoDePascua, festivosColombia, festivosEntre } from './festivos-colombia';

/**
 * Calendarios conocidos y verificados. Son la prueba de que el generador no es
 * una suposición: si reproduce estos tres años completos, reproduce cualquiera.
 *
 * 2024 y 2025 ya pasaron, así que su calendario es un hecho comprobable. 2026
 * es el año en curso. Los tres coinciden con los que usa Gestión Legal.
 *
 * OJO con 2027: el calendario de Gestión Legal trae ahí dos fechas mal —pone
 * San Pedro y San Pablo el 28 de junio y el Día de la Raza el 11 de octubre,
 * que son los lunes ANTERIORES. La Ley 51 de 1983 traslada al lunes siguiente,
 * así que van el 5 de julio y el 18 de octubre. Por eso 2027 no se usa como
 * referencia: sería probar contra un dato equivocado.
 */
const CONOCIDOS: Record<number, string[]> = {
  2024: [
    '2024-01-01', '2024-01-08', '2024-03-25', '2024-03-28', '2024-03-29', '2024-05-01',
    '2024-05-13', '2024-06-03', '2024-06-10', '2024-07-01', '2024-07-20', '2024-08-07',
    '2024-08-19', '2024-10-14', '2024-11-04', '2024-11-11', '2024-12-08', '2024-12-25',
  ],
  2025: [
    '2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17', '2025-04-18', '2025-05-01',
    '2025-06-02', '2025-06-23', '2025-06-30', '2025-07-07', '2025-07-20', '2025-08-07',
    '2025-08-18', '2025-10-13', '2025-11-03', '2025-11-17', '2025-12-08', '2025-12-25',
  ],
  2026: [
    '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-01',
    '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29', '2026-07-20', '2026-08-07',
    '2026-08-17', '2026-10-12', '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25',
  ],
};

describe('domingoDePascua', () => {
  it('acierta las pascuas conocidas', () => {
    expect(domingoDePascua(2026)).toBe('2026-04-05');
    expect(domingoDePascua(2027)).toBe('2027-03-28');
    expect(domingoDePascua(2024)).toBe('2024-03-31');
    expect(domingoDePascua(2025)).toBe('2025-04-20');
  });

  it('siempre cae en domingo', () => {
    for (let anio = 2024; anio <= 2060; anio++) {
      expect(new Date(`${domingoDePascua(anio)}T00:00:00Z`).getUTCDay()).toBe(0);
    }
  });
});

describe('festivosColombia', () => {
  for (const [anio, esperados] of Object.entries(CONOCIDOS)) {
    it(`reproduce los 18 festivos de ${anio}`, () => {
      expect(festivosColombia(Number(anio)).map((f) => f.fecha)).toEqual(esperados);
    });
  }

  it('da dieciocho festivos en cualquier año', () => {
    // Si un traslado se implementara mal podrían solaparse dos festivos y el
    // año quedaría con diecisiete, que es un día hábil de más en cada plazo.
    for (let anio = 2024; anio <= 2060; anio++) {
      const fechas = festivosColombia(anio).map((f) => f.fecha);
      expect(fechas).toHaveLength(18);
      expect(new Set(fechas).size).toBe(18);
    }
  });

  it('no mueve los festivos de fecha fija', () => {
    for (let anio = 2024; anio <= 2060; anio++) {
      const fechas = festivosColombia(anio).map((f) => f.fecha);
      for (const fija of ['01-01', '05-01', '07-20', '08-07', '12-08', '12-25']) {
        expect(fechas).toContain(`${anio}-${fija}`);
      }
    }
  });

  it('deja en lunes todos los trasladables y los pascuales posteriores', () => {
    // Los cinco que no son lunes: los seis fijos caen donde caigan, y jueves y
    // viernes santo conservan su día por mandato religioso.
    for (let anio = 2024; anio <= 2060; anio++) {
      const porNombre = new Map(festivosColombia(anio).map((f) => [f.descripcion, f.fecha]));
      const enLunes = [
        'Día de los Reyes Magos',
        'Día de San José',
        'San Pedro y San Pablo',
        'Asunción de la Virgen',
        'Día de la Raza',
        'Día de Todos los Santos',
        'Independencia de Cartagena',
        'Ascensión del Señor',
        'Corpus Christi',
        'Sagrado Corazón de Jesús',
      ];
      for (const nombre of enLunes) {
        const fecha = porNombre.get(nombre)!;
        expect(new Date(`${fecha}T00:00:00Z`).getUTCDay()).toBe(1);
      }
    }
  });

  it('conserva jueves y viernes santo en su día', () => {
    for (let anio = 2024; anio <= 2060; anio++) {
      const porNombre = new Map(festivosColombia(anio).map((f) => [f.descripcion, f.fecha]));
      expect(new Date(`${porNombre.get('Jueves Santo')}T00:00:00Z`).getUTCDay()).toBe(4);
      expect(new Date(`${porNombre.get('Viernes Santo')}T00:00:00Z`).getUTCDay()).toBe(5);
    }
  });
});

describe('festivosEntre', () => {
  it('junta los años pedidos', () => {
    const rango = festivosEntre(2026, 2027);
    expect(rango.size).toBe(36);
    expect(rango.has('2026-12-25')).toBe(true);
    expect(rango.has('2027-01-01')).toBe(true);
  });

  it('aplica el traslado al lunes siguiente, no al anterior', () => {
    // Los dos que el calendario de Gestión Legal trae mal en 2027. El 29 de
    // junio cae martes y el 12 de octubre también, así que ambos se corren
    // hacia adelante.
    const rango = festivosEntre(2027, 2027);
    expect(rango.has('2027-07-05')).toBe(true);
    expect(rango.has('2027-06-28')).toBe(false);
    expect(rango.has('2027-10-18')).toBe(true);
    expect(rango.has('2027-10-11')).toBe(false);
  });

  it('cubre cualquier año, sin tope', () => {
    // Era el techo del calendario sembrado a mano: en 2028 dejaba de poder
    // registrarse una publicación.
    expect(festivosEntre(2028, 2028).size).toBe(18);
    expect(festivosEntre(2045, 2045).size).toBe(18);
  });
});
