import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../ui/dialog';
import { Button } from '../../../../ui/button';
import { Input } from '../../../../ui/input';
import { Label } from '../../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../ui/select';
import { Textarea } from '../../../../ui/textarea';
import { toast } from 'sonner';
import { legalService } from '../../../../../services/api/legal.service';
import { FileText, Calendar, Building, User, Info, Target } from 'lucide-react';

interface ModalNuevoPlanProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ModalNuevoPlan({ open, onClose, onSuccess }: ModalNuevoPlanProps) {
    const [loading, setLoading] = useState(false);

    // Data Sources
    const [abogados, setAbogados] = useState<any[]>([]);
    const [riesgos, setRiesgos] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        // Info Básica
        titulo: '',
        origen: '', // Ente de Control
        documentoOrigen: '',
        origenId: '', // ID Riesgo si aplica
        severidad: '', // ADDED

        // Responsabilidad
        areaResponsable: '',
        responsableId: '',

        // Cronograma
        fechaRecepcion: '',
        fechaRespuesta: '',
        fechaInicio: '',
        fechaFinEstimada: '',

        // Estado / Otros
        estado: 'ABIERTO',
        presupuesto: 0,
        descripcion: ''
    });

    useEffect(() => {
        if (open) {
            loadInitialData();
        }
    }, [open]);

    const loadInitialData = async () => {
        try {
            const data = await legalService.getAbogadosDashboard();
            setAbogados(data);

            // Cargar riesgos por si el origen es Riesgo
            const riskData = await legalService.getRiesgosDisponibles();
            setRiesgos(riskData);
        } catch (error) {
            console.error('Error loading data', error);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await legalService.createPlanMejoramiento({
                ...formData,
                presupuesto: Number(formData.presupuesto)
            });
            toast.success('Plan creado exitosamente');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating plan', error);
            toast.error('Error al crear el plan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0 gap-0">
                <DialogHeader className="p-6 pb-2 border-b bg-gray-50/50 sticky top-0 z-10 backdrop-blur-sm">
                    <DialogTitle className="text-xl text-[#003DA5] flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Crear Nuevo Plan de Mejoramiento
                    </DialogTitle>
                    <p className="text-sm text-gray-500">Registra un nuevo plan derivado de auditoría, hallazgo o riesgo.</p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b pb-1">
                            <Info className="w-4 h-4 text-blue-600" />
                            Información Básica del Plan
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Ente de Control / Origen <span className="text-red-500">*</span></Label>
                                <Select
                                    value={formData.origen}
                                    onValueChange={(val) => handleChange('origen', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar ente..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CONTRALORIA_GENERAL">🏛️ Contraloría General</SelectItem>
                                        <SelectItem value="PROCURADURIA_GENERAL">⚖️ Procuraduría General</SelectItem>
                                        <SelectItem value="CONTROL_INTERNO">🔍 Oficina Control Interno</SelectItem>
                                        <SelectItem value="AUDITORIA_EXTERNA">📋 Auditoría Externa</SelectItem>
                                        <SelectItem value="RIESGO">⚠️ Riesgo Materializado</SelectItem>
                                        <SelectItem value="AUTOEVALUACION">🔄 Autoevaluación</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.origen === 'RIESGO' ? (
                                <div className="space-y-2">
                                    <Label>Riesgo Asociado <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={formData.origenId}
                                        onValueChange={(val) => handleChange('origenId', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione riesgo..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {riesgos.map(r => (
                                                <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label>Documento de Origen <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="Ej: Informe de Auditoría CGR No. 075-2025"
                                        value={formData.documentoOrigen}
                                        onChange={(e) => handleChange('documentoOrigen', e.target.value)}
                                        required={formData.origen !== 'RIESGO'}
                                    />
                                </div>
                            )}

                            {/* SEVERIDAD ADDED */}
                            <div className="space-y-2">
                                <Label>Severidad del Hallazgo</Label>
                                <Select
                                    value={formData.severidad}
                                    onValueChange={(val) => handleChange('severidad', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CRITICO">🔴 Crítico</SelectItem>
                                        <SelectItem value="ALTO">🟠 Alto</SelectItem>
                                        <SelectItem value="MEDIO">🟡 Medio</SelectItem>
                                        <SelectItem value="BAJO">🟢 Bajo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Nombre del Plan <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder="Ej: Plan de Mejoramiento Auditoría Regular Vigencia 2024"
                                    value={formData.titulo}
                                    onChange={(e) => handleChange('titulo', e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: RESPONSABILIDAD */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b pb-1">
                            <Building className="w-4 h-4 text-blue-600" />
                            Responsabilidad y Área
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Área Responsable <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder="Ej: Dirección Administrativa y Financiera"
                                    value={formData.areaResponsable}
                                    onChange={(e) => handleChange('areaResponsable', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Responsable del Plan (Abogado) <span className="text-red-500">*</span></Label>
                                <Select
                                    value={formData.responsableId}
                                    onValueChange={(val) => handleChange('responsableId', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione responsable..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {abogados.map(a => (
                                            <SelectItem key={a.id} value={a.id}>{a.nombreCompleto}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 3: CRONOGRAMA */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b pb-1">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            Cronograma del Plan
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Fecha de Recepción del Hallazgo</Label>
                                <Input
                                    type="date"
                                    value={formData.fechaRecepcion}
                                    onChange={(e) => handleChange('fechaRecepcion', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha Límite de Respuesta</Label>
                                <Input
                                    type="date"
                                    value={formData.fechaRespuesta}
                                    onChange={(e) => handleChange('fechaRespuesta', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha de Inicio <span className="text-red-500">*</span></Label>
                                <Input
                                    type="date"
                                    value={formData.fechaInicio}
                                    onChange={(e) => handleChange('fechaInicio', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha de Finalización Estimada <span className="text-red-500">*</span></Label>
                                <Input
                                    type="date"
                                    value={formData.fechaFinEstimada}
                                    onChange={(e) => handleChange('fechaFinEstimada', e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 4: ESTADO DEL PLAN */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b pb-1">
                            <Target className="w-4 h-4 text-blue-600" />
                            Estado del Plan
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Estado Inicial <span className="text-red-500">*</span></Label>
                                <Select disabled value="ABIERTO">
                                    <SelectTrigger className="bg-gray-100">
                                        <SelectValue placeholder="Estado..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ABIERTO">📂 En Formulación / Abierto</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* OBSERVACIONES */}
                    <div className="space-y-2">
                        <Label>Descripción del Plan / Observaciones</Label>
                        <Textarea
                            placeholder="Descripción detallada del plan de mejoramiento, contexto del hallazgo y alcance esperado..."
                            className="min-h-[100px]"
                            value={formData.descripcion}
                            onChange={(e) => handleChange('descripcion', e.target.value)}
                        />
                    </div>

                    <DialogFooter className="pt-4 border-t sticky bottom-0 bg-white z-10">
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" className="bg-[#003DA5] hover:bg-[#002d7a]" disabled={loading}>
                            {loading ? 'Guardando...' : 'Crear Plan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
