import { useState } from 'react';
import { X, Send, Upload, FileText, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface JobOffer {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  tags: string[];
}

interface ApplyToJobModalProps {
  job: JobOffer;
  isOpen: boolean;
  onClose: () => void;
}

export function ApplyToJobModal({ job, isOpen, onClose }: ApplyToJobModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    coverLetter: '',
    cvFile: null as File | null,
    availability: 'inmediato',
    acceptTerms: false,
  });
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Solo se permiten archivos PDF');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo no debe superar 5MB');
        return;
      }
      setFormData({ ...formData, cvFile: file });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Solo se permiten archivos PDF');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo no debe superar 5MB');
        return;
      }
      setFormData({ ...formData, cvFile: file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.phone) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    if (!formData.cvFile) {
      toast.error('Debes adjuntar tu hoja de vida');
      return;
    }

    if (!formData.acceptTerms) {
      toast.error('Debes aceptar los términos y condiciones');
      return;
    }

    setIsSubmitting(true);

    // Simular envío
    setTimeout(() => {
      toast.success('¡Aplicación enviada exitosamente!', {
        description: `Tu postulación a ${job.title} ha sido recibida. Te contactaremos pronto.`,
        duration: 5000,
      });
      setIsSubmitting(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex-1">
            <h2 className="font-black text-gray-900 mb-1">Aplicar a Oferta</h2>
            <p className="text-sm text-gray-600">{job.title} - {job.company}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Job Info Summary */}
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge className="bg-[#003DA5] text-white">{job.location}</Badge>
            <Badge variant="secondary">{job.salary}</Badge>
            {job.tags.slice(0, 2).map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nombre Completo */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="font-semibold">
              Nombre Completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Ej: Juan Pérez García"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="font-semibold">
              Correo Electrónico <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu.email@esap.edu.co"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="font-semibold">
              Teléfono <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+57 300 123 4567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          {/* CV Upload */}
          <div className="space-y-2">
            <Label className="font-semibold">
              Hoja de Vida (PDF) <span className="text-red-500">*</span>
            </Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                dragActive
                  ? 'border-[#003DA5] bg-blue-50'
                  : formData.cvFile
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="cv-upload"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {formData.cvFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Check className="w-5 h-5" />
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-green-700">
                    {formData.cvFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(formData.cvFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, cvFile: null })}
                  >
                    Cambiar archivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-10 h-10 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-600">
                    Arrastra tu CV aquí o{' '}
                    <label
                      htmlFor="cv-upload"
                      className="text-[#003DA5] font-semibold cursor-pointer hover:underline"
                    >
                      explora tus archivos
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">Solo PDF, máximo 5MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Carta de Presentación */}
          <div className="space-y-2">
            <Label htmlFor="coverLetter" className="font-semibold">
              Carta de Presentación (Opcional)
            </Label>
            <Textarea
              id="coverLetter"
              placeholder="Cuéntanos por qué eres el candidato ideal para esta posición..."
              rows={5}
              value={formData.coverLetter}
              onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              {formData.coverLetter.length}/500 caracteres
            </p>
          </div>

          {/* Disponibilidad */}
          <div className="space-y-2">
            <Label htmlFor="availability" className="font-semibold">
              Disponibilidad
            </Label>
            <select
              id="availability"
              value={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
            >
              <option value="inmediato">Inmediata</option>
              <option value="1-semana">En 1 semana</option>
              <option value="2-semanas">En 2 semanas</option>
              <option value="1-mes">En 1 mes</option>
            </select>
          </div>

          {/* Términos y condiciones */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={formData.acceptTerms}
              onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
              className="mt-1"
            />
            <Label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
              Acepto los términos y condiciones y autorizo el tratamiento de mis datos
              personales de acuerdo con la Ley 1581 de 2012
            </Label>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#003DA5] hover:bg-[#002d7a] gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Enviando...'
              ) : (
                <>
                  Enviar Aplicación
                  <Send className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
