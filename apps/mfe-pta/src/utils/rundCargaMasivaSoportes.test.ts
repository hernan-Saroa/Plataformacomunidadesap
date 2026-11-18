import { describe, expect, it } from 'vitest';
import { descripcionCargaMasiva, planificarCarga, resumenPlan, type GrupoCarga } from './rundCargaMasivaSoportes';

const pdf = (nombre: string, bytes = 10) => new File([new Uint8Array(bytes)], nombre, { type: 'application/pdf' });
const grupo = (tipoSoporte: string, extra: Partial<GrupoCarga> = {}): GrupoCarga => ({ tipoSoporte, nombresArchivo: [], puedeCargar: true, ...extra });

const GRUPOS_FORMACION = [
  grupo('diploma_bachiller'), grupo('diploma_pregrado', { titulos: ['Administrador Público', 'Abogado'] }), grupo('diploma_especializacion', { titulos: [] }),
  grupo('diploma_maestria', { titulos: ['Magíster en Paz'] }), grupo('diploma_doctorado', { titulos: [] }), grupo('certificado_posdoctoral', { titulos: [] }),
];

const planDe = (bloque: string, nombres: string[], grupos: GrupoCarga[]) => planificarCarga(bloque, nombres.map(nombre => pdf(nombre)), grupos);

