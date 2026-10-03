import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportesService } from '../services/reportes.service';
import { ReportesController } from './reportes.controller';

function reqConRoles(roles: string[]) {
    return { user: { roles } } as any;
}

describe('ReportesController', () => {
    let controller: ReportesController;
    let mockReportesService: any;

    beforeEach(async () => {
        mockReportesService = {
            getStats: jest.fn().mockResolvedValue({ total: 10 }),
            getReportData: jest.fn().mockResolvedValue({ items: [] }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ReportesController],
            providers: [{ provide: ReportesService, useValue: mockReportesService }],
        }).compile();

        controller = module.get<ReportesController>(ReportesController);
    });

    afterEach(() => jest.clearAllMocks());

    describe('getStats()', () => {
        it('rechaza a un usuario sin rol de vista global de Gestión Legal', async () => {
            await expect(controller.getStats(reqConRoles(['ABOGADO_SUSTANCIADOR'])))
                .rejects.toBeInstanceOf(ForbiddenException);
            expect(mockReportesService.getStats).not.toHaveBeenCalled();
        });

        it('permite el acceso a SUPER_ADMIN', async () => {
            await controller.getStats(reqConRoles(['SUPER_ADMIN']));
            expect(mockReportesService.getStats).toHaveBeenCalledTimes(1);
        });

        it('permite el acceso a JEFE_GESTION_LEGAL', async () => {
            await controller.getStats(reqConRoles(['JEFE_GESTION_LEGAL']));
            expect(mockReportesService.getStats).toHaveBeenCalledTimes(1);
        });
    });

    describe('getReportData()', () => {
        it('rechaza a un usuario sin rol de vista global aunque conozca el reportId', async () => {
            await expect(controller.getReportData('GL-001', reqConRoles(['ABOGADO_SUSTANCIADOR'])))
                .rejects.toBeInstanceOf(ForbiddenException);
            expect(mockReportesService.getReportData).not.toHaveBeenCalled();
        });

        it('permite el acceso a un rol de vista global y delega en el servicio con el reportId', async () => {
            await controller.getReportData('GL-001', reqConRoles(['MONITOREO_GESTION_LEGAL']));
            expect(mockReportesService.getReportData).toHaveBeenCalledWith('GL-001');
        });
    });
});
