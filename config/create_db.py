import sqlite3
import os

DB_PATH = "config/execution_logs.db"

def create_tables():
    """
    Creates the SQLite database and tables for logging webhook executions.
    """
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create table for webhook execution logs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS webhook_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT NOT NULL,
            webhook_url TEXT NOT NULL,
            execution_count INTEGER DEFAULT 0,
            UNIQUE(chat_id, webhook_url)
        )
    """)
    conn.commit()
    conn.close()

if __name__ == "__main__":
    create_tables()
    print(f"Database initialized at {DB_PATH}")
