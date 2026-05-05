/**
 * WIZARD DE ENVÍO DE ALERTAS - WORLD CLASS ✨
 * Asistente paso a paso para envío masivo de alertas de términos
 * 
 * PASOS:
 * 1. Selección de términos a alertar
 * 2. Configuración del mensaje
 * 3. Vista previa y confirmación
 * 4. Resultado del envío
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Check, AlertTriangle, Mail, Send, Eye, Clock,
  ChevronRight, ChevronLeft, FileText, User, Bell,
  CheckCircle2, XCircle, Loader2, Calendar, Target,
  Zap, Scale, Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ============================================================================
// INTERFACES
// ============================================================================

interface Termino {
  id: string;
  procesoId: string;
  numeroProceso: string;
  denunciado: string;
  actuacion: string;
  responsable: string;
  emailResponsable: string;
  fechaInicio: string;
  diasHabiles: number;
  fechaVencimiento: string;
  diasRestantes: number;
  estado: 'pendiente' | 'proximo_vencer' | 'vencido' | 'cumplido' | 'suspendido';
  alertaEnviada: boolean;
  etapaProcesal: string;
}

interface AlertaEnviada {
  terminoId: string;
  numeroProceso: string;
  destinatario: string;
  estado: 'exitosa' | 'fallida';
  mensaje?: string;
}

interface WizardEnviarAlertasProps {
  isOpen: boolean;
  onClose: () => void;
  terminos: Termino[];
  onEnviarAlertas: (terminosIds: string[], mensaje: string, asunto: string) => Promise<void>;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function WizardEnviarAlertas({
  isOpen,
  onClose,
  terminos,
  onEnviarAlertas
}: WizardEnviarAlertasProps) {
  // Estados del wizard
  const [pasoActual, setPasoActual] = useState(1);
  const [terminosSeleccionados, setTerminosSeleccionados] = useState<Set<string>>(new Set());
  const [asuntoEmail, setAsuntoEmail] = useState('Alerta de Término Procesal - ESAP OCID');
  const [mensajeEmail, setMensajeEmail] = useState(
    'Estimado(a) {responsable},\n\n' +
    'Le informamos que el término del proceso {numeroProceso} está próximo a vencer.\n\n' +
    'Detalles:\n' +
    '- Denunciado: {denunciado}\n' +
    '- Actuación: {actuacion}\n' +
    '- Fecha de vencimiento: {fechaVencimiento}\n' +
    '- Días restantes: {diasRestantes}\n\n' +
    'Por favor, tome las acciones necesarias.\n\n' +
    'Saludos cordiales,\n' +
    'Oficina de Control Interno Disciplinario\n' +
    'ESAP'
  );
  const [enviando, setEnviando] = useState(false);
  const [resultadoEnvio, setResultadoEnvio] = useState<AlertaEnviada[]>([]);

  // Filtrar términos que requieren alerta
  const terminosParaAlerta = terminos.filter(
    t => !t.alertaEnviada && 
         (t.estado === 'proximo_vencer' || (t.estado === 'pendiente' && t.diasRestantes <= 5))
  );

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleToggleTermino = (terminoId: string) => {
    const nuevosSeleccionados = new Set(terminosSeleccionados);
    if (nuevosSeleccionados.has(terminoId)) {
      nuevosSeleccionados.delete(terminoId);
    } else {
      nuevosSeleccionados.add(terminoId);
    }
    setTerminosSeleccionados(nuevosSeleccionados);
  };

  const handleSeleccionarTodos = () => {
    if (terminosSeleccionados.size === terminosParaAlerta.length) {
      setTerminosSeleccionados(new Set());
    } else {
      setTerminosSeleccionados(new Set(terminosParaAlerta.map(t => t.id)));
    }
  };

  const handleSiguiente = () => {
    // Validaciones por paso
    if (pasoActual === 1) {
      if (terminosSeleccionados.size === 0) {
        toast.error('Selecciona al menos un término para enviar alerta');
        return;
      }
    }

    if (pasoActual === 2) {
      if (!asuntoEmail.trim()) {
        toast.error('El asunto del email es obligatorio');
        return;
      }
      if (!mensajeEmail.trim()) {
        toast.error('El mensaje del email es obligatorio');
        return;
      }
    }

    if (pasoActual < 4) {
      setPasoActual(pasoActual + 1);
    }
  };

  const handleAnterior = () => {
    if (pasoActual > 1) {
      setPasoActual(pasoActual - 1);
    }
  };

  const handleEnviar = async () => {
    setEnviando(true);
    setPasoActual(4);

    try {
      // Simular envío de alertas
      const resultados: AlertaEnviada[] = [];
      
      for (const terminoId of Array.from(terminosSeleccionados)) {
        const termino = terminosParaAlerta.find(t => t.id === terminoId);
        if (!termino) continue;

        // Simular delay de envío
        await new Promise(resolve => setTimeout(resolve, 300));

        // 95% de éxito
        const exito = Math.random() > 0.05;

        resultados.push({
          terminoId: termino.id,
          numeroProceso: termino.numeroProceso,
          destinatario: termino.emailResponsable,
          estado: exito ? 'exitosa' : 'fallida',
          mensaje: exito ? 'Alerta enviada correctamente' : 'Error al enviar email'
        });
      }

      setResultadoEnvio(resultados);

      // Llamar al callback
      await onEnviarAlertas(
        Array.from(terminosSeleccionados),
        mensajeEmail,
        asuntoEmail
      );

      const exitosas = resultados.filter(r => r.estado === 'exitosa').length;
      const fallidas = resultados.filter(r => r.estado === 'fallida').length;

      toast.success(`Alertas enviadas: ${exitosas} exitosas, ${fallidas} fallidas`);

    } catch (error) {
      toast.error('Error al enviar alertas');
      console.error(error);
    } finally {
      setEnviando(false);
    }
  };

  const handleCerrar = () => {
    setPasoActual(1);
    setTerminosSeleccionados(new Set());
    setResultadoEnvio([]);
    setEnviando(false);
    onClose();
  };

  const reemplazarVariables = (texto: string, termino: Termino) => {
    return texto
      .replace('{responsable}', termino.responsable)
      .replace('{numeroProceso}', termino.numeroProceso)
      .replace('{denunciado}', termino.denunciado)
      .replace('{actuacion}', termino.actuacion)
      .replace('{fechaVencimiento}', new Date(termino.fechaVencimiento).toLocaleDateString('es-CO'))
      .replace('{diasRestantes}', termino.diasRestantes.toString());
  };

  if (!isOpen) return null;

  // ============================================================================
  // RENDER POR PASO
  // ============================================================================

  const renderPaso1 = () => (
    <div className="space-y-4">
      {/* Header del paso */}
      <div className="flex items-center gap-3 pb-4 border-b-2" style={{ borderColor: '#E5E7EB' }}>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
        >
          <Bell className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>
            Seleccionar Términos
          </h3>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Marca los términos para los que deseas enviar alertas
          </p>
        </div>
      </div>

      {/* Info de términos disponibles */}
      <div className="p-4 rounded-lg" style={{ background: '#EFF6FF', border: '2px solid #DBEAFE' }}>
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#2563EB' }} />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: '#1E40AF' }}>
              {terminosParaAlerta.length} términos requieren alerta
            </p>
            <p className="text-xs" style={{ color: '#1E40AF' }}>
              Términos próximos a vencer o con menos de 5 días restantes que no tienen alerta enviada
            </p>
          </div>
        </div>
      </div>

      {/* Botón seleccionar todos */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleSeleccionarTodos}
          className="text-sm font-semibold hover:underline"
          style={{ color: '#003DA5' }}
        >
          {terminosSeleccionados.size === terminosParaAlerta.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
        </button>
        <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>
          {terminosSeleccionados.size} seleccionados
        </span>
      </div>

      {/* Lista de términos */}
      <div className="max-h-[400px] overflow-y-auto space-y-2">
        {terminosParaAlerta.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#10B981' }} />
            <p className="font-semibold" style={{ color: '#6B7280' }}>
              No hay términos que requieran alerta
            </p>
            <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
              Todos los términos están al día o ya tienen alertas enviadas
            </p>
          </div>
        ) : (
          terminosParaAlerta.map((termino) => (
            <motion.div
              key={termino.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                terminosSeleccionados.has(termino.id) ? 'shadow-md' : ''
              }`}
              style={{
                borderColor: terminosSeleccionados.has(termino.id) ? '#003DA5' : '#E5E7EB',
                background: terminosSeleccionados.has(termino.id) ? '#EFF6FF' : '#FFFFFF'
              }}
              onClick={() => handleToggleTermino(termino.id)}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div
                  className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    borderColor: terminosSeleccionados.has(termino.id) ? '#003DA5' : '#D1D5DB',
                    background: terminosSeleccionados.has(termino.id) ? '#003DA5' : '#FFFFFF'
                  }}
                >
                  {terminosSeleccionados.has(termino.id) && (
                    <Check className="w-3.5 h-3.5 text-white" />
                  )}
                </div>

                {/* Info del término */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Scale className="w-3.5 h-3.5" style={{ color: '#003DA5' }} />
                    <span className="font-mono font-bold text-xs" style={{ color: '#003DA5' }}>
                      {termino.numeroProceso}
                    </span>
                    <div
                      className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{
                        background: termino.diasRestantes <= 2 ? '#FEE2E2' : '#FEF3C7',
                        color: termino.diasRestantes <= 2 ? '#991B1B' : '#92400E'
                      }}
                    >
                      {termino.diasRestantes} días
                    </div>
                  </div>

                  <p className="font-semibold text-sm mb-1" style={{ color: '#1F2937' }}>
                    {termino.denunciado}
                  </p>
                  <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
                    {termino.actuacion}
                  </p>

                  <div className="flex items-center gap-3 text-xs" style={{ color: '#6B7280' }}>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{termino.responsable}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span>{termino.emailResponsable}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  const renderPaso2 = () => (
    <div className="space-y-4">
      {/* Header del paso */}
      <div className="flex items-center gap-3 pb-4 border-b-2" style={{ borderColor: '#E5E7EB' }}>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
        >
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>
            Configurar Mensaje
          </h3>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Personaliza el asunto y contenido del email de alerta
          </p>
        </div>
      </div>

      {/* Variables disponibles */}
      <div className="p-4 rounded-lg" style={{ background: '#FEF3C7', border: '2px solid #FDE68A' }}>
        <p className="text-sm font-semibold mb-2" style={{ color: '#92400E' }}>
          Variables disponibles:
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: '#92400E' }}>
          <code>{'{responsable}'}</code>
          <code>{'{numeroProceso}'}</code>
          <code>{'{denunciado}'}</code>
          <code>{'{actuacion}'}</code>
          <code>{'{fechaVencimiento}'}</code>
          <code>{'{diasRestantes}'}</code>
        </div>
      </div>

      {/* Asunto del email */}
      <div>
        <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
          Asunto del Email
        </label>
        <input
          type="text"
          value={asuntoEmail}
          onChange={(e) => setAsuntoEmail(e.target.value)}
          placeholder="Ingrese el asunto del email"
          className="w-full px-4 py-2.5 rounded-lg border-2 focus:outline-none focus:border-[#003DA5] transition-colors text-sm"
          style={{ borderColor: '#E5E7EB' }}
        />
      </div>

      {/* Mensaje del email */}
      <div>
        <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
          Contenido del Mensaje
        </label>
        <textarea
          value={mensajeEmail}
          onChange={(e) => setMensajeEmail(e.target.value)}
          placeholder="Ingrese el mensaje del email"
          rows={12}
          className="w-full px-4 py-2.5 rounded-lg border-2 focus:outline-none focus:border-[#003DA5] transition-colors text-sm font-mono resize-none"
          style={{ borderColor: '#E5E7EB' }}
        />
        <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
          Las variables serán reemplazadas automáticamente por los datos de cada término
        </p>
      </div>
    </div>
  );

  const renderPaso3 = () => {
    const terminoEjemplo = terminosParaAlerta.find(t => terminosSeleccionados.has(t.id));

    return (
      <div className="space-y-4">
        {/* Header del paso */}
        <div className="flex items-center gap-3 pb-4 border-b-2" style={{ borderColor: '#E5E7EB' }}>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
          >
            <Eye className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>
              Vista Previa y Confirmación
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Revisa la información antes de enviar las alertas
            </p>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-lg" style={{ background: '#EFF6FF', border: '2px solid #DBEAFE' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#1E40AF' }}>
              Alertas a enviar
            </p>
            <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>
              {terminosSeleccionados.size}
            </p>
          </div>

          <div className="p-4 rounded-lg" style={{ background: '#ECFDF5', border: '2px solid #D1FAE5' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#065F46' }}>
              Destinatarios
            </p>
            <p className="text-2xl font-bold" style={{ color: '#10B981' }}>
              {new Set(
                Array.from(terminosSeleccionados)
                  .map(id => terminosParaAlerta.find(t => t.id === id)?.emailResponsable)
                  .filter(Boolean)
              ).size}
            </p>
          </div>

          <div className="p-4 rounded-lg" style={{ background: '#FEF3C7', border: '2px solid #FDE68A' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#92400E' }}>
              Tiempo estimado
            </p>
            <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>
              {Math.ceil(terminosSeleccionados.size * 0.3)}s
            </p>
          </div>
        </div>

        {/* Vista previa del email */}
        {terminoEjemplo && (
          <div>
            <p className="text-sm font-bold mb-2" style={{ color: '#374151' }}>
              Vista Previa del Email (ejemplo):
            </p>

            <div className="rounded-lg border-2 overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
              {/* Header del email */}
              <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}>
                <p className="text-sm font-bold text-white">
                  ESAP - Oficina de Control Interno Disciplinario
                </p>
              </div>

              {/* Asunto */}
              <div className="px-4 py-3 border-b-2" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                  Asunto:
                </p>
                <p className="text-sm font-bold" style={{ color: '#1F2937' }}>
                  {asuntoEmail}
                </p>
              </div>

              {/* Destinatario */}
              <div className="px-4 py-3 border-b-2" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                  Para:
                </p>
                <p className="text-sm" style={{ color: '#1F2937' }}>
                  {terminoEjemplo.emailResponsable} ({terminoEjemplo.responsable})
                </p>
              </div>

              {/* Contenido */}
              <div className="px-4 py-4" style={{ background: '#FFFFFF' }}>
                <pre
                  className="text-sm whitespace-pre-wrap font-sans"
                  style={{ color: '#1F2937' }}
                >
                  {reemplazarVariables(mensajeEmail, terminoEjemplo)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Advertencia */}
        <div className="p-4 rounded-lg" style={{ background: '#FEF3C7', border: '2px solid #FDE68A' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#92400E' }}>
                Antes de continuar
              </p>
              <p className="text-xs" style={{ color: '#92400E' }}>
                Verifica que la información sea correcta. Las alertas se enviarán inmediatamente y no se pueden deshacer.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPaso4 = () => {
    if (enviando) {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" style={{ color: '#003DA5' }} />
          <p className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>
            Enviando alertas...
          </p>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Por favor espera mientras se envían los emails
          </p>
          <div className="mt-4">
            <div className="w-64 h-2 mx-auto rounded-full" style={{ background: '#E5E7EB' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: terminosSeleccionados.size * 0.3 }}
              />
            </div>
          </div>
        </div>
      );
    }

    const exitosas = resultadoEnvio.filter(r => r.estado === 'exitosa').length;
    const fallidas = resultadoEnvio.filter(r => r.estado === 'fallida').length;

    return (
      <div className="space-y-4">
        {/* Header del paso */}
        <div className="flex items-center gap-3 pb-4 border-b-2" style={{ borderColor: '#E5E7EB' }}>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: exitosas > 0 ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' }}
          >
            {exitosas > 0 ? (
              <CheckCircle2 className="w-6 h-6 text-white" />
            ) : (
              <XCircle className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#1F2937' }}>
              {exitosas === resultadoEnvio.length ? '¡Alertas Enviadas!' : 'Envío Completado con Errores'}
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {exitosas} exitosas, {fallidas} fallidas
            </p>
          </div>
        </div>

        {/* Resumen de resultados */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-lg" style={{ background: '#ECFDF5', border: '2px solid #D1FAE5' }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: '#10B981' }} />
              <p className="text-sm font-semibold" style={{ color: '#065F46' }}>
                Exitosas
              </p>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#10B981' }}>
              {exitosas}
            </p>
          </div>

          <div className="p-4 rounded-lg" style={{ background: '#FEE2E2', border: '2px solid #FECACA' }}>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5" style={{ color: '#DC2626' }} />
              <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>
                Fallidas
              </p>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#DC2626' }}>
              {fallidas}
            </p>
          </div>
        </div>

        {/* Detalle de resultados */}
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: '#374151' }}>
            Detalle del Envío:
          </p>
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {resultadoEnvio.map((resultado) => (
              <div
                key={resultado.terminoId}
                className="p-3 rounded-lg border-2"
                style={{
                  borderColor: resultado.estado === 'exitosa' ? '#D1FAE5' : '#FECACA',
                  background: resultado.estado === 'exitosa' ? '#ECFDF5' : '#FEE2E2'
                }}
              >
                <div className="flex items-start gap-3">
                  {resultado.estado === 'exitosa' ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#10B981' }} />
                  ) : (
                    <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
                  )}
                  <div className="flex-1">
                    <p className="font-mono font-bold text-xs mb-1" style={{
                      color: resultado.estado === 'exitosa' ? '#065F46' : '#991B1B'
                    }}>
                      {resultado.numeroProceso}
                    </p>
                    <p className="text-xs" style={{
                      color: resultado.estado === 'exitosa' ? '#065F46' : '#991B1B'
                    }}>
                      {resultado.destinatario}
                    </p>
                    {resultado.mensaje && (
                      <p className="text-xs mt-1" style={{
                        color: resultado.estado === 'exitosa' ? '#059669' : '#B91C1C'
                      }}>
                        {resultado.mensaje}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={pasoActual !== 4 ? handleCerrar : undefined}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del wizard */}
              <div className="px-6 py-4" style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-white" />
                    <h2 className="text-xl font-bold text-white">
                      Envío de Alertas Masivas
                    </h2>
                  </div>
                  {pasoActual !== 4 && !enviando && (
                    <button
                      onClick={handleCerrar}
                      className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-4 flex items-center gap-2">
                  {[1, 2, 3, 4].map((paso) => (
                    <div key={paso} className="flex-1">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          background: paso <= pasoActual ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)'
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Labels de pasos */}
                <div className="mt-2 flex items-center justify-between text-xs text-white/80">
                  <span className={pasoActual === 1 ? 'font-bold text-white' : ''}>1. Selección</span>
                  <span className={pasoActual === 2 ? 'font-bold text-white' : ''}>2. Mensaje</span>
                  <span className={pasoActual === 3 ? 'font-bold text-white' : ''}>3. Confirmación</span>
                  <span className={pasoActual === 4 ? 'font-bold text-white' : ''}>4. Resultado</span>
                </div>
              </div>

              {/* Contenido del wizard */}
              <div className="p-6 max-h-[600px] overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={pasoActual}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {pasoActual === 1 && renderPaso1()}
                    {pasoActual === 2 && renderPaso2()}
                    {pasoActual === 3 && renderPaso3()}
                    {pasoActual === 4 && renderPaso4()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer con botones de navegación */}
              <div className="px-6 py-4 border-t-2 flex items-center justify-between" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
                <div>
                  {pasoActual > 1 && pasoActual < 4 && !enviando && (
                    <button
                      onClick={handleAnterior}
                      className="px-4 py-2 rounded-lg font-semibold border-2 flex items-center gap-2 hover:bg-gray-100 transition-colors"
                      style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {pasoActual === 4 ? (
                    <button
                      onClick={handleCerrar}
                      className="px-6 py-2 rounded-lg font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-all"
                      style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
                    >
                      <Check className="w-4 h-4" />
                      Finalizar
                    </button>
                  ) : pasoActual === 3 ? (
                    <button
                      onClick={handleEnviar}
                      disabled={enviando}
                      className="px-6 py-2 rounded-lg font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                    >
                      <Send className="w-4 h-4" />
                      Enviar Alertas
                    </button>
                  ) : (
                    <button
                      onClick={handleSiguiente}
                      className="px-6 py-2 rounded-lg font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-all"
                      style={{ background: 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)' }}
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
