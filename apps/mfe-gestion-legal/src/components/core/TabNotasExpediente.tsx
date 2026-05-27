/**
 * TabNotasExpediente - Tab de Notas Internas COMPARTIDA
 * ✅ Usada por ModalExpediente.tsx y ModalProcesoDisciplinario.tsx
 */

import { Plus, Bookmark, Calendar, User } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Card } from '@esap-mfe/shared-ui/card';
import type { NotaExpediente } from './expedienteShared';

interface TabNotasExpedienteProps {
  notas: NotaExpediente[];
  onAgregarNota?: () => void;
}

export function TabNotasExpediente({ notas, onAgregarNota }: TabNotasExpedienteProps) {
  return (
    <div className="space-y-3">
      {/* Header removido porque ahora la acción principal está en las pestañas principales */}

      {notas.length === 0 ? (
        <Card className="p-8 text-center border-2 border-dashed border-gray-300">
          <Bookmark className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h4 className="font-bold text-lg text-gray-600 mb-2">Sin notas internas</h4>
          <p className="text-sm text-gray-500">
            Agrega la primera nota interna a este expediente
          </p>
        </Card>
      ) : (
        <div className="relative pl-3 mt-4">
          {/* Línea vertical izquierda */}
          <div className="absolute left-[7px] top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-gray-200 via-gray-300 to-gray-100"></div>
          
          <div className="space-y-0">
            {notas.map((nota) => (
              <div 
                key={nota.id}
                className="relative flex items-start w-full py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors px-2 -ml-2 rounded-lg"
              >
                {/* Icono a la izquierda */}
                <div className="absolute left-[1px] flex items-center justify-center w-4 h-4 rounded-full border-[2px] border-gray-50 shadow-sm z-10 bg-white mt-1">
                  <div 
                    className="w-full h-full rounded-full flex items-center justify-center"
                    style={{
                      background: nota.tipo === 'Importante' ? '#FEE2E2' : (nota.tipo === 'Seguimiento' ? '#DBEAFE' : '#D1FAE5'),
                      color: nota.tipo === 'Importante' ? '#DC2626' : (nota.tipo === 'Seguimiento' ? '#1E40AF' : '#065F46')
                    }}
                  >
                    <Bookmark className="w-2.5 h-2.5" />
                  </div>
                </div>

                {/* Contenido compacto */}
                <div className="w-full pl-6 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge
                        className="text-[9px] font-bold uppercase px-1 py-0 h-4 border-transparent"
                        style={{
                          background: nota.tipo === 'Importante' ? '#FEE2E2' : (nota.tipo === 'Seguimiento' ? '#DBEAFE' : '#D1FAE5'),
                          color: nota.tipo === 'Importante' ? '#DC2626' : (nota.tipo === 'Seguimiento' ? '#1E40AF' : '#065F46')
                        }}
                      >
                        {nota.tipo}
                      </Badge>
                      <h4 className="font-semibold text-gray-900 text-[13px] truncate">Nota Interna</h4>
                    </div>
                    <p className="text-[12px] text-gray-600 line-clamp-2" title={nota.nota}>{nota.nota}</p>
                  </div>
                  
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5 whitespace-nowrap shrink-0">
                    <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {nota.fecha}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-semibold text-gray-600 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {nota.autor}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
