# NutriLens AI — Step-by-step setup and AI prompts

This guide is for macOS and the project structure included in this ZIP.

## Before you begin

Download and extract `nutrilens-ai-project.zip`. Open the extracted `nutrilens-ai` folder in VS Code. The project uses:
- Frontend: React + Vite
- Backend: FastAPI + Python
- Database: MySQL
- Image text extraction: Tesseract OCR

The source package is a starter implementation. Do not assume all integrations have been end-to-end tested until you run the checks below.

## Step 1 — Install/check tools

In Terminal:
```bash
node -v
npm -v
python3 --version
mysql --version
```
Recommended: Node.js 20+, Python 3.11+, and MySQL 8+. Install Tesseract:
```bash
brew install tesseract
tesseract --version
```
If `brew` is not found, install Homebrew from https://brew.sh first.

## Step 2 — Open the folder

In VS Code, choose File → Open Folder → select the extracted `nutrilens-ai` folder.
Or in Terminal, navigate to the folder you extracted. Example only:
```bash
cd ~/Downloads/nutrilens-ai
code .
```
If `code` is not found, open VS Code manually and use File → Open Folder.

## Step 3 — Create MySQL database

Start your MySQL server first. Then:
```bash
mysql -u root -p
```
Enter your MySQL root password. At the `mysql>` prompt, run:
```sql
CREATE DATABASE nutrilens CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nutrilens_user'@'localhost' IDENTIFIED BY 'use-a-strong-password-here';
GRANT ALL PRIVILEGES ON nutrilens.* TO 'nutrilens_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```
Keep the password you chose; you need it in the backend `.env` file.

## Step 4 — Configure and start backend

Open a Terminal tab/window:
```bash
cd /path/to/nutrilens-ai/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```
Replace `/path/to/nutrilens-ai` with the real path. Example if extracted in Downloads:
```bash
cd ~/Downloads/nutrilens-ai/backend
```
Generate a secret:
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```
Edit `backend/.env` in VS Code. Set the database password and JWT secret:
```env
DATABASE_URL=mysql+pymysql://nutrilens_user:YOUR_MYSQL_PASSWORD@127.0.0.1:3306/nutrilens
JWT_SECRET_KEY=PASTE_THE_GENERATED_SECRET_HERE
ACCESS_TOKEN_EXPIRE_MINUTES=10080
CORS_ORIGINS=http://localhost:5173
SUGAR_DAILY_REFERENCE_G=50
MAX_UPLOAD_MB=8
```
For a password containing special URL characters such as `@`, `:`, `/`, or `#`, URL-encode the password in `DATABASE_URL`, or use a simpler strong password made of letters, digits, and underscores for local development.

Run:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Keep this terminal open. Check:
- http://127.0.0.1:8000/health
- http://127.0.0.1:8000/docs

Expected health response:
```json
{"status":"ok","service":"NutriLens AI API"}
```

## Step 5 — Configure and start frontend

Open a second Terminal window:
```bash
cd /path/to/nutrilens-ai/frontend
npm install
cp .env.example .env
npm run dev
```
If extracted in Downloads:
```bash
cd ~/Downloads/nutrilens-ai/frontend
```
Keep this terminal open and visit the URL Vite prints, usually http://localhost:5173.

## Step 6 — Test the happy path

1. Register with a test email and a password at least 8 characters long.
2. Fill in and save the health profile.
3. Choose “Scan a product”.
4. Upload a sharp image that includes the nutrition facts and ingredient panel.
5. Check the displayed nutrients against the printed label.
6. Use “Read report aloud”.
7. Return to the dashboard and verify the scan appears in history.

If the label image is blurry or OCR returns no text, use a clearer photo with good lighting. Nutrition extraction is based on recognizable text patterns, not a full AI vision model.

## Step 7 — Common errors

### `ModuleNotFoundError` or missing Python package
Make sure the backend virtual environment is active:
```bash
cd /path/to/nutrilens-ai/backend
source .venv/bin/activate
pip install -r requirements.txt
```

### MySQL connection refused
Start MySQL in your installed MySQL service/application. Verify the database and credentials:
```bash
mysql -u nutrilens_user -p -h 127.0.0.1 nutrilens
```

### `Access denied for user`
Check the username/password in `backend/.env` and ensure the MySQL user has privileges on the `nutrilens` database.

### Tesseract not found
```bash
brew install tesseract
which tesseract
tesseract --version
```
Restart the backend after installing it.

### Frontend says `Failed to fetch`
- Confirm backend is running on port 8000.
- Open http://127.0.0.1:8000/health.
- Check `frontend/.env` contains `VITE_API_URL=http://127.0.0.1:8000`.
- Restart Vite after editing `.env`.

### `email-validator` error
Run `pip install -r requirements.txt` again in the active backend virtual environment.

### Port 5173 or 8000 is already in use
Stop the other process or choose another port. If changing the frontend port, also update `CORS_ORIGINS` in `backend/.env`.

## Step 8 — Prompt sequence for an AI coding assistant

Use these prompts one at a time in Cursor, GitHub Copilot Chat, or ChatGPT. Do not ask the assistant to rewrite the entire project in one giant prompt. After each step, run the app and check it before continuing.

### Prompt 1 — Inspect before editing
```text
You are helping me build NutriLens AI, a packaged-food nutrition scanner. Inspect the existing repository before changing anything. The stack is React + Vite, Python FastAPI, SQLAlchemy, and MySQL. First summarize the folder structure, identify missing dependencies or broken imports, and propose the smallest safe changes. Do not replace working files or claim anything was tested unless you actually ran the relevant test.
```

