import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.environ.get("WEB_ENGLISH_SECRET_KEY")

    # Database configuration
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Upload Audio configuration
    UPLOADED_AUDIOS_DEST = f"{BASE_DIR}/web_english/text/uploads/audio"

    # Send Email configuration
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER")
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")
    MAIL_SERVER = "smtp.yandex.ru"
    MAIL_PORT = 465
    MAIL_USE_SSL = True

    # Celery configuration
    CELERY_BROKER_URL = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND = "redis://localhost:6379/0"

    # Yandex SpeechKit configuration
    FOLDER_ID = os.environ.get("FOLDER_ID_YANDEX")
    API_KEY = os.environ.get("API_KEY_YANDEX")

    # 3000 - это интервал в 3 секунды распознования текста. К этому числу мы будем
    # привязывать слова в оригинальном тексте.
    INTERVAL = 3 * 1000

    JSON_AS_ASCII = False


class DevConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(BASE_DIR, "dev.db")


class ProductionConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(BASE_DIR, "database.db")


class TestConfig(Config):
    TESTING = True
