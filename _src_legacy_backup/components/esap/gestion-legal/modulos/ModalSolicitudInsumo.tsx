/**
 * ModalSolicitudInsumo - Modal para solicitar insumos a otras áreas
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState } from 'react';
import { Send, User, Calendar, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { ModalHeaderClean } from './ModalHeaderClean';
import { ocService } from '../../../../services/api/legal.service';

interface ModalSolicitudInsumoProps {
    isOpen: boolean;
    onClose: () => void;
    requerimientoId: string;
    fechaVencimientoPrincipal: Date;
    onSuccess?: () => void;
}

export function ModalSolicitudInsumo({
    isOpen,
    onClose,
    requerimientoId,
    fechaVencimientoPrincipal,
    onSuccess
}: ModalSolicitudInsumoProps) {
    const [areaDestino, setAreaDestino] = useState('');
    const [funcionarioDestino, setFuncionarioDestino] = useState('');
    const [emailDestino, setEmailDestino] = useState('');
    const [descripcionSolicitud, setDescripcionSolicitud] = useState('');
    const [fechaVencimientoInterna, setFechaVencimientoInterna] = useState('');
    const [enviando, setEnviando] = useState(false);

    const areas = [
        'Subdirección Administrativa y Financiera',
        'Subdirección Académica',
        'Dirección de Planeación',
        'Talento Humano',
        'Tesorería',
        'Contratación',
        'Oficina Asesora Jurídica (Interno)',
        'Otra'
    ];

    const handleSubmit = async () => {
        // Validaciones
        if (!areaDestino) {
            toast.error('Seleccione un área de destino');
            return;
        }
        if (!descripcionSolicitud.trim()) {
            toast.error('Describa la solicitud');
            return;
        }
        if (!fechaVencimientoInterna) {
            toast.error('Defina una fecha límite interna');
            return;
        }

        // Validar fecha
        const fechaLimite = new Date(fechaVencimientoInterna);
        const fechaPrincipal = new Date(fechaVencimientoPrincipal);
        if (fechaLimite > fechaPrincipal) {
            toast.error('La fecha interna no puede ser posterior al vencimiento del requerimiento');
            return;
        }

        setEnviando(true);

        try {
            await ocService.solicitarInsumo(requerimientoId, {
                areaDestino,
                descripcionSolicitud,
                fechaVencimientoInterna,
                funcionarioDestino,
                emailDestino
            });

            toast.success('Solicitud enviada exitosamente', {
                description: `Se ha notificado al área ${areaDestino}`,
            });
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Error al enviar solicitud', {
                description: 'Verifique los datos e intente nuevamente',
            });
        } finally {
            setEnviando(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-[9998]"
                    />
                    <motion.div
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-[9999] overflow-hidden"
                    >
                        <ModalHeaderClean
                            icono={User}
                            colorIcono="orange"
                            titulo="Solicitar Insumos a Otra Área"
                            subtitulo="Delegar tarea de recopilación de información"
                            onClose={onClose}
                        />

                        <div className="p-6 space-y-6">
                            {/* Alerta Fecha */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-bold text-yellow-800">Tenga en cuenta los plazos</p>
                                    <p className="text-yellow-700">
                                        El requerimiento principal vence el {new Date(fechaVencimientoPrincipal).toLocaleDateString('es-CO')}.
                                        Solicite los insumos con suficiente antelación.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Área Destino</label>
                                    <select
                                        value={areaDestino}
                                        onChange={(e) => setAreaDestino(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Seleccionar Área...</option>
                                        {areas.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha Límite Interna</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="date"
                                            value={fechaVencimientoInterna}
                                            onChange={(e) => setFechaVencimientoInterna(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Funcionario (Opcional)</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            value={funcionarioDestino}
                                            onChange={(e) => setFuncionarioDestino(e.target.value)}
                                            placeholder="Nombre del responsable"
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email (Para notificación)</label>
                                    <input
                                        type="email"
                                        value={emailDestino}
                                        onChange={(e) => setEmailDestino(e.target.value)}
                                        placeholder="funcionario@esap.edu.co"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Instrucciones / Descripción de la Solicitud</label>
                                <textarea
                                    value={descripcionSolicitud}
                                    onChange={(e) => setDescripcionSolicitud(e.target.value)}
                                    placeholder="Describa detalladamente qué información o documentos se requieren..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={enviando}
                                className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {enviando ? 'Enviando...' : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Enviar Solicitud
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
