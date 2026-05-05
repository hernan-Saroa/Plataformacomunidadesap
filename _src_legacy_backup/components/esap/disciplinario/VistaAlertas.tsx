/**
 * VISTA ALERTAS - TÉRMINOS Y ALERTAS ✨
 * Historial de alertas enviadas por el sistema
 * Diseño corporativo ESAP (SIGL v5.0)
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, Mail, CheckCircle, XCircle, Clock, AlertCircle,
  User, FileText, Calendar, Search, Filter, Download,
  RefreshCw, TrendingUp, Eye, Plus
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ModalNuevaAlerta } from './ModalNuevaAlerta';

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
  id: string;
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

interface VistaAlertasProps {
  terminos: Termino[];
  onCrearAlerta?: (alerta: Omit<Alerta, 'id'>) => void;
}

// Mock de alertas generadas
const generarAlertasMock = (terminos: Termino[]): Alerta[] => {
  const alertas: Alerta[] = [];
  
  terminos.forEach((termino, index) => {
    if (termino.alertaEnviada) {
      // Generar 1-3 alertas por término
      const cantidadAlertas = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < cantidadAlertas; i++) {
        const diasAtras = Math.floor(Math.random() * 10) + 1;
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - diasAtras);
        
        const estados: ('enviada' | 'error')[] = ['enviada', 'enviada', 'enviada', 'error'];
        const tipos: ('email' | 'visual' | 'sistema')[] = ['email', 'visual', 'sistema'];
        
        alertas.push({
          id: `alerta-${termino.id}-${i}`,
          terminoId: termino.id,
          proceso: termino.numeroProceso,
          denunciado: termino.denunciado,
          tipo: tipos[Math.floor(Math.random() * tipos.length)],
          fechaEnvio: fecha.toISOString().split('T')[0],
          horaEnvio: `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
          destinatario: termino.responsable,
          emailDestinatario: termino.emailResponsable,
          estado: estados[Math.floor(Math.random() * estados.length)],
          asunto: `Alerta: Término próximo a vencer - ${termino.numeroProceso}`,
          mensaje: `El término del proceso ${termino.numeroProceso} vence en ${termino.diasRestantes} días.`,
          intentos: termino.estado === 'vencido' ? Math.floor(Math.random() * 3) + 1 : 1
        });
      }
    }
  });
  
  return alertas.sort((a, b) => {
    const fechaA = new Date(`${a.fechaEnvio} ${a.horaEnvio}`);
    const fechaB = new Date(`${b.fechaEnvio} ${b.horaEnvio}`);
    return fechaB.getTime() - fechaA.getTime();
  });
};

export function VistaAlertas({ terminos, onCrearAlerta }: VistaAlertasProps) {
  const [alertas, setAlertas] = useState<Alerta[]>(generarAlertasMock(terminos));
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [mostrarModal, setMostrarModal] = useState(false);

  const handleCrearAlerta = (nuevaAlerta: Omit<Alerta, 'id'>) => {
    const alertaCompleta: Alerta = {
      ...nuevaAlerta,
      id: 'alerta-manual-' + Date.now()
    };
    
    setAlertas(prev => [alertaCompleta, ...prev]);
    
    if (onCrearAlerta) {
      onCrearAlerta(nuevaAlerta);
    }
  };

  // Estadísticas
  const estadisticas = useMemo(() => {
    return {
      total: alertas.length,
      enviadas: alertas.filter(a => a.estado === 'enviada').length,
      errores: alertas.filter(a => a.estado === 'error').length,
      pendientes: alertas.filter(a => a.estado === 'pendiente').length,
      emails: alertas.filter(a => a.tipo === 'email').length,
      visuales: alertas.filter(a => a.tipo === 'visual').length,
      sistema: alertas.filter(a => a.tipo === 'sistema').length
    };
  }, [alertas]);

  // Filtrado de alertas
  const alertasFiltradas = useMemo(() => {
    let resultado = [...alertas];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      resultado = resultado.filter(a =>
        a.proceso.toLowerCase().includes(term) ||
        a.denunciado.toLowerCase().includes(term) ||
        a.destinatario.toLowerCase().includes(term) ||
        a.asunto.toLowerCase().includes(term)
      );
    }

    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(a => a.estado === filtroEstado);
    }

    if (filtroTipo !== 'todos') {
      resultado = resultado.filter(a => a.tipo === filtroTipo);
    }

    return resultado;
  }, [alertas, searchTerm, filtroEstado, filtroTipo]);

  const handleReenviar = (alerta: Alerta) => {
    toast.success('Alerta reenviada', {
      description: `Se reenvió la alerta a ${alerta.destinatario}`
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'enviada': return { bg: '#ECFDF5', border: '#10B981', text: '#065F46', icon: CheckCircle };
      case 'error': return { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B', icon: XCircle };
      case 'pendiente': return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', icon: Clock };
      default: return { bg: '#F9FAFB', border: '#E5E7EB', text: '#6B7280', icon: Bell };
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'email': return Mail;
      case 'visual': return Bell;
      case 'sistema': return AlertCircle;
      default: return Bell;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Cards de estadísticas */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border-2" style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}>
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4" style={{ color: '#2563EB' }} />
            <span className="text-xs font-semibold" style={{ color: '#1E40AF' }}>Total</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#1E40AF' }}>{estadisticas.total}</p>
        </div>

        <div className="p-4 rounded-xl border-2" style={{ background: '#ECFDF5', borderColor: '#D1FAE5' }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
            <span className="text-xs font-semibold" style={{ color: '#065F46' }}>Enviadas</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{estadisticas.enviadas}</p>
        </div>

        <div className="p-4 rounded-xl border-2" style={{ background: '#FEE2E2', borderColor: '#FECACA' }}>
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4" style={{ color: '#DC2626' }} />
            <span className="text-xs font-semibold" style={{ color: '#991B1B' }}>Errores</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#DC2626' }}>{estadisticas.errores}</p>
        </div>

        <div className="p-4 rounded-xl border-2" style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}>
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4" style={{ color: '#2563EB' }} />
            <span className="text-xs font-semibold" style={{ color: '#1E40AF' }}>Emails</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>{estadisticas.emails}</p>
        </div>

        <div className="p-4 rounded-xl border-2" style={{ background: '#FEF3C7', borderColor: '#FDE68A' }}>
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4" style={{ color: '#F59E0B' }} />
            <span className="text-xs font-semibold" style={{ color: '#92400E' }}>Visuales</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{estadisticas.visuales}</p>
        </div>

        <div className="p-4 rounded-xl border-2" style={{ background: '#F3F4F6', borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4" style={{ color: '#6B7280' }} />
            <span className="text-xs font-semibold" style={{ color: '#374151' }}>Sistema</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#6B7280' }}>{estadisticas.sistema}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por proceso, denunciado o destinatario..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] transition-colors text-sm"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] text-sm"
            style={{ borderColor: '#E5E7EB' }}
          >
            <option value="todos">Todos los estados</option>
            <option value="enviada">Enviadas</option>
            <option value="error">Con error</option>
            <option value="pendiente">Pendientes</option>
          </select>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] text-sm"
            style={{ borderColor: '#E5E7EB' }}
          >
            <option value="todos">Todos los tipos</option>
            <option value="email">Email</option>
            <option value="visual">Visual</option>
            <option value="sistema">Sistema</option>
          </select>
        </div>
      </div>

      {/* Listado de alertas */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {alertasFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
              <p className="font-semibold" style={{ color: '#6B7280' }}>
                No se encontraron alertas
              </p>
              <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                Intenta ajustar los filtros de búsqueda
              </p>
            </div>
          ) : (
            alertasFiltradas.map((alerta) => {
              const estadoColors = getEstadoColor(alerta.estado);
              const EstadoIcon = estadoColors.icon;
              const TipoIcon = getTipoIcon(alerta.tipo);

              return (
                <motion.div
                  key={alerta.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl border-2 hover:shadow-md transition-all"
                  style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Columna izquierda */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <TipoIcon className="w-4 h-4" style={{ color: '#003DA5' }} />
                        <span className="font-mono font-bold text-sm" style={{ color: '#003DA5' }}>
                          {alerta.proceso}
                        </span>
                        <div
                          className="px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1"
                          style={{ background: estadoColors.bg, color: estadoColors.text, border: `1px solid ${estadoColors.border}` }}
                        >
                          <EstadoIcon className="w-3 h-3" />
                          {alerta.estado === 'enviada' ? 'Enviada' :
                           alerta.estado === 'error' ? 'Error' : 'Pendiente'}
                        </div>
                        <div
                          className="px-2 py-0.5 rounded-md text-xs font-semibold"
                          style={{ background: '#F3F4F6', color: '#6B7280' }}
                        >
                          {alerta.tipo === 'email' ? '📧 Email' :
                           alerta.tipo === 'visual' ? '🔔 Visual' : '⚙️ Sistema'}
                        </div>
                      </div>

                      <p className="font-semibold text-sm mb-1" style={{ color: '#1F2937' }}>
                        {alerta.asunto}
                      </p>
                      <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
                        {alerta.mensaje}
                      </p>

                      <div className="flex items-center gap-4 text-xs" style={{ color: '#6B7280' }}>
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          <span>{alerta.destinatario}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{alerta.emailDestinatario}</span>
                        </div>
                        {alerta.intentos > 1 && (
                          <div className="flex items-center gap-1" style={{ color: '#DC2626' }}>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{alerta.intentos} intentos</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Columna derecha */}
                    <div className="text-right">
                      <div className="mb-2">
                        <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                          Fecha de Envío
                        </p>
                        <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                          {new Date(alerta.fechaEnvio).toLocaleDateString('es-CO')}
                        </p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          {alerta.horaEnvio}
                        </p>
                      </div>

                      {alerta.estado === 'error' && (
                        <button
                          onClick={() => handleReenviar(alerta)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1 hover:opacity-90 transition-colors"
                          style={{ background: '#F59E0B' }}
                        >
                          <RefreshCw className="w-3 h-3" />
                          Reenviar
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal para crear nueva alerta */}
      <ModalNuevaAlerta
        isOpen={mostrarModal}
        onClose={() => setMostrarModal(false)}
        terminos={terminos}
        onCrear={handleCrearAlerta}
      />
    </div>
  );
}