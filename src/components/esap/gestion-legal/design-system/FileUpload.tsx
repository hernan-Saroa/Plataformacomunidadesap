/**
 * FILE UPLOAD SIGL - Sistema Integral de Gestión Legal
 * Componente de drag & drop para archivos adjuntos
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  File, 
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  X,
  Check,
  AlertCircle,
  Download,
} from 'lucide-react';
import DESIGN_TOKENS from './tokens';
import { ButtonSIGL, IconButtonSIGL } from './Button';
import { TooltipSIGL } from './TooltipSIGL';
import { BadgeSIGL } from './BadgeSIGL';

// ========================================
// TIPOS
// ========================================

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'success' | 'error';
  progress: number; // 0-100
  error?: string;
  url?: string; // URL si ya está subido
}

export interface FileUploadProps {
  // Validación
  accept?: string; // ej: ".pdf,.doc,.docx"
  maxSize?: number; // en bytes (default: 10MB)
  maxFiles?: number; // máximo de archivos (default: 5)
  
  // Archivos
  files?: UploadedFile[];
  onChange?: (files: UploadedFile[]) => void;
  
  // Upload handler
  onUpload?: (file: File) => Promise<string>; // Retorna URL del archivo subido
  
  // Estados
  disabled?: boolean;
  multiple?: boolean;
  
  // Estilos
  compact?: boolean;
  showPreview?: boolean;
  
  // Mensajes
  label?: string;
  helperText?: string;
  errorText?: string;
  
  className?: string;
}

export function FileUpload({
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  files = [],
  onChange,
  onUpload,
  disabled = false,
  multiple = true,
  compact = false,
  showPreview = true,
  label,
  helperText,
  errorText,
  className = '',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(files);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validar archivo
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Validar tamaño
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      return { 
        valid: false, 
        error: `El archivo excede el tamaño máximo de ${maxSizeMB}MB` 
      };
    }

    // Validar tipo (si se especifica accept)
    if (accept) {
      const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      const fileType = file.type.toLowerCase();
      
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExt === type;
        }
        return fileType.includes(type.replace('*', ''));
      });

      if (!isAccepted) {
        return { 
          valid: false, 
          error: `Tipo de archivo no permitido. Solo: ${accept}` 
        };
      }
    }

    // Validar cantidad máxima
    if (uploadedFiles.length >= maxFiles) {
      return { 
        valid: false, 
        error: `Máximo ${maxFiles} archivos permitidos` 
      };
    }

    return { valid: true };
  };

  // Procesar archivos
  const processFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const filesToProcess = multiple 
      ? Array.from(fileList) 
      : [fileList[0]];

    const newFiles: UploadedFile[] = [];

    for (const file of filesToProcess) {
      const validation = validateFile(file);

      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: validation.valid ? 'uploading' : 'error',
        progress: 0,
        error: validation.error,
      };

      newFiles.push(uploadedFile);

      // Si es válido y hay handler, subir
      if (validation.valid && onUpload) {
        try {
          // Simular progreso
          const progressInterval = setInterval(() => {
            setUploadedFiles(prev => 
              prev.map(f => 
                f.id === uploadedFile.id && f.progress < 90
                  ? { ...f, progress: f.progress + 10 }
                  : f
              )
            );
          }, 200);

          const url = await onUpload(file);
          clearInterval(progressInterval);

          setUploadedFiles(prev =>
            prev.map(f =>
              f.id === uploadedFile.id
                ? { ...f, status: 'success', progress: 100, url }
                : f
            )
          );
        } catch (error) {
          setUploadedFiles(prev =>
            prev.map(f =>
              f.id === uploadedFile.id
                ? { 
                    ...f, 
                    status: 'error', 
                    error: 'Error al subir el archivo' 
                  }
                : f
            )
          );
        }
      }
    }

    const updatedFiles = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updatedFiles);
    onChange?.(updatedFiles);
  }, [uploadedFiles, multiple, maxFiles, onUpload, onChange]);

  // Drag & Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!disabled) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Click handler
  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  // Remove file
  const handleRemove = (id: string) => {
    const updatedFiles = uploadedFiles.filter(f => f.id !== id);
    setUploadedFiles(updatedFiles);
    onChange?.(updatedFiles);
  };

  // Retry upload
  const handleRetry = async (fileToRetry: UploadedFile) => {
    if (!onUpload) return;

    setUploadedFiles(prev =>
      prev.map(f =>
        f.id === fileToRetry.id
          ? { ...f, status: 'uploading', progress: 0, error: undefined }
          : f
      )
    );

    try {
      const url = await onUpload(fileToRetry.file);
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileToRetry.id
            ? { ...f, status: 'success', progress: 100, url }
            : f
        )
      );
    } catch (error) {
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileToRetry.id
            ? { ...f, status: 'error', error: 'Error al subir el archivo' }
            : f
        )
      );
    }
  };

  // Get file icon
  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon size={20} />;
    if (type.includes('pdf')) return <FileText size={20} />;
    if (type.includes('sheet') || type.includes('excel')) return <FileSpreadsheet size={20} />;
    return <File size={20} />;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      {/* Label */}
      {label && (
        <label
          className="block mb-2"
          style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.label,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral.darkGray,
          }}
        >
          {label}
        </label>
      )}

      {/* Drop Zone */}
      <motion.div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        whileHover={!disabled ? { scale: 1.01 } : {}}
        transition={{ duration: 0.2 }}
        className="relative"
        style={{
          padding: compact ? '24px' : '48px 24px',
          border: `2px dashed ${
            isDragging 
              ? DESIGN_TOKENS.colors.primary.blue 
              : errorText
              ? DESIGN_TOKENS.colors.status.red
              : DESIGN_TOKENS.colors.neutral.lightGray
          }`,
          borderRadius: DESIGN_TOKENS.borderRadius.medium,
          background: isDragging 
            ? DESIGN_TOKENS.colors.primary.light 
            : DESIGN_TOKENS.colors.primary.white,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? DESIGN_TOKENS.opacity.disabled : 1,
          transition: 'all 0.2s',
          textAlign: 'center',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => processFiles(e.target.files)}
          className="hidden"
        />

        <Upload 
          size={compact ? 32 : 48} 
          style={{ 
            color: isDragging 
              ? DESIGN_TOKENS.colors.primary.blue 
              : DESIGN_TOKENS.colors.neutral.mediumGray,
            margin: '0 auto 16px',
          }} 
        />

        <p
          style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.body,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            color: DESIGN_TOKENS.colors.neutral.darkGray,
            marginBottom: '8px',
          }}
        >
          {isDragging 
            ? 'Suelta los archivos aquí' 
            : 'Arrastra archivos aquí o haz click para seleccionar'}
        </p>

        {helperText && !errorText && (
          <p
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.small,
              color: DESIGN_TOKENS.colors.neutral.mediumGray,
            }}
          >
            {helperText}
          </p>
        )}
      </motion.div>

      {/* Error Message */}
      {errorText && (
        <p
          className="mt-2"
          style={{
            fontSize: DESIGN_TOKENS.typography.fontSize.small,
            color: DESIGN_TOKENS.colors.status.red,
          }}
        >
          {errorText}
        </p>
      )}

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <AnimatePresence>
            {uploadedFiles.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                style={{
                  padding: '12px',
                  background: DESIGN_TOKENS.colors.neutral.veryLightGray,
                  border: `1px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
                  borderRadius: DESIGN_TOKENS.borderRadius.small,
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div
                    style={{
                      color: file.status === 'success' 
                        ? DESIGN_TOKENS.colors.status.green
                        : file.status === 'error'
                        ? DESIGN_TOKENS.colors.status.red
                        : DESIGN_TOKENS.colors.primary.blue,
                    }}
                  >
                    {getFileIcon(file.type)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.body,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                        color: DESIGN_TOKENS.colors.neutral.darkGray,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.small,
                          color: DESIGN_TOKENS.colors.neutral.mediumGray,
                        }}
                      >
                        {formatFileSize(file.size)}
                      </span>
                      
                      {file.status === 'uploading' && (
                        <span
                          style={{
                            fontSize: DESIGN_TOKENS.typography.fontSize.small,
                            color: DESIGN_TOKENS.colors.primary.blue,
                          }}
                        >
                          • Subiendo {file.progress}%
                        </span>
                      )}
                      
                      {file.status === 'error' && file.error && (
                        <span
                          style={{
                            fontSize: DESIGN_TOKENS.typography.fontSize.small,
                            color: DESIGN_TOKENS.colors.status.red,
                          }}
                        >
                          • {file.error}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {file.status === 'uploading' && (
                      <div
                        className="mt-2"
                        style={{
                          height: '4px',
                          background: DESIGN_TOKENS.colors.neutral.lightGray,
                          borderRadius: '2px',
                          overflow: 'hidden',
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${file.progress}%` }}
                          transition={{ duration: 0.3 }}
                          style={{
                            height: '100%',
                            background: DESIGN_TOKENS.colors.primary.blue,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  {file.status === 'success' && (
                    <Check 
                      size={20} 
                      style={{ color: DESIGN_TOKENS.colors.status.green }} 
                    />
                  )}
                  {file.status === 'error' && (
                    <TooltipSIGL content="Reintentar subida">
                      <button
                        onClick={() => handleRetry(file)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: DESIGN_TOKENS.colors.status.red,
                          padding: '4px',
                        }}
                      >
                        <AlertCircle size={20} />
                      </button>
                    </TooltipSIGL>
                  )}

                  {/* Actions */}
                  <TooltipSIGL content="Eliminar archivo">
                    <IconButtonSIGL
                      icon={<X size={16} />}
                      variant="danger"
                      onClick={() => handleRemove(file.id)}
                    />
                  </TooltipSIGL>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
