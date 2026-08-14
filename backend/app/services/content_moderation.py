"""Content moderation service for Mom Talk forum.

Filters harmful content (suicide, self-harm, violence keywords) before posts/replies are written.
Blocked content redirects patient to crisis resources.
"""

import re
from enum import Enum


class ModerationResult(str, Enum):
    """Content moderation decision."""
    APPROVED = "approved"
    REJECTED = "rejected"


# Harmful keyword patterns (case-insensitive regex)
HARMFUL_PATTERNS = [
    # Suicide/self-harm
    r"\b(kill myself|suicide|end my life|want to die|hurt myself|cut myself|self[- ]harm)\b",
    # Violence toward others
    r"\b(kill (my )?(baby|child|husband|partner)|hurt (my )?(baby|child))\b",
    # Methods
    r"\b(overdose|pills|jump|hang myself|gun|knife)\b",
]

# Crisis resource message
CRISIS_MESSAGE = """
Your message contains concerning content. Please reach out for immediate support:

**National Maternal Mental Health Hotline**
1-833-943-5746 (call or text, available 24/7)

**National Suicide Prevention Lifeline**
988 (call or text)

**Crisis Text Line**
Text HOME to 741741

You are not alone. Help is available right now.
"""


def moderate_content(text: str) -> tuple[ModerationResult, str | None]:
    """
    Check content for harmful keywords.
    
    Args:
        text: Post or reply content to moderate
        
    Returns:
        (ModerationResult, crisis_message)
        - APPROVED: content is safe, message is None
        - REJECTED: harmful content detected, message contains crisis resources
    """
    text_lower = text.lower()
    
    for pattern in HARMFUL_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            return ModerationResult.REJECTED, CRISIS_MESSAGE
    
    return ModerationResult.APPROVED, None


def sanitize_content(text: str) -> str:
    """
    Sanitize user-generated content for safe storage/display.
    
    - Strip leading/trailing whitespace
    - Collapse multiple consecutive spaces
    - Remove control characters (except newlines)
    
    Args:
        text: Raw user input
        
    Returns:
        Sanitized text safe for storage
    """
    # Strip whitespace
    text = text.strip()
    
    # Collapse multiple spaces (preserve single newlines)
    text = re.sub(r"[ \t]+", " ", text)
    
    # Remove control characters except newlines
    text = re.sub(r"[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]", "", text)
    
    return text
