from functools import wraps
from flask_login import current_user
from flask import abort


def roles_required(*roles):
    """
    Декоратор, проверяющий, есть ли у пользователя любая роль
    из списка, если нет, то выдаёт 403 ошибку.

    Декоратор не проверяет, залогинен ли пользователь, поэтому
    перед ним нужно ставить декоратор @login_required.
    """
    def decorator(view_function):
        @wraps(view_function)
        def wrapper(*args, **kwargs):
            can_access = False
            for role in [role.name for role in current_user.roles]:
                if role in roles:
                    can_access = True
                    break
            if not can_access:
                abort(403)
            return view_function(*args, **kwargs)
        return wrapper
    return decorator
