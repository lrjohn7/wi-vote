import re
import time
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.ward_note import WardNote

router = APIRouter(prefix="/ward-notes", tags=["ward-notes"])

NOTE_CATEGORIES = ["local_knowledge", "correction", "context", "historical"]

# Per-IP submission throttle: max 5 notes per 10 minutes
_submit_log: dict[str, list[float]] = defaultdict(list)
_SUBMIT_LIMIT = 5
_SUBMIT_WINDOW = 600  # 10 minutes

# Basic content filter — reject obviously inappropriate content
_BLOCKED_PATTERNS = [
    re.compile(r"https?://\S+", re.IGNORECASE),  # no URLs
]


class NoteCreate(BaseModel):
    ward_id: str = Field(..., min_length=1, max_length=50)
    author_name: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=10, max_length=2000)
    category: str | None = Field(None, pattern=r"^(local_knowledge|correction|context|historical)$")

    @field_validator("content")
    @classmethod
    def check_content(cls, v: str) -> str:
        for pat in _BLOCKED_PATTERNS:
            if pat.search(v):
                raise ValueError("Content must not contain URLs")
        # Reject if mostly non-alphanumeric (spam heuristic)
        alpha_ratio = sum(c.isalnum() or c.isspace() for c in v) / max(len(v), 1)
        if alpha_ratio < 0.5:
            raise ValueError("Content appears to be spam")
        return v.strip()

    @field_validator("author_name")
    @classmethod
    def check_author_name(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Author name too short")
        return v.strip()


class NoteResponse(BaseModel):
    id: int
    ward_id: str
    author_name: str
    content: str
    category: str | None
    created_at: str

    model_config = {"from_attributes": True}


class NoteListResponse(BaseModel):
    notes: list[NoteResponse]
    total: int
    ward_id: str


@router.get("/{ward_id}", response_model=NoteListResponse)
async def get_ward_notes(
    ward_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> NoteListResponse:
    """Get all community notes for a specific ward."""
    count_q = select(func.count()).select_from(WardNote).where(
        WardNote.ward_id == ward_id,
        WardNote.is_approved == True,  # noqa: E712
    )
    total = (await db.execute(count_q)).scalar() or 0

    q = (
        select(WardNote)
        .where(WardNote.ward_id == ward_id, WardNote.is_approved == True)  # noqa: E712
        .order_by(WardNote.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(q)
    notes = result.scalars().all()

    return NoteListResponse(
        notes=[
            NoteResponse(
                id=n.id,
                ward_id=n.ward_id,
                author_name=n.author_name,
                content=n.content,
                category=n.category,
                created_at=n.created_at.isoformat() if isinstance(n.created_at, datetime) else str(n.created_at),
            )
            for n in notes
        ],
        total=total,
        ward_id=ward_id,
    )


@router.post("", response_model=NoteResponse, status_code=201)
async def create_ward_note(
    body: NoteCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> NoteResponse:
    """Submit a community note for a ward."""
    # Per-IP submission throttle
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    _submit_log[client_ip] = [t for t in _submit_log[client_ip] if now - t < _SUBMIT_WINDOW]
    if len(_submit_log[client_ip]) >= _SUBMIT_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Too many submissions. Limit is {_SUBMIT_LIMIT} notes per {_SUBMIT_WINDOW // 60} minutes.",
        )
    _submit_log[client_ip].append(now)

    note = WardNote(
        ward_id=body.ward_id,
        author_name=body.author_name,
        content=body.content,
        category=body.category,
        is_approved=False,  # Require moderation review
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    return NoteResponse(
        id=note.id,
        ward_id=note.ward_id,
        author_name=note.author_name,
        content=note.content,
        category=note.category,
        created_at=note.created_at.isoformat() if isinstance(note.created_at, datetime) else str(note.created_at),
    )


@router.delete("/{note_id}", status_code=204)
async def delete_ward_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a community note (admin only in production)."""
    q = select(WardNote).where(WardNote.id == note_id)
    result = await db.execute(q)
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)
    await db.commit()
