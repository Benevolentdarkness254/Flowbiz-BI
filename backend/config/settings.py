# backend/config/settings.py
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI        = os.environ['DATABASE_URL']
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS      = {
        'pool_pre_ping': True,
        'pool_recycle':  3600,
    }
    JWT_SECRET_KEY             = os.environ['JWT_SECRET_KEY']
    JWT_TOKEN_LOCATION         = ['cookies']
    JWT_COOKIE_SECURE          = os.environ.get('JWT_COOKIE_SECURE', 'False') == 'True'
    JWT_COOKIE_CSRF_PROTECT    = os.environ.get('JWT_COOKIE_CSRF_PROTECT', 'False') == 'True'
    JWT_ACCESS_TOKEN_EXPIRES   = False
    # This is required for cookies to work in the Flask test client
    JWT_COOKIE_SAMESITE        = os.environ.get('JWT_COOKIE_SAMESITE', 'Lax')


class TestingConfig(Config):
    TESTING                    = True
    JWT_COOKIE_SECURE          = False
    JWT_COOKIE_CSRF_PROTECT    = False
    JWT_COOKIE_SAMESITE        = 'Lax'
    SQLALCHEMY_DATABASE_URI    = os.environ.get(
        'DATABASE_URL',
        'mysql+pymysql://flowbiz_user:FlowbizPOC2024!@127.0.0.1:3306/flowbiz_test?charset=utf8mb4'
    )