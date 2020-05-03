from getpass import getpass
import sys
from web_english.models import Role, User
from web_english.db import db


def register(app):

    @app.cli.command("init-roles")
    def init_roles():
        """
        Создаёт три базовые роли пользователей - админ, ученик и контентмейкер
        если их ещё нет.
        """
        existing_roles = [role.name.lower() for role in Role.query.all()]
        basic_roles = ['admin', 'student', 'contentmaker']
        for role in basic_roles:
            if role not in existing_roles:
                print(f"create role {role}")
                new_role = Role(name=role)
                db.session.add(new_role)
                db.session.commit()

    @app.cli.command("create-admin")
    def create_admin():
        admin_role = Role.query.filter_by(name='admin').one_or_none()
        if admin_role is None:
            print("Роль admin не найдена. Создайте базовые роли с помощью команды init-roles")
            sys.exit(0)

        username = input("Введите имя: ")
        if User.query.filter(User.username == username).count():
            print("Пользователь с таким именем уже есть.")
            sys.exit(0)

        password = getpass("Введите пароль: ")
        password2 = getpass("Повторите пароль: ")
        if password != password2:
            print("Пароль повторён неверно.")
            sys.exit(0)

        email = input("Введите e-mail: ")
        if User.query.filter(User.email == email).count():
            print("Этот e-mail уже используется.")
            sys.exit(0)

        new_user = User(
            username=username,
            password=password,
            email=email,
            is_email_confirmed=True
            )

        new_user.roles.append(admin_role)
        db.session.add(new_user)
        db.session.commit()
        print(f"Создан новый пользователь {new_user.username} id={new_user.id}")
