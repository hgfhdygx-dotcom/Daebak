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
echo  The browser will open automatically at:  http://localhost:8502
echo  (On your phone, same Wi-Fi:  http://[this-PC-IP]:8502 )
echo  To stop: just close this window.
echo.
chcp 65001 >nul
set PYTHONUTF8=1
rem 서버가 뜬 뒤 ~5초 후 기본 브라우저 자동 열기(별도 프로세스 — streamlit 은 그대로 포그라운드 실행)
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 5; Start-Process 'http://localhost:8502'"
%PY% -m streamlit run app.py --server.port 8502 --server.address 0.0.0.0 --server.headless true --server.runOnSave true
pause
