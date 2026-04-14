import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  ArrowLeft,
  AlertCircle,
  Award,
  Calendar,
  User,
  Loader2,
  Building2,
  UserCircle,
  Mail,
  FileText,
  CheckCircle,
  Shield,
  Sparkles,
  MapPin,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { VerificationCertificateDisplay } from "./VerificationCertificateDisplay";
import { VerificationCertificate } from "../../types/index";
import { PublicNavbar } from "./PublicNavbar";
// import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';
import { ESAPLogoSVG } from "../assets/ESAPLogoSVG";
import graduadosService, {
  type CertificadoGraduado,
  type GraduateMatchSuggestion,
} from "../../services/api/graduados.service";
// import { simularEnvioCorreo } from '../../utils/emailTemplates';
// import { validateGraduateForPublicService, type Graduate } from '../../data/graduatesSync';  // ✅ IMPORTAR FUNCIÓN DE VALIDACIÓN
// import { sendGraduateNotificationEmail } from '../../utils/graduateNotificationEmail';

interface PublicTitleVerificationProps {
  onBack: () => void;
  onLoginClick?: () => void;
}

/**
 * LÓGICA DE NEGOCIO - VERIFICACIÓN DE TÍTULOS ESAP
 *
 * Regla fundamental:
 * - TODOS los registros en la base de datos son graduados (Pregrado, Especialización o Maestría)
 * - NO existe el caso de una persona en BD que NO esté graduada
 *
 * Flujos:
 * 1. Si el graduado ESTÁ en la BD -> Certificado generado INSTANTÁNEAMENTE
 * 2. Si el graduado NO está en la BD → Solicitud de revisión manual (15 días hábiles)
 *
 * En el flujo 2, el equipo administrativo revisa registros históricos y:
 * - Si encuentra al graduado → Lo agrega a BD y genera certificado
 * - Si NO lo encuentra → Informa al solicitante que no es graduado ESAP
 *
 * ✅ COORDINADO CON BACKOFFICE:
 * Este servicio consulta directamente el módulo de "Gestión de Graduados" del backoffice
 */

