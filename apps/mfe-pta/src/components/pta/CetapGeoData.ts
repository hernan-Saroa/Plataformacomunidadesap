/**
 * CetapGeoData — Catálogo completo de CETAPs ESAP con coordenadas geográficas
 *
 * 17 Territoriales ESAP + ~70 CETAPs con lat/lng reales para geolocalización en mapa.
 * Fuente: Información oficial ESAP / Datos públicos de sedes.
 *
 * CETAP = Centro Territorial de Administración Pública
 */

export interface CetapGeo {
  id: string;
  nombre: string;
  ciudad: string;
  departamento: string;
  codigo: string;
  lat: number;
  lng: number;
  esSedeTerritorial: boolean; // true si es la sede principal de la territorial
  direccion?: string;
}

export interface TerritorialGeo {
  id: string;        // ter-01 ... ter-17 (matches ColombiaMapPaths)
  nombre: string;
  codigo: string;
  ciudadPrincipal: string;
  departamentos: string[];
  lat: number;        // capital coords
  lng: number;
  cetaps: CetapGeo[];
}

export const TERRITORIALES_GEO: TerritorialGeo[] = [
  // ═══ ter-01: Cundinamarca (Bogotá) ═══
  {
    id: 'ter-01',
    nombre: 'Cundinamarca',
    codigo: 'ESAP-CUN',
    ciudadPrincipal: 'Bogotá D.C.',
    departamentos: ['Cundinamarca', 'Bogotá D.C.'],
    lat: 4.711,
    lng: -74.072,
    cetaps: [
      { id: 'cetap-01-01', nombre: 'CETAP Bogotá (Sede Nacional)', ciudad: 'Bogotá', departamento: 'Bogotá D.C.', codigo: 'CETAP-BOG', lat: 4.6328, lng: -74.0693, esSedeTerritorial: true, direccion: 'Calle 44 No. 53-37' },
      { id: 'cetap-01-02', nombre: 'CETAP Facatativá', ciudad: 'Facatativá', departamento: 'Cundinamarca', codigo: 'CETAP-FAC', lat: 4.8144, lng: -74.3558, esSedeTerritorial: false, direccion: 'Calle 13 No. 5-54' },
      { id: 'cetap-01-03', nombre: 'CETAP Girardot', ciudad: 'Girardot', departamento: 'Cundinamarca', codigo: 'CETAP-GIR', lat: 4.3025, lng: -74.8039, esSedeTerritorial: false },
      { id: 'cetap-01-04', nombre: 'CETAP Zipaquirá', ciudad: 'Zipaquirá', departamento: 'Cundinamarca', codigo: 'CETAP-ZIP', lat: 5.0224, lng: -73.9934, esSedeTerritorial: false },
      { id: 'cetap-01-05', nombre: 'CETAP Fusagasugá', ciudad: 'Fusagasugá', departamento: 'Cundinamarca', codigo: 'CETAP-FUS', lat: 4.3370, lng: -74.3639, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-02: Antioquia ═══
  {
    id: 'ter-02',
    nombre: 'Antioquia',
    codigo: 'ESAP-ANT',
    ciudadPrincipal: 'Medellín',
    departamentos: ['Antioquia'],
    lat: 6.251,
    lng: -75.564,
    cetaps: [
      { id: 'cetap-02-01', nombre: 'CETAP Medellín', ciudad: 'Medellín', departamento: 'Antioquia', codigo: 'CETAP-MED', lat: 6.2518, lng: -75.5636, esSedeTerritorial: true, direccion: 'Carrera 52 No. 42-73' },
      { id: 'cetap-02-02', nombre: 'CETAP Apartadó (Urabá)', ciudad: 'Apartadó', departamento: 'Antioquia', codigo: 'CETAP-URA', lat: 7.8827, lng: -76.6309, esSedeTerritorial: false },
      { id: 'cetap-02-03', nombre: 'CETAP Rionegro', ciudad: 'Rionegro', departamento: 'Antioquia', codigo: 'CETAP-RIO', lat: 6.1547, lng: -75.3782, esSedeTerritorial: false },
      { id: 'cetap-02-04', nombre: 'CETAP Santa Fe de Antioquia', ciudad: 'Santa Fe de Antioquia', departamento: 'Antioquia', codigo: 'CETAP-SFA', lat: 6.5571, lng: -75.8300, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-03: Valle del Cauca ═══
  {
    id: 'ter-03',
    nombre: 'Valle del Cauca',
    codigo: 'ESAP-VAL',
    ciudadPrincipal: 'Cali',
    departamentos: ['Valle del Cauca'],
    lat: 3.452,
    lng: -76.532,
    cetaps: [
      { id: 'cetap-03-01', nombre: 'CETAP Cali', ciudad: 'Cali', departamento: 'Valle del Cauca', codigo: 'CETAP-CAL', lat: 3.4516, lng: -76.5320, esSedeTerritorial: true, direccion: 'Carrera 6 No. 11-62' },
      { id: 'cetap-03-02', nombre: 'CETAP Buenaventura', ciudad: 'Buenaventura', departamento: 'Valle del Cauca', codigo: 'CETAP-BVT', lat: 3.8801, lng: -77.0311, esSedeTerritorial: false },
      { id: 'cetap-03-03', nombre: 'CETAP Palmira', ciudad: 'Palmira', departamento: 'Valle del Cauca', codigo: 'CETAP-PAL', lat: 3.5394, lng: -76.2986, esSedeTerritorial: false },
      { id: 'cetap-03-04', nombre: 'CETAP Cartago', ciudad: 'Cartago', departamento: 'Valle del Cauca', codigo: 'CETAP-CTG', lat: 4.7464, lng: -75.9116, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-04: Atlántico ═══
  {
    id: 'ter-04',
    nombre: 'Atlántico',
    codigo: 'ESAP-ATL',
    ciudadPrincipal: 'Barranquilla',
    departamentos: ['Atlántico', 'San Andrés y Providencia'],
    lat: 10.964,
    lng: -74.781,
    cetaps: [
      { id: 'cetap-04-01', nombre: 'CETAP Barranquilla', ciudad: 'Barranquilla', departamento: 'Atlántico', codigo: 'CETAP-BAQ', lat: 10.9639, lng: -74.7964, esSedeTerritorial: true, direccion: 'Carrera 46 No. 75-37' },
      { id: 'cetap-04-02', nombre: 'CETAP San Andrés', ciudad: 'San Andrés', departamento: 'San Andrés', codigo: 'CETAP-SAI', lat: 12.5567, lng: -81.7185, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-05: Santander ═══
  {
    id: 'ter-05',
    nombre: 'Santander',
    codigo: 'ESAP-SAN',
    ciudadPrincipal: 'Bucaramanga',
    departamentos: ['Santander'],
    lat: 7.120,
    lng: -73.123,
    cetaps: [
      { id: 'cetap-05-01', nombre: 'CETAP Bucaramanga', ciudad: 'Bucaramanga', departamento: 'Santander', codigo: 'CETAP-BGA', lat: 7.1193, lng: -73.1227, esSedeTerritorial: true, direccion: 'Calle 35 No. 21-67' },
      { id: 'cetap-05-02', nombre: 'CETAP Barrancabermeja', ciudad: 'Barrancabermeja', departamento: 'Santander', codigo: 'CETAP-BAR', lat: 7.0653, lng: -73.8547, esSedeTerritorial: false },
      { id: 'cetap-05-03', nombre: 'CETAP San Gil', ciudad: 'San Gil', departamento: 'Santander', codigo: 'CETAP-SGI', lat: 6.5565, lng: -73.1368, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-06: Bolívar ═══
  {
    id: 'ter-06',
    nombre: 'Bolívar',
    codigo: 'ESAP-BOL',
    ciudadPrincipal: 'Cartagena',
    departamentos: ['Bolívar', 'Sucre'],
    lat: 10.392,
    lng: -75.514,
    cetaps: [
      { id: 'cetap-06-01', nombre: 'CETAP Cartagena', ciudad: 'Cartagena', departamento: 'Bolívar', codigo: 'CETAP-CTG', lat: 10.3910, lng: -75.5144, esSedeTerritorial: true, direccion: 'Centro, Calle del Coliseo' },
      { id: 'cetap-06-02', nombre: 'CETAP Sincelejo', ciudad: 'Sincelejo', departamento: 'Sucre', codigo: 'CETAP-SIN', lat: 9.3047, lng: -75.3933, esSedeTerritorial: false },
      { id: 'cetap-06-03', nombre: 'CETAP Magangué', ciudad: 'Magangué', departamento: 'Bolívar', codigo: 'CETAP-MAG', lat: 9.2424, lng: -74.7547, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-07: Boyacá ═══
  {
    id: 'ter-07',
    nombre: 'Boyacá',
    codigo: 'ESAP-BOY',
    ciudadPrincipal: 'Tunja',
    departamentos: ['Boyacá', 'Casanare', 'Arauca'],
    lat: 5.534,
    lng: -73.362,
    cetaps: [
      { id: 'cetap-07-01', nombre: 'CETAP Tunja', ciudad: 'Tunja', departamento: 'Boyacá', codigo: 'CETAP-TUN', lat: 5.5353, lng: -73.3678, esSedeTerritorial: true, direccion: 'Calle 19 No. 9-35' },
      { id: 'cetap-07-02', nombre: 'CETAP Yopal', ciudad: 'Yopal', departamento: 'Casanare', codigo: 'CETAP-YOP', lat: 5.3378, lng: -72.3959, esSedeTerritorial: false },
      { id: 'cetap-07-03', nombre: 'CETAP Arauca', ciudad: 'Arauca', departamento: 'Arauca', codigo: 'CETAP-ARA', lat: 7.0906, lng: -70.7612, esSedeTerritorial: false },
      { id: 'cetap-07-04', nombre: 'CETAP Sogamoso', ciudad: 'Sogamoso', departamento: 'Boyacá', codigo: 'CETAP-SOG', lat: 5.7143, lng: -72.9289, esSedeTerritorial: false },
      { id: 'cetap-07-05', nombre: 'CETAP Chiquinquirá', ciudad: 'Chiquinquirá', departamento: 'Boyacá', codigo: 'CETAP-CHI', lat: 5.6166, lng: -73.8195, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-08: Nariño ═══
  {
    id: 'ter-08',
    nombre: 'Nariño',
    codigo: 'ESAP-NAR',
    ciudadPrincipal: 'Pasto',
    departamentos: ['Nariño', 'Putumayo'],
    lat: 1.214,
    lng: -77.281,
    cetaps: [
      { id: 'cetap-08-01', nombre: 'CETAP Pasto', ciudad: 'Pasto', departamento: 'Nariño', codigo: 'CETAP-PAS', lat: 1.2136, lng: -77.2811, esSedeTerritorial: true, direccion: 'Carrera 27 No. 18-23' },
      { id: 'cetap-08-02', nombre: 'CETAP Ipiales', ciudad: 'Ipiales', departamento: 'Nariño', codigo: 'CETAP-IPI', lat: 0.8281, lng: -77.6394, esSedeTerritorial: false },
      { id: 'cetap-08-03', nombre: 'CETAP Tumaco', ciudad: 'Tumaco', departamento: 'Nariño', codigo: 'CETAP-TUM', lat: 1.7986, lng: -78.7642, esSedeTerritorial: false },
      { id: 'cetap-08-04', nombre: 'CETAP Mocoa', ciudad: 'Mocoa', departamento: 'Putumayo', codigo: 'CETAP-MOC', lat: 1.1520, lng: -76.6465, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-09: Tolima ═══
  {
    id: 'ter-09',
    nombre: 'Tolima',
    codigo: 'ESAP-TOL',
    ciudadPrincipal: 'Ibagué',
    departamentos: ['Tolima'],
    lat: 4.438,
    lng: -75.232,
    cetaps: [
      { id: 'cetap-09-01', nombre: 'CETAP Ibagué', ciudad: 'Ibagué', departamento: 'Tolima', codigo: 'CETAP-IBG', lat: 4.4389, lng: -75.2322, esSedeTerritorial: true, direccion: 'Carrera 5 No. 60-38' },
      { id: 'cetap-09-02', nombre: 'CETAP Espinal', ciudad: 'Espinal', departamento: 'Tolima', codigo: 'CETAP-ESP', lat: 4.1493, lng: -74.8846, esSedeTerritorial: false },
      { id: 'cetap-09-03', nombre: 'CETAP Honda', ciudad: 'Honda', departamento: 'Tolima', codigo: 'CETAP-HON', lat: 5.2030, lng: -74.7367, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-10: Cauca ═══
  {
    id: 'ter-10',
    nombre: 'Cauca',
    codigo: 'ESAP-CAU',
    ciudadPrincipal: 'Popayán',
    departamentos: ['Cauca'],
    lat: 2.442,
    lng: -76.606,
    cetaps: [
      { id: 'cetap-10-01', nombre: 'CETAP Popayán', ciudad: 'Popayán', departamento: 'Cauca', codigo: 'CETAP-POP', lat: 2.4419, lng: -76.6063, esSedeTerritorial: true, direccion: 'Carrera 7 No. 2-62' },
      { id: 'cetap-10-02', nombre: 'CETAP Santander de Quilichao', ciudad: 'Santander de Quilichao', departamento: 'Cauca', codigo: 'CETAP-SQU', lat: 3.0098, lng: -76.4862, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-11: Huila ═══
  {
    id: 'ter-11',
    nombre: 'Huila',
    codigo: 'ESAP-HUI',
    ciudadPrincipal: 'Neiva',
    departamentos: ['Huila', 'Caquetá'],
    lat: 2.927,
    lng: -75.282,
    cetaps: [
      { id: 'cetap-11-01', nombre: 'CETAP Neiva', ciudad: 'Neiva', departamento: 'Huila', codigo: 'CETAP-NEI', lat: 2.9273, lng: -75.2819, esSedeTerritorial: true, direccion: 'Calle 10 No. 6-68' },
      { id: 'cetap-11-02', nombre: 'CETAP Florencia', ciudad: 'Florencia', departamento: 'Caquetá', codigo: 'CETAP-FLO', lat: 1.6144, lng: -75.6099, esSedeTerritorial: false },
      { id: 'cetap-11-03', nombre: 'CETAP Garzón', ciudad: 'Garzón', departamento: 'Huila', codigo: 'CETAP-GAR', lat: 2.1951, lng: -75.6263, esSedeTerritorial: false },
      { id: 'cetap-11-04', nombre: 'CETAP Pitalito', ciudad: 'Pitalito', departamento: 'Huila', codigo: 'CETAP-PIT', lat: 1.8516, lng: -76.0394, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-12: Norte de Santander ═══
  {
    id: 'ter-12',
    nombre: 'Norte de Santander',
    codigo: 'ESAP-NST',
    ciudadPrincipal: 'Cúcuta',
    departamentos: ['Norte de Santander'],
    lat: 7.893,
    lng: -72.508,
    cetaps: [
      { id: 'cetap-12-01', nombre: 'CETAP Cúcuta', ciudad: 'Cúcuta', departamento: 'Norte de Santander', codigo: 'CETAP-CUC', lat: 7.8939, lng: -72.5078, esSedeTerritorial: true, direccion: 'Avenida 4 No. 16-35' },
      { id: 'cetap-12-02', nombre: 'CETAP Ocaña', ciudad: 'Ocaña', departamento: 'Norte de Santander', codigo: 'CETAP-OCA', lat: 8.2379, lng: -73.3545, esSedeTerritorial: false },
      { id: 'cetap-12-03', nombre: 'CETAP Pamplona', ciudad: 'Pamplona', departamento: 'Norte de Santander', codigo: 'CETAP-PAM', lat: 7.3756, lng: -72.6480, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-13: Meta ═══
  {
    id: 'ter-13',
    nombre: 'Meta',
    codigo: 'ESAP-MET',
    ciudadPrincipal: 'Villavicencio',
    departamentos: ['Meta', 'Guaviare', 'Vichada', 'Guainía', 'Vaupés', 'Amazonas'],
    lat: 4.142,
    lng: -73.627,
    cetaps: [
      { id: 'cetap-13-01', nombre: 'CETAP Villavicencio', ciudad: 'Villavicencio', departamento: 'Meta', codigo: 'CETAP-VVC', lat: 4.1420, lng: -73.6266, esSedeTerritorial: true, direccion: 'Carrera 33 No. 38-53' },
      { id: 'cetap-13-02', nombre: 'CETAP San José del Guaviare', ciudad: 'San José del Guaviare', departamento: 'Guaviare', codigo: 'CETAP-SJG', lat: 2.5714, lng: -72.6452, esSedeTerritorial: false },
      { id: 'cetap-13-03', nombre: 'CETAP Puerto Carreño', ciudad: 'Puerto Carreño', departamento: 'Vichada', codigo: 'CETAP-PCR', lat: 6.1850, lng: -67.4850, esSedeTerritorial: false },
      { id: 'cetap-13-04', nombre: 'CETAP Leticia', ciudad: 'Leticia', departamento: 'Amazonas', codigo: 'CETAP-LET', lat: -4.2153, lng: -69.9406, esSedeTerritorial: false },
      { id: 'cetap-13-05', nombre: 'CETAP Inírida', ciudad: 'Inírida', departamento: 'Guainía', codigo: 'CETAP-INI', lat: 3.8653, lng: -67.9239, esSedeTerritorial: false },
      { id: 'cetap-13-06', nombre: 'CETAP Mitú', ciudad: 'Mitú', departamento: 'Vaupés', codigo: 'CETAP-MIT', lat: 1.1983, lng: -70.1733, esSedeTerritorial: false },
      { id: 'cetap-13-07', nombre: 'CETAP Granada', ciudad: 'Granada', departamento: 'Meta', codigo: 'CETAP-GRA', lat: 3.5428, lng: -73.7008, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-14: Caldas ═══
  {
    id: 'ter-14',
    nombre: 'Caldas',
    codigo: 'ESAP-CAL',
    ciudadPrincipal: 'Manizales',
    departamentos: ['Caldas', 'Quindío'],
    lat: 5.068,
    lng: -75.518,
    cetaps: [
      { id: 'cetap-14-01', nombre: 'CETAP Manizales', ciudad: 'Manizales', departamento: 'Caldas', codigo: 'CETAP-MAN', lat: 5.0689, lng: -75.5174, esSedeTerritorial: true, direccion: 'Carrera 23 No. 62-29' },
      { id: 'cetap-14-02', nombre: 'CETAP Armenia', ciudad: 'Armenia', departamento: 'Quindío', codigo: 'CETAP-ARM', lat: 4.5339, lng: -75.6811, esSedeTerritorial: false },
      { id: 'cetap-14-03', nombre: 'CETAP La Dorada', ciudad: 'La Dorada', departamento: 'Caldas', codigo: 'CETAP-LDO', lat: 5.4528, lng: -74.6672, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-15: Risaralda ═══
  {
    id: 'ter-15',
    nombre: 'Risaralda',
    codigo: 'ESAP-RIS',
    ciudadPrincipal: 'Pereira',
    departamentos: ['Risaralda', 'Chocó'],
    lat: 4.813,
    lng: -75.696,
    cetaps: [
      { id: 'cetap-15-01', nombre: 'CETAP Pereira', ciudad: 'Pereira', departamento: 'Risaralda', codigo: 'CETAP-PER', lat: 4.8133, lng: -75.6961, esSedeTerritorial: true, direccion: 'Calle 19 No. 11-57' },
      { id: 'cetap-15-02', nombre: 'CETAP Quibdó', ciudad: 'Quibdó', departamento: 'Chocó', codigo: 'CETAP-QUI', lat: 5.6947, lng: -76.6611, esSedeTerritorial: false },
      { id: 'cetap-15-03', nombre: 'CETAP Istmina', ciudad: 'Istmina', departamento: 'Chocó', codigo: 'CETAP-IST', lat: 5.1622, lng: -76.6833, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-16: Magdalena ═══
  {
    id: 'ter-16',
    nombre: 'Magdalena',
    codigo: 'ESAP-MAG',
    ciudadPrincipal: 'Santa Marta',
    departamentos: ['Magdalena', 'Cesar', 'La Guajira'],
    lat: 11.241,
    lng: -74.199,
    cetaps: [
      { id: 'cetap-16-01', nombre: 'CETAP Santa Marta', ciudad: 'Santa Marta', departamento: 'Magdalena', codigo: 'CETAP-STM', lat: 11.2408, lng: -74.1990, esSedeTerritorial: true, direccion: 'Calle 22 No. 16-37' },
      { id: 'cetap-16-02', nombre: 'CETAP Valledupar', ciudad: 'Valledupar', departamento: 'Cesar', codigo: 'CETAP-VUP', lat: 10.4735, lng: -73.2532, esSedeTerritorial: false },
      { id: 'cetap-16-03', nombre: 'CETAP Riohacha', ciudad: 'Riohacha', departamento: 'La Guajira', codigo: 'CETAP-RIO', lat: 11.5444, lng: -72.9072, esSedeTerritorial: false },
      { id: 'cetap-16-04', nombre: 'CETAP Aguachica', ciudad: 'Aguachica', departamento: 'Cesar', codigo: 'CETAP-AGU', lat: 8.3064, lng: -73.6104, esSedeTerritorial: false },
    ],
  },

  // ═══ ter-17: Córdoba ═══
  {
    id: 'ter-17',
    nombre: 'Córdoba',
    codigo: 'ESAP-COR',
    ciudadPrincipal: 'Montería',
    departamentos: ['Córdoba'],
    lat: 8.748,
    lng: -75.881,
    cetaps: [
      { id: 'cetap-17-01', nombre: 'CETAP Montería', ciudad: 'Montería', departamento: 'Córdoba', codigo: 'CETAP-MON', lat: 8.7479, lng: -75.8814, esSedeTerritorial: true, direccion: 'Carrera 6 No. 62-32' },
      { id: 'cetap-17-02', nombre: 'CETAP Lorica', ciudad: 'Lorica', departamento: 'Córdoba', codigo: 'CETAP-LOR', lat: 9.2370, lng: -75.8120, esSedeTerritorial: false },
      { id: 'cetap-17-03', nombre: 'CETAP Montelíbano', ciudad: 'Montelíbano', departamento: 'Córdoba', codigo: 'CETAP-MTL', lat: 7.9786, lng: -75.4177, esSedeTerritorial: false },
    ],
  },
];

// ═══ Helpers ═══

/** Total CETAPs across all territoriales */
export function getTotalCetaps(): number {
  return TERRITORIALES_GEO.reduce((sum, t) => sum + t.cetaps.length, 0);
}

/** Get all CETAPs as flat array with territorial info attached */
export function getAllCetapsFlat() {
  return TERRITORIALES_GEO.flatMap(t =>
    t.cetaps.map(c => ({
      ...c,
      territorialId: t.id,
      territorialNombre: t.nombre,
      territorialCodigo: t.codigo,
    }))
  );
}

/** Get CETAPs for a specific territorial */
export function getCetapsByTerritorial(terrId: string): CetapGeo[] {
  return TERRITORIALES_GEO.find(t => t.id === terrId)?.cetaps || [];
}
