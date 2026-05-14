/**
 * ModalRespuestaOrgano - Elaboración de respuesta al órgano de control
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { Input } from '@esap-mfe/shared-ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@esap-mfe/shared-ui/select';
import {
  Send, X, FileText, CheckCircle, AlertCircle, Upload, Eye,
  Mail, Calendar, User, Building2, Clock, Save, Download, Loader2,
  Trash2, FileSpreadsheet, Image as ImageIcon, Paperclip, FileCheck, FolderOpen, Plus, AtSign
} from 'lucide-react';
import { toast } from 'sonner';
import { ocService, correosJuridicosService } from '../../../../services/api/legal.service';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';

interface DocumentoSeleccionado {
  archivo: File;
  categoria: 'Requerimiento' | 'Respuesta' | 'Soporte' | 'Interno';
  preview?: string;
}

const CATEGORIES_REVERSE_MAP: Record<string, string> = {
  'Requerimiento': 'oficio',
  'Respuesta': 'respuesta',
  'Soporte': 'anexo',
  'Interno': 'otro'
};

const getTipoArchivo = (mimeType: string): string => {
  if (!mimeType) return 'Otro';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('word') || mimeType.includes('officedocument')) return 'Word';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Excel';
  if (mimeType.startsWith('image/')) return 'Imagen';
  return 'Otro';
};

const formatearTamano = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getIconoTipo = (tipo: string) => {
  switch (tipo) {
    case 'PDF': return <FileText className="w-5 h-5 text-red-500" />;
    case 'Word': return <FileText className="w-5 h-5 text-blue-500" />;
    case 'Excel': return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    case 'Imagen': return <ImageIcon className="w-5 h-5 text-purple-500" />;
    default: return <Paperclip className="w-5 h-5 text-gray-500" />;
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};

interface ModalRespuestaOrganoProps {
  isOpen: boolean;
  onClose: () => void;
  requerimientoId: string;
  organismoNombre: string;
  emailPredeterminado?: string;
  onSuccess?: () => void;
}

export function ModalRespuestaOrgano({
  isOpen,
  onClose,
  requerimientoId,
  organismoNombre,
  emailPredeterminado,
  onSuccess
}: ModalRespuestaOrganoProps) {
  const [loading, setLoading] = useState(false);
  const [radicado, setRadicado] = useState(requerimientoId);
  const [contenidoRespuesta, setContenidoRespuesta] = useState('');
  const [destinatario, setDestinatario] = useState('');
  const [emails, setEmails] = useState<string[]>(emailPredeterminado ? [emailPredeterminado] : []);
  const [emailInput, setEmailInput] = useState('');
  const [cargo, setCargo] = useState('');
  const [checklistItems, setChecklistItems] = useState({
    completitud: false,
    documentos: false,
    redaccion: false,
    verificacion: false,
    formato: false,
    termino: false
  });
  const [tipoRespuesta, setTipoRespuesta] = useState('completa');
  const [documentosBorrador, setDocumentosBorrador] = useState<{ nombre: string; url: string }[]>([]);
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<DocumentoSeleccionado[]>([]);
  const [categoriaActual, setCategoriaActual] = useState<'Requerimiento' | 'Respuesta' | 'Soporte' | 'Interno'>('Respuesta');
  const [enviando, setEnviando] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(!authService.hasPermission(Permissions.GESTION_LEGAL_ORGANOS_CONTROL_ELABORAR));
  const [isAlreadySent, setIsAlreadySent] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos (Borrador y Detalles)
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // 1. Obtener detalles del requerimiento para mostrar el Radicado real
        const reqData = await ocService.getRequerimientoOC(requerimientoId).catch(() => null);
        if (reqData) {
          setRadicado(reqData.radicadoInterno || reqData.radicadoExterno || requerimientoId);

          // Bloquear si ya fue enviado o cerrado
          if (reqData.estado === 'ENVIADO' || reqData.estado === 'CERRADO') {
            setIsReadOnly(true);
            setIsAlreadySent(true);
            const fechaRespuestaStr = reqData.fechaRespuesta ? new Date(reqData.fechaRespuesta).toLocaleDateString() : 'fecha desconocida';
            toast.info(`Requerimiento ya respondido el ${fechaRespuestaStr}`, { duration: 5000 });
          }
        }

        // 2. Cargar borrador si existe
        const borrador = await ocService.getBorradorRespuesta(requerimientoId).catch(() => null);
        if (borrador) {
          setContenidoRespuesta(borrador.contenido || '');
          setDestinatario(borrador.destinatarioNombre || '');
          const emailsGuardados = (borrador.destinatarioEmail || emailPredeterminado || '')
            .split(',').map((e: string) => e.trim()).filter(Boolean);
          setEmails(emailsGuardados);
          setCargo(borrador.destinatarioCargo || '');
          if (borrador.tipoRespuesta) setTipoRespuesta(borrador.tipoRespuesta);

          if (borrador.documentosAdjuntos) {
            let adjuntos = borrador.documentosAdjuntos;
            if (typeof adjuntos === 'string') {
              try {
                adjuntos = JSON.parse(adjuntos);
              } catch (e) {
                adjuntos = [];
              }
            }
            setDocumentosBorrador(Array.isArray(adjuntos) ? adjuntos : []);
          }
          // borrador cargado silenciosamente
        }

      } catch (error) {
        console.error('Error cargando borrador:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      cargarDatos();
    }
  }, [isOpen, requerimientoId, emailPredeterminado]);

  // Template de respuesta
  const aplicarTemplate = () => {
    const template = `Bogotá D.C., ${new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}

Señor(a)
${destinatario || '[NOMBRE DEL DESTINATARIO]'}
${cargo || '[CARGO]'}
${organismoNombre}

Ref: ${radicado}
     Asunto: Respuesta a requerimiento

Respetado(a) señor(a):

En atención al oficio de la referencia, mediante el cual solicita [DESCRIBIR LA SOLICITUD], me permito dar respuesta en los siguientes términos:

[CONTENIDO DE LA RESPUESTA]

1. ANTECEDENTES
[Describir el contexto y antecedentes relevantes]

2. RESPUESTA A LO SOLICITADO
[Responder punto por punto lo requerido]

3. CONCLUSIONES
[Síntesis de la respuesta]

Para mayor información, se adjuntan los siguientes documentos:
- [Listar documentos adjuntos]

Cualquier información adicional que requiera, estamos atentos.

Atentamente,

[FIRMA]
[NOMBRE Y CARGO DEL FIRMANTE]
Escuela Superior de Administración Pública - ESAP`;

    setContenidoRespuesta(template);
    toast.success('Template aplicado', {
      description: 'Plantilla de respuesta cargada correctamente',
      icon: <CheckCircle className="w-4 h-4" />
    });
  };

  const handleGuardarBorrador = async () => {
    try {
      await ocService.saveBorradorRespuesta(requerimientoId, {
        requerimientoId,
        contenido: contenidoRespuesta,
        destinatarioNombre: destinatario,
        destinatarioEmail: emails.join(','),
        destinatarioCargo: cargo,
        tipoRespuesta,
        // CORRECCIÓN: Enviar array directo, el backend maneja jsonb
        // Ojo: los nuevos archivos no se guardan en borrador automáticamente porque son File, 
        // normalmente un borrador debería subirlos al storage, pero para no romper el flujo
        documentosAdjuntos: documentosBorrador
      });
      toast.success('Borrador guardado', {
        description: 'La respuesta ha sido guardada como borrador',
        icon: <Save className="w-4 h-4" />
      });
    } catch (error) {
      toast.error('Error al guardar borrador', { description: 'Intente nuevamente.' });
    }
  };

  const handleEnviarRespuesta = async () => {
    if (!contenidoRespuesta.trim()) {
      toast.error('Contenido requerido', {
        description: 'Debe escribir el contenido de la respuesta',
        icon: <AlertCircle className="w-4 h-4" />
      });
      return;
    }

    if (emails.length === 0) {
      toast.error('Destinatario requerido', {
        description: 'Debe ingresar al menos un correo destinatario',
        icon: <AlertCircle className="w-4 h-4" />
      });
      return;
    }

    try {
      setEnviando(true);

      // 1. Subir los archivos seleccionados al módulo de documentos (Directo a la zona de documentos)
      const nuevosArchivosUrls: { nombre: string; url: string }[] = [];
      const attachmentsForEmail: { name: string; contentBytes: string; contentType: string }[] = [];

      for (let i = 0; i < archivosSeleccionados.length; i++) {
        const archivoSel = archivosSeleccionados[i];
        const tipoDocBackend = CATEGORIES_REVERSE_MAP[archivoSel.categoria] || 'otro';

        // Subir al backend
        const doc = await ocService.createDocumento(requerimientoId, {
          nombre: archivoSel.archivo.name,
          tipoDocumento: tipoDocBackend,
          archivo: archivoSel.archivo,
          subidoPor: 'Usuario Actual' // TODO: Integrar auth real
        });

        nuevosArchivosUrls.push({ nombre: doc.nombre, url: doc.archivoUrl || '' });

        // Convertir a base64 para enviar por correo
        const contentBytes = await fileToBase64(archivoSel.archivo);
        attachmentsForEmail.push({
          name: archivoSel.archivo.name,
          contentBytes: contentBytes,
          contentType: archivoSel.archivo.type,
        });
      }

      // 2. Enviar el correo a través de Microsoft Graph (primer correo en to, resto en cc)
      await correosJuridicosService.sendEmail({
        to: emails[0],
        cc: emails.slice(1),
        subject: `Respuesta a Requerimiento ${radicado} - ${organismoNombre}`,
        body: contenidoRespuesta,
        attachments: attachmentsForEmail
      });

      // Registrar estado ENVIADO en el backend (el correo ya fue enviado arriba)
      await ocService.enviarRespuesta(requerimientoId, {
        destinatarioEmail: emails.join(','),
        asunto: `Respuesta a Requerimiento ${radicado} - ${organismoNombre}`,
        cuerpoMensaje: contenidoRespuesta,
        tipoRespuesta: tipoRespuesta,
        destinatarioNombre: '',
        destinatarioCargo: ''
      });

      toast.success('Respuesta enviada', {
        description: 'La respuesta ha sido enviada oficialmente.',
        icon: <Send className="w-4 h-4" />
      });

      if (onSuccess) onSuccess();
      setTimeout(() => onClose(), 1500);

    } catch (error: any) {
      console.error('Error enviando respuesta:', error);
      toast.error('Error al enviar', {
        description: error.message || 'No se pudo enviar el correo de respuesta.'
      });
    } finally {
      setEnviando(false);
    }
  };

  const handleAdjuntarDocumento = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = event.target.files;
    if (!archivos) return;

    const nuevosArchivos: DocumentoSeleccionado[] = [];

    Array.from(archivos).forEach((archivo) => {
      if (archivo.size > 50 * 1024 * 1024) {
        toast.error(`Archivo demasiado grande: ${archivo.name}`, {
          description: 'El tamaño máximo permitido es 50 MB'
        });
        return;
      }

      nuevosArchivos.push({
        archivo,
        categoria: categoriaActual
      });
    });

    if (nuevosArchivos.length > 0) {
      setArchivosSeleccionados([...archivosSeleccionados, ...nuevosArchivos]);
      toast.success(`${nuevosArchivos.length} archivo(s) adjuntado(s)`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEliminarSeleccionado = (index: number) => {
    const nuevosArchivos = archivosSeleccionados.filter((_, i) => i !== index);
    setArchivosSeleccionados(nuevosArchivos);
  };

  const handleCambiarCategoria = (index: number, nuevaCategoria: 'Requerimiento' | 'Respuesta' | 'Soporte' | 'Interno') => {
    setArchivosSeleccionados(prev => {
      const nuevos = [...prev];
      nuevos[index] = { ...nuevos[index], categoria: nuevaCategoria };
      return nuevos;
    });
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton style={{ maxWidth: '900px' }} className="fixed !left-1/2 !top-1/2 !z-[100] grid w-full !-translate-x-1/2 !-translate-y-1/2 gap-0 border bg-white p-0 shadow-lg duration-200 sm:rounded-lg !max-h-[85vh] overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">
          Elaborar Respuesta al Requerimiento {requerimientoId}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para elaborar y enviar respuesta oficial al requerimiento {requerimientoId} del órgano de control {organismoNombre}.
        </DialogDescription>

        {/* Header */}
        <div className="px-6 py-5 bg-white border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 border-2 border-green-200 rounded-lg">
              <Send className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Elaborar Respuesta</h2>
              <p className="text-sm text-gray-600">Radicado: {radicado} • {organismoNombre}</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* INFORMACIÓN DEL REQUERIMIENTO */}
          {isAlreadySent && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-bold text-sm text-orange-900">Respuesta Enviada</p>
                <p className="text-xs text-orange-700">Este requerimiento ya fue gestionado y enviado al órgano de control. No se permiten más ediciones.</p>
              </div>
            </div>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 flex-1">
                <p className="font-bold mb-1">📋 Información del Requerimiento</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-blue-700 mt-2">
                  <div>
                    <span className="font-semibold">Radicado:</span> {radicado}
                  </div>
                  <div>
                    <span className="font-semibold">Órgano:</span> {organismoNombre}
                  </div>
                  <div>
                    <span className="font-semibold">Plazo:</span> 5 días restantes ⏰
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TIPO DE RESPUESTA (Oculto por solicitud usuario) */}
          {/* <div className="space-y-2">
            <label className="text-sm font-bold text-gray-900">Tipo de Respuesta</label>
            <Select value={tipoRespuesta} onValueChange={setTipoRespuesta}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completa">✅ Respuesta Completa</SelectItem>
                <SelectItem value="parcial">⚠️ Respuesta Parcial (requiere información adicional)</SelectItem>
                <SelectItem value="termino">⏰ Solicitud de Ampliación de Término</SelectItem>
                <SelectItem value="impedimento">🚫 Impedimento Legal para Responder</SelectItem>
              </SelectContent>
            </Select>
          </div> */}

          {/* DATOS DEL DESTINATARIO */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-900 flex items-center gap-1">
              <Mail className="w-4 h-4 text-gray-600" />
              Correos destinatarios
            </label>

            {/* Chips de correos agregados */}
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                {emails.map((correo, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-full"
                  >
                    <AtSign className="w-3 h-3 flex-shrink-0" />
                    {correo}
                    {idx === 0 && (
                      <span className="ml-1 px-1 py-0.5 bg-blue-200 text-blue-700 text-[10px] rounded font-semibold">Principal</span>
                    )}
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => setEmails(prev => prev.filter((_, i) => i !== idx))}
                        className="ml-0.5 text-blue-400 hover:text-red-500 transition-colors"
                        title="Quitar correo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Input para agregar nuevo correo */}
            {!isReadOnly && (
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const val = emailInput.trim();
                      if (!val) return;
                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                        toast.error('Correo electrónico inválido');
                        return;
                      }
                      if (emails.includes(val)) {
                        toast.error('Este correo ya está en la lista');
                        return;
                      }
                      setEmails(prev => [...prev, val]);
                      setEmailInput('');
                    }
                  }}
                  placeholder={emails.length === 0 ? 'correo@entidad.gov.co (Enter para agregar)' : 'Agregar otro correo...'}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const val = emailInput.trim();
                    if (!val) return;
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                      toast.error('Correo electrónico inválido');
                      return;
                    }
                    if (emails.includes(val)) {
                      toast.error('Este correo ya está en la lista');
                      return;
                    }
                    setEmails(prev => [...prev, val]);
                    setEmailInput('');
                  }}
                  className="flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
            {emails.length > 1 && (
              <p className="text-xs text-gray-500">El primer correo es el destinatario principal, el resto van en copia (CC).</p>
            )}
          </div>

          {/* BOTÓN PARA APLICAR TEMPLATE - REMOVED */}
          {/* <div className="flex items-center gap-2">
             ... buttons removed ...
          </div> */}

          {/* EDITOR DE CONTENIDO */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-900 flex items-center gap-1">
              <Mail className="w-4 h-4 text-gray-600" />
              Contenido de la Respuesta
            </label>
            <Textarea
              value={contenidoRespuesta}
              onChange={(e) => setContenidoRespuesta(e.target.value)}
              placeholder="Escriba aquí el contenido de la respuesta oficial al órgano de control..."
              rows={16}
              className="font-mono text-sm"
              disabled={isReadOnly}
            />
            <p className="text-xs text-gray-500">
              {contenidoRespuesta.length} caracteres • Se recomienda usar el template oficial
            </p>
          </div>

          {/* DOCUMENTOS ADJUNTOS CON CATEGORÍAS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-900 flex items-center gap-1">
                <Upload className="w-4 h-4 text-gray-600" />
                Documentos Adjuntos ({archivosSeleccionados.length + documentosBorrador.length})
              </label>
            </div>

            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-white hover:bg-blue-50 transition-colors">
              <div className="text-center">
                <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">
                  Añade los documentos de respuesta y/o soportes que se enviarán por correo y se indexarán al expediente.
                </p>
                <Button
                  onClick={handleAdjuntarDocumento}
                  style={{ background: '#003DA5' }}
                  className="text-white font-bold"
                  disabled={isReadOnly}
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  📂 Seleccionar Archivo
                </Button>
              </div>
            </div>

            {/* Listado de Archivos Seleccionados */}
            {archivosSeleccionados.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto mt-4">
                {archivosSeleccionados.map((archivoSel, index) => (
                  <div
                    key={`new-${index}`}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getIconoTipo(getTipoArchivo(archivoSel.archivo.type))}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {archivoSel.archivo.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatearTamano(archivoSel.archivo.size)}
                        </p>
                      </div>
                      <select
                        value={archivoSel.categoria}
                        onChange={(e: any) => handleCambiarCategoria(index, e.target.value)}
                        disabled={isReadOnly}
                        className="h-8 w-[140px] rounded-md border border-gray-200 bg-gray-50 px-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Requerimiento">Requerimiento</option>
                        <option value="Respuesta">Respuesta</option>
                        <option value="Soporte">Soporte</option>
                        <option value="Interno">Interno</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEliminarSeleccionado(index)}
                        className="text-red-600 hover:bg-red-50"
                        disabled={isReadOnly}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Documentos del Borrador (antiguos) */}
            {documentosBorrador.length > 0 && (
              <div className="space-y-2 mt-4">
                <h4 className="text-xs font-bold text-gray-600 uppercase">Documentos de Borradores Anteriores</h4>
                {documentosBorrador.map((doc, idx) => (
                  <div
                    key={`borrador-${idx}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-600" />
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900 font-medium">{doc.nombre}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDocumentosBorrador(documentosBorrador.filter((_, i) => i !== idx));
                        toast.info('Documento removido del borrador');
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={isReadOnly}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              multiple
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* CHECKLIST DE VERIFICACIÓN */}
          <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="font-bold text-lg text-yellow-900 mb-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6" />
              ✅ Checklist de Verificación antes de Enviar
            </p>
            <div className="space-y-3 text-sm text-yellow-800">
              <label className="flex items-start gap-3 cursor-pointer hover:bg-yellow-100/50 p-1 rounded-sm transition-colors">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 cursor-pointer"
                  checked={checklistItems.completitud}
                  onChange={(e) => setChecklistItems({ ...checklistItems, completitud: e.target.checked })}
                />
                <span className="leading-tight">La respuesta responde TODOS los puntos solicitados en el requerimiento</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer hover:bg-yellow-100/50 p-1 rounded-sm transition-colors">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 cursor-pointer"
                  checked={checklistItems.documentos}
                  onChange={(e) => setChecklistItems({ ...checklistItems, documentos: e.target.checked })}
                />
                <span className="leading-tight">Se adjuntan los documentos de soporte necesarios</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer hover:bg-yellow-100/50 p-1 rounded-sm transition-colors">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 cursor-pointer"
                  checked={checklistItems.redaccion}
                  onChange={(e) => setChecklistItems({ ...checklistItems, redaccion: e.target.checked })}
                />
                <span className="leading-tight">La redacción es clara, precisa y profesional</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer hover:bg-yellow-100/50 p-1 rounded-sm transition-colors">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 cursor-pointer"
                  checked={checklistItems.verificacion}
                  onChange={(e) => setChecklistItems({ ...checklistItems, verificacion: e.target.checked })}
                />
                <span className="leading-tight">Los datos y cifras están verificados con las áreas técnicas</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer hover:bg-yellow-100/50 p-1 rounded-sm transition-colors">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 cursor-pointer"
                  checked={checklistItems.formato}
                  onChange={(e) => setChecklistItems({ ...checklistItems, formato: e.target.checked })}
                />
                <span className="leading-tight">El formato cumple con los estándares institucionales</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer hover:bg-yellow-100/50 p-1 rounded-sm transition-colors">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 cursor-pointer"
                  checked={checklistItems.termino}
                  onChange={(e) => setChecklistItems({ ...checklistItems, termino: e.target.checked })}
                />
                <span className="leading-tight">La respuesta se envía dentro del término legal</span>
              </label>
            </div>
          </div>

          {/* INFORMACIÓN LEGAL */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-purple-900">
                <p className="font-bold mb-1">⚖️ Consideraciones Legales:</p>
                <ul className="list-disc list-inside space-y-1 text-purple-700">
                  <li>La respuesta debe ser completa, veraz y oportuna</li>
                  <li>El incumplimiento del término puede generar sanciones institucionales</li>
                  <li>Toda información suministrada debe estar soportada documentalmente</li>
                  <li>La respuesta debe ser firmada por el funcionario competente</li>
                  <li>Se recomienda conservar constancia de entrega al órgano de control</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <div className="flex items-center gap-2">
            {authService.hasPermission(Permissions.GESTION_LEGAL_ORGANOS_CONTROL_RESPUESTA_ERASE) && (
              <Button
                variant="outline"
                onClick={handleGuardarBorrador}
                disabled={isReadOnly}
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Borrador
              </Button>
            )}

            {authService.hasPermission(Permissions.GESTION_LEGAL_ORGANOS_CONTROL_RESPUESTA_SEND) && (
              <Button
                onClick={handleEnviarRespuesta}
                style={{ background: isReadOnly ? undefined : '#10B981' }}
                className={isReadOnly ? "bg-gray-400 cursor-not-allowed text-white" : "text-white"}
                disabled={!contenidoRespuesta.trim() || enviando || isReadOnly || !Object.values(checklistItems).every(v => v)}
              >
                {enviando ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {enviando ? 'Enviando...' : 'Enviar Respuesta'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog >
  );
}