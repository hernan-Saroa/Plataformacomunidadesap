/**
 * ============================================
 * MODAL NUEVA ÁREA AUDITABLE - WORLD CLASS
 * ============================================
 * 
 * Modal estandarizado para crear nuevas áreas auditables
 * Usa ModalWorldClass como base
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Enero 2025
 */

import { useState } from 'react';
import { Plus, Link2, Save } from 'lucide-react';
import { ModalWorldClass } from './ModalWorldClass';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

export type TipoArea = 'Sede' | 'Territorial';
export type CriticidadNivel = 5 | 3 | 1;
export type ExposicionNivel = 5 | 3 | 1;

export interface AreaAuditable {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoArea;
  descripcion: string;
  responsable: string;
  criticidad: CriticidadNivel;
  factorExposicion: ExposicionNivel;
  factoresMitigantes: number;
  nivelRiesgo: string;
  scoreRiesgo: number;
  estado: 'seleccionada' | 'pendiente' | 'no-aplica';
  numeroAuditorias: number;
}

interface UnidadOrganizacional {
  id: string;
  codigo: string;
  nombre: string;
  nombreCorto: string;
  ciudadPrincipal: string;
  departamentos: string[];
  totalCetap: number;
}

interface ModalNuevaAreaWorldClassProps {
  open: boolean;
  onClose: () => void;
  onGuardar: (nuevaArea: AreaAuditable) => void;
  ultimoCodigo: number;
  unidadesOrganizacionales: UnidadOrganizacional[];
}

// ============ UTILIDADES ============

const calcularRiesgo = (criticidad: CriticidadNivel, exposicion: ExposicionNivel, mitigantes: number) => {
  const score = Math.round((criticidad * exposicion) / mitigantes * 10) / 10;
  
  let nivel = 'Crítico';
  if (score >= 9) nivel = 'Crítico';
  else if (score >= 5) nivel = 'Alto';
  else if (score >= 2) nivel = 'Medio';
  else nivel = 'Bajo';
  
  return { nivel, score };
};

const getRiesgoColor = (nivel: string) => {
  const colores = {
    'Crítico': '#DC2626',
    'Alto': '#F97316',
    'Medio': '#EAB308',
    'Bajo': '#10B981'
  };
  return colores[nivel as keyof typeof colores] || '#6B7280';
};

// ============ COMPONENTE PRINCIPAL ============

