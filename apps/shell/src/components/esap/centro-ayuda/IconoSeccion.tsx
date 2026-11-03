/**
 * Iconos que se pueden elegir para una sección del Centro de Ayuda. Deben ser
 * los mismos de ICONOS_SECCION en auth-service (centro-ayuda-seccion.entity.ts).
 */
import {
  Book,
  BookOpen,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  HelpCircle,
  Keyboard,
  Lightbulb,
  Link2,
  Megaphone,
  Newspaper,
  Rocket,
  Settings,
  ShieldCheck,
  Users,
  Video,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export const ICONOS_SECCION: Record<string, { Icono: LucideIcon; nombre: string }> = {
  Book: { Icono: Book, nombre: 'Libro' },
  BookOpen: { Icono: BookOpen, nombre: 'Guía' },
  FileText: { Icono: FileText, nombre: 'Documento' },
  Video: { Icono: Video, nombre: 'Video' },
  Keyboard: { Icono: Keyboard, nombre: 'Teclado' },
  GraduationCap: { Icono: GraduationCap, nombre: 'Capacitación' },
  Lightbulb: { Icono: Lightbulb, nombre: 'Idea' },
  HelpCircle: { Icono: HelpCircle, nombre: 'Pregunta' },
  ClipboardList: { Icono: ClipboardList, nombre: 'Lista' },
  FolderOpen: { Icono: FolderOpen, nombre: 'Carpeta' },
  Megaphone: { Icono: Megaphone, nombre: 'Anuncio' },
  Newspaper: { Icono: Newspaper, nombre: 'Novedades' },
  Rocket: { Icono: Rocket, nombre: 'Primeros pasos' },
  Settings: { Icono: Settings, nombre: 'Configuración' },
  ShieldCheck: { Icono: ShieldCheck, nombre: 'Seguridad' },
  Users: { Icono: Users, nombre: 'Personas' },
  Wrench: { Icono: Wrench, nombre: 'Soporte' },
  Link2: { Icono: Link2, nombre: 'Enlaces' },
};

export function iconoDeSeccion(nombre: string | undefined): LucideIcon {
  return (nombre && ICONOS_SECCION[nombre]?.Icono) || BookOpen;
}

export function IconoSeccion({ nombre, className = 'h-5 w-5' }: { nombre: string | undefined; className?: string }) {
  const Icono = iconoDeSeccion(nombre);
  return <Icono className={className} />;
}
