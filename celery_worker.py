import config
from web_english import celery, create_app


app = create_app(config.DevConfig)
app.app_context().push()
