import cloudinary
import cloudinary.uploader
from app.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)


def upload_file(file_bytes: bytes, filename: str, folder: str = "workmate") -> dict:
    """Upload to Cloudinary, return {url, public_id}."""
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=folder,
        resource_type="auto",
        use_filename=True,
        unique_filename=True,
        quality="auto",
        fetch_format="auto",
    )
    return {"url": result["secure_url"], "public_id": result["public_id"]}


def delete_file(public_id: str):
    cloudinary.uploader.destroy(public_id, resource_type="auto")
