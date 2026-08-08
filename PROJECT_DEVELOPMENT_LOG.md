# PROJECT DEVELOPMENT LOG - HAMKOR PLATFORM

## Current Version: 1.1.0 (PostgreSQL Production Persistence Audit Complete)

### Database System
- **Engine**: PostgreSQL 16 (via `asyncpg` + `SQLAlchemy 2.0 AsyncEngine`)
- **Database URL**: `postgresql+asyncpg://postgres:1234@localhost:5432/ergon_db`
- **Total Relational Tables**: 25
- **Migrations**: Alembic (`001_initial_schema` -> `e8bba9138216_full_database_persistence_architecture`)

---

### Audit & Persistence Overhaul Summary

1. **User & Settings**:
   - `users`: Added `language`, `timezone`, `settings` (JSONB), `last_login_at`.
   - `user_settings`: Created table for language, timezone, email/push flags, theme preferences.

2. **Worker Profile & Resumes**:
   - `worker_profiles`: Expanded with `relocation_preference`, `commute_preference`, `work_format`, `has_driving_license`, `driving_categories`, `has_own_car`.
   - `certificates`: Created relational table (`id`, `worker_profile_id`, `title`, `issuer`, `year`, `credential_url`).

3. **Job Vacancies & Bookmarks**:
   - `jobs`: Added `tags` (JSONB), `benefits` (JSONB), `views_count`.
   - `saved_jobs`: Created relational table for saved user bookmarks with `UniqueConstraint(user_id, job_id)`.

4. **File Upload Metadata**:
   - `file_uploads`: Created relational table storing `user_id`, `original_filename`, `stored_filename`, `folder`, `mime_type`, `file_size`, `storage_path`, `url`.

5. **AI Consultant & Generated Content**:
   - `ai_chat_sessions`: Created table for AI session management.
   - `ai_messages`: Created table for storing prompt and response history (`role`, `content`).
   - `ai_generated_cvs`: Created table for saving AI-generated CVs (`user_id`, `title`, `prompt`, `cv_text`).

6. **Company Profiles & Audit Logs**:
   - `companies`: Added `address`, `contact_email`, `contact_phone`, `employee_count`, `inn` index.
   - `audit_logs`: Created table for platform administration and security tracking.
