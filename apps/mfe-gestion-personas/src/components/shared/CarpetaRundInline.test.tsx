import {describe,it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {runRundInlineCases} from '../../../../../packages/shared-hooks/src/rundInlineCases';
vi.mock('../../services/api/apiClient',()=>({apiClient:{get:vi.fn(),post:vi.fn()}}));
vi.mock('../../services/api/supabase.service',()=>({documentosService:{}}));
import {apiClient} from '../../services/api/apiClient';
import {CarpetaDigitalSharedView} from './CarpetaDigitalSharedView';
runRundInlineCases({describe,it,expect,vi,afterEach,render,screen,fireEvent,waitFor,cleanup,api:apiClient,Component:CarpetaDigitalSharedView});
