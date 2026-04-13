/**
 * CONFIGURACIÓN DE PRESCRIPCIÓN - JUZGAMIENTO DISCIPLINARIO
 * Permite parametrizar el número de años para el cálculo de prescripción
 * Los cambios aplican a los nuevos procesos que se creen después de guardar
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, Save, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import disciplinaryService from '../../../../services/api/disciplinary.service';

export function ConfiguracionPrescripcion() {
    const [prescriptionYears, setPrescriptionYears] = useState<number>(5);
    const [originalYears, setOriginalYears] = useState<number>(5);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        cargarConfig();
    }, []);

    useEffect(() => {
        setHasChanges(prescriptionYears !== originalYears);
    }, [prescriptionYears, originalYears]);

    const cargarConfig = async () => {
        try {
            setLoading(true);
            const config = await disciplinaryService.getGlobalConfig();
            const years = config?.prescriptionYears ?? 5;
            setPrescriptionYears(years);
            setOriginalYears(years);
        } catch (error) {
            console.error('Error cargando configuración:', error);
            toast.error('Error al cargar la configuración de prescripción');
        } finally {
            setLoading(false);
        }
    };

    const guardarConfig = async () => {
        if (prescriptionYears < 1 || prescriptionYears > 30) {
            toast.error('El valor debe estar entre 1 y 30 años');
            return;
        }

        try {
            setSaving(true);
            await disciplinaryService.updateGlobalConfig({ prescriptionYears });
            setOriginalYears(prescriptionYears);
            setHasChanges(false);
            toast.success('Configuración de prescripción actualizada correctamente');
        } catch (error) {
            console.error('Error guardando configuración:', error);
            toast.error('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e5da8]" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-3xl">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-100 rounded-lg">
                        <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                        Prescripción Disciplinaria
                    </h3>
                </div>
                <p className="text-sm text-gray-500 ml-12">
                    Configura el tiempo de prescripción para los procesos disciplinarios.
                    Este valor se aplica desde la fecha de recepción de la noticia.
                </p>
            </div>

            {/* Card principal */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
                {/* Input section */}
                <div className="p-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Años de prescripción
                    </label>

                    <div className="flex items-center gap-4">
                        {/* Number input with stepper */}
                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#1e5da8] focus-within:border-[#1e5da8]">
                            <button
                                onClick={() => setPrescriptionYears(Math.max(1, prescriptionYears - 1))}
                                className="px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-lg transition-colors border-r border-gray-300"
                            >
                                −
                            </button>
                            <input
                                type="number"
                                min={1}
                                max={30}
                                value={prescriptionYears}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 1 && val <= 30) {
                                        setPrescriptionYears(val);
                                    }
                                }}
                                className="w-20 text-center text-2xl font-bold py-3 border-0 outline-none text-gray-900"
                            />
                            <button
                                onClick={() => setPrescriptionYears(Math.min(30, prescriptionYears + 1))}
                                className="px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-lg transition-colors border-l border-gray-300"
                            >
                                +
                            </button>
                        </div>

                        <span className="text-gray-500 font-medium">años</span>
                    </div>

                    {/* Preview */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-700">
                                Con esta configuración, un proceso cuya noticia se reciba <strong>hoy</strong> prescribirá el{' '}
                                <strong>
                                    {new Date(
                                        new Date().setFullYear(new Date().getFullYear() + prescriptionYears)
                                    ).toLocaleDateString('es-CO', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </strong>
                                .
                            </p>
                        </div>
                    </div>
                </div>

                {/* Warning */}
                <div className="px-6 pb-4">
                    <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700">
                            Este cambio aplica solo a <strong>nuevos procesos</strong> creados después de guardar.
                            Los procesos existentes conservan su fecha de prescripción original.
                            Si los términos de una etapa vencen después de la prescripción, el sistema los acortará automáticamente.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                {hasChanges && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Hay cambios sin guardar</span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setPrescriptionYears(originalYears);
                                    setHasChanges(false);
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Descartar
                            </button>
                            <button
                                onClick={guardarConfig}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2 bg-[#1e5da8] text-white text-sm font-medium rounded-lg hover:bg-[#174b8a] transition-colors disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Guardar cambios
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Success indicator when saved */}
                {!hasChanges && !loading && (
                    <div className="border-t border-gray-200 bg-green-50 px-6 py-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700">
                            Configuración actual: <strong>{originalYears} años</strong> de prescripción
                        </span>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
