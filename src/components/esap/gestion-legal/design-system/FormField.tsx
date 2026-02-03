/**
 * FormField - Componente reutilizable para campos de formulario con validación
 * ✅ Validación en tiempo real
 * ✅ Indicadores visuales (error/success)
 * ✅ Mensajes inline descriptivos
 * ✅ Tooltips informativos
 * ✅ Contador de caracteres
 * ✅ Diseño corporativo ESAP
 */

import { Label } from '../../../ui/label';
import { Input } from '../../../ui/input';
import { Textarea } from '../../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { AlertCircle, CheckCircle, Info, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../ui/tooltip';

export interface FormFieldProps {
  // Identificación
  name: string;
  label: string;
  placeholder?: string;
  
  // Tipo y valor
  type?: 'text' | 'email' | 'number' | 'date' | 'datetime-local' | 'tel' | 'url' | 'textarea' | 'select';
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  
  // Validación
  required?: boolean;
  error?: string;
  state?: 'default' | 'error' | 'success';
  
  // Opciones para select
  options?: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  
  // Características adicionales
  disabled?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
  rows?: number; // Para textarea
  
  // Ayuda contextual
  helpText?: string;
  tooltip?: string;
  icon?: React.ReactNode;
  
  // Styling
  className?: string;
}

export function FormField({
  name,
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  onBlur,
  required,
  error,
  state = 'default',
  options,
  disabled,
  maxLength,
  showCharCount,
  rows = 4,
  helpText,
  tooltip,
  icon,
  className = ''
}: FormFieldProps) {
  
  // Determinar estado visual
  const visualState = error ? 'error' : state;
  
  // Estilos según estado
  const getInputClassName = () => {
    const baseClass = 'transition-all duration-200';
    
    if (visualState === 'error') {
      return `${baseClass} border-red-500 focus:border-red-600 focus:ring-red-500`;
    }
    
    if (visualState === 'success') {
      return `${baseClass} border-green-500 focus:border-green-600 focus:ring-green-500`;
    }
    
    return `${baseClass} border-gray-300 focus:border-blue-500`;
  };

  // Renderizar el campo según el tipo
  const renderInput = () => {
    if (type === 'select' && options) {
      return (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger 
            id={name}
            className={getInputClassName()}
            onBlur={onBlur}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.icon}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (type === 'textarea') {
      return (
        <Textarea
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          rows={rows}
          className={`${getInputClassName()} ${className}`}
        />
      );
    }

    return (
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className={`${getInputClassName()} ${className}`}
      />
    );
  };

  return (
    <div className="space-y-2">
      {/* Label con tooltip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-600">{icon}</span>}
          <Label 
            htmlFor={name}
            className="text-sm font-bold text-gray-700 flex items-center gap-1"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
            
            {/* Tooltip informativo */}
            {tooltip && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="ml-1">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-blue-600 transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top"
                    className="max-w-xs bg-gray-900 text-white text-xs p-3"
                  >
                    <p>{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </Label>
        </div>

        {/* Indicador de estado */}
        {visualState !== 'default' && !error && (
          <div className="flex items-center gap-1">
            {visualState === 'success' && (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
          </div>
        )}
      </div>

      {/* Campo de entrada */}
      <div className="relative">
        {renderInput()}
        
        {/* Icono de estado dentro del input */}
        {visualState === 'error' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
        )}
        {visualState === 'success' && (type !== 'select' && type !== 'textarea') && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
        )}
      </div>

      {/* Fila inferior: Mensaje de error / Ayuda / Contador */}
      <div className="flex items-start justify-between gap-2 min-h-[20px]">
        <div className="flex-1">
          {/* Mensaje de error */}
          {error && (
            <p className="text-xs text-red-600 flex items-start gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </p>
          )}

          {/* Texto de ayuda (solo si no hay error) */}
          {!error && helpText && (
            <p className="text-xs text-gray-500 flex items-start gap-1">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{helpText}</span>
            </p>
          )}

          {/* Mensaje de éxito */}
          {!error && visualState === 'success' && !helpText && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="font-semibold">Campo válido</span>
            </p>
          )}
        </div>

        {/* Contador de caracteres */}
        {showCharCount && maxLength && (type === 'text' || type === 'textarea') && (
          <p className={`text-xs flex-shrink-0 ${
            value?.length >= maxLength 
              ? 'text-red-600 font-bold' 
              : value?.length >= maxLength * 0.9
              ? 'text-orange-600 font-semibold'
              : 'text-gray-500'
          }`}>
            {value?.length || 0} / {maxLength}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * FormSection - Contenedor visual para agrupar campos relacionados
 */
interface FormSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  icon,
  color = 'blue',
  children,
  className = ''
}: FormSectionProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconBg: '#2962FF',
      text: 'text-blue-900'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      iconBg: '#10B981',
      text: 'text-green-900'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      iconBg: '#F59E0B',
      text: 'text-orange-900'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      iconBg: '#8B5CF6',
      text: 'text-purple-900'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconBg: '#EF4444',
      text: 'text-red-900'
    }
  };

  const colors = colorClasses[color];

  return (
    <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border} ${className}`}>
      <div className="flex items-start gap-3 mb-4">
        {icon && (
          <div 
            className="p-2 rounded-lg flex-shrink-0"
            style={{ background: colors.iconBg }}
          >
            <div className="w-5 h-5 text-white">
              {icon}
            </div>
          </div>
        )}
        <div className="flex-1">
          <h3 className={`font-bold text-gray-900 ${description ? 'mb-1' : ''}`}>
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

/**
 * FormProgress - Indicador de progreso del formulario
 */
interface FormProgressProps {
  completed: number;
  total: number;
  className?: string;
}

export function FormProgress({ completed, total, className = '' }: FormProgressProps) {
  const percentage = Math.round((completed / total) * 100);
  const isComplete = completed === total;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          Progreso del formulario
        </p>
        <p className={`text-sm font-bold ${isComplete ? 'text-green-600' : 'text-blue-600'}`}>
          {completed} / {total} campos completados
        </p>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-300 rounded-full"
          style={{ 
            width: `${percentage}%`,
            background: isComplete 
              ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
              : 'linear-gradient(90deg, #2962FF 0%, #003DA5 100%)'
          }}
        />
      </div>
    </div>
  );
}
