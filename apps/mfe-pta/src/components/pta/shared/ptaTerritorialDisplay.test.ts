import { describe, expect, it } from 'vitest';
import { getPtaAssignmentTerritorialLabel, getTerritorialDisplayName, resolverTerritorial, territorialDeLaDecision, toTerritorialReference, TERRITORIAL_NO_IDENTIFICADA } from './ptaTerritorialDisplay';

/**
 * EFDS-2336, reabierto en preproducción: la tarjeta «Componente Docencia (Territorial)» mostraba un
 * nombre, pero no el correcto. Las pruebas usan catálogos con identificadores que NO son los de una
 * base concreta, para simular otro ambiente: lo que cuenta es el id y la regla, no los datos de una base.
 */
describe('EFDS-2336 :: una sola función para el nombre de la territorial', () => {
  // Dos catálogos que no cruzan: el que sirve el ambiente (seccionales) y otro (p. ej. direcciones territoriales).
  const catalogo = [
    { id: '41', codigo: '900041', nombre: 'Tolima' },
    { id: '19', codigo: '900019', nombre: 'Cauca' },
    { id: '7', codigo: '41', nombre: 'Norte de Santander' }, // su CÓDIGO coincide con el ID de Tolima
  ];

  it('un identificador del catálogo correcto → su nombre (por id o por código)', () => {
    expect(resolverTerritorial('41', [catalogo[0], catalogo[1]])).toBe('Tolima');
    expect(resolverTerritorial('900019', catalogo)).toBe('Cauca');
  });

  it('un identificador que no existe → «Territorial no identificada», nunca otro valor', () => {
    expect(TERRITORIAL_NO_IDENTIFICADA).toBe('Territorial no identificada');
    expect(resolverTerritorial('999', catalogo)).toBe('Territorial no identificada');
    expect(resolverTerritorial('265cf9d0-536c-4405-9c62-219ea59c07ab', catalogo)).toBe('Territorial no identificada');
    expect(resolverTerritorial('DT-013', catalogo)).toBe('Territorial no identificada');
    expect(resolverTerritorial('', catalogo)).toBe('Territorial no identificada');
    expect(resolverTerritorial(null, catalogo)).toBe('Territorial no identificada');
    expect(resolverTerritorial('41', [])).toBe('Territorial no identificada');
  });

  it('un identificador que coincide con dos registros (id de uno, código de otro) no muestra un nombre equivocado', () => {
    expect(resolverTerritorial('41', catalogo)).toBe('Territorial no identificada');
  });

  it('un nombre ya registrado (dato histórico) se respeta; no es un valor por defecto', () => {
    expect(resolverTerritorial('Sede Nacional', catalogo)).toBe('Sede Nacional');
    expect(resolverTerritorial('Atlántico', catalogo)).toBe('Atlántico');
  });

  it('Docencia (Territorial): muestra la territorial de la docencia (el par decidido), no la del docente', () => {
    // El caso del reporte: docente de Cauca, docencia en Tolima, aprobada por el aprobador de Tolima.
    const pta = { territorial: '19' };
    const aprobacion = { componente: 'academica_territorial', estado: 'aprobado', scope: 'territorial', scopeId: '19', aprobadorNombre: 'Aprobador de Tolima' };
    const pares = [{ territorialId: '41', nivel: 'pregrado', estado: 'aprobado' }];
    const sinColision = [catalogo[0], catalogo[1]];
    expect(territorialDeLaDecision(aprobacion, pares, sinColision, pta)).toEqual({ rotulo: 'Territorial de la docencia', valor: 'Tolima' });
  });

  it('Docencia (Territorial): con varios pares lista sus territoriales; prefiere los del estado de la tarjeta', () => {
    const sinColision = [catalogo[0], catalogo[1]];
    const pares = [
      { territorialId: '41', nivel: 'pregrado', estado: 'aprobado' },
      { territorialId: '19', nivel: 'posgrado', estado: 'devuelto' },
    ];
    expect(territorialDeLaDecision({ componente: 'academica_territorial', estado: 'aprobado' }, pares, sinColision, {}).valor).toBe('Tolima');
    expect(territorialDeLaDecision({ componente: 'academica_territorial', estado: 'devuelto' }, pares, sinColision, {}).valor).toBe('Cauca');
    expect(territorialDeLaDecision({ componente: 'academica_territorial', estado: 'pendiente' }, pares, sinColision, {}).valor).toBe('Tolima, Cauca');
  });

  it('Docencia (Territorial) sin pares conocidos → «Territorial no identificada», no la del docente', () => {
    const r = territorialDeLaDecision({ componente: 'academica_territorial', estado: 'aprobado', scope: 'territorial', scopeId: '19' }, [], catalogo, { territorial: '19' });
    expect(r).toEqual({ rotulo: 'Territorial de la docencia', valor: 'Territorial no identificada' });
  });

  it('la territorial del docente también pasa por la misma regla (id sin correspondencia → no identificada)', () => {
    expect(territorialDeLaDecision({ componente: 'academica_pregrado' }, [], catalogo, { territorial: '999' }))
      .toEqual({ rotulo: 'Territorial del docente', valor: 'Territorial no identificada' });
  });
});

