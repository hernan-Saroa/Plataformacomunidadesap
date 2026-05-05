/**
 * OFERTA ACADÉMICA ESAP - STUB
 * ⚠️ Datos eliminados para reducir tamaño del proyecto
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

/**
 * STUB: Arrays vacíos - Agregar datos reales cuando se requieran
 */
export const PROGRAMAS_ESAP: ProgramaAcademico[] = [];
export const SEDES_ESAP: SedeESAP[] = [];
