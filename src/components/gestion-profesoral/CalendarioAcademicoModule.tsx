/**
 * MÓDULO - CALENDARIO ACADÉMICO ESAP
 * Basado en Resolución SC-1676 del 23 de septiembre de 2025
 * Sistema completo de gestión del calendario académico interactivo
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, List, GraduationCap, Bell, Download,
  Filter, Search, ChevronLeft, ChevronRight, Clock,
  MapPin, Users, FileText, AlertCircle, CheckCircle2,
  XCircle, Calendar as CalendarIcon
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { EVENTOS_2026_1, ESTADISTICAS_CALENDARIO } from '../../data/calendario-academico-2026';
import { CATEGORIA_COLORS } from '../../types/calendario-academico.types';
import type { 
  EventoCalendario, 
  TabCalendario, 
  FiltrosCalendario,
  CategoriaEvento,
  TipoUsuario,
  TipoPrograma
} from '../../types/calendario-academico.types';

export function CalendarioAcademicoModule() {
  const [tabActual, setTabActual] = useState<TabCalendario>('calendario');
  const [filtros, setFiltros] = useState<FiltrosCalendario>({
    periodo: '2026-1',
    tipoUsuario: 'todos',
    programa: 'todos',
    categoria: 'todas',
    estado: 'todos',
    busqueda: '',
  });

  // Filtrar eventos
  const eventosFiltrados = useMemo(() => {
    return EVENTOS_2026_1.filter(evento => {
      // Filtro por búsqueda
      if (filtros.busqueda) {
        const searchLower = filtros.busqueda.toLowerCase();
        const matchNombre = evento.nombre.toLowerCase().includes(searchLower);
        const matchDescripcion = evento.descripcion.toLowerCase().includes(searchLower);
        const matchId = evento.id.toLowerCase().includes(searchLower);
        if (!matchNombre && !matchDescripcion && !matchId) return false;
      }

      // Filtro por categoría
      if (filtros.categoria !== 'todas' && evento.categoria !== filtros.categoria) {
        return false;
      }

      // Filtro por tipo de usuario
      if (filtros.tipoUsuario !== 'todos' && !evento.aplicaA.includes(filtros.tipoUsuario as TipoUsuario)) {
        return false;
      }

      // Filtro por programa
      if (filtros.programa !== 'todos' && evento.programas && !evento.programas.includes(filtros.programa as TipoPrograma)) {
        return false;
      }

      return true;
    });
  }, [filtros]);

  const handleActualizarFiltro = (key: keyof FiltrosCalendario, value: any) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
  };

  const handleExportar = () => {
    toast.success('Exportando calendario académico...');
  };

  const renderTabContent = () => {
    switch (tabActual) {
      case 'calendario':
        return <VistaCalendario eventos={eventosFiltrados} />;
      case 'periodos':
        return <VistaPeriodos eventos={eventosFiltrados} />;
      case 'grados':
        return <VistaGrados eventos={eventosFiltrados} />;
      case 'alertas':
        return <VistaAlertas eventos={eventosFiltrados} />;
      case 'exportar':
        return <VistaExportar />;
      default:
        return <VistaCalendario eventos={eventosFiltrados} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003DA5] to-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            Calendario Académico 2026
          </h1>
          <p className="text-gray-600 mt-1">
            Basado en Resolución SC-1676 del 23 de septiembre de 2025
          </p>
        </div>

        <Button
          onClick={handleExportar}
          className="gap-2 bg-[#003DA5] hover:bg-[#002d7a]"
        >
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          icon={Calendar}
          label="Total Eventos"
          value={ESTADISTICAS_CALENDARIO.totalEventos2026_1}
          color="blue"
        />
        <StatsCard
          icon={Users}
          label="Inscripciones"
          value={ESTADISTICAS_CALENDARIO.eventosInscripcion}
          color="purple"
        />
        <StatsCard
          icon={FileText}
          label="Matrícula"
          value={ESTADISTICAS_CALENDARIO.eventosMatricula}
          color="green"
        />
        <StatsCard
          icon={Clock}
          label="Duración"
          value={`${ESTADISTICAS_CALENDARIO.duracionPeriodo} semanas`}
          color="orange"
        />
      </div>

      {/* Tabs de navegación */}
      <Card className="p-1">
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
          <TabButton
            icon={Calendar}
            label="Calendario"
            isActive={tabActual === 'calendario'}
            onClick={() => setTabActual('calendario')}
          />
          <TabButton
            icon={List}
            label="Períodos"
            isActive={tabActual === 'periodos'}
            onClick={() => setTabActual('periodos')}
          />
          <TabButton
            icon={GraduationCap}
            label="Grados"
            isActive={tabActual === 'grados'}
            onClick={() => setTabActual('grados')}
          />
          <TabButton
            icon={Bell}
            label="Alertas"
            isActive={tabActual === 'alertas'}
            onClick={() => setTabActual('alertas')}
          />
          <TabButton
            icon={Download}
            label="Exportar"
            isActive={tabActual === 'exportar'}
            onClick={() => setTabActual('exportar')}
          />
        </div>
      </Card>

      {/* Barra de Filtros Sticky */}
      <Card className="p-4 sticky top-4 z-10 shadow-lg">
        <div className="space-y-3">
          {/* Primera fila de filtros */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Período */}
            <select
              value={filtros.periodo}
              onChange={(e) => handleActualizarFiltro('periodo', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
            >
              <option value="2026-1">2026-1 (Primer semestre)</option>
              <option value="interperiodo">Inter-período</option>
              <option value="2026-2">2026-2 (Segundo semestre)</option>
              <option value="todos">Todo el año 2026</option>
            </select>

            {/* Tipo de Usuario */}
            <select
              value={filtros.tipoUsuario}
              onChange={(e) => handleActualizarFiltro('tipoUsuario', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
            >
              <option value="todos">Todos los usuarios</option>
              <option value="aspirante">Aspirante</option>
              <option value="estudiante_nuevo">Estudiante nuevo</option>
              <option value="estudiante_antiguo">Estudiante antiguo</option>
              <option value="docente">Docente</option>
              <option value="administrativo">Administrativo</option>
            </select>

            {/* Programa */}
            <select
              value={filtros.programa}
              onChange={(e) => handleActualizarFiltro('programa', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
            >
              <option value="todos">Todos los programas</option>
              <option value="pregrado_presencial">Pregrado presencial</option>
              <option value="apt">APT</option>
              <option value="especializacion">Especialización</option>
              <option value="maestria">Maestría</option>
            </select>

            {/* Categoría */}
            <select
              value={filtros.categoria}
              onChange={(e) => handleActualizarFiltro('categoria', e.target.value as CategoriaEvento | 'todas')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
            >
              <option value="todas">Todas las categorías</option>
              <option value="inscripcion">Inscripciones</option>
              <option value="matricula">Matrícula</option>
              <option value="situaciones">Situaciones académicas</option>
              <option value="desarrollo">Desarrollo de clases</option>
              <option value="calificaciones">Calificaciones</option>
              <option value="grados">Grados</option>
              <option value="recesos">Recesos</option>
              <option value="administrativo">Administrativo</option>
            </select>

            {/* Estado */}
            <select
              value={filtros.estado}
              onChange={(e) => handleActualizarFiltro('estado', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
            >
              <option value="todos">Todos los estados</option>
              <option value="proximo">Próximo (+ 7 días)</option>
              <option value="esta_semana">Esta semana</option>
              <option value="en_curso">En curso</option>
              <option value="finalizado">Finalizado</option>
              <option value="urgente">Urgente (- 3 días)</option>
            </select>
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar evento por nombre, descripción o ID..."
              value={filtros.busqueda}
              onChange={(e) => handleActualizarFiltro('busqueda', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Contador de resultados */}
          <div className="text-sm text-gray-600">
            Mostrando <span className="font-semibold text-[#003DA5]">{eventosFiltrados.length}</span> de {EVENTOS_2026_1.length} eventos
          </div>
        </div>
      </Card>

      {/* Contenido de la tab actual */}
      {renderTabContent()}
    </div>
  );
}

// ============================================================================
// COMPONENTES DE TABS
// ============================================================================

function TabButton({ icon: Icon, label, isActive, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? 'bg-white text-[#003DA5] shadow-sm'
          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ============================================================================
// VISTAS
// ============================================================================

function VistaCalendario({ eventos }: { eventos: EventoCalendario[] }) {
  const [mesActual, setMesActual] = useState(new Date('2026-01-01'));

  return (
    <div className="space-y-6">
      {/* Header del calendario con navegación */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Vista mensual del calendario académico
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nuevaFecha = new Date(mesActual);
                nuevaFecha.setMonth(mesActual.getMonth() - 1);
                setMesActual(nuevaFecha);
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMesActual(new Date('2026-01-01'))}
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nuevaFecha = new Date(mesActual);
                nuevaFecha.setMonth(mesActual.getMonth() + 1);
                setMesActual(nuevaFecha);
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Lista de eventos */}
        <div className="space-y-3">
          {eventos.slice(0, 10).map(evento => (
            <EventoCard key={evento.id} evento={evento} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function VistaPeriodos({ eventos }: { eventos: EventoCalendario[] }) {
  // Agrupar eventos por fase
  const fases = [
    { id: 'inscripcion', nombre: 'Inscripción, Selección y Admisión', color: '#003DA5' },
    { id: 'matricula', nombre: 'Matrícula 2026-1', color: '#28A745' },
    { id: 'induccion', nombre: 'Inducción e Inicio de Clases', color: '#28A745' },
    { id: 'desarrollo', nombre: 'Desarrollo Académico', color: '#FD7E14' },
    { id: 'situaciones', nombre: 'Situaciones Académicas', color: '#17A2B8' },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Períodos Académicos 2026-1</h2>
        <p className="text-gray-600 mb-6">
          Línea de tiempo de fases y actividades del período académico
        </p>

        <div className="space-y-8">
          {fases.map(fase => {
            const eventosFase = eventos.filter(e => 
              fase.id === 'inscripcion' ? e.categoria === 'inscripcion' :
              fase.id === 'matricula' ? e.categoria === 'matricula' :
              fase.id === 'induccion' ? e.categoria === 'desarrollo' && e.id.includes('IND') :
              fase.id === 'desarrollo' ? e.categoria === 'calificaciones' || (e.categoria === 'desarrollo' && e.id.includes('CLA')) :
              e.categoria === 'situaciones'
            );

            if (eventosFase.length === 0) return null;

            return (
              <div key={fase.id}>
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-1 h-8 rounded"
                    style={{ backgroundColor: fase.color }}
                  />
                  <h3 className="font-semibold text-gray-900">{fase.nombre}</h3>
                  <Badge>{eventosFase.length} eventos</Badge>
                </div>
                <div className="ml-6 space-y-2">
                  {eventosFase.map(evento => (
                    <EventoCompacto key={evento.id} evento={evento} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function VistaGrados({ eventos }: { eventos: EventoCalendario[] }) {
  const eventosGrados = eventos.filter(e => e.categoria === 'grados');

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Calendario de Grados</h2>
      <p className="text-gray-600 mb-6">
        Ceremonias de grado, requisitos y fechas límite
      </p>

      {eventosGrados.length === 0 ? (
        <div className="text-center py-12">
          <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay eventos de grados programados en el período actual</p>
        </div>
      ) : (
        <div className="space-y-3">
          {eventosGrados.map(evento => (
            <EventoCard key={evento.id} evento={evento} />
          ))}
        </div>
      )}
    </Card>
  );
}

function VistaAlertas({ eventos }: { eventos: EventoCalendario[] }) {
  const eventosImportantes = eventos.filter(e => e.importancia === 'alta');

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Alertas y Recordatorios</h2>
      <p className="text-gray-600 mb-6">
        Eventos importantes y fechas críticas
      </p>

      <div className="space-y-4">
        {eventosImportantes.map(evento => (
          <motion.div
            key={evento.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{evento.nombre}</h3>
                <p className="text-sm text-gray-600 mt-1">{evento.descripcion}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    {new Date(evento.fechaInicio).toLocaleDateString('es-ES')}
                  </span>
                  {evento.accionPrincipal && (
                    <Button size="sm" variant="outline">
                      {evento.accionPrincipal}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

function VistaExportar() {
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Exportar Calendario</h2>
      <p className="text-gray-600 mb-6">
        Descarga el calendario o sincronízalo con tus aplicaciones
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          variant="outline"
          className="h-auto flex-col gap-3 p-6"
          onClick={() => toast.success('Descargando PDF...')}
        >
          <FileText className="w-8 h-8" />
          <div className="text-center">
            <div className="font-semibold">Descargar PDF</div>
            <div className="text-sm text-gray-600">Calendario completo en PDF</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="h-auto flex-col gap-3 p-6"
          onClick={() => toast.info('Sincronización con Google Calendar próximamente')}
        >
          <Calendar className="w-8 h-8" />
          <div className="text-center">
            <div className="font-semibold">Google Calendar</div>
            <div className="text-sm text-gray-600">Sincronizar eventos</div>
          </div>
        </Button>

        <Button
          variant="outline"
          className="h-auto flex-col gap-3 p-6"
          onClick={() => toast.info('Exportación a iCal/Outlook próximamente')}
        >
          <Download className="w-8 h-8" />
          <div className="text-center">
            <div className="font-semibold">iCal/Outlook</div>
            <div className="text-sm text-gray-600">Exportar archivo .ics</div>
          </div>
        </Button>
      </div>
    </Card>
  );
}

// ============================================================================
// COMPONENTES DE EVENTO
// ============================================================================

function EventoCard({ evento }: { evento: EventoCalendario }) {
  const colorConfig = CATEGORIA_COLORS[evento.categoria];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all bg-white"
    >
      <div className="flex items-start gap-4">
        <div 
          className="w-1 h-full rounded"
          style={{ backgroundColor: evento.color }}
        />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{evento.nombre}</h3>
                <Badge className={`${colorConfig.bg} ${colorConfig.text} border-0 text-xs`}>
                  {evento.categoria}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">{evento.descripcion}</p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  {new Date(evento.fechaInicio).toLocaleDateString('es-ES')}
                  {evento.fechaFin && ` - ${new Date(evento.fechaFin).toLocaleDateString('es-ES')}`}
                </span>
                {evento.duracion && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {evento.duracion} días
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {evento.aplicaA.join(', ')}
                </span>
              </div>

              {evento.nota && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <strong>Nota:</strong> {evento.nota}
                </div>
              )}
            </div>

            {evento.accionPrincipal && (
              <Button size="sm" className="bg-[#003DA5] hover:bg-[#002d7a] flex-shrink-0">
                {evento.accionPrincipal}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EventoCompacto({ evento }: { evento: EventoCalendario }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition-colors">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: evento.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{evento.nombre}</span>
          {evento.importancia === 'alta' && (
            <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          )}
        </div>
      </div>
      <span className="text-xs text-gray-500 flex-shrink-0">
        {new Date(evento.fechaInicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
      </span>
    </div>
  );
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

interface StatsCardProps {
  icon: any;
  label: string;
  value: number | string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatsCard({ icon: Icon, label, value, color }: StatsCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-sm text-gray-600">{label}</div>
          <div className="text-xl font-bold text-gray-900">{value}</div>
        </div>
      </div>
    </Card>
  );
}
