import { motion } from 'motion/react';
import { CheckCircle2, ArrowRight, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { CardSIGL } from '../design-system/CardSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';

interface TransicionFasesProps {
  faseActual: string;
  faseAnteriorCompleta: boolean;
  faseSiguiente: string;
  progresActual: number;
  requisitos: RequisitoFase[];
  onContinuar: () => void;
  onVolverAtras?: () => void;
}

interface RequisitoFase {
  id: string;
  descripcion: string;
  completado: boolean;
  requerido: boolean;
}

export function TransicionFases({
  faseActual,
  faseAnteriorCompleta,
  faseSiguiente,
  progresActual,
  requisitos,
  onContinuar,
  onVolverAtras
}: TransicionFasesProps) {
  const requisitosCompletados = requisitos.filter(r => r.completado).length;
  const requisitosRequeridos = requisitos.filter(r => r.requerido).length;
  const todosRequisitosCompletados = requisitosRequeridos === requisitos.filter(r => r.requerido && r.completado).length;
  const puedeAvanzar = todosRequisitosCompletados && progresActual >= 50;

  return (
    <CardSIGL variant={puedeAvanzar ? 'success' : 'warning'}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          {puedeAvanzar ? (
            <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
          )}
          
          <div className="flex-1">
            <h3 className="text-slate-900 font-semibold mb-2">
              {puedeAvanzar 
                ? '✅ Fase Lista para Continuar' 
                : '⏳ Completar Requisitos para Avanzar'}
            </h3>
            
            <p className="text-slate-600 mb-4">
              {puedeAvanzar 
                ? `Has completado ${requisitosCompletados} de ${requisitos.length} requisitos. Puedes proceder a ${faseSiguiente}.`
                : `Completa los requisitos obligatorios para continuar con ${faseSiguiente}.`}
            </p>

            {/* Lista de Requisitos */}
            <div className="space-y-2 mb-4">
              {requisitos.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  {req.completado ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-slate-300 rounded-full flex-shrink-0" />
                  )}
                  <span className={`text-sm ${req.completado ? 'text-slate-900' : 'text-slate-600'}`}>
                    {req.descripcion}
                  </span>
                  {req.requerido && !req.completado && (
                    <BadgeSIGL variant="danger" className="ml-auto">Obligatorio</BadgeSIGL>
                  )}
                  {req.completado && (
                    <BadgeSIGL variant="success" className="ml-auto">Completado</BadgeSIGL>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Barra de Progreso */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Progreso de la fase</span>
                <span className="text-sm font-semibold text-slate-900">{progresActual}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${progresActual >= 80 ? 'bg-green-600' : progresActual >= 50 ? 'bg-blue-600' : 'bg-yellow-600'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progresActual}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Información Adicional */}
            {!puedeAvanzar && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-700">
                    <p className="font-semibold mb-1">Requisitos Pendientes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {requisitos.filter(r => r.requerido && !r.completado).map(req => (
                        <li key={req.id}>{req.descripcion}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex gap-3">
              {onVolverAtras && (
                <ButtonSIGL
                  variant="outline"
                  size="md"
                  onClick={onVolverAtras}
                >
                  Volver a Fase Anterior
                </ButtonSIGL>
              )}
              <ButtonSIGL
                variant={puedeAvanzar ? 'success' : 'default'}
                size="md"
                onClick={onContinuar}
                disabled={!puedeAvanzar}
                className="flex-1"
              >
                {puedeAvanzar ? (
                  <>
                    Continuar a {faseSiguiente}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                ) : (
                  <>
                    Completar Requisitos
                  </>
                )}
              </ButtonSIGL>
            </div>
          </div>
        </div>
      </div>
    </CardSIGL>
  );
}

// Componente de Checklist Interactivo para cada fase
interface ChecklistFaseProps {
  titulo: string;
  items: ChecklistItem[];
  onItemClick?: (itemId: string) => void;
}

interface ChecklistItem {
  id: string;
  texto: string;
  completado: boolean;
  opcional?: boolean;
  accion?: string;
}

export function ChecklistFase({ titulo, items, onItemClick }: ChecklistFaseProps) {
  const itemsCompletados = items.filter(i => i.completado).length;
  const progreso = Math.round((itemsCompletados / items.length) * 100);

  return (
    <CardSIGL variant="elevated">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-900 font-semibold">{titulo}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">
              {itemsCompletados}/{items.length}
            </span>
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              className={`
                w-full flex items-start gap-3 p-3 rounded-lg transition-all
                ${item.completado 
                  ? 'bg-green-50 border-2 border-green-200' 
                  : 'bg-slate-50 border-2 border-slate-200 hover:border-blue-300'}
              `}
            >
              <div className="flex-shrink-0 mt-0.5">
                {item.completado ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <div className="w-5 h-5 border-2 border-slate-400 rounded-full" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className={`text-sm ${item.completado ? 'text-slate-900 line-through' : 'text-slate-700'}`}>
                  {item.texto}
                </p>
                {item.accion && !item.completado && (
                  <p className="text-xs text-blue-600 mt-1">{item.accion}</p>
                )}
              </div>
              {item.opcional && (
                <BadgeSIGL variant="default" className="text-xs">Opcional</BadgeSIGL>
              )}
            </button>
          ))}
        </div>
      </div>
    </CardSIGL>
  );
}
