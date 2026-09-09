import { documentosDeModalidad } from './documentos.service';

/**
 * Los dos criterios de aceptación de EFDS-1149 se reducen a esta función: qué
 * documentos exige el proceso depende de su modalidad, y no de quién los pide
 * ni de en qué orden se carguen.
 *
 * El catálogo real vive en hiring.documentos_requeridos (migración 019); aquí
 * se reproduce su forma para poder probar la regla sin base de datos.
 */
const CATALOGO = [
  {
    codigo: 'AVISO_CONVOCATORIA',
    modalidades: ['LICITACION_PUBLICA', 'MINIMA_CUANTIA', 'CONCURSO_MERITOS_ABIERTO'],
  },
  {
    codigo: 'PROYECTO_PLIEGO',
    modalidades: ['LICITACION_PUBLICA', 'MINIMA_CUANTIA', 'CONCURSO_MERITOS_ABIERTO'],
  },
  { codigo: 'ACTO_JUSTIFICACION', modalidades: ['CONTRATACION_DIRECTA'] },
];

const codigos = (modalidad: string | null) =>
  documentosDeModalidad(CATALOGO, modalidad).map((d) => d.codigo);

describe('documentosDeModalidad', () => {
  it('en una modalidad con pliego pide el aviso y el proyecto de pliego', () => {
    // Criterio 1: "el sistema produce el aviso de convocatoria y el proyecto de
    // pliego de condiciones".
    expect(codigos('LICITACION_PUBLICA')).toEqual(['AVISO_CONVOCATORIA', 'PROYECTO_PLIEGO']);
  });

  it('en contratación directa pide el acto de justificación en lugar del pliego', () => {
    // Criterio 2: el acto sustituye al pliego, no se suma a él.
    const directa = codigos('CONTRATACION_DIRECTA');

    expect(directa).toEqual(['ACTO_JUSTIFICACION']);
    expect(directa).not.toContain('PROYECTO_PLIEGO');
  });

  it('exige lo mismo a todas las modalidades competitivas', () => {
    // La regla es "con pliego" o "sin pliego", no una lista por modalidad: si
    // dos competitivas pidieran cosas distintas sería un error de catálogo.
    expect(codigos('MINIMA_CUANTIA')).toEqual(codigos('CONCURSO_MERITOS_ABIERTO'));
  });

  it('un documento sin modalidades listadas se le exige a todas', () => {
    // La convención del módulo: vacío = todas. Es lo que evita reeditar el
    // catálogo entero cuando la normativa agrega una modalidad.
    const conComun = [...CATALOGO, { codigo: 'ANEXO_TECNICO', modalidades: [] }];

    for (const modalidad of ['LICITACION_PUBLICA', 'CONTRATACION_DIRECTA']) {
      expect(documentosDeModalidad(conComun, modalidad).map((d) => d.codigo)).toContain(
        'ANEXO_TECNICO',
      );
    }
  });

  it('no exige nada específico de modalidad a un proceso que aún no la tiene', () => {
    // La modalidad se elige al crear el proceso, pero el dato puede faltar en
    // los que nacieron antes de EFDS-1147. Pedirles el pliego de una modalidad
    // que no tienen los dejaría con un requisito imposible de satisfacer.
    expect(codigos(null)).toEqual([]);
  });

  it('tampoco exige nada en una modalidad que el catálogo no contempla', () => {
    expect(codigos('MODALIDAD_INVENTADA')).toEqual([]);
  });
});