describe('carga masiva de soportes — 01 Títulos de formación', () => {
  it('asocia cada archivo al título de su posición y no crea títulos que ya existen (nombres del Excel)', () => {
    const [uno, dos] = planDe('FORMACION', ['1.1.1_PREGRADO_UNIVERSIDAD_NACIONAL_DE_COLOMBIA.pdf', '1.1.2_PREGRADO_ADICIONAL_UNIVERSIDAD_PEDAGOGICA.pdf'], GRUPOS_FORMACION);
    expect(uno).toMatchObject({ estado: 'valido', tipoSoporte: 'diploma_pregrado', numero: 1, tituloExistente: 'Administrador Público' });
    expect(uno.tituloNuevo).toBeUndefined();
    expect(dos).toMatchObject({ estado: 'valido', tipoSoporte: 'diploma_pregrado', numero: 2, tituloExistente: 'Abogado' });
    expect(dos.tituloNuevo).toBeUndefined();
  });

  it('crea el título cuando el archivo existe pero el Excel no lo trajo, con el nombre del nivel y la institución', () => {
    const plan = planDe('FORMACION', ['1.2.1_ESPECIALIZACION_SURCOLOMBIANA.pdf', '1.2.2_ESPECIALIZACION_ADICIONAL_UNIVERSIDAD_DE_NARIÑO.pdf'], GRUPOS_FORMACION);
    expect(plan[0]).toMatchObject({ estado: 'valido', tituloNuevo: 'Especialización (Surcolombiana)' });
    expect(plan[0].tituloExistente).toBeUndefined();
    expect(plan[1]).toMatchObject({ estado: 'valido', numero: 2, tituloNuevo: 'Especialización adicional (Universidad De Nariño)' });
  });

  it('un título adicional ya existente no se pisa: crea solo los que faltan', () => {
    const plan = planDe('FORMACION', ['1.1.3_PREGRADO_ADICIONAL_UNAL.pdf'], [
      ...GRUPOS_FORMACION.filter(item => item.tipoSoporte !== 'diploma_pregrado'),
      grupo('diploma_pregrado', { titulos: ['A', 'B'], nombresArchivo: ['a.pdf', 'b.pdf'] }),
    ]);
    expect(plan[0]).toMatchObject({ estado: 'valido', numero: 3, tituloNuevo: 'Pregrado adicional 2 (Unal)' });
  });

  it('procesa 1.x.1 antes que 1.x.2 aunque se elijan en otro orden', () => {
    const plan = planDe('FORMACION', ['1.3.2_MAGISTER_ADICIONAL_UNAL.pdf', '1.3.1_MAGISTER_UNAL.pdf'], GRUPOS_FORMACION);
    expect(plan.map(item => [item.nombre, item.estado])).toEqual([['1.3.1_MAGISTER_UNAL.pdf', 'valido'], ['1.3.2_MAGISTER_ADICIONAL_UNAL.pdf', 'valido']]);
  });

  it('rechaza 1.x.2 si falta el 1.x.1 para no emparejar el archivo con el título equivocado', () => {
    const [dos] = planDe('FORMACION', ['1.4.2_DOCTORADO_ADICIONAL_UNAL.pdf'], GRUPOS_FORMACION);
    expect(dos.estado).toBe('rechazado');
    expect(dos.motivo).toContain('Falta el documento 1.4.1');
  });

  it('advierte (y no duplica) si la posición ya tiene documento', () => {
    const [uno] = planDe('FORMACION', ['1.1.1_PREGRADO_OTRA_UNIVERSIDAD.pdf'], [
      grupo('diploma_pregrado', { titulos: ['Administrador Público'], nombresArchivo: ['1.1.1_PREGRADO_UNAL.pdf'] }),
    ]);
    expect(uno.estado).toBe('advertencia');
    expect(uno.motivo).toContain('1.1.1 ya tiene documento');
  });

  it('rechaza nombres que contradicen el código (código de maestría con la palabra PREGRADO, ADICIONAL mal usado)', () => {
    const plan = planDe('FORMACION', ['1.3.1_PREGRADO_UNAL.pdf', '1.1.1_PREGRADO_ADICIONAL_UNAL.pdf', '1.1.2_PREGRADO_UNAL.pdf', 'titulo.pdf', '1.7.1_X.pdf'], GRUPOS_FORMACION);
    expect(plan.every(item => item.estado === 'rechazado')).toBe(true);
    expect(plan.find(item => item.nombre === '1.3.1_PREGRADO_UNAL.pdf')?.motivo).toContain('corresponde a MAGISTER');
    expect(plan.find(item => item.nombre === '1.1.1_PREGRADO_ADICIONAL_UNAL.pdf')?.motivo).toContain('ADICIONAL se usa desde 1.1.2');
    expect(plan.find(item => item.nombre === '1.1.2_PREGRADO_UNAL.pdf')?.motivo).toContain('llevan ADICIONAL');
    expect(plan.find(item => item.nombre === 'titulo.pdf')?.motivo).toContain('nomenclatura de 01');
  });

  it('el bachiller no registra título', () => {
    const [uno] = planDe('FORMACION', ['1.0.1_BACHILLER_COLEGIO_SAN_JUAN.pdf'], GRUPOS_FORMACION);
    expect(uno).toMatchObject({ estado: 'valido', tipoSoporte: 'diploma_bachiller' });
    expect(uno.tituloNuevo).toBeUndefined();
    expect(uno.tituloExistente).toBeUndefined();
  });

  it('acepta la nomenclatura en minúsculas y con tildes', () => {
    const [uno] = planDe('FORMACION', ['1.2.1_especialización_surcolombiana.pdf'], GRUPOS_FORMACION);
    expect(uno.estado).toBe('valido');
  });
});

