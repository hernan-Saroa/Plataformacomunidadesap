/**
 * ════════════════════════════════════════════════════════════════════════════
 * PASSWORD STRENGTH INPUT - ESAP 2025
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Input de contraseña con validación en tiempo real e indicador de fortaleza.
 * Balance óptimo entre seguridad y usabilidad.
 * 
 * REQUISITOS:
 * - Mínimo 8 caracteres
 * - 3 de 4 tipos de caracteres (mayúsculas, minúsculas, números, especiales)
 * - No contraseñas comunes
 * - No datos personales
 * 
 * FECHA: 29 Diciembre 2024
 */

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, X, AlertCircle, ShieldCheck, Lightbulb } from 'lucide-react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';

interface PasswordStrengthInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
  label?: string;
  placeholder?: string;
  showRequirements?: boolean;
  showSuggestions?: boolean;
  userData?: {
    nombre?: string;
    apellido?: string;
    documento?: string;
    email?: string;
  };
}

interface PasswordValidation {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  notCommon: boolean;
  notPersonal: boolean;
  noRepeated: boolean;
}

// Top 100 contraseñas más comunes en español/Colombia
const COMMON_PASSWORDS = [
  'password', '12345678', '123456789', 'qwerty', 'abc123', 'password1',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'colombia',
  'esap', 'universidad', 'estudiante', 'admin123', 'usuario', 'clave',
  'contrasena', 'qwerty123', 'password123', '11111111', '00000000',
  'administrador', 'temporal', 'prueba', 'test', 'demo', 'bogota',
  'medellin', 'cali', 'barranquilla', 'cartagena', '12345', '123456',
  '1234', '123', 'pass', 'master', 'root', 'system', 'user'
];

