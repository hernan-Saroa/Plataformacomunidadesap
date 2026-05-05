import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle2, XCircle, AlertCircle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PasswordStrengthInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  showStrengthMeter?: boolean;
  showRequirements?: boolean;
  required?: boolean;
  autoComplete?: string;
  name?: string;
  id?: string;
}

interface ValidationRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
  weight: number; // Peso para calcular fortaleza (0-25)
}

const VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'length',
    label: 'Mínimo 8 caracteres',
    test: (pwd) => pwd.length >= 8,
    weight: 25,
  },
  {
    id: 'uppercase',
    label: 'Al menos una mayúscula (A-Z)',
    test: (pwd) => /[A-Z]/.test(pwd),
    weight: 20,
  },
  {
    id: 'lowercase',
    label: 'Al menos una minúscula (a-z)',
    test: (pwd) => /[a-z]/.test(pwd),
    weight: 20,
  },
  {
    id: 'number',
    label: 'Al menos un número (0-9)',
    test: (pwd) => /[0-9]/.test(pwd),
    weight: 20,
  },
  {
    id: 'special',
    label: 'Al menos un carácter especial (@$!%*?&)',
    test: (pwd) => /[@$!%*?&#]/.test(pwd),
    weight: 15,
  },
];

export function PasswordStrengthInput({
  value,
  onChange,
  label = 'Contraseña',
  placeholder = 'Ingrese su contraseña',
  showStrengthMeter = true,
  showRequirements = true,
  required = false,
  autoComplete = 'new-password',
  name = 'password',
  id = 'password',
}: PasswordStrengthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [strength, setStrength] = useState(0);
  const [strengthLabel, setStrengthLabel] = useState('');
  const [strengthColor, setStrengthColor] = useState('');

  // Calcular fortaleza de la contraseña
  useEffect(() => {
    if (value.length === 0) {
      setStrength(0);
      setStrengthLabel('');
      return;
    }

    const passedRules = VALIDATION_RULES.filter((rule) => rule.test(value));
    const totalStrength = passedRules.reduce((sum, rule) => sum + rule.weight, 0);
    setStrength(totalStrength);

    // Determinar etiqueta y color según fortaleza
    if (totalStrength < 40) {
      setStrengthLabel('Débil');
      setStrengthColor('#DC2626'); // Rojo
    } else if (totalStrength < 70) {
      setStrengthLabel('Media');
      setStrengthColor('#F59E0B'); // Amarillo
    } else if (totalStrength < 90) {
      setStrengthLabel('Fuerte');
      setStrengthColor('#10B981'); // Verde
    } else {
      setStrengthLabel('Muy Fuerte');
      setStrengthColor('#059669'); // Verde oscuro
    }
  }, [value]);

  const getValidationStatus = (rule: ValidationRule) => {
    if (value.length === 0) return 'idle';
    return rule.test(value) ? 'valid' : 'invalid';
  };

  return (
    <div className="space-y-3">
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-gray-700"
        >
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Lock className="w-5 h-5 text-gray-400" />
        </div>
        
        <input
          type={showPassword ? 'text' : 'password'}
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="w-full pl-11 pr-12 py-3 border-2 rounded-lg transition-all duration-200 font-medium"
          style={{
            borderColor: isFocused ? '#2962FF' : '#D1D5DB',
            outline: 'none',
            fontSize: '14px',
          }}
        />

        {/* Toggle Password Visibility */}
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5 text-gray-500" />
          ) : (
            <Eye className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>

      {/* Strength Meter */}
      {showStrengthMeter && value.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2"
        >
          {/* Progress Bar */}
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${strength}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ backgroundColor: strengthColor }}
            />
          </div>

          {/* Strength Label */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">
              Fortaleza de la contraseña:
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: strengthColor }}
            >
              {strengthLabel}
            </span>
          </div>
        </motion.div>
      )}

      {/* Requirements List */}
      {showRequirements && (isFocused || value.length > 0) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 space-y-2"
        >
          <p className="text-xs font-bold text-gray-700 mb-3">
            Requisitos de contraseña:
          </p>
          {VALIDATION_RULES.map((rule) => {
            const status = getValidationStatus(rule);
            return (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                {status === 'valid' && (
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                )}
                {status === 'invalid' && (
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                {status === 'idle' && (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                )}
                <span
                  className={`text-xs font-medium transition-colors ${
                    status === 'valid'
                      ? 'text-green-700'
                      : status === 'invalid'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}
                >
                  {rule.label}
                </span>
              </motion.div>
            );
          })}

          {/* Extra Security Tip */}
          {value.length > 0 && strength >= 90 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 pt-3 border-t border-gray-300 flex items-start gap-2 bg-green-50 p-2 rounded-md"
            >
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-700 font-medium">
                ¡Excelente! Esta contraseña cumple todos los requisitos de seguridad.
              </p>
            </motion.div>
          )}

          {/* Weak Password Warning */}
          {value.length > 0 && strength < 40 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 pt-3 border-t border-gray-300 flex items-start gap-2 bg-red-50 p-2 rounded-md"
            >
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-medium">
                Esta contraseña es muy débil. Agregue más caracteres variados para mayor seguridad.
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ✅ Función de utilidad para validar contraseña
export function validatePassword(password: string): {
  isValid: boolean;
  strength: number;
  failedRules: string[];
} {
  const failedRules: string[] = [];
  let strength = 0;

  VALIDATION_RULES.forEach((rule) => {
    if (rule.test(password)) {
      strength += rule.weight;
    } else {
      failedRules.push(rule.label);
    }
  });

  return {
    isValid: failedRules.length === 0,
    strength,
    failedRules,
  };
}

// ✅ Hook personalizado para gestión de contraseña
export function usePasswordStrength(initialValue = '') {
  const [password, setPassword] = useState(initialValue);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  useEffect(() => {
    if (confirmPassword.length > 0) {
      setPasswordsMatch(password === confirmPassword);
    }
  }, [password, confirmPassword]);

  const validation = validatePassword(password);

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    passwordsMatch,
    isValid: validation.isValid && passwordsMatch,
    strength: validation.strength,
    failedRules: validation.failedRules,
  };
}
