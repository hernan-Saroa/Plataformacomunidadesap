import { motion } from 'motion/react';
import { 
  Shield, 
  Users, 
  FileText, 
  Search, 
  Plus, 
  Sparkles, 
  GraduationCap,
  ClipboardList,
  BarChart3,
  UserCheck,
  FileCheck,
  AlertCircle,
  Inbox,
  FolderOpen,
  Lightbulb,
  Zap
} from 'lucide-react';

interface EmptyStateProps {
  type: 
    | 'no-roles' 
    | 'no-permissions' 
    | 'no-search' 
    | 'no-users'
    | 'no-graduates'
    | 'no-requests'
    | 'no-reports'
    | 'no-aspirants'
    | 'no-certificates'
    | 'no-enrollments'
    | 'no-data'
    | 'no-results';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  tips?: string[]; // Educational tips
  showTips?: boolean; // Whether to show tips section
}

export function EmptyStatePremium({
  type,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  tips = [],
  showTips = true,
}: EmptyStateProps) {
  const getIllustration = () => {
    switch (type) {
      case 'no-roles':
        return <ShieldIllustration />;
      case 'no-permissions':
        return <PermissionsIllustration />;
      case 'no-search':
        return <SearchIllustration />;
      case 'no-users':
        return <UsersIllustration />;
      case 'no-graduates':
        return <GraduatesIllustration />;
      case 'no-requests':
        return <RequestsIllustration />;
      case 'no-reports':
        return <ReportsIllustration />;
      case 'no-aspirants':
        return <AspirantsIllustration />;
      case 'no-certificates':
        return <CertificatesIllustration />;
      case 'no-enrollments':
        return <EnrollmentsIllustration />;
      case 'no-data':
        return <NoDataIllustration />;
      case 'no-results':
        return <NoResultsIllustration />;
      default:
        return <DefaultIllustration />;
    }
  };

  // Default contextual tips based on type
  const getDefaultTips = () => {
    switch (type) {
      case 'no-users':
        return [
          'Los usuarios pueden tener múltiples roles simultáneamente',
          'Usa filtros para encontrar usuarios específicos rápidamente',
          'Exporta datos para análisis externos cuando lo necesites',
        ];
      case 'no-graduates':
        return [
          'Verifica primero que el usuario esté registrado en el sistema',
          'Los graduados pueden generar certificados digitales verificables',
          'Usa búsqueda por documento o nombre para encontrar graduados',
        ];
      case 'no-requests':
        return [
          'Las solicitudes pendientes aparecerán automáticamente aquí',
          'Puedes filtrar por estado para organizarte mejor',
          'Revisa notificaciones para estar al día con nuevas solicitudes',
        ];
      case 'no-reports':
        return [
          'Crea reportes personalizados con los datos que necesites',
          'Programa reportes para recibirlos automáticamente por email',
          'Exporta en múltiples formatos: PDF, Excel, CSV',
        ];
      case 'no-aspirants':
        return [
          'Los aspirantes son usuarios interesados en programas ESAP',
          'Puedes importar listas masivas de aspirantes',
          'Filtra por programa para gestionar mejor las admisiones',
        ];
      case 'no-enrollments':
        return [
          'Las solicitudes de matrícula se gestionan desde el Portal Transaccional',
          'Revisa el estado de cada solicitud antes de aprobar',
          'Las matrículas aprobadas se sincronizan con el sistema académico',
        ];
      case 'no-search':
        return [
          'Intenta usar términos más generales en tu búsqueda',
          'Verifica que los filtros no sean muy restrictivos',
          'Limpia filtros para ver todos los resultados disponibles',
        ];
      default:
        return [];
    }
  };

  const displayTips = tips.length > 0 ? tips : getDefaultTips();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {/* Illustration */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-6"
      >
        {getIllustration()}
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="font-bold text-lg text-[--esap-gray-900] mb-2"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-[--esap-gray-600] max-w-md mb-6"
      >
        {description}
      </motion.p>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-bold hover:-translate-y-0.5 hover:shadow-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, #1e5da8 0%, #2a6dbd 100%)',
              boxShadow: 'var(--esap-shadow-md)',
            }}
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            {actionLabel}
          </button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-[--esap-gray-300] bg-white text-[--esap-gray-700] rounded-xl text-sm font-bold hover:bg-[--esap-gray-50] hover:-translate-y-0.5 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            {secondaryActionLabel}
          </button>
        )}
      </motion.div>

      {/* Educational Tips */}
      {showTips && displayTips.length > 0 && (
        <ContextualHelp 
          title="💡 Consejos útiles" 
          items={displayTips}
        />
      )}
    </motion.div>
  );
}

