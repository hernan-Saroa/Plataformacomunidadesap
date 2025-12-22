/**
 * 📝 EDITOR DE PLANTILLAS DE MENSAJES - SISTEMA SIGL
 * 
 * Editor profesional de clase mundial para gestionar plantillas de notificaciones
 * - Editor visual con sintaxis highlighting
 * - Variables dinámicas
 * - Previsualización en tiempo real
 * - Gestión completa CRUD
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail, MessageSquare, Smartphone, Bell, Plus, Edit2, Trash2,
  Eye, Copy, Check, X, AlertCircle, Info, Save, RotateCcw,
  Code, Type, Calendar, User, FileText, Tag, Zap, HelpCircle
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { toast } from 'sonner@2.0.3';
import { GuiaPlantillas } from './GuiaPlantillas';

type TipoCanal = 'EMAIL' | 'TEAMS' | 'SMS' | 'IN_APP';
type NivelAlerta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO' | 'GENERAL';

interface PlantillaMensaje {
  id: string;
  nombre: string;
  tipo: TipoCanal;
  nivel: NivelAlerta;
  asunto?: string;
  cuerpo: string;
  variables: string[];
  activa: boolean;
}

const PLANTILLAS_DEFAULT: PlantillaMensaje[] = [
  // EMAIL - Alertas por nivel
  {
    id: 'email-verde',
    nombre: 'Email - Alerta Verde',
    tipo: 'EMAIL',
    nivel: 'VERDE',
    asunto: '✓ {modulo} - Término dentro del plazo ({dias_restantes} días)',
    cuerpo: `Estimado/a {responsable},

Le informamos que el proceso de {modulo} con radicado {expediente} se encuentra en estado VERDE.

📅 Días restantes: {dias_restantes}
📆 Fecha de vencimiento: {fecha_vencimiento}
✓ Estado: NORMAL - Dentro del plazo

Este es un recordatorio preventivo. El proceso tiene tiempo suficiente para su gestión.

Cordialmente,
Sistema SIGL - ESAP`,
    variables: ['modulo', 'responsable', 'expediente', 'dias_restantes', 'fecha_vencimiento'],
    activa: true,
  },
  {
    id: 'email-amarillo',
    nombre: 'Email - Alerta Amarilla',
    tipo: 'EMAIL',
    nivel: 'AMARILLO',
    asunto: '⚠ {modulo} - PRECAUCIÓN: Quedan {dias_restantes} días',
    cuerpo: `Estimado/a {responsable},

⚠ ALERTA AMARILLA - PRECAUCIÓN

El proceso de {modulo} con radicado {expediente} requiere su atención:

📅 Días restantes: {dias_restantes}
📆 Fecha de vencimiento: {fecha_vencimiento}
⚠ Estado: PRECAUCIÓN - Atención requerida

Por favor, priorice la gestión de este proceso para evitar vencimientos.

Cordialmente,
Sistema SIGL - ESAP`,
    variables: ['modulo', 'responsable', 'expediente', 'dias_restantes', 'fecha_vencimiento'],
    activa: true,
  },
  {
    id: 'email-rojo',
    nombre: 'Email - Alerta Roja',
    tipo: 'EMAIL',
    nivel: 'ROJO',
    asunto: '🔥 {modulo} - URGENTE: Quedan {dias_restantes} días',
    cuerpo: `Estimado/a {responsable},

🔥 ALERTA ROJA - URGENTE

El proceso de {modulo} con radicado {expediente} está próximo a vencerse:

📅 Días restantes: {dias_restantes}
📆 Fecha de vencimiento: {fecha_vencimiento}
🔥 Estado: URGENTE - Acción inmediata requerida

Este proceso requiere gestión INMEDIATA para evitar vencimiento del término legal.

Cordialmente,
Sistema SIGL - ESAP`,
    variables: ['modulo', 'responsable', 'expediente', 'dias_restantes', 'fecha_vencimiento'],
    activa: true,
  },
  {
    id: 'email-vencido',
    nombre: 'Email - Término Vencido',
    tipo: 'EMAIL',
    nivel: 'VENCIDO',
    asunto: '❌ {modulo} - TÉRMINO VENCIDO - Radicado {expediente}',
    cuerpo: `Estimado/a {responsable},

❌ TÉRMINO VENCIDO

El proceso de {modulo} con radicado {expediente} ha VENCIDO:

📅 Días de vencimiento: {dias_restantes}
📆 Fecha de vencimiento: {fecha_vencimiento}
❌ Estado: VENCIDO - Requiere acción urgente

Por favor, contacte inmediatamente a su supervisor y tome las acciones correctivas necesarias.

Cordialmente,
Sistema SIGL - ESAP`,
    variables: ['modulo', 'responsable', 'expediente', 'dias_restantes', 'fecha_vencimiento'],
    activa: true,
  },

  // TEAMS
  {
    id: 'teams-amarillo',
    nombre: 'Teams - Alerta Amarilla',
    tipo: 'TEAMS',
    nivel: 'AMARILLO',
    cuerpo: `⚠ **ALERTA AMARILLA - {modulo}**

📋 Expediente: {expediente}
👤 Responsable: {responsable}
📅 Quedan: **{dias_restantes} días**
📆 Vence: {fecha_vencimiento}

Priorice la gestión de este proceso.`,
    variables: ['modulo', 'responsable', 'expediente', 'dias_restantes', 'fecha_vencimiento'],
    activa: true,
  },
  {
    id: 'teams-rojo',
    nombre: 'Teams - Alerta Roja',
    tipo: 'TEAMS',
    nivel: 'ROJO',
    cuerpo: `🔥 **ALERTA ROJA - {modulo}**

📋 Expediente: {expediente}
👤 Responsable: {responsable}
📅 Quedan: **{dias_restantes} días**
📆 Vence: {fecha_vencimiento}

⚡ ACCIÓN INMEDIATA REQUERIDA`,
    variables: ['modulo', 'responsable', 'expediente', 'dias_restantes', 'fecha_vencimiento'],
    activa: true,
  },
  {
    id: 'teams-vencido',
    nombre: 'Teams - Término Vencido',
    tipo: 'TEAMS',
    nivel: 'VENCIDO',
    cuerpo: `❌ **TÉRMINO VENCIDO - {modulo}**

📋 Expediente: {expediente}
👤 Responsable: {responsable}
📆 Venció: {fecha_vencimiento}

🚨 CONTACTE A SU SUPERVISOR INMEDIATAMENTE`,
    variables: ['modulo', 'responsable', 'expediente', 'fecha_vencimiento'],
    activa: true,
  },

  // SMS
  {
    id: 'sms-amarillo',
    nombre: 'SMS - Alerta Amarilla',
    tipo: 'SMS',
    nivel: 'AMARILLO',
    cuerpo: `ALERTA {modulo}: Exp {expediente} vence en {dias_restantes} días. Priorice gestión. SIGL-ESAP`,
    variables: ['modulo', 'expediente', 'dias_restantes'],
    activa: true,
  },
  {
    id: 'sms-rojo',
    nombre: 'SMS - Alerta Roja',
    tipo: 'SMS',
    nivel: 'ROJO',
    cuerpo: `URGENTE {modulo}: Exp {expediente} vence en {dias_restantes} días. Acción inmediata. SIGL-ESAP`,
    variables: ['modulo', 'expediente', 'dias_restantes'],
    activa: true,
  },
  {
    id: 'sms-vencido',
    nombre: 'SMS - Término Vencido',
    tipo: 'SMS',
    nivel: 'VENCIDO',
    cuerpo: `VENCIDO {modulo}: Exp {expediente} venció {fecha_vencimiento}. Contacte supervisor. SIGL-ESAP`,
    variables: ['modulo', 'expediente', 'fecha_vencimiento'],
    activa: true,
  },

  // IN-APP
  {
    id: 'inapp-verde',
    nombre: 'In-App - Alerta Verde',
    tipo: 'IN_APP',
    nivel: 'VERDE',
    cuerpo: `Recordatorio: El proceso {expediente} de {modulo} vence en {dias_restantes} días.`,
    variables: ['modulo', 'expediente', 'dias_restantes'],
    activa: true,
  },
  {
    id: 'inapp-amarillo',
    nombre: 'In-App - Alerta Amarilla',
    tipo: 'IN_APP',
    nivel: 'AMARILLO',
    cuerpo: `Precaución: El proceso {expediente} de {modulo} vence en {dias_restantes} días. Priorice su gestión.`,
    variables: ['modulo', 'expediente', 'dias_restantes'],
    activa: true,
  },
  {
    id: 'inapp-rojo',
    nombre: 'In-App - Alerta Roja',
    tipo: 'IN_APP',
    nivel: 'ROJO',
    cuerpo: `URGENTE: El proceso {expediente} de {modulo} vence en {dias_restantes} días. Requiere acción inmediata.`,
    variables: ['modulo', 'expediente', 'dias_restantes'],
    activa: true,
  },
  {
    id: 'inapp-vencido',
    nombre: 'In-App - Término Vencido',
    tipo: 'IN_APP',
    nivel: 'VENCIDO',
    cuerpo: `VENCIDO: El proceso {expediente} de {modulo} ha superado su término. Contacte a su supervisor inmediatamente.`,
    variables: ['modulo', 'expediente'],
    activa: true,
  },
];

const VARIABLES_DISPONIBLES = [
  { variable: '{modulo}', descripcion: 'Nombre del módulo SIGL', ejemplo: 'Defensa Judicial', icono: Tag },
  { variable: '{expediente}', descripcion: 'Número de radicado/expediente', ejemplo: '2024-001234', icono: FileText },
  { variable: '{responsable}', descripcion: 'Nombre del responsable', ejemplo: 'Juan Pérez', icono: User },
  { variable: '{dias_restantes}', descripcion: 'Días restantes hasta vencimiento', ejemplo: '5', icono: Calendar },
  { variable: '{fecha_vencimiento}', descripcion: 'Fecha de vencimiento', ejemplo: '25/12/2024', icono: Calendar },
  { variable: '{fecha_actual}', descripcion: 'Fecha actual', ejemplo: '20/12/2024', icono: Calendar },
  { variable: '{prioridad}', descripcion: 'Prioridad del proceso', ejemplo: 'ALTA', icono: Zap },
  { variable: '{institucion}', descripcion: 'Nombre de la institución', ejemplo: 'ESAP', icono: Type },
];

const ICONOS_CANAL = {
  EMAIL: Mail,
  TEAMS: MessageSquare,
  SMS: Smartphone,
  IN_APP: Bell,
};

const COLORES_NIVEL = {
  VERDE: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', solid: '#10B981' },
  AMARILLO: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', solid: '#EAB308' },
  ROJO: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', solid: '#EF4444' },
  VENCIDO: { bg: 'bg-gray-900', text: 'text-white', border: 'border-gray-700', solid: '#1F2937' },
  GENERAL: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', solid: '#3B82F6' },
};

export function PlantillasMensajes() {
  const [plantillas, setPlantillas] = useState<PlantillaMensaje[]>(PLANTILLAS_DEFAULT);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<PlantillaMensaje | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [plantillaEditando, setPlantillaEditando] = useState<PlantillaMensaje | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<TipoCanal | 'TODOS'>('TODOS');
  const [filtroNivel, setFiltroNivel] = useState<NivelAlerta | 'TODOS'>('TODOS');
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [mostrarGuia, setMostrarGuia] = useState(false);

  // Filtrar plantillas
  const plantillasFiltradas = plantillas.filter(p => {
    const matchTipo = filtroTipo === 'TODOS' || p.tipo === filtroTipo;
    const matchNivel = filtroNivel === 'TODOS' || p.nivel === filtroNivel;
    return matchTipo && matchNivel;
  });

  const handleEditarPlantilla = (plantilla: PlantillaMensaje) => {
    setPlantillaEditando({ ...plantilla });
    setModoEdicion(true);
    setPlantillaSeleccionada(plantilla);
  };

  const handleGuardarPlantilla = () => {
    if (!plantillaEditando) return;

    // Validar que tenga contenido
    if (!plantillaEditando.cuerpo.trim()) {
      toast.error('❌ El cuerpo del mensaje no puede estar vacío');
      return;
    }

    if (plantillaEditando.tipo === 'EMAIL' && !plantillaEditando.asunto?.trim()) {
      toast.error('❌ El asunto del email no puede estar vacío');
      return;
    }

    setPlantillas(prev => prev.map(p => 
      p.id === plantillaEditando.id ? plantillaEditando : p
    ));
    
    setPlantillaSeleccionada(plantillaEditando);
    setModoEdicion(false);
    
    toast.success('✅ Plantilla guardada exitosamente', {
      description: 'Los cambios se aplicarán en las próximas notificaciones'
    });
  };

  const handleCancelarEdicion = () => {
    setModoEdicion(false);
    setPlantillaEditando(null);
  };

  const handleDuplicarPlantilla = (plantilla: PlantillaMensaje) => {
    const nuevaPlantilla: PlantillaMensaje = {
      ...plantilla,
      id: `${plantilla.id}-copia-${Date.now()}`,
      nombre: `${plantilla.nombre} (Copia)`,
      activa: false,
    };
    
    setPlantillas(prev => [...prev, nuevaPlantilla]);
    toast.success('✅ Plantilla duplicada', {
      description: 'Puedes editarla para personalizarla'
    });
  };

  const handleInsertarVariable = (variable: string) => {
    if (!plantillaEditando) return;
    
    const textarea = document.getElementById('editor-cuerpo') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = plantillaEditando.cuerpo.substring(0, start);
    const textAfter = plantillaEditando.cuerpo.substring(end);
    const newCuerpo = textBefore + variable + textAfter;

    setPlantillaEditando({
      ...plantillaEditando,
      cuerpo: newCuerpo,
    });

    // Mover cursor después de la variable insertada
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handleRestaurarDefecto = () => {
    if (confirm('¿Restaurar todas las plantillas a sus valores por defecto?\n\nSe perderán todos los cambios personalizados.')) {
      setPlantillas(PLANTILLAS_DEFAULT);
      setPlantillaSeleccionada(null);
      setModoEdicion(false);
      toast.info('🔄 Plantillas restauradas', {
        description: 'Se han aplicado las plantillas predeterminadas'
      });
    }
  };

  const generarVistaPrevia = (plantilla: PlantillaMensaje): string => {
    let texto = plantilla.cuerpo;
    
    // Reemplazar variables con ejemplos
    texto = texto.replace(/{modulo}/g, 'Defensa Judicial');
    texto = texto.replace(/{expediente}/g, '2024-001234');
    texto = texto.replace(/{responsable}/g, 'Juan Pérez García');
    texto = texto.replace(/{dias_restantes}/g, '5');
    texto = texto.replace(/{fecha_vencimiento}/g, '25/12/2024');
    texto = texto.replace(/{fecha_actual}/g, '20/12/2024');
    texto = texto.replace(/{prioridad}/g, 'ALTA');
    texto = texto.replace(/{institucion}/g, 'ESAP');
    
    return texto;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header con Filtros */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-orange-600" />
              Plantillas de Mensajes
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Personaliza los mensajes de notificación para cada canal y nivel de alerta
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestaurarDefecto}
              className="hover:bg-gray-100"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restaurar Defecto
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Canal:</span>
            {['TODOS', 'EMAIL', 'TEAMS', 'SMS', 'IN_APP'].map((tipo) => {
              const isActive = filtroTipo === tipo;
              const Icon = tipo !== 'TODOS' ? ICONOS_CANAL[tipo as TipoCanal] : null;
              
              return (
                <Button
                  key={tipo}
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltroTipo(tipo as any)}
                  className={`${isActive ? 'bg-orange-50 border-orange-300 text-orange-700' : ''}`}
                >
                  {Icon && <Icon className="w-3 h-3 mr-1" />}
                  {tipo === 'TODOS' ? 'Todos' : tipo === 'IN_APP' ? 'In-App' : tipo}
                </Button>
              );
            })}
          </div>

          <div className="h-6 w-px bg-gray-300" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Nivel:</span>
            {['TODOS', 'VERDE', 'AMARILLO', 'ROJO', 'VENCIDO'].map((nivel) => {
              const isActive = filtroNivel === nivel;
              const color = nivel !== 'TODOS' ? COLORES_NIVEL[nivel as NivelAlerta] : null;
              
              return (
                <Button
                  key={nivel}
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltroNivel(nivel as any)}
                  className={`${isActive && color ? `${color.bg} ${color.border} ${color.text}` : isActive ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
                >
                  {nivel === 'TODOS' ? 'Todos' : nivel}
                </Button>
              );
            })}
          </div>

          <div className="ml-auto text-sm text-gray-600">
            {plantillasFiltradas.length} de {plantillas.length} plantillas
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-12 gap-6 p-6 h-full">
          {/* Lista de Plantillas */}
          <div className="col-span-12 lg:col-span-5 xl:col-span-4">
            <Card className="h-full flex flex-col bg-white shadow-lg">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Code className="w-4 h-4 text-orange-600" />
                  Plantillas Disponibles
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                <AnimatePresence>
                  {plantillasFiltradas.map((plantilla, idx) => {
                    const IconoCanal = ICONOS_CANAL[plantilla.tipo];
                    const colorNivel = COLORES_NIVEL[plantilla.nivel];
                    const isSelected = plantillaSeleccionada?.id === plantilla.id;
                    
                    return (
                      <motion.div
                        key={plantilla.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.03 }}
                      >
                        <button
                          onClick={() => {
                            setPlantillaSeleccionada(plantilla);
                            setModoEdicion(false);
                          }}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'bg-orange-50 border-orange-400 shadow-md'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <IconoCanal className="w-4 h-4 text-orange-600" />
                              <span className="font-semibold text-sm text-gray-900">
                                {plantilla.nombre}
                              </span>
                            </div>
                            {plantilla.activa ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                <Check className="w-3 h-3 mr-1" />
                                Activa
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600 text-xs">
                                Inactiva
                              </Badge>
                            )}
                          </div>
                          
                          <Badge className={`text-xs ${colorNivel.bg} ${colorNivel.text} ${colorNivel.border}`}>
                            {plantilla.nivel}
                          </Badge>
                          
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                            {plantilla.asunto || plantilla.cuerpo.substring(0, 80)}...
                          </p>
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </Card>
          </div>

          {/* Editor / Vista Previa */}
          <div className="col-span-12 lg:col-span-7 xl:col-span-8">
            <AnimatePresence mode="wait">
              {plantillaSeleccionada ? (
                <motion.div
                  key={plantillaSeleccionada.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-full"
                >
                  <Card className="h-full flex flex-col bg-white shadow-lg">
                    {/* Header del Editor */}
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {React.createElement(ICONOS_CANAL[plantillaSeleccionada.tipo], {
                            className: 'w-5 h-5 text-orange-600'
                          })}
                          <div>
                            <h3 className="font-bold text-gray-900">
                              {modoEdicion ? 'Editando' : 'Visualizando'}: {plantillaSeleccionada.nombre}
                            </h3>
                            <p className="text-xs text-gray-600">
                              Canal: {plantillaSeleccionada.tipo} • Nivel: {plantillaSeleccionada.nivel}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!modoEdicion ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDuplicarPlantilla(plantillaSeleccionada)}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMostrarGuia(!mostrarGuia)}
                                className={mostrarGuia ? 'bg-purple-50 border-purple-300' : ''}
                              >
                                <HelpCircle className="w-4 h-4 mr-2" />
                                Guía
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setVistaPrevia(!vistaPrevia)}
                                className={vistaPrevia ? 'bg-blue-50 border-blue-300' : ''}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                {vistaPrevia ? 'Ocultar' : 'Vista'} Previa
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleEditarPlantilla(plantillaSeleccionada)}
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Editar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelarEdicion}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleGuardarPlantilla}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Save className="w-4 h-4 mr-2" />
                                Guardar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contenido del Editor */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                      {modoEdicion && plantillaEditando ? (
                        <>
                          {/* Editor de Asunto (solo EMAIL) */}
                          {plantillaEditando.tipo === 'EMAIL' && (
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                Asunto del Email
                              </label>
                              <input
                                type="text"
                                value={plantillaEditando.asunto || ''}
                                onChange={(e) => setPlantillaEditando({
                                  ...plantillaEditando,
                                  asunto: e.target.value
                                })}
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Ej: ⚠ {modulo} - PRECAUCIÓN: Quedan {dias_restantes} días"
                              />
                            </div>
                          )}

                          {/* Editor de Cuerpo */}
                          <div className="flex-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              Cuerpo del Mensaje
                            </label>
                            <textarea
                              id="editor-cuerpo"
                              value={plantillaEditando.cuerpo}
                              onChange={(e) => setPlantillaEditando({
                                ...plantillaEditando,
                                cuerpo: e.target.value
                              })}
                              className="w-full h-64 px-4 py-3 border-2 border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                              placeholder="Escribe el mensaje aquí. Usa {variables} para contenido dinámico..."
                            />
                          </div>

                          {/* Variables Disponibles */}
                          <Card className="bg-blue-50 border-blue-200 p-4">
                            <h4 className="font-bold text-sm text-blue-900 mb-3 flex items-center gap-2">
                              <Code className="w-4 h-4" />
                              Variables Disponibles (click para insertar)
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {VARIABLES_DISPONIBLES.map((v) => {
                                const Icono = v.icono;
                                return (
                                  <button
                                    key={v.variable}
                                    onClick={() => handleInsertarVariable(v.variable)}
                                    className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                                  >
                                    <Icono className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <code className="text-xs font-bold text-blue-900 block truncate">
                                        {v.variable}
                                      </code>
                                      <p className="text-xs text-blue-700 truncate">{v.descripcion}</p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </Card>
                        </>
                      ) : (
                        <>
                          {/* Vista de Solo Lectura */}
                          {plantillaSeleccionada.tipo === 'EMAIL' && (
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                Asunto
                              </label>
                              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-900">{plantillaSeleccionada.asunto}</p>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              Cuerpo del Mensaje
                            </label>
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <pre className="text-sm text-gray-900 whitespace-pre-wrap font-sans">
                                {plantillaSeleccionada.cuerpo}
                              </pre>
                            </div>
                          </div>

                          {/* Vista Previa con datos de ejemplo */}
                          <AnimatePresence>
                            {vistaPrevia && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                              >
                                <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200 p-4">
                                  <h4 className="font-bold text-sm text-green-900 mb-3 flex items-center gap-2">
                                    <Eye className="w-4 h-4" />
                                    Vista Previa con Datos de Ejemplo
                                  </h4>
                                  
                                  {plantillaSeleccionada.tipo === 'EMAIL' && plantillaSeleccionada.asunto && (
                                    <div className="mb-3">
                                      <span className="text-xs font-bold text-green-800">ASUNTO:</span>
                                      <p className="text-sm font-bold text-gray-900 mt-1">
                                        {generarVistaPrevia({ ...plantillaSeleccionada, cuerpo: plantillaSeleccionada.asunto })}
                                      </p>
                                    </div>
                                  )}
                                  
                                  <div className="p-4 bg-white rounded-lg border border-green-300">
                                    <pre className="text-sm text-gray-900 whitespace-pre-wrap font-sans">
                                      {generarVistaPrevia(plantillaSeleccionada)}
                                    </pre>
                                  </div>
                                  
                                  <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    Los valores reales se insertarán automáticamente al enviar las notificaciones
                                  </p>
                                </Card>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Info de Variables Usadas */}
                          <Card className="bg-gray-50 border-gray-200 p-4">
                            <h4 className="font-bold text-sm text-gray-900 mb-2">
                              Variables utilizadas en esta plantilla:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {plantillaSeleccionada.variables.map((v) => (
                                <Badge key={v} className="bg-white text-gray-700 border-gray-300">
                                  <Code className="w-3 h-3 mr-1" />
                                  {`{${v}}`}
                                </Badge>
                              ))}
                            </div>
                          </Card>

                          {/* Guía de Buenas Prácticas */}
                          <AnimatePresence>
                            {mostrarGuia && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                              >
                                <GuiaPlantillas canal={plantillaSeleccionada.tipo} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full"
                >
                  <Card className="h-full flex items-center justify-center bg-white shadow-lg">
                    <div className="text-center p-12">
                      <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                      <h3 className="font-bold text-xl text-gray-900 mb-2">
                        Selecciona una Plantilla
                      </h3>
                      <p className="text-sm text-gray-600">
                        Elige una plantilla de la lista para visualizarla o editarla
                      </p>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
