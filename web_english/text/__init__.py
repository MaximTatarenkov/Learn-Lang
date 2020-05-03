from flask import Blueprint

bp = Blueprint("text", __name__)

from web_english.text import routes
