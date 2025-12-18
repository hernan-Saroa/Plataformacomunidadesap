/**
 * Configuración de sinónimos para búsqueda inteligente
 * Permite que usuarios encuentren módulos usando lenguaje natural
 */

export const searchSynonyms: Record<string, string[]> = {
  // ==================== USUARIOS ====================
  'users-management': [
    // Español
    'usuarios', 'user', 'persons', 'personas', 'gente',
    'estudiantes', 'students', 'alumnos', 'alumno',
    'docentes', 'teachers', 'profesores', 'profesor', 'maestros',
    'graduados', 'graduates', 'egresados', 'titulados',
    'administrativos', 'admin', 'staff',
    // Acciones
    'crear usuario', 'nuevo usuario', 'agregar persona', 'añadir usuario',
    'editar usuario', 'modificar persona', 'actualizar usuario',
    'buscar usuario', 'encontrar persona', 'ver usuarios',
    'listar usuarios', 'listado personas', 'directorio'
  ],
  
  // ==================== ENROLAMIENTO ====================
  'enrollment-requests': [
    // Español
    'enrolamiento', 'enrollment', 'qr', 'codigo qr', 'código qr',
    'aspirantes nuevos', 'nuevos ingresos', 'ingresos',
    'solicitudes', 'requests', 'peticiones', 'aplicaciones',
    'pendientes', 'pending', 'por aprobar',
    // Acciones
    'aprobar', 'approve', 'aceptar',
    'rechazar', 'reject', 'denegar',
    'validar', 'validate', 'verificar solicitud',
    'revisar solicitudes', 'ver solicitudes pendientes'
  ],
  
  // ==================== ROLES Y PERMISOS ====================
  'roles-administration': [
    // Español
    'roles', 'permisos', 'permissions', 'privilegios',
    'acceso', 'access', 'security', 'seguridad',
    'administrador', 'admin', 'super admin', 'superadmin',
    'coordinador', 'moderador', 'gestor',
    // Acciones
    'crear rol', 'nuevo rol', 'agregar rol',
    'asignar rol', 'dar permisos', 'otorgar acceso',
    'quitar rol', 'remover permisos', 'revocar acceso',
    'editar rol', 'modificar permisos',
    'generar qr', 'crear qr', 'qr para rol'
  ],
  
  // ==================== GRADUADOS ====================
  'graduates': [
    // Español
    'graduados', 'graduates', 'egresados', 'alumnis',
    'titulados', 'certificados de grado', 'diplomas',
    'verificación', 'validation', 'verificar titulo',
    'título', 'degree', 'grado', 'título universitario',
    // Acciones
    'generar certificado', 'crear certificado', 'emitir certificado',
    'descargar certificado', 'certificado digital',
    'verificar graduado', 'validar título',
    'buscar graduado', 'encontrar egresado',
    'gestionar graduados', 'administrar egresados'
  ],
  
  // ==================== REPORTES ====================
  'reports': [
    // Español
    'reportes', 'reports', 'informes', 'estadísticas',
    'stats', 'metrics', 'métricas', 'analytics', 'analítica',
    'gráficos', 'charts', 'visualización', 'dashboard',
    'datos', 'data', 'información',
    // Acciones
    'exportar', 'export', 'download', 'descargar',
    'generar reporte', 'crear informe', 'nuevo reporte',
    'programar reporte', 'agendar', 'schedule',
    'reporte personalizado', 'custom report',
    'exportar excel', 'descargar pdf', 'exportar csv'
  ],
  
  // ==================== AUDITORÍA ====================
  'audit': [
    // Español
    'auditoría', 'audit', 'logs', 'bitácora',
    'historial', 'history', 'registro', 'log',
    'cambios', 'changes', 'modificaciones', 'ediciones',
    'eventos', 'events', 'actividad', 'activity',
    // Acciones
    'ver actividad', 'ver historial', 'ver cambios',
    'monitorear', 'monitor', 'rastrear',
    'revisar logs', 'consultar historial',
    'quién cambió', 'quién modificó', 'quién eliminó'
  ],
  
  // ==================== DASHBOARD ====================
  'executive': [
    // Español
    'dashboard', 'panel', 'inicio', 'home',
    'principal', 'overview', 'resumen', 'summary',
    'métricas', 'metrics', 'indicadores', 'kpis',
    'estadísticas generales', 'vista general',
    // Acciones
    'ver resumen', 'ver estadísticas', 'ver métricas',
    'panel principal', 'pantalla inicial'
  ],
  
  // ==================== ASPIRANTES ====================
  'aspirantes': [
    // Español
    'aspirantes', 'aspirants', 'candidatos', 'aplicantes',
    'postulantes', 'interesados', 'prospectos',
    'admisiones', 'admissions', 'nuevos estudiantes',
    // Acciones
    'matricular', 'enroll', 'inscribir',
    'admitir', 'admit', 'aceptar aspirante',
    'rechazar aspirante', 'denegar admisión',
    'ver aspirantes', 'gestionar admisiones'
  ],
  
  // ==================== COMUNIDAD ====================
  'community': [
    // Español
    'comunidad', 'community', 'social', 'red social',
    'posts', 'publicaciones', 'noticias', 'news',
    'eventos', 'events', 'actividades', 'calendario',
    'anuncios', 'announcements', 'avisos', 'comunicados',
    // Acciones
    'crear post', 'nueva publicación', 'publicar',
    'nuevo evento', 'crear evento', 'agendar evento',
    'nuevo anuncio', 'comunicar', 'avisar'
  ],
  
  // ==================== BOLSA DE EMPLEO ====================
  'job-board': [
    // Español
    'bolsa de empleo', 'job board', 'empleos', 'jobs',
    'oportunidades', 'vacantes', 'ofertas laborales',
    'trabajos', 'careers', 'carreras profesionales',
    // Acciones
    'publicar empleo', 'nueva vacante', 'crear oferta',
    'ver empleos', 'buscar trabajo', 'oportunidades laborales'
  ],
  
  // ==================== CERTIFICADOS ====================
  'certificate-requests': [
    // Español
    'certificados', 'certificates', 'constancias',
    'certificados académicos', 'notas', 'transcripts',
    'solicitudes académicas', 'documentos académicos',
    // Acciones
    'solicitar certificado', 'pedir constancia',
    'aprobar certificado', 'generar constancia',
    'ver solicitudes', 'gestionar certificados'
  ]
};

