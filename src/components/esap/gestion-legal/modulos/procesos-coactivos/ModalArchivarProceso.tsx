
import { useState } from 'react';
import { ModalSIGL } from '../../design-system/ModalSIGL';
import { AlertTriangle } from 'lucide-react';

interface ModalArchivarProcesoProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (motivo: string) => void;
    proceso: { radicado: string };
}

export function ModalArchivarProceso({ isOpen, onClose, onConfirm, proceso }: ModalArchivarProcesoProps) {
    const [motivo, setMotivo] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!motivo.trim()) return;
        onConfirm(motivo);
    };

    return (
        <ModalSIGL
            isOpen={isOpen}
            onClose={onClose}
            title="Mover a Papelera"
            size="small"
        >
            <form onSubmit={handleSubmit} className="space-y-4">

                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-amber-700">
                                Está a punto de mover a la papelera el proceso <strong>{proceso.radicado}</strong>.
                                Podrá restaurarlo posteriormente desde la vista de "Archivados".
                            </p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Motivo de eliminación/archivo <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                        placeholder="Describa por qué está archivando este proceso..."
                        required
                        autoFocus
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={!motivo.trim()}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                            boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                        }}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Confirmar Archivo
                    </button>
                </div>
            </form>
        </ModalSIGL>
    );
}