describe('carga masiva de soportes — 00 y carpetas con año/folio', () => {
  it('00: cédula, TP y HV válidos; foto rechazada con su motivo; nombre libre rechazado', () => {
    const plan = planDe('IDENTIDAD', ['CC_79259475.pdf', 'TP_52418.pdf', 'HV_PEDRO_NEL_PAEZ_PEREZ.pdf', 'FOTO_PEDRO_NEL_PAEZ_PEREZ.jpeg', 'cedula escaneada.pdf'],
      [grupo('documento_identidad'), grupo('tarjeta_profesional'), grupo('hoja_vida')]);
    const por = Object.fromEntries(plan.map(item => [item.nombre, item]));
    expect(por['CC_79259475.pdf']).toMatchObject({ estado: 'valido', tipoSoporte: 'documento_identidad', datos: ['Cédula de ciudadanía', 'N° 79259475'] });
    expect(por['TP_52418.pdf']).toMatchObject({ estado: 'valido', tipoSoporte: 'tarjeta_profesional' });
    expect(por['HV_PEDRO_NEL_PAEZ_PEREZ.pdf']).toMatchObject({ estado: 'valido', tipoSoporte: 'hoja_vida' });
    expect(por['FOTO_PEDRO_NEL_PAEZ_PEREZ.jpeg'].estado).toBe('rechazado');
    expect(por['FOTO_PEDRO_NEL_PAEZ_PEREZ.jpeg'].motivo).toContain('foto');
    expect(por['cedula escaneada.pdf'].estado).toBe('rechazado');
  });

  it('02: año y folio salen del nombre; varios archivos son soportes independientes', () => {
    const plan = planDe('EXPERIENCIA_DOCENTE', ['2002_1_ESAP.pdf', '2005_2_ESAP.pdf'], [grupo('experiencia_docente')]);
    expect(plan.map(item => item.estado)).toEqual(['valido', 'valido']);
    expect(plan[0].datos).toEqual(['Año 2002', 'Folio 1', 'Esap']);
    expect(descripcionCargaMasiva(plan[1])).toBe('Carga masiva · 2005_2_ESAP.pdf · Año 2005 · Folio 2 · Esap');
  });

  it('02/03/04/05/10: rechaza sin folio, con año inválido o sin entidad', () => {
    expect(planDe('PRODUCTIVIDAD_ACADEMICA', ['2011_PUNTOS_SALARIALES_PAEZ_PEREZ.pdf'], [grupo('productividad_academica')])[0].estado).toBe('rechazado');
    expect(planDe('EXPERIENCIA_LABORAL', ['1800_1_OIT.pdf'], [grupo('experiencia_laboral')])[0].motivo).toContain('año 1800');
    expect(planDe('ACADEMICO', ['2003_1.pdf'], [grupo('experiencia_investigativa')])[0].estado).toBe('rechazado');
  });

  it('05: el tipo de producto y los apellidos quedan en la descripción', () => {
    const [uno] = planDe('PRODUCTIVIDAD_ACADEMICA', ['2008_1_LIBRO_PAEZ_PEREZ.pdf'], [grupo('productividad_academica')]);
    expect(uno).toMatchObject({ estado: 'valido', tipoSoporte: 'productividad_academica' });
    expect(uno.datos).toEqual(['Año 2008', 'Folio 1', 'Libro Paez Perez']);
  });

  it('06 y 07: idioma y nivel; tipología y año', () => {
    const idioma = planDe('SEGUNDA_LENGUA', ['INGLES_C1_JOSE_FRANCISCO_MENDOZA_HERNANDEZ.pdf', 'INGLES_C1_2_JOSE_FRANCISCO_MENDOZA_HERNANDEZ.pdf', 'ingles.pdf'], [grupo('dominio_segunda_lengua')]);
    expect(idioma.map(item => item.estado)).toEqual(['valido', 'valido', 'rechazado']);
    expect(idioma[0].datos).toEqual(['Ingles', 'Nivel C1']);
    const noFormal = planDe('FORMACION_NO_FORMAL', ['DIPLOMADO_2001_LUIS_MIGUEL_CABRERA.pdf', 'DIPLOMADO_LUIS.pdf'], [grupo('formacion_no_formal')]);
    expect(noFormal[0]).toMatchObject({ estado: 'valido', datos: ['Diplomado', 'Año 2001'] });
    expect(noFormal[1].estado).toBe('rechazado');
  });

  it('10: deduce el soporte por el concepto y por defecto usa situación administrativa', () => {
    const grupos = [grupo('resolucion_escalafon'), grupo('acto_administrativo_situacion'), grupo('resolucion_puntaje_salarial')];
    const plan = planDe('VINCULACION', ['2007_3_ASCENSO_A_TITULAR_MARIN_TABORDA.pdf', '2010_1_LICENCIA_MARIN_TABORDA.pdf', '2012_2_PUNTOS_SALARIALES_MARIN_TABORDA.pdf'], grupos);
    expect(plan.map(item => item.tipoSoporte)).toEqual(['resolucion_escalafon', 'acto_administrativo_situacion', 'resolucion_puntaje_salarial']);
  });

  it('10: rechaza si el soporte deducido no admite carga (sin dato previo o sin permiso)', () => {
    const [uno] = planDe('VINCULACION', ['2007_3_ASCENSO_A_TITULAR_MARIN_TABORDA.pdf'], [grupo('resolucion_escalafon', { puedeCargar: false })]);
    expect(uno.estado).toBe('rechazado');
    expect(uno.motivo).toContain('Editar datos');
  });
});

