import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { plainToClass } from 'class-transformer';
import { UsersService } from './users.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { PersonResponseDto } from './dto/person-response.dto';
import { Seccional } from './seccional.entity';
import { Sede } from './sede.entity';
import { User } from './user.entity';
import { InternalServiceAccess } from '../auth/decorators/internal-service.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AUTH_MANAGE_ROLES } from '../auth/authorization.constants';

type AuthRequest = Request & {
  user?: {
    internalService?: boolean;
  };
};

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private isInternalServiceRequest(req: AuthRequest): boolean {
    return Boolean(req.user?.internalService);
  }

  private toPersonResponseDto(
    user: User,
    exposeInternalIds = false,
  ): PersonResponseDto {
    const person = user.person;
    const seccional = person?.seccional as Seccional | undefined;
    const sede = person?.sede as Sede | undefined;
    const responseUserId = exposeInternalIds ? user.id_user : user.public_id;

    return plainToClass(PersonResponseDto, {
      ...person,
      user: {
        id_user: responseUserId,
        public_id: user.public_id,
        username: user.username,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        roles: user.roles,
      },
      idSeccional: person?.idSeccional || null,
      seccional: seccional
        ? {
            idSeccional: seccional.idSeccional,
            codSeccional: seccional.codSeccional,
            nomSeccional: seccional.nomSeccional,
            ubicacion: seccional.ubicacion?.nomDivGeopolitica || null,
          }
        : null,
      idSede: person?.idSede || null,
      sede: sede
        ? {
            idSede: sede.idSede,
            codSede: sede.codSede,
            nomSede: sede.nomSede,
            ubicacion: sede.geopolitica?.nomDivGeopolitica || null,
          }
        : null,
    });
  }

  @Get()
  @InternalServiceAccess()
  async findAll(
    @Req() req: AuthRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('role') role?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const exposeInternalIds = this.isInternalServiceRequest(req);

    const { users, total, totalActive, totalBlocked } =
      await this.usersService.findAllPaginated(pageNum, limitNum, {
        search,
        status,
        role,
        sortBy,
        sortOrder,
      });

    return {
      data: users.map((user) =>
        this.toPersonResponseDto(user, exposeInternalIds),
      ),
      meta: {
        total,
        totalActive,
        totalBlocked,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get(':id')
  @InternalServiceAccess()
  async findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    const exposeInternalIds = this.isInternalServiceRequest(req);
    const user = await this.usersService.findById(id, {
      allowInternalId: exposeInternalIds,
    });

    return this.toPersonResponseDto(user, exposeInternalIds);
  }

  @Post()
  @Roles(...AUTH_MANAGE_ROLES)
  async create(@Req() req: AuthRequest, @Body() createPersonDto: CreatePersonDto) {
    const user = await this.usersService.createPerson(createPersonDto);
    return this.toPersonResponseDto(
      user,
      this.isInternalServiceRequest(req),
    );
  }

  @Put(':id')
  @Roles(...AUTH_MANAGE_ROLES)
  async update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() updatePersonDto: Partial<CreatePersonDto>,
  ) {
    const exposeInternalIds = this.isInternalServiceRequest(req);
    const user = await this.usersService.updatePerson(id, updatePersonDto, {
      allowInternalId: exposeInternalIds,
    });

    return this.toPersonResponseDto(user, exposeInternalIds);
  }

  @Delete(':id')
  @Roles(...AUTH_MANAGE_ROLES)
  async remove(@Req() req: AuthRequest, @Param('id') id: string) {
    await this.usersService.deletePerson(id, {
      allowInternalId: this.isInternalServiceRequest(req),
    });

    return { message: 'User deleted successfully' };
  }

  @Put(':id/status')
  @Roles(...AUTH_MANAGE_ROLES)
  async updateStatus(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body('is_active') isActive: boolean,
  ) {
    const exposeInternalIds = this.isInternalServiceRequest(req);
    const user = await this.usersService.updateUserStatus(id, isActive, {
      allowInternalId: exposeInternalIds,
    });

    return this.toPersonResponseDto(user, exposeInternalIds);
  }

  @Put(':id/password')
  @Roles(...AUTH_MANAGE_ROLES)
  async adminResetPassword(
    @Param('id') id: string,
    @Body('new_password') newPassword: string,
  ) {
    await this.usersService.adminResetPassword(id, newPassword);
    return { message: 'Contraseña actualizada exitosamente' };
  }
}
