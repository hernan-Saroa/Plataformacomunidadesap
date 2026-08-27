
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
import { Plus, Calendar, User, FileText, AlertTriangle, Briefcase, Repeat, X, Send, Scale, Trash2, Building, Clock } from 'lucide-react';
import { useConfiguracionesSIGL } from '../config/ConfiguracionesSIGLContext';
import {
    NOMBRES_MESES,
    ProgramacionVencimientos,
    generarOcurrencias,
    ocurrenciasFuturas,
    resumenProgramacion,
} from '../utils/programacionVencimientos';
import { fechaLocalYMD } from '../utils/diasHabiles';

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

const DESTINATARIO_OTRO = '__OTRO__';
const ENTE_SOLICITANTE_OTRO = '__OTRO__';

interface FuenteNormativaEntry {
    id: string;
    tipo: string;
    cita: string;
    actualizacionPeriodica: boolean;
    mesRecordatorio: string;
}

const nuevaFuenteNormativa = (): FuenteNormativaEntry => ({
    id: `fn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipo: '',
    cita: '',
    actualizacionPeriodica: false,
    mesRecordatorio: ''
});

export function ModalNuevoTermino({ open, onOpenChange, onSuccess }: ModalNuevoTerminoProps) {
    const { getDestinatariosInformeActivos, getEntesSolicitantesInformeActivos, getTiposFuenteNormativaActivos } = useConfiguracionesSIGL();
    const destinatariosDisponibles = getDestinatariosInformeActivos();
    const entesSolicitantesDisponibles = getEntesSolicitantesInformeActivos();
    const tiposFuenteNormativaDisponibles = getTiposFuenteNormativaActivos();
    const [loading, setLoading] = useState(false);
    const [profesionales, setProfesionales] = useState<any[]>([]);
    const [programacion, setProgramacion] = useState<ProgramacionVencimientos | null>(null);
    const [modalProgramacionOpen, setModalProgramacionOpen] = useState(false);
    const [formData, setFormData] = useState({
        nombreActuacion: '',
        fechaVencimiento: '',
        prioridad: 'MEDIA',
        observaciones: '',
        responsableId: '',
        origenModulo: '',
        destinatario: '',
        enteSolicitante: '',
        tipoDias: 'CALENDARIO'
    });
    const [destinatarioOtro, setDestinatarioOtro] = useState('');
    const [enteSolicitanteOtro, setEnteSolicitanteOtro] = useState('');
    const [fuentesNormativas, setFuentesNormativas] = useState<FuenteNormativaEntry[]>([nuevaFuenteNormativa()]);

    const resetForm = () => {
        setFormData({
            nombreActuacion: '',
            fechaVencimiento: '',
            prioridad: 'MEDIA',
            observaciones: '',
            responsableId: '',
            origenModulo: '',
            destinatario: '',
            enteSolicitante: '',
            tipoDias: 'CALENDARIO'
        });
        setDestinatarioOtro('');
        setEnteSolicitanteOtro('');
        setFuentesNormativas([nuevaFuenteNormativa()]);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombreActuacion.trim() || (!formData.fechaVencimiento && !programacion)) {
            toast.error('Complete los campos obligatorios');
            return;
        }

        const destinatarioFinal = formData.destinatario === DESTINATARIO_OTRO
            ? destinatarioOtro.trim()
            : formData.destinatario;

        const enteSolicitanteFinal = formData.enteSolicitante === ENTE_SOLICITANTE_OTRO
            ? enteSolicitanteOtro.trim()
            : formData.enteSolicitante;

        const fundamentoNormativo = fuentesNormativas
            .filter(f => f.tipo || f.cita)
            .map(f => ({
                tipo: f.tipo,
                cita: f.cita,
                actualizacionPeriodica: f.actualizacionPeriodica,
                mesRecordatorio: f.actualizacionPeriodica && f.mesRecordatorio ? Number(f.mesRecordatorio) : undefined
            }));

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
                            destinatario: destinatarioFinal,
                            enteSolicitante: enteSolicitanteFinal,
                            fundamentoNormativo,
                            nombreActuacion: `${formData.nombreActuacion} — ${NOMBRES_MESES[o.mes - 1]} ${o.anio}`,
                            fechaBase: fechaLocalYMD(o.fechaInicio),
                            fechaVencimiento: fechaLocalYMD(o.fechaVencimiento),
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
                destinatario: destinatarioFinal,
                enteSolicitante: enteSolicitanteFinal,
                fundamentoNormativo,
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
                <DialogTitle className="sr-only">Nuevo Informe</DialogTitle>
                <DialogDescription className="sr-only">Formulario para registrar un nuevo informe o término</DialogDescription>

                <ModalHeaderClean
                    titulo="Nuevo Informe"
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

                    {/* Ente solicitante del informe */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                            <Building className="w-4 h-4" />
                            Ente Solicitante
                        </Label>
                        <Select
                            value={formData.enteSolicitante}
                            onValueChange={(val: string) => setFormData({ ...formData, enteSolicitante: val })}
                        >
                            <SelectTrigger className="w-full border-2 border-gray-300 focus:border-blue-500">
                                <SelectValue placeholder="Seleccione el ente o persona solicitante..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-[200px] z-[9999]">
                                {entesSolicitantesDisponibles.map((e) => (
                                    <SelectItem key={e.id} value={e.nombre}>{e.nombre}</SelectItem>
                                ))}
                                <SelectItem value={ENTE_SOLICITANTE_OTRO}>Otro (especificar)...</SelectItem>
                            </SelectContent>
                        </Select>
                        {formData.enteSolicitante === ENTE_SOLICITANTE_OTRO && (
                            <Input
                                placeholder="Especifique el ente o persona solicitante..."
                                value={enteSolicitanteOtro}
                                onChange={(e) => setEnteSolicitanteOtro(e.target.value)}
                                className="border-2 border-gray-300 focus:border-blue-500"
                            />
                        )}
                    </div>

                    {/* Destinatario del informe */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                            <Send className="w-4 h-4" />
                            Destinatario del Informe
                        </Label>
                        <Select
                            value={formData.destinatario}
                            onValueChange={(val: string) => setFormData({ ...formData, destinatario: val })}
                        >
                            <SelectTrigger className="w-full border-2 border-gray-300 focus:border-blue-500">
                                <SelectValue placeholder="Seleccione entidad o dependencia receptora..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-[200px] z-[9999]">
                                {destinatariosDisponibles.map((d) => (
                                    <SelectItem key={d.id} value={d.nombre}>{d.nombre}</SelectItem>
                                ))}
                                <SelectItem value={DESTINATARIO_OTRO}>Otro (especificar)...</SelectItem>
                            </SelectContent>
                        </Select>
                        {formData.destinatario === DESTINATARIO_OTRO && (
                            <Input
                                placeholder="Especifique la entidad o dependencia receptora..."
                                value={destinatarioOtro}
                                onChange={(e) => setDestinatarioOtro(e.target.value)}
                                className="border-2 border-gray-300 focus:border-blue-500"
                            />
                        )}
                    </div>

                    {/* Fuente normativa */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                            <Scale className="w-4 h-4" />
                            Fuente Normativa
                        </Label>

                        <div className="space-y-3">
                            {fuentesNormativas.map((fuente, index) => (
                                <div key={fuente.id} className="p-3 border-2 border-gray-200 rounded-lg space-y-3 bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-600">Fuente {index + 1}</span>
                                        {fuentesNormativas.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setFuentesNormativas(fuentesNormativas.filter(f => f.id !== fuente.id))}
                                                className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                title="Eliminar fuente"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold text-gray-600">Tipo</Label>
                                            <Select
                                                value={fuente.tipo}
                                                onValueChange={(val: string) => setFuentesNormativas(
                                                    fuentesNormativas.map(f => f.id === fuente.id ? { ...f, tipo: val } : f)
                                                )}
                                            >
                                                <SelectTrigger className="w-full border-2 border-gray-300 focus:border-blue-500 bg-white">
                                                    <SelectValue placeholder="Seleccione tipo..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white max-h-[200px] z-[9999]">
                                                    {tiposFuenteNormativaDisponibles.map((t) => (
                                                        <SelectItem key={t.id} value={t.nombre}>{t.nombre}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold text-gray-600">Número / Cita</Label>
                                            <Input
                                                placeholder="Ej: Ley 1955 de 2019, Art. 12..."
                                                value={fuente.cita}
                                                onChange={(e) => setFuentesNormativas(
                                                    fuentesNormativas.map(f => f.id === fuente.id ? { ...f, cita: e.target.value } : f)
                                                )}
                                                className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                                            />
                                        </div>
                                    </div>

                                    <label className="flex items-start gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={fuente.actualizacionPeriodica}
                                            onChange={(e) => setFuentesNormativas(
                                                fuentesNormativas.map(f => f.id === fuente.id
                                                    ? { ...f, actualizacionPeriodica: e.target.checked, mesRecordatorio: e.target.checked ? f.mesRecordatorio : '' }
                                                    : f)
                                            )}
                                            className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-xs text-gray-600">
                                            La norma se actualiza periódicamente — recordar revisar la versión vigente cada año
                                        </span>
                                    </label>

                                    {fuente.actualizacionPeriodica && (
                                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                            <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                            <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">Recordatorio anual de revisión en</span>
                                            <Select
                                                value={fuente.mesRecordatorio}
                                                onValueChange={(val: string) => setFuentesNormativas(
                                                    fuentesNormativas.map(f => f.id === fuente.id ? { ...f, mesRecordatorio: val } : f)
                                                )}
                                            >
                                                <SelectTrigger className="w-full border-2 border-blue-300 focus:border-blue-500 bg-white h-8 text-xs">
                                                    <SelectValue placeholder="Mes..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white max-h-[200px] z-[9999]">
                                                    {NOMBRES_MESES.map((mes, i) => (
                                                        <SelectItem key={mes} value={String(i + 1)}>{mes}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="bg-gray-100 rounded-lg px-3 py-2">
                                        <span className="text-[11px] font-semibold text-gray-500 block mb-0.5">Cita generada</span>
                                        <span className="text-xs text-gray-700">
                                            {fuente.tipo || fuente.cita
                                                ? [fuente.tipo, fuente.cita].filter(Boolean).join(' — ')
                                                : '—'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setFuentesNormativas([...fuentesNormativas, nuevaFuenteNormativa()])}
                            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Agregar fuente
                        </button>
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

                    {/* Unidad del plazo */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            Unidad del Plazo
                        </Label>
                        <Select
                            value={formData.tipoDias}
                            onValueChange={(val: string) => setFormData({ ...formData, tipoDias: val })}
                        >
                            <SelectTrigger className="w-full border-2 border-gray-300 focus:border-blue-500">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-[9999]">
                                <SelectItem value="CALENDARIO">Días calendario</SelectItem>
                                <SelectItem value="HABILES">Días hábiles</SelectItem>
                                <SelectItem value="HORAS">Horas</SelectItem>
                            </SelectContent>
                        </Select>
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
                                : 'Crear Informe'}
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
