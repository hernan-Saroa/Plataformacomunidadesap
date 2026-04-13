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
  onAgregarNota: () => void;
}

export function TabNotasExpediente({ notas, onAgregarNota }: TabNotasExpedienteProps) {
  return (
    <div className="space-y-3">
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-yellow-600" />
            Notas Internas del Expediente
          </h4>
          <Button
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold"
            onClick={onAgregarNota}
          >
            <Plus className="w-3 h-3 mr-1" />
            Agregar Nota
          </Button>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Las notas internas son visibles solo para el equipo jurídico y no forman parte del expediente oficial
        </p>
      </Card>

      {notas.length === 0 ? (
        <Card className="p-8 text-center border-2 border-dashed border-gray-300">
          <Bookmark className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h4 className="font-bold text-lg text-gray-600 mb-2">Sin notas internas</h4>
          <p className="text-sm text-gray-500">
            Agrega la primera nota interna a este expediente
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notas.map((nota) => (
            <Card
              key={nota.id}
              className="p-4 border-l-4"
              style={{
                borderLeftColor: nota.tipo === 'Importante' ? '#DC2626' : (nota.tipo === 'Seguimiento' ? '#3B82F6' : '#10B981')
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <Badge
                  className="text-xs font-bold"
                  style={{
                    background: nota.tipo === 'Importante' ? '#FEE2E2' : (nota.tipo === 'Seguimiento' ? '#DBEAFE' : '#D1FAE5'),
                    color: nota.tipo === 'Importante' ? '#DC2626' : (nota.tipo === 'Seguimiento' ? '#1E40AF' : '#065F46')
                  }}
                >
                  {nota.tipo}
                </Badge>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {nota.fecha}
                </span>
              </div>
              <p className="text-sm text-gray-800 mb-2">{nota.nota}</p>
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <User className="w-3 h-3" />
                {nota.autor}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
