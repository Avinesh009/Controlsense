@echo off
title ControlSense - Package Agent to Standalone EXE
cd desktop_agent
echo Compiling python agent into a single executable file...
python build_exe.py
pause
