/**
 * MODAL DE VALIDACIÓN DE EVIDENCIAS
 * Sistema para cargar, revisar y validar evidencias de los
 * Planes de Mejoramiento asociados a hallazgos
 */

'use client';

import React, { useState } from 'react';
import {
  FileCheck,
  Upload,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  Image,
  FileText,
  File,
  Trash2,
  RotateCcw,
  Send,
  User,
  Calendar,
  CheckSquare,
  Square
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

interface Evidencia {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: string;
  fechaCarga: string;
  version: number;
  descripcion: string;
  estadoValidacion: 'Pendiente' | 'En Revisión' | 'Aprobada' | 'Rechazada';
  responsableCarga: string;
  urlArchivo?: string;
  
  // Validación
  validacion?: ValidacionEvidencia;
  
  // Historial
  versiones?: VersionEvidencia[];
}

interface ValidacionEvidencia {
  id: string;
  evidenciaId: string;
  auditorRevisor: string;
  fechaRevision: string;
  estado: 'Aprobada' | 'Rechazada';
  
  // Checklist
  checklist: ItemChecklist[];
  
  // Comentarios
  comentarios: string;
  observaciones?: string;
}

interface ItemChecklist {
  id: string;
  criterio: string;
  cumple: boolean;
  comentario?: string;
}

interface VersionEvidencia {
  version: number;
  fechaCarga: string;
  responsable: string;
  nombreArchivo: string;
  cambios: string;
}

interface PlanMejoramiento {
  id: string;
  hallazgoId: string;
  codigo: string;
  accionMejora: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'En Ejecución' | 'Completado' | 'Vencido' | 'Cancelado';
  avance: number;
  evidencias: Evidencia[];
}

interface ModalValidacionEvidenciasProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PlanMejoramiento;
  modoVista: 'cargar' | 'validar' | 'ver';
  usuarioActual: {
    nombre: string;
    rol: 'responsable' | 'auditor' | 'jefe';
  };
  onCargarEvidencia?: (data: {
    nombre: string;
    descripcion: string;
    archivo: File | null;
  }) => void;
  onValidarEvidencia?: (evidenciaId: string, data: {
    estado: 'Aprobada' | 'Rechazada';
    checklist: ItemChecklist[];
    comentarios: string;
  }) => void;
}

// ============ CHECKLIST POR DEFECTO ============

const CHECKLIST_DEFAULT: ItemChecklist[] = [
  {
    id: 'check-1',
    criterio: 'El documento es legible y está completo',
    cumple: false,
  },
  {
    id: 'check-2',
    criterio: 'La evidencia corresponde a la acción de mejora comprometida',
    cumple: false,
  },
  {
    id: 'check-3',
    criterio: 'Las fechas son coherentes con el cronograma',
    cumple: false,
  },
  {
    id: 'check-4',
    criterio: 'Incluye firmas o aprobaciones requeridas',
    cumple: false,
  },
  {
    id: 'check-5',
    criterio: 'Demuestra la implementación efectiva de la acción',
    cumple: false,
  },
];

// ============ COMPONENTE PRINCIPAL ============

