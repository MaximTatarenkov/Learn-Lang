from wtforms import BooleanField, StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, ValidationError, EqualTo, Email
from web_english.models import User
from web_english.generics.forms import GenericForm


class LoginForm(GenericForm):
    username = StringField("Имя пользователя", validators=[DataRequired()])
    password = PasswordField("Пароль", validators=[DataRequired()])
    remember_me = BooleanField('Запомнить меня', default=True, render_kw={
                               "class": "form-check-input"})
    submit = SubmitField("Вход", validators=[DataRequired()])


class RegisterForm(GenericForm):
    username = StringField("Имя пользователя", validators=[DataRequired()])
    first_name = StringField("Имя")
    last_name = StringField("Фамилия")
    email = StringField("e-mail", validators=[DataRequired(),
                                              Email("Неправильно введен Email")])
    password = PasswordField("Пароль", validators=[DataRequired(),
                                                   EqualTo("confirm", "Пароли должны быть одинаковы")])
    confirm = PasswordField("Повторите пароль", validators=[DataRequired()])
    submit = SubmitField("Отправить", validators=[DataRequired()])

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user is not None:
            raise ValidationError("Такой пользователь уже существует.")

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError("Такой Email уже используется.")


class ResetPasswordRequestForm(GenericForm):
    email = StringField("Email", validators=[DataRequired(),
                                             Email("Неправильно введен Email")])
    submit = SubmitField("Сбросить пароль")


class ResetPasswordForm(GenericForm):
    password = PasswordField("Пароль", validators=[DataRequired()])
    confirm = PasswordField("Повторите пароль", validators=[DataRequired(),
                                                            EqualTo("password", "Пароли должны быть одинаковы")])
    submit = SubmitField("Сбросить пароль")
