/**
 * Ejemplo de uso del PasswordStrengthInput
 * Formulario de registro/cambio de contraseña
 */

import { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { PasswordStrengthInput } from './PasswordStrengthInput';
import { toast } from 'sonner@2.0.3';
import { User, Mail, CreditCard, Check, AlertCircle } from 'lucide-react';

export function EjemploPasswordSegura() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [documento, setDocumento] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!nombre || !apellido || !documento || !email) {
      toast.error('Completa todos los campos', {
        description: 'Todos los campos son obligatorios'
      });
      return;
    }

    if (!isPasswordValid) {
      toast.error('Contraseña no válida', {
        description: 'La contraseña no cumple con los requisitos de seguridad'
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden', {
        description: 'Verifica que ambas contraseñas sean iguales'
      });
      return;
    }

    // Éxito
    toast.success('Cuenta creada exitosamente', {
      description: 'Tu contraseña es segura y cumple todos los requisitos',
      icon: <Check className="w-4 h-4" />
    });

    // Limpiar formulario
    setNombre('');
    setApellido('');
    setDocumento('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Crear Cuenta - ESAP
          </h2>
          <p className="text-sm text-gray-600">
            Completa el formulario con una contraseña segura (mínimo 8 caracteres)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Datos personales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-[#003DA5]" />
                Nombre
              </label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan"
                required
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-[#003DA5]" />
                Apellido
              </label>
              <Input
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Ej: Pérez"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-[#003DA5]" />
              Documento de Identidad
            </label>
            <Input
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="Ej: 1234567890"
              type="number"
              required
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-[#003DA5]" />
              Correo Electrónico
            </label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.correo@esap.edu.co"
              type="email"
              required
            />
          </div>

          {/* Separador */}
          <div className="border-t border-gray-200 my-6" />

          {/* Contraseña con validación */}
          <PasswordStrengthInput
            value={password}
            onChange={setPassword}
            onValidChange={setIsPasswordValid}
            label="Contraseña"
            placeholder="Crea una contraseña segura"
            showRequirements={true}
            showSuggestions={true}
            userData={{
              nombre,
              apellido,
              documento,
              email
            }}
          />

          {/* Confirmar contraseña */}
          <div>
            <label className="text-sm font-bold text-gray-900 mb-2 block">
              Confirmar Contraseña
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              required
            />
            
            {confirmPassword && (
              <div className="mt-2">
                {passwordsMatch ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <Check className="w-3.5 h-3.5" />
                    <p className="text-xs font-semibold">Las contraseñas coinciden</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <p className="text-xs font-semibold">Las contraseñas no coinciden</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Información de seguridad */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-bold text-blue-900 mb-2">
              🔐 Política de Contraseñas ESAP
            </h3>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Mínimo <strong>8 caracteres</strong> (balance seguridad/usabilidad)</li>
              <li>Al menos <strong>3 tipos</strong> de caracteres diferentes</li>
              <li>No uses datos personales (nombre, documento, etc.)</li>
              <li>Evita contraseñas comunes como "password", "12345678"</li>
              <li>Tu contraseña se renovará cada <strong>180 días</strong></li>
              <li>Después de <strong>5 intentos fallidos</strong> tu cuenta se bloqueará por 15 minutos</li>
            </ul>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setNombre('');
                setApellido('');
                setDocumento('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              style={{ background: '#003DA5' }}
              disabled={!isPasswordValid || !passwordsMatch}
            >
              <Check className="w-4 h-4 mr-2" />
              Crear Cuenta
            </Button>
          </div>
        </form>
      </Card>

      {/* Ejemplos de contraseñas */}
      <Card className="mt-6 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          📋 Ejemplos de Contraseñas Válidas
        </h3>
        
        <div className="space-y-3">
          <EjemploContraseña 
            password="Esap2025!"
            nivel="Fuerte"
            color="green"
            descripcion="9 caracteres, 4 tipos (mayúsculas, minúsculas, números, especiales)"
          />
          
          <EjemploContraseña 
            password="MiCafe@8"
            nivel="Aceptable"
            color="yellow"
            descripcion="8 caracteres, 3 tipos (mayúsculas, minúsculas, especiales)"
          />
          
          <EjemploContraseña 
            password="Luna#Gato7"
            nivel="Muy Fuerte"
            color="green"
            descripcion="11 caracteres, 4 tipos, frase memorable"
          />
          
          <EjemploContraseña 
            password="Legal2025$"
            nivel="Fuerte"
            color="green"
            descripcion="10 caracteres, 4 tipos, fácil de recordar"
          />
        </div>

        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-bold text-red-900 mb-2">❌ NO usar:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-red-800">
            <div>• "12345678" (muy común)</div>
            <div>• "password" (muy común)</div>
            <div>• "esap2024" (predecible)</div>
            <div>• Tu nombre completo</div>
            <div>• Tu documento</div>
            <div>• Tu fecha de nacimiento</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Componente para mostrar ejemplos
interface EjemploContraseñaProps {
  password: string;
  nivel: string;
  color: 'green' | 'yellow' | 'red';
  descripcion: string;
}

function EjemploContraseña({ password, nivel, color, descripcion }: EjemploContraseñaProps) {
  const colorMap = {
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' }
  };

  const colors = colorMap[color];

  return (
    <div className={`p-3 ${colors.bg} border ${colors.border} rounded-lg`}>
      <div className="flex items-center justify-between mb-1">
        <code className={`text-sm font-bold ${colors.text}`}>{password}</code>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${colors.badge} ${colors.text}`}>
          {nivel}
        </span>
      </div>
      <p className="text-xs text-gray-600">{descripcion}</p>
    </div>
  );
}