export function PublicTitleVerification({
  onBack,
  onLoginClick,
}: PublicTitleVerificationProps) {
  const manualReviewPromptRef = useRef<HTMLDivElement | null>(null);

  // Scroll to top cuando se monta el componente
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Form states
  const [graduateDocumentNumber, setGraduateDocumentNumber] = useState("");
  const [graduateDocumentIssueDate, setGraduateDocumentIssueDate] =
    useState("");
  const [graduateLastName, setGraduateLastName] = useState("");
  const [requesterName, setRequesterName] = useState(""); // Nombre empresa o del graduado
  const [requesterEmail, setRequesterEmail] = useState("");
  const [companyNIT, setCompanyNIT] = useState(""); // NIT de la empresa
  const [contactPerson, setContactPerson] = useState(""); // Persona de contacto en la empresa
  const [requesterType, setRequesterType] = useState<"empresa" | "graduado">(
    "graduado",
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirmingSelection, setIsConfirmingSelection] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] =
    useState<VerificationCertificate | null>(null);
  const [reviewRequestCreated, setReviewRequestCreated] = useState(false);
  const [matchSuggestions, setMatchSuggestions] = useState<
    GraduateMatchSuggestion[]
  >([]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState("");
  const [showManualReviewDialog, setShowManualReviewDialog] = useState(false);
  const [manualReviewAlertMessage, setManualReviewAlertMessage] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (showManualReviewDialog) {
      manualReviewPromptRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [showManualReviewDialog]);

  // Capturar NIT manualmente; no se consulta ni autocompleta información de empresa.
  const handleNITChange = (nit: string) => {
    setCompanyNIT(nit.replace(/\D+/g, ""));
  };

  const clearMatchSuggestions = () => {
    setMatchSuggestions([]);
    setSelectedSuggestionId("");
    setShowManualReviewDialog(false);
    setManualReviewAlertMessage("");
  };

  const toDateInputValue = (value?: string | null) => {
    if (!value) {
      return "";
    }

    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatInputDate = (value: string) => {
    if (!value) {
      return "";
    }

    const trimmed = value.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]) - 1;
      const day = Number(isoMatch[3]);
      const localDate = new Date(year, month, day, 12, 0, 0);
      return localDate.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
      const day = Number(slashMatch[1]);
      const month = Number(slashMatch[2]) - 1;
      const year = Number(slashMatch[3]);
      const localDate = new Date(year, month, day, 12, 0, 0);
      return localDate.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return trimmed;
    }

    return parsed.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const mapCertificado = (
    certificado: CertificadoGraduado,
    requester: { name: string; email: string; type: "empresa" | "graduado" },
  ): VerificationCertificate => {
    const statusMap: VerificationCertificate["status"] =
      certificado.status === "REVOKED"
        ? "revoked"
        : certificado.status === "EXPIRED"
          ? "expired"
          : "active";

    const nowIso = new Date().toISOString();

    return {
      id: certificado.id,
      certificateNumber: certificado.certificateNumber,
      qrCode: certificado.verificationCode,
      qrUrl: `${window.location.origin}/verificar-certificado/${certificado.verificationCode}`,
      graduate: {
        documentNumber: certificado.idNumber,
        documentIssueDate: "",
        fullName: certificado.fullName,
        titleType:
          certificado.degreeTitle ||
          certificado.programType ||
          certificado.programName,
        programName: certificado.programName,
        diplomaNumber: certificado.diplomaNumber || "",
        graduationDate: certificado.graduationDate,
      },
      requester,
      status: statusMap,
      generatedAt: certificado.issueDate || nowIso,
      viewCount: 0,
      qrScanCount: 0,
      scanHistory: [],
      createdAt: certificado.issueDate || nowIso,
      updatedAt: certificado.issueDate || nowIso,
      certificatePdfUrl: certificado.pdfUrl || undefined,
    };
  };

  const validateRequestForm = () => {
    if (!graduateDocumentNumber.trim()) {
      return "Por favor ingresa el número de cédula del graduado";
    }
    if (!graduateLastName.trim()) {
      return "Por favor ingresa al menos un nombre o apellido del graduado";
    }
    if (requesterType === "empresa" && !requesterName.trim()) {
      return "Por favor ingresa el nombre de la empresa";
    }
    if (requesterType === "empresa" && !contactPerson.trim()) {
      return "Por favor ingresa el nombre de la persona que solicita";
    }
    if (!requesterEmail.trim()) {
      return "Por favor ingresa tu correo electrónico";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requesterEmail.trim())) {
      return "Por favor ingresa un correo electrónico válido";
    }
    if (!acceptedTerms) {
      return "Debes aceptar los términos y condiciones y la política de tratamiento de datos personales";
    }

    return null;
  };

  const buildRequestPayload = (options?: {
    selectedGraduateId?: string;
    selectedFullName?: string;
  }) => {
    const normalizedGraduateName = (
      options?.selectedFullName || graduateLastName
    ).trim();
    const normalizedCompanyName = requesterName.trim();
    const normalizedContactPerson = contactPerson.trim();

    return {
      idNumber: graduateDocumentNumber,
      lastName: normalizedGraduateName,
      requesterType:
        requesterType === "empresa"
          ? ("COMPANY" as const)
          : ("GRADUATE" as const),
      requesterName:
        requesterType === "empresa"
          ? normalizedCompanyName
          : normalizedGraduateName,
      requesterEmail: requesterEmail.trim(),
      ...(requesterType === "empresa"
        ? {
            companyName: normalizedCompanyName,
            companyNit: companyNIT.trim(),
            contactPerson: normalizedContactPerson,
          }
        : {}),
      ...(graduateDocumentIssueDate
        ? { graduationDate: graduateDocumentIssueDate }
        : {}),
      ...(options?.selectedGraduateId
        ? { selectedGraduateId: options.selectedGraduateId }
        : {}),
    };
  };

  const handleManualReviewCreation = async () => {
    setManualReviewAlertMessage("");

    const response = await graduadosService.autoservicio.solicitarCertificado(
      buildRequestPayload(),
    );

    if (!response.existe) {
      setReviewRequestCreated(true);
      setGeneratedCertificate(null);
      clearMatchSuggestions();
      toast.info("Solicitud de revisión creada", {
        description:
          "No encontramos coincidencias con esa cédula. Se generó una solicitud de revisión manual (15 días hábiles).",
      });
      return;
    }

    if (!response.certificado) {
      throw new Error("No se pudo generar el certificado. Intenta nuevamente.");
    }

    const effectiveRequesterName =
      requesterType === "empresa"
        ? requesterName.trim()
        : graduateLastName.trim();

    const certificate = mapCertificado(response.certificado, {
      name: effectiveRequesterName,
      email: requesterEmail.trim(),
      type: requesterType,
    });

    setGeneratedCertificate(certificate);
    setReviewRequestCreated(false);
    clearMatchSuggestions();
    toast.success("Certificado generado exitosamente");
  };

  const handleConfirmManualReviewCreation = async () => {
    setIsGenerating(true);

    try {
      await handleManualReviewCreation();
    } catch (error: any) {
      console.error("Error al crear la solicitud de revisión:", error);
      toast.error("Error al crear la solicitud de revisión", {
        description: error?.message || "Por favor intenta nuevamente",
      });
    } finally {
      setIsGenerating(false);
    }
  };

