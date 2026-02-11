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
  MessageSquare, FileCheck, Send, Archive, Mail, Edit
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { expedientesJudicialesMock } from '../data/datosExpedientesJudicialesExpandido';
import type { ExpedienteJudicial } from '../core/types';
// ✅ VERSIÓN RESTAURADA APROBADA (estructura simple con fechas y tiempos procesales)
import { ModalNuevaDemandaRESTAURADO as ModalNuevaDemanda } from './ModalNuevaDemandaRESTAURADO';
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
  
  // Estado local para manejar drag and drop
  const [expedientes, setExpedientes] = useState<ExpedienteJudicial[]>([]);

  // ✅ Estado para items archivados/eliminados
  const [itemsArchivados, setItemsArchivados] = useState<ItemArchivado[]>([
    {
      id: 'DJ-999',
      codigo: '25000-23-33-001-2023-00999-00',
      nombre: 'Nulidad y Restablecimiento - Juan Pérez Gómez',
      tipo: 'Proceso Judicial',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-12-15T10:30:00'),
      usuarioArchivo: 'Dra. Ana María López',
      motivoArchivo: 'Desistimiento de la demanda por parte del actor mediante memorial radicado el 12/12/2024',
      metadatos: {
        'Tipo Acción': 'NULIDAD Y RESTABLECIMIENTO',
        'Juzgado': 'Juzgado 12 Administrativo de Bogotá',
        'Cuantía': '$85,000,000',
        'Fecha Notificación': '15/01/2024',
        'Abogado Responsable': 'Dra. Ana María López'
      }
    },
    {
      id: 'DJ-998',
      codigo: '11001-03-25-000-2023-00888-00',
      nombre: 'Reparación Directa - María Rodríguez Castro',
      tipo: 'Proceso Judicial',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-11-20T14:15:00'),
      usuarioArchivo: 'Dr. Juan Carlos Pérez',
      motivoArchivo: 'Proceso terminado por sentencia favorable a ESAP en segunda instancia',
      metadatos: {
        'Tipo Acción': 'REPARACIÓN DIRECTA',
        'Juzgado': 'Tribunal Administrativo de Cundinamarca',
        'Cuantía': '$150,000,000',
        'Resultado': 'Sentencia Favorable'
      }
    },
    {
      id: 'DJ-997',
      codigo: '50001-23-31-000-2023-00777-00',
      nombre: 'Nulidad Simple - Asociación Ciudadana',
      tipo: 'Proceso Judicial',
      estado: 'ELIMINADO',
      fechaArchivado: new Date('2024-10-05T09:20:00'),
      usuarioArchivo: 'Dr. Juan Carlos Pérez',
      motivoArchivo: 'Proceso duplicado - Error en radicación. El proceso real está bajo radicado 50001-23-31-000-2023-00778-00',
      metadatos: {
        'Tipo Acción': 'NULIDAD SIMPLE',
        'Juzgado': 'Juzgado Administrativo de Meta',
        'Motivo Eliminación': 'Duplicado'
      }
    },
    {
      id: 'DJ-996',
      codigo: '76001-23-33-002-2023-00666-00',
      nombre: 'Acción de Grupo - Comunidad Indígena',
      tipo: 'Proceso Judicial',
      estado: 'ARCHIVADO',
      fechaArchivado: new Date('2024-09-18T16:45:00'),
      usuarioArchivo: 'Dra. Ana María López',
      motivoArchivo: 'Conciliación extrajudicial exitosa. Acuerdo firmado el 15/09/2024',
      metadatos: {
        'Tipo Acción': 'ACCIÓN DE GRUPO',
        'Juzgado': 'Tribunal Administrativo del Valle',
        'Cuantía': '$320,000,000',
        'Resultado': 'Conciliación'
      }
    },
    {
      id: 'DJ-995',
      codigo: '13001-23-33-001-2022-00555-00',
      nombre: 'Controversia Contractual - Consorcio ABC',
      tipo: 'Proceso Judicial',
      estado: 'ELIMINADO',
      fechaArchivado: new Date('2024-08-22T11:10:00'),
      usuarioArchivo: 'Admin Sistema',
      motivoArchivo: 'Registro erróneo - No corresponde a demanda contra ESAP',
      metadatos: {
        'Tipo Acción': 'CONTROVERSIA CONTRACTUAL',
        'Juzgado': 'Juzgado Civil del Circuito',
        'Motivo Eliminación': 'Error de registro'
      }
    }
  ]);

  // ✅ Función para restaurar un expediente archivado
  const handleRestaurar = async (itemId: string) => {
    console.log('Restaurando expediente:', itemId);
    
    // Simulación: En producción esto haría una llamada al backend
    // await api.restaurarExpediente(itemId);
    
    // Remover de la lista de archivados
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
    
    // Aquí se agregaría de vuelta a los expedientes activos
    // Por ahora solo mostramos el toast (la lógica completa se implementa con backend)
  };

  // ✅ Función para eliminar permanentemente un expediente
  const handleEliminarPermanente = async (itemId: string) => {
    console.log('Eliminando permanentemente expediente:', itemId);
    
    // Simulación: En producción esto haría una llamada al backend
    // await api.eliminarPermanente(itemId);
    
    // Remover de la lista de archivados
    setItemsArchivados(prev => prev.filter(item => item.id !== itemId));
  };

  // ✅ Datos mock para cada etapa del tablero Kanban
  const expedientesMockDefensaJudicial: ExpedienteJudicial[] = [
    {
      id: 'DJ-001',
      radicado: '25000-23-33-001-2024-00045-00',
      demandante: 'María Rodríguez López',
      tipoAccion: 'NULIDAD Y RESTABLECIMIENTO',
      estado: 'ACTIVO',
      etapa: 'NOTIFICADA',
      prioridad: 'ALTA',
      fechaNotificacion: '2025-01-15',
      fechaVencimiento: '2025-02-15',
      juzgado: 'Juzgado 12 Administrativo de Bogotá',
      abogadoResponsable: 'Dra. Ana María López',
      cuantia: '85000000',
      pretensiones: 'Nulidad del acto administrativo por el cual se declaró insubsistencia del cargo y restablecimiento del derecho con reintegro y pago de salarios dejados de percibir.',
      // ✅ Ejemplo de múltiples demandantes
      demandantes: [
        {
          id: 'DEM-001',
          nombre: 'María Rodríguez López',
          tipoPersona: 'natural',
          identificacion: '52123456'
        }
      ],
      // ✅ Ejemplo de múltiples demandados
      demandados: [
        {
          id: 'DEMAN-001',
          nombre: 'ESAP - Escuela Superior de Administración Pública',
          tipoPersona: 'juridica',
          identificacion: '899999061-4',
          cargo: 'Entidad Accionada'
        },
        {
          id: 'DEMAN-002',
          nombre: 'José Alberto Ramírez González',
          tipoPersona: 'natural',
          identificacion: '79456123',
          cargo: 'Rector ESAP'
        }
      ],
      // ✅ Ejemplo de otros actores
      otrosActores: [
        {
          id: 'OTRO-001',
          nombre: 'Procuraduría General de la Nación',
          tipoPersona: 'juridica',
          identificacion: '899999007-1',
          rol: 'Ministerio Público'
        }
      ],
      ultimaActuacion: {
        fecha: '2025-01-20',
        tipo: 'Auto Admisorio',
        descripcion: 'Se admite demanda y se ordena notificación a ESAP',
        responsable: 'Juzgado 12 Administrativo',
        estado: 'NOTIFICADO'
      }
    },
    {
      id: 'DJ-002',
      radicado: '11001-03-25-000-2024-00123-00',
      demandante: 'Carlos Eduardo Martínez',
      tipoAccion: 'REPARACIÓN DIRECTA',
      estado: 'ACTIVO',
      etapa: 'CONTESTACIÓN',
      prioridad: 'MEDIA',
      fechaNotificacion: '2024-12-05',
      fechaVencimiento: '2025-02-05',
      juzgado: 'Tribunal Administrativo de Cundinamarca',
      abogadoResponsable: 'Dr. Juan Carlos Pérez',
      cuantia: '120000000',
      pretensiones: 'Reparación directa por daños y perjuicios ocasionados en accidente de tránsito con vehículo institucional de ESAP.',
      // ✅ Ejemplo con tercero interviniente
      demandantes: [
        {
          id: 'DEM-002',
          nombre: 'Carlos Eduardo Martínez',
          tipoPersona: 'natural',
          identificacion: '80123456'
        }
      ],
      demandados: [
        {
          id: 'DEMAN-003',
          nombre: 'ESAP - Escuela Superior de Administración Pública',
          tipoPersona: 'juridica',
          identificacion: '899999061-4',
          cargo: 'Entidad Demandada'
        }
      ],
      otrosActores: [
        {
          id: 'OTRO-002',
          nombre: 'Seguros del Estado S.A.',
          tipoPersona: 'juridica',
          identificacion: '860066119-1',
          rol: 'Tercero Llamado en Garantía'
        }
      ],
      ultimaActuacion: {
        fecha: '2025-01-18',
        tipo: 'Contestación Demanda',
        descripcion: 'Se presenta escrito de contestación y excepciones',
        responsable: 'Oficina Jurídica ESAP',
        estado: 'RADICADO'
      }
    },
    {
      id: 'DJ-003',
      radicado: '76001-23-33-000-2024-00089-00',
      demandante: 'Asociación Docentes ESAP',
      tipoAccion: 'ACCIÓN DE GRUPO',
      estado: 'ACTIVO',
      etapa: 'PROBATORIA',
      prioridad: 'ALTA',
      fechaNotificacion: '2024-10-10',
      fechaVencimiento: '2025-03-10',
      juzgado: 'Juzgado 8 Administrativo del Circuito de Cali',
      abogadoResponsable: 'Dra. María González',
      cuantia: '450000000',
      pretensiones: 'Acción de grupo por falta de pago de primas de vacaciones a docentes de planta durante los años 2022-2024.',
      // ✅ Ejemplo con acción de grupo y curador
      demandantes: [
        {
          id: 'DEM-003',
          nombre: 'Asociación Docentes ESAP',
          tipoPersona: 'juridica',
          identificacion: '900123789-1'
        }
      ],
      demandados: [
        {
          id: 'DEMAN-004',
          nombre: 'ESAP - Escuela Superior de Administración Pública',
          tipoPersona: 'juridica',
          identificacion: '899999061-4',
          cargo: 'Entidad Demandada'
        }
      ],
      otrosActores: [
        {
          id: 'OTRO-003',
          nombre: 'Dr. Alberto Mendoza Ramírez',
          tipoPersona: 'natural',
          identificacion: '79345678',
          rol: 'Curador Ad Litem del Grupo'
        },
        {
          id: 'OTRO-004',
          nombre: 'Defensoría del Pueblo',
          tipoPersona: 'juridica',
          identificacion: '899999011-7',
          rol: 'Agente Oficioso'
        }
      ],
      ultimaActuacion: {
        fecha: '2025-01-22',
        tipo: 'Decreto Pruebas',
        descripcion: 'Se decretan testimonios y pruebas documentales solicitadas',
        responsable: 'Juzgado 8 Administrativo',
        estado: 'EN PRÁCTICA'
      }
    },
    {
      id: 'DJ-004',
      radicado: '05001-23-33-000-2024-00234-00',
      demandante: 'Pedro Antonio Gómez',
      tipoAccion: 'TUTELA',
      estado: 'ACTIVO',
      etapa: 'ALEGATOS',
      prioridad: 'URGENTE',
      fechaNotificacion: '2025-01-08',
      fechaVencimiento: '2025-01-30',
      juzgado: 'Juzgado 5 Civil del Circuito de Medellín',
      abogadoResponsable: 'Dr. Carlos Ramírez',
      cuantia: '0',
      pretensiones: 'Protección del derecho fundamental al debido proceso en investigación disciplinaria adelantada por ESAP.',
      // ✅ Ejemplo con tutela y agencia de defensa
      demandantes: [
        {
          id: 'DEM-004',
          nombre: 'Pedro Antonio Gómez',
          tipoPersona: 'natural',
          identificacion: '71234567'
        }
      ],
      demandados: [
        {
          id: 'DEMAN-005',
          nombre: 'ESAP - Escuela Superior de Administración Pública',
          tipoPersona: 'juridica',
          identificacion: '899999061-4',
          cargo: 'Entidad Accionada'
        }
      ],
      otrosActores: [
        {
          id: 'OTRO-005',
          nombre: 'Agencia Nacional de Defensa Jurídica del Estado',
          tipoPersona: 'juridica',
          identificacion: '900460870-4',
          rol: 'Tercero con Interés'
        }
      ],
      ultimaActuacion: {
        fecha: '2025-01-25',
        tipo: 'Alegatos de Conclusión',
        descripcion: 'Se presentan alegatos finales por parte de ESAP',
        responsable: 'Oficina Jurídica ESAP',
        estado: 'PRESENTADO'
      }
    }
  ];

  // ✅ Log de configuraciones cargadas
  useEffect(() => {
    console.log('🎯 DEFENSA JUDICIAL - Configuraciones centralizadas cargadas:');
    console.log('   📊 Estados activos:', estadosActivos.length);
    console.log('   ⚖️ Tipos de procesos activos:', tiposProcesosActivos.length);
    console.log('   ✅ Conexión con ConfiguracionesSIGL establecida');
  }, [estadosActivos, tiposProcesosActivos]);

  // ✅ Cargar datos mock al montar el componente
  useEffect(() => {
    setExpedientes(expedientesMockDefensaJudicial.map(exp => ({
      ...exp,
      abogadoAsignado: exp.abogadoResponsable, // ✅ Mapear abogadoResponsable a abogadoAsignado
      diasRestantes: Math.ceil((new Date(exp.fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      diasTotales: Math.ceil((new Date(exp.fechaVencimiento).getTime() - new Date(exp.fechaNotificacion).getTime()) / (1000 * 60 * 60 * 24)),
      fechaActualizacion: new Date(exp.ultimaActuacion?.fecha || exp.fechaNotificacion),
      documentos: [],
      medioControl: exp.tipoAccion
    })));
  }, []);

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

  // Manejar movimiento de expediente entre etapas
  const handleMoverExpediente = (expedienteId: string, nuevaEtapa: 'NOTIFICADA' | 'CONTESTACIÓN' | 'PROBATORIA' | 'ALEGATOS') => {
    setExpedientes((prevExpedientes) => 
      prevExpedientes.map((exp) => 
        exp.id === expedienteId 
          ? { ...exp, etapa: nuevaEtapa }
          : exp
      )
    );
    
    toast.success('Expediente movido exitosamente', {
      description: `Cambiado a etapa: ${nuevaEtapa}`
    });
  };

  // Agrupar expedientes por etapa
  const expedientesPorEtapa = {
    NOTIFICADA: expedientes.filter(exp => exp.etapa === 'NOTIFICADA'),
    CONTESTACIÓN: expedientes.filter(exp => exp.etapa === 'CONTESTACIÓN'),
    PROBATORIA: expedientes.filter(exp => exp.etapa === 'PROBATORIA'),
    ALEGATOS: expedientes.filter(exp => exp.etapa === 'ALEGATOS'),
  };

  // Calcular estadísticas
  const totalExpedientes = expedientes.length;
  const expedientesCriticos = expedientes.filter(e => e.diasRestantes <= 5).length;
  const expedientesEnTermino = expedientes.filter(e => e.diasRestantes > 15).length;

  const etapas = [
    { 
      nombre: 'Notificada', 
      valor: 'NOTIFICADA' as const,
      color: '#6B7280', 
      icono: <FileCheck className="w-4 h-4 text-gray-600" />, 
      diasEstimados: 10,
      expedientes: expedientesPorEtapa.NOTIFICADA
    },
    { 
      nombre: 'Contestación', 
      valor: 'CONTESTACIÓN' as const,
      color: '#F59E0B', 
      icono: <Edit className="w-4 h-4 text-amber-600" />, 
      diasEstimados: 30,
      expedientes: expedientesPorEtapa.CONTESTACIÓN
    },
    { 
      nombre: 'Probatoria', 
      valor: 'PROBATORIA' as const,
      color: '#3B82F6', 
      icono: <Search className="w-4 h-4 text-blue-600" />, 
      diasEstimados: 60,
      expedientes: expedientesPorEtapa.PROBATORIA
    },
    { 
      nombre: 'Alegatos', 
      valor: 'ALEGATOS' as const,
      color: '#003DA5', 
      icono: <Scale className="w-4 h-4" style={{ color: '#003DA5' }} />, 
      diasEstimados: 20,
      expedientes: expedientesPorEtapa.ALEGATOS
    },
  ];

  // Handler para guardar nueva demanda
  const handleSaveNuevaDemanda = (demandaData: NuevaDemandaData) => {
    console.log('Nueva demanda registrada:', demandaData);
    // Aquí se integraría con el backend/estado global
    toast.success('Demanda registrada exitosamente', {
      description: `Radicado: ${demandaData.numeroRadicado}`
    });
  };

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header con Info Tooltip */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <ModuleHeader
            title="Tablero Kanban Operativo"
            subtitle="Gestión visual de demandas judiciales contra ESAP"
            buttons={[
              {
                label: 'Nueva Demanda',
                icon: <Plus className="w-4 h-4 mr-1" />,
                onClick: () => setModalNuevaDemandaOpen(true),
                className: 'bg-orange-600 hover:bg-orange-700 text-white font-bold'
              }
            ]}
            toggleView={{
              current: tipoVista,
              onChange: setTipoVista,
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
        onSearchChange={setBusqueda}
        onEtapaChange={setFiltroEtapa}
        onTipoChange={setFiltroTipo}
        etapas={etapas.map(e => e.nombre)}
        tipos={['TODOS', 'NOTIFICADA', 'CONTESTACIÓN', 'PROBATORIA', 'ALEGATOS']}
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
              {etapas.map((etapa) => (
                <ColumnaKanban
                  key={etapa.nombre}
                  etapa={etapa}
                  isMobile={isMobile}
                  isTablet={isTablet}
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
          expedientes={etapas.flatMap(e => e.expedientes)}
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
    valor: 'NOTIFICADA' | 'CONTESTACIÓN' | 'PROBATORIA' | 'ALEGATOS';
    color: string;
    icono: React.ReactNode;
    diasEstimados: number;
    expedientes: ExpedienteJudicial[];
  };
  isMobile: boolean;
  isTablet: boolean;
  onMoverExpediente: (expedienteId: string, nuevaEtapa: 'NOTIFICADA' | 'CONTESTACIÓN' | 'PROBATORIA' | 'ALEGATOS') => void;
}

function ColumnaKanban({ etapa, isMobile, isTablet, onMoverExpediente }: ColumnaKanbanProps) {
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.EXPEDIENTE,
    drop: (item: { id: string }) => onMoverExpediente(item.id, etapa.valor),
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
          ref={drop}
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
  onMoverExpediente: (expedienteId: string, nuevaEtapa: 'NOTIFICADA' | 'CONTESTACIÓN' | 'PROBATORIA' | 'ALEGATOS') => void;
  etapaActual: 'NOTIFICADA' | 'CONTESTACIÓN' | 'PROBATORIA' | 'ALEGATOS';
}

function TarjetaExpediente({ expediente, isMobile, onMoverExpediente, etapaActual }: TarjetaExpedienteProps) {
  // Estados para modales
  const [modalExpedienteOpen, setModalExpedienteOpen] = useState(false);
  const [modalComunicacionesOpen, setModalComunicacionesOpen] = useState(false);
  const [modalAutosOpen, setModalAutosOpen] = useState(false);
  const [modalEvidenciasOpen, setModalEvidenciasOpen] = useState(false);
  const [modalOficiosOpen, setModalOficiosOpen] = useState(false);
  const [modalActasOpen, setModalActasOpen] = useState(false);

  // Handler para abrir modal de expediente con logging
  const handleAbrirExpediente = () => {
    console.log('🔍 Abriendo modal de expediente:', expediente.id);
    try {
      setModalExpedienteOpen(true);
      console.log('✅ Modal de expediente abierto');
    } catch (error) {
      console.error('❌ Error al abrir modal de expediente:', error);
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

  const opacity = isDragging ? 0.5 : 1;

  return (
    <div ref={drag} style={{ opacity, cursor: 'move' }}>
      <Card className="bg-white border border-gray-200 hover:shadow-md transition-all">
        {/* Barra superior azul ESAP */}
        <div className="h-1" style={{ background: '#003DA5' }} />

        <div className={`${isMobile ? 'p-2.5' : 'p-3'}`}>
          {/* Header */}
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
                <p className="text-xs text-gray-600 truncate">
                  {expediente.medioControl}
                </p>
              </div>
            </div>
          </div>

          {/* Demandante */}
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

          {/* Profesional Asignado */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Avatar className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0`}>
                <AvatarFallback 
                  className="text-xs"
                  style={{ background: '#E0EDFF', color: '#003DA5' }}
                >
                  {expediente.abogadoAsignado 
                    ? expediente.abogadoAsignado.split(' ').map(n => n[0]).join('').substring(0, 2)
                    : 'NA'}
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

          {/* Semáforo */}
          <div className="flex items-center gap-1.5 mb-2">
            <Badge 
              className="text-xs flex items-center gap-1 font-semibold bg-gray-50 border border-gray-200"
              style={{ color: semaforo.color }}
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{ background: semaforo.color }}
              />
              {expediente.diasRestantes} días
            </Badge>
          </div>

          {/* Métricas */}
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

          {/* Última Actuación - IGUAL A DISCIPLINARIO */}
          <div className="mb-2 p-2 rounded-lg" style={{ backgroundColor: '#F0F7FF', border: '1px solid #BFDBFE' }}>
            <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: '#003DA5' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#003DA5' }}></span>
              ÚLTIMA ACTUACIÓN
            </p>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 line-clamp-2 mb-1`}>
              {ultimaActuacion}
            </p>
            <p className="text-xs text-gray-500">
              📅 {expediente.fechaActualizacion.toLocaleDateString('es-CO')}
            </p>
          </div>

          {/* Acciones */}
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

            {/* Gestión Documental */}
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

        {/* MODALES */}
        <ModalExpediente
          isOpen={modalExpedienteOpen}
          onClose={() => setModalExpedienteOpen(false)}
          expediente={expediente}
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
        />

        <ModalEvidencias
          isOpen={modalEvidenciasOpen}
          onClose={() => setModalEvidenciasOpen(false)}
          expediente={expediente}
        />

        <ModalOficios
          isOpen={modalOficiosOpen}
          onClose={() => setModalOficiosOpen(false)}
          expediente={expediente}
        />

        <ModalActas
          isOpen={modalActasOpen}
          onClose={() => setModalActasOpen(false)}
          expediente={expediente}
        />
      </Card>
    </div>
  );
}

// ==================== COMPONENTE VISTA LISTA ====================
interface VistaListaProps {
  expedientes: ExpedienteJudicial[];
  isMobile: boolean;
  isTablet: boolean;
}

function VistaLista({ expedientes, isMobile, isTablet }: VistaListaProps) {
  return (
    <div className="space-y-3">
      {expedientes.map((expediente) => (
        <TarjetaExpediente
          key={expediente.id}
          expediente={expediente}
          isMobile={isMobile}
          onMoverExpediente={handleMoverExpediente}
          etapaActual={expediente.etapa as 'NOTIFICADA' | 'CONTESTACIÓN' | 'PROBATORIA' | 'ALEGATOS'}
        />
      ))}
    </div>
  );
}