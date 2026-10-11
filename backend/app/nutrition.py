from __future__ import annotations

import re

_NUM = r"(\d+(?:[.,]\d+)?)"
_SEP = r"\s*[:=\-–—]?\s*"

# Patterns are deliberately tolerant of OCR spacing and omitted units.
NUTRIENT_PATTERNS = {
    "calories_kcal": [
        rf"\b(?:energy|calories?)\b{_SEP}{_NUM}\s*(?:kcal|kilocalories?)\b",
        rf"\bcalories?\b{_SEP}{_NUM}\b",
        rf"\benergy\b{_SEP}{_NUM}\s*(?:kc|kca|kcal)?\b",
    ],
    "protein_g": [rf"\bprotein\b{_SEP}{_NUM}\s*g?\b"],
    "total_carbohydrates_g": [
        rf"\btotal\s+carbohydrates?\b{_SEP}{_NUM}\s*g?\b",
        rf"\bcarbohydrates?\b{_SEP}{_NUM}\s*g?\b",
        rf"\bcarbs?\b{_SEP}{_NUM}\s*g?\b",
    ],
    "total_sugar_g": [
        rf"\bof\s+which\s+total\s+sugars?\b{_SEP}{_NUM}\s*g?\b",
        rf"\btotal\s+sugars?\b{_SEP}{_NUM}\s*g?\b",
        rf"\bof\s+which\s+sugars?\b{_SEP}{_NUM}\s*g?\b",
        rf"\bsugars?\b{_SEP}{_NUM}\s*g?\b",
    ],
    "added_sugar_g": [rf"\b(?:of\s+which\s+)?added\s+sugars?\b{_SEP}{_NUM}\s*g?\b"],
    "saturated_fat_g": [rf"\bsaturated\s+fats?\b{_SEP}{_NUM}\s*g?\b", rf"\bsat\.?\s*fats?\b{_SEP}{_NUM}\s*g?\b"],
    "trans_fat_g": [rf"\btrans\s+fats?\b{_SEP}{_NUM}\s*g?\b", rf"\btrans\s+fatty\s+acids?\b{_SEP}{_NUM}\s*g?\b"],
    "unsaturated_fat_g": [rf"\bunsaturated\s+fats?\b{_SEP}{_NUM}\s*g?\b", rf"\bmonounsaturated\s+fats?\b{_SEP}{_NUM}\s*g?\b", rf"\bpolyunsaturated\s+fats?\b{_SEP}{_NUM}\s*g?\b"],
    "total_fat_g": [rf"\btotal\s+fats?\b{_SEP}{_NUM}\s*g?\b", rf"(?<!saturated )(?<!trans )(?<!unsaturated )\bfats?\b{_SEP}{_NUM}\s*g?\b"],
    "fiber_g": [rf"\b(?:dietary\s+)?fib(?:er|re)\b{_SEP}{_NUM}\s*g?\b"],
    "sodium_mg": [rf"\bsodium\b{_SEP}{_NUM}\s*(?:mg|milligrams?)\b", rf"\bsodium\b{_SEP}{_NUM}\s*g\b", rf"\bsodium\b{_SEP}{_NUM}\b"],
    "cholesterol_mg": [rf"\bcholesterol\b{_SEP}{_NUM}\s*(?:mg|milligrams?)?\b"],
    "potassium_mg": [rf"\bpotassium\b{_SEP}{_NUM}\s*(?:mg|milligrams?)?\b"],
    "calcium_mg": [rf"\bcalcium\b{_SEP}{_NUM}\s*(?:mg|milligrams?)?\b"],
    "iron_mg": [rf"\biron\b{_SEP}{_NUM}\s*(?:mg|milligrams?)?\b"],
    "magnesium_mg": [rf"\bmagnesium\b{_SEP}{_NUM}\s*(?:mg|milligrams?)?\b"],
    "zinc_mg": [rf"\bzinc\b{_SEP}{_NUM}\s*(?:mg|milligrams?)?\b"],
    "vitamin_d_mcg": [rf"\bvitamin\s*d\b{_SEP}{_NUM}\s*(?:mcg|ug|u?g)?\b"],
    "vitamin_a_mcg": [rf"\bvitamin\s*a\b{_SEP}{_NUM}\s*(?:mcg|ug|u?g)?\b"],
    "vitamin_c_mg": [rf"\bvitamin\s*c\b{_SEP}{_NUM}\s*(?:mg)?\b"],
    "vitamin_b12_mcg": [rf"\bvitamin\s*b\s*12\b{_SEP}{_NUM}\s*(?:mcg|ug|u?g)?\b"],
}


def _number(raw: str) -> float:
    return float(raw.replace(",", "."))


def _normalize_text(text: str) -> str:
    text = (text or "").replace("\x0c", " ")
    text = text.replace("–", "-").replace("—", "-").replace("−", "-")
    text = text.replace("µ", "u").replace("ﬁ", "fi").replace("ﬂ", "fl")
    # Keep lines for ingredient extraction, but normalize spaces on each line.
    lines = [re.sub(r"[\t ]+", " ", line).strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line)


