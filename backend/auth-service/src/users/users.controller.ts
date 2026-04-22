import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { PersonResponseDto } from './dto/person-response.dto';
import { plainToClass } from 'class-transformer';
import { Seccional } from './seccional.entity';
import { Sede } from './sede.entity';
import { InternalServiceAccess } from '../auth/decorators/internal-service.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  AUTH_MANAGE_ROLES,
  AUTH_READ_ROLES,
} from '../auth/authorization.constants';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @InternalServiceAccess()
  @Roles(...AUTH_READ_ROLES)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('role') role?: string,
  ) {
    // Convertir query params a números si vienen como strings
    const pageNum = Number(page);
    const limitNum = Number(limit);

    // Usar paginación real en la base de datos
    const { users, total, totalActive, totalBlocked } =
      await this.usersService.findAllPaginated(pageNum, limitNum, {
        search,
        status,
        role,
      });

    return {
      data: users.map((user) => {
        const person = user.person;
        const seccional = person?.seccional as Seccional | undefined;
        const sede = person?.sede as Sede | undefined;

        return plainToClass(PersonResponseDto, {
          ...person,
          user: {
            id_user: user.id_user,
            username: user.username,
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at,
            roles: user.roles,
          },
          // Incluir seccional (Territorial) y sede (CETAP) en la respuesta
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
      }),
      meta: {
        total: total,
        totalActive: totalActive,
        totalBlocked: totalBlocked,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get(':id')
  @InternalServiceAccess()
  @Roles(...AUTH_READ_ROLES)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    const person = user.person;
    const seccional = person?.seccional as Seccional | undefined;
    const sede = person?.sede as Sede | undefined;

    return plainToClass(PersonResponseDto, {
      ...user.person,
      user: {
        id_user: user.id_user,
        username: user.username,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        roles: user.roles,
      },
      // Incluir seccional (Territorial) y sede (CETAP) en la respuesta
      seccional: seccional
        ? {
            idSeccional: seccional.idSeccional,
            codSeccional: seccional.codSeccional,
            nomSeccional: seccional.nomSeccional,
            ubicacion: seccional.ubicacion?.nomDivGeopolitica || null,
          }
        : null,
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

  @Post()
  @Roles(...AUTH_MANAGE_ROLES)
  async create(@Body() createPersonDto: CreatePersonDto) {
    const user = await this.usersService.createPerson(createPersonDto);
    const person = user.person;
    const seccional = person?.seccional as Seccional | undefined;
    const sede = person?.sede as Sede | undefined;

    return plainToClass(PersonResponseDto, {
      ...user.person,
      user: {
        id_user: user.id_user,
        username: user.username,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        roles: user.roles,
      },
      // Incluir seccional (Territorial) y sede (CETAP) en la respuesta
      seccional: seccional
        ? {
            idSeccional: seccional.idSeccional,
            codSeccional: seccional.codSeccional,
            nomSeccional: seccional.nomSeccional,
            ubicacion: seccional.ubicacion?.nomDivGeopolitica || null,
          }
        : null,
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

  @Put(':id')
  @Roles(...AUTH_MANAGE_ROLES)
  async update(
    @Param('id') id: string,
    @Body() updatePersonDto: Partial<CreatePersonDto>,
  ) {
    const user = await this.usersService.updatePerson(id, updatePersonDto);
    const person = user.person;
    const seccional = person?.seccional as Seccional | undefined;
    const sede = person?.sede as Sede | undefined;

    return plainToClass(PersonResponseDto, {
      ...user.person,
      user: {
        id_user: user.id_user,
        username: user.username,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        roles: user.roles,
      },
      // Incluir seccional (Territorial) y sede (CETAP) en la respuesta
      seccional: seccional
        ? {
            idSeccional: seccional.idSeccional,
            codSeccional: seccional.codSeccional,
            nomSeccional: seccional.nomSeccional,
            ubicacion: seccional.ubicacion?.nomDivGeopolitica || null,
          }
        : null,
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

  @Delete(':id')
  @Roles(...AUTH_MANAGE_ROLES)
  async remove(@Param('id') id: string) {
    await this.usersService.deletePerson(id);
    return { message: 'User deleted successfully' };
  }

  @Put(':id/status')
  @Roles(...AUTH_MANAGE_ROLES)
  async updateStatus(
    @Param('id') id: string,
    @Body('is_active') isActive: boolean,
  ) {
    const user = await this.usersService.updateUserStatus(id, isActive);
    return plainToClass(PersonResponseDto, {
      ...user.person,
      user: {
        id_user: user.id_user,
        username: user.username,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        roles: user.roles,
      },
    });
  }
}