export function ModalValidacionEvidencias({
  isOpen,
  onClose,
  plan,
  modoVista,
  usuarioActual,
  onCargarEvidencia,
  onValidarEvidencia,
}: ModalValidacionEvidenciasProps) {
  // Estados para cargar evidencia
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [descripcionArchivo, setDescripcionArchivo] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  
  // Estados para validar evidencia
  const [evidenciaSeleccionada, setEvidenciaSeleccionada] = useState<Evidencia | null>(null);
  const [checklist, setChecklist] = useState<ItemChecklist[]>(CHECKLIST_DEFAULT);
  const [comentariosValidacion, setComentariosValidacion] = useState('');
  const [estadoValidacion, setEstadoValidacion] = useState<'Aprobada' | 'Rechazada'>('Aprobada');
  
  const [procesando, setProcesando] = useState(false);

  // ============ HANDLERS ============

  const handleSeleccionarArchivo = () => {
    // Simulación de selección de archivo
    const archivoMock = new File(['contenido'], 'Evidencia_Capacitacion.pdf', {
      type: 'application/pdf',
    });
    setArchivoSeleccionado(archivoMock);
    setNombreArchivo('Evidencia_Capacitacion.pdf');
    toast.success('Archivo seleccionado (simulación)');
  };

  const handleCargarEvidencia = async () => {
    if (!nombreArchivo || !descripcionArchivo || !archivoSeleccionado) {
      toast.error('Debes completar todos los campos y seleccionar un archivo');
      return;
    }

    setProcesando(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (onCargarEvidencia) {
        onCargarEvidencia({
          nombre: nombreArchivo,
          descripcion: descripcionArchivo,
          archivo: archivoSeleccionado,
        });
      }

      toast.success('Evidencia cargada correctamente');
      
      // Reset
      setNombreArchivo('');
      setDescripcionArchivo('');
      setArchivoSeleccionado(null);
      onClose();
    } catch (error) {
      toast.error('Error al cargar la evidencia');
    } finally {
      setProcesando(false);
    }
  };

  const handleToggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, cumple: !item.cumple } : item))
    );
  };

  const handleValidarEvidencia = async () => {
    if (!evidenciaSeleccionada) {
      toast.error('Debes seleccionar una evidencia');
      return;
    }

    if (!comentariosValidacion.trim()) {
      toast.error('Debes proporcionar comentarios de validación');
      return;
    }

    const itemsIncumplidos = checklist.filter((item) => !item.cumple);
    if (estadoValidacion === 'Aprobada' && itemsIncumplidos.length > 0) {
      toast.error(
        `No puedes aprobar la evidencia con ${itemsIncumplidos.length} criterios sin cumplir`
      );
      return;
    }

    setProcesando(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (onValidarEvidencia) {
        onValidarEvidencia(evidenciaSeleccionada.id, {
          estado: estadoValidacion,
          checklist,
          comentarios: comentariosValidacion,
        });
      }

      toast.success(`Evidencia ${estadoValidacion.toLowerCase()} correctamente`);
      onClose();
    } catch (error) {
      toast.error('Error al validar la evidencia');
    } finally {
      setProcesando(false);
    }
  };

  const obtenerIconoPorTipo = (tipo: string) => {
    if (tipo.includes('pdf')) return <FileText className="w-5 h-5 text-red-600" />;
    if (tipo.includes('image')) return <Image className="w-5 h-5 text-blue-600" />;
    if (tipo.includes('excel') || tipo.includes('spreadsheet'))
      return <FileText className="w-5 h-5 text-green-600" />;
    return <File className="w-5 h-5 text-gray-600" />;
  };

  // ============ RENDER ============

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        modoVista === 'cargar'
          ? 'Cargar Evidencia'
          : modoVista === 'validar'
          ? 'Validar Evidencia'
          : 'Evidencias del Plan de Mejoramiento'
      }
      maxWidth="max-w-5xl"
    >
      <div className="space-y-6">
        {/* Información del Plan */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#003DA5] flex items-center justify-center flex-shrink-0">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">{plan.accionMejora}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-700">
                <div>
                  <span className="font-medium">Código:</span> {plan.codigo}
                </div>
                <div>
                  <span className="font-medium">Responsable:</span> {plan.responsable}
                </div>
                <div>
                  <span className="font-medium">Avance:</span>{' '}
                  <Badge variant="outline">{plan.avance}%</Badge>
                </div>
                <div>
                  <span className="font-medium">Estado:</span>{' '}
                  <Badge
                    className={
                      plan.estado === 'Completado'
                        ? 'bg-green-100 text-green-800'
                        : plan.estado === 'En Ejecución'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {plan.estado}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODO: CARGAR EVIDENCIA */}
        {modoVista === 'cargar' && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <AlertCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p>
                  Carga las evidencias que demuestren el cumplimiento de la acción de mejora. Los
                  archivos serán revisados por el auditor asignado.
                </p>
              </div>
            </div>

            {/* Selector de archivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo de Evidencia *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#003DA5] transition-colors cursor-pointer">
                {archivoSeleccionado ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileCheck className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">{archivoSeleccionado.name}</p>
                      <p className="text-sm text-gray-500">
                        {(archivoSeleccionado.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setArchivoSeleccionado(null);
                        setNombreArchivo('');
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <div onClick={handleSeleccionarArchivo}>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      Haz click para seleccionar un archivo
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, Word, Excel, imágenes (máx. 10 MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Nombre del archivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Evidencia *
              </label>
              <input
                type="text"
                value={nombreArchivo}
                onChange={(e) => setNombreArchivo(e.target.value)}
                placeholder="Ej: Acta de capacitación en gestión documental"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción de la Evidencia *
              </label>
              <textarea
                value={descripcionArchivo}
                onChange={(e) => setDescripcionArchivo(e.target.value)}
                placeholder="Describe brevemente qué demuestra esta evidencia y cómo se relaciona con el plan de mejoramiento..."
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Explica claramente qué se evidencia en el documento y cómo cumple con lo comprometido.
              </p>
            </div>

            {/* Acciones */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={procesando}>
                Cancelar
              </Button>
              <Button
                onClick={handleCargarEvidencia}
                disabled={procesando || !archivoSeleccionado || !nombreArchivo || !descripcionArchivo}
                className="gap-2"
                style={{ backgroundColor: '#003DA5' }}
              >
                {procesando ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Cargar Evidencia
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* MODO: VALIDAR EVIDENCIA */}
        {modoVista === 'validar' && (
          <div className="space-y-4">
            {/* Selector de evidencia */}
            {!evidenciaSeleccionada && (
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900">Selecciona la evidencia a validar:</h5>
                {plan.evidencias
                  .filter((ev) => ev.estadoValidacion === 'Pendiente' || ev.estadoValidacion === 'En Revisión')
                  .map((evidencia) => (
                    <button
                      key={evidencia.id}
                      onClick={() => {
                        setEvidenciaSeleccionada(evidencia);
                        if (evidencia.validacion) {
                          setChecklist(evidencia.validacion.checklist);
                          setComentariosValidacion(evidencia.validacion.comentarios);
                        } else {
                          setChecklist(CHECKLIST_DEFAULT);
                        }
                      }}
                      className="w-full p-4 bg-white border-2 rounded-lg hover:border-[#003DA5] transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        {obtenerIconoPorTipo(evidencia.tipo)}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{evidencia.nombre}</p>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {evidencia.descripcion}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{evidencia.tamaño}</span>
                            <span>•</span>
                            <span>{evidencia.fechaCarga}</span>
                            <span>•</span>
                            <span>Versión {evidencia.version}</span>
                          </div>
                        </div>
                        <Badge
                          className={
                            evidencia.estadoValidacion === 'Pendiente'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {evidencia.estadoValidacion}
                        </Badge>
                      </div>
                    </button>
                  ))}
              </div>
            )}

            {/* Formulario de validación */}
            {evidenciaSeleccionada && (
              <>
                {/* Info de la evidencia */}
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      {obtenerIconoPorTipo(evidenciaSeleccionada.tipo)}
                      <div>
                        <h5 className="font-medium text-gray-900">
                          {evidenciaSeleccionada.nombre}
                        </h5>
                        <p className="text-sm text-gray-600">{evidenciaSeleccionada.descripcion}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEvidenciaSeleccionada(null)}
                    >
                      Cambiar
                    </Button>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>
                      <strong>Cargada por:</strong> {evidenciaSeleccionada.responsableCarga}
                    </span>
                    <span>
                      <strong>Fecha:</strong> {evidenciaSeleccionada.fechaCarga}
                    </span>
                    <span>
                      <strong>Versión:</strong> {evidenciaSeleccionada.version}
                    </span>
                  </div>
                </div>

                {/* Checklist de validación */}
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />
                    Checklist de Validación
                  </h5>
                  <div className="space-y-2">
                    {checklist.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={item.cumple}
                          onChange={() => handleToggleChecklist(item.id)}
                          className="w-5 h-5 mt-0.5 rounded border-gray-300 text-[#003DA5] focus:ring-[#003DA5]"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.criterio}</p>
                          {item.comentario && (
                            <p className="text-xs text-gray-500 mt-1">{item.comentario}</p>
                          )}
                        </div>
                        {item.cumple ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-300" />
                        )}
                      </label>
                    ))}
                  </div>

                  {/* Resumen del checklist */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                    <p className="text-gray-700">
                      <strong>Cumplidos:</strong> {checklist.filter((i) => i.cumple).length} de{' '}
                      {checklist.length} criterios
                    </p>
                  </div>
                </div>

                {/* Decisión */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decisión de Validación *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setEstadoValidacion('Aprobada')}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        estadoValidacion === 'Aprobada'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <CheckCircle
                        className={`w-8 h-8 mx-auto mb-2 ${
                          estadoValidacion === 'Aprobada' ? 'text-green-600' : 'text-gray-400'
                        }`}
                      />
                      <p className="font-medium text-gray-900">Aprobar</p>
                      <p className="text-xs text-gray-600 mt-1">La evidencia es válida</p>
                    </button>

                    <button
                      onClick={() => setEstadoValidacion('Rechazada')}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        estadoValidacion === 'Rechazada'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <XCircle
                        className={`w-8 h-8 mx-auto mb-2 ${
                          estadoValidacion === 'Rechazada' ? 'text-red-600' : 'text-gray-400'
                        }`}
                      />
                      <p className="font-medium text-gray-900">Rechazar</p>
                      <p className="text-xs text-gray-600 mt-1">Requiere correcciones</p>
                    </button>
                  </div>
                </div>

                {/* Comentarios */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentarios de Validación *
                  </label>
                  <textarea
                    value={comentariosValidacion}
                    onChange={(e) => setComentariosValidacion(e.target.value)}
                    placeholder={
                      estadoValidacion === 'Aprobada'
                        ? 'Describe por qué la evidencia es válida y cumple con los requisitos...'
                        : 'Explica qué aspectos deben corregirse o complementarse...'
                    }
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] resize-none"
                  />
                </div>

                {/* Acciones */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setEvidenciaSeleccionada(null)}
                    disabled={procesando}
                  >
                    Volver
                  </Button>
                  <Button
                    onClick={handleValidarEvidencia}
                    disabled={procesando || !comentariosValidacion.trim()}
                    className="gap-2"
                    style={{
                      backgroundColor: estadoValidacion === 'Aprobada' ? '#10B981' : '#EF4444',
                    }}
                  >
                    {procesando ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {estadoValidacion === 'Aprobada' ? 'Aprobar Evidencia' : 'Rechazar Evidencia'}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* MODO: VER EVIDENCIAS */}
        {modoVista === 'ver' && (
          <div className="space-y-4">
            {plan.evidencias.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border">
                <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No hay evidencias cargadas</p>
              </div>
            ) : (
              plan.evidencias.map((evidencia) => (
                <div key={evidencia.id} className="p-4 bg-white border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      {obtenerIconoPorTipo(evidencia.tipo)}
                      <div>
                        <h5 className="font-medium text-gray-900">{evidencia.nombre}</h5>
                        <p className="text-sm text-gray-600">{evidencia.descripcion}</p>
                      </div>
                    </div>
                    <Badge
                      className={
                        evidencia.estadoValidacion === 'Aprobada'
                          ? 'bg-green-100 text-green-800'
                          : evidencia.estadoValidacion === 'Rechazada'
                          ? 'bg-red-100 text-red-800'
                          : evidencia.estadoValidacion === 'En Revisión'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {evidencia.estadoValidacion}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                    <span>
                      <strong>Cargada por:</strong> {evidencia.responsableCarga}
                    </span>
                    <span>
                      <strong>Fecha:</strong> {evidencia.fechaCarga}
                    </span>
                    <span>
                      <strong>Tamaño:</strong> {evidencia.tamaño}
                    </span>
                    <span>
                      <strong>Versión:</strong> {evidencia.version}
                    </span>
                  </div>

                  {/* Validación (si existe) */}
                  {evidencia.validacion && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">
                          Validado por: {evidencia.validacion.auditorRevisor}
                        </span>
                        <span className="text-sm text-gray-500">
                          • {evidencia.validacion.fechaRevision}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Comentarios:</strong> {evidencia.validacion.comentarios}
                      </p>
                      <p className="text-xs text-gray-600">
                        Criterios cumplidos:{' '}
                        {evidencia.validacion.checklist.filter((i) => i.cumple).length} de{' '}
                        {evidencia.validacion.checklist.length}
                      </p>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Eye className="w-4 h-4" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                      Descargar
                    </Button>
                  </div>
                </div>
              ))
            )}

            {/* Botón cerrar */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={onClose}>Cerrar</Button>
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}

// ============ COMPONENTE AUXILIAR: BOTÓN DE EVIDENCIAS ============

interface BotonEvidenciasProps {
  plan: PlanMejoramiento;
  usuarioActual: {
    nombre: string;
    rol: 'responsable' | 'auditor' | 'jefe';
  };
  onCargarEvidencia?: (planId: string, data: any) => void;
  onValidarEvidencia?: (planId: string, evidenciaId: string, data: any) => void;
}

export function BotonEvidencias({
  plan,
  usuarioActual,
  onCargarEvidencia,
  onValidarEvidencia,
}: BotonEvidenciasProps) {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoVista, setModoVista] = useState<'cargar' | 'validar' | 'ver'>('ver');

  const evidenciasPendientes = plan.evidencias.filter(
    (ev) => ev.estadoValidacion === 'Pendiente' || ev.estadoValidacion === 'En Revisión'
  ).length;

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setModoVista('ver');
            setMostrarModal(true);
          }}
          className="gap-2"
        >
          <FileCheck className="w-4 h-4" />
          Ver Evidencias ({plan.evidencias.length})
        </Button>

        {usuarioActual.rol === 'responsable' && (
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setModoVista('cargar');
              setMostrarModal(true);
            }}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Cargar
          </Button>
        )}

        {usuarioActual.rol === 'auditor' && evidenciasPendientes > 0 && (
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setModoVista('validar');
              setMostrarModal(true);
            }}
            className="gap-2"
            style={{ backgroundColor: '#F59E0B' }}
          >
            <CheckSquare className="w-4 h-4" />
            Validar ({evidenciasPendientes})
          </Button>
        )}
      </div>

      <ModalValidacionEvidencias
        isOpen={mostrarModal}
        onClose={() => setMostrarModal(false)}
        plan={plan}
        modoVista={modoVista}
        usuarioActual={usuarioActual}
        onCargarEvidencia={
          onCargarEvidencia
            ? (data) => onCargarEvidencia(plan.id, data)
            : undefined
        }
        onValidarEvidencia={
          onValidarEvidencia
            ? (evidenciaId, data) => onValidarEvidencia(plan.id, evidenciaId, data)
            : undefined
        }
      />
    </>
  );
}
