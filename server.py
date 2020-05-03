from web_english import create_app, cli
import config

app = create_app(config.DevConfig)
cli.register(app)
