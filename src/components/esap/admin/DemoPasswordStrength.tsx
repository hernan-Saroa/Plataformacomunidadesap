import React, { useState } from 'react';
import { Lock, User, Mail, CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { PasswordStrengthInput, usePasswordStrength, validatePassword } from './PasswordStrengthInput';
import { motion } from 'motion/react';

export function DemoPasswordStrength() {
  const {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    passwordsMatch,
    isValid,
    strength,
    failedRules,
  } = usePasswordStrength();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const examplePasswords = [
    { label: 'Débil', value: '123', color: '#DC2626' },
    { label: 'Media', value: 'Password1', color: '#F59E0B' },
    { label: 'Fuerte', value: 'MyP@ssw0rd', color: '#10B981' },
    { label: 'Muy Fuerte', value: 'S3cur3P@ssw0rd!', color: '#059669' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Sistema de Validación de Contraseñas ESAP 2025
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Componente React con validación en tiempo real y medidor de fortaleza
              </p>
            </div>
          </div>

          {/* Stats del password actual */}
          {password.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-900">Fortaleza</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{strength}%</p>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-900">Válida</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{isValid ? 'SÍ' : 'NO'}</p>
              </div>

              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-900">Longitud</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">{password.length}</p>
              </div>

              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-semibold text-orange-900">Fallos</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">{failedRules.length}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario de Ejemplo */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Formulario de Registro
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ingrese su nombre"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-medium text-sm focus:border-[#2962FF] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Apellido
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ingrese su apellido"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-medium text-sm focus:border-[#2962FF] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@esap.edu.co"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg font-medium text-sm focus:border-[#2962FF] outline-none transition-all"
                  />
                </div>
              </div>

              <PasswordStrengthInput
                value={password}
                onChange={setPassword}
                label="Contraseña"
                placeholder="Cree una contraseña segura"
                showStrengthMeter={true}
                showRequirements={true}
                required={true}
              />

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmar Contraseña <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme su contraseña"
                    className={`w-full pl-11 pr-4 py-3 border-2 rounded-lg font-medium text-sm outline-none transition-all ${
                      confirmPassword.length > 0 && !passwordsMatch
                        ? 'border-red-500 focus:border-red-600'
                        : 'border-gray-300 focus:border-[#2962FF]'
                    }`}
                  />
                </div>
                {confirmPassword.length > 0 && (
                  <p
                    className={`text-xs font-medium flex items-center gap-1 mt-2 ${
                      passwordsMatch ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {passwordsMatch ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Las contraseñas coinciden
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Las contraseñas no coinciden
                      </>
                    )}
                  </p>
                )}
              </div>

              <button
                disabled={!isValid || !passwordsMatch || !firstName || !lastName || !email}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <User className="w-5 h-5" />
                Registrar Usuario
              </button>
            </div>
          </div>

          {/* Panel de Ejemplos */}
          <div className="space-y-6">
            {/* Ejemplos Rápidos */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Ejemplos de Contraseñas
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Haz click en estos ejemplos para probar diferentes niveles de seguridad:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {examplePasswords.map((example) => (
                  <button
                    key={example.label}
                    onClick={() => {
                      setPassword(example.value);
                      setConfirmPassword(example.value);
                    }}
                    className="px-4 py-3 border-2 rounded-lg font-semibold text-sm hover:scale-105 transition-all"
                    style={{
                      borderColor: example.color,
                      backgroundColor: `${example.color}10`,
                      color: example.color,
                    }}
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Política de Seguridad */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg p-6 border-2 border-blue-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                Política de Contraseñas ESAP
              </h2>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>Vigencia:</strong> 180 días desde la creación
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>Alerta preventiva:</strong> 30 días antes del vencimiento
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>Historial:</strong> No reutilizar últimas 5 contraseñas
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>Seguridad:</strong> Bloqueo tras 5 intentos fallidos
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    <strong>Recordatorios:</strong> Automáticos vía email
                  </span>
                </li>
              </ul>
            </div>

            {/* Features del Componente */}
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl shadow-lg p-6 border-2 border-orange-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-orange-600" />
                Características del Componente
              </h2>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  Validación en tiempo real
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  Medidor visual de fortaleza
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  Lista de requisitos con iconos
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  Animaciones suaves (Motion)
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  Toggle mostrar/ocultar contraseña
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  Diseño responsive y accesible
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  Hook personalizado usePasswordStrength
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  100% TypeScript + React
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
