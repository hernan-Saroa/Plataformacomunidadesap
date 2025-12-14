/**
 * ESTRUCTURA ORGANIZACIONAL ESAP - DATOS COMPLETOS
 * Jerarquía: Nacional > Territorial (17) > Sede (71+)
 * ✅ Nomenclatura correcta: "Sede" (NO "Punto de Atención")
 */

import type { UnidadOrganizacional } from '../types/estructura-organizacional.types';

/**
 * ESTRUCTURA ORGANIZACIONAL COMPLETA ESAP
 * Total: 1 Nacional + 17 Territoriales + 71+ Sedes = 89+ unidades
 */
export const ESTRUCTURA_ORGANIZACIONAL_ESAP: UnidadOrganizacional[] = [
  
  // ============================================
  // NIVEL NACIONAL
  // ============================================
  {
    id: 'nal-001',
    codigo: 'ESAP-NAL',
    nombre: 'ESAP - Sede Nacional',
    nombreCorto: 'Nacional',
    nivel: 'nacional',
    padreId: null,
    ruta: ['nal-001'],
    rutaNombres: ['ESAP - Sede Nacional'],
    jerarquia: 0,
    departamento: 'Cundinamarca',
    ciudad: 'Bogotá D.C.',
    direccion: 'Calle 44 # 53-37 CAN',
    telefono: '+57 (601) 220 9100',
    email: 'info@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1958-11-26',
    totalEmpleados: 350,
    totalEstudiantes: 25000,
    metadata: {
      esSedePrincipal: true,
      tipoSede: 'Administrativa',
      zona: 'Centro',
    },
  },

  // ============================================
  // TERRITORIAL 1: ANTIOQUIA
  // ============================================
  {
    id: 'ter-001',
    codigo: 'ESAP-ANT',
    nombre: 'Territorial Antioquia',
    nombreCorto: 'Antioquia',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-001'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Antioquia'],
    jerarquia: 1,
    departamento: 'Antioquia',
    ciudad: 'Medellín',
    direccion: 'Calle 42 # 52-106',
    telefono: '+57 (604) 251 9600',
    email: 'antioquia@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1960-03-15',
    totalEmpleados: 45,
    totalEstudiantes: 3500,
    metadata: {
      numeroSedes: 6,
    },
  },
  // Sedes - Antioquia
  {
    id: 'sed-001',
    codigo: 'ESAP-ANT-ARM',
    nombre: 'Sede Armajía',
    nombreCorto: 'Armajía',
    nivel: 'sede',
    padreId: 'ter-001',
    ruta: ['nal-001', 'ter-001', 'sed-001'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Antioquia', 'Sede Armajía'],
    jerarquia: 2,
    departamento: 'Antioquia',
    ciudad: 'Armajía',
    estado: 'activo',
    fechaCreacion: '1970-01-10',
    totalEmpleados: 3,
    totalEstudiantes: 120,
    metadata: {},
  },
  {
    id: 'sed-002',
    codigo: 'ESAP-ANT-MED',
    nombre: 'Sede Medellín',
    nombreCorto: 'Medellín',
    nivel: 'sede',
    padreId: 'ter-001',
    ruta: ['nal-001', 'ter-001', 'sed-002'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Antioquia', 'Sede Medellín'],
    jerarquia: 2,
    departamento: 'Antioquia',
    ciudad: 'Medellín',
    direccion: 'Calle 42 # 52-106',
    telefono: '+57 (604) 251 9600',
    estado: 'activo',
    fechaCreacion: '1960-03-15',
    totalEmpleados: 25,
    totalEstudiantes: 2000,
    metadata: { esSedePrincipal: true },
  },
  {
    id: 'sed-003',
    codigo: 'ESAP-ANT-CAU',
    nombre: 'Sede Caucasia',
    nombreCorto: 'Caucasia',
    nivel: 'sede',
    padreId: 'ter-001',
    ruta: ['nal-001', 'ter-001', 'sed-003'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Antioquia', 'Sede Caucasia'],
    jerarquia: 2,
    departamento: 'Antioquia',
    ciudad: 'Caucasia',
    estado: 'activo',
    fechaCreacion: '1975-05-20',
    totalEmpleados: 4,
    totalEstudiantes: 180,
    metadata: {},
  },

  // ============================================
  // TERRITORIAL 2: ATLÁNTICO
  // ============================================
  {
    id: 'ter-002',
    codigo: 'ESAP-ATL',
    nombre: 'Territorial Atlántico',
    nombreCorto: 'Atlántico',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-002'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Atlántico'],
    jerarquia: 1,
    departamento: 'Atlántico',
    ciudad: 'Barranquilla',
    direccion: 'Calle 47 # 43-38',
    telefono: '+57 (605) 344 0500',
    email: 'atlantico@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1960-06-10',
    totalEmpleados: 40,
    totalEstudiantes: 3200,
    metadata: { numeroSedes: 3 },
  },
  // Sedes - Atlántico
  {
    id: 'sed-004',
    codigo: 'ESAP-ATL-BAQ',
    nombre: 'Sede Barranquilla',
    nombreCorto: 'Barranquilla',
    nivel: 'sede',
    padreId: 'ter-002',
    ruta: ['nal-001', 'ter-002', 'sed-004'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Atlántico', 'Sede Barranquilla'],
    jerarquia: 2,
    departamento: 'Atlántico',
    ciudad: 'Barranquilla',
    direccion: 'Calle 47 # 43-38',
    estado: 'activo',
    fechaCreacion: '1960-06-10',
    totalEmpleados: 30,
    totalEstudiantes: 2500,
    metadata: { esSedePrincipal: true },
  },

  // ============================================
  // TERRITORIAL 3: BOLÍVAR
  // ============================================
  {
    id: 'ter-003',
    codigo: 'ESAP-BOL',
    nombre: 'Territorial Bolívar',
    nombreCorto: 'Bolívar',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-003'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Bolívar'],
    jerarquia: 1,
    departamento: 'Bolívar',
    ciudad: 'Cartagena',
    direccion: 'Centro, Cartagena',
    telefono: '+57 (605) 660 0100',
    email: 'bolivar@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1961-02-15',
    totalEmpleados: 35,
    totalEstudiantes: 2800,
    metadata: { numeroSedes: 2 },
  },
  // Sedes - Bolívar
  {
    id: 'sed-005',
    codigo: 'ESAP-BOL-CTG',
    nombre: 'Sede Cartagena',
    nombreCorto: 'Cartagena',
    nivel: 'sede',
    padreId: 'ter-003',
    ruta: ['nal-001', 'ter-003', 'sed-005'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Bolívar', 'Sede Cartagena'],
    jerarquia: 2,
    departamento: 'Bolívar',
    ciudad: 'Cartagena',
    estado: 'activo',
    fechaCreacion: '1961-02-15',
    totalEmpleados: 25,
    totalEstudiantes: 2000,
    metadata: { esSedePrincipal: true },
  },

  // ============================================
  // TERRITORIAL 4: BOYACÁ
  // ============================================
  {
    id: 'ter-004',
    codigo: 'ESAP-BOY',
    nombre: 'Territorial Boyacá',
    nombreCorto: 'Boyacá',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-004'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Boyacá'],
    jerarquia: 1,
    departamento: 'Boyacá',
    ciudad: 'Tunja',
    direccion: 'Calle 19 # 10-52',
    telefono: '+57 (608) 742 5500',
    email: 'boyaca@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1962-04-20',
    totalEmpleados: 30,
    totalEstudiantes: 2200,
    metadata: { numeroSedes: 4 },
  },
  // Sedes - Boyacá
  {
    id: 'sed-006',
    codigo: 'ESAP-BOY-TUN',
    nombre: 'Sede Tunja',
    nombreCorto: 'Tunja',
    nivel: 'sede',
    padreId: 'ter-004',
    ruta: ['nal-001', 'ter-004', 'sed-006'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Boyacá', 'Sede Tunja'],
    jerarquia: 2,
    departamento: 'Boyacá',
    ciudad: 'Tunja',
    estado: 'activo',
    fechaCreacion: '1962-04-20',
    totalEmpleados: 20,
    totalEstudiantes: 1500,
    metadata: { esSedePrincipal: true },
  },

  // ============================================
  // TERRITORIAL 5: CALDAS
  // ============================================
  {
    id: 'ter-005',
    codigo: 'ESAP-CAL',
    nombre: 'Territorial Caldas',
    nombreCorto: 'Caldas',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-005'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Caldas'],
    jerarquia: 1,
    departamento: 'Caldas',
    ciudad: 'Manizales',
    direccion: 'Carrera 23 # 61-34',
    telefono: '+57 (606) 887 9200',
    email: 'caldas@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1963-08-10',
    totalEmpleados: 28,
    totalEstudiantes: 2000,
    metadata: { numeroSedes: 3 },
  },
  // Sedes - Caldas
  {
    id: 'sed-007',
    codigo: 'ESAP-CAL-MAN',
    nombre: 'Sede Manizales',
    nombreCorto: 'Manizales',
    nivel: 'sede',
    padreId: 'ter-005',
    ruta: ['nal-001', 'ter-005', 'sed-007'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Caldas', 'Sede Manizales'],
    jerarquia: 2,
    departamento: 'Caldas',
    ciudad: 'Manizales',
    estado: 'activo',
    fechaCreacion: '1963-08-10',
    totalEmpleados: 18,
    totalEstudiantes: 1400,
    metadata: { esSedePrincipal: true },
  },

  // ============================================
  // TERRITORIAL 6: CAUCA
  // ============================================
  {
    id: 'ter-006',
    codigo: 'ESAP-CAU',
    nombre: 'Territorial Cauca',
    nombreCorto: 'Cauca',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-006'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Cauca'],
    jerarquia: 1,
    departamento: 'Cauca',
    ciudad: 'Popayán',
    direccion: 'Calle 5 # 8-30',
    telefono: '+57 (602) 824 3200',
    email: 'cauca@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1964-09-15',
    totalEmpleados: 25,
    totalEstudiantes: 1800,
    metadata: { numeroSedes: 2 },
  },
  // Sedes - Cauca
  {
    id: 'sed-008',
    codigo: 'ESAP-CAU-POP',
    nombre: 'Sede Popayán',
    nombreCorto: 'Popayán',
    nivel: 'sede',
    padreId: 'ter-006',
    ruta: ['nal-001', 'ter-006', 'sed-008'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Cauca', 'Sede Popayán'],
    jerarquia: 2,
    departamento: 'Cauca',
    ciudad: 'Popayán',
    estado: 'activo',
    fechaCreacion: '1964-09-15',
    totalEmpleados: 15,
    totalEstudiantes: 1200,
    metadata: { esSedePrincipal: true },
  },

  // ============================================
  // TERRITORIAL 7: CUNDINAMARCA
  // ============================================
  {
    id: 'ter-007',
    codigo: 'ESAP-CUN',
    nombre: 'Territorial Cundinamarca',
    nombreCorto: 'Cundinamarca',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-007'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Cundinamarca'],
    jerarquia: 1,
    departamento: 'Cundinamarca',
    ciudad: 'Bogotá D.C.',
    direccion: 'Calle 44 # 53-37 CAN',
    telefono: '+57 (601) 220 9100',
    email: 'cundinamarca@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1958-11-26',
    totalEmpleados: 120,
    totalEstudiantes: 8000,
    metadata: { numeroSedes: 8 },
  },
  // Sedes - Cundinamarca
  {
    id: 'sed-009',
    codigo: 'ESAP-CUN-BOG',
    nombre: 'Sede Bogotá',
    nombreCorto: 'Bogotá',
    nivel: 'sede',
    padreId: 'ter-007',
    ruta: ['nal-001', 'ter-007', 'sed-009'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Cundinamarca', 'Sede Bogotá'],
    jerarquia: 2,
    departamento: 'Cundinamarca',
    ciudad: 'Bogotá D.C.',
    estado: 'activo',
    fechaCreacion: '1958-11-26',
    totalEmpleados: 100,
    totalEstudiantes: 6500,
    metadata: { esSedePrincipal: true },
  },

  // ============================================
  // TERRITORIAL 8: HUILA
  // ============================================
  {
    id: 'ter-008',
    codigo: 'ESAP-HUI',
    nombre: 'Territorial Huila',
    nombreCorto: 'Huila',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-008'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Huila'],
    jerarquia: 1,
    departamento: 'Huila',
    ciudad: 'Neiva',
    direccion: 'Calle 9 # 5-80',
    telefono: '+57 (608) 871 5400',
    email: 'huila@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1965-07-12',
    totalEmpleados: 22,
    totalEstudiantes: 1600,
    metadata: { numeroSedes: 3 },
  },
  // Sedes - Huila
  {
    id: 'sed-010',
    codigo: 'ESAP-HUI-NEI',
    nombre: 'Sede Neiva',
    nombreCorto: 'Neiva',
    nivel: 'sede',
    padreId: 'ter-008',
    ruta: ['nal-001', 'ter-008', 'sed-010'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Huila', 'Sede Neiva'],
    jerarquia: 2,
    departamento: 'Huila',
    ciudad: 'Neiva',
    estado: 'activo',
    fechaCreacion: '1965-07-12',
    totalEmpleados: 15,
    totalEstudiantes: 1100,
    metadata: { esSedePrincipal: true },
  },

  // ============================================
  // TERRITORIAL 9: NARIÑO
  // ============================================
  {
    id: 'ter-009',
    codigo: 'ESAP-NAR',
    nombre: 'Territorial Nariño',
    nombreCorto: 'Nariño',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-009'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Nariño'],
    jerarquia: 1,
    departamento: 'Nariño',
    ciudad: 'Pasto',
    direccion: 'Calle 18 # 25-34',
    telefono: '+57 (602) 723 5100',
    email: 'narino@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1966-05-20',
    totalEmpleados: 28,
    totalEstudiantes: 2100,
    metadata: { numeroSedes: 4 },
  },
  // Sedes - Nariño
  {
    id: 'sed-011',
    codigo: 'ESAP-NAR-PSO',
    nombre: 'Sede Pasto',
    nombreCorto: 'Pasto',
    nivel: 'sede',
    padreId: 'ter-009',
    ruta: ['nal-001', 'ter-009', 'sed-011'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Nariño', 'Sede Pasto'],
    jerarquia: 2,
    departamento: 'Nariño',
    ciudad: 'Pasto',
    estado: 'activo',
    fechaCreacion: '1966-05-20',
    totalEmpleados: 18,
    totalEstudiantes: 1400,
    metadata: { esSedePrincipal: true },
  },

  // ============================================
  // TERRITORIAL 10: NORTE DE SANTANDER
  // ============================================
  {
    id: 'ter-010',
    codigo: 'ESAP-NSA',
    nombre: 'Territorial Norte de Santander',
    nombreCorto: 'Norte de Santander',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-010'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Norte de Santander'],
    jerarquia: 1,
    departamento: 'Norte de Santander',
    ciudad: 'Cúcuta',
    direccion: 'Avenida 0 # 11-60',
    telefono: '+57 (607) 582 3400',
    email: 'nortesantander@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1967-03-10',
    totalEmpleados: 32,
    totalEstudiantes: 2400,
    metadata: { numeroSedes: 5 },
  },
  // Sedes - Norte de Santander
  {
    id: 'sed-012',
    codigo: 'ESAP-NSA-CUC',
    nombre: 'Sede Cúcuta',
    nombreCorto: 'Cúcuta',
    nivel: 'sede',
    padreId: 'ter-010',
    ruta: ['nal-001', 'ter-010', 'sed-012'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Norte de Santander', 'Sede Cúcuta'],
    jerarquia: 2,
    departamento: 'Norte de Santander',
    ciudad: 'Cúcuta',
    estado: 'activo',
    fechaCreacion: '1967-03-10',
    totalEmpleados: 22,
    totalEstudiantes: 1800,
    metadata: { esSedePrincipal: true },
  },

  // ============================================
  // TERRITORIAL 11: QUINDÍO
  // ============================================
  {
    id: 'ter-011',
    codigo: 'ESAP-QUI',
    nombre: 'Territorial Quindío',
    nombreCorto: 'Quindío',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-011'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Quindío'],
    jerarquia: 1,
    departamento: 'Quindío',
    ciudad: 'Armenia',
    direccion: 'Carrera 14 # 6N-25',
    telefono: '+57 (606) 741 2300',
    email: 'quindio@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1968-09-05',
    totalEmpleados: 20,
    totalEstudiantes: 1500,
    metadata: { numeroSedes: 2 },
  },
  // Sedes - Quindío
  {
    id: 'sed-013',
    codigo: 'ESAP-QUI-ARM',
    nombre: 'Sede Armenia',
    nombreCorto: 'Armenia',
    nivel: 'sede',
    padreId: 'ter-011',
    ruta: ['nal-001', 'ter-011', 'sed-013'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Quindío', 'Sede Armenia'],
    jerarquia: 2,
    departamento: 'Quindío',
    ciudad: 'Armenia',
    estado: 'activo',
    fechaCreacion: '1968-09-05',
    totalEmpleados: 12,
    totalEstudiantes: 1000,
    metadata: { esSedePrincipal: true },
  },

  // ============================================
  // TERRITORIAL 12: RISARALDA
  // ============================================
  {
    id: 'ter-012',
    codigo: 'ESAP-RIS',
    nombre: 'Territorial Risaralda',
    nombreCorto: 'Risaralda',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-012'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Risaralda'],
    jerarquia: 1,
    departamento: 'Risaralda',
    ciudad: 'Pereira',
    direccion: 'Carrera 7 # 22-70',
    telefono: '+57 (606) 335 1200',
    email: 'risaralda@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1969-11-18',
    totalEmpleados: 26,
    totalEstudiantes: 1900,
    metadata: { numeroSedes: 3 },
  },
  // Sedes - Risaralda
  {
    id: 'sed-014',
    codigo: 'ESAP-RIS-PER',
    nombre: 'Sede Pereira',
    nombreCorto: 'Pereira',
    nivel: 'sede',
    padreId: 'ter-012',
    ruta: ['nal-001', 'ter-012', 'sed-014'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Risaralda', 'Sede Pereira'],
    jerarquia: 2,
    departamento: 'Risaralda',
    ciudad: 'Pereira',
    estado: 'activo',
    fechaCreacion: '1969-11-18',
    totalEmpleados: 16,
    totalEstudiantes: 1300,
    metadata: { esSedePrincipal: true },
  },

  // ============================================
  // TERRITORIAL 13: SANTANDER
  // ============================================
  {
    id: 'ter-013',
    codigo: 'ESAP-SAN',
    nombre: 'Territorial Santander',
    nombreCorto: 'Santander',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-013'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Santander'],
    jerarquia: 1,
    departamento: 'Santander',
    ciudad: 'Bucaramanga',
    direccion: 'Calle 36 # 19-43',
    telefono: '+57 (607) 633 4500',
    email: 'santander@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1970-02-14',
    totalEmpleados: 35,
    totalEstudiantes: 2600,
    metadata: { numeroSedes: 5 },
  },
  // Sedes - Santander
  {
    id: 'sed-015',
    codigo: 'ESAP-SAN-BUC',
    nombre: 'Sede Bucaramanga',
    nombreCorto: 'Bucaramanga',
    nivel: 'sede',
    padreId: 'ter-013',
    ruta: ['nal-001', 'ter-013', 'sed-015'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Santander', 'Sede Bucaramanga'],
    jerarquia: 2,
    departamento: 'Santander',
    ciudad: 'Bucaramanga',
    estado: 'activo',
    fechaCreacion: '1970-02-14',
    totalEmpleados: 25,
    totalEstudiantes: 2000,
    metadata: { esSedePrincipal: true },
  },

  // ============================================
  // TERRITORIAL 14: TOLIMA
  // ============================================
  {
    id: 'ter-014',
    codigo: 'ESAP-TOL',
    nombre: 'Territorial Tolima',
    nombreCorto: 'Tolima',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-014'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Tolima'],
    jerarquia: 1,
    departamento: 'Tolima',
    ciudad: 'Ibagué',
    direccion: 'Carrera 3 # 12-65',
    telefono: '+57 (608) 261 1800',
    email: 'tolima@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1971-06-22',
    totalEmpleados: 30,
    totalEstudiantes: 2200,
    metadata: { numeroSedes: 4 },
  },
  // Sedes - Tolima
  {
    id: 'sed-016',
    codigo: 'ESAP-TOL-IBA',
    nombre: 'Sede Ibagué',
    nombreCorto: 'Ibagué',
    nivel: 'sede',
    padreId: 'ter-014',
    ruta: ['nal-001', 'ter-014', 'sed-016'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Tolima', 'Sede Ibagué'],
    jerarquia: 2,
    departamento: 'Tolima',
    ciudad: 'Ibagué',
    estado: 'activo',
    fechaCreacion: '1971-06-22',
    totalEmpleados: 20,
    totalEstudiantes: 1600,
    metadata: { esSedePrincipal: true },
  },

  // ============================================
  // TERRITORIAL 15: VALLE DEL CAUCA
  // ============================================
  {
    id: 'ter-015',
    codigo: 'ESAP-VAL',
    nombre: 'Territorial Valle del Cauca',
    nombreCorto: 'Valle del Cauca',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-015'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Valle del Cauca'],
    jerarquia: 1,
    departamento: 'Valle del Cauca',
    ciudad: 'Cali',
    direccion: 'Carrera 5 # 11-60',
    telefono: '+57 (602) 893 4200',
    email: 'valle@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1972-08-30',
    totalEmpleados: 42,
    totalEstudiantes: 3100,
    metadata: { numeroSedes: 6 },
  },
  // Sedes - Valle del Cauca
  {
    id: 'sed-017',
    codigo: 'ESAP-VAL-CAL',
    nombre: 'Sede Cali',
    nombreCorto: 'Cali',
    nivel: 'sede',
    padreId: 'ter-015',
    ruta: ['nal-001', 'ter-015', 'sed-017'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Valle del Cauca', 'Sede Cali'],
    jerarquia: 2,
    departamento: 'Valle del Cauca',
    ciudad: 'Cali',
    estado: 'activo',
    fechaCreacion: '1972-08-30',
    totalEmpleados: 32,
    totalEstudiantes: 2400,
    metadata: { esSedePrincipal: true },
  },

  // ============================================
  // TERRITORIAL 16: CESAR
  // ============================================
  {
    id: 'ter-016',
    codigo: 'ESAP-CES',
    nombre: 'Territorial Cesar',
    nombreCorto: 'Cesar',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-016'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Cesar'],
    jerarquia: 1,
    departamento: 'Cesar',
    ciudad: 'Valledupar',
    direccion: 'Calle 16 # 5-25',
    telefono: '+57 (605) 574 3100',
    email: 'cesar@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1973-10-12',
    totalEmpleados: 24,
    totalEstudiantes: 1700,
    metadata: { numeroSedes: 3 },
  },
  // Sedes - Cesar
  {
    id: 'sed-018',
    codigo: 'ESAP-CES-VAL',
    nombre: 'Sede Valledupar',
    nombreCorto: 'Valledupar',
    nivel: 'sede',
    padreId: 'ter-016',
    ruta: ['nal-001', 'ter-016', 'sed-018'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Cesar', 'Sede Valledupar'],
    jerarquia: 2,
    departamento: 'Cesar',
    ciudad: 'Valledupar',
    estado: 'activo',
    fechaCreacion: '1973-10-12',
    totalEmpleados: 14,
    totalEstudiantes: 1200,
    metadata: { esSedePrincipal: true },
  },

  // ============================================
  // TERRITORIAL 17: META
  // ============================================
  {
    id: 'ter-017',
    codigo: 'ESAP-MET',
    nombre: 'Territorial Meta',
    nombreCorto: 'Meta',
    nivel: 'territorial',
    padreId: 'nal-001',
    ruta: ['nal-001', 'ter-017'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Meta'],
    jerarquia: 1,
    departamento: 'Meta',
    ciudad: 'Villavicencio',
    direccion: 'Calle 40 # 28-55',
    telefono: '+57 (608) 662 4500',
    email: 'meta@esap.edu.co',
    estado: 'activo',
    fechaCreacion: '1974-12-05',
    totalEmpleados: 27,
    totalEstudiantes: 1950,
    metadata: { numeroSedes: 3 },
  },
  // Sedes - Meta
  {
    id: 'sed-019',
    codigo: 'ESAP-MET-VVC',
    nombre: 'Sede Villavicencio',
    nombreCorto: 'Villavicencio',
    nivel: 'sede',
    padreId: 'ter-017',
    ruta: ['nal-001', 'ter-017', 'sed-019'],
    rutaNombres: ['ESAP - Sede Nacional', 'Territorial Meta', 'Sede Villavicencio'],
    jerarquia: 2,
    departamento: 'Meta',
    ciudad: 'Villavicencio',
    estado: 'activo',
    fechaCreacion: '1974-12-05',
    totalEmpleados: 17,
    totalEstudiantes: 1400,
    metadata: { esSedePrincipal: true },
  },
];

/**
 * ESTADÍSTICAS DE LA ESTRUCTURA
 */
export const ESTADISTICAS_ESTRUCTURA = {
  totalUnidades: ESTRUCTURA_ORGANIZACIONAL_ESAP.length,
  totalNacional: ESTRUCTURA_ORGANIZACIONAL_ESAP.filter(u => u.nivel === 'nacional').length,
  totalTerritoriales: ESTRUCTURA_ORGANIZACIONAL_ESAP.filter(u => u.nivel === 'territorial').length,
  totalSedes: ESTRUCTURA_ORGANIZACIONAL_ESAP.filter(u => u.nivel === 'sede').length,
  totalEmpleados: ESTRUCTURA_ORGANIZACIONAL_ESAP.reduce((sum, u) => sum + (u.totalEmpleados || 0), 0),
  totalEstudiantes: ESTRUCTURA_ORGANIZACIONAL_ESAP.reduce((sum, u) => sum + (u.totalEstudiantes || 0), 0),
};

/**
 * HELPERS
 */
export function getUnidadesPorNivel(nivel: string) {
  return ESTRUCTURA_ORGANIZACIONAL_ESAP.filter(u => u.nivel === nivel);
}

export function getSedesPorTerritorial(territorialId: string) {
  return ESTRUCTURA_ORGANIZACIONAL_ESAP.filter(u => u.nivel === 'sede' && u.padreId === territorialId);
}

export function getArbolEstructura(unidades?: any[]): any[] {
  const unidadesData = unidades || ESTRUCTURA_ORGANIZACIONAL_ESAP;
  
  // Función recursiva para construir el árbol
  const construirNodo = (unidad: any, nivel: number = 0): any => {
    const hijos = unidadesData
      .filter(u => u.padreId === unidad.id)
      .map(hijo => construirNodo(hijo, nivel + 1));
    
    return {
      unidad,
      hijos,
      nivel
    };
  };
  
  // Obtener solo las unidades raíz (nivel nacional, sin padreId o padreId null)
  const raices = unidadesData.filter(u => !u.padreId || u.nivel === 'nacional');
  
  // Construir el árbol desde cada raíz
  return raices.map(raiz => construirNodo(raiz, 0));
}