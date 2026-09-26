# Commands

## Backend Tests (travel-expenses-service)
- Run all backend tests: `cd backend/travel-expenses-service && npx jest --verbose`
- Run specific test file: `cd backend/travel-expenses-service && npx jest src/modules/travel-expenses/travel-expenses.service.spec.ts --verbose`

## Frontend Tests (mfe-viaticos)
- Run all frontend tests: `cd apps/mfe-viaticos && npx vitest run`
- Run specific test file: `cd apps/mfe-viaticos && npx vitest run <path-to-test> --reporter=verbose`

## Build Verification
- Backend build: `cd backend/travel-expenses-service && npm run build`
- Frontend TypeScript check: `cd apps/mfe-viaticos && npx tsc --noEmit`
