/**
 * MOD-11: Planes de Mejoramiento
 * Connected to Real API
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Plus, Clock, ChevronDown, CheckCircle, List, Columns3,
  ClipboardCheck, FolderOpen, AlertTriangle, TrendingUp, Target,
  Archive, MessageSquare, FileCheck
} from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { Progress } from '../../../ui/progress';
import { toast } from 'sonner';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';
import axios from 'axios';

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
import { buildApiUrl } from '../../../../config/environment';

// const API_URL = 'http://localhost:3008/api/planes-mejoramiento';
const API_URL = buildApiUrl('legal', '/planes-mejoramiento');

export function PlanesMejoramiento() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [tipoVista, setTipoVista] = useState<'kanban' | 'lista'>('kanban');
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
      const res = await axios.get('/legal/api/v1/abogados');
      setAbogados(res.data);
    } catch (error) {
      console.error('Error fetching abogados', error);
    }
  };

  const fetchPlanes = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);
      setPlanes(res.data);
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

  // Helper Calculations
  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getEtapa = (plan: any) => {
    // Map DB 'estado' + logic to Kanban Columns
    if (plan.estado === 'CERRADO') return 'CERRADO';
    if (plan.estado === 'ABIERTO' && Number(plan.avancePorcentaje) === 0) return 'PLANEACION';
    if (Number(plan.avancePorcentaje) > 80) return 'SEGUIMIENTO';
    return 'EJECUCION'; // Default for EN_EJECUCION or intermediate progress
  };

  const [filtroEtapa, setFiltroEtapa] = useState<string>('TODAS');

  // Filter Logic
  const filteredPlanes = planes.filter(p => {
    const matchesSearch = !busqueda ||
      p.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.origen.toLowerCase().includes(busqueda.toLowerCase());

    const stage = getEtapa(p);
    const matchesEtapa = filtroEtapa === 'TODAS' || stage === filtroEtapa;

    return matchesSearch && matchesEtapa;
  });

  // Grouping
  const planesPorEtapa = {
    PLANEACION: filteredPlanes.filter(p => getEtapa(p) === 'PLANEACION'),
    EJECUCION: filteredPlanes.filter(p => getEtapa(p) === 'EJECUCION'),
    SEGUIMIENTO: filteredPlanes.filter(p => getEtapa(p) === 'SEGUIMIENTO'),
    CERRADO: filteredPlanes.filter(p => getEtapa(p) === 'CERRADO'),
  };

  // Metrics
  const total = planes.length;
  const vencidos = planes.filter(p => calculateDaysRemaining(p.fechaFinEstimada) < 0 && p.estado !== 'CERRADO').length;
  const enRiesgo = planes.filter(p => {
    const days = calculateDaysRemaining(p.fechaFinEstimada);
    return days >= 0 && days <= 10 && p.estado !== 'CERRADO';
  }).length;

  const promedioAvance = total > 0
    ? Math.round(planes.reduce((acc, p) => acc + Number(p.avancePorcentaje), 0) / total)
    : 0;

  const etapas = [
    { nombre: 'Planeación', value: 'PLANEACION', color: '#6B7280', icono: <FileCheck className="w-4 h-4 text-gray-600" />, diasEstimados: 15, items: planesPorEtapa.PLANEACION },
    { nombre: 'Ejecución', value: 'EJECUCION', color: '#F59E0B', icono: <Target className="w-4 h-4 text-amber-600" />, diasEstimados: 60, items: planesPorEtapa.EJECUCION },
    { nombre: 'Seguimiento', value: 'SEGUIMIENTO', color: '#3B82F6', icono: <TrendingUp className="w-4 h-4 text-blue-600" />, diasEstimados: 30, items: planesPorEtapa.SEGUIMIENTO },
    { nombre: 'Cerrado', value: 'CERRADO', color: '#10B981', icono: <CheckCircle className="w-4 h-4 text-green-600" />, diasEstimados: 0, items: planesPorEtapa.CERRADO },
  ];

  // Actions Handlers
  const openModal = (modalSetter: any, plan: any) => {
    setSelectedPlan(plan);
    modalSetter(true);
  };

  // Drag and Drop Logic
  const handleDrop = async (item: any, targetEtapa: string) => {
    const planId = item.id;
    const plan = planes.find(p => p.id === planId);
    if (!plan) return;

    // Check if moving to same column (based on getEtapa logic) TO AVOID RE-RENDERS or unnecessary calls
    // But simple logic is fine:

    let updates: any = {};

    if (targetEtapa === 'PLANEACION') {
      updates = { avancePorcentaje: 0, estado: 'ABIERTO' };
    } else if (targetEtapa === 'EJECUCION') {
      const current = Number(plan.avancePorcentaje);
      updates = {
        estado: 'ABIERTO',
        avancePorcentaje: (current > 0 && current <= 80) ? current : 10
      };
    } else if (targetEtapa === 'SEGUIMIENTO') {
      const current = Number(plan.avancePorcentaje);
      updates = {
        estado: 'ABIERTO',
        avancePorcentaje: (current > 80 && current < 100) ? current : 85
      };
    } else if (targetEtapa === 'CERRADO') {
      updates = { estado: 'CERRADO', avancePorcentaje: 100 };
    }

    // Optimistic Update
    setPlanes(prev => prev.map(p => p.id === planId ? { ...p, ...updates } : p));

    try {
      await axios.post(`${API_URL}/${planId}/update`, updates);
      toast.success(`Plan movido a ${targetEtapa}`);
    } catch (error) {
      console.error('Error moving plan', error);
      toast.error('Error al mover el plan');
      fetchPlanes(); // Revert
    }
  };

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <ModuleHeader
            title={isMobile ? 'Mejoramiento' : 'Tablero Planes de Mejoramiento'}
            subtitle="Gestión visual de planes y acciones de mejora"
            toggleView={{
              current: tipoVista,
              onChange: (view) => setTipoVista(view as 'kanban' | 'lista'),
              options: [
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
              }
            ]}
          />
        </div>
        <div className="flex-shrink-0 pt-1">
          <ModuleInfoTooltip title="Guía Planes" variant="icon" sections={[]} />
        </div>
      </div>

      {/* Metrics */}
      <ModuleMetrics
        metrics={[
          { label: 'Total', value: total, icon: <ClipboardCheck className="w-5 h-5 text-blue-600" />, color: 'blue' },
          { label: 'En Riesgo', value: enRiesgo, icon: <AlertTriangle className="w-5 h-5 text-orange-600" />, color: 'orange' },
          { label: 'Vencidos', value: vencidos, icon: <AlertTriangle className="w-5 h-5 text-red-600" />, color: 'red' },
          { label: 'Avance Global', value: `${promedioAvance}%`, icon: <TrendingUp className="w-5 h-5 text-green-600" />, color: 'green' }
        ]}
      />

      {/* Filtros */}
      <ModuleFilters
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        filters={[
          {
            label: 'Etapa',
            value: filtroEtapa,
            onChange: setFiltroEtapa,
            options: [
              { label: 'Todas', value: 'TODAS' },
              { label: 'Planeación', value: 'PLANEACION' },
              { label: 'Ejecución', value: 'EJECUCION' },
              { label: 'Seguimiento', value: 'SEGUIMIENTO' },
              { label: 'Cerrado', value: 'CERRADO' }
            ]
          }
        ]}
      />

      {/* Kanban View */}
      {loading ? (
        <div className="p-10 text-center text-gray-500">Cargando planes...</div>
      ) : tipoVista === 'kanban' ? (
        <DndProvider backend={HTML5Backend}>
          <div className="relative">
            {/* Mobile Scroll Hint */}
            {(isMobile || isTablet) && (
              <div className="absolute top-2 right-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-gray-200">
                <p className="text-xs font-bold text-gray-600 flex items-center gap-1">
                  <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                  Desliza
                </p>
              </div>
            )}

            <div className="flex gap-4 overflow-x-auto pb-4 scroll-smooth">
              {etapas.map((etapa) => (
                <ColumnaKanban
                  key={etapa.nombre}
                  etapa={etapa}
                  isMobile={isMobile}
                  onVer={(p: any) => openModal(setShowDetalle, p)}
                  onEvidencias={(p: any) => openModal(setShowEvidencias, p)}
                  onSeguimiento={(p: any) => openModal(setShowSeguimiento, p)}
                  onComentarios={(p: any) => openModal(setShowComentarios, p)}
                  abogados={abogados}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          </div>
        </DndProvider>
      ) : (
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          {/* Simple List View implementation */}
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Responsable</th>
                <th className="p-3">Avance</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlanes.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => openModal(setShowDetalle, p)}>
                  <td className="p-3 font-bold text-blue-700">{p.codigo}</td>
                  <td className="p-3 font-medium">{p.titulo}</td>
                  <td className="p-3 text-gray-600">
                    {p.responsableNombre !== 'Sin Asignar' ? p.responsableNombre : (abogados.find((a: any) => a.id === p.responsableId)?.nombreCompleto || 'Sin Asignar')}
                  </td>
                  <td className="p-3">
                    <Badge className={Number(p.avancePorcentaje) === 100 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}>
                      {p.avancePorcentaje}%
                    </Badge>
                  </td>
                  <td className="p-3"><Badge variant="outline">{p.estado}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
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

// Subcomponents
function ColumnaKanban({ etapa, isMobile, onVer, onEvidencias, onSeguimiento, onComentarios, abogados, onDrop }: any) {

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.PLAN,
    drop: (item, monitor) => onDrop(item, etapa.value),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [onDrop, etapa.value]);

  return (
    <motion.div
      ref={drop}
      className="flex-shrink-0"
      initial={{ width: 320 }}
      animate={{ width: 320 }}
    >
      <Card className={`h-full border transition-colors ${isOver ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`}>
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white rounded-lg border border-gray-200">{etapa.icono}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-sm text-gray-800">{etapa.nombre}</h3>
              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {etapa.diasEstimados} días
              </p>
            </div>
          </div>
          <Badge className="bg-white border border-gray-200 text-gray-700">{etapa.items.length}</Badge>
        </div>
        <div className="p-3 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          {etapa.items.map((plan: any) => (
            <TarjetaPlan
              key={plan.id}
              plan={{
                ...plan,
                responsableNombre: plan.responsableNombre !== 'Sin Asignar'
                  ? plan.responsableNombre
                  : (abogados.find((a: any) => a.id === plan.responsableId)?.nombreCompleto || 'Sin Asignar')
              }}
              isMobile={isMobile}
              onVer={(p: any) => {
                const fullPlan = {
                  ...p,
                  responsableNombre: p.responsableNombre !== 'Sin Asignar'
                    ? p.responsableNombre
                    : (abogados.find((a: any) => a.id === p.responsableId)?.nombreCompleto || 'Sin Asignar')
                };
                onVer(fullPlan);
              }}
              onEvidencias={onEvidencias}
              onSeguimiento={onSeguimiento}
              onComentarios={onComentarios}
            />
          ))}
          {etapa.items.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-xs font-semibold">Sin planes</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function TarjetaPlan({ plan, isMobile, onVer, onEvidencias, onSeguimiento, onComentarios }: any) {

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PLAN,
    item: { id: plan.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [plan.id]);

  // Logic for dates and status
  const end = new Date(plan.fechaFinEstimada);
  const now = new Date();
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const totalDays = 90; // Mock or calculate if start date is available

  const getSemaforoColor = (diasRestantes: number, avance: number) => {
    if (diasRestantes < 0) return { color: '#DC2626', label: 'Vencido' };
    if (diasRestantes <= 10) return { color: '#F59E0B', label: 'Urgente' };
    if (avance >= 80) return { color: '#10B981', label: 'En término' };
    return { color: '#3B82F6', label: 'Normal' };
  };

  const semaforo = getSemaforoColor(days, Number(plan.avancePorcentaje));

  return (
    <div
      ref={drag}
      style={{ opacity: isDragging ? 0.5 : 1, cursor: 'grab' }}
      className="bg-white border border-gray-200 hover:shadow-md transition-all active:cursor-grabbing rounded-xl mb-3"
    >
      <Card className="border-0 shadow-none">
        <div className="h-1" style={{ background: '#003DA5' }} />

        <div className={`${isMobile ? 'p-2.5' : 'p-3'}`}>
          {/* Header: ID and Plan Number */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`${isMobile ? 'p-1' : 'p-1.5'} rounded-lg flex-shrink-0`} style={{ background: '#E0EDFF' }}>
                <ClipboardCheck className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: '#003DA5' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} truncate`} style={{ color: '#003DA5' }}>
                  {plan.codigo}
                </h4>
                <p className="text-xs text-gray-600 truncate">
                  {plan.origen}
                </p>
              </div>
            </div>
          </div>

          {/* Hallazgo / Titulo */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">📋 Plan:</p>
            <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-2`}>
              {plan.titulo}
            </p>
          </div>

          {/* Responsable - Mocked until fully joined, or check if 'responsable' exists on plan */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Avatar className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0`}>
                <AvatarFallback className="text-xs" style={{ background: '#E0EDFF', color: '#003DA5' }}>
                  {(plan.responsableId || 'NA').substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">👨‍💼 Responsable:</p>
                <p className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 line-clamp-1`}>
                  {/* Fallback to 'Asignado' if name not joined yet, user focused on card style */}
                  {plan.responsableNombre || 'Abogado Asignado'}
                </p>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5 mb-2">
            <Badge className="text-xs flex items-center gap-1 font-semibold bg-gray-50 border border-gray-200" style={{ color: semaforo.color }}>
              <div className="w-2 h-2 rounded-full" style={{ background: semaforo.color }} />
              {Math.abs(days)} días {days < 0 ? 'vencido' : 'restantes'}
            </Badge>
          </div>

          {/* Barra de progreso */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Avance:</span>
              <span className="text-xs font-bold text-gray-900">{plan.avancePorcentaje}%</span>
            </div>
            <Progress value={plan.avancePorcentaje} className="h-2" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{plan.evidencias?.length || 0}</p>
              <p className="text-xs text-gray-500">Evidencias</p>
            </div>
            <div className={`text-center ${isMobile ? 'p-1' : 'p-1.5'} rounded-lg bg-gray-50 border border-gray-100`}>
              <p className="text-xs font-bold text-gray-700">{days}</p>
              <p className="text-xs text-gray-500">Días</p>
            </div>
          </div>

          {/* Last Action Box */}
          <div className="mb-2 p-2 rounded-lg" style={{ backgroundColor: '#F0F7FF', border: '1px solid #BFDBFE' }}>
            <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: '#003DA5' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#003DA5' }}></span>
              ÚLTIMA ACTUACIÓN
            </p>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-700 line-clamp-2 mb-1`}>
              {plan.ultimaActuacion || 'Sin actuaciones registradas'}
            </p>
            <p className="text-xs text-gray-500">
              📅 {new Date(plan.createdAt || new Date()).toLocaleDateString('es-CO')}
            </p>
          </div>

          {/* Action Buttons - EXACTLY as requested */}
          <div className="space-y-1 pt-2 border-t border-gray-200">
            <Button
              onClick={() => onVer(plan)}
              size="sm"
              className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Archive className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
              Ver Plan
            </Button>

            <div className="grid grid-cols-2 gap-1">
              <Button
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEvidencias(plan); }}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
              >
                <FileCheck className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
                Evidencias
              </Button>

              <Button
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onSeguimiento(plan); }}
                size="sm"
                variant="outline"
                className={`${isMobile ? 'text-[10px] py-1 px-1' : 'text-[11px] px-2'} justify-start`}
              >
                <TrendingUp className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-0.5`} />
                Seguimiento
              </Button>
            </div>

            <Button
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onComentarios(plan); }}
              size="sm"
              className={`w-full ${isMobile ? 'text-xs py-1.5' : 'text-xs'} font-bold`}
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <MessageSquare className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
              Comentarios
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
