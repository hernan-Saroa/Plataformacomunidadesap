import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Mail, AlertTriangle, FileText, Eye, Download, Archive, User, Calendar, MapPin, Hash } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface DetalleCorreoModalProps {
    isOpen: boolean;
    onClose: () => void;
    notificacion: any;
    onVerAdjunto?: (url: string) => void;
}

export function DetalleCorreoModal({ isOpen, onClose, notificacion, onVerAdjunto }: DetalleCorreoModalProps) {
    if (!notificacion) return null;

    // Normalizar datos (ya que 'notificacion' puede venir de diferentes fuentes)
    const data = {
        id: notificacion.id,
        remitente: notificacion.remitente || notificacion.metadata?.remitente || 'Desconocido',
        destinatario: notificacion.destinatario || notificacion.metadata?.destinatario || 'Desconocido',
        asunto: notificacion.asunto || notificacion.metadata?.subject || notificacion.descripcion || 'Sin asunto',
        fecha: notificacion.fecha || notificacion.metadata?.emailDate || notificacion.fechaActuacion,
        contenido: notificacion.contenido || notificacion.metadata?.body || notificacion.descripcion || '',
        urgente: notificacion.urgente || notificacion.prioridad === 'Alta',
        despacho: notificacion.despachoOrigen || notificacion.metadata?.despacho || 'No especificado',
        radicadoExterno: notificacion.radicadoExterno || notificacion.metadata?.radicadoExterno,
        tipoProceso: notificacion.tipoProceso || notificacion.metadata?.tipoProceso || 'General',
        adjuntos: notificacion.metadata?.hasAttachments ? ['Adjunto principal'] : [] // Simplificación si no tenemos lista real
    };

    const formattedDate = data.fecha ? new Date(data.fecha).toLocaleString() : 'Fecha desconocida';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden bg-gray-50/50">
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
                            <div className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 whitespace-pre-wrap font-mono text-sm shadow-inner">
                                {data.contenido}
                            </div>
                        </div>
                    </div>

                    {/* Adjuntos y Acciones */}
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
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
