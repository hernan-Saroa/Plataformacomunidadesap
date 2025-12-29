import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../ui/dialog';
import { Badge } from '../../../../ui/badge';
import { ScrollArea } from '../../../../ui/scroll-area';
import { Target, Calendar, User, AlignLeft, TrendingUp } from 'lucide-react';

interface ModalDetalleIndicadorProps {
    open: boolean;
    onClose: () => void;
    indicador: any;
}

export function ModalDetalleIndicador({ open, onClose, indicador }: ModalDetalleIndicadorProps) {
    if (!indicador) return null;

    const registros = indicador.registros || [];

    const getSemaforoColor = (cumplimiento: number) => {
        if (cumplimiento >= 90) return '#10B981';
        if (cumplimiento >= 50) return '#F59E0B';
        return '#DC2626';
    };

    const color = getSemaforoColor(indicador.avanceActual);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] bg-white text-gray-900 border-gray-200">
                <DialogHeader className="border-b pb-4">
                    <div className="flex justify-between items-start pr-8">
                        <div>
                            <p className="text-xs font-bold text-[#003DA5] uppercase mb-1">
                                {indicador.ejeEstrategico}
                            </p>
                            <DialogTitle className="text-xl text-gray-900">
                                {indicador.nombre}
                            </DialogTitle>
                        </div>
                        <Badge
                            className="text-lg px-3 py-1 font-bold"
                            style={{ backgroundColor: color, color: 'white' }}
                        >
                            {indicador.avanceActual}%
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-4 py-4 border-b">
                    <div className="space-y-1">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Target className="w-3 h-3" /> Meta
                        </span>
                        <p className="font-bold">{indicador.metaObjetivo} {indicador.unidadMedida}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                            <TrendingUp className="w-3 h-3" /> Actual
                        </span>
                        <p className="font-bold" style={{ color }}>{indicador.valorActual} {indicador.unidadMedida}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="w-3 h-3" /> Responsable
                        </span>
                        <p className="font-medium text-sm truncate" title={indicador.responsableNombre}>
                            {indicador.responsableNombre || 'Sin asignar'}
                        </p>
                    </div>
                </div>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <span className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                            <AlignLeft className="w-4 h-4" /> Descripción
                        </span>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                            {indicador.descripcion || 'Sin descripción'}
                        </p>
                    </div>

                    <div>
                        <span className="flex items-center gap-1 text-sm font-semibold text-gray-700 mb-2">
                            <Calendar className="w-4 h-4" /> Historial de Avances
                        </span>
                        <ScrollArea className="h-[200px] w-full rounded-md border p-2">
                            {registros.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-8">No hay registros de avance.</p>
                            ) : (
                                <div className="space-y-3">
                                    {registros.map((reg: any) => (
                                        <div key={reg.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg text-sm">
                                            <div className="flex-shrink-0 w-24 text-gray-500 text-xs text-right border-r pr-3">
                                                {new Date(reg.fechaRegistro).toLocaleDateString()}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-bold">Reportó: {reg.valorReportado}</span>
                                                    <span className="text-xs font-mono bg-white px-2 rounded border">
                                                        {reg.porcentajeAvance}%
                                                    </span>
                                                </div>
                                                <p className="text-gray-600 text-xs">
                                                    {reg.observaciones}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
