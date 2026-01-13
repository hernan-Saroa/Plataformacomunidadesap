/**
 * BASE DE DATOS COMPLETA DE DOCENTES ESAP - 30 DOCENTES (REDUCIDO PARA PRUEBAS)
 * 
 * Período: 2025-1 (Actualizado: Diciembre 2024)
 * Fuente: Base_Datos_Docentes_ESAP.md
 * 
 * Todos los docentes transformados a formato UserWithSedes
 * para integración directa con módulo de personas
 * 
 * OPTIMIZADO: Reducido de 263 a 30 docentes para pruebas
 */

import { UserWithSedes } from './mockUsersWithSedes';

// Mapeo de territoriales a códigos de sede
const TERRITORIAL_MAP: { [key: string]: { id: string, codigo: string, nombre: string, ciudad: string } } = {
  'SEDE_CENTRAL': { id: 'sede-nacional', codigo: 'ESAP-NAC', nombre: 'Sede Nacional', ciudad: 'Bogotá D.C.' },
  'ANTIOQUIA': { id: 'ter-antioquia', codigo: 'ESAP-ANT', nombre: 'Territorial Antioquia', ciudad: 'Medellín' },
  'ATLÁNTICO': { id: 'ter-atlantico', codigo: 'ESAP-ATL', nombre: 'Territorial Atlántico', ciudad: 'Barranquilla' },
  'BOLÍVAR': { id: 'ter-bolivar', codigo: 'ESAP-BOL', nombre: 'Territorial Bolívar', ciudad: 'Cartagena' },
  'BOYACÁ': { id: 'ter-boyaca', codigo: 'ESAP-BOY', nombre: 'Territorial Boyacá', ciudad: 'Tunja' },
  'CALDAS': { id: 'ter-caldas', codigo: 'ESAP-CAL', nombre: 'Territorial Caldas', ciudad: 'Manizales' },
  'CAUCA': { id: 'ter-cauca', codigo: 'ESAP-CAU', nombre: 'Territorial Cauca', ciudad: 'Popayán' },
  'VALLE': { id: 'ter-valle', codigo: 'ESAP-VAL', nombre: 'Territorial Valle del Cauca', ciudad: 'Cali' },
  'SANTANDER': { id: 'ter-santander', codigo: 'ESAP-SAN', nombre: 'Territorial Santander', ciudad: 'Bucaramanga' },
  'NARIÑO': { id: 'ter-narino', codigo: 'ESAP-NAR', nombre: 'Territorial Nariño', ciudad: 'Pasto' },
};

