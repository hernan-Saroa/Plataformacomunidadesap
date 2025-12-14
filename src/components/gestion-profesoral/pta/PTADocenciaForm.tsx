/**
 * COMPONENTE: Formulario de Docencia con Motor de Cálculo
 * Usa el motor de cálculo de horas automáticamente
 */

import { useState } from 'react';
import { Plus, Calculator, Info, X, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { calcularHoras, type TipoPrograma, type AsignaturaInfo, TABLA_HORAS_POR_PROGRAMA } from '../../../lib/pta/calculoHoras';
import type { PTADocencia } from '../../../types/gestion-profesoral';
import { TextWithTooltip, BadgeWithTooltip, PTATooltip } from './PTATooltips';

interface PTADocenciaFormProps {
  docencias: PTADocencia[];
  onAgregar: (data: any) => void;
  onEliminar: (id: number) => void;
  bloqueado?: boolean;
  className?: string;
}

const ASIGNATURAS_MOCK = [
  { id: 1, nombre: 'Gestión Pública I', programa: 'AP', creditos: 3 },
  { id: 2, nombre: 'Administración Pública', programa: 'AP', creditos: 3 },
  { id: 3, nombre: 'Políticas Públicas', programa: 'AP', creditos: 4 },
  { id: 4, nombre: 'Economía Pública', programa: 'ECONOMIA_PUB', creditos: 3 },
  { id: 5, nombre: 'Seminario De Énfasis', programa: 'AP', creditos: 4 },
  { id: 6, nombre: 'Opciones De Grado AP', programa: 'AP', creditos: 2 },
  { id: 7, nombre: 'Teoría del Estado', programa: 'Maestría', creditos: 3 },
  { id: 8, nombre: 'Desarrollo Territorial', programa: 'APT', creditos: 3 },
];

const TERRITORIALES_MOCK = [
  { id: 1, nombre: 'Bogotá - Sede Central' },
  { id: 2, nombre: 'Antioquia' },
  { id: 3, nombre: 'Valle del Cauca' },
  { id: 4, nombre: 'Atlántico' },
  { id: 5, nombre: 'Santander' },
];

export function PTADocenciaForm({ 
  docencias, 
  onAgregar, 
  onEliminar,
  bloqueado = false,
  className = '' 
}: PTADocenciaFormProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState<number | null>(null);
  const [territorial, setTerritorial] = useState<number | null>(null);
  const [periodo, setPeriodo] = useState('2025-1');
  const [numeroGrupos, setNumeroGrupos] = useState(1);
  const [preview, setPreview] = useState<ReturnType<typeof calcularHoras> | null>(null);

  // Calcular preview cuando cambian los datos
  const actualizarPreview = (asigId: number, grupos: number) => {
    const asignatura = ASIGNATURAS_MOCK.find(a => a.id === asigId);
    if (!asignatura) {
      setPreview(null);
      return;
    }

    const info: AsignaturaInfo = {
      nombre: asignatura.nombre,
      tipoPrograma: asignatura.programa as TipoPrograma,
      creditos: asignatura.creditos,
      numeroGrupos: grupos
    };

    const calculo = calcularHoras(info);
    setPreview(calculo);
  };

  const handleAsignaturaChange = (value: string) => {
    const id = parseInt(value);
    setAsignaturaSeleccionada(id);
    actualizarPreview(id, numeroGrupos);
  };

  const handleGruposChange = (value: string) => {
    const grupos = parseInt(value) || 1;
    setNumeroGrupos(grupos);
    if (asignaturaSeleccionada) {
      actualizarPreview(asignaturaSeleccionada, grupos);
    }
  };

  const handleAgregar = () => {
    if (!asignaturaSeleccionada || !territorial || !preview) return;

    const asignatura = ASIGNATURAS_MOCK.find(a => a.id === asignaturaSeleccionada);
    if (!asignatura) return;

    onAgregar({
      nombre: asignatura.nombre,
      tipoPrograma: asignatura.programa,
      creditos: asignatura.creditos,
      numeroGrupos,
      territorial_id: territorial,
      asignatura_id: asignaturaSeleccionada,
      periodo
    });

    // Reset form
    setAsignaturaSeleccionada(null);
    setTerritorial(null);
    setNumeroGrupos(1);
    setPreview(null);
    setMostrarFormulario(false);
  };

  const totalHoras = docencias.reduce((sum, d) => sum + d.horas_totales, 0);
  const tieneAsignatura3Creditos = docencias.some(d => d.creditos >= 3);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <TextWithTooltip tooltipId="componente-docencia" className="font-semibold text-lg">
            🔵 Docencia
          </TextWithTooltip>
          <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
            Sin tope máximo • 
            <TextWithTooltip tooltipId="docencia-sagrada" className="text-xs">
              Nunca se prorratea (SAGRADA)
            </TextWithTooltip>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {totalHoras.toFixed(0)}h totales
          </Badge>
          <Button
            size="sm"
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            disabled={bloqueado}
          >
            <Plus className="w-4 h-4 mr-1" />
            Agregar Asignatura
          </Button>
        </div>
      </div>

      {/* Pre-requisito Alert */}
      {!tieneAsignatura3Creditos && docencias.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <AlertDescription className="text-yellow-700">
                <div className="flex items-center gap-2">
                  <strong>Pre-requisito:</strong>
                  <PTATooltip id="pre-requisito-3-creditos" />
                </div>
                <div className="mt-1 text-sm">
                  Debe tener al menos UNA asignatura de mínimo 3 créditos 
                  para desbloquear Investigación, Extensión y Complementarias.
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* Formulario */}
      {mostrarFormulario && (
        <Card className="p-4 border-2 border-blue-200 bg-blue-50/30">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Nueva Asignatura de Docencia
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarFormulario(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Territorial</Label>
                <Select value={territorial?.toString() || ''} onValueChange={(v) => setTerritorial(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar territorial" />
                  </SelectTrigger>
                  <SelectContent>
                    {TERRITORIALES_MOCK.map(t => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Periodo</Label>
                <Select value={periodo} onValueChange={setPeriodo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-1">2025-1</SelectItem>
                    <SelectItem value="2025-2">2025-2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Asignatura</Label>
              <Select value={asignaturaSeleccionada?.toString() || ''} onValueChange={handleAsignaturaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar asignatura" />
                </SelectTrigger>
                <SelectContent>
                  {ASIGNATURAS_MOCK.map(a => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.nombre} ({a.creditos} créd. - {a.programa})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Número de Grupos</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={numeroGrupos}
                onChange={(e) => handleGruposChange(e.target.value)}
              />
            </div>

            {/* Preview del Cálculo CON TOOLTIP */}
            {preview && (
              <Alert className="border-blue-200 bg-blue-50">
                <div className="flex items-start gap-2">
                  <Calculator className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <AlertDescription className="text-blue-700">
                      <div className="space-y-2">
                        <div className="font-semibold flex items-center gap-2">
                          Cálculo Automático:
                          <PTATooltip id="factor-x3" />
                        </div>
                        <div className="text-sm space-y-1">
                          <div>• Horas de clase: <strong>{preview.horasClase}h</strong></div>
                          <div>• Factor aplicado: <strong>×{preview.factorAplicado}</strong></div>
                          <div>• Total: <strong>{preview.horasTotales}h</strong></div>
                          <div className="text-xs text-blue-600 mt-2 bg-white/50 p-2 rounded">
                            📐 {preview.formula}
                          </div>
                        </div>
                      </div>
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setMostrarFormulario(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAgregar}
                disabled={!asignaturaSeleccionada || !territorial || !preview}
              >
                Agregar Asignatura
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Lista de Asignaturas */}
      {docencias.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <p>No hay asignaturas registradas</p>
          <p className="text-sm mt-2">Haga clic en "Agregar Asignatura" para comenzar</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {docencias.map((doc, idx) => (
            <Card key={doc.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{doc.programa}</span>
                    {doc.creditos >= 3 && (
                      <BadgeWithTooltip 
                        tooltipId="pre-requisito-3-creditos"
                        variant="outline" 
                        className="bg-green-50 text-green-700 text-xs"
                      >
                        ≥3 créd. ✓
                      </BadgeWithTooltip>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {doc.creditos} crédito{doc.creditos !== 1 ? 's' : ''} • 
                    {doc.numero_grupos} grupo{doc.numero_grupos !== 1 ? 's' : ''} • 
                    Periodo {doc.periodo}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Horas: {doc.horas_clase}h clase × 3 × {doc.numero_grupos} = 
                    <strong className="text-blue-600 ml-1">{doc.horas_totales}h total</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-700">
                    {doc.horas_totales}h
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEliminar(doc.id)}
                    disabled={bloqueado}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tabla de Referencia */}
      {mostrarFormulario && (
        <Card className="p-4 bg-gray-50">
          <details>
            <summary className="cursor-pointer font-medium text-sm flex items-center gap-2">
              <Info className="w-4 h-4" />
              Ver tabla de referencia de horas por programa
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Tipo Programa</th>
                    <th className="text-right p-2">Horas/Créd</th>
                    <th className="text-right p-2">Factor</th>
                    <th className="text-right p-2">Total/Créd</th>
                    <th className="text-right p-2">Ej. 3 Créd</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(TABLA_HORAS_POR_PROGRAMA).map(([tipo, datos]) => (
                    <tr key={tipo} className="border-b hover:bg-white">
                      <td className="p-2 font-medium">{tipo}</td>
                      <td className="text-right p-2">{datos.horasPorCredito}</td>
                      <td className="text-right p-2">×{datos.factor}</td>
                      <td className="text-right p-2">{datos.totalPorCredito}</td>
                      <td className="text-right p-2 font-semibold text-blue-600">
                        {datos.ejemplo3Creditos}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Card>
      )}
    </div>
  );
}
