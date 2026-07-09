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
  UploadCloud,
  Paperclip,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { VerificationCertificateDisplay } from "./VerificationCertificateDisplay";
import { VerificationCertificate } from "../../types/index";
import { PublicNavbar } from "./PublicNavbar";
// import esapLogoWhite from 'figma:asset/2eabfe85218557ad27ece74d963c4a3b61b716be.png';
import { ESAPLogo } from "../assets/ESAPLogo";
import graduadosService, {
  type CertificadoGraduado,
  type GraduateMatchSuggestion,
} from "../../services/api/graduados.service";
import { getPublicBaseUrl } from "../../config/environment";
import { GRADUATE_PROGRAM_OPTIONS } from "../../constants/academicPrograms";
// import { simularEnvioCorreo } from '../../utils/emailTemplates';
// import { validateGraduateForPublicService, type Graduate } from '../../data/graduatesSync';  // ✅ IMPORTAR FUNCIÓN DE VALIDACIÓN
// import { sendGraduateNotificationEmail } from '../../utils/graduateNotificationEmail';

const getRuntimePublicBaseUrl = () =>
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : getPublicBaseUrl();

interface PublicTitleVerificationProps {
  onBack: () => void;
  onLoginClick?: () => void;
}

type ManualReviewReason = "no_matches" | "missing_title";
type MissingTitleBaseRecord = {
  graduateId?: string;
  idNumber: string;
  fullName: string;
  programName?: string;
  degreeTitle?: string;
};
type CreatedReviewDetails = {
  idNumber: string;
  fullName: string;
  programName?: string;
  graduationDate?: string;
  graduateEmail?: string;
  supportFileName?: string;
};

const DOCUMENT_MIN_LENGTH = 5;
const DOCUMENT_MAX_LENGTH = 20;
const PERSON_NAME_MAX_LENGTH = 80;
const COMPANY_NAME_MAX_LENGTH = 120;
const COMPANY_NIT_MIN_LENGTH = 9;
const COMPANY_NIT_MAX_LENGTH = 10;
const EMAIL_MAX_LENGTH = 254;
const MANUAL_REVIEW_SUPPORT_MAX_SIZE_BYTES = 20 * 1024 * 1024;
const MANUAL_REVIEW_SUPPORT_MAX_SIZE_LABEL = "20 MB";
const PERSON_NAME_ALLOWED_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]+$/;

const sanitizeDigits = (value: string, maxLength: number) =>
  value.replace(/\D+/g, "").slice(0, maxLength);

const sanitizeDocumentNumber = (value: string) =>
  value
    .replace(/[^A-Za-z0-9]+/g, "")
    .toUpperCase()
    .slice(0, DOCUMENT_MAX_LENGTH);

const sanitizePersonName = (value: string) =>
  value
    .replace(/[0-9]/g, "")
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]/g, "")
    .slice(0, PERSON_NAME_MAX_LENGTH);

const normalizeTextSpaces = (value: string) => value.trim().replace(/\s+/g, " ");

const formatBytes = (bytes?: number) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getManualReviewSupportValidationError = (file: File) => {
  const lowerName = file.name.toLowerCase();
  const isPdf = lowerName.endsWith(".pdf") || file.type === "application/pdf";
  if (!isPdf) {
    return "El soporte debe ser un archivo PDF";
  }
  if (file.size > MANUAL_REVIEW_SUPPORT_MAX_SIZE_BYTES) {
    return `El soporte PDF no puede superar ${MANUAL_REVIEW_SUPPORT_MAX_SIZE_LABEL}`;
  }
  return "";
};

