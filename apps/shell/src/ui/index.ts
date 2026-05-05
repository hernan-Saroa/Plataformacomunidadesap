/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UI COMPONENTS - EXPORTS CENTRALIZADOS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Archivo de exports para facilitar imports de componentes UI
 * 
 * ACTUALIZADO: 30 Enero 2026 - FASE 1 DÍA 1
 * - Agregados componentes responsive nuevos
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENTES RESPONSIVE NUEVOS (FASE 1)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export { Container4K } from './container-4k';
export type { Container4KProps } from './container-4k';

export { ResponsiveHeader } from './responsive-header';
export type { ResponsiveHeaderProps } from './responsive-header';

export { TouchButton } from './touch-button';
export type { TouchButtonProps } from './touch-button';

export { ResponsiveGrid } from './responsive-grid';
export type { ResponsiveGridProps } from './responsive-grid';

export { ResponsiveTableWrapper } from './responsive-table-wrapper';
export type { ResponsiveTableWrapperProps } from './responsive-table-wrapper';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENTES EXISTENTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export { Card } from './card';
export { Badge } from './badge';
export { Button } from './button';
export { Input } from './input';
export { Textarea } from './textarea';
export { Select } from './select';
export { Checkbox } from './checkbox';
export { Switch } from './switch';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from './dialog';
export { Alert, AlertDescription, AlertTitle } from './alert';
export { Separator } from './separator';
export { Avatar, AvatarFallback, AvatarImage } from './avatar';
export { Progress } from './progress';
export { Skeleton } from './skeleton';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
export { LoadingSpinner } from './loading-spinner';
export { EmptyState } from './empty-state';
export { ConfirmationDialog } from './confirmation-dialog';

/**
 * GUÍA DE USO:
 * 
 * // Import múltiple (recomendado)
 * import { 
 *   Container4K, 
 *   ResponsiveHeader, 
 *   TouchButton,
 *   ResponsiveGrid 
 * } from '@/components/ui';
 * 
 * // Import individual (también válido)
 * import { Card } from '@/components/ui/card';
 */