/**
 * Metadata de los módulos para mostrar en resultados de búsqueda
 */
export const moduleMetadata: Record<string, {
  label: string;
  subtitle: string;
  icon: string;
  route: string;
  category: string;
  actions?: Array<{ label: string; route: string }>;
}> = {
  'users-management': {
    label: 'Usuarios',
    subtitle: 'Gestión de personas',
    icon: 'users',
    route: '/users',
    category: 'Administrativo',
    actions: [
      { label: 'Crear usuario', route: '/users?action=create' },
      { label: 'Importar usuarios', route: '/users?action=import' },
      { label: 'Exportar listado', route: '/users?action=export' }
    ]
  },
  
  'enrollment-requests': {
    label: 'Enrolamiento QR',
    subtitle: 'Solicitudes de ingreso',
    icon: 'qrcode',
    route: '/enrollment',
    category: 'Administrativo',
    actions: [
      { label: 'Ver solicitudes pendientes', route: '/enrollment?status=pending' },
      { label: 'Generar nuevo QR', route: '/enrollment?action=generate-qr' }
    ]
  },
  
  'roles-administration': {
    label: 'Roles y Permisos',
    subtitle: 'Control de acceso',
    icon: 'shield',
    route: '/roles',
    category: 'Seguridad',
    actions: [
      { label: 'Crear rol', route: '/roles?action=create' },
      { label: 'Generar QR para rol', route: '/roles?action=generate-qr' },
      { label: 'Ver matriz de permisos', route: '/roles?view=matrix' }
    ]
  },
  
  'graduates': {
    label: 'Graduados',
    subtitle: 'Gestión de egresados',
    icon: 'graduation-cap',
    route: '/graduates',
    category: 'Académico',
    actions: [
      { label: 'Generar certificado', route: '/graduates?action=certificate' },
      { label: 'Verificar título', route: '/graduates?action=verify' },
      { label: 'Ver documentos', route: '/graduates?view=documents' }
    ]
  },
  
  'reports': {
    label: 'Reportes',
    subtitle: 'Informes y estadísticas',
    icon: 'bar-chart',
    route: '/reports',
    category: 'Administrativo',
    actions: [
      { label: 'Generar reporte', route: '/reports?action=generate' },
      { label: 'Programar reporte', route: '/reports?action=schedule' },
      { label: 'Ver reportes programados', route: '/reports?view=scheduled' }
    ]
  },
  
  'audit': {
    label: 'Auditoría',
    subtitle: 'Historial de cambios',
    icon: 'activity',
    route: '/audit',
    category: 'Seguridad',
    actions: [
      { label: 'Ver eventos recientes', route: '/audit?filter=recent' },
      { label: 'Filtrar por usuario', route: '/audit?action=filter-user' }
    ]
  },
  
  'executive': {
    label: 'Dashboard Ejecutivo',
    subtitle: 'Panel principal',
    icon: 'trending-up',
    route: '/',
    category: 'Principal',
    actions: []
  },
  
  'aspirantes': {
    label: 'Aspirantes',
    subtitle: 'Candidatos y admisiones',
    icon: 'user-plus',
    route: '/aspirantes',
    category: 'Académico',
    actions: [
      { label: 'Nuevo aspirante', route: '/aspirantes?action=create' },
      { label: 'Ver solicitudes', route: '/aspirantes?view=requests' }
    ]
  },
  
  'community': {
    label: 'Comunidad',
    subtitle: 'Red social ESAP',
    icon: 'message-square',
    route: '/community',
    category: 'Comunidad',
    actions: [
      { label: 'Nueva publicación', route: '/community/posts?action=create' },
      { label: 'Crear evento', route: '/community/events?action=create' },
      { label: 'Nuevo anuncio', route: '/community/announcements?action=create' }
    ]
  },
  
  'job-board': {
    label: 'Bolsa de Empleo',
    subtitle: 'Oportunidades laborales',
    icon: 'briefcase',
    route: '/job-board',
    category: 'Servicios',
    actions: [
      { label: 'Publicar vacante', route: '/job-board?action=create' }
    ]
  },
  
  'certificate-requests': {
    label: 'Certificados Académicos',
    subtitle: 'Solicitudes de constancias',
    icon: 'file-text',
    route: '/certificates',
    category: 'Académico',
    actions: [
      { label: 'Nueva solicitud', route: '/certificates?action=request' },
      { label: 'Aprobar solicitudes', route: '/certificates?action=approve' }
    ]
  }
};

