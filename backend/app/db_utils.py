"""Common MongoDB utilities."""


def clean(doc: dict | None) -> dict:
    """Convert MongoDB doc to API-friendly dict: _id -> id."""
    if not doc:
        return {}
    doc["id"] = str(doc.pop("_id"))
    return doc
