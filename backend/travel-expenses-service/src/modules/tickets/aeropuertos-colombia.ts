/**
 * Mapeo de ciudades y municipios colombianos a códigos IATA de terminales aéreas.
 * Utilizado por el modelo híbrido paramétrico de tiquetes aéreos de la ESAP.
 */
export interface AeropuertoColombia {
  iata: string;
  ciudad: string;
  departamento: string;
  nombreAeropuerto: string;
}

export const CATALOGO_AEROPUERTOS_COLOMBIA: Record<string, AeropuertoColombia> = {
  BOGOTA: { iata: 'BOG', ciudad: 'Bogotá, D.C.', departamento: 'Cundinamarca', nombreAeropuerto: 'El Dorado' },
  MEDELLIN: { iata: 'MDE', ciudad: 'Medellín', departamento: 'Antioquia', nombreAeropuerto: 'José María Córdova (Rionegro)' },
  RIONEGRO: { iata: 'MDE', ciudad: 'Medellín', departamento: 'Antioquia', nombreAeropuerto: 'José María Córdova' },
  CALI: { iata: 'CLO', ciudad: 'Cali', departamento: 'Valle del Cauca', nombreAeropuerto: 'Alfonso Bonilla Aragón (Palmira)' },
  PALMIRA: { iata: 'CLO', ciudad: 'Cali', departamento: 'Valle del Cauca', nombreAeropuerto: 'Alfonso Bonilla Aragón' },
  BARRANQUILLA: { iata: 'BAQ', ciudad: 'Barranquilla', departamento: 'Atlántico', nombreAeropuerto: 'Ernesto Cortissoz (Soledad)' },
  SOLEDAD: { iata: 'BAQ', ciudad: 'Barranquilla', departamento: 'Atlántico', nombreAeropuerto: 'Ernesto Cortissoz' },
  CARTAGENA: { iata: 'CTG', ciudad: 'Cartagena', departamento: 'Bolívar', nombreAeropuerto: 'Rafael Núñez' },
  BUCARAMANGA: { iata: 'BGA', ciudad: 'Bucaramanga', departamento: 'Santander', nombreAeropuerto: 'Palonegro (Lebrija)' },
  LEBRIJA: { iata: 'BGA', ciudad: 'Bucaramanga', departamento: 'Santander', nombreAeropuerto: 'Palonegro' },
  PEREIRA: { iata: 'PEI', ciudad: 'Pereira', departamento: 'Risaralda', nombreAeropuerto: 'Matecaña' },
  CUCUTA: { iata: 'CUC', ciudad: 'Cúcuta', departamento: 'Norte de Santander', nombreAeropuerto: 'Camilo Daza' },
  SANTAMARTA: { iata: 'SMR', ciudad: 'Santa Marta', departamento: 'Magdalena', nombreAeropuerto: 'Simón Bolívar' },
  MONTERIA: { iata: 'MTR', ciudad: 'Montería', departamento: 'Córdoba', nombreAeropuerto: 'Los Garzones' },
  PASTO: { iata: 'PSO', ciudad: 'Pasto', departamento: 'Nariño', nombreAeropuerto: 'Antonio Nariño (Chachagüí)' },
  CHACHAGUI: { iata: 'PSO', ciudad: 'Pasto', departamento: 'Nariño', nombreAeropuerto: 'Antonio Nariño' },
  VALLEDUPAR: { iata: 'VUP', ciudad: 'Valledupar', departamento: 'Cesar', nombreAeropuerto: 'Alfonso López Pumarejo' },
  NEIVA: { iata: 'NVA', ciudad: 'Neiva', departamento: 'Huila', nombreAeropuerto: 'Benito Salas' },
  VILLAVICENCIO: { iata: 'VVC', ciudad: 'Villavicencio', departamento: 'Meta', nombreAeropuerto: 'Vanguardia' },
  ARMENIA: { iata: 'AXM', ciudad: 'Armenia', departamento: 'Quindío', nombreAeropuerto: 'El Edén (La Tebaida)' },
  TEBAIDA: { iata: 'AXM', ciudad: 'Armenia', departamento: 'Quindío', nombreAeropuerto: 'El Edén' },
  POPAYAN: { iata: 'PPN', ciudad: 'Popayán', departamento: 'Cauca', nombreAeropuerto: 'Guillermo León Valencia' },
  RIOHACHA: { iata: 'RCH', ciudad: 'Riohacha', departamento: 'La Guajira', nombreAeropuerto: 'Almirante Padilla' },
  FLORENCIA: { iata: 'FLA', ciudad: 'Florencia', departamento: 'Caquetá', nombreAeropuerto: 'Gustavo Artunduaga' },
  QUIBDO: { iata: 'UIB', ciudad: 'Quibdó', departamento: 'Chocó', nombreAeropuerto: 'El Caraño' },
  YOPAL: { iata: 'EYP', ciudad: 'Yopal', departamento: 'Casanare', nombreAeropuerto: 'El Alcaraván' },
  LETICIA: { iata: 'LET', ciudad: 'Leticia', departamento: 'Amazonas', nombreAeropuerto: 'Alfredo Vásquez Cobo' },
  SANANDRES: { iata: 'ADZ', ciudad: 'San Andrés', departamento: 'San Andrés y Providencia', nombreAeropuerto: 'Gustavo Rojas Pinilla' },
  IBAGUE: { iata: 'IBE', ciudad: 'Ibagué', departamento: 'Tolima', nombreAeropuerto: 'Perales' },
  MANIZALES: { iata: 'MZL', ciudad: 'Manizales', departamento: 'Caldas', nombreAeropuerto: 'La Nubia' },
  PUERTOASIS: { iata: 'PUU', ciudad: 'Puerto Asís', departamento: 'Putumayo', nombreAeropuerto: 'Tres de Mayo' },
  ARAUCA: { iata: 'AUC', ciudad: 'Arauca', departamento: 'Arauca', nombreAeropuerto: 'Santiago Pérez Quiroz' },
  APARTADO: { iata: 'APO', ciudad: 'Apartadó', departamento: 'Antioquia', nombreAeropuerto: 'Antonio Roldán Betancur' },
  CAREPA: { iata: 'APO', ciudad: 'Apartadó', departamento: 'Antioquia', nombreAeropuerto: 'Antonio Roldán Betancur' },
  COROZAL: { iata: 'CZU', ciudad: 'Corozal / Sincelejo', departamento: 'Sucre', nombreAeropuerto: 'Las Brujas' },
  SINCELEJO: { iata: 'CZU', ciudad: 'Sincelejo', departamento: 'Sucre', nombreAeropuerto: 'Las Brujas (Corozal)' },
  BARRANCABERMEJA: { iata: 'EJA', ciudad: 'Barrancabermeja', departamento: 'Santander', nombreAeropuerto: 'Yariguíes' },
  TUMACO: { iata: 'TCO', ciudad: 'Tumaco', departamento: 'Nariño', nombreAeropuerto: 'La Florida' },
};

/**
 * Normaliza una cadena de texto para búsqueda de ciudad.
 */
export function normalizarClaveCiudad(texto: string): string {
  if (!texto) return '';
  return texto
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '')
    .trim();
}

/**
 * Resuelve el código IATA a partir del nombre de la ciudad o del código si ya lo es.
 */
export function resolverIata(texto: string): string | null {
  if (!texto) return null;
  const limpio = texto.trim().toUpperCase();

  // Si ya es un IATA de 3 letras directo
  if (/^[A-Z]{3}$/.test(limpio)) {
    const existe = Object.values(CATALOGO_AEROPUERTOS_COLOMBIA).some((a) => a.iata === limpio);
    if (existe) return limpio;
  }

  const clave = normalizarClaveCiudad(limpio);
  for (const [k, aerop] of Object.entries(CATALOGO_AEROPUERTOS_COLOMBIA)) {
    if (clave.includes(k) || k.includes(clave)) {
      return aerop.iata;
    }
  }

  return null;
}
