/**
 * ACCIONES DISPONIBLES POR ETAPA - KANBAN PROCESOS DISCIPLINARIOS
 * Define qué acciones están habilitadas/deshabilitadas según la etapa del proceso
 * Fecha: 9 de febrero de 2026
 */

export type EtapaProceso = 'Recepción' | 'Valoración' | 'Indagación' | 'Investigación' | 'Juzgamiento' | 'Fallo';

export interface AccionDisponible {
  id: string;
  nombre: string;
  icono: string;
  habilitada: boolean;
  razon?: string; // Razón por la cual está deshabilitada
  destacada?: boolean; // Si debe mostrarse con énfasis
}

export interface AccionesPorEtapa {
  // Acciones principales
  verExpediente: AccionDisponible;
  aprobarBorrador: AccionDisponible;
  
  // Gestión documental
  gestionAutos: AccionDisponible;
  gestionEvidencias: AccionDisponible;
  gestionOficios: AccionDisponible;
  gestionActas: AccionDisponible;
  
  // Acciones de flujo
  asignarProfesional: AccionDisponible;
  abrirInvestigacion: AccionDisponible;
  formularCargos: AccionDisponible;
  emitirFallo: AccionDisponible;
  archivar: AccionDisponible;
  remitir: AccionDisponible;
  
  // Otras acciones
  comentarios: AccionDisponible;
  historial: AccionDisponible;
}

/**
 * Obtiene las acciones disponibles según la etapa del proceso
 */
export function obtenerAccionesPorEtapa(
  etapa: EtapaProceso,
  pendienteAprobacion: boolean = false
): AccionesPorEtapa {
  
  const baseAcciones: AccionesPorEtapa = {
    verExpediente: {
      id: 'ver-expediente',
      nombre: 'Ver Expediente',
      icono: 'Archive',
      habilitada: true,
      destacada: false
    },
    aprobarBorrador: {
      id: 'aprobar-borrador',
      nombre: 'Aprobar Borrador',
      icono: 'CheckCircle',
      habilitada: pendienteAprobacion,
      razon: pendienteAprobacion ? undefined : 'No hay borradores pendientes',
      destacada: pendienteAprobacion
    },
    gestionAutos: {
      id: 'gestion-autos',
      nombre: 'Autos y Providencias',
      icono: 'Scale',
      habilitada: true
    },
    gestionEvidencias: {
      id: 'gestion-evidencias',
      nombre: 'Evidencias',
      icono: 'Archive',
      habilitada: true
    },
    gestionOficios: {
      id: 'gestion-oficios',
      nombre: 'Oficios',
      icono: 'Send',
      habilitada: true
    },
    gestionActas: {
      id: 'gestion-actas',
      nombre: 'Actas',
      icono: 'FileCheck',
      habilitada: true
    },
    asignarProfesional: {
      id: 'asignar-profesional',
      nombre: 'Asignar Profesional',
      icono: 'UserCheck',
      habilitada: false
    },
    abrirInvestigacion: {
      id: 'abrir-investigacion',
      nombre: 'Abrir Investigación',
      icono: 'FileSignature',
      habilitada: false
    },
    formularCargos: {
      id: 'formular-cargos',
      nombre: 'Formular Cargos',
      icono: 'FileText',
      habilitada: false
    },
    emitirFallo: {
      id: 'emitir-fallo',
      nombre: 'Emitir Fallo',
      icono: 'Scale',
      habilitada: false
    },
    archivar: {
      id: 'archivar',
      nombre: 'Archivar Proceso',
      icono: 'Archive',
      habilitada: false
    },
    remitir: {
      id: 'remitir',
      nombre: 'Remitir Competencia',
      icono: 'Forward',
      habilitada: false
    },
    comentarios: {
      id: 'comentarios',
      nombre: 'Comentarios',
      icono: 'MessageSquare',
      habilitada: true
    },
    historial: {
      id: 'historial',
      nombre: 'Historial',
      icono: 'History',
      habilitada: true
    }
  };

  // Personalizar según la etapa
  switch (etapa) {
    case 'Recepción':
      return {
        ...baseAcciones,
        asignarProfesional: {
          ...baseAcciones.asignarProfesional,
          habilitada: true,
          destacada: true,
          razon: undefined
        },
        remitir: {
          ...baseAcciones.remitir,
          habilitada: true,
          razon: undefined
        },
        archivar: {
          ...baseAcciones.archivar,
          habilitada: true,
          razon: undefined
        },
        gestionAutos: {
          ...baseAcciones.gestionAutos,
          habilitada: false,
          razon: 'Disponible desde Valoración'
        },
        abrirInvestigacion: {
          ...baseAcciones.abrirInvestigacion,
          habilitada: false,
          razon: 'Primero debe asignarse un profesional'
        }
      };

    case 'Valoración':
      return {
        ...baseAcciones,
        asignarProfesional: {
          ...baseAcciones.asignarProfesional,
          habilitada: true,
          razon: undefined
        },
        abrirInvestigacion: {
          ...baseAcciones.abrirInvestigacion,
          habilitada: true,
          destacada: true,
          razon: undefined
        },
        archivar: {
          ...baseAcciones.archivar,
          habilitada: true,
          razon: undefined
        },
        remitir: {
          ...baseAcciones.remitir,
          habilitada: true,
          razon: undefined
        },
        formularCargos: {
          ...baseAcciones.formularCargos,
          habilitada: false,
          razon: 'Disponible en etapa de Investigación'
        }
      };

    case 'Indagación':
      return {
        ...baseAcciones,
        abrirInvestigacion: {
          ...baseAcciones.abrirInvestigacion,
          habilitada: true,
          destacada: true,
          razon: undefined
        },
        archivar: {
          ...baseAcciones.archivar,
          habilitada: true,
          razon: undefined
        },
        remitir: {
          ...baseAcciones.remitir,
          habilitada: true,
          razon: undefined
        },
        gestionEvidencias: {
          ...baseAcciones.gestionEvidencias,
          habilitada: true,
          destacada: true
        },
        formularCargos: {
          ...baseAcciones.formularCargos,
          habilitada: false,
          razon: 'Primero debe abrirse investigación formal'
        }
      };

    case 'Investigación':
      return {
        ...baseAcciones,
        formularCargos: {
          ...baseAcciones.formularCargos,
          habilitada: true,
          destacada: true,
          razon: undefined
        },
        archivar: {
          ...baseAcciones.archivar,
          habilitada: true,
          razon: undefined
        },
        remitir: {
          ...baseAcciones.remitir,
          habilitada: true,
          razon: undefined
        },
        gestionEvidencias: {
          ...baseAcciones.gestionEvidencias,
          habilitada: true,
          destacada: true
        },
        gestionAutos: {
          ...baseAcciones.gestionAutos,
          habilitada: true,
          destacada: true
        },
        emitirFallo: {
          ...baseAcciones.emitirFallo,
          habilitada: false,
          razon: 'Primero debe formularse pliego de cargos'
        }
      };

    case 'Juzgamiento':
      return {
        ...baseAcciones,
        emitirFallo: {
          ...baseAcciones.emitirFallo,
          habilitada: true,
          destacada: true,
          razon: undefined
        },
        gestionActas: {
          ...baseAcciones.gestionActas,
          habilitada: true,
          destacada: true
        },
        gestionEvidencias: {
          ...baseAcciones.gestionEvidencias,
          habilitada: true,
          destacada: true
        },
        archivar: {
          ...baseAcciones.archivar,
          habilitada: false,
          razon: 'Debe emitirse fallo absolutorio o archivo'
        },
        formularCargos: {
          ...baseAcciones.formularCargos,
          habilitada: false,
          razon: 'Cargos ya formulados'
        }
      };

    case 'Fallo':
      return {
        ...baseAcciones,
        verExpediente: {
          ...baseAcciones.verExpediente,
          habilitada: true,
          destacada: true
        },
        gestionAutos: {
          ...baseAcciones.gestionAutos,
          habilitada: true
        },
        gestionOficios: {
          ...baseAcciones.gestionOficios,
          habilitada: true
        },
        historial: {
          ...baseAcciones.historial,
          habilitada: true,
          destacada: true
        },
        // Deshabilitar acciones de flujo
        asignarProfesional: {
          ...baseAcciones.asignarProfesional,
          habilitada: false,
          razon: 'Proceso finalizado'
        },
        abrirInvestigacion: {
          ...baseAcciones.abrirInvestigacion,
          habilitada: false,
          razon: 'Proceso finalizado'
        },
        formularCargos: {
          ...baseAcciones.formularCargos,
          habilitada: false,
          razon: 'Proceso finalizado'
        },
        emitirFallo: {
          ...baseAcciones.emitirFallo,
          habilitada: false,
          razon: 'Fallo ya emitido'
        },
        archivar: {
          ...baseAcciones.archivar,
          habilitada: false,
          razon: 'Proceso ya finalizado'
        },
        remitir: {
          ...baseAcciones.remitir,
          habilitada: false,
          razon: 'Proceso finalizado'
        }
      };

    default:
      return baseAcciones;
  }
}

