# google-drive-list-folders

Lists top-level Google Drive folders for the authenticated user.

- Auth required (Authorization: Bearer <supabase_jwt>)
- Uses stored refresh token from `google_connections`
- Returns: `{ success: true, folders: [{ id, name }] }`
- Errors: 401 (invalid session or expired Google access), 403 (Drive API disabled), 404 (no connection), 500 (server)
