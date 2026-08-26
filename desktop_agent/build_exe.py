import os
import sys
import subprocess

def run_command(command):
    print(f"Executing: {command}")
    process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    while True:
        output = process.stdout.readline()
        if output == b'' and process.poll() is not None:
            break
        if output:
            print(output.decode().strip())
    rc = process.poll()
    return rc

def build_standalone_exe():
    # Ensure we run from the script's directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    print("==========================================================")
    print("ControlSense Desktop Agent Executable Builder")
    print("==========================================================\n")

    # 1. Install PyInstaller if missing
    print("Step 1: Verifying PyInstaller installation...")
    try:
        import PyInstaller
        print("[OK] PyInstaller is already installed.\n")
    except ImportError:
        print("PyInstaller not found. Installing via pip...")
        rc = run_command("pip install pyinstaller")
        if rc != 0:
            print("✗ Error: Failed to install PyInstaller.")
            return

    # 2. Package agent.py
    # --onefile: Bundle everything into a single .exe
    # --noconsole: Hide the command prompt window (only show Tkinter GUI)
    # --name: Name of the resulting executable
    print("Step 2: Compiling Python agent into a standalone .exe...")
    pyinstaller_cmd = (
        'pyinstaller --noconsole --onefile '
        '--add-data "config.json;." '
        '--name="ControlSenseTracker" '
        'agent.py'
    )
    
    # On macOS/Linux, change semicolon to colon for data imports
    if sys.platform != "win32":
        pyinstaller_cmd = pyinstaller_cmd.replace(";", ":")

    rc = run_command(pyinstaller_cmd)
    if rc == 0:
        print("\n==========================================================")
        print("SUCCESS! Executable created successfully.")
        print("Output Directory: desktop_agent/dist/ControlSenseTracker.exe")
        print("==========================================================")
    else:
        print("\nError: PyInstaller compilation failed.")

if __name__ == "__main__":
    build_standalone_exe()
