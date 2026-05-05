import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { AlertTriangle } from 'lucide-react';

interface ModalArchivarRequerimientoProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (motivo: string) => void;
    titulo?: string;
    descripcion?: string;
}

export function ModalArchivarRequerimiento({
    isOpen,
    onClose,
    onConfirm,
    titulo = 'Archivar Elemento',
    descripcion = '¿Está seguro de archivar este elemento?'
}: ModalArchivarRequerimientoProps) {
    const [motivo, setMotivo] = useState('');
    const [error, setError] = useState(false);

    const handleConfirm = () => {
        if (!motivo.trim()) {
            setError(true);
            return;
        }
        onConfirm(motivo);
        setMotivo('');
        setError(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <div className="flex flex-col items-center text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                        <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    </div>

                    <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
                        {titulo}
                    </DialogTitle>

                    <DialogDescription className="text-gray-500 mb-6">
                        {descripcion}
                        <br />
                        Esta acción moverá el elemento a la pestaña de "Archivados".
                    </DialogDescription>

                    <div className="w-full space-y-2 text-left">
                        <label className="text-sm font-semibold text-gray-700">
                            Motivo de archivo <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                            placeholder="Indique la razón por la cual se archiva este requerimiento..."
                            value={motivo}
                            onChange={(e) => {
                                setMotivo(e.target.value);
                                setError(false);
                            }}
                            className={error ? 'border-red-500' : ''}
                            rows={3}
                        />
                        {error && (
                            <p className="text-xs text-red-500">El motivo es obligatorio.</p>
                        )}
                    </div>
                </div>

                <DialogFooter className="sm:justify-center gap-2 pb-4">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full sm:w-auto"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                        Archivar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
