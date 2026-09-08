@echo off
setlocal enabledelayedexpansion

REM =====================================================
REM Migraciones locales para Windows (equivalente a migrate.local.sh)
REM Usa variables desde backend/auth-service/.env
REM Uso:
REM   migrate.local.windows.bat
REM   migrate.local.windows.bat all
REM   migrate.local.windows.bat global
REM   migrate.local.windows.bat academic-schedule-service
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
if "%DB_HOST%"=="" set /a ERROR_COUNT+=1
if "%DB_PORT%"=="" set /a ERROR_COUNT+=1
if "%DB_USER%"=="" set /a ERROR_COUNT+=1
if "%DB_NAME%"=="" set /a ERROR_COUNT+=1
if "%DB_SCHEMA%"=="" set /a ERROR_COUNT+=1

if %ERROR_COUNT% gtr 0 (
    echo.
    echo Por favor verifica que el archivo backend\auth-service\.env contenga las variables necesarias: DB_HOST, DB_PORT, DB_USER, DB_NAME, DB_SCHEMA.
    exit /b 1
)

REM Buscar psql en PATH o rutas comunes
where psql >nul 2>&1
if %errorlevel% equ 0 (
    set "PSQL_PATH=psql"
) else if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" (
    set "PSQL_PATH=C:\Program Files\PostgreSQL\18\bin\psql.exe"
) else if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" (
    set "PSQL_PATH=C:\Program Files\PostgreSQL\17\bin\psql.exe"
) else if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
    set "PSQL_PATH=C:\Program Files\PostgreSQL\16\bin\psql.exe"
) else if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
    set "PSQL_PATH=C:\Program Files\PostgreSQL\15\bin\psql.exe"
) else (
    echo Error: PostgreSQL psql no encontrado en PATH ni en C:\Program Files\PostgreSQL
    echo Por favor instala PostgreSQL o agrega psql al PATH.
    exit /b 1
)

set "TARGET_SERVICE=%~1"
if "%TARGET_SERVICE%"=="" set "TARGET_SERVICE=all"

REM Establecer la contraseña de la base de datos
set "PGPASSWORD=%DB_PASS%"

echo ========================================
echo   Ejecutando migraciones locales (Windows)
echo   Target: %TARGET_SERVICE%
echo   DB: %DB_HOST%:%DB_PORT%/%DB_NAME% (schema: %DB_SCHEMA%)
echo ========================================

REM Crear esquema y tabla de control si no existen
"%PSQL_PATH%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE SCHEMA IF NOT EXISTS %DB_SCHEMA%;" >nul 2>&1
"%PSQL_PATH%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE TABLE IF NOT EXISTS %DB_SCHEMA%.migrations_db_log (filename TEXT PRIMARY KEY, executed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now());" >nul 2>&1

REM Obtener migraciones ya aplicadas en un archivo temporal
set "TEMP_APPLIED=%TEMP%\applied_migrations_%RANDOM%.txt"
"%PSQL_PATH%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -At -c "SELECT filename FROM %DB_SCHEMA%.migrations_db_log;" > "%TEMP_APPLIED%" 2>nul

set "MIGRATION_COUNT=0"
set "MIGRATION_SUCCESS=0"
set "MIGRATION_FAILED=0"

REM Archivo temporal para consolidar lista de archivos .sql a procesar
set "TEMP_SQL_LIST=%TEMP%\sql_list_%RANDOM%.txt"
if exist "%TEMP_SQL_LIST%" del "%TEMP_SQL_LIST%"