describe('carga masiva de soportes — 08 y 09 sin nomenclatura obligatoria', () => {
  it('acepta cualquier nombre PDF', () => {
    expect(planDe('ESTUDIO_HOJA_VIDA', ['estudio hv final.pdf', 'ESTUDIO_HV_1_OCASIONAL_JOSE.pdf'], [grupo('estudio_hoja_vida')]).map(item => item.estado)).toEqual(['valido', 'valido']);
    expect(planDe('DOCUMENTOS_NO_VALIDOS', ['DUPLICADO_x.pdf', 'cualquiera.pdf'], [grupo('documento_no_valido')]).map(item => item.estado)).toEqual(['valido', 'valido']);
  });
});

describe('carga masiva de soportes — bordes de nomenclatura', () => {
  it('acepta nombres con Ñ descompuesta (NFD), espacios finales y extensión en mayúsculas', () => {
    const nombre = '1.1.3_PREGRADO_ADICIONAL_UNIVERSIDAD_DE_NARIÑO.PDF';
    const [uno] = planDe('FORMACION', [nombre], [grupo('diploma_pregrado', { titulos: ['A', 'B', 'C'], nombresArchivo: ['a.pdf', 'b.pdf'] })]);
    expect(uno.estado).toBe('valido');
    expect(uno.tituloExistente).toBe('C');
  });

  it('rechaza códigos fuera de rango o mal formados', () => {
    const nombres = ['1.6.1_X_Y.pdf', '1.1.0_PREGRADO_X.pdf', '2.1.1_PREGRADO_X.pdf', '1.1.1PREGRADO_X.pdf', '1.1.1_PREGRADO.pdf.pdf', '.pdf'];
    const plan = planDe('FORMACION', nombres, GRUPOS_FORMACION);
    expect(plan.filter(item => item.estado === 'valido')).toEqual([]);
  });

  it('un título sin institución se acepta y se crea solo con el nombre del nivel', () => {
    const [uno] = planDe('FORMACION', ['1.4.1_DOCTORADO.pdf'], GRUPOS_FORMACION);
    expect(uno).toMatchObject({ estado: 'valido', tituloNuevo: 'Doctorado' });
  });

  it('sin archivos no hay plan', () => {
    expect(planificarCarga('FORMACION', [], GRUPOS_FORMACION)).toEqual([]);
  });

  it('la cédula admite CE y rechaza letras o longitudes inválidas', () => {
    const g = [grupo('documento_identidad')];
    expect(planDe('IDENTIDAD', ['CE_123456.pdf'], g)[0].datos).toEqual(['Cédula de extranjería', 'N° 123456']);
    expect(planDe('IDENTIDAD', ['CC_12A456.pdf', 'CC_123.pdf', 'PA_1234567.pdf'], g).every(item => item.estado === 'rechazado')).toBe(true);
  });

  it('TP admite folio y número alfanumérico', () => {
    const [uno] = planDe('IDENTIDAD', ['TP_12_762345T.pdf'], [grupo('tarjeta_profesional')]);
    expect(uno.datos).toEqual(['Folio 12', 'Tarjeta 762345T']);
  });

  it('el año debe estar entre 1950 y el próximo año', () => {
    const anio = new Date().getFullYear();
    const plan = planDe('EXPERIENCIA_DOCENTE', [`${anio + 1}_1_A.pdf`, `${anio + 2}_1_A.pdf`, '1949_1_A.pdf', '1950_1_A.pdf'], [grupo('experiencia_docente')]);
    expect(plan.map(item => [item.nombre.slice(0, 4), item.estado])).toEqual([['1949', 'rechazado'], ['1950', 'valido'], [String(anio + 1), 'valido'], [String(anio + 2), 'rechazado']]);
  });

  it('la carpeta 10 sin dato previo rechaza todo y TRANSVERSAL no admite carga masiva', () => {
    expect(planDe('VINCULACION', ['2007_3_ASCENSO_X.pdf'], []).every(item => item.estado === 'rechazado')).toBe(true);
    expect(planDe('TRANSVERSAL', ['2007_3_X.pdf'], [grupo('autorizacion_habeas_data')])[0].motivo).toContain('no admite carga masiva');
  });
});