// Datos brutos de docentes (nombre, territorial, categoría, formación, vinculación)
// REDUCIDO A 30 DOCENTES REPRESENTATIVOS
const DOCENTES_RAW = [
  // ANTIOQUIA (3 docentes)
  ['BELTRAN DE JESUS RESTREPO ARREDONDO', 'ANTIOQUIA', 'Titular', 'Maestría', 'Ocasional'],
  ['DELIO ALEXANDER BALCAZAR CAMACHO', 'ANTIOQUIA', 'Asociado', 'Doctorado', 'Carrera2'],
  ['DIEGO ARMANDO JURADO ZAMBRANO', 'ANTIOQUIA', 'Asistente', 'Maestría', 'Carrera2'],

  // ATLÁNTICO (4 docentes)
  ['ALVARO LUIS MERCADO SUAREZ', 'ATLÁNTICO', 'Auxiliar', 'Maestría', 'Periodo de Prueba'],
  ['ANTONIO YESID PEDROZA ESTRADA', 'ATLÁNTICO', 'Titular', 'Doctorado', 'Ocasional'],
  ['CLARA INES COLLAZOS MARTINEZ', 'ATLÁNTICO', 'Titular', 'Maestría', 'Ocasional'],
  ['EDWIN MANUEL TAPIA GONGORA', 'ATLÁNTICO', 'Asistente', 'Maestría', 'Carrera2'],

  // BOLÍVAR (2 docentes)
  ['CARLOS ALBERTO ZULUAGA DIAZ', 'BOLÍVAR', 'Asociado', 'Maestría', 'Carrera2'],
  ['MARIA FERNANDA GARCIA LOPEZ', 'BOLÍVAR', 'Titular', 'Doctorado', 'Carrera2'],

  // BOYACÁ (3 docentes)
  ['ANDREA MILENA ROJAS GUTIERREZ', 'BOYACÁ', 'Asistente', 'Maestría', 'Carrera2'],
  ['JORGE ENRIQUE MORENO SANTOS', 'BOYACÁ', 'Asociado', 'Doctorado', 'Ocasional'],
  ['LUISA FERNANDA VARGAS PEREZ', 'BOYACÁ', 'Titular', 'Maestría', 'Carrera2'],

  // CALDAS (2 docentes)
  ['RICARDO ANDRES MARTINEZ GOMEZ', 'CALDAS', 'Asociado', 'Maestría', 'Carrera2'],
  ['SANDRA PATRICIA LOPEZ RAMIREZ', 'CALDAS', 'Titular', 'Doctorado', 'Ocasional'],

  // CAUCA (2 docentes)
  ['MIGUEL ANGEL RODRIGUEZ CRUZ', 'CAUCA', 'Asistente', 'Maestría', 'Carrera2'],
  ['DIANA CAROLINA HERRERA SILVA', 'CAUCA', 'Asociado', 'Doctorado', 'Carrera2'],

  // VALLE (4 docentes)
  ['JUAN PABLO ORTIZ MENDOZA', 'VALLE', 'Titular', 'Doctorado', 'Carrera2'],
  ['CLAUDIA MARCELA TORRES DIAZ', 'VALLE', 'Asociado', 'Maestría', 'Ocasional'],
  ['ANDRES FELIPE GOMEZ RIVAS', 'VALLE', 'Asistente', 'Maestría', 'Carrera2'],
  ['NATALIA ANDREA SUAREZ PARRA', 'VALLE', 'Titular', 'Doctorado', 'Carrera2'],

  // SANTANDER (3 docentes)
  ['ROBERTO CARLOS JIMENEZ MORA', 'SANTANDER', 'Asociado', 'Maestría', 'Carrera2'],
  ['PAOLA ANDREA GARCIA RUIZ', 'SANTANDER', 'Titular', 'Doctorado', 'Ocasional'],
  ['FERNANDO JOSE LOPEZ CASTRO', 'SANTANDER', 'Asistente', 'Maestría', 'Carrera2'],

  // NARIÑO (2 docentes)
  ['ALEJANDRO DAVID PEREZ GOMEZ', 'NARIÑO', 'Asociado', 'Maestría', 'Carrera2'],
  ['MONICA PATRICIA RAMIREZ TORRES', 'NARIÑO', 'Titular', 'Doctorado', 'Carrera2'],

  // SEDE CENTRAL (5 docentes)
  ['ANA MARIA RODRIGUEZ SANTOS', 'SEDE_CENTRAL', 'Titular', 'Doctorado', 'Carrera2'],
  ['CARLOS EDUARDO MARTINEZ LOPEZ', 'SEDE_CENTRAL', 'Asociado', 'Maestría', 'Ocasional'],
  ['DIANA PAOLA GOMEZ HERRERA', 'SEDE_CENTRAL', 'Titular', 'Doctorado', 'Carrera2'],
  ['JAVIER ANDRES DIAZ MORENO', 'SEDE_CENTRAL', 'Asistente', 'Maestría', 'Carrera2'],
  ['LAURA CRISTINA VARGAS SILVA', 'SEDE_CENTRAL', 'Asociado', 'Doctorado', 'Ocasional'],
];

// Funciones utilitarias
function generarEmail(nombre: string): string {
  const partes = nombre.toLowerCase().split(' ').filter(p => p.length > 2);
  if (partes.length >= 2) {
    return `${partes[0]}.${partes[partes.length - 1]}@esap.edu.co`.replace(/ñ/g, 'n');
  }
  return `${partes[0]}@esap.edu.co`.replace(/ñ/g, 'n');
}

