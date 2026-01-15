/**
 * FormularioRegistrarDecision - Modal Corporativo para Registrar Decisiones Disciplinarias
 * Diseño ESAP premium profesional
 */

import { toast } from 'sonner@2.0.3';
import type { ExpedienteJudicial } from '../core/types';
import { ModalHeaderClean } from './ModalHeaderClean';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { 
  CheckCircle, X, Save, AlertCircle, Gavel, FileText, Calendar, User
} from 'lucide-react';
import { useState } from 'react';

interface FormularioRegistrarDecisionProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (decision: any) => void;
  procesoId: string;
}

export function FormularioRegistrarDecision({ 
  isOpen, 
  onClose, 
  onGuardar,
  procesoId 
}: FormularioRegistrarDecisionProps) {
  const [tipoDecision, setTipoDecision] = useState('');
  const [tipoFallo, setTipoFallo] = useState('');
  const [sancion, setSancion] = useState('');
  const [consideraciones, setConsideraciones] = useState('');
  const [fundamentosJuridicos, setFundamentosJuridicos] = useState('');
  const [responsable, setResponsable] = useState('');
  const [cargoResponsable, setCargoResponsable] = useState('');

  const tiposDecision = [
    'Fallo de Primera Instancia',
    'Fallo de Segunda Instancia',
    'Auto de Archivo',
    'Auto de Terminación',
    'Decisión Inhibitoria'
  ];

  const tiposFallo = [
    'Sancionatoria',
    'Absolutoria'
  ];

  const tiposSancion = [
    'Amonestación Escrita',
    'Suspensión de 30 días',
    'Suspensión de 60 días',
    'Suspensión de 90 días',
    'Destitución e Inhabilidad General',
    'No Aplica (Absolución)'
  ];

  const handleGuardarDecision = () => {
    // Validaciones
    if (!tipoDecision) {
      toast.error('⚠️ Tipo de decisión requerido', {
        description: 'Debes seleccionar el tipo de decisión'
      });
      return;
    }

    if (!tipoFallo) {
      toast.error('⚠️ Tipo de fallo requerido', {
        description: 'Debes seleccionar si es sancionatoria o absolutoria'
      });
      return;
    }

    if (tipoFallo === 'Sancionatoria' && !sancion) {
      toast.error('⚠️ Sanción requerida', {
        description: 'Para fallos sancionatorios debes especificar la sanción'
      });
      return;
    }

    if (!consideraciones) {
      toast.error('⚠️ Consideraciones requeridas', {
        description: 'Debes agregar las consideraciones de la decisión'
      });
      return;
    }

    if (!responsable) {
      toast.error('⚠️ Responsable requerido', {
        description: 'Debes especificar quién emite la decisión'
      });
      return;
    }

    // Toast de guardado
    toast.loading('💾 Guardando decisión...', {
      id: 'guardar-decision',
      duration: 2000
    });

    setTimeout(() => {
      const nuevaDecision = {
        tipoDecision,
        tipoFallo,
        sancion: tipoFallo === 'Absolutoria' ? null : sancion,
        consideraciones,
        fundamentosJuridicos,
        responsable,
        cargoResponsable,
        fecha: new Date().toLocaleDateString('es-CO')
      };

      onGuardar(nuevaDecision);

      toast.success('✅ Decisión registrada exitosamente', {
        id: 'guardar-decision',
        description: `${tipoDecision} - ${tipoFallo} guardada en el proceso ${procesoId}`,
        duration: 4000
      });

      // Limpiar formulario
      setTipoDecision('');
      setTipoFallo('');
      setSancion('');
      setConsideraciones('');
      setFundamentosJuridicos('');
      setResponsable('');
      setCargoResponsable('');

      onClose();
    }, 2000);
  };

  const handleCancelar = () => {
    if (tipoDecision || tipoFallo || consideraciones) {
      if (confirm('⚠️ ¿Estás seguro de cancelar? Se perderán los datos ingresados.')) {
        // Limpiar formulario
        setTipoDecision('');
        setTipoFallo('');
        setSancion('');
        setConsideraciones('');
        setFundamentosJuridicos('');
        setResponsable('');
        setCargoResponsable('');
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancelar}>
      <DialogContent hideCloseButton className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogDescription className="sr-only">
          Formulario para registrar una nueva decisión en el proceso disciplinario {procesoId}
        </DialogDescription>

        {/* Header Limpio y Usable - ESAP 2025 */}
        <ModalHeaderClean
          titulo="Registrar Decisión"
          subtitulo={`Proceso ${procesoId}`}
          icono={Gavel}
          colorIcono="indigo"
          badges={
            <>
              <Badge variant="outline" className="font-semibold text-xs border-indigo-300 text-indigo-700">
                <FileText className="w-3 h-3 mr-1" />
                Formulario de Decisión Disciplinaria
              </Badge>
            </>
          }
          onClose={handleCancelar}
        />

        {/* Contenido del formulario - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Información contextual */}
          <Card className="p-4 bg-blue-50 border-2 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-900 mb-1">
                  📋 Instrucciones
                </p>
                <p className="text-sm text-blue-800 leading-relaxed">
                  Complete todos los campos requeridos para registrar la decisión disciplinaria. 
                  Las decisiones sancionatorias requieren especificar el tipo de sanción impuesta.
                  Los campos de fundamentos jurídicos y cargo son opcionales pero recomendados.
                </p>
              </div>
            </div>
          </Card>

          {/* Tipo de Decisión */}
          <Card className="p-5 border-2 border-gray-200">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
              <FileText className="w-5 h-5" />
              Tipo de Decisión *
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {tiposDecision.map((tipo) => (
                <label
                  key={tipo}
                  className={`
                    flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${tipoDecision === tipo 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="tipoDecision"
                    value={tipo}
                    checked={tipoDecision === tipo}
                    onChange={(e) => setTipoDecision(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className={`font-semibold ${tipoDecision === tipo ? 'text-blue-900' : 'text-gray-700'}`}>
                    {tipo}
                  </span>
                </label>
              ))}
            </div>
          </Card>

          {/* Tipo de Fallo */}
          <Card className="p-5 border-2 border-gray-200">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
              <Gavel className="w-5 h-5" />
              Tipo de Fallo *
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {tiposFallo.map((tipo) => (
                <label
                  key={tipo}
                  className={`
                    flex items-center gap-3 p-5 rounded-lg border-2 cursor-pointer transition-all
                    ${tipoFallo === tipo 
                      ? tipo === 'Sancionatoria' 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-400'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="tipoFallo"
                    value={tipo}
                    checked={tipoFallo === tipo}
                    onChange={(e) => setTipoFallo(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className={`font-black text-base block ${
                      tipoFallo === tipo 
                        ? tipo === 'Sancionatoria' ? 'text-red-900' : 'text-green-900'
                        : 'text-gray-700'
                    }`}>
                      {tipo}
                    </span>
                    <span className={`text-xs ${
                      tipoFallo === tipo 
                        ? tipo === 'Sancionatoria' ? 'text-red-700' : 'text-green-700'
                        : 'text-gray-500'
                    }`}>
                      {tipo === 'Sancionatoria' 
                        ? 'Se encontró responsable al disciplinado'
                        : 'Se absuelve al disciplinado'
                      }
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* Sanción (solo si es Sancionatoria) */}
          {tipoFallo === 'Sancionatoria' && (
            <Card className="p-5 border-2 border-orange-200 bg-orange-50">
              <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-orange-900">
                <AlertCircle className="w-5 h-5" />
                Sanción Impuesta *
              </h3>
              <div className="space-y-2">
                {tiposSancion.filter(s => s !== 'No Aplica (Absolución)').map((tipo) => (
                  <label
                    key={tipo}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${sancion === tipo 
                        ? 'border-orange-500 bg-white' 
                        : 'border-orange-200 bg-white/50 hover:border-orange-400 hover:bg-white'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="sancion"
                      value={tipo}
                      checked={sancion === tipo}
                      onChange={(e) => setSancion(e.target.value)}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className={`font-semibold ${sancion === tipo ? 'text-orange-900' : 'text-gray-700'}`}>
                      {tipo}
                    </span>
                  </label>
                ))}
              </div>
            </Card>
          )}

          {/* Consideraciones */}
          <Card className="p-5 border-2 border-gray-200">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
              <FileText className="w-5 h-5" />
              Consideraciones de la Decisión *
            </h3>
            <div className="space-y-2">
              <Label htmlFor="consideraciones" className="text-sm text-gray-600">
                Resuma las principales consideraciones que fundamentan esta decisión
              </Label>
              <Textarea
                id="consideraciones"
                value={consideraciones}
                onChange={(e) => setConsideraciones(e.target.value)}
                placeholder="Ejemplo: Después de analizar el material probatorio allegado al proceso, se encuentra probado que el funcionario incurrió en la falta disciplinaria descrita en el pliego de cargos..."
                rows={6}
                className="w-full text-sm resize-none"
              />
              <p className="text-xs text-gray-500">
                {consideraciones.length} / 2000 caracteres
              </p>
            </div>
          </Card>

          {/* Fundamentos Jurídicos (Opcional) */}
          <Card className="p-5 border-2 border-gray-200">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
              <Gavel className="w-5 h-5" />
              Fundamentos Jurídicos <span className="text-sm font-normal text-gray-500">(Opcional)</span>
            </h3>
            <div className="space-y-2">
              <Label htmlFor="fundamentosJuridicos" className="text-sm text-gray-600">
                Especifique las normas y jurisprudencia aplicadas
              </Label>
              <Textarea
                id="fundamentosJuridicos"
                value={fundamentosJuridicos}
                onChange={(e) => setFundamentosJuridicos(e.target.value)}
                placeholder="Ejemplo: Conforme a lo establecido en el artículo 48 de la Ley 734 de 2002 (Código Disciplinario Único), en concordancia con la jurisprudencia de la Corte Constitucional..."
                rows={5}
                className="w-full text-sm resize-none"
              />
            </div>
          </Card>

          {/* Responsable de la Decisión */}
          <Card className="p-5 border-2 border-gray-200">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
              <User className="w-5 h-5" />
              Responsable de la Decisión
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="responsable" className="text-sm font-bold mb-2 block">
                  Nombre Completo *
                </Label>
                <Input
                  id="responsable"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  placeholder="Ej: Dr. Carlos Mendoza Vásquez"
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="cargoResponsable" className="text-sm font-bold mb-2 block">
                  Cargo <span className="font-normal text-gray-500">(Opcional)</span>
                </Label>
                <Input
                  id="cargoResponsable"
                  value={cargoResponsable}
                  onChange={(e) => setCargoResponsable(e.target.value)}
                  placeholder="Ej: Director de Control Interno Disciplinario"
                  className="w-full"
                />
              </div>
            </div>
          </Card>

          {/* Fecha Automática */}
          <Card className="p-4 bg-gray-50 border-2 border-gray-200">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm font-bold text-gray-700">Fecha de Registro</p>
                <p className="text-sm text-gray-600">
                  {new Date().toLocaleDateString('es-CO', { 
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer Sticky - Botones de Acción */}
        <div className="sticky bottom-0 bg-white border-t-2 px-6 py-4 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            * Campos obligatorios
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancelar}
              className="font-semibold"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleGuardarDecision}
              className="font-bold"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Decisión
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
