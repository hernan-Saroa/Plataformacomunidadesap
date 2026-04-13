/**
 * FormularioExcepcionProcesal - Modal para Registrar Excepciones Procesales
 * Tipos: NULIDAD, RECUSACION, PRESCRIPCION, IMPEDIMENTO, OTRA
 * Diseño ESAP premium profesional
 */

import { toast } from 'sonner';
import { ModalHeaderClean } from './ModalHeaderClean';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';
import { Label } from '@esap-mfe/shared-ui/label';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { Input } from '@esap-mfe/shared-ui/input';
import {
    AlertTriangle, X, Save, Scale, FileText, User
} from 'lucide-react';
import { useState } from 'react';

interface FormularioExcepcionProcesalProps {
    isOpen: boolean;
    onClose: () => void;
    onGuardar: (excepcion: any) => void;
    procesoId: string;
}

const TIPOS_EXCEPCION = [
    { value: 'NULIDAD', label: 'Nulidad', icon: '❌', description: 'Cuando se detectan vicios en el procedimiento' },
    { value: 'RECUSACION', label: 'Recusación', icon: '🔄', description: 'Solicitud de cambio del funcionario que juzga' },
    { value: 'PRESCRIPCION', label: 'Prescripción', icon: '⏰', description: 'Proceso excedió el término legal para juzgar' },
    { value: 'IMPEDIMENTO', label: 'Impedimento', icon: '🚫', description: 'El juez tiene conflicto de interés' },
    { value: 'OTRA', label: 'Otra Excepción Previa', icon: '📋', description: 'Según el Código General del Proceso' }
];

export function FormularioExcepcionProcesal({
    isOpen,
    onClose,
    onGuardar,
    procesoId
}: FormularioExcepcionProcesalProps) {
    const [tipoExcepcion, setTipoExcepcion] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [fundamento, setFundamento] = useState('');
    const [presentadoPor, setPresentadoPor] = useState('');
    const [guardando, setGuardando] = useState(false);

    const handleGuardarExcepcion = async () => {
        // Validaciones
        if (!tipoExcepcion) {
            toast.error('⚠️ Tipo de excepción requerido', {
                description: 'Debes seleccionar el tipo de excepción procesal'
            });
            return;
        }

        if (!descripcion.trim()) {
            toast.error('⚠️ Descripción requerida', {
                description: 'Debes describir la excepción procesal'
            });
            return;
        }

        if (!fundamento.trim()) {
            toast.error('⚠️ Fundamento legal requerido', {
                description: 'Debes indicar el fundamento jurídico de la excepción'
            });
            return;
        }

        setGuardando(true);
        try {
            const excepcionData = {
                tipo: tipoExcepcion,
                descripcion: descripcion.trim(),
                fundamento: fundamento.trim(),
                presentadoPor: presentadoPor.trim() || 'No especificado'
            };

            await onGuardar(excepcionData);

            // Limpiar formulario
            setTipoExcepcion('');
            setDescripcion('');
            setFundamento('');
            setPresentadoPor('');
            onClose();
        } catch (error) {
            console.error('Error guardando excepción:', error);
            toast.error('Error al guardar la excepción');
        } finally {
            setGuardando(false);
        }
    };

    const handleCancelar = () => {
        setTipoExcepcion('');
        setDescripcion('');
        setFundamento('');
        setPresentadoPor('');
        onClose();
    };

    const selectedTipo = TIPOS_EXCEPCION.find(t => t.value === tipoExcepcion);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0" style={{ zIndex: 9999 }}>
                <DialogTitle className="sr-only">Registrar Excepción Procesal</DialogTitle>
                <DialogDescription className="sr-only">
                    Formulario para registrar una nueva excepción procesal
                </DialogDescription>

                <ModalHeaderClean
                    icono={Scale}
                    titulo="Registrar Excepción Procesal"
                    subtitulo={`Proceso ${procesoId}`}
                    colorIcono="orange"
                    badges={[
                        { texto: '⚠️ Excepción', color: 'naranja' as const }
                    ]}
                    onClose={onClose}
                />

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Tipo de Excepción */}
                    <Card className="p-4 bg-orange-50 border-orange-200">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <h3 className="font-bold text-gray-900">Tipo de Excepción Procesal</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {TIPOS_EXCEPCION.map(tipo => (
                                <div
                                    key={tipo.value}
                                    onClick={() => setTipoExcepcion(tipo.value)}
                                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${tipoExcepcion === tipo.value
                                            ? 'border-orange-500 bg-orange-100'
                                            : 'border-gray-200 bg-white hover:border-orange-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl">{tipo.icon}</span>
                                        <span className="font-bold text-gray-900">{tipo.label}</span>
                                    </div>
                                    <p className="text-xs text-gray-600">{tipo.description}</p>
                                </div>
                            ))}
                        </div>
                        {selectedTipo && (
                            <div className="mt-3 p-2 bg-orange-100 rounded-lg">
                                <p className="text-sm font-medium text-orange-800">
                                    Seleccionado: {selectedTipo.icon} {selectedTipo.label}
                                </p>
                            </div>
                        )}
                    </Card>

                    {/* Descripción */}
                    <Card className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-5 h-5 text-gray-600" />
                            <Label className="font-bold text-gray-900">Descripción de la Excepción</Label>
                        </div>
                        <Textarea
                            placeholder="Describe detalladamente la excepción procesal, incluyendo los hechos que la fundamentan..."
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            rows={4}
                            className="resize-none"
                        />
                    </Card>

                    {/* Fundamento Jurídico */}
                    <Card className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Scale className="w-5 h-5 text-blue-600" />
                            <Label className="font-bold text-gray-900">Fundamento Legal</Label>
                        </div>
                        <Textarea
                            placeholder="Indica las normas, artículos o jurisprudencia que fundamentan la excepción (Ej: Art. 100 CGP, Ley 734 de 2002...)"
                            value={fundamento}
                            onChange={(e) => setFundamento(e.target.value)}
                            rows={3}
                            className="resize-none"
                        />
                    </Card>

                    {/* Presentado Por */}
                    <Card className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <User className="w-5 h-5 text-gray-600" />
                            <Label className="font-bold text-gray-900">Presentado Por (Opcional)</Label>
                        </div>
                        <Input
                            placeholder="Nombre de quien presenta la excepción"
                            value={presentadoPor}
                            onChange={(e) => setPresentadoPor(e.target.value)}
                        />
                    </Card>
                </div>

                {/* Footer con acciones */}
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                    <div className="flex items-center justify-end gap-3">
                        <Button variant="outline" onClick={handleCancelar} disabled={guardando}>
                            <X className="w-4 h-4 mr-2" />
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleGuardarExcepcion}
                            disabled={guardando || !tipoExcepcion || !descripcion.trim() || !fundamento.trim()}
                            style={{ background: '#F97316', color: '#FFFFFF' }}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {guardando ? 'Guardando...' : 'Registrar Excepción'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