function splitNombre(nombreCompleto: string): { firstName: string, lastName: string } {
  const partes = nombreCompleto.split(' ');
  if (partes.length <= 2) {
    return { firstName: partes[0], lastName: partes[1] || partes[0] };
  }
  const mitad = Math.ceil(partes.length / 2);
  return {
    firstName: partes.slice(0, mitad).join(' '),
    lastName: partes.slice(mitad).join(' ')
  };
}

function generarDocumento(index: number): string {
  const base = 10000000 + index * 137;
  return base.toString();
}

function generarTelefono(index: number): string {
  const prefijos = ['300', '301', '310', '311', '312', '313', '314', '315', '316', '317', '318', '319', '320', '321'];
  const prefijo = prefijos[index % prefijos.length];
  const numero = (2000000 + index * 1234) % 10000000;
  return `+57 ${prefijo} ${numero.toString().padStart(7, '0')}`;
}

function generarFechaNacimiento(index: number): string {
  const year = 1960 + (index % 30);
  const month = (index % 12) + 1;
  const day = (index % 28) + 1;
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function obtenerRolPorCategoria(categoria: string): { id: string, name: string, code: string } {
  const roles: any = {
    'Titular': { id: 'role-titular', name: 'Docente Titular', code: 'DOC_TITULAR' },
    'Asociado': { id: 'role-asociado', name: 'Docente Asociado', code: 'DOC_ASOCIADO' },
    'Asistente': { id: 'role-asistente', name: 'Docente Asistente', code: 'DOC_ASISTENTE' },
    'Auxiliar': { id: 'role-auxiliar', name: 'Docente Auxiliar', code: 'DOC_AUXILIAR' },
    'Visitante': { id: 'role-visitante', name: 'Docente Visitante', code: 'DOC_VISITANTE' },
  };
  return roles[categoria] || roles['Asistente'];
}

// Generar todos los docentes
export const TODOS_LOS_DOCENTES_ESAP: UserWithSedes[] = DOCENTES_RAW.map((docente, index) => {
  const [nombre, territorial, categoria, formacion, vinculacion] = docente;
  const { firstName, lastName } = splitNombre(nombre);
  const terrInfo = TERRITORIAL_MAP[territorial];
  const nivelSede = territorial === 'SEDE_CENTRAL' ? 'sede-central' : 'territorial';

  return {
    id: `doc-${(index + 1).toString().padStart(3, '0')}`,
    personId: `person-doc-${(index + 1).toString().padStart(3, '0')}`,
    firstName,
    lastName,
    email: generarEmail(nombre),
    phone: generarTelefono(index),
    status: 'active' as const,
    roles: [
      { 
        id: 'role-docente', 
        name: 'Docente', 
        code: 'DOCENTE',
        alcance: nivelSede === 'sede-central' ? 'nacional' : 'territorial',
        unidadOrganizacionalId: terrInfo.id
      },
      obtenerRolPorCategoria(categoria)
    ],
    location: terrInfo.ciudad,
    sedes: [{
      id: terrInfo.id,
      codigo: terrInfo.codigo,
      nombre: terrInfo.nombre,
      nivel: nivelSede,
      esPrincipal: true
    }],
    enrollmentMethod: 'manual' as const,
    enrollmentDate: '2024-01-15',
    lastLogin: `2024-12-${(index % 28) + 1}T${(index % 24).toString().padStart(2, '0')}:${(index % 60).toString().padStart(2, '0')}:00`,
    documentType: 'CC',
    documentNumber: generarDocumento(index),
    document: generarDocumento(index),
    birthDate: generarFechaNacimiento(index),
    address: `Calle ${(index % 100) + 1} #${(index % 50) + 10}-${(index % 90) + 10}, ${terrInfo.ciudad}`
  };
});

export const TOTAL_DOCENTES_ESAP = TODOS_LOS_DOCENTES_ESAP.length;