/**
 * Función de búsqueda difusa que encuentra módulos por sinónimos
 * Retorna array de IDs de módulos ordenados por relevancia
 */
export function findModuleBySearch(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  const matches: Array<{ module: string; score: number }> = [];
  
  // Buscar en cada módulo
  for (const [moduleId, synonyms] of Object.entries(searchSynonyms)) {
    for (const synonym of synonyms) {
      const normalizedSynonym = synonym.toLowerCase();
      
      // Coincidencia exacta
      if (normalizedSynonym === normalizedQuery) {
        matches.push({ module: moduleId, score: 100 });
        break;
      }
      
      // Empieza con
      if (normalizedSynonym.startsWith(normalizedQuery)) {
        matches.push({ module: moduleId, score: 90 });
        break;
      }
      
      // Contiene la palabra completa
      if (normalizedSynonym.includes(` ${normalizedQuery} `) || 
          normalizedSynonym.includes(` ${normalizedQuery}`) ||
          normalizedSynonym.startsWith(`${normalizedQuery} `)) {
        matches.push({ module: moduleId, score: 80 });
        break;
      }
      
      // Contiene como substring
      if (normalizedSynonym.includes(normalizedQuery)) {
        matches.push({ module: moduleId, score: 60 });
        break;
      }
      
      // Query contiene el sinónimo (búsqueda inversa)
      if (normalizedQuery.includes(normalizedSynonym) && normalizedSynonym.length > 3) {
        matches.push({ module: moduleId, score: 50 });
        break;
      }
    }
  }
  
  // Ordenar por score descendente y retornar IDs únicos
  return [...new Set(
    matches
      .sort((a, b) => b.score - a.score)
      .map(m => m.module)
  )];
}

/**
 * Obtener sugerencias de búsqueda basadas en query parcial
 */
export function getSearchSuggestions(query: string, limit: number = 5): string[] {
  if (query.length < 2) return [];
  
  const normalizedQuery = query.toLowerCase();
  const suggestions = new Set<string>();
  
  for (const synonyms of Object.values(searchSynonyms)) {
    for (const synonym of synonyms) {
      if (synonym.toLowerCase().startsWith(normalizedQuery)) {
        suggestions.add(synonym);
        if (suggestions.size >= limit) break;
      }
    }
    if (suggestions.size >= limit) break;
  }
  
  return Array.from(suggestions);
}

/**
 * Obtener acciones rápidas para un módulo
 */
export function getQuickActions(moduleId: string) {
  return moduleMetadata[moduleId]?.actions || [];
}
