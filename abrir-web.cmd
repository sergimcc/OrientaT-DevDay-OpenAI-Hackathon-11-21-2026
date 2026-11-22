@echo off
setlocal
cd /d "%~dp0web" || exit /b 1

if not exist "node_modules\vite\package.json" (
  echo Instalando las dependencias de la web...
  call npm ci
  if errorlevel 1 (
    echo No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)

echo Iniciando la web en http://127.0.0.1:5173/ ...
start "Asistente de tramites - servidor" cmd /k "npm run dev"

for /l %%I in (1,1,30) do (
  curl.exe -fsS -o NUL --max-time 1 http://127.0.0.1:5173/ 2>NUL
  if not errorlevel 1 goto ready
  powershell -NoProfile -Command "Start-Sleep -Seconds 1"
)

echo El servidor no ha respondido. Revisa la ventana del servidor; puede que el puerto 5173 este ocupado.
pause
exit /b 1

:ready
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" "http://127.0.0.1:5173/"
) else (
  start "" "http://127.0.0.1:5173/"
)
echo Web abierta. Mantén la ventana del servidor abierta mientras la uses.
