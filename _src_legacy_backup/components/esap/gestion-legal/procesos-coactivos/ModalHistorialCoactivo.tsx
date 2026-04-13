import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, User, Calendar, FileText, ArrowRight, Activity } from 'lucide-react';
import { ModalHeaderClean } from '../modulos/ModalHeaderClean';
import { procesosCoactivosService, CoactivoHistorial } from '../../../../services/api/legal.service';
import { toast } from 'sonner';

interface ModalHistorialCoactivoProps {
    isOpen: boolean;
    onClose: () => void;
    procesoId: string;
    radicado: string;
}

export function ModalHistorialCoactivo({
    isOpen,
    onClose,
    procesoId,
    radicado
}: ModalHistorialCoactivoProps) {
    const [historial, setHistorial] = useState<CoactivoHistorial[]>([]);
    const [loading, setLoading] = useState(false);

    // Helpers de formateo
    const formatCurrency = (val: string | number | undefined) => {
        if (val === undefined || val === null) return '';
        const num = Number(val);
        if (isNaN(num)) return val.toString();
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
    };

    const shouldFormat = (field: string | undefined) => {
        if (!field) return false;
        const lower = field.toLowerCase();
        return lower.includes('valor') || lower.includes('saldo') || lower.includes('monto') || lower.includes('total') || lower.includes('obligacion');
    };

    const formatDetails = (text: string | undefined) => {
        if (!text) return '';
        // Reemplaza patrones como $1000000 o $ 1000000 con formato moneda
        return text.replace(/\$\s?(\d+)/g, (match, p1) => formatCurrency(p1));
    };

    useEffect(() => {
        if (isOpen && procesoId) {
            loadHistorial();
        }
    }, [isOpen, procesoId]);

    const loadHistorial = async () => {
        setLoading(true);
        try {
            const data = await procesosCoactivosService.getHistorial(procesoId);
            // Defensive check: ensure data is an array
            setHistorial(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error cargando historial:', error);
            toast.error('Error al cargar la trazabilidad del proceso');
            setHistorial([]); // Reset to empty array on error
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                key="historial-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-[105]"
                onClick={onClose}
            />
            <motion.div
                key="historial-panel"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                onClick={(e) => e.stopPropagation()}
                className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[106] overflow-hidden flex flex-col"
            >
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <History className="w-5 h-5 text-blue-600" />
                            Trazabilidad ({historial.length})
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Radicado: {radicado}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : historial.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No hay eventos registrados</p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
                            {historial.map((evento, index) => (
                                <div key={evento.id || index} className="relative pl-6">
                                    {/* Dot */}
                                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${evento.tipoEvento === 'CREACION' ? 'bg-green-500' :
                                        evento.tipoEvento === 'PAGO' ? 'bg-green-600' :
                                            evento.tipoEvento === 'CAMBIO_ETAPA' ? 'bg-purple-500' :
                                                'bg-blue-500'
                                        }`} />

                                    {/* Content */}
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${evento.tipoEvento === 'CREACION' ? 'bg-green-100 text-green-700' :
                                                evento.tipoEvento === 'PAGO' ? 'bg-green-100 text-green-800' :
                                                    evento.tipoEvento === 'CAMBIO_ETAPA' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-blue-100 text-blue-700'
                                                }`}>
                                                {evento.tipoEvento}
                                            </span>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(evento.fechaEvento).toLocaleDateString()} {new Date(evento.fechaEvento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <p className="text-sm font-semibold text-gray-800 mt-2">
                                            {formatDetails(evento.detalles)}
                                        </p>

                                        {evento.campoModificado && evento.valorAnterior && (
                                            <div className="mt-2 text-xs bg-white p-2 rounded border border-gray-200">
                                                {evento.campoModificado === 'deudor' ? (
                                                    <div className="flex flex-col gap-1 text-gray-600">
                                                        {(() => {
                                                            try {
                                                                const oldVal = JSON.parse(evento.valorAnterior);
                                                                const newVal = JSON.parse(evento.valorNuevo || '{}');
                                                                // Mostrar solo lo relevante o lo que cambió
                                                                // Por simplicidad, mostraremos lo nuevo de forma legible
                                                                return (
                                                                    <div className="grid grid-cols-1 gap-1">
                                                                        <div className="font-medium text-gray-900 mb-1">Datos Actualizados:</div>
                                                                        {Object.entries(newVal).map(([key, value]) => (
                                                                            <div key={key} className="flex gap-1">
                                                                                <span className="capitalize font-medium text-gray-500">{key}:</span>
                                                                                <span className="text-gray-900 truncate">{String(value)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            } catch (e) {
                                                                return <span className="text-gray-500 italic">Datos en formato JSON</span>;
                                                            }
                                                        })()}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <span className="line-through opacity-70 truncate max-w-[100px]">
                                                            {shouldFormat(evento.campoModificado) ? formatCurrency(evento.valorAnterior) : evento.valorAnterior}
                                                        </span>
                                                        <ArrowRight className="w-3 h-3" />
                                                        <span className="font-medium text-gray-900 truncate max-w-[100px]">
                                                            {shouldFormat(evento.campoModificado) ? formatCurrency(evento.valorNuevo) : evento.valorNuevo}
                                                        </span>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                                                    {evento.campoModificado}
                                                </p>
                                            </div>
                                        )}

                                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 border-t border-gray-200 pt-2">
                                            <User className="w-3 h-3" />
                                            {evento.usuario || 'Sistema'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