REM 1. Recolectar archivos según TARGET_SERVICE
if /i "%TARGET_SERVICE%"=="global" (
    if exist "db\migrations" (
        for /r "db\migrations" %%F in (*.sql) do echo %%F>> "%TEMP_SQL_LIST%"
    )
) else if /i not "%TARGET_SERVICE%"=="all" (
    REM Servicio específico
    if exist "backend\%TARGET_SERVICE%\db\migrations" (
        for /r "backend\%TARGET_SERVICE%\db\migrations" %%F in (*.sql) do echo %%F>> "%TEMP_SQL_LIST%"
    )
    if exist "backend\%TARGET_SERVICE%-service\db\migrations" (
        for /r "backend\%TARGET_SERVICE%-service\db\migrations" %%F in (*.sql) do echo %%F>> "%TEMP_SQL_LIST%"
    )
    if exist "backend\%TARGET_SERVICE%\migrations" (
        for /r "backend\%TARGET_SERVICE%\migrations" %%F in (*.sql) do echo %%F>> "%TEMP_SQL_LIST%"
    )
    if exist "backend\%TARGET_SERVICE%-service\migrations" (
        for /r "backend\%TARGET_SERVICE%-service\migrations" %%F in (*.sql) do echo %%F>> "%TEMP_SQL_LIST%"
    )
    if exist "db\migrations\%TARGET_SERVICE%" (
        for /r "db\migrations\%TARGET_SERVICE%" %%F in (*.sql) do echo %%F>> "%TEMP_SQL_LIST%"
    )
    if exist "db\migrations\%TARGET_SERVICE%-service" (
        for /r "db\migrations\%TARGET_SERVICE%-service" %%F in (*.sql) do echo %%F>> "%TEMP_SQL_LIST%"
    )
) else (
    REM Todos: db/migrations + backend/*/db/migrations + backend/*/migrations
    if exist "db\migrations" (
        for /r "db\migrations" %%F in (*.sql) do echo %%F>> "%TEMP_SQL_LIST%"
    )
    for /d %%D in (backend\*) do (
        if exist "%%D\db\migrations" (
            for /r "%%D\db\migrations" %%F in (*.sql) do echo %%F>> "%TEMP_SQL_LIST%"
        )
        if exist "%%D\migrations" (
            for /r "%%D\migrations" %%F in (*.sql) do echo %%F>> "%TEMP_SQL_LIST%"
        )
    )
)

if not exist "%TEMP_SQL_LIST%" (
    echo No hay archivos de migracion para ejecutar.
    if exist "%TEMP_APPLIED%" del "%TEMP_APPLIED%"
    exit /b 0
)

REM 2. Iterar sobre los archivos encontrados
for /f "usebackq delims=" %%F in ("%TEMP_SQL_LIST%") do (
    set "filepath=%%F"
    set "filename=%%~nxF"
    
    REM Obtener ruta relativa
    set "relpath=%%F"
    set "relpath=!relpath:%CD%\=!"
    set "relpath=!relpath:\=/!"
    
    set "skip=0"
    echo !relpath! | findstr /i "/old/ /archive/ /\\old\\ /\\archive\\" >nul 2>&1
    if !errorlevel! equ 0 set "skip=1"
    
    if !skip! equ 0 (
        set "already_applied=0"
        findstr /x /c:"!relpath!" "%TEMP_APPLIED%" >nul 2>&1
        if !errorlevel! equ 0 set "already_applied=1"
        findstr /x /c:"!filename!" "%TEMP_APPLIED%" >nul 2>&1
        if !errorlevel! equ 0 set "already_applied=1"
        
        if !already_applied! equ 1 (
            echo Saltando (ya aplicada^): !relpath! (!filename!^)
        ) else (
            set /a MIGRATION_COUNT+=1
            echo [!MIGRATION_COUNT!] Ejecutando: !relpath!
            
            "%PSQL_PATH%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "!filepath!"
            if !errorlevel! equ 0 (
                echo     [OK] Exitoso
                set /a MIGRATION_SUCCESS+=1
                "%PSQL_PATH%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "INSERT INTO %DB_SCHEMA%.migrations_db_log (filename) VALUES ('!relpath!') ON CONFLICT (filename) DO NOTHING;" >nul 2>&1
                "%PSQL_PATH%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "INSERT INTO %DB_SCHEMA%.migrations_db_log (filename) VALUES ('!filename!') ON CONFLICT (filename) DO NOTHING;" >nul 2>&1
            ) else (
                echo     [ERROR] Fallo la migracion
                set /a MIGRATION_FAILED+=1
            )
        )
    )
)

if exist "%TEMP_SQL_LIST%" del "%TEMP_SQL_LIST%"
if exist "%TEMP_APPLIED%" del "%TEMP_APPLIED%"

echo.
echo ========================================
echo Total: %MIGRATION_COUNT% ^| Exitosas: %MIGRATION_SUCCESS% ^| Fallidas: %MIGRATION_FAILED%
echo ========================================

if %MIGRATION_FAILED% gtr 0 (
    echo.
    echo [ERROR] Algunas migraciones fallaron.
    exit /b 1
) else (
    echo.
    echo [EXITO] Migraciones ejecutadas correctamente.
    exit /b 0
)

endlocal