### Prompt 2 — Premium frontend
```text
Improve the NutriLens AI React/Vite frontend to a premium green-and-white nutrition product. Keep it responsive on desktop and mobile, accessible with keyboard focus and clear contrast, and especially usable by elderly people. Preserve the current API calls and route/screen behavior. Use clear empty, loading, success, and error states. Do not add fake scan results or controls that do nothing. List every changed file and how I can test it.
```

### Prompt 3 — Authentication and profile
```text
Review the FastAPI registration/login and health-profile flow. Ensure passwords are securely hashed, endpoints are authenticated, request data is validated, and users can only read or update their own records. Add tests for duplicate email, wrong password, valid login, and profile updates. Do not store passwords in plain text or expose password hashes. Explain how to run the tests.
```

### Prompt 4 — MySQL and schema
```text
Review the SQLAlchemy models and MySQL configuration for NutriLens AI. Check user profiles, conditions, allergies, products/ingredient reference data, scan history, nutrition values, and daily intake. Propose safe migrations rather than deleting existing data. Make sure JSON columns work with MySQL 8 and explain how to initialize or migrate the schema.
```

### Prompt 5 — Image upload and OCR
```text
Improve NutriLens AI's food-label image upload flow. Validate MIME type, actual image format, and file size; handle corrupt images and OCR failures; preprocess images to improve OCR; and return extracted text plus an explicit list of values that were not found. Never invent missing nutrient values. Keep original OCR text available for review and write tests using sample text fixtures.
```

### Prompt 6 — Nutrition extraction
```text
Improve the nutrition parser for real packaged-food labels. Support common label variants for energy, protein, total carbohydrate, total sugars, added sugars, total fat, saturated fat, fibre, sodium, serving size, and per-100-g versus per-serving values. Preserve units and the basis for each value. Avoid mixing mg and g. If the label is ambiguous, mark the value as uncertain instead of guessing. Add unit tests for each supported pattern.
```

### Prompt 7 — Ingredient decoder
```text
Add a curated ingredient reference table to NutriLens AI with common name, alternative label names, scientific/technical name when applicable, function, plain-language explanation, and source/reference date. Match aliases conservatively. Do not invent chemical identities or claim palm oil has one single scientific name; explain it as an oil derived from the fruit of oil palm. Show “not recognized” when no reliable match exists.
```

### Prompt 8 — Personalized health notes
```text
Review NutriLens AI's condition-aware warning rules for diabetes, hypertension, kidney disease, high cholesterol, obesity/weight management, and allergies. Make the wording informational and cautious. Do not predict blood glucose, diagnose, or call a food safe/unsafe based only on a profile. Allergy keyword matching must be labelled incomplete. Distinguish total sugar from added/free sugar and per-serving from per-100-g values. Add tests for each rule.
```

### Prompt 9 — Daily intake tracking
```text
Improve daily intake tracking so users can log a chosen serving size, not just assume every scanned package was eaten. Avoid counting the same scan repeatedly. Store date/time consistently in UTC and aggregate using the user's local date setting. Clearly label incomplete tracking and show the configurable sugar reference as a tracking reference, not a universal medical limit. Add tests for the 0%, below-reference, exactly-at-reference, and above-reference cases.
```

### Prompt 10 — Voice and accessibility
```text
Improve the report's text-to-speech accessibility. Add a clear start/stop button, prevent overlapping speech, announce errors, and use a selected language/voice only if the browser supports it. Ensure controls have accessible labels, large touch targets, readable font sizes, strong contrast, and keyboard navigation. Do not claim Telugu speech works unless a Telugu voice is actually available.
```

### Prompt 11 — Security review
```text
Perform a security review of NutriLens AI before any public deployment. Check JWT secret handling, token storage, password policy, CORS, upload limits, MIME spoofing, rate limiting, SQL injection risk, personal health data exposure, logs, and dependency versions. Remove development fallback secrets. Give concrete fixes and tests. Do not claim compliance with a privacy law without a proper review.
```

### Prompt 12 — End-to-end test
```text
Create a reproducible end-to-end test plan for NutriLens AI: register, log in, save profile, upload a fixture food label, verify extracted values, save scan, load history, calculate daily sugar reference percentage, and read the report aloud. Separate automated tests from manual browser tests. Run only tests that are available in this environment and report the actual results honestly.
```

### Prompt 13 — Deployment preparation
```text
Prepare NutriLens AI for deployment without exposing secrets. Create production environment variable documentation, a safe database migration process, frontend/backend deployment instructions, HTTPS and CORS guidance, upload storage policy, backups, monitoring, and rollback steps. Do not deploy anything or claim it is online without my explicit approval and verified deployment output.
```

## Step 9 — Recommended build order

1. Get the backend health endpoint working.
2. Get the frontend opening in the browser.
3. Register, log in, and save a health profile.
4. Scan one clear label image and inspect raw OCR text.
5. Improve extraction with sample label fixtures.
6. Add ingredient dictionary and barcode lookup.
7. Improve manual correction and serving-size tracking.
8. Run security, accessibility, and end-to-end tests.
9. Deploy only after configuring production secrets and HTTPS.

## Medical and privacy caution

This prototype offers informational label analysis, not diagnosis or treatment. OCR errors and incomplete allergen matching can be dangerous if presented as definitive. Use appropriate dietary references, let users review extracted values, and have qualified professionals review health-related rules before real-world use. Protect health-profile data and obtain appropriate user consent.
