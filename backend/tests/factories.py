# backend/tests/factories.py
import factory
from factory.alchemy import SQLAlchemyModelFactory
from app.extensions import db
from app.models.auth     import User, Role
from app.models.sales    import Customer, SaleTransaction, SaleItem
from app.models.inventory import Product
from app.models.enums    import (
    CustomerType, ProductCategory, PaymentMethod, PaymentStatus
)
from werkzeug.security import generate_password_hash


class RoleFactory(SQLAlchemyModelFactory):
    class Meta:
        model    = Role
        sqlalchemy_session = db.session

    role_name   = factory.Sequence(lambda n: f'test_role_{n}')
    description = 'Test role'
    is_active   = True


class UserFactory(SQLAlchemyModelFactory):
    class Meta:
        model    = User
        sqlalchemy_session = db.session

    username      = factory.Sequence(lambda n: f'user_{n}')
    email         = factory.LazyAttribute(lambda o: f'{o.username}@flowbiz.test')
    full_name     = factory.Sequence(lambda n: f'Test User {n}')
    password_hash = factory.LazyFunction(lambda: generate_password_hash('password123'))
    is_active     = True
    role          = factory.SubFactory(RoleFactory)


class CustomerFactory(SQLAlchemyModelFactory):
    class Meta:
        model    = Customer
        sqlalchemy_session = db.session

    name          = factory.Sequence(lambda n: f'Customer {n}')
    customer_type = CustomerType.WALK_IN
    phone         = '+254700000000'
    is_active     = True


class ProductFactory(SQLAlchemyModelFactory):
    class Meta:
        model    = Product
        sqlalchemy_session = db.session

    sku             = factory.Sequence(lambda n: f'SKU-{n:04d}')
    name            = factory.Sequence(lambda n: f'Product {n}')
    category        = ProductCategory.PACKAGED_WATER
    unit_of_measure = '20L'
    price           = factory.LazyFunction(lambda: 50.00)
    current_stock   = 100
    min_stock_level = 10
    reorder_qty     = 50
    is_active       = True
    is_refill       = False