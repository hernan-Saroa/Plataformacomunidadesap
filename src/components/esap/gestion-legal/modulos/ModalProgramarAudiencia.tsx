/**
 * ModalProgramarAudiencia - Programación de audiencias judiciales
 * ✅ Diseño corporativo ESAP 2025 Premium
 * ✅ Programación y reasignación de audiencias
 * ✅ Historial de cambios
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { 
  Calendar, Save, X, AlertCircle, Clock, 
  MapPin, User, FileText, Repeat, History,
  CheckCircle, Scale
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ModalHeaderClean } from '../../../design-system/ModalHeaderClean';

interface ModalProgramarAudienciaProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (audiencia: any) => void;
  expedienteId: string;
  audienciaExistente?: any; // Para reasignación
}

const TIPOS_AUDIENCIA = [
  'Audiencia Inicial',
  'Audiencia de Conciliación',
  'Audiencia de Pruebas',
  'Audiencia de Alegatos',
  'Audiencia de Juzgamiento',
  'Audiencia Preparatoria',
  'Audiencia Pública',
  'Diligencia de Inspección Judicial',
  'Audiencia Virtual',
  'Otra'
];

const MOTIVOS_REASIGNACION = [
  'Aplazamiento por el Juzgado',
  'Solicitud de la contraparte',
  'Fuerza mayor',
  'Falta de notificación',
  'Cambio de magistrado/juez',
  'Acumulación de procesos',
  'Solicitud de ESAP',
  'Otro'
];

export function ModalProgramarAudiencia({ 
  isOpen, 
  onClose, 
  onGuardar, 
  expedienteId,
  audienciaExistente 
}: ModalProgramarAudienciaProps) {
  
  const esReasignacion = !!audienciaExistente;
  
  const [tipo, setTipo] = useState(audienciaExistente?.tipo || '');
  const [fecha, setFecha] = useState(audienciaExistente?.fecha || '');
  const [hora, setHora] = useState(audienciaExistente?.hora || '');
  const [lugar, setLugar] = useState(audienciaExistente?.lugar || '');
  const [modalidad, setModalidad] = useState(audienciaExistente?.modalidad || 'Presencial');
  const [linkVirtual, setLinkVirtual] = useState(audienciaExistente?.linkVirtual || '');
  const [juez, setJuez] = useState(audienciaExistente?.juez || '');
  const [abogadoResponsable, setAbogadoResponsable] = useState(audienciaExistente?.abogadoResponsable || '');
  const [objetivoAudiencia, setObjetivoAudiencia] = useState(audienciaExistente?.objetivo || '');
  const [observaciones, setObservaciones] = useState('');
  
  // Específico para reasignación
  const [motivoReasignacion, setMotivoReasignacion] = useState('');
  const [detalleReasignacion, setDetalleReasignacion] = useState('');
  
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  // Mock historial para audiencias reasignadas
  const historialReasignaciones = audienciaExistente?.historial || [
    {
      fechaOriginal: '15/01/2025 10:00 AM',
      fechaNueva: '22/01/2025 02:00 PM',
      motivo: 'Aplazamiento por el Juzgado',
      registradoPor: 'Dra. María López',
      fechaRegistro: '12/01/2025'
    }
  ];

  /**
   * Validar formulario
   */
  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (!tipo) nuevosErrores.tipo = 'Selecciona el tipo de audiencia';
    if (!fecha) nuevosErrores.fecha = 'Selecciona la fecha de la audiencia';
    if (!hora) nuevosErrores.hora = 'Indica la hora de la audiencia';
    if (!lugar.trim() && modalidad === 'Presencial') nuevosErrores.lugar = 'Indica el lugar de la audiencia';
    if (!linkVirtual.trim() && modalidad === 'Virtual') nuevosErrores.linkVirtual = 'Ingresa el enlace de la audiencia virtual';
    if (!abogadoResponsable.trim()) nuevosErrores.abogadoResponsable = 'Asigna el abogado responsable';
    
    if (esReasignacion && !motivoReasignacion) {
      nuevosErrores.motivoReasignacion = 'Indica el motivo de la reasignación';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  /**
   * Guardar audiencia
   */
  const handleGuardar = () => {
    if (!validarFormulario()) {
      toast.error('❌ Formulario incompleto', {
        description: 'Por favor corrige los errores marcados'
      });
      return;
    }

    setGuardando(true);
    toast.loading(esReasignacion ? '🔄 Reasignando audiencia...' : '💾 Programando audiencia...', { 
      id: 'guardar-audiencia' 
    });

    setTimeout(() => {
      const audiencia = {
        id: audienciaExistente?.id || Date.now(),
        tipo,
        fecha,
        hora,
        lugar,
        modalidad,
        linkVirtual,
        juez,
        abogadoResponsable,
        objetivo: objetivoAudiencia,
        observaciones,
        expedienteId,
        estado: 'Programada',
        registradoPor: 'funcionario@esap.edu.co',
        fechaRegistro: new Date().toISOString(),
        ...(esReasignacion && {
          motivoReasignacion,
          detalleReasignacion,
          fechaAnterior: audienciaExistente.fecha,
          horaAnterior: audienciaExistente.hora,
          historial: [
            ...(audienciaExistente.historial || []),
            {
              fechaOriginal: `${audienciaExistente.fecha} ${audienciaExistente.hora}`,
              fechaNueva: `${fecha} ${hora}`,
              motivo: motivoReasignacion,
              detalle: detalleReasignacion,
              registradoPor: 'funcionario@esap.edu.co',
              fechaRegistro: new Date().toLocaleDateString('es-CO')
            }
          ]
        })
      };

      onGuardar(audiencia);

      toast.success(esReasignacion ? '✅ Audiencia reasignada' : '✅ Audiencia programada', {
        id: 'guardar-audiencia',
        description: `${tipo} - ${fecha} a las ${hora}`,
        duration: 4000
      });

      console.log('📊 Audiencia registrada:', audiencia);

      limpiarFormulario();
      setGuardando(false);
      onClose();
    }, 1500);
  };

  /**
   * Limpiar formulario
   */
  const limpiarFormulario = () => {
    setTipo('');
    setFecha('');
    setHora('');
    setLugar('');
    setModalidad('Presencial');
    setLinkVirtual('');
    setJuez('');
    setAbogadoResponsable('');
    setObjetivoAudiencia('');
    setObservaciones('');
    setMotivoReasignacion('');
    setDetalleReasignacion('');
    setErrores({});
  };

  /**
   * Cancelar
   */
  const handleCancelar = () => {
    if (tipo || fecha || hora || lugar || abogadoResponsable) {
      if (confirm('¿Estás seguro de cancelar? Se perderán los datos ingresados.')) {
        limpiarFormulario();
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="!max-w-[650px] !max-h-[72vh] overflow-y-auto flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">
          {esReasignacion ? 'Reasignar Audiencia' : 'Programar Audiencia'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para {esReasignacion ? 'reasignar' : 'programar'} audiencias judiciales en el expediente {expedienteId}
        </DialogDescription>

        {/* Header */}
        <ModalHeaderClean
          titulo={esReasignacion ? 'Reasignar Audiencia Judicial' : 'Programar Audiencia Judicial'}
          subtitulo={`Expediente ${expedienteId} - ${esReasignacion ? 'Cambio de fecha/hora' : 'Nueva audiencia'}`}
          icono={esReasignacion ? Repeat : Calendar}
          colorIcono={esReasignacion ? 'orange' : 'blue'}
          badges={
            <>
              {esReasignacion && (
                <Badge className="font-semibold text-xs bg-orange-100 text-orange-700 border border-orange-300">
                  <Repeat className="w-3 h-3 mr-1" />
                  Reasignación
                </Badge>
              )}
              <Badge variant="outline" className="font-semibold text-xs border-blue-300 text-blue-700">
                <Scale className="w-3 h-3 mr-1" />
                Registro Oficial
              </Badge>
            </>
          }
          onClose={handleCancelar}
        />

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-5">
            
            {/* Alerta de reasignación */}
            {esReasignacion && (
              <Card className="p-4 bg-orange-50 border-orange-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-orange-900 mb-1">
                      ⚠️ Reasignación de Audiencia
                    </p>
                    <p className="text-xs text-orange-700">
                      Estás modificando una audiencia ya programada. Se guardará un historial completo de los cambios.
                    </p>
                    {audienciaExistente && (
                      <div className="mt-2 p-2 bg-white rounded border border-orange-200">
                        <p className="text-xs font-semibold text-gray-700">
                          📅 Fecha actual: {audienciaExistente.fecha} a las {audienciaExistente.hora}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Información del expediente */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-gray-700">Expediente:</span>
                <span className="text-gray-900">{expedienteId}</span>
              </div>
            </Card>

            {/* Tipo de Audiencia */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Tipo de Audiencia *
              </label>
              <select
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value);
                  setErrores({ ...errores, tipo: '' });
                }}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 ${
                  errores.tipo ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Selecciona el tipo de audiencia...</option>
                {TIPOS_AUDIENCIA.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {errores.tipo && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errores.tipo}
                </p>
              )}
            </div>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha de la Audiencia *
                </label>
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => {
                    setFecha(e.target.value);
                    setErrores({ ...errores, fecha: '' });
                  }}
                  className={`text-sm font-semibold ${errores.fecha ? 'border-red-500' : ''}`}
                />
                {errores.fecha && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.fecha}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Hora *
                </label>
                <Input
                  type="time"
                  value={hora}
                  onChange={(e) => {
                    setHora(e.target.value);
                    setErrores({ ...errores, hora: '' });
                  }}
                  className={`text-sm font-semibold ${errores.hora ? 'border-red-500' : ''}`}
                />
                {errores.hora && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.hora}
                  </p>
                )}
              </div>
            </div>

            {/* Modalidad */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📡 Modalidad de la Audiencia
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setModalidad('Presencial')}
                  className={`p-3 rounded-lg border-2 font-bold text-sm transition-all ${
                    modalidad === 'Presencial'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  🏛️ Presencial
                </button>
                <button
                  type="button"
                  onClick={() => setModalidad('Virtual')}
                  className={`p-3 rounded-lg border-2 font-bold text-sm transition-all ${
                    modalidad === 'Virtual'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  💻 Virtual
                </button>
              </div>
            </div>

            {/* Lugar o Link según modalidad */}
            {modalidad === 'Presencial' ? (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Lugar de la Audiencia *
                </label>
                <Input
                  placeholder="Ej: Juzgado 1° Administrativo de Bogotá - Sala 3"
                  value={lugar}
                  onChange={(e) => {
                    setLugar(e.target.value);
                    setErrores({ ...errores, lugar: '' });
                  }}
                  className={`text-sm ${errores.lugar ? 'border-red-500' : ''}`}
                />
                {errores.lugar && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.lugar}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  🔗 Enlace de la Audiencia Virtual *
                </label>
                <Input
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  value={linkVirtual}
                  onChange={(e) => {
                    setLinkVirtual(e.target.value);
                    setErrores({ ...errores, linkVirtual: '' });
                  }}
                  className={`text-sm ${errores.linkVirtual ? 'border-red-500' : ''}`}
                />
                {errores.linkVirtual && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errores.linkVirtual}
                  </p>
                )}
              </div>
            )}

            {/* Juez/Magistrado */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ⚖️ Juez/Magistrado a cargo
              </label>
              <Input
                placeholder="Ej: Dr. Carlos Ramírez González"
                value={juez}
                onChange={(e) => setJuez(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Abogado Responsable */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Abogado Responsable de ESAP *
              </label>
              <Input
                placeholder="Ej: Dra. Ana María López"
                value={abogadoResponsable}
                onChange={(e) => {
                  setAbogadoResponsable(e.target.value);
                  setErrores({ ...errores, abogadoResponsable: '' });
                }}
                className={`text-sm ${errores.abogadoResponsable ? 'border-red-500' : ''}`}
              />
              {errores.abogadoResponsable && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errores.abogadoResponsable}
                </p>
              )}
            </div>

            {/* Objetivo de la Audiencia */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🎯 Objetivo de la Audiencia
              </label>
              <textarea
                placeholder="Describe el propósito y objetivos de la audiencia..."
                value={objetivoAudiencia}
                onChange={(e) => setObjetivoAudiencia(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg resize-none"
              />
            </div>

            {/* Sección de reasignación */}
            {esReasignacion && (
              <>
                <div className="border-t border-gray-300 pt-5">
                  <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                    <Repeat className="w-5 h-5 text-orange-600" />
                    Motivo de la Reasignación
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Motivo *
                      </label>
                      <select
                        value={motivoReasignacion}
                        onChange={(e) => {
                          setMotivoReasignacion(e.target.value);
                          setErrores({ ...errores, motivoReasignacion: '' });
                        }}
                        className={`w-full px-4 py-2.5 border rounded-lg text-sm font-semibold focus:ring-2 focus:ring-orange-500 ${
                          errores.motivoReasignacion ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Selecciona el motivo de la reasignación...</option>
                        {MOTIVOS_REASIGNACION.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      {errores.motivoReasignacion && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errores.motivoReasignacion}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Detalle del motivo
                      </label>
                      <textarea
                        placeholder="Explica en detalle el motivo de la reasignación..."
                        value={detalleReasignacion}
                        onChange={(e) => setDetalleReasignacion(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Historial de reasignaciones */}
                {historialReasignaciones.length > 0 && (
                  <Card className="p-4 bg-gray-50 border-gray-200">
                    <button
                      type="button"
                      onClick={() => setMostrarHistorial(!mostrarHistorial)}
                      className="w-full flex items-center justify-between text-sm font-bold text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Historial de Reasignaciones ({historialReasignaciones.length})
                      </span>
                      <span>{mostrarHistorial ? '▲' : '▼'}</span>
                    </button>
                    
                    {mostrarHistorial && (
                      <div className="mt-3 space-y-2">
                        {historialReasignaciones.map((item, idx) => (
                          <div key={idx} className="p-3 bg-white rounded border border-gray-200">
                            <div className="text-xs space-y-1">
                              <p className="font-bold text-gray-900">
                                ❌ De: {item.fechaOriginal} → ✅ A: {item.fechaNueva}
                              </p>
                              <p className="text-gray-700">
                                <strong>Motivo:</strong> {item.motivo}
                              </p>
                              <p className="text-gray-500">
                                👤 {item.registradoPor} • 📅 {item.fechaRegistro}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}
              </>
            )}

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📝 Observaciones Adicionales
              </label>
              <textarea
                placeholder="Notas internas, preparativos necesarios, documentos a llevar..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg resize-none"
              />
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
          <Button 
            variant="outline" 
            onClick={handleCancelar}
            disabled={guardando}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={handleGuardar}
            disabled={guardando}
            style={{ background: esReasignacion ? '#F57C00' : '#003DA5', color: '#FFFFFF' }}
            className="font-bold"
          >
            {guardando ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {esReasignacion ? 'Reasignando...' : 'Guardando...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {esReasignacion ? 'Reasignar Audiencia' : 'Programar Audiencia'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}