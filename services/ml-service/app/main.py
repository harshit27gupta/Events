from fastapi import FastAPI
from typing import List

# naive in-memory demo data
EVENTS = [
    {"id": "e1", "title": "Tech Conference", "tags": ["tech", "conference"]},
    {"id": "e2", "title": "Music Fest", "tags": ["music", "festival"]},
    {"id": "e3", "title": "Art Expo", "tags": ["art", "exhibition"]},
]

app = FastAPI(title="ML Service")

@app.get("/health")
def health():
    return {"status": "ok", "service": "ml-service"}

@app.get("/recs")
def recs(userId: str | None = None, limit: int = 5):
    # content-based stub: return first N for demo
    return {"userId": userId, "items": [e["id"] for e in EVENTS][:limit]}

@app.get("/related")
def related(eventId: str, limit: int = 5):
    base = next((e for e in EVENTS if e["id"] == eventId), None)
    if not base:
        return {"eventId": eventId, "items": []}
    # naive: return others
    items = [e["id"] for e in EVENTS if e["id"] != eventId][:limit]
    return {"eventId": eventId, "items": items}