export function ModalNuevaAreaWorldClass({
  open,
  onClose,
  onGuardar,
  ultimoCodigo,
  unidadesOrganizacionales
}: ModalNuevaAreaWorldClassProps) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoArea>('Sede');
  const [descripcion, setDescripcion] = useState('');
  const [responsable, setResponsable] = useState('');
  const [criticidad, setCriticidad] = useState<CriticidadNivel>(5);
  const [exposicion, setExposicion] = useState<ExposicionNivel>(5);
  const [mitigantes, setMitigantes] = useState(2);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState('');

  // Manejar selección de unidad organizacional
  const handleSeleccionarUnidad = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const unidadId = e.target.value;
    setUnidadSeleccionada(unidadId);
    
    const unidad = unidadesOrganizacionales.find(t => t.id === unidadId);
    if (unidad) {
      setNombre(unidad.nombre);
      setTipo(unidad.codigo === 'ESAP-CENTRAL' ? 'Sede' : 'Territorial');
      setDescripcion(`Dirección ${unidad.nombre} - ${unidad.departamentos.join(', ')}`);
      setResponsable(`Director ${unidad.nombreCorto}`);
    }
  };

  const handleGuardar = () => {
    if (!nombre.trim() || !descripcion.trim() || !responsable.trim()) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    const { nivel, score } = calcularRiesgo(criticidad, exposicion, mitigantes);
    const nuevoCodigo = `SEDE-${ultimoCodigo + 1}`;
    
    const nuevaArea: AreaAuditable = {
      id: `area-${ultimoCodigo + 1}`,
      codigo: nuevoCodigo,
      nombre,
      tipo,
      descripcion,
      responsable,
      criticidad,
      factorExposicion: exposicion,
      factoresMitigantes: mitigantes,
      nivelRiesgo: nivel,
      scoreRiesgo: score,
      estado: 'pendiente',
      numeroAuditorias: 0
    };

    onGuardar(nuevaArea);
    toast.success('Área auditable creada exitosamente');
    
    // Resetear formulario
    setNombre('');
    setTipo('Sede');
    setDescripcion('');
    setResponsable('');
    setCriticidad(5);
    setExposicion(5);
    setMitigantes(2);
    setUnidadSeleccionada('');
  };

  // Calcular vista previa del riesgo
  const riesgoActual = calcularRiesgo(criticidad, exposicion, mitigantes);

  // Footer con botones
  const footer = (
    <div className="flex justify-end gap-3">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Cancelar
      </button>
      <button
        onClick={handleGuardar}
        disabled={!nombre.trim() || !descripcion.trim() || !responsable.trim()}
        className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#003DA5' }}
      >
        <div className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          Crear Área
        </div>
      </button>
    </div>
  );

  return (
    <ModalWorldClass
      isOpen={open}
      onClose={onClose}
      titulo="Nueva Área Auditable"
      icono={<Plus className="w-6 h-6" />}
      size="lg"
      footer={footer}
    >
      <div className="space-y-6">
        {/* SELECTOR DE ESTRUCTURA ORGANIZACIONAL */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2" style={{ borderColor: '#003DA5' }}>
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-5 h-5" style={{ color: '#003DA5' }} />
            <h4 className="font-bold text-gray-900">Importar desde Estructura Organizacional</h4>
            <Badge style={{ background: '#003DA5', color: 'white' }} className="text-xs">
              {unidadesOrganizacionales.length} Unidades
            </Badge>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Selecciona una unidad organizacional existente para auto-completar los datos
          </p>
          <select
            value={unidadSeleccionada}
            onChange={handleSeleccionarUnidad}
            className="w-full px-3 py-2 border-2 rounded-lg text-sm transition-colors"
            style={{ borderColor: unidadSeleccionada ? '#003DA5' : '#D1D5DB' }}
          >
            <option value="">➕ Crear área personalizada (sin vincular)</option>
            <optgroup label="🏛️ SEDE CENTRAL (1)">
              {unidadesOrganizacionales.filter(t => t.codigo === 'ESAP-CENTRAL').map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre} - {t.ciudadPrincipal} ({t.totalCetap} CETAP)
                </option>
              ))}
            </optgroup>
            <optgroup label="📍 TERRITORIALES (17)">
              {unidadesOrganizacionales.filter(t => t.codigo !== 'ESAP-CENTRAL').map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre} - {t.ciudadPrincipal} ({t.totalCetap} CETAP)
                </option>
              ))}
            </optgroup>
          </select>
          {unidadSeleccionada && (
            <div className="mt-3 p-2 bg-white rounded border" style={{ borderColor: '#003DA5' }}>
              <p className="text-xs font-bold" style={{ color: '#003DA5' }}>
                ✓ Unidad vinculada - Datos auto-completados
              </p>
            </div>
          )}
        </div>

        {/* CAMPOS BÁSICOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Nombre <span className="text-red-500">*</span>
            </label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del área"
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Tipo <span className="text-red-500">*</span>
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoArea)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Sede">Sede</option>
              <option value="Territorial">Territorial</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Descripción <span className="text-red-500">*</span>
          </label>
          <Input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción del área"
            className="text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Responsable <span className="text-red-500">*</span>
          </label>
          <Input
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
            placeholder="Responsable del área"
            className="text-sm"
          />
        </div>

        {/* MATRIZ DE RIESGO DAFP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-orange-200">
            <p className="text-sm font-bold text-gray-700 mb-2">📊 Criticidad (Impacto)</p>
            <ul className="text-xs text-gray-600 space-y-1 mb-3">
              <li><strong>Alta (5):</strong> Crítico/Financiero</li>
              <li><strong>Media (3):</strong> Apoyo importante</li>
              <li><strong>Baja (1):</strong> Secundario</li>
            </ul>
            <select
              value={criticidad}
              onChange={(e) => setCriticidad(Number(e.target.value) as CriticidadNivel)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>Alta (5) - Crítico/Financiero</option>
              <option value={3}>Media (3) - Apoyo importante</option>
              <option value={1}>Baja (1) - Secundario</option>
            </select>
          </div>

          <div className="bg-white p-4 rounded-lg border border-orange-200">
            <p className="text-sm font-bold text-gray-700 mb-2">👥 Factor Exposición</p>
            <ul className="text-xs text-gray-600 space-y-1 mb-3">
              <li><strong>Alta (5):</strong> &gt;100 personas</li>
              <li><strong>Media (3):</strong> 50-100 personas</li>
              <li><strong>Baja (1):</strong> &lt;50 personas</li>
            </ul>
            <select
              value={exposicion}
              onChange={(e) => setExposicion(Number(e.target.value) as ExposicionNivel)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>Alta (5) - &gt;100 personas</option>
              <option value={3}>Media (3) - 50-100 personas</option>
              <option value={1}>Baja (1) - &lt;50 personas</option>
            </select>
          </div>

          <div className="bg-white p-4 rounded-lg border border-orange-200">
            <p className="text-sm font-bold text-gray-700 mb-2">🛡️ Factores Mitigantes</p>
            <ul className="text-xs text-gray-600 space-y-1 mb-3">
              <li><strong>1-10:</strong> Controles existentes</li>
              <li>Mayor valor = Más controles</li>
              <li>Más controles = Menor riesgo</li>
            </ul>
            <Input
              type="number"
              value={mitigantes}
              onChange={(e) => setMitigantes(Number(e.target.value))}
              min={1}
              max={10}
              className="text-sm"
              placeholder="Controles existentes"
            />
            <p className="text-xs text-gray-500 mt-2">Mayor valor = menos riesgo</p>
          </div>
        </div>

        {/* VISTA PREVIA DEL CÁLCULO DAFP */}
        <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border-2 border-orange-300">
          <p className="text-sm font-bold text-gray-700 mb-2">Vista Previa - Score DAFP:</p>
          <div className="flex items-center gap-3 flex-wrap">
            <code 
              className="text-2xl font-black" 
              style={{ color: getRiesgoColor(riesgoActual.nivel) }}
            >
              {riesgoActual.score}
            </code>
            <Badge 
              style={{ 
                background: getRiesgoColor(riesgoActual.nivel),
                color: 'white'
              }}
              className="text-sm px-3 py-1"
            >
              {riesgoActual.nivel}
            </Badge>
            <p className="text-xs text-gray-600 ml-auto">
              ({criticidad} × {exposicion}) ÷ {mitigantes} = {riesgoActual.score}
            </p>
          </div>
        </div>
      </div>
    </ModalWorldClass>
  );
}
