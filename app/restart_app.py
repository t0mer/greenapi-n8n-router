#!/usr/bin/env python3
"""
Restart script for the Green API n8n Router application.
This script can be used to restart the application externally.
"""

import os
import sys
import time
import subprocess
import signal

def find_and_kill_process():
    """Find and kill the running application process."""
    try:
        # Find the process by looking for the main script
        result = subprocess.run(['pgrep', '-f', 'app.py'], capture_output=True, text=True)
        if result.returncode == 0:
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                if pid:
                    print(f"Killing process {pid}")
                    os.kill(int(pid), signal.SIGTERM)
                    time.sleep(1)
                    # Force kill if still running
                    try:
                        os.kill(int(pid), signal.SIGKILL)
                    except ProcessLookupError:
                        pass  # Process already terminated
    except Exception as e:
        print(f"Error finding/killing process: {e}")

def start_application():
    """Start the application."""
    try:
        # Change to the app directory
        app_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(app_dir)
        
        # Start the application
        print("Starting application...")
        subprocess.Popen([sys.executable, 'app.py'], 
                        stdout=subprocess.DEVNULL, 
                        stderr=subprocess.DEVNULL,
                        start_new_session=True)
        print("Application started successfully")
    except Exception as e:
        print(f"Error starting application: {e}")

if __name__ == "__main__":
    print("Restarting Green API n8n Router...")
    find_and_kill_process()
    time.sleep(2)  # Wait for processes to terminate
    start_application()
    print("Restart complete")