def extract_nutrition(text: str) -> dict:
    normalized = _normalize_text(text)
    # OCR lines can place the label and value on adjacent lines, so try both
    # the full normalized text and a space-joined version.
    search_text = re.sub(r"\s+", " ", normalized)
    result: dict[str, float] = {}
    for key, patterns in NUTRIENT_PATTERNS.items():
        for pattern in patterns:
            match = re.search(pattern, search_text, flags=re.IGNORECASE)
            if match:
                try:
                    value = _number(match.group(1))
                    # Reject clearly implausible OCR captures rather than showing them as facts.
                    # Conservative plausibility checks prevent OCR fragments such as
                    # "259" from being displayed as 259 g of fibre.
                    if key in {"protein_g", "total_carbohydrates_g", "total_sugar_g", "added_sugar_g", "saturated_fat_g", "trans_fat_g", "unsaturated_fat_g", "total_fat_g", "fiber_g"} and value > 100:
                        continue
                    if key in {"sodium_mg", "cholesterol_mg", "potassium_mg", "calcium_mg", "iron_mg", "magnesium_mg", "zinc_mg"} and value > 100000:
                        continue
                    if key == "calories_kcal" and value > 10000:
                        continue
                    result[key] = value
                    break
                except (ValueError, IndexError):
                    continue

    serving = re.search(
        rf"\bserving\s+size\b{_SEP}{_NUM}\s*(g|grams?|ml|millilit(?:er|re)s?)\b",
        search_text,
        flags=re.IGNORECASE,
    )
    if serving:
        result["serving_size_g"] = _number(serving.group(1))
        unit = serving.group(2).lower()
        result["serving_size_unit"] = "ml" if unit == "ml" or unit.startswith("millilit") else "g"
    return result
def extract_ingredients(text: str) -> str:
    normalized = _normalize_text(text)
    # First choice: text following a recognizable ingredient heading.
    heading = r"\b(?:ingredients?|ingredlents?|lngredients?|ingredient[s5]?)\b\s*[:=\-]?\s*"
    stop = r"\b(?:nutrition\s+facts|nutrition\s+information|nutritional\s+information|allergen\s+information|allergy\s+advice|may\s+contain|contains\s+(?:wheat|milk|soy|nuts|barley)|storage\s+instructions|manufactured\s+by|marketed\s+by|best\s+before|use\s+by|net\s+(?:quantity|weight)|serving\s+size|typical\s+values|per\s+100\s*g)\b"
    match = re.search(heading + r"(.*?)" + r"(?=" + stop + r"|$)", normalized, flags=re.IGNORECASE | re.DOTALL)
    if match:
        ingredients = re.sub(r"\s+", " ", match.group(1)).strip(" \n\t:;-,.")
        if len(ingredients) >= 3:
            return ingredients

    # Fallback for OCR that missed the heading but captured a comma-separated
    # ingredient statement (as in the provided Corn Flakes OCR sample).
    lines = normalized.splitlines()
    candidates = []
    start_terms = ("corn grits", "whole grain", "wheat flour", "maize", "sugar,", "oats,", "rice flour")
    ingredient_terms = ("sugar", "salt", "flour", "grits", "oil", "starch", "extract", "vitamins", "minerals", "antioxidant", "preservative", "emulsifier", "flavour", "flavor")
    for line in lines:
        cleaned = re.sub(r"^[^A-Za-z]+", "", line).strip()
        lower = cleaned.lower()
        if any(term in lower for term in start_terms) and sum(term in lower for term in ingredient_terms) >= 2 and "," in cleaned:
            candidates.append(cleaned)
    if candidates:
        candidate = max(candidates, key=len)
        candidate = re.split(stop, candidate, maxsplit=1, flags=re.IGNORECASE)[0].strip(" \n\t:;-,.")
        return candidate if len(candidate) >= 3 else ""
    return ""


def analyze_warnings(nutrition: dict, ingredients: str, user, daily_sugar_before: float = 0.0) -> list[str]:
    warnings = []
    conditions = " ".join(getattr(user, "conditions", None) or []).lower()
    allergies = [item.strip().lower() for item in (getattr(user, "allergies", None) or []) if item and item.strip()]
    ingredients_lower = (ingredients or "").lower()
    sugar = nutrition.get("total_sugar_g")
    limit = float(getattr(user, "sugar_daily_reference_g", None) or 50)

    if sugar is not None:
        percentage = sugar / limit * 100 if limit > 0 else 0
        warnings.append(f"This serving contains {sugar:g} g total sugar, about {percentage:.0f}% of your selected daily reference. Verify this against the package label.")
        if "diabetes" in conditions or "blood sugar" in conditions:
            warnings.append("Review the carbohydrate and sugar values against your individual dietary guidance.")
        if daily_sugar_before + sugar > limit:
            warnings.append("Your logged sugar total would exceed your selected daily reference if this serving is included.")

    sodium = nutrition.get("sodium_mg")
    if sodium is not None and ("hypertension" in conditions or "high blood pressure" in conditions):
        warnings.append(f"Check the sodium amount ({sodium:g} mg) against your personal dietary guidance.")
    calories = nutrition.get("calories_kcal")
    if calories is not None and ("obesity" in conditions or "weight management" in conditions):
        warnings.append(f"Energy listed for this serving is {calories:g} kcal. Consider serving size and your individual needs.")
    if allergies and ingredients_lower:
        for allergen in allergies:
            if allergen in ingredients_lower:
                warnings.append(f"Possible allergy keyword match: '{allergen}'. Check the full package label carefully.")
    if not warnings:
        warnings.append("No condition-specific reminder was triggered by the values extracted. This does not mean the product is suitable for everyone.")
    return warnings
