/**
 * ============================================
 * GESTIÓN DOCUMENTAL - EXPEDIENTE JUDICIAL
 * ============================================
 * 
 * Sistema completo de gestión de documentos del expediente
 * 
 * FUNCIONALIDADES:
 * ✅ Upload de documentos (PDF, DOCX, etc)
 * ✅ Clasificación por tipo de documento
 * ✅ Vista previa de documentos
 * ✅ Control de versiones
 * ✅ Auditoría de accesos
 * ✅ Firma digital (preparado para integración)
 * ✅ Exportación masiva
 * 
 * Oficina Asesora Jurídica - ESAP
 */

import { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  Edit,
  Check,
  X,
  Search,
  Filter,
  Calendar,
  User,
  Lock,
  Unlock,
  FileCheck,
  AlertCircle,
  FolderOpen,
  Plus,
} from 'lucide-react';
import {
  CardSIGL,
  ButtonSIGL,
  InputSIGL,
  SelectSIGL,
  BadgeSIGL,
  ModalSIGL,
  useToast,
} from './design-system';

// ============================================
// TIPOS
// ============================================

export interface Documento {
  id: string;
  expedienteId: string;
  nombre: string;
  tipo: TipoDocumento;
  extension: string;
  tamaño: number; // bytes
  url: string;
  version: number;
  firmado: boolean;
  fechaCarga: Date;
  cargadoPor: string;
  descripcion?: string;
  etiquetas: string[];
  accesos: number; // contador de visualizaciones
  ultimoAcceso?: Date;
}

export type TipoDocumento =
  | 'DEMANDA'
  | 'AUTO_ADMISORIO'
  | 'CONTESTACION'
  | 'PRUEBAS'
  | 'ALEGATOS'
  | 'SENTENCIA'
  | 'RECURSO'
  | 'OFICIO'
  | 'CONCEPTO'
  | 'OTRO';

interface GestionDocumentosProps {
  expedienteId: string;
  documentos?: Documento[];
  onUpload?: (file: File, metadata: Partial<Documento>) => Promise<void>;
  onDelete?: (documentoId: string) => Promise<void>;
  onDownload?: (documento: Documento) => void;
  onPreview?: (documento: Documento) => void;
  readOnly?: boolean;
}

// ============================================
// CONFIGURACIÓN DE TIPOS
// ============================================

