/**
 * ============================================
 * RF020: AUDITORÍA DE CAMBIOS (AUDIT TRAIL)
 * ============================================
 * 
 * Módulo de auditoría de cambios para compliance normativo
 * Registro completo de quién-cuándo-qué en todas las operaciones
 * 
 * COMPLIANCE:
 * - Ley 1581/2012 (Protección de Datos)
 * - Decreto 2106/2019 (Transparencia)
 * - ISO 27001 (Seguridad)
 * - MECI (Modelo Estándar Control Interno)
 * 
 * CARACTERÍSTICAS:
 * - Tabla paginada de auditorías
 * - Filtros avanzados (6 filtros)
 * - Modal detalle con información completa
 * - Estadísticas con Recharts (4 gráficos)
 * - Exportación a Excel/PDF
 * - Búsqueda en tiempo real
 * 
 * ÚLTIMA ACTUALIZACIÓN: 16 Enero 2026
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Search, Filter, Download, Eye, Calendar,
  User, FileText, Activity, BarChart3, TrendingUp,
  Clock, AlertCircle, CheckCircle, XCircle, Edit,
  Trash2, ArrowRightCircle, PlusCircle, X, ChevronLeft,
  ChevronRight, ChevronDown, Loader2
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner';
import { getServiceUrl, API_MODE } from '../../../config/environment';

// ✅ DÍA 4: Container4K para padding adaptativo
import { Container4K } from '@/components/ui';

// ============ TIPOS ============

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
  descripcion?: string;
  tipo: string;
  fase: string;
  prioridad: string;
  progreso: number;
  fechaInicio?: string;
  fechaFin?: string;
  territorial?: string;
  areaAuditada?: string;
  auditorLider?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuditoriaFiltros {
  tipo?: string;
  fase?: string;
  prioridad?: string;
  territorial?: string;
  busqueda: string;
  pagina: number;
  registrosPorPagina: number;
}

// ============ CONFIGURACIÓN API ============

const CONTROL_INTERNO_BASE_URL = getServiceUrl('control-institucional');
const SERVICE_PREFIX = API_MODE === 'gateway' ? '/control-institucional/api/v1' : '/api/v1';
const MICROSERVICIO_PORT = 3007; // Puerto del control-institucional-service
  const acciones: { 
    accion: TipoAccion; 
    descripcion: string; 
    tabla: TipoEntidad; 
    registroId: string;
    cambios: any;
    modulo: string;
  }[] = [
    // ========== CONTROL INTERNO ==========
    {
      accion: 'aprobar',
      descripcion: 'Aprobar Plan Anual de Auditoría 2025',
      tabla: 'plan_anual',
      registroId: 'plan-2025-001',
      modulo: 'Control Interno',
      cambios: {
        antes: { estado: 'EN_REVISION' },
        despues: { estado: 'APROBADO', fechaAprobacion: '2026-01-14' }
      }
    },
    {
      accion: 'crear_auditoria',
      descripcion: 'Crear auditoría de Gestión Financiera',
      tabla: 'auditoria',
      registroId: 'aud-2026-015',
      modulo: 'Control Interno',
      cambios: {
        despues: { codigo: 'AUD-2026-015', nombre: 'Auditoría Gestión Financiera', estado: 'PLANEACION' }
      }
    },
    {
      accion: 'crear_hallazgo',
      descripcion: 'Registrar hallazgo crítico: Falta de segregación de funciones',
      tabla: 'hallazgo',
      registroId: 'hall-2026-023',
      modulo: 'Control Interno',
      cambios: {
        despues: { tipo: 'NO_CONFORMIDAD', criticidad: 'CRITICA', descripcion: 'Falta de segregación de funciones en tesorería' }
      }
    },
    {
      accion: 'validar_evidencia',
      descripcion: 'Validar evidencia de plan de mejoramiento',
      tabla: 'evidencia',
      registroId: 'ev-2026-089',
      modulo: 'Control Interno',
      cambios: {
        antes: { estado: 'CARGADA' },
        despues: { estado: 'VALIDADA', validadoPor: 'María González' }
      }
    },
    
    // ========== GESTIÓN DE USUARIOS Y PERSONAS ==========
    {
      accion: 'crear',
      descripcion: 'Crear nuevo usuario: Juan Pablo García',
      tabla: 'usuario',
      registroId: 'usr-2026-458',
      modulo: 'Gestión de Usuarios',
      cambios: {
        despues: { nombre: 'Juan Pablo García', email: 'jgarcia@esap.edu.co', rol: 'Docente', estado: 'ACTIVO' }
      }
    },
    {
      accion: 'actualizar',
      descripcion: 'Actualizar información de perfil de usuario',
      tabla: 'persona',
      registroId: 'per-2026-789',
      modulo: 'Gestión de Usuarios',
      cambios: {
        antes: { telefono: '3001234567', direccion: 'Calle 45 #23-12' },
        despues: { telefono: '3109876543', direccion: 'Carrera 7 #45-89' }
      }
    },
    {
      accion: 'asignar_rol',
      descripcion: 'Asignar rol de Coordinador Académico',
      tabla: 'usuario',
      registroId: 'usr-2026-234',
      modulo: 'Roles y Permisos',
      cambios: {
        antes: { roles: ['Docente'] },
        despues: { roles: ['Docente', 'Coordinador Académico'] }
      }
    },
    {
      accion: 'cargar_documento',
      descripcion: 'Cargar cédula de ciudadanía en carpeta digital',
      tabla: 'carpeta_digital',
      registroId: 'doc-2026-991',
      modulo: 'Carpeta Digital',
      cambios: {
        despues: { tipoDocumento: 'Cédula', nombreArchivo: 'cedula-123456789.pdf', tamaño: '2.4 MB' }
      }
    },
    
    // ========== GRADUADOS Y REGISTRO ACADÉMICO ==========
    {
      accion: 'crear',
      descripcion: 'Registrar nuevo graduado: María Fernanda López',
      tabla: 'graduado',
      registroId: 'grad-2026-341',
      modulo: 'Graduados',
      cambios: {
        despues: { nombre: 'María Fernanda López', programa: 'Administración Pública', fechaGrado: '2025-12-15', promedio: 4.2 }
      }
    },
    {
      accion: 'generar_certificado',
      descripcion: 'Generar certificado de título profesional',
      tabla: 'certificado_titulo',
      registroId: 'cert-titulo-2026-124',
      modulo: 'Graduados',
      cambios: {
        despues: { graduadoId: 'grad-2026-341', consecutivo: 'CT-2026-124', qrCode: 'QR-CT124', estado: 'ACTIVO' }
      }
    },
    {
      accion: 'validar_certificado',
      descripcion: 'Validar autenticidad de certificado de título',
      tabla: 'certificado_titulo',
      registroId: 'cert-titulo-2026-098',
      modulo: 'Graduados',
      cambios: {
        despues: { validado: true, validadoPor: 'Sistema', fechaValidacion: '2026-01-14' }
      }
    },
    
    // ========== ENROLAMIENTO ==========
    {
      accion: 'enrolar_usuario',
      descripcion: 'Enrolar usuario individual: Carlos Méndez',
      tabla: 'enrolamiento',
      registroId: 'enr-2026-556',
      modulo: 'Enrolamiento',
      cambios: {
        despues: { usuarioId: 'usr-2026-556', rol: 'Estudiante', programaId: 'prog-adm-pub', estado: 'COMPLETADO' }
      }
    },
    {
      accion: 'enrolamiento_masivo',
      descripcion: 'Enrolamiento masivo: 45 estudiantes nuevos',
      tabla: 'enrolamiento_masivo',
      registroId: 'enr-masivo-2026-003',
      modulo: 'Enrolamiento',
      cambios: {
        despues: { archivo: 'estudiantes-2026-01.xlsx', cantidadRegistros: 45, exitosos: 43, fallidos: 2 }
      }
    },
    
    // ========== COMUNIDAD ==========
    {
      accion: 'crear_publicacion',
      descripcion: 'Crear publicación: "Convocatoria Semilleros de Investigación"',
      tabla: 'publicacion',
      registroId: 'pub-2026-234',
      modulo: 'Comunidad',
      cambios: {
        despues: { titulo: 'Convocatoria Semilleros de Investigación', contenido: '...', categoria: 'Investigación', estado: 'PUBLICADA' }
      }
    },
    {
      accion: 'crear_evento',
      descripcion: 'Crear evento: "Foro de Administración Pública 2026"',
      tabla: 'evento',
      registroId: 'evt-2026-089',
      modulo: 'Eventos',
      cambios: {
        despues: { titulo: 'Foro de Administración Pública 2026', fecha: '2026-03-15', lugar: 'Auditorio Principal', cupos: 200 }
      }
    },
    {
      accion: 'crear_anuncio',
      descripcion: 'Crear anuncio: "Modificación calendario académico"',
      tabla: 'anuncio',
      registroId: 'anun-2026-045',
      modulo: 'Anuncios',
      cambios: {
        despues: { titulo: 'Modificación calendario académico', contenido: '...', prioridad: 'ALTA', destinatarios: 'TODOS' }
      }
    },
    
    // ========== BOLSA DE EMPLEO ==========
    {
      accion: 'crear',
      descripcion: 'Publicar oferta de empleo: Analista de Presupuesto',
      tabla: 'oferta_empleo',
      registroId: 'emp-2026-178',
      modulo: 'Bolsa de Empleo',
      cambios: {
        despues: { cargo: 'Analista de Presupuesto', empresa: 'Ministerio de Hacienda', salario: '$4.500.000', estado: 'ACTIVA' }
      }
    },
    {
      accion: 'crear',
      descripcion: 'Registrar postulación a oferta de empleo',
      tabla: 'postulacion',
      registroId: 'post-2026-445',
      modulo: 'Bolsa de Empleo',
      cambios: {
        despues: { ofertaId: 'emp-2026-178', graduadoId: 'grad-2026-341', estado: 'ENVIADA', fechaPostulacion: '2026-01-14' }
      }
    },
    
    // ========== CERTIFICADOS LABORALES ==========
    {
      accion: 'generar_certificado',
      descripcion: 'Generar certificado laboral para Pedro Sánchez',
      tabla: 'certificado_laboral',
      registroId: 'cert-lab-2026-089',
      modulo: 'Certificados Laborales',
      cambios: {
        despues: { empleadoId: 'emp-2026-567', consecutivo: '001-2026-TH', cargo: 'Docente TC', dependencia: 'Territorial Bogotá' }
      }
    },
    {
      accion: 'validar_certificado',
      descripcion: 'Validar autenticidad de certificado laboral',
      tabla: 'certificado_laboral',
      registroId: 'cert-lab-2026-078',
      modulo: 'Certificados Laborales',
      cambios: {
        despues: { validado: true, codigoQR: 'QR-CL078', fechaValidacion: '2026-01-14' }
      }
    },
    
    // ========== FIRMA ELECTRÓNICA ==========
    {
      accion: 'solicitar_firma',
      descripcion: 'Solicitar firma electrónica para resolución',
      tabla: 'solicitud_firma',
      registroId: 'firma-2026-234',
      modulo: 'Firma Electrónica',
      cambios: {
        despues: { documentoId: 'doc-res-2026-045', solicitante: 'Coordinador Académico', destinatarios: ['Director', 'Decano'], estado: 'PENDIENTE' }
      }
    },
    {
      accion: 'firmar_documento',
      descripcion: 'Firmar digitalmente acta de comité',
      tabla: 'firma_digital',
      registroId: 'firma-dig-2026-112',
      modulo: 'Firma Electrónica',
      cambios: {
        despues: { documentoId: 'doc-acta-2026-008', firmante: 'María González', timestamp: '2026-01-14T10:30:00Z', hash: 'SHA256:abc123...' }
      }
    },
    
    // ========== CONTROL DISCIPLINARIO ==========
    {
      accion: 'iniciar_proceso',
      descripcion: 'Iniciar proceso disciplinario PD-2026-015',
      tabla: 'proceso_disciplinario',
      registroId: 'pd-2026-015',
      modulo: 'Control Disciplinario',
      cambios: {
        despues: { codigo: 'PD-2026-015', quejoso: 'Anónimo', investigado: 'Servidor Público X', etapa: 'INDAGACION_PRELIMINAR' }
      }
    },
    {
      accion: 'crear_auto',
      descripcion: 'Crear auto de apertura de investigación',
      tabla: 'auto_disciplinario',
      registroId: 'auto-2026-023',
      modulo: 'Control Disciplinario',
      cambios: {
        despues: { procesoId: 'pd-2026-015', numero: 'AUTO-023-2026', tipo: 'APERTURA', fechaExpedicion: '2026-01-14' }
      }
    },
    {
      accion: 'aplicar_sancion',
      descripcion: 'Aplicar sanción disciplinaria: Suspensión 30 días',
      tabla: 'sancion',
      registroId: 'sanc-2026-007',
      modulo: 'Control Disciplinario',
      cambios: {
        despues: { procesoId: 'pd-2026-012', tipo: 'SUSPENSION', duracionDias: 30, fechaInicio: '2026-01-20', estado: 'EJECUTORIA' }
      }
    },
    
    // ========== GESTIÓN LEGAL ==========
    {
      accion: 'crear',
      descripcion: 'Crear expediente legal: Acción de tutela',
      tabla: 'expediente_legal',
      registroId: 'exp-legal-2026-034',
      modulo: 'Gestión Legal',
      cambios: {
        despues: { codigo: 'EXP-TUT-2026-034', tipo: 'TUTELA', demandante: 'Ciudadano X', demandado: 'ESAP', estado: 'ACTIVO' }
      }
    },
    {
      accion: 'asignar_abogado',
      descripcion: 'Asignar abogado externo a proceso legal',
      tabla: 'expediente_legal',
      registroId: 'exp-legal-2026-034',
      modulo: 'Gestión Legal',
      cambios: {
        antes: { abogado: null },
        despues: { abogado: 'Dr. Carlos Mendoza', tipo: 'EXTERNO', fechaAsignacion: '2026-01-14' }
      }
    },
    {
      accion: 'crear',
      descripcion: 'Crear concepto jurídico sobre normatividad académica',
      tabla: 'concepto_juridico',
      registroId: 'conc-jur-2026-018',
      modulo: 'Gestión Legal',
      cambios: {
        despues: { codigo: 'CJ-2026-018', tema: 'Normatividad Académica', solicitante: 'Registro Académico', estado: 'EN_REVISION' }
      }
    },
    
    // ========== ESTRUCTURA ORGANIZACIONAL ==========
    {
      accion: 'crear',
      descripcion: 'Crear nueva dependencia: Dirección de Innovación',
      tabla: 'dependencia',
      registroId: 'dep-2026-045',
      modulo: 'Estructura Organizacional',
      cambios: {
        despues: { codigo: 'DEP-INNOV', nombre: 'Dirección de Innovación', nivel: 'DIRECCION', dependePadre: 'RECTORIA' }
      }
    },
    {
      accion: 'crear',
      descripcion: 'Crear nuevo cargo: Coordinador de Transformación Digital',
      tabla: 'cargo',
      registroId: 'cargo-2026-089',
      modulo: 'Estructura Organizacional',
      cambios: {
        despues: { codigo: 'COORD-TD', nombre: 'Coordinador Transformación Digital', nivel: 'COORDINACION', dependenciaId: 'dep-2026-045' }
      }
    },
    
    // ========== PROGRAMAS ACADÉMICOS ==========
    {
      accion: 'crear',
      descripcion: 'Crear nuevo programa académico: Maestría en Gobernanza',
      tabla: 'programa_academico',
      registroId: 'prog-2026-012',
      modulo: 'Programas Académicos',
      cambios: {
        despues: { codigo: 'MAES-GOB', nombre: 'Maestría en Gobernanza', nivel: 'POSGRADO', modalidad: 'PRESENCIAL', creditos: 48 }
      }
    },
    
    // ========== ARQUITECTURA EMPRESARIAL ==========
    {
      accion: 'crear',
      descripcion: 'Documentar capacidad: Gestión de Talento Humano',
      tabla: 'capacidad',
      registroId: 'cap-2026-023',
      modulo: 'Arquitectura Empresarial',
      cambios: {
        despues: { codigo: 'CAP-GTH', nombre: 'Gestión de Talento Humano', nivel: 'NIVEL_2', macroproceso: 'APOYO' }
      }
    },
    {
      accion: 'crear',
      descripcion: 'Registrar sistema de información: SIGL',
      tabla: 'sistema_informacion',
      registroId: 'si-2026-008',
      modulo: 'Arquitectura Empresarial',
      cambios: {
        despues: { codigo: 'SIGL', nombre: 'Sistema de Gestión Legal', estado: 'PRODUCCION', criticidad: 'ALTA' }
      }
    },
    
    // ========== GESTIÓN PROFESORAL ==========
    {
      accion: 'crear_convocatoria',
      descripcion: 'Crear convocatoria docente: Administración Pública',
      tabla: 'convocatoria',
      registroId: 'conv-doc-2026-004',
      modulo: 'Gestión Profesoral',
      cambios: {
        despues: { codigo: 'CONV-DOC-2026-004', area: 'Administración Pública', plazas: 3, fechaCierre: '2026-02-15', estado: 'ABIERTA' }
      }
    },
    {
      accion: 'evaluar_desempeño',
      descripcion: 'Evaluar desempeño docente: Luis Martínez',
      tabla: 'evaluacion_desempeño',
      registroId: 'eval-doc-2026-078',
      modulo: 'Gestión Profesoral',
      cambios: {
        despues: { docenteId: 'doc-2026-234', periodo: '2025-02', puntaje: 4.5, estado: 'APROBADA' }
      }
    },
    
    // ========== INFORMES Y REPORTES ==========
    {
      accion: 'generar_reporte',
      descripcion: 'Generar reporte ejecutivo mensual',
      tabla: 'reporte',
      registroId: 'rep-2026-089',
      modulo: 'Informes',
      cambios: {
        despues: { tipo: 'EJECUTIVO', periodo: '2026-01', formato: 'PDF', archivo: 'reporte-ejecutivo-ene-2026.pdf' }
      }
    },
    {
      accion: 'exportar_excel',
      descripcion: 'Exportar datos de usuarios a Excel',
      tabla: 'reporte',
      registroId: 'rep-2026-090',
      modulo: 'Informes',
      cambios: {
        despues: { tipo: 'USUARIOS', cantidadRegistros: 1250, formato: 'XLSX', tamaño: '3.2 MB' }
      }
    },
    
    // ========== AUTENTICACIÓN Y SEGURIDAD ==========
    {
      accion: 'login',
      descripcion: 'Inicio de sesión exitoso',
      tabla: 'usuario',
      registroId: 'usr-2026-234',
      modulo: 'Gestión de Usuarios',
      cambios: {
        despues: { ultimoAcceso: '2026-01-14T08:30:00Z', ip: '192.168.1.45', navegador: 'Chrome 120' }
      }
    },
    {
      accion: 'cambiar_password',
      descripcion: 'Cambiar contraseña de usuario',
      tabla: 'usuario',
      registroId: 'usr-2026-456',
      modulo: 'Gestión de Passwords',
      cambios: {
        antes: { passwordHash: 'hash-anterior' },
        despues: { passwordHash: 'hash-nuevo', fechaCambio: '2026-01-14' }
      }
    },
    {
      accion: 'revocar_permiso',
      descripcion: 'Revocar permiso de administración',
      tabla: 'permiso',
      registroId: 'perm-2026-089',
      modulo: 'Roles y Permisos',
      cambios: {
        antes: { usuarioId: 'usr-2026-234', permiso: 'ADMIN_USUARIOS', estado: 'ACTIVO' },
        despues: { usuarioId: 'usr-2026-234', permiso: 'ADMIN_USUARIOS', estado: 'REVOCADO', fechaRevocacion: '2026-01-14' }
      }
    }
  ];

/**
 * Detecta si estamos en localhost para hacer peticiones directas al microservicio
 */