// Ilustraciones SVG personalizadas
function ShieldIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 2, 0, -2, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="w-full h-full flex items-center justify-center"
      >
        <div
          className="w-28 h-28 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-200 rounded-full opacity-30" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-blue-300 rounded-full opacity-20" />
          
          {/* Shield icon */}
          <Shield className="w-14 h-14 text-[--esap-primary] relative z-10" strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Floating particles */}
      <motion.div
        animate={{ y: [-10, 10, -10], x: [0, 5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 right-0 w-3 h-3 bg-blue-400 rounded-full opacity-60"
      />
      <motion.div
        animate={{ y: [10, -10, 10], x: [0, -5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute bottom-4 left-0 w-2 h-2 bg-blue-300 rounded-full opacity-50"
      />
    </div>
  );
}

function PermissionsIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        animate={{
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="w-full h-full flex items-center justify-center"
      >
        <div
          className="w-28 h-28 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
          }}
        >
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-200 rounded-full opacity-30" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-yellow-300 rounded-full opacity-20" />
          
          <FileText className="w-14 h-14 text-yellow-600 relative z-10" strokeWidth={1.5} />
        </div>
      </motion.div>

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        className="absolute top-2 right-2 w-4 h-4 border-2 border-yellow-400 border-dashed rounded-full"
      />
    </div>
  );
}

function SearchIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="w-full h-full flex items-center justify-center"
      >
        <div
          className="w-28 h-28 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
          }}
        >
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-purple-200 rounded-full opacity-30" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-purple-300 rounded-full opacity-20" />
          
          <Search className="w-14 h-14 text-purple-600 relative z-10" strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Animated search circles */}
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
        }}
        className="absolute inset-0 border-2 border-purple-300 rounded-full"
      />
    </div>
  );
}

function UsersIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        animate={{
          scale: [1, 1.03, 1],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="w-full h-full flex items-center justify-center"
      >
        <div
          className="w-28 h-28 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
          }}
        >
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-green-200 rounded-full opacity-30" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-green-300 rounded-full opacity-20" />
          
          <Users className="w-14 h-14 text-green-600 relative z-10" strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Floating user icons */}
      <motion.div
        animate={{ y: [-5, 5, -5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-2 left-2"
      >
        <div className="w-4 h-4 bg-green-400 rounded-full opacity-60" />
      </motion.div>
      <motion.div
        animate={{ y: [5, -5, 5] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        className="absolute bottom-2 right-2"
      >
        <div className="w-3 h-3 bg-green-500 rounded-full opacity-50" />
      </motion.div>
    </div>
  );
}

function DefaultIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="w-full h-full flex items-center justify-center"
      >
        <div
          className="w-28 h-28 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
          }}
        >
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-gray-200 rounded-full opacity-30" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gray-300 rounded-full opacity-20" />
          
          <Sparkles className="w-14 h-14 text-gray-500 relative z-10" strokeWidth={1.5} />
        </div>
      </motion.div>
    </div>
  );
}

