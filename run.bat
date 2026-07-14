@echo off
cd /d "%~dp0"
echo.
echo  Starting Cawnpore Opticals (SQLite)...
echo  Open: http://localhost:5000
echo  Admin: http://localhost:5000/admin.html
echo  Login: admin / admin123
echo.
echo  Press Ctrl+C to stop.
echo.
python server.py
if errorlevel 1 (
  echo.
  echo  python failed, trying python3...
  python3 server.py
)
pause
