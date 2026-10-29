@echo off
cd /d "%~dp0"
start "" "http://localhost:6060"
node server.mjs
pause
