/**
 * RF007 - LISTAS DE CHEQUEO ESTANDARIZADAS
 * Biblioteca de listas reutilizables para auditorías
 * Oficina de Control Interno - ESAP
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare, Plus, Search, Filter, Eye, Edit, Copy, Trash2,
  Download, Upload, FileText, BookOpen, Tag, Calendar, User,
  ChevronDown, ChevronUp, Save, X, AlertCircle, CheckCircle2,
  Archive, BarChart3, Share2, History, Settings, Layers
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';

// ============ TIPOS ============

interface ItemListaChequeo {
  id: string;
  numero: number;
  pregunta: string;
  criterio: string;
  normativaReferencia?: string;
  categoria?: string;
  esCritico: boolean;
  descripcionAyuda?: string;
}

interface ListaChequeoPlantilla {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  tiposProceso: string[];
  categorias: string[];
  version: string;
  estado: 'Activa' | 'En Revisión' | 'Archivada';
  items: ItemListaChequeo[];
  creadoPor: string;
  fechaCreacion: string;
  modificadoPor?: string;
  fechaModificacion?: string;
  vecesUtilizada: number;
  promedioCaracterizacion?: number;
}

interface HistorialVersion {
  id: string;
  listaId: string;
  version: string;
  cambios: string;
  modificadoPor: string;
  fecha: string;
}

// ============ DATOS MOCK ============

const TIPOS_PROCESO_DISPONIBLES = [
  'Gestión Contractual',
  'Gestión de Talento Humano',
  'Gestión Financiera',
  'Gestión de TIC',
  'Gestión Documental',
  'Gestión de Bienes',
  'Gestión Académica',
  'Planeación Estratégica',
  'Atención al Ciudadano',
  'Control Interno'
];

const CATEGORIAS_DISPONIBLES = [
  'Normatividad',
  'Procesos y Procedimientos',
  'Documentación',
  'Recursos',
  'Control y Seguimiento',
  'Cumplimiento Legal',
  'Gestión de Riesgos',
  'Indicadores'
];

const MOCK_LISTAS: ListaChequeoPlantilla[] = [
  {
    id: 'lc-plantilla-001',
    codigo: 'LC-CONT-001',
    nombre: 'Lista de Chequeo - Gestión Contractual',
    descripcion: 'Verificación de cumplimiento normativo en procesos de contratación pública',
    tiposProceso: ['Gestión Contractual'],
    categorias: ['Normatividad', 'Procesos y Procedimientos', 'Documentación'],
    version: 'v2.1',
    estado: 'Activa',
    creadoPor: 'Juan Pérez',
    fechaCreacion: '2024-01-15',
    modificadoPor: 'María García',
    fechaModificacion: '2025-01-10',
    vecesUtilizada: 24,
    promedioCaracterizacion: 85,
    items: [
      {
        id: 'item-001',
        numero: 1,
        pregunta: '¿Se cuenta con un plan de contratación aprobado para la vigencia?',
        criterio: 'Debe existir un plan de contratación aprobado por la autoridad competente',
        normativaReferencia: 'Decreto 1082 de 2015 - Art. 2.2.1.1.1.4.1',
        categoria: 'Normatividad',
        esCritico: true,
        descripcionAyuda: 'Verificar Resolución de aprobación del Plan Anual de Adquisiciones'
      },
      {
        id: 'item-002',
        numero: 2,
        pregunta: '¿Los estudios previos incluyen análisis del sector?',
        criterio: 'Los estudios previos deben contener análisis del sector económico',
        normativaReferencia: 'Ley 1474 de 2011 - Art. 83',
        categoria: 'Procesos y Procedimientos',
        esCritico: true,
        descripcionAyuda: 'Revisar sección de análisis del sector en estudios previos'
      },
      {
        id: 'item-003',
        numero: 3,
        pregunta: '¿Se verifica antecedentes fiscales de contratistas?',
        criterio: 'Debe existir consulta y verificación en el Boletín de Responsables Fiscales',
        normativaReferencia: 'Ley 1474 de 2011 - Art. 90',
        categoria: 'Control y Seguimiento',
        esCritico: true
      },
      {
        id: 'item-004',
        numero: 4,
        pregunta: '¿Los contratos se publican en SECOP II?',
        criterio: 'Todos los contratos deben publicarse en la plataforma SECOP II',
        normativaReferencia: 'Decreto 1082 de 2015',
        categoria: 'Cumplimiento Legal',
        esCritico: false
      },
      {
        id: 'item-005',
        numero: 5,
        pregunta: '¿Existe un proceso de supervisión de contratos?',
        criterio: 'Debe designarse supervisor para cada contrato',
        normativaReferencia: 'Ley 1474 de 2011',
        categoria: 'Control y Seguimiento',
        esCritico: true
      }
    ]
  },
  {
    id: 'lc-plantilla-002',
    codigo: 'LC-TH-001',
    nombre: 'Lista de Chequeo - Talento Humano',
    descripcion: 'Evaluación de la gestión del talento humano según normativa vigente',
    tiposProceso: ['Gestión de Talento Humano'],
    categorias: ['Normatividad', 'Procesos y Procedimientos'],
    version: 'v1.5',
    estado: 'Activa',
    creadoPor: 'Ana Rodríguez',
    fechaCreacion: '2024-03-20',
    modificadoPor: 'Ana Rodríguez',
    fechaModificacion: '2024-11-15',
    vecesUtilizada: 18,
    promedioCaracterizacion: 92,
    items: [
      {
        id: 'item-006',
        numero: 1,
        pregunta: '¿Existe un Plan Estratégico de Talento Humano vigente?',
        criterio: 'Debe existir un plan aprobado y actualizado',
        normativaReferencia: 'Decreto 1083 de 2015 - Art. 2.2.2.4.1',
        categoria: 'Normatividad',
        esCritico: true
      },
      {
        id: 'item-007',
        numero: 2,
        pregunta: '¿Se cuenta con Manual de Funciones actualizado?',
        criterio: 'Manual actualizado según estructura organizacional',
        normativaReferencia: 'Decreto 1083 de 2015 - Art. 2.2.2.6.1',
        categoria: 'Documentación',
        esCritico: true
      },
      {
        id: 'item-008',
        numero: 3,
        pregunta: '¿Se aplican las evaluaciones de desempeño?',
        criterio: 'Evaluaciones anuales según protocolo establecido',
        normativaReferencia: 'Decreto 1083 de 2015',
        categoria: 'Procesos y Procedimientos',
        esCritico: false
      }
    ]
  },
  {
    id: 'lc-plantilla-003',
    codigo: 'LC-TIC-001',
    nombre: 'Lista de Chequeo - Seguridad de la Información',
    descripcion: 'Verificación de controles de seguridad informática',
    tiposProceso: ['Gestión de TIC'],
    categorias: ['Seguridad', 'Control y Seguimiento'],
    version: 'v3.0',
    estado: 'Activa',
    creadoPor: 'Carlos Mendoza',
    fechaCreacion: '2023-08-10',
    vecesUtilizada: 12,
    promedioCaracterizacion: 78,
    items: [
      {
        id: 'item-009',
        numero: 1,
        pregunta: '¿Existe una política de seguridad de la información?',
        criterio: 'Política documentada y aprobada',
        categoria: 'Documentación',
        esCritico: true
      },
      {
        id: 'item-010',
        numero: 2,
        pregunta: '¿Se realizan copias de seguridad periódicas?',
        criterio: 'Backups automatizados con verificación',
        categoria: 'Control y Seguimiento',
        esCritico: true
      }
    ]
  }
];

const MOCK_HISTORIAL: HistorialVersion[] = [
  {
    id: 'hist-001',
    listaId: 'lc-plantilla-001',
    version: 'v2.1',
    cambios: 'Actualización de referencias normativas según Decreto 1082 de 2015',
    modificadoPor: 'María García',
    fecha: '2025-01-10'
  },
  {
    id: 'hist-002',
    listaId: 'lc-plantilla-001',
    version: 'v2.0',
    cambios: 'Agregado ítem sobre supervisión de contratos',
    modificadoPor: 'Juan Pérez',
    fecha: '2024-08-15'
  },
  {
    id: 'hist-003',
    listaId: 'lc-plantilla-001',
    version: 'v1.0',
    cambios: 'Versión inicial',
    modificadoPor: 'Juan Pérez',
    fecha: '2024-01-15'
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function ListasChequeoEstandarizadas() {
  const [listas, setListas] = useState<ListaChequeoPlantilla[]>(MOCK_LISTAS);
  const [listaSeleccionada, setListaSeleccionada] = useState<ListaChequeoPlantilla | null>(null);
  const [vistaActual, setVistaActual] = useState<'biblioteca' | 'detalle' | 'editor'>('biblioteca');
  const [modoEditor, setModoEditor] = useState<'crear' | 'editar'>('crear');
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipoProceso, setFiltroTipoProceso] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  
  // Modales
  const [modalDuplicar, setModalDuplicar] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);
  const [modalExportar, setModalExportar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);

  // Listas filtradas
  const listasFiltradas = listas.filter(lista => {
    const coincideBusqueda = lista.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                             lista.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
                             lista.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    const coincideTipo = filtroTipoProceso === 'Todos' || lista.tiposProceso.includes(filtroTipoProceso);
    const coincideEstado = filtroEstado === 'Todos' || lista.estado === filtroEstado;
    const coincideCategoria = filtroCategoria === 'Todos' || lista.categorias.includes(filtroCategoria);
    
    return coincideBusqueda && coincideTipo && coincideEstado && coincideCategoria;
  });

  const handleCrearNueva = () => {
    setModoEditor('crear');
    setListaSeleccionada(null);
    setVistaActual('editor');
  };

  const handleEditarLista = (lista: ListaChequeoPlantilla) => {
    setModoEditor('editar');
    setListaSeleccionada(lista);
    setVistaActual('editor');
  };

  const handleVerDetalle = (lista: ListaChequeoPlantilla) => {
    setListaSeleccionada(lista);
    setVistaActual('detalle');
  };

  const handleDuplicarLista = (lista: ListaChequeoPlantilla) => {
    const nuevaLista: ListaChequeoPlantilla = {
      ...lista,
      id: `lc-plantilla-${Date.now()}`,
      codigo: `${lista.codigo}-COPY`,
      nombre: `${lista.nombre} (Copia)`,
      version: 'v1.0',
      estado: 'En Revisión',
      fechaCreacion: new Date().toISOString().split('T')[0],
      creadoPor: 'Usuario Actual',
      modificadoPor: undefined,
      fechaModificacion: undefined,
      vecesUtilizada: 0
    };
    
    setListas([nuevaLista, ...listas]);
    setModalDuplicar(false);
  };

  const handleArchivarLista = (listaId: string) => {
    setListas(listas.map(l => 
      l.id === listaId 
        ? { ...l, estado: 'Archivada' as const }
        : l
    ));
  };

  const handleActivarLista = (listaId: string) => {
    setListas(listas.map(l => 
      l.id === listaId 
        ? { ...l, estado: 'Activa' as const }
        : l
    ));
  };

  const handleExportar = (formato: 'excel' | 'pdf' | 'word') => {
    console.log(`Exportando lista en formato ${formato}`, listaSeleccionada);
    setModalExportar(false);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Listas de Chequeo Estandarizadas
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            RF007 - Biblioteca de listas reutilizables
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setVistaActual('biblioteca')}
            variant={vistaActual === 'biblioteca' ? 'default' : 'outline'}
            size="sm"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Biblioteca
          </Button>
          <Button
            onClick={handleCrearNueva}
            size="sm"
            style={{ background: '#8B5CF6' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Lista
          </Button>
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#8B5CF6' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Listas</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{listas.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#8B5CF615' }}>
              <CheckSquare className="w-6 h-6" style={{ color: '#8B5CF6' }} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Listas Activas</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {listas.filter(l => l.estado === 'Activa').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#10B98115' }}>
              <CheckCircle2 className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#F97316' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Ítems</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {listas.reduce((sum, l) => sum + l.items.length, 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#F9731615' }}>
              <Layers className="w-6 h-6" style={{ color: '#F97316' }} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#3B82F6' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Veces Utilizadas</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {listas.reduce((sum, l) => sum + l.vecesUtilizada, 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#3B82F615' }}>
              <BarChart3 className="w-6 h-6" style={{ color: '#3B82F6' }} />
            </div>
          </div>
        </Card>
      </div>

      {/* VISTAS */}
      <AnimatePresence mode="wait">
        {vistaActual === 'biblioteca' && (
          <BibliotecaView
            key="biblioteca"
            listas={listasFiltradas}
            busqueda={busqueda}
            onBusquedaChange={setBusqueda}
            filtroTipoProceso={filtroTipoProceso}
            onFiltroTipoProcesoChange={setFiltroTipoProceso}
            filtroEstado={filtroEstado}
            onFiltroEstadoChange={setFiltroEstado}
            filtroCategoria={filtroCategoria}
            onFiltroCategoriaChange={setFiltroCategoria}
            onVerDetalle={handleVerDetalle}
            onEditar={handleEditarLista}
            onDuplicar={(lista) => {
              setListaSeleccionada(lista);
              setModalDuplicar(true);
            }}
            onArchivar={handleArchivarLista}
            onActivar={handleActivarLista}
          />
        )}

        {vistaActual === 'detalle' && listaSeleccionada && (
          <DetalleListaView
            key="detalle"
            lista={listaSeleccionada}
            onVolver={() => setVistaActual('biblioteca')}
            onEditar={() => handleEditarLista(listaSeleccionada)}
            onHistorial={() => setModalHistorial(true)}
            onExportar={() => setModalExportar(true)}
          />
        )}

        {vistaActual === 'editor' && (
          <EditorListaView
            key="editor"
            lista={listaSeleccionada}
            modo={modoEditor}
            onGuardar={(lista) => {
              if (modoEditor === 'crear') {
                setListas([lista, ...listas]);
              } else {
                setListas(listas.map(l => l.id === lista.id ? lista : l));
              }
              setVistaActual('biblioteca');
            }}
            onCancelar={() => setVistaActual('biblioteca')}
          />
        )}
      </AnimatePresence>

      {/* MODAL: DUPLICAR LISTA */}
      <AnimatePresence>
        {modalDuplicar && listaSeleccionada && (
          <Modal
            titulo="Duplicar Lista de Chequeo"
            onCerrar={() => setModalDuplicar(false)}
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                ¿Desea crear una copia de la lista <strong>{listaSeleccionada.nombre}</strong>?
              </p>
              <div className="p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
                <p className="text-xs text-amber-900">
                  La copia se creará con estado "En Revisión" y deberá ser activada manualmente.
                </p>
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => setModalDuplicar(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleDuplicarLista(listaSeleccionada)}
                  className="flex-1"
                  style={{ background: '#8B5CF6' }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* MODAL: HISTORIAL DE VERSIONES */}
      <AnimatePresence>
        {modalHistorial && listaSeleccionada && (
          <Modal
            titulo="Historial de Versiones"
            onCerrar={() => setModalHistorial(false)}
          >
            <div className="space-y-3">
              {MOCK_HISTORIAL
                .filter(h => h.listaId === listaSeleccionada.id)
                .map((hist, index) => (
                  <div
                    key={hist.id}
                    className="p-4 rounded-lg border-l-4"
                    style={{
                      background: index === 0 ? '#F0FDF4' : '#F9FAFB',
                      borderLeftColor: index === 0 ? '#10B981' : '#D1D5DB'
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge style={{ background: index === 0 ? '#10B981' : '#6B7280', color: '#FFFFFF' }}>
                            {hist.version}
                          </Badge>
                          {index === 0 && (
                            <Badge style={{ background: '#10B981', color: '#FFFFFF' }}>Actual</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 mb-2">{hist.cambios}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {hist.modificadoPor}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {hist.fecha}
                          </span>
                        </div>
                      </div>
                      {index !== 0 && (
                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3 mr-1" />
                          Ver
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* MODAL: EXPORTAR */}
      <AnimatePresence>
        {modalExportar && (
          <Modal
            titulo="Exportar Lista de Chequeo"
            onCerrar={() => setModalExportar(false)}
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Seleccione el formato de exportación:
              </p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleExportar('excel')}
                  className="p-4 rounded-lg border-2 border-dashed hover:border-solid transition-all"
                  style={{ borderColor: '#10B981' }}
                >
                  <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: '#10B981' }} />
                  <p className="text-sm font-bold text-gray-900">Excel</p>
                </button>
                <button
                  onClick={() => handleExportar('pdf')}
                  className="p-4 rounded-lg border-2 border-dashed hover:border-solid transition-all"
                  style={{ borderColor: '#EF4444' }}
                >
                  <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: '#EF4444' }} />
                  <p className="text-sm font-bold text-gray-900">PDF</p>
                </button>
                <button
                  onClick={() => handleExportar('word')}
                  className="p-4 rounded-lg border-2 border-dashed hover:border-solid transition-all"
                  style={{ borderColor: '#3B82F6' }}
                >
                  <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: '#3B82F6' }} />
                  <p className="text-sm font-bold text-gray-900">Word</p>
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ VISTA: BIBLIOTECA ============

interface BibliotecaViewProps {
  listas: ListaChequeoPlantilla[];
  busqueda: string;
  onBusquedaChange: (busqueda: string) => void;
  filtroTipoProceso: string;
  onFiltroTipoProcesoChange: (tipo: string) => void;
  filtroEstado: string;
  onFiltroEstadoChange: (estado: string) => void;
  filtroCategoria: string;
  onFiltroCategoriaChange: (categoria: string) => void;
  onVerDetalle: (lista: ListaChequeoPlantilla) => void;
  onEditar: (lista: ListaChequeoPlantilla) => void;
  onDuplicar: (lista: ListaChequeoPlantilla) => void;
  onArchivar: (listaId: string) => void;
  onActivar: (listaId: string) => void;
}

function BibliotecaView({
  listas,
  busqueda,
  onBusquedaChange,
  filtroTipoProceso,
  onFiltroTipoProcesoChange,
  filtroEstado,
  onFiltroEstadoChange,
  filtroCategoria,
  onFiltroCategoriaChange,
  onVerDetalle,
  onEditar,
  onDuplicar,
  onArchivar,
  onActivar
}: BibliotecaViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* FILTROS */}
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o descripción..."
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filtroTipoProceso}
              onChange={(e) => onFiltroTipoProcesoChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="Todos">Todos los procesos</option>
              {TIPOS_PROCESO_DISPONIBLES.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => onFiltroEstadoChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Activa">Activa</option>
              <option value="En Revisión">En Revisión</option>
              <option value="Archivada">Archivada</option>
            </select>

            <select
              value={filtroCategoria}
              onChange={(e) => onFiltroCategoriaChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="Todos">Todas las categorías</option>
              {CATEGORIAS_DISPONIBLES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* GRID DE LISTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {listas.map((lista) => (
          <ListaChequeoCard
            key={lista.id}
            lista={lista}
            onVerDetalle={() => onVerDetalle(lista)}
            onEditar={() => onEditar(lista)}
            onDuplicar={() => onDuplicar(lista)}
            onArchivar={() => onArchivar(lista.id)}
            onActivar={() => onActivar(lista.id)}
          />
        ))}
      </div>

      {listas.length === 0 && (
        <Card className="p-12 text-center">
          <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No se encontraron listas con los filtros seleccionados</p>
        </Card>
      )}
    </motion.div>
  );
}

// ============ COMPONENTE: CARD DE LISTA ============

interface ListaChequeoCardProps {
  lista: ListaChequeoPlantilla;
  onVerDetalle: () => void;
  onEditar: () => void;
  onDuplicar: () => void;
  onArchivar: () => void;
  onActivar: () => void;
}

function ListaChequeoCard({ lista, onVerDetalle, onEditar, onDuplicar, onArchivar, onActivar }: ListaChequeoCardProps) {
  const [expandida, setExpandida] = useState(false);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Activa': return '#10B981';
      case 'En Revisión': return '#F59E0B';
      case 'Archivada': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const itemsCriticos = lista.items.filter(i => i.esCritico).length;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="font-black">
                {lista.codigo}
              </Badge>
              <Badge style={{ background: getEstadoColor(lista.estado), color: '#FFFFFF' }}>
                {lista.estado}
              </Badge>
              <Badge variant="outline">
                {lista.version}
              </Badge>
            </div>
            <h3 className="font-black text-gray-900 mb-1">{lista.nombre}</h3>
            <p className="text-xs text-gray-600 line-clamp-2">{lista.descripcion}</p>
          </div>
          <Button
            onClick={() => setExpandida(!expandida)}
            variant="ghost"
            size="sm"
          >
            {expandida ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-3">
          {lista.tiposProceso.slice(0, 2).map((tipo, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              <Tag className="w-3 h-3 mr-1" />
              {tipo}
            </Badge>
          ))}
          {lista.tiposProceso.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{lista.tiposProceso.length - 2}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-xs text-gray-600">Ítems</p>
            <p className="text-lg font-black text-gray-900">{lista.items.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600">Críticos</p>
            <p className="text-lg font-black text-red-600">{itemsCriticos}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600">Usos</p>
            <p className="text-lg font-black text-gray-900">{lista.vecesUtilizada}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600">Promedio</p>
            <p className="text-lg font-black text-green-600">
              {lista.promedioCaracterizacion || '—'}%
            </p>
          </div>
        </div>
      </div>

      {/* Contenido Expandible */}
      <AnimatePresence>
        {expandida && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3 border-b">
              {/* Categorías */}
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-2">Categorías</p>
                <div className="flex flex-wrap gap-1">
                  {lista.categorias.map((cat, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3" />
                  Creado por {lista.creadoPor} el {lista.fechaCreacion}
                </div>
                {lista.modificadoPor && (
                  <div className="flex items-center gap-2">
                    <Edit className="w-3 h-3" />
                    Modificado por {lista.modificadoPor} el {lista.fechaModificacion}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Acciones */}
      <div className="p-3 flex flex-wrap gap-2">
        <Button onClick={onVerDetalle} variant="outline" size="sm" className="flex-1">
          <Eye className="w-3 h-3 mr-1" />
          Ver
        </Button>
        <Button onClick={onEditar} variant="outline" size="sm" className="flex-1">
          <Edit className="w-3 h-3 mr-1" />
          Editar
        </Button>
        <Button onClick={onDuplicar} variant="outline" size="sm">
          <Copy className="w-3 h-3" />
        </Button>
        {lista.estado === 'Activa' ? (
          <Button onClick={onArchivar} variant="outline" size="sm">
            <Archive className="w-3 h-3" />
          </Button>
        ) : (
          <Button onClick={onActivar} size="sm" style={{ background: '#10B981' }}>
            <CheckCircle2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </Card>
  );
}

// ============ VISTA: DETALLE DE LISTA ============

interface DetalleListaViewProps {
  lista: ListaChequeoPlantilla;
  onVolver: () => void;
  onEditar: () => void;
  onHistorial: () => void;
  onExportar: () => void;
}

function DetalleListaView({ lista, onVolver, onEditar, onHistorial, onExportar }: DetalleListaViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
        <Button onClick={onVolver} variant="ghost" size="sm" className="mb-4">
          <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
          Volver a la biblioteca
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="font-black">{lista.codigo}</Badge>
              <Badge style={{ background: '#10B981', color: '#FFFFFF' }}>{lista.estado}</Badge>
              <Badge variant="outline">{lista.version}</Badge>
            </div>
            <h2 className="text-2xl font-black text-gray-900">{lista.nombre}</h2>
            <p className="text-gray-600 mt-2">{lista.descripcion}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={onEditar} size="sm" variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button onClick={onHistorial} size="sm" variant="outline">
              <History className="w-4 h-4 mr-2" />
              Historial
            </Button>
            <Button onClick={onExportar} size="sm" style={{ background: '#8B5CF6' }}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-600">Creado por</p>
            <p className="font-bold text-gray-900">{lista.creadoPor}</p>
            <p className="text-xs text-gray-500">{lista.fechaCreacion}</p>
          </div>
          {lista.modificadoPor && (
            <div>
              <p className="text-xs text-gray-600">Modificado por</p>
              <p className="font-bold text-gray-900">{lista.modificadoPor}</p>
              <p className="text-xs text-gray-500">{lista.fechaModificacion}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-600">Estadísticas</p>
            <p className="font-bold text-gray-900">Usada {lista.vecesUtilizada} veces</p>
            {lista.promedioCaracterizacion && (
              <p className="text-xs text-gray-500">Promedio: {lista.promedioCaracterizacion}%</p>
            )}
          </div>
        </div>
      </Card>

      {/* Tipos de Proceso y Categorías */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Tipos de Proceso</h3>
          <div className="flex flex-wrap gap-2">
            {lista.tiposProceso.map((tipo, i) => (
              <Badge key={i} style={{ background: '#8B5CF615', color: '#8B5CF6' }}>
                <Tag className="w-3 h-3 mr-1" />
                {tipo}
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Categorías</h3>
          <div className="flex flex-wrap gap-2">
            {lista.categorias.map((cat, i) => (
              <Badge key={i} variant="outline">
                {cat}
              </Badge>
            ))}
          </div>
        </Card>
      </div>

      {/* Ítems de la Lista */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          Ítems de Verificación ({lista.items.length})
        </h3>

        <div className="space-y-3">
          {lista.items.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg border-l-4"
              style={{
                background: '#F9FAFB',
                borderLeftColor: item.esCritico ? '#EF4444' : '#8B5CF6'
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="font-black">
                      #{item.numero}
                    </Badge>
                    {item.esCritico && (
                      <Badge style={{ background: '#EF4444', color: '#FFFFFF' }}>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Crítico
                      </Badge>
                    )}
                    {item.categoria && (
                      <Badge variant="outline" className="text-xs">
                        {item.categoria}
                      </Badge>
                    )}
                  </div>

                  <h4 className="font-bold text-gray-900 mb-2">{item.pregunta}</h4>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-xs font-bold text-gray-600 uppercase">Criterio:</span>
                      <p className="text-gray-700">{item.criterio}</p>
                    </div>

                    {item.normativaReferencia && (
                      <div className="p-2 rounded-lg" style={{ background: '#FEF3C7' }}>
                        <span className="text-xs font-bold text-amber-900 uppercase">Normativa:</span>
                        <p className="text-sm text-amber-800">{item.normativaReferencia}</p>
                      </div>
                    )}

                    {item.descripcionAyuda && (
                      <div className="p-2 rounded-lg" style={{ background: '#DBEAFE' }}>
                        <span className="text-xs font-bold text-blue-900 uppercase">Ayuda:</span>
                        <p className="text-sm text-blue-800">{item.descripcionAyuda}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

// ============ VISTA: EDITOR DE LISTA ============

interface EditorListaViewProps {
  lista: ListaChequeoPlantilla | null;
  modo: 'crear' | 'editar';
  onGuardar: (lista: ListaChequeoPlantilla) => void;
  onCancelar: () => void;
}

function EditorListaView({ lista, modo, onGuardar, onCancelar }: EditorListaViewProps) {
  const [formData, setFormData] = useState<Partial<ListaChequeoPlantilla>>(
    lista || {
      codigo: '',
      nombre: '',
      descripcion: '',
      tiposProceso: [],
      categorias: [],
      version: 'v1.0',
      estado: 'En Revisión',
      items: [],
      creadoPor: 'Usuario Actual',
      fechaCreacion: new Date().toISOString().split('T')[0],
      vecesUtilizada: 0
    }
  );

  const [nuevoItem, setNuevoItem] = useState<Partial<ItemListaChequeo>>({
    pregunta: '',
    criterio: '',
    normativaReferencia: '',
    categoria: '',
    esCritico: false,
    descripcionAyuda: ''
  });

  const [mostrarFormItem, setMostrarFormItem] = useState(false);

  const handleGuardar = () => {
    const listaCompleta: ListaChequeoPlantilla = {
      id: lista?.id || `lc-plantilla-${Date.now()}`,
      codigo: formData.codigo || '',
      nombre: formData.nombre || '',
      descripcion: formData.descripcion || '',
      tiposProceso: formData.tiposProceso || [],
      categorias: formData.categorias || [],
      version: formData.version || 'v1.0',
      estado: formData.estado as any || 'En Revisión',
      items: formData.items || [],
      creadoPor: formData.creadoPor || 'Usuario Actual',
      fechaCreacion: formData.fechaCreacion || new Date().toISOString().split('T')[0],
      modificadoPor: modo === 'editar' ? 'Usuario Actual' : undefined,
      fechaModificacion: modo === 'editar' ? new Date().toISOString().split('T')[0] : undefined,
      vecesUtilizada: formData.vecesUtilizada || 0
    };

    onGuardar(listaCompleta);
  };

  const handleAgregarItem = () => {
    if (!nuevoItem.pregunta || !nuevoItem.criterio) return;

    const item: ItemListaChequeo = {
      id: `item-${Date.now()}`,
      numero: (formData.items?.length || 0) + 1,
      pregunta: nuevoItem.pregunta,
      criterio: nuevoItem.criterio,
      normativaReferencia: nuevoItem.normativaReferencia,
      categoria: nuevoItem.categoria,
      esCritico: nuevoItem.esCritico || false,
      descripcionAyuda: nuevoItem.descripcionAyuda
    };

    setFormData({
      ...formData,
      items: [...(formData.items || []), item]
    });

    setNuevoItem({
      pregunta: '',
      criterio: '',
      normativaReferencia: '',
      categoria: '',
      esCritico: false,
      descripcionAyuda: ''
    });

    setMostrarFormItem(false);
  };

  const handleEliminarItem = (itemId: string) => {
    setFormData({
      ...formData,
      items: formData.items?.filter(i => i.id !== itemId)
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
        <h2 className="text-2xl font-black text-gray-900">
          {modo === 'crear' ? 'Nueva Lista de Chequeo' : 'Editar Lista de Chequeo'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {modo === 'crear' 
            ? 'Cree una nueva lista de chequeo reutilizable' 
            : 'Modifique la información de la lista'
          }
        </p>
      </Card>

      {/* Formulario Principal */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">Información Básica</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Código <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="LC-XXX-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Versión
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="v1.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Nombre descriptivo de la lista"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción del propósito de la lista"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Tipos de Proceso
            </label>
            <select
              multiple
              value={formData.tiposProceso}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setFormData({ ...formData, tiposProceso: selected });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              size={5}
            >
              {TIPOS_PROCESO_DISPONIBLES.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Mantenga Ctrl/Cmd para seleccionar múltiples</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="Activa">Activa</option>
              <option value="En Revisión">En Revisión</option>
              <option value="Archivada">Archivada</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Ítems */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-900">
            Ítems de Verificación ({formData.items?.length || 0})
          </h3>
          <Button
            onClick={() => setMostrarFormItem(true)}
            size="sm"
            style={{ background: '#8B5CF6' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Ítem
          </Button>
        </div>

        {/* Formulario de Nuevo Ítem */}
        <AnimatePresence>
          {mostrarFormItem && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 p-4 rounded-lg border-2 border-dashed"
              style={{ borderColor: '#8B5CF6' }}
            >
              <h4 className="font-bold text-gray-900 mb-3">Nuevo Ítem</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Pregunta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nuevoItem.pregunta}
                    onChange={(e) => setNuevoItem({ ...nuevoItem, pregunta: e.target.value })}
                    placeholder="¿Pregunta de verificación?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Criterio <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={nuevoItem.criterio}
                    onChange={(e) => setNuevoItem({ ...nuevoItem, criterio: e.target.value })}
                    placeholder="Criterio de evaluación"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Normativa Referencia
                    </label>
                    <input
                      type="text"
                      value={nuevoItem.normativaReferencia}
                      onChange={(e) => setNuevoItem({ ...nuevoItem, normativaReferencia: e.target.value })}
                      placeholder="Ley, Decreto, Artículo..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Categoría
                    </label>
                    <select
                      value={nuevoItem.categoria}
                      onChange={(e) => setNuevoItem({ ...nuevoItem, categoria: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Seleccionar...</option>
                      {CATEGORIAS_DISPONIBLES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Descripción de Ayuda
                  </label>
                  <textarea
                    value={nuevoItem.descripcionAyuda}
                    onChange={(e) => setNuevoItem({ ...nuevoItem, descripcionAyuda: e.target.value })}
                    placeholder="Información adicional para el auditor"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="esCritico"
                    checked={nuevoItem.esCritico}
                    onChange={(e) => setNuevoItem({ ...nuevoItem, esCritico: e.target.checked })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <label htmlFor="esCritico" className="text-sm font-bold text-gray-700">
                    Marcar como ítem crítico
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => setMostrarFormItem(false)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAgregarItem}
                    size="sm"
                    className="flex-1"
                    style={{ background: '#8B5CF6' }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Ítem
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lista de Ítems */}
        <div className="space-y-2">
          {formData.items?.map((item, index) => (
            <div
              key={item.id}
              className="p-3 rounded-lg border flex items-start justify-between gap-3"
              style={{ background: '#F9FAFB' }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">#{item.numero}</Badge>
                  {item.esCritico && (
                    <Badge style={{ background: '#EF4444', color: '#FFFFFF' }}>Crítico</Badge>
                  )}
                </div>
                <p className="text-sm font-bold text-gray-900">{item.pregunta}</p>
                <p className="text-xs text-gray-600 mt-1">{item.criterio}</p>
              </div>
              <Button
                onClick={() => handleEliminarItem(item.id)}
                variant="ghost"
                size="sm"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}

          {(!formData.items || formData.items.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <CheckSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No hay ítems agregados</p>
            </div>
          )}
        </div>
      </Card>

      {/* Acciones */}
      <Card className="p-4">
        <div className="flex gap-3">
          <Button
            onClick={onCancelar}
            variant="outline"
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleGuardar}
            className="flex-1"
            style={{ background: '#8B5CF6' }}
          >
            <Save className="w-4 h-4 mr-2" />
            {modo === 'crear' ? 'Crear Lista' : 'Guardar Cambios'}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ COMPONENTE AUXILIAR: MODAL ============

function Modal({ titulo, children, onCerrar }: { titulo: string; children: React.ReactNode; onCerrar: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">{titulo}</h3>
            <button
              onClick={onCerrar}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
