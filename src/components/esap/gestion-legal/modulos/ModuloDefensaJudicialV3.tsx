/**
 * ModuloDefensaJudicialV3 - MOD-01: Defensa Judicial
 * VERSIÓN WORLD-CLASS - COPIADO EXACTO DE CONTROL DISCIPLINARIO
 * ✅ Responsive mobile-first FUNCIONAL
 * ✅ Colores corporativos ESAP (#003DA5)
 * ✅ Diseño mandatorio 100% igual a Control Disciplinario
 * ✅ CONECTADO CON CONFIGURACIONES CENTRALIZADAS
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Plus, FileText, FolderOpen, AlertTriangle, Clock, Calendar,
  User, MoreVertical, Eye, ChevronDown, Users, Settings,
  Maximize2, Minimize2, AlertCircle, CheckCircle,
  List, Columns3, ChevronsDown, ChevronsUp,
  Scale, DollarSign, Filter, Search,
  ExternalLink, Download, Upload, RefreshCw, Paperclip,
  MessageSquare, FileCheck, Send, Archive, Mail, Edit, Trash2
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog';
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
import { Permissions } from '../../../../enums/permissions';

// ✅ Importar configuraciones centralizadas
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';
import { VistaArchivados, ItemArchivado, EstadoArchivado } from '../design-system/VistaArchivados';
import { usePermisos, PERMISOS } from '../config/PermisosContext';

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

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [tipoVista, setTipoVista] = useState<VistaModulo>('kanban');
  const [modalNuevaDemandaOpen, setModalNuevaDemandaOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODAS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
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


  // Detectar tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Cargar expedientes desde el backend
  const loadExpedientes = async () => {
    try {
      setLoading(true);

      // Cargar expedientes y abogados en paralelo
      const [data, abogadosData] = await Promise.all([
        legalService.getExpedientes(),
        legalService.getAbogadosDashboard()
      ]);

      // Crear mapa de abogados para búsqueda rápida
      const abogadosMap = new Map();
      if (Array.isArray(abogadosData)) {
        abogadosData.forEach((a: any) => {
          const nombre = a.nombreCompleto || `${a.nombre || ''} ${a.apellido || ''}`.trim();
          if (a.id) abogadosMap.set(a.id, nombre);
        });
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
          demandantes: exp.actors ? exp.actors.filter((a: any) => a.rol === 'DEMANDANTE') : [],
          demandados: exp.actors ? exp.actors.filter((a: any) => a.rol === 'DEMANDADO') : [],
          otrosActores: exp.actors ? exp.actors.filter((a: any) => a.rol !== 'DEMANDANTE' && a.rol !== 'DEMANDADO') : [],
          medioControl: exp.medioControl || 'Nulidad y Restablecimiento del Derecho',
          diasTotales: calcularDiasTotales(
            new Date(exp.fechaNotificacion || Date.now()),
            new Date(exp.fechaVencimientoTermino || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))
          ),
          diasRestantes: calcularDiasRestantes(new Date(exp.fechaVencimientoTermino || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))),
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
          hechos: '',
          pretensiones: exp.pretensionDemandante || '',
          pretensionDemandante: exp.pretensionDemandante,
          tipoProceso: exp.tipoProceso,
          documentos: new Array(Number(exp.documentosCount || 0) + (exp.documentosInicialesUrls?.length || 0)).fill({}),
          actuaciones: exp.actuaciones || [],
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
      setExpedientes(mapped);
      console.log('🗂️ [DEBUG] Mapped expedientes:', mapped.map(e => ({ id: e.id, etapa: e.etapa, radicado: e.radicado })));
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
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Calcular días restantes hasta vencimiento
  const calcularDiasRestantes = (fechaVencimiento: Date): number => {
    const hoy = new Date();
    const diff = fechaVencimiento.getTime() - hoy.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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

    return matchBusqueda && matchTipo;
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
        cuantia: parseFloat(demandaData.cuantia.replace(/[^0-9]/g, '')) || 0,
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
          }
        ]}
        totalItems={totalExpedientes}
        filteredItems={expedientesVisibles.length}
        onClearFilters={() => {
          setBusqueda('');
          setFiltroEtapa('TODAS');
          setFiltroTipo('TODOS');
        }}
      />

      {/* ✅ Banner de Días Hábiles - Indicador prominente */}
      <IndicadorDiasHabiles className="animate-fade-in" />

      {/* Tablero Kanban - IGUAL A DISCIPLINARIO */}
      {tipoVista === 'kanban' && (
        <DndProvider backend={HTML5Backend}>
          <div className="relative">
            {/* Indicador de scroll en mobile/tablet */}
            {(isMobile || isTablet) && (
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
        />
      )}

      {/* Vista de Archivados */}
      {tipoVista === 'archivados' && (
        <VistaArchivados
          items={itemsArchivados}
          moduloNombre="Defensa Judicial"
          onRestaurar={handleRestaurar}
          onEliminarPermanente={handleEliminarPermanente}
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
  onMoverExpediente: (expedienteId: string, nuevaEtapa: string) => void;
  onRefresh?: () => void;
}

function ColumnaKanban({ etapa, isMobile, isTablet, onMoverExpediente, onRefresh }: ColumnaKanbanProps) {
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.EXPEDIENTE,
    drop: (item: { id: string }) => onMoverExpediente(item.id, etapa.valor),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const backgroundColor = isOver ? '#F0F7FF' : 'transparent';
  const borderColor = isOver ? '#2962FF' : 'transparent';

  // Cast drop ref to any to avoid React 18 type conflict with React DnD
  const dropRef = drop as unknown as React.LegacyRef<HTMLDivElement>;

  return (
    <motion.div
      className="flex-shrink-0"
      initial={{ width: 320 }}
      animate={{ width: 320 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <Card className="h-full border border-gray-200 bg-white">
        {/* Header de Columna */}
        <div className={`${isMobile ? 'p-3' : 'p-4'} border-b bg-gray-50`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1">
              <div className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-lg bg-white border border-gray-200`}>
                {etapa.icono}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-black ${isMobile ? 'text-xs' : 'text-sm'} text-gray-800`}>
                  {etapa.nombre}
                </h3>
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {etapa.diasEstimados} días hábiles
                </p>
              </div>
            </div>
            <Badge className={`font-semibold ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'} bg-white border border-gray-200 text-gray-700`}>
              {etapa.expedientes.length}
            </Badge>
          </div>
        </div>

        {/* Lista de Expedientes */}
        <div
          ref={dropRef}
          className={`${isMobile ? 'p-2' : 'p-3'} space-y-3 overflow-y-auto`}
          style={{
            minHeight: isMobile ? '400px' : '500px',
            maxHeight: isMobile ? 'calc(100vh - 380px)' : 'calc(100vh - 280px)',
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
    </motion.div>
  );
}

// ==================== COMPONENTE TARJETA EXPEDIENTE ====================
interface TarjetaExpedienteProps {
  expediente: ExpedienteJudicial;
  isMobile: boolean;
  onRefresh?: () => void;
  onMoverExpediente: (expedienteId: string, nuevaEtapa: string) => void;
  etapaActual: string;
}

function TarjetaExpediente({ expediente, isMobile, onRefresh, onMoverExpediente, etapaActual }: TarjetaExpedienteProps) {
  // Estados para modales
  const [modalExpedienteOpen, setModalExpedienteOpen] = useState(false);
  const [modalComunicacionesOpen, setModalComunicacionesOpen] = useState(false);
  const [modalAutosOpen, setModalAutosOpen] = useState(false);
  const [modalEvidenciasOpen, setModalEvidenciasOpen] = useState(false);
  const [modalOficiosOpen, setModalOficiosOpen] = useState(false);
  const [modalActasOpen, setModalActasOpen] = useState(false);
  const [showEliminarModal, setShowEliminarModal] = useState(false);

  const puedeEliminar = true; // authService.hasPermission(Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_MANAGE);

  // Handler para abrir modal de expediente
  const handleAbrirExpediente = () => {
    setModalExpedienteOpen(true);
  };

  // Handler para abrir modal de eliminar
  const handleEliminarExpediente = () => {
    setShowEliminarModal(true);
  };

  // Confirmar eliminación del expediente
  const confirmarEliminar = async () => {
    const id = expediente.uuid || expediente.id;
    if (!id) {
      toast.error('No se encontró el ID del expediente');
      return;
    }

    try {
      // Usar soft delete para mover a "Eliminados" en la vista de archivos
      await legalService.eliminarExpedienteSoft(id, 'Eliminado desde Kanban', 'Usuario Actual');
      toast.success('Expediente movido a papelera', {
        description: `Radicado ${expediente.id}`
      });
      setShowEliminarModal(false);
      onRefresh?.();
    } catch (error) {
      console.error('Error eliminando expediente:', error);
      toast.error('No se pudo eliminar el expediente');
    }
  };

  // Determinar semáforo
  const getSemaforoColor = (diasRestantes: number) => {
    if (diasRestantes <= 5) return { color: '#DC2626', label: 'Vencido' };
    if (diasRestantes <= 15) return { color: '#F59E0B', label: 'Próximo' };
    return { color: '#10B981', label: 'En término' };
  };

  const semaforo = getSemaforoColor(expediente.diasRestantes);
  const porcentajeTiempo = Math.round(((expediente.diasTotales - expediente.diasRestantes) / expediente.diasTotales) * 100);
  const ultimaActuacion = expediente.ultimaActuacion?.descripcion || `Expediente en etapa de ${expediente.etapa}`;

  // Drag and Drop
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.EXPEDIENTE,
    item: { id: expediente.id, etapa: etapaActual },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  // Cast drag ref
  const dragRef = drag as unknown as React.LegacyRef<HTMLDivElement>;

  const opacity = isDragging ? 0.5 : 1;

  return (
    <div ref={dragRef} style={{ opacity, cursor: 'move' }}>
      <Card className="bg-white border border-gray-200 hover:shadow-md transition-all">
        <div className="h-1" style={{ background: '#003DA5' }} />

        <div className={`${isMobile ? 'p-2.5' : 'p-3'}`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={`${isMobile ? 'p-1' : 'p-1.5'} rounded-lg flex-shrink-0`}
                style={{ background: '#E0EDFF' }}
              >
                <Scale className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#003DA5' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} truncate`} style={{ color: '#003DA5' }}>
                  {expediente.id}
                </h4>
                <p className="text-xs text-gray-600 truncate">{expediente.medioControl}</p>
              </div>
            </div>
            {puedeEliminar && (
              <Button
                size="icon"
                variant="ghost"
                title="Eliminar expediente"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={(e: any) => {
                  e.stopPropagation();
                  handleEliminarExpediente();
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👤 Partes Procesales:</p>

            {/* Demandantes */}
            {expediente.demandantes && expediente.demandantes.length > 0 ? (
              <div className="mb-1.5">
                <p className="text-xs font-semibold text-orange-700 mb-0.5">Demandante(s):</p>
                <div className="space-y-0.5">
                  {expediente.demandantes.map((demandante, idx) => (
                    <p key={idx} className={`font-bold ${isMobile ? 'text-xs' : 'text-xs'} text-gray-900 line-clamp-1`}>
                      • {demandante.nombre}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
                {expediente.demandante}
              </p>
            )}

            {/* Demandados */}
            {expediente.demandados && expediente.demandados.length > 0 && (
              <div className="mb-1.5">
                <p className="text-xs font-semibold text-red-700 mb-0.5">Demandado(s):</p>
                <div className="space-y-0.5">
                  {expediente.demandados.map((demandado, idx) => (
                    <p key={idx} className={`font-bold ${isMobile ? 'text-xs' : 'text-xs'} text-gray-900 line-clamp-1`}>
                      • {demandado.nombre} <span className="text-[10px] text-gray-600">({demandado.cargo})</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Otros Actores */}
            {expediente.otrosActores && expediente.otrosActores.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-0.5">Otros Actores:</p>
                <div className="space-y-0.5">
                  {expediente.otrosActores.map((actor, idx) => (
                    <p key={idx} className={`font-bold ${isMobile ? 'text-xs' : 'text-xs'} text-gray-900 line-clamp-1`}>
                      • {actor.nombre} <span className="text-[10px] text-gray-600">({actor.rol})</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mb-2 pb-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Avatar className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0`}>
                <AvatarFallback
                  className="text-xs"
                  style={{ background: '#E0EDFF', color: '#003DA5' }}
                >
                  {(expediente.abogadoAsignado || 'ESAP')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">👨‍💼 Profesional:</p>
                <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
                  {expediente.abogadoAsignado || 'No asignado'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-2">
            <Badge
              className="text-xs flex items-center gap-1 font-semibold bg-gray-50 border border-gray-200"
              style={{ color: semaforo.color }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: semaforo.color }} />
              {expediente.diasRestantes} días
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{expediente.documentos?.length || 0}</p>
              <p className="text-xs text-gray-500">Docs</p>
            </div>
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{expediente.diasTotales - expediente.diasRestantes}</p>
              <p className="text-xs text-gray-500">Días</p>
            </div>
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{porcentajeTiempo}%</p>
              <p className="text-xs text-gray-500">Tiempo</p>
            </div>
          </div>

          <div className="mb-2 p-2 rounded-lg" style={{ backgroundColor: '#F0F7FF', border: '1px solid #BFDBFE' }}>
            <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: '#003DA5' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#003DA5' }}></span>
              ÚLTIMA ACTUACIÓN
            </p>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 line-clamp-2 mb-1`}>{ultimaActuacion}</p>
            <p className="text-xs text-gray-500">📅 {expediente.fechaActualizacion.toLocaleDateString('es-CO')}</p>
          </div>

          <div className="space-y-1 pt-2 border-t border-gray-200">
            <Button
              onClick={handleAbrirExpediente}
              size="sm"
              className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Archive className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1 flex-shrink-0`} />
              Expediente
            </Button>

            <div className="grid grid-cols-2 gap-1">
              <Button
                onClick={() => setModalAutosOpen(true)}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
              >
                <Scale className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
                Autos
              </Button>

              <Button
                onClick={() => setModalEvidenciasOpen(true)}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
              >
                <Paperclip className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
                Evidencias
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-1">
              <Button
                onClick={() => setModalOficiosOpen(true)}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
              >
                <Send className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
                Oficios
              </Button>

              <Button
                onClick={() => setModalActasOpen(true)}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
              >
                <FileCheck className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
                Actas
              </Button>
            </div>

            <Button
              onClick={() => setModalComunicacionesOpen(true)}
              size="sm"
              className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <MessageSquare className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
              Comunicaciones del Proceso
            </Button>
          </div>
        </div>

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

        <ModalAutos
          isOpen={modalAutosOpen}
          onClose={() => setModalAutosOpen(false)}
          expediente={expediente}
          modulo='defensa-judicial'
        />

        <ModalEvidencias
          isOpen={modalEvidenciasOpen}
          onClose={() => setModalEvidenciasOpen(false)}
          expediente={expediente}
          modulo='defensa-judicial'
        />

        <ModalOficios
          isOpen={modalOficiosOpen}
          onClose={() => setModalOficiosOpen(false)}
          expediente={expediente}
          modulo='defensa-judicial'
        />

        <ModalActas
          isOpen={modalActasOpen}
          onClose={() => setModalActasOpen(false)}
          expediente={expediente}
          modulo='defensa-judicial'
        />

        {/* Modal de confirmación de eliminación */}
        <Dialog open={showEliminarModal} onOpenChange={setShowEliminarModal}>
          <DialogContent
            className="sm:max-w-[380px] w-[90vw] !max-w-[380px] !w-auto p-0 overflow-hidden"
            style={{ maxWidth: '380px', width: '100%' }}
          >
            <DialogHeader className="p-4 pb-2">
              <DialogTitle className="flex items-center gap-2 text-base text-red-600">
                <Trash2 className="w-5 h-5" />
                Eliminar Expediente
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 pt-0">
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold">¿Eliminar este expediente?</p>
                  <p className="text-xs mt-1 opacity-80">
                    Se moverá a la papelera. Podrá restaurarlo o eliminarlo permanentemente desde la vista de Archivados.
                  </p>
                </div>
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
                onClick={confirmarEliminar}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}
