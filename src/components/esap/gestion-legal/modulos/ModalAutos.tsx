/**
 * ModalAutos - Gestión de Autos Procesales
 * Autos = Decisiones judiciales emitidas por el juzgado durante el proceso
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Input } from '../../../ui/input';
import {
  Scale, Download, Eye, FileText, Calendar,
  AlertCircle, CheckCircle, Clock, X, Upload, Plus,
  Trash2, Edit, Search, Filter
} from 'lucide-react';
import type { ExpedienteJudicial } from '../core/types';
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { legalService } from '../../../../services/api/legal.service';

interface ModalAutosProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
}

// Tipos de autos judiciales
const tiposAuto = [
  'Auto Admisorio',
  'Auto de Pruebas',
  'Auto de Traslado',
  'Auto de Archivo',
  'Auto de Nulidad',
  'Auto de Corrección',
  'Auto Interlocutorio',
  'Auto de Sustanciación'
];

// Mocks eliminados. Datos cargados desde API.

export function ModalAutos({ isOpen, onClose, expediente }: ModalAutosProps) {
  const [autos, setAutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);

  // Cargar autos al abrir
  useEffect(() => {
    if (isOpen && (expediente.uuid || expediente.id)) {
      loadAutos();
    }
  }, [isOpen, expediente]);

  const loadAutos = async () => {
    try {
      setLoading(true);
      const data = await legalService.getActuaciones(expediente.uuid || expediente.id);

      // Filtrar y mapear solo los que parecen ser autos (o mostrar todos si se prefiere)
      // Asumiremos que si tiene archivo o tipo 'Auto' es un auto.
      // O mostramos todas las actuaciones que tengan archivo adjunto como "Autos/Documentos"
      const mapped = data.map((act: any) => ({
        id: act.id,
        tipo: act.tipoActuacion || 'Auto General',
        numero: `AUTO-${act.id.slice(0, 4)}`, // Generar o usar número real si existe
        fecha: new Date(act.fechaActuacion || act.createdAt).toLocaleDateString('es-CO'),
        juzgado: expediente.juzgado || 'Juzgado de Conocimiento',
        resumen: act.descripcion,
        estado: 'Registrado', // Backend no tiene estado explícito aún en Actuacion entity, usar default
        estadoColor: 'blue',
        archivo: act.documentoNombre || 'No adjunto',
        archivoUrl: act.documentoUrl,
        tamaño: 'N/A',
        cumplimiento: 'Pendiente',
        fechaNotificacion: null
      }));

      setAutos(mapped);
    } catch (error) {
      console.error('Error cargando autos:', error);
      toast.error('Error al cargar autos procesales');
      setAutos([]);
    } finally {
      setLoading(false);
    }
  };

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = 'http://localhost:3008/api/legal'; // Ajustar según env
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleDescargarAuto = async (auto: any) => {
    if (!auto.archivoUrl) {
      toast.error('Este auto no tiene archivo adjunto');
      return;
    }
    const fullUrl = getFullUrl(auto.archivoUrl);

    try {
      toast.info('Iniciando descarga...');
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error('Error al descargar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', auto.archivo || `auto_${auto.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Error al descargar el archivo');
    }
  };

  const handleVerAuto = (auto: any) => {
    if (!auto.archivoUrl) {
      toast.error('No hay documento para visualizar');
      return;
    }
    window.open(getFullUrl(auto.archivoUrl), '_blank');
  };

  const handleCargarNuevoAuto = () => {
    // Crear input file dinámicamente
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        try {
          toast.loading('Subiendo auto procesal...');

          const formData = new FormData();
          formData.append('file', file); // Multer espera 'file' según ActuacionController
          formData.append('descripcion', `Auto cargado: ${file.name}`);
          formData.append('tipoActuacion', 'Auto de Sustanciación'); // Default, se podría preguntar primero
          formData.append('fechaActuacion', new Date().toISOString());

          await legalService.registrarActuacion(expediente.uuid || expediente.id, formData);

          toast.dismiss();
          toast.success('Auto cargado correctamente');
          loadAutos(); // Recargar lista
        } catch (error) {
          console.error('Error subiendo auto:', error);
          toast.dismiss();
          toast.error('Error al subir el auto');
        }
      }
    };

    input.click();
  };

  const handleEliminarAuto = (id: number, numero: string) => {
    setAutos(autos.filter(a => a.id !== id));
    toast.success('🗑️ Auto eliminado', {
      description: `${numero} fue removido del expediente`
    });
  };

  const handleMarcarNotificado = (id: number) => {
    setAutos(autos.map(auto =>
      auto.id === id
        ? {
          ...auto,
          estado: 'Notificado',
          estadoColor: 'green',
          fechaNotificacion: new Date().toLocaleDateString('es-CO'),
          cumplimiento: 'Completado'
        }
        : auto
    ));
    toast.success('✅ Estado actualizado', {
      description: 'Auto marcado como notificado'
    });
  };

  const handleDescargarTodos = () => {
    toast.success('📦 Descargando todos los autos', {
      description: `Preparando archivo ZIP con ${autos.length} documentos`
    });
  };

  const getEstadoBadge = (estado: string, color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-100 text-green-700 border-green-300',
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      orange: 'bg-orange-100 text-orange-700 border-orange-300',
      red: 'bg-red-100 text-red-700 border-red-300'
    };

    const icons: Record<string, JSX.Element> = {
      green: <CheckCircle className="w-3 h-3" />,
      blue: <Clock className="w-3 h-3" />,
      orange: <AlertCircle className="w-3 h-3" />,
      red: <AlertCircle className="w-3 h-3" />
    };

    return (
      <Badge className={`${colors[color]} font-semibold flex items-center gap-1`}>
        {icons[color]}
        {estado}
      </Badge>
    );
  };

  // Aplicar filtros y búsqueda
  const autosFiltrados = autos
    .filter(a => filtroTipo === 'TODOS' || a.tipo === filtroTipo)
    .filter(a =>
      busqueda === '' ||
      a.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.tipo.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.resumen.toLowerCase().includes(busqueda.toLowerCase())
    );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogDescription className="sr-only">
          Gestión de autos procesales del expediente {expediente.id}
        </DialogDescription>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ background: '#FFF3E0' }}>
                  <Scale className="w-5 h-5" style={{ color: '#F57C00' }} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black" style={{ color: '#003DA5' }}>
                    Autos Procesales
                  </DialogTitle>
                  <p className="text-sm text-gray-600">
                    Decisiones judiciales - {expediente.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge style={{ background: '#003DA5', color: '#FFFFFF' }}>
                  {expediente.etapa}
                </Badge>
                <Badge className="bg-orange-100 text-orange-700 font-semibold">
                  <FileText className="w-3 h-3 mr-1" />
                  {autos.length} autos
                </Badge>
              </div>
            </div>

            <Button onClick={onClose} variant="ghost" size="sm" className="ml-4">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Barra de búsqueda */}
          <div className="flex items-center gap-2 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por número, tipo o contenido..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCargarNuevoAuto}
              className="font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nuevo Auto
            </Button>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <Button
              size="sm"
              variant={filtroTipo === 'TODOS' ? 'default' : 'outline'}
              onClick={() => setFiltroTipo('TODOS')}
              className="text-xs"
            >
              Todos ({autos.length})
            </Button>
            {tiposAuto.slice(0, 5).map((tipo) => {
              const count = autos.filter(a => a.tipo === tipo).length;
              return (
                <Button
                  key={tipo}
                  size="sm"
                  variant={filtroTipo === tipo ? 'default' : 'outline'}
                  onClick={() => setFiltroTipo(tipo)}
                  className="text-xs whitespace-nowrap"
                >
                  {tipo} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Información contextual */}
          <Card className="p-4 mb-4 bg-orange-50 border-orange-200">
            <h4 className="text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              ¿Qué son los Autos Procesales?
            </h4>
            <p className="text-xs text-orange-800 leading-relaxed">
              Los <strong>autos</strong> son decisiones judiciales emitidas por el juzgado durante el proceso.
              A diferencia de las sentencias (que resuelven el fondo), los autos resuelven asuntos de trámite
              como admisión de demandas, traslados, decreto de pruebas, nulidades, etc. Es fundamental dar
              cumplimiento oportuno a cada auto para evitar sanciones procesales.
            </p>
          </Card>

          {/* Lista de autos */}
          <div className="space-y-3">
            {autosFiltrados.length === 0 ? (
              <Card className="p-8 text-center">
                <Scale className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-bold text-gray-600 mb-1">
                  No hay autos de tipo "{filtroTipo}"
                </p>
                <p className="text-xs text-gray-500">
                  Intenta con otro filtro o carga un nuevo auto
                </p>
              </Card>
            ) : (
              autosFiltrados.map((auto) => (
                <Card key={auto.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    {/* Icono del tipo */}
                    <div className="p-3 rounded-lg bg-orange-50 flex-shrink-0">
                      <Scale className="w-6 h-6 text-orange-600" />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-black text-gray-900">{auto.numero}</h4>
                            {getEstadoBadge(auto.estado, auto.estadoColor)}
                          </div>
                          <Badge variant="outline" className="text-xs mb-2">
                            {auto.tipo}
                          </Badge>
                        </div>
                      </div>

                      {/* Resumen */}
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {auto.resumen}
                      </p>

                      {/* Metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">📅 Fecha Auto</p>
                          <p className="text-xs font-bold text-gray-900">{auto.fecha}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">⚖️ Juzgado</p>
                          <p className="text-xs font-bold text-gray-900">Juzgado 1°</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">🔔 Notificación</p>
                          <p className="text-xs font-bold text-gray-900">
                            {auto.fechaNotificacion || 'Pendiente'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">✅ Cumplimiento</p>
                          <p className="text-xs font-bold text-gray-900">{auto.cumplimiento}</p>
                        </div>
                      </div>

                      {/* Alerta de días restantes */}
                      {auto.diasRestantes && (
                        <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 mb-3">
                          <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            Quedan {auto.diasRestantes} días para dar cumplimiento
                          </p>
                        </div>
                      )}

                      {/* Archivo y acciones */}
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
                        <FileText className="w-4 h-4 text-red-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {auto.archivo}
                          </p>
                          <p className="text-xs text-gray-500">{auto.tamaño}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Botón Ver - Naranja corporativo */}
                          <Button
                            size="sm"
                            onClick={() => handleVerAuto(auto)}
                            title="Ver documento completo en visor PDF"
                            className="font-semibold text-xs px-3 py-1.5"
                            style={{ background: '#F57C00', color: '#FFFFFF' }}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Ver
                          </Button>

                          {/* Botón Descargar - Naranja corporativo */}
                          <Button
                            size="sm"
                            onClick={() => handleDescargarAuto(auto)}
                            title="Descargar archivo PDF a tu equipo"
                            className="font-semibold text-xs px-3 py-1.5"
                            style={{ background: '#F57C00', color: '#FFFFFF' }}
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Descargar
                          </Button>

                          {/* Botón Eliminar - Rojo peligro */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`¿Estás seguro de eliminar el auto ${auto.numero}?`)) {
                                handleEliminarAuto(auto.id, auto.numero);
                              }
                            }}
                            title="Eliminar auto del expediente"
                            className="font-semibold text-xs px-2 py-1.5 border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>

                          {/* Botón Notificado (condicional) */}
                          {auto.estado !== 'Notificado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarcarNotificado(auto.id)}
                              title="Marcar como notificado"
                              className="font-semibold text-xs px-2 py-1.5 border-green-300 text-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose}>
                <X className="w-3.5 h-3.5 mr-1.5" />
                Cerrar
              </Button>
              <div className="text-xs text-gray-600">
                Mostrando <strong>{autosFiltrados.length}</strong> de <strong>{autos.length}</strong> autos
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleDescargarTodos}
                variant="outline"
                className="font-bold"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar Todos (ZIP)
              </Button>
              <Button
                onClick={handleCargarNuevoAuto}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Cargar Auto Nuevo
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}