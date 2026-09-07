"""
Google Drive service — OAuth2 with refresh token.
Run scripts/setup_gdrive.py once to populate GOOGLE_REFRESH_TOKEN in .env.
"""
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from app.config import settings
import io

SCOPES = ["https://www.googleapis.com/auth/drive.file"]

# ponytail: simple in-memory folder ID cache — restarts clear it, fine for our upload volume
_folder_cache: dict[str, str] = {}


def _get_service():
    creds = Credentials(
        token=None,
        refresh_token=settings.GOOGLE_REFRESH_TOKEN,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
    )
    creds.refresh(Request())
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def _get_or_create_folder(service, name: str, parent_id: str = None) -> str:
    key = f"{parent_id}/{name}"
    if key in _folder_cache:
        return _folder_cache[key]

    q = f"name='{name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    if parent_id:
        q += f" and '{parent_id}' in parents"

    results = service.files().list(q=q, fields="files(id)", spaces="drive").execute()
    files = results.get("files", [])

    if files:
        folder_id = files[0]["id"]
    else:
        meta = {"name": name, "mimeType": "application/vnd.google-apps.folder"}
        if parent_id:
            meta["parents"] = [parent_id]
        folder = service.files().create(body=meta, fields="id").execute()
        folder_id = folder["id"]

    _folder_cache[key] = folder_id
    return folder_id


def upload_file(file_bytes: bytes, filename: str, project_name: str, task_id: str) -> dict:
    """Upload to Workmate/Projects/{project}/Tasks/{task_id}/, return {url, file_id}."""
    service = _get_service()

    root = _get_or_create_folder(service, "Workmate")
    projects = _get_or_create_folder(service, "Projects", root)
    project_folder = _get_or_create_folder(service, project_name, projects)
    tasks = _get_or_create_folder(service, "Tasks", project_folder)
    task_folder = _get_or_create_folder(service, task_id, tasks)

    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype="application/octet-stream", resumable=False)
    file_meta = {"name": filename, "parents": [task_folder]}
    uploaded = service.files().create(body=file_meta, media_body=media, fields="id").execute()
    file_id = uploaded["id"]

    # Make publicly readable
    service.permissions().create(
        fileId=file_id,
        body={"type": "anyone", "role": "reader"},
    ).execute()

    url = f"https://drive.google.com/file/d/{file_id}/view"
    return {"url": url, "file_id": file_id}


def delete_file(file_id: str):
    try:
        _get_service().files().delete(fileId=file_id).execute()
    except Exception:
        pass
