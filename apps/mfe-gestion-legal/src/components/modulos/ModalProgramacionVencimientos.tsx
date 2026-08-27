import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Label } from '@esap-mfe/shared-ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@esap-mfe/shared-ui/select';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Repeat, Bell } from 'lucide-react';
import {
    HORIZONTE_DURACION_INDEFINIDA_ANIOS,
    NOMBRES_MESES_CORTOS,
    PERIODICIDADES,
    Periodicidad,
    ProgramacionVencimientos,
    TipoDiasPlazo,
    generarOcurrencias,
    mesesPorDefecto,
} from '../utils/programacionVencimientos';
import { fechaLocalYMD } from '../utils/diasHabiles';

interface ModalProgramacionVencimientosProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialValue?: ProgramacionVencimientos | null;
    onSave: (config: ProgramacionVencimientos) => void;
}

const DURACIONES_ANIOS = [1, 2, 3, 5];

function defaultConfig(): ProgramacionVencimientos {
    return {
        periodicidad: 'MENSUAL',
        plazoDesde: 1,
        plazoHasta: 5,
        tipoDias: 'HABILES',
        mesesActivos: mesesPorDefecto('MENSUAL'),
        fechaInicio: fechaLocalYMD(new Date()),
        duracionAnios: 1,
    };
}

