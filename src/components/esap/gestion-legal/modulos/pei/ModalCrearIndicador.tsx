import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../ui/dialog';
import { Button } from '../../../../ui/button';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../ui/select';
import { Textarea } from '../../../../ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { buildApiUrl } from '../../../../../config/environment';

interface ModalCrearIndicadorProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const API_URL = buildApiUrl('legal', '/pei');

export function ModalCrearIndicador({ open, onClose, onSuccess }: ModalCrearIndicadorProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        ejeEstrategico: 'GESTION',
        metaObjetivo: '',
        unidadMedida: 'PORCENTAJE',
        fechaInicio: '',
        fechaFin: '',
        responsableNombre: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API_URL}/indicador`, {
                ...formData,
                metaObjetivo: parseFloat(formData.metaObjetivo)
            });
            toast.success('Indicador creado exitosamente');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Error al crear el indicador');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-white text-gray-900 border-gray-200">
                <DialogHeader>
                    <DialogTitle className="text-[#003DA5]">Nuevo Indicador PEI</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nombre del Indicador</Label>
                        <Input
                            required
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            placeholder="Ej: Eficiencia en Defensa Judicial"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Eje Estratégico</Label>
                            <Select
                                value={formData.ejeEstrategico}
                                onValueChange={(val: any) => setFormData({ ...formData, ejeEstrategico: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className='bg-white z-[9999]'>
                                    <SelectItem value="GESTION">Gestión Institucional</SelectItem>
                                    <SelectItem value="TALENTO">Talento Humano</SelectItem>
                                    <SelectItem value="TRANSPARENCIA">Transparencia</SelectItem>
                                    <SelectItem value="TECNOLOGIA">Tecnología</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Responsable</Label>
                            <Input
                                value={formData.responsableNombre}
                                onChange={(e) => setFormData({ ...formData, responsableNombre: e.target.value })}
                                placeholder="Nombre del responsable"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Meta Objetivo</Label>
                            <Input
                                type="number"
                                required
                                value={formData.metaObjetivo}
                                onChange={(e) => setFormData({ ...formData, metaObjetivo: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Unidad</Label>
                            <Select
                                value={formData.unidadMedida}
                                onValueChange={(val: any) => setFormData({ ...formData, unidadMedida: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className='bg-white z-[9999]'>
                                    <SelectItem value="PORCENTAJE">Porcentaje (%)</SelectItem>
                                    <SelectItem value="NUMERO">Número (#)</SelectItem>
                                    <SelectItem value="MONEDA">Moneda ($)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Fecha Inicio</Label>
                            <Input
                                type="date"
                                required
                                value={formData.fechaInicio}
                                onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha Fin</Label>
                            <Input
                                type="date"
                                required
                                value={formData.fechaFin}
                                onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Textarea
                            rows={3}
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-[#003DA5] hover:bg-[#002d7a] text-white" disabled={loading}>
                            {loading ? 'Guardando...' : 'Crear Indicador'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

