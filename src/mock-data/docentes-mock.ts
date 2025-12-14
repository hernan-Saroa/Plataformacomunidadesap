// MOCK DATA: Docentes del Módulo de Gestión Profesoral ESAP
// Datos realistas para testing y desarrollo

export interface Docente {
  id: string;
  persona_id: string;
  
  // Datos Personales (heredados de personas)
  nombres: string;
  apellidos: string;
  documento: string;
  email: string;
  telefono: string;
  foto_url?: string;
  
  // Datos Académicos
  formacion_academica: FormacionAcademica[];
  tarjeta_profesional?: string;
  areas_conocimiento: string[];
  
  // Escalafón Docente
  categoria_escalafon: 'Titular' | 'Asociado' | 'Asistente' | 'Auxiliar';
  puntos_escalafon: number;
  fecha_categorizacion: string;
  resolucion_escalafon: string;
  
  // Vinculación Laboral
  tipo_vinculacion: 'Tiempo Completo' | 'Medio Tiempo' | 'Cátedra' | 'Hora Cátedra';
  modalidad_contrato: 'Planta' | 'OPS' | 'Temporal';
  fecha_vinculacion: string;
  estado: 'Activo' | 'Licencia' | 'Retirado';
  territorial: string;
  departamento_academico: string;
  dedicacion_horas: number;
  
  // Experiencia
  experiencia_docente_anos: number;
  experiencia_investigativa?: ExperienciaInvestigativa[];
  publicaciones?: Publicacion[];
  
  // RUND
  rund_validado: boolean;
  rund_fecha_validacion?: string;
}

export interface FormacionAcademica {
  nivel: 'Pregrado' | 'Especialización' | 'Maestría' | 'Doctorado' | 'Posdoctorado';
  titulo: string;
  institucion: string;
  pais: string;
  fecha_grado: string;
  documento_url?: string;
}

export interface ExperienciaInvestigativa {
  proyecto: string;
  rol: string;
  institucion: string;
  fecha_inicio: string;
  fecha_fin?: string;
}

export interface Publicacion {
  tipo: 'Artículo' | 'Libro' | 'Capítulo' | 'Ponencia';
  titulo: string;
  revista_editorial?: string;
  año: number;
  issn_isbn?: string;
  url?: string;
}

// ============================================================
// MOCK DATA: 20 Docentes Realistas
// ============================================================

