import { ImportValidator } from '../validators/import.validator';
import { AsignaturaRow, ProgramaRow } from '../parsers/excel-parser.service';

describe('ImportValidator — Circular 003', () => {
  const mockPrograma: ProgramaRow = {
    codigo_programa: 'APT',
    nombre_programa: 'Administración Pública Territorial',
    nombre_corto: 'APT',
    nombre_excel_origen: 'APT',
    tipo_programa: 'pregrado',
    codigo_facultad: 'PRE',
    modalidad_principal: 'Distancia',
    horas_base_por_credito: 16,
    horas_pregrado_central: null,
    activo: true,
  };

  const mockAsignatura: AsignaturaRow = {
    codigo_asignatura: '101',
    nombre_asignatura: 'Introducción a la AP',
    nombre_base: 'Introducción a la AP',
    creditos: 3,
    horas_clase: 48,
    horas_pta: 144, // 3 * 16 * 3 = 144 (coincide con esperado)
    semestre: '1',
    modalidad: 'Distancia',
    nucleo_tematico: 'General',
    codigo_programa: 'APT',
    nombre_programa: 'Administración Pública Territorial',
    codigo_facultad: 'PRE',
    tipo_excepcion: null,
    requiere_revision_modalidad: false,
    activa: true,
  };

  it('no debe reportar advertencias si las horas coinciden con Circular 003', () => {
    const warnings = ImportValidator.validarCircular003([mockAsignatura], [mockPrograma]);
    expect(warnings.length).toBe(0);
  });

  it('debe generar una advertencia si las horas del archivo difieren de las calculadas', () => {
    const desviada = { ...mockAsignatura, horas_pta: 120 }; // Difiere de 144
    const warnings = ImportValidator.validarCircular003([desviada], [mockPrograma]);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('Desviación de horas PTA');
  });

  it('debe validar correctamente excepciones con horas fijas', () => {
    const excepcionRow: AsignaturaRow = {
      ...mockAsignatura,
      tipo_excepcion: 'seminario_enfasis',
      horas_pta: 384, // Correcto para la excepción
    };
    const warnings = ImportValidator.validarCircular003([excepcionRow], [mockPrograma]);
    expect(warnings.length).toBe(0);
  });
});
