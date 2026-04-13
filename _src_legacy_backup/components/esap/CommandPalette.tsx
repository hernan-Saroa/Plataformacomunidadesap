import { useEffect, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../ui/command';
import { 
  Lock, 
  Shield, 
  Users, 
  FileText, 
  Settings, 
  LayoutGrid,
  Search,
  Plus,
  Download,
  Filter,
  Activity
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (section: string) => void;
  onAction?: (action: string) => void;
}

export function CommandPalette({ open, onOpenChange, onNavigate, onAction }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = (callback: () => void) => {
    callback();
    onOpenChange(false);
  };

  return (
    <CommandDialog 
      open={open} 
      onOpenChange={onOpenChange}
      title="Búsqueda rápida"
      description="Busca páginas, acciones y comandos..."
    >
      <CommandInput 
        placeholder="Buscar páginas, acciones y comandos..." 
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
        
        <CommandGroup heading="Navegación">
          <CommandItem onSelect={() => handleSelect(() => onNavigate?.('dashboard'))}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => onNavigate?.('usuarios'))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Gestión de Usuarios</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => onNavigate?.('roles'))}>
            <Lock className="mr-2 h-4 w-4" />
            <span>Roles y Permisos</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => onNavigate?.('auditoria'))}>
            <Activity className="mr-2 h-4 w-4" />
            <span>Auditoría</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => onNavigate?.('tramites'))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Trámites</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => onNavigate?.('configuracion'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Configuración</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Acciones">
          <CommandItem onSelect={() => handleSelect(() => onAction?.('crear-rol'))}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Crear nuevo rol</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘N</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => onAction?.('exportar'))}>
            <Download className="mr-2 h-4 w-4" />
            <span>Exportar datos</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘E</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => onAction?.('filtrar'))}>
            <Filter className="mr-2 h-4 w-4" />
            <span>Abrir filtros</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘F</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => onAction?.('buscar'))}>
            <Search className="mr-2 h-4 w-4" />
            <span>Buscar permisos</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘/</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Permisos">
          <CommandItem onSelect={() => handleSelect(() => onAction?.('permiso-usuarios'))}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Gestión de usuarios</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => onAction?.('permiso-roles'))}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Gestión de roles</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => onAction?.('permiso-auditoria'))}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Visualización de auditoría</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
