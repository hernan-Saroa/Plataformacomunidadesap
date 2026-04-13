import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { FileText, Download, Upload } from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { buildApiUrl } from '../../../../../config/environment';

interface ModalEvidenciasProps {
    open: boolean;
    onClose: () => void;
    plan: any;
    onSuccess: () => void;
}

// const API_URL = 'http://localhost:3008/api/planes-mejoramiento';
const API_URL = buildApiUrl('legal', '/planes-mejoramiento');

export function ModalEvidencias({ open, onClose, plan, onSuccess }: ModalEvidenciasProps) {
    const [loading, setLoading] = useState(false);
    const [titulo, setTitulo] = useState('');
    const [file, setFile] = useState<File | null>(null);

    if (!plan) return null;

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !titulo) {
            toast.error('Complete el título y seleccione un archivo');
            return;
        }

        setLoading(true);
        try {
            // In a real app, use FormData to upload file to storage, get URL, then save metadata.
            // Here we simulate upload by saving metadata with a fake URL.
            // Or if backend supports JSON with base64/url, we send that. 
            // User instructions said: "Permite subir un archivo (simulado o real)".
            // We will send metadata to the endpoint created: POST /api/planes/:id/evidencias

            await axios.post(`${API_URL}/${plan.id}/evidencias`, {
                titulo,
                tipoArchivo: file.type || 'unknown',
                urlArchivo: `https://storage.fake/${file.name}` // Simulating URL
            });

            toast.success('Evidencia adjuntada');
            setTitulo('');
            setFile(null);
            onSuccess(); // Refresh parent
        } catch (error) {
            console.error('Error uploading evidence', error);
            toast.error('Error al subir evidencia');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Gestión de Evidencias</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* List of existing evidences */}
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        <h4 className="text-sm font-semibold text-gray-700">Evidencias Adjuntas</h4>
                        {plan.evidencias && plan.evidencias.length > 0 ? (
                            plan.evidencias.map((ev: any) => (
                                <Card key={ev.id} className="p-2 flex items-center justify-between shadow-sm border-gray-100">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                        <span className="text-sm truncate">{ev.titulo}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        <Download className="w-3 h-3 text-gray-500" />
                                    </Button>
                                </Card>
                            ))
                        ) : (
                            <p className="text-xs text-gray-400 italic">No hay evidencias aún.</p>
                        )}
                    </div>

                    {/* Upload Form */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                        <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Nueva Evidencia
                        </h4>
                        <form onSubmit={handleUpload} className="space-y-3">
                            <div className="grid gap-1.5">
                                <Label className="text-xs">Título del Documento</Label>
                                <Input
                                    value={titulo}
                                    onChange={e => setTitulo(e.target.value)}
                                    placeholder="Ej: Acta de reunión..."
                                    className="bg-white"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs">Archivo</Label>
                                <Input
                                    type="file"
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                    className="bg-white text-xs"
                                />
                            </div>
                            <Button type="submit" disabled={loading} size="sm" className="w-full bg-[#003DA5] text-white">
                                {loading ? 'Subiendo...' : 'Adjuntar'}
                            </Button>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

