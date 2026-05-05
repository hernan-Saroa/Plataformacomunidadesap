/**
 * Modal Generador de Reportes Dinámico
 * Interfaz intuitiva paso a paso para crear reportes personalizados
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronRight, ChevronLeft, Check, Users, Shield, Activity,
  BarChart3, Calendar, Filter, FileText, Download, Eye, Settings,
  Plus, Trash2, GripVertical, Search, Database, Target, Zap
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Switch } from '@esap-mfe/shared-ui/switch';
import { Card } from '@esap-mfe/shared-ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@esap-mfe/shared-ui/select';
import { Checkbox } from '@esap-mfe/shared-ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@esap-mfe/shared-ui/radio-group';
import { toast } from 'sonner';
import { exportReport, ReportData, ReportField } from '../utils/reportExport';

interface ReportBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportCreated?: (report: any) => void;
}

// Tipos de datos disponibles
const DATA_SOURCES = [
  {
    id: 'usuarios',
    name: 'Usuarios',
    icon: Users,
    color: '#3b82f6',
    description: 'Datos de usuarios del sistema',
    fields: [
      { id: 'nombre', name: 'Nombre Completo', type: 'text' },
      { id: 'email', name: 'Email', type: 'text' },
      { id: 'rol', name: 'Rol', type: 'select' },
      { id: 'estado', name: 'Estado', type: 'select' },
      { id: 'fechaCreacion', name: 'Fecha de Creación', type: 'date' },
      { id: 'ultimoAcceso', name: 'Último Acceso', type: 'date' },
      { id: 'departamento', name: 'Departamento', type: 'text' },
    ],
  },
  {
    id: 'roles',
    name: 'Roles y Permisos',
    icon: Shield,
    color: '#8b5cf6',
    description: 'Información de roles del sistema',
    fields: [
      { id: 'nombreRol', name: 'Nombre del Rol', type: 'text' },
      { id: 'descripcion', name: 'Descripción', type: 'text' },
      { id: 'cantidadUsuarios', name: 'Cantidad de Usuarios', type: 'number' },
      { id: 'permisos', name: 'Permisos Asignados', type: 'number' },
      { id: 'nivel', name: 'Nivel de Acceso', type: 'select' },
      { id: 'fechaCreacion', name: 'Fecha de Creación', type: 'date' },
    ],
  },
  {
    id: 'auditoria',
    name: 'Auditoría',
    icon: Activity,
    color: '#ef4444',
    description: 'Eventos y logs del sistema',
    fields: [
      { id: 'evento', name: 'Tipo de Evento', type: 'text' },
      { id: 'usuario', name: 'Usuario', type: 'text' },
      { id: 'fecha', name: 'Fecha', type: 'date' },
      { id: 'severidad', name: 'Severidad', type: 'select' },
      { id: 'modulo', name: 'Módulo', type: 'text' },
      { id: 'ip', name: 'Dirección IP', type: 'text' },
      { id: 'descripcion', name: 'Descripción', type: 'text' },
    ],
  },
  {
    id: 'actividad',
    name: 'Actividad del Sistema',
    icon: BarChart3,
    color: '#10b981',
    description: 'Métricas y estadísticas',
    fields: [
      { id: 'fecha', name: 'Fecha', type: 'date' },
      { id: 'sesiones', name: 'Sesiones Activas', type: 'number' },
      { id: 'acciones', name: 'Acciones Realizadas', type: 'number' },
      { id: 'errores', name: 'Errores', type: 'number' },
      { id: 'tiempoRespuesta', name: 'Tiempo de Respuesta', type: 'number' },
    ],
  },
];

// Formatos de exportación
const EXPORT_FORMATS = [
  { id: 'excel', name: 'Excel (.xlsx)', icon: FileText },
  { id: 'pdf', name: 'PDF (.pdf)', icon: FileText },
  { id: 'csv', name: 'CSV (.csv)', icon: FileText },
  { id: 'json', name: 'JSON (.json)', icon: Database },
];

export function ReportBuilderModal({ open, onOpenChange, onReportCreated }: ReportBuilderModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<any[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [includeCharts, setIncludeCharts] = useState(false);
  const [dateRange, setDateRange] = useState('30d');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showPreview, setShowPreview] = useState(false);

  const totalSteps = 5;
  const source = DATA_SOURCES.find(s => s.id === selectedSource);

  const handleNext = () => {
    if (currentStep === 2 && selectedFields.length === 0) {
      toast.error('Selecciona al menos un campo');
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGenerateReport();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const addFilter = () => {
    setFilters([...filters, { field: '', operator: 'equals', value: '' }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, key: string, value: any) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [key]: value };
    setFilters(newFilters);
  };

  const handleGenerateReport = () => {
    // Mostrar toast de inicio
    toast.loading('Generando reporte...', {
      id: 'generating-report',
      description: 'Por favor espera mientras procesamos los datos',
    });

    try {
      // Preparar configuración del reporte
      const reportConfig: ReportData = {
        name: reportName,
        description: reportDescription || '',
        source: selectedSource || '',
        fields: selectedFields,
        filters,
        exportFormat: exportFormat as 'excel' | 'pdf' | 'csv' | 'json',
        dateRange,
        sortBy,
        sortOrder,
      };

      // Obtener los campos disponibles del source seleccionado
      const availableFields: ReportField[] = source?.fields.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type as 'text' | 'select' | 'date' | 'number'
      })) || [];

      // Generar y exportar el reporte
      const recordCount = 50; // Número de registros de ejemplo
      exportReport(reportConfig, availableFields, recordCount);

      // Actualizar toast de éxito
      toast.success('¡Reporte generado exitosamente!', {
        id: 'generating-report',
        description: `"${reportName}" se ha descargado correctamente`,
        duration: 5000,
      });

      // Crear objeto para agregar a la lista de reportes personalizados
      const report = {
        name: reportName,
        description: reportDescription,
        source: selectedSource,
        fields: selectedFields,
        filters,
        exportFormat,
        includeCharts,
        dateRange,
        sortBy,
        sortOrder,
        createdAt: new Date().toISOString(),
      };

      // Notificar al componente padre
      onReportCreated?.(report);

      // Cerrar el modal después de un breve delay
      setTimeout(() => {
        handleClose();
      }, 500);

    } catch (error) {
      console.error('Error generando reporte:', error);
      toast.error('Error al generar el reporte', {
        id: 'generating-report',
        description: 'Por favor intenta nuevamente',
      });
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setReportName('');
    setReportDescription('');
    setSelectedSource(null);
    setSelectedFields([]);
    setFilters([]);
    setExportFormat('excel');
    setIncludeCharts(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Crear Reporte Personalizado</DialogTitle>
          <DialogDescription>
            Sigue los pasos para configurar tu reporte a medida
          </DialogDescription>
        </DialogHeader>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <div className="text-lg sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#1e5da8] to-[#2a6dbd] flex items-center justify-center">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="line-clamp-1">Crear Reporte Personalizado</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Sigue los pasos para configurar tu reporte a medida
            </p>
          </div>

          {/* Progress Stepper - MOBILE FIRST */}
          <div className="mt-4 sm:mt-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <motion.div
                      className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-base font-bold transition-all ${
                        step < currentStep
                          ? 'bg-[#1e5da8] text-white'
                          : step === currentStep
                          ? 'bg-[#1e5da8] text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                      }`}
                      whileHover={{ scale: 1.1 }}
                    >
                      {step < currentStep ? <Check className="w-3 h-3 sm:w-5 sm:h-5" /> : step}
                    </motion.div>
                    <span className="text-[9px] sm:text-xs mt-0.5 sm:mt-1 font-medium text-gray-600 dark:text-gray-400 hidden sm:block">
                      {step === 1 && 'Info'}
                      {step === 2 && 'Fuente'}
                      {step === 3 && 'Campos'}
                      {step === 4 && 'Filtros'}
                      {step === 5 && 'Exportar'}
                    </span>
                  </div>
                  {step < 5 && (
                    <div
                      className={`flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 transition-all ${
                        step < currentStep
                          ? 'bg-[#1e5da8]'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-220px)] sm:max-h-[calc(90vh-280px)]">
          <AnimatePresence mode="wait">
            {/* Step 1: Información Básica */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#1e5da8]" />
                    Información del Reporte
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reportName" className="text-sm font-semibold">
                        Nombre del Reporte *
                      </Label>
                      <Input
                        id="reportName"
                        placeholder="Ej: Reporte Mensual de Usuarios Activos"
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                        className="mt-1.5 border-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="reportDescription" className="text-sm font-semibold">
                        Descripción (opcional)
                      </Label>
                      <Input
                        id="reportDescription"
                        placeholder="Describe el propósito de este reporte..."
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        className="mt-1.5 border-2"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold mb-2 block">
                        Rango de Fechas
                      </Label>
                      <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7d">Últimos 7 días</SelectItem>
                          <SelectItem value="30d">Últimos 30 días</SelectItem>
                          <SelectItem value="90d">Últimos 90 días</SelectItem>
                          <SelectItem value="1y">Último año</SelectItem>
                          <SelectItem value="all">Todo el historial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Selección de Fuente de Datos */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-[#1e5da8]" />
                    Selecciona la Fuente de Datos
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {DATA_SOURCES.map((source) => {
                      const Icon = source.icon;
                      return (
                        <motion.div
                          key={source.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Card
                            className={`p-5 cursor-pointer transition-all border-2 ${
                              selectedSource === source.id
                                ? 'border-[#1e5da8] bg-blue-50 dark:bg-blue-950/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedSource(source.id)}
                          >
                            <div className="flex items-start gap-4">
                              <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: source.color }}
                              >
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                                  {source.name}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {source.description}
                                </p>
                                <Badge
                                  variant="outline"
                                  className="mt-2"
                                  style={{
                                    borderColor: source.color + '40',
                                    color: source.color,
                                  }}
                                >
                                  {source.fields.length} campos disponibles
                                </Badge>
                              </div>
                              {selectedSource === source.id && (
                                <Check className="w-5 h-5 text-[#1e5da8]" />
                              )}
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Selección de Campos */}
            {currentStep === 3 && source && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#1e5da8]" />
                    Selecciona los Campos a Incluir
                  </h3>

                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>{selectedFields.length}</strong> campos seleccionados de{' '}
                      <strong>{source.fields.length}</strong> disponibles
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {source.fields.map((field) => (
                      <Card
                        key={field.id}
                        className={`p-4 cursor-pointer transition-all border-2 ${
                          selectedFields.includes(field.id)
                            ? 'border-[#1e5da8] bg-blue-50 dark:bg-blue-950/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                        onClick={() => handleFieldToggle(field.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedFields.includes(field.id)}
                              onCheckedChange={() => handleFieldToggle(field.id)}
                            />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {field.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Tipo: {field.type}
                              </p>
                            </div>
                          </div>
                          {selectedFields.includes(field.id) && (
                            <Check className="w-4 h-4 text-[#1e5da8]" />
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedFields.length === source.fields.length) {
                          setSelectedFields([]);
                        } else {
                          setSelectedFields(source.fields.map(f => f.id));
                        }
                      }}
                      className="border-2"
                    >
                      {selectedFields.length === source.fields.length
                        ? 'Deseleccionar Todos'
                        : 'Seleccionar Todos'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Filtros y Ordenamiento */}
            {currentStep === 4 && source && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Filter className="w-5 h-5 text-[#1e5da8]" />
                    Filtros y Ordenamiento (Opcional)
                  </h3>

                  {/* Filtros */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold">Filtros</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addFilter}
                        className="border-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar Filtro
                      </Button>
                    </div>

                    {filters.length === 0 ? (
                      <Card className="p-8 text-center border-2 border-dashed">
                        <Filter className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No hay filtros configurados
                        </p>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {filters.map((filter, index) => (
                          <Card key={index} className="p-4 border-2">
                            <div className="flex items-end gap-3">
                              <div className="flex-1">
                                <Label className="text-xs mb-1.5">Campo</Label>
                                <Select
                                  value={filter.field}
                                  onValueChange={(value) =>
                                    updateFilter(index, 'field', value)
                                  }
                                >
                                  <SelectTrigger className="border-2">
                                    <SelectValue placeholder="Selecciona campo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {source.fields.map((field) => (
                                      <SelectItem key={field.id} value={field.id}>
                                        {field.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="w-40">
                                <Label className="text-xs mb-1.5">Operador</Label>
                                <Select
                                  value={filter.operator}
                                  onValueChange={(value) =>
                                    updateFilter(index, 'operator', value)
                                  }
                                >
                                  <SelectTrigger className="border-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="equals">Es igual a</SelectItem>
                                    <SelectItem value="notEquals">No es igual a</SelectItem>
                                    <SelectItem value="contains">Contiene</SelectItem>
                                    <SelectItem value="greaterThan">Mayor que</SelectItem>
                                    <SelectItem value="lessThan">Menor que</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex-1">
                                <Label className="text-xs mb-1.5">Valor</Label>
                                <Input
                                  value={filter.value}
                                  onChange={(e) =>
                                    updateFilter(index, 'value', e.target.value)
                                  }
                                  placeholder="Valor del filtro"
                                  className="border-2"
                                />
                              </div>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFilter(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ordenamiento */}
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Ordenamiento</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1.5 block">Ordenar por</Label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="border-2">
                            <SelectValue placeholder="Selecciona campo" />
                          </SelectTrigger>
                          <SelectContent>
                            {source.fields.map((field) => (
                              <SelectItem key={field.id} value={field.id}>
                                {field.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs mb-1.5 block">Orden</Label>
                        <Select
                          value={sortOrder}
                          onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}
                        >
                          <SelectTrigger className="border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc">Ascendente (A-Z)</SelectItem>
                            <SelectItem value="desc">Descendente (Z-A)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Opciones de Exportación */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5 text-[#1e5da8]" />
                    Opciones de Exportación
                  </h3>

                  <div className="space-y-6">
                    {/* Formato de Exportación */}
                    <div>
                      <Label className="text-sm font-semibold mb-3 block">
                        Formato de Exportación
                      </Label>
                      <RadioGroup value={exportFormat} onValueChange={setExportFormat}>
                        <div className="grid grid-cols-2 gap-3">
                          {EXPORT_FORMATS.map((format) => {
                            const Icon = format.icon;
                            return (
                              <Card
                                key={format.id}
                                className={`p-4 cursor-pointer transition-all border-2 ${
                                  exportFormat === format.id
                                    ? 'border-[#1e5da8] bg-blue-50 dark:bg-blue-950/30'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                }`}
                                onClick={() => setExportFormat(format.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <RadioGroupItem value={format.id} id={format.id} />
                                  <Icon className="w-5 h-5 text-gray-600" />
                                  <Label htmlFor={format.id} className="cursor-pointer flex-1">
                                    {format.name}
                                  </Label>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Opciones Adicionales */}
                    <div>
                      <Label className="text-sm font-semibold mb-3 block">
                        Opciones Adicionales
                      </Label>
                      <Card className="p-4 border-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              Incluir Gráficas
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Añade visualizaciones al reporte
                            </p>
                          </div>
                          <Switch
                            checked={includeCharts}
                            onCheckedChange={setIncludeCharts}
                          />
                        </div>
                      </Card>
                    </div>

                    {/* Resumen del Reporte */}
                    <div>
                      <Label className="text-sm font-semibold mb-3 block">
                        Resumen de Configuración
                      </Label>
                      <Card className="p-5 border-2 bg-gray-50 dark:bg-gray-800/50">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Nombre:
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {reportName || 'Sin nombre'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Fuente:
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {source?.name || 'No seleccionada'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Campos:
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {selectedFields.length} seleccionados
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Filtros:
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {filters.length} configurados
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Formato:
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {EXPORT_FORMATS.find(f => f.id === exportFormat)?.name}
                            </span>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions - MOBILE FIRST */}
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between gap-3">
            {/* Botones izquierda */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-2"
                size="default"
              >
                Cancelar
              </Button>

              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="border-2"
                  size="default"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Atrás
                </Button>
              )}
            </div>

            {/* Botón derecha */}
            <div className="flex items-center gap-3">
              {/* Indicador de paso */}
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium hidden sm:block">
                Paso {currentStep} de {totalSteps}
              </div>

              {currentStep < totalSteps ? (
                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white"
                  size="default"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleGenerateReport}
                  className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white"
                  size="default"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Crear Reporte
                </Button>
              )}
            </div>
          </div>
          
          {/* Indicador de paso mobile */}
          <div className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3 sm:hidden">
            Paso {currentStep} de {totalSteps}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
