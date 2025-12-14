import { Download, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

export interface DocumentCardProps {
  id: string;
  title: string;
  subtitle: string;
  size: string;
  uploadDate: string;
  type: 'PDF' | 'JPG' | 'PNG' | 'DOC' | 'DOCX' | 'XLS' | 'XLSX';
  category: string;
  icon: LucideIcon;
  colorScheme: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal' | 'pink' | 'indigo';
  onView?: () => void;
  onDownload?: () => void;
  status?: 'verified' | 'pending' | 'rejected';
}

const colorSchemes = {
  blue: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-500',
    button: 'bg-blue-600 hover:bg-blue-700',
    border: 'border-blue-100',
  },
  green: {
    bg: 'bg-green-50',
    iconBg: 'bg-green-500',
    button: 'bg-green-600 hover:bg-green-700',
    border: 'border-green-100',
  },
  purple: {
    bg: 'bg-purple-50',
    iconBg: 'bg-purple-500',
    button: 'bg-purple-600 hover:bg-purple-700',
    border: 'border-purple-100',
  },
  orange: {
    bg: 'bg-orange-50',
    iconBg: 'bg-orange-500',
    button: 'bg-orange-600 hover:bg-orange-700',
    border: 'border-orange-100',
  },
  red: {
    bg: 'bg-red-50',
    iconBg: 'bg-red-500',
    button: 'bg-red-600 hover:bg-red-700',
    border: 'border-red-100',
  },
  teal: {
    bg: 'bg-teal-50',
    iconBg: 'bg-teal-500',
    button: 'bg-teal-600 hover:bg-teal-700',
    border: 'border-teal-100',
  },
  pink: {
    bg: 'bg-pink-50',
    iconBg: 'bg-pink-500',
    button: 'bg-pink-600 hover:bg-pink-700',
    border: 'border-pink-100',
  },
  indigo: {
    bg: 'bg-indigo-50',
    iconBg: 'bg-indigo-500',
    button: 'bg-indigo-600 hover:bg-indigo-700',
    border: 'border-indigo-100',
  },
};

const categoryColors: Record<string, string> = {
  'Académico': 'bg-purple-100 text-purple-700',
  'Identificación': 'bg-blue-100 text-blue-700',
  'Certificación': 'bg-orange-100 text-orange-700',
  'Personal': 'bg-indigo-100 text-indigo-700',
  'Administrativo': 'bg-teal-100 text-teal-700',
  'Salud': 'bg-green-100 text-green-700',
  'default': 'bg-gray-100 text-gray-700',
};

const statusLabels = {
  verified: 'Verificado',
  pending: 'Pendiente',
  rejected: 'Rechazado',
};

export function DocumentCard({
  title,
  subtitle,
  size,
  uploadDate,
  type,
  category,
  icon: Icon,
  colorScheme,
  onView,
  onDownload,
  status,
}: DocumentCardProps) {
  const colors = colorSchemes[colorScheme];
  const categoryColor = categoryColors[category] || categoryColors.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`relative rounded-2xl p-5 border ${colors.border} ${colors.bg} hover:shadow-lg transition-all duration-200 group`}
    >
      {/* Icon */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <Icon className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">
            {title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-1">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Tamaño</p>
          <p className="font-semibold text-gray-900">{size}</p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-xs text-gray-500">Cargado</p>
          <p className="font-semibold text-gray-900">{uploadDate}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
          {type}
        </span>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${categoryColor}`}>
          {category}
        </span>
        {status && (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
            status === 'verified' ? 'bg-green-100 text-green-700' :
            status === 'pending' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {statusLabels[status]}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onView}
          className={`flex-1 ${colors.button} text-white px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md`}
        >
          <Eye className="w-4 h-4" />
          Ver Documento
        </button>
        <button
          onClick={onDownload}
          className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md group/download"
        >
          <Download className="w-4 h-4 text-gray-700 group-hover/download:text-gray-900" />
        </button>
      </div>
    </motion.div>
  );
}
