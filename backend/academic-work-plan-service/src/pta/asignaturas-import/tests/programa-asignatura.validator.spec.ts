import * as xlsx from 'xlsx';
import { BadRequestException } from '@nestjs/common';
import { ImportValidator } from '../validators/import.validator';
import { ExcelParserService, AsignaturaRow, ProgramaRow } from '../parsers/excel-parser.service';
import { AsignaturasImportService } from '../asignaturas-import.service';

const diurno: ProgramaRow = {
  codigo_programa: 'PRO-001', nombre_programa: 'Administración Pública - Diurno',
  nombre_corto: 'AP_Diurno', nombre_excel_origen: 'AP_Diurno', tipo_programa: 'pregrado',
  categoria_horas_circular003: 'pregrado_sede_central', descripcion_categoria_circular003: null,
  horas_pta_referencia_circular003: null, formula_calculo_horas: null,
  codigo_facultad: 'PREGRADO', modalidad_principal: 'presencial',
  horas_base_por_credito: 16, horas_pregrado_central: 64, activo: true,
};
const nocturno: ProgramaRow = { ...diurno, codigo_programa: 'PRO-002',
  nombre_programa: 'Administración Pública - Nocturno', nombre_corto: 'AP_Nocturno', nombre_excel_origen: 'AP_Nocturno' };
const asignatura: AsignaturaRow = {
  codigo_asignatura: 'ASIG-00489', pensum: 'AP_34', nombre_asignatura: 'Opciones De Grado AP',
  nombre_base: 'Opciones De Grado AP', creditos: 15, horas_clase: 64, horas_pta: 192,
  semestre: '10', modalidad: 'Presencial', nucleo_tematico: 'Formación General',
  codigo_programa: 'PRO-001', nombre_programa: nocturno.nombre_programa, codigo_facultad: 'PREGRADO',
  tipo_excepcion: null, requiere_revision_modalidad: true, activa: true,
};

describe('asociación entre código y nombre de programa en ASIGNATURAS', () => {
  it.each(['AP_34', 'AP_36'])('rechaza %s cuando el nombre apunta a Nocturno y el código a Diurno', pensum => {
    const report = ImportValidator.validarPreInsert([{ ...asignatura, pensum }], [diurno, nocturno]);
    expect(report.isValid).toBe(false);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toContain(`ASIGNATURAS fila 2 (ASIG-00489, Pensum ${pensum})`);
    expect(report.errors[0]).toContain('corresponde a PRO-002');
    expect(report.errors[0]).toContain('codigo_programa "PRO-001"');
  });

  it('acepta la asociación corregida sin imponer una lista fija de pensums', () => {
    const report = ImportValidator.validarPreInsert([
      { ...asignatura, codigo_programa: 'PRO-002', pensum: 'PLAN-NUEVO' },
      { ...asignatura, codigo_asignatura: 'ASIG-00490', nombre_programa: diurno.nombre_programa, pensum: 'AP_35' },
    ], [diurno, nocturno]);
    expect(report.errors).toEqual([]);
  });

  it('detecta la contradicción con diferencias de tildes, espacios y mayúsculas', () => {
    const report = ImportValidator.validarPreInsert([
      { ...asignatura, nombre_programa: '  ADMINISTRACION   PUBLICA - NOCTURNO  ' },
    ], [diurno, nocturno]);
    expect(report.isValid).toBe(false);
    expect(report.errors).toHaveLength(1);
  });

  it('reconoce los alias declarados en PROGRAMAS', () => {
    expect(ImportValidator.validarPreInsert([
      { ...asignatura, codigo_programa: 'PRO-002', nombre_programa: 'AP_Nocturno' },
    ], [diurno, nocturno]).errors).toEqual([]);
    expect(ImportValidator.validarPreInsert([
      { ...asignatura, nombre_programa: 'AP_Nocturno' },
    ], [diurno, nocturno]).isValid).toBe(false);
  });

  it('conserva nombres descriptivos alternativos que no identifican otro programa', () => {
    const gepur = { ...diurno, codigo_programa: 'PRO-008', nombre_programa: 'GEPUR (Especialización)' };
    expect(ImportValidator.validarPreInsert([
      { ...asignatura, codigo_programa: 'PRO-008',
        nombre_programa: 'Gestión y planificacion del desarrollo urbano y regional (Especialización)' },
    ], [gepur]).errors).toEqual([]);
  });

  it('no deduce otro programa a partir de un alias ambiguo', () => {
    expect(ImportValidator.validarPreInsert([
      { ...asignatura, nombre_programa: 'AP' },
    ], [{ ...diurno, nombre_excel_origen: 'AP' }, { ...nocturno, nombre_excel_origen: 'AP' }]).errors).toEqual([]);
  });

  it('bloquea el archivo contradictorio antes de consultar o modificar la base, incluso al importar válidos', async () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(
      [diurno, nocturno].map(programa => ({ ...programa, nombre_facultad: 'Pregrado' })),
    ), 'PROGRAMAS');
    const { pensum, ...row } = asignatura;
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet([{ ...row, Pensum: pensum }]), 'ASIGNATURAS');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet([
      { codigo_cetap: 'CET-0288', nombre_cetap: 'Sede Central', codigo_dt: 'SC', nombre_dt: 'SEDE_CENTRAL', 'PRO-001': 'X', 'PRO-002': 'X' },
    ]), 'MATRIZ_OFERTA');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const dataSource = { query: jest.fn(), createQueryRunner: jest.fn() };
    const service = new AsignaturasImportService(dataSource as any, new ExcelParserService());
    for (const dryRun of [true, false]) {
      const error = await service.importCatalog(buffer, dryRun, '2026-2', undefined, true).catch(value => value);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse().errors).toEqual([expect.stringContaining('corresponde a PRO-002')]);
    }
    expect(dataSource.query).not.toHaveBeenCalled();
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });
});