const handleManualReviewSubmit = async () => {
    setIsGenerating(true);

    try {
      await handleManualReviewCreation();
    } catch (error: any) {
      if (error?.status === 409) {
        setManualReviewAlertMessage(
          "Ya registramos una solicitud de revisión manual para esta cédula y todavía se encuentra en proceso. Mientras esa solicitud siga activa, no es posible crear otra.",
        );
        return;
      }

      console.error("Error al crear la solicitud de revisión:", error);
      toast.error("Error al crear la solicitud de revisión", {
        description: error?.message || "Por favor intenta nuevamente",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateRequestForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsGenerating(true);

    try {
      const response = await graduadosService.autoservicio.buscarCoincidencias(
        graduateDocumentNumber,
        graduateDocumentIssueDate,
        graduateLastName,
      );

      if (!response.hasMatches || !response.suggestions.length) {
        setGeneratedCertificate(null);
        setReviewRequestCreated(false);
        clearMatchSuggestions();
        setShowManualReviewDialog(true);
        return;
      }

      setGeneratedCertificate(null);
      setReviewRequestCreated(false);
      setMatchSuggestions(response.suggestions.slice(0, 3));
      setSelectedSuggestionId("");

      toast.info("Selecciona la persona correcta para continuar", {
        description:
          response.message ||
          "Encontramos coincidencias con esa cédula. Debes elegir una para generar el certificado.",
      });
    } catch (error: any) {
      console.error("Error al buscar coincidencias:", error);
      toast.error("Error al verificar los datos", {
        description: error?.message || "Por favor intenta nuevamente",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectSuggestion = (suggestion: GraduateMatchSuggestion) => {
    setSelectedSuggestionId(suggestion.graduateId);
    setGraduateLastName(suggestion.fullName);
    setGraduateDocumentNumber(suggestion.idNumber.replace(/\D+/g, ""));
    if (suggestion.graduationDate) {
      setGraduateDocumentIssueDate(toDateInputValue(suggestion.graduationDate));
    }

    toast.success("Coincidencia seleccionada", {
      description: "Se cargaron los datos del registro elegido.",
    });
  };

  const handleConfirmSelection = async () => {
    const selectedSuggestion = matchSuggestions.find(
      (suggestion) => suggestion.graduateId === selectedSuggestionId,
    );

    if (!selectedSuggestion) {
      toast.error("Debes seleccionar una coincidencia para continuar");
      return;
    }

    setIsConfirmingSelection(true);

    try {
      const response = await graduadosService.autoservicio.solicitarCertificado(
        buildRequestPayload({
          selectedGraduateId: selectedSuggestion.graduateId,
          selectedFullName: selectedSuggestion.fullName,
        }),
      );

      if (!response.existe || !response.certificado) {
        throw new Error(
          response.mensaje ||
            "No se pudo generar el certificado con la seleccion elegida.",
        );
      }

      const effectiveRequesterName =
        requesterType === "empresa"
          ? requesterName.trim()
          : selectedSuggestion.fullName;

      const certificate = mapCertificado(response.certificado, {
        name: effectiveRequesterName,
        email: requesterEmail.trim(),
        type: requesterType,
      });

      setGeneratedCertificate(certificate);
      setReviewRequestCreated(false);
      clearMatchSuggestions();
      toast.success("Certificado generado exitosamente");
    } catch (error: any) {
      console.error("Error al confirmar la coincidencia:", error);
      toast.error("Error al generar el certificado", {
        description: error?.message || "Por favor intenta nuevamente",
      });
    } finally {
      setIsConfirmingSelection(false);
    }
  };

  const handleReset = () => {
    setGraduateDocumentNumber("");
    setGraduateDocumentIssueDate("");
    setGraduateLastName("");
    setRequesterName("");
    setRequesterEmail("");
    setCompanyNIT("");
    setContactPerson("");
    setRequesterType("graduado");
    setGeneratedCertificate(null);
    setReviewRequestCreated(false);
    clearMatchSuggestions();
    setAcceptedTerms(false);
    setIsGenerating(false);
    setIsConfirmingSelection(false);
  };

  const requesterDisplayName =
    requesterType === "graduado"
      ? graduateLastName.trim()
      : requesterName.trim();
  const selectedSuggestion =
    matchSuggestions.find(
      (suggestion) => suggestion.graduateId === selectedSuggestionId,
    ) || null;

  // Si hay un certificado generado, mostrarlo
  if (generatedCertificate) {
    return (
      <VerificationCertificateDisplay
        certificate={generatedCertificate}
        onClose={handleReset}
      />
    );
  }

  // Si se creó una solicitud de revisión, mostrar confirmación
  if (reviewRequestCreated) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* ✅ Navbar Superior Completo */}
        <PublicNavbar
          onLoginClick={() => onLoginClick?.()}
          onNavigateToHome={onBack}
        />

        {/* Header/Navbar espaciado */}
        <div className="h-20" />

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
          {/* Botón Volver Premium */}
          <motion.button
            onClick={onBack}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02, x: -4 }}
            whileTap={{ scale: 0.98 }}
            className="group flex items-center gap-2 px-5 py-3 rounded-xl bg-white/80 backdrop-blur-sm border-2 border-gray-200 text-gray-700 hover:text-[#1e5da8] hover:border-[#1e5da8] hover:shadow-lg mb-8 transition-all font-medium min-h-[44px]"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Volver al Inicio</span>
          </motion.button>

          {/* Card Premium con Animación */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
              {/* Header con Degradado */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-8 text-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black">
                      Solicitud de Revisión Creada
                    </h2>
                    <p className="text-amber-50">
                      Tiempo estimado: 15 días hábiles
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-8 space-y-6">
                {/* ¿Qué sucedió? */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    ¿Qué sucedió?
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    No encontramos el registro del graduado con la cédula{" "}
                    <span className="font-mono font-bold text-[#1e5da8]">
                      {graduateDocumentNumber}
                    </span>{" "}
                    en nuestra base de datos de graduados ESAP.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Hemos generado una{" "}
                    <strong>solicitud de revisión manual</strong> que será
                    evaluada por nuestro equipo administrativo en los próximos{" "}
                    <strong className="text-amber-600">15 días hábiles</strong>.
                  </p>
                </div>

                {/* Datos de la Solicitud */}
                <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#1e5da8]" />
                    Datos de tu Solicitud
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">
                        Cédula Consultada
                      </p>
                      <p className="font-mono font-bold text-lg text-gray-900">
                        {graduateDocumentNumber}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">
                        Fecha de Grado
                      </p>
                      <p className="font-bold text-lg text-gray-900">
                        {formatInputDate(graduateDocumentIssueDate)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">
                        Solicitante
                      </p>
                      <p className="font-bold text-lg text-gray-900">
                        {requesterDisplayName || "Sin registrar"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">
                        Email de Contacto
                      </p>
                      <p className="font-bold text-lg text-[#1e5da8] break-all">
                        {requesterEmail}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Próximos Pasos */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 mb-3 text-lg">
                        Próximos Pasos
                      </p>
                      <ul className="space-y-2.5">
                        <li className="flex items-start gap-3">
                          <span className="text-green-600 font-bold mt-0.5">
                            ✓
                          </span>
                          <span className="text-gray-700">
                            Te enviaremos un correo de confirmación a{" "}
                            <strong className="text-gray-900">
                              {requesterEmail}
                            </strong>
                          </span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-green-600 font-bold mt-0.5">
                            ✓
                          </span>
                          <span className="text-gray-700">
                            Nuestro equipo revisará la solicitud en los próximos{" "}
                            <strong className="text-amber-600">
                              15 días hábiles
                            </strong>
                          </span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-green-600 font-bold mt-0.5">
                            ✓
                          </span>
                          <span className="text-gray-700">
                            Recibirás una notificación con el resultado de la
                            revisión
                          </span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-green-600 font-bold mt-0.5">
                            ✓
                          </span>
                          <span className="text-gray-700">
                            Si el graduado es encontrado en registros
                            históricos, generaremos el certificado
                            automáticamente
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="flex-1 h-12 text-base border-2 hover:border-[#1e5da8] hover:text-[#1e5da8]"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Nueva Solicitud
                  </Button>
                  <Button
                    onClick={onBack}
                    style={{ backgroundColor: "#1e5da8" }}
                    className="flex-1 h-12 text-base hover:opacity-90 shadow-lg hover:shadow-xl transition-all"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Volver al Inicio
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>

        {/* Footer Corporativo ESAP */}
        <footer className="bg-[#1e5da8] text-white py-12 mt-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header del Footer */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-10 pb-8 border-b border-white/20">
              {/* Logo y Descripción */}
              <div className="mb-6 md:mb-0 flex items-start gap-4">
                {/* <img src={esapLogoWhite} alt="ESAP" className="h-14" /> */}
                <ESAPLogoSVG variant="white" />
                <div>
                  <h3 className="text-xl font-bold mb-1">
                    Escuela Superior de Administración Pública
                  </h3>
                  <p className="text-sm text-blue-100 mb-2">
                    Formando líderes de excelencia al servicio del Estado y la
                    sociedad colombiana desde 1958.
                  </p>
                  <div className="flex gap-2 text-xs text-blue-100">
                    <span className="px-2 py-1 bg-white/10 rounded">
                      Educación Pública de Calidad
                    </span>
                    <span className="px-2 py-1 bg-white/10 rounded">
                      Acreditación de Alta Calidad
                    </span>
                    <span className="px-2 py-1 bg-white/10 rounded">
                      Investigación e Innovación
                    </span>
                  </div>
                </div>
              </div>

              {/* Redes Sociales */}
              <div>
                <p className="text-sm font-semibold mb-3">Síguenos:</p>
                <div className="flex gap-3">
                  <a
                    href="#"
                    className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                  <a
                    href="#"
                    className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                  </a>
                  <a
                    href="#"
                    className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                  <a
                    href="#"
                    className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                    </svg>
                  </a>
                  <a
                    href="#"
                    className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Columnas de Enlaces */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-8">
              {/* INSTITUCIONAL */}
              <div>
                <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">
                  Institucional
                </h4>
                <ul className="space-y-2 text-sm text-blue-100">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Acerca de ESAP
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Misión y Visión
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Directivos
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Sedes y Regionales
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Trabaje con Nosotros
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Rendición de Cuentas
                    </a>
                  </li>
                </ul>
              </div>

              {/* ACADÉMICO */}
              <div>
                <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">
                  📚 Académico
                </h4>
                <ul className="space-y-2 text-sm text-blue-100">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Programas de Pregrado
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Programas Pregrado
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Educación Continua
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Investigación
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Biblioteca Virtual
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Calendario Académico
                    </a>
                  </li>
                </ul>
              </div>

              {/* SERVICIOS */}
              <div>
                <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">
                  Servicios
                </h4>
                <ul className="space-y-2 text-sm text-blue-100">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Portal Transaccional
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Certificados
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      PQRS
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Notificaciones Judiciales
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Trámites y Servicios
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Soporte Técnico
                    </a>
                  </li>
                </ul>
              </div>

              {/* LEGAL */}
              <div>
                <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">
                  Legal
                </h4>
                <ul className="space-y-2 text-sm text-blue-100">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Políticas de Privacidad
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Términos y Condiciones
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Tratamiento de Datos
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Transparencia
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Mapa del Sitio
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Accesibilidad
                    </a>
                  </li>
                </ul>
              </div>

              {/* CONTACTO */}
              <div>
                <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">
                  📞 Contacto
                </h4>
                <ul className="space-y-3 text-sm text-blue-100">
                  <li className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Sede Principal: Bogotá
                      <br />
                      Diagonal 40 No. 46A - 37
                      <br />
                      Bogotá D.C., Colombia
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>(601) 220 0700</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Phone className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Línea Nacional gratuita:
                      <br />
                      01 8000 110 119
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span>correspondencia@esap.edu.co</span>
                  </li>
                  <li>
                    <p className="text-xs mb-1">Lunes a Viernes</p>
                    <p className="text-xs">8:00 AM - 5:00 PM</p>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-6 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-blue-100">
              <p>
                © 2025 ESAP - Escuela Superior de Administración Pública. Todos
                los derechos reservados.
              </p>
              <p className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full text-green-300">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Última actualización: 13 de enero de 2025
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* ✅ Navbar Superior Completo */}
      <PublicNavbar
        onLoginClick={() => onLoginClick?.()}
        onNavigateToHome={onBack}
      />

      {/* Spacing for Fixed Navbar - CORRECTO */}
      <div className="h-20 sm:h-24" />

      {/* Main Content - WORLD CLASS */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 pb-8 max-w-4xl">
        {/* Botón Volver Premium */}
        <motion.button
          onClick={onBack}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02, x: -4 }}
          whileTap={{ scale: 0.98 }}
          className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 backdrop-blur-sm border-2 border-gray-200 text-gray-700 hover:text-[#1e5da8] hover:border-[#1e5da8] hover:shadow-lg mb-4 transition-all font-medium min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm sm:text-base">Volver al Inicio</span>
        </motion.button>

        {/* Hero Section - WORLD CLASS RESPONSIVE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full mb-3 shadow-sm">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-900">
              Certificación Oficial de Títulos
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 mb-3 leading-tight px-4">
            <span className="block sm:inline">Certificación de Títulos</span>
            <span className="hidden sm:inline"> </span>
            <span className="block sm:inline bg-gradient-to-r from-[#1e5da8] to-[#2962FF] bg-clip-text text-transparent">
              Graduados ESAP
            </span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed px-4">
            Obtén un certificado oficial de verificación con código QR en
            segundos
          </p>
        </motion.div>

        {/* Main Card con animación */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border border-gray-200 shadow-lg bg-white overflow-hidden rounded-2xl">
            {/* Header Compacto - World Class */}
            <div className="bg-white border-b border-gray-200 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Certificación de Títulos
                    </h2>
                    <p className="text-xs text-gray-500">
                      Código: CERT-{Date.now().toString().slice(-6)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    NUEVO
                  </span>
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    Público
                  </span>
                </div>
              </div>
            </div>

            <CardContent className="p-5 sm:p-6 space-y-6">
              {/* Info Box - World Class */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Información del Proceso
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Verifica títulos académicos de graduados ESAP. El
                      certificado se genera instantáneamente si el graduado está
                      registrado, o en 15 días hábiles si requiere revisión
                      manual.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Requester Card - World Class */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                      <UserCircle className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Datos del Solicitante
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-2 block">
                        Tipo de Solicitante{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            if (requesterType === "graduado") {
                              return;
                            }
                            clearMatchSuggestions();
                            setRequesterType("graduado");
                            // Limpiar datos de empresa
                            setCompanyNIT("");
                            setRequesterName("");
                            setRequesterEmail("");
                            setContactPerson("");
                          }}
                          variant="outline"
                          className={`h-10 px-3 text-sm border transition-all ${
                            requesterType === "graduado"
                              ? "bg-blue-50 border-blue-600 text-blue-900 font-semibold"
                              : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                          }`}
                        >
                          <UserCircle className="w-4 h-4 mr-1.5" />
                          Graduado
                        </Button>

                        <Button
                          type="button"
                          onClick={() => {
                            if (requesterType === "empresa") {
                              return;
                            }
                            clearMatchSuggestions();
                            setRequesterType("empresa");
                            setRequesterName("");
                            setCompanyNIT("");
                            setContactPerson("");
                            setRequesterEmail("");
                          }}
                          variant="outline"
                          className={`h-10 px-3 text-sm border transition-all ${
                            requesterType === "empresa"
                              ? "bg-blue-50 border-blue-600 text-blue-900 font-semibold"
                              : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                          }`}
                        >
                          <Building2 className="w-4 h-4 mr-1.5" />
                          Empresa
                        </Button>
                      </div>
                    </div>

                    {/* Conditional fields based on requester type */}
                    {requesterType === "empresa" && (
                      <div className="space-y-3">
                        {/* 1. NIT - PRIMERO (EDITABLE) */}
                        <div>
                          <Label
                            htmlFor="companyNIT"
                            className="text-xs font-semibold text-gray-700 mb-2 block"
                          >
                            NIT de la Empresa{" "}
                            <span className="text-gray-500 font-normal">
                              (Opcional)
                            </span>
                          </Label>
                          <Input
                            id="companyNIT"
                            type="text"
                            value={companyNIT}
                            onChange={(e) => handleNITChange(e.target.value)}
                            placeholder="Ej: 9001234567"
                            className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Si lo tienes, ingresa manualmente el número de NIT de la empresa.
                          </p>
                        </div>

                        {/* 2. Nombre de la Empresa - MANUAL */}
                        <div>
                          <Label
                            htmlFor="companyName"
                            className="text-xs font-semibold text-gray-700 mb-2 block"
                          >
                            Nombre de la Empresa{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="companyName"
                            type="text"
                            value={requesterName}
                            onChange={(e) => setRequesterName(e.target.value)}
                            placeholder="Ej: Empresa Ejemplo S.A.S."
                            className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                            required
                          />
                        </div>

                        {/* 3. Correo Empresarial - MANUAL */}
                        <div>
                          <Label
                            htmlFor="requesterEmail"
                            className="text-xs font-semibold text-gray-700 mb-2 block"
                          >
                            Correo Empresarial{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="requesterEmail"
                            type="email"
                            value={requesterEmail}
                            onChange={(e) => setRequesterEmail(e.target.value)}
                            placeholder="empresa@ejemplo.com"
                            className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                            required
                          />
                          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            El certificado se enviará a este correo.
                          </p>
                        </div>

                        {/* 4. Persona que Solicita - MANUAL */}
                        <div>
                          <Label
                            htmlFor="contactPerson"
                            className="text-xs font-semibold text-gray-700 mb-2 block"
                          >
                            Persona que Solicita (Nombre completo){" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="contactPerson"
                            type="text"
                            value={contactPerson}
                            onChange={(e) => setContactPerson(e.target.value)}
                            placeholder="Ej: María Fernanda Rodríguez"
                            className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Graduate Data Card - World Class */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Datos del Graduado
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {/* Nombre Completo */}
                    <div>
                      <Label
                        htmlFor="graduateLastName"
                        className="text-xs font-semibold text-gray-700 mb-2 block"
                      >
                        Nombre <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="graduateLastName"
                        type="text"
                        value={graduateLastName}
                        onChange={(e) => {
                          clearMatchSuggestions();
                          setGraduateLastName(e.target.value);
                        }}
                        placeholder="Ej: María Fernanda Rodríguez García"
                        className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        required
                      />
                    </div>

                    {/* Grid de 2 columnas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label
                          htmlFor="graduateDocument"
                          className="text-xs font-semibold text-gray-700 mb-2 block"
                        >
                          Número de Cédula{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="graduateDocument"
                          type="text"
                          value={graduateDocumentNumber}
                          onChange={(e) => {
                            clearMatchSuggestions();
                            setGraduateDocumentNumber(
                              e.target.value.replace(/\D+/g, ""),
                            );
                          }}
                          inputMode="numeric"
                          placeholder="Ej: 1234567890"
                          className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                          required
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="documentIssueDate"
                          className="text-xs font-semibold text-gray-700 mb-2 block"
                        >
                          Fecha de Grado (Opcional)
                        </Label>
                        <Input
                          id="documentIssueDate"
                          type="date"
                          value={graduateDocumentIssueDate}
                          onChange={(e) => {
                            clearMatchSuggestions();
                            setGraduateDocumentIssueDate(e.target.value);
                          }}
                          className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        />
                      </div>

                      {requesterType === "graduado" && (
                        <div className="sm:col-span-2">
                          <Label
                            htmlFor="graduateEmail"
                            className="text-xs font-semibold text-gray-700 mb-2 block"
                          >
                            Correo donde deseas recibir el certificado{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="graduateEmail"
                            type="email"
                            value={requesterEmail}
                            onChange={(e) => setRequesterEmail(e.target.value)}
                            placeholder="tucorreo@ejemplo.com"
                            className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            No tiene que coincidir con el correo registrado del
                            graduado.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alert Box - World Class */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        Verifica que todos los datos sean correctos antes de
                        enviar la solicitud.
                      </p>
                      <p className="text-xs text-gray-600">
                        El certificado se genera instantáneamente si el graduado
                        está registrado.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-rose-50/70 p-4 shadow-sm">
                  <div className="pointer-events-none absolute right-4 top-4 hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white/90 text-orange-500 shadow-sm">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="flex items-start gap-3 sm:pr-14">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-semibold text-gray-900">
                        Importante sobre registros históricos y corrección de
                        datos
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        A través de este módulo podrá verificar los títulos
                        expedidos desde el año 2000 hasta la fecha. En caso de
                        que el título haya sido expedido con anterioridad,
                        requiera algún ajuste o desee reportar una
                        inconsistencia, deberá realizar la solicitud a través
                        del correo electrónico{" "}
                        <a
                          href="mailto:ventanillaunica@esap.edu.co"
                          className="font-semibold text-[#1e5da8] underline decoration-[#1e5da8]/30 underline-offset-2 hover:text-[#174a86]"
                        >
                          ventanillaunica@esap.edu.co
                        </a>{" "}
                        adjuntando copia de Diploma o Acta de Grado.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 📜 Términos y Condiciones - Habeas Data */}
                {matchSuggestions.length > 0 && (
                  <div className="bg-white border-2 border-blue-200 rounded-xl p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          Selección obligatoria de coincidencias
                        </p>
                        <p className="text-xs text-gray-600">
                          Selecciona la persona correcta entre las coincidencias
                          encontradas con esa cédula antes de generar el
                          certificado.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {matchSuggestions.map((suggestion, index) => {
                        const isSelected =
                          selectedSuggestionId === suggestion.graduateId;
                        const comparedTokens =
                          suggestion.totalProvidedTokens > 0
                            ? Math.min(
                                suggestion.totalProvidedTokens,
                                suggestion.totalGraduateTokens ||
                                  suggestion.totalProvidedTokens,
                              )
                            : 0;

                        return (
                          <button
                            key={suggestion.graduateId}
                            type="button"
                            onClick={() => handleSelectSuggestion(suggestion)}
                            className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                              isSelected
                                ? "border-blue-600 bg-blue-50 shadow-sm"
                                : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-gray-900">
                                  {index + 1}. {suggestion.fullName}
                                </p>
                                <p className="text-xs text-gray-600">
                                  CC {suggestion.idNumber} |{" "}
                                  {suggestion.programName}
                                </p>
                              </div>
                              <div className="text-right space-y-1">
                                {comparedTokens > 0 && (
                                  <p className="text-[11px] font-semibold text-blue-700">
                                    Nombre: {suggestion.matchedTokens}/
                                    {comparedTokens} palabras en orden
                                  </p>
                                )}
                                {isSelected && (
                                  <p className="text-[11px] font-semibold text-blue-700">
                                    Seleccionado
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        onClick={handleConfirmSelection}
                        disabled={
                          !selectedSuggestion ||
                          isConfirmingSelection ||
                          isGenerating
                        }
                        className="flex-1 h-10 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                      >
                        {isConfirmingSelection ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generando certificado...
                          </>
                        ) : (
                          <>
                            <Award className="w-4 h-4 mr-2" />
                            Confirmar seleccion
                          </>
                        )}
                      </Button>
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={isGenerating || isConfirmingSelection}
                        className="h-10 px-4 text-sm font-semibold border-gray-300"
                      >
                        Buscar nuevamente
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="acceptTerms"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label
                      htmlFor="acceptTerms"
                      className="flex-1 cursor-pointer"
                    >
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        Acepto los Términos y Condiciones y la Política de
                        Tratamiento de Datos Personales
                        <span className="text-red-500 ml-1">*</span>
                      </p>
                      <div className="text-xs text-gray-700 space-y-1">
                        <p>
                          Autorizo a la Escuela Superior de Administración
                          Pública (ESAP) para que en los términos legalmente
                          establecidos, recolecte, almacene, use, circule,
                          suprima, comparta, actualice y transmita mis datos
                          personales de acuerdo con la{" "}
                          <strong>Ley 1581 de 2012</strong> y el{" "}
                          <strong>Decreto 1377 de 2013</strong>, con la
                          finalidad de:
                        </p>
                        <ul className="list-disc list-inside pl-2 space-y-0.5">
                          <li>
                            Verificar la autenticidad de la información
                            académica del graduado
                          </li>
                          <li>
                            Generar y expedir certificados de verificación de
                            títulos
                          </li>
                          <li>
                            Enviar el certificado al correo electrónico
                            informado en la solicitud
                          </li>
                          <li>
                            Mantener un registro histórico de las solicitudes
                            realizadas
                          </li>
                        </ul>
                        <p className="mt-2">
                          Declaro que he leído y acepto que los datos
                          suministrados son verídicos y que conozco mis derechos
                          como titular de la información (acceso, rectificación,
                          actualización, supresión y revocación).
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {showManualReviewDialog && (
                  <div
                    ref={manualReviewPromptRef}
                    className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm flex-shrink-0">
                          <AlertCircle className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-bold text-gray-900">
                            No encontramos coincidencias en la base de datos
                          </p>
                          <p className="text-sm leading-6 text-gray-600">
                            No encontramos ningún graduado ni coincidencias con
                            los datos ingresados. Si deseas, puedes enviar ahora
                            una solicitud de revisión manual para el certificado
                            de egresado.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl border border-amber-100 bg-white/80 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Documento consultado
                          </p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">
                            {graduateDocumentNumber || "Sin registrar"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-amber-100 bg-white/80 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Nombre ingresado
                          </p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">
                            {graduateLastName.trim() || "Sin registrar"}
                          </p>
                        </div>
                        {graduateDocumentIssueDate && (
                          <div className="rounded-xl border border-amber-100 bg-white/80 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Fecha de grado
                            </p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {formatInputDate(graduateDocumentIssueDate)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900">
                        La revisión manual tiene un tiempo estimado de{" "}
                        <span className="font-semibold">15 días hábiles</span>.
                        No se enviará ninguna solicitud hasta que lo confirmes.
                      </div>

                      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={clearMatchSuggestions}
                          className="h-11 border-gray-300 text-sm font-semibold"
                        >
                          Seguir revisando
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            void handleManualReviewSubmit();
                          }}
                          disabled={isGenerating || isConfirmingSelection}
                          className="h-11 bg-[#1e5da8] text-sm font-semibold text-white hover:bg-[#174a86] disabled:opacity-50"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enviando revisión...
                            </>
                          ) : (
                            <>
                              <FileText className="mr-2 h-4 w-4" />
                              Sí, enviar solicitud de revisión
                            </>
                          )}
                        </Button>
                      </div>

                      {manualReviewAlertMessage && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -6 }}
                          animate={{ opacity: 1, height: "auto", y: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
                            <p className="font-semibold">
                              Solicitud ya registrada
                            </p>
                            <p className="mt-1 leading-6">
                              {manualReviewAlertMessage}
                            </p>
                            <p className="mt-2 leading-6">
                              Nuestro equipo debe terminar esa validación antes de permitir una nueva solicitud. Si necesitas orientación adicional, comunícate con{" "}
                              <a
                                href="mailto:ventanillaunica@esap.edu.co"
                                className="font-semibold text-[#1e5da8] underline decoration-[#1e5da8]/30 underline-offset-2 hover:text-[#174a86]"
                              >
                                ventanillaunica@esap.edu.co
                              </a>
                              .
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Button Premium */}
                {/* Submit Footer - World Class */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={
                        isGenerating || isConfirmingSelection || !acceptedTerms
                      }
                      className="flex-1 h-10 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Buscando coincidencias...
                        </>
                      ) : (
                        <>
                          <Award className="w-4 h-4 mr-2" />
                          Enviar Solicitud
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleReset}
                      variant="outline"
                      className="h-10 px-4 text-sm font-semibold border-gray-300"
                    >
                      Cancelar
                    </Button>
                  </div>

                  {!acceptedTerms && (
                    <p className="text-xs text-gray-500 text-center">
                      <Shield className="w-3 h-3 inline-block mr-1" />
                      Debes aceptar los términos y condiciones para continuar
                    </p>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Footer Corporativo ESAP */}
      <footer className="bg-[#1e5da8] text-white py-4 mt-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header del Footer */}
          <div className="flex flex-col md:flex-row justify-between items-start mb-10 pb-8 border-b border-white/20">
            {/* Logo y Descripción */}
            <div className="mb-6 md:mb-0 flex items-start gap-4">
              {/* <img src={esapLogoWhite} alt="ESAP" className="h-14" /> */}
              <ESAPLogoSVG variant="white" />
              <div>
                <h3 className="text-xl font-bold mb-1">
                  Escuela Superior de Administración Pública
                </h3>
                <p className="text-sm text-blue-100 mb-2">
                  Formando líderes de excelencia al servicio del Estado y la
                  sociedad colombiana desde 1958.
                </p>
                <div className="flex gap-2 text-xs text-blue-100">
                  <span className="px-2 py-1 bg-white/10 rounded">
                    Educación Pública de Calidad
                  </span>
                  <span className="px-2 py-1 bg-white/10 rounded">
                    Acreditación de Alta Calidad
                  </span>
                  <span className="px-2 py-1 bg-white/10 rounded">
                    Investigación e Innovación
                  </span>
                </div>
              </div>
            </div>

            {/* Redes Sociales */}
            <div>
              <p className="text-sm font-semibold mb-3">Síguenos:</p>
              <div className="flex gap-3">
                <a
                  href="#"
                  className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Columnas de Enlaces */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* INSTITUCIONAL */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">
                Institucional
              </h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Acerca de ESAP
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Misión y Visión
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Directivos
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Sedes y Regionales
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Trabaje con Nosotros
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Rendición de Cuentas
                  </a>
                </li>
              </ul>
            </div>

            {/* ACADÉMICO */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">
                📚 Académico
              </h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Programas de Pregrado
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Programas Pregrado
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Educación Continua
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Investigación
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Biblioteca Virtual
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Calendario Académico
                  </a>
                </li>
              </ul>
            </div>

            {/* SERVICIOS */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">
                Servicios
              </h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Portal Transaccional
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Certificados
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    PQRS
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Notificaciones Judiciales
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Trámites y Servicios
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Soporte Técnico
                  </a>
                </li>
              </ul>
            </div>

            {/* LEGAL */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">
                Legal
              </h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Políticas de Privacidad
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Términos y Condiciones
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Tratamiento de Datos
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Transparencia
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Mapa del Sitio
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Accesibilidad
                  </a>
                </li>
              </ul>
            </div>

            {/* CONTACTO */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">
                📞 Contacto
              </h4>
              <ul className="space-y-3 text-sm text-blue-100">
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Sede Principal: Bogotá
                    <br />
                    Diagonal 40 No. 46A - 37
                    <br />
                    Bogotá D.C., Colombia
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>(601) 220 0700</span>
                </li>
                <li className="flex items-start gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Línea Nacional gratuita:
                    <br />
                    01 8000 110 119
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span>correspondencia@esap.edu.co</span>
                </li>
                <li>
                  <p className="text-xs mb-1">Lunes a Viernes</p>
                  <p className="text-xs">8:00 AM - 5:00 PM</p>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-blue-100">
            <p>
              © 2025 ESAP - Escuela Superior de Administración Pública. Todos
              los derechos reservados.
            </p>
            <p className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full text-green-300">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Última actualización: 13 de enero de 2025
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
