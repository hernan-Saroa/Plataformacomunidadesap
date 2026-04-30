/**
 * ModuloDefensaJudicialV3 - MOD-01: Defensa Judicial
 * VERSIÓN WORLD-CLASS - COPIADO EXACTO DE CONTROL DISCIPLINARIO
 * ✅ Responsive mobile-first FUNCIONAL
 * ✅ Colores corporativos ESAP (#003DA5)
 * ✅ Diseño mandatorio 100% igual a Control Disciplinario
 * ✅ CONECTADO CON CONFIGURACIONES CENTRALIZADAS
 */

import { useState, useEffect } from 'react';
import {
  Plus, FileText, FolderOpen, AlertTriangle, Clock, Calendar,
  User, MoreVertical, Eye, ChevronDown, Users, Settings,
  Maximize2, Minimize2, AlertCircle, CheckCircle,
  List, Columns3, ChevronsDown, ChevronsUp,
  Scale, DollarSign, Filter, Search,
  ExternalLink, Download, Upload, RefreshCw, Paperclip,
  MessageSquare, FileCheck, Send, Archive, Mail, Edit, Trash2
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import { toast } from 'sonner';

import { legalService } from '../../../../services/api/legal.service';
import type { ExpedienteJudicial, EtapaDefensaJudicial } from '../core/types';
import { ModalNuevaDemanda, NuevaDemandaData } from './ModalNuevaDemanda';
import { ModalExpediente } from './ModalExpediente';
import { ModalComunicaciones } from './ModalComunicaciones';
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

export function ModuloDefensaJudicialV3() {
  // ✅ Obtener configuraciones desde el Context API
  const { estadosActivos, tiposProcesosActivos } = useConfiguracionModulo('defensa-judicial');

  // ✅ Obtener permisos del usuario actual
  const { usuario } = usePermisos();

  // ✅ Estado para cambiar entre vista normal y archivados
  const [vistaActual, setVistaActual] = useState<'activos' | 'archivados'>('activos');

  const { isMobile, isTablet, isLg, isXl, width: screenWidth } = useResponsive();
  const isSmallDesktop = isLg || (isXl && screenWidth < 1440);
  const [tipoVista, setTipoVista] = useState<VistaModulo>('kanban');
  const [modalNuevaDemandaOpen, setModalNuevaDemandaOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODAS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroAbogado, setFiltroAbogado] = useState<string>('TODOS');
  const [abogadosList, setAbogadosList] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado local para manejar drag and drop
  const [expedientes, setExpedientes] = useState<ExpedienteJudicial[]>([]);

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

  // Cargar expedientes desde el backend
  const loadExpedientes = async () => {
    try {
      setLoading(true);

      // Cargar expedientes y abogados en paralelo
      const [data, abogadosData] = await Promise.all([
        legalService.getExpedientes(),
        legalService.getAbogadosDashboard()
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
            if (typeof exp.abogadoSustanciador === 'string' && exp.abogadoSustanciador.length < 30 && !exp.abogadoSustanciador.includes('-')) {
              return exp.abogadoSustanciador;
            }

            return 'Sin asignar';
          })(),
          abogadoSustanciador: exp.abogadoSustanciador, // UUID del abogado para comparación de identidad
          hechos: '',
          pretensiones: exp.pretensionDemandante || '',
          pretensionDemandante: exp.pretensionDemandante,
          tipoProceso: exp.tipoProceso,
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
        }
      });
      // Si el usuario tiene rol RESUELVE_GESTION_LEGAL, solo mostrar sus demandas asignadas
      const currentUser = authService.getCurrentUser() as any;
      const isResuelve = authService.hasRole('RESUELVE_GESTION_LEGAL');
      let expedientesFiltrados = mapped;
      if (isResuelve && currentUser) {
        // El objeto guardado en localStorage puede ser ProfesionalUser (person.email, person.first_name)
        // o AuthUser (email, fullName). Intentamos ambos formatos.
        const cuEmail: string = (
          currentUser.email ??
          currentUser.person?.email ??
          currentUser.mail ??
          ''
        ).toLowerCase();
        const cuName: string = (
          currentUser.fullName ??
          currentUser.full_name ??
          currentUser.name ??
          (currentUser.firstName || currentUser.first_name
            ? `${currentUser.firstName ?? currentUser.first_name ?? ''} ${currentUser.lastName ?? currentUser.last_name ?? ''}`.trim()
            : null) ??
          (currentUser.person?.first_name
            ? `${currentUser.person.first_name ?? ''} ${currentUser.person.last_name ?? ''}`.trim()
            : null) ??
          ''
        ).toLowerCase();
        // Todos los posibles IDs del usuario actual
        const cuIds = new Set<string>(
          [
            currentUser.id,
            currentUser.id_user,
            currentUser.user?.id,
            currentUser.user?.id_user,
            currentUser.person?.id,
          ].filter(Boolean)
        );

        console.log('[DEBUG RESUELVE] currentUser raw:', JSON.stringify(currentUser));
        console.log('[DEBUG RESUELVE] email detectado:', cuEmail, '| nombre detectado:', cuName, '| ids:', [...cuIds]);
        console.log('[DEBUG RESUELVE] abogadosData:', JSON.stringify(abogadosData));
        console.log('[DEBUG RESUELVE] abogadoSustanciador en expedientes:', mapped.map(e => e.abogadoSustanciador));

        const myAbogado = Array.isArray(abogadosData)
          ? abogadosData.find((a: any) => {
              // Por ID (cualquier variante)
              if (a.id && cuIds.has(a.id)) return true;
              if ((a as any).rawId && cuIds.has((a as any).rawId)) return true;
              if ((a as any).authId && cuIds.has((a as any).authId)) return true;
              // Por email
              if (cuEmail && a.email && (a.email as string).toLowerCase() === cuEmail) return true;
              // Por nombre
              const aNombre = (a.nombre ?? a.nombreCompleto ?? '').toLowerCase();
              if (cuName && aNombre && aNombre === cuName) return true;
              return false;
            })
          : null;

        console.log('[DEBUG RESUELVE] myAbogado encontrado:', myAbogado ? JSON.stringify(myAbogado) : 'NINGUNO');

        if (myAbogado) {
          expedientesFiltrados = mapped.filter(exp => {
            if (myAbogado.id && exp.abogadoSustanciador === myAbogado.id) return true;
            if ((myAbogado as any).rawId && exp.abogadoSustanciador === (myAbogado as any).rawId) return true;
            if ((myAbogado as any).authId && exp.abogadoSustanciador === (myAbogado as any).authId) return true;
            if (myAbogado.nombre && exp.abogadoAsignado === myAbogado.nombre) return true;
            if (myAbogado.nombreCompleto && exp.abogadoAsignado === myAbogado.nombreCompleto) return true;
            return false;
          });
        } else {
          // myAbogado no encontrado: el usuario podría no estar en la lista de abogados.
          // Intentar filtrar directamente por sus IDs contra abogadoSustanciador
          expedientesFiltrados = mapped.filter(exp =>
            cuIds.has(exp.abogadoSustanciador as string)
          );
        }
        console.log('[DEBUG RESUELVE] expedientes filtrados:', expedientesFiltrados.length, 'de', mapped.length);
      }

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
    // Filtro por búsqueda
    const matchBusqueda = busqueda === '' ||
      exp.id?.toLowerCase().includes(busqueda.toLowerCase()) ||
      exp.demandante?.toLowerCase().includes(busqueda.toLowerCase()) ||
      exp.demandado?.toLowerCase().includes(busqueda.toLowerCase()) ||
      exp.juzgado?.toLowerCase().includes(busqueda.toLowerCase());

    // Filtro por Tipo de Proceso (Flexible: revisa tipo, medioControl y tipoAccion)
    // Esto asegura que sirva tanto para "Nulidad y Restablecimiento" (Medio Control)
    // como para "Tutela" (Tipo Acción)
    const matchTipo = filtroTipo === 'TODOS' ||
      exp.tipo === filtroTipo ||
      exp.tipoAccion === filtroTipo ||
      exp.medioControl === filtroTipo ||
      (exp.medioControl && exp.medioControl.includes(filtroTipo)); // Parcial match por si acaso

    // Filtro por Abogado (solo visible para Jefe/Secretariado)
    const matchAbogado = filtroAbogado === 'TODOS' ||
      exp.abogadoAsignado === filtroAbogado ||
      exp.abogadoResponsable === filtroAbogado;

    return matchBusqueda && matchTipo && matchAbogado;
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
  const expedientesPorEtapa = estadosActivos.reduce((acc: any, estado: any, index: number) => {
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

  const etapas = estadosActivos.map((estado: any) => ({
    nombre: estado.nombre,
    valor: estado.id, // Usamos el ID del estado como valor para mover
    color: estado.color,
    icono: <FileText className="w-4 h-4" style={{ color: estado.color }} />, // Icono genérico o mapeado si es posible
    diasEstimados: 15, // TODO: Mapear desde 'tiempos' si hay relación, o default
    expedientes: expedientesPorEtapa[estado.id] || []
  }));

  // Handler para guardar nueva demanda
  const handleSaveNuevaDemanda = async (demandaData: NuevaDemandaData) => {
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
        abogadoSustanciador: demandaData.abogadoAsignado,
        medioControl: demandaData.medioControl,
        juzgadoConocimiento: `${demandaData.juzgado} - ${demandaData.ciudad}, ${demandaData.departamento}`,
        ubicacionFisica: demandaData.ciudad,
        pretensionDemandante: demandaData.pretensiones,
        fechaNotificacion: demandaData.fechaNotificacion,
        fechaVencimientoTermino: demandaData.fechaVencimiento,
        etapaProcesal: demandaData.etapa || (estadosActivos.length > 0 ? estadosActivos[0].id : 'RADICACION'),
        ultimaActuacion: undefined, // Backend manages initial state or assumes created

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
      };

      await legalService.crearExpediente(expedienteData);
      toast.success('Demanda registrada exitosamente', {
        description: `Radicado: ${demandaData.numeroRadicado}`
      });
      // Recargar expedientes
      loadExpedientes();
      setModalNuevaDemandaOpen(false);
    } catch (error: any) {
      console.error('Error guardando demanda:', error);
      toast.error(error.message || 'Error al guardar la demanda');
    }
  };

  const addBtnsPermission = () => {
    if (authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_CREATE)) {
      return [{
        label: 'Nueva Demanda',
        icon: <Plus className="w-4 h-4 mr-1" />,
        onClick: () => setModalNuevaDemandaOpen(true),
        className: 'bg-orange-600 hover:bg-orange-700 text-white font-bold'
      }]
    }
    return []
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
      {/* Header con Info Tooltip */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <ModuleHeader
            title="Tablero Kanban Operativo"
            subtitle="Gestión visual de demandas judiciales contra ESAP"
            buttons={addBtnsPermission()}
            toggleView={{
              current: tipoVista,
              onChange: (v: string) => setTipoVista(v as VistaModulo),
              options: [
                { label: 'Kanban', icon: <Columns3 className="w-4 h-4" /> },
                { label: 'Lista', icon: <List className="w-4 h-4" /> },
                { label: 'Archivados', icon: <Archive className="w-4 h-4" /> }
              ]
            }}
          />
        </div>

        {/* Info Tooltip - Guía de flujo */}
        <div className="flex-shrink-0 pt-1">
          <ModuleInfoTooltip
            title="Guía de Defensa Judicial"
            variant="icon"
            sections={[
              {
                label: "📍 Punto de Inicio del Sistema",
                content: "La Defensa Judicial es donde INICIA todo el flujo cuando ESAP es demandada. Aquí llegan las notificaciones de demandas desde juzgados y se registran en el sistema.",
                type: "info"
              },
              {
                label: "⚖️ Propósito del Módulo",
                content: "Gestión centralizada de procesos judiciales activos contra ESAP: demandas laborales, nulidades y restablecimiento del derecho, acciones populares, tutelas y otros medios de control.",
                type: "default"
              },
              {
                label: "🔄 Flujo de Trabajo (4 Etapas)",
                content: "1️⃣ NOTIFICADA: Demanda recibida del juzgado → 2️⃣ CONTESTACIÓN: Redactar y presentar respuesta (30 días) → 3️⃣ PROBATORIA: Recolectar y aportar pruebas (60 días) → 4️⃣ ALEGATOS: Argumentos finales antes del fallo (20 días).",
                type: "premium"
              },
              {
                label: "🚦 Semáforo de Términos",
                content: "🟢 Verde (>15 días): En término | 🟡 Amarillo (5-15 días): Próximo a vencer | 🔴 Rojo (≤5 días): CRÍTICO - Acción inmediata requerida. El sistema alerta automáticamente.",
                type: "warning"
              },
              {
                label: "📋 Última Actuación (Bloque Azul)",
                content: "El bloque azul destacado en cada tarjeta muestra la actuación procesal más reciente del juzgado, facilitando seguimiento rápido sin abrir el expediente completo.",
                type: "default"
              },
              {
                label: "🔗 Integración con Otros Módulos",
                content: "Este módulo se conecta con: • Centro Comunicaciones (notificaciones del juzgado) • Términos e Informes (control de plazos) • Asesoría Jurídica (conceptos técnicos necesarios).",
                type: "success"
              },
              {
                label: "💡 Cómo Usar",
                content: "1️⃣ Click 'Nueva Demanda' cuando llega notificación → 2️⃣ Arrastra tarjetas entre columnas al cambiar etapa → 3️⃣ Click 'Expediente' para ver documentos completos → 4️⃣ Usa botones rápidos (Autos, Evidencias, Oficios) para gestión documental.",
                type: "default"
              },
              {
                label: "⏭️ Siguiente Paso",
                content: "Cuando el proceso judicial relaciona funcionarios internos, se deriva al módulo 'Juzgamiento Disciplinario' (MOD-02) para investigación interna paralela.",
                type: "info"
              }
            ]}
          />
        </div>
      </div>

      {/* Métricas - IGUAL A DISCIPLINARIO */}
      <ModuleMetrics
        metrics={[
          {
            value: totalExpedientes,
            label: 'Expedientes',
            icon: <FileText className="w-5 h-5" />,
            color: 'orange'
          },
          {
            value: expedientesCriticos,
            label: 'Críticos',
            icon: <AlertCircle className="w-5 h-5" />,
            color: 'red'
          },
          {
            value: expedientesEnTermino,
            label: 'En Término',
            labelMobile: 'En término',
            icon: <CheckCircle className="w-5 h-5" />,
            color: 'green'
          }
        ]}
      />

      {/* Filtros */}
      <ModuleFilters
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        filters={[
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
        onClearFilters={() => {
          setBusqueda('');
          setFiltroEtapa('TODAS');
          setFiltroTipo('TODOS');
          setFiltroAbogado('TODOS');
        }}
      />

      {/* ✅ Banner de Días Hábiles - Indicador prominente */}
      <IndicadorDiasHabiles className="animate-fade-in" />

      {/* Tablero Kanban - Diseño migrado desde SuperApp Gestión Legal */}
      {tipoVista === 'kanban' && (
        <DndProvider backend={HTML5Backend}>
          <div className="relative">
            {!useFluidKanban && (
              <div className="absolute top-2 right-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-gray-200">
                <p className="text-xs font-bold text-gray-600 flex items-center gap-1">
                  <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                  Desliza
                </p>
              </div>
            )}

            <div
              className={`flex gap-3 md:gap-4 overflow-x-auto pb-4 ${isMobile ? '-mx-4 px-4' : ''} scroll-smooth`}
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
                />
              ))}
            </div>
          </div>
        </DndProvider>
      )}

      {/* Vista de Lista - NUEVA IMPLEMENTACIÓN */}
      {tipoVista === 'lista' && (
        <VistaListaDefensaJudicial
          expedientes={etapas.flatMap((e: any) => e.expedientes)}
          isMobile={isMobile}
          isTablet={isTablet}
          onMoverExpediente={authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_ESTADOS_EDIT) ? handleMoverExpediente : undefined}
        />
      )}

      {/* Vista de Archivados */}
      {tipoVista === 'archivados' && (
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
      />
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
}

function ColumnaKanban({
  etapa,
  isMobile,
  isSmallDesktop,
  columnWidth,
  useFluid,
  onMoverExpediente,
  onRefresh
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

  return (
    <div
      className="flex-shrink-0"
      initial={{ width: 320 }}
      animate={{ width: 320 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{ maxWidth: '320px' }}
    >
      <Card className="h-full border border-gray-200 bg-white">
        <div className={`${isMobile ? 'p-2.5' : isSmallDesktop ? 'p-2.5' : 'p-3'} border-b bg-gray-50`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="p-1.5 rounded-lg bg-white border border-gray-200 flex-shrink-0">
                {etapa.icono}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-xs text-gray-800 truncate">
                  {etapa.nombre}
                </h3>
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {etapa.diasEstimados} días hábiles
                </p>
              </div>
            </div>
            <Badge className="font-semibold text-xs px-1.5 py-0.5 bg-white border border-gray-200 text-gray-700 flex-shrink-0 ml-1">
              {etapa.expedientes.length}
            </Badge>
          </div>
        </div>

        <div
          ref={drop}
          className={`${isMobile ? 'p-2' : isSmallDesktop ? 'p-1.5' : 'p-2'} space-y-2 overflow-y-auto`}
          style={{
            minHeight: isMobile ? '350px' : '400px',
            maxHeight: isMobile ? 'calc(100vh - 380px)' : 'calc(100vh - 340px)',
            backgroundColor: backgroundColor,
            borderLeft: `3px solid ${borderColor}`,
            borderRight: `3px solid ${borderColor}`,
            transition: 'all 0.2s ease'
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
  etapaActual: 'NOTIFICADA' | 'CONTESTACIÓN' | 'PROBATORIA' | 'ALEGATOS';
}

function TarjetaExpediente({ expediente, isMobile, isCompact = false, onRefresh, onMoverExpediente, etapaActual }: TarjetaExpedienteProps) {
  const [modalExpedienteOpen, setModalExpedienteOpen] = useState(false);
  const [modalComunicacionesOpen, setModalComunicacionesOpen] = useState(false);
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
  const porcentajeTiempo = Math.min(100, Math.max(0, Math.round(((expediente.diasTotales - expediente.diasRestantes) / expediente.diasTotales) * 100)));
  const procesoVencido = expediente.diasRestantes < 0;
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
    <div ref={drag} style={{ opacity, cursor: canDrag ? 'move' : 'default' }} className="h-[380px]">
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
                  {expediente.diasRestantes < 0 ? `${Math.abs(expediente.diasRestantes)}d` : `${expediente.diasRestantes}d`}
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
              label: expediente.diasRestantes < 0
                ? `${Math.abs(expediente.diasRestantes)}d`
                : `${Math.max(0, expediente.diasTotales - expediente.diasRestantes)}d`,
              color: ESAP_TOKENS.colors.text.secondary,
            },
            {
              icon: <AlertCircle className="w-3.5 h-3.5" />,
              // Evitamos porcentajes negativos o mayores a 100% si diasRestantes es negativo
              label: expediente.diasRestantes < 0 ? '0%' : `${porcentajeTiempo}%`,
              color: procesoVencido ? ESAP_TOKENS.colors.danger : ESAP_TOKENS.colors.text.secondary,
            },
          ]}
        />

        {!isCompact && (
          <div
            className="mb-2.5 p-2 rounded-lg border"
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
            >
              Expediente
            </KanbanButtonPrimary>
            <KanbanButtonSecondary
              icon={<MessageSquare className="w-3.5 h-3.5" />}
              onClick={() => setModalComunicacionesOpen(true)}
            >
              Comunic.
            </KanbanButtonSecondary>
          </KanbanActionRowPrimary>

        </KanbanActionSection>
      </KanbanCard>

      <ModalExpediente
        isOpen={modalExpedienteOpen}
        onClose={() => setModalExpedienteOpen(false)}
        expediente={expediente}
        onUpdate={onRefresh}
      />

      <ModalComunicaciones
        isOpen={modalComunicacionesOpen}
        onClose={() => setModalComunicacionesOpen(false)}
        expediente={expediente}
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
