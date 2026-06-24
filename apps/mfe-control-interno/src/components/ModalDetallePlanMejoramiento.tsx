                                          /**
                                           * ═══════════════════════════════════════════════════════════════════════════
                                           * MODAL DETALLE PLAN DE MEJORAMIENTO - VERSIÓN PREMIUM
                                           * ═══════════════════════════════════════════════════════════════════════════
                                           * 
                                           * Modal completo para visualización y gestión de Planes de Mejoramiento
                                           * 
                                           * CARACTERÍSTICAS:
                                           * - 5 tabs: Resumen, Hallazgos, Acciones, Documentos, Seguimiento
                                           * - Dashboard con KPIs detallados
                                           * - Gestión de acciones (crear, editar, completar)
                                           * - Carga de evidencias
                                           * - Timeline de actividades
                                           * - Semáforos de vencimiento
                                           * - Progreso visual por hallazgo y global
                                           * 
                                           * VERSIÓN: 3.0 - PREMIUM
                                           * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
                                           */

                                          import { useState, useMemo, useEffect, useCallback } from 'react';
                                          import { createPortal } from 'react-dom';
                                          import { motion, AnimatePresence } from 'motion/react';
                                          import {
                                            X, Calendar, User, Clock, AlertTriangle, CheckCircle2, FileText,
                                            TrendingUp, Activity, Target, Flag, Plus, Upload, Download,
                                            Edit2, Trash2, Eye, MessageSquare, Paperclip, History,
                                            BarChart3, Users, Building2, AlertCircle, Check, XCircle, Loader2, RefreshCw, ChevronDown,
                                            Lock, Lightbulb, ClipboardList, ArrowRight, BarChart2, GitBranch
                                          } from 'lucide-react';
                                          import { toast } from 'sonner';

                                          // ✅ HOOK DE BACKEND
                                          import { usePlanMejoramientoDetalle } from './services/usePlanMejoramientoDetalle';

                                          // ✅ API para profesionales OCIG
                                          import { configuracionesProfesionalesOCIGApi } from './services/api';

                                          // ✅ API para cargar evidencias
                                          import { controlInternoService } from '../services/api/controlInternoService';

                                          // ✅ Utilidades PDF para reportes institucionales
                                          import { 
                                            dibujarEncabezadoInstitucional, 
                                            dibujarPieInstitucional
                                          } from './services/pdfESAPHeader';

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // TIPOS
                                          // ════════════════════════════════════════════════════════════════════════════

                                          interface Hallazgo {
                                            id: string;
                                            codigo: string;
                                            descripcion: string;
                                            criticidad: 'ALTA' | 'MEDIA' | 'BAJA';
                                            proceso: string;
                                            responsable: string;
                                            accionesCount: number;
                                            accionesCompletadas: number;
                                            progreso: number;
                                          }

                                          interface AccionCorrectiva {
                                            id: string;
                                            hallazgoId: string;
                                            descripcion: string;
                                            responsable: string;
                                            fechaInicio: string;
                                            fechaVencimiento: string;
                                            estado: 'PENDIENTE' | 'EN_EJECUCION' | 'COMPLETADA' | 'VENCIDA';
                                            progreso: number;
                                            evidencias: number;
                                            observaciones?: string;
                                          }

                                          interface DocumentoPlan {
                                            id: string;
                                            nombre: string;
                                            tipo: string;
                                            fechaCarga: string;
                                            autor: string;
                                            tamanio: string;
                                          }

                                          interface ActividadTimeline {
                                            id: string;
                                            tipo: 'CREACION' | 'ACTUALIZACION' | 'COMPLETADA' | 'EVIDENCIA' | 'COMENTARIO';
                                            descripcion: string;
                                            usuario: string;
                                            fecha: string;
                                          }

                                          // Tipo para eventos del timeline (historial) que viene del backend
                                          interface EventoTimeline {
                                            id: string;
                                            tipo: string;
                                            descripcion: string;
                                            usuarioNombre?: string;
                                            fecha: string;
                                            metadata?: Record<string, any>;
                                          }

                                          interface PlanMejoramientoDetalle {
                                            id: string;
                                            codigo: string;
                                            nombre: string;
                                            area: string;
                                            responsableGeneral: string;
                                            fechaCreacion: string;
                                            fechaVencimiento: string;
                                            estado: 'BORRADOR' | 'REVISION' | 'FORMULACION' | 'APROBACION' | 'EN_EJECUCION' | 'EN_SEGUIMIENTO' | 'CUMPLIDO' | 'RECHAZADO' | 'VENCIDO';
                                            progresoGlobal: number;
                                            hallazgos: Hallazgo[];
                                            acciones: AccionCorrectiva[];
                                            documentos?: DocumentoPlan[];
                                            timeline: EventoTimeline[];
                                            seguimientos: SeguimientoTrimestral[];
                                            auditoria: string;
                                            auditoriaId?: string;
                                            observaciones?: string;
                                          }

                                          interface RegistroSeguimiento {
                                            id: string;
                                            accionId: string;
                                            accionDescripcion: string;
                                            accionesProgramadas: number;
                                            accionesImplementadas: number;
                                            puntajeCumplimiento: number;
                                            controlesImplementados: 'SI' | 'NO' | 'PARCIAL';
                                            hallazgoSeRepite: 'SI' | 'NO';
                                            puntajeEfectividad: number;
                                            observaciones?: string;
                                          }

                                          interface SeguimientoTrimestral {
                                            id: string;
                                            trimestre: number;
                                            año: number;
                                            fechaInicio: string;
                                            fechaFin: string;
                                            fechaSeguimiento?: string;
                                            avanceGlobal: number;
                                            porcentajeCumplimiento: number;
                                            porcentajeEfectividad: number;
                                            accionesRevisadas: number;
                                            accionesTotales: number;
                                            observacionesGenerales?: string;
                                            registros: RegistroSeguimiento[];
                                            createdAt: string;
                                          }

                                          type TabActiva = 'resumen' | 'hallazgos' | 'acciones' | 'documentos' | 'seguimiento' | 'cierre';

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // DATOS MOCK
                                          // ════════════════════════════════════════════════════════════════════════════

                                          const PLAN_MOCK: PlanMejoramientoDetalle = {
                                            id: 'pm-2024-004',
                                            codigo: 'PM-2024-004',
                                            nombre: 'Plan de Mejoramiento - Auditoría TIC - Seguridad de la Información',
                                            area: 'Dirección de Tecnología',
                                            responsableGeneral: 'Jorge Silva',
                                            fechaCreacion: '2024-10-15',
                                            fechaVencimiento: '2025-04-15',
                                            estado: 'EN_EJECUCION',
                                            progresoGlobal: 45,
                                            auditoria: 'AU-2024-008 - Auditoría Control Interno TIC',
                                            observaciones: 'Plan en ejecución con avance según cronograma. Requiere seguimiento cercano en acciones de criticidad alta.',
                                            
                                            hallazgos: [
                                              {
                                                id: 'h1',
                                                codigo: 'H-001',
                                                descripcion: 'Falta de políticas documentadas de seguridad de la información',
                                                criticidad: 'ALTA',
                                                proceso: 'Gestión de Seguridad TI',
                                                responsable: 'Jorge Silva',
                                                accionesCount: 3,
                                                accionesCompletadas: 1,
                                                progreso: 33
                                              },
                                              {
                                                id: 'h2',
                                                codigo: 'H-002',
                                                descripcion: 'Ausencia de backups periódicos de bases de datos críticas',
                                                criticidad: 'ALTA',
                                                proceso: 'Infraestructura TI',
                                                responsable: 'María González',
                                                accionesCount: 2,
                                                accionesCompletadas: 1,
                                                progreso: 50
                                              },
                                              {
                                                id: 'h3',
                                                codigo: 'H-003',
                                                descripcion: 'Falta de capacitación en ciberseguridad para funcionarios',
                                                criticidad: 'MEDIA',
                                                proceso: 'Talento Humano TI',
                                                responsable: 'Carlos Méndez',
                                                accionesCount: 2,
                                                accionesCompletadas: 2,
                                                progreso: 100
                                              },
                                              {
                                                id: 'h4',
                                                codigo: 'H-004',
                                                descripcion: 'Documentación desactualizada de procedimientos técnicos',
                                                criticidad: 'BAJA',
                                                proceso: 'Gestión Documental TI',
                                                responsable: 'Ana Torres',
                                                accionesCount: 1,
                                                accionesCompletadas: 0,
                                                progreso: 0
                                              }
                                            ],

                                            acciones: [
                                              // Hallazgo H-001
                                              {
                                                id: 'a1',
                                                hallazgoId: 'h1',
                                                descripcion: 'Elaborar Manual de Políticas de Seguridad de la Información según ISO 27001',
                                                responsable: 'Jorge Silva',
                                                fechaInicio: '2024-10-20',
                                                fechaVencimiento: '2024-12-15',
                                                estado: 'COMPLETADA',
                                                progreso: 100,
                                                evidencias: 3,
                                                observaciones: 'Completado y socializado con el equipo'
                                              },
                                              {
                                                id: 'a2',
                                                hallazgoId: 'h1',
                                                descripcion: 'Aprobación del manual por el Comité de Dirección',
                                                responsable: 'Jorge Silva',
                                                fechaInicio: '2024-12-16',
                                                fechaVencimiento: '2025-01-15',
                                                estado: 'EN_EJECUCION',
                                                progreso: 60,
                                                evidencias: 1
                                              },
                                              {
                                                id: 'a3',
                                                hallazgoId: 'h1',
                                                descripcion: 'Socialización del manual a todos los funcionarios',
                                                responsable: 'María González',
                                                fechaInicio: '2025-01-16',
                                                fechaVencimiento: '2025-02-28',
                                                estado: 'PENDIENTE',
                                                progreso: 0,
                                                evidencias: 0
                                              },
                                              
                                              // Hallazgo H-002
                                              {
                                                id: 'a4',
                                                hallazgoId: 'h2',
                                                descripcion: 'Implementar sistema automatizado de backups diarios',
                                                responsable: 'María González',
                                                fechaInicio: '2024-11-01',
                                                fechaVencimiento: '2024-12-31',
                                                estado: 'COMPLETADA',
                                                progreso: 100,
                                                evidencias: 2
                                              },
                                              {
                                                id: 'a5',
                                                hallazgoId: 'h2',
                                                descripcion: 'Documentar procedimiento de restauración y realizar pruebas',
                                                responsable: 'Carlos Méndez',
                                                fechaInicio: '2025-01-05',
                                                fechaVencimiento: '2025-03-15',
                                                estado: 'EN_EJECUCION',
                                                progreso: 40,
                                                evidencias: 1
                                              },

                                              // Hallazgo H-003
                                              {
                                                id: 'a6',
                                                hallazgoId: 'h3',
                                                descripcion: 'Diseñar programa de capacitación en ciberseguridad',
                                                responsable: 'Carlos Méndez',
                                                fechaInicio: '2024-10-25',
                                                fechaVencimiento: '2024-11-30',
                                                estado: 'COMPLETADA',
                                                progreso: 100,
                                                evidencias: 2
                                              },
                                              {
                                                id: 'a7',
                                                hallazgoId: 'h3',
                                                descripcion: 'Ejecutar jornadas de capacitación para 100% del personal',
                                                responsable: 'Ana Torres',
                                                fechaInicio: '2024-12-01',
                                                fechaVencimiento: '2025-01-31',
                                                estado: 'COMPLETADA',
                                                progreso: 100,
                                                evidencias: 4
                                              },

                                              // Hallazgo H-004
                                              {
                                                id: 'a8',
                                                hallazgoId: 'h4',
                                                descripcion: 'Actualizar documentación técnica de procedimientos TI',
                                                responsable: 'Ana Torres',
                                                fechaInicio: '2025-02-01',
                                                fechaVencimiento: '2025-04-15',
                                                estado: 'PENDIENTE',
                                                progreso: 0,
                                                evidencias: 0
                                              }
                                            ],

                                            documentos: [
                                              {
                                                id: 'd1',
                                                nombre: 'Plan de Mejoramiento PM-2024-004.pdf',
                                                tipo: 'PDF',
                                                fechaCarga: '2024-10-15',
                                                autor: 'Jorge Silva',
                                                tamanio: '2.4 MB'
                                              },
                                              {
                                                id: 'd2',
                                                nombre: 'Manual Políticas Seguridad v1.0.pdf',
                                                tipo: 'PDF',
                                                fechaCarga: '2024-12-15',
                                                autor: 'Jorge Silva',
                                                tamanio: '3.8 MB'
                                              },
                                              {
                                                id: 'd3',
                                                nombre: 'Evidencia Implementación Backups.xlsx',
                                                tipo: 'XLSX',
                                                fechaCarga: '2024-12-31',
                                                autor: 'María González',
                                                tamanio: '1.2 MB'
                                              },
                                              {
                                                id: 'd4',
                                                nombre: 'Certificados Capacitación Ciberseguridad.pdf',
                                                tipo: 'PDF',
                                                fechaCarga: '2025-01-31',
                                                autor: 'Carlos Méndez',
                                                tamanio: '5.6 MB'
                                              }
                                            ],

                                            timeline: [
                                              {
                                                id: 't1',
                                                tipo: 'CREACION',
                                                descripcion: 'Plan de mejoramiento creado',
                                                usuarioNombre: 'Jorge Silva',
                                                fecha: '2024-10-15 09:30'
                                              },
                                              {
                                                id: 't2',
                                                tipo: 'COMPLETADA',
                                                descripcion: 'Acción A1 completada: Manual de Políticas elaborado',
                                                usuarioNombre: 'Jorge Silva',
                                                fecha: '2024-12-15 16:45'
                                              },
                                              {
                                                id: 't3',
                                                tipo: 'EVIDENCIA',
                                                descripcion: 'Cargada evidencia de implementación de backups',
                                                usuarioNombre: 'María González',
                                                fecha: '2024-12-31 11:20'
                                              },
                                              {
                                                id: 't4',
                                                tipo: 'COMPLETADA',
                                                descripcion: 'Hallazgo H-003 completado al 100%',
                                                usuarioNombre: 'Carlos Méndez',
                                                fecha: '2025-01-31 14:30'
                                              },
                                              {
                                                id: 't5',
                                                tipo: 'ACTUALIZACION',
                                                descripcion: 'Actualizado progreso de acción A2 al 60%',
                                                usuarioNombre: 'Jorge Silva',
                                                fecha: '2025-02-10 10:15'
                                              }
                                            ],

                                            seguimientos: []
                                          };

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // COMPONENTE PRINCIPAL
                                          // ════════════════════════════════════════════════════════════════════════════

                                          interface ModalDetallePlanProps {
                                            planId: string;
                                            onClose: () => void;
                                            onPlanActualizado?: () => void;
                                            modoPortal?: boolean;
                                          }

                                          export function ModalDetallePlanMejoramiento({ planId, onClose, onPlanActualizado, modoPortal = false }: ModalDetallePlanProps) {
                                            const [tabActiva, setTabActiva] = useState<TabActiva>('resumen');
                                            const [modalActualizacion, setModalActualizacion] = useState(false);
                                            const [modalCrearAccion, setModalCrearAccion] = useState(false);

                                            // Aprobación / Rechazo del plan (usa endpoints existentes del backend)
                                            const [procesandoAprobacion, setProcesandoAprobacion] = useState(false);
                                            const [procesandoRevision, setProcesandoRevision] = useState(false);
                                            const [modalRechazoAbierto, setModalRechazoAbierto] = useState(false);
                                            const [motivoRechazo, setMotivoRechazo] = useState('');
                                            const [observacionesAprobacion, setObservacionesAprobacion] = useState('');
                                            const [modalAprobacionAbierto, setModalAprobacionAbierto] = useState(false);

                                            // ✅ HOOK DE BACKEND - Carga datos reales
                                            const {
                                              plan,
                                              loading,
                                              error,
                                              refetch,
                                              actualizarPlan,
                                              crearAccion,
                                              actualizarAccion,
                                              eliminarAccion
                                            } = usePlanMejoramientoDetalle(planId);

                                            const handleEnviarRevision = useCallback(async () => {
                                              if (!plan) return;
                                              const audId = (plan as any).auditoriaId;
                                              if (!audId) {
                                                toast.error('No se pudo determinar la auditor�a del plan');
                                                return;
                                              }
                                              setProcesandoRevision(true);
                                              try {
                                                await controlInternoService.enviarPlanRevision(audId, plan.id);
                                                toast.success('Plan enviado a revisi�n', {
                                                  description: 'La OCI revisar� el plan y lo aprobar� o rechazar�.',
                                                });
                                                await refetch();
                                                onPlanActualizado?.();
                                              } catch (err: any) {
                                                toast.error('Error al enviar a revisi�n', {
                                                  description: err?.message || 'Intenta de nuevo en unos segundos.',
                                                });
                                              } finally {
                                                setProcesandoRevision(false);
                                              }
                                            }, [plan, refetch, onPlanActualizado]);

                                            const handleAprobarPlan = useCallback(async () => {
                                              if (!plan) return;
                                              setProcesandoAprobacion(true);
                                              try {
                                                await controlInternoService.aprobarPlanMejoramiento(
                                                  plan.id,
                                                  observacionesAprobacion.trim() || undefined,
                                                );
                                                toast.success(`Plan ${plan.codigo} aprobado exitosamente`);
                                                setModalAprobacionAbierto(false);
                                                setObservacionesAprobacion('');
                                                await refetch();
                                                onPlanActualizado?.();
                                              } catch (err: any) {
                                                toast.error('Error al aprobar el plan', {
                                                  description: err?.message || 'Intenta de nuevo en unos segundos.',
                                                });
                                              } finally {
                                                setProcesandoAprobacion(false);
                                              }
                                            }, [plan, observacionesAprobacion, refetch, onPlanActualizado]);

                                            const handleRechazarPlan = useCallback(async () => {
                                              if (!plan) return;
                                              const motivo = motivoRechazo.trim();
                                              if (motivo.length < 10) {
                                                toast.error('El motivo de rechazo debe tener al menos 10 caracteres');
                                                return;
                                              }
                                              setProcesandoAprobacion(true);
                                              try {
                                                await controlInternoService.rechazarPlanMejoramiento(plan.id, motivo);
                                                toast.success(`Plan ${plan.codigo} rechazado`, {
                                                  description: 'El responsable deberá ajustar y reenviar.',
                                                });
                                                setModalRechazoAbierto(false);
                                                setMotivoRechazo('');
                                                await refetch();
                                                onPlanActualizado?.();
                                              } catch (err: any) {
                                                toast.error('Error al rechazar el plan', {
                                                  description: err?.message || 'Intenta de nuevo en unos segundos.',
                                                });
                                              } finally {
                                                setProcesandoAprobacion(false);
                                              }
                                            }, [plan, motivoRechazo, refetch, onPlanActualizado]);

                                            const crearAccionYNotificar = useCallback(
                                              async (data: any) => {
                                                const ok = await crearAccion(data);
                                                if (ok) onPlanActualizado?.();
                                                return ok;
                                              },
                                              [crearAccion, onPlanActualizado]
                                            );

                                            const actualizarAccionYNotificar = useCallback(
                                              async (accionId: string, data: any) => {
                                                const ok = await actualizarAccion(accionId, data);
                                                if (ok) onPlanActualizado?.();
                                                return ok;
                                              },
                                              [actualizarAccion, onPlanActualizado]
                                            );

                                            const eliminarAccionYNotificar = useCallback(
                                              async (accionId: string) => {
                                                const ok = await eliminarAccion(accionId);
                                                if (ok) onPlanActualizado?.();
                                                return ok;
                                              },
                                              [eliminarAccion, onPlanActualizado]
                                            );

                                            // Estado para el formulario de actualización
                                            const [datosActualizacion, setDatosActualizacion] = useState({
                                              estado: '',
                                              fechaVencimiento: '',
                                              responsableGeneral: '',
                                              observaciones: ''
                                            });

                                            // Inicializar datos cuando carga el plan
                                            useMemo(() => {
                                              if (plan) {
                                                setDatosActualizacion({
                                                  estado: plan.estado,
                                                  fechaVencimiento: plan.fechaVencimiento,
                                                  responsableGeneral: plan.responsableGeneral,
                                                  observaciones: plan.observaciones || ''
                                                });
                                              }
                                            }, [plan?.id]);

                                            // Estado de evidencias (Documentos) para el badge del tab
                                            const [evidenciasPorAccion, setEvidenciasPorAccion] = useState<Record<string, EvidenciaItem[]>>({});
                                            const [cargandoEvidenciasDoc, setCargandoEvidenciasDoc] = useState(false);
                                            useEffect(() => {
                                              if (!plan?.acciones?.length) {
                                                setEvidenciasPorAccion({});
                                                setCargandoEvidenciasDoc(false);
                                                return;
                                              }
                                              let cancelled = false;
                                              setCargandoEvidenciasDoc(true);
                                              const cargarEvidencias = async () => {
                                                const evidenciasMap: Record<string, EvidenciaItem[]> = {};
                                                for (const accion of plan.acciones) {
                                                  try {
                                                    const evidencias = await controlInternoService.getEvidenciasByAccion(accion.id);
                                                    if (!cancelled) evidenciasMap[accion.id] = Array.isArray(evidencias) ? evidencias : [];
                                                  } catch (error) {
                                                    if (!cancelled) evidenciasMap[accion.id] = [];
                                                  }
                                                }
                                                if (!cancelled) {
                                                  setEvidenciasPorAccion(evidenciasMap);
                                                  setCargandoEvidenciasDoc(false);
                                                }
                                              };
                                              cargarEvidencias();
                                              return () => { cancelled = true; };
                                            }, [plan?.id, plan?.acciones]);
                                            const totalEvidencias = useMemo(() => Object.values(evidenciasPorAccion).flat().length, [evidenciasPorAccion]);

                                            const estadisticas = useMemo(() => {
                                              if (!plan) {
                                                return {
                                                  totalAcciones: 0,
                                                  accionesCompletadas: 0,
                                                  accionesEnEjecucion: 0,
                                                  accionesPendientes: 0,
                                                  accionesVencidas: 0,
                                                  totalHallazgos: 0,
                                                  hallazgosResueltos: 0,
                                                  hallazgosCriticosAbiertos: 0,
                                                  porcentajeCompletado: 0
                                                };
                                              }
                                              
                                              const totalAcciones = plan.acciones.length;
                                              const accionesCompletadas = plan.acciones.filter(
                                                (a) => a.estado === 'COMPLETADA' || (a.progreso ?? 0) >= 100
                                              ).length;
                                              const accionesEnEjecucion = plan.acciones.filter(
                                                (a) => a.estado === 'EN_EJECUCION' || ((a.progreso ?? 0) > 0 && (a.progreso ?? 0) < 100)
                                              ).length;
                                              const accionesPendientes = plan.acciones.filter(
                                                (a) => a.estado === 'PENDIENTE' && (a.progreso ?? 0) === 0
                                              ).length;
                                              const accionesVencidas = plan.acciones.filter(
                                                (a) => a.estado === 'VENCIDA' && (a.progreso ?? 0) < 100
                                              ).length;

                                              const totalHallazgos = plan.hallazgos.length;
                                              const hallazgosResueltos = plan.hallazgos.filter(h => h.progreso === 100).length;
                                              const hallazgosCriticosAbiertos = plan.hallazgos.filter(h => h.criticidad === 'ALTA' && h.progreso < 100).length;

                                              return {
                                                totalAcciones,
                                                accionesCompletadas,
                                                accionesEnEjecucion,
                                                accionesPendientes,
                                                accionesVencidas,
                                                totalHallazgos,
                                                hallazgosResueltos,
                                                hallazgosCriticosAbiertos,
                                                porcentajeCompletado: totalAcciones > 0 ? Math.round((accionesCompletadas / totalAcciones) * 100) : 0
                                              };
                                            }, [plan]);

                                            const handleActualizarPlan = () => {
                                              setModalActualizacion(true);
                                            };

                                            const handleGuardarActualizacion = async () => {
                                              // Validaciones básicas
                                              if (!datosActualizacion.estado) {
                                                toast.error('Debes seleccionar un estado');
                                                return;
                                              }

                                              if (!datosActualizacion.fechaVencimiento) {
                                                toast.error('Debes especificar una fecha de vencimiento');
                                                return;
                                              }

                                              // ✅ LLAMADA AL BACKEND
                                              const exito = await actualizarPlan({
                                                estado: datosActualizacion.estado,
                                                fechaVencimiento: datosActualizacion.fechaVencimiento,
                                                responsableGeneral: datosActualizacion.responsableGeneral,
                                                observaciones: datosActualizacion.observaciones
                                              });

                                              if (exito) {
                                                setModalActualizacion(false);
                                                onPlanActualizado?.();
                                              }
                                            };

                                            const handleDescargarReporte = async () => {
                                              if (!plan) return;
                                              
                                              toast.info('Generando Reporte PDF', {
                                                description: 'Preparando documento del Plan de Mejoramiento...',
                                                duration: 3000,
                                              });

                                              try {
                                                // Importar jsPDF dinámicamente
                                                const jsPDF = (await import('jspdf')).default;
                                                const autoTable = (await import('jspdf-autotable')).default;

                                                // Crear documento PDF
                                                const doc = new jsPDF({
                                                  orientation: 'portrait',
                                                  unit: 'mm',
                                                  format: 'letter'
                                                });

                                                const pageWidth = doc.internal.pageSize.getWidth();
                                                const pageHeight = doc.internal.pageSize.getHeight();
                                                const margin = 20;

                                                // Header institucional
                                                const alturaEncabezado = dibujarEncabezadoInstitucional(doc, {
                                                  codigo: plan.codigo || 'PM-2026',
                                                  version: 1,
                                                  fecha: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
                                                  titulo: 'PLAN DE MEJORAMIENTO',
                                                  proceso: 'EVALUACIÓN CONTROL Y MEJORA'
                                                });
                                                
                                                let currentY = alturaEncabezado + 5;

                                                // Título del plan
                                                doc.setTextColor(0, 61, 165);
                                                doc.setFontSize(12);
                                                doc.setFont('helvetica', 'bold');
                                                doc.text(plan.nombre, pageWidth / 2, currentY, { align: 'center' });
                                                currentY += 10;

                                                // Información General
                                                doc.setTextColor(0, 0, 0);
                                                doc.setFontSize(11);
                                                doc.setFont('helvetica', 'bold');
                                                doc.text('INFORMACIÓN GENERAL', margin, currentY);
                                                currentY += 6;

                                                const infoData = [
                                                  ['Código', plan.codigo],
                                                  ['Área Responsable', plan.area || '-'],
                                                  ['Responsable General', plan.responsableGeneral || '-'],
                                                  ['Auditoría Origen', plan.auditoria || '-'],
                                                  ['Estado', plan.estado],
                                                  ['Fecha Creación', plan.fechaCreacion],
                                                  ['Fecha Vencimiento', plan.fechaVencimiento],
                                                  ['Progreso Global', `${plan.progresoGlobal}%`]
                                                ];

                                                autoTable(doc, {
                                                  startY: currentY,
                                                  head: [],
                                                  body: infoData,
                                                  theme: 'grid',
                                                  styles: { fontSize: 9, cellPadding: 3 },
                                                  columnStyles: {
                                                    0: { fontStyle: 'bold', cellWidth: 45, fillColor: [240, 240, 240] },
                                                    1: { cellWidth: 'auto' }
                                                  },
                                                  margin: { left: margin, right: margin }
                                                });

                                                currentY = (doc as any).lastAutoTable.finalY + 10;

                                                // Hallazgos
                                                if (plan.hallazgos.length > 0) {
                                                  doc.setFontSize(11);
                                                  doc.setFont('helvetica', 'bold');
                                                  doc.setTextColor(0, 61, 165);
                                                  doc.text('HALLAZGOS', margin, currentY);
                                                  currentY += 6;

                                                  const hallazgosData = plan.hallazgos.map((h, idx) => [
                                                    (idx + 1).toString(),
                                                    h.codigo,
                                                    h.descripcion.substring(0, 60) + (h.descripcion.length > 60 ? '...' : ''),
                                                    h.criticidad,
                                                    h.responsable,
                                                    `${h.progreso}%`
                                                  ]);

                                                  autoTable(doc, {
                                                    startY: currentY,
                                                    head: [['#', 'Código', 'Descripción', 'Criticidad', 'Responsable', 'Avance']],
                                                    body: hallazgosData,
                                                    theme: 'striped',
                                                    headStyles: {
                                                      fillColor: [0, 61, 165],
                                                      textColor: [255, 255, 255],
                                                      fontStyle: 'bold',
                                                      fontSize: 8
                                                    },
                                                    styles: { fontSize: 7, cellPadding: 2 },
                                                    columnStyles: {
                                                      0: { cellWidth: 8, halign: 'center' },
                                                      1: { cellWidth: 20 },
                                                      2: { cellWidth: 'auto' },
                                                      3: { cellWidth: 20, halign: 'center' },
                                                      4: { cellWidth: 35 },
                                                      5: { cellWidth: 15, halign: 'center' }
                                                    },
                                                    margin: { left: margin, right: margin }
                                                  });

                                                  currentY = (doc as any).lastAutoTable.finalY + 10;
                                                }

                                                // Verificar si necesita nueva página
                                                if (currentY > pageHeight - 60) {
                                                  doc.addPage();
                                                  currentY = margin + 10;
                                                }

                                                // Acciones Correctivas
                                                if (plan.acciones.length > 0) {
                                                  doc.setFontSize(11);
                                                  doc.setFont('helvetica', 'bold');
                                                  doc.setTextColor(0, 61, 165);
                                                  doc.text('ACCIONES CORRECTIVAS', margin, currentY);
                                                  currentY += 6;

                                                  const accionesData = plan.acciones.map((a, idx) => {
                                                    const estadoLabel = a.estado === 'COMPLETADA' ? 'Completada' :
                                                                        a.estado === 'EN_EJECUCION' ? 'En Ejecución' :
                                                                        a.estado === 'VENCIDA' ? 'Vencida' : 'Pendiente';
                                                    return [
                                                      (idx + 1).toString(),
                                                      a.descripcion.substring(0, 50) + (a.descripcion.length > 50 ? '...' : ''),
                                                      a.responsable,
                                                      a.fechaInicio,
                                                      a.fechaVencimiento,
                                                      estadoLabel,
                                                      `${a.progreso}%`
                                                    ];
                                                  });

                                                  autoTable(doc, {
                                                    startY: currentY,
                                                    head: [['#', 'Descripción', 'Responsable', 'Inicio', 'Vencimiento', 'Estado', 'Avance']],
                                                    body: accionesData,
                                                    theme: 'striped',
                                                    headStyles: {
                                                      fillColor: [0, 61, 165],
                                                      textColor: [255, 255, 255],
                                                      fontStyle: 'bold',
                                                      fontSize: 8
                                                    },
                                                    styles: { fontSize: 7, cellPadding: 2 },
                                                    columnStyles: {
                                                      0: { cellWidth: 8, halign: 'center' },
                                                      1: { cellWidth: 'auto' },
                                                      2: { cellWidth: 30 },
                                                      3: { cellWidth: 20 },
                                                      4: { cellWidth: 20 },
                                                      5: { cellWidth: 22, halign: 'center' },
                                                      6: { cellWidth: 15, halign: 'center' }
                                                    },
                                                    margin: { left: margin, right: margin }
                                                  });

                                                  currentY = (doc as any).lastAutoTable.finalY + 10;
                                                }

                                                // Resumen de avance
                                                if (currentY > pageHeight - 50) {
                                                  doc.addPage();
                                                  currentY = margin + 10;
                                                }

                                                doc.setFontSize(11);
                                                doc.setFont('helvetica', 'bold');
                                                doc.setTextColor(0, 61, 165);
                                                doc.text('RESUMEN DE AVANCE', margin, currentY);
                                                currentY += 6;

                                                const completadas = plan.acciones.filter(a => a.estado === 'COMPLETADA').length;
                                                const enEjecucion = plan.acciones.filter(a => a.estado === 'EN_EJECUCION').length;
                                                const pendientes = plan.acciones.filter(a => a.estado === 'PENDIENTE').length;
                                                const vencidas = plan.acciones.filter(a => a.estado === 'VENCIDA').length;

                                                const resumenData = [
                                                  ['Total Hallazgos', plan.hallazgos.length.toString()],
                                                  ['Total Acciones', plan.acciones.length.toString()],
                                                  ['Acciones Completadas', completadas.toString()],
                                                  ['Acciones En Ejecución', enEjecucion.toString()],
                                                  ['Acciones Pendientes', pendientes.toString()],
                                                  ['Acciones Vencidas', vencidas.toString()],
                                                  ['Progreso Global', `${plan.progresoGlobal}%`]
                                                ];

                                                autoTable(doc, {
                                                  startY: currentY,
                                                  head: [],
                                                  body: resumenData,
                                                  theme: 'grid',
                                                  styles: { fontSize: 9, cellPadding: 3 },
                                                  columnStyles: {
                                                    0: { fontStyle: 'bold', cellWidth: 50, fillColor: [240, 240, 240] },
                                                    1: { cellWidth: 30, halign: 'center' }
                                                  },
                                                  margin: { left: margin, right: margin }
                                                });

                                                currentY = (doc as any).lastAutoTable.finalY + 10;

                                                // Observaciones
                                                if (plan.observaciones) {
                                                  doc.setFontSize(11);
                                                  doc.setFont('helvetica', 'bold');
                                                  doc.setTextColor(0, 61, 165);
                                                  doc.text('OBSERVACIONES', margin, currentY);
                                                  currentY += 6;
                                                  
                                                  doc.setFont('helvetica', 'normal');
                                                  doc.setTextColor(0, 0, 0);
                                                  doc.setFontSize(9);
                                                  const observacionesLines = doc.splitTextToSize(plan.observaciones, pageWidth - margin * 2);
                                                  doc.text(observacionesLines, margin, currentY);
                                                }

                                                // Footer institucional en todas las páginas
                                                const totalPages = doc.getNumberOfPages();
                                                for (let i = 1; i <= totalPages; i++) {
                                                  doc.setPage(i);
                                                  dibujarPieInstitucional(doc, i, true);
                                                }

                                                // Guardar PDF
                                                const nombreArchivo = `Plan-Mejoramiento-${plan.codigo}-${new Date().toISOString().split('T')[0]}.pdf`;
                                                doc.save(nombreArchivo);

                                                toast.success('Reporte PDF Generado', {
                                                  description: `Archivo ${nombreArchivo} descargado exitosamente`,
                                                  duration: 4000,
                                                });

                                              } catch (error) {
                                                console.error('Error generando PDF:', error);
                                                toast.error('Error al generar PDF', {
                                                  description: 'No se pudo generar el reporte. Intente nuevamente.',
                                                });
                                              }
                                            };

                                            const estadoConfig: Record<PlanMejoramientoDetalle['estado'], { bg: string; text: string; label: string }> = {
                                              BORRADOR: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Borrador' },
                                              REVISION: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En Revisión' },
                                              FORMULACION: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Formulación' },
                                              APROBACION: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Aprobado' },
                                              EN_EJECUCION: { bg: 'bg-green-100', text: 'text-green-700', label: 'En Ejecución' },
                                              EN_SEGUIMIENTO: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'En Seguimiento' },
                                              CUMPLIDO: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Cumplido' },
                                              RECHAZADO: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rechazado' },
                                              VENCIDO: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Vencido' },
                                            };

                                            // ═══════════════════════════════════════════════════════════════════════════
                                            // ESTADOS DE CARGA Y ERROR
                                            // ═══════════════════════════════════════════════════════════════════════════
                                            
                                            if (loading) {
                                              return (
                                                <div className="fixed inset-0 z-[9998] overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                                  <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
                                                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                                    <p className="text-gray-700 font-medium">Cargando plan de mejoramiento...</p>
                                                  </div>
                                                </div>
                                              );
                                            }

                                            if (error || !plan) {
                                              return (
                                                <div className="fixed inset-0 z-[9998] overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                                  <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 max-w-md">
                                                    <AlertCircle className="w-12 h-12 text-red-500" />
                                                    <h3 className="text-lg font-bold text-gray-900">Error al cargar el plan</h3>
                                                    <p className="text-gray-600 text-center">{error || 'No se pudo obtener la información del plan'}</p>
                                                    <div className="flex gap-3">
                                                      <button
                                                        onClick={() => refetch()}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700"
                                                      >
                                                        <RefreshCw className="w-4 h-4" />
                                                        Reintentar
                                                      </button>
                                                      <button
                                                        onClick={onClose}
                                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                                                      >
                                                        Cerrar
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            }

                                            const config = estadoConfig[plan.estado];

                                            return (
                                              <div className="fixed inset-0 z-[9998] overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                                {/* Overlay con efecto blur */}
                                                <div className="absolute inset-0" onClick={onClose} />

                                                {/* Modal - Tamaño optimizado con mejor responsive */}
                                                <div className="relative w-full max-w-[95vw] lg:max-w-[85vw] xl:max-w-7xl my-auto mx-4 bg-white rounded-2xl shadow-2xl flex flex-col min-h-[80vh] max-h-[90vh] z-[9999]">
                                                  {/* Header compacto */}
                                                  <div className="flex-shrink-0 bg-[#1e5da8] text-white px-4 sm:px-5 py-2 rounded-t-2xl">
                                                    {/* Fila 1: Código + Badge + Nombre + Botones */}
                                                    <div className="flex items-center justify-between gap-3">
                                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <h2 className="text-sm sm:text-base font-semibold whitespace-nowrap">{plan.codigo}</h2>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.text} whitespace-nowrap`}>
                                                          {config.label}
                                                        </span>
                                                        <span className="text-blue-200 text-xs truncate hidden sm:inline">— {plan.nombre}</span>
                                                      </div>
                                                      <div className="flex items-center gap-1.5 flex-shrink-0">
{modoPortal && (plan.estado === 'BORRADOR' || plan.estado === 'FORMULACION') && (
  <button
    onClick={handleEnviarRevision}
    disabled={procesandoRevision}
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    title="Enviar el plan a revision de la OCI"
  >
    {procesandoRevision ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
    <span className="hidden sm:inline">Enviar a Revisión</span>
  </button>
)}
                                                        <button
                                                          onClick={onClose}
                                                          className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
                                                          title="Cerrar"
                                                        >
                                                          <X className="w-4 h-4" />
                                                        </button>
                                                      </div>
                                                    </div>
                                                    {/* Fila 2: Metadata inline + Progreso */}
                                                    <div className="flex items-center gap-4 mt-1 text-[11px] text-blue-100 flex-wrap">
                                                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{plan.area}</span>
                                                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{plan.responsableGeneral}</span>
                                                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{plan.fechaVencimiento}</span>
                                                      <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{plan.progresoGlobal}%</span>
                                                      <div className="flex-1 min-w-[80px]">
                                                        <div className="bg-white/20 rounded-full h-1.5 overflow-hidden">
                                                          <div className="bg-white h-full transition-all duration-500" style={{ width: `${plan.progresoGlobal}%` }} />
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>


                                                  {/* Tabs */}
                                                  <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6">
                                                    <div className="flex gap-1">
                                                      <TabButton
                                                        active={tabActiva === 'resumen'}
                                                        onClick={() => setTabActiva('resumen')}
                                                        icon={<BarChart3 className="w-4 h-4" />}
                                                        label="Resumen"
                                                      />
                                                      <TabButton
                                                        active={tabActiva === 'hallazgos'}
                                                        onClick={() => setTabActiva('hallazgos')}
                                                        icon={<AlertTriangle className="w-4 h-4" />}
                                                        label="Hallazgos"
                                                        badge={plan.hallazgos.length.toString()}
                                                      />
                                                      <TabButton
                                                        active={tabActiva === 'acciones'}
                                                        onClick={() => setTabActiva('acciones')}
                                                        icon={<Target className="w-4 h-4" />}
                                                        label="Acciones"
                                                        badge={plan.acciones.length.toString()}
                                                      />
                                                      <TabButton
                                                        active={tabActiva === 'documentos'}
                                                        onClick={() => setTabActiva('documentos')}
                                                        icon={<FileText className="w-4 h-4" />}
                                                        label="Documentos"
                                                        badge={totalEvidencias > 0 ? totalEvidencias.toString() : undefined}
                                                      />
                                                      <TabButton
                                                        active={tabActiva === 'seguimiento'}
                                                        onClick={() => setTabActiva('seguimiento')}
                                                        icon={<History className="w-4 h-4" />}
                                                        label="Seguimiento"
                                                      />
                                                      {plan.estado === 'CUMPLIDO' && (
                                                        <TabButton
                                                          active={tabActiva === 'cierre'}
                                                          onClick={() => setTabActiva('cierre')}
                                                          icon={<Lock className="w-4 h-4" />}
                                                          label="Estado Final"
                                                        />
                                                      )}
                                                    </div>
                                                  </div>

                                                  {/* Contenido */}
                                                  <div className="flex-1 overflow-auto px-6 py-4">
                                                    <AnimatePresence mode="wait">
                                                      <motion.div
                                                        key={tabActiva}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -20 }}
                                                        transition={{ duration: 0.2 }}
                                                      >
                                                        {tabActiva === 'resumen' && <TabResumen plan={plan} estadisticas={estadisticas} />}
                                                        {tabActiva === 'hallazgos' && (
                                                          <TabHallazgos 
                                                            plan={plan} 
                                                            onCrearAccion={crearAccionYNotificar}
                                                            modoPortal={modoPortal}
                                                          />
                                                        )}
                                                        {tabActiva === 'acciones' && (
                                                          <TabAcciones 
                                                            plan={plan} 
                                                            onActualizarAccion={actualizarAccionYNotificar}
                                                            onEliminarAccion={eliminarAccionYNotificar}
                                                            onCrearAccion={crearAccionYNotificar}
                                                            onRefresh={refetch}
                                                          />
                                                        )}
                                                        {tabActiva === 'documentos' && (
                                                          <TabDocumentos
                                                            plan={plan}
                                                            evidenciasPorAccion={evidenciasPorAccion}
                                                            setEvidenciasPorAccion={setEvidenciasPorAccion}
                                                            cargandoEvidencias={cargandoEvidenciasDoc}
                                                          />
                                                        )}
                                                        {tabActiva === 'seguimiento' && <TabSeguimiento plan={plan} />}
                                                        {tabActiva === 'cierre' && <TabCierre plan={plan} />}
                                                      </motion.div>
                                                    </AnimatePresence>
                                                  </div>

                                                  {/* Footer con Acciones */}
                                                  <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
                                                    <div className="flex items-center justify-between">
                                                      <div className="text-sm text-gray-600">
                                                        Plan ID: {plan.id?.substring(0, 8)}...
                                                      </div>
                                                      <div className="flex gap-3">
{/* Botones Aprobar/Rechazar: solo en backoffice (OCI), estado REVISION */}
{!modoPortal && (plan.estado === 'revision' || plan.estado === 'REVISION') && (
  <>
    <button
      onClick={() => setModalRechazoAbierto(true)}
      disabled={procesandoAprobacion}
      className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
      title="Rechazar el plan y solicitar ajustes"
    >
      <XCircle className="w-4 h-4" />
      Rechazar
    </button>
    <button
      onClick={() => setModalAprobacionAbierto(true)}
      disabled={procesandoAprobacion}
      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
      title="Aprobar el plan de mejoramiento"
    >
      <Check className="w-4 h-4" />
      Aprobar Plan
    </button>
  </>
)}
                                                        <button
                                                          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                                                          onClick={handleDescargarReporte}
                                                        >
                                                          <Download className="w-4 h-4" />
                                                          Descargar Reporte
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Modal de Aprobación del Plan */}
                                                {modalAprobacionAbierto && (
                                                  <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                                                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !procesandoAprobacion && setModalAprobacionAbierto(false)} />
                                                    <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col">
                                                      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                                                        <div className="flex items-center gap-2">
                                                          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                                                            <Check className="w-5 h-5 text-emerald-700" />
                                                          </div>
                                                          <h3 className="text-base font-semibold text-gray-900">Aprobar Plan de Mejoramiento</h3>
                                                        </div>
                                                        <button
                                                          onClick={() => !procesandoAprobacion && setModalAprobacionAbierto(false)}
                                                          className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500"
                                                          disabled={procesandoAprobacion}
                                                        >
                                                          <X className="w-4 h-4" />
                                                        </button>
                                                      </div>
                                                      <div className="p-5 space-y-3">
                                                        <p className="text-sm text-gray-700">
                                                          Vas a aprobar el plan <strong>{plan.codigo}</strong>. El plan pasará a estado <em>Aprobado</em> y se notificará al responsable.
                                                        </p>
                                                        <div>
                                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Observaciones (opcional)
                                                          </label>
                                                          <textarea
                                                            value={observacionesAprobacion}
                                                            onChange={(e) => setObservacionesAprobacion(e.target.value)}
                                                            rows={3}
                                                            maxLength={500}
                                                            placeholder="Comentarios sobre la aprobación..."
                                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                            disabled={procesandoAprobacion}
                                                          />
                                                          <div className="text-xs text-gray-400 text-right mt-1">{observacionesAprobacion.length}/500</div>
                                                        </div>
                                                      </div>
                                                      <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                                                        <button
                                                          onClick={() => setModalAprobacionAbierto(false)}
                                                          disabled={procesandoAprobacion}
                                                          className="px-4 py-2 text-sm rounded-lg text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                                                        >
                                                          Cancelar
                                                        </button>
                                                        <button
                                                          onClick={handleAprobarPlan}
                                                          disabled={procesandoAprobacion}
                                                          className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-60"
                                                        >
                                                          {procesandoAprobacion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                          Confirmar Aprobación
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Modal de Rechazo del Plan */}
                                                {modalRechazoAbierto && (
                                                  <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                                                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !procesandoAprobacion && setModalRechazoAbierto(false)} />
                                                    <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col">
                                                      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                                                        <div className="flex items-center gap-2">
                                                          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                                                            <XCircle className="w-5 h-5 text-red-700" />
                                                          </div>
                                                          <h3 className="text-base font-semibold text-gray-900">Rechazar Plan de Mejoramiento</h3>
                                                        </div>
                                                        <button
                                                          onClick={() => !procesandoAprobacion && setModalRechazoAbierto(false)}
                                                          className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500"
                                                          disabled={procesandoAprobacion}
                                                        >
                                                          <X className="w-4 h-4" />
                                                        </button>
                                                      </div>
                                                      <div className="p-5 space-y-3">
                                                        <p className="text-sm text-gray-700">
                                                          Vas a rechazar el plan <strong>{plan.codigo}</strong>. El responsable deberá ajustar las acciones y reenviar.
                                                        </p>
                                                        <div>
                                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Motivo del rechazo <span className="text-red-500">*</span>
                                                          </label>
                                                          <textarea
                                                            value={motivoRechazo}
                                                            onChange={(e) => setMotivoRechazo(e.target.value)}
                                                            rows={4}
                                                            maxLength={1000}
                                                            placeholder="Indica con claridad las razones del rechazo (mínimo 10 caracteres)..."
                                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                                            disabled={procesandoAprobacion}
                                                          />
                                                          <div className="flex items-center justify-between mt-1">
                                                            <div className={`text-xs ${motivoRechazo.trim().length < 10 ? 'text-red-500' : 'text-gray-400'}`}>
                                                              {motivoRechazo.trim().length < 10
                                                                ? `Faltan ${10 - motivoRechazo.trim().length} caracteres`
                                                                : 'Motivo válido'}
                                                            </div>
                                                            <div className="text-xs text-gray-400">{motivoRechazo.length}/1000</div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                      <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                                                        <button
                                                          onClick={() => setModalRechazoAbierto(false)}
                                                          disabled={procesandoAprobacion}
                                                          className="px-4 py-2 text-sm rounded-lg text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                                                        >
                                                          Cancelar
                                                        </button>
                                                        <button
                                                          onClick={handleRechazarPlan}
                                                          disabled={procesandoAprobacion || motivoRechazo.trim().length < 10}
                                                          className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                                                        >
                                                          {procesandoAprobacion ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                                          Confirmar Rechazo
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Modal de Actualización */}
                                                {modalActualizacion && (
                                                  <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
                                                    {/* Overlay con efecto blur oscuro */}
                                                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalActualizacion(false)} />

                                                    {/* Modal - Tamaño optimizado */}
                                                    <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
                                                      {/* Header */}
                                                      <div className="flex-shrink-0 bg-[#1e5da8] text-white px-6 py-4 rounded-t-xl">
                                                        <div className="flex items-start justify-between">
                                                          <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-2">
                                                              <h2 className="text-xl font-medium">Actualizar Plan de Mejoramiento</h2>
                                                            </div>
                                                          </div>

                                                          <button
                                                            onClick={() => setModalActualizacion(false)}
                                                            className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors flex-shrink-0"
                                                          >
                                                            <X className="w-5 h-5" />
                                                          </button>
                                                        </div>
                                                      </div>

                                                      {/* Contenido */}
                                                      <div className="flex-1 overflow-auto px-6 py-4">
                                                        <div className="space-y-4">
                                                          <div className="bg-white rounded-lg border border-gray-200 p-6">
                                                            <h3 className="text-base font-medium text-gray-900 mb-4">Información General</h3>
                                                            <div className="grid grid-cols-2 gap-4">
                                                              <InfoItem label="Código" valor={plan.codigo} />
                                                              <InfoItem label="Estado" valor={plan.estado.replace(/_/g, ' ')} />
                                                              <InfoItem label="Auditoría Origen" valor={plan.auditoria} />
                                                              <InfoItem label="Área Responsable" valor={plan.area} />
                                                              <InfoItem label="Responsable General" valor={plan.responsableGeneral} />
                                                              <InfoItem label="Fecha Creación" valor={plan.fechaCreacion} />
                                                              <InfoItem label="Fecha Vencimiento" valor={plan.fechaVencimiento} />
                                                              <InfoItem label="Progreso Global" valor={`${plan.progresoGlobal}%`} />
                                                            </div>

                                                            {plan.observaciones && (
                                                              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                                <div className="text-sm font-medium text-blue-900 mb-1">Observaciones</div>
                                                                <div className="text-sm text-blue-700">{plan.observaciones}</div>
                                                              </div>
                                                            )}
                                                          </div>

                                                          {/* Distribución de Acciones */}
                                                          <div className="bg-white rounded-lg border border-gray-200 p-6">
                                                            <h3 className="text-base font-medium text-gray-900 mb-4">Distribución de Acciones por Estado</h3>
                                                            <div className="space-y-3">
                                                              <ProgresoBar
                                                                label="Completadas"
                                                                valor={estadisticas.accionesCompletadas}
                                                                total={estadisticas.totalAcciones}
                                                                color="green"
                                                              />
                                                              <ProgresoBar
                                                                label="En Ejecución"
                                                                valor={estadisticas.accionesEnEjecucion}
                                                                total={estadisticas.totalAcciones}
                                                                color="yellow"
                                                              />
                                                              <ProgresoBar
                                                                label="Pendientes"
                                                                valor={estadisticas.accionesPendientes}
                                                                total={estadisticas.totalAcciones}
                                                                color="gray"
                                                              />
                                                              {estadisticas.accionesVencidas > 0 && (
                                                                <ProgresoBar
                                                                  label="Vencidas"
                                                                  valor={estadisticas.accionesVencidas}
                                                                  total={estadisticas.totalAcciones}
                                                                  color="red"
                                                                />
                                                              )}
                                                            </div>
                                                          </div>

                                                          {/* Hallazgos Críticos */}
                                                          {estadisticas.hallazgosCriticosAbiertos > 0 && (
                                                            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                                                              <div className="flex items-start gap-3">
                                                                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                                                <div>
                                                                  <h4 className="text-sm font-medium text-red-900 mb-1">
                                                                    Atención: {estadisticas.hallazgosCriticosAbiertos} Hallazgo(s) Crítico(s) Abierto(s)
                                                                  </h4>
                                                                  <p className="text-sm text-red-700">
                                                                    Existen hallazgos de criticidad alta que requieren atención prioritaria
                                                                  </p>
                                                                </div>
                                                              </div>
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>

                                                      {/* Footer con Acciones */}
                                                      <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
                                                        <div className="flex items-center justify-between">
                                                          <div className="text-sm text-gray-600">
                                                            Plan ID: {plan.id?.substring(0, 8)}...
                                                          </div>
                                                          <div className="flex gap-3">
                                                            <button
                                                              className="px-4 py-2 bg-[#1e5da8] hover:bg-[#174a8a] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                                                              onClick={handleGuardarActualizacion}
                                                            >
                                                              <CheckCircle2 className="w-4 h-4" />
                                                              Guardar Cambios
                                                            </button>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          }

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // KPI CARD
                                          // ════════════════════════════════════════════════════════════════════════════

                                          interface KPICardProps {
                                            label: string;
                                            valor: string | number;
                                            color: 'blue' | 'green' | 'yellow' | 'gray' | 'purple' | 'red';
                                            icon: React.ReactNode;
                                          }

                                          function KPICard({ label, valor, color, icon }: KPICardProps) {
                                            const colorClasses = {
                                              blue: 'bg-blue-50 border-blue-200 text-blue-700',
                                              green: 'bg-green-50 border-green-200 text-green-700',
                                              yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
                                              gray: 'bg-gray-50 border-gray-200 text-gray-700',
                                              purple: 'bg-purple-50 border-purple-200 text-purple-700',
                                              red: 'bg-red-50 border-red-200 text-red-700'
                                            };

                                            return (
                                              <div className={`rounded-lg border px-2 py-1.5 ${colorClasses[color]}`}>
                                                <div className="flex items-center gap-1.5">
                                                  {icon}
                                                  <div className="text-[11px] opacity-80 leading-tight">{label}</div>
                                                </div>
                                                <div className="text-base font-semibold leading-tight mt-0.5">{valor}</div>
                                              </div>
                                            );
                                          }

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // TAB BUTTON
                                          // ════════════════════════════════════════════════════════════════════════════

                                          interface TabButtonProps {
                                            active: boolean;
                                            onClick: () => void;
                                            icon: React.ReactNode;
                                            label: string;
                                            badge?: string;
                                          }

                                          function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
                                            return (
                                              <button
                                                onClick={onClick}
                                                className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-all ${
                                                  active
                                                    ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50'
                                                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                }`}
                                              >
                                                {icon}
                                                {label}
                                                {badge && (
                                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                    active ? 'bg-[#1e5da8] text-white' : 'bg-gray-200 text-gray-700'
                                                  }`}>
                                                    {badge}
                                                  </span>
                                                )}
                                              </button>
                                            );
                                          }

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // TAB: RESUMEN
                                          // ════════════════════════════════════════════════════════════════════════════

                                          function TabResumen({ plan, estadisticas }: { plan: PlanMejoramientoDetalle; estadisticas: any }) {
                                            return (
                                              <div className="space-y-6">
                                                {/* -- Banner de estado -- */}
                                              {(plan.estado === 'REVISION' || plan.estado === 'FORMULACION') && (
                                                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-300">
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-200 text-amber-800">Revision</span>
                                                  <div>
                                                    <div className="font-semibold text-amber-900 text-sm">Plan en revision &mdash; Accion requerida</div>
                                                    <div className="text-amber-800 text-xs mt-1 leading-relaxed">
                                                      El responsable del area ha enviado el plan para tu revision. Usa los botones <strong>Aprobar Plan</strong> o <strong>Rechazar</strong> en la parte inferior para emitir tu decision.
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                              {plan.estado === 'RECHAZADO' && (
                                                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-300">
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-200 text-red-800 shrink-0">X</span>
                                                  <div>
                                                    <div className="font-semibold text-red-900 text-sm">Plan rechazado</div>
                                                    {plan.observaciones && (
                                                      <div className="text-red-800 text-xs mt-1 leading-relaxed"><strong>Motivo:</strong> {plan.observaciones}</div>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                              {(plan.estado === 'EN_EJECUCION' || plan.estado === 'EN_SEGUIMIENTO') && (
                                                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-300">
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-200 text-emerald-800 shrink-0">OK</span>
                                                  <div>
                                                    <div className="font-semibold text-emerald-900 text-sm">Plan aprobado - En ejecucion</div>
                                                    <div className="text-emerald-800 text-xs mt-1">El responsable esta ejecutando las acciones.</div>
                                                  </div>
                                                </div>
                                              )}
                                              {/* Información General */}
                                                <div className="bg-white rounded-lg border border-gray-200 p-6">
                                                  <h3 className="text-base font-medium text-gray-900 mb-4">Información General</h3>
                                                  <div className="grid grid-cols-2 gap-4">
                                                    <InfoItem label="Código" valor={plan.codigo} />
                                                    <InfoItem label="Estado" valor={plan.estado.replace(/_/g, ' ')} />
                                                    <InfoItem label="Auditoría Origen" valor={plan.auditoria} />
                                                    <InfoItem label="Área Responsable" valor={plan.area} />
                                                    <InfoItem label="Responsable General" valor={plan.responsableGeneral} />
                                                    <InfoItem label="Fecha Creación" valor={plan.fechaCreacion} />
                                                    <InfoItem label="Fecha Vencimiento" valor={plan.fechaVencimiento} />
                                                    <InfoItem label="Progreso Global" valor={`${plan.progresoGlobal}%`} />
                                                  </div>

                                                  {plan.observaciones && (
                                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                      <div className="text-sm font-medium text-blue-900 mb-1">Observaciones</div>
                                                      <div className="text-sm text-blue-700">{plan.observaciones}</div>
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Distribución de Acciones */}
                                                <div className="bg-white rounded-lg border border-gray-200 p-6">
                                                  <h3 className="text-base font-medium text-gray-900 mb-4">Distribución de Acciones por Estado</h3>
                                                  <div className="space-y-3">
                                                    <ProgresoBar
                                                      label="Completadas"
                                                      valor={estadisticas.accionesCompletadas}
                                                      total={estadisticas.totalAcciones}
                                                      color="green"
                                                    />
                                                    <ProgresoBar
                                                      label="En Ejecución"
                                                      valor={estadisticas.accionesEnEjecucion}
                                                      total={estadisticas.totalAcciones}
                                                      color="yellow"
                                                    />
                                                    <ProgresoBar
                                                      label="Pendientes"
                                                      valor={estadisticas.accionesPendientes}
                                                      total={estadisticas.totalAcciones}
                                                      color="gray"
                                                    />
                                                    {estadisticas.accionesVencidas > 0 && (
                                                      <ProgresoBar
                                                        label="Vencidas"
                                                        valor={estadisticas.accionesVencidas}
                                                        total={estadisticas.totalAcciones}
                                                        color="red"
                                                      />
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Hallazgos Críticos */}
                                                {estadisticas.hallazgosCriticosAbiertos > 0 && (
                                                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                                                    <div className="flex items-start gap-3">
                                                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                                      <div>
                                                        <h4 className="text-sm font-medium text-red-900 mb-1">
                                                          Atención: {estadisticas.hallazgosCriticosAbiertos} Hallazgo(s) Crítico(s) Abierto(s)
                                                        </h4>
                                                        <p className="text-sm text-red-700">
                                                          Existen hallazgos de criticidad alta que requieren atención prioritaria
                                                        </p>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          }

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // TAB: HALLAZGOS
                                          // ════════════════════════════════════════════════════════════════════════════

                                          interface TabHallazgosProps {
                                            plan: PlanMejoramientoDetalle;
                                            onCrearAccion: (data: any) => Promise<boolean>;
                                            modoPortal?: boolean;
                                          }

                                          function TabHallazgos({ plan, onCrearAccion, modoPortal }: TabHallazgosProps) {
                                            return (
                                              <div className="space-y-4">
                                                <div className="flex items-center justify-between mb-4">
                                                  <div>
                                                    <h3 className="text-base font-medium text-gray-900">Hallazgos del Plan</h3>
                                                    <p className="text-sm text-gray-600">{plan.hallazgos.length} hallazgos identificados</p>
                                                  </div>
                                                </div>

                                                {plan.hallazgos.map((hallazgo) => (
                                                  <CardHallazgo 
                                                    key={hallazgo.id} 
                                                    hallazgo={hallazgo} 
                                                    plan={plan} 
                                                    onCrearAccion={onCrearAccion}
                                                    modoPortal={modoPortal}
                                                  />
                                                ))}
                                              </div>
                                            );
                                          }

                                          interface CardHallazgoProps {
                                            hallazgo: Hallazgo;
                                            plan: PlanMejoramientoDetalle;
                                            onCrearAccion: (data: any) => Promise<boolean>;
                                            modoPortal?: boolean;
                                          }

                                          function CardHallazgo({ hallazgo, plan, onCrearAccion, modoPortal }: CardHallazgoProps) {
                                            const [expandido, setExpandido] = useState(false);
                                            const [modalCrearAccion, setModalCrearAccion] = useState(false);

                                            const criticidadConfig = {
                                              ALTA: { bg: 'bg-red-100', text: 'text-red-700', label: 'Crítica' },
                                              MEDIA: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Media' },
                                              BAJA: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Baja' }
                                            };

                                            const config = criticidadConfig[hallazgo.criticidad];
                                            const accionesHallazgo = plan.acciones.filter(a => a.hallazgoId === hallazgo.id);

                                            return (
                                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                <div className="p-5">
                                                  <div className="flex items-start justify-between gap-4 mb-3">
                                                    <div className="flex-1">
                                                      <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-sm font-medium text-gray-900">{hallazgo.codigo}</span>
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                                                          {config.label}
                                                        </span>
                                                        <span className="text-xs text-gray-600">{hallazgo.proceso}</span>
                                                      </div>
                                                      <p className="text-sm text-gray-700 mb-2">{hallazgo.descripcion}</p>
                                                      <div className="flex items-center gap-4 text-xs text-gray-600">
                                                        <div className="flex items-center gap-1">
                                                          <User className="w-3 h-3" />
                                                          {hallazgo.responsable}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                          <Target className="w-3 h-3" />
                                                          {hallazgo.accionesCompletadas}/{hallazgo.accionesCount} acciones completadas
                                                        </div>
                                                      </div>
                                                    </div>

                                                    {/* Progreso Circular */}
                                                    <div className="text-center">
                                                      <div className={`relative w-16 h-16 rounded-full flex items-center justify-center ${
                                                        hallazgo.progreso === 100 ? 'bg-green-100' :
                                                        hallazgo.progreso >= 50 ? 'bg-yellow-100' :
                                                        'bg-gray-100'
                                                      }`}>
                                                        <span className={`text-lg font-semibold ${
                                                          hallazgo.progreso === 100 ? 'text-green-700' :
                                                          hallazgo.progreso >= 50 ? 'text-yellow-700' :
                                                          'text-gray-700'
                                                        }`}>
                                                          {hallazgo.progreso}%
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Barra de Progreso */}
                                                  <div className="mb-3">
                                                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                                                      <div
                                                        className={`h-full transition-all ${
                                                          hallazgo.progreso === 100 ? 'bg-green-600' :
                                                          hallazgo.progreso >= 50 ? 'bg-yellow-600' :
                                                          'bg-blue-600'
                                                        }`}
                                                        style={{ width: `${hallazgo.progreso}%` }}
                                                      />
                                                    </div>
                                                  </div>

                                                  {/* Botones Ver Acciones y Añadir Acción */}
                                                  <div className="flex items-center gap-3">
                                                    <button
                                                      onClick={() => setExpandido(!expandido)}
                                                      className="text-sm text-[#1e5da8] hover:text-[#2a6dbd] font-medium flex items-center gap-2"
                                                    >
                                                      {expandido ? 'Ocultar' : 'Ver'} {accionesHallazgo.length} acciones
                                                      <ChevronDown className={`w-4 h-4 transition-transform ${expandido ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    
                                                    {/* Añadir acción: solo en modo portal (auditado formula acciones) */}
                                                    {modoPortal && (
                                                    <button
                                                      onClick={() => setModalCrearAccion(true)}
                                                      className="px-3 py-1.5 bg-[#1e5da8] hover:bg-[#174a8a] text-white rounded-lg text-sm hover:shadow transition-all flex items-center gap-1.5"
                                                    >
                                                      <Plus className="w-3.5 h-3.5" />
                                                      Añadir Acción
                                                    </button>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Modal Crear Acción para este hallazgo */}
                                                {modalCrearAccion && (
                                                  <ModalCrearAccion
                                                    hallazgos={[hallazgo]}
                                                    hallazgoPreseleccionado={hallazgo.id}
                                                    onClose={() => setModalCrearAccion(false)}
                                                    onCrear={onCrearAccion}
                                                  />
                                                )}

                                                {/* Lista de Acciones del Hallazgo */}
                                                <AnimatePresence>
                                                  {expandido && (
                                                    <motion.div
                                                      initial={{ height: 0, opacity: 0 }}
                                                      animate={{ height: 'auto', opacity: 1 }}
                                                      exit={{ height: 0, opacity: 0 }}
                                                      className="border-t border-gray-200 bg-gray-50"
                                                    >
                                                      <div className="p-5 space-y-2">
                                                        {accionesHallazgo.map((accion) => (
                                                          <MiniCardAccion key={accion.id} accion={accion} />
                                                        ))}
                                                      </div>
                                                    </motion.div>
                                                  )}
                                                </AnimatePresence>
                                              </div>
                                            );
                                          }

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // TAB: ACCIONES — filtros por ESTADO EFECTIVO del hallazgo
                                          // H_PENDIENTE  : todas sus acciones están pendientes (progreso = 0)
                                          // H_EJECUCION  : al menos una acción en progreso O estados mixtos
                                          // H_COMPLETADA : TODAS las acciones están completadas (progreso ≥ 100)
                                          // ════════════════════════════════════════════════════════════════════════════

                                          type FiltroHallazgoAcciones = 'TODOS' | 'H_PENDIENTE' | 'H_EJECUCION' | 'H_COMPLETADA';

                                          /** Calcula el estado efectivo de una acción (igual que backend determinarEstadoAccionReal) */
                                          function estadoEfectivoAccion(a: AccionCorrectiva): 'COMPLETADA' | 'VENCIDA' | 'EN_EJECUCION' | 'PENDIENTE' {
                                            const prog = a.progreso ?? 0;
                                            if (prog >= 100) return 'COMPLETADA';
                                            if (a.estado === 'VENCIDA') return 'VENCIDA';
                                            if (prog > 0) return 'EN_EJECUCION';
                                            return 'PENDIENTE';
                                          }

                                          /**
                                           * Determina el bucket del hallazgo basándose en los estados efectivos de sus acciones:
                                           * - H_COMPLETADA : TODAS completadas
                                           * - H_PENDIENTE  : TODAS pendientes (sin progreso)
                                           * - H_EJECUCION  : cualquier mezcla (en ejecución, completadas + pendientes, etc.)
                                           */
                                          function bucketHallazgoPorEstados(
                                            plan: PlanMejoramientoDetalle,
                                            hallazgoId: string
                                          ): Exclude<FiltroHallazgoAcciones, 'TODOS'> {
                                            const accs = plan.acciones.filter((a) => a.hallazgoId === hallazgoId);
                                            if (accs.length === 0) return 'H_PENDIENTE'; // sin acciones = pendiente
                                            const estados = accs.map(estadoEfectivoAccion);
                                            const todasCompletadas = estados.every((e) => e === 'COMPLETADA');
                                            if (todasCompletadas) return 'H_COMPLETADA';
                                            const todasPendientes = estados.every((e) => e === 'PENDIENTE');
                                            if (todasPendientes) return 'H_PENDIENTE';
                                            // Mezcla de cualquier tipo → En ejecución
                                            return 'H_EJECUCION';
                                          }

                                          /** % de avance visual del hallazgo (para mostrar en la cabecera de grupo) */
                                          function progresoHallazgoDesdeAcciones(
                                            plan: PlanMejoramientoDetalle,
                                            hallazgoId: string
                                          ): number {
                                            const accs = plan.acciones.filter((a) => a.hallazgoId === hallazgoId);
                                            if (accs.length === 0) return 0;
                                            const sum = accs.reduce((s, a) => s + Math.min(100, Math.max(0, a.progreso ?? 0)), 0);
                                            return Math.round(sum / accs.length);
                                          }

                                          interface TabAccionesProps {
                                            plan: PlanMejoramientoDetalle;
                                            onActualizarAccion: (accionId: string, data: any) => Promise<boolean>;
                                            onEliminarAccion: (accionId: string) => Promise<boolean>;
                                            onCrearAccion: (data: any) => Promise<boolean>;
                                            onRefresh: () => void;
                                          }

                                          function TabAcciones({ plan, onActualizarAccion, onEliminarAccion, onCrearAccion, onRefresh }: TabAccionesProps) {
                                            const [filtroHallazgo, setFiltroHallazgo] = useState<FiltroHallazgoAcciones>('TODOS');
                                            const [modalCrearAccion, setModalCrearAccion] = useState(false);

                                            // ── Contadores por ACCIÓN individual (no por hallazgo) ─────────────────
                                            const conteosPorBucket = useMemo(() => {
                                              let pend = 0;
                                              let ejec = 0;
                                              let comp = 0;
                                              for (const a of plan.acciones) {
                                                const e = estadoEfectivoAccion(a);
                                                if (e === 'COMPLETADA') comp += 1;
                                                else if (e === 'EN_EJECUCION') ejec += 1;
                                                else pend += 1; // PENDIENTE o VENCIDA se cuentan en pendientes
                                              }
                                              return { pend, ejec, comp };
                                            }, [plan.acciones]);

                                            // ── Filtrar hallazgos que tengan AL MENOS 1 acción en el estado seleccionado ──
                                            const hallazgosFiltrados = useMemo(() => {
                                              if (filtroHallazgo === 'TODOS') return plan.hallazgos;
                                              return plan.hallazgos.filter((h) => {
                                                const accs = plan.acciones.filter((a) => a.hallazgoId === h.id);
                                                return accs.some((a) => {
                                                  const e = estadoEfectivoAccion(a);
                                                  if (filtroHallazgo === 'H_COMPLETADA') return e === 'COMPLETADA';
                                                  if (filtroHallazgo === 'H_EJECUCION') return e === 'EN_EJECUCION';
                                                  if (filtroHallazgo === 'H_PENDIENTE') return e === 'PENDIENTE' || e === 'VENCIDA';
                                                  return false;
                                                });
                                              });
                                            }, [plan.hallazgos, plan.acciones, filtroHallazgo]);


                                            const accionesFiltradas = useMemo(() => {
                                              const ids = new Set(hallazgosFiltrados.map((h) => h.id));
                                              return plan.acciones.filter((a) => ids.has(a.hallazgoId));
                                            }, [plan.acciones, hallazgosFiltrados]);

                                            return (
                                              <div className="space-y-4">
                                                <div className="flex flex-col gap-3 mb-4">
                                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                      <h3 className="text-base font-medium text-gray-900">Acciones correctivas por hallazgo</h3>
                                                      <p className="text-sm text-gray-600">
                                                        Filtros por estado de acción:{' '}
                                                        <span className="font-medium text-gray-800">Pendiente</span>,{' '}
                                                        <span className="font-medium text-gray-800">En Ejecución</span>,{' '}
                                                        <span className="font-medium text-gray-800">Completada</span>
                                                      </p>
                                                      <p className="text-xs text-gray-500 mt-1">
                                                        {hallazgosFiltrados.length} hallazgo(s) · {accionesFiltradas.length} acción(es)
                                                      </p>
                                                    </div>
                                                  </div>

                                                  {/* Nota OCI: las acciones las crea el auditado */}
                                                  {(plan.estado === 'BORRADOR' || plan.estado === 'REVISION' || plan.estado === 'FORMULACION') && (
                                                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                                                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                      <span><strong>Fase de formulación:</strong> El responsable del área auditada está formulando las acciones. Una vez envíe el plan podrás revisarlas aquí y Aprobar o Rechazar.</span>
                                                    </div>
                                                  )}

                                                  <div className="flex flex-wrap gap-2 items-center">
                                                    <FiltroButton
                                                      active={filtroHallazgo === 'TODOS'}
                                                      onClick={() => setFiltroHallazgo('TODOS')}
                                                      label={`Todas (${plan.acciones.length})`}
                                                    />
                                                    <FiltroButton
                                                      active={filtroHallazgo === 'H_PENDIENTE'}
                                                      onClick={() => setFiltroHallazgo('H_PENDIENTE')}
                                                      label={`Pendientes (${conteosPorBucket.pend})`}
                                                      color="gray"
                                                    />
                                                    <FiltroButton
                                                      active={filtroHallazgo === 'H_EJECUCION'}
                                                      onClick={() => setFiltroHallazgo('H_EJECUCION')}
                                                      label={`En ejecución (${conteosPorBucket.ejec})`}
                                                      color="yellow"
                                                    />
                                                    <FiltroButton
                                                      active={filtroHallazgo === 'H_COMPLETADA'}
                                                      onClick={() => setFiltroHallazgo('H_COMPLETADA')}
                                                      label={`Completadas (${conteosPorBucket.comp})`}
                                                      color="green"
                                                    />
                                                  </div>
                                                </div>

                                                {hallazgosFiltrados.length === 0 ? (
                                                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                                    <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                                    <p className="font-medium">
                                                      {filtroHallazgo !== 'TODOS'
                                                        ? 'No hay hallazgos en este avance'
                                                        : 'Sin acciones en el plan a�n'}
                                                    </p>
                                                    <p className="text-sm mt-1">
                                                      {filtroHallazgo !== 'TODOS'
                                                        ? 'Prueba otro filtro o revisa el tab Hallazgos.'
                                                        : 'El responsable del �rea debe formular las acciones en el portal del Auditado.'}
                                                    </p>
                                                  </div>
                                                ) : (
                                                  hallazgosFiltrados.map((hallazgo) => {
                                                    const pct = progresoHallazgoDesdeAcciones(plan, hallazgo.id);
                                                    const accsDeH = plan.acciones.filter((a) => {
                                                      if (a.hallazgoId !== hallazgo.id) return false;
                                                      if (filtroHallazgo === 'TODOS') return true;
                                                      const e = estadoEfectivoAccion(a);
                                                      if (filtroHallazgo === 'H_COMPLETADA') return e === 'COMPLETADA';
                                                      if (filtroHallazgo === 'H_EJECUCION') return e === 'EN_EJECUCION';
                                                      if (filtroHallazgo === 'H_PENDIENTE') return e === 'PENDIENTE' || e === 'VENCIDA';
                                                      return false;
                                                    });
                                                    const desc = (hallazgo.descripcion || '').trim();
                                                    const bucket = bucketHallazgoPorEstados(plan, hallazgo.id);
                                                    const bucketLabel =
                                                      bucket === 'H_PENDIENTE'
                                                        ? 'Pendiente'
                                                        : bucket === 'H_COMPLETADA'
                                                          ? 'Completado'
                                                          : 'En ejecución';
                                                    return (
                                                      <div key={hallazgo.id} className="space-y-2">
                                                        <div className="flex items-center justify-between px-1 pt-2 border-t border-gray-100 first:border-t-0 first:pt-0">
                                                          <div className="flex items-center gap-2 min-w-0">
                                                            <span className="text-sm font-semibold text-[#1e5da8] truncate">
                                                              {hallazgo.codigo}
                                                            </span>
                                                            <span className="text-xs text-gray-500 truncate">
                                                              {desc.length > 80 ? `${desc.slice(0, 80)}…` : desc}
                                                            </span>
                                                          </div>
                                                          <span className="text-xs font-bold text-gray-700 shrink-0">
                                                            {pct}% · {bucketLabel}
                                                          </span>
                                                        </div>
                                                        {accsDeH.length === 0 ? (
                                                          <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-900">
                                                            Sin acciones correctivas aún — el hallazgo permanece en <strong>0%</strong> hasta
                                                            que registres acciones.
                                                          </div>
                                                        ) : (
                                                          accsDeH.map((accion) => (
                                                            <CardAccion
                                                              key={accion.id}
                                                              accion={accion}
                                                              plan={plan}
                                                              onActualizarAccion={onActualizarAccion}
                                                              onEliminarAccion={onEliminarAccion}
                                                              onRefresh={onRefresh}
                                                            />
                                                          ))
                                                        )}
                                                      </div>
                                                    );
                                                  })
                                                )}

                                                {/* Acciones sin hallazgo vinculado */}
                                                {(() => {
                                                  const accionesSinHallazgo = plan.acciones.filter(a => !a.hallazgoId || !plan.hallazgos.some(h => h.id === a.hallazgoId));
                                                  if (accionesSinHallazgo.length === 0) return null;
                                                  return (
                                                    <div className="space-y-2 mt-6">
                                                      <div className="flex items-center justify-between px-1 pt-2 border-t border-gray-100">
                                                        <div className="flex items-center gap-2">
                                                          <Target className="w-4 h-4 text-red-600" />
                                                          <span className="text-sm font-bold text-red-600">Acciones sin hallazgo vinculado</span>
                                                        </div>
                                                      </div>
                                                      {accionesSinHallazgo.map(accion => (
                                                        <CardAccion
                                                          key={accion.id}
                                                          accion={accion}
                                                          plan={plan}
                                                          onActualizarAccion={onActualizarAccion}
                                                          onEliminarAccion={onEliminarAccion}
                                                          onRefresh={onRefresh}
                                                        />
                                                      ))}
                                                    </div>
                                                  );
                                                })()}

                                                {/* Modal Crear Acción */}
                                                {modalCrearAccion && (
                                                  <ModalCrearAccion
                                                    hallazgos={plan.hallazgos}
                                                    onClose={() => setModalCrearAccion(false)}
                                                    onCrear={onCrearAccion}
                                                  />
                                                )}
                                              </div>
                                            );
                                          }

                                          interface CardAccionProps {
                                            accion: AccionCorrectiva;
                                            plan: PlanMejoramientoDetalle;
                                            onActualizarAccion: (accionId: string, data: any) => Promise<boolean>;
                                            onEliminarAccion: (accionId: string) => Promise<boolean>;
                                            onRefresh: () => void;
                                            modoPortal?: boolean;
                                          }

                                          interface EvidenciaAccion {
                                            id: string;
                                            nombre: string;
                                            descripcion?: string;
                                            nombreArchivo: string;
                                            tamano: number;
                                            fechaSubida: string;
                                          }

                                          function CardAccion({ accion, plan, onActualizarAccion, onEliminarAccion, onRefresh, modoPortal = false }: CardAccionProps) {
                                            const [modalEditar, setModalEditar] = useState(false);
                                            const [modalEvidencia, setModalEvidencia] = useState(false);
                                            const [evidenciasLista, setEvidenciasLista] = useState<EvidenciaAccion[]>([]);
                                            // Estado local: lista de evidencias (se carga desde backend)�n/evidencias desde backoffice
                                             // const [modalEditar, setModalEditar] = useState(false);
                                             // const [modalEvidencia, setModalEvidencia] = useState(false);
                                            const [cargandoEvidencias, setCargandoEvidencias] = useState(true);
                                            
                                            // Cargar lista de evidencias desde el backend
                                            useEffect(() => {
                                              const cargarEvidencias = async () => {
                                                setCargandoEvidencias(true);
                                                try {
                                                  const evidencias = await controlInternoService.getEvidenciasByAccion(accion.id);
                                                  setEvidenciasLista(Array.isArray(evidencias) ? evidencias : []);
                                                } catch (error) {
                                                  console.error('Error cargando evidencias:', error);
                                                  setEvidenciasLista([]);
                                                } finally {
                                                  setCargandoEvidencias(false);
                                                }
                                              };
                                              cargarEvidencias();
                                            }, [accion.id]);

                                            const evidenciasCount = evidenciasLista.length;

                                            const formatFileSize = (bytes: number) => {
                                              if (!bytes || bytes === 0) return '0 Bytes';
                                              const k = 1024;
                                              const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                                              const i = Math.floor(Math.log(bytes) / Math.log(k));
                                              return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
                                            };

                                            const handleDescargarEvidencia = async (evidencia: EvidenciaAccion) => {
                                              try {
                                                toast.info('Descargando...', { description: evidencia.nombre });
                                                const blob = await controlInternoService.downloadEvidencia(evidencia.id);
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = evidencia.nombreArchivo || evidencia.nombre;
                                                document.body.appendChild(a);
                                                a.click();
                                                window.URL.revokeObjectURL(url);
                                                document.body.removeChild(a);
                                                toast.success('Descarga completada');
                                              } catch (error) {
                                                console.error('Error descargando:', error);
                                                toast.error('Error al descargar el archivo');
                                              }
                                            };
                                            
                                            const estadoConfig = {
                                              PENDIENTE: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pendiente', icon: Clock },
                                              EN_EJECUCION: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En Ejecución', icon: Activity },
                                              COMPLETADA: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completada', icon: CheckCircle2 },
                                              VENCIDA: { bg: 'bg-red-100', text: 'text-red-700', label: 'Vencida', icon: XCircle }
                                            };

                                            // Calcular estado efectivo igual que el backend (determinarEstadoAccionReal)
                                            // Esto garantiza que el badge sea coherente aunque el estado en BD esté desactualizado
                                            const estadoEfectivo = ((): 'PENDIENTE' | 'EN_EJECUCION' | 'COMPLETADA' | 'VENCIDA' => {
                                              const prog = accion.progreso ?? 0;
                                              if (prog >= 100) return 'COMPLETADA';
                                              if (accion.estado === 'VENCIDA') return 'VENCIDA';
                                              if (prog > 0) return 'EN_EJECUCION';
                                              return 'PENDIENTE';
                                            })();

                                            const config = estadoConfig[estadoEfectivo];
                                            const Icon = config.icon;
                                            const hallazgo = plan.hallazgos.find(h => h.id === accion.hallazgoId);

 const handleEditar = () => { setModalEditar(true); };
                                            const handleCargarEvidencia = () => { setModalEvidencia(true); };
                                            const handleMarcarCompletada = async () => {
                                              if (estadoEfectivo === 'COMPLETADA') return;
                                              await onActualizarAccion(accion.id, { estado: 'COMPLETADA', progreso: 100 });
                                            };











                                            return (
                                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                <div className="flex items-start gap-3">
                                                  <div className={`w-8 h-8 ${config.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                                    <Icon className={`w-4 h-4 ${config.text}`} />
                                                  </div>

                                                  <div className="flex-1">
                                                    <div className="flex items-start justify-between gap-3 mb-1">
                                                      <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${config.bg} ${config.text}`}>
                                                            {config.label}
                                                          </span>
                                                          {hallazgo ? (
                                                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-100">
                                                              <Target className="w-3 h-3" />
                                                              Vinculado a: {hallazgo.codigo}
                                                            </div>
                                                          ) : (
                                                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[11px] font-semibold border border-red-100">
                                                              <Target className="w-3 h-3" />
                                                              Sin hallazgo vinculado
                                                            </div>
                                                          )}
                                                        </div>
                                                        <p className="text-sm text-gray-900 mb-2 leading-tight">{accion.descripcion}</p>
                                                      </div>

                                                      <div className="text-right">
                                                        <div className={`text-xl font-bold ${
                                                          accion.progreso === 100 ? 'text-green-600' :
                                                          accion.progreso >= 50 ? 'text-yellow-600' :
                                                          'text-gray-600'
                                                        }`}>
                                                          {accion.progreso}%
                                                        </div>
                                                      </div>
                                                    </div>

                                                    {/* Progreso */}
                                                    <div className="mb-3">
                                                      <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                          className={`h-full transition-all ${
                                                            accion.progreso === 100 ? 'bg-green-600' :
                                                            accion.progreso >= 50 ? 'bg-yellow-600' :
                                                            'bg-blue-600'
                                                          }`}
                                                          style={{ width: `${accion.progreso}%` }}
                                                        />
                                                      </div>
                                                    </div>

                                              {/* Información */}
                                                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-600 mb-2">
                                                      <div>
                                                        <div className="flex items-center gap-1 mb-0.5">
                                                          <User className="w-3 h-3" />
                                                          <span>Responsable</span>
                                                        </div>
                                                        <div className="text-gray-900 font-medium">{accion.responsable}</div>
                                                      </div>
                                                      <div>
                                                        <div className="flex items-center gap-1 mb-0.5">
                                                          <Calendar className="w-3 h-3" />
                                                          <span>Fechas</span>
                                                        </div>
                                                        <div className="text-gray-900 font-medium">{accion.fechaInicio} — {accion.fechaVencimiento}</div>
                                                      </div>
                                                      <div>
                                                        <div className="flex items-center gap-1 mb-0.5">
                                                          <Paperclip className="w-3 h-3" />
                                                          <span>Evidencias</span>
                                                        </div>
                                                        <div className="text-gray-900 font-medium">
                                                          {cargandoEvidencias ? (
                                                            <Loader2 className="w-3 h-3 animate-spin inline" />
                                                          ) : (
                                                            `${evidenciasCount} archivos`
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>

                                                    {/* Lista de Evidencias - siempre visible */}
                                                    {evidenciasCount > 0 && (
                                                      <div className="mb-3 bg-gray-50 rounded-lg border border-gray-200 p-3">
                                                        <div className="text-xs font-medium text-gray-700 mb-2">Archivos adjuntos:</div>
                                                        <div className="space-y-2">
                                                          {evidenciasLista.map(evidencia => (
                                                            <div key={evidencia.id} className="flex items-center justify-between bg-white border border-gray-200 rounded p-2">
                                                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                                <div className="min-w-0">
                                                                  <div className="text-xs text-gray-900 truncate">{evidencia.nombre}</div>
                                                                  <div className="text-[10px] text-gray-500">
                                                                    {formatFileSize(evidencia.tamano)} • {new Date(evidencia.fechaSubida).toLocaleDateString()}
                                                                  </div>
                                                                </div>
                                                              </div>
                                                              <button
                                                                onClick={() => handleDescargarEvidencia(evidencia)}
                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                                                                title="Descargar"
                                                              >
                                                                <Download className="w-3.5 h-3.5" />
                                                              </button>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    )}

                                                    {/* Observaciones */}
                                                    {accion.observaciones && (
                                                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                                                        {accion.observaciones}
                                                      </div>
                                                    )}


                                                    
                                                    {/* Botones de accion: solo visibles en modo portal (auditado) */}
                                                    {modoPortal && (
                                                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
                                                        <button
                                                          onClick={handleEditar}
                                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                                                        >
                                                          <Edit2 className="w-3.5 h-3.5" />
                                                          Editar
                                                        </button>
                                                        <button
                                                          onClick={handleCargarEvidencia}
                                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 font-medium transition-colors"
                                                        >
                                                          <Upload className="w-3.5 h-3.5" />
                                                          Subir Evidencia
                                                        </button>
                                                        {estadoEfectivo !== 'COMPLETADA' && (
                                                          <button
                                                            onClick={handleMarcarCompletada}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-medium transition-colors"
                                                          >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            Marcar Completada
                                                          </button>
                                                        )}
                                                      </div>
                                                    )}

                                                    {/* Modal Editar Accion (portal) */}
                                                    {modalEditar && (
                                                      <ModalEditarAccion
                                                        accion={accion}
                                                        onClose={() => setModalEditar(false)}
                                                        onGuardar={async (data) => {
                                                          const ok = await onActualizarAccion(accion.id, data);
                                                          if (ok) { setModalEditar(false); onRefresh(); }
                                                        }}
                                                      />
                                                    )}

                                                    {/* Modal Cargar Evidencia (portal) */}
                                                    {modalEvidencia && (
                                                      <ModalCargarEvidencia
                                                        accion={accion}
                                                        planId={plan.id}
                                                        onClose={() => setModalEvidencia(false)}
                                                        onEvidenciasCargadas={async () => {
                                                          const evidencias = await controlInternoService.getEvidenciasByAccion(accion.id);
                                                          setEvidenciasLista(Array.isArray(evidencias) ? evidencias : []);
                                                          setModalEvidencia(false);
                                                        }}
                                                      />
                                                    )}













                                                  </div>
                                                </div>

                                                {/* TODO: Modal Editar Acci�n � habilitar cuando OCI pueda editar acciones
                                                {modalEditar && (
                                                  <ModalEditarAccion
                                                    accion={accion}
                                                    onClose={() => setModalEditar(false)}
                                                    onGuardar={onActualizarAccion}
                                                  />
                                                )}
                                                 */}

                                                {/* TODO: Modal Cargar Evidencia � habilitar cuando OCI gestione evidencias
                                                {modalEvidencia && (
                                                  <ModalCargarEvidencia
                                                    accion={accion}
                                                    planId={plan.id}
                                                    onClose={() => setModalEvidencia(false)}
                                                    onEvidenciasCargadas={async () => {
                                                      try {
                                                        const evidencias = await controlInternoService.getEvidenciasByAccion(accion.id);
                                                        setEvidenciasLista(Array.isArray(evidencias) ? evidencias : []);
                                                      } catch (e) {}
                                                      onRefresh();
                                                    }}
                                                  />
                                                )}
                                                 */}

                                              </div>
                                            );
                                          }

                                          function MiniCardAccion({ accion }: { accion: AccionCorrectiva }) {
                                            const estadoConfig = {
                                              PENDIENTE: { bg: 'bg-gray-100', text: 'text-gray-700' },
                                              EN_EJECUCION: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
                                              COMPLETADA: { bg: 'bg-green-100', text: 'text-green-700' },
                                              VENCIDA: { bg: 'bg-red-100', text: 'text-red-700' }
                                            };

                                            const config = estadoConfig[accion.estado];

                                            return (
                                              <div className="bg-white rounded border border-gray-200 p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                  <p className="text-xs text-gray-900 flex-1">{accion.descripcion}</p>
                                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ml-2 ${config.bg} ${config.text}`}>
                                                    {accion.progreso}%
                                                  </span>
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                  {accion.responsable} • Vence: {accion.fechaVencimiento}
                                                </div>
                                              </div>
                                            );
                                          }

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // TAB: DOCUMENTOS
                                          // ════════════════════════════════════════════════════════════════════════════

                                          interface EvidenciaItem {
                                            id: string;
                                            nombre: string;
                                            descripcion?: string;
                                            tipoDocumento: string;
                                            nombreArchivo: string;
                                            mimeType: string;
                                            tamano: number;
                                            fechaSubida: string;
                                            subidoPor?: string;
                                            accionCorrectivaId?: string;
                                            planMejoramientoId?: string;
                                          }

                                          interface TabDocumentosProps {
                                            plan: PlanMejoramientoDetalle;
                                            evidenciasPorAccion: Record<string, EvidenciaItem[]>;
                                            setEvidenciasPorAccion: React.Dispatch<React.SetStateAction<Record<string, EvidenciaItem[]>>>;
                                            cargandoEvidencias: boolean;
                                          }

                                          function TabDocumentos({ plan, evidenciasPorAccion, setEvidenciasPorAccion, cargandoEvidencias }: TabDocumentosProps) {
                                            const [modalCargarDocumento, setModalCargarDocumento] = useState(false);
                                            const [documentoVistaPrevia, setDocumentoVistaPrevia] = useState<DocumentoPlan | null>(null);

                                            // Estados para el modal de carga
                                            const [accionSeleccionadaId, setAccionSeleccionadaId] = useState<string>('');
                                            const [nombreDocumento, setNombreDocumento] = useState('');
                                            const [tipoDocumento, setTipoDocumento] = useState('');
                                            const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
                                            const [subiendo, setSubiendo] = useState(false);

                                            // Total de evidencias (viene del padre; el badge del tab usa el mismo valor)
                                            const totalEvidencias = Object.values(evidenciasPorAccion).flat().length;

                                            const handleCargarDocumento = () => {
                                              console.log('🟢 handleCargarDocumento llamado - abriendo modal');
                                              setModalCargarDocumento(true);
                                              setAccionSeleccionadaId('');
                                              setNombreDocumento('');
                                              setTipoDocumento('');
                                              setArchivoSeleccionado(null);
                                            };

                                            const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                                              if (e.target.files && e.target.files[0]) {
                                                setArchivoSeleccionado(e.target.files[0]);
                                              }
                                            };

                                            const handleSubirDocumento = async () => {
                                              if (!accionSeleccionadaId) {
                                                toast.error('Selecciona una acción');
                                                return;
                                              }
                                              if (!archivoSeleccionado) {
                                                toast.error('Selecciona un archivo');
                                                return;
                                              }

                                              setSubiendo(true);
                                              try {
                                                await controlInternoService.createEvidencia(
                                                  archivoSeleccionado,
                                                  {
                                                    nombre: nombreDocumento || archivoSeleccionado.name,
                                                    descripcion: `Documento tipo ${tipoDocumento}`,
                                                    tipoDocumento: (tipoDocumento || 'evidencia_accion') as 'evidencia_accion' | 'evidencia_hallazgo' | 'evidencia_plan' | 'documento_plan' | 'certificado' | 'acta' | 'informe' | 'otro',
                                                    accionCorrectivaId: accionSeleccionadaId,
                                                  },
                                                  (progress) => {
                                                    console.log('Progreso:', progress);
                                                  }
                                                );

                                                toast.success('Documento cargado correctamente');
                                                setModalCargarDocumento(false);

                                                // Recargar evidencias de la acción
                                                const evidencias = await controlInternoService.getEvidenciasByAccion(accionSeleccionadaId);
                                                setEvidenciasPorAccion(prev => ({
                                                  ...prev,
                                                  [accionSeleccionadaId]: Array.isArray(evidencias) ? evidencias : []
                                                }));
                                              } catch (error) {
                                                console.error('Error subiendo documento:', error);
                                                toast.error('Error al cargar el documento');
                                              } finally {
                                                setSubiendo(false);
                                              }
                                            };

                                            const handleDescargarEvidencia = async (evidencia: EvidenciaItem) => {
                                              try {
                                                toast.info('Descargando...', { description: evidencia.nombre });
                                                const blob = await controlInternoService.downloadEvidencia(evidencia.id);
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = evidencia.nombreArchivo || evidencia.nombre;
                                                document.body.appendChild(a);
                                                a.click();
                                                window.URL.revokeObjectURL(url);
                                                document.body.removeChild(a);
                                                toast.success('Descarga completada');
                                              } catch (error) {
                                                console.error('Error descargando:', error);
                                                toast.error('Error al descargar el archivo');
                                              }
                                            };

                                            const formatFileSize = (bytes: number) => {
                                              if (!bytes || bytes === 0) return '0 Bytes';
                                              const k = 1024;
                                              const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                                              const i = Math.floor(Math.log(bytes) / Math.log(k));
                                              return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
                                            };

                                            return (
                                              <div className="space-y-4">
                                                <div className="flex items-center justify-between mb-4">
                                                  <div>
                                                    <h3 className="text-base font-medium text-gray-900">Documentos y Evidencias</h3>
                                                    <p className="text-sm text-gray-600">
                                                      {cargandoEvidencias ? 'Cargando...' : `${totalEvidencias} archivo(s) asociados a acciones`}
                                                    </p>
                                                  </div>

                                                  <button 
                                                    onClick={handleCargarDocumento}
                                                    className="px-4 py-2 bg-[#1e5da8] hover:bg-[#174a8a] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                                                  >
                                                    <Upload className="w-4 h-4" />
                                                    Cargar Documento
                                                  </button>
                                                </div>

                                                {/* Lista de evidencias por acción */}
                                                {cargandoEvidencias ? (
                                                  <div className="text-center py-8 text-gray-500">
                                                    <Loader2 className="w-12 h-12 mx-auto mb-3 text-gray-300 animate-spin" />
                                                    <p className="font-medium">Cargando evidencias...</p>
                                                  </div>
                                                ) : totalEvidencias === 0 ? (
                                                  <div className="text-center py-8 text-gray-500">
                                                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                                    <p className="font-medium">Sin documentos cargados</p>
                                                    <p className="text-sm">Haz clic en "Cargar Documento" para asociar evidencias a las acciones</p>
                                                  </div>
                                                ) : (
                                                  <div className="space-y-4">
                                                    {plan.acciones.map(accion => {
                                                      const evidencias = evidenciasPorAccion[accion.id] || [];
                                                      if (evidencias.length === 0) return null;
                                                      
                                                      return (
                                                        <div key={accion.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                                          <div className="flex items-center gap-2 mb-3">
                                                            <Target className="w-4 h-4 text-blue-600" />
                                                            <span className="text-sm font-medium text-gray-900">
                                                              Acción: {accion.descripcion.substring(0, 60)}{accion.descripcion.length > 60 ? '...' : ''}
                                                            </span>
                                                            <span className="ml-auto bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                                                              {evidencias.length} archivo(s)
                                                            </span>
                                                          </div>
                                                          
                                                          <div className="space-y-2">
                                                            {evidencias.map(evidencia => (
                                                              <div key={evidencia.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                                                                <div className="flex items-center gap-3">
                                                                  <Paperclip className="w-4 h-4 text-gray-500" />
                                                                  <div>
                                                                    <div className="text-sm text-gray-900">{evidencia.nombre}</div>
                                                                    <div className="text-xs text-gray-500">
                                                                      {formatFileSize(evidencia.tamano)} • {new Date(evidencia.fechaSubida).toLocaleDateString()}
                                                                    </div>
                                                                  </div>
                                                                </div>
                                                                <button
                                                                  onClick={() => handleDescargarEvidencia(evidencia)}
                                                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                  title="Descargar"
                                                                >
                                                                  <Download className="w-4 h-4" />
                                                                </button>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                )}

                                                {/* Modal Cargar Documento */}
                                                <AnimatePresence>
                                                  {modalCargarDocumento && (
                                                    <motion.div
                                                      initial={{ opacity: 0 }}
                                                      animate={{ opacity: 1 }}
                                                      exit={{ opacity: 0 }}
                                                      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
                                                      onClick={() => setModalCargarDocumento(false)}
                                                    >
                                                      <motion.div
                                                        initial={{ scale: 0.9, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.9, opacity: 0 }}
                                                        className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6"
                                                        onClick={(e) => e.stopPropagation()}
                                                      >
                                                        <div className="flex items-center justify-between mb-4">
                                                          <h3 className="text-lg font-semibold text-gray-900">Cargar Documento</h3>
                                                          <button
                                                            onClick={() => setModalCargarDocumento(false)}
                                                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                                          >
                                                            <X className="w-5 h-5 text-gray-500" />
                                                          </button>
                                                        </div>

                                                        <div className="space-y-4">
                                                          {/* Selector de Acción */}
                                                          <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                              Asociar a Acción <span className="text-red-500">*</span>
                                                            </label>
                                                            <select 
                                                              value={accionSeleccionadaId}
                                                              onChange={(e) => setAccionSeleccionadaId(e.target.value)}
                                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            >
                                                              <option value="">Seleccione una acción...</option>
                                                              {plan.acciones.map(accion => (
                                                                <option key={accion.id} value={accion.id}>
                                                                  {accion.descripcion.substring(0, 50)}{accion.descripcion.length > 50 ? '...' : ''}
                                                                </option>
                                                              ))}
                                                            </select>
                                                            {!accionSeleccionadaId && (
                                                              <p className="text-xs text-amber-600 mt-1">Debes seleccionar la acción a la que se asociará este documento</p>
                                                            )}
                                                          </div>

                                                          <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                              Nombre del documento
                                                            </label>
                                                            <input
                                                              type="text"
                                                              value={nombreDocumento}
                                                              onChange={(e) => setNombreDocumento(e.target.value)}
                                                              placeholder="Ej: Evidencia acción correctiva..."
                                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            />
                                                          </div>

                                                          <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                              Tipo de documento
                                                            </label>
                                                            <select 
                                                              value={tipoDocumento}
                                                              onChange={(e) => setTipoDocumento(e.target.value)}
                                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            >
                                                              <option value="">Seleccione tipo...</option>
                                                              <option value="evidencia_accion">Evidencia de Acción</option>
                                                              <option value="documento_plan">Documento de Plan</option>
                                                              <option value="certificado">Certificado</option>
                                                              <option value="acta">Acta</option>
                                                              <option value="informe">Informe</option>
                                                              <option value="otro">Otro</option>
                                                            </select>
                                                          </div>

                                                          <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                              Archivo <span className="text-red-500">*</span>
                                                            </label>
                                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                                                              {archivoSeleccionado ? (
                                                                <div className="flex items-center justify-center gap-2">
                                                                  <Paperclip className="w-5 h-5 text-blue-600" />
                                                                  <span className="text-sm text-gray-700">{archivoSeleccionado.name}</span>
                                                                  <button
                                                                    onClick={() => setArchivoSeleccionado(null)}
                                                                    className="ml-2 p-1 hover:bg-red-100 rounded text-red-600"
                                                                  >
                                                                    <X className="w-4 h-4" />
                                                                  </button>
                                                                </div>
                                                              ) : (
                                                                <label htmlFor="file-upload-doc" className="cursor-pointer">
                                                                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                                                  <p className="text-sm text-gray-600">
                                                                    Arrastra un archivo o haz clic para seleccionar
                                                                  </p>
                                                                  <p className="text-xs text-gray-400 mt-1">
                                                                    PDF, Word, Excel hasta 10MB
                                                                  </p>
                                                                </label>
                                                              )}
                                                              <input 
                                                                id="file-upload-doc"
                                                                type="file" 
                                                                className="hidden" 
                                                                onChange={handleFileChange}
                                                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                                              />
                                                            </div>
                                                          </div>

                                                          <div className="flex gap-3 pt-2">
                                                            <button
                                                              onClick={() => setModalCargarDocumento(false)}
                                                              disabled={subiendo}
                                                              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                                            >
                                                              Cancelar
                                                            </button>
                                                            <button
                                                              onClick={handleSubirDocumento}
                                                              disabled={subiendo || !accionSeleccionadaId || !archivoSeleccionado}
                                                              className="flex-1 px-4 py-2 bg-[#1e5da8] hover:bg-[#174a8a] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                            >
                                                              {subiendo ? (
                                                                <>
                                                                  <Loader2 className="w-4 h-4 animate-spin" />
                                                                  Subiendo...
                                                                </>
                                                              ) : (
                                                                'Cargar'
                                                              )}
                                                            </button>
                                                          </div>
                                                        </div>
                                                      </motion.div>
                                                    </motion.div>
                                                  )}
                                                </AnimatePresence>
                                              </div>
                                            );
                                          }

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // SEGUIMIENTOS PERIÓDICOS PANEL (RF-SG-09 / RF-SG-10)
                                          // ════════════════════════════════════════════════════════════════════════════

                                          function SeguimientosPeriodicosPanel({ planId }: { planId: string }) {
                                            const [seguimientos, setSeguimientos] = useState<any[]>([]);
                                            const [cargando, setCargando] = useState(true);
                                            const [mostrarFormulario, setMostrarFormulario] = useState(false);
                                            const [registrando, setRegistrando] = useState(false);
                                            const [form, setForm] = useState({
                                              periodicidad: 'TRIMESTRAL' as 'TRIMESTRAL' | 'SEMESTRAL',
                                              tipoControl: 'INTERNO' as 'INTERNO' | 'ENTE_EXTERNO',
                                              fechaCorte: new Date().toISOString().split('T')[0],
                                              resumen: '',
                                            });

                                            const cargar = useCallback(async () => {
                                              setCargando(true);
                                              try {
                                                const data = await controlInternoService.getSeguimientosPlan(planId);
                                                setSeguimientos(Array.isArray(data) ? data : []);
                                              } catch { setSeguimientos([]); }
                                              finally { setCargando(false); }
                                            }, [planId]);

                                            useEffect(() => { cargar(); }, [cargar]);

                                            const registrar = async () => {
                                              setRegistrando(true);
                                              try {
                                                await controlInternoService.registrarSeguimientoPeriodico(planId, {
                                                  periodicidad: form.periodicidad,
                                                  tipoControl: form.tipoControl,
                                                  fechaCorte: form.fechaCorte,
                                                  responsableId: 'auditor',
                                                  responsableNombre: 'Equipo Auditor OCI',
                                                  resumen: form.resumen,
                                                });
                                                toast.success('Seguimiento periódico registrado');
                                                setMostrarFormulario(false);
                                                setForm({ periodicidad: 'TRIMESTRAL', tipoControl: 'INTERNO', fechaCorte: new Date().toISOString().split('T')[0], resumen: '' });
                                                await cargar();
                                              } catch (e: any) {
                                                toast.error(e?.message || 'Error al registrar seguimiento');
                                              } finally { setRegistrando(false); }
                                            };

                                            return (
                                              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200 flex items-center justify-between">
                                                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-indigo-500" />
                                                    Seguimientos Periódicos
                                                    {seguimientos.length > 0 && (
                                                      <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                                                        {seguimientos.length}
                                                      </span>
                                                    )}
                                                  </h4>
                                                  <button
                                                    onClick={() => setMostrarFormulario(!mostrarFormulario)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
                                                  >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Registrar seguimiento
                                                  </button>
                                                </div>

                                                {/* Formulario de registro */}
                                                {mostrarFormulario && (
                                                  <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                                      <div>
                                                        <label className="text-xs font-medium text-gray-700 mb-1 block">Periodicidad</label>
                                                        <select
                                                          value={form.periodicidad}
                                                          onChange={(e) => setForm({ ...form, periodicidad: e.target.value as any })}
                                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                        >
                                                          <option value="TRIMESTRAL">Trimestral (Interno)</option>
                                                          <option value="SEMESTRAL">Semestral (Ente externo)</option>
                                                        </select>
                                                      </div>
                                                      <div>
                                                        <label className="text-xs font-medium text-gray-700 mb-1 block">Tipo de control</label>
                                                        <select
                                                          value={form.tipoControl}
                                                          onChange={(e) => setForm({ ...form, tipoControl: e.target.value as any })}
                                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                        >
                                                          <option value="INTERNO">Interno</option>
                                                          <option value="ENTE_EXTERNO">Ente externo</option>
                                                        </select>
                                                      </div>
                                                      <div>
                                                        <label className="text-xs font-medium text-gray-700 mb-1 block">Fecha de corte</label>
                                                        <input
                                                          type="date"
                                                          value={form.fechaCorte}
                                                          onChange={(e) => setForm({ ...form, fechaCorte: e.target.value })}
                                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                        />
                                                      </div>
                                                    </div>
                                                    <div className="mb-3">
                                                      <label className="text-xs font-medium text-gray-700 mb-1 block">Resumen ejecutivo</label>
                                                      <textarea
                                                        value={form.resumen}
                                                        onChange={(e) => setForm({ ...form, resumen: e.target.value })}
                                                        rows={2}
                                                        placeholder="Resumen del seguimiento periódico..."
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                                      />
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                      <button
                                                        onClick={() => setMostrarFormulario(false)}
                                                        className="px-3 py-1.5 text-gray-600 bg-gray-100 hover:bg-gray-200 text-sm rounded-lg transition-colors"
                                                      >
                                                        Cancelar
                                                      </button>
                                                      <button
                                                        onClick={registrar}
                                                        disabled={registrando}
                                                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                                                      >
                                                        {registrando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Lista de seguimientos */}
                                                {cargando ? (
                                                  <div className="flex justify-center py-6">
                                                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                                                  </div>
                                                ) : seguimientos.length === 0 ? (
                                                  <div className="text-center py-8 text-gray-500">
                                                    <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                                    <p className="text-sm">Sin seguimientos registrados</p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                      El sistema genera seguimientos automáticos cada trimestre (internos) o semestre (externos)
                                                    </p>
                                                  </div>
                                                ) : (
                                                  <div className="p-4 space-y-3">
                                                    {seguimientos.map((seg: any) => (
                                                      <div key={seg.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                                                        <div className="flex items-center justify-between mb-2">
                                                          <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                              seg.periodicidad === 'TRIMESTRAL' 
                                                                ? 'bg-blue-100 text-blue-700' 
                                                                : 'bg-purple-100 text-purple-700'
                                                            }`}>
                                                              {seg.periodicidad}
                                                            </span>
                                                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                                              {seg.tipoControl === 'INTERNO' ? 'Interno' : 'Ente externo'}
                                                            </span>
                                                            {seg.automatico && (
                                                              <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                                                                ⚡ Automático
                                                              </span>
                                                            )}
                                                          </div>
                                                          <span className="text-xs text-gray-500">
                                                            Corte: {seg.fechaCorte ? new Date(seg.fechaCorte).toLocaleDateString('es-CO') : '—'}
                                                          </span>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-3 mb-2">
                                                          <div className="text-center p-2 bg-gray-50 rounded">
                                                            <div className="text-lg font-bold text-gray-900">{seg.totalAccionesEvaluadas ?? 0}</div>
                                                            <div className="text-xs text-gray-500">Evaluadas</div>
                                                          </div>
                                                          <div className="text-center p-2 bg-green-50 rounded">
                                                            <div className="text-lg font-bold text-green-700">{seg.accionesCumplen ?? 0}</div>
                                                            <div className="text-xs text-green-600">Cumplen</div>
                                                          </div>
                                                          <div className="text-center p-2 bg-amber-50 rounded">
                                                            <div className="text-lg font-bold text-amber-700">{seg.accionesParcial ?? 0}</div>
                                                            <div className="text-xs text-amber-600">Parcial</div>
                                                          </div>
                                                          <div className="text-center p-2 bg-red-50 rounded">
                                                            <div className="text-lg font-bold text-red-700">{seg.accionesNoCumplen ?? 0}</div>
                                                            <div className="text-xs text-red-600">No cumplen</div>
                                                          </div>
                                                        </div>
                                                        {seg.resumen && (
                                                          <p className="text-sm text-gray-700 mt-2 italic border-l-2 border-indigo-300 pl-3">
                                                            {seg.resumen}
                                                          </p>
                                                        )}
                                                        <div className="text-xs text-gray-400 mt-2">
                                                          Responsable: {seg.responsableNombre || seg.responsableId || '—'} · 
                                                          Registrado: {seg.createdAt ? new Date(seg.createdAt).toLocaleDateString('es-CO') : '—'}
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          }

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // TAB: SEGUIMIENTO
                                          // ════════════════════════════════════════════════════════════════════════════

                                          function TabSeguimiento({ plan }: { plan: PlanMejoramientoDetalle }) {
                                            // ── Estado local ──
                                            const [evidenciasPorAccion, setEvidenciasPorAccion] = useState<Record<string, any[]>>({});
                                            const [cargandoEvidencias, setCargandoEvidencias] = useState(false);
                                            const [accionExpandida, setAccionExpandida] = useState<string | null>(null);
                                            const [procesando, setProcesando] = useState<string | null>(null);
                                            const [alertas, setAlertas] = useState<any[]>([]);
                                            const [cargandoAlertas, setCargandoAlertas] = useState(false);

                                            // ── Cargar evidencias de todas las acciones ──
                                            const cargarTodasEvidencias = useCallback(async () => {
                                              if (!plan.acciones?.length) return;
                                              setCargandoEvidencias(true);
                                              try {
                                                const resultados: Record<string, any[]> = {};
                                                await Promise.allSettled(
                                                  plan.acciones.map(async (a) => {
                                                    try {
                                                      const evs = await controlInternoService.getEvidenciasSeguimiento(a.id);
                                                      resultados[a.id] = Array.isArray(evs) ? evs : [];
                                                    } catch { resultados[a.id] = []; }
                                                  }),
                                                );
                                                setEvidenciasPorAccion(resultados);
                                              } finally { setCargandoEvidencias(false); }
                                            }, [plan.acciones]);

                                            useEffect(() => { cargarTodasEvidencias(); }, [cargarTodasEvidencias]);

                                            // ── Cargar alertas ──
                                            const cargarAlertas = useCallback(async () => {
                                              setCargandoAlertas(true);
                                              try {
                                                const data = await controlInternoService.getAlertasPlan(plan.id);
                                                setAlertas(Array.isArray(data) ? data : []);
                                              } catch { setAlertas([]); }
                                              finally { setCargandoAlertas(false); }
                                            }, [plan.id]);

                                            useEffect(() => { cargarAlertas(); }, [cargarAlertas]);

                                            // ── Calificar evidencia ──
                                            const calificarEvidencia = async (
                                              evidenciaId: string,
                                              calificacion: 'aceptado' | 'con_observaciones',
                                              comentarios?: string,
                                            ) => {
                                              setProcesando(evidenciaId);
                                              try {
                                                await controlInternoService.calificarEvidenciaSeguimiento(evidenciaId, {
                                                  calificacion,
                                                  comentarios,
                                                  calificadaPorId: 'auditor',
                                                  calificadaPorNombre: 'Auditor OCI',
                                                });
                                                toast.success(calificacion === 'aceptado' ? 'Evidencia aceptada' : 'Observaciones registradas');
                                                await cargarTodasEvidencias();
                                              } catch (e: any) {
                                                toast.error(e?.message || 'Error al calificar');
                                              } finally { setProcesando(null); }
                                            };

                                            // ── Registrar seguimiento EMFO ──
                                            const registrarSeguimiento = async (accionId: string, cantidadImplementada: number) => {
                                              setProcesando(accionId);
                                              try {
                                                await controlInternoService.registrarSeguimientoEmfo(accionId, { cantidadImplementada });
                                                toast.success('Cumplimiento registrado');
                                              } catch (e: any) {
                                                toast.error(e?.message || 'Error al registrar seguimiento');
                                              } finally { setProcesando(null); }
                                            };

                                            // ── Registrar efectividad ──
                                            const registrarEfectividad = async (
                                              accionId: string,
                                              evaluarControles: boolean,
                                              noRepitio: boolean,
                                            ) => {
                                              setProcesando(accionId);
                                              try {
                                                await controlInternoService.registrarEfectividad(accionId, {
                                                  evaluarAplicacionControles: evaluarControles,
                                                  validarSituacionNoRepitio: noRepitio,
                                                });
                                                toast.success('Efectividad registrada');
                                              } catch (e: any) {
                                                toast.error(e?.message || 'Error al registrar efectividad');
                                              } finally { setProcesando(null); }
                                            };

                                            // ── Generar alertas ──
                                            const generarAlertas = async () => {
                                              setCargandoAlertas(true);
                                              try {
                                                const nuevas = await controlInternoService.generarAlertasPlan(plan.id);
                                                toast.success(`${nuevas.length} alerta(s) generada(s)`);
                                                await cargarAlertas();
                                              } catch (e: any) {
                                                toast.error(e?.message || 'Error al generar alertas');
                                              } finally { setCargandoAlertas(false); }
                                            };

                                            // ── Helpers visuales ──
                                            const cumplimientoLabel = (v?: number) => {
                                              if (v === 2) return { label: 'Cumple', color: 'text-green-700', bg: 'bg-green-100' };
                                              if (v === 1) return { label: 'Parcial', color: 'text-yellow-700', bg: 'bg-yellow-100' };
                                              return { label: 'No cumple', color: 'text-red-700', bg: 'bg-red-100' };
                                            };
                                            const efectividadLabel = (v?: number) => {
                                              if (v === 2) return { label: 'Efectiva', color: 'text-green-700', bg: 'bg-green-100' };
                                              if (v === 1) return { label: 'Parcial', color: 'text-yellow-700', bg: 'bg-yellow-100' };
                                              return { label: 'Inefectiva', color: 'text-red-700', bg: 'bg-red-100' };
                                            };
                                            const estadoEvidenciaConfig: Record<string, { label: string; color: string; bg: string }> = {
                                              pendiente: { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-50' },
                                              aceptado: { label: 'Aceptado', color: 'text-green-700', bg: 'bg-green-50' },
                                              con_observaciones: { label: 'Con observaciones', color: 'text-red-700', bg: 'bg-red-50' },
                                            };

                                            return (
                                              <div className="space-y-6">


                                                {/* ═══ ALERTAS ═══ */}
                                                {alertas.length > 0 && (
                                                  <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                                                    <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                                                      <h4 className="font-medium text-amber-900 flex items-center gap-2">
                                                        <AlertTriangle className="w-4 h-4" /> Alertas activas ({alertas.length})
                                                      </h4>
                                                      <button
                                                        onClick={generarAlertas}
                                                        disabled={cargandoAlertas}
                                                        className="text-xs px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg transition-colors disabled:opacity-50"
                                                      >
                                                        {cargandoAlertas ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Recalcular'}
                                                      </button>
                                                    </div>
                                                    <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                                                      {alertas.map((a) => (
                                                        <div key={a.id} className="flex items-start gap-2 text-sm p-2 bg-amber-50/50 rounded-lg">
                                                          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                                          <div>
                                                            <span className="font-medium text-amber-800">
                                                              {a.tipo?.replace(/_/g, ' ')}
                                                            </span>
                                                            <p className="text-amber-700 text-xs mt-0.5">{a.descripcion}</p>
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}

                                                {/* ═══ ACCIONES CON SEGUIMIENTO ═══ */}
                                                <div className="space-y-3">
                                                  <div className="flex items-center justify-between">
                                                    <h4 className="font-medium text-gray-900">Acciones de mejora — Seguimiento</h4>
                                                    <button
                                                      onClick={generarAlertas}
                                                      disabled={cargandoAlertas}
                                                      className="text-xs px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors"
                                                    >
                                                      <RefreshCw className={`w-3 h-3 inline mr-1 ${cargandoAlertas ? 'animate-spin' : ''}`} />
                                                      Generar alertas
                                                    </button>
                                                  </div>

                                                  {(plan.acciones ?? []).map((accion) => {
                                                    const evs = evidenciasPorAccion[accion.id] ?? [];
                                                    const isExpanded = accionExpandida === accion.id;
                                                    const cumpl = cumplimientoLabel((accion as any).cumplimientoEmfo);
                                                    const efect = (accion as any).efectividadVerificada
                                                      ? efectividadLabel((accion as any).efectividadEmfo)
                                                      : null;

                                                    return (
                                                      <div key={accion.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                        {/* Header de la acción */}
                                                        <button
                                                          onClick={() => setAccionExpandida(isExpanded ? null : accion.id)}
                                                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                                                        >
                                                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                          <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-gray-900 truncate">{accion.descripcion}</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">
                                                              {accion.responsable || 'Sin responsable'} · Vence: {accion.fechaVencimiento || '—'}
                                                            </div>
                                                          </div>
                                                          <div className="flex items-center gap-2 shrink-0">
                                                            {/* Badge cumplimiento */}
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cumpl.bg} ${cumpl.color}`}>
                                                              {cumpl.label}
                                                            </span>
                                                            {/* Badge efectividad */}
                                                            {efect && (
                                                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${efect.bg} ${efect.color}`}>
                                                                {efect.label}
                                                              </span>
                                                            )}
                                                            {/* Conteo evidencias */}
                                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                              {evs.length} evid.
                                                            </span>
                                                          </div>
                                                        </button>

                                                        {/* Panel expandido */}
                                                        {isExpanded && (
                                                          <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                                                            {/* ── Evidencias ── */}
                                                            <div>
                                                              <h5 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-1.5">
                                                                <FileText className="w-4 h-4 text-gray-400" />
                                                                Evidencias ({evs.length})
                                                              </h5>
                                                              {cargandoEvidencias ? (
                                                                <div className="flex items-center justify-center py-4">
                                                                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                                                </div>
                                                              ) : evs.length === 0 ? (
                                                                <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                                                  <Upload className="w-6 h-6 mx-auto text-gray-300 mb-1" />
                                                                  <p className="text-xs text-gray-500">Sin evidencias cargadas</p>
                                                                </div>
                                                              ) : (
                                                                <div className="space-y-2">
                                                                  {evs.map((ev) => {
                                                                    const est = estadoEvidenciaConfig[ev.estadoValidacion] ?? estadoEvidenciaConfig.pendiente;
                                                                    return (
                                                                      <div key={ev.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                                        <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                                                                        <div className="flex-1 min-w-0">
                                                                          <div className="text-sm font-medium text-gray-800 truncate">{ev.archivoNombre}</div>
                                                                          <div className="text-xs text-gray-500">
                                                                            {ev.cargadaPorNombre || 'Auditado'} · {ev.cargadaAt ? new Date(ev.cargadaAt).toLocaleDateString('es-CO') : ''}
                                                                          </div>
                                                                          {ev.comentarios && (
                                                                            <p className="text-xs text-gray-600 mt-1 italic">"{ev.comentarios}"</p>
                                                                          )}
                                                                        </div>
                                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${est.bg} ${est.color}`}>
                                                                          {est.label}
                                                                        </span>
                                                                        {/* Botones de calificación (solo si pendiente) */}
                                                                        {ev.estadoValidacion === 'pendiente' && (
                                                                          <div className="flex gap-1 shrink-0">
                                                                            <button
                                                                              onClick={() => calificarEvidencia(ev.id, 'aceptado')}
                                                                              disabled={procesando === ev.id}
                                                                              className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors disabled:opacity-50"
                                                                              title="Aceptar"
                                                                            >
                                                                              {procesando === ev.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                                            </button>
                                                                            <button
                                                                              onClick={() => {
                                                                                const obs = prompt('Observaciones:');
                                                                                if (obs !== null) calificarEvidencia(ev.id, 'con_observaciones', obs);
                                                                              }}
                                                                              disabled={procesando === ev.id}
                                                                              className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-md transition-colors disabled:opacity-50"
                                                                              title="Con observaciones"
                                                                            >
                                                                              <MessageSquare className="w-3.5 h-3.5" />
                                                                            </button>
                                                                          </div>
                                                                        )}
                                                                      </div>
                                                                    );
                                                                  })}
                                                                </div>
                                                              )}
                                                            </div>

                                                            {/* ── Seguimiento Cumplimiento ── */}
                                                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                                              <h5 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-1.5">
                                                                <BarChart3 className="w-4 h-4" />
                                                                Cumplimiento (EM-FO-002)
                                                              </h5>
                                                              <div className="grid grid-cols-3 gap-3 text-center">
                                                                <div>
                                                                  <div className="text-xs text-blue-700 mb-1">Programadas</div>
                                                                  <div className="text-lg font-bold text-blue-900">
                                                                    {(accion as any).cantidadProgramada ?? (accion as any).cantidadAccionesProgramadas ?? '—'}
                                                                  </div>
                                                                </div>
                                                                <div>
                                                                  <div className="text-xs text-blue-700 mb-1">Implementadas</div>
                                                                  <div className="text-lg font-bold text-blue-900">
                                                                    {(accion as any).cantidadAccionesImplementadas ?? '—'}
                                                                  </div>
                                                                </div>
                                                                <div>
                                                                  <div className="text-xs text-blue-700 mb-1">Resultado</div>
                                                                  <div className={`text-lg font-bold ${cumpl.color}`}>
                                                                    {(accion as any).cumplimientoEmfo ?? '—'}/2
                                                                  </div>
                                                                </div>
                                                              </div>
                                                              {/* Botón rápido de seguimiento */}
                                                              <div className="mt-3 flex items-center gap-2">
                                                                <input
                                                                  type="number"
                                                                  min={0}
                                                                  placeholder="Cant. implementada"
                                                                  className="flex-1 text-sm px-3 py-1.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                                                                  id={`seg-${accion.id}`}
                                                                />
                                                                <button
                                                                  onClick={() => {
                                                                    const input = document.getElementById(`seg-${accion.id}`) as HTMLInputElement;
                                                                    const val = parseInt(input?.value || '0', 10);
                                                                    if (val >= 0) registrarSeguimiento(accion.id, val);
                                                                  }}
                                                                  disabled={procesando === accion.id}
                                                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                                                                >
                                                                  {procesando === accion.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                                                  Registrar
                                                                </button>
                                                              </div>
                                                            </div>

                                                            {/* ── Efectividad ── */}
                                                            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                                                              <h5 className="text-sm font-medium text-purple-900 mb-3 flex items-center gap-1.5">
                                                                <Target className="w-4 h-4" />
                                                                Efectividad (EM-FO-002)
                                                              </h5>
                                                              {(accion as any).efectividadVerificada ? (
                                                                <div className="grid grid-cols-3 gap-3 text-center">
                                                                  <div>
                                                                    <div className="text-xs text-purple-700 mb-1">Controles aplicados</div>
                                                                    <div className={`text-base font-bold ${(accion as any).evaluarAplicacionControles ? 'text-green-600' : 'text-red-600'}`}>
                                                                      {(accion as any).evaluarAplicacionControles ? 'SÍ' : 'NO'}
                                                                    </div>
                                                                  </div>
                                                                  <div>
                                                                    <div className="text-xs text-purple-700 mb-1">No se repitió</div>
                                                                    <div className={`text-base font-bold ${(accion as any).validarSituacionNoRepitio ? 'text-green-600' : 'text-red-600'}`}>
                                                                      {(accion as any).validarSituacionNoRepitio ? 'SÍ' : 'NO'}
                                                                    </div>
                                                                  </div>
                                                                  <div>
                                                                    <div className="text-xs text-purple-700 mb-1">Resultado</div>
                                                                    <div className={`text-lg font-bold ${efect?.color ?? 'text-gray-500'}`}>
                                                                      {(accion as any).efectividadEmfo ?? '—'}/2
                                                                    </div>
                                                                  </div>
                                                                </div>
                                                              ) : (
                                                                <div className="space-y-3">
                                                                  <p className="text-xs text-purple-700">
                                                                    Se verifica en la siguiente auditoría (EM-PT-002 act. 9). Registre cuando corresponda:
                                                                  </p>
                                                                  <div className="flex items-center gap-4">
                                                                    <label className="flex items-center gap-2 text-sm">
                                                                      <input type="checkbox" id={`ctl-${accion.id}`} className="rounded border-purple-300 text-purple-600 focus:ring-purple-500" />
                                                                      Controles aplicados
                                                                    </label>
                                                                    <label className="flex items-center gap-2 text-sm">
                                                                      <input type="checkbox" id={`rep-${accion.id}`} className="rounded border-purple-300 text-purple-600 focus:ring-purple-500" />
                                                                      No se repitió
                                                                    </label>
                                                                    <button
                                                                      onClick={() => {
                                                                        const ctl = (document.getElementById(`ctl-${accion.id}`) as HTMLInputElement)?.checked;
                                                                        const rep = (document.getElementById(`rep-${accion.id}`) as HTMLInputElement)?.checked;
                                                                        registrarEfectividad(accion.id, ctl, rep);
                                                                      }}
                                                                      disabled={procesando === accion.id}
                                                                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                                                                    >
                                                                      {procesando === accion.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Registrar'}
                                                                    </button>
                                                                  </div>
                                                                </div>
                                                              )}
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>

                                                {/* ═══ SEGUIMIENTOS PERIÓDICOS (RF-SG-09 / RF-SG-10) ═══ */}
                                                <SeguimientosPeriodicosPanel planId={plan.id} />

                                                {/* ═══ HISTORIAL DE SEGUIMIENTO (TIMELINE) ═══ */}
                                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                                      <Activity className="w-4 h-4 text-gray-500" />
                                                      Historial de seguimiento
                                                      {plan.timeline?.length ? ` — ${plan.timeline.length} evento${plan.timeline.length > 1 ? 's' : ''}` : ''}
                                                    </h4>
                                                  </div>
                                                  {(!plan.timeline || plan.timeline.length === 0) ? (
                                                    <div className="text-center py-8 text-gray-500">
                                                      <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                                      <p className="text-sm">Sin eventos registrados</p>
                                                    </div>
                                                  ) : (
                                                    <div className="p-4 space-y-0">
                                                      {plan.timeline.map((evento, index) => (
                                                        <TimelineEventoItem
                                                          key={evento.id}
                                                          evento={evento}
                                                          isLast={index === plan.timeline.length - 1}
                                                        />
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          }


                                          // ════════════════════════════════════════════════════════════════════════════
                                          // TAB: CIERRE (ESTADO FINAL DEL EXPEDIENTE)
                                          // ════════════════════════════════════════════════════════════════════════════

                                          function TabCierre({ plan }: { plan: PlanMejoramientoDetalle }) {
                                            // ── Estado ──
                                            const [cierre, setCierre] = useState<any>(null);
                                            const [cargando, setCargando] = useState(true);
                                            const [procesando, setProcesando] = useState(false);
                                            const [observaciones, setObservaciones] = useState('');

                                            // ── Cargar estado de cierre ──
                                            useEffect(() => {
                                              (async () => {
                                                try {
                                                  const data = await controlInternoService.getCierrePlan(plan.id);
                                                  setCierre(data);
                                                } catch { /* no cerrado aún */ }
                                                finally { setCargando(false); }
                                              })();
                                            }, [plan.id]);

                                            const planEstaCerrado = cierre?.cerrado === true;

                                            // ── Cerrar plan ──
                                            const cerrarPlan = async () => {
                                              const accionesIncompletas = plan.acciones.filter(a => a.estado !== 'COMPLETADA' && a.estado !== 'VENCIDA');
                                              if (accionesIncompletas.length > 0) {
                                                toast.error(`Hay ${accionesIncompletas.length} acción(es) sin completar. Revise antes de cerrar.`);
                                                return;
                                              }
                                              setProcesando(true);
                                              try {
                                                await controlInternoService.cerrarPlanMejoramiento(plan.id, {
                                                  cerradoPorId: 'auditor',
                                                  cerradoPorNombre: 'Auditor OCI',
                                                  observacionesCierre: observaciones || undefined,
                                                });
                                                toast.success('Plan de mejoramiento cerrado exitosamente');
                                                const data = await controlInternoService.getCierrePlan(plan.id);
                                                setCierre(data);
                                              } catch (e: any) {
                                                toast.error(e?.message || 'Error al cerrar el plan');
                                              } finally { setProcesando(false); }
                                            };

                                            // ── Archivar expediente ──
                                            const archivarExpediente = async () => {
                                              setProcesando(true);
                                              try {
                                                await controlInternoService.archivarExpedientePlan(plan.id, {
                                                  indiceElectronicoRef: `INDICE-${plan.codigo || plan.id}-${new Date().getFullYear()}`
                                                });
                                                toast.success('Expediente archivado con índice electrónico');
                                                const data = await controlInternoService.getCierrePlan(plan.id);
                                                setCierre(data);
                                              } catch (e: any) {
                                                toast.error(e?.message || 'Error al archivar');
                                              } finally { setProcesando(false); }
                                            };

                                            // Conteo de hallazgos por resultado
                                            const hallazgosRatificados = plan.hallazgos.filter(h => h.progreso === 100).length;
                                            const hallazgosAceptados = plan.hallazgos.filter(h => h.progreso > 0 && h.progreso < 100).length;
                                            const hallazgosRetirados = plan.hallazgos.filter(h => h.progreso === 0).length;
                                            
                                            // Conteo de acciones por estado
                                            const accionesCompletadas = plan.acciones.filter(a => a.estado === 'COMPLETADA').length;
                                            const accionesEnEjecucion = plan.acciones.filter(a => a.estado === 'EN_EJECUCION').length;
                                            const accionesVencidas = plan.acciones.filter(a => a.estado === 'VENCIDA').length;
                                            const accionesPendientes = plan.acciones.filter(a => a.estado === 'PENDIENTE').length;

                                            return (
                                              <div className="space-y-6">
                                                {/* Banner de Estado */}
                                                <div className={`rounded-xl p-5 text-white ${planEstaCerrado ? 'bg-gradient-to-r from-gray-700 to-gray-800' : 'bg-gradient-to-r from-amber-600 to-orange-600'}`}>
                                                  <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                                      <Lock className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                      <h3 className="text-lg font-semibold">
                                                        {planEstaCerrado ? 'Expediente Cerrado' : 'Cierre del Plan de Mejoramiento'}
                                                      </h3>
                                                      <p className={`text-sm ${planEstaCerrado ? 'text-gray-300' : 'text-amber-200'}`}>
                                                        {planEstaCerrado
                                                          ? `Cerrado el ${cierre.fechaCierre ? new Date(cierre.fechaCierre).toLocaleDateString('es-CO') : '—'} por ${cierre.cerradoPorNombre || 'OCI'}`
                                                          : 'Revise el estado de las acciones y proceda al cierre cuando corresponda (EM-PT-002 act. 8)'}
                                                      </p>
                                                    </div>
                                                  </div>
                                                  {planEstaCerrado && (
                                                    <p className="text-sm text-gray-300 border-t border-white/20 pt-3 mt-2">
                                                      Este plan de mejoramiento ha sido cerrado y su información es de solo lectura. 
                                                      No se pueden realizar modificaciones a los hallazgos, acciones o documentos.
                                                    </p>
                                                  )}
                                                  {!planEstaCerrado && !cargando && (
                                                    <div className="mt-4 space-y-3">
                                                      <textarea
                                                        value={observaciones}
                                                        onChange={(e) => setObservaciones(e.target.value)}
                                                        placeholder="Observaciones de cierre (opcional)..."
                                                        className="w-full text-sm px-3 py-2 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
                                                        rows={2}
                                                      />
                                                      <div className="flex gap-3">
                                                        <button
                                                          onClick={cerrarPlan}
                                                          disabled={procesando}
                                                          className="px-4 py-2 bg-white text-amber-700 font-medium rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                                                        >
                                                          {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                                          Cerrar Plan
                                                        </button>
                                                        {cierre?.cerrado && !cierre?.indiceElectronicoRef && (
                                                          <button
                                                            onClick={archivarExpediente}
                                                            disabled={procesando}
                                                            className="px-4 py-2 bg-white/20 text-white font-medium rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                                                          >
                                                            <FileText className="w-4 h-4" />
                                                            Archivar Expediente
                                                          </button>
                                                        )}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>


                                                {/* Resumen Ejecutivo */}
                                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                  <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                                      <FileText className="w-5 h-5 text-gray-600" />
                                                      Resumen Ejecutivo
                                                    </h3>
                                                  </div>
                                                  <div className="p-5">
                                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                                      <div>
                                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Auditoría Vinculada</div>
                                                        <div className="text-sm font-medium text-gray-900">{plan.auditoria}</div>
                                                      </div>
                                                      <div>
                                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Plan de Mejoramiento</div>
                                                        <div className="text-sm font-medium text-gray-900">{plan.codigo} - {plan.nombre}</div>
                                                      </div>
                                                      <div>
                                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Área Responsable</div>
                                                        <div className="text-sm font-medium text-gray-900">{plan.area}</div>
                                                      </div>
                                                      <div>
                                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Responsable General</div>
                                                        <div className="text-sm font-medium text-gray-900">{plan.responsableGeneral}</div>
                                                      </div>
                                                      <div>
                                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Fecha de Cierre</div>
                                                        <div className="text-sm font-medium text-gray-900">{plan.fechaVencimiento}</div>
                                                      </div>
                                                      <div>
                                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Progreso Final</div>
                                                        <div className="text-sm font-medium text-green-600">{plan.progresoGlobal}%</div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Conteo de Hallazgos por Tipo */}
                                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                  <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                                      <AlertTriangle className="w-5 h-5 text-gray-600" />
                                                      Resultado de Hallazgos
                                                    </h3>
                                                  </div>
                                                  <div className="p-5">
                                                    <div className="grid grid-cols-3 gap-4">
                                                      <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                                                        <div className="text-3xl font-bold text-green-600">{hallazgosRatificados}</div>
                                                        <div className="text-sm text-green-700 font-medium">Ratificados</div>
                                                        <div className="text-xs text-green-600 mt-1">Hallazgos cerrados al 100%</div>
                                                      </div>
                                                      <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
                                                        <div className="text-3xl font-bold text-blue-600">{hallazgosAceptados}</div>
                                                        <div className="text-sm text-blue-700 font-medium">Aceptados</div>
                                                        <div className="text-xs text-blue-600 mt-1">Hallazgos en proceso</div>
                                                      </div>
                                                      <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                                                        <div className="text-3xl font-bold text-gray-600">{hallazgosRetirados}</div>
                                                        <div className="text-sm text-gray-700 font-medium">Retirados</div>
                                                        <div className="text-xs text-gray-600 mt-1">Hallazgos sin avance</div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Resultado de Acciones de Mejora */}
                                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                  <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                                      <Target className="w-5 h-5 text-gray-600" />
                                                      Resultado de Acciones de Mejora
                                                    </h3>
                                                  </div>
                                                  <div className="p-5">
                                                    <div className="grid grid-cols-4 gap-3 mb-6">
                                                      <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                                                        <div className="text-2xl font-bold text-green-600">{accionesCompletadas}</div>
                                                        <div className="text-xs text-green-700">Completadas</div>
                                                      </div>
                                                      <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                                                        <div className="text-2xl font-bold text-blue-600">{accionesEnEjecucion}</div>
                                                        <div className="text-xs text-blue-700">En Ejecución</div>
                                                      </div>
                                                      <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
                                                        <div className="text-2xl font-bold text-yellow-600">{accionesPendientes}</div>
                                                        <div className="text-xs text-yellow-700">Pendientes</div>
                                                      </div>
                                                      <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                                                        <div className="text-2xl font-bold text-red-600">{accionesVencidas}</div>
                                                        <div className="text-xs text-red-700">Vencidas</div>
                                                      </div>
                                                    </div>

                                                    {/* Detalle de cada acción con verificación final */}
                                                    <div className="space-y-3">
                                                      {plan.acciones.map((accion) => (
                                                        <div 
                                                          key={accion.id}
                                                          className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                                                        >
                                                          <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1">
                                                              <div className="flex items-center gap-2 mb-1">
                                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                                  accion.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700' :
                                                                  accion.estado === 'EN_EJECUCION' ? 'bg-blue-100 text-blue-700' :
                                                                  accion.estado === 'VENCIDA' ? 'bg-red-100 text-red-700' :
                                                                  'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                  {accion.estado === 'COMPLETADA' ? 'Verificada' : 
                                                                  accion.estado === 'EN_EJECUCION' ? 'En Proceso' :
                                                                  accion.estado === 'VENCIDA' ? 'Vencida' : 'Pendiente'}
                                                                </span>
                                                                <span className="text-xs text-gray-500">• {accion.responsable}</span>
                                                              </div>
                                                              <p className="text-sm text-gray-900">{accion.descripcion}</p>
                                                              {accion.observaciones && (
                                                                <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                                                                  <div className="text-xs text-gray-500 mb-1">Observación OCI:</div>
                                                                  <p className="text-xs text-gray-700">{accion.observaciones}</p>
                                                                </div>
                                                              )}
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                              <div className="text-lg font-bold text-gray-900">{accion.progreso}%</div>
                                                              <div className="text-xs text-gray-500">Avance Final</div>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Lecciones Aprendidas y Recomendaciones */}
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                    <div className="px-5 py-4 bg-amber-50 border-b border-amber-200">
                                                      <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                                                        <Lightbulb className="w-5 h-5" />
                                                        Lecciones Aprendidas
                                                      </h3>
                                                    </div>
                                                    <div className="p-5">
                                                      <ul className="space-y-2 text-sm text-gray-700">
                                                        <li className="flex items-start gap-2">
                                                          <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                                          <span>Se identificó la necesidad de fortalecer los controles preventivos antes de las auditorías.</span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                          <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                                          <span>La comunicación temprana entre áreas facilitó la resolución de hallazgos.</span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                          <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                                          <span>El seguimiento periódico permitió cumplir con los plazos establecidos.</span>
                                                        </li>
                                                      </ul>
                                                    </div>
                                                  </div>

                                                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                    <div className="px-5 py-4 bg-blue-50 border-b border-blue-200">
                                                      <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                                                        <ClipboardList className="w-5 h-5" />
                                                        Recomendaciones Jefe OCI
                                                      </h3>
                                                    </div>
                                                    <div className="p-5">
                                                      <ul className="space-y-2 text-sm text-gray-700">
                                                        <li className="flex items-start gap-2">
                                                          <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                                          <span>Implementar revisiones trimestrales de los procesos críticos identificados.</span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                          <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                                          <span>Capacitar al personal en las nuevas políticas y procedimientos adoptados.</span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                          <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                                          <span>Mantener la trazabilidad documental para futuras auditorías.</span>
                                                        </li>
                                                      </ul>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Botones de Descarga */}
                                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                                                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                    <Download className="w-5 h-5 text-gray-600" />
                                                    Documentos de Cierre
                                                  </h3>
                                                  <div className="flex gap-4">
                                                    <button className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-[#1e5da8] text-white rounded-lg hover:bg-[#174a8a] transition-colors">
                                                      <FileText className="w-5 h-5" />
                                                      <div className="text-left">
                                                        <div className="font-medium">Informe de Cierre</div>
                                                        <div className="text-xs text-blue-200">Documento completo PDF</div>
                                                      </div>
                                                    </button>
                                                    <button className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                                                      <BarChart2 className="w-5 h-5" />
                                                      <div className="text-left">
                                                        <div className="font-medium">Informe Ejecutivo</div>
                                                        <div className="text-xs text-emerald-200">Resumen para directivos</div>
                                                      </div>
                                                    </button>
                                                  </div>
                                                </div>

                                                {/* Trazabilidad de Decisiones */}
                                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                  <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                                      <GitBranch className="w-5 h-5 text-gray-600" />
                                                      Trazabilidad de Decisiones (Etapa de Comunicación)
                                                    </h3>
                                                  </div>
                                                  <div className="p-5">
                                                    <div className="space-y-3">
                                                      {plan.hallazgos.map((hallazgo, index) => (
                                                        <div key={hallazgo.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                            hallazgo.progreso === 100 ? 'bg-green-100' : 
                                                            hallazgo.progreso > 0 ? 'bg-blue-100' : 'bg-gray-100'
                                                          }`}>
                                                            {hallazgo.progreso === 100 ? (
                                                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                            ) : hallazgo.progreso > 0 ? (
                                                              <Clock className="w-5 h-5 text-blue-600" />
                                                            ) : (
                                                              <XCircle className="w-5 h-5 text-gray-500" />
                                                            )}
                                                          </div>
                                                          <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                              <span className="font-medium text-gray-900">{hallazgo.codigo}</span>
                                                              <span className={`px-2 py-0.5 rounded text-xs ${
                                                                hallazgo.criticidad === 'ALTA' ? 'bg-red-100 text-red-700' :
                                                                hallazgo.criticidad === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-gray-100 text-gray-700'
                                                              }`}>
                                                                {hallazgo.criticidad}
                                                              </span>
                                                            </div>
                                                            <p className="text-sm text-gray-600 truncate">{hallazgo.descripcion}</p>
                                                          </div>
                                                          <div className="text-right flex-shrink-0">
                                                            <div className={`text-sm font-medium ${
                                                              hallazgo.progreso === 100 ? 'text-green-600' : 
                                                              hallazgo.progreso > 0 ? 'text-blue-600' : 'text-gray-500'
                                                            }`}>
                                                              {hallazgo.progreso === 100 ? 'Ratificado' : 
                                                              hallazgo.progreso > 0 ? 'Aceptado' : 'Retirado'}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{hallazgo.progreso}% completado</div>
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }

                                          // ═══════════════════════════════════════════════════════════════════════════
                                          // COMPONENTE: ITEM DEL TIMELINE DE EVENTOS
                                          // ═══════════════════════════════════════════════════════════════════════════

                                          interface EventoTimelineItemProps {
                                            id: string;
                                            tipo: string;
                                            descripcion: string;
                                            usuarioNombre?: string;
                                            fecha: string;
                                            metadata?: Record<string, any>;
                                          }

                                          function TimelineEventoItem({ evento, isLast }: { evento: EventoTimelineItemProps; isLast: boolean }) {
                                            const tipoConfig: Record<string, { bg: string; text: string; icon: any; label: string }> = {
                                              CREACION: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Plus, label: 'Creación' },
                                              ACTUALIZACION: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Edit2, label: 'Actualización' },
                                              APROBACION: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2, label: 'Aprobación' },
                                              COMPLETADA: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2, label: 'Completada' },
                                              EVIDENCIA: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Paperclip, label: 'Evidencia' },
                                              COMENTARIO: { bg: 'bg-gray-100', text: 'text-gray-700', icon: MessageSquare, label: 'Comentario' },
                                              PROGRESO: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: TrendingUp, label: 'Progreso' },
                                              ESTADO: { bg: 'bg-orange-100', text: 'text-orange-700', icon: RefreshCw, label: 'Cambio Estado' },
                                              HALLAZGO_COMPLETADO: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Flag, label: 'Hallazgo Cerrado' },
                                            };

                                            const config = tipoConfig[evento.tipo] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: Activity, label: evento.tipo };
                                            const Icon = config.icon;

                                            // Formatear fecha
                                            const formatearFecha = (fechaStr: string) => {
                                              try {
                                                const fecha = new Date(fechaStr);
                                                return fecha.toLocaleDateString('es-CO', {
                                                  day: '2-digit',
                                                  month: 'short',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                });
                                              } catch {
                                                return fechaStr;
                                              }
                                            };

                                            return (
                                              <div className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                  <div className={`w-9 h-9 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                                                    <Icon className={`w-4 h-4 ${config.text}`} />
                                                  </div>
                                                  {!isLast && <div className="flex-1 w-0.5 bg-gray-200 mt-1" style={{ minHeight: '30px' }} />}
                                                </div>

                                                <div className="flex-1 pb-4">
                                                  <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                      <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                                                          {config.label}
                                                        </span>
                                                      </div>
                                                      <p className="text-sm text-gray-900">{evento.descripcion}</p>
                                                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                                                        <div className="flex items-center gap-1">
                                                          <User className="w-3 h-3" />
                                                          {evento.usuarioNombre || 'Sistema'}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                          <Clock className="w-3 h-3" />
                                                          {formatearFecha(evento.fecha)}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }

                                          function TimelineItem({ actividad, isLast }: { actividad: ActividadTimeline; isLast: boolean }) {
                                            const tipoConfig = {
                                              CREACION: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Plus },
                                              ACTUALIZACION: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Edit2 },
                                              COMPLETADA: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
                                              EVIDENCIA: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Paperclip },
                                              COMENTARIO: { bg: 'bg-gray-100', text: 'text-gray-700', icon: MessageSquare }
                                            };

                                            const config = tipoConfig[actividad.tipo];
                                            const Icon = config.icon;

                                            return (
                                              <div className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                  <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                                                    <Icon className={`w-5 h-5 ${config.text}`} />
                                                  </div>
                                                  {!isLast && <div className="flex-1 w-0.5 bg-gray-200 mt-2" style={{ minHeight: '40px' }} />}
                                                </div>

                                                <div className="flex-1 pb-6">
                                                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                    <p className="text-sm text-gray-900 mb-2">{actividad.descripcion}</p>
                                                    <div className="flex items-center gap-4 text-xs text-gray-600">
                                                      <div className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {actividad.usuario}
                                                      </div>
                                                      <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {actividad.fecha}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // COMPONENTES AUXILIARES
                                          // ════════════════════════════════════════════════════════════════════════════

                                          function InfoItem({ label, valor }: { label: string; valor: string }) {
                                            return (
                                              <div>
                                                <div className="text-xs text-gray-600 mb-1">{label}</div>
                                                <div className="text-sm text-gray-900">{valor}</div>
                                              </div>
                                            );
                                          }

                                          function ProgresoBar({ label, valor, total, color }: { label: string; valor: number; total: number; color: string }) {
                                            const porcentaje = total > 0 ? Math.round((valor / total) * 100) : 0;

                                            const colorClasses = {
                                              green: 'bg-green-600',
                                              yellow: 'bg-yellow-600',
                                              gray: 'bg-gray-600',
                                              red: 'bg-red-600'
                                            };

                                            return (
                                              <div>
                                                <div className="flex items-center justify-between text-sm mb-2">
                                                  <span className="text-gray-700">{label}</span>
                                                  <span className="text-gray-900 font-medium">{valor}/{total} ({porcentaje}%)</span>
                                                </div>
                                                <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                  <div
                                                    className={`h-full transition-all ${colorClasses[color as keyof typeof colorClasses]}`}
                                                    style={{ width: `${porcentaje}%` }}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          }

                                          function FiltroButton({ active, onClick, label, color = 'gray' }: any) {
                                            const colorClasses = {
                                              green: active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-700 border-gray-300',
                                              yellow: active ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white text-gray-700 border-gray-300',
                                              gray: active ? 'bg-gray-100 text-gray-900 border-gray-400' : 'bg-white text-gray-700 border-gray-300'
                                            };

                                            return (
                                              <button
                                                onClick={onClick}
                                                className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${colorClasses[color]}`}
                                              >
                                                {label}
                                              </button>
                                            );
                                          }

                                          // ChevronDown ya importado al inicio del archivo

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // MODAL: EDITAR ACCIÓN
                                          // ════════════════════════════════════════════════════════════════════════════

                                          interface ModalEditarAccionProps {
                                            accion: AccionCorrectiva;
                                            onClose: () => void;
                                            onGuardar: (accionId: string, data: any) => Promise<boolean>;
                                          }

                                          function ModalEditarAccion({ accion, onClose, onGuardar }: ModalEditarAccionProps) {
                                            const [guardando, setGuardando] = useState(false);
                                            const [profesionales, setProfesionales] = useState<{id: string; nombre: string; cargo: string}[]>([]);
                                            const [cargandoProfesionales, setCargandoProfesionales] = useState(true);
                                            const [datosEdicion, setDatosEdicion] = useState({
                                              descripcion: accion.descripcion,
                                              responsable: accion.responsable,
                                              fechaInicio: accion.fechaInicio,
                                              fechaVencimiento: accion.fechaVencimiento,
                                              estado: accion.estado,
                                              progreso: accion.progreso,
                                              observaciones: accion.observaciones || ''
                                            });

                                            // Cargar profesionales OCIG al montar
                                            useEffect(() => {
                                              const cargarProfesionales = async () => {
                                                setCargandoProfesionales(true);
                                                try {
                                                  const response = await configuracionesProfesionalesOCIGApi.getAll();
                                                  
                                                  if (response.success && response.data && response.data.length > 0) {
                                                    const profs = response.data
                                                      .filter((config: any) => config.activo)
                                                      .map((config: any) => ({
                                                        id: String(config.idTercero),
                                                        nombre: config.nombre || `Profesional ${config.idTercero}`,
                                                        cargo: config.rolOcig || 'Profesional'
                                                      }));
                                                    setProfesionales(profs);
                                                  }
                                                } catch (error) {
                                                  console.error('[ModalEditarAccion] Error cargando profesionales:', error);
                                                } finally {
                                                  setCargandoProfesionales(false);
                                                }
                                              };
                                              
                                              cargarProfesionales();
                                            }, []);

                                            const handleGuardar = async () => {
                                              // Validaciones
                                              if (!datosEdicion.descripcion.trim()) {
                                                toast.error('La descripción es obligatoria');
                                                return;
                                              }

                                              if (!datosEdicion.responsable.trim()) {
                                                toast.error('El responsable es obligatorio');
                                                return;
                                              }

                                              if (datosEdicion.progreso < 0 || datosEdicion.progreso > 100) {
                                                toast.error('El progreso debe estar entre 0 y 100');
                                                return;
                                              }

                                              // ✅ LLAMADA AL BACKEND
                                              setGuardando(true);
                                              const exito = await onGuardar(accion.id, datosEdicion);
                                              setGuardando(false);
                                              
                                              if (exito) {
                                                onClose();
                                              }
                                            };

                                            return (
                                              <div className="fixed inset-0 z-[10001] overflow-hidden flex items-center justify-center p-4">
                                                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
                                                
                                                <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
                                                  {/* Header */}
                                                  <div className="flex-shrink-0 bg-[#1e5da8] text-white px-6 py-4 rounded-t-xl">
                                                    <div className="flex items-start justify-between">
                                                      <div>
                                                        <h3 className="text-xl font-medium mb-1">Editar Acción Correctiva</h3>
                                                        <p className="text-sm text-blue-100">Actualizar información de la acción</p>
                                                      </div>
                                                      <button
                                                        onClick={onClose}
                                                        className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                                                      >
                                                        <X className="w-5 h-5" />
                                                      </button>
                                                    </div>
                                                  </div>

                                                  {/* Contenido */}
                                                  <div className="flex-1 overflow-auto px-6 py-6">
                                                    <div className="space-y-4">
                                                      {/* Descripción */}
                                                      <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                          Descripción <span className="text-red-500">*</span>
                                                        </label>
                                                        <textarea
                                                          value={datosEdicion.descripcion}
                                                          onChange={(e) => setDatosEdicion({ ...datosEdicion, descripcion: e.target.value })}
                                                          rows={3}
                                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                          placeholder="Descripción detallada de la acción correctiva"
                                                        />
                                                      </div>

                                                      {/* Responsable y Estado */}
                                                      <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Responsable <span className="text-red-500">*</span>
                                                          </label>
                                                          {cargandoProfesionales ? (
                                                            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-500 flex items-center gap-2">
                                                              <Loader2 className="w-4 h-4 animate-spin" />
                                                              Cargando...
                                                            </div>
                                                          ) : profesionales.length > 0 ? (
                                                            <select
                                                              value={datosEdicion.responsable}
                                                              onChange={(e) => setDatosEdicion({ ...datosEdicion, responsable: e.target.value })}
                                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                            >
                                                              <option value="">Seleccionar responsable...</option>
                                                              {/* Opción actual si no está en la lista */}
                                                              {datosEdicion.responsable && !profesionales.find(p => p.nombre === datosEdicion.responsable) && (
                                                                <option value={datosEdicion.responsable}>{datosEdicion.responsable} (actual)</option>
                                                              )}
                                                              {profesionales.map((prof) => (
                                                                <option key={prof.id} value={prof.nombre}>
                                                                  {prof.nombre} - {prof.cargo}
                                                                </option>
                                                              ))}
                                                            </select>
                                                          ) : (
                                                            <input
                                                              type="text"
                                                              value={datosEdicion.responsable}
                                                              onChange={(e) => setDatosEdicion({ ...datosEdicion, responsable: e.target.value })}
                                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                              placeholder="Nombre del responsable"
                                                            />
                                                          )}
                                                        </div>

                                                        <div>
                                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Estado
                                                          </label>
                                                          <select
                                                            value={datosEdicion.estado}
                                                            onChange={(e) => setDatosEdicion({ ...datosEdicion, estado: e.target.value as AccionCorrectiva['estado'] })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                          >
                                                            <option value="PENDIENTE">Pendiente</option>
                                                            <option value="EN_EJECUCION">En Ejecución</option>
                                                            <option value="COMPLETADA">Completada</option>
                                                            <option value="VENCIDA">Vencida</option>
                                                          </select>
                                                        </div>
                                                      </div>

                                                      {/* Fechas */}
                                                      <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Fecha Inicio
                                                          </label>
                                                          <input
                                                            type="date"
                                                            value={datosEdicion.fechaInicio}
                                                            onChange={(e) => setDatosEdicion({ ...datosEdicion, fechaInicio: e.target.value })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                          />
                                                        </div>

                                                        <div>
                                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Fecha Vencimiento
                                                          </label>
                                                          <input
                                                            type="date"
                                                            value={datosEdicion.fechaVencimiento}
                                                            onChange={(e) => setDatosEdicion({ ...datosEdicion, fechaVencimiento: e.target.value })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                          />
                                                        </div>
                                                      </div>

                                                      {/* Progreso */}
                                                      <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                          Progreso: {datosEdicion.progreso}%
                                                        </label>
                                                        <input
                                                          type="range"
                                                          min="0"
                                                          max="100"
                                                          step="5"
                                                          value={datosEdicion.progreso}
                                                          onChange={(e) => setDatosEdicion({ ...datosEdicion, progreso: parseInt(e.target.value) })}
                                                          className="w-full"
                                                        />
                                                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                                                          <span>0%</span>
                                                          <span>50%</span>
                                                          <span>100%</span>
                                                        </div>
                                                      </div>

                                                      {/* Observaciones */}
                                                      <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                          Observaciones
                                                        </label>
                                                        <textarea
                                                          value={datosEdicion.observaciones}
                                                          onChange={(e) => setDatosEdicion({ ...datosEdicion, observaciones: e.target.value })}
                                                          rows={3}
                                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                          placeholder="Observaciones adicionales (opcional)"
                                                        />
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Footer */}
                                                  <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
                                                    <div className="flex justify-end gap-3">
                                                      <button
                                                        onClick={onClose}
                                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                                      >
                                                        Cancelar
                                                      </button>
                                                      <button
                                                        onClick={handleGuardar}
                                                        className="px-4 py-2 bg-[#1e5da8] hover:bg-[#174a8a] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
                                                      >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Guardar Cambios
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // MODAL: CREAR ACCIÓN CORRECTIVA
                                          // ════════════════════════════════════════════════════════════════════════════

                                          interface ModalCrearAccionProps {
                                            hallazgos: Hallazgo[];
                                            hallazgoPreseleccionado?: string;
                                            onClose: () => void;
                                            onCrear: (data: any) => Promise<boolean>;
                                          }

                                          function ModalCrearAccion({ hallazgos, hallazgoPreseleccionado, onClose, onCrear }: ModalCrearAccionProps) {
                                            const [guardando, setGuardando] = useState(false);
                                            const [profesionales, setProfesionales] = useState<{id: string; nombre: string; cargo: string}[]>([]);
                                            const [cargandoProfesionales, setCargandoProfesionales] = useState(true);
                                            const [datosAccion, setDatosAccion] = useState({
                                              hallazgoId: hallazgoPreseleccionado || (hallazgos.length > 0 ? hallazgos[0].id : ''),
                                              descripcion: '',
                                              responsable: '',
                                              fechaInicio: new Date().toISOString().split('T')[0],
                                              fechaVencimiento: '',
                                              observaciones: ''
                                            });

                                            // Cargar profesionales OCIG al montar
                                            useEffect(() => {
                                              const cargarProfesionales = async () => {
                                                setCargandoProfesionales(true);
                                                try {
                                                  const response = await configuracionesProfesionalesOCIGApi.getAll();
                                                  console.log('[ModalCrearAccion] Profesionales OCIG response:', response);
                                                  
                                                  if (response.success && response.data && response.data.length > 0) {
                                                    const profs = response.data
                                                      .filter((config: any) => config.activo)
                                                      .map((config: any) => ({
                                                        id: String(config.idTercero),
                                                        nombre: config.nombre || `Profesional ${config.idTercero}`,
                                                        cargo: config.rolOcig || 'Profesional'
                                                      }));
                                                    setProfesionales(profs);
                                                    console.log('[ModalCrearAccion] Profesionales cargados:', profs.length);
                                                  } else {
                                                    console.warn('[ModalCrearAccion] No hay profesionales OCIG configurados');
                                                    toast.warning('No hay profesionales configurados');
                                                  }
                                                } catch (error) {
                                                  console.error('[ModalCrearAccion] Error cargando profesionales:', error);
                                                  toast.error('Error al cargar profesionales');
                                                } finally {
                                                  setCargandoProfesionales(false);
                                                }
                                              };
                                              
                                              cargarProfesionales();
                                            }, []);

                                            const handleCrear = async () => {
                                              // Validaciones
                                              if (!datosAccion.hallazgoId) {
                                                toast.error('Debes seleccionar un hallazgo');
                                                return;
                                              }

                                              if (!datosAccion.descripcion.trim()) {
                                                toast.error('La descripción es obligatoria');
                                                return;
                                              }

                                              if (!datosAccion.responsable.trim()) {
                                                toast.error('El responsable es obligatorio');
                                                return;
                                              }

                                              if (!datosAccion.fechaInicio) {
                                                toast.error('La fecha de inicio es obligatoria');
                                                return;
                                              }

                                              if (!datosAccion.fechaVencimiento) {
                                                toast.error('La fecha de vencimiento es obligatoria');
                                                return;
                                              }

                                              // Validar que fecha vencimiento sea posterior a fecha inicio
                                              if (new Date(datosAccion.fechaVencimiento) < new Date(datosAccion.fechaInicio)) {
                                                toast.error('La fecha de vencimiento debe ser posterior a la fecha de inicio');
                                                return;
                                              }

                                              // Llamar al backend
                                              setGuardando(true);
                                              const exito = await onCrear({
                                                hallazgoId: datosAccion.hallazgoId,
                                                descripcion: datosAccion.descripcion,
                                                responsable: datosAccion.responsable,
                                                fechaInicio: datosAccion.fechaInicio,
                                                fechaFin: datosAccion.fechaVencimiento,  // Backend usa fechaFin
                                                observaciones: datosAccion.observaciones
                                              });
                                              setGuardando(false);
                                              
                                              if (exito) {
                                                onClose();
                                              }
                                            };

                                            const hallazgoSeleccionado = hallazgos.find(h => h.id === datosAccion.hallazgoId);

                                            return (
                                              <div className="fixed inset-0 z-[10001] overflow-hidden flex items-center justify-center p-4">
                                                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
                                                
                                                <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
                                                  {/* Header */}
                                                  <div className="flex-shrink-0 bg-[#1e5da8] text-white px-6 py-4 rounded-t-xl">
                                                    <div className="flex items-start justify-between">
                                                      <div>
                                                        <h3 className="text-xl font-medium mb-1">Nueva Acción Correctiva</h3>
                                                        <p className="text-sm text-blue-100">Crear una nueva acción para el plan de mejoramiento</p>
                                                      </div>
                                                      <button
                                                        onClick={onClose}
                                                        className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                                                      >
                                                        <X className="w-5 h-5" />
                                                      </button>
                                                    </div>
                                                  </div>

                                                  {/* Contenido */}
                                                  <div className="flex-1 overflow-auto px-6 py-6">
                                                    <div className="space-y-4">
                                                      {/* Hallazgo asociado */}
                                                      <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                          Hallazgo Asociado <span className="text-red-500">*</span>
                                                        </label>
                                                        <select
                                                          value={datosAccion.hallazgoId}
                                                          onChange={(e) => setDatosAccion({ ...datosAccion, hallazgoId: e.target.value })}
                                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                          disabled={!!hallazgoPreseleccionado}
                                                        >
                                                          {hallazgos.map((h) => (
                                                            <option key={h.id} value={h.id}>
                                                              {h.codigo} - {h.descripcion.substring(0, 60)}{h.descripcion.length > 60 ? '...' : ''}
                                                            </option>
                                                          ))}
                                                        </select>
                                                        {hallazgoSeleccionado && (
                                                          <div className={`mt-2 text-xs px-2 py-1 rounded inline-block ${
                                                            hallazgoSeleccionado.criticidad === 'ALTA' ? 'bg-red-100 text-red-700' :
                                                            hallazgoSeleccionado.criticidad === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-blue-100 text-blue-700'
                                                          }`}>
                                                            Criticidad: {hallazgoSeleccionado.criticidad}
                                                          </div>
                                                        )}
                                                      </div>

                                                      {/* Descripción */}
                                                      <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                          Descripción de la Acción <span className="text-red-500">*</span>
                                                        </label>
                                                        <textarea
                                                          value={datosAccion.descripcion}
                                                          onChange={(e) => setDatosAccion({ ...datosAccion, descripcion: e.target.value })}
                                                          rows={3}
                                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                          placeholder="Describe la acción correctiva a implementar..."
                                                        />
                                                      </div>

                                                      {/* Responsable */}
                                                      <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                          Responsable <span className="text-red-500">*</span>
                                                        </label>
                                                        {cargandoProfesionales ? (
                                                          <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-500 flex items-center gap-2">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Cargando profesionales...
                                                          </div>
                                                        ) : profesionales.length > 0 ? (
                                                          <select
                                                            value={datosAccion.responsable}
                                                            onChange={(e) => setDatosAccion({ ...datosAccion, responsable: e.target.value })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                          >
                                                            <option value="">Seleccionar responsable...</option>
                                                            {profesionales.map((prof) => (
                                                              <option key={prof.id} value={prof.nombre}>
                                                                {prof.nombre} - {prof.cargo}
                                                              </option>
                                                            ))}
                                                          </select>
                                                        ) : (
                                                          <input
                                                            type="text"
                                                            value={datosAccion.responsable}
                                                            onChange={(e) => setDatosAccion({ ...datosAccion, responsable: e.target.value })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                            placeholder="Nombre del responsable de implementar la acción"
                                                          />
                                                        )}
                                                      </div>

                                                      {/* Fechas */}
                                                      <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Fecha Inicio <span className="text-red-500">*</span>
                                                          </label>
                                                          <input
                                                            type="date"
                                                            value={datosAccion.fechaInicio}
                                                            onChange={(e) => setDatosAccion({ ...datosAccion, fechaInicio: e.target.value })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                          />
                                                        </div>

                                                        <div>
                                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Fecha Vencimiento <span className="text-red-500">*</span>
                                                          </label>
                                                          <input
                                                            type="date"
                                                            value={datosAccion.fechaVencimiento}
                                                            onChange={(e) => setDatosAccion({ ...datosAccion, fechaVencimiento: e.target.value })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                          />
                                                        </div>
                                                      </div>

                                                      {/* Observaciones */}
                                                      <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                          Observaciones
                                                        </label>
                                                        <textarea
                                                          value={datosAccion.observaciones}
                                                          onChange={(e) => setDatosAccion({ ...datosAccion, observaciones: e.target.value })}
                                                          rows={2}
                                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                          placeholder="Observaciones adicionales (opcional)"
                                                        />
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Footer */}
                                                  <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
                                                    <div className="flex justify-end gap-3">
                                                      <button
                                                        onClick={onClose}
                                                        disabled={guardando}
                                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
                                                      >
                                                        Cancelar
                                                      </button>
                                                      <button
                                                        onClick={handleCrear}
                                                        disabled={guardando}
                                                        className="px-4 py-2 bg-[#1e5da8] hover:bg-[#174a8a] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2 disabled:opacity-50"
                                                      >
                                                        {guardando ? (
                                                          <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Creando...
                                                          </>
                                                        ) : (
                                                          <>
                                                            <Plus className="w-4 h-4" />
                                                            Crear Acción
                                                          </>
                                                        )}
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // MODAL: CARGAR EVIDENCIA
                                          // ════════════════════════════════════════════════════════════════════════════

                                          interface ModalCargarEvidenciaProps {
                                            accion: AccionCorrectiva;
                                            planId: string;
                                            onClose: () => void;
                                            onEvidenciasCargadas?: () => void;
                                          }

                                          function ModalCargarEvidencia({ accion, planId, onClose, onEvidenciasCargadas }: ModalCargarEvidenciaProps) {
                                            const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([]);
                                            const [observaciones, setObservaciones] = useState('');
                                            const [cargando, setCargando] = useState(false);
                                            const [progresoArchivos, setProgresoArchivos] = useState<Record<number, number>>({});

                                            // Log de montaje
                                            useEffect(() => {
                                              console.log('🔵 ModalCargarEvidencia MONTADO - planId:', planId, 'accionId:', accion.id);
                                              return () => console.log('🔴 ModalCargarEvidencia DESMONTADO');
                                            }, []);

                                            const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                                              if (e.target.files) {
                                                const nuevosArchivos = Array.from(e.target.files);
                                                setArchivosSeleccionados([...archivosSeleccionados, ...nuevosArchivos]);
                                              }
                                            };

                                            const handleEliminarArchivo = (index: number) => {
                                              const nuevosArchivos = archivosSeleccionados.filter((_, i) => i !== index);
                                              setArchivosSeleccionados(nuevosArchivos);
                                            };

                                            const handleCargar = async () => {
                                              if (archivosSeleccionados.length === 0) {
                                                toast.error('Debes seleccionar al menos un archivo');
                                                return;
                                              }

                                              setCargando(true);
                                              let exitosos = 0;
                                              let errores = 0;

                                              // Subir cada archivo
                                              for (let i = 0; i < archivosSeleccionados.length; i++) {
                                                const archivo = archivosSeleccionados[i];
                                                try {
                                                  await controlInternoService.createEvidencia(
                                                    archivo,
                                                    {
                                                      nombre: archivo.name,
                                                      descripcion: observaciones || `Evidencia para acción: ${accion.descripcion.substring(0, 50)}`,
                                                      tipoDocumento: 'evidencia_accion',
                                                      accionCorrectivaId: accion.id,
                                                      // No enviar planMejoramientoId - backend solo permite UNA vinculación
                                                    },
                                                    (progress) => {
                                                      setProgresoArchivos(prev => ({ ...prev, [i]: progress }));
                                                    }
                                                  );
                                                  exitosos++;
                                                } catch (error) {
                                                  console.error(`Error subiendo ${archivo.name}:`, error);
                                                  errores++;
                                                }
                                              }

                                              setCargando(false);

                                              if (exitosos > 0) {
                                                toast.success('Evidencias Cargadas', {
                                                  description: `${exitosos} archivo(s) cargado(s) exitosamente${errores > 0 ? `, ${errores} con error` : ''}`,
                                                  duration: 3000,
                                                });
                                                onEvidenciasCargadas?.();
                                                onClose();
                                              } else {
                                                toast.error('Error al cargar evidencias', {
                                                  description: 'No se pudo cargar ningún archivo. Intenta de nuevo.',
                                                });
                                              }
                                            };

                                            const formatFileSize = (bytes: number) => {
                                              if (bytes === 0) return '0 Bytes';
                                              const k = 1024;
                                              const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                                              const i = Math.floor(Math.log(bytes) / Math.log(k));
                                              return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
                                            };

                                            return createPortal(
                                              <div className="fixed inset-0 z-[10001] overflow-hidden flex items-center justify-center p-4">
                                                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
                                                
                                                <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
                                                  {/* Header */}
                                                  <div className="flex-shrink-0 bg-[#1e5da8] text-white px-6 py-4 rounded-t-xl">
                                                    <div className="flex items-start justify-between">
                                                      <div>
                                                        <h3 className="text-xl font-medium mb-1">Cargar Evidencias</h3>
                                                        <p className="text-sm text-blue-100">Adjuntar documentos y archivos de soporte</p>
                                                      </div>
                                                      <button
                                                        onClick={onClose}
                                                        className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                                                      >
                                                        <X className="w-5 h-5" />
                                                      </button>
                                                    </div>
                                                  </div>

                                                  {/* Contenido */}
                                                  <div className="flex-1 overflow-auto px-6 py-6">
                                                    <div className="space-y-4">
                                              {/* Información de la Acción */}
                                                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                        <div className="text-sm font-medium text-blue-900 mb-1">Acción Correctiva</div>
                                                        <div className="text-sm text-blue-700">{accion.descripcion}</div>
                                                        <div className="text-xs text-blue-600 mt-2">
                                                          Evidencias actuales: {accion.evidencias} archivo(s)
                                                        </div>
                                                      </div>

                                                      {/* Zona de carga */}
                                                      <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                          Seleccionar Archivos <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1e5da8] transition-colors">
                                                          <input
                                                            type="file"
                                                            multiple
                                                            onChange={handleFileChange}
                                                            className="hidden"
                                                            id="file-upload"
                                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                                          />
                                                          <label
                                                            htmlFor="file-upload"
                                                            className="cursor-pointer flex flex-col items-center"
                                                          >
                                                            <Upload className="w-12 h-12 text-gray-400 mb-2" />
                                                            <span className="text-sm text-gray-700 font-medium">
                                                              Haz clic para seleccionar archivos
                                                            </span>
                                                            <span className="text-xs text-gray-500 mt-1">
                                                              PDF, Word, Excel, Imágenes (máx. 10MB por archivo)
                                                            </span>
                                                          </label>
                                                        </div>
                                                      </div>

                                                      {/* Lista de archivos seleccionados */}
                                                      {archivosSeleccionados.length > 0 && (
                                                        <div>
                                                          <div className="text-sm font-medium text-gray-700 mb-2">
                                                            Archivos Seleccionados ({archivosSeleccionados.length})
                                                          </div>
                                                          <div className="space-y-2">
                                                            {archivosSeleccionados.map((archivo, index) => (
                                                              <div
                                                                key={index}
                                                                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                                                              >
                                                                <div className="flex items-center gap-3 flex-1">
                                                                  <Paperclip className="w-4 h-4 text-gray-600" />
                                                                  <div className="flex-1 min-w-0">
                                                                    <div className="text-sm text-gray-900 truncate">
                                                                      {archivo.name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-600">
                                                                      {formatFileSize(archivo.size)}
                                                                    </div>
                                                                  </div>
                                                                </div>
                                                                <button
                                                                  onClick={() => handleEliminarArchivo(index)}
                                                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                >
                                                                  <Trash2 className="w-4 h-4" />
                                                                </button>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        </div>
                                                      )}

                                                      {/* Observaciones */}
                                                      <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                          Observaciones
                                                        </label>
                                                        <textarea
                                                          value={observaciones}
                                                          onChange={(e) => setObservaciones(e.target.value)}
                                                          rows={3}
                                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                          placeholder="Descripción de las evidencias (opcional)"
                                                        />
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Footer */}
                                                  <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
                                                    <div className="flex justify-end gap-3">
                                                      <button
                                                        onClick={onClose}
                                                        disabled={cargando}
                                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
                                                      >
                                                        Cancelar
                                                      </button>
                                                      <button
                                                        onClick={handleCargar}
                                                        disabled={cargando || archivosSeleccionados.length === 0}
                                                        className="px-4 py-2 bg-[#1e5da8] hover:bg-[#174a8a] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                      >
                                                        {cargando ? (
                                                          <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Subiendo...
                                                          </>
                                                        ) : (
                                                          <>
                                                            <Upload className="w-4 h-4" />
                                                            Cargar {archivosSeleccionados.length > 0 ? `${archivosSeleccionados.length} Archivo(s)` : 'Evidencias'}
                                                          </>
                                                        )}
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>,
                                              document.body
                                            );
                                          }

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // MODAL: CARGAR DOCUMENTO AL PLAN
                                          // ════════════════════════════════════════════════════════════════════════════

                                          interface ModalCargarDocumentoPlanProps {
                                            planId: string;
                                            onClose: () => void;
                                          }

                                          function ModalCargarDocumentoPlan({ planId, onClose }: ModalCargarDocumentoPlanProps) {
                                            const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([]);
                                            const [tipoDocumento, setTipoDocumento] = useState('');
                                            const [descripcion, setDescripcion] = useState('');

                                            const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                                              if (e.target.files) {
                                                const nuevosArchivos = Array.from(e.target.files);
                                                setArchivosSeleccionados([...archivosSeleccionados, ...nuevosArchivos]);
                                              }
                                            };

                                            const handleEliminarArchivo = (index: number) => {
                                              const nuevosArchivos = archivosSeleccionados.filter((_, i) => i !== index);
                                              setArchivosSeleccionados(nuevosArchivos);
                                            };

                                            const handleCargar = () => {
                                              if (archivosSeleccionados.length === 0) {
                                                toast.error('Debes seleccionar al menos un archivo');
                                                return;
                                              }

                                              if (!tipoDocumento) {
                                                toast.error('Debes seleccionar el tipo de documento');
                                                return;
                                              }

                                              // Simular carga de documentos
                                              toast.success('Documentos Cargados', {
                                                description: `${archivosSeleccionados.length} documento(s) cargado(s) exitosamente al plan`,
                                                duration: 3000,
                                              });

                                              console.log('📄 Cargando documentos al plan:', {
                                                planId,
                                                tipoDocumento,
                                                descripcion,
                                                archivos: archivosSeleccionados.map(f => ({
                                                  nombre: f.name,
                                                  tamanio: f.size,
                                                  tipo: f.type
                                                })),
                                                usuario: 'Usuario Actual',
                                                timestamp: new Date().toISOString()
                                              });

                                              onClose();
                                            };

                                            const formatFileSize = (bytes: number) => {
                                              if (bytes === 0) return '0 Bytes';
                                              const k = 1024;
                                              const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                                              const i = Math.floor(Math.log(bytes) / Math.log(k));
                                              return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
                                            };

                                            return (
                                              <div className="fixed inset-0 z-[10001] overflow-hidden flex items-center justify-center p-4">
                                                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
                                                
                                                <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
                                                  {/* Header */}
                                                  <div className="flex-shrink-0 bg-[#1e5da8] text-white px-6 py-4 rounded-t-xl">
                                                    <div className="flex items-start justify-between">
                                                      <div>
                                                        <h3 className="text-xl font-medium mb-1">Cargar Documento al Plan</h3>
                                                        <p className="text-sm text-blue-100">Adjuntar documentos y evidencias del plan de mejoramiento</p>
                                                      </div>
                                                      <button
                                                        onClick={onClose}
                                                        className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                                                      >
                                                        <X className="w-5 h-5" />
                                                      </button>
                                                    </div>
                                                  </div>

                                                  {/* Contenido */}
                                                  <div className="flex-1 overflow-auto px-6 py-6">
                                                    <div className="space-y-4">
                                                      {/* Tipo de Documento */}
                                                      <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                          Tipo de Documento <span className="text-red-500">*</span>
                                                        </label>
                                                        <select
                                                          value={tipoDocumento}
                                                          onChange={(e) => setTipoDocumento(e.target.value)}
                                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                        >
                                                          <option value="">Seleccionar tipo...</option>
                                                          <option value="plan">Plan de Mejoramiento</option>
                                                          <option value="evidencia">Evidencia</option>
                                                          <option value="informe">Informe de Seguimiento</option>
                                                          <option value="acta">Acta</option>
                                                          <option value="certificado">Certificado</option>
                                                          <option value="otro">Otro</option>
                                                        </select>
                                                      </div>

                                                      {/* Zona de carga */}
                                                      <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                          Seleccionar Archivos <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1e5da8] transition-colors">
                                                          <input
                                                            type="file"
                                                            multiple
                                                            onChange={handleFileChange}
                                                            className="hidden"
                                                            id="file-upload-plan"
                                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                                          />
                                                          <label
                                                            htmlFor="file-upload-plan"
                                                            className="cursor-pointer flex flex-col items-center"
                                                          >
                                                            <Upload className="w-12 h-12 text-gray-400 mb-2" />
                                                            <span className="text-sm text-gray-700 font-medium">
                                                              Haz clic para seleccionar archivos
                                                            </span>
                                                            <span className="text-xs text-gray-500 mt-1">
                                                              PDF, Word, Excel, Imágenes (máx. 10MB por archivo)
                                                            </span>
                                                          </label>
                                                        </div>
                                                      </div>

                                                      {/* Lista de archivos seleccionados */}
                                                      {archivosSeleccionados.length > 0 && (
                                                        <div>
                                                          <div className="text-sm font-medium text-gray-700 mb-2">
                                                            Archivos Seleccionados ({archivosSeleccionados.length})
                                                          </div>
                                                          <div className="space-y-2">
                                                            {archivosSeleccionados.map((archivo, index) => (
                                                              <div
                                                                key={index}
                                                                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                                                              >
                                                                <div className="flex items-center gap-3 flex-1">
                                                                  <FileText className="w-4 h-4 text-gray-600" />
                                                                  <div className="flex-1 min-w-0">
                                                                    <div className="text-sm text-gray-900 truncate">
                                                                      {archivo.name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-600">
                                                                      {formatFileSize(archivo.size)}
                                                                    </div>
                                                                  </div>
                                                                </div>
                                                                <button
                                                                  onClick={() => handleEliminarArchivo(index)}
                                                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                >
                                                                  <Trash2 className="w-4 h-4" />
                                                                </button>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        </div>
                                                      )}

                                                      {/* Descripción */}
                                                      <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                          Descripción
                                                        </label>
                                                        <textarea
                                                          value={descripcion}
                                                          onChange={(e) => setDescripcion(e.target.value)}
                                                          rows={3}
                                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                                                          placeholder="Descripción del documento (opcional)"
                                                        />
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Footer */}
                                                  <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
                                                    <div className="flex justify-end gap-3">
                                                      <button
                                                        onClick={onClose}
                                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                                      >
                                                        Cancelar
                                                      </button>
                                                      <button
                                                        onClick={handleCargar}
                                                        className="px-4 py-2 bg-[#1e5da8] hover:bg-[#174a8a] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
                                                      >
                                                        <Upload className="w-4 h-4" />
                                                        Cargar {archivosSeleccionados.length > 0 ? `${archivosSeleccionados.length} Documento(s)` : 'Documentos'}
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }

                                          // ════════════════════════════════════════════════════════════════════════════
                                          // MODAL: VISTA PREVIA DOCUMENTO
                                          // ════════════════════════════════════════════════════════════════════════════

                                          interface ModalVistaPreviaDocumentoProps {
                                            documento: DocumentoPlan;
                                            onClose: () => void;
                                          }

                                          function ModalVistaPreviaDocumento({ documento, onClose }: ModalVistaPreviaDocumentoProps) {
                                            const handleDescargar = () => {
                                              toast.success('Descargando Documento', {
                                                description: `${documento.nombre} se está descargando...`,
                                                duration: 3000,
                                              });

                                              console.log('📥 Descargar documento desde vista previa:', {
                                                documentoId: documento.id,
                                                nombre: documento.nombre,
                                                timestamp: new Date().toISOString()
                                              });
                                            };

                                            return (
                                              <div className="fixed inset-0 z-[10002] overflow-hidden flex items-center justify-center p-4">
                                                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
                                                
                                                <div className="relative w-full max-w-5xl max-h-[95vh] bg-white rounded-xl shadow-2xl flex flex-col">
                                                  {/* Header */}
                                                  <div className="flex-shrink-0 bg-[#1e5da8] text-white px-6 py-4 rounded-t-xl">
                                                    <div className="flex items-start justify-between">
                                                      <div className="flex-1 min-w-0">
                                                        <h3 className="text-xl font-medium mb-1 truncate">{documento.nombre}</h3>
                                                        <div className="flex items-center gap-4 text-sm text-blue-100">
                                                          <span>{documento.tipo}</span>
                                                          <span>•</span>
                                                          <span>{documento.tamanio}</span>
                                                          <span>•</span>
                                                          <span>{documento.fechaCarga}</span>
                                                          <span>•</span>
                                                          <span>{documento.autor}</span>
                                                        </div>
                                                      </div>
                                                      <div className="flex items-center gap-2 ml-4">
                                                        <button
                                                          onClick={handleDescargar}
                                                          className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                                                          title="Descargar"
                                                        >
                                                          <Download className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                          onClick={onClose}
                                                          className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                                                        >
                                                          <X className="w-5 h-5" />
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Contenido - Vista Previa */}
                                                  <div className="flex-1 overflow-auto bg-gray-100 p-6">
                                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 min-h-full flex items-center justify-center">
                                                      <div className="text-center">
                                                        <FileText className="w-24 h-24 text-gray-400 mx-auto mb-4" />
                                                        <h4 className="text-lg font-medium text-gray-900 mb-2">Vista Previa del Documento</h4>
                                                        <p className="text-sm text-gray-600 mb-6 max-w-md">
                                                          La vista previa de documentos estará disponible próximamente. Por ahora puedes descargar el archivo para visualizarlo.
                                                        </p>
                                                        <button
                                                          onClick={handleDescargar}
                                                          className="px-6 py-3 bg-[#1e5da8] hover:bg-[#174a8a] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
                                                        >
                                                          <Download className="w-5 h-5" />
                                                          Descargar Documento
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Footer */}
                                                  <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
                                                    <div className="flex justify-between items-center text-sm text-gray-600">
                                                      <div>
                                                        Documento cargado el {documento.fechaCarga} por {documento.autor}
                                                      </div>
                                                      <button
                                                        onClick={onClose}
                                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                                      >
                                                        Cerrar
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }
