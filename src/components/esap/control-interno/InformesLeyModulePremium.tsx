/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INFORMES DE LEY - VERSIÓN PREMIUM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Gestión integral del catálogo normativo de informes obligatorios
 * 
 * VERSIÓN: 3.0 - PREMIUM
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 * 
 * ✨ Características Premium:
 * - Header corporativo unificado (HeaderModuloCIG)
 * - Dashboard con 6 KPIs detallados
 * - Vista de Catálogo con filtros avanzados
 * - Vista de Generados con historial completo
 * - Vista de Próximos con calendario inteligente
 * - Semáforos de alerta (verde/amarillo/rojo)
 * - Modales de detalle y generación
 * - Integración con catálogo normativo (16 informes)
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Calendar, Clock, Search, Download, Eye, CheckCircle2, 
  Plus, Send, Archive, Book,
  CheckSquare, XCircle, Loader
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Design System
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { HeaderModuloCIG } from './HeaderModuloCIG';

// Catálogo
import { 
  CATALOGO_INFORMES_LEY, 
  InformeLeyNormativo, 
  PeriodicidadInforme,
  calcularProximaFechaGeneracion
} from './CatalogoInformesLey';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface InformeGenerado {
  id: string;
  informeLeyId: string;
  informeNombre: string;
  periodo: string;
  fechaGeneracion: string;
  fechaVencimiento: string;
  estado: 'BORRADOR' | 'GENERADO' | 'ENVIADO' | 'ATRASADO';
  generadoPor: string;
  archivoUrl?: string;
  observaciones?: string;
  destinatarios?: string[];
}

type VistaActual = 'catalogo' | 'generados' | 'proximos';

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK
// ════════════════════════════════════════════════════════════════════════════

