/**
 * DESIGN SYSTEM SIGL - Sistema Integral de Gestión Legal ESAP
 * Index de exportaciones centralizadas
 */

// Design Tokens
export { default as DESIGN_TOKENS } from './tokens';
export type { ColorToken, TypographyToken, SpacingToken } from './tokens';
export { getStatusColor, getPlazoColor, getPlazoBackgroundColor, getContrastText } from './tokens';

// Botones
export { ButtonSIGL, IconButtonSIGL } from './Button';
export type { ButtonSIGLProps, IconButtonSIGLProps } from './Button';

// Inputs
export { InputSIGL, TextareaSIGL } from './Input';
export type { InputSIGLProps, TextareaSIGLProps } from './Input';

// Badges
export { 
  BadgeSIGL, 
  PlazoBadge, 
  TipoFaltaBadge, 
  UrgenciaBadge 
} from './BadgeSIGL';
export type { 
  BadgeSIGLProps, 
  PlazoBadgeProps, 
  TipoFaltaBadgeProps, 
  UrgenciaBadgeProps 
} from './BadgeSIGL';

// Select (Dropdown)
export { SelectSIGL } from './SelectSIGL';
export type { SelectSIGLProps, SelectOption } from './SelectSIGL';

// Checkbox & Radio
export { 
  CheckboxSIGL, 
  RadioButtonSIGL, 
  RadioGroupSIGL 
} from './CheckboxRadio';
export type { 
  CheckboxSIGLProps, 
  RadioButtonSIGLProps, 
  RadioGroupSIGLProps,
  RadioGroupOption
} from './CheckboxRadio';

// Cards
export { 
  CardSIGL, 
  AlertCard, 
  StatCard, 
  CollapsibleCard 
} from './CardSIGL';
export type { 
  CardSIGLProps, 
  AlertCardProps, 
  StatCardProps, 
  CollapsibleCardProps 
} from './CardSIGL';

// Modales
export { 
  ModalSIGL, 
  ConfirmModal, 
  FormModal, 
  InfoModal 
} from './ModalSIGL';
export type { 
  ModalSIGLProps, 
  ConfirmModalProps, 
  FormModalProps, 
  InfoModalProps 
} from './ModalSIGL';

// Toast (Notificaciones)
export { 
  ToastProvider, 
  useToast,
  toast 
} from './ToastSIGL';
export type { 
  Toast,
  ToastVariant 
} from './ToastSIGL';

// Tooltip
export { 
  TooltipSIGL, 
  SimpleTooltip 
} from './TooltipSIGL';
export type { 
  TooltipSIGLProps,
  TooltipPosition,
  SimpleTooltipProps 
} from './TooltipSIGL';

// Avatar
export { 
  AvatarSIGL, 
  AvatarGroup 
} from './AvatarSIGL';
export type { 
  AvatarSIGLProps,
  AvatarSize,
  AvatarStatus,
  AvatarGroupProps 
} from './AvatarSIGL';

// Table
export { TableSIGL } from './TableSIGL';
export type { 
  TableSIGLProps,
  Column,
  SortDirection,
  ColumnAlign 
} from './TableSIGL';

// ExpedienteCard (Card especializada)
export { ExpedienteCard } from './ExpedienteCard';
export type { 
  ExpedienteCardProps,
  Actuacion 
} from './ExpedienteCard';

// AlertBanner (Banner de alertas críticas)
export { 
  AlertBanner, 
  AlertBannerStack,
  createExpedienteAlert 
} from './AlertBanner';
export type { 
  AlertBannerProps,
  AlertBannerVariant,
  AlertBannerStackProps 
} from './AlertBanner';

// StatusTimeline (Timeline de actuaciones)
export { StatusTimeline } from './StatusTimeline';
export type { 
  StatusTimelineProps,
  TimelineEvent,
  TimelineEventType 
} from './StatusTimeline';

// FileUpload (Drag & Drop)
export { FileUpload } from './FileUpload';
export type { 
  FileUploadProps,
  UploadedFile 
} from './FileUpload';

// ChatBubble (Comunicación interna)
export { 
  ChatBubble, 
  ChatContainer 
} from './ChatBubble';
export type { 
  ChatBubbleProps,
  MessageStatus,
  MessageAttachment,
  ChatMessage,
  ChatContainerProps 
} from './ChatBubble';