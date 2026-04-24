/**
 * GeneradorPlantillaExcelPTA — Generacion real de plantilla Excel con 6 hojas
 * 
 * PARTE XXVI, Sec. 26.1.1: Plantilla oficial de carga masiva
 * Hojas:
 * 1. DATOS — 30 columnas para registro de docentes
 * 2. CATALOGO_TERRITORIALES — 17 territoriales + 51 CETAPs
 * 3. CATALOGO_VINCULACIONES — Tipos de vinculacion y dedicacion
 * 4. CATALOGO_ESCALAFONES — Categorias del escalafon docente
 * 5. INSTRUCCIONES — Guia paso a paso de llenado
 * 6. EJEMPLO — 3 registros de ejemplo pre-llenados
 */

import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { OFFICIAL_TERRITORIALES_ESAP } from '../../../shared/territoriales-cetaps-esap';

// ═══ Datos de catalogos completos ═══

const TERRITORIALES = OFFICIAL_TERRITORIALES_ESAP.map((territorial) => ({
  codigo: territorial.codigo,
  nombre: territorial.nombre.toUpperCase(),
  ciudad: territorial.ciudadPrincipal,
  departamento: territorial.departamentos.join(' / '),
}));

const VINCULACIONES = [
  { tipo: 'Carrera', subtipo: 'Profesor de Carrera (Decreto 2400/1968)', dedicaciones: 'TC, MT', aplica_pta: 'SI' },
  { tipo: 'Carrera', subtipo: 'Profesor de Carrera (Decreto 1279/2002)', dedicaciones: 'TC, MT', aplica_pta: 'SI' },
  { tipo: 'Planta', subtipo: 'Docente de Planta Transitorio', dedicaciones: 'TC', aplica_pta: 'SI' },
  { tipo: 'Ocasional', subtipo: 'Docente Ocasional TC', dedicaciones: 'TC', aplica_pta: 'SI' },
  { tipo: 'Ocasional', subtipo: 'Docente Ocasional MT', dedicaciones: 'MT', aplica_pta: 'SI' },
  { tipo: 'Catedra', subtipo: 'Docente Catedratico', dedicaciones: 'Hora Catedra', aplica_pta: 'NO' },
  { tipo: 'Administrativo', subtipo: 'Docencia Administrativa (Descarga Academica)', dedicaciones: 'Variable', aplica_pta: 'PARCIAL' },
];

const ESCALAFONES = [
  { categoria: 'Instructor', nivel: 1, horas_base_tc: 800, horas_base_mt: 400, salario_referencia: '$3.500.000 - $4.500.000', requisito_minimo: 'Titulo Profesional' },
  { categoria: 'Asistente', nivel: 2, horas_base_tc: 800, horas_base_mt: 400, salario_referencia: '$4.500.000 - $6.000.000', requisito_minimo: 'Titulo Maestria' },
  { categoria: 'Asociado', nivel: 3, horas_base_tc: 800, horas_base_mt: 400, salario_referencia: '$6.000.000 - $9.000.000', requisito_minimo: 'Titulo Maestria + 6 años exp.' },
  { categoria: 'Titular', nivel: 4, horas_base_tc: 800, horas_base_mt: 400, salario_referencia: '$9.000.000 - $15.000.000', requisito_minimo: 'Titulo Doctorado + 8 años exp.' },
];

