@echo off
echo Dang doi ten thu muc claudecode thanh learn_claudecode...
echo Vui long dam bao ban da dong tat ca cac trinh soan thao ma nguon (VS Code, Cursor).
pause
taskkill /F /IM "Code.exe" /T >nul 2>&1
taskkill /F /IM "Cursor.exe" /T >nul 2>&1
timeout /t 2 /nobreak
ren "C:\Users\PC1931\Agents\claudecode" "learn_claudecode"
if %errorlevel% equ 0 (
    echo [OK] Da doi ten thanh cong! Thu muc moi la: C:\Users\PC1931\Agents\learn_claudecode
) else (
    echo [LOI] Khong the doi ten. Co the thu muc van dang bi khoa boi mot chuong trinh khac.
)
pause