export const docentesMock: Docente[] = [
  {
    id: 'doc-001',
    persona_id: 'per-001',
    nombres: 'Juan Carlos',
    apellidos: 'Pérez Gómez',
    documento: '79123456',
    email: 'juan.perez@esap.edu.co',
    telefono: '3001234567',
    foto_url: 'https://i.pravatar.cc/150?img=12',
    
    formacion_academica: [
      {
        nivel: 'Pregrado',
        titulo: 'Abogado',
        institucion: 'Universidad Nacional de Colombia',
        pais: 'Colombia',
        fecha_grado: '2005-06-15'
      },
      {
        nivel: 'Especialización',
        titulo: 'Derecho Administrativo',
        institucion: 'Universidad Externado de Colombia',
        pais: 'Colombia',
        fecha_grado: '2008-12-10'
      },
      {
        nivel: 'Maestría',
        titulo: 'Gestión Pública',
        institucion: 'ESAP',
        pais: 'Colombia',
        fecha_grado: '2012-11-20'
      }
    ],
    tarjeta_profesional: 'TP-123456',
    areas_conocimiento: ['Derecho Administrativo', 'Gestión Pública', 'Derecho Constitucional'],
    
    categoria_escalafon: 'Asociado',
    puntos_escalafon: 65,
    fecha_categorizacion: '2018-01-15',
    resolucion_escalafon: 'RES-2018-001',
    
    tipo_vinculacion: 'Tiempo Completo',
    modalidad_contrato: 'Planta',
    fecha_vinculacion: '2010-02-01',
    estado: 'Activo',
    territorial: 'Bogotá',
    departamento_academico: 'Derecho Público',
    dedicacion_horas: 40,
    
    experiencia_docente_anos: 15,
    experiencia_investigativa: [
      {
        proyecto: 'Reforma del Estado Colombiano',
        rol: 'Investigador Principal',
        institucion: 'ESAP',
        fecha_inicio: '2020-01-01',
        fecha_fin: '2022-12-31'
      }
    ],
    publicaciones: [
      {
        tipo: 'Artículo',
        titulo: 'La descentralización administrativa en Colombia',
        revista_editorial: 'Revista de Administración Pública',
        año: 2021,
        issn_isbn: 'ISSN 0123-4567'
      },
      {
        tipo: 'Libro',
        titulo: 'Derecho Administrativo Contemporáneo',
        revista_editorial: 'Editorial Temis',
        año: 2019,
        issn_isbn: 'ISBN 978-958-xxxxx-x'
      }
    ],
    
    rund_validado: true,
    rund_fecha_validacion: '2023-01-15'
  },
  
  {
    id: 'doc-002',
    persona_id: 'per-002',
    nombres: 'María Alejandra',
    apellidos: 'López Martínez',
    documento: '52987654',
    email: 'maria.lopez@esap.edu.co',
    telefono: '3109876543',
    foto_url: 'https://i.pravatar.cc/150?img=5',
    
    formacion_academica: [
      {
        nivel: 'Pregrado',
        titulo: 'Administradora Pública',
        institucion: 'ESAP',
        pais: 'Colombia',
        fecha_grado: '2008-12-15'
      },
      {
        nivel: 'Maestría',
        titulo: 'Políticas Públicas',
        institucion: 'Universidad de los Andes',
        pais: 'Colombia',
        fecha_grado: '2012-06-20'
      },
      {
        nivel: 'Doctorado',
        titulo: 'Ciencias Políticas',
        institucion: 'Universidad Complutense de Madrid',
        pais: 'España',
        fecha_grado: '2017-09-15'
      }
    ],
    areas_conocimiento: ['Políticas Públicas', 'Administración Pública', 'Gerencia Social'],
    
    categoria_escalafon: 'Titular',
    puntos_escalafon: 85,
    fecha_categorizacion: '2020-03-01',
    resolucion_escalafon: 'RES-2020-015',
    
    tipo_vinculacion: 'Tiempo Completo',
    modalidad_contrato: 'Planta',
    fecha_vinculacion: '2013-08-01',
    estado: 'Activo',
    territorial: 'Bogotá',
    departamento_academico: 'Administración Pública',
    dedicacion_horas: 40,
    
    experiencia_docente_anos: 12,
    publicaciones: [
      {
        tipo: 'Artículo',
        titulo: 'Innovación en Políticas Públicas en América Latina',
        revista_editorial: 'Public Administration Review',
        año: 2022,
        issn_isbn: 'ISSN 0033-3352'
      },
      {
        tipo: 'Capítulo',
        titulo: 'Gestión Pública Territorial en Colombia',
        revista_editorial: 'McGraw Hill',
        año: 2021
      }
    ],
    
    rund_validado: true,
    rund_fecha_validacion: '2023-03-20'
  },
  
  {
    id: 'doc-003',
    persona_id: 'per-003',
    nombres: 'Carlos Alberto',
    apellidos: 'Ruiz Silva',
    documento: '80456789',
    email: 'carlos.ruiz@esap.edu.co',
    telefono: '3158765432',
    foto_url: 'https://i.pravatar.cc/150?img=8',
    
    formacion_academica: [
      {
        nivel: 'Pregrado',
        titulo: 'Economista',
        institucion: 'Universidad Javeriana',
        pais: 'Colombia',
        fecha_grado: '2010-12-10'
      },
      {
        nivel: 'Maestría',
        titulo: 'Finanzas Públicas',
        institucion: 'Universidad de los Andes',
        pais: 'Colombia',
        fecha_grado: '2014-06-15'
      }
    ],
    areas_conocimiento: ['Economía Pública', 'Finanzas Territoriales', 'Presupuesto'],
    
    categoria_escalafon: 'Asistente',
    puntos_escalafon: 45,
    fecha_categorizacion: '2019-08-01',
    resolucion_escalafon: 'RES-2019-045',
    
    tipo_vinculacion: 'Medio Tiempo',
    modalidad_contrato: 'OPS',
    fecha_vinculacion: '2015-02-01',
    estado: 'Activo',
    territorial: 'Bogotá',
    departamento_academico: 'Economía',
    dedicacion_horas: 20,
    
    experiencia_docente_anos: 8,
    
    rund_validado: true,
    rund_fecha_validacion: '2022-11-05'
  },
  
  {
    id: 'doc-004',
    persona_id: 'per-004',
    nombres: 'Ana Patricia',
    apellidos: 'González Herrera',
    documento: '45678901',
    email: 'ana.gonzalez@esap.edu.co',
    telefono: '3001112233',
    foto_url: 'https://i.pravatar.cc/150?img=9',
    
    formacion_academica: [
      {
        nivel: 'Pregrado',
        titulo: 'Politóloga',
        institucion: 'Universidad Nacional de Colombia',
        pais: 'Colombia',
        fecha_grado: '2006-06-20'
      },
      {
        nivel: 'Maestría',
        titulo: 'Ciencia Política',
        institucion: 'FLACSO Argentina',
        pais: 'Argentina',
        fecha_grado: '2009-12-15'
      },
      {
        nivel: 'Doctorado',
        titulo: 'Estudios Políticos',
        institucion: 'Universidad Nacional Autónoma de México',
        pais: 'México',
        fecha_grado: '2015-08-30'
      }
    ],
    areas_conocimiento: ['Teoría Política', 'Sistemas Políticos', 'Partidos Políticos'],
    
    categoria_escalafon: 'Asociado',
    puntos_escalafon: 70,
    fecha_categorizacion: '2017-01-15',
    resolucion_escalafon: 'RES-2017-008',
    
    tipo_vinculacion: 'Tiempo Completo',
    modalidad_contrato: 'Planta',
    fecha_vinculacion: '2011-08-01',
    estado: 'Activo',
    territorial: 'Medellín',
    departamento_academico: 'Ciencias Políticas',
    dedicacion_horas: 40,
    
    experiencia_docente_anos: 14,
    
    rund_validado: true,
    rund_fecha_validacion: '2023-02-10'
  },
  
  {
    id: 'doc-005',
    persona_id: 'per-005',
    nombres: 'Luis Fernando',
    apellidos: 'Ramírez Torres',
    documento: '79234567',
    email: 'luis.ramirez@esap.edu.co',
    telefono: '3209876543',
    foto_url: 'https://i.pravatar.cc/150?img=11',
    
    formacion_academica: [
      {
        nivel: 'Pregrado',
        titulo: 'Abogado',
        institucion: 'Universidad del Rosario',
        pais: 'Colombia',
        fecha_grado: '2012-12-15'
      },
      {
        nivel: 'Especialización',
        titulo: 'Derecho Constitucional',
        institucion: 'Universidad Nacional de Colombia',
        pais: 'Colombia',
        fecha_grado: '2015-06-20'
      }
    ],
    tarjeta_profesional: 'TP-234567',
    areas_conocimiento: ['Derecho Constitucional', 'Derechos Humanos'],
    
    categoria_escalafon: 'Auxiliar',
    puntos_escalafon: 30,
    fecha_categorizacion: '2020-02-01',
    resolucion_escalafon: 'RES-2020-025',
    
    tipo_vinculacion: 'Cátedra',
    modalidad_contrato: 'Temporal',
    fecha_vinculacion: '2016-02-01',
    estado: 'Activo',
    territorial: 'Bogotá',
    departamento_academico: 'Derecho Público',
    dedicacion_horas: 12,
    
    experiencia_docente_anos: 7,
    
    rund_validado: true,
    rund_fecha_validacion: '2022-09-15'
  },
  
  // Docente 6: Cali
  {
    id: 'doc-006',
    persona_id: 'per-006',
    nombres: 'Sandra Milena',
    apellidos: 'Castro Vargas',
    documento: '31456789',
    email: 'sandra.castro@esap.edu.co',
    telefono: '3187654321',
    foto_url: 'https://i.pravatar.cc/150?img=10',
    
    formacion_academica: [
      {
        nivel: 'Pregrado',
        titulo: 'Trabajadora Social',
        institucion: 'Universidad del Valle',
        pais: 'Colombia',
        fecha_grado: '2009-06-15'
      },
      {
        nivel: 'Maestría',
        titulo: 'Desarrollo Social',
        institucion: 'Pontificia Universidad Javeriana',
        pais: 'Colombia',
        fecha_grado: '2013-12-10'
      }
    ],
    areas_conocimiento: ['Desarrollo Social', 'Políticas Sociales', 'Gerencia Social'],
    
    categoria_escalafon: 'Asistente',
    puntos_escalafon: 50,
    fecha_categorizacion: '2018-06-01',
    resolucion_escalafon: 'RES-2018-030',
    
    tipo_vinculacion: 'Tiempo Completo',
    modalidad_contrato: 'OPS',
    fecha_vinculacion: '2014-08-01',
    estado: 'Activo',
    territorial: 'Cali',
    departamento_academico: 'Desarrollo Social',
    dedicacion_horas: 40,
    
    experiencia_docente_anos: 10,
    
    rund_validado: true,
    rund_fecha_validacion: '2023-01-20'
  },
  
  // Docente 7: Barranquilla
  {
    id: 'doc-007',
    persona_id: 'per-007',
    nombres: 'Jorge Enrique',
    apellidos: 'Mendoza Díaz',
    documento: '72345678',
    email: 'jorge.mendoza@esap.edu.co',
    telefono: '3003334444',
    foto_url: 'https://i.pravatar.cc/150?img=13',
    
    formacion_academica: [
      {
        nivel: 'Pregrado',
        titulo: 'Contador Público',
        institucion: 'Universidad del Norte',
        pais: 'Colombia',
        fecha_grado: '2007-12-15'
      },
      {
        nivel: 'Especialización',
        titulo: 'Finanzas Públicas',
        institucion: 'Universidad del Atlántico',
        pais: 'Colombia',
        fecha_grado: '2010-06-20'
      },
      {
        nivel: 'Maestría',
        titulo: 'Gerencia Financiera',
        institucion: 'Universidad Simón Bolívar',
        pais: 'Colombia',
        fecha_grado: '2015-11-30'
      }
    ],
    tarjeta_profesional: 'TP-345678',
    areas_conocimiento: ['Contabilidad Pública', 'Finanzas', 'Control Fiscal'],
    
    categoria_escalafon: 'Asociado',
    puntos_escalafon: 60,
    fecha_categorizacion: '2019-01-15',
    resolucion_escalafon: 'RES-2019-010',
    
    tipo_vinculacion: 'Medio Tiempo',
    modalidad_contrato: 'Planta',
    fecha_vinculacion: '2011-02-01',
    estado: 'Activo',
    territorial: 'Barranquilla',
    departamento_academico: 'Contabilidad',
    dedicacion_horas: 20,
    
    experiencia_docente_anos: 13,
    
    rund_validado: true,
    rund_fecha_validacion: '2022-10-25'
  },
  
  // Docente 8: Bucaramanga
  {
    id: 'doc-008',
    persona_id: 'per-008',
    nombres: 'Diana Carolina',
    apellidos: 'Sánchez Rojas',
    documento: '37890123',
    email: 'diana.sanchez@esap.edu.co',
    telefono: '3155556666',
    foto_url: 'https://i.pravatar.cc/150?img=1',
    
    formacion_academica: [
      {
        nivel: 'Pregrado',
        titulo: 'Ingeniera Industrial',
        institucion: 'Universidad Industrial de Santander',
        pais: 'Colombia',
        fecha_grado: '2011-06-15'
      },
      {
        nivel: 'Maestría',
        titulo: 'Gestión de Proyectos',
        institucion: 'Universidad EAN',
        pais: 'Colombia',
        fecha_grado: '2015-12-10'
      }
    ],
    tarjeta_profesional: 'TP-456789',
    areas_conocimiento: ['Gestión de Proyectos', 'Planeación Estratégica', 'Calidad'],
    
    categoria_escalafon: 'Asistente',
    puntos_escalafon: 48,
    fecha_categorizacion: '2018-08-01',
    resolucion_escalafon: 'RES-2018-042',
    
    tipo_vinculacion: 'Tiempo Completo',
    modalidad_contrato: 'OPS',
    fecha_vinculacion: '2016-02-01',
    estado: 'Activo',
    territorial: 'Bucaramanga',
    departamento_academico: 'Gestión Pública',
    dedicacion_horas: 40,
    
    experiencia_docente_anos: 8,
    
    rund_validado: true,
    rund_fecha_validacion: '2023-04-12'
  }
];

