#!/usr/bin/env python3
"""
Bot restart script for the Green API n8n Router application.
Restarts only the bot component, not the entire application.
"""

import requests
import sys

def main():
    """
    Trigger a bot restart via the web API.
    """
    try:
        print("Triggering bot restart...")
        response = requests.post('http://localhost:8000/restart', timeout=5)
        if response.status_code == 200:
            print("✅ Bot restart initiated successfully")
            print("Web server remains online")
        else:
            print(f"❌ Failed to restart bot: {response.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error triggering bot restart: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
