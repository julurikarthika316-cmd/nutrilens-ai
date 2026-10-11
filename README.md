# NutriLens AI — Look Beyond the Label

A working starter project for personalized packaged-food label analysis:
- React + Vite premium green-and-white frontend
- FastAPI backend with JWT authentication
- MySQL database using SQLAlchemy
- Image upload + OCR using Tesseract
- Nutrition extraction, daily sugar tracking, condition-aware warnings
- Browser text-to-speech for accessible results

## Important scope notes
This is a functional prototype, not a medical device. OCR can misread labels; always show users the extracted text and allow corrections before relying on results. Warnings are informational and should not diagnose or predict an individual's blood glucose. The default daily sugar reference is a configurable example (50 g), not a universal recommendation. The prototype tracks sugars, not specifically added sugars unless the label exposes that value.

The current environment did not contain the earlier NutriLens source files, so this package recreates the existing React/Vite approach rather than editing your local copy. You can merge `frontend/src/App.jsx` and `App.css` into the existing project if needed.

## Requirements
- macOS
- Node.js 20+ and npm
- Python 3.11+
- MySQL 8+
- Tesseract OCR

## 1. Install Tesseract on macOS
```bash
brew install tesseract
```
If you do not have Homebrew, install it from https://brew.sh first.

## 2. Create MySQL database/user
Open MySQL:
```bash
mysql -u root -p
```
Then run:
```sql
CREATE DATABASE nutrilens CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nutrilens_user'@'localhost' IDENTIFIED BY 'change_this_password';
GRANT ALL PRIVILEGES ON nutrilens.* TO 'nutrilens_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 3. Start backend
```bash
cd nutrilens-ai/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```
Edit `backend/.env` and set `DATABASE_URL`, `JWT_SECRET_KEY`, and `CORS_ORIGINS`.

Example:
```env
DATABASE_URL=mysql+pymysql://nutrilens_user:change_this_password@127.0.0.1:3306/nutrilens
JWT_SECRET_KEY=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=10080
CORS_ORIGINS=http://localhost:5173
SUGAR_DAILY_REFERENCE_G=50
```
Generate a secret with:
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```
Run:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Open API docs at http://127.0.0.1:8000/docs.

## 4. Start frontend (new terminal)
```bash
cd nutrilens-ai/frontend
npm install
cp .env.example .env
npm run dev
```
Open the URL printed by Vite, usually http://localhost:5173.

## 5. Use the app
1. Register an account.
2. Enter age, height, weight, health conditions and allergies in the profile.
3. Upload a clear photo of the ingredients and nutrition label.
4. Review the OCR text and extracted values. OCR results may need correction.
5. View personalized informational warnings and daily sugar percentage.
6. Use “Read report aloud” for browser text-to-speech.

## API endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `PUT /api/me/profile`
- `POST /api/scans` (multipart image upload)
- `GET /api/scans`
- `GET /api/daily-summary`
- `GET /health`

## Notes / limitations
- OCR requires Tesseract installed on the computer running the backend.
- This first version extracts nutrition label text from images. Barcode lookup, product database enrichment, multilingual speech, and manual correction UI are extension points—not falsely represented as implemented.
- The app stores personal health profile data. Use HTTPS, a strong secret, restricted database access, a privacy notice, and appropriate consent before real deployment.
- Do not deploy with the sample JWT secret or a default database password.
