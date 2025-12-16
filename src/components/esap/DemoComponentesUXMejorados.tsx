/**
 * DEMO DE COMPONENTES UX MEJORADOS
 * Página de demostración de todos los componentes con estilos ESAP optimizados
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles, Download, CheckCircle, AlertTriangle, Zap,
  Mail, Lock, Search, User, Home, ArrowRight, ArrowLeft
} from 'lucide-react';
import ButtonEnhanced from '../ui/button-enhanced';
import CardEnhanced from '../ui/card-enhanced';
import BadgeEnhanced from '../ui/badge-enhanced';
import InputEnhanced from '../ui/input-enhanced';

export function DemoComponentesUXMejorados({ onBack }: { onBack?: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('El email es requerido');
    } else if (!/\S+@\S+\.\S+/.test(value)) {
      setEmailError('Email inválido');
    } else {
      setEmailError('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* BOTÓN VOLVER */}
        {onBack && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <ButtonEnhanced
              variant="ghost"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={onBack}
            >
              Volver al Inicio
            </ButtonEnhanced>
          </motion.div>
        )}

        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-[#003DA5] to-[#0052D9] rounded-2xl mb-4">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-black text-gray-900 mb-4">
            Componentes UX Mejorados
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Sistema de diseño ESAP con componentes optimizados para mejor experiencia de usuario,
            accesibilidad WCAG AAA y animaciones suaves
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <BadgeEnhanced variant="success" dot pulse>
              100% Accesible
            </BadgeEnhanced>
            <BadgeEnhanced variant="primary" dot>
              WCAG AAA
            </BadgeEnhanced>
            <BadgeEnhanced variant="purple" dot>
              Animaciones Suaves
            </BadgeEnhanced>
          </div>
        </motion.div>

        {/* SECCIÓN: BOTONES */}
        <CardEnhanced variant="elevated" padding="lg">
          <h2 className="text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
            <Zap className="w-8 h-8 text-[#003DA5]" />
            Botones Mejorados
          </h2>

          <div className="space-y-8">
            {/* Variantes */}
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-4">Variantes</h3>
              <div className="flex flex-wrap gap-3">
                <ButtonEnhanced variant="primary">
                  Botón Primary
                </ButtonEnhanced>
                <ButtonEnhanced variant="secondary">
                  Botón Secondary
                </ButtonEnhanced>
                <ButtonEnhanced variant="ghost">
                  Botón Ghost
                </ButtonEnhanced>
                <ButtonEnhanced variant="danger">
                  Botón Danger
                </ButtonEnhanced>
                <ButtonEnhanced variant="success">
                  Botón Success
                </ButtonEnhanced>
                <ButtonEnhanced variant="outline">
                  Botón Outline
                </ButtonEnhanced>
              </div>
            </div>

            {/* Tamaños */}
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-4">Tamaños</h3>
              <div className="flex flex-wrap items-center gap-3">
                <ButtonEnhanced size="sm">
                  Small
                </ButtonEnhanced>
                <ButtonEnhanced size="md">
                  Medium
                </ButtonEnhanced>
                <ButtonEnhanced size="lg">
                  Large
                </ButtonEnhanced>
                <ButtonEnhanced size="xl">
                  Extra Large
                </ButtonEnhanced>
              </div>
            </div>

            {/* Con iconos */}
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-4">Con Iconos</h3>
              <div className="flex flex-wrap gap-3">
                <ButtonEnhanced leftIcon={<Download className="w-4 h-4" />}>
                  Descargar
                </ButtonEnhanced>
                <ButtonEnhanced
                  variant="secondary"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continuar
                </ButtonEnhanced>
                <ButtonEnhanced
                  variant="success"
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Aprobar y Continuar
                </ButtonEnhanced>
              </div>
            </div>

            {/* Estados */}
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-4">Estados</h3>
              <div className="flex flex-wrap gap-3">
                <ButtonEnhanced
                  isLoading={isLoading}
                  onClick={handleLoadingDemo}
                >
                  {isLoading ? 'Cargando...' : 'Click para Cargar'}
                </ButtonEnhanced>
                <ButtonEnhanced disabled>
                  Deshabilitado
                </ButtonEnhanced>
                <ButtonEnhanced elevated>
                  Con Elevación
                </ButtonEnhanced>
                <ButtonEnhanced fullWidth>
                  Ancho Completo
                </ButtonEnhanced>
              </div>
            </div>
          </div>
        </CardEnhanced>

        {/* SECCIÓN: CARDS */}
        <CardEnhanced variant="elevated" padding="lg">
          <h2 className="text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📦</span>
            </div>
            Cards Mejorados
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card Default */}
            <CardEnhanced variant="default" padding="md" hover>
              <h3 className="font-bold text-gray-900 mb-2">Card Default</h3>
              <p className="text-sm text-gray-600 mb-4">
                Card con estilo por defecto, sombra suave y efecto hover.
              </p>
              <BadgeEnhanced variant="primary" size="sm">Default</BadgeEnhanced>
            </CardEnhanced>

            {/* Card Elevated */}
            <CardEnhanced variant="elevated" padding="md" hover>
              <h3 className="font-bold text-gray-900 mb-2">Card Elevated</h3>
              <p className="text-sm text-gray-600 mb-4">
                Card con elevación pronunciada, ideal para destacar contenido.
              </p>
              <BadgeEnhanced variant="success" size="sm">Elevated</BadgeEnhanced>
            </CardEnhanced>

            {/* Card Outlined */}
            <CardEnhanced variant="outlined" padding="md" hover>
              <h3 className="font-bold text-gray-900 mb-2">Card Outlined</h3>
              <p className="text-sm text-gray-600 mb-4">
                Card con borde azul corporativo, sin sombra inicial.
              </p>
              <BadgeEnhanced variant="info" size="sm">Outlined</BadgeEnhanced>
            </CardEnhanced>

            {/* Card Glass */}
            <CardEnhanced variant="glass" padding="md" hover>
              <h3 className="font-bold text-gray-900 mb-2">Card Glass</h3>
              <p className="text-sm text-gray-600 mb-4">
                Card con efecto glassmorphism y backdrop blur.
              </p>
              <BadgeEnhanced variant="purple" size="sm">Glass</BadgeEnhanced>
            </CardEnhanced>

            {/* Card Gradient */}
            <CardEnhanced variant="gradient" padding="md" hover>
              <h3 className="font-bold text-gray-900 mb-2">Card Gradient</h3>
              <p className="text-sm text-gray-600 mb-4">
                Card con gradiente azul-púrpura de fondo.
              </p>
              <BadgeEnhanced variant="warning" size="sm">Gradient</BadgeEnhanced>
            </CardEnhanced>

            {/* Card Clickable */}
            <CardEnhanced variant="elevated" padding="md" clickable>
              <h3 className="font-bold text-gray-900 mb-2">Card Clickable</h3>
              <p className="text-sm text-gray-600 mb-4">
                Card interactivo con efecto de click y escala.
              </p>
              <BadgeEnhanced variant="danger" size="sm">Clickable</BadgeEnhanced>
            </CardEnhanced>
          </div>

          {/* Card con Header y Footer */}
          <div className="mt-6">
            <CardEnhanced
              variant="outlined"
              padding="md"
              header={
                <div>
                  <h3 className="font-bold text-gray-900">Card con Header y Footer</h3>
                  <p className="text-sm text-gray-600">Subtítulo del card</p>
                </div>
              }
              footer={
                <div className="flex justify-end gap-2">
                  <ButtonEnhanced variant="ghost" size="sm">
                    Cancelar
                  </ButtonEnhanced>
                  <ButtonEnhanced size="sm">
                    Confirmar
                  </ButtonEnhanced>
                </div>
              }
            >
              <p className="text-gray-700">
                Este card tiene un header personalizado con título y subtítulo,
                y un footer con botones de acción.
              </p>
            </CardEnhanced>
          </div>
        </CardEnhanced>

        {/* SECCIÓN: BADGES */}
        <CardEnhanced variant="elevated" padding="lg">
          <h2 className="text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">🏷️</span>
            </div>
            Badges Mejorados
          </h2>

          <div className="space-y-6">
            {/* Variantes */}
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-4">Variantes</h3>
              <div className="flex flex-wrap gap-3">
                <BadgeEnhanced variant="primary">Primary</BadgeEnhanced>
                <BadgeEnhanced variant="success">Success</BadgeEnhanced>
                <BadgeEnhanced variant="warning">Warning</BadgeEnhanced>
                <BadgeEnhanced variant="danger">Danger</BadgeEnhanced>
                <BadgeEnhanced variant="info">Info</BadgeEnhanced>
                <BadgeEnhanced variant="purple">Purple</BadgeEnhanced>
                <BadgeEnhanced variant="gray">Gray</BadgeEnhanced>
              </div>
            </div>

            {/* Tamaños */}
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-4">Tamaños</h3>
              <div className="flex flex-wrap items-center gap-3">
                <BadgeEnhanced size="sm">Small</BadgeEnhanced>
                <BadgeEnhanced size="md">Medium</BadgeEnhanced>
                <BadgeEnhanced size="lg">Large</BadgeEnhanced>
              </div>
            </div>

            {/* Con dot */}
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-4">Con Indicador Dot</h3>
              <div className="flex flex-wrap gap-3">
                <BadgeEnhanced variant="success" dot>Activo</BadgeEnhanced>
                <BadgeEnhanced variant="warning" dot>Pendiente</BadgeEnhanced>
                <BadgeEnhanced variant="danger" dot>Crítico</BadgeEnhanced>
                <BadgeEnhanced variant="primary" dot pulse>En Proceso</BadgeEnhanced>
              </div>
            </div>

            {/* Con iconos */}
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-4">Con Iconos</h3>
              <div className="flex flex-wrap gap-3">
                <BadgeEnhanced
                  variant="success"
                  icon={<CheckCircle className="w-3 h-3" />}
                >
                  Completado
                </BadgeEnhanced>
                <BadgeEnhanced
                  variant="warning"
                  icon={<AlertTriangle className="w-3 h-3" />}
                >
                  Advertencia
                </BadgeEnhanced>
                <BadgeEnhanced
                  variant="primary"
                  icon={<Download className="w-3 h-3" />}
                >
                  Descargar
                </BadgeEnhanced>
              </div>
            </div>

            {/* Outlined */}
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-4">Outlined</h3>
              <div className="flex flex-wrap gap-3">
                <BadgeEnhanced variant="primary" outlined>Primary</BadgeEnhanced>
                <BadgeEnhanced variant="success" outlined>Success</BadgeEnhanced>
                <BadgeEnhanced variant="warning" outlined>Warning</BadgeEnhanced>
                <BadgeEnhanced variant="danger" outlined>Danger</BadgeEnhanced>
              </div>
            </div>
          </div>
        </CardEnhanced>

        {/* SECCIÓN: INPUTS */}
        <CardEnhanced variant="elevated" padding="lg">
          <h2 className="text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">✏️</span>
            </div>
            Inputs Mejorados
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input básico */}
            <InputEnhanced
              label="Nombre completo"
              placeholder="Ingresa tu nombre"
              helper="Este campo es obligatorio"
              required
              fullWidth
            />

            {/* Input con icono izquierdo */}
            <InputEnhanced
              label="Correo electrónico"
              type="email"
              placeholder="correo@esap.edu.co"
              leftIcon={<Mail className="w-4 h-4" />}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                validateEmail(e.target.value);
              }}
              error={emailError}
              fullWidth
            />

            {/* Input de contraseña */}
            <InputEnhanced
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              helper="Mínimo 8 caracteres"
              fullWidth
            />

            {/* Input con búsqueda */}
            <InputEnhanced
              label="Buscar"
              placeholder="Buscar en el sistema..."
              leftIcon={<Search className="w-4 h-4" />}
              fullWidth
            />

            {/* Input exitoso */}
            <InputEnhanced
              label="Usuario"
              placeholder="usuario123"
              leftIcon={<User className="w-4 h-4" />}
              defaultValue="juanperez"
              success
              fullWidth
            />

            {/* Input deshabilitado */}
            <InputEnhanced
              label="Campo deshabilitado"
              placeholder="No editable"
              disabled
              fullWidth
            />

            {/* Input variant filled */}
            <InputEnhanced
              label="Variant: Filled"
              variant="filled"
              placeholder="Input con fondo gris"
              fullWidth
            />

            {/* Input variant outlined */}
            <InputEnhanced
              label="Variant: Outlined"
              variant="outlined"
              placeholder="Input con borde grueso"
              fullWidth
            />
          </div>
        </CardEnhanced>

        {/* FOOTER */}
        <CardEnhanced variant="gradient" padding="lg">
          <div className="text-center">
            <h3 className="text-2xl font-black text-gray-900 mb-3">
              🎨 Sistema de Diseño ESAP
            </h3>
            <p className="text-gray-700 mb-4 max-w-2xl mx-auto">
              Componentes optimizados con animaciones suaves, contraste WCAG AAA,
              y la mejor experiencia de usuario para el backoffice de la ESAP.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <BadgeEnhanced variant="success" dot>Accesible</BadgeEnhanced>
              <BadgeEnhanced variant="primary" dot>Responsive</BadgeEnhanced>
              <BadgeEnhanced variant="purple" dot>Animado</BadgeEnhanced>
              <BadgeEnhanced variant="warning" dot>Mobile-First</BadgeEnhanced>
            </div>
          </div>
        </CardEnhanced>
      </div>
    </div>
  );
}

export default DemoComponentesUXMejorados;