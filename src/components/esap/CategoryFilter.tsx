import React, { useState } from 'react';
import { 
  FolderOpen, Check, X, Users, Shield, FolderOpenDot, 
  ClipboardList, BadgeCheck, Activity, FileText, Database,
  BarChart3, Search
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { cn } from '../ui/utils';
import { toast } from 'sonner';

export interface Category {
  id: string;
  label: string;
  icon: any;
  color: string;
  count?: number;
}

const CATEGORIES: Category[] = [
  { id: 'all', label: 'Todas las Categorías', icon: BarChart3, color: '#1e5da8', count: undefined },
  { id: 'users', label: 'Usuarios', icon: Users, color: '#3b82f6', count: 1234 },
  { id: 'roles', label: 'Roles y Permisos', icon: Shield, color: '#f59e0b', count: 15 },
  { id: 'personas', label: 'Personas', icon: FolderOpenDot, color: '#8b5cf6', count: 8542 },
  { id: 'aspirantes', label: 'Aspirantes', icon: ClipboardList, color: '#3b82f6', count: 342 },
  { id: 'verification', label: 'Verificación de Títulos', icon: BadgeCheck, color: '#10b981', count: 2567 },
  { id: 'audit', label: 'Auditoría', icon: Activity, color: '#ef4444', count: 15234 },
  { id: 'reports', label: 'Reportes', icon: FileText, color: '#6366f1', count: 89 },
  { id: 'system', label: 'Sistema', icon: Database, color: '#64748b', count: undefined },
];

interface CategoryFilterProps {
  value?: string[];
  onChange?: (categories: string[]) => void;
  className?: string;
}

export function CategoryFilter({ value = ['all'], onChange, className }: CategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(value);
  const [searchTerm, setSearchTerm] = useState('');

  const handleToggleCategory = (categoryId: string) => {
    let newSelection: string[];

    if (categoryId === 'all') {
      newSelection = ['all'];
    } else {
      const withoutAll = selectedCategories.filter(id => id !== 'all');
      
      if (withoutAll.includes(categoryId)) {
        newSelection = withoutAll.filter(id => id !== categoryId);
        if (newSelection.length === 0) {
          newSelection = ['all'];
        }
      } else {
        newSelection = [...withoutAll, categoryId];
      }
    }

    setSelectedCategories(newSelection);
    onChange?.(newSelection);

    const selectedLabels = CATEGORIES
      .filter(cat => newSelection.includes(cat.id))
      .map(cat => cat.label)
      .join(', ');

    toast.success('Categorías actualizadas', {
      description: selectedLabels,
    });
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategories(['all']);
    onChange?.(['all']);
    toast.info('Filtro limpiado', {
      description: 'Mostrando todas las categorías',
    });
  };

  const getButtonLabel = () => {
    if (selectedCategories.includes('all') || selectedCategories.length === 0) {
      return 'Todas las Categorías';
    }
    if (selectedCategories.length === 1) {
      const category = CATEGORIES.find(c => c.id === selectedCategories[0]);
      return category?.label || 'Categoría';
    }
    return `${selectedCategories.length} categorías`;
  };

  const filteredCategories = CATEGORIES.filter(category =>
    category.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal group relative',
            'hover:bg-gray-50 hover:border-[#1e5da8] transition-all',
            'h-9 px-3',
            className
          )}
        >
          <FolderOpen className="w-4 h-4 mr-2 text-gray-600 group-hover:text-[#1e5da8] transition-colors" />
          <span className="text-sm font-medium truncate max-w-[150px]">
            {getButtonLabel()}
          </span>
          {!selectedCategories.includes('all') && selectedCategories.length > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-2 h-4 px-1.5 text-[10px] font-bold bg-[#1e5da8] text-white"
            >
              {selectedCategories.length}
            </Badge>
          )}
          {!selectedCategories.includes('all') && (
            <button
              onClick={handleClear}
              className="ml-2 p-0.5 rounded-sm hover:bg-gray-200 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end" side="bottom">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <h4 className="font-semibold text-sm text-gray-900 mb-1">Filtrar por Categoría</h4>
            <p className="text-xs text-gray-600 mb-3">
              Filtra las métricas del dashboard por tipo de módulo
            </p>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>

          {/* Categories List */}
          <div className="max-h-[400px] overflow-y-auto">
            <div className="p-2 space-y-1">
              {filteredCategories.map((category) => {
                const isSelected = selectedCategories.includes(category.id);
                const Icon = category.icon;

                return (
                  <button
                    key={category.id}
                    onClick={() => handleToggleCategory(category.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group',
                      isSelected
                        ? 'bg-blue-50 border border-[#1e5da8]/30'
                        : 'hover:bg-gray-50 border border-transparent'
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all',
                        isSelected ? 'shadow-sm' : 'group-hover:shadow-sm'
                      )}
                      style={{ 
                        backgroundColor: isSelected ? category.color : `${category.color}20`,
                      }}
                    >
                      <Icon 
                        className="w-4 h-4" 
                        style={{ color: isSelected ? 'white' : category.color }}
                        strokeWidth={2}
                      />
                    </div>

                    {/* Label and Count */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-sm font-medium truncate',
                          isSelected ? 'text-[#1e5da8]' : 'text-gray-700'
                        )}>
                          {category.label}
                        </span>
                        {category.count !== undefined && (
                          <Badge 
                            variant="secondary" 
                            className="text-[10px] px-1.5 py-0 h-4 font-semibold"
                          >
                            {category.count.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Checkmark */}
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#1e5da8] flex-shrink-0" strokeWidth={3} />
                    )}
                  </button>
                );
              })}

              {filteredCategories.length === 0 && (
                <div className="px-3 py-8 text-center">
                  <p className="text-sm text-gray-600">No se encontraron categorías</p>
                  <p className="text-xs text-gray-500 mt-1">Intenta con otro término de búsqueda</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">
                {selectedCategories.includes('all') 
                  ? 'Todas las categorías seleccionadas' 
                  : `${selectedCategories.length} de ${CATEGORIES.length - 1} seleccionadas`}
              </span>
              {!selectedCategories.includes('all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategories(['all']);
                    onChange?.(['all']);
                    toast.info('Filtro limpiado');
                  }}
                  className="h-7 text-xs text-[#1e5da8] hover:text-[#1e5da8] hover:bg-blue-50"
                >
                  Limpiar selección
                </Button>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
