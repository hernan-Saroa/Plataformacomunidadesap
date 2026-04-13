/**
 * MODAL NUEVA ALERTA - TÉRMINOS Y ALERTAS ✨
 * Formulario para crear alertas manualmente
 * Diseño corporativo ESAP (SIGL v5.0)
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X, Bell, Mail, User, FileText, Calendar, Clock, Save, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

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

interface Alerta {
  terminoId: string;
  proceso: string;
  denunciado: string;
  tipo: 'email' | 'visual' | 'sistema';
  fechaEnvio: string;
  horaEnvio: string;
  destinatario: string;
  emailDestinatario: string;
  estado: 'enviada' | 'pendiente' | 'error';
  asunto: string;
  mensaje: string;
  intentos: number;
}

interface ModalNuevaAlertaProps {
  isOpen: boolean;
  onClose: () => void;
  terminos: Termino[];
  onCrear: (alerta: Alerta) => void;
}

export function ModalNuevaAlerta({ isOpen, onClose, terminos, onCrear }: ModalNuevaAlertaProps) {
  const [terminoSeleccionado, setTerminoSeleccionado] = useState('');
  const [tipo, setTipo] = useState<'email' | 'visual' | 'sistema'>('email');
  const [destinatario, setDestinatario] = useState('');
  const [emailDestinatario, setEmailDestinatario] = useState('');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSeleccionarTermino = (terminoId: string) => {
    const termino = terminos.find(t => t.id === terminoId);
    if (termino) {
      setTerminoSeleccionado(terminoId);
      setDestinatario(termino.responsable);
      setEmailDestinatario(termino.emailResponsable);
      setAsunto(`Alerta: Término ${termino.numeroProceso}`);
      setMensaje(`El término del proceso ${termino.numeroProceso} para ${termino.actuacion} vence el ${new Date(termino.fechaVencimiento).toLocaleDateString('es-CO')}.`);
    }
  };

  const handleCrear = async () => {
    // Validaciones
    if (!terminoSeleccionado) {
      toast.error('Debe seleccionar un término');
      return;
    }
    if (!destinatario.trim()) {
      toast.error('Destinatario requerido');
      return;
    }
    if (tipo === 'email' && !emailDestinatario.trim()) {
      toast.error('Email requerido para alertas por correo');
      return;
    }
    if (!asunto.trim()) {
      toast.error('Asunto requerido');
      return;
    }
    if (!mensaje.trim()) {
      toast.error('Mensaje requerido');
      return;
    }

    const termino = terminos.find(t => t.id === terminoSeleccionado);
    if (!termino) return;

    setEnviando(true);

    // Simular delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const ahora = new Date();
    const nuevaAlerta: Alerta = {
      terminoId: terminoSeleccionado,
      proceso: termino.numeroProceso,
      denunciado: termino.denunciado,
      tipo,
      fechaEnvio: ahora.toISOString().split('T')[0],
      horaEnvio: `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`,
      destinatario,
      emailDestinatario,
      estado: 'enviada',
      asunto,
      mensaje,
      intentos: 1
    };

    onCrear(nuevaAlerta);
    setEnviando(false);
    
    toast.success('Alerta creada y enviada', {
      description: `Se envió la alerta a ${destinatario}`
    });

    handleCerrar();
  };

  const handleCerrar = () => {
    setTerminoSeleccionado('');
    setTipo('email');
    setDestinatario('');
    setEmailDestinatario('');
    setAsunto('');
    setMensaje('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#FFFFFF', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="p-6 border-b-2" style={{ borderColor: '#E5E7EB', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
                <Bell className="w-6 h-6" style={{ color: 'white' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'white' }}>
                  Nueva Alerta Manual
                </h2>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Crear y enviar una alerta personalizada
                </p>
              </div>
            </div>
            <button
              onClick={handleCerrar}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" style={{ color: 'white' }} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <div className="space-y-4">
            {/* Selección de Término */}
            <div>
              <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                Seleccionar Término *
              </label>
              <select
                value={terminoSeleccionado}
                onChange={(e) => handleSeleccionarTermino(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                style={{ borderColor: '#E5E7EB' }}
              >
                <option value="">Seleccione un término...</option>
                {terminos.map(termino => (
                  <option key={termino.id} value={termino.id}>
                    {termino.numeroProceso} - {termino.denunciado} ({termino.diasRestantes} días restantes)
                  </option>
                ))}
              </select>
            </div>

            {terminoSeleccionado && (
              <>
                {/* Tipo de Alerta */}
                <div>
                  <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                    Tipo de Alerta *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setTipo('email')}
                      className="p-4 rounded-xl border-2 hover:shadow-md transition-all"
                      style={{
                        borderColor: tipo === 'email' ? '#2563EB' : '#E5E7EB',
                        background: tipo === 'email' ? '#EFF6FF' : '#FFFFFF'
                      }}
                    >
                      <Mail className="w-6 h-6 mx-auto mb-2" style={{ color: tipo === 'email' ? '#2563EB' : '#9CA3AF' }} />
                      <p className="text-sm font-semibold" style={{ color: tipo === 'email' ? '#1E40AF' : '#6B7280' }}>
                        Email
                      </p>
                    </button>

                    <button
                      onClick={() => setTipo('visual')}
                      className="p-4 rounded-xl border-2 hover:shadow-md transition-all"
                      style={{
                        borderColor: tipo === 'visual' ? '#F59E0B' : '#E5E7EB',
                        background: tipo === 'visual' ? '#FEF3C7' : '#FFFFFF'
                      }}
                    >
                      <Bell className="w-6 h-6 mx-auto mb-2" style={{ color: tipo === 'visual' ? '#F59E0B' : '#9CA3AF' }} />
                      <p className="text-sm font-semibold" style={{ color: tipo === 'visual' ? '#92400E' : '#6B7280' }}>
                        Visual
                      </p>
                    </button>

                    <button
                      onClick={() => setTipo('sistema')}
                      className="p-4 rounded-xl border-2 hover:shadow-md transition-all"
                      style={{
                        borderColor: tipo === 'sistema' ? '#6B7280' : '#E5E7EB',
                        background: tipo === 'sistema' ? '#F3F4F6' : '#FFFFFF'
                      }}
                    >
                      <AlertCircle className="w-6 h-6 mx-auto mb-2" style={{ color: tipo === 'sistema' ? '#6B7280' : '#9CA3AF' }} />
                      <p className="text-sm font-semibold" style={{ color: tipo === 'sistema' ? '#374151' : '#6B7280' }}>
                        Sistema
                      </p>
                    </button>
                  </div>
                </div>

                {/* Destinatario */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                      Destinatario *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                      <input
                        type="text"
                        value={destinatario}
                        onChange={(e) => setDestinatario(e.target.value)}
                        placeholder="Nombre del destinatario"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                        style={{ borderColor: '#E5E7EB' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                      Email {tipo === 'email' && '*'}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                      <input
                        type="email"
                        value={emailDestinatario}
                        onChange={(e) => setEmailDestinatario(e.target.value)}
                        placeholder="correo@esap.edu.co"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                        style={{ borderColor: '#E5E7EB' }}
                        disabled={tipo !== 'email'}
                      />
                    </div>
                  </div>
                </div>

                {/* Asunto */}
                <div>
                  <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                    Asunto *
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                    <input
                      type="text"
                      value={asunto}
                      onChange={(e) => setAsunto(e.target.value)}
                      placeholder="Asunto de la alerta"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors"
                      style={{ borderColor: '#E5E7EB' }}
                    />
                  </div>
                </div>

                {/* Mensaje */}
                <div>
                  <label className="block mb-2 text-sm font-bold" style={{ color: '#374151' }}>
                    Mensaje *
                  </label>
                  <textarea
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    placeholder="Contenido de la alerta..."
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors resize-none"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    {mensaje.length} caracteres
                  </p>
                </div>

                {/* Vista previa */}
                <div className="p-4 rounded-xl border-2" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
                  <p className="text-xs font-bold mb-3" style={{ color: '#6B7280' }}>
                    VISTA PREVIA
                  </p>
                  <div className="p-4 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                    <div className="flex items-center gap-2 mb-2">
                      {tipo === 'email' && <Mail className="w-4 h-4" style={{ color: '#2563EB' }} />}
                      {tipo === 'visual' && <Bell className="w-4 h-4" style={{ color: '#F59E0B' }} />}
                      {tipo === 'sistema' && <AlertCircle className="w-4 h-4" style={{ color: '#6B7280' }} />}
                      <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                        {tipo === 'email' ? 'Email' : tipo === 'visual' ? 'Visual' : 'Sistema'}
                      </span>
                    </div>
                    <p className="font-bold text-sm mb-2" style={{ color: '#1F2937' }}>
                      {asunto || 'Sin asunto'}
                    </p>
                    <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
                      {mensaje || 'Sin mensaje'}
                    </p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                      Para: {destinatario || 'Sin destinatario'} {emailDestinatario && `(${emailDestinatario})`}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t-2" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleCerrar}
              className="px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
              disabled={enviando}
            >
              Cancelar
            </button>
            <button
              onClick={handleCrear}
              disabled={enviando || !terminoSeleccionado}
              className="px-6 py-3 rounded-xl font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
            >
              {enviando ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Clock className="w-4 h-4" />
                  </motion.div>
                  Enviando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Crear y Enviar
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
