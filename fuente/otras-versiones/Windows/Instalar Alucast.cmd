@echo off
rem ========================================================================
rem  Instala Alucast en esta compu: copia el programa a una carpeta fija y
rem  crea los accesos directos en el Escritorio y en el menu Inicio.
rem  Se ejecuta con doble clic desde la carpeta descomprimida.
rem ========================================================================
set "ORIGEN=%~dp0"
if not defined DESTINO set "DESTINO=%LOCALAPPDATA%\Programs\Alucast"

if not exist "%ORIGEN%Alucast.exe" (
  echo No encuentro Alucast.exe al lado de este archivo.
  echo Primero descomprimi el zip y despues ejecuta este archivo desde esa carpeta.
  pause
  exit /b 1
)

echo Instalando Alucast...
if not defined SIN_ABRIR taskkill /im Alucast.exe /f >nul 2>&1
if not exist "%DESTINO%" mkdir "%DESTINO%"
copy /y "%ORIGEN%Alucast.exe" "%DESTINO%\" >nul
copy /y "%ORIGEN%resources.neu" "%DESTINO%\" >nul
if exist "%ORIGEN%LEEME.txt" copy /y "%ORIGEN%LEEME.txt" "%DESTINO%\" >nul

if not defined SIN_ACCESOS powershell -NoProfile -ExecutionPolicy Bypass -Command "$sh = New-Object -ComObject WScript.Shell; $exe = Join-Path $env:DESTINO 'Alucast.exe'; foreach ($l in @((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Alucast.lnk'), (Join-Path ([Environment]::GetFolderPath('Programs')) 'Alucast.lnk'))) { $s = $sh.CreateShortcut($l); $s.TargetPath = $exe; $s.WorkingDirectory = $env:DESTINO; $s.IconLocation = $exe + ',0'; $s.Description = 'Presupuestos y control de gastos Alucast'; $s.Save() }"

echo.
echo Listo. Alucast quedo instalada, con iconos en el Escritorio y en el menu Inicio.
if not defined SIN_ABRIR (
  echo Se abre ahora...
  start "" "%DESTINO%\Alucast.exe"
  timeout /t 3 >nul
)
