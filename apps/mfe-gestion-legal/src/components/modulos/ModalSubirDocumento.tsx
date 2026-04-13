/**
 * ModalSubirDocumento - Permite subir documentos clasificándolos por tipo
 */
import { useState } from 'react';
import { FileText, Upload, X, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Button } from '@esap-mfe/shared-ui/button';
import { Label } from '@esap-mfe/shared-ui/label';
import { Input } from '@esap-mfe/shared-ui/input';
import { ocService } from '../../../../services/api/legal.service';

interface ModalSubirDocumentoProps {
    isOpen: boolean;
    onClose: () => void;
    requerimientoId: string;
    onSuccess?: () => void;
}

const CATEGORIAS = [
    { label: 'Requerimiento (Oficio)', value: 'oficio', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { label: 'Respuesta / Acuse', value: 'respuesta', color: 'bg-green-50 border-green-200 text-green-700' },
    { label: 'Soporte / Anexo', value: 'anexo', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    { label: 'Documento Interno', value: 'otro', color: 'bg-purple-50 border-purple-200 text-purple-700' }
];

export function ModalSubirDocumento({
    isOpen,
    onClose,
    requerimientoId,
    onSuccess
}: ModalSubirDocumentoProps) {
    const [file, setFile] = useState<File | null>(null);
    const [categoria, setCategoria] = useState<string>('anexo');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast.error('Seleccione un archivo');
            return;
        }

        setIsSubmitting(true);
        try {
            await ocService.createDocumento(requerimientoId, {
                nombre: file.name,
                tipoDocumento: categoria,
                archivo: file,
                subidoPor: 'Usuario Actual' // TODO: Get from auth context
            });

            toast.success('Documento subido correctamente');
            if (onSuccess) onSuccess();
            onClose();
            setFile(null);
            setCategoria('anexo');
        } catch (error: any) {
            console.error('Error subiendo documento:', error);
            toast.error('Error al subir documento');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent hideCloseButton className="max-w-md p-0">
                <DialogTitle className="sr-only">Subir Documento</DialogTitle>
                <DialogDescription className="sr-only">Subir documento al requerimiento</DialogDescription>

                <ModalHeaderClean
                    icono={Upload}
                    colorIcono="blue"
                    titulo="Subir Documento"
                    subtitulo="Adjuntar archivo al requerimiento"
                    onClose={onClose}
                />

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Categoría */}
                    <div className="space-y-3">
                        <Label className="text-sm font-bold text-gray-900">Tipo de Documento</Label>
                        <div className="grid grid-cols-1 gap-2">
                            {CATEGORIAS.map((cat) => (
                                <div
                                    key={cat.value}
                                    onClick={() => setCategoria(cat.value)}
                                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between ${categoria === cat.value
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <span className={`text-sm font-medium ${categoria === cat.value ? 'text-blue-900' : 'text-gray-700'
                                        }`}>
                                        {cat.label}
                                    </span>
                                    {categoria === cat.value && <CheckCircle className="w-4 h-4 text-blue-600" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Archivo */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-900">Archivo</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative">
                            <input
                                type="file"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <FileText className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                            {file ? (
                                <div>
                                    <p className="text-sm font-bold text-blue-600 truncate px-4">{file.name}</p>
                                    <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                    <p className="text-xs text-green-600 font-medium mt-1">Click para cambiar</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Click para seleccionar archivo</p>
                                    <p className="text-xs text-gray-500 mt-1">PDF, Word, Excel, Imagen</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!file || isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Subiendo...
                                </>
                            ) : (
                                'Subir Documento'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
