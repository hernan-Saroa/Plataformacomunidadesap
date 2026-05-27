/**
 * TabDocumentosExpediente - Tab de Documentos COMPARTIDO entre Defensa Judicial y Juzgamiento
 * ✅ 8 categorías con iconos/colores diferenciados
 * ✅ Filtros pill con conteo dinámico
 * ✅ Buscador integrado
 * ✅ Plantillas cargadas desde el módulo de Configuraciones (API real)
 * ✅ Subir al Expediente — solo PDFs
 * ✅ Usado por ModalExpediente.tsx y ModalProcesoDisciplinario.tsx
 */

import { useState, useEffect } from 'react';
import {
  FolderOpen, Download, Eye, X, FileText, ChevronDown,
  Filter, User, File, BookOpen, Library, ArrowRight, Loader2, Search,
  Shield, Mail, Stamp, Share2, Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';
import { ModalHeaderClean } from '../modulos/ModalHeaderClean';
import { type DocumentoExpediente } from './expedienteShared';
import { apiClient } from '../../../../services/api/apiClient';
import { useConfiguracionesSIGL } from '../config/ConfiguracionesSIGLContext';

const ICON_MAP: Record<string, any> = {
  FolderOpen, BookOpen, Shield, Mail, Stamp, Eye, Share2, Bell, File, Filter, User, Library, Download, Search, X, ArrowRight
};

const LEGAL_API = '/legal/api/v1';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Tipo plantilla de la API ─────────────────────────────────────────────────

interface PlantillaApi {
  id: string;
  nombre: string;
  categoria: string;
  nombreOriginal: string;
  mimeType: string;
  tamano: number;
  subidoPor?: string;
  createdAt: string;
}

// Categorías de plantillas (coinciden con el módulo de Configuraciones)
const CAT_PLANTILLAS = [
  { id: 'todos',   label: 'Todos',   color: '#003DA5' },
  { id: 'actas',   label: 'Actas',   color: '#7C3AED' },
  { id: 'autos',   label: 'Autos',   color: '#DC2626' },
  { id: 'oficios', label: 'Oficios', color: '#D97706' },
];

function getCatPlantilla(id: string) {
  return CAT_PLANTILLAS.find(c => c.id === id) ?? { label: id, color: '#6B7280' };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TabDocumentosExpedienteProps {
  expedienteId: string;
  documentos: DocumentoExpediente[];
  setDocumentos: React.Dispatch<React.SetStateAction<DocumentoExpediente[]>>;
  profesionalAsignado: string;
  tituloSeccion?: string;
  onHasChanges?: () => void;
  onUploadDocument?: (file: File, categoria: string, tipoDocumento: string) => Promise<void> | void;
  onViewDocument?: (doc: DocumentoExpediente) => void;
  onDownloadDocument?: (doc: DocumentoExpediente) => void;
  onDownloadAll?: () => Promise<void> | void;
  moduloContexto?: 'defensa-judicial' | 'juzgamiento';
}

// Categorías que usan el flujo de plantillas (Word → PDF diligenciado)
const CATEGORIAS_CON_PLANTILLAS = ['actas', 'autos', 'oficios'];

// Tipos de archivo permitidos para subida directa de documentos
const TODOS_TIPOS_ACCEPT = [
  '.pdf', '.doc', '.docx',
  '.xls', '.xlsx',
  '.zip', '.rar',
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.mp4', '.webm', '.mov', '.avi', '.mkv',
].join(',');

// ─── Componente principal ─────────────────────────────────────────────────────

export function TabDocumentosExpediente({
  expedienteId,
  documentos,
  setDocumentos,
  profesionalAsignado,
  tituloSeccion = 'Documentos del Expediente',
  onHasChanges,
  onUploadDocument,
  onViewDocument,
  onDownloadDocument,
  onDownloadAll,
  moduloContexto = 'defensa-judicial'
}: TabDocumentosExpedienteProps) {
  const [busquedaDocs, setBusquedaDocs] = useState('');
  const [filtroDocTipo, setFiltroDocTipo] = useState('todos');

  // Categorías Dinámicas desde Contexto
  const { getCategoriasDocumentosActivas } = useConfiguracionesSIGL();
  const categoriasDocumentos = getCategoriasDocumentosActivas();
  const categoriasSeguras = categoriasDocumentos.length > 0 
    ? categoriasDocumentos 
    : [{ id: 'todos', nombre: 'Todos', icono: 'FolderOpen', color: '#003DA5', activo: true, orden: 1 }];

  // Plantillas desde API
  const [plantillas, setPlantillas] = useState<PlantillaApi[]>([]);
  const [cargandoPlantillas, setCargandoPlantillas] = useState(false);
  const [modalPlantillas, setModalPlantillas] = useState(false);
  const [busquedaPlantilla, setBusquedaPlantilla] = useState('');
  const [filtroPlantillaCategoria, setFiltroPlantillaCategoria] = useState('todos');
  const [plantillaDetalle, setPlantillaDetalle] = useState<PlantillaApi | null>(null);
  const [subiendoAlExpediente, setSubiendoAlExpediente] = useState(false);

  useEffect(() => {
    if (modalPlantillas && plantillas.length === 0) {
      cargarPlantillas();
    }
  }, [modalPlantillas]);

  async function cargarPlantillas() {
    setCargandoPlantillas(true);
    try {
      const data: PlantillaApi[] = await apiClient.get(`${LEGAL_API}/plantillas`);
      setPlantillas(data.filter(p => CATEGORIAS_CON_PLANTILLAS.includes(p.categoria)));
    } catch {
      toast.error('No se pudieron cargar las plantillas');
    } finally {
      setCargandoPlantillas(false);
    }
  }

  // ── Filtrado documentos ────────────────────────────────────────────────────

  const documentosFiltrados = documentos.filter((doc) => {
    const matchBusqueda = !busquedaDocs ||
      doc.nombre.toLowerCase().includes(busquedaDocs.toLowerCase()) ||
      doc.tipo.toLowerCase().includes(busquedaDocs.toLowerCase());
    const matchCategoria = filtroDocTipo === 'todos' || doc.categoria === filtroDocTipo;
    return matchBusqueda && matchCategoria;
  });

  const conteoCategoria = (catId: string) => {
    if (catId === 'todos') return documentos.length;
    return documentos.filter((d) => d.categoria === catId).length;
  };

  // ── Filtrado plantillas ────────────────────────────────────────────────────

  const plantillasFiltradas = plantillas.filter((p) => {
    const matchCategoria = filtroPlantillaCategoria === 'todos' || p.categoria === filtroPlantillaCategoria;
    const matchBusqueda = !busquedaPlantilla ||
      p.nombre.toLowerCase().includes(busquedaPlantilla.toLowerCase()) ||
      p.nombreOriginal.toLowerCase().includes(busquedaPlantilla.toLowerCase());
    return matchCategoria && matchBusqueda;
  });

  const conteoPorCatPlantilla = (catId: string) => {
    if (catId === 'todos') return plantillas.length;
    return plantillas.filter(p => p.categoria === catId).length;
  };

  // ── Handlers documentos ───────────────────────────────────────────────────

  const handleVerDocumento = (doc: DocumentoExpediente) => {
    if (onViewDocument) { onViewDocument(doc); return; }
    toast.info('Abriendo visor de documento', { description: doc.nombre });
  };

  const handleDescargarDocumento = (doc: DocumentoExpediente) => {
    if (onDownloadDocument) { onDownloadDocument(doc); return; }
    toast.success('Descarga iniciada', { description: `${doc.nombre} (${doc.tamaño})` });
  };

  const handleDescargarTodos = () => {
    if (onDownloadAll) { onDownloadAll(); return; }
    toast.success('Descargando expediente completo', {
      description: `Preparando archivo ZIP con ${documentos.length} archivos`,
      duration: 4000
    });
    setTimeout(() => {
      toast.success('Descarga completada', {
        description: `expediente_${expedienteId.replace(/\//g, '_')}.zip`,
        duration: 3000
      });
    }, 3000);
  };

  // ── Handlers plantillas ───────────────────────────────────────────────────

  const handleDescargarPlantilla = async (plantilla: PlantillaApi) => {
    try {
      const blob = await apiClient.getBlob(`${LEGAL_API}/plantillas/${plantilla.id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = plantilla.nombreOriginal;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Plantilla descargada', { description: plantilla.nombre });
    } catch {
      toast.error('No se pudo descargar la plantilla');
    }
  };

  const handleSubirAlExpediente = (plantilla: PlantillaApi) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf';

    input.onchange = async (e: any) => {
      const file: File | undefined = e.target?.files?.[0];
      if (!file) return;

      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Solo se permiten archivos PDF');
        return;
      }

      setSubiendoAlExpediente(true);
      try {
        if (onUploadDocument) {
          await Promise.resolve(onUploadDocument(file, plantilla.categoria, plantilla.nombre));
        } else {
          const nuevoDoc: DocumentoExpediente = {
            id: Date.now(),
            nombre: file.name,
            tamaño: formatBytes(file.size),
            fecha: new Date().toLocaleDateString('es-CO'),
            tipo: plantilla.nombre,
            firmante: profesionalAsignado || 'Oficina Jurídica',
            categoria: plantilla.categoria,
          };
          setDocumentos(prev => [nuevoDoc, ...prev]);
        }
        setModalPlantillas(false);
        setPlantillaDetalle(null);
        onHasChanges?.();
        toast.success('Documento subido al expediente', { description: file.name });
      } catch {
        // Error ya manejado por el padre
      } finally {
        setSubiendoAlExpediente(false);
      }
    };

    input.click();
  };

  const cerrarModalPlantillas = () => {
    setModalPlantillas(false);
    setPlantillaDetalle(null);
    setBusquedaPlantilla('');
    setFiltroPlantillaCategoria('todos');
  };

  // ── Handler subida directa de documento (para categorías sin plantillas) ──

  const handleSubirDocumento = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = TODOS_TIPOS_ACCEPT;

    input.onchange = async (e: any) => {
      const file: File | undefined = e.target?.files?.[0];
      if (!file) return;

      if (file.size > 250 * 1024 * 1024) {
        toast.error('El archivo no puede superar 250 MB');
        return;
      }

      const catDestino = filtroDocTipo === 'todos' ? 'documentos-generales' : filtroDocTipo;
      try {
        if (onUploadDocument) {
          await Promise.resolve(onUploadDocument(file, catDestino, file.name));
        } else {
          const nuevoDoc: DocumentoExpediente = {
            id: Date.now(),
            nombre: file.name,
            tamaño: formatBytes(file.size),
            fecha: new Date().toLocaleDateString('es-CO'),
            tipo: file.name,
            firmante: profesionalAsignado || 'Oficina Jurídica',
            categoria: catDestino,
          };
          setDocumentos(prev => [nuevoDoc, ...prev]);
        }
        onHasChanges?.();
        toast.success('Documento subido al expediente', { description: file.name });
      } catch {
        // Error ya manejado por el padre
      }
    };

    input.click();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const moduloLabel = moduloContexto === 'defensa-judicial' ? 'Defensa Judicial' : 'Juzgamiento Disciplinario';
  const usaPlantillas = CATEGORIAS_CON_PLANTILLAS.includes(filtroDocTipo);

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-black text-lg flex items-center gap-2" style={{ color: '#003DA5' }}>
              <FolderOpen className="w-5 h-5" />
              {tituloSeccion}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {documentos.length} documentos en total • {documentosFiltrados.length} mostrados
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {onUploadDocument && (
              <>
                {usaPlantillas && (
                  <Button
                    onClick={() => setModalPlantillas(true)}
                    className="font-semibold shadow-sm hover:opacity-90 transition-opacity border-none"
                    style={{ 
                      background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)', 
                      color: '#FFFFFF',
                      height: '32px', 
                      padding: '0 12px', 
                      fontSize: '13px', 
                      borderRadius: '6px'
                    }}
                  >
                    <Library className="w-4 h-4 mr-1.5" />
                    Plantillas
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSubirDocumento}
                  className="font-semibold"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#FFFFFF' }}
                >
                  <FolderOpen className="w-4 h-4 mr-1.5" />
                  Subir Documento
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDescargarTodos}
              disabled={documentosFiltrados.length === 0}
              className="font-semibold"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Descargar Todo
            </Button>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtro Unificada (Diseño Premium World-Class) */}
        <div 
          className="flex flex-col sm:flex-row items-center w-full bg-white rounded-2xl border border-gray-200 transition-all duration-300 overflow-hidden mt-6 mb-4"
          style={{
            boxShadow: '0 4px 20px -4px rgba(0,61,165,0.08)' // Sombra azulada sutil y elegante
          }}
        >
          
          {/* 1. Menú Desplegable (Categorías) */}
          <div className="relative w-full sm:w-auto min-w-[240px] bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer border-b sm:border-b-0 sm:border-r border-gray-200">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-transform group-hover:scale-110 duration-300">
              {(() => {
                const activeCat = categoriasSeguras.find(c => c.id === filtroDocTipo) || categoriasSeguras[0];
                const ActiveIcon = ICON_MAP[activeCat.icono as string] || Filter;
                return <ActiveIcon className="w-5 h-5 drop-shadow-sm" style={{ color: activeCat.color || '#475569' }} />;
              })()}
            </div>
            
            <select
              value={filtroDocTipo}
              onChange={(e) => setFiltroDocTipo(e.target.value)}
              className="w-full h-14 pl-12 pr-10 bg-transparent text-[15px] font-bold cursor-pointer outline-none appearance-none"
              style={{
                color: categoriasSeguras.find(c => c.id === filtroDocTipo)?.color || '#334155'
              }}
            >
              {categoriasSeguras.map((cat) => {
                const count = conteoCategoria(cat.id);
                return (
                  <option key={cat.id} value={cat.id} className="font-semibold text-slate-800 py-2">
                    {cat.nombre} {count > 0 ? `(${count})` : ''}
                  </option>
                );
              })}
            </select>
            
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-600 transition-colors">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>

          {/* 2. Campo de Búsqueda */}
          <div className="relative flex-1 bg-white flex items-center group w-full">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors duration-300">
              <Search className="w-5 h-5" />
            </div>
            
            <input
              type="text"
              value={busquedaDocs}
              onChange={(e) => setBusquedaDocs(e.target.value)}
              placeholder="Buscar por nombre, tipo o palabras clave del documento..."
              className="w-full h-14 pl-12 pr-14 text-[15px] bg-transparent outline-none text-slate-700 placeholder-slate-400 font-medium transition-all"
            />
            
            {busquedaDocs && (
              <button 
                onClick={() => setBusquedaDocs('')} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-all active:scale-95 shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            {/* Indicador de focus animado en la parte inferior */}
            <div className="absolute bottom-0 left-0 h-[2px] bg-blue-600 w-0 group-focus-within:w-full transition-all duration-300 ease-out"></div>
          </div>
          
        </div>

        {/* Lista documentos */}
        {documentosFiltrados.length === 0 ? (
          <Card className="p-8 text-center border-2 border-dashed border-gray-300">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h4 className="font-bold text-lg text-gray-600 mb-2">
              Sin documentos {filtroDocTipo !== 'todos' ? `en "${categoriasSeguras.find(c => c.id === filtroDocTipo)?.nombre}"` : ''}
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              {busquedaDocs
                ? `No se encontraron resultados para "${busquedaDocs}"`
                : 'Sube documentos con el botón "Subir Documento"' + (usaPlantillas ? ' o usando las plantillas disponibles' : '')}
            </p>
            {(busquedaDocs || filtroDocTipo !== 'todos') && (
              <Button variant="outline" onClick={() => { setBusquedaDocs(''); setFiltroDocTipo('todos'); }} className="font-semibold">
                <X className="w-4 h-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-2">
            {documentosFiltrados.map((doc) => {
              const catInfo = categoriasSeguras.find(c => c.id === doc.categoria);
              const CatIcon = ICON_MAP[catInfo?.icono as string] || File;
              return (
                <Card key={doc.id} className="p-3 hover:shadow-md transition-all border border-gray-200 hover:border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg flex-shrink-0" style={{ background: `${catInfo?.color || '#6B7280'}12` }}>
                      <CatIcon className="w-5 h-5" style={{ color: catInfo?.color || '#6B7280' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{doc.nombre}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: catInfo?.color || '#6B7280' }}>
                          {catInfo?.nombre || 'General'}
                        </span>
                        {doc.etapa && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: '#0D9488' }}>
                            {doc.etapa}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">{doc.tamaño}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{doc.fecha}</span>
                        {doc.firmante && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {doc.firmante}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50" onClick={() => handleVerDocumento(doc)} title="Ver documento">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50" onClick={() => handleDescargarDocumento(doc)} title="Descargar documento">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Banner plantillas — solo para Actas, Autos y Oficios */}
        {usaPlantillas && onUploadDocument && (
          <Card
            className="p-3 border-2 cursor-pointer hover:shadow-md transition-all"
            style={{ borderColor: '#2962FF30', background: 'linear-gradient(135deg, #2962FF08 0%, #003DA510 100%)' }}
            onClick={() => setModalPlantillas(true)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: '#2962FF15' }}>
                <Library className="w-5 h-5" style={{ color: '#2962FF' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm" style={{ color: '#003DA5' }}>
                  Biblioteca de Plantillas — {moduloLabel}
                </h4>
                <p className="text-xs text-gray-500">
                  Plantillas configuradas por el administrador • Descargue y suba el PDF diligenciado al expediente
                </p>
              </div>
              <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: '#2962FF' }} />
            </div>
          </Card>
        )}
      </div>

      {/* ── MODAL PLANTILLAS ───────────────────────────────────────────────────── */}
      {modalPlantillas && (
        <Dialog open={modalPlantillas} onOpenChange={cerrarModalPlantillas}>
          <DialogContent hideCloseButton className="w-[95vw] max-w-[1100px] lg:max-w-5xl !max-h-[82vh] flex flex-col p-0">
            <DialogTitle className="sr-only">Biblioteca de Plantillas</DialogTitle>
            <DialogDescription className="sr-only">Plantillas documentales disponibles para {moduloLabel}</DialogDescription>

            <ModalHeaderClean
              titulo="Biblioteca de Plantillas"
              subtitulo={`${moduloLabel} • Expediente ${expedienteId}`}
              icono={Library}
              colorIcono="blue"
              onClose={cerrarModalPlantillas}
            />

            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* ── Vista detalle de una plantilla ── */}
              {plantillaDetalle ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setPlantillaDetalle(null)}
                    className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    Volver al listado
                  </button>

                  <Card className="p-0 border-2 border-blue-200 overflow-hidden">
                    {/* Header azul */}
                    <div className="p-5" style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}>
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/15 rounded-xl">
                          <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1 text-white">
                          <h3 className="font-black text-lg">{plantillaDetalle.nombre}</h3>
                          <p className="text-sm text-blue-100 mt-1">{plantillaDetalle.nombreOriginal}</p>
                          <div className="flex items-center gap-3 mt-3 flex-wrap">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                              {getCatPlantilla(plantillaDetalle.categoria).label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Info básica */}
                    <div className="px-5 py-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <File className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Tamaño:</span>
                        <span className="font-semibold text-gray-800">{formatBytes(plantillaDetalle.tamano)}</span>
                      </div>
                      {plantillaDetalle.subidoPor && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500">Subida por:</span>
                          <span className="font-semibold text-gray-800">{plantillaDetalle.subidoPor}</span>
                        </div>
                      )}
                    </div>

                    {/* Instrucciones */}
                    <div className="mx-5 mb-5 p-4 rounded-lg border-2 border-blue-100" style={{ background: '#2962FF08' }}>
                      <h4 className="font-bold text-sm mb-2" style={{ color: '#003DA5' }}>Instrucciones de Uso</h4>
                      <ol className="space-y-1.5 text-xs text-gray-600">
                        {[
                          'Descargue la plantilla Word haciendo clic en "Descargar Plantilla"',
                          'Complete los campos requeridos y exporte el documento a PDF',
                          'Cargue el PDF diligenciado con "Subir al Expediente"',
                        ].map((step, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: '#2962FF' }}>
                              {i + 1}
                            </span>
                            <span dangerouslySetInnerHTML={{ __html: step.replace(/"([^"]+)"/g, '<strong>"$1"</strong>') }} />
                          </li>
                        ))}
                      </ol>
                    </div>
                  </Card>
                </div>

              ) : (
                /* ── Lista de plantillas ── */
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={busquedaPlantilla}
                      onChange={(e) => setBusquedaPlantilla(e.target.value)}
                      placeholder="Buscar plantilla por nombre..."
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {busquedaPlantilla && (
                      <button onClick={() => setBusquedaPlantilla('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filtros categoría */}
                  <div className="flex flex-wrap gap-2">
                    {CAT_PLANTILLAS.filter(cat => cat.id === 'todos' || conteoPorCatPlantilla(cat.id) > 0).map((cat) => {
                      const count = conteoPorCatPlantilla(cat.id);
                      const isActive = filtroPlantillaCategoria === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setFiltroPlantillaCategoria(cat.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2 ${
                            isActive ? 'text-white shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          style={isActive ? { background: cat.color, borderColor: cat.color } : {}}
                        >
                          {cat.label}
                          <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/25' : 'bg-gray-100'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {cargandoPlantillas ? (
                    <div className="flex items-center justify-center py-12 gap-3 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Cargando plantillas...</span>
                    </div>
                  ) : plantillasFiltradas.length === 0 ? (
                    <Card className="p-8 text-center border-2 border-dashed border-gray-300">
                      <Library className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <h4 className="font-bold text-lg text-gray-600 mb-2">Sin plantillas</h4>
                      <p className="text-sm text-gray-500">
                        {plantillas.length === 0
                          ? 'Aún no hay plantillas configuradas. Agréguelas desde Configuraciones → Plantillas.'
                          : 'No hay plantillas que coincidan con los filtros actuales'}
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {plantillasFiltradas.map((plantilla) => {
                        const cat = getCatPlantilla(plantilla.categoria);
                        return (
                          <Card
                            key={plantilla.id}
                            className="p-3.5 hover:shadow-md transition-all border border-gray-200 hover:border-blue-200 cursor-pointer"
                            onClick={() => setPlantillaDetalle(plantilla)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-lg flex-shrink-0 bg-blue-50">
                                <FileText className="w-5 h-5 text-blue-700" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm truncate">{plantilla.nombre}</h4>
                                <div className="flex items-center gap-2 flex-wrap mt-1">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: cat.color }}>
                                    {cat.label}
                                  </span>
                                  <span className="text-[10px] text-gray-400">{formatBytes(plantilla.tamano)}</span>
                                </div>
                              </div>

                              {/* Acciones rápidas */}
                              <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                  title="Descargar plantilla Word"
                                  onClick={() => handleDescargarPlantilla(plantilla)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                {onUploadDocument && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 gap-1"
                                    title="Subir PDF diligenciado al expediente"
                                    onClick={() => handleSubirAlExpediente(plantilla)}
                                    disabled={subiendoAlExpediente}
                                  >
                                    {subiendoAlExpediente
                                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      : <BookOpen className="w-3.5 h-3.5" />
                                    }
                                    Subir
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t px-5 py-3.5 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                <Library className="w-3.5 h-3.5 inline mr-1" />
                Gestionadas desde <span className="font-semibold" style={{ color: '#003DA5' }}>Configuraciones → Plantillas</span>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={cerrarModalPlantillas} className="font-semibold">
                  Cerrar
                </Button>
                {plantillaDetalle && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDescargarPlantilla(plantillaDetalle)}
                      className="font-semibold"
                      style={{ borderColor: '#003DA5', color: '#003DA5' }}
                    >
                      <Download className="w-4 h-4 mr-1.5" />
                      Descargar Plantilla
                    </Button>
                    {onUploadDocument && (
                      <Button
                        size="sm"
                        onClick={() => handleSubirAlExpediente(plantillaDetalle)}
                        className="font-semibold"
                        style={{ background: '#003DA5', color: '#FFFFFF' }}
                        disabled={subiendoAlExpediente}
                      >
                        {subiendoAlExpediente
                          ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                          : <BookOpen className="w-4 h-4 mr-1.5" />
                        }
                        Subir al Expediente
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
