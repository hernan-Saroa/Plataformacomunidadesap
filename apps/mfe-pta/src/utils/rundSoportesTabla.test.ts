import { describe, expect, it } from 'vitest';
import { codigoSoporte, estadoDeEvidencia, filasSoportes, nomenclaturaSoporte } from './rundSoportesTabla';
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

  it('respeta el tope del servicio: con diez archivos ya no se ofrece agregar otro', () => {
    const diez = Array.from({ length: 10 }, (_, indice) => evidencia(`m${indice + 1}`));
    expect(filasSoportes([grupo('diploma_maestria', 'Maestría', diez)]).at(-1)!.puedeAgregar).toBe(false);
  });

  it('pregrado no exige un mínimo de archivos: sin archivos solo muestra el espacio para cargar', () => {
    const [fila] = filasSoportes([grupo('diploma_pregrado', 'Pregrado')]);
    expect(fila.estado).toBe('Sin cargar');
    expect(fila.puedeCargar).toBe(true);
  });

  it('sin permiso de carga o sin dato registrado no se puede cargar ni agregar', () => {
    const [sinDato] = filasSoportes([grupo('diploma_doctorado', 'Doctorado', [], { canUpload: false })]);
    expect(sinDato.puedeCargar).toBe(false);
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
