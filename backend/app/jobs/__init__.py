# backend/app/jobs/__init__.py
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron         import CronTrigger


def init_scheduler(app):
    """
    Register all background jobs and start the scheduler.
    Called from create_app() only when not in testing mode.

    Job schedule:
    - dim_date_seeder: runs once at startup to ensure date dimension is populated
    - bi_aggregator:   runs at 00:05 daily to aggregate yesterday's sales into fact tables
    - kra_submitter:   runs every 15 minutes to retry failed KRA eTIMS submissions
    - stock_checker:   runs every 30 minutes to scan for low stock and create alerts
    """
    from .dim_date_seeder import seed_dim_date
    from .bi_aggregator   import aggregate_daily_sales
    from .kra_submitter   import submit_pending_invoices
    from .stock_checker   import check_stock_levels

    scheduler = BackgroundScheduler()

    # Seed dim_date once at startup (the function checks internally if already seeded)
    with app.app_context():
        seed_dim_date(app)

    # Nightly BI aggregation — 5 minutes past midnight to ensure day boundary passed
    scheduler.add_job(
        lambda: aggregate_daily_sales(app),
        CronTrigger(hour=0, minute=5),
        id='bi_aggregator',
        replace_existing=True,
    )

    # KRA retry queue — every 15 minutes
    scheduler.add_job(
        lambda: submit_pending_invoices(app),
        CronTrigger(minute='*/15'),
        id='kra_submitter',
        replace_existing=True,
    )

    # Stock alerts — every 30 minutes
    scheduler.add_job(
        lambda: check_stock_levels(app),
        CronTrigger(minute='*/30'),
        id='stock_checker',
        replace_existing=True,
    )

    scheduler.start()
    app.logger.info('Background scheduler started')