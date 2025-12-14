/**
 * ETAPA DE COMUNICACIÓN - RF009
 * Informes preliminares/finales, controversias y cierre de auditoría
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  MessageSquare, FileText, Send, CheckCircle2, AlertCircle,
  Download, Eye, Plus, Clock, User, Calendar
} from 'lucide-react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { ResponsiveModal } from '../../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';

interface Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
}

interface Informe {
  id: string;
  tipo: 'preliminar' | 'final' | 'ejecutivo';
  nombre: string;
  estado: 'borrador' | 'generado' | 'enviado' | 'aprobado';
  fechaGeneracion?: string;
  fechaEnvio?: string;
  destinatarios?: string[];
  archivo?: string;
}

interface Controversia {
  id: string;
  hallazgoId: string;
  hallazgoTitulo: string;
  argumentacion: string;
  fechaPresentacion: string;
  presentadoPor: string;
  estado: 'pendiente-analisis' | 'en-analisis' | 'resuelta';
  respuesta?: string;
  decision?: 'ratificado' | 'modificado' | 'anulado';
}

interface ComunicacionFormProps {
  auditoria: Auditoria;
  onVolver: () => void;
}

export function ComunicacionForm({ auditoria, onVolver }: ComunicacionFormProps) {
  const [informes, setInformes] = useState<Informe[]>([
    {
      id: '1',
      tipo: 'preliminar',
      nombre: 'Informe Preliminar de Auditoría',
      estado: 'enviado',
      fechaGeneracion: '2024-12-18',
      fechaEnvio: '2024-12-18',
      destinatarios: ['Director Financiero', 'Coordinador Contabilidad'],
      archivo: 'informe-preliminar-aud-2024-001.pdf'
    },
    {
      id: '2',
      tipo: 'final',
      nombre: 'Informe Final de Auditoría',
      estado: 'borrador',
      fechaGeneracion: '2024-12-20',
      archivo: 'informe-final-aud-2024-001.pdf'
    }
  ]);

  const [controversias, setControversias] = useState<Controversia[]>([
    {
      id: '1',
      hallazgoId: 'HAL-2024-001',
      hallazgoTitulo: 'Incumplimiento en conciliaciones bancarias',
      argumentacion: 'Durante los meses mencionados se presentó una situación excepcional debido a la migración del sistema bancario. Las conciliaciones se realizaron posteriormente con el debido respaldo documental.',
      fechaPresentacion: '2024-12-19',
      presentadoPor: 'Director Financiero - Juan Carlos Pérez',
      estado: 'resuelta',
      respuesta: 'Se acepta la argumentación parcialmente. Si bien la migración del sistema justifica el retraso, se evidencia falta de comunicación formal sobre el aplazamiento. El hallazgo se modifica a "Observación" con recomendación de mejora en los canales de comunicación.',
      decision: 'modificado'
    },
    {
      id: '2',
      hallazgoId: 'HAL-2024-002',
      hallazgoTitulo: 'Falta de segregación de funciones',
      argumentacion: 'Esta situación es temporal debido a la vacancia del cargo de Coordinador de Pagos. Ya se encuentra en proceso de selección un nuevo funcionario.',
      fechaPresentacion: '2024-12-20',
      presentadoPor: 'Director Financiero - Juan Carlos Pérez',
      estado: 'en-analisis'
    }
  ]);

  const [modalNuevaControversia, setModalNuevaControversia] = useState(false);
  const [controversiaSeleccionada, setControversiaSeleccionada] = useState<Controversia | null>(null);
  const [modalRespuesta, setModalRespuesta] = useState(false);
  const [respuestaControversia, setRespuestaControversia] = useState('');
  const [decisionControversia, setDecisionControversia] = useState<'ratificado' | 'modificado' | 'anulado'>('ratificado');

  const handleGenerarInforme = (tipo: 'final' | 'ejecutivo') => {
    const nuevoInforme: Informe = {
      id: Date.now().toString(),
      tipo,
      nombre: tipo === 'final' ? 'Informe Final de Auditoría' : 'Informe Ejecutivo para Dirección',
      estado: 'generado',
      fechaGeneracion: new Date().toISOString().split('T')[0],
      archivo: `informe-${tipo}-${auditoria.codigo.toLowerCase()}.pdf`
    };

    setInformes([...informes, nuevoInforme]);
    toast.success(`Informe ${tipo === 'final' ? 'Final' : 'Ejecutivo'} generado exitosamente`);
  };

  const handleEnviarInforme = (informeId: string) => {
    const updated = informes.map(inf =>
      inf.id === informeId
        ? {
            ...inf,
            estado: 'enviado' as const,
            fechaEnvio: new Date().toISOString().split('T')[0],
            destinatarios: ['Director Financiero', 'Dirección Nacional ESAP', 'Jefe OTIC']
          }
        : inf
    );
    setInformes(updated);
    toast.success('Informe enviado a los responsables');
  };

  const handleResolverControversia = () => {
    if (!controversiaSeleccionada || !respuestaControversia) {
      toast.error('Completa la respuesta y decisión');
      return;
    }

    const updated = controversias.map(c =>
      c.id === controversiaSeleccionada.id
        ? {
            ...c,
            estado: 'resuelta' as const,
            respuesta: respuestaControversia,
            decision: decisionControversia
          }
        : c
    );
    setControversias(updated);
    toast.success('Controversia resuelta exitosamente');
    setModalRespuesta(false);
    setControversiaSeleccionada(null);
    setRespuestaControversia('');
  };

  const getEstadoInformeColor = (estado: string) => {
    switch (estado) {
      case 'aprobado': return '#10B981';
      case 'enviado': return '#3B82F6';
      case 'generado': return '#F59E0B';
      case 'borrador': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getEstadoInformeLabel = (estado: string) => {
    switch (estado) {
      case 'aprobado': return 'Aprobado';
      case 'enviado': return 'Enviado';
      case 'generado': return 'Generado';
      case 'borrador': return 'Borrador';
      default: return estado;
    }
  };

  const getEstadoControversiaColor = (estado: string) => {
    switch (estado) {
      case 'resuelta': return '#10B981';
      case 'en-analisis': return '#3B82F6';
      case 'pendiente-analisis': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'ratificado': return '#EF4444';
      case 'modificado': return '#F59E0B';
      case 'anulado': return '#10B981';
      default: return '#6B7280';
    }
  };

  const porcentajeCompletado = Math.round(
    ((informes.filter(i => i.estado === 'enviado' || i.estado === 'aprobado').length / 3) * 50 +
      (controversias.filter(c => c.estado === 'resuelta').length / Math.max(controversias.length, 1)) * 50)
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl" style={{ background: '#D1FAE5' }}>
            <MessageSquare className="w-6 h-6" style={{ color: '#10B981' }} />
          </div>
          <div>
            <h2 className="text-xl font-black" style={{ color: '#1F2937' }}>
              Etapa de Comunicación
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {auditoria.codigo} - {auditoria.nombre}
            </p>
          </div>
        </div>
      </div>

      {/* PROGRESO DE LA ETAPA */}
      <motion.div
        className="p-6 rounded-2xl border-2"
        style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold" style={{ color: '#1F2937' }}>
            Progreso de la Etapa
          </h3>
          <span className="text-2xl font-black" style={{ color: '#10B981' }}>
            {porcentajeCompletado}%
          </span>
        </div>
        <div className="h-4 rounded-full" style={{ background: '#E5E7EB' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ background: '#10B981', width: `${porcentajeCompletado}%` }}
          />
        </div>
        <div className="mt-3 text-sm" style={{ color: '#6B7280' }}>
          {informes.filter(i => i.estado === 'enviado' || i.estado === 'aprobado').length} de 3 informes completados
          • {controversias.filter(c => c.estado === 'resuelta').length} de {controversias.length} controversias resueltas
        </div>
      </motion.div>

      {/* INFORMES */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black" style={{ color: '#1F2937' }}>
              Informes de Auditoría
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Generación y envío de informes preliminares, finales y ejecutivos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {informes.map((informe) => (
            <motion.div
              key={informe.id}
              className="p-5 rounded-xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" style={{ color: '#10B981' }} />
                    <span className="text-xs font-bold" style={{ color: '#6B7280' }}>
                      {informe.tipo.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm mb-2" style={{ color: '#1F2937' }}>
                    {informe.nombre}
                  </h4>
                  <Badge
                    style={{
                      background: `${getEstadoInformeColor(informe.estado)}20`,
                      color: getEstadoInformeColor(informe.estado)
                    }}
                  >
                    {getEstadoInformeLabel(informe.estado)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1 mb-4 text-xs" style={{ color: '#6B7280' }}>
                {informe.fechaGeneracion && (
                  <div>
                    <span className="font-semibold">Generado:</span>{' '}
                    {new Date(informe.fechaGeneracion).toLocaleDateString('es-CO')}
                  </div>
                )}
                {informe.fechaEnvio && (
                  <div>
                    <span className="font-semibold">Enviado:</span>{' '}
                    {new Date(informe.fechaEnvio).toLocaleDateString('es-CO')}
                  </div>
                )}
                {informe.destinatarios && informe.destinatarios.length > 0 && (
                  <div>
                    <span className="font-semibold">Destinatarios:</span>
                    <div className="mt-1 space-y-1">
                      {informe.destinatarios.map((dest, idx) => (
                        <div key={idx} className="text-xs">• {dest}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="w-4 h-4 mr-1" />
                  Ver
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="w-4 h-4 mr-1" />
                  Descargar
                </Button>
              </div>

              {informe.estado === 'generado' && (
                <Button
                  size="sm"
                  className="w-full mt-2"
                  style={{ background: '#10B981', color: '#FFFFFF' }}
                  onClick={() => handleEnviarInforme(informe.id)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Informe
                </Button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Botones generar informes faltantes */}
        <div className="flex gap-3">
          {!informes.find(i => i.tipo === 'final') && (
            <Button
              onClick={() => handleGenerarInforme('final')}
              style={{ background: '#10B981', color: '#FFFFFF' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Generar Informe Final
            </Button>
          )}
          {!informes.find(i => i.tipo === 'ejecutivo') && (
            <Button
              onClick={() => handleGenerarInforme('ejecutivo')}
              style={{ background: '#3B82F6', color: '#FFFFFF' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Generar Informe Ejecutivo
            </Button>
          )}
        </div>
      </div>

      {/* CONTROVERSIAS */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black" style={{ color: '#1F2937' }}>
              Controversias de Hallazgos
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Gestión de argumentaciones del área auditada
            </p>
          </div>
        </div>

        {controversias.length === 0 ? (
          <motion.div
            className="p-8 rounded-xl border-2 text-center"
            style={{ background: '#F0FDF4', borderColor: '#10B981' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#10B981' }} />
            <h4 className="font-bold mb-2" style={{ color: '#166534' }}>
              No hay controversias presentadas
            </h4>
            <p className="text-sm" style={{ color: '#15803D' }}>
              El área auditada no ha presentado argumentaciones sobre los hallazgos
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {controversias.map((controversia) => (
              <motion.div
                key={controversia.id}
                className="p-5 rounded-xl border-2"
                style={{
                  background: controversia.estado === 'resuelta' ? '#F0FDF4' : '#FFFFFF',
                  borderColor: controversia.estado === 'resuelta' ? '#10B981' : '#E5E7EB'
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold" style={{ color: '#6B7280' }}>
                        {controversia.hallazgoId}
                      </span>
                      <Badge
                        style={{
                          background: `${getEstadoControversiaColor(controversia.estado)}20`,
                          color: getEstadoControversiaColor(controversia.estado)
                        }}
                      >
                        {controversia.estado === 'resuelta' ? 'Resuelta' :
                         controversia.estado === 'en-analisis' ? 'En Análisis' : 'Pendiente'}
                      </Badge>
                      {controversia.decision && (
                        <Badge
                          style={{
                            background: `${getDecisionColor(controversia.decision)}20`,
                            color: getDecisionColor(controversia.decision)
                          }}
                        >
                          {controversia.decision === 'ratificado' ? 'Ratificado' :
                           controversia.decision === 'modificado' ? 'Modificado' : 'Anulado'}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-bold mb-3" style={{ color: '#1F2937' }}>
                      {controversia.hallazgoTitulo}
                    </h4>

                    <div className="mb-3">
                      <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                        Argumentación del Área Auditada:
                      </div>
                      <div
                        className="p-3 rounded-lg text-sm"
                        style={{ background: '#FEF3C7', color: '#78350F' }}
                      >
                        {controversia.argumentacion}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs mb-3" style={{ color: '#6B7280' }}>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{controversia.presentadoPor}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(controversia.fechaPresentacion).toLocaleDateString('es-CO')}</span>
                      </div>
                    </div>

                    {controversia.respuesta && (
                      <div>
                        <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                          Respuesta del Equipo Auditor:
                        </div>
                        <div
                          className="p-3 rounded-lg text-sm"
                          style={{ background: '#DBEAFE', color: '#1E40AF' }}
                        >
                          {controversia.respuesta}
                        </div>
                      </div>
                    )}
                  </div>

                  {controversia.estado === 'resuelta' && (
                    <CheckCircle2 className="w-6 h-6 ml-4" style={{ color: '#10B981' }} />
                  )}
                </div>

                {controversia.estado !== 'resuelta' && (
                  <div className="pt-4 border-t-2" style={{ borderColor: '#E5E7EB' }}>
                    <Button
                      size="sm"
                      style={{ background: '#3B82F6', color: '#FFFFFF' }}
                      onClick={() => {
                        setControversiaSeleccionada(controversia);
                        setModalRespuesta(true);
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Responder y Resolver
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL RESPONDER CONTROVERSIA */}
      <ResponsiveModal
        isOpen={modalRespuesta}
        onClose={() => {
          setModalRespuesta(false);
          setControversiaSeleccionada(null);
          setRespuestaControversia('');
        }}
        title="Responder Controversia"
        subtitle={`Hallazgo: ${controversiaSeleccionada?.hallazgoId}`}
        icon={<MessageSquare className="w-6 h-6" style={{ color: '#3B82F6' }} />}
        maxWidth="2xl"
        footer={
          <div className="flex items-center gap-3">
            <button
              onClick={handleResolverControversia}
              className="flex-1 px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#10B981', color: '#FFFFFF' }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2 inline" />
              Resolver Controversia
            </button>
            <button
              onClick={() => {
                setModalRespuesta(false);
                setControversiaSeleccionada(null);
                setRespuestaControversia('');
              }}
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#F3F4F6', color: '#4B5563' }}
            >
              Cancelar
            </button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          {controversiaSeleccionada && (
            <>
              <div className="p-4 rounded-xl" style={{ background: '#FEF3C7' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: '#92400E' }}>
                  Argumentación del Área Auditada:
                </div>
                <p className="text-sm" style={{ color: '#78350F' }}>
                  {controversiaSeleccionada.argumentacion}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Respuesta del Equipo Auditor *
                </label>
                <textarea
                  rows={6}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#3B82F6]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={respuestaControversia}
                  onChange={(e) => setRespuestaControversia(e.target.value)}
                  placeholder="Analiza la argumentación y proporciona una respuesta fundamentada..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Decisión sobre el Hallazgo *
                </label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#3B82F6]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={decisionControversia}
                  onChange={(e) => setDecisionControversia(e.target.value as any)}
                >
                  <option value="ratificado">Ratificado - Se mantiene el hallazgo original</option>
                  <option value="modificado">Modificado - Se ajusta el hallazgo</option>
                  <option value="anulado">Anulado - Se elimina el hallazgo</option>
                </select>
              </div>
            </>
          )}
        </div>
      </ResponsiveModal>
    </div>
  );
}
