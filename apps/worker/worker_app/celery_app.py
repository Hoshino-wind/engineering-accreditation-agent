from celery import Celery

from worker_app.settings import get_worker_settings

settings = get_worker_settings()

celery_app = Celery(
    "engineering_accreditation_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["worker_app.tasks.system"],
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Shanghai",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
)
