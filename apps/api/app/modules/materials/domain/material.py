from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class UploadedMaterialRecord:
    id: str
    user_id: str
    file_name: str
    category: str
    content_type: str
    file_type: str
    size_bytes: int
    stored_path: str
    status: str
    uploaded_by: str
    created_at: str
    updated_at: str
    course: str | None = None
    extracted_text: str = ""
    extracted_node_count: int = 0
    candidates_created: int = 0
    failure_reason: str | None = None
    parser_version: str | None = None
    parse_strategy: str | None = None
    parsed_artifact_json: str = "{}"


@dataclass(frozen=True, slots=True)
class MaterialVersionRecord:
    id: str
    material_id: str
    user_id: str
    version_no: int
    file_name: str
    file_type: str
    size_bytes: int
    storage_uri: str
    checksum: str
    created_at: str
    parser_version: str | None = None
    parse_strategy: str | None = None
    parsed_artifact_json: str = "{}"
