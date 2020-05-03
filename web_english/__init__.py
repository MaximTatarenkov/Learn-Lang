from celery import Celery
from flask import Flask
from flask_login import LoginManager
from flask_mail import Mail
from flask_migrate import Migrate
from flask_uploads import configure_uploads, UploadSet, AUDIO
from web_english.db import db
from web_english import error_handlers

from config import Config

migrate = Migrate()
login_manager = LoginManager()
audios = UploadSet('audios', AUDIO)
mail = Mail()
celery = Celery(__name__, broker=Config.CELERY_BROKER_URL)


def create_app(config):
    app = Flask(__name__)
    app.config.from_object(config)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    configure_uploads(app, audios)
    celery.conf.update(app.config)
    mail.init_app(app)
    import web_english.models as models
    from web_english.main import bp as main_bp
    from web_english.auth import bp as auth_bp
    from web_english.text import bp as text_bp
    error_handlers.register(app)
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(text_bp, url_prefix="/text")

    return app
