
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Calendar, Users, Video, MapPin, Clock, Save, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { legalService } from '../../../../services/api/legal.service';

interface ModalNuevaAudienciaProps {
    isOpen: boolean;
    onClose: () => void;
    expedienteId: string;
    onSuccess: () => void;
}

export function ModalNuevaAudiencia({ isOpen, onClose, expedienteId, onSuccess }: ModalNuevaAudienciaProps) {
    const [loading, setLoading] = useState(false);
    const [abogados, setAbogados] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        titulo: '',
        fechaHoraInicio: '',
        duracionMinutos: '60',
        modalidad: 'VIRTUAL', // VIRTUAL | PRESENCIAL
        ubicacion: '',
        linkReunion: '',
        abogadoId: '',
        notasPreparacion: ''
    });

    // Cargar abogados al abrir
    useEffect(() => {
        if (isOpen) {
            loadAbogados();
            // Reset form on open
            setFormData(prev => ({
                ...prev,
                fechaHoraInicio: new Date().toISOString().slice(0, 16) // Default now
            }));
        }
    }, [isOpen]);

    const loadAbogados = async () => {
        try {
            const data = await legalService.getAbogadosDashboard();
            setAbogados(data);
        } catch (error) {
            console.error('Error cargando abogados:', error);
            toast.error('No se pudo cargar la lista de abogados');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.titulo || !formData.fechaHoraInicio || !formData.abogadoId) {
            toast.error('Complete los campos obligatorios');
            return;
        }

        if (formData.modalidad === 'VIRTUAL' && !formData.linkReunion) {
            toast.error('Para audiencias virtuales el enlace es obligatorio');
            return;
        }

        try {
            setLoading(true);

            await legalService.createAudiencia({
                expedienteId,
                abogadoId: formData.abogadoId,
                titulo: formData.titulo,
                fechaHoraInicio: new Date(formData.fechaHoraInicio).toISOString(),
                duracionMinutos: parseInt(formData.duracionMinutos),
                modalidad: formData.modalidad as 'VIRTUAL' | 'PRESENCIAL',
                ubicacion: formData.modalidad === 'PRESENCIAL' ? formData.ubicacion : undefined,
                linkReunion: formData.modalidad === 'VIRTUAL' ? formData.linkReunion : undefined,
                notasPreparacion: formData.notasPreparacion
            });

            toast.success('Audiencia programada correctamente');
            onSuccess();
            onClose();

            // Reset critical fields
            setFormData(prev => ({
                ...prev,
                titulo: '',
                linkReunion: '',
                notasPreparacion: ''
            }));

        } catch (error) {
            console.error('Error creando audiencia:', error);
            toast.error('Error al programar la audiencia');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Calendar className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <DialogTitle>Programar Audiencia</DialogTitle>
                            <DialogDescription>
                                Agenda y notifica una nueva audiencia procesal
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">

                    <div className="space-y-2">
                        <Label>Título / Asunto de la Audiencia *</Label>
                        <Input
                            placeholder="Ej: Audiencia Inicial de Saneamiento"
                            value={formData.titulo}
                            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Fecha y Hora Inicio *</Label>
                            <Input
                                type="datetime-local"
                                value={formData.fechaHoraInicio}
                                onChange={(e) => setFormData({ ...formData, fechaHoraInicio: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Duración Estimada (min)</Label>
                            <div className="relative">
                                <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    type="number"
                                    className="pl-9"
                                    min="15"
                                    step="15"
                                    value={formData.duracionMinutos}
                                    onChange={(e) => setFormData({ ...formData, duracionMinutos: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Modalidad</Label>
                            <Select
                                value={formData.modalidad}
                                onValueChange={(val) => setFormData({ ...formData, modalidad: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent position="popper" sideOffset={4} className="z-[9999]">
                                    <SelectItem value="VIRTUAL">Virtual (Remota)</SelectItem>
                                    <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Abogado Responsable *</Label>
                            <Select
                                value={formData.abogadoId}
                                onValueChange={(val) => setFormData({ ...formData, abogadoId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione abogado" />
                                </SelectTrigger>
                                <SelectContent position="popper" sideOffset={4} className="z-[9999]">
                                    {abogados.map((abo) => (
                                        <SelectItem key={abo.id} value={abo.id}>
                                            {abo.nombreCompleto}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Campos dinámicos según modalidad */}
                    {formData.modalidad === 'VIRTUAL' ? (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <LinkIcon className="w-3 h-3" /> Enlace de la Reunión *
                            </Label>
                            <Input
                                placeholder="https://teams.microsoft.com/..."
                                value={formData.linkReunion}
                                onChange={(e) => setFormData({ ...formData, linkReunion: e.target.value })}
                                className="bg-purple-50 border-purple-200 focus:ring-purple-500"
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <MapPin className="w-3 h-3" /> Lugar / Despacho
                            </Label>
                            <Input
                                placeholder="Ej: Juzgado 15 Admin, Sala 3"
                                value={formData.ubicacion}
                                onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Notas Preparatorias / Observaciones</Label>
                        <Textarea
                            placeholder="Instrucciones especiales, documentos requeridos..."
                            className="resize-none"
                            rows={3}
                            value={formData.notasPreparacion}
                            onChange={(e) => setFormData({ ...formData, notasPreparacion: e.target.value })}
                        />
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2 text-xs text-blue-800 border border-blue-100">
                        <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5" />
                        <p>Esta audiencia se registrará automáticamente en el <strong>Historial Unificado de Actuaciones</strong> y se notificará al abogado responsable.</p>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-purple-600 hover:bg-purple-700"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Agendando...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Programar Audiencia
                                </div>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
