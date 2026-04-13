@echo off
echo Dang doi ten thu muc claudecode thanh learn_claudecode...
taskkill /F /IM "Code.exe" /T >nul 2>&1
taskkill /F /IM "Cursor.exe" /T >nul 2>&1
timeout /t 3 /nobreak
cd ..
ren "claudecode" "learn_claudecode"
if %errorlevel% equ 0 (
    echo [OK] Da doi ten thanh cong!
) else (
    echo [LOI] Khong the doi ten.
)
