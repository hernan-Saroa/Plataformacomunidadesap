/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PLANIFICACIÓN OCIG - MÓDULOS SEPARADOS V4.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 ESTRUCTURA MODULAR:
 * Este componente se divide en DOS módulos independientes:
 * 
 * 1. **UNIVERSO AUDITABLE** (con Programa Anual):
 *    - Tab 1: Universo Auditable - DÓNDE se puede auditar (45 procesos)
 *    - Tab 2: Programa Anual - CUÁNDO auditar (16 calendarizadas)
 * 
 * 2. **PLAN OPERATIVO** (independiente):
 *    - Plan Operativo - QUÉ procesos se auditarán (24 auditorías)
 * 
 * 🔄 INTEGRACIÓN CON OTROS MÓDULOS:
 *    - Kanban de Auditorías (ejecución)
 *    - Planes de Mejoramiento (hallazgos y acciones)
 *    - Expedientes (archivo documental)
 *    - Listas de Chequeo (requisitos digitales)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList, Layers, Calendar, CheckCircle2, 
  Info, FileText, AlertTriangle, Filter, Search,
  Download, Plus, BarChart3, Activity
} from 'lucide-react';

// Componentes del sistema
import { PlanAnualModuleMejorado } from './PlanAnualModuleMejorado';
import { UniversoAuditorias } from './UniversoAuditorias';
import { ProgramaAnualCIG } from './ProgramaAnualCIG';
import { HeaderModuloCIG } from './HeaderModuloCIG';
import { FormularioAuditoriaUnificado, type AuditoriaUnificadaFormData } from './FormularioAuditoriaUnificado';
import { toast } from 'sonner@2.0.3';
import { universoAuditoriasApi, planAnual5RolesApi, auditoriasApi, hallazgosApi } from './services/api';
import { useCrearNotificacion } from './hooks/useCrearNotificacion';
import { useAuth } from '../../../hooks/useAuth';
import { authService } from '../../../services/api/authService';
import { Permissions } from '../../../enums/permissions';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type VistaModulo = 'universo-programa' | 'plan-operativo';
type TabActiva = 'plan-anual' | 'universo' | 'programa';
type EstadoPlan = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'PUBLICADO';

interface PlanificacionModuleProps {
  vista?: VistaModulo; // 'universo-programa' o 'plan-operativo'
}

interface FiltrosAvanzados {
  año: number;
  estado: EstadoPlan | 'TODOS';
  area: string;
  busqueda: string;
}

interface EstadisticasGlobales {
  totalAuditoriasPlanificadas: number;
  totalPlanesAnuales: number; // Número de planes anuales
  auditoriasAprobadas: number;
  procesosUniverso: number;
  procesosAuditables: number;
  auditoriasCalendarizadas: number;
  cumplimientoPrograma: number;
  areasInvolucradas: number;
  auditoresAsignados: number;
  ultimaActualizacion?: Date; // Fecha de última actualización
}

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK
// ════════════════════════════════════════════════════════════════════════════

