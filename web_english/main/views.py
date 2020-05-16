from flask import render_template, jsonify, send_from_directory
from flask_login import login_required

from config import Config
from web_english.models import Content, Translation
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
    excerpts_for_sending = recognizer.compose_excerpts_for_sending(text_id)
    punctuations_time = recognizer.find_punctuations_time(excerpts_for_sending)
    translations = compose_translation_markup(text_id)
    sentences_en = split_text_by_sentences(content.text_en)
    sentences_ru = split_text_by_sentences(content.text_ru)
    sending = {
        "translation_markup": translations,
        "chunks_for_sending": excerpts_for_sending,
        "punctuations_time": punctuations_time,
        "sentences_en": sentences_en,
        "sentences_ru": sentences_ru,
    }
    return jsonify(sending)


def compose_translation_markup(text_id):
    markups = Translation.query.filter_by(text_id=text_id).all()
    translation_markup = []
    for markup in markups:
        translation_markup.append({"sentence": markup.sentence,
                                   "in_en": markup.in_en_sentence,
                                   "in_ru": markup.in_ru_sentence})
    return translation_markup


def split_text_by_sentences(text):
    punctuation = [".", "!", "?", ";"]
    for i in punctuation:
        changed_text = text.replace(i, f"{i}|")
        text = changed_text
    split_text_by_sentences = text.split("| ")
    for id, item in enumerate(split_text_by_sentences):
        split_text_by_sentences[id] = item.replace("|", "").split()
    return split_text_by_sentences


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