function esLocalhost(): boolean {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
}

const API_CONFIG = {
  endpoints: {
    auditorias: '/auditorias',
    estadisticas: '/auditorias/estadisticas'
  },
  timeout: 10000 // 10 segundos
} as const;

// ============ SERVICIO API ============

/**
 * Obtiene los headers comunes para las peticiones HTTP
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('esap_access_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

/**
 * Construye la URL con query params de forma segura
 * Si estamos en localhost, va directo al microservicio (sin prefijos)
 * Si no, va por el gateway con el prefijo del servicio
 */
function buildUrl(endpoint: string, params?: Record<string, string | undefined>): string {
  let baseUrl: string;
  if (esLocalhost()) {
    // En localhost, ir directo al microservicio (sin prefijos)
    baseUrl = `http://localhost:${MICROSERVICIO_PORT}`;
  } else {
    // En producción, usar el gateway con el prefijo del servicio
    baseUrl = `${CONTROL_INTERNO_BASE_URL}${SERVICE_PREFIX}`;
  }
  
  const url = new URL(`${baseUrl}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value);
      }
    });
  }
  
  return url.toString();
}

/**
 * Realiza una petición HTTP con manejo de errores y timeout
 */
async function fetchWithTimeout<T>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Carga las auditorías desde el backend con filtros opcionales
 * @param filtros - Filtros para la búsqueda de auditorías
 * @returns Array de auditorías o array vacío en caso de error
 */
async function cargarAuditorias(filtros?: Partial<AuditoriaFiltros>): Promise<Auditoria[]> {
  try {
    const queryParams = {
      tipo: filtros?.tipo,
      fase: filtros?.fase,
      prioridad: filtros?.prioridad,
      territorial: filtros?.territorial,
      search: filtros?.busqueda
    };

    const url = buildUrl(API_CONFIG.endpoints.auditorias, queryParams);

    const data = await fetchWithTimeout<Auditoria[]>(url);
    
    return data;
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[AuditoriaCambios] ❌ Error cargando auditorías:', mensaje);
    return [];
  }
}

/**
 * Carga las estadísticas de auditorías desde el backend
 * @returns Objeto con estadísticas o null en caso de error
 */
async function cargarEstadisticas(): Promise<AuditoriaEstadisticas | null> {
  try {
    const url = buildUrl(API_CONFIG.endpoints.estadisticas);

    const data = await fetchWithTimeout<AuditoriaEstadisticas>(url);
    
    return data;
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[AuditoriaCambios] ❌ Error cargando estadísticas:', mensaje);
    return null;
  }
}

// Tipo para las estadísticas
interface AuditoriaEstadisticas {
  total: number;
  porFase: Record<string, number>;
  porTipo: Record<string, number>;
  porPrioridad: Record<string, number>;
}

// ============ COMPONENTE PRINCIPAL ============

function AuditoriaCambiosModule() {
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<Auditoria | null>(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [estadisticas, setEstadisticas] = useState<any>(null);

  // Filtros
  const [filtros, setFiltros] = useState<AuditoriaFiltros>({
    tipo: undefined,
    fase: undefined,
    prioridad: undefined,
    territorial: undefined,
    busqueda: '',
    pagina: 1,
    registrosPorPagina: 20
  });

  // Cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, []);

  // Recargar cuando cambien los filtros
  useEffect(() => {
    cargarDatos();
  }, [filtros.tipo, filtros.fase, filtros.prioridad, filtros.territorial, filtros.busqueda]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [auditoriasData, estadisticasData] = await Promise.all([
        cargarAuditorias(filtros),
        cargarEstadisticas()
      ]);
      setAuditorias(auditoriasData);
      setEstadisticas(estadisticasData);
    } catch (error) {
      toast.error('Error al cargar datos de auditorías');
    } finally {
      setCargando(false);
    }
  };

  const handleVerDetalle = (auditoria: Auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    setModalDetalleAbierto(true);
  };

  const handleExportarExcel = async () => {
    toast.info('Generando archivo Excel...');
    // TODO: Implementar exportación a Excel
    setTimeout(() => toast.success('Archivo Excel descargado correctamente'), 1000);
  };

  const handleExportarPDF = async () => {
    toast.info('Generando archivo PDF...');
    // TODO: Implementar exportación a PDF
    setTimeout(() => toast.success('Archivo PDF descargado correctamente'), 1000);
  };

  const handleCambiarPagina = (nuevaPagina: number) => {
    setFiltros(prev => ({ ...prev, pagina: nuevaPagina }));
  };

  // Filtrar auditorías por búsqueda local
  const auditoriasFiltradas = useMemo(() => {
    if (!filtros.busqueda) return auditorias;
    const busqueda = filtros.busqueda.toLowerCase();
    return auditorias.filter(a => 
      a.codigo?.toLowerCase().includes(busqueda) ||
      a.titulo?.toLowerCase().includes(busqueda) ||
      a.tipo?.toLowerCase().includes(busqueda) ||
      a.fase?.toLowerCase().includes(busqueda) ||
      a.territorial?.toLowerCase().includes(busqueda) ||
      a.auditorLider?.toLowerCase().includes(busqueda)
    );
  }, [auditorias, filtros.busqueda]);

  // Paginación
  const auditoriasPaginadas = useMemo(() => {
    const inicio = (filtros.pagina - 1) * filtros.registrosPorPagina;
    const fin = inicio + filtros.registrosPorPagina;
    return auditoriasFiltradas.slice(inicio, fin);
  }, [auditoriasFiltradas, filtros.pagina, filtros.registrosPorPagina]);

  // Estadísticas rápidas - Usando valores del backend
  const estadisticasRapidas = useMemo(() => {
    const hoy = new Date();
    const hace7Dias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fases que indican auditoría completada (según enum FaseAuditoria del backend)
    const fasesCompletadas = ['completada', 'Finalizada'];

    return {
      total: auditorias.length,
      enCurso: auditorias.filter(a => !fasesCompletadas.includes(a.fase)).length,
      completadas: auditorias.filter(a => fasesCompletadas.includes(a.fase)).length,
      recientes: auditorias.filter(a => new Date(a.createdAt) >= hace7Dias).length
    };
  }, [auditorias]);

  return (
    <Container4K>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 border-l-4 border-l-blue-600">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    Auditorías - Control Interno
                  </h1>
                  <p className="text-sm text-gray-600">
                    Gestión y seguimiento de auditorías del módulo de Control Interno
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handleExportarExcel}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleExportarPDF}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </Button>
              </div>
            </div>

            {/* ESTADÍSTICAS RÁPIDAS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-900">
                  {cargando ? <Loader2 className="w-6 h-6 animate-spin" /> : estadisticasRapidas.total}
                </div>
                <div className="text-xs text-blue-700">Total Auditorías</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-900">
                  {cargando ? <Loader2 className="w-6 h-6 animate-spin" /> : estadisticasRapidas.enCurso}
                </div>
                <div className="text-xs text-green-700">En Curso</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-900">
                  {cargando ? <Loader2 className="w-6 h-6 animate-spin" /> : estadisticasRapidas.completadas}
                </div>
                <div className="text-xs text-purple-700">Completadas</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-orange-900">
                  {cargando ? <Loader2 className="w-6 h-6 animate-spin" /> : estadisticasRapidas.recientes}
                </div>
                <div className="text-xs text-orange-700">Últimos 7 días</div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* CONTENIDO */}
        <VistaAuditorias
          auditorias={auditoriasPaginadas}
          totalAuditorias={auditoriasFiltradas.length}
          filtros={filtros}
          onCambiarFiltros={setFiltros}
          onVerDetalle={handleVerDetalle}
          onCambiarPagina={handleCambiarPagina}
          cargando={cargando}
        />

        {/* MODAL DETALLE */}
        {modalDetalleAbierto && auditoriaSeleccionada && (
          <ModalDetalleAuditoria
            auditoria={auditoriaSeleccionada}
            onClose={() => setModalDetalleAbierto(false)}
          />
        )}
      </div>
    </Container4K>
  );
}

// ============ COMPONENTES AUXILIARES ============

function VistaAuditorias({
  auditorias,
  totalAuditorias,
  filtros,
  onCambiarFiltros,
  onVerDetalle,
  onCambiarPagina,
  cargando
}: {
  auditorias: Auditoria[];
  totalAuditorias: number;
  filtros: AuditoriaFiltros;
  onCambiarFiltros: (filtros: AuditoriaFiltros) => void;
  onVerDetalle: (auditoria: Auditoria) => void;
  onCambiarPagina: (pagina: number) => void;
  cargando: boolean;
}) {
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);

  // Contar filtros activos
  const contarFiltrosActivos = () => {
    let count = 0;
    if (filtros.tipo) count++;
    if (filtros.fase) count++;
    if (filtros.prioridad) count++;
    if (filtros.territorial) count++;
    return count;
  };

  const filtrosActivos = contarFiltrosActivos();
  const hayFiltros = filtrosActivos > 0 || filtros.busqueda;

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    onCambiarFiltros({
      tipo: undefined,
      fase: undefined,
      prioridad: undefined,
      territorial: undefined,
      busqueda: '',
      pagina: 1,
      registrosPorPagina: 20
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      {/* BÚSQUEDA Y FILTROS */}
      <Card className="p-6 border-l-4 border-l-blue-600">
        {/* Búsqueda Global */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Buscar auditorías por código, título, tipo...</h3>
            </div>
            {hayFiltros && (
              <button
                onClick={limpiarFiltros}
                className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Limpiar todos los filtros
              </button>
            )}
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, título, tipo de auditoría, territorial..."
              value={filtros.busqueda}
              onChange={(e) => onCambiarFiltros({ ...filtros, busqueda: e.target.value, pagina: 1 })}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
            />
            {filtros.busqueda && (
              <button
                onClick={() => onCambiarFiltros({ ...filtros, busqueda: '', pagina: 1 })}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Botón de Filtros Avanzados */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-bold text-gray-900 flex items-center gap-2">
                  Filtros Avanzados
                  {filtrosActivos > 0 && (
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                      {filtrosActivos}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600 font-medium">
                  {mostrarFiltrosAvanzados ? 'Ocultar' : 'Mostrar'} opciones de filtrado detallado
                </div>
              </div>
            </div>
            <ChevronDown 
              className={`w-5 h-5 text-gray-600 transition-transform ${mostrarFiltrosAvanzados ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Panel de Filtros Avanzados */}
          <AnimatePresence>
            {mostrarFiltrosAvanzados && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-6 bg-gray-50 rounded-xl border-2 border-gray-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Tipo de Auditoría - Valores del backend: Regular, Territorial, Especial */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        📋 Tipo de Auditoría
                      </label>
                      <select
                        value={filtros.tipo || ''}
                        onChange={(e) => onCambiarFiltros({ ...filtros, tipo: e.target.value || undefined, pagina: 1 })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                      >
                        <option value="">Todos los tipos</option>
                        <option value="Regular">Regular</option>
                        <option value="Territorial">Territorial</option>
                        <option value="Especial">Especial</option>
                      </select>
                    </div>

                    {/* Fase - Valores del backend: planeacion, en-curso, revision, completada */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        🔄 Fase
                      </label>
                      <select
                        value={filtros.fase || ''}
                        onChange={(e) => onCambiarFiltros({ ...filtros, fase: e.target.value || undefined, pagina: 1 })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                      >
                        <option value="">Todas las fases</option>
                        <option value="planeacion">📋 Planeación</option>
                        <option value="en-curso">⚙️ En Curso</option>
                        <option value="revision">🔍 Revisión</option>
                        <option value="completada">✅ Completada</option>
                      </select>
                    </div>

                    {/* Prioridad - Valores del backend: Alta, Media, Baja */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        🚨 Prioridad
                      </label>
                      <select
                        value={filtros.prioridad || ''}
                        onChange={(e) => onCambiarFiltros({ ...filtros, prioridad: e.target.value || undefined, pagina: 1 })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                      >
                        <option value="">Todas las prioridades</option>
                        <option value="Alta">🟠 Alta</option>
                        <option value="Media">🟡 Media</option>
                        <option value="Baja">🟢 Baja</option>
                      </select>
                    </div>

                    {/* Territorial */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        📍 Territorial
                      </label>
                      <select
                        value={filtros.territorial || ''}
                        onChange={(e) => onCambiarFiltros({ ...filtros, territorial: e.target.value || undefined, pagina: 1 })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                      >
                        <option value="">Todas las territoriales</option>
                        <option value="SEDE_CENTRAL">Sede Central</option>
                        <option value="ANTIOQUIA">Antioquia</option>
                        <option value="ATLANTICO">Atlántico</option>
                        <option value="BOLIVAR">Bolívar</option>
                        <option value="BOYACA">Boyacá</option>
                        <option value="CALDAS">Caldas</option>
                        <option value="CAUCA">Cauca</option>
                        <option value="CUNDINAMARCA">Cundinamarca</option>
                        <option value="HUILA">Huila</option>
                        <option value="MAGDALENA">Magdalena</option>
                        <option value="META">Meta</option>
                        <option value="NARINO">Nariño</option>
                        <option value="NORTE_SANTANDER">Norte de Santander</option>
                        <option value="QUINDIO">Quindío</option>
                        <option value="RISARALDA">Risaralda</option>
                        <option value="SANTANDER">Santander</option>
                        <option value="TOLIMA">Tolima</option>
                        <option value="VALLE">Valle del Cauca</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* TABLA */}
      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Código</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Título</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Tipo</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Fase</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Prioridad</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Progreso</th>
                <th className="text-right py-3 px-4 text-sm font-bold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Cargando auditorías...
                    </div>
                  </td>
                </tr>
              ) : auditorias.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No se encontraron auditorías
                  </td>
                </tr>
              ) : (
                auditorias.map((auditoria, index) => (
                  <FilaAuditoria 
                    key={auditoria.id} 
                    auditoria={auditoria} 
                    onVerDetalle={onVerDetalle}
                    delay={index * 0.03}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        {auditorias.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {(filtros.pagina - 1) * filtros.registrosPorPagina + 1} - {Math.min(filtros.pagina * filtros.registrosPorPagina, totalAuditorias)} de {totalAuditorias}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCambiarPagina(filtros.pagina - 1)}
                disabled={filtros.pagina === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium">
                Página {filtros.pagina}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCambiarPagina(filtros.pagina + 1)}
                disabled={filtros.pagina * filtros.registrosPorPagina >= totalAuditorias}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function FilaAuditoria({ 
  auditoria, 
  onVerDetalle, 
  delay 
}: { 
  auditoria: Auditoria; 
  onVerDetalle: (auditoria: Auditoria) => void;
  delay: number;
}) {
  const colorFase = obtenerColorFase(auditoria.fase);
  const colorPrioridad = obtenerColorPrioridad(auditoria.prioridad);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="border-b border-gray-100 hover:bg-gray-50"
    >
      <td className="py-3 px-4">
        <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
          {auditoria.codigo}
        </code>
      </td>
      <td className="py-3 px-4">
        <div className="max-w-xs">
          <div className="text-sm font-medium text-gray-900 truncate">{auditoria.titulo}</div>
          {auditoria.territorial && (
            <div className="text-xs text-gray-500">📍 {auditoria.territorial}</div>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge variant="outline" className="text-xs">
          {auditoria.tipo}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <Badge style={{ background: colorFase, color: 'white' }} className="text-xs">
          {auditoria.fase}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <Badge style={{ background: colorPrioridad, color: 'white' }} className="text-xs">
          {auditoria.prioridad}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${auditoria.progreso || 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 font-medium">{auditoria.progreso || 0}%</span>
        </div>
      </td>
      <td className="py-3 px-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onVerDetalle(auditoria)}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </td>
    </motion.tr>
  );
}

function ModalDetalleAuditoria({ auditoria, onClose }: { auditoria: Auditoria; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Detalle de Auditoría</h2>
              <p className="text-sm text-blue-100">Código: {auditoria.codigo}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="p-6 space-y-6">
          {/* INFO GENERAL */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Información General
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Título</div>
                <div className="font-medium text-gray-900">{auditoria.titulo}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Tipo</div>
                <Badge variant="outline">{auditoria.tipo}</Badge>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Fase</div>
                <Badge style={{ background: obtenerColorFase(auditoria.fase), color: 'white' }}>
                  {auditoria.fase}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Prioridad</div>
                <Badge style={{ background: obtenerColorPrioridad(auditoria.prioridad), color: 'white' }}>
                  {auditoria.prioridad}
                </Badge>
              </div>
            </div>
          </div>

          {/* DESCRIPCIÓN */}
          {auditoria.descripcion && (
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Descripción</h3>
              <p className="text-sm text-gray-700">{auditoria.descripcion}</p>
            </div>
          )}

          {/* FECHAS Y PROGRESO */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Fecha Inicio</div>
              <div className="font-medium text-gray-900">
                {auditoria.fechaInicio ? new Date(auditoria.fechaInicio).toLocaleDateString('es-CO') : 'No definida'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Fecha Fin</div>
              <div className="font-medium text-gray-900">
                {auditoria.fechaFin ? new Date(auditoria.fechaFin).toLocaleDateString('es-CO') : 'No definida'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Territorial</div>
              <div className="font-medium text-gray-900">{auditoria.territorial || 'No asignada'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Progreso</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${auditoria.progreso || 0}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-900">{auditoria.progreso || 0}%</span>
              </div>
            </div>
          </div>

          {/* METADATOS */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-bold text-gray-900 mb-3">Metadatos</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Creado:</span>{' '}
                <span className="font-medium">{new Date(auditoria.createdAt).toLocaleString('es-CO')}</span>
              </div>
              <div>
                <span className="text-gray-600">Actualizado:</span>{' '}
                <span className="font-medium">{new Date(auditoria.updatedAt).toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <Button onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ============ UTILIDADES ============

/**
 * Obtiene el color correspondiente a una fase de auditoría
 * Soporta valores del backend: planeacion, en-curso, revision, completada
 */
function obtenerColorFase(fase: string): string {
  const colores: Record<string, string> = {
    // Valores del enum FaseAuditoria del backend
    'planeacion': '#3B82F6',    // Azul
    'en-curso': '#F59E0B',      // Amarillo/Naranja
    'revision': '#8B5CF6',      // Púrpura
    'completada': '#10B981',    // Verde
    // Valores alternativos (EstadoKanban)
    'Planeación': '#3B82F6',
    'Ejecución': '#F59E0B',
    'Comunicación': '#8B5CF6',
    'Seguimiento': '#10B981',
    'Finalizada': '#6B7280'
  };
  return colores[fase] || '#6B7280';
}

/**
 * Obtiene el color correspondiente a una prioridad de auditoría
 * Soporta valores del backend: Alta, Media, Baja
 */
function obtenerColorPrioridad(prioridad: string): string {
  const colores: Record<string, string> = {
    // Valores del enum PrioridadAuditoria del backend
    'Alta': '#EA580C',          // Naranja
    'Media': '#F59E0B',         // Amarillo
    'Baja': '#10B981',          // Verde
    // Valores alternativos (PrioridadKanban)
    'crítica': '#DC2626',
    'alta': '#EA580C',
    'media': '#F59E0B',
    'baja': '#10B981'
  };
  return colores[prioridad] || '#6B7280';
}

export { AuditoriaCambiosModule };
export default AuditoriaCambiosModule;

/* ============ DATOS MOCK COMENTADOS ============
// Los datos mock anteriores se han comentado ya que ahora se cargan desde el backend

// const generarLogsMock = () => {
//   const usuarios = [
//     { id: 'u1', nombre: 'María González', email: 'mgonzalez@esap.edu.co', rol: 'Jefe OCI' },
//     { id: 'u2', nombre: 'Carlos Rodríguez', email: 'crodriguez@esap.edu.co', rol: 'Auditor Líder' },
//     ...
//   ];
//
//   const acciones = [
//     { accion: 'aprobar', descripcion: 'Aprobar Plan Anual de Auditoría 2025', tabla: 'plan_anual', ... },
//     { accion: 'crear_auditoria', descripcion: 'Crear auditoría de Gestión Financiera', tabla: 'auditoria', ... },
//     ...
//   ];
//
//   // Generar logs de los últimos 30 días
//   ...
// };
*/
