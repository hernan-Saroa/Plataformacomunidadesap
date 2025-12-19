/**
 * GESTIÓN DE PROFESIONALES - Control Disciplinario
 * Asignación y gestión de profesionales al equipo disciplinario
 * NOTA: Los usuarios se crean ÚNICAMENTE desde Administración de Personas
 */

import { useState, useEffect } from 'react';
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

import { disciplinaryService, DisciplinaryProcess } from '../../../services/api/disciplinary.service';

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
function ModalDetalleProfesional({ 
  profesional, 
  onClose,
  onEditar,
  onVerProcesos 
}: { 
  profesional: Profesional; 
  onClose: () => void;
  onEditar?: (profesional: Profesional) => void;
  onVerProcesos?: (profesional: Profesional) => void;
}) {
  const porcentajeCarga = (profesional.procesosAsignados / profesional.capacidadMaxima) * 100;
  const tasaEfectividad = profesional.procesosAsignados > 0 
    ? ((profesional.procesosAlDia / profesional.procesosAsignados) * 100).toFixed(1)
    : '100';

  const handleEditarProfesional = () => {
    if (onEditar) {
      onEditar(profesional);
      onClose();
    } else {
      toast.info('Función de edición no disponible', {
        description: 'Esta función se implementará próximamente'
      });
    }
  };

  const handleVerProcesos = () => {
    if (onVerProcesos) {
      onVerProcesos(profesional);
      onClose();
    } else {
      toast.info(`Procesos asignados a ${profesional.nombre}`, {
        description: `Total: ${profesional.procesosAsignados} procesos • ${profesional.procesosAlDia} al día • ${profesional.procesosEnRiesgo} en riesgo • ${profesional.procesosVencidos} vencidos`
      });
    }
  };

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
            onClick={handleEditarProfesional}
            className="flex-1 px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Edit className="w-4 h-4" />
            Editar Profesional
          </button>
          <button
            onClick={handleVerProcesos}
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

// ==================== MODAL ASIGNAR PROFESIONAL ====================
// Mock de usuarios disponibles desde Administración de Personas
const USUARIOS_DISPONIBLES = [
  { id: 'u1', nombre: 'Roberto García Martínez', cargo: 'Profesional Especializado', email: 'roberto.garcia@esap.edu.co', telefono: '3001234567' },
  { id: 'u2', nombre: 'Laura Sánchez Díaz', cargo: 'Profesional Universitario', email: 'laura.sanchez@esap.edu.co', telefono: '3109876543' },
  { id: 'u3', nombre: 'Pedro Ramírez Castro', cargo: 'Profesional Senior', email: 'pedro.ramirez@esap.edu.co', telefono: '3205551234' },
  { id: 'u4', nombre: 'Sandra Moreno León', cargo: 'Coordinador', email: 'sandra.moreno@esap.edu.co', telefono: '3157778899' }
];

function ModalFormularioProfesional({ onClose, profesional }: { onClose: () => void; profesional?: Profesional }) {
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<typeof USUARIOS_DISPONIBLES[0] | null>(null);
  const [searchUsuario, setSearchUsuario] = useState('');
  const [capacidadMaxima, setCapacidadMaxima] = useState(profesional?.capacidadMaxima || 10);
  const [especialidad, setEspecialidad] = useState(profesional?.especialidad || '');
  const [territorial, setTerritorial] = useState(profesional?.territorial || '');

  const usuariosFiltrados = USUARIOS_DISPONIBLES.filter(u =>
    u.nombre.toLowerCase().includes(searchUsuario.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUsuario.toLowerCase()) ||
    u.cargo.toLowerCase().includes(searchUsuario.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (profesional) {
      toast.success('Configuración actualizada exitosamente');
    } else {
      if (!usuarioSeleccionado) {
        toast.error('Debe seleccionar un usuario');
        return;
      }
      toast.success('Profesional asignado al equipo disciplinario exitosamente', {
        description: `${usuarioSeleccionado.nombre} ha sido agregado al equipo`
      });
    }
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
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-extrabold" style={{ color: '#003DA5' }}>
                {profesional ? 'Editar Configuración de Profesional' : 'Asignar Profesional al Equipo'}
              </h2>
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                {profesional ? 'Modifica la capacidad y configuración del profesional' : 'Selecciona un usuario existente desde Administración de Personas'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" style={{ color: '#6B7280' }} />
            </button>
          </div>
          
          {/* Alerta informativa */}
          {!profesional && (
            <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: '#E0EDFF' }}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#003DA5' }} />
              <p className="text-sm" style={{ color: '#003DA5' }}>
                <span className="font-bold">Recordatorio:</span> Los usuarios se gestionan desde <span className="font-bold">Administración de Personas</span>. Aquí solo asignas profesionales existentes al equipo disciplinario.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Selección de Usuario - Solo si es nuevo */}
          {!profesional && (
            <div>
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1F2937' }}>
                1. Seleccionar Usuario desde Administración de Personas
              </h3>
              
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email o cargo..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                    style={{ borderColor: '#E5E7EB' }}
                    value={searchUsuario}
                    onChange={(e) => setSearchUsuario(e.target.value)}
                  />
                </div>
              </div>

              {/* Lista de usuarios en formato tabla */}
              <div className="border-2 rounded-xl overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0" style={{ background: '#F9FAFB' }}>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                          Profesional
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                          Cargo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                          Contacto
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                          Seleccionar
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosFiltrados.map((usuario, index) => (
                        <tr
                          key={usuario.id}
                          onClick={() => setUsuarioSeleccionado(usuario)}
                          className={`cursor-pointer transition-colors ${
                            usuarioSeleccionado?.id === usuario.id 
                              ? 'bg-blue-50' 
                              : 'hover:bg-gray-50'
                          }`}
                          style={{ borderTop: index > 0 ? '1px solid #E5E7EB' : 'none' }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5' }}>
                                  {usuario.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-sm" style={{ color: '#1F2937' }}>
                                  {usuario.nombre}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm" style={{ color: '#6B7280' }}>
                              {usuario.cargo}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                              <p className="text-sm" style={{ color: '#6B7280' }}>
                                {usuario.email}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Phone className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                                {usuario.telefono}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center">
                              {usuarioSeleccionado?.id === usuario.id ? (
                                <div className="p-2 rounded-full" style={{ background: '#003DA5' }}>
                                  <CheckCircle className="w-5 h-5" style={{ color: '#FFFFFF' }} />
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center" style={{ borderColor: '#D1D5DB' }}>
                                  <div className="w-3 h-3 rounded-full" style={{ background: '#E5E7EB' }}></div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {usuariosFiltrados.length === 0 && (
                    <div className="p-12 text-center">
                      <Users className="w-12 h-12 mx-auto mb-3" style={{ color: '#D1D5DB' }} />
                      <p className="text-sm font-bold" style={{ color: '#6B7280' }}>
                        No se encontraron usuarios
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        Intenta con otro término de búsqueda
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {usuarioSeleccionado && (
                <div className="mt-4 p-4 rounded-xl" style={{ background: '#D1FAE5' }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                    <span className="text-sm font-bold" style={{ color: '#10B981' }}>
                      Usuario seleccionado: {usuarioSeleccionado.nombre}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Configuración Disciplinaria */}
          <div>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#1F2937' }}>
              {profesional ? 'Configuración del Profesional' : '2. Configuración para el Equipo Disciplinario'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Especialidad en Derecho *
                </label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
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
                  Territorial Asignada *
                </label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={territorial}
                  onChange={(e) => setTerritorial(e.target.value)}
                >
                  <option value="">Seleccione...</option>
                  <option value="Dirección Nacional">Dirección Nacional</option>
                  <option value="Territorial Bogotá">Territorial Bogotá</option>
                  <option value="Territorial Antioquia">Territorial Antioquia</option>
                  <option value="Territorial Valle">Territorial Valle</option>
                  <option value="Territorial Atlántico">Territorial Atlántico</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                  Capacidad Máxima de Procesos *
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    required
                    min="1"
                    max="30"
                    className="w-32 px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] text-center text-xl font-bold"
                    style={{ borderColor: '#E5E7EB', color: '#003DA5' }}
                    value={capacidadMaxima}
                    onChange={(e) => setCapacidadMaxima(parseInt(e.target.value) || 0)}
                  />
                  <span className="text-sm" style={{ color: '#6B7280' }}>procesos simultáneos</span>
                </div>
                <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                  Basado en el cargo del usuario y la configuración establecida en el módulo de Configuración
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Save className="w-4 h-4" />
              {profesional ? 'Guardar Configuración' : 'Asignar al Equipo Disciplinario'}
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
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<Profesional | null>(null);
  const [showModal, setShowModal] = useState<'detalle' | 'formulario' | null>(null);
  const [profesionalEditar, setProfesionalEditar] = useState<Profesional | undefined>();

  // Cargar profesionales del backend
  const fetchProfesionales = async () => {
    try {
      setLoading(true);
      const data = await disciplinaryService.getProfesionales();
      // Mapear los datos del backend al formato del frontend
      const mappedData = data.map((p: any) => ({
        id: p.id,
        nombre: p.nombreCompleto,
        cargo: p.cargo,
        especialidad: p.especialidad || 'General',
        email: p.email,
        telefono: p.telefono || 'N/A',
        procesosAsignados: p.procesosAsignados || 0,
        capacidadMaxima: p.capacidadMaxima || 10,
        procesosVencidos: 0,
        procesosEnRiesgo: 0,
        procesosAlDia: p.procesosAsignados || 0, // Simplificación inicial
        fechaIngreso: new Date(p.createdAt).toLocaleDateString(),
        estado: (p.estado || 'activo').toLowerCase(),
        tipoContrato: p.tipoContrato || 'Contratista',
        territorial: p.territorial || 'Nacional'
      }));
      setProfesionales(mappedData);
    } catch (error) {
      console.error('Error fetching professionals:', error);
      toast.error('Error al cargar profesionales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfesionales();
  }, []);

  const profesionalesFiltrados = profesionales.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       p.cargo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
    
    return matchSearch && matchEstado;
  });

  const handleDesasignar = (id: string) => {
    const profesional = profesionales.find(p => p.id === id);
    if (confirm(`¿Está seguro de desasignar a ${profesional?.nombre} del equipo disciplinario?`)) {
      setProfesionales(profesionales.filter(p => p.id !== id));
      toast.info('Profesional desasignado del equipo disciplinario', {
        description: 'El usuario sigue existiendo en Administración de Personas'
      });
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#003DA5' }}>
              Gestión de Profesionales - Vista Lista
            </h1>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Equipo disciplinario y asignación de carga de trabajo
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
            Asignar Profesional
          </button>
        </div>
        
        {/* Alerta informativa */}
        <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: '#E0EDFF' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#003DA5' }} />
          <div>
            <p className="text-sm" style={{ color: '#003DA5' }}>
              <span className="font-bold">Importante:</span> Los usuarios se crean únicamente desde{' '}
              <span className="font-bold">Administración de Personas</span>. 
              Aquí solo se asignan profesionales existentes al equipo disciplinario y se configura su capacidad de trabajo.
            </p>
          </div>
        </div>
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
      <Card className="border-2 overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Header de la tabla */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b-2" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
              <div className="col-span-3">
                <p className="text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                  Profesional
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                  Carga de Trabajo
                </p>
              </div>
              <div className="col-span-3">
                <p className="text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                  Distribución de Procesos
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                  Desempeño
                </p>
              </div>
              <div className="col-span-2 text-right">
                <p className="text-xs font-bold uppercase" style={{ color: '#6B7280' }}>
                  Acciones
                </p>
              </div>
            </div>

            {/* Filas de profesionales */}
            <div className="divide-y" style={{ borderColor: '#E5E7EB' }}>
              {profesionalesFiltrados.map((profesional) => {
                const porcentajeCarga = (profesional.procesosAsignados / profesional.capacidadMaxima) * 100;
                const tasaEfectividad = profesional.procesosAsignados > 0 
                  ? ((profesional.procesosAlDia / profesional.procesosAsignados) * 100).toFixed(0)
                  : '100';
                
                return (
                  <div 
                    key={profesional.id} 
                    className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Columna 1: Profesional */}
                    <div className="col-span-3 flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback style={{ background: '#003DA5', color: '#FFFFFF' }}>
                          {profesional.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate mb-1" style={{ color: '#1F2937' }}>
                          {profesional.nombre}
                        </h3>
                        <div className="flex items-center gap-2 mb-1">
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
                        <div className="flex items-center gap-2">
                          <Award className="w-3 h-3 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                          <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                            {profesional.especialidad}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Carga de Trabajo */}
                    <div className="col-span-2 flex flex-col justify-center">
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                            Capacidad
                          </p>
                          <p className="text-sm font-bold" style={{ color: '#003DA5' }}>
                            {profesional.procesosAsignados}/{profesional.capacidadMaxima}
                          </p>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
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
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        {porcentajeCarga.toFixed(0)}% de capacidad utilizada
                      </p>
                    </div>

                    {/* Columna 3: Distribución de Procesos */}
                    <div className="col-span-3 flex items-center gap-2">
                      {/* Al día */}
                      <div className="flex-1 p-2 rounded-lg border" style={{ background: '#F0FDF4', borderColor: '#D1FAE5' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
                          <p className="text-xs font-semibold" style={{ color: '#059669' }}>
                            Al día
                          </p>
                        </div>
                        <p className="text-xl font-bold" style={{ color: '#10B981' }}>
                          {profesional.procesosAlDia}
                        </p>
                      </div>

                      {/* En riesgo */}
                      <div className="flex-1 p-2 rounded-lg border" style={{ background: '#FFFBEB', borderColor: '#FEF3C7' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4" style={{ color: '#F59E0B' }} />
                          <p className="text-xs font-semibold" style={{ color: '#D97706' }}>
                            Riesgo
                          </p>
                        </div>
                        <p className="text-xl font-bold" style={{ color: '#F59E0B' }}>
                          {profesional.procesosEnRiesgo}
                        </p>
                      </div>

                      {/* Vencidos */}
                      <div className="flex-1 p-2 rounded-lg border" style={{ background: '#FEF2F2', borderColor: '#FEE2E2' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4" style={{ color: '#DC2626' }} />
                          <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>
                            Vencidos
                          </p>
                        </div>
                        <p className="text-xl font-bold" style={{ color: '#DC2626' }}>
                          {profesional.procesosVencidos}
                        </p>
                      </div>
                    </div>

                    {/* Columna 4: Desempeño */}
                    <div className="col-span-2 flex flex-col justify-center gap-2">
                      <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: '#F9FAFB' }}>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" style={{ color: '#10B981' }} />
                          <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                            Efectividad
                          </span>
                        </div>
                        <span className="text-lg font-bold" style={{ color: '#003DA5' }}>
                          {tasaEfectividad}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: '#F9FAFB' }}>
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4" style={{ color: '#003DA5' }} />
                          <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                            Disponible
                          </span>
                        </div>
                        <span className="text-lg font-bold" style={{ color: '#003DA5' }}>
                          {profesional.capacidadMaxima - profesional.procesosAsignados}
                        </span>
                      </div>
                    </div>

                    {/* Columna 5: Acciones */}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setProfesionalSeleccionado(profesional);
                          setShowModal('detalle');
                        }}
                        className="px-3 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 hover:opacity-90 transition-opacity"
                        style={{ background: '#003DA5', color: '#FFFFFF' }}
                        title="Ver detalles completos"
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
                        title="Editar configuración"
                      >
                        <Edit className="w-4 h-4" style={{ color: '#6B7280' }} />
                      </button>
                      <button
                        onClick={() => handleDesasignar(profesional.id)}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Desasignar del equipo"
                      >
                        <Trash2 className="w-4 h-4" style={{ color: '#DC2626' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {profesionalesFiltrados.length === 0 && (
        <Card className="p-12 text-center border-2" style={{ borderColor: '#E5E7EB' }}>
          <Users className="w-16 h-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
          <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>
            No se encontraron profesionales
          </h3>
          <p style={{ color: '#6B7280' }}>
            Intenta ajustar los filtros o asignar profesionales existentes desde Administración de Personas
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
            onEditar={(prof) => {
              setProfesionalEditar(prof);
              setShowModal('formulario');
            }}
            onVerProcesos={(prof) => {
              toast.info(`Procesos de ${prof.nombre}`, {
                description: `${prof.procesosAsignados} procesos asignados • ${prof.procesosAlDia} al día • ${prof.procesosEnRiesgo} en riesgo • ${prof.procesosVencidos} vencidos`,
                duration: 5000
              });
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