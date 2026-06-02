@echo off
setlocal

set "DIR=%~dp0"
set "VENV_PY=%DIR%.venv\Scripts\python.exe"
set "REQ=%DIR%requirements.txt"

if not exist "%VENV_PY%" (
    echo [setup] .venv not found - creating virtual environment...
    python "%DIR%.venv" 2>nul || py -3.12 -m venv "%DIR%.venv" || python -m venv "%DIR%.venv"
    echo [setup] Installing packages...
    "%VENV_PY%" -m pip install -q --upgrade pip
    "%VENV_PY%" -m pip install -q -r "%REQ%"
    echo [setup] Done.
)

"%VENV_PY%" "%DIR%train.py" %*
