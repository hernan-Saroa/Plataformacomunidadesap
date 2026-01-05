
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { FileText, Download, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getServiceUrl } from '../../../../config/environment';

interface ModalDocumentosTerminoProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    terminoId: string | null; // This should be the UUID
    radicado?: string;
}

export function ModalDocumentosTermino({ open, onOpenChange, terminoId, radicado }: ModalDocumentosTerminoProps) {
    const [documentos, setDocumentos] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && terminoId) {
            fetchDocs(terminoId);
        }
    }, [open, terminoId]);

    const fetchDocs = async (id: string) => {
        setLoading(true);
        try {
            const baseUrl = getServiceUrl('legal');
            const res = await fetch(`${baseUrl}/legal/terminos/${id}/documentos`);
            if (res.ok) {
                const data = await res.json();
                setDocumentos(data);
            } else {
                toast.error('Error al cargar documentos');
            }
        } catch (e) {
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-[#003DA5]">
                        Documentos del Proceso
                    </DialogTitle>
                    {radicado && (
                        <DialogDescription>
                            Radicado: {radicado}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="min-h-[200px] mt-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">Cargando documentos...</div>
                    ) : documentos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400 border-2 border-dashed rounded-lg">
                            <FileText className="w-8 h-8 mb-2 opacity-50" />
                            <p>No hay documentos asociados disponibles.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {documentos.map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 bg-blue-50 rounded border border-blue-100 flex-shrink-0">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="truncate">
                                            <p className="font-medium text-sm text-gray-900 truncate" title={doc.nombre}>{doc.nombre}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="bg-gray-100 px-1.5 py-0.5 rounded">{doc.tipo}</span>
                                                <span>•</span>
                                                <span>{new Date(doc.fecha).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                        onClick={() => window.open(doc.url, '_blank')}
                                    >
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
