# backend/app/jobs/dim_date_seeder.py
from datetime import date, timedelta
from app.extensions import db
from app.models.bi import DimDate


def seed_dim_date(app, start_year: int = 2024, end_year: int = 2030):
    """
    Populate the dim_date table with one row per day for the given year range.
    Run once at startup — skips if data already exists.
    This table must be populated before any BI fact jobs can run because
    fact_daily_sales has a FK to dim_date.date_id.
    """
    with app.app_context():
        existing_count = DimDate.query.count()
        if existing_count > 0:
            app.logger.info(f'dim_date already has {existing_count} rows — skipping seed')
            return

        app.logger.info(f'Seeding dim_date from {start_year} to {end_year}...')
        current = date(start_year, 1, 1)
        end     = date(end_year, 12, 31)
        rows    = []

        # Kenya public holidays (add more as needed)
        kenya_holidays = {
            date(2024, 1, 1):  "New Year's Day",
            date(2024, 5, 1):  "Labour Day",
            date(2024, 6, 1):  "Madaraka Day",
            date(2024, 10, 20): "Mashujaa Day",
            date(2024, 12, 12): "Jamhuri Day",
            date(2024, 12, 25): "Christmas Day",
            date(2024, 12, 26): "Boxing Day",
        }

        while current <= end:
            date_id = int(current.strftime('%Y%m%d'))
            rows.append(DimDate(
                date_id           = date_id,
                full_date         = current,
                day_of_week       = current.isoweekday(),   # 1=Monday, 7=Sunday
                day_name          = current.strftime('%A'),
                week_of_year      = current.isocalendar()[1],
                month_num         = current.month,
                month_name        = current.strftime('%B'),
                quarter           = (current.month - 1) // 3 + 1,
                year              = current.year,
                is_weekend        = current.isoweekday() >= 6,
                is_public_holiday = current in kenya_holidays,
                holiday_name      = kenya_holidays.get(current),
            ))
            current += timedelta(days=1)

        db.session.bulk_save_objects(rows)
        db.session.commit()
        app.logger.info(f'dim_date seeded with {len(rows)} rows')