@echo off
echo ============================================
echo EJECUTANDO MIGRACIONES DE BASE DE DATOS
echo ============================================
echo.

echo [1/3] Ejecutando FINAL_01_create_firmantes.sql...
psql -U postgres -d esap_db -f "%~dp0migrations\FINAL_01_create_firmantes.sql"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Fallo en migracion 1
    pause
    exit /b 1
)
echo OK - Firmantes creados
echo.

echo [2/3] Ejecutando FINAL_02_create_certificate_template_config.sql...
psql -U postgres -d esap_db -f "%~dp0migrations\FINAL_02_create_certificate_template_config.sql"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Fallo en migracion 2
    pause
    exit /b 1
)
echo OK - Template config creado
echo.

echo [3/3] Ejecutando FINAL_03_create_template_changes_and_validations.sql...
psql -U postgres -d esap_db -f "%~dp0migrations\FINAL_03_create_template_changes_and_validations.sql"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Fallo en migracion 3
    pause
    exit /b 1
)
echo OK - Historial y validaciones creados
echo.

echo ============================================
echo MIGRACIONES COMPLETADAS EXITOSAMENTE
echo ============================================
pause
