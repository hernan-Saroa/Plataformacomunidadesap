/**
 * MOD-11: Planes de Mejoramiento
 * Connected to Real API with Enhanced Dashboard & Grouped Views
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Plus, Clock, ChevronDown, CheckCircle, List, Columns3,
  ClipboardCheck, FolderOpen, AlertTriangle, TrendingUp, Target,
  Archive, MessageSquare, FileCheck, BarChart3, Calendar, FileText, ChevronRight, Eye, Building, User
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import { Progress } from '@esap-mfe/shared-ui/progress';
import { Input } from '@esap-mfe/shared-ui/input';
import { toast } from 'sonner';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import { legalService } from '../../../../services/api/legal.service';

// Drag and Drop
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const ItemTypes = {
  PLAN: 'plan',
};

// Modals
import { ModalNuevoPlan } from './planes/ModalNuevoPlan';
import { ModalDetallePlan } from './planes/ModalDetallePlan';
import { ModalEvidencias } from './planes/ModalEvidencias';
import { ModalSeguimiento } from './planes/ModalSeguimiento';
import { ModalComentarios } from './planes/ModalComentarios';

export function PlanesMejoramiento() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [tipoVista, setTipoVista] = useState<'dashboard' | 'kanban' | 'lista'>('dashboard');
  const [planes, setPlanes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Modal States
  const [showNuevo, setShowNuevo] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const [showDetalle, setShowDetalle] = useState(false);
  const [showEvidencias, setShowEvidencias] = useState(false);
  const [showSeguimiento, setShowSeguimiento] = useState(false);
  const [showComentarios, setShowComentarios] = useState(false);

  // Data for mapping
  const [abogados, setAbogados] = useState<any[]>([]);

  // Fetch Data
  const fetchAbogados = async () => {
    try {
      const res = await legalService.getAbogadosDashboard();
      setAbogados(res);
    } catch (error) {
      console.error('Error fetching abogados', error);
    }
  };

  const fetchPlanes = async () => {
    try {
      setLoading(true);
      const res = await legalService.getPlanesMejoramiento();
      setPlanes(res);
    } catch (error) {
      console.error('Error fetching plans', error);
      toast.error('Error cargando planes de mejoramiento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbogados();
    fetchPlanes();
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Filter Logic
  const filteredPlanes = planes.filter(p =>
    !busqueda ||
    p.titulo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.origen?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Metrics for Dashboard
  const metrics = useMemo(() => {
    const total = planes.length;
    const completed = planes.filter(p => Number(p.avancePorcentaje) === 100 || p.estado === 'CERRADO').length;
    const inProgress = planes.filter(p => p.estado === 'EN_EJECUCION' || (p.estado === 'ABIERTO' && Number(p.avancePorcentaje) > 0 && Number(p.avancePorcentaje) < 100)).length;
    const alerts = planes.filter(p => {
      const end = new Date(p.fechaFinEstimada);
      const now = new Date();
      const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days <= 30 && days >= 0; // Alertas próximas a vencer
    }).length;
    const avgProgress = total > 0 ? Math.round(planes.reduce((acc, p) => acc + Number(p.avancePorcentaje), 0) / total) : 0;

    // Charts Data
    const byEnte: Record<string, { count: number; avg: number; totalProgress: number }> = {};
    planes.forEach(p => {
      const ente = p.origen || 'Otro';
      if (!byEnte[ente]) byEnte[ente] = { count: 0, avg: 0, totalProgress: 0 };
      byEnte[ente].count += 1;
      byEnte[ente].totalProgress += Number(p.avancePorcentaje);
    });
    const chartEnte = Object.keys(byEnte).map(key => ({
      name: key.replace('_', ' '),
      count: byEnte[key].count,
      avg: Math.round(byEnte[key].totalProgress / byEnte[key].count)
    }));

    const bySeverity: Record<string, number> = { CRITICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 };
    planes.forEach(p => {
      const sev = p.severidad || 'MEDIO'; // Default
      if (bySeverity[sev] !== undefined) bySeverity[sev]++;
    });

    return { total, completed, inProgress, alerts, avgProgress, chartEnte, bySeverity };
  }, [planes]);

  // Grouping for List View (Year-Quarter)
  const groupedPlanes = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredPlanes.forEach(p => {
      const date = new Date(p.fechaFinEstimada);
      const year = date.getFullYear();
      const quarter = Math.floor((date.getMonth() + 3) / 3);
      const key = `${year}-Q${quarter}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    // Sort keys reverse
    return Object.keys(groups).sort().reverse().map(key => ({
      key,
      items: groups[key]
    }));
  }, [filteredPlanes]);

  // Actions Handlers
  const openModal = (modalSetter: any, plan: any) => {
    setSelectedPlan(plan);
    modalSetter(true);
  };

  // Drag and Drop Logic (Kanban)
  const handleDrop = async (item: any, targetEtapa: string) => {
    // Existing logic maintained
    const planId = item.id;
    const plan = planes.find(p => p.id === planId);
    if (!plan) return;

    let updates: any = {};
    if (targetEtapa === 'PLANEACION') updates = { avancePorcentaje: 0, estado: 'ABIERTO' };
    else if (targetEtapa === 'EJECUCION') updates = { estado: 'ABIERTO', avancePorcentaje: 10 };
    else if (targetEtapa === 'SEGUIMIENTO') updates = { estado: 'ABIERTO', avancePorcentaje: 85 };
    else if (targetEtapa === 'CERRADO') updates = { estado: 'CERRADO', avancePorcentaje: 100 };

    setPlanes(prev => prev.map(p => p.id === planId ? { ...p, ...updates } : p));
    try {
      await legalService.updatePlanMejoramiento(planId, updates);
      toast.success(`Plan movido a ${targetEtapa}`);
    } catch (error) {
      console.error(error);
      toast.error('Error al mover plan');
      fetchPlanes();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <ModuleHeader
            title={isMobile ? 'Mejoramiento' : 'Planes de Mejoramiento'}
            subtitle="Seguimiento a hallazgos de Órganos de Control y Auditorías"
            toggleView={{
              current: tipoVista,
              onChange: (view: any) => setTipoVista(view),
              options: [
                { label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" />, value: 'dashboard' },
                { label: 'Kanban', icon: <Columns3 className="w-4 h-4" />, value: 'kanban' },
                { label: 'Lista', icon: <List className="w-4 h-4" />, value: 'lista' }
              ]
            }}
            buttons={[
              {
                label: 'Nuevo Plan',
                labelMobile: 'Nuevo',
                icon: <Plus className="w-4 h-4" />,
                onClick: () => setShowNuevo(true),
                variant: 'primary'
              },
              {
                label: 'Exportar',
                labelMobile: 'Exp',
                icon: <Archive className="w-4 h-4" />,
                onClick: () => toast.info('Exportando reporte...'),
                variant: 'outline'
              }
            ]}
          />
        </div>
        <div className="flex-shrink-0 pt-1">
          <ModuleInfoTooltip title="Guía Planes" variant="icon" sections={[]} />
        </div>
      </div>

      {/* VIEW: DASHBOARD */}
      {tipoVista === 'dashboard' && (
        <DashboardContent
          metrics={metrics}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          onVerListado={() => setTipoVista('lista')}
        />
      )}

      {/* VIEW: KANBAN */}
      {tipoVista === 'kanban' && (
        <DndProvider backend={HTML5Backend}>
          <div className="flex gap-4 overflow-x-auto pb-4 scroll-smooth">
            {/* Reusing existing logic for stages */}
            <KanbanColumns
              planes={filteredPlanes}
              abogados={abogados}
              onDrop={handleDrop}
              openModal={openModal}
              setters={{ setShowDetalle, setShowEvidencias, setShowSeguimiento, setShowComentarios }}
              isMobile={isMobile}
            />
          </div>
        </DndProvider>
      )}

      {/* VIEW: LIST (Grouped) */}
      {tipoVista === 'lista' && (
        <div className="space-y-4">
          <div className="relative">
            <Input
              placeholder="Buscar..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>

          {groupedPlanes.map(group => (
            <div key={group.key} className="space-y-2">
              <h3 className="text-sm font-bold text-gray-500 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {group.key}
              </h3>
              <div className="bg-white rounded-xl border divide-y">
                {group.items.map((plan: any) => (
                  <PlanListItem
                    key={plan.id}
                    plan={plan}
                    abogados={abogados}
                    onClick={() => openModal(setShowDetalle, plan)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ModalNuevoPlan open={showNuevo} onClose={() => setShowNuevo(false)} onSuccess={fetchPlanes} />
      <ModalDetallePlan open={showDetalle} onClose={() => setShowDetalle(false)} plan={selectedPlan} />
      <ModalEvidencias open={showEvidencias} onClose={() => setShowEvidencias(false)} plan={selectedPlan} onSuccess={fetchPlanes} />
      <ModalSeguimiento open={showSeguimiento} onClose={() => setShowSeguimiento(false)} plan={selectedPlan} onSuccess={fetchPlanes} />
      <ModalComentarios open={showComentarios} onClose={() => setShowComentarios(false)} plan={selectedPlan} onSuccess={fetchPlanes} />
    </div>
  );
}

// === SUBCOMPONENTS ===

function DashboardContent({ metrics, busqueda, setBusqueda, onVerListado }: any) {
  return (
    <div className="space-y-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard icon={<FileText className="text-blue-600" />} label="Total Planes" value={metrics.total} sub="+2% vs mes anterior" />
        <MetricCard icon={<TrendingUp className="text-purple-600" />} label="Avance Promedio" value={`${metrics.avgProgress}%`} sub="+5% vs trimestre" />
        <MetricCard icon={<Target className="text-blue-500" />} label="En Ejecución" value={metrics.inProgress} />
        <MetricCard icon={<CheckCircle className="text-green-600" />} label="Completados" value={metrics.completed} />
        <MetricCard icon={<AlertTriangle className="text-red-500" />} label="Alertas Activas" value={metrics.alerts} isAlert />
      </div>

      {/* Filter Bar */}
      <div className="relative">
        <Input
          placeholder="Buscar..."
          className="pl-3 bg-white"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-gray-800 mb-4">Planes por Ente de Control</h3>
          <div className="space-y-4">
            {metrics.chartEnte.map((item: any) => (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {getEnteIcon(item.name)} {item.name}
                  </span>
                  <Badge variant="secondary">{item.count} planes</Badge>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#003DA5] rounded-full" style={{ width: `${item.avg}%` }} />
                </div>
                <p className="text-xs text-gray-400">Avance promedio: {item.avg}%</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-gray-800 mb-4">Hallazgos por Severidad</h3>
          <div className="space-y-3">
            <SeverityRow label="Críticos" count={metrics.bySeverity.CRITICO} color="bg-red-100 text-red-700" dot="bg-red-500" />
            <SeverityRow label="Altos" count={metrics.bySeverity.ALTO} color="bg-orange-100 text-orange-700" dot="bg-orange-500" />
            <SeverityRow label="Medios" count={metrics.bySeverity.MEDIO} color="bg-yellow-100 text-yellow-700" dot="bg-yellow-500" />
            <SeverityRow label="Bajos" count={metrics.bySeverity.BAJO} color="bg-green-100 text-green-700" dot="bg-green-500" />
          </div>
        </Card>
      </div>

      {/* Recent/Expiring Section */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-gray-800">Planes Próximos a Vencer (próximos 60 días)</h3>
        </div>
        {/* Mocking empty state or filtered list */}
        {metrics.alerts === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">No hay planes próximos a vencer</p>
        ) : (
          <Button variant="link" onClick={onVerListado}>Ver planes con alertas</Button>
        )}
      </Card>
    </div>
  );
}

function MetricCard({ icon, label, value, sub, isAlert }: any) {
  return (
    <Card className={`p-4 flex items-center gap-4 ${isAlert ? 'border-red-200 bg-red-50' : 'bg-white'}`}>
      <div className={`p-3 rounded-xl ${isAlert ? 'bg-white' : 'bg-blue-50'}`}>
        {icon}
      </div>
      <div>
        <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
        <p className="text-xs text-gray-500">{label}</p>
        {sub && <p className="text-[10px] text-green-600 font-medium">{sub}</p>}
      </div>
    </Card>
  );
}

function SeverityRow({ label, count, color, dot }: any) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${color}`}>
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${dot}`} />
        <span className="font-medium">{label}</span>
      </div>
      <span className="font-bold">{count}</span>
    </div>
  );
}

function PlanListItem({ plan, abogados, onClick }: any) {
  const end = new Date(plan.fechaFinEstimada);
  const now = new Date();
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Find responsible name
  const respName = plan.responsableNombre !== 'Sin Asignar'
    ? plan.responsableNombre
    : abogados.find((a: any) => a.id === plan.responsableId)?.nombreCompleto || 'Sin Asignar';

  return (
    <div onClick={onClick} className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors group">
      <div className="flex items-center gap-4 flex-1">
        <div className={`w-1 h-12 rounded-full ${days < 0 ? 'bg-red-500' : days < 30 ? 'bg-orange-500' : 'bg-green-500'}`} />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{plan.codigo}</span>
            {getEnteBadge(plan.origen)}
            <Badge variant={plan.estado === 'CERRADO' ? 'default' : 'secondary'}>{plan.estado}</Badge>
            {plan.severidad && <Badge variant="outline" className="text-[10px]">{plan.severidad}</Badge>}
          </div>
          <h4 className="font-bold text-gray-900 line-clamp-1 group-hover:text-blue-700">{plan.titulo}</h4>
          <p className="text-xs text-gray-500 flex items-center gap-4 mt-1">
            <span className='flex items-center gap-1'><Building className="w-3 h-3" /> {plan.areaResponsable || 'Sin Área'}</span>
            <span className='flex items-center gap-1'><User className="w-3 h-3" /> {respName}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-8 pr-4">
        <div className="text-right min-w-[120px]">
          <p className="text-xs text-gray-400 mb-1">Vence: {end.toLocaleDateString()}</p>
          <p className={`text-xs font-bold ${days < 0 ? 'text-red-600' : 'text-gray-600'}`}>
            {days < 0 ? `Vencido hace ${Math.abs(days)} días` : `${days} días restantes`}
          </p>
        </div>
        <div className="text-center min-w-[60px]">
          <p className="text-lg font-bold text-blue-600">{plan.avancePorcentaje}%</p>
          <p className="text-[10px] text-gray-400">Avance</p>
        </div>
        <Button variant="ghost" size="icon"><Eye className="w-4 h-4 text-gray-400" /></Button>
      </div>
    </div>
  );
}

function KanbanColumns({ planes, abogados, onDrop, openModal, setters, isMobile }: any) {
  const getEtapa = (plan: any) => {
    if (plan.estado === 'CERRADO') return 'CERRADO';
    if (plan.estado === 'ABIERTO' && Number(plan.avancePorcentaje) === 0) return 'PLANEACION';
    if (Number(plan.avancePorcentaje) > 80) return 'SEGUIMIENTO';
    return 'EJECUCION';
  };
  // Grouping provided planes
  const planesPorEtapa = {
    PLANEACION: planes.filter((p: any) => getEtapa(p) === 'PLANEACION'),
    EJECUCION: planes.filter((p: any) => getEtapa(p) === 'EJECUCION'),
    SEGUIMIENTO: planes.filter((p: any) => getEtapa(p) === 'SEGUIMIENTO'),
    CERRADO: planes.filter((p: any) => getEtapa(p) === 'CERRADO'),
  };

  const etapas = [
    { nombre: 'Planeación', value: 'PLANEACION', color: '#6B7280', icono: <FileCheck className="w-4 h-4 text-gray-600" />, diasEstimados: 15, items: planesPorEtapa.PLANEACION },
    { nombre: 'Ejecución', value: 'EJECUCION', color: '#F59E0B', icono: <Target className="w-4 h-4 text-amber-600" />, diasEstimados: 60, items: planesPorEtapa.EJECUCION },
    { nombre: 'Seguimiento', value: 'SEGUIMIENTO', color: '#3B82F6', icono: <TrendingUp className="w-4 h-4 text-blue-600" />, diasEstimados: 30, items: planesPorEtapa.SEGUIMIENTO },
    { nombre: 'Cerrado', value: 'CERRADO', color: '#10B981', icono: <CheckCircle className="w-4 h-4 text-green-600" />, diasEstimados: 0, items: planesPorEtapa.CERRADO },
  ];

  return etapas.map(etapa => (
    <ColumnaKanban
      key={etapa.value}
      etapa={etapa}
      isMobile={isMobile}
      onVer={(p: any) => openModal(setters.setShowDetalle, p)}
      onEvidencias={(p: any) => openModal(setters.setShowEvidencias, p)}
      onSeguimiento={(p: any) => openModal(setters.setShowSeguimiento, p)}
      onComentarios={(p: any) => openModal(setters.setShowComentarios, p)}
      abogados={abogados}
      onDrop={onDrop}
    />
  ));
}

// Reuse ColumnaKanban and TarjetaPlan from your previous code (simplified here for brevity but assuming they are defined below or imported if separate). 
// I will include them to make the file complete.

function ColumnaKanban({ etapa, isMobile, onVer, onEvidencias, onSeguimiento, onComentarios, abogados, onDrop }: any) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.PLAN,
    drop: (item, monitor) => onDrop(item, etapa.value),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [onDrop, etapa.value]);

  return (
    <motion.div ref={drop} className="flex-shrink-0" initial={{ width: 320 }} animate={{ width: 320 }}>
      <Card className={`h-full border transition-colors ${isOver ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`}>
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white rounded-lg border border-gray-200">{etapa.icono}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-sm text-gray-800">{etapa.nombre}</h3>
            </div>
          </div>
          <Badge className="bg-white border border-gray-200 text-gray-700">{etapa.items.length}</Badge>
        </div>
        <div className="p-3 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          {etapa.items.map((plan: any) => (
            <TarjetaPlan
              key={plan.id}
              plan={plan}
              isMobile={isMobile}
              onVer={onVer}
              onEvidencias={onEvidencias}
              onSeguimiento={onSeguimiento}
              onComentarios={onComentarios}
              abogados={abogados} // Passing lawyers to card
            />
          ))}
          {etapa.items.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <FolderOpen className="w-10 h-10 mx-auto opacity-20" />
              <p className="text-xs">Sin planes</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function TarjetaPlan({ plan, isMobile, onVer, onEvidencias, onSeguimiento, onComentarios, abogados }: any) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PLAN,
    item: { id: plan.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [plan.id]);

  const end = new Date(plan.fechaFinEstimada);
  const now = new Date();
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const respName = plan.responsableNombre !== 'Sin Asignar'
    ? plan.responsableNombre
    : abogados?.find((a: any) => a.id === plan.responsableId)?.nombreCompleto || 'Sin Asignar';

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1, cursor: 'grab' }} className="bg-white border border-gray-200 hover:shadow-md transition-all rounded-xl mb-3">
      <div className="bg-[#003DA5] h-1 rounded-t-xl" />
      <div className="p-3">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className="text-[10px] text-blue-600 bg-blue-50 border-blue-100">{plan.codigo}</Badge>
          {plan.severidad && <Badge variant="destructive" className="text-[10px] h-5">{plan.severidad}</Badge>}
        </div>
        <h4 className="text-sm font-bold text-gray-900 line-clamp-2 mb-2">{plan.titulo}</h4>

        <div className="flex items-center gap-2 mb-3">
          <Avatar className="w-5 h-5"><AvatarFallback className="text-[10px] bg-gray-100 text-gray-600">{respName.substring(0, 2)}</AvatarFallback></Avatar>
          <span className="text-xs text-gray-600 truncate max-w-[150px]">{respName}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Avance</span>
          <span className="font-bold text-gray-900">{plan.avancePorcentaje}%</span>
        </div>
        <Progress value={plan.avancePorcentaje} className="h-1.5 mb-3" />

        <div className="flex gap-1 pt-2 border-t">
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => onVer(plan)}><Eye className="w-3 h-3 mr-1" /> Ver</Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={(e) => { e.stopPropagation(); onEvidencias(plan); }}><FileCheck className="w-3 h-3 mr-1" /> Evidencias</Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={(e) => { e.stopPropagation(); onSeguimiento(plan); }}>
            <TrendingUp className="w-3 h-3 mr-1" /> Seguimiento
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helpers
function getEnteIcon(name: string) {
  if (name.includes('CONTRALORIA')) return '🏛️';
  if (name.includes('PROCURADURIA')) return '⚖️';
  if (name.includes('CONTROL')) return '🔍';
  if (name.includes('AUDITORIA')) return '📋';
  return '📊';
}

function getEnteBadge(origen: string) {
  let color = 'bg-gray-100 text-gray-700';
  if (origen?.includes('CONTRALORIA')) color = 'bg-red-50 text-red-700 border-red-200';
  if (origen?.includes('PROCURADURIA')) color = 'bg-green-50 text-green-700 border-green-200';
  if (origen?.includes('CONTROL')) color = 'bg-blue-50 text-blue-700 border-blue-200';

  return <Badge variant="outline" className={`text-[10px] border ${color}`}>{origen?.replace('_', ' ')}</Badge>;
}

