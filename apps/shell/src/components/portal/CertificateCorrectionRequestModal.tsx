import { useEffect, useRef, useState, type DragEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileImage,
  FileText,
  Loader2,
  Paperclip,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { certificadosService, type SolicitudCorreccionCreada } from '../../services/api/certificados.service';

const MAX_FILES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);

type CertificateCorrectionRequestModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateId: string;
  verificationCode: string;
  certificateNumber: string;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value: string) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export function CertificateCorrectionRequestModal({
  open,
  onOpenChange,
  certificateId,
  verificationCode,
  certificateNumber,
}: CertificateCorrectionRequestModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SolicitudCorreccionCreada | null>(null);

  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => {
        setDescription('');
        setFiles([]);
        setError('');
        setProgress(0);
        setResult(null);
      }, 250);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  const addFiles = (incoming: File[]) => {
    setError('');
    const next = [...files];
    for (const file of incoming) {
      if (next.length >= MAX_FILES) {
        setError('Puedes adjuntar máximo tres archivos.');
        break;
      }
      if (!ACCEPTED_MIME_TYPES.has(file.type)) {
        setError(`${file.name}: el formato no es válido. Usa PDF, PNG, JPG o JPEG.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name}: el archivo supera el máximo de 10 MB.`);
        continue;
      }
      if (next.some((current) => current.name === file.name && current.size === file.size)) continue;
      next.push(file);
    }
    setFiles(next);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files || []));
  };

  const submit = async () => {
    const normalizedDescription = description.trim();
    if (normalizedDescription.length < 20) {
      setError('Describe el error con al menos 20 caracteres para que podamos revisarlo.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setProgress(1);
    try {
      const response = await certificadosService.correcciones.crearSolicitud(
        certificateId,
        verificationCode,
        normalizedDescription,
        files,
        setProgress,
      );
      setProgress(100);
      setResult(response);
    } catch (requestError: any) {
      setError(requestError?.message || 'No fue posible enviar la solicitud. Intenta nuevamente.');
      setProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingFiles = Math.max(0, MAX_FILES - files.length);
  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setError('');
  };

  const downloadFile = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const downloadLink = document.createElement('a');
    downloadLink.href = objectUrl;
    downloadLink.download = file.name;
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)}>
      <DialogContent hideCloseButton className={`certificate-correction-modal ${result ? 'certificate-correction-modal--result' : ''} w-[calc(100vw-1.25rem)] max-w-xl overflow-x-hidden overflow-y-auto gap-0 rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl`}>
        {result ? (
          <div className="certificate-correction-result p-6 text-center sm:p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.55, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.08, type: 'spring', stiffness: 380, damping: 20 }}
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50"
            >
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </motion.div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Solicitud enviada exitosamente</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
              El equipo de Certificados Laborales revisará la información y las evidencias. Recibirás la respuesta en el correo registrado.
            </p>

            <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-left">
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Número de solicitud</p>
                  <p className="mt-1 break-all font-mono text-sm font-bold text-[#003DA5]">{result.request_number}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fecha máxima de respuesta</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <CalendarDays className="h-4 w-4 text-[#003DA5]" />
                    {formatDate(result.due_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 border-t border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900">
                <Clock3 className="mt-0.5 h-5 w-5 flex-none text-blue-600" />
                <p>El plazo máximo de atención es de <strong>15 días hábiles</strong> contados desde el envío.</p>
              </div>
            </div>

            <Button onClick={() => onOpenChange(false)} className="mt-6 h-11 w-full bg-[#003DA5] font-bold text-white hover:bg-[#002D7A] hover:text-white sm:w-auto sm:min-w-44">
              Entendido
            </Button>
          </div>
        ) : (
          <>
            <div className="certificate-correction-modal__header sticky top-0 z-30 px-5 py-6 sm:px-7 sm:py-7">
              <button
                type="button"
                aria-label="Cerrar solicitud de corrección"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
                className="certificate-correction-modal__close disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Cerrar</span>
              </button>
              <div className="flex items-start gap-3.5 pr-7">
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <DialogHeader className="text-left">
                  <DialogTitle className="text-xl font-bold leading-7 text-white sm:text-2xl">Solicitar corrección</DialogTitle>
                  <DialogDescription className="text-sm leading-5 text-blue-100">
                    Reporta los datos que requieren revisión en tu certificado laboral.
                  </DialogDescription>
                  <div className="mt-2 inline-flex w-fit items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-xs text-blue-100 ring-1 ring-white/15">
                    <span>Certificado</span><span className="font-mono font-bold text-white">{certificateNumber}</span>
                  </div>
                </DialogHeader>
              </div>
            </div>

            <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 px-3 py-3 sm:px-7">
              {['Describe el error', 'Adjunta soportes', 'Envía la solicitud'].map((step, index) => (
                <div key={step} className={`flex items-center justify-center gap-2 px-1 text-center text-[10px] font-semibold text-slate-600 sm:text-xs ${index > 0 ? 'border-l border-slate-200' : ''}`}>
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-[#003DA5]">{index + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>

            <motion.div layout transition={{ layout: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }} className="min-w-0 space-y-5 p-5 sm:p-7">
              <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3.5">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-[#003DA5]" />
                <p className="text-sm leading-5 text-slate-700">
                  Explica con precisión qué dato está incorrecto y cuál debería ser el valor correcto. Esto agiliza la revisión.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <Label htmlFor="correction-description" className="font-bold text-slate-800">Descripción del error <span className="text-red-500">*</span></Label>
                  <span className={`text-xs ${description.length > 2000 ? 'text-red-600' : 'text-slate-400'}`}>{description.length}/2000</span>
                </div>
                <Textarea
                  id="correction-description"
                  value={description}
                  maxLength={2000}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Ejemplo: La fecha de vinculación que aparece es 14/05/2024, pero la fecha correcta es..."
                  className="min-h-28 resize-none rounded-lg border-slate-300 text-sm leading-6 focus-visible:border-[#003DA5] focus-visible:ring-[#003DA5]/20 focus-visible:ring-offset-1"
                />
                <div className="flex items-center justify-between gap-3 text-xs" aria-live="polite">
                  <motion.p
                    key={description.trim().length >= 20 ? 'valid' : 'pending'}
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={description.trim().length >= 20 ? 'font-medium text-emerald-700' : description.length > 0 ? 'font-medium text-amber-700' : 'text-slate-500'}
                  >
                    {description.trim().length >= 20
                      ? '✓ Descripción lista para enviar.'
                      : description.length > 0
                        ? `Completa ${Math.max(0, 20 - description.trim().length)} caracteres más.`
                        : 'Mínimo 20 caracteres.'}
                  </motion.p>
                  {description.trim().length >= 20 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-200">Completo</span>}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label className="font-bold text-slate-800">Evidencias <span className="font-normal text-slate-500">(opcional)</span></Label>
                    <p className="mt-1 text-xs text-slate-500">PDF, PNG, JPG o JPEG · máximo 10 MB por archivo.</p>
                  </div>
                  <motion.span
                    key={files.length}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`flex flex-none items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${files.length === MAX_FILES ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-blue-50 text-[#003DA5] ring-blue-200'}`}
                    aria-live="polite"
                  >
                    <Paperclip className="h-3.5 w-3.5" /> {files.length}/{MAX_FILES}
                  </motion.span>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  className="hidden"
                  onChange={(event) => {
                    addFiles(Array.from(event.target.files || []));
                    event.target.value = '';
                  }}
                />
                <div
                  role="button"
                  tabIndex={0}
                  aria-disabled={remainingFiles === 0}
                  onClick={() => remainingFiles > 0 && inputRef.current?.click()}
                  onKeyDown={(event) => remainingFiles > 0 && (event.key === 'Enter' || event.key === ' ') && inputRef.current?.click()}
                  onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  className={`rounded-xl border-2 border-dashed px-5 py-6 text-center outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#003DA5]/25 ${remainingFiles === 0 ? 'cursor-default border-emerald-200 bg-emerald-50/60' : `cursor-pointer hover:-translate-y-0.5 hover:shadow-sm ${isDragging ? 'border-[#003DA5] bg-blue-50' : 'border-slate-300 bg-slate-50/70 hover:border-[#003DA5] hover:bg-blue-50/60'}`}`}
                >
                  <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full ${remainingFiles === 0 ? 'bg-emerald-100' : 'bg-blue-100'}`}>{remainingFiles === 0 ? <CheckCircle2 className="h-6 w-6 text-emerald-700" /> : <UploadCloud className="h-6 w-6 text-[#003DA5]" />}</div>
                  <p className="mt-2 text-sm font-bold text-slate-800">{remainingFiles === 0 ? 'Completaste los 3 archivos permitidos' : 'Arrastra tus archivos aquí'}</p>
                  <p className="mt-1 text-xs text-slate-500">{remainingFiles === 0 ? 'Elimina uno si necesitas reemplazarlo' : `o haz clic para seleccionar · ${remainingFiles} ${remainingFiles === 1 ? 'cupo disponible' : 'cupos disponibles'}`}</p>
                </div>

                <AnimatePresence initial={false} mode="popLayout">
                  {files.length > 0 && (
                    <motion.div
                      layout
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                      className="min-w-0 space-y-2 overflow-x-hidden"
                    >
                      {files.map((file, index) => {
                        const isPdf = file.type === 'application/pdf';
                        const extension = isPdf ? 'PDF' : file.name.split('.').pop()?.toUpperCase() || 'IMG';
                        return (
                          <motion.div
                            layout
                            key={`${file.name}-${file.size}`}
                            initial={{ opacity: 0, y: -8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 18, scale: 0.97 }}
                            transition={{ duration: 0.18 }}
                            className={`flex min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm ${isPdf ? 'border-red-200 bg-red-50/70' : 'border-blue-200 bg-blue-50/70'}`}
                          >
                            <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${isPdf ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                              {isPdf ? <FileText className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p title={file.name} className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${isPdf ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{extension}</span>
                                <span className="text-xs text-slate-500">{formatBytes(file.size)}</span>
                              </div>
                            </div>
                            <div className="flex flex-none items-center gap-2">
                              <button
                                type="button"
                                title={`Descargar ${file.name}`}
                                aria-label={`Descargar ${file.name}`}
                                onClick={() => downloadFile(file)}
                                className="group/download flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-blue-200 bg-white text-[#003DA5] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-blue-300 hover:bg-blue-100 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                              >
                                <Download className="h-4 w-4 transition-transform duration-200 group-hover/download:translate-y-0.5" />
                              </button>
                              <button
                                type="button"
                                title={`Eliminar ${file.name}`}
                                aria-label={`Eliminar ${file.name}`}
                                onClick={() => removeFile(index)}
                                className="group/delete flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-red-300 hover:bg-red-100 hover:text-red-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                              >
                                <X className="h-4 w-4 transition-transform duration-200 group-hover/delete:rotate-90" />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                    <span className="flex-1">{error}</span>
                    <button type="button" aria-label="Cerrar aviso" onClick={() => setError('')} className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-red-600 transition hover:bg-red-100"><X className="h-3.5 w-3.5" /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              {isSubmitting && (
                <div className="space-y-2" aria-live="polite">
                  <div className="flex justify-between text-xs font-semibold text-slate-600"><span>Enviando solicitud...</span><span>{Math.max(1, progress)}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#003DA5] transition-all" style={{ width: `${Math.max(3, progress)}%` }} /></div>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-[#003DA5]" />
                <p>Las evidencias serán consultadas únicamente por el equipo autorizado de Certificados Laborales.</p>
              </div>

              <div className="certificate-correction-modal__footer flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)} className="h-11 rounded-md border-slate-300 bg-white px-5 font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900">Cancelar</Button>
                <Button disabled={isSubmitting || description.trim().length < 20 || description.length > 2000} onClick={submit} className="h-11 rounded-md bg-[#003DA5] px-6 font-bold text-white hover:bg-[#002D7A] hover:text-white">
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : <><Paperclip className="mr-2 h-4 w-4" />Enviar solicitud</>}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
