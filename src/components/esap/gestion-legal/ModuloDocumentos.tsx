/**
 * MÓDULO DE GENERACIÓN DE DOCUMENTOS
 * Sistema de plantillas legales para autos y fallos
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText, Download, Eye, Settings, ChevronRight, Scale,
  CheckCircle, AlertCircle, FileCheck, Gavel, ClipboardList
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { toast } from 'sonner@2.0.3';

type TipoDocumento = 
  | 'auto-avocamiento'
  | 'auto-pruebas'
  | 'fallo-absolutorio'
  | 'fallo-sancionatorio'
  | 'constancia-notificacion';

type TipoSancion = 
  | 'amonestacion'
  | 'multa'
  | 'suspension'
  | 'destitucion'
  | 'inhabilidad';

interface PlantillaDocumento {
  id: TipoDocumento;
  nombre: string;
  descripcion: string;
  icono: React.ReactNode;
  color: string;
  articulos: string;
}

const PLANTILLAS: PlantillaDocumento[] = [
  {
    id: 'auto-avocamiento',
    nombre: 'Auto que Define Procedimiento',
    descripcion: 'Auto de avocamiento y traslado para descargos (10 días)',
    icono: <FileText className="w-6 h-6" />,
    color: '#6366F1',
    articulos: 'Arts. 219-221 Ley 1952/2019'
  },
  {
    id: 'auto-pruebas',
    nombre: 'Auto de Decreto de Pruebas',
    descripcion: 'Decreto y práctica de pruebas solicitadas',
    icono: <ClipboardList className="w-6 h-6" />,
    color: '#8B5CF6'
  },
  {
    id: 'fallo-absolutorio',
    nombre: 'Fallo Absolutorio',
    descripcion: 'Decisión de primera instancia - Sin responsabilidad',
    icono: <CheckCircle className="w-6 h-6" />,
    color: '#10B981',
    articulos: 'Arts. 234-240 Ley 1952/2019'
  },
  {
    id: 'fallo-sancionatorio',
    nombre: 'Fallo Sancionatorio',
    descripcion: 'Decisión de primera instancia - Con sanción',
    icono: <Gavel className="w-6 h-6" />,
    color: '#DC2626',
    articulos: 'Arts. 234-240, 44-52 Ley 1952/2019'
  },
  {
    id: 'constancia-notificacion',
    nombre: 'Constancia de Notificación',
    descripcion: 'Registro de notificación personal o por aviso',
    icono: <FileCheck className="w-6 h-6" />,
    color: '#0284C7',
    articulos: 'Arts. 57-62 Ley 1952/2019'
  }
];

const SANCIONES = [
  { id: 'amonestacion', nombre: 'Amonestación Escrita', color: '#FFC107', gravedad: 'Leve' },
  { id: 'multa', nombre: 'Multa', color: '#FD7E14', gravedad: 'Leve a Media', rango: '10-180 días salario' },
  { id: 'suspension', nombre: 'Suspensión', color: '#E74C3C', gravedad: 'Media a Grave', rango: '1-12 meses' },
  { id: 'destitucion', nombre: 'Destitución', color: '#C0392B', gravedad: 'Gravísima' },
  { id: 'inhabilidad', nombre: 'Inhabilidad', color: '#2C3E50', gravedad: 'Gravísima', rango: '10-20 años' }
];

export function ModuloDocumentos() {
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<TipoDocumento | null>(null);
  const [paso, setPaso] = useState(1);

  // Datos del formulario
  const [expediente, setExpediente] = useState('');
  const [investigado, setInvestigado] = useState('');
  const [sancionSeleccionada, setSancionSeleccionada] = useState<TipoSancion | null>(null);
  const [diasMulta, setDiasMulta] = useState('');
  const [mesesSuspension, setMesesSuspension] = useState('');
  const [aniosInhabilidad, setAniosInhabilidad] = useState('');

  // Factores de graduación
  const [atenuantes, setAtenuantes] = useState<string[]>([]);
  const [agravantes, setAgravantes] = useState<string[]>([]);

  const ATENUANTES = [
    'Sin antecedentes disciplinarios',
    'Buen rendimiento laboral',
    'Confesión voluntaria',
    'Reparación del daño'
  ];

  const AGRAVANTES = [
    'Reincidencia',
    'Posición directiva',
    'Premeditación',
    'Abuso de vulnerabilidad'
  ];

  const handleSeleccionarPlantilla = (tipo: TipoDocumento) => {
    setPlantillaSeleccionada(tipo);
    setPaso(2);
  };

  const handleGenerarDocumento = () => {
    toast.success('Documento generado correctamente', {
      description: 'El documento está listo para descargar',
      duration: 3000
    });
    
    // Simular descarga
    setTimeout(() => {
      toast.info('Descargando documento PDF...');
    }, 500);
  };

  const toggleAtenuante = (atenuante: string) => {
    setAtenuantes(prev =>
      prev.includes(atenuante)
        ? prev.filter(a => a !== atenuante)
        : [...prev, atenuante]
    );
  };

  const toggleAgravante = (agravante: string) => {
    setAgravantes(prev =>
      prev.includes(agravante)
        ? prev.filter(a => a !== agravante)
        : [...prev, agravante]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#6F42C1' }}>
          Generación de Documentos
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Sistema de plantillas legales para autos y fallos disciplinarios
        </p>
      </div>

      {/* Pasos */}
      <Card className="p-4 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${paso >= 1 ? 'opacity-100' : 'opacity-40'}`}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                background: paso >= 1 ? '#6F42C1' : '#E5E7EB',
                color: paso >= 1 ? '#FFFFFF' : '#9CA3AF'
              }}
            >
              1
            </div>
            <span className="text-sm font-medium" style={{ color: paso >= 1 ? '#1F2937' : '#9CA3AF' }}>
              Seleccionar Plantilla
            </span>
          </div>
          <ChevronRight className="w-5 h-5" style={{ color: '#D1D5DB' }} />
          <div className={`flex items-center gap-2 ${paso >= 2 ? 'opacity-100' : 'opacity-40'}`}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                background: paso >= 2 ? '#6F42C1' : '#E5E7EB',
                color: paso >= 2 ? '#FFFFFF' : '#9CA3AF'
              }}
            >
              2
            </div>
            <span className="text-sm font-medium" style={{ color: paso >= 2 ? '#1F2937' : '#9CA3AF' }}>
              Configurar Documento
            </span>
          </div>
          <ChevronRight className="w-5 h-5" style={{ color: '#D1D5DB' }} />
          <div className={`flex items-center gap-2 ${paso >= 3 ? 'opacity-100' : 'opacity-40'}`}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                background: paso >= 3 ? '#6F42C1' : '#E5E7EB',
                color: paso >= 3 ? '#FFFFFF' : '#9CA3AF'
              }}
            >
              3
            </div>
            <span className="text-sm font-medium" style={{ color: paso >= 3 ? '#1F2937' : '#9CA3AF' }}>
              Generar y Descargar
            </span>
          </div>
        </div>
      </Card>

      {/* PASO 1: Selección de Plantilla */}
      {paso === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLANTILLAS.map((plantilla, index) => (
            <motion.div
              key={plantilla.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card
                className="p-5 border-2 hover:shadow-lg transition-all cursor-pointer"
                style={{
                  borderColor: plantillaSeleccionada === plantilla.id ? plantilla.color : '#E5E7EB'
                }}
                onClick={() => handleSeleccionarPlantilla(plantilla.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: `${plantilla.color}20` }}
                  >
                    <div style={{ color: plantilla.color }}>
                      {plantilla.icono}
                    </div>
                  </div>
                  {plantilla.articulos && (
                    <Badge className="text-xs" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                      {plantilla.articulos}
                    </Badge>
                  )}
                </div>
                <h3 className="font-bold mb-2" style={{ color: '#1F2937' }}>
                  {plantilla.nombre}
                </h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {plantilla.descripcion}
                </p>
                <Button
                  className="w-full mt-4"
                  style={{
                    background: plantilla.color,
                    color: '#FFFFFF'
                  }}
                >
                  Usar Plantilla
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* PASO 2: Configuración del Documento */}
      {paso === 2 && plantillaSeleccionada && (
        <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="space-y-6">
            {/* Info Plantilla Seleccionada */}
            <div className="flex items-center gap-4 p-4 rounded-lg" style={{ background: '#F3E8FF' }}>
              <div className="p-3 rounded-xl" style={{ background: '#6F42C1' }}>
                <FileText className="w-6 h-6" style={{ color: '#FFFFFF' }} />
              </div>
              <div>
                <p className="font-bold" style={{ color: '#6F42C1' }}>
                  {PLANTILLAS.find(p => p.id === plantillaSeleccionada)?.nombre}
                </p>
                <p className="text-sm" style={{ color: '#7C3AED' }}>
                  {PLANTILLAS.find(p => p.id === plantillaSeleccionada)?.descripcion}
                </p>
              </div>
            </div>

            {/* Datos Básicos */}
            <div>
              <h4 className="font-bold mb-4" style={{ color: '#1F2937' }}>
                Datos del Expediente
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-bold mb-2" style={{ color: '#4B5563' }}>
                    Número de Expediente *
                  </Label>
                  <Input
                    placeholder="PD-2025-XXXX"
                    value={expediente}
                    onChange={(e) => setExpediente(e.target.value)}
                    className="border-2"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                </div>
                <div>
                  <Label className="text-sm font-bold mb-2" style={{ color: '#4B5563' }}>
                    Nombre del Investigado *
                  </Label>
                  <Input
                    placeholder="Nombre completo"
                    value={investigado}
                    onChange={(e) => setInvestigado(e.target.value)}
                    className="border-2"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                </div>
              </div>
            </div>

            {/* Configuración específica para Fallo Sancionatorio */}
            {plantillaSeleccionada === 'fallo-sancionatorio' && (
              <>
                {/* Selección de Sanción */}
                <div>
                  <h4 className="font-bold mb-4" style={{ color: '#1F2937' }}>
                    Sanción a Imponer
                  </h4>
                  <div className="space-y-3">
                    {SANCIONES.map((sancion) => (
                      <div
                        key={sancion.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          sancionSeleccionada === sancion.id ? 'ring-2' : ''
                        }`}
                        style={{
                          borderColor: sancionSeleccionada === sancion.id ? sancion.color : '#E5E7EB',
                          ringColor: sancion.color
                        }}
                        onClick={() => setSancionSeleccionada(sancion.id as TipoSancion)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ background: sancion.color }}
                            />
                            <div>
                              <p className="font-bold text-sm" style={{ color: '#1F2937' }}>
                                {sancion.nombre}
                              </p>
                              <p className="text-xs" style={{ color: '#6B7280' }}>
                                Gravedad: {sancion.gravedad}
                                {sancion.rango && ` • ${sancion.rango}`}
                              </p>
                            </div>
                          </div>
                          {sancionSeleccionada === sancion.id && (
                            <CheckCircle className="w-5 h-5" style={{ color: sancion.color }} />
                          )}
                        </div>

                        {/* Campos específicos por sanción */}
                        {sancionSeleccionada === sancion.id && (
                          <div className="mt-3 pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
                            {sancion.id === 'multa' && (
                              <div>
                                <Label className="text-sm font-bold mb-2">
                                  Cantidad de días de salario
                                </Label>
                                <Input
                                  type="number"
                                  placeholder="10-180"
                                  value={diasMulta}
                                  onChange={(e) => setDiasMulta(e.target.value)}
                                  className="border-2"
                                  style={{ borderColor: '#E5E7EB' }}
                                />
                              </div>
                            )}
                            {sancion.id === 'suspension' && (
                              <div>
                                <Label className="text-sm font-bold mb-2">
                                  Meses de suspensión
                                </Label>
                                <Input
                                  type="number"
                                  placeholder="1-12"
                                  value={mesesSuspension}
                                  onChange={(e) => setMesesSuspension(e.target.value)}
                                  className="border-2"
                                  style={{ borderColor: '#E5E7EB' }}
                                />
                              </div>
                            )}
                            {sancion.id === 'inhabilidad' && (
                              <div>
                                <Label className="text-sm font-bold mb-2">
                                  Años de inhabilidad
                                </Label>
                                <Input
                                  type="number"
                                  placeholder="10-20"
                                  value={aniosInhabilidad}
                                  onChange={(e) => setAniosInhabilidad(e.target.value)}
                                  className="border-2"
                                  style={{ borderColor: '#E5E7EB' }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Factores de Graduación */}
                <div>
                  <h4 className="font-bold mb-4" style={{ color: '#1F2937' }}>
                    Factores de Graduación de la Sanción
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Atenuantes */}
                    <div>
                      <p className="text-sm font-bold mb-2" style={{ color: '#10B981' }}>
                        ✓ Atenuantes (Reducen sanción)
                      </p>
                      <div className="space-y-2">
                        {ATENUANTES.map((atenuante) => (
                          <label
                            key={atenuante}
                            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-green-50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={atenuantes.includes(atenuante)}
                              onChange={() => toggleAtenuante(atenuante)}
                              className="w-4 h-4"
                              style={{ accentColor: '#10B981' }}
                            />
                            <span className="text-sm" style={{ color: '#4B5563' }}>
                              {atenuante}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Agravantes */}
                    <div>
                      <p className="text-sm font-bold mb-2" style={{ color: '#DC2626' }}>
                        ⚠️ Agravantes (Aumentan sanción)
                      </p>
                      <div className="space-y-2">
                        {AGRAVANTES.map((agravante) => (
                          <label
                            key={agravante}
                            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={agravantes.includes(agravante)}
                              onChange={() => toggleAgravante(agravante)}
                              className="w-4 h-4"
                              style={{ accentColor: '#DC2626' }}
                            />
                            <span className="text-sm" style={{ color: '#4B5563' }}>
                              {agravante}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Botones */}
            <div className="flex items-center justify-between pt-4 border-t-2" style={{ borderColor: '#E5E7EB' }}>
              <Button
                variant="outline"
                onClick={() => {
                  setPaso(1);
                  setPlantillaSeleccionada(null);
                }}
                className="border-2"
                style={{ borderColor: '#E5E7EB' }}
              >
                ← Volver
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="border-2"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Vista Previa
                </Button>
                <Button
                  onClick={handleGenerarDocumento}
                  className="font-bold"
                  style={{ background: '#6F42C1', color: '#FFFFFF' }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Generar Documento
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Info Adicional */}
      <Card className="p-4 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg" style={{ background: '#E0F2FE' }}>
            <AlertCircle className="w-5 h-5" style={{ color: '#0284C7' }} />
          </div>
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: '#1F2937' }}>
              💡 Sobre las Plantillas Legales
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Todas las plantillas están basadas en la <strong>Ley 1952 de 2019</strong> (Código General Disciplinario). 
              Los documentos generados incluyen automáticamente los artículos legales correspondientes y pueden ser 
              personalizados según las necesidades de cada caso.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