const COLUMNAS_DATOS = [
  { col: 'A', campo: 'TIPO_DOCUMENTO', tipo: 'Texto', obligatorio: 'SI', descripcion: 'CC, CE, PP, TI' },
  { col: 'B', campo: 'NUMERO_DOCUMENTO', tipo: 'Numerico', obligatorio: 'SI', descripcion: 'Sin puntos ni guiones' },
  { col: 'C', campo: 'PRIMER_APELLIDO', tipo: 'Texto', obligatorio: 'SI', descripcion: 'Mayusculas' },
  { col: 'D', campo: 'SEGUNDO_APELLIDO', tipo: 'Texto', obligatorio: 'NO', descripcion: 'Mayusculas' },
  { col: 'E', campo: 'PRIMER_NOMBRE', tipo: 'Texto', obligatorio: 'SI', descripcion: 'Mayusculas' },
  { col: 'F', campo: 'SEGUNDO_NOMBRE', tipo: 'Texto', obligatorio: 'NO', descripcion: 'Mayusculas' },
  { col: 'G', campo: 'GENERO', tipo: 'Texto', obligatorio: 'SI', descripcion: 'M o F' },
  { col: 'H', campo: 'FECHA_NACIMIENTO', tipo: 'Fecha', obligatorio: 'SI', descripcion: 'DD/MM/AAAA' },
  { col: 'I', campo: 'CORREO_INSTITUCIONAL', tipo: 'Texto', obligatorio: 'SI', descripcion: 'nombre@esap.edu.co' },
  { col: 'J', campo: 'CORREO_PERSONAL', tipo: 'Texto', obligatorio: 'NO', descripcion: 'Correo alterno' },
  { col: 'K', campo: 'TELEFONO', tipo: 'Numerico', obligatorio: 'NO', descripcion: 'Sin espacios' },
  { col: 'L', campo: 'CODIGO_TERRITORIAL', tipo: 'Texto', obligatorio: 'SI', descripcion: 'SC, ANT, ATL, BCS, BOY, CAL, CAU, CHO, CUN, HUI, MET, NAR, NSA, RIS, SAN, TOL, VAL' },
  { col: 'M', campo: 'NOMBRE_TERRITORIAL', tipo: 'Texto', obligatorio: 'NO', descripcion: 'Autocompletado por codigo' },
  { col: 'N', campo: 'TIPO_VINCULACION', tipo: 'Texto', obligatorio: 'SI', descripcion: 'Carrera, Planta, Ocasional' },
  { col: 'O', campo: 'DECRETO_VINCULACION', tipo: 'Texto', obligatorio: 'NO', descripcion: '2400/1968, 1279/2002' },
  { col: 'P', campo: 'DEDICACION', tipo: 'Texto', obligatorio: 'SI', descripcion: 'TC o MT (Tiempo Completo / Medio Tiempo)' },
  { col: 'Q', campo: 'CATEGORIA_ESCALAFON', tipo: 'Texto', obligatorio: 'SI', descripcion: 'Instructor, Asistente, Asociado, Titular' },
  { col: 'R', campo: 'HORAS_A_PROGRAMAR', tipo: 'Numerico', obligatorio: 'SI', descripcion: 'TC=800, MT=400' },
  { col: 'S', campo: 'FECHA_INGRESO_ESAP', tipo: 'Fecha', obligatorio: 'SI', descripcion: 'DD/MM/AAAA' },
  { col: 'T', campo: 'RESOLUCION_NOMBRAMIENTO', tipo: 'Texto', obligatorio: 'NO', descripcion: 'Numero resolucion' },
  { col: 'U', campo: 'PROGRAMA_PRINCIPAL', tipo: 'Texto', obligatorio: 'NO', descripcion: 'Programa al que esta adscrito' },
  { col: 'V', campo: 'TITULO_PREGRADO', tipo: 'Texto', obligatorio: 'NO', descripcion: 'Titulo de pregrado obtenido' },
  { col: 'W', campo: 'TITULO_POSGRADO_1', tipo: 'Texto', obligatorio: 'NO', descripcion: 'Especializacion/Maestria' },
  { col: 'X', campo: 'TITULO_POSGRADO_2', tipo: 'Texto', obligatorio: 'NO', descripcion: 'Doctorado (si aplica)' },
  { col: 'Y', campo: 'GRUPO_INVESTIGACION', tipo: 'Texto', obligatorio: 'NO', descripcion: 'Nombre del grupo' },
  { col: 'Z', campo: 'CLASIFICACION_COLCIENCIAS', tipo: 'Texto', obligatorio: 'NO', descripcion: 'A1, A, B, C, Reconocido' },
  { col: 'AA', campo: 'ESTADO_ACTIVO', tipo: 'Texto', obligatorio: 'SI', descripcion: 'SI o NO' },
  { col: 'AB', campo: 'FECHA_RETIRO', tipo: 'Fecha', obligatorio: 'NO', descripcion: 'DD/MM/AAAA (solo si NO activo)' },
  { col: 'AC', campo: 'PERIODO_APLICACION', tipo: 'Texto', obligatorio: 'SI', descripcion: '2026-1, 2026-2, etc.' },
  { col: 'AD', campo: 'OBSERVACIONES', tipo: 'Texto', obligatorio: 'NO', descripcion: 'Notas adicionales' },
];

