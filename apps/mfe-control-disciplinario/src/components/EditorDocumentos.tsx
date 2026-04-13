/**
 * EDITOR DE DOCUMENTOS EN LÍNEA - RF003
 * Editor WYSIWYG con pre-llenado automático de campos paramétricos
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X, Save, Send, Eye, Download, Upload, FileText, Wand2,
  Bold, Italic, Underline, List, ListOrdered, AlignLeft,
  AlignCenter, AlignRight, Undo, Redo, Check, AlertCircle
} from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { toast } from 'sonner';

interface EditorDocumentosProps {
  proceso: any;
  plantilla: any;
  onClose: () => void;
  onGuardar: (contenido: string, version: number) => void;
  onEnviarRevision: (contenido: string, observaciones: string, version: number) => void;
  borradorExistente?: any;
  hideSendButton?: boolean;
}

export function EditorDocumentos({
  proceso,
  plantilla,
  onClose,
  onGuardar,
  onEnviarRevision,
  borradorExistente,
  hideSendButton = false
}: EditorDocumentosProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [contenido, setContenido] = useState('');
  const [version, setVersion] = useState(borradorExistente?.version || 1);
  const [isSaved, setIsSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEnviarModal, setShowEnviarModal] = useState(false);
  const [camposDetectados, setCamposDetectados] = useState<string[]>([]);

  useEffect(() => {
    if (borradorExistente) {
      setContenido(borradorExistente.contenido);
    } else {
      // Pre-llenar con la plantilla
      const contenidoInicial = preLlenarPlantilla(plantilla.contenido, proceso);
      setContenido(contenidoInicial);
    }
  }, [plantilla, proceso, borradorExistente]);

  // Efecto para inicializar el contenido del editor SOLO UNA VEZ o cuando cambie completamente
  useEffect(() => {
    if (editorRef.current) {
      // Solo actualizar si el contenido del editor está vacío (inicialización) 
      // o si es significativamente diferente (cambio de documento)
      if (editorRef.current.innerHTML === '') {
        editorRef.current.innerHTML = contenido;
      }
    }
  }, [contenido]);

  useEffect(() => {
    // Detectar campos paramétricos en el contenido
    const regex = /\{\{([^}]+)\}\}/g;
    const campos = [...contenido.matchAll(regex)].map(match => match[1]);
    setCamposDetectados([...new Set(campos)]);
  }, [contenido]);

  const preLlenarPlantilla = (template: string, proc: any): string => {
    let resultado = template;

    const mapeo: Record<string, string> = {
      'numeroProceso': proc.numeroProceso,
      'noticiaOrigen': proc.noticiaOrigen,
      'denunciado': proc.denunciado.nombre,
      'cedula': proc.denunciado.cedula,
      'cargo': proc.denunciado.cargo,
      'dependencia': proc.denunciado.dependencia,
      'territorial': proc.territorial,
      'conducta': proc.tipoConducta.join(', '),
      'hechos': proc.hechos,
      'fechaNoticia': new Date(proc.fechaAsignacion).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      'fechaAsignacion': new Date(proc.fechaAsignacion).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      'ciudad': 'Bogotá D.C.',
      'dia': new Date().getDate().toString(),
      'mes': new Date().toLocaleDateString('es-CO', { month: 'long' }),
      'año': new Date().getFullYear().toString(),
      'nombreJefe': 'Dr. NOMBRE DEL JEFE OCID',
      'diasTermino': '30',
      'diasInstruccion': '60',
      'motivacion': '[ESCRIBIR MOTIVACIÓN]',
      'diligencias': '[DESCRIBIR DILIGENCIAS A REALIZAR]',
      'cargos': '[FORMULAR CARGOS ESPECÍFICOS]',
      'motivoIncompetencia': '[EXPLICAR MOTIVO DE INCOMPETENCIA]',
      'entidadCompetente': '[NOMBRE DE LA ENTIDAD COMPETENTE]'
    };

    Object.entries(mapeo).forEach(([campo, valor]) => {
      const regex = new RegExp(`\\{\\{${campo}\\}\\}`, 'g');
      resultado = resultado.replace(regex, valor);
    });

    return resultado;
  };

  const aplicarComando = (comando: string, valor?: string) => {
    document.execCommand(comando, false, valor);
    if (editorRef.current) {
      setContenido(editorRef.current.innerHTML);
    }
  };

  const handleGuardar = () => {
    onGuardar(contenido, version);
    setIsSaved(true);
    toast.success('Borrador Guardado', {
      description: `Versión ${version} guardada correctamente`
    });
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleRellenarCampos = () => {
    const nuevoContenido = preLlenarPlantilla(contenido, proceso);
    setContenido(nuevoContenido);
    if (editorRef.current) {
      editorRef.current.innerHTML = nuevoContenido;
    }
    toast.success('Campos Rellenados', {
      description: 'Se han completado los campos automáticos'
    });
  };

  const handleImportarWord = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.doc,.docx';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        toast.info('Importando Documento', {
          description: 'Funcionalidad disponible próximamente'
        });
        // Aquí iría la lógica de importación real
      }
    };
    input.click();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 p-4 z-[170]"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-full max-h-[95vh] overflow-hidden flex flex-col mx-4 md:mx-auto"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
                    Editor de Documentos
                  </h2>
                  <Badge variant="outline">v{version}</Badge>
                  {isSaved && (
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      <Check className="w-3 h-3 mr-1" />
                      Guardado
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {proceso.numeroProceso} • {plantilla.nombre}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Barra de herramientas */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Formato de texto */}
              <div className="flex gap-1 border-r border-gray-300 pr-2">
                <button
                  onClick={() => aplicarComando('bold')}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Negrita"
                >
                  <Bold className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => aplicarComando('italic')}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Cursiva"
                >
                  <Italic className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => aplicarComando('underline')}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Subrayado"
                >
                  <Underline className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              {/* Listas */}
              <div className="flex gap-1 border-r border-gray-300 pr-2">
                <button
                  onClick={() => aplicarComando('insertUnorderedList')}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Lista con viñetas"
                >
                  <List className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => aplicarComando('insertOrderedList')}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Lista numerada"
                >
                  <ListOrdered className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              {/* Alineación */}
              <div className="flex gap-1 border-r border-gray-300 pr-2">
                <button
                  onClick={() => aplicarComando('justifyLeft')}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Alinear izquierda"
                >
                  <AlignLeft className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => aplicarComando('justifyCenter')}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Centrar"
                >
                  <AlignCenter className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => aplicarComando('justifyRight')}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Alinear derecha"
                >
                  <AlignRight className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              {/* Deshacer/Rehacer */}
              <div className="flex gap-1 border-r border-gray-300 pr-2">
                <button
                  onClick={() => aplicarComando('undo')}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Deshacer"
                >
                  <Undo className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => aplicarComando('redo')}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Rehacer"
                >
                  <Redo className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              {/* Acciones especiales */}
              <Button
                onClick={handleRellenarCampos}
                variant="outline"
                size="sm"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Rellenar Campos
              </Button>

              <Button
                onClick={handleImportarWord}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar Word
              </Button>

              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                size="sm"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Editar' : 'Vista Previa'}
              </Button>
            </div>

            {/* Campos pendientes */}
            {camposDetectados.length > 0 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-900 mb-1">
                      Campos pendientes por completar:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {camposDetectados.map((campo) => (
                        <Badge key={campo} className="bg-yellow-100 text-yellow-800 text-xs">
                          {campo}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Editor / Preview */}
          <div className="flex-1 overflow-y-auto p-8 bg-white">
            {showPreview ? (
              <div
                className="max-w-4xl mx-auto bg-white shadow-lg p-12 rounded-lg border border-gray-200"
                dangerouslySetInnerHTML={{ __html: contenido }}
                style={{
                  fontFamily: 'Times New Roman, serif',
                  fontSize: '12pt',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}
              />
            ) : (
              <div
                ref={editorRef}
                contentEditable
                onInput={(e) => setContenido(e.currentTarget.innerHTML)}
                className="max-w-4xl mx-auto bg-white shadow-lg p-12 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-blue-500 min-h-[600px]"
                style={{
                  fontFamily: 'Times New Roman, serif',
                  fontSize: '12pt',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}
              // NO usar dangerouslySetInnerHTML aquí para evitar re-renderizados que pierden el foco
              // Se inicializa en el useEffect
              />
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="w-4 h-4" />
              <span>{contenido.length} caracteres</span>
              <span>•</span>
              <span>Versión {version}</span>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
              >
                Cancelar
              </Button>

              {/* Botón Guardar siempre visible */}
              <Button
                onClick={handleGuardar}
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Borrador
              </Button>

              {!hideSendButton && (
                <Button
                  onClick={() => setShowEnviarModal(true)}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar para Revisión
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Modal Enviar para Revisión */}
      {showEnviarModal && (
        <ModalEnviarRevision
          version={version}
          onClose={() => setShowEnviarModal(false)}
          onConfirm={(observaciones) => {
            onEnviarRevision(contenido, observaciones, version);
            setShowEnviarModal(false);
          }}
        />
      )}
    </>
  );
}

// ==================== MODAL ENVIAR PARA REVISIÓN ====================
function ModalEnviarRevision({
  version,
  onClose,
  onConfirm
}: {
  version: number;
  onClose: () => void;
  onConfirm: (observaciones: string) => void;
}) {
  const [observaciones, setObservaciones] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 p-4 z-[180]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
      >
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold" style={{ color: '#003DA5' }}>
            Enviar para Revisión
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Versión {version}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block font-semibold mb-2 text-gray-900">
              Observaciones para el Jefe OCID
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Solicito revisión urgente para continuar con el proceso. Se adjuntan todas las pruebas documentales..."
              className="w-full h-32 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <Send className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 mb-1">
                  Notificación Automática
                </p>
                <p className="text-sm text-blue-700">
                  El Jefe de OCID recibirá una notificación por correo electrónico
                  para revisar este borrador.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(observaciones)}
            className="flex-1"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}