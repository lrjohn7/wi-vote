# 18 — Community Notes (Ward Notes)

**Tagline:** User-submitted local knowledge and context for individual wards.

**Route:** N/A (embedded in Ward Detail Panel on Election Map)

---

## Overview

The Community Notes feature allows users to submit notes for individual wards, providing local knowledge, corrections, historical context, or other relevant information. Notes appear in the Ward Detail Panel when a ward is selected on the Election Map.

---

## Data Model

### Backend Model — `WardNote` (SQLAlchemy)

| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Auto-increment |
| ward_id | String(50) | Ward identifier |
| author_name | String(100) | Display name of the note author |
| content | Text | Note content (max 2000 chars) |
| category | String(50, nullable) | Note category |
| is_approved | Boolean | Moderation flag (auto-approved for now) |
| created_at | DateTime | Creation timestamp |

### Categories

| Category | Description |
|----------|-------------|
| `local_knowledge` | First-hand knowledge about the ward or area |
| `correction` | Corrections to displayed data |
| `context` | Additional context for understanding results |
| `historical` | Historical information about the ward |

### API Endpoints

| Method | Endpoint | Response | Description |
|--------|----------|----------|-------------|
| GET | `/api/v1/ward-notes/{ward_id}` | `NoteListResponse` | List approved notes for a ward |
| POST | `/api/v1/ward-notes` | `NoteResponse` | Submit a new note |
| DELETE | `/api/v1/ward-notes/{note_id}` | 204 | Delete a note (admin) |

### Query Parameters (GET)

- `limit` (default 50, max 200) — Number of notes to return
- `offset` (default 0) — Pagination offset

### Request Body (POST)

```json
{
  "ward_id": "string (required)",
  "author_name": "string (required, 1-100 chars)",
  "content": "string (required, 1-2000 chars)",
  "category": "string (optional, one of the 4 categories)"
}
```

---

## Dashboard Elements

### WardNotes Component (embedded in WardDetailPanel)

1. **Notes List** — Displays all approved notes for the selected ward, ordered by newest first. Each note shows:
   - Author name and formatted date
   - Category badge (if present)
   - Note content

2. **Submission Form** — Collapsible form for adding a new note:
   - Author name input
   - Category dropdown (optional)
   - Content textarea (max 2000 chars)
   - Submit button with loading state
   - Success/error feedback

3. **Empty State** — When no notes exist, shows message encouraging the first contribution.

---

## Business Rules

1. **Auto-approval**: All notes are currently auto-approved (`is_approved = True`). Future work should add moderation.
2. **No authentication required**: Anyone can submit notes with a display name. No account needed.
3. **Category is optional**: Notes without a category are displayed without a badge.
4. **Soft limits**: Content is capped at 2000 characters via Pydantic validation.
5. **Only approved notes shown**: The GET endpoint filters for `is_approved == True`.
6. **Delete is admin-only**: In production, the DELETE endpoint should require authentication.

---

## Edge Cases

- **No notes for ward**: Empty state with encouragement message
- **API unavailable**: Notes section gracefully hidden or shows error
- **Rapid submissions**: Mutation invalidates query cache on success, showing new note immediately
- **Long content**: Truncated in preview if needed, full content on expansion

---

## Security Considerations

- **No authentication**: The current implementation has no auth. In production:
  - Add rate limiting per IP
  - Add CAPTCHA or similar anti-spam
  - Add moderation queue (set `is_approved = False` by default)
  - Add authentication for delete endpoint
- **Input sanitization**: Content is stored as text. The React frontend renders it safely (no dangerouslySetInnerHTML). Pydantic validates max lengths.
- **XSS prevention**: React's default escaping handles display. No raw HTML rendering.

---

## Files

| File | Purpose |
|------|---------|
| `features/election-map/components/WardNotes.tsx` | Notes list and submission form |
| `features/election-map/components/WardDetailPanel.tsx` | Integration point (renders WardNotes) |
| `server/app/models/ward_note.py` | SQLAlchemy model |
| `server/app/api/v1/endpoints/ward_notes.py` | FastAPI CRUD endpoints |
