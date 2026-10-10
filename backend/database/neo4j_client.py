"""Backward-compatible accessors for the configured graph store."""

from backend.graph_store import get_graph_store


def verify_connection() -> bool:
    get_graph_store().verify()
    return True


def get_driver():
    return get_graph_store()


def get_database() -> str:
    return get_graph_store().database


def close_driver() -> None:
    get_graph_store().close()
