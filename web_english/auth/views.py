from flask import render_template, url_for, flash, redirect
from flask_login import login_user, logout_user
from web_english.auth.forms import LoginForm, RegisterForm, ResetPasswordRequestForm, ResetPasswordForm
from web_english.auth.email import send_password_reset_email, send_verification_email
from web_english.models import User, Role
from web_english import db


def login():
    title = "Авторизация | Learn Lang"
    form = LoginForm()
    return render_template(
        "auth/login.html",
        page_title=title,
        form=form,
        form_action=url_for("auth.process_login")
    )


def process_login():
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.check_password(form.password.data):
            if user.is_email_confirmed:
                login_user(user, remember=form.remember_me.data)
                flash("Вы вошли на сайт")
                return redirect(url_for("main.index"))
            flash("Вы не подтвердили почту")
            return redirect(url_for("main.index"))
    flash("Неправильное имя пользователя и/или пароль. Попробуйте ещё раз.")
    return redirect(url_for("auth.login"))


def register():
    title = "Регистрация | Learn Lang"
    form = RegisterForm()
    return render_template(
        "auth/register.html",
        page_title=title,
        form=form,
        form_action=url_for("auth.process_register")
    )


def process_register():
    form = RegisterForm()
    if not form.validate_on_submit():
        # Вытаскиваем ошибку при валидации из form.errors
        # и показываем ее пользователю
        error = list(form.errors.values())
        flash(error[0][0])
        return redirect(url_for("auth.register"))

    new_user = User(
        username=form.username.data,
        password=form.password.data,
        email=form.email.data,
        first_name=form.first_name.data,
        last_name=form.last_name.data,
    )
    default_user_role = Role.query.filter_by(name="student").one()
    new_user.roles.append(default_user_role)
    db.session.add(new_user)
    db.session.commit()
    send_verification_email(new_user)
    flash(
        f"Осталось подтвердить вашу почту. Инструкция была отправлена на {new_user.email}")
    return redirect(url_for("main.index"))


def ver_email(token):
    user = User.verify_token(token)
    if not user:
        flash("Подтвердить email не удалось")
        return redirect(url_for("main.index"))
    user.is_email_confirmed = True
    db.session.commit()
    login_user(user)
    return render_template("auth/ver_email.html")


def logout():
    logout_user()
    return redirect(url_for("main.index"))


def reset_password_request():
    form = ResetPasswordRequestForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user:
            send_password_reset_email(user)
        flash("Инструкция по восстановлению пароля отправлена на ваш email")
        return redirect(url_for("auth.login"))
    return render_template("auth/reset_password_request.html",
                           title="Сброс пароля | Learn Lang", form=form)


def reset_password(token):
    user = User.verify_token(token)
    if not user:
        return redirect(url_for("main.index"))
    form = ResetPasswordForm()
    if form.validate_on_submit():
        user.set_password(form.password.data)
        db.session.commit()
        flash("Ваш пароль был сброшен")
        return redirect(url_for("auth.login"))
    return render_template("auth/reset_password.html", form=form)