export function ModalProgramacionVencimientos({ open, onOpenChange, initialValue, onSave }: ModalProgramacionVencimientosProps) {
    const [periodicidad, setPeriodicidad] = useState<Periodicidad>('MENSUAL');
    const [plazoDesde, setPlazoDesde] = useState<number>(1);
    const [plazoHasta, setPlazoHasta] = useState<number>(5);
    const [tipoDias, setTipoDias] = useState<TipoDiasPlazo>('HABILES');
    const [mesesActivos, setMesesActivos] = useState<number[]>(mesesPorDefecto('MENSUAL'));
    const [fechaInicio, setFechaInicio] = useState<string>(() => fechaLocalYMD(new Date()));
    const [duracionAnios, setDuracionAnios] = useState<number | null>(1);

    useEffect(() => {
        if (!open) return;
        const base = initialValue || defaultConfig();
        setPeriodicidad(base.periodicidad);
        setPlazoDesde(base.plazoDesde);
        setPlazoHasta(base.plazoHasta);
        setTipoDias(base.tipoDias);
        setMesesActivos(base.mesesActivos);
        setFechaInicio(base.fechaInicio || fechaLocalYMD(new Date()));
        setDuracionAnios(base.duracionAnios ?? 1);
    }, [open, initialValue]);

    const handlePeriodicidadChange = (val: Periodicidad) => {
        setPeriodicidad(val);
        setMesesActivos(mesesPorDefecto(val));
    };

    const toggleMes = (mes: number) => {
        setMesesActivos((prev) =>
            prev.includes(mes) ? prev.filter((m) => m !== mes) : [...prev, mes].sort((a, b) => a - b)
        );
    };

    const plazoDesdeValido = plazoDesde >= 1;
    const plazoHastaValido = plazoHasta <= 31;
    const rangoValido = plazoHasta >= plazoDesde;
    const plazoValido = plazoDesdeValido && plazoHastaValido && rangoValido;
    const fechaInicioValida = !!fechaInicio;
    const puedeGuardar = plazoValido && mesesActivos.length > 0 && fechaInicioValida;

    const plazoError = !plazoDesdeValido
        ? 'El día inicial debe ser al menos 1.'
        : !plazoHastaValido
            ? 'El día final no puede ser mayor a 31.'
            : !rangoValido
                ? 'El día final debe ser mayor o igual al inicial.'
                : '';

    const configActual: ProgramacionVencimientos = {
        periodicidad, plazoDesde, plazoHasta, tipoDias, mesesActivos, fechaInicio, duracionAnios
    };

    const ocurrencias = useMemo(() => {
        if (!plazoValido || mesesActivos.length === 0 || !fechaInicioValida) return [];
        return generarOcurrencias(configActual);
    }, [periodicidad, plazoDesde, plazoHasta, tipoDias, mesesActivos, plazoValido, fechaInicio, duracionAnios, fechaInicioValida]);

    const tipoDiasLabel = tipoDias === 'HABILES' ? 'hábiles' : 'calendario';

    const handleGuardar = () => {
        if (!puedeGuardar) return;
        onSave(configActual);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent hideCloseButton className="flex flex-col p-0 overflow-hidden" style={{ width: '620px', maxWidth: '90vw', minHeight: '520px', maxHeight: '88vh' }}>
                <DialogTitle className="sr-only">Programación de vencimientos</DialogTitle>
                <DialogDescription className="sr-only">Configure la periodicidad y el plazo para generar los vencimientos recurrentes</DialogDescription>

                <ModalHeaderClean
                    titulo="Programación de vencimientos"
                    subtitulo="Defina la periodicidad y el plazo para generar los vencimientos del año"
                    icono={Repeat}
                    colorIcono="blue"
                    onClose={() => onOpenChange(false)}
                />

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Periodicidad */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">Periodicidad</Label>
                        <Select value={periodicidad} onValueChange={(val: string) => handlePeriodicidadChange(val as Periodicidad)}>
                            <SelectTrigger className="w-full border-2 border-gray-300 focus:border-blue-500">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-[9999]">
                                {PERIODICIDADES.map((p) => (
                                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Plazo */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">Plazo</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">del</span>
                            <input
                                type="number"
                                min={1}
                                max={31}
                                value={plazoDesde}
                                onChange={(e) => setPlazoDesde(Number(e.target.value))}
                                className="w-16 border-2 border-gray-300 focus:border-blue-500 rounded-lg px-2 py-1.5 text-sm text-center"
                            />
                            <span className="text-sm text-gray-500">al</span>
                            <input
                                type="number"
                                min={1}
                                max={31}
                                value={plazoHasta}
                                onChange={(e) => setPlazoHasta(Number(e.target.value))}
                                className="w-16 border-2 border-gray-300 focus:border-blue-500 rounded-lg px-2 py-1.5 text-sm text-center"
                            />
                            <Select value={tipoDias} onValueChange={(val: string) => setTipoDias(val as TipoDiasPlazo)}>
                                <SelectTrigger className="flex-1 border-2 border-gray-300 focus:border-blue-500">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white z-[9999]">
                                    <SelectItem value="CALENDARIO">calendario</SelectItem>
                                    <SelectItem value="HABILES">hábiles</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {plazoError && (
                            <p className="text-xs text-red-600">{plazoError}</p>
                        )}
                    </div>

                    {/* Fecha de inicio y duración */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">Empieza a contar desde</Label>
                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                                className="w-full border-2 border-gray-300 focus:border-blue-500 rounded-lg px-2 py-1.5 text-sm"
                            />
                            <p className="text-xs text-gray-400">Cualquier vencimiento anterior a esta fecha no se genera.</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">Duración</Label>
                            <Select
                                value={duracionAnios === null ? 'INDEFINIDA' : String(duracionAnios)}
                                onValueChange={(val: string) => setDuracionAnios(val === 'INDEFINIDA' ? null : Number(val))}
                            >
                                <SelectTrigger className="w-full border-2 border-gray-300 focus:border-blue-500">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white z-[9999]">
                                    {DURACIONES_ANIOS.map((n) => (
                                        <SelectItem key={n} value={String(n)}>{n} año{n === 1 ? '' : 's'}</SelectItem>
                                    ))}
                                    <SelectItem value="INDEFINIDA">Indefinida</SelectItem>
                                </SelectContent>
                            </Select>
                            {duracionAnios === null && (
                                <p className="text-xs text-gray-400">Se generarán vencimientos para los próximos {HORIZONTE_DURACION_INDEFINIDA_ANIOS} años.</p>
                            )}
                        </div>
                    </div>

                    {/* Meses de presentación */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-gray-700">Meses de presentación</Label>
                            <span className="text-xs text-gray-400">toque para activar</span>
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                            {NOMBRES_MESES_CORTOS.map((nombre, idx) => {
                                const mes = idx + 1;
                                const activo = mesesActivos.includes(mes);
                                return (
                                    <button
                                        key={mes}
                                        type="button"
                                        onClick={() => toggleMes(mes)}
                                        className={`py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                                            activo
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 text-gray-400 hover:border-gray-300'
                                        }`}
                                    >
                                        {nombre}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Alerta informativa */}
                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                        <Bell className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700">
                            Alerta automática 3 días antes de cada vencimiento · recordatorio manual disponible
                        </p>
                    </div>

                    {/* Vista previa */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-gray-700">Vista previa · vencimientos generados</Label>
                            <span className="text-xs font-semibold text-gray-500">{ocurrencias.length} vencimiento{ocurrencias.length === 1 ? '' : 's'} en total</span>
                        </div>

                        {ocurrencias.length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-4 text-center border border-dashed border-gray-200 rounded-lg">
                                Seleccione al menos un mes y un plazo válido para previsualizar los vencimientos.
                            </p>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                                    {ocurrencias.map((o) => (
                                        <div
                                            key={`${o.anio}-${o.mes}`}
                                            className={`rounded-lg border-2 px-3 py-2 text-xs ${
                                                o.esProximo
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : o.esPasado
                                                        ? 'border-gray-100 bg-gray-50 text-gray-400'
                                                        : 'border-gray-200 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between font-bold text-gray-700">
                                                <span className={o.esPasado ? 'text-gray-400' : ''}>
                                                    {NOMBRES_MESES_CORTOS[o.mes - 1]} {o.anio}
                                                </span>
                                                {o.esProximo && (
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100 rounded-full px-1.5 py-0.5">Próximo</span>
                                                )}
                                            </div>
                                            <div className={o.esPasado ? 'text-gray-400' : 'text-gray-500'}>
                                                días {String(plazoDesde).padStart(2, '0')}-{String(plazoHasta).padStart(2, '0')} {tipoDiasLabel}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

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
                        disabled={!puedeGuardar}
                        className={`px-5 py-2 text-sm font-bold text-white rounded-lg transition-all ${
                            puedeGuardar ? 'hover:shadow-lg' : 'opacity-50 cursor-not-allowed'
                        }`}
                        style={{ background: puedeGuardar ? '#003DA5' : '#9CA3AF' }}
                    >
                        Guardar programación
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
