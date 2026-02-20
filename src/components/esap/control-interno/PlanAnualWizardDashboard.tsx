/**
 * Wizard y Dashboard del Plan Anual de Auditoría
 * Componentes complementarios para PlanAnualAuditoriaDefinitivo.tsx
 * v2.0 - Con soporte para puntos de control
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Check, Shield, Users, CheckCircle2, 
  TrendingUp, FileCheck, AlertCircle, BookOpen, Download, FileText,
  Paperclip, Upload, Trash2, X, Eye, Plus, CalendarClock, Loader2, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ModalGestionAdjuntos } from './ModalGestionAdjuntosActividades';
import { SemaforoSeguimientoPAI } from '../plan-anual-auditoria/components/SemaforoSeguimientoPAI';
import { ConfiguracionEvidencias, CONFIGURACIONES_PREDEFINIDAS } from './SistemaEvidenciasActividades';
import { 
  ModalConfiguracionPuntosControl, 
  type PuntoControl, 
  type FrecuenciaPuntoControl 
} from './ModalConfiguracionPuntosControl';
// Hook para sincronizar evidencias con backend y API de auditores
import { useSaveEvidencias, actividadesApi, planAnualApi, type CreateActividadDto } from './services/plan-anual';
import { configuracionesProfesionalesOCIGApi } from './services/api';
import { useControlInternoPermissions } from './hooks/useControlInternoPermissions';
import { cargarConfiguracionPDF } from './utils/configuracionHelper';
import { 
  dibujarEncabezadoInstitucional, 
  dibujarPieInstitucional, 
  DOCUMENTOS_PREDEFINIDOS 
} from './services/pdfESAPHeader';
import logoESAP from '../../../assets/1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png';

// Tipos re-exportados (deben coincidir con el archivo principal)
type EstadoPlan = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'VIGENTE' | 'CERRADO';
type EstadoActividad = 'PENDIENTE' | 'EN_EJECUCION' | 'COMPLETADA';

interface Auditor {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
}

interface Actividad {
  id: number | string;
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  responsable: Auditor | null; // RESPONSABLE PRINCIPAL - Asignado en la programación (no modificable en seguimiento)
  responsablesApoyo?: Auditor[]; // Responsables adicionales agregados como apoyo en el seguimiento
  porcentajeAvance: number;
  estado: EstadoActividad;
  control: string;
  evaluacion: string;
  seguimiento: string;
  adjuntos?: ArchivoAdjunto[]; // Archivos adjuntos para evidencia de cumplimiento
  observacionesCumplimiento?: ObservacionCumplimiento[] | string; // FLEXIBILIDAD: array para múltiples o string simple
  
  // ═══════════════════════════════════════════════════════════════════════
  // CONFIGURACIÓN DE EVIDENCIAS - Define si adjuntos/observaciones son requeridos
  // ═══════════════════════════════════════════════════════════════════════
  configuracionEvidencias?: ConfiguracionEvidencias;
  
  // Sistema de autorización del Jefe OCIG - Configurado en creación del plan
  requiereAutorizacionJefeOCIG?: boolean; // Indica si requiere autorización del Jefe OCIG para completar
  autorizadaPorJefeOCIG?: boolean; // Indica si fue autorizada por el Jefe OCIG
  fechaAutorizacion?: string; // Fecha de autorización del Jefe OCIG
  observacionesJefeOCIG?: string; // Observaciones del Jefe OCIG al autorizar
  
  // Sistema de verificación del Director (legacy)
  requiereVerificacionDirector: boolean; // Indica si requiere verificación del Director OCIG
  verificadaPorDirector?: boolean; // Indica si fue verificada por el Director
  fechaVerificacion?: string; // Fecha de verificación del Director
  observacionesDirector?: string; // Observaciones del Director al verificar
  
  // ✅ NUEVO: Sistema de puntos de control
  puntosControl?: PuntoControl[]; // Puntos de control configurados
  frecuenciaPuntosControl?: FrecuenciaPuntoControl; // Frecuencia configurada
}

interface ArchivoAdjunto {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: number;
  fechaCarga: string;
  cargadoPor: string;
  url?: string;
}

interface ObservacionCumplimiento {
  id: string;
  texto: string;
  fechaRegistro: string;
  registradoPor: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES HELPER - Manejar diferentes formatos de datos
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtiene el conteo correcto de observaciones
 * Maneja tanto string (del backend) como array (del frontend)
 */
function escapeHtml(s: string): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function contarObservaciones(obs: ObservacionCumplimiento[] | string | undefined): number {
  if (!obs) return 0;
  if (Array.isArray(obs)) return obs.length;
  // Es string: cuenta como 1 si tiene contenido
  return typeof obs === 'string' && obs.trim().length > 0 ? 1 : 0;
}

/**
 * Verifica si hay observaciones
 */
function tieneObservaciones(obs: ObservacionCumplimiento[] | string | undefined): boolean {
  return contarObservaciones(obs) > 0;
}

interface Rol {
  id?: string; // ID del rol desde el backend (requerido para crear actividades)
  numero: number;
  nombre: string;
  color: string;
  icono: string;
  descripcion: string;
  actividades: Actividad[];
}

interface PlanAnual {
  id: string;
  vigencia: number;
  version: number;
  estado: EstadoPlan;
  jefeOCI: Auditor;
  fechaCreacion: string;
  fechaAprobacion: string | null;
  actaCICC: string | null;
  roles: Rol[];
}

// Auditores - Valor por defecto mientras se cargan del backend
const AUDITORES_DEFAULT: Auditor[] = [
  { id: '1', nombre: 'Cargando...', cargo: 'Auditor', email: '' }
];

// Roles (debe coincidir con el principal)
const ROLES_DECRETO_648: Omit<Rol, 'actividades'>[] = [
  { numero: 1, nombre: 'Liderazgo estratégico', color: '#2962FF', icono: '🎯', descripcion: 'Asesorar y acompañar a la alta dirección' },
  { numero: 2, nombre: 'Enfoque hacia la prevención', color: '#00C853', icono: '🛡️', descripcion: 'Promover actividades preventivas' },
  { numero: 3, nombre: 'Evaluación de la gestión del riesgo', color: '#FF6D00', icono: '⚠️', descripcion: 'Evaluar sistema de gestión de riesgos' },
  { numero: 4, nombre: 'Evaluación del sistema de control interno', color: '#AA00FF', icono: '✓', descripcion: 'Evaluar diseño y efectividad' },
  { numero: 5, nombre: 'Relación con organismos externos de control', color: '#C62828', icono: '⚖️', descripcion: 'Coordinar con entes externos' }
];

// Tipo para configuración de roles en el wizard
interface ActividadBase {
  id?: string; // ⚡ ID único para identificar cada actividad
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  control: string;
  evaluacion: string;
  seguimiento: string;
  requiereAutorizacionJefeOCIG?: boolean; // Checkbox      por actividad
  tipoEvidencia?: 'SOLO_CHECK' | 'OBSERVACIONES' | 'ADJUNTOS' | 'COMPLETO'; // Tipo de evidencia requerida
  // ✅ NUEVO: Configuración de puntos de control
  puntosControl?: PuntoControl[];
  frecuenciaPuntosControl?: FrecuenciaPuntoControl;
}

interface RolConfig extends Omit<Rol, 'actividades'> {
  actividadesSeleccionadas: ActividadBase[];
  actividadesCustom: ActividadBase[];
  responsables: Auditor[];
}

