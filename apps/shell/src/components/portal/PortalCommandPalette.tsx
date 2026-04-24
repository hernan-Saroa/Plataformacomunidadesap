import React, { useEffect } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '../ui/command';
import {
  FileText,
  FolderOpen,
  User,
  Settings,
  HelpCircle,
  Home,
  LogOut,
  Moon,
} from 'lucide-react';

interface PortalCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (section: string) => void;
  onLogout?: () => void;
}

export function PortalCommandPalette({ open, onOpenChange, onNavigate, onLogout }: PortalCommandPaletteProps) {
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

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Búsqueda Global Rápida">
      <CommandInput placeholder="Escribe un comando o busca un servicio..." />
      <CommandList>
        <CommandEmpty>No se encontraron resultados para tu búsqueda.</CommandEmpty>

        <CommandGroup heading="Servicios Principales">
          <CommandItem onSelect={() => runCommand(() => onNavigate?.('dashboard'))}>
            <Home className="mr-2 h-4 w-4 text-blue-500" />
            <span>Dashboard Principal</span>
            <CommandShortcut>Alt+1</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onNavigate?.('certificado-laboral'))}>
            <FileText className="mr-2 h-4 w-4 text-blue-500" />
            <span>Certificado Laboral</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onNavigate?.('pta'))}>
            <FolderOpen className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Plan de Trabajo Académico (PTA)</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onNavigate?.('carpeta-digital'))}>
            <FolderOpen className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Mi Carpeta Digital</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Ajustes y Perfil">
          <CommandItem onSelect={() => runCommand(() => onNavigate?.('mi-perfil'))}>
            <User className="mr-2 h-4 w-4 text-purple-500" />
            <span>Mi Perfil</span>
            <CommandShortcut>Alt+P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onNavigate?.('configuracion'))}>
            <Settings className="mr-2 h-4 w-4 text-gray-500" />
            <span>Configuración</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => console.log('Dark mode toggle'))}>
            <Moon className="mr-2 h-4 w-4 text-slate-700" />
            <span>Cambiar a Modo Oscuro</span>
            <CommandShortcut>⌘D</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Sistema">
          <CommandItem onSelect={() => runCommand(() => onNavigate?.('ayuda'))}>
            <HelpCircle className="mr-2 h-4 w-4 text-amber-500" />
            <span>Centro de Ayuda</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onLogout?.())}>
            <LogOut className="mr-2 h-4 w-4 text-red-500" />
            <span>Cerrar Sesión</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

