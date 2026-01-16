@echo off
setlocal enabledelayedexpansion

echo ============================================
echo EJECUTANDO TODOS LOS SCRIPTS SQL
echo ============================================
echo.

REM Detectar el contenedor de PostgreSQL
echo [INFO] Buscando contenedor de PostgreSQL...
for /f "tokens=*" %%i in ('docker ps --filter "ancestor=postgres:16" --format "{{.Names}}"') do (
    set CONTAINER_NAME=%%i
    goto :found_container
)

REM Si no encuentra por imagen, buscar por nombre común
for /f "tokens=*" %%i in ('docker ps --filter "name=db" --format "{{.Names}}"') do (
    set CONTAINER_NAME=%%i
    goto :found_container
)

echo [ERROR] No se encontro el contenedor de PostgreSQL.
echo [INFO] Asegurese de que el contenedor este corriendo.
echo [INFO] Puede especificar el nombre del contenedor manualmente editando esta linea:
echo        set CONTAINER_NAME=nombre_del_contenedor
pause
exit /b 1

:found_container
echo [OK] Contenedor encontrado: !CONTAINER_NAME!
echo.

REM Configuracion de base de datos
set DB_NAME=esap_db
set DB_USER=postgres
set SCRIPT_DIR=%~dp0

REM Verificar que el contenedor este corriendo
docker exec !CONTAINER_NAME! pg_isready -U !DB_USER! >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] El contenedor no esta respondiendo. Verifique que este corriendo.
    pause
    exit /b 1
)

echo ============================================
echo FASE 1: EJECUTANDO SCRIPTS DE INIT
echo ============================================
echo.

set INIT_COUNT=0
set INIT_SUCCESS=0
set INIT_FAILED=0

REM Ejecutar scripts de init en orden
REM Usar dir /b /on para ordenar por nombre (aunque no es perfecto para numeros)
for /f "delims=" %%f in ('dir /b /on "!SCRIPT_DIR!init\*.sql"') do (
    set /a INIT_COUNT+=1
    set FILE_NAME=%%f
    set FILE_PATH=!SCRIPT_DIR!init\!FILE_NAME!
    echo [!INIT_COUNT!] Ejecutando !FILE_NAME!...
    
    REM Ejecutar directamente desde el host usando redireccion de entrada
    type "!FILE_PATH!" | docker exec -i !CONTAINER_NAME! psql -U !DB_USER! -d !DB_NAME! >nul 2>&1
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Fallo en la ejecucion de !FILE_NAME!
        echo [INFO] Ejecutando nuevamente para ver el error:
        type "!FILE_PATH!" | docker exec -i !CONTAINER_NAME! psql -U !DB_USER! -d !DB_NAME!
        set /a INIT_FAILED+=1
        goto :next_init
    )
    
    echo [OK] !FILE_NAME! ejecutado correctamente
    set /a INIT_SUCCESS+=1
    
    :next_init
    echo.
)

echo ============================================
echo RESUMEN FASE 1 (INIT):
echo   Total: !INIT_COUNT!
echo   Exitosos: !INIT_SUCCESS!
echo   Fallidos: !INIT_FAILED!
echo ============================================
echo.

if !INIT_FAILED! GTR 0 (
    echo [ADVERTENCIA] Algunos scripts de init fallaron.
    echo.
)

echo ============================================
echo FASE 2: EJECUTANDO SCRIPTS DE MIGRATIONS
echo ============================================
echo.

set MIGR_COUNT=0
set MIGR_SUCCESS=0
set MIGR_FAILED=0

REM Ejecutar scripts de migrations en orden
REM Usar dir /b /on para ordenar por nombre (aunque no es perfecto para numeros)
for /f "delims=" %%f in ('dir /b /on "!SCRIPT_DIR!migrations\*.sql"') do (
    set /a MIGR_COUNT+=1
    set FILE_NAME=%%f
    set FILE_PATH=!SCRIPT_DIR!migrations\!FILE_NAME!
    echo [!MIGR_COUNT!] Ejecutando !FILE_NAME!...
    
    REM Ejecutar directamente desde el host usando redireccion de entrada
    type "!FILE_PATH!" | docker exec -i !CONTAINER_NAME! psql -U !DB_USER! -d !DB_NAME! >nul 2>&1
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Fallo en la ejecucion de !FILE_NAME!
        echo [INFO] Ejecutando nuevamente para ver el error:
        type "!FILE_PATH!" | docker exec -i !CONTAINER_NAME! psql -U !DB_USER! -d !DB_NAME!
        set /a MIGR_FAILED+=1
        goto :next_migr
    )
    
    echo [OK] !FILE_NAME! ejecutado correctamente
    set /a MIGR_SUCCESS+=1
    
    :next_migr
    echo.
)

echo ============================================
echo RESUMEN FASE 2 (MIGRATIONS):
echo   Total: !MIGR_COUNT!
echo   Exitosos: !MIGR_SUCCESS!
echo   Fallidos: !MIGR_FAILED!
echo ============================================
echo.

if !MIGR_FAILED! GTR 0 (
    echo [ADVERTENCIA] Algunos scripts de migrations fallaron.
    echo.
)

echo ============================================
echo RESUMEN GENERAL:
echo   INIT - Total: !INIT_COUNT!, Exitosos: !INIT_SUCCESS!, Fallidos: !INIT_FAILED!
echo   MIGRATIONS - Total: !MIGR_COUNT!, Exitosos: !MIGR_SUCCESS!, Fallidos: !MIGR_FAILED!
echo ============================================
echo.

if !INIT_FAILED! EQU 0 if !MIGR_FAILED! EQU 0 (
    echo [SUCCESS] Todos los scripts se ejecutaron correctamente!
) else (
    echo [WARNING] Algunos scripts fallaron. Revise los errores arriba.
)

pause
