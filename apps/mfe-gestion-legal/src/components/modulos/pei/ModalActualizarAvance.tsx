/**
 * ModalActualizarAvance — Plan de Acción / PEI
 * Bug 6: el campo "Evidencia" pasó de ser una URL de texto a un input de archivo.
 *        Las observaciones se persisten correctamente y el endpoint backend
 *        recalcula el % global automáticamente al guardar.
 */
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { Upload, FileText, X, Paperclip } from 'lucide-react';
import { buildApiUrl } from '../../../../../config/environment';

interface ModalActualizarAvanceProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    indicador: any;
}

const API_URL = buildApiUrl('legal', '/pei');
const MAX_SIZE_MB = 200;

export function ModalActualizarAvance({ open, onClose, onSuccess, indicador }: ModalActualizarAvanceProps) {
    const [loading, setLoading] = useState(false);
    const [valor, setValor] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [evidencia, setEvidencia] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setValor('');
        setObservaciones('');
        setEvidencia(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const sizeMb = f.size / (1024 * 1024);
        if (sizeMb > MAX_SIZE_MB) {
            toast.error(`El archivo pesa ${sizeMb.toFixed(1)} MB y supera el límite de ${MAX_SIZE_MB} MB.`);
            e.target.value = '';
            return;
        }
        setEvidencia(f);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!indicador) return;

        if (!valor.trim()) {
            toast.error('Ingrese un valor reportado');
            return;
        }
        if (!observaciones.trim()) {
            toast.error('Ingrese las observaciones');
            return;
        }

        setLoading(true);
        try {
            // Bug 6: enviar siempre como multipart para soportar archivo opcional
            // y asegurar que las observaciones lleguen al backend.
            const formData = new FormData();
            formData.append('valor', valor);
            formData.append('observaciones', observaciones);
            if (evidencia) {
                formData.append('evidencia', evidencia);
            }

            await axios.post(`${API_URL}/indicador/${indicador.id}/avance`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            toast.success('Avance registrado exitosamente');

            // Confetti si llegó al 100% (mantenemos el detalle UX original)
            const nuevoValor = parseFloat(valor);
            let porcentaje = 0;
            if (indicador.unidadMedida === 'PORCENTAJE') {
                porcentaje = nuevoValor;
            } else if (indicador.metaObjetivo) {
                porcentaje = (nuevoValor / Number(indicador.metaObjetivo)) * 100;
            }

            if (porcentaje >= 100) {
                const duration = 3000;
                const end = Date.now() + duration;
                const frame = () => {
                    confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#003DA5', '#ffffff', '#10B981'] });
                    confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#003DA5', '#ffffff', '#10B981'] });
                    if (Date.now() < end) requestAnimationFrame(frame);
                };
                frame();
            }

            reset();
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            const status = err?.response?.status;
            if (status === 413) {
                toast.error(`Archivo demasiado grande (máx ${MAX_SIZE_MB} MB).`);
            } else {
                toast.error('Error al registrar avance');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
            <DialogContent className="sm:max-w-[520px] bg-white text-gray-900 border-gray-200">
                <DialogHeader>
                    <DialogTitle className="text-[#003DA5]">Actualizar Avance</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p className="text-sm font-semibold">{indicador?.nombre}</p>
                        <div className="flex justify-between mt-2 text-sm text-gray-600">
                            <span>Valor Actual: <strong>{indicador?.valorActual ?? 0}</strong></span>
                            <span>Meta: <strong>{indicador?.metaObjetivo}</strong></span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold">Nuevo Valor Reportado <span className="text-red-500">*</span></Label>
                        <Input
                            type="number"
                            required
                            step="0.01"
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                            placeholder="Ingrese el valor acumulado real"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold">Observaciones / Justificación <span className="text-red-500">*</span></Label>
                        <Textarea
                            rows={3}
                            required
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            placeholder="Describa el avance realizado…"
                        />
                    </div>

                    {/* Bug 6: Evidencia como archivo, no URL */}
                    <div className="space-y-2 border-t pt-4">
                        <Label className="font-bold flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-gray-500" />
                            Evidencia (opcional)
                        </Label>
                        {!evidencia ? (
                            <div
                                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 cursor-pointer transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="w-7 h-7 mx-auto mb-1 text-gray-400" />
                                <p className="text-sm text-gray-600 font-medium">Adjuntar evidencia</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    PDF, Word, Excel, imágenes · Máx. {MAX_SIZE_MB} MB
                                </p>
                            </div>
                        ) : (
                            <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-3 flex items-center gap-3">
                                <FileText className="w-7 h-7 text-blue-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{evidencia.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {(evidencia.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEvidencia(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="p-1 hover:bg-white rounded"
                                    aria-label="Quitar evidencia"
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
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={loading}>
                            {loading ? 'Guardando…' : 'Registrar Avance'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
