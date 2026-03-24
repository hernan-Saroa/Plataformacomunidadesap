
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Textarea } from '../../../ui/textarea';
import { SolicitudInforme } from '../core/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Clock, Calendar, FileText, User, AlertTriangle, CheckCircle,
    Hash, Download, MessageSquare, Plus, Loader2
} from 'lucide-react';
import { useState } from 'react';
import { legalService } from '../../../../services/api/legal.service';
import { toast } from 'sonner';
import { getServiceUrl, API_MODE } from '../../../../config/environment';

interface ModalDetalleTerminoProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    solicitud: SolicitudInforme | null;
}

function getFileDownloadUrl(fileUrl: string, nombre: string): string {
    // fileUrl stored as "files/filename.ext" or just "filename.ext" by backend
    const filename = fileUrl.includes('/') ? fileUrl.split('/').pop()! : fileUrl;
    const baseUrl = getServiceUrl('legal');
    const prefix = API_MODE === 'direct' ? '' : '/legal';
    return `${baseUrl}${prefix}/files/download/${filename}?name=${encodeURIComponent(nombre)}`;
}

export function ModalDetalleTermino({ open, onOpenChange, solicitud }: ModalDetalleTerminoProps) {
    const [documentos, setDocumentos] = useState<any[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [notas, setNotas] = useState<any[]>([]);
    const [loadingNotas, setLoadingNotas] = useState(false);
    const [nuevaNota, setNuevaNota] = useState('');
    const [guardandoNota, setGuardandoNota] = useState(false);
    const [view, setView] = useState<'info' | 'docs' | 'notas'>('info');

    if (!solicitud) return null;

    const terminoId = (solicitud as any).metadata?.uuid || solicitud.id;

    const diasRestantes = solicitud.diasRestantes;
    let semaforoColor = 'text-green-600 bg-green-50 border-green-200';
    let semaforoIcon = <CheckCircle className="w-5 h-5 text-green-600" />;
    if (diasRestantes <= 2) {
        semaforoColor = 'text-red-600 bg-red-50 border-red-200';
        semaforoIcon = <AlertTriangle className="w-5 h-5 text-red-600" />;
    } else if (diasRestantes <= 5) {
        semaforoColor = 'text-yellow-600 bg-yellow-50 border-yellow-200';
        semaforoIcon = <Clock className="w-5 h-5 text-yellow-600" />;
    }

    const handleFetchDocs = async () => {
        setView('docs');
        if (documentos.length > 0) return;
        setLoadingDocs(true);
        try {
            const data = await legalService.getDocumentosTermino(terminoId);
            setDocumentos(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Error al cargar documentos');
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleFetchNotas = async () => {
        setView('notas');
        setLoadingNotas(true);
        try {
            const data = await legalService.getNotasTermino(terminoId);
            setNotas(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Error al cargar notas');
        } finally {
            setLoadingNotas(false);
        }
    };

    const handleAddNota = async () => {
        if (!nuevaNota.trim()) return;
        setGuardandoNota(true);
        try {
            const nota = await legalService.addNotaTermino(terminoId, nuevaNota.trim());
            setNotas(prev => [nota, ...prev]);
            setNuevaNota('');
            toast.success('Nota agregada correctamente');
        } catch {
            toast.error('Error al guardar la nota');
        } finally {
            setGuardandoNota(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden p-0">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-xl font-bold text-[#003DA5] truncate">
                                {solicitud.asunto}
                            </DialogTitle>
                            <DialogDescription className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge variant="outline" className="flex items-center gap-1">
                                    <Hash className="w-3 h-3" />
                                    {solicitud.id}
                                </Badge>
                                <Badge variant="outline">{solicitud.tipoInforme}</Badge>
                            </DialogDescription>
                        </div>
                        <div className={`flex-shrink-0 flex flex-col items-center justify-center px-4 py-2 rounded-lg border ${semaforoColor}`}>
                            {semaforoIcon}
                            <span className="text-sm font-bold mt-1">
                                {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex gap-0 border-b border-gray-200 px-6 flex-shrink-0 bg-white">
                    <button
                        onClick={() => setView('info')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${view === 'info' ? 'border-[#003DA5] text-[#003DA5]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Información
                    </button>
                    <button
                        onClick={handleFetchDocs}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${view === 'docs' ? 'border-[#003DA5] text-[#003DA5]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Documentos
                    </button>
                    <button
                        onClick={handleFetchNotas}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${view === 'notas' ? 'border-[#003DA5] text-[#003DA5]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Notas
                        {notas.length > 0 && (
                            <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                                {notas.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content area */}
                <div className="flex-1 overflow-y-auto px-6 py-5">

                    {/* INFORMACIÓN */}
                    {view === 'info' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5" /> Fecha Límite
                                        </h4>
                                        <p className="font-semibold text-gray-900">
                                            {format(new Date(solicitud.fechaVencimiento), 'PPP', { locale: es })}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5" /> Fecha Solicitud
                                        </h4>
                                        <p className="font-semibold text-gray-900">
                                            {format(new Date(solicitud.fechaSolicitud), 'PPP', { locale: es })}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-2">
                                            <User className="w-3.5 h-3.5" /> Solicitante
                                        </h4>
                                        <p className="font-semibold text-gray-900">{solicitud.enteSolicitante}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-2">
                                            <User className="w-3.5 h-3.5" /> Responsable
                                        </h4>
                                        <p className="font-semibold text-gray-900">{solicitud.responsable}</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" /> Descripción / Hechos
                                </h4>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm text-gray-700 min-h-[80px] max-h-[180px] overflow-y-auto leading-relaxed">
                                    {solicitud.descripcion || 'Sin descripción disponible.'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DOCUMENTOS */}
                    {view === 'docs' && (
                        <div className="min-h-[180px]">
                            {loadingDocs ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                </div>
                            ) : documentos.length === 0 ? (
                                <div className="text-center text-gray-400 py-10">
                                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No hay documentos asociados disponibles.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {documentos.map((doc, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex-shrink-0 p-2 bg-white rounded-lg border border-gray-200">
                                                    <FileText className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm text-gray-900 truncate">{doc.nombre || 'Documento sin nombre'}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {doc.tipo || 'Archivo'}
                                                        {doc.fecha ? ` • ${new Date(doc.fecha).toLocaleDateString('es-CO')}` : ''}
                                                        {doc.tamaño ? ` • ${doc.tamaño}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            {doc.url && (
                                                <Button
                                                    size="sm" variant="ghost"
                                                    className="flex-shrink-0 h-8 w-8 p-0 text-gray-500 hover:text-green-600 hover:bg-green-50"
                                                    title="Descargar"
                                                    onClick={() => window.open(getFileDownloadUrl(doc.url, doc.nombre || 'documento'), '_blank')}
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* NOTAS */}
                    {view === 'notas' && (
                        <div className="space-y-4">
                            {/* Input nueva nota */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                                <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    Agregar nueva nota
                                </h4>
                                <Textarea
                                    placeholder="Escribe una nota o comentario sobre este término..."
                                    value={nuevaNota}
                                    onChange={(e) => setNuevaNota(e.target.value)}
                                    className="bg-white border-blue-200 focus:border-blue-400 min-h-[80px] text-sm resize-none"
                                    onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleAddNota(); }}
                                />
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-blue-600">Ctrl+Enter para guardar</span>
                                    <Button
                                        size="sm"
                                        onClick={handleAddNota}
                                        disabled={!nuevaNota.trim() || guardandoNota}
                                        className="bg-[#003DA5] hover:bg-blue-800 text-white"
                                    >
                                        {guardandoNota ? (
                                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Guardando...</>
                                        ) : (
                                            <><MessageSquare className="w-3.5 h-3.5 mr-1.5" />Guardar nota</>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Lista de notas */}
                            {loadingNotas ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                </div>
                            ) : notas.length === 0 ? (
                                <div className="text-center text-gray-400 py-8">
                                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No hay notas registradas aún.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {notas.map((nota, idx) => (
                                        <div key={idx} className="flex gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 bg-[#003DA5] rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">
                                                {(nota.usuario || 'S')[0].toUpperCase()}
                                            </div>
                                            <div className="flex-1 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs font-bold text-gray-700">{nota.usuario || 'Sistema'}</span>
                                                    <span className="text-xs text-gray-400">
                                                        {nota.fecha ? new Date(nota.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-800 leading-relaxed">{nota.texto}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
