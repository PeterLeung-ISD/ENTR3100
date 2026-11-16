@echo off
REM ── NexusSim 本機啟動（使用工作區內建的 Node 執行環境）──
setlocal
cd /d "%~dp0"

set "NODE_EXE=C:\Users\PeterLeung\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

set NEXT_TELEMETRY_DISABLED=1
echo Starting NexusSim at http://localhost:3000 ...
echo (press Ctrl+C to stop)
"%NODE_EXE%" "node_modules\next\dist\bin\next" dev --port 3000 --hostname localhost
endlocal
