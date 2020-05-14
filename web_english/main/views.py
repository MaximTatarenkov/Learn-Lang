from flask import render_template, jsonify, send_from_directory
from flask_login import login_required

from config import Config
from web_english.models import Content, Chunk, Translation
from web_english.text.maping_text import create_name


def index():
    return render_template("main/index.html")


@login_required
def learning(text_id):
    text = Content.query.filter(Content.id == text_id).first()
    return render_template("main/learning.html", text=text, title=f'{text.title_text} | Learn Lang')


@login_required
def send_chunks(text_id):
    text = Content.query.filter(Content.id == text_id).first()
    chunks = Chunk.query.filter(Chunk.content_id == text_id).all()
    split_text = text.text_en.split()
    word_number_start = 0
    word_number_end = 0
    chunks_for_sending = []
    for chunk in chunks:
        word_number_start = word_number_end
        word_number_end = chunk.word_number + 1
        split_chunk = split_text[word_number_start:word_number_end]
        join_chunk = " ".join(split_chunk)
        chunks_for_sending.append(join_chunk)
    translations = translation_markup(text_id)
    sentences_en = split_text_by_sentences(text.text_en)
    sentences_ru = split_text_by_sentences(text.text_ru)
    sending = {
        "translation_markup": translations,
        "chunks_for_sending": chunks_for_sending,
        "sentences_en": sentences_en,
        "sentences_ru": sentences_ru,
    }
    return jsonify(sending)


def translation_markup(text_id):
    markups = Translation.query.filter_by(text_id=text_id).all()
    translation_markup = []
    # count = 0
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
    text = Content.query.get(text_id)
    filename = f"{create_name(text.title_text)}.mp3"
    return send_from_directory(Config.UPLOADED_AUDIOS_DEST, filename)


@login_required
def text_list_for_student():
    title = 'Тексты для изучения | Learn Lang'
    texts = Content.query.filter_by(status=Content.DONE).all()
    return render_template(
        'main/texts_for_listening.html',
        title=title,
        texts=texts
    )