describe('nombres de territoriales en campos informativos', () => {
  const id = '265cf9d0-536c-4405-9c62-219ea59c07ab';
  const catalogo = [{ id, codigo: '900017', nombre: 'Risaralda' }];

  it('resuelve IDs y códigos con el catálogo vigente del ambiente', () => {
    expect(getTerritorialDisplayName(id, catalogo)).toBe('Risaralda');
    expect(getTerritorialDisplayName('900017', catalogo)).toBe('Risaralda');
    expect(getTerritorialDisplayName({ territorialId: id, territorialNombre: id }, catalogo)).toBe('Risaralda');
    expect(getTerritorialDisplayName(id, [{ id, nombre: 'Nombre en otro ambiente' }])).toBe('Nombre en otro ambiente');
  });

  it('conserva nombres históricos y no expone UUID ni códigos sin nombre', () => {
    expect(getTerritorialDisplayName({ territorialId: id, territorialNombre: 'Risaralda' })).toBe('Risaralda');
    expect(getTerritorialDisplayName(id)).toBeNull();
    expect(getTerritorialDisplayName('900017')).toBeNull();
    expect(getTerritorialDisplayName({ id })).toBeNull();
    expect(getTerritorialDisplayName('Sede Nacional')).toBe('Sede Nacional');
  });

  it('la tarjeta de un componente no territorial muestra la territorial del docente y lo dice (EFDS-2336)', () => {
    expect(territorialDeLaDecision({ componente: 'academica_pregrado', scope: 'territorial', scopeId: id }, [], catalogo, { territorial: id }))
      .toEqual({ rotulo: 'Territorial del docente', valor: 'Risaralda' });
    // Un nombre registrado (dato histórico) se muestra tal cual.
    expect(territorialDeLaDecision({ componente: 'investigacion', scope: 'solicitud_edicion', scopeId: id }, [], catalogo, { territorial: 'Meta' }).valor).toBe('Meta');
    // Gestión Profesoral registra «Sede Nacional» en scopeId: eso no es la territorial del docente.
    expect(territorialDeLaDecision({ componente: 'extension', scopeId: 'Sede Nacional', aprobadorRol: 'Gestión Profesoral' }, [], catalogo, { territorial: id }).valor).toBe('Risaralda');
  });

  it('extrae la territorial sin confundirla con el nombre del docente o de la asignatura', () => {
    const referencia = toTerritorialReference({ id: 'docente-1', nombre: 'Nombre del docente', territorial: id, territorial_nombre: 'Risaralda' });
    expect(getTerritorialDisplayName(referencia)).toBe('Risaralda');
    expect(getTerritorialDisplayName(toTerritorialReference({ id: 'curso-1', nombre: 'Cálculo' }))).toBeNull();
  });

  it('evita mostrar UUID en la bandeja y recupera los nombres de las asignaturas', () => {
    expect(getPtaAssignmentTerritorialLabel({ territorial: id, territorialesAsignaturas: [id],
      asignaturas: [{ territorial_id: id, territorial_nombre: 'Risaralda' }] })).toBe('Risaralda');
    expect(getPtaAssignmentTerritorialLabel({ territorial: id, territorialesAsignaturas: [id] })).toBe('');
  });
});

describe('territorial mostrada en la bandeja PTA', () => {
  it('prioriza la ubicación de las asignaturas sobre la vinculación del docente', () => {
    expect(getPtaAssignmentTerritorialLabel({
      territorial: 'Atlántico',
      territorialesAsignaturas: ['Sede Central'],
    })).toBe('Sede Central');
  });

  it('usa la territorial de vinculación solo cuando no existe detalle académico', () => {
    expect(getPtaAssignmentTerritorialLabel({ territorial: 'Atlántico' })).toBe('Atlántico');
  });

  it('muestra Sede Central para docencia pregrado aunque una asignatura antigua no traiga territorial', () => {
    expect(getPtaAssignmentTerritorialLabel({
      territorial: 'Atlántico',
      territorialesAsignaturas: [],
      docencia_por_componente: {
        academica_pregrado: 96,
        academica_posgrado: 0,
        academica_territorial: 0,
      },
    })).toBe('Sede Central');
  });

  it('ignora una territorial de asignatura obsoleta cuando toda la docencia es central', () => {
    expect(getPtaAssignmentTerritorialLabel({
      territorial: 'Atlántico',
      territorialesAsignaturas: ['Atlántico'],
      docencia_por_componente: { academica_pregrado: 48, academica_territorial: 0 },
    })).toBe('Sede Central');
  });

  it('muestra las dos ubicaciones cuando el PTA mezcla docencia central y territorial', () => {
    expect(getPtaAssignmentTerritorialLabel({
      territorial: 'Atlántico',
      territorialesAsignaturas: ['Meta'],
      docencia_por_componente: { academica_posgrado: 32, academica_territorial: 16 },
    })).toBe('Sede Central, Meta');
  });
});
