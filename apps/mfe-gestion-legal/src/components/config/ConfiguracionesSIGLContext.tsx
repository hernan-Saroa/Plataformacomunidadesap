/**
 * ConfiguracionesSIGLContext - Context API para Configuraciones Centralizadas
 * Gestiona estados, columnas y configuraciones de todos los módulos de Gestión Legal
 * IMPACTO EN TODO EL SISTEMA: Todos los tableros Kanban leen desde aquí
 */

import { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { legalService, ocService } from '../../../../services/api/legal.service';
import { expedienteConfigService } from '../../services/api/expediente-config.service';

// ============ TIPOS ============

export interface EstadoKanban {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  activo: boolean;
  aprobacionTipo?: 'ninguno' | 'rol' | 'usuario';
  aprobacionRol?: string;
  aprobacionUsuario?: string;
}

export interface ConfiguracionTiempo {
  id: string;
  tipo: string;
  dias: number;
  alertaDias: number;
  activo: boolean;
}

export interface TipoProcesoJudicial {
  id: string;
  nombre: string;
  descripcion: string;
  plazo: number;
  alertaDias: number;
  activo: boolean;
  rolAsociado?: string;
  horaEspecial?: string;
  camposObligatorios?: Record<string, boolean>;
  camposVisibles?: Record<string, boolean>;
  camposAdicionalesConfig?: Array<{
    id: string;
    nombre: string;
    tipo: 'texto' | 'numero' | 'fecha' | 'booleano' | 'alfanumerico' | 'unico' | 'documento' | 'opciones-multiple' | 'lista';
    obligatorio: boolean;
    paso: number;
    tiposDocumento?: string[];
    opciones?: string[];
  }>;
  unidadTermino?: 'dias' | 'horas' | 'Dias Habiles' | 'Dias Calendario' | 'Horas' | 'Ambos';
  estados?: EstadoKanban[];
}

export interface TipoAuto {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export interface EjeEstrategico {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
  color: string;
  activo: boolean;
  orden: number;
}

export interface TipoIndicador {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
  color: string;
  activo: boolean;
  orden: number;
}

export interface TipoRequerimiento {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  orden: number;
}

export interface TipoActuacion {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  orden: number;
}

export interface MedioControl {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  orden: number;
}

export interface TipoExcepcionProcesal {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  activo: boolean;
  orden: number;
}

export interface CausalEspecifica {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  activo: boolean;
  orden: number;
}

export interface OrganismoControl {
  id: string;
  nombre: string;
  descripcion: string;
  correos: string[];
  activo: boolean;
}

// Destinatarios configurables para el módulo de Términos e Informes
export interface DestinatarioInforme {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

// Entes de control dedicados para Planes de Mejoramiento
export interface EnteControlPM {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  activo: boolean;
}

// Categorías de Documentos Configurables
export interface CategoriaDocumento {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  activo: boolean;
  orden: number;
}

export interface Dependencia {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface ConfiguracionModulo {
  id: string;
  nombre: string;
  estados: EstadoKanban[];
  tiempos: ConfiguracionTiempo[];
  tiposProcesos?: TipoProcesoJudicial[];
  tiposAutos?: TipoAuto[];
  tiposActuaciones?: TipoActuacion[];
  mediosControl?: MedioControl[];
  tiposExcepcionesProcesal?: TipoExcepcionProcesal[];
  causalesEspecificas?: CausalEspecifica[];
  dependencias?: Dependencia[];
}

// ============ DATOS DE CASOS POR ESTADO ============
// ⚠️ TODO: Implementar conteo dinámico desde API en lugar de datos estáticos
// Por ahora, inicializamos en 0 y esperamos que se actualice dinámicamente
// Los IDs deben coincidir con los estados definidos en configuracionesIniciales
export const casosPorEstado: Record<string, Record<string, number>> = {
  'defensa-judicial': {
    'NOTIFICADA': 0,
    'CONTESTACIÓN': 0,
    'PROBATORIA': 0,
    'ALEGATOS': 0,
    'SENTENCIA': 0,
    'APELACIÓN': 0,
    'CUMPLIMIENTO': 0,
  },
  'juzgamiento': {
    'E1_AVOCAMIENTO': 0,
    'E2_DESCARGOS': 0,
    'E3_PRUEBAS': 0,
    'E4_ALEGATOS': 0,
    'E5_FALLO_1I': 0,
    'E6_APELACIÓN': 0,
    'E7_FALLO_2I': 0,
  },
  'asesoria-juridica': {
    'en_radicacion': 0,
    'asignado': 0,
    'en_analisis': 0,
    'en_revision': 0,
    'pendiente_revision_jefe': 0,
    'devuelta_por_jefe': 0,
    'respondido': 0,
  },
};

// ============ CONFIGURACIONES INICIALES ============

const configuracionesIniciales: ConfiguracionModulo[] = [
  {
    id: 'defensa-judicial',
    nombre: 'Defensa Judicial',
    estados: [
      { id: 'NOTIFICADA', nombre: 'Notificada', color: '#3B82F6', orden: 1, activo: true },
      { id: 'CONTESTACIÓN', nombre: 'Contestación', color: '#8B5CF6', orden: 2, activo: true },
      { id: 'PROBATORIA', nombre: 'Probatoria', color: '#06B6D4', orden: 3, activo: true },
      { id: 'ALEGATOS', nombre: 'Alegatos', color: '#EC4899', orden: 4, activo: true },
      { id: 'SENTENCIA', nombre: 'Sentencia', color: '#10B981', orden: 5, activo: true },
      { id: 'APELACIÓN', nombre: 'Apelación', color: '#F59E0B', orden: 6, activo: true },
      { id: 'FALLO_2A_INSTANCIA', nombre: 'Fallo 2ª Instancia', color: '#EF4444', orden: 7, activo: true },
      { id: 'CUMPLIMIENTO', nombre: 'Cumplimiento', color: '#6B7280', orden: 8, activo: true },
    ],
    tiempos: [
      { id: 'estudio-inicial', tipo: 'Estudio Inicial', dias: 5, alertaDias: 2, activo: true },
      { id: 'contestacion-demanda', tipo: 'Contestación Demanda', dias: 30, alertaDias: 7, activo: true },
      { id: 'presentacion-pruebas', tipo: 'Presentación Pruebas', dias: 20, alertaDias: 5, activo: true },
      { id: 'alegatos-conclusion', tipo: 'Alegatos de Conclusión', dias: 15, alertaDias: 3, activo: true },
    ],
    tiposProcesos: [
      { id: 'reparacion-directa', nombre: 'Reparación Directa', descripcion: 'Acción para obtener indemnización de perjuicios causados por hecho, omisión, operación administrativa u ocupación temporal o permanente de inmueble.', plazo: 30, alertaDias: 7, activo: true },
      { id: 'nulidad-restablecimiento', nombre: 'Nulidad y Restablecimiento del Derecho', descripcion: 'Acción para declarar la nulidad de un acto administrativo y restablecer el derecho afectado.', plazo: 20, alertaDias: 5, activo: true },
      { id: 'accion-grupo', nombre: 'Acción de Grupo', descripcion: 'Acción interpuesta por un grupo de personas para obtener el reconocimiento y pago de indemnización de perjuicios.', plazo: 40, alertaDias: 10, activo: true },
      { id: 'accion-popular', nombre: 'Acción Popular', descripcion: 'Acción para la protección de los derechos e intereses colectivos.', plazo: 25, alertaDias: 5, activo: true },
      { id: 'controversias-contractuales', nombre: 'Controversias Contractuales', descripcion: 'Acción para resolver controversias surgidas de contratos estatales.', plazo: 35, alertaDias: 7, activo: true },
      { id: 'tutela', nombre: 'Tutela', descripcion: 'Acción para la protección inmediata de derechos fundamentales.', plazo: 10, alertaDias: 2, activo: true, camposAdicionalesConfig: [
        {
          id: 'derecho-fundamental-principal',
          nombre: 'Derecho Fundamental Principal',
          tipo: 'lista' as const,
          obligatorio: true,
          paso: 7,
          opciones: [
            'Derecho a la vida',
            'Prohibición de desaparición forzada, torturas, tratos crueles, inhumanos o degradantes',
            'Prohibición de la esclavitud, servidumbre y trata de seres humanos',
            'Derecho a la igualdad y no discriminación',
            'Reconocimiento de la personalidad jurídica',
            'Derecho a la intimidad personal y familiar, buen nombre y habeas data',
            'Libre desarrollo de la personalidad',
            'Derecho a la honra',
            'Libertad de conciencia',
            'Libertad de cultos',
            'Libertad de expresión, información y rectificación',
            'Libertad de circulación y residencia',
            'Libertad de escoger profesión u oficio',
            'Libertad de enseñanza, aprendizaje, investigación y cátedra',
            'Libertad personal (no ser molestado en su persona o familia)',
            'Debido proceso y derecho de defensa',
            'Habeas corpus',
            'Doble instancia',
            'No autoincriminación',
            'Prohibición de penas de destierro, prisión perpetua y confiscación',
            'Derecho a la paz',
            'Derecho de petición',
            'Derecho al trabajo',
            'Derecho de reunión y manifestación pública',
            'Derecho de libre asociación',
            'Derecho de sindicalización',
            'Derechos políticos y de participación',
            'Otro'
          ]
        },
        {
          id: 'otros-derechos-vulnerados',
          nombre: 'Otros Derechos que Pueden ser Vulnerados',
          tipo: 'opciones-multiple' as const,
          obligatorio: false,
          paso: 7,
          opciones: [
            'Derecho a la vida',
            'Prohibición de desaparición forzada, torturas, tratos crueles, inhumanos o degradantes',
            'Prohibición de la esclavitud, servidumbre y trata de seres humanos',
            'Derecho a la igualdad y no discriminación',
            'Reconocimiento de la personalidad jurídica',
            'Derecho a la intimidad personal y familiar, buen nombre y habeas data',
            'Libre desarrollo de la personalidad',
            'Derecho a la honra',
            'Libertad de conciencia',
            'Libertad de cultos',
            'Libertad de expresión, información y rectificación',
            'Libertad de circulación y residencia',
            'Libertad de escoger profesión u oficio',
            'Libertad de enseñanza, aprendizaje, investigación y cátedra',
            'Libertad personal (no ser molestado en su persona o familia)',
            'Debido proceso y derecho de defensa',
            'Habeas corpus',
            'Doble instancia',
            'No autoincriminación',
            'Prohibición de penas de destierro, prisión perpetua y confiscación',
            'Derecho a la paz',
            'Derecho de petición',
            'Derecho al trabajo',
            'Derecho de reunión y manifestación pública',
            'Derecho de libre asociación',
            'Derecho de sindicalización',
            'Derechos políticos y de participación',
            'Otro'
          ]
        }
      ] },
      { id: 'proceso-ejecutivo', nombre: 'Proceso Ejecutivo', descripcion: 'Proceso para el cobro de obligaciones claras, expresas y exigibles.', plazo: 20, alertaDias: 5, activo: true },
      { id: 'proceso-penal', nombre: 'Proceso Penal', descripcion: 'Proceso de naturaleza penal relacionado con la entidad, incluyendo delitos contra la administración pública y/o conductas que afecten el patrimonio público.', plazo: 30, alertaDias: 7, activo: true, camposAdicionalesConfig: [{ id: 'clasificacion-penal', nombre: 'Clasificación Penal', tipo: 'opciones-multiple' as const, obligatorio: true, paso: 1, opciones: ['Delitos contra la Administración Pública', 'Conductas que afectan el Patrimonio Público', 'Otros'] }] },
      { id: 'otro', nombre: 'Otro', descripcion: 'Otros tipos de procesos judiciales no categorizados.', plazo: 15, alertaDias: 3, activo: true },
    ],
    tiposAutos: [
      { id: 'auto-admisorio', nombre: 'Auto Admisorio', descripcion: 'Auto que admite la demanda y ordena correr traslado al demandado', activo: true },
      { id: 'auto-pruebas', nombre: 'Auto de Pruebas', descripcion: 'Auto que decreta o niega las pruebas solicitadas por las partes', activo: true },
      { id: 'auto-traslado', nombre: 'Auto de Traslado', descripcion: 'Auto que ordena dar traslado a la parte contraria', activo: true },
      { id: 'auto-archivo', nombre: 'Auto de Archivo', descripcion: 'Auto que ordena el archivo del proceso', activo: true },
      { id: 'auto-nulidad', nombre: 'Auto de Nulidad', descripcion: 'Auto que declara la nulidad de actuaciones procesales', activo: true },
      { id: 'auto-correccion', nombre: 'Auto de Corrección', descripcion: 'Auto que corrige errores aritméticos o de transcripción', activo: true },
      { id: 'auto-interlocutorio', nombre: 'Auto Interlocutorio', descripcion: 'Auto que resuelve incidentes o cuestiones de trámite', activo: true },
      { id: 'auto-sustanciacion', nombre: 'Auto de Sustanciación', descripcion: 'Auto que impulsa el proceso y ordena trámites', activo: true },
    ],
    tiposActuaciones: [
      { id: 'aporte-pruebas', nombre: 'Aporte de Pruebas', descripcion: 'Presentación de pruebas documentales o testimoniales.', activo: true, orden: 1 },
      { id: 'contestacion', nombre: 'Contestación', descripcion: 'Contestación a requerimientos o demandas.', activo: true, orden: 2 },
      { id: 'asignacion', nombre: 'Asignación', descripcion: 'Asignación de roles o expedientes.', activo: true, orden: 3 },
      { id: 'auto-interlocutorio', nombre: 'Auto Interlocutorio', descripcion: 'Decisión sobre cuestiones de trámite.', activo: true, orden: 4 },
      { id: 'sentencia', nombre: 'Sentencia', descripcion: 'Decisión final del proceso.', activo: true, orden: 5 },
      { id: 'traslado', nombre: 'Traslado', descripcion: 'Comunicación de documentos a otra parte.', activo: true, orden: 6 },
      { id: 'notificacion', nombre: 'Notificación', descripcion: 'Comunicación formal de un acto.', activo: true, orden: 7 },
      { id: 'recurso', nombre: 'Recurso', descripcion: 'Interposición de recurso legal.', activo: true, orden: 8 },
      { id: 'memorial', nombre: 'Memorial', descripcion: 'Escrito presentado por las partes.', activo: true, orden: 9 },
      { id: 'audiencia', nombre: 'Audiencia', descripcion: 'Diligencia oral y pública.', activo: true, orden: 10 },
      { id: 'inspeccion-judicial', nombre: 'Inspección Judicial', descripcion: 'Revisión directa por parte del juez.', activo: true, orden: 11 },
      { id: 'prueba-testimonial', nombre: 'Prueba Testimonial', descripcion: 'Declaración de testigos.', activo: true, orden: 12 },
      { id: 'diligencia', nombre: 'Diligencia', descripcion: 'Actuación procedimental diversa.', activo: true, orden: 13 },
      { id: 'otro', nombre: 'Otro', descripcion: 'Otras actuaciones no categorizadas.', activo: true, orden: 14 }
    ],
    mediosControl: [
      { id: 'reparacion-directa', nombre: 'Reparación Directa', descripcion: 'Acción para obtener indemnización por daño antijurídico', activo: true, orden: 1 },
      { id: 'nulidad-restablecimiento', nombre: 'Nulidad y Restablecimiento', descripcion: 'Acción contra actos administrativos', activo: true, orden: 2 },
      { id: 'accion-grupo', nombre: 'Acción de Grupo', descripcion: 'Acción para protección de derechos colectivos de grupos', activo: true, orden: 3 },
      { id: 'accion-popular', nombre: 'Acción Popular', descripcion: 'Acción para protección de derechos e intereses colectivos', activo: true, orden: 4 },
      { id: 'controversias-contractuales', nombre: 'Controversias Contractuales', descripcion: 'Acción para resolver controversias de contratos estatales', activo: true, orden: 5 },
      { id: 'tutela', nombre: 'Tutela', descripcion: 'Acción para protección inmediata de derechos fundamentales', activo: true, orden: 6 },
      { id: 'otro', nombre: 'Otro', descripcion: 'Otros medios de control no categorizados', activo: true, orden: 7 },
    ],
    dependencias: [
      { id: 'legal', nombre: 'Legal', activo: true },
    ],
  },
  {
    id: 'juzgamiento',
    nombre: 'Juzgamiento Disciplinario',
    estados: [
      { id: 'E1_AVOCAMIENTO', nombre: 'Avocamiento', color: '#3B82F6', orden: 1, activo: true },
      { id: 'E2_DESCARGOS', nombre: 'Descargos', color: '#8B5CF6', orden: 2, activo: true },
      { id: 'E3_PRUEBAS', nombre: 'Pruebas', color: '#06B6D4', orden: 3, activo: true },
      { id: 'E4_ALEGATOS', nombre: 'Alegatos', color: '#EC4899', orden: 4, activo: true },
      { id: 'E5_FALLO_1I', nombre: 'Fallo 1ª Instancia', color: '#10B981', orden: 5, activo: true },
      { id: 'E6_APELACIÓN', nombre: 'Apelación', color: '#F59E0B', orden: 6, activo: true },
      { id: 'E7_FALLO_2I', nombre: 'Fallo 2ª Instancia', color: '#6B7280', orden: 7, activo: true },
    ],
    tiempos: [
      { id: 'indagacion-preliminar', tipo: 'Indagación Preliminar', dias: 6, alertaDias: 2, activo: true },
      { id: 'descargos-investigado', tipo: 'Descargos Investigado', dias: 10, alertaDias: 3, activo: true },
      { id: 'fallo-primera-instancia', tipo: 'Fallo Primera Instancia', dias: 30, alertaDias: 7, activo: true },
    ],
    tiposActuaciones: [
      { id: 'auto-apertura', nombre: 'Auto de Apertura', descripcion: 'Auto que da inicio formal a la investigación disciplinaria', activo: true, orden: 1 },
      { id: 'notificacion', nombre: 'Notificación', descripcion: 'Comunicación oficial de actuaciones procesales al investigado', activo: true, orden: 2 },
      { id: 'solicitud-informes', nombre: 'Solicitud de Informes', descripcion: 'Requerimiento de información a dependencias o terceros', activo: true, orden: 3 },
      { id: 'recepcion-pruebas', nombre: 'Recepción de Pruebas', descripcion: 'Incorporación de elementos probatorios al expediente', activo: true, orden: 4 },
      { id: 'auto-descargos', nombre: 'Auto de Descargos', descripcion: 'Auto que otorga traslado al investigado para presentar descargos', activo: true, orden: 5 },
      { id: 'audiencia', nombre: 'Audiencia', descripcion: 'Diligencia procesal para práctica de pruebas o alegatos', activo: true, orden: 6 },
      { id: 'auto-practica-pruebas', nombre: 'Auto de Práctica de Pruebas', descripcion: 'Auto que ordena la práctica de pruebas solicitadas', activo: true, orden: 7 },
      { id: 'alegatos-conclusion', nombre: 'Alegatos de Conclusión', descripcion: 'Presentación de argumentos finales antes del fallo', activo: true, orden: 8 },
      { id: 'auto-cierre', nombre: 'Auto de Cierre', descripcion: 'Auto que cierra la etapa probatoria', activo: true, orden: 9 },
      { id: 'fallo-primera-instancia', nombre: 'Fallo de Primera Instancia', descripcion: 'Decisión de fondo que resuelve el proceso disciplinario', activo: true, orden: 10 },
      { id: 'recurso-apelacion', nombre: 'Recurso de Apelación', descripcion: 'Impugnación del fallo de primera instancia', activo: true, orden: 11 },
      { id: 'fallo-segunda-instancia', nombre: 'Fallo de Segunda Instancia', descripcion: 'Decisión que resuelve el recurso de apelación', activo: true, orden: 12 },
      { id: 'archivo-proceso', nombre: 'Archivo del Proceso', descripcion: 'Actuación que ordena el archivo definitivo del expediente', activo: true, orden: 13 },
      { id: 'otro', nombre: 'Otro', descripcion: 'Otras actuaciones procesales no categorizadas', activo: true, orden: 14 },
    ],
    tiposExcepcionesProcesal: [
      { id: 'prescripcion', nombre: 'Prescripción', descripcion: 'Pérdida ejecutoria o derecho legal para juzgar', icono: '📋', activo: true, orden: 1 },
      { id: 'otra-excepcion', nombre: 'Otra Excepción Previa', descripcion: 'Según el Código General del Proceso', icono: '📄', activo: true, orden: 2 },
    ],
    causalesEspecificas: [
      { id: 'impedimento', nombre: 'Impedimento', descripcion: 'Si existe relación de afinidad', icono: '🚫', activo: true, orden: 1 },
      { id: 'falta-competencia', nombre: 'Falta de Competencia', descripcion: 'El funcionario no tiene competencia para conocer el asunto', icono: '⚖️', activo: true, orden: 2 },
      { id: 'falta-jurisdiccion', nombre: 'Falta de Jurisdicción', descripcion: 'El asunto no corresponde a la jurisdicción disciplinaria', icono: '🏛️', activo: true, orden: 3 },
      { id: 'caducidad', nombre: 'Caducidad', descripcion: 'Término perentorio para iniciar el proceso', icono: '⏰', activo: true, orden: 4 },
      { id: 'cosa-juzgada', nombre: 'Cosa Juzgada', descripcion: 'Ya existe una decisión en firme sobre el mismo asunto', icono: '✓', activo: true, orden: 5 },
      { id: 'indebida-representacion', nombre: 'Indebida Representación', descripcion: 'Problemas con la representación legal', icono: '👤', activo: true, orden: 6 },
      { id: 'otra', nombre: 'Otra', descripcion: 'Otras causales específicas', icono: '📝', activo: true, orden: 7 },
    ],
  },
  {
    id: 'asesoria-juridica',
    nombre: 'Asesoría Jurídica',
    estados: [
      { id: 'en_radicacion', nombre: 'Radicada', color: '#3B82F6', orden: 1, activo: true },
      { id: 'asignado', nombre: 'Asignado', color: '#8B5CF6', orden: 2, activo: true },
      { id: 'en_analisis', nombre: 'En Análisis', color: '#06B6D4', orden: 3, activo: true },
      { id: 'en_revision', nombre: 'En Revisión', color: '#F59E0B', orden: 4, activo: true },
      { id: 'pendiente_revision_jefe', nombre: 'Pendiente Revisión Jefe', color: '#8B5CF6', orden: 5, activo: true },
      { id: 'devuelta_por_jefe', nombre: 'Devuelta por Jefe', color: '#EF4444', orden: 6, activo: true },
      { id: 'respondido', nombre: 'Respondido', color: '#10B981', orden: 7, activo: true },
    ],
    tiempos: [
      { id: 'analisis-inicial', tipo: 'Análisis Inicial', dias: 3, alertaDias: 1, activo: true },
      { id: 'emision-concepto', tipo: 'Emisión Concepto', dias: 10, alertaDias: 3, activo: true },
      { id: 'revision-superior', tipo: 'Revisión Superior', dias: 5, alertaDias: 2, activo: true },
    ],
  },
];

// ============ EJES ESTRATÉGICOS INICIALES ============

const ejesEstrategicosIniciales: EjeEstrategico[] = [
  {
    id: 'GESTION_INSTITUCIONAL',
    nombre: 'Gestión Institucional',
    icono: '🏛️',
    descripcion: 'Procesos y acciones relacionadas con la administración y gestión institucional',
    color: '#003DA5',
    activo: true,
    orden: 1
  },
  {
    id: 'TALENTO_HUMANO',
    nombre: 'Talento Humano',
    icono: '👥',
    descripcion: 'Desarrollo, bienestar y gestión del talento humano',
    color: '#2962FF',
    activo: true,
    orden: 2
  },
  {
    id: 'TRANSPARENCIA',
    nombre: 'Transparencia',
    icono: '🔍',
    descripcion: 'Transparencia, acceso a la información y rendición de cuentas',
    color: '#10B981',
    activo: true,
    orden: 3
  },
  {
    id: 'TECNOLOGIA',
    nombre: 'Tecnología',
    icono: '💻',
    descripcion: 'Innovación tecnológica y transformación digital',
    color: '#7C3AED',
    activo: true,
    orden: 4
  }
];

// ============ TIPOS DE INDICADORES INICIALES ============

const tiposIndicadoresIniciales: TipoIndicador[] = [
  {
    id: 'EFICACIA',
    nombre: 'Eficacia',
    icono: '🎯',
    descripcion: 'Mide el grado de cumplimiento de los objetivos planteados',
    color: '#10B981',
    activo: true,
    orden: 1
  },
  {
    id: 'EFICIENCIA',
    nombre: 'Eficiencia',
    icono: '⚡',
    descripcion: 'Mide la relación entre los resultados obtenidos y los recursos utilizados',
    color: '#2962FF',
    activo: true,
    orden: 2
  },
  {
    id: 'EFECTIVIDAD',
    nombre: 'Efectividad',
    icono: '✅',
    descripcion: 'Mide el impacto o efecto de las acciones sobre la población objetivo',
    color: '#7C3AED',
    activo: true,
    orden: 3
  },
  {
    id: 'CALIDAD',
    nombre: 'Calidad',
    icono: '⭐',
    descripcion: 'Mide los atributos, propiedades o características de los servicios',
    color: '#F59E0B',
    activo: true,
    orden: 4
  }
];

// ============ TIPOS DE REQUERIMIENTOS INICIALES ============

const tiposRequerimientosIniciales: TipoRequerimiento[] = [
  {
    id: 'DOCUMENTOS',
    nombre: 'Documentos',
    descripcion: 'Requerimientos relacionados con la entrega de documentos',
    activo: true,
    orden: 1
  },
  {
    id: 'INFORMES',
    nombre: 'Informes',
    descripcion: 'Requerimientos relacionados con la entrega de informes',
    activo: true,
    orden: 2
  },
  {
    id: 'CERTIFICADOS',
    nombre: 'Certificados',
    descripcion: 'Requerimientos relacionados con la entrega de certificados',
    activo: true,
    orden: 3
  },
  {
    id: 'OTROS',
    nombre: 'Otros',
    descripcion: 'Otros tipos de requerimientos',
    activo: true,
    orden: 4
  }
];

// ============ ORGANISMOS DE CONTROL INICIALES ============

const organismosControlIniciales: OrganismoControl[] = [
  {
    id: 'CONTRALORIA',
    nombre: 'Contraloría General de la República',
    descripcion: 'Máximo órgano de control fiscal del Estado',
    correos: [],
    activo: true
  },
  {
    id: 'PROCURADURIA',
    nombre: 'Procuraduría General de la Nación',
    descripcion: 'Entidad encargada de investigar, sancionar, intervenir y prevenir las irregularidades cometidas por los gobernantes, los funcionarios públicos, los particulares que ejercen funciones públicas y las agencias del Estado',
    correos: [],
    activo: true
  },
  {
    id: 'FISCALIA',
    nombre: 'Fiscalía General de la Nación',
    descripcion: 'Entidad de la rama judicial del poder público con plena autonomía administrativa y presupuestal',
    correos: [],
    activo: true
  },
  {
    id: 'PERSONERIA',
    nombre: 'Personería Distrital',
    descripcion: 'Órgano de control del Distrito Capital',
    correos: [],
    activo: true
  },
  {
    id: 'DEFENSORIA',
    nombre: 'Defensoría del Pueblo',
    descripcion: 'Institución del Estado encargada de velar por la promoción, el ejercicio y la divulgación de los derechos humanos',
    correos: [],
    activo: true
  }
];

// ============ DESTINATARIOS DE INFORMES INICIALES ============

const destinatariosInformeIniciales: DestinatarioInforme[] = [
  {
    id: 'OFICINA_PLANEACION',
    nombre: 'Oficina de Planeación',
    descripcion: 'Oficina Asesora de Planeación de la entidad',
    activo: true
  },
  {
    id: 'CONTRALORIA',
    nombre: 'Contraloría General de la República',
    descripcion: 'Máximo órgano de control fiscal del Estado',
    activo: true
  },
  {
    id: 'PROCURADURIA',
    nombre: 'Procuraduría General de la Nación',
    descripcion: 'Entidad encargada de investigar, sancionar, intervenir y prevenir las irregularidades cometidas por los gobernantes, los funcionarios públicos y los particulares que ejercen funciones públicas',
    activo: true
  },
  {
    id: 'CONTROL_INTERNO',
    nombre: 'Oficina de Control Interno',
    descripcion: 'Control interno institucional',
    activo: true
  }
];

const entesControlPMIniciales: EnteControlPM[] = [
  { id: 'CONTRALORIA', nombre: 'Contraloría General', descripcion: 'Máximo órgano de control fiscal del Estado', icono: '🏛️', color: '#DC2626', activo: true },
  { id: 'PROCURADURIA', nombre: 'Procuraduría General', descripcion: 'Órgano de vigilancia de la conducta oficial de servidores públicos', icono: '⚖️', color: '#059669', activo: true },
  { id: 'OCI', nombre: 'Oficina Control Interno', descripcion: 'Control interno institucional', icono: '🔍', color: '#2962FF', activo: true },
  { id: 'AUDITORIA_EXTERNA', nombre: 'Auditoría Externa', descripcion: 'Revisiones de firmas de auditoría externas', icono: '📊', color: '#9C27B0', activo: true },
];

// ============ CATEGORÍAS DE DOCUMENTOS INICIALES ============

const categoriasDocumentosIniciales: CategoriaDocumento[] = [
  { id: 'todos', nombre: 'Todos', icono: 'FolderOpen', color: '#003DA5', activo: true, orden: 1 },
  { id: 'actas', nombre: 'Actas', icono: 'BookOpen', color: '#7C3AED', activo: true, orden: 2 },
  { id: 'evidencias', nombre: 'Evidencias', icono: 'Shield', color: '#059669', activo: true, orden: 3 },
  { id: 'oficios', nombre: 'Oficios', icono: 'Mail', color: '#D97706', activo: true, orden: 4 },
  { id: 'autos', nombre: 'Autos', icono: 'Stamp', color: '#DC2626', activo: true, orden: 5 },
  { id: 'pruebas', nombre: 'Pruebas', icono: 'Eye', color: '#0891B2', activo: true, orden: 6 },
  { id: 'comunicaciones', nombre: 'Comunicaciones', icono: 'Share2', color: '#4F46E5', activo: true, orden: 7 },
  { id: 'notificaciones', nombre: 'Notificaciones', icono: 'Bell', color: '#EA580C', activo: true, orden: 8 },
  { id: 'documentos', nombre: 'Documentos Generales', icono: 'File', color: '#6B7280', activo: true, orden: 9 },
];

// ============ CONTEXT TYPE ============

interface ConfiguracionesSIGLContextType {
  configuraciones: ConfiguracionModulo[];
  ejesEstrategicos: EjeEstrategico[];
  tiposIndicadores: TipoIndicador[];
  tiposRequerimientos: TipoRequerimiento[];
  organismosControl: OrganismoControl[];
  entesControlPM: EnteControlPM[];
  categoriasDocumentos: CategoriaDocumento[];
  destinatariosInforme: DestinatarioInforme[];
  cambiosPendientes: boolean;
  getConfiguracionModulo: (moduloId: string) => ConfiguracionModulo | undefined;
  getEstadosActivos: (moduloId: string) => EstadoKanban[];
  getTiposProcesosActivos: (moduloId: string) => TipoProcesoJudicial[];
  getTiposAutosActivos: (moduloId: string) => TipoAuto[];
  getTiposActuacionesActivos: (moduloId: string) => TipoActuacion[];
  getMediosControlActivos: (moduloId: string) => MedioControl[];
  getTiposExcepcionesActivos: (moduloId: string) => TipoExcepcionProcesal[];
  getCausalesEspecificasActivas: (moduloId: string) => CausalEspecifica[];
  getDependenciasActivas: (moduloId: string) => Dependencia[];
  getEjesEstrategicosActivos: () => EjeEstrategico[];
  getTiposIndicadoresActivos: () => TipoIndicador[];
  getTiposRequerimientosActivos: () => TipoRequerimiento[];
  getOrganismosControlActivos: () => OrganismoControl[];
  getEntesControlPMActivos: () => EnteControlPM[];
  getCategoriasDocumentosActivas: () => CategoriaDocumento[];
  getDestinatariosInformeActivos: () => DestinatarioInforme[];
  actualizarConfiguraciones: (nuevasConfigs: ConfiguracionModulo[]) => void;
  actualizarEjesEstrategicos: (nuevosEjes: EjeEstrategico[]) => void;
  actualizarTiposIndicadores: (nuevosTipos: TipoIndicador[]) => void;
  actualizarTiposRequerimientos: (nuevosTipos: TipoRequerimiento[]) => void;
  actualizarOrganismosControl: (nuevosOrganismos: OrganismoControl[]) => void;
  actualizarEntesControlPM: (nuevosEntes: EnteControlPM[]) => void;
  actualizarCategoriasDocumentos: (nuevasCategorias: CategoriaDocumento[]) => void;
  actualizarDestinatariosInforme: (nuevosDestinatarios: DestinatarioInforme[]) => void;
  guardarConfiguraciones: (silencioso?: boolean) => Promise<void>;
  restablecerDefecto: () => void;
  setCambiosPendientes: (value: boolean) => void;
  savingStatus: 'idle' | 'saving' | 'saved' | 'error';
}

// ============ CONTEXT ============

const ConfiguracionesSIGLContext = createContext<ConfiguracionesSIGLContextType | undefined>(undefined);

// ============ PROVIDER ============

export function ConfiguracionesSIGLProvider({ children }: { children: ReactNode }) {
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionModulo[]>(configuracionesIniciales);
  // Tracks the last-saved { nombre, plazo } per tipoProceso id so we can detect name/plazo changes on save
  const savedTiposRef = useRef<Record<string, { nombre: string; plazo: number }>>({});
  const [ejesEstrategicos, setEjesEstrategicos] = useState<EjeEstrategico[]>(ejesEstrategicosIniciales);
  const [tiposIndicadores, setTiposIndicadores] = useState<TipoIndicador[]>(tiposIndicadoresIniciales);
  const [tiposRequerimientos, setTiposRequerimientos] = useState<TipoRequerimiento[]>(tiposRequerimientosIniciales);
  const [organismosControl, setOrganismosControl] = useState<OrganismoControl[]>(organismosControlIniciales);
  const [entesControlPM, setEntesControlPM] = useState<EnteControlPM[]>(entesControlPMIniciales);
  const [categoriasDocumentos, setCategoriasDocumentos] = useState<CategoriaDocumento[]>(categoriasDocumentosIniciales);
  const [destinatariosInforme, setDestinatariosInforme] = useState<DestinatarioInforme[]>(destinatariosInformeIniciales);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Cargar configuraciones desde API
  useEffect(() => {
    const loadConfig = async () => {
      try {
        console.log('🔄 Cargando configuraciones desde API...');
        const keys = ['defensa-judicial', 'juzgamiento', 'asesoria-juridica'];

        // Cargar todas las configuraciones en paralelo
        const responses = await Promise.all(
          keys.map(key =>
            legalService.getConfiguration(key)
              .then(res => res?.value || null) // Asegurar que devolvemos null si no hay valor
              .catch(err => {
                console.warn(`⚠️ Config no encontrada para ${key}, usando defecto.`, err);
                return null;
              })
          )
        );

        // Mapear respuestas a ConfiguracionModulo: filtrar null Y undefined
        const configsCargadas = responses.filter(c => c !== null && c !== undefined) as ConfiguracionModulo[];

        if (configsCargadas.length > 0) {
          // Fusionar con las iniciales para asegurar que existen todos los módulos
          const mergedConfigs = configuracionesIniciales.map(inicial => {
            // Buscar si existe configuración cargada para este módulo
            const cargada = configsCargadas.find(c => c && c.id === inicial.id);
            if (cargada) {
              // Para tiposProcesos: merge por id para no perder tipos del default que el backend no tenga (ej: Proceso Penal)
              // Para todo lo demás (estados, mediosControl, etc.): el backend manda, comportamiento original
              const mergeTiposProcesos = (base: TipoProcesoJudicial[] = [], override: TipoProcesoJudicial[] = []): TipoProcesoJudicial[] => {
                const map = new Map(base.map(item => [item.id, item]));
                override.forEach(item => {
                  const baseItem = map.get(item.id);
                  // Si el backend no tiene camposAdicionalesConfig (undefined) pero el default sí, usar el del default
                  // Si el backend tiene [] vacío, es decisión del usuario → respetar
                  if (baseItem && item.camposAdicionalesConfig === undefined && baseItem.camposAdicionalesConfig) {
                    map.set(item.id, { ...item, camposAdicionalesConfig: baseItem.camposAdicionalesConfig });
                  } else {
                    map.set(item.id, item);
                  }
                });
                return Array.from(map.values());
              };
              return {
                ...inicial,
                ...cargada,
                tiposProcesos: mergeTiposProcesos(inicial.tiposProcesos, cargada.tiposProcesos),
              };
            }
            return inicial;
          });

          setConfiguraciones(mergedConfigs);

          // Snapshot loaded tipos so guardarConfiguraciones can detect name/plazo changes later
          const tiposSnapshot: Record<string, { nombre: string; plazo: number }> = {};
          mergedConfigs.forEach(m => m.tiposProcesos?.forEach(tp => { tiposSnapshot[tp.id] = { nombre: tp.nombre, plazo: tp.plazo }; }));
          savedTiposRef.current = tiposSnapshot;

          console.log('✅ Configuraciones mezcladas exitosamente (Backend + Defaults):', mergedConfigs.length);
        } else {
          console.log('⚠️ No se encontraron configuraciones en backend, usando defaults completos.');
          // Snapshot defaults so initial save treats them as baseline
          const tiposSnapshot: Record<string, { nombre: string; plazo: number }> = {};
          configuracionesIniciales.forEach(m => m.tiposProcesos?.forEach(tp => { tiposSnapshot[tp.id] = { nombre: tp.nombre, plazo: tp.plazo }; }));
          savedTiposRef.current = tiposSnapshot;
        }
      } catch (error) {
        console.error('❌ Error general al cargar configuraciones:', error);
        // No mostrar toast de error para no alarmar al usuario en primera carga si falla
        console.warn('Usando configuraciones por defecto debido a error de conexión.');
      }
    };
    loadConfig();

    const ejesGuardados = localStorage.getItem('sigl-ejes-estrategicos');
    if (ejesGuardados) {
      try {
        const parsed = JSON.parse(ejesGuardados);
        setEjesEstrategicos(parsed);
        console.log('✅ Ejes Estratégicos cargados desde localStorage');
      } catch (error) {
        console.error('❌ Error al cargar ejes estratégicos:', error);
      }
    }

    const indicadoresGuardados = localStorage.getItem('sigl-tipos-indicadores');
    if (indicadoresGuardados) {
      try {
        const parsed = JSON.parse(indicadoresGuardados);
        setTiposIndicadores(parsed);
        console.log('✅ Tipos de Indicadores cargados desde localStorage');
      } catch (error) {
        console.error('❌ Error al cargar tipos de indicadores:', error);
      }
    }

    const requerimientosGuardados = localStorage.getItem('sigl-tipos-requerimientos');
    if (requerimientosGuardados) {
      try {
        const parsed = JSON.parse(requerimientosGuardados);
        setTiposRequerimientos(parsed);
        console.log('✅ Tipos de Requerimientos cargados desde localStorage');
      } catch (error) {
        console.error('❌ Error al cargar tipos de requerimientos:', error);
      }
    }

    const organismosGuardados = localStorage.getItem('sigl-organismos-control');
    if (organismosGuardados) {
      try {
        const parsed = JSON.parse(organismosGuardados);
        setOrganismosControl(parsed);
        console.log('✅ Organismos de Control cargados desde localStorage');
      } catch (error) {
        console.error('❌ Error al cargar organismos de control:', error);
      }
    }

    const entesGuardados = localStorage.getItem('sigl-entes-control-pm');
    if (entesGuardados) {
      try {
        const parsed = JSON.parse(entesGuardados);
        setEntesControlPM(parsed);
        console.log('✅ Entes de Control PM cargados desde localStorage');
      } catch (error) {
        console.error('❌ Error al cargar entes de control PM:', error);
      }
    }

    const categoriasDocsGuardadas = localStorage.getItem('sigl-categorias-documentos');
    if (categoriasDocsGuardadas) {
      try {
        const parsed = JSON.parse(categoriasDocsGuardadas);
        setCategoriasDocumentos(parsed);
        console.log('✅ Categorías de Documentos cargadas desde localStorage');
      } catch (error) {
        console.error('❌ Error al cargar categorías de documentos:', error);
      }
    }

    const destinatariosGuardados = localStorage.getItem('sigl-destinatarios-informe');
    if (destinatariosGuardados) {
      try {
        const parsed = JSON.parse(destinatariosGuardados);
        setDestinatariosInforme(parsed);
        console.log('✅ Destinatarios de Informes cargados desde localStorage');
      } catch (error) {
        console.error('❌ Error al cargar destinatarios de informes:', error);
      }
    }
  }, []);

  // Obtener configuración de un módulo específico
  const getConfiguracionModulo = (moduloId: string): ConfiguracionModulo | undefined => {
    return configuraciones.find(m => m.id === moduloId);
  };

  // Obtener solo los estados activos de un módulo
  const getEstadosActivos = (moduloId: string): EstadoKanban[] => {
    const modulo = getConfiguracionModulo(moduloId);
    return modulo?.estados.filter(e => e.activo).sort((a, b) => a.orden - b.orden) || [];
  };

  // Obtener solo los tipos de procesos activos
  const getTiposProcesosActivos = (moduloId: string): TipoProcesoJudicial[] => {
    const modulo = getConfiguracionModulo(moduloId);
    return modulo?.tiposProcesos?.filter(t => t.activo) || [];
  };

  // Obtener solo los tipos de autos activos
  const getTiposAutosActivos = (moduloId: string): TipoAuto[] => {
    const modulo = getConfiguracionModulo(moduloId);
    return modulo?.tiposAutos?.filter(t => t.activo) || [];
  };

  // ✅ Obtener solo los tipos de actuaciones activos
  const getTiposActuacionesActivos = (moduloId: string): TipoActuacion[] => {
    const modulo = getConfiguracionModulo(moduloId);
    return modulo?.tiposActuaciones?.filter(t => t.activo).sort((a, b) => a.orden - b.orden) || [];
  };

  // ✅ Obtener solo los medios de control activos
  const getMediosControlActivos = (moduloId: string): MedioControl[] => {
    const modulo = getConfiguracionModulo(moduloId);
    return modulo?.mediosControl?.filter(t => t.activo).sort((a, b) => a.orden - b.orden) || [];
  };

  // ✅ Obtener solo los tipos de excepciones activos
  const getTiposExcepcionesActivos = (moduloId: string): TipoExcepcionProcesal[] => {
    const modulo = getConfiguracionModulo(moduloId);
    return modulo?.tiposExcepcionesProcesal?.filter(t => t.activo).sort((a, b) => a.orden - b.orden) || [];
  };

  // ✅ Obtener solo las causales específicas activas
  const getCausalesEspecificasActivas = (moduloId: string): CausalEspecifica[] => {
    const modulo = getConfiguracionModulo(moduloId);
    return modulo?.causalesEspecificas?.filter(t => t.activo).sort((a, b) => a.orden - b.orden) || [];
  };

  // ✅ Obtener dependencias activas del módulo
  const getDependenciasActivas = (moduloId: string): Dependencia[] => {
    const modulo = getConfiguracionModulo(moduloId);
    return modulo?.dependencias?.filter(d => d.activo) || [];
  };

  // Obtener solo los ejes estratégicos activos
  const getEjesEstrategicosActivos = (): EjeEstrategico[] => {
    return ejesEstrategicos.filter(e => e.activo).sort((a, b) => a.orden - b.orden);
  };

  // Obtener solo los tipos de indicadores activos
  const getTiposIndicadoresActivos = (): TipoIndicador[] => {
    return tiposIndicadores.filter(e => e.activo).sort((a, b) => a.orden - b.orden);
  };

  // Obtener solo los tipos de requerimientos activos
  // Obtener solo los tipos de requerimientos activos
  const getTiposRequerimientosActivos = (): TipoRequerimiento[] => {
    return tiposRequerimientos.filter(e => e.activo).sort((a, b) => a.orden - b.orden);
  };

  // Obtener solo los organismos de control activos
  const getOrganismosControlActivos = (): OrganismoControl[] => {
    return organismosControl.filter(e => e.activo);
  };

  const getEntesControlPMActivos = (): EnteControlPM[] => {
    return entesControlPM.filter(e => e.activo);
  };

  const getCategoriasDocumentosActivas = (): CategoriaDocumento[] => {
    return categoriasDocumentos.filter(e => e.activo).sort((a, b) => a.orden - b.orden);
  };

  const getDestinatariosInformeActivos = (): DestinatarioInforme[] => {
    return destinatariosInforme.filter(d => d.activo);
  };

  // Actualizar configuraciones
  const actualizarConfiguraciones = (nuevasConfig: ConfiguracionModulo[]) => {
    setConfiguraciones(nuevasConfig);
    setCambiosPendientes(true);
  };

  // Actualizar ejes estratégicos
  const actualizarEjesEstrategicos = (nuevosEjes: EjeEstrategico[]) => {
    setEjesEstrategicos(nuevosEjes);
    setCambiosPendientes(true);
  };

  // Actualizar tipos de indicadores
  const actualizarTiposIndicadores = (nuevosIndicadores: TipoIndicador[]) => {
    setTiposIndicadores(nuevosIndicadores);
    setCambiosPendientes(true);
  };

  // Actualizar tipos de requerimientos
  // Actualizar tipos de requerimientos
  const actualizarTiposRequerimientos = (nuevosRequerimientos: TipoRequerimiento[]) => {
    setTiposRequerimientos(nuevosRequerimientos);
    setCambiosPendientes(true);
  };

  // Actualizar organismos de control
  const actualizarOrganismosControl = (nuevosOrganismos: OrganismoControl[]) => {
    setOrganismosControl(nuevosOrganismos);
    setCambiosPendientes(true);
  };

  const actualizarEntesControlPM = (nuevosEntes: EnteControlPM[]) => {
    setEntesControlPM(nuevosEntes);
    setCambiosPendientes(true);
  };

  const actualizarCategoriasDocumentos = (nuevasCategorias: CategoriaDocumento[]) => {
    setCategoriasDocumentos(nuevasCategorias);
    setCambiosPendientes(true);
  };

  const actualizarDestinatariosInforme = (nuevosDestinatarios: DestinatarioInforme[]) => {
    setDestinatariosInforme(nuevosDestinatarios);
    setCambiosPendientes(true);
  };

  // Guardar configuraciones
  const guardarConfiguraciones = async (silencioso: boolean = false): Promise<void> => {
    try {
      console.log('💾 Guardando configuraciones en backend...');

      // Detectar cambios de nombre y plazo en tiposProcesos
      const nombreCambios: { nombreAnterior: string; nombreNuevo: string }[] = [];
      const plazoCambios: { nombreAnterior: string; deltaDias: number }[] = [];
      configuraciones.forEach(modulo => {
        modulo.tiposProcesos?.forEach(tp => {
          const anterior = savedTiposRef.current[tp.id];
          if (anterior === undefined) return;
          if (anterior.nombre !== tp.nombre) {
            nombreCambios.push({ nombreAnterior: anterior.nombre, nombreNuevo: tp.nombre });
          }
          if (anterior.plazo !== tp.plazo) {
            // Usar el nombre ANTERIOR para encontrar los expedientes en BD
            plazoCambios.push({ nombreAnterior: anterior.nombre, deltaDias: tp.plazo - anterior.plazo });
          }
        });
      });

      // Guardar cada módulo individualmente en el backend
      await Promise.all(
        configuraciones.map(config =>
          legalService.saveConfiguration(config.id, config)
        )
      );

      // Renombrar tipoProceso en expedientes afectados
      if (nombreCambios.length > 0) {
        await Promise.allSettled(
          nombreCambios.map(({ nombreAnterior, nombreNuevo }) =>
            expedienteConfigService.renombrarTipoProceso(nombreAnterior, nombreNuevo)
          )
        );
        console.log(`✏️ Renombrados tipos de proceso en expedientes: ${nombreCambios.map(c => `"${c.nombreAnterior}" → "${c.nombreNuevo}"`).join(', ')}`);
      }

      // Recalcular fechas de vencimiento para expedientes con plazo modificado
      if (plazoCambios.length > 0) {
        const resultados = await Promise.allSettled(
          plazoCambios.map(({ nombreAnterior, deltaDias }) =>
            expedienteConfigService.recalcularPlazosPorTipoProceso(nombreAnterior, deltaDias)
          )
        );
        const totalActualizados = resultados.reduce((sum, r) => {
          return sum + (r.status === 'fulfilled' ? (r.value?.updated ?? 0) : 0);
        }, 0);
        if (totalActualizados > 0) {
          console.log(`🔄 Recalculados ${totalActualizados} expedientes por cambio de plazos`);
        }
      }

      // Actualizar snapshot con estado actual
      const nuevoSnapshot: Record<string, { nombre: string; plazo: number }> = {};
      configuraciones.forEach(m => m.tiposProcesos?.forEach(tp => { nuevoSnapshot[tp.id] = { nombre: tp.nombre, plazo: tp.plazo }; }));
      savedTiposRef.current = nuevoSnapshot;

      // Sincronizar organismos de control al backend
      try {
        await ocService.syncOrganismosControl(
          organismosControl.map(o => ({
            ...o,
            correos: o.correos ?? [],
          }))
        );
      } catch (err) {
        console.warn('⚠️ No se pudo sincronizar organismos al backend:', err);
      }

      // Guardar en localStorage como backup
      localStorage.setItem('sigl-configuraciones', JSON.stringify(configuraciones));

      localStorage.setItem('sigl-ejes-estrategicos', JSON.stringify(ejesEstrategicos));
      localStorage.setItem('sigl-tipos-indicadores', JSON.stringify(tiposIndicadores));
      localStorage.setItem('sigl-tipos-requerimientos', JSON.stringify(tiposRequerimientos));
      localStorage.setItem('sigl-organismos-control', JSON.stringify(organismosControl));
      localStorage.setItem('sigl-entes-control-pm', JSON.stringify(entesControlPM));
      localStorage.setItem('sigl-categorias-documentos', JSON.stringify(categoriasDocumentos));
      localStorage.setItem('sigl-destinatarios-informe', JSON.stringify(destinatariosInforme));

      setCambiosPendientes(false);
      
      if (!silencioso) {
        toast.success('Configuraciones guardadas correctamente', {
          description: 'Los cambios se han aplicado a todos los módulos',
          duration: 3000
        });
      }

      console.log('✅ Configuraciones sincronizadas con servidor');
    } catch (error) {
      console.error('❌ Error al guardar configuraciones:', error);
      if (!silencioso) {
        toast.error('Error al guardar configuraciones en el servidor');
      }
      throw error;
    }
  };

  // Guardado automático debil de cambios con debouncing
  useEffect(() => {
    if (!cambiosPendientes) return;

    setSavingStatus('saving');

    const timer = setTimeout(async () => {
      try {
        console.log('🔄 Iniciando guardado automático...');
        await guardarConfiguraciones(true);
        setSavingStatus('saved');
      } catch (err) {
        console.error('❌ Error en guardado automático:', err);
        setSavingStatus('error');
      }
    }, 1500); // 1.5s debounce

    return () => clearTimeout(timer);
  }, [configuraciones, ejesEstrategicos, tiposIndicadores, tiposRequerimientos, organismosControl, entesControlPM, destinatariosInforme]);

  // Limpiar estado 'saved' / 'error' de vuelta a 'idle' después de unos segundos
  useEffect(() => {
    if (savingStatus === 'saved' || savingStatus === 'error') {
      const timer = setTimeout(() => {
        setSavingStatus('idle');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [savingStatus]);

  // Restablecer a valores por defecto
  const restablecerDefecto = () => {
    setConfiguraciones(configuracionesIniciales);
    setEjesEstrategicos(ejesEstrategicosIniciales);
    setTiposIndicadores(tiposIndicadoresIniciales);
    setTiposRequerimientos(tiposRequerimientosIniciales);
    setOrganismosControl(organismosControlIniciales);
    setEntesControlPM(entesControlPMIniciales);
    setCategoriasDocumentos(categoriasDocumentosIniciales);
    setDestinatariosInforme(destinatariosInformeIniciales);

    localStorage.removeItem('sigl-configuraciones');
    localStorage.removeItem('sigl-ejes-estrategicos');
    localStorage.removeItem('sigl-tipos-indicadores');
    localStorage.removeItem('sigl-tipos-requerimientos');
    localStorage.removeItem('sigl-organismos-control');
    localStorage.removeItem('sigl-entes-control-pm');
    localStorage.removeItem('sigl-categorias-documentos');
    localStorage.removeItem('sigl-destinatarios-informe');

    setCambiosPendientes(false);
    toast.success('Configuraciones restablecidas', {
      description: 'Se han restaurado los valores por defecto',
      duration: 3000
    });
  };

  const value: ConfiguracionesSIGLContextType = {
    configuraciones,
    ejesEstrategicos,
    tiposIndicadores,
    tiposRequerimientos,
    organismosControl,
    entesControlPM,
    categoriasDocumentos,
    destinatariosInforme,
    cambiosPendientes,
    getConfiguracionModulo,
    getEstadosActivos,
    getTiposProcesosActivos,
    getTiposAutosActivos,
    getTiposActuacionesActivos,
    getMediosControlActivos,
    getTiposExcepcionesActivos,
    getCausalesEspecificasActivas,
    getDependenciasActivas,
    getEjesEstrategicosActivos,
    getTiposIndicadoresActivos,
    getTiposRequerimientosActivos,
    getOrganismosControlActivos,
    getEntesControlPMActivos,
    getCategoriasDocumentosActivas,
    getDestinatariosInformeActivos,
    actualizarConfiguraciones,
    actualizarEjesEstrategicos,
    actualizarTiposIndicadores,
    actualizarTiposRequerimientos,
    actualizarOrganismosControl,
    actualizarEntesControlPM,
    actualizarCategoriasDocumentos,
    actualizarDestinatariosInforme,
    guardarConfiguraciones,
    restablecerDefecto,
    setCambiosPendientes,
    savingStatus,
  };

  return (
    <ConfiguracionesSIGLContext.Provider value={value}>
      {children}
    </ConfiguracionesSIGLContext.Provider>
  );
}

// ============ HOOK PERSONALIZADO ============

export function useConfiguracionesSIGL() {
  const context = useContext(ConfiguracionesSIGLContext);
  // Debug log
  if (context === undefined) {
    console.error('❌ useConfiguracionesSIGL: Context is undefined. Provider missing or module mismatch?');
  }
  if (context === undefined) {
    throw new Error('useConfiguracionesSIGL debe ser usado dentro de ConfiguracionesSIGLProvider');
  }
  return context;
}

// ============ HOOK PARA MÓDULO ESPECÍFICO ============

export function useConfiguracionModulo(moduloId: string) {
  const { getConfiguracionModulo, getEstadosActivos, getTiposProcesosActivos, getTiposAutosActivos, getTiposActuacionesActivos, getMediosControlActivos, getTiposExcepcionesActivos, getCausalesEspecificasActivas, getDependenciasActivas } = useConfiguracionesSIGL();

  return {
    configuracion: getConfiguracionModulo(moduloId),
    estadosActivos: getEstadosActivos(moduloId),
    tiposProcesosActivos: getTiposProcesosActivos(moduloId),
    tiempos: getConfiguracionModulo(moduloId)?.tiempos || [],
    tiposAutosActivos: getTiposAutosActivos(moduloId),
    tiposActuacionesActivos: getTiposActuacionesActivos(moduloId),
    mediosControlActivos: getMediosControlActivos(moduloId),
    tiposExcepcionesActivos: getTiposExcepcionesActivos(moduloId),
    causalesEspecificasActivas: getCausalesEspecificasActivas(moduloId),
    dependenciasActivas: getDependenciasActivas(moduloId),
  };
}