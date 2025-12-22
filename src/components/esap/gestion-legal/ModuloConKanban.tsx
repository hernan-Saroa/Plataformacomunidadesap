/**
 * WRAPPER PARA MÓDULOS CON SOPORTE KANBAN
 * Permite alternar entre Vista de Lista y Vista Kanban
 */

import { useState, ReactNode } from 'react';
import { List, Columns3 } from 'lucide-react';
import { Button } from '../../ui/button';

interface ModuloConKanbanProps {
  vistaLista: ReactNode;
  vistaKanban: ReactNode;
  vistaInicial?: 'lista' | 'kanban';
}

export function ModuloConKanban({ vistaLista, vistaKanban, vistaInicial = 'kanban' }: ModuloConKanbanProps) {
  const [vistaActual, setVistaActual] = useState<'lista' | 'kanban'>(vistaInicial);

  return (
    <div className="relative h-full">
      {/* Toggle de Vista - CORREGIDO: Ahora centrado arriba */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-md">
        <Button
          variant={vistaActual === 'kanban' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setVistaActual('kanban')}
          className={vistaActual === 'kanban' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : ''}
          title="Vista Kanban"
        >
          <Columns3 className="w-4 h-4" />
          <span className="ml-2 hidden sm:inline">Kanban</span>
        </Button>
        <Button
          variant={vistaActual === 'lista' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setVistaActual('lista')}
          className={vistaActual === 'lista' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : ''}
          title="Vista de Lista"
        >
          <List className="w-4 h-4" />
          <span className="ml-2 hidden sm:inline">Lista</span>
        </Button>
      </div>

      {/* Contenido según vista activa */}
      {vistaActual === 'kanban' ? vistaKanban : vistaLista}
    </div>
  );
}