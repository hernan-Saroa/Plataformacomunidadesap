/**
 * MODAL DE REGISTRO DE PROGRESO PTA
 * 
 * Permite a los docentes registrar el progreso de sus actividades del PTA
 * - Selección de actividad
 * - Registro de horas ejecutadas
 * - Descripción de actividades realizadas
 * - Carga de evidencias
 * - Validación de datos
 * 
 * Componente: ModalRegistroProgresoPTA
 * Fecha: 22 de diciembre de 2024
 */

import { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  Image,
  Video,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Paperclip,
  Trash2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner@2.0.3';

import { PTAConAprobacion } from './FlujoAprobacionPTA';
import {
  GestorSeguimientoPTA,
  RegistroProgreso,
  EvidenciaProgreso,
  TipoEvidencia,
  getEtiquetaTipoEvidencia
} from './SeguimientoControlPTA';

interface ModalRegistroProgresoProps {
  isOpen: boolean;
  onClose: () => void;
  pta: PTAConAprobacion;
  mesActual: number;
  registrosExistentes: RegistroProgreso[];
  usuarioId: string;
  usuarioNombre: string;
  onRegistrar: (registro: RegistroProgreso) => void;
}

export function ModalRegistroProgresoPTA({
  isOpen,
  onClose,
  pta,
  mesActual,
  registrosExistentes,
  usuarioId,
  usuarioNombre,
  onRegistrar
}: ModalRegistroProgresoProps) {
  const gestor = new GestorSeguimientoPTA();
  
  // Estado del formulario
  const [actividadSeleccionada, setActividadSeleccionada] = useState<string>('');
  const [horasEjecutadas, setHorasEjecutadas] = useState<string>('');
  const [descripcion, setDescripcion] = useState('');
  const [evidencias, setEvidencias] = useState<EvidenciaProgreso[]>([]);
  
  // Estado de evidencia en creación
  const [mostrarFormEvidencia, setMostrarFormEvidencia] = useState(false);
  const [tipoEvidencia, setTipoEvidencia] = useState<TipoEvidencia>('documento');
  const [nombreEvidencia, setNombreEvidencia] = useState('');
  const [descripcionEvidencia, setDescripcionEvidencia] = useState('');
  const [urlEvidencia, setUrlEvidencia] = useState('');
  
  if (!isOpen) return null;
  
  // Obtener actividad seleccionada
  const actividad = pta.actividades.find(a => a.id === actividadSeleccionada);
  
  // Calcular horas ya registradas para esta actividad
  const horasRegistradas = registrosExistentes
    .filter(r => r.actividadId === actividadSeleccionada && r.estado === 'aprobado')
    .reduce((sum, r) => sum + r.horasEjecutadas, 0);
  
  const horasDisponibles = actividad ? actividad.horasAsignadas - horasRegistradas : 0;
  
  // Validar formulario
  const validarFormulario = (): { valido: boolean; errores: string[] } => {
    const errores: string[] = [];
    
    if (!actividadSeleccionada) {
      errores.push('Debe seleccionar una actividad');
    }
    
    if (!horasEjecutadas || parseFloat(horasEjecutadas) <= 0) {
      errores.push('Debe ingresar un número válido de horas');
    }
    
    if (parseFloat(horasEjecutadas) > horasDisponibles) {
      errores.push(`No puede registrar más de ${horasDisponibles.toFixed(0)}h disponibles`);
    }
    
    if (!descripcion.trim()) {
      errores.push('Debe describir las actividades realizadas');
    }
    
    if (actividad?.requiereEvidencia && evidencias.length === 0) {
      errores.push('Esta actividad requiere al menos una evidencia');
    }
    
    return {
      valido: errores.length === 0,
      errores
    };
  };
  
  // Agregar evidencia
  const agregarEvidencia = () => {
    if (!nombreEvidencia.trim()) {
      toast.error('El nombre de la evidencia es obligatorio');
      return;
    }
    
    const nuevaEvidencia: EvidenciaProgreso = {
      id: `EVID-${Date.now()}`,
      tipo: tipoEvidencia,
      nombre: nombreEvidencia,
      descripcion: descripcionEvidencia,
      url: urlEvidencia || undefined,
      fechaCarga: new Date().toISOString()
    };
    
    setEvidencias([...evidencias, nuevaEvidencia]);
    
    // Resetear formulario de evidencia
    setNombreEvidencia('');
    setDescripcionEvidencia('');
    setUrlEvidencia('');
    setMostrarFormEvidencia(false);
    
    toast.success('Evidencia agregada');
  };
  
  // Eliminar evidencia
  const eliminarEvidencia = (id: string) => {
    setEvidencias(evidencias.filter(e => e.id !== id));
    toast.success('Evidencia eliminada');
  };
  
  // Registrar progreso
  const handleRegistrar = () => {
    const validacion = validarFormulario();
    
    if (!validacion.valido) {
      validacion.errores.forEach(error => toast.error(error));
      return;
    }
    
    try {
      const registro = gestor.registrarProgreso(
        pta,
        actividadSeleccionada,
        mesActual,
        parseFloat(horasEjecutadas),
        descripcion,
        evidencias,
        usuarioId,
        usuarioNombre
      );
      
      onRegistrar(registro);
      
      toast.success('Progreso registrado exitosamente', {
        description: 'El registro será revisado por su supervisor'
      });
      
      // Resetear formulario
      setActividadSeleccionada('');
      setHorasEjecutadas('');
      setDescripcion('');
      setEvidencias([]);
      
      onClose();
    } catch (error: any) {
      toast.error('Error al registrar progreso', {
        description: error.message
      });
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Registrar Progreso de Actividad</h2>
              <p className="text-sm opacity-90 mt-1">
                {pta.docenteNombre} • Periodo {pta.periodo} • Mes {mesActual}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Selección de actividad */}
          <div>
            <Label htmlFor="actividad" className="text-sm font-medium text-gray-700 mb-2 block">
              Actividad <span className="text-red-500">*</span>
            </Label>
            <select
              id="actividad"
              value={actividadSeleccionada}
              onChange={(e) => setActividadSeleccionada(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
            >
              <option value="">Seleccione una actividad...</option>
              {pta.actividades.map(act => {
                const horasReg = registrosExistentes
                  .filter(r => r.actividadId === act.id && r.estado === 'aprobado')
                  .reduce((sum, r) => sum + r.horasEjecutadas, 0);
                const disponibles = act.horasAsignadas - horasReg;
                
                return (
                  <option key={act.id} value={act.id} disabled={disponibles <= 0}>
                    {act.nombre} - {disponibles.toFixed(0)}h disponibles de {act.horasAsignadas}h
                  </option>
                );
              })}
            </select>
            
            {actividad && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      {actividad.nombre}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {actividad.descripcion || 'Sin descripción'}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline">{actividad.codigo}</Badge>
                      <Badge variant="outline">{actividad.componente}</Badge>
                      {actividad.requiereEvidencia && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                          Requiere evidencia
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Horas ejecutadas */}
          <div>
            <Label htmlFor="horas" className="text-sm font-medium text-gray-700 mb-2 block">
              Horas Ejecutadas <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="horas"
                type="number"
                min="0"
                max={horasDisponibles}
                step="0.5"
                value={horasEjecutadas}
                onChange={(e) => setHorasEjecutadas(e.target.value)}
                placeholder="Ej: 8"
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                horas
              </span>
            </div>
            {horasDisponibles > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Disponibles: {horasDisponibles.toFixed(1)}h de {actividad?.horasAsignadas}h totales
              </p>
            )}
          </div>
          
          {/* Descripción */}
          <div>
            <Label htmlFor="descripcion" className="text-sm font-medium text-gray-700 mb-2 block">
              Descripción de Actividades Realizadas <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describa detalladamente las actividades que realizó durante este mes..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {descripcion.length} caracteres
            </p>
          </div>
          
          {/* Evidencias */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium text-gray-700">
                Evidencias
                {actividad?.requiereEvidencia && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMostrarFormEvidencia(!mostrarFormEvidencia)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Agregar Evidencia
              </Button>
            </div>
            
            {/* Formulario de nueva evidencia */}
            {mostrarFormEvidencia && (
              <div className="border border-gray-300 rounded-lg p-4 mb-3 bg-gray-50">
                <h4 className="font-medium text-sm mb-3">Nueva Evidencia</h4>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="tipo-evidencia" className="text-xs">Tipo</Label>
                    <select
                      id="tipo-evidencia"
                      value={tipoEvidencia}
                      onChange={(e) => setTipoEvidencia(e.target.value as TipoEvidencia)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="documento">Documento</option>
                      <option value="foto">Fotografía</option>
                      <option value="video">Video</option>
                      <option value="enlace">Enlace</option>
                      <option value="certificado">Certificado</option>
                      <option value="publicacion">Publicación</option>
                      <option value="acta">Acta</option>
                      <option value="listado-asistencia">Listado de Asistencia</option>
                      <option value="plan-clase">Plan de Clase</option>
                      <option value="informe">Informe</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="nombre-evidencia" className="text-xs">Nombre</Label>
                    <Input
                      id="nombre-evidencia"
                      type="text"
                      value={nombreEvidencia}
                      onChange={(e) => setNombreEvidencia(e.target.value)}
                      placeholder="Ej: Informe de actividades semana 1"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="descripcion-evidencia" className="text-xs">Descripción</Label>
                    <Input
                      id="descripcion-evidencia"
                      type="text"
                      value={descripcionEvidencia}
                      onChange={(e) => setDescripcionEvidencia(e.target.value)}
                      placeholder="Descripción breve de la evidencia"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="url-evidencia" className="text-xs">
                      URL o Ubicación {tipoEvidencia === 'enlace' && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="url-evidencia"
                      type="text"
                      value={urlEvidencia}
                      onChange={(e) => setUrlEvidencia(e.target.value)}
                      placeholder="https://... o ruta del archivo"
                      className="text-sm"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={agregarEvidencia}
                      className="flex-1 bg-[#003DA5]"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Agregar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setMostrarFormEvidencia(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Lista de evidencias */}
            {evidencias.length > 0 ? (
              <div className="space-y-2">
                {evidencias.map(evid => (
                  <div
                    key={evid.id}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="mt-0.5">
                      {evid.tipo === 'documento' && <FileText className="w-4 h-4 text-blue-600" />}
                      {evid.tipo === 'foto' && <Image className="w-4 h-4 text-green-600" />}
                      {evid.tipo === 'video' && <Video className="w-4 h-4 text-red-600" />}
                      {evid.tipo === 'enlace' && <LinkIcon className="w-4 h-4 text-purple-600" />}
                      {!['documento', 'foto', 'video', 'enlace'].includes(evid.tipo) && (
                        <Paperclip className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{evid.nombre}</p>
                      {evid.descripcion && (
                        <p className="text-xs text-gray-600 mt-0.5">{evid.descripcion}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getEtiquetaTipoEvidencia(evid.tipo)}
                        </Badge>
                        {evid.url && (
                          <a
                            href={evid.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline truncate max-w-[200px]"
                          >
                            {evid.url}
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => eliminarEvidencia(evid.id)}
                      className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No hay evidencias agregadas</p>
                {actividad?.requiereEvidencia && (
                  <p className="text-xs text-amber-600 mt-1">
                    Esta actividad requiere al menos una evidencia
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRegistrar}
              className="bg-[#003DA5] hover:bg-[#002F85]"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Registrar Progreso
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
