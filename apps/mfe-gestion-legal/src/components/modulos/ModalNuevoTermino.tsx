
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@esap-mfe/shared-ui/select';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { toast } from 'sonner';
import { legalService } from '../../../../services/api/legal.service';
import { ModalHeaderClean } from './ModalHeaderClean';
import { ModalProgramacionVencimientos } from './ModalProgramacionVencimientos';
import { Plus, Calendar, User, FileText, AlertTriangle, Briefcase, Repeat, X } from 'lucide-react';
import {
    NOMBRES_MESES,
    ProgramacionVencimientos,
    generarOcurrencias,
    ocurrenciasFuturas,
    resumenProgramacion,
} from '../utils/programacionVencimientos';

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
    const [programacion, setProgramacion] = useState<ProgramacionVencimientos | null>(null);
    const [modalProgramacionOpen, setModalProgramacionOpen] = useState(false);
    const [formData, setFormData] = useState({
        nombreActuacion: '',
        fechaVencimiento: '',
        prioridad: 'MEDIA',
        observaciones: '',
        numeroRadicado: '',
        responsableId: '',
        origenModulo: ''
    });

    const resetForm = () => {
        setFormData({
            nombreActuacion: '',
            fechaVencimiento: '',
            prioridad: 'MEDIA',
            observaciones: '',
            numeroRadicado: '',
            responsableId: '',
            origenModulo: ''
        });
        setProgramacion(null);
    };

    const vencimientosProgramados = useMemo(() => {
        if (!programacion) return 0;
        return ocurrenciasFuturas(generarOcurrencias(programacion)).length;
    }, [programacion]);

    // Cargar profesionales
    useEffect(() => {
        if (open) {
            legalService.getAbogados().then((data: any[]) => {
                setProfesionales(Array.isArray(data) ? data : []);
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
        if (!formData.nombreActuacion.trim() || (!formData.fechaVencimiento && !programacion)) {
            toast.error('Complete los campos obligatorios');
            return;
        }

        if (programacion) {
            const ocurrencias = ocurrenciasFuturas(generarOcurrencias(programacion));
            if (ocurrencias.length === 0) {
                toast.error('Todos los vencimientos de la programación ya vencieron. Ajuste el plazo o la periodicidad.');
                return;
            }

            setLoading(true);
            try {
                const resultados = await Promise.allSettled(
                    ocurrencias.map((o) =>
                        legalService.createTerminoManual({
                            ...formData,
                            nombreActuacion: `${formData.nombreActuacion} — ${NOMBRES_MESES[o.mes - 1]} ${o.anio}`,
                            fechaBase: o.fechaInicio.toISOString(),
                            fechaVencimiento: o.fechaVencimiento.toISOString(),
                            diasTermino: Math.max(1, programacion.plazoHasta - programacion.plazoDesde + 1),
                            tipoDias: programacion.tipoDias,
                            observaciones: [formData.observaciones, `Programación: ${resumenProgramacion(programacion)}`].filter(Boolean).join(' · '),
                            responsableId: formData.responsableId || null
                        })
                    )
                );

                const exitosos = resultados.filter((r) => r.status === 'fulfilled').length;
                const fallidos = resultados.length - exitosos;

                if (exitosos > 0) {
                    toast.success(`Programación creada: ${exitosos} vencimiento${exitosos === 1 ? '' : 's'} generado${exitosos === 1 ? '' : 's'}`, {
                        description: fallidos > 0 ? `${fallidos} no se pudieron crear` : undefined
                    });
                    onSuccess();
                    onOpenChange(false);
                    resetForm();
                } else {
                    toast.error('No se pudo crear la programación de vencimientos');
                }
            } catch (error) {
                console.error('Error creando programación de términos:', error);
                toast.error('Error al crear la programación de vencimientos');
            } finally {
                setLoading(false);
            }
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
            resetForm();
        } catch (error) {
            console.error('Error creando término:', error);
            toast.error('Error al crear el término');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent hideCloseButton className="flex flex-col p-0 overflow-hidden" style={{ width: '660px', maxWidth: '90vw', minHeight: '580px', maxHeight: '88vh' }}>
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
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" />
                                    Fecha de Vencimiento *
                                </Label>
                                <button
                                    type="button"
                                    onClick={() => setModalProgramacionOpen(true)}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    <Repeat className="w-3.5 h-3.5" />
                                    {programacion ? 'Editar' : 'Programar periodicidad'}
                                </button>
                            </div>

                            {programacion ? (
                                <div className="flex items-center justify-between gap-2 border-2 border-blue-200 bg-blue-50 rounded-lg px-3 py-2">
                                    <span className="text-xs font-semibold text-blue-700">{resumenProgramacion(programacion)}</span>
                                    <button
                                        type="button"
                                        onClick={() => setProgramacion(null)}
                                        className="text-blue-400 hover:text-blue-600"
                                        title="Quitar programación"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <Input
                                    type="date"
                                    value={formData.fechaVencimiento}
                                    onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                                    className="border-2 border-gray-300 focus:border-blue-500"
                                    min={new Date().toISOString().split('T')[0]}
                                    required
                                />
                            )}
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
                        disabled={loading || !formData.nombreActuacion.trim() || (programacion ? vencimientosProgramados === 0 : !formData.fechaVencimiento)}
                        className={`flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-lg transition-all ${
                            loading || !formData.nombreActuacion.trim() || (programacion ? vencimientosProgramados === 0 : !formData.fechaVencimiento)
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:shadow-lg'
                        }`}
                        style={{ background: (loading || !formData.nombreActuacion.trim() || (programacion ? vencimientosProgramados === 0 : !formData.fechaVencimiento)) ? '#9CA3AF' : '#003DA5' }}
                    >
                        {loading
                            ? 'Guardando...'
                            : programacion
                                ? `Crear Programación (${vencimientosProgramados} vencimiento${vencimientosProgramados === 1 ? '' : 's'})`
                                : 'Crear Solicitud'}
                    </button>
                </div>
            </DialogContent>

            <ModalProgramacionVencimientos
                open={modalProgramacionOpen}
                onOpenChange={setModalProgramacionOpen}
                initialValue={programacion}
                onSave={(config) => setProgramacion(config)}
            />
        </Dialog>
    );
}