describe('carga masiva de soportes — controles generales', () => {
  const grupos = [grupo('experiencia_docente', { nombresArchivo: ['2002_1_ESAP.pdf'] })];

  it('solo admite PDF, no vacíos y hasta 25 MB', () => {
    const plan = planificarCarga('EXPERIENCIA_DOCENTE', [
      new File([new Uint8Array(5)], '2003_1_ESAP.docx'), pdf('2004_1_ESAP.pdf', 0), pdf('2005_1_ESAP.pdf', 25 * 1024 * 1024 + 1),
    ], grupos);
    expect(plan.map(item => item.estado)).toEqual(['rechazado', 'rechazado', 'rechazado']);
    expect(plan.map(item => item.motivo)).toEqual(['Solo se admiten archivos PDF.', 'El archivo está vacío.', 'El archivo supera el máximo de 25 MB.']);
  });

  it('un archivo con el mismo nombre que uno existente se reporta como advertencia y no se duplica', () => {
    const [uno] = planificarCarga('EXPERIENCIA_DOCENTE', [pdf('2002_1_esap.PDF')], grupos);
    expect(uno.estado).toBe('advertencia');
    expect(uno.motivo).toContain('no se duplica');
  });

  it('repetidos dentro de la selección: carga uno y advierte el otro', () => {
    const plan = planificarCarga('EXPERIENCIA_DOCENTE', [pdf('2003_1_ESAP.pdf'), pdf('2003_1_ESAP.pdf')], grupos);
    expect(plan.map(item => item.estado)).toEqual(['valido', 'advertencia']);
  });

  it('rechaza si la carpeta no tiene el soporte o no se puede cargar', () => {
    expect(planificarCarga('EXPERIENCIA_DOCENTE', [pdf('2003_1_ESAP.pdf')], [])[0].motivo).toContain('no tiene espacio');
    expect(planificarCarga('EXPERIENCIA_DOCENTE', [pdf('2003_1_ESAP.pdf')], [grupo('experiencia_docente', { puedeCargar: false })])[0].estado).toBe('rechazado');
  });

  it('resume el plan y no toca los archivos de entrada (simulación)', () => {
    const entrada = [pdf('2003_1_ESAP.pdf'), pdf('2002_1_ESAP.pdf'), pdf('malo.pdf'), pdf('malo.txt')];
    const resumen = resumenPlan(planificarCarga('EXPERIENCIA_DOCENTE', entrada, grupos));
    expect(resumen).toEqual({ total: 4, validos: 1, rechazados: 2, advertencias: 1 });
    expect(entrada.map(item => item.name)).toEqual(['2003_1_ESAP.pdf', '2002_1_ESAP.pdf', 'malo.pdf', 'malo.txt']);
  });

  it('la descripción no supera 1000 caracteres', () => {
    expect(descripcionCargaMasiva({ nombre: 'a'.repeat(2000), datos: [] }).length).toBe(1000);
  });
});
