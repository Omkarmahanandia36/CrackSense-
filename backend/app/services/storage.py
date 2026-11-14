"""In-memory and JSON-backed storage repository for inspection results (Pre-Database Phase)."""

import os
import json
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

from backend.app.core.config import settings


class InMemoryInspectionRepository:
    """Stores inspection analysis records in memory, with JSON file persistence."""

    def __init__(self, json_path: str = settings.STORAGE_JSON_PATH):
        self.json_path = Path(json_path)
        self.records: Dict[str, Dict[str, Any]] = {}
        self._load_from_disk()

    def _load_from_disk(self) -> None:
        """Load past records from JSON file if it exists."""
        if self.json_path.exists():
            try:
                with open(self.json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        self.records = {item["id"]: item for item in data if "id" in item}
            except Exception:
                self.records = {}

    def _save_to_disk(self) -> None:
        """Persist current in-memory records to JSON file."""
        try:
            self.json_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.json_path, "w", encoding="utf-8") as f:
                json.dump(list(self.records.values()), f, indent=2, default=str)
        except Exception:
            pass

    def add(self, record_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save a new inspection record."""
        rec_id = record_data.get("id") or str(uuid.uuid4())
        record_data["id"] = rec_id
        if "created_at" not in record_data:
            record_data["created_at"] = datetime.utcnow().isoformat()
        
        self.records[rec_id] = record_data
        self._save_to_disk()
        return record_data

    def get(self, record_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve an inspection record by its ID."""
        return self.records.get(record_id)

    def list_all(self) -> List[Dict[str, Any]]:
        """List all records ordered from newest to oldest."""
        return sorted(
            list(self.records.values()),
            key=lambda x: x.get("created_at", ""),
            reverse=True,
        )


inspection_repo = InMemoryInspectionRepository()
