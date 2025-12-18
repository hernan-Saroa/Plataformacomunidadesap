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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePersonDto } from './dto/create-person.dto';
import { PersonResponseDto } from './dto/person-response.dto';
import { plainToClass } from 'class-transformer';
import { Seccional } from './seccional.entity';
import { Sede } from './sede.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  // @UseGuards(JwtAuthGuard) // Uncomment if auth is required
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    // Convertir query params a números si vienen como strings
    const pageNum = Number(page);
    const limitNum = Number(limit);

    // Usar paginación real en la base de datos
    const { users, total, totalActive, totalBlocked } =
      await this.usersService.findAllPaginated(pageNum, limitNum);

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
  // @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
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
  // @UseGuards(JwtAuthGuard)
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
  // @UseGuards(JwtAuthGuard)
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
  // @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    await this.usersService.deletePerson(id);
    return { message: 'User deleted successfully' };
  }

  @Put(':id/status')
  // @UseGuards(JwtAuthGuard)
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
