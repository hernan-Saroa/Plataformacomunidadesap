/**
 * Catalogo oficial ESAP 2025-2 para Territoriales y CETAPs.
 * Fuente: docs/catalogos/CATALOGO_TERRITORIALES_CETAPS_ESAP_2025_2.md
 * Generado automaticamente a partir del documento oficial.
 */

export interface OfficialCetapCatalogItem {
  id: string;
  codigo: string;
  nombre: string;
  municipio: string;
  territorialCodigo: string;
  esSedePrincipal: boolean;
}

export interface OfficialTerritorialCatalogItem {
  id: string;
  codigo: string;
  nombre: string;
  ciudadPrincipal: string;
  departamentos: string[];
  aliases: string[];
  cetaps: OfficialCetapCatalogItem[];
}

export const OFFICIAL_TERRITORIALES_ESAP = [
  {
    "id": "terr-sc",
    "codigo": "SC",
    "nombre": "Sede Central",
    "ciudadPrincipal": "Bogotá D.C.",
    "departamentos": [
      "Bogotá D.C."
    ],
    "aliases": [
      "sede central",
      "sede central nacional",
      "bogota",
      "bogotá",
      "bogota d.c.",
      "bogotá d.c.",
      "sede central bogota",
      "sede central bogotá",
      "nacional",
      "sc"
    ],
    "cetaps": [
      {
        "id": "cetap-sc-001",
        "codigo": "SC-001",
        "nombre": "CETAP Sede Principal",
        "municipio": "Sede Principal",
        "territorialCodigo": "SC",
        "esSedePrincipal": true
      }
    ]
  },
  {
    "id": "terr-ant",
    "codigo": "ANT",
    "nombre": "Antioquia",
    "ciudadPrincipal": "Medellín",
    "departamentos": [
      "Antioquia"
    ],
    "aliases": [
      "antioquia",
      "ant"
    ],
    "cetaps": [
      {
        "id": "cetap-ant-001",
        "codigo": "ANT-001",
        "nombre": "CETAP Amagá",
        "municipio": "Amagá",
        "territorialCodigo": "ANT",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-ant-002",
        "codigo": "ANT-002",
        "nombre": "CETAP Amalfi",
        "municipio": "Amalfi",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-003",
        "codigo": "ANT-003",
        "nombre": "CETAP Andes",
        "municipio": "Andes",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-004",
        "codigo": "ANT-004",
        "nombre": "CETAP Apartadó",
        "municipio": "Apartadó",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-005",
        "codigo": "ANT-005",
        "nombre": "CETAP Arboletes",
        "municipio": "Arboletes",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-006",
        "codigo": "ANT-006",
        "nombre": "CETAP Caicedo",
        "municipio": "Caicedo",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-007",
        "codigo": "ANT-007",
        "nombre": "CETAP Carmen de Viboral",
        "municipio": "Carmen de Viboral",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-008",
        "codigo": "ANT-008",
        "nombre": "CETAP Caucasia",
        "municipio": "Caucasia",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-009",
        "codigo": "ANT-009",
        "nombre": "CETAP Chigorodó",
        "municipio": "Chigorodó",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-010",
        "codigo": "ANT-010",
        "nombre": "CETAP Ciudad Bolívar",
        "municipio": "Ciudad Bolívar",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-011",
        "codigo": "ANT-011",
        "nombre": "CETAP Dabeiba",
        "municipio": "Dabeiba",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-012",
        "codigo": "ANT-012",
        "nombre": "CETAP Ebéjico",
        "municipio": "Ebéjico",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-013",
        "codigo": "ANT-013",
        "nombre": "CETAP Fredonia",
        "municipio": "Fredonia",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-014",
        "codigo": "ANT-014",
        "nombre": "CETAP Giraldo",
        "municipio": "Giraldo",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-015",
        "codigo": "ANT-015",
        "nombre": "CETAP Ituango",
        "municipio": "Ituango",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-016",
        "codigo": "ANT-016",
        "nombre": "CETAP Jardín",
        "municipio": "Jardín",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-017",
        "codigo": "ANT-017",
        "nombre": "CETAP Jericó",
        "municipio": "Jericó",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-018",
        "codigo": "ANT-018",
        "nombre": "CETAP La Pintada",
        "municipio": "La Pintada",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-019",
        "codigo": "ANT-019",
        "nombre": "CETAP Medellín",
        "municipio": "Medellín",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-020",
        "codigo": "ANT-020",
        "nombre": "CETAP Mutatá",
        "municipio": "Mutatá",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-021",
        "codigo": "ANT-021",
        "nombre": "CETAP Necoclí",
        "municipio": "Necoclí",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-022",
        "codigo": "ANT-022",
        "nombre": "CETAP Puerto Berrío",
        "municipio": "Puerto Berrío",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-023",
        "codigo": "ANT-023",
        "nombre": "CETAP San Carlos",
        "municipio": "San Carlos",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-024",
        "codigo": "ANT-024",
        "nombre": "CETAP San Jerónimo",
        "municipio": "San Jerónimo",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-025",
        "codigo": "ANT-025",
        "nombre": "CETAP San Pedro de Urabá",
        "municipio": "San Pedro de Urabá",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-026",
        "codigo": "ANT-026",
        "nombre": "CETAP Santafé De Antioquia",
        "municipio": "Santafé De Antioquia",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-027",
        "codigo": "ANT-027",
        "nombre": "CETAP Santuario",
        "municipio": "Santuario",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-028",
        "codigo": "ANT-028",
        "nombre": "CETAP Segovia",
        "municipio": "Segovia",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-029",
        "codigo": "ANT-029",
        "nombre": "CETAP Sonsón",
        "municipio": "Sonsón",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-030",
        "codigo": "ANT-030",
        "nombre": "CETAP Titiribí",
        "municipio": "Titiribí",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-031",
        "codigo": "ANT-031",
        "nombre": "CETAP Turbo",
        "municipio": "Turbo",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-032",
        "codigo": "ANT-032",
        "nombre": "CETAP Valdivia",
        "municipio": "Valdivia",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-033",
        "codigo": "ANT-033",
        "nombre": "CETAP Vegachí",
        "municipio": "Vegachí",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-034",
        "codigo": "ANT-034",
        "nombre": "CETAP Vigía del Fuerte",
        "municipio": "Vigía del Fuerte",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ant-035",
        "codigo": "ANT-035",
        "nombre": "CETAP Yarumal",
        "municipio": "Yarumal",
        "territorialCodigo": "ANT",
        "esSedePrincipal": false
      }
    ]
  },
  {
    "id": "terr-atl",
    "codigo": "ATL",
    "nombre": "Atlántico",
    "ciudadPrincipal": "Barranquilla",
    "departamentos": [
      "Atlántico",
      "Cesar",
      "La Guajira",
      "Magdalena"
    ],
    "aliases": [
      "atlantico",
      "atlántico",
      "atl"
    ],
    "cetaps": [
      {
        "id": "cetap-atl-001",
        "codigo": "ATL-001",
        "nombre": "CETAP Barranquilla",
        "municipio": "Barranquilla",
        "territorialCodigo": "ATL",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-atl-002",
        "codigo": "ATL-002",
        "nombre": "CETAP Bosconia",
        "municipio": "Bosconia",
        "territorialCodigo": "ATL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-atl-003",
        "codigo": "ATL-003",
        "nombre": "CETAP La Jagua de Ibirico",
        "municipio": "La Jagua de Ibirico",
        "territorialCodigo": "ATL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-atl-004",
        "codigo": "ATL-004",
        "nombre": "CETAP Malambo",
        "municipio": "Malambo",
        "territorialCodigo": "ATL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-atl-005",
        "codigo": "ATL-005",
        "nombre": "CETAP Santa Marta",
        "municipio": "Santa Marta",
        "territorialCodigo": "ATL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-atl-006",
        "codigo": "ATL-006",
        "nombre": "CETAP Suan de la Trinidad",
        "municipio": "Suan de la Trinidad",
        "territorialCodigo": "ATL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-atl-007",
        "codigo": "ATL-007",
        "nombre": "CETAP Uribia",
        "municipio": "Uribia",
        "territorialCodigo": "ATL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-atl-008",
        "codigo": "ATL-008",
        "nombre": "CETAP Valledupar",
        "municipio": "Valledupar",
        "territorialCodigo": "ATL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-atl-009",
        "codigo": "ATL-009",
        "nombre": "CETAP Villanueva",
        "municipio": "Villanueva",
        "territorialCodigo": "ATL",
        "esSedePrincipal": false
      }
    ]
  },
  {
    "id": "terr-bcs",
    "codigo": "BCS",
    "nombre": "Bolívar-Córdoba-Sucre",
    "ciudadPrincipal": "Cartagena",
    "departamentos": [
      "Bolívar",
      "Córdoba",
      "Sucre",
      "Archipiélago de San Andrés, Providencia y Santa Catalina"
    ],
    "aliases": [
      "bolivarcordobasucre",
      "bolívarcórdobasucre",
      "bolivar-cordoba-sucre",
      "bolívar-córdoba-sucre",
      "bcs"
    ],
    "cetaps": [
      {
        "id": "cetap-bcs-001",
        "codigo": "BCS-001",
        "nombre": "CETAP Canalete",
        "municipio": "Canalete",
        "territorialCodigo": "BCS",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-bcs-002",
        "codigo": "BCS-002",
        "nombre": "CETAP Cartagena",
        "municipio": "Cartagena",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-003",
        "codigo": "BCS-003",
        "nombre": "CETAP Cereté",
        "municipio": "Cereté",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-004",
        "codigo": "BCS-004",
        "nombre": "CETAP Corozal",
        "municipio": "Corozal",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-005",
        "codigo": "BCS-005",
        "nombre": "CETAP El Carmen de Bolívar",
        "municipio": "El Carmen de Bolívar",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-006",
        "codigo": "BCS-006",
        "nombre": "CETAP Isla de Providencia",
        "municipio": "Isla de Providencia",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-007",
        "codigo": "BCS-007",
        "nombre": "CETAP La Unión - Sucre",
        "municipio": "La Unión - Sucre",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-008",
        "codigo": "BCS-008",
        "nombre": "CETAP Lorica",
        "municipio": "Lorica",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-009",
        "codigo": "BCS-009",
        "nombre": "CETAP Los Córdobas",
        "municipio": "Los Córdobas",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-010",
        "codigo": "BCS-010",
        "nombre": "CETAP Magangué",
        "municipio": "Magangué",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-011",
        "codigo": "BCS-011",
        "nombre": "CETAP Majagual",
        "municipio": "Majagual",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-012",
        "codigo": "BCS-012",
        "nombre": "CETAP Mompox",
        "municipio": "Mompox",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-013",
        "codigo": "BCS-013",
        "nombre": "CETAP Montelíbano",
        "municipio": "Montelíbano",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-014",
        "codigo": "BCS-014",
        "nombre": "CETAP Montería",
        "municipio": "Montería",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-015",
        "codigo": "BCS-015",
        "nombre": "CETAP Sabanalarga",
        "municipio": "Sabanalarga",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-016",
        "codigo": "BCS-016",
        "nombre": "CETAP San Andrés",
        "municipio": "San Andrés",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-017",
        "codigo": "BCS-017",
        "nombre": "CETAP San Andrés de Sotavento - Resguardo Indígena",
        "municipio": "San Andrés de Sotavento - Resguardo Indígena",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-018",
        "codigo": "BCS-018",
        "nombre": "CETAP San Antero",
        "municipio": "San Antero",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-019",
        "codigo": "BCS-019",
        "nombre": "CETAP San Basilio del Palenque",
        "municipio": "San Basilio del Palenque",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-020",
        "codigo": "BCS-020",
        "nombre": "CETAP Santa Rosa Del Sur",
        "municipio": "Santa Rosa Del Sur",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-021",
        "codigo": "BCS-021",
        "nombre": "CETAP Sincé",
        "municipio": "Sincé",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-022",
        "codigo": "BCS-022",
        "nombre": "CETAP Sincelejo",
        "municipio": "Sincelejo",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-bcs-023",
        "codigo": "BCS-023",
        "nombre": "CETAP Tierralta",
        "municipio": "Tierralta",
        "territorialCodigo": "BCS",
        "esSedePrincipal": false
      }
    ]
  },
  {
    "id": "terr-boy",
    "codigo": "BOY",
    "nombre": "Boyacá",
    "ciudadPrincipal": "Tunja",
    "departamentos": [
      "Boyacá",
      "Casanare"
    ],
    "aliases": [
      "boyaca",
      "boyacá",
      "boy"
    ],
    "cetaps": [
      {
        "id": "cetap-boy-001",
        "codigo": "BOY-001",
        "nombre": "CETAP Chiquinquirá",
        "municipio": "Chiquinquirá",
        "territorialCodigo": "BOY",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-boy-002",
        "codigo": "BOY-002",
        "nombre": "CETAP Duitama",
        "municipio": "Duitama",
        "territorialCodigo": "BOY",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-boy-003",
        "codigo": "BOY-003",
        "nombre": "CETAP Garagoa",
        "municipio": "Garagoa",
        "territorialCodigo": "BOY",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-boy-004",
        "codigo": "BOY-004",
        "nombre": "CETAP Guateque",
        "municipio": "Guateque",
        "territorialCodigo": "BOY",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-boy-005",
        "codigo": "BOY-005",
        "nombre": "CETAP Miraflores",
        "municipio": "Miraflores",
        "territorialCodigo": "BOY",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-boy-006",
        "codigo": "BOY-006",
        "nombre": "CETAP Moniquirá",
        "municipio": "Moniquirá",
        "territorialCodigo": "BOY",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-boy-007",
        "codigo": "BOY-007",
        "nombre": "CETAP Otanche",
        "municipio": "Otanche",
        "territorialCodigo": "BOY",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-boy-008",
        "codigo": "BOY-008",
        "nombre": "CETAP Paz de Ariporo",
        "municipio": "Paz de Ariporo",
        "territorialCodigo": "BOY",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-boy-009",
        "codigo": "BOY-009",
        "nombre": "CETAP Santa María",
        "municipio": "Santa María",
        "territorialCodigo": "BOY",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-boy-010",
        "codigo": "BOY-010",
        "nombre": "CETAP Soatá",
        "municipio": "Soatá",
        "territorialCodigo": "BOY",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-boy-011",
        "codigo": "BOY-011",
        "nombre": "CETAP Sogamoso",
        "municipio": "Sogamoso",
        "territorialCodigo": "BOY",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-boy-012",
        "codigo": "BOY-012",
        "nombre": "CETAP Tunja",
        "municipio": "Tunja",
        "territorialCodigo": "BOY",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-boy-013",
        "codigo": "BOY-013",
        "nombre": "CETAP Yopal",
        "municipio": "Yopal",
        "territorialCodigo": "BOY",
        "esSedePrincipal": false
      }
    ]
  },
  {
    "id": "terr-cal",
    "codigo": "CAL",
    "nombre": "Caldas",
    "ciudadPrincipal": "Manizales",
    "departamentos": [
      "Caldas"
    ],
    "aliases": [
      "caldas",
      "cal"
    ],
    "cetaps": [
      {
        "id": "cetap-cal-001",
        "codigo": "CAL-001",
        "nombre": "CETAP Aguadas",
        "municipio": "Aguadas",
        "territorialCodigo": "CAL",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-cal-002",
        "codigo": "CAL-002",
        "nombre": "CETAP Anserma",
        "municipio": "Anserma",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cal-003",
        "codigo": "CAL-003",
        "nombre": "CETAP Belalcázar",
        "municipio": "Belalcázar",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cal-004",
        "codigo": "CAL-004",
        "nombre": "CETAP Chinchiná",
        "municipio": "Chinchiná",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cal-005",
        "codigo": "CAL-005",
        "nombre": "CETAP Filadelfia",
        "municipio": "Filadelfia",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cal-006",
        "codigo": "CAL-006",
        "nombre": "CETAP La Dorada",
        "municipio": "La Dorada",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cal-007",
        "codigo": "CAL-007",
        "nombre": "CETAP Manizales",
        "municipio": "Manizales",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cal-008",
        "codigo": "CAL-008",
        "nombre": "CETAP Manzanares",
        "municipio": "Manzanares",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cal-009",
        "codigo": "CAL-009",
        "nombre": "CETAP Marmato",
        "municipio": "Marmato",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cal-010",
        "codigo": "CAL-010",
        "nombre": "CETAP Neira",
        "municipio": "Neira",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cal-011",
        "codigo": "CAL-011",
        "nombre": "CETAP Pácora",
        "municipio": "Pácora",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cal-012",
        "codigo": "CAL-012",
        "nombre": "CETAP Puerto Boyacá",
        "municipio": "Puerto Boyacá",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cal-013",
        "codigo": "CAL-013",
        "nombre": "CETAP Riosucio",
        "municipio": "Riosucio",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cal-014",
        "codigo": "CAL-014",
        "nombre": "CETAP Salamina",
        "municipio": "Salamina",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cal-015",
        "codigo": "CAL-015",
        "nombre": "CETAP Samaná",
        "municipio": "Samaná",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cal-016",
        "codigo": "CAL-016",
        "nombre": "CETAP Supía",
        "municipio": "Supía",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cal-017",
        "codigo": "CAL-017",
        "nombre": "CETAP Viterbo",
        "municipio": "Viterbo",
        "territorialCodigo": "CAL",
        "esSedePrincipal": false
      }
    ]
  },
  {
    "id": "terr-cau",
    "codigo": "CAU",
    "nombre": "Cauca",
    "ciudadPrincipal": "Popayán",
    "departamentos": [
      "Cauca"
    ],
    "aliases": [
      "cauca",
      "cau"
    ],
    "cetaps": [
      {
        "id": "cetap-cau-001",
        "codigo": "CAU-001",
        "nombre": "CETAP Bordo",
        "municipio": "Bordo",
        "territorialCodigo": "CAU",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-cau-002",
        "codigo": "CAU-002",
        "nombre": "CETAP Caldono",
        "municipio": "Caldono",
        "territorialCodigo": "CAU",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cau-003",
        "codigo": "CAU-003",
        "nombre": "CETAP El Tambo",
        "municipio": "El Tambo",
        "territorialCodigo": "CAU",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cau-004",
        "codigo": "CAU-004",
        "nombre": "CETAP Guapi",
        "municipio": "Guapi",
        "territorialCodigo": "CAU",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cau-005",
        "codigo": "CAU-005",
        "nombre": "CETAP Inzá",
        "municipio": "Inzá",
        "territorialCodigo": "CAU",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cau-006",
        "codigo": "CAU-006",
        "nombre": "CETAP Miranda",
        "municipio": "Miranda",
        "territorialCodigo": "CAU",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cau-007",
        "codigo": "CAU-007",
        "nombre": "CETAP Morales",
        "municipio": "Morales",
        "territorialCodigo": "CAU",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cau-008",
        "codigo": "CAU-008",
        "nombre": "CETAP Popayán",
        "municipio": "Popayán",
        "territorialCodigo": "CAU",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cau-009",
        "codigo": "CAU-009",
        "nombre": "CETAP Rosas",
        "municipio": "Rosas",
        "territorialCodigo": "CAU",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cau-010",
        "codigo": "CAU-010",
        "nombre": "CETAP Santander De Quilichao",
        "municipio": "Santander De Quilichao",
        "territorialCodigo": "CAU",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cau-011",
        "codigo": "CAU-011",
        "nombre": "CETAP Silvia - Guambía",
        "municipio": "Silvia - Guambía",
        "territorialCodigo": "CAU",
        "esSedePrincipal": false
      }
    ]
  },
  {
    "id": "terr-cho",
    "codigo": "CHO",
    "nombre": "Chocó",
    "ciudadPrincipal": "Quibdó",
    "departamentos": [
      "Chocó"
    ],
    "aliases": [
      "choco",
      "chocó",
      "cho"
    ],
    "cetaps": [
      {
        "id": "cetap-cho-001",
        "codigo": "CHO-001",
        "nombre": "CETAP Acandí",
        "municipio": "Acandí",
        "territorialCodigo": "CHO",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-cho-002",
        "codigo": "CHO-002",
        "nombre": "CETAP Bahía Solano",
        "municipio": "Bahía Solano",
        "territorialCodigo": "CHO",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cho-003",
        "codigo": "CHO-003",
        "nombre": "CETAP Istmina",
        "municipio": "Istmina",
        "territorialCodigo": "CHO",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cho-004",
        "codigo": "CHO-004",
        "nombre": "CETAP Quibdó",
        "municipio": "Quibdó",
        "territorialCodigo": "CHO",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cho-005",
        "codigo": "CHO-005",
        "nombre": "CETAP Tadó",
        "municipio": "Tadó",
        "territorialCodigo": "CHO",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cho-006",
        "codigo": "CHO-006",
        "nombre": "CETAP Unguía",
        "municipio": "Unguía",
        "territorialCodigo": "CHO",
        "esSedePrincipal": false
      }
    ]
  },
  {
    "id": "terr-cun",
    "codigo": "CUN",
    "nombre": "Cundinamarca",
    "ciudadPrincipal": "Facatativá",
    "departamentos": [
      "Cundinamarca"
    ],
    "aliases": [
      "cundinamarca",
      "cun"
    ],
    "cetaps": [
      {
        "id": "cetap-cun-001",
        "codigo": "CUN-001",
        "nombre": "CETAP Agua de Dios",
        "municipio": "Agua de Dios",
        "territorialCodigo": "CUN",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-cun-002",
        "codigo": "CUN-002",
        "nombre": "CETAP Cajicá",
        "municipio": "Cajicá",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-003",
        "codigo": "CUN-003",
        "nombre": "CETAP Cáqueza",
        "municipio": "Cáqueza",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-004",
        "codigo": "CUN-004",
        "nombre": "CETAP Chía",
        "municipio": "Chía",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-005",
        "codigo": "CUN-005",
        "nombre": "CETAP Chipaque",
        "municipio": "Chipaque",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-006",
        "codigo": "CUN-006",
        "nombre": "CETAP Cota",
        "municipio": "Cota",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-007",
        "codigo": "CUN-007",
        "nombre": "CETAP El Colegio",
        "municipio": "El Colegio",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-008",
        "codigo": "CUN-008",
        "nombre": "CETAP Facatativá",
        "municipio": "Facatativá",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-009",
        "codigo": "CUN-009",
        "nombre": "CETAP Funza",
        "municipio": "Funza",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-010",
        "codigo": "CUN-010",
        "nombre": "CETAP Fusagasugá",
        "municipio": "Fusagasugá",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-011",
        "codigo": "CUN-011",
        "nombre": "CETAP Gachalá",
        "municipio": "Gachalá",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-012",
        "codigo": "CUN-012",
        "nombre": "CETAP Gachetá",
        "municipio": "Gachetá",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-013",
        "codigo": "CUN-013",
        "nombre": "CETAP Gama",
        "municipio": "Gama",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-014",
        "codigo": "CUN-014",
        "nombre": "CETAP Girardot",
        "municipio": "Girardot",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-015",
        "codigo": "CUN-015",
        "nombre": "CETAP Guachetá",
        "municipio": "Guachetá",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-016",
        "codigo": "CUN-016",
        "nombre": "CETAP Guaduas",
        "municipio": "Guaduas",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-017",
        "codigo": "CUN-017",
        "nombre": "CETAP La Mesa",
        "municipio": "La Mesa",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-018",
        "codigo": "CUN-018",
        "nombre": "CETAP Madrid",
        "municipio": "Madrid",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-019",
        "codigo": "CUN-019",
        "nombre": "CETAP Mosquera",
        "municipio": "Mosquera",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-020",
        "codigo": "CUN-020",
        "nombre": "CETAP Pacho",
        "municipio": "Pacho",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-021",
        "codigo": "CUN-021",
        "nombre": "CETAP Puerto Salgar",
        "municipio": "Puerto Salgar",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-022",
        "codigo": "CUN-022",
        "nombre": "CETAP Ricaurte",
        "municipio": "Ricaurte",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-023",
        "codigo": "CUN-023",
        "nombre": "CETAP San Francisco",
        "municipio": "San Francisco",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-024",
        "codigo": "CUN-024",
        "nombre": "CETAP San Juan De Rioseco",
        "municipio": "San Juan De Rioseco",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-025",
        "codigo": "CUN-025",
        "nombre": "CETAP Soacha",
        "municipio": "Soacha",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-026",
        "codigo": "CUN-026",
        "nombre": "CETAP Sopó",
        "municipio": "Sopó",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-027",
        "codigo": "CUN-027",
        "nombre": "CETAP Tena",
        "municipio": "Tena",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-028",
        "codigo": "CUN-028",
        "nombre": "CETAP Tocancipá",
        "municipio": "Tocancipá",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-029",
        "codigo": "CUN-029",
        "nombre": "CETAP Villeta",
        "municipio": "Villeta",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-030",
        "codigo": "CUN-030",
        "nombre": "CETAP Zipaquirá",
        "municipio": "Zipaquirá",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-cun-031",
        "codigo": "CUN-031",
        "nombre": "CETAP Tibiritá",
        "municipio": "Tibiritá",
        "territorialCodigo": "CUN",
        "esSedePrincipal": false
      }
    ]
  },
  {
    "id": "terr-hui",
    "codigo": "HUI",
    "nombre": "Huila",
    "ciudadPrincipal": "Neiva",
    "departamentos": [
      "Huila",
      "Caquetá",
      "Putumayo"
    ],
    "aliases": [
      "huila",
      "hui"
    ],
    "cetaps": [
      {
        "id": "cetap-hui-001",
        "codigo": "HUI-001",
        "nombre": "CETAP Acevedo",
        "municipio": "Acevedo",
        "territorialCodigo": "HUI",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-hui-002",
        "codigo": "HUI-002",
        "nombre": "CETAP Algeciras",
        "municipio": "Algeciras",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-003",
        "codigo": "HUI-003",
        "nombre": "CETAP Belén De Los Andaquíes",
        "municipio": "Belén De Los Andaquíes",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-004",
        "codigo": "HUI-004",
        "nombre": "CETAP Cartagena del Chairá",
        "municipio": "Cartagena del Chairá",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-005",
        "codigo": "HUI-005",
        "nombre": "CETAP Colombia",
        "municipio": "Colombia",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-006",
        "codigo": "HUI-006",
        "nombre": "CETAP Florencia",
        "municipio": "Florencia",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-007",
        "codigo": "HUI-007",
        "nombre": "CETAP Garzón",
        "municipio": "Garzón",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-008",
        "codigo": "HUI-008",
        "nombre": "CETAP Iquira",
        "municipio": "Iquira",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-009",
        "codigo": "HUI-009",
        "nombre": "CETAP Isnos",
        "municipio": "Isnos",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-010",
        "codigo": "HUI-010",
        "nombre": "CETAP La Montañita",
        "municipio": "La Montañita",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-011",
        "codigo": "HUI-011",
        "nombre": "CETAP La Plata",
        "municipio": "La Plata",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-012",
        "codigo": "HUI-012",
        "nombre": "CETAP Mocoa",
        "municipio": "Mocoa",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-013",
        "codigo": "HUI-013",
        "nombre": "CETAP Neiva",
        "municipio": "Neiva",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-014",
        "codigo": "HUI-014",
        "nombre": "CETAP Orito",
        "municipio": "Orito",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-015",
        "codigo": "HUI-015",
        "nombre": "CETAP Paujil",
        "municipio": "Paujil",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-016",
        "codigo": "HUI-016",
        "nombre": "CETAP Pitalito",
        "municipio": "Pitalito",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-017",
        "codigo": "HUI-017",
        "nombre": "CETAP Puerto Asís",
        "municipio": "Puerto Asís",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-018",
        "codigo": "HUI-018",
        "nombre": "CETAP Puerto Leguízamo",
        "municipio": "Puerto Leguízamo",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-019",
        "codigo": "HUI-019",
        "nombre": "CETAP Resguardo Indígena Nasa Páez",
        "municipio": "Resguardo Indígena Nasa Páez",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-020",
        "codigo": "HUI-020",
        "nombre": "CETAP Resguardo Indígena Rumiyako",
        "municipio": "Resguardo Indígena Rumiyako",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-021",
        "codigo": "HUI-021",
        "nombre": "CETAP Resguardo La Gaitana",
        "municipio": "Resguardo La Gaitana",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-022",
        "codigo": "HUI-022",
        "nombre": "CETAP Resguardo Nasa Juan Tama",
        "municipio": "Resguardo Nasa Juan Tama",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-023",
        "codigo": "HUI-023",
        "nombre": "CETAP San Agustín",
        "municipio": "San Agustín",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-024",
        "codigo": "HUI-024",
        "nombre": "CETAP San Vicente Del Caguán",
        "municipio": "San Vicente Del Caguán",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-025",
        "codigo": "HUI-025",
        "nombre": "CETAP Santiago de Putumayo",
        "municipio": "Santiago de Putumayo",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-026",
        "codigo": "HUI-026",
        "nombre": "CETAP Solano",
        "municipio": "Solano",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-027",
        "codigo": "HUI-027",
        "nombre": "CETAP Solita",
        "municipio": "Solita",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-028",
        "codigo": "HUI-028",
        "nombre": "CETAP Suaza",
        "municipio": "Suaza",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-029",
        "codigo": "HUI-029",
        "nombre": "CETAP Valle del Guamuez",
        "municipio": "Valle del Guamuez",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-hui-030",
        "codigo": "HUI-030",
        "nombre": "CETAP Valparaíso",
        "municipio": "Valparaíso",
        "territorialCodigo": "HUI",
        "esSedePrincipal": false
      }
    ]
  },
  {
    "id": "terr-met",
    "codigo": "MET",
    "nombre": "Meta",
    "ciudadPrincipal": "Villavicencio",
    "departamentos": [
      "Meta",
      "Amazonas",
      "Guainía",
      "Guaviare",
      "Vaupés",
      "Vichada"
    ],
    "aliases": [
      "meta",
      "met"
    ],
    "cetaps": [
      {
        "id": "cetap-met-001",
        "codigo": "MET-001",
        "nombre": "CETAP Acacías",
        "municipio": "Acacías",
        "territorialCodigo": "MET",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-met-002",
        "codigo": "MET-002",
        "nombre": "CETAP Barranca De Upía",
        "municipio": "Barranca De Upía",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-003",
        "codigo": "MET-003",
        "nombre": "CETAP Cabuyaro",
        "municipio": "Cabuyaro",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-004",
        "codigo": "MET-004",
        "nombre": "CETAP Cubarral",
        "municipio": "Cubarral",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-005",
        "codigo": "MET-005",
        "nombre": "CETAP Cumaral",
        "municipio": "Cumaral",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-006",
        "codigo": "MET-006",
        "nombre": "CETAP Cumaribo",
        "municipio": "Cumaribo",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-007",
        "codigo": "MET-007",
        "nombre": "CETAP El Castillo",
        "municipio": "El Castillo",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-008",
        "codigo": "MET-008",
        "nombre": "CETAP Fuente de Oro",
        "municipio": "Fuente de Oro",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-009",
        "codigo": "MET-009",
        "nombre": "CETAP Granada",
        "municipio": "Granada",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-010",
        "codigo": "MET-010",
        "nombre": "CETAP Inírida",
        "municipio": "Inírida",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-011",
        "codigo": "MET-011",
        "nombre": "CETAP La Macarena",
        "municipio": "La Macarena",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-012",
        "codigo": "MET-012",
        "nombre": "CETAP La Uribe",
        "municipio": "La Uribe",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-013",
        "codigo": "MET-013",
        "nombre": "CETAP Lejanías",
        "municipio": "Lejanías",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-014",
        "codigo": "MET-014",
        "nombre": "CETAP Leticia",
        "municipio": "Leticia",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-015",
        "codigo": "MET-015",
        "nombre": "CETAP Mesetas",
        "municipio": "Mesetas",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-016",
        "codigo": "MET-016",
        "nombre": "CETAP Mitú",
        "municipio": "Mitú",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-017",
        "codigo": "MET-017",
        "nombre": "CETAP Monterrey",
        "municipio": "Monterrey",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-018",
        "codigo": "MET-018",
        "nombre": "CETAP Primavera",
        "municipio": "Primavera",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-019",
        "codigo": "MET-019",
        "nombre": "CETAP Puerto Carreño",
        "municipio": "Puerto Carreño",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-020",
        "codigo": "MET-020",
        "nombre": "CETAP Puerto Concordia",
        "municipio": "Puerto Concordia",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-021",
        "codigo": "MET-021",
        "nombre": "CETAP Puerto Gaitán",
        "municipio": "Puerto Gaitán",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-022",
        "codigo": "MET-022",
        "nombre": "CETAP Puerto Lleras",
        "municipio": "Puerto Lleras",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-023",
        "codigo": "MET-023",
        "nombre": "CETAP Puerto López",
        "municipio": "Puerto López",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-024",
        "codigo": "MET-024",
        "nombre": "CETAP Puerto Nariño",
        "municipio": "Puerto Nariño",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-025",
        "codigo": "MET-025",
        "nombre": "CETAP Puerto Rico",
        "municipio": "Puerto Rico",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-026",
        "codigo": "MET-026",
        "nombre": "CETAP San José Del Guaviare",
        "municipio": "San José Del Guaviare",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-027",
        "codigo": "MET-027",
        "nombre": "CETAP San Martín",
        "municipio": "San Martín",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-028",
        "codigo": "MET-028",
        "nombre": "CETAP Santa Rosalía",
        "municipio": "Santa Rosalía",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-met-029",
        "codigo": "MET-029",
        "nombre": "CETAP Villavicencio",
        "municipio": "Villavicencio",
        "territorialCodigo": "MET",
        "esSedePrincipal": false
      }
    ]
  },
  {
    "id": "terr-nar",
    "codigo": "NAR",
    "nombre": "Nariño",
    "ciudadPrincipal": "Pasto",
    "departamentos": [
      "Nariño"
    ],
    "aliases": [
      "narino",
      "nariño",
      "nar"
    ],
    "cetaps": [
      {
        "id": "cetap-nar-001",
        "codigo": "NAR-001",
        "nombre": "CETAP Barbacoas",
        "municipio": "Barbacoas",
        "territorialCodigo": "NAR",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-nar-002",
        "codigo": "NAR-002",
        "nombre": "CETAP Buesaco",
        "municipio": "Buesaco",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-003",
        "codigo": "NAR-003",
        "nombre": "CETAP Chachagüí",
        "municipio": "Chachagüí",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-004",
        "codigo": "NAR-004",
        "nombre": "CETAP Consacá",
        "municipio": "Consacá",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-005",
        "codigo": "NAR-005",
        "nombre": "CETAP Córdoba - Nariño",
        "municipio": "Córdoba - Nariño",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-006",
        "codigo": "NAR-006",
        "nombre": "CETAP Cumbal",
        "municipio": "Cumbal",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-007",
        "codigo": "NAR-007",
        "nombre": "CETAP El Charco",
        "municipio": "El Charco",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-008",
        "codigo": "NAR-008",
        "nombre": "CETAP El Peñol",
        "municipio": "El Peñol",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-009",
        "codigo": "NAR-009",
        "nombre": "CETAP Funes",
        "municipio": "Funes",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-010",
        "codigo": "NAR-010",
        "nombre": "CETAP Guaitarilla",
        "municipio": "Guaitarilla",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-011",
        "codigo": "NAR-011",
        "nombre": "CETAP Gualmatán",
        "municipio": "Gualmatán",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-012",
        "codigo": "NAR-012",
        "nombre": "CETAP Imués",
        "municipio": "Imués",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-013",
        "codigo": "NAR-013",
        "nombre": "CETAP Ipiales",
        "municipio": "Ipiales",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-014",
        "codigo": "NAR-014",
        "nombre": "CETAP La Unión - Nariño",
        "municipio": "La Unión - Nariño",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-015",
        "codigo": "NAR-015",
        "nombre": "CETAP Linares",
        "municipio": "Linares",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-016",
        "codigo": "NAR-016",
        "nombre": "CETAP Ospina",
        "municipio": "Ospina",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-017",
        "codigo": "NAR-017",
        "nombre": "CETAP Pasto",
        "municipio": "Pasto",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-018",
        "codigo": "NAR-018",
        "nombre": "CETAP Policarpa",
        "municipio": "Policarpa",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-019",
        "codigo": "NAR-019",
        "nombre": "CETAP Puerres",
        "municipio": "Puerres",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-020",
        "codigo": "NAR-020",
        "nombre": "CETAP Samaniego",
        "municipio": "Samaniego",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-021",
        "codigo": "NAR-021",
        "nombre": "CETAP San José De Albán",
        "municipio": "San José De Albán",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-022",
        "codigo": "NAR-022",
        "nombre": "CETAP San Lorenzo Nariño",
        "municipio": "San Lorenzo Nariño",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-023",
        "codigo": "NAR-023",
        "nombre": "CETAP San Pablo",
        "municipio": "San Pablo",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-024",
        "codigo": "NAR-024",
        "nombre": "CETAP Sandoná",
        "municipio": "Sandoná",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-025",
        "codigo": "NAR-025",
        "nombre": "CETAP Santacruz Guachavez",
        "municipio": "Santacruz Guachavez",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-026",
        "codigo": "NAR-026",
        "nombre": "CETAP Sibundoy",
        "municipio": "Sibundoy",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-027",
        "codigo": "NAR-027",
        "nombre": "CETAP Tablón De Gómez",
        "municipio": "Tablón De Gómez",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-028",
        "codigo": "NAR-028",
        "nombre": "CETAP Taminango",
        "municipio": "Taminango",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-029",
        "codigo": "NAR-029",
        "nombre": "CETAP Tumaco",
        "municipio": "Tumaco",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-030",
        "codigo": "NAR-030",
        "nombre": "CETAP Túquerres",
        "municipio": "Túquerres",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nar-031",
        "codigo": "NAR-031",
        "nombre": "CETAP Yacuanquer",
        "municipio": "Yacuanquer",
        "territorialCodigo": "NAR",
        "esSedePrincipal": false
      }
    ]
  },
  {
    "id": "terr-nsa",
    "codigo": "NSA",
    "nombre": "Norte de Santander",
    "ciudadPrincipal": "Cúcuta",
    "departamentos": [
      "Norte de Santander",
      "Arauca"
    ],
    "aliases": [
      "norte de santander",
      "nortedesantander",
      "nsa"
    ],
    "cetaps": [
      {
        "id": "cetap-nsa-001",
        "codigo": "NSA-001",
        "nombre": "CETAP Ábrego",
        "municipio": "Ábrego",
        "territorialCodigo": "NSA",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-nsa-002",
        "codigo": "NSA-002",
        "nombre": "CETAP Arauca",
        "municipio": "Arauca",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-003",
        "codigo": "NSA-003",
        "nombre": "CETAP Arauquita",
        "municipio": "Arauquita",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-004",
        "codigo": "NSA-004",
        "nombre": "CETAP Arboledas",
        "municipio": "Arboledas",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-005",
        "codigo": "NSA-005",
        "nombre": "CETAP Cáchira",
        "municipio": "Cáchira",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-006",
        "codigo": "NSA-006",
        "nombre": "CETAP Chinácota",
        "municipio": "Chinácota",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-007",
        "codigo": "NSA-007",
        "nombre": "CETAP Convención",
        "municipio": "Convención",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-008",
        "codigo": "NSA-008",
        "nombre": "CETAP Cravo Norte",
        "municipio": "Cravo Norte",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-009",
        "codigo": "NSA-009",
        "nombre": "CETAP Cúcuta",
        "municipio": "Cúcuta",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-010",
        "codigo": "NSA-010",
        "nombre": "CETAP El Tarra",
        "municipio": "El Tarra",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-011",
        "codigo": "NSA-011",
        "nombre": "CETAP Fortul",
        "municipio": "Fortul",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-012",
        "codigo": "NSA-012",
        "nombre": "CETAP Gramalote",
        "municipio": "Gramalote",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-013",
        "codigo": "NSA-013",
        "nombre": "CETAP Hacarí",
        "municipio": "Hacarí",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-014",
        "codigo": "NSA-014",
        "nombre": "CETAP Ocaña",
        "municipio": "Ocaña",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-015",
        "codigo": "NSA-015",
        "nombre": "CETAP Pamplona",
        "municipio": "Pamplona",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-016",
        "codigo": "NSA-016",
        "nombre": "CETAP Pamplonita",
        "municipio": "Pamplonita",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-017",
        "codigo": "NSA-017",
        "nombre": "CETAP Puerto Rondón",
        "municipio": "Puerto Rondón",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-018",
        "codigo": "NSA-018",
        "nombre": "CETAP Ragonvalia",
        "municipio": "Ragonvalia",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-019",
        "codigo": "NSA-019",
        "nombre": "CETAP Salazar",
        "municipio": "Salazar",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-020",
        "codigo": "NSA-020",
        "nombre": "CETAP Saravena",
        "municipio": "Saravena",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-021",
        "codigo": "NSA-021",
        "nombre": "CETAP Sardinata",
        "municipio": "Sardinata",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-022",
        "codigo": "NSA-022",
        "nombre": "CETAP Tame",
        "municipio": "Tame",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-nsa-023",
        "codigo": "NSA-023",
        "nombre": "CETAP Tibú",
        "municipio": "Tibú",
        "territorialCodigo": "NSA",
        "esSedePrincipal": false
      }
    ]
  },
  {
    "id": "terr-ris",
    "codigo": "RIS",
    "nombre": "Risaralda",
    "ciudadPrincipal": "Pereira",
    "departamentos": [
      "Quindío",
      "Risaralda"
    ],
    "aliases": [
      "risaralda",
      "quindio-risaralda",
      "quindío-risaralda",
      "quindiorisaralda",
      "ris"
    ],
    "cetaps": [
      {
        "id": "cetap-ris-001",
        "codigo": "RIS-001",
        "nombre": "CETAP Armenia",
        "municipio": "Armenia",
        "territorialCodigo": "RIS",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-ris-002",
        "codigo": "RIS-002",
        "nombre": "CETAP Belén De Umbría",
        "municipio": "Belén De Umbría",
        "territorialCodigo": "RIS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ris-003",
        "codigo": "RIS-003",
        "nombre": "CETAP Circasia",
        "municipio": "Circasia",
        "territorialCodigo": "RIS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ris-004",
        "codigo": "RIS-004",
        "nombre": "CETAP Córdoba - Quindío",
        "municipio": "Córdoba - Quindío",
        "territorialCodigo": "RIS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ris-005",
        "codigo": "RIS-005",
        "nombre": "CETAP Dosquebradas",
        "municipio": "Dosquebradas",
        "territorialCodigo": "RIS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ris-006",
        "codigo": "RIS-006",
        "nombre": "CETAP Filandia",
        "municipio": "Filandia",
        "territorialCodigo": "RIS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ris-007",
        "codigo": "RIS-007",
        "nombre": "CETAP Génova",
        "municipio": "Génova",
        "territorialCodigo": "RIS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ris-008",
        "codigo": "RIS-008",
        "nombre": "CETAP Marsella",
        "municipio": "Marsella",
        "territorialCodigo": "RIS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ris-009",
        "codigo": "RIS-009",
        "nombre": "CETAP Pereira",
        "municipio": "Pereira",
        "territorialCodigo": "RIS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ris-010",
        "codigo": "RIS-010",
        "nombre": "CETAP Pueblo Rico",
        "municipio": "Pueblo Rico",
        "territorialCodigo": "RIS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ris-011",
        "codigo": "RIS-011",
        "nombre": "CETAP Quinchía",
        "municipio": "Quinchía",
        "territorialCodigo": "RIS",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-ris-012",
        "codigo": "RIS-012",
        "nombre": "CETAP Santa Rosa De Cabal",
        "municipio": "Santa Rosa De Cabal",
        "territorialCodigo": "RIS",
        "esSedePrincipal": false
      }
    ]
  },
  {
    "id": "terr-san",
    "codigo": "SAN",
    "nombre": "Santander",
    "ciudadPrincipal": "Bucaramanga",
    "departamentos": [
      "Santander"
    ],
    "aliases": [
      "santander",
      "san"
    ],
    "cetaps": [
      {
        "id": "cetap-san-001",
        "codigo": "SAN-001",
        "nombre": "CETAP Barrancabermeja",
        "municipio": "Barrancabermeja",
        "territorialCodigo": "SAN",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-san-002",
        "codigo": "SAN-002",
        "nombre": "CETAP Bucaramanga",
        "municipio": "Bucaramanga",
        "territorialCodigo": "SAN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-san-003",
        "codigo": "SAN-003",
        "nombre": "CETAP Charalá",
        "municipio": "Charalá",
        "territorialCodigo": "SAN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-san-004",
        "codigo": "SAN-004",
        "nombre": "CETAP Cimitarra",
        "municipio": "Cimitarra",
        "territorialCodigo": "SAN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-san-005",
        "codigo": "SAN-005",
        "nombre": "CETAP Málaga",
        "municipio": "Málaga",
        "territorialCodigo": "SAN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-san-006",
        "codigo": "SAN-006",
        "nombre": "CETAP Matanza",
        "municipio": "Matanza",
        "territorialCodigo": "SAN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-san-007",
        "codigo": "SAN-007",
        "nombre": "CETAP Oiba",
        "municipio": "Oiba",
        "territorialCodigo": "SAN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-san-008",
        "codigo": "SAN-008",
        "nombre": "CETAP Puente Nacional",
        "municipio": "Puente Nacional",
        "territorialCodigo": "SAN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-san-009",
        "codigo": "SAN-009",
        "nombre": "CETAP San Gil",
        "municipio": "San Gil",
        "territorialCodigo": "SAN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-san-010",
        "codigo": "SAN-010",
        "nombre": "CETAP Santa Rosa Del Sur",
        "municipio": "Santa Rosa Del Sur",
        "territorialCodigo": "SAN",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-san-011",
        "codigo": "SAN-011",
        "nombre": "CETAP Zapatoca",
        "municipio": "Zapatoca",
        "territorialCodigo": "SAN",
        "esSedePrincipal": false
      }
    ]
  },
  {
    "id": "terr-tol",
    "codigo": "TOL",
    "nombre": "Tolima",
    "ciudadPrincipal": "Ibagué",
    "departamentos": [
      "Tolima"
    ],
    "aliases": [
      "tolima",
      "tol"
    ],
    "cetaps": [
      {
        "id": "cetap-tol-001",
        "codigo": "TOL-001",
        "nombre": "CETAP Ambalema",
        "municipio": "Ambalema",
        "territorialCodigo": "TOL",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-tol-002",
        "codigo": "TOL-002",
        "nombre": "CETAP Ataco",
        "municipio": "Ataco",
        "territorialCodigo": "TOL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-tol-003",
        "codigo": "TOL-003",
        "nombre": "CETAP Chaparral",
        "municipio": "Chaparral",
        "territorialCodigo": "TOL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-tol-004",
        "codigo": "TOL-004",
        "nombre": "CETAP Coyaima",
        "municipio": "Coyaima",
        "territorialCodigo": "TOL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-tol-005",
        "codigo": "TOL-005",
        "nombre": "CETAP Espinal",
        "municipio": "Espinal",
        "territorialCodigo": "TOL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-tol-006",
        "codigo": "TOL-006",
        "nombre": "CETAP Flandes",
        "municipio": "Flandes",
        "territorialCodigo": "TOL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-tol-007",
        "codigo": "TOL-007",
        "nombre": "CETAP Fresno",
        "municipio": "Fresno",
        "territorialCodigo": "TOL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-tol-008",
        "codigo": "TOL-008",
        "nombre": "CETAP Ibagué",
        "municipio": "Ibagué",
        "territorialCodigo": "TOL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-tol-009",
        "codigo": "TOL-009",
        "nombre": "CETAP Líbano",
        "municipio": "Líbano",
        "territorialCodigo": "TOL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-tol-010",
        "codigo": "TOL-010",
        "nombre": "CETAP Mariquita",
        "municipio": "Mariquita",
        "territorialCodigo": "TOL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-tol-011",
        "codigo": "TOL-011",
        "nombre": "CETAP Melgar",
        "municipio": "Melgar",
        "territorialCodigo": "TOL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-tol-012",
        "codigo": "TOL-012",
        "nombre": "CETAP Natagaima",
        "municipio": "Natagaima",
        "territorialCodigo": "TOL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-tol-013",
        "codigo": "TOL-013",
        "nombre": "CETAP Planadas",
        "municipio": "Planadas",
        "territorialCodigo": "TOL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-tol-014",
        "codigo": "TOL-014",
        "nombre": "CETAP Purificación",
        "municipio": "Purificación",
        "territorialCodigo": "TOL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-tol-015",
        "codigo": "TOL-015",
        "nombre": "CETAP Valle de San Juan",
        "municipio": "Valle de San Juan",
        "territorialCodigo": "TOL",
        "esSedePrincipal": false
      }
    ]
  },
  {
    "id": "terr-val",
    "codigo": "VAL",
    "nombre": "Valle",
    "ciudadPrincipal": "Cali",
    "departamentos": [
      "Valle del Cauca"
    ],
    "aliases": [
      "valle",
      "valle del cauca",
      "val"
    ],
    "cetaps": [
      {
        "id": "cetap-val-001",
        "codigo": "VAL-001",
        "nombre": "CETAP Buenaventura",
        "municipio": "Buenaventura",
        "territorialCodigo": "VAL",
        "esSedePrincipal": true
      },
      {
        "id": "cetap-val-002",
        "codigo": "VAL-002",
        "nombre": "CETAP Buga",
        "municipio": "Buga",
        "territorialCodigo": "VAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-val-003",
        "codigo": "VAL-003",
        "nombre": "CETAP Caicedonia",
        "municipio": "Caicedonia",
        "territorialCodigo": "VAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-val-004",
        "codigo": "VAL-004",
        "nombre": "CETAP Cali",
        "municipio": "Cali",
        "territorialCodigo": "VAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-val-005",
        "codigo": "VAL-005",
        "nombre": "CETAP Cartago",
        "municipio": "Cartago",
        "territorialCodigo": "VAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-val-006",
        "codigo": "VAL-006",
        "nombre": "CETAP Florida",
        "municipio": "Florida",
        "territorialCodigo": "VAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-val-007",
        "codigo": "VAL-007",
        "nombre": "CETAP La Unión",
        "municipio": "La Unión",
        "territorialCodigo": "VAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-val-008",
        "codigo": "VAL-008",
        "nombre": "CETAP Pradera",
        "municipio": "Pradera",
        "territorialCodigo": "VAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-val-009",
        "codigo": "VAL-009",
        "nombre": "CETAP Sevilla",
        "municipio": "Sevilla",
        "territorialCodigo": "VAL",
        "esSedePrincipal": false
      },
      {
        "id": "cetap-val-010",
        "codigo": "VAL-010",
        "nombre": "CETAP Tuluá",
        "municipio": "Tuluá",
        "territorialCodigo": "VAL",
        "esSedePrincipal": false
      }
    ]
  }
] as OfficialTerritorialCatalogItem[];

