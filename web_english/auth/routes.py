from web_english.auth import bp
from web_english.auth import views


bp.add_url_rule("/login", "login", views.login)
bp.add_url_rule("/process-login", "process_login", views.process_login,
                methods=["POST"])
bp.add_url_rule("/register", "register", views.register)
bp.add_url_rule("/process-register", "process_register",
                views.process_register, methods=["POST"])
bp.add_url_rule("/logout", "logout", views.logout)
bp.add_url_rule("/reset_password_request", "reset_password_request",
                views.reset_password_request, methods=["GET", "POST"])
bp.add_url_rule("/reset_password<token>", "reset_password",
                views.reset_password, methods=["GET", "POST"])
bp.add_url_rule("/ver_email<token>", "ver_email", views.ver_email, methods=["GET", "POST"])
