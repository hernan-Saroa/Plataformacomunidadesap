import { describe, expect, it } from 'vitest';
import { codigoSoporte, estadoDeEvidencia, filasSoportes, nomenclaturaSoporte } from './rundSoportesTabla';
import { RUND_MAX_ARCHIVO_BYTES, RUND_MAX_ARCHIVO_MB, RUND_MAX_EVIDENCES_PER_TYPE } from './rundEvidenceRules';
import type { RundSupportGroup } from '../components/pta/banco-docentes/RundSupportList';

const grupo = (tipoSoporte: string, campo: string, evidences: any[] = [], extra: Partial<RundSupportGroup> = {}): RundSupportGroup => {
  const field = { tipoSoporte, campo, documento: campo };
  return { field, fields: [field], uploadField: field, evidences, canUpload: true, canManage: true, ...extra };
};
const evidencia = (id: string, estado = 'Pendiente', nombre = `${id}.pdf`) => ({ id, estado, nombre_archivo: nombre });

describe('Tabla de soportes según la codificación del GGP', () => {
  it.each([
    ['diploma_bachiller', 1, '1.0.1', '1.0.1_BACHILLER_COLEGIO'],
    ['diploma_pregrado', 1, '1.1.1', '1.1.1_PREGRADO_UNIVERSIDAD'],
    ['diploma_pregrado', 2, '1.1.2', '1.1.2_PREGRADO_ADICIONAL_UNIVERSIDAD'],
    ['diploma_especializacion', 1, '1.2.1', '1.2.1_ESPECIALIZACION_UNIVERSIDAD'],
    ['diploma_especializacion', 2, '1.2.2', '1.2.2_ESPECIALIZACION_ADICIONAL_UNIVERSIDAD'],
    ['diploma_maestria', 1, '1.3.1', '1.3.1_MAGISTER_UNIVERSIDAD'],
    ['diploma_maestria', 2, '1.3.2', '1.3.2_MAGISTER_ADICIONAL_UNIVERSIDAD'],
    ['diploma_maestria', 9, '1.3.9', '1.3.9_MAGISTER_ADICIONAL_UNIVERSIDAD'],
    ['diploma_doctorado', 1, '1.4.1', '1.4.1_DOCTORADO_UNIVERSIDAD'],
    ['certificado_posdoctoral', 1, '1.5.1', '1.5.1_POSDOCTORADO_UNIVERSIDAD'],
  ])('%s #%i tiene el código %s y la nomenclatura %s', (tipo, numero, codigo, nomenclatura) => {
    expect(codigoSoporte(tipo, numero)).toBe(codigo);
    expect(nomenclaturaSoporte(tipo, numero)).toBe(nomenclatura);
  });

  it.each([
    ['hoja_vida', 'HV_NOMBRE DOCENTE'], ['tarjeta_profesional', 'TP_NÚMERO DE FOLIO_NÚMERO DE TARJETA PROFESIONAL'],
    ['experiencia_laboral', 'AÑO_NÚMERO DE FOLIO_ENTIDAD/EMPRESA'], ['dominio_segunda_lengua', 'IDIOMA_NIVEL_NOMBRE DOCENTE'],
    ['formacion_no_formal', 'TIPOLOGÍA_AÑO_NOMBRE DOCENTE'], ['documento_no_valido', 'DUPLICADO_'],
    ['resolucion_escalafon', 'AÑO_NÚMERO DE FOLIO_CONCEPTO BREVE_APELLIDOS DOCENTE'],
  ])('%s usa el patrón de nombre del Excel: %s', (tipo, patron) => {
    expect(nomenclaturaSoporte(tipo, 1)).toBe(patron);
    expect(codigoSoporte(tipo, 1)).toBe('—');
  });

  it('un soporte sin archivos tiene una fila base «Sin cargar» y no ofrece agregar otro todavía', () => {
    const [fila] = filasSoportes([grupo('diploma_maestria', 'Maestría')]);
    expect(fila).toMatchObject({ codigo: '1.3.1', soporte: 'Maestría', archivo: null, estado: 'Sin cargar', puedeCargar: true, puedeAgregar: false, ultima: true });
  });

  it('cada archivo adicional genera su propia fila con el siguiente código, sin un número fijo de espacios', () => {
    const grupos = [grupo('diploma_maestria', 'Maestría', [evidencia('a'), evidencia('b', 'Aprobado'), evidencia('c', 'Rechazado')])];
    const filas = filasSoportes(grupos);
    expect(filas.map(fila => fila.codigo)).toEqual(['1.3.1', '1.3.2', '1.3.3']);
    expect(filas.map(fila => fila.soporte)).toEqual(['Maestría', 'Maestría adicional', 'Maestría adicional']);
    expect(filas.map(fila => fila.estado)).toEqual(['En revisión', 'Aprobado', 'Devuelto']);
    expect(filas.map(fila => fila.ultima)).toEqual([false, false, true]);
    expect(filas.filter(fila => fila.puedeAgregar).map(fila => fila.codigo)).toEqual(['1.3.1', '1.3.2', '1.3.3']);
  });

  it('un título puede tener nueve archivos del mismo nivel', () => {
    const nueve = Array.from({ length: 9 }, (_, indice) => evidencia(`m${indice + 1}`));
    const filas = filasSoportes([grupo('diploma_maestria', 'Maestría', nueve)]);
    expect(filas).toHaveLength(9);
    expect(filas.at(-1)!.codigo).toBe('1.3.9');
    expect(filas.at(-1)!.puedeAgregar).toBe(true);
  });

  it('respeta el tope del servicio: con el máximo de archivos ya no se ofrece agregar otro', () => {
    const maximo = Array.from({ length: RUND_MAX_EVIDENCES_PER_TYPE }, (_, indice) => evidencia(`m${indice + 1}`));
    expect(filasSoportes([grupo('diploma_maestria', 'Maestría', maximo)]).at(-1)!.puedeAgregar).toBe(false);
    expect(filasSoportes([grupo('diploma_maestria', 'Maestría', maximo.slice(0, -1))]).at(-1)!.puedeAgregar).toBe(true);
  });

  it('un expediente real cabe: 70 archivos en un mismo soporte (productividad académica) siguen permitiendo agregar', () => {
    const setenta = Array.from({ length: 70 }, (_, indice) => evidencia(`p${indice + 1}`));
    const filas = filasSoportes([grupo('productividad_academica', 'Productividad académica', setenta)]);
    expect(filas).toHaveLength(70);
    expect(filas.at(-1)!.puedeAgregar).toBe(true);
  });

  it('los límites de carga son los acordados: 200 archivos por soporte y 25 MB por archivo', () => {
    expect(RUND_MAX_EVIDENCES_PER_TYPE).toBe(200);
    expect(RUND_MAX_ARCHIVO_MB).toBe(25);
    expect(RUND_MAX_ARCHIVO_BYTES).toBe(25 * 1024 * 1024);
  });

  it('pregrado no exige un mínimo de archivos: sin archivos solo muestra el espacio para cargar', () => {
    const [fila] = filasSoportes([grupo('diploma_pregrado', 'Pregrado')]);
    expect(fila.estado).toBe('Sin cargar');
    expect(fila.puedeCargar).toBe(true);
  });

  it('un diploma de nivel se puede cargar aunque no haya título registrado: se pide al cargar', () => {
    const [sinDato] = filasSoportes([grupo('diploma_doctorado', 'Doctorado', [], { canUpload: false, titulos: [] })]);
    expect(sinDato.puedeCargar).toBe(true);
    expect(sinDato.pideTitulo).toBe(true);
    expect(sinDato.titulo).toBeNull();
  });

  it('los demás soportes sin dato siguen sin poder cargarse', () => {
    const [sinDato] = filasSoportes([grupo('diploma_bachiller', 'Bachiller', [], { canUpload: false })]);
    expect(sinDato.puedeCargar).toBe(false);
    expect(sinDato.pideTitulo).toBe(false);
  });

  it('cada título registrado tiene su fila con Cargar, aunque no tenga archivo', () => {
    const titulos = ['Pregrado A', 'Pregrado B', 'Pregrado C'];
    const filas = filasSoportes([grupo('diploma_pregrado', 'Pregrado', [evidencia('a')], { titulos })]);
    expect(filas.map(fila => fila.titulo)).toEqual(titulos);
    expect(filas.map(fila => fila.codigo)).toEqual(['1.1.1', '1.1.2', '1.1.3']);
    expect(filas.map(fila => fila.archivo)).toEqual(['a.pdf', null, null]);
    expect(filas.map(fila => fila.pideTitulo)).toEqual([false, false, false]);
    expect(filas.every(fila => fila.puedeCargar)).toBe(true);
    // Hay títulos sin archivo: «Agregar otro» no se ofrece para no desalinear título y archivo.
    expect(filas.at(-1)!.puedeAgregar).toBe(false);
  });

  it('con todos los títulos cargados se ofrece «Agregar otro» con el nombre del nivel', () => {
    const filas = filasSoportes([grupo('diploma_maestria', 'Maestría', [evidencia('a'), evidencia('b')], { titulos: ['M1', 'M2'] })]);
    expect(filas.at(-1)!.puedeAgregar).toBe(true);
    expect(filas.at(-1)!.etiquetaAgregar).toBe('maestría');
    expect(filasSoportes([grupo('diploma_pregrado', 'Pregrado', [evidencia('a')], { titulos: ['P1'] })])[0].etiquetaAgregar).toBe('pregrado');
  });

  it('muchos títulos registrados (20) aparecen todos en la lista', () => {
    const titulos = Array.from({ length: 20 }, (_, i) => `Pregrado ${i + 1}`);
    const filas = filasSoportes([grupo('diploma_pregrado', 'Pregrado', [], { titulos })]);
    expect(filas).toHaveLength(20);
    expect(filas.at(-1)!.titulo).toBe('Pregrado 20');
  });

  it('sin permiso de gestión no se puede cargar ni agregar', () => {
    const [soloConsulta] = filasSoportes([grupo('diploma_doctorado', 'Doctorado', [evidencia('x')], { canManage: false })]);
    expect(soloConsulta.puedeCargar).toBe(false);
    expect(soloConsulta.puedeAgregar).toBe(false);
  });

  it('usa el nombre del documento cuando un soporte acredita varios datos', () => {
    const campos = [{ tipoSoporte: 'documento_identidad', campo: 'Nombre completo', documento: 'Documento de identidad' },
      { tipoSoporte: 'documento_identidad', campo: 'Género', documento: 'Documento de identidad' }];
    const [fila] = filasSoportes([{ ...grupo('documento_identidad', 'Nombre completo'), field: campos[0], fields: campos }]);
    expect(fila.soporte).toBe('Documento de identidad');
  });

  it('el estado de un archivo sigue la revisión del soporte', () => {
    expect(estadoDeEvidencia(undefined)).toBe('Sin cargar');
    expect(estadoDeEvidencia({ estado: 'Pendiente' })).toBe('En revisión');
    expect(estadoDeEvidencia({ estado: 'Aprobado' })).toBe('Aprobado');
    expect(estadoDeEvidencia({ estado: 'Rechazado' })).toBe('Devuelto');
  });
});
