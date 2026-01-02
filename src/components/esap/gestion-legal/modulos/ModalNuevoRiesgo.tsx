/**
 * Modal para crear un nuevo riesgo
 * Basado en metodología DAFP - Matriz de Riesgos
 */

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Textarea } from '../../../ui/textarea';
import { Label } from '../../../ui/label';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import {
    AlertTriangle,
    Shield,
    Save,
    X,
    Plus,
    Trash2,
    Activity,
    Target,
    FileText,
    Users
} from 'lucide-react';
import { toast } from 'sonner';
import type { TipoRiesgo, ZonaRiesgo, EtapaRiesgo, Riesgo } from '../core/types';
import { riesgosService } from '../../../../services/api/legal.service';

interface ModalNuevoRiesgoProps {
    open: boolean;
    onClose: () => void;
    onRiesgoCreado: (riesgo: Riesgo) => void;
}

// Configuración de zonas
const ZONA_CONFIG = {
    EXTREMO: { color: '#DC2626', bg: '#FEE2E2', label: '🔴 Extremo' },
    ALTO: { color: '#EA580C', bg: '#FFEDD5', label: '🟠 Alto' },
    MODERADO: { color: '#F59E0B', bg: '#FEF3C7', label: '🟡 Moderado' },
    BAJO: { color: '#10B981', bg: '#D1FAE5', label: '🟢 Bajo' }
};

// Procesos disponibles (pueden venir de un catálogo)
const PROCESOS = [
    'Defensa Judicial',
    'Juzgamiento Disciplinario',
    'Asesoría Jurídica',
    'Órganos de Control',
    'Procesos Coactivos',
    'Planes de Mejoramiento',
    'Gestión Documental',
    'Gestión Contractual',
    'Gestión Financiera',
    'Talento Humano'
];

