import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../ui/dialog';
import { Button } from '../../../../ui/button';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../ui/select';
import { Textarea } from '../../../../ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { CalendarIcon } from 'lucide-react';

interface ModalNuevoPlanProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const API_URL = 'http://localhost:3008/api/planes-mejoramiento';

export function ModalNuevoPlan({ open, onClose, onSuccess }: ModalNuevoPlanProps) {
    const [loading, setLoading] = useState(false);
    const [origen, setOrigen] = useState<string>('RIESGO');
    const [riesgos, setRiesgos] = useState<any[]>([]);
    const [abogados, setAbogados] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        titulo: '',
        descripcion: '',
        origen: 'RIESGO',
        origenId: '',
        responsableId: '',
        fechaInicio: '',
        fechaFinEstimada: '',
        presupuesto: 0
    });

    useEffect(() => {
        fetchAbogados();
        if (open && origen === 'RIESGO') {
            fetchRiesgos();
        }
    }, [open, origen]);

    const fetchAbogados = async () => {
        try {
            const res = await axios.get('http://localhost:3008/api/legal/abogados');
            setAbogados(res.data);
        } catch (error) {
            console.error('Error fetching abogados', error);
        }
    };

    const fetchRiesgos = async () => {
        try {
            const res = await axios.get(`${API_URL}/riesgos-disponibles`);
            setRiesgos(res.data);
        } catch (error) {
            console.error('Error fetching risks', error);
            toast.error('Error cargando riesgos');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(API_URL, {
                ...formData,
                origen,
                presupuesto: Number(formData.presupuesto)
            });
            toast.success('Plan creado exitosamente');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating plan', error);
            toast.error('Error al crear el plan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nuevo Plan de Mejoramiento</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label>Título del Plan</Label>
                        <Input
                            required
                            placeholder="Ej: Implementación de ISO 27001"
                            value={formData.titulo}
                            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Origen</Label>
                        <Select
                            value={origen}
                            onValueChange={(val: string) => {
                                setOrigen(val);
                                setFormData({ ...formData, origen: val, origenId: '' });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione origen" />
                            </SelectTrigger>
                            <SelectContent className="z-[10000] w-[var(--radix-select-trigger-width)]">
                                <SelectItem value="RIESGO">Riesgo Materializado (Obligatorio)</SelectItem>
                                <SelectItem value="AUDITORIA_INTERNA">Auditoría Interna</SelectItem>
                                <SelectItem value="AUDITORIA_EXTERNA">Auditoría Externa</SelectItem>
                                <SelectItem value="CONTROL_INTERNO">Control Interno</SelectItem>
                                <SelectItem value="ORGANO_CONTROL">Órgano de Control</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {origen === 'RIESGO' && (
                        <div className="grid gap-2">
                            <Label>Riesgo Asociado</Label>
                            <Select
                                value={formData.origenId}
                                onValueChange={(val: string) => setFormData({ ...formData, origenId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione Riesgo" />
                                </SelectTrigger>
                                <SelectContent className="z-[10000] max-h-[300px] w-[var(--radix-select-trigger-width)]">
                                    {riesgos.map((r) => (
                                        <SelectItem key={r.id} value={r.id} className="whitespace-normal h-auto py-2">
                                            {r.nombre} ({r.zonaInherente || 'N/A'})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>Descripción / Hallazgo</Label>
                        <Textarea
                            placeholder="Detalle el hallazgo o la justificación del plan..."
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Fecha Inicio</Label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    required
                                    value={formData.fechaInicio}
                                    onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Fecha Fin Estimada</Label>
                            <Input
                                type="date"
                                required
                                value={formData.fechaFinEstimada}
                                onChange={(e) => setFormData({ ...formData, fechaFinEstimada: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Presupuesto Estimado</Label>
                            <Input
                                type="number"
                                min="0"
                                value={formData.presupuesto}
                                onChange={(e) => setFormData({ ...formData, presupuesto: Number(e.target.value) })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Responsable (Abogado)</Label>
                            <Select
                                value={formData.responsableId}
                                onValueChange={(val: string) => setFormData({ ...formData, responsableId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione Abogado" />
                                </SelectTrigger>
                                <SelectContent className="z-[10000] max-h-[200px]">
                                    {abogados.map((abogado) => (
                                        <SelectItem key={abogado.id} value={abogado.id}>
                                            {abogado.nombreCompleto}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-[#003DA5] text-white hover:bg-[#002d7a]">
                            {loading ? 'Creando...' : 'Crear Plan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
