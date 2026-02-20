/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LISTAS DE CHEQUEO - MÓDULO COMPLETO ESAP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Sistema completo de gestión de listas de chequeo vinculadas al Kanban.
 * 
 * FUNCIONALIDADES:
 * ✅ Biblioteca de Documentos: Repositorio de plantillas y documentos oficiales
 * ✅ Gestión de Listas de Chequeo: Crear, editar, eliminar listas
 * ✅ Vinculación con Kanban: Asociar listas a etapas (Planeación, Ejecución, etc.)
 * ✅ Adjuntar Documentos: Vincular plantillas de la biblioteca a cada lista
 * ✅ Múltiples listas por tarea/etapa
 * ✅ Seguimiento de completitud
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Upload, Download, Trash2, Edit2, Plus, CheckSquare,
  FolderOpen, File, CheckCircle2, Clock, AlertCircle, Search,
  Filter, X, Save, Paperclip, List, Calendar, Users, Eye
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { HeaderModuloCIG } from './HeaderModuloCIG';
import { controlInternoService } from '../../../services/api/controlInternoService';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type EtapaKanban = 'PLANEACION' | 'EJECUCION' | 'COMUNICACION' | 'SEGUIMIENTO' | 'CIERRE';

type CategoriaDocumento = 'PLANTILLA' | 'OFICIO' | 'ACTA' | 'LISTA_CHEQUEO' | 'INFORME' | 'EVIDENCIA' | 'FORMATO' | 'GUIA' | 'OTRO';

interface DocumentoBiblioteca {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaDocumento;
  archivoUrl: string;
  fechaSubida: string;
  subidoPor: string;
  tamano: string;
  extension: string;
  descargas: number;
  file?: File;
}

interface ItemChequeo {
  id: string;
  texto: string;
  completado: boolean;
  responsable?: string;
  fechaCompletado?: string;
  observaciones?: string;
  // ✅ PLANTILLA ASOCIADA (OPCIONAL)
  plantillaAsociada?: {
    documentoBibliotecaId: string;
    nombreDocumento: string;
  };
}

interface DocumentoAdjunto {
  documentoBibliotecaId: string;
  nombreDocumento: string;
  diligenciado: boolean;
  archivoSubidoUrl?: string;
  fechaSubida?: string;
}

interface ListaChequeo {
  id: string;
  nombre: string;
  descripcion: string;
  etapaKanban: EtapaKanban;
  items: ItemChequeo[];
  documentosAdjuntos: DocumentoAdjunto[]; // Plantillas necesarias (opcional)
  creadoPor: string;
  fechaCreacion: string;
  ultimaModificacion: string;
  completitud: number; // 0-100%
  activa: boolean;
  // ✅ VINCULACIÓN DIRECTA CON AUDITORÍAS OCIG
  auditoriaId?: string; // ID de la auditoría a la que pertenece esta lista
  auditoriaCodigoNombre?: string; // Código y nombre legible (ej: "AUD-2026-001 - Auditoría Contabilidad")
  fasesImpactadas?: {
    planeacion: boolean; // Impacta fase de Planeación
    ejecucion: boolean; // Impacta fase de Ejecución
    comunicacion: boolean; // Impacta fase de Comunicación
    seguimiento: boolean; // Impacta fase de Seguimiento
  };
  // ✅ CAMPOS PARA GESTIÓN DOCUMENTAL (LEGACY - mantener compatibilidad)
  etapaProceso?: string; // Etapa del proceso donde se usa esta lista
  auditoriaAsignada?: string; // Auditoría específica asignada
}

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES - ETAPAS DEL KANBAN DE AUDITORÍAS OCID
// ════════════════════════════════════════════════════════════════════════════

const ETAPAS_KANBAN_AUDITORIA = [
  { value: 'Planeación', label: 'Planeación' },
  { value: 'Ejecución', label: 'Ejecución' },
  { value: 'Comunicación', label: 'Comunicación' }
] as const;

// ════════════════════════════════════════════════════════════════════════════
// MAPEADORES API -> UI
// ════════════════════════════════════════════════════════════════════════════

const mapApiTipoToCategoria = (tipo?: string): CategoriaDocumento => {
  const t = (tipo || '').toString().trim().toUpperCase();
  if (t.includes('OFICIO')) return 'OFICIO';
  if (t.includes('ACTA')) return 'ACTA';
  if (t.includes('LISTA')) return 'LISTA_CHEQUEO';
  if (t.includes('INFORME')) return 'INFORME';
  if (t.includes('EVIDENCIA')) return 'EVIDENCIA';
  if (t.includes('FORMATO')) return 'FORMATO';
  if (t.includes('GUIA')) return 'GUIA';
  if (t.includes('PLANTILLA')) return 'PLANTILLA';
  return 'OTRO';
};

const mapCategoriaToApiTipo = (categoria: CategoriaDocumento): string => {
  switch (categoria) {
    case 'PLANTILLA':
      return 'plantilla';
    case 'OFICIO':
      return 'oficio';
    case 'ACTA':
      return 'acta';
    case 'LISTA_CHEQUEO':
      return 'lista_chequeo';
    case 'INFORME':
      return 'informe';
    case 'EVIDENCIA':
      return 'evidencia';
    case 'FORMATO':
      return 'formato';
    case 'GUIA':
      return 'guia';
    default:
      return 'otro';
  }
};

const mapApiDocumentoToBiblioteca = (doc: any): DocumentoBiblioteca => {
  const fecha = doc?.createdAt || doc?.fechaSubida || new Date().toISOString();
  const nombre = doc?.nombre || doc?.titulo || 'Documento sin nombre';
  const descripcion = doc?.descripcion || '';
  const tipo = doc?.tipoDocumento || doc?.tipo || doc?.categoria || '';
  const ext = (doc?.extension || doc?.mimeType?.split('/')[1] || (nombre.includes('.') ? nombre.split('.').pop() : '') || 'FILE').toString().toUpperCase();
  return {
    id: doc?.id || `doc-${Date.now()}`,
    nombre,
    descripcion,
    categoria: mapApiTipoToCategoria(tipo),
    archivoUrl: doc?.archivoUrl || doc?.url || doc?.fileUrl || doc?.rutaArchivo || '#',
    fechaSubida: typeof fecha === 'string' ? fecha : new Date(fecha).toISOString(),
    subidoPor: doc?.subidoPor || doc?.createdBy || doc?.usuario || 'Sistema',
    tamano: doc?.tamano || doc?.fileSizeFormatted || (doc?.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'N/A'),
    extension: ext,
    descargas: Number(doc?.descargas || doc?.downloads || 0)
  };
};

