/**
 * Modal para Programar Reportes Automáticos
 * Permite configurar generación y envío automático de reportes
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Calendar, Clock, Mail, Send, Users, Check, AlertCircle,
  ChevronRight, ChevronLeft, Settings, Zap, FileText, Plus,
  Trash2, CheckCircle, Play, Pause
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

interface ScheduleReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableReports: any[];
  onScheduleCreated?: (schedule: any) => void;
}

// Frecuencias disponibles
const FREQUENCIES = [
  { id: 'daily', name: 'Diario', icon: '📅', description: 'Todos los días a la misma hora' },
  { id: 'weekly', name: 'Semanal', icon: '📆', description: 'Una vez por semana' },
  { id: 'monthly', name: 'Mensual', icon: '🗓️', description: 'Una vez al mes' },
  { id: 'semester', name: 'Semestral', icon: '📊', description: 'Cada 6 meses' },
  { id: 'yearly', name: 'Anual', icon: '📈', description: 'Una vez al año' },
];

// Días de la semana
const WEEKDAYS = [
  { id: 'monday', name: 'Lunes' },
  { id: 'tuesday', name: 'Martes' },
  { id: 'wednesday', name: 'Miércoles' },
  { id: 'thursday', name: 'Jueves' },
  { id: 'friday', name: 'Viernes' },
  { id: 'saturday', name: 'Sábado' },
  { id: 'sunday', name: 'Domingo' },
];

// Formatos de exportación
const EXPORT_FORMATS = [
  { id: 'excel', name: 'Excel (.xlsx)' },
  { id: 'csv', name: 'CSV (.csv)' },
  { id: 'pdf', name: 'PDF (.pdf)' },
];

export function ScheduleReportModal({
  open,
  onOpenChange,
  availableReports,
  onScheduleCreated,
}: ScheduleReportModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleDescription, setScheduleDescription] = useState('');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [frequency, setFrequency] = useState('monthly');
  const [dayOfWeek, setDayOfWeek] = useState('monday');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [monthOfSemester, setMonthOfSemester] = useState('1'); // 1 o 7
  const [monthOfYear, setMonthOfYear] = useState('1');
  const [executionTime, setExecutionTime] = useState('08:00');
  const [exportFormat, setExportFormat] = useState('excel');
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [sendToMe, setSendToMe] = useState(true);
  const [saveToHistory, setSaveToHistory] = useState(true);
  const [notifyOnSuccess, setNotifyOnSuccess] = useState(true);
  const [notifyOnError, setNotifyOnError] = useState(true);

  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep === 1 && !scheduleName) {
      toast.error('Por favor ingresa un nombre para la programación');
      return;
    }
    if (currentStep === 2 && !selectedReport) {
      toast.error('Por favor selecciona un reporte');
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addEmailRecipient = () => {
    const email = newRecipient.trim();
    if (!email) return;

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Email inválido');
      return;
    }

    if (emailRecipients.includes(email)) {
      toast.error('Este email ya está agregado');
      return;
    }

    setEmailRecipients([...emailRecipients, email]);
    setNewRecipient('');
  };

  const removeEmailRecipient = (email: string) => {
    setEmailRecipients(emailRecipients.filter(e => e !== email));
  };

  const getNextExecution = () => {
    const now = new Date();
    const [hours, minutes] = executionTime.split(':').map(Number);
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    switch (frequency) {
      case 'daily':
        if (next <= now) next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        const targetDay = WEEKDAYS.findIndex(d => d.id === dayOfWeek);
        const currentDay = next.getDay();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7;
        next.setDate(next.getDate() + daysToAdd);
        break;
      case 'monthly':
        next.setDate(parseInt(dayOfMonth));
        if (next <= now) next.setMonth(next.getMonth() + 1);
        break;
      case 'semester':
        next.setMonth(parseInt(monthOfSemester) - 1);
        next.setDate(1);
        if (next <= now) next.setMonth(next.getMonth() + 6);
        break;
      case 'yearly':
        next.setMonth(parseInt(monthOfYear) - 1);
        next.setDate(1);
        if (next <= now) next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  };

  const handleCreateSchedule = () => {
    const schedule = {
      id: `SCHEDULE-${Date.now()}`,
      name: scheduleName,
      description: scheduleDescription,
      reportId: selectedReport,
      frequency,
      config: {
        dayOfWeek,
        dayOfMonth,
        monthOfSemester,
        monthOfYear,
        time: executionTime,
      },
      exportFormat,
      recipients: emailRecipients,
      sendToMe,
      saveToHistory,
      notifications: {
        onSuccess: notifyOnSuccess,
        onError: notifyOnError,
      },
      status: 'active',
      nextExecution: getNextExecution().toISOString(),
      createdAt: new Date().toISOString(),
    };

    toast.success('Programación creada exitosamente', {
      description: `"${scheduleName}" está activa`,
    });

    onScheduleCreated?.(schedule);
    handleClose();
  };

  const handleClose = () => {
    setCurrentStep(1);
    setScheduleName('');
    setScheduleDescription('');
    setSelectedReport(null);
    setFrequency('monthly');
    setDayOfWeek('monday');
    setDayOfMonth('1');
    setMonthOfSemester('1');
    setMonthOfYear('1');
    setExecutionTime('08:00');
    setExportFormat('excel');
    setEmailRecipients([]);
    setNewRecipient('');
    setSendToMe(true);
    setSaveToHistory(true);
    setNotifyOnSuccess(true);
    setNotifyOnError(true);
    onOpenChange(false);
  };

  const selectedReportData = availableReports.find(r => r.id === selectedReport);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Programar Reporte Automático</DialogTitle>
          <DialogDescription>
            Configura la generación y envío automático de reportes
          </DialogDescription>
        </DialogHeader>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <div className="text-lg sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#1e5da8] to-[#2a6dbd] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="line-clamp-2">Programar Reporte Automático</span>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Configura la generación y envío automático de reportes
            </p>
          </div>

          {/* Progress Stepper */}
          <div className="mt-4 sm:mt-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <motion.div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-bold transition-all ${
                        step < currentStep
                          ? 'bg-green-500 text-white'
                          : step === currentStep
                          ? 'bg-[#1e5da8] text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                      }`}
                      whileHover={{ scale: 1.1 }}
                    >
                      {step < currentStep ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : step}
                    </motion.div>
                    <span className="text-[10px] sm:text-xs mt-1 font-medium text-gray-600 dark:text-gray-400 text-center">
                      {step === 1 && 'Info'}
                      {step === 2 && 'Reporte'}
                      {step === 3 && (
                        <>
                          <span className="hidden sm:inline">Frecuencia</span>
                          <span className="sm:hidden">Frec.</span>
                        </>
                      )}
                      {step === 4 && 'Entrega'}
                    </span>
                  </div>
                  {step < 4 && (
                    <div
                      className={`flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 transition-all ${
                        step < currentStep
                          ? 'bg-green-500'
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
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
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
                    Información de la Programación
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="scheduleName" className="text-sm font-semibold">
                        Nombre de la Programación *
                      </Label>
                      <Input
                        id="scheduleName"
                        placeholder="Ej: Reporte Mensual de Usuarios"
                        value={scheduleName}
                        onChange={(e) => setScheduleName(e.target.value)}
                        className="mt-1.5 border-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="scheduleDescription" className="text-sm font-semibold">
                        Descripción (opcional)
                      </Label>
                      <Input
                        id="scheduleDescription"
                        placeholder="Describe el propósito de esta programación..."
                        value={scheduleDescription}
                        onChange={(e) => setScheduleDescription(e.target.value)}
                        className="mt-1.5 border-2"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Selección de Reporte */}
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
                    <FileText className="w-5 h-5 text-[#1e5da8]" />
                    Selecciona el Reporte
                  </h3>

                  {/* Important Notice */}
                  <Card className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-900 dark:text-amber-100 mb-1">
                          ⚠️ Importante: Solo se muestran reportes existentes
                        </p>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          Esta función <strong>NO crea reportes nuevos</strong>. Solo automatiza reportes que ya existen.
                          Si no ves tu reporte, créalo primero en la pestaña "Reportes".
                        </p>
                      </div>
                    </div>
                  </Card>

                  <div className="space-y-3 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto pr-2">
                    {availableReports.length === 0 ? (
                      <Card className="p-8 text-center border-2 border-dashed">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                          No hay reportes disponibles
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Debes crear al menos un reporte antes de poder programarlo.
                        </p>
                        <p className="text-sm text-[#1e5da8] font-medium">
                          → Ve a la pestaña "Reportes" y haz clic en "✨ Crear Reporte"
                        </p>
                      </Card>
                    ) : (
                      availableReports.map((report) => (
                        <Card
                        key={report.id}
                        className={`p-4 cursor-pointer transition-all border-2 ${
                          selectedReport === report.id
                            ? 'border-[#1e5da8] bg-blue-50 dark:bg-blue-950/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedReport(report.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">
                              {report.nombre}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {report.descripcion}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {report.registros?.toLocaleString()} registros
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {report.tamanoEstimado}
                              </Badge>
                            </div>
                          </div>
                          {selectedReport === report.id && (
                            <CheckCircle className="w-6 h-6 text-[#1e5da8] flex-shrink-0" />
                          )}
                        </div>
                      </Card>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Frecuencia y Configuración */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#1e5da8]" />
                    Frecuencia y Horario
                  </h3>

                  {/* Frecuencia */}
                  <div className="mb-6">
                    <Label className="text-sm font-semibold mb-3 block">
                      Frecuencia de Generación
                    </Label>
                    <RadioGroup value={frequency} onValueChange={setFrequency}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {FREQUENCIES.map((freq) => (
                          <Card
                            key={freq.id}
                            className={`p-4 cursor-pointer transition-all border-2 ${
                              frequency === freq.id
                                ? 'border-[#1e5da8] bg-blue-50 dark:bg-blue-950/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                            onClick={() => setFrequency(freq.id)}
                          >
                            <div className="flex items-start gap-3">
                              <RadioGroupItem value={freq.id} id={freq.id} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{freq.icon}</span>
                                  <Label htmlFor={freq.id} className="font-bold cursor-pointer">
                                    {freq.name}
                                  </Label>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {freq.description}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Configuración según frecuencia */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {frequency === 'weekly' && (
                      <div>
                        <Label className="text-sm font-semibold">Día de la Semana</Label>
                        <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                          <SelectTrigger className="mt-1.5 border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEEKDAYS.map((day) => (
                              <SelectItem key={day.id} value={day.id}>
                                {day.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {frequency === 'monthly' && (
                      <div>
                        <Label className="text-sm font-semibold">Día del Mes</Label>
                        <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                          <SelectTrigger className="mt-1.5 border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                              <SelectItem key={day} value={day.toString()}>
                                Día {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {frequency === 'semester' && (
                      <div>
                        <Label className="text-sm font-semibold">Mes de Inicio</Label>
                        <Select value={monthOfSemester} onValueChange={setMonthOfSemester}>
                          <SelectTrigger className="mt-1.5 border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Enero (Semestre 1)</SelectItem>
                            <SelectItem value="7">Julio (Semestre 2)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {frequency === 'yearly' && (
                      <div>
                        <Label className="text-sm font-semibold">Mes del Año</Label>
                        <Select value={monthOfYear} onValueChange={setMonthOfYear}>
                          <SelectTrigger className="mt-1.5 border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Enero</SelectItem>
                            <SelectItem value="2">Febrero</SelectItem>
                            <SelectItem value="3">Marzo</SelectItem>
                            <SelectItem value="4">Abril</SelectItem>
                            <SelectItem value="5">Mayo</SelectItem>
                            <SelectItem value="6">Junio</SelectItem>
                            <SelectItem value="7">Julio</SelectItem>
                            <SelectItem value="8">Agosto</SelectItem>
                            <SelectItem value="9">Septiembre</SelectItem>
                            <SelectItem value="10">Octubre</SelectItem>
                            <SelectItem value="11">Noviembre</SelectItem>
                            <SelectItem value="12">Diciembre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-semibold">Hora de Ejecución</Label>
                      <Input
                        type="time"
                        value={executionTime}
                        onChange={(e) => setExecutionTime(e.target.value)}
                        className="mt-1.5 border-2"
                      />
                    </div>
                  </div>

                  {/* Vista Previa de Próxima Ejecución */}
                  <Card className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-[#1e5da8] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          Próxima Ejecución
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {getNextExecution().toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Step 4: Opciones de Entrega */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Send className="w-5 h-5 text-[#1e5da8]" />
                    Opciones de Entrega
                  </h3>

                  {/* Formato */}
                  <div className="mb-6">
                    <Label className="text-sm font-semibold mb-3 block">
                      Formato de Exportación
                    </Label>
                    <RadioGroup value={exportFormat} onValueChange={setExportFormat}>
                      <div className="grid grid-cols-3 gap-3">
                        {EXPORT_FORMATS.map((format) => (
                          <Card
                            key={format.id}
                            className={`p-3 cursor-pointer transition-all border-2 ${
                              exportFormat === format.id
                                ? 'border-[#1e5da8] bg-blue-50 dark:bg-blue-950/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                            onClick={() => setExportFormat(format.id)}
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value={format.id} id={format.id} />
                              <Label htmlFor={format.id} className="text-sm font-medium cursor-pointer">
                                {format.name}
                              </Label>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Destinatarios */}
                  <div className="mb-6">
                    <Label className="text-sm font-semibold mb-3 block">
                      Destinatarios de Email
                    </Label>

                    <div className="flex items-center gap-3 mb-3">
                      <Checkbox
                        id="sendToMe"
                        checked={sendToMe}
                        onCheckedChange={(checked) => setSendToMe(checked as boolean)}
                      />
                      <Label htmlFor="sendToMe" className="text-sm cursor-pointer">
                        Enviarme a mí (usuario.actual@esap.edu.co)
                      </Label>
                    </div>

                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="email@esap.edu.co"
                        value={newRecipient}
                        onChange={(e) => setNewRecipient(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addEmailRecipient();
                          }
                        }}
                        className="border-2"
                      />
                      <Button
                        onClick={addEmailRecipient}
                        variant="outline"
                        className="border-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar
                      </Button>
                    </div>

                    {emailRecipients.length > 0 && (
                      <div className="space-y-2">
                        {emailRecipients.map((email) => (
                          <Card key={email} className="p-3 border-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium">{email}</span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeEmailRecipient(email)}
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

                  {/* Opciones Adicionales */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="saveToHistory"
                        checked={saveToHistory}
                        onCheckedChange={(checked) => setSaveToHistory(checked as boolean)}
                      />
                      <Label htmlFor="saveToHistory" className="text-sm cursor-pointer">
                        Guardar en historial de reportes
                      </Label>
                    </div>

                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="notifyOnSuccess"
                        checked={notifyOnSuccess}
                        onCheckedChange={(checked) => setNotifyOnSuccess(checked as boolean)}
                      />
                      <Label htmlFor="notifyOnSuccess" className="text-sm cursor-pointer">
                        Notificarme cuando se genere exitosamente
                      </Label>
                    </div>

                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="notifyOnError"
                        checked={notifyOnError}
                        onCheckedChange={(checked) => setNotifyOnError(checked as boolean)}
                      />
                      <Label htmlFor="notifyOnError" className="text-sm cursor-pointer">
                        Notificarme si hay un error
                      </Label>
                    </div>
                  </div>

                  {/* Resumen */}
                  {selectedReportData && (
                    <Card className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 border-2">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3">
                        Resumen de Configuración
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Reporte:</span>
                          <span className="font-medium">{selectedReportData.nombre}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Frecuencia:</span>
                          <span className="font-medium">
                            {FREQUENCIES.find(f => f.id === frequency)?.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Hora:</span>
                          <span className="font-medium">{executionTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Formato:</span>
                          <span className="font-medium">
                            {EXPORT_FORMATS.find(f => f.id === exportFormat)?.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Destinatarios:</span>
                          <span className="font-medium">
                            {(sendToMe ? 1 : 0) + emailRecipients.length}
                          </span>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0 sm:justify-between flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="border-2 w-full sm:w-auto"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Atrás
          </Button>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              className="border-2 flex-1 sm:flex-initial"
            >
              Cancelar
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white flex-1 sm:flex-initial"
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleCreateSchedule}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white flex-1 sm:flex-initial"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Crear Programación</span>
                <span className="sm:hidden">Crear</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}