/**
 * DemoReprogramacionAudiencia - Demostración del flujo de reprogramación
 * ✅ Mock completo del proceso de programar y reprogramar audiencias
 * ✅ Diseño corporativo ESAP 2025
 */

import { useState } from 'react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { 
  Calendar, MapPin, User, Clock, AlertCircle,
  CheckCircle, Repeat, History
} from 'lucide-react';
import { ModalProgramarAudiencia } from './ModalProgramarAudiencia';
import { toast } from 'sonner@2.0.3';

export function DemoReprogramacionAudiencia() {
  const [modalProgramarAbierto, setModalProgramarAbierto] = useState(false);
  const [audienciaAReasignar, setAudienciaAReasignar] = useState<any>(null);
  const [audienciasProgramadas, setAudienciasProgramadas] = useState<any[]>([
    // Audiencia mock ya programada
    {
      id: 1,
      tipo: 'Audiencia Inicial',
      fecha: '2025-02-15',
      hora: '10:00',
      lugar: 'Juzgado 12 Administrativo de Bogotá - Sala 3',
      modalidad: 'Presencial',
      juez: 'Dr. Carlos Ramírez González',
      abogadoResponsable: 'Dra. Ana María López',
      objetivo: 'Presentar contestación de la demanda y solicitar pruebas',
      estado: 'Programada',
      observaciones: 'Llevar certificados laborales y documentación de soporte',
      registradoPor: 'funcionario@esap.edu.co',
      fechaRegistro: '2025-01-20',
      historial: []
    }
  ]);

  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  const handleGuardarAudiencia = (audiencia: any) => {
    if (audienciaAReasignar) {
      // Reasignación
      setAudienciasProgramadas(
        audienciasProgramadas.map(a => 
          a.id === audiencia.id ? audiencia : a
        )
      );
      
      toast.success('✅ Audiencia reasignada exitosamente', {
        description: `${audiencia.tipo} - Nueva fecha: ${audiencia.fecha} a las ${audiencia.hora}`,
        duration: 5000
      });

      setAudienciaAReasignar(null);
      setPaso(3); // Ir al paso final
    } else {
      // Nueva audiencia
      setAudienciasProgramadas([...audienciasProgramadas, audiencia]);
      
      toast.success('✅ Audiencia programada exitosamente', {
        description: `${audiencia.tipo} - ${audiencia.fecha} a las ${audiencia.hora}`,
        duration: 5000
      });

      setPaso(2); // Ir al paso 2
    }
  };

  const handleReasignar = (audiencia: any) => {
    setAudienciaAReasignar(audiencia);
    setModalProgramarAbierto(true);
  };

  const reiniciarDemo = () => {
    setPaso(1);
    setAudienciasProgramadas([
      {
        id: 1,
        tipo: 'Audiencia Inicial',
        fecha: '2025-02-15',
        hora: '10:00',
        lugar: 'Juzgado 12 Administrativo de Bogotá - Sala 3',
        modalidad: 'Presencial',
        juez: 'Dr. Carlos Ramírez González',
        abogadoResponsable: 'Dra. Ana María López',
        objetivo: 'Presentar contestación de la demanda y solicitar pruebas',
        estado: 'Programada',
        observaciones: 'Llevar certificados laborales y documentación de soporte',
        registradoPor: 'funcionario@esap.edu.co',
        fechaRegistro: '2025-01-20',
        historial: []
      }
    ]);
    setAudienciaAReasignar(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            🔄 Demo: Proceso de Reprogramación de Audiencias
          </h1>
          <p className="text-lg text-gray-600">
            Flujo completo de programación y reprogramación de audiencias judiciales en SIGL
          </p>
        </div>

        {/* Pasos del proceso */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {/* Paso 1 */}
            <div className={`flex items-center gap-3 ${paso >= 1 ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
                paso === 1 ? 'bg-blue-600 text-white' : paso > 1 ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {paso > 1 ? '✓' : '1'}
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Audiencia Programada</p>
                <p className="text-xs text-gray-600">Ver audiencia inicial</p>
              </div>
            </div>

            {/* Línea conectora */}
            <div className={`flex-1 h-1 mx-4 ${paso >= 2 ? 'bg-green-600' : 'bg-gray-300'}`} />

            {/* Paso 2 */}
            <div className={`flex items-center gap-3 ${paso >= 2 ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
                paso === 2 ? 'bg-orange-600 text-white' : paso > 2 ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {paso > 2 ? '✓' : '2'}
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Reprogramar</p>
                <p className="text-xs text-gray-600">Cambiar fecha/hora</p>
              </div>
            </div>

            {/* Línea conectora */}
            <div className={`flex-1 h-1 mx-4 ${paso >= 3 ? 'bg-green-600' : 'bg-gray-300'}`} />

            {/* Paso 3 */}
            <div className={`flex items-center gap-3 ${paso >= 3 ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
                paso === 3 ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {paso >= 3 ? '✓' : '3'}
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Confirmado</p>
                <p className="text-xs text-gray-600">Historial guardado</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido según el paso */}
        <div className="grid grid-cols-1 gap-6">

          {/* PASO 1: Audiencia Programada */}
          <Card className="p-6 bg-white border-2 border-blue-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                Paso 1: Audiencia Programada
              </h2>
              {paso === 1 && (
                <Badge className="bg-blue-600 text-white font-bold text-sm px-3 py-1">
                  PASO ACTUAL
                </Badge>
              )}
              {paso > 1 && (
                <Badge className="bg-green-600 text-white font-bold text-sm px-3 py-1">
                  ✓ COMPLETADO
                </Badge>
              )}
            </div>

            <Card className="p-4 bg-gradient-to-r from-purple-50 to-white border-purple-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="text-xs font-bold bg-purple-100 text-purple-700">
                      {audienciasProgramadas[0].tipo}
                    </Badge>
                    <Badge className="text-xs font-bold bg-green-100 text-green-700">
                      ✓ {audienciasProgramadas[0].estado}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <strong className="text-gray-900">Fecha:</strong>
                      <span className="text-gray-700">
                        {new Date(audienciasProgramadas[0].fecha).toLocaleDateString('es-CO', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <strong className="text-gray-900">Hora:</strong>
                      <span className="text-gray-700">{audienciasProgramadas[0].hora}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-purple-600" />
                      <strong className="text-gray-900">Lugar:</strong>
                      <span className="text-gray-700">{audienciasProgramadas[0].lugar}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-purple-600" />
                      <strong className="text-gray-900">Abogado:</strong>
                      <span className="text-gray-700">{audienciasProgramadas[0].abogadoResponsable}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleReasignar(audienciasProgramadas[0])}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
                    disabled={paso !== 1}
                  >
                    <Repeat className="w-4 h-4 mr-2" />
                    Reprogramar
                  </Button>
                </div>
              </div>
            </Card>

            {paso === 1 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Instrucciones:</strong> Esta audiencia ya está programada. 
                    Si necesitas cambiar la fecha, hora o cualquier otro dato, 
                    haz clic en el botón <strong>"Reprogramar"</strong> para iniciar el proceso de reasignación.
                  </span>
                </p>
              </div>
            )}
          </Card>

          {/* PASO 2: Proceso de Reprogramación */}
          {paso >= 2 && (
            <Card className="p-6 bg-white border-2 border-orange-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Repeat className="w-6 h-6 text-orange-600" />
                  Paso 2: Proceso de Reprogramación
                </h2>
                {paso === 2 && (
                  <Badge className="bg-orange-600 text-white font-bold text-sm px-3 py-1">
                    PASO ACTUAL
                  </Badge>
                )}
                {paso > 2 && (
                  <Badge className="bg-green-600 text-white font-bold text-sm px-3 py-1">
                    ✓ COMPLETADO
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                <Card className="p-4 bg-orange-50 border-orange-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-orange-900 mb-1">
                        ⚠️ Reasignación de Audiencia
                      </p>
                      <p className="text-xs text-orange-700">
                        Al hacer clic en "Reprogramar", se abre el modal con:
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-orange-700">
                        <li>✓ Todos los datos de la audiencia actual pre-cargados</li>
                        <li>✓ Campos adicionales para motivo de reasignación</li>
                        <li>✓ Historial completo de cambios anteriores</li>
                        <li>✓ Validación de nueva fecha y hora</li>
                      </ul>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 bg-red-50 border-red-200">
                    <h3 className="text-sm font-bold text-red-900 mb-2 flex items-center gap-2">
                      ❌ Datos Anteriores
                    </h3>
                    <div className="space-y-1 text-xs text-gray-700">
                      <p><strong>Fecha:</strong> {audienciasProgramadas[0].fecha}</p>
                      <p><strong>Hora:</strong> {audienciasProgramadas[0].hora}</p>
                      <p><strong>Lugar:</strong> {audienciasProgramadas[0].lugar}</p>
                    </div>
                  </Card>

                  {paso === 3 && audienciasProgramadas[0].fechaAnterior && (
                    <Card className="p-4 bg-green-50 border-green-200">
                      <h3 className="text-sm font-bold text-green-900 mb-2 flex items-center gap-2">
                        ✓ Datos Nuevos
                      </h3>
                      <div className="space-y-1 text-xs text-gray-700">
                        <p><strong>Fecha:</strong> {audienciasProgramadas[0].fecha}</p>
                        <p><strong>Hora:</strong> {audienciasProgramadas[0].hora}</p>
                        <p><strong>Lugar:</strong> {audienciasProgramadas[0].lugar}</p>
                        <p className="mt-2 pt-2 border-t border-green-300">
                          <strong>Motivo:</strong> {audienciasProgramadas[0].motivoReasignacion}
                        </p>
                      </div>
                    </Card>
                  )}
                </div>

                {paso === 2 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>En el modal verás:</strong> Todos los campos completados con la información actual, 
                        y campos adicionales para indicar el motivo de la reasignación. 
                        El sistema guardará automáticamente el historial de cambios.
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* PASO 3: Confirmación Final */}
          {paso >= 3 && (
            <Card className="p-6 bg-white border-2 border-green-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  Paso 3: Audiencia Reasignada Exitosamente
                </h2>
                <Badge className="bg-green-600 text-white font-bold text-sm px-3 py-1">
                  ✓ COMPLETADO
                </Badge>
              </div>

              <Card className="p-4 bg-green-50 border-green-300 mb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-green-900 mb-2">
                      ✅ La audiencia se reprogramó correctamente
                    </p>
                    <p className="text-xs text-green-700 mb-3">
                      Se guardó un registro completo en el historial de la audiencia.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Historial de reasignaciones */}
              {audienciasProgramadas[0].historial && audienciasProgramadas[0].historial.length > 0 && (
                <Card className="p-4 bg-gray-50 border-gray-300">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-600" />
                    Historial de Reasignaciones
                  </h3>
                  <div className="space-y-3">
                    {audienciasProgramadas[0].historial.map((item: any, idx: number) => (
                      <Card key={idx} className="p-3 bg-white border-gray-200">
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Badge className="text-xs font-bold bg-red-100 text-red-700">
                              Anterior
                            </Badge>
                            <span className="text-gray-700">{item.fechaOriginal}</span>
                            <span className="text-gray-400">→</span>
                            <Badge className="text-xs font-bold bg-green-100 text-green-700">
                              Nueva
                            </Badge>
                            <span className="text-gray-700">{item.fechaNueva}</span>
                          </div>
                          <p className="text-gray-700">
                            <strong>Motivo:</strong> {item.motivo}
                          </p>
                          {item.detalle && (
                            <p className="text-gray-600">
                              <strong>Detalle:</strong> {item.detalle}
                            </p>
                          )}
                          <p className="text-gray-500 pt-2 border-t border-gray-200">
                            👤 {item.registradoPor} • 📅 {item.fechaRegistro}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              )}

              <div className="mt-4 flex justify-center">
                <Button
                  onClick={reiniciarDemo}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  🔄 Reiniciar Demo
                </Button>
              </div>
            </Card>
          )}

        </div>

        {/* Botón flotante para abrir modal */}
        {paso < 3 && (
          <div className="fixed bottom-8 right-8">
            <Button
              size="lg"
              onClick={() => {
                setAudienciaAReasignar(paso === 1 ? audienciasProgramadas[0] : null);
                setModalProgramarAbierto(true);
              }}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold shadow-xl"
            >
              <Repeat className="w-5 h-5 mr-2" />
              {paso === 1 ? 'Abrir Modal de Reprogramación' : 'Ver Modal Nuevamente'}
            </Button>
          </div>
        )}

      </div>

      {/* Modal de Programar/Reprogramar Audiencia */}
      <ModalProgramarAudiencia
        isOpen={modalProgramarAbierto}
        onClose={() => {
          setModalProgramarAbierto(false);
          setAudienciaAReasignar(null);
        }}
        onGuardar={handleGuardarAudiencia}
        expedienteId="DJ-001"
        audienciaExistente={audienciaAReasignar}
      />
    </div>
  );
}
