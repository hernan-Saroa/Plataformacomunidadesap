/**
 * RF005 - GESTIÓN DOCUMENTAL Y EXPEDIENTE ELECTRÓNICO
 * Sistema completo de gestión de expedientes con índice electrónico, versiones y auditoría
 * DISEÑO: Replicado del módulo Carpeta Digital para coherencia visual
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderOpen, FileText, Upload, Download, Eye, History,
  Link as LinkIcon, Calendar, User, Clock, CheckCircle,
  AlertCircle, File, FileCheck, Search, Filter, X,
  ChevronDown, ChevronRight, Trash2, Edit2, ExternalLink,
  Archive, Folder, Shield, Key, Copy, Share2, FileSignature,
  BarChart3, ZoomIn, RefreshCw, Package, Printer, Mail, Info, HelpCircle
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';
import { FlujoProcesoDisciplinario } from './FlujoProcesoDisciplinario';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interfaces
interface Documento {
  id: string;
  nombre: string;
  tipo: 'auto' | 'evidencia' | 'oficio' | 'notificacion' | 'acta' | 'otro';
  etapa: string;
  version: number;
  tamaño: string;
  fechaCarga: string;
  usuarioCarga: string;
  descripcion: string;
  url?: string;
  urlExterna?: string;
  versiones: VersionDocumento[];
  metadatos: {
    firmado?: boolean;
    notificado?: boolean;
    folios?: number;
  };
}

interface VersionDocumento {
  numero: number;
  fecha: string;
  usuario: string;
  cambios: string;
  tamaño: string;
}

interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
}

interface Proceso {
  id: string;
  numero: string;
  denunciado: Persona | string; // Permite ambos tipos para compatibilidad
  etapaActual: string;
  fechaInicio: string;
  estado: string;
}

interface ActividadAuditoria {
  id: string;
  tipo: 'carga' | 'descarga' | 'visualizacion' | 'modificacion' | 'eliminacion' | 'exportacion' | 'enlace_externo';
  usuario: string;
  fecha: string;
  documento: string;
  detalles: string;
}

// Mock Data
const PROCESOS_MOCK: Proceso[] = [
  {
    id: 'p1',
    numero: 'P-120-2025',
    denunciado: 'Juan Pérez Gómez',
    etapaActual: 'Indagación Preliminar',
    fechaInicio: '2025-01-03',
    estado: 'Activo'
  },
  {
    id: 'p2',
    numero: 'P-089-2024',
    denunciado: 'María González Castro',
    etapaActual: 'Valoración',
    fechaInicio: '2024-12-15',
    estado: 'Activo'
  },
  {
    id: 'p3',
    numero: 'P-156-2025',
    denunciado: 'Carlos Andrés Rodríguez',
    etapaActual: 'Investigación Formal',
    fechaInicio: '2025-01-10',
    estado: 'Activo'
  },
  {
    id: 'p4',
    numero: 'P-045-2024',
    denunciado: 'Ana María López Hernández',
    etapaActual: 'Descargos',
    fechaInicio: '2024-11-20',
    estado: 'Activo'
  },
  {
    id: 'p5',
    numero: 'P-198-2025',
    denunciado: 'Jorge Luis Martínez Sánchez',
    etapaActual: 'Noticia',
    fechaInicio: '2025-01-15',
    estado: 'Activo'
  },
  {
    id: 'p6',
    numero: 'P-023-2024',
    denunciado: 'Diana Patricia Torres',
    etapaActual: 'Cierre',
    fechaInicio: '2024-10-05',
    estado: 'Archivado'
  }
];

const DOCUMENTOS_MOCK: Documento[] = [
  {
    id: 'd1',
    nombre: 'Auto de Apertura Indagación Preliminar',
    tipo: 'auto',
    etapa: 'Indagación Preliminar',
    version: 3,
    tamaño: '245 KB',
    fechaCarga: '2025-01-08T14:30:00',
    usuarioCarga: 'Juan Carlos Pérez',
    descripcion: 'Auto de apertura firmado por el Jefe OCID',
    metadatos: {
      firmado: true,
      notificado: true,
      folios: 5
    },
    versiones: [
      {
        numero: 3,
        fecha: '2025-01-08T14:30:00',
        usuario: 'Juan Carlos Pérez',
        cambios: 'Corrección de fundamentación jurídica según observaciones del Jefe',
        tamaño: '245 KB'
      },
      {
        numero: 2,
        fecha: '2025-01-08T10:15:00',
        usuario: 'Juan Carlos Pérez',
        cambios: 'Ajuste de numerales y fechas',
        tamaño: '243 KB'
      },
      {
        numero: 1,
        fecha: '2025-01-07T16:00:00',
        usuario: 'Juan Carlos Pérez',
        cambios: 'Versión inicial',
        tamaño: '240 KB'
      }
    ]
  },
  {
    id: 'd2',
    nombre: 'Noticia Disciplinaria ND-260',
    tipo: 'evidencia',
    etapa: 'Noticia',
    version: 1,
    tamaño: '1.2 MB',
    fechaCarga: '2025-01-03T09:00:00',
    usuarioCarga: 'Sistema',
    descripcion: 'Queja inicial presentada por denunciante',
    metadatos: {
      folios: 3
    },
    versiones: [
      {
        numero: 1,
        fecha: '2025-01-03T09:00:00',
        usuario: 'Sistema',
        cambios: 'Carga inicial desde formulario web',
        tamaño: '1.2 MB'
      }
    ]
  },
  {
    id: 'd3',
    nombre: 'Evidencias Testimoniales',
    tipo: 'evidencia',
    etapa: 'Indagación Preliminar',
    version: 1,
    tamaño: 'Externo',
    fechaCarga: '2025-01-05T11:30:00',
    usuarioCarga: 'María Torres',
    descripcion: 'Archivos de audio y video almacenados en Google Drive',
    urlExterna: 'https://drive.google.com/drive/folders/1a2b3c4d5e6f',
    metadatos: {},
    versiones: [
      {
        numero: 1,
        fecha: '2025-01-05T11:30:00',
        usuario: 'María Torres',
        cambios: 'Enlace a carpeta de Google Drive con testimonios grabados',
        tamaño: 'Externo'
      }
    ]
  },
  {
    id: 'd4',
    nombre: 'Constancia de Notificación Personal',
    tipo: 'notificacion',
    etapa: 'Indagación Preliminar',
    version: 1,
    tamaño: '180 KB',
    fechaCarga: '2025-01-09T15:45:00',
    usuarioCarga: 'Secretaría OCID',
    descripcion: 'Acta de notificación personal firmada por el investigado',
    metadatos: {
      notificado: true,
      folios: 2
    },
    versiones: [
      {
        numero: 1,
        fecha: '2025-01-09T15:45:00',
        usuario: 'Secretaría OCID',
        cambios: 'Carga de acta firmada escaneada',
        tamaño: '180 KB'
      }
    ]
  }
];

const AUDITORIA_MOCK: ActividadAuditoria[] = [
  {
    id: 'a1',
    tipo: 'carga',
    usuario: 'Juan Carlos Pérez',
    fecha: '2025-01-08T14:30:00',
    documento: 'Auto de Apertura Indagación Preliminar',
    detalles: 'Versión 3 - 245 KB'
  },
  {
    id: 'a2',
    tipo: 'visualizacion',
    usuario: 'Jefe OCID',
    fecha: '2025-01-08T14:35:00',
    documento: 'Auto de Apertura Indagación Preliminar',
    detalles: 'Revisión en línea'
  },
  {
    id: 'a3',
    tipo: 'descarga',
    usuario: 'Secretaría OCID',
    fecha: '2025-01-08T15:00:00',
    documento: 'Auto de Apertura Indagación Preliminar',
    detalles: 'Descarga para notificación'
  },
  {
    id: 'a4',
    tipo: 'enlace_externo',
    usuario: 'María Torres',
    fecha: '2025-01-05T11:30:00',
    documento: 'Evidencias Testimoniales',
    detalles: 'Enlace a Google Drive agregado'
  },
  {
    id: 'a5',
    tipo: 'exportacion',
    usuario: 'Jefe OCID',
    fecha: '2025-01-09T10:00:00',
    documento: 'Expediente Completo P-120-2025',
    detalles: 'Exportación PDF con índice electrónico - 15 documentos'
  }
];

// Modal de Visor de Documentos
function ModalVisorDocumento({ 
  documento, 
  onClose 
}: { 
  documento: Documento;
  onClose: () => void;
}) {
  const [versionSeleccionada, setVersionSeleccionada] = useState(documento.version);
  const [viendoPDF, setViendoPDF] = useState(false);

  const handleDescargarVersion = () => {
    const versionData = documento.versiones.find(v => v.numero === versionSeleccionada);
    
    toast.success('Descarga Iniciada', {
      description: `Descargando versión ${versionSeleccionada} de ${documento.nombre}`
    });

    // Simular descarga del documento
    const link = document.createElement('a');
    link.href = '#';
    link.download = `${documento.nombre}_v${versionSeleccionada}.pdf`;
    
    // Registrar actividad de descarga
    setTimeout(() => {
      toast.info('Descarga Completada', {
        description: `${documento.nombre} (Versión ${versionSeleccionada}) - ${versionData?.tamaño || documento.tamaño}`
      });
    }, 1000);
  };

  const handleVerPDF = () => {
    setViendoPDF(true);
    toast.success('Abriendo Visor PDF', {
      description: `Cargando versión ${versionSeleccionada} del documento`
    });
    
    // Simular apertura de visor PDF
    setTimeout(() => {
      toast.info('Documento Listo', {
        description: 'El visor PDF está listo. En producción, se abriría el documento completo.'
      });
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                    {documento.nombre}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Versión {versionSeleccionada} de {documento.version}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <Badge>{documento.tipo}</Badge>
                <Badge className="bg-purple-100 text-purple-700">{documento.etapa}</Badge>
                {documento.metadatos.firmado && (
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    ✓ Firmado
                  </Badge>
                )}
                {documento.metadatos.notificado && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                    ✓ Notificado
                  </Badge>
                )}
              </div>
            </div>

            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 240px)' }}>
          {/* Vista previa del PDF si está activa */}
          {viendoPDF && (
            <Card className="p-8 mb-6 bg-gray-100 border-2 border-dashed border-gray-300">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-bold text-gray-700 mb-2">
                  Vista Previa del Documento
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  {documento.nombre} - Versión {versionSeleccionada}
                </p>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-700">
                    🔍 En producción, aquí se mostraría el visor PDF completo con el documento.
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Se puede integrar con bibliotecas como React-PDF o PDF.js
                  </p>
                </div>
                <Button 
                  onClick={() => setViendoPDF(false)}
                  className="mt-4 bg-gray-500"
                >
                  Cerrar Vista Previa
                </Button>
              </div>
            </Card>
          )}

          {/* Información del Documento */}
          <Card className="p-4 mb-6 bg-gray-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Usuario Carga</p>
                <p className="font-semibold text-gray-900">{documento.usuarioCarga}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Fecha Carga</p>
                <p className="font-semibold text-gray-900">
                  {new Date(documento.fechaCarga).toLocaleString('es-CO')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Tamaño</p>
                <p className="font-semibold text-gray-900">{documento.tamaño}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Folios</p>
                <p className="font-semibold text-gray-900">
                  {documento.metadatos.folios || 'N/A'}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-600 mb-1">Descripción</p>
              <p className="text-sm text-gray-700">{documento.descripcion}</p>
            </div>
          </Card>

          {/* Enlace Externo */}
          {documento.urlExterna && (
            <Card className="p-4 mb-6 bg-orange-50 border-orange-200">
              <div className="flex items-start gap-3">
                <LinkIcon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">Enlace Externo</p>
                  <a
                    href={documento.urlExterna}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {documento.urlExterna}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </Card>
          )}

          {/* Historial de Versiones */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <History className="w-5 h-5" />
              Historial de Versiones
            </h3>
            <div className="space-y-3">
              {documento.versiones.map((version) => (
                <Card
                  key={version.numero}
                  className={`p-4 cursor-pointer border-l-4 transition-all ${
                    versionSeleccionada === version.numero
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                  onClick={() => setVersionSeleccionada(version.numero)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ background: '#003DA5' }}
                    >
                      v{version.numero}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{version.cambios}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {version.usuario} • {new Date(version.fecha).toLocaleString('es-CO')} • {version.tamaño}
                      </p>
                    </div>
                    {versionSeleccionada === version.numero && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <Button 
            onClick={handleDescargarVersion}
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar Versión {versionSeleccionada}
          </Button>
          <Button 
            onClick={handleVerPDF}
            className="bg-purple-600"
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver PDF
          </Button>
          <Button onClick={onClose} className="bg-gray-500 ml-auto">
            Cerrar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Modal de Subir Documento
function ModalSubirDocumento({ 
  procesoId, 
  onClose, 
  onConfirm 
}: { 
  procesoId: string;
  onClose: () => void;
  onConfirm: (doc: any) => void;
}) {
  const [nombreDocumento, setNombreDocumento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<Documento['tipo']>('auto');
  const [etapa, setEtapa] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [usarEnlaceExterno, setUsarEnlaceExterno] = useState(false);
  const [urlExterna, setUrlExterna] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleConfirmar = () => {
    if (!nombreDocumento.trim()) {
      toast.error('Campo Requerido', { description: 'Ingrese el nombre del documento' });
      return;
    }
    if (!usarEnlaceExterno && !archivo) {
      toast.error('Archivo Requerido', { description: 'Seleccione un archivo para cargar' });
      return;
    }
    if (usarEnlaceExterno && !urlExterna.trim()) {
      toast.error('URL Requerida', { description: 'Ingrese la URL del enlace externo' });
      return;
    }

    onConfirm({
      nombre: nombreDocumento,
      tipo: tipoDocumento,
      etapa,
      descripcion,
      archivo,
      urlExterna: usarEnlaceExterno ? urlExterna : undefined
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Upload className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Cargar Documento</h3>
              <p className="text-sm text-gray-600">Agregar documento al expediente electrónico</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Nombre del Documento <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={nombreDocumento}
              onChange={(e) => setNombreDocumento(e.target.value)}
              placeholder="Ej: Auto de Apertura de Investigación"
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Tipo de Documento <span className="text-red-600">*</span>
            </label>
            <select
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value as Documento['tipo'])}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto">Auto</option>
              <option value="evidencia">Evidencia</option>
              <option value="oficio">Oficio</option>
              <option value="notificacion">Constancia de Notificación</option>
              <option value="acta">Acta</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {/* Etapa */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Etapa Procesal <span className="text-red-600">*</span>
            </label>
            <select
              value={etapa}
              onChange={(e) => setEtapa(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione...</option>
              <option value="Noticia">Noticia Disciplinaria</option>
              <option value="Valoración">Valoración</option>
              <option value="Indagación Preliminar">Indagación Preliminar</option>
              <option value="Investigación Formal">Investigación Formal</option>
              <option value="Descargos">Descargos</option>
              <option value="Cierre">Cierre de Investigación</option>
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describa brevemente el contenido del documento..."
              className="w-full h-24 p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Opción: Enlace Externo */}
          <Card className="p-4 bg-gray-50">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={usarEnlaceExterno}
                onChange={(e) => setUsarEnlaceExterno(e.target.checked)}
                className="w-4 h-4"
              />
              <label className="font-semibold text-gray-900">
                Usar enlace externo (Google Drive, OneDrive, etc.)
              </label>
            </div>
            {usarEnlaceExterno && (
              <input
                type="url"
                value={urlExterna}
                onChange={(e) => setUrlExterna(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full p-3 border-2 border-gray-300 rounded-lg"
              />
            )}
          </Card>

          {/* Archivo Local */}
          {!usarEnlaceExterno && (
            <div
              className={`relative w-full h-32 border-2 border-gray-300 rounded-lg flex items-center justify-center cursor-pointer ${
                dragActive ? 'bg-gray-100' : ''
              }`}
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  setArchivo(files[0]);
                }
              }}
            >
              {archivo ? (
                <p className="text-sm text-gray-600">
                  Seleccionado: {archivo.name} ({(archivo.size / 1024).toFixed(0)} KB)
                </p>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-gray-600" />
                  <p className="text-sm text-gray-600">Arrastre y suelte un archivo aquí</p>
                  <p className="text-xs text-gray-500">o haga clic para seleccionar</p>
                </div>
              )}
              <input
                type="file"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <Button onClick={handleConfirmar} style={{ background: '#10B981', color: '#FFFFFF' }}>
            <Upload className="w-4 h-4 mr-2" />
            Cargar Documento
          </Button>
          <Button onClick={onClose} className="bg-gray-500">
            Cancelar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Componente Principal
export function ExpedienteElectronico() {
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<Proceso | null>(PROCESOS_MOCK[0]);
  const [documentos, setDocumentos] = useState<Documento[]>(DOCUMENTOS_MOCK);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [showModalVisor, setShowModalVisor] = useState(false);
  const [showModalSubir, setShowModalSubir] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<Documento | null>(null);
  const [vistaActual, setVistaActual] = useState<'documentos' | 'indice' | 'auditoria'>('documentos');
  const [showModalFlujo, setShowModalFlujo] = useState(false);
  
  // Estados para el buscador de procesos
  const [procesoSearchQuery, setProcesoSearchQuery] = useState('');
  const [showProcesoDropdown, setShowProcesoDropdown] = useState(false);
  const [procesosRecientes, setProcesosRecientes] = useState<Proceso[]>([PROCESOS_MOCK[0], PROCESOS_MOCK[1]]);

  const handleVerDocumento = (doc: Documento) => {
    setDocumentoSeleccionado(doc);
    setShowModalVisor(true);
    
    // Registrar visualización en auditoría
    toast.success('Documento Visualizado', {
      description: 'Actividad registrada en auditoría'
    });
  };

  const handleSubirDocumento = (docData: any) => {
    setShowModalSubir(false);
    toast.success('Documento Cargado', {
      description: `${docData.nombre} ha sido agregado al expediente`
    });
  };

  const handleExportarExpediente = () => {
    if (!procesoSeleccionado) {
      toast.error('Proceso no seleccionado', {
        description: 'Debe seleccionar un proceso para exportar el expediente'
      });
      return;
    }

    if (documentos.length === 0) {
      toast.warning('Expediente vacío', {
        description: 'No hay documentos en este expediente para exportar'
      });
      return;
    }

    const toastId = toast.loading('Generando Expediente PDF...', {
      description: '📋 Recopilando información del proceso\n📄 Generando índice electrónico\n⏳ Por favor espere...'
    });

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // PORTADA DEL EXPEDIENTE
    doc.setFillColor(0, 61, 165);
    doc.rect(0, 0, pageWidth, 80, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('EXPEDIENTE ELECTRÓNICO', pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Oficina de Control Interno Disciplinario - OCID', pageWidth / 2, 45, { align: 'center' });
    doc.text('ESAP - Escuela Superior de Administración Pública', pageWidth / 2, 55, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL PROCESO', 14, 95);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Número de Proceso: ${procesoSeleccionado?.numero || 'N/A'}`, 14, 105);
    doc.text(`Etapa Actual: ${procesoSeleccionado?.etapaActual || procesoSeleccionado?.etapa || 'N/A'}`, 14, 113);
    doc.text(`Estado: ${procesoSeleccionado?.estado || procesoSeleccionado?.estadoActual || 'En Gestión'}`, 14, 121);
    doc.text(`Fecha de Inicio: ${procesoSeleccionado?.fechaInicio || procesoSeleccionado?.fechaCreacion || 'N/A'}`, 14, 129);

    doc.setFont('helvetica', 'bold');
    doc.text('DENUNCIANTE', 14, 142);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${procesoSeleccionado?.denunciante?.nombre || procesoSeleccionado?.denuncianteNombre || 'N/A'}`, 14, 150);
    doc.text(`${procesoSeleccionado?.denunciante?.tipoIdentificacion || 'CC'}: ${procesoSeleccionado?.denunciante?.numeroIdentificacion || 'N/A'}`, 14, 158);

    doc.setFont('helvetica', 'bold');
    doc.text('DENUNCIADO', 14, 171);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${procesoSeleccionado?.denunciado?.nombre || procesoSeleccionado?.denunciadoNombre || procesoSeleccionado?.denunciado || 'N/A'}`, 14, 179);
    doc.text(`${procesoSeleccionado?.denunciado?.tipoIdentificacion || 'CC'}: ${procesoSeleccionado?.denunciado?.numeroIdentificacion || procesoSeleccionado?.cedula || 'N/A'}`, 14, 187);

    doc.setFont('helvetica', 'bold');
    doc.text('PROFESIONAL ASIGNADO', 14, 200);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${procesoSeleccionado?.profesionalAsignado?.nombre || procesoSeleccionado?.profesional || 'N/A'}`, 14, 208);
    doc.text(`${procesoSeleccionado?.profesionalAsignado?.tipoIdentificacion || 'CC'}: ${procesoSeleccionado?.profesionalAsignado?.numeroIdentificacion || 'N/A'}`, 14, 216);

    doc.setFont('helvetica', 'bold');
    doc.text('ESTADÍSTICAS DEL EXPEDIENTE', 14, 229);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de Documentos: ${metrics.totalDocumentos}`, 14, 239);
    doc.text(`Autos: ${metrics.autos} | Evidencias: ${metrics.evidencias} | Oficios: ${metrics.oficios}`, 14, 247);
    doc.text(`Actas: ${metrics.actas} | Notificaciones: ${metrics.notificaciones}`, 14, 255);
    doc.text(`Firmados: ${metrics.firmados} | Notificados: ${metrics.notificados}`, 14, 263);

    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generado el: ${new Date().toLocaleString('es-CO')}`, 14, 280);

    // PÁGINA 2: ÍNDICE
    doc.addPage();
    doc.setFillColor(0, 61, 165);
    doc.rect(0, 0, pageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`EXPEDIENTE ${procesoSeleccionado?.numero || ''}`, 14, 10);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('ÍNDICE ELECTRÓNICO', 14, 25);

    autoTable(doc, {
      startY: 35,
      head: [['Folio', 'Documento', 'Tipo', 'Etapa', 'Fecha', 'Usuario']],
      body: documentos.map((d, index) => [
        String(index + 1).padStart(3, '0'),
        d.nombre,
        d.tipo.toUpperCase(),
        d.etapa,
        new Date(d.fechaCarga).toLocaleDateString('es-CO'),
        d.usuarioCarga
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 61, 165], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { left: 14, right: 14 }
    });

    // PÁGINA 3: DETALLES
    doc.addPage();
    doc.setFillColor(0, 61, 165);
    doc.rect(0, 0, pageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`EXPEDIENTE ${procesoSeleccionado?.numero || ''}`, 14, 10);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE DOCUMENTOS', 14, 25);

    let yPos = 35;
    documentos.forEach((d, i) => {
      if (yPos > 240) {
        doc.addPage();
        doc.setFillColor(0, 61, 165);
        doc.rect(0, 0, pageWidth, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(`EXPEDIENTE ${procesoSeleccionado?.numero || ''}`, 14, 10);
        yPos = 25;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 61, 165);
      doc.text(`${String(i + 1).padStart(3, '0')} - ${d.nombre}`, 14, yPos);
      yPos += 7;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Tipo: ${d.tipo.toUpperCase()} | Etapa: ${d.etapa} | V${d.version}`, 14, yPos);
      yPos += 5;
      doc.text(`Usuario: ${d.usuarioCarga} | ${new Date(d.fechaCarga).toLocaleString('es-CO')}`, 14, yPos);
      yPos += 5;
      
      let estado = [];
      if (d.metadatos.firmado) estado.push('✓ FIRMADO');
      if (d.metadatos.notificado) estado.push('✓ NOTIFICADO');
      if (estado.length > 0) {
        doc.setTextColor(0, 128, 0);
        doc.text(estado.join(' | '), 14, yPos);
        yPos += 5;
      }
      
      if (d.descripcion) {
        doc.setTextColor(60, 60, 60);
        const lines = doc.splitTextToSize(`Descripción: ${d.descripcion}`, pageWidth - 28);
        doc.text(lines, 14, yPos);
        yPos += (lines.length * 5);
      }
      
      doc.setDrawColor(200, 200, 200);
      doc.line(14, yPos + 2, pageWidth - 14, yPos + 2);
      yPos += 8;
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 285);
      doc.text(`Pág. ${i} de ${totalPages}`, pageWidth - 20, 285, { align: 'right' });
    }

    const nombreArchivo = `Expediente_${procesoSeleccionado?.numero || 'Completo'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(nombreArchivo);

    setTimeout(() => {
      toast.dismiss(toastId);
      toast.success('¡Expediente Exportado Exitosamente!', {
        description: `${nombreArchivo}\n📄 ${documentos.length} documentos incluidos\n📑 ${totalPages} páginas generadas\n✅ Incluye índice electrónico y detalles completos`,
        duration: 5000
      });
    }, 500);
  };

  const handleImprimirIndice = () => {
    if (!procesoSeleccionado) {
      toast.error('Proceso no seleccionado', {
        description: 'Debe seleccionar un proceso para imprimir el índice'
      });
      return;
    }

    if (documentos.length === 0) {
      toast.warning('Índice vacío', {
        description: 'No hay documentos en el índice para imprimir'
      });
      return;
    }

    toast.info('Preparando Impresión...', {
      description: 'Abriendo vista previa de impresión'
    });

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFillColor(0, 61, 165);
    doc.rect(0, 0, pageWidth, 90, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('ÍNDICE ELECTRÓNICO', pageWidth / 2, 35, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text('DEL EXPEDIENTE', pageWidth / 2, 48, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('OCID - ESAP', pageWidth / 2, 63, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PROCESO DISCIPLINARIO', 14, 105);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Número: ${procesoSeleccionado?.numero || 'N/A'}`, 14, 115);
    doc.text(`Denunciado: ${procesoSeleccionado?.denunciado || 'N/A'}`, 14, 123);
    doc.text(`Etapa: ${procesoSeleccionado?.etapaActual || 'N/A'}`, 14, 131);

    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN', 14, 145);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: ${metrics.totalDocumentos} documentos`, 14, 155);
    doc.text(`Autos: ${metrics.autos} | Evidencias: ${metrics.evidencias}`, 14, 163);

    autoTable(doc, {
      startY: 175,
      head: [['Folio', 'Documento', 'Tipo', 'Etapa', 'Fecha', 'Usuario', 'Estado']],
      body: documentos.map((d, i) => {
        let estado = [];
        if (d.metadatos.firmado) estado.push('✓F');
        if (d.metadatos.notificado) estado.push('✓N');
        return [
          String(i + 1).padStart(3, '0'),
          d.nombre,
          d.tipo.toUpperCase(),
          d.etapa,
          new Date(d.fechaCarga).toLocaleDateString('es-CO'),
          d.usuarioCarga,
          estado.join(' ')
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [0, 61, 165], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 60 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 30 },
        4: { cellWidth: 22 },
        5: { cellWidth: 28 },
        6: { cellWidth: 15, halign: 'center' }
      },
      margin: { left: 10, right: 10 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('✓F = Firmado | ✓N = Notificado', 14, finalY);

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.text(`${new Date().toLocaleString('es-CO')}`, 14, pageHeight - 10);
      doc.text(`Pág. ${i}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Convertir el PDF a blob y abrirlo en nueva ventana para imprimir
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Abrir en nueva ventana
    const printWindow = window.open(pdfUrl, '_blank');
    
    if (printWindow) {
      // Esperar a que se cargue el PDF y luego abrir el diálogo de impresión
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          toast.success('Diálogo de Impresión Abierto', {
            description: 'Índice Electrónico listo para imprimir'
          });
        }, 250);
      };
    } else {
      // Si no se puede abrir la ventana (bloqueador de pop-ups), descargar el archivo
      const nombreArchivo = `Indice_${procesoSeleccionado?.numero || 'Exp'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nombreArchivo);
      toast.warning('Ventana Bloqueada', {
        description: 'El archivo se ha descargado. Permite ventanas emergentes para imprimir directamente.'
      });
    }
  };
  
  const handleSeleccionarProceso = (proceso: Proceso) => {
    setProcesoSeleccionado(proceso);
    setProcesoSearchQuery('');
    setShowProcesoDropdown(false);
    
    // Agregar a recientes si no está
    if (!procesosRecientes.find(p => p.id === proceso.id)) {
      setProcesosRecientes([proceso, ...procesosRecientes.slice(0, 4)]);
    }
    
    toast.success('Proceso Seleccionado', {
      description: `${proceso.numero} - ${typeof proceso.denunciado === 'string' ? proceso.denunciado : proceso.denunciado.nombre}`
    });
  };

  // Filtrar procesos según búsqueda
  const procesosFiltrados = PROCESOS_MOCK.filter(p => {
    const query = procesoSearchQuery.toLowerCase();
    return (
      p.numero.toLowerCase().includes(query) ||
      p.denunciado.toLowerCase().includes(query) ||
      p.etapaActual.toLowerCase().includes(query) ||
      p.estado.toLowerCase().includes(query)
    );
  });

  const filteredDocumentos = documentos.filter(d => {
    const matchesSearch = 
      d.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTipo = filterTipo === 'all' || d.tipo === filterTipo;

    return matchesSearch && matchesTipo;
  });

  // Calcular métricas
  const metrics = {
    totalDocumentos: documentos.length,
    autos: documentos.filter(d => d.tipo === 'auto').length,
    evidencias: documentos.filter(d => d.tipo === 'evidencia').length,
    oficios: documentos.filter(d => d.tipo === 'oficio').length,
    actas: documentos.filter(d => d.tipo === 'acta').length,
    notificaciones: documentos.filter(d => d.tipo === 'notificacion').length,
    firmados: documentos.filter(d => d.metadatos.firmado).length,
    notificados: documentos.filter(d => d.metadatos.notificado).length
  };

  return (
    <div className="w-full max-w-full">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
        <button className="hover:text-blue-600">Backoffice</button>
        <ChevronRight className="w-4 h-4" />
        <button className="hover:text-blue-600">Control Interno Disciplinario</button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Expediente Electrónico</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Archive className="w-6 h-6" style={{ color: '#003DA5' }} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Expediente Electrónico</h1>
              <p className="text-sm text-gray-600">RF005 - Gestión Documental Completa</p>
            </div>
          </div>

          <button
            onClick={handleExportarExpediente}
            className="px-5 py-2.5 rounded-lg text-white font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 hover:scale-105"
            style={{ background: '#DC2626' }}
            title="Exportar expediente completo con índice electrónico"
          >
            <Package className="w-5 h-5" />
            Exportar Expediente PDF
          </button>
        </div>

        {/* Selector de Proceso - DESTACADO CON CARD NARANJA */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-lg p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900">
                Proceso Disciplinario
              </label>
              <p className="text-xs text-gray-600">Seleccione el proceso para ver su expediente electrónico</p>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              value={procesoSearchQuery}
              onChange={(e) => setProcesoSearchQuery(e.target.value)}
              placeholder="Buscar proceso..."
              className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white font-medium text-gray-900"
              onFocus={() => setShowProcesoDropdown(true)}
              onBlur={() => setTimeout(() => setShowProcesoDropdown(false), 200)}
            />
            {showProcesoDropdown && (
              <div className="absolute left-0 right-0 top-full z-10 bg-white border border-gray-300 rounded-b-lg shadow-lg max-h-40 overflow-y-auto">
                {procesosFiltrados.map(proceso => (
                  <div
                    key={proceso.id}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSeleccionarProceso(proceso)}
                  >
                    {proceso.numero} - {typeof proceso.denunciado === 'string' ? proceso.denunciado : proceso.denunciado.nombre} ({proceso.etapaActual})
                  </div>
                ))}
                {procesosFiltrados.length === 0 && (
                  <div className="px-4 py-2 text-gray-500">No se encontraron procesos</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Métricas del Proceso Seleccionado */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Documentos</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalDocumentos}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-blue-600">Autos</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.autos}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-purple-600">Evidencias</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{metrics.evidencias}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-green-600">Firmados</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{metrics.firmados}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-orange-600">Notificados</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{metrics.notificados}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-indigo-600">Notificaciones</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{metrics.notificaciones}</p>
          </div>
        </div>

        {/* Pestañas con Íconos destacados */}
        <div className="bg-white border border-gray-200 rounded-lg mb-6">
          <div className="flex gap-1 p-2">
            <button
              onClick={() => setVistaActual('documentos')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                vistaActual === 'documentos'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              Documentos ({filteredDocumentos.length})
            </button>
            <button
              onClick={() => setVistaActual('indice')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                vistaActual === 'indice'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Archive className="w-4 h-4" />
              Índice Electrónico
            </button>
            <button
              onClick={() => setVistaActual('auditoria')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                vistaActual === 'auditoria'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Shield className="w-4 h-4" />
              Auditoría ({AUDITORIA_MOCK.length})
            </button>
          </div>
        </div>

        {/* Filtros - Solo para vista Documentos */}
        {vistaActual === 'documentos' && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar documentos en este proceso..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">Todos los tipos</option>
              <option value="auto">Autos</option>
              <option value="evidencia">Evidencias</option>
              <option value="oficio">Oficios</option>
              <option value="notificacion">Notificaciones</option>
              <option value="acta">Actas</option>
              <option value="otro">Otros</option>
            </select>
            <button
              onClick={() => setShowModalSubir(true)}
              className="px-4 py-2.5 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              style={{ background: '#10B981' }}
            >
              <Upload className="w-4 h-4" />
              Cargar Documento
            </button>
          </div>
        )}
      </div>

      {/* Vista: Documentos - TABLA */}
      {vistaActual === 'documentos' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Etapa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDocumentos.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: doc.urlExterna ? '#FEF3C7' : '#DBEAFE' }}
                        >
                          {doc.urlExterna ? (
                            <LinkIcon className="w-5 h-5" style={{ color: '#F59E0B' }} />
                          ) : (
                            <FileText className="w-5 h-5" style={{ color: '#3B82F6' }} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.nombre}</p>
                          <p className="text-xs text-gray-500">{doc.tamaño}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="text-xs">{doc.tipo}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{doc.etapa}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{doc.usuarioCarga}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(doc.fechaCarga).toLocaleDateString('es-CO')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5">
                        {doc.metadatos.firmado && (
                          <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                            ✓ Firmado
                          </Badge>
                        )}
                        {doc.metadatos.notificado && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                            ✓ Notificado
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleVerDocumento(doc)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg hover:opacity-80 transition-opacity text-white"
                          style={{ background: '#003DA5' }}
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          Ver
                        </button>
                        <button
                          className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:opacity-80 transition-opacity"
                        >
                          <Download className="w-3.5 h-3.5 inline mr-1" />
                          Descargar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vista: Índice Electrónico */}
      {vistaActual === 'indice' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: '#003DA5' }}>
              Índice Electrónico del Expediente
            </h2>
            <button
              onClick={handleImprimirIndice}
              className="px-5 py-2.5 rounded-lg text-white font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 hover:scale-105"
              style={{ background: '#DC2626' }}
              title="Imprimir índice electrónico del expediente"
            >
              <Printer className="w-5 h-5" />
              Imprimir Índice
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left text-sm font-bold text-gray-900">Folio</th>
                  <th className="p-3 text-left text-sm font-bold text-gray-900">Documento</th>
                  <th className="p-3 text-left text-sm font-bold text-gray-900">Tipo</th>
                  <th className="p-3 text-left text-sm font-bold text-gray-900">Etapa</th>
                  <th className="p-3 text-left text-sm font-bold text-gray-900">Fecha</th>
                  <th className="p-3 text-left text-sm font-bold text-gray-900">Usuario</th>
                  <th className="p-3 text-left text-sm font-bold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((doc, index) => (
                  <tr key={doc.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-900 font-mono">{String(index + 1).padStart(3, '0')}</td>
                    <td className="p-3 text-sm text-gray-900">{doc.nombre}</td>
                    <td className="p-3"><Badge className="text-xs">{doc.tipo}</Badge></td>
                    <td className="p-3 text-sm text-gray-600">{doc.etapa}</td>
                    <td className="p-3 text-sm text-gray-600">
                      {new Date(doc.fechaCarga).toLocaleDateString('es-CO')}
                    </td>
                    <td className="p-3 text-sm text-gray-600">{doc.usuarioCarga}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleVerDocumento(doc)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vista: Auditoría */}
      {vistaActual === 'auditoria' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: '#003DA5' }}>
              Registro de Auditoría
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Últimas {AUDITORIA_MOCK.length} actividades</span>
            </div>
          </div>

          {AUDITORIA_MOCK.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No hay actividades registradas</p>
              <p className="text-sm text-gray-500 mt-2">
                Las actividades del expediente se registrarán automáticamente aquí
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {AUDITORIA_MOCK.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map((actividad) => (
              <div key={actividad.id} className="p-4 border-l-4 border-blue-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: '#E0EDFF' }}
                  >
                    {actividad.tipo === 'carga' && <Upload className="w-5 h-5" style={{ color: '#003DA5' }} />}
                    {actividad.tipo === 'descarga' && <Download className="w-5 h-5" style={{ color: '#003DA5' }} />}
                    {actividad.tipo === 'visualizacion' && <Eye className="w-5 h-5" style={{ color: '#003DA5' }} />}
                    {actividad.tipo === 'modificacion' && <Edit2 className="w-5 h-5" style={{ color: '#003DA5' }} />}
                    {actividad.tipo === 'enlace_externo' && <LinkIcon className="w-5 h-5" style={{ color: '#003DA5' }} />}
                    {actividad.tipo === 'exportacion' && <Package className="w-5 h-5" style={{ color: '#003DA5' }} />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{actividad.documento}</p>
                    <p className="text-sm text-gray-700 mt-1">{actividad.detalles}</p>
                    <p className="text-xs text-gray-600 mt-2">
                      {actividad.usuario} • {new Date(actividad.fecha).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <Badge 
                    className={
                      actividad.tipo === 'carga' ? 'bg-green-100 text-green-700 border-green-200' :
                      actividad.tipo === 'descarga' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      actividad.tipo === 'visualizacion' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      actividad.tipo === 'exportacion' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                      actividad.tipo === 'enlace_externo' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' :
                      'bg-gray-100 text-gray-700 border-gray-200'
                    }
                  >
                    {actividad.tipo === 'carga' ? 'Carga' :
                     actividad.tipo === 'descarga' ? 'Descarga' :
                     actividad.tipo === 'visualizacion' ? 'Visualización' :
                     actividad.tipo === 'exportacion' ? 'Exportación' :
                     actividad.tipo === 'enlace_externo' ? 'Enlace Externo' :
                     actividad.tipo === 'modificacion' ? 'Modificación' :
                     actividad.tipo}
                  </Badge>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      <AnimatePresence>
        {showModalVisor && documentoSeleccionado && (
          <ModalVisorDocumento
            documento={documentoSeleccionado}
            onClose={() => {
              setShowModalVisor(false);
              setDocumentoSeleccionado(null);
            }}
          />
        )}

        {showModalSubir && (
          <ModalSubirDocumento
            procesoId={procesoSeleccionado?.id || ''}
            onClose={() => setShowModalSubir(false)}
            onConfirm={handleSubirDocumento}
          />
        )}
        
        {showModalFlujo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModalFlujo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                  ¿Cómo funciona el Expediente Electrónico?
                </h2>
                <button
                  onClick={() => setShowModalFlujo(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                <FlujoProcesoDisciplinario />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Botón Flotante de Ayuda */}
      <button
        onClick={() => setShowModalFlujo(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-2xl hover:shadow-xl transition-all flex items-center justify-center z-40 group"
        style={{ background: '#003DA5' }}
        title="¿Cómo funciona el Expediente Electrónico?"
      >
        <HelpCircle className="w-7 h-7 text-white" />
        <span className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          ¿Cómo funciona?
        </span>
      </button>
    </div>
  );
}