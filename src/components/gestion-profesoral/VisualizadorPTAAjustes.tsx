/**
 * VISUALIZADOR DE PTA CON AJUSTES SOLICITADOS
 * 
 * Componente especializado para mostrar un PTA en estado "ajustes-solicitados"
 * con toda la información detallada de:
 * - Actividades y distribución de horas
 * - Historial de aprobaciones completo
 * - Ajustes solicitados con detalle
 * - Comentarios de aprobadores
 * - Timeline de aprobación
 * 
 * Fecha: 22 de diciembre de 2024
 */

import { useState } from 'react';
import { X, AlertTriangle, TrendingUp, TrendingDown, Clock, CheckCircle, Edit, Send, ChevronDown, ChevronUp, FileText, User, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner@2.0.3';
import { ModalActividadesAfectadas } from './ModalActividadesAfectadas';
import { ModalRealizarAjustes } from './ModalRealizarAjustes';

import { PTAConAprobacion, AprobacionPTA } from './FlujoAprobacionPTA';
import { ptaDemoAjustesSolicitados, obtenerResumenAjustes } from '../../data/ptaDemoAjustesSolicitados';

interface VisualizadorPTAAjustesProps {
  usuario?: any;
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  pta?: any;
}

export function VisualizadorPTAAjustes({ 
  usuario, 
  onLogout, 
  isOpen = true, 
  onClose, 
  pta: ptaExterno 
}: VisualizadorPTAAjustesProps = {}) {
  // Siempre usar el PTA demo completo
  const pta = ptaDemoAjustesSolicitados;
  const resumenAjustes = obtenerResumenAjustes();
  
  const [seccionExpandida, setSeccionExpandida] = useState<string>('ajustes');
  const [mostrarComentarios, setMostrarComentarios] = useState(true);
  const [modalActividadesAfectadas, setModalActividadesAfectadas] = useState(false);
  const [modalRealizarAjustes, setModalRealizarAjustes] = useState(false);

  const toggleSeccion = (seccion: string) => {
    setSeccionExpandida(seccionExpandida === seccion ? '' : seccion);
  };

  const handleRealizarAjustes = () => {
    setModalRealizarAjustes(true);
  };

  const handleVerActividadesAfectadas = () => {
    setModalActividadesAfectadas(true);
  };

  const handleEditarActividad = (actividadId: string) => {
    toast.info(`Editando actividad ${actividadId}`, {
      description: 'Abriendo editor de actividad...'
    });
    setModalActividadesAfectadas(false);
    setModalRealizarAjustes(true);
  };

  const handleGuardarAjustes = () => {
    toast.success('Ajustes guardados exitosamente', {
      description: 'Ahora puedes reenviar el PTA para aprobación'
    });
    setModalRealizarAjustes(false);
  };

  const handleReenviarAprobacion = () => {
    toast.success('PTA reenviado para aprobación', {
      description: 'El Decano será notificado de los ajustes realizados'
    });
  };

  // Si el modal está cerrado, no renderizar nada
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      <div className="bg-gray-50 rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        {/* Botón cerrar */}
        {onClose && (
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-bold text-gray-900">Detalle del PTA - Ajustes Solicitados</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Header con estado */}
          <Card className="border-l-4 border-l-amber-500 bg-amber-50/50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold text-gray-900">
                        Plan de Trabajo Académico {pta.periodo}
                      </h1>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                        Ajustes Solicitados
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-1">{pta.docenteNombre}</p>
                    <p className="text-sm text-gray-500">
                      {pta.docenteDocumento} • {pta.docenteEmail}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      {pta.territorial} • {pta.facultad} • {pta.programa}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Versión</p>
                  <p className="text-2xl font-bold text-gray-900">{pta.version}</p>
                </div>
              </div>

              {/* Alerta de ajustes */}
              <div className="mt-4 p-4 bg-amber-100 border border-amber-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-900">
                      El Decano ha solicitado ajustes antes de la aprobación final
                    </p>
                    <p className="text-sm text-amber-800 mt-1">
                      Se requieren {resumenAjustes.obligatorios} ajustes obligatorios y {resumenAjustes.sugeridos} sugeridos.
                      Por favor revisa la sección de ajustes solicitados más abajo.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Métricas rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Horas Totales</p>
                    <p className="text-2xl font-bold text-gray-900">{pta.horasTotalesAsignadas}h</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Actividades</p>
                    <p className="text-2xl font-bold text-gray-900">{pta.actividades?.length || 0}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Nivel Aprobación</p>
                    <p className="text-2xl font-bold text-gray-900">{pta.nivelAprobacionActual}/3</p>
                  </div>
                  <Clock className="w-8 h-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ajustes Req.</p>
                    <p className="text-2xl font-bold text-amber-600">{resumenAjustes.obligatorios}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sección: Ajustes Solicitados */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => toggleSeccion('ajustes')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <CardTitle>Ajustes Solicitados por Decanatura</CardTitle>
                    <CardDescription>
                      {resumenAjustes.obligatorios} obligatorios • {resumenAjustes.sugeridos} sugeridos
                    </CardDescription>
                  </div>
                </div>
                {seccionExpandida === 'ajustes' ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>

            {seccionExpandida === 'ajustes' && (
              <CardContent className="space-y-4">
                {/* Mensaje del Decano */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <User className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">
                        Dr. Roberto Silva Castro - Decano
                      </p>
                      <p className="text-sm text-red-700">
                        02 de diciembre de 2024, 16:45
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-red-900 whitespace-pre-wrap bg-white p-4 rounded border border-red-200">
                    {pta.ajustesSolicitados}
                  </div>
                </div>

                {/* Lista detallada de ajustes */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Detalle de Ajustes:</h4>
                  {resumenAjustes.detalles.map((ajuste, idx) => (
                    <div 
                      key={idx}
                      className={`border rounded-lg p-4 ${
                        ajuste.tipo === 'obligatorio' 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={
                            ajuste.tipo === 'obligatorio'
                              ? 'bg-red-600 text-white'
                              : 'bg-amber-600 text-white'
                          }>
                            {ajuste.tipo.toUpperCase()}
                          </Badge>
                          <span className="font-medium text-sm">{ajuste.actividad}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          {ajuste.ajusteHoras.includes('+') ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : ajuste.ajusteHoras.includes('-') ? (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          ) : null}
                          <span className="font-mono font-medium">{ajuste.ajusteHoras}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{ajuste.descripcion}</p>
                    </div>
                  ))}
                </div>

                {/* Acciones */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button onClick={handleRealizarAjustes} className="bg-[#003DA5]">
                    <Edit className="w-4 h-4 mr-2" />
                    Realizar Ajustes
                  </Button>
                  <Button variant="outline" onClick={handleVerActividadesAfectadas}>
                    Ver Actividades Afectadas
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Timeline de Aprobación */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => toggleSeccion('timeline')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-[#003DA5]" />
                  <div>
                    <CardTitle>Timeline de Aprobación</CardTitle>
                    <CardDescription>
                      Historial completo de aprobaciones y observaciones
                    </CardDescription>
                  </div>
                </div>
                {seccionExpandida === 'timeline' ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>

            {seccionExpandida === 'timeline' && (
              <CardContent>
                <TimelineAprobacion aprobaciones={pta.aprobaciones || []} />
              </CardContent>
            )}
          </Card>

          {/* Distribución de Horas */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => toggleSeccion('distribucion')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <div>
                    <CardTitle>Distribución de Horas por Componente</CardTitle>
                    <CardDescription>
                      {pta.horasTotalesAsignadas}h totales distribuidas en 4 componentes misionales
                    </CardDescription>
                  </div>
                </div>
                {seccionExpandida === 'distribucion' ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>

            {seccionExpandida === 'distribucion' && (
              <CardContent className="space-y-4">
                <DistribucionHoras
                  docencia={pta.horasDocencia || 0}
                  investigacion={pta.horasInvestigacion || 0}
                  extension={pta.horasExtension || 0}
                  administrativo={pta.horasAdministrativo || 0}
                  total={pta.horasTotalesAsignadas || 1}
                />
              </CardContent>
            )}
          </Card>

          {/* Actividades Detalladas */}
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => toggleSeccion('actividades')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <div>
                    <CardTitle>Actividades del PTA ({pta.actividades?.length || 0})</CardTitle>
                    <CardDescription>
                      Detalle completo de todas las actividades programadas
                    </CardDescription>
                  </div>
                </div>
                {seccionExpandida === 'actividades' ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>

            {seccionExpandida === 'actividades' && (
              <CardContent>
                <ListaActividadesDetallada actividades={pta.actividades || []} />
              </CardContent>
            )}
          </Card>

          {/* Acciones finales */}
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    ¿Listo para realizar los ajustes?
                  </h3>
                  <p className="text-sm text-gray-600">
                    Haz clic en "Realizar Ajustes" para editar las actividades del PTA según las observaciones recibidas.
                    Una vez completados los ajustes, podrás reenviar el PTA para aprobación.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    className="bg-[#003DA5] hover:bg-[#002d7a]"
                    onClick={handleRealizarAjustes}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Realizar Ajustes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modales */}
        <ModalActividadesAfectadas
          isOpen={modalActividadesAfectadas}
          onClose={() => setModalActividadesAfectadas(false)}
          onEditarActividad={handleEditarActividad}
        />

        <ModalRealizarAjustes
          isOpen={modalRealizarAjustes}
          onClose={() => setModalRealizarAjustes(false)}
          onGuardarAjustes={handleGuardarAjustes}
        />
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

function TimelineAprobacion({ aprobaciones }: { aprobaciones: AprobacionPTA[] }) {
  if (!aprobaciones || aprobaciones.length === 0) {
    return <p className="text-gray-500 text-center py-4">No hay aprobaciones registradas</p>;
  }

  return (
    <div className="space-y-4">
      {aprobaciones.map((apro, idx) => {
        const esUltimo = idx === aprobaciones.length - 1;
        const color = 
          apro.estado === 'aprobado' ? 'green' :
          apro.estado === 'ajustes-solicitados' ? 'amber' :
          'red';

        return (
          <div key={apro.id} className="relative">
            {/* Línea conectora */}
            {!esUltimo && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-300" />
            )}

            {/* Nodo */}
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 ${
                color === 'green' ? 'bg-green-100 border-2 border-green-500' :
                color === 'amber' ? 'bg-amber-100 border-2 border-amber-500' :
                'bg-red-100 border-2 border-red-500'
              }`}>
                {apro.estado === 'aprobado' ? (
                  <CheckCircle className={`w-6 h-6 ${color === 'green' ? 'text-green-600' : 'text-amber-600'}`} />
                ) : (
                  <AlertCircle className={`w-6 h-6 ${color === 'amber' ? 'text-amber-600' : 'text-red-600'}`} />
                )}
              </div>

              {/* Contenido */}
              <div className="flex-1 pb-8">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Badge className={
                        color === 'green' ? 'bg-green-100 text-green-700' :
                        color === 'amber' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }>
                        Nivel {apro.nivel}
                      </Badge>
                      <p className="font-medium text-gray-900 mt-1">{apro.aprobadorNombre}</p>
                      <p className="text-sm text-gray-600">{apro.aprobadorCargo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {new Date(apro.fechaAprobacion).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(apro.fechaAprobacion).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {apro.observaciones && (
                    <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {apro.observaciones}
                      </p>
                    </div>
                  )}

                  {apro.requiereAjustes && apro.ajustesSolicitados && (
                    <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                      <p className="text-xs font-medium text-red-900 mb-1">
                        AJUSTES SOLICITADOS:
                      </p>
                      <p className="text-xs text-red-800 whitespace-pre-wrap">
                        {apro.ajustesSolicitados}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DistribucionHoras({ 
  docencia, 
  investigacion, 
  extension, 
  administrativo, 
  total 
}: {
  docencia: number;
  investigacion: number;
  extension: number;
  administrativo: number;
  total: number;
}) {
  const componentes = [
    { nombre: 'Docencia', horas: docencia, color: 'blue', porcentaje: (docencia / total) * 100 },
    { nombre: 'Investigación', horas: investigacion, color: 'purple', porcentaje: (investigacion / total) * 100 },
    { nombre: 'Extensión', horas: extension, color: 'green', porcentaje: (extension / total) * 100 },
    { nombre: 'Académico-Administrativo', horas: administrativo, color: 'amber', porcentaje: (administrativo / total) * 100 }
  ];

  return (
    <div className="space-y-4">
      {componentes.map(comp => (
        <div key={comp.nombre}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{comp.nombre}</span>
            <div className="text-sm">
              <span className="font-bold text-gray-900">{comp.horas}h</span>
              <span className="text-gray-500 ml-1">({comp.porcentaje.toFixed(1)}%)</span>
            </div>
          </div>
          <Progress value={comp.porcentaje} className="h-3" />
        </div>
      ))}
    </div>
  );
}

function ListaActividadesDetallada({ actividades }: { actividades: any[] }) {
  if (!actividades || actividades.length === 0) {
    return <p className="text-gray-500 text-center py-4">No hay actividades registradas</p>;
  }

  const componentes = ['docencia', 'investigacion', 'extension', 'academico-administrativo'];

  return (
    <div className="space-y-6">
      {componentes.map(comp => {
        const acts = actividades.filter(a => a.componente === comp);
        if (acts.length === 0) return null;

        return (
          <div key={comp}>
            <h4 className="font-medium text-gray-900 mb-3 capitalize">
              {comp.replace('-', ' ')} ({acts.length} actividades)
            </h4>
            <div className="space-y-3">
              {acts.map(act => (
                <div 
                  key={act.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{act.codigo}</Badge>
                        <span className="font-medium text-sm">{act.nombre}</span>
                      </div>
                      <p className="text-xs text-gray-600">{act.descripcion}</p>
                      {act.observaciones && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          💡 {act.observaciones}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-gray-900">{act.horasAsignadas}h</p>
                      {act.requiereEvidencia && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs mt-1">
                          Requiere evidencia
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}