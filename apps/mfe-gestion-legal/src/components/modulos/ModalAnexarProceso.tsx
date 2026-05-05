import { useState, useEffect } from 'react';
import { X, Search, AlertCircle, Loader2, Link as LinkIcon, Briefcase, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { legalService } from '../../../../services/api/legal.service';
import type { ExpedienteJudicial } from '../core/types';

interface ModalAnexarProcesoProps {
    isOpen: boolean;
    onClose: () => void;
    expedienteActual: ExpedienteJudicial;
    onAnexado?: () => void;
}

export function ModalAnexarProceso({
    isOpen,
    onClose,
    expedienteActual,
    onAnexado
}: ModalAnexarProcesoProps) {
    const [busqueda, setBusqueda] = useState('');
    const [expedientePrincipal, setExpedientePrincipal] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expedientes, setExpedientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadExpedientes();
        } else {
            setBusqueda('');
            setExpedientePrincipal(null);
        }
    }, [isOpen]);

    const loadExpedientes = async () => {
        setLoading(true);
        try {
            const data = await legalService.getExpedientes({ estado: 'ACTIVO' });
            const filtrados = data.filter((e: any) => e.id !== expedienteActual.id && e.id !== expedienteActual.uuid && !e.proceso_principal_id);
            setExpedientes(filtrados);
        } catch (error) {
            console.error('Error cargando expedientes:', error);
            toast.error('Error al cargar la lista de expedientes');
        } finally {
            setLoading(false);
        }
    };

    const expedientesFiltrados = expedientes.filter(
        e => e.radicado?.toLowerCase().includes(busqueda.toLowerCase()) ||
            e.demandante?.toLowerCase().includes(busqueda.toLowerCase()) ||
            e.demandado?.toLowerCase().includes(busqueda.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!expedientePrincipal) {
            toast.error('Debe seleccionar un proceso principal');
            return;
        }

        setIsSubmitting(true);

        try {
            const idActual = expedienteActual.uuid || expedienteActual.id;
            await legalService.anexarExpediente(idActual, expedientePrincipal.id, 'Usuario Actual');

            toast.success(`Expediente anexado a ${expedientePrincipal.radicado}`);

            if (onAnexado) onAnexado();

            setExpedientePrincipal(null);
            setBusqueda('');
            onClose();
        } catch (error: any) {
            console.error('Error anexando proceso:', error);
            toast.error(error.response?.data?.message || 'Error al anexar el proceso');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent hideCloseButton className="w-[580px] max-w-[90vw] flex flex-col p-0 max-h-[85vh]">
                <DialogTitle className="sr-only">
                    Asociar proceso - {expedienteActual.radicado}
                </DialogTitle>
                <DialogDescription className="sr-only">
                    Vincular este expediente a un proceso principal
                </DialogDescription>

                <ModalHeaderClean
                    icono={LinkIcon}
                    colorIcono="blue"
                    titulo="Asociar a Proceso Principal"
                    subtitulo="Defensa Judicial"
                    badgePrincipal="Vinculación"
                    onClose={onClose}
                />

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                    {/* Panel de flujo visual */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            Vinculación resultante
                        </p>
                        <div className="flex items-center gap-2">
                            {/* Expediente actual */}
                            <div className="flex-1 rounded-md bg-blue-50 border border-blue-100 px-3 py-2.5">
                                <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">Este expediente</p>
                                <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{expedienteActual.radicado}</p>
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                    {expedienteActual.demandante} vs {expedienteActual.demandado}
                                </p>
                            </div>

                            <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />

                            {/* Proceso principal (dinámico) */}
                            <div className={`flex-1 rounded-md border px-3 py-2.5 transition-all duration-200 ${
                                expedientePrincipal
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-gray-50 border-dashed border-gray-200'
                            }`}>
                                {expedientePrincipal ? (
                                    <>
                                        <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">Proceso principal</p>
                                        <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{expedientePrincipal.radicado}</p>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                            {expedientePrincipal.demandante} vs {expedientePrincipal.demandado}
                                        </p>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center min-h-[46px]">
                                        <p className="text-xs text-gray-400 text-center leading-relaxed">
                                            Selecciona un proceso<br />de la lista
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Búsqueda */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <Input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por radicado, demandante o demandado..."
                            className="pl-9 text-sm"
                        />
                    </div>

                    {/* Lista de procesos */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                Procesos disponibles
                            </span>
                            <span className="text-xs text-gray-400">
                                {expedientesFiltrados.length} {expedientesFiltrados.length === 1 ? 'resultado' : 'resultados'}
                            </span>
                        </div>

                        <div className="space-y-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1.5">
                            {loading ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                    <span className="ml-2 text-sm text-gray-500">Cargando procesos...</span>
                                </div>
                            ) : expedientesFiltrados.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                    <Briefcase className="w-7 h-7 mb-2 opacity-30" />
                                    <p className="text-sm">
                                        {busqueda
                                            ? 'Sin resultados para esta búsqueda'
                                            : 'No hay procesos disponibles'}
                                    </p>
                                </div>
                            ) : (
                                expedientesFiltrados.map((proceso) => {
                                    const isSelected = expedientePrincipal?.id === proceso.id;
                                    return (
                                        <button
                                            key={proceso.id}
                                            type="button"
                                            onClick={() => setExpedientePrincipal(isSelected ? null : proceso)}
                                            className={`w-full px-3 py-2.5 rounded-md text-left flex items-center gap-3 transition-all ${
                                                isSelected
                                                    ? 'bg-blue-50 ring-1 ring-inset ring-blue-300'
                                                    : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            {/* Radio visual */}
                                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                                isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'
                                            }`}>
                                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <span className="text-sm font-semibold text-gray-900 truncate">
                                                        {proceso.radicado}
                                                    </span>
                                                    <span className="text-xs text-gray-400 flex-shrink-0">
                                                        {new Date(proceso.fechaRadicacion).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                    {proceso.demandante} vs {proceso.demandado}
                                                </p>
                                                {proceso.etapaProcesal && (
                                                    <span className="text-[10px] font-medium text-blue-500">
                                                        {proceso.etapaProcesal}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Aviso de impacto */}
                    {expedientePrincipal && (
                        <div className="flex gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-3">
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 leading-relaxed">
                                Este expediente quedará agrupado bajo{' '}
                                <strong>{expedientePrincipal.radicado}</strong> y dejará de aparecer
                                como tarjeta independiente en el Kanban.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-5 py-3 border-t bg-white flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-sm"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!expedientePrincipal || isSubmitting}
                        className="bg-blue-600 text-white hover:bg-blue-700 text-sm"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                Vinculando...
                            </>
                        ) : (
                            <>
                                <LinkIcon className="w-4 h-4 mr-1.5" />
                                Confirmar vinculación
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
