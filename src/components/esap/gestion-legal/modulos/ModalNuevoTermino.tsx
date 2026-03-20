
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Textarea } from '../../../ui/textarea';
import { toast } from 'sonner';
import { legalService } from '../../../../services/api/legal.service';
import { disciplinaryService } from '../../../../services/api/disciplinary.service';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Plus, Calendar, User, FileText, AlertTriangle, Briefcase } from 'lucide-react';

interface ModalNuevoTerminoProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const MODULOS_PROCESO = [
    { value: 'DEFENSA_JUDICIAL', label: 'Defensa Judicial' },
    { value: 'JUZGAMIENTO', label: 'Juzgamiento Disciplinario' },
    { value: 'ASESORIA', label: 'Asesoría Jurídica' },
    { value: 'ORGANOS_CONTROL', label: 'Órganos de Control' },
    { value: 'PROCESOS_COACTIVOS', label: 'Procesos Coactivos' },
];

const PRIORIDADES = [
    { value: 'ALTA', label: 'Alta', color: '#DC2626', bg: '#FEE2E2' },
    { value: 'MEDIA', label: 'Media', color: '#F59E0B', bg: '#FEF3C7' },
    { value: 'BAJA', label: 'Baja', color: '#10B981', bg: '#D1FAE5' },
];

