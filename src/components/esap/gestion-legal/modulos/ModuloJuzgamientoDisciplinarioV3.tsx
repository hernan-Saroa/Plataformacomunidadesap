/**
 * ModuloJuzgamientoDisciplinarioV3 - MOD-02: Juzgamiento Disciplinario
 * DISEÑO 100% IDÉNTICO A DEFENSA JUDICIAL
 * ✅ Responsive mobile-first FUNCIONAL
 * ✅ Drag & Drop FUNCIONAL
 * ✅ Tarjetas 320px con bloque "Última Actuación"
 * ✅ CONECTADO CON CONFIGURACIONES CENTRALIZADAS
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Plus, FileText, FolderOpen, AlertTriangle, Clock, Calendar,
  User, Eye, ChevronDown, Users, Settings,
  AlertCircle, CheckCircle,
  List, Columns3, ChevronsDown, ChevronsUp,
  Scale, Filter, Search,
  Download, Upload, RefreshCw, Paperclip,
  MessageSquare, FileCheck, Send, Archive, Mail, Edit, Gavel, X, ArrowRight
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Textarea } from '../../../ui/textarea';
import { Label } from '../../../ui/label';
import { Input } from '../../../ui/input';
import type { ProcesoDisciplinario } from '../core/types';
import { procesosDisciplinariosMock } from '../data/datosProcesosDisciplinarios';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { ModalProcesoDisciplinario } from './ModalProcesoDisciplinario';
import { ModalComunicaciones } from './ModalComunicaciones';
import { ModalAutos } from './ModalAutos';
import { ModalEvidencias } from './ModalEvidencias';
import { ModalOficios } from './ModalOficios';
import { ModalActas } from './ModalActas';
import { ModalNuevoProcesoDisciplinario } from './ModalNuevoProcesoDisciplinario';

import { VistaListaJuzgamiento } from './VistaListaJuzgamiento';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// ✅ Importar configuraciones centralizadas
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';
import { VistaArchivados, ItemArchivado, EstadoArchivado } from '../design-system/VistaArchivados';
import { usePermisos, PERMISOS } from '../config/PermisosContext';

// Tipo para drag and drop
const ItemTypes = {
  PROCESO: 'proceso_disciplinario'
};

import { legalService } from '../../../../services/api/legal.service';

// ... (previous imports)

export function ModuloJuzgamientoDisciplinarioV3() {
  // ✅ Obtener configuraciones desde el Context API
  const { estadosActivos, tiempos } = useConfiguracionModulo('juzgamiento');

  // ✅ Obtener permisos del usuario actual
  const { usuario } = usePermisos();

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [tipoVista, setTipoVista] = useState<'kanban' | 'lista' | 'archivados'>('kanban');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODAS');
  const [filtroGravedad, setFiltroGravedad] = useState<string>('TODAS');
  const [modalNuevoProcesoOpen, setModalNuevoProcesoOpen] = useState(false);

  // Estado local para manejar drag and drop
  const [procesos, setProcesos] = useState<ProcesoDisciplinario[]>([]);

  // ✅ Estado para modal de confirmación de cambio de etapa
  const [modalCambioEtapaOpen, setModalCambioEtapaOpen] = useState(false);
  const [cambioEtapaPendiente, setCambioEtapaPendiente] = useState<{
    procesoId: string;
    procesoRadicado: string;
    etapaActual: string;
    nuevaEtapa: string;
  } | null>(null);
  const [justificacionCambio, setJustificacionCambio] = useState('');
  const [archivoCambio, setArchivoCambio] = useState<File | null>(null);
  const [guardandoCambio, setGuardandoCambio] = useState(false);

  // ✅ Estado para items archivados/eliminados
  const [itemsArchivados, setItemsArchivados] = useState<ItemArchivado[]>([
    {
      id: 'PD-999',
      codigo: 'DISC-2023-999',
      nombre: 'Falta Gravísima - Malversación de Fondos - Carlos Andrés Mora',
      tipo: 'Proceso Disciplinario',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-12-20T15:30:00'),
      usuarioArchivo: 'Dr. Juan Carlos Pérez',
      motivoArchivo: 'Proceso terminado por prescripción de la acción disciplinaria (Art. 30 Ley 734/2002)',
      metadatos: {
        'Tipo Falta': 'GRAVÍSIMA',
        'Funcionario': 'Carlos Andrés Mora Gutiérrez',
        'Cargo': 'Coordinador Administrativo',
        'Investigador': 'Dr. Juan Carlos Pérez',
        'Fecha Inicio': '15/03/2020',
        'Motivo Archivo': 'Prescripción'
      }
    },
    {
      id: 'PD-998',
      codigo: 'DISC-2023-888',
      nombre: 'Falta Grave - Incumplimiento de Horario - Ana María Castro',
      tipo: 'Proceso Disciplinario',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-11-18T11:20:00'),
      usuarioArchivo: 'Dra. Ana María López',
      motivoArchivo: 'Archivo definitivo por ausencia de mérito para continuar la investigación disciplinaria',
      metadatos: {
        'Tipo Falta': 'GRAVE',
        'Funcionario': 'Ana María Castro Pérez',
        'Cargo': 'Asistente Administrativa',
        'Investigador': 'Dra. Ana María López',
        'Fecha Inicio': '10/08/2023',
        'Resultado': 'Archivo por falta de mérito'
      }
    },
    {
      id: 'PD-997',
      codigo: 'DISC-2023-777',
      nombre: 'Falta Leve - Uso Indebido de Computador - Pedro Ramírez',
      tipo: 'Proceso Disciplinario',
      estado: 'ELIMINADO',
      fechaArchivado: new Date('2024-10-25T09:45:00'),
      usuarioArchivo: 'Dr. Juan Carlos Pérez',
      motivoArchivo: 'Proceso duplicado - El caso real está bajo radicado DISC-2023-778. Error de digitación en el sistema',
      metadatos: {
        'Tipo Falta': 'LEVE',
        'Funcionario': 'Pedro Ramírez González',
        'Motivo Eliminación': 'Registro Duplicado'
      }
    },
    {
      id: 'PD-996',
      codigo: 'DISC-2022-666',
      nombre: 'Falta Gravísima - Acoso Laboral - Luis Fernando Díaz',
      tipo: 'Proceso Disciplinario',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-09-12T16:10:00'),
      usuarioArchivo: 'Dra. Ana María López',
      motivoArchivo: 'Sanción ejecutoriada: Destitución e inhabilidad de 15 años. Resolución notificada y en firme',
      metadatos: {
        'Tipo Falta': 'GRAVÍSIMA',
        'Funcionario': 'Luis Fernando Díaz Parra',
        'Cargo': 'Jefe de Departamento',
        'Sanción': 'Destitución e Inhabilidad 15 años',
        'Fecha Sanción': '05/09/2024',
        'Estado': 'Ejecutoriada'
      }
    },
    {
      id: 'PD-995',
      codigo: 'DISC-2024-555',
      nombre: 'Falta Grave - Absentismo Laboral - María Fernanda Torres',
      tipo: 'Proceso Disciplinario',
      estado: 'ELIMINADO',
      fechaArchivado: new Date('2024-08-08T14:30:00'),
      usuarioArchivo: 'Admin Sistema',
      motivoArchivo: 'Registro erróneo - No corresponde a funcionario de ESAP. Persona externa a la institución',
      metadatos: {
        'Tipo Falta': 'GRAVE',
        'Motivo Eliminación': 'Error de registro - No es funcionario ESAP'
      }
    },
    {
      id: 'PD-994',
      codigo: 'DISC-2023-444',
      nombre: 'Falta Gravísima - Cohecho - Roberto Sánchez Mora',
      tipo: 'Proceso Disciplinario',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-07-15T10:00:00'),
      usuarioArchivo: 'Dr. Juan Carlos Pérez',
      motivoArchivo: 'Remisión a Fiscalía General de la Nación por presunta conducta punible (Art. 406 C.P.). Se suspende proceso disciplinario',
      metadatos: {
        'Tipo Falta': 'GRAVÍSIMA',
        'Funcionario': 'Roberto Sánchez Mora',
        'Cargo': 'Supervisor de Contratos',
        'Investigador': 'Dr. Juan Carlos Pérez',
        'Motivo': 'Remisión a Fiscalía',
        'Radicado Fiscalía': 'FGN-2024-00123'
      }
    },
    {
      id: 'PD-993',
      codigo: 'DISC-2023-333',
      nombre: 'Falta Grave - Negligencia en Funciones - Carmen Lucía Vega',
      tipo: 'Proceso Disciplinario',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-06-20T13:45:00'),
      usuarioArchivo: 'Dra. Ana María López',
      motivoArchivo: 'Sanción ejecutoriada: Suspensión de 30 días sin remuneración. Ya cumplida íntegramente',
      metadatos: {
        'Tipo Falta': 'GRAVE',
        'Funcionario': 'Carmen Lucía Vega Ruiz',
        'Cargo': 'Profesional Especializado',
        'Sanción': 'Suspensión 30 días',
        'Fecha Sanción': '01/06/2024',
        'Fecha Cumplimiento': '18/06/2024',
        'Estado': 'Sanción cumplida'
      }
    }
  ]);

  // ✅ Función para restaurar un proceso archivado
  const handleRestaurar = async (itemId: string) => {
    console.log('Restaurando proceso disciplinario:', itemId);

    // Simulación: En producción esto haría una llamada al backend
    // await api.restaurarProceso(itemId);

    // Remover de la lista de archivados
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));

    // Aquí se agregaría de vuelta a los procesos activos
  };

  // ✅ Función para eliminar permanentemente un proceso
  const handleEliminarPermanente = async (itemId: string) => {
    console.log('Eliminando permanentemente proceso disciplinario:', itemId);

    // Simulación: En producción esto haría una llamada al backend
    // await api.eliminarPermanente(itemId);

    // Remover de la lista de archivados
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
  };

  // ✅ Log de configuraciones cargadas
  useEffect(() => {
    console.log('🎯 JUZGAMIENTO - Configuraciones centralizadas cargadas:');
    console.log('   📊 Estados activos:', estadosActivos.length);
    console.log('   ⏱️ Tiempos configurados:', tiempos.length);
    console.log('   ✅ Conexión con ConfiguracionesSIGL establecida');
  }, [estadosActivos, tiempos]);

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

  // ✅ Fetch Data from API (extracted for reuse)
  const fetchProcesos = async () => {
    try {
      const data = await legalService.getJuzgamientoProcesos();
      const mappedData = data.map((p: any) => ({
        ...p,
        fechaHechos: new Date(), // Mock/Default
        fechaUltimaActuacion: new Date(),
        fechaActualizacion: new Date(),
        diasTotales: 90, // Default constant
        disciplinado: p.investigado, // Map backend 'investigado' to frontend 'disciplinado'
        ultimaActuacion: p.actuaciones && p.actuaciones.length > 0 ? p.actuaciones[0].descripcion : 'Inicio del proceso',
        documentosAdjuntos: p.documentos ? p.documentos.length : 0,
      }));
      setProcesos(mappedData);
    } catch (error) {
      console.error('Error fetching procesos:', error);
      toast.error('Error al cargar expedientes disciplinarios');
    }
  };

  useEffect(() => {
    fetchProcesos();
  }, []);

  // Manejar movimiento de proceso entre etapas - AHORA REQUIERE JUSTIFICACIÓN
  const handleMoverProceso = async (procesoId: string, nuevaEtapa: string) => {
    // Buscar el proceso para obtener info adicional
    const proceso = procesos.find(p => p.id === procesoId);
    if (!proceso) {
      toast.error('Proceso no encontrado');
      return;
    }

    // NO hacer cambio directo - Abrir modal de confirmación
    setCambioEtapaPendiente({
      procesoId,
      procesoRadicado: proceso.id,
      etapaActual: proceso.etapa || 'Sin etapa',
      nuevaEtapa
    });
    setJustificacionCambio('');
    setArchivoCambio(null);
    setModalCambioEtapaOpen(true);
  };

  // Handler para confirmar cambio de etapa CON justificación
  const handleConfirmarCambioEtapa = async () => {
    if (!cambioEtapaPendiente) return;

    if (!justificacionCambio.trim()) {
      toast.error('Justificación requerida', {
        description: 'Debe ingresar una justificación para el cambio de etapa'
      });
      return;
    }

    if (justificacionCambio.trim().length < 20) {
      toast.error('Justificación muy corta', {
        description: 'La justificación debe tener al menos 20 caracteres'
      });
      return;
    }

    setGuardandoCambio(true);

    try {
      // 1. Crear Actuación en historial (SIEMPRE, con o sin archivo)
      const descripcionActuacion = `CAMBIO DE ETAPA: ${cambioEtapaPendiente.etapaActual} → ${cambioEtapaPendiente.nuevaEtapa}. Justificación: ${justificacionCambio}`;

      await legalService.createJuzgamientoActuacion(cambioEtapaPendiente.procesoId, {
        tipoActuacion: 'CAMBIO_ETAPA',
        descripcion: descripcionActuacion,
        fechaActuacion: new Date().toISOString(),
        file: archivoCambio || undefined
      });

      // 2. Actualizar etapa en backend
      await legalService.updateJuzgamientoProceso(cambioEtapaPendiente.procesoId, {
        etapa: cambioEtapaPendiente.nuevaEtapa
      });

      // 3. Actualización local optimista
      setProcesos((prevProcesos) =>
        prevProcesos.map((p) =>
          p.id === cambioEtapaPendiente.procesoId
            ? { ...p, etapa: cambioEtapaPendiente.nuevaEtapa as any }
            : p
        )
      );

      toast.success('Cambio de etapa registrado', {
        description: `${cambioEtapaPendiente.etapaActual} → ${cambioEtapaPendiente.nuevaEtapa}${archivoCambio ? ' (con documento)' : ''}`
      });

      // Cerrar modal y limpiar
      setModalCambioEtapaOpen(false);
      setCambioEtapaPendiente(null);
      setJustificacionCambio('');
      setArchivoCambio(null);

    } catch (error) {
      console.error('Error al cambiar etapa:', error);
      toast.error('Error al guardar cambio', {
        description: 'No se pudo registrar el cambio de etapa'
      });
    } finally {
      setGuardandoCambio(false);
    }
  };

  // Handler para cancelar cambio
  const handleCancelarCambioEtapa = () => {
    setModalCambioEtapaOpen(false);
    setCambioEtapaPendiente(null);
    setJustificacionCambio('');
    setArchivoCambio(null);
  };

  // Agrupar procesos por etapa de forma dinámica
  const procesosPorEtapa = estadosActivos.reduce((acc, estado) => {
    // Normalizar ID de estado para comparar
    // El backend suele devolver etapas en mayúsculas o con guiones bajos (e.g. E1_AVOCAMIENTO vs E1_AVOCAMIENTO)
    // Aquí hacemos match flexible
    acc[estado.id] = procesos.filter(p => {
      const stage = p.etapa ? p.etapa.toString().toLowerCase().replace(/_/g, '-') : '';
      // Intentamos match exacto con ID o nombre
      return stage === estado.id.toLowerCase() ||
        stage === estado.nombre.toLowerCase().replace(/ /g, '-') ||
        p.etapa === estado.id || // Match directo ID
        p.etapa === estado.nombre; // Match directo Nombre
    });
    return acc;
  }, {} as Record<string, ProcesoDisciplinario[]>);

  // Calcular estadísticas
  const procesosVisibles = Object.values(procesosPorEtapa).flat();
  const totalProcesos = procesosVisibles.length;
  // Usamos filtered length si hay filtros aplicados, pero aquí mostramos totales generales de lo visible
  // Si quisiéramos métricas globales, usaríamos 'procesos' completo. Aquí usamos lo que se mapeó a etapas activas.

  const procesosCriticos = procesosVisibles.filter(p => p.diasRestantes <= 3).length;
  const procesosEnTermino = procesosVisibles.filter(p => p.diasRestantes > 5).length;

  const etapas = estadosActivos.map(estado => ({
    nombre: estado.nombre,
    valor: estado.id,
    color: estado.color,
    icono: <FileText className="w-4 h-4" style={{ color: estado.color }} />,
    // Intentar emparejar tiempo configurado con nombre del estado (búsqueda flexible)
    diasEstimados: (tiempos && tiempos.find(t =>
      t.tipo.toLowerCase().includes(estado.nombre.toLowerCase()) ||
      estado.nombre.toLowerCase().includes(t.tipo.toLowerCase())
    ))?.dias || 10,
    procesos: procesosPorEtapa[estado.id] || []
  }));

  // Filtrado final para la vista (si se implementara filtroEtapa en el render)
  // Nota: Actualmente el render mapea 'etapas', así que el filtroEtapa debería afectar qué columnas se muestran o filtrar items dentro.
  // En Kanban usualmente se muestran todas las columnas pero se pueden filtrar items.
  // Aquí, ModuleFilters controla 'filtroEtapa', pero 'etapas' mapea todo. 
  // Implementemos lógica de filtrado visual si es necesario, o dejamos todas las columnas.

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header con ModuleHeader */}
      <ModuleHeader
        title={isMobile ? 'Kanban Operativo' : 'Tablero Kanban Operativo'}
        subtitle="Gestión visual de procesos disciplinarios"
        toggleView={{
          current: tipoVista,
          onChange: (view) => setTipoVista(view as 'kanban' | 'lista' | 'archivados'),
          options: [
            { label: 'Kanban', icon: <Columns3 className="w-4 h-4" />, value: 'kanban' },
            { label: 'Lista', icon: <List className="w-4 h-4" />, value: 'lista' },
            { label: 'Archivados', icon: <Archive className="w-4 h-4" />, value: 'archivados' }
          ]
        }}
        buttons={[
          {
            label: 'Nuevo Proceso',
            labelMobile: 'Nuevo',
            icon: <Plus className="w-4 h-4" />,
            onClick: () => setModalNuevoProcesoOpen(true),
            variant: 'primary'
          }
        ]}
        infoTooltip={
          <ModuleInfoTooltip
            title="Guía de Juzgamiento Disciplinario"
            variant="icon"
            sections={[
              {
                label: "🔗 Procedencia del Flujo",
                content: "Este módulo recibe casos de dos fuentes: 1) Derivados desde Defensa Judicial cuando un proceso judicial involucra conductas de funcionarios internos, 2) Quejas o denuncias directas contra empleados de ESAP.",
                type: "info"
              },
              {
                label: "⚖️ Propósito del Módulo",
                content: "Control y seguimiento de procesos disciplinarios internos contra funcionarios de ESAP, garantizando cumplimiento de términos legales y debido proceso según la Ley 734 de 2002 (Código Disciplinario Único).",
                type: "default"
              },
              {
                label: "🔄 Flujo de Trabajo (Etapas Dinámicas)",
                content: "Las etapas del proceso son configurables desde el módulo de Configuraciones SIGL. Por defecto incluye: Queja, Indagación, Formulación de Cargos, Descargos, Pruebas y Fallo.",
                type: "premium"
              },
              {
                label: "🚦 Semáforo de Términos",
                content: "🟢 Verde (>5 días): En término | 🟡 Amarillo (3-5 días): Próximo a vencer | 🔴 Rojo (≤3 días): CRÍTICO. Los términos disciplinarios son PERENTORIOS e improrrogables.",
                type: "warning"
              },
              {
                label: "👤 Disciplinado y Cargo",
                content: "Cada tarjeta muestra el nombre del funcionario investigado y su cargo, respetando la confidencialidad del proceso según la ley.",
                type: "default"
              },
              {
                label: "📋 Última Actuación (Bloque Azul)",
                content: "Destacado en fondo azul (#F0F7FF), muestra la actuación administrativa más reciente: auto de apertura, citación a descargos, resolución, etc.",
                type: "default"
              },
            ]}
          />
        }
      />

      {/* Métricas - IGUAL A DEFENSA JUDICIAL */}
      <ModuleMetrics
        metrics={[
          {
            value: totalProcesos,
            label: 'Procesos',
            icon: <FileText className="w-5 h-5" />,
            color: 'orange'
          },
          {
            value: procesosCriticos,
            label: 'Críticos',
            icon: <AlertCircle className="w-5 h-5" />,
            color: 'red'
          },
          {
            value: procesosEnTermino,
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
            label: 'Etapa',
            value: filtroEtapa,
            onChange: (value) => setFiltroEtapa(value),
            type: 'select',
            options: [
              { label: 'Todas', value: 'TODAS' },
              ...etapas.map(e => ({ label: e.nombre, value: e.nombre }))
            ]
          },
          {
            label: 'Gravedad',
            value: filtroGravedad,
            onChange: (value) => setFiltroGravedad(value),
            type: 'select',
            options: [
              { label: 'Todas', value: 'TODAS' },
              { label: 'Leve', value: 'LEVE' },
              { label: 'Moderada', value: 'MODERADA' },
              { label: 'Grave', value: 'GRAVE' }
            ]
          }
        ]}
      />

      {/* Tablero Kanban - IGUAL A DEFENSA JUDICIAL */}
      {tipoVista === 'kanban' && (
        <DndProvider backend={HTML5Backend}>
          <div className="relative">
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
              {etapas.map((etapa) => (
                <ColumnaKanban
                  key={etapa.nombre}
                  etapa={etapa}
                  isMobile={isMobile}
                  isTablet={isTablet}
                  handleMoverProceso={handleMoverProceso}
                />
              ))}
            </div>
          </div>
        </DndProvider>
      )}

      {/* Vista Lista */}
      {tipoVista === 'lista' && (
        <VistaListaJuzgamiento
          procesos={procesos} // Nota: VistaLista podría necesitar ajuste si espera usar las etapas dinámicas para algo, pero por ahora pasamos los procesos crudos.
          isMobile={isMobile}
          isTablet={isTablet}
        />
      )}

      {/* ✅ MODAL DE CONFIRMACIÓN DE CAMBIO DE ETAPA */}
      <Dialog open={modalCambioEtapaOpen} onOpenChange={setModalCambioEtapaOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ArrowRight className="w-5 h-5 text-blue-600" />
            Confirmar Cambio de Etapa
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Debe justificar el cambio de etapa. Opcionalmente puede adjuntar un documento de soporte.
          </DialogDescription>

          {cambioEtapaPendiente && (
            <div className="space-y-4 mt-4">
              {/* Info del cambio */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Proceso: <span className="font-bold">{cambioEtapaPendiente.procesoRadicado}</span>
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="bg-gray-100">{cambioEtapaPendiente.etapaActual}</Badge>
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                  <Badge className="bg-blue-600 text-white">{cambioEtapaPendiente.nuevaEtapa}</Badge>
                </div>
              </div>

              {/* Justificación (requerida) */}
              <div className="space-y-2">
                <Label htmlFor="justificacion" className="font-bold text-gray-700">
                  Justificación del cambio <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="justificacion"
                  placeholder="Describa la razón del cambio de etapa (mínimo 20 caracteres)..."
                  value={justificacionCambio}
                  onChange={(e) => setJustificacionCambio(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  {justificacionCambio.length}/20 caracteres mínimos
                </p>
              </div>

              {/* Documento de soporte (opcional) */}
              <div className="space-y-2">
                <Label htmlFor="documento" className="font-bold text-gray-700">
                  Documento de soporte <span className="text-gray-400">(opcional)</span>
                </Label>
                <Input
                  id="documento"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => setArchivoCambio(e.target.files?.[0] || null)}
                />
                {archivoCambio && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                    <FileCheck className="w-4 h-4" />
                    {archivoCambio.name}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => setArchivoCambio(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Advertencia */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800">
                    <strong>Importante:</strong> Este cambio quedará registrado en el historial del proceso
                    con su justificación y el usuario que lo realizó.
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancelarCambioEtapa}
                  disabled={guardandoCambio}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleConfirmarCambioEtapa}
                  disabled={guardandoCambio || justificacionCambio.trim().length < 20}
                >
                  {guardandoCambio ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmar Cambio
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Vista Archivados */}
      {tipoVista === 'archivados' && (
        <VistaArchivados
          items={itemsArchivados}
          moduloNombre="Juzgamiento Disciplinario"
          onRestaurar={handleRestaurar}
          onEliminarPermanente={handleEliminarPermanente}
        />
      )}

      {/* Modal Nuevo Proceso */}
      <ModalNuevoProcesoDisciplinario
        isOpen={modalNuevoProcesoOpen}
        onClose={() => setModalNuevoProcesoOpen(false)}
        onSubmit={() => {
          setModalNuevoProcesoOpen(false);
          fetchProcesos(); // Re-fetch from backend
        }}
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
    procesos: ProcesoDisciplinario[];
  };
  isMobile: boolean;
  isTablet: boolean;
  handleMoverProceso: (procesoId: string, nuevaEtapa: string) => void;
}

function ColumnaKanban({ etapa, isMobile, isTablet, handleMoverProceso }: ColumnaKanbanProps) {
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.PROCESO,
    drop: (item: { id: string }) => handleMoverProceso(item.id, etapa.valor),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const backgroundColor = isOver ? '#F0F7FF' : 'transparent';
  const borderColor = isOver ? '#2962FF' : 'transparent';

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
                  {etapa.diasEstimados} días
                </p>
              </div>
            </div>
            <Badge className={`font-semibold ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'} bg-white border border-gray-200 text-gray-700`}>
              {etapa.procesos.length}
            </Badge>
          </div>
        </div>

        {/* Lista de Procesos */}
        <div
          ref={drop as unknown as React.LegacyRef<HTMLDivElement>}
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
          {etapa.procesos.map((proceso) => (
            <TarjetaProceso
              key={proceso.id}
              proceso={proceso}
              isMobile={isMobile}
              handleMoverProceso={handleMoverProceso}
              nuevaEtapa={etapa.valor}
            />
          ))}

          {etapa.procesos.length === 0 && (
            <div className="text-center py-12 text-gray-400" style={{ pointerEvents: 'none' }}>
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-xs font-semibold">
                {isOver ? '✅ Suelte aquí' : `Sin procesos en ${etapa.nombre}`}
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== COMPONENTE TARJETA PROCESO ====================
interface TarjetaProcesoProps {
  proceso: ProcesoDisciplinario;
  isMobile: boolean;
  handleMoverProceso: (procesoId: string, nuevaEtapa: string) => void;
  nuevaEtapa: string;
}

function TarjetaProceso({ proceso, isMobile, handleMoverProceso, nuevaEtapa }: TarjetaProcesoProps) {
  // Estados para modales
  const [modalProcesoOpen, setModalProcesoOpen] = useState(false);
  const [modalComunicacionesOpen, setModalComunicacionesOpen] = useState(false);
  const [modalAutosOpen, setModalAutosOpen] = useState(false);
  const [modalEvidenciasOpen, setModalEvidenciasOpen] = useState(false);
  const [modalOficiosOpen, setModalOficiosOpen] = useState(false);
  const [modalActasOpen, setModalActasOpen] = useState(false);

  // Drag and Drop
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.PROCESO,
    item: { id: proceso.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.5 : 1;

  // Lógica de semáforo y cálculos
  const getSemaforo = (dias: number) => {
    if (dias > 5) return { color: '#10B981', label: 'En término' };
    if (dias >= 3) return { color: '#F59E0B', label: 'Por vencer' };
    return { color: '#EF4444', label: 'Crítico' };
  };
  const semaforo = getSemaforo(proceso.diasRestantes);

  // const semaforo = getSemaforoColor(proceso.diasRestantes);
  const porcentajeTiempo = Math.round(((proceso.diasTotales - proceso.diasRestantes) / proceso.diasTotales) * 100);
  const ultimaActuacion = proceso.ultimaActuacion?.descripcion || proceso.hechos || `Proceso en etapa de ${proceso.etapa}`;


  // Adaptador para modales de gestión legal que esperan "ExpedienteJudicial"
  const expedienteParaModales = {
    id: proceso.id,
    uuid: proceso.id,
    radicado: proceso.id, // Fallback
    demandante: proceso.disciplinado,
    demandado: 'ESAP',
    estado: 'ACTIVO',
    etapaProcesal: proceso.etapa,
    abogadoAsignado: proceso.abogadoAsignado
  };

  return (
    <div ref={drag as unknown as React.LegacyRef<HTMLDivElement>} style={{ opacity, cursor: 'move' }}>
      <Card className="bg-white border border-gray-200 hover:shadow-md transition-all">
        <div className="h-1" style={{ background: '#003DA5' }} />

        <div className={`${isMobile ? 'p-2.5' : 'p-3'}`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={`${isMobile ? 'p-1' : 'p-1.5'} rounded-lg flex-shrink-0`}
                style={{ background: '#E0EDFF' }}
              >
                <Gavel className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#003DA5' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} truncate`} style={{ color: '#003DA5' }}>
                  {proceso.id}
                </h4>
                <p className="text-xs text-gray-600 truncate">{proceso.tipoFalta}</p>
              </div>
            </div>
          </div>

          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👤 Disciplinado:</p>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
              {proceso.disciplinado}
            </p>
          </div>

          <div className="mb-2 pb-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Avatar className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0`}>
                <AvatarFallback
                  className="text-xs"
                  style={{ background: '#E0EDFF', color: '#003DA5' }}
                >
                  {(proceso.abogadoAsignado || 'ESAP')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">👨‍💼 Profesional:</p>
                <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
                  {proceso.abogadoAsignado || 'Sin asignar'}
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
              {proceso.diasRestantes} días
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{proceso.documentos?.length || 0}</p>
              <p className="text-xs text-gray-500">Docs</p>
            </div>
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{proceso.diasTotales - proceso.diasRestantes}</p>
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
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 line-clamp-2 mb-1`}>
              {ultimaActuacion}
            </p>
            <p className="text-xs text-gray-500">📅 {proceso.fechaActualizacion.toLocaleDateString('es-CO')}</p>
          </div>

          <div className="space-y-1 pt-2 border-t border-gray-200">
            <Button
              onClick={() => setModalProcesoOpen(true)}
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
                <Gavel className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
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
              Comentarios del Proceso
            </Button>
          </div>
        </div>

        <ModalProcesoDisciplinario
          isOpen={modalProcesoOpen}
          onClose={() => setModalProcesoOpen(false)}
          proceso={proceso}
        />
        <ModalComunicaciones
          isOpen={modalComunicacionesOpen}
          onClose={() => setModalComunicacionesOpen(false)}
          expediente={expedienteParaModales as any}
        />
        <ModalAutos
          isOpen={modalAutosOpen}
          onClose={() => setModalAutosOpen(false)}
          expediente={expedienteParaModales as any}
          modulo='juzgamiento-disciplinario'
        />
        <ModalEvidencias
          isOpen={modalEvidenciasOpen}
          onClose={() => setModalEvidenciasOpen(false)}
          expediente={expedienteParaModales as any}
          modulo='juzgamiento-disciplinario'
        />
        <ModalOficios
          isOpen={modalOficiosOpen}
          onClose={() => setModalOficiosOpen(false)}
          expediente={expedienteParaModales as any}
          modulo='juzgamiento-disciplinario'
        />
        <ModalActas
          isOpen={modalActasOpen}
          onClose={() => setModalActasOpen(false)}
          expediente={expedienteParaModales as any}
          modulo='juzgamiento-disciplinario'
        />
      </Card>
    </div>
  );
}

