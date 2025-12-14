/**
 * GESTIÓN DE PROFESIONALES - Control Disciplinario
 * CRUD Completo de Profesionales del equipo disciplinario
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, Filter, Download, Eye, Edit, Trash2, MoreVertical,
  X, Save, Users, Mail, Phone, Award, Target, TrendingUp, Clock,
  AlertTriangle, CheckCircle, FolderOpen, User, Briefcase, MapPin
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';

interface Profesional {
  id: string;
  nombre: string;
  cargo: string;
  especialidad: string;
  email: string;
  telefono: string;
  procesosAsignados: number;
  capacidadMaxima: number;
  procesosVencidos: number;
  procesosEnRiesgo: number;
  procesosAlDia: number;
  fechaIngreso: string;
  estado: 'activo' | 'inactivo' | 'vacaciones';
  tipoContrato: 'Planta' | 'Contratista';
  territorial: string;
}

const PROFESIONALES_DATA: Profesional[] = [
  {
    id: '1',
    nombre: 'Juan Pérez Rodríguez',
    cargo: 'Profesional Especializado',
    especialidad: 'Derecho Disciplinario',
    email: 'juan.perez@esap.edu.co',
    telefono: '3001234567',
    procesosAsignados: 8,
    capacidadMaxima: 12,
    procesosVencidos: 1,
    procesosEnRiesgo: 2,
    procesosAlDia: 5,
    fechaIngreso: '2020-03-15',
    estado: 'activo',
    tipoContrato: 'Planta',
    territorial: 'Dirección Nacional'
  },
  {
    id: '2',
    nombre: 'María Torres Gómez',
    cargo: 'Profesional Universitario',
    especialidad: 'Derecho Administrativo',
    email: 'maria.torres@esap.edu.co',
    telefono: '3109876543',
    procesosAsignados: 6,
    capacidadMaxima: 10,
    procesosVencidos: 0,
    procesosEnRiesgo: 1,
    procesosAlDia: 5,
    fechaIngreso: '2021-06-10',
    estado: 'activo',
    tipoContrato: 'Contratista',
    territorial: 'Territorial Bogotá'
  },
  {
    id: '3',
    nombre: 'Carlos Mendoza Silva',
    cargo: 'Profesional Especializado',
    especialidad: 'Derecho Disciplinario',
    email: 'carlos.mendoza@esap.edu.co',
    telefono: '3205551234',
    procesosAsignados: 11,
    capacidadMaxima: 12,
    procesosVencidos: 2,
    procesosEnRiesgo: 3,
    procesosAlDia: 6,
    fechaIngreso: '2019-01-20',
    estado: 'activo',
    tipoContrato: 'Planta',
    territorial: 'Dirección Nacional'
  },
  {
    id: '4',
    nombre: 'Ana González López',
    cargo: 'Profesional Universitario',
    especialidad: 'Derecho Público',
    email: 'ana.gonzalez@esap.edu.co',
    telefono: '3157778899',
    procesosAsignados: 5,
    capacidadMaxima: 10,
    procesosVencidos: 0,
    procesosEnRiesgo: 0,
    procesosAlDia: 5,
    fechaIngreso: '2022-08-05',
    estado: 'activo',
    tipoContrato: 'Contratista',
    territorial: 'Territorial Antioquia'
  },
  {
    id: '5',
    nombre: 'Roberto Sánchez Cruz',
    cargo: 'Profesional Especializado',
    especialidad: 'Derecho Disciplinario',
    email: 'roberto.sanchez@esap.edu.co',
    telefono: '3008887766',
    procesosAsignados: 0,
    capacidadMaxima: 12,
    procesosVencidos: 0,
    procesosEnRiesgo: 0,
    procesosAlDia: 0,
    fechaIngreso: '2018-05-12',
    estado: 'vacaciones',
    tipoContrato: 'Planta',
    territorial: 'Dirección Nacional'
  }
];

// ==================== MODAL VER DETALLE ====================
function ModalDetalleProfesional({ profesional, onClose }: { profesional: Profesional; onClose: () => void }) {
  const porcentajeCarga = (profesional.procesosAsignados / profesional.capacidadMaxima) * 100;
  const tasaEfectividad = profesional.procesosAsignados > 0 
    ? ((profesional.procesosAlDia / profesional.procesosAsignados) * 100).toFixed(1)
    : '100';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] overflow-auto"
        style={{ background: '#FFFFFF' }}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback style={{ background: '#003DA5', color: '#FFFFFF', fontSize: '20px' }}>
                  {profesional.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#003DA5' }}>
                  {profesional.nombre}
                </h2>
                <p className="text-sm font-medium mb-1" style={{ color: '#6B7280' }}>
                  {profesional.cargo}
                </p>
                <Badge 
                  className="text-xs"
                  style={{
                    background: profesional.estado === 'activo' ? '#D1FAE5' : profesional.estado === 'vacaciones' ? '#FEF3C7' : '#FEE2E2',
                    color: profesional.estado === 'activo' ? '#059669' : profesional.estado === 'vacaciones' ? '#D97706' : '#DC2626'
                  }}
                >
                  {profesional.estado.toUpperCase()}
                </Badge>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" style={{ color: '#6B7280' }} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Información de Contacto */}
          <div>
            <h3 className="text-lg font-extrabold mb-4" style={{ color: '#1F2937' }}>
              Información de Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: '#F9FAFB' }}>
                <div className="p-2 rounded-lg" style={{ background: '#E0EDFF' }}>
                  <Mail className="w-5 h-5" style={{ color: '#003DA5' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                    EMAIL
                  </p>
                  <p className="font-medium text-sm" style={{ color: '#1F2937' }}>
                    {profesional.email}
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: '#F9FAFB' }}>
                <div className="p-2 rounded-lg" style={{ background: '#E0EDFF' }}>
                  <Phone className="w-5 h-5" style={{ color: '#003DA5' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                    TELÉFONO
                  </p>
                  <p className="font-medium text-sm" style={{ color: '#1F2937' }}>
                    {profesional.telefono}
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: '#F9FAFB' }}>
                <div className="p-2 rounded-lg" style={{ background: '#E0EDFF' }}>
                  <Award className="w-5 h-5" style={{ color: '#003DA5' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                    ESPECIALIDAD
                  </p>
                  <p className="font-medium text-sm" style={{ color: '#1F2937' }}>
                    {profesional.especialidad}
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: '#F9FAFB' }}>
                <div className="p-2 rounded-lg" style={{ background: '#E0EDFF' }}>
                  <MapPin className="w-5 h-5" style={{ color: '#003DA5' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                    TERRITORIAL
                  </p>
                  <p className="font-medium text-sm" style={{ color: '#1F2937' }}>
                    {profesional.territorial}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Información Laboral */}
          <div>
            <h3 className="text-lg font-extrabold mb-4" style={{ color: '#1F2937' }}>
              Información Laboral
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl" style={{ background: '#F9FAFB' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                  TIPO DE CONTRATO
                </p>
                <Badge style={{ background: '#E0EDFF', color: '#003DA5' }}>
                  {profesional.tipoContrato}
                </Badge>
              </div>
              <div className="p-4 rounded-xl" style={{ background: '#F9FAFB' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                  FECHA DE INGRESO
                </p>
                <p className="font-medium" style={{ color: '#1F2937' }}>
                  {profesional.fechaIngreso}
                </p>
              </div>
            </div>
          </div>

          {/* Estadísticas de Carga */}
          <div>
            <h3 className="text-lg font-extrabold mb-4" style={{ color: '#1F2937' }}>
              Carga de Trabajo
            </h3>
            
            {/* Barra de capacidad */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold" style={{ color: '#4B5563' }}>
                  Capacidad Utilizada
                </p>
                <p className="text-sm font-bold" style={{ color: '#003DA5' }}>
                  {profesional.procesosAsignados} / {profesional.capacidadMaxima}
                </p>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${porcentajeCarga}%` }}
                  transition={{ duration: 1 }}
                  className="h-full rounded-full"
                  style={{
                    background: porcentajeCarga >= 90 
                      ? 'linear-gradient(90deg, #DC2626 0%, #EF4444 100%)'
                      : porcentajeCarga >= 70
                      ? 'linear-gradient(90deg, #F59E0B 0%, #FFC107 100%)'
                      : 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
                  }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                {porcentajeCarga.toFixed(1)}% de capacidad
              </p>
            </div>

            {/* Distribución de procesos */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl text-center border-2" style={{ borderColor: '#D1FAE5', background: '#F0FDF4' }}>
                <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#10B981' }} />
                <p className="text-2xl font-extrabold mb-1" style={{ color: '#10B981' }}>
                  {profesional.procesosAlDia}
                </p>
                <p className="text-xs font-semibold" style={{ color: '#059669' }}>
                  Al día
                </p>
              </div>
              <div className="p-4 rounded-xl text-center border-2" style={{ borderColor: '#FEF3C7', background: '#FFFBEB' }}>
                <Clock className="w-8 h-8 mx-auto mb-2" style={{ color: '#F59E0B' }} />
                <p className="text-2xl font-extrabold mb-1" style={{ color: '#F59E0B' }}>
                  {profesional.procesosEnRiesgo}
                </p>
                <p className="text-xs font-semibold" style={{ color: '#D97706' }}>
                  En riesgo
                </p>
              </div>
              <div className="p-4 rounded-xl text-center border-2" style={{ borderColor: '#FEE2E2', background: '#FEF2F2' }}>
                <AlertTriangle className="w-8 h-8 mx-auto mb-2" style={{ color: '#DC2626' }} />
                <p className="text-2xl font-extrabold mb-1" style={{ color: '#DC2626' }}>
                  {profesional.procesosVencidos}
                </p>
                <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>
                  Vencidos
                </p>
              </div>
            </div>
          </div>

          {/* Indicadores de Desempeño */}
          <div>
            <h3 className="text-lg font-extrabold mb-4" style={{ color: '#1F2937' }}>
              Indicadores de Desempeño
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
                    Tasa de Efectividad
                  </p>
                  <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} />
                </div>
                <p className="text-3xl font-extrabold" style={{ color: '#003DA5' }}>
                  {tasaEfectividad}%
                </p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  Procesos al día vs total
                </p>
              </div>
              <div className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
                    Capacidad Disponible
                  </p>
                  <Target className="w-5 h-5" style={{ color: '#003DA5' }} />
                </div>
                <p className="text-3xl font-extrabold" style={{ color: '#003DA5' }}>
                  {profesional.capacidadMaxima - profesional.procesosAsignados}
                </p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  Procesos adicionales posibles
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex items-center gap-3" style={{ borderColor: '#E5E7EB' }}>
          <button
            onClick={() => toast.info('Editar profesional')}
            className="flex-1 px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Edit className="w-4 h-4" />
            Editar Profesional
          </button>
          <button
            onClick={() => toast.info('Ver procesos asignados')}
            className="px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2"
            style={{ background: '#F3F4F6', color: '#4B5563' }}
          >
            <FolderOpen className="w-4 h-4" />
            Ver Procesos
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== MODAL CREAR/EDITAR ====================
function ModalFormularioProfesional({ onClose, profesional }: { onClose: () => void; profesional?: Profesional }) {
  const [formData, setFormData] = useState({
    nombre: profesional?.nombre || '',
    cargo: profesional?.cargo || '',
    especialidad: profesional?.especialidad || '',
    email: profesional?.email || '',
    telefono: profesional?.telefono || '',
    capacidadMaxima: profesional?.capacidadMaxima || 10,
    tipoContrato: profesional?.tipoContrato || 'Contratista',
    territorial: profesional?.territorial || '',
    estado: profesional?.estado || 'activo'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(profesional ? 'Profesional actualizado exitosamente' : 'Profesional creado exitosamente');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
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
              {profesional ? 'Editar Profesional' : 'Nuevo Profesional'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" style={{ color: '#6B7280' }} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información Personal */}
          <div>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#1F2937' }}>
              Información Personal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Juan Carlos Pérez López"
                />
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
                  Teléfono *
                </label>
                <input
                  type="tel"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="3001234567"
                />
              </div>
            </div>
          </div>

          {/* Información Laboral */}
          <div>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#1F2937' }}>
              Información Laboral
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Cargo *
                </label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                >
                  <option value="">Seleccione...</option>
                  <option value="Profesional Especializado">Profesional Especializado</option>
                  <option value="Profesional Universitario">Profesional Universitario</option>
                  <option value="Profesional Senior">Profesional Senior</option>
                  <option value="Coordinador">Coordinador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Especialidad *
                </label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.especialidad}
                  onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                >
                  <option value="">Seleccione...</option>
                  <option value="Derecho Disciplinario">Derecho Disciplinario</option>
                  <option value="Derecho Administrativo">Derecho Administrativo</option>
                  <option value="Derecho Público">Derecho Público</option>
                  <option value="Derecho Penal">Derecho Penal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Tipo de Contrato *
                </label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.tipoContrato}
                  onChange={(e) => setFormData({ ...formData, tipoContrato: e.target.value as 'Planta' | 'Contratista' })}
                >
                  <option value="Planta">Planta</option>
                  <option value="Contratista">Contratista</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Territorial *
                </label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.territorial}
                  onChange={(e) => setFormData({ ...formData, territorial: e.target.value })}
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
                  Capacidad Máxima *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="20"
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.capacidadMaxima}
                  onChange={(e) => setFormData({ ...formData, capacidadMaxima: parseInt(e.target.value) })}
                />
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  Número máximo de procesos que puede gestionar
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Estado *
                </label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value as 'activo' | 'inactivo' | 'vacaciones' })}
                >
                  <option value="activo">Activo</option>
                  <option value="vacaciones">Vacaciones</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Save className="w-4 h-4" />
              {profesional ? 'Actualizar Profesional' : 'Crear Profesional'}
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
export function GestionProfesionales() {
  const [profesionales, setProfesionales] = useState(PROFESIONALES_DATA);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<Profesional | null>(null);
  const [showModal, setShowModal] = useState<'detalle' | 'formulario' | null>(null);
  const [profesionalEditar, setProfesionalEditar] = useState<Profesional | undefined>();

  const profesionalesFiltrados = profesionales.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       p.cargo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
    
    return matchSearch && matchEstado;
  });

  const handleEliminar = (id: string) => {
    if (confirm('¿Está seguro de eliminar este profesional?')) {
      setProfesionales(profesionales.filter(p => p.id !== id));
      toast.success('Profesional eliminado exitosamente');
    }
  };

  // Estadísticas generales
  const stats = {
    total: profesionales.length,
    activos: profesionales.filter(p => p.estado === 'activo').length,
    capacidadTotal: profesionales.reduce((sum, p) => sum + p.capacidadMaxima, 0),
    procesosAsignados: profesionales.reduce((sum, p) => sum + p.procesosAsignados, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#003DA5' }}>
            Gestión de Profesionales
          </h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Equipo disciplinario y asignación de carga
          </p>
        </div>
        <button
          onClick={() => {
            setProfesionalEditar(undefined);
            setShowModal('formulario');
          }}
          className="px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:opacity-90"
          style={{ background: '#003DA5', color: '#FFFFFF' }}
        >
          <Plus className="w-4 h-4" />
          Nuevo Profesional
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-5 border-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg" style={{ background: '#E0EDFF' }}>
              <Users className="w-6 h-6" style={{ color: '#003DA5' }} />
            </div>
          </div>
          <p className="text-3xl font-extrabold mb-1" style={{ color: '#003DA5' }}>
            {stats.total}
          </p>
          <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
            Total Profesionales
          </p>
        </Card>

        <Card className="p-5 border-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg" style={{ background: '#D1FAE5' }}>
              <CheckCircle className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
          </div>
          <p className="text-3xl font-extrabold mb-1" style={{ color: '#10B981' }}>
            {stats.activos}
          </p>
          <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
            Activos
          </p>
        </Card>

        <Card className="p-5 border-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg" style={{ background: '#E0EDFF' }}>
              <Target className="w-6 h-6" style={{ color: '#003DA5' }} />
            </div>
          </div>
          <p className="text-3xl font-extrabold mb-1" style={{ color: '#003DA5' }}>
            {stats.capacidadTotal}
          </p>
          <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
            Capacidad Total
          </p>
        </Card>

        <Card className="p-5 border-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg" style={{ background: '#FEF3C7' }}>
              <FolderOpen className="w-6 h-6" style={{ color: '#F59E0B' }} />
            </div>
          </div>
          <p className="text-3xl font-extrabold mb-1" style={{ color: '#F59E0B' }}>
            {stats.procesosAsignados}
          </p>
          <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
            Procesos Asignados
          </p>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o cargo..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
              style={{ borderColor: '#E5E7EB' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-4 py-3 rounded-xl border-2 focus:outline-none font-semibold"
            style={{ borderColor: '#E5E7EB', color: '#4B5563' }}
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            <option value="activo">✓ Activos</option>
            <option value="vacaciones">🏖 En vacaciones</option>
            <option value="inactivo">✕ Inactivos</option>
          </select>

          <button
            onClick={() => toast.info('Exportando a Excel...')}
            className="px-4 py-3 rounded-xl font-semibold flex items-center gap-2"
            style={{ background: '#10B981', color: '#FFFFFF' }}
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </Card>

      {/* Lista de Profesionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profesionalesFiltrados.map((profesional) => {
          const porcentajeCarga = (profesional.procesosAsignados / profesional.capacidadMaxima) * 100;
          
          return (
            <Card key={profesional.id} className="p-5 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#E5E7EB' }}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback style={{ background: '#003DA5', color: '#FFFFFF' }}>
                      {profesional.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-sm mb-1" style={{ color: '#1F2937' }}>
                      {profesional.nombre}
                    </h3>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      {profesional.cargo}
                    </p>
                  </div>
                </div>
                <Badge
                  className="text-xs"
                  style={{
                    background: profesional.estado === 'activo' ? '#D1FAE5' : profesional.estado === 'vacaciones' ? '#FEF3C7' : '#FEE2E2',
                    color: profesional.estado === 'activo' ? '#059669' : profesional.estado === 'vacaciones' ? '#D97706' : '#DC2626'
                  }}
                >
                  {profesional.estado}
                </Badge>
              </div>

              {/* Carga */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                    CARGA DE TRABAJO
                  </p>
                  <p className="text-xs font-bold" style={{ color: '#003DA5' }}>
                    {profesional.procesosAsignados}/{profesional.capacidadMaxima}
                  </p>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${porcentajeCarga}%`,
                      background: porcentajeCarga >= 90 
                        ? '#DC2626'
                        : porcentajeCarga >= 70
                        ? '#F59E0B'
                        : '#10B981'
                    }}
                  />
                </div>
              </div>

              {/* Distribución */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 rounded-lg" style={{ background: '#F0FDF4' }}>
                  <p className="text-lg font-bold" style={{ color: '#10B981' }}>
                    {profesional.procesosAlDia}
                  </p>
                  <p className="text-xs" style={{ color: '#059669' }}>Al día</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: '#FFFBEB' }}>
                  <p className="text-lg font-bold" style={{ color: '#F59E0B' }}>
                    {profesional.procesosEnRiesgo}
                  </p>
                  <p className="text-xs" style={{ color: '#D97706' }}>Riesgo</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: '#FEF2F2' }}>
                  <p className="text-lg font-bold" style={{ color: '#DC2626' }}>
                    {profesional.procesosVencidos}
                  </p>
                  <p className="text-xs" style={{ color: '#DC2626' }}>Vencidos</p>
                </div>
              </div>

              {/* Info adicional */}
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                  <Award className="w-4 h-4" />
                  {profesional.especialidad}
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                  <Briefcase className="w-4 h-4" />
                  {profesional.tipoContrato}
                </div>
              </div>

              {/* Acciones */}
              <div className="pt-4 border-t flex items-center gap-2" style={{ borderColor: '#E5E7EB' }}>
                <button
                  onClick={() => {
                    setProfesionalSeleccionado(profesional);
                    setShowModal('detalle');
                  }}
                  className="flex-1 px-3 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90"
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <Eye className="w-4 h-4" />
                  Ver
                </button>
                <button
                  onClick={() => {
                    setProfesionalEditar(profesional);
                    setShowModal('formulario');
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" style={{ color: '#6B7280' }} />
                </button>
                <button
                  onClick={() => handleEliminar(profesional.id)}
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" style={{ color: '#DC2626' }} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {profesionalesFiltrados.length === 0 && (
        <Card className="p-12 text-center border-2" style={{ borderColor: '#E5E7EB' }}>
          <Users className="w-16 h-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
          <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>
            No se encontraron profesionales
          </h3>
          <p style={{ color: '#6B7280' }}>
            Intenta ajustar los filtros o crear un nuevo profesional
          </p>
        </Card>
      )}

      {/* Modales */}
      <AnimatePresence>
        {showModal === 'detalle' && profesionalSeleccionado && (
          <ModalDetalleProfesional
            profesional={profesionalSeleccionado}
            onClose={() => {
              setShowModal(null);
              setProfesionalSeleccionado(null);
            }}
          />
        )}
        {showModal === 'formulario' && (
          <ModalFormularioProfesional
            profesional={profesionalEditar}
            onClose={() => {
              setShowModal(null);
              setProfesionalEditar(undefined);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}