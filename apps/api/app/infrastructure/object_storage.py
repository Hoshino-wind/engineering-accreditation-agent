"""S3-compatible object storage adapter used for original teaching materials."""

from __future__ import annotations

import asyncio

from app.core.config import Settings
from app.modules.resources.application.ports import ObjectStoragePort


class S3ObjectStorage:
    def __init__(
        self,
        *,
        endpoint: str,
        bucket: str,
        access_key: str,
        secret_key: str,
        region: str,
    ) -> None:
        import boto3

        self._bucket = bucket
        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
        )

    async def put(self, *, key: str, content: bytes, content_type: str | None) -> None:
        kwargs = {"Bucket": self._bucket, "Key": key, "Body": content}
        if content_type:
            kwargs["ContentType"] = content_type
        await asyncio.to_thread(self._client.put_object, **kwargs)


def build_object_storage(settings: Settings) -> ObjectStoragePort | None:
    required = (
        settings.object_storage_endpoint,
        settings.object_storage_bucket,
        settings.object_storage_access_key,
        settings.object_storage_secret_key.get_secret_value(),
    )
    if not all(required):
        return None
    return S3ObjectStorage(
        endpoint=settings.object_storage_endpoint,
        bucket=settings.object_storage_bucket,
        access_key=settings.object_storage_access_key,
        secret_key=settings.object_storage_secret_key.get_secret_value(),
        region=settings.object_storage_region,
    )
