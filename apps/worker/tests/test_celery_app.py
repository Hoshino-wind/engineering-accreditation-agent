from worker_app.celery_app import celery_app


def test_system_ping_task_is_registered() -> None:
    celery_app.loader.import_default_modules()
    assert "system.ping" in celery_app.tasks
