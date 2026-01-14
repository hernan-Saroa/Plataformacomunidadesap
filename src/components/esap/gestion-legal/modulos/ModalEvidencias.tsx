/**
 * ModalEvidencias - Gestión de Evidencias y Pruebas Documentales
 * ✅ Diseño corporativo ESAP 2025 - Versión Premium
 * ✅ Header naranja con gradiente (distintivo para evidencias)
 * ✅ Footer sticky con botones siempre visibles
 * ✅ Categorización visual mejorada
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { 
  Paperclip, Download, Eye, FileText, Image as ImageIcon, 
  Video, File, X, Upload, Plus, Trash2, CheckCircle, AlertCircle,
  Search, Star, Filter, Edit
} from 'lucide-react';
import type { ExpedienteJudicial } from '../core/types';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { ModalHeaderClean } from './ModalHeaderClean';
import { VisorDocumentoModal } from './VisorDocumentoModal';

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
  const [busqueda, setBusqueda] = useState('');
  const [vistaDetallada, setVistaDetallada] = useState(true);
  
  // Estados para modal de visor
  const [modalVisorAbierto, setModalVisorAbierto] = useState(false);
  const [evidenciaSeleccionada, setEvidenciaSeleccionada] = useState<typeof evidenciasMock[0] | null>(null);

  /**
   * Ver evidencia - Abre el visor de documentos
   */
  const handleVerEvidencia = (evidencia: typeof evidenciasMock[0]) => {
    toast.loading('⏳ Cargando visor de documento...', {
      id: 'abrir-visor',
      duration: 800
    });

    setTimeout(() => {
      setEvidenciaSeleccionada(evidencia);
      setModalVisorAbierto(true);

      toast.success('✅ Documento cargado', {
        id: 'abrir-visor',
        description: `${evidencia.nombre} - ${evidencia.categoria}`,
        duration: 2000
      });

      // Log para analytics
      console.log('📊 Evidencia visualizada:', {
        expediente: expediente.id,
        evidenciaId: evidencia.id,
        nombre: evidencia.nombre,
        categoria: evidencia.categoria,
        timestamp: new Date().toISOString()
      });
    }, 800);
  };

  /**
   * Descargar evidencia individual
   */
  const handleDescargarEvidencia = (evidencia: typeof evidenciasMock[0]) => {
    toast.loading('⏳ Preparando descarga...', {
      id: 'descargar-evidencia',
      duration: 1000
    });

    setTimeout(() => {
      toast.info('📥 Descargando archivo...', {
        id: 'descargar-evidencia',
        description: `${evidencia.nombre} (${evidencia.tamaño})`,
        duration: 2000
      });

      // Simular progreso de descarga
      setTimeout(() => {
        toast.success('✅ Descarga completada', {
          id: 'descargar-evidencia',
          description: `${evidencia.nombre} se ha descargado exitosamente`,
          duration: 4000
        });

        // Log para analytics
        console.log('📊 Evidencia descargada:', {
          expediente: expediente.id,
          evidenciaId: evidencia.id,
          nombre: evidencia.nombre,
          tamaño: evidencia.tamaño,
          categoria: evidencia.categoria,
          timestamp: new Date().toISOString()
        });
      }, 2000);
    }, 1000);
  };

  const handleCargarNuevaEvidencia = () => {
    toast.info('📎 Abriendo formulario de carga', {
      description: 'Selecciona archivos y categoría de evidencia',
      duration: 2000
    });
    
    // Simular apertura de input file
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4,.mp3,.zip';
    
    input.onchange = (e: any) => {
      const files = e.target?.files;
      if (files && files.length > 0) {
        const archivosArray = Array.from(files) as File[];
        
        // Mostrar toast de progreso
        toast.info('⏳ Procesando archivos...', {
          description: `${archivosArray.length} archivo(s) seleccionado(s)`,
          duration: 2000
        });
        
        // Simular carga después de 2 segundos
        setTimeout(() => {
          const nuevasEvidencias = archivosArray.map((file, index) => {
            const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
            let tipoArchivo = 'pdf';
            let categoria = 'Documentales';
            
            // Determinar tipo y categoría según extensión
            if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
              tipoArchivo = 'image';
              categoria = 'Fotográficas';
            } else if (['mp4', 'avi', 'mov'].includes(extension)) {
              tipoArchivo = 'video';
              categoria = 'Audiovisuales';
            } else if (['zip', 'rar'].includes(extension)) {
              tipoArchivo = 'file';
              categoria = 'Digitales';
            }
            
            return {
              id: evidencias.length + index + 1,
              nombre: file.name,
              categoria,
              tipo: tipoArchivo,
              tamaño: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
              fecha: new Date().toLocaleDateString('es-CO'),
              aportadoPor: 'ESAP',
              descripcion: `Evidencia cargada al expediente. Pendiente de clasificación, revisión y asignación de folios.`,
              estado: 'Pendiente Revisión',
              estadoColor: 'orange',
              relevancia: 'Media',
              folios: 'Por asignar'
            };
          });
          
          setEvidencias([...nuevasEvidencias, ...evidencias]);
          
          toast.success(`✅ ${archivosArray.length} evidencia(s) cargada(s) exitosamente`, {
            description: 'Las evidencias están listas para revisión y clasificación',
            duration: 4000
          });
        }, 2000);
      }
    };
    
    input.click();
  };

  const handleEliminarEvidencia = (id: number, nombre: string) => {
    setEvidencias(evidencias.filter(e => e.id !== id));
    toast.success('🗑️ Evidencia eliminada', {
      description: nombre
    });
  };

  const handleMarcarAdmitida = (id: number) => {
    setEvidencias(evidencias.map(ev => 
      ev.id === id 
        ? { ...ev, estado: 'Admitida', estadoColor: 'green' }
        : ev
    ));
    toast.success('✅ Evidencia marcada como admitida');
  };

  const handleDescargarTodas = () => {
    const totalEvidencias = evidencias.length;
    const totalSize = evidencias.reduce((acc, ev) => {
      const size = parseFloat(ev.tamaño.replace(' MB', '').replace(' KB', ''));
      return acc + size;
    }, 0);
    
    toast.success('📦 Preparando descarga masiva', {
      description: `${totalEvidencias} evidencias · Tamaño estimado: ${totalSize.toFixed(2)} MB`,
      duration: 3000
    });
    
    // Simulación de compresión
    setTimeout(() => {
      toast.info('⏳ Comprimiendo archivos...', {
        description: 'Creando archivo ZIP con todas las evidencias',
        duration: 2500
      });
    }, 1500);
    
    // Simulación de descarga completada
    setTimeout(() => {
      const fileName = `Evidencias_${expediente.id.replace(/\//g, '_')}_${new Date().toISOString().split('T')[0]}.zip`;
      toast.success('✅ Descarga completada exitosamente', {
        description: fileName,
        duration: 4000
      });
    }, 4500);
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

  const evidenciasFiltradas = evidencias
    .filter(e => filtroCategoria === 'TODOS' || e.categoria === filtroCategoria)
    .filter(e => 
      busqueda === '' || 
      e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.categoria.toLowerCase().includes(busqueda.toLowerCase())
    );

  // Estadísticas
  const totalEvidencias = evidencias.length;
  const evidenciasAdmitidas = evidencias.filter(e => e.estado === 'Admitida').length;
  const evidenciasPendientes = evidencias.filter(e => e.estado.includes('Pendiente') || e.estado.includes('Revisión')).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">
          Evidencias y Pruebas - Expediente {expediente.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Gestión de evidencias y pruebas documentales del expediente {expediente.id}
        </DialogDescription>
        
        {/* Header Corporativo ESAP 2025 - Diseño Limpio y Usable */}
        <ModalHeaderClean
          titulo="Evidencias y Pruebas Documentales"
          subtitulo={`Material probatorio del expediente ${expediente.id}`}
          icono={Paperclip}
          colorIcono="orange"
          badgePrincipal={expediente.etapa}
          badges={
            <>
              <Badge variant="outline" className="font-semibold text-xs border-green-300 text-green-700">
                <CheckCircle className="w-3 h-3 mr-1" />
                {evidenciasAdmitidas} admitidas
              </Badge>
              <Badge variant="outline" className="font-semibold text-xs border-orange-300 text-orange-700">
                <AlertCircle className="w-3 h-3 mr-1" />
                {evidenciasPendientes} pendientes
              </Badge>
              <Badge variant="outline" className="font-semibold text-xs border-blue-300 text-blue-700">
                <Paperclip className="w-3 h-3 mr-1" />
                {totalEvidencias} total
              </Badge>
            </>
          }
          onClose={onClose}
        />

        {/* Barra de búsqueda y filtros */}
        <div className="px-6 py-4 bg-gradient-to-b from-orange-50 to-white border-b flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, categoría o descripción de la evidencia..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 text-sm font-semibold"
              />
            </div>
            <Button
              size="sm"
              onClick={handleCargarNuevaEvidencia}
              className="font-bold text-white"
              style={{ background: '#F57C00' }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nueva Evidencia
            </Button>
          </div>

          {/* Filtros por categoría */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            {categorias.map((cat) => {
              const count = cat === 'TODOS' ? evidencias.length : evidencias.filter(e => e.categoria === cat).length;
              return (
                <Button
                  key={cat}
                  size="sm"
                  variant={filtroCategoria === cat ? 'default' : 'outline'}
                  onClick={() => setFiltroCategoria(cat)}
                  className="text-xs font-bold whitespace-nowrap"
                  style={filtroCategoria === cat ? { background: '#F57C00', color: '#FFFFFF' } : {}}
                >
                  {cat} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        {/* Contenido - Lista de evidencias */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Información contextual */}
          <Card className="p-4 mb-4 border-l-4 border-l-orange-500" style={{ background: 'linear-gradient(135deg, #FFF3E0 0%, #FFFFFF 100%)' }}>
            <h4 className="text-sm font-black text-orange-900 mb-2 flex items-center gap-2">
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
                <Card key={evidencia.id} className="p-4 hover:shadow-lg transition-all border-l-4" style={{ borderLeftColor: evidencia.estadoColor === 'green' ? '#4CAF50' : evidencia.estadoColor === 'blue' ? '#2196F3' : '#FF9800' }}>
                  <div className="flex items-start gap-4">
                    {/* Icono del tipo */}
                    <div className="p-3 rounded-lg bg-gray-50 border-2 border-gray-200 flex-shrink-0">
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
                            <Badge variant="outline" className="text-xs font-bold">
                              📁 {evidencia.categoria}
                            </Badge>
                            <Badge variant="outline" className="text-xs font-bold">
                              📄 Folios {evidencia.folios}
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
                          <p className="text-xs text-gray-500 mb-0.5 font-semibold">📅 Fecha Carga</p>
                          <p className="text-xs font-black text-gray-900">{evidencia.fecha}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5 font-semibold">📤 Aportado por</p>
                          <p className="text-xs font-black text-gray-900">{evidencia.aportadoPor}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5 font-semibold">📦 Tamaño</p>
                          <p className="text-xs font-black text-gray-900">{evidencia.tamaño}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5 font-semibold">⚠️ Relevancia</p>
                          <p className="text-xs font-black text-gray-900">{evidencia.relevancia}</p>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button 
                          size="sm" 
                          onClick={() => handleVerEvidencia(evidencia)}
                          className="font-bold text-xs px-3 py-1.5 text-white"
                          style={{ background: '#F57C00' }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Ver
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleDescargarEvidencia(evidencia)}
                          className="font-bold text-xs px-3 py-1.5 text-white"
                          style={{ background: '#003DA5' }}
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          Descargar
                        </Button>
                        {evidencia.estado !== 'Admitida' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleMarcarAdmitida(evidencia.id)}
                            className="font-bold text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Admitir
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            if (confirm(`¿Estás seguro de eliminar "${evidencia.nombre}"?`)) {
                              handleEliminarEvidencia(evidencia.id, evidencia.nombre);
                            }
                          }}
                          className="font-bold text-xs px-2 py-1.5 border-red-400 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Footer - Botones SIEMPRE visibles */}
        <div 
          className="flex-shrink-0 bg-white border-t-2 px-6 py-4"
          style={{ 
            borderTopColor: '#F57C00',
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose} className="font-bold">
                <X className="w-4 h-4 mr-1.5" />
                Cerrar
              </Button>
              <div className="text-xs text-gray-600">
                Mostrando <strong className="text-orange-700">{evidenciasFiltradas.length}</strong> de{' '}
                <strong className="text-orange-700">{totalEvidencias}</strong> evidencias
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleDescargarTodas}
                variant="outline"
                className="font-bold"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Descargar Todas (ZIP)
              </Button>
              <Button
                onClick={handleCargarNuevaEvidencia}
                className="font-bold text-white"
                style={{ background: '#F57C00' }}
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Cargar Evidencia
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Modal visor de documentos */}
      {evidenciaSeleccionada && (
        <VisorDocumentoModal
          isOpen={modalVisorAbierto}
          onClose={() => {
            setModalVisorAbierto(false);
            setEvidenciaSeleccionada(null);
          }}
          archivo={evidenciaSeleccionada.nombre}
          numero={`Evidencia #${evidenciaSeleccionada.id}`}
          asunto={evidenciaSeleccionada.descripcion}
          expedienteId={expediente.id}
        />
      )}
    </Dialog>
  );
}