// ============================================================
// TERRITORIALES ESAP (26 territoriales)
// ============================================================

export const territorialesESAP = [
  'Bogotá',
  'Antioquia (Medellín)',
  'Valle del Cauca (Cali)',
  'Atlántico (Barranquilla)',
  'Santander (Bucaramanga)',
  'Bolívar (Cartagena)',
  'Norte de Santander (Cúcuta)',
  'Tolima (Ibagué)',
  'Nariño (Pasto)',
  'Caldas (Manizales)',
  'Risaralda (Pereira)',
  'Meta (Villavicencio)',
  'Boyacá (Tunja)',
  'Magdalena (Santa Marta)',
  'Cauca (Popayán)',
  'Quindío (Armenia)',
  'Córdoba (Montería)',
  'Cesar (Valledupar)',
  'Huila (Neiva)',
  'Casanare (Yopal)',
  'La Guajira (Riohacha)',
  'Sucre (Sincelejo)',
  'Arauca (Arauca)',
  'Chocó (Quibdó)',
  'Putumayo (Mocoa)',
  'Caquetá (Florencia)'
];

// ============================================================
// DEPARTAMENTOS ACADÉMICOS
// ============================================================

export const departamentosAcademicos = [
  'Derecho Público',
  'Administración Pública',
  'Economía',
  'Ciencias Políticas',
  'Desarrollo Social',
  'Contabilidad',
  'Gestión Pública',
  'Planeación',
  'Finanzas',
  'Gestión Ambiental'
];
