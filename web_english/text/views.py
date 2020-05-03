import os
import os.path

from flask import render_template, url_for, redirect, flash, request, jsonify
from flask_login import login_required
from pydub import AudioSegment

from config import Config
from web_english.auth.helpers import roles_required
from web_english import db
from web_english.text.forms import TextForm, EditForm
from web_english.text.maping_text import Recognizer, create_name, recognition_start
from web_english.models import Content, Chunk
from web_english import audios


@login_required
@roles_required('admin', 'contentmaker')
def create():
    form = TextForm()
    return render_template(
        'text/create_text.html',
        title='Создание текста',
        form=form,
        form_action=url_for('text.process_create'),
        enctype="multipart/form-data"
    )


@login_required
@roles_required('admin', 'contentmaker')
def process_create():
    form = TextForm()
    if form.validate_on_submit():
        filename = f'{Config.UPLOADED_AUDIOS_DEST}/{create_name(form.title_text.data)}.mp3'
        audios.save(form.audio.data, name=filename)
        audio = AudioSegment.from_file_using_temporary_files(filename)
        duration = len(audio)
        text = Content(
            title_text=form.title_text.data,
            text_en=form.text_en.data,
            text_ru=form.text_ru.data,
            duration=duration,
        )
        db.session.add(text)
        db.session.commit()
        recognition_start.delay(form.title_text.data)
        flash('Ваш текст сохранен! Обработка текста может занять некоторое время.')
        return redirect(url_for('text.texts_list'))
    return redirect(url_for('text.create'))


@login_required
@roles_required('admin', 'contentmaker')
def texts_list():
    title = 'Список текстов'
    texts = Content.query.all()
    return render_template(
        'text/texts_list.html',
        title=title,
        texts=texts
    )


@login_required
@roles_required('admin', 'contentmaker')
def edit_text(text_id):
    form = EditForm()
    text = Content.query.filter(Content.id == text_id).first()
    title_text = text.title_text
    title_page = f'Правка {title_text}'
    chunks = Chunk.query.filter(Chunk.content_id == text.id).all()
    chunks_result = []
    for chunk in chunks:
        recognized_chunk = chunk.chunks_recognized.lower()
        chunks_result.append(recognized_chunk)
    recognizer = Recognizer(title_text)
    chunks_text = recognizer.list_chunks_text(text_id, chunks_result)
    merged_chunks = list(zip(chunks_text, chunks_result))
    return render_template('text/edit_text.html',
                           title_page=title_page,
                           merged_chunks=merged_chunks,
                           form=form,
                           form_action=url_for('text.process_edit_text', id=text.id))


@login_required
@roles_required('admin', 'contentmaker')
def process_edit_text():
    text_id = request.args.get('id')
    text = Content.query.filter(Content.id == text_id).first()
    title_text = text.title_text
    chunks = Chunk.query.filter(Chunk.content_id == text.id).all()
    edited_chunks = request.form.to_dict(flat=False)['chunk_recognized']
    form = EditForm()
    recognizer = Recognizer(title_text)
    if form.validate_on_submit():
        recognizer.edit_maping(edited_chunks, chunks)
        flash('Ваши правки сохранены!')
        return redirect(url_for('text.texts_list'))


@login_required
def progress_bar(text_id):
    text = Content.query.filter(Content.id == text_id).first()
    if text is None:
        data = {'status': 'The text is not found'}
        return jsonify(data), 404
    chunks = Chunk.query.filter(Chunk.content_id == text_id).all()
    title_text = text.title_text
    folder_name = f'{Config.UPLOADED_AUDIOS_DEST}/{create_name(title_text)}'
    amount_audio_chunks = len(os.listdir(folder_name))
    amount_text_chunks = len(chunks)
    # Добавить проверку на несуществование чанков (папки)
    progress = amount_text_chunks / amount_audio_chunks * 100
    data = {'progress': progress, 'status': text.status}
    return jsonify(data)
