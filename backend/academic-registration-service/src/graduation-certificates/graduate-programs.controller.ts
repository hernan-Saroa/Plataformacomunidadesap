import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator';
import { GraduateProgramsService } from './graduate-programs.service';

type AuthenticatedRequest = Request & {
  user?: {
    username?: string;
    email?: string;
    roles?: unknown[];
    permissions?: unknown[];
    internalService?: boolean;
  };
};

const normalizeCode = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase();

const canManagePrograms = (user?: AuthenticatedRequest['user']) => {
  if (user?.internalService) return true;

  const roles = (user?.roles || []).map((role) =>
    normalizeCode(
      typeof role === 'string'
        ? role
        : (role as { code?: string; name?: string })?.code ||
            (role as { name?: string })?.name,
    ),
  );
  if (
    roles.some((role) => role.replace(/[^a-z0-9]+/g, '_') === 'super_admin')
  ) {
    return true;
  }

  return (user?.permissions || []).some(
    (permission) =>
      normalizeCode(
        typeof permission === 'string'
          ? permission
          : (permission as { code?: string })?.code,
      ) === 'graduates.edit',
  );
};

@Controller([
  'graduate-programs',
  'academic-registration/api/v1/graduate-programs',
])
export class GraduateProgramsController {
  constructor(private readonly service: GraduateProgramsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('options')
  @Public()
  listOptions() {
    return this.service.listOptions();
  }

  @Post()
  create(@Body('name') name: unknown, @Req() req: AuthenticatedRequest) {
    if (!canManagePrograms(req.user)) {
      throw new ForbiddenException(
        'Se requiere el permiso Editar Graduado para crear programas.',
      );
    }

    return this.service.create(
      name,
      req.user?.email || req.user?.username || 'Gestión de Graduados',
    );
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('name') name: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!canManagePrograms(req.user)) {
      throw new ForbiddenException(
        'Se requiere el permiso Editar Graduado para modificar programas.',
      );
    }
    return this.service.update(id, name);
  }

  @Delete(':id')
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!canManagePrograms(req.user)) {
      throw new ForbiddenException(
        'Se requiere el permiso Editar Graduado para eliminar programas.',
      );
    }
    return this.service.remove(id);
  }
}
