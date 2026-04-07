from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db
from app.models.auth import User, Role


def authenticate(username: str, password: str) -> User | None:
    user = User.query.filter_by(username=username, deleted_at=None).first()
    if not user or not user.is_active:
        return None
    if not check_password_hash(user.password_hash, password):
        return None
    user.last_login_at = datetime.utcnow()
    db.session.commit()
    return user


def create_user(
    username: str,
    email: str,
    full_name: str,
    password: str,
    role_name: str,
    phone_number: str = None,
) -> User:
    if User.query.filter_by(username=username).first():
        raise ValueError(f"Username '{username}' is already taken. ")
    if User.query.filter_by(email=email).first():
        raise ValueError(f"Email '{email}' is already registered. ")
    role = Role.query.filter_by(role_name=role_name).first()
    if not role:
        raise ValueError(f"Role '{role}' does not exist")
    user = User(
        username=username,
        email=email,
        full_name=full_name,
        password_hash=generate_password_hash(password),
        role_id=role.role_id,
        phone=phone_number,
    )
    db.session.add(user)
    db.session.commit()
    return user


def seed_admin():
    if not User.query.filter_by(username="admin").first():
        create_user(
            username="admin",
            email="admin@flowbiz.local",
            full_name="System Administrator",
            password="FlowbizAdmin2024!",
            role_name="system_admin",
        )
        print("Admin user created : admin/FlowbizAdmin2024!")
    else:
        print("Admin User already exist")


def seed_all_users():
    """
    Create one demo user per role so permissions can be validated.
    All users share the same password for easy testing.
    """
    password = "FlowbizPOC2024!"
    users = [
        {
            "username": "admin",
            "email": "admin@flowbiz.local",
            "full_name": "System Administrator",
            "role": "system_admin",
            "phone": "+254700000000",
        },
        {
            "username": "owner",
            "email": "owner@flowbiz.local",
            "full_name": "Business Owner",
            "role": "business_owner",
            "phone": "+254700000001",
        },
        {
            "username": "sales1",
            "email": "sales1@flowbiz.local",
            "full_name": "Jane Sales",
            "role": "sales_staff",
            "phone": "+254700000002",
        },
        {
            "username": "inventory1",
            "email": "inventory1@flowbiz.local",
            "full_name": "John Inventory",
            "role": "inventory_staff",
            "phone": "+254700000003",
        },
        {
            "username": "driver1",
            "email": "driver1@flowbiz.local",
            "full_name": "Peter Driver",
            "role": "driver",
            "phone": "+254700000004",
        },
    ]

    for u in users:
        try:
            create_user(
                username=u["username"],
                email=u["email"],
                full_name=u["full_name"],
                password=password,
                role_name=u["role"],
                phone_number=u["phone"],
            )
            print(f"Created user: {u['username']} ({u['role']})")
        except ValueError as e:
            print(f"Skipped {u['username']}: {e}")
