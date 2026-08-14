"""Mom Talk forum API endpoints.

Anonymous peer support forum where patients post discussion threads and replies.
Pseudonyms hide real names. AI content moderation blocks harmful content.
See CONTEXT.md: Mom Talk
"""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.session import get_current_session
from app.models.forum import ForumPost, ForumReply, ModerationStatus
from app.models.session import Session
from app.models.user import User
from app.services.content_moderation import moderate_content, sanitize_content, ModerationResult

router = APIRouter(prefix="/api/forum", tags=["forum"])


# ============================================================================
# Pydantic Schemas
# ============================================================================


class PostCreateRequest(BaseModel):
    content: str = Field(..., min_length=10, max_length=500)


class ReplyCreateRequest(BaseModel):
    content: str = Field(..., min_length=5, max_length=300)


class PseudonymCreateRequest(BaseModel):
    pseudonym: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")


class PseudonymResponse(BaseModel):
    pseudonym: str


class ReplyResponse(BaseModel):
    id: str
    pseudonym: str
    reply_content: str
    created_at: str


class PostResponse(BaseModel):
    id: str
    pseudonym: str
    post_content: str
    created_at: str
    reply_count: int


class PostDetailResponse(BaseModel):
    id: str
    pseudonym: str
    post_content: str
    created_at: str
    replies: list[ReplyResponse]


class ModerationRejectionResponse(BaseModel):
    error: str
    crisis_resources: str


# ============================================================================
# Optional Authentication Helper
# ============================================================================


async def get_optional_session(
    session_id: str | None = Cookie(default=None, alias="session_id"),
    db: AsyncSession = Depends(get_db),
) -> Session | None:
    """
    Returns current session if authenticated, None otherwise.
    Used for public endpoints that allow anonymous read access.
    """
    if not session_id:
        return None
    
    session = await db.get(Session, session_id)
    if session is None:
        return None
    
    # Check expiry
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        await db.delete(session)
        return None
    
    return session


# ============================================================================
# Pseudonym Management
# ============================================================================


