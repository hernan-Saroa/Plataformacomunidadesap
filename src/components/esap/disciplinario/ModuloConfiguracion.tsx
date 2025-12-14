/**
 * MÓDULO DE CONFIGURACIÓN - Control Disciplinario
 * Parámetros del sistema y configuraciones generales
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Save, Settings, Clock, Users, Bell, FileText, Shield,
  AlertTriangle, CheckCircle, Mail, Calendar, Target, Zap,
  Plus, Trash2, Edit2, GripVertical, X
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

// Tipo para etapa dinámica
interface Etapa {
  id: string;
  nombre: string;
  dias: number;
  orden: number;
}

// Tipo para cargo/perfil dinámico
interface Cargo {
  id: string;
  nombre: string;
  capacidad: number;
  rolId?: string; // Referencia al rol del módulo de Roles y Permisos
}

export function ModuloConfiguracion() {
  // Estados de configuración - Etapas ahora dinámicas
  const [etapas, setEtapas] = useState<Etapa[]>([
    { id: '1', nombre: 'RECEPCIÓN', dias: 3, orden: 1 },
    { id: '2', nombre: 'VALORACIÓN', dias: 10, orden: 2 },
    { id: '3', nombre: 'INDAGACIÓN', dias: 40, orden: 3 },
    { id: '4', nombre: 'INVESTIGACIÓN', dias: 80, orden: 4 },
    { id: '5', nombre: 'JUZGAMIENTO', dias: 50, orden: 5 },
    { id: '6', nombre: 'FALLO', dias: 10, orden: 6 }
  ]);

  const [editandoEtapa, setEditandoEtapa] = useState<string | null>(null);
  const [nombreEditando, setNombreEditando] = useState('');

  // Capacidades ahora son dinámicas - pueden agregarse/quitarse
  const [cargos, setCargos] = useState<Cargo[]>([
    { id: '1', nombre: 'ESPECIALIZADO', capacidad: 12, rolId: 'rol-especializado' },
    { id: '2', nombre: 'UNIVERSITARIO', capacidad: 10, rolId: 'rol-universitario' },
    { id: '3', nombre: 'SENIOR', capacidad: 15, rolId: 'rol-senior' },
    { id: '4', nombre: 'COORDINADOR', capacidad: 8, rolId: 'rol-coordinador' }
  ]);

  const [editandoCargo, setEditandoCargo] = useState<string | null>(null);
  const [nombreCargoEditando, setNombreCargoEditando] = useState('');
  const [mostrarModalAgregarCargo, setMostrarModalAgregarCargo] = useState(false);
  const [nuevoCargoNombre, setNuevoCargoNombre] = useState('');
  const [nuevoCargoCapacidad, setNuevoCargoCapacidad] = useState(10);

  const [notificaciones, setNotificaciones] = useState({
    vencimiento7dias: true,
    vencimiento3dias: true,
    vencimiento1dia: true,
    procesoVencido: true,
    asignacionProceso: true,
    cambioEtapa: true,
    aprobacionRequerida: false,
    resumenDiario: true,
    resumenSemanal: true
  });

  const [alertas, setAlertas] = useState({
    porcentajeRiesgo: 85,
    porcentajeCritico: 95,
    capacidadAlerta: 90,
    diasAnticipacion: 7
  });

  const handleGuardar = () => {
    toast.success('Configuración guardada exitosamente', {
      description: 'Los cambios se aplicarán de inmediato'
    });
  };

  const handleRestablecer = () => {
    if (confirm('¿Está seguro de restablecer la configuración a valores por defecto?')) {
      toast.info('Configuración restablecida');
    }
  };

  const handleAgregarEtapa = () => {
    const nuevaEtapa: Etapa = {
      id: (etapas.length + 1).toString(),
      nombre: 'NUEVA ETAPA',
      dias: 10,
      orden: etapas.length + 1
    };
    setEtapas([...etapas, nuevaEtapa]);
  };

  const handleEliminarEtapa = (id: string) => {
    setEtapas(etapas.filter(etapa => etapa.id !== id));
  };

  const handleEditarEtapa = (id: string) => {
    const etapa = etapas.find(etapa => etapa.id === id);
    if (etapa) {
      setEditandoEtapa(id);
      setNombreEditando(etapa.nombre);
    }
  };

  const handleGuardarEdicionEtapa = (id: string) => {
    setEtapas(etapas.map(etapa => etapa.id === id ? { ...etapa, nombre: nombreEditando } : etapa));
    setEditandoEtapa(null);
    setNombreEditando('');
  };

  const handleAgregarCargo = () => {
    const nuevoCargo: Cargo = {
      id: (cargos.length + 1).toString(),
      nombre: nuevoCargoNombre,
      capacidad: nuevoCargoCapacidad
    };
    setCargos([...cargos, nuevoCargo]);
    setMostrarModalAgregarCargo(false);
    setNuevoCargoNombre('');
    setNuevoCargoCapacidad(10);
    toast.success('Cargo agregado exitosamente', {
      description: `${nuevoCargoNombre} con capacidad de ${nuevoCargoCapacidad} procesos`
    });
  };

  const handleEliminarCargo = (id: string) => {
    const cargo = cargos.find(c => c.id === id);
    setCargos(cargos.filter(cargo => cargo.id !== id));
    if (cargo) {
      toast.info('Cargo eliminado', {
        description: `${cargo.nombre} ha sido removido`
      });
    }
  };

  const handleEditarCargo = (id: string) => {
    const cargo = cargos.find(cargo => cargo.id === id);
    if (cargo) {
      setEditandoCargo(id);
      setNombreCargoEditando(cargo.nombre);
    }
  };

  const handleGuardarEdicionCargo = (id: string) => {
    setCargos(cargos.map(cargo => cargo.id === id ? { ...cargo, nombre: nombreCargoEditando } : cargo));
    setEditandoCargo(null);
    setNombreCargoEditando('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#003DA5' }}>
            Configuración del Sistema
          </h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Parámetros y ajustes del módulo disciplinario
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRestablecer}
            className="px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2"
            style={{ background: '#F3F4F6', color: '#4B5563' }}
          >
            Restablecer
          </button>
          <button
            onClick={handleGuardar}
            className="px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:opacity-90"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Tiempos por Etapa */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl" style={{ background: '#E0EDFF' }}>
            <Clock className="w-6 h-6" style={{ color: '#003DA5' }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
              Tiempos por Etapa
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Duración estándar en días para cada etapa del proceso
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {etapas.map(etapa => (
            <div key={etapa.id} className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
              <label className="block mb-3">
                <span className="text-sm font-bold uppercase mb-2 block" style={{ color: '#4B5563' }}>
                  {editandoEtapa === etapa.id ? (
                    <input
                      type="text"
                      value={nombreEditando}
                      onChange={(e) => setNombreEditando(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                      style={{ borderColor: '#E5E7EB' }}
                    />
                  ) : (
                    etapa.nombre
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={etapa.dias}
                    onChange={(e) => setEtapas(etapas.map(e => e.id === etapa.id ? { ...e, dias: parseInt(e.target.value) || 0 } : e))}
                    className="flex-1 px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                  <span className="text-sm font-semibold whitespace-nowrap" style={{ color: '#6B7280' }}>
                    días
                  </span>
                </div>
              </label>
              <div className="flex items-center gap-2 mt-2">
                <Calendar className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                <span className="text-xs" style={{ color: '#9CA3AF' }}>
                  Tiempo estándar estimado
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {editandoEtapa === etapa.id ? (
                  <button
                    onClick={() => handleGuardarEdicionEtapa(etapa.id)}
                    className="px-2 py-1.5 rounded-xl font-semibold flex items-center gap-2"
                    style={{ background: '#003DA5', color: '#FFFFFF' }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Guardar
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleEditarEtapa(etapa.id)}
                      className="px-2 py-1.5 rounded-xl font-semibold flex items-center gap-2"
                      style={{ background: '#F3F4F6', color: '#4B5563' }}
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminarEtapa(etapa.id)}
                      className="px-2 py-1.5 rounded-xl font-semibold flex items-center gap-2"
                      style={{ background: '#F3F4F6', color: '#4B5563' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          <div className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
            <button
              onClick={handleAgregarEtapa}
              className="px-2 py-1.5 rounded-xl font-semibold flex items-center gap-2"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Plus className="w-4 h-4" />
              Agregar Etapa
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl flex items-start gap-3" style={{ background: '#E0EDFF' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#003DA5' }} />
          <p className="text-sm" style={{ color: '#003DA5' }}>
            <span className="font-bold">Importante:</span> Estos tiempos se utilizan para calcular las alertas automáticas y el semáforo de cada proceso.
          </p>
        </div>
      </Card>

      {/* Capacidades por Cargo */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl" style={{ background: '#D1FAE5' }}>
            <Users className="w-6 h-6" style={{ color: '#10B981' }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
              Capacidad por Cargo
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Número máximo de procesos que puede gestionar cada tipo de profesional
            </p>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-xl flex items-start gap-3" style={{ background: '#E0EDFF' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#003DA5' }} />
          <p className="text-sm" style={{ color: '#003DA5' }}>
            <span className="font-bold">Recordatorio:</span> Estas son configuraciones de capacidad. Los usuarios se crean únicamente desde{' '}
            <span className="font-bold">Administración de Personas → Roles y Permisos</span>. En la sección "Profesionales" solo se asignan usuarios existentes al equipo disciplinario.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cargos.map(cargo => (
            <div key={cargo.id} className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5" style={{ color: '#003DA5' }} />
                <span className="text-sm font-bold uppercase" style={{ color: '#1F2937' }}>
                  {cargo.nombre}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={cargo.capacidad}
                  onChange={(e) => setCargos(cargos.map(c => c.id === cargo.id ? { ...c, capacidad: parseInt(e.target.value) || 0 } : c))}
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] text-center text-xl font-bold"
                  style={{ borderColor: '#E5E7EB', color: '#003DA5' }}
                />
              </div>
              <p className="text-xs text-center mt-2" style={{ color: '#9CA3AF' }}>
                procesos máximo
              </p>
              <div className="flex items-center gap-2 mt-2">
                {editandoCargo === cargo.id ? (
                  <button
                    onClick={() => handleGuardarEdicionCargo(cargo.id)}
                    className="px-2 py-1.5 rounded-xl font-semibold flex items-center gap-2"
                    style={{ background: '#003DA5', color: '#FFFFFF' }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Guardar
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleEditarCargo(cargo.id)}
                      className="px-2 py-1.5 rounded-xl font-semibold flex items-center gap-2"
                      style={{ background: '#F3F4F6', color: '#4B5563' }}
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminarCargo(cargo.id)}
                      className="px-2 py-1.5 rounded-xl font-semibold flex items-center gap-2"
                      style={{ background: '#F3F4F6', color: '#4B5563' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          <div className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
            <button
              onClick={() => setMostrarModalAgregarCargo(true)}
              className="px-2 py-1.5 rounded-xl font-semibold flex items-center gap-2"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Plus className="w-4 h-4" />
              Agregar Cargo
            </button>
          </div>
        </div>

        {/* Modal para agregar cargo */}
        <AnimatePresence>
          {mostrarModalAgregarCargo && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-50"
                onClick={() => setMostrarModalAgregarCargo(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
              >
                <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto border-2" style={{ borderColor: '#003DA5' }}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl" style={{ background: '#E0EDFF' }}>
                        <Plus className="w-6 h-6" style={{ color: '#003DA5' }} />
                      </div>
                      <h3 className="text-xl font-extrabold" style={{ color: '#003DA5' }}>
                        Agregar Nuevo Cargo
                      </h3>
                    </div>
                    <button
                      onClick={() => setMostrarModalAgregarCargo(false)}
                      className="p-2 rounded-xl hover:bg-gray-100"
                    >
                      <X className="w-5 h-5" style={{ color: '#6B7280' }} />
                    </button>
                  </div>

                  <div className="p-4 rounded-xl mb-6 flex items-start gap-3" style={{ background: '#E0EDFF' }}>
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#003DA5' }} />
                    <p className="text-sm" style={{ color: '#003DA5' }}>
                      <span className="font-bold">Importante:</span> Los cargos deben estar creados en la sección de Gestión de Personas - Roles y Permisos.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                        Nombre del Cargo / Perfil
                      </label>
                      <input
                        type="text"
                        value={nuevoCargoNombre}
                        onChange={(e) => setNuevoCargoNombre(e.target.value)}
                        placeholder="Ej: Profesional Especializado"
                        className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                        style={{ borderColor: '#E5E7EB' }}
                      />
                      <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                        Ingresa el nombre del cargo o perfil desde Roles y Permisos
                      </p>
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
                        Capacidad Máxima de Procesos
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={nuevoCargoCapacidad}
                        onChange={(e) => setNuevoCargoCapacidad(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] text-center text-2xl font-bold"
                        style={{ borderColor: '#E5E7EB', color: '#003DA5' }}
                      />
                      <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                        Número máximo de procesos disciplinarios asignables
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-8">
                    <button
                      onClick={() => setMostrarModalAgregarCargo(false)}
                      className="px-6 py-3 rounded-xl font-semibold"
                      style={{ background: '#F3F4F6', color: '#4B5563' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAgregarCargo}
                      disabled={!nuevoCargoNombre || nuevoCargoCapacidad <= 0}
                      className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#003DA5', color: '#FFFFFF' }}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Agregar Cargo
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </Card>

      {/* Notificaciones */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
            <Bell className="w-6 h-6" style={{ color: '#F59E0B' }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
              Notificaciones
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Configura las alertas automáticas del sistema
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Alertas de Vencimiento */}
          <div className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
            <h3 className="text-sm font-bold mb-4 uppercase" style={{ color: '#4B5563' }}>
              Alertas de Vencimiento
            </h3>
            <div className="space-y-3">
              {[
                { key: 'vencimiento7dias', label: '7 días antes del vencimiento' },
                { key: 'vencimiento3dias', label: '3 días antes del vencimiento' },
                { key: 'vencimiento1dia', label: '1 día antes del vencimiento' },
                { key: 'procesoVencido', label: 'Proceso vencido (inmediato)' }
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificaciones[item.key as keyof typeof notificaciones]}
                    onChange={(e) => setNotificaciones({
                      ...notificaciones,
                      [item.key]: e.target.checked
                    })}
                    className="w-5 h-5 rounded border-2 focus:outline-none"
                    style={{ 
                      borderColor: '#E5E7EB',
                      accentColor: '#003DA5'
                    }}
                  />
                  <span className="text-sm font-medium" style={{ color: '#1F2937' }}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Notificaciones de Proceso */}
          <div className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
            <h3 className="text-sm font-bold mb-4 uppercase" style={{ color: '#4B5563' }}>
              Notificaciones de Proceso
            </h3>
            <div className="space-y-3">
              {[
                { key: 'asignacionProceso', label: 'Asignación de nuevo proceso' },
                { key: 'cambioEtapa', label: 'Cambio de etapa' },
                { key: 'aprobacionRequerida', label: 'Aprobación requerida' }
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificaciones[item.key as keyof typeof notificaciones]}
                    onChange={(e) => setNotificaciones({
                      ...notificaciones,
                      [item.key]: e.target.checked
                    })}
                    className="w-5 h-5 rounded border-2 focus:outline-none"
                    style={{ 
                      borderColor: '#E5E7EB',
                      accentColor: '#003DA5'
                    }}
                  />
                  <span className="text-sm font-medium" style={{ color: '#1F2937' }}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Resúmenes */}
          <div className="p-5 rounded-xl md:col-span-2" style={{ background: '#F9FAFB' }}>
            <h3 className="text-sm font-bold mb-4 uppercase" style={{ color: '#4B5563' }}>
              Resúmenes Automáticos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'resumenDiario', label: 'Resumen diario (8:00 AM)' },
                { key: 'resumenSemanal', label: 'Resumen semanal (Lunes 8:00 AM)' }
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificaciones[item.key as keyof typeof notificaciones]}
                    onChange={(e) => setNotificaciones({
                      ...notificaciones,
                      [item.key]: e.target.checked
                    })}
                    className="w-5 h-5 rounded border-2 focus:outline-none"
                    style={{ 
                      borderColor: '#E5E7EB',
                      accentColor: '#003DA5'
                    }}
                  />
                  <span className="text-sm font-medium" style={{ color: '#1F2937' }}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Parámetros de Alertas */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
            <AlertTriangle className="w-6 h-6" style={{ color: '#DC2626' }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
              Parámetros de Alertas
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Umbrales para activar las alertas del sistema
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl" style={{ background: '#FFFBEB' }}>
            <label className="block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: '#1F2937' }}>
                  Porcentaje de Riesgo (Amarillo)
                </span>
                <Badge style={{ background: '#FEF3C7', color: '#D97706' }}>
                  {alertas.porcentajeRiesgo}%
                </Badge>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={alertas.porcentajeRiesgo}
                onChange={(e) => setAlertas({
                  ...alertas,
                  porcentajeRiesgo: parseInt(e.target.value)
                })}
                className="w-full"
              />
              <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                Cuando el proceso alcanza este % del tiempo estimado, se marca en amarillo
              </p>
            </label>
          </div>

          <div className="p-5 rounded-xl" style={{ background: '#FEF2F2' }}>
            <label className="block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: '#1F2937' }}>
                  Porcentaje Crítico (Rojo)
                </span>
                <Badge style={{ background: '#FEE2E2', color: '#DC2626' }}>
                  {alertas.porcentajeCritico}%
                </Badge>
              </div>
              <input
                type="range"
                min="80"
                max="100"
                value={alertas.porcentajeCritico}
                onChange={(e) => setAlertas({
                  ...alertas,
                  porcentajeCritico: parseInt(e.target.value)
                })}
                className="w-full"
              />
              <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                Cuando el proceso alcanza este % del tiempo estimado, se marca en rojo
              </p>
            </label>
          </div>

          <div className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
            <label className="block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: '#1F2937' }}>
                  Alerta de Capacidad
                </span>
                <Badge style={{ background: '#E0EDFF', color: '#003DA5' }}>
                  {alertas.capacidadAlerta}%
                </Badge>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={alertas.capacidadAlerta}
                onChange={(e) => setAlertas({
                  ...alertas,
                  capacidadAlerta: parseInt(e.target.value)
                })}
                className="w-full"
              />
              <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                Alertar cuando un profesional alcanza este % de su capacidad
              </p>
            </label>
          </div>

          <div className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
            <label className="block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: '#1F2937' }}>
                  Días de Anticipación
                </span>
                <Badge style={{ background: '#E0EDFF', color: '#003DA5' }}>
                  {alertas.diasAnticipacion} días
                </Badge>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={alertas.diasAnticipacion}
                onChange={(e) => setAlertas({
                  ...alertas,
                  diasAnticipacion: parseInt(e.target.value)
                })}
                className="w-full"
              />
              <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                Notificar con esta anticipación antes del vencimiento
              </p>
            </label>
          </div>
        </div>
      </Card>

      {/* Seguridad y Auditoría */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl" style={{ background: '#E0EDFF' }}>
            <Shield className="w-6 h-6" style={{ color: '#003DA5' }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
              Seguridad y Auditoría
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Configuraciones de trazabilidad y seguridad
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 cursor-pointer" style={{ background: '#F9FAFB' }}>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded border-2"
              style={{ accentColor: '#003DA5' }}
            />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                Registro de auditoría
              </p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Guardar todas las acciones en el log
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 cursor-pointer" style={{ background: '#F9FAFB' }}>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded border-2"
              style={{ accentColor: '#003DA5' }}
            />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                Firma digital requerida
              </p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Para aprobar actos administrativos
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 cursor-pointer" style={{ background: '#F9FAFB' }}>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded border-2"
              style={{ accentColor: '#003DA5' }}
            />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                Backup automático
              </p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Respaldo diario a las 00:00
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 cursor-pointer" style={{ background: '#F9FAFB' }}>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded border-2"
              style={{ accentColor: '#003DA5' }}
            />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                Notificaciones por email
              </p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Enviar copia de alertas a email
              </p>
            </div>
          </label>
        </div>
      </Card>

      {/* Botones de Acción */}
      <div className="flex items-center justify-between p-6 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6" style={{ color: '#10B981' }} />
          <div>
            <p className="font-bold text-sm" style={{ color: '#1F2937' }}>
              Cambios pendientes
            </p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              Recuerda guardar para aplicar la configuración
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRestablecer}
            className="px-6 py-2.5 rounded-xl font-semibold"
            style={{ background: '#F3F4F6', color: '#4B5563' }}
          >
            Restablecer
          </button>
          <button
            onClick={handleGuardar}
            className="px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}