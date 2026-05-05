/**
 * ModalAnexarProcesoDisciplinario — Anexar un proceso disciplinario a otro
 * Réplica de ModalAnexarProceso (Defensa Judicial) para Juzgamiento
 * Uses UUIDs for the API endpoint, not radicados
 */
import { useState, useEffect } from 'react';
import { X, Search, CheckCircle, AlertCircle, Loader2, Link as LinkIcon, Gavel } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Card } from '@esap-mfe/shared-ui/card';
import { legalService } from '../../../../services/api/legal.service';

interface ModalAnexarProcesoDisciplinarioProps {
    isOpen: boolean;
    onClose: () => void;
    procesoActual: {
        id: string;      // radicado
        uuid?: string;    // internal UUID
        disciplinado?: string;
        investigado?: string;
        tipoFalta?: string;
        etapa?: string;
    };
    onAnexado?: () => void;
}

export function ModalAnexarProcesoDisciplinario({
    isOpen,
    onClose,
    procesoActual,
    onAnexado
}: ModalAnexarProcesoDisciplinarioProps) {
    const [busqueda, setBusqueda] = useState('');
    const [procesoAAnexar, setProcesoAAnexar] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [procesos, setProcesos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadProcesos();
        } else {
            setBusqueda('');
            setProcesoAAnexar(null);
        }
    }, [isOpen]);

    const loadProcesos = async () => {
        setLoading(true);
        try {
            const data = await legalService.getJuzgamientoProcesos();
            // Excluir el proceso actual para no permitir anexarse a sí mismo
            const filtrados = (Array.isArray(data) ? data : []).filter(
                (p: any) => p.id !== procesoActual.id && !p.proceso_principal_id
            );
            setProcesos(filtrados);
        } catch (error) {
            console.error('Error cargando procesos:', error);
            toast.error('Error al cargar la lista de procesos');
        } finally {
            setLoading(false);
        }
    };

    const procesosFiltrados = procesos.filter(
        p => (p.id || '').toLowerCase().includes(busqueda.toLowerCase()) ||
            (p.investigado || p.disciplinado || '').toLowerCase().includes(busqueda.toLowerCase()) ||
            (p.tipoFalta || '').toLowerCase().includes(busqueda.toLowerCase())
    );

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!procesoAAnexar) {
            toast.error('⚠️ Debe seleccionar un proceso para anexarlo');
            return;
        }

        setIsSubmitting(true);

        try {
            // Use juzgamiento-specific annex endpoint (works with radicados)
            // radicado = the one becoming a child (procesoAAnexar)
            // principalRadicado = the parent (procesoActual)
            await legalService.anexarJuzgamientoProceso(procesoAAnexar.id, procesoActual.id, 'Usuario Actual');

            toast.success(`✅ Proceso ${procesoAAnexar.id} ha sido anexado a ${procesoActual.id}`);

            if (onAnexado) {
                onAnexado();
            }

            setProcesoAAnexar(null);
            setBusqueda('');
            onClose();
        } catch (error: any) {
            console.error('Error anexando proceso:', error);
            toast.error(error?.message || 'Error al anexar el proceso');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent hideCloseButton className="max-w-2xl h-[80vh] flex flex-col p-0">
                <DialogTitle className="sr-only">
                    Anexar Proceso Disciplinario - {procesoActual.id}
                </DialogTitle>
                <DialogDescription className="sr-only">
                    Vincular este proceso disciplinario a otro proceso principal
                </DialogDescription>

                {/* HEADER */}
                <ModalHeaderClean
                    icono={LinkIcon}
                    colorIcono="blue"
                    titulo="Anexar a Otro Proceso"
                    subtitulo={procesoActual.id}
                    badgePrincipal="Procesos Vinculados"
                    onClose={onClose}
                />

                {/* CONTENIDO */}
                <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Proceso Actual */}
                        <Card className="p-4 bg-indigo-50 border-indigo-200">
                            <div className="flex items-center gap-3">
                                <Gavel className="w-5 h-5 text-indigo-600" />
                                <div>
                                    <p className="text-xs text-indigo-600 font-bold">Proceso que se anexará</p>
                                    <p className="text-sm font-bold text-indigo-900">
                                        {procesoActual.id} — {procesoActual.investigado || procesoActual.disciplinado || 'Sin investigado'}
                                    </p>
                                    <p className="text-xs text-indigo-700 mt-0.5">
                                        {procesoActual.tipoFalta} • {procesoActual.etapa}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Búsqueda */}
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-900">
                                Seleccionar Proceso Principal <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    type="text"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar por radicado, investigado o tipo de falta..."
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Lista de Procesos */}
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-900">
                                Procesos Disponibles ({procesosFiltrados.length})
                            </Label>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                        <span className="ml-2 text-sm text-gray-600">Cargando procesos...</span>
                                    </div>
                                ) : procesosFiltrados.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <Gavel className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No se encontraron procesos disponibles.</p>
                                    </div>
                                ) : (
                                    procesosFiltrados.map((proceso) => (
                                        <button
                                            key={proceso.id}
                                            type="button"
                                            onClick={() => setProcesoAAnexar(proceso)}
                                            className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-start gap-3 ${procesoAAnexar?.id === proceso.id
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="mt-1">
                                                {procesoAAnexar?.id === proceso.id ? (
                                                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 flex justify-between">
                                                    <span>{proceso.id}</span>
                                                    <span className="text-xs font-normal px-2 py-0.5 rounded bg-gray-100 text-gray-600">{proceso.etapa}</span>
                                                </p>
                                                <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                                                    <strong>Investigado:</strong> {proceso.investigado || proceso.disciplinado || 'N/A'}
                                                </p>
                                                <p className="text-xs text-orange-600 mt-0.5">{proceso.tipoFalta}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Alerta informativa */}
                        {procesoAAnexar && (
                            <Card className="p-4 bg-amber-50 border-amber-200">
                                <div className="flex gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-900">Confirmación Importante</p>
                                        <p className="text-xs text-amber-700 mt-1">
                                            Al anexar el proceso <strong>{procesoAAnexar.id}</strong> a <strong>{procesoActual.id}</strong>, el primero dejará de verse como un proceso independiente y quedará agrupado bajo el proceso actual.
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </form>
                </div>

                {/* FOOTER */}
                <div className="flex-shrink-0 px-6 py-4 bg-white border-t flex justify-between items-center">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                    </Button>

                    <Button
                        onClick={() => handleSubmit()}
                        disabled={!procesoAAnexar || isSubmitting}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Anexando...
                            </>
                        ) : (
                            <>
                                <LinkIcon className="w-4 h-4 mr-2" />
                                Confirmar Vinculación
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
