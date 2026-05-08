/**
 * ModalSeguimiento — Registrar Nuevo Avance
 * Bug 5: Unifica el flujo de avance + documento de soporte en un solo formulario.
 * El campo de archivo es opcional: si se adjunta, se sube al endpoint /seguimiento
 * en una sola transacción multipart/form-data.
 */
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { Label } from '@esap-mfe/shared-ui/label';
import { Input } from '@esap-mfe/shared-ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { Upload, FileText, X, Paperclip } from 'lucide-react';
import { buildApiUrl } from '../../../../../config/environment';

interface ModalSeguimientoProps {
    open: boolean;
    onClose: () => void;
    plan: any;
    onSuccess: () => void;
}

const API_URL = buildApiUrl('legal', '/planes-mejoramiento');
const MAX_SIZE_MB = 200;

export function ModalSeguimiento({ open, onClose, plan, onSuccess }: ModalSeguimientoProps) {
    const [loading, setLoading] = useState(false);
    const [descripcion, setDescripcion] = useState('');
    const [avance, setAvance] = useState(0);
    const [titulo, setTitulo] = useState('');
    const [archivo, setArchivo] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setDescripcion('');
        setAvance(0);
        setTitulo('');
        setArchivo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const sizeMb = f.size / (1024 * 1024);
        if (sizeMb > MAX_SIZE_MB) {
            toast.error(`El archivo pesa ${sizeMb.toFixed(1)} MB y supera el límite de ${MAX_SIZE_MB} MB.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        setArchivo(f);
        if (!titulo.trim()) setTitulo(f.name.replace(/\.[^/.]+$/, ''));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!descripcion.trim()) {
            toast.error('Ingrese una descripción del avance');
            return;
        }

        setLoading(true);
        try {
            // Bug 5: enviamos siempre como multipart/form-data — el backend acepta
            // metadata + archivo opcional en una sola transacción.
            const formData = new FormData();
            formData.append('descripcionAvance', descripcion.trim());
            formData.append('porcentajeReportado', String(avance));
            if (archivo) {
                formData.append('file', archivo);
                formData.append('titulo', titulo.trim() || archivo.name);
            }

            await axios.post(`${API_URL}/${plan.id}/seguimiento`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            toast.success(
                archivo ? 'Avance y documento registrados' : 'Avance registrado',
            );
            reset();
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error logging progress', err);
            const status = err?.response?.status;
            if (status === 413) {
                toast.error(`Archivo demasiado grande (máx ${MAX_SIZE_MB} MB).`);
            } else {
                toast.error('Error al registrar el avance');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o) {
                    reset();
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Registrar Nuevo Avance</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 py-4">
                    {/* Porcentaje */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="font-bold text-sm">Nuevo Porcentaje de Avance</Label>
                            <span className="font-bold text-blue-600 text-lg">{avance}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={avance}
                            onChange={(e) => setAvance(Number(e.target.value))}
                            className="w-full accent-[#003DA5]"
                        />
                        <p className="text-xs text-gray-500">
                            Avance actual registrado: <strong>{plan?.avancePorcentaje || 0}%</strong>
                        </p>
                    </div>

                    {/* Descripción */}
                    <div className="grid gap-2">
                        <Label className="font-bold text-sm">
                            Descripción / Observación <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            required
                            placeholder="Describa las actividades realizadas para este avance…"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            rows={4}
                        />
                    </div>

                    {/* Documento de soporte (opcional) — Bug 5 */}
                    <div className="border-t pt-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-gray-500" />
                            <Label className="font-bold text-sm">Documento de soporte (opcional)</Label>
                        </div>

                        {!archivo ? (
                            <div
                                className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center hover:border-blue-400 cursor-pointer transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm text-gray-600 font-medium">
                                    Clic para seleccionar un archivo
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Máx. {MAX_SIZE_MB} MB · PDF, Word, Excel, imágenes…
                                </p>
                            </div>
                        ) : (
                            <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-3 flex items-center gap-3">
                                <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{archivo.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {(archivo.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setArchivo(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="p-1 hover:bg-white rounded"
                                    aria-label="Quitar archivo"
                                >
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        {archivo && (
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-bold text-gray-600">Título del documento</Label>
                                <Input
                                    value={titulo}
                                    onChange={(e) => setTitulo(e.target.value)}
                                    placeholder="Ej: Informe trimestral abril 2026"
                                    className="text-sm"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-[#003DA5] text-white">
                            {loading ? 'Guardando…' : 'Guardar Avance'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
