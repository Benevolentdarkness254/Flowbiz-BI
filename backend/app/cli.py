# backend/app/cli.py
import click
from flask import current_app
from app.extensions import db


def register_commands(app):
    """Register CLI commands with the Flask app."""

    @app.cli.command('seed-admin')
    def seed_admin_command():
        """Create the initial system_admin user."""
        from app.services.auth_service import seed_admin
        seed_admin()

    @app.cli.command('seed-dates')
    @click.option('--start', default=2024, type=int)
    @click.option('--end',   default=2030, type=int)
    def seed_dates_command(start, end):
        """Populate the dim_date dimension table."""
        from app.jobs.dim_date_seeder import seed_dim_date
        seed_dim_date(current_app, start_year=start, end_year=end)

    @app.cli.command('run-bi')
    def run_bi_command():
        """Manually trigger the BI aggregation job (useful for testing)."""
        from app.jobs.bi_aggregator import aggregate_daily_sales
        aggregate_daily_sales(current_app._get_current_object())
        click.echo('BI aggregation complete')