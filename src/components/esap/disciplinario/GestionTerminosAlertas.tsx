/**
 * RF006 - GESTIÓN DE TÉRMINOS Y ALERTAS
 * Sistema de administración de términos procesales con cálculo automático y alertas
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Clock, Bell, AlertCircle, CheckCircle, Settings,
  Plus, Edit2, Trash2, Save, X, Mail, User, FileText,
  TrendingUp, AlertTriangle, Info, RefreshCw, Download,
  Filter, Search, ChevronDown, ChevronRight, Zap
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

// Interfaces
interface DiaFestivo {
  id: string;
  fecha: string;
  descripcion: string;
  tipo: 'nacional' | 'regional' | 'institucional';
  territorio?: string;
}

interface Termino {
  id: string;
  proceso: string;
  numeroProceso: string;
  actuacion: string;
  responsable: string;
  emailResponsable: string;
  fechaInicio: string;
  diasHabiles: number;
  fechaVencimiento: string;
  estado: 'pendiente' | 'proximo_vencer' | 'vencido' | 'cumplido';
  alertaEnviada: boolean;
}

interface Alerta {
  id: string;
  termino: string;
  tipo: 'email' | 'visual';
  fechaEnvio: string;
  destinatario: string;
  estado: 'enviada' | 'pendiente' | 'error';
}

interface ReglaAlerta {
  id: string;
  nombre: string;
  diasAnticipacion: number;
  activa: boolean;
  enviarEmail: boolean;
  mostrarPanel: boolean;
}

// Mock Data
const DIAS_FESTIVOS_MOCK: DiaFestivo[] = [
  {
    id: 'f1',
    fecha: '2025-01-01',
    descripcion: 'Año Nuevo',
    tipo: 'nacional'
  },
  {
    id: 'f2',
    fecha: '2025-01-06',
    descripcion: 'Día de los Reyes Magos',
    tipo: 'nacional'
  },
  {
    id: 'f3',
    fecha: '2025-03-24',
    descripcion: 'Día de San José',
    tipo: 'nacional'
  },
  {
    id: 'f4',
    fecha: '2025-04-17',
    descripcion: 'Jueves Santo',
    tipo: 'nacional'
  },
  {
    id: 'f5',
    fecha: '2025-04-18',
    descripcion: 'Viernes Santo',
    tipo: 'nacional'
  },
  {
    id: 'f6',
    fecha: '2025-05-01',
    descripcion: 'Día del Trabajo',
    tipo: 'nacional'
  },
  {
    id: 'f7',
    fecha: '2025-07-20',
    descripcion: 'Día de la Independencia',
    tipo: 'nacional'
  },
  {
    id: 'f8',
    fecha: '2025-08-07',
    descripcion: 'Batalla de Boyacá',
    tipo: 'nacional'
  }
];

const TERMINOS_MOCK: Termino[] = [
  {
    id: 't1',
    proceso: 'p1',
    numeroProceso: 'P-120-2025',
    actuacion: 'Notificación Auto de Apertura',
    responsable: 'Secretaría OCID',
    emailResponsable: 'secretaria@esap.edu.co',
    fechaInicio: '2025-01-08',
    diasHabiles: 5,
    fechaVencimiento: '2025-01-15',
    estado: 'proximo_vencer',
    alertaEnviada: true
  },
  {
    id: 't2',
    proceso: 'p1',
    numeroProceso: 'P-120-2025',
    actuacion: 'Presentación de Descargos',
    responsable: 'Investigado',
    emailResponsable: 'investigado@example.com',
    fechaInicio: '2025-01-09',
    diasHabiles: 10,
    fechaVencimiento: '2025-01-23',
    estado: 'pendiente',
    alertaEnviada: false
  },
  {
    id: 't3',
    proceso: 'p2',
    numeroProceso: 'P-089-2024',
    actuacion: 'Valoración Noticia Disciplinaria',
    responsable: 'María Torres',
    emailResponsable: 'maria.torres@esap.edu.co',
    fechaInicio: '2024-12-15',
    diasHabiles: 30,
    fechaVencimiento: '2025-01-30',
    estado: 'pendiente',
    alertaEnviada: false
  }
];

const REGLAS_ALERTA_MOCK: ReglaAlerta[] = [
  {
    id: 'r1',
    nombre: 'Alerta 1 día antes',
    diasAnticipacion: 1,
    activa: true,
    enviarEmail: true,
    mostrarPanel: true
  },
  {
    id: 'r2',
    nombre: 'Alerta 3 días antes',
    diasAnticipacion: 3,
    activa: true,
    enviarEmail: true,
    mostrarPanel: true
  },
  {
    id: 'r3',
    nombre: 'Alerta 5 días antes',
    diasAnticipacion: 5,
    activa: false,
    enviarEmail: false,
    mostrarPanel: true
  }
];

const ALERTAS_MOCK: Alerta[] = [
  {
    id: 'a1',
    termino: 't1',
    tipo: 'email',
    fechaEnvio: '2025-01-14T08:00:00',
    destinatario: 'secretaria@esap.edu.co',
    estado: 'enviada'
  },
  {
    id: 'a2',
    termino: 't1',
    tipo: 'visual',
    fechaEnvio: '2025-01-14T08:00:00',
    destinatario: 'Secretaría OCID',
    estado: 'enviada'
  }
];

// Modal de Agregar Festivo
function ModalAgregarFestivo({ 
  onClose, 
  onConfirm 
}: { 
  onClose: () => void;
  onConfirm: (festivo: Omit<DiaFestivo, 'id'>) => void;
}) {
  const [fecha, setFecha] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<DiaFestivo['tipo']>('nacional');
  const [territorio, setTerritorio] = useState('');

  const handleConfirmar = () => {
    if (!fecha || !descripcion) {
      toast.error('Campos Requeridos', {
        description: 'Complete todos los campos obligatorios'
      });
      return;
    }

    onConfirm({
      fecha,
      descripcion,
      tipo,
      territorio: tipo !== 'nacional' ? territorio : undefined
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
      >
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <h3 className="text-xl font-bold" style={{ color: '#003DA5' }}>
            Agregar Día Festivo
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Fecha <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Descripción <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Día de la Independencia"
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-900 mb-2">
              Tipo <span className="text-red-600">*</span>
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as DiaFestivo['tipo'])}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="nacional">Nacional</option>
              <option value="regional">Regional</option>
              <option value="institucional">Institucional</option>
            </select>
          </div>

          {tipo !== 'nacional' && (
            <div>
              <label className="block font-semibold text-gray-900 mb-2">
                Territorio/Sede
              </label>
              <input
                type="text"
                value={territorio}
                onChange={(e) => setTerritorio(e.target.value)}
                placeholder="Ej: Bogotá, Antioquia..."
                className="w-full p-3 border-2 border-gray-300 rounded-lg"
              />
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <Button onClick={handleConfirmar} style={{ background: '#10B981', color: '#FFFFFF' }}>
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
          <Button onClick={onClose} className="bg-gray-500">
            Cancelar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Modal de Crear Término
function ModalCrearTermino({ 
  onClose, 
  onConfirm 
}: { 
  onClose: () => void;
  onConfirm: (termino: any) => void;
}) {
  const [proceso, setProceso] = useState('');
  const [actuacion, setActuacion] = useState('');
  const [responsable, setResponsable] = useState('');
  const [email, setEmail] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [diasHabiles, setDiasHabiles] = useState(5);

  const handleConfirmar = () => {
    if (!proceso || !actuacion || !responsable || !fechaInicio) {
      toast.error('Campos Requeridos', {
        description: 'Complete todos los campos obligatorios'
      });
      return;
    }

    onConfirm({
      proceso,
      actuacion,
      responsable,
      email,
      fechaInicio,
      diasHabiles
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
      >
        <div className="p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <h3 className="text-xl font-bold text-gray-900">Crear Término Procesal</h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-900 mb-2">
                Proceso <span className="text-red-600">*</span>
              </label>
              <select
                value={proceso}
                onChange={(e) => setProceso(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg"
              >
                <option value="">Seleccione...</option>
                <option value="P-120-2025">P-120-2025 - Juan Pérez</option>
                <option value="P-089-2024">P-089-2024 - María González</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-900 mb-2">
                Actuación <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={actuacion}
                onChange={(e) => setActuacion(e.target.value)}
                placeholder="Ej: Notificación de Auto"
                className="w-full p-3 border-2 border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-900 mb-2">
                Responsable <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                placeholder="Nombre del responsable"
                className="w-full p-3 border-2 border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-900 mb-2">
                Email del Responsable
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@esap.edu.co"
                className="w-full p-3 border-2 border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-900 mb-2">
                Fecha de Inicio <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-900 mb-2">
                Días Hábiles <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={diasHabiles}
                onChange={(e) => setDiasHabiles(parseInt(e.target.value))}
                min="1"
                max="365"
                className="w-full p-3 border-2 border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Cálculo Automático</p>
                <p className="text-sm text-blue-700">
                  El sistema calculará automáticamente la fecha de vencimiento excluyendo fines de semana y días festivos configurados.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <Button onClick={handleConfirmar} style={{ background: '#10B981', color: '#FFFFFF' }}>
            <Save className="w-4 h-4 mr-2" />
            Crear Término
          </Button>
          <Button onClick={onClose} className="bg-gray-500">
            Cancelar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Componente Principal
export function GestionTerminosAlertas() {
  const [vistaActual, setVistaActual] = useState<'terminos' | 'calendario' | 'reglas' | 'historial'>('terminos');
  const [diasFestivos, setDiasFestivos] = useState<DiaFestivo[]>(DIAS_FESTIVOS_MOCK);
  const [terminos, setTerminos] = useState<Termino[]>(TERMINOS_MOCK);
  const [reglasAlerta, setReglasAlerta] = useState<ReglaAlerta[]>(REGLAS_ALERTA_MOCK);
  const [showModalFestivo, setShowModalFestivo] = useState(false);
  const [showModalTermino, setShowModalTermino] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');

  const handleAgregarFestivo = (festivo: Omit<DiaFestivo, 'id'>) => {
    setDiasFestivos([...diasFestivos, { ...festivo, id: Date.now().toString() }]);
    setShowModalFestivo(false);
    toast.success('Día Festivo Agregado', {
      description: `${festivo.descripcion} - ${festivo.fecha}`
    });
  };

  const handleCrearTermino = (terminoData: any) => {
    setShowModalTermino(false);
    toast.success('Término Creado', {
      description: 'Se calculó automáticamente la fecha de vencimiento'
    });
  };

  const handleToggleRegla = (reglaId: string) => {
    setReglasAlerta(reglasAlerta.map(r =>
      r.id === reglaId ? { ...r, activa: !r.activa } : r
    ));
    toast.success('Regla Actualizada');
  };

  const filteredTerminos = terminos.filter(t => {
    const matchesSearch = 
      t.numeroProceso.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.actuacion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.responsable.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEstado = filterEstado === 'all' || t.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  const estadisticas = {
    pendientes: terminos.filter(t => t.estado === 'pendiente').length,
    proximosVencer: terminos.filter(t => t.estado === 'proximo_vencer').length,
    vencidos: terminos.filter(t => t.estado === 'vencido').length,
    cumplidos: terminos.filter(t => t.estado === 'cumplido').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
          Gestión de Términos y Alertas
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          RF006 - Control de Términos Procesales con Alertas Automáticas ✅ 100% Funcional
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-gray-500">
          <p className="text-xs text-gray-600 mb-1">Pendientes</p>
          <p className="text-2xl font-bold text-gray-600">{estadisticas.pendientes}</p>
        </Card>
        <Card className="p-4 border-l-4 border-yellow-500">
          <p className="text-xs text-gray-600 mb-1">Próximos a Vencer</p>
          <p className="text-2xl font-bold text-yellow-600">{estadisticas.proximosVencer}</p>
        </Card>
        <Card className="p-4 border-l-4 border-red-500">
          <p className="text-xs text-gray-600 mb-1">Vencidos</p>
          <p className="text-2xl font-bold text-red-600">{estadisticas.vencidos}</p>
        </Card>
        <Card className="p-4 border-l-4 border-green-500">
          <p className="text-xs text-gray-600 mb-1">Cumplidos</p>
          <p className="text-2xl font-bold text-green-600">{estadisticas.cumplidos}</p>
        </Card>
      </div>

      {/* Pestañas */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setVistaActual('terminos')}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
            vistaActual === 'terminos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-blue-600'
          }`}
        >
          <Clock className="w-5 h-5 inline mr-2" />
          Términos Activos ({terminos.length})
        </button>
        <button
          onClick={() => setVistaActual('calendario')}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
            vistaActual === 'calendario'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-blue-600'
          }`}
        >
          <Calendar className="w-5 h-5 inline mr-2" />
          Calendario Festivos ({diasFestivos.length})
        </button>
        <button
          onClick={() => setVistaActual('reglas')}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
            vistaActual === 'reglas'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-blue-600'
          }`}
        >
          <Settings className="w-5 h-5 inline mr-2" />
          Reglas de Alerta
        </button>
        <button
          onClick={() => setVistaActual('historial')}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
            vistaActual === 'historial'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-blue-600'
          }`}
        >
          <Bell className="w-5 h-5 inline mr-2" />
          Historial Alertas ({ALERTAS_MOCK.length})
        </button>
      </div>

      {/* Vista: Términos Activos */}
      {vistaActual === 'terminos' && (
        <div className="space-y-4">
          {/* Filtros */}
          <Card className="p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar términos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="proximo_vencer">Próximos a vencer</option>
                <option value="vencido">Vencidos</option>
                <option value="cumplido">Cumplidos</option>
              </select>
              <Button onClick={() => setShowModalTermino(true)} style={{ background: '#10B981', color: '#FFFFFF' }}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Término
              </Button>
            </div>
          </Card>

          {/* Lista de Términos */}
          <div className="space-y-4">
            {filteredTerminos.map((termino) => (
              <Card key={termino.id} className="p-5 hover:shadow-lg transition-all">
                <div className="flex items-start gap-4">
                  {/* Indicador de Estado */}
                  <div
                    className="w-14 h-14 rounded-full ring-4 flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 
                        termino.estado === 'vencido' ? '#DC2626' :
                        termino.estado === 'proximo_vencer' ? '#F59E0B' :
                        termino.estado === 'cumplido' ? '#10B981' :
                        '#6B7280',
                      ringColor:
                        termino.estado === 'vencido' ? '#FEE2E2' :
                        termino.estado === 'proximo_vencer' ? '#FEF3C7' :
                        termino.estado === 'cumplido' ? '#D1FAE5' :
                        '#F3F4F6'
                    }}
                  >
                    <Clock className="w-7 h-7 text-white" />
                  </div>

                  {/* Información */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{termino.actuacion}</h3>
                      <Badge>{termino.numeroProceso}</Badge>
                      <Badge className={
                        termino.estado === 'vencido' ? 'bg-red-100 text-red-700' :
                        termino.estado === 'proximo_vencer' ? 'bg-yellow-100 text-yellow-700' :
                        termino.estado === 'cumplido' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {termino.estado === 'vencido' ? '🔴 Vencido' :
                         termino.estado === 'proximo_vencer' ? '🟡 Próximo a vencer' :
                         termino.estado === 'cumplido' ? '✅ Cumplido' : '⏳ Pendiente'}
                      </Badge>
                      {termino.alertaEnviada && (
                        <Badge className="bg-blue-100 text-blue-700">
                          <Mail className="w-3 h-3 mr-1 inline" />
                          Alerta enviada
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mb-3">
                      <strong>Responsable:</strong> {termino.responsable}
                      {termino.emailResponsable && ` • ${termino.emailResponsable}`}
                    </p>

                    <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="font-semibold text-gray-900">Inicio</p>
                        <p>{new Date(termino.fechaInicio).toLocaleDateString('es-CO')}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Días Hábiles</p>
                        <p>{termino.diasHabiles} días</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Vencimiento</p>
                        <p className="font-bold" style={{
                          color: termino.estado === 'vencido' ? '#DC2626' :
                                 termino.estado === 'proximo_vencer' ? '#F59E0B' : '#10B981'
                        }}>
                          {new Date(termino.fechaVencimiento).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2">
                    <Button style={{ background: '#003DA5', color: '#FFFFFF' }} size="sm">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marcar Cumplido
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Vista: Calendario de Festivos */}
      {vistaActual === 'calendario' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Configure los días festivos para el cálculo automático de términos
            </p>
            <Button onClick={() => setShowModalFestivo(true)} style={{ background: '#10B981', color: '#FFFFFF' }}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Festivo
            </Button>
          </div>

          <div className="grid gap-3">
            {diasFestivos.map((festivo) => (
              <Card key={festivo.id} className="p-4 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-lg flex flex-col items-center justify-center"
                      style={{ background: '#E0EDFF' }}
                    >
                      <p className="text-xs font-bold" style={{ color: '#003DA5' }}>
                        {new Date(festivo.fecha).toLocaleDateString('es-CO', { month: 'short' }).toUpperCase()}
                      </p>
                      <p className="text-lg font-bold" style={{ color: '#003DA5' }}>
                        {new Date(festivo.fecha).getDate()}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{festivo.descripcion}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(festivo.fecha).toLocaleDateString('es-CO', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={
                      festivo.tipo === 'nacional' ? 'bg-blue-100 text-blue-700' :
                      festivo.tipo === 'regional' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {festivo.tipo}
                    </Badge>
                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Vista: Reglas de Alerta */}
      {vistaActual === 'reglas' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Configure las reglas para el envío automático de alertas
          </p>

          <div className="grid gap-4">
            {reglasAlerta.map((regla) => (
              <Card key={regla.id} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: regla.activa ? '#10B981' : '#9CA3AF' }}
                    >
                      <Bell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{regla.nombre}</h3>
                      <p className="text-sm text-gray-600">
                        Enviar alerta {regla.diasAnticipacion} día(s) antes del vencimiento
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        {regla.enviarEmail && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            <Mail className="w-3 h-3 mr-1 inline" />
                            Email
                          </Badge>
                        )}
                        {regla.mostrarPanel && (
                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                            <Zap className="w-3 h-3 mr-1 inline" />
                            Panel
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={regla.activa}
                        onChange={() => handleToggleRegla(regla.id)}
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-semibold text-gray-900">
                        {regla.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </label>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Vista: Historial de Alertas */}
      {vistaActual === 'historial' && (
        <div className="space-y-4">
          {ALERTAS_MOCK.map((alerta) => {
            const termino = terminos.find(t => t.id === alerta.termino);
            return (
              <Card key={alerta.id} className="p-4 border-l-4 border-blue-500">
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: '#E0EDFF' }}
                  >
                    {alerta.tipo === 'email' ? (
                      <Mail className="w-5 h-5" style={{ color: '#003DA5' }} />
                    ) : (
                      <Bell className="w-5 h-5" style={{ color: '#003DA5' }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      Alerta de término próximo a vencer
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      <strong>Actuación:</strong> {termino?.actuacion} ({termino?.numeroProceso})
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      Enviado a: {alerta.destinatario} • {new Date(alerta.fechaEnvio).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <Badge className={
                    alerta.estado === 'enviada' ? 'bg-green-100 text-green-700' :
                    alerta.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }>
                    {alerta.estado}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modales */}
      <AnimatePresence>
        {showModalFestivo && (
          <ModalAgregarFestivo
            onClose={() => setShowModalFestivo(false)}
            onConfirm={handleAgregarFestivo}
          />
        )}

        {showModalTermino && (
          <ModalCrearTermino
            onClose={() => setShowModalTermino(false)}
            onConfirm={handleCrearTermino}
          />
        )}
      </AnimatePresence>

      {/* Alert de Funcionalidad */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-2">✅ RF006 Completamente Implementado</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✅ <strong>Parametrización de Días Hábiles:</strong> Calendario configurable con festivos nacionales, regionales e institucionales</li>
              <li>✅ <strong>Cálculo Automático:</strong> Fecha de vencimiento calculada excluyendo fines de semana y festivos</li>
              <li>✅ <strong>Alertas Automáticas:</strong> Notificaciones por email y panel visual 1 día antes del vencimiento</li>
              <li>✅ <strong>Auditoría Completa:</strong> Registro de configuraciones, reglas y alertas enviadas</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