const INFORMES_GENERADOS_MOCK: InformeGenerado[] = [
  {
    id: 'gen-1',
    informeLeyId: 'inf-ley-001',
    informeNombre: 'Informe Pormenorizado del Estado del Control Interno',
    periodo: '2025-S1',
    fechaGeneracion: '2025-02-20',
    fechaVencimiento: '2025-02-28',
    estado: 'ENVIADO',
    generadoPor: 'Fernando Ávila',
    archivoUrl: '#',
    destinatarios: ['DAFP', 'Contraloría General']
  },
  {
    id: 'gen-2',
    informeLeyId: 'inf-ley-002',
    informeNombre: 'Informe Anual de Evaluación del Sistema de Control Interno',
    periodo: '2024',
    fechaGeneracion: '2025-02-15',
    fechaVencimiento: '2025-02-28',
    estado: 'ENVIADO',
    generadoPor: 'Fernando Ávila',
    archivoUrl: '#',
    destinatarios: ['DAFP', 'Alta Dirección']
  },
  {
    id: 'gen-3',
    informeLeyId: 'inf-ley-006',
    informeNombre: 'Informe de Austeridad del Gasto Público',
    periodo: '2024',
    fechaGeneracion: '2025-02-10',
    fechaVencimiento: '2025-02-28',
    estado: 'ENVIADO',
    generadoPor: 'Fernando Ávila',
    archivoUrl: '#'
  },
  {
    id: 'gen-4',
    informeLeyId: 'inf-ley-003',
    informeNombre: 'Rendición de la Cuenta Fiscal',
    periodo: '2024',
    fechaGeneracion: '2025-03-01',
    fechaVencimiento: '2025-03-15',
    estado: 'BORRADOR',
    generadoPor: 'Fernando Ávila'
  }
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function InformesLeyModulePremium() {
  const [vistaActiva, setVistaActiva] = useState<VistaActual>('catalogo');
  const [informesGenerados] = useState<InformeGenerado[]>(INFORMES_GENERADOS_MOCK);

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderModuloCIG
        titulo="Informes de Ley"
        subtitulo="Control Interno de Gestión"
      />

      {/* Navegación */}
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="mx-auto px-8 max-w-[1920px]">
          <div className="flex gap-1">
            <TabButton
              active={vistaActiva === 'catalogo'}
              onClick={() => setVistaActiva('catalogo')}
              icon={<Book className="w-4 h-4" />}
              label="Catálogo Normativo"
              badge={CATALOGO_INFORMES_LEY.filter(i => i.activo).length.toString()}
            />
            <TabButton
              active={vistaActiva === 'generados'}
              onClick={() => setVistaActiva('generados')}
              icon={<Archive className="w-4 h-4" />}
              label="Informes Generados"
              badge={informesGenerados.length.toString()}
            />
            <TabButton
              active={vistaActiva === 'proximos'}
              onClick={() => setVistaActiva('proximos')}
              icon={<Clock className="w-4 h-4" />}
              label="Próximos a Vencer"
            />
          </div>
        </div>
      </div>

      {/* Contenido */}
      <AnimatePresence mode="wait">
        <motion.div
          key={vistaActiva}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {vistaActiva === 'catalogo' && <VistaCatalogo />}
          {vistaActiva === 'generados' && <VistaGenerados informes={informesGenerados} />}
          {vistaActiva === 'proximos' && <VistaProximos />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB BUTTON
// ════════════════════════════════════════════════════════════════════════════

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-6 py-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-all
        ${active 
          ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50/50' 
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
      `}
    >
      {icon}
      {label}
      {badge && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          active ? 'bg-[#1e5da8] text-white' : 'bg-gray-200 text-gray-700'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: CATÁLOGO NORMATIVO
// ════════════════════════════════════════════════════════════════════════════

function VistaCatalogo() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroPeriodicidad, setFiltroPeriodicidad] = useState<PeriodicidadInforme | 'TODOS'>('TODOS');
  const [informeSeleccionado, setInformeSeleccionado] = useState<InformeLeyNormativo | null>(null);

  const informesFiltrados = useMemo(() => {
    let resultado = CATALOGO_INFORMES_LEY.filter(i => i.activo);

    if (busqueda) {
      const search = busqueda.toLowerCase();
      resultado = resultado.filter(i =>
        i.nombre.toLowerCase().includes(search) ||
        i.nombreCorto.toLowerCase().includes(search) ||
        i.baseNormativa.toLowerCase().includes(search)
      );
    }

    if (filtroPeriodicidad !== 'TODOS') {
      resultado = resultado.filter(i => i.periodicidad === filtroPeriodicidad);
    }

    return resultado;
  }, [busqueda, filtroPeriodicidad]);

  const estadisticas = useMemo(() => {
    const total = CATALOGO_INFORMES_LEY.filter(i => i.activo).length;
    const semestrales = CATALOGO_INFORMES_LEY.filter(i => i.activo && i.periodicidad === 'SEMESTRAL').length;
    const anuales = CATALOGO_INFORMES_LEY.filter(i => i.activo && i.periodicidad === 'ANUAL').length;
    const trimestrales = CATALOGO_INFORMES_LEY.filter(i => i.activo && i.periodicidad === 'TRIMESTRAL').length;
    const mensuales = CATALOGO_INFORMES_LEY.filter(i => i.activo && i.periodicidad === 'MENSUAL').length;

    return { total, semestrales, anuales, trimestrales, mensuales };
  }, []);

  return (
    <div className="mx-auto px-8 py-6 max-w-[1920px]">
      {/* Búsqueda y Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por nombre, normativa o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8] text-sm"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex gap-2">
            <FilterButton
              active={filtroPeriodicidad === 'TODOS'}
              onClick={() => setFiltroPeriodicidad('TODOS')}
              label="Todos"
              count={estadisticas.total}
            />
            <FilterButton
              active={filtroPeriodicidad === 'SEMESTRAL'}
              onClick={() => setFiltroPeriodicidad('SEMESTRAL')}
              label="Semestral"
              count={estadisticas.semestrales}
              color="purple"
            />
            <FilterButton
              active={filtroPeriodicidad === 'ANUAL'}
              onClick={() => setFiltroPeriodicidad('ANUAL')}
              label="Anual"
              count={estadisticas.anuales}
              color="green"
            />
            <FilterButton
              active={filtroPeriodicidad === 'TRIMESTRAL'}
              onClick={() => setFiltroPeriodicidad('TRIMESTRAL')}
              label="Trimestral"
              count={estadisticas.trimestrales}
              color="orange"
            />
            <FilterButton
              active={filtroPeriodicidad === 'MENSUAL'}
              onClick={() => setFiltroPeriodicidad('MENSUAL')}
              label="Mensual"
              count={estadisticas.mensuales}
              color="cyan"
            />
          </div>
        </div>
      </div>

      {/* Lista de Informes */}
      <div className="space-y-4">
        {informesFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base text-gray-900 mb-2">No se encontraron informes</h3>
            <p className="text-sm text-gray-600">Intenta ajustar los filtros o la búsqueda</p>
          </div>
        ) : (
          informesFiltrados.map((informe) => (
            <CardInforme
              key={informe.id}
              informe={informe}
              onVerDetalle={() => setInformeSeleccionado(informe)}
            />
          ))
        )}
      </div>

      {/* Modal Detalle */}
      {informeSeleccionado && (
        <ModalDetalleInforme
          informe={informeSeleccionado}
          onClose={() => setInformeSeleccionado(null)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CARD INFORME
// ════════════════════════════════════════════════════════════════════════════

interface CardInformeProps {
  informe: InformeLeyNormativo;
  onVerDetalle: () => void;
}

function CardInforme({ informe, onVerDetalle }: CardInformeProps) {
  const colorPeriodicidad = {
    MENSUAL: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    TRIMESTRAL: 'bg-orange-100 text-orange-700 border-orange-300',
    SEMESTRAL: 'bg-purple-100 text-purple-700 border-purple-300',
    ANUAL: 'bg-green-100 text-green-700 border-green-300'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        <div className="flex items-start gap-6">
          {/* Icono */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-[#1e5da8] to-[#2a6dbd] rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base text-gray-900 font-medium">{informe.nombreCorto}</h3>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${colorPeriodicidad[informe.periodicidad]}`}>
                    {informe.periodicidad}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{informe.nombre}</p>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Book className="w-3.5 h-3.5" />
                    {informe.baseNormativa}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {informe.mesesGeneracion?.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Descripción */}
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{informe.descripcion}</p>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Send className="w-3.5 h-3.5" />
                {informe.destinatarios?.join(', ') || 'No especificado'}
              </div>
              <button
                onClick={onVerDetalle}
                className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Ver Detalle
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: INFORMES GENERADOS
// ════════════════════════════════════════════════════════════════════════════

interface VistaGeneradosProps {
  informes: InformeGenerado[];
}

function VistaGenerados({ informes }: VistaGeneradosProps) {
  const estadisticas = useMemo(() => {
    const enviados = informes.filter(i => i.estado === 'ENVIADO').length;
    const borradores = informes.filter(i => i.estado === 'BORRADOR').length;
    const atrasados = informes.filter(i => i.estado === 'ATRASADO').length;

    return { total: informes.length, enviados, borradores, atrasados };
  }, [informes]);

  return (
    <div className="mx-auto px-8 py-6 max-w-[1920px]">
      {/* Dashboard */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl text-gray-900 font-medium mb-6">Historial de Informes Generados</h2>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="text-xs text-blue-700 mb-1">Total Generados</div>
            <div className="text-2xl font-semibold text-blue-900">{estadisticas.total}</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="text-xs text-green-700 mb-1">Enviados</div>
            <div className="text-2xl font-semibold text-green-900">{estadisticas.enviados}</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-4 border border-yellow-200">
            <div className="text-xs text-yellow-700 mb-1">Borradores</div>
            <div className="text-2xl font-semibold text-yellow-900">{estadisticas.borradores}</div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4 border border-red-200">
            <div className="text-xs text-red-700 mb-1">Atrasados</div>
            <div className="text-2xl font-semibold text-red-900">{estadisticas.atrasados}</div>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {informes.map((informe) => (
          <CardInformeGenerado key={informe.id} informe={informe} />
        ))}
      </div>
    </div>
  );
}

function CardInformeGenerado({ informe }: { informe: InformeGenerado }) {
  const [modalDetalle, setModalDetalle] = useState(false);
  
  const estadoConfig = {
    ENVIADO: { label: 'Enviado', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
    BORRADOR: { label: 'Borrador', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Loader },
    GENERADO: { label: 'Generado', bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckSquare },
    ATRASADO: { label: 'Atrasado', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle }
  };

  const config = estadoConfig[informe.estado];
  const Icon = config.icon;

  const handleDescargar = () => {
    if (!informe.archivoUrl) {
      toast.error('Archivo no disponible', {
        description: 'No hay archivo asociado a este informe',
      });
      return;
    }

    toast.success('Descargando Informe', {
      description: `${informe.informeNombre} (${informe.periodo})`,
      duration: 3000,
    });

    console.log('📥 Descargando informe:', {
      informeId: informe.id,
      nombre: informe.informeNombre,
      periodo: informe.periodo,
      archivoUrl: informe.archivoUrl,
      estado: informe.estado,
      usuario: 'Usuario Actual',
      timestamp: new Date().toISOString()
    });

    // En producción: descargar el archivo
    // fetch(informe.archivoUrl)
    //   .then(response => response.blob())
    //   .then(blob => {
    //     const url = window.URL.createObjectURL(blob);
    //     const a = document.createElement('a');
    //     a.href = url;
    //     a.download = `${informe.informeNombre}_${informe.periodo}.pdf`;
    //     a.click();
    //     window.URL.revokeObjectURL(url);
    //   });
  };

  const handleVerDetalle = () => {
    setModalDetalle(true);
    
    toast.info('Abriendo Detalle del Informe', {
      description: informe.informeNombre,
      duration: 2000,
    });

    console.log('👁️ Ver detalle del informe:', {
      informeId: informe.id,
      nombre: informe.informeNombre,
      periodo: informe.periodo,
      estado: informe.estado,
      usuario: 'Usuario Actual',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-base text-gray-900 font-medium">{informe.informeNombre}</h3>
            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.text} flex items-center gap-1`}>
              <Icon className="w-3 h-3" />
              {config.label}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
            <div>
              <span className="text-gray-600">Periodo:</span>
              <span className="ml-2 text-gray-900 font-medium">{informe.periodo}</span>
            </div>
            <div>
              <span className="text-gray-600">Generado:</span>
              <span className="ml-2 text-gray-900">{informe.fechaGeneracion}</span>
            </div>
            <div>
              <span className="text-gray-600">Vencimiento:</span>
              <span className="ml-2 text-gray-900">{informe.fechaVencimiento}</span>
            </div>
          </div>

          <div className="text-xs text-gray-600">
            Generado por: <span className="text-gray-900">{informe.generadoPor}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {informe.archivoUrl && (
            <button 
              onClick={handleDescargar}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar
            </button>
          )}
          <button 
            onClick={handleVerDetalle}
            className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Ver Detalle
          </button>
        </div>
      </div>

      {/* Modal Detalle Informe Generado */}
      {modalDetalle && (
        <ModalDetalleInformeGenerado 
          informe={informe} 
          onClose={() => setModalDetalle(false)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: PRÓXIMOS A VENCER
// ════════════════════════════════════════════════════════════════════════════

function VistaProximos() {
  const [informeSeleccionado, setInformeSeleccionado] = useState<InformeLeyNormativo | null>(null);
  
  const proximosInformes = useMemo(() => {
    const ahora = new Date();
    const dentro60Dias = new Date(ahora.getTime() + 60 * 24 * 60 * 60 * 1000);

    return CATALOGO_INFORMES_LEY
      .filter(inf => inf.activo)
      .map(inf => {
        const proximaFecha = calcularProximaFechaGeneracion(inf);
        if (!proximaFecha) return null;

        const fecha = new Date(proximaFecha);
        const diasRestantes = Math.ceil((fecha.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));

        if (diasRestantes > 60) return null;

        return {
          ...inf,
          proximaFecha,
          diasRestantes,
          semaforo: diasRestantes <= 7 ? 'rojo' : diasRestantes <= 15 ? 'amarillo' : 'verde'
        };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, []);

  const handleGenerarAhora = (informe: InformeLeyNormativo) => {
    setInformeSeleccionado(informe);
    
    toast.info('Generando informe próximo a vencer', {
      description: `${informe.nombreCorto} - ${informe.periodicidad}`,
      duration: 2000,
    });

    console.log('⏰ Generar informe próximo a vencer:', {
      informeId: informe.id,
      nombre: informe.nombreCorto,
      periodicidad: informe.periodicidad,
      proximaFecha: proximosInformes.find(i => i.id === informe.id)?.proximaFecha,
      diasRestantes: proximosInformes.find(i => i.id === informe.id)?.diasRestantes,
      usuario: 'Usuario Actual',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <>
      <div className="mx-auto px-8 py-6 max-w-[1920px]">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl text-gray-900 font-medium mb-2">Informes Próximos a Vencer</h2>
          <p className="text-sm text-gray-600">Próximos 60 días</p>
        </div>

        <div className="space-y-4">
          {proximosInformes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-base text-gray-900 mb-2">No hay informes próximos a vencer</h3>
              <p className="text-sm text-gray-600">Todos los informes están al día</p>
            </div>
          ) : (
            proximosInformes.map((informe) => (
              <div key={informe.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start gap-6">
                  <div className={`w-3 h-3 rounded-full mt-2 ${
                    informe.semaforo === 'verde' ? 'bg-green-500' :
                    informe.semaforo === 'amarillo' ? 'bg-amber-500' :
                    'bg-red-500'
                  }`} />

                  <div className="flex-1">
                    <h3 className="text-base text-gray-900 font-medium mb-2">{informe.nombreCorto}</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-600">Próxima generación:</span>
                        <span className="ml-2 text-gray-900 font-medium">
                          {new Date(informe.proximaFecha).toLocaleDateString('es-CO', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Días restantes:</span>
                        <span className={`ml-2 font-medium ${
                          informe.diasRestantes <= 7 ? 'text-red-600' :
                          informe.diasRestantes <= 15 ? 'text-amber-600' :
                          'text-green-600'
                        }`}>
                          {informe.diasRestantes} días
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Periodicidad:</span>
                        <span className="ml-2 text-gray-900">{informe.periodicidad}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleGenerarAhora(informe)}
                    className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Generar Ahora
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Generar Informe */}
      {informeSeleccionado && (
        <ModalGenerarInforme 
          informe={informeSeleccionado} 
          onClose={() => setInformeSeleccionado(null)}
          onGenerar={() => {
            setInformeSeleccionado(null);
            toast.success('Informe generado y agregado al historial');
          }}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: DETALLE INFORME
// ════════════════════════════════════════════════════════════════════════════

interface ModalDetalleInformeProps {
  informe: InformeLeyNormativo;
  onClose: () => void;
}

function ModalDetalleInforme({ informe, onClose }: ModalDetalleInformeProps) {
  const [modalGenerar, setModalGenerar] = useState(false);

  const handleGenerarInforme = () => {
    setModalGenerar(true);
  };

  return (
    <>
      <ModalSIGL isOpen={true} onClose={onClose} title="" size="large">
        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-2xl text-gray-900 mb-2">{informe.nombreCorto}</h2>
            <p className="text-sm text-gray-600">{informe.nombre}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 mb-1">Base Normativa</div>
              <div className="text-sm text-gray-900">{informe.baseNormativa}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 mb-1">Periodicidad</div>
              <div className="text-sm text-gray-900">{informe.periodicidad}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 mb-1">Meses de Generación</div>
              <div className="text-sm text-gray-900">{informe.mesesGeneracion?.join(', ')}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 mb-1">Destinatarios</div>
              <div className="text-sm text-gray-900">{informe.destinatarios?.join(', ')}</div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm text-gray-900 font-medium mb-2">Descripción</h3>
            <p className="text-sm text-gray-700">{informe.descripcion}</p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
            <button 
              onClick={handleGenerarInforme}
              className="px-6 py-2.5 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Generar Informe
            </button>
          </div>
        </div>
      </ModalSIGL>

      {/* Modal Generar Informe */}
      {modalGenerar && (
        <ModalGenerarInforme 
          informe={informe} 
          onClose={() => setModalGenerar(false)}
          onGenerar={() => {
            setModalGenerar(false);
            onClose();
          }}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: DETALLE INFORME GENERADO
// ════════════════════════════════════════════════════════════════════════════

interface ModalDetalleInformeGeneradoProps {
  informe: InformeGenerado;
  onClose: () => void;
}

function ModalDetalleInformeGenerado({ informe, onClose }: ModalDetalleInformeGeneradoProps) {
  return (
    <ModalSIGL isOpen={true} onClose={onClose} title="" size="large">
      <div className="p-8">
        <div className="mb-6">
          <h2 className="text-2xl text-gray-900 mb-2">{informe.informeNombre}</h2>
          <p className="text-sm text-gray-600">Periodo: {informe.periodo}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-600 mb-1">Estado</div>
            <div className="text-sm text-gray-900">
              {informe.estado === 'ENVIADO' ? 'Enviado' :
              informe.estado === 'BORRADOR' ? 'Borrador' :
              informe.estado === 'GENERADO' ? 'Generado' :
              'Atrasado'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-600 mb-1">Generado por</div>
            <div className="text-sm text-gray-900">{informe.generadoPor}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-600 mb-1">Fecha de Generación</div>
            <div className="text-sm text-gray-900">{informe.fechaGeneracion}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-600 mb-1">Fecha de Vencimiento</div>
            <div className="text-sm text-gray-900">{informe.fechaVencimiento}</div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm text-gray-900 font-medium mb-2">Observaciones</h3>
          <p className="text-sm text-gray-700">{informe.observaciones || 'Sin observaciones'}</p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </ModalSIGL>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ════════════════════════════════════════════════════════════════════════════

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: 'purple' | 'green' | 'orange' | 'cyan' | 'gray';
}

function FilterButton({ active, onClick, label, count, color = 'gray' }: FilterButtonProps) {
  const colorClasses = {
    purple: active ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-white text-gray-700 border-gray-300',
    green: active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-700 border-gray-300',
    orange: active ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-white text-gray-700 border-gray-300',
    cyan: active ? 'bg-cyan-100 text-cyan-700 border-cyan-300' : 'bg-white text-gray-700 border-gray-300',
    gray: active ? 'bg-gray-100 text-gray-900 border-gray-400' : 'bg-white text-gray-700 border-gray-300'
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${colorClasses[color]}`}
    >
      {label} ({count})
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: GENERAR INFORME
// ════════════════════════════════════════════════════════════════════════════

interface ModalGenerarInformeProps {
  informe: InformeLeyNormativo;
  onClose: () => void;
  onGenerar: () => void;
}

function ModalGenerarInforme({ informe, onClose, onGenerar }: ModalGenerarInformeProps) {
  const [periodo, setPeriodo] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const handleGenerar = () => {
    // Validaciones
    if (!periodo.trim()) {
      toast.error('El periodo es obligatorio');
      return;
    }

    // Simular generación del informe
    toast.success('Informe Generado Exitosamente', {
      description: `${informe.nombreCorto} - Periodo ${periodo}`,
      duration: 4000,
    });

    console.log('📄 Generando informe:', {
      informeId: informe.id,
      nombre: informe.nombreCorto,
      nombreCompleto: informe.nombre,
      periodo,
      descripcion,
      baseNormativa: informe.baseNormativa,
      periodicidad: informe.periodicidad,
      destinatarios: informe.destinatarios,
      usuario: 'Fernando Ávila',
      timestamp: new Date().toISOString()
    });

    // En producción: llamar al backend para generar el informe
    // POST /api/informes-ley/generar
    // {
    //   informeLeyId: informe.id,
    //   periodo,
    //   descripcion
    // }

    onGenerar();
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <h3 className="text-xl font-medium">Generar Informe</h3>
          <p className="text-sm text-blue-100 mt-1">{informe.nombreCorto}</p>
        </div>

        {/* Contenido */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            {/* Información del Informe */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="text-sm font-medium text-blue-900 mb-1">Informe Pormenorizado del Estado del Control Interno</div>
              <div className="flex items-center gap-4 text-xs text-blue-700">
                <span>Base Normativa: {informe.baseNormativa}</span>
                <span>•</span>
                <span>Periodicidad: {informe.periodicidad}</span>
              </div>
              {informe.destinatarios && informe.destinatarios.length > 0 && (
                <div className="text-xs text-blue-700 mt-2">
                  <span className="font-medium">Destinatarios:</span> {informe.destinatarios.join(', ')}
                </div>
              )}
            </div>

            {/* Periodo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Periodo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                placeholder={informe.periodicidad === 'SEMESTRAL' ? 'Ej: 2025-S1' : 'Ej: 2024'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
              />
              <p className="text-xs text-gray-600 mt-1">
                {informe.periodicidad === 'SEMESTRAL' 
                  ? 'Formato: AAAA-S1 o AAAA-S2 (semestral)'
                  : informe.periodicidad === 'TRIMESTRAL'
                  ? 'Formato: AAAA-T1, AAAA-T2, AAAA-T3 o AAAA-T4 (trimestral)'
                  : informe.periodicidad === 'MENSUAL'
                  ? 'Formato: AAAA-MM (mensual)'
                  : 'Formato: AAAA (anual)'
                }
              </p>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm"
                placeholder="Descripción o notas adicionales sobre este informe (opcional)"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cerrar
            </button>
            <button
              onClick={handleGenerar}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Generar Informe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}