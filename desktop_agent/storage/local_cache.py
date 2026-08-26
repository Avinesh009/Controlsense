import sqlite3
import json
import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger("LocalCache")

class OfflineBuffer:
    def __init__(self, db_path: str = "agent_cache.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS telemetry_queue (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        payload TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                conn.commit()
        except Exception as e:
            logger.error(f"Error initializing local cache: {e}")

    def enqueue(self, payload: Dict[str, Any]):
        """Save telemetry heartbeat locally if offline"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("INSERT INTO telemetry_queue (payload) VALUES (?)", (json.dumps(payload),))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to enqueue telemetry: {e}")

    def fetch_pending(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch unsynced telemetry packets"""
        items = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id, payload FROM telemetry_queue ORDER BY id ASC LIMIT ?", (limit,))
                for row_id, payload_str in cursor.fetchall():
                    items.append({"row_id": row_id, "payload": json.loads(payload_str)})
        except Exception as e:
            logger.error(f"Failed to fetch cached items: {e}")
        return items

    def delete_synced(self, row_ids: List[int]):
        """Remove synced packets after successful transmission"""
        if not row_ids:
            return
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                placeholders = ",".join("?" * len(row_ids))
                cursor.execute(f"DELETE FROM telemetry_queue WHERE id IN ({placeholders})", row_ids)
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to delete synced items: {e}")
