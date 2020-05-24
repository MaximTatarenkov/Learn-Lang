from datetime import datetime
from flask import current_app
from flask_login import UserMixin

from sqlalchemy.ext.declarative import declared_attr
from time import time
from werkzeug.security import generate_password_hash, check_password_hash
import jwt

from web_english import db, login_manager

from sqlalchemy.dialects.postgresql import JSONB


class ServiceMixin:
    """
    Миксин, позволяющий отслеживать создание и изменение других моделей.
    Чтобы колонки миксина добавлялись в конец, объявляем их через declared_attr
    """
    @declared_attr
    def created_at(cls):
        return db.Column(db.DateTime, default=datetime.utcnow)

    @declared_attr
    def last_modified(cls):
        return db.Column(db.DateTime, default=datetime.utcnow,
                         onupdate=datetime.utcnow)


class User(UserMixin, db.Model, ServiceMixin):
    __tablename__ = "Users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True,
                         nullable=False)
    # хэш генерируется на before_insert
    password = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(64), unique=True, nullable=False)
    is_email_confirmed = db.Column(db.Boolean, default=False)
    first_name = db.Column(db.String(64))
    last_name = db.Column(db.String(64))
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    roles = db.relationship('Role', secondary='User_roles')

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def __str__(self):
        return f"<User {self.username}>"

    def get_token(self, expires_in=600):
        return jwt.encode(
            {'reset_password': self.id, 'exp': time() + expires_in},
            current_app.config['SECRET_KEY'], algorithm='HS256').decode('utf-8')

    @classmethod
    def verify_token(cls, token):
        try:
            id = jwt.decode(token, current_app.config['SECRET_KEY'],
                            algorithms=['HS256'])['reset_password']
        except:
            return
        return cls.query.get(id)


class Role(db.Model):
    __tablename__ = "Roles"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)

    def __repr__(self):
        return f"<Role {self.name}>"


class UserRoles(db.Model):
    __tablename__ = "User_roles"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer(), db.ForeignKey(
        'Users.id', ondelete='CASCADE'))
    role_id = db.Column(db.Integer(), db.ForeignKey(
        'Roles.id', ondelete='CASCADE'))


class Content(db.Model, ServiceMixin):
    QUEUED = 1
    PROCESSING = 2
    DONE = 3
    ERROR = 0

    id = db.Column(db.Integer, primary_key=True)
    title_text = db.Column(db.String, unique=True, nullable=False)
    text_en = db.Column(db.Text, unique=True, nullable=False)
    text_ru = db.Column(db.Text, unique=True, nullable=False)
    duration = db.Column(db.Integer)
    status = db.Column(db.Integer, default=QUEUED)
    chunks = db.relationship('Chunk', backref='content', lazy='dynamic')
    translation = db.relationship(
        'Translation', backref='content', lazy='dynamic')

    @property
    def is_ready(self):
        return self.status == Content.DONE

    @property
    def duration_for_humans(self):
        """
        Длительность звучания текста в формате мм:сс
        """
        MILLISECONDS_IN_SECOND = 1000
        SECONDS_PER_MINUTE = 60
        seconds = self.duration // MILLISECONDS_IN_SECOND
        minutes = seconds // SECONDS_PER_MINUTE
        formatted_minutes = str(minutes).zfill(2)
        formatted_seconds = str(seconds % SECONDS_PER_MINUTE).zfill(2)
        return f"{formatted_minutes}:{formatted_seconds}"

    def __repr__(self):
        return f"<Content {self.title_text}>"


class Chunk(db.Model, ServiceMixin):
    id = db.Column(db.Integer, primary_key=True)
    chunks_recognized = db.Column(db.Text)
    word = db.Column(db.String)
    word_number = db.Column(db.Integer)
    word_time = db.Column(db.Integer)
    content_id = db.Column(db.Integer, db.ForeignKey("content.id"))

    def __str__(self):
        return f"<Chunk {self.chunks_recognized}>"


class Word(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String, unique=True, nullable=False)
    # translation_word = db.Column(JSONB, nullable=False)
    translations_for_click = db.Column(JSONB, nullable=False)
    translations_for_highlight = db.Column(JSONB, nullable=False)

    def __repr__(self):
        return f"<Word {self.word}>"


class Translation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String, nullable=False)
    text_id = db.Column(db.Integer, db.ForeignKey("content.id"))
    sentence = db.Column(db.Integer)
    in_en_sentence = db.Column(db.String)
    in_ru_sentence = db.Column(db.String)

    def __repr__(self):
        return f"<Translation {self.word}>"


@login_manager.user_loader
def fetch_user(user_id):
    return User.query.get(user_id)


def generate_password_for_new_user(mapper, connection, target):
    target.password = generate_password_hash(target.password)


db.event.listen(User, 'before_insert', generate_password_for_new_user)
