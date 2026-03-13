/**
 * TabDocumentosExpediente - Tab de Documentos COMPARTIDO entre Defensa Judicial y Juzgamiento
 * ✅ 8 categorías con iconos/colores diferenciados
 * ✅ Filtros pill con conteo dinámico
 * ✅ Buscador integrado
 * ✅ Modal de subida unificado
 * ✅ Integración con Biblioteca de Plantillas (Configuraciones SIGL)
 * ✅ Usado por ModalExpediente.tsx y ModalProcesoDisciplinario.tsx
 */

import { useState } from 'react';
import {
  FolderOpen, Upload, Search, Download, Eye, X, FileText,
  Filter, Tag, User, File, BookOpen, Library, ArrowRight, Clock, Hash, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { ModalHeaderClean } from '../modulos/ModalHeaderClean';
import {
  CATEGORIAS_DOCUMENTOS,
  SUGERENCIAS_TIPO_DOCUMENTO,
  PLANTILLAS_BIBLIOTECA,
  type DocumentoExpediente,
  type PlantillaDocumental
} from './expedienteShared';

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
  /** Contexto del módulo para filtrar plantillas relevantes */
  moduloContexto?: 'defensa-judicial' | 'juzgamiento';
}

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
  const [modalSubirDocumento, setModalSubirDocumento] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('documentos');
  const [nuevoTipoDocumento, setNuevoTipoDocumento] = useState('');

  // ✅ Estado para modal de Biblioteca de Plantillas
  const [modalPlantillas, setModalPlantillas] = useState(false);
  const [busquedaPlantilla, setBusquedaPlantilla] = useState('');
  const [filtroPlantillaCategoria, setFiltroPlantillaCategoria] = useState('todos');
  const [plantillaDetalle, setPlantillaDetalle] = useState<PlantillaDocumental | null>(null);

  // ==================== FILTRADO DOCUMENTOS ====================

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

  // ==================== FILTRADO PLANTILLAS ====================

  const plantillasFiltradas = PLANTILLAS_BIBLIOTECA.filter((p) => {
    const matchModulo = p.modulo === moduloContexto || p.modulo === 'ambos';
    const matchCategoria = filtroPlantillaCategoria === 'todos' || p.categoria === filtroPlantillaCategoria;
    const matchBusqueda = !busquedaPlantilla ||
      p.nombre.toLowerCase().includes(busquedaPlantilla.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(busquedaPlantilla.toLowerCase());
    return matchModulo && matchCategoria && matchBusqueda && p.activa;
  });

  const conteoPlantillaCategoria = (catId: string) => {
    const base = PLANTILLAS_BIBLIOTECA.filter(p =>
      (p.modulo === moduloContexto || p.modulo === 'ambos') && p.activa
    );
    if (catId === 'todos') return base.length;
    return base.filter(p => p.categoria === catId).length;
  };

  // ==================== HANDLERS DOCUMENTOS ====================

  const handleVerDocumento = (doc: DocumentoExpediente) => {
    if (onViewDocument) {
      onViewDocument(doc);
      return;
    }
    toast.info('Abriendo visor de documento', { description: doc.nombre });
  };

  const handleDescargarDocumento = (doc: DocumentoExpediente) => {
    if (onDownloadDocument) {
      onDownloadDocument(doc);
      return;
    }
    toast.success('Descarga iniciada', { description: `${doc.nombre} (${doc.tamaño})` });
  };

  const handleDescargarTodos = () => {
    if (onDownloadAll) {
      onDownloadAll();
      return;
    }
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

  const ejecutarSubidaDocumento = () => {
    if (!nuevoTipoDocumento.trim()) {
      toast.error('Tipo de documento requerido', {
        description: 'Debe indicar el tipo de documento a cargar'
      });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls,.zip,.rar,.7z,.pptx,.ppt,.csv,.txt,.rtf';

    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        if (onUploadDocument) {
          Promise.resolve(onUploadDocument(file, nuevaCategoria, nuevoTipoDocumento))
            .then(() => {
              setModalSubirDocumento(false);
              setNuevoTipoDocumento('');
              setNuevaCategoria('documentos');
              onHasChanges?.();
            })
            .catch(() => {
              // Error ya manejado en componente padre
            });
          return;
        }

        toast.loading('Subiendo documento...', {
          id: 'subir-documento-exp',
          duration: 2000
        });

        setTimeout(() => {
          const categoriaInfo = CATEGORIAS_DOCUMENTOS.find(c => c.id === nuevaCategoria);
          const nuevoDoc: DocumentoExpediente = {
            id: Date.now(),
            nombre: file.name,
            tamaño: file.size >= 1024 * 1024
              ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
              : `${(file.size / 1024).toFixed(0)} KB`,
            fecha: new Date().toLocaleDateString('es-CO'),
            tipo: nuevoTipoDocumento,
            firmante: profesionalAsignado || 'Oficina Jurídica',
            categoria: nuevaCategoria
          };

          setDocumentos(prev => [nuevoDoc, ...prev]);
          setModalSubirDocumento(false);
          setNuevoTipoDocumento('');
          setNuevaCategoria('documentos');
          onHasChanges?.();

          toast.success('Documento subido exitosamente', {
            id: 'subir-documento-exp',
            description: `${file.name} → ${categoriaInfo?.nombre || 'Documentos'} • ${nuevoTipoDocumento}`,
            duration: 4000
          });
        }, 2000);
      }
    };

    input.click();
  };

  // ==================== HANDLERS PLANTILLAS ====================

  const handleDescargarPlantilla = (plantilla: PlantillaDocumental) => {
    toast.loading(`Descargando plantilla...`, { id: `dl-plantilla-${plantilla.id}`, duration: 2000 });

    setTimeout(() => {
      toast.success('Plantilla descargada', {
        id: `dl-plantilla-${plantilla.id}`,
        description: `${plantilla.nombre}.${plantilla.formato.toLowerCase()} (${plantilla.tamaño})`,
        duration: 4000
      });
      // Segundo toast con instrucción
      setTimeout(() => {
        toast.info('Siguiente paso', {
          description: 'Complete la plantilla y cargue el documento diligenciado con "Subir Documento"',
          duration: 6000
        });
      }, 500);
    }, 1500);
  };

  const handleUsarPlantillaYSubir = (plantilla: PlantillaDocumental) => {
    // Pre-llenar el modal de subida con datos de la plantilla
    const catInfo = CATEGORIAS_DOCUMENTOS.find(c => c.id === plantilla.categoria);
    setNuevaCategoria(plantilla.categoria);
    setNuevoTipoDocumento(plantilla.nombre);
    setPlantillaDetalle(null);
    setModalPlantillas(false);
    setModalSubirDocumento(true);

    toast.info('Plantilla seleccionada', {
      description: `Suba el documento basado en: ${plantilla.nombre} → ${catInfo?.nombre || 'Documentos'}`,
      duration: 5000
    });
  };

  // ==================== RENDER ====================

  const moduloLabel = moduloContexto === 'defensa-judicial' ? 'Defensa Judicial' : 'Juzgamiento Disciplinario';
  const totalPlantillasDisponibles = PLANTILLAS_BIBLIOTECA.filter(p =>
    (p.modulo === moduloContexto || p.modulo === 'ambos') && p.activa
  ).length;

  return (
    <>
      <div className="space-y-3">
        {/* Header con búsqueda y botones */}
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
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => setModalPlantillas(true)}
              className="font-semibold"
              style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)', color: '#FFFFFF' }}
            >
              <Library className="w-4 h-4 mr-1.5" />
              Plantillas
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/25">
                {totalPlantillasDisponibles}
              </span>
            </Button>
            <Button
              size="sm"
              onClick={() => setModalSubirDocumento(true)}
              className="font-semibold"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              Subir Documento
            </Button>
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

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busquedaDocs}
            onChange={(e) => setBusquedaDocs(e.target.value)}
            placeholder="Buscar por nombre o tipo de documento..."
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {busquedaDocs && (
            <button
              onClick={() => setBusquedaDocs('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtros por categoría */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS_DOCUMENTOS.map((cat) => {
            const count = conteoCategoria(cat.id);
            const isActive = filtroDocTipo === cat.id;
            const IconComponent = cat.icono;
            return (
              <button
                key={cat.id}
                onClick={() => setFiltroDocTipo(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2 ${isActive
                  ? 'text-white shadow-md'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                style={isActive ? { background: cat.color, borderColor: cat.color } : {}}
              >
                <IconComponent className="w-3.5 h-3.5" />
                {cat.nombre}
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/25' : 'bg-gray-100'
                  }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lista de documentos */}
        {documentosFiltrados.length === 0 ? (
          <Card className="p-8 text-center border-2 border-dashed border-gray-300">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h4 className="font-bold text-lg text-gray-600 mb-2">
              Sin documentos {filtroDocTipo !== 'todos' ? `en "${CATEGORIAS_DOCUMENTOS.find(c => c.id === filtroDocTipo)?.nombre}"` : ''}
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              {busquedaDocs
                ? `No se encontraron resultados para "${busquedaDocs}"`
                : 'Sube el primer documento a esta categoría'}
            </p>
            {(busquedaDocs || filtroDocTipo !== 'todos') && (
              <Button
                variant="outline"
                onClick={() => { setBusquedaDocs(''); setFiltroDocTipo('todos'); }}
                className="font-semibold"
              >
                <X className="w-4 h-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-2">
            {documentosFiltrados.map((doc) => {
              const catInfo = CATEGORIAS_DOCUMENTOS.find(c => c.id === doc.categoria);
              const CatIcon = catInfo?.icono || File;
              return (
                <Card key={doc.id} className="p-3 hover:shadow-md transition-all border border-gray-200 hover:border-blue-200">
                  <div className="flex items-center gap-3">
                    {/* Icono de categoría */}
                    <div
                      className="p-2.5 rounded-lg flex-shrink-0"
                      style={{ background: `${catInfo?.color || '#6B7280'}12` }}
                    >
                      <CatIcon className="w-5 h-5" style={{ color: catInfo?.color || '#6B7280' }} />
                    </div>

                    {/* Info del documento */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-sm truncate">{doc.nombre}</h4>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                          style={{ background: catInfo?.color || '#6B7280' }}
                        >
                          {catInfo?.nombre || 'General'}
                        </span>
                        {doc.etapa && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                            style={{ background: '#0D9488' }}
                          >
                            {doc.etapa}
                          </span>
                        )}
                        {/* tipo ya se muestra en el badge de etapa */}
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

                    {/* Acciones */}
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                        onClick={() => handleVerDocumento(doc)}
                        title="Ver documento"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50"
                        onClick={() => handleDescargarDocumento(doc)}
                        title="Descargar documento"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Resumen por categoría */}
        <Card className="p-4 bg-gray-50 border-2 border-gray-200 mt-2">
          <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Resumen por Categoría
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIAS_DOCUMENTOS.filter(c => c.id !== 'todos').map((cat) => {
              const count = conteoCategoria(cat.id);
              const CatIcon = cat.icono;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFiltroDocTipo(cat.id)}
                  className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-left"
                >
                  <CatIcon className="w-4 h-4 flex-shrink-0" style={{ color: cat.color }} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-700 truncate">{cat.nombre}</p>
                    <p className="text-lg font-black" style={{ color: cat.color }}>{count}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ✅ Banner de Plantillas Disponibles */}
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
                {totalPlantillasDisponibles} plantillas disponibles • Descargue, complete y cargue al expediente
              </p>
            </div>
            <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: '#2962FF' }} />
          </div>
        </Card>
      </div>

      {/* ==================== MODAL: SUBIR DOCUMENTO ==================== */}
      {modalSubirDocumento && (
        <Dialog open={modalSubirDocumento} onOpenChange={setModalSubirDocumento}>
          <DialogContent hideCloseButton className="w-[95vw] max-w-[1100px] lg:max-w-5xl !max-h-[82vh] flex flex-col p-0">
            <DialogTitle className="sr-only">Subir Documento</DialogTitle>
            <DialogDescription className="sr-only">
              Formulario para subir un nuevo documento al expediente {expedienteId}
            </DialogDescription>

            <ModalHeaderClean
              titulo="Subir Documento"
              subtitulo={`Expediente ${expedienteId} • Seleccione categoría y tipo`}
              icono={Upload}
              colorIcono="blue"
              onClose={() => setModalSubirDocumento(false)}
            />

            <div className="p-6 space-y-5">
              {/* Categoría del documento */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  <Tag className="w-4 h-4 inline mr-1.5" />
                  Categoría del Documento *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIAS_DOCUMENTOS.filter(c => c.id !== 'todos').map((cat) => {
                    const isSelected = nuevaCategoria === cat.id;
                    const CatIcon = cat.icono;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setNuevaCategoria(cat.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center ${isSelected
                          ? 'shadow-md text-white'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        style={isSelected ? { background: cat.color, borderColor: cat.color } : {}}
                      >
                        <CatIcon className="w-5 h-5" />
                        <span className="text-xs font-bold">{cat.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tipo de documento */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1.5" />
                  Tipo de Documento *
                </label>
                <input
                  type="text"
                  value={nuevoTipoDocumento}
                  onChange={(e) => setNuevoTipoDocumento(e.target.value)}
                  placeholder="Ej: Demanda, Acta de Audiencia, Oficio de Citación..."
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {/* Sugerencias según categoría */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(SUGERENCIAS_TIPO_DOCUMENTO[nuevaCategoria] || []).map((sug) => (
                    <button
                      key={sug}
                      onClick={() => setNuevoTipoDocumento(sug)}
                      className="px-2 py-1 text-[11px] font-semibold bg-gray-100 text-gray-600 rounded-md border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info de la categoría seleccionada */}
              {(() => {
                const catInfo = CATEGORIAS_DOCUMENTOS.find(c => c.id === nuevaCategoria);
                if (!catInfo) return null;
                const CatIcon = catInfo.icono;
                return (
                  <Card className="p-3 border-2" style={{ borderColor: `${catInfo.color}40`, background: `${catInfo.color}08` }}>
                    <div className="flex items-center gap-2">
                      <CatIcon className="w-5 h-5" style={{ color: catInfo.color }} />
                      <div>
                        <p className="text-sm font-bold" style={{ color: catInfo.color }}>
                          Se archivará en: {catInfo.nombre}
                        </p>
                        <p className="text-xs text-gray-600">
                          Formatos aceptados: PDF, DOC, DOCX, JPG, PNG, XLS, XLSX, ZIP, RAR, PPTX, CSV, TXT
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })()}
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setModalSubirDocumento(false);
                  setNuevoTipoDocumento('');
                  setNuevaCategoria('documentos');
                }}
                className="font-semibold"
              >
                Cancelar
              </Button>
              <Button
                onClick={ejecutarSubidaDocumento}
                className="font-semibold"
                style={{ background: '#003DA5', color: '#FFFFFF' }}
                disabled={!nuevoTipoDocumento.trim()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Seleccionar Archivo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ==================== MODAL: BIBLIOTECA DE PLANTILLAS ==================== */}
      {modalPlantillas && (
        <Dialog open={modalPlantillas} onOpenChange={setModalPlantillas}>
          <DialogContent hideCloseButton className="w-[95vw] max-w-[1100px] lg:max-w-5xl !max-h-[82vh] flex flex-col p-0" style={{ '--modal-h-sm': '85vh' } as React.CSSProperties}>
            <DialogTitle className="sr-only">Biblioteca de Plantillas</DialogTitle>
            <DialogDescription className="sr-only">
              Plantillas documentales disponibles para {moduloLabel}
            </DialogDescription>

            <ModalHeaderClean
              titulo="Biblioteca de Plantillas"
              subtitulo={`${moduloLabel} • ${totalPlantillasDisponibles} plantillas disponibles • Expediente ${expedienteId}`}
              icono={Library}
              colorIcono="blue"
              onClose={() => {
                setModalPlantillas(false);
                setPlantillaDetalle(null);
                setBusquedaPlantilla('');
                setFiltroPlantillaCategoria('todos');
              }}
            />

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Detalle de plantilla seleccionada */}
              {plantillaDetalle ? (
                <div className="space-y-4">
                  {/* Botón volver */}
                  <button
                    onClick={() => setPlantillaDetalle(null)}
                    className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    Volver al listado
                  </button>

                  {/* Card detalle */}
                  <Card className="p-0 border-2 border-blue-200 overflow-hidden">
                    {/* Header con gradiente */}
                    <div className="p-5" style={{ background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' }}>
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/15 rounded-xl">
                          <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1 text-white">
                          <h3 className="font-black text-lg">{plantillaDetalle.nombre}</h3>
                          <p className="text-sm text-blue-100 mt-1">{plantillaDetalle.descripcion}</p>
                          <div className="flex items-center gap-3 mt-3 flex-wrap">
                            {(() => {
                              const catInfo = CATEGORIAS_DOCUMENTOS.find(c => c.id === plantillaDetalle.categoria);
                              return catInfo ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                                  {catInfo.nombre}
                                </span>
                              ) : null;
                            })()}
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                              {plantillaDetalle.modulo === 'ambos' ? 'Ambos Módulos' :
                                plantillaDetalle.modulo === 'defensa-judicial' ? 'Defensa Judicial' : 'Juzgamiento'}
                            </span>
                            <span className="text-xs text-blue-200">
                              v{plantillaDetalle.version} • {plantillaDetalle.formato}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Métricas */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <FileText className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                        <p className="font-black text-lg" style={{ color: '#003DA5' }}>{plantillaDetalle.formato}</p>
                        <p className="text-[10px] text-gray-500">Formato</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Hash className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                        <p className="font-black text-lg text-purple-700">v{plantillaDetalle.version}</p>
                        <p className="text-[10px] text-gray-500">Versión</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Download className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                        <p className="font-black text-lg text-emerald-700">{plantillaDetalle.descargas}</p>
                        <p className="text-[10px] text-gray-500">Descargas</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Clock className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                        <p className="font-black text-sm text-amber-700">{plantillaDetalle.fechaActualizacion}</p>
                        <p className="text-[10px] text-gray-500">Actualizada</p>
                      </div>
                    </div>

                    {/* Info adicional */}
                    <div className="px-5 pb-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Autor:</span>
                        <span className="font-semibold text-gray-800">{plantillaDetalle.autor}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <File className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Tamaño:</span>
                        <span className="font-semibold text-gray-800">{plantillaDetalle.tamaño}</span>
                      </div>
                    </div>

                    {/* Instrucciones de uso */}
                    <div className="mx-5 mb-5 p-4 rounded-lg border-2 border-blue-100" style={{ background: '#2962FF08' }}>
                      <h4 className="font-bold text-sm mb-2" style={{ color: '#003DA5' }}>
                        Instrucciones de Uso
                      </h4>
                      <ol className="space-y-1.5 text-xs text-gray-600">
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: '#2962FF' }}>1</span>
                          <span>Descargue la plantilla haciendo clic en <strong>"Descargar Plantilla"</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: '#2962FF' }}>2</span>
                          <span>Complete los campos requeridos en el documento descargado</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: '#2962FF' }}>3</span>
                          <span>Cargue el documento diligenciado con <strong>"Subir al Expediente"</strong> — se clasificará automáticamente en la categoría correcta</span>
                        </li>
                      </ol>
                    </div>
                  </Card>
                </div>
              ) : (
                <>
                  {/* Barra de búsqueda plantillas */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={busquedaPlantilla}
                      onChange={(e) => setBusquedaPlantilla(e.target.value)}
                      placeholder="Buscar plantilla por nombre o descripción..."
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {busquedaPlantilla && (
                      <button
                        onClick={() => setBusquedaPlantilla('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filtros categoría plantillas */}
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIAS_DOCUMENTOS.map((cat) => {
                      const count = conteoPlantillaCategoria(cat.id);
                      const isActive = filtroPlantillaCategoria === cat.id;
                      const IconComponent = cat.icono;
                      if (cat.id !== 'todos' && count === 0) return null;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setFiltroPlantillaCategoria(cat.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2 ${isActive
                            ? 'text-white shadow-md'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          style={isActive ? { background: cat.color, borderColor: cat.color } : {}}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                          {cat.nombre}
                          <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/25' : 'bg-gray-100'
                            }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Conteo */}
                  <p className="text-xs text-gray-500 font-semibold">
                    {plantillasFiltradas.length} plantilla{plantillasFiltradas.length !== 1 ? 's' : ''} encontrada{plantillasFiltradas.length !== 1 ? 's' : ''}
                  </p>

                  {/* Lista de plantillas */}
                  {plantillasFiltradas.length === 0 ? (
                    <Card className="p-8 text-center border-2 border-dashed border-gray-300">
                      <Library className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <h4 className="font-bold text-lg text-gray-600 mb-2">Sin plantillas</h4>
                      <p className="text-sm text-gray-500">
                        No hay plantillas que coincidan con los filtros actuales
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {plantillasFiltradas.map((plantilla) => {
                        const catInfo = CATEGORIAS_DOCUMENTOS.find(c => c.id === plantilla.categoria);
                        return (
                          <Card
                            key={plantilla.id}
                            className="p-3.5 hover:shadow-md transition-all border border-gray-200 hover:border-blue-200 cursor-pointer"
                            onClick={() => setPlantillaDetalle(plantilla)}
                          >
                            <div className="flex items-center gap-3">
                              {/* Icono formato */}
                              <div className="p-2.5 rounded-lg flex-shrink-0 bg-blue-50">
                                <FileText className="w-5 h-5 text-blue-700" />
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm truncate">{plantilla.nombre}</h4>
                                <p className="text-xs text-gray-500 truncate mt-0.5">{plantilla.descripcion}</p>
                                <div className="flex items-center gap-2 flex-wrap mt-1.5">
                                  <span
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                    style={{ background: catInfo?.color || '#6B7280' }}
                                  >
                                    {catInfo?.nombre || 'General'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                                    {plantilla.modulo === 'ambos' ? 'Ambos Módulos' :
                                      plantilla.modulo === 'defensa-judicial' ? 'Defensa Judicial' : 'Juzgamiento'}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {plantilla.formato} • {plantilla.tamaño} • v{plantilla.version}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    • {plantilla.descargas} descargas
                                  </span>
                                </div>
                              </div>

                              {/* Botón descargar rápido */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 w-9 p-0 text-blue-600 hover:bg-blue-50 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDescargarPlantilla(plantilla);
                                }}
                                title="Descargar plantilla"
                              >
                                <Download className="w-4.5 h-4.5" />
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer del modal */}
            <div className="sticky bottom-0 bg-white border-t px-5 py-3.5 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                <Library className="w-3.5 h-3.5 inline mr-1" />
                Plantillas gestionadas desde <span className="font-semibold" style={{ color: '#003DA5' }}>Configuraciones SIGL</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setModalPlantillas(false);
                    setPlantillaDetalle(null);
                    setBusquedaPlantilla('');
                    setFiltroPlantillaCategoria('todos');
                  }}
                  className="font-semibold"
                >
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
                    <Button
                      size="sm"
                      onClick={() => handleUsarPlantillaYSubir(plantillaDetalle)}
                      className="font-semibold"
                      style={{ background: '#003DA5', color: '#FFFFFF' }}
                    >
                      <Upload className="w-4 h-4 mr-1.5" />
                      Subir al Expediente
                    </Button>
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