@router.post("/pseudonym", status_code=200)
async def create_or_update_pseudonym(
    payload: PseudonymCreateRequest,
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> PseudonymResponse:
    """
    Create or update patient's Mom Talk pseudonym.
    Pseudonym must be unique across all patients.
    """
    # Check if pseudonym already taken by another user
    result = await db.execute(
        select(User).where(
            User.pseudonym == payload.pseudonym,
            User.fhir_patient_id != current_session.fhir_patient_id,
        )
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Pseudonym already taken")
    
    # Get or create user record
    user = await db.get(User, current_session.fhir_patient_id)
    if user is None:
        user = User(
            fhir_patient_id=current_session.fhir_patient_id,
            pseudonym=payload.pseudonym,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(user)
    else:
        user.pseudonym = payload.pseudonym
        user.updated_at = datetime.now(timezone.utc)
    
    await db.flush()
    return PseudonymResponse(pseudonym=user.pseudonym)


@router.get("/pseudonym")
async def get_pseudonym(
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> PseudonymResponse | None:
    """Returns patient's current pseudonym, or null if not set."""
    user = await db.get(User, current_session.fhir_patient_id)
    if user is None or user.pseudonym is None:
        return None
    return PseudonymResponse(pseudonym=user.pseudonym)


# ============================================================================
# Posts
# ============================================================================


@router.get("/posts")
async def list_posts(
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    current_session: Session | None = Depends(get_optional_session),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Returns paginated forum feed (newest first).
    Public endpoint — no authentication required for read access.
    """
    offset = (page - 1) * limit
    
    # Fetch posts (only approved, newest first)
    posts_query = (
        select(ForumPost)
        .where(ForumPost.moderation_status == ModerationStatus.APPROVED)
        .order_by(ForumPost.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(posts_query)
    posts = result.scalars().all()
    
    # Fetch reply counts for each post
    post_ids = [p.id for p in posts]
    reply_counts_query = (
        select(ForumReply.post_id, func.count(ForumReply.id))
        .where(
            ForumReply.post_id.in_(post_ids),
            ForumReply.moderation_status == ModerationStatus.APPROVED,
        )
        .group_by(ForumReply.post_id)
    )
    reply_counts_result = await db.execute(reply_counts_query)
    reply_counts_dict = dict(reply_counts_result.all())
    
    # Fetch total count for pagination
    count_query = select(func.count()).select_from(ForumPost).where(
        ForumPost.moderation_status == ModerationStatus.APPROVED
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    return {
        "posts": [
            PostResponse(
                id=p.id,
                pseudonym=p.pseudonym,
                post_content=p.post_content,
                created_at=p.created_at.isoformat(),
                reply_count=reply_counts_dict.get(p.id, 0),
            )
            for p in posts
        ],
        "page": page,
        "limit": limit,
        "total": total,
        "has_more": (page * limit) < total,
    }


@router.get("/posts/{post_id}")
async def get_post(
    post_id: str,
    current_session: Session | None = Depends(get_optional_session),
    db: AsyncSession = Depends(get_db),
) -> PostDetailResponse:
    """
    Returns single post with all replies.
    Public endpoint — no authentication required.
    """
    # Fetch post
    post = await db.get(ForumPost, post_id)
    if post is None or post.moderation_status != ModerationStatus.APPROVED:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Fetch approved replies (oldest first for conversation flow)
    replies_query = (
        select(ForumReply)
        .where(
            ForumReply.post_id == post_id,
            ForumReply.moderation_status == ModerationStatus.APPROVED,
        )
        .order_by(ForumReply.created_at.asc())
    )
    result = await db.execute(replies_query)
    replies = result.scalars().all()
    
    return PostDetailResponse(
        id=post.id,
        pseudonym=post.pseudonym,
        post_content=post.post_content,
        created_at=post.created_at.isoformat(),
        replies=[
            ReplyResponse(
                id=r.id,
                pseudonym=r.pseudonym,
                reply_content=r.reply_content,
                created_at=r.created_at.isoformat(),
            )
            for r in replies
        ],
    )


@router.post("/posts", status_code=201)
async def create_post(
    payload: PostCreateRequest,
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> PostResponse:
    """
    Create new forum post. Requires authentication.
    Content is moderated before write — harmful content is rejected with crisis resources.
    """
    # Get user's pseudonym
    user = await db.get(User, current_session.fhir_patient_id)
    if user is None or user.pseudonym is None:
        raise HTTPException(
            status_code=400,
            detail="Pseudonym required. Create one at POST /api/forum/pseudonym first.",
        )
    
    # Sanitize and moderate content
    sanitized_content = sanitize_content(payload.content)
    moderation_result, crisis_message = moderate_content(sanitized_content)
    
    if moderation_result == ModerationResult.REJECTED:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Content contains concerning language and cannot be posted.",
                "crisis_resources": crisis_message,
            },
        )
    
    # Create post
    post = ForumPost(
        patient_fhir_id=current_session.fhir_patient_id,
        pseudonym=user.pseudonym,
        post_content=sanitized_content,
        moderation_status=ModerationStatus.APPROVED,
        created_at=datetime.now(timezone.utc),
    )
    db.add(post)
    await db.flush()
    
    return PostResponse(
        id=post.id,
        pseudonym=post.pseudonym,
        post_content=post.post_content,
        created_at=post.created_at.isoformat(),
        reply_count=0,
    )


# ============================================================================
# Replies
# ============================================================================


@router.post("/posts/{post_id}/replies", status_code=201)
async def create_reply(
    post_id: str,
    payload: ReplyCreateRequest,
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> ReplyResponse:
    """
    Reply to a forum post. Requires authentication.
    Content is moderated before write.
    """
    # Verify post exists
    post = await db.get(ForumPost, post_id)
    if post is None or post.moderation_status != ModerationStatus.APPROVED:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Get user's pseudonym
    user = await db.get(User, current_session.fhir_patient_id)
    if user is None or user.pseudonym is None:
        raise HTTPException(
            status_code=400,
            detail="Pseudonym required. Create one at POST /api/forum/pseudonym first.",
        )
    
    # Sanitize and moderate content
    sanitized_content = sanitize_content(payload.content)
    moderation_result, crisis_message = moderate_content(sanitized_content)
    
    if moderation_result == ModerationResult.REJECTED:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Content contains concerning language and cannot be posted.",
                "crisis_resources": crisis_message,
            },
        )
    
    # Create reply
    reply = ForumReply(
        post_id=post_id,
        patient_fhir_id=current_session.fhir_patient_id,
        pseudonym=user.pseudonym,
        reply_content=sanitized_content,
        moderation_status=ModerationStatus.APPROVED,
        created_at=datetime.now(timezone.utc),
    )
    db.add(reply)
    await db.flush()
    
    return ReplyResponse(
        id=reply.id,
        pseudonym=reply.pseudonym,
        reply_content=reply.reply_content,
        created_at=reply.created_at.isoformat(),
    )


# ============================================================================
# Reporting
# ============================================================================


@router.post("/posts/{post_id}/report", status_code=200)
async def report_post(
    post_id: str,
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Flag a post for manual review. Requires authentication.
    Updates moderation_status to FLAGGED.
    """
    post = await db.get(ForumPost, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Update moderation status
    post.moderation_status = ModerationStatus.FLAGGED
    await db.flush()
    
    return {"message": "Post has been flagged for review. Thank you for helping keep Mom Talk safe."}


@router.post("/posts/{post_id}/replies/{reply_id}/report", status_code=200)
async def report_reply(
    post_id: str,
    reply_id: str,
    current_session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Flag a reply for manual review. Requires authentication.
    Updates moderation_status to FLAGGED.
    """
    reply = await db.get(ForumReply, reply_id)
    if reply is None or reply.post_id != post_id:
        raise HTTPException(status_code=404, detail="Reply not found")
    
    # Update moderation status
    reply.moderation_status = ModerationStatus.FLAGGED
    await db.flush()
    
    return {"message": "Reply has been flagged for review. Thank you for helping keep Mom Talk safe."}
