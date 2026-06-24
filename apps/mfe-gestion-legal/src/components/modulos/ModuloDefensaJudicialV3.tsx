/**
 * ModuloDefensaJudicialV3 - MOD-01: Defensa Judicial
 * VERSIÓN WORLD-CLASS - COPIADO EXACTO DE CONTROL DISCIPLINARIO
 * ✅ Responsive mobile-first FUNCIONAL
 * ✅ Colores corporativos ESAP (#003DA5)
 * ✅ Diseño mandatorio 100% igual a Control Disciplinario
 * ✅ CONECTADO CON CONFIGURACIONES CENTRALIZADAS
 */

import { useState, useEffect, useRef } from 'react';
import {
  Plus, FileText, FolderOpen, AlertTriangle, Clock, Calendar,
  User, MoreVertical, Eye, ChevronDown, Users, Settings,
  Maximize2, Minimize2, AlertCircle, CheckCircle,
  List, Columns3, ChevronsDown, ChevronsUp,
  Scale, DollarSign, Filter, Search,
  ExternalLink, Download, Upload, RefreshCw, Paperclip,
  MessageSquare, FileCheck, Send, Archive, Mail, Edit, Trash2, Gavel, Loader2
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import { toast } from 'sonner';

import { legalService } from '../../../../services/api/legal.service';
import type { ExpedienteJudicial, EtapaDefensaJudicial } from '../core/types';
import { ModalNuevaDemanda, NuevaDemandaData } from './ModalNuevaDemanda';
import { generarReporteExpedientesPDF } from './generarReporteExpedientes';
import { ModalFiltrosReporte } from './ModalFiltrosReporte';
import { ModalExpediente } from './ModalExpediente';
import { ModalAutos } from './ModalAutos';
import { ModalEvidencias } from './ModalEvidencias';
import { ModalOficios } from './ModalOficios';
import { ModalActas } from './ModalActas';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { IndicadorDiasHabiles, BannerDiasHabiles } from '../design-system/BadgeDiasHabiles';
import { VistaListaDefensaJudicial } from './VistaListaDefensaJudicial';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';

// ✅ Importar configuraciones centralizadas
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';
import { calcularProgreso } from '../core/expedienteShared';
import { VistaArchivados, ItemArchivado, EstadoArchivado } from '../design-system/VistaArchivados';
import { usePermisos, PERMISOS } from '../config/PermisosContext';
import { useResponsive } from '@esap-mfe/shared-hooks/useResponsive';
import {
  ESAP_TOKENS,
  KanbanCard,
  KanbanCardHeader,
  KanbanCardInfoSection,
  KanbanCardInfoRow,
  KanbanCardProfesional,
  KanbanCardMetrics,
  KanbanActionSection,
  KanbanActionRowPrimary,
  KanbanActionRowTertiary,
  KanbanButtonPrimary,
  KanbanButtonSecondary,
  KanbanButtonDestructive,
} from '../../design-system/KanbanDesignStandard';

type VistaModulo = 'kanban' | 'lista' | 'archivados';

// Tipo para drag and drop
const ItemTypes = {
  EXPEDIENTE: 'expediente'
};

const normalizeString = (str: string) => {
  return str
    ?.toLowerCase()
    ?.normalize('NFD')
    ?.replace(/[\u0300-\u036f]/g, '')
    ?.trim() || '';
};

const getBoardCookie = (): string => {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; esap_defensa_judicial_tablero_seleccionado=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
};

const setBoardCookie = (val: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `esap_defensa_judicial_tablero_seleccionado=${val}; path=/; max-age=31536000; SameSite=Lax`;
};

export function ModuloDefensaJudicialV3() {
  // ✅ Obtener configuraciones desde el Context API
  const { estadosActivos, tiposProcesosActivos: allTiposProcesos } = useConfiguracionModulo('defensa-judicial');

  // Filtrar los tipos de procesos activos según los roles del usuario (o si no tiene rol asociado)
  const tiposProcesosActivos = (allTiposProcesos || []).filter((tp: any) => {
    if (!tp.rolAsociado) return true;
    return authService.hasRole(tp.rolAsociado) || authService.isSuperAdmin();
  });

  // Selector de tablero (por tipo de proceso)
  const [tableroSeleccionado, setTableroSeleccionado] = useState<string>(() => {
    return getBoardCookie() || localStorage.getItem('esap_defensa_judicial_tablero_seleccionado') || '';
  });

  const handleCambiarTablero = (val: string) => {
    setTableroSeleccionado(val);
    setBoardCookie(val);
    localStorage.setItem('esap_defensa_judicial_tablero_seleccionado', val);
  };

  // Sincronizar tableroSeleccionado con el primer tipo de proceso activo al cargar
  useEffect(() => {
    if (tiposProcesosActivos.length > 0) {
      const persistedBoard = getBoardCookie() || localStorage.getItem('esap_defensa_judicial_tablero_seleccionado') || tableroSeleccionado;
      const isValid = tiposProcesosActivos.some((tp: any) => tp.id === persistedBoard);
      
      if (isValid) {
        if (tableroSeleccionado !== persistedBoard) {
          setTableroSeleccionado(persistedBoard);
        }
        setBoardCookie(persistedBoard);
        localStorage.setItem('esap_defensa_judicial_tablero_seleccionado', persistedBoard);
      } else {
        const defaultId = tiposProcesosActivos[0].id;
        setTableroSeleccionado(defaultId);
        setBoardCookie(defaultId);
        localStorage.setItem('esap_defensa_judicial_tablero_seleccionado', defaultId);
      }
    }
  }, [tiposProcesosActivos, tableroSeleccionado]);

  const procesoSeleccionado = (allTiposProcesos || []).find((tp: any) => tp.id === tableroSeleccionado);
  const columnasTablero = (procesoSeleccionado?.estados && procesoSeleccionado.estados.length > 0)
    ? procesoSeleccionado.estados.filter((e: any) => e.activo).sort((a: any, b: any) => a.orden - b.orden)
    : estadosActivos;

  // ✅ Obtener permisos del usuario actual
  const { usuario } = usePermisos();

  // ✅ Estado para cambiar entre vista normal y archivados
  const [vistaActual, setVistaActual] = useState<'activos' | 'archivados'>('activos');

  const { isMobile, isTablet, isLg, isXl, width: screenWidth } = useResponsive();
  const isSmallDesktop = isLg || (isXl && screenWidth < 1440);
  const [tipoVista, setTipoVista] = useState<VistaModulo>('kanban');
  const [columnasColapsadas, setColumnasColapsadas] = useState<Record<string, boolean>>({});
  const [modalNuevaDemandaOpen, setModalNuevaDemandaOpen] = useState(false);
  const [modalFiltrosReporteOpen, setModalFiltrosReporteOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODAS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroAbogado, setFiltroAbogado] = useState<string>('TODOS');
  const [filtroFecha, setFiltroFecha] = useState<string>('');
  const [abogadosList, setAbogadosList] = useState<{ id: string; nombre: string }[]>([]);
  const [usuariosList, setUsuariosList] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado local para manejar drag and drop
  const [expedientes, setExpedientes] = useState<ExpedienteJudicial[]>([]);

  // ✅ Estado para expediente abierto desde notificación (evento legal:open-expediente-detail)
  const [expedienteDesdeNotificacion, setExpedienteDesdeNotificacion] = useState<ExpedienteJudicial | null>(null);

  // ✅ Estado para items archivados/eliminados (cargados desde backend)
  const [itemsArchivados, setItemsArchivados] = useState<ItemArchivado[]>([]);

  // ✅ Función para cargar expedientes archivados desde el backend
  const loadArchivados = async () => {
    try {
      const data = await legalService.getExpedientesArchivados();
      const mapped: ItemArchivado[] = data.map((exp: any) => ({
        id: exp.id,
        codigo: exp.radicado || exp.id,
        nombre: `${exp.tipoProceso || 'Proceso'} - ${exp.demandante || 'No especificado'}`,
        tipo: 'Proceso Judicial',
        estado: exp.estadoArchivo as EstadoArchivado,
        fechaArchivado: new Date(exp.fechaArchivo || new Date()),
        usuarioArchivo: exp.usuarioArchivo || 'Sistema',
        motivoArchivo: exp.motivoArchivo || 'Sin motivo especificado',
        metadatos: {
          'Tipo Proceso': exp.tipoProceso || 'No especificado',
          'Juzgado': exp.juzgadoConocimiento || 'No asignado',
          'Cuantía': exp.cuantia ? `$${exp.cuantia.toLocaleString()}` : 'No especificada',
          'Etapa': exp.etapaProcesal || exp.etapa || 'No especificada'
        }
      }));
      setItemsArchivados(mapped);
    } catch (error) {
      console.error('Error cargando archivados:', error);
      setItemsArchivados([]);
    }
  };

  // ✅ Función para restaurar un expediente archivado
  const handleRestaurar = async (itemId: string) => {
    try {
      await legalService.restaurarExpediente(itemId);
      toast.success('✅ Expediente restaurado al Kanban');
      // Remover de la lista de archivados
      setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
      // Recargar expedientes activos
      loadExpedientes();
    } catch (error) {
      console.error('Error restaurando:', error);
      toast.error('❌ Error al restaurar el expediente');
    }
  };

  // ✅ Función para eliminar permanentemente un expediente
  const handleEliminarPermanente = async (itemId: string) => {
    try {
      await legalService.eliminarPermanenteExpediente(itemId);
      toast.success('🗑️ Expediente eliminado permanentemente');
      // Remover de la lista de archivados
      setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error eliminando:', error);
      toast.error('❌ Error al eliminar el expediente');
    }
  };

  // ✅ Cargar datos reales al montar el componente (sin mocks hardcodeados)
  useEffect(() => {
    loadExpedientes();
    loadArchivados(); // También cargar archivados
  }, []); // Se ejecuta solo al montar, rompiendo el ciclo infinito de estadosActivos

  // ✅ Recargar archivados cuando se cambia a esa vista
  useEffect(() => {
    if (tipoVista === 'archivados') {
      loadArchivados();
    }
  }, [tipoVista]);

  // ✅ Listener: Abrir expediente desde notificación (evento legal:open-expediente-detail)
  // GestionLegalFull cambia la vista activa y luego dispara este evento con {radicado, procesoId}.
  // Buscamos por radicado en la lista local; si no está, cargamos todos y filtramos.
  useEffect(() => {
    const abrirPorRadicado = async (radicado: string) => {
      // 1. Buscar en expedientes ya en memoria (por radicado, uuid o id)
      let exp = expedientes.find(
        e => (e as any).radicado === radicado || e.id === radicado || (e as any).uuid === radicado
      );

      if (!exp) {
        // 2. Cargar lista completa y buscar por radicado
        try {
          toast.loading(`Buscando expediente ${radicado}...`, { id: 'load-notif-exp' });
          const todos = await legalService.getExpedientes();
          const encontrado = todos.find(
            (e: any) => e.radicado === radicado || e.id === radicado || e.uuid === radicado
          );
          toast.dismiss('load-notif-exp');
          if (encontrado) {
            exp = encontrado as any;
          } else {
            toast.error(`No se encontró el expediente ${radicado}`);
            return;
          }
        } catch {
          toast.dismiss('load-notif-exp');
          toast.error(`Error cargando expediente ${radicado}`);
          return;
        }
      }

      setExpedienteDesdeNotificacion(exp);
    };

    const handleOpenFromNotification = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (detail.modulo && detail.modulo !== 'defensa-judicial') return; // Solo para este módulo
      const radicado = detail.radicado;
      if (!radicado) return;
      abrirPorRadicado(radicado);
    };

    window.addEventListener('legal:open-expediente-detail', handleOpenFromNotification);

    // Respaldo: procesar intención pendiente al montar (llega antes que el listener)
    const pending = sessionStorage.getItem('legal:pendingOpenExpediente');
    if (pending) {
      try {
        const detail = JSON.parse(pending);
        if (detail.modulo === 'defensa-judicial' && detail.radicado) {
          sessionStorage.removeItem('legal:pendingOpenExpediente');
          abrirPorRadicado(detail.radicado);
        }
      } catch { /* ignore */ }
    }

    return () => window.removeEventListener('legal:open-expediente-detail', handleOpenFromNotification);
  }, [expedientes]);

  // Cargar expedientes desde el backend
  const loadExpedientes = async () => {
    try {
      setLoading(true);

      // Cargar expedientes, abogados y usuarios en paralelo. Antes los usuarios se cargaban
      // secuencialmente DESPUÉS del Promise.all, sumando su latencia al tiempo total del kanban.
      // El .catch en usuarios evita que un fallo en esa carga bloquee la lista de expedientes.
      const [data, abogadosData, todosLosUsuarios] = await Promise.all([
        legalService.getExpedientes(),
        legalService.getAbogadosDashboard(),
        authService.getTodosLosUsuariosActivos().catch(() => []),
      ]);

      // Crear mapa de abogados para búsqueda rápida y poblar lista para filtro
      const abogadosMap = new Map();
      if (Array.isArray(abogadosData)) {
        const lista: { id: string; nombre: string }[] = [];
        abogadosData.forEach((a: any) => {
          const nombre = a.nombreCompleto || `${a.nombre || ''} ${a.apellido || ''}`.trim();
          if (a.id) {
            abogadosMap.set(a.id, nombre);
            lista.push({ id: a.id, nombre });
          }
        });
        setAbogadosList(lista);
      }

      if (Array.isArray(todosLosUsuarios)) {
        const listado: { id: string; nombre: string }[] = todosLosUsuarios.map((u: any) => ({
          id: String(u.id),
          nombre: u.nombre
        }));
        setUsuariosList(listado);
      }

      // Mapear datos del backend al tipo ExpedienteJudicial del frontend
      console.log('📦 [DEBUG] Expedientes from API:', data?.length, data);
      const mapped: ExpedienteJudicial[] = data.map((exp: any) => {
        // Encontrar la última actuación real
        let latestActuacionVal = null;
        if (exp.actuaciones && exp.actuaciones.length > 0) {
          // Ordenar por fecha descendente por si acaso
          const sortedActs = [...exp.actuaciones].sort((a, b) =>
            new Date(b.fechaActuacion).getTime() - new Date(a.fechaActuacion).getTime()
          );
          const last = sortedActs[0];
          latestActuacionVal = {
            fecha: last.fechaActuacion,
            tipo: last.tipoActuacion,
            descripcion: last.descripcion,
            responsable: last.usuarioResponsable || 'Sistema',
            estado: 'REALIZADO'
          };
        }

        return {
          uuid: exp.id, // Guardar UUID real para operaciones de API
          id: exp.radicado || exp.numeroRadicado || exp.id, // Preferir radicado como ID visible
          radicado: exp.radicado || exp.numeroRadicado || exp.id,
          tipo: exp.tipoProceso || 'declarativo', // Propiedad requerida por interface antigua
          tipoAccion: exp.tipoProceso || 'SIN CLASIFICAR', // Propiedad nueva
          etapa: (() => {
            // Backend default es 'RADICACION', mapear a primera etapa visual 'NOTIFICADA'
            if (exp.etapaProcesal === 'RADICACION') return 'NOTIFICADA';
            return (exp.etapaProcesal as EtapaDefensaJudicial) || 'NOTIFICADA';
          })(),
          prioridad: 'MEDIA',
          demandante: exp.actors && exp.actors.some((a: any) => a.rol === 'DEMANDANTE')
            ? exp.actors.find((a: any) => a.rol === 'DEMANDANTE').nombre
            : (exp.demandante || 'No registrado'),
          jurisdiccion: 'Contencioso Administrativo', // Valor por defecto
          apoderado: exp.demandanteApoderado || '', // Valor por defecto
          fechaNotificacion: exp.fechaNotificacion instanceof Date ? exp.fechaNotificacion.toLocaleDateString('es-CO') : exp.fechaNotificacion,
          fechaVencimiento: exp.fechaVencimiento || new Date().toISOString(),
          juzgado: exp.juzgadoConocimiento || 'Sin asignar',
          juzgadoConocimiento: exp.juzgadoConocimiento,
          ubicacionFisica: exp.ubicacionFisica,
          cuantia: exp.cuantia || 0,
          nivelRiesgo: exp.nivelRiesgo,
          provisionContable: exp.provisionContable,
          fechaEstimacionProvision: exp.fechaEstimacionProvision,
          observacionProvision: exp.observacionProvision,
          demandantes: exp.actors ? exp.actors.filter((a: any) => a.rol === 'DEMANDANTE') : [],
          demandados: exp.actors ? exp.actors.filter((a: any) => a.rol === 'DEMANDADO') : [],
          otrosActores: exp.actors ? exp.actors.filter((a: any) => a.rol !== 'DEMANDANTE' && a.rol !== 'DEMANDADO') : [],
          medioControl: exp.medioControl || 'Nulidad y Restablecimiento del Derecho',
          diasTotales: (() => {
            const inicio = new Date(exp.fechaNotificacion || Date.now());
            const fin = new Date(exp.fechaVencimientoTermino || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
            if (exp.tipoConteoTermino === 'HORAS') {
              return exp.terminoProcesalDias || Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60));
            }
            if (exp.tipoConteoTermino === 'Dias Calendario' || exp.tipoConteoTermino === 'CALENDARIO') {
              return calcularDiasTotales(inicio, fin);
            }
            // Dias hábiles
            let dias = 0;
            const temp = new Date(inicio);
            temp.setHours(0, 0, 0, 0);
            const finStr = new Date(fin);
            finStr.setHours(0, 0, 0, 0);
            while (temp <= finStr) {
              const dia = temp.getDay();
              if (dia !== 0 && dia !== 6) dias++;
              temp.setDate(temp.getDate() + 1);
            }
            return dias;
          })(),
          diasRestantes: (() => {
            const hoy = new Date();
            const venc = new Date(exp.fechaVencimientoTermino || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
            if (exp.tipoConteoTermino === 'HORAS') {
              const diffMs = venc.getTime() - hoy.getTime();
              return Math.ceil(diffMs / (1000 * 60 * 60)); // Devuelve horas restantes
            }
            if (exp.tipoConteoTermino === 'Dias Calendario' || exp.tipoConteoTermino === 'CALENDARIO') {
              return calcularDiasRestantes(venc);
            }
            // Dias hábiles
            if (venc >= hoy) {
              let dias = 0;
              const temp = new Date(hoy);
              temp.setHours(0, 0, 0, 0);
              const vencStr = new Date(venc);
              vencStr.setHours(0, 0, 0, 0);
              while (temp <= vencStr) {
                const dia = temp.getDay();
                if (dia !== 0 && dia !== 6) dias++;
                temp.setDate(temp.getDate() + 1);
              }
              return Math.max(0, dias - 1); // Restamos hoy si es que falta mucho, pero asumiendo la logica es contar hacia adelante. Realmente la diferencia. Mejor dejamos dias o dias - 1 si el inicio coincide
            } else {
              let dias = 0;
              const temp = new Date(venc);
              temp.setHours(0, 0, 0, 0);
              const hoyStr = new Date(hoy);
              hoyStr.setHours(0, 0, 0, 0);
              while (temp <= hoyStr) {
                const dia = temp.getDay();
                if (dia !== 0 && dia !== 6) dias++;
                temp.setDate(temp.getDate() + 1);
              }
              return -dias;
            }
          })(),
          tiempoRestante: (() => {
            // Optional property just in case it's used
            const venc = new Date(exp.fechaVencimientoTermino || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
            if (exp.tipoConteoTermino === 'HORAS') {
              const diffMs = venc.getTime() - new Date().getTime();
              const hours = Math.ceil(diffMs / (1000 * 60 * 60));
              return hours < 0 ? `Vencido` : `${hours} horas`;
            }
            return calcularDiasRestantes(venc) < 0 ? `Vencido` : `${calcularDiasRestantes(venc)} días`;
          })(),
          // Para abogado, buscar el nombre en el mapa o usar valor directo si no es UUID
          abogadoAsignado: (() => {
            // 1. Intentar buscar en el mapa por ID (prioridad)
            if (exp.abogadoSustanciador && abogadosMap.has(exp.abogadoSustanciador)) {
              return abogadosMap.get(exp.abogadoSustanciador);
            }
            // 2. Si viene el objeto abogado
            if (exp.abogado?.nombreCompleto) return exp.abogado.nombreCompleto;

            // 3. Fallback a string si no parece UUID
            if (typeof exp.abogadoSustanciador === 'string' && exp.abogadoSustanciador.trim() !== '' && exp.abogadoSustanciador.length < 30 && !exp.abogadoSustanciador.includes('-')) {
              return exp.abogadoSustanciador;
            }

            return 'Sin asignar';
          })(),
          abogadoSustanciador: exp.abogadoSustanciador, // UUID del abogado para comparación de identidad
          hechos: '',
          pretensiones: exp.pretensionDemandante || '',
          pretensionDemandante: exp.pretensionDemandante,
          tipoProceso: exp.tipoProceso,
          camposAdicionales: exp.camposAdicionales,
          documentos: new Array(Number(exp.documentosCount || 0) + (exp.documentosInicialesUrls?.length || 0)).fill({}),
          actuaciones: exp.actuaciones || [],
          procesosAnexados: exp.procesosAnexados || [],
          procesoPrincipalId: exp.procesoPrincipalId,
          timeline: [],
          fechaCreacion: new Date(exp.createdAt),
          fechaActualizacion: new Date(exp.updatedAt),
          estado: exp.estado || 'ACTIVO',
          ultimaActuacion: latestActuacionVal || {
            descripcion: `Expediente en etapa de ${exp.etapaProcesal || 'NOTIFICADA'}`,
            fecha: exp.updatedAt,
            tipo: 'ACTUALIZACIÓN',
            responsable: 'Sistema',
            estado: 'REALIZADO'
          },
          demandadoDireccion: exp.demandadoDireccion,
          demandadoTelefono: exp.demandadoTelefono,
          demandadoEmail: exp.demandadoEmail,
          // Clasificación Penal
          esDelitoAdminPublica: exp.esDelitoAdminPublica || false,
          esConductaPatrimonioPublico: exp.esConductaPatrimonioPublico || false,
          // Territorial y Dependencia
          territorial: exp.territorial || exp.camposAdicionales?.territorial,
          dependencia: exp.dependencia || exp.camposAdicionales?.dependencia,
          territorialNombre: exp.territorialNombre || exp.camposAdicionales?.territorialNombre,
          dependenciaNombre: exp.dependenciaNombre || exp.camposAdicionales?.dependenciaNombre,
        }
      });
      // El backend ya filtra por abogadoSustanciador cuando el usuario tiene rol RESUELVE_GESTION_LEGAL
      // (ver ExpedienteController.listar → esResuelveSolo → abogadoSustanciadorKeys).
      // No aplicar filtro adicional en el frontend para evitar falsos negativos por discrepancia de IDs.
      const expedientesFiltrados = mapped;

      setExpedientes(expedientesFiltrados);
      console.log('🗂️ [DEBUG] Mapped expedientes:', expedientesFiltrados.map(e => ({ id: e.id, etapa: e.etapa, radicado: e.radicado })));
      console.log('📊 [DEBUG] estadosActivos:', estadosActivos.map((e: any) => e.id));
    } catch (error) {
      console.error('Error cargando expedientes:', error);
      toast.error('Error al cargar expedientes');
    } finally {
      setLoading(false);
    }
  };

  const handleMoverExpediente = async (expedienteId: string, nuevaEtapa: string) => {
    if (!nuevaEtapa) {
      console.error('❌ Intento de mover expediente a etapa indefinida');
      return;
    }

    // Encuentra el expediente real usando el ID (puede ser el visible o el UUID)
    const expediente = expedientes.find(e => e.id === expedienteId);
    if (!expediente) return;

    // Si la etapa es la misma, no hacer nada
    if (expediente.etapa === nuevaEtapa) return;

    // Obtener la configuración de la etapa actual
    const etapaActualNorm = normalizeString(expediente.etapa || '');
    const colActual = columnasTablero.find((col: any) => 
      normalizeString(col.id) === etapaActualNorm || 
      normalizeString(col.nombre) === etapaActualNorm
    );
    const requiereAprobacion = colActual && colActual.aprobacionTipo && colActual.aprobacionTipo !== 'ninguno';

    // Bloquear arrastre hacia atrás si la etapa requiere aprobación (debe ser por modal con observaciones)
    const currentIndex = columnasTablero.findIndex((col: any) => 
      normalizeString(col.id) === etapaActualNorm || 
      normalizeString(col.nombre) === etapaActualNorm
    );
    const destStageNorm = normalizeString(nuevaEtapa);
    const destIndex = columnasTablero.findIndex((col: any) => 
      normalizeString(col.id) === destStageNorm || 
      normalizeString(col.nombre) === destStageNorm
    );

    if (currentIndex !== -1 && destIndex !== -1 && destIndex < currentIndex && requiereAprobacion) {
      toast.error('Movimiento no permitido', {
        description: 'Para devolver el expediente a la etapa anterior, por favor abra el expediente y utilice el botón "Devolver Etapa" para registrar las observaciones obligatorias.',
        duration: 7000
      });
      return;
    }

    if (requiereAprobacion) {
      // Validar que todas las actuaciones tengan los documentos firmados antes de cambiar etapa
      try {
        const idToCheck = expediente.uuid || expediente.id;
        const [actuacionesList, documentosList] = await Promise.all([
          legalService.getActuaciones(idToCheck),
          legalService.getDocumentos(idToCheck)
        ]);

        const isDocSigned = (d: any) => {
          if (!d) return false;
          if (d.descripcion) {
            try {
              const data = JSON.parse(d.descripcion);
              return !!(data && data.firmado);
            } catch (e) {
              return false;
            }
          }
          return false;
        };

        const checkActuacionDocsSigned = (act: any) => {
          const associatedDocIds = act.metadata?.documentosAsociados || [];
          if (associatedDocIds.length === 0) return true;
          
          const resolvedDocs = documentosList.filter((doc: any) => {
            const docIdStr = String(doc.id);
            return associatedDocIds.some((id: any) => String(id) === docIdStr);
          });
          
          return resolvedDocs.every((doc: any) => isDocSigned(doc));
        };

        const actuacionesConDocsSinFirmar = actuacionesList.filter((a: any) => {
          return !checkActuacionDocsSigned(a);
        });

        if (actuacionesConDocsSinFirmar.length > 0) {
          toast.error('No se puede cambiar de etapa. Existen actuaciones con documentos sin firmar.', {
            description: `Las siguientes actuaciones tienen documentos pendientes de firma: ${actuacionesConDocsSinFirmar.map((a: any) => a.descripcion).join(', ')}`
          });
          return;
        }
      } catch (error) {
        console.warn('No se pudieron verificar las firmas de los documentos de las actuaciones:', error);
      }

      // Validar reglas de aprobación de la etapa ACTUAL (para poder continuar/salir de ella)
      if (colActual) {
        const { aprobacionTipo, aprobacionRol, aprobacionUsuario } = colActual;
        if (aprobacionTipo === 'rol' && aprobacionRol) {
          const hasRol = authService.hasRole(aprobacionRol) || authService.isSuperAdmin();
          if (!hasRol) {
            toast.error('Movimiento bloqueado por regla de aprobación', {
              description: `Se requiere el rol "${aprobacionRol}" para aprobar la etapa "${colActual.nombre}" y continuar.`
            });
            return;
          }
        } else if (aprobacionTipo === 'usuario' && aprobacionUsuario) {
          const currentUser = authService.getCurrentUser();
          const currentUserId = currentUser?.id || currentUser?.id_user || (currentUser as any)?.uuid;
          const isAuthorizedUser = currentUserId === aprobacionUsuario || authService.isSuperAdmin();
          if (!isAuthorizedUser) {
            const userReq = usuariosList.find((u) => String(u.id) === String(aprobacionUsuario)) || 
                            abogadosList.find((a) => String(a.id) === String(aprobacionUsuario));
            const nameDisplay = userReq ? userReq.nombre : 'un abogado específico';
            toast.error('Movimiento bloqueado por regla de aprobación', {
              description: `Solo el usuario asignado/autorizado "${nameDisplay}" puede aprobar la etapa "${colActual.nombre}".`
            });
            return;
          }
        }
      }
    }

    // Validar tareas pendientes antes de cambiar etapa
    try {
      const idToCheck = expediente.uuid || expediente.id;
      const tareas = await legalService.getTareasByExpediente(idToCheck);
      const tareasPendientes = (tareas || []).filter(
        (t: any) => t.estado !== 'completada' && t.estado !== 'cancelada'
      );
      if (tareasPendientes.length > 0) {
        toast.error('No se puede cambiar de etapa', {
          description: `El expediente tiene ${tareasPendientes.length} tarea(s) pendiente(s). Complete o cancele todas las tareas antes de cambiar de etapa.`
        });
        return;
      }
    } catch (error) {
      // Si falla la consulta de tareas, permitir el cambio (fallo silencioso)
      console.warn('No se pudieron verificar tareas:', error);
    }

    // Validar si la nueva etapa requiere aprobación
    const colDestino = destIndex !== -1 ? columnasTablero[destIndex] : null;
    const destinoRequiereAprobacion = !!(colDestino && colDestino.aprobacionTipo && colDestino.aprobacionTipo !== 'ninguno');

    if (destinoRequiereAprobacion) {
      try {
        const idToCheck = expediente.uuid || expediente.id;
        const actuacionesList = await legalService.getActuaciones(idToCheck);
        const tieneActuacionProcesal = (actuacionesList || []).some(
          (a: any) => a.tipoActuacion !== 'NOTA_INTERNA' && a.tipoActuacion !== 'NOTA'
        );
        if (!tieneActuacionProcesal) {
          toast.error('No se puede enviar a aprobación', {
            description: 'Debe registrar al menos una actuación procesal antes de enviar a aprobación.',
            duration: 5000
          });
          return;
        }
      } catch (error) {
        console.warn('No se pudieron verificar las actuaciones para aprobación:', error);
      }
    }

    // Optimistic Update
    const previousExpedientes = [...expedientes];
    setExpedientes((prevExpedientes) =>
      prevExpedientes.map((exp) =>
        exp.id === expedienteId
          ? { ...exp, etapa: nuevaEtapa as any } // Cast as any because ExpedienteJudicial might still have rigid type
          : exp
      )
    );

    try {
      // Usar uuid si existe, sino id
      const idToUpdate = expediente.uuid || expediente.id;
      await legalService.updateExpediente(idToUpdate, {
        etapaProcesal: nuevaEtapa
      });

      toast.success('Expediente movido exitosamente', {
        description: `Cambiado a etapa: ${nuevaEtapa}`
      });
    } catch (error) {
      console.error('Error al actualizar etapa:', error);
      toast.error('Error al mover expediente', {
        description: 'Se han revertido los cambios'
      });
      setExpedientes(previousExpedientes);
    }
  };

  // Calcular días totales entre dos fechas
  const calcularDiasTotales = (fechaInicio: Date, fechaFin: Date): number => {
    const diff = fechaFin.getTime() - fechaInicio.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Calcular días restantes hasta vencimiento (retorna negativo si ya pasó)
  const calcularDiasRestantes = (fechaVencimiento: Date): number => {
    const hoy = new Date();
    const diff = fechaVencimiento.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    loadExpedientes();
  }, []);

  // ✅ Primero aplicar filtros globales (búsqueda, tipo de proceso)
  const expedientesFiltrados = expedientes.filter(exp => {
    // Filtro por Tablero Seleccionado (tipo de proceso de la vista actual)
    const normalize = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_\s]+/g, '-').trim();
    const boardNorm = normalize(tableroSeleccionado);
    const boardNombreNorm = procesoSeleccionado ? normalize(procesoSeleccionado.nombre) : '';

    const matchesBoard = !tableroSeleccionado ||
      exp.tipo === tableroSeleccionado ||
      exp.tipoAccion === tableroSeleccionado ||
      (exp as any).tipoProceso === tableroSeleccionado ||
      normalize(exp.tipo) === boardNorm ||
      normalize(exp.tipoAccion) === boardNorm ||
      normalize((exp as any).tipoProceso) === boardNorm ||
      (boardNombreNorm && (
        normalize(exp.tipo) === boardNombreNorm ||
        normalize(exp.tipoAccion) === boardNombreNorm ||
        normalize((exp as any).tipoProceso) === boardNombreNorm
      ));

    if (!matchesBoard) return false;

    // Filtro de Seguridad por Rol de Proceso
    const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_\s]+/g, '-').trim();
    const tipoProcesoObj = (allTiposProcesos || []).find((t: any) => {
      const normName = norm(t.nombre || t.name);
      return norm(t.id) === norm(exp.tipo) ||
             norm(t.id) === norm((exp as any).tipoProceso) ||
             normName === norm(exp.tipo) ||
             normName === norm((exp as any).tipoProceso);
    });

    if (tipoProcesoObj && tipoProcesoObj.rolAsociado) {
      const hasAssociatedRole = authService.hasRole(tipoProcesoObj.rolAsociado);
      const isSuperAdmin = authService.isSuperAdmin();
      if (!hasAssociatedRole && !isSuperAdmin) {
        return false;
      }
    }

    // Filtro por búsqueda
    const q = busqueda.toLowerCase();
    const matchBusqueda = busqueda === '' ||
      exp.id?.toLowerCase().includes(q) ||
      exp.radicado?.toLowerCase().includes(q) ||
      exp.demandante?.toLowerCase().includes(q) ||
      exp.demandado?.toLowerCase().includes(q) ||
      exp.apoderado?.toLowerCase().includes(q) ||
      exp.juzgado?.toLowerCase().includes(q) ||
      exp.juzgadoConocimiento?.toLowerCase().includes(q) ||
      (exp as any).tipoProceso?.toLowerCase().includes(q) ||
      exp.tipo?.toLowerCase().includes(q) ||
      exp.tipoAccion?.toLowerCase().includes(q) ||
      exp.medioControl?.toLowerCase().includes(q) ||
      exp.abogadoAsignado?.toLowerCase().includes(q) ||
      exp.abogadoResponsable?.toLowerCase().includes(q) ||
      exp.hechos?.toLowerCase().includes(q) ||
      exp.pretensiones?.toLowerCase().includes(q) ||
      exp.pretensionDemandante?.toLowerCase().includes(q) ||
      exp.demandantes?.some(d => 
        d.nombre?.toLowerCase().includes(q) || 
        d.identificacion?.toLowerCase().includes(q) || 
        d.email?.toLowerCase().includes(q) || 
        d.apoderado?.toLowerCase().includes(q)
      ) ||
      exp.demandados?.some(d => 
        d.nombre?.toLowerCase().includes(q) || 
        d.identificacion?.toLowerCase().includes(q) || 
        d.email?.toLowerCase().includes(q) || 
        d.apoderado?.toLowerCase().includes(q)
      ) ||
      exp.otrosActores?.some(d => 
        d.nombre?.toLowerCase().includes(q) || 
        d.identificacion?.toLowerCase().includes(q) || 
        d.email?.toLowerCase().includes(q) || 
        d.apoderado?.toLowerCase().includes(q)
      ) ||
      exp.actuaciones?.some(a => 
        a.descripcion?.toLowerCase().includes(q) || 
        a.tipoActuacion?.toLowerCase().includes(q) ||
        (a as any).tipo?.toLowerCase().includes(q)
      );

    // Filtro por Tipo de Proceso (Flexible: revisa tipo, medioControl, tipoAccion y tipoProceso)
    // Los IDs del filtro (ej: 'reparacion-directa') no coinciden con los valores del backend
    // (ej: 'Reparación Directa'), así que normalizamos ambos lados para comparar.
    const filtroNorm = normalize(filtroTipo);
    // También buscar el nombre legible del tipo seleccionado en la configuración
    const tipoConfigSeleccionado = tiposProcesosActivos.find((t: any) => t.id === filtroTipo);
    const filtroNombreNorm = tipoConfigSeleccionado ? normalize(tipoConfigSeleccionado.nombre) : '';

    const matchTipo = filtroTipo === 'TODOS' ||
      // Comparación directa (por si coinciden exacto)
      exp.tipo === filtroTipo ||
      exp.tipoAccion === filtroTipo ||
      exp.medioControl === filtroTipo ||
      (exp as any).tipoProceso === filtroTipo ||
      // Comparación normalizada contra el ID del filtro
      normalize(exp.tipo) === filtroNorm ||
      normalize(exp.tipoAccion) === filtroNorm ||
      normalize(exp.medioControl) === filtroNorm ||
      normalize((exp as any).tipoProceso) === filtroNorm ||
      // Comparación normalizada contra el NOMBRE del tipo de proceso seleccionado
      (filtroNombreNorm && (
        normalize(exp.tipo) === filtroNombreNorm ||
        normalize(exp.tipoAccion) === filtroNombreNorm ||
        normalize(exp.medioControl) === filtroNombreNorm ||
        normalize((exp as any).tipoProceso) === filtroNombreNorm
      )) ||
      // Parcial match (por si el valor contiene el filtro o viceversa)
      (exp.medioControl && normalize(exp.medioControl).includes(filtroNorm)) ||
      ((exp as any).tipoProceso && normalize((exp as any).tipoProceso).includes(filtroNorm));

    // Filtro por Abogado (solo visible para Jefe/Secretariado)
    const esSinAsignar = !exp.abogadoAsignado || exp.abogadoAsignado === 'Sin asignar' || exp.abogadoAsignado === 'No asignado';
    const matchAbogado = filtroAbogado === 'TODOS' ||
      exp.abogadoAsignado === filtroAbogado ||
      exp.abogadoResponsable === filtroAbogado ||
      (filtroAbogado === 'Sin asignar' && esSinAsignar);

    // Filtro por rango de fecha de creación del proceso
    let matchFecha = true;
    if (filtroFecha) {
      const [fromStr, toStr] = filtroFecha.split(':');
      if (fromStr && toStr) {
        const fromDate = new Date(fromStr + 'T00:00:00');
        const toDate = new Date(toStr + 'T23:59:59');
        const itemDate = exp.fechaCreacion instanceof Date ? exp.fechaCreacion : new Date(exp.fechaCreacion);
        matchFecha = itemDate >= fromDate && itemDate <= toDate;
      }
    }

    return matchBusqueda && matchTipo && matchAbogado && matchFecha;
  });

  // Función para normalizar strings (quitar acentos, mojibake y convertir a minúsculas)
  const normalizeString = (str: string) => {
    if (!str) return '';
    // Primero arreglar mojibake común (UTF-8 interpretado como Latin-1)
    let fixed = str
      .replace(/Ã"/g, 'O')  // Ó corrupta
      .replace(/Ã³/g, 'o')  // ó corrupta
      .replace(/Ã/g, 'I')   // Í corrupta (Ã seguida de algo)
      .replace(/Ã©/g, 'e')  // é corrupta
      .replace(/Ãº/g, 'u')  // ú corrupta
      .replace(/Ã¡/g, 'a')  // á corrupta
      .replace(/Ã±/g, 'n'); // ñ corrupta

    // Luego normalizar acentos normales
    return fixed
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .toLowerCase()
      .replace(/[_-]/g, ' ')
      .trim();
  };

  // Agrupar expedientes filtrados por etapa de forma dinámica
  const expedientesPorEtapa = columnasTablero.reduce((acc: any, estado: any, index: number) => {
    if (!estado?.id) return acc;

    // Inicializar array para este estado
    if (!acc[estado.id]) {
      acc[estado.id] = [];
    }

    // Filtrar expedientes para este estado
    acc[estado.id] = expedientesFiltrados.filter((exp: ExpedienteJudicial) => {
      // Normalizar strings para comparación (sin acentos, minúsculas)
      const stage = normalizeString(exp.etapa || '');
      const stateId = normalizeString(estado.id);
      const stateName = normalizeString(estado.nombre);

      // Match directo (sin acentos)
      const exactMatch = stage === stateId || stage === stateName;

      // Match especial para 'RADICACION' (Backend Default) -> Primera Columna (Frontend: NOTIFICADA)
      // Si es la primera columna del tablero, incluimos también los que vienen como 'RADICACION'
      const normalizedEtapa = normalizeString(exp.etapa || '');
      if (index === 0 && (normalizedEtapa === 'radicacion' || !exp.etapa)) {
        return true;
      }

      return exactMatch;
    });

    return acc;
  }, {} as Record<string, ExpedienteJudicial[]>);

  // DEBUG: Mostrar cuántos expedientes hay en cada columna
  console.log('🔍 [DEBUG] expedientesPorEtapa:', Object.entries(expedientesPorEtapa).map(([k, v]) => `${k}: ${(v as any[]).length}`));

  // Calcular estadísticas - solo expedientes en las etapas activas
  const expedientesVisibles = Object.values(expedientesPorEtapa).flat() as ExpedienteJudicial[];
  const totalExpedientes = expedientesVisibles.length;
  const expedientesCriticos = expedientesVisibles.filter((e: ExpedienteJudicial) => e.diasRestantes <= 5).length;
  const expedientesEnTermino = expedientesVisibles.filter((e: ExpedienteJudicial) => e.diasRestantes > 15).length;

  const etapas = columnasTablero.map((estado: any) => ({
    nombre: estado.nombre,
    valor: estado.id, // Usamos el ID del estado como valor para mover
    color: estado.color,
    icono: <FileText className="w-4 h-4" style={{ color: estado.color }} />, // Icono genérico o mapeado si es posible
    diasEstimados: 15, // TODO: Mapear desde 'tiempos' si hay relación, o default
    expedientes: expedientesPorEtapa[estado.id] || []
  }));

  const guardandoDemanda = useRef(false);

  // Handler para guardar nueva demanda
  const handleSaveNuevaDemanda = async (demandaData: NuevaDemandaData) => {
    if (guardandoDemanda.current) return;
    guardandoDemanda.current = true;
    try {
      // Mapear datos del formulario al formato del backend
      const expedienteData = {
        radicado: demandaData.numeroRadicado,
        tipoProceso: demandaData.tipoProceso,
        jurisdiccion: 'Contencioso Administrativo',
        demandante: demandaData.demandantes[0]?.nombre || 'Sin Demandante',
        demandado: demandaData.demandados[0]?.nombre || 'Sin Demandado',
        estado: 'ACTIVO',
        fechaRadicacion: new Date().toISOString(),
        cuantia: typeof demandaData.cuantia === 'string' ? parseFloat((demandaData.cuantia as string).replace(/[^0-9.-]/g, '')) || 0 : demandaData.cuantia,
        nivelRiesgo: demandaData.nivelRiesgo,
        provisionContable: demandaData.provisionContable || 0,
        fechaEstimacionProvision: demandaData.fechaEstimacionProvision ? new Date(demandaData.fechaEstimacionProvision).toISOString() : undefined,
        observacionProvision: demandaData.observacionesProvision,
        abogadoSustanciador: (demandaData as any).abogadoResponsable || demandaData.abogadoAsignado,
        medioControl: demandaData.medioControl,
        juzgadoConocimiento: `${demandaData.juzgado} - ${demandaData.ciudad}, ${demandaData.departamento}`,
        ubicacionFisica: demandaData.ciudad,
        pretensionDemandante: demandaData.pretensiones,
        fechaNotificacion: demandaData.fechaNotificacion,
        fechaVencimientoTermino: demandaData.fechaVencimiento,
        etapaProcesal: demandaData.etapa || (columnasTablero.length > 0 ? columnasTablero[0].id : 'RADICACION'),
        ultimaActuacion: undefined, // Backend manages initial state or assumes created
        camposAdicionales: {
          ...(demandaData.camposAdicionales
            ? Object.fromEntries(
                Object.entries(demandaData.camposAdicionales).map(([k, v]) => [
                  k,
                  (v && typeof v === 'object' && (v as any).base64 && (v as any).esNuevo)
                    ? { nombre: (v as any).nombre, tipoMime: (v as any).tipoMime, tamano: (v as any).tamano, cargado: true }
                    : v
                ])
              )
            : {}),
          // IDs y nombres de territorial/dependencia como respaldo si el backend no tiene columnas directas
          ...(demandaData.territorial ? { territorial: demandaData.territorial } : {}),
          ...(demandaData.dependencia ? { dependencia: demandaData.dependencia } : {}),
          ...((demandaData as any).territorialNombre ? { territorialNombre: (demandaData as any).territorialNombre } : {}),
          ...((demandaData as any).dependenciaNombre ? { dependenciaNombre: (demandaData as any).dependenciaNombre } : {}),
        },

        // Mapeo unificado de actores
        actors: [
          ...demandaData.demandantes.map(d => ({
            nombre: d.nombre,
            tipoPersona: d.tipoPersona,
            identificacion: d.identificacion,
            rol: 'DEMANDANTE',
            telefono: d.telefono,
            email: d.email,
            direccion: d.direccion,
            apoderado: d.apoderado
          })),
          ...demandaData.demandados.map(d => ({
            nombre: d.nombre,
            tipoPersona: d.tipoPersona,
            identificacion: d.identificacion,
            rol: 'DEMANDADO',
            cargo: d.cargo,
            telefono: d.telefono,
            email: d.email,
            direccion: d.direccion,
            apoderado: d.apoderado
          })),
          ...demandaData.otrosActores.map(d => ({
            nombre: d.nombre,
            tipoPersona: d.tipoPersona,
            identificacion: d.identificacion,
            rol: d.rol || 'OTRO',
            telefono: d.telefono,
            email: d.email,
            direccion: d.direccion,
            apoderado: d.apoderado
          }))
        ],

        // Datos del Demandante Legacy (Primer registro)
        tipoIdDemandante: demandaData.demandantes[0]?.tipoPersona === 'natural' ? 'CC' : 'NIT',
        numeroIdDemandante: demandaData.demandantes[0]?.identificacion || '',
        demandanteDireccion: demandaData.demandantes[0]?.direccion || '',
        demandanteTelefono: demandaData.demandantes[0]?.telefono || '',
        demandanteEmail: demandaData.demandantes[0]?.email || '',
        demandanteApoderado: demandaData.demandantes[0]?.apoderado || '',
        // Datos del Demandado Legacy (Primer registro)
        tipoIdDemandado: demandaData.demandados[0]?.tipoPersona === 'natural' ? 'CC' : 'NIT',
        numeroIdDemandado: demandaData.demandados[0]?.identificacion || '',
        demandadoDireccion: demandaData.demandados[0]?.direccion || '',
        demandadoTelefono: demandaData.demandados[0]?.telefono || '',
        demandadoEmail: demandaData.demandados[0]?.email || '',

        // Clasificación penal (Contraloría / ANDJE)
        esDelitoAdminPublica: demandaData.esDelitoAdminPublica || false,
        esConductaPatrimonioPublico: demandaData.esConductaPatrimonioPublico || false,

        // Territorial y Dependencia (del paso 3)
        territorial: demandaData.territorial,
        dependencia: demandaData.dependencia,
        territorialNombre: (demandaData as any).territorialNombre,
        dependenciaNombre: (demandaData as any).dependenciaNombre,
      };

      await legalService.crearExpediente(expedienteData);

      // Los documentos cargados en campos adicionales (base64) viajan dentro de
      // camposAdicionales y ahora los persiste el backend al crear el expediente
      // (ver ExpedienteService.persistirDocumentosCamposAdicionales). De esa forma
      // quedan en la pestaña de Documentos sin depender de un fetch(data:) que el CSP bloquea.

      toast.success('Demanda registrada exitosamente', {
        description: `Radicado: ${demandaData.numeroRadicado}`
      });
      // Recargar expedientes
      loadExpedientes();
      setModalNuevaDemandaOpen(false);
    } catch (error: any) {
      console.error('Error guardando demanda:', error);
      toast.error(error.message || 'Error al guardar la demanda');
    } finally {
      guardandoDemanda.current = false;
    }
  };

  const addBtnsPermission = () => {
    const btns: any[] = [];
    if (authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_CREATE)) {
      btns.push({
        label: 'Nueva Demanda',
        labelMobile: 'Demanda',
        icon: <Plus className="w-4 h-4 mr-1" />,
        onClick: () => setModalNuevaDemandaOpen(true),
        className: 'bg-[#003DA5] hover:bg-[#002e7d] text-white font-bold transition-all duration-200 shadow-sm hover:shadow active:scale-95 rounded-lg border-0'
      });
    }
    btns.push({
      label: 'Descargar Reporte',
      labelMobile: 'Reporte',
      icon: <Download className="w-4 h-4 mr-1" />,
      onClick: () => {
        if (expedientesVisibles.length === 0) {
          toast.error('No hay expedientes para exportar', {
            description: 'Ajusta los filtros para incluir expedientes en el reporte.'
          });
          return;
        }
        setModalFiltrosReporteOpen(true);
      },
      className: 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-[#003DA5] font-bold transition-all duration-200 shadow-sm hover:shadow active:scale-95 rounded-lg'
    });
    return btns;
  };

  const useFluidKanban = !isMobile && !isTablet;
  const getKanbanColumnWidth = () => {
    if (isMobile) return 260;
    if (isTablet) return 270;
    return 0;
  };
  const kanbanColumnWidth = getKanbanColumnWidth();

  return (
    <div className="space-y-3 md:space-y-4">
      <ModuleHeader
        title="Defensa Judicial"
        subtitle="Gestión visual de demandas judiciales y actuaciones procesales contra la ESAP"
        icon={<Gavel className="w-5 h-5 text-white" />}
        color="#003DA5"
        buttons={addBtnsPermission()}
        topCustomActions={
          <div className="mr-1 shrink-0" style={{ display: 'inline-grid', position: 'relative' }}>
            {/* Span invisible que determina el ancho según el texto seleccionado */}
            <span
              aria-hidden="true"
              className="invisible pointer-events-none whitespace-nowrap pl-10 pr-9 py-1.5 text-[13px] font-black"
              style={{ gridArea: '1/1' }}
            >
              {procesoSeleccionado?.nombre || tiposProcesosActivos[0]?.nombre || ''}
            </span>
            <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3 pointer-events-none" style={{ zIndex: 1 }}>
              <Gavel className="w-4 h-4 text-[#003DA5]" />
            </div>
            <select
              value={tableroSeleccionado}
              onChange={(e) => handleCambiarTablero(e.target.value)}
              className="w-full pl-10 pr-9 py-1.5 bg-white border border-slate-300 hover:border-[#003DA5] text-[#003DA5] font-black rounded-lg text-[13px] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm appearance-none cursor-pointer"
              style={{
                gridArea: '1/1',
                backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23003da5' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1.25rem',
                backgroundRepeat: 'no-repeat'
              }}
            >
              {tiposProcesosActivos.map((tp: any) => (
                <option key={tp.id} value={tp.id}>
                  {tp.nombre}
                </option>
              ))}
            </select>
          </div>
        }

        toggleView={{
          current: tipoVista,
          onChange: (v: string) => setTipoVista(v as VistaModulo),
          options: [
            { label: 'Kanban', icon: <Columns3 className="w-4 h-4" /> },
            { label: 'Lista', icon: <List className="w-4 h-4" /> },
            { label: 'Archivados', icon: <Archive className="w-4 h-4" /> }
          ]
        }}
        customActions={
          <ModuleFilters
            borderless
            searchValue={busqueda}
            onSearchChange={setBusqueda}
            filters={[
              {
                type: 'date-range',
                label: 'Fecha de Creación',
                value: filtroFecha,
                onChange: setFiltroFecha,
                placeholder: 'Fecha Creación'
              },
              {
                type: 'select',
                label: 'Etapa Procesal',
                value: filtroEtapa,
                onChange: setFiltroEtapa,
                options: [
                  { value: 'TODAS', label: 'Todas las etapas' },
                  ...etapas.map((e: any) => ({ value: e.nombre, label: e.nombre }))
                ]
              },
              {
                type: 'select',
                label: 'Tipo de Proceso',
                value: filtroTipo,
                onChange: setFiltroTipo,
                options: [
                  { value: 'TODOS', label: 'Todos los tipos' },
                  ...tiposProcesosActivos.map((t: any) => ({ value: t.id, label: t.nombre }))
                ]
              },
              ...(authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_ABOGADO_REASIGNAR)
                ? [{
                    type: 'select' as const,
                    label: 'Abogado',
                    value: filtroAbogado,
                    onChange: setFiltroAbogado,
                    options: [
                      { value: 'TODOS', label: 'Todos los abogados' },
                      { value: 'Sin asignar', label: 'Sin abogado asignado' },
                      ...abogadosList.map(a => ({ value: a.nombre, label: a.nombre }))
                    ]
                  }]
                : [])
            ]}
            totalItems={totalExpedientes}
            filteredItems={expedientesVisibles.length}
            showCounter={false}
            onClearFilters={() => {
              setBusqueda('');
              setFiltroEtapa('TODAS');
              setFiltroTipo('TODOS');
              setFiltroAbogado('TODOS');
              setFiltroFecha('');
            }}
          />
        }
      />

      {loading && (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <Loader2 style={{ width: 28, height: 28, color: '#003DA5', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, color: '#6B7280' }}>Cargando expedientes...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Tablero Kanban - Diseño migrado desde SuperApp Gestión Legal */}
      {!loading && tipoVista === 'kanban' && (
        <DndProvider backend={HTML5Backend}>
          <div className="relative">
            {isMobile ? (
              /* Vista Adaptativa Mobile - Acordeón de Etapas */
              <div className="space-y-3 px-1">
                {etapas.map((etapa: any) => {
                  const estaAbierto = !columnasColapsadas[etapa.valor];
                  return (
                    <Card key={etapa.nombre} className="border border-gray-200 overflow-hidden bg-white shadow-sm rounded-xl">
                      <button
                        onClick={() => setColumnasColapsadas(prev => ({ ...prev, [etapa.valor]: !prev[etapa.valor] }))}
                        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100 hover:bg-gray-100/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 flex-shrink-0">
                            {etapa.icono}
                          </div>
                          <span className="font-black text-sm text-gray-800 truncate text-left">
                            {etapa.nombre}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="font-bold text-xs px-2 py-0.5 bg-[#E0EDFF] text-[#003DA5] border border-blue-200">
                            {etapa.expedientes.length}
                          </Badge>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${estaAbierto ? '' : 'rotate-[-90deg]'}`} />
                        </div>
                      </button>

                      {estaAbierto && (
                        <div className="p-3 space-y-3 bg-gray-50/50">
                          {etapa.expedientes.map((expediente: any) => (
                            <TarjetaExpediente
                              key={expediente.id}
                              expediente={expediente}
                              isMobile={isMobile}
                              isCompact={false}
                              onRefresh={loadExpedientes}
                              onMoverExpediente={handleMoverExpediente}
                              etapaActual={etapa.valor}
                            />
                          ))}
                          {etapa.expedientes.length === 0 && (
                            <div className="text-center py-8 text-gray-400">
                              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                              <p className="text-xs font-semibold">Sin expedientes en esta etapa</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* Vista Desktop - Kanban tradicional */
              <>
                {!useFluidKanban && (
                  <div className="absolute top-2 right-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-gray-200">
                    <p className="text-xs font-bold text-gray-600 flex items-center gap-1">
                      <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                      Desliza
                    </p>
                  </div>
                )}

                <div
                  className={`flex gap-3 md:gap-4 overflow-x-auto pb-4 kanban-board-scroll ${isMobile ? '-mx-4 px-4' : ''} scroll-smooth snap-x snap-mandatory`}
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#CBD5E0 #F7FAFC',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {etapas.map((etapa: any) => (
                    <ColumnaKanban
                      key={etapa.nombre}
                      etapa={etapa}
                      isMobile={isMobile}
                      isTablet={isTablet}
                      isSmallDesktop={isSmallDesktop}
                      columnWidth={kanbanColumnWidth}
                      useFluid={useFluidKanban}
                      onRefresh={loadExpedientes}
                      onMoverExpediente={handleMoverExpediente}
                      isCollapsed={!!columnasColapsadas[etapa.valor]}
                      onToggleCollapse={() => setColumnasColapsadas(prev => ({ ...prev, [etapa.valor]: !prev[etapa.valor] }))}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </DndProvider>
      )}

      {/* Vista de Lista - NUEVA IMPLEMENTACIÓN */}
      {!loading && tipoVista === 'lista' && (
        <VistaListaDefensaJudicial
          expedientes={etapas.flatMap((e: any) => e.expedientes)}
          isMobile={isMobile}
          isTablet={isTablet}
          onMoverExpediente={authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_ESTADOS_EDIT) ? handleMoverExpediente : undefined}
          onRefresh={loadExpedientes}
        />
      )}

      {/* Vista de Archivados */}
      {!loading && tipoVista === 'archivados' && (
        <VistaArchivados
          items={itemsArchivados}
          moduloNombre="Defensa Judicial"
          onRestaurar={authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_ARCHIVAR) ? handleRestaurar : undefined}
          onEliminarPermanente={authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_ARCHIVAR) ? handleEliminarPermanente : undefined}
        />
      )}

      {/* Modal Nueva Demanda */}
      <ModalNuevaDemanda
        isOpen={modalNuevaDemandaOpen}
        onClose={() => setModalNuevaDemandaOpen(false)}
        onSave={handleSaveNuevaDemanda}
        tableroSeleccionado={tableroSeleccionado}
      />

      {/* Modal Filtros Reporte */}
      <ModalFiltrosReporte
        open={modalFiltrosReporteOpen}
        onClose={() => setModalFiltrosReporteOpen(false)}
        expedientes={expedientesVisibles as any}
        filtroTipoActual={filtroTipo}
        nombreTipoActual={filtroTipo === 'TODOS' ? 'Todos los tipos de proceso' : (tiposProcesosActivos.find((t: any) => t.id === filtroTipo)?.nombre || filtroTipo)}
        onGenerar={(expedientesFiltrados, descripcionFiltros) => {
          toast.loading('Generando reporte PDF...', { id: 'reporte-pdf', duration: 3000 });
          setTimeout(() => {
            // Mapa tipoProceso.nombre → camposAdicionalesConfig (no-documento)
            const camposConfigPorTipo: Record<string, any[]> = {};
            (allTiposProcesos || []).forEach((tp: any) => {
              if (tp.camposAdicionalesConfig?.length) {
                camposConfigPorTipo[tp.nombre] = tp.camposAdicionalesConfig.filter((c: any) => c.tipo !== 'documento');
              }
            });
            generarReporteExpedientesPDF(expedientesFiltrados as any, filtroTipo === 'TODOS' ? 'TODOS' : (tiposProcesosActivos.find((t: any) => t.id === filtroTipo)?.nombre || filtroTipo), descripcionFiltros, camposConfigPorTipo);
            toast.success(`Reporte generado con ${expedientesFiltrados.length} expediente(s)`, {
              id: 'reporte-pdf',
              description: descripcionFiltros,
              duration: 4000
            });
          }, 300);
        }}
      />

      {/* ✅ Modal Expediente abierto desde notificación (nivel padre) */}
      {expedienteDesdeNotificacion && (
        <ModalExpediente
          isOpen={true}
          onClose={() => setExpedienteDesdeNotificacion(null)}
          expediente={expedienteDesdeNotificacion}
          onUpdate={loadExpedientes}
        />
      )}
    </div>
  );
}

// ==================== COMPONENTE COLUMNA KANBAN ====================
interface ColumnaKanbanProps {
  etapa: {
    nombre: string;
    valor: string;
    color: string;
    icono: React.ReactNode;
    diasEstimados: number;
    expedientes: ExpedienteJudicial[];
  };
  isMobile: boolean;
  isTablet: boolean;
  isSmallDesktop: boolean;
  columnWidth: number;
  useFluid: boolean;
  onMoverExpediente: (expedienteId: string, nuevaEtapa: string) => void;
  onRefresh?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function ColumnaKanban({
  etapa,
  isMobile,
  isSmallDesktop,
  columnWidth,
  useFluid,
  onMoverExpediente,
  onRefresh,
  isCollapsed,
  onToggleCollapse
}: ColumnaKanbanProps) {
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.EXPEDIENTE,
    drop: (item: { id: string }) => onMoverExpediente(item.id, etapa.valor),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const backgroundColor = isOver ? ESAP_TOKENS.colors.primaryLight : ESAP_TOKENS.colors.surfaceAlt;
  const borderColor = isOver ? ESAP_TOKENS.colors.primary : 'transparent';

  if (isCollapsed && !isMobile) {
    return (
      <div
        className="flex-shrink-0 w-[40px] min-w-[40px] transition-all duration-300 relative flex flex-col snap-center"
        style={{ height: 'calc(100vh - 180px)' }}
      >
        <Card
          ref={drop}
          className="h-full border border-gray-200 bg-gray-50/50 hover:bg-gray-100/50 transition-all flex flex-col items-center py-4 cursor-pointer select-none rounded-xl overflow-hidden relative"
          onClick={onToggleCollapse}
          title={`Expandir etapa ${etapa.nombre}`}
        >
          {/* Acento de color arriba */}
          <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: etapa.color || ESAP_TOKENS.colors.primary }} />

          {/* Badge de cantidad */}
          <Badge className="font-bold text-[10px] px-1.5 py-0.5 bg-white border border-gray-200 text-gray-700 shadow-sm flex-shrink-0 mb-6">
            {etapa.expedientes.length}
          </Badge>

          {/* Nombre vertical */}
          <div className="flex-1 flex items-center justify-center">
            <span
              className="font-black text-[10px] text-gray-600 uppercase tracking-wider whitespace-nowrap rotate-90 select-none pointer-events-none"
              style={{ transformOrigin: 'center center' }}
            >
              {etapa.nombre}
            </span>
          </div>

          {/* Icono de expandir */}
          <div className="mt-6 p-1 rounded-md bg-white border border-gray-200 text-gray-400 hover:text-[#003DA5] hover:border-[#003DA5]/30 shadow-sm">
            <ChevronsDown className="w-3.5 h-3.5 rotate-[-90deg]" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col transition-all duration-300 snap-center"
      style={{
        width: etapa.expedientes.length > 0 ? 319 : 194,
        minWidth: etapa.expedientes.length > 0 ? 319 : 194,
        maxWidth: etapa.expedientes.length > 0 ? 319 : 194,
        flex: 'none',
        height: isMobile ? 'auto' : 'calc(100vh - 180px)'
      }}
    >
      <Card className="h-full border border-gray-200 bg-white flex flex-col overflow-hidden relative">
        {/* Acento de color arriba */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: etapa.color || ESAP_TOKENS.colors.primary }} />

        <div className={`${isMobile ? 'p-2.5' : isSmallDesktop ? 'p-2.5' : 'p-3'} border-b bg-gray-50 flex-shrink-0 pt-3.5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="p-1.5 rounded-lg bg-white border border-gray-200 flex-shrink-0">
                {etapa.icono}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-xs text-gray-800 truncate">
                  {etapa.nombre}
                </h3>
              </div>
            </div>
            {/* Collapse action and badge */}
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
              <Badge className="font-semibold text-xs px-1.5 py-0.5 bg-white border border-gray-200 text-gray-700 flex-shrink-0">
                {etapa.expedientes.length}
              </Badge>
              {!isMobile && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
                  className="p-1 rounded bg-white hover:bg-gray-100 border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  title={`Colapsar etapa ${etapa.nombre}`}
                >
                  <ChevronsDown className="w-3.5 h-3.5 rotate-[90deg]" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div
          ref={drop}
          className={`${isMobile ? 'p-2' : isSmallDesktop ? 'p-1.5' : 'p-2'} space-y-2 overflow-y-auto flex-1`}
          style={{
            backgroundColor: backgroundColor,
            borderLeft: `3px solid ${borderColor}`,
            borderRight: `3px solid ${borderColor}`,
            transition: 'all 0.2s ease',
            minHeight: isMobile ? '350px' : 'auto'
          }}
        >
          {etapa.expedientes.map((expediente) => (
            <TarjetaExpediente
              key={expediente.id}
              expediente={expediente}
              isMobile={isMobile}
              isCompact={isSmallDesktop}
              onRefresh={onRefresh}
              onMoverExpediente={onMoverExpediente}
              etapaActual={etapa.valor}
            />
          ))}

          {etapa.expedientes.length === 0 && (
            <div className="text-center py-12 text-gray-400" style={{ pointerEvents: 'none' }}>
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-xs font-semibold">
                {isOver ? '✅ Suelte aquí' : `Sin expedientes en ${etapa.nombre}`}
              </p>
            </div>
          )}

          {/* Dotted Drop Target Placeholder when dragging over */}
          {isOver && (
            <div
              className="border-2 border-dashed border-[#003DA5]/30 bg-[#003DA5]/[0.02] rounded-xl flex items-center justify-center p-6 transition-all duration-200"
              style={{ height: '100px' }}
            >
              <p className="text-xs font-bold text-[#003DA5]/50 flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Soltar expediente aquí
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ==================== COMPONENTE TARJETA EXPEDIENTE ====================
interface TarjetaExpedienteProps {
  expediente: ExpedienteJudicial;
  isMobile: boolean;
  isCompact?: boolean;
  onRefresh?: () => void;
  onMoverExpediente: (expedienteId: string, nuevaEtapa: string) => void;
  etapaActual: string;
}

function TarjetaExpediente({ expediente, isMobile, isCompact = false, onRefresh, onMoverExpediente, etapaActual }: TarjetaExpedienteProps) {
  const { estadosActivos } = useConfiguracionModulo('defensa-judicial');
  const [modalExpedienteOpen, setModalExpedienteOpen] = useState(false);
  const [showEliminarModal, setShowEliminarModal] = useState(false);
  const [motivoEliminar, setMotivoEliminar] = useState('');
  const [eliminando, setEliminando] = useState(false);

  const handleAbrirExpediente = () => {
    setModalExpedienteOpen(true);
  };

  const handleEliminarDemanda = async () => {
    if (!motivoEliminar.trim()) {
      toast.error('⚠️ El motivo es obligatorio');
      return;
    }
    try {
      setEliminando(true);
      const idToDelete = expediente.uuid || expediente.id;
      await legalService.eliminarExpedienteSoft(idToDelete, motivoEliminar, 'usuario');
      toast.success('🗑️ Demanda eliminada exitosamente', {
        description: `Radicado: ${expediente.id} — Movida a archivados`
      });
      setShowEliminarModal(false);
      onRefresh?.();
    } catch (error) {
      console.error('Error eliminando demanda:', error);
      toast.error('❌ Error al eliminar la demanda');
    } finally {
      setEliminando(false);
    }
  };

  const getSemaforoColor = (diasRestantes: number) => {
    if (diasRestantes <= 5) return { color: '#DC2626', label: 'Vencido' };
    if (diasRestantes <= 15) return { color: '#F59E0B', label: 'Próximo' };
    return { color: '#10B981', label: 'En término' };
  };

  const semaforo = getSemaforoColor(expediente.diasRestantes);
  const { porcentajeGlobal: porcentajeTiempo, procesoVencido } = calcularProgreso(
    expediente.diasTotales,
    expediente.diasRestantes,
    expediente.etapa,
    estadosActivos,
    expediente.documentos,
    expediente.actuaciones
  );
  const ultimaActuacion = expediente.ultimaActuacion?.descripcion || `Expediente en etapa de ${expediente.etapa}`;

  const canDrag = authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_ESTADOS_EDIT);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.EXPEDIENTE,
    item: { id: expediente.id, etapa: etapaActual },
    canDrag: () => canDrag,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.5 : 1;

  return (
    <div
      ref={drag}
      style={{ opacity, cursor: canDrag ? 'move' : 'default' }}
      className="h-fit transition-all duration-200 hover:-translate-y-1 hover:shadow-xl rounded-xl"
    >
      <KanbanCard
        accentColor={ESAP_TOKENS.colors.primary}
        isDragging={isDragging}
        className="h-full flex flex-col"
      >
        <KanbanCardHeader
          icon={<Scale className="w-4 h-4" style={{ color: ESAP_TOKENS.colors.primary }} />}
          iconBg={ESAP_TOKENS.colors.primaryLight}
          title={expediente.id}
          titleColor={ESAP_TOKENS.colors.primary}
          subtitle={expediente.medioControl}
          rightContent={
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200" style={{ fontSize: '10px' }}>
                <div
                  className="w-1.5 h-1.5 rounded-full ring-2 ring-offset-1"
                  style={{
                    background: semaforo.color,
                    ringColor: `${semaforo.color}33`
                  }}
                />
                <span className="font-bold" style={{ color: semaforo.color }}>
                  {(() => {
                    const unit = expediente.tipoConteoTermino === 'HORAS' ? 'h' : 'd';
                    return expediente.diasRestantes < 0 ? `${Math.abs(expediente.diasRestantes)}${unit}` : `${expediente.diasRestantes}${unit}`;
                  })()}
                </span>
              </div>
              {authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_ESTADOS_EDIT) && (
                <button
                  onClick={(e) => { e.stopPropagation(); setMotivoEliminar(''); setShowEliminarModal(true); }}
                  disabled={eliminando}
                  title="Eliminar demanda"
                  className="p-1 rounded-md transition-all bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          }
        />

        <KanbanCardInfoSection>
          <KanbanCardInfoRow
            label="Dte:"
            value={
              expediente.demandantes && expediente.demandantes.length > 0
                ? `${expediente.demandantes[0].nombre}${expediente.demandantes.length > 1 ? ` +${expediente.demandantes.length - 1}` : ''}`
                : expediente.demandante
            }
          />
          {expediente.demandados && expediente.demandados.length > 0 && (
            <KanbanCardInfoRow
              label="Ddo:"
              value={`${expediente.demandados[0].nombre}${expediente.demandados.length > 1 ? ` +${expediente.demandados.length - 1}` : ''}`}
            />
          )}
          <KanbanCardInfoRow
            label="Juzgado:"
            value={expediente.juzgado}
          />
          {expediente.cuantia && expediente.cuantia !== '0' && (
            <KanbanCardInfoRow
              label="Cuantía:"
              value={`$${Number(expediente.cuantia).toLocaleString('es-CO')}`}
            />
          )}
        </KanbanCardInfoSection>

        <KanbanCardProfesional
          nombre={expediente.abogadoAsignado || expediente.abogadoResponsable || 'No asignado'}
        />

        <KanbanCardMetrics
          items={[
            {
              icon: <FileText className="w-3.5 h-3.5" />,
              label: `${expediente.documentos?.length || 0} docs`,
              color: ESAP_TOKENS.colors.text.secondary,
            },
            {
              icon: <Clock className="w-3.5 h-3.5" />,
              // Si no hay días totales (ej. sin fecha límite clara) o ya se venció, 
              // mostrar simplemente los días absolutos transcurridos o restantes con sentido lógico.
              label: (() => {
                const unit = expediente.tipoConteoTermino === 'HORAS' ? 'h' : 'd';
                return expediente.diasRestantes < 0
                  ? `${Math.abs(expediente.diasRestantes)}${unit}`
                  : `${Math.max(0, expediente.diasTotales - expediente.diasRestantes)}${unit}`;
              })(),
              color: ESAP_TOKENS.colors.text.secondary,
            },
            {
              icon: <AlertCircle className="w-3.5 h-3.5" />,
              // Muestra el progreso global multi-factor
              label: `${porcentajeTiempo}%`,
              color: procesoVencido ? ESAP_TOKENS.colors.danger : ESAP_TOKENS.colors.text.secondary,
            },
          ]}
        />

        {!isCompact && (
          <div
            className="mt-3 mb-2.5 p-2 rounded-lg border"
            style={{
              backgroundColor: ESAP_TOKENS.colors.primaryLight,
              borderColor: '#BFDBFE'
            }}
          >
            <p className="text-[10px] font-bold mb-0.5 flex items-center gap-1" style={{ color: ESAP_TOKENS.colors.primary }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ESAP_TOKENS.colors.primary }} />
              ÚLTIMA ACTUACIÓN
            </p>
            <p className="text-xs text-gray-700 line-clamp-2">
              {ultimaActuacion}
            </p>
          </div>
        )}

        <KanbanActionSection>
          <KanbanActionRowPrimary>
            <KanbanButtonPrimary
              icon={<FolderOpen className="w-3.5 h-3.5" />}
              onClick={handleAbrirExpediente}
              className="w-full"
            >
              Expediente
            </KanbanButtonPrimary>
          </KanbanActionRowPrimary>

        </KanbanActionSection>
      </KanbanCard>

      <ModalExpediente
        isOpen={modalExpedienteOpen}
        onClose={() => setModalExpedienteOpen(false)}
        expediente={expediente}
        onUpdate={onRefresh}
      />

      {/* Modal de confirmación eliminar */}
      <Dialog open={showEliminarModal} onOpenChange={setShowEliminarModal}>
        <DialogContent
          className="sm:max-w-[380px] w-[90vw] !max-w-[380px] !w-auto p-0 overflow-hidden"
          style={{ maxWidth: '380px', width: '100%' }}
        >
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Trash2 className="w-5 h-5 text-red-500" />
              Eliminar Demanda
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold">¿Eliminar esta demanda?</p>
                <p className="text-xs mt-1 opacity-80">Radicado: <strong>{expediente.id}</strong>. Será movida a la papelera y podrá restaurarla desde Archivados.</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Motivo de eliminación <span className="text-red-500">*</span></label>
              <textarea
                className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows={3}
                placeholder="Indique la razón de la eliminación..."
                value={motivoEliminar}
                onChange={(e) => setMotivoEliminar(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 p-4 pt-0 bg-gray-50/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEliminarModal(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleEliminarDemanda}
              disabled={!motivoEliminar.trim() || eliminando}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