export function ModalNuevoRiesgo({ open, onClose, onRiesgoCreado }: ModalNuevoRiesgoProps) {
    const [formData, setFormData] = useState({
        proceso: '',
        tipoRiesgo: 'GESTION' as TipoRiesgo,
        nombre: '',
        descripcion: '',
        causas: [''],
        consecuencias: [''],
        probabilidadInherente: 3,
        impactoInherente: 3,
        responsable: ''
    });

    const [guardando, setGuardando] = useState(false);

    // Calcular zona de riesgo automáticamente
    const zonaCalculada = useMemo((): ZonaRiesgo => {
        const valor = formData.probabilidadInherente * formData.impactoInherente;
        if (valor >= 20) return 'EXTREMO';
        if (valor >= 12) return 'ALTO';
        if (valor >= 5) return 'MODERADO';
        return 'BAJO';
    }, [formData.probabilidadInherente, formData.impactoInherente]);

    const handleAddCausa = () => {
        setFormData(prev => ({ ...prev, causas: [...prev.causas, ''] }));
    };

    const handleRemoveCausa = (index: number) => {
        setFormData(prev => ({
            ...prev,
            causas: prev.causas.filter((_, i) => i !== index)
        }));
    };

    const handleCausaChange = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            causas: prev.causas.map((c, i) => i === index ? value : c)
        }));
    };

    const handleAddConsecuencia = () => {
        setFormData(prev => ({ ...prev, consecuencias: [...prev.consecuencias, ''] }));
    };

    const handleRemoveConsecuencia = (index: number) => {
        setFormData(prev => ({
            ...prev,
            consecuencias: prev.consecuencias.filter((_, i) => i !== index)
        }));
    };

    const handleConsecuenciaChange = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            consecuencias: prev.consecuencias.map((c, i) => i === index ? value : c)
        }));
    };

    const handleGuardar = async () => {
        // Validaciones
        if (!formData.proceso) {
            toast.error('Seleccione un proceso');
            return;
        }
        if (!formData.nombre.trim()) {
            toast.error('Ingrese el nombre del riesgo');
            return;
        }
        if (!formData.descripcion.trim()) {
            toast.error('Ingrese la descripción del riesgo');
            return;
        }
        if (!formData.responsable.trim()) {
            toast.error('Ingrese el responsable');
            return;
        }

        setGuardando(true);

        try {
            // Llamar al API para crear el riesgo
            const riesgoCreado = await riesgosService.create({
                nombre: formData.nombre,
                descripcion: formData.descripcion,
                proceso: formData.proceso,
                tipoRiesgo: formData.tipoRiesgo,
                probabilidadInherente: formData.probabilidadInherente,
                impactoInherente: formData.impactoInherente,
                causas: formData.causas.filter(c => c.trim() !== ''),
                consecuencias: formData.consecuencias.filter(c => c.trim() !== ''),
                responsable: formData.responsable
            });

            // Convertir respuesta del API a tipo local
            const nuevoRiesgo: Riesgo = {
                id: riesgoCreado.codigo || riesgoCreado.id,
                codigo: riesgoCreado.codigo,
                etapa: riesgoCreado.etapa as EtapaRiesgo,
                proceso: riesgoCreado.proceso,
                tipo: riesgoCreado.tipoRiesgo,
                tipoRiesgo: riesgoCreado.tipoRiesgo,
                nombre: riesgoCreado.nombre,
                descripcion: riesgoCreado.descripcion,
                causas: riesgoCreado.causas || [],
                consecuencias: riesgoCreado.consecuencias || [],
                probabilidadInherente: riesgoCreado.probabilidadInherente,
                impactoInherente: riesgoCreado.impactoInherente,
                zonaInherente: riesgoCreado.zonaInherente,
                probabilidadResidual: riesgoCreado.probabilidadResidual,
                impactoResidual: riesgoCreado.impactoResidual,
                zonaResidual: riesgoCreado.zonaResidual,
                controlesExistentes: riesgoCreado.controlesExistentes || [],
                planTratamiento: [],
                responsable: riesgoCreado.responsable,
                documentos: [],
                timeline: [],
                fechaCreacion: new Date(riesgoCreado.createdAt),
                fechaActualizacion: new Date(riesgoCreado.updatedAt),
                estado: riesgoCreado.estado
            };

            onRiesgoCreado(nuevoRiesgo);
            toast.success('Riesgo identificado y guardado correctamente', {
                description: `${riesgoCreado.codigo} - Zona: ${ZONA_CONFIG[zonaCalculada].label}`
            });

            // Resetear formulario
            setFormData({
                proceso: '',
                tipoRiesgo: 'GESTION',
                nombre: '',
                descripcion: '',
                causas: [''],
                consecuencias: [''],
                probabilidadInherente: 3,
                impactoInherente: 3,
                responsable: ''
            });
            onClose();
        } catch (error) {
            console.error('Error al guardar riesgo:', error);
            toast.error('⚠️ Error al guardar el riesgo', {
                description: 'Verifique que el servicio esté disponible y la migración se haya ejecutado'
            });
        } finally {
            setGuardando(false);
        }
    };

    const zonaConfig = ZONA_CONFIG[zonaCalculada];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl" style={{ color: '#003DA5' }}>
                        <Shield className="w-6 h-6" />
                        Identificar Nuevo Riesgo
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Sección 1: Información Básica */}
                    <Card className="p-4 border-l-4" style={{ borderLeftColor: '#003DA5' }}>
                        <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                            <FileText className="w-4 h-4" />
                            Información Básica
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs font-semibold text-gray-700">Proceso Asociado *</Label>
                                <Select
                                    value={formData.proceso}
                                    onValueChange={(v: string) => setFormData(prev => ({ ...prev, proceso: v }))}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Seleccione proceso..." />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        {PROCESOS.map(p => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-xs font-semibold text-gray-700">Tipo de Riesgo *</Label>
                                <Select
                                    value={formData.tipoRiesgo}
                                    onValueChange={(v: string) => setFormData(prev => ({ ...prev, tipoRiesgo: v as TipoRiesgo }))}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        <SelectItem value="GESTION">📊 Gestión</SelectItem>
                                        <SelectItem value="CORRUPCION">⚠️ Corrupción</SelectItem>
                                        <SelectItem value="SEGURIDAD_DIGITAL">🔒 Seguridad Digital</SelectItem>
                                        <SelectItem value="FISCAL">💰 Fiscal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-gray-700">Nombre del Riesgo *</Label>
                                <Input
                                    className="mt-1"
                                    placeholder="Ej: Vencimiento de términos procesales"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-gray-700">Descripción *</Label>
                                <Textarea
                                    className="mt-1"
                                    rows={3}
                                    placeholder="Describa el riesgo identificado..."
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                                    <Users className="w-3 h-3" />
                                    Responsable *
                                </Label>
                                <Input
                                    className="mt-1"
                                    placeholder="Cargo o nombre del responsable"
                                    value={formData.responsable}
                                    onChange={(e) => setFormData(prev => ({ ...prev, responsable: e.target.value }))}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Sección 2: Causas y Consecuencias */}
                    <Card className="p-4 border-l-4" style={{ borderLeftColor: '#F59E0B' }}>
                        <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#F59E0B' }}>
                            <AlertTriangle className="w-4 h-4" />
                            Análisis de Causas y Consecuencias
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Causas */}
                            <div>
                                <Label className="text-xs font-semibold text-gray-700 mb-2 block">
                                    Causas del Riesgo
                                </Label>
                                <div className="space-y-2">
                                    {formData.causas.map((causa, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <Input
                                                className="flex-1"
                                                placeholder={`Causa ${idx + 1}...`}
                                                value={causa}
                                                onChange={(e) => handleCausaChange(idx, e.target.value)}
                                            />
                                            {formData.causas.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveCausa(idx)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddCausa}
                                        className="w-full mt-2"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Agregar Causa
                                    </Button>
                                </div>
                            </div>

                            {/* Consecuencias */}
                            <div>
                                <Label className="text-xs font-semibold text-gray-700 mb-2 block">
                                    Consecuencias
                                </Label>
                                <div className="space-y-2">
                                    {formData.consecuencias.map((consecuencia, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <Input
                                                className="flex-1"
                                                placeholder={`Consecuencia ${idx + 1}...`}
                                                value={consecuencia}
                                                onChange={(e) => handleConsecuenciaChange(idx, e.target.value)}
                                            />
                                            {formData.consecuencias.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveConsecuencia(idx)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddConsecuencia}
                                        className="w-full mt-2"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Agregar Consecuencia
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Sección 3: Valoración (Probabilidad e Impacto) */}
                    <Card className="p-4 border-l-4" style={{ borderLeftColor: zonaConfig.color }}>
                        <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                            <Target className="w-4 h-4" />
                            Valoración del Riesgo (Matriz 5×5)
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Probabilidad */}
                            <div>
                                <Label className="text-xs font-semibold text-gray-700 mb-2 block">
                                    Probabilidad (1-5)
                                </Label>
                                <Select
                                    value={String(formData.probabilidadInherente)}
                                    onValueChange={(v: string) => setFormData(prev => ({ ...prev, probabilidadInherente: parseInt(v) }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        <SelectItem value="1">1 - Raro</SelectItem>
                                        <SelectItem value="2">2 - Improbable</SelectItem>
                                        <SelectItem value="3">3 - Posible</SelectItem>
                                        <SelectItem value="4">4 - Probable</SelectItem>
                                        <SelectItem value="5">5 - Casi Seguro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Impacto */}
                            <div>
                                <Label className="text-xs font-semibold text-gray-700 mb-2 block">
                                    Impacto (1-5)
                                </Label>
                                <Select
                                    value={String(formData.impactoInherente)}
                                    onValueChange={(v: string) => setFormData(prev => ({ ...prev, impactoInherente: parseInt(v) }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        <SelectItem value="1">1 - Insignificante</SelectItem>
                                        <SelectItem value="2">2 - Menor</SelectItem>
                                        <SelectItem value="3">3 - Moderado</SelectItem>
                                        <SelectItem value="4">4 - Mayor</SelectItem>
                                        <SelectItem value="5">5 - Catastrófico</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Zona Calculada */}
                            <div>
                                <Label className="text-xs font-semibold text-gray-700 mb-2 block">
                                    Zona de Riesgo (Automático)
                                </Label>
                                <div
                                    className="p-3 rounded-lg flex items-center justify-center gap-2 font-bold"
                                    style={{ backgroundColor: zonaConfig.bg, color: zonaConfig.color }}
                                >
                                    <Activity className="w-5 h-5" />
                                    <span>{zonaConfig.label}</span>
                                    <span className="text-sm">
                                        ({formData.probabilidadInherente} × {formData.impactoInherente} = {formData.probabilidadInherente * formData.impactoInherente})
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Advertencia si es extremo o alto */}
                        {(zonaCalculada === 'EXTREMO' || zonaCalculada === 'ALTO') && (
                            <div className="mt-4 p-3 rounded-lg border-2" style={{ borderColor: zonaConfig.color, backgroundColor: zonaConfig.bg }}>
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: zonaConfig.color }} />
                                    <div>
                                        <p className="font-bold text-sm" style={{ color: zonaConfig.color }}>
                                            {zonaCalculada === 'EXTREMO'
                                                ? '⚠️ Riesgo Extremo - Requiere Acción Inmediata'
                                                : '⚠️ Riesgo Alto - Requiere Plan de Tratamiento Prioritario'}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            Este riesgo será escalado automáticamente al Jefe de Oficina Jurídica para revisión.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Botones de acción */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={onClose} disabled={guardando}>
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleGuardar}
                            disabled={guardando}
                            style={{ backgroundColor: '#003DA5' }}
                            className="text-white"
                        >
                            {guardando ? (
                                <>
                                    <Activity className="w-4 h-4 mr-1 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-1" />
                                    Identificar Riesgo
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
