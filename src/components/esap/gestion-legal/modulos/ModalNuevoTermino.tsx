
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Textarea } from '../../../ui/textarea';
import { toast } from 'sonner@2.0.3';
import { legalService } from '../../../../services/api/legal.service';

interface ModalNuevoTerminoProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ModalNuevoTermino({ open, onOpenChange, onSuccess }: ModalNuevoTerminoProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombreActuacion: '',
        fechaVencimiento: '',
        prioridad: 'MEDIA',
        observaciones: '',
        numeroRadicado: '', // Opcional para Vinculación
        responsableId: '' // En un caso real, vendría del auth context o dropdown
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await legalService.createTerminoManual(formData);
            toast.success('Término creado exitosamente');
            onSuccess();
            onOpenChange(false);
            setFormData({
                nombreActuacion: '',
                fechaVencimiento: '',
                prioridad: 'MEDIA',
                observaciones: '',
                numeroRadicado: '',
                responsableId: ''
            });
        } catch (error) {
            console.error('Error creando término:', error);
            toast.error('Error al crear el término');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white">
                <DialogHeader>
                    <DialogTitle>Nueva Solicitud / Término</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="actividad">Tipo de Actividad / Nombre</Label>
                        <Input
                            id="actividad"
                            placeholder="Ej: Reunión, Entrega Informe..."
                            value={formData.nombreActuacion}
                            onChange={(e) => setFormData({ ...formData, nombreActuacion: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="vencimiento">Fecha de Vencimiento</Label>
                        <Input
                            id="vencimiento"
                            type="date"
                            value={formData.fechaVencimiento}
                            onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="prioridad">Prioridad</Label>
                        <Select
                            value={formData.prioridad}
                            onValueChange={(val) => setFormData({ ...formData, prioridad: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent className='bg-white'>
                                <SelectItem value="ALTA">Alta</SelectItem>
                                <SelectItem value="MEDIA">Media</SelectItem>
                                <SelectItem value="BAJA">Baja</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="radicado">Vinculación (Opcional - Radicado)</Label>
                        <Input
                            id="radicado"
                            placeholder="Ej: EXP-2025-001"
                            value={formData.numeroRadicado}
                            onChange={(e) => setFormData({ ...formData, numeroRadicado: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="observaciones">Descripción / Observaciones</Label>
                        <Textarea
                            id="observaciones"
                            placeholder="Detalles adicionales..."
                            value={formData.observaciones}
                            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading} style={{ background: '#003DA5' }}>
                            {loading ? 'Guardando...' : 'Crear Solicitud'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

