# backend/app/api/__init__.py

# This file marks the api/ directory as a Python package.
# Blueprint registration happens in app/__init__.py inside create_app()
# rather than here — this keeps all wiring in one place and avoids
# circular imports that would happen if blueprints imported from each
# other through this file.