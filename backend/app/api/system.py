# backend/app/api/system.py
"""
System-level API endpoints:
- Audit trail: read-only access to the audit_log table
- Backups: trigger and list database backups
- Settings: read/update system configuration
- System logs: read application log entries

All endpoints require system-level permissions.
"""

import os
import json
from datetime import datetime
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import text
from app.extensions import db
from app.api.decorators import require_permission

system_bp = Blueprint("system", __name__)


# ============================================================
# AUDIT TRAIL
# ============================================================


@system_bp.get("/audit")
@require_permission("system.audit")
def list_audit_logs():
    """
    List audit log entries with pagination and optional filtering.
    Query params: page, per_page, table_name, user_id, action
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)

    # Build base query with optional filters
    query = "SELECT * FROM audit_log WHERE 1=1"
    params = {}

    table_name = request.args.get("table_name")
    if table_name:
        query += " AND table_name = :table_name"
        params["table_name"] = table_name

    action = request.args.get("action")
    if action:
        query += " AND action = :action"
        params["action"] = action

    user_id = request.args.get("user_id", type=int)
    if user_id:
        query += " AND user_id = :user_id"
        params["user_id"] = user_id

    query += " ORDER BY created_at DESC"

    # Count total for pagination
    count_query = f"SELECT COUNT(*) FROM ({query}) AS t"
    total = db.session.execute(text(count_query), params).scalar()

    # Add pagination
    query += " LIMIT :limit OFFSET :offset"
    params["limit"] = per_page
    params["offset"] = (page - 1) * per_page

    result = db.session.execute(text(query), params)
    logs = [dict(row._mapping) for row in result]

    # Convert datetime objects to ISO strings for JSON serialization
    for log in logs:
        if log.get("created_at"):
            log["created_at"] = log["created_at"].isoformat()

    return jsonify(
        logs=logs,
        total=total,
        page=page,
        pages=(total + per_page - 1) // per_page,
    )


@system_bp.get("/audit/tables")
@require_permission("system.audit")
def audit_tables():
    """Return a list of distinct table names in the audit log."""
    result = db.session.execute(
        text("SELECT DISTINCT table_name FROM audit_log ORDER BY table_name")
    )
    tables = [row[0] for row in result]
    return jsonify(tables=tables)


# ============================================================
# BACKUPS
# ============================================================


@system_bp.get("/backups")
@require_permission("system.backup")
def list_backups():
    """
    List available backup files from the backup directory.
    Returns metadata about each backup file (name, size, date).
    """
    backup_dir = current_app.config.get("BACKUP_DIR", "/tmp/flowbiz_backups")

    if not os.path.exists(backup_dir):
        return jsonify(backups=[], message="No backup directory configured")

    backups = []
    for filename in sorted(os.listdir(backup_dir), reverse=True):
        if filename.endswith(".sql") or filename.endswith(".sql.gz"):
            filepath = os.path.join(backup_dir, filename)
            stat = os.stat(filepath)
            backups.append(
                {
                    "filename": filename,
                    "size_bytes": stat.st_size,
                    "size_mb": round(stat.st_size / (1024 * 1024), 2),
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                }
            )

    return jsonify(backups=backups)


@system_bp.post("/backups")
@require_permission("system.backup")
def create_backup():
    """
    Trigger a database backup using mysqldump.
    Creates a timestamped .sql file in the backup directory.

    NOTE: This is a POC implementation. In production, use a proper
    backup strategy with encryption, offsite storage, and rotation.
    """
    import subprocess

    backup_dir = current_app.config.get("BACKUP_DIR", "/tmp/flowbiz_backups")
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"flowbiz_backup_{timestamp}.sql"
    filepath = os.path.join(backup_dir, filename)

    # Extract database connection info from the DATABASE_URL
    db_uri = current_app.config.get("SQLALCHEMY_DATABASE_URI", "")
    # Parse: mysql+pymysql://user:pass@host:port/dbname
    try:
        from urllib.parse import urlparse

        parsed = urlparse(db_uri.replace("mysql+pymysql://", "mysql://"))
        db_user = parsed.username
        db_pass = parsed.password
        db_host = parsed.hostname
        db_port = parsed.port or 3306
        db_name = parsed.path.lstrip("/")
    except Exception:
        return jsonify(error="Could not parse database URI"), 500

    try:
        # Run mysqldump to create the backup
        cmd = [
            "mysqldump",
            f"--user={db_user}",
            f"--password={db_pass}",
            f"--host={db_host}",
            f"--port={db_port}",
            "--single-transaction",
            "--routines",
            "--triggers",
            db_name,
        ]

        with open(filepath, "w") as f:
            result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, timeout=300)

        if result.returncode != 0:
            # Clean up failed backup file
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify(
                error="Backup failed",
                details=result.stderr.decode("utf-8", errors="replace"),
            ), 500

        file_size = os.path.getsize(filepath)
        return jsonify(
            message="Backup created successfully",
            filename=filename,
            size_mb=round(file_size / (1024 * 1024), 2),
        )

    except FileNotFoundError:
        return jsonify(
            error="mysqldump not found on this system",
            message="Install MySQL client tools to enable backups",
        ), 500
    except subprocess.TimeoutExpired:
        return jsonify(error="Backup timed out after 5 minutes"), 500
    except Exception as e:
        return jsonify(error=str(e)), 500


@system_bp.delete("/backups/<filename>")
@require_permission("system.backup")
def delete_backup(filename):
    """Delete a backup file. Prevents directory traversal attacks."""
    # Sanitize filename to prevent directory traversal
    safe_name = os.path.basename(filename)
    if not safe_name.endswith(".sql") and not safe_name.endswith(".sql.gz"):
        return jsonify(error="Invalid backup filename"), 400

    backup_dir = current_app.config.get("BACKUP_DIR", "/tmp/flowbiz_backups")
    filepath = os.path.join(backup_dir, safe_name)

    if not os.path.exists(filepath):
        return jsonify(error="Backup file not found"), 404

    os.remove(filepath)
    return jsonify(message=f"Backup {safe_name} deleted")


# ============================================================
# SETTINGS
# ============================================================

# In-memory settings store for POC — replace with a database table in production
_SYSTEM_SETTINGS = {
    "company_name": "Flowbiz Water",
    "company_kra_pin": "",
    "company_address": "",
    "company_phone": "",
    "tax_rate": "0.16",
    "currency": "KES",
    "mpesa_enabled": False,
    "sms_enabled": False,
    "kra_etims_enabled": False,
    "low_stock_threshold_default": 10,
    "auto_backup_enabled": False,
    "kra_submission_mode": "auto",  # auto or manual
    # Zone-based ETA estimates (minutes) for delivery time calculation
    "zone_eta": {
        "Zone A": 30,
        "Zone B": 45,
        "Zone C": 60,
        "Zone D": 90,
        "default": 45,
    },
}


def get_zone_eta(zone):
    """
    Look up the estimated delivery time in minutes for a given zone.
    Falls back to the default if the zone is not configured.
    """
    zone_map = _SYSTEM_SETTINGS.get("zone_eta", {})
    return zone_map.get(zone, zone_map.get("default", 45))


@system_bp.get("/settings")
@require_permission("system.config")
def get_settings():
    """Return all system settings."""
    return jsonify(settings=_SYSTEM_SETTINGS)


@system_bp.patch("/settings")
@require_permission("system.config")
def update_settings():
    """
    Update one or more system settings.
    Only known settings keys can be modified.
    """
    data = request.get_json() or {}
    updated = {}

    for key, value in data.items():
        if key in _SYSTEM_SETTINGS:
            # Type coercion for known boolean and numeric settings
            if key in (
                "mpesa_enabled",
                "sms_enabled",
                "kra_etims_enabled",
                "auto_backup_enabled",
            ):
                _SYSTEM_SETTINGS[key] = bool(value)
            elif key in ("tax_rate", "low_stock_threshold_default"):
                _SYSTEM_SETTINGS[key] = float(value)
            elif key == "zone_eta" and isinstance(value, dict):
                _SYSTEM_SETTINGS[key] = value
            else:
                _SYSTEM_SETTINGS[key] = value
            updated[key] = _SYSTEM_SETTINGS[key]

    return jsonify(message="Settings updated", updated=updated)


# ============================================================
# SYSTEM LOGS
# ============================================================


@system_bp.get("/logs")
@require_permission("system.logs")
def get_system_logs():
    """
    Return recent application log entries.
    Reads from the Flask log file if it exists.
    Query params: lines (default 200), level (filter by level)
    """
    log_file = current_app.config.get("LOG_FILE", "flask.log")
    lines_count = request.args.get("lines", 200, type=int)
    level_filter = request.args.get("level")

    if not os.path.exists(log_file):
        return jsonify(logs=[], message="No log file found")

    try:
        with open(log_file, "r") as f:
            all_lines = f.readlines()

        # Get the most recent lines
        recent = all_lines[-lines_count:] if len(all_lines) > lines_count else all_lines

        logs = []
        for line in recent:
            line = line.strip()
            if not line:
                continue
            # Apply level filter if specified
            if level_filter and level_filter.upper() not in line.upper():
                continue
            logs.append(line)

        return jsonify(
            logs=logs,
            total=len(logs),
            log_file=log_file,
        )

    except Exception as e:
        return jsonify(error=str(e)), 500
