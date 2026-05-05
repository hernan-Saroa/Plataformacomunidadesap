/**
 * Bolsa de Empleo - Portal Transaccional
 * 
 * Vista para graduados y estudiantes donde pueden:
 * - Ver ofertas de empleo activas
 * - Filtrar por categoría, ubicación, salario
 * - Ver detalles de cada oferta
 * - Aplicar a las ofertas
 * - Guardar ofertas favoritas
 * - Ver mis aplicaciones
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Clock,
  Eye,
  Search,
  Filter,
  Heart,
  Share2,
  X,
  Send,
  FileText,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Mail,
  Phone,
  Globe,
  Bookmark,
  BookmarkCheck,
  Upload,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

interface JobBoardPortalProps {
  userRole: 'Estudiante' | 'Graduado';
  userName: string;
  userEmail: string;
  onBack?: () => void;
}

type JobStatus = 'active' | 'paused' | 'closed' | 'draft';
type ContractType = 'Tiempo Completo' | 'Medio Tiempo' | 'Por Proyecto' | 'Práctica';
type ExperienceLevel = 'Sin Experiencia' | 'Junior' | 'Semi-Senior' | 'Senior' | 'Experto';

interface JobOffer {
  id: number;
  title: string;
  company: string;
  companyLogo: string;
  location: string;
  locationType: 'Presencial' | 'Remoto' | 'Híbrido';
  contractType: ContractType;
  experienceLevel: ExperienceLevel;
  salary: string;
  category: string;
  tags: string[];
  status: JobStatus;
  postedDate: string;
  deadline: string;
  description: string;
  requirements: string[];
  benefits: string[];
  viewsCount: number;
  contactEmail: string;
  contactPhone?: string;
  companyWebsite?: string;
  isSaved?: boolean;
  hasApplied?: boolean;
}

export function JobBoardPortal({ userRole, userName, userEmail, onBack }: JobBoardPortalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<JobOffer | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [savedJobs, setSavedJobs] = useState<number[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<'all' | 'saved' | 'applied'>('all');

  // Mock data - Ofertas de empleo activas (solo las que son 'active')
  const mockJobs: JobOffer[] = [
    {
      id: 1,
      title: 'Analista de Políticas Públicas',
      company: 'Ministerio de Hacienda',
      companyLogo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop',
      location: 'Bogotá, Colombia',
      locationType: 'Presencial',
      contractType: 'Tiempo Completo',
      experienceLevel: 'Junior',
      salary: '$3.500.000 - $4.500.000',
      category: 'Administración Pública',
      tags: ['Políticas Públicas', 'Análisis', 'Gobierno'],
      status: 'active',
      postedDate: '10 Nov 2025',
      deadline: '30 Nov 2025',
      description: 'Buscamos un analista para apoyar el diseño e implementación de políticas públicas en el sector fiscal. El candidato ideal tendrá pasión por el servicio público y habilidades analíticas sobresalientes.',
      requirements: [
        'Título profesional en Administración Pública o áreas afines',
        'Conocimiento en análisis de datos y estadística',
        'Experiencia mínima de 1 año en sector público',
        'Excelentes habilidades de comunicación escrita y oral',
      ],
      benefits: [
        'Prestaciones de ley superiores',
        'Horario flexible',
        'Oportunidades de capacitación y desarrollo profesional',
        'Bonificación por desempeño',
      ],
      viewsCount: 456,
      contactEmail: 'reclutamiento@minhacienda.gov.co',
      contactPhone: '+57 310 555 0123',
      companyWebsite: 'https://www.minhacienda.gov.co',
    },
    {
      id: 2,
      title: 'Coordinador de Gestión Territorial',
      company: 'Alcaldía de Medellín',
      companyLogo: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=100&h=100&fit=crop',
      location: 'Medellín, Antioquia',
      locationType: 'Híbrido',
      contractType: 'Tiempo Completo',
      experienceLevel: 'Semi-Senior',
      salary: '$5.000.000 - $6.500.000',
      category: 'Gestión Territorial',
      tags: ['Coordinación', 'Gestión Pública', 'Liderazgo'],
      status: 'active',
      postedDate: '8 Nov 2025',
      deadline: '25 Nov 2025',
      description: 'Coordinador para liderar proyectos de desarrollo territorial y comunitario en la ciudad. Trabajarás directamente con comunidades y stakeholders para impulsar el desarrollo local.',
      requirements: [
        'Título profesional en Administración Pública',
        'Especialización en Gestión Territorial',
        'Mínimo 3 años de experiencia en proyectos territoriales',
        'Capacidad de liderazgo y trabajo en equipo',
      ],
      benefits: [
        'Salario competitivo',
        'Bonificación anual por resultados',
        'Seguro de vida',
        'Plan de desarrollo de carrera',
      ],
      viewsCount: 342,
      contactEmail: 'talento@medellin.gov.co',
      companyWebsite: 'https://www.medellin.gov.co',
    },
    {
      id: 3,
      title: 'Pasante de Investigación en Transparencia',
      company: 'Transparencia Internacional',
      companyLogo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=100&h=100&fit=crop',
      location: 'Remoto',
      locationType: 'Remoto',
      contractType: 'Práctica',
      experienceLevel: 'Sin Experiencia',
      salary: '$1.500.000',
      category: 'Investigación',
      tags: ['Investigación', 'Anticorrupción', 'Remoto'],
      status: 'active',
      postedDate: '15 Nov 2025',
      deadline: '5 Dic 2025',
      description: 'Pasantía en investigación sobre transparencia y anticorrupción en América Latina. Ideal para estudiantes o recién graduados apasionados por la transparencia gubernamental.',
      requirements: [
        'Estudiante o recién graduado en Ciencia Política o carreras afines',
        'Interés en temas de transparencia y gobernanza',
        'Habilidades de investigación y redacción',
        'Inglés intermedio (deseable)',
      ],
      benefits: [
        'Certificado de práctica profesional',
        'Mentoría de expertos internacionales',
        'Horario flexible 100% remoto',
        'Posibilidad de contratación posterior',
      ],
      viewsCount: 678,
      contactEmail: 'practicas@transparency.org',
      companyWebsite: 'https://www.transparency.org',
    },
  ];

  // Actualizar jobs con estado de guardado y aplicado
  const jobsWithStatus = mockJobs.map(job => ({
    ...job,
    isSaved: savedJobs.includes(job.id),
    hasApplied: appliedJobs.includes(job.id),
  }));

  // Filtrar trabajos
  const filteredJobs = jobsWithStatus.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || job.category === categoryFilter;
    const matchesView = 
      activeView === 'all' ? true :
      activeView === 'saved' ? job.isSaved :
      activeView === 'applied' ? job.hasApplied : true;
    
    return matchesSearch && matchesCategory && matchesView;
  });

  const categories = ['all', ...Array.from(new Set(mockJobs.map(j => j.category)))];

  const handleToggleSave = (jobId: number) => {
    setSavedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
    toast.success(
      savedJobs.includes(jobId) 
        ? 'Oferta removida de guardados' 
        : 'Oferta guardada exitosamente'
    );
  };

  const handleApply = (job: JobOffer) => {
    setSelectedJob(job);
    setShowApplicationModal(true);
  };

  const handleSubmitApplication = () => {
    if (selectedJob && !appliedJobs.includes(selectedJob.id)) {
      setAppliedJobs(prev => [...prev, selectedJob.id]);
      toast.success('¡Aplicación enviada exitosamente!', {
        description: 'La empresa revisará tu perfil y te contactará pronto.',
      });
      setShowApplicationModal(false);
      setSelectedJob(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1e5da8] via-[#2563eb] to-[#3b82f6] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black mb-2 flex items-center gap-3">
                <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
                  <Briefcase className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                Bolsa de Empleo ESAP
              </h1>
              <p className="text-white/90 text-sm sm:text-base">
                Oportunidades exclusivas para la comunidad ESAP
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md">
                {userRole}
              </Badge>
              <Badge className="bg-green-500 text-white border-none">
                {mockJobs.length} ofertas activas
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setActiveView('all')}
              className={`p-3 rounded-xl border-2 transition-all ${
                activeView === 'all' 
                  ? 'border-[#1e5da8] bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Briefcase className={`w-5 h-5 mx-auto mb-1 ${activeView === 'all' ? 'text-[#1e5da8]' : 'text-gray-500'}`} />
              <p className="font-bold text-lg">{mockJobs.length}</p>
              <p className="text-xs text-gray-600">Todas</p>
            </button>
            <button
              onClick={() => setActiveView('saved')}
              className={`p-3 rounded-xl border-2 transition-all ${
                activeView === 'saved' 
                  ? 'border-[#1e5da8] bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Heart className={`w-5 h-5 mx-auto mb-1 ${activeView === 'saved' ? 'text-[#1e5da8]' : 'text-gray-500'}`} />
              <p className="font-bold text-lg">{savedJobs.length}</p>
              <p className="text-xs text-gray-600">Guardadas</p>
            </button>
            <button
              onClick={() => setActiveView('applied')}
              className={`p-3 rounded-xl border-2 transition-all ${
                activeView === 'applied' 
                  ? 'border-[#1e5da8] bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Send className={`w-5 h-5 mx-auto mb-1 ${activeView === 'applied' ? 'text-[#1e5da8]' : 'text-gray-500'}`} />
              <p className="font-bold text-lg">{appliedJobs.length}</p>
              <p className="text-xs text-gray-600">Aplicadas</p>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar por cargo, empresa, ubicación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>

          {/* Category Filter - Scroll horizontal */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(category => (
              <Button
                key={category}
                variant={categoryFilter === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(category)}
                className={categoryFilter === category ? 'bg-[#1e5da8]' : ''}
              >
                {category === 'all' ? 'Todas las Categorías' : category}
              </Button>
            ))}
          </div>
        </div>

        {/* Jobs Grid */}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {activeView === 'saved' ? 'No tienes ofertas guardadas' :
               activeView === 'applied' ? 'No has aplicado a ninguna oferta aún' :
               'No se encontraron ofertas'}
            </h3>
            <p className="text-gray-600 mb-6">
              {activeView === 'all' 
                ? 'Intenta ajustar tus filtros de búsqueda'
                : 'Explora las ofertas disponibles y guarda las que te interesen'
              }
            </p>
            {activeView !== 'all' && (
              <Button onClick={() => setActiveView('all')}>
                Ver todas las ofertas
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="hover:shadow-xl transition-all duration-200 border-2 hover:border-[#1e5da8] group relative overflow-hidden h-full flex flex-col">
                  <CardContent className="p-4 flex flex-col h-full">
                    {/* Header with Logo and Save Button */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 ring-2 ring-gray-200 group-hover:ring-[#1e5da8] transition-all">
                        <img src={job.companyLogo} alt={job.company} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSave(job.id);
                          }}
                          className={`p-2 rounded-lg transition-all ${
                            job.isSaved 
                              ? 'bg-red-50 text-red-600' 
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {job.isSaved ? (
                            <Heart className="w-4 h-4 fill-current" />
                          ) : (
                            <Heart className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Job Title */}
                    <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-[#1e5da8] transition-colors">
                      {job.title}
                    </h3>

                    {/* Company */}
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-3">
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate font-medium">{job.company}</span>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 mb-3 flex-1">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{job.contractType}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-green-600">
                        <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{job.salary}</span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                        {job.locationType}
                      </Badge>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                        {job.experienceLevel}
                      </Badge>
                    </div>

                    <Separator className="my-3" />

                    {/* Footer with Actions */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{job.viewsCount} vistas</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Cierra: {job.deadline.split(' ')[0]}/{job.deadline.split(' ')[1]}</span>
                        </div>
                      </div>

                      {job.hasApplied ? (
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700 gap-2" 
                          disabled
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Ya Aplicaste
                        </Button>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setSelectedJob(job)}
                            className="text-xs"
                          >
                            Ver Detalles
                          </Button>
                          <Button
                            onClick={() => handleApply(job)}
                            className="bg-[#1e5da8] hover:bg-[#174a8a] text-xs gap-1"
                          >
                            <Send className="w-3 h-3" />
                            Aplicar
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Applied Badge Overlay */}
                    {job.hasApplied && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-green-600 text-white shadow-lg">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Aplicado
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Job Detail Modal */}
      <AnimatePresence mode="wait">
        {selectedJob && !showApplicationModal && (
          <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSelectedJob(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400, mass: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full md:max-w-3xl bg-white shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-auto md:max-h-[85vh] rounded-t-3xl md:rounded-2xl"
            >
              {/* Mobile Drag Handle */}
              <div className="md:hidden flex justify-center pt-3 pb-1 bg-gradient-to-br from-[#1e5da8] to-[#2563eb]">
                <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
              </div>

              {/* Header */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#1e5da8] via-[#2563eb] to-[#3b82f6] px-5 py-5">
                <div className="relative flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-md overflow-hidden flex-shrink-0 ring-4 ring-white/30">
                    <img src={selectedJob.companyLogo} alt={selectedJob.company} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl md:text-2xl font-black text-white mb-1">{selectedJob.title}</h2>
                    <p className="text-white/90 font-semibold mb-2">{selectedJob.company}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-white/20 text-white border-white/30">
                        <Eye className="w-3 h-3 mr-1" />
                        {selectedJob.viewsCount} vistas
                      </Badge>
                      {selectedJob.hasApplied && (
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Ya Aplicaste
                        </Badge>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all border border-white/20 flex-shrink-0"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-5">
                  {/* Key Details Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-600">Ubicación</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{selectedJob.location}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedJob.locationType}</p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-600">Contrato</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{selectedJob.contractType}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedJob.experienceLevel}</p>
                    </div>

                    <div className="bg-green-50 rounded-xl p-3 border-2 border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-700 font-semibold">Salario</span>
                      </div>
                      <p className="text-sm font-bold text-green-700">{selectedJob.salary}</p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-600">Fecha Límite</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{selectedJob.deadline}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Publicado: {selectedJob.postedDate}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#1e5da8]" />
                      Descripción
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{selectedJob.description}</p>
                  </div>

                  {/* Requirements */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#1e5da8]" />
                      Requisitos
                    </h3>
                    <ul className="space-y-2">
                      {selectedJob.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#1e5da8] mt-1.5 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Benefits */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#1e5da8]" />
                      Beneficios
                    </h3>
                    <ul className="space-y-2">
                      {selectedJob.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                    <h3 className="font-bold text-gray-900 mb-3">Información de Contacto</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <a href={`mailto:${selectedJob.contactEmail}`} className="text-[#1e5da8] hover:underline">
                          {selectedJob.contactEmail}
                        </a>
                      </div>
                      {selectedJob.contactPhone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">{selectedJob.contactPhone}</span>
                        </div>
                      )}
                      {selectedJob.companyWebsite && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="w-4 h-4 text-gray-500" />
                          <a href={selectedJob.companyWebsite} target="_blank" rel="noopener noreferrer" className="text-[#1e5da8] hover:underline">
                            Sitio web
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 bg-white px-5 py-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => handleToggleSave(selectedJob.id)}
                  >
                    {selectedJob.isSaved ? (
                      <>
                        <Heart className="w-4 h-4 fill-current text-red-600" />
                        Guardada
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4" />
                        Guardar
                      </>
                    )}
                  </Button>
                  {!selectedJob.hasApplied && (
                    <Button
                      className="flex-1 gap-2 bg-[#1e5da8] hover:bg-[#174a8a]"
                      onClick={() => handleApply(selectedJob)}
                    >
                      <Send className="w-4 h-4" />
                      Aplicar Ahora
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Application Modal */}
      <AnimatePresence mode="wait">
        {showApplicationModal && selectedJob && (
          <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setShowApplicationModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400, mass: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full md:max-w-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] rounded-t-3xl md:rounded-2xl"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#1e5da8] to-[#2563eb] px-5 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Aplicar a la Oferta</h2>
                  <p className="text-white/80 text-sm">{selectedJob.title}</p>
                </div>
                <button
                  onClick={() => setShowApplicationModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-4">
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Tus datos de contacto:</strong> {userName} ({userEmail})
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-900 mb-2">
                      Carta de Presentación *
                    </label>
                    <Textarea
                      placeholder="Cuéntale a la empresa por qué eres el candidato ideal para este puesto..."
                      rows={6}
                      className="resize-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-900 mb-2">
                      Adjuntar CV (opcional)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#1e5da8] transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Haz clic para seleccionar o arrastra tu CV aquí
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, DOC, DOCX (max 5MB)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 px-5 py-4">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowApplicationModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-[#1e5da8] hover:bg-[#174a8a] gap-2"
                    onClick={handleSubmitApplication}
                  >
                    <Send className="w-4 h-4" />
                    Enviar Aplicación
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}