export function ModalNuevoTermino({ open, onOpenChange, onSuccess }: ModalNuevoTerminoProps) {
    const [loading, setLoading] = useState(false);
    const [profesionales, setProfesionales] = useState<any[]>([]);
    const [procesosModulo, setProcesosModulo] = useState<any[]>([]);
    const [loadingProcesos, setLoadingProcesos] = useState(false);
    const [formData, setFormData] = useState({
        nombreActuacion: '',
        fechaVencimiento: '',
        prioridad: 'MEDIA',
        observaciones: '',
        numeroRadicado: '',
        responsableId: '',
        origenModulo: ''
    });

    // Cargar profesionales
    useEffect(() => {
        if (open) {
            disciplinaryService.getProfesionales().then((res: any) => {
                const data = res?.data || res || [];
                const activos = Array.isArray(data) ? data : [];
                setProfesionales(activos);
            }).catch(() => {
                // Silently fail, dropdown will just be empty
            });
        }
    }, [open]);

    // Cargar procesos del módulo seleccionado
    useEffect(() => {
        if (!open || !formData.origenModulo) {
            setProcesosModulo([]);
            return;
        }
        const loadProcesos = async () => {
            setLoadingProcesos(true);
            try {
                let data: any[] = [];
                if (formData.origenModulo === 'JUZGAMIENTO') {
                    data = await legalService.getJuzgamientoProcesos();
                } else if (formData.origenModulo === 'DEFENSA_JUDICIAL') {
                    const raw = await legalService.getExpedientes({ estado: 'ACTIVO' });
                    data = Array.isArray(raw) ? raw : [];
                } else if (formData.origenModulo === 'ASESORIA') {
                    data = await legalService.getConsultasJuridicas();
                } else if (formData.origenModulo === 'ORGANOS_CONTROL') {
                    data = await legalService.getRequerimientosOC();
                } else if (formData.origenModulo === 'PROCESOS_COACTIVOS') {
                    data = await legalService.getProcesosCoactivos();
                }
                setProcesosModulo(Array.isArray(data) ? data : []);
            } catch {
                setProcesosModulo([]);
            } finally {
                setLoadingProcesos(false);
            }
        };
        loadProcesos();
    }, [open, formData.origenModulo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombreActuacion.trim() || !formData.fechaVencimiento) {
            toast.error('Complete los campos obligatorios');
            return;
        }
        setLoading(true);

        try {
            await legalService.createTerminoManual({
                ...formData,
                responsableId: formData.responsableId || null
            });
            toast.success('Término creado exitosamente', {
                description: `${formData.nombreActuacion} — Vence: ${formData.fechaVencimiento}`
            });
            onSuccess();
            onOpenChange(false);
            setFormData({
                nombreActuacion: '',
                fechaVencimiento: '',
                prioridad: 'MEDIA',
                observaciones: '',
                numeroRadicado: '',
                responsableId: '',
                origenModulo: ''
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
            <DialogContent hideCloseButton className="w-[95vw] max-w-[600px] max-h-[90vh] md:max-h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogTitle className="sr-only">Nueva Solicitud / Término</DialogTitle>
                <DialogDescription className="sr-only">Formulario para crear un nuevo término o solicitud de informe</DialogDescription>

                <ModalHeaderClean
                    titulo="Nueva Solicitud / Término"
                    subtitulo="Complete los datos para registrar un nuevo plazo"
                    icono={Plus}
                    colorIcono="blue"
                    onClose={() => onOpenChange(false)}
                />

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Módulo de origen */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                            <Briefcase className="w-4 h-4" />
                            Módulo / Submódulo de Origen *
                        </Label>
                        <Select
                            value={formData.origenModulo}
                            onValueChange={(val: string) => setFormData({ ...formData, origenModulo: val })}
                        >
                            <SelectTrigger className="w-full border-2 border-gray-300 focus:border-blue-500">
                                <SelectValue placeholder="Seleccione módulo..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-[9999]">
                                {MODULOS_PROCESO.map((mod) => (
                                    <SelectItem key={mod.value} value={mod.value}>{mod.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Proceso del módulo */}
                    {formData.origenModulo && (
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                <Briefcase className="w-4 h-4" />
                                Proceso Vinculado (Opcional)
                            </Label>
                            <Select
                                value={formData.numeroRadicado}
                                onValueChange={(val: string) => setFormData({ ...formData, numeroRadicado: val === 'ninguno' ? '' : val })}
                            >
                                <SelectTrigger className="w-full border-2 border-gray-300 focus:border-blue-500">
                                    <SelectValue placeholder={loadingProcesos ? 'Cargando...' : 'Seleccione un proceso...'} />
                                </SelectTrigger>
                                <SelectContent className="bg-white max-h-[200px] z-[9999]">
                                    <SelectItem value="ninguno">Sin vincular</SelectItem>
                                    {procesosModulo.map((p: any) => (
                                        <SelectItem key={p.id || p.radicado} value={p.radicado || p.id}>
                                            {p.radicado || p.id} — {p.investigado || p.demandante || p.disciplinado || p.solicitante || 'N/A'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Nombre de la actuación */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                            <FileText className="w-4 h-4" />
                            Tipo de Actividad / Nombre *
                        </Label>
                        <Input
                            placeholder="Ej: Reunión de conciliación, Entrega de informe..."
                            value={formData.nombreActuacion}
                            onChange={(e) => setFormData({ ...formData, nombreActuacion: e.target.value })}
                            className="border-2 border-gray-300 focus:border-blue-500"
                            required
                        />
                    </div>

                    {/* Fecha y Prioridad en grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                Fecha de Vencimiento *
                            </Label>
                            <Input
                                type="date"
                                value={formData.fechaVencimiento}
                                onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                                className="border-2 border-gray-300 focus:border-blue-500"
                                min={new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4" />
                                Prioridad *
                            </Label>
                            <div className="flex gap-2">
                                {PRIORIDADES.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, prioridad: p.value })}
                                        className={`flex-1 py-2 px-3 rounded-lg border-2 text-xs font-bold transition-all ${
                                            formData.prioridad === p.value
                                                ? 'shadow-md scale-105'
                                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                        }`}
                                        style={formData.prioridad === p.value ? {
                                            borderColor: p.color,
                                            background: p.bg,
                                            color: p.color
                                        } : {}}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Responsable */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            Responsable / Abogado
                        </Label>
                        <Select
                            value={formData.responsableId}
                            onValueChange={(val: string) => setFormData({ ...formData, responsableId: val })}
                        >
                            <SelectTrigger className="w-full border-2 border-gray-300 focus:border-blue-500">
                                <SelectValue placeholder="Seleccione responsable..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-[200px] z-[9999]">
                                <SelectItem value="sin-asignar">Sin asignar</SelectItem>
                                {profesionales.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.nombreCompleto || `${p.firstName || ''} ${p.lastName || ''}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Observaciones */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">
                            Descripción / Observaciones
                        </Label>
                        <Textarea
                            placeholder="Detalles adicionales sobre este término..."
                            value={formData.observaciones}
                            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                            className="border-2 border-gray-300 focus:border-blue-500 min-h-[80px]"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e as any)}
                        disabled={loading || !formData.nombreActuacion.trim() || !formData.fechaVencimiento}
                        className={`flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-lg transition-all ${
                            loading || !formData.nombreActuacion.trim() || !formData.fechaVencimiento
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:shadow-lg'
                        }`}
                        style={{ background: (loading || !formData.nombreActuacion.trim() || !formData.fechaVencimiento) ? '#9CA3AF' : '#003DA5' }}
                    >
                        {loading ? 'Guardando...' : 'Crear Solicitud'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
