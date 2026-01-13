@echo off
setlocal enabledelayedexpansion

REM =====================================================
REM Migraciones locales para Windows (equivalente a migrate.local.sh)
REM Usa variables desde backend/auth-service/.env
REM Pasos:
REM 1. chmod +x migrate.local.sh -> No necesario en Windows
REM 2. ./migrate.local.sh -> Ejecutar este script
REM =====================================================

set "ERROR_COUNT=0"

REM Verificar si el archivo .env existe
if not exist "backend\auth-service\.env" (
    echo Error: No se encontro backend\auth-service\.env
    exit /b 1
)

REM Cargar variables del .env (ignorar comentarios y lineas vacias)
for /f "usebackq tokens=*" %%A in ("backend\auth-service\.env") do (
    set "line=%%A"
    if "!line:~0,1!" neq "#" (
        if "!line!" neq "" (
            for /f "tokens=1,* delims==" %%B in ("!line!") do (
                set "%%B=%%C"
            )
        )
    )
)

REM Verificar que las variables de base de datos estén definidas
if "%DB_HOST%"=="" (
    echo Error: DB_HOST no definido en el .env
    set /a ERROR_COUNT+=1
)
if "%DB_PORT%"=="" (
    echo Error: DB_PORT no definido en el .env
    set /a ERROR_COUNT+=1
)
if "%DB_USER%"=="" (
    echo Error: DB_USER no definido en el .env
    set /a ERROR_COUNT+=1
)
if "%DB_NAME%"=="" (
    echo Error: DB_NAME no definido en el .env
    set /a ERROR_COUNT+=1
)
if "%DB_SCHEMA%"=="" (
    echo Error: DB_SCHEMA no definido en el .env
    set /a ERROR_COUNT+=1
)

if %ERROR_COUNT% gtr 0 (
    echo.
    echo Por favor verifica que el archivo backend\auth-service\.env contenga las variables necesarias.
    exit /b 1
)

REM Verificar si PostgreSQL está disponible
set "PSQL_PATH=C:\Program Files\PostgreSQL\18\bin\psql.exe"
if not exist "%PSQL_PATH%" (
    echo Error: PostgreSQL no encontrado en %PSQL_PATH%
    echo Por favor instala PostgreSQL o ajusta la ruta en este script.
    exit /b 1
)

REM Directorio de migraciones
set "MIGRATIONS_DIR=db/migrations"

REM Verificar que el directorio de migraciones exista
if not exist "%MIGRATIONS_DIR%" (
    echo No existe la carpeta %MIGRATIONS_DIR%, nada que hacer.
    exit /b 0
)

REM Obtener lista de archivos de migración
set "MIGRATION_FILES="
for %%F in (%MIGRATIONS_DIR%\*.sql) do (
    set "MIGRATION_FILES=!MIGRATION_FILES! %%F"
)

if "%MIGRATION_FILES%"=="" (
    echo No hay archivos .sql en %MIGRATIONS_DIR%
    exit /b 0
)

REM Establecer la contraseña de la base de datos
set "PGPASSWORD=%DB_PASS%"

echo ========================================
echo   Ejecutando migraciones locales
echo   DB: %DB_HOST%:%DB_PORT%/%DB_NAME% (schema: %DB_SCHEMA%)
echo ========================================

REM Crear esquema y tabla de control si no existen
echo Creando esquema y tabla de control...
"%PSQL_PATH%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE SCHEMA IF NOT EXISTS %DB_SCHEMA%;" >nul 2>&1
"%PSQL_PATH%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE TABLE IF NOT EXISTS %DB_SCHEMA%.migrations_db_log (filename TEXT PRIMARY KEY, executed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now());" >nul 2>&1

REM Obtener migraciones ya aplicadas
set "APPLIED_COUNT=0"
for /f "tokens=*" %%A in ('"%PSQL_PATH%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -At -c "SELECT filename FROM %DB_SCHEMA%.migrations_db_log;" 2^>nul') do (
    set "APPLIED_%%A=1"
    set /a APPLIED_COUNT+=1
)

echo.
echo Migraciones previamente aplicadas: %APPLIED_COUNT%
echo.

set "MIGRATION_COUNT=0"
set "MIGRATION_SUCCESS=0"
set "MIGRATION_FAILED=0"

REM Ejecutar cada migración individualmente
for %%F in (%MIGRATIONS_DIR%\*.sql) do (
    set "filename=%%~nxF"
    set "filepath=%%F"
    
    REM Verificar si ya se aplicó
    if defined APPLIED_!filename! (
        echo Saltando (ya aplicada): !filename!
    ) else (
        set /a MIGRATION_COUNT+=1
        echo [%MIGRATION_COUNT%] Ejecutando: !filename!
        
        REM Ejecutar la migración
        "%PSQL_PATH%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "!filepath!" >nul 2>&1
        if !errorlevel! equ 0 (
            echo     ✓ OK
            set /a MIGRATION_SUCCESS+=1
            REM Registrar la migración como aplicada
            "%PSQL_PATH%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "INSERT INTO %DB_SCHEMA%.migrations_db_log (filename) VALUES ('!filename!') ON CONFLICT (filename) DO NOTHING;" >nul 2>&1
        ) else (
            echo     ✗ ERROR
            set /a MIGRATION_FAILED+=1
            echo     Detalles del error:
            "%PSQL_PATH%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "!filepath!"
        )
    )
)

echo.
echo ========================================
echo Total: %MIGRATION_COUNT% ^| Exitosas: %MIGRATION_SUCCESS% ^| Fallidas: %MIGRATION_FAILED%
echo ========================================

if %MIGRATION_FAILED% gtr 0 (
    echo.
    echo ❌ Algunas migraciones fallaron. Por favor revisa los errores anteriores.
    exit /b 1
) else (
    echo.
    echo ✅ Todas las migraciones se ejecutaron exitosamente.
    exit /b 0
)

endlocal