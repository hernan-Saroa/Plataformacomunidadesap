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

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Calendar, Clock, Search, Download, Eye, CheckCircle2, 
  Plus, Send, Archive, Book,
  CheckSquare, XCircle, Loader, SendHorizonal, Check, X
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

// API
import { controlInternoApi } from './services/api';
import { EntregaInforme, InformeLey } from './services/types';

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
  estadoWorkflow?: 'borrador' | 'en-revision' | 'en-aprobacion' | 'aprobado' | 'rechazado' | 'enviado';
  generadoPor: string;
  archivoUrl?: string;
  observaciones?: string;
  motivoRechazo?: string;
  destinatarios?: string[];
}

type VistaActual = 'catalogo' | 'generados' | 'proximos';


// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export default function InformesLeyModulePremium() {
  const [vistaActiva, setVistaActiva] = useState<VistaActual>('catalogo');
  const [informesGenerados, setInformesGenerados] = useState<InformeGenerado[]>([]);
  const [informesLey, setInformesLey] = useState<InformeLey[]>([]);
  const [cargandoInformes, setCargandoInformes] = useState(true);

  // Función para cargar informes (reutilizable)
  const cargarInformes = async () => {
    try {
      setCargandoInformes(true);
      console.log('📥 Cargando informes desde el servidor...');
      const response = await controlInternoApi.informesLey.getAll();
      console.log('📦 Respuesta recibida:', response);
      
      if (response.success && response.data) {
        // Guardar todos los informes de ley
        setInformesLey(response.data);
        
        // Extraer todas las entregas de todos los informes
        const todasLasEntregas: InformeGenerado[] = [];
        
        response.data.forEach((informe: InformeLey) => {
          if (informe.entregas && informe.entregas.length > 0) {
            informe.entregas.forEach((entrega: EntregaInforme) => {
              // Mapear estado de EntregaInforme a InformeGenerado
              // Priorizar estadoWorkflow sobre estado
              let estado: 'BORRADOR' | 'GENERADO' | 'ENVIADO' | 'ATRASADO' = 'BORRADOR';
              
              // Si tiene estadoWorkflow, usarlo como prioridad
              if (entrega.estadoWorkflow) {
                switch (entrega.estadoWorkflow) {
                  case 'aprobado':
                    estado = 'ENVIADO'; // Aprobado = Enviado
                    break;
                  case 'en-revision':
                  case 'en-aprobacion':
                    estado = 'GENERADO'; // En revisión/aprobación = Generado (visible pero pendiente)
                    break;
                  case 'rechazado':
                    estado = 'BORRADOR'; // Rechazado vuelve a borrador
                    break;
                  case 'borrador':
                  default:
                    estado = entrega.archivoUrl ? 'GENERADO' : 'BORRADOR';
                    break;
                }
              } else {
                // Fallback al estado anterior si no hay estadoWorkflow
                if (entrega.estado === 'entregado') {
                  estado = 'ENVIADO';
                } else if (entrega.estado === 'vencido') {
                  estado = 'ATRASADO';
                } else if (entrega.archivoUrl) {
                  estado = 'GENERADO';
                } else {
                  estado = 'BORRADOR';
                }
              }

              todasLasEntregas.push({
                id: entrega.id,
                informeLeyId: informe.id,
                informeNombre: informe.nombre,
                periodo: entrega.periodo,
                fechaGeneracion: entrega.fechaCreacion || new Date().toISOString(),
                fechaVencimiento: entrega.fechaVencimiento,
                estado,
                estadoWorkflow: entrega.estadoWorkflow || 'borrador',
                generadoPor: entrega.creadoPor || 'Usuario',
                archivoUrl: entrega.archivoUrl,
                observaciones: entrega.observaciones,
                motivoRechazo: entrega.motivoRechazo,
                destinatarios: []
              });
            });
          }
        });

        // Ordenar por fecha de generación (más recientes primero)
        todasLasEntregas.sort((a, b) => 
          new Date(b.fechaGeneracion).getTime() - new Date(a.fechaGeneracion).getTime()
        );

        console.log('📊 Informes mapeados:', todasLasEntregas.map(i => ({
          id: i.id,
          nombre: i.informeNombre,
          periodo: i.periodo,
          estado: i.estado,
          estadoWorkflow: i.estadoWorkflow,
          archivoUrl: i.archivoUrl
        })));

        setInformesGenerados(todasLasEntregas);
      }
    } catch (error) {
      console.error('Error cargando informes:', error);
      toast.error('Error al cargar informes', {
        description: 'No se pudieron cargar los informes'
      });
    } finally {
      setCargandoInformes(false);
    }
  };

  // Cargar informes desde la base de datos
  useEffect(() => {
    cargarInformes();
  }, []);

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
          {vistaActiva === 'catalogo' && <VistaCatalogo onInformeGenerado={cargarInformes} />}
          {vistaActiva === 'generados' && <VistaGenerados informes={informesGenerados} cargandoInformes={cargandoInformes} onInformeActualizado={cargarInformes} />}
          {vistaActiva === 'proximos' && <VistaProximos informesLey={informesLey} cargandoInformes={cargandoInformes} onInformeGenerado={cargarInformes} />}
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

interface VistaCatalogoProps {
  onInformeGenerado?: () => void;
}