/**
 * Obtiene el texto descriptivo de la etapa
 */
export function obtenerDescripcionEtapa(etapa: EtapaProceso): string {
  const descripciones: Record<EtapaProceso, string> = {
    'Recepción': 'Radicación y asignación inicial del proceso. Se clasifica la noticia y se asigna profesional.',
    'Valoración': 'Análisis preliminar de competencia y procedencia. Se determina si amerita investigación.',
    'Indagación': 'Recolección de información preliminar. Se verifica si existen méritos para investigación formal.',
    'Investigación': 'Investigación formal del caso. Práctica de pruebas y análisis de evidencias.',
    'Juzgamiento': 'Etapa de descargos y alegatos. Se evalúan argumentos antes del fallo.',
    'Fallo': 'Decisión final del proceso. Sanción, absolución o archivo definitivo.'
  };
  
  return descripciones[etapa] || '';
}

/**
 * Obtiene las acciones principales recomendadas para la etapa
 */
export function obtenerAccionesPrincipales(etapa: EtapaProceso): string[] {
  const accionesPrincipales: Record<EtapaProceso, string[]> = {
    'Recepción': [
      'Asignar profesional responsable',
      'Verificar documentación completa',
      'Clasificar tipo de falta',
      'Decidir si procede o remitir'
    ],
    'Valoración': [
      'Analizar competencia',
      'Verificar prescripción',
      'Decidir apertura de indagación',
      'Archivar si no procede'
    ],
    'Indagación': [
      'Recopilar información preliminar',
      'Identificar posibles responsables',
      'Decidir apertura de investigación',
      'Archivar si no hay mérito'
    ],
    'Investigación': [
      'Practicar pruebas',
      'Recibir descargos',
      'Formular pliego de cargos',
      'Pasar a juzgamiento'
    ],
    'Juzgamiento': [
      'Realizar audiencia de descargos',
      'Recibir alegatos de conclusión',
      'Analizar pruebas',
      'Emitir fallo'
    ],
    'Fallo': [
      'Notificar decisión',
      'Ejecutar sanción si aplica',
      'Archivar expediente',
      'Seguimiento a recursos'
    ]
  };
  
  return accionesPrincipales[etapa] || [];
}
