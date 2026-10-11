import os

from datetime import datetime, date

from io import BytesIO

from dotenv import load_dotenv

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File

from fastapi.middleware.cors import CORSMiddleware

from PIL import Image, ImageOps, UnidentifiedImageError

import pytesseract

from sqlalchemy.orm import Session

from sqlalchemy import select, func

from .database import Base, engine, get_db

from .models import User, Scan, Ingredient

from .schemas import RegisterIn, LoginIn, ProfileIn, UserOut

from .security import (

    hash_password,

    verify_password,

    create_access_token,

    get_current_user,

)

from .nutrition import (

    extract_nutrition,

    extract_ingredients,

    analyze_warnings,

)

from .ingredient_service import search_ingredients

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(

    title="NutriLens AI API",

    version="1.0.0",

    description="Personalized packaged-food label analysis prototype",

)

origins = [

    x.strip()

    for x in os.getenv(

        "CORS_ORIGINS",

       "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://127.0.0.1:5176",

    ).split(",")

    if x.strip()

]

app.add_middleware(

    CORSMiddleware,

    allow_origins=origins,

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "8"))

@app.get("/health")

def health():
    return {"status": "ok", "service": "NutriLens AI API"}

def user_payload(user: User):

    return {

        "id": user.id,

        "name": user.name,

        "email": user.email,

        "age": user.age,

        "height_cm": user.height_cm,

        "weight_kg": user.weight_kg,

        "conditions": user.conditions or [],

        "allergies": user.allergies or [],

        "dietary_preferences": user.dietary_preferences or [],

        "sugar_daily_reference_g": user.sugar_daily_reference_g,

    }

@app.post("/api/auth/register")

def register(body: RegisterIn, db: Session = Depends(get_db)):

    email = body.email.lower()

    if db.scalar(select(User).where(User.email == email)):

        raise HTTPException(

            status_code=409,

            detail="An account with this email already exists.",

        )

    user = User(

        name=body.name.strip(),

        email=email,

        password_hash=hash_password(body.password),

        conditions=[],

        allergies=[],

        dietary_preferences=[],

        sugar_daily_reference_g=50.0,

    )

    db.add(user)

    db.commit()

    db.refresh(user)

    return {

        "access_token": create_access_token(user.id),

        "token_type": "bearer",

        "user": user_payload(user),

    }

@app.post("/api/auth/login")

def login(body: LoginIn, db: Session = Depends(get_db)):

    user = db.scalar(

        select(User).where(User.email == body.email.lower())

    )

    if not user or not verify_password(

        body.password, user.password_hash

    ):

        raise HTTPException(

            status_code=401,

            detail="Email or password is incorrect.",
                   )

    return {

        "access_token": create_access_token(user.id),

        "token_type": "bearer",

        "user": user_payload(user),

    }

@app.get("/api/me")

def me(user: User = Depends(get_current_user)):

    return user_payload(user)

@app.put("/api/me/profile")

def update_profile(

    body: ProfileIn,

    db: Session = Depends(get_db),

    user: User = Depends(get_current_user),

):

    user.name = body.name.strip()

    user.age = body.age

    user.height_cm = body.height_cm

    user.weight_kg = body.weight_kg

    user.conditions = body.conditions

    user.allergies = body.allergies

    user.dietary_preferences = body.dietary_preferences

    user.sugar_daily_reference_g = body.sugar_daily_reference_g

    db.commit()

    db.refresh(user)

    return user_payload(user)

def _scan_payload(scan: Scan):

    nutrition = scan.nutrition or {}

    return {

        "id": scan.id,

        "product_name": scan.product_name,

        "original_filename": scan.original_filename,

        "ocr_text": scan.ocr_text,

        "ingredients_text": scan.ingredients_text,

        "nutrition": nutrition,

        "warnings": scan.warnings or [],

        "sugar_g_per_serving": scan.sugar_g_per_serving,

        "calories_per_serving": scan.calories_per_serving,

        "serving_size_g": scan.serving_size_g,

        "created_at": scan.created_at.isoformat() + "Z",

    }

@app.post("/api/scans")

