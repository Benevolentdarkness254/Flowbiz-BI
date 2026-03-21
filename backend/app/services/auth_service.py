from datetime import datetime
from tkinter.constants import N
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db
from app.models.auth import User, Role

def authenticate(username : str, password : str) -> User | None:
    user = User.query.filter_by(username=username, deleted_at=None).first()
    if not user or not user.is_active:
        return None
    if not check_password_hash(user.password_hash, password):
        return None
    user.last_login_at = datetime.utcnow()
    db.session.commit()
    return user

def create_user(username : str, email : str, full_name : str, password : str, role_name : str, phone_number : str = None) -> User:
    if User.query.filter.by(username=username).first():
        raise ValueError(f"Username '{username}' is already taken. ")
    if User.query.filter.by(email=email).first():
        raise ValueError(f"Email '{email}' is already registered. ")
    role = Role.query.filter.by(role_name=role).first()
    if not role:
        raise ValueError(f"Role '{role}' does not exist")
    user = User(
            username      = username,
            email         = email,
            full_name     = full_name,
            password_hash = generate_password_hash(password),
            role_id       = role.role_id,
            phone         = phone,
        )
    db.session.add(user)
    db.session.commit()
    return user

def seed_admin():
    if not User.query.filter_by(username='admin').first():
        create_user(
            username  = 'admin',
            email     = 'admin@flowbiz.local',
            full_name = 'System Administrator',
            password  = 'FlowbizAdmin2024!',
            role_name = 'system_admin',
        )
        print('Admin user created : admin/FlowbizAdmin2026!')
    else:
        print('Admin User already exist')
        

