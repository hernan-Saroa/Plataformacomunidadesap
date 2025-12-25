/**
 * ModalEvidencias - Gestión de Evidencias y Pruebas Documentales
 * Evidencias = Pruebas aportadas por las partes para sustentar sus pretensiones
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { 
  Paperclip, Download, Eye, FileText, Image as ImageIcon, 
  Video, File, X, Upload, Plus, Trash2, CheckCircle, AlertCircle
} from 'lucide-react';
import type { ExpedienteJudicial } from '../core/types';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';

interface ModalEvidenciasProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
}

// Categorías de evidencias
const categorias = [
  'TODOS',
  'Documentales',
  'Testimoniales',
  'Periciales',
  'Fotográficas',
  'Audiovisuales',
  'Digitales'
];

// Datos mock de evidencias
const evidenciasMock = [
  {
    id: 1,
    nombre: 'Contrato Laboral Firmado.pdf',
    categoria: 'Documentales',
    tipo: 'pdf',
    tamaño: '2.4 MB',
    fecha: '15/12/2024',
    aportadoPor: 'ESAP',
    descripcion: 'Contrato de trabajo a término indefinido firmado entre ESAP y el demandante, donde constan las condiciones laborales acordadas.',
    estado: 'Admitida',
    estadoColor: 'green',
    relevancia: 'Alta',
    folios: '1-12'
  },
  {
    id: 2,
    nombre: 'Certificación Laboral ESAP.pdf',
    categoria: 'Documentales',
    tipo: 'pdf',
    tamaño: '890 KB',
    fecha: '16/12/2024',
    aportadoPor: 'ESAP',
    descripcion: 'Certificación expedida por el área de talento humano donde consta el tiempo de servicio, cargo desempeñado y salario devengado.',
    estado: 'Admitida',
    estadoColor: 'green',
    relevancia: 'Alta',
    folios: '13-15'
  },
  {
    id: 3,
    nombre: 'Acto Administrativo de Desvinculación.pdf',
    categoria: 'Documentales',
    tipo: 'pdf',
    tamaño: '1.2 MB',
    fecha: '18/12/2024',
    aportadoPor: 'ESAP',
    descripcion: 'Resolución administrativa mediante la cual se desvinculó al funcionario, con las motivaciones y fundamentos legales.',
    estado: 'Pendiente Revisión',
    estadoColor: 'orange',
    relevancia: 'Crítica',
    folios: '16-22'
  },
  {
    id: 4,
    nombre: 'Testimonios Personal ESAP.mp4',
    categoria: 'Testimoniales',
    tipo: 'video',
    tamaño: '156 MB',
    fecha: '20/12/2024',
    aportadoPor: 'ESAP',
    descripcion: 'Declaraciones en video de tres compañeros de trabajo del demandante, ratificando las condiciones laborales y el proceso de desvinculación.',
    estado: 'En Revisión',
    estadoColor: 'blue',
    relevancia: 'Media',
    folios: 'N/A'
  },
  {
    id: 5,
    nombre: 'Expediente Personal Completo.pdf',
    categoria: 'Documentales',
    tipo: 'pdf',
    tamaño: '8.5 MB',
    fecha: '19/12/2024',
    aportadoPor: 'ESAP',
    descripcion: 'Expediente completo del funcionario conteniendo hoja de vida, evaluaciones de desempeño, llamados de atención, memorandos y demás documentos relevantes.',
    estado: 'Admitida',
    estadoColor: 'green',
    relevancia: 'Alta',
    folios: '23-145'
  }
];

export function ModalEvidencias({ isOpen, onClose, expediente }: ModalEvidenciasProps) {
  const [evidencias, setEvidencias] = useState(evidenciasMock);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');
  const [vistaDetallada, setVistaDetallada] = useState(true);

  const handleDescargarEvidencia = (evidencia: typeof evidenciasMock[0]) => {
    toast.success('Descargando evidencia', {
      description: evidencia.nombre
    });
  };

  const handleVerEvidencia = (evidencia: typeof evidenciasMock[0]) => {
    toast.info('Abriendo visor', {
      description: evidencia.nombre
    });
  };

  const handleCargarNuevaEvidencia = () => {
    toast.info('Cargar nueva evidencia', {
      description: 'Seleccione el archivo de la prueba a aportar'
    });
  };

  const handleEliminarEvidencia = (id: number) => {
    toast.warning('Eliminar evidencia', {
      description: '¿Está seguro de eliminar esta evidencia?',
      action: {
        label: 'Eliminar',
        onClick: () => {
          setEvidencias(evidencias.filter(e => e.id !== id));
          toast.success('Evidencia eliminada');
        }
      }
    });
  };

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-600" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-blue-600" />;
      case 'video':
        return <Video className="w-5 h-5 text-purple-600" />;
      default:
        return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  const getEstadoBadge = (estado: string, color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-100 text-green-700 border-green-300',
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      orange: 'bg-orange-100 text-orange-700 border-orange-300'
    };

    return (
      <Badge className={`${colors[color]} font-semibold text-xs`}>
        {estado}
      </Badge>
    );
  };

  const getRelevanciaBadge = (relevancia: string) => {
    const colors: Record<string, string> = {
      'Crítica': 'bg-red-100 text-red-700',
      'Alta': 'bg-orange-100 text-orange-700',
      'Media': 'bg-yellow-100 text-yellow-700',
      'Baja': 'bg-gray-100 text-gray-700'
    };

    return (
      <Badge variant="outline" className={`${colors[relevancia]} text-xs font-semibold`}>
        {relevancia}
      </Badge>
    );
  };

  const evidenciasFiltradas = filtroCategoria === 'TODOS' 
    ? evidencias 
    : evidencias.filter(e => e.categoria === filtroCategoria);

  // Estadísticas
  const totalEvidencias = evidencias.length;
  const evidenciasAdmitidas = evidencias.filter(e => e.estado === 'Admitida').length;
  const evidenciasPendientes = evidencias.filter(e => e.estado.includes('Pendiente') || e.estado.includes('Revisión')).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ background: '#FFF3E0' }}>
                  <Paperclip className="w-5 h-5" style={{ color: '#F57C00' }} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black" style={{ color: '#003DA5' }}>
                    Evidencias y Pruebas
                  </DialogTitle>
                  <p className="text-sm text-gray-600">
                    Material probatorio - {expediente.id}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge style={{ background: '#003DA5', color: '#FFFFFF' }}>
                  {expediente.etapa}
                </Badge>
                <Badge className="bg-green-100 text-green-700 font-semibold">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {evidenciasAdmitidas} admitidas
                </Badge>
                <Badge className="bg-orange-100 text-orange-700 font-semibold">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {evidenciasPendientes} pendientes
                </Badge>
              </div>
            </div>

            <Button onClick={onClose} variant="ghost" size="sm" className="ml-4">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Filtros */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {categorias.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={filtroCategoria === cat ? 'default' : 'outline'}
                  onClick={() => setFiltroCategoria(cat)}
                  className="text-xs whitespace-nowrap"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Información contextual */}
          <Card className="p-4 mb-4 bg-orange-50 border-orange-200">
            <h4 className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Gestión de Evidencias
            </h4>
            <p className="text-xs text-orange-800 leading-relaxed">
              Las <strong>evidencias</strong> son pruebas documentales, testimoniales, periciales o físicas 
              que ambas partes aportan para sustentar sus pretensiones. Es crucial mantener organizadas 
              todas las pruebas, asegurar su admisibilidad legal y verificar que estén debidamente foliadas 
              y relacionadas en el expediente.
            </p>
          </Card>

          {/* Lista de evidencias */}
          <div className="space-y-3">
            {evidenciasFiltradas.length === 0 ? (
              <Card className="p-8 text-center">
                <Paperclip className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-bold text-gray-600 mb-1">
                  No hay evidencias en "{filtroCategoria}"
                </p>
                <p className="text-xs text-gray-500">
                  Intenta con otro filtro o carga una nueva evidencia
                </p>
              </Card>
            ) : (
              evidenciasFiltradas.map((evidencia) => (
                <Card key={evidencia.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    {/* Icono del tipo */}
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex-shrink-0">
                      {getIconoTipo(evidencia.tipo)}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-black text-gray-900">{evidencia.nombre}</h4>
                            {getEstadoBadge(evidencia.estado, evidencia.estadoColor)}
                            {getRelevanciaBadge(evidencia.relevancia)}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {evidencia.categoria}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Folios {evidencia.folios}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Descripción */}
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {evidencia.descripcion}
                      </p>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">📅 Fecha</p>
                          <p className="text-xs font-bold text-gray-900">{evidencia.fecha}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">📤 Aportado por</p>
                          <p className="text-xs font-bold text-gray-900">{evidencia.aportadoPor}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">📦 Tamaño</p>
                          <p className="text-xs font-bold text-gray-900">{evidencia.tamaño}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">📄 Tipo</p>
                          <p className="text-xs font-bold text-gray-900 uppercase">{evidencia.tipo}</p>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerEvidencia(evidencia)}
                          className="text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDescargarEvidencia(evidencia)}
                          className="text-xs"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Descargar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEliminarEvidencia(evidencia.id)}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xs">
                <p className="font-bold text-gray-900">
                  {totalEvidencias} evidencias totales
                </p>
                <p className="text-gray-600">
                  {evidenciasAdmitidas} admitidas · {evidenciasPendientes} pendientes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button
                onClick={handleCargarNuevaEvidencia}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Cargar Evidencia
              </Button>
              <Button style={{ background: '#003DA5', color: '#FFFFFF' }}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar Todas
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
