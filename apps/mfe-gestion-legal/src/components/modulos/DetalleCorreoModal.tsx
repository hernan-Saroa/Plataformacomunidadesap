import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Mail, AlertTriangle, FileText, Eye, Download, Archive, User, Calendar, MapPin, Hash, Reply, Link, Search, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { correosJuridicosService } from '../../../../services/api/legal.service';

interface DetalleCorreoModalProps {
    isOpen: boolean;
    onClose: () => void;
    notificacion: any;
    onVerAdjunto?: (url: string) => void;
    onReply?: (correoId: string, destinatario: string, asunto: string, cuerpoOriginal: string) => void;
    onForward?: (correoId: string, asunto: string, cuerpoOriginal: string) => void;
    onVincular?: (correoId: string, expedienteId: string, targetModule: string) => void;
}

export function DetalleCorreoModal({ isOpen, onClose, notificacion, onVerAdjunto, onReply, onForward, onVincular }: DetalleCorreoModalProps) {
    const [moduloSeleccionado, setModuloSeleccionado] = useState<'DEFENSA_JUDICIAL' | 'JUZGAMIENTO_DISCIPLINARIO' | ''>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [procesos, setProcesos] = useState<any[]>([]);
    const [procesoSeleccionado, setProcesoSeleccionado] = useState<any>(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [vinculando, setVinculando] = useState(false);
    const [showVinculador, setShowVinculador] = useState(false);
    const [fullBodyHtml, setFullBodyHtml] = useState<string | null>(null);
    const [loadingBody, setLoadingBody] = useState(false);

    // Reset state when modal closes or correo changes
    useEffect(() => {
        if (!isOpen) {
            setModuloSeleccionado('');
            setSearchQuery('');
            setProcesos([]);
            setProcesoSeleccionado(null);
            setShowVinculador(false);
            setFullBodyHtml(null);
        }
    }, [isOpen]);

    // Lazy-load full HTML body (with images) when modal opens
    useEffect(() => {
        if (isOpen && notificacion?.id) {
            setLoadingBody(true);
            correosJuridicosService.getCorreo(notificacion.id)
                .then((full: any) => {
                    if (full?.cuerpoHtml) {
                        setFullBodyHtml(full.cuerpoHtml);
                    }
                })
                .catch((err: any) => console.warn('Could not load full body:', err))
                .finally(() => setLoadingBody(false));
        }
    }, [isOpen, notificacion?.id]);

    // Pre-select suggested module if available
    useEffect(() => {
        if (notificacion?.submoduloSugerido) {
            setModuloSeleccionado(notificacion.submoduloSugerido);
        }
    }, [notificacion?.submoduloSugerido]);

    // Debounced search
    const searchProcesos = useCallback(async (query: string) => {
        if (!moduloSeleccionado || query.length < 2) {
            setProcesos([]);
            return;
        }

        setSearchLoading(true);
        try {
            let results: any[] = [];
            if (moduloSeleccionado === 'DEFENSA_JUDICIAL') {
                results = await correosJuridicosService.searchProcesosDefensa(query);
            } else {
                results = await correosJuridicosService.searchProcesosJuzgamiento(query);
            }
            setProcesos(Array.isArray(results) ? results.slice(0, 10) : []);
        } catch (error) {
            console.error('Error buscando procesos:', error);
            setProcesos([]);
        } finally {
            setSearchLoading(false);
        }
    }, [moduloSeleccionado]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length >= 2) {
                searchProcesos(searchQuery);
            } else {
                setProcesos([]);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery, searchProcesos]);

    // Load all processes when module is selected (no search needed)
    useEffect(() => {
        if (moduloSeleccionado && !searchQuery) {
            searchProcesos('');
        }
    }, [moduloSeleccionado]);

    const handleVincular = async () => {
        if (!procesoSeleccionado || !notificacion?.id) return;

        setVinculando(true);
        try {
            const expedienteId = procesoSeleccionado.id || procesoSeleccionado.expedienteId;
            if (onVincular) {
                onVincular(notificacion.id, expedienteId, moduloSeleccionado);
            } else {
                await correosJuridicosService.vincularProceso(notificacion.id, expedienteId, moduloSeleccionado);
                toast.success('Oficio vinculado al proceso correctamente');
                onClose();
            }
        } catch (error) {
            console.error('Error vinculando:', error);
            toast.error('Error al vincular oficio');
        } finally {
            setVinculando(false);
        }
    };

    if (!notificacion) return null;

    // Normalizar datos
    const data = {
        id: notificacion.id,
        remitente: notificacion.remitente || notificacion.remitenteNombre || notificacion.remitenteEmail || notificacion.metadata?.remitente || 'Desconocido',
        remitenteEmail: notificacion.remitenteEmail || '',
        destinatario: notificacion.destinatario || notificacion.destinatariosTo || notificacion.metadata?.destinatario || 'Desconocido',
        asunto: notificacion.asunto || notificacion.metadata?.subject || notificacion.descripcion || 'Sin asunto',
        fecha: notificacion.fecha || notificacion.fechaRecepcion || notificacion.metadata?.emailDate || notificacion.fechaActuacion || notificacion.fechaRadicacion,
        contenido: notificacion.contenido || notificacion.cuerpoHtml || notificacion.metadata?.body || notificacion.descripcion || '',
        urgente: notificacion.urgente || notificacion.prioridad === 'Alta',
        despacho: notificacion.despachoOrigen || notificacion.metadata?.despacho || 'No especificado',
        radicadoExterno: notificacion.radicadoExterno || notificacion.metadata?.radicadoExterno,
        tipoProceso: notificacion.tipoProceso || notificacion.metadata?.tipoProceso || 'General',
        tipo: notificacion.tipo || 'CORREO',
        isReplied: notificacion.isReplied || false,
        // IA data
        clasificacionIA: notificacion.clasificacionIA,
        moduloSugerido: notificacion.moduloSugerido || notificacion.clasificacionIA?.moduloSugerido,
        confianza: notificacion.confianzaClasificacion || notificacion.clasificacionIA?.confianza,
        procesoIdSugerido: notificacion.procesoIdSugerido,
        implicadoSugerido: notificacion.implicadoSugerido,
        submoduloSugerido: notificacion.submoduloSugerido,
    };

    const formattedDate = data.fecha ? new Date(data.fecha).toLocaleString() : 'Fecha desconocida';
    const isOficio = data.tipo === 'OFICIO' || data.tipo === 'JUDICIAL';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden bg-gray-50/50 max-h-[90vh] overflow-y-auto">
                <DialogHeader className="p-6 pb-2 bg-white border-b border-gray-100">
                    <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Mail className="w-6 h-6 text-blue-600" />
                        </div>
                        <span>Detalle del Correo</span>
                        {data.urgente && (
                            <Badge variant="destructive" className="ml-2">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Urgente
                            </Badge>
                        )}
                        {data.isReplied && (
                            <Badge className="ml-2 bg-green-100 text-green-700 border-green-200">
                                <Reply className="w-3 h-3 mr-1" />
                                Respondido
                            </Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-6 bg-white">
                    {/* Cabecera del mensaje */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 bg-gray-50/50 border-b border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3">
                                <User className="w-4 h-4 text-gray-400 mt-1" />
                                <div>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Remitente</span>
                                    <p className="font-semibold text-gray-900">{data.remitente}</p>
                                    <p className="text-xs text-gray-500">{data.despacho}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <User className="w-4 h-4 text-gray-400 mt-1" />
                                <div>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Destinatario</span>
                                    <p className="font-semibold text-gray-900">{data.destinatario}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <div>
                                    <span className="text-xs font-bold text-gray-500 mr-2">FECHA:</span>
                                    <span className="text-sm font-medium text-gray-900">{formattedDate}</span>
                                </div>
                            </div>
                            {data.radicadoExterno && (
                                <div className="flex items-center gap-2">
                                    <Hash className="w-4 h-4 text-gray-400" />
                                    <div>
                                        <span className="text-xs font-bold text-gray-500 mr-2">RADICADO:</span>
                                        <span className="text-sm font-medium text-gray-900">{data.radicadoExterno}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Asunto y Contenido */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 leading-tight">{data.asunto}</h3>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                                    {data.tipoProceso}
                                </Badge>
                            </div>
                        </div>

                        <div className="prose prose-sm max-w-none">
                            {loadingBody ? (
                                <div className="min-h-[150px] max-h-[300px] flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                                    <span className="text-sm text-gray-500">Cargando contenido...</span>
                                </div>
                            ) : (fullBodyHtml || (data.contenido && data.contenido.includes('<'))) ? (
                                <div
                                    className="min-h-[150px] max-h-[400px] overflow-y-auto p-4 bg-white rounded-lg border border-gray-200 text-gray-800 text-sm shadow-inner [&_img]:max-w-full [&_img]:h-auto"
                                    dangerouslySetInnerHTML={{ __html: fullBodyHtml || data.contenido }}
                                />
                            ) : (
                                <div className="min-h-[150px] max-h-[300px] overflow-y-auto p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 text-sm shadow-inner whitespace-pre-wrap">
                                    {data.contenido || 'Sin contenido disponible'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Adjuntos */}
                    {(notificacion.url || notificacion.documentoUrl) && (
                        <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg border border-blue-100 shadow-sm">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Documento Adjunto Original</p>
                                    <p className="text-xs text-blue-600">Disponible para visualización</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {onVerAdjunto && (
                                    <Button
                                        size="sm"
                                        onClick={() => onVerAdjunto(notificacion.url || notificacion.documentoUrl)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                    >
                                        <Eye className="w-4 h-4 mr-1.5" />
                                        Ver Documento
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══ CLASIFICACIÓN IA + VINCULACIÓN ═══ */}
                    {(data.clasificacionIA || data.moduloSugerido || isOficio) && (
                        <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 overflow-hidden">
                            {/* IA Suggestion Header */}
                            <div className="p-4 border-b border-purple-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-5 h-5 text-purple-600" />
                                    <h4 className="font-bold text-purple-900">Clasificación IA</h4>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-white rounded-lg p-2.5 border border-purple-100">
                                        <span className="text-[10px] font-bold text-purple-500 uppercase">Módulo</span>
                                        <p className="text-xs font-semibold text-gray-900 truncate">{data.moduloSugerido || 'No determinado'}</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-2.5 border border-purple-100">
                                        <span className="text-[10px] font-bold text-purple-500 uppercase">Confianza</span>
                                        <p className="text-xs font-semibold text-gray-900">
                                            {data.confianza ? `${typeof data.confianza === 'number' && data.confianza <= 1 ? Math.round(data.confianza * 100) : Math.round(data.confianza)}%` : 'N/A'}
                                        </p>
                                    </div>
                                    {data.procesoIdSugerido && (
                                        <div className="bg-white rounded-lg p-2.5 border border-purple-100">
                                            <span className="text-[10px] font-bold text-purple-500 uppercase">Proceso</span>
                                            <p className="text-xs font-semibold text-gray-900 truncate">{data.procesoIdSugerido}</p>
                                        </div>
                                    )}
                                    {data.implicadoSugerido && (
                                        <div className="bg-white rounded-lg p-2.5 border border-purple-100">
                                            <span className="text-[10px] font-bold text-purple-500 uppercase">Implicado</span>
                                            <p className="text-xs font-semibold text-gray-900 truncate">{data.implicadoSugerido}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Vinculación Manual */}
                            {isOficio && (
                                <div className="p-4">
                                    {!showVinculador ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setShowVinculador(true)}
                                            className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                                        >
                                            <Link className="w-4 h-4 mr-2" />
                                            Vincular Oficio a un Proceso
                                        </Button>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Paso 1: Seleccionar Submódulo */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-600 uppercase mb-1.5 block">
                                                    1. Submódulo destino
                                                </label>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setModuloSeleccionado('DEFENSA_JUDICIAL'); setProcesoSeleccionado(null); setSearchQuery(''); }}
                                                        className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${moduloSeleccionado === 'DEFENSA_JUDICIAL'
                                                            ? 'bg-red-600 text-white border-red-600'
                                                            : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'
                                                            }`}
                                                    >
                                                        Defensa Judicial
                                                    </button>
                                                    <button
                                                        onClick={() => { setModuloSeleccionado('JUZGAMIENTO_DISCIPLINARIO'); setProcesoSeleccionado(null); setSearchQuery(''); }}
                                                        className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${moduloSeleccionado === 'JUZGAMIENTO_DISCIPLINARIO'
                                                            ? 'bg-orange-600 text-white border-orange-600'
                                                            : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                                                            }`}
                                                    >
                                                        Juzgamiento Disciplinario
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Paso 2: Buscador de Procesos */}
                                            {moduloSeleccionado && (
                                                <div>
                                                    <label className="text-xs font-bold text-gray-600 uppercase mb-1.5 block">
                                                        2. Buscar y seleccionar proceso
                                                    </label>
                                                    <div className="relative">
                                                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                                                        <Input
                                                            placeholder="Buscar por radicado, nombre, ID..."
                                                            value={searchQuery}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                                            className="pl-9 text-sm"
                                                        />
                                                        {searchLoading && <Loader2 className="w-4 h-4 absolute right-3 top-2.5 animate-spin text-gray-400" />}
                                                    </div>

                                                    {/* Resultados */}
                                                    {procesos.length > 0 && (
                                                        <div className="mt-2 max-h-[150px] overflow-y-auto border border-gray-200 rounded-lg bg-white">
                                                            {procesos.map((p: any) => {
                                                                const label = p.radicado || p.id;
                                                                const desc = p.demandante
                                                                    ? `${p.demandante} vs ${p.demandado || 'ESAP'}`
                                                                    : p.nombreInvestigado || p.descripcion || '';
                                                                const isSelected = procesoSeleccionado?.id === p.id;
                                                                return (
                                                                    <button
                                                                        key={p.id}
                                                                        onClick={() => setProcesoSeleccionado(p)}
                                                                        className={`w-full text-left px-3 py-2 text-xs border-b border-gray-50 last:border-0 hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-100 border-l-2 border-l-blue-600' : ''
                                                                            }`}
                                                                    >
                                                                        <span className="font-semibold text-gray-900">{label}</span>
                                                                        {desc && <span className="text-gray-500 ml-2">— {desc}</span>}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {searchQuery.length >= 2 && procesos.length === 0 && !searchLoading && (
                                                        <p className="text-xs text-gray-400 mt-1">Sin resultados</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Paso 3: Vincular */}
                                            {procesoSeleccionado && (
                                                <div className="flex items-center gap-3 pt-2">
                                                    <div className="flex-1 text-xs bg-white rounded-lg p-2 border border-gray-200">
                                                        <span className="font-bold text-gray-600">Seleccionado: </span>
                                                        <span className="text-gray-900">{procesoSeleccionado.radicado || procesoSeleccionado.id}</span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleVincular}
                                                        disabled={vinculando}
                                                        className="bg-purple-600 hover:bg-purple-700 text-white"
                                                    >
                                                        {vinculando ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Link className="w-4 h-4 mr-1" />}
                                                        Vincular Oficio
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer con acciones */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between gap-2">
                    <div className="flex gap-2">
                        {onReply && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const replySubject = data.asunto.startsWith('RE:') ? data.asunto : `RE: ${data.asunto}`;
                                    const originalBody = `
<br/><br/>
<hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;"/>
<p style="color: #666; font-size: 12px;">
    <strong>De:</strong> ${data.remitente}<br/>
    <strong>Fecha:</strong> ${formattedDate}<br/>
    <strong>Asunto:</strong> ${data.asunto}
</p>
<blockquote style="border-left: 3px solid #ccc; padding-left: 12px; margin: 12px 0; color: #555;">
    ${data.contenido}
</blockquote>`;
                                    onReply(data.id, data.remitenteEmail || data.remitente, replySubject, originalBody);
                                }}
                                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                                <Reply className="w-4 h-4 mr-1.5" />
                                Responder
                            </Button>
                        )}
                        {onForward && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const forwardSubject = data.asunto.startsWith('RV:') || data.asunto.startsWith('FW:') ? data.asunto : `RV: ${data.asunto}`;
                                    const originalBody = `
<br/><br/>
<hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;"/>
<p style="color: #666; font-size: 12px;">
    <strong>De:</strong> ${data.remitente}<br/>
    <strong>Fecha:</strong> ${formattedDate}<br/>
    <strong>Asunto:</strong> ${data.asunto}
</p>
<blockquote style="border-left: 3px solid #ccc; padding-left: 12px; margin: 12px 0; color: #555;">
    ${data.contenido}
</blockquote>`;
                                    onForward(data.id, forwardSubject, originalBody);
                                }}
                                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            >
                                <ArrowRight className="w-4 h-4 mr-1.5" />
                                Reenviar
                            </Button>
                        )}
                    </div>
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
