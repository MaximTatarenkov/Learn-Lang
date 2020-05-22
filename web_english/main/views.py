from flask import render_template, jsonify, send_from_directory
from flask_login import login_required

from config import Config
from web_english.models import Content, Word
from web_english.text.maping_text import create_name, Recognizer


def index():
    return render_template("main/index.html")


@login_required
def learning(text_id):
    content = Content.query.filter(Content.id == text_id).first()
    return render_template("main/learning.html", content=content, title=f'{content.title_text} | Learn Lang')


@login_required
def send_excerpts_sentences_murkups(text_id):
    content = Content.query.filter(Content.id == text_id).first()
    recognizer = Recognizer(content.title_text)
    excerpts = recognizer.compose_excerpts_for_sending(text_id)
    punctuations_time = recognizer.find_punctuations_time(excerpts)
    translations = recognizer.compose_translation_markup(text_id)
    sentences_ru = recognizer.split_text_by_sentences(content.text_ru)
    excerpts_for_sentences = recognizer.compose_sentences_for_visualization(
        excerpts)
    excerpts_for_text = recognizer.compose_excerpts_for_text(
        excerpts_for_sentences)
    sending = {
        "translation_markup": translations,
        "excerpts_for_text": excerpts_for_text,
        "punctuations_time": punctuations_time,
        "sentences_ru": sentences_ru,
        "excerpts_for_sentences": excerpts_for_sentences
    }
    return jsonify(sending)


@login_required
def send_word(word):
    current_word = Word.query.filter_by(word=word).first()
    translations_for_click = current_word.translations_for_click
    return jsonify(translations_for_click)


@login_required
def serve_audio(text_id):
    content = Content.query.get(text_id)
    filename = f"{create_name(content.title_text)}.mp3"
    return send_from_directory(Config.UPLOADED_AUDIOS_DEST, filename)


@login_required
def text_list_for_student():
    title = 'Тексты для изучения | Learn Lang'
    contents = Content.query.filter_by(status=Content.DONE).all()
    return render_template(
        'main/texts_for_listening.html',
        title=title,
        contents=contents
    )
