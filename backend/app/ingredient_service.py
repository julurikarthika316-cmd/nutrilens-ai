
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models import Ingredient


def search_ingredients(query: str, db: Session) -> list[dict]:
    """Search ingredient names, synonyms and additive codes."""

    cleaned = " ".join(query.strip().lower().split())
    if not cleaned:
        return []

    records = db.scalars(
        select(Ingredient).order_by(Ingredient.canonical_name)
    ).all()

    results = []

    for item in records:
        names = [
            item.canonical_name,
            item.scientific_name or "",
            *(item.synonyms or []),
            *(item.additive_codes or []),
        ]

        normalized_names = [
            " ".join(str(name).lower().split()) for name in names
        ]

        if any(cleaned in name for name in normalized_names):
            results.append({
                "id": item.id,
                "canonical_name": item.canonical_name,
                "scientific_name": item.scientific_name,
                "synonyms": item.synonyms or [],
                "additive_codes": item.additive_codes or [],
                "category": item.category,
                "food_function": item.food_function,
                "description": item.description,
                "safety_notes": item.safety_notes,
                "evidence_sources": item.evidence_sources or [],
                "verified": item.verified,
            })

    return results
