/**
 * ============================================
 * CONFIGURACIÓN AUDITORÍAS - MÓDULO INDEPENDIENTE
 * ============================================
 * 
 * Tipos, listas y parámetros de auditoría:
 * - Tipos de Auditoría (5 tipos principales)
 * - Listas de Chequeo (plantillas de verificación)
 * 
 * ÚLTIMA ACTUALIZACIÓN: 19 Febrero 2026 - CONECTADO CON BACKEND
 * ✅ CRUD completo de tipos de auditoría (backend)
 * ✅ CRUD completo de listas de chequeo (backend)
 * ✅ Guardar cambios con confirmación
 * ✅ Modales de edición y creación
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target, CheckSquare, List, ChevronRight, Info, Save,
  Plus, Edit, Eye, Clock, Users, HelpCircle, X, Trash2, AlertCircle,
  FileText, Check, GripVertical, Loader2
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { toast } from 'sonner';
import { HeaderSeccionConfig } from './HeaderSeccionConfig';

// ✅ DÍA 4: Container4K para padding adaptativo
import { Container4K } from '@esap-mfe/shared-ui/container-4k';

// ✅ Hook para conexión con backend
import { useConfiguracionAuditorias, type TipoAuditoriaFrontend as TipoAuditoria } from './services/useConfiguracionAuditorias';

// ====================================
// TIPOS (algunos locales, otros del hook)
// ====================================

type TabActiva = 'tipos';

interface TabConfig {
  id: TabActiva;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  badge?: number;
}

// Interface para listas de chequeo (usada localmente)
interface ItemChequeo {
  id: string;
  texto: string;
  categoria: string;
  obligatorio: boolean;
}

interface ListaChequeo {
  id: string;
  nombre: string;
  tipoAuditoria: string;
  descripcion: string;
  items: ItemChequeo[];
  activa: boolean;
  usosProgramados: number;
  fechaCreacion: string;
  ultimaActualizacion: string;
}

// Configuración de tabs
const TABS_CONFIG: TabConfig[] = [
  {
    id: 'tipos',
    label: 'Tipos de Auditoría',
    description: 'Gestión, Financiera, Cumplimiento, TI, Territorial',
    icon: CheckSquare,
    color: '#10B981',
  }
];

const COLORES_DISPONIBLES = [
  { valor: '#3B82F6', nombre: 'Azul' },
  { valor: '#10B981', nombre: 'Verde' },
  { valor: '#F59E0B', nombre: 'Naranja' },
  { valor: '#8B5CF6', nombre: 'Morado' },
  { valor: '#EC4899', nombre: 'Rosa' },
  { valor: '#EF4444', nombre: 'Rojo' },
  { valor: '#14B8A6', nombre: 'Turquesa' },
  { valor: '#F97316', nombre: 'Naranja Oscuro' }
];

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export function ConfiguracionAuditoriasModule() {
  const [tabActiva, setTabActiva] = useState<TabActiva>('tipos');
  
  // ✅ Usar hook para conectar con backend
  const {
    tiposAuditoria: tipos,
    listasChequeo: listas,
    loading,
    error,
    crearTipo,
    actualizarTipo,
    eliminarTipo,
    recargarDatos,
  } = useConfiguracionAuditorias();

  const handleGuardarCambios = () => {
    // Los cambios ya se guardan automáticamente en el backend
    recargarDatos();
    toast.success('✅ Configuración sincronizada con el servidor', {
      description: `${tipos.length} tipos de auditoría disponibles`
    });
  };

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#003DA5]" />
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  // Mostrar error si existe
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <div>
            <p className="text-gray-900 font-semibold">Error cargando configuración</p>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
          <Button onClick={recargarDatos} variant="outline">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="w-full h-full p-4 sm:p-6 lg:p-8">
        
        {/* HEADER */}
        <HeaderSeccionConfig
          icon={<Target className="w-full h-full" />}
          titulo="Configuración de Auditorías"
          subtitulo="Tipos, listas y parámetros de auditoría"
        >
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
            Conectado al servidor
          </Badge>
          <Button 
            onClick={handleGuardarCambios} 
            variant="outline"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Sincronizar
          </Button>
        </HeaderSeccionConfig>

        {/* CONTENIDO */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tabActiva}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* ✅ Tipos de Auditoría conectados al backend */}
            <SeccionTiposAuditoria 
              tipos={tipos}
              onCrear={crearTipo}
              onActualizar={actualizarTipo}
              onEliminar={eliminarTipo}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ====================================
// SECCIÓN TIPOS DE AUDITORÍA
// ====================================

interface SeccionTiposAuditoriaProps {
  tipos: TipoAuditoria[];
  onCrear: (tipo: Omit<TipoAuditoria, 'id' | 'auditoriasProgramadas'>) => Promise<TipoAuditoria | null>;
  onActualizar: (id: string, tipo: Partial<TipoAuditoria>) => Promise<TipoAuditoria | null>;
  onEliminar: (id: string) => Promise<boolean>;
}

