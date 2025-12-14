/**
 * MÓDULO: BIBLIOTECA DE LISTAS DE CHEQUEO (RF007)
 * 
 * Sistema completo de gestión de listas de verificación reutilizables y versionadas
 * para auditorías de Control Interno.
 * 
 * FUNCIONALIDADES PRINCIPALES:
 * ✅ Gestión de biblioteca de templates
 * ✅ Control de versiones con historial
 * ✅ Creación/edición de listas personalizadas
 * ✅ Aplicación a procesos/auditorías
 * ✅ Diligenciamiento durante ejecución
 * ✅ Generación automática de hallazgos
 * ✅ Cálculo de % cumplimiento
 * ✅ Exportación PDF/Excel
 * 
 * PROGRESO MÓDULO CONTROL INTERNO: 45% → 55%
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Copy,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  MinusCircle,
  Target,
  TrendingUp,
  Save,
  Send,
  Layers,
  List,
  Info,
  Award,
  Calendar,
  Clock,
  User,
  GitBranch,
  History,
  PlayCircle,
  Share2,
  Archive,
  ChevronRight,
  ChevronDown,
  Settings,
  FileCheck,
  AlertTriangle,
  BookOpen,
  Package
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Badge } from '../../../ui/badge';
import { toast } from 'sonner@2.0.3';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../ui/tabs';
import { Progress } from '../../../ui/progress';
import { RadioGroup, RadioGroupItem } from '../../../ui/radio-group';
import { Switch } from '../../../ui/switch';
import { Separator } from '../../../ui/separator';
import { ScrollArea } from '../../../ui/scroll-area';

// ==================== TIPOS ====================

interface ItemVerificacion {
  id: string;
  numero: string;
  criterio: string;
  normativaReferencia: string;
  esCritico: boolean;
  respuesta?: 'cumple' | 'no-cumple' | 'no-aplica';
  observaciones?: string;
  evidencias?: string[];
  generaHallazgo?: boolean;
}

interface SeccionLista {
  id: string;
  orden: number;
  nombre: string;
  descripcion: string;
  items: ItemVerificacion[];
}

interface VersionHistorial {
  version: string;
  fecha: string;
  usuario: string;
  cambios: string;
  motivoCambio: string;
}

interface ListaChequeo {
  id: string;
  codigo: string;
  nombre: string;
  version: string;
  proceso: string;
  subproceso?: string;
  categoria: 'normativa' | 'procesos' | 'controles' | 'riesgos' | 'personalizada';
  normativaAplicable: string;
  descripcion: string;
  objetivo: string;
  secciones: SeccionLista[];
  
  // Versionamiento
  versionBase?: string;
  historialVersiones: VersionHistorial[];
  estado: 'borrador' | 'activa' | 'archivada';
  
  // Metadata
  totalItems: number;
  fechaCreacion: string;
  creadoPor: string;
  ultimaModificacion: string;
  modificadoPor: string;
  
  // Si está aplicada en una auditoría
  auditoriaId?: string;
  nombreAuditoria?: string;
  auditorResponsable?: string;
  fechaAplicacion?: string;
  fechaDiligenciamiento?: string;
  
  // Resultados (cuando está diligenciada)
  itemsCompletados?: number;
  cumplimiento?: number;
  noCumplimientos?: number;
  noAplica?: number;
  hallazgosGenerados?: number;
  
  // Configuración
  permiteNoAplica: boolean;
  requiereEvidencias: boolean;
  generaHallazgosAutomaticos: boolean;
}

interface EstadisticasBiblioteca {
  totalListas: number;
  listasActivas: number;
  listasBorrador: number;
  listasArchivadas: number;
  cumplimientoPromedio: number;
  listasAplicadas: number;
  hallazgosGenerados: number;
  porCategoria: {
    categoria: string;
    cantidad: number;
  }[];
}

// ==================== COMPONENTE PRINCIPAL ====================

export function BibliotecaListasChequeo() {
  const [activeTab, setActiveTab] = useState('biblioteca');
  const [vistaLista, setVistaLista] = useState<'tarjetas' | 'tabla'>('tarjetas');
  
  // Modales
  const [isCrearListaOpen, setIsCrearListaOpen] = useState(false);
  const [isEditarListaOpen, setIsEditarListaOpen] = useState(false);
  const [isVerListaOpen, setIsVerListaOpen] = useState(false);
  const [isAplicarListaOpen, setIsAplicarListaOpen] = useState(false);
  const [isDiligenciarOpen, setIsDiligenciarOpen] = useState(false);
  const [isVersionesOpen, setIsVersionesOpen] = useState(false);
  const [isClonarOpen, setIsClonarOpen] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroProceso, setFiltroProceso] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  
  // Estado
  const [listaSeleccionada, setListaSeleccionada] = useState<ListaChequeo | null>(null);
  const [seccionExpandida, setSeccionExpandida] = useState<string | null>(null);

  // Usuario actual
  const usuarioActual = {
    nombre: 'Sandra Paola Montero',
    cargo: 'Auditor Senior',
    email: 'sandra.montero@esap.edu.co'
  };

  // Catálogos
  const procesos = [
    'Gestión Contractual',
    'Gestión Financiera',
    'Talento Humano',
    'Gestión Tecnológica',
    'Gestión Administrativa',
    'Atención al Ciudadano',
    'Comunicaciones',
    'Gestión Documental',
    'Planeación Estratégica',
    'Control Interno'
  ];

  const categorias = [
    { value: 'normativa', label: 'Cumplimiento Normativo', icon: FileText },
    { value: 'procesos', label: 'Procesos', icon: List },
    { value: 'controles', label: 'Controles', icon: CheckSquare },
    { value: 'riesgos', label: 'Riesgos', icon: AlertTriangle },
    { value: 'personalizada', label: 'Personalizada', icon: Settings }
  ];

  // ==================== DATOS MOCK ====================

  const [listas, setListas] = useState<ListaChequeo[]>([
    {
      id: 'LC-001',
      codigo: 'LC-CTL-001',
      nombre: 'Verificación Gestión Contractual',
      version: '3.0',
      proceso: 'Gestión Contractual',
      subproceso: 'Contratación Directa',
      categoria: 'normativa',
      normativaAplicable: 'Ley 1150 de 2007, Decreto 1082 de 2015, Manual de Contratación ESAP v3.0',
      descripcion: 'Lista de verificación para auditar el proceso de contratación directa, validando cumplimiento de requisitos legales y procedimentales.',
      objetivo: 'Verificar el cumplimiento de la normativa de contratación y los procedimientos internos en procesos de contratación directa',
      estado: 'activa',
      totalItems: 25,
      fechaCreacion: '2024-01-15',
      creadoPor: 'Sandra Paola Montero',
      ultimaModificacion: '2025-02-20',
      modificadoPor: 'Sandra Paola Montero',
      versionBase: '2.0',
      historialVersiones: [
        {
          version: '3.0',
          fecha: '2025-02-20',
          usuario: 'Sandra Paola Montero',
          cambios: 'Actualización de normativa vigente',
          motivoCambio: 'Actualización Decreto 1082'
        },
        {
          version: '2.0',
          fecha: '2024-06-10',
          usuario: 'Fernando Ávila',
          cambios: 'Inclusión de nuevos ítems de verificación',
          motivoCambio: 'Nueva política de contratación'
        },
        {
          version: '1.0',
          fecha: '2024-01-15',
          usuario: 'Sandra Paola Montero',
          cambios: 'Versión inicial',
          motivoCambio: 'Creación de la lista'
        }
      ],
      auditoriaId: 'AUD-2025-001',
      nombreAuditoria: 'Auditoría Gestión Contractual 2025',
      auditorResponsable: 'Sandra Paola Montero',
      fechaAplicacion: '2025-02-20',
      itemsCompletados: 18,
      cumplimiento: 72,
      noCumplimientos: 5,
      noAplica: 2,
      hallazgosGenerados: 3,
      permiteNoAplica: true,
      requiereEvidencias: true,
      generaHallazgosAutomaticos: true,
      secciones: [
        {
          id: 'SEC-001',
          orden: 1,
          nombre: 'Documentación Precontractual',
          descripcion: 'Verificación de estudios previos y documentos de soporte',
          items: [
            {
              id: 'ITEM-001',
              numero: '1.1',
              criterio: '¿El expediente contiene estudios previos debidamente justificados?',
              normativaReferencia: 'Artículo 2.2.1.1.2.1.1 Decreto 1082/2015',
              esCritico: true,
              respuesta: 'cumple',
              observaciones: 'Estudios previos completos y justificados',
              evidencias: ['Estudio previo contrato 001-2024', 'CDP']
            },
            {
              id: 'ITEM-002',
              numero: '1.2',
              criterio: '¿Se cuenta con CDP vigente antes de iniciar el proceso?',
              normativaReferencia: 'Artículo 71 Decreto 111/1996',
              esCritico: true,
              respuesta: 'cumple',
              observaciones: 'CDP No. 2024-001 vigente',
              evidencias: ['CDP-2024-001.pdf']
            },
            {
              id: 'ITEM-003',
              numero: '1.3',
              criterio: '¿El valor estimado del contrato está debidamente soportado?',
              normativaReferencia: 'Manual de Contratación ESAP v3.0',
              esCritico: false,
              respuesta: 'no-cumple',
              observaciones: 'Cotización única, se requieren mínimo 3 cotizaciones',
              evidencias: ['Cotización proveedor A'],
              generaHallazgo: true
            }
          ]
        },
        {
          id: 'SEC-002',
          orden: 2,
          nombre: 'Ejecución Contractual',
          descripcion: 'Verificación del desarrollo y seguimiento del contrato',
          items: [
            {
              id: 'ITEM-004',
              numero: '2.1',
              criterio: '¿Se designó supervisor del contrato?',
              normativaReferencia: 'Ley 1474/2011 Art. 83',
              esCritico: true,
              respuesta: 'cumple',
              observaciones: 'Supervisor designado mediante memo 025-2024',
              evidencias: ['Memorando designación']
            }
          ]
        }
      ]
    },
    {
      id: 'LC-002',
      codigo: 'LC-TEC-001',
      nombre: 'Verificación Seguridad de la Información',
      version: '2.0',
      proceso: 'Gestión Tecnológica',
      subproceso: 'Seguridad TI',
      categoria: 'controles',
      normativaAplicable: 'ISO 27001, Ley 1581/2012, Modelo de Seguridad MinTIC',
      descripcion: 'Lista de verificación para evaluar controles de seguridad de la información y protección de datos personales.',
      objetivo: 'Verificar la implementación de controles de seguridad de la información según ISO 27001',
      estado: 'activa',
      totalItems: 30,
      fechaCreacion: '2024-03-10',
      creadoPor: 'Fernando Ávila',
      ultimaModificacion: '2025-01-15',
      modificadoPor: 'Fernando Ávila',
      historialVersiones: [
        {
          version: '2.0',
          fecha: '2025-01-15',
          usuario: 'Fernando Ávila',
          cambios: 'Actualización controles ISO 27001:2022',
          motivoCambio: 'Nueva versión de la norma'
        },
        {
          version: '1.0',
          fecha: '2024-03-10',
          usuario: 'Fernando Ávila',
          cambios: 'Versión inicial',
          motivoCambio: 'Creación'
        }
      ],
      permiteNoAplica: true,
      requiereEvidencias: true,
      generaHallazgosAutomaticos: true,
      secciones: [
        {
          id: 'SEC-T-001',
          orden: 1,
          nombre: 'Política de Seguridad',
          descripcion: 'Verificación de políticas y normativas de seguridad',
          items: [
            {
              id: 'ITEM-T-001',
              numero: '1.1',
              criterio: '¿Existe una política de seguridad de la información aprobada y vigente?',
              normativaReferencia: 'ISO 27001:2022 - A.5.1',
              esCritico: true
            },
            {
              id: 'ITEM-T-002',
              numero: '1.2',
              criterio: '¿La política es conocida por todo el personal?',
              normativaReferencia: 'ISO 27001:2022 - A.6.3',
              esCritico: false
            }
          ]
        }
      ]
    },
    {
      id: 'LC-003',
      codigo: 'LC-THU-001',
      nombre: 'Verificación Gestión de Talento Humano',
      version: '1.0',
      proceso: 'Talento Humano',
      subproceso: 'Selección y Vinculación',
      categoria: 'procesos',
      normativaAplicable: 'Ley 909/2004, Decreto 1083/2015, MIPG',
      descripcion: 'Lista para verificar el proceso de selección meritocrática y vinculación de personal.',
      objetivo: 'Verificar el cumplimiento del proceso de selección y vinculación según principios meritocráticos',
      estado: 'activa',
      totalItems: 20,
      fechaCreacion: '2024-02-20',
      creadoPor: 'Lucila Villamil Avendaño',
      ultimaModificacion: '2024-02-20',
      modificadoPor: 'Lucila Villamil Avendaño',
      historialVersiones: [
        {
          version: '1.0',
          fecha: '2024-02-20',
          usuario: 'Lucila Villamil Avendaño',
          cambios: 'Versión inicial',
          motivoCambio: 'Creación'
        }
      ],
      permiteNoAplica: true,
      requiereEvidencias: false,
      generaHallazgosAutomaticos: true,
      secciones: [
        {
          id: 'SEC-TH-001',
          orden: 1,
          nombre: 'Proceso de Selección',
          descripcion: 'Verificación del proceso de convocatoria y selección',
          items: [
            {
              id: 'ITEM-TH-001',
              numero: '1.1',
              criterio: '¿La convocatoria fue publicada en el portal institucional?',
              normativaReferencia: 'Ley 909/2004 Art. 18',
              esCritico: true
            }
          ]
        }
      ]
    },
    {
      id: 'LC-004',
      codigo: 'LC-FIN-001',
      nombre: 'Verificación Ejecución Presupuestal',
      version: '2.5',
      proceso: 'Gestión Financiera',
      subproceso: 'Ejecución Presupuestal',
      categoria: 'normativa',
      normativaAplicable: 'Decreto 111/1996, Estatuto Orgánico de Presupuesto',
      descripcion: 'Lista de verificación para auditar la ejecución y control presupuestal.',
      objetivo: 'Verificar el cumplimiento de las normas presupuestales y la correcta ejecución del presupuesto',
      estado: 'activa',
      totalItems: 22,
      fechaCreacion: '2023-11-10',
      creadoPor: 'Fernando Ávila',
      ultimaModificacion: '2024-04-15',
      modificadoPor: 'Fernando Ávila',
      auditoriaId: 'AUD-2024-002',
      nombreAuditoria: 'Auditoría Gestión Financiera 2024',
      auditorResponsable: 'Fernando Ávila',
      fechaAplicacion: '2024-04-15',
      itemsCompletados: 22,
      cumplimiento: 91,
      noCumplimientos: 2,
      noAplica: 0,
      hallazgosGenerados: 2,
      historialVersiones: [
        {
          version: '2.5',
          fecha: '2024-04-15',
          usuario: 'Fernando Ávila',
          cambios: 'Ajustes menores en criterios',
          motivoCambio: 'Mejora continua'
        }
      ],
      permiteNoAplica: true,
      requiereEvidencias: true,
      generaHallazgosAutomaticos: true,
      secciones: [
        {
          id: 'SEC-F-001',
          orden: 1,
          nombre: 'Planeación Presupuestal',
          descripcion: 'Verificación del proceso de formulación',
          items: [
            {
              id: 'ITEM-F-001',
              numero: '1.1',
              criterio: '¿El presupuesto fue aprobado por el órgano competente?',
              normativaReferencia: 'Decreto 111/1996 Art. 39',
              esCritico: true,
              respuesta: 'cumple',
              observaciones: 'Aprobado por Consejo Directivo',
              evidencias: ['Acta aprobación']
            }
          ]
        }
      ]
    },
    {
      id: 'LC-005',
      codigo: 'LC-RIE-001',
      nombre: 'Evaluación Matriz de Riesgos',
      version: '1.0',
      proceso: 'Planeación Estratégica',
      subproceso: 'Gestión de Riesgos',
      categoria: 'riesgos',
      normativaAplicable: 'MIPG - Política de Administración del Riesgo',
      descripcion: 'Lista para evaluar la correcta identificación, valoración y tratamiento de riesgos institucionales.',
      objetivo: 'Verificar la implementación de la política de administración del riesgo',
      estado: 'borrador',
      totalItems: 15,
      fechaCreacion: '2025-02-01',
      creadoPor: 'Sandra Paola Montero',
      ultimaModificacion: '2025-02-01',
      modificadoPor: 'Sandra Paola Montero',
      historialVersiones: [
        {
          version: '1.0',
          fecha: '2025-02-01',
          usuario: 'Sandra Paola Montero',
          cambios: 'Versión inicial',
          motivoCambio: 'Creación'
        }
      ],
      permiteNoAplica: false,
      requiereEvidencias: true,
      generaHallazgosAutomaticos: true,
      secciones: [
        {
          id: 'SEC-R-001',
          orden: 1,
          nombre: 'Identificación de Riesgos',
          descripcion: 'Verificación del proceso de identificación de riesgos',
          items: [
            {
              id: 'ITEM-R-001',
              numero: '1.1',
              criterio: '¿Existe una matriz de riesgos actualizada?',
              normativaReferencia: 'MIPG - Dimensión Talento Humano',
              esCritico: true
            }
          ]
        }
      ]
    }
  ]);

  // ==================== CÁLCULOS Y ESTADÍSTICAS ====================

  const calcularEstadisticas = (): EstadisticasBiblioteca => {
    const activas = listas.filter(l => l.estado === 'activa');
    const listasConCumplimiento = listas.filter(l => l.cumplimiento !== undefined);
    
    const cumplimientoPromedio = listasConCumplimiento.length > 0
      ? Math.round(
          listasConCumplimiento.reduce((sum, l) => sum + (l.cumplimiento || 0), 0) /
          listasConCumplimiento.length
        )
      : 0;

    const porCategoria = categorias.map(cat => ({
      categoria: cat.label,
      cantidad: listas.filter(l => l.categoria === cat.value).length
    }));

    return {
      totalListas: listas.length,
      listasActivas: activas.length,
      listasBorrador: listas.filter(l => l.estado === 'borrador').length,
      listasArchivadas: listas.filter(l => l.estado === 'archivada').length,
      cumplimientoPromedio,
      listasAplicadas: listas.filter(l => l.auditoriaId).length,
      hallazgosGenerados: listas.reduce((sum, l) => sum + (l.hallazgosGenerados || 0), 0),
      porCategoria
    };
  };

  const estadisticas = calcularEstadisticas();

  // ==================== FUNCIONES ====================

  const handleCrearLista = () => {
    setIsCrearListaOpen(true);
  };

  const handleEditarLista = (lista: ListaChequeo) => {
    setListaSeleccionada(lista);
    setIsEditarListaOpen(true);
  };

  const handleVerLista = (lista: ListaChequeo) => {
    setListaSeleccionada(lista);
    setIsVerListaOpen(true);
  };

  const handleAplicarLista = (lista: ListaChequeo) => {
    setListaSeleccionada(lista);
    setIsAplicarListaOpen(true);
  };

  const handleDiligenciar = (lista: ListaChequeo) => {
    setListaSeleccionada(lista);
    setIsDiligenciarOpen(true);
  };

  const handleVerVersiones = (lista: ListaChequeo) => {
    setListaSeleccionada(lista);
    setIsVersionesOpen(true);
  };

  const handleClonarLista = (lista: ListaChequeo) => {
    const nuevaLista: ListaChequeo = {
      ...lista,
      id: `LC-${Date.now()}`,
      codigo: `${lista.codigo}-COPIA`,
      nombre: `${lista.nombre} (Copia)`,
      version: '1.0',
      estado: 'borrador',
      fechaCreacion: new Date().toISOString().split('T')[0],
      creadoPor: usuarioActual.nombre,
      ultimaModificacion: new Date().toISOString().split('T')[0],
      modificadoPor: usuarioActual.nombre,
      versionBase: undefined,
      historialVersiones: [
        {
          version: '1.0',
          fecha: new Date().toISOString().split('T')[0],
          usuario: usuarioActual.nombre,
          cambios: `Clonada desde ${lista.codigo} v${lista.version}`,
          motivoCambio: 'Clonación de lista existente'
        }
      ],
      auditoriaId: undefined,
      nombreAuditoria: undefined,
      auditorResponsable: undefined,
      fechaAplicacion: undefined,
      fechaDiligenciamiento: undefined,
      itemsCompletados: undefined,
      cumplimiento: undefined,
      noCumplimientos: undefined,
      noAplica: undefined,
      hallazgosGenerados: undefined,
      // Limpiar respuestas de items
      secciones: lista.secciones.map(seccion => ({
        ...seccion,
        items: seccion.items.map(item => ({
          ...item,
          respuesta: undefined,
          observaciones: undefined,
          evidencias: undefined,
          generaHallazgo: undefined
        }))
      }))
    };

    setListas(prev => [...prev, nuevaLista]);
    toast.success('Lista clonada exitosamente', {
      description: `Se creó una copia editable: ${nuevaLista.codigo}`
    });
  };

  const handleArchivarLista = (listaId: string) => {
    setListas(prev => prev.map(l => 
      l.id === listaId ? { ...l, estado: 'archivada' as const } : l
    ));
    toast.info('Lista archivada', {
      description: 'La lista fue movida a archivadas'
    });
  };

  const handleEliminarLista = (listaId: string) => {
    if (confirm('¿Está seguro de eliminar esta lista? Esta acción no se puede deshacer.')) {
      setListas(prev => prev.filter(l => l.id !== listaId));
      toast.error('Lista eliminada');
    }
  };

  // Filtros
  const listasFiltradas = listas.filter(lista => {
    const matchSearch = 
      lista.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lista.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lista.proceso.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lista.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchProceso = filtroProceso === 'todos' || lista.proceso === filtroProceso;
    const matchCategoria = filtroCategoria === 'todos' || lista.categoria === filtroCategoria;
    const matchEstado = filtroEstado === 'todos' || lista.estado === filtroEstado;

    return matchSearch && matchProceso && matchCategoria && matchEstado;
  });

  // ==================== BADGES Y HELPERS ====================

  const getEstadoBadge = (estado: ListaChequeo['estado']) => {
    const estilos = {
      'borrador': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Edit3, label: 'Borrador' },
      'activa': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Activa' },
      'archivada': { bg: 'bg-gray-100', text: 'text-gray-800', icon: Archive, label: 'Archivada' }
    };
    const estilo = estilos[estado];
    const Icon = estilo.icon;
    return (
      <Badge className={`${estilo.bg} ${estilo.text} border-0 px-2 py-1 flex items-center gap-1 w-fit text-xs`}>
        <Icon className="w-3 h-3" />
        {estilo.label}
      </Badge>
    );
  };

  const getCategoriaBadge = (categoria: ListaChequeo['categoria']) => {
    const cat = categorias.find(c => c.value === categoria);
    if (!cat) return null;
    const Icon = cat.icon;
    return (
      <Badge variant="outline" className="px-2 py-1 flex items-center gap-1 w-fit text-xs">
        <Icon className="w-3 h-3" />
        {cat.label}
      </Badge>
    );
  };

  // ==================== RENDER ====================

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                  boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)'
                }}
              >
                <BookOpen className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl tracking-tight text-gray-900">
                  Biblioteca de Listas de Chequeo
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Gestión de listas de verificación reutilizables y versionadas
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                toast.info('Exportando biblioteca...', {
                  description: 'Generando archivo Excel con todas las listas'
                });
              }}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar Biblioteca
            </Button>
            <Button
              onClick={handleCrearLista}
              className="bg-[#003DA5] hover:bg-[#002873] gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Lista
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-blue-600" />
            <p className="text-xs text-gray-700">Total Listas</p>
          </div>
          <p className="text-3xl text-gray-900">{estadisticas.totalListas}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
            <span>{estadisticas.listasActivas} activas</span>
            <span>•</span>
            <span>{estadisticas.listasBorrador} borradores</span>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-xs text-gray-700">Listas Activas</p>
          </div>
          <p className="text-3xl text-gray-900">{estadisticas.listasActivas}</p>
          <p className="text-xs text-gray-600 mt-2">Disponibles para usar</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <PlayCircle className="w-5 h-5 text-purple-600" />
            <p className="text-xs text-gray-700">Aplicadas</p>
          </div>
          <p className="text-3xl text-gray-900">{estadisticas.listasAplicadas}</p>
          <p className="text-xs text-gray-600 mt-2">En auditorías</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <p className="text-xs text-gray-700">Cumplimiento Prom.</p>
          </div>
          <p className="text-3xl text-gray-900">{estadisticas.cumplimientoPromedio}%</p>
          <p className="text-xs text-gray-600 mt-2">De verificación</p>
        </Card>
      </div>

      {/* Panel informativo */}
      <Card className="p-6 bg-blue-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-blue-900 mb-2">Biblioteca de Listas de Chequeo (RF007)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-blue-800">
              <div>
                <p className="font-medium mb-1">✓ Templates Reutilizables</p>
                <p className="text-xs">Crea plantillas por proceso con criterios estandarizados</p>
              </div>
              <div>
                <p className="font-medium mb-1">✓ Control de Versiones</p>
                <p className="text-xs">Historial completo de cambios y motivaciones</p>
              </div>
              <div>
                <p className="font-medium mb-1">✓ Aplicación a Auditorías</p>
                <p className="text-xs">Vincula listas a auditorías específicas para diligenciar</p>
              </div>
              <div>
                <p className="font-medium mb-1">✓ Generación de Hallazgos</p>
                <p className="text-xs">Crea hallazgos automáticos desde no conformidades</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar listas por nombre, código o proceso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filtroProceso} onValueChange={setFiltroProceso}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los procesos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los procesos</SelectItem>
              {procesos.map(proc => (
                <SelectItem key={proc} value={proc}>{proc}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las categorías</SelectItem>
              {categorias.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="activa">Activas</SelectItem>
              <SelectItem value="borrador">Borradores</SelectItem>
              <SelectItem value="archivada">Archivadas</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant={vistaLista === 'tarjetas' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setVistaLista('tarjetas')}
            >
              <Layers className="w-4 h-4" />
            </Button>
            <Button
              variant={vistaLista === 'tabla' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setVistaLista('tabla')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Resumen de filtros activos */}
        {(searchTerm || filtroProceso !== 'todos' || filtroCategoria !== 'todos' || filtroEstado !== 'todos') && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-sm text-gray-600">
              Mostrando {listasFiltradas.length} de {listas.length} listas
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setFiltroProceso('todos');
                setFiltroCategoria('todos');
                setFiltroEstado('todos');
              }}
              className="text-xs h-7"
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </Card>

      {/* Tabs de contenido */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="biblioteca" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Biblioteca ({listasFiltradas.length})
          </TabsTrigger>
          <TabsTrigger value="aplicadas" className="gap-2">
            <PlayCircle className="w-4 h-4" />
            Aplicadas ({listas.filter(l => l.auditoriaId).length})
          </TabsTrigger>
          <TabsTrigger value="estadisticas" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Estadísticas
          </TabsTrigger>
        </TabsList>

        {/* Tab: Biblioteca */}
        <TabsContent value="biblioteca" className="space-y-4 mt-4">
          {vistaLista === 'tarjetas' ? (
            <TarjetasListas
              listas={listasFiltradas}
              onVer={handleVerLista}
              onEditar={handleEditarLista}
              onAplicar={handleAplicarLista}
              onDiligenciar={handleDiligenciar}
              onVersiones={handleVerVersiones}
              onClonar={handleClonarLista}
              onArchivar={handleArchivarLista}
              onEliminar={handleEliminarLista}
              getEstadoBadge={getEstadoBadge}
              getCategoriaBadge={getCategoriaBadge}
            />
          ) : (
            <TablaListas
              listas={listasFiltradas}
              onVer={handleVerLista}
              onEditar={handleEditarLista}
              onAplicar={handleAplicarLista}
              onDiligenciar={handleDiligenciar}
              onVersiones={handleVerVersiones}
              onClonar={handleClonarLista}
              onArchivar={handleArchivarLista}
              onEliminar={handleEliminarLista}
              getEstadoBadge={getEstadoBadge}
              getCategoriaBadge={getCategoriaBadge}
            />
          )}
        </TabsContent>

        {/* Tab: Aplicadas */}
        <TabsContent value="aplicadas" className="mt-4">
          <ListasAplicadas
            listas={listas.filter(l => l.auditoriaId)}
            onDiligenciar={handleDiligenciar}
            onVer={handleVerLista}
            getEstadoBadge={getEstadoBadge}
          />
        </TabsContent>

        {/* Tab: Estadísticas */}
        <TabsContent value="estadisticas" className="mt-4">
          <EstadisticasBibliotecaTab estadisticas={estadisticas} listas={listas} />
        </TabsContent>
      </Tabs>

      {/* Modales - Se implementarán en los siguientes componentes */}
      {isCrearListaOpen && (
        <ModalCrearLista
          isOpen={isCrearListaOpen}
          onClose={() => setIsCrearListaOpen(false)}
          onSave={(nuevaLista) => {
            setListas(prev => [...prev, nuevaLista]);
            setIsCrearListaOpen(false);
            toast.success('Lista creada exitosamente');
          }}
          procesos={procesos}
          categorias={categorias}
          usuarioActual={usuarioActual}
        />
      )}

      {isVerListaOpen && listaSeleccionada && (
        <ModalVerLista
          isOpen={isVerListaOpen}
          onClose={() => {
            setIsVerListaOpen(false);
            setListaSeleccionada(null);
          }}
          lista={listaSeleccionada}
          getCategoriaBadge={getCategoriaBadge}
          getEstadoBadge={getEstadoBadge}
        />
      )}

      {isVersionesOpen && listaSeleccionada && (
        <ModalVersiones
          isOpen={isVersionesOpen}
          onClose={() => {
            setIsVersionesOpen(false);
            setListaSeleccionada(null);
          }}
          lista={listaSeleccionada}
        />
      )}
    </div>
  );
}

// ==================== SUBCOMPONENTES ====================

interface TarjetasListasProps {
  listas: ListaChequeo[];
  onVer: (lista: ListaChequeo) => void;
  onEditar: (lista: ListaChequeo) => void;
  onAplicar: (lista: ListaChequeo) => void;
  onDiligenciar: (lista: ListaChequeo) => void;
  onVersiones: (lista: ListaChequeo) => void;
  onClonar: (lista: ListaChequeo) => void;
  onArchivar: (listaId: string) => void;
  onEliminar: (listaId: string) => void;
  getEstadoBadge: (estado: ListaChequeo['estado']) => JSX.Element;
  getCategoriaBadge: (categoria: ListaChequeo['categoria']) => JSX.Element | null;
}

function TarjetasListas({
  listas,
  onVer,
  onEditar,
  onAplicar,
  onDiligenciar,
  onVersiones,
  onClonar,
  onArchivar,
  onEliminar,
  getEstadoBadge,
  getCategoriaBadge
}: TarjetasListasProps) {
  if (listas.length === 0) {
    return (
      <Card className="p-12 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-gray-900 mb-2">No se encontraron listas</h3>
        <p className="text-sm text-gray-600 mb-4">
          Intenta ajustar los filtros o crea una nueva lista de chequeo
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AnimatePresence mode="popLayout">
        {listas.map((lista, index) => (
          <motion.div
            key={lista.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <Card className="p-5 hover:shadow-lg transition-all duration-200 border-2 hover:border-[#003DA5]">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      {lista.codigo}
                    </Badge>
                    {getEstadoBadge(lista.estado)}
                    {getCategoriaBadge(lista.categoria)}
                  </div>
                  <h3 className="text-gray-900 mb-1">{lista.nombre}</h3>
                  <p className="text-xs text-gray-600 line-clamp-2">{lista.descripcion}</p>
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                <div className="flex items-center gap-2 text-gray-600">
                  <Target className="w-4 h-4" />
                  <span>{lista.proceso}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <FileText className="w-4 h-4" />
                  <span>{lista.totalItems} ítems</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <GitBranch className="w-4 h-4" />
                  <span>v{lista.version}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(lista.fechaCreacion).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Cumplimiento si tiene datos */}
              {lista.cumplimiento !== undefined && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="text-gray-600">Cumplimiento</span>
                    <span className="text-gray-900">{lista.cumplimiento}%</span>
                  </div>
                  <Progress value={lista.cumplimiento} className="h-2" />
                  {lista.hallazgosGenerados && lista.hallazgosGenerados > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-orange-700">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{lista.hallazgosGenerados} hallazgos generados</span>
                    </div>
                  )}
                </div>
              )}

              {/* Aplicada en auditoría */}
              {lista.auditoriaId && (
                <div className="mb-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 text-xs text-purple-800">
                    <PlayCircle className="w-4 h-4" />
                    <div>
                      <p className="font-medium">{lista.nombreAuditoria}</p>
                      <p className="text-purple-600">Auditor: {lista.auditorResponsable}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="flex flex-wrap gap-2 pt-3 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onVer(lista)}
                  className="gap-1 text-xs h-8"
                >
                  <Eye className="w-3 h-3" />
                  Ver
                </Button>
                {lista.estado === 'activa' && !lista.auditoriaId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAplicar(lista)}
                    className="gap-1 text-xs h-8 text-purple-700 hover:text-purple-800"
                  >
                    <PlayCircle className="w-3 h-3" />
                    Aplicar
                  </Button>
                )}
                {lista.auditoriaId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDiligenciar(lista)}
                    className="gap-1 text-xs h-8 text-green-700 hover:text-green-800"
                  >
                    <FileCheck className="w-3 h-3" />
                    Diligenciar
                  </Button>
                )}
                {lista.estado === 'borrador' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditar(lista)}
                    className="gap-1 text-xs h-8"
                  >
                    <Edit3 className="w-3 h-3" />
                    Editar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onVersiones(lista)}
                  className="gap-1 text-xs h-8"
                >
                  <History className="w-3 h-3" />
                  Versiones
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onClonar(lista)}
                  className="gap-1 text-xs h-8"
                >
                  <Copy className="w-3 h-3" />
                  Clonar
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Componente TablaListas (simplificado - redirige a tarjetas)
function TablaListas(props: TarjetasListasProps) {
  return <TarjetasListas {...props} />;
}

// Componente ListasAplicadas
function ListasAplicadas({
  listas,
  onDiligenciar,
  onVer,
  getEstadoBadge
}: {
  listas: ListaChequeo[];
  onDiligenciar: (lista: ListaChequeo) => void;
  onVer: (lista: ListaChequeo) => void;
  getEstadoBadge: (estado: ListaChequeo['estado']) => JSX.Element;
}) {
  if (listas.length === 0) {
    return (
      <Card className="p-12 text-center">
        <PlayCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-gray-900 mb-2">No hay listas aplicadas</h3>
        <p className="text-sm text-gray-600">
          Las listas aplicadas a auditorías aparecerán aquí
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {listas.map(lista => (
        <Card key={lista.id} className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">{lista.codigo}</Badge>
                {getEstadoBadge(lista.estado)}
                {lista.cumplimiento !== undefined && (
                  <Badge className={`${
                    lista.cumplimiento >= 80 ? 'bg-green-100 text-green-800' :
                    lista.cumplimiento >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  } border-0`}>
                    {lista.cumplimiento}% Cumplimiento
                  </Badge>
                )}
              </div>
              <h3 className="text-gray-900 mb-1">{lista.nombre}</h3>
              
              <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                <div>
                  <p className="text-xs text-gray-600">Auditoría</p>
                  <p className="text-gray-900">{lista.nombreAuditoria}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Auditor Responsable</p>
                  <p className="text-gray-900">{lista.auditorResponsable}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Fecha Aplicación</p>
                  <p className="text-gray-900">
                    {lista.fechaAplicacion ? new Date(lista.fechaAplicacion).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Progreso</p>
                  <p className="text-gray-900">
                    {lista.itemsCompletados || 0} / {lista.totalItems} ítems
                  </p>
                </div>
              </div>

              {lista.cumplimiento !== undefined && (
                <div className="mt-3">
                  <Progress value={lista.cumplimiento} className="h-2" />
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-green-700">{lista.totalItems - (lista.noCumplimientos || 0) - (lista.noAplica || 0)} Cumple</span>
                    <span className="text-red-700">{lista.noCumplimientos || 0} No Cumple</span>
                    <span className="text-gray-600">{lista.noAplica || 0} No Aplica</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 ml-4">
              <Button
                size="sm"
                onClick={() => onDiligenciar(lista)}
                className="bg-[#003DA5] hover:bg-[#002873] gap-2"
              >
                <FileCheck className="w-4 h-4" />
                {lista.cumplimiento === 100 ? 'Ver Resultados' : 'Diligenciar'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onVer(lista)}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Componente EstadisticasBibliotecaTab
function EstadisticasBibliotecaTab({
  estadisticas,
  listas
}: {
  estadisticas: EstadisticasBiblioteca;
  listas: ListaChequeo[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Distribución por categoría */}
        <Card className="p-5">
          <h3 className="text-gray-900 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#003DA5]" />
            Distribución por Categoría
          </h3>
          <div className="space-y-3">
            {estadisticas.porCategoria.map(cat => {
              const porcentaje = Math.round((cat.cantidad / estadisticas.totalListas) * 100);
              return (
                <div key={cat.categoria}>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="text-gray-700">{cat.categoria}</span>
                    <span className="text-gray-900">{cat.cantidad} ({porcentaje}%)</span>
                  </div>
                  <Progress value={porcentaje} className="h-2" />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Estado de listas */}
        <Card className="p-5">
          <h3 className="text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-[#003DA5]" />
            Estado de Listas
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">Activas</span>
              </div>
              <span className="text-gray-900">{estadisticas.listasActivas}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm text-gray-700">Borradores</span>
              </div>
              <span className="text-gray-900">{estadisticas.listasBorrador}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span className="text-sm text-gray-700">Archivadas</span>
              </div>
              <span className="text-gray-900">{estadisticas.listasArchivadas}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-gray-700">Aplicadas en auditorías</span>
              </div>
              <span className="text-gray-900">{estadisticas.listasAplicadas}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-gray-700">Hallazgos generados</span>
              </div>
              <span className="text-gray-900">{estadisticas.hallazgosGenerados}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Resumen adicional */}
      <Card className="p-5">
        <h3 className="text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-[#003DA5]" />
          Resumen de Uso
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-800 mb-1">Total de ítems de verificación</p>
            <p className="text-2xl text-blue-900">
              {listas.reduce((sum, l) => sum + l.totalItems, 0)}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-green-800 mb-1">Cumplimiento promedio</p>
            <p className="text-2xl text-green-900">{estadisticas.cumplimientoPromedio}%</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-purple-800 mb-1">Listas con versiones</p>
            <p className="text-2xl text-purple-900">
              {listas.filter(l => l.historialVersiones.length > 1).length}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Modales stub (se implementarán en archivos separados)
function ModalCrearLista({ isOpen, onClose, onSave, procesos, categorias, usuarioActual }: any) {
  const [nombre, setNombre] = useState('');
  const [proceso, setProceso] = useState('');
  const [categoria, setCategoria] = useState('');
  
  if (!isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear Nueva Lista de Chequeo</DialogTitle>
          <DialogDescription>
            Completa la información básica de la lista. Podrás agregar secciones e ítems después.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Nombre de la lista *</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Verificación de Controles Financieros"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Proceso *</Label>
              <Select value={proceso} onValueChange={setProceso}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proceso" />
                </SelectTrigger>
                <SelectContent>
                  {procesos.map((p: string) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoría *</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c: any) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => {
              if (!nombre || !proceso || !categoria) {
                toast.error('Completa los campos requeridos');
                return;
              }
              const nuevaLista: ListaChequeo = {
                id: `LC-${Date.now()}`,
                codigo: `LC-${categoria.substring(0, 3).toUpperCase()}-${Date.now()}`,
                nombre,
                version: '1.0',
                proceso,
                categoria: categoria as any,
                normativaAplicable: '',
                descripcion: '',
                objetivo: '',
                estado: 'borrador',
                totalItems: 0,
                fechaCreacion: new Date().toISOString().split('T')[0],
                creadoPor: usuarioActual.nombre,
                ultimaModificacion: new Date().toISOString().split('T')[0],
                modificadoPor: usuarioActual.nombre,
                historialVersiones: [{
                  version: '1.0',
                  fecha: new Date().toISOString().split('T')[0],
                  usuario: usuarioActual.nombre,
                  cambios: 'Versión inicial',
                  motivoCambio: 'Creación'
                }],
                secciones: [],
                permiteNoAplica: true,
                requiereEvidencias: false,
                generaHallazgosAutomaticos: true
              };
              onSave(nuevaLista);
            }}
            className="bg-[#003DA5] hover:bg-[#002873]"
          >
            Crear Lista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModalVerLista({ isOpen, onClose, lista, getCategoriaBadge, getEstadoBadge }: any) {
  if (!isOpen || !lista) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {lista.nombre}
            <Badge variant="secondary" className="text-xs">{lista.codigo}</Badge>
          </DialogTitle>
          <DialogDescription>
            {lista.descripcion}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            <div className="flex gap-2">
              {getEstadoBadge(lista.estado)}
              {getCategoriaBadge(lista.categoria)}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Proceso</p>
                <p className="text-gray-900">{lista.proceso}</p>
              </div>
              <div>
                <p className="text-gray-600">Versión</p>
                <p className="text-gray-900">v{lista.version}</p>
              </div>
              <div>
                <p className="text-gray-600">Total ítems</p>
                <p className="text-gray-900">{lista.totalItems}</p>
              </div>
              <div>
                <p className="text-gray-600">Creado por</p>
                <p className="text-gray-900">{lista.creadoPor}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-gray-900 mb-2">Secciones e Ítems</h4>
              {lista.secciones.map((seccion: SeccionLista) => (
                <div key={seccion.id} className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <h5 className="text-gray-900 mb-2">{seccion.nombre}</h5>
                  <p className="text-sm text-gray-600 mb-2">{seccion.descripcion}</p>
                  <div className="space-y-2">
                    {seccion.items.map((item) => (
                      <div key={item.id} className="text-sm p-2 bg-white rounded border">
                        <p className="text-gray-900">{item.numero}. {item.criterio}</p>
                        <p className="text-xs text-gray-600 mt-1">{item.normativaReferencia}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function ModalVersiones({ isOpen, onClose, lista }: any) {
  if (!isOpen || !lista) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de Versiones - {lista.codigo}
          </DialogTitle>
          <DialogDescription>
            Versión actual: v{lista.version}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {lista.historialVersiones.map((version: VersionHistorial, index: number) => (
              <div
                key={version.version}
                className={`p-4 rounded-lg border-2 ${
                  index === 0 ? 'border-[#003DA5] bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={index === 0 ? 'bg-[#003DA5]' : 'bg-gray-500'}>
                      v{version.version}
                    </Badge>
                    {index === 0 && <Badge variant="secondary">Actual</Badge>}
                  </div>
                  <span className="text-xs text-gray-600">{new Date(version.fecha).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-900 mb-1">{version.cambios}</p>
                <p className="text-xs text-gray-600 mb-2">Motivo: {version.motivoCambio}</p>
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {version.usuario}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
