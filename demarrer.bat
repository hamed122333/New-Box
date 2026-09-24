@echo off
rem New Box - lance la version locale (double-clic)
cd /d "%~dp0"
if not exist node_modules (
  echo Installation des dependances...
  call npm install || goto :err
)
echo Site sur http://localhost:5173  (fermez cette fenetre pour arreter)
call npm run dev -- --open
goto :eof
:err
echo Echec de l installation : verifiez que Node.js 20.19+ est installe.
pause
