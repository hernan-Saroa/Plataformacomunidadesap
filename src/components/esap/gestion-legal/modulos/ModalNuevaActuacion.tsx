
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Calendar, FileText, Upload, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { legalService } from '../../../../services/api/legal.service';

interface ModalNuevaActuacionProps {
    isOpen: boolean;
    onClose: () => void;
    expedienteId: string;
    onSuccess: () => void;
}

export function ModalNuevaActuacion({ isOpen, onClose, expedienteId, onSuccess }: ModalNuevaActuacionProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        tipo: 'Otro',
        descripcion: '',
        fecha: new Date().toISOString().split('T')[0]
    });
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const tiposActuacion = [
        'Auto Admisorio',
        'Contestación Demanda',
        'Alegatos de Conclusión',
        'Fallo Primera Instancia',
        'Fallo Segunda Instancia',
        'Recurso de Apelación',
        'Medida Cautelar',
        'Memorial',
        'Oficio',
        'Otro'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.descripcion) {
            toast.error('La descripción es obligatoria');
            return;
        }

        try {
            setLoading(true);

            await legalService.createActuacion({
                expedienteId,
                tipoActuacion: formData.tipo,
                descripcion: formData.descripcion,
                fechaActuacion: formData.fecha,
                file: file || undefined
            });

            toast.success('Actuación registrada exitosamente');
            onSuccess();
            onClose();

            // Reset form
            setFormData({
                tipo: 'Otro',
                descripcion: '',
                fecha: new Date().toISOString().split('T')[0]
            });
            setFile(null);

        } catch (error) {
            console.error('Error creando actuación:', error);
            toast.error('Error al registrar la actuación');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 10 * 1024 * 1024) {
                toast.error('El archivo no puede superar los 10MB');
                return;
            }
            setFile(selectedFile);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <DialogTitle>Registrar Nueva Actuación</DialogTitle>
                            <DialogDescription>
                                Agregue un evento al historial del proceso
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Fecha de Actuación</Label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    type="date"
                                    className="pl-9"
                                    value={formData.fecha}
                                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Tipo de Actuación</Label>
                            <Select
                                value={formData.tipo}
                                onValueChange={(val) => setFormData({ ...formData, tipo: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione tipo" />
                                </SelectTrigger>
                                <SelectContent position="popper" sideOffset={4} className="z-[9999]">
                                    {tiposActuacion.map((tipo) => (
                                        <SelectItem key={tipo} value={tipo}>
                                            {tipo}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Descripción del Evento</Label>
                        <Textarea
                            placeholder="Describa brevemente la actuación o decisión judicial..."
                            className="resize-none"
                            rows={4}
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            required
                        />
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-[#003DA5] hover:bg-[#002a70]"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Guardando...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Save className="w-4 h-4" />
                                    Registrar Actuación
                                </div>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
