# 🏢 MÓDULOS DEL BACKOFFICE ADMINISTRATIVO - SUPER APP ESAP

## 📋 ÍNDICE
1. [Dashboard Ejecutivo](#1-dashboard-ejecutivo)
2. [Gestión de Usuarios](#2-gestión-de-usuarios)
3. [Estructura Organizacional](#3-estructura-organizacional)
4. [Programas Académicos](#4-programas-académicos)
5. [Roles y Permisos](#5-roles-y-permisos)
6. [Auditoría](#6-auditoría)
7. [Reportes](#7-reportes)
8. [Registro de Aspiraciones](#8-registro-de-aspiraciones)
9. [Certificación Laboral](#9-certificación-laboral)
10. [Gestión Profesional](#10-gestión-profesional)
11. [Control Interno](#11-control-interno)
12. [Comunidad](#12-comunidad)

---

## 1. DASHBOARD EJECUTIVO

### 📊 Descripción
Panel principal con métricas ejecutivas en tiempo real del sistema.

### 🎯 Funcionalidades

#### Métricas Principales (Cards Superiores)
```typescript
interface MetricasSuperiores {
  totalUsuarios: {
    valor: number;
    tendencia: 'up' | 'down' | 'neutral';
    porcentaje: string;
    comparacion: string; // "vs mes anterior"
  };
  usuariosActivos: {
    valor: number;
    tendencia: 'up' | 'down' | 'neutral';
    porcentaje: string;
    periodo: string; // "Últimos 30 días"
  };
  usuariosBloqueados: {
    valor: number;
    alerta: boolean; // true si > 10
  };
  crecimientoMensual: {
    valor: string; // "+12.5%"
    tendencia: 'up' | 'down' | 'neutral';
  };
}
```

#### Sección de Filtros Globales
```typescript
interface FiltrosGlobales {
  rangoFechas: {
    fechaInicio: Date;
    fechaFin: Date;
    presetsRapidos: ['Hoy', 'Última Semana', 'Último Mes', 'Último Trimestre', 'Último Año', 'Personalizado'];
  };
  territorial: {
    nivel: 'Nacional' | 'Territorial' | 'Regional' | 'Sede';
    territorialId?: UUID;
    regionalId?: UUID;
    sedeId?: UUID;
  };
  tipoUsuario: {
    todos: boolean;
    estudiantes: boolean;
    graduados: boolean;
    docentes: boolean;
    administrativos: boolean;
  };
}
```

#### Gráficos y Visualizaciones
```typescript
interface VisualizacionesDashboard {
  // Gráfico de Crecimiento de Usuarios
  crecimientoUsuarios: {
    tipo: 'LineChart';
    periodos: ('Día' | 'Semana' | 'Mes' | 'Año')[];
    series: {
      totalUsuarios: number[];
      nuevosUsuarios: number[];
      usuariosActivos: number[];
    };
    etiquetas: string[]; // Fechas
  };
  
  // Distribución por Rol
  distribucionRoles: {
    tipo: 'PieChart' | 'DonutChart';
    datos: {
      rol: string;
      cantidad: number;
      porcentaje: number;
      color: string;
    }[];
  };
  
  // Usuarios por Sede
  usuariosPorSede: {
    tipo: 'BarChart';
    datos: {
      sede: string;
      cantidad: number;
      activos: number;
      inactivos: number;
    }[];
    ordenamiento: 'alfabetico' | 'cantidad';
  };
  
  // Mapa de Cobertura Nacional
  mapaCobertura: {
    tipo: 'GeoMap';
    datos: {
      departamento: string;
      cantidad: number;
      densidad: 'baja' | 'media' | 'alta';
      territoriales: number;
      sedes: number;
    }[];
  };
  
  // Actividad Reciente
  actividadReciente: {
    tipo: 'Timeline';
    eventos: {
      tipo: 'usuario_creado' | 'usuario_bloqueado' | 'certificado_emitido' | 'solicitud_recibida';
      descripcion: string;
      usuario: string;
      timestamp: Date;
      icono: string;
      color: string;
    }[];
    limite: 10;
  };
}
```

#### Widgets Informativos
```typescript
interface WidgetsDashboard {
  // Top Sedes por Actividad
  topSedes: {
    sede: string;
    usuarios: number;
    actividad: number; // Score de actividad
    crecimiento: string; // "+15%"
  }[];
  
  // Alertas y Pendientes
  alertas: {
    tipo: 'warning' | 'error' | 'info';
    titulo: string;
    descripcion: string;
    cantidad: number;
    accion: string; // URL a módulo
  }[];
  
  // Solicitudes Pendientes
  solicitudesPendientes: {
    vinculaciones: number;
    certificadosLaborales: number;
    convocatorias: number;
    reportes: number;
  };
}
```

### 🔌 Endpoints de API Necesarios

```typescript
// GET /api/dashboard/metricas-principales
GET /api/dashboard/metricas-principales?fechaInicio=2024-01-01&fechaFin=2024-12-31&territorialId=xxx
Response: MetricasSuperiores

// GET /api/dashboard/crecimiento-usuarios
GET /api/dashboard/crecimiento-usuarios?periodo=mes&territorialId=xxx
Response: CrecimientoUsuarios[]

// GET /api/dashboard/distribucion-roles
GET /api/dashboard/distribucion-roles?territorialId=xxx
Response: DistribucionRoles[]

// GET /api/dashboard/usuarios-por-sede
GET /api/dashboard/usuarios-por-sede?territorialId=xxx&limit=20
Response: UsuariosPorSede[]

// GET /api/dashboard/actividad-reciente
GET /api/dashboard/actividad-reciente?limit=10
Response: ActividadReciente[]

// GET /api/dashboard/alertas
GET /api/dashboard/alertas
Response: Alertas[]
```

---

## 2. GESTIÓN DE USUARIOS

### 👥 Descripción
Administración completa del sistema de usuarios con roles múltiples simultáneos.

### 🎯 Funcionalidades

#### Listado de Usuarios
```typescript
interface ListadoUsuarios {
  filtros: {
    busqueda: string; // Nombre, email, documento
    estado: 'Todos' | 'Activo' | 'Inactivo' | 'Suspendido' | 'Bloqueado';
    rol: string[]; // Multi-select
    territorial: UUID;
    sede: UUID;
    ubicacion: string; // Ciudad
    fechaCreacion: RangoFechas;
  };
  
  ordenamiento: {
    campo: 'nombre' | 'email' | 'fechaCreacion' | 'ultimoAcceso' | 'estado';
    direccion: 'asc' | 'desc';
  };
  
  paginacion: {
    pagina: number;
    porPagina: 10 | 25 | 50 | 100;
    total: number;
  };
  
  acciones: {
    exportar: 'CSV' | 'Excel' | 'PDF';
    importarMasivo: boolean;
    crearUsuario: boolean;
  };
}
```

#### Ficha de Usuario
```typescript
interface FichaUsuario {
  // Información Personal (desde tabla personas)
  datosPersonales: {
    tipoDocumento: string;
    numeroDocumento: string;
    primerNombre: string;
    segundoNombre?: string;
    primerApellido: string;
    segundoApellido?: string;
    nombreCompleto: string; // Generado
    fechaNacimiento: Date;
    genero: string;
    estadoCivil: string;
    foto?: string;
  };
  
  // Información de Contacto
  contacto: {
    telefonoMovil: string;
    telefonoFijo?: string;
    email: string; // Email del usuario
    emailVerificado: boolean;
    direccion: string;
    ciudad: string;
    departamento: string;
    pais: string;
  };
  
  // Datos del Usuario
  usuario: {
    id: UUID;
    email: string;
    estado: 'Activo' | 'Inactivo' | 'Suspendido' | 'Bloqueado';
    ultimoAcceso: Date;
    fechaCreacion: Date;
    creadoPor: string;
  };
  
  // Roles Asignados (Multi-Rol)
  roles: {
    id: UUID;
    rol: string;
    nivel: 'Nacional' | 'Territorial' | 'Regional' | 'Sede' | 'Programa';
    territorial?: string;
    regional?: string;
    sede?: string;
    programa?: string;
    fechaInicio: Date;
    fechaFin?: Date;
    activo: boolean;
    permisos: string[]; // Permisos heredados del rol
  }[];
  
  // Historial Académico (si aplica)
  historialAcademico: {
    matriculas: {
      codigoEstudiante: string;
      programa: string;
      sede: string;
      periodo: string;
      estado: string;
      promedioAcumulado: number;
      creditosAprobados: number;
    }[];
    certificados: {
      tipo: 'Graduado' | 'Laboral';
      codigo: string;
      programa?: string;
      fechaEmision: Date;
      estado: string;
    }[];
  };
  
  // Actividad Reciente
  actividadReciente: {
    tipo: string;
    descripcion: string;
    fecha: Date;
    ip: string;
  }[];
  
  // Configuración de Seguridad
  seguridad: {
    autenticacion2FA: boolean;
    cambiarPassword: boolean;
    sesionesActivas: number;
    intentosFallidos: number;
    bloqueoTemporal?: Date;
  };
}
```

#### Crear/Editar Usuario
```typescript
interface FormularioUsuario {
  // Paso 1: Datos Personales
  paso1_datosPersonales: {
    tipoDocumento: string;
    numeroDocumento: string;
    primerNombre: string;
    segundoNombre?: string;
    primerApellido: string;
    segundoApellido?: string;
    fechaNacimiento: Date;
    genero: string;
    estadoCivil?: string;
  };
  
  // Paso 2: Contacto
  paso2_contacto: {
    email: string;
    telefonoMovil: string;
    telefonoFijo?: string;
    direccion: string;
    ciudad: string;
    departamento: string;
  };
  
  // Paso 3: Roles y Permisos
  paso3_roles: {
    rol: string;
    nivel: 'Nacional' | 'Territorial' | 'Regional' | 'Sede' | 'Programa';
    territorialId?: UUID;
    regionalId?: UUID;
    sedeId?: UUID;
    programaId?: UUID;
    fechaInicio: Date;
    fechaFin?: Date;
  }[];
  
  // Paso 4: Configuración
  paso4_configuracion: {
    estado: 'Activo' | 'Inactivo';
    enviarEmailBienvenida: boolean;
    requiereCambioPassword: boolean;
  };
  
  validaciones: {
    documentoUnico: boolean; // Verificar que no exista
    emailUnico: boolean; // Verificar que no exista
    rolValido: boolean; // Verificar permisos
    jerarquiaValida: boolean; // Verificar estructura territorial
  };
}
```

#### Métricas por Sede
```typescript
interface MetricasPorSede {
  sede: {
    id: UUID;
    nombre: string;
    codigo: string;
    territorial: string;
    ciudad: string;
  };
  
  usuarios: {
    total: number;
    activos: number;
    inactivos: number;
    porRol: {
      rol: string;
      cantidad: number;
    }[];
  };
  
  distribucion: {
    estudiantes: number;
    docentes: number;
    administrativos: number;
    otros: number;
  };
  
  crecimiento: {
    ultimoMes: number;
    tendencia: 'up' | 'down' | 'neutral';
    porcentaje: string;
  };
}
```

#### Configuración de Enrolamiento
```typescript
interface ConfiguracionEnrolamiento {
  qrCode: {
    habilitado: boolean;
    duracionDias: number; // Tiempo de validez del código
    tiposUsuarioPermitidos: string[];
    requiereAprobacion: boolean;
  };
  
  formulario: {
    habilitado: boolean;
    camposOpcionales: string[];
    requiereValidacionEmail: boolean;
    requiereValidacionDocumento: boolean;
  };
  
  validaciones: {
    emailInstitucional: boolean; // Solo @esap.edu.co
    emailDominiosPermitidos: string[]; // Otros dominios
    documentoUnico: boolean;
    edadMinima?: number;
  };
  
  aprobacion: {
    requiereAprobacion: boolean;
    responsables: UUID[]; // Usuarios que pueden aprobar
    notificaciones: boolean;
  };
}
```

### 🔌 Endpoints de API Necesarios

```typescript
// Listado con filtros y paginación
GET /api/usuarios?
  page=1&
  limit=25&
  busqueda=juan&
  estado=Activo&
  rol=estudiante&
  territorialId=xxx&
  ordenarPor=nombre&
  direccion=asc

// Obtener usuario por ID
GET /api/usuarios/:id

// Crear usuario
POST /api/usuarios
Body: FormularioUsuario

// Actualizar usuario
PUT /api/usuarios/:id
Body: Partial<FormularioUsuario>

// Eliminar usuario (soft delete)
DELETE /api/usuarios/:id

// Asignar rol a usuario
POST /api/usuarios/:id/roles
Body: { rol, territorialId?, sedeId?, programaId?, fechaInicio, fechaFin? }

// Remover rol de usuario
DELETE /api/usuarios/:id/roles/:rolId

// Cambiar estado de usuario
PATCH /api/usuarios/:id/estado
Body: { estado: 'Activo' | 'Inactivo' | 'Suspendido' | 'Bloqueado', motivo?: string }

// Métricas por sede
GET /api/usuarios/metricas/por-sede?territorialId=xxx

// Exportar usuarios
GET /api/usuarios/exportar?formato=csv&filtros=xxx

// Importación masiva
POST /api/usuarios/importar
Body: FormData (archivo CSV/Excel)
```

---

## 3. ESTRUCTURA ORGANIZACIONAL

### 🏫 Descripción
Gestión de la jerarquía territorial: Nacional > Territorial (16) > CETAP (293 Centros Territoriales de Administración Pública)

### 🎯 Funcionalidades

#### Árbol Jerárquico
```typescript
interface ArbolOrganizacional {
  vista: 'arbol' | 'tabla' | 'mapa';
  
  nodos: {
    id: UUID;
    tipo: 'nacional' | 'territorial' | 'regional' | 'sede';
    nombre: string;
    codigo: string;
    activo: boolean;
    hijos: number; // Cantidad de nodos hijos
    usuarios: number; // Cantidad de usuarios
    programas: number; // Cantidad de programas
    expandido: boolean;
  }[];
  
  filtros: {
    busqueda: string;
    tipo: string[];
    estado: 'Todos' | 'Activos' | 'Inactivos';
    departamento: string;
    ciudad: string;
  };
  
  acciones: {
    crear: boolean;
    editar: boolean;
    activar: boolean;
    desactivar: boolean;
    eliminar: boolean;
  };
}
```

#### Gestión de Territoriales (17)
```typescript
interface GestionTerritoriales {
  listado: {
    id: UUID;
    codigo: string; // 'TER-BOG', 'TER-ANT'
    nombre: string;
    departamento: string;
    ciudad: string;
    director: {
      nombre: string;
      email: string;
      telefono: string;
    };
    activa: boolean;
    estadisticas: {
      regionales: number;
      sedes: number;
      usuarios: number;
      programas: number;
    };
  }[];
  
  formulario: {
    codigo: string;
    nombre: string;
    departamento: string;
    ciudad: string;
    direccion: string;
    telefono: string;
    email: string;
    directorNombre: string;
    directorEmail: string;
    orden: number; // Para ordenamiento
    metadata: Record<string, any>;
  };
  
  validaciones: {
    codigoUnico: boolean;
    nombreUnico: boolean;
  };
}
```

#### Gestión de Sedes (71+)
```typescript
interface GestionSedes {
  listado: {
    id: UUID;
    codigo: string;
    nombre: string;
    tipo: 'Principal' | 'Subsede' | 'CREAD' | 'Extensión';
    territorial: string;
    regional?: string;
    departamento: string;
    ciudad: string;
    activa: boolean;
    estadisticas: {
      usuarios: number;
      programas: number;
      estudiantes: number;
      docentes: number;
    };
    coordenadas: {
      lat: number;
      lng: number;
    };
  }[];
  
  formulario: {
    codigo: string;
    nombre: string;
    tipo: string;
    territorialId: UUID;
    regionalId?: UUID;
    departamento: string;
    ciudad: string;
    direccion: string;
    telefono: string;
    email: string;
    coordenadasLat: number;
    coordenadasLng: number;
    metadata: Record<string, any>;
  };
  
  vistaDetalle: {
    informacionGeneral: {
      codigo: string;
      nombre: string;
      tipo: string;
      direccion: string;
      contacto: string;
    };
    jerarquia: {
      territorial: string;
      regional?: string;
      departamento: string;
      ciudad: string;
    };
    programasOfrecidos: {
      id: UUID;
      nombre: string;
      tipo: string;
      activo: boolean;
      cuposDisponibles: number;
    }[];
    usuarios: {
      total: number;
      estudiantes: number;
      docentes: number;
      administrativos: number;
    };
    ubicacion: {
      mapa: boolean;
      lat: number;
      lng: number;
    };
  };
}
```

#### Mapa de Cobertura Nacional
```typescript
interface MapaCoberturaNacional {
  tipo: 'interactivo' | 'estatico';
  
  capas: {
    departamentos: {
      nombre: string;
      territoriales: number;
      sedes: number;
      usuarios: number;
      densidad: 'baja' | 'media' | 'alta';
      color: string;
    }[];
    
    marcadores: {
      tipo: 'territorial' | 'sede';
      id: UUID;
      nombre: string;
      lat: number;
      lng: number;
      icono: string;
      color: string;
      popup: string;
    }[];
  };
  
  leyenda: {
    colores: {
      densidadBaja: string;
      densidadMedia: string;
      densidadAlta: string;
    };
    iconos: {
      territorial: string;
      sedePrincipal: string;
      subsede: string;
    };
  };
  
  interacciones: {
    zoom: boolean;
    click: boolean;
    hover: boolean;
    filtros: string[];
  };
}
```

### 🔌 Endpoints de API Necesarios

```typescript
// Obtener árbol completo
GET /api/estructura-organizacional/arbol

// Obtener territoriales
GET /api/territoriales?activas=true

// Obtener territorial por ID
GET /api/territoriales/:id

// Crear territorial
POST /api/territoriales
Body: { codigo, nombre, departamento, ciudad, ... }

// Actualizar territorial
PUT /api/territoriales/:id

// Obtener sedes
GET /api/sedes?territorialId=xxx&activas=true

// Obtener sede por ID con detalle
GET /api/sedes/:id

// Crear sede
POST /api/sedes

// Actualizar sede
PUT /api/sedes/:id

// Obtener programas de una sede
GET /api/sedes/:id/programas

// Datos para mapa de cobertura
GET /api/estructura-organizacional/mapa-cobertura
```

---

## 4. PROGRAMAS ACADÉMICOS

### 🎓 Descripción
Gestión del catálogo de programas académicos y su asignación a sedes.

### 🎯 Funcionalidades

#### Catálogo de Programas
```typescript
interface CatalogoProgr amas {
  filtros: {
    busqueda: string;
    tipo: 'Todos' | 'Pregrado' | 'Especialización' | 'Maestría' | 'Doctorado' | 'Diplomado' | 'Curso';
    nivel: string[];
    modalidad: 'Todos' | 'Presencial' | 'Virtual' | 'Híbrido';
    estado: 'Todos' | 'Activo' | 'Inactivo';
    sede: UUID;
  };
  
  listado: {
    id: UUID;
    codigo: string;
    nombre: string;
    tipo: string;
    nivel: string;
    modalidad: string;
    duracionSemestres: number;
    creditos: number;
    snies: string;
    activo: boolean;
    sedesOfrecen: number;
    estudiantesMatriculados: number;
  }[];
  
  acciones: {
    crear: boolean;
    editar: boolean;
    asignarSede: boolean;
    desactivar: boolean;
  };
}
```

#### Ficha de Programa
```typescript
interface FichaPrograma {
  informacionGeneral: {
    codigo: string;
    nombre: string;
    tipo: string;
    nivel: string;
    modalidad: string;
    descripcion: string;
  };
  
  duracion: {
    semestres: number;
    horas: number;
    creditos: number;
  };
  
  acreditacion: {
    snies: string;
    registroCalificado: string;
    fechaRegistro: Date;
    acreditacion?: string;
  };
  
  planEstudios: {
    semestre: number;
    materias: {
      codigo: string;
      nombre: string;
      creditos: number;
      prerequisitos: string[];
      obligatoria: boolean;
    }[];
  }[];
  
  sedesOfrecen: {
    id: UUID;
    nombre: string;
    territorial: string;
    ciudad: string;
    activo: boolean;
    cuposDisponibles: number;
    estudiantesActivos: number;
  }[];
  
  estadisticas: {
    totalEstudiantes: number;
    totalGraduados: number;
    tasaGraduacion: number;
    promedioGeneral: number;
  };
}
```

### 🔌 Endpoints de API Necesarios

```typescript
GET /api/programas?tipo=Pregrado&modalidad=Virtual&activo=true
GET /api/programas/:id
POST /api/programas
PUT /api/programas/:id
POST /api/programas/:id/sedes/:sedeId
DELETE /api/programas/:id/sedes/:sedeId
GET /api/programas/:id/estudiantes
```

---

## 5. ROLES Y PERMISOS

### 🎭 Descripción
Sistema de permisos granular con roles predefinidos y personalizables.

### 🎯 Funcionalidades

```typescript
interface GestionRolesPermisos {
  rolesDisponibles: {
    codigo: string;
    nombre: string;
    descripcion: string;
    tipo: 'sistema' | 'personalizado';
    cantidadUsuarios: number;
    permisos: string[];
    modificable: boolean;
  }[];
  
  catalogoPermisos: {
    modulo: string;
    categoria: string;
    permisos: {
      codigo: string; // 'usuarios.crear'
      nombre: string;
      descripcion: string;
      critico: boolean;
    }[];
  }[];
  
  matrizPermisos: {
    rol: string;
    permisos: {
      [moduloCategoria: string]: boolean;
    };
  }[];
}
```

---

## 6. AUDITORÍA

### 📝 Descripción
Registro completo de todas las acciones del sistema.

### 🎯 Funcionalidades

```typescript
interface Auditoria {
  filtros: {
    rangoFechas: RangoFechas;
    usuario: string;
    accion: string[];
    entidad: string[];
    resultado: 'Todos' | 'Exitoso' | 'Fallido';
  };
  
  logs: {
    id: UUID;
    fecha: Date;
    usuario: string;
    email: string;
    accion: string;
    entidad: string;
    entidadId: UUID;
    ip: string;
    userAgent: string;
    valoresAnteriores: Record<string, any>;
    valoresNuevos: Record<string, any>;
    resultado: 'exitoso' | 'fallido';
    errorMensaje?: string;
  }[];
  
  exportar: boolean;
}
```

---

## 7. REPORTES (Motor V2.0)

### 📊 Descripción
Sistema de 60+ reportes predefinidos en 14 categorías.

### 🎯 Categorías de Reportes

```typescript
interface MotorReportesV2 {
  categorias: {
    id: string;
    nombre: string;
    icono: string;
    reportes: {
      id: string;
      codigo: string;
      nombre: string;
      descripcion: string;
      tipo: 'tabla' | 'grafico' | 'dashboard';
      parametros: {
        nombre: string;
        tipo: 'fecha' | 'select' | 'multiselect' | 'text' | 'number';
        requerido: boolean;
        opciones?: { valor: string; etiqueta: string }[];
      }[];
      formatos: ('PDF' | 'Excel' | 'CSV')[];
      permisoRequerido: string;
    }[];
  }[];
}
```

#### 14 Categorías:
1. **Usuarios y Accesos** (8 reportes)
2. **Estructura Organizacional** (5 reportes)
3. **Programas Académicos** (6 reportes)
4. **Certificados Graduados** (7 reportes)
5. **Certificados Laborales** (4 reportes)
6. **Vinculaciones** (3 reportes)
7. **Convocatorias Docentes** (3 reportes)
8. **Enrolamientos** (3 reportes)
9. **Portal Transaccional** (5 reportes)
10. **Auditoría y Seguridad** (4 reportes)
11. **Métricas Ejecutivas** (4 reportes)
12. **Comparativos y Tendencias** (4 reportes)
13. **Reportes Geográficos** (2 reportes)
14. **Reportes Personalizados** (2 reportes)

---

## 8-12. OTROS MÓDULOS

Los módulos restantes (Registro de Aspiraciones, Certificación Laboral, Gestión Profesional, Control Interno, Comunidad) siguen la misma estructura de documentación detallada.

---

## 🔒 CONTROL DE ACCESO POR ROL

### Usuario Especial: cerlaboral@esap.edu.co
```typescript
const usuarioCertificadosLaborales = {
  email: 'cerlaboral@esap.edu.co',
  accesoRestringido: {
    modulosPermitidos: [
      'Dashboard Ejecutivo', // Solo métricas de certificados laborales
      'Certificación Laboral' // Módulo completo
    ],
    modulosBloqueados: [
      'Gestión de Usuarios',
      'Estructura Organizacional',
      'Programas Académicos',
      'Roles y Permisos',
      'Auditoría',
      'Reportes', // Excepto reportes de certificados laborales
      'Registro de Aspiraciones',
      'Gestión Profesional',
      'Control Interno',
      'Comunidad'
    ],
    dashboardFiltrado: {
      soloMetricasCertificadosLaborales: true,
      ocultarOtrasMetricas: true
    }
  }
};
```

### Super Users (Acceso Dual)
```typescript
const superUsers = [
  'superuser@esap.edu.co',
  'rector@esap.edu.co',
  'director@esap.edu.co'
];

const accesoSuperUsers = {
  backoffice: {
    acceso: 'completo',
    modulosTodos: true,
    permisosSistema: true
  },
  portalTransaccional: {
    acceso: 'completo',
    puedenPublicar: true,
    puedenModerar: true,
    puedenAdministrar: true
  },
  switchSistemas: {
    habilitado: true,
    botonEnTopBar: true,
    redireccionRapida: true
  }
};
```

---

**Versión**: 2.0  
**Fecha**: Diciembre 2025  
**Módulos Documentados**: 12  
**Estado**: Listo para Desarrollo Backend
