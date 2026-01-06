
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { SolicitudInforme } from '../core/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, Calendar, FileText, User, AlertTriangle, CheckCircle, Hash, ExternalLink, Download } from 'lucide-react';
import { useState } from 'react';
import { legalService } from '../../../../services/api/legal.service';
import { toast } from 'sonner';
import { getServiceUrl } from '../../../../config/environment';

interface ModalDetalleTerminoProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    solicitud: SolicitudInforme | null;
}

export function ModalDetalleTermino({ open, onOpenChange, solicitud }: ModalDetalleTerminoProps) {
    const [documentos, setDocumentos] = useState<any[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [view, setView] = useState<'info' | 'docs'>('info');

    if (!solicitud) return null;

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
        setLoadingDocs(true);
        try {
            // Use the UUID stored in metadata, fallback to id if not present (legacy)
            const uuid = (solicitud as any).metadata?.uuid || solicitud.id;
            // Call endpoint
            // Note: legalService needs this method. If not exists, allow me to define it or fetch raw
            // Assuming legalService.getTerminoDocumentos(uuid) exists or I add it.
            // For now using direct fetch to ensure it works without changing legal.service again immediately
            // For now using direct fetch to ensure it works without changing legal.service again immediately
            const baseUrl = getServiceUrl('legal');
            const res = await fetch(`${baseUrl}/legal/terminos/${uuid}/documentos`);
            if (res.ok) {
                const data = await res.json();
                setDocumentos(data);
            } else {
                toast.error('Error al cargar documentos');
            }
        } catch (e) {
            toast.error('Error de conexión');
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleNavigate = () => {
        const type = solicitud.tipoInforme;
        let url = '/gestion-legal';
        if (type === 'DEFENSA') url = '/gestion-legal?modulo=defensa-judicial';
        if (type === 'JUZGAMIENTO') url = '/gestion-legal?modulo=juzgamiento-disciplinario';
        if (type === 'ASESORIA') url = '/gestion-legal?modulo=asesoria-juridica';

        window.location.href = url; // Simple navigation
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <DialogTitle className="text-xl font-bold text-[#003DA5]">
                                {solicitud.asunto}
                            </DialogTitle>
                            <DialogDescription className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="flex items-center gap-1">
                                    <Hash className="w-3 h-3" />
                                    {solicitud.id}
                                </Badge>
                                <Badge variant="outline">
                                    {solicitud.tipoInforme}
                                </Badge>
                            </DialogDescription>
                        </div>
                        <div className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg border ${semaforoColor}`}>
                            {semaforoIcon}
                            <span className="text-sm font-bold mt-1">
                                {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex gap-2 border-b border-gray-100 mb-4">
                    <button
                        onClick={() => setView('info')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${view === 'info' ? 'border-[#003DA5] text-[#003DA5]' : 'border-transparent text-gray-500'}`}
                    >
                        Información
                    </button>
                    <button
                        onClick={handleFetchDocs}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${view === 'docs' ? 'border-[#003DA5] text-[#003DA5]' : 'border-transparent text-gray-500'}`}
                    >
                        Documentos
                    </button>
                </div>

                {view === 'info' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Fecha Límite
                                    </h4>
                                    <p className="font-medium text-gray-900">
                                        {format(new Date(solicitud.fechaVencimiento), 'PPP', { locale: es })}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Fecha Solicitud
                                    </h4>
                                    <p className="font-medium text-gray-900">
                                        {format(new Date(solicitud.fechaSolicitud), 'PPP', { locale: es })}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        Solicitante
                                    </h4>
                                    <p className="font-medium text-gray-900">
                                        {solicitud.enteSolicitante}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        Responsable
                                    </h4>
                                    <p className="font-medium text-gray-900">
                                        {solicitud.responsable}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Descripción / Hechos
                            </h4>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm text-gray-700 min-h-[100px] max-h-[200px] overflow-y-auto">
                                {solicitud.descripcion || 'Sin descripción disponible.'}
                            </div>
                        </div>
                    </div>
                )}

                {view === 'docs' && (
                    <div className="min-h-[200px]">
                        {loadingDocs ? (
                            <div className="flex justify-center items-center h-40">Cargando documentos...</div>
                        ) : documentos.length === 0 ? (
                            <div className="text-center text-gray-500 py-10">No hay documentos asociados disponibles.</div>
                        ) : (
                            <div className="space-y-2">
                                {documentos.map((doc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded border border-gray-200">
                                                <FileText className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-900">{doc.nombre || doc.archivoNombre || 'Documento sin nombre'}</p>
                                                <p className="text-xs text-gray-500">{doc.tipo || 'Archivo'} • {new Date(doc.fechaCarga || doc.fecha).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