function VistaCatalogo({ onInformeGenerado }: VistaCatalogoProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroPeriodicidad, setFiltroPeriodicidad] = useState<PeriodicidadInforme | 'todos'>('todos');
  const [informeSeleccionado, setInformeSeleccionado] = useState<InformeLeyNormativo | null>(null);
  const [informeParaGenerar, setInformeParaGenerar] = useState<InformeLeyNormativo | null>(null);

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

    if (filtroPeriodicidad !== 'todos') {
      resultado = resultado.filter(i => i.periodicidad === filtroPeriodicidad);
    }

    return resultado;
  }, [busqueda, filtroPeriodicidad]);

  const estadisticas = useMemo(() => {
    const total = CATALOGO_INFORMES_LEY.filter(i => i.activo).length;
    const semestrales = CATALOGO_INFORMES_LEY.filter(i => i.activo && i.periodicidad === 'semestral').length;
    const anuales = CATALOGO_INFORMES_LEY.filter(i => i.activo && i.periodicidad === 'anual').length;
    const trimestrales = CATALOGO_INFORMES_LEY.filter(i => i.activo && i.periodicidad === 'trimestral').length;
    const mensuales = CATALOGO_INFORMES_LEY.filter(i => i.activo && i.periodicidad === 'mensual').length;

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
              active={filtroPeriodicidad === 'todos'}
              onClick={() => setFiltroPeriodicidad('todos')}
              label="Todos"
              count={estadisticas.total}
            />
            <FilterButton
              active={filtroPeriodicidad === 'semestral'}
              onClick={() => setFiltroPeriodicidad('semestral')}
              label="Semestral"
              count={estadisticas.semestrales}
              color="purple"
            />
            <FilterButton
              active={filtroPeriodicidad === 'anual'}
              onClick={() => setFiltroPeriodicidad('anual')}
              label="Anual"
              count={estadisticas.anuales}
              color="green"
            />
            <FilterButton
              active={filtroPeriodicidad === 'trimestral'}
              onClick={() => setFiltroPeriodicidad('trimestral')}
              label="Trimestral"
              count={estadisticas.trimestrales}
              color="orange"
            />
            <FilterButton
              active={filtroPeriodicidad === 'mensual'}
              onClick={() => setFiltroPeriodicidad('mensual')}
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
              onGenerarInforme={() => setInformeParaGenerar(informe)}
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

      {/* Modal Generar Informe */}
      {informeParaGenerar && (
        <ModalGenerarInforme 
          informe={informeParaGenerar} 
          onClose={() => setInformeParaGenerar(null)}
          onGenerar={async () => {
            setInformeParaGenerar(null);
            // Recargar informes después de generar
            if (onInformeGenerado) {
              await onInformeGenerado();
            }
          }}
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
  onGenerarInforme: () => void;
}

function CardInforme({ informe, onVerDetalle, onGenerarInforme }: CardInformeProps) {
  const colorPeriodicidad: Record<string, string> = {
    mensual: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    trimestral: 'bg-orange-100 text-orange-700 border-orange-300',
    semestral: 'bg-purple-100 text-purple-700 border-purple-300',
    anual: 'bg-green-100 text-green-700 border-green-300',
    bimestral: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    cuatrimestral: 'bg-pink-100 text-pink-700 border-pink-300'
  };

  // Función para convertir números de mes a nombres de meses
  const obtenerNombresMeses = (mesGeneracion: number | number[]): string => {
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    if (Array.isArray(mesGeneracion)) {
      return mesGeneracion
        .map(mes => nombresMeses[mes - 1])
        .join(', ');
    } else {
      return nombresMeses[mesGeneracion - 1];
    }
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
                    {informe.mesGeneracion ? obtenerNombresMeses(informe.mesGeneracion) : 'No especificado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Descripción */}
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{informe.observaciones || 'Sin descripción disponible'}</p>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Send className="w-3.5 h-3.5" />
                {informe.destinatarios?.join(', ') || 'No especificado'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onVerDetalle}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ver Detalle
                </button>
                <button
                  onClick={onGenerarInforme}
                  className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Generar Informe
                </button>
              </div>
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
  cargandoInformes: boolean;
  onInformeActualizado?: () => void;
}

function VistaGenerados({ informes, cargandoInformes, onInformeActualizado }: VistaGeneradosProps) {
  const estadisticas = useMemo(() => {
    // Contar según estadoWorkflow si existe, sino usar estado
    const enviados = informes.filter(i => 
      i.estadoWorkflow === 'aprobado' || i.estado === 'ENVIADO'
    ).length;
    const borradores = informes.filter(i => 
      i.estadoWorkflow === 'borrador' || i.estadoWorkflow === 'rechazado' || 
      (i.estado === 'BORRADOR' && !i.estadoWorkflow)
    ).length;
    const atrasados = informes.filter(i => i.estado === 'ATRASADO').length;
    const enRevision = informes.filter(i => 
      i.estadoWorkflow === 'en-revision' || i.estadoWorkflow === 'en-aprobacion'
    ).length;

    return { total: informes.length, enviados, borradores, atrasados, enRevision };
  }, [informes]);

  return (
    <div className="mx-auto px-8 py-6 max-w-[1920px]">
      {/* Dashboard */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl text-gray-900 font-medium mb-6">Historial de Informes Generados</h2>

        <div className="grid grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="text-xs text-blue-700 mb-1">Total Generados</div>
            <div className="text-2xl font-semibold text-blue-900">{estadisticas.total}</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="text-xs text-green-700 mb-1">Enviados</div>
            <div className="text-2xl font-semibold text-green-900">{estadisticas.enviados}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
            <div className="text-xs text-purple-700 mb-1">En Revisión</div>
            <div className="text-2xl font-semibold text-purple-900">{estadisticas.enRevision}</div>
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

function CardInformeGenerado({ informe, onInformeActualizado }: { informe: InformeGenerado; onInformeActualizado?: () => void }) {
  const [modalDetalle, setModalDetalle] = useState(false);
  const [modalEnviar, setModalEnviar] = useState(false);
  const [modalAprobar, setModalAprobar] = useState(false);
  const [modalRechazar, setModalRechazar] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Obtener roles del usuario desde localStorage
  const obtenerRolesUsuario = (): { codes: string[]; names: string[] } => {
    try {
      // 1. Intentar desde esap_user_data (guardado por authService)
      const userData = localStorage.getItem('esap_user_data');
      if (userData) {
        const user = JSON.parse(userData);
        console.log('📦 Usuario desde esap_user_data:', user);
        // Los roles pueden venir en diferentes formatos
        if (user.roles && Array.isArray(user.roles)) {
          const codes: string[] = [];
          const names: string[] = [];
          user.roles.forEach((r: any) => {
            if (typeof r === 'string') {
              codes.push(r);
              names.push(r);
            } else if (r && typeof r === 'object') {
              if (r.code) codes.push(r.code);
              if (r.name) names.push(r.name);
            }
          });
          if (codes.length > 0 || names.length > 0) {
            console.log('✅ Roles encontrados en esap_user_data:', { codes, names });
            return { codes, names };
          }
        }
        if (user.role) {
          console.log('✅ Rol único encontrado en esap_user_data:', user.role);
          return { codes: [user.role], names: [user.role] };
        }
      }
      
      // 2. Intentar desde esap-sesion-activa (guardado por App.tsx)
      const sesion = localStorage.getItem('esap-sesion-activa');
      if (sesion) {
        const sesionData = JSON.parse(sesion);
        console.log('📦 Sesión desde esap-sesion-activa:', sesionData);
        
        // Buscar roles directamente en sesionData.roles
        if (sesionData.roles) {
          const roles = Array.isArray(sesionData.roles) ? sesionData.roles : [sesionData.roles];
          console.log('✅ Roles encontrados en esap-sesion-activa.roles:', roles);
          return { codes: roles, names: roles };
        }
        
        // Buscar en sesionData.user.roles (formato usado por App.tsx)
        if (sesionData.user && sesionData.user.roles) {
          const userRoles = sesionData.user.roles;
          const codes: string[] = [];
          const names: string[] = [];
          
          if (Array.isArray(userRoles)) {
            userRoles.forEach((r: any) => {
              if (typeof r === 'string') {
                codes.push(r);
                names.push(r);
              } else if (r && typeof r === 'object') {
                if (r.code) codes.push(r.code);
                if (r.name) names.push(r.name);
              }
            });
          } else {
            codes.push(userRoles);
            names.push(userRoles);
          }
          
          if (codes.length > 0 || names.length > 0) {
            console.log('✅ Roles encontrados en sesion.user.roles:', { codes, names });
            return { codes, names };
          }
        }
        
        // También buscar en userData dentro de la sesión
        if (sesionData.userData && sesionData.userData.roles) {
          const roles = Array.isArray(sesionData.userData.roles) 
            ? sesionData.userData.roles 
            : [sesionData.userData.roles];
          console.log('✅ Roles encontrados en sesion.userData.roles:', roles);
          return { codes: roles, names: roles };
        }
      }
      
      // 3. Intentar decodificar el token JWT para extraer roles
      const token = localStorage.getItem('esap_auth_token') || localStorage.getItem('esap-auth-token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.roles) {
            const roles = Array.isArray(payload.roles) ? payload.roles : [payload.roles];
            console.log('✅ Roles encontrados en JWT token:', roles);
            return { codes: roles, names: roles };
          }
        } catch (e) {
          console.warn('⚠️ No se pudo decodificar el token JWT:', e);
        }
      }
    } catch (error) {
      console.error('❌ Error obteniendo roles del usuario:', error);
    }
    console.warn('⚠️ No se encontraron roles en ningún lugar de localStorage');
    return { codes: [], names: [] };
  };

  const { codes: rolesCodes, names: rolesNames } = obtenerRolesUsuario();
  const todosLosRoles = [...rolesCodes, ...rolesNames];
  
  // Determinar permisos según roles (buscar tanto en codes como en names)
  const esJefeOCI = todosLosRoles.some(rol => {
    const rolUpper = String(rol).toUpperCase();
    return rolUpper.includes('JEFE') || 
           rolUpper === 'JEFE_CONTROL_INTERNO' ||
           rolUpper.includes('JEFE DE CONTROL INTERNO') ||
           String(rol).includes('Jefe de Control Interno') ||
           String(rol).includes('Jefe Control Interno');
  });
  
  const esAuditor = todosLosRoles.some(rol => {
    const rolUpper = String(rol).toUpperCase();
    return rolUpper.includes('AUDITOR') || 
           rolUpper === 'AUDITOR_LIDER' ||
           String(rol).includes('Auditor Líder') ||
           String(rol).includes('Auditor Lider');
  });
  
  // Lógica de permisos según roles:
  // - AUDITOR_LIDER: Solo puede enviar a revisión (cuando tiene archivo y está en borrador/rechazado)
  // - JEFE_CONTROL_INTERNO: Solo puede aprobar/rechazar (cuando está en revisión/aprobación)
  // IMPORTANTE: El Jefe OCI NO puede enviar a revisión, solo aprobar/rechazar
  // IMPORTANTE: Cuando el estado es 'aprobado', ningún botón de acción debe aparecer
  const puedeEnviar = (informe.estadoWorkflow === 'borrador' || informe.estadoWorkflow === 'rechazado') && 
                      informe.archivoUrl && 
                      esAuditor && // SOLO auditores pueden enviar
                      !esJefeOCI && // El jefe NO puede enviar (solo aprobar/rechazar)
                      informe.estadoWorkflow !== 'aprobado'; // No se puede enviar si ya está aprobado
  const puedeAprobar = (informe.estadoWorkflow === 'en-revision' || informe.estadoWorkflow === 'en-aprobacion') && 
                      esJefeOCI && // SOLO el jefe puede aprobar
                      !esAuditor && // Los auditores NO pueden aprobar
                      informe.estadoWorkflow !== 'aprobado'; // No se puede aprobar si ya está aprobado
  const puedeRechazar = (informe.estadoWorkflow === 'en-revision' || informe.estadoWorkflow === 'en-aprobacion') && 
                        esJefeOCI && // SOLO el jefe puede rechazar
                        !esAuditor && // Los auditores NO pueden rechazar
                        informe.estadoWorkflow !== 'aprobado'; // No se puede rechazar si ya está aprobado
  
  // Debug: mostrar roles detectados en consola
  console.log('🔍 Roles detectados:', { 
    rolesCodes, 
    rolesNames, 
    todosLosRoles,
    esJefeOCI, 
    esAuditor, 
    informeEstado: informe.estadoWorkflow,
    tieneArchivo: !!informe.archivoUrl,
    puedeEnviar, 
    puedeAprobar, 
    puedeRechazar 
  });
  
  // Determinar el estado visual basado en estadoWorkflow si existe
  const estadoVisual = informe.estadoWorkflow === 'aprobado' ? 'ENVIADO' :
                       informe.estadoWorkflow === 'en-revision' || informe.estadoWorkflow === 'en-aprobacion' ? 'GENERADO' :
                       informe.estadoWorkflow === 'rechazado' ? 'BORRADOR' :
                       informe.estado;

  const estadoConfig = {
    ENVIADO: { label: 'Enviado', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
    BORRADOR: { label: 'Borrador', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Loader },
    GENERADO: { label: 'Generado', bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckSquare },
    ATRASADO: { label: 'Atrasado', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle }
  };

  const config = estadoConfig[estadoVisual as keyof typeof estadoConfig] || estadoConfig.BORRADOR;

  const Icon = config.icon;

  const handleDescargar = async () => {
    if (!informe.archivoUrl) {
      toast.error('Archivo no disponible', {
        description: 'No hay archivo asociado a este informe',
      });
      return;
    }

    try {
      // Extraer el nombre del archivo de la URL
      // archivoUrl puede ser: "/uploads/informes-ley/archivo.pdf" o "archivo.pdf"
      const nombreArchivo = informe.archivoUrl.split('/').pop() || informe.archivoUrl;
      
      // Construir la URL del endpoint de descarga
      // Usar la misma lógica que getApiBaseUrl() del servicio API
      let apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3007';
      if (apiBaseUrl.includes('/control-institucional')) {
        apiBaseUrl = `${apiBaseUrl}/api/v1`;
      } else if (!apiBaseUrl.includes('/api/v1') && !apiBaseUrl.includes('localhost')) {
        apiBaseUrl = `${apiBaseUrl}/control-institucional/api/v1`;
      }
      const urlDescarga = `${apiBaseUrl}/informes-ley/archivos/${encodeURIComponent(nombreArchivo)}`;

      // Mostrar toast de inicio (solo una vez)
      toast.loading('Descargando Informe', {
        description: `${informe.informeNombre} (${informe.periodo})`,
        id: 'descarga-informe', // ID único para poder actualizar el toast
      });

      // Descargar el archivo
      const response = await fetch(urlDescarga, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('esap_auth_token')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('El archivo no se encuentra en el servidor');
        }
        throw new Error(`Error al descargar: ${response.statusText} (${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${informe.informeNombre.replace(/[^a-z0-9]/gi, '_')}_${informe.periodo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Actualizar el toast a éxito
      toast.success('Archivo descargado', {
        description: 'El informe se ha descargado correctamente',
        id: 'descarga-informe',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error descargando archivo:', error);
      const mensajeError = error instanceof Error 
        ? error.message 
        : 'Error desconocido al descargar el archivo';
      
      // Actualizar el toast a error
      toast.error('Error al descargar', {
        description: mensajeError.includes('no se encuentra') || mensajeError.includes('404')
          ? 'El archivo no está disponible en el servidor'
          : mensajeError,
        id: 'descarga-informe',
        duration: 4000,
      });
    }
  };

  const handleVerDetalle = () => {
    setModalDetalle(true);
  };

  const handleEnviarRevision = async (observaciones?: string) => {
    setProcesando(true);
    try {
      console.log('📤 Enviando informe a revisión:', { informeId: informe.informeLeyId, entregaId: informe.id });
      const response = await controlInternoApi.informesLey.enviarRevision(
        informe.informeLeyId,
        informe.id,
        { observaciones }
      );

      console.log('✅ Respuesta del servidor:', response);

      if (response.success) {
        toast.success('Informe enviado a revisión', {
          description: 'El informe ha sido enviado al Jefe OCI para revisión',
        });
        setModalEnviar(false);
        if (onInformeActualizado) {
          console.log('🔄 Recargando informes después de enviar a revisión...');
          await onInformeActualizado();
          console.log('✅ Informes recargados');
        }
      } else {
        throw new Error(response.error || 'Error al enviar a revisión');
      }
    } catch (error) {
      console.error('❌ Error enviando a revisión:', error);
      toast.error('Error al enviar a revisión', {
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleAprobar = async (observaciones?: string) => {
    setProcesando(true);
    try {
      console.log('✅ Aprobando informe:', { informeId: informe.informeLeyId, entregaId: informe.id });
      const response = await controlInternoApi.informesLey.aprobar(
        informe.informeLeyId,
        informe.id,
        { observaciones }
      );

      console.log('✅ Respuesta del servidor al aprobar:', response);

      if (response.success) {
        toast.success('Informe aprobado', {
          description: 'El informe ha sido aprobado exitosamente',
        });
        setModalAprobar(false);
        if (onInformeActualizado) {
          console.log('🔄 Recargando informes después de aprobar...');
          await onInformeActualizado();
          console.log('✅ Informes recargados');
        }
      } else {
        throw new Error(response.error || 'Error al aprobar');
      }
    } catch (error) {
      console.error('❌ Error aprobando:', error);
      toast.error('Error al aprobar', {
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setProcesando(false);
    }
  };

  // Determinar qué acciones están disponibles según el estado (sin validación de rol aquí, se hace arriba)
  const estadoPermiteEnviar = informe.estadoWorkflow === 'borrador' || informe.estadoWorkflow === 'rechazado';
  const estadoPermiteAprobar = informe.estadoWorkflow === 'en-revision' || informe.estadoWorkflow === 'en-aprobacion';

  const handleRechazar = async (motivoRechazo: string, observaciones?: string) => {
    if (!motivoRechazo.trim()) {
      toast.error('El motivo de rechazo es obligatorio');
      return;
    }

    setProcesando(true);
    try {
      const response = await controlInternoApi.informesLey.rechazar(
        informe.informeLeyId,
        informe.id,
        { motivoRechazo, observaciones }
      );

      if (response.success) {
        toast.success('Informe rechazado', {
          description: 'El informe ha sido rechazado. El auditor puede corregirlo y volver a enviarlo.',
        });
        setModalRechazar(false);
        if (onInformeActualizado) {
          await onInformeActualizado();
        }
      } else {
        throw new Error(response.error || 'Error al rechazar');
      }
    } catch (error) {
      console.error('Error rechazando:', error);
      toast.error('Error al rechazar', {
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setProcesando(false);
    }
  };


  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-base text-gray-900 font-medium">{informe.informeNombre}</h3>
            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.text} flex items-center gap-1`}>
              <Icon className="w-3 h-3" />
              {config.label}
            </span>
            {informe.estadoWorkflow && (
              <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                informe.estadoWorkflow === 'aprobado' ? 'bg-green-100 text-green-700' :
                informe.estadoWorkflow === 'en-revision' ? 'bg-blue-100 text-blue-700' :
                informe.estadoWorkflow === 'rechazado' ? 'bg-red-100 text-red-700' :
                informe.estadoWorkflow === 'en-aprobacion' ? 'bg-purple-100 text-purple-700' :
                'bg-gray-100 text-gray-700'
              } flex items-center gap-1`}>
                {informe.estadoWorkflow === 'aprobado' ? '✓ Aprobado' :
                 informe.estadoWorkflow === 'en-revision' ? '👁️ En Revisión' :
                 informe.estadoWorkflow === 'rechazado' ? '✗ Rechazado' :
                 informe.estadoWorkflow === 'en-aprobacion' ? '⏳ En Aprobación' :
                 '📝 Borrador'}
              </span>
            )}
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

        <div className="flex gap-2 flex-wrap">
          {informe.archivoUrl && (
            <button 
              onClick={handleDescargar}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar
            </button>
          )}
          
          {/* Botones de workflow según estado */}
          {/* Solo mostrar botones si el estado NO es 'aprobado' */}
          {puedeEnviar && informe.archivoUrl && informe.estadoWorkflow !== 'aprobado' && (
            <button 
              onClick={() => setModalEnviar(true)}
              disabled={procesando}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SendHorizonal className="w-4 h-4" />
              Enviar a Revisión
            </button>
          )}
          
          {puedeAprobar && informe.estadoWorkflow !== 'aprobado' && (
            <>
              <button 
                onClick={() => setModalAprobar(true)}
                disabled={procesando}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                Aprobar
              </button>
              <button 
                onClick={() => setModalRechazar(true)}
                disabled={procesando || informe.estadoWorkflow === 'aprobado'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                Rechazar
              </button>
            </>
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
          onInformeActualizado={onInformeActualizado}
        />
      )}

      {/* Modal Enviar a Revisión */}
      {modalEnviar && (
        <ModalEnviarRevision
          informe={informe}
          onClose={() => setModalEnviar(false)}
          onEnviar={handleEnviarRevision}
          procesando={procesando}
        />
      )}

      {/* Modal Aprobar */}
      {modalAprobar && (
        <ModalAprobarInforme
          informe={informe}
          onClose={() => setModalAprobar(false)}
          onAprobar={handleAprobar}
          procesando={procesando}
        />
      )}

      {/* Modal Rechazar */}
      {modalRechazar && (
        <ModalRechazarInforme
          informe={informe}
          onClose={() => setModalRechazar(false)}
          onRechazar={handleRechazar}
          procesando={procesando}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: PRÓXIMOS A VENCER
// ════════════════════════════════════════════════════════════════════════════

interface VistaProximosProps {
  informesLey: InformeLey[];
  cargandoInformes: boolean;
  onInformeGenerado?: () => void;
}

function VistaProximos({ informesLey, cargandoInformes, onInformeGenerado }: VistaProximosProps) {
  const [informeSeleccionado, setInformeSeleccionado] = useState<InformeLeyNormativo | null>(null);
  
  // Calcular entregas próximas a vencer (dentro de 60 días)
  const proximosInformes = useMemo(() => {
    const ahora = new Date();
    const ahoraMs = ahora.getTime();
    const msEnUnDia = 1000 * 60 * 60 * 24;
    const msEn60Dias = 60 * msEnUnDia;

    // Recorrer todos los informes y sus entregas
    const entregasProximas: Array<{
      entrega: EntregaInforme;
      informe: InformeLey;
      diasRestantes: number;
      semaforo: 'rojo' | 'amarillo' | 'verde';
    }> = [];

    informesLey.forEach((informe) => {
      if (!informe.activo) return;
      
      if (informe.entregas && informe.entregas.length > 0) {
        informe.entregas.forEach((entrega) => {
          const fechaVencimiento = new Date(entrega.fechaVencimiento);
          const fechaVencimientoMs = fechaVencimiento.getTime();
          const diferenciaMs = fechaVencimientoMs - ahoraMs;
          const diasRestantes = Math.ceil(diferenciaMs / msEnUnDia);
          
          // Solo incluir si está dentro de los próximos 60 días (incluyendo vencidos)
          if (diferenciaMs <= msEn60Dias) {
            const semaforo: 'rojo' | 'amarillo' | 'verde' = 
              diasRestantes < 0 ? 'rojo' : 
              diasRestantes <= 7 ? 'rojo' : 
              diasRestantes <= 15 ? 'amarillo' : 
              'verde';
            
            entregasProximas.push({
              entrega,
              informe,
              diasRestantes,
              semaforo
            });
          }
        });
      }
    });

    // Ordenar por días restantes (más urgentes primero)
    entregasProximas.sort((a, b) => a.diasRestantes - b.diasRestantes);

    return entregasProximas;
  }, [informesLey]);

  // Buscar el informe del catálogo para obtener los datos normativos
  const obtenerInformeCatalogo = (informeLey: InformeLey): InformeLeyNormativo | null => {
    // Intentar encontrar por ID o código
    return CATALOGO_INFORMES_LEY.find(inf => inf.id === informeLey.id || inf.codigo === informeLey.codigo) || null;
  };

  const handleGenerarAhora = (informeLey: InformeLey) => {
    const informeCatalogo = obtenerInformeCatalogo(informeLey);
    if (informeCatalogo) {
      setInformeSeleccionado(informeCatalogo);
    }
    
    toast.info('Generar informe próximo a vencer', {
      description: `${informeLey.nombre}`,
      duration: 2000,
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
          {cargandoInformes ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Loader className="w-8 h-8 animate-spin text-[#1e5da8] mx-auto mb-4" />
              <p className="text-gray-600">Cargando informes próximos a vencer...</p>
            </div>
          ) : proximosInformes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-base text-gray-900 mb-2">No hay informes próximos a vencer</h3>
              <p className="text-sm text-gray-600">Todos los informes están al día</p>
            </div>
          ) : (
            proximosInformes.map((item) => {
              const { entrega, informe, diasRestantes, semaforo } = item;
              const informeCatalogo = obtenerInformeCatalogo(informe);
              return (
                <div key={entrega.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start gap-6">
                    <div className={`w-3 h-3 rounded-full mt-2 ${
                      semaforo === 'verde' ? 'bg-green-500' :
                      semaforo === 'amarillo' ? 'bg-amber-500' :
                      'bg-red-500'
                    }`} />

                    <div className="flex-1">
                      <h3 className="text-base text-gray-900 font-medium mb-2">{informe.nombre}</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Periodo:</span>
                          <span className="ml-2 text-gray-900 font-medium">{entrega.periodo}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Vencimiento:</span>
                          <span className="ml-2 text-gray-900 font-medium">
                            {new Date(entrega.fechaVencimiento).toLocaleDateString('es-CO', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Días restantes:</span>
                          <span className={`ml-2 font-medium ${
                            diasRestantes < 0 ? 'text-red-600' :
                            diasRestantes <= 7 ? 'text-red-600' :
                            diasRestantes <= 15 ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {diasRestantes < 0 ? `Vencido (${Math.abs(diasRestantes)} días)` : `${diasRestantes} días`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          entrega.estado === 'entregado' ? 'bg-green-100 text-green-700' :
                          entrega.estado === 'vencido' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {entrega.estado}
                        </span>
                        <span className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700">
                          {informe.periodicidad}
                        </span>
                        <span className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                          {informe.categoria}
                        </span>
                      </div>

                      {entrega.observaciones && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mb-3">
                          {entrega.observaciones}
                        </div>
                      )}
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
              );
            })
          )}
        </div>
      </div>

      {/* Modal Generar Informe */}
      {informeSeleccionado && (
        <ModalGenerarInforme 
          informe={informeSeleccionado} 
          onClose={() => setInformeSeleccionado(null)}
          onGenerar={async () => {
            setInformeSeleccionado(null);
            // Recargar informes después de generar
            if (onInformeGenerado) {
              await onInformeGenerado();
            }
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
  // Función para convertir números de mes a nombres de meses
  const obtenerNombresMeses = (mesGeneracion: number | number[]): string => {
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    if (Array.isArray(mesGeneracion)) {
      return mesGeneracion
        .map(mes => nombresMeses[mes - 1])
        .join(', ');
    } else {
      return nombresMeses[mesGeneracion - 1];
    }
  };

  return (
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
            <div className="text-sm text-gray-900">
              {informe.mesGeneracion ? obtenerNombresMeses(informe.mesGeneracion) : 'No especificado'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-600 mb-1">Destinatarios</div>
            <div className="text-sm text-gray-900">{informe.destinatarios?.join(', ') || 'No especificado'}</div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm text-gray-900 font-medium mb-2">Descripción</h3>
          <p className="text-sm text-gray-700">{informe.observaciones || 'Sin descripción disponible'}</p>
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
// MODAL: DETALLE INFORME GENERADO
// ════════════════════════════════════════════════════════════════════════════

interface ModalDetalleInformeGeneradoProps {
  informe: InformeGenerado;
  onClose: () => void;
  onInformeActualizado?: () => void;
}

function ModalDetalleInformeGenerado({ informe, onClose, onInformeActualizado }: ModalDetalleInformeGeneradoProps) {
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubirArchivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido', {
        description: 'Solo se permiten archivos PDF, Word (.doc, .docx) y Excel (.xls, .xlsx)',
      });
      return;
    }

    // Validar tamaño (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Archivo muy grande', {
        description: 'El archivo no puede ser mayor a 50MB',
      });
      return;
    }

    setSubiendoArchivo(true);
    try {
      const response = await controlInternoApi.informesLey.uploadArchivo(informe.id, file);
      
      if (response.success) {
        toast.success('Archivo subido exitosamente', {
          description: 'El archivo se ha asociado al informe correctamente',
        });
        // Recargar informes si hay callback
        if (onInformeActualizado) {
          await onInformeActualizado();
        } else {
          // Fallback: recargar página
          window.location.reload();
        }
      } else {
        throw new Error(response.error || 'Error al subir archivo');
      }
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      toast.error('Error al subir archivo', {
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setSubiendoArchivo(false);
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
            <div className="text-xs text-gray-600 mb-1">Estado Workflow</div>
            <div className="text-sm text-gray-900">
              {informe.estadoWorkflow === 'aprobado' ? '✓ Aprobado' :
               informe.estadoWorkflow === 'en-revision' ? '👁️ En Revisión' :
               informe.estadoWorkflow === 'rechazado' ? '✗ Rechazado' :
               informe.estadoWorkflow === 'en-aprobacion' ? '⏳ En Aprobación' :
               informe.estadoWorkflow === 'enviado' ? '📤 Enviado' :
               '📝 Borrador'}
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

        {informe.motivoRechazo && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm text-red-900 font-medium mb-2">Motivo de Rechazo</h3>
            <p className="text-sm text-red-700">{informe.motivoRechazo}</p>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm text-gray-900 font-medium mb-2">Observaciones</h3>
          <p className="text-sm text-gray-700">{informe.observaciones || 'Sin observaciones'}</p>
        </div>

        {/* Sección de Archivo */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm text-gray-900 font-medium mb-3">Archivo del Informe</h3>
          {informe.archivoUrl ? (
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-700">Archivo asociado</span>
              <button
                onClick={handleDescargar}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">No hay archivo asociado a este informe</p>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleSubirArchivo}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm cursor-pointer ${
                    subiendoArchivo ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {subiendoArchivo ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Subir Archivo
                    </>
                  )}
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Formatos permitidos: PDF, Word (.doc, .docx), Excel (.xls, .xlsx). Máximo 50MB
                </p>
              </div>
            </div>
          )}
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
  const [generando, setGenerando] = useState(false);
  const [previewDatos, setPreviewDatos] = useState<any>(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  // Forzar formato anual (AAAA) para el periodo:
  // - Para todos los informes cuya periodicidad sea anual
  // - Y de forma explícita para el Informe Pormenorizado (INF-PORM),
  //   que funcionalmente se maneja por año aunque sea semestral en el catálogo.
  const esPeriodoAnual =
    informe.periodicidad === 'anual' || informe.codigo === 'INF-PORM';

  // Buscar el informe en la base de datos para obtener el ID real
  const [informeLeyId, setInformeLeyId] = useState<string | null>(null);

  useEffect(() => {
    const buscarInformeLey = async () => {
      try {
        const response = await controlInternoApi.informesLey.getAll();
        if (response.success && response.data) {
          // Verificar si hay informes en la BD
          if (response.data.length === 0) {
            console.log('⚠️ No hay informes registrados en la base de datos. El informe se creará automáticamente al generar.');
            return;
          }
          
          // Buscar por código o nombre
          const informeEncontrado = response.data.find(
            (inf: InformeLey) => 
              inf.codigo === informe.codigo || 
              inf.nombre === informe.nombre ||
              inf.nombre.toLowerCase().includes(informe.nombreCorto.toLowerCase())
          );
          if (informeEncontrado) {
            setInformeLeyId(informeEncontrado.id);
            console.log('✅ Informe encontrado en BD:', informeEncontrado.codigo);
          } else {
            console.log('ℹ️ Informe no encontrado en BD. Se creará automáticamente al generar.');
          }
        } else {
          console.warn('⚠️ Error al obtener informes de la BD:', response.error);
        }
      } catch (error) {
        console.error('❌ Error buscando informe:', error);
      }
    };
    buscarInformeLey();
  }, [informe]);

  const handlePeriodoChange = (valor: string) => {
    // Si el periodo es anual, solo permitimos dígitos y máximo 4 caracteres (AAAA)
    if (esPeriodoAnual) {
      const soloNumeros = valor.replace(/\D/g, '').slice(0, 4);
      setPeriodo(soloNumeros);
      return;
    }
    setPeriodo(valor);
  };

  const handlePreview = async () => {
    if (!periodo.trim()) {
      toast.error('Ingresa un periodo para ver el preview');
      return;
    }

    // Validar formato anual cuando aplique
    if (esPeriodoAnual && !/^\d{4}$/.test(periodo.trim())) {
      toast.error('El periodo debe ser un año en formato AAAA');
      return;
    }

    try {
      setMostrarPreview(true);
      // Mostrar preview de datos automáticos
      toast.info('Preview de datos automáticos', {
        description: 'Los datos se poblarán automáticamente al generar el informe',
      });
    } catch (error) {
      console.error('Error en preview:', error);
      toast.error('Error al mostrar preview');
    }
  };

  const handleGenerar = async () => {
    // Validaciones
    if (!periodo.trim()) {
      toast.error('El periodo es obligatorio');
      return;
    }

    // Validar formato anual cuando aplique
    if (esPeriodoAnual && !/^\d{4}$/.test(periodo.trim())) {
      toast.error('El periodo debe ser un año en formato AAAA (por ejemplo, 2024)');
      return;
    }

    // Si no se encuentra el informe en la BD, intentar buscarlo de nuevo o crearlo
    let idParaGenerar = informeLeyId;
    
    if (!idParaGenerar) {
      // Intentar buscar de nuevo
      try {
        const response = await controlInternoApi.informesLey.getAll();
        if (response.success && response.data) {
          const informeEncontrado = response.data.find(
            (inf: InformeLey) => 
              inf.codigo === informe.codigo || 
              inf.nombre === informe.nombre ||
              inf.nombre.toLowerCase().includes(informe.nombreCorto.toLowerCase())
          );
          if (informeEncontrado) {
            idParaGenerar = informeEncontrado.id;
            setInformeLeyId(informeEncontrado.id);
          }
        }
      } catch (error) {
        console.error('Error buscando informe:', error);
      }
    }

    // Si aún no se encuentra, crear el informe automáticamente
    if (!idParaGenerar) {
      try {
        toast.info('Creando informe en la base de datos...', {
          description: 'El informe no estaba registrado, se creará automáticamente',
        });

        // Mapear datos del catálogo al formato de la BD
        // Mapear categoría desde vinculacionRol
        const mapeoCategoria: Record<string, 'financiero' | 'administrativo' | 'contractual' | 'talento-humano' | 'transparencia' | 'control'> = {
          'enfoque-prevencion': 'control',
          'evaluacion-gestion': 'administrativo',
          'seguimiento': 'administrativo',
          'relacion-control-externo': 'control',
          'gestion-conocimiento': 'administrativo',
        };
        
        const categoria = mapeoCategoria[informe.vinculacionRol || ''] || 'control';
        
        // Calcular diaPresentacion basado en los meses de generación
        // Para informes semestrales (febrero y agosto), usar día 28 (últimos días del mes)
        // Para informes anuales en febrero, usar día 28
        // Para otros casos, usar día 15 por defecto
        const mesesGeneracion = Array.isArray(informe.mesGeneracion) 
          ? informe.mesGeneracion 
          : [informe.mesGeneracion];
        
        let diaPresentacion = 15; // Día por defecto
        if (mesesGeneracion.length > 0) {
          const primerMes = mesesGeneracion[0];
          // Si es febrero (2) o agosto (8), usar día 28 (últimos días hábiles)
          if (primerMes === 2 || primerMes === 8) {
            diaPresentacion = 28;
          } else if (primerMes === 1 || primerMes === 12) {
            // Enero o diciembre, usar día 31
            diaPresentacion = 31;
          } else {
            // Otros meses, usar día 15
            diaPresentacion = 15;
          }
        }
        
        const informeParaCrear: Partial<InformeLey> = {
          codigo: informe.codigo,
          nombre: informe.nombre,
          descripcion: informe.observaciones || informe.nombre,
          fundamentoLegal: informe.baseNormativa,
          categoria: categoria,
          periodicidad: informe.periodicidad,
          diaPresentacion: diaPresentacion,
          entidadDestino: informe.destinatarios?.join(', ') || undefined,
          responsable: informe.responsableRol || 'Jefe OCI',
          area: 'Control Interno', // Área por defecto para informes de control interno
          areaResponsable: informe.responsableRol || 'Jefe OCI',
          diasAnticipacion: informe.diasAnticipacion || 15,
          activo: true,
        };

        const createResponse = await controlInternoApi.informesLey.create(informeParaCrear);
        
        if (createResponse.success && createResponse.data) {
          idParaGenerar = createResponse.data.id;
          setInformeLeyId(createResponse.data.id);
          toast.success('Informe creado exitosamente', {
            description: 'Ahora se procederá a generar el informe',
            duration: 2000,
          });
        } else {
          throw new Error(createResponse.error || 'Error al crear el informe');
        }
      } catch (error) {
        console.error('Error creando informe:', error);
        toast.error('Error al crear el informe', {
          description: error instanceof Error ? error.message : 'No se pudo crear el informe en la base de datos',
        });
        return;
      }
    }

    setGenerando(true);

    try {
      const response = await controlInternoApi.informesLey.generar(idParaGenerar, {
        periodo: periodo.trim(),
        datosAdicionales: descripcion ? { observaciones: descripcion } : undefined,
      });

      if (response.success && response.data) {
        toast.success('Informe Generado Exitosamente', {
          description: `${informe.nombreCorto} - Periodo ${periodo}`,
          duration: 4000,
        });

        // Cerrar modal y recargar
        onGenerar();
        onClose();
      } else {
        throw new Error(response.error || 'Error al generar el informe');
      }
    } catch (error) {
      console.error('Error generando informe:', error);
      toast.error('Error al generar el informe', {
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div 
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <h3 className="text-xl font-medium">Generar Informe</h3>
          <p className="text-sm text-blue-100 mt-1">{informe.nombreCorto}</p>
        </div>

        {/* Contenido */}
        <div className="px-6 py-6">
          <div className="space-y-4">
            {/* Información del informe */}
            {informe.datosAutomaticos && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Este informe se generará con datos automáticos del sistema</span>
                </div>
              </div>
            )}

            {/* Periodo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Periodo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={periodo}
                onChange={(e) => handlePeriodoChange(e.target.value)}
                placeholder={esPeriodoAnual ? 'Ej: 2024' : informe.periodicidad === 'semestral' ? 'Ej: 2025-S1' : 'Ej: 2024'}
                disabled={generando}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-600 mt-1">
                {esPeriodoAnual 
                  ? 'Formato: AAAA (anual)'
                  : informe.periodicidad === 'trimestral'
                  ? 'Formato: AAAA-T1, AAAA-T2, AAAA-T3 o AAAA-T4 (trimestral)'
                  : informe.periodicidad === 'mensual'
                  ? 'Formato: AAAA-MM (mensual)'
                  : informe.periodicidad === 'semestral'
                  ? 'Formato: AAAA-S1 o AAAA-S2 (semestral)'
                  : 'Formato de periodo según configuración del informe'
                }
              </p>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones (opcional)
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                disabled={generando}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Observaciones o notas adicionales sobre este informe"
              />
            </div>

            {/* Preview de datos automáticos */}
            {mostrarPreview && informe.datosAutomaticos && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Datos que se incluirán automáticamente:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Total de auditorías programadas y completadas</li>
                  <li>• Hallazgos identificados y críticos</li>
                  <li>• Planes de mejoramiento activos</li>
                  <li>• Indicadores de cumplimiento</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-between items-center">
            {informe.datosAutomaticos && (
              <button
                onClick={handlePreview}
                disabled={generando || !periodo?.trim()}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye className="w-4 h-4" />
                Ver Preview
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button
                onClick={onClose}
                disabled={generando}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerar}
                disabled={generando || !periodo?.trim()}
                className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generando ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Generar Informe
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODALES DE WORKFLOW
// ════════════════════════════════════════════════════════════════════════════

interface ModalEnviarRevisionProps {
  informe: InformeGenerado;
  onClose: () => void;
  onEnviar: (observaciones?: string) => Promise<void>;
  procesando: boolean;
}

function ModalEnviarRevision({ informe, onClose, onEnviar, procesando }: ModalEnviarRevisionProps) {
  const [observaciones, setObservaciones] = useState('');

  const handleSubmit = async () => {
    await onEnviar(observaciones.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div 
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-xl">
          <h3 className="text-xl font-medium">Enviar a Revisión</h3>
          <p className="text-sm text-blue-100 mt-1">{informe.informeNombre}</p>
        </div>

        <div className="px-6 py-6">
          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-4">
              El informe será enviado al Jefe OCI para revisión. ¿Deseas agregar alguna observación?
            </p>
            
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={4}
              disabled={procesando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Observaciones adicionales sobre el informe..."
            />
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={procesando}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={procesando}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {procesando ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <SendHorizonal className="w-4 h-4" />
                  Enviar a Revisión
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ModalAprobarInformeProps {
  informe: InformeGenerado;
  onClose: () => void;
  onAprobar: (observaciones?: string) => Promise<void>;
  procesando: boolean;
}

function ModalAprobarInforme({ informe, onClose, onAprobar, procesando }: ModalAprobarInformeProps) {
  const [observaciones, setObservaciones] = useState('');

  const handleSubmit = async () => {
    await onAprobar(observaciones.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div 
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-t-xl">
          <h3 className="text-xl font-medium">Aprobar Informe</h3>
          <p className="text-sm text-green-100 mt-1">{informe.informeNombre}</p>
        </div>

        <div className="px-6 py-6">
          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-4">
              ¿Estás seguro de que deseas aprobar este informe? El informe quedará marcado como aprobado.
            </p>
            
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={4}
              disabled={procesando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Observaciones sobre la aprobación..."
            />
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={procesando}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={procesando}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {procesando ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Aprobando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Aprobar Informe
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ModalRechazarInformeProps {
  informe: InformeGenerado;
  onClose: () => void;
  onRechazar: (motivoRechazo: string, observaciones?: string) => Promise<void>;
  procesando: boolean;
}

function ModalRechazarInforme({ informe, onClose, onRechazar, procesando }: ModalRechazarInformeProps) {
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const handleSubmit = async () => {
    if (!motivoRechazo.trim()) {
      toast.error('El motivo de rechazo es obligatorio');
      return;
    }
    await onRechazar(motivoRechazo.trim(), observaciones.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div 
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-t-xl">
          <h3 className="text-xl font-medium">Rechazar Informe</h3>
          <p className="text-sm text-red-100 mt-1">{informe.informeNombre}</p>
        </div>

        <div className="px-6 py-6">
          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-4">
              El informe será rechazado y el auditor podrá corregirlo y volver a enviarlo.
            </p>
            
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de rechazo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              rows={3}
              disabled={procesando}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Describe el motivo del rechazo..."
            />
            
            <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
              Observaciones adicionales (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              disabled={procesando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Observaciones adicionales..."
            />
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={procesando}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={procesando || !motivoRechazo.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {procesando ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Rechazando...
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  Rechazar Informe
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}