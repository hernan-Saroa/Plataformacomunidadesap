@echo off
setlocal enabledelayedexpansion

REM Script para ejecutar todas las migraciones en la base de datos PostgreSQL
REM Configuración de la base de datos
set DB_HOST=localhost
set DB_PORT=8080
set DB_USER=postgres
set DB_PASS=postgres
set DB_NAME=esap_db

REM Ruta al ejecutable de psql (ajusta si es necesario)
set PSQL_PATH="C:\Program Files\PostgreSQL\16\bin\psql.exe"

REM Verificar si psql existe
if not exist %PSQL_PATH% (
    echo Error: psql no encontrado en %PSQL_PATH%
    echo Por favor instala PostgreSQL o ajusta la ruta.
    pause
    exit /b 1
)

REM Directorio de migraciones
set MIGRATIONS_DIR=db\migrations

REM Verificar que el directorio existe
if not exist "%MIGRATIONS_DIR%" (
    echo Error: No se encuentra el directorio %MIGRATIONS_DIR%
    pause
    exit /b 1
)

REM Establecer la contraseña
set PGPASSWORD=%DB_PASS%

echo ========================================
echo Ejecutando migraciones...
echo DB: %DB_HOST%:%DB_PORT%/%DB_NAME%
echo Usuario: %DB_USER%
echo ========================================

set COUNT=0
set SUCCESS=0
set FAILED=0

REM Ejecutar cada archivo .sql en orden alfabético
for %%f in ("%MIGRATIONS_DIR%\*.sql") do (
    set /a COUNT+=1
    echo [!COUNT!] Ejecutando: %%~nxf

    REM Ejecutar el archivo SQL
    %PSQL_PATH% -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%%f" >nul 2>&1
    if !errorlevel! equ 0 (
        echo     ✓ OK
        set /a SUCCESS+=1
    ) else (
        echo     ✗ ERROR
        set /a FAILED+=1
        echo     Detalles del error:
        %PSQL_PATH% -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%%f"
    )
)

echo.
echo ========================================
echo Resumen:
echo Total ejecutados: %COUNT%
echo Exitosos: %SUCCESS%
echo Fallidos: %FAILED%
echo ========================================

if %FAILED% gtr 0 (
    echo.
    echo ❌ Algunas migraciones fallaron. Revisa los errores.
    pause
    exit /b 1
) else (
    echo.
    echo ✅ Todas las migraciones se ejecutaron exitosamente.
)

pause
endlocal