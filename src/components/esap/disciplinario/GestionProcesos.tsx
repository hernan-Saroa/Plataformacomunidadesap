/**
 * GESTIÓN DE PROCESOS - Control Disciplinario
 * CRUD Completo de Procesos Disciplinarios
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, Filter, Download, Eye, Edit, Trash2, MoreVertical,
  X, Check, Clock, AlertTriangle, CheckCircle, FolderOpen, FileText,
  Calendar, User, Mail, Phone, MapPin, Save, Upload, ChevronDown
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';

interface Proceso {
  id: string;
  consecutivo: string;
  noticia: string;
  disciplinable: string;
  cedula: string;
  cargo: string;
  dependencia: string;
  etapaActual: string;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  diasRestantes: number;
  porcentajeTiempo: number;
  profesionalAsignado: string; // Mantenido como string para compatibilidad
  fechaCreacion: string;
  ultimaActuacion: string;
  documentos: number;
  fechaVencimiento: string;
  hechos: string;
  email: string;
  telefono: string;
}

// Mock data expandido - REDUCIDO
const PROCESOS_DATA: Proceso[] = [
  {
    id: '1',
    consecutivo: 'PD-2025-0025',
    noticia: 'ND-2025-0152',
    disciplinable: 'Ana María López Martínez',
    cedula: '52123456',
    cargo: 'Profesional Universitario',
    dependencia: 'Territorial Bogotá',
    etapaActual: 'Valoración',
    semaforo: 'amarillo',
    diasRestantes: 3,
    porcentajeTiempo: 70,
    profesionalAsignado: 'Juan Pérez',
    fechaCreacion: '2025-01-26',
    ultimaActuacion: 'Asignado para valoración',
    documentos: 5,
    fechaVencimiento: '2025-02-02',
    hechos: 'Presunto incumplimiento de funciones en proceso de contratación',
    email: 'ana.lopez@esap.edu.co',
    telefono: '3001234567'
  }
];

// ==================== MODAL VER DETALLE ====================
function ModalDetalleProces({ proceso, onClose }: { proceso: Proceso; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 p-2 sm:p-4"
      style={{ zIndex: 999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl lg:max-w-3xl rounded-xl sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        style={{ background: '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b flex-shrink-0" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-4 h-4 rounded-full ring-4"
                  style={{
                    background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#F59E0B' : '#DC2626',
                    ringColor: proceso.semaforo === 'verde' ? '#D1FAE5' : proceso.semaforo === 'amarillo' ? '#FEF3C7' : '#FEE2E2'
                  }}
                />
                <h2 className="text-xl sm:text-2xl font-extrabold" style={{ color: '#003DA5' }}>
                  {proceso.consecutivo}
                </h2>
                <Badge>{proceso.noticia}</Badge>
              </div>
              <p className="text-xs sm:text-sm" style={{ color: '#6B7280' }}>
                Detalles completos del proceso disciplinario
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" style={{ color: '#6B7280' }} />
            </button>
          </div>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Información del Disciplinable */}
          <div>
            <h3 className="text-lg font-extrabold mb-4" style={{ color: '#1F2937' }}>
              Información del Disciplinable
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl" style={{ background: '#F9FAFB' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                  NOMBRE COMPLETO
                </p>
                <p className="font-medium" style={{ color: '#1F2937' }}>
                  {proceso.disciplinable}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#F9FAFB' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                  CÉDULA
                </p>
                <p className="font-medium" style={{ color: '#1F2937' }}>
                  {proceso.cedula}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#F9FAFB' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                  CARGO
                </p>
                <p className="font-medium" style={{ color: '#1F2937' }}>
                  {proceso.cargo}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#F9FAFB' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                  DEPENDENCIA
                </p>
                <p className="font-medium" style={{ color: '#1F2937' }}>
                  {proceso.dependencia}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#F9FAFB' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                  EMAIL
                </p>
                <p className="font-medium" style={{ color: '#1F2937' }}>
                  {proceso.email}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#F9FAFB' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                  TELÉFONO
                </p>
                <p className="font-medium" style={{ color: '#1F2937' }}>
                  {proceso.telefono}
                </p>
              </div>
            </div>
          </div>

          {/* Detalles del Proceso */}
          <div>
            <h3 className="text-lg font-extrabold mb-4" style={{ color: '#1F2937' }}>
              Detalles del Proceso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 rounded-xl border-2" style={{ borderColor: '#E5E7EB' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                  ETAPA ACTUAL
                </p>
                <Badge className="text-sm font-semibold" style={{ background: '#E0EDFF', color: '#003DA5' }}>
                  {proceso.etapaActual}
                </Badge>
              </div>
              <div className="p-4 rounded-xl border-2" style={{ borderColor: '#E5E7EB' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                  FECHA CREACIÓN
                </p>
                <p className="font-medium" style={{ color: '#1F2937' }}>
                  {proceso.fechaCreacion}
                </p>
              </div>
              <div className="p-4 rounded-xl border-2" style={{ borderColor: '#E5E7EB' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                  FECHA VENCIMIENTO
                </p>
                <p className="font-medium" style={{ color: '#1F2937' }}>
                  {proceso.fechaVencimiento}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#9CA3AF' }}>
                DESCRIPCIÓN DE HECHOS
              </p>
              <p className="text-sm" style={{ color: '#4B5563' }}>
                {proceso.hechos}
              </p>
            </div>
          </div>

          {/* Profesional Asignado */}
          <div>
            <h3 className="text-lg font-extrabold mb-4" style={{ color: '#1F2937' }}>
              Asignación
            </h3>
            <div className="p-4 rounded-xl border-2 flex items-center gap-4" style={{ borderColor: '#E5E7EB' }}>
              <Avatar className="w-12 h-12">
                <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5' }}>
                  {proceso.profesionalAsignado.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                  PROFESIONAL ASIGNADO
                </p>
                <p className="font-bold" style={{ color: '#1F2937' }}>
                  {proceso.profesionalAsignado}
                </p>
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div>
            <h3 className="text-lg font-extrabold mb-4" style={{ color: '#1F2937' }}>
              Estado del Proceso
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl text-center" style={{ background: '#F9FAFB' }}>
                <FolderOpen className="w-8 h-8 mx-auto mb-2" style={{ color: '#003DA5' }} />
                <p className="text-2xl font-extrabold mb-1" style={{ color: '#003DA5' }}>
                  {proceso.documentos}
                </p>
                <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                  Documentos
                </p>
              </div>
              <div className="p-4 rounded-xl text-center" style={{ background: '#F9FAFB' }}>
                <Clock className="w-8 h-8 mx-auto mb-2" style={{ 
                  color: proceso.diasRestantes > 0 ? '#10B981' : '#DC2626' 
                }} />
                <p className="text-2xl font-extrabold mb-1" style={{ 
                  color: proceso.diasRestantes > 0 ? '#10B981' : '#DC2626' 
                }}>
                  {Math.abs(proceso.diasRestantes)}
                </p>
                <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                  {proceso.diasRestantes > 0 ? 'Días restantes' : 'Días vencido'}
                </p>
              </div>
              <div className="p-4 rounded-xl text-center" style={{ background: '#F9FAFB' }}>
                <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#003DA5' }} />
                <p className="text-2xl font-extrabold mb-1" style={{ color: '#003DA5' }}>
                  {proceso.porcentajeTiempo}%
                </p>
                <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                  Tiempo transcurrido
                </p>
              </div>
            </div>
          </div>

          {/* Última Actuación */}
          <div className="p-5 rounded-xl" style={{ background: '#E0EDFF' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#003DA5' }}>
              ÚLTIMA ACTUACIÓN
            </p>
            <p className="text-sm font-medium" style={{ color: '#003DA5' }}>
              {proceso.ultimaActuacion}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex items-center gap-3" style={{ borderColor: '#E5E7EB' }}>
          <button
            onClick={() => toast.info('Editar proceso')}
            className="flex-1 px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Edit className="w-4 h-4" />
            Editar Proceso
          </button>
          <button
            onClick={() => toast.info('Descargar expediente')}
            className="px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2"
            style={{ background: '#F3F4F6', color: '#4B5563' }}
          >
            <Download className="w-4 h-4" />
            Descargar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== MODAL CREAR/EDITAR ====================
function ModalFormularioProceso({ onClose, proceso }: { onClose: () => void; proceso?: Proceso }) {
  const [formData, setFormData] = useState({
    disciplinable: proceso?.disciplinable || '',
    cedula: proceso?.cedula || '',
    cargo: proceso?.cargo || '',
    dependencia: proceso?.dependencia || '',
    email: proceso?.email || '',
    telefono: proceso?.telefono || '',
    hechos: proceso?.hechos || '',
    profesionalAsignado: proceso?.profesionalAsignado || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(proceso ? 'Proceso actualizado exitosamente' : 'Proceso creado exitosamente');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] overflow-auto"
        style={{ background: '#FFFFFF' }}
      >
        <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold" style={{ color: '#003DA5' }}>
              {proceso ? 'Editar Proceso' : 'Nuevo Proceso Disciplinario'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" style={{ color: '#6B7280' }} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información del Disciplinable */}
          <div>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#1F2937' }}>
              Información del Disciplinable
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.disciplinable}
                  onChange={(e) => setFormData({ ...formData, disciplinable: e.target.value })}
                  placeholder="Ej: Juan Carlos Pérez López"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Cédula *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.cedula}
                  onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                  placeholder="Ej: 1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Cargo *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  placeholder="Ej: Profesional Universitario"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Dependencia *
                </label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.dependencia}
                  onChange={(e) => setFormData({ ...formData, dependencia: e.target.value })}
                >
                  <option value="">Seleccione...</option>
                  <option value="Dirección Nacional">Dirección Nacional</option>
                  <option value="Territorial Bogotá">Territorial Bogotá</option>
                  <option value="Territorial Antioquia">Territorial Antioquia</option>
                  <option value="Territorial Valle">Territorial Valle</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Email *
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ejemplo@esap.edu.co"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Teléfono
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="3001234567"
                />
              </div>
            </div>
          </div>

          {/* Descripción de Hechos */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Descripción de Hechos *
            </label>
            <textarea
              required
              rows={5}
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
              style={{ borderColor: '#E5E7EB' }}
              value={formData.hechos}
              onChange={(e) => setFormData({ ...formData, hechos: e.target.value })}
              placeholder="Describa los hechos de manera detallada..."
            />
          </div>

          {/* Asignación */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Profesional Asignado *
            </label>
            <select
              required
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
              style={{ borderColor: '#E5E7EB' }}
              value={formData.profesionalAsignado}
              onChange={(e) => setFormData({ ...formData, profesionalAsignado: e.target.value })}
            >
              <option value="">Seleccione profesional...</option>
              <option value="Juan Pérez">Juan Pérez Rodríguez</option>
              <option value="María Torres">María Torres Gómez</option>
              <option value="Carlos Mendoza">Carlos Mendoza Silva</option>
              <option value="Ana González">Ana González López</option>
            </select>
          </div>

          {/* Botones */}
          <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Save className="w-4 h-4" />
              {proceso ? 'Actualizar Proceso' : 'Crear Proceso'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#F3F4F6', color: '#4B5563' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export function GestionProcesos() {
  const [procesos, setProcesos] = useState(PROCESOS_DATA);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todos');
  const [filtroSemaforo, setFiltroSemaforo] = useState<string>('todos');
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<Proceso | null>(null);
  const [showModal, setShowModal] = useState<'detalle' | 'formulario' | null>(null);
  const [procesoEditar, setProcesoEditar] = useState<Proceso | undefined>();

  const procesosFiltrados = procesos.filter(p => {
    const matchSearch = p.consecutivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       p.disciplinable.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       p.cedula.includes(searchTerm);
    const matchEtapa = filtroEtapa === 'todos' || p.etapaActual === filtroEtapa;
    const matchSemaforo = filtroSemaforo === 'todos' || p.semaforo === filtroSemaforo;
    
    return matchSearch && matchEtapa && matchSemaforo;
  });

  const handleEliminar = (id: string) => {
    if (confirm('¿Está seguro de eliminar este proceso?')) {
      setProcesos(procesos.filter(p => p.id !== id));
      toast.success('Proceso eliminado exitosamente');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#003DA5' }}>
            Gestión de Procesos
          </h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Administración completa de procesos disciplinarios
          </p>
        </div>
        <button
          onClick={() => {
            setProcesoEditar(undefined);
            setShowModal('formulario');
          }}
          className="px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:opacity-90"
          style={{ background: '#003DA5', color: '#FFFFFF' }}
        >
          <Plus className="w-4 h-4" />
          Nuevo Proceso
        </button>
      </div>

      {/* Filtros */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Búsqueda */}
          <div className="flex-1 w-full relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Buscar por consecutivo, nombre o cédula..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
              style={{ borderColor: '#E5E7EB' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtro Etapa */}
          <select
            className="px-4 py-3 rounded-xl border-2 focus:outline-none font-semibold"
            style={{ borderColor: '#E5E7EB', color: '#4B5563' }}
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value)}
          >
            <option value="todos">Todas las etapas</option>
            <option value="Recepción">Recepción</option>
            <option value="Valoración">Valoración</option>
            <option value="Indagación">Indagación</option>
            <option value="Investigación">Investigación</option>
            <option value="Juzgamiento">Juzgamiento</option>
            <option value="Fallo">Fallo</option>
          </select>

          {/* Filtro Semáforo */}
          <select
            className="px-4 py-3 rounded-xl border-2 focus:outline-none font-semibold"
            style={{ borderColor: '#E5E7EB', color: '#4B5563' }}
            value={filtroSemaforo}
            onChange={(e) => setFiltroSemaforo(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            <option value="verde">✓ Al día</option>
            <option value="amarillo">⚠ Próximo a vencer</option>
            <option value="rojo">✕ Vencido</option>
          </select>

          {/* Exportar */}
          <button
            onClick={() => toast.info('Exportando a Excel...')}
            className="px-4 py-3 rounded-xl font-semibold flex items-center gap-2"
            style={{ background: '#10B981', color: '#FFFFFF' }}
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>

        {/* Resultados */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            Mostrando <span className="font-bold" style={{ color: '#003DA5' }}>{procesosFiltrados.length}</span> de {procesos.length} procesos
          </p>
          {(filtroEtapa !== 'todos' || filtroSemaforo !== 'todos' || searchTerm) && (
            <button
              onClick={() => {
                setFiltroEtapa('todos');
                setFiltroSemaforo('todos');
                setSearchTerm('');
              }}
              className="text-sm font-semibold hover:underline"
              style={{ color: '#DC2626' }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </Card>

      {/* Lista de Procesos */}
      <div className="space-y-4">
        {procesosFiltrados.map((proceso) => (
          <Card key={proceso.id} className="p-5 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                {/* Semáforo */}
                <div
                  className="w-4 h-4 rounded-full ring-4 flex-shrink-0"
                  style={{
                    background: proceso.semaforo === 'verde' ? '#10B981' : proceso.semaforo === 'amarillo' ? '#F59E0B' : '#DC2626',
                    ringColor: proceso.semaforo === 'verde' ? '#D1FAE5' : proceso.semaforo === 'amarillo' ? '#FEF3C7' : '#FEE2E2'
                  }}
                />

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-extrabold" style={{ color: '#003DA5' }}>
                      {proceso.consecutivo}
                    </h3>
                    <Badge className="text-xs">{proceso.noticia}</Badge>
                    <Badge 
                      className="text-xs font-semibold"
                      style={{ background: '#E0EDFF', color: '#003DA5' }}
                    >
                      {proceso.etapaActual}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#1F2937' }}>
                    {proceso.disciplinable}
                  </p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>
                    {proceso.cargo} • {proceso.dependencia}
                  </p>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-3">
                <div className="text-right mr-4">
                  <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                    {proceso.diasRestantes > 0 ? 'Vence en' : 'Vencido hace'}
                  </p>
                  <p 
                    className="text-sm font-bold"
                    style={{ color: proceso.diasRestantes > 0 ? '#10B981' : '#DC2626' }}
                  >
                    {Math.abs(proceso.diasRestantes)} días
                  </p>
                </div>

                <button
                  onClick={() => {
                    setProcesoSeleccionado(proceso);
                    setShowModal('detalle');
                  }}
                  className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                  title="Ver detalle"
                >
                  <Eye className="w-5 h-5" style={{ color: '#003DA5' }} />
                </button>
                <button
                  onClick={() => {
                    setProcesoEditar(proceso);
                    setShowModal('formulario');
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Editar"
                >
                  <Edit className="w-5 h-5" style={{ color: '#6B7280' }} />
                </button>
                <button
                  onClick={() => handleEliminar(proceso.id)}
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-5 h-5" style={{ color: '#DC2626' }} />
                </button>
              </div>
            </div>
          </Card>
        ))}

        {procesosFiltrados.length === 0 && (
          <Card className="p-12 text-center border-2" style={{ borderColor: '#E5E7EB' }}>
            <FolderOpen className="w-16 h-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>
              No se encontraron procesos
            </h3>
            <p style={{ color: '#6B7280' }}>
              Intenta ajustar los filtros o crear un nuevo proceso
            </p>
          </Card>
        )}
      </div>

      {/* Modales */}
      <AnimatePresence>
        {showModal === 'detalle' && procesoSeleccionado && (
          <ModalDetalleProces
            proceso={procesoSeleccionado}
            onClose={() => {
              setShowModal(null);
              setProcesoSeleccionado(null);
            }}
          />
        )}
        {showModal === 'formulario' && (
          <ModalFormularioProceso
            proceso={procesoEditar}
            onClose={() => {
              setShowModal(null);
              setProcesoEditar(undefined);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}