import { SetMetadata } from '@nestjs/common';

export const INTERNAL_SERVICE_ALLOWED_KEY = 'internalServiceAllowed';
export const InternalServiceAccess = () =>
  SetMetadata(INTERNAL_SERVICE_ALLOWED_KEY, true);