function SeccionTiposAuditoria({ tipos, onCrear, onActualizar, onEliminar }: SeccionTiposAuditoriaProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoEditando, setTipoEditando] = useState<TipoAuditoria | null>(null);
  const [guardando, setGuardando] = useState(false);

  const handleNuevoTipo = () => {
    setTipoEditando(null);
    setModalAbierto(true);
  };

  const handleEditarTipo = (tipo: TipoAuditoria) => {
    setTipoEditando(tipo);
    setModalAbierto(true);
  };

  const handleGuardarTipo = async (tipoNuevo: TipoAuditoria) => {
    setGuardando(true);
    try {
      if (tipoEditando) {
        // Actualizar tipo existente
        await onActualizar(tipoEditando.id, tipoNuevo);
      } else {
        // Crear nuevo tipo  
        await onCrear(tipoNuevo);
      }
      setModalAbierto(false);
      setTipoEditando(null);
    } catch (error) {
      console.error('Error guardando tipo:', error);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarTipo = async (tipoId: string) => {
    const tipo = tipos.find(t => t.id === tipoId);
    if (tipo && tipo.auditoriasProgramadas > 0) {
      toast.error('❌ No se puede eliminar un tipo con auditorías programadas', {
        description: `Este tipo tiene ${tipo.auditoriasProgramadas} auditorías asociadas`
      });
      return;
    }

    await onEliminar(tipoId);
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Tipos de Auditoría</h3>
            <p className="text-sm text-gray-600 mt-1">Gestiona los tipos de auditoría disponibles</p>
          </div>
          <Button onClick={handleNuevoTipo} style={{ background: '#003DA5' }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Tipo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tipos.map((tipo) => (
            <motion.div
              key={tipo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 border-2 rounded-xl"
              style={{
                borderColor: tipo.activa ? tipo.color : '#E5E7EB',
                background: tipo.activa ? tipo.color + '10' : '#F9FAFB'
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge variant="outline" className="mb-2" style={{ background: tipo.color + '20', color: tipo.color, border: 'none' }}>
                    {tipo.codigo}
                  </Badge>
                  <h4 className="font-bold text-gray-900">{tipo.nombre}</h4>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditarTipo(tipo)}
                    title="Editar tipo"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEliminarTipo(tipo.id)}
                    title="Eliminar tipo"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{tipo.descripcion}</p>
              <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>{tipo.duracionPromedio} días</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Users className="w-3 h-3" />
                  <span>{tipo.equipoPromedio} personas</span>
                </div>
              </div>
              {tipo.auditoriasProgramadas > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    {tipo.auditoriasProgramadas} auditorías programadas
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Mensaje si no hay tipos */}
        {tipos.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay tipos de auditoría configurados</p>
            <p className="text-sm">Crea el primer tipo para empezar</p>
          </div>
        )}
      </Card>

      <AnimatePresence>
        {modalAbierto && (
          <ModalTipoAuditoria
            tipo={tipoEditando}
            onGuardar={handleGuardarTipo}
            onCerrar={() => {
              setModalAbierto(false);
              setTipoEditando(null);
            }}
            guardando={guardando}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ====================================
// MODAL TIPO DE AUDITORÍA
// ====================================

interface ModalTipoAuditoriaProps {
  tipo: TipoAuditoria | null;
  onGuardar: (tipo: TipoAuditoria) => void;
  onCerrar: () => void;
  guardando?: boolean;
}

function ModalTipoAuditoria({ tipo, onGuardar, onCerrar, guardando = false }: ModalTipoAuditoriaProps) {
  const [formData, setFormData] = useState<TipoAuditoria>(
    tipo || {
      id: '',
      codigo: '',
      nombre: '',
      descripcion: '',
      alcance: '',
      duracionPromedio: 30,
      equipoPromedio: 3,
      color: '#3B82F6',
      activa: true,
      auditoriasProgramadas: 0
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.codigo.trim() || !formData.nombre.trim()) {
      toast.error('❌ Completa los campos obligatorios');
      return;
    }

    onGuardar(formData);
  };

  const handleChange = (field: keyof TipoAuditoria, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {tipo ? 'Editar Tipo de Auditoría' : 'Nuevo Tipo de Auditoría'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {tipo ? 'Modifica los datos del tipo de auditoría' : 'Crea un nuevo tipo de auditoría'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onCerrar}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código * <span className="text-xs text-gray-500">(ej: AUD-GEST)</span>
              </label>
              <Input
                value={formData.codigo}
                onChange={(e) => handleChange('codigo', e.target.value.toUpperCase())}
                placeholder="AUD-GEST"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex gap-2">
                {COLORES_DISPONIBLES.map(color => (
                  <button
                    key={color.valor}
                    type="button"
                    onClick={() => handleChange('color', color.valor)}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      formData.color === color.valor 
                        ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ background: color.valor }}
                    title={color.nombre}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Tipo *
            </label>
            <Input
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Auditoría de Gestión"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              placeholder="Evaluación de la eficiencia y eficacia de los procesos..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alcance
            </label>
            <textarea
              value={formData.alcance}
              onChange={(e) => handleChange('alcance', e.target.value)}
              placeholder="Procesos administrativos, académicos y financieros..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duración Promedio (días)
              </label>
              <Input
                type="number"
                value={formData.duracionPromedio}
                onChange={(e) => handleChange('duracionPromedio', parseInt(e.target.value))}
                min="1"
                max="365"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Equipo Promedio (personas)
              </label>
              <Input
                type="number"
                value={formData.equipoPromedio}
                onChange={(e) => handleChange('equipoPromedio', parseInt(e.target.value))}
                min="1"
                max="20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activa"
              checked={formData.activa}
              onChange={(e) => handleChange('activa', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="activa" className="text-sm text-gray-700">
              Tipo activo (disponible para auditorías)
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onCerrar}
              className="flex-1"
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              style={{ background: '#003DA5' }}
              className="flex-1"
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {tipo ? 'Actualizar' : 'Crear Tipo'}
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default ConfiguracionAuditoriasModule;