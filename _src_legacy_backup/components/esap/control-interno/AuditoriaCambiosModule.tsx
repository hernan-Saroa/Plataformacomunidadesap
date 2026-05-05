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
 * - Tabla paginada de logs
 * - Filtros avanzados (6 filtros)
 * - Modal detalle con diff viewer
 * - Estadísticas con Recharts (4 gráficos)
 * - Exportación a Excel/PDF
 * - Búsqueda en tiempo real
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Search, Filter, Download, Eye, Calendar,
  User, FileText, Activity, BarChart3, TrendingUp,
  Clock, AlertCircle, CheckCircle, XCircle, Edit,
  Trash2, ArrowRightCircle, PlusCircle, X, ChevronLeft,
  ChevronRight, ChevronDown, Save, AlertTriangle, Info
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import {
  auditLogService,
  type AuditLog,
  type AuditLogFiltros,
  type AuditLogStats,
  type TipoAccion,
  type TipoEntidad
} from './services/auditLogService';

// ✅ DÍA 4: Container4K para padding adaptativo
import { Container4K } from '@/components/ui';

// ============ TIPOS ============

type VistaActiva = 'logs';

// ============ DATOS MOCK ============

// Generar logs de ejemplo al cargar - TODOS LOS MÓDULOS
const generarLogsMock = () => {
  const usuarios = [
    { id: 'u1', nombre: 'María González', email: 'mgonzalez@esap.edu.co', rol: 'Jefe OCI' },
    { id: 'u2', nombre: 'Carlos Rodríguez', email: 'crodriguez@esap.edu.co', rol: 'Auditor Líder' },
    { id: 'u3', nombre: 'Ana Martínez', email: 'amartinez@esap.edu.co', rol: 'Auditor Operativo' },
    { id: 'u4', nombre: 'Jorge Pérez', email: 'jperez@esap.edu.co', rol: 'Coordinador Disciplinario' },
    { id: 'u5', nombre: 'Laura Sánchez', email: 'lsanchez@esap.edu.co', rol: 'Auditor Líder' },
    { id: 'u6', nombre: 'Pedro Ramírez', email: 'pramirez@esap.edu.co', rol: 'Coordinador Legal' },
    { id: 'u7', nombre: 'Sofía Torres', email: 'storres@esap.edu.co', rol: 'Gestora Talento Humano' },
    { id: 'u8', nombre: 'Luis Hernández', email: 'lhernandez@esap.edu.co', rol: 'Coordinador Académico' },
    { id: 'u9', nombre: 'Diana Castro', email: 'dcastro@esap.edu.co', rol: 'Administrador Sistema' },
    { id: 'u10', nombre: 'Andrés Moreno', email: 'amoreno@esap.edu.co', rol: 'Director Regional' }
  ];

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

  // Generar logs de los últimos 30 días
  const logs: Promise<AuditLog>[] = [];
  const hoy = new Date();
  
  // Generar 100 logs variados de todos los módulos
  for (let i = 0; i < 100; i++) {
    const usuario = usuarios[Math.floor(Math.random() * usuarios.length)];
    const accionData = acciones[Math.floor(Math.random() * acciones.length)];
    const diasAtras = Math.floor(Math.random() * 30);
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - diasAtras);
    fecha.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

    // Crear log con timestamp personalizado
    const logPromise = auditLogService.registrar(
      usuario.id,
      usuario.nombre,
      usuario.email,
      usuario.rol,
      accionData.accion,
      accionData.descripcion,
      accionData.tabla,
      accionData.registroId,
      accionData.cambios,
      {
        modulo: accionData.modulo as any,
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`
      }
    ).then(log => {
      // Ajustar timestamp
      log.timestamp = fecha.toISOString();
      return log;
    });

    logs.push(logPromise);
  }

  return Promise.all(logs);
};

// ============ COMPONENTE PRINCIPAL ============

export function AuditoriaCambiosModule() {
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('logs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logSeleccionado, setLogSeleccionado] = useState<AuditLog | null>(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Filtros
  const [filtros, setFiltros] = useState<AuditLogFiltros>({
    usuarioId: undefined,
    fechaInicio: undefined,
    fechaFin: undefined,
    accion: 'todas',
    tabla: 'todas',
    criticidad: 'todas',
    busqueda: '',
    pagina: 1,
    registrosPorPagina: 20
  });

  // Cargar logs mock al montar
  useEffect(() => {
    generarLogsMock().then(() => {
      cargarLogs();
    });
  }, []);

  // Cargar logs cuando cambien los filtros
  useEffect(() => {
    cargarLogs();
  }, [filtros]);

  const cargarLogs = async () => {
    setCargando(true);
    try {
      const response = await auditLogService.obtenerLogs(filtros);
      setLogs(response.logs);
    } catch (error) {
      toast.error('Error al cargar logs de auditoría');
    } finally {
      setCargando(false);
    }
  };

  const handleVerDetalle = (log: AuditLog) => {
    setLogSeleccionado(log);
    setModalDetalleAbierto(true);
  };

  const handleExportarExcel = async () => {
    try {
      toast.info('Generando archivo Excel...');
      await auditLogService.exportarExcel(filtros);
      toast.success('Archivo Excel descargado correctamente');
    } catch (error) {
      toast.error('Error al exportar a Excel');
    }
  };

  const handleExportarPDF = async () => {
    try {
      toast.info('Generando archivo PDF...');
      await auditLogService.exportarPDF(filtros);
      toast.success('Archivo PDF descargado correctamente');
    } catch (error) {
      toast.error('Error al exportar a PDF');
    }
  };

  const handleCambiarPagina = (nuevaPagina: number) => {
    setFiltros(prev => ({ ...prev, pagina: nuevaPagina }));
  };

  const totalLogs = useMemo(() => {
    return auditLogService.obtenerTodos().length;
  }, [logs]);

  const estadisticasRapidas = useMemo(() => {
    const todosLogs = auditLogService.obtenerTodos();
    const hoy = new Date();
    const hace24h = new Date(hoy.getTime() - 24 * 60 * 60 * 1000);

    return {
      total: todosLogs.length,
      ultimas24h: todosLogs.filter(l => new Date(l.timestamp) >= hace24h).length,
      criticos: todosLogs.filter(l => l.criticidad === 'critica').length,
      usuarios: new Set(todosLogs.map(l => l.usuarioId)).size
    };
  }, [logs]);

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
                    Auditoría de Cambios
                  </h1>
                  <p className="text-sm text-gray-600">
                    Registro completo de operaciones del sistema para compliance normativo
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
                  {estadisticasRapidas.total}
                </div>
                <div className="text-xs text-blue-700">Total de Registros</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-900">
                  {estadisticasRapidas.ultimas24h}
                </div>
                <div className="text-xs text-green-700">Últimas 24 horas</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-900">
                  {estadisticasRapidas.criticos}
                </div>
                <div className="text-xs text-red-700">Eventos Críticos</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-900">
                  {estadisticasRapidas.usuarios}
                </div>
                <div className="text-xs text-purple-700">Usuarios Activos</div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* TABS */}
        <Card className="p-1">
          <div className="flex gap-1">
            <button
              onClick={() => setVistaActiva('logs')}
              className={`flex-1 px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                vistaActiva === 'logs'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="font-medium">Registros de Auditoría</span>
            </button>
          </div>
        </Card>

        {/* CONTENIDO */}
        <AnimatePresence mode="wait">
          {vistaActiva === 'logs' && (
            <VistaLogs
              logs={logs}
              filtros={filtros}
              onCambiarFiltros={setFiltros}
              onVerDetalle={handleVerDetalle}
              onCambiarPagina={handleCambiarPagina}
              cargando={cargando}
            />
          )}
        </AnimatePresence>

        {/* MODAL DETALLE */}
        {modalDetalleAbierto && logSeleccionado && (
          <ModalDetalleLog
            log={logSeleccionado}
            onClose={() => setModalDetalleAbierto(false)}
          />
        )}
      </div>
    </Container4K>
  );
}

// ============ COMPONENTES AUXILIARES ============

function VistaLogs({
  logs,
  filtros,
  onCambiarFiltros,
  onVerDetalle,
  onCambiarPagina,
  cargando
}: {
  logs: AuditLog[];
  filtros: AuditLogFiltros;
  onCambiarFiltros: (filtros: AuditLogFiltros) => void;
  onVerDetalle: (log: AuditLog) => void;
  onCambiarPagina: (pagina: number) => void;
  cargando: boolean;
}) {
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);

  // Contar filtros activos (excluyendo búsqueda y paginación)
  const contarFiltrosActivos = () => {
    let count = 0;
    if (filtros.fechaInicio) count++;
    if (filtros.fechaFin) count++;
    if (filtros.accion && filtros.accion !== 'todas') count++;
    if (filtros.tabla && filtros.tabla !== 'todas') count++;
    if (filtros.modulo && filtros.modulo !== 'todos') count++;
    if (filtros.criticidad && filtros.criticidad !== 'todas') count++;
    if (filtros.usuarioId) count++;
    return count;
  };

  const filtrosActivos = contarFiltrosActivos();
  const hayFiltros = filtrosActivos > 0 || filtros.busqueda;

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    onCambiarFiltros({
      usuarioId: undefined,
      fechaInicio: undefined,
      fechaFin: undefined,
      accion: 'todas',
      tabla: 'todas',
      modulo: 'todos',
      criticidad: 'todas',
      busqueda: '',
      pagina: 1,
      registrosPorPagina: 20
    });
  };

  return (
    <motion.div
      key="logs"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      {/* BÚSQUEDA Y FILTROS */}
      <Card className="p-6 border-l-4 border-l-blue-600">
        {/* Búsqueda Global */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Buscar eventos por usuario, acción, módulo...</h3>
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
              placeholder="Buscar por usuario, acción, descripción, módulo, ID..."
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

          {/* Indicador de búsqueda activa */}
          {filtros.busqueda && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-medium text-blue-900">
                Buscando: <span className="font-bold">"{filtros.busqueda}"</span>
              </span>
            </div>
          )}
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
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-bold text-gray-700">
                      Combina múltiples filtros para refinar tu búsqueda
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Fecha Inicio */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        📅 Fecha Inicio
                      </label>
                      <input
                        type="date"
                        value={filtros.fechaInicio || ''}
                        onChange={(e) => onCambiarFiltros({ ...filtros, fechaInicio: e.target.value, pagina: 1 })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    {/* Fecha Fin */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        📅 Fecha Fin
                      </label>
                      <input
                        type="date"
                        value={filtros.fechaFin || ''}
                        onChange={(e) => onCambiarFiltros({ ...filtros, fechaFin: e.target.value, pagina: 1 })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    {/* Acción */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        ⚡ Tipo de Acción
                      </label>
                      <select
                        value={filtros.accion}
                        onChange={(e) => onCambiarFiltros({ ...filtros, accion: e.target.value as any, pagina: 1 })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                      >
                        <option value="todas">Todas las acciones</option>
                        <option value="crear">➕ Crear</option>
                        <option value="actualizar">✏️ Actualizar</option>
                        <option value="eliminar">🗑️ Eliminar</option>
                        <option value="aprobar">✅ Aprobar</option>
                        <option value="rechazar">❌ Rechazar</option>
                        <option value="cambiar_estado">🔄 Cambiar Estado</option>
                        <option value="asignar">👥 Asignar</option>
                        <option value="validar">✓ Validar</option>
                        <option value="generar">📄 Generar</option>
                        <option value="exportar">📥 Exportar</option>
                      </select>
                    </div>

                    {/* Módulo */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        📦 Módulo del Sistema
                      </label>
                      <select
                        value={filtros.modulo}
                        onChange={(e) => onCambiarFiltros({ ...filtros, modulo: e.target.value as any, pagina: 1 })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                      >
                        <option value="todos">Todos los módulos</option>
                        <option value="Control Interno">🛡️ Control Interno</option>
                        <option value="Control Disciplinario">⚖️ Control Disciplinario</option>
                        <option value="Gestión Legal">📜 Gestión Legal</option>
                        <option value="Gestión de Usuarios">👥 Gestión de Usuarios</option>
                        <option value="Graduados">🎓 Graduados</option>
                        <option value="Certificados Laborales">📋 Certificados Laborales</option>
                        <option value="Firma Electrónica">✍️ Firma Electrónica</option>
                      </select>
                    </div>

                    {/* Tabla/Entidad */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        🗄️ Entidad/Tabla
                      </label>
                      <select
                        value={filtros.tabla}
                        onChange={(e) => onCambiarFiltros({ ...filtros, tabla: e.target.value as any, pagina: 1 })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                      >
                        <option value="todas">Todas las entidades</option>
                        <option value="usuarios">Usuarios</option>
                        <option value="graduados">Graduados</option>
                        <option value="certificados">Certificados</option>
                        <option value="auditorias">Auditorías</option>
                        <option value="expedientes">Expedientes</option>
                        <option value="procesos">Procesos</option>
                      </select>
                    </div>

                    {/* Criticidad */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        🚨 Nivel de Criticidad
                      </label>
                      <select
                        value={filtros.criticidad}
                        onChange={(e) => onCambiarFiltros({ ...filtros, criticidad: e.target.value as any, pagina: 1 })}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                      >
                        <option value="todas">Todas las criticidades</option>
                        <option value="baja">🟢 Baja</option>
                        <option value="media">🟡 Media</option>
                        <option value="alta">🟠 Alta</option>
                        <option value="critica">🔴 Crítica</option>
                      </select>
                    </div>
                  </div>

                  {/* Indicadores de filtros activos */}
                  {filtrosActivos > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-700">Filtros aplicados:</span>
                        {filtros.fechaInicio && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium flex items-center gap-1">
                            📅 Desde: {filtros.fechaInicio}
                            <button
                              onClick={() => onCambiarFiltros({ ...filtros, fechaInicio: undefined, pagina: 1 })}
                              className="hover:bg-blue-200 rounded-full p-0.5"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                        {filtros.fechaFin && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium flex items-center gap-1">
                            📅 Hasta: {filtros.fechaFin}
                            <button
                              onClick={() => onCambiarFiltros({ ...filtros, fechaFin: undefined, pagina: 1 })}
                              className="hover:bg-blue-200 rounded-full p-0.5"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                        {filtros.accion && filtros.accion !== 'todas' && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-medium flex items-center gap-1">
                            ⚡ {filtros.accion}
                            <button
                              onClick={() => onCambiarFiltros({ ...filtros, accion: 'todas', pagina: 1 })}
                              className="hover:bg-green-200 rounded-full p-0.5"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                        {filtros.modulo && filtros.modulo !== 'todos' && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-medium flex items-center gap-1">
                            📦 {filtros.modulo}
                            <button
                              onClick={() => onCambiarFiltros({ ...filtros, modulo: 'todos', pagina: 1 })}
                              className="hover:bg-purple-200 rounded-full p-0.5"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                        {filtros.criticidad && filtros.criticidad !== 'todas' && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-lg text-xs font-medium flex items-center gap-1">
                            🚨 {filtros.criticidad}
                            <button
                              onClick={() => onCambiarFiltros({ ...filtros, criticidad: 'todas', pagina: 1 })}
                              className="hover:bg-orange-200 rounded-full p-0.5"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
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
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Timestamp</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Usuario</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Acción</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Descripción</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Entidad</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Criticidad</th>
                <th className="text-right py-3 px-4 text-sm font-bold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Cargando logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <FilaLog 
                    key={log.id} 
                    log={log} 
                    onVerDetalle={onVerDetalle}
                    delay={index * 0.03}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        {logs.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {(filtros.pagina - 1) * filtros.registrosPorPagina + 1} - {Math.min(filtros.pagina * filtros.registrosPorPagina, logs.length)} de {logs.length}
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
                disabled={logs.length < filtros.registrosPorPagina}
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

function FilaLog({ 
  log, 
  onVerDetalle, 
  delay 
}: { 
  log: AuditLog; 
  onVerDetalle: (log: AuditLog) => void;
  delay: number;
}) {
  const iconoAccion = obtenerIconoAccion(log.accion);
  const colorAccion = obtenerColorAccion(log.accion);
  const colorCriticidad = obtenerColorCriticidad(log.criticidad || 'media');

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="border-b border-gray-100 hover:bg-gray-50"
    >
      <td className="py-3 px-4 text-sm text-gray-600">
        {new Date(log.timestamp).toLocaleString('es-CO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </td>
      <td className="py-3 px-4">
        <div>
          <div className="text-sm font-medium text-gray-900">{log.usuarioNombre}</div>
          <div className="text-xs text-gray-500">{log.usuarioEmail}</div>
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge style={{ background: colorAccion, color: 'white' }} className="gap-1">
          {iconoAccion}
          {log.accion}
        </Badge>
      </td>
      <td className="py-3 px-4 text-sm text-gray-700 max-w-md truncate">
        {log.accionDescripcion}
      </td>
      <td className="py-3 px-4">
        <Badge variant="outline">
          {log.tabla}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <Badge style={{ background: colorCriticidad, color: 'white' }}>
          {log.criticidad || 'media'}
        </Badge>
      </td>
      <td className="py-3 px-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onVerDetalle(log)}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </td>
    </motion.tr>
  );
}

function ModalDetalleLog({ log, onClose }: { log: AuditLog; onClose: () => void }) {
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
              <p className="text-sm text-blue-100">ID: {log.id}</p>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Timestamp</div>
              <div className="font-medium text-gray-900">
                {new Date(log.timestamp).toLocaleString('es-CO')}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Criticidad</div>
              <Badge style={{ background: obtenerColorCriticidad(log.criticidad || 'media'), color: 'white' }}>
                {log.criticidad || 'media'}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Usuario</div>
              <div className="font-medium text-gray-900">{log.usuarioNombre}</div>
              <div className="text-sm text-gray-500">{log.usuarioEmail}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Rol</div>
              <Badge variant="outline">{log.usuarioRol}</Badge>
            </div>
          </div>

          {/* ACCIÓN */}
          <Card className="p-4 border-2 border-blue-200 bg-blue-50">
            <div className="text-sm text-blue-700 mb-2 font-medium">Acción Ejecutada</div>
            <div className="flex items-center gap-3">
              {obtenerIconoAccion(log.accion)}
              <div>
                <div className="font-bold text-blue-900">{log.accion.toUpperCase()}</div>
                <div className="text-sm text-blue-700">{log.accionDescripcion}</div>
              </div>
            </div>
          </Card>

          {/* ENTIDAD */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Entidad/Tabla</div>
              <Badge variant="outline">{log.tabla}</Badge>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">ID del Registro</div>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">{log.registroId}</code>
            </div>
          </div>

          {/* CAMBIOS (DIFF) */}
          {(log.cambios.antes || log.cambios.despues) && (
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <ArrowRightCircle className="w-5 h-5 text-orange-600" />
                Cambios Realizados
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* ANTES */}
                {log.cambios.antes && (
                  <Card className="p-4 border-2 border-red-200 bg-red-50">
                    <div className="text-sm font-medium text-red-700 mb-2">❌ Antes</div>
                    <pre className="text-xs text-red-900 whitespace-pre-wrap font-mono overflow-x-auto">
                      {JSON.stringify(log.cambios.antes, null, 2)}
                    </pre>
                  </Card>
                )}

                {/* DESPUÉS */}
                {log.cambios.despues && (
                  <Card className="p-4 border-2 border-green-200 bg-green-50">
                    <div className="text-sm font-medium text-green-700 mb-2">✅ Después</div>
                    <pre className="text-xs text-green-900 whitespace-pre-wrap font-mono overflow-x-auto">
                      {JSON.stringify(log.cambios.despues, null, 2)}
                    </pre>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* METADATOS */}
          {(log.ip || log.modulo) && (
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Metadatos Adicionales</h3>
              <div className="grid grid-cols-2 gap-4">
                {log.modulo && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Módulo</div>
                    <Badge>{log.modulo}</Badge>
                  </div>
                )}
                {log.ip && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Dirección IP</div>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{log.ip}</code>
                  </div>
                )}
              </div>
            </div>
          )}
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

function obtenerIconoAccion(accion: TipoAccion) {
  const iconos: Record<TipoAccion, JSX.Element> = {
    crear: <PlusCircle className="w-4 h-4" />,
    actualizar: <Edit className="w-4 h-4" />,
    eliminar: <Trash2 className="w-4 h-4" />,
    aprobar: <CheckCircle className="w-4 h-4" />,
    rechazar: <XCircle className="w-4 h-4" />,
    cambiar_estado: <ArrowRightCircle className="w-4 h-4" />,
    asignar: <User className="w-4 h-4" />,
    validar: <CheckCircle className="w-4 h-4" />,
    generar: <FileText className="w-4 h-4" />,
    exportar: <Download className="w-4 h-4" />,
    consultar: <Eye className="w-4 h-4" />
  };
  return iconos[accion] || <Activity className="w-4 h-4" />;
}

function obtenerColorAccion(accion: TipoAccion): string {
  const colores: Record<TipoAccion, string> = {
    crear: '#10B981',
    actualizar: '#F59E0B',
    eliminar: '#DC2626',
    aprobar: '#10B981',
    rechazar: '#DC2626',
    cambiar_estado: '#3B82F6',
    asignar: '#8B5CF6',
    validar: '#10B981',
    generar: '#3B82F6',
    exportar: '#6B7280',
    consultar: '#6B7280'
  };
  return colores[accion] || '#6B7280';
}

function obtenerColorCriticidad(criticidad: 'baja' | 'media' | 'alta' | 'critica'): string {
  const colores = {
    baja: '#3B82F6',
    media: '#F59E0B',
    alta: '#EA580C',
    critica: '#DC2626'
  };
  return colores[criticidad];
}

export default AuditoriaCambiosModule;