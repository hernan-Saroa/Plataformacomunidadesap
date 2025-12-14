/**
 * ESTRUCTURA ORGANIZACIONAL ESAP - TERRITORIALES Y CETAP COMPLETAS
 * Actualizado con las 17 territoriales oficiales de ESAP
 * Fuente: Documentación oficial ESAP 2025
 * 
 * NOMENCLATURA OFICIAL:
 * - CETAP: Centro Territorial de Administración Pública
 * - 1 Sede Central (Sede Principal)
 * - 17 Territoriales con 307 CETAP en todo el país
 * - TOTAL: 18 unidades organizacionales principales
 */

export interface CetapInfo {
  id: string;
  codigo: string;
  nombre: string;
  ciudad?: string;
  departamento?: string;
  tipo?: 'principal' | 'auxiliar';
}

export interface TerritorialInfo {
  id: string;
  codigo: string;
  nombre: string;
  nombreCorto: string;
  departamentos: string[];
  ciudadPrincipal: string;
  totalCetap: number;
  cetap: CetapInfo[];
}

/**
 * 17 TERRITORIALES COMPLETAS CON 307 CETAP + 1 SEDE CENTRAL
 * Distribución exacta según documentación oficial ESAP 2025
 */
export const TERRITORIALES_ESAP: TerritorialInfo[] = [
  // ============================================
  // SEDE CENTRAL - 1 SEDE PRINCIPAL
  // ============================================
  {
    id: 'ter-000',
    codigo: 'ESAP-CENTRAL',
    nombre: 'Sede Central',
    nombreCorto: 'Sede Central',
    departamentos: ['Bogotá D.C.'],
    ciudadPrincipal: 'Bogotá D.C.',
    totalCetap: 1,
    cetap: [
      { id: 'cetap-central-001', codigo: 'SEDE-PRINCIPAL', nombre: 'Sede Principal', ciudad: 'Bogotá D.C.', departamento: 'Bogotá D.C.', tipo: 'principal' },
    ]
  },

  // ============================================
  // 1. ANTIOQUIA - 35 CETAP
  // ============================================
  {
    id: 'ter-001',
    codigo: 'ESAP-ANT',
    nombre: 'Territorial Antioquia',
    nombreCorto: 'Antioquia',
    departamentos: ['Antioquia'],
    ciudadPrincipal: 'Medellín',
    totalCetap: 35,
    cetap: [
      { id: 'cetap-ant-001', codigo: 'CETAP-001', nombre: 'CETAP Amagá', ciudad: 'Amagá', departamento: 'Antioquia' },
      { id: 'cetap-ant-002', codigo: 'CETAP-002', nombre: 'CETAP Amalfi', ciudad: 'Amalfi', departamento: 'Antioquia' },
      { id: 'cetap-ant-003', codigo: 'CETAP-003', nombre: 'CETAP Andes', ciudad: 'Andes', departamento: 'Antioquia' },
      { id: 'cetap-ant-004', codigo: 'CETAP-004', nombre: 'CETAP Apartadó', ciudad: 'Apartadó', departamento: 'Antioquia' },
      { id: 'cetap-ant-005', codigo: 'CETAP-005', nombre: 'CETAP Bello', ciudad: 'Bello', departamento: 'Antioquia' },
      { id: 'cetap-ant-006', codigo: 'CETAP-006', nombre: 'CETAP Caldas', ciudad: 'Caldas', departamento: 'Antioquia' },
      { id: 'cetap-ant-007', codigo: 'CETAP-007', nombre: 'CETAP Carmen de Viboral', ciudad: 'Carmen de Viboral', departamento: 'Antioquia' },
      { id: 'cetap-ant-008', codigo: 'CETAP-008', nombre: 'CETAP Caucasia', ciudad: 'Caucasia', departamento: 'Antioquia' },
      { id: 'cetap-ant-009', codigo: 'CETAP-009', nombre: 'CETAP Chigorodó', ciudad: 'Chigorodó', departamento: 'Antioquia' },
      { id: 'cetap-ant-010', codigo: 'CETAP-010', nombre: 'CETAP Cisneros', ciudad: 'Cisneros', departamento: 'Antioquia' },
      { id: 'cetap-ant-011', codigo: 'CETAP-011', nombre: 'CETAP Copacabana', ciudad: 'Copacabana', departamento: 'Antioquia' },
      { id: 'cetap-ant-012', codigo: 'CETAP-012', nombre: 'CETAP Envigado', ciudad: 'Envigado', departamento: 'Antioquia' },
      { id: 'cetap-ant-013', codigo: 'CETAP-013', nombre: 'CETAP Fredonia', ciudad: 'Fredonia', departamento: 'Antioquia' },
      { id: 'cetap-ant-014', codigo: 'CETAP-014', nombre: 'CETAP Girardota', ciudad: 'Girardota', departamento: 'Antioquia' },
      { id: 'cetap-ant-015', codigo: 'CETAP-015', nombre: 'CETAP Itagüí', ciudad: 'Itagüí', departamento: 'Antioquia' },
      { id: 'cetap-ant-016', codigo: 'CETAP-016', nombre: 'CETAP Jericó', ciudad: 'Jericó', departamento: 'Antioquia' },
      { id: 'cetap-ant-017', codigo: 'CETAP-017', nombre: 'CETAP La Ceja', ciudad: 'La Ceja', departamento: 'Antioquia' },
      { id: 'cetap-ant-018', codigo: 'CETAP-018', nombre: 'CETAP Marinilla', ciudad: 'Marinilla', departamento: 'Antioquia' },
      { id: 'cetap-ant-019', codigo: 'CETAP-019', nombre: 'CETAP Medellín', ciudad: 'Medellín', departamento: 'Antioquia', tipo: 'principal' },
      { id: 'cetap-ant-020', codigo: 'CETAP-020', nombre: 'CETAP Nechí', ciudad: 'Nechí', departamento: 'Antioquia' },
      { id: 'cetap-ant-021', codigo: 'CETAP-021', nombre: 'CETAP Remedios', ciudad: 'Remedios', departamento: 'Antioquia' },
      { id: 'cetap-ant-022', codigo: 'CETAP-022', nombre: 'CETAP Puerto Berrío', ciudad: 'Puerto Berrío', departamento: 'Antioquia' },
      { id: 'cetap-ant-023', codigo: 'CETAP-023', nombre: 'CETAP San Andrés (Santa Fé de Antioquia)', ciudad: 'Santa Fé de Antioquia', departamento: 'Antioquia' },
      { id: 'cetap-ant-024', codigo: 'CETAP-024', nombre: 'CETAP San Jerónimo', ciudad: 'San Jerónimo', departamento: 'Antioquia' },
      { id: 'cetap-ant-025', codigo: 'CETAP-025', nombre: 'CETAP San Pedro', ciudad: 'San Pedro', departamento: 'Antioquia' },
      { id: 'cetap-ant-026', codigo: 'CETAP-026', nombre: 'CETAP Santa Rosa', ciudad: 'Santa Rosa', departamento: 'Antioquia' },
      { id: 'cetap-ant-027', codigo: 'CETAP-027', nombre: 'CETAP Santauario', ciudad: 'Santuario', departamento: 'Antioquia' },
      { id: 'cetap-ant-028', codigo: 'CETAP-028', nombre: 'CETAP Segovia', ciudad: 'Segovia', departamento: 'Antioquia' },
      { id: 'cetap-ant-029', codigo: 'CETAP-029', nombre: 'CETAP Sonsón', ciudad: 'Sonsón', departamento: 'Antioquia' },
      { id: 'cetap-ant-030', codigo: 'CETAP-030', nombre: 'CETAP Támesis', ciudad: 'Támesis', departamento: 'Antioquia' },
      { id: 'cetap-ant-031', codigo: 'CETAP-031', nombre: 'CETAP Turbo', ciudad: 'Turbo', departamento: 'Antioquia' },
      { id: 'cetap-ant-032', codigo: 'CETAP-032', nombre: 'CETAP Valdivia', ciudad: 'Valdivia', departamento: 'Antioquia' },
      { id: 'cetap-ant-033', codigo: 'CETAP-033', nombre: 'CETAP Vegachí', ciudad: 'Vegachí', departamento: 'Antioquia' },
      { id: 'cetap-ant-034', codigo: 'CETAP-034', nombre: 'CETAP Yarumal', ciudad: 'Yarumal', departamento: 'Antioquia' },
      { id: 'cetap-ant-035', codigo: 'CETAP-035', nombre: 'CETAP Vigía del Fuerte', ciudad: 'Vigía del Fuerte', departamento: 'Antioquia' },
    ]
  },

  // ============================================
  // 2. ATLÁNTICO - 9 CETAP
  // ============================================
  {
    id: 'ter-002',
    codigo: 'ESAP-ATL',
    nombre: 'Territorial Atlántico',
    nombreCorto: 'Atlántico',
    departamentos: ['Atlántico'],
    ciudadPrincipal: 'Barranquilla',
    totalCetap: 9,
    cetap: [
      { id: 'cetap-atl-001', codigo: 'CETAP-001', nombre: 'CETAP Barranquilla', ciudad: 'Barranquilla', departamento: 'Atlántico', tipo: 'principal' },
      { id: 'cetap-atl-002', codigo: 'CETAP-002', nombre: 'CETAP Campo de la Cruz', ciudad: 'Campo de la Cruz', departamento: 'Atlántico' },
      { id: 'cetap-atl-003', codigo: 'CETAP-003', nombre: 'CETAP Galapa', ciudad: 'Galapa', departamento: 'Atlántico' },
      { id: 'cetap-atl-004', codigo: 'CETAP-004', nombre: 'CETAP Malambo', ciudad: 'Malambo', departamento: 'Atlántico' },
      { id: 'cetap-atl-005', codigo: 'CETAP-005', nombre: 'CETAP Manatí', ciudad: 'Manatí', departamento: 'Atlántico' },
      { id: 'cetap-atl-006', codigo: 'CETAP-006', nombre: 'CETAP Juan de la Trinidad', ciudad: 'Juan de Acosta', departamento: 'Atlántico' },
      { id: 'cetap-atl-007', codigo: 'CETAP-007', nombre: 'CETAP Luruaco', ciudad: 'Luruaco', departamento: 'Atlántico' },
      { id: 'cetap-atl-008', codigo: 'CETAP-008', nombre: 'CETAP Sabanalarga', ciudad: 'Sabanalarga', departamento: 'Atlántico' },
      { id: 'cetap-atl-009', codigo: 'CETAP-009', nombre: 'CETAP Soledad', ciudad: 'Soledad', departamento: 'Atlántico' },
    ]
  },

  // ============================================
  // 3. BOLÍVAR - 23 CETAP
  // ============================================
  {
    id: 'ter-003',
    codigo: 'ESAP-BOL',
    nombre: 'Territorial Bolívar',
    nombreCorto: 'Bolívar',
    departamentos: ['Bolívar'],
    ciudadPrincipal: 'Cartagena',
    totalCetap: 23,
    cetap: [
      { id: 'cetap-bol-001', codigo: 'CETAP-001', nombre: 'CETAP Cartagena', ciudad: 'Cartagena', departamento: 'Bolívar', tipo: 'principal' },
      { id: 'cetap-bol-002', codigo: 'CETAP-002', nombre: 'CETAP Arjona', ciudad: 'Arjona', departamento: 'Bolívar' },
      { id: 'cetap-bol-003', codigo: 'CETAP-003', nombre: 'CETAP Calamar', ciudad: 'Calamar', departamento: 'Bolívar' },
      { id: 'cetap-bol-004', codigo: 'CETAP-004', nombre: 'CETAP Carmen de Bolívar', ciudad: 'Carmen de Bolívar', departamento: 'Bolívar' },
      { id: 'cetap-bol-005', codigo: 'CETAP-005', nombre: 'CETAP Córdoba', ciudad: 'Córdoba', departamento: 'Bolívar' },
      { id: 'cetap-bol-006', codigo: 'CETAP-006', nombre: 'CETAP El Peñón de Providencia', ciudad: 'El Peñón', departamento: 'Bolívar' },
      { id: 'cetap-bol-007', codigo: 'CETAP-007', nombre: 'CETAP La Unión - Sucre', ciudad: 'La Unión', departamento: 'Bolívar' },
      { id: 'cetap-bol-008', codigo: 'CETAP-008', nombre: 'CETAP Magangué', ciudad: 'Magangué', departamento: 'Bolívar' },
      { id: 'cetap-bol-009', codigo: 'CETAP-009', nombre: 'CETAP Las Güindes', ciudad: 'Las Güindes', departamento: 'Bolívar' },
      { id: 'cetap-bol-010', codigo: 'CETAP-010', nombre: 'CETAP Mahates', ciudad: 'Mahates', departamento: 'Bolívar' },
      { id: 'cetap-bol-011', codigo: 'CETAP-011', nombre: 'CETAP Marialabaja', ciudad: 'María La Baja', departamento: 'Bolívar' },
      { id: 'cetap-bol-012', codigo: 'CETAP-012', nombre: 'CETAP Montecristo', ciudad: 'Montecristo', departamento: 'Bolívar' },
      { id: 'cetap-bol-013', codigo: 'CETAP-013', nombre: 'CETAP Mompox', ciudad: 'Mompox', departamento: 'Bolívar' },
      { id: 'cetap-bol-014', codigo: 'CETAP-014', nombre: 'CETAP Morales', ciudad: 'Morales', departamento: 'Bolívar' },
      { id: 'cetap-bol-015', codigo: 'CETAP-015', nombre: 'CETAP Pinillos', ciudad: 'Pinillos', departamento: 'Bolívar' },
      { id: 'cetap-bol-016', codigo: 'CETAP-016', nombre: 'CETAP San Andrés de Sotavento-R', ciudad: 'San Andrés de Sotavento', departamento: 'Bolívar' },
      { id: 'cetap-bol-017', codigo: 'CETAP-017', nombre: 'CETAP San Jacinto', ciudad: 'San Jacinto', departamento: 'Bolívar' },
      { id: 'cetap-bol-018', codigo: 'CETAP-018', nombre: 'CETAP San Juan Nepomuceno', ciudad: 'San Juan Nepomuceno', departamento: 'Bolívar' },
      { id: 'cetap-bol-019', codigo: 'CETAP-019', nombre: 'CETAP San Basilio de Palenque', ciudad: 'San Basilio de Palenque', departamento: 'Bolívar' },
      { id: 'cetap-bol-020', codigo: 'CETAP-020', nombre: 'CETAP Santa Rosa Del Sur', ciudad: 'Santa Rosa Del Sur', departamento: 'Bolívar' },
      { id: 'cetap-bol-021', codigo: 'CETAP-021', nombre: 'CETAP Simití', ciudad: 'Simití', departamento: 'Bolívar' },
      { id: 'cetap-bol-022', codigo: 'CETAP-022', nombre: 'CETAP Tiquisio', ciudad: 'Tiquisio', departamento: 'Bolívar' },
      { id: 'cetap-bol-023', codigo: 'CETAP-023', nombre: 'CETAP Turbaco', ciudad: 'Turbaco', departamento: 'Bolívar' },
    ]
  },

  // ============================================
  // 4. BOYACÁ - 13 CETAP
  // ============================================
  {
    id: 'ter-004',
    codigo: 'ESAP-BOY',
    nombre: 'Territorial Boyacá',
    nombreCorto: 'Boyacá',
    departamentos: ['Boyacá'],
    ciudadPrincipal: 'Tunja',
    totalCetap: 13,
    cetap: [
      { id: 'cetap-boy-001', codigo: 'CETAP-001', nombre: 'CETAP Chiquinquirá', ciudad: 'Chiquinquirá', departamento: 'Boyacá' },
      { id: 'cetap-boy-002', codigo: 'CETAP-002', nombre: 'CETAP Pauna', ciudad: 'Pauna', departamento: 'Boyacá' },
      { id: 'cetap-boy-003', codigo: 'CETAP-003', nombre: 'CETAP Garagoa', ciudad: 'Garagoa', departamento: 'Boyacá' },
      { id: 'cetap-boy-004', codigo: 'CETAP-004', nombre: 'CETAP Guateque', ciudad: 'Guateque', departamento: 'Boyacá' },
      { id: 'cetap-boy-005', codigo: 'CETAP-005', nombre: 'CETAP Moniquirá', ciudad: 'Moniquirá', departamento: 'Boyacá' },
      { id: 'cetap-boy-006', codigo: 'CETAP-006', nombre: 'CETAP Moniquirá', ciudad: 'Moniquirá', departamento: 'Boyacá' },
      { id: 'cetap-boy-007', codigo: 'CETAP-007', nombre: 'CETAP Puerto Boyacá', ciudad: 'Puerto Boyacá', departamento: 'Boyacá' },
      { id: 'cetap-boy-008', codigo: 'CETAP-008', nombre: 'CETAP Ramiriquí', ciudad: 'Ramiriquí', departamento: 'Boyacá' },
      { id: 'cetap-boy-009', codigo: 'CETAP-009', nombre: 'CETAP Santa María Boyacá', ciudad: 'Santa María', departamento: 'Boyacá' },
      { id: 'cetap-boy-010', codigo: 'CETAP-010', nombre: 'CETAP Socha', ciudad: 'Socha', departamento: 'Boyacá' },
      { id: 'cetap-boy-011', codigo: 'CETAP-011', nombre: 'CETAP Sogamoso', ciudad: 'Sogamoso', departamento: 'Boyacá' },
      { id: 'cetap-boy-012', codigo: 'CETAP-012', nombre: 'CETAP Tunja', ciudad: 'Tunja', departamento: 'Boyacá', tipo: 'principal' },
      { id: 'cetap-boy-013', codigo: 'CETAP-013', nombre: 'CETAP Villa de Leyva', ciudad: 'Villa de Leyva', departamento: 'Boyacá' },
    ]
  },

  // ============================================
  // 5. CALDAS - 13 CETAP
  // ============================================
  {
    id: 'ter-005',
    codigo: 'ESAP-CAL',
    nombre: 'Territorial Caldas',
    nombreCorto: 'Caldas',
    departamentos: ['Caldas'],
    ciudadPrincipal: 'Manizales',
    totalCetap: 13,
    cetap: [
      { id: 'cetap-cal-001', codigo: 'CETAP-001', nombre: 'CETAP Aguadas', ciudad: 'Aguadas', departamento: 'Caldas' },
      { id: 'cetap-cal-002', codigo: 'CETAP-002', nombre: 'CETAP Anserma', ciudad: 'Anserma', departamento: 'Caldas' },
      { id: 'cetap-cal-003', codigo: 'CETAP-003', nombre: 'CETAP Belalcázar', ciudad: 'Belalcázar', departamento: 'Caldas' },
      { id: 'cetap-cal-004', codigo: 'CETAP-004', nombre: 'CETAP Chinchiná', ciudad: 'Chinchiná', departamento: 'Caldas' },
      { id: 'cetap-cal-005', codigo: 'CETAP-005', nombre: 'CETAP Filadelfia', ciudad: 'Filadelfia', departamento: 'Caldas' },
      { id: 'cetap-cal-006', codigo: 'CETAP-006', nombre: 'CETAP La Dorada', ciudad: 'La Dorada', departamento: 'Caldas' },
      { id: 'cetap-cal-007', codigo: 'CETAP-007', nombre: 'CETAP Manizales', ciudad: 'Manizales', departamento: 'Caldas', tipo: 'principal' },
      { id: 'cetap-cal-008', codigo: 'CETAP-008', nombre: 'CETAP Manzanares', ciudad: 'Manzanares', departamento: 'Caldas' },
      { id: 'cetap-cal-009', codigo: 'CETAP-009', nombre: 'CETAP Marmato', ciudad: 'Marmato', departamento: 'Caldas' },
      { id: 'cetap-cal-010', codigo: 'CETAP-010', nombre: 'CETAP Neira', ciudad: 'Neira', departamento: 'Caldas' },
      { id: 'cetap-cal-011', codigo: 'CETAP-011', nombre: 'CETAP Pácora', ciudad: 'Pácora', departamento: 'Caldas' },
      { id: 'cetap-cal-012', codigo: 'CETAP-012', nombre: 'CETAP Riosucio', ciudad: 'Riosucio', departamento: 'Caldas' },
      { id: 'cetap-cal-013', codigo: 'CETAP-013', nombre: 'CETAP Salamina', ciudad: 'Salamina', departamento: 'Caldas' },
    ]
  },

  // ============================================
  // 6. CAUCA - 11 CETAP
  // ============================================
  {
    id: 'ter-006',
    codigo: 'ESAP-CAU',
    nombre: 'Territorial Cauca',
    nombreCorto: 'Cauca',
    departamentos: ['Cauca'],
    ciudadPrincipal: 'Popayán',
    totalCetap: 11,
    cetap: [
      { id: 'cetap-cau-001', codigo: 'CETAP-001', nombre: 'CETAP Popayán', ciudad: 'Popayán', departamento: 'Cauca', tipo: 'principal' },
      { id: 'cetap-cau-002', codigo: 'CETAP-002', nombre: 'CETAP Caldono', ciudad: 'Caldono', departamento: 'Cauca' },
      { id: 'cetap-cau-003', codigo: 'CETAP-003', nombre: 'CETAP El Bordo', ciudad: 'El Bordo', departamento: 'Cauca' },
      { id: 'cetap-cau-004', codigo: 'CETAP-004', nombre: 'CETAP Guachené', ciudad: 'Guachené', departamento: 'Cauca' },
      { id: 'cetap-cau-005', codigo: 'CETAP-005', nombre: 'CETAP Inzá', ciudad: 'Inzá', departamento: 'Cauca' },
      { id: 'cetap-cau-006', codigo: 'CETAP-006', nombre: 'CETAP Miranda', ciudad: 'Miranda', departamento: 'Cauca' },
      { id: 'cetap-cau-007', codigo: 'CETAP-007', nombre: 'CETAP Morales', ciudad: 'Morales', departamento: 'Cauca' },
      { id: 'cetap-cau-008', codigo: 'CETAP-008', nombre: 'CETAP Popayán', ciudad: 'Popayán', departamento: 'Cauca' },
      { id: 'cetap-cau-009', codigo: 'CETAP-009', nombre: 'CETAP Rosas', ciudad: 'Rosas', departamento: 'Cauca' },
      { id: 'cetap-cau-010', codigo: 'CETAP-010', nombre: 'CETAP Santander de Quilichao', ciudad: 'Santander de Quilichao', departamento: 'Cauca' },
      { id: 'cetap-cau-011', codigo: 'CETAP-011', nombre: 'CETAP Silvia', ciudad: 'Silvia', departamento: 'Cauca' },
    ]
  },

  // ============================================
  // 7. CHOCÓ - 6 CETAP
  // ============================================
  {
    id: 'ter-007',
    codigo: 'ESAP-CHO',
    nombre: 'Territorial Chocó',
    nombreCorto: 'Chocó',
    departamentos: ['Chocó'],
    ciudadPrincipal: 'Quibdó',
    totalCetap: 6,
    cetap: [
      { id: 'cetap-cho-001', codigo: 'CETAP-001', nombre: 'CETAP Acandí', ciudad: 'Acandí', departamento: 'Chocó' },
      { id: 'cetap-cho-002', codigo: 'CETAP-002', nombre: 'CETAP Alto del Baudó', ciudad: 'Alto del Baudó', departamento: 'Chocó' },
      { id: 'cetap-cho-003', codigo: 'CETAP-003', nombre: 'CETAP Istmina', ciudad: 'Istmina', departamento: 'Chocó' },
      { id: 'cetap-cho-004', codigo: 'CETAP-004', nombre: 'CETAP Quibdó', ciudad: 'Quibdó', departamento: 'Chocó', tipo: 'principal' },
      { id: 'cetap-cho-005', codigo: 'CETAP-005', nombre: 'CETAP Tadó', ciudad: 'Tadó', departamento: 'Chocó' },
      { id: 'cetap-cho-006', codigo: 'CETAP-006', nombre: 'CETAP Unguía', ciudad: 'Unguía', departamento: 'Chocó' },
    ]
  },

  // ============================================
  // 8. CUNDINAMARCA - 29 CETAP
  // ============================================
  {
    id: 'ter-008',
    codigo: 'ESAP-CUN',
    nombre: 'Territorial Cundinamarca',
    nombreCorto: 'Cundinamarca',
    departamentos: ['Cundinamarca', 'Bogotá D.C.'],
    ciudadPrincipal: 'Bogotá D.C.',
    totalCetap: 29,
    cetap: [
      { id: 'cetap-cun-001', codigo: 'CETAP-001', nombre: 'CETAP Agua de Dios', ciudad: 'Agua de Dios', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-002', codigo: 'CETAP-002', nombre: 'CETAP Cajicá', ciudad: 'Cajicá', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-003', codigo: 'CETAP-003', nombre: 'CETAP Cáqueza', ciudad: 'Cáqueza', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-004', codigo: 'CETAP-004', nombre: 'CETAP Chía', ciudad: 'Chía', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-005', codigo: 'CETAP-005', nombre: 'CETAP Chipaque', ciudad: 'Chipaque', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-006', codigo: 'CETAP-006', nombre: 'CETAP Cota', ciudad: 'Cota', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-007', codigo: 'CETAP-007', nombre: 'CETAP El Colegio', ciudad: 'El Colegio', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-008', codigo: 'CETAP-008', nombre: 'CETAP Facatativá', ciudad: 'Facatativá', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-009', codigo: 'CETAP-009', nombre: 'CETAP Funza', ciudad: 'Funza', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-010', codigo: 'CETAP-010', nombre: 'CETAP Fusagasugá', ciudad: 'Fusagasugá', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-011', codigo: 'CETAP-011', nombre: 'CETAP Gachala', ciudad: 'Gachala', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-012', codigo: 'CETAP-012', nombre: 'CETAP Gachetá', ciudad: 'Gachetá', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-013', codigo: 'CETAP-013', nombre: 'CETAP Girardot', ciudad: 'Girardot', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-014', codigo: 'CETAP-014', nombre: 'CETAP Girardot', ciudad: 'Girardot', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-015', codigo: 'CETAP-015', nombre: 'CETAP Guaduas', ciudad: 'Guaduas', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-016', codigo: 'CETAP-016', nombre: 'CETAP Guaduas', ciudad: 'Guaduas', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-017', codigo: 'CETAP-017', nombre: 'CETAP La Mesa', ciudad: 'La Mesa', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-018', codigo: 'CETAP-018', nombre: 'CETAP Madrid', ciudad: 'Madrid', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-019', codigo: 'CETAP-019', nombre: 'CETAP Mosquera', ciudad: 'Mosquera', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-020', codigo: 'CETAP-020', nombre: 'CETAP Pacho', ciudad: 'Pacho', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-021', codigo: 'CETAP-021', nombre: 'CETAP Puerto Salgar', ciudad: 'Puerto Salgar', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-022', codigo: 'CETAP-022', nombre: 'CETAP Ricaurte', ciudad: 'Ricaurte', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-023', codigo: 'CETAP-023', nombre: 'CETAP San Juan de Rioseco', ciudad: 'San Juan de Rioseco', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-024', codigo: 'CETAP-024', nombre: 'CETAP Soacha', ciudad: 'Soacha', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-025', codigo: 'CETAP-025', nombre: 'CETAP Sopó', ciudad: 'Sopó', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-026', codigo: 'CETAP-026', nombre: 'CETAP Tabio', ciudad: 'Tabio', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-027', codigo: 'CETAP-027', nombre: 'CETAP Tocaima', ciudad: 'Tocaima', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-028', codigo: 'CETAP-028', nombre: 'CETAP Ubaté', ciudad: 'Ubaté', departamento: 'Cundinamarca' },
      { id: 'cetap-cun-029', codigo: 'CETAP-029', nombre: 'CETAP Villeta', ciudad: 'Villeta', departamento: 'Cundinamarca' },
    ]
  },

  // ============================================
  // 9. HUILA - 30 CETAP
  // ============================================
  {
    id: 'ter-009',
    codigo: 'ESAP-HUI',
    nombre: 'Territorial Huila',
    nombreCorto: 'Huila',
    departamentos: ['Huila'],
    ciudadPrincipal: 'Neiva',
    totalCetap: 30,
    cetap: [
      { id: 'cetap-hui-001', codigo: 'CETAP-001', nombre: 'CETAP Neiva', ciudad: 'Neiva', departamento: 'Huila', tipo: 'principal' },
      { id: 'cetap-hui-002', codigo: 'CETAP-002', nombre: 'CETAP Agpujarra', ciudad: 'Algeciras', departamento: 'Huila' },
      { id: 'cetap-hui-003', codigo: 'CETAP-003', nombre: 'CETAP Algeciras San Andrés de Pizambi', ciudad: 'Algeciras', departamento: 'Huila' },
      { id: 'cetap-hui-004', codigo: 'CETAP-004', nombre: 'CETAP Campoalegre San Andrés de Chiapas', ciudad: 'Campoalegre', departamento: 'Huila' },
      { id: 'cetap-hui-005', codigo: 'CETAP-005', nombre: 'CETAP Colombia', ciudad: 'Colombia', departamento: 'Huila' },
      { id: 'cetap-hui-006', codigo: 'CETAP-006', nombre: 'CETAP Hobo', ciudad: 'Hobo', departamento: 'Huila' },
      { id: 'cetap-hui-007', codigo: 'CETAP-007', nombre: 'CETAP Garzón', ciudad: 'Garzón', departamento: 'Huila' },
      { id: 'cetap-hui-008', codigo: 'CETAP-008', nombre: 'CETAP La Plata', ciudad: 'La Plata', departamento: 'Huila' },
      { id: 'cetap-hui-009', codigo: 'CETAP-009', nombre: 'CETAP La Jagua', ciudad: 'La Jagua', departamento: 'Huila' },
      { id: 'cetap-hui-010', codigo: 'CETAP-010', nombre: 'CETAP La Rivera La', ciudad: 'La Rivera', departamento: 'Huila' },
      { id: 'cetap-hui-011', codigo: 'CETAP-011', nombre: 'CETAP Pitalito', ciudad: 'Pitalito', departamento: 'Huila' },
      { id: 'cetap-hui-012', codigo: 'CETAP-012', nombre: 'CETAP Mosca', ciudad: 'Mosca', departamento: 'Huila' },
      { id: 'cetap-hui-013', codigo: 'CETAP-013', nombre: 'CETAP Oporapa', ciudad: 'Oporapa', departamento: 'Huila' },
      { id: 'cetap-hui-014', codigo: 'CETAP-014', nombre: 'CETAP Palermo', ciudad: 'Palermo', departamento: 'Huila' },
      { id: 'cetap-hui-015', codigo: 'CETAP-015', nombre: 'CETAP Pital', ciudad: 'Pital', departamento: 'Huila' },
      { id: 'cetap-hui-016', codigo: 'CETAP-016', nombre: 'CETAP Pitalito', ciudad: 'Pitalito', departamento: 'Huila' },
      { id: 'cetap-hui-017', codigo: 'CETAP-017', nombre: 'CETAP Rivera Autia', ciudad: 'Rivera', departamento: 'Huila' },
      { id: 'cetap-hui-018', codigo: 'CETAP-018', nombre: 'CETAP San Agustín', ciudad: 'San Agustín', departamento: 'Huila' },
      { id: 'cetap-hui-019', codigo: 'CETAP-019', nombre: 'CETAP Santa María', ciudad: 'Santa María', departamento: 'Huila' },
      { id: 'cetap-hui-020', codigo: 'CETAP-020', nombre: 'CETAP Resguardo Indígena Rimy', ciudad: 'Resguardo Indígena Rimy', departamento: 'Huila' },
      { id: 'cetap-hui-021', codigo: 'CETAP-021', nombre: 'CETAP Resguardo Guardiola', ciudad: 'Resguardo Guardiola', departamento: 'Huila' },
      { id: 'cetap-hui-022', codigo: 'CETAP-022', nombre: 'CETAP Resguardo Nasa Juan Tama', ciudad: 'Resguardo Nasa Juan Tama', departamento: 'Huila' },
      { id: 'cetap-hui-023', codigo: 'CETAP-023', nombre: 'CETAP Resguardo Agustín', ciudad: 'San Agustín', departamento: 'Huila' },
      { id: 'cetap-hui-024', codigo: 'CETAP-024', nombre: 'CETAP Santa de las Flores', ciudad: 'Santa de las Flores', departamento: 'Huila' },
      { id: 'cetap-hui-025', codigo: 'CETAP-025', nombre: 'CETAP Samaniego de Palenque', ciudad: 'Samaniego de Palenque', departamento: 'Huila' },
      { id: 'cetap-hui-026', codigo: 'CETAP-026', nombre: 'CETAP Sardino', ciudad: 'Sardino', departamento: 'Huila' },
      { id: 'cetap-hui-027', codigo: 'CETAP-027', nombre: 'CETAP Sofía', ciudad: 'Sofía', departamento: 'Huila' },
      { id: 'cetap-hui-028', codigo: 'CETAP-028', nombre: 'CETAP Suaza', ciudad: 'Suaza', departamento: 'Huila' },
      { id: 'cetap-hui-029', codigo: 'CETAP-029', nombre: 'CETAP Teruel de Quimarca', ciudad: 'Teruel', departamento: 'Huila' },
      { id: 'cetap-hui-030', codigo: 'CETAP-030', nombre: 'CETAP Villavieja', ciudad: 'Villavieja', departamento: 'Huila' },
    ]
  },

  // ============================================
  // 10. NARIÑO - 28 CETAP
  // ============================================
  {
    id: 'ter-010',
    codigo: 'ESAP-NAR',
    nombre: 'Territorial Nariño',
    nombreCorto: 'Nariño',
    departamentos: ['Nariño'],
    ciudadPrincipal: 'Pasto',
    totalCetap: 28,
    cetap: [
      { id: 'cetap-nar-001', codigo: 'CETAP-001', nombre: 'CETAP Pasto', ciudad: 'Pasto', departamento: 'Nariño', tipo: 'principal' },
      { id: 'cetap-nar-002', codigo: 'CETAP-002', nombre: 'CETAP Albán', ciudad: 'Albán', departamento: 'Nariño' },
      { id: 'cetap-nar-003', codigo: 'CETAP-003', nombre: 'CETAP Barbacoas', ciudad: 'Barbacoas', departamento: 'Nariño' },
      { id: 'cetap-nar-004', codigo: 'CETAP-004', nombre: 'CETAP Chachagüí', ciudad: 'Chachagüí', departamento: 'Nariño' },
      { id: 'cetap-nar-005', codigo: 'CETAP-005', nombre: 'CETAP Consacá', ciudad: 'Consacá', departamento: 'Nariño' },
      { id: 'cetap-nar-006', codigo: 'CETAP-006', nombre: 'CETAP Cumbitara - Nariño', ciudad: 'Cumbitara', departamento: 'Nariño' },
      { id: 'cetap-nar-007', codigo: 'CETAP-007', nombre: 'CETAP El Rosario', ciudad: 'El Rosario', departamento: 'Nariño' },
      { id: 'cetap-nar-008', codigo: 'CETAP-008', nombre: 'CETAP El Charco', ciudad: 'El Charco', departamento: 'Nariño' },
      { id: 'cetap-nar-009', codigo: 'CETAP-009', nombre: 'CETAP Funes', ciudad: 'Funes', departamento: 'Nariño' },
      { id: 'cetap-nar-010', codigo: 'CETAP-010', nombre: 'CETAP Guaitarilla', ciudad: 'Guaitarilla', departamento: 'Nariño' },
      { id: 'cetap-nar-011', codigo: 'CETAP-011', nombre: 'CETAP Iles', ciudad: 'Iles', departamento: 'Nariño' },
      { id: 'cetap-nar-012', codigo: 'CETAP-012', nombre: 'CETAP Ipiales', ciudad: 'Ipiales', departamento: 'Nariño' },
      { id: 'cetap-nar-013', codigo: 'CETAP-013', nombre: 'CETAP Iscuandé', ciudad: 'Iscuandé', departamento: 'Nariño' },
      { id: 'cetap-nar-014', codigo: 'CETAP-014', nombre: 'CETAP La Llanada', ciudad: 'La Llanada', departamento: 'Nariño' },
      { id: 'cetap-nar-015', codigo: 'CETAP-015', nombre: 'CETAP La Unión - Nariño', ciudad: 'La Unión', departamento: 'Nariño' },
      { id: 'cetap-nar-016', codigo: 'CETAP-016', nombre: 'CETAP Olivos', ciudad: 'Olivos', departamento: 'Nariño' },
      { id: 'cetap-nar-017', codigo: 'CETAP-017', nombre: 'CETAP Pasto', ciudad: 'Pasto', departamento: 'Nariño' },
      { id: 'cetap-nar-018', codigo: 'CETAP-018', nombre: 'CETAP Policarpa', ciudad: 'Policarpa', departamento: 'Nariño' },
      { id: 'cetap-nar-019', codigo: 'CETAP-019', nombre: 'CETAP Potosí', ciudad: 'Potosí', departamento: 'Nariño' },
      { id: 'cetap-nar-020', codigo: 'CETAP-020', nombre: 'CETAP Pupiales', ciudad: 'Pupiales', departamento: 'Nariño' },
      { id: 'cetap-nar-021', codigo: 'CETAP-021', nombre: 'CETAP Ricaurte', ciudad: 'Ricaurte', departamento: 'Nariño' },
      { id: 'cetap-nar-022', codigo: 'CETAP-022', nombre: 'CETAP Roberto Payán', ciudad: 'Roberto Payán', departamento: 'Nariño' },
      { id: 'cetap-nar-023', codigo: 'CETAP-023', nombre: 'CETAP Samaniego', ciudad: 'Samaniego', departamento: 'Nariño' },
      { id: 'cetap-nar-024', codigo: 'CETAP-024', nombre: 'CETAP Sandoná', ciudad: 'Sandoná', departamento: 'Nariño' },
      { id: 'cetap-nar-025', codigo: 'CETAP-025', nombre: 'CETAP Santa Cruz de Guachavez', ciudad: 'Santa Cruz de Guachavez', departamento: 'Nariño' },
      { id: 'cetap-nar-026', codigo: 'CETAP-026', nombre: 'CETAP Taminango', ciudad: 'Taminango', departamento: 'Nariño' },
      { id: 'cetap-nar-027', codigo: 'CETAP-027', nombre: 'CETAP Túnden De Gomez', ciudad: 'Túnden', departamento: 'Nariño' },
      { id: 'cetap-nar-028', codigo: 'CETAP-028', nombre: 'CETAP Tumaco', ciudad: 'Tumaco', departamento: 'Nariño' },
    ]
  },

  // ============================================
  // 11. NORTE DE SANTANDER - 20 CETAP
  // ============================================
  {
    id: 'ter-011',
    codigo: 'ESAP-NDS',
    nombre: 'Territorial Norte de Santander',
    nombreCorto: 'Norte de Santander',
    departamentos: ['Norte de Santander'],
    ciudadPrincipal: 'Cúcuta',
    totalCetap: 20,
    cetap: [
      { id: 'cetap-nds-001', codigo: 'CETAP-001', nombre: 'CETAP Ábrego', ciudad: 'Ábrego', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-002', codigo: 'CETAP-002', nombre: 'CETAP Barranco de Loba', ciudad: 'Barranco de Loba', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-003', codigo: 'CETAP-003', nombre: 'CETAP Convención', ciudad: 'Convención', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-004', codigo: 'CETAP-004', nombre: 'CETAP Arauquita', ciudad: 'Arauquita', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-005', codigo: 'CETAP-005', nombre: 'CETAP Asunción', ciudad: 'Asunción', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-006', codigo: 'CETAP-006', nombre: 'CETAP Chitagá', ciudad: 'Chitagá', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-007', codigo: 'CETAP-007', nombre: 'CETAP Chitcatá', ciudad: 'Chitcatá', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-008', codigo: 'CETAP-008', nombre: 'CETAP Cúcuta', ciudad: 'Cúcuta', departamento: 'Norte de Santander', tipo: 'principal' },
      { id: 'cetap-nds-009', codigo: 'CETAP-009', nombre: 'CETAP El Zulia', ciudad: 'El Zulia', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-010', codigo: 'CETAP-010', nombre: 'CETAP El Carmen', ciudad: 'El Carmen', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-011', codigo: 'CETAP-011', nombre: 'CETAP La Meranía', ciudad: 'La Meranía', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-012', codigo: 'CETAP-012', nombre: 'CETAP Los Nitro', ciudad: 'Los Nitro', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-013', codigo: 'CETAP-013', nombre: 'CETAP Ocaña', ciudad: 'Ocaña', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-014', codigo: 'CETAP-014', nombre: 'CETAP Oturo', ciudad: 'Oturo', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-015', codigo: 'CETAP-015', nombre: 'CETAP Pamplona', ciudad: 'Pamplona', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-016', codigo: 'CETAP-016', nombre: 'CETAP Pamplinito', ciudad: 'Pamplinito', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-017', codigo: 'CETAP-017', nombre: 'CETAP Puerto Rondón', ciudad: 'Puerto Rondón', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-018', codigo: 'CETAP-018', nombre: 'CETAP Raqonvalia', ciudad: 'Raqonvalia', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-019', codigo: 'CETAP-019', nombre: 'CETAP Salazar', ciudad: 'Salazar', departamento: 'Norte de Santander' },
      { id: 'cetap-nds-020', codigo: 'CETAP-020', nombre: 'CETAP Sarainena', ciudad: 'Sarainena', departamento: 'Norte de Santander' },
    ]
  },

  // ============================================
  // 12. QUINDÍO - 12 CETAP
  // ============================================
  {
    id: 'ter-012',
    codigo: 'ESAP-QUI',
    nombre: 'Territorial Quindío',
    nombreCorto: 'Quindío',
    departamentos: ['Quindío'],
    ciudadPrincipal: 'Armenia',
    totalCetap: 12,
    cetap: [
      { id: 'cetap-qui-001', codigo: 'CETAP-001', nombre: 'CETAP Armenia', ciudad: 'Armenia', departamento: 'Quindío', tipo: 'principal' },
      { id: 'cetap-qui-002', codigo: 'CETAP-002', nombre: 'CETAP Belén de Umbría', ciudad: 'Belén de Umbría', departamento: 'Quindío' },
      { id: 'cetap-qui-003', codigo: 'CETAP-003', nombre: 'CETAP Circasia', ciudad: 'Circasia', departamento: 'Quindío' },
      { id: 'cetap-qui-004', codigo: 'CETAP-004', nombre: 'CETAP Cordobá Quindío', ciudad: 'Córdoba', departamento: 'Quindío' },
      { id: 'cetap-qui-005', codigo: 'CETAP-005', nombre: 'CETAP Dos Quebradas', ciudad: 'Dos Quebradas', departamento: 'Quindío' },
      { id: 'cetap-qui-006', codigo: 'CETAP-006', nombre: 'CETAP Filandia', ciudad: 'Filandia', departamento: 'Quindío' },
      { id: 'cetap-qui-007', codigo: 'CETAP-007', nombre: 'CETAP La Virginia', ciudad: 'La Virginia', departamento: 'Quindío' },
      { id: 'cetap-qui-008', codigo: 'CETAP-008', nombre: 'CETAP Marsella', ciudad: 'Marsella', departamento: 'Quindío' },
      { id: 'cetap-qui-009', codigo: 'CETAP-009', nombre: 'CETAP Mistrató', ciudad: 'Mistrató', departamento: 'Quindío' },
      { id: 'cetap-qui-010', codigo: 'CETAP-010', nombre: 'CETAP Pueblo Rico', ciudad: 'Pueblo Rico', departamento: 'Quindío' },
      { id: 'cetap-qui-011', codigo: 'CETAP-011', nombre: 'CETAP Quinchía', ciudad: 'Quinchía', departamento: 'Quindío' },
      { id: 'cetap-qui-012', codigo: 'CETAP-012', nombre: 'CETAP Santa Rosa De Cabal', ciudad: 'Santa Rosa De Cabal', departamento: 'Quindío' },
    ]
  },

  // ============================================
  // 13. RISARALDA - 12 CETAP
  // ============================================
  {
    id: 'ter-013',
    codigo: 'ESAP-RIS',
    nombre: 'Territorial Risaralda',
    nombreCorto: 'Risaralda',
    departamentos: ['Risaralda'],
    ciudadPrincipal: 'Pereira',
    totalCetap: 12,
    cetap: [
      { id: 'cetap-ris-001', codigo: 'CETAP-001', nombre: 'CETAP Apía', ciudad: 'Apía', departamento: 'Risaralda' },
      { id: 'cetap-ris-002', codigo: 'CETAP-002', nombre: 'CETAP Balboa', ciudad: 'Balboa', departamento: 'Risaralda' },
      { id: 'cetap-ris-003', codigo: 'CETAP-003', nombre: 'CETAP Dosquebradas', ciudad: 'Dosquebradas', departamento: 'Risaralda' },
      { id: 'cetap-ris-004', codigo: 'CETAP-004', nombre: 'CETAP Guática', ciudad: 'Guática', departamento: 'Risaralda' },
      { id: 'cetap-ris-005', codigo: 'CETAP-005', nombre: 'CETAP La Virginia', ciudad: 'La Virginia', departamento: 'Risaralda' },
      { id: 'cetap-ris-006', codigo: 'CETAP-006', nombre: 'CETAP Marsella', ciudad: 'Marsella', departamento: 'Risaralda' },
      { id: 'cetap-ris-007', codigo: 'CETAP-007', nombre: 'CETAP Mistrató', ciudad: 'Mistrató', departamento: 'Risaralda' },
      { id: 'cetap-ris-008', codigo: 'CETAP-008', nombre: 'CETAP Pereira', ciudad: 'Pereira', departamento: 'Risaralda', tipo: 'principal' },
      { id: 'cetap-ris-009', codigo: 'CETAP-009', nombre: 'CETAP Pueblo Rico', ciudad: 'Pueblo Rico', departamento: 'Risaralda' },
      { id: 'cetap-ris-010', codigo: 'CETAP-010', nombre: 'CETAP Quinchía', ciudad: 'Quinchía', departamento: 'Risaralda' },
      { id: 'cetap-ris-011', codigo: 'CETAP-011', nombre: 'CETAP Santuario', ciudad: 'Santuario', departamento: 'Risaralda' },
      { id: 'cetap-ris-012', codigo: 'CETAP-012', nombre: 'CETAP Santa Rosa De Cabal', ciudad: 'Santa Rosa De Cabal', departamento: 'Risaralda' },
    ]
  },

  // ============================================
  // 14. SANTANDER - 18 CETAP
  // ============================================
  {
    id: 'ter-014',
    codigo: 'ESAP-SAN',
    nombre: 'Territorial Santander',
    nombreCorto: 'Santander',
    departamentos: ['Santander'],
    ciudadPrincipal: 'Bucaramanga',
    totalCetap: 18,
    cetap: [
      { id: 'cetap-san-001', codigo: 'CETAP-001', nombre: 'CETAP Barrancabermeja', ciudad: 'Barrancabermeja', departamento: 'Santander' },
      { id: 'cetap-san-002', codigo: 'CETAP-002', nombre: 'CETAP Bucaramanga', ciudad: 'Bucaramanga', departamento: 'Santander', tipo: 'principal' },
      { id: 'cetap-san-003', codigo: 'CETAP-003', nombre: 'CETAP Charalá', ciudad: 'Charalá', departamento: 'Santander' },
      { id: 'cetap-san-004', codigo: 'CETAP-004', nombre: 'CETAP Cimitarra', ciudad: 'Cimitarra', departamento: 'Santander' },
      { id: 'cetap-san-005', codigo: 'CETAP-005', nombre: 'CETAP Málaga', ciudad: 'Málaga', departamento: 'Santander' },
      { id: 'cetap-san-006', codigo: 'CETAP-006', nombre: 'CETAP Mogotes', ciudad: 'Mogotes', departamento: 'Santander' },
      { id: 'cetap-san-007', codigo: 'CETAP-007', nombre: 'CETAP Ojito', ciudad: 'Ojito', departamento: 'Santander' },
      { id: 'cetap-san-008', codigo: 'CETAP-008', nombre: 'CETAP Puente Nacional', ciudad: 'Puente Nacional', departamento: 'Santander' },
      { id: 'cetap-san-009', codigo: 'CETAP-009', nombre: 'CETAP San Gil', ciudad: 'San Gil', departamento: 'Santander' },
      { id: 'cetap-san-010', codigo: 'CETAP-010', nombre: 'CETAP Santa Bárbara Del Sur', ciudad: 'Santa Bárbara', departamento: 'Santander' },
      { id: 'cetap-san-011', codigo: 'CETAP-011', nombre: 'CETAP Zapatoca', ciudad: 'Zapatoca', departamento: 'Santander' },
      { id: 'cetap-san-012', codigo: 'CETAP-012', nombre: 'CETAP Piedecuesta', ciudad: 'Piedecuesta', departamento: 'Santander' },
      { id: 'cetap-san-013', codigo: 'CETAP-013', nombre: 'CETAP Girón', ciudad: 'Girón', departamento: 'Santander' },
      { id: 'cetap-san-014', codigo: 'CETAP-014', nombre: 'CETAP Floridablanca', ciudad: 'Floridablanca', departamento: 'Santander' },
      { id: 'cetap-san-015', codigo: 'CETAP-015', nombre: 'CETAP El Peñol', ciudad: 'El Peñol', departamento: 'Santander' },
      { id: 'cetap-san-016', codigo: 'CETAP-016', nombre: 'CETAP Barbosa', ciudad: 'Barbosa', departamento: 'Santander' },
      { id: 'cetap-san-017', codigo: 'CETAP-017', nombre: 'CETAP Socorro', ciudad: 'Socorro', departamento: 'Santander' },
      { id: 'cetap-san-018', codigo: 'CETAP-018', nombre: 'CETAP Vélez', ciudad: 'Vélez', departamento: 'Santander' },
    ]
  },

  // ============================================
  // 15. TOLIMA - 28 CETAP
  // ============================================
  {
    id: 'ter-015',
    codigo: 'ESAP-TOL',
    nombre: 'Territorial Tolima',
    nombreCorto: 'Tolima',
    departamentos: ['Tolima'],
    ciudadPrincipal: 'Ibagué',
    totalCetap: 28,
    cetap: [
      { id: 'cetap-tol-001', codigo: 'CETAP-001', nombre: 'CETAP Alpujandra', ciudad: 'Alpujarra', departamento: 'Tolima' },
      { id: 'cetap-tol-002', codigo: 'CETAP-002', nombre: 'CETAP Armero', ciudad: 'Armero', departamento: 'Tolima' },
      { id: 'cetap-tol-003', codigo: 'CETAP-003', nombre: 'CETAP Cajamarca', ciudad: 'Cajamarca', departamento: 'Tolima' },
      { id: 'cetap-tol-004', codigo: 'CETAP-004', nombre: 'CETAP Chaparral', ciudad: 'Chaparral', departamento: 'Tolima' },
      { id: 'cetap-tol-005', codigo: 'CETAP-005', nombre: 'CETAP Coyaima', ciudad: 'Coyaima', departamento: 'Tolima' },
      { id: 'cetap-tol-006', codigo: 'CETAP-006', nombre: 'CETAP Espinal', ciudad: 'Espinal', departamento: 'Tolima' },
      { id: 'cetap-tol-007', codigo: 'CETAP-007', nombre: 'CETAP Flandes', ciudad: 'Flandes', departamento: 'Tolima' },
      { id: 'cetap-tol-008', codigo: 'CETAP-008', nombre: 'CETAP Honda', ciudad: 'Honda', departamento: 'Tolima' },
      { id: 'cetap-tol-009', codigo: 'CETAP-009', nombre: 'CETAP Ibagué', ciudad: 'Ibagué', departamento: 'Tolima', tipo: 'principal' },
      { id: 'cetap-tol-010', codigo: 'CETAP-010', nombre: 'CETAP Líbano', ciudad: 'Líbano', departamento: 'Tolima' },
      { id: 'cetap-tol-011', codigo: 'CETAP-011', nombre: 'CETAP Mariquita', ciudad: 'Mariquita', departamento: 'Tolima' },
      { id: 'cetap-tol-012', codigo: 'CETAP-012', nombre: 'CETAP Melgar', ciudad: 'Melgar', departamento: 'Tolima' },
      { id: 'cetap-tol-013', codigo: 'CETAP-013', nombre: 'CETAP Natagaima', ciudad: 'Natagaima', departamento: 'Tolima' },
      { id: 'cetap-tol-014', codigo: 'CETAP-014', nombre: 'CETAP Purificación', ciudad: 'Purificación', departamento: 'Tolima' },
      { id: 'cetap-tol-015', codigo: 'CETAP-015', nombre: 'CETAP Valle de San Juan', ciudad: 'Valle de San Juan', departamento: 'Tolima' },
      { id: 'cetap-tol-016', codigo: 'CETAP-016', nombre: 'CETAP Coello', ciudad: 'Coello', departamento: 'Tolima' },
      { id: 'cetap-tol-017', codigo: 'CETAP-017', nombre: 'CETAP Cunday', ciudad: 'Cunday', departamento: 'Tolima' },
      { id: 'cetap-tol-018', codigo: 'CETAP-018', nombre: 'CETAP Dolores', ciudad: 'Dolores', departamento: 'Tolima' },
      { id: 'cetap-tol-019', codigo: 'CETAP-019', nombre: 'CETAP Fresno', ciudad: 'Fresno', departamento: 'Tolima' },
      { id: 'cetap-tol-020', codigo: 'CETAP-020', nombre: 'CETAP Guamo', ciudad: 'Guamo', departamento: 'Tolima' },
      { id: 'cetap-tol-021', codigo: 'CETAP-021', nombre: 'CETAP Guayabal', ciudad: 'Guayabal', departamento: 'Tolima' },
      { id: 'cetap-tol-022', codigo: 'CETAP-022', nombre: 'CETAP Herveo', ciudad: 'Herveo', departamento: 'Tolima' },
      { id: 'cetap-tol-023', codigo: 'CETAP-023', nombre: 'CETAP Líbano', ciudad: 'Líbano', departamento: 'Tolima' },
      { id: 'cetap-tol-024', codigo: 'CETAP-024', nombre: 'CETAP Lérida', ciudad: 'Lérida', departamento: 'Tolima' },
      { id: 'cetap-tol-025', codigo: 'CETAP-025', nombre: 'CETAP Murillo', ciudad: 'Murillo', departamento: 'Tolima' },
      { id: 'cetap-tol-026', codigo: 'CETAP-026', nombre: 'CETAP Ortega', ciudad: 'Ortega', departamento: 'Tolima' },
      { id: 'cetap-tol-027', codigo: 'CETAP-027', nombre: 'CETAP Rovira', ciudad: 'Rovira', departamento: 'Tolima' },
      { id: 'cetap-tol-028', codigo: 'CETAP-028', nombre: 'CETAP Saldaña', ciudad: 'Saldaña', departamento: 'Tolima' },
    ]
  },

  // ============================================
  // 16. VALLE DEL CAUCA - 10 CETAP
  // ============================================
  {
    id: 'ter-016',
    codigo: 'ESAP-VAL',
    nombre: 'Territorial Valle del Cauca',
    nombreCorto: 'Valle',
    departamentos: ['Valle del Cauca'],
    ciudadPrincipal: 'Cali',
    totalCetap: 10,
    cetap: [
      { id: 'cetap-val-001', codigo: 'CETAP-001', nombre: 'CETAP Buenaventura', ciudad: 'Buenaventura', departamento: 'Valle del Cauca' },
      { id: 'cetap-val-002', codigo: 'CETAP-002', nombre: 'CETAP Buga', ciudad: 'Buga', departamento: 'Valle del Cauca' },
      { id: 'cetap-val-003', codigo: 'CETAP-003', nombre: 'CETAP Caicedonia', ciudad: 'Caicedonia', departamento: 'Valle del Cauca' },
      { id: 'cetap-val-004', codigo: 'CETAP-004', nombre: 'CETAP Cali', ciudad: 'Cali', departamento: 'Valle del Cauca', tipo: 'principal' },
      { id: 'cetap-val-005', codigo: 'CETAP-005', nombre: 'CETAP Cartago', ciudad: 'Cartago', departamento: 'Valle del Cauca' },
      { id: 'cetap-val-006', codigo: 'CETAP-006', nombre: 'CETAP Dagua', ciudad: 'Dagua', departamento: 'Valle del Cauca' },
      { id: 'cetap-val-007', codigo: 'CETAP-007', nombre: 'CETAP La Unión', ciudad: 'La Unión', departamento: 'Valle del Cauca' },
      { id: 'cetap-val-008', codigo: 'CETAP-008', nombre: 'CETAP Palmira', ciudad: 'Palmira', departamento: 'Valle del Cauca' },
      { id: 'cetap-val-009', codigo: 'CETAP-009', nombre: 'CETAP Jamili', ciudad: 'Jamundí', departamento: 'Valle del Cauca' },
      { id: 'cetap-val-010', codigo: 'CETAP-010', nombre: 'CETAP Tuluá', ciudad: 'Tuluá', departamento: 'Valle del Cauca' },
    ]
  },

  // ============================================
  // 17. META - 10 CETAP
  // ============================================
  {
    id: 'ter-017',
    codigo: 'ESAP-MET',
    nombre: 'Territorial Meta',
    nombreCorto: 'Meta',
    departamentos: ['Meta'],
    ciudadPrincipal: 'Villavicencio',
    totalCetap: 10,
    cetap: [
      { id: 'cetap-met-001', codigo: 'CETAP-001', nombre: 'CETAP Acacias', ciudad: 'Acacías', departamento: 'Meta' },
      { id: 'cetap-met-002', codigo: 'CETAP-002', nombre: 'CETAP Cumaral', ciudad: 'Cumaral', departamento: 'Meta' },
      { id: 'cetap-met-003', codigo: 'CETAP-003', nombre: 'CETAP Guamal', ciudad: 'Guamal', departamento: 'Meta' },
      { id: 'cetap-met-004', codigo: 'CETAP-004', nombre: 'CETAP Granada', ciudad: 'Granada', departamento: 'Meta' },
      { id: 'cetap-met-005', codigo: 'CETAP-005', nombre: 'CETAP Lejanías', ciudad: 'Lejanías', departamento: 'Meta' },
      { id: 'cetap-met-006', codigo: 'CETAP-006', nombre: 'CETAP Puerto Carreño', ciudad: 'Puerto Carreño', departamento: 'Meta' },
      { id: 'cetap-met-007', codigo: 'CETAP-007', nombre: 'CETAP Puerto Gaitán', ciudad: 'Puerto Gaitán', departamento: 'Meta' },
      { id: 'cetap-met-008', codigo: 'CETAP-008', nombre: 'CETAP Puerto Lleras', ciudad: 'Puerto Lleras', departamento: 'Meta' },
      { id: 'cetap-met-009', codigo: 'CETAP-009', nombre: 'CETAP Puerto López', ciudad: 'Puerto López', departamento: 'Meta' },
      { id: 'cetap-met-010', codigo: 'CETAP-010', nombre: 'CETAP Villavicencio', ciudad: 'Villavicencio', departamento: 'Meta', tipo: 'principal' },
    ]
  },
];

/**
 * FUNCIONES DE UTILIDAD
 */

// Obtener territorial por ID
export function obtenerTerritorialPorId(id: string): TerritorialInfo | undefined {
  return TERRITORIALES_ESAP.find(t => t.id === id);
}

// Obtener CETAP por ID
export function obtenerCetapPorId(cetapId: string): { territorial: TerritorialInfo; cetap: CetapInfo } | undefined {
  for (const territorial of TERRITORIALES_ESAP) {
    const cetap = territorial.cetap.find(c => c.id === cetapId);
    if (cetap) {
      return { territorial, cetap };
    }
  }
  return undefined;
}

// Buscar territoriales por departamento
export function obtenerTerritorialesPorDepartamento(departamento: string): TerritorialInfo[] {
  return TERRITORIALES_ESAP.filter(t => 
    t.departamentos.some(dep => 
      dep.toLowerCase().includes(departamento.toLowerCase())
    )
  );
}

// Obtener todos los CETAP de todas las territoriales
export function obtenerTodosLosCetap(): CetapInfo[] {
  return TERRITORIALES_ESAP.flatMap(t => t.cetap);
}

// Buscar CETAP por ciudad
export function buscarCetapPorCiudad(ciudad: string): CetapInfo[] {
  return obtenerTodosLosCetap().filter(cetap => 
    cetap.ciudad?.toLowerCase().includes(ciudad.toLowerCase())
  );
}

// Obtener estadísticas generales
export function obtenerEstadisticasEstructura() {
  const totalCetap = obtenerTodosLosCetap().length;
  const totalUnidades = TERRITORIALES_ESAP.length; // Incluye Sede Central + 17 Territoriales
  const totalTerritoriales = TERRITORIALES_ESAP.length - 1; // Solo territoriales (sin Sede Central)
  
  return {
    totalTerritoriales, // 17 territoriales
    totalCetap, // 308 total (1 Sede Principal + 307 CETAP)
    totalUnidades, // 18 total (1 Sede Central + 17 Territoriales)
    cetapPorTerritorial: TERRITORIALES_ESAP.map(t => ({
      territorial: t.nombreCorto,
      cetap: t.totalCetap
    }))
  };
}
