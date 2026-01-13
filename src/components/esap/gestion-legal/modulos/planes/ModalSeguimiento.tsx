import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../ui/dialog';
import { Button } from '../../../../ui/button';
import { Textarea } from '../../../../ui/textarea';
import { Label } from '../../../../ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { Slider } from '../../../../ui/slider'; // Assuming exists or use input range
import { buildApiUrl } from '../../../../../config/environment';

interface ModalSeguimientoProps {
    open: boolean;
    onClose: () => void;
    plan: any;
    onSuccess: () => void;
}

const API_URL = buildApiUrl('legal', '/planes-mejoramiento');

export function ModalSeguimiento({ open, onClose, plan, onSuccess }: ModalSeguimientoProps) {
    const [loading, setLoading] = useState(false);
    const [descripcion, setDescripcion] = useState('');
    const [avance, setAvance] = useState(0);

    // Set initial avance when opening
    // (In a real scenario, use useEffect to sync with plan.avancePorcentaje)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!descripcion) {
            toast.error('Ingrese una descripción del avance');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/${plan.id}/seguimiento`, {
                descripcionAvance: descripcion,
                porcentajeReportado: avance // This becomes the new total
            });

            toast.success('Seguimiento registrado');
            setDescripcion('');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error logging progress', error);
            toast.error('Error al registrar seguimiento');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Registrar Avance</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <Label>Nuevo Porcentaje de Avance</Label>
                            <span className="font-bold text-blue-600">{avance}%</span>
                        </div>
                        {/* Native range slider as fallback if UI component behaves oddly */}
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={avance}
                            onChange={(e) => setAvance(Number(e.target.value))}
                            className="w-full accent-[#003DA5]"
                        />
                        <p className="text-xs text-gray-500">
                            Avance actual registrado: {plan?.avancePorcentaje || 0}%
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label>Descripción / Observación</Label>
                        <Textarea
                            required
                            placeholder="Describa las actividades realizadas..."
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            rows={4}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-[#003DA5] text-white">
                            {loading ? 'Guardando...' : 'Guardar Avance'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

