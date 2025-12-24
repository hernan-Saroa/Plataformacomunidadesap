/**
 * FORMULARIO DE INVESTIGACIÓN
 * 
 * Componente para registrar actividades de investigación con:
 * - Proyectos de investigación con roles (Investigador Principal, Co-investigador)
 * - Productos CTI según MinCiencias
 * - Actividades de investigación por necesidad del servicio
 * - Descarga horaria según participación
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  FlaskConical,
  Search,
  Calendar,
  Award,
  Users,
  FileText,
  Info,
  Edit2,
  BookOpen,
  CheckCircle
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface FormularioInvestigacionProps {
  actividades: any[];
  horasProgramables: number;
  horasRestantes: number;
  onChange: (actividades: any[], totalHoras: number) => void;
}

// Tipos de proyectos de investigación
const TIPOS_PROYECTO = [
  { value: 'financiado', label: 'Proyecto Financiado', horas: 240 },
  { value: 'interno', label: 'Proyecto Interno ESAP', horas: 160 },
  { value: 'interinstitucional', label: 'Proyecto Interinstitucional', horas: 200 },
  { value: 'semillero', label: 'Semillero de Investigación', horas: 80 },
];

// Roles en proyectos
const ROLES_INVESTIGACION = [
  { value: 'investigador_principal', label: 'Investigador Principal', porcentaje: 100 },
  { value: 'coinvestigador', label: 'Co-investigador', porcentaje: 60 },
  { value: 'investigador_junior', label: 'Investigador Junior', porcentaje: 40 },
  { value: 'asesor', label: 'Asesor Metodológico', porcentaje: 30 },
];

// Productos CTI MinCiencias
const PRODUCTOS_CTI = [
  { categoria: 'Artículos', items: ['Artículo A1', 'Artículo A2', 'Artículo B', 'Artículo C'] },
  { categoria: 'Libros', items: ['Libro Resultado de Investigación', 'Capítulo de Libro'] },
  { categoria: 'Propiedad Intelectual', items: ['Patente', 'Registro Software', 'Diseño Industrial'] },
  { categoria: 'Productos Tecnológicos', items: ['Prototipo', 'Software', 'Planta Piloto'] },
  { categoria: 'Formación', items: ['Dirección Tesis Doctoral', 'Dirección Tesis Maestría', 'Trabajo de Grado'] },
];

// Estados del proyecto
const ESTADOS_PROYECTO = [
  { value: 'formulacion', label: 'En Formulación', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'ejecucion', label: 'En Ejecución', color: 'bg-blue-100 text-blue-700' },
  { value: 'finalizado', label: 'Finalizado', color: 'bg-green-100 text-green-700' },
];

export function FormularioInvestigacion({
  actividades,
  horasProgramables,
  horasRestantes,
  onChange
}: FormularioInvestigacionProps) {
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [actividadEdicion, setActividadEdicion] = useState<any>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    tipoProyecto: 'financiado',
    nombreProyecto: '',
    codigoProyecto: '',
    rol: 'investigador_principal',
    estado: 'ejecucion',
    grupoInvestigacion: '',
    lineaInvestigacion: '',
    fechaInicio: '',
    fechaTerminacion: '',
    entidadFinanciadora: '',
    montoFinanciacion: 0,
    productosComprometidos: [] as string[],
    horasSemanales: 8,
    descripcion: '',
    objetivos: ''
  });
  
  // Calcular horas automáticamente según tipo de proyecto y rol
  const tipoProyecto = TIPOS_PROYECTO.find(t => t.value === formData.tipoProyecto);
  const rol = ROLES_INVESTIGACION.find(r => r.value === formData.rol);
  const horasBase = tipoProyecto?.horas || 0;
  const horasDescarga = Math.round((horasBase * (rol?.porcentaje || 0)) / 100);
  const porcentajePTA = (horasDescarga / horasProgramables) * 100;
  
  // Handler para agregar producto CTI
  const handleAgregarProducto = (producto: string) => {
    if (!formData.productosComprometidos.includes(producto)) {
      setFormData(prev => ({
        ...prev,
        productosComprometidos: [...prev.productosComprometidos, producto]
      }));
    }
  };
  
  // Handler para eliminar producto CTI
  const handleEliminarProducto = (producto: string) => {
    setFormData(prev => ({
      ...prev,
      productosComprometidos: prev.productosComprometidos.filter(p => p !== producto)
    }));
  };
  
  // Handler para agregar actividad
  const handleAgregarActividad = () => {
    if (!formData.nombreProyecto) {
      toast.error('Debe ingresar el nombre del proyecto');
      return;
    }
    
    if (!formData.fechaInicio || !formData.fechaTerminacion) {
      toast.error('Debe especificar las fechas del proyecto');
      return;
    }
    
    const nuevaActividad = {
      id: modoEdicion ? actividadEdicion.id : `inv-${Date.now()}`,
      ...formData,
      horasDescarga,
      porcentajePTA,
      tipoProyectoLabel: tipoProyecto?.label,
      rolLabel: rol?.label,
      estadoLabel: ESTADOS_PROYECTO.find(e => e.value === formData.estado)?.label
    };
    
    let nuevasActividades;
    if (modoEdicion) {
      nuevasActividades = actividades.map(act => 
        act.id === actividadEdicion.id ? nuevaActividad : act
      );
      toast.success('Proyecto de investigación actualizado');
    } else {
      nuevasActividades = [...actividades, nuevaActividad];
      toast.success('Proyecto de investigación agregado');
    }
    
    const totalHoras = nuevasActividades.reduce((sum, act) => sum + act.horasDescarga, 0);
    onChange(nuevasActividades, totalHoras);
    
    // Resetear formulario
    resetFormulario();
  };
  
  const resetFormulario = () => {
    setModalAbierto(false);
    setModoEdicion(false);
    setActividadEdicion(null);
    setFormData({
      tipoProyecto: 'financiado',
      nombreProyecto: '',
      codigoProyecto: '',
      rol: 'investigador_principal',
      estado: 'ejecucion',
      grupoInvestigacion: '',
      lineaInvestigacion: '',
      fechaInicio: '',
      fechaTerminacion: '',
      entidadFinanciadora: '',
      montoFinanciacion: 0,
      productosComprometidos: [],
      horasSemanales: 8,
      descripcion: '',
      objetivos: ''
    });
  };
  
  // Handler para editar actividad
  const handleEditarActividad = (actividad: any) => {
    setActividadEdicion(actividad);
    setFormData(actividad);
    setModoEdicion(true);
    setModalAbierto(true);
  };
  
  // Handler para eliminar actividad
  const handleEliminarActividad = (id: string) => {
    if (confirm('¿Está seguro de eliminar este proyecto de investigación?')) {
      const nuevasActividades = actividades.filter(act => act.id !== id);
      const totalHoras = nuevasActividades.reduce((sum, act) => sum + act.horasDescarga, 0);
      onChange(nuevasActividades, totalHoras);
      toast.success('Proyecto eliminado');
    }
  };
  
  const totalHoras = actividades.reduce((sum, act) => sum + act.horasDescarga, 0);
  const porcentajeTotal = (totalHoras / horasProgramables) * 100;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Componente de Investigación</h3>
            <p className="text-gray-600">
              Registre proyectos y actividades de investigación (máximo 50% del PTA)
            </p>
          </div>
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => {
              setModoEdicion(false);
              setActividadEdicion(null);
              setModalAbierto(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Proyecto
          </Button>
        </div>
        
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-purple-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Horas Investigación</p>
            <p className="text-2xl font-bold text-purple-600">{totalHoras}h</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Porcentaje del PTA</p>
            <p className="text-2xl font-bold text-purple-600">{porcentajeTotal.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Proyectos</p>
            <p className="text-2xl font-bold text-purple-600">{actividades.length}</p>
          </div>
        </div>
        
        {/* Info descarga académica */}
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-2">
          <Info className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-purple-900 mb-1">Descarga Académica por Investigación</p>
            <p className="text-sm text-purple-700">
              Las horas se calculan automáticamente según el tipo de proyecto y su rol. 
              <strong> Investigador Principal: 100% | Co-investigador: 60% | Junior: 40%</strong>
            </p>
          </div>
        </div>
      </Card>
      
      {/* Lista de proyectos */}
      <AnimatePresence mode="popLayout">
        {actividades.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 mx-auto mb-4 flex items-center justify-center">
                <FlaskConical className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay proyectos de investigación
              </h3>
              <p className="text-gray-600 mb-4">
                Agregue proyectos de investigación financiados, internos o por necesidad del servicio
              </p>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setModalAbierto(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primer Proyecto
              </Button>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {actividades.map((actividad, index) => (
              <motion.div
                key={actividad.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <Card className="p-5 hover:shadow-md transition-shadow group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <FlaskConical className="w-6 h-6 text-purple-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900">{actividad.nombreProyecto}</h4>
                            {actividad.codigoProyecto && (
                              <Badge variant="outline" className="text-xs">
                                {actividad.codigoProyecto}
                              </Badge>
                            )}
                            <Badge className={ESTADOS_PROYECTO.find(e => e.value === actividad.estado)?.color}>
                              {actividad.estadoLabel}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <Award className="w-4 h-4" />
                              <span>{actividad.tipoProyectoLabel}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{actividad.rolLabel}</span>
                            </div>
                            {actividad.grupoInvestigacion && (
                              <div className="flex items-center gap-1">
                                <BookOpen className="w-4 h-4" />
                                <span>{actividad.grupoInvestigacion}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Productos comprometidos */}
                          {actividad.productosComprometidos.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {actividad.productosComprometidos.map((producto: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs bg-purple-50">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  {producto}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditarActividad(actividad)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleEliminarActividad(actividad.id)}
                            className="p-2 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Descarga Horaria</p>
                          <p className="text-sm font-bold text-purple-600">{actividad.horasDescarga}h</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">% del PTA</p>
                          <p className="text-sm font-bold text-purple-600">{actividad.porcentajePTA.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Fecha Inicio</p>
                          <p className="text-sm font-medium text-gray-900">{new Date(actividad.fechaInicio).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Fecha Fin</p>
                          <p className="text-sm font-medium text-gray-900">{new Date(actividad.fechaTerminacion).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
      
      {/* Modal para agregar/editar proyecto */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">
                {modoEdicion ? 'Editar' : 'Agregar'} Proyecto de Investigación
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Tipo de proyecto y rol */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Proyecto *
                  </label>
                  <select
                    value={formData.tipoProyecto}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipoProyecto: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {TIPOS_PROYECTO.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label} ({tipo.horas}h base)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Su Rol en el Proyecto *
                  </label>
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData(prev => ({ ...prev, rol: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {ROLES_INVESTIGACION.map(rol => (
                      <option key={rol.value} value={rol.value}>
                        {rol.label} ({rol.porcentaje}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Información básica */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Proyecto *
                  </label>
                  <Input
                    value={formData.nombreProyecto}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombreProyecto: e.target.value }))}
                    placeholder="Ej: Gobernanza territorial en Colombia"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código del Proyecto
                  </label>
                  <Input
                    value={formData.codigoProyecto}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigoProyecto: e.target.value }))}
                    placeholder="Ej: INV-2025-001"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado del Proyecto *
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {ESTADOS_PROYECTO.map(estado => (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Grupo y línea de investigación */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grupo de Investigación
                  </label>
                  <Input
                    value={formData.grupoInvestigacion}
                    onChange={(e) => setFormData(prev => ({ ...prev, grupoInvestigacion: e.target.value }))}
                    placeholder="Ej: Gestión Pública y Desarrollo"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Línea de Investigación
                  </label>
                  <Input
                    value={formData.lineaInvestigacion}
                    onChange={(e) => setFormData(prev => ({ ...prev, lineaInvestigacion: e.target.value }))}
                    placeholder="Ej: Políticas Públicas"
                  />
                </div>
              </div>
              
              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Inicio *
                  </label>
                  <Input
                    type="date"
                    value={formData.fechaInicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Terminación *
                  </label>
                  <Input
                    type="date"
                    value={formData.fechaTerminacion}
                    onChange={(e) => setFormData(prev => ({ ...prev, fechaTerminacion: e.target.value }))}
                  />
                </div>
              </div>
              
              {/* Financiación (opcional) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entidad Financiadora
                  </label>
                  <Input
                    value={formData.entidadFinanciadora}
                    onChange={(e) => setFormData(prev => ({ ...prev, entidadFinanciadora: e.target.value }))}
                    placeholder="Ej: MinCiencias, Colciencias, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto de Financiación (COP)
                  </label>
                  <Input
                    type="number"
                    value={formData.montoFinanciacion}
                    onChange={(e) => setFormData(prev => ({ ...prev, montoFinanciacion: parseInt(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
              </div>
              
              {/* Productos CTI comprometidos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Productos CTI Comprometidos (MinCiencias)
                </label>
                
                <div className="space-y-2 mb-3">
                  {PRODUCTOS_CTI.map(categoria => (
                    <div key={categoria.categoria} className="border border-gray-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">{categoria.categoria}</p>
                      <div className="flex flex-wrap gap-2">
                        {categoria.items.map(item => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => handleAgregarProducto(item)}
                            className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                              formData.productosComprometidos.includes(item)
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-purple-600'
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Productos seleccionados */}
                {formData.productosComprometidos.length > 0 && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm font-medium text-purple-900 mb-2">
                      Productos Seleccionados ({formData.productosComprometidos.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {formData.productosComprometidos.map(producto => (
                        <Badge key={producto} className="bg-purple-600 text-white">
                          {producto}
                          <button
                            type="button"
                            onClick={() => handleEliminarProducto(producto)}
                            className="ml-2 hover:text-red-200"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción del Proyecto
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Breve descripción del proyecto de investigación..."
                />
              </div>
              
              {/* Resumen de cálculo */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm font-medium text-purple-900 mb-3">Cálculo Automático de Descarga</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-purple-700 mb-1">Horas Base ({tipoProyecto?.label})</p>
                    <p className="text-xl font-bold text-purple-900">{horasBase}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-700 mb-1">Descarga ({rol?.label} - {rol?.porcentaje}%)</p>
                    <p className="text-xl font-bold text-purple-900">{horasDescarga}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-700 mb-1">% del PTA</p>
                    <p className="text-xl font-bold text-purple-900">{porcentajePTA.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t flex items-center justify-end gap-3 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={resetFormulario}>
                Cancelar
              </Button>
              <Button
                onClick={handleAgregarActividad}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {modoEdicion ? 'Actualizar' : 'Agregar'} Proyecto
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