async def create_scan(

    file: UploadFile = File(...),

    db: Session = Depends(get_db),

    user: User = Depends(get_current_user),

):

    allowed = {

        "image/jpeg",

        "image/png",

        "image/webp",

        "image/tiff",

        "image/bmp",

    }
    if file.content_type not in allowed:

        raise HTTPException(

            status_code=415,

            detail="Upload a JPG, PNG, WEBP, TIFF, or BMP image.",

        )

    data = await file.read()

    if not data:

        raise HTTPException(

            status_code=400,

            detail="The uploaded image is empty.",

        )

    if len(data) > MAX_UPLOAD_MB * 1024 * 1024:

        raise HTTPException(

            status_code=413,

            detail=f"Image must be smaller than {MAX_UPLOAD_MB} MB.",

        )

    try:

        image = Image.open(BytesIO(data))

        image = ImageOps.exif_transpose(image).convert("RGB")

    except (UnidentifiedImageError, OSError):

        raise HTTPException(

            status_code=400,

            detail="Could not read that image. Try a clear JPG or PNG.",

        )

    # OCR: test several image treatments and layout modes. Choose the result
    # with the strongest nutrition-label signals, not merely the most characters.
    try:
        from PIL import ImageEnhance, ImageFilter
        import re

        gray = ImageOps.grayscale(image)
        width, height = gray.size
        if width < 1800:
            scale = 1800 / width
            gray = gray.resize(
                (1800, max(1, int(height * scale))),
                Image.Resampling.LANCZOS,
            )

        enhanced = ImageEnhance.Contrast(gray).enhance(1.8)
        sharpened = enhanced.filter(ImageFilter.SHARPEN)
        thresholded = enhanced.point(lambda pixel: 255 if pixel > 165 else 0)
        variants = [gray, enhanced, sharpened, thresholded]
        ocr_results = []

        for variant in variants:
            for psm in (6, 11, 4):
                candidate = pytesseract.image_to_string(
                    variant,
                    config=f"--oem 3 --psm {psm}",
                ).strip()
                if candidate:
                    ocr_results.append(candidate)

        def _ocr_score(candidate: str) -> tuple[int, int]:
            lower = candidate.lower()
            useful_terms = (
                "ingredients", "ingredient", "nutrition", "energy", "calories",
                "protein", "carbohydrate", "carbs", "sugar", "fat", "sodium",
                "salt", "fibre", "fiber", "serving size", "cholesterol",
                "saturated", "trans fat", "calcium", "iron", "potassium",
            )
            label_hits = sum(lower.count(term) for term in useful_terms)
            number_hits = len(re.findall(r"\d+(?:[.,]\d+)?", candidate))
            return (label_hits * 3 + number_hits, min(len(candidate), 5000))

        ocr_text = max(
            ocr_results,
            key=lambda text: (
                _ocr_score(text)[0],
                _ocr_score(text)[1],
                sum(ch.isalpha() for ch in text),
            ),
            default="",
        )
    except pytesseract.TesseractNotFoundError:
        raise HTTPException(
            status_code=503,
            detail=(
                "Tesseract OCR is not installed. "
                "On macOS, run: brew install tesseract"
            ),
        )

    if not ocr_text.strip():
        raise HTTPException(
            status_code=422,
            detail=(
                "No readable text found. Try a sharper, well-lit "
                "photo of the ingredients and nutrition panels."
            ),
        )

    print("\n========== NUTRILENS OCR TEXT ==========")

    print(ocr_text)

    print("========== END OCR TEXT ================\n")

    nutrition = extract_nutrition(ocr_text)

    ingredients = extract_ingredients(ocr_text)

    today = date.today()

    existing_sugar = db.scalar(

        select(

            func.coalesce(

                func.sum(Scan.sugar_g_per_serving),

                0.0,

            )

        ).where(

            Scan.user_id == user.id,

            func.date(Scan.created_at) == today,

        )

    ) or 0.0

    warnings = analyze_warnings(

        nutrition,

        ingredients,

        user,

        float(existing_sugar),

    )

    scan = Scan(

        user_id=user.id,

        original_filename=(

            file.filename or "food-label-image"

        )[:255],

        product_name="Scanned food label",

        ocr_text=ocr_text,

        ingredients_text=ingredients,

        nutrition=nutrition,

        warnings=warnings,

        sugar_g_per_serving=nutrition.get("total_sugar_g"),

        calories_per_serving=nutrition.get("calories_kcal"),

        serving_size_g=nutrition.get("serving_size_g"),

    )

    db.add(scan)
    db.commit()

    db.refresh(scan)

    payload = _scan_payload(scan)

    payload["daily_summary"] = daily_summary_for(user, db)

    return payload

@app.get("/api/scans")

def list_scans(

    db: Session = Depends(get_db),

    user: User = Depends(get_current_user),

):

    scans = db.scalars(

        select(Scan)

        .where(Scan.user_id == user.id)

        .order_by(Scan.created_at.desc())

        .limit(50)

    ).all()

    return [_scan_payload(scan) for scan in scans]

def daily_summary_for(user: User, db: Session):

    today = date.today()

    scans = db.scalars(

        select(Scan).where(

            Scan.user_id == user.id,

            func.date(Scan.created_at) == today,

        )

    ).all()

    sugar_values = [

        scan.sugar_g_per_serving

        for scan in scans

        if scan.sugar_g_per_serving is not None

    ]

    calorie_values = [

        scan.calories_per_serving

        for scan in scans

        if scan.calories_per_serving is not None

    ]

    sugar = sum(sugar_values)

    limit = float(user.sugar_daily_reference_g or 50)

    return {

        "date": today.isoformat(),

        "sugar_g_logged": round(sugar, 2),

        "sugar_daily_reference_g": limit,

        "sugar_percent": round(sugar / limit * 100, 1),

        "calories_kcal_logged": round(sum(calorie_values), 2),

        "scans_count": len(scans),
          }

@app.get("/api/daily-summary")

def daily_summary(

    db: Session = Depends(get_db),

    user: User = Depends(get_current_user),

):

    return daily_summary_for(user, db)

@app.get("/api/ingredients/search")

def ingredient_search(

    q: str,

    db: Session = Depends(get_db),

    user: User = Depends(get_current_user),

):

    results = search_ingredients(q, db)

    return {

        "query": q,

        "count": len(results),

        "results": results,

    }
