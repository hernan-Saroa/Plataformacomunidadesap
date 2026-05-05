import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { X, ArrowRight, File, Scale, Gavel, FileCheck, FolderCheck, Archive, FileQuestion, AlertCircle, FileText } from 'lucide-react';
import { ModalHeaderClean } from './ModalHeaderClean';

export interface TipoDocumentoItem {
    id: string;
    nombre: string;
    descripcion: string;
    color: string;
    icon: any;
}

interface ModalSeleccionTipoProps {
    isOpen: boolean;
    onClose: () => void;
    tipoProceso: string;
    tiposDocumento: TipoDocumentoItem[];
    onSelectTipo: (tipoId: string) => void;
}

export function ModalSeleccionTipo({
    isOpen,
    onClose,
    tipoProceso,
    tiposDocumento,
    onSelectTipo
}: ModalSeleccionTipoProps) {

    // Lógica de filtrado según el tipo de proceso
    const getAllowedTypes = (proceso: string) => {
        // Normalizar proceso
        const p = proceso?.toUpperCase() || 'OTRO';

        // Lista base siempre disponible
        const base = ['OTROS'];

        if (p === 'DEFENSA_JUDICIAL') {
            return ['DEMANDA', 'CONTESTACION', 'PRUEBAS', 'SENTENCIAS', 'RECURSOS', 'ACTAS', 'NOTIFICACIONES', 'OFICIOS', ...base];
        }
        if (p === 'JUZGAMIENTO_DISCIPLINARIO') {
            return ['ACTAS', 'PRUEBAS', 'EVIDENCIAS', 'AUTOS', 'FALLOS', 'OFICIOS', 'NOTIFICACIONES', ...base];
        }
        if (p === 'ASESORIA_JURIDICA') {
            return ['CONCEPTOS', 'OFICIOS', 'PRUEBAS', ...base];
        }
        if (p === 'ORGANOS_CONTROL') {
            return ['RESPUESTA', 'OFICIOS', 'PRUEBAS', ...base];
        }

        // Default: mostrar todos
        return tiposDocumento.map(t => t.id);
    };

    const allowedIds = getAllowedTypes(tipoProceso);

    // Convertir tiposDocumento a un mapa para acceso rápido
    // y permitir modificaciones dinámicas
    let displayTypes = tiposDocumento.filter(t => allowedIds.includes(t.id));

    // LÓGICA DE RENOMBRAMIENTO Y ADICIÓN DINÁMICA

    // 1. Defensa Judicial: PRUEBAS -> EVIDENCIAS (solo cambio de nombre visual)
    if (tipoProceso === 'DEFENSA_JUDICIAL') {
        displayTypes = displayTypes.map(t => {
            if (t.id === 'PRUEBAS') {
                return { ...t, nombre: 'Evidencias', descripcion: 'Evidencias, anexos y material probatorio' };
            }
            return t;
        });
    }

    // 2. Juzgamiento: Debe salir PRUEBAS y EVIDENCIAS
    // Ya tenemos PRUEBAS. Agregamos EVIDENCIAS artificialmente si no existe.
    if (tipoProceso === 'JUZGAMIENTO') {
        if (!displayTypes.find(t => t.id === 'EVIDENCIAS')) {
            displayTypes.push({
                id: 'EVIDENCIAS',
                nombre: 'Evidencias',
                descripcion: 'Evidencias físicas o digitales anexas',
                color: 'green',
                icon: FolderCheck // Mismo icono u otro
            });
        }

    }

    // 3. Organos de Control: Agregar RESPUESTA
    if (tipoProceso === 'ORGANOS_CONTROL' && !displayTypes.find(t => t.id === 'RESPUESTA')) {
        displayTypes.unshift({
            id: 'RESPUESTA',
            nombre: 'Respuesta Oficial',
            descripcion: 'Respuesta a requerimiento de ente de control',
            color: 'blue',
            icon: FileText
        });
    }

    // Reordenar para asegurar que 'OTROS' quede al final si está presente
    displayTypes.sort((a, b) => {
        if (a.id === 'OTROS') return 1;
        if (b.id === 'OTROS') return -1;
        return 0;
    });

    const handleSelect = (id: string) => {
        onSelectTipo(id);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent hideCloseButton className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogTitle className="sr-only">Seleccionar Tipo de Documento</DialogTitle>
                <DialogDescription className="sr-only">Seleccione el tipo de documento que desea cargar al expediente</DialogDescription>

                {/* Header */}
                <ModalHeaderClean
                    titulo="Cargar Nuevo Documento"
                    subtitulo="Seleccione el tipo de documento para continuar"
                    icono={File}
                    colorIcono="blue"
                    onClose={onClose}
                />

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayTypes.map((tipo) => {
                            const Icon = tipo.icon;
                            return (
                                <button
                                    key={tipo.id}
                                    onClick={() => handleSelect(tipo.id)}
                                    className="group relative flex flex-col items-start p-5 bg-white border-2 border-transparent rounded-xl shadow-sm hover:shadow-md hover:border-blue-500 transition-all text-left"
                                >
                                    <div className={`p-3 rounded-lg mb-3 bg-${tipo.color}-50 text-${tipo.color}-600 group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-6 h-6" />
                                    </div>

                                    <h3 className="font-bold text-gray-900 group-hover:text-blue-700 mb-1">
                                        {tipo.nombre}
                                    </h3>

                                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">
                                        {tipo.descripcion}
                                    </p>

                                    <div className={`mt-auto flex items-center text-xs font-bold text-${tipo.color}-600 group-hover:underline`}>
                                        Seleccionar <ArrowRight className="w-3 h-3 ml-1" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
