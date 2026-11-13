@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   知启 · 本地在线版
echo   浏览器地址：http://127.0.0.1:8080
echo   关闭此窗口即可停止服务
echo.
start "" cmd /c "timeout /t 2 >nul & start http://127.0.0.1:8080"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 serve.py --port 8080
) else (
  python serve.py --port 8080
)
pause
