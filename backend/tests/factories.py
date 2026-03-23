# backend/tests/factories.py
import uuid
import factory
from factory.alchemy import SQLAlchemyModelFactory
from werkzeug.security import generate_password_hash
from app.extensions import db
from app.models.auth     import User, Role
from app.models.sales    import Customer, SaleTransaction, SaleItem
from app.models.inventory import Product
from app.models.enums    import (
    CustomerType, ProductCategory, PaymentMethod, PaymentStatus
)


def unique_str(prefix=''):
    """Generate a unique string using uuid to avoid duplicate key errors."""
    return f'{prefix}{uuid.uuid4().hex[:8]}'


class RoleFactory(SQLAlchemyModelFactory):
    class Meta:
        model              = Role
        sqlalchemy_session = db.session

    # Use uuid suffix to avoid collisions with seeded roles
    role_name   = factory.LazyFunction(lambda: unique_str('test_role_'))
    description = 'Test role'
    is_active   = True


class UserFactory(SQLAlchemyModelFactory):
    class Meta:
        model              = User
        sqlalchemy_session = db.session

    username      = factory.LazyFunction(lambda: unique_str('user_'))
    email         = factory.LazyAttribute(lambda o: f'{o.username}@flowbiz.test')
    full_name     = factory.LazyFunction(lambda: f'Test User {unique_str()}')
    password_hash = factory.LazyFunction(
        lambda: generate_password_hash('password123')
    )
    is_active     = True
    role          = factory.SubFactory(RoleFactory)


class CustomerFactory(SQLAlchemyModelFactory):
    class Meta:
        model              = Customer
        sqlalchemy_session = db.session

    name          = factory.LazyFunction(lambda: f'Customer {unique_str()}')
    customer_type = CustomerType.WALK_IN
    phone         = '+254700000000'
    is_active     = True


class ProductFactory(SQLAlchemyModelFactory):
    class Meta:
        model              = Product
        sqlalchemy_session = db.session

    # uuid suffix ensures no duplicate SKU errors across tests
    sku             = factory.LazyFunction(lambda: unique_str('SKU-'))
    name            = factory.LazyFunction(lambda: f'Product {unique_str()}')
    # Use .value to pass the string MySQL expects, not the enum member name
    category        = factory.LazyFunction(
        lambda: ProductCategory.PACKAGED_WATER.value
    )
    unit_of_measure = '20L'
    price           = 50.00
    current_stock   = 100
    min_stock_level = 10
    reorder_qty     = 50
    is_active       = True
    is_refill       = False
    container_deposit = 0.00