const ESTADISTICAS_MOCK: EstadisticasGlobales = {
  totalAuditoriasPlanificadas: 24,
  totalPlanesAnuales: 3,
  auditoriasAprobadas: 18,
  procesosUniverso: 45,
  procesosAuditables: 32,
  auditoriasCalendarizadas: 16,
  cumplimientoPrograma: 75,
  areasInvolucradas: 12,
  auditoresAsignados: 8
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function PlanificacionModuleRediseno({ vista = 'universo-programa' }: PlanificacionModuleProps) {
  // Hooks para notificaciones (las notificaciones de auditoría creada se manejan automáticamente en el backend)
  const { user } = useAuth();
  // Determinar tab inicial según la vista
  const tabInicial: TabActiva = vista === 'plan-operativo' ? 'plan-anual' : 'universo';
  
  const [tabActiva, setTabActiva] = useState<TabActiva>(tabInicial);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [modalNuevaAuditoriaOpen, setModalNuevaAuditoriaOpen] = useState(false);
  const [estadisticas, setEstadisticas] = useState<EstadisticasGlobales>(ESTADISTICAS_MOCK);
  const [loadingEstadisticas, setLoadingEstadisticas] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosAvanzados>({
    año: new Date().getFullYear(), // Siempre inicializar con el año actual
    estado: 'TODOS',
    area: 'TODAS',
    busqueda: ''
  });

  // Generar años disponibles para el selector (año actual ± 2 años)
  const añosDisponibles = useMemo(() => {
    const añoActual = new Date().getFullYear();
    const años = [];
    for (let i = añoActual - 2; i <= añoActual + 2; i++) {
      años.push(i);
    }
    return años;
  }, []);

  // Función para cargar estadísticas (extraída para reutilización)
  const cargarEstadisticas = async () => {
    try {
      setLoadingEstadisticas(true);
      
      // Cargar datos en paralelo
      const [procesosResponse, planesResponse, auditoriasResponse] = await Promise.all([
        universoAuditoriasApi.getAllProcesos(),
        planAnual5RolesApi.findAll(),
        auditoriasApi.getAllKanban()
      ]);

      // Calcular estadísticas
      const procesos = procesosResponse.success && procesosResponse.data ? procesosResponse.data : [];
      const planes = planesResponse.success && planesResponse.data ? planesResponse.data : [];
      const auditorias = auditoriasResponse.success && auditoriasResponse.data ? auditoriasResponse.data : [];

      // Filtrar auditorías del año actual
      const añoActual = filtros.año;
      const auditoriasAnoActual = auditorias.filter((aud: any) => {
        // Primero intentar obtener el año desde fechaInicio
        if (aud.fechaInicio) {
          const fechaInicio = new Date(aud.fechaInicio);
          if (!isNaN(fechaInicio.getTime())) {
            return fechaInicio.getFullYear() === añoActual;
          }
        }
        // Si no hay fecha válida, intentar obtener el año desde el código (ej: AUD-2025-001)
        if (aud.codigo) {
          const codigoMatch = aud.codigo.match(/AUD-(\d{4})-/);
          if (codigoMatch) {
            const añoCodigo = parseInt(codigoMatch[1]);
            return añoCodigo === añoActual;
          }
        }
        // Si no hay fecha ni código válido, excluir
        return false;
      });

      // Procesos seleccionados (prioridad = 1)
      const procesosSeleccionados = procesos.filter((p: any) => p.prioridad === 1);
      
      // ✅ Auditorías aprobadas = Auditorías con campo aprobada = true
      const auditoriasAprobadas = auditoriasAnoActual.filter((aud: any) => 
        aud.aprobada === true
      );

      // Auditorías calendarizadas = auditorías del año filtrado
      // (filtradas por año y activas desde el backend)
      const auditoriasCalendarizadas = auditoriasAnoActual.length;

      // Calcular áreas involucradas (procesos únicos)
      const areasInvolucradas = new Set(procesosSeleccionados.map((p: any) => p.dependencia || p.territorial || 'Sede')).size;

      // Calcular auditores asignados (de todas las auditorías)
      const auditoresUnicos = new Set();
      auditoriasAnoActual.forEach((aud: any) => {
        if (aud.auditorLiderId) auditoresUnicos.add(aud.auditorLiderId);
        if (aud.auditorAsignadoId) auditoresUnicos.add(aud.auditorAsignadoId);
        if (aud.equipoAuditores && Array.isArray(aud.equipoAuditores)) {
          aud.equipoAuditores.forEach((eq: any) => {
            if (eq.personaId) auditoresUnicos.add(eq.personaId);
          });
        }
      });

      // ✅ Calcular cumplimiento (auditorías finalizadas / auditorías aprobadas)
      const auditoriasCompletadas = auditoriasAnoActual.filter((aud: any) => 
        aud.estado === 'Finalizada' || aud.estado === 'cerrada' || aud.estado === 'finalizada'
      );
      const cumplimientoPrograma = auditoriasAprobadas.length > 0
        ? Math.round((auditoriasCompletadas.length / auditoriasAprobadas.length) * 100)
        : 0;

      const nuevasEstadisticas: EstadisticasGlobales = {
        totalAuditoriasPlanificadas: planes.reduce((sum: number, plan: any) => {
          // Sumar actividades de todos los roles
          return sum + (plan.roles?.reduce((rolSum: number, rol: any) => {
            return rolSum + (rol.actividades?.length || 0);
          }, 0) || 0);
        }, 0),
        totalPlanesAnuales: planes.length, // Número de planes anuales
        auditoriasAprobadas: auditoriasAprobadas.length,
        procesosUniverso: procesos.length,
        procesosAuditables: procesosSeleccionados.length, // Solo los seleccionados (prioridad = 1)
        auditoriasCalendarizadas: auditoriasCalendarizadas, // Ya es un número (auditorias.length)
        cumplimientoPrograma,
        areasInvolucradas,
        auditoresAsignados: auditoresUnicos.size,
        ultimaActualizacion: new Date() // Guardar fecha de última actualización
      };

      setEstadisticas(nuevasEstadisticas);
    } catch (error) {
      console.error('[Dashboard] Error al cargar estadísticas:', error);
      // Mantener datos mock en caso de error
      setEstadisticas(ESTADISTICAS_MOCK);
    } finally {
      setLoadingEstadisticas(false);
    }
  }
  // Handler para crear auditoría
  const handleCrearAuditoria = async (data: AuditoriaUnificadaFormData) => {
    console.log('📝 Nueva auditoría OCIG desde Planeación Operativa:', data);
    
    // Simulación de delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast.success('✅ Auditoría OCIG creada exitosamente', {
      description: `"${data.titulo}" ha sido agregada al Plan Operativo ${data.planAnualAño || 2025}`
    });
    
    setModalNuevaAuditoriaOpen(false);
  };

  // Cargar estadísticas desde la BD
  useEffect(() => {
    cargarEstadisticas();
  }, [filtros.año]);

  // Función auxiliar para mapear tipoAuditoria del formulario al enum del backend
  const mapTipoAuditoria = (tipoAuditoria: string): string => {
    const mapping: Record<string, string> = {
      'regular': 'Regular',
      'territorial': 'Territorial',
      'especial': 'Especial',
      'gestión': 'Regular',
      'cumplimiento': 'Regular',
      'desempeño': 'Regular',
      'sistemas': 'Regular',
      'financiera': 'Regular',
      'seguimiento': 'Regular'
    };
    return mapping[tipoAuditoria.toLowerCase()] || 'Regular';
  };

  // Handler para crear auditoría
  const handleCrearAuditoria = async (data: AuditoriaUnificadaFormData) => {
    try {
      // Validar fechas antes de enviar
      if (new Date(data.fechaFin) < new Date(data.fechaInicio)) {
        toast.error('Error de validación', {
          description: 'La fecha de finalización debe ser posterior a la fecha de inicio'
        });
        return;
      }

      // Mapear datos del formulario al formato del backend
      const auditoriaData: any = {
        nombre: data.titulo, // Mapear titulo -> nombre
        descripcion: data.descripcion || undefined,
        tipo: mapTipoAuditoria(data.tipoAuditoria),
        territorial: data.territorial,
        sede: data.territorial || 'Sede Principal',
        responsable: data.auditorLider || data.auditorAsignado || 'No asignado',
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        fase: 'planeacion' as const,
        prioridad: 'Media' as const,
        progreso: 0,
      };

      // Agregar campos adicionales si tienen valor
      if (data.areaObjetivo) auditoriaData.areaObjetivo = data.areaObjetivo;
      if (data.procesoAuditado) auditoriaData.procesoAuditado = data.procesoAuditado;
      if (data.alcance) auditoriaData.alcance = data.alcance;
      if (data.metodologia) auditoriaData.metodologia = data.metodologia;
      if (data.nivelRiesgo) auditoriaData.nivelRiesgo = data.nivelRiesgo;
      if (data.responsableAreaNombre) auditoriaData.responsableAreaNombre = data.responsableAreaNombre;
      if (data.responsableAreaCargo) auditoriaData.responsableAreaCargo = data.responsableAreaCargo;
      if (data.responsableAreaEmail) auditoriaData.responsableAreaEmail = data.responsableAreaEmail;
      
      // Mapear IDs de auditores (convertir 'aud-001' a número si es necesario)
      if (data.auditorLider) {
        const liderId = data.auditorLider.startsWith('aud-') 
          ? parseInt(data.auditorLider.replace('aud-', ''), 10) 
          : data.auditorLider;
        if (!isNaN(Number(liderId))) auditoriaData.auditorLiderId = Number(liderId);
      }
      
      if (data.auditorAsignado) {
        const asignadoId = data.auditorAsignado.startsWith('aud-') 
          ? parseInt(data.auditorAsignado.replace('aud-', ''), 10) 
          : data.auditorAsignado;
        if (!isNaN(Number(asignadoId))) auditoriaData.auditorAsignadoId = Number(asignadoId);
      }
      
      if (data.supervisorAsignado) {
        const supervisorId = data.supervisorAsignado.startsWith('aud-') 
          ? parseInt(data.supervisorAsignado.replace('aud-', ''), 10) 
          : data.supervisorAsignado;
        if (!isNaN(Number(supervisorId))) auditoriaData.supervisorAsignadoId = Number(supervisorId);
      }

      // Arrays - objetivos, criterios, normatividad, riesgos, controles, equipo
      if (data.objetivos && data.objetivos.length > 0) {
        auditoriaData.objetivos = data.objetivos;
      }
      
      if (data.criteriosAuditoria && data.criteriosAuditoria.length > 0) {
        auditoriaData.criteriosAuditoria = data.criteriosAuditoria;
      }
      
      if (data.normatividadAplicable && data.normatividadAplicable.length > 0) {
        // Por ahora guardamos normatividad en observaciones, luego podemos crear una tabla específica
        auditoriaData.observacionesAdicionales = data.observacionesAdicionales 
          ? `${data.observacionesAdicionales}\n\nNormatividad aplicable:\n${data.normatividadAplicable.join('\n')}`
          : `Normatividad aplicable:\n${data.normatividadAplicable.join('\n')}`;
      }
      
      if (data.riesgosIdentificados && data.riesgosIdentificados.length > 0) {
        // Guardar riesgos en calificacionRiesgo o crear campo específico
        auditoriaData.calificacionRiesgo = data.calificacionRiesgo 
          ? `${data.calificacionRiesgo}\n\nRiesgos identificados:\n${data.riesgosIdentificados.join('\n')}`
          : `Riesgos identificados:\n${data.riesgosIdentificados.join('\n')}`;
      }
      
      if (data.controlesAplicar && data.controlesAplicar.length > 0) {
        // Guardar controles en observaciones
        const controlesText = `Controles a aplicar:\n${data.controlesAplicar.join('\n')}`;
        auditoriaData.observacionesAdicionales = auditoriaData.observacionesAdicionales 
          ? `${auditoriaData.observacionesAdicionales}\n\n${controlesText}`
          : controlesText;
      }
      
      if (data.equipoAuditores && data.equipoAuditores.length > 0) {
        auditoriaData.equipoAuditores = data.equipoAuditores;
      }
      
      // Presupuesto (convertir string a número si es posible)
      if (data.presupuestoEstimado) {
        const presupuesto = data.presupuestoEstimado.replace(/[^\d]/g, ''); // Remover puntos y comas
        if (presupuesto) {
          auditoriaData.presupuestoEstimado = presupuesto;
        }
      }

      // Periodicidad - guardar en programaAnualMetadata
      if (data.periodicidad) {
        if (!auditoriaData.programaAnualMetadata) {
          auditoriaData.programaAnualMetadata = {};
        }
        auditoriaData.programaAnualMetadata.periodicidad = data.periodicidad;
      }

      // Vinculación Plan Anual - guardar en programaAnualMetadata
      if (data.vinculadaPlanAnual) {
        if (!auditoriaData.programaAnualMetadata) {
          auditoriaData.programaAnualMetadata = {};
        }
        auditoriaData.programaAnualMetadata.vinculadaPlanAnual = data.vinculadaPlanAnual;
        if (data.planAnualAño) {
          auditoriaData.programaAnualMetadata.planAnualAño = data.planAnualAño;
        }
        if (data.planAnualId) {
          auditoriaData.programaAnualMetadata.planAnualId = data.planAnualId;
        }
        if (data.rolDecretoAsociado) {
          auditoriaData.programaAnualMetadata.rolDecretoAsociado = data.rolDecretoAsociado;
        }
      }

      // Hitos - guardar en programaAnualMetadata
      if (data.hitos && data.hitos.length > 0) {
        if (!auditoriaData.programaAnualMetadata) {
          auditoriaData.programaAnualMetadata = {};
        }
        auditoriaData.programaAnualMetadata.hitos = data.hitos;
      }

      // Recursos - guardar en observaciones o en un campo JSON
      if (data.recursos && data.recursos.length > 0) {
        const recursosText = `Recursos requeridos:\n${data.recursos.map(r => 
          `- ${r.tipo}: ${r.descripcion} (Cantidad: ${r.cantidad}${r.costo ? `, Costo: ${r.costo}` : ''})`
        ).join('\n')}`;
        auditoriaData.observacionesAdicionales = auditoriaData.observacionesAdicionales 
          ? `${auditoriaData.observacionesAdicionales}\n\n${recursosText}`
          : recursosText;
      }

      // Productos Esperados - guardar en observaciones
      if (data.productosEsperados && data.productosEsperados.length > 0) {
        const productosText = `Productos esperados:\n${data.productosEsperados.map(p => 
          `- ${p.nombre}: ${p.descripcion} (Fecha entrega: ${p.fechaEntrega})`
        ).join('\n')}`;
        auditoriaData.observacionesAdicionales = auditoriaData.observacionesAdicionales 
          ? `${auditoriaData.observacionesAdicionales}\n\n${productosText}`
          : productosText;
      }

      // Llamar a la API para crear la auditoría
      const response = await auditoriasApi.create(auditoriaData);
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al crear la auditoría');
      }

      const auditoriaCreada = response.data;

      // ============ NOTIFICACIONES: Auditoría Creada ============
      // NOTA: Las notificaciones se crean automáticamente en el backend (crearNotificacionesAuditoriaCreada)
      // para todos los usuarios relacionados: auditor líder, auditor asignado, supervisor y jefes de control interno.
      // No es necesario crear notificaciones adicionales desde el frontend.

      // Crear los hallazgos si hay alguno
      if (data.hallazgos && data.hallazgos.length > 0) {
        // Mapear tipo del formulario al tipo opcional del backend
        const mapTipoHallazgo = (tipo: string): 'no-conformidad' | 'observacion' | 'oportunidad-mejora' => {
          const mapping: Record<string, 'no-conformidad' | 'observacion' | 'oportunidad-mejora'> = {
            'observacion': 'observacion',
            'hallazgo_administrativo': 'no-conformidad',
            'hallazgo_disciplinario': 'no-conformidad',
            'hallazgo_fiscal': 'no-conformidad',
            'hallazgo_penal': 'no-conformidad'
          };
          return mapping[tipo] || 'observacion';
        };

        // Mapear estado del formulario al estado del backend
        const mapEstadoHallazgo = (estado: string): 'borrador' | 'notificado' | 'en-controversia' | 'ratificado' | 'modificado' | 'cerrado' => {
          const mapping: Record<string, 'borrador' | 'notificado' | 'en-controversia' | 'ratificado' | 'modificado' | 'cerrado'> = {
            'identificado': 'borrador',
            'comunicado': 'notificado',
            'en_mejoramiento': 'notificado',
            'cerrado': 'cerrado'
          };
          return mapping[estado] || 'borrador';
        };

        // Crear cada hallazgo
        let hallazgosCreados = 0;
        for (const hallazgoForm of data.hallazgos) {
          // Validar que el hallazgo tenga datos mínimos requeridos
          if (!hallazgoForm.descripcion || hallazgoForm.descripcion.trim().length < 10) {
            console.warn('[handleCrearAuditoria] Hallazgo sin descripción válida, omitiendo:', hallazgoForm);
            continue;
          }

          if (!hallazgoForm.criterio || hallazgoForm.criterio.trim().length < 5) {
            console.warn('[handleCrearAuditoria] Hallazgo sin criterio válido, omitiendo:', hallazgoForm);
            continue;
          }

          // Mapear datos al formato que espera el DTO del backend
          // Construir descripción completa incluyendo causa y efecto si existen
          let descripcionCompleta = hallazgoForm.descripcion;
          if (hallazgoForm.causa) {
            descripcionCompleta += `\n\nCAUSA:\n${hallazgoForm.causa}`;
          }
          if (hallazgoForm.efecto) {
            descripcionCompleta += `\n\nEFECTO:\n${hallazgoForm.efecto}`;
          }

          const hallazgoData: any = {
            // Campos requeridos
            categoria: 'borrador' as const, // HallazgoCategoria: 'critico' | 'controversia' | 'borrador'
            area: data.areaObjetivo || 'No especificada', // Campo requerido
            auditoria: auditoriaCreada.codigo || auditoriaCreada.nombre, // Campo requerido - código de la auditoría
            auditoriaId: auditoriaCreada.id, // Opcional pero recomendado
            descripcion: descripcionCompleta, // Campo requerido - ahora incluye causa y efecto
            criterioIncumplido: hallazgoForm.criterio, // Campo requerido
            fechaDeteccion: hallazgoForm.fechaIdentificacion || new Date().toISOString().split('T')[0], // Campo requerido
            
            // Campos opcionales
            titulo: hallazgoForm.descripcion.substring(0, 100) || 'Hallazgo sin título',
            tipo: mapTipoHallazgo(hallazgoForm.tipo), // Tipo opcional: 'no-conformidad' | 'observacion' | 'oportunidad-mejora'
            estado: mapEstadoHallazgo(hallazgoForm.estado), // Estado opcional pero recomendado
            
            // Recomendaciones como array
            recomendaciones: hallazgoForm.recomendacion ? [hallazgoForm.recomendacion] : [],
            
            // Guardar causa y efecto en observaciones si existe el campo
            observacionesControversia: (hallazgoForm.causa || hallazgoForm.efecto) 
              ? `CAUSA: ${hallazgoForm.causa || 'No especificada'}\n\nEFECTO: ${hallazgoForm.efecto || 'No especificado'}`
              : undefined,
          };

          try {
            const hallazgoResponse = await hallazgosApi.create(hallazgoData);
            if (hallazgoResponse.success) {
              hallazgosCreados++;
            } else {
              console.error('[handleCrearAuditoria] Error al crear hallazgo:', hallazgoResponse.message);
              console.error('[handleCrearAuditoria] Respuesta completa:', hallazgoResponse);
            }
          } catch (error: any) {
            console.error('[handleCrearAuditoria] Error al crear hallazgo:', error);
            console.error('[handleCrearAuditoria] Datos enviados:', hallazgoData);
            // Continuar con los demás hallazgos aunque falle uno
          }
        }

        console.log(`[handleCrearAuditoria] ${hallazgosCreados} de ${data.hallazgos.length} hallazgos creados`);
      }
      
      toast.success('✅ Auditoría OCIG creada exitosamente', {
        description: `"${data.titulo}"${data.hallazgos && data.hallazgos.length > 0 ? ` con ${data.hallazgos.length} hallazgo(s)` : ''} ha sido agregada al Plan Anual ${data.planAnualAño || 2025}`
      });
      
      setModalNuevaAuditoriaOpen(false);
      
      // Recargar datos si es necesario (puedes agregar una función de recarga aquí)
      // await cargarAuditorias();
    } catch (error: any) {
      console.error('Error al crear auditoría:', error);
      toast.error('Error al crear auditoría', {
        description: error.message || 'No se pudo guardar la auditoría. Por favor, intente nuevamente.'
      });
    }
  };

  // Calcular métricas derivadas
  const metricas = useMemo(() => ({
    porcentajeAprobacion: estadisticas.totalAuditoriasPlanificadas > 0 
      ? Math.round((estadisticas.auditoriasAprobadas / estadisticas.totalAuditoriasPlanificadas) * 100)
      : 0,
    porcentajeCobertura: estadisticas.procesosUniverso > 0
      ? Math.round((estadisticas.procesosAuditables / estadisticas.procesosUniverso) * 100)
      : 0,
    porcentajeCalendarizacion: estadisticas.auditoriasAprobadas > 0
      ? Math.round((estadisticas.auditoriasCalendarizadas / estadisticas.auditoriasAprobadas) * 100)
      : 0
  }), [estadisticas]);

  const tabs = [
    {
      id: 'universo' as TabActiva,
      label: 'Universo Auditable',
      icon: <Layers className="w-4 h-4" />,
      descripcion: 'Identifica DÓNDE se puede auditar - Todos los procesos institucionales disponibles',
      badge: estadisticas.procesosUniverso
    },
    {
      id: 'plan-anual' as TabActiva,
      label: 'Plan Operativo',
      icon: <ClipboardList className="w-4 h-4" />,
      descripcion: 'Define QUÉ procesos se auditarán - Selección de auditorías a ejecutar',
      badge: estadisticas.totalPlanesAnuales
    },
    {
      id: 'programa' as TabActiva,
      label: 'Programa Anual',
      icon: <Calendar className="w-4 h-4" />,
      descripcion: 'Calendariza CUÁNDO auditar - Programación temporal de auditorías',
      badge: estadisticas.auditoriasCalendarizadas
    }
  ];

  // Filtrar tabs según la vista del módulo
  const tabsVisibles = vista === 'plan-operativo' 
    ? tabs.filter(t => t.id === 'plan-anual') // Solo Plan Operativo
    : tabs.filter(t => t.id === 'universo' || t.id === 'programa'); // Universo + Programa

  const tabActual = tabsVisibles.find(t => t.id === tabActiva);

  // Determinar título y subtítulo según la vista
  const tituloModulo = vista === 'plan-operativo' 
    ? 'Plan Operativo OCIG' 
    : 'Universo Auditable';
  
  const subtituloModulo = vista === 'plan-operativo'
    ? 'Gestión del Plan Operativo - QUÉ procesos se auditarán'
    : 'Identificación del Universo Auditable y Programación Anual';

  return (
    <div className="flex flex-col bg-gray-50">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER PREMIUM CON HEADERMODULOCIG */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <HeaderModuloCIG
            titulo={tituloModulo}
            subtitulo={subtituloModulo}
          />
        </div>

        {/* Barra de Filtros y Acciones */}
        <div className="px-4 sm:px-6 pb-4">
          <div className="flex flex-col gap-3 bg-gray-50 rounded-lg p-3">
            {/* Filtros Quick */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
              <select
                value={filtros.año}
                onChange={(e) => setFiltros({ ...filtros, año: parseInt(e.target.value) })}
                className="w-full sm:w-auto px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              >
                {añosDisponibles.map(año => (
                  <option key={año} value={año}>{año}</option>
                ))}
              </select>

              <select
                value={filtros.estado}
                onChange={(e) => setFiltros({ ...filtros, estado: e.target.value as any })}
                className="w-full sm:w-auto px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="BORRADOR">Borrador</option>
                <option value="EN_REVISION">En Revisión</option>
                <option value="APROBADO">Aprobado</option>
                <option value="PUBLICADO">Publicado</option>
              </select>

              <button
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg text-sm transition-colors min-h-[44px] ${
                  mostrarFiltros 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros Avanzados</span>
                <span className="sm:hidden">Filtros</span>
              </button>
            </div>

            {/* ⭐ BOTÓN MANDATORIO: PUNTO DE ENTRADA ÚNICO PARA CREAR AUDITORÍAS */}
            {authService.hasPermission(Permissions.CONTROL_INTERNO_PLANEACION_CREATE) && (
            <button
              onClick={() => setModalNuevaAuditoriaOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg font-medium hover:shadow-lg transition-all shadow-md min-h-[44px] w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Nueva Auditoría</span>
            </button>
            )}
          </div>
        </div>

        {/* Panel Filtros Avanzados (Expandible) */}
        <AnimatePresence>
          {mostrarFiltros && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-gray-200"
            >
              <div className="px-6 py-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Buscar por nombre o código
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={filtros.busqueda}
                        onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                        placeholder="AU-2025-001, Auditoría TIC..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Área o Dependencia
                    </label>
                    <select
                      value={filtros.area}
                      onChange={(e) => setFiltros({ ...filtros, area: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="TODAS">Todas las áreas</option>
                      <option value="TIC">Dirección de Tecnología</option>
                      <option value="FINANCIERA">Dirección Financiera</option>
                      <option value="ADMINISTRATIVA">Dirección Administrativa</option>
                      <option value="ACADEMICA">Dirección Académica</option>
                      <option value="TALENTO">Talento Humano</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => setFiltros({
                        año: 2025,
                        estado: 'TODOS',
                        area: 'TODAS',
                        busqueda: ''
                      })}
                      className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                      Limpiar Filtros
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TABS NAVEGACIÓN */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'thin' }}>
            {tabsVisibles.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all text-sm font-medium shrink-0 ${ 
                  tabActiva === tab.id
                    ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden whitespace-nowrap">{tab.label.split(' ')[0]}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  tabActiva === tab.id
                    ? 'bg-[#1e5da8] text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {tab.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Banner de Ayuda Contextual */}
      {tabActual && (
        <div className="shrink-0 bg-blue-50 border-b border-blue-100 px-6 py-3">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900">
              <span className="font-medium">{tabActual.label}:</span> {tabActual.descripcion}
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CONTENIDO TABS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tabActiva}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="min-h-full"
          >
            {tabActiva === 'plan-anual' && <PlanAnualModuleMejorado />}
            {tabActiva === 'universo' && <UniversoAuditorias />}
            {tabActiva === 'programa' && <ProgramaAnualCIG />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER CON INDICADORES */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full" />
              <span>Año Fiscal: {filtros.año}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span>{estadisticas.auditoriasAprobadas} aprobadas</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-yellow-600" />
              <span>{estadisticas.cumplimientoPrograma}% cumplimiento</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-gray-500">
            <BarChart3 className="w-3 h-3" />
            <span>
              Última actualización: {
                estadisticas.ultimaActualizacion
                  ? (() => {
                      const ahora = new Date();
                      const actualizacion = estadisticas.ultimaActualizacion;
                      const diffMs = ahora.getTime() - actualizacion.getTime();
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHours = Math.floor(diffMs / 3600000);
                      const diffDays = Math.floor(diffMs / 86400000);
                      
                      // Formatear según el tiempo transcurrido
                      if (diffMins < 1) return 'Hace un momento';
                      if (diffMins < 60) return `Hace ${diffMins} min`;
                      if (diffHours < 24) {
                        const hora = actualizacion.getHours().toString().padStart(2, '0');
                        const minuto = actualizacion.getMinutes().toString().padStart(2, '0');
                        return `Hoy ${hora}:${minuto}`;
                      }
                      if (diffDays === 1) return 'Ayer';
                      if (diffDays < 7) return `Hace ${diffDays} días`;
                      // Si es más de una semana, mostrar fecha completa
                      return actualizacion.toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    })()
                  : 'Cargando...'
              }
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL FORMULARIO UNIFICADO */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <FormularioAuditoriaUnificado
        open={modalNuevaAuditoriaOpen}
        onClose={() => setModalNuevaAuditoriaOpen(false)}
        onSubmit={handleCrearAuditoria}
        mode="create"
        initialData={{
          vinculadaPlanAnual: true,
          planAnualAño: filtros.año
        }}
      />
    </div>
  );
}