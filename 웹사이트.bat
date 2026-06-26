@echo off
cd /d "%~dp0"
echo ============================================================
echo  Starting foreign-qa website
echo ============================================================
echo.

echo [1/2] Stopping the old server on port 8502 (so NEW code loads)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8502" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>nul

echo [2/2] Finding the Python that has streamlit...
set "PY="
py -3.12 -c "import streamlit" >nul 2>nul && set "PY=py -3.12"
if not defined PY ( python -c "import streamlit" >nul 2>nul && set "PY=python" )
if not defined PY ( py -c "import streamlit" >nul 2>nul && set "PY=py" )
if not defined PY (
  echo.
  echo  [ERROR] streamlit is not installed in any Python found.
  echo  Run 설치.bat first, or:  py -3.12 -m pip install -r requirements.txt
  echo.
  pause
  exit /b 1
)

echo.
echo  Open in your browser:  http://localhost:8502
echo  To stop: just close this window.
echo.
chcp 65001 >nul
set PYTHONUTF8=1
%PY% -m streamlit run app.py --server.port 8502 --server.address 0.0.0.0 --server.runOnSave true
pause