const mapApiListaToUI = (lista: any): ListaChequeo => {
  const items = Array.isArray(lista?.items)
    ? lista.items.map((it: any) => ({
        id: it?.id || `item-${Date.now()}`,
        texto: it?.texto || it?.pregunta || '',
        completado: it?.completado || false
      }))
    : [];
  
  // Mapear tipo del backend a etapaKanban del frontend
  const tipoToEtapa: Record<string, EtapaKanban> = {
    'planeacion': 'PLANEACION',
    'PLANEACION': 'PLANEACION',
    'ejecucion': 'EJECUCION',
    'EJECUCION': 'EJECUCION',
    'comunicacion': 'EJECUCION', // Comunicación se mapea a Ejecución
    'COMUNICACION': 'EJECUCION',
    'seguimiento': 'SEGUIMIENTO',
    'SEGUIMIENTO': 'SEGUIMIENTO',
    'cierre': 'CIERRE',
    'CIERRE': 'CIERRE',
  };
  const etapa = tipoToEtapa[lista?.tipo] || tipoToEtapa[lista?.etapaKanban] || 'PLANEACION';

  // ✅ Reconstruir fasesImpactadas basándose en el tipo del backend
  const tipoLower = (lista?.tipo || '').toLowerCase();
  const fasesImpactadas = {
    planeacion: tipoLower === 'planeacion',
    ejecucion: tipoLower === 'ejecucion',
    comunicacion: tipoLower === 'comunicacion',
    seguimiento: tipoLower === 'seguimiento'
  };

  return {
    id: lista?.id || `lista-${Date.now()}`,
    nombre: lista?.nombre || 'Lista sin nombre',
    descripcion: lista?.descripcion || '',
    etapaKanban: etapa,
    items,
    documentosAdjuntos: lista?.documentosAdjuntos || [],
    creadoPor: lista?.creadoPor || lista?.createdBy || 'Sistema',
    fechaCreacion: lista?.createdAt || lista?.fechaCreacion || new Date().toISOString(),
    ultimaModificacion: lista?.updatedAt || lista?.ultimaModificacion || new Date().toISOString(),
    completitud: lista?.completitud || (items.length > 0 ? Math.round(items.filter((i: any) => i.completado).length / items.length * 100) : 0),
    activa: lista?.activa !== false,
    auditoriaId: lista?.auditoriaId,
    auditoriaCodigoNombre: lista?.nombreAuditoria || lista?.auditoriaCodigoNombre,
    fasesImpactadas
  };
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

type TabActiva = 'BIBLIOTECA' | 'LISTAS_CHEQUEO';

export function ListasChequeoModule() {
  const [tabActiva, setTabActiva] = useState<TabActiva>('BIBLIOTECA');
  const [documentosBiblioteca, setDocumentosBiblioteca] = useState<DocumentoBiblioteca[]>([]);
  const [listasBackend, setListasBackend] = useState<ListaChequeo[]>([]);
  const [auditorias, setAuditorias] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cargarDatos = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [docsApi, listasApi, auditoriasApi] = await Promise.all([
          controlInternoService.getDocumentos(),
          controlInternoService.getListasChequeo(),
          controlInternoService.getAuditorias()
        ]);
        if (cancelled) return;

        if (Array.isArray(docsApi) && docsApi.length > 0) {
          setDocumentosBiblioteca(docsApi.map(mapApiDocumentoToBiblioteca));
        } else {
          setDocumentosBiblioteca([]);
        }
        if (Array.isArray(listasApi) && listasApi.length > 0) {
          setListasBackend(listasApi.map(mapApiListaToUI));
        } else {
          setListasBackend([]);
        }
        if (Array.isArray(auditoriasApi)) {
          setAuditorias(auditoriasApi);
        } else {
          setAuditorias([]);
        }
      } catch (error) {
        console.error('Error cargando biblioteca/listas desde backend:', error);
        setDocumentosBiblioteca([]);
        setListasBackend([]);
        setAuditorias([]);
        setLoadError('No se pudieron cargar los datos desde el backend.');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    cargarDatos();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderModuloCIG 
        titulo="Biblioteca" 
        subtitulo="Control Interno de Gestión" 
      />

      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="w-full px-8">
          <div className="flex gap-1">
            <TabButton
              active={tabActiva === 'BIBLIOTECA'}
              onClick={() => setTabActiva('BIBLIOTECA')}
              icon={<FolderOpen className="w-4 h-4" />}
              label="Biblioteca de Plantillas"
              badge={documentosBiblioteca.length}
            />
            <TabButton
              active={tabActiva === 'LISTAS_CHEQUEO'}
              onClick={() => setTabActiva('LISTAS_CHEQUEO')}
              icon={<CheckSquare className="w-4 h-4" />}
              label="Listas de Chequeo"
              badge={listasBackend.length}
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tabActiva}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tabActiva === 'BIBLIOTECA' && (
            <BibliotecaDocumentos 
              documentos={documentosBiblioteca}
              setDocumentos={setDocumentosBiblioteca}
              isLoading={isLoading}
              loadError={loadError}
            />
          )}
          {tabActiva === 'LISTAS_CHEQUEO' && (
            <GestionListasChequeo 
              documentosBiblioteca={documentosBiblioteca}
              auditorias={auditorias}
              listasIniciales={listasBackend}
              isLoading={isLoading}
              loadError={loadError}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: BIBLIOTECA DE DOCUMENTOS
// ════════════════════════════════════════════════════════════════════════════

interface BibliotecaDocumentosProps {
  documentos: DocumentoBiblioteca[];
  setDocumentos: React.Dispatch<React.SetStateAction<DocumentoBiblioteca[]>>;
  isLoading: boolean;
  loadError: string | null;
}

function BibliotecaDocumentos({ documentos, setDocumentos, isLoading, loadError }: BibliotecaDocumentosProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');
  const [mostrarModalSubir, setMostrarModalSubir] = useState(false);
  const [documentoVistaPrevia, setDocumentoVistaPrevia] = useState<DocumentoBiblioteca | null>(null);
  const [documentoEliminar, setDocumentoEliminar] = useState<DocumentoBiblioteca | null>(null);
  const sinDatosBackend = documentos.length === 0 && busqueda.trim() === '' && filtroCategoria === 'TODOS';

  const documentosFiltrados = documentos.filter(doc => {
    const cumpleBusqueda = doc.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          doc.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleCategoria = filtroCategoria === 'TODOS' || doc.categoria === filtroCategoria;
    return cumpleBusqueda && cumpleCategoria;
  });

  // ═══════════════════════════════════════════════════════════════════
  // FUNCIÓN REAL: DESCARGAR DOCUMENTO
  // ═══════════════════════════════════════════════════════════════════
  const handleDescargar = (documento: DocumentoBiblioteca) => {
    try {
      // Incrementar contador de descargas
      setDocumentos(prev => 
        prev.map(doc => 
          doc.id === documento.id 
            ? { ...doc, descargas: doc.descargas + 1 }
            : doc
        )
      );

      // Crear un elemento <a> temporal para forzar la descarga
      const link = document.createElement('a');
      link.href = documento.archivoUrl;
      link.download = `${documento.nombre}.${documento.extension.toLowerCase()}`;
      link.target = '_blank';
      
      // Simular click en el link
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('✅ Descarga iniciada', {
        description: `Se está descargando: ${documento.nombre}.${documento.extension}`,
        duration: 4000
      });
    } catch (error) {
      console.error('Error al descargar documento:', error);
      toast.error('❌ Error al descargar', {
        description: 'No se pudo iniciar la descarga del documento',
        duration: 4000
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // FUNCIÓN REAL: VISTA PREVIA
  // ═══════════════════════════════════════════════════════════════════
  const handleVistaPrevia = (documento: DocumentoBiblioteca) => {
    setDocumentoVistaPrevia(documento);
  };

  // ═══════════════════════════════════════════════════════════════════
  // FUNCIÓN REAL: ELIMINAR CON CONFIRMACIÓN
  // ═══════════════════════════════════════════════════════════════════
  const handleEliminar = (documento: DocumentoBiblioteca) => {
    setDocumentoEliminar(documento);
  };

  const confirmarEliminacion = async () => {
    if (!documentoEliminar) return;

    try {
      await controlInternoService.deleteDocumento(documentoEliminar.id);
      setDocumentos(prev => prev.filter(d => d.id !== documentoEliminar.id));
      toast.success('🗑️ Documento eliminado', {
        description: `Se eliminó "${documentoEliminar.nombre}" de la biblioteca`,
        duration: 4000
      });
      setDocumentoEliminar(null);
    } catch (error) {
      console.error('Error eliminando documento en backend:', error);
      toast.error('❌ No se pudo eliminar el documento');
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // FUNCIÓN REAL: SUBIR DOCUMENTO
  // ═══════════════════════════════════════════════════════════════════
  const handleSubirDocumento = async (nuevoDocumento: Omit<DocumentoBiblioteca, 'id' | 'descargas'> & { file: File }) => {
    try {
      const creado = await controlInternoService.createDocumento(
        nuevoDocumento.file,
        {
          nombre: nuevoDocumento.nombre,
          descripcion: nuevoDocumento.descripcion,
          tipoDocumento: mapCategoriaToApiTipo(nuevoDocumento.categoria),
          subidoPor: nuevoDocumento.subidoPor
        }
      );

      const documentoCompleto: DocumentoBiblioteca = mapApiDocumentoToBiblioteca(creado);
      setDocumentos(prev => [documentoCompleto, ...prev]);
      setMostrarModalSubir(false);

      toast.success('✅ Documento subido exitosamente', {
        description: `"${documentoCompleto.nombre}" se agregó a la biblioteca`,
        duration: 4000
      });
      return;
    } catch (error) {
      console.error('Error subiendo documento al backend:', error);
      toast.error('❌ No se pudo subir el documento al backend');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
              Biblioteca de Plantillas
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Repositorio centralizado de plantillas, oficios y documentos oficiales para auditoría
            </p>
          </div>
          <button
            onClick={() => setMostrarModalSubir(true)}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all text-sm sm:text-base"
          >
            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            Subir Documento
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl border-2 border-blue-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-blue-700">Total Documentos</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700">{documentos.length}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-green-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-green-700">Plantillas</span>
            <File className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-black text-green-700">
            {documentos.filter(d => d.categoria === 'PLANTILLA').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border-2 border-purple-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-purple-700">Oficios</span>
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-700">
            {documentos.filter(d => d.categoria === 'OFICIO').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border-2 border-yellow-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-yellow-700">Formatos</span>
            <CheckSquare className="w-4 h-4 text-yellow-600" />
          </div>
          <p className="text-2xl font-black text-yellow-700">
            {documentos.filter(d => d.categoria === 'FORMATO').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border-2 border-red-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-red-700">Descargas Totales</span>
            <Download className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-700">
            {documentos.reduce((sum, d) => sum + d.descargas, 0)}
          </p>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar documentos por nombre o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold focus:border-blue-500 focus:outline-none"
          >
            <option value="TODOS">Todas las categorías</option>
            <option value="OFICIO">Oficios</option>
            <option value="ACTA">Actas</option>
            <option value="LISTA_CHEQUEO">Listas de Chequeo</option>
            <option value="INFORME">Informes</option>
            <option value="EVIDENCIA">Evidencias</option>
            <option value="PLANTILLA">Plantillas</option>
            <option value="FORMATO">Formatos</option>
            <option value="GUIA">Guías</option>
            <option value="OTRO">Otros</option>
          </select>
        </div>
      </div>

      {/* Lista de Documentos */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="p-6 border-b-2 border-gray-200 bg-gray-50">
          <h2 className="text-xl font-black text-gray-900">
            Documentos Disponibles ({documentosFiltrados.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Clock className="w-16 h-16 text-blue-300 mx-auto mb-4 animate-pulse" />
            <p className="text-blue-700 font-semibold">Cargando documentos desde backend...</p>
          </div>
        ) : loadError ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <p className="text-red-700 font-semibold">{loadError}</p>
          </div>
        ) : (
          <>
            <div className="divide-y-2 divide-gray-200">
              {documentosFiltrados.map((doc) => (
                <TarjetaDocumento
                  key={doc.id}
                  documento={doc}
                  onEliminar={() => handleEliminar(doc)}
                  onDescargar={(doc) => handleDescargar(doc)}
                  onVistaPrevia={(doc) => handleVistaPrevia(doc)}
                />
              ))}
            </div>

            {documentosFiltrados.length === 0 && (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold">
                  {sinDatosBackend ? 'No hay documentos cargados en el backend' : 'No se encontraron documentos con ese filtro'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Vista Previa */}
      {documentoVistaPrevia && (
        <ModalVistaPrevia
          documento={documentoVistaPrevia}
          onClose={() => setDocumentoVistaPrevia(null)}
        />
      )}

      {/* Modal Eliminar */}
      {documentoEliminar && (
        <ModalEliminar
          documento={documentoEliminar}
          onClose={() => setDocumentoEliminar(null)}
          onConfirmar={confirmarEliminacion}
        />
      )}

      {/* Modal Subir Documento */}
      {mostrarModalSubir && (
        <ModalSubirDocumento
          onClose={() => setMostrarModalSubir(false)}
          onSubir={handleSubirDocumento}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: TARJETA DE DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface TarjetaDocumentoProps {
  documento: DocumentoBiblioteca;
  onEliminar: (documento: DocumentoBiblioteca) => void;
  onDescargar: (documento: DocumentoBiblioteca) => void;
  onVistaPrevia: (documento: DocumentoBiblioteca) => void;
}

function TarjetaDocumento({ documento, onEliminar, onDescargar, onVistaPrevia }: TarjetaDocumentoProps) {
  const colorCategoria = {
    'PLANTILLA': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    'OFICIO': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    'ACTA': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
    'LISTA_CHEQUEO': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
    'INFORME': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
    'EVIDENCIA': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    'FORMATO': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    'GUIA': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    'OTRO': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' }
  }[documento.categoria];

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${colorCategoria.bg}`}>
              <File className={`w-5 h-5 ${colorCategoria.text}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-gray-900">{documento.nombre}</h3>
              <p className="text-sm text-gray-600">{documento.descripcion}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 text-sm">
            <span className={`px-3 py-1 rounded-lg font-bold ${colorCategoria.bg} ${colorCategoria.text}`}>
              {documento.categoria}
            </span>
            <span className="text-gray-600">
              <strong>Tamaño:</strong> {documento.tamano}
            </span>
            <span className="text-gray-600">
              <strong>Tipo:</strong> {documento.extension}
            </span>
            <span className="text-gray-600">
              <strong>Subido:</strong> {new Date(documento.fechaSubida).toLocaleDateString('es-CO')}
            </span>
            <span className="text-gray-600">
              <strong>Por:</strong> {documento.subidoPor}
            </span>
            <span className="flex items-center gap-1 text-blue-600">
              <Download className="w-4 h-4" />
              <strong>{documento.descargas}</strong> descargas
            </span>
          </div>
        </div>

        <div className="flex gap-2 ml-6">
          <button
            onClick={() => onDescargar(documento)}
            className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
            title="Descargar documento"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => onVistaPrevia(documento)}
            className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
            title="Vista previa"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={() => onEliminar(documento)}
            className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
            title="Eliminar documento"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: GESTIÓN DE LISTAS DE CHEQUEO
// ════════════════════════════════════════════════════════════════════════════

interface GestionListasChequeoProps {
  documentosBiblioteca: DocumentoBiblioteca[];
  auditorias: any[];
  listasIniciales: ListaChequeo[];
  isLoading: boolean;
  loadError: string | null;
}

function GestionListasChequeo({ documentosBiblioteca, auditorias, listasIniciales, isLoading, loadError }: GestionListasChequeoProps) {
  const [listas, setListas] = useState<ListaChequeo[]>(listasIniciales || []);
  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODOS');
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [listaSeleccionada, setListaSeleccionada] = useState<ListaChequeo | null>(null);
  const [listaAEditar, setListaAEditar] = useState<ListaChequeo | null>(null);
  const [listaAEliminar, setListaAEliminar] = useState<ListaChequeo | null>(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    setListas(listasIniciales || []);
  }, [listasIniciales]);

  // ✅ ELIMINAR LISTA DE CHEQUEO (Backend conectado)
  const handleEliminarLista = async () => {
    if (!listaAEliminar) return;
    setEliminando(true);
    try {
      await controlInternoService.deleteListaChequeo(listaAEliminar.id);
      setListas(prev => prev.filter(l => l.id !== listaAEliminar.id));
      toast.success('Lista eliminada exitosamente', {
        description: `"${listaAEliminar.nombre}" ha sido eliminada del sistema`
      });
      setListaAEliminar(null);
    } catch (error) {
      console.error('Error eliminando lista:', error);
      toast.error('Error al eliminar la lista', {
        description: 'No se pudo eliminar del backend. Intente nuevamente.'
      });
    } finally {
      setEliminando(false);
    }
  };

  // ✅ EDITAR LISTA DE CHEQUEO (Backend conectado)
  const handleGuardarEdicion = async (listaEditada: Partial<ListaChequeo>) => {
    if (!listaAEditar) return;
    try {
      const tipo =
        listaEditada.etapaKanban === 'EJECUCION'
          ? 'ejecucion'
          : listaEditada.etapaKanban === 'COMUNICACION'
          ? 'comunicacion'
          : 'planeacion';

      const actualizada = await controlInternoService.updateListaChequeo(listaAEditar.id, {
        nombre: listaEditada.nombre,
        descripcion: listaEditada.descripcion,
        tipo,
        activa: listaEditada.activa ?? true
      });

      setListas(prev => prev.map(l => 
        l.id === listaAEditar.id ? mapApiListaToUI(actualizada) : l
      ));
      setListaAEditar(null);
      toast.success('Lista actualizada exitosamente', {
        description: `"${listaEditada.nombre}" guardada en backend`
      });
    } catch (error) {
      console.error('Error actualizando lista:', error);
      toast.error('Error al actualizar', {
        description: 'No se pudo guardar los cambios. Intente nuevamente.'
      });
    }
  };

  const listasFiltradas = listas.filter(lista => 
    filtroEtapa === 'TODOS' || lista.etapaKanban === filtroEtapa
  );

  const estadisticas = {
    totalListas: listas.length,
    planeacion: listas.filter(l => l.etapaKanban === 'PLANEACION').length,
    ejecucion: listas.filter(l => l.etapaKanban === 'EJECUCION').length,
    completitudPromedio: listas.length > 0
      ? Math.round(listas.reduce((sum, l) => sum + l.completitud, 0) / listas.length)
      : 0
  };

  // ✅ FUNCIONALIDAD REAL: Crear nueva lista de chequeo
  const handleCrearLista = async (nuevaLista: Partial<ListaChequeo>) => {
    const listaCompleta: ListaChequeo = {
      id: `lista-${Date.now()}`,
      nombre: nuevaLista.nombre || 'Nueva Lista',
      descripcion: nuevaLista.descripcion || '',
      etapaKanban: nuevaLista.etapaKanban || 'PLANEACION',
      items: nuevaLista.items || [],
      documentosAdjuntos: nuevaLista.documentosAdjuntos || [],
      creadoPor: 'Usuario Actual',
      fechaCreacion: new Date().toISOString(),
      ultimaModificacion: new Date().toISOString(),
      completitud: 0,
      activa: true,
      // ✅ VINCULACIÓN CON AUDITORÍAS OCIG
      auditoriaId: nuevaLista.auditoriaId,
      auditoriaCodigoNombre: nuevaLista.auditoriaCodigoNombre,
      fasesImpactadas: nuevaLista.fasesImpactadas,
      // ✅ LEGACY: GESTIÓN DOCUMENTAL (mantener compatibilidad)
      etapaProceso: nuevaLista.etapaProceso,
      auditoriaAsignada: nuevaLista.auditoriaAsignada
    };

    try {
      const tipo =
        nuevaLista.etapaKanban === 'EJECUCION'
          ? 'ejecucion'
          : nuevaLista.etapaKanban === 'COMUNICACION'
          ? 'comunicacion'
          : 'planeacion';

      // Generar código único para la lista
      const codigoLista = `LC-${tipo.toUpperCase().substring(0, 4)}-${Date.now().toString().slice(-6)}`;

      const creadaApi = await controlInternoService.createListaChequeo({
        codigo: codigoLista,
        nombre: listaCompleta.nombre,
        descripcion: listaCompleta.descripcion || '',
        tipo,
        categoria: 'biblioteca',
        activa: true,
        items: (listaCompleta.items || []).map((item, idx) => ({
          texto: item.texto,
          categoria: 'General',
          obligatorio: true,
          orden: idx + 1
        })),
        // ✅ VINCULACIÓN CON AUDITORÍA
        auditoriaId: listaCompleta.auditoriaId,
        nombreAuditoria: listaCompleta.auditoriaCodigoNombre,
      });

      setListas(prev => [mapApiListaToUI(creadaApi), ...prev]);
      setMostrarModalCrear(false);
      toast.success('✅ Lista de chequeo creada exitosamente', {
        description: `"${listaCompleta.nombre}" guardada en backend`,
        duration: 5000
      });
      return;
    } catch (error) {
      console.error('Error creando lista en backend:', error);
    }

    toast.error('❌ No se pudo crear la lista en backend');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
              Gestión de Listas de Chequeo
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Crea y administra listas de verificación vinculadas a las etapas del Kanban
            </p>
          </div>
          <button
            onClick={() => setMostrarModalCrear(true)}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Nueva Lista de Chequeo
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white rounded-xl border-2 border-blue-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold text-blue-700">Total Listas</span>
            <List className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-blue-700">{estadisticas.totalListas}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-green-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold text-green-700">Planeación</span>
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-green-700">{estadisticas.planeacion}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-purple-200 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold text-purple-700">Ejecución</span>
            <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-700">{estadisticas.ejecucion}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-red-200 p-3 sm:p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-semibold text-red-700">Completitud Prom.</span>
            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-red-700">{estadisticas.completitudPromedio}%</p>
        </div>
      </div>

      {/* Filtro por Etapa */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <span className="text-xs sm:text-sm font-bold text-gray-700">Filtrar por Etapa:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroEtapa('TODOS')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                filtroEtapa === 'TODOS'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFiltroEtapa('PLANEACION')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                filtroEtapa === 'PLANEACION'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Planeación
            </button>
            <button
              onClick={() => setFiltroEtapa('EJECUCION')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                filtroEtapa === 'EJECUCION'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Ejecución
            </button>
            <button
              onClick={() => setFiltroEtapa('SEGUIMIENTO')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                filtroEtapa === 'SEGUIMIENTO'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Seguimiento
            </button>
            <button
              onClick={() => setFiltroEtapa('CIERRE')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                filtroEtapa === 'CIERRE'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cierre
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Listas de Chequeo */}
      <div className="space-y-6">
        {!isLoading && !loadError && listasFiltradas.map((lista) => (
          <TarjetaListaChequeo
            key={lista.id}
            lista={lista}
            onVer={() => setListaSeleccionada(lista)}
            onEditar={(l) => setListaAEditar(l)}
            onEliminar={(l) => setListaAEliminar(l)}
          />
        ))}
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
          <Clock className="w-16 h-16 text-blue-300 mx-auto mb-4 animate-pulse" />
          <p className="text-blue-700 font-semibold">Cargando listas de chequeo desde backend...</p>
        </div>
      )}

      {loadError && !isLoading && (
        <div className="bg-white rounded-xl border-2 border-red-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <p className="text-red-700 font-semibold">{loadError}</p>
        </div>
      )}

      {listasFiltradas.length === 0 && !isLoading && !loadError && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
          <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-semibold">
            {listas.length === 0
              ? 'No hay listas de chequeo cargadas en el backend'
              : 'No hay listas de chequeo para esta etapa'}
          </p>
        </div>
      )}

      {/* ✅ MODAL CREAR NUEVA LISTA */}
      {mostrarModalCrear && (
        <ModalCrearListaChequeo
          onClose={() => setMostrarModalCrear(false)}
          onCrear={handleCrearLista}
          documentosBiblioteca={documentosBiblioteca}
          auditorias={auditorias}
        />
      )}

      {/* Modal Ver Detalle */}
      {listaSeleccionada && (
        <ModalDetalleListaChequeo
          lista={listaSeleccionada}
          onClose={() => setListaSeleccionada(null)}
        />
      )}

      {/* ✅ MODAL EDITAR LISTA (reutiliza modal crear) */}
      {listaAEditar && (
        <ModalCrearListaChequeo
          onClose={() => setListaAEditar(null)}
          onCrear={handleGuardarEdicion}
          documentosBiblioteca={documentosBiblioteca}
          auditorias={auditorias}
          listaEditar={listaAEditar}
        />
      )}

      {/* ✅ MODAL CONFIRMAR ELIMINACIÓN */}
      {listaAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirmar Eliminación</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              ¿Está seguro de eliminar la lista de chequeo <strong>"{listaAEliminar.nombre}"</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setListaAEliminar(null)}
                disabled={eliminando}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarLista}
                disabled={eliminando}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {eliminando ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: TARJETA DE LISTA DE CHEQUEO
// ════════════════════════════════════════════════════════════════════════════

interface TarjetaListaChequeoProps {
  lista: ListaChequeo;
  onVer: () => void;
  onEditar: (lista: ListaChequeo) => void;
  onEliminar: (lista: ListaChequeo) => void;
}

function TarjetaListaChequeo({ lista, onVer, onEditar, onEliminar }: TarjetaListaChequeoProps) {
  const colorEtapa = {
    'PLANEACION': { bg: 'bg-green-100', text: 'text-green-700' },
    'EJECUCION': { bg: 'bg-purple-100', text: 'text-purple-700' },
    'SEGUIMIENTO': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'CIERRE': { bg: 'bg-red-100', text: 'text-red-700' }
  }[lista.etapaKanban] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  const itemsCompletados = lista.items.filter(i => i.completado).length;
  const totalItems = lista.items.length;

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-blue-400 transition-all">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <h3 className="text-lg sm:text-xl font-black text-gray-900">{lista.nombre}</h3>
              <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold ${colorEtapa.bg} ${colorEtapa.text}`}>
                {lista.etapaKanban}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">{lista.descripcion}</p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-gray-500">Creado por:</span>
                <p className="font-semibold text-gray-900 break-words">{lista.creadoPor}</p>
              </div>
              <div>
                <span className="text-gray-500">Fecha creación:</span>
                <p className="font-semibold text-gray-900">
                  {new Date(lista.fechaCreacion).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Items completados:</span>
                <p className="font-semibold text-gray-900">{itemsCompletados} / {totalItems}</p>
              </div>
              <div>
                <span className="text-gray-500">Documentos adjuntos:</span>
                <p className="font-semibold text-gray-900">{lista.documentosAdjuntos.length}</p>
              </div>
            </div>
          </div>

          <div className="text-center sm:ml-6 flex sm:flex-col items-center sm:items-center gap-2 sm:gap-0">
            <div className="text-3xl sm:text-4xl font-black text-blue-600 sm:mb-1">{lista.completitud}%</div>
            <div className="text-[10px] sm:text-xs text-gray-500">Completitud</div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-700 transition-all duration-500"
            style={{ width: `${lista.completitud}%` }}
          ></div>
        </div>

        {/* ✅ VINCULACIÓN CON AUDITORÍA OCIG */}
        {lista.auditoriaId && lista.auditoriaCodigoNombre && (
          <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-purple-900">🔗 Vinculada a Auditoría OCIG:</p>
                <p className="text-sm font-black text-purple-700 truncate">{lista.auditoriaCodigoNombre}</p>
              </div>
            </div>
            
            {/* Fases impactadas */}
            {lista.fasesImpactadas && Object.values(lista.fasesImpactadas).some(v => v) && (
              <div className="mt-2">
                <p className="text-xs font-bold text-gray-700 mb-1.5">📊 Fases impactadas:</p>
                <div className="flex flex-wrap gap-1.5">
                  {lista.fasesImpactadas.planeacion && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                      📋 Planeación
                    </span>
                  )}
                  {lista.fasesImpactadas.ejecucion && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                      🔍 Ejecución
                    </span>
                  )}
                  {lista.fasesImpactadas.comunicacion && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">
                      📢 Comunicación
                    </span>
                  )}
                  {lista.fasesImpactadas.seguimiento && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                      👁️ Seguimiento
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Documentos adjuntos preview */}
        {lista.documentosAdjuntos.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Paperclip className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-600">Documentos:</span>
            {lista.documentosAdjuntos.map((doc, idx) => (
              <span
                key={idx}
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  doc.diligenciado
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {doc.nombreDocumento} {doc.diligenciado && '✓'}
              </span>
            ))}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={onVer}
            className="flex-1 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors text-xs sm:text-sm"
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Ver Detalle
          </button>
          <button
            onClick={() => onEditar(lista)}
            className="sm:flex-shrink-0 px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="sm:hidden">Editar</span>
          </button>
          <button
            onClick={() => onEliminar(lista)}
            className="sm:flex-shrink-0 px-3 sm:px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="sm:hidden">Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: TAB BUTTON
// ════════════════════════════════════════════════════════════════════════════

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative px-6 py-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-all ${
        active
          ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50/50'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            active ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: CREAR NUEVA LISTA DE CHEQUEO
// ════════════════════════════════════════════════════════════════════════════

interface ModalCrearListaChequeoProps {
  onClose: () => void;
  onCrear: (lista: Partial<ListaChequeo>) => void;
  documentosBiblioteca: DocumentoBiblioteca[];
  auditorias: any[]; // Auditorías del Plan Anual
  listaEditar?: ListaChequeo; // ✅ Para modo edición
}

function ModalCrearListaChequeo({ onClose, onCrear, documentosBiblioteca, auditorias, listaEditar }: ModalCrearListaChequeoProps) {
  const modoEdicion = !!listaEditar;
  const [nombre, setNombre] = useState(listaEditar?.nombre || '');
  const [descripcion, setDescripcion] = useState(listaEditar?.descripcion || '');
  const [etapaKanban, setEtapaKanban] = useState<EtapaKanban>(listaEditar?.etapaKanban || 'PLANEACION');
  const [items, setItems] = useState<ItemChequeo[]>(listaEditar?.items || []);
  const [nuevoItemTexto, setNuevoItemTexto] = useState('');
  const [plantillaItemActual, setPlantillaItemActual] = useState<string>(''); // Plantilla para el ítem que se está creando
  
  // ✅ VINCULACIÓN CON AUDITORÍAS OCIG
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState(listaEditar?.auditoriaId || '');
  const [fasesSeleccionadas, setFasesSeleccionadas] = useState(listaEditar?.fasesImpactadas || {
    planeacion: false,
    ejecucion: false,
    comunicacion: false,
    seguimiento: false
  });
  
  // ✅ LEGACY: Configuración de auditoría (mantener compatibilidad)
  const [etapaProceso, setEtapaProceso] = useState(listaEditar?.etapaProceso || '');
  const [auditoriaAsignada, setAuditoriaAsignada] = useState(listaEditar?.auditoriaAsignada || '');

  const handleAgregarItem = () => {
    if (!nuevoItemTexto.trim()) return;

    // Buscar info de la plantilla si se seleccionó
    let plantillaInfo = undefined;
    if (plantillaItemActual) {
      const doc = documentosBiblioteca.find(d => d.id === plantillaItemActual);
      if (doc) {
        plantillaInfo = {
          documentoBibliotecaId: doc.id,
          nombreDocumento: doc.nombre
        };
      }
    }

    const nuevoItem: ItemChequeo = {
      id: `item-${Date.now()}`,
      texto: nuevoItemTexto,
      completado: false,
      plantillaAsociada: plantillaInfo
    };

    setItems(prev => [...prev, nuevoItem]);
    setNuevoItemTexto('');
    setPlantillaItemActual(''); // Limpiar plantilla seleccionada
  };

  const handleEliminarItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleActualizarPlantillaItem = (itemId: string, plantillaId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        if (!plantillaId) {
          // Si no hay plantilla, quitar la asociación
          const { plantillaAsociada, ...rest } = item;
          return rest as ItemChequeo;
        } else {
          // Buscar info de la plantilla
          const doc = documentosBiblioteca.find(d => d.id === plantillaId);
          if (doc) {
            return {
              ...item,
              plantillaAsociada: {
                documentoBibliotecaId: doc.id,
                nombreDocumento: doc.nombre
              }
            };
          }
        }
      }
      return item;
    }));
  };

  const handleSubmit = () => {
    if (!nombre.trim()) {
      toast.error('❌ El nombre de la lista es obligatorio');
      return;
    }

    // ✅ Verificar que al menos una fase esté seleccionada si hay auditoría
    const hayFasesSeleccionadas = Object.values(fasesSeleccionadas).some(v => v);
    if (auditoriaSeleccionada && !hayFasesSeleccionadas) {
      toast.error('❌ Selecciona al menos una fase de impacto');
      return;
    }

    // Buscar info completa de la auditoría seleccionada
    let auditoriaInfo = undefined;
    if (auditoriaSeleccionada) {
      const auditoria = auditorias.find(a => a.id === auditoriaSeleccionada);
      if (auditoria) {
        auditoriaInfo = {
          auditoriaId: auditoria.id,
          auditoriaCodigoNombre: `${auditoria.codigo} - ${auditoria.titulo}`,
          fasesImpactadas: fasesSeleccionadas
        };
      }
    }

    onCrear({
      nombre,
      descripcion,
      etapaKanban,
      items, // Items ya tienen sus plantillas asociadas
      documentosAdjuntos: [], // Ya no se usan documentos separados
      // ✅ VINCULACIÓN CON AUDITORÍAS OCIG
      ...auditoriaInfo,
      // ✅ LEGACY: GESTIÓN DOCUMENTAL (mantener compatibilidad)
      etapaProceso: etapaProceso || undefined,
      auditoriaAsignada: auditoriaAsignada || undefined
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-xl sm:text-2xl font-black">
                {modoEdicion ? 'Editar Lista de Chequeo' : 'Nueva Lista de Chequeo'}
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 mt-1">
                {modoEdicion 
                  ? 'Modifica los datos de la lista de verificación'
                  : 'Crea una lista de verificación personalizada para tus auditorías'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Formulario - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">
              Nombre de la Lista <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Planeación - Auditoría Financiera"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe el propósito de esta lista de chequeo..."
              rows={3}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Etapa Kanban */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">
              Etapa del Kanban <span className="text-red-600">*</span>
            </label>
            <select
              value={etapaKanban}
              onChange={(e) => setEtapaKanban(e.target.value as EtapaKanban)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
            >
              <option value="PLANEACION">Planeación</option>
              <option value="EJECUCION">Ejecución</option>
              <option value="SEGUIMIENTO">Seguimiento</option>
              <option value="CIERRE">Cierre</option>
            </select>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SECCIÓN: VINCULACIÓN CON AUDITORÍAS OCIG */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-black text-purple-900">🔗 Vinculación con Auditorías OCIG</h3>
            </div>
            <p className="text-xs text-purple-700 mb-4">
              <strong>Clave:</strong> Vincula esta lista a una auditoría específica y define qué fases impactará. Esto permite trazabilidad completa y actualización automática del progreso de la auditoría.
            </p>

            <div className="space-y-4">
              {/* Selector de Auditoría */}
              <div className="bg-white rounded-lg p-3 border-2 border-purple-200">
                <label className="block text-xs font-bold text-gray-900 mb-2">
                  🎯 Auditoría OCIG <span className="text-purple-600">(Recomendado)</span>
                </label>
                <select
                  value={auditoriaSeleccionada}
                  onChange={(e) => {
                    setAuditoriaSeleccionada(e.target.value);
                    // Si deselecciona, limpiar fases
                    if (!e.target.value) {
                      setFasesSeleccionadas({
                        planeacion: false,
                        ejecucion: false,
                        comunicacion: false,
                        seguimiento: false
                      });
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none font-semibold bg-white"
                >
                  <option value="">🔍 Selecciona una auditoría del Plan Anual...</option>
                  {auditorias.map((auditoria) => (
                    <option key={auditoria.id} value={auditoria.id}>
                      {auditoria.codigo} - {auditoria.titulo} ({auditoria.estado})
                    </option>
                  ))}
                </select>
                {auditorias.length === 0 && (
                  <p className="text-xs text-orange-600 mt-2 bg-orange-50 p-2 rounded border border-orange-200">
                    ⚠️ No hay auditorías creadas en el Plan Anual. Crea primero una auditoría para vincularla.
                  </p>
                )}
              </div>

              {/* Selector de Fases Impactadas */}
              {auditoriaSeleccionada && (
                <div className="bg-white rounded-lg p-3 border-2 border-blue-200">
                  <label className="block text-xs font-bold text-gray-900 mb-3">
                    📊 Fases que Impacta esta Lista <span className="text-red-600">*</span>
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    Selecciona las fases de la auditoría donde se utilizará esta lista. Al completar items, se actualizará el progreso de cada fase.
                  </p>
                  
                  <div className="space-y-2">
                    {/* Fase: Planeación */}
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors border border-gray-200">
                      <input
                        type="checkbox"
                        checked={fasesSeleccionadas.planeacion}
                        onChange={(e) => setFasesSeleccionadas(prev => ({
                          ...prev,
                          planeacion: e.target.checked
                        }))}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-bold text-gray-900">📋 Planeación</span>
                        <p className="text-xs text-gray-600">Definición de objetivos, alcance y metodología</p>
                      </div>
                      {fasesSeleccionadas.planeacion && (
                        <span className="text-xs font-bold text-green-600">✅ Seleccionada</span>
                      )}
                    </label>

                    {/* Fase: Ejecución */}
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-green-50 cursor-pointer transition-colors border border-gray-200">
                      <input
                        type="checkbox"
                        checked={fasesSeleccionadas.ejecucion}
                        onChange={(e) => setFasesSeleccionadas(prev => ({
                          ...prev,
                          ejecucion: e.target.checked
                        }))}
                        className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-bold text-gray-900">🔍 Ejecución</span>
                        <p className="text-xs text-gray-600">Recopilación de evidencias y trabajo de campo</p>
                      </div>
                      {fasesSeleccionadas.ejecucion && (
                        <span className="text-xs font-bold text-green-600">✅ Seleccionada</span>
                      )}
                    </label>

                    {/* Fase: Comunicación */}
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors border border-gray-200">
                      <input
                        type="checkbox"
                        checked={fasesSeleccionadas.comunicacion}
                        onChange={(e) => setFasesSeleccionadas(prev => ({
                          ...prev,
                          comunicacion: e.target.checked
                        }))}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-bold text-gray-900">📢 Comunicación</span>
                        <p className="text-xs text-gray-600">Informes preliminares y definitivos</p>
                      </div>
                      {fasesSeleccionadas.comunicacion && (
                        <span className="text-xs font-bold text-green-600">✅ Seleccionada</span>
                      )}
                    </label>

                    {/* Fase: Seguimiento */}
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-orange-50 cursor-pointer transition-colors border border-gray-200">
                      <input
                        type="checkbox"
                        checked={fasesSeleccionadas.seguimiento}
                        onChange={(e) => setFasesSeleccionadas(prev => ({
                          ...prev,
                          seguimiento: e.target.checked
                        }))}
                        className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-bold text-gray-900">👁️ Seguimiento</span>
                        <p className="text-xs text-gray-600">Monitoreo de planes de mejoramiento</p>
                      </div>
                      {fasesSeleccionadas.seguimiento && (
                        <span className="text-xs font-bold text-green-600">✅ Seleccionada</span>
                      )}
                    </label>
                  </div>

                  {/* Resumen de fases seleccionadas */}
                  {Object.values(fasesSeleccionadas).some(v => v) && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs font-bold text-green-800">
                        ✅ Esta lista impactará {Object.values(fasesSeleccionadas).filter(v => v).length} fase(s)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Indicador si no hay auditoría seleccionada */}
              {!auditoriaSeleccionada && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    ℹ️ <strong>Opcional:</strong> Puedes crear la lista sin vincularla a una auditoría específica. Sin embargo, es recomendable vincularla para tener trazabilidad completa.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Items de Verificación con Plantillas Asociadas */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">
              Items de Verificación
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Cada ítem puede tener una plantilla asociada (opcional)
            </p>

            {/* Agregar nuevo item */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mb-4 space-y-3">
              <input
                type="text"
                value={nuevoItemTexto}
                onChange={(e) => setNuevoItemTexto(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAgregarItem()}
                placeholder="Escribe el ítem de verificación..."
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              
              {/* Selector de plantilla para el ítem */}
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <select
                  value={plantillaItemActual}
                  onChange={(e) => setPlantillaItemActual(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
                >
                  <option value="">Sin plantilla asociada</option>
                  {documentosBiblioteca.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      📄 {doc.nombre} ({doc.categoria})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAgregarItem}
                disabled={!nuevoItemTexto.trim()}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar Ítem {plantillaItemActual && '+ Plantilla'}
              </button>
            </div>

            {/* Lista de items con sus plantillas */}
            {items.length > 0 && (
              <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-3 space-y-3 max-h-96 overflow-y-auto">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-white p-3 rounded-lg border-2 border-gray-200 space-y-2"
                  >
                    {/* Ítem principal */}
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-xs">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 text-sm font-semibold break-words">{item.texto}</p>
                        
                        {/* Plantilla asociada */}
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <select
                              value={item.plantillaAsociada?.documentoBibliotecaId || ''}
                              onChange={(e) => handleActualizarPlantillaItem(item.id, e.target.value)}
                              className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none bg-white"
                            >
                              <option value="">Sin plantilla</option>
                              {documentosBiblioteca.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                  📄 {doc.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                          {item.plantillaAsociada && (
                            <p className="text-xs text-green-600 mt-1 ml-5">
                              ✅ Plantilla: {item.plantillaAsociada.nombreDocumento}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleEliminarItem(item.id)}
                        className="flex-shrink-0 p-1.5 hover:bg-red-100 rounded-lg transition-colors group"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length === 0 && (
              <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                <CheckSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-xs">
                  Aún no has agregado items de verificación
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="flex-shrink-0 bg-gray-50 border-t-2 border-gray-200 p-4 sm:p-6 rounded-b-xl flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-white border-2 border-gray-300 hover:bg-gray-100 rounded-lg font-bold text-gray-700 transition-colors text-sm sm:text-base"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-sm sm:text-base"
          >
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
            {modoEdicion ? 'Guardar Cambios' : 'Crear Lista de Chequeo'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: VER DETALLE DE LISTA
// ════════════════════════════════════════════════════════════════════════════

interface ModalDetalleListaChequeoProps {
  lista: ListaChequeo;
  onClose: () => void;
}

function ModalDetalleListaChequeo({ lista, onClose }: ModalDetalleListaChequeoProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-xl sm:text-2xl font-black break-words">{lista.nombre}</h2>
              <p className="text-xs sm:text-sm text-blue-100 mt-1">{lista.descripcion}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Contenido - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Información General */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-gray-600">Etapa:</span>
                <p className="font-bold text-gray-900">{lista.etapaKanban}</p>
              </div>
              <div>
                <span className="text-gray-600">Creado por:</span>
                <p className="font-bold text-gray-900 break-words">{lista.creadoPor}</p>
              </div>
              <div>
                <span className="text-gray-600">Fecha creación:</span>
                <p className="font-bold text-gray-900">
                  {new Date(lista.fechaCreacion).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Completitud:</span>
                <p className="font-bold text-blue-600">{lista.completitud}%</p>
              </div>
            </div>
          </div>

          {/* Items de Verificación */}
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
              Items de Verificación ({lista.items.length})
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {lista.items.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-3 sm:p-4 rounded-lg border-2 ${
                    item.completado
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm border-2 border-gray-200">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-semibold text-sm sm:text-base break-words">{item.texto}</p>
                      {item.responsable && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          <strong>Responsable:</strong> {item.responsable}
                        </p>
                      )}
                      {item.observaciones && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          <strong>Observaciones:</strong> {item.observaciones}
                        </p>
                      )}
                    </div>
                    {item.completado && (
                      <CheckCircle2 className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="flex-shrink-0 bg-gray-50 border-t-2 border-gray-200 p-4 sm:p-6 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors text-sm sm:text-base"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: VISTA PREVIA DE DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface ModalVistaPreviaProps {
  documento: DocumentoBiblioteca;
  onClose: () => void;
}

function ModalVistaPrevia({ documento, onClose }: ModalVistaPreviaProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl font-black break-words">{documento.nombre}</h2>
              <p className="text-sm text-blue-100 mt-1">{documento.descripcion}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Contenido - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Información General */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 text-xs">Categoría:</span>
                <p className="font-bold text-gray-900">{documento.categoria}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Subido por:</span>
                <p className="font-bold text-gray-900 break-words">{documento.subidoPor}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Fecha subida:</span>
                <p className="font-bold text-gray-900">
                  {new Date(documento.fechaSubida).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Tamaño:</span>
                <p className="font-bold text-gray-900">{documento.tamano}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Tipo:</span>
                <p className="font-bold text-gray-900">{documento.extension}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Descargas:</span>
                <p className="font-bold text-gray-900">{documento.descargas}</p>
              </div>
            </div>
          </div>

          {/* Vista Previa */}
          <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Vista Previa
            </h3>
            <div className="flex items-center justify-center bg-white rounded-lg p-4">
              <iframe
                src={documento.archivoUrl}
                className="w-full h-96 border-0 rounded"
                title={`Vista previa de ${documento.nombre}`}
              />
            </div>
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="flex-shrink-0 bg-gray-50 border-t-2 border-gray-200 p-6 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: ELIMINAR DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface ModalEliminarProps {
  documento: DocumentoBiblioteca;
  onClose: () => void;
  onConfirmar: () => void;
}

function ModalEliminar({ documento, onClose, onConfirmar }: ModalEliminarProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black">Eliminar Documento</h2>
                  <p className="text-sm text-red-100 mt-1">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Contenido - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Advertencia */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-900 mb-1">¿Confirmar eliminación?</h3>
                <p className="text-sm text-red-700">
                  Estás a punto de eliminar permanentemente este documento de la biblioteca. 
                  Esta acción no se puede revertir.
                </p>
              </div>
            </div>
          </div>

          {/* Información del Documento */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <File className="w-5 h-5 text-blue-600" />
              Información del Documento
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 text-xs">Nombre:</span>
                <p className="font-bold text-gray-900">{documento.nombre}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Categoría:</span>
                <p className="font-bold text-gray-900">{documento.categoria}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Subido por:</span>
                <p className="font-bold text-gray-900 break-words">{documento.subidoPor}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Fecha subida:</span>
                <p className="font-bold text-gray-900">
                  {new Date(documento.fechaSubida).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Tamaño:</span>
                <p className="font-bold text-gray-900">{documento.tamano}</p>
              </div>
              <div>
                <span className="text-gray-600 text-xs">Descargas:</span>
                <p className="font-bold text-gray-900">{documento.descargas}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="flex-shrink-0 bg-gray-50 border-t-2 border-gray-200 p-6 rounded-b-xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 hover:bg-gray-100 rounded-lg font-bold text-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Trash2 className="w-5 h-5" />
            Sí, Eliminar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: SUBIR DOCUMENTO
// ════════════════════════════════════════════════════════════════════════════

interface ModalSubirDocumentoProps {
  onClose: () => void;
  onSubir: (documento: Omit<DocumentoBiblioteca, 'id' | 'descargas'> & { file: File }) => void;
}

function ModalSubirDocumento({ onClose, onSubir }: ModalSubirDocumentoProps) {
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<CategoriaDocumento>('PLANTILLA');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  // Manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
    }
  };

  // Manejar drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      setArchivo(file);
    }
  };

  // Función para obtener tamaño legible
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Función para obtener extensión
  const getFileExtension = (filename: string): string => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
  };

  // Validar y subir
  const handleSubmit = () => {
    if (!archivo) {
      toast.error('❌ Debes seleccionar un archivo');
      return;
    }

    // Crear URL temporal (en producción sería upload a servidor)
    const archivoUrl = URL.createObjectURL(archivo);

    // El nombre es el nombre del archivo sin extensión
    const nombreDocumento = archivo.name.replace(/\.[^/.]+$/, '');

    const nuevoDocumento: Omit<DocumentoBiblioteca, 'id' | 'descargas'> & { file: File } = {
      nombre: nombreDocumento,
      descripcion,
      categoria,
      archivoUrl,
      fechaSubida: new Date().toISOString(),
      subidoPor: 'Usuario Actual', // En producción vendría del contexto de auth
      tamano: formatFileSize(archivo.size),
      extension: getFileExtension(archivo.name),
      file: archivo
    };

    onSubir(nuevoDocumento);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black">Subir Documento</h2>
                  <p className="text-sm text-blue-100 mt-1">Agrega un nuevo documento a la biblioteca</p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Contenido - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Zona de Drag & Drop */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Archivo <span className="text-red-600">*</span>
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                arrastrando
                  ? 'border-blue-500 bg-blue-50'
                  : archivo
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {archivo ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <File className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{archivo.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(archivo.size)} • {getFileExtension(archivo.name)}
                    </p>
                  </div>
                  <button
                    onClick={() => setArchivo(null)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold text-sm transition-colors"
                  >
                    Eliminar archivo
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      Arrastra tu archivo aquí
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      o haz click para seleccionar
                    </p>
                  </div>
                  <label className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer transition-colors">
                    Seleccionar Archivo
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Formatos soportados: PDF, Word, Excel, PowerPoint, Imágenes
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tipo de Documento */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Tipo de Documento <span className="text-red-600">*</span>
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaDocumento)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
            >
              <option value="OFICIO">Oficio</option>
              <option value="ACTA">Acta</option>
              <option value="LISTA_CHEQUEO">Lista de Chequeo</option>
              <option value="INFORME">Informe</option>
              <option value="EVIDENCIA">Evidencia</option>
              <option value="PLANTILLA">Plantilla</option>
              <option value="FORMATO">Formato</option>
              <option value="GUIA">Guía</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          {/* Nombre del Documento (Auto desde archivo) */}
          {archivo && (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Nombre del Documento
              </label>
              <div className="w-full px-4 py-3 border-2 border-gray-200 bg-gray-50 rounded-lg font-bold text-gray-700 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                {archivo.name.replace(/\.[^/.]+$/, '')}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                El nombre se toma automáticamente del archivo
              </p>
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe brevemente el contenido del documento..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="flex-shrink-0 bg-gray-50 border-t-2 border-gray-200 p-6 rounded-b-xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 hover:bg-gray-100 rounded-lg font-bold text-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Upload className="w-5 h-5" />
            Subir Documento
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
