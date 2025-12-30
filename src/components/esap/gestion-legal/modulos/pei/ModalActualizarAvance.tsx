import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../ui/dialog';
import { Button } from '../../../../ui/button';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';
import { Textarea } from '../../../../ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import confetti from 'canvas-confetti';

interface ModalActualizarAvanceProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    indicador: any;
}

const API_URL = 'http://localhost:3008/api/legal/pei';

export function ModalActualizarAvance({ open, onClose, onSuccess, indicador }: ModalActualizarAvanceProps) {
    const [loading, setLoading] = useState(false);
    const [valor, setValor] = useState('');
    const [observaciones, setObservaciones] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!indicador) return;

        setLoading(true);
        try {
            await axios.post(`${API_URL}/indicador/${indicador.id}/avance`, {
                valor: parseFloat(valor),
                observaciones
            });
            toast.success('Avance registrado exitosamente');

            // Check for Celebration 🎉
            const nuevoValor = parseFloat(valor);
            let porcentaje = 0;
            if (indicador.unidadMedida === 'PORCENTAJE') {
                porcentaje = nuevoValor;
            } else {
                porcentaje = (nuevoValor / indicador.metaObjetivo) * 100;
            }

            if (porcentaje >= 100) {
                const duration = 3000;
                const end = Date.now() + duration;

                const frame = () => {
                    confetti({
                        particleCount: 2,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0 },
                        colors: ['#003DA5', '#ffffff', '#10B981'] // ESAP colors
                    });
                    confetti({
                        particleCount: 2,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1 },
                        colors: ['#003DA5', '#ffffff', '#10B981']
                    });

                    if (Date.now() < end) {
                        requestAnimationFrame(frame);
                    }
                };
                frame();
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Error al registrar avance');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] bg-white text-gray-900 border-gray-200">
                <DialogHeader>
                    <DialogTitle className="text-[#003DA5]">Actualizar Avance</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p className="text-sm font-semibold">{indicador?.nombre}</p>
                        <div className="flex justify-between mt-2 text-sm text-gray-600">
                            <span>Valor Actual: <strong>{indicador?.valorActual}</strong></span>
                            <span>Meta: <strong>{indicador?.metaObjetivo}</strong></span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Nuevo Valor Reportado</Label>
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
                        <Label>Observaciones / Justificación</Label>
                        <Textarea
                            rows={3}
                            required
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            placeholder="Describa el avance realizado..."
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={loading}>
                            {loading ? 'Guardando...' : 'Registrar Avance'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