const normalizeComparableText = (value: string) =>
  normalizeTextSpaces(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const matchesExistingAcademicTitle = (
  programName: string,
  baseRecord?: { programName?: string; degreeTitle?: string } | null,
) => {
  const normalizedProgramName = normalizeComparableText(programName);
  if (!normalizedProgramName || !baseRecord) {
    return false;
  }

  return [baseRecord.programName, baseRecord.degreeTitle]
    .map((value) => normalizeComparableText(value || ""))
    .filter(Boolean)
    .includes(normalizedProgramName);
};

const getTodayInputDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPersonNameValidationError = (value: string, fieldName: string) => {
  const normalizedValue = normalizeTextSpaces(value);

  if (!normalizedValue) {
    return `Por favor, ingresa ${fieldName}`;
  }

  if (normalizedValue.length < 2) {
    return `${fieldName} debe tener al menos 2 caracteres`;
  }

  if (normalizedValue.length > PERSON_NAME_MAX_LENGTH) {
    return `${fieldName} no puede superar ${PERSON_NAME_MAX_LENGTH} caracteres`;
  }

  if (/\d/.test(normalizedValue)) {
    return `${fieldName} no debe contener números`;
  }

  if (!PERSON_NAME_ALLOWED_REGEX.test(normalizedValue)) {
    return `${fieldName} solo debe contener letras, espacios, apóstrofes o guiones`;
  }

  return null;
};

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

const CERTIFICATE_NOT_AVAILABLE_MESSAGE =
  "El certificado de grado aún no se encuentra disponible para expedición.";

const GRADUATION_DATE_FUTURE_ERROR =
  "La fecha de grado no puede ser posterior a la fecha actual";

const isCertificateNotAvailableError = (error: any) =>
  error?.status === 422 &&
  String(error?.message || "")
    .toLowerCase()
    .includes("certificado de grado");

const showRequestErrorToast = (error: any, title: string) => {
  if (isCertificateNotAvailableError(error)) {
    toast.info("Certificado no disponible", {
      description: error?.message || CERTIFICATE_NOT_AVAILABLE_MESSAGE,
    });
    return;
  }

  toast.error(title, {
    description: error?.message || "Por favor, intenta nuevamente",
  });
};

export function PublicTitleVerification({
  onBack,
  onLoginClick,
}: PublicTitleVerificationProps) {
  const manualReviewPromptRef = useRef<HTMLDivElement | null>(null);
  const manualReviewSupportInputRef = useRef<HTMLInputElement | null>(null);
  const todayInputDate = getTodayInputDate();

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
  const [createdReviewReason, setCreatedReviewReason] =
    useState<ManualReviewReason>("no_matches");
  const [createdReviewDetails, setCreatedReviewDetails] =
    useState<CreatedReviewDetails | null>(null);
  const [matchSuggestions, setMatchSuggestions] = useState<
    GraduateMatchSuggestion[]
  >([]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState("");
  const [showManualReviewDialog, setShowManualReviewDialog] = useState(false);
  const [manualReviewReason, setManualReviewReason] =
    useState<ManualReviewReason>("no_matches");
  const [missingTitleBaseRecord, setMissingTitleBaseRecord] =
    useState<MissingTitleBaseRecord | null>(null);
  const [missingTitleProgramName, setMissingTitleProgramName] = useState("");
  const [manualReviewAlertMessage, setManualReviewAlertMessage] = useState("");
  const [manualReviewSupportFile, setManualReviewSupportFile] =
    useState<File | null>(null);
  const [manualReviewSupportUploadProgress, setManualReviewSupportUploadProgress] =
    useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [graduationDateError, setGraduationDateError] = useState("");

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
    setCompanyNIT(sanitizeDigits(nit, COMPANY_NIT_MAX_LENGTH));
  };

  const handleGraduateDocumentChange = (documentNumber: string) => {
    clearMatchSuggestions();
    setGraduateDocumentNumber(sanitizeDocumentNumber(documentNumber));
  };

  const handleGraduateNameChange = (name: string) => {
    clearMatchSuggestions();
    setGraduateLastName(sanitizePersonName(name));
  };

  const handleContactPersonChange = (name: string) => {
    setContactPerson(sanitizePersonName(name));
  };

  const handleMissingTitleChange = (title: string) => {
    setMissingTitleProgramName(title);
  };

  const resetManualReviewSupportFile = () => {
    setManualReviewSupportFile(null);
    setManualReviewSupportUploadProgress(0);
    if (manualReviewSupportInputRef.current) {
      manualReviewSupportInputRef.current.value = "";
    }
  };

  const handleManualReviewSupportFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0] || null;
    if (!selectedFile) {
      resetManualReviewSupportFile();
      return;
    }

    const validationError = getManualReviewSupportValidationError(selectedFile);
    if (validationError) {
      toast.error(validationError);
      event.target.value = "";
      return;
    }

    setManualReviewSupportFile(selectedFile);
    setManualReviewSupportUploadProgress(0);
  };

  const handleGraduationDateChange = (value: string) => {
    clearMatchSuggestions();

    if (value && value > todayInputDate) {
      setGraduationDateError(GRADUATION_DATE_FUTURE_ERROR);
      return;
    }

    setGraduationDateError("");
    setGraduateDocumentIssueDate(value);
  };

  const clearMatchSuggestions = () => {
    setMatchSuggestions([]);
    setSelectedSuggestionId("");
    setShowManualReviewDialog(false);
    setManualReviewReason("no_matches");
    setMissingTitleBaseRecord(null);
    setMissingTitleProgramName("");
    setManualReviewAlertMessage("");
    resetManualReviewSupportFile();
  };

  const hideManualReviewPrompt = () => {
    setShowManualReviewDialog(false);
    setManualReviewAlertMessage("");
    resetManualReviewSupportFile();
  };

  const applyMissingTitleBaseRecord = (baseRecord: MissingTitleBaseRecord) => {
    const normalizedIdNumber =
      sanitizeDocumentNumber(baseRecord.idNumber) ||
      baseRecord.idNumber;

    setMissingTitleBaseRecord({
      ...baseRecord,
      idNumber: normalizedIdNumber,
    });
    setGraduateDocumentNumber(normalizedIdNumber);
    setGraduateLastName(baseRecord.fullName);
    if (baseRecord.graduateId) {
      setSelectedSuggestionId(baseRecord.graduateId);
    }
  };

  const openMissingTitleReviewPrompt = (
    explicitBaseRecord?: MissingTitleBaseRecord,
  ) => {
    const selectedBaseRecord =
      matchSuggestions.find(
        (suggestion) => suggestion.graduateId === selectedSuggestionId,
      ) ||
      (matchSuggestions.length === 1 ? matchSuggestions[0] : null);
    const nextBaseRecord = explicitBaseRecord || selectedBaseRecord;

    if (!nextBaseRecord) {
      toast.error("Selecciona primero la persona correcta para continuar");
      return;
    }

    applyMissingTitleBaseRecord({
      graduateId: nextBaseRecord.graduateId,
      idNumber: nextBaseRecord.idNumber,
      fullName: nextBaseRecord.fullName,
      programName: nextBaseRecord.programName,
      degreeTitle: nextBaseRecord.degreeTitle,
    });
    setManualReviewReason("missing_title");
    setManualReviewAlertMessage("");
    setShowManualReviewDialog(true);
  };

  const titleAlreadyExistsForMissingReview = (programName: string) => {
    const normalizedDocumentNumber = sanitizeDocumentNumber(
      missingTitleBaseRecord?.idNumber || graduateDocumentNumber,
    );

    return (
      matchesExistingAcademicTitle(programName, missingTitleBaseRecord) ||
      matchSuggestions.some((suggestion) => {
        const suggestionDocumentNumber = sanitizeDocumentNumber(suggestion.idNumber);

        return (
          suggestionDocumentNumber === normalizedDocumentNumber &&
          matchesExistingAcademicTitle(programName, suggestion)
        );
      })
    );
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
      qrUrl: `${getRuntimePublicBaseUrl()}/verificar-certificado/${certificado.verificationCode}`,
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

  const validateRequestForm = (options?: {
    skipMissingTitleReview?: boolean;
    requireManualReviewSupport?: boolean;
  }) => {
    const normalizedDocumentNumber = graduateDocumentNumber.trim();
    const normalizedCompanyNit = companyNIT.trim();
    const normalizedRequesterName = normalizeTextSpaces(requesterName);
    const normalizedRequesterEmail = requesterEmail.trim();

    if (!normalizedDocumentNumber) {
      return "Por favor, ingresa el número de documento del graduado";
    }

    if (
      !/^[A-Za-z0-9]+$/.test(normalizedDocumentNumber) ||
      normalizedDocumentNumber.length < DOCUMENT_MIN_LENGTH ||
      normalizedDocumentNumber.length > DOCUMENT_MAX_LENGTH
    ) {
      return `El número de documento debe tener entre ${DOCUMENT_MIN_LENGTH} y ${DOCUMENT_MAX_LENGTH} caracteres y solo puede contener letras y números`;
    }

    const graduateNameError = getPersonNameValidationError(
      graduateLastName,
      "el nombre del graduado",
    );
    if (graduateNameError) {
      return graduateNameError;
    }

    if (
      normalizedCompanyNit &&
      !new RegExp(
        `^\\d{${COMPANY_NIT_MIN_LENGTH},${COMPANY_NIT_MAX_LENGTH}}$`,
      ).test(normalizedCompanyNit)
    ) {
      return `El NIT debe tener entre ${COMPANY_NIT_MIN_LENGTH} y ${COMPANY_NIT_MAX_LENGTH} dígitos`;
    }

    if (requesterType === "empresa") {
      if (!normalizedRequesterName) {
        return "Por favor, ingresa el nombre de la empresa";
      }

      if (normalizedRequesterName.length < 2) {
        return "El nombre de la empresa debe tener al menos 2 caracteres";
      }

      if (normalizedRequesterName.length > COMPANY_NAME_MAX_LENGTH) {
        return `El nombre de la empresa no puede superar ${COMPANY_NAME_MAX_LENGTH} caracteres`;
      }

      const contactPersonError = getPersonNameValidationError(
        contactPerson,
        "el nombre de la persona que solicita",
      );
      if (contactPersonError) {
        return contactPersonError;
      }
    }

    if (!normalizedRequesterEmail) {
      return "Por favor, ingresa tu correo electrónico";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      normalizedRequesterEmail.length > EMAIL_MAX_LENGTH ||
      !emailRegex.test(normalizedRequesterEmail)
    ) {
      return "Por favor, ingresa un correo electrónico válido";
    }
    if (
      graduateDocumentIssueDate &&
      graduateDocumentIssueDate > todayInputDate
    ) {
      return GRADUATION_DATE_FUTURE_ERROR;
    }
    if (!acceptedTerms) {
      return "Debes aceptar los términos y condiciones y la política de tratamiento de datos personales";
    }

    if (
      manualReviewReason === "missing_title" &&
      !options?.skipMissingTitleReview
    ) {
      if (!missingTitleBaseRecord) {
        return "Selecciona primero la persona correcta para crear la solicitud de revisión";
      }

      const normalizedMissingTitle =
        normalizeTextSpaces(missingTitleProgramName);
      if (!normalizedMissingTitle) {
        return "Selecciona el título que deseas enviar a revisión";
      }
      if (
        !(GRADUATE_PROGRAM_OPTIONS as readonly string[]).includes(
          normalizedMissingTitle,
        )
      ) {
        return "Selecciona un título válido de la lista de programas";
      }
      if (
        titleAlreadyExistsForMissingReview(normalizedMissingTitle)
      ) {
        return "Ese título ya existe para la persona seleccionada. Selecciona un título diferente para solicitar revisión.";
      }
    }

    if (options?.requireManualReviewSupport && !manualReviewSupportFile) {
      return "Adjunta el soporte PDF de la solicitud para enviar la revisión manual";
    }

    if (manualReviewSupportFile) {
      const supportValidationError =
        getManualReviewSupportValidationError(manualReviewSupportFile);
      if (supportValidationError) {
        return supportValidationError;
      }
    }

    return null;
  };

  const buildRequestPayload = (options?: {
    idNumber?: string;
    graduationDate?: string;
    programName?: string;
    selectedGraduateId?: string;
    selectedFullName?: string;
    forceManualReview?: boolean;
  }) => {
    const normalizedGraduateName = normalizeTextSpaces(
      options?.selectedFullName || graduateLastName
    );
    const normalizedCompanyName = normalizeTextSpaces(requesterName);
    const normalizedContactPerson = normalizeTextSpaces(contactPerson);
    const normalizedDocumentNumber = (
      options?.idNumber || graduateDocumentNumber
    ).trim();
    const normalizedProgramName = options?.programName
      ? normalizeTextSpaces(options.programName)
      : "";
    const graduationDate = options?.graduationDate || graduateDocumentIssueDate;

    return {
      idNumber: normalizedDocumentNumber,
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
      ...(requesterType === "graduado"
        ? { graduateEmail: requesterEmail.trim() }
        : {}),
      ...(requesterType === "empresa"
        ? {
            companyName: normalizedCompanyName,
            companyNit: companyNIT.trim(),
            contactPerson: normalizedContactPerson,
          }
        : {}),
      ...(normalizedProgramName ? { programName: normalizedProgramName } : {}),
      ...(graduationDate ? { graduationDate } : {}),
      ...(options?.selectedGraduateId
        ? { selectedGraduateId: options.selectedGraduateId }
        : {}),
      ...(options?.forceManualReview ? { forceManualReview: true } : {}),
    };
  };

  const handleManualReviewCreation = async (options?: {
    forceManualReview?: boolean;
  }) => {
    setManualReviewAlertMessage("");
    const isMissingTitleReview = options?.forceManualReview === true;
    const missingTitleBase = isMissingTitleReview
      ? missingTitleBaseRecord
      : null;
    const missingTitleGraduationDate = graduateDocumentIssueDate;

    const requestPayload = buildRequestPayload({
      idNumber: missingTitleBase?.idNumber,
      graduationDate: missingTitleGraduationDate,
      programName: isMissingTitleReview
        ? normalizeTextSpaces(missingTitleProgramName)
        : undefined,
      selectedGraduateId: missingTitleBase?.graduateId,
      selectedFullName: missingTitleBase?.fullName,
      forceManualReview: isMissingTitleReview,
    });

    if (!manualReviewSupportFile) {
      throw new Error(
        "Adjunta el soporte PDF de la solicitud para enviar la revisión manual",
      );
    }

    const response = await graduadosService.autoservicio.solicitarRevisionConSoporte(
      requestPayload,
      manualReviewSupportFile,
      (progress) => setManualReviewSupportUploadProgress(progress || 1),
    );

    if (!response.existe) {
      setReviewRequestCreated(true);
      setCreatedReviewReason(
        isMissingTitleReview ? "missing_title" : "no_matches",
      );
      setCreatedReviewDetails({
        idNumber: missingTitleBase?.idNumber || graduateDocumentNumber,
        fullName: missingTitleBase?.fullName || graduateLastName.trim(),
        programName: isMissingTitleReview
          ? normalizeTextSpaces(missingTitleProgramName)
          : undefined,
        graduationDate: missingTitleGraduationDate || undefined,
        graduateEmail:
          isMissingTitleReview && requesterType === "graduado"
            ? requesterEmail.trim()
            : undefined,
        supportFileName: manualReviewSupportFile?.name,
      });
      if (manualReviewSupportFile) {
        setManualReviewSupportUploadProgress(100);
      }
      setGeneratedCertificate(null);
      clearMatchSuggestions();
      toast.info("Solicitud de revisión creada", {
        description:
          isMissingTitleReview
            ? "Se creó una solicitud de revisión para validar otro título que no aparece en la plataforma."
            : "No encontramos coincidencias con ese documento. Se generó una solicitud de revisión manual (15 días hábiles).",
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
    const validationError = validateRequestForm({
      requireManualReviewSupport: true,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsGenerating(true);

    try {
      await handleManualReviewCreation({
        forceManualReview: manualReviewReason === "missing_title",
      });
    } catch (error: any) {
      setManualReviewSupportUploadProgress(0);
      console.error("Error al crear la solicitud de revisión:", error);
      showRequestErrorToast(error, "Error al crear la solicitud de revisión");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualReviewSubmit = async () => {
    const validationError = validateRequestForm({
      requireManualReviewSupport: true,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsGenerating(true);

    try {
      await handleManualReviewCreation({
        forceManualReview: manualReviewReason === "missing_title",
      });
    } catch (error: any) {
      setManualReviewSupportUploadProgress(0);
      if (error?.status === 409) {
        setManualReviewAlertMessage(
          "Ya registramos una solicitud de revisión manual para este documento y todavía se encuentra en proceso. Mientras esa solicitud siga activa, no es posible crear otra.",
        );
        return;
      }

      console.error("Error al crear la solicitud de revisión:", error);
      showRequestErrorToast(error, "Error al crear la solicitud de revisión");
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
        setManualReviewReason("no_matches");
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
          "Encontramos coincidencias con ese documento. Debes elegir una para generar el certificado.",
      });
    } catch (error: any) {
      console.error("Error al buscar coincidencias:", error);
      showRequestErrorToast(error, "Error al verificar los datos");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearchAgain = async () => {
    const validationError = validateRequestForm({
      skipMissingTitleReview: true,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setManualReviewReason("no_matches");
    setShowManualReviewDialog(false);
    setMissingTitleBaseRecord(null);
    setMissingTitleProgramName("");
    setManualReviewAlertMessage("");
    resetManualReviewSupportFile();
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
          "Encontramos coincidencias con ese documento. Debes elegir una para generar el certificado.",
      });
    } catch (error: any) {
      console.error("Error al buscar coincidencias:", error);
      showRequestErrorToast(error, "Error al verificar los datos");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectSuggestion = (suggestion: GraduateMatchSuggestion) => {
    setSelectedSuggestionId(suggestion.graduateId);
    setGraduateLastName(suggestion.fullName);
    setGraduateDocumentNumber(sanitizeDocumentNumber(suggestion.idNumber));
    if (manualReviewReason === "missing_title") {
      setMissingTitleBaseRecord({
        graduateId: suggestion.graduateId,
        idNumber: sanitizeDocumentNumber(suggestion.idNumber),
        fullName: suggestion.fullName,
        programName: suggestion.programName,
        degreeTitle: suggestion.degreeTitle,
      });
      setMissingTitleProgramName("");
    }

    toast.success("Coincidencia seleccionada", {
      description: "Se cargaron los datos del registro elegido.",
    });
  };

  const handleConfirmSelection = async () => {
    const validationError = validateRequestForm({
      skipMissingTitleReview: true,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

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
            "No se pudo generar el certificado con la selección elegida.",
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
      showRequestErrorToast(error, "Error al generar el certificado");
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
    setCreatedReviewReason("no_matches");
    setCreatedReviewDetails(null);
    clearMatchSuggestions();
    setAcceptedTerms(false);
    setGraduationDateError("");
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
  const hasPendingMatchSuggestions = matchSuggestions.length > 0;
  const isMissingTitleManualReview = manualReviewReason === "missing_title";
  const manualReviewDisplayRecord =
    isMissingTitleManualReview && missingTitleBaseRecord
      ? missingTitleBaseRecord
      : null;
  const manualReviewDisplayDocument =
    manualReviewDisplayRecord?.idNumber || graduateDocumentNumber;
  const manualReviewDisplayName =
    manualReviewDisplayRecord?.fullName || graduateLastName.trim();
  const selectedMissingTitleAlreadyExists =
    isMissingTitleManualReview &&
    titleAlreadyExistsForMissingReview(missingTitleProgramName);
  const manualReviewDisplayGraduationDate = graduateDocumentIssueDate;
  const isMissingTitleReviewCreated = createdReviewReason === "missing_title";
  const manualReviewTitle = isMissingTitleManualReview
    ? "¿Te falta otro título?"
    : "No encontramos coincidencias en la base de datos";
  const manualReviewDescription = isMissingTitleManualReview
    ? "Si tienes otro título de ESAP que no aparece entre los resultados disponibles, puedes enviar una solicitud de revisión manual para que el equipo de Verificación de títulos lo valide."
    : "No encontramos ningún graduado ni coincidencias con los datos ingresados. Si deseas, puedes enviar ahora una solicitud de revisión manual para la verificación del título de egresado.";
  const manualReviewCancelLabel = isMissingTitleManualReview
    ? "Volver a los resultados"
    : "Seguir revisando";
  const reviewConfirmationDocument =
    createdReviewDetails?.idNumber || graduateDocumentNumber;
  const reviewConfirmationName =
    createdReviewDetails?.fullName || requesterDisplayName;
  const reviewConfirmationProgram = createdReviewDetails?.programName || "";
  const reviewConfirmationGraduationDate =
    createdReviewDetails?.graduationDate || graduateDocumentIssueDate;
  const reviewConfirmationGraduateEmail =
    isMissingTitleReviewCreated && requesterType === "graduado"
      ? createdReviewDetails?.graduateEmail || requesterEmail.trim()
      : "";
  const reviewConfirmationSupportFileName =
    createdReviewDetails?.supportFileName || "";

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
                    {isMissingTitleReviewCreated ? (
                      <>
                        Creamos una solicitud para revisar otro título asociado
                        al documento{" "}
                        <span className="font-mono font-bold text-[#1e5da8]">
                          {reviewConfirmationDocument}
                        </span>{" "}
                        que no aparece disponible en la plataforma.
                        {reviewConfirmationProgram ? (
                          <>
                            {" "}
                            Título solicitado:{" "}
                            <strong className="text-gray-900">
                              {reviewConfirmationProgram}
                            </strong>
                            .
                          </>
                        ) : null}
                      </>
                    ) : (
                      <>
                        No encontramos el registro del graduado con el documento{" "}
                        <span className="font-mono font-bold text-[#1e5da8]">
                          {graduateDocumentNumber}
                        </span>{" "}
                        en nuestra base de datos de graduados ESAP.
                      </>
                    )}
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
                        Documento consultado
                      </p>
                      <p className="font-mono font-bold text-lg text-gray-900">
                        {reviewConfirmationDocument}
                      </p>
                    </div>
                    {reviewConfirmationGraduationDate && (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 font-medium">
                          Fecha de Grado
                        </p>
                        <p className="font-bold text-lg text-gray-900">
                          {formatInputDate(reviewConfirmationGraduationDate)}
                        </p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 font-medium">
                        {isMissingTitleReviewCreated
                          ? "Nombre del Graduado"
                          : "Solicitante"}
                      </p>
                      <p className="font-bold text-lg text-gray-900">
                        {reviewConfirmationName || "Sin registrar"}
                      </p>
                    </div>
                    {isMissingTitleReviewCreated ? (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 font-medium">
                          Título a Revisar
                        </p>
                        <p className="font-bold text-lg text-[#1e5da8]">
                          {reviewConfirmationProgram || "Sin registrar"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 font-medium">
                          Email de Contacto
                        </p>
                        <p className="font-bold text-lg text-[#1e5da8] break-all">
                          {requesterEmail}
                        </p>
                      </div>
                    )}
                    {reviewConfirmationGraduateEmail && (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 font-medium">
                          Correo del Graduado
                        </p>
                        <p className="font-bold text-lg text-[#1e5da8] break-all">
                          {reviewConfirmationGraduateEmail}
                        </p>
                      </div>
                    )}
                    {reviewConfirmationSupportFileName && (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 font-medium">
                          Soporte adjunto
                        </p>
                        <p className="font-bold text-lg text-[#1e5da8] break-all">
                          {reviewConfirmationSupportFileName}
                        </p>
                      </div>
                    )}
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
                            {isMissingTitleReviewCreated ? (
                              "El equipo de Verificación de títulos revisará el título seleccionado para crear el nuevo registro si corresponde."
                            ) : (
                              <>
                                Te enviaremos un correo de confirmación a{" "}
                                <strong className="text-gray-900">
                                  {requesterEmail}
                                </strong>
                              </>
                            )}
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
                    className="flex-1 h-12 text-base border-2 border-gray-300 text-gray-700 bg-white hover:bg-[#1e5da8]/10 hover:border-[#1e5da8] hover:text-[#1e5da8] transition-all"
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
                <ESAPLogo variant="white" className="shrink-0" style={{ width: '189px', height: '56px' }} />
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
              Verificación Oficial de Títulos
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 mb-3 leading-tight px-4">
            <span className="block sm:inline">Verificación de títulos</span>
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
                      Verificación de títulos
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
                            inputMode="numeric"
                            maxLength={COMPANY_NIT_MAX_LENGTH}
                            pattern={`[0-9]{${COMPANY_NIT_MIN_LENGTH},${COMPANY_NIT_MAX_LENGTH}}`}
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
                            onChange={(e) =>
                              setRequesterName(
                                e.target.value.slice(0, COMPANY_NAME_MAX_LENGTH),
                              )
                            }
                            maxLength={COMPANY_NAME_MAX_LENGTH}
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
                            onChange={(e) =>
                              setRequesterEmail(
                                e.target.value.slice(0, EMAIL_MAX_LENGTH),
                              )
                            }
                            maxLength={EMAIL_MAX_LENGTH}
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
                            onChange={(e) =>
                              handleContactPersonChange(e.target.value)
                            }
                            maxLength={PERSON_NAME_MAX_LENGTH}
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
                        onChange={(e) =>
                          handleGraduateNameChange(e.target.value)
                        }
                        maxLength={PERSON_NAME_MAX_LENGTH}
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
                          Número de Documento{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="graduateDocument"
                          type="text"
                          value={graduateDocumentNumber}
                          onChange={(e) =>
                            handleGraduateDocumentChange(e.target.value)
                          }
                          inputMode="text"
                          minLength={DOCUMENT_MIN_LENGTH}
                          maxLength={DOCUMENT_MAX_LENGTH}
                          pattern={`[A-Za-z0-9]{${DOCUMENT_MIN_LENGTH},${DOCUMENT_MAX_LENGTH}}`}
                          placeholder="Ej: AB1234567"
                          className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Entre {DOCUMENT_MIN_LENGTH} y {DOCUMENT_MAX_LENGTH}{" "}
                          caracteres, únicamente letras y números.
                        </p>
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
                          max={todayInputDate}
                          onChange={(e) =>
                            handleGraduationDateChange(e.target.value)
                          }
                          aria-invalid={!!graduationDateError}
                          aria-describedby={
                            graduationDateError
                              ? "documentIssueDate-error"
                              : undefined
                          }
                          className={`h-10 text-sm focus:ring-1 ${
                            graduationDateError
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                          }`}
                        />
                        {graduationDateError && (
                          <p
                            id="documentIssueDate-error"
                            className="text-xs text-red-600 mt-1"
                          >
                            {graduationDateError}
                          </p>
                        )}
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
                            onChange={(e) =>
                              setRequesterEmail(
                                e.target.value.slice(0, EMAIL_MAX_LENGTH),
                              )
                            }
                            maxLength={EMAIL_MAX_LENGTH}
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
                          encontradas con ese documento antes de generar el
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
                                  Documento {suggestion.idNumber} |{" "}
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
                            Confirmar selección
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          void handleSearchAgain();
                        }}
                        disabled={isGenerating || isConfirmingSelection}
                        className="h-10 px-4 text-sm font-semibold border-gray-300"
                      >
                        Buscar nuevamente
                      </Button>
                    </div>

                    {(!showManualReviewDialog ||
                      manualReviewReason !== "missing_title") && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-amber-950">
                              ¿Te falta otro título?
                            </p>
                            <p className="text-xs leading-5 text-amber-900">
                              Si el título que buscas no aparece en estas
                              coincidencias, puedes crear una solicitud de
                              revisión manual.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => openMissingTitleReviewPrompt()}
                            disabled={isGenerating || isConfirmingSelection}
                            className="group h-10 border-amber-300 bg-white text-sm font-semibold text-amber-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-100 hover:text-amber-950 hover:shadow-md focus:ring-2 focus:ring-amber-200 disabled:translate-y-0 disabled:hover:bg-white"
                          >
                            <FileText className="mr-2 h-4 w-4 text-amber-700 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:text-amber-900" />
                            Crear solicitud de revisión
                          </Button>
                        </div>
                      </div>
                    )}
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
                            {manualReviewTitle}
                          </p>
                          <p className="text-sm leading-6 text-gray-600">
                            {manualReviewDescription}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl border border-amber-100 bg-white/80 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            {isMissingTitleManualReview
                              ? "Documento seleccionado"
                              : "Documento consultado"}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">
                            {manualReviewDisplayDocument || "Sin registrar"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-amber-100 bg-white/80 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            {isMissingTitleManualReview
                              ? "Nombre completo"
                              : "Nombre ingresado"}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">
                            {manualReviewDisplayName || "Sin registrar"}
                          </p>
                        </div>
                        {manualReviewDisplayGraduationDate && (
                          <div className="rounded-xl border border-amber-100 bg-white/80 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              {isMissingTitleManualReview
                                ? "Fecha de grado ingresada"
                                : "Fecha de grado"}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {formatInputDate(
                                manualReviewDisplayGraduationDate,
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {isMissingTitleManualReview && (
                        <div className="rounded-xl border border-amber-100 bg-white/85 px-4 py-3">
                          <Label
                            htmlFor="missing-title-program"
                            className="mb-2 block text-xs font-semibold text-gray-700"
                          >
                            Título que deseas revisar{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <select
                            id="missing-title-program"
                            value={missingTitleProgramName}
                            onChange={(event) =>
                              handleMissingTitleChange(event.target.value)
                            }
                            className="h-10 w-full rounded-md border border-amber-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                          >
                            <option value="">Seleccionar título</option>
                            {GRADUATE_PROGRAM_OPTIONS.map((program) => (
                              <option key={program} value={program}>
                                {program}
                              </option>
                            ))}
                          </select>
                          <p className="mt-2 text-xs leading-5 text-gray-600">
                            Selecciona el título que no aparece en los
                            resultados para que el equipo de Verificación de títulos pueda
                            validarlo.
                          </p>
                          {selectedMissingTitleAlreadyExists && (
                            <p className="mt-2 text-xs font-semibold leading-5 text-red-600">
                              Ese título ya existe para la persona seleccionada.
                              Selecciona un título diferente para solicitar
                              revisión.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="rounded-xl border border-amber-100 bg-white/85 px-4 py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-700">
                              Soporte de la solicitud{" "}
                              <span className="text-red-500">*</span>
                            </p>
                            <p className="mt-1 text-xs leading-5 text-gray-600">
                              Adjunta el diploma, acta de grado o soporte
                              relacionado en PDF. Tamaño máximo:{" "}
                              {MANUAL_REVIEW_SUPPORT_MAX_SIZE_LABEL}.
                            </p>
                          </div>
                          <input
                            ref={manualReviewSupportInputRef}
                            id="manual-review-support-file"
                            type="file"
                            accept="application/pdf,.pdf"
                            className="sr-only"
                            onChange={handleManualReviewSupportFileChange}
                          />
                          <label
                            htmlFor="manual-review-support-file"
                            className="group inline-flex h-11 min-w-[136px] cursor-pointer items-center justify-center rounded-lg border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-4 text-sm font-semibold text-amber-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400 hover:from-amber-100 hover:to-orange-100 hover:text-amber-900 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-200 active:translate-y-0 active:shadow-sm"
                          >
                            <UploadCloud className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
                            {manualReviewSupportFile ? "Cambiar PDF" : "Cargar PDF"}
                          </label>
                        </div>

                        {manualReviewSupportFile ? (
                          <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                                  <Paperclip className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-gray-900">
                                    {manualReviewSupportFile.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    PDF - {formatBytes(manualReviewSupportFile.size)}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={resetManualReviewSupportFile}
                                disabled={isGenerating}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Quitar soporte"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            {isGenerating && manualReviewSupportUploadProgress > 0 && (
                              <div className="mt-3 space-y-1">
                                <div className="h-2 overflow-hidden rounded-full bg-amber-100">
                                  <div
                                    className="h-full rounded-full bg-[#1e5da8] transition-all duration-300"
                                    style={{
                                      width: `${Math.max(
                                        0,
                                        Math.min(100, manualReviewSupportUploadProgress),
                                      )}%`,
                                    }}
                                  />
                                </div>
                                <p className="text-right text-[11px] font-semibold text-blue-700">
                                  {Math.round(manualReviewSupportUploadProgress)}%
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="mt-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-xs font-semibold text-amber-900">
                            Adjunta un PDF para poder enviar la solicitud de revisión.
                          </p>
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
                          onClick={
                            isMissingTitleManualReview
                              ? hideManualReviewPrompt
                              : clearMatchSuggestions
                          }
                          className="h-11 border-gray-300 text-sm font-semibold"
                        >
                          {manualReviewCancelLabel}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            void handleManualReviewSubmit();
                          }}
                          disabled={
                            isGenerating ||
                            isConfirmingSelection ||
                            (isMissingTitleManualReview &&
                              (!normalizeTextSpaces(missingTitleProgramName) ||
                                selectedMissingTitleAlreadyExists))
                          }
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
                              Enviar solicitud de revisión
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
                        isGenerating ||
                        isConfirmingSelection ||
                        !acceptedTerms ||
                        hasPendingMatchSuggestions
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
                      disabled={
                        isGenerating ||
                        isConfirmingSelection ||
                        hasPendingMatchSuggestions
                      }
                      className="h-10 px-4 text-sm font-semibold border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancelar
                    </Button>
                  </div>

                  {hasPendingMatchSuggestions && (
                    <p className="text-xs text-blue-700 text-center">
                      <Shield className="w-3 h-3 inline-block mr-1" />
                      Resuelve las coincidencias encontradas usando las acciones superiores.
                    </p>
                  )}

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
              <ESAPLogo variant="white" className="shrink-0" style={{ width: '189px', height: '56px' }} />
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
