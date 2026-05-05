/**
 * ════════════════════════════════════════════════════════════════════════════
 * POLÍTICA DE CONTRASEÑAS SEGURAS - ESAP 2025
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Componente informativo con la política oficial de contraseñas.
 * Balance óptimo entre SEGURIDAD y USABILIDAD.
 */

import { Card } from '@esap-mfe/shared-ui/card';
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle, Lightbulb, Lock } from 'lucide-react';
import { Badge } from '@esap-mfe/shared-ui/badge';

export function PoliticaPasswordESAP() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white rounded-full shadow-lg">
            <Shield className="w-8 h-8 text-[#003DA5]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              Política de Contraseñas Seguras ESAP
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Balance óptimo entre seguridad institucional y usabilidad para usuarios
            </p>
          </div>
        </div>
      </Card>

      {/* Requisitos Técnicos */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-5 h-5 text-[#003DA5]" />
          <h2 className="text-lg font-bold text-gray-900">Requisitos Técnicos Obligatorios</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RequisitoCard
            icono="📏"
            titulo="Longitud Mínima"
            descripcion="8 caracteres mínimo"
            detalles="Máximo 64 caracteres. El estándar NIST recomienda 8 como mínimo seguro y usable."
            tipo="obligatorio"
          />

          <RequisitoCard
            icono="🔤"
            titulo="Complejidad"
            descripcion="3 de 4 tipos de caracteres"
            detalles="Mayúsculas (A-Z), minúsculas (a-z), números (0-9), especiales (!@#$%^&*)"
            tipo="obligatorio"
          />

          <RequisitoCard
            icono="🚫"
            titulo="Sin Contraseñas Comunes"
            descripcion="Validación contra diccionario"
            detalles='No se permiten contraseñas como "password", "12345678", "esap2024"'
            tipo="obligatorio"
          />

          <RequisitoCard
            icono="👤"
            titulo="Sin Datos Personales"
            descripcion="No incluir información personal"
            detalles="No usar nombre, apellido, documento, email, fecha de nacimiento"
            tipo="obligatorio"
          />
        </div>
      </Card>

      {/* Gestión de Contraseñas */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-[#003DA5]" />
          <h2 className="text-lg font-bold text-gray-900">Gestión y Ciclo de Vida</h2>
        </div>

        <div className="space-y-3">
          <GestionItem
            icono="🔄"
            titulo="Renovación Periódica"
            descripcion="Cada 180 días (6 meses)"
            detalle="Se notifica 30 días antes del vencimiento. Periodo balanceado que no obliga a cambios muy frecuentes."
          />

          <GestionItem
            icono="🔒"
            titulo="Intentos Fallidos"
            descripcion="Máximo 5 intentos"
            detalle="Bloqueo temporal de 15 minutos después de 5 intentos fallidos consecutivos."
          />

          <GestionItem
            icono="📜"
            titulo="Historial"
            descripcion="No reutilizar últimas 3 contraseñas"
            detalle="El sistema recuerda las 3 contraseñas anteriores para evitar reciclaje."
          />

          <GestionItem
            icono="🔐"
            titulo="Primer Inicio de Sesión"
            descripcion="Cambio obligatorio"
            detalle="Los usuarios nuevos deben cambiar la contraseña temporal en el primer acceso."
          />

          <GestionItem
            icono="📱"
            titulo="Autenticación de Dos Factores (2FA)"
            descripcion="Opcional para usuarios, obligatorio para administradores"
            detalle="Capa adicional de seguridad recomendada para cuentas sensibles."
          />
        </div>
      </Card>

      {/* Niveles de Fortaleza */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-[#003DA5]" />
          <h2 className="text-lg font-bold text-gray-900">Niveles de Fortaleza</h2>
        </div>

        <div className="space-y-2">
          <NivelFortaleza
            nivel="Muy Débil"
            color="#DC2626"
            rango="0-29%"
            estado="rechazada"
            ejemplo='Ejemplo: "pass123" - Se rechaza automáticamente'
          />
          
          <NivelFortaleza
            nivel="Débil"
            color="#F59E0B"
            rango="30-49%"
            estado="rechazada"
            ejemplo='Ejemplo: "Password1" - Muy común, se rechaza'
          />
          
          <NivelFortaleza
            nivel="Aceptable"
            color="#EAB308"
            rango="50-69%"
            estado="aceptada"
            ejemplo='Ejemplo: "MiClave8!" - Cumple requisitos mínimos'
          />
          
          <NivelFortaleza
            nivel="Fuerte"
            color="#10B981"
            rango="70-84%"
            estado="recomendada"
            ejemplo='Ejemplo: "Esap2025@Legal" - Buena combinación'
          />
          
          <NivelFortaleza
            nivel="Muy Fuerte"
            color="#059669"
            rango="85-100%"
            estado="optima"
            ejemplo='Ejemplo: "Luna#Gato@2025!" - Excelente seguridad'
          />
        </div>
      </Card>

      {/* Ejemplos Prácticos */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="w-5 h-5 text-[#003DA5]" />
          <h2 className="text-lg font-bold text-gray-900">Ejemplos Prácticos</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contraseñas Válidas */}
          <div>
            <h3 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              ✅ Contraseñas Válidas
            </h3>
            <div className="space-y-2">
              <EjemploPassword password="Esap2025!" valida={true} descripcion="9 caracteres, 4 tipos" />
              <EjemploPassword password="MiCafe@8" valida={true} descripcion="8 caracteres, 3 tipos" />
              <EjemploPassword password="Luna#Gato7" valida={true} descripcion="11 caracteres, frase memorable" />
              <EjemploPassword password="Legal2025$" valida={true} descripcion="10 caracteres, fácil de recordar" />
              <EjemploPassword password="Bogota!23" valida={true} descripcion="9 caracteres, ciudad + símbolos" />
            </div>
          </div>

          {/* Contraseñas Inválidas */}
          <div>
            <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              ❌ Contraseñas NO Válidas
            </h3>
            <div className="space-y-2">
              <EjemploPassword password="12345678" valida={false} razon="Muy común" />
              <EjemploPassword password="password" valida={false} razon="Palabra común" />
              <EjemploPassword password="esap2024" valida={false} razon="Predecible" />
              <EjemploPassword password="Juan1234" valida={false} razon="Contiene nombre personal" />
              <EjemploPassword password="abc123" valida={false} razon="Menos de 8 caracteres" />
            </div>
          </div>
        </div>
      </Card>

      {/* Consejos de Seguridad */}
      <Card className="p-6 bg-blue-50 border-2 border-blue-200">
        <h3 className="text-sm font-bold text-blue-900 mb-3">
          🛡️ Consejos de Seguridad para Usuarios
        </h3>
        <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
          <li><strong>Usa frases memorables:</strong> Combina palabras que solo tú entiendas (Ej: "MiPerro@Luna2025")</li>
          <li><strong>Agrega números y símbolos:</strong> Reemplaza letras por símbolos parecidos (@ por a, 3 por e)</li>
          <li><strong>NO reutilices contraseñas:</strong> Usa una contraseña diferente para cada servicio</li>
          <li><strong>NO compartas tu contraseña:</strong> Ni con compañeros, familiares o soporte técnico</li>
          <li><strong>NO escribas tu contraseña:</strong> Evita apuntarla en papeles o archivos sin cifrar</li>
          <li><strong>Usa gestores de contraseñas:</strong> Herramientas como LastPass, 1Password (recomendado)</li>
          <li><strong>Cierra sesión en dispositivos compartidos:</strong> Nunca dejes tu sesión abierta</li>
          <li><strong>Activa 2FA cuando esté disponible:</strong> Capa adicional de protección</li>
        </ul>
      </Card>

      {/* Normativa */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3">
          📖 Fundamento Normativo
        </h3>
        <div className="space-y-2 text-xs text-gray-700">
          <p>
            <strong>MinTIC - Guía de Seguridad Digital:</strong> Requisitos mínimos para entidades públicas colombianas
          </p>
          <p>
            <strong>NIST SP 800-63B:</strong> Estándar internacional de autenticación digital
          </p>
          <p>
            <strong>OWASP:</strong> Mejores prácticas de seguridad en aplicaciones web
          </p>
          <p>
            <strong>ISO 27001:</strong> Gestión de seguridad de la información
          </p>
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 pt-4">
        <p>Política de Contraseñas ESAP - Versión 1.0 - Diciembre 2024</p>
        <p className="mt-1">
          Balance óptimo entre <strong className="text-[#003DA5]">seguridad institucional</strong> y{' '}
          <strong className="text-green-600">usabilidad para usuarios</strong>
        </p>
      </div>
    </div>
  );
}

// Componente para requisitos
interface RequisitoCardProps {
  icono: string;
  titulo: string;
  descripcion: string;
  detalles: string;
  tipo: 'obligatorio' | 'recomendado';
}

function RequisitoCard({ icono, titulo, descripcion, detalles, tipo }: RequisitoCardProps) {
  return (
    <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icono}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-sm text-gray-900">{titulo}</h3>
            <Badge className={tipo === 'obligatorio' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
              {tipo === 'obligatorio' ? 'Obligatorio' : 'Recomendado'}
            </Badge>
          </div>
          <p className="text-xs font-semibold text-gray-700 mb-1">{descripcion}</p>
          <p className="text-xs text-gray-600">{detalles}</p>
        </div>
      </div>
    </div>
  );
}

// Componente para items de gestión
interface GestionItemProps {
  icono: string;
  titulo: string;
  descripcion: string;
  detalle: string;
}

function GestionItem({ icono, titulo, descripcion, detalle }: GestionItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <span className="text-xl">{icono}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-bold text-gray-900">{titulo}</h4>
          <span className="text-xs font-semibold text-[#003DA5]">→ {descripcion}</span>
        </div>
        <p className="text-xs text-gray-600">{detalle}</p>
      </div>
    </div>
  );
}

// Componente para niveles de fortaleza
interface NivelFortalezaProps {
  nivel: string;
  color: string;
  rango: string;
  estado: 'rechazada' | 'aceptada' | 'recomendada' | 'optima';
  ejemplo: string;
}

function NivelFortaleza({ nivel, color, rango, estado, ejemplo }: NivelFortalezaProps) {
  const estadoLabels = {
    rechazada: '🚫 Rechazada',
    aceptada: '✅ Aceptada',
    recomendada: '⭐ Recomendada',
    optima: '🏆 Óptima'
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
      <div className="w-24 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full" style={{ width: rango.split('-')[1], backgroundColor: color }} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold" style={{ color }}>{nivel}</span>
          <span className="text-xs text-gray-500">({rango})</span>
          <Badge className="text-xs" style={{ backgroundColor: `${color}20`, color }}>
            {estadoLabels[estado]}
          </Badge>
        </div>
        <p className="text-xs text-gray-600">{ejemplo}</p>
      </div>
    </div>
  );
}

// Componente para ejemplos de contraseñas
interface EjemploPasswordProps {
  password: string;
  valida: boolean;
  descripcion?: string;
  razon?: string;
}

function EjemploPassword({ password, valida, descripcion, razon }: EjemploPasswordProps) {
  return (
    <div className={`p-2 rounded border ${valida ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <code className={`text-sm font-bold ${valida ? 'text-green-700' : 'text-red-700'}`}>
        {password}
      </code>
      <p className="text-xs text-gray-600 mt-0.5">
        {valida ? descripcion : `❌ ${razon}`}
      </p>
    </div>
  );
}