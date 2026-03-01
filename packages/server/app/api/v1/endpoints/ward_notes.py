from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.ward_note import WardNote

router = APIRouter(prefix="/ward-notes", tags=["ward-notes"])

NOTE_CATEGORIES = ["local_knowledge", "correction", "context", "historical"]


class NoteCreate(BaseModel):
    ward_id: str = Field(..., min_length=1, max_length=50)
    author_name: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1, max_length=2000)
    category: str | None = Field(None, pattern=r"^(local_knowledge|correction|context|historical)$")


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
    db: AsyncSession = Depends(get_db),
) -> NoteResponse:
    """Submit a community note for a ward."""
    note = WardNote(
        ward_id=body.ward_id,
        author_name=body.author_name,
        content=body.content,
        category=body.category,
        is_approved=True,  # Auto-approve for now
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
