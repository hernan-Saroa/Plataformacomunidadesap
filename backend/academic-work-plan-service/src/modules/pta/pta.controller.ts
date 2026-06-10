import { Controller, Get, Post, Param } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PtaService } from './pta.service';

@Controller('pta')
export class PtaController {
    constructor(private readonly ptaService: PtaService) { }

    @Get()
    findAll() {
        return this.ptaService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.ptaService.findOne(id);
    }

    @Roles('Director', 'Coordinador', 'Administrativo')
    @Post('aprobar/:id')
    aprobar(@Param('id') id: string) {
        return this.ptaService.aprobar(id, 'superuser');
    }

    @Roles('Director', 'Coordinador', 'Administrativo')
    @Post('rechazar/:id')
    rechazar(@Param('id') id: string) {
        return this.ptaService.rechazar(id, 'superuser');
    }
}