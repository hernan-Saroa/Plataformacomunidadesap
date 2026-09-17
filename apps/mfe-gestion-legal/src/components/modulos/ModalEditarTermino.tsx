/**
 * ModalEditarTermino — Edición de un informe/término ya creado.
 *
 * Contraparte de `ModalNuevoTermino`: cubre los mismos campos del informe (datos generales,
 * fuente normativa, responsable, prioridad) y además la PARAMETRIZACIÓN DEL VENCIMIENTO
 * completa —fecha base, unidad del plazo, duración y fecha límite—, que es justo lo que hay
 * que corregir cuando una entidad prorroga o adelanta la entrega.
 *
 * Tres decisiones que no son obvias al leer el JSX:
 *
 * 1. Se guarda SOLO lo que cambió. El backend usa la mera presencia de `fechaVencimiento` o
 *    de `horasAnticipacionAlertaPersonalizada` en el body como señal para rearmar las alertas
 *    (`TerminosController.update()`), así que mandar el formulario entero en cada guardado
 *    reenviaría avisos ya enviados aunque el plazo no se hubiera tocado.
 *
 * 2. La duración y la fecha límite están sincronizadas en los dos sentidos (ver
 *    `utils/plazoTermino.ts`): mover la fecha recalcula los días y cambiar los días recalcula
 *    la fecha, respetando si el plazo se cuenta en días calendario o hábiles.
 *
 * 3. La descripción se recompone antes de enviarse (ver `utils/observacionesTermino.ts`):
 *    `observaciones` guarda también los comentarios y los metadatos de los documentos
 *    adjuntos, y sobrescribirla a secas los borraría.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@esap-mfe/shared-ui/select';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { toast } from 'sonner';
import {
    AlertTriangle, BellRing, Building, Calendar, Clock, FileText, Loader2,
    Pencil, Plus, Scale, Send, Trash2, User,
} from 'lucide-react';
import { legalService } from '../../../../services/api/legal.service';
import { ModalHeaderClean } from './ModalHeaderClean';
import { useConfiguracionesSIGL } from '../config/ConfiguracionesSIGLContext';
import { SolicitudInforme } from '../core/types';
import { NOMBRES_MESES } from '../utils/programacionVencimientos';
import {
    ETIQUETA_UNIDAD_PLAZO,
    TipoDiasTermino,
    calcularDiasTermino,
    calcularFechaVencimiento,
    fechaBackendAYMD,
} from '../utils/plazoTermino';
import {
    ReglaAlertaGlobal,
    etiquetaAnticipacion,
    previsualizarAlertas,
} from '../utils/alertasVencimientoTermino';
import {
    ObservacionesSeparadas,
    componerObservaciones,
    separarObservaciones,
} from '../utils/observacionesTermino';

const PRIORIDADES = [
    { value: 'ALTA', label: 'Alta', color: '#DC2626', bg: '#FEE2E2' },
    { value: 'MEDIA', label: 'Media', color: '#F59E0B', bg: '#FEF3C7' },
    { value: 'BAJA', label: 'Baja', color: '#10B981', bg: '#D1FAE5' },
];

const DESTINATARIO_OTRO = '__OTRO__';
const ENTE_SOLICITANTE_OTRO = '__OTRO__';
const SIN_ASIGNAR = 'sin-asignar';

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
    mesRecordatorio: '',
});

interface FormularioEdicion {
    nombreActuacion: string;
    enteSolicitante: string;
    destinatario: string;
    fechaBase: string;
    fechaVencimiento: string;
    diasTermino: string;
    tipoDias: TipoDiasTermino;
    prioridad: string;
    responsableId: string;
    descripcion: string;
}

/** Fuente normativa del backend -> filas del formulario. */
function aFilasFuente(fundamento: any): FuenteNormativaEntry[] {
    const lista = Array.isArray(fundamento) ? fundamento : [];
    if (lista.length === 0) return [nuevaFuenteNormativa()];
    return lista.map((f: any, i: number) => ({
        id: `fn-existente-${i}`,
        tipo: f?.tipo || '',
        cita: f?.cita || '',
        actualizacionPeriodica: !!f?.actualizacionPeriodica,
        mesRecordatorio: f?.mesRecordatorio ? String(f.mesRecordatorio) : '',
    }));
}

