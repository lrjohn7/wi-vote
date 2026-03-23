"""Shared API response schemas for consistent response envelopes."""

from pydantic import BaseModel


class PaginatedResponse(BaseModel):
    """Base model for paginated API responses.

    New bulk endpoints should extend this for consistent pagination:
        class BulkDemographicsResponse(PaginatedResponse):
            demographics: dict[str, dict]
    """

    total: int
    limit: int
    offset: int
