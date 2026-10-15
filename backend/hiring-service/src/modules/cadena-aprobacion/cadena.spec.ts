import {
  DecisionPrevia,
  escalonCompleto,
  esResponsable,
  leerConfigDeRegla,
  mensajeDePuesto,
  motivoParaNoDecidir,
  trasDecision,
  validarEscalones,
} from './cadena';

/**
 * Las reglas de la aprobación por escalones (migración 101).
 *
 * Lo que más importa fijar: que una aprobación intermedia nunca deja la
 * actividad aprobada —aprobarla dispara el CDP y cierra la etapa—, y que
 * devolver, en cualquier escalón, la regresa a quien la envió, que es el único
 * que corrige.
 */
describe('cadena de aprobación', () => {
  describe('trasDecision', () => {
    const cuatro = [1, 2, 3, 4];

    it('aprobar un escalón intermedio activa el siguiente y deja la actividad en revisión', () => {
      const r = trasDecision(cuatro, 2, 'APROBADO', true);

      expect(r.actividad).toBe('EN_REVISION');
      expect(r.aprobacionDefinitiva).toBe(false);
      expect(r.ronda).toBe('EN_CURSO');
      expect(r.escalonActual).toBe(3);
      expect(r.activado).toBe(3);
      expect(r.escalones.get(2)).toBe('APROBADO');
      expect(r.escalones.get(3)).toBe('PENDIENTE');
    });

    it('solo el último escalón aprueba la actividad', () => {
      const r = trasDecision(cuatro, 4, 'APROBADO', true);

      expect(r.actividad).toBe('APROBADO');
      expect(r.aprobacionDefinitiva).toBe(true);
      expect(r.ronda).toBe('APROBADA');
      expect(r.escalonActual).toBeNull();
    });

    it('con un solo escalón, aprobar es la aprobación definitiva, como antes', () => {
      expect(trasDecision([1], 1, 'APROBADO', true).aprobacionDefinitiva).toBe(true);
    });

    it('un escalón que exige a todos no avanza con la primera aprobación', () => {
      const r = trasDecision(cuatro, 2, 'APROBADO', false);

      expect(r.actividad).toBe('EN_REVISION');
      expect(r.escalonActual).toBe(2);
      expect(r.escalones.size).toBe(0);
      expect(r.activado).toBeNull();
    });

    it('devolver en el escalón 3 regresa a quien la envió y anula lo que faltaba', () => {
      const r = trasDecision(cuatro, 3, 'DEVUELTO', true);

      expect(r.actividad).toBe('DEVUELTO');
      expect(r.ronda).toBe('DEVUELTA');
      expect(r.escalones.get(3)).toBe('DEVUELTO');
      expect(r.escalones.get(4)).toBe('ANULADO');
      // Lo que ya se aprobó no se borra: los escalones 1 y 2 no cambian.
      expect(r.escalones.has(1)).toBe(false);
      expect(r.escalones.has(2)).toBe(false);
    });

    it('negar cierra la ronda y la actividad sin vuelta', () => {
      const r = trasDecision(cuatro, 1, 'NEGADO', true);

      expect(r.actividad).toBe('NEGADO');
      expect(r.ronda).toBe('NEGADA');
      expect([2, 3, 4].map((o) => r.escalones.get(o))).toEqual(['ANULADO', 'ANULADO', 'ANULADO']);
    });
  });

  describe('quién puede decidir', () => {
    const escalon = {
      orden: 2,
      estado: 'PENDIENTE' as const,
      roles: ['COORDINADOR'],
      personas: ['persona-9'],
      papeles: ['CONTRATACION' as const],
      puestos: ['puesto-abogado'],
      acciones: ['APROBAR' as const, 'DEVOLVER' as const],
      reglaDecision: 'UNO' as const,
    };
    const quien = (
      roles: string[] = [],
      personaId: string | null = null,
      papeles: any[] = [],
      puestos: string[] = [],
    ) => ({
      roles,
      personaId,
      papeles,
      puestos,
    });
    const motivo = (over: Partial<Parameters<typeof motivoParaNoDecidir>[0]>) =>
      motivoParaNoDecidir({
        escalon,
        accion: 'APROBAR',
        quien: quien(['COORDINADOR'], 'persona-1'),
        usuarioId: 'cuenta-1',
        previas: [],
        permiteMismoAprobador: false,
        ...over,
      });

    it('decide quien tiene el rol, la persona nombrada, el papel o el puesto del proceso', () => {
      expect(motivo({})).toBeNull();
      expect(motivo({ quien: quien([], 'persona-9') })).toBeNull();
      expect(motivo({ quien: quien([], 'persona-2', ['CONTRATACION']) })).toBeNull();
      expect(motivo({ quien: quien([], 'persona-2', [], ['puesto-abogado']) })).toBeNull();
    });

    it('ocupar otro puesto no basta', () => {
      expect(motivo({ quien: quien([], 'persona-2', [], ['puesto-jefe']) })).toMatch(/No estás/);
    });

    it('nadie más', () => {
      expect(motivo({ quien: quien(['GESTOR'], 'persona-2') })).toMatch(/No estás/);
    });

    it('un escalón bloqueado no se decide aunque seas responsable', () => {
      expect(motivo({ escalon: { ...escalon, estado: 'BLOQUEADO' } })).toMatch(/no le toca/);
    });

    it('negar solo donde el escalón lo tiene permitido', () => {
      expect(motivo({ accion: 'NEGAR' })).toMatch(/no puede negar/);
      expect(motivo({ accion: 'NEGAR', escalon: { ...escalon, acciones: ['APROBAR', 'NEGAR'] } })).toBeNull();
    });

    const aprobo = (en: number, personaId = 'persona-1'): DecisionPrevia => ({
      escalon: en,
      decision: 'APROBADO',
      personaId,
      usuarioId: 'cuenta-1',
    });

    it('quien aprobó el escalón 1 no aprueba el 2 de la misma ronda', () => {
      expect(motivo({ previas: [aprobo(1)] })).toMatch(/otro escalón/);
    });

    it('salvo que la cadena lo permita', () => {
      expect(motivo({ previas: [aprobo(1)], permiteMismoAprobador: true })).toBeNull();
    });

    it('devolver sí puede, aunque haya aprobado antes', () => {
      expect(motivo({ previas: [aprobo(1)], accion: 'DEVOLVER' })).toBeNull();
    });

    it('lo que decidió otra persona no le estorba', () => {
      expect(motivo({ previas: [aprobo(1, 'persona-7')] })).toBeNull();
    });
  });

  describe('escalonCompleto', () => {
    const todos = { orden: 1, reglaDecision: 'TODOS' as const, personas: ['a', 'b'] };
    const aprobo = (personaId: string): DecisionPrevia => ({
      escalon: 1,
      decision: 'APROBADO',
      personaId,
      usuarioId: null,
    });

    it('con UNO basta la primera', () => {
      expect(escalonCompleto({ ...todos, reglaDecision: 'UNO' }, [], 'a')).toBe(true);
    });

    it('con TODOS espera a cada persona nombrada', () => {
      expect(escalonCompleto(todos, [], 'a')).toBe(false);
      expect(escalonCompleto(todos, [aprobo('a')], 'b')).toBe(true);
    });
  });

  describe('leerConfigDeRegla', () => {
    it('la regla de siempre se lee como un escalón que aprueba y devuelve', () => {
      const r = leerConfigDeRegla({ roles: ['DIRECTOR_CONTRATACION'], personas: [] });

      expect(r).toEqual({
        escalon: expect.objectContaining({
          roles: ['DIRECTOR_CONTRATACION'],
          reglaDecision: 'UNO',
          acciones: ['APROBAR', 'DEVOLVER'],
        }),
      });
    });

    it('una regla con plantilla apunta a ella', () => {
      expect(leerConfigDeRegla({ cadenaId: 'c-1' })).toEqual({ cadenaId: 'c-1' });
    });

    it('sin nadie que apruebe no exige nada', () => {
      expect(leerConfigDeRegla({ roles: [], personas: [] })).toBeNull();
    });
  });

  describe('validarEscalones', () => {
    it('acepta una cadena bien formada y pone las acciones por defecto', () => {
      const { escalones, problemas } = validarEscalones([
        { nombre: 'Técnico', roles: ['TECNICO'] },
        { nombre: 'Director', roles: ['DIRECTOR'], acciones: ['NEGAR', 'APROBAR'] },
      ]);

      expect(problemas).toEqual([]);
      expect(escalones[0].acciones).toEqual(['APROBAR', 'DEVOLVER']);
      expect(escalones[1].acciones).toEqual(['APROBAR', 'NEGAR']);
    });

    it('nombra todo lo que falta de una vez', () => {
      const { problemas } = validarEscalones([
        { nombre: '', roles: [] },
        { nombre: 'Sin salida', roles: ['X'], acciones: ['DEVOLVER'] },
      ]);

      expect(problemas).toEqual([
        'El escalón 1 necesita un nombre',
        'El escalón 1 no tiene quién decida: elige un rol, una persona, un puesto o un papel',
        'El escalón 2 tiene que poder aprobar: sin eso la cadena no tiene salida',
      ]);
    });

    it('TODOS solo con personas', () => {
      const { problemas } = validarEscalones([
        { nombre: 'Comité', roles: ['COMITE'], reglaDecision: 'TODOS' },
      ]);
      expect(problemas[0]).toMatch(/aprueben todos/);
    });

    it('una cadena vacía no es una cadena', () => {
      expect(validarEscalones([]).problemas).toEqual(['La cadena necesita al menos un escalón']);
    });
  });

  /*
   * Los puestos del proceso (109): un escalón que nombra un puesto lo decide
   * quien lo ocupa en el proceso. La pertenencia se resuelve fuera —quién
   * ocupa qué y si conserva el permiso—; aquí, que el puesto cuenta.
   */
  describe('puestos', () => {
    const abogado = { roles: [], personas: [], papeles: [], puestos: ['p-abogado'] };

    it('decide quien ocupa el puesto', () => {
      expect(esResponsable(abogado, { roles: [], personaId: null, papeles: [], puestos: ['p-abogado'] })).toBe(true);
    });

    it('tener el rol de abogado no basta: el puesto es por proceso', () => {
      expect(
        esResponsable(abogado, { roles: ['REVISOR_CONTRATACION'], personaId: null, papeles: [], puestos: [] }),
      ).toBe(false);
    });

    it('la regla de un escalón suelto puede nombrar puestos', () => {
      expect(leerConfigDeRegla({ puestos: ['p-abogado'] })).toEqual({
        escalon: expect.objectContaining({ puestos: ['p-abogado'], roles: [] }),
      });
    });

    it('un escalón con solo un puesto tiene quién decida', () => {
      expect(validarEscalones([{ nombre: 'Abogado', puestos: ['p-abogado'] }]).problemas).toEqual([]);
    });

    it('el mensaje dice qué hacer y dónde', () => {
      expect(mensajeDePuesto('SIN_ASIGNAR', 'Abogado')).toBe('Falta asignar en la 3.3 quién ocupa el puesto Abogado');
      expect(mensajeDePuesto('SIN_PERMISO', 'Abogado', 'Diana Castro')).toMatch(
        /^Diana Castro \(Abogado\) ya no tiene permiso para aprobar aquí/,
      );
    });
  });
});
