/**
 * RF013 - GESTIÓN DOCUMENTAL
 * Repositorio centralizado con versionamiento y búsqueda avanzada
 * Oficina de Control Interno - ESAP
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderOpen, File, Upload, Download, Eye, Search, Filter,
  ChevronRight, ChevronDown, FileText, FileSpreadsheet, Image,
  Video, Archive, X, Plus, Clock, User, Calendar, Share2,
  Lock, Unlock, Folder, CheckCircle, AlertCircle, MoreVertical,
  Edit, Trash2, Copy, Star, StarOff, RefreshCw, Database,
  HardDrive, Layers, Grid, List, Settings, SortAsc, Tag,
  Shield, History, ZoomIn, ExternalLink, Package, Download as DownloadIcon
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';

// ============ TIPOS ============

type TipoDocumento = 
  | 'Plan de Auditoría'
  | 'Programa de Auditoría'
  | 'Memorando de Asignación'
  | 'Lista de Chequeo'
  | 'Papeles de Trabajo'
  | 'Evidencias'
  | 'Hallazgo'
  | 'Informe Preliminar'
  | 'Informe Final'
  | 'Plan de Mejoramiento'
  | 'Otro';

type EtapaAuditoria = 'Planeación' | 'Ejecución' | 'Comunicación' | 'Seguimiento';

type EstadoCarpeta = 'Abierta' | 'Comprimida' | 'Archivada';

type NivelPermiso = 'Lectura' | 'Escritura' | 'Total' | 'Sin Acceso';

interface Version {
  numero: number;
  fechaCreacion: string;
  horaCreacion: string;
  creadoPor: string;
  tamano: string;
  comentario?: string;
  url: string;
}

interface Documento {
  id: string;
  nombre: string;
  tipo: TipoDocumento;
  extension: string;
  tamano: string;
  
  // Versiones
  versionActual: number;
  versiones: Version[];
  
  // Metadata
  fechaCreacion: string;
  fechaModificacion: string;
  creadoPor: string;
  modificadoPor?: string;
  
  // Ubicación
  carpetaId: string;
  rutaCompleta: string;
  
  // Permisos
  permisos: {
    rol: string;
    nivel: NivelPermiso;
  }[];
  
  // Estado
  favorito: boolean;
  compartido: boolean;
  tags: string[];
  
  // Sincronización
  sincronizadoFileServer: boolean;
  rutaFileServer?: string;
  
  // Previsualización
  previsualizableNavegador: boolean;
  urlPrevisualizacion?: string;
}

interface Carpeta {
  id: string;
  nombre: string;
  tipo: 'auditoria' | 'etapa' | 'subcarpeta';
  
  // Jerarquía
  padreId?: string;
  nivel: number;
  rutaCompleta: string;
  
  // Contenido
  subcarpetas: Carpeta[];
  documentos: Documento[];
  
  // Metadata
  fechaCreacion: string;
  creadoPor: string;
  
  // Estado
  estado: EstadoCarpeta;
  fechaCompresion?: string;
  archivoComprimido?: string;
  
  // Asociación
  auditoriaId?: string;
  codigoAuditoria?: string;
  etapa?: EtapaAuditoria;
  
  // Estadísticas
  totalDocumentos: number;
  totalSubcarpetas: number;
  pesoTotal: string;
  
  // Permisos
  permisos: {
    rol: string;
    nivel: NivelPermiso;
  }[];
}

interface CriteriosBusqueda {
  texto?: string;
  auditoriaId?: string;
  etapa?: EtapaAuditoria;
  tipoDocumento?: TipoDocumento;
  fechaDesde?: string;
  fechaHasta?: string;
  creadoPor?: string;
  extension?: string;
  tags?: string[];
  soloFavoritos?: boolean;
}

// ============ DATOS MOCK ============

const MOCK_VERSIONES: Version[] = [
  {
    numero: 1,
    fechaCreacion: '2025-03-15',
    horaCreacion: '10:30',
    creadoPor: 'Pedro Gómez Ruiz',
    tamano: '245 KB',
    comentario: 'Versión inicial del plan',
    url: '/docs/plan_auditoria_v1.pdf'
  },
  {
    numero: 2,
    fechaCreacion: '2025-03-18',
    horaCreacion: '14:20',
    creadoPor: 'Ana García Torres',
    tamano: '267 KB',
    comentario: 'Ajustes solicitados por Jefe OCI',
    url: '/docs/plan_auditoria_v2.pdf'
  },
  {
    numero: 3,
    fechaCreacion: '2025-03-20',
    horaCreacion: '09:15',
    creadoPor: 'Pedro Gómez Ruiz',
    tamano: '268 KB',
    comentario: 'Versión final aprobada',
    url: '/docs/plan_auditoria_v3.pdf'
  }
];

const MOCK_DOCUMENTOS: Documento[] = [
  {
    id: 'doc-001',
    nombre: 'Plan Individual de Auditoría - Gestión Contractual 2025.pdf',
    tipo: 'Plan de Auditoría',
    extension: 'pdf',
    tamano: '268 KB',
    versionActual: 3,
    versiones: MOCK_VERSIONES,
    fechaCreacion: '2025-03-15',
    fechaModificacion: '2025-03-20',
    creadoPor: 'Pedro Gómez Ruiz',
    modificadoPor: 'Pedro Gómez Ruiz',
    carpetaId: 'carp-001',
    rutaCompleta: '/AUD-2025-001/Planeación/Plan Individual de Auditoría - Gestión Contractual 2025.pdf',
    permisos: [
      { rol: 'Evaluación y Seguimiento', nivel: 'Total' },
      { rol: 'Enfoque a la Prevención', nivel: 'Lectura' },
      { rol: 'Apoyo y Asesoría', nivel: 'Lectura' }
    ],
    favorito: true,
    compartido: true,
    tags: ['Plan', 'Aprobado', 'Gestión Contractual'],
    sincronizadoFileServer: true,
    rutaFileServer: 'G:/Control_Interno/Auditorias/2025/AUD-2025-001/Planeacion/Plan_Auditoria.pdf',
    previsualizableNavegador: true,
    urlPrevisualizacion: '/preview/doc-001'
  },
  {
    id: 'doc-002',
    nombre: 'Memorando de Asignación No. 001-2025.pdf',
    tipo: 'Memorando de Asignación',
    extension: 'pdf',
    tamano: '156 KB',
    versionActual: 1,
    versiones: [
      {
        numero: 1,
        fechaCreacion: '2025-03-12',
        horaCreacion: '11:00',
        creadoPor: 'Carlos Martínez López',
        tamano: '156 KB',
        comentario: 'Memorando de asignación firmado',
        url: '/docs/memorando_001_2025.pdf'
      }
    ],
    fechaCreacion: '2025-03-12',
    fechaModificacion: '2025-03-12',
    creadoPor: 'Carlos Martínez López',
    carpetaId: 'carp-001',
    rutaCompleta: '/AUD-2025-001/Planeación/Memorando de Asignación No. 001-2025.pdf',
    permisos: [
      { rol: 'Evaluación y Seguimiento', nivel: 'Total' },
      { rol: 'Enfoque a la Prevención', nivel: 'Lectura' }
    ],
    favorito: false,
    compartido: true,
    tags: ['Memorando', 'Asignación'],
    sincronizadoFileServer: true,
    rutaFileServer: 'G:/Control_Interno/Auditorias/2025/AUD-2025-001/Planeacion/Memorando_001.pdf',
    previsualizableNavegador: true,
    urlPrevisualizacion: '/preview/doc-002'
  },
  {
    id: 'doc-003',
    nombre: 'Lista de Chequeo - Estudios Previos.xlsx',
    tipo: 'Lista de Chequeo',
    extension: 'xlsx',
    tamano: '89 KB',
    versionActual: 2,
    versiones: [
      {
        numero: 1,
        fechaCreacion: '2025-04-01',
        horaCreacion: '09:30',
        creadoPor: 'Laura Martínez Silva',
        tamano: '85 KB',
        url: '/docs/lista_chequeo_v1.xlsx'
      },
      {
        numero: 2,
        fechaCreacion: '2025-04-05',
        horaCreacion: '15:45',
        creadoPor: 'Laura Martínez Silva',
        tamano: '89 KB',
        comentario: 'Agregados nuevos ítems de verificación',
        url: '/docs/lista_chequeo_v2.xlsx'
      }
    ],
    fechaCreacion: '2025-04-01',
    fechaModificacion: '2025-04-05',
    creadoPor: 'Laura Martínez Silva',
    modificadoPor: 'Laura Martínez Silva',
    carpetaId: 'carp-002',
    rutaCompleta: '/AUD-2025-001/Ejecución/Lista de Chequeo - Estudios Previos.xlsx',
    permisos: [
      { rol: 'Evaluación y Seguimiento', nivel: 'Total' }
    ],
    favorito: true,
    compartido: false,
    tags: ['Lista Chequeo', 'Estudios Previos'],
    sincronizadoFileServer: true,
    rutaFileServer: 'G:/Control_Interno/Auditorias/2025/AUD-2025-001/Ejecucion/Lista_Chequeo.xlsx',
    previsualizableNavegador: false
  },
  {
    id: 'doc-004',
    nombre: 'Informe Preliminar AUD-2025-001.pdf',
    tipo: 'Informe Preliminar',
    extension: 'pdf',
    tamano: '1.2 MB',
    versionActual: 1,
    versiones: [
      {
        numero: 1,
        fechaCreacion: '2025-04-25',
        horaCreacion: '16:30',
        creadoPor: 'Ana García Torres',
        tamano: '1.2 MB',
        comentario: 'Informe preliminar para controversia',
        url: '/docs/informe_preliminar.pdf'
      }
    ],
    fechaCreacion: '2025-04-25',
    fechaModificacion: '2025-04-25',
    creadoPor: 'Ana García Torres',
    carpetaId: 'carp-003',
    rutaCompleta: '/AUD-2025-001/Comunicación/Informe Preliminar AUD-2025-001.pdf',
    permisos: [
      { rol: 'Evaluación y Seguimiento', nivel: 'Total' },
      { rol: 'Enfoque a la Prevención', nivel: 'Lectura' }
    ],
    favorito: true,
    compartido: true,
    tags: ['Informe', 'Preliminar', 'Controversia'],
    sincronizadoFileServer: true,
    rutaFileServer: 'G:/Control_Interno/Auditorias/2025/AUD-2025-001/Comunicacion/Informe_Preliminar.pdf',
    previsualizableNavegador: true,
    urlPrevisualizacion: '/preview/doc-004'
  }
];

const MOCK_CARPETAS: Carpeta[] = [
  {
    id: 'carp-root-001',
    nombre: 'AUD-2025-001 - Auditoría Gestión Contractual',
    tipo: 'auditoria',
    nivel: 0,
    rutaCompleta: '/AUD-2025-001',
    subcarpetas: [],
    documentos: [],
    fechaCreacion: '2025-03-10',
    creadoPor: 'Carlos Martínez López',
    estado: 'Abierta',
    auditoriaId: 'aud-001',
    codigoAuditoria: 'AUD-2025-001',
    totalDocumentos: 4,
    totalSubcarpetas: 3,
    pesoTotal: '1.7 MB',
    permisos: [
      { rol: 'Evaluación y Seguimiento', nivel: 'Total' },
      { rol: 'Enfoque a la Prevención', nivel: 'Lectura' }
    ]
  },
  {
    id: 'carp-001',
    nombre: 'Planeación',
    tipo: 'etapa',
    padreId: 'carp-root-001',
    nivel: 1,
    rutaCompleta: '/AUD-2025-001/Planeación',
    subcarpetas: [],
    documentos: MOCK_DOCUMENTOS.slice(0, 2),
    fechaCreacion: '2025-03-10',
    creadoPor: 'Pedro Gómez Ruiz',
    estado: 'Comprimida',
    fechaCompresion: '2025-03-22',
    archivoComprimido: '/archives/AUD-2025-001-Planeacion.zip',
    auditoriaId: 'aud-001',
    codigoAuditoria: 'AUD-2025-001',
    etapa: 'Planeación',
    totalDocumentos: 2,
    totalSubcarpetas: 0,
    pesoTotal: '424 KB',
    permisos: [
      { rol: 'Evaluación y Seguimiento', nivel: 'Total' }
    ]
  },
  {
    id: 'carp-002',
    nombre: 'Ejecución',
    tipo: 'etapa',
    padreId: 'carp-root-001',
    nivel: 1,
    rutaCompleta: '/AUD-2025-001/Ejecución',
    subcarpetas: [],
    documentos: [MOCK_DOCUMENTOS[2]],
    fechaCreacion: '2025-03-23',
    creadoPor: 'Laura Martínez Silva',
    estado: 'Abierta',
    auditoriaId: 'aud-001',
    codigoAuditoria: 'AUD-2025-001',
    etapa: 'Ejecución',
    totalDocumentos: 1,
    totalSubcarpetas: 0,
    pesoTotal: '89 KB',
    permisos: [
      { rol: 'Evaluación y Seguimiento', nivel: 'Total' }
    ]
  },
  {
    id: 'carp-003',
    nombre: 'Comunicación',
    tipo: 'etapa',
    padreId: 'carp-root-001',
    nivel: 1,
    rutaCompleta: '/AUD-2025-001/Comunicación',
    subcarpetas: [],
    documentos: [MOCK_DOCUMENTOS[3]],
    fechaCreacion: '2025-04-20',
    creadoPor: 'Ana García Torres',
    estado: 'Abierta',
    auditoriaId: 'aud-001',
    codigoAuditoria: 'AUD-2025-001',
    etapa: 'Comunicación',
    totalDocumentos: 1,
    totalSubcarpetas: 0,
    pesoTotal: '1.2 MB',
    permisos: [
      { rol: 'Evaluación y Seguimiento', nivel: 'Total' }
    ]
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function GestionDocumental() {
  const [vistaActual, setVistaActual] = useState<'explorador' | 'busqueda' | 'favoritos'>('explorador');
  const [carpetaActual, setCarpetaActual] = useState<Carpeta | null>(null);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<Documento | null>(null);
  const [modoVista, setModoVista] = useState<'lista' | 'grid'>('lista');
  
  // Búsqueda
  const [criteriosBusqueda, setCriteriosBusqueda] = useState<CriteriosBusqueda>({});
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Documento[]>([]);
  
  // Modales
  const [modalCargarDocumentos, setModalCargarDocumentos] = useState(false);
  const [modalVersiones, setModalVersiones] = useState(false);
  const [modalPreview, setModalPreview] = useState(false);
  const [modalComprimir, setModalComprimir] = useState(false);
  const [modalPermisos, setModalPermisos] = useState(false);
  
  // Selección múltiple
  const [documentosSeleccionados, setDocumentosSeleccionados] = useState<string[]>([]);

  // Estadísticas
  const stats = {
    totalCarpetas: MOCK_CARPETAS.length,
    totalDocumentos: MOCK_DOCUMENTOS.length,
    carpetasComprimidas: MOCK_CARPETAS.filter(c => c.estado === 'Comprimida').length,
    documentosSincronizados: MOCK_DOCUMENTOS.filter(d => d.sincronizadoFileServer).length,
    pesoTotal: '1.7 MB'
  };

  const handleBuscar = () => {
    // Implementar lógica de búsqueda
    const resultados = MOCK_DOCUMENTOS.filter(doc => {
      if (criteriosBusqueda.texto && !doc.nombre.toLowerCase().includes(criteriosBusqueda.texto.toLowerCase())) {
        return false;
      }
      if (criteriosBusqueda.tipoDocumento && doc.tipo !== criteriosBusqueda.tipoDocumento) {
        return false;
      }
      if (criteriosBusqueda.soloFavoritos && !doc.favorito) {
        return false;
      }
      return true;
    });
    setResultadosBusqueda(resultados);
    setVistaActual('busqueda');
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Gestión Documental
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            RF013 - Repositorio centralizado con versionamiento automático
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setVistaActual('explorador')}
            variant={vistaActual === 'explorador' ? 'default' : 'outline'}
            size="sm"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Explorador
          </Button>
          <Button
            onClick={() => setVistaActual('busqueda')}
            variant={vistaActual === 'busqueda' ? 'default' : 'outline'}
            size="sm"
          >
            <Search className="w-4 h-4 mr-2" />
            Búsqueda
          </Button>
          <Button
            onClick={() => setVistaActual('favoritos')}
            variant={vistaActual === 'favoritos' ? 'default' : 'outline'}
            size="sm"
          >
            <Star className="w-4 h-4 mr-2" />
            Favoritos
          </Button>
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#3B82F6' }}>
          <p className="text-xs text-gray-600">Total Carpetas</p>
          <p className="text-2xl font-black text-gray-900">{stats.totalCarpetas}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#10B981' }}>
          <p className="text-xs text-gray-600">Total Documentos</p>
          <p className="text-2xl font-black text-gray-900">{stats.totalDocumentos}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#8B5CF6' }}>
          <p className="text-xs text-gray-600">Comprimidas</p>
          <p className="text-2xl font-black text-purple-600">{stats.carpetasComprimidas}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#F59E0B' }}>
          <p className="text-xs text-gray-600">Sincronizados</p>
          <p className="text-2xl font-black text-amber-600">{stats.documentosSincronizados}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#6B7280' }}>
          <p className="text-xs text-gray-600">Peso Total</p>
          <p className="text-2xl font-black text-gray-900">{stats.pesoTotal}</p>
        </Card>
      </div>

      {/* TOOLBAR */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button onClick={() => setModalCargarDocumentos(true)} size="sm" style={{ background: '#10B981' }}>
              <Upload className="w-4 h-4 mr-2" />
              Cargar Documentos
            </Button>
            {documentosSeleccionados.length > 0 && (
              <>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar ({documentosSeleccionados.length})
                </Button>
                <Button variant="outline" size="sm">
                  <Archive className="w-4 h-4 mr-2" />
                  Comprimir
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setModoVista('lista')}
              variant={modoVista === 'lista' ? 'default' : 'outline'}
              size="sm"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setModoVista('grid')}
              variant={modoVista === 'grid' ? 'default' : 'outline'}
              size="sm"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar
            </Button>
          </div>
        </div>
      </Card>

      {/* VISTAS */}
      <AnimatePresence mode="wait">
        {vistaActual === 'explorador' && (
          <VistaExploradorDocumentos
            key="explorador"
            carpetas={MOCK_CARPETAS}
            modoVista={modoVista}
            onVerDocumento={(doc) => {
              setDocumentoSeleccionado(doc);
              setModalPreview(true);
            }}
            onVerVersiones={(doc) => {
              setDocumentoSeleccionado(doc);
              setModalVersiones(true);
            }}
            onComprimirCarpeta={(carpeta) => {
              setCarpetaActual(carpeta);
              setModalComprimir(true);
            }}
          />
        )}

        {vistaActual === 'busqueda' && (
          <VistaBusquedaAvanzada
            key="busqueda"
            criterios={criteriosBusqueda}
            onCriteriosChange={setCriteriosBusqueda}
            onBuscar={handleBuscar}
            resultados={resultadosBusqueda}
            modoVista={modoVista}
          />
        )}

        {vistaActual === 'favoritos' && (
          <VistaFavoritos
            key="favoritos"
            documentos={MOCK_DOCUMENTOS.filter(d => d.favorito)}
            modoVista={modoVista}
          />
        )}
      </AnimatePresence>

      {/* MODALES */}
      <AnimatePresence>
        {modalCargarDocumentos && (
          <ModalCargarDocumentos
            onCargar={(archivos) => {
              console.log('Archivos cargados:', archivos);
              setModalCargarDocumentos(false);
            }}
            onCerrar={() => setModalCargarDocumentos(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalVersiones && documentoSeleccionado && (
          <ModalVersiones
            documento={documentoSeleccionado}
            onCerrar={() => setModalVersiones(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalPreview && documentoSeleccionado && (
          <ModalPreviewDocumento
            documento={documentoSeleccionado}
            onCerrar={() => setModalPreview(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalComprimir && carpetaActual && (
          <ModalComprimirCarpeta
            carpeta={carpetaActual}
            onComprimir={() => {
              console.log('Carpeta comprimida');
              setModalComprimir(false);
            }}
            onCerrar={() => setModalComprimir(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ VISTA: EXPLORADOR DE DOCUMENTOS ============

interface VistaExploradorDocumentosProps {
  carpetas: Carpeta[];
  modoVista: 'lista' | 'grid';
  onVerDocumento: (doc: Documento) => void;
  onVerVersiones: (doc: Documento) => void;
  onComprimirCarpeta: (carpeta: Carpeta) => void;
}

function VistaExploradorDocumentos({ carpetas, modoVista, onVerDocumento, onVerVersiones, onComprimirCarpeta }: VistaExploradorDocumentosProps) {
  const [expandidas, setExpandidas] = useState<string[]>(['carp-root-001']);

  const toggleExpansion = (carpetaId: string) => {
    setExpandidas(prev =>
      prev.includes(carpetaId)
        ? prev.filter(id => id !== carpetaId)
        : [...prev, carpetaId]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Árbol de Carpetas */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">Estructura de Auditorías</h3>
        
        <div className="space-y-2">
          {carpetas.filter(c => c.nivel === 0).map(carpetaRoot => (
            <div key={carpetaRoot.id}>
              {/* Carpeta Raíz (Auditoría) */}
              <div className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <button onClick={() => toggleExpansion(carpetaRoot.id)}>
                  {expandidas.includes(carpetaRoot.id) ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                </button>
                <FolderOpen className="w-5 h-5" style={{ color: '#3B82F6' }} />
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{carpetaRoot.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {carpetaRoot.totalDocumentos} documentos • {carpetaRoot.pesoTotal}
                  </p>
                </div>
                {carpetaRoot.estado === 'Comprimida' && (
                  <Badge style={{ background: '#8B5CF6', color: '#FFF' }}>
                    <Archive className="w-3 h-3 mr-1" />
                    Comprimida
                  </Badge>
                )}
              </div>

              {/* Subcarpetas (Etapas) */}
              <AnimatePresence>
                {expandidas.includes(carpetaRoot.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-6 space-y-2 overflow-hidden"
                  >
                    {carpetas.filter(c => c.padreId === carpetaRoot.id).map(carpetaEtapa => (
                      <CarpetaEtapa
                        key={carpetaEtapa.id}
                        carpeta={carpetaEtapa}
                        expandida={expandidas.includes(carpetaEtapa.id)}
                        onToggle={() => toggleExpansion(carpetaEtapa.id)}
                        onVerDocumento={onVerDocumento}
                        onVerVersiones={onVerVersiones}
                        onComprimir={() => onComprimirCarpeta(carpetaEtapa)}
                        modoVista={modoVista}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </Card>

      {/* Información de Sincronización */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-green-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#10B981' }}>
            <HardDrive className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">Sincronización con File Server</p>
            <p className="text-sm text-gray-600">
              Ruta: <code className="bg-white px-2 py-1 rounded text-xs">G:\Control_Interno\Auditorias\</code>
            </p>
          </div>
          <Badge style={{ background: '#10B981', color: '#FFF' }}>
            <CheckCircle className="w-3 h-3 mr-1" />
            Sincronizado
          </Badge>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ COMPONENTE: CARPETA ETAPA ============

function CarpetaEtapa({ carpeta, expandida, onToggle, onVerDocumento, onVerVersiones, onComprimir, modoVista }: any) {
  const getIconoEtapa = (etapa?: EtapaAuditoria) => {
    switch (etapa) {
      case 'Planeación': return <Calendar className="w-5 h-5" style={{ color: '#6B7280' }} />;
      case 'Ejecución': return <Activity className="w-5 h-5" style={{ color: '#10B981' }} />;
      case 'Comunicación': return <Send className="w-5 h-5" style={{ color: '#3B82F6' }} />;
      case 'Seguimiento': return <TrendingUp className="w-5 h-5" style={{ color: '#F59E0B' }} />;
      default: return <Folder className="w-5 h-5" style={{ color: '#6B7280' }} />;
    }
  };

  return (
    <div>
      {/* Carpeta de Etapa */}
      <div className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50">
        <button onClick={onToggle}>
          {expandida ? (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
        </button>
        {getIconoEtapa(carpeta.etapa)}
        <div className="flex-1">
          <p className="font-bold text-gray-900">{carpeta.nombre}</p>
          <p className="text-xs text-gray-500">
            {carpeta.totalDocumentos} documentos • {carpeta.pesoTotal}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {carpeta.estado === 'Comprimida' && (
            <Badge style={{ background: '#8B5CF6', color: '#FFF' }}>
              <Package className="w-3 h-3 mr-1" />
              Comprimida
            </Badge>
          )}
          {carpeta.estado === 'Abierta' && (
            <Button onClick={onComprimir} variant="outline" size="sm">
              <Archive className="w-4 h-4 mr-2" />
              Comprimir
            </Button>
          )}
        </div>
      </div>

      {/* Documentos de la Etapa */}
      <AnimatePresence>
        {expandida && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-6 mt-2 space-y-2 overflow-hidden"
          >
            {modoVista === 'lista' ? (
              <ListaDocumentos
                documentos={carpeta.documentos}
                onVerDocumento={onVerDocumento}
                onVerVersiones={onVerVersiones}
              />
            ) : (
              <GridDocumentos
                documentos={carpeta.documentos}
                onVerDocumento={onVerDocumento}
                onVerVersiones={onVerVersiones}
              />
            )}

            {carpeta.documentos.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                <File className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                No hay documentos en esta carpeta
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ COMPONENTE: LISTA DE DOCUMENTOS ============

function ListaDocumentos({ documentos, onVerDocumento, onVerVersiones }: any) {
  const getIconoDocumento = (extension: string) => {
    switch (extension.toLowerCase()) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-600" />;
      case 'xlsx':
      case 'xls': return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'docx':
      case 'doc': return <FileText className="w-5 h-5 text-blue-600" />;
      case 'jpg':
      case 'png': return <Image className="w-5 h-5 text-purple-600" />;
      default: return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-2">
      {documentos.map((doc: Documento) => (
        <div key={doc.id} className="p-3 rounded-lg border hover:border-blue-500 transition-colors" style={{ background: '#F9FAFB' }}>
          <div className="flex items-center gap-3">
            {getIconoDocumento(doc.extension)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-gray-900 truncate">{doc.nombre}</p>
                {doc.favorito && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                {doc.compartido && <Share2 className="w-4 h-4 text-blue-500" />}
                {doc.sincronizadoFileServer && (
                  <Badge variant="outline" className="text-xs">
                    <HardDrive className="w-3 h-3 mr-1" />
                    Sincronizado
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{doc.tamano}</span>
                <span>•</span>
                <span>v{doc.versionActual}</span>
                <span>•</span>
                <span>{doc.fechaModificacion}</span>
                <span>•</span>
                <span>{doc.creadoPor}</span>
              </div>
              {doc.tags.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {doc.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => onVerVersiones(doc)} variant="outline" size="sm">
                <History className="w-4 h-4 mr-2" />
                Versiones
              </Button>
              <Button onClick={() => onVerDocumento(doc)} variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Ver
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ COMPONENTE: GRID DE DOCUMENTOS ============

function GridDocumentos({ documentos, onVerDocumento, onVerVersiones }: any) {
  const getIconoDocumento = (extension: string) => {
    switch (extension.toLowerCase()) {
      case 'pdf': return <FileText className="w-12 h-12 text-red-600" />;
      case 'xlsx':
      case 'xls': return <FileSpreadsheet className="w-12 h-12 text-green-600" />;
      case 'docx':
      case 'doc': return <FileText className="w-12 h-12 text-blue-600" />;
      default: return <File className="w-12 h-12 text-gray-600" />;
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {documentos.map((doc: Documento) => (
        <Card key={doc.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onVerDocumento(doc)}>
          <div className="text-center">
            <div className="flex justify-center mb-3">
              {getIconoDocumento(doc.extension)}
            </div>
            <p className="font-bold text-sm text-gray-900 mb-1 truncate" title={doc.nombre}>
              {doc.nombre}
            </p>
            <p className="text-xs text-gray-500">{doc.tamano}</p>
            <div className="flex items-center justify-center gap-1 mt-2">
              {doc.favorito && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
              {doc.sincronizadoFileServer && <HardDrive className="w-3 h-3 text-green-500" />}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============ VISTA: BÚSQUEDA AVANZADA (continuará en siguiente mensaje) ============

function VistaBusquedaAvanzada({ criterios, onCriteriosChange, onBuscar, resultados, modoVista }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">Búsqueda Avanzada de Documentos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Texto de Búsqueda</label>
            <input
              type="text"
              value={criterios.texto || ''}
              onChange={(e) => onCriteriosChange({ ...criterios, texto: e.target.value })}
              placeholder="Buscar por nombre..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Documento</label>
            <select
              value={criterios.tipoDocumento || ''}
              onChange={(e) => onCriteriosChange({ ...criterios, tipoDocumento: e.target.value as TipoDocumento })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="Plan de Auditoría">Plan de Auditoría</option>
              <option value="Memorando de Asignación">Memorando de Asignación</option>
              <option value="Lista de Chequeo">Lista de Chequeo</option>
              <option value="Informe Preliminar">Informe Preliminar</option>
              <option value="Informe Final">Informe Final</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Etapa</label>
            <select
              value={criterios.etapa || ''}
              onChange={(e) => onCriteriosChange({ ...criterios, etapa: e.target.value as EtapaAuditoria })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las etapas</option>
              <option value="Planeación">Planeación</option>
              <option value="Ejecución">Ejecución</option>
              <option value="Comunicación">Comunicación</option>
              <option value="Seguimiento">Seguimiento</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={criterios.soloFavoritos || false}
                onChange={(e) => onCriteriosChange({ ...criterios, soloFavoritos: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Solo favoritos</span>
            </label>
          </div>
        </div>

        <Button onClick={onBuscar} style={{ background: '#3B82F6' }}>
          <Search className="w-4 h-4 mr-2" />
          Buscar Documentos
        </Button>
      </Card>

      {/* Resultados */}
      {resultados.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4">
            Resultados de Búsqueda ({resultados.length})
          </h3>
          <ListaDocumentos
            documentos={resultados}
            onVerDocumento={() => {}}
            onVerVersiones={() => {}}
          />
        </Card>
      )}
    </motion.div>
  );
}

// ============ VISTA: FAVORITOS ============

function VistaFavoritos({ documentos, modoVista }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          <Star className="w-5 h-5 inline mr-2 text-amber-500" />
          Documentos Favoritos ({documentos.length})
        </h3>
        {modoVista === 'lista' ? (
          <ListaDocumentos documentos={documentos} onVerDocumento={() => {}} onVerVersiones={() => {}} />
        ) : (
          <GridDocumentos documentos={documentos} onVerDocumento={() => {}} onVerVersiones={() => {}} />
        )}
      </Card>
    </motion.div>
  );
}

// ============ MODALES (continuará en próximo mensaje) ============

function ModalCargarDocumentos({ onCargar, onCerrar }: any) {
  const [archivos, setArchivos] = useState<any[]>([]);

  return (
    <Modal titulo="Cargar Documentos" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">Arrastra archivos aquí o haz clic para seleccionar</p>
          <p className="text-xs text-gray-500">Múltiples archivos soportados</p>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                setArchivos(Array.from(e.target.files));
              }
            }}
          />
        </div>

        {archivos.length > 0 && (
          <div>
            <p className="text-sm font-bold text-gray-900 mb-2">
              Archivos seleccionados ({archivos.length})
            </p>
            <div className="space-y-2">
              {archivos.map((archivo, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <File className="w-4 h-4 text-gray-600" />
                  <span className="text-sm flex-1">{archivo.name}</span>
                  <span className="text-xs text-gray-500">{(archivo.size / 1024).toFixed(2)} KB</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => onCargar(archivos)}
            disabled={archivos.length === 0}
            className="flex-1"
            style={{ background: '#10B981' }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Cargar {archivos.length} Documento(s)
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ModalVersiones({ documento, onCerrar }: any) {
  return (
    <Modal titulo="Historial de Versiones" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="font-bold text-gray-900">{documento.nombre}</p>
          <p className="text-sm text-gray-600">Versión actual: v{documento.versionActual}</p>
        </div>

        <div className="space-y-3">
          {documento.versiones.map((version: Version) => (
            <div key={version.numero} className="p-4 border rounded-lg" style={{ background: version.numero === documento.versionActual ? '#DBEAFE' : '#F9FAFB' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge style={{ background: version.numero === documento.versionActual ? '#3B82F6' : '#6B7280', color: '#FFF' }}>
                      Versión {version.numero}
                      {version.numero === documento.versionActual && ' (Actual)'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-900 mb-1">
                    <strong>Creado por:</strong> {version.creadoPor}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    {version.fechaCreacion} {version.horaCreacion} • {version.tamano}
                  </p>
                  {version.comentario && (
                    <p className="text-sm text-gray-700 italic mt-2">"{version.comentario}"</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function ModalPreviewDocumento({ documento, onCerrar }: any) {
  return (
    <Modal titulo="Vista Previa del Documento" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="font-bold text-gray-900">{documento.nombre}</p>
          <p className="text-sm text-gray-600">Versión {documento.versionActual} • {documento.tamano}</p>
        </div>

        {documento.previsualizableNavegador ? (
          <div className="border rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center" style={{ background: '#F3F4F6' }}>
            <div>
              <Eye className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Vista previa del documento</p>
              <p className="text-sm text-gray-500 mt-2">(Funcionalidad de previsualización en desarrollo)</p>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg p-8 text-center" style={{ background: '#FEF3C7' }}>
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-600" />
            <p className="text-amber-900 font-bold">Este tipo de documento no admite vista previa en navegador</p>
            <p className="text-sm text-amber-700 mt-2">Descarga el archivo para visualizarlo</p>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cerrar
          </Button>
          <Button className="flex-1" style={{ background: '#3B82F6' }}>
            <Download className="w-4 h-4 mr-2" />
            Descargar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ModalComprimirCarpeta({ carpeta, onComprimir, onCerrar }: any) {
  return (
    <Modal titulo="Comprimir Carpeta de Etapa" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="font-bold text-gray-900 mb-1">{carpeta.nombre}</p>
          <p className="text-sm text-gray-600">
            {carpeta.totalDocumentos} documentos • {carpeta.pesoTotal}
          </p>
        </div>

        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 mb-1">Importante</p>
              <p className="text-sm text-amber-800">
                Al comprimir esta carpeta, se generará un archivo .zip con todos los documentos de la etapa.
                Esta acción marca la etapa como finalizada y archivada.
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-gray-900 mb-2">Nombre del archivo comprimido:</p>
          <input
            type="text"
            defaultValue={`${carpeta.codigoAuditoria}-${carpeta.nombre}.zip`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={onCerrar} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button onClick={onComprimir} className="flex-1" style={{ background: '#8B5CF6' }}>
            <Archive className="w-4 h-4 mr-2" />
            Comprimir Carpeta
          </Button>
        </div>
      </div>
    </Modal>
  );
}

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
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
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
