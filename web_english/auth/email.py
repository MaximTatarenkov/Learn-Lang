from flask import render_template
from web_english.email import send_email


def send_password_reset_email(user):
    token = user.get_token()
    send_email.delay('[WE] Сброс пароля',
                     recipients=[user.email],
                     html_body=render_template('email/reset_password.html',
                                               user=user, token=token))


def send_verification_email(user):
    token = user.get_token(expires_in=600)
    send_email.delay('[WE] Подтверждение почты',
                     recipients=[user.email],
                     html_body=render_template('email/ver_email.html',
                                               user=user, token=token))
