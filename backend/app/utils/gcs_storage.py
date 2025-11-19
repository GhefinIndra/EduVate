"""
Google Cloud Storage utility functions for document storage
"""
import os
from google.cloud import storage
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Initialize GCS client
def get_gcs_client():
    """Get authenticated GCS client using service account key or default credentials"""
    try:
        # Try to use service account key (for local development)
        key_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "gcs-key.json")

        if os.path.exists(key_path):
            # Local development with service account key
            client = storage.Client.from_service_account_json(key_path)
            logger.info("GCS client initialized with service account key")
        else:
            # Cloud Run with default credentials (Workload Identity)
            client = storage.Client()
            logger.info("GCS client initialized with default credentials")

        return client
    except Exception as e:
        logger.error(f"Failed to initialize GCS client: {str(e)}")
        raise

def get_bucket():
    """Get the GCS bucket for document storage"""
    client = get_gcs_client()
    bucket = client.bucket(settings.GCS_BUCKET_NAME)
    return bucket

def upload_file_to_gcs(local_file_path: str, destination_blob_name: str) -> str:
    """
    Upload a file to GCS bucket

    Args:
        local_file_path: Path to local file
        destination_blob_name: Name for the blob in GCS (e.g., "documents/abc123.pdf")

    Returns:
        Public URL of uploaded file (if public) or blob name
    """
    try:
        bucket = get_bucket()
        blob = bucket.blob(destination_blob_name)

        # Upload file
        blob.upload_from_filename(local_file_path)

        logger.info(f"File {local_file_path} uploaded to {destination_blob_name}")

        # Return blob name (we'll use signed URLs for access)
        return destination_blob_name

    except Exception as e:
        logger.error(f"Failed to upload file to GCS: {str(e)}")
        raise

def download_file_from_gcs(blob_name: str, destination_file_path: str) -> str:
    """
    Download a file from GCS bucket

    Args:
        blob_name: Name of the blob in GCS
        destination_file_path: Local path to save the file

    Returns:
        Path to downloaded file
    """
    try:
        bucket = get_bucket()
        blob = bucket.blob(blob_name)

        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(destination_file_path), exist_ok=True)

        # Download file
        blob.download_to_filename(destination_file_path)

        logger.info(f"File {blob_name} downloaded to {destination_file_path}")
        return destination_file_path

    except Exception as e:
        logger.error(f"Failed to download file from GCS: {str(e)}")
        raise

def delete_file_from_gcs(blob_name: str) -> bool:
    """
    Delete a file from GCS bucket

    Args:
        blob_name: Name of the blob to delete

    Returns:
        True if successful
    """
    try:
        bucket = get_bucket()
        blob = bucket.blob(blob_name)

        # Delete blob
        blob.delete()

        logger.info(f"File {blob_name} deleted from GCS")
        return True

    except Exception as e:
        logger.error(f"Failed to delete file from GCS: {str(e)}")
        raise

def get_file_from_gcs(blob_name: str) -> bytes:
    """
    Get file content from GCS as bytes (for direct serving)

    Args:
        blob_name: Name of the blob in GCS

    Returns:
        File content as bytes
    """
    try:
        bucket = get_bucket()
        blob = bucket.blob(blob_name)

        # Download as bytes
        content = blob.download_as_bytes()

        logger.info(f"File {blob_name} retrieved from GCS")
        return content

    except Exception as e:
        logger.error(f"Failed to get file from GCS: {str(e)}")
        raise

def file_exists_in_gcs(blob_name: str) -> bool:
    """
    Check if a file exists in GCS bucket

    Args:
        blob_name: Name of the blob to check

    Returns:
        True if file exists, False otherwise
    """
    try:
        bucket = get_bucket()
        blob = bucket.blob(blob_name)
        return blob.exists()

    except Exception as e:
        logger.error(f"Failed to check file existence in GCS: {str(e)}")
        return False

def sync_chromadb_to_gcs(chroma_path: str) -> bool:
    """
    Sync ChromaDB folder to GCS bucket

    Args:
        chroma_path: Local path to ChromaDB folder

    Returns:
        True if successful
    """
    try:
        if not os.path.exists(chroma_path):
            logger.warning(f"ChromaDB path {chroma_path} does not exist, skipping sync")
            return False

        bucket = get_bucket()
        uploaded_count = 0

        # Upload all files in chroma_path recursively
        for root, dirs, files in os.walk(chroma_path):
            for file in files:
                local_file = os.path.join(root, file)
                # Create relative path for GCS blob
                relative_path = os.path.relpath(local_file, chroma_path)
                blob_name = f"chroma_db/{relative_path}".replace("\\", "/")

                blob = bucket.blob(blob_name)
                blob.upload_from_filename(local_file)
                uploaded_count += 1

        logger.info(f"ChromaDB synced to GCS: {uploaded_count} files uploaded")
        return True

    except Exception as e:
        logger.error(f"Failed to sync ChromaDB to GCS: {str(e)}")
        return False

def sync_chromadb_from_gcs(chroma_path: str) -> bool:
    """
    Download ChromaDB data from GCS to local folder

    Args:
        chroma_path: Local path to save ChromaDB data

    Returns:
        True if successful
    """
    try:
        bucket = get_bucket()

        # List all blobs with prefix chroma_db/
        blobs = bucket.list_blobs(prefix="chroma_db/")
        downloaded_count = 0

        for blob in blobs:
            # Skip if it's a folder marker
            if blob.name.endswith("/"):
                continue

            # Extract relative path (remove chroma_db/ prefix)
            relative_path = blob.name.replace("chroma_db/", "", 1)
            local_file = os.path.join(chroma_path, relative_path)

            # Create directory if needed
            os.makedirs(os.path.dirname(local_file), exist_ok=True)

            # Download file
            blob.download_to_filename(local_file)
            downloaded_count += 1

        if downloaded_count > 0:
            logger.info(f"ChromaDB synced from GCS: {downloaded_count} files downloaded")
            return True
        else:
            logger.info("No ChromaDB backup found in GCS")
            return False

    except Exception as e:
        logger.error(f"Failed to sync ChromaDB from GCS: {str(e)}")
        return False
