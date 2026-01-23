/**
 * OFERTA ACADÉMICA ESAP
 * Datos de ejemplo para demostración
 */

export interface ProgramaAcademico {
  id: string;
  codigo: string;
  nombre: string;
  nivelFormacion: 'Pregrado' | 'Especialización' | 'Maestría' | 'Doctorado';
  modalidad: 'Presencial' | 'Virtual' | 'Mixta';
  duracion: string;
  creditos: number;
  snies?: string;
  estado: 'Activo' | 'Inactivo';
  sedesDisponibles: string[];
}

export interface SedeESAP {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'Sede Central' | 'Territorial' | 'CETAP';
  ciudad: string;
  departamento: string;
  direccion?: string;
  programasOfrecidos: string[];
}

// Datos de ejemplo para demostración
export const PROGRAMAS_ESAP: ProgramaAcademico[] = [
  {
    id: 'PROG-001',
    codigo: 'APT-001',
    nombre: 'Administración Pública Territorial',
    nivelFormacion: 'Pregrado',
    modalidad: 'Presencial',
    duracion: '10 semestres',
    creditos: 160,
    snies: '1234',
    estado: 'Activo',
    sedesDisponibles: ['SEDE-001', 'TERR-ANT', 'TERR-VAL', 'TERR-SAN']
  },
  {
    id: 'PROG-002',
    codigo: 'ESP-GP-001',
    nombre: 'Especialización en Gestión Pública',
    nivelFormacion: 'Especialización',
    modalidad: 'Virtual',
    duracion: '2 semestres',
    creditos: 30,
    snies: '5678',
    estado: 'Activo',
    sedesDisponibles: ['SEDE-001', 'TERR-ANT', 'TERR-VAL', 'TERR-SAN', 'TERR-ATL']
  },
  {
    id: 'PROG-003',
    codigo: 'ESP-AG-001',
    nombre: 'Especialización en Alta Gerencia',
    nivelFormacion: 'Especialización',
    modalidad: 'Mixta',
    duracion: '2 semestres',
    creditos: 32,
    snies: '9101',
    estado: 'Activo',
    sedesDisponibles: ['SEDE-001', 'TERR-ANT', 'TERR-VAL']
  },
  {
    id: 'PROG-004',
    codigo: 'MAE-AP-001',
    nombre: 'Maestría en Administración Pública',
    nivelFormacion: 'Maestría',
    modalidad: 'Presencial',
    duracion: '4 semestres',
    creditos: 48,
    snies: '1121',
    estado: 'Activo',
    sedesDisponibles: ['SEDE-001', 'TERR-ANT']
  },
  {
    id: 'PROG-005',
    codigo: 'TEC-GP-001',
    nombre: 'Tecnología en Gestión Pública',
    nivelFormacion: 'Pregrado',
    modalidad: 'Virtual',
    duracion: '6 semestres',
    creditos: 96,
    snies: '3141',
    estado: 'Activo',
    sedesDisponibles: ['SEDE-001', 'CETAP-FUN', 'CETAP-GIR', 'TERR-ANT', 'TERR-VAL']
  },
  {
    id: 'PROG-006',
    codigo: 'ESP-GPT-001',
    nombre: 'Especialización en Gestión Pública Territorial',
    nivelFormacion: 'Especialización',
    modalidad: 'Presencial',
    duracion: '2 semestres',
    creditos: 30,
    snies: '5161',
    estado: 'Activo',
    sedesDisponibles: ['SEDE-001', 'TERR-ANT', 'TERR-VAL', 'TERR-SAN']
  }
];

export const SEDES_ESAP: SedeESAP[] = [
  {
    id: 'SEDE-001',
    codigo: 'SC-BOG',
    nombre: 'Sede Central Bogotá',
    tipo: 'Sede Central',
    ciudad: 'Bogotá D.C.',
    departamento: 'Cundinamarca',
    direccion: 'Calle 44 # 53-37, Bogotá D.C.',
    programasOfrecidos: ['PROG-001', 'PROG-002', 'PROG-003', 'PROG-004', 'PROG-005', 'PROG-006']
  },
  {
    id: 'TERR-ANT',
    codigo: 'T-ANT',
    nombre: 'Territorial Antioquia',
    tipo: 'Territorial',
    ciudad: 'Medellín',
    departamento: 'Antioquia',
    direccion: 'Carrera 52 # 42-23, Medellín',
    programasOfrecidos: ['PROG-001', 'PROG-002', 'PROG-003', 'PROG-004', 'PROG-005', 'PROG-006']
  },
  {
    id: 'TERR-VAL',
    codigo: 'T-VAL',
    nombre: 'Territorial Valle del Cauca',
    tipo: 'Territorial',
    ciudad: 'Cali',
    departamento: 'Valle del Cauca',
    direccion: 'Calle 13 # 100-32, Cali',
    programasOfrecidos: ['PROG-001', 'PROG-002', 'PROG-003', 'PROG-005', 'PROG-006']
  },
  {
    id: 'TERR-SAN',
    codigo: 'T-SAN',
    nombre: 'Territorial Santander',
    tipo: 'Territorial',
    ciudad: 'Bucaramanga',
    departamento: 'Santander',
    direccion: 'Carrera 27 # 38-45, Bucaramanga',
    programasOfrecidos: ['PROG-001', 'PROG-002', 'PROG-006']
  },
  {
    id: 'TERR-ATL',
    codigo: 'T-ATL',
    nombre: 'Territorial Atlántico',
    tipo: 'Territorial',
    ciudad: 'Barranquilla',
    departamento: 'Atlántico',
    direccion: 'Calle 72 # 54-30, Barranquilla',
    programasOfrecidos: ['PROG-001', 'PROG-002']
  },
  {
    id: 'CETAP-FUN',
    codigo: 'C-FUN',
    nombre: 'CETAP Funza',
    tipo: 'CETAP',
    ciudad: 'Funza',
    departamento: 'Cundinamarca',
    direccion: 'Zona Industrial Funza',
    programasOfrecidos: ['PROG-005']
  },
  {
    id: 'CETAP-GIR',
    codigo: 'C-GIR',
    nombre: 'CETAP Girardot',
    tipo: 'CETAP',
    ciudad: 'Girardot',
    departamento: 'Cundinamarca',
    direccion: 'Carrera 20 # 15-30, Girardot',
    programasOfrecidos: ['PROG-005']
  }
];
