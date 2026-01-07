import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../ui/dialog';
import { Card } from '../../../../ui/card';
import { Badge } from '../../../../ui/badge';
import { AlertTriangle, CheckCircle, Clock, FileText, TrendingUp, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '../../../../ui/avatar';

interface ModalDetallePlanProps {
    open: boolean;
    onClose: () => void;
    plan: any;
}

export function ModalDetallePlan({ open, onClose, plan }: ModalDetallePlanProps) {
    if (!plan) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-[#003DA5]">{plan.codigo}</span>
                        <span className="text-gray-500 text-sm font-normal">| {plan.titulo}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* Header Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-xs text-blue-600 font-semibold mb-1">AVANCE TOTAL</p>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-bold text-blue-800">{plan.avancePorcentaje}%</span>
                                <TrendingUp className="w-5 h-5 text-blue-600 mb-1" />
                            </div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-500 font-semibold mb-1">ESTADO</p>
                            <Badge variant="outline" className="bg-white">
                                {plan.estado}
                            </Badge>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-500 font-semibold mb-1">VENCIMIENTO</p>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium">
                                    {new Date(plan.fechaFinEstimada).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Risk Card (if linked) */}
                    {plan.riesgo && (
                        <Card className="p-4 border-l-4 border-l-orange-500 bg-orange-50/50">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 mb-1">Riesgo Asociado</h4>
                                    <p className="text-sm text-gray-700 font-medium">{plan.riesgo.nombre}</p>
                                    <div className="flex gap-2 mt-2">
                                        <Badge variant="secondary" className="text-xs bg-white text-gray-600">
                                            Zona: {plan.riesgo.zonaInherente}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Details */}
                    <div className="space-y-3">
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 mb-1">Descripción / Hallazgo</h4>
                            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg">
                                {plan.descripcion || 'Sin descripción'}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-1">Origen</h4>
                                <p className="text-sm text-gray-600">{plan.origen}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-1">Responsable</h4>
                                <div className="flex items-center gap-2">
                                    <Avatar className="w-6 h-6">
                                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                            {(plan.responsableNombre || 'NA').substring(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm text-gray-600">{plan.responsableNombre || 'Sin asignar'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline / Seguimientos */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Historial de Seguimientos
                        </h4>

                        <div className="relative pl-4 border-l-2 border-gray-200 space-y-6">
                            {plan.seguimientos && plan.seguimientos.length > 0 ? (
                                plan.seguimientos.map((seg: any) => (
                                    <div key={seg.id} className="relative">
                                        <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-blue-500 border-2 border-white box-content" />
                                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold text-gray-500">
                                                    {new Date(seg.fechaReporte).toLocaleDateString()}
                                                </span>
                                                <Badge variant="secondary" className="text-xs">
                                                    Reportó: {seg.porcentajeReportado}%
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-700">{seg.descripcionAvance}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-400 italic">No hay seguimientos registrados.</p>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