/** Filas del formulario -> payload del backend (se descartan las filas vacías). */
export function aFundamentoNormativo(filas: FuenteNormativaEntry[]): Array<{ tipo: string; cita: string; actualizacionPeriodica: boolean; mesRecordatorio?: number }> {
    return filas
        .filter((f) => f.tipo || f.cita)
        .map((f) => ({
            tipo: f.tipo,
            cita: f.cita,
            actualizacionPeriodica: f.actualizacionPeriodica,
            mesRecordatorio: f.actualizacionPeriodica && f.mesRecordatorio ? Number(f.mesRecordatorio) : undefined,
        }));
}

/**
 * Payload de la edición: únicamente los campos que el usuario modificó.
 *
 * Exportada aparte del componente porque es la pieza que decide si el backend rearma o no las
 * alertas de vencimiento, y eso merece estar cubierto por pruebas sin montar todo el modal.
 */
export function construirPayloadEdicion(
    inicial: Record<string, any>,
    actual: Record<string, any>,
): Record<string, any> {
    const payload: Record<string, any> = {};
    for (const clave of Object.keys(actual)) {
        const antes = inicial[clave];
        const ahora = actual[clave];
        const cambio =
            typeof ahora === 'object' && ahora !== null
                ? JSON.stringify(antes ?? null) !== JSON.stringify(ahora)
                : antes !== ahora;
        if (cambio) payload[clave] = ahora;
    }
    return payload;
}

interface ModalEditarTerminoProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Informe seleccionado en el listado; de él se toma el UUID real para pedir el detalle. */
    solicitud: SolicitudInforme | null;
    onSuccess: () => void;
}

