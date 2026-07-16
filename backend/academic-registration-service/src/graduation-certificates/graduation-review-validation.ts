import { BadRequestException } from '@nestjs/common';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { UpdateGraduateDto } from './dto/update-graduate.dto';

export const GRADUATION_REVIEW_LIMITS = {
  reviewNotes: { min: 10, max: 4000 },
  fullName: { min: 5, max: 150 },
  idNumber: { min: 5, max: 20 },
  email: { min: 5, max: 254 },
  numRegistro: { min: 1, max: 20 },
  numFolio: { min: 1, max: 10 },
  numLibro: { min: 1, max: 10 },
} as const;

export const GRADUATE_MANAGEMENT_LIMITS = {
  numRegistro: { min: 1, max: 20 },
  numFolio: { min: 1, max: 10 },
  numLibro: { min: 1, max: 10 },
} as const;

const PERSON_NAME_REGEX = /^[\p{L}\s'’-]+$/u;
const DOCUMENT_REGEX = /^[A-Za-z0-9]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIGITS_REGEX = /^\d+$/;

const trimOptionalText = (value?: string): string | undefined =>
  value === undefined ? undefined : value.trim();

const normalizePersonName = (value?: string): string | undefined =>
  trimOptionalText(value)?.normalize('NFC').replace(/\s+/g, ' ');

export function normalizeReviewNotes(value?: string): string {
  const notes = (value || '').trim();
  const { min, max } = GRADUATION_REVIEW_LIMITS.reviewNotes;

  if (notes.length < min) {
    throw new BadRequestException(
      `Las notas de revisión deben tener al menos ${min} caracteres`,
    );
  }
  if (notes.length > max) {
    throw new BadRequestException(
      `Las notas de revisión no pueden superar ${max} caracteres`,
    );
  }

  return notes;
}

export function normalizeAndValidateGraduateReviewPayload(
  payload: ApproveRequestDto,
): ApproveRequestDto {
  const normalized: ApproveRequestDto = {
    ...payload,
    reviewNotes: trimOptionalText(payload.reviewNotes) || '',
    reviewerName: trimOptionalText(payload.reviewerName),
    reviewerId: trimOptionalText(payload.reviewerId),
    publicNotificationNotes: trimOptionalText(payload.publicNotificationNotes),
    fullName: normalizePersonName(payload.fullName),
    idNumber: trimOptionalText(payload.idNumber),
    email: trimOptionalText(payload.email),
    phone: trimOptionalText(payload.phone),
    programName: trimOptionalText(payload.programName),
    programType: trimOptionalText(payload.programType),
    degreeTitle: trimOptionalText(payload.degreeTitle),
    campus: trimOptionalText(payload.campus),
    seccionalName: trimOptionalText(payload.seccionalName),
    numRegistro: trimOptionalText(payload.numRegistro),
    numFolio: trimOptionalText(payload.numFolio),
    numLibro: trimOptionalText(payload.numLibro),
  };

  validateRequiredText(
    normalized.fullName,
    'El nombre completo',
    GRADUATION_REVIEW_LIMITS.fullName.min,
    GRADUATION_REVIEW_LIMITS.fullName.max,
  );
  if (!PERSON_NAME_REGEX.test(normalized.fullName!)) {
    throw new BadRequestException(
      'El nombre completo solo puede contener letras, espacios, apóstrofos y guiones',
    );
  }

  validateRequiredText(
    normalized.idNumber,
    'El documento',
    GRADUATION_REVIEW_LIMITS.idNumber.min,
    GRADUATION_REVIEW_LIMITS.idNumber.max,
  );
  if (!DOCUMENT_REGEX.test(normalized.idNumber!)) {
    throw new BadRequestException(
      'El documento solo puede contener letras y números',
    );
  }

  validateRequiredText(
    normalized.email,
    'El email',
    GRADUATION_REVIEW_LIMITS.email.min,
    GRADUATION_REVIEW_LIMITS.email.max,
  );
  if (!EMAIL_REGEX.test(normalized.email!)) {
    throw new BadRequestException('El correo electrónico no tiene un formato válido');
  }

  validateDigitsField(
    normalized.numRegistro,
    'El número de registro',
    GRADUATION_REVIEW_LIMITS.numRegistro.max,
  );
  validateDigitsField(
    normalized.numFolio,
    'El número de folio',
    GRADUATION_REVIEW_LIMITS.numFolio.max,
  );
  validateDigitsField(
    normalized.numLibro,
    'El número de libro',
    GRADUATION_REVIEW_LIMITS.numLibro.max,
  );

  return normalized;
}

export function normalizeAndValidateGraduateManagementUpdate(
  payload: UpdateGraduateDto,
  current: Pick<
    UpdateGraduateDto,
    | 'fullName'
    | 'firstName'
    | 'lastName'
    | 'idNumber'
    | 'email'
    | 'numRegistro'
    | 'numFolio'
    | 'numLibro'
  >,
): UpdateGraduateDto {
  const normalized: UpdateGraduateDto = {
    ...payload,
    fullName: normalizePersonName(payload.fullName),
    firstName: normalizePersonName(payload.firstName),
    lastName: normalizePersonName(payload.lastName),
    idNumber: trimOptionalText(payload.idNumber),
    email: trimOptionalText(payload.email),
    numRegistro: normalizeOptionalDigits(payload.numRegistro),
    numFolio: normalizeOptionalDigits(payload.numFolio),
    numLibro: normalizeOptionalDigits(payload.numLibro),
  };

  const hasNameParts =
    payload.firstName !== undefined || payload.lastName !== undefined;
  if (payload.firstName !== undefined) {
    validateNamePart(normalized.firstName, 'El nombre');
  }
  if (payload.lastName !== undefined) {
    validateNamePart(normalized.lastName, 'El apellido');
  }

  if (hasNameParts) {
    const combinedName = normalizePersonName(
      `${normalized.firstName ?? current.firstName ?? ''} ${
        normalized.lastName ?? current.lastName ?? ''
      }`,
    );
    validateFullName(combinedName);
    normalized.fullName = combinedName;
  } else if (payload.fullName !== undefined) {
    validateFullName(normalized.fullName);
  }

  if (payload.idNumber !== undefined) {
    validateRequiredText(
      normalized.idNumber,
      'El documento',
      GRADUATION_REVIEW_LIMITS.idNumber.min,
      GRADUATION_REVIEW_LIMITS.idNumber.max,
    );
    if (!DOCUMENT_REGEX.test(normalized.idNumber!)) {
      throw new BadRequestException(
        'El documento solo puede contener letras y números',
      );
    }
  }

  if (payload.email !== undefined) {
    validateRequiredText(
      normalized.email,
      'El correo electrónico',
      GRADUATION_REVIEW_LIMITS.email.min,
      GRADUATION_REVIEW_LIMITS.email.max,
    );
    if (!EMAIL_REGEX.test(normalized.email!)) {
      throw new BadRequestException(
        'El correo electrónico no tiene un formato válido',
      );
    }
  }

  if (payload.numRegistro !== undefined) {
    validateDigitsField(
      normalized.numRegistro,
      'El número de registro',
      GRADUATE_MANAGEMENT_LIMITS.numRegistro.max,
    );
  }
  if (payload.numFolio !== undefined) {
    validateDigitsField(
      normalized.numFolio,
      'El número de folio',
      GRADUATE_MANAGEMENT_LIMITS.numFolio.max,
    );
  }
  if (payload.numLibro !== undefined) {
    validateDigitsField(
      normalized.numLibro,
      'El número de libro',
      GRADUATE_MANAGEMENT_LIMITS.numLibro.max,
    );
  }

  return normalized;
}

function validateRequiredText(
  value: string | undefined,
  label: string,
  min: number,
  max: number,
) {
  const length = value?.length || 0;
  if (length < min || length > max) {
    throw new BadRequestException(
      `${label} debe tener entre ${min} y ${max} caracteres`,
    );
  }
}

function validateNamePart(value: string | undefined, label: string) {
  if (!value) {
    throw new BadRequestException(`${label} es obligatorio`);
  }
  if (
    value.length > GRADUATION_REVIEW_LIMITS.fullName.max ||
    !PERSON_NAME_REGEX.test(value)
  ) {
    throw new BadRequestException(
      `${label} solo puede contener letras, espacios, apóstrofos y guiones`,
    );
  }
}

function validateFullName(value: string | undefined) {
  validateRequiredText(
    value,
    'El nombre completo',
    GRADUATION_REVIEW_LIMITS.fullName.min,
    GRADUATION_REVIEW_LIMITS.fullName.max,
  );
  if (!PERSON_NAME_REGEX.test(value!)) {
    throw new BadRequestException(
      'El nombre completo solo puede contener letras, espacios, apóstrofos y guiones',
    );
  }
}

function normalizeOptionalDigits(value?: string): string | undefined {
  const normalized = trimOptionalText(value);
  return normalized || undefined;
}

function validateDigitsField(
  value: string | undefined,
  label: string,
  max: number,
) {
  if (!value || value.length > max || !DIGITS_REGEX.test(value)) {
    throw new BadRequestException(
      `${label} es obligatorio y debe contener solo números, máximo ${max} dígitos`,
    );
  }
}
