import { Injectable } from '@nestjs/common';

export interface Territorial {
  id: string;
  nombre: string;
}

export interface CETAP {
  id: string;
  nombre: string;
  territorialId: string;
}

export interface ProgramaAcademico {
  id: string;
  nombre: string;
  codigo: string;
}

@Injectable()
export class DatosMaestrosService {
  // Datos mock por ahora - en producción vendrían de base de datos
  private territoriales: Territorial[] = [
    { id: 'bog', nombre: 'Bogotá' },
    { id: 'med', nombre: 'Medellín' },
    { id: 'cal', nombre: 'Cali' },
    { id: 'bar', nombre: 'Barranquilla' },
    { id: 'buc', nombre: 'Bucaramanga' },
    { id: 'car', nombre: 'Cartagena' },
    { id: 'pas', nombre: 'Pasto' },
    { id: 'man', nombre: 'Manizales' },
    { id: 'iba', nombre: 'Ibagué' },
    { id: 'nev', nombre: 'Neiva' },
  ];

  private cetaps: CETAP[] = [
    // Bogotá
    { id: 'bog-1', nombre: 'CETAP Bogotá Norte', territorialId: 'bog' },
    { id: 'bog-2', nombre: 'CETAP Bogotá Sur', territorialId: 'bog' },
    { id: 'bog-3', nombre: 'CETAP Bogotá Centro', territorialId: 'bog' },
    // Medellín
    { id: 'med-1', nombre: 'CETAP Medellín Oriente', territorialId: 'med' },
    { id: 'med-2', nombre: 'CETAP Medellín Occidente', territorialId: 'med' },
    // Cali
    { id: 'cal-1', nombre: 'CETAP Cali Norte', territorialId: 'cal' },
    { id: 'cal-2', nombre: 'CETAP Cali Sur', territorialId: 'cal' },
    // Barranquilla
    { id: 'bar-1', nombre: 'CETAP Atlántico Norte', territorialId: 'bar' },
    { id: 'bar-2', nombre: 'CETAP Atlántico Sur', territorialId: 'bar' },
    // Bucaramanga
    { id: 'buc-1', nombre: 'CETAP Santander Centro', territorialId: 'buc' },
    // Cartagena
    { id: 'car-1', nombre: 'CETAP Bolívar Centro', territorialId: 'car' },
    // Pasto
    { id: 'pas-1', nombre: 'CETAP Nariño Norte', territorialId: 'pas' },
    // Manizales
    { id: 'man-1', nombre: 'CETAP Caldas Centro', territorialId: 'man' },
    // Ibagué
    { id: 'iba-1', nombre: 'CETAP Tolima Centro', territorialId: 'iba' },
    // Neiva
    { id: 'nev-1', nombre: 'CETAP Huila Centro', territorialId: 'nev' },
  ];

  private programas: ProgramaAcademico[] = [
    { id: 'adm', nombre: 'Administración Pública', codigo: 'ADM' },
    { id: 'con', nombre: 'Contaduría Pública', codigo: 'CON' },
    { id: 'sis', nombre: 'Ingeniería de Sistemas', codigo: 'SIS' },
    { id: 'der', nombre: 'Derecho', codigo: 'DER' },
    { id: 'psi', nombre: 'Psicología', codigo: 'PSI' },
    { id: 'enf', nombre: 'Enfermería', codigo: 'ENF' },
    { id: 'med', nombre: 'Medicina', codigo: 'MED' },
    { id: 'arq', nombre: 'Arquitectura', codigo: 'ARQ' },
    { id: 'ing-civ', nombre: 'Ingeniería Civil', codigo: 'ING-CIV' },
    { id: 'ing-ind', nombre: 'Ingeniería Industrial', codigo: 'ING-IND' },
    { id: 'eco', nombre: 'Economía', codigo: 'ECO' },
    { id: 'com', nombre: 'Comunicación Social', codigo: 'COM' },
    { id: 'tur', nombre: 'Turismo', codigo: 'TUR' },
    { id: 'edu', nombre: 'Educación', codigo: 'EDU' },
    { id: 'dis-ind', nombre: 'Diseño Industrial', codigo: 'DIS-IND' },
  ];

  async getTerritoriales(): Promise<Territorial[]> {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.territoriales;
  }

  async getCETAPs(territorialId?: string): Promise<CETAP[]> {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 150));

    if (territorialId) {
      return this.cetaps.filter(cetap => cetap.territorialId === territorialId);
    }

    return this.cetaps;
  }

  async getProgramasAcademicos(): Promise<ProgramaAcademico[]> {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.programas;
  }
}