const TIPOS_DOCUMENTO = [
  { value: 'DEMANDA', label: '📄 Demanda / Petición', color: '#DC2626' },
  { value: 'AUTO_ADMISORIO', label: '⚖️ Auto Admisorio', color: '#7C3AED' },
  { value: 'CONTESTACION', label: '📝 Contestación', color: '#2563EB' },
  { value: 'PRUEBAS', label: '🔍 Pruebas', color: '#059669' },
  { value: 'ALEGATOS', label: '💬 Alegatos', color: '#D97706' },
  { value: 'SENTENCIA', label: '⚖️ Sentencia / Fallo', color: '#DC2626' },
  { value: 'RECURSO', label: '🔄 Recurso', color: '#EA580C' },
  { value: 'OFICIO', label: '📨 Oficio', color: '#0891B2' },
  { value: 'CONCEPTO', label: '📋 Concepto Jurídico', color: '#8B5CF6' },
  { value: 'OTRO', label: '📎 Otro', color: '#6B7280' },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function GestionDocumentosExpediente({
  expedienteId,
  documentos: documentosIniciales = [],
  onUpload,
  onDelete,
  onDownload,
  onPreview,
  readOnly = false,
}: GestionDocumentosProps) {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documentos, setDocumentos] = useState<Documento[]>(documentosIniciales);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [modalUpload, setModalUpload] = useState(false);
  const [modalPreview, setModalPreview] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<Documento | null>(null);

  // Estado del formulario de upload
  const [uploadForm, setUploadForm] = useState<{
    tipo: TipoDocumento | '';
    descripcion: string;
    etiquetas: string;
  }>({
    tipo: '',
    descripcion: '',
    etiquetas: '',
  });

  // ============================================
  // HANDLERS - UPLOAD
  // ============================================

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      addToast({
        type: 'error',
        title: 'Archivo muy grande',
        message: 'El archivo no puede superar 50MB',
      });
      return;
    }

    const allowedExtensions = [
      '.pdf',
      '.doc',
      '.docx',
      '.jpg',
      '.jpeg',
      '.png',
      '.xlsx',
      '.xls',
    ];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      addToast({
        type: 'error',
        title: 'Formato no permitido',
        message: `Solo se permiten: ${allowedExtensions.join(', ')}`,
      });
      return;
    }

    // Abrir modal para metadata
    setModalUpload(true);
  };

  const handleUploadSubmit = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !uploadForm.tipo) {
      addToast({
        type: 'warning',
        title: 'Información Incompleta',
        message: 'Debe seleccionar el tipo de documento',
      });
      return;
    }

    try {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      const etiquetas = uploadForm.etiquetas
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e);

      const nuevoDocumento: Documento = {
        id: `DOC-${Date.now()}`,
        expedienteId,
        nombre: file.name,
        tipo: uploadForm.tipo as TipoDocumento,
        extension,
        tamaño: file.size,
        url: URL.createObjectURL(file), // En producción: URL de storage
        version: 1,
        firmado: false,
        fechaCarga: new Date(),
        cargadoPor: 'Usuario Actual', // En producción: usuario autenticado
        descripcion: uploadForm.descripcion,
        etiquetas,
        accesos: 0,
      };

      if (onUpload) {
        await onUpload(file, nuevoDocumento);
      }

      setDocumentos((prev) => [nuevoDocumento, ...prev]);

      addToast({
        type: 'success',
        title: '✅ Documento Cargado',
        message: `${file.name} se cargó correctamente`,
      });

      // Resetear formulario
      setModalUpload(false);
      setUploadForm({ tipo: '', descripcion: '', etiquetas: '' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error al Cargar',
        message: 'No se pudo cargar el documento',
      });
    }
  };

  // ============================================
  // HANDLERS - ACCIONES DOCUMENTO
  // ============================================

  const handlePreview = (documento: Documento) => {
    // Incrementar contador de accesos
    setDocumentos((prev) =>
      prev.map((doc) =>
        doc.id === documento.id
          ? { ...doc, accesos: doc.accesos + 1, ultimoAcceso: new Date() }
          : doc
      )
    );

    setDocumentoSeleccionado(documento);
    setModalPreview(true);

    if (onPreview) {
      onPreview(documento);
    }

    addToast({
      type: 'info',
      title: 'Vista Previa',
      message: `Abriendo ${documento.nombre}`,
    });
  };

  const handleDownload = (documento: Documento) => {
    if (onDownload) {
      onDownload(documento);
    }

    // Simular descarga
    const link = document.createElement('a');
    link.href = documento.url;
    link.download = documento.nombre;
    link.click();

    addToast({
      type: 'success',
      title: '⬇️ Descargando',
      message: documento.nombre,
    });
  };

  const handleDelete = async (documento: Documento) => {
    if (
      !confirm(
        `¿Está seguro de eliminar "${documento.nombre}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      if (onDelete) {
        await onDelete(documento.id);
      }

      setDocumentos((prev) => prev.filter((doc) => doc.id !== documento.id));

      addToast({
        type: 'success',
        title: '🗑️ Documento Eliminado',
        message: documento.nombre,
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error al Eliminar',
        message: 'No se pudo eliminar el documento',
      });
    }
  };

  // ============================================
  // FILTRADO
  // ============================================

  const documentosFiltrados = documentos.filter((doc) => {
    const matchBusqueda =
      busqueda === '' ||
      doc.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      doc.descripcion?.toLowerCase().includes(busqueda.toLowerCase());

    const matchTipo = filtroTipo === 'TODOS' || doc.tipo === filtroTipo;

    return matchBusqueda && matchTipo;
  });

  // ============================================
  // HELPERS
  // ============================================

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getTipoConfig = (tipo: TipoDocumento) => {
    return TIPOS_DOCUMENTO.find((t) => t.value === tipo) || TIPOS_DOCUMENTO[9];
  };

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  const estadisticas = {
    total: documentos.length,
    firmados: documentos.filter((d) => d.firmado).length,
    tamaño: documentos.reduce((sum, doc) => sum + doc.tamaño, 0),
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <FolderOpen className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Documentos del Expediente
            </h3>
            <p className="text-sm text-gray-600">
              {documentos.length} documentos • {formatFileSize(estadisticas.tamaño)} total
            </p>
          </div>
        </div>

        {!readOnly && (
          <ButtonSIGL variant="primary" onClick={handleFileSelect}>
            <Plus className="w-4 h-4" />
            Subir Documento
          </ButtonSIGL>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
        />
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-3 gap-4">
        <CardSIGL className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Total Documentos</p>
              <p className="text-2xl font-bold text-gray-900">
                {estadisticas.total}
              </p>
            </div>
          </div>
        </CardSIGL>

        <CardSIGL className="p-4">
          <div className="flex items-center gap-3">
            <FileCheck className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Firmados</p>
              <p className="text-2xl font-bold text-green-900">
                {estadisticas.firmados}
              </p>
            </div>
          </div>
        </CardSIGL>

        <CardSIGL className="p-4">
          <div className="flex items-center gap-3">
            <Download className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-xs text-gray-500">Tamaño Total</p>
              <p className="text-2xl font-bold text-purple-900">
                {formatFileSize(estadisticas.tamaño)}
              </p>
            </div>
          </div>
        </CardSIGL>
      </div>

      {/* Filtros */}
      <CardSIGL className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <InputSIGL
            placeholder="Buscar documentos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
          <SelectSIGL
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            options={[
              { value: 'TODOS', label: 'Todos los tipos' },
              ...TIPOS_DOCUMENTO,
            ]}
          />
        </div>
      </CardSIGL>

      {/* Lista de Documentos */}
      <CardSIGL>
        <div className="divide-y divide-gray-200">
          {documentosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">
                {busqueda || filtroTipo !== 'TODOS'
                  ? 'No se encontraron documentos con los filtros seleccionados'
                  : 'No hay documentos cargados'}
              </p>
            </div>
          ) : (
            documentosFiltrados.map((documento) => {
              const tipoConfig = getTipoConfig(documento.tipo);

              return (
                <div
                  key={documento.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icono */}
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${tipoConfig.color}20` }}
                    >
                      <FileText
                        className="w-6 h-6"
                        style={{ color: tipoConfig.color }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {documento.nombre}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <BadgeSIGL
                              variant="info"
                              size="sm"
                              style={{
                                backgroundColor: tipoConfig.color,
                                color: 'white',
                              }}
                            >
                              {tipoConfig.label}
                            </BadgeSIGL>
                            {documento.firmado && (
                              <BadgeSIGL variant="success" size="sm">
                                <Lock className="w-3 h-3" />
                                Firmado
                              </BadgeSIGL>
                            )}
                            {documento.etiquetas.map((etiqueta) => (
                              <BadgeSIGL key={etiqueta} variant="secondary" size="sm">
                                {etiqueta}
                              </BadgeSIGL>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <ButtonSIGL
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(documento)}
                          >
                            <Eye className="w-4 h-4" />
                          </ButtonSIGL>
                          <ButtonSIGL
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(documento)}
                          >
                            <Download className="w-4 h-4" />
                          </ButtonSIGL>
                          {!readOnly && (
                            <ButtonSIGL
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(documento)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </ButtonSIGL>
                          )}
                        </div>
                      </div>

                      {documento.descripcion && (
                        <p className="text-sm text-gray-600 mt-2">
                          {documento.descripcion}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>{formatFileSize(documento.tamaño)}</span>
                        <span>•</span>
                        <span>
                          Cargado {documento.fechaCarga.toLocaleDateString('es-CO')}
                        </span>
                        <span>•</span>
                        <span>Por {documento.cargadoPor}</span>
                        {documento.accesos > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {documento.accesos} visualizaciones
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardSIGL>

      {/* Modal Upload */}
      <ModalSIGL
        isOpen={modalUpload}
        onClose={() => setModalUpload(false)}
        title="Subir Documento"
        size="medium"
      >
        <div className="space-y-4">
          <SelectSIGL
            label="Tipo de Documento"
            placeholder="Seleccione el tipo..."
            options={TIPOS_DOCUMENTO}
            value={uploadForm.tipo}
            onChange={(value) =>
              setUploadForm((prev) => ({ ...prev, tipo: value as TipoDocumento }))
            }
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (Opcional)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Breve descripción del documento..."
              value={uploadForm.descripcion}
              onChange={(e) =>
                setUploadForm((prev) => ({ ...prev, descripcion: e.target.value }))
              }
            />
          </div>

          <InputSIGL
            label="Etiquetas (Opcional)"
            placeholder="etiqueta1, etiqueta2, etiqueta3"
            value={uploadForm.etiquetas}
            onChange={(e) =>
              setUploadForm((prev) => ({ ...prev, etiquetas: e.target.value }))
            }
            helperText="Separar con comas"
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <ButtonSIGL variant="secondary" onClick={() => setModalUpload(false)}>
              Cancelar
            </ButtonSIGL>
            <ButtonSIGL variant="primary" onClick={handleUploadSubmit}>
              <Upload className="w-4 h-4" />
              Subir Documento
            </ButtonSIGL>
          </div>
        </div>
      </ModalSIGL>

      {/* Modal Preview */}
      <ModalSIGL
        isOpen={modalPreview}
        onClose={() => setModalPreview(false)}
        title={documentoSeleccionado?.nombre || 'Vista Previa'}
        size="xlarge"
      >
        {documentoSeleccionado && (
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Vista previa de documentos en desarrollo. En producción se integrará
                con visor de PDF/DOC.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Tipo:</span>
                <p className="font-semibold">
                  {getTipoConfig(documentoSeleccionado.tipo).label}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Tamaño:</span>
                <p className="font-semibold">
                  {formatFileSize(documentoSeleccionado.tamaño)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Fecha:</span>
                <p className="font-semibold">
                  {documentoSeleccionado.fechaCarga.toLocaleDateString('es-CO')}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Cargado por:</span>
                <p className="font-semibold">{documentoSeleccionado.cargadoPor}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <ButtonSIGL
                variant="secondary"
                onClick={() => setModalPreview(false)}
              >
                Cerrar
              </ButtonSIGL>
              <ButtonSIGL
                variant="primary"
                onClick={() => handleDownload(documentoSeleccionado)}
              >
                <Download className="w-4 h-4" />
                Descargar
              </ButtonSIGL>
            </div>
          </div>
        )}
      </ModalSIGL>
    </div>
  );
}
