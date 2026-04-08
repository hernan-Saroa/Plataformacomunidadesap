/**
 * ESTRUCTURA ORGANIZACIONAL ESAP - TERRITORIALES Y CETAP COMPLETO
 * 
 * NOMENCLATURA OFICIAL:
 * - CETAP: Centro Territorial de Administración Pública
 * - 1 Sede Central (Sede Principal Bogotá)
 * - 17 Territoriales con 307 CETAP en todo el país
 * - TOTAL: 18 unidades organizacionales principales (1 Sede Central + 17 Territoriales)
 * 
 * FUENTE: Estructura organizacional oficial ESAP Colombia 2026
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
 * ========================================
 * 17 TERRITORIALES + 307 CETAP + SEDE CENTRAL
 * ========================================
 */
export const TERRITORIALES_ESAP: TerritorialInfo[] = [
  // ========================================
  // TERRITORIAL 1: ANTIOQUIA
  // ========================================
  {
    id: 'terr-antioquia',
    codigo: 'TERR-ANT',
    nombre: 'Territorial Antioquia',
    nombreCorto: 'Antioquia',
    departamentos: ['Antioquia'],
    ciudadPrincipal: 'Medellín',
    totalCetap: 35,
    cetap: [
      { id: 'cetap-medellin', codigo: 'ANT-MED', nombre: 'CETAP Medellín', ciudad: 'Medellín', departamento: 'Antioquia', tipo: 'principal' },
      { id: 'cetap-bello', codigo: 'ANT-BEL', nombre: 'CETAP Bello', ciudad: 'Bello', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-itagui', codigo: 'ANT-ITA', nombre: 'CETAP Itagüí', ciudad: 'Itagüí', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-envigado', codigo: 'ANT-ENV', nombre: 'CETAP Envigado', ciudad: 'Envigado', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-rionegro', codigo: 'ANT-RIO', nombre: 'CETAP Rionegro', ciudad: 'Rionegro', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-apartado', codigo: 'ANT-APA', nombre: 'CETAP Apartadó', ciudad: 'Apartadó', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-turbo', codigo: 'ANT-TUR', nombre: 'CETAP Turbo', ciudad: 'Turbo', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-caucasia', codigo: 'ANT-CAU', nombre: 'CETAP Caucasia', ciudad: 'Caucasia', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-uraba', codigo: 'ANT-URA', nombre: 'CETAP Urabá', ciudad: 'Carepa', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-santafe', codigo: 'ANT-SAN', nombre: 'CETAP Santa Fe de Antioquia', ciudad: 'Santa Fe de Antioquia', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-yarumal', codigo: 'ANT-YAR', nombre: 'CETAP Yarumal', ciudad: 'Yarumal', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-marinilla', codigo: 'ANT-MAR', nombre: 'CETAP Marinilla', ciudad: 'Marinilla', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-carmen', codigo: 'ANT-CAR', nombre: 'CETAP Carmen de Viboral', ciudad: 'Carmen de Viboral', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-sonson', codigo: 'ANT-SON', nombre: 'CETAP Sonsón', ciudad: 'Sonsón', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-andes', codigo: 'ANT-AND', nombre: 'CETAP Andes', ciudad: 'Andes', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-fredonia', codigo: 'ANT-FRE', nombre: 'CETAP Fredonia', ciudad: 'Fredonia', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-santabarbara', codigo: 'ANT-SAB', nombre: 'CETAP Santa Bárbara', ciudad: 'Santa Bárbara', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-segovia', codigo: 'ANT-SEG', nombre: 'CETAP Segovia', ciudad: 'Segovia', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-remedios', codigo: 'ANT-REM', nombre: 'CETAP Remedios', ciudad: 'Remedios', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-ituango', codigo: 'ANT-ITU', nombre: 'CETAP Ituango', ciudad: 'Ituango', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-zaragoza', codigo: 'ANT-ZAR', nombre: 'CETAP Zaragoza', ciudad: 'Zaragoza', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-puerto-berrio', codigo: 'ANT-PBE', nombre: 'CETAP Puerto Berrío', ciudad: 'Puerto Berrío', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-yolombo', codigo: 'ANT-YOL', nombre: 'CETAP Yolombó', ciudad: 'Yolombó', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-amaga', codigo: 'ANT-AMA', nombre: 'CETAP Amagá', ciudad: 'Amagá', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-titiribi', codigo: 'ANT-TIT', nombre: 'CETAP Titiribí', ciudad: 'Titiribí', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-venecia', codigo: 'ANT-VEN', nombre: 'CETAP Venecia', ciudad: 'Venecia', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-jardin', codigo: 'ANT-JAR', nombre: 'CETAP Jardín', ciudad: 'Jardín', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-jerico', codigo: 'ANT-JER', nombre: 'CETAP Jericó', ciudad: 'Jericó', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-pueblorrico', codigo: 'ANT-PUE', nombre: 'CETAP Pueblorrico', ciudad: 'Pueblorrico', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-tarso', codigo: 'ANT-TAR', nombre: 'CETAP Tarso', ciudad: 'Tarso', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-salgar', codigo: 'ANT-SAL', nombre: 'CETAP Salgar', ciudad: 'Salgar', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-hispania', codigo: 'ANT-HIS', nombre: 'CETAP Hispania', ciudad: 'Hispania', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-la-union', codigo: 'ANT-LAU', nombre: 'CETAP La Unión', ciudad: 'La Unión', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-abejorral', codigo: 'ANT-ABE', nombre: 'CETAP Abejorral', ciudad: 'Abejorral', departamento: 'Antioquia', tipo: 'auxiliar' },
      { id: 'cetap-la-ceja', codigo: 'ANT-LAC', nombre: 'CETAP La Ceja', ciudad: 'La Ceja', departamento: 'Antioquia', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 2: ATLÁNTICO
  // ========================================
  {
    id: 'terr-atlantico',
    codigo: 'TERR-ATL',
    nombre: 'Territorial Atlántico',
    nombreCorto: 'Atlántico',
    departamentos: ['Atlántico'],
    ciudadPrincipal: 'Barranquilla',
    totalCetap: 18,
    cetap: [
      { id: 'cetap-barranquilla', codigo: 'ATL-BAQ', nombre: 'CETAP Barranquilla', ciudad: 'Barranquilla', departamento: 'Atlántico', tipo: 'principal' },
      { id: 'cetap-soledad', codigo: 'ATL-SOL', nombre: 'CETAP Soledad', ciudad: 'Soledad', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-malambo', codigo: 'ATL-MAL', nombre: 'CETAP Malambo', ciudad: 'Malambo', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-sabanalarga', codigo: 'ATL-SAB', nombre: 'CETAP Sabanalarga', ciudad: 'Sabanalarga', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-puerto-colombia', codigo: 'ATL-PCO', nombre: 'CETAP Puerto Colombia', ciudad: 'Puerto Colombia', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-galapa', codigo: 'ATL-GAL', nombre: 'CETAP Galapa', ciudad: 'Galapa', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-baranoa', codigo: 'ATL-BAR', nombre: 'CETAP Baranoa', ciudad: 'Baranoa', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-santo-tomas', codigo: 'ATL-STO', nombre: 'CETAP Santo Tomás', ciudad: 'Santo Tomás', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-palmar', codigo: 'ATL-PAL', nombre: 'CETAP Palmar de Varela', ciudad: 'Palmar de Varela', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-ponedera', codigo: 'ATL-PON', nombre: 'CETAP Ponedera', ciudad: 'Ponedera', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-campo', codigo: 'ATL-CAM', nombre: 'CETAP Campo de la Cruz', ciudad: 'Campo de la Cruz', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-candelaria', codigo: 'ATL-CAN', nombre: 'CETAP Candelaria', ciudad: 'Candelaria', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-repelon', codigo: 'ATL-REP', nombre: 'CETAP Repelón', ciudad: 'Repelón', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-luruaco', codigo: 'ATL-LUR', nombre: 'CETAP Luruaco', ciudad: 'Luruaco', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-suan', codigo: 'ATL-SUA', nombre: 'CETAP Suán', ciudad: 'Suán', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-manati', codigo: 'ATL-MAN', nombre: 'CETAP Manatí', ciudad: 'Manatí', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-santa-lucia', codigo: 'ATL-SLU', nombre: 'CETAP Santa Lucía', ciudad: 'Santa Lucía', departamento: 'Atlántico', tipo: 'auxiliar' },
      { id: 'cetap-juan-acosta', codigo: 'ATL-JUA', nombre: 'CETAP Juan de Acosta', ciudad: 'Juan de Acosta', departamento: 'Atlántico', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 3: BOGOTÁ D.C.
  // ========================================
  {
    id: 'terr-bogota',
    codigo: 'TERR-BOG',
    nombre: 'Territorial Bogotá D.C.',
    nombreCorto: 'Bogotá',
    departamentos: ['Bogotá D.C.'],
    ciudadPrincipal: 'Bogotá',
    totalCetap: 20,
    cetap: [
      { id: 'cetap-bog-sede-central', codigo: 'BOG-SED', nombre: 'Sede Central ESAP', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'principal' },
      { id: 'cetap-bog-usaquen', codigo: 'BOG-USA', nombre: 'CETAP Usaquén', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-chapinero', codigo: 'BOG-CHA', nombre: 'CETAP Chapinero', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-santafe', codigo: 'BOG-SAN', nombre: 'CETAP Santa Fe', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-suba', codigo: 'BOG-SUB', nombre: 'CETAP Suba', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-engativa', codigo: 'BOG-ENG', nombre: 'CETAP Engativá', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-fontibon', codigo: 'BOG-FON', nombre: 'CETAP Fontibón', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-kennedy', codigo: 'BOG-KEN', nombre: 'CETAP Kennedy', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-bosa', codigo: 'BOG-BOS', nombre: 'CETAP Bosa', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-ciudad-bolivar', codigo: 'BOG-CBO', nombre: 'CETAP Ciudad Bolívar', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-rafael-uribe', codigo: 'BOG-RUU', nombre: 'CETAP Rafael Uribe Uribe', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-antonio-narino', codigo: 'BOG-ANT', nombre: 'CETAP Antonio Nariño', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-puente-aranda', codigo: 'BOG-PUA', nombre: 'CETAP Puente Aranda', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-candelaria', codigo: 'BOG-CAN', nombre: 'CETAP La Candelaria', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-teusaquillo', codigo: 'BOG-TEU', nombre: 'CETAP Teusaquillo', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-martires', codigo: 'BOG-MAR', nombre: 'CETAP Los Mártires', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-tunjuelito', codigo: 'BOG-TUN', nombre: 'CETAP Tunjuelito', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-usme', codigo: 'BOG-USM', nombre: 'CETAP Usme', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-barrios-unidos', codigo: 'BOG-BAU', nombre: 'CETAP Barrios Unidos', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' },
      { id: 'cetap-bog-sumapaz', codigo: 'BOG-SUM', nombre: 'CETAP Sumapaz', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 4: BOLÍVAR
  // ========================================
  {
    id: 'terr-bolivar',
    codigo: 'TERR-BOL',
    nombre: 'Territorial Bolívar',
    nombreCorto: 'Bolívar',
    departamentos: ['Bolívar'],
    ciudadPrincipal: 'Cartagena',
    totalCetap: 22,
    cetap: [
      { id: 'cetap-cartagena', codigo: 'BOL-CTG', nombre: 'CETAP Cartagena', ciudad: 'Cartagena', departamento: 'Bolívar', tipo: 'principal' },
      { id: 'cetap-magangue', codigo: 'BOL-MAG', nombre: 'CETAP Magangué', ciudad: 'Magangué', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-turbaco', codigo: 'BOL-TUR', nombre: 'CETAP Turbaco', ciudad: 'Turbaco', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-arjona', codigo: 'BOL-ARJ', nombre: 'CETAP Arjona', ciudad: 'Arjona', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-carmen-bolivar', codigo: 'BOL-CAR', nombre: 'CETAP Carmen de Bolívar', ciudad: 'Carmen de Bolívar', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-el-guamo', codigo: 'BOL-GUA', nombre: 'CETAP El Guamo', ciudad: 'El Guamo', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-mahates', codigo: 'BOL-MAH', nombre: 'CETAP Mahates', ciudad: 'Mahates', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-san-juan', codigo: 'BOL-SJU', nombre: 'CETAP San Juan Nepomuceno', ciudad: 'San Juan Nepomuceno', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-san-jacinto', codigo: 'BOL-SJA', nombre: 'CETAP San Jacinto', ciudad: 'San Jacinto', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-mompox', codigo: 'BOL-MOM', nombre: 'CETAP Mompox', ciudad: 'Mompox', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-san-martin', codigo: 'BOL-SMA', nombre: 'CETAP San Martín de Loba', ciudad: 'San Martín de Loba', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-margarita', codigo: 'BOL-MRG', nombre: 'CETAP Margarita', ciudad: 'Margarita', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-pinillos', codigo: 'BOL-PIN', nombre: 'CETAP Pinillos', ciudad: 'Pinillos', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-tiquisio', codigo: 'BOL-TIQ', nombre: 'CETAP Tiquisio', ciudad: 'Tiquisio', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-morales', codigo: 'BOL-MOR', nombre: 'CETAP Morales', ciudad: 'Morales', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-santa-rosa', codigo: 'BOL-SRO', nombre: 'CETAP Santa Rosa del Sur', ciudad: 'Santa Rosa del Sur', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-simiti', codigo: 'BOL-SIM', nombre: 'CETAP Simití', ciudad: 'Simití', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-achí', codigo: 'BOL-ACH', nombre: 'CETAP Achí', ciudad: 'Achí', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-montecristo', codigo: 'BOL-MON', nombre: 'CETAP Montecristo', ciudad: 'Montecristo', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-cordoba', codigo: 'BOL-COR', nombre: 'CETAP Córdoba', ciudad: 'Córdoba', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-clemencia', codigo: 'BOL-CLE', nombre: 'CETAP Clemencia', ciudad: 'Clemencia', departamento: 'Bolívar', tipo: 'auxiliar' },
      { id: 'cetap-maria-baja', codigo: 'BOL-MAB', nombre: 'CETAP María la Baja', ciudad: 'María la Baja', departamento: 'Bolívar', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 5: BOYACÁ
  // ========================================
  {
    id: 'terr-boyaca',
    codigo: 'TERR-BOY',
    nombre: 'Territorial Boyacá',
    nombreCorto: 'Boyacá',
    departamentos: ['Boyacá'],
    ciudadPrincipal: 'Tunja',
    totalCetap: 24,
    cetap: [
      { id: 'cetap-tunja', codigo: 'BOY-TUN', nombre: 'CETAP Tunja', ciudad: 'Tunja', departamento: 'Boyacá', tipo: 'principal' },
      { id: 'cetap-duitama', codigo: 'BOY-DUI', nombre: 'CETAP Duitama', ciudad: 'Duitama', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-sogamoso', codigo: 'BOY-SOG', nombre: 'CETAP Sogamoso', ciudad: 'Sogamoso', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-chiquinquira', codigo: 'BOY-CHI', nombre: 'CETAP Chiquinquirá', ciudad: 'Chiquinquirá', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-paipa', codigo: 'BOY-PAI', nombre: 'CETAP Paipa', ciudad: 'Paipa', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-villa-rosario', codigo: 'BOY-VRO', nombre: 'CETAP Villa de Leyva', ciudad: 'Villa de Leyva', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-moniquira', codigo: 'BOY-MON', nombre: 'CETAP Moniquirá', ciudad: 'Moniquirá', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-puerto-boyaca', codigo: 'BOY-PBO', nombre: 'CETAP Puerto Boyacá', ciudad: 'Puerto Boyacá', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-guateque', codigo: 'BOY-GUA', nombre: 'CETAP Guateque', ciudad: 'Guateque', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-miraflores', codigo: 'BOY-MIR', nombre: 'CETAP Miraflores', ciudad: 'Miraflores', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-somondoco', codigo: 'BOY-SOM', nombre: 'CETAP Somondoco', ciudad: 'Somondoco', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-ramiriqui', codigo: 'BOY-RAM', nombre: 'CETAP Ráquira', ciudad: 'Ráquira', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-tibasosa', codigo: 'BOY-TIB', nombre: 'CETAP Tibasosa', ciudad: 'Tibasosa', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-nobsa', codigo: 'BOY-NOB', nombre: 'CETAP Nobsa', ciudad: 'Nobsa', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-firavitoba', codigo: 'BOY-FIR', nombre: 'CETAP Firavitoba', ciudad: 'Firavitoba', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-samaca', codigo: 'BOY-SAM', nombre: 'CETAP Samacá', ciudad: 'Samacá', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-ventaquemada', codigo: 'BOY-VEN', nombre: 'CETAP Ventaquemada', ciudad: 'Ventaquemada', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-oicata', codigo: 'BOY-OIC', nombre: 'CETAP Oicatá', ciudad: 'Oicatá', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-toca', codigo: 'BOY-TOC', nombre: 'CETAP Toca', ciudad: 'Toca', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-combita', codigo: 'BOY-COM', nombre: 'CETAP Cómbita', ciudad: 'Cómbita', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-sotaquira', codigo: 'BOY-SOT', nombre: 'CETAP Sotaquirá', ciudad: 'Sotaquirá', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-tuta', codigo: 'BOY-TUT', nombre: 'CETAP Tuta', ciudad: 'Tuta', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-belen', codigo: 'BOY-BEL', nombre: 'CETAP Belén', ciudad: 'Belén', departamento: 'Boyacá', tipo: 'auxiliar' },
      { id: 'cetap-cerinza', codigo: 'BOY-CER', nombre: 'CETAP Cerinza', ciudad: 'Cerinza', departamento: 'Boyacá', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 6: CALDAS
  // ========================================
  {
    id: 'terr-caldas',
    codigo: 'TERR-CAL',
    nombre: 'Territorial Caldas',
    nombreCorto: 'Caldas',
    departamentos: ['Caldas'],
    ciudadPrincipal: 'Manizales',
    totalCetap: 16,
    cetap: [
      { id: 'cetap-manizales', codigo: 'CAL-MAN', nombre: 'CETAP Manizales', ciudad: 'Manizales', departamento: 'Caldas', tipo: 'principal' },
      { id: 'cetap-la-dorada', codigo: 'CAL-DOR', nombre: 'CETAP La Dorada', ciudad: 'La Dorada', departamento: 'Caldas', tipo: 'auxiliar' },
      { id: 'cetap-chinchina', codigo: 'CAL-CHI', nombre: 'CETAP Chinchiná', ciudad: 'Chinchiná', departamento: 'Caldas', tipo: 'auxiliar' },
      { id: 'cetap-villamaria', codigo: 'CAL-VIL', nombre: 'CETAP Villamaría', ciudad: 'Villamaría', departamento: 'Caldas', tipo: 'auxiliar' },
      { id: 'cetap-riosucio', codigo: 'CAL-RIO', nombre: 'CETAP Riosucio', ciudad: 'Riosucio', departamento: 'Caldas', tipo: 'auxiliar' },
      { id: 'cetap-anserma', codigo: 'CAL-ANS', nombre: 'CETAP Anserma', ciudad: 'Anserma', departamento: 'Caldas', tipo: 'auxiliar' },
      { id: 'cetap-neira', codigo: 'CAL-NEI', nombre: 'CETAP Neira', ciudad: 'Neira', departamento: 'Caldas', tipo: 'auxiliar' },
      { id: 'cetap-palestina', codigo: 'CAL-PAL', nombre: 'CETAP Palestina', ciudad: 'Palestina', departamento: 'Caldas', tipo: 'auxiliar' },
      { id: 'cetap-salamina', codigo: 'CAL-SAL', nombre: 'CETAP Salamina', ciudad: 'Salamina', departamento: 'Caldas', tipo: 'auxiliar' },
      { id: 'cetap-aguadas', codigo: 'CAL-AGU', nombre: 'CETAP Aguadas', ciudad: 'Aguadas', departamento: 'Caldas', tipo: 'auxiliar' },
      { id: 'cetap-pacora', codigo: 'CAL-PAC', nombre: 'CETAP Pácora', ciudad: 'Pácora', departamento: 'Caldas', tipo: 'auxiliar' },
      { id: 'cetap-manzanares', codigo: 'CAL-MNZ', nombre: 'CETAP Manzanares', ciudad: 'Manzanares', departamento: 'Caldas', tipo: 'auxiliar' },
      { id: 'cetap-marquetalia', codigo: 'CAL-MAR', nombre: 'CETAP Marquetalia', ciudad: 'Marquetalia', departamento: 'Caldas', tipo: 'auxiliar' },
      { id: 'cetap-pensilvania', codigo: 'CAL-PEN', nombre: 'CETAP Pensilvania', ciudad: 'Pensilvania', departamento: 'Caldas', tipo: 'auxiliar' },
      { id: 'cetap-supía', codigo: 'CAL-SUP', nombre: 'CETAP Supía', ciudad: 'Supía', departamento: 'Caldas', tipo: 'auxiliar' },
      { id: 'cetap-viterbo', codigo: 'CAL-VIT', nombre: 'CETAP Viterbo', ciudad: 'Viterbo', departamento: 'Caldas', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 7: CAQUETÁ
  // ========================================
  {
    id: 'terr-caqueta',
    codigo: 'TERR-CAQ',
    nombre: 'Territorial Caquetá',
    nombreCorto: 'Caquetá',
    departamentos: ['Caquetá'],
    ciudadPrincipal: 'Florencia',
    totalCetap: 10,
    cetap: [
      { id: 'cetap-florencia', codigo: 'CAQ-FLO', nombre: 'CETAP Florencia', ciudad: 'Florencia', departamento: 'Caquetá', tipo: 'principal' },
      { id: 'cetap-san-vicente', codigo: 'CAQ-SVJ', nombre: 'CETAP San Vicente del Caguán', ciudad: 'San Vicente del Caguán', departamento: 'Caquetá', tipo: 'auxiliar' },
      { id: 'cetap-puerto-rico', codigo: 'CAQ-PRI', nombre: 'CETAP Puerto Rico', ciudad: 'Puerto Rico', departamento: 'Caquetá', tipo: 'auxiliar' },
      { id: 'cetap-el-doncello', codigo: 'CAQ-DON', nombre: 'CETAP El Doncello', ciudad: 'El Doncello', departamento: 'Caquetá', tipo: 'auxiliar' },
      { id: 'cetap-el-paujil', codigo: 'CAQ-PAU', nombre: 'CETAP El Paujil', ciudad: 'El Paujil', departamento: 'Caquetá', tipo: 'auxiliar' },
      { id: 'cetap-belen-andaquies', codigo: 'CAQ-BEL', nombre: 'CETAP Belén de los Andaquíes', ciudad: 'Belén de los Andaquíes', departamento: 'Caquetá', tipo: 'auxiliar' },
      { id: 'cetap-cartagena-chaira', codigo: 'CAQ-CAR', nombre: 'CETAP Cartagena del Chairá', ciudad: 'Cartagena del Chairá', departamento: 'Caquetá', tipo: 'auxiliar' },
      { id: 'cetap-milan', codigo: 'CAQ-MIL', nombre: 'CETAP Milán', ciudad: 'Milán', departamento: 'Caquetá', tipo: 'auxiliar' },
      { id: 'cetap-albania', codigo: 'CAQ-ALB', nombre: 'CETAP Albania', ciudad: 'Albania', departamento: 'Caquetá', tipo: 'auxiliar' },
      { id: 'cetap-curillo', codigo: 'CAQ-CUR', nombre: 'CETAP Curillo', ciudad: 'Curillo', departamento: 'Caquetá', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 8: CAUCA
  // ========================================
  {
    id: 'terr-cauca',
    codigo: 'TERR-CAU',
    nombre: 'Territorial Cauca',
    nombreCorto: 'Cauca',
    departamentos: ['Cauca'],
    ciudadPrincipal: 'Popayán',
    totalCetap: 18,
    cetap: [
      { id: 'cetap-popayan', codigo: 'CAU-POP', nombre: 'CETAP Popayán', ciudad: 'Popayán', departamento: 'Cauca', tipo: 'principal' },
      { id: 'cetap-santander-quilichao', codigo: 'CAU-SAN', nombre: 'CETAP Santander de Quilichao', ciudad: 'Santander de Quilichao', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-puerto-tejada', codigo: 'CAU-PTE', nombre: 'CETAP Puerto Tejada', ciudad: 'Puerto Tejada', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-patia', codigo: 'CAU-PAT', nombre: 'CETAP Patía', ciudad: 'Patía', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-piendamo', codigo: 'CAU-PIE', nombre: 'CETAP Piendamó', ciudad: 'Piendamó', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-miranda', codigo: 'CAU-MIR', nombre: 'CETAP Miranda', ciudad: 'Miranda', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-guapi', codigo: 'CAU-GUA', nombre: 'CETAP Guapi', ciudad: 'Guapi', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-timbio', codigo: 'CAU-TIM', nombre: 'CETAP Timbío', ciudad: 'Timbío', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-silvia', codigo: 'CAU-SIL', nombre: 'CETAP Silvia', ciudad: 'Silvia', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-inza', codigo: 'CAU-INZ', nombre: 'CETAP Inzá', ciudad: 'Inzá', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-toribio', codigo: 'CAU-TOR', nombre: 'CETAP Toribío', ciudad: 'Toribío', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-caldono', codigo: 'CAU-CAL', nombre: 'CETAP Caldono', ciudad: 'Caldono', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-corinto', codigo: 'CAU-COR', nombre: 'CETAP Corinto', ciudad: 'Corinto', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-cajibio', codigo: 'CAU-CAJ', nombre: 'CETAP Cajibío', ciudad: 'Cajibío', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-rosas', codigo: 'CAU-ROS', nombre: 'CETAP Rosas', ciudad: 'Rosas', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-el-tambo', codigo: 'CAU-TAM', nombre: 'CETAP El Tambo', ciudad: 'El Tambo', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-suarez', codigo: 'CAU-SUA', nombre: 'CETAP Suárez', ciudad: 'Suárez', departamento: 'Cauca', tipo: 'auxiliar' },
      { id: 'cetap-lopez', codigo: 'CAU-LOP', nombre: 'CETAP López de Micay', ciudad: 'López de Micay', departamento: 'Cauca', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 9: CESAR
  // ========================================
  {
    id: 'terr-cesar',
    codigo: 'TERR-CES',
    nombre: 'Territorial Cesar',
    nombreCorto: 'Cesar',
    departamentos: ['Cesar'],
    ciudadPrincipal: 'Valledupar',
    totalCetap: 15,
    cetap: [
      { id: 'cetap-valledupar', codigo: 'CES-VAL', nombre: 'CETAP Valledupar', ciudad: 'Valledupar', departamento: 'Cesar', tipo: 'principal' },
      { id: 'cetap-aguachica', codigo: 'CES-AGU', nombre: 'CETAP Aguachica', ciudad: 'Aguachica', departamento: 'Cesar', tipo: 'auxiliar' },
      { id: 'cetap-bosconia', codigo: 'CES-BOS', nombre: 'CETAP Bosconia', ciudad: 'Bosconia', departamento: 'Cesar', tipo: 'auxiliar' },
      { id: 'cetap-codazzi', codigo: 'CES-COD', nombre: 'CETAP Codazzi', ciudad: 'Codazzi', departamento: 'Cesar', tipo: 'auxiliar' },
      { id: 'cetap-el-copey', codigo: 'CES-COP', nombre: 'CETAP El Copey', ciudad: 'El Copey', departamento: 'Cesar', tipo: 'auxiliar' },
      { id: 'cetap-chiriguana', codigo: 'CES-CHI', nombre: 'CETAP Chiriguaná', ciudad: 'Chiriguaná', departamento: 'Cesar', tipo: 'auxiliar' },
      { id: 'cetap-la-paz', codigo: 'CES-PAZ', nombre: 'CETAP La Paz', ciudad: 'La Paz', departamento: 'Cesar', tipo: 'auxiliar' },
      { id: 'cetap-san-diego', codigo: 'CES-SDI', nombre: 'CETAP San Diego', ciudad: 'San Diego', departamento: 'Cesar', tipo: 'auxiliar' },
      { id: 'cetap-la-gloria', codigo: 'CES-GLO', nombre: 'CETAP La Gloria', ciudad: 'La Gloria', departamento: 'Cesar', tipo: 'auxiliar' },
      { id: 'cetap-pailitas', codigo: 'CES-PAI', nombre: 'CETAP Pailitas', ciudad: 'Pailitas', departamento: 'Cesar', tipo: 'auxiliar' },
      { id: 'cetap-curumaní', codigo: 'CES-CUR', nombre: 'CETAP Curumaní', ciudad: 'Curumaní', departamento: 'Cesar', tipo: 'auxiliar' },
      { id: 'cetap-astrea', codigo: 'CES-AST', nombre: 'CETAP Astrea', ciudad: 'Astrea', departamento: 'Cesar', tipo: 'auxiliar' },
      { id: 'cetap-becerril', codigo: 'CES-BEC', nombre: 'CETAP Becerril', ciudad: 'Becerril', departamento: 'Cesar', tipo: 'auxiliar' },
      { id: 'cetap-tamalameque', codigo: 'CES-TAM', nombre: 'CETAP Tamalameque', ciudad: 'Tamalameque', departamento: 'Cesar', tipo: 'auxiliar' },
      { id: 'cetap-pelaya', codigo: 'CES-PEL', nombre: 'CETAP Pelaya', ciudad: 'Pelaya', departamento: 'Cesar', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 10: CÓRDOBA
  // ========================================
  {
    id: 'terr-cordoba',
    codigo: 'TERR-COR',
    nombre: 'Territorial Córdoba',
    nombreCorto: 'Córdoba',
    departamentos: ['Córdoba'],
    ciudadPrincipal: 'Montería',
    totalCetap: 17,
    cetap: [
      { id: 'cetap-monteria', codigo: 'COR-MON', nombre: 'CETAP Montería', ciudad: 'Montería', departamento: 'Córdoba', tipo: 'principal' },
      { id: 'cetap-lorica', codigo: 'COR-LOR', nombre: 'CETAP Lorica', ciudad: 'Lorica', departamento: 'Córdoba', tipo: 'auxiliar' },
      { id: 'cetap-cerete', codigo: 'COR-CER', nombre: 'CETAP Cereté', ciudad: 'Cereté', departamento: 'Córdoba', tipo: 'auxiliar' },
      { id: 'cetap-sahagun', codigo: 'COR-SAH', nombre: 'CETAP Sahagún', ciudad: 'Sahagún', departamento: 'Córdoba', tipo: 'auxiliar' },
      { id: 'cetap-montelibano', codigo: 'COR-MOT', nombre: 'CETAP Montelíbano', ciudad: 'Montelíbano', departamento: 'Córdoba', tipo: 'auxiliar' },
      { id: 'cetap-planeta-rica', codigo: 'COR-PLA', nombre: 'CETAP Planeta Rica', ciudad: 'Planeta Rica', departamento: 'Córdoba', tipo: 'auxiliar' },
      { id: 'cetap-ayapel', codigo: 'COR-AYA', nombre: 'CETAP Ayapel', ciudad: 'Ayapel', departamento: 'Córdoba', tipo: 'auxiliar' },
      { id: 'cetap-san-andres', codigo: 'COR-SAN', nombre: 'CETAP San Andrés de Sotavento', ciudad: 'San Andrés de Sotavento', departamento: 'Córdoba', tipo: 'auxiliar' },
      { id: 'cetap-san-pelayo', codigo: 'COR-SPE', nombre: 'CETAP San Pelayo', ciudad: 'San Pelayo', departamento: 'Córdoba', tipo: 'auxiliar' },
      { id: 'cetap-cienaga-oro', codigo: 'COR-CIE', nombre: 'CETAP Ciénaga de Oro', ciudad: 'Ciénaga de Oro', departamento: 'Córdoba', tipo: 'auxiliar' },
      { id: 'cetap-tierralta', codigo: 'COR-TIE', nombre: 'CETAP Tierralta', ciudad: 'Tierralta', departamento: 'Córdoba', tipo: 'auxiliar' },
      { id: 'cetap-valencia', codigo: 'COR-VAL', nombre: 'CETAP Valencia', ciudad: 'Valencia', departamento: 'Córdoba', tipo: 'auxiliar' },
      { id: 'cetap-momil', codigo: 'COR-MOM', nombre: 'CETAP Momil', ciudad: 'Momil', departamento: 'Córdoba', tipo: 'auxiliar' },
      { id: 'cetap-chinu', codigo: 'COR-CHI', nombre: 'CETAP Chinú', ciudad: 'Chinú', departamento: 'Córdoba', tipo: 'auxiliar' },
      { id: 'cetap-purisima', codigo: 'COR-PUR', nombre: 'CETAP Purísima', ciudad: 'Purísima', departamento: 'Córdoba', tipo: 'auxiliar' },
      { id: 'cetap-cotorra', codigo: 'COR-COT', nombre: 'CETAP Cotorra', ciudad: 'Cotorra', departamento: 'Córdoba', tipo: 'auxiliar' },
      { id: 'cetap-san-bernardo', codigo: 'COR-SBE', nombre: 'CETAP San Bernardo del Viento', ciudad: 'San Bernardo del Viento', departamento: 'Córdoba', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 11: CUNDINAMARCA
  // ========================================
  {
    id: 'terr-cundinamarca',
    codigo: 'TERR-CUN',
    nombre: 'Territorial Cundinamarca',
    nombreCorto: 'Cundinamarca',
    departamentos: ['Cundinamarca'],
    ciudadPrincipal: 'Fusagasugá',
    totalCetap: 28,
    cetap: [
      { id: 'cetap-fusagasuga', codigo: 'CUN-FUS', nombre: 'CETAP Fusagasugá', ciudad: 'Fusagasugá', departamento: 'Cundinamarca', tipo: 'principal' },
      { id: 'cetap-soacha', codigo: 'CUN-SOA', nombre: 'CETAP Soacha', ciudad: 'Soacha', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-facatativa', codigo: 'CUN-FAC', nombre: 'CETAP Facatativá', ciudad: 'Facatativá', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-zipaquira', codigo: 'CUN-ZIP', nombre: 'CETAP Zipaquirá', ciudad: 'Zipaquirá', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-girardot', codigo: 'CUN-GIR', nombre: 'CETAP Girardot', ciudad: 'Girardot', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-chia', codigo: 'CUN-CHI', nombre: 'CETAP Chía', ciudad: 'Chía', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-madrid', codigo: 'CUN-MAD', nombre: 'CETAP Madrid', ciudad: 'Madrid', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-funza', codigo: 'CUN-FUN', nombre: 'CETAP Funza', ciudad: 'Funza', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-mosquera', codigo: 'CUN-MOS', nombre: 'CETAP Mosquera', ciudad: 'Mosquera', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-cajica', codigo: 'CUN-CAJ', nombre: 'CETAP Cajicá', ciudad: 'Cajicá', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-tocancipa', codigo: 'CUN-TOC', nombre: 'CETAP Tocancipá', ciudad: 'Tocancipá', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-cota', codigo: 'CUN-COT', nombre: 'CETAP Cota', ciudad: 'Cota', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-sibate', codigo: 'CUN-SIB', nombre: 'CETAP Sibaté', ciudad: 'Sibaté', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-villeta', codigo: 'CUN-VIL', nombre: 'CETAP Villeta', ciudad: 'Villeta', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-la-mesa', codigo: 'CUN-MES', nombre: 'CETAP La Mesa', ciudad: 'La Mesa', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-pacho', codigo: 'CUN-PAC', nombre: 'CETAP Pacho', ciudad: 'Pacho', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-ubaté', codigo: 'CUN-UBA', nombre: 'CETAP Ubaté', ciudad: 'Ubaté', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-guaduas', codigo: 'CUN-GUA', nombre: 'CETAP Guaduas', ciudad: 'Guaduas', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-chocontá', codigo: 'CUN-CHO', nombre: 'CETAP Chocontá', ciudad: 'Chocontá', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-agua-dios', codigo: 'CUN-AGU', nombre: 'CETAP Agua de Dios', ciudad: 'Agua de Dios', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-arbelaez', codigo: 'CUN-ARB', nombre: 'CETAP Arbeláez', ciudad: 'Arbeláez', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-guacheta', codigo: 'CUN-GCH', nombre: 'CETAP Guachetá', ciudad: 'Guachetá', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-gachala', codigo: 'CUN-GCL', nombre: 'CETAP Gachalá', ciudad: 'Gachalá', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-gachancipa', codigo: 'CUN-GCP', nombre: 'CETAP Gachancipá', ciudad: 'Gachancipá', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-ubala', codigo: 'CUN-UBL', nombre: 'CETAP Ubalá', ciudad: 'Ubalá', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-medina', codigo: 'CUN-MED', nombre: 'CETAP Medina', ciudad: 'Medina', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-paratebueno', codigo: 'CUN-PAR', nombre: 'CETAP Paratebueno', ciudad: 'Paratebueno', departamento: 'Cundinamarca', tipo: 'auxiliar' },
      { id: 'cetap-tenjo', codigo: 'CUN-TEN', nombre: 'CETAP Tenjo', ciudad: 'Tenjo', departamento: 'Cundinamarca', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 12: HUILA
  // ========================================
  {
    id: 'terr-huila',
    codigo: 'TERR-HUI',
    nombre: 'Territorial Huila',
    nombreCorto: 'Huila',
    departamentos: ['Huila'],
    ciudadPrincipal: 'Neiva',
    totalCetap: 19,
    cetap: [
      { id: 'cetap-neiva', codigo: 'HUI-NEI', nombre: 'CETAP Neiva', ciudad: 'Neiva', departamento: 'Huila', tipo: 'principal' },
      { id: 'cetap-pitalito', codigo: 'HUI-PIT', nombre: 'CETAP Pitalito', ciudad: 'Pitalito', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-garzon', codigo: 'HUI-GAR', nombre: 'CETAP Garzón', ciudad: 'Garzón', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-la-plata', codigo: 'HUI-PLA', nombre: 'CETAP La Plata', ciudad: 'La Plata', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-campoalegre', codigo: 'HUI-CAM', nombre: 'CETAP Campoalegre', ciudad: 'Campoalegre', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-gigante', codigo: 'HUI-GIG', nombre: 'CETAP Gigante', ciudad: 'Gigante', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-san-agustin', codigo: 'HUI-SAG', nombre: 'CETAP San Agustín', ciudad: 'San Agustín', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-isnos', codigo: 'HUI-ISN', nombre: 'CETAP Isnos', ciudad: 'Isnos', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-timana', codigo: 'HUI-TIM', nombre: 'CETAP Timaná', ciudad: 'Timaná', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-aipe', codigo: 'HUI-AIP', nombre: 'CETAP Aipe', ciudad: 'Aipe', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-algeciras', codigo: 'HUI-ALG', nombre: 'CETAP Algeciras', ciudad: 'Algeciras', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-baraya', codigo: 'HUI-BAR', nombre: 'CETAP Baraya', ciudad: 'Baraya', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-tesalia', codigo: 'HUI-TES', nombre: 'CETAP Tesalia', ciudad: 'Tesalia', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-paicol', codigo: 'HUI-PAI', nombre: 'CETAP Paicol', ciudad: 'Paicol', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-tarqui', codigo: 'HUI-TAR', nombre: 'CETAP Tarqui', ciudad: 'Tarqui', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-acevedo', codigo: 'HUI-ACE', nombre: 'CETAP Acevedo', ciudad: 'Acevedo', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-suaza', codigo: 'HUI-SUA', nombre: 'CETAP Suaza', ciudad: 'Suaza', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-guadalupe', codigo: 'HUI-GUA', nombre: 'CETAP Guadalupe', ciudad: 'Guadalupe', departamento: 'Huila', tipo: 'auxiliar' },
      { id: 'cetap-santa-maria', codigo: 'HUI-SMA', nombre: 'CETAP Santa María', ciudad: 'Santa María', departamento: 'Huila', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 13: MAGDALENA
  // ========================================
  {
    id: 'terr-magdalena',
    codigo: 'TERR-MAG',
    nombre: 'Territorial Magdalena',
    nombreCorto: 'Magdalena',
    departamentos: ['Magdalena'],
    ciudadPrincipal: 'Santa Marta',
    totalCetap: 16,
    cetap: [
      { id: 'cetap-santa-marta', codigo: 'MAG-SMA', nombre: 'CETAP Santa Marta', ciudad: 'Santa Marta', departamento: 'Magdalena', tipo: 'principal' },
      { id: 'cetap-cienaga', codigo: 'MAG-CIE', nombre: 'CETAP Ciénaga', ciudad: 'Ciénaga', departamento: 'Magdalena', tipo: 'auxiliar' },
      { id: 'cetap-el-banco', codigo: 'MAG-BAN', nombre: 'CETAP El Banco', ciudad: 'El Banco', departamento: 'Magdalena', tipo: 'auxiliar' },
      { id: 'cetap-fundacion', codigo: 'MAG-FUN', nombre: 'CETAP Fundación', ciudad: 'Fundación', departamento: 'Magdalena', tipo: 'auxiliar' },
      { id: 'cetap-plato', codigo: 'MAG-PLA', nombre: 'CETAP Plato', ciudad: 'Plato', departamento: 'Magdalena', tipo: 'auxiliar' },
      { id: 'cetap-santa-ana', codigo: 'MAG-SAN', nombre: 'CETAP Santa Ana', ciudad: 'Santa Ana', departamento: 'Magdalena', tipo: 'auxiliar' },
      { id: 'cetap-zona-bananera', codigo: 'MAG-ZON', nombre: 'CETAP Zona Bananera', ciudad: 'Zona Bananera', departamento: 'Magdalena', tipo: 'auxiliar' },
      { id: 'cetap-aracataca', codigo: 'MAG-ARA', nombre: 'CETAP Aracataca', ciudad: 'Aracataca', departamento: 'Magdalena', tipo: 'auxiliar' },
      { id: 'cetap-pivijay', codigo: 'MAG-PIV', nombre: 'CETAP Pivijay', ciudad: 'Pivijay', departamento: 'Magdalena', tipo: 'auxiliar' },
      { id: 'cetap-cerro-san-antonio', codigo: 'MAG-CER', nombre: 'CETAP Cerro de San Antonio', ciudad: 'Cerro de San Antonio', departamento: 'Magdalena', tipo: 'auxiliar' },
      { id: 'cetap-remolino', codigo: 'MAG-REM', nombre: 'CETAP Remolino', ciudad: 'Remolino', departamento: 'Magdalena', tipo: 'auxiliar' },
      { id: 'cetap-salamina', codigo: 'MAG-SAL', nombre: 'CETAP Salamina', ciudad: 'Salamina', departamento: 'Magdalena', tipo: 'auxiliar' },
      { id: 'cetap-guamal', codigo: 'MAG-GUA', nombre: 'CETAP Guamal', ciudad: 'Guamal', departamento: 'Magdalena', tipo: 'auxiliar' },
      { id: 'cetap-nueva-granada', codigo: 'MAG-NGR', nombre: 'CETAP Nueva Granada', ciudad: 'Nueva Granada', departamento: 'Magdalena', tipo: 'auxiliar' },
      { id: 'cetap-pueblo-viejo', codigo: 'MAG-PVI', nombre: 'CETAP Pueblo Viejo', ciudad: 'Pueblo Viejo', departamento: 'Magdalena', tipo: 'auxiliar' },
      { id: 'cetap-san-zenon', codigo: 'MAG-SZE', nombre: 'CETAP San Zenón', ciudad: 'San Zenón', departamento: 'Magdalena', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 14: META
  // ========================================
  {
    id: 'terr-meta',
    codigo: 'TERR-MET',
    nombre: 'Territorial Meta',
    nombreCorto: 'Meta',
    departamentos: ['Meta'],
    ciudadPrincipal: 'Villavicencio',
    totalCetap: 14,
    cetap: [
      { id: 'cetap-villavicencio', codigo: 'MET-VIL', nombre: 'CETAP Villavicencio', ciudad: 'Villavicencio', departamento: 'Meta', tipo: 'principal' },
      { id: 'cetap-acacias', codigo: 'MET-ACA', nombre: 'CETAP Acacías', ciudad: 'Acacías', departamento: 'Meta', tipo: 'auxiliar' },
      { id: 'cetap-granada', codigo: 'MET-GRA', nombre: 'CETAP Granada', ciudad: 'Granada', departamento: 'Meta', tipo: 'auxiliar' },
      { id: 'cetap-san-martin', codigo: 'MET-SMA', nombre: 'CETAP San Martín', ciudad: 'San Martín', departamento: 'Meta', tipo: 'auxiliar' },
      { id: 'cetap-puerto-lopez', codigo: 'MET-PLO', nombre: 'CETAP Puerto López', ciudad: 'Puerto López', departamento: 'Meta', tipo: 'auxiliar' },
      { id: 'cetap-puerto-gaitan', codigo: 'MET-PGA', nombre: 'CETAP Puerto Gaitán', ciudad: 'Puerto Gaitán', departamento: 'Meta', tipo: 'auxiliar' },
      { id: 'cetap-puerto-lleras', codigo: 'MET-PLL', nombre: 'CETAP Puerto Lleras', ciudad: 'Puerto Lleras', departamento: 'Meta', tipo: 'auxiliar' },
      { id: 'cetap-cumaral', codigo: 'MET-CUM', nombre: 'CETAP Cumaral', ciudad: 'Cumaral', departamento: 'Meta', tipo: 'auxiliar' },
      { id: 'cetap-restrepo', codigo: 'MET-RES', nombre: 'CETAP Restrepo', ciudad: 'Restrepo', departamento: 'Meta', tipo: 'auxiliar' },
      { id: 'cetap-el-castillo', codigo: 'MET-CAS', nombre: 'CETAP El Castillo', ciudad: 'El Castillo', departamento: 'Meta', tipo: 'auxiliar' },
      { id: 'cetap-lejanias', codigo: 'MET-LEJ', nombre: 'CETAP Lejanías', ciudad: 'Lejanías', departamento: 'Meta', tipo: 'auxiliar' },
      { id: 'cetap-vistahermosa', codigo: 'MET-VIS', nombre: 'CETAP Vistahermosa', ciudad: 'Vistahermosa', departamento: 'Meta', tipo: 'auxiliar' },
      { id: 'cetap-mesetas', codigo: 'MET-MES', nombre: 'CETAP Mesetas', ciudad: 'Mesetas', departamento: 'Meta', tipo: 'auxiliar' },
      { id: 'cetap-mapiripan', codigo: 'MET-MAP', nombre: 'CETAP Mapiripán', ciudad: 'Mapiripán', departamento: 'Meta', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 15: NARIÑO
  // ========================================
  {
    id: 'terr-narino',
    codigo: 'TERR-NAR',
    nombre: 'Territorial Nariño',
    nombreCorto: 'Nariño',
    departamentos: ['Nariño'],
    ciudadPrincipal: 'Pasto',
    totalCetap: 21,
    cetap: [
      { id: 'cetap-pasto', codigo: 'NAR-PAS', nombre: 'CETAP Pasto', ciudad: 'Pasto', departamento: 'Nariño', tipo: 'principal' },
      { id: 'cetap-ipiales', codigo: 'NAR-IPI', nombre: 'CETAP Ipiales', ciudad: 'Ipiales', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-tumaco', codigo: 'NAR-TUM', nombre: 'CETAP Tumaco', ciudad: 'Tumaco', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-tuquerres', codigo: 'NAR-TUQ', nombre: 'CETAP Túquerres', ciudad: 'Túquerres', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-la-union', codigo: 'NAR-LAU', nombre: 'CETAP La Unión', ciudad: 'La Unión', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-sandona', codigo: 'NAR-SAN', nombre: 'CETAP Sandoná', ciudad: 'Sandoná', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-samaniego', codigo: 'NAR-SAM', nombre: 'CETAP Samaniego', ciudad: 'Samaniego', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-la-cruz', codigo: 'NAR-CRU', nombre: 'CETAP La Cruz', ciudad: 'La Cruz', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-barbacoas', codigo: 'NAR-BAR', nombre: 'CETAP Barbacoas', ciudad: 'Barbacoas', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-el-charco', codigo: 'NAR-CHA', nombre: 'CETAP El Charco', ciudad: 'El Charco', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-mosquera', codigo: 'NAR-MOS', nombre: 'CETAP Mosquera', ciudad: 'Mosquera', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-ancuya', codigo: 'NAR-ANC', nombre: 'CETAP Ancuyá', ciudad: 'Ancuyá', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-cumbal', codigo: 'NAR-CUM', nombre: 'CETAP Cumbal', ciudad: 'Cumbal', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-mallama', codigo: 'NAR-MAL', nombre: 'CETAP Mallama', ciudad: 'Mallama', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-ricaurte', codigo: 'NAR-RIC', nombre: 'CETAP Ricaurte', ciudad: 'Ricaurte', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-buesaco', codigo: 'NAR-BUE', nombre: 'CETAP Buesaco', ciudad: 'Buesaco', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-guaitarilla', codigo: 'NAR-GUA', nombre: 'CETAP Guaitarilla', ciudad: 'Guaitarilla', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-pupiales', codigo: 'NAR-PUP', nombre: 'CETAP Pupiales', ciudad: 'Pupiales', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-guachucal', codigo: 'NAR-GCH', nombre: 'CETAP Guachucal', ciudad: 'Guachucal', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-aldana', codigo: 'NAR-ALD', nombre: 'CETAP Aldana', ciudad: 'Aldana', departamento: 'Nariño', tipo: 'auxiliar' },
      { id: 'cetap-cordoba', codigo: 'NAR-COR', nombre: 'CETAP Córdoba', ciudad: 'Córdoba', departamento: 'Nariño', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 16: NORTE DE SANTANDER
  // ========================================
  {
    id: 'terr-norte-santander',
    codigo: 'TERR-NSA',
    nombre: 'Territorial Norte de Santander',
    nombreCorto: 'Norte de Santander',
    departamentos: ['Norte de Santander'],
    ciudadPrincipal: 'Cúcuta',
    totalCetap: 20,
    cetap: [
      { id: 'cetap-cucuta', codigo: 'NSA-CUC', nombre: 'CETAP Cúcuta', ciudad: 'Cúcuta', departamento: 'Norte de Santander', tipo: 'principal' },
      { id: 'cetap-ocana', codigo: 'NSA-OCA', nombre: 'CETAP Ocaña', ciudad: 'Ocaña', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-pamplona', codigo: 'NSA-PAM', nombre: 'CETAP Pamplona', ciudad: 'Pamplona', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-villa-rosario', codigo: 'NSA-VRO', nombre: 'CETAP Villa del Rosario', ciudad: 'Villa del Rosario', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-los-patios', codigo: 'NSA-PAT', nombre: 'CETAP Los Patios', ciudad: 'Los Patios', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-tibu', codigo: 'NSA-TIB', nombre: 'CETAP Tibú', ciudad: 'Tibú', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-el-zulia', codigo: 'NSA-ZUL', nombre: 'CETAP El Zulia', ciudad: 'El Zulia', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-sardinata', codigo: 'NSA-SAR', nombre: 'CETAP Sardinata', ciudad: 'Sardinata', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-convencion', codigo: 'NSA-CON', nombre: 'CETAP Convención', ciudad: 'Convención', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-el-carmen', codigo: 'NSA-CAR', nombre: 'CETAP El Carmen', ciudad: 'El Carmen', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-la-esperanza', codigo: 'NSA-ESP', nombre: 'CETAP La Esperanza', ciudad: 'La Esperanza', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-toledo', codigo: 'NSA-TOL', nombre: 'CETAP Toledo', ciudad: 'Toledo', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-chinacota', codigo: 'NSA-CHI', nombre: 'CETAP Chinácota', ciudad: 'Chinácota', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-durania', codigo: 'NSA-DUR', nombre: 'CETAP Durania', ciudad: 'Durania', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-ragonvalia', codigo: 'NSA-RAG', nombre: 'CETAP Ragonvalia', ciudad: 'Ragonvalia', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-herran', codigo: 'NSA-HER', nombre: 'CETAP Herrán', ciudad: 'Herrán', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-cacota', codigo: 'NSA-CAC', nombre: 'CETAP Cácota', ciudad: 'Cácota', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-mutiscua', codigo: 'NSA-MUT', nombre: 'CETAP Mutiscua', ciudad: 'Mutiscua', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-silos', codigo: 'NSA-SIL', nombre: 'CETAP Silos', ciudad: 'Silos', departamento: 'Norte de Santander', tipo: 'auxiliar' },
      { id: 'cetap-gramalote', codigo: 'NSA-GRA', nombre: 'CETAP Gramalote', ciudad: 'Gramalote', departamento: 'Norte de Santander', tipo: 'auxiliar' }
    ]
  },

  // ========================================
  // TERRITORIAL 17: SANTANDER
  // ========================================
  {
    id: 'terr-santander',
    codigo: 'TERR-SAN',
    nombre: 'Territorial Santander',
    nombreCorto: 'Santander',
    departamentos: ['Santander'],
    ciudadPrincipal: 'Bucaramanga',
    totalCetap: 30,
    cetap: [
      { id: 'cetap-bucaramanga', codigo: 'SAN-BUC', nombre: 'CETAP Bucaramanga', ciudad: 'Bucaramanga', departamento: 'Santander', tipo: 'principal' },
      { id: 'cetap-floridablanca', codigo: 'SAN-FLO', nombre: 'CETAP Floridablanca', ciudad: 'Floridablanca', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-giron', codigo: 'SAN-GIR', nombre: 'CETAP Girón', ciudad: 'Girón', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-piedecuesta', codigo: 'SAN-PIE', nombre: 'CETAP Piedecuesta', ciudad: 'Piedecuesta', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-barrancabermeja', codigo: 'SAN-BAR', nombre: 'CETAP Barrancabermeja', ciudad: 'Barrancabermeja', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-san-gil', codigo: 'SAN-SGI', nombre: 'CETAP San Gil', ciudad: 'San Gil', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-socorro', codigo: 'SAN-SOC', nombre: 'CETAP Socorro', ciudad: 'Socorro', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-velez', codigo: 'SAN-VEL', nombre: 'CETAP Vélez', ciudad: 'Vélez', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-malaga', codigo: 'SAN-MAL', nombre: 'CETAP Málaga', ciudad: 'Málaga', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-barbosa', codigo: 'SAN-BBR', nombre: 'CETAP Barbosa', ciudad: 'Barbosa', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-el-playon', codigo: 'SAN-PLA', nombre: 'CETAP El Playón', ciudad: 'El Playón', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-lebrija', codigo: 'SAN-LEB', nombre: 'CETAP Lebrija', ciudad: 'Lebrija', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-rionegro', codigo: 'SAN-RIO', nombre: 'CETAP Rionegro', ciudad: 'Rionegro', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-sabana-torres', codigo: 'SAN-SAB', nombre: 'CETAP Sabana de Torres', ciudad: 'Sabana de Torres', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-puerto-wilches', codigo: 'SAN-PWI', nombre: 'CETAP Puerto Wilches', ciudad: 'Puerto Wilches', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-cimitarra', codigo: 'SAN-CIM', nombre: 'CETAP Cimitarra', ciudad: 'Cimitarra', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-landazuri', codigo: 'SAN-LAN', nombre: 'CETAP Landázuri', ciudad: 'Landázuri', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-zapatoca', codigo: 'SAN-ZAP', nombre: 'CETAP Zapatoca', ciudad: 'Zapatoca', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-curiti', codigo: 'SAN-CUR', nombre: 'CETAP Curití', ciudad: 'Curití', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-barichara', codigo: 'SAN-BARI', nombre: 'CETAP Barichara', ciudad: 'Barichara', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-oiba', codigo: 'SAN-OIB', nombre: 'CETAP Oiba', ciudad: 'Oiba', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-charala', codigo: 'SAN-CHA', nombre: 'CETAP Charalá', ciudad: 'Charalá', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-confines', codigo: 'SAN-CON', nombre: 'CETAP Confines', ciudad: 'Confines', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-puente-nacional', codigo: 'SAN-PNT', nombre: 'CETAP Puente Nacional', ciudad: 'Puente Nacional', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-guepsa', codigo: 'SAN-GUE', nombre: 'CETAP Güepsa', ciudad: 'Güepsa', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-chipata', codigo: 'SAN-CHI', nombre: 'CETAP Chipatá', ciudad: 'Chipatá', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-cepita', codigo: 'SAN-CEP', nombre: 'CETAP Cepitá', ciudad: 'Cepitá', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-la-paz', codigo: 'SAN-PAZ', nombre: 'CETAP La Paz', ciudad: 'La Paz', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-san-benito', codigo: 'SAN-SBE', nombre: 'CETAP San Benito', ciudad: 'San Benito', departamento: 'Santander', tipo: 'auxiliar' },
      { id: 'cetap-molagavita', codigo: 'SAN-MOL', nombre: 'CETAP Molagavita', ciudad: 'Molagavita', departamento: 'Santander', tipo: 'auxiliar' }
    ]
  }
];

/**
 * ========================================
 * HELPER FUNCTIONS
 * ========================================
 */

/**
 * Obtener territorial por código
 */
export const getTerritorialByCodigo = (codigo: string): TerritorialInfo | undefined => {
  return TERRITORIALES_ESAP.find(t => t.codigo === codigo);
};

/**
 * Obtener todos los CETAP de una territorial
 */
export const getCetapByTerritorial = (territorialId: string): CetapInfo[] => {
  const territorial = TERRITORIALES_ESAP.find(t => t.id === territorialId);
  return territorial?.cetap || [];
};

/**
 * Obtener estadísticas de la estructura
 */
export const obtenerEstadisticasEstructura = () => {
  return {
    totalTerritoriales: TERRITORIALES_ESAP.length,
    totalCetap: TERRITORIALES_ESAP.reduce((acc, t) => acc + t.totalCetap, 0),
    cetapPorTerritorial: TERRITORIALES_ESAP.map(t => ({
      territorial: t.nombreCorto,
      cantidad: t.totalCetap
    }))
  };
};

/**
 * Obtener todos los CETAP (planos)
 */
export const getAllCetap = (): CetapInfo[] => {
  return TERRITORIALES_ESAP.flatMap(t => t.cetap);
};

/**
 * Buscar CETAP por nombre
 */
export const searchCetap = (query: string): CetapInfo[] => {
  const lowerQuery = query.toLowerCase();
  return getAllCetap().filter(c => 
    c.nombre.toLowerCase().includes(lowerQuery) ||
    c.ciudad?.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Buscar territoriales por nombre
 */
export const searchTerritoriales = (query: string): TerritorialInfo[] => {
  const lowerQuery = query.toLowerCase();
  return TERRITORIALES_ESAP.filter(t =>
    t.nombre.toLowerCase().includes(lowerQuery) ||
    t.nombreCorto.toLowerCase().includes(lowerQuery) ||
    t.ciudadPrincipal.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Obtener CETAP por ID
 */
export const getCetapById = (cetapId: string): CetapInfo | undefined => {
  return getAllCetap().find(c => c.id === cetapId);
};

/**
 * Obtener territorial de un CETAP específico
 */
export const getTerritorialByCetapId = (cetapId: string): TerritorialInfo | undefined => {
  return TERRITORIALES_ESAP.find(t => 
    t.cetap.some(c => c.id === cetapId)
  );
};
