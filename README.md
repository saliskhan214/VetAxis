# VetAxis Web Application

VetAxis is Pakistan's leading digital platform for animal health, connecting pet owners, livestock farmers, and independent veterinary practitioners.

## 🔒 Security Hardening Notice & Rotation Recommendation

> [!WARNING]
> **Git History Exposure & Secret Rotation**: If any API key, database credential, or service token was previously committed or hardcoded in any prior revision of this repository, it exists in the Git history. To ensure absolute production integrity:
> - **Rotate all active credentials immediately**, including Firebase Client API Keys, Google Gemini API Keys, and related service tokens.
> - Ensure all future local secrets are restricted entirely to git-ignored `.env` files.
> - See `.env.example` for the list of required environment parameters.

## 🚀 Environment Configuration

VetAxis uses a combination of secure server-side environment variables and client-side public-safe configurations.

Create a `.env` file in the root directory (never commit this to version control) and configure the following parameters:

```env
# Google Gemini API key (Server-side secret)
GEMINI_API_KEY="your_api_key_here"

# Application domain endpoint URL
APP_URL="your_hosted_url_here"

# Client-safe Firebase Config (Dynamic fallback enabled)
VITE_FIREBASE_API_KEY="your_firebase_api_key"
VITE_FIREBASE_PROJECT_ID="your_firebase_project_id"
VITE_FIREBASE_APP_ID="your_firebase_app_id"
VITE_FIREBASE_AUTH_DOMAIN="your_firebase_auth_domain"
VITE_FIREBASE_DATABASE_ID="your_firebase_database_id"
VITE_FIREBASE_STORAGE_BUCKET="your_firebase_storage_bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_firebase_messaging_sender_id"
```