export function ModalEditarTermino({ open, onOpenChange, solicitud, onSuccess }: ModalEditarTerminoProps) {
    const { getDestinatariosInformeActivos, getEntesSolicitantesInformeActivos, getTiposFuenteNormativaActivos } = useConfiguracionesSIGL();
    const destinatariosDisponibles = getDestinatariosInformeActivos();
    const entesSolicitantesDisponibles = getEntesSolicitantesInformeActivos();
    const tiposFuenteNormativaDisponibles = getTiposFuenteNormativaActivos();

    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [profesionales, setProfesionales] = useState<any[]>([]);
    const [reglasGlobales, setReglasGlobales] = useState<ReglaAlertaGlobal[]>([]);
    const [horasAnticipacionPersonalizada, setHorasAnticipacionPersonalizada] = useState<number | null>(null);
    const [observacionesOriginales, setObservacionesOriginales] = useState<ObservacionesSeparadas>({ descripcionBase: '', comentarios: [], adjuntos: [] });

    const [form, setForm] = useState<FormularioEdicion | null>(null);
    const [formInicial, setFormInicial] = useState<FormularioEdicion | null>(null);
    // Valores tal como los tiene el backend, congelados en el momento de la carga. El diff se
    // hace contra esto y no contra el estado del formulario: los campos de texto libre ("Otro
    // (especificar)") viven en su propio estado, así que reconstruir el valor "inicial" a partir
    // de ellos devolvía el valor YA EDITADO y el cambio se perdía sin llegar a guardarse.
    const [snapshotInicial, setSnapshotInicial] = useState<Record<string, any> | null>(null);
    const [fuentes, setFuentes] = useState<FuenteNormativaEntry[]>([nuevaFuenteNormativa()]);
    const [destinatarioOtro, setDestinatarioOtro] = useState('');
    const [enteSolicitanteOtro, setEnteSolicitanteOtro] = useState('');

    const terminoId = solicitud?.metadata?.uuid || solicitud?.id || null;

    // Carga del detalle real: el listado mapea el término a `SolicitudInforme` y por el camino
    // pierde campos que aquí sí hay que editar (tipoDias, prioridad, responsableId, fechaBase).
    useEffect(() => {
        if (!open || !terminoId) return;
        let cancelado = false;

        const cargar = async () => {
            setCargando(true);
            setErrorCarga(null);
            try {
                const detalle: any = await legalService.getTerminoDetalle(terminoId);
                if (cancelado) return;

                const separadas = separarObservaciones(detalle?.observaciones);
                const tipoDias: TipoDiasTermino = ['CALENDARIO', 'HABILES', 'HORAS'].includes(detalle?.tipoDias)
                    ? detalle.tipoDias
                    : 'CALENDARIO';

                const entesConocidos = entesSolicitantesDisponibles.map((e: any) => e.nombre);
                const destinatariosConocidos = destinatariosDisponibles.map((d: any) => d.nombre);
                const enteGuardado = detalle?.enteSolicitante || '';
                const destinatarioGuardado = detalle?.destinatario || '';
                // Un valor libre (escrito con "Otro (especificar)") no está en la lista paramétrica:
                // se vuelve a mostrar en el campo de texto para no perderlo al reabrir la edición.
                const enteEsOtro = !!enteGuardado && !entesConocidos.includes(enteGuardado);
                const destinatarioEsOtro = !!destinatarioGuardado && !destinatariosConocidos.includes(destinatarioGuardado);

                const inicial: FormularioEdicion = {
                    nombreActuacion: detalle?.nombreActuacion || '',
                    enteSolicitante: enteEsOtro ? ENTE_SOLICITANTE_OTRO : enteGuardado,
                    destinatario: destinatarioEsOtro ? DESTINATARIO_OTRO : destinatarioGuardado,
                    fechaBase: fechaBackendAYMD(detalle?.fechaBase),
                    fechaVencimiento: fechaBackendAYMD(detalle?.fechaVencimiento),
                    diasTermino: detalle?.diasTermino != null ? String(detalle.diasTermino) : '',
                    tipoDias,
                    prioridad: detalle?.prioridad || 'MEDIA',
                    responsableId: detalle?.responsableId || SIN_ASIGNAR,
                    descripcion: separadas.descripcionBase,
                };
                const filas = aFilasFuente(detalle?.fundamentoNormativo);

                setObservacionesOriginales(separadas);
                setHorasAnticipacionPersonalizada(detalle?.horasAnticipacionAlertaPersonalizada ?? null);
                setForm(inicial);
                setFormInicial(inicial);
                setSnapshotInicial({
                    nombreActuacion: inicial.nombreActuacion,
                    enteSolicitante: enteGuardado,
                    destinatario: destinatarioGuardado,
                    fechaBase: inicial.fechaBase,
                    fechaVencimiento: inicial.fechaVencimiento,
                    diasTermino: detalle?.diasTermino != null ? Number(detalle.diasTermino) : null,
                    tipoDias,
                    prioridad: inicial.prioridad,
                    responsableId: detalle?.responsableId || null,
                    fundamentoNormativo: aFundamentoNormativo(filas),
                    // Se normaliza por el mismo camino que al guardar, para que una edición que
                    // no toca la descripción produzca exactamente la misma cadena y no cuente
                    // como cambio.
                    observaciones: componerObservaciones(separadas.descripcionBase, separadas),
                });
                setFuentes(filas);
                setEnteSolicitanteOtro(enteEsOtro ? enteGuardado : '');
                setDestinatarioOtro(destinatarioEsOtro ? destinatarioGuardado : '');
            } catch (error) {
                if (cancelado) return;
                console.error('Error cargando el detalle del término a editar:', error);
                setErrorCarga('No se pudo cargar la información del informe. Intente nuevamente.');
            } finally {
                if (!cancelado) setCargando(false);
            }
        };

        cargar();
        legalService.getAbogados()
            .then((data: any[]) => { if (!cancelado) setProfesionales(Array.isArray(data) ? data : []); })
            .catch(() => undefined);
        legalService.listarReglasAlertaTerminos()
            .then((data: any[]) => { if (!cancelado) setReglasGlobales(Array.isArray(data) ? data : []); })
            .catch(() => undefined);

        return () => { cancelado = true; };
        // `terminoId` identifica el informe; las listas paramétricas no deben re-disparar la carga.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, terminoId]);

    const actualizar = (cambios: Partial<FormularioEdicion>) => {
        setForm((prev) => (prev ? { ...prev, ...cambios } : prev));
    };

    /** Mover la fecha límite recalcula la duración del plazo en la unidad configurada. */
    const onCambiarFechaVencimiento = (valor: string) => {
        if (!form) return;
        const dias = calcularDiasTermino(form.fechaBase, valor, form.tipoDias);
        actualizar({ fechaVencimiento: valor, ...(dias != null ? { diasTermino: String(dias) } : {}) });
    };

    /** Cambiar la duración recalcula la fecha límite (salvo en horas, donde no hay conversión). */
    const onCambiarDiasTermino = (valor: string) => {
        if (!form) return;
        const dias = Number(valor);
        const fecha = Number.isFinite(dias) && valor !== ''
            ? calcularFechaVencimiento(form.fechaBase, dias, form.tipoDias)
            : null;
        actualizar({ diasTermino: valor, ...(fecha ? { fechaVencimiento: fecha } : {}) });
    };

    const onCambiarFechaBase = (valor: string) => {
        if (!form) return;
        const dias = calcularDiasTermino(valor, form.fechaVencimiento, form.tipoDias);
        actualizar({ fechaBase: valor, ...(dias != null ? { diasTermino: String(dias) } : {}) });
    };

    /** La unidad del plazo cambia el significado de la duración: se recalcula desde las fechas. */
    const onCambiarTipoDias = (valor: TipoDiasTermino) => {
        if (!form) return;
        const dias = calcularDiasTermino(form.fechaBase, form.fechaVencimiento, valor);
        actualizar({ tipoDias: valor, ...(dias != null ? { diasTermino: String(dias) } : {}) });
    };

    const previsualizacion = useMemo(() => {
        if (!form?.fechaVencimiento) return null;
        return previsualizarAlertas({
            fechaVencimientoYMD: form.fechaVencimiento,
            reglasGlobales,
            horasAnticipacionPersonalizada,
        });
    }, [form?.fechaVencimiento, reglasGlobales, horasAnticipacionPersonalizada]);

    const vencimientoCambio = !!form && !!formInicial && form.fechaVencimiento !== formInicial.fechaVencimiento;

    const handleGuardar = async () => {
        if (!form || !snapshotInicial || !terminoId) return;
        if (!form.nombreActuacion.trim()) {
            toast.error('El nombre del informe es obligatorio');
            return;
        }
        if (!form.fechaVencimiento) {
            toast.error('La fecha de vencimiento es obligatoria');
            return;
        }
        if (form.enteSolicitante === ENTE_SOLICITANTE_OTRO && !enteSolicitanteOtro.trim()) {
            toast.error('Especifique el ente solicitante');
            return;
        }
        if (form.destinatario === DESTINATARIO_OTRO && !destinatarioOtro.trim()) {
            toast.error('Especifique el destinatario del informe');
            return;
        }

        const actualPlano = {
            nombreActuacion: form.nombreActuacion.trim(),
            enteSolicitante: form.enteSolicitante === ENTE_SOLICITANTE_OTRO ? enteSolicitanteOtro.trim() : form.enteSolicitante,
            destinatario: form.destinatario === DESTINATARIO_OTRO ? destinatarioOtro.trim() : form.destinatario,
            fechaBase: form.fechaBase,
            fechaVencimiento: form.fechaVencimiento,
            diasTermino: form.diasTermino === '' ? null : Number(form.diasTermino),
            tipoDias: form.tipoDias,
            prioridad: form.prioridad,
            responsableId: form.responsableId === SIN_ASIGNAR ? null : form.responsableId,
            fundamentoNormativo: aFundamentoNormativo(fuentes),
            observaciones: componerObservaciones(form.descripcion, observacionesOriginales),
        };

        const payload = construirPayloadEdicion(snapshotInicial, actualPlano);

        if (Object.keys(payload).length === 0) {
            toast.info('No hay cambios por guardar');
            onOpenChange(false);
            return;
        }

        setGuardando(true);
        try {
            await legalService.updateTermino(terminoId, payload);

            // El aviso refleja lo que el backend acaba de hacer: al mover el vencimiento rearma
            // los umbrales y reevalúa el término contra las reglas globales sin esperar al cron.
            if ('fechaVencimiento' in payload && previsualizacion?.disparaAlerta) {
                const detalleAlerta = previsualizacion.modo === 'personalizada'
                    ? `Anticipación personalizada de ${etiquetaAnticipacion(previsualizacion.horasAnticipacionPersonalizada!)}`
                    : `Regla(s) global(es) de ${previsualizacion.reglasQueDisparan.map((r) => etiquetaAnticipacion(r.horasAnticipacion)).join(', ')}`;
                toast.success('Informe actualizado', {
                    description: `${detalleAlerta}: se notificará el vencimiento al responsable.`,
                });
            } else {
                toast.success('Informe actualizado correctamente');
            }

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Error actualizando el término:', error);
            toast.error('No se pudo guardar la edición del informe', { description: 'Por favor intente nuevamente.' });
        } finally {
            setGuardando(false);
        }
    };

    if (!solicitud) return null;

    const unidadEsHoras = form?.tipoDias === 'HORAS';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent hideCloseButton className="flex flex-col p-0 overflow-hidden" style={{ width: '660px', maxWidth: '90vw', minHeight: '520px', maxHeight: '88vh' }}>
                <DialogTitle className="sr-only">Editar Informe</DialogTitle>
                <DialogDescription className="sr-only">
                    Formulario para editar los datos y la parametrización de vencimiento de un informe existente
                </DialogDescription>

                <ModalHeaderClean
                    titulo="Editar Informe"
                    subtitulo={solicitud.asunto}
                    icono={Pencil}
                    colorIcono="blue"
                    onClose={() => onOpenChange(false)}
                />

                {cargando && (
                    <div className="flex-1 flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="ml-3 text-sm text-gray-500">Cargando informe...</span>
                    </div>
                )}

                {!cargando && errorCarga && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                        <p className="text-sm text-gray-600">{errorCarga}</p>
                    </div>
                )}

                {!cargando && !errorCarga && form && (
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        {/* Nombre del informe */}
                        <div className="space-y-2">
                            <Label htmlFor="editar-nombre" className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                <FileText className="w-4 h-4" />
                                Tipo de Actividad / Nombre *
                            </Label>
                            <Input
                                id="editar-nombre"
                                value={form.nombreActuacion}
                                onChange={(e) => actualizar({ nombreActuacion: e.target.value })}
                                className="border-2 border-gray-300 focus:border-blue-500"
                            />
                        </div>

                        {/* Ente solicitante */}
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                <Building className="w-4 h-4" />
                                Ente Solicitante
                            </Label>
                            <Select value={form.enteSolicitante} onValueChange={(val: string) => actualizar({ enteSolicitante: val })}>
                                <SelectTrigger className="w-full border-2 border-gray-300 focus:border-blue-500" aria-label="Ente Solicitante">
                                    <SelectValue placeholder="Seleccione el ente o persona solicitante..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white max-h-[200px] z-[9999]">
                                    {entesSolicitantesDisponibles.map((e: any) => (
                                        <SelectItem key={e.id} value={e.nombre}>{e.nombre}</SelectItem>
                                    ))}
                                    <SelectItem value={ENTE_SOLICITANTE_OTRO}>Otro (especificar)...</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.enteSolicitante === ENTE_SOLICITANTE_OTRO && (
                                <Input
                                    placeholder="Especifique el ente o persona solicitante..."
                                    value={enteSolicitanteOtro}
                                    onChange={(e) => setEnteSolicitanteOtro(e.target.value)}
                                    className="border-2 border-gray-300 focus:border-blue-500"
                                />
                            )}
                        </div>

                        {/* Destinatario */}
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                <Send className="w-4 h-4" />
                                Destinatario del Informe
                            </Label>
                            <Select value={form.destinatario} onValueChange={(val: string) => actualizar({ destinatario: val })}>
                                <SelectTrigger className="w-full border-2 border-gray-300 focus:border-blue-500" aria-label="Destinatario del Informe">
                                    <SelectValue placeholder="Seleccione entidad o dependencia receptora..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white max-h-[200px] z-[9999]">
                                    {destinatariosDisponibles.map((d: any) => (
                                        <SelectItem key={d.id} value={d.nombre}>{d.nombre}</SelectItem>
                                    ))}
                                    <SelectItem value={DESTINATARIO_OTRO}>Otro (especificar)...</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.destinatario === DESTINATARIO_OTRO && (
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
                                {fuentes.map((fuente, index) => (
                                    <div key={fuente.id} className="p-3 border-2 border-gray-200 rounded-lg space-y-3 bg-gray-50">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-600">Fuente {index + 1}</span>
                                            {fuentes.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFuentes(fuentes.filter((f) => f.id !== fuente.id))}
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
                                                    onValueChange={(val: string) => setFuentes(fuentes.map((f) => (f.id === fuente.id ? { ...f, tipo: val } : f)))}
                                                >
                                                    <SelectTrigger className="w-full border-2 border-gray-300 focus:border-blue-500 bg-white" aria-label={`Tipo de fuente ${index + 1}`}>
                                                        <SelectValue placeholder="Seleccione tipo..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-white max-h-[200px] z-[9999]">
                                                        {tiposFuenteNormativaDisponibles.map((t: any) => (
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
                                                    onChange={(e) => setFuentes(fuentes.map((f) => (f.id === fuente.id ? { ...f, cita: e.target.value } : f)))}
                                                    className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                                                />
                                            </div>
                                        </div>

                                        <label className="flex items-start gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={fuente.actualizacionPeriodica}
                                                onChange={(e) => setFuentes(fuentes.map((f) => (f.id === fuente.id
                                                    ? { ...f, actualizacionPeriodica: e.target.checked, mesRecordatorio: e.target.checked ? f.mesRecordatorio : '' }
                                                    : f)))}
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
                                                    onValueChange={(val: string) => setFuentes(fuentes.map((f) => (f.id === fuente.id ? { ...f, mesRecordatorio: val } : f)))}
                                                >
                                                    <SelectTrigger className="w-full border-2 border-blue-300 focus:border-blue-500 bg-white h-8 text-xs" aria-label={`Mes de recordatorio de la fuente ${index + 1}`}>
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
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => setFuentes([...fuentes, nuevaFuenteNormativa()])}
                                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Agregar fuente
                            </button>
                        </div>

                        {/* Parametrización del vencimiento */}
                        <div className="space-y-4 border-2 border-blue-100 bg-blue-50/40 rounded-lg p-4">
                            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                Parametrización del vencimiento
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="editar-fecha-base" className="text-sm font-bold text-gray-700">Fecha del Término (inicio)</Label>
                                    <Input
                                        id="editar-fecha-base"
                                        type="date"
                                        value={form.fechaBase}
                                        onChange={(e) => onCambiarFechaBase(e.target.value)}
                                        className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="editar-fecha-vencimiento" className="text-sm font-bold text-gray-700">Fecha de Vencimiento *</Label>
                                    <Input
                                        id="editar-fecha-vencimiento"
                                        type="date"
                                        value={form.fechaVencimiento}
                                        onChange={(e) => onCambiarFechaVencimiento(e.target.value)}
                                        className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700">Unidad del Plazo</Label>
                                    <Select value={form.tipoDias} onValueChange={(val: string) => onCambiarTipoDias(val as TipoDiasTermino)}>
                                        <SelectTrigger className="w-full border-2 border-gray-300 focus:border-blue-500 bg-white" aria-label="Unidad del Plazo">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white z-[9999]">
                                            <SelectItem value="CALENDARIO">{ETIQUETA_UNIDAD_PLAZO.CALENDARIO}</SelectItem>
                                            <SelectItem value="HABILES">{ETIQUETA_UNIDAD_PLAZO.HABILES}</SelectItem>
                                            <SelectItem value="HORAS">{ETIQUETA_UNIDAD_PLAZO.HORAS}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="editar-dias-termino" className="text-sm font-bold text-gray-700">
                                        Duración del plazo ({unidadEsHoras ? 'horas' : 'días'})
                                    </Label>
                                    <Input
                                        id="editar-dias-termino"
                                        type="number"
                                        min={0}
                                        value={form.diasTermino}
                                        onChange={(e) => onCambiarDiasTermino(e.target.value)}
                                        className="border-2 border-gray-300 focus:border-blue-500 bg-white"
                                    />
                                    <p className="text-[11px] text-gray-500">
                                        {unidadEsHoras
                                            ? 'En horas, la fecha límite manda: el plazo no se recalcula automáticamente.'
                                            : 'La fecha límite y la duración se recalculan entre sí desde la fecha de inicio.'}
                                    </p>
                                </div>
                            </div>

                            {/* Contraste contra las reglas globales de alerta (p. ej. la de 3 días) */}
                            {previsualizacion && (
                                <div
                                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                                        previsualizacion.disparaAlerta || previsualizacion.yaVencido
                                            ? 'bg-amber-50 border-amber-300'
                                            : 'bg-white border-gray-200'
                                    }`}
                                    data-testid="previsualizacion-alertas"
                                >
                                    <BellRing className={`w-4 h-4 mt-0.5 flex-shrink-0 ${previsualizacion.disparaAlerta || previsualizacion.yaVencido ? 'text-amber-600' : 'text-gray-400'}`} />
                                    <div className="text-xs text-gray-700 space-y-0.5">
                                        {previsualizacion.yaVencido && (
                                            <p className="font-bold text-amber-800">
                                                La fecha elegida ya pasó: al guardar se enviará el aviso de vencimiento.
                                            </p>
                                        )}
                                        {previsualizacion.modo === 'personalizada' ? (
                                            <p>
                                                Este informe tiene anticipación personalizada de{' '}
                                                <strong>{etiquetaAnticipacion(previsualizacion.horasAnticipacionPersonalizada!)}</strong> e ignora las reglas globales.{' '}
                                                {previsualizacion.disparaAlerta
                                                    ? 'Con esta fecha, la alerta se envía al guardar.'
                                                    : 'Con esta fecha, la alerta aún no se dispara.'}
                                            </p>
                                        ) : previsualizacion.disparaAlerta ? (
                                            <p>
                                                Al guardar se dispara la alerta global de{' '}
                                                <strong>{previsualizacion.reglasQueDisparan.map((r) => etiquetaAnticipacion(r.horasAnticipacion)).join(', ')}</strong>{' '}
                                                de anticipación: el responsable será notificado de inmediato.
                                            </p>
                                        ) : (
                                            <p>
                                                Con esta fecha el informe queda fuera de la ventana de las reglas globales de alerta;
                                                se notificará automáticamente cuando entre en ella.
                                            </p>
                                        )}
                                        {vencimientoCambio && (
                                            <p className="text-[11px] text-gray-500">
                                                Al cambiar el vencimiento se reinician los avisos ya enviados de este informe.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Prioridad */}
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4" />
                                Prioridad
                            </Label>
                            <div className="flex gap-2">
                                {PRIORIDADES.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => actualizar({ prioridad: p.value })}
                                        aria-pressed={form.prioridad === p.value}
                                        className={`flex-1 py-2 px-3 rounded-lg border-2 text-xs font-bold transition-all ${
                                            form.prioridad === p.value ? 'shadow-md scale-105' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                        }`}
                                        style={form.prioridad === p.value ? { borderColor: p.color, background: p.bg, color: p.color } : {}}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Responsable */}
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                <User className="w-4 h-4" />
                                Responsable / Abogado
                            </Label>
                            <Select value={form.responsableId} onValueChange={(val: string) => actualizar({ responsableId: val })}>
                                <SelectTrigger className="w-full border-2 border-gray-300 focus:border-blue-500" aria-label="Responsable / Abogado">
                                    <SelectValue placeholder="Seleccione responsable..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white max-h-[200px] z-[9999]">
                                    <SelectItem value={SIN_ASIGNAR}>Sin asignar</SelectItem>
                                    {profesionales.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.nombreCompleto || `${p.firstName || ''} ${p.lastName || ''}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Descripción */}
                        <div className="space-y-2">
                            <Label htmlFor="editar-descripcion" className="text-sm font-bold text-gray-700">
                                Descripción / Observaciones
                            </Label>
                            <Textarea
                                id="editar-descripcion"
                                value={form.descripcion}
                                onChange={(e) => actualizar({ descripcion: e.target.value })}
                                className="border-2 border-gray-300 focus:border-blue-500 min-h-[80px]"
                            />
                            {(observacionesOriginales.comentarios.length > 0 || observacionesOriginales.adjuntos.length > 0) && (
                                <p className="text-[11px] text-gray-500">
                                    Los comentarios y los documentos adjuntos ya registrados se conservan; aquí solo se edita la descripción.
                                </p>
                            )}
                        </div>
                    </div>
                )}

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
                        onClick={handleGuardar}
                        disabled={guardando || cargando || !form || !form.nombreActuacion.trim() || !form.fechaVencimiento}
                        className={`flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-lg transition-all ${
                            guardando || cargando || !form || !form.nombreActuacion.trim() || !form.fechaVencimiento
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:shadow-lg'
                        }`}
                        style={{ background: guardando || cargando || !form || !form.nombreActuacion.trim() || !form.fechaVencimiento ? '#9CA3AF' : '#003DA5' }}
                    >
                        {guardando ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