// New Illustrations
function GraduatesIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="w-full h-full flex items-center justify-center"
      >
        <div
          className="w-28 h-28 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' }}
        >
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-200 rounded-full opacity-30" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-yellow-300 rounded-full opacity-20" />
          <GraduationCap className="w-14 h-14 text-yellow-700 relative z-10" strokeWidth={1.5} />
        </div>
      </motion.div>
    </div>
  );
}

function RequestsIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="w-full h-full flex items-center justify-center"
      >
        <div
          className="w-28 h-28 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)' }}
        >
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-200 rounded-full opacity-30" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-blue-300 rounded-full opacity-20" />
          <ClipboardList className="w-14 h-14 text-blue-600 relative z-10" strokeWidth={1.5} />
        </div>
      </motion.div>
    </div>
  );
}

function ReportsIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="w-full h-full flex items-center justify-center"
      >
        <div
          className="w-28 h-28 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%)' }}
        >
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-indigo-200 rounded-full opacity-30" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-indigo-300 rounded-full opacity-20" />
          <BarChart3 className="w-14 h-14 text-indigo-600 relative z-10" strokeWidth={1.5} />
        </div>
      </motion.div>
    </div>
  );
}

function AspirantsIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        className="w-full h-full flex items-center justify-center"
      >
        <div
          className="w-28 h-28 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 100%)' }}
        >
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-pink-200 rounded-full opacity-30" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-pink-300 rounded-full opacity-20" />
          <UserCheck className="w-14 h-14 text-pink-600 relative z-10" strokeWidth={1.5} />
        </div>
      </motion.div>
    </div>
  );
}

function CertificatesIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        className="w-full h-full flex items-center justify-center"
      >
        <div
          className="w-28 h-28 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)' }}
        >
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-200 rounded-full opacity-30" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-emerald-300 rounded-full opacity-20" />
          <FileCheck className="w-14 h-14 text-emerald-600 relative z-10" strokeWidth={1.5} />
        </div>
      </motion.div>
    </div>
  );
}

function EnrollmentsIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 3.3, repeat: Infinity, ease: 'easeInOut' }}
        className="w-full h-full flex items-center justify-center"
      >
        <div
          className="w-28 h-28 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #FED7AA 0%, #FDBA74 100%)' }}
        >
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-orange-200 rounded-full opacity-30" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-orange-300 rounded-full opacity-20" />
          <ClipboardList className="w-14 h-14 text-orange-600 relative z-10" strokeWidth={1.5} />
        </div>
      </motion.div>
    </div>
  );
}

function NoDataIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="w-full h-full flex items-center justify-center"
      >
        <div
          className="w-28 h-28 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)' }}
        >
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-gray-200 rounded-full opacity-30" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gray-300 rounded-full opacity-20" />
          <FolderOpen className="w-14 h-14 text-gray-500 relative z-10" strokeWidth={1.5} />
        </div>
      </motion.div>
    </div>
  );
}

function NoResultsIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        className="w-full h-full flex items-center justify-center"
      >
        <div
          className="w-28 h-28 rounded-2xl flex items-center justify-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' }}
        >
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-amber-200 rounded-full opacity-30" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-amber-300 rounded-full opacity-20" />
          <AlertCircle className="w-14 h-14 text-amber-600 relative z-10" strokeWidth={1.5} />
        </div>
      </motion.div>
    </div>
  );
}

// Componente para mostrar ayuda contextual mejorado
export function ContextualHelp({ title, items }: { title: string; items: string[] }) {
  const tipIcons = [Lightbulb, Zap, Users]; // Rotar iconos
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-8 w-full max-w-4xl mx-auto"
    >
      <h4 className="text-sm font-bold text-gray-900 mb-4 text-center flex items-center justify-center gap-2">
        <Sparkles className="w-5 h-5 text-yellow-500" />
        {title}
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item, index) => {
          const Icon = tipIcons[index % tipIcons.length];
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 
                       rounded-lg border border-blue-100 hover:border-blue-200
                       hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="text-[#1e5da8] flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{item}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
