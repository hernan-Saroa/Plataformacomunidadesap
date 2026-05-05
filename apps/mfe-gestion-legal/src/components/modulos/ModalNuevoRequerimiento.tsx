/**
 * ModalNuevoRequerimiento - Crear nuevo requerimiento de órgano de control
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { Label } from '@esap-mfe/shared-ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@esap-mfe/shared-ui/select';
import {
    Building2, Calendar, User, FileText, Clock, X, Save, Loader2, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { ocService, legalService } from '../../../../services/api/legal.service';



interface TipoRequerimiento {
    id: string;
    nombre: string;
    descripcion?: string;
}

interface Abogado {
    id: string;
    nombreCompleto: string;
    email?: string;
    especialidad?: string;
}

interface ModalNuevoRequerimientoProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function ModalNuevoRequerimiento({
    isOpen,
    onClose,
    onSuccess
}: ModalNuevoRequerimientoProps) {
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    // Data loaded from backend API
    const [tiposRequerimiento, setTiposRequerimiento] = useState<TipoRequerimiento[]>([]);
    const [abogados, setAbogados] = useState<Abogado[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        radicadoExterno: '',
        organismoNombre: '',
        tipoRequerimiento: '',
        asunto: '',
        descripcion: '',
        fechaRecepcion: new Date().toISOString().split('T')[0],
        plazoOtorgado: 15,
        unidadTiempo: 'DIAS_HABILES',
        abogadoAsignadoId: '',
        funcionarioResponsable: '',
        areaResponsable: 'Oficina Jurídica'
    });

    // Load data from backend on mount
    useEffect(() => {
        if (isOpen) {
            loadInitialData();
        }
    }, [isOpen]);

    const loadInitialData = async () => {
        setLoadingData(true);
        try {
            // Lawyers always from backend
            const lawyersPromise = legalService.getAbogados();

            // Try to load from LocalStorage first (ConfiguracionesSIGL source)
            const storedTipos = localStorage.getItem('sigl-tipos-requerimientos');

            let tiposFn = async () => {
                if (storedTipos) {
                    try {
                        const parsed = JSON.parse(storedTipos);
                        return parsed.filter((t: any) => t.activo);
                    } catch (e) { console.error('Error config tipos LS', e); }
                }
                return await ocService.getTiposRequerimientoOC();
            };

            const [tipos, lawyers] = await Promise.all([
                tiposFn(),
                lawyersPromise
            ]);

            setTiposRequerimiento(tipos || []);
            setAbogados(lawyers.map((a: any) => ({
                id: a.id,
                nombreCompleto: a.nombreCompleto || a.nombre || `${a.nombres} ${a.apellidos}`,
                email: a.email,
                especialidad: a.especialidad
            })) || []);

            // Set default tipo if available
            if (tipos && tipos.length > 0) {
                setFormData(prev => ({ ...prev, tipoRequerimiento: tipos[0].id }));
            }
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            toast.error('Error al cargar catálogos');
        } finally {
            setLoadingData(false);
        }
    };

    const handleChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validaciones básicas
        if (!formData.radicadoExterno.trim()) {
            toast.error('El número de oficio/radicado es obligatorio');
            return;
        }
        if (!formData.organismoNombre.trim()) {
            toast.error('Debe ingresar el órgano de control');
            return;
        }
        if (!formData.asunto.trim()) {
            toast.error('El asunto es obligatorio');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                radicadoExterno: formData.radicadoExterno,
                organismoId: formData.organismoNombre,
                tipoRequerimiento: formData.tipoRequerimiento,
                asunto: formData.asunto,
                descripcion: formData.descripcion,
                fechaRecepcion: new Date(formData.fechaRecepcion),
                plazoOtorgado: formData.plazoOtorgado,
                unidadTiempo: formData.unidadTiempo,
                abogadoAsignadoId: formData.abogadoAsignadoId || null,
                funcionarioResponsable: formData.funcionarioResponsable ||
                    abogados.find(a => a.id === formData.abogadoAsignadoId)?.nombreCompleto || 'Sin asignar',
                areaResponsable: formData.areaResponsable,
                estado: 'RECIBIDO'
            };

            await ocService.createRequerimientoOC(payload);

            toast.success('✅ Requerimiento creado exitosamente');

            // Reset form
            setFormData({
                radicadoExterno: '',
                organismoNombre: '',
                tipoRequerimiento: tiposRequerimiento.length > 0 ? tiposRequerimiento[0].id : '',
                asunto: '',
                descripcion: '',
                fechaRecepcion: new Date().toISOString().split('T')[0],
                plazoOtorgado: 15,
                unidadTiempo: 'DIAS_HABILES',
                abogadoAsignadoId: '',
                funcionarioResponsable: '',
                areaResponsable: 'Oficina Jurídica'
            });

            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error creando requerimiento:', error);
            toast.error(error.message || 'Error al crear el requerimiento');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!w-full !max-w-[600px] !max-h-[85vh] !top-1/2 !-translate-y-1/2 overflow-y-auto">
                <DialogTitle className="flex items-center gap-2 text-lg font-bold" style={{ color: '#003DA5' }}>
                    <Building2 className="w-5 h-5" />
                    Nuevo Requerimiento - Órgano de Control
                </DialogTitle>
                <DialogDescription className="sr-only">
                    Formulario para registrar un nuevo requerimiento de un órgano de control.
                </DialogDescription>

                {loadingData ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-600">Cargando datos...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                        {/* Sección: Identificación */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-sm text-gray-800 border-b pb-2">📋 Identificación del Requerimiento</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="radicadoExterno" className="text-sm font-semibold flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        Número de Oficio/Radicado *
                                    </Label>
                                    <Input
                                        id="radicadoExterno"
                                        placeholder="Ej: CGR-OF-2025-00125"
                                        value={formData.radicadoExterno}
                                        onChange={(e) => {
                                            const value = e.target.value.toUpperCase();
                                            if (/^[A-Z0-9-]*$/.test(value)) {
                                                handleChange('radicadoExterno', value);
                                            }
                                        }}
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="organismoNombre" className="text-sm font-semibold flex items-center gap-1">
                                        <Building2 className="w-3 h-3" />
                                        Órgano de Control *
                                    </Label>
                                    <Input
                                        id="organismoNombre"
                                        placeholder=""
                                        value={formData.organismoNombre}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s-]*$/.test(value)) {
                                                handleChange('organismoNombre', value);
                                            }
                                        }}
                                        required
                                    />
                                    <p className="text-xs text-gray-400 italic">Ej: Órgano de Control - Ciudad o ubicación</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tipoRequerimiento" className="text-sm font-semibold">
                                    Tipo de Requerimiento
                                </Label>
                                <Select
                                    value={formData.tipoRequerimiento}
                                    onValueChange={(value) => handleChange('tipoRequerimiento', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione tipo..." />
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        {tiposRequerimiento.map((tipo: TipoRequerimiento) => (
                                            <SelectItem key={tipo.id} value={tipo.id}>
                                                {tipo.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="asunto" className="text-sm font-semibold">
                                    Asunto del Requerimiento *
                                </Label>
                                <Textarea
                                    id="asunto"
                                    placeholder="Describa brevemente el asunto del requerimiento..."
                                    value={formData.asunto}
                                    onChange={(e) => handleChange('asunto', e.target.value)}
                                    rows={2}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="descripcion" className="text-sm font-semibold">
                                    Descripción Detallada
                                </Label>
                                <Textarea
                                    id="descripcion"
                                    placeholder="Proporcione detalles adicionales si es necesario..."
                                    value={formData.descripcion}
                                    onChange={(e) => handleChange('descripcion', e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>

                        {/* Sección: Plazos */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-sm text-gray-800 border-b pb-2">⏱️ Plazos y Términos</h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fechaRecepcion" className="text-sm font-semibold flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Fecha de Recepción
                                    </Label>
                                    <Input
                                        id="fechaRecepcion"
                                        type="date"
                                        value={formData.fechaRecepcion}
                                        onChange={(e) => handleChange('fechaRecepcion', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="plazoOtorgado" className="text-sm font-semibold flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Plazo Otorgado
                                    </Label>
                                    <Input
                                        id="plazoOtorgado"
                                        type="number"
                                        min={1}
                                        value={formData.plazoOtorgado}
                                        onChange={(e) => handleChange('plazoOtorgado', parseInt(e.target.value) || 15)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="unidadTiempo" className="text-sm font-semibold">
                                        Unidad de Tiempo
                                    </Label>
                                    <Select
                                        value={formData.unidadTiempo}
                                        onValueChange={(value) => handleChange('unidadTiempo', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
                                            <SelectItem value="DIAS_HABILES">Días Hábiles</SelectItem>
                                            <SelectItem value="DIAS_CALENDARIO">Días Calendario</SelectItem>
                                            <SelectItem value="HORAS">Horas</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Sección: Responsable */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-sm text-gray-800 border-b pb-2">👤 Asignación de Responsable</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="abogadoAsignadoId" className="text-sm font-semibold flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        Abogado Asignado
                                    </Label>
                                    <Select
                                        value={formData.abogadoAsignadoId}
                                        onValueChange={(value) => {
                                            handleChange('abogadoAsignadoId', value);
                                            // Auto-fill funcionario field with selected lawyer name
                                            const selectedLawyer = abogados.find(a => a.id === value);
                                            if (selectedLawyer) {
                                                handleChange('funcionarioResponsable', selectedLawyer.nombreCompleto);
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione abogado..." />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
                                            {abogados.map(abogado => (
                                                <SelectItem key={abogado.id} value={abogado.id}>
                                                    {abogado.nombreCompleto}
                                                    {abogado.especialidad && ` (${abogado.especialidad})`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {abogados.length === 0 && (
                                        <p className="text-xs text-amber-600 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            No hay abogados registrados en el sistema.
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="areaResponsable" className="text-sm font-semibold">
                                        Área Responsable
                                    </Label>
                                    <Input
                                        id="areaResponsable"
                                        placeholder="Ej: Oficina Jurídica"
                                        value={formData.areaResponsable}
                                        onChange={(e) => handleChange('areaResponsable', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={loading}
                            >
                                <X className="w-4 h-4 mr-2" />
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                style={{ background: '#003DA5' }}
                                className="text-white"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Guardar Requerimiento
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
