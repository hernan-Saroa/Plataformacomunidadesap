import { describe,it,expect,afterEach,vi } from 'vitest';
import { render,screen,cleanup } from '@testing-library/react';
import { runCarpetaStatsCases } from '../../../../../packages/shared-hooks/src/carpetaStatsInterfaceCases';
vi.mock('../../services/api/supabase.service',()=>({documentosService:{}}));
vi.mock('../../services/api/apiClient',()=>({apiClient:{}}));
import { CarpetaDigitalSharedView } from './CarpetaDigitalSharedView';
runCarpetaStatsCases({describe,it,expect,afterEach,render,screen,cleanup,Component:CarpetaDigitalSharedView});
