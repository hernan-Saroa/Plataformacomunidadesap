# 📱 MÓDULOS DEL PORTAL TRANSACCIONAL - SUPER APP ESAP

## 📋 ÍNDICE
1. [Home / Feed Principal](#1-home--feed-principal)
2. [Sistema de Login Dual](#2-sistema-de-login-dual)
3. [Perfil de Usuario](#3-perfil-de-usuario)
4. [Red Social Universitaria](#4-red-social-universitaria)
5. [Servicios Académicos](#5-servicios-académicos)
6. [Comunidad y Conexiones](#6-comunidad-y-conexiones)
7. [Notificaciones](#7-notificaciones)
8. [Búsqueda Global](#8-búsqueda-global)

---

## 1. HOME / FEED PRINCIPAL

### 📱 Descripción
Feed principal estilo red social con publicaciones, eventos y anuncios de la comunidad universitaria ESAP.

### 🎯 Funcionalidades

#### Feed de Publicaciones
```typescript
interface FeedPrincipal {
  filtros: {
    tipo: 'Todos' | 'Publicaciones' | 'Eventos' | 'Anuncios' | 'Encuestas';
    alcance: 'Todo ESAP' | 'Mi Programa' | 'Mi Sede' | 'Mi Territorial';
    periodo: 'Hoy' | 'Esta Semana' | 'Este Mes' | 'Todos';
    roles: 'Todos' | 'Estudiantes' | 'Docentes' | 'Graduados';
  };
  
  publicaciones: {
    id: UUID;
    tipo: 'post' | 'evento' | 'anuncio' | 'encuesta';
    autor: {
      id: UUID;
      nombre: string;
      avatar: string;
      rol: string; // 'Estudiante', 'Docente', 'Graduado'
      programa?: string;
      sede?: string;
      badge?: string; // 'Verificado', 'Destacado'
    };
    contenido: {
      texto: string;
      imagenes?: string[];
      archivos?: {
        nombre: string;
        tipo: string;
        url: string;
        size: number;
      }[];
      video?: {
        url: string;
        thumbnail: string;
        duracion: number;
      };
    };
    interacciones: {
      likes: number;
      comentarios: number;
      compartidos: number;
      guardados: number;
      usuarioLike: boolean;
      usuarioGuardado: boolean;
    };
    alcance: {
      visibilidad: 'publico' | 'estudiantes' | 'programa' | 'sede';
      programa?: string;
      sede?: string;
    };
    metadata: {
      fechaPublicacion: Date;
      editado: boolean;
      fechaEdicion?: Date;
      destacado: boolean;
      trending: boolean;
    };
  }[];
  
  paginacion: {
    offset: number;
    limit: number;
    hasMore: boolean;
    totalCount: number;
  };
}
```

#### Crear Publicación
```typescript
interface CrearPublicacion {
  formulario: {
    tipo: 'post' | 'evento' | 'anuncio';
    contenido: {
      texto: string; // Máx 5000 caracteres
      imagenes?: File[]; // Máx 10 imágenes
      archivos?: File[]; // Máx 5 archivos
      video?: File; // Máx 100MB
    };
    alcance: {
      visibilidad: 'publico' | 'estudiantes' | 'programa' | 'sede';
      programaId?: UUID;
      sedeId?: UUID;
    };
    opciones: {
      permitirComentarios: boolean;
      permitirCompartir: boolean;
      destacar: boolean; // Solo para admins
    };
  };
  
  // Para eventos
  datosEvento?: {
    titulo: string;
    descripcion: string;
    fechaInicio: Date;
    fechaFin: Date;
    ubicacion: string;
    modalidad: 'Presencial' | 'Virtual' | 'Híbrido';
    linkVirtual?: string;
    cuposLimitados: boolean;
    cuposMaximos?: number;
    requiereInscripcion: boolean;
  };
  
  // Para encuestas
  datosEncuesta?: {
    pregunta: string;
    opciones: string[]; // 2-10 opciones
    permitirMultiple: boolean;
    duracionDias: number;
  };
  
  validaciones: {
    contenidoMinimo: boolean; // Al menos 10 caracteres
    imagenesTamaño: boolean; // Máx 5MB cada una
    archivosTamaño: boolean; // Máx 10MB cada uno
    filtroContenido: boolean; // Anti-spam, groserías
  };
}
```

#### Interacciones
```typescript
interface InteraccionesPublicacion {
  like: {
    accion: 'dar' | 'quitar';
    animacion: boolean;
    notificarAutor: boolean;
  };
  
  comentar: {
    contenido: string; // Máx 2000 caracteres
    comentarioPadreId?: UUID; // Para respuestas
    adjuntos?: {
      imagen?: File;
      gif?: string;
    };
  };
  
  compartir: {
    tipo: 'publico' | 'mensaje' | 'grupo';
    mensaje?: string;
    destinatarios?: UUID[];
  };
  
  guardar: {
    coleccion: 'Guardados' | 'Favoritos' | 'Leer Después';
  };
  
  reportar: {
    motivo: 'Spam' | 'Contenido Inapropiado' | 'Acoso' | 'Información Falsa' | 'Otro';
    descripcion: string;
  };
}
```

---

## 2. SISTEMA DE LOGIN DUAL

### 🔐 Descripción
Sistema inteligente que discrimina automáticamente entre usuarios institucionales (@esap.edu.co) y externos.

### 🎯 Funcionalidades

#### Discriminación Automática por Dominio
```typescript
interface LoginDualAutomatico {
  // Pantalla Unificada de Login
  pantallaLogin: {
    campo: 'email'; // Un solo campo
    placeholder: 'correo@ejemplo.com';
    botonContinuar: 'Continuar'; // No dice "Iniciar Sesión"
  };
  
  // Lógica de Discriminación
  discriminacion: {
    verificar: (email: string) => {
      const dominio = email.split('@')[1];
      
      if (dominio === 'esap.edu.co') {
        return {
          tipo: 'institucional',
          flujo: 'backoffice',
          mensaje: 'Usuario institucional detectado',
          siguientePaso: 'password_institucional'
        };
      } else {
        return {
          tipo: 'externo',
          flujo: 'portal',
          mensaje: 'Correo externo detectado',
          siguientePaso: 'verificar_si_existe'
        };
      }
    };
  };
  
  // Flujo para @esap.edu.co
  flujoInstitucional: {
    paso1_email: 'usuario@esap.edu.co';
    paso2_password: string;
    paso3_2fa?: string; // Si está habilitado
    paso4_redireccion: {
      sistema: 'backoffice' | 'portal'; // Según roles del usuario
      mostrarSelector: boolean; // Si tiene acceso dual (superusers)
    };
  };
  
  // Flujo para correos externos
  flujoExterno: {
    paso1_email: string; // Correo ingresado
    paso2_verificacion: {
      existeUsuario: boolean;
      accion: 'login' | 'registro';
    };
    
    // Si existe usuario
    siExiste: {
      paso3_password: string;
      paso4_redireccion: 'portal';
    };
    
    // Si NO existe usuario
    noExiste: {
      paso3_opciones: {
        registrarse: boolean;
        enrolamiento: boolean;
        solicitarAcceso: boolean;
      };
      mensaje: 'No encontramos una cuenta con este correo. ¿Deseas registrarte?';
    };
  };
}
```

#### Selector de Sistema (Solo Super Users)
```typescript
interface SelectorSistema {
  mostrarPara: string[]; // ['superuser@esap.edu.co', 'rector@esap.edu.co', 'director@esap.edu.co']
  
  pantalla: {
    titulo: 'Selecciona el sistema al que deseas acceder';
    subtitulo: 'Tienes acceso a ambos sistemas';
    
    opciones: {
      backoffice: {
        titulo: 'Backoffice Administrativo';
        descripcion: 'Gestión administrativa y reportes ejecutivos';
        icono: 'Building2';
        color: '#003DA5';
        badge: 'Admin';
      };
      portal: {
        titulo: 'Portal Transaccional';
        descripcion: 'Red social universitaria y servicios académicos';
        icono: 'Users';
        color: '#1e5da8';
        badge: 'Comunidad';
      };
    };
    
    recordar: {
      habilitado: boolean;
      mensaje: 'Recordar mi elección';
      duracion: '30 días';
    };
  };
  
  redireccion: {
    backoffice: '/backoffice/dashboard';
    portal: '/portal/home';
  };
}
```

#### Autenticación Social (Opcional)
```typescript
interface AuthSocial {
  proveedores: {
    google: {
      habilitado: boolean;
      clientId: string;
      scopes: string[];
      botonTexto: 'Continuar con Google';
    };
    microsoft: {
      habilitado: boolean;
      tenantId: string;
      clientId: string;
      botonTexto: 'Continuar con Microsoft';
    };
  };
  
  flujo: {
    paso1_seleccionarProveedor: 'google' | 'microsoft';
    paso2_autenticacion: 'OAuth2';
    paso3_verificacion: {
      emailVerificado: boolean;
      dominio: string;
      aplicarDiscriminacion: boolean; // Mismo flujo que login normal
    };
    paso4_crearOVincular: {
      existeUsuario: boolean;
      accion: 'vincular' | 'crear';
    };
  };
}
```

#### Recuperación de Contraseña
```typescript
interface RecuperacionPassword {
  flujo: {
    paso1_solicitarEmail: {
      email: string;
      validar: boolean;
    };
    
    paso2_enviarCodigo: {
      metodo: 'email'; // Futuro: 'sms'
      codigo: string; // 6 dígitos
      expiracion: number; // 15 minutos
      mensaje: 'Hemos enviado un código de verificación a tu correo';
    };
    
    paso3_verificarCodigo: {
      codigoIngresado: string;
      intentosMaximos: number; // 5 intentos
      bloqueoDespuesDe: number; // 30 minutos
    };
    
    paso4_nuevaPassword: {
      password: string;
      confirmarPassword: string;
      validaciones: {
        minimoCaracteres: number; // 8
        requiereMayuscula: boolean;
        requiereMinuscula: boolean;
        requiereNumero: boolean;
        requiereCaracterEspecial: boolean;
      };
    };
    
    paso5_confirmacion: {
      mensaje: '¡Contraseña actualizada exitosamente!';
      accion: 'redirigir_login';
    };
  };
  
  seguridadAdicional: {
    limitarIntentosEmail: {
      maxIntentos: number; // 3 intentos por hora
      bloqueoDuracion: number; // 1 hora
    };
    logAuditoria: boolean; // Registrar en audit_logs
    notificarUsuario: boolean; // Email de notificación de cambio
  };
}
```

---

## 3. PERFIL DE USUARIO

### 👤 Descripción
Perfil digital completo con portafolio académico, conexiones y actividad.

### 🎯 Funcionalidades

#### Vista de Perfil
```typescript
interface PerfilUsuario {
  // Header del Perfil
  header: {
    fotoPerfil: string;
    fotoPortada?: string;
    nombre: string;
    headline: string; // "Estudiante de Administración Pública"
    ubicacion: string; // "Bogotá, Colombia"
    miembro_desde: Date;
    badges: {
      tipo: 'Verificado' | 'Graduado' | 'Docente' | 'Destacado';
      icono: string;
      color: string;
    }[];
  };
  
  // Información Básica
  informacionBasica: {
    roles: string[]; // ['Estudiante', 'Graduado']
    programa: string;
    sede: string;
    codigoEstudiante?: string;
    estado: 'Activo' | 'Graduado' | 'Inactivo';
  };
  
  // Tabs del Perfil
  tabs: {
    resumen: {
      sobreMi: string; // Biografía
      habilidades: string[];
      intereses: string[];
      idiomas: {
        idioma: string;
        nivel: 'Básico' | 'Intermedio' | 'Avanzado' | 'Nativo';
      }[];
    };
    
    academico: {
      programasActuales: {
        programa: string;
        sede: string;
        periodo: string;
        promedioAcumulado: number;
        creditosAprobados: number;
        creditosTotales: number;
      }[];
      
      historialAcademico: {
        programa: string;
        sede: string;
        fechaInicio: Date;
        fechaGraduacion?: Date;
        estado: string;
        diploma?: string;
      }[];
      
      certificaciones: {
        nombre: string;
        entidad: string;
        fecha: Date;
        url?: string;
      }[];
    };
    
    experiencia: {
      laboral: {
        cargo: string;
        empresa: string;
        ubicacion: string;
        fechaInicio: Date;
        fechaFin?: Date;
        actual: boolean;
        descripcion: string;
      }[];
      
      voluntariado: {
        organizacion: string;
        rol: string;
        fechaInicio: Date;
        fechaFin?: Date;
        descripcion: string;
      }[];
    };
    
    proyectos: {
      titulo: string;
      descripcion: string;
      rol: string;
      fecha: Date;
      colaboradores: UUID[];
      imagenes: string[];
      archivos: {
        nombre: string;
        url: string;
      }[];
      tags: string[];
    }[];
    
    actividad: {
      publicaciones: number;
      comentarios: number;
      conexiones: number;
      reacciones: number;
      ultimaActividad: Date;
    };
  };
  
  // Estadísticas del Perfil
  estadisticas: {
    conexiones: number;
    seguidores: number;
    seguidos: number;
    publicaciones: number;
    interacciones: number;
  };
  
  // Acciones del Perfil
  acciones: {
    conectar: boolean;
    seguir: boolean;
    mensaje: boolean;
    compartir: boolean;
    bloquear: boolean;
    reportar: boolean;
  };
}
```

#### Editar Perfil
```typescript
interface EditarPerfil {
  tabs: {
    informacionBasica: {
      fotoPerfil: File;
      fotoPortada: File;
      nombre: string; // Solo lectura (viene de tabla personas)
      headline: string;
      sobreMi: string;
      ubicacion: string;
      telefono: string;
      sitioWeb: string;
      redesSociales: {
        linkedin: string;
        twitter: string;
        instagram: string;
        facebook: string;
      };
    };
    
    privacidad: {
      perfilPublico: boolean;
      mostrarEmail: boolean;
      mostrarTelefono: boolean;
      mostrarUbicacion: boolean;
      permitirMensajes: 'Todos' | 'Solo Conexiones' | 'Nadie';
      permitirEtiquetas: boolean;
      mostrarEnBusqueda: boolean;
    };
    
    notificaciones: {
      email: {
        nuevaPublicacion: boolean;
        nuevoComentario: boolean;
        nuevaConexion: boolean;
        nuevoMensaje: boolean;
        mencionEnPublicacion: boolean;
        resumenDiario: boolean;
        resumenSemanal: boolean;
      };
      push: {
        habilitado: boolean;
        nuevaPublicacion: boolean;
        nuevoComentario: boolean;
        nuevoMensaje: boolean;
        mencion: boolean;
      };
    };
    
    seguridad: {
      cambiarPassword: {
        passwordActual: string;
        passwordNueva: string;
        confirmarPassword: string;
      };
      autenticacion2FA: {
        habilitado: boolean;
        metodo: 'app' | 'email' | 'sms';
      };
      sesionesActivas: {
        dispositivo: string;
        ubicacion: string;
        ultimaActividad: Date;
        actual: boolean;
        cerrarSesion: boolean;
      }[];
    };
  };
}
```

---

## 4. RED SOCIAL UNIVERSITARIA

### 💬 Descripción
Plataforma social exclusiva para la comunidad ESAP con publicaciones, grupos y eventos.

### 🎯 Funcionalidades

#### Grupos y Comunidades
```typescript
interface GruposComunitarios {
  tipos: {
    oficial: {
      descripcion: 'Creados por ESAP';
      permisos: 'Solo admin puede publicar';
      ejemplos: ['Dirección Nacional', 'Rectoría', 'Noticias Oficiales'];
    };
    programa: {
      descripcion: 'Por programa académico';
      permisos: 'Solo estudiantes del programa';
      ejemplos: ['Administración Pública', 'Gerencia Pública', 'Maestría en Gobierno'];
    };
    sede: {
      descripcion: 'Por sede física';
      permisos: 'Usuarios de la sede';
      ejemplos: ['ESAP Bogotá', 'ESAP Antioquia', 'ESAP Valle'];
    };
    interes: {
      descripcion: 'Temas de interés común';
      permisos: 'Cualquier usuario puede unirse';
      ejemplos: ['Deportes', 'Cultura', 'Emprendimiento', 'Investigación'];
    };
  };
  
  grupo: {
    id: UUID;
    nombre: string;
    descripcion: string;
    tipo: 'oficial' | 'programa' | 'sede' | 'interes';
    avatar: string;
    portada: string;
    privacidad: 'Público' | 'Privado';
    miembros: number;
    administradores: UUID[];
    reglas: string[];
    creado: Date;
    
    estadisticas: {
      publicaciones: number;
      miembrosActivos: number;
      interaccionesMes: number;
    };
  };
  
  acciones: {
    unirse: boolean;
    solicitar: boolean; // Para grupos privados
    publicar: boolean;
    invitar: boolean;
    abandonar: boolean;
    reportar: boolean;
  };
}
```

#### Eventos
```typescript
interface Eventos {
  tipos: {
    oficial: 'Evento oficial de ESAP';
    academico: 'Conferencia, seminario, taller';
    cultural: 'Evento cultural o deportivo';
    social: 'Evento social o networking';
  };
  
  evento: {
    id: UUID;
    titulo: string;
    descripcion: string;
    tipo: string;
    organizador: {
      id: UUID;
      nombre: string;
      tipo: 'Usuario' | 'Grupo' | 'ESAP Oficial';
    };
    
    fechaHora: {
      inicio: Date;
      fin: Date;
      zona: string; // 'America/Bogota'
    };
    
    ubicacion: {
      modalidad: 'Presencial' | 'Virtual' | 'Híbrido';
      direccion?: string;
      ciudad?: string;
      linkVirtual?: string;
      plataforma?: 'Zoom' | 'Meet' | 'Teams' | 'Otra';
    };
    
    inscripcion: {
      requiereInscripcion: boolean;
      cuposLimitados: boolean;
      cuposMaximos?: number;
      cuposDisponibles?: number;
      inscritos: number;
      fechaLimite?: Date;
    };
    
    interacciones: {
      interesados: number;
      confirmados: number;
      usuarioInteres: boolean;
      usuarioConfirmado: boolean;
    };
    
    detalles: {
      agenda: {
        hora: string;
        actividad: string;
      }[];
      ponentes: {
        nombre: string;
        cargo: string;
        bio: string;
        foto?: string;
      }[];
      etiquetas: string[];
    };
  };
  
  filtros: {
    fechas: 'Próximos' | 'Esta Semana' | 'Este Mes' | 'Pasados';
    tipo: string[];
    modalidad: string[];
    sede: UUID;
    misEventos: boolean; // Eventos donde el usuario está inscrito
  };
}
```

#### Mensajería Directa
```typescript
interface Mensajeria {
  conversaciones: {
    id: UUID;
    tipo: 'individual' | 'grupo';
    participantes: {
      id: UUID;
      nombre: string;
      avatar: string;
      rol: string;
      enLinea: boolean;
      ultimaConexion: Date;
    }[];
    ultimoMensaje: {
      contenido: string;
      autor: UUID;
      fecha: Date;
      leido: boolean;
    };
    noLeidos: number;
    archivada: boolean;
    silenciada: boolean;
  }[];
  
  mensaje: {
    id: UUID;
    conversacionId: UUID;
    autorId: UUID;
    contenido: {
      texto?: string;
      imagen?: string;
      archivo?: {
        nombre: string;
        tipo: string;
        url: string;
        size: number;
      };
      ubicacion?: {
        lat: number;
        lng: number;
        nombre: string;
      };
    };
    fecha: Date;
    editado: boolean;
    eliminado: boolean;
    reacciones: {
      emoji: string;
      usuarios: UUID[];
    }[];
    respuestaA?: UUID; // ID del mensaje al que responde
    estado: 'enviado' | 'entregado' | 'leido';
  };
  
  acciones: {
    enviar: boolean;
    editar: boolean;
    eliminar: boolean;
    reaccionar: boolean;
    responder: boolean;
    reenviar: boolean;
    archivar: boolean;
    silenciar: boolean;
    bloquear: boolean;
  };
}
```

---

## 5. SERVICIOS ACADÉMICOS

### 📚 Descripción
Acceso a servicios académicos y trámites desde el portal.

### 🎯 Funcionalidades

```typescript
interface ServiciosAcademicos {
  miPrograma: {
    informacion: {
      nombre: string;
      codigo: string;
      modalidad: string;
      sede: string;
      codigoEstudiante: string;
      periodo: string;
    };
    
    progreso: {
      creditosAprobados: number;
      creditosTotales: number;
      porcentajeAvance: number;
      promedioAcumulado: number;
      semestreActual: number;
    };
    
    horario: {
      dia: string;
      hora: string;
      materia: string;
      profesor: string;
      salon: string;
      modalidad: 'Presencial' | 'Virtual';
    }[];
    
    materiasActuales: {
      codigo: string;
      nombre: string;
      creditos: number;
      profesor: string;
      notas: {
        corte1?: number;
        corte2?: number;
        corte3?: number;
        final?: number;
      };
      asistencia: number; // Porcentaje
    }[];
  };
  
  certificados: {
    disponibles: {
      tipo: 'Matrícula' | 'Notas' | 'Graduación' | 'Curso';
      codigo: string;
      fecha: Date;
      estado: 'Activo' | 'Generado';
      descargar: boolean;
    }[];
    
    solicitar: {
      tipo: string;
      destinoUso: string;
      cantidadCopias: number;
      urgente: boolean;
    };
  };
  
  tramites: {
    disponibles: {
      nombre: string;
      descripcion: string;
      requisitos: string[];
      tiempoRespuesta: string;
      costo: number;
    }[];
    
    enProceso: {
      id: UUID;
      tipo: string;
      folio: string;
      fechaSolicitud: Date;
      estado: 'Pendiente' | 'En Revisión' | 'Aprobado' | 'Rechazado';
      pasoActual: number;
      pasosTotales: number;
    }[];
  };
  
  biblioteca: {
    buscar: {
      termino: string;
      tipo: 'Libro' | 'Revista' | 'Tesis' | 'Articulo' | 'Todos';
      disponibilidad: 'Disponible' | 'Prestado' | 'Todos';
    };
    
    prestamos: {
      id: UUID;
      titulo: string;
      autor: string;
      tipo: string;
      fechaPrestamo: Date;
      fechaDevolucion: Date;
      renovaciones: number;
      renovacionesMaximas: number;
      sede: string;
    }[];
    
    reservas: {
      id: UUID;
      titulo: string;
      fechaReserva: Date;
      estado: 'Pendiente' | 'Disponible' | 'Expirada';
    }[];
  };
}
```

---

## 6. COMUNIDAD Y CONEXIONES

### 👥 Descripción
Sistema de conexiones y networking entre la comunidad ESAP.

### 🎯 Funcionalidades

```typescript
interface ComunidadConexiones {
  miRed: {
    conexiones: {
      id: UUID;
      nombre: string;
      avatar: string;
      headline: string;
      programa: string;
      sede: string;
      conexionesComunes: number;
      fechaConexion: Date;
    }[];
    
    solicitudes: {
      enviadas: {
        id: UUID;
        destinatario: {
          nombre: string;
          avatar: string;
          rol: string;
        };
        fechaSolicitud: Date;
        mensaje?: string;
      }[];
      
      recibidas: {
        id: UUID;
        remitente: {
          nombre: string;
          avatar: string;
          rol: string;
        };
        fechaSolicitud: Date;
        mensaje?: string;
        conexionesComunes: number;
      }[];
    };
  };
  
  descubrir: {
    sugerencias: {
      id: UUID;
      nombre: string;
      avatar: string;
      headline: string;
      programa: string;
      sede: string;
      razonSugerencia: 'Mismo programa' | 'Misma sede' | 'Intereses comunes' | 'Conexiones comunes';
      conexionesComunes: number;
    }[];
    
    filtros: {
      rol: string[];
      programa: UUID;
      sede: UUID;
      ubicacion: string;
      intereses: string[];
    };
  };
  
  directorio: {
    buscar: {
      termino: string;
      filtros: {
        rol: string[];
        programa: string[];
        sede: string[];
        territorial: string[];
        habilidades: string[];
      };
    };
    
    resultados: {
      id: UUID;
      nombre: string;
      avatar: string;
      headline: string;
      ubicacion: string;
      programa: string;
      conexion: 'Conectado' | 'Solicitud enviada' | 'Sin conexión';
    }[];
  };
}
```

---

## 7. NOTIFICACIONES

### 🔔 Descripción
Sistema completo de notificaciones en tiempo real.

### 🎯 Funcionalidades

```typescript
interface SistemaNotificaciones {
  tipos: {
    interaccion: 'Like, comentario, compartido';
    social: 'Nueva conexión, solicitud, mención';
    academico: 'Notas, eventos, anuncios';
    sistema: 'Seguridad, actualizaciones';
  };
  
  notificacion: {
    id: UUID;
    tipo: string;
    titulo: string;
    mensaje: string;
    icono: string;
    color: string;
    fecha: Date;
    leida: boolean;
    archivada: boolean;
    accionUrl?: string; // URL a la que redirige
    accionTexto?: string; // "Ver publicación"
    metadata: {
      autorId?: UUID;
      publicacionId?: UUID;
      comentarioId?: UUID;
      eventoId?: UUID;
    };
  };
  
  panel: {
    tabs: {
      todas: Notificacion[];
      noLeidas: Notificacion[];
      menciones: Notificacion[];
      conexiones: Notificacion[];
    };
    
    acciones: {
      marcarTodasLeidas: boolean;
      archivarTodas: boolean;
      filtrarPorTipo: boolean;
      buscar: boolean;
    };
  };
  
  configuracion: {
    email: {
      instantaneas: boolean;
      resumenDiario: boolean;
      resumenSemanal: boolean;
      tiposHabilitados: string[];
    };
    
    push: {
      habilitado: boolean;
      tiposHabilitados: string[];
      silenciarHorario: {
        desde: string; // '22:00'
        hasta: string; // '07:00'
      };
    };
  };
}
```

---

## 8. BÚSQUEDA GLOBAL

### 🔍 Descripción
Búsqueda unificada de personas, publicaciones, grupos, eventos y contenido.

### 🎯 Funcionalidades

```typescript
interface BusquedaGlobal {
  query: {
    termino: string;
    filtros: {
      tipo: 'Todos' | 'Personas' | 'Publicaciones' | 'Grupos' | 'Eventos' | 'Contenido';
      fecha: RangoFechas;
      ubicacion: string;
      programa: UUID;
      sede: UUID;
    };
  };
  
  resultados: {
    personas: {
      id: UUID;
      nombre: string;
      avatar: string;
      headline: string;
      programa: string;
      relevancia: number; // Score de relevancia
    }[];
    
    publicaciones: {
      id: UUID;
      autor: string;
      contenido: string; // Extracto
      fecha: Date;
      likes: number;
      comentarios: number;
      relevancia: number;
    }[];
    
    grupos: {
      id: UUID;
      nombre: string;
      descripcion: string;
      miembros: number;
      tipo: string;
      relevancia: number;
    }[];
    
    eventos: {
      id: UUID;
      titulo: string;
      fecha: Date;
      ubicacion: string;
      inscritos: number;
      relevancia: number;
    }[];
  };
  
  sugerencias: {
    busquedasRecientes: string[];
    busquedasPopulares: string[];
    filtrosRapidos: {
      texto: string;
      icono: string;
      accion: string;
    }[];
  };
}
```

---

## 🔌 ENDPOINTS DE API NECESARIOS

### Feed y Publicaciones
```typescript
GET /api/portal/feed?offset=0&limit=20&tipo=todos&alcance=todo
GET /api/portal/publicaciones/:id
POST /api/portal/publicaciones
PUT /api/portal/publicaciones/:id
DELETE /api/portal/publicaciones/:id
POST /api/portal/publicaciones/:id/like
POST /api/portal/publicaciones/:id/comentarios
POST /api/portal/publicaciones/:id/compartir
POST /api/portal/publicaciones/:id/guardar
```

### Perfil
```typescript
GET /api/portal/perfil/:usuarioId
PUT /api/portal/perfil/mi-perfil
GET /api/portal/perfil/:usuarioId/publicaciones
GET /api/portal/perfil/:usuarioId/conexiones
```

### Grupos y Eventos
```typescript
GET /api/portal/grupos?tipo=todos&miembro=false
GET /api/portal/grupos/:id
POST /api/portal/grupos/:id/unirse
GET /api/portal/eventos?proximos=true
POST /api/portal/eventos/:id/inscribirse
```

### Mensajería
```typescript
GET /api/portal/conversaciones
GET /api/portal/conversaciones/:id/mensajes
POST /api/portal/mensajes
PUT /api/portal/mensajes/:id
DELETE /api/portal/mensajes/:id
```

### Servicios Académicos
```typescript
GET /api/portal/mi-programa
GET /api/portal/mi-programa/horario
GET /api/portal/mi-programa/notas
GET /api/portal/certificados
POST /api/portal/certificados/solicitar
GET /api/portal/tramites
POST /api/portal/tramites
```

### Conexiones
```typescript
GET /api/portal/conexiones
GET /api/portal/conexiones/solicitudes
POST /api/portal/conexiones/enviar-solicitud
POST /api/portal/conexiones/:id/aceptar
POST /api/portal/conexiones/:id/rechazar
GET /api/portal/conexiones/sugerencias
```

### Notificaciones
```typescript
GET /api/portal/notificaciones?leidas=false
PUT /api/portal/notificaciones/:id/marcar-leida
PUT /api/portal/notificaciones/marcar-todas-leidas
DELETE /api/portal/notificaciones/:id
```

### Búsqueda
```typescript
GET /api/portal/buscar?q=termino&tipo=todos&offset=0&limit=20
GET /api/portal/buscar/sugerencias
```

---

**Versión**: 2.0  
**Fecha**: Diciembre 2025  
**Mobile-First**: Sí  
**Diseño**: Red Social Universitaria  
**Estado**: Listo para Desarrollo Backend
