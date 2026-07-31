from app.modules.materials.infra.deepseek import (
    DeepSeekClient,
    DeepSeekOcrGateway,
    DeepSeekStructureGateway,
)
from app.modules.materials.infra.document_parser import LocalDocumentParser
from app.modules.materials.infra.local_repository import SqliteMaterialRepository
from app.modules.materials.infra.local_runtime import (
    LocalObjectStore,
    SystemClock,
    UuidGenerator,
    calculate_sha256,
)
from app.modules.materials.infra.security_scanner import LocalMaterialSecurityScanner

__all__ = [
    "DeepSeekOcrGateway",
    "DeepSeekStructureGateway",
    "DeepSeekClient",
    "LocalDocumentParser",
    "LocalMaterialSecurityScanner",
    "LocalObjectStore",
    "SqliteMaterialRepository",
    "SystemClock",
    "UuidGenerator",
    "calculate_sha256",
]