// Función para obtener actividades por rol desde el archivo principal
function getActividadesPorRol(numeroRol: number): ActividadBase[] {
  // Esta es la lista base del Decreto 648/2017
  const actividadesPorRol: Record<number, ActividadBase[]> = {
    1: [
    
      { nombre: 'Verificar cumplimiento de metas e indicadores estratégicos', descripcion: 'Revisar cumplimiento de objetivos institucionales y riesgos asociados', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento cuatrimestral', evaluacion: '50% avance', seguimiento: 'Socializar resultados en el Comité Institucional de Gestión y Desempeño' },
      { nombre: 'Establecer periodicidad de informes estratégicos', descripcion: 'Definir en el comité de gestión y desempeño la periodicidad de rendición de informes', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento anual', evaluacion: '10% avance', seguimiento: 'Socializar plan anual de auditoría en el comité institucional' },
      { nombre: 'Presentar resultados de evaluación de líneas de defensa', descripcion: 'Evaluar operación de primera y segunda línea de defensa ante el CICC', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento semestral', evaluacion: '60% avance', seguimiento: 'Elaborar informe de evaluación independiente del sistema de control interno' },
      { nombre: 'Informar sobre alertas de riesgo fiscal', descripcion: 'Comunicar al jefe de la entidad sobre alertas identificadas en auditorías', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Informe cuatrimestral', evaluacion: '60% avance', seguimiento: 'Elaborar informe, publicar en web y diligenciar seguimiento en sistema' },
      { nombre: 'Participación en procesos de empalme', descripcion: 'Acompañar procesos de transición cuando hay cambios de administración', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Según necesidad', evaluacion: '0% avance', seguimiento: 'Seguimiento en el último año de administración' }
    ],
    2: [
      { nombre: 'Sensibilización sobre articulación del control interno y externo', descripcion: 'Programar sesiones en comités estratégicos sobre la articulación del sistema', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento semestral', evaluacion: '60% avance', seguimiento: 'Socializar guía de auditoría en comités institucionales' },
      { nombre: 'Acompañar formulación de planes de mejoramiento', descripcion: 'Asesorar a los procesos en la formulación de planes de mejoramiento', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento trimestral', evaluacion: '60% avance', seguimiento: 'Suministrar herramientas como diagrama causa-efecto' },
      { nombre: 'Adoptar procedimiento de seguimiento al plan de mejoramiento', descripcion: 'Formalizar procedimiento con semaforización y alertas a responsables', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento anual', evaluacion: '60% avance', seguimiento: 'Documentar procedimiento y formato de seguimiento' },
      { nombre: 'Presentar avance del plan de mejoramiento ante el CICC', descripcion: 'Informar sobre el estado de avance del plan de mejoramiento institucional', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento trimestral', evaluacion: '60% avance', seguimiento: 'Socializar resultados en el Comité de Coordinación de Control Interno' },
      { nombre: 'Seguimiento a decisiones en firme de órganos de control', descripcion: 'Monitorear procesos penales, fiscales y disciplinarios relacionados con la entidad', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento semestral', evaluacion: '60% avance', seguimiento: 'Socializar resultados en el CICC' },
      { nombre: 'Desarrollar diagnósticos para mejora en gestión del riesgo', descripcion: 'Realizar diagnósticos en todos los ámbitos de gestión del riesgo', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento semestral', evaluacion: '60% avance', seguimiento: 'Establecer efectividad de controles y socializar en CICC' },
      { nombre: 'Asesorar en la articulación del esquema de líneas de defensa', descripcion: 'Acompañar a la alta dirección en la implementación de las tres líneas de defensa', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento semestral', evaluacion: '60% avance', seguimiento: 'Realizar capacitaciones del esquema de líneas de defensa' },
      { nombre: 'Acompañamiento en batería de indicadores y tableros de control', descripcion: 'Establecer estrategia para el diseño y seguimiento de indicadores', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento semestral', evaluacion: '60% avance', seguimiento: 'Realizar capacitaciones sobre indicadores' }
    ],
    3: [
      { nombre: 'Revisar adecuación de la política de administración del riesgo', descripcion: 'Evaluar actualización y cumplimiento de la política de gestión del riesgo', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento semestral', evaluacion: '48% avance', seguimiento: 'Verificar formalización y contenido de la política conforme a la guía DAFP' },
      { nombre: 'Promover comprensión del valor de la gestión de riesgos', descripcion: 'Generar escenarios para que la dirección comprenda la importancia de la gestión de riesgos', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento semestral', evaluacion: '48% avance', seguimiento: 'Proporcionar información de riesgos para toma de decisiones' },
      { nombre: 'Evaluar prácticas actuales de gestión del riesgo', descripcion: 'Migrar a esquemas más efectivos y articular con líneas de defensa', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento cuatrimestral', evaluacion: '48% avance', seguimiento: 'Socializar resultados en el CICC' }
    ],
    4: [
      { nombre: 'Efectuar auditorías internas con enfoque preventivo', descripcion: 'Realizar auditorías internas y especiales conforme al programa anual', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento mensual', evaluacion: '60% avance', seguimiento: 'Seguimiento al cumplimiento del programa de auditoría' },
      { nombre: 'Seguimiento a planes de mejoramiento internos y externos', descripcion: 'Monitorear cumplimiento de planes de mejoramiento derivados de auditorías', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento trimestral', evaluacion: '60% avance', seguimiento: 'Asesorar y suministrar herramientas como diagrama causa-efecto' }
    ],
    5: [
      { nombre: 'Brindar asesoría y generar alertas oportunas', descripcion: 'Alertar a responsables sobre información requerida por organismos de control', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Seguimiento mensual', evaluacion: '59% avance', seguimiento: 'Publicar informes en web y enviar a procesos responsables' },
      { nombre: 'Adelantar procesos de auditoría de organismos de control', descripcion: 'Acompañar de manera armónica las auditorías de control externo', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Según necesidad', evaluacion: '59% avance', seguimiento: 'Dar asesoría puntual a procesos y líderes' },
      // ═══════════════════ INFORMES DE LEY OBLIGATORIOS (17 actividades separadas) ═══════════════════
      { nombre: 'Informe de Pormenorizado del Estado del Control Interno', descripcion: 'Presentar ante el CICC y Director Nacional informe detallado del estado del sistema de control interno (Decreto 648/2017, Art. 12)', fechaInicio: '2026-01-01', fechaFin: '2026-02-28', control: 'Anual - Febrero', evaluacion: 'Cumplimiento normativo', seguimiento: 'Publicar en página web y radicar ante organismos de control' },
      { nombre: 'Plan Anual de Auditoría Interna', descripcion: 'Elaborar y aprobar el plan anual de auditoría basado en riesgos institucionales (Decreto 648/2017)', fechaInicio: '2026-01-01', fechaFin: '2026-03-31', control: 'Anual - Marzo', evaluacion: 'Cumplimiento normativo', seguimiento: 'Aprobación en CICC y socialización institucional' },
      { nombre: 'Informe de Auditorías Realizadas', descripcion: 'Consolidar y reportar todas las auditorías internas ejecutadas durante la vigencia', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Anual - Diciembre', evaluacion: 'Cumplimiento normativo', seguimiento: 'Incluir hallazgos, recomendaciones y planes de mejoramiento' },
      { nombre: 'Informe de Seguimiento a Planes de Mejoramiento', descripcion: 'Realizar seguimiento trimestral al cumplimiento de planes de mejoramiento internos y externos', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Trimestral', evaluacion: 'Cumplimiento normativo', seguimiento: 'Presentar en CICC con semaforización de avances' },
      { nombre: 'Informe de Evaluación del Sistema de Control Interno Contable', descripcion: 'Evaluar el diseño, desarrollo y efectividad del sistema de control interno contable (Resolución 357/2008 CGN)', fechaInicio: '2026-10-01', fechaFin: '2026-11-30', control: 'Anual - Noviembre', evaluacion: 'Cumplimiento normativo', seguimiento: 'Presentar ante Contaduría General de la Nación' },
      { nombre: 'Informe de Austeridad del Gasto Público', descripcion: 'Verificar cumplimiento de medidas de austeridad establecidas en la normatividad vigente (Decreto 984/2012)', fechaInicio: '2026-01-01', fechaFin: '2026-02-28', control: 'Anual - Febrero', evaluacion: 'Cumplimiento normativo', seguimiento: 'Publicar en página web institucional' },
      { nombre: 'Informe de Evaluación de Gestión y Resultados', descripcion: 'Evaluar la gestión institucional y el cumplimiento de metas del plan estratégico', fechaInicio: '2026-01-01', fechaFin: '2026-02-28', control: 'Anual - Febrero', evaluacion: 'Cumplimiento normativo', seguimiento: 'Presentar ante Director Nacional y publicar en web' },
      { nombre: 'Informe de Evaluación de Política de Administración del Riesgo', descripcion: 'Evaluar el diseño, desarrollo y efectividad de la política de administración del riesgo institucional', fechaInicio: '2026-01-01', fechaFin: '2026-06-30', control: 'Semestral', evaluacion: 'Cumplimiento normativo', seguimiento: 'Presentar en CICC con recomendaciones de mejora' },
      { nombre: 'Informe de Evaluación del Código de Integridad', descripcion: 'Evaluar la implementación y seguimiento del Código de Integridad institucional (Decreto 1081/2015)', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Anual - Diciembre', evaluacion: 'Cumplimiento normativo', seguimiento: 'Incluir nivel de apropiación y casos de incumplimiento' },
      { nombre: 'Informe de Seguimiento al Plan Anticorrupción y de Atención al Ciudadano', descripcion: 'Verificar el cumplimiento de metas del Plan Anticorrupción y de Atención al Ciudadano (Ley 1474/2011)', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Cuatrimestral', evaluacion: 'Cumplimiento normativo', seguimiento: 'Presentar avances y alertas en CICC' },
      { nombre: 'Informe de Seguimiento a Acciones Correctivas de Auditorías Externas', descripcion: 'Hacer seguimiento a hallazgos de Contraloría, Procuraduría y otros entes de control', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Trimestral', evaluacion: 'Cumplimiento normativo', seguimiento: 'Alertar sobre vencimientos y nivel de cumplimiento' },
      { nombre: 'Informe de Rendición de la Cuenta Fiscal', descripcion: 'Certificar la consistencia y veracidad de la información reportada en el Consolidador de Hacienda e Información Pública (CHIP)', fechaInicio: '2026-01-01', fechaFin: '2026-02-15', control: 'Anual - Febrero', evaluacion: 'Cumplimiento normativo', seguimiento: 'Remitir certificación a la Contraloría General' },
      { nombre: 'Informe de Gestión Anual de la OCIG', descripcion: 'Consolidar y presentar la gestión anual de la Oficina de Control Interno con estadísticas y resultados', fechaInicio: '2026-01-01', fechaFin: '2026-01-31', control: 'Anual - Enero', evaluacion: 'Cumplimiento normativo', seguimiento: 'Publicar en página web y presentar ante Director Nacional' },
      { nombre: 'Informe de Seguimiento a Denuncias y Quejas', descripcion: 'Consolidar el seguimiento realizado a denuncias y quejas recibidas por la OCIG', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Semestral', evaluacion: 'Cumplimiento normativo', seguimiento: 'Presentar estadísticas y acciones adelantadas en CICC' },
      { nombre: 'Informe de Evaluación de Trámites y Servicios', descripcion: 'Evaluar la eficiencia y efectividad de los trámites y servicios institucionales al ciudadano', fechaInicio: '2026-01-01', fechaFin: '2026-06-30', control: 'Anual - Junio', evaluacion: 'Cumplimiento normativo', seguimiento: 'Publicar en página web con recomendaciones' },
      { nombre: 'Informe de Evaluación del Sistema de Gestión Documental', descripcion: 'Evaluar el cumplimiento de la política de gestión documental y archivo (Ley 594/2000)', fechaInicio: '2026-01-01', fechaFin: '2026-11-30', control: 'Anual - Noviembre', evaluacion: 'Cumplimiento normativo', seguimiento: 'Verificar tablas de retención y archivo de gestión' },
      { nombre: 'Informe de Seguimiento a Recomendaciones de Auditorías Anteriores', descripcion: 'Verificar el cumplimiento de recomendaciones formuladas en auditorías de vigencias anteriores', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', control: 'Trimestral', evaluacion: 'Cumplimiento normativo', seguimiento: 'Presentar estado de implementación en CICC' }
    ]
  };
  
  return actividadesPorRol[numeroRol] || [];
}

// ════════════════════════════════════════════════════════════════════════════
// WIZARD DE CREACIÓN
// ════════════════════════════════════════════════════════════════════════════

interface WizardCreacionProps {
  onCancelar: () => void;
  onCrear: (vigencia: number, jefeOCI: Auditor, rolesConfig: RolConfig[]) => void;
}

export function WizardCreacion({ onCancelar, onCrear }: WizardCreacionProps) {
  const [paso, setPaso] = useState(1);
  const [vigencia, setVigencia] = useState(new Date().getFullYear());
  const [fechaInicio, setFechaInicio] = useState(`${new Date().getFullYear()}-01-01`);
  const [fechaFin, setFechaFin] = useState(`${new Date().getFullYear()}-12-31`);
  
  // Estado para auditores cargados desde backend (profesionales OCIG configurados)
  const [auditores, setAuditores] = useState<Auditor[]>(AUDITORES_DEFAULT);
  const [jefesOCIG, setJefesOCIG] = useState<Auditor[]>([]);
  const [cargandoAuditores, setCargandoAuditores] = useState(true);
  const [jefeSeleccionado, setJefeSeleccionado] = useState<Auditor | null>(null);
  
  // Cargar profesionales OCIG configurados al montar el componente
  useEffect(() => {
    const cargarAuditores = async () => {
      setCargandoAuditores(true);
      try {
        // Usar profesionales OCIG configurados en lugar de personas disponibles
        const response = await configuracionesProfesionalesOCIGApi.getAll();
        console.log('[PlanAnual] Profesionales OCIG response:', response);
        
        if (response.success && response.data && response.data.length > 0) {
          // Transformar a formato Auditor
          const profesionales: Auditor[] = response.data
            .filter((config: any) => config.activo)
            .map((config: any) => ({
              id: String(config.idTercero),
              nombre: config.nombre || `Profesional ${config.idTercero}`,
              cargo: config.rolOcig || 'Auditor',
              email: config.email || ''
            }));
          
          setAuditores(profesionales);
          
          // Filtrar solo los que son Jefe OCIG
          const jefes = profesionales.filter((a: Auditor) => 
            a.cargo === 'Jefe OCIG' || a.cargo.toLowerCase().includes('jefe')
          );
          setJefesOCIG(jefes.length > 0 ? jefes : profesionales);
          
          // Seleccionar el primer jefe como jefe por defecto
          if (jefes.length > 0) {
            setJefeSeleccionado(jefes[0]);
          } else if (profesionales.length > 0) {
            setJefeSeleccionado(profesionales[0]);
          }
          
          console.log('[PlanAnual] Profesionales OCIG cargados:', profesionales.length, 'Jefes:', jefes.length);
        } else {
          console.warn('[PlanAnual] No hay profesionales OCIG configurados, usando fallback');
          toast.warning('No hay profesionales OCIG configurados', {
            description: 'Configura el equipo en el módulo de Configuración'
          });
          setJefesOCIG(AUDITORES_DEFAULT);
          setJefeSeleccionado(AUDITORES_DEFAULT[0]);
        }
      } catch (error) {
        console.error('[PlanAnual] Error cargando profesionales OCIG:', error);
        toast.error('Error al cargar profesionales OCIG');
        setJefesOCIG(AUDITORES_DEFAULT);
        setJefeSeleccionado(AUDITORES_DEFAULT[0]);
      } finally {
        setCargandoAuditores(false);
      }
    };
    
    cargarAuditores();
  }, []);
  const [rolesConfig, setRolesConfig] = useState<RolConfig[]>(() => 
    ROLES_DECRETO_648.map(rol => {
      const actividades = getActividadesPorRol(rol.numero);
      
      // Agregar puntos de control de ejemplo a las primeras 2 actividades de cada rol
      // ⚡ También agregar tipoEvidencia por defecto 'SOLO_CHECK' e ID único
      const actividadesConPuntos = actividades.map((act, idx) => {
        const uniqueId = `rol-${rol.numero}-act-${idx}`; // ⚡ ID único por rol e índice
        if (idx === 0) {
          // Primera actividad: Puntos trimestrales
          return {
            ...act,
            id: uniqueId, // ⚡ Agregar ID
            tipoEvidencia: 'SOLO_CHECK' as const, // ⚡ Valor por defecto
            puntosControl: [
              { id: 'pc-1', orden: 1, nombre: 'Trimestral #1', descripcion: 'Punto de control trimestral', fechaProgramada: '2026-03-31', fechaReal: null, responsable: '', estado: 'pendiente' as const, observaciones: '', evidencias: [] },
              { id: 'pc-2', orden: 2, nombre: 'Trimestral #2', descripcion: 'Punto de control trimestral', fechaProgramada: '2026-06-30', fechaReal: null, responsable: '', estado: 'pendiente' as const, observaciones: '', evidencias: [] },
              { id: 'pc-3', orden: 3, nombre: 'Trimestral #3', descripcion: 'Punto de control trimestral', fechaProgramada: '2026-09-30', fechaReal: null, responsable: '', estado: 'pendiente' as const, observaciones: '', evidencias: [] },
              { id: 'pc-4', orden: 4, nombre: 'Trimestral #4', descripcion: 'Punto de control trimestral', fechaProgramada: '2026-12-31', fechaReal: null, responsable: '', estado: 'pendiente' as const, observaciones: '', evidencias: [] }
            ],
            frecuenciaPuntosControl: 'trimestral' as const
          };
        } else if (idx === 1) {
          // Segunda actividad: Puntos semestrales
          return {
            ...act,
            id: uniqueId, // ⚡ Agregar ID
            tipoEvidencia: 'SOLO_CHECK' as const, // ⚡ Valor por defecto
            puntosControl: [
              { id: 'pc-5', orden: 1, nombre: 'Semestral #1', descripcion: 'Punto de control semestral', fechaProgramada: '2026-06-30', fechaReal: null, responsable: '', estado: 'pendiente' as const, observaciones: '', evidencias: [] },
              { id: 'pc-6', orden: 2, nombre: 'Semestral #2', descripcion: 'Punto de control semestral', fechaProgramada: '2026-12-31', fechaReal: null, responsable: '', estado: 'pendiente' as const, observaciones: '', evidencias: [] }
            ],
            frecuenciaPuntosControl: 'semestral' as const
          };
        }
        // ⚡ Actividades sin puntos de control también tienen tipoEvidencia por defecto
        return {
          ...act,
          id: uniqueId, // ⚡ Agregar ID
          tipoEvidencia: 'SOLO_CHECK' as const
        };
      });
      
      return {
        ...rol,
        actividadesSeleccionadas: actividadesConPuntos,
        actividadesCustom: [],
        responsables: []
      };
    })
  );

  // Validación del Paso 1: Fechas y vigencia
  const validarPaso1 = () => {
    // Extraer año directamente del string YYYY-MM-DD para evitar problemas de zona horaria
    const anioFechaInicio = fechaInicio ? parseInt(fechaInicio.split('-')[0], 10) : 0;
    const anioFechaFin = fechaFin ? parseInt(fechaFin.split('-')[0], 10) : 0;
    
    // Validar que la fecha fin no sea anterior a fecha inicio (comparación string funciona para YYYY-MM-DD)
    if (fechaFin < fechaInicio) {
      toast.error('Error de fechas', {
        description: 'La fecha de finalización no puede ser anterior a la fecha de inicio'
      });
      return false;
    }
    
    // Validar que las fechas coincidan con la vigencia
    if (anioFechaInicio !== vigencia || anioFechaFin !== vigencia) {
      toast.error('Error de vigencia', {
        description: `Las fechas deben estar dentro de la vigencia ${vigencia}. Fecha inicio: ${anioFechaInicio}, Fecha fin: ${anioFechaFin}`
      });
      return false;
    }
    
    // Validar que haya un jefe seleccionado
    if (!jefeSeleccionado) {
      toast.error('Jefe OCI requerido', {
        description: 'Debe seleccionar un Jefe de Control Interno'
      });
      return false;
    }
    
    return true;
  };

  const validarPaso2 = () => {
    // Validar que hay actividades seleccionadas
    const tieneActividades = rolesConfig.some(rol => 
      rol.actividadesSeleccionadas.length > 0 || rol.actividadesCustom.length > 0
    );
    if (!tieneActividades) {
      toast.error('Debe seleccionar al menos una actividad en algún rol');
      return false;
    }
    
    // ⚠️ VALIDACIÓN OBLIGATORIA: Todos los roles con actividades DEBEN tener responsables
    const rolesConActividades = rolesConfig.filter(rol => 
      (rol.actividadesSeleccionadas?.length || 0) + (rol.actividadesCustom?.length || 0) > 0
    );
    const rolesSinResponsables = rolesConActividades.filter(rol => (rol.responsables?.length || 0) === 0);
    
    if (rolesSinResponsables.length > 0) {
      const nombresRoles = rolesSinResponsables.map(r => `Rol ${r.numero}`).join(', ');
      toast.error('Responsables requeridos', {
        description: `Los siguientes roles tienen actividades pero no tienen responsables asignados: ${nombresRoles}. Debe asignar al menos un responsable por rol.`,
        duration: 6000
      });
      return false;
    }
    
    // Contar total de actividades y responsables
    const totalActividades = rolesConActividades.reduce((sum, rol) => 
      sum + (rol.actividadesSeleccionadas?.length || 0) + (rol.actividadesCustom?.length || 0), 0
    );
    const totalResponsables = rolesConActividades.reduce((sum, rol) => 
      sum + (rol.responsables?.length || 0), 0
    );
    
    console.log(`✅ [validarPaso2] Validación exitosa:`);
    console.log(`   - ${rolesConActividades.length} roles con actividades`);
    console.log(`   - ${totalActividades} actividades totales`);
    console.log(`   - ${totalResponsables} responsables asignados`);
    
    return true;
  };

  const avanzarPaso = () => {
    if (paso === 1 && !validarPaso1()) return;
    if (paso === 2 && !validarPaso2()) return;
    setPaso(paso + 1);
  };

  const handleFinalizar = () => {
    // Validación final de seguridad antes de crear el plan
    const rolesConActividades = rolesConfig.filter(rol => 
      (rol.actividadesSeleccionadas?.length || 0) + (rol.actividadesCustom?.length || 0) > 0
    );
    const totalResponsables = rolesConActividades.reduce((sum, rol) => 
      sum + (rol.responsables?.length || 0), 0
    );
    
    if (totalResponsables === 0) {
      toast.error('No se puede crear el Plan Anual', {
        description: 'Debe asignar al menos un responsable a las actividades antes de crear el plan.',
        duration: 5000
      });
      return;
    }
    
    onCrear(vigencia, jefeSeleccionado, rolesConfig);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col bg-white"
    >
      {/* Header */}
      <div className="border-b-2 border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onCancelar} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Crear Plan Anual</h1>
              <p className="text-sm text-gray-600">Paso {paso} de 3</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((num) => (
            <div key={num} className={`flex-1 h-2 rounded-full ${num <= paso ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {paso === 1 && (
              <Paso1 
                key="paso1" 
                vigencia={vigencia} 
                onVigenciaChange={setVigencia} 
                jefeOCI={jefeSeleccionado} 
                onJefeChange={setJefeSeleccionado}
                fechaInicio={fechaInicio}
                onFechaInicioChange={setFechaInicio}
                fechaFin={fechaFin}
                onFechaFinChange={setFechaFin}
                auditores={jefesOCIG}
                cargandoAuditores={cargandoAuditores}
              />
            )}
            {paso === 2 && <Paso2 key="paso2" rolesConfig={rolesConfig} onRolesChange={setRolesConfig} fechaInicio={fechaInicio} fechaFin={fechaFin} auditores={auditores} />}
            {paso === 3 && <Paso3 key="paso3" vigencia={vigencia} jefeOCI={jefeSeleccionado} rolesConfig={rolesConfig} />}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-200 px-8 py-4 flex justify-between bg-white">
        <button onClick={onCancelar} className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">
          Cancelar
        </button>
        <div className="flex gap-3">
          {paso > 1 && (
            <button onClick={() => setPaso(paso - 1)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">
              Anterior
            </button>
          )}
          {paso < 3 ? (
            <button onClick={avanzarPaso} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2">
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleFinalizar} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2">
              <Check className="w-4 h-4" /> Crear
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Paso 1: Configuración básica
function Paso1({ vigencia, onVigenciaChange, jefeOCI, onJefeChange, fechaInicio, onFechaInicioChange, fechaFin, onFechaFinChange, auditores, cargandoAuditores }: any) {
  // Validaciones de fechas - Extraer año directamente del string YYYY-MM-DD para evitar problemas de zona horaria
  const anioFechaInicio = fechaInicio ? parseInt(fechaInicio.split('-')[0], 10) : vigencia;
  const anioFechaFin = fechaFin ? parseInt(fechaFin.split('-')[0], 10) : vigencia;
  
  // Comparar fechas como strings (formato YYYY-MM-DD se compara correctamente alfabéticamente)
  const errorFechaFinAnterior = fechaFin && fechaInicio && fechaFin < fechaInicio;
  const errorVigenciaNoCoincide = (anioFechaInicio !== vigencia || anioFechaFin !== vigencia);
  
  // Handler para fecha inicio que ajusta automáticamente la fecha fin si es necesario
  const handleFechaInicioChange = (nuevaFechaInicio: string) => {
    onFechaInicioChange(nuevaFechaInicio);
    // Si la fecha fin es anterior a la nueva fecha inicio, ajustar automáticamente
    if (fechaFin && fechaFin < nuevaFechaInicio) {
      onFechaFinChange(nuevaFechaInicio);
    }
  };

  // Handler para vigencia que ajusta las fechas automáticamente
  const handleVigenciaChange = (nuevaVigencia: number) => {
    onVigenciaChange(nuevaVigencia);
    // Ajustar fechas al cambiar vigencia
    onFechaInicioChange(`${nuevaVigencia}-01-01`);
    onFechaFinChange(`${nuevaVigencia}-12-31`);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Configuración básica</h2>
        <p className="text-gray-600">Define la vigencia, periodo de ejecución y el jefe responsable del plan</p>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-8 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Vigencia</label>
          <input 
            type="number" 
            value={vigencia} 
            onChange={(e) => handleVigenciaChange(parseInt(e.target.value))} 
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-bold focus:outline-none focus:border-blue-500" 
          />
          <p className="text-xs text-gray-500 mt-1">Al cambiar la vigencia, las fechas se ajustarán automáticamente</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Fecha de inicio</label>
            <input 
              type="date" 
              value={fechaInicio} 
              onChange={(e) => handleFechaInicioChange(e.target.value)}
              min={`${vigencia}-01-01`}
              max={`${vigencia}-12-31`}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${
                errorVigenciaNoCoincide && anioFechaInicio !== vigencia
                  ? 'border-red-500 bg-red-50 focus:border-red-500' 
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {errorVigenciaNoCoincide && anioFechaInicio !== vigencia && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                ⚠️ El año de la fecha ({anioFechaInicio}) debe coincidir con la vigencia ({vigencia})
              </p>
            )}
            {!errorVigenciaNoCoincide && (
              <p className="text-xs text-gray-500 mt-1">Ajusta al calendario académico o institucional</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Fecha de finalización</label>
            <input 
              type="date" 
              value={fechaFin} 
              onChange={(e) => onFechaFinChange(e.target.value)}
              min={fechaInicio || `${vigencia}-01-01`}
              max={`${vigencia}-12-31`}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${
                errorFechaFinAnterior || (errorVigenciaNoCoincide && anioFechaFin !== vigencia)
                  ? 'border-red-500 bg-red-50 focus:border-red-500' 
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {errorFechaFinAnterior && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                ⚠️ La fecha de finalización no puede ser anterior a la fecha de inicio
              </p>
            )}
            {!errorFechaFinAnterior && errorVigenciaNoCoincide && anioFechaFin !== vigencia && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                ⚠️ El año de la fecha ({anioFechaFin}) debe coincidir con la vigencia ({vigencia})
              </p>
            )}
            {!errorFechaFinAnterior && !errorVigenciaNoCoincide && (
              <p className="text-xs text-gray-500 mt-1">Define el cierre del plan anual</p>
            )}
          </div>
        </div>

        {/* Alerta de errores de validación */}
        {(errorFechaFinAnterior || errorVigenciaNoCoincide) && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Corrige los errores para continuar</p>
              <ul className="text-sm text-red-700 mt-1 space-y-1">
                {errorFechaFinAnterior && (
                  <li>• La fecha de finalización debe ser igual o posterior a la fecha de inicio</li>
                )}
                {errorVigenciaNoCoincide && (
                  <li>• Las fechas de inicio y fin deben estar dentro de la vigencia {vigencia}</li>
                )}
              </ul>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Jefe de Control Interno</label>
          {cargandoAuditores ? (
            <div className="flex items-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-gray-600">Cargando auditores...</span>
            </div>
          ) : (
            <select 
              value={jefeOCI?.id || ''} 
              onChange={(e) => onJefeChange(auditores.find((a: any) => a.id === e.target.value))} 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              {auditores.map((a: any) => (
                <option key={a.id} value={a.id}>{a.nombre} - {a.cargo}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Paso 2: Configuración de roles, actividades y responsables
function Paso2({ 
  rolesConfig, 
  onRolesChange,
  fechaInicio,
  fechaFin,
  auditores
}: { 
  rolesConfig: RolConfig[]; 
  onRolesChange: (config: RolConfig[]) => void;
  fechaInicio: string;
  fechaFin: string;
  auditores: Auditor[];
}) {
  const [rolExpandido, setRolExpandido] = useState<number | string | null>(1);
  const [mostrarFormActividad, setMostrarFormActividad] = useState<number | string | null>(null);
  const [nuevaActividad, setNuevaActividad] = useState<ActividadBase>({
    nombre: '',
    descripcion: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    control: 'Seguimiento trimestral',
    evaluacion: '0% avance',
    seguimiento: 'Por definir'
  });

  // ✅ NUEVO: Estado para configuración de puntos de control
  const [modalPuntosControlAbierto, setModalPuntosControlAbierto] = useState(false);
  const [actividadConfigurando, setActividadConfigurando] = useState<{
    numeroRol: number;
    nombreActividad: string;
    esCustom: boolean;
    indexCustom?: number;
  } | null>(null);

  const toggleActividad = (numeroRol: number, actId: string, nombreActividad: string) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        const yaSeleccionada = rol.actividadesSeleccionadas.some(a => a.id === actId);
        if (yaSeleccionada) {
          // Deseleccionar
          return {
            ...rol,
            actividadesSeleccionadas: rol.actividadesSeleccionadas.filter(a => a.id !== actId)
          };
        } else {
          // Seleccionar
          const actividadBase = getActividadesPorRol(numeroRol)?.find(a => a.nombre === nombreActividad);
          if (actividadBase) {
            return {
              ...rol,
              actividadesSeleccionadas: [...rol.actividadesSeleccionadas, {
                ...actividadBase,
                id: actId, // ⚡ Usar el ID único
                // ⚡ Valor por defecto: SOLO_CHECK (sin requisitos de documentos/observaciones)
                tipoEvidencia: 'SOLO_CHECK' as const
              }]
            };
          }
        }
      }
      return rol;
    });
    onRolesChange(nuevaConfig);
  };

  const estaSeleccionada = (actId: string) => {
    return rolesConfig.some(rol => rol.actividadesSeleccionadas.some(a => a.id === actId));
  };

  const toggleAutorizacionJefeOCIG = (actId: string) => {
    const nuevaConfig = rolesConfig.map(rol => {
      return {
        ...rol,
        actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act => {
          if (act.id === actId) {
            return {
              ...act,
              requiereAutorizacionJefeOCIG: !act.requiereAutorizacionJefeOCIG
            };
          }
          return act;
        })
      };
    });
    onRolesChange(nuevaConfig);
  };

  const cambiarTipoEvidencia = (actId: string, tipo: 'SOLO_CHECK' | 'OBSERVACIONES' | 'ADJUNTOS' | 'COMPLETO') => {
    const nuevaConfig = rolesConfig.map(rol => {
      return {
        ...rol,
        actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act => {
          if (act.id === actId) {
            return {
              ...act,
              tipoEvidencia: tipo
            };
          }
          return act;
        })
      };
    });
    onRolesChange(nuevaConfig);
  };

  const agregarActividadCustom = (numeroRol: number) => {
    if (!nuevaActividad.nombre.trim()) {
      toast.error('El nombre de la actividad es obligatorio');
      return;
    }

    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        return {
          ...rol,
          actividadesCustom: [...rol.actividadesCustom, { 
            ...nuevaActividad,
            // ⚡ Valor por defecto: SOLO_CHECK (sin requisitos de documentos/observaciones)
            tipoEvidencia: 'SOLO_CHECK' as const
          }]
        };
      }
      return rol;
    });

    onRolesChange(nuevaConfig);
    toast.success('Actividad personalizada agregada');
    setNuevaActividad({
      nombre: '',
      descripcion: '',
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaFin: new Date().toISOString().split('T')[0],
      control: 'Seguimiento trimestral',
      evaluacion: '0% avance',
      seguimiento: 'Por definir'
    });
    setMostrarFormActividad(null);
  };

  const eliminarActividadCustom = (numeroRol: number, index: number) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        return {
          ...rol,
          actividadesCustom: rol.actividadesCustom.filter((_, i) => i !== index)
        };
      }
      return rol;
    });
    onRolesChange(nuevaConfig);
    toast.success('Actividad eliminada');
  };

  const toggleAutorizacionCustom = (numeroRol: number, index: number) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        return {
          ...rol,
          actividadesCustom: rol.actividadesCustom.map((act, i) => {
            if (i === index) {
              return {
                ...act,
                requiereAutorizacionJefeOCIG: !act.requiereAutorizacionJefeOCIG
              };
            }
            return act;
          })
        };
      }
      return rol;
    });
    onRolesChange(nuevaConfig);
  };

  const cambiarTipoEvidenciaCustom = (numeroRol: number, index: number, tipo: 'SOLO_CHECK' | 'OBSERVACIONES' | 'ADJUNTOS' | 'COMPLETO') => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        return {
          ...rol,
          actividadesCustom: rol.actividadesCustom.map((act, i) => {
            if (i === index) {
              return {
                ...act,
                tipoEvidencia: tipo
              };
            }
            return act;
          })
        };
      }
      return rol;
    });
    onRolesChange(nuevaConfig);
  };

  // ✅ NUEVO: Funciones para configurar puntos de control
  const abrirConfiguracionPuntosControl = (numeroRol: number, nombreActividad: string, esCustom: boolean, indexCustom?: number) => {
    setActividadConfigurando({ numeroRol, nombreActividad, esCustom, indexCustom });
    setModalPuntosControlAbierto(true);
  };

  const guardarPuntosControl = (puntos: PuntoControl[], frecuencia: FrecuenciaPuntoControl) => {
    if (!actividadConfigurando) return;

    const { numeroRol, nombreActividad, esCustom, indexCustom } = actividadConfigurando;

    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        if (esCustom && indexCustom !== undefined) {
          // Actualizar actividad custom
          return {
            ...rol,
            actividadesCustom: rol.actividadesCustom.map((act, i) => {
              if (i === indexCustom) {
                return {
                  ...act,
                  puntosControl: puntos,
                  frecuenciaPuntosControl: frecuencia
                };
              }
              return act;
            })
          };
        } else {
          // Actualizar actividad seleccionada
          return {
            ...rol,
            actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act => {
              if (act.nombre === nombreActividad) {
                return {
                  ...act,
                  puntosControl: puntos,
                  frecuenciaPuntosControl: frecuencia
                };
              }
              return act;
            })
          };
        }
      }
      return rol;
    });

    onRolesChange(nuevaConfig);
    setModalPuntosControlAbierto(false);
    setActividadConfigurando(null);
  };

  const totalActividades = rolesConfig.reduce((sum, rol) => 
    sum + rol.actividadesSeleccionadas.length + rol.actividadesCustom.length, 0
  );

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Configuración de roles y actividades</h2>
        <p className="text-gray-600">Selecciona las actividades del Decreto 648/2017 y asigna los responsables para cada rol estratégico</p>
      </div>

      {/* Resumen */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700 mb-1">Total de actividades configuradas</p>
            <p className="text-3xl font-bold text-blue-900">{totalActividades}</p>
          </div>
          <CheckCircle2 className="w-12 h-12 text-blue-600" />
        </div>
      </div>

      {/* Roles configurables */}
      <div className="space-y-4">
        {rolesConfig.map((rol) => {
          const isExpanded = rolExpandido === rol.numero;
          const actividadesBase = getActividadesPorRol(rol.numero);
          const totalRol = rol.actividadesSeleccionadas.length + rol.actividadesCustom.length;

          return (
            <div key={rol.numero} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setRolExpandido(isExpanded ? null : rol.numero)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ backgroundColor: rol.color + '20' }}>
                    {rol.icono}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Rol {rol.numero}: {rol.nombre}</h3>
                    <p className="text-sm text-gray-600">
                      {totalRol} actividades • {rol.responsables.length} responsables
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-lg text-sm font-semibold" style={{ 
                    backgroundColor: rol.color + '20', 
                    color: rol.color 
                  }}>
                    {totalRol}/{actividadesBase.length}
                  </span>
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.div>
                </div>
              </div>

              {/* Content expandible */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-4 border-t-2 border-gray-200">
                      {/* Sección de responsables */}
                      <div className="pt-4">
                        {/* Mensaje informativo */}
                        <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded text-sm text-blue-800">
                          <p className="font-semibold mb-1">💡 ¿Cómo funciona la asignación?</p>
                          <p className="text-xs">
                            <strong>Si asignas responsables aquí:</strong> Las actividades de este rol se distribuirán automáticamente entre ellos.<br/>
                            <strong>Si no asignas responsables:</strong> Las actividades quedarán sin asignar y podrás hacerlo manualmente después.
                          </p>
                        </div>
                        
                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Users className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">Responsables del rol (opcional)</p>
                                <p className="text-xs text-gray-600 mt-0.5">
                                  {(rol.responsables?.length || 0) === 0 
                                    ? 'Puedes asignar responsables ahora o después' 
                                    : `${rol.responsables.length} auditor${rol.responsables.length !== 1 ? 'es' : ''} asignado${rol.responsables.length !== 1 ? 's' : ''}`
                                  }
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Lista de responsables asignados */}
                          {(rol.responsables?.length || 0) > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {rol.responsables.map((auditor: any) => (
                                <div key={auditor.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-200 text-blue-900 rounded-lg text-xs font-medium">
                                  <span>👤 {auditor.nombre}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const nuevaConfig = rolesConfig.map(r => {
                                        if (r.numero === rol.numero) {
                                          return {
                                            ...r,
                                            responsables: r.responsables.filter((resp: any) => resp.id !== auditor.id)
                                          };
                                        }
                                        return r;
                                      });
                                      onRolesChange(nuevaConfig);
                                    }}
                                    className="hover:bg-blue-300 rounded p-0.5 transition-colors"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Selector para agregar responsables */}
                          <div className="flex gap-2">
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  const auditor = auditores.find(a => a.id === e.target.value);
                                  if (auditor) {
                                    const yaAsignado = rol.responsables?.some((r: any) => r.id === auditor.id);
                                    if (yaAsignado) {
                                      toast.error('Este auditor ya está asignado a este rol');
                                      return;
                                    }
                                    
                                    const nuevaConfig = rolesConfig.map(r => {
                                      if (r.numero === rol.numero) {
                                        return {
                                          ...r,
                                          responsables: [...(r.responsables || []), auditor]
                                        };
                                      }
                                      return r;
                                    });
                                    onRolesChange(nuevaConfig);
                                    e.target.value = ''; // Reset selector
                                    toast.success(`${auditor.nombre} asignado al rol`);
                                  }
                                }
                              }}
                              className="flex-1 px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                              defaultValue=""
                            >
                              <option value="" disabled>Seleccionar auditor...</option>
                              {auditores.map((auditor) => (
                                <option key={auditor.id} value={auditor.id}>
                                  {auditor.nombre} - {auditor.cargo}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Actividades del Decreto 648 */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Actividades del Decreto 648/2017
                        </h4>
                        <div className="space-y-2">
                          {actividadesBase.map((actividad, index) => {
                            // ⚡ Generar ID único para esta actividad
                            const actId = `rol-${rol.numero}-act-${index}`;
                            const seleccionada = estaSeleccionada(actId);
                            const actividadData = rol.actividadesSeleccionadas.find(a => a.id === actId);
                            return (
                              <div
                                key={actId}
                                className={`border-2 rounded-lg transition-colors ${
                                  seleccionada
                                    ? 'border-blue-400 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <label className="flex items-start gap-3 p-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={seleccionada}
                                    onChange={() => toggleActividad(rol.numero, actId, actividad.nombre)}
                                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm">{actividad.nombre}</p>
                                    <p className="text-xs text-gray-600 mt-1">{actividad.descripcion}</p>
                                    {seleccionada && actividadData && (
                                      <div className="flex items-center gap-2 mt-1.5">
                                        {(actividadData.tipoEvidencia === 'OBSERVACIONES' || actividadData.tipoEvidencia === 'COMPLETO') && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium">
                                            <FileText className="w-2.5 h-2.5" />
                                            Observaciones
                                          </span>
                                        )}
                                        {(actividadData.tipoEvidencia === 'ADJUNTOS' || actividadData.tipoEvidencia === 'COMPLETO') && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-medium">
                                            <Paperclip className="w-2.5 h-2.5" />
                                            Adjuntos
                                          </span>
                                        )}
                                        {actividadData.requiereAutorizacionJefeOCIG && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-[10px] font-medium">
                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                            Requiere autorización
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </label>
                                
                                {/* Configuración de evidencias - Solo visible si actividad está seleccionada */}
                                {seleccionada && (
                                  <div className="px-3 pb-3 pt-2 border-t border-blue-200 mt-2 space-y-3">
                                    {/* Checkbox de autorización Jefe OCIG */}
                                    <label className="flex items-start gap-2 cursor-pointer p-2 hover:bg-blue-100/50 rounded-lg transition-colors">
                                      <input
                                        type="checkbox"
                                        checked={actividadData?.requiereAutorizacionJefeOCIG || false}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          toggleAutorizacionJefeOCIG(actId);
                                        }}
                                        className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-2 focus:ring-orange-500 mt-0.5"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                          </svg>
                                          <span className="text-xs font-semibold text-orange-900">
                                            Requiere autorización del Jefe OCIG
                                          </span>
                                        </div>
                                        <p className="text-xs text-orange-700 mt-1">
                                          Esta actividad no podrá completarse al 100% sin la autorización del Jefe de la OCIG
                                        </p>
                                      </div>
                                    </label>

                                    {/* Selector de tipo de evidencia - VERSIÓN COMPACTA */}
                                    <div className="p-2 bg-blue-50/50 rounded-lg">
                                      <label className="block text-xs font-semibold text-gray-900 mb-2">
                                        📋 Requisitos para completar
                                      </label>
                                      <div className="flex flex-col gap-1.5">
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-1.5 rounded transition-colors">
                                          <input
                                            type="checkbox"
                                            checked={actividadData?.tipoEvidencia === 'OBSERVACIONES' || actividadData?.tipoEvidencia === 'COMPLETO'}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              const requiereAdjuntos = actividadData?.tipoEvidencia === 'ADJUNTOS' || actividadData?.tipoEvidencia === 'COMPLETO';
                                              const requiereObservaciones = e.target.checked;
                                              
                                              if (requiereObservaciones && requiereAdjuntos) {
                                                cambiarTipoEvidencia(actId, 'COMPLETO');
                                              } else if (requiereObservaciones) {
                                                cambiarTipoEvidencia(actId, 'OBSERVACIONES');
                                              } else if (requiereAdjuntos) {
                                                cambiarTipoEvidencia(actId, 'ADJUNTOS');
                                              } else {
                                                cambiarTipoEvidencia(actId, 'SOLO_CHECK');
                                              }
                                            }}
                                            className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                                          />
                                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                                          <span className="text-xs text-gray-900">Requiere observaciones</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-1.5 rounded transition-colors">
                                          <input
                                            type="checkbox"
                                            checked={actividadData?.tipoEvidencia === 'ADJUNTOS' || actividadData?.tipoEvidencia === 'COMPLETO'}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              const requiereObservaciones = actividadData?.tipoEvidencia === 'OBSERVACIONES' || actividadData?.tipoEvidencia === 'COMPLETO';
                                              const requiereAdjuntos = e.target.checked;
                                              
                                              if (requiereObservaciones && requiereAdjuntos) {
                                                cambiarTipoEvidencia(actId, 'COMPLETO');
                                              } else if (requiereAdjuntos) {
                                                cambiarTipoEvidencia(actId, 'ADJUNTOS');
                                              } else if (requiereObservaciones) {
                                                cambiarTipoEvidencia(actId, 'OBSERVACIONES');
                                              } else {
                                                cambiarTipoEvidencia(actId, 'SOLO_CHECK');
                                              }
                                            }}
                                            className="w-3.5 h-3.5 text-purple-600 rounded border-gray-300 focus:ring-2 focus:ring-purple-500"
                                          />
                                          <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                                          <span className="text-xs text-gray-900">Requiere archivos adjuntos</span>
                                        </label>
                                      </div>
                                    </div>

                                    {/* ✅ NUEVO: Botón para configurar puntos de control */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        abrirConfiguracionPuntosControl(rol.numero, actividad.nombre, false);
                                      }}
                                      className="w-full flex items-center justify-between gap-2 p-3 bg-gradient-to-r from-[#F57C00]/10 to-[#FF6D00]/10 hover:from-[#F57C00]/20 hover:to-[#FF6D00]/20 border-2 border-[#F57C00]/30 rounded-lg transition-all group"
                                    >
                                      <div className="flex items-center gap-2">
                                        <CalendarClock className="w-4 h-4 text-[#F57C00]" />
                                        <span className="text-xs font-semibold text-gray-900">
                                          {actividadData?.puntosControl && actividadData.puntosControl.length > 0
                                            ? `${actividadData.puntosControl.length} punto${actividadData.puntosControl.length !== 1 ? 's' : ''} de control configurado${actividadData.puntosControl.length !== 1 ? 's' : ''}`
                                            : 'Configurar puntos de control'}
                                        </span>
                                      </div>
                                      {actividadData?.puntosControl && actividadData.puntosControl.length > 0 && (
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actividades personalizadas */}
                      {rol.actividadesCustom.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            ⭐ Actividades personalizadas
                          </h4>
                          <div className="space-y-2">
                            {rol.actividadesCustom.map((actividad, index) => (
                              <div
                                key={`rol-${rol.numero}-custom-${index}-${actividad.nombre.slice(0, 20)}`}
                                className="border-2 border-green-200 bg-green-50 rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-start gap-3 p-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm">{actividad.nombre}</p>
                                    <p className="text-xs text-gray-600 mt-1">{actividad.descripcion}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                      {(actividad.tipoEvidencia === 'OBSERVACIONES' || actividad.tipoEvidencia === 'COMPLETO') && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium">
                                          <FileText className="w-2.5 h-2.5" />
                                          Observaciones
                                        </span>
                                      )}
                                      {(actividad.tipoEvidencia === 'ADJUNTOS' || actividad.tipoEvidencia === 'COMPLETO') && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-medium">
                                          <Paperclip className="w-2.5 h-2.5" />
                                          Adjuntos
                                        </span>
                                      )}
                                      {actividad.requiereAutorizacionJefeOCIG && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-[10px] font-medium">
                                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                          </svg>
                                          Requiere autorización
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('¿Eliminar esta actividad personalizada?')) {
                                        eliminarActividadCustom(rol.numero, index);
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-800 p-1"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                                
                                {/* Configuración de evidencias */}
                                <div className="px-3 pb-3 pt-2 border-t border-green-300 mt-2 space-y-3">
                                  {/* Checkbox de autorización Jefe OCIG */}
                                  <label className="flex items-start gap-2 cursor-pointer p-2 hover:bg-green-100/50 rounded-lg transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={actividad.requiereAutorizacionJefeOCIG || false}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        toggleAutorizacionCustom(rol.numero, index);
                                      }}
                                      className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-2 focus:ring-orange-500 mt-0.5"
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-xs font-semibold text-orange-900">
                                          Requiere autorización del Jefe OCIG
                                        </span>
                                      </div>
                                      <p className="text-xs text-orange-700 mt-1">
                                        Esta actividad no podrá completarse al 100% sin la autorización del Jefe de la OCIG
                                      </p>
                                    </div>
                                  </label>

                                  {/* Selector de tipo de evidencia */}
                                  <div className="p-2 bg-green-50/50 rounded-lg">
                                    <label className="block text-xs font-semibold text-gray-900 mb-2">
                                      📋 Requisitos para completar
                                    </label>
                                    <div className="flex flex-col gap-1.5">
                                      <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-1.5 rounded transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={actividad.tipoEvidencia === 'OBSERVACIONES' || actividad.tipoEvidencia === 'COMPLETO'}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            const requiereAdjuntos = actividad.tipoEvidencia === 'ADJUNTOS' || actividad.tipoEvidencia === 'COMPLETO';
                                            const requiereObservaciones = e.target.checked;
                                            
                                            if (requiereObservaciones && requiereAdjuntos) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'COMPLETO');
                                            } else if (requiereObservaciones) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'OBSERVACIONES');
                                            } else if (requiereAdjuntos) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'ADJUNTOS');
                                            } else {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'SOLO_CHECK');
                                            }
                                          }}
                                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                                        />
                                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="text-xs text-gray-900">Requiere observaciones</span>
                                      </label>

                                      <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-1.5 rounded transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={actividad.tipoEvidencia === 'ADJUNTOS' || actividad.tipoEvidencia === 'COMPLETO'}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            const requiereObservaciones = actividad.tipoEvidencia === 'OBSERVACIONES' || actividad.tipoEvidencia === 'COMPLETO';
                                            const requiereAdjuntos = e.target.checked;
                                            
                                            if (requiereObservaciones && requiereAdjuntos) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'COMPLETO');
                                            } else if (requiereAdjuntos) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'ADJUNTOS');
                                            } else if (requiereObservaciones) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'OBSERVACIONES');
                                            } else {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'SOLO_CHECK');
                                            }
                                          }}
                                          className="w-3.5 h-3.5 text-purple-600 rounded border-gray-300 focus:ring-2 focus:ring-purple-500"
                                        />
                                        <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                                        <span className="text-xs text-gray-900">Requiere archivos adjuntos</span>
                                      </label>
                                    </div>
                                  </div>

                                  {/* ✅ NUEVO: Botón para configurar puntos de control en actividades custom */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      abrirConfiguracionPuntosControl(rol.numero, actividad.nombre, true, index);
                                    }}
                                    className="w-full flex items-center justify-between gap-2 p-3 bg-gradient-to-r from-[#F57C00]/10 to-[#FF6D00]/10 hover:from-[#F57C00]/20 hover:to-[#FF6D00]/20 border-2 border-[#F57C00]/30 rounded-lg transition-all group"
                                  >
                                    <div className="flex items-center gap-2">
                                      <CalendarClock className="w-4 h-4 text-[#F57C00]" />
                                      <span className="text-xs font-semibold text-gray-900">
                                        {actividad.puntosControl && actividad.puntosControl.length > 0
                                          ? `${actividad.puntosControl.length} punto${actividad.puntosControl.length !== 1 ? 's' : ''} de control configurado${actividad.puntosControl.length !== 1 ? 's' : ''}`
                                          : 'Configurar puntos de control'}
                                      </span>
                                    </div>
                                    {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Formulario nueva actividad */}
                      {mostrarFormActividad === rol.numero ? (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 border-2 border-blue-300 bg-blue-50 rounded-lg space-y-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-blue-900">Nueva actividad personalizada</h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMostrarFormActividad(null);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ✕
                            </button>
                          </div>
                          <input
                            type="text"
                            value={nuevaActividad.nombre}
                            onChange={(e) => setNuevaActividad({ ...nuevaActividad, nombre: e.target.value })}
                            placeholder="Nombre de la actividad"
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <textarea
                            value={nuevaActividad.descripcion}
                            onChange={(e) => setNuevaActividad({ ...nuevaActividad, descripcion: e.target.value })}
                            placeholder="Descripción"
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                            rows={2}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                agregarActividadCustom(rol.numero);
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                            >
                              ✓ Agregar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMostrarFormActividad(null);
                              }}
                              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
                            >
                              Cancelar
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMostrarFormActividad(rol.numero);
                          }}
                          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg text-gray-600 hover:text-blue-600 font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Agregar actividad personalizada
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ✅ NUEVO: Modal de configuración de puntos de control */}
      {modalPuntosControlAbierto && actividadConfigurando && (
        <ModalConfiguracionPuntosControl
          isOpen={modalPuntosControlAbierto}
          onClose={() => {
            setModalPuntosControlAbierto(false);
            setActividadConfigurando(null);
          }}
          nombreActividad={actividadConfigurando.nombreActividad}
          fechaInicioActividad={fechaInicio}
          fechaFinActividad={fechaFin}
          puntosControlExistentes={
            (() => {
              const rol = rolesConfig.find(r => r.numero === actividadConfigurando.numeroRol);
              if (!rol) return [];
              
              if (actividadConfigurando.esCustom && actividadConfigurando.indexCustom !== undefined) {
                const actividad = rol.actividadesCustom[actividadConfigurando.indexCustom];
                return actividad?.puntosControl || [];
              } else {
                const actividad = rol.actividadesSeleccionadas.find(
                  a => a.nombre === actividadConfigurando.nombreActividad
                );
                return actividad?.puntosControl || [];
              }
            })()
          }
          frecuenciaActual={
            (() => {
              const rol = rolesConfig.find(r => r.numero === actividadConfigurando.numeroRol);
              if (!rol) return undefined;
              
              if (actividadConfigurando.esCustom && actividadConfigurando.indexCustom !== undefined) {
                const actividad = rol.actividadesCustom[actividadConfigurando.indexCustom];
                return actividad?.frecuenciaPuntosControl;
              } else {
                const actividad = rol.actividadesSeleccionadas.find(
                  a => a.nombre === actividadConfigurando.nombreActividad
                );
                return actividad?.frecuenciaPuntosControl;
              }
            })()
          }
          onGuardar={guardarPuntosControl}
        />
      )}
    </motion.div>
  );
}

// Paso 3: Confirmación
function Paso3({ vigencia, jefeOCI, rolesConfig }: any) {
  const totalActividades = rolesConfig.reduce((total: number, rol: any) => {
    return total + (rol.actividadesSeleccionadas?.length || 0) + (rol.actividadesCustom?.length || 0);
  }, 0);

  const totalResponsables = rolesConfig.reduce((total: number, rol: any) => {
    return total + (rol.responsables?.length || 0);
  }, 0);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Confirmación</h2>
        <p className="text-gray-600">Revisa la información antes de crear el plan</p>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
        <h3 className="font-bold text-gray-900 mb-4">Resumen del plan</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Vigencia:</span>
            <span className="font-bold text-gray-900">{vigencia}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Jefe responsable:</span>
            <span className="font-bold text-gray-900">{jefeOCI.nombre}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Roles configurados:</span>
            <span className="font-bold text-gray-900">5 roles obligatorios</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Total actividades:</span>
            <span className="font-bold text-gray-900">{totalActividades} actividades</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Total responsables:</span>
            <span className="font-bold text-gray-900">{totalResponsables} auditores asignados</span>
          </div>
        </div>

        {/* Detalle por rol */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-bold text-gray-900 mb-4">Detalle por rol</h4>
          <div className="space-y-3">
            {rolesConfig.map((rol: any) => {
              const numActividades = (rol.actividadesSeleccionadas?.length || 0) + (rol.actividadesCustom?.length || 0);
              if (numActividades === 0) return null;
              
              return (
                <div key={rol.numero} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm ${
                      rol.numero === 1 ? 'bg-blue-600' :
                      rol.numero === 2 ? 'bg-purple-600' :
                      rol.numero === 3 ? 'bg-green-600' :
                      rol.numero === 4 ? 'bg-orange-600' :
                      'bg-red-600'
                    }`}>
                      {rol.numero}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{rol.nombre}</p>
                      <p className="text-xs text-gray-600">
                        {numActividades} actividad{numActividades !== 1 ? 'es' : ''} • {rol.responsables?.length || 0} responsable{(rol.responsables?.length || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD DEL PLAN - VERSION SIMPLIFICADA
// ════════════════════════════════════════════════════════════════════════════

interface DashboardPlanProps {
  plan: PlanAnual;
  onActualizar: (plan: PlanAnual) => void;
  onRefetchPlan?: () => Promise<void>; // Recargar plan desde backend tras guardar (para reflejar datos y adjuntos)
  onVolver: () => void;
  onAbrirRol4?: () => void;
  onCrearNuevo?: () => void; // Nueva prop para crear un nuevo plan
  planesAnteriores?: PlanAnual[]; // Historial de planes anteriores
}

export function DashboardPlan({ plan, onActualizar, onRefetchPlan, onVolver, onAbrirRol4, onCrearNuevo, planesAnteriores = [] }: DashboardPlanProps) {
  const [seccion, setSeccion] = useState<'gestion' | 'asignar' | 'aprobar'>('gestion');
  const [mostrarModalExportacion, setMostrarModalExportacion] = useState(false);
  const [exportando, setExportando] = useState<'excel' | 'pdf' | null>(null);
  
  // Estado para auditores cargados desde backend
  const [auditores, setAuditores] = useState<Auditor[]>([]);
  const [cargandoAuditores, setCargandoAuditores] = useState(true);
  
  const { puedeRealizar } = useControlInternoPermissions();
  const puedeAprobarPlan = puedeRealizar('planificacion', 'approve');

  // Cargar auditores desde backend al montar el componente (profesionales OCIG configurados)
  useEffect(() => {
    const cargarAuditores = async () => {
      setCargandoAuditores(true);
      try {
        const response = await configuracionesProfesionalesOCIGApi.getAll();
        if (response.success && response.data) {
          // Mapear profesionales OCIG a formato Auditor
          const auditoresMapeados: Auditor[] = response.data
            .filter((p) => p.activo && p.nombre)
            .map((p) => ({
              id: String(p.idTercero),
              nombre: p.nombre || '',
              cargo: p.cargo || 'Profesional OCIG',
              email: p.email || ''
            }));
          setAuditores(auditoresMapeados);
        }
      } catch (error) {
        console.error('Error cargando auditores:', error);
      } finally {
        setCargandoAuditores(false);
      }
    };
    
    cargarAuditores();
  }, []);

  // Estadísticas
  const totalActividades = plan.roles.reduce((sum, rol) => sum + rol.actividades.length, 0);
  const actividadesAsignadas = plan.roles.reduce((sum, rol) => sum + rol.actividades.filter(a => a.responsable !== null).length, 0);
  const actividadesCompletadas = plan.roles.reduce((sum, rol) => sum + rol.actividades.filter(a => a.estado === 'COMPLETADA').length, 0);
  const actividadesEnEjecucion = plan.roles.reduce((sum, rol) => sum + rol.actividades.filter(a => a.estado === 'EN_EJECUCION').length, 0);
  const avancePromedio = Math.round(plan.roles.reduce((sum, rol) => sum + rol.actividades.reduce((s, a) => s + a.porcentajeAvance, 0), 0) / totalActividades);

  const handleExportarExcel = async () => {
    setExportando('excel');
    setMostrarModalExportacion(false);
    const res = await planAnualApi.exportExcel(plan.id);
    if (res.success) {
      toast.success('Exportado', { description: 'Excel descargado correctamente' });
      setExportando(null);
      return;
    }
    try {
      const XLSX = await import('xlsx');
      const vigencia = plan.vigencia ?? (plan as { año?: number }).año ?? new Date().getFullYear();
      const headers = ['Rol', 'Nº', 'Actividad', 'Descripción', 'Responsable', 'Fecha Inicio', 'Fecha Fin', 'Estado', '% Avance'];
      const rows: unknown[][] = [
        ['Plan Anual de Auditoría - ESAP'],
        [`Vigencia ${vigencia}`, '', '', '', '', '', '', `Estado: ${plan.estado}`],
        [],
        headers,
      ];
      (plan.roles ?? []).forEach((rol) => {
        (rol.actividades ?? []).forEach((a, i) => {
          rows.push([
            rol.nombre,
            i + 1,
            a.nombre,
            a.descripcion ?? '',
            a.responsable?.nombre ?? '',
            a.fechaInicio ?? '',
            a.fechaFin ?? '',
            a.estado ?? '',
            a.porcentajeAvance ?? 0,
          ]);
        });
      });
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Plan Anual');
      XLSX.writeFile(wb, `plan-anual-auditoria-${vigencia}.xlsx`);
      toast.success('Exportado', { description: 'Excel generado correctamente' });
    } catch (e) {
      toast.error('Error al exportar Excel', { description: res.error || (e instanceof Error ? e.message : 'Error desconocido') });
    }
    setExportando(null);
  };

  const handleExportarPDF = async () => {
    setExportando('pdf');
    setMostrarModalExportacion(false);
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const vigencia = plan.vigencia ?? (plan as { año?: number }).año ?? new Date().getFullYear();
      
      // Crear documento PDF con jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      // Header institucional estandarizado
      const alturaEncabezado = dibujarEncabezadoInstitucional(doc, {
        ...DOCUMENTOS_PREDEFINIDOS.PLAN_ANUAL,
        logoImg: logoESAP
      });
      
      let currentY = alturaEncabezado + 5;

      // Vigencia
      doc.setTextColor(0, 61, 165);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Vigencia ${vigencia}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      // Información general
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN GENERAL', margin, currentY);
      currentY += 8;

      const estadoLabel = plan.estado === 'BORRADOR' ? 'Borrador' : 
                          plan.estado === 'EN_REVISION' ? 'En revisión' : 
                          plan.estado === 'APROBADO' ? 'Aprobado' : 
                          plan.estado === 'VIGENTE' ? 'Vigente' : 'Cerrado';

      const infoData = [
        ['Vigencia', vigencia.toString()],
        ['Estado', estadoLabel],
        ['Jefe OCI', plan.jefeOCI?.nombre || ''],
        ['Cargo', plan.jefeOCI?.cargo || ''],
        ['Fecha Creación', new Date(plan.fechaCreacion).toLocaleDateString('es-CO')]
      ];

      autoTable(doc, {
        startY: currentY,
        head: [],
        body: infoData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40 },
          1: { cellWidth: 'auto' }
        },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Actividades por rol
      plan.roles.forEach((rol, rolIdx) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 61, 165);
        doc.text(`ROL ${rol.numero}: ${rol.nombre.toUpperCase()}`, margin, currentY);
        currentY += 7;

        const actividadesData = rol.actividades.map((act, idx) => [
          (idx + 1).toString(),
          act.nombre,
          act.responsable?.nombre || 'Sin asignar',
          act.estado === 'COMPLETADA' ? 'Completada' : 
          act.estado === 'EN_EJECUCION' ? 'En ejecución' : 'Pendiente',
          `${act.porcentajeAvance}%`
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['#', 'Actividad', 'Responsable', 'Estado', 'Avance']],
          body: actividadesData,
          theme: 'striped',
          headStyles: {
            fillColor: [0, 61, 165],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 40 },
            3: { cellWidth: 30, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' }
          },
          margin: { left: margin, right: margin }
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;

        if (currentY > pageHeight - 40 && rolIdx < plan.roles.length - 1) {
          doc.addPage();
          currentY = margin;
        }
      });

      // Footer institucional
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        dibujarPieInstitucional(doc, i, true);
      }

      doc.save(`Plan-Anual-Auditoria-${vigencia}.pdf`);
      toast.success('PDF generado exitosamente', { description: 'Documento con formato institucional oficial ESAP' });
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error('Error al generar PDF', { description: 'Intente nuevamente' });
    }
    setExportando(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white border-b-2 border-gray-200 px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Plan Anual de Auditoría {plan.vigencia}</h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">{plan.id} • Versión {plan.version} • {plan.jefeOCI.nombre}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0">
            <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold border-2 text-sm ${plan.estado === 'VIGENTE' ? 'bg-green-100 text-green-700 border-green-300' : plan.estado === 'APROBADO' ? 'bg-blue-100 text-blue-700 border-blue-300' : plan.estado === 'EN_REVISION' ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
              {plan.estado === 'BORRADOR' ? 'Borrador' : plan.estado === 'EN_REVISION' ? 'En revisión' : plan.estado === 'APROBADO' ? 'Aprobado' : plan.estado === 'VIGENTE' ? 'Vigente' : 'Cerrado'}
            </span>

            {onCrearNuevo && (
              <button 
                onClick={onCrearNuevo}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium flex items-center gap-2 transition-all shadow-md hover:shadow-lg text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline">Crear Nuevo Plan</span>
                <span className="xs:hidden">Nuevo</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMostrarModalExportacion(true)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white rounded-lg font-medium flex items-center gap-2 transition-all shadow-md hover:shadow-lg text-sm"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {mostrarModalExportacion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
            onClick={() => setMostrarModalExportacion(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-[#2962FF] to-[#003DA5] px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Download className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white">Exportar Plan Anual</h2>
                      <p className="text-sm text-blue-100">Vigencia {plan.vigencia} • {plan.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMostrarModalExportacion(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    disabled={!!exportando}
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-600 mb-6">
                  Selecciona el formato de exportación. El documento incluirá toda la información del Plan Anual según normativa (Decreto 648/2017).
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleExportarPDF}
                    disabled={!!exportando}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-[#2962FF] hover:bg-blue-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-100 group-hover:bg-red-200 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                        <FileText className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-base font-bold text-gray-900 mb-1">📄 Exportar a PDF</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          Documento oficial con diseño corporativo ESAP. Incluye portada, roles, actividades y firmas.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">✓ Diseño corporativo</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">✓ Normativa 648/2017</span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">✓ Listo para firmar</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {exportando === 'pdf' ? (
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5 text-gray-400 group-hover:text-[#2962FF]" />
                        )}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportarExcel}
                    disabled={!!exportando}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-green-600 hover:bg-green-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                        <FileSpreadsheet className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-base font-bold text-gray-900 mb-1">📊 Exportar a Excel</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          Tabla estructurada editable con todas las actividades. Ideal para análisis, seguimiento y modificaciones.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">✓ Editable</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">✓ Con fórmulas</span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">✓ Análisis de datos</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {exportando === 'excel' ? (
                          <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
                        )}
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Información incluida en ambos formatos:</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• 5 Roles del Decreto 648/2017</li>
                        <li>• {plan.roles.reduce((sum, rol) => sum + rol.actividades.length, 0)} actividades programadas</li>
                        <li>• Responsables asignados y fechas</li>
                        <li>• Estado de cumplimiento y avances</li>
                        <li>• Información del Jefe OCIG: {plan.jefeOCI.nombre}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Total</p>
            <p className="text-2xl font-bold text-blue-900">{totalActividades}</p>
            <p className="text-xs text-blue-600">Actividades</p>
          </div>
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Asignadas</p>
            <p className="text-2xl font-bold text-purple-900">{actividadesAsignadas}</p>
            <p className="text-xs text-purple-600">de {totalActividades}</p>
          </div>
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-orange-600 uppercase mb-1">En ejecución</p>
            <p className="text-2xl font-bold text-orange-900">{actividadesEnEjecucion}</p>
            <p className="text-xs text-orange-600">Actividades</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-green-600 uppercase mb-1">Completadas</p>
            <p className="text-2xl font-bold text-green-900">{actividadesCompletadas}</p>
            <p className="text-xs text-green-600">Actividades</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4 flex items-center justify-center">
            <SemaforoSeguimientoPAI 
              porcentaje={avancePromedio}
              variant="circular"
              size="lg"
              showIcon={false}
            />
          </div>
        </div>

        {/* Banner informativo - Sistema en uso */}
        {plan.estado === 'VIGENTE' && (
          <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-lg p-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-green-900">
                <strong>Plan Vigente:</strong> Este es el plan actual en ejecución. 
                {onCrearNuevo && <span className="ml-1">Puedes crear un nuevo plan para la próxima vigencia usando el botón "Crear Nuevo Plan" arriba.</span>}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { id: 'gestion', label: 'Gestión y Seguimiento', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'asignar', label: 'Asignar responsables', icon: <Users className="w-4 h-4" /> },
            { id: 'aprobar', label: 'Aprobación', icon: <FileCheck className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSeccion(tab.id as any)}
              className={`px-5 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-all ${seccion === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {seccion === 'gestion' && <SeccionGestionYSeguimiento key="gestion" plan={plan} planesAnteriores={planesAnteriores} onActualizar={onActualizar} onRefetchPlan={onRefetchPlan} onAbrirRol4={onAbrirRol4} auditores={auditores} />}
            {seccion === 'asignar' && <SeccionAsignar key="asignar" plan={plan} onActualizar={onActualizar} onRefetchPlan={onRefetchPlan} auditores={auditores} cargandoAuditores={cargandoAuditores} />}
            {seccion === 'aprobar' && <SeccionAprobacion key="aprobar" plan={plan} onActualizar={onActualizar} onRefetchPlan={onRefetchPlan} puedeAprobarPlan={puedeAprobarPlan} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN 1: GESTIÓN Y SEGUIMIENTO (UNIFICADA)
// ════════════════════════════════════════════════════════════════════════════
// Esta sección combina el resumen ejecutivo con el seguimiento detallado
// permitiendo al usuario ver el estado general y hacer seguimiento sin cambiar de pestaña

function SeccionGestionYSeguimiento({ 
  plan, 
  planesAnteriores = [], 
  onActualizar, 
  onRefetchPlan,
  onAbrirRol4,
  auditores
}: { 
  plan: PlanAnual; 
  planesAnteriores?: PlanAnual[]; 
  onActualizar: (plan: PlanAnual) => void; 
  onRefetchPlan?: () => Promise<void>;
  onAbrirRol4?: () => void;
  auditores: Auditor[];
}) {
  // Estados para el seguimiento
  const [actividadExpandida, setActividadExpandida] = useState<number | string | null>(null);
  const [modalAdjuntos, setModalAdjuntos] = useState<{ actividadId: number | string; rolNumero: number } | null>(null);
  const [nuevaObservacion, setNuevaObservacion] = useState('');
  const [mostrarSelectorApoyo, setMostrarSelectorApoyo] = useState(false);
  // ✅ NUEVO: Estado para controlar qué roles están colapsados/expandidos
  const [rolesColapsados, setRolesColapsados] = useState<Record<number, boolean>>({});
  const [formulario, setFormulario] = useState({
    control: '',
    evaluacion: '',
    seguimiento: '',
    porcentaje: 0
  });
  
  // Hook para sincronizar evidencias con backend
  const { guardar: guardarEvidencias } = useSaveEvidencias();
  
  // Estado para indicar que se está guardando
  const [guardando, setGuardando] = useState(false);

  // ✅ NUEVO: Función para toggle del colapso de un rol específico
  const toggleRolColapsado = (numeroRol: number) => {
    setRolesColapsados(prev => ({
      ...prev,
      [numeroRol]: !prev[numeroRol]
    }));
  };

  // ✅ NUEVO: Función para expandir/colapsar todos los roles
  const toggleTodosRoles = (colapsar: boolean) => {
    const nuevoEstado: Record<number, boolean> = {};
    plan.roles.forEach(rol => {
      nuevoEstado[rol.numero] = colapsar;
    });
    setRolesColapsados(nuevoEstado);
  };

  // Funciones de seguimiento
  const abrirSeguimiento = (actividad: Actividad) => {
    // DEBUG: Ver datos de la actividad incluyendo configuracionEvidencias
    console.log('[SEGUIMIENTO] Abriendo actividad:', {
      id: actividad.id,
      nombre: actividad.nombre,
      estado: actividad.estado,
      porcentajeAvance: actividad.porcentajeAvance,
      configuracionEvidencias: actividad.configuracionEvidencias,
      adjuntos: actividad.adjuntos?.length || 0,
      observaciones: contarObservaciones(actividad.observacionesCumplimiento),
      actividadCompleta: actividad
    });
    
    const porcentajeCalculado = calcularPorcentajeAutomatico(actividad);
    const controlAutomatico = actividad.frecuenciaPuntosControl 
      ? obtenerTextoPeriodicidad(actividad.frecuenciaPuntosControl)
      : actividad.control;
    
    setFormulario({
      control: controlAutomatico,
      evaluacion: actividad.evaluacion,
      seguimiento: actividad.seguimiento,
      porcentaje: porcentajeCalculado
    });
    setNuevaObservacion('');
    setMostrarSelectorApoyo(false);
    setActividadExpandida(actividad.id);
  };

  const agregarObservacion = (rolNumero: number, actividadId: number | string) => {
    if (!nuevaObservacion.trim()) {
      toast.error('Observación vacía', { description: 'Debes escribir una observación' });
      return;
    }

    const nuevaObs: ObservacionCumplimiento = {
      id: `obs-${Date.now()}`,
      texto: nuevaObservacion.trim(),
      fechaRegistro: new Date().toISOString(),
      registradoPor: plan.jefeOCI.nombre
    };

    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const obsActuales = Array.isArray(act.observacionesCumplimiento) 
                  ? act.observacionesCumplimiento 
                  : [];
                return { 
                  ...act,
                  observacionesCumplimiento: [
                    ...obsActuales,
                    nuevaObs
                  ]
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    setNuevaObservacion('');
    toast.success('Observación agregada', { description: 'Se registró exitosamente' });
  };

  const eliminarObservacion = (rolNumero: number, actividadId: number | string, observacionId: string) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const obsActuales = Array.isArray(act.observacionesCumplimiento) 
                  ? act.observacionesCumplimiento 
                  : [];
                return { 
                  ...act,
                  observacionesCumplimiento: obsActuales.filter((obs: ObservacionCumplimiento) => obs.id !== observacionId)
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    toast.success('Observación eliminada');
  };

  const agregarResponsableApoyo = (rolNumero: number, actividadId: number | string, auditor: Auditor) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const apoyoExiste = (act.responsablesApoyo || []).some(r => r.id === auditor.id);
                const esPrincipal = act.responsable?.id === auditor.id;
                
                if (apoyoExiste || esPrincipal) {
                  toast.error('Responsable ya asignado', { 
                    description: esPrincipal ? 'Ya es el responsable principal' : 'Ya está en el equipo de apoyo'
                  });
                  return act;
                }
                
                return { 
                  ...act,
                  responsablesApoyo: [
                    ...(act.responsablesApoyo || []),
                    auditor
                  ]
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    setMostrarSelectorApoyo(false);
    toast.success('Responsable de apoyo agregado', { description: `${auditor.nombre} se agregó al equipo` });
  };

  const eliminarResponsableApoyo = (rolNumero: number, actividadId: number | string, auditorId: string) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                return { 
                  ...act,
                  responsablesApoyo: (act.responsablesApoyo || []).filter(r => r.id !== auditorId)
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    toast.success('Responsable de apoyo eliminado');
  };

  const guardarSeguimiento = async (rolNumero: number, actividadId: number | string) => {
    const actividadActual = plan.roles
      .find(r => r.numero === rolNumero)
      ?.actividades.find(a => a.id === actividadId);

    if (
      formulario.porcentaje === 100 && 
      actividadActual?.requiereAutorizacionJefeOCIG && 
      !actividadActual?.autorizadaPorJefeOCIG
    ) {
      toast.error('Autorización requerida', { 
        description: 'Esta actividad requiere autorización del Jefe OCIG antes de completarse al 100%' 
      });
      return;
    }

    const nuevoEstado: EstadoActividad = 
      formulario.porcentaje === 100 ? 'COMPLETADA' :
      formulario.porcentaje > 0 ? 'EN_EJECUCION' :
      'PENDIENTE';

    // Mapear estado del frontend al formato del backend
    const estadoBackend = 
      nuevoEstado === 'COMPLETADA' ? 'completada' :
      nuevoEstado === 'EN_EJECUCION' ? 'en-progreso' :
      'pendiente';

    setGuardando(true);
    
    try {
      // Preparar payload - Backend espera estos campos exactos
      const payload = {
        estado: estadoBackend,
        porcentaje_avance: formulario.porcentaje,
        control: formulario.control,
        evaluacion: formulario.evaluacion,
        seguimiento: formulario.seguimiento
      };
      
      console.log('[GUARDAR] Payload:', payload);
      
      const response = await actividadesApi.update(String(actividadId), payload);
      
      console.log('[GUARDAR] Respuesta backend:', response);
      
      if (!response.success) {
        const errorMsg = response.error || 'No se pudo actualizar la actividad';
        toast.error('No se puede completar', { 
          description: errorMsg,
          duration: 6000 
        });
        setGuardando(false);
        return;
      }
    } catch (error: any) {
      console.error('[GUARDAR] Error al guardar en backend:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Error al guardar el seguimiento';
      toast.error('Error al guardar', { 
        description: errorMsg,
        duration: 6000 
      });
      setGuardando(false);
      return;
    }

    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                return { 
                  ...act,
                  control: formulario.control,
                  evaluacion: formulario.evaluacion,
                  seguimiento: formulario.seguimiento,
                  porcentajeAvance: formulario.porcentaje,
                  estado: nuevoEstado
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };
    
    onActualizar(planActualizado);
    setGuardando(false);
    toast.success('Seguimiento registrado', { description: 'Información actualizada correctamente' });
    setActividadExpandida(null);
    setNuevaObservacion('');
    setMostrarSelectorApoyo(false);
    // Recargar plan desde backend para que adjuntos y datos queden sincronizados
    try {
      await onRefetchPlan?.();
    } catch (e) {
      console.warn('[SeccionGestionYSeguimiento] Error al recargar plan tras guardar:', e);
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* ══════════════════════════════════════════════════════════════════════
          PARTE 1: CONTEXTO DEL PLAN
          ══════════════════════════════════════════════════════════════════════ */}
      
      {/* Banner de bienvenida */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">Plan Anual de Auditoría Interna {plan.vigencia}</h2>
            <p className="text-blue-100 mb-3">
              Estás visualizando el plan anual en ejecución. Este sistema permite gestionar el plan completo según el Decreto 648/2017,
              asignar responsables, hacer seguimiento y aprobar actividades.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Estado: {plan.estado}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                <span>ID: {plan.id}</span>
              </div>
              {planesAnteriores.length > 0 && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{planesAnteriores.length} plan(es) anterior(es)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Información general */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Información general</h2>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Vigencia</p>
            <p className="text-2xl font-bold text-gray-900">{plan.vigencia}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Versión</p>
            <p className="text-2xl font-bold text-gray-900">V{plan.version}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Jefe responsable</p>
            <p className="font-semibold text-gray-900">{plan.jefeOCI.nombre}</p>
            <p className="text-sm text-gray-600">{plan.jefeOCI.cargo}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Fecha de creación</p>
            <p className="font-semibold text-gray-900">
              {new Date(plan.fechaCreacion).toLocaleDateString('es-CO', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Alertas y recomendaciones */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Cumplimiento normativo</h3>
            <p className="text-sm text-blue-700">
              Este plan cumple con la estructura obligatoria del <strong>Decreto 648 de 2017</strong>: 
              5 roles estratégicos con 22 actividades distribuidas según el marco normativo de control interno.
            </p>
          </div>
        </div>
      </div>

      {/* Historial de Planes Anteriores */}
      {planesAnteriores.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Historial de Planes Anteriores
            </h3>
            <span className="text-sm text-gray-500">{planesAnteriores.length} plan(es) completado(s)</span>
          </div>
          
          <div className="space-y-3">
            {planesAnteriores.map((planAnterior) => (
              <div 
                key={planAnterior.id}
                className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      Plan Anual de Auditoría {planAnterior.vigencia}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {planAnterior.id} • Jefe OCI: {planAnterior.jefeOCI.nombre}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                    {planAnterior.estado}
                  </span>
                  <div className="text-right text-xs text-gray-500">
                    <p>Aprobado: {planAnterior.fechaAprobacion}</p>
                    <p>{planAnterior.roles.reduce((sum, rol) => sum + rol.actividades.length, 0)} actividades</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          GESTIÓN Y SEGUIMIENTO POR ROL
          Vista unificada: estadísticas + seguimiento detallado
          ══════════════════════════════════════════════════════════════════════ */}
      
      {/* Info header */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Sistema de seguimiento y control</h3>
              <p className="text-sm text-blue-700 mb-2">
                Registra el <strong>control</strong> (periodicidad), la <strong>evaluación</strong> (estado), 
                y el <strong>seguimiento</strong> (acciones y evidencias) de cada actividad.
              </p>
              <p className="text-sm text-blue-700 flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4" />
                <strong>Automático:</strong> El porcentaje de avance y la periodicidad se calculan automáticamente 
                en actividades con puntos de control configurados.
              </p>
            </div>
          </div>

          {/* ✅ NUEVO: Botones de control global */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleTodosRoles(false)}
              className="px-4 py-2 bg-white hover:bg-green-50 border-2 border-green-500 text-green-700 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
              title="Expandir todos los roles"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Expandir todos
            </button>
            <button
              onClick={() => toggleTodosRoles(true)}
              className="px-4 py-2 bg-white hover:bg-gray-100 border-2 border-gray-400 text-gray-700 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
              title="Colapsar todos los roles"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Colapsar todos
            </button>
          </div>
        </div>
      </div>

      {/* Lista de roles y actividades con seguimiento */}
      {[...plan.roles].sort((a, b) => a.numero - b.numero).map((rol) => {
        const totalActividades = rol.actividades.length;
        const asignadas = rol.actividades.filter(a => a.responsable !== null).length;
        const completadas = rol.actividades.filter(a => a.estado === 'COMPLETADA').length;
        const enProgreso = rol.actividades.filter(a => a.estado === 'EN_EJECUCION').length;
        const avance = totalActividades > 0 
          ? Math.round(rol.actividades.reduce((s, a) => s + a.porcentajeAvance, 0) / totalActividades) 
          : 0;
        const estaColapsado = rolesColapsados[rol.numero] || false;
        
        return (
          <div key={rol.numero} className="bg-white rounded-xl border-2 border-gray-200 p-6">
            {/* HEADER DEL ROL CON ESTADÍSTICAS INTEGRADAS */}
            <div className="mb-5">
              {/* Título y semáforo */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-200">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: rol.color + '20' }}>
                  {rol.icono}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">Rol {rol.numero}: {rol.nombre}</h3>
                  <p className="text-sm text-gray-600">{rol.descripcion}</p>
                </div>
                {/* Botón especial para Rol 4: Programa de Auditorías */}
                {rol.numero === 4 && onAbrirRol4 && (
                  <button
                    onClick={() => {
                      onAbrirRol4();
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-xl text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
                    title="Acceder al Programa de Auditorías con Universo Auditable"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Programa Integrado
                  </button>
                )}
                {/* ✅ NUEVO: Botón de colapso/expansión individual */}
                <button
                  onClick={() => toggleRolColapsado(rol.numero)}
                  className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                  title={estaColapsado ? 'Expandir rol' : 'Colapsar rol'}
                >
                  <motion.svg
                    className="w-5 h-5 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{ rotate: estaColapsado ? 0 : 180 }}
                    transition={{ duration: 0.2 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </button>
                <SemaforoSeguimientoPAI 
                  porcentaje={avance}
                  variant="circular"
                  size="lg"
                  showIcon={false}
                />
              </div>

              {/* ✅ CONTENIDO COLAPSABLE: Estadísticas, barra de progreso y actividades */}
              <AnimatePresence>
                {!estaColapsado && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    {/* ESTADÍSTICAS DEL ROL (Fusionado del Resumen) */}
                    <div className="grid grid-cols-5 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Total</p>
                        <p className="text-2xl font-bold text-gray-900">{totalActividades}</p>
                        <p className="text-[10px] text-gray-500">actividades</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
                        <p className="text-xs text-purple-600 mb-1">Asignadas</p>
                        <p className="text-2xl font-bold text-purple-700">{asignadas}</p>
                        <p className="text-[10px] text-purple-600">{totalActividades > 0 ? Math.round(asignadas/totalActividades*100) : 0}%</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
                        <p className="text-xs text-orange-600 mb-1">En curso</p>
                        <p className="text-2xl font-bold text-orange-700">{enProgreso}</p>
                        <p className="text-[10px] text-orange-600">{totalActividades > 0 ? Math.round(enProgreso/totalActividades*100) : 0}%</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                        <p className="text-xs text-green-600 mb-1">Completadas</p>
                        <p className="text-2xl font-bold text-green-700">{completadas}</p>
                        <p className="text-[10px] text-green-600">{totalActividades > 0 ? Math.round(completadas/totalActividades*100) : 0}%</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                        <p className="text-xs text-blue-600 mb-1">Avance</p>
                        <p className="text-2xl font-bold text-blue-700">{avance}%</p>
                        <p className="text-[10px] text-blue-600">promedio</p>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div>
                      <SemaforoSeguimientoPAI 
                        porcentaje={avance}
                        variant="bar"
                        size="md"
                        showLabel={false}
                        showIcon={false}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          {/* ✅ Actividades también colapsables */}
          <AnimatePresence>
            {!estaColapsado && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="space-y-3">
            {rol.actividades.map((actividad, idx) => (
              <div key={`${rol.numero}-${idx}-${actividad.id}`} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="w-6 h-6 bg-gray-200 rounded-lg flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <p className="font-semibold text-gray-900">{actividad.nombre}</p>
                        {/* INDICADOR: Configuración de Evidencias */}
                        {actividad.configuracionEvidencias ? (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 bg-green-100 text-green-700 border border-green-300" title={`Adj: ${actividad.configuracionEvidencias.adjuntosRequeridos || 'N/A'} | Obs: ${actividad.configuracionEvidencias.observacionRequerida || 'N/A'}`}>
                            <FileText className="w-3 h-3" />
                            Evidencias: ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 bg-gray-100 text-gray-500 border border-gray-300">
                            <FileText className="w-3 h-3" />
                            Evidencias: ✗
                          </span>
                        )}
                        {actividad.requiereAutorizacionJefeOCIG && (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                            actividad.autorizadaPorJefeOCIG
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-orange-100 text-orange-700 border border-orange-300'
                          }`}>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            {actividad.autorizadaPorJefeOCIG ? 'Autorizada Jefe OCIG' : 'Requiere Autorización OCIG'}
                          </span>
                        )}
                        {actividad.requiereVerificacionDirector && (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                            actividad.verificadaPorDirector
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-amber-100 text-amber-700 border border-amber-300'
                          }`}>
                            <Shield className="w-3 h-3" />
                            {actividad.verificadaPorDirector ? 'Verificada Director' : 'Requiere Verificación'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
                          <span className="font-semibold text-blue-700">👤 Principal:</span>
                          <strong>{actividad.responsable?.nombre || 'Sin asignar'}</strong>
                        </p>
                        {actividad.responsablesApoyo && actividad.responsablesApoyo.length > 0 && (
                          <p className="text-sm text-gray-600 flex items-center gap-1.5">
                            <span className="font-semibold text-purple-700">🤝 Apoyo:</span>
                            <span>{actividad.responsablesApoyo.map(r => r.nombre).join(', ')}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      actividad.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700' :
                      actividad.estado === 'EN_EJECUCION' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {actividad.estado === 'COMPLETADA' ? '✓ Completada' : 
                       actividad.estado === 'EN_EJECUCION' ? '⏳ En ejecución' : '⏸ Pendiente'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <SemaforoSeguimientoPAI 
                        porcentaje={actividad.porcentajeAvance}
                        variant="bar"
                        size="md"
                        showLabel={true}
                        showIcon={true}
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (actividadExpandida === actividad.id) {
                          setActividadExpandida(null);
                          setNuevaObservacion('');
                          setMostrarSelectorApoyo(false);
                        } else {
                          abrirSeguimiento(actividad);
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium"
                    >
                      {actividadExpandida === actividad.id ? '✕ Cerrar' : '📝 Seguimiento'}
                    </button>
                  </div>
                </div>

                {/* Info actual */}
                <div className="p-4 border-t-2 border-gray-200 bg-white">
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">🔍 CONTROL</p>
                      <p className="text-sm text-gray-900">{actividad.control || 'Sin definir'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">📊 EVALUACIÓN</p>
                      <p className="text-sm text-gray-900">{actividad.evaluacion || 'Sin evaluar'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">✅ SEGUIMIENTO</p>
                      <p className="text-sm text-gray-900">{actividad.seguimiento || 'Sin registrar'}</p>
                    </div>
                  </div>

                  {/* Contador de observaciones y adjuntos */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                    {tieneObservaciones(actividad.observacionesCumplimiento) && (
                      <div className="flex items-center gap-1.5 text-blue-700 text-xs">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="font-semibold">{contarObservaciones(actividad.observacionesCumplimiento)}</span>
                        <span>observación{contarObservaciones(actividad.observacionesCumplimiento) !== 1 ? 'es' : ''}</span>
                      </div>
                    )}
                    {actividad.adjuntos && actividad.adjuntos.length > 0 && (
                      <div className="flex items-center gap-1.5 text-purple-700 text-xs">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="font-semibold">{actividad.adjuntos.length}</span>
                        <span>adjunto{actividad.adjuntos.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {!tieneObservaciones(actividad.observacionesCumplimiento) && 
                     (!actividad.adjuntos || actividad.adjuntos.length === 0) && (
                      <span className="text-xs text-gray-400 italic">Sin evidencias registradas</span>
                    )}
                  </div>
                </div>

                {/* Formulario expandible */}
                <AnimatePresence>
                  {actividadExpandida === actividad.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-t-2 border-blue-200">
                        <h4 className="font-bold mb-4 flex items-center gap-2">
                          <FileCheck className="w-5 h-5 text-blue-600" />
                          Registro de seguimiento
                        </h4>

                        <div className="space-y-4">
                          {/* Banner informativo si tiene puntos de control */}
                          {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3">
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-semibold text-green-900 text-sm mb-1">
                                  Actividad con puntos de control configurados
                                </p>
                                <p className="text-xs text-green-700">
                                  <strong>{actividad.puntosControl.filter(p => p.estado === 'completado').length}</strong> de <strong>{actividad.puntosControl.length}</strong> puntos completados • 
                                  Periodicidad: <strong>{actividad.frecuenciaPuntosControl}</strong>
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                  El porcentaje y la periodicidad se calculan automáticamente según los puntos de control
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Porcentaje de avance */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                              Porcentaje de avance
                              {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">
                                  Automático
                                </span>
                              )}
                            </label>
                            <div className="flex items-center gap-4">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={formulario.porcentaje}
                                onChange={(e) => setFormulario({ ...formulario, porcentaje: parseInt(e.target.value) })}
                                disabled={!!(actividad.puntosControl && actividad.puntosControl.length > 0)}
                                className="flex-1"
                              />
                              <div className={`w-20 px-4 py-2 border-2 rounded-lg text-center ${
                                actividad.puntosControl && actividad.puntosControl.length > 0 
                                  ? 'bg-green-100 border-green-300' 
                                  : 'bg-gray-100 border-gray-300'
                              }`}>
                                <span className="text-2xl font-bold">{formulario.porcentaje}</span>
                                <span className="text-sm">%</span>
                              </div>
                            </div>
                            {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                              <p className="text-xs text-gray-500 mt-2 italic">
                                Calculado automáticamente: {actividad.puntosControl.filter(p => p.estado === 'completado').length}/{actividad.puntosControl.length} puntos completados
                              </p>
                            )}
                          </div>

                          {/* Control (periodicidad) */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                              🔍 Control (periodicidad)
                              {actividad.frecuenciaPuntosControl && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                                  Configurado
                                </span>
                              )}
                            </label>
                            {actividad.frecuenciaPuntosControl ? (
                              <div className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                                <p className="font-bold text-blue-900">{formulario.control}</p>
                                <p className="text-xs text-blue-600 mt-1">
                                  Definido en la configuración de puntos de control
                                </p>
                              </div>
                            ) : (
                              <select
                                value={formulario.control}
                                onChange={(e) => setFormulario({ ...formulario, control: e.target.value })}
                                className="w-full px-4 py-2 border-2 rounded-lg"
                              >
                                <option value="">Seleccionar...</option>
                                <option value="Seguimiento mensual">Mensual</option>
                                <option value="Seguimiento bimestral">Bimestral</option>
                                <option value="Seguimiento trimestral">Trimestral</option>
                                <option value="Seguimiento semestral">Semestral</option>
                                <option value="Seguimiento anual">Anual</option>
                              </select>
                            )}
                          </div>

                          {/* Evaluación */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <label className="block text-sm font-semibold mb-2">📊 Evaluación</label>
                            <textarea
                              value={formulario.evaluacion}
                              onChange={(e) => setFormulario({ ...formulario, evaluacion: e.target.value })}
                              className="w-full px-4 py-3 border-2 rounded-lg"
                              placeholder="Estado actual y observaciones..."
                              rows={3}
                            />
                          </div>

                          {/* Seguimiento */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                              ✅ Seguimiento
                              <span className="text-xs text-gray-500 font-normal">(Acciones ejecutadas en esta actividad)</span>
                            </label>
                            <textarea
                              value={formulario.seguimiento}
                              onChange={(e) => setFormulario({ ...formulario, seguimiento: e.target.value })}
                              className="w-full px-4 py-3 border-2 rounded-lg"
                              placeholder="Ejemplo: Se completó la auditoría al proceso X, se identificaron 3 hallazgos menores, se emitió informe el día DD/MM/AAAA..."
                              rows={4}
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              ℹ️ Este campo es diferente de las <strong>Observaciones</strong> del botón "Gestionar evidencias" (abajo). Aquí registra las acciones concretas realizadas.
                            </p>
                          </div>

                          {/* Botón gestionar evidencias */}
                          <div className={`bg-white rounded-lg border-2 p-4 ${
                            actividad.configuracionEvidencias 
                              ? 'border-green-300' 
                              : 'border-gray-200'
                          }`}>
                            {/* Info de configuración de evidencias */}
                            {actividad.configuracionEvidencias && (
                              <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Configuración de evidencias
                                </p>
                                <div className="flex items-center gap-4 text-xs">
                                  <span className={`px-2 py-0.5 rounded ${
                                    actividad.configuracionEvidencias.adjuntosRequeridos === 'OBLIGATORIO' 
                                      ? 'bg-red-100 text-red-700' 
                                      : actividad.configuracionEvidencias.adjuntosRequeridos === 'OPCIONAL'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    📎 Adjuntos: {actividad.configuracionEvidencias.adjuntosRequeridos}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded ${
                                    actividad.configuracionEvidencias.observacionRequerida === 'OBLIGATORIO' 
                                      ? 'bg-red-100 text-red-700' 
                                      : actividad.configuracionEvidencias.observacionRequerida === 'OPCIONAL'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    📝 Observaciones: {actividad.configuracionEvidencias.observacionRequerida}
                                  </span>
                                </div>
                              </div>
                            )}
                            {!actividad.configuracionEvidencias && (
                              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  Sin configuración de evidencias - Adjuntos y observaciones opcionales
                                </p>
                              </div>
                            )}
                            
                            <button
                              onClick={() => setModalAdjuntos({ actividadId: actividad.id, rolNumero: rol.numero })}
                              className={`w-full px-4 py-3 text-white rounded-lg font-semibold flex items-center justify-center gap-2 ${
                                actividad.configuracionEvidencias 
                                  ? 'bg-green-600 hover:bg-green-700' 
                                  : 'bg-blue-600 hover:bg-blue-700'
                              }`}
                            >
                              <Paperclip className="w-5 h-5" />
                              Gestionar evidencias y observaciones
                            </button>
                            <div className="mt-3 text-sm text-center">
                              {actividad.adjuntos && actividad.adjuntos.length > 0 && (
                                <span className="text-green-700 font-semibold">
                                  ✓ {actividad.adjuntos.length} archivo(s) adjunto(s)
                                </span>
                              )}
                              {tieneObservaciones(actividad.observacionesCumplimiento) && (
                                <span className="text-blue-700 font-semibold ml-4">
                                  📝 {contarObservaciones(actividad.observacionesCumplimiento)} observación(es)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Botones */}
                          <div className="flex gap-3">
                            <button
                              onClick={() => guardarSeguimiento(rol.numero, actividad.id)}
                              disabled={guardando}
                              className={`flex-1 px-6 py-3 text-white rounded-lg font-semibold flex items-center justify-center gap-2 ${
                                guardando 
                                  ? 'bg-gray-400 cursor-not-allowed' 
                                  : 'bg-green-600 hover:bg-green-700'
                              }`}
                            >
                              {guardando ? (
                                <>
                                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                  </svg>
                                  Guardando...
                                </>
                              ) : (
                                <>
                                  <Check className="w-5 h-5" />
                                  Guardar
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setActividadExpandida(null);
                                setNuevaObservacion('');
                                setMostrarSelectorApoyo(false);
                              }}
                              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
      })}

      {/* Modal de Adjuntos */}
      {modalAdjuntos && (
        <ModalGestionAdjuntos
          actividad={plan.roles
            .find(r => r.numero === modalAdjuntos.rolNumero)
            ?.actividades.find(a => a.id === modalAdjuntos.actividadId)!}
          onCerrar={() => setModalAdjuntos(null)}
          onActualizar={async (adjuntos, observaciones) => {
            // Obtener actividad actual
            const actividad = plan.roles
              .find(r => r.numero === modalAdjuntos.rolNumero)
              ?.actividades.find(a => a.id === modalAdjuntos.actividadId);

            const adjuntosOriginales = actividad?.adjuntos || [];

            // Intentar sincronizar con backend
            const actividadIdStr = String(modalAdjuntos.actividadId);

            const guardadoOk = await guardarEvidencias(
              actividadIdStr,
              adjuntos.map(a => ({ ...a, esNuevo: !adjuntosOriginales.find(o => o.id === a.id) })),
              adjuntosOriginales,
              observaciones
            );

            // Actualizar estado local
            const planActualizado = {
              ...plan,
              roles: plan.roles.map(rol => {
                if (rol.numero === modalAdjuntos.rolNumero) {
                  return {
                    ...rol,
                    actividades: rol.actividades.map(act => {
                      if (act.id === modalAdjuntos.actividadId) {
                        return { ...act, adjuntos, observacionesCumplimiento: observaciones };
                      }
                      return act;
                    })
                  };
                }
                return rol;
              })
            };
            onActualizar(planActualizado);
            // Recargar plan desde backend para reflejar adjuntos guardados (IDs y lista actual)
            if (guardadoOk) {
              try {
                await onRefetchPlan?.();
              } catch (e) {
                console.warn('[Modal adjuntos] Error al recargar plan:', e);
              }
            }
          }}
        />
      )}
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN 2: ASIGNAR RESPONSABLES
// ════════════════════════════════════════════════════════════════════════════

function SeccionAsignar({ plan, onActualizar, onRefetchPlan, auditores, cargandoAuditores }: { plan: PlanAnual; onActualizar: (plan: PlanAnual) => void; onRefetchPlan?: () => void; auditores: Auditor[]; cargandoAuditores: boolean }) {
  console.log('📋 [SeccionAsignar] Plan recibido:', plan);
  console.log('📋 [SeccionAsignar] Roles con IDs:', plan.roles.map(r => ({ numero: r.numero, id: r.id, nombre: r.nombre, actividades: r.actividades.length })));
  console.log('📋 [SeccionAsignar] Auditores disponibles:', auditores.length);
  
  const [rolExpandido, setRolExpandido] = useState<number | string | null>(null);
  const [mostrarFormNuevaActividad, setMostrarFormNuevaActividad] = useState<number | string | null>(null);
  const [asignandoId, setAsignandoId] = useState<string | number | null>(null);
  const [nuevaActividad, setNuevaActividad] = useState({
    nombre: '',
    descripcion: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0]
  });

  const asignarResponsable = async (rolNumero: number, actividadId: number | string, auditor: Auditor) => {
    console.log('👤 [asignarResponsable] Asignando:', { rolNumero, actividadId, auditor: auditor.nombre });
    
    setAsignandoId(actividadId);
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                return { ...act, responsable: auditor };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };
    onActualizar(planActualizado);
    try {
      console.log('👤 [asignarResponsable] Enviando al backend:', { actividadId, responsable: auditor.nombre });
      const res = await actividadesApi.update(String(actividadId), { responsable: auditor.nombre });
      console.log('👤 [asignarResponsable] Respuesta del backend:', res);
      
      if (res.success) {
        toast.success('Responsable asignado', { description: `${auditor.nombre} asignado a la actividad` });
        onRefetchPlan?.();
      } else {
        toast.error('Error al guardar', { description: res.error });
        onRefetchPlan?.();
      }
    } catch (e) {
      toast.error('Error', { description: 'No se pudo guardar en el servidor' });
      onRefetchPlan?.();
    } finally {
      setAsignandoId(null);
    }
  };

  const agregarActividad = async (rolNumero: number) => {
    if (!nuevaActividad.nombre.trim()) {
      toast.error('Error', { description: 'El nombre de la actividad es obligatorio' });
      return;
    }

    // Buscar el rol para obtener su ID del backend
    const rol = plan.roles.find(r => r.numero === rolNumero);
    console.log('➕ [agregarActividad] Rol encontrado:', { numero: rolNumero, rol: rol, id: rol?.id });
    
    if (!rol?.id) {
      console.error('❌ [agregarActividad] Rol sin ID del backend');
      toast.error('Error', { description: 'No se pudo identificar el rol en el backend' });
      return;
    }

    try {
      // Crear actividad en el backend
      const dataParaBackend: CreateActividadDto = {
        nombre: nuevaActividad.nombre,
        descripcion: nuevaActividad.descripcion || '',
        responsable: 'Por asignar',
        fecha_inicio: nuevaActividad.fechaInicio,
        fecha_fin: nuevaActividad.fechaFin,
        prioridad: 'Media',
        control: 'Seguimiento trimestral',
        evaluacion: '0% avance',
        seguimiento: 'Por definir',
        requiereVerificacionDirector: false
      };

      console.log('➕ [agregarActividad] Enviando al backend:', { rolId: rol.id, data: dataParaBackend });
      const res = await actividadesApi.create(rol.id, dataParaBackend);
      console.log('➕ [agregarActividad] Respuesta del backend:', res);

      if (res.success && res.data) {
        // Actualizar estado local con la actividad del backend
        const actividadDesdeBackend = res.data;
        const actividadFront: Actividad = {
          id: actividadDesdeBackend.id,
          nombre: actividadDesdeBackend.nombre,
          descripcion: actividadDesdeBackend.descripcion || '',
          fechaInicio: actividadDesdeBackend.fecha_inicio.split('T')[0],
          fechaFin: actividadDesdeBackend.fecha_fin.split('T')[0],
          responsable: null,
          porcentajeAvance: 0,
          estado: 'PENDIENTE',
          control: actividadDesdeBackend.control || 'Seguimiento trimestral',
          evaluacion: actividadDesdeBackend.evaluacion || '0% avance',
          seguimiento: actividadDesdeBackend.seguimiento || 'Por definir',
          requiereVerificacionDirector: actividadDesdeBackend.requiereVerificacionDirector || false
        };

        const planActualizado = {
          ...plan,
          roles: plan.roles.map(r => {
            if (r.numero === rolNumero) {
              return {
                ...r,
                actividades: [...r.actividades, actividadFront]
              };
            }
            return r;
          })
        };

        onActualizar(planActualizado);
        toast.success('Actividad creada', { description: 'Nueva actividad creada en el backend' });
        
        // Resetear formulario
        setNuevaActividad({
          nombre: '',
          descripcion: '',
          fechaInicio: new Date().toISOString().split('T')[0],
          fechaFin: new Date().toISOString().split('T')[0]
        });
        setMostrarFormNuevaActividad(null);

        // Refrescar plan completo desde el backend
        onRefetchPlan?.();
      } else {
        toast.error('Error al crear actividad', { description: res.error || 'No se pudo guardar en el servidor' });
      }
    } catch (error) {
      console.error('Error creando actividad:', error);
      toast.error('Error', { description: 'No se pudo crear la actividad' });
    }
  };

  const eliminarActividad = async (rolNumero: number, actividadId: number | string) => {
    console.log('🗑️ [eliminarActividad] Eliminando actividad:', { rolNumero, actividadId });
    
    try {
      // Eliminar del backend
      const res = await actividadesApi.delete(String(actividadId));
      console.log('🗑️ [eliminarActividad] Respuesta del backend:', res);

      if (res.success) {
        // Actualizar estado local
        const planActualizado = {
          ...plan,
          roles: plan.roles.map(rol => {
            if (rol.numero === rolNumero) {
              return {
                ...rol,
                actividades: rol.actividades.filter(act => act.id !== actividadId)
              };
            }
            return rol;
          })
        };
        onActualizar(planActualizado);
        toast.success('Actividad eliminada', { description: 'La actividad ha sido eliminada del backend' });
        
        // Refrescar plan completo desde el backend
        onRefetchPlan?.();
      } else {
        toast.error('Error al eliminar', { description: res.error || 'No se pudo eliminar del servidor' });
      }
    } catch (error) {
      console.error('Error eliminando actividad:', error);
      toast.error('Error', { description: 'No se pudo eliminar la actividad' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {[...plan.roles].sort((a, b) => a.numero - b.numero).map((rol) => {
        const isExpanded = rolExpandido === rol.numero;
        const asignadas = rol.actividades.filter(a => a.responsable !== null).length;

        return (
          <div key={rol.numero} className="bg-white rounded-xl border-2 border-gray-200">
            {/* Header del rol - Clickeable para expandir/colapsar */}
            <div 
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setRolExpandido(isExpanded ? null : rol.numero)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ backgroundColor: rol.color + '20' }}>
                  {rol.icono}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Rol {rol.numero}: {rol.nombre}</h3>
                  <p className="text-sm text-gray-600">
                    {rol.actividades.length} actividades • {asignadas} asignadas • {rol.actividades.length - asignadas} pendientes
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg text-sm font-semibold" style={{ 
                  backgroundColor: rol.color + '20', 
                  color: rol.color 
                }}>
                  {Math.round((asignadas / rol.actividades.length) * 100)}% asignado
                </span>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.div>
              </div>
            </div>

            {/* Lista de actividades - Expandible */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 pt-2 space-y-3 border-t-2 border-gray-200">
                    {rol.actividades.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No hay actividades en este rol. Haz clic en "Agregar actividad" para crear una.
                      </div>
                    ) : (
                      rol.actividades.map((actividad, index) => (
                        <div key={`${rol.numero}-${index}-${actividad.id}`} className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 mb-1">{actividad.nombre}</p>
                            <p className="text-sm text-gray-600 mb-2">{actividad.descripcion}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>📅 Inicio: {new Date(actividad.fechaInicio).toLocaleDateString('es-CO')}</span>
                              <span>📅 Fin: {new Date(actividad.fechaFin).toLocaleDateString('es-CO')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={actividad.responsable?.id || ''}
                              onChange={(e) => {
                                const auditor = auditores.find(a => a.id === e.target.value);
                                if (auditor) asignarResponsable(rol.numero, actividad.id, auditor);
                              }}
                              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 min-w-[280px] text-sm"
                              onClick={(e) => e.stopPropagation()}
                              disabled={cargandoAuditores || asignandoId === actividad.id}
                            >
                              <option value="">🔹 Sin asignar</option>
                              {auditores.map((auditor) => (
                                <option key={auditor.id} value={auditor.id}>
                                  👤 {auditor.nombre} - {auditor.cargo}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('¿Estás seguro de eliminar esta actividad?')) {
                                  eliminarActividad(rol.numero, actividad.id);
                                }
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar actividad"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Formulario para nueva actividad */}
                    {mostrarFormNuevaActividad === rol.numero ? (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 border-2 border-blue-300 bg-blue-50 rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-blue-900">Nueva actividad para Rol {rol.numero}</h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMostrarFormNuevaActividad(null);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-1">Nombre de la actividad *</label>
                          <input
                            type="text"
                            value={nuevaActividad.nombre}
                            onChange={(e) => setNuevaActividad({ ...nuevaActividad, nombre: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                            placeholder="Ej: Auditoría al proceso de contratación"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-1">Descripción</label>
                          <textarea
                            value={nuevaActividad.descripcion}
                            onChange={(e) => setNuevaActividad({ ...nuevaActividad, descripcion: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                            placeholder="Descripción detallada de la actividad"
                            rows={2}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">Fecha inicio</label>
                            <input
                              type="date"
                              value={nuevaActividad.fechaInicio}
                              onChange={(e) => setNuevaActividad({ ...nuevaActividad, fechaInicio: e.target.value })}
                              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">Fecha fin</label>
                            <input
                              type="date"
                              value={nuevaActividad.fechaFin}
                              onChange={(e) => setNuevaActividad({ ...nuevaActividad, fechaFin: e.target.value })}
                              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              agregarActividad(rol.numero);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Guardar actividad
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMostrarFormNuevaActividad(null);
                            }}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
                          >
                            Cancelar
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMostrarFormNuevaActividad(rol.numero);
                        }}
                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg text-gray-600 hover:text-blue-600 font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar actividad adicional
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES HELPER PARA SEGUIMIENTO
// ════════════════════════════════════════════════════════════════════════════

// Función para calcular porcentaje automático basado en puntos de control
function calcularPorcentajeAutomatico(actividad: Actividad): number {
  if (!actividad.puntosControl || actividad.puntosControl.length === 0) {
    return actividad.porcentajeAvance; // Si no hay puntos, usar el valor manual existente
  }
  
  const puntosCompletados = actividad.puntosControl.filter(p => p.estado === 'completado').length;
  const totalPuntos = actividad.puntosControl.length;
  
  return Math.round((puntosCompletados / totalPuntos) * 100);
}

// Función para obtener texto de periodicidad desde frecuencia configurada
function obtenerTextoPeriodicidad(frecuencia?: FrecuenciaPuntoControl): string {
  if (!frecuencia) return '';
  
  const mapeo: Record<FrecuenciaPuntoControl, string> = {
    'semanal': 'Seguimiento semanal',
    'mensual': 'Seguimiento mensual',
    'trimestral': 'Seguimiento trimestral',
    'semestral': 'Seguimiento semestral',
    'anual': 'Seguimiento anual',
    'personalizada': 'Seguimiento personalizado'
  };
  
  return mapeo[frecuencia] || '';
}

// ════════════════════════════════════════════════════════════════════════════
// [DEPRECATED - ELIMINADA] SECCIÓN 3: SEGUIMIENTO Y CONTROL
// Esta sección fue unificada con la Sección de Resumen en "SeccionGestionYSeguimiento"
// ════════════════════════════════════════════════════════════════════════════

function __DEPRECATED__SeccionSeguimiento({ plan, onActualizar, onAbrirRol4, auditores = [] }: { plan: PlanAnual; onActualizar: (plan: PlanAnual) => void; onAbrirRol4?: () => void; auditores?: Auditor[] }) {
  const [actividadExpandida, setActividadExpandida] = useState<number | string | null>(null);
  const [modalAdjuntos, setModalAdjuntos] = useState<{ actividadId: number | string; rolNumero: number } | null>(null);
  const [nuevaObservacion, setNuevaObservacion] = useState('');
  const [mostrarSelectorApoyo, setMostrarSelectorApoyo] = useState(false);
  const [formulario, setFormulario] = useState({
    control: '',
    evaluacion: '',
    seguimiento: '',
    porcentaje: 0
  });

  const abrirSeguimiento = (actividad: Actividad) => {
    // Calcular porcentaje automático si tiene puntos de control
    const porcentajeCalculado = calcularPorcentajeAutomatico(actividad);
    
    // Obtener periodicidad automática si tiene frecuencia configurada
    const controlAutomatico = actividad.frecuenciaPuntosControl 
      ? obtenerTextoPeriodicidad(actividad.frecuenciaPuntosControl)
      : actividad.control;
    
    setFormulario({
      control: controlAutomatico,
      evaluacion: actividad.evaluacion,
      seguimiento: actividad.seguimiento,
      porcentaje: porcentajeCalculado
    });
    setNuevaObservacion(''); // Limpiar el campo de nueva observación
    setMostrarSelectorApoyo(false); // Cerrar selector de apoyo
    setActividadExpandida(actividad.id);
  };

  const agregarObservacion = (rolNumero: number, actividadId: number | string) => {
    if (!nuevaObservacion.trim()) {
      toast.error('Observación vacía', { description: 'Debes escribir una observación' });
      return;
    }

    const nuevaObs: ObservacionCumplimiento = {
      id: `obs-${Date.now()}`,
      texto: nuevaObservacion.trim(),
      fechaRegistro: new Date().toISOString(),
      registradoPor: plan.jefeOCI.nombre
    };

    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const obsActuales = Array.isArray(act.observacionesCumplimiento) 
                  ? act.observacionesCumplimiento 
                  : [];
                return { 
                  ...act,
                  observacionesCumplimiento: [
                    ...obsActuales,
                    nuevaObs
                  ]
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    setNuevaObservacion('');
    toast.success('Observación agregada', { description: 'Se registró exitosamente' });
  };

  const eliminarObservacion = (rolNumero: number, actividadId: number | string, observacionId: string) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const obsActuales = Array.isArray(act.observacionesCumplimiento) 
                  ? act.observacionesCumplimiento 
                  : [];
                return { 
                  ...act,
                  observacionesCumplimiento: obsActuales.filter((obs: ObservacionCumplimiento) => obs.id !== observacionId)
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    toast.success('Observación eliminada');
  };

  const agregarResponsableApoyo = (rolNumero: number, actividadId: number | string, auditor: Auditor) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const apoyoExiste = (act.responsablesApoyo || []).some(r => r.id === auditor.id);
                const esPrincipal = act.responsable?.id === auditor.id;
                
                if (apoyoExiste || esPrincipal) {
                  toast.error('Responsable ya asignado', { 
                    description: esPrincipal ? 'Ya es el responsable principal' : 'Ya está en el equipo de apoyo'
                  });
                  return act;
                }
                
                return { 
                  ...act,
                  responsablesApoyo: [
                    ...(act.responsablesApoyo || []),
                    auditor
                  ]
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    setMostrarSelectorApoyo(false);
    toast.success('Responsable de apoyo agregado', { description: `${auditor.nombre} se agregó al equipo` });
  };

  const eliminarResponsableApoyo = (rolNumero: number, actividadId: number | string, auditorId: string) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                return { 
                  ...act,
                  responsablesApoyo: (act.responsablesApoyo || []).filter(r => r.id !== auditorId)
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    toast.success('Responsable de apoyo eliminado');
  };

  const guardarSeguimiento = async (rolNumero: number, actividadId: number | string) => {
    // Validar si la actividad requiere autorización y está al 100%
    const actividadActual = plan.roles
      .find(r => r.numero === rolNumero)
      ?.actividades.find(a => a.id === actividadId);

    if (
      formulario.porcentaje === 100 && 
      actividadActual?.requiereAutorizacionJefeOCIG && 
      !actividadActual?.autorizadaPorJefeOCIG
    ) {
      toast.error('Autorización requerida', { 
        description: 'Esta actividad requiere autorización del Jefe OCIG antes de completarse al 100%' 
      });
      return;
    }

    const nuevoEstado: EstadoActividad = 
      formulario.porcentaje === 100 ? 'COMPLETADA' :
      formulario.porcentaje > 0 ? 'EN_EJECUCION' :
      'PENDIENTE';

    // Mapear estado del frontend al formato del backend
    const estadoBackend = 
      nuevoEstado === 'COMPLETADA' ? 'completada' :
      nuevoEstado === 'EN_EJECUCION' ? 'en-progreso' :
      'pendiente';

    setGuardando(true);
    
    try {
      // Preparar payload - Backend espera estos campos exactos
      const payload = {
        estado: estadoBackend,
        porcentaje_avance: formulario.porcentaje,
        control: formulario.control,
        evaluacion: formulario.evaluacion,
        seguimiento: formulario.seguimiento
      };
      
      console.log('[GUARDAR] Payload:', payload);
      const response = await actividadesApi.update(String(actividadId), payload);
      console.log('[GUARDAR] Respuesta backend:', response);
      
      if (!response.success) {
        const errorMsg = response.error || 'No se pudo actualizar la actividad';
        toast.error('No se puede completar', { 
          description: errorMsg,
          duration: 6000 
        });
        setGuardando(false);
        return;
      }
    } catch (error: any) {
      console.error('[GUARDAR] Error al guardar en backend:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Error al guardar el seguimiento';
      toast.error('Error al guardar', { 
        description: errorMsg,
        duration: 6000 
      });
      setGuardando(false);
      return;
    }

    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                return { 
                  ...act,
                  control: formulario.control,
                  evaluacion: formulario.evaluacion,
                  seguimiento: formulario.seguimiento,
                  porcentajeAvance: formulario.porcentaje,
                  estado: nuevoEstado
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };
    onActualizar(planActualizado);
    setGuardando(false);
    toast.success('Seguimiento registrado', { description: 'Información actualizada correctamente' });
    setActividadExpandida(null);
    setNuevaObservacion('');
    setMostrarSelectorApoyo(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Info header */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Sistema de seguimiento y control</h3>
            <p className="text-sm text-blue-700 mb-2">
              Registra el <strong>control</strong> (periodicidad), la <strong>evaluación</strong> (estado), 
              y el <strong>seguimiento</strong> (acciones y evidencias) de cada actividad.
            </p>
            <p className="text-sm text-blue-700 flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4" />
              <strong>Automático:</strong> El porcentaje de avance y la periodicidad se calculan automáticamente 
              en actividades con puntos de control configurados.
            </p>
          </div>
        </div>
      </div>

      {[...plan.roles].sort((a, b) => a.numero - b.numero).map((rol) => (
        <div key={rol.numero} className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-gray-200">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: rol.color + '20' }}>
              {rol.icono}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">Rol {rol.numero}: {rol.nombre}</h3>
              <p className="text-sm text-gray-600">{rol.actividades.length} actividades</p>
            </div>
            {/* Botón especial para Rol 4: Programa de Auditorías */}
            {rol.numero === 4 && onAbrirRol4 && (
              <button
                onClick={() => {
                  onAbrirRol4();
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-xl text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
                title="Acceder al Programa de Auditorías con Universo Auditable"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Programa Integrado
              </button>
            )}
            <SemaforoSeguimientoPAI 
              porcentaje={Math.round(rol.actividades.reduce((s, a) => s + a.porcentajeAvance, 0) / rol.actividades.length)}
              variant="circular"
              size="lg"
              showIcon={false}
            />
          </div>

          <div className="space-y-3">
            {rol.actividades.map((actividad, idx) => (
              <div key={`${rol.numero}-${idx}-${actividad.id}`} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="w-6 h-6 bg-gray-200 rounded-lg flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <p className="font-semibold text-gray-900">{actividad.nombre}</p>
                        {actividad.requiereAutorizacionJefeOCIG && (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                            actividad.autorizadaPorJefeOCIG
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-orange-100 text-orange-700 border border-orange-300'
                          }`}>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            {actividad.autorizadaPorJefeOCIG ? 'Autorizada Jefe OCIG' : 'Requiere Autorización OCIG'}
                          </span>
                        )}
                        {actividad.requiereVerificacionDirector && (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                            actividad.verificadaPorDirector
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-amber-100 text-amber-700 border border-amber-300'
                          }`}>
                            <Shield className="w-3 h-3" />
                            {actividad.verificadaPorDirector ? 'Verificada Director' : 'Requiere Verificación'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
                          <span className="font-semibold text-blue-700">👤 Principal:</span>
                          <strong>{actividad.responsable?.nombre || 'Sin asignar'}</strong>
                        </p>
                        {actividad.responsablesApoyo && actividad.responsablesApoyo.length > 0 && (
                          <p className="text-sm text-gray-600 flex items-center gap-1.5">
                            <span className="font-semibold text-purple-700">🤝 Apoyo:</span>
                            <span>{actividad.responsablesApoyo.map(r => r.nombre).join(', ')}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      actividad.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700' :
                      actividad.estado === 'EN_EJECUCION' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {actividad.estado === 'COMPLETADA' ? '✓ Completada' : 
                       actividad.estado === 'EN_EJECUCION' ? '⏳ En ejecución' : '⏸ Pendiente'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <SemaforoSeguimientoPAI 
                        porcentaje={actividad.porcentajeAvance}
                        variant="bar"
                        size="md"
                        showLabel={true}
                        showIcon={true}
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (actividadExpandida === actividad.id) {
                          setActividadExpandida(null);
                          setNuevaObservacion(''); // Limpiar al cerrar
                          setMostrarSelectorApoyo(false); // Cerrar selector de apoyo
                        } else {
                          abrirSeguimiento(actividad);
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium"
                    >
                      {actividadExpandida === actividad.id ? '✕ Cerrar' : '📝 Seguimiento'}
                    </button>
                  </div>
                </div>

                {/* Info actual */}
                <div className="p-4 border-t-2 border-gray-200 bg-white">
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">🔍 CONTROL</p>
                      <p className="text-sm text-gray-900">{actividad.control || 'Sin definir'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">📊 EVALUACIÓN</p>
                      <p className="text-sm text-gray-900">{actividad.evaluacion || 'Sin evaluar'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">✅ SEGUIMIENTO</p>
                      <p className="text-sm text-gray-900">{actividad.seguimiento || 'Sin registrar'}</p>
                    </div>
                  </div>

                  {/* Contador de observaciones y adjuntos */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                    {tieneObservaciones(actividad.observacionesCumplimiento) && (
                      <div className="flex items-center gap-1.5 text-blue-700 text-xs">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="font-semibold">{contarObservaciones(actividad.observacionesCumplimiento)}</span>
                        <span>observación{contarObservaciones(actividad.observacionesCumplimiento) !== 1 ? 'es' : ''}</span>
                      </div>
                    )}
                    {actividad.adjuntos && actividad.adjuntos.length > 0 && (
                      <div className="flex items-center gap-1.5 text-purple-700 text-xs">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="font-semibold">{actividad.adjuntos.length}</span>
                        <span>adjunto{actividad.adjuntos.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {!tieneObservaciones(actividad.observacionesCumplimiento) && 
                     (!actividad.adjuntos || actividad.adjuntos.length === 0) && (
                      <span className="text-xs text-gray-400 italic">Sin evidencias registradas</span>
                    )}
                  </div>
                </div>

                {/* Formulario */}
                <AnimatePresence>
                  {actividadExpandida === actividad.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-t-2 border-blue-200">
                        <h4 className="font-bold mb-4 flex items-center gap-2">
                          <FileCheck className="w-5 h-5 text-blue-600" />
                          Registro de seguimiento
                        </h4>

                        <div className="space-y-4">
                          {/* Mensaje informativo sobre puntos de control */}
                          {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3">
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-semibold text-green-900 text-sm mb-1">
                                  Actividad con puntos de control configurados
                                </p>
                                <p className="text-xs text-green-700">
                                  <strong>{actividad.puntosControl.filter(p => p.estado === 'completado').length}</strong> de <strong>{actividad.puntosControl.length}</strong> puntos completados • 
                                  Periodicidad: <strong>{actividad.frecuenciaPuntosControl}</strong>
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                  El porcentaje y la periodicidad se calculan automáticamente según los puntos de control
                                </p>
                              </div>
                            </div>
                          )}

                          {/* % Avance - AUTOMÁTICO si hay puntos de control */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                              Porcentaje de avance
                              {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">
                                  Automático
                                </span>
                              )}
                            </label>
                            <div className="flex items-center gap-4">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={formulario.porcentaje}
                                onChange={(e) => setFormulario({ ...formulario, porcentaje: parseInt(e.target.value) })}
                                disabled={!!(actividad.puntosControl && actividad.puntosControl.length > 0)}
                                className="flex-1"
                              />
                              <div className={`w-20 px-4 py-2 border-2 rounded-lg text-center ${
                                actividad.puntosControl && actividad.puntosControl.length > 0 
                                  ? 'bg-green-100 border-green-300' 
                                  : 'bg-gray-100 border-gray-300'
                              }`}>
                                <span className="text-2xl font-bold">{formulario.porcentaje}</span>
                                <span className="text-sm">%</span>
                              </div>
                            </div>
                            {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                              <p className="text-xs text-gray-500 mt-2 italic">
                                Calculado automáticamente: {actividad.puntosControl.filter(p => p.estado === 'completado').length}/{actividad.puntosControl.length} puntos completados
                              </p>
                            )}
                          </div>

                          {/* Control - AUTOMÁTICO si hay frecuencia configurada */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                              🔍 Control (periodicidad)
                              {actividad.frecuenciaPuntosControl && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                                  Configurado
                                </span>
                              )}
                            </label>
                            {actividad.frecuenciaPuntosControl ? (
                              <div className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                                <p className="font-bold text-blue-900">{formulario.control}</p>
                                <p className="text-xs text-blue-600 mt-1">
                                  Definido en la configuración de puntos de control
                                </p>
                              </div>
                            ) : (
                              <select
                                value={formulario.control}
                                onChange={(e) => setFormulario({ ...formulario, control: e.target.value })}
                                className="w-full px-4 py-2 border-2 rounded-lg"
                              >
                                <option value="">Seleccionar...</option>
                                <option value="Seguimiento mensual">Mensual</option>
                                <option value="Seguimiento bimestral">Bimestral</option>
                                <option value="Seguimiento trimestral">Trimestral</option>
                                <option value="Seguimiento cuatrimestral">Cuatrimestral</option>
                                <option value="Seguimiento semestral">Semestral</option>
                                <option value="Seguimiento anual">Anual</option>
                                <option value="Según necesidad">Según necesidad</option>
                              </select>
                            )}
                          </div>

                          {/* Evaluación */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <label className="block text-sm font-semibold mb-2">📊 Evaluación</label>
                            <textarea
                              value={formulario.evaluacion}
                              onChange={(e) => setFormulario({ ...formulario, evaluacion: e.target.value })}
                              className="w-full px-4 py-3 border-2 rounded-lg"
                              placeholder="Estado actual y observaciones..."
                              rows={3}
                            />
                          </div>

                          {/* Seguimiento */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                              ✅ Seguimiento
                              <span className="text-xs text-gray-500 font-normal">(Acciones ejecutadas en esta actividad)</span>
                            </label>
                            <textarea
                              value={formulario.seguimiento}
                              onChange={(e) => setFormulario({ ...formulario, seguimiento: e.target.value })}
                              className="w-full px-4 py-3 border-2 rounded-lg"
                              placeholder="Ejemplo: Se completó la auditoría al proceso X, se identificaron 3 hallazgos menores, se emitió informe el día DD/MM/AAAA..."
                              rows={4}
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              ℹ️ Este campo es diferente de las <strong>Observaciones</strong> del botón "Gestionar evidencias" (abajo). Aquí registra las acciones concretas realizadas.
                            </p>
                          </div>

                          {/* GESTIÓN DE RESPONSABLES - Principal y Apoyo */}
                          <div className="bg-white rounded-lg border-2 border-blue-200 p-4">
                            <label className="block text-sm font-semibold mb-3 flex items-center gap-2 text-blue-900">
                              <Users className="w-4 h-4 text-blue-600" />
                              👥 Equipo de trabajo
                            </label>

                            {/* Responsable Principal (NO EDITABLE) */}
                            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 mb-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-semibold text-blue-700 mb-1">👤 RESPONSABLE PRINCIPAL (Asignado en programación)</p>
                                  <p className="text-sm font-bold text-blue-900">
                                    {actividad.responsable?.nombre || 'Sin asignar'}
                                  </p>
                                  <p className="text-xs text-blue-600">{actividad.responsable?.cargo}</p>
                                </div>
                                <span className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded uppercase">
                                  Principal
                                </span>
                              </div>
                            </div>

                            {/* Responsables de Apoyo */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-purple-700">🤝 RESPONSABLES DE APOYO</p>
                                <button
                                  onClick={() => setMostrarSelectorApoyo(!mostrarSelectorApoyo)}
                                  className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg font-medium flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  Agregar apoyo
                                </button>
                              </div>

                              {/* Lista de responsables de apoyo */}
                              {actividad.responsablesApoyo && actividad.responsablesApoyo.length > 0 ? (
                                <div className="space-y-2 mb-2">
                                  {actividad.responsablesApoyo.map((resp) => (
                                    <div key={resp.id} className="bg-purple-50 border border-purple-200 rounded-lg p-2 flex items-center justify-between group">
                                      <div>
                                        <p className="text-sm font-semibold text-purple-900">{resp.nombre}</p>
                                        <p className="text-xs text-purple-600">{resp.cargo}</p>
                                      </div>
                                      <button
                                        onClick={() => {
                                          if (confirm(`¿Eliminar a ${resp.nombre} del equipo de apoyo?`)) {
                                            eliminarResponsableApoyo(rol.numero, actividad.id, resp.id);
                                          }
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 p-1"
                                        title="Eliminar del equipo"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500 italic mb-2">No hay responsables de apoyo asignados</p>
                              )}

                              {/* Selector de responsables de apoyo */}
                              {mostrarSelectorApoyo && (
                                <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
                                  <p className="text-xs font-semibold text-purple-900 mb-2">Seleccionar auditor de apoyo:</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {auditores.filter(aud => aud.id !== actividad.responsable?.id).map((auditor) => (
                                      <button
                                        key={auditor.id}
                                        onClick={() => agregarResponsableApoyo(rol.numero, actividad.id, auditor)}
                                        className="text-left px-3 py-2 bg-white hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-400 rounded-lg transition-all"
                                      >
                                        <p className="text-sm font-semibold text-purple-900">{auditor.nombre}</p>
                                        <p className="text-xs text-purple-600">{auditor.cargo}</p>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Archivos Adjuntos y Observaciones */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <label className="block text-sm font-semibold flex items-center gap-2">
                                <Paperclip className="w-4 h-4 text-gray-600" />
                                Evidencias de cumplimiento
                              </label>
                              <button
                                onClick={() => setModalAdjuntos({ actividadId: actividad.id, rolNumero: rol.numero })}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium flex items-center gap-2"
                              >
                                <Upload className="w-4 h-4" />
                                Gestionar evidencias
                              </button>
                            </div>
                            
                            {/* Archivos */}
                            <div className="text-sm mb-3">
                              {actividad.adjuntos && actividad.adjuntos.length > 0 ? (
                                <div className="flex items-center gap-2 text-green-700">
                                  <FileText className="w-4 h-4" />
                                  <span className="font-semibold">{actividad.adjuntos.length} archivo(s) adjunto(s)</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-gray-500">
                                  <AlertCircle className="w-4 h-4" />
                                  Sin archivos adjuntos
                                </div>
                              )}
                            </div>

                            {/* Observaciones de Cumplimiento - SISTEMA DE MÚLTIPLES ENTRADAS */}
                            <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                              <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                📝 Observaciones de cumplimiento
                              </label>

                              {/* Historial de observaciones */}
                              {Array.isArray(actividad.observacionesCumplimiento) && tieneObservaciones(actividad.observacionesCumplimiento) && (
                                <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
                                  {actividad.observacionesCumplimiento.map((obs: ObservacionCumplimiento) => (
                                    <div key={obs.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3 relative group">
                                      <div className="flex items-start gap-2 mb-2">
                                        <div className="flex-1">
                                          <p className="text-xs font-semibold text-blue-900 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                            {obs.registradoPor}
                                          </p>
                                          <p className="text-[10px] text-blue-600">
                                            {new Date(obs.fechaRegistro).toLocaleString('es-CO', { 
                                              dateStyle: 'short', 
                                              timeStyle: 'short' 
                                            })}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => {
                                            if (confirm('¿Eliminar esta observación?')) {
                                              eliminarObservacion(rol.numero, actividad.id, obs.id);
                                            }
                                          }}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 p-1"
                                          title="Eliminar observación"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      <p className="text-sm text-blue-900 whitespace-pre-wrap">{obs.texto}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Formulario para nueva observación */}
                              <div className="flex gap-2">
                                <textarea
                                  value={nuevaObservacion}
                                  onChange={(e) => setNuevaObservacion(e.target.value)}
                                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                                  placeholder="Escribe una nueva observación..."
                                  rows={2}
                                />
                                <button
                                  onClick={() => agregarObservacion(rol.numero, actividad.id)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium flex items-center gap-2 self-start"
                                >
                                  <Plus className="w-4 h-4" />
                                  Agregar
                                </button>
                              </div>

                              {!tieneObservaciones(actividad.observacionesCumplimiento) && (
                                <p className="text-xs text-gray-500 italic mt-2">No hay observaciones registradas</p>
                              )}
                            </div>
                          </div>

                          {/* Sistema de Autorización del Jefe OCIG - CONFIGURADO EN CREACIÓN */}
                          {actividad.requiereAutorizacionJefeOCIG && (
                            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-lg p-4">
                              <div className="flex items-start gap-3 mb-3">
                                <svg className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                  <p className="font-semibold text-orange-900 mb-1">
                                    🔐 Requiere Autorización del Jefe OCIG
                                  </p>
                                  <p className="text-xs text-orange-700">
                                    Esta actividad fue configurada en la creación del Plan para requerir autorización del Jefe de la OCIG antes de completarse al 100%
                                  </p>
                                </div>
                              </div>

                              {/* Estado de Autorización */}
                              {formulario.porcentaje === 100 && (
                                <div className="mt-3 pt-3 border-t-2 border-orange-300">
                                  {actividad.autorizadaPorJefeOCIG ? (
                                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                                      <div className="flex items-center gap-2 text-green-800 mb-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <p className="font-bold">✓ Autorizada por el Jefe OCIG</p>
                                      </div>
                                      <p className="text-xs text-green-700">
                                        Fecha: {actividad.fechaAutorizacion ? new Date(actividad.fechaAutorizacion).toLocaleString('es-CO') : 'N/A'}
                                      </p>
                                      {actividad.observacionesJefeOCIG && (
                                        <div className="mt-2 pt-2 border-t border-green-200">
                                          <p className="text-xs font-semibold text-green-900">Observaciones del Jefe OCIG:</p>
                                          <p className="text-sm text-green-800 mt-1">{actividad.observacionesJefeOCIG}</p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3">
                                      <p className="text-sm font-bold text-yellow-900 mb-2 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        ⏳ Pendiente de autorización del Jefe OCIG
                                      </p>
                                      <p className="text-xs text-yellow-800 mb-3">
                                        Esta actividad alcanzará el 100% pero requiere la autorización del Jefe OCIG para considerarse completada.
                                      </p>
                                      
                                      {/* Solo el Jefe OCIG puede autorizar */}
                                      <div className="space-y-2">
                                        <textarea
                                          placeholder="Observaciones del Jefe OCIG (opcional)..."
                                          className="w-full px-3 py-2 border-2 border-yellow-300 rounded-lg text-sm"
                                          rows={2}
                                          id={`obs-jefe-ocig-${actividad.id}`}
                                        />
                                        <button
                                          onClick={() => {
                                            const observaciones = (document.getElementById(`obs-jefe-ocig-${actividad.id}`) as HTMLTextAreaElement)?.value || '';
                                            const planActualizado = {
                                              ...plan,
                                              roles: plan.roles.map(r => {
                                                if (r.numero === rol.numero) {
                                                  return {
                                                    ...r,
                                                    actividades: r.actividades.map(act => {
                                                      if (act.id === actividad.id) {
                                                        return {
                                                          ...act,
                                                          autorizadaPorJefeOCIG: true,
                                                          fechaAutorizacion: new Date().toISOString(),
                                                          observacionesJefeOCIG: observaciones
                                                        };
                                                      }
                                                      return act;
                                                    })
                                                  };
                                                }
                                                return r;
                                              })
                                            };
                                            onActualizar(planActualizado);
                                            toast.success('Actividad autorizada por el Jefe OCIG');
                                          }}
                                          className="w-full px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:shadow-lg text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                                        >
                                          <CheckCircle2 className="w-4 h-4" />
                                          Autorizar como Jefe OCIG
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Configuración de Verificación del Director */}
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={actividad.requiereVerificacionDirector}
                                onChange={(e) => {
                                  const planActualizado = {
                                    ...plan,
                                    roles: plan.roles.map(r => {
                                      if (r.numero === rol.numero) {
                                        return {
                                          ...r,
                                          actividades: r.actividades.map(act => {
                                            if (act.id === actividad.id) {
                                              return { ...act, requiereVerificacionDirector: e.target.checked };
                                            }
                                            return act;
                                          })
                                        };
                                      }
                                      return r;
                                    })
                                  };
                                  onActualizar(planActualizado);
                                }}
                                className="w-5 h-5 text-orange-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                              />
                              <div className="flex-1">
                                <p className="font-semibold text-orange-900 flex items-center gap-2">
                                  <Shield className="w-4 h-4" />
                                  Requiere verificación del Director OCIG
                                </p>
                                <p className="text-xs text-orange-700 mt-1">
                                  Si se marca, esta actividad solo se considerará completada después de la verificación y aprobación del Director de la Oficina de Control Interno
                                </p>
                              </div>
                            </label>

                            {/* Estado de Verificación */}
                            {actividad.requiereVerificacionDirector && actividad.porcentajeAvance === 100 && (
                              <div className="mt-4 pt-4 border-t-2 border-amber-300">
                                {actividad.verificadaPorDirector ? (
                                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-green-800 mb-2">
                                      <CheckCircle2 className="w-5 h-5" />
                                      <p className="font-bold">✓ Verificada por el Director OCIG</p>
                                    </div>
                                    <p className="text-xs text-green-700">
                                      Fecha: {actividad.fechaVerificacion ? new Date(actividad.fechaVerificacion).toLocaleString('es-CO') : 'N/A'}
                                    </p>
                                    {actividad.observacionesDirector && (
                                      <div className="mt-2 pt-2 border-t border-green-200">
                                        <p className="text-xs font-semibold text-green-900">Observaciones del Director:</p>
                                        <p className="text-sm text-green-800 mt-1">{actividad.observacionesDirector}</p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3">
                                    <p className="text-sm font-bold text-yellow-900 mb-2 flex items-center gap-2">
                                      <AlertCircle className="w-4 h-4" />
                                      ⏳ Pendiente de verificación del Director
                                    </p>
                                    <p className="text-xs text-yellow-800 mb-3">
                                      Esta actividad ha sido completada pero requiere la verificación y aprobación del Director de Control Interno para ser considerada finalizada.
                                    </p>
                                    
                                    {/* Solo el Director puede verificar - simulación de permisos */}
                                    <div className="space-y-2">
                                      <textarea
                                        placeholder="Observaciones del Director (opcional)..."
                                        className="w-full px-3 py-2 border-2 border-yellow-300 rounded-lg text-sm"
                                        rows={2}
                                        id={`obs-director-${actividad.id}`}
                                      />
                                      <button
                                        onClick={() => {
                                          const observaciones = (document.getElementById(`obs-director-${actividad.id}`) as HTMLTextAreaElement)?.value || '';
                                          const planActualizado = {
                                            ...plan,
                                            roles: plan.roles.map(r => {
                                              if (r.numero === rol.numero) {
                                                return {
                                                  ...r,
                                                  actividades: r.actividades.map(act => {
                                                    if (act.id === actividad.id) {
                                                      return {
                                                        ...act,
                                                        verificadaPorDirector: true,
                                                        fechaVerificacion: new Date().toISOString(),
                                                        observacionesDirector: observaciones
                                                      };
                                                    }
                                                    return act;
                                                  })
                                                };
                                              }
                                              return r;
                                            })
                                          };
                                          onActualizar(planActualizado);
                                          toast.success('Actividad verificada por el Director');
                                        }}
                                        className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:shadow-lg text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Verificar como Director OCIG
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Botones */}
                          <div className="flex gap-3">
                            <button
                              onClick={() => guardarSeguimiento(rol.numero, actividad.id)}
                              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                            >
                              <Check className="w-5 h-5" />
                              Guardar
                            </button>
                            <button
                              onClick={() => {
                                setActividadExpandida(null);
                                setNuevaObservacion('');
                                setMostrarSelectorApoyo(false);
                              }}
                              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Modal de Adjuntos */}
      {modalAdjuntos && (
        <ModalGestionAdjuntos
          actividad={plan.roles
            .find(r => r.numero === modalAdjuntos.rolNumero)
            ?.actividades.find(a => a.id === modalAdjuntos.actividadId)!}
          onCerrar={() => setModalAdjuntos(null)}
          onActualizar={(adjuntos, observaciones) => {
            const planActualizado = {
              ...plan,
              roles: plan.roles.map(rol => {
                if (rol.numero === modalAdjuntos.rolNumero) {
                  return {
                    ...rol,
                    actividades: rol.actividades.map(act => {
                      if (act.id === modalAdjuntos.actividadId) {
                        return { ...act, adjuntos, observacionesCumplimiento: observaciones };
                      }
                      return act;
                    })
                  };
                }
                return rol;
              })
            };
            onActualizar(planActualizado);
            toast.success('Evidencias y observaciones actualizadas correctamente');
          }}
        />
      )}
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN 3: APROBACIÓN (antes Sección 4)
// ════════════════════════════════════════════════════════════════════════════

const ESTADO_PLAN_A_BACKEND: Record<EstadoPlan, string> = {
  BORRADOR: 'borrador',
  EN_REVISION: 'en-revision',
  APROBADO: 'aprobado',
  VIGENTE: 'en-ejecucion',
  CERRADO: 'completado',
};

function SeccionAprobacion({ plan, onActualizar, onRefetchPlan, puedeAprobarPlan = false }: { plan: PlanAnual; onActualizar: (plan: PlanAnual) => void; onRefetchPlan?: () => void; puedeAprobarPlan?: boolean }) {
  const [guardando, setGuardando] = useState(false);

  const cambiarEstado = async (nuevoEstado: EstadoPlan) => {
    const planActualizado = {
      ...plan,
      estado: nuevoEstado,
      fechaAprobacion: nuevoEstado === 'APROBADO' ? new Date().toISOString() : plan.fechaAprobacion
    };
    onActualizar(planActualizado);
    setGuardando(true);
    try {
      const estadoBackend = ESTADO_PLAN_A_BACKEND[nuevoEstado];
      const res = await planAnualApi.update(plan.id, { estado: estadoBackend as 'borrador' | 'en-revision' | 'aprobado' | 'en-ejecucion' | 'completado' });
      if (res.success) {
        toast.success('Estado actualizado', { description: `El plan ahora está en estado: ${nuevoEstado === 'EN_REVISION' ? 'En revisión' : nuevoEstado === 'APROBADO' ? 'Aprobado' : nuevoEstado === 'VIGENTE' ? 'Vigente' : nuevoEstado}` });
        onRefetchPlan?.();
      } else {
        toast.error('Error al guardar', { description: res.error });
        onRefetchPlan?.();
      }
    } catch (e) {
      toast.error('Error', { description: 'No se pudo guardar el estado en el servidor' });
      onRefetchPlan?.();
    } finally {
      setGuardando(false);
    }
  };

  const totalActividades = plan.roles.reduce((sum, rol) => sum + rol.actividades.length, 0);
  const actividadesAsignadas = plan.roles.reduce((sum, rol) => sum + rol.actividades.filter(a => a.responsable !== null).length, 0);
  const porcentajeAsignacion = Math.round((actividadesAsignadas / totalActividades) * 100);

  const puedeEnviarRevision = porcentajeAsignacion === 100;
  const puedeAprobar = plan.estado === 'EN_REVISION';
  const puedeActivar = plan.estado === 'APROBADO';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Estado actual */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Estado del plan</h2>
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
            plan.estado === 'VIGENTE' ? 'bg-green-100' :
            plan.estado === 'APROBADO' ? 'bg-blue-100' :
            plan.estado === 'EN_REVISION' ? 'bg-orange-100' :
            'bg-gray-100'
          }`}>
            <FileCheck className={`w-8 h-8 ${
              plan.estado === 'VIGENTE' ? 'text-green-600' :
              plan.estado === 'APROBADO' ? 'text-blue-600' :
              plan.estado === 'EN_REVISION' ? 'text-orange-600' :
              'text-gray-600'
            }`} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">Estado actual</p>
            <p className="text-2xl font-bold text-gray-900">
              {plan.estado === 'BORRADOR' ? 'Borrador' : 
               plan.estado === 'EN_REVISION' ? 'En revisión' : 
               plan.estado === 'APROBADO' ? 'Aprobado' : 
               plan.estado === 'VIGENTE' ? 'Vigente' : 'Cerrado'}
            </p>
            {plan.fechaAprobacion && (
              <p className="text-sm text-gray-600 mt-1">
                Aprobado el {new Date(plan.fechaAprobacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Checklist de validación */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Validación del plan</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-gray-700">5 roles obligatorios del Decreto 648/2017</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-gray-700">22 actividades distribuidas correctamente</span>
          </div>
          <div className="flex items-center gap-3">
            {porcentajeAsignacion === 100 ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-600" />
            )}
            <span className="text-gray-700">
              Responsables asignados: <strong>{actividadesAsignadas}/{totalActividades}</strong> ({porcentajeAsignacion}%)
            </span>
          </div>
        </div>
      </div>

      {/* Acciones de flujo */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones disponibles</h2>
        <div className="space-y-3">
          <button
            onClick={() => cambiarEstado('EN_REVISION')}
            disabled={!puedeEnviarRevision || plan.estado !== 'BORRADOR' || guardando}
            className="w-full px-6 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileCheck className="w-5 h-5" />}
            Enviar a revisión
          </button>

          <button
            onClick={() => cambiarEstado('APROBADO')}
            disabled={!puedeAprobar || !puedeAprobarPlan || guardando}
            title={!puedeAprobarPlan ? 'Solo el Jefe OCI puede aprobar el plan' : undefined}
            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-5 h-5" />
            Aprobar plan
          </button>

          <button
            onClick={() => cambiarEstado('VIGENTE')}
            disabled={!puedeActivar || !puedeAprobarPlan || guardando}
            title={!puedeAprobarPlan ? 'Solo el Jefe OCI puede activar el plan' : undefined}
            className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-5 h-5" />
            Activar plan (vigente)
          </button>
        </div>

        {!puedeEnviarRevision && plan.estado === 'BORRADOR' && (
          <div className="mt-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900 mb-1">Falta asignar responsables</p>
                <p className="text-sm text-orange-700">
                  Debes asignar un responsable a todas las {totalActividades} actividades antes de enviar el plan a revisión.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