export const OFFICIAL_TERRITORIALES_BY_CODE = Object.fromEntries(
  OFFICIAL_TERRITORIALES_ESAP.map((territorial) => [territorial.codigo, territorial]),
) as Record<string, OfficialTerritorialCatalogItem>;

export const OFFICIAL_TERRITORIAL_ALIASES = Object.fromEntries(
  OFFICIAL_TERRITORIALES_ESAP.map((territorial) => [territorial.codigo, territorial.aliases]),
) as Record<string, string[]>;

export const OFFICIAL_CETAPS_ESAP = OFFICIAL_TERRITORIALES_ESAP.flatMap((territorial) => territorial.cetaps);

export function normalizeCatalogText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

export function buildOfficialTerritorialNameMap(): Map<string, OfficialTerritorialCatalogItem> {
  const map = new Map<string, OfficialTerritorialCatalogItem>();
  for (const territorial of OFFICIAL_TERRITORIALES_ESAP) {
    map.set(normalizeCatalogText(territorial.nombre), territorial);
    map.set(normalizeCatalogText(territorial.codigo), territorial);
    for (const alias of territorial.aliases) {
      map.set(normalizeCatalogText(alias), territorial);
    }
  }
  return map;
}

export function buildOfficialCetapNameMap(): Map<string, OfficialCetapCatalogItem> {
  const map = new Map<string, OfficialCetapCatalogItem>();
  for (const cetap of OFFICIAL_CETAPS_ESAP) {
    map.set(normalizeCatalogText(cetap.codigo), cetap);
    map.set(normalizeCatalogText(cetap.nombre), cetap);
    map.set(normalizeCatalogText(cetap.municipio), cetap);
  }
  return map;
}