// ═══ Funcion principal de generacion ═══

export function generarPlantillaExcel(tipo: 'docentes' | 'asignaturas' | 'catalogos') {
  try {
    const wb = XLSX.utils.book_new();

    if (tipo === 'docentes') {
      // Hoja 1: DATOS (vacia con headers)
      const datosHeaders = COLUMNAS_DATOS.map(c => c.campo);
      const wsData = XLSX.utils.aoa_to_sheet([datosHeaders]);
      // Set column widths
      wsData['!cols'] = COLUMNAS_DATOS.map(c => ({ wch: Math.max(c.campo.length + 4, 18) }));
      XLSX.utils.book_append_sheet(wb, wsData, 'DATOS');

      // Hoja 2: CATALOGO_TERRITORIALES
      const terData = [
        ['CODIGO', 'NOMBRE_TERRITORIAL', 'CIUDAD_SEDE', 'DEPARTAMENTO'],
        ...TERRITORIALES.map(t => [t.codigo, t.nombre, t.ciudad, t.departamento]),
      ];
      const wsTer = XLSX.utils.aoa_to_sheet(terData);
      wsTer['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 20 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, wsTer, 'CATALOGO_TERRITORIALES');

      // Hoja 3: CATALOGO_VINCULACIONES
      const vinData = [
        ['TIPO', 'SUBTIPO', 'DEDICACIONES_PERMITIDAS', 'APLICA_PTA'],
        ...VINCULACIONES.map(v => [v.tipo, v.subtipo, v.dedicaciones, v.aplica_pta]),
      ];
      const wsVin = XLSX.utils.aoa_to_sheet(vinData);
      wsVin['!cols'] = [{ wch: 18 }, { wch: 50 }, { wch: 22 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsVin, 'CATALOGO_VINCULACIONES');

      // Hoja 4: CATALOGO_ESCALAFONES
      const escData = [
        ['CATEGORIA', 'NIVEL', 'HORAS_BASE_TC', 'HORAS_BASE_MT', 'SALARIO_REFERENCIA', 'REQUISITO_MINIMO'],
        ...ESCALAFONES.map(e => [e.categoria, e.nivel, e.horas_base_tc, e.horas_base_mt, e.salario_referencia, e.requisito_minimo]),
      ];
      const wsEsc = XLSX.utils.aoa_to_sheet(escData);
      wsEsc['!cols'] = [{ wch: 15 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 38 }];
      XLSX.utils.book_append_sheet(wb, wsEsc, 'CATALOGO_ESCALAFONES');

      // Hoja 5: INSTRUCCIONES
      const instrucciones = [
        ['INSTRUCCIONES PARA LLENADO DE PLANTILLA DE CARGA MASIVA - SISTEMA PTA ESAP'],
        [''],
        ['PASO 1: Identifique los codigos de territorial en la hoja CATALOGO_TERRITORIALES'],
        ['PASO 2: Verifique el tipo de vinculacion y dedicacion en CATALOGO_VINCULACIONES'],
        ['PASO 3: Confirme la categoria del escalafon en CATALOGO_ESCALAFONES'],
        ['PASO 4: Diligencie la hoja DATOS siguiendo el formato de cada columna'],
        ['PASO 5: Verifique que todos los campos obligatorios esten completos'],
        ['PASO 6: Guarde el archivo y suba al sistema PTA'],
        [''],
        ['VALIDACIONES AUTOMATICAS (V-01 a V-10):'],
        ['V-01: Documento de identidad unico y obligatorio'],
        ['V-02: Nombre completo obligatorio (Primer apellido + Primer nombre)'],
        ['V-03: Codigo territorial debe existir en catalogo oficial ESAP'],
        ['V-04: Tipo de vinculacion valido (Carrera, Planta, Ocasional)'],
        ['V-05: Horas segun dedicacion (TC=800, MT=400)'],
        ['V-06: Categoria escalafon valida (Instructor, Asistente, Asociado, Titular)'],
        ['V-07: Correo institucional con dominio @esap.edu.co'],
        ['V-08: Periodo de aplicacion en formato correcto (AAAA-S)'],
        ['V-09: Fecha de ingreso anterior a la fecha actual'],
        ['V-10: Estado activo SI o NO (si NO, debe tener fecha retiro)'],
        [''],
        ['FORMATO DE NOMBRE DEL ARCHIVO: DOCENTES_ESAP_[PERIODO].xlsx'],
        ['EJEMPLO: DOCENTES_ESAP_2026-1.xlsx'],
        [''],
        ['TAMAÑO MAXIMO: 10 MB'],
        ['ENCODING: UTF-8'],
        [''],
        ['ESTRUCTURA DETALLADA DE COLUMNAS:'],
        ['COL', 'CAMPO', 'TIPO', 'OBLIGATORIO', 'DESCRIPCION'],
        ...COLUMNAS_DATOS.map(c => [c.col, c.campo, c.tipo, c.obligatorio, c.descripcion]),
      ];
      const wsInst = XLSX.utils.aoa_to_sheet(instrucciones);
      wsInst['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 55 }];
      XLSX.utils.book_append_sheet(wb, wsInst, 'INSTRUCCIONES');

      // Hoja 6: EJEMPLO (3 registros pre-llenados)
      const ejemplo = [
        datosHeaders,
        ['CC', '79123456', 'PEREZ', 'LOPEZ', 'JUAN', 'CARLOS', 'M', '15/03/1975', 'juan.perez@esap.edu.co', 'juanperez@gmail.com', '3101234567', 'SC', 'SEDE CENTRAL', 'Carrera', '1279/2002', 'TC', 'Asociado', 800, '01/02/2010', 'RES-2010-045', 'Administracion Publica', 'Administrador Publico', 'Maestria en Gobierno', '', 'Grupo Estado y Poder', 'A', 'SI', '', '2026-1', ''],
        ['CC', '80234567', 'RODRIGUEZ', 'GOMEZ', 'MARIA', 'ELENA', 'F', '22/07/1968', 'maria.rodriguez@esap.edu.co', '', '3209876543', 'ANT', 'ANTIOQUIA', 'Carrera', '2400/1968', 'TC', 'Titular', 800, '15/08/1998', 'RES-1998-112', 'Ciencia Politica', 'Politologa', 'Doctorado en Ciencias Politicas', '', 'Grupo Politicas Publicas', 'A1', 'SI', '', '2026-1', 'Directora de programa'],
        ['CC', '52431234', 'SUAREZ', 'DIAZ', 'CARMEN', 'JULIA', 'F', '10/11/1980', 'carmen.suarez@esap.edu.co', '', '3157654321', 'CUN', 'CUNDINAMARCA', 'Ocasional', '', 'MT', 'Instructor', 400, '01/02/2024', 'RES-2024-023', 'Administracion Publica', 'Administradora de Empresas', 'Especializacion en Gerencia Publica', '', '', '', 'SI', '', '2026-1', 'Docente ocasional MT'],
      ];
      const wsEj = XLSX.utils.aoa_to_sheet(ejemplo);
      wsEj['!cols'] = COLUMNAS_DATOS.map(c => ({ wch: Math.max(c.campo.length + 2, 16) }));
      XLSX.utils.book_append_sheet(wb, wsEj, 'EJEMPLO');

    } else if (tipo === 'asignaturas') {
      const headers = [
        'CODIGO_ASIGNATURA', 'NOMBRE_ASIGNATURA', 'PROGRAMA', 'NIVEL',
        'CREDITOS', 'HORAS_PRESENCIALES', 'HORAS_INDEPENDIENTES', 'TOTAL_HORAS',
        'NUCLEO_TEMATICO', 'SEMESTRE', 'TIPO', 'PREREQUISITOS', 'CUPO_MAXIMO', 'ESTADO'
      ];
      const wsAsig = XLSX.utils.aoa_to_sheet([headers]);
      wsAsig['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 18) }));
      XLSX.utils.book_append_sheet(wb, wsAsig, 'ASIGNATURAS');

      // Ejemplo
      const ejAsig = [
        headers,
        ['ADM-101', 'Fundamentos de Administracion Publica', 'Administracion Publica', 'Pregrado', 3, 48, 96, 144, 'Formacion Basica', 1, 'Obligatoria', '', 40, 'Activa'],
        ['ADM-401', 'Gerencia Publica', 'Administracion Publica', 'Pregrado', 4, 64, 128, 192, 'Formacion Profesional', 7, 'Obligatoria', 'ADM-301', 35, 'Activa'],
        ['MPA-101', 'Seminario de Investigacion I', 'Maestria en Admin. Publica', 'Posgrado', 3, 48, 96, 144, 'Investigacion', 1, 'Obligatoria', '', 25, 'Activa'],
      ];
      const wsEjAsig = XLSX.utils.aoa_to_sheet(ejAsig);
      wsEjAsig['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 18) }));
      XLSX.utils.book_append_sheet(wb, wsEjAsig, 'EJEMPLO');

    } else {
      // Catalogos
      const wsTer = XLSX.utils.aoa_to_sheet([
        ['CODIGO', 'NOMBRE', 'CIUDAD_SEDE', 'DEPARTAMENTO'],
        ...TERRITORIALES.map(t => [t.codigo, t.nombre, t.ciudad, t.departamento]),
      ]);
      XLSX.utils.book_append_sheet(wb, wsTer, 'TERRITORIALES');

      const wsEsc = XLSX.utils.aoa_to_sheet([
        ['CATEGORIA', 'NIVEL', 'HORAS_TC', 'HORAS_MT'],
        ...ESCALAFONES.map(e => [e.categoria, e.nivel, e.horas_base_tc, e.horas_base_mt]),
      ]);
      XLSX.utils.book_append_sheet(wb, wsEsc, 'ESCALAFONES');

      const wsVin = XLSX.utils.aoa_to_sheet([
        ['TIPO', 'SUBTIPO', 'DEDICACIONES', 'APLICA_PTA'],
        ...VINCULACIONES.map(v => [v.tipo, v.subtipo, v.dedicaciones, v.aplica_pta]),
      ]);
      XLSX.utils.book_append_sheet(wb, wsVin, 'VINCULACIONES');
    }

    // Generate and download
    const nombre = tipo === 'docentes' ? 'DOCENTES_ESAP_2026-1'
      : tipo === 'asignaturas' ? 'ASIGNATURAS_ESAP_2026-1'
      : 'CATALOGOS_MAESTROS_ESAP';
    XLSX.writeFile(wb, `${nombre}.xlsx`);

    toast.success(`Plantilla ${tipo} descargada exitosamente`, {
      description: tipo === 'docentes'
        ? '6 hojas: DATOS (30 columnas), CATALOGO_TERRITORIALES, CATALOGO_VINCULACIONES, CATALOGO_ESCALAFONES, INSTRUCCIONES, EJEMPLO'
        : tipo === 'asignaturas'
        ? '2 hojas: ASIGNATURAS (14 columnas), EJEMPLO'
        : '3 hojas: TERRITORIALES, ESCALAFONES, VINCULACIONES',
      duration: 6000,
    });
  } catch (error) {
    console.error('Error generating Excel template:', error);
    toast.error('Error al generar la plantilla Excel');
  }
}