export function PasswordStrengthInput({
  value,
  onChange,
  onValidChange,
  label = 'Contraseña',
  placeholder = 'Ingresa tu contraseña',
  showRequirements = true,
  showSuggestions = true,
  userData
}: PasswordStrengthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [validation, setValidation] = useState<PasswordValidation>({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    notCommon: true,
    notPersonal: true,
    noRepeated: true
  });

  const [strength, setStrength] = useState<{
    score: number;
    label: string;
    color: string;
  }>({
    score: 0,
    label: 'Sin contraseña',
    color: '#9CA3AF'
  });

  // Validar contraseña en tiempo real
  useEffect(() => {
    if (!value) {
      setValidation({
        minLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
        notCommon: true,
        notPersonal: true,
        noRepeated: true
      });
      setStrength({ score: 0, label: 'Sin contraseña', color: '#9CA3AF' });
      onValidChange?.(false);
      return;
    }

    // Validaciones
    const minLength = value.length >= 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(value);
    
    // Validar contraseñas comunes
    const notCommon = !COMMON_PASSWORDS.some(common => 
      value.toLowerCase().includes(common.toLowerCase())
    );

    // Validar datos personales
    let notPersonal = true;
    if (userData) {
      const personalData = [
        userData.nombre,
        userData.apellido,
        userData.documento,
        userData.email?.split('@')[0]
      ].filter(Boolean);

      notPersonal = !personalData.some(data => 
        data && value.toLowerCase().includes(data.toLowerCase())
      );
    }

    // Validar caracteres repetidos (más de 2 seguidos)
    const noRepeated = !/(.)\1{2,}/.test(value);

    const newValidation = {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
      notCommon,
      notPersonal,
      noRepeated
    };

    setValidation(newValidation);

    // Calcular fortaleza
    const strengthScore = calculateStrength(newValidation, value.length);
    setStrength(strengthScore);

    // Validar si cumple requisitos mínimos
    const typesCount = [hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length;
    const isValid = minLength && typesCount >= 3 && notCommon && notPersonal && noRepeated;
    onValidChange?.(isValid);
  }, [value, userData, onValidChange]);

  const calculateStrength = (val: PasswordValidation, length: number): {
    score: number;
    label: string;
    color: string;
  } => {
    let score = 0;

    // Puntos por longitud
    if (length >= 8) score += 20;
    if (length >= 10) score += 10;
    if (length >= 12) score += 10;
    if (length >= 15) score += 10;

    // Puntos por tipos de caracteres
    if (val.hasUpperCase) score += 15;
    if (val.hasLowerCase) score += 15;
    if (val.hasNumber) score += 15;
    if (val.hasSpecialChar) score += 20;

    // Penalizaciones
    if (!val.notCommon) score = Math.max(0, score - 30);
    if (!val.notPersonal) score = Math.max(0, score - 30);
    if (!val.noRepeated) score = Math.max(0, score - 20);

    // Determinar etiqueta y color
    if (score < 30) {
      return { score, label: 'Muy Débil', color: '#DC2626' };
    } else if (score < 50) {
      return { score, label: 'Débil', color: '#F59E0B' };
    } else if (score < 70) {
      return { score, label: 'Aceptable', color: '#EAB308' };
    } else if (score < 85) {
      return { score, label: 'Fuerte', color: '#10B981' };
    } else {
      return { score: 100, label: 'Muy Fuerte', color: '#059669' };
    }
  };

  const typesCount = [
    validation.hasUpperCase,
    validation.hasLowerCase,
    validation.hasNumber,
    validation.hasSpecialChar
  ].filter(Boolean).length;

  const isValid = validation.minLength && typesCount >= 3 && 
                  validation.notCommon && validation.notPersonal && 
                  validation.noRepeated;

  return (
    <div className="space-y-3">
      {/* Label */}
      <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#003DA5]" />
        {label}
      </label>

      {/* Input con botón de mostrar/ocultar */}
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4 text-gray-500" />
          ) : (
            <Eye className="w-4 h-4 text-gray-500" />
          )}
        </Button>
      </div>

      {/* Indicador de fortaleza */}
      {value && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600">
              Fortaleza:
            </span>
            <span className="text-xs font-bold" style={{ color: strength.color }}>
              {strength.label}
            </span>
          </div>
          <Progress 
            value={strength.score} 
            className="h-2"
            style={{
              backgroundColor: '#E5E7EB'
            }}
          />
          <style jsx>{`
            [role="progressbar"] > div {
              background-color: ${strength.color} !important;
              transition: all 0.3s ease;
            }
          `}</style>
        </div>
      )}

      {/* Requisitos de validación */}
      {showRequirements && value && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1.5">
          <p className="text-xs font-bold text-gray-700 mb-2">Requisitos de Seguridad:</p>
          
          <ValidationItem
            valid={validation.minLength}
            text="Mínimo 8 caracteres"
          />
          
          <ValidationItem
            valid={typesCount >= 3}
            text={`Al menos 3 tipos de caracteres (${typesCount}/4)`}
            subItems={[
              { valid: validation.hasUpperCase, text: 'Mayúsculas (A-Z)' },
              { valid: validation.hasLowerCase, text: 'Minúsculas (a-z)' },
              { valid: validation.hasNumber, text: 'Números (0-9)' },
              { valid: validation.hasSpecialChar, text: 'Especiales (!@#$%^&*)' }
            ]}
          />
          
          <ValidationItem
            valid={validation.notCommon}
            text="No es una contraseña común"
            critical
          />
          
          <ValidationItem
            valid={validation.notPersonal}
            text="No contiene datos personales"
            critical
          />
          
          <ValidationItem
            valid={validation.noRepeated}
            text="Sin caracteres repetidos (aaa, 111)"
          />
        </div>
      )}

      {/* Sugerencias y ejemplos */}
      {showSuggestions && !isValid && value && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <p className="font-bold mb-1">💡 Consejos para crear una contraseña segura:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                <li>Usa una frase memorable: <code className="bg-blue-100 px-1 rounded">MiCafe2025!</code></li>
                <li>Combina palabras aleatorias: <code className="bg-blue-100 px-1 rounded">Luna@Gato7</code></li>
                <li>Agrega símbolos: <code className="bg-blue-100 px-1 rounded">Esap#2025</code></li>
                <li>Evita: cumpleaños, nombres, "12345", "password"</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de éxito */}
      {isValid && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <Check className="w-4 h-4 text-green-600" />
            <p className="text-xs font-bold">
              ✅ Contraseña segura. Cumple todos los requisitos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente auxiliar para items de validación
interface ValidationItemProps {
  valid: boolean;
  text: string;
  critical?: boolean;
  subItems?: { valid: boolean; text: string }[];
}

function ValidationItem({ valid, text, critical, subItems }: ValidationItemProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {valid ? (
          <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
        ) : critical ? (
          <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
        ) : (
          <X className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )}
        <span className={`text-xs ${valid ? 'text-green-700 font-semibold' : critical ? 'text-red-700 font-semibold' : 'text-gray-600'}`}>
          {text}
        </span>
      </div>
      
      {subItems && (
        <div className="ml-6 space-y-1">
          {subItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {item.valid ? (
                <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
              ) : (
                <X className="w-3 h-3 text-gray-400 flex-shrink-0" />
              )}
              <span className={`text-xs ${item.valid ? 'text-green-700' : 'text-gray-500'}`}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
