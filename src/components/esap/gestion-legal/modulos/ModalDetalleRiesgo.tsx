/**
 * Modal para ver detalle de un riesgo
 * Incluye toda la información del riesgo, causas, consecuencias y controles
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import {
    Shield,
    X,
    AlertTriangle,
    Activity,
    Target,
    FileText,
    Users,
    Calendar,
    TrendingUp,
    CheckCircle2,
    Clock
} from 'lucide-react';
import type { Riesgo } from '../core/types';

interface ModalDetalleRiesgoProps {
    open: boolean;
    onClose: () => void;
    riesgo: Riesgo | null;
}

// Configuración de zonas
const ZONA_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
    EXTREMO: { color: '#DC2626', bg: '#FEE2E2', label: '🔴 Extremo' },
    ALTO: { color: '#EA580C', bg: '#FFEDD5', label: '🟠 Alto' },
    MODERADO: { color: '#F59E0B', bg: '#FEF3C7', label: '🟡 Moderado' },
    BAJO: { color: '#10B981', bg: '#D1FAE5', label: '🟢 Bajo' }
};

const TIPO_RIESGO_MAP: Record<string, string> = {
    GESTION: '📊 Gestión',
    CORRUPCION: '⚠️ Corrupción',
    SEGURIDAD_DIGITAL: '🔒 Seguridad Digital',
    FISCAL: '💰 Fiscal'
};

const ETAPA_MAP: Record<string, { label: string; color: string }> = {
    IDENTIFICADO: { label: '📋 Identificado', color: '#6B7280' },
    ANALIZADO: { label: '🔍 Analizado', color: '#3B82F6' },
    VALORADO: { label: '📊 Valorado', color: '#8B5CF6' },
    TRATAMIENTO: { label: '⚙️ En Tratamiento', color: '#F59E0B' },
    MONITOREO: { label: '👁️ Monitoreo', color: '#10B981' },
    CERRADO: { label: '✅ Cerrado', color: '#059669' },
    MATERIALIZADO: { label: '❌ Materializado', color: '#DC2626' }
};

export function ModalDetalleRiesgo({ open, onClose, riesgo }: ModalDetalleRiesgoProps) {
    if (!riesgo) return null;

    const zonaConfig = ZONA_CONFIG[riesgo.zonaResidual] || ZONA_CONFIG.MODERADO;
    const tipoLabel = TIPO_RIESGO_MAP[riesgo.tipoRiesgo || riesgo.tipo] || riesgo.tipoRiesgo;
    const etapaInfo = ETAPA_MAP[riesgo.etapa] || { label: riesgo.etapa, color: '#6B7280' };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xl" style={{ color: '#003DA5' }}>
                            <Shield className="w-6 h-6" />
                            {riesgo.codigo || riesgo.id}
                        </div>
                        <Badge
                            className="text-sm font-bold"
                            style={{ backgroundColor: zonaConfig.bg, color: zonaConfig.color, border: `2px solid ${zonaConfig.color}` }}
                        >
                            {zonaConfig.label}
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Información Principal */}
                    <Card className="p-4 border-l-4" style={{ borderLeftColor: zonaConfig.color }}>
                        <h3 className="font-bold text-lg mb-2" style={{ color: '#003DA5' }}>
                            {riesgo.nombre}
                        </h3>
                        <p className="text-gray-600 mb-4">{riesgo.descripcion}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <span className="text-xs text-gray-500 block">Proceso</span>
                                <span className="font-semibold text-sm">{riesgo.proceso}</span>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 block">Tipo de Riesgo</span>
                                <span className="font-semibold text-sm">{tipoLabel}</span>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 block">Etapa</span>
                                <Badge style={{ backgroundColor: etapaInfo.color }} className="text-white text-xs">
                                    {etapaInfo.label}
                                </Badge>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 block">Responsable</span>
                                <span className="font-semibold text-sm flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {riesgo.responsable}
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Valoración del Riesgo */}
                    <Card className="p-4">
                        <h4 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                            <Target className="w-4 h-4" />
                            Valoración del Riesgo
                        </h4>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Valoración Inherente */}
                            <div className="p-3 rounded-lg bg-gray-50">
                                <h5 className="text-xs font-bold text-gray-500 mb-2">RIESGO INHERENTE</h5>
                                <div className="flex items-center gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-700">{riesgo.probabilidadInherente}</div>
                                        <div className="text-xs text-gray-500">Prob.</div>
                                    </div>
                                    <div className="text-xl text-gray-400">×</div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-700">{riesgo.impactoInherente}</div>
                                        <div className="text-xs text-gray-500">Imp.</div>
                                    </div>
                                    <div className="text-xl text-gray-400">=</div>
                                    <Badge
                                        className="text-sm font-bold"
                                        style={{
                                            backgroundColor: ZONA_CONFIG[riesgo.zonaInherente]?.bg || '#E5E7EB',
                                            color: ZONA_CONFIG[riesgo.zonaInherente]?.color || '#374151'
                                        }}
                                    >
                                        {ZONA_CONFIG[riesgo.zonaInherente]?.label || riesgo.zonaInherente}
                                    </Badge>
                                </div>
                            </div>

                            {/* Valoración Residual */}
                            <div className="p-3 rounded-lg" style={{ backgroundColor: zonaConfig.bg }}>
                                <h5 className="text-xs font-bold text-gray-500 mb-2">RIESGO RESIDUAL</h5>
                                <div className="flex items-center gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold" style={{ color: zonaConfig.color }}>{riesgo.probabilidadResidual}</div>
                                        <div className="text-xs text-gray-500">Prob.</div>
                                    </div>
                                    <div className="text-xl text-gray-400">×</div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold" style={{ color: zonaConfig.color }}>{riesgo.impactoResidual}</div>
                                        <div className="text-xs text-gray-500">Imp.</div>
                                    </div>
                                    <div className="text-xl text-gray-400">=</div>
                                    <Badge
                                        className="text-sm font-bold"
                                        style={{ backgroundColor: zonaConfig.color, color: '#FFFFFF' }}
                                    >
                                        {zonaConfig.label}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Causas y Consecuencias */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Causas */}
                        <Card className="p-4">
                            <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-orange-600">
                                <AlertTriangle className="w-4 h-4" />
                                Causas del Riesgo
                            </h4>
                            {riesgo.causas && riesgo.causas.length > 0 ? (
                                <ul className="space-y-2">
                                    {riesgo.causas.map((causa, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                            <span className="text-orange-500 mt-0.5">•</span>
                                            {causa}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-400">No hay causas registradas</p>
                            )}
                        </Card>

                        {/* Consecuencias */}
                        <Card className="p-4">
                            <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-red-600">
                                <TrendingUp className="w-4 h-4" />
                                Consecuencias
                            </h4>
                            {riesgo.consecuencias && riesgo.consecuencias.length > 0 ? (
                                <ul className="space-y-2">
                                    {riesgo.consecuencias.map((cons, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                            <span className="text-red-500 mt-0.5">•</span>
                                            {cons}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-400">No hay consecuencias registradas</p>
                            )}
                        </Card>
                    </div>

                    {/* Controles Existentes */}
                    {riesgo.controlesExistentes && riesgo.controlesExistentes.length > 0 && (
                        <Card className="p-4">
                            <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="w-4 h-4" />
                                Controles Existentes
                            </h4>
                            <div className="space-y-2">
                                {riesgo.controlesExistentes.map((control, idx) => (
                                    <div key={control.id || idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-sm text-gray-700">{control.descripcion}</span>
                                        <Badge className="bg-green-100 text-green-700">
                                            {control.efectividad}% efectivo
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Plan de Tratamiento */}
                    {riesgo.planTratamiento && riesgo.planTratamiento.length > 0 && (
                        <Card className="p-4">
                            <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-blue-600">
                                <Activity className="w-4 h-4" />
                                Plan de Tratamiento
                            </h4>
                            <div className="space-y-3">
                                {riesgo.planTratamiento.map((accion, idx) => (
                                    <div key={idx} className="p-3 border rounded-lg">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-semibold text-sm text-gray-800">{accion.accion}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    <Users className="w-3 h-3 inline mr-1" />
                                                    {accion.responsable}
                                                </p>
                                            </div>
                                            <Badge
                                                className={`text-xs ${accion.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700' :
                                                        accion.estado === 'EN_CURSO' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}
                                            >
                                                {accion.estado}
                                            </Badge>
                                        </div>
                                        <div className="mt-2 flex items-center gap-4">
                                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full"
                                                    style={{ width: `${accion.avance}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-semibold">{accion.avance}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Fechas */}
                    <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Creado: {riesgo.fechaCreacion ? new Date(riesgo.fechaCreacion).toLocaleDateString() : 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Última actualización: {riesgo.fechaActualizacion ? new Date(riesgo.fechaActualizacion).toLocaleDateString() : 'N/A'}
                        </span>
                    </div>

                    {/* Botón Cerrar */}
                    <div className="flex justify-end pt-4 border-t">
                        <Button variant="outline" onClick={onClose}>
                            <X className="w-4 h-4 mr-1" />
                            Cerrar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
