import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { AlertTriangle, Clock, FileText, TrendingUp, Upload, Download, Eye, Loader2, Paperclip, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { legalService } from '../../../../../services/api/legal.service';
import { API_MODE, getServiceUrl } from '../../../../../config/environment';

interface ModalDetallePlanProps {
    open: boolean;
    onClose: () => void;
    plan: any;
}

function getFileViewUrl(filename: string): string {
    const baseUrl = getServiceUrl('legal');
    const prefix = API_MODE === 'direct' ? '' : '/legal';
    return `${baseUrl}${prefix}/files/${filename}`;
}

function getFileDownloadUrl(filename: string, originalName: string): string {
    const baseUrl = getServiceUrl('legal');
    const prefix = API_MODE === 'direct' ? '' : '/legal';
    return `${baseUrl}${prefix}/files/download/${filename}?name=${encodeURIComponent(originalName)}`;
}

function getFileIcon(mimeType: string) {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
    if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return '📊';
    if (mimeType?.includes('image')) return '🖼️';
    return '📎';
}

export function ModalDetallePlan({ open, onClose, plan }: ModalDetallePlanProps) {
    const [documentos, setDocumentos] = useState<any[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [titulo, setTitulo] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open && plan?.id) {
            fetchDocumentos();
        } else {
            setDocumentos([]);
            setSelectedFile(null);
            setTitulo('');
        }
    }, [open, plan?.id]);

    const fetchDocumentos = async () => {
        setLoadingDocs(true);
        try {
            const docs = await legalService.getDocumentosPlan(plan.id);
            setDocumentos(docs);
        } catch {
            // silently fail — documents are optional
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            if (!titulo) setTitulo(file.name.replace(/\.[^/.]+$/, ''));
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error('Seleccione un archivo');
            return;
        }
        if (!titulo.trim()) {
            toast.error('Ingrese un título para el documento');
            return;
        }

        // Bug 4: Validación cliente — máx 200MB. El backend acepta 250MB pero damos margen.
        const MAX_SIZE_MB = 200;
        const fileSizeMb = selectedFile.size / (1024 * 1024);
        if (fileSizeMb > MAX_SIZE_MB) {
            toast.error(
                `El archivo pesa ${fileSizeMb.toFixed(1)} MB y supera el límite de ${MAX_SIZE_MB} MB. Comprima el archivo o súbalo dividido.`,
                { duration: 6000 },
            );
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('titulo', titulo.trim());
            formData.append('uploadedBy', 'Sistema');

            await legalService.uploadDocumentoPlan(plan.id, formData);
            toast.success('Documento cargado exitosamente');
            setSelectedFile(null);
            setTitulo('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchDocumentos();
        } catch (err: any) {
            // Bug 4: manejar 413 explícitamente para mensaje claro al usuario
            const status = err?.response?.status || err?.status;
            if (status === 413) {
                toast.error(
                    `El archivo es demasiado grande para el servidor. Tamaño máximo permitido: ${MAX_SIZE_MB} MB.`,
                    { duration: 6000 },
                );
            } else {
                toast.error(err?.message || 'Error al cargar el documento');
            }
        } finally {
            setUploading(false);
        }
    };

    if (!plan) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
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

                    {/* Documentos Adjuntos */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Paperclip className="w-4 h-4" />
                            Documentos del Plan
                            {documentos.length > 0 && (
                                <Badge variant="secondary" className="text-xs">{documentos.length}</Badge>
                            )}
                        </h4>

                        {/* Upload area */}
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 bg-gray-50 mb-3">
                            <div className="space-y-3">
                                {selectedFile ? (
                                    <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200">
                                        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        <span className="text-sm text-gray-700 truncate flex-1">{selectedFile.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full flex flex-col items-center gap-1 py-3 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <Upload className="w-6 h-6" />
                                        <span className="text-xs">Haga clic para seleccionar un archivo</span>
                                        <span className="text-xs text-gray-400">PDF, Word, Excel, imágenes</span>
                                    </button>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                {selectedFile && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={titulo}
                                            onChange={e => setTitulo(e.target.value)}
                                            placeholder="Título del documento"
                                            className="flex-1 text-sm border border-gray-200 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        />
                                        <Button
                                            size="sm"
                                            onClick={handleUpload}
                                            disabled={uploading}
                                            style={{ background: '#003DA5', color: '#fff' }}
                                        >
                                            {uploading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Upload className="w-4 h-4" />
                                            )}
                                            <span className="ml-1">{uploading ? 'Cargando...' : 'Cargar'}</span>
                                        </Button>
                                    </div>
                                )}
                                {!selectedFile && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Seleccionar archivo
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Document list */}
                        {loadingDocs ? (
                            <div className="flex items-center justify-center py-4 text-gray-400 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Cargando documentos...
                            </div>
                        ) : documentos.length === 0 ? (
                            <p className="text-xs text-gray-400 italic text-center py-2">
                                No hay documentos cargados aún.
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {documentos.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-all">
                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                            <div className="p-1.5 bg-blue-50 rounded border border-blue-100 flex-shrink-0 text-base leading-none">
                                                {getFileIcon(doc.tipoArchivo)}
                                            </div>
                                            <div className="truncate">
                                                <p className="font-medium text-sm text-gray-900 truncate">{doc.titulo}</p>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(doc.createdAt).toLocaleDateString('es-CO')}
                                                    {doc.uploadedBy && doc.uploadedBy !== 'Sistema' && ` · ${doc.uploadedBy}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                                title="Ver documento"
                                                onClick={() => window.open(getFileViewUrl(doc.urlArchivo), '_blank')}
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-gray-500 hover:text-green-600 hover:bg-green-50"
                                                title="Descargar"
                                                onClick={() => {
                                                    const a = document.createElement('a');
                                                    a.href = getFileDownloadUrl(doc.urlArchivo, doc.titulo);
                                                    a.download = doc.titulo;
                                                    a.click();
                                                }}
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bug 5: Renombrado a "Historial de Avances" */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Historial de Avances
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
