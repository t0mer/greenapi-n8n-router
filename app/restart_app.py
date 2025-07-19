#!/usr/bin/env python3
"""
Bot restart script for the Green API n8n Router application.
Restarts only the bot component via the web API.
"""

import requests
import sys
import time
import socket

def check_server_running(host='localhost', port=8000):
    """Check if the web server is running on the specified port."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex((host, port))
            return result == 0
    except:
        return False

def main():
    """
    Trigger a bot restart via the web API.
    """
    # First check if the server is running
    if not check_server_running():
        print("❌ Web server is not running on localhost:8000")
        print("   Please start the application first with: python app.py")
        sys.exit(1)
    
    try:
        print("Triggering bot restart via web API...")
        
        # Try to connect to the running web server
        response = requests.post('http://localhost:8000/restart', timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Bot restart initiated successfully")
            print(f"   Message: {result.get('message', 'No message')}")
            print("   Web server remains online")
            
            # Give a moment for the restart to begin
            time.sleep(2)
            print("✅ Bot restart completed")
            
        else:
            print(f"❌ Failed to restart bot: HTTP {response.status_code}")
            try:
                error_msg = response.text()
                if error_msg:
                    print(f"   Error: {error_msg}")
            except:
                pass
            sys.exit(1)
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to web server at localhost:8000")
        print("   Make sure the application is running")
        sys.exit(1)
    except requests.exceptions.Timeout:
        print("❌ Request timed out - web server may be busy")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error triggering bot restart: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
