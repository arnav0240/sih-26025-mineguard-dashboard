@echo off
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
cd /d "%~dp0"
echo ========================================================
echo  Starting MineGuard Mine Safety Console (Vite Dev Server)
echo ========================================================
call npm run dev
pause
