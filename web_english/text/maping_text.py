import os
import re

from logmmse import logmmse_from_file
from pydub import AudioSegment
import requests

from config import Config
from web_english import db, celery
from web_english.models import Chunk, Content


@celery.task
def recognition_start(title):
    text = Content.query.filter(Content.title_text == title).first()
    text.status = Content.PROCESSING
    db.session.add(text)
    db.session.commit()
    # Та самая секунда, на которой находится диктор
    current_second = 0
    chunk_maping = ['', 0, '', 0]
    recognizer = Recognizer(title)
    try:
        chunks = recognizer.chunk_audiofile(title)
        for chunk in chunks:
            chunk_result = recognizer.send_ya_speech_kit(chunk)
            chunk_maping = recognizer.maping_text(chunk_result, chunk_maping[3])[0]
            current_second += Config.INTERVAL
            recognizer.save_chunk(chunk_maping, current_second)
        text.status = Content.DONE
        db.session.add(text)
        db.session.commit()
    except Exception:
        text.status = Content.ERROR
        db.session.add(text)
        db.session.commit()
        raise


class Recognizer():

    def __init__(self, title):
        self.title = title

    def chunk_audiofile(self, title):
        folder_name = f'{Config.UPLOADED_AUDIOS_DEST}/{create_name(self.title)}'
        os.mkdir(folder_name)
        # audiofile = f'{folder_name}.wav'
        # logmmse_from_file(audiofile, output_file=f'{folder_name}1.wav')
        # audio = AudioSegment.from_wav(f'{folder_name}1.wav')
        audiofile = f'{folder_name}.mp3'
        audio = AudioSegment.from_mp3(audiofile)
        length_audio = len(audio)
        counter = 1
        interval = Config.INTERVAL
        start = 0
        end = 0
        chunks = []
        for i in range(0, length_audio, interval):
            if i == 0:
                start = 0
                end = interval
            else:
                start = end
                end = start + interval
            if end >= length_audio:
                end = length_audio
            chunk = audio[start:end]
            chunk_name = f'{folder_name}/chunk{counter}.ogg'
            chunks.append(chunk_name)
            chunk.export(chunk_name, format='ogg')
            print(f"Processing {chunk_name}chunk{counter}. Start = {start} End = {end}")
            counter += 1
        return chunks

    def send_ya_speech_kit(self, chunk):
        with open(chunk, "rb") as f:
            data = f.read()
        params = {
                    'lang': 'en-US',
                    'folderId': Config.FOLDER_ID
        }
        url = "https://stt.api.cloud.yandex.net/speech/v1/stt:recognize"
        headers = {"Authorization": f"Api-Key {Config.API_KEY}"}
        response = requests.post(url, params=params, data=data, headers=headers)
        chunk = response.json()
        if chunk.get("error_code") is None:
            return chunk.get("result")
        return False

    def maping_text(self, chunk_result, word_number):
        content = Content.query.filter(Content.title_text == self.title).first()
        medium_word = None
        # Убираем из текста все знаки препинания и разбиваем по словам
        split_text = re.sub(r"[.,!?;:]", r"", content.text_en).lower().split()
        # 15  - это примерное кол-во слов, которое диктор может произнести за 3 секунды
        segment_split_text = split_text[word_number: word_number + 15]
        chunk_text = ' '.join(segment_split_text)
        # Разбиваем распознанный отрывок на слова и приводим к нижнему регистру
        split_chunk_result = chunk_result.lower().split()

        # Перебираем каждое слово в оригинальном отрезке
        for word in segment_split_text:

            # Если находим это слово в распознанном, то записываем его как последнее найденное слово
            # и удаляем первое это слово из распознанного отрывка, чтобы больше не встречалось
            if word in split_chunk_result:
                medium_word = word
                split_chunk_result.remove(word)
        if medium_word is None:
            chunk_maping = [chunk_result, content.id, '', word_number]
            return chunk_maping, chunk_text
        # Кол-во одинаковых "последних" слов в распознанном отрезке. Отнимаем 1, чтобы можно было
        # использовать его в списке повторяющихся слов в оригинальном отрезке
        number_duplicate = chunk_result.lower().split().count(medium_word) - 1
        # Если это кол-во равно 1 (не забываем, что отняли 1 выше), то прибавляем к
        # индексу найденного последнего слова индекс предыдущего во всем тексте - это
        # будет индекс нашего найденного последнего слова
        if number_duplicate == 0:
            word_number = segment_split_text.index(medium_word) + word_number

        # Иначе ищем индекс последнего слова, которое было по порядку на том месте,
        # сколько встречалось в распознанном тексте
        else:
            number_word_cut_split_text = duplicate_word(segment_split_text, medium_word, number_duplicate)
            word_number = number_word_cut_split_text + word_number
        chunk_maping = [chunk_result, content.id, medium_word, word_number]
        return chunk_maping, chunk_text

    def list_chunks_text(self, text_id, chunks_result):
        chunks_text = []
        words_number = [0]
        count = 0
        chunks = Chunk.query.filter(Chunk.content_id == text_id).all()
        for chunk in chunks:
            word_number = chunk.word_number
            words_number.append(word_number)
        for chunk_result in chunks_result:
            chunk_text = self.maping_text(chunk_result, words_number[count])[1]
            chunks_text.append(chunk_text)
            count += 1
        return chunks_text

    def edit_maping(self, edited_chunks, chunks):
        word_number = 0
        count = 0
        for edited_chunk in edited_chunks:
            chunk_maping = self.maping_text(edited_chunk, word_number)[0]
            word_number = chunk_maping[3]
            self.save_edit_chunks(chunk_maping, edited_chunk, chunks[count])
            count += 1

    def save_chunk(self, chunk_maping, current_second):
        save = Chunk(chunks_recognized=chunk_maping[0],
                     content_id=chunk_maping[1],
                     word=chunk_maping[2],
                     word_number=chunk_maping[3],
                     word_time=current_second
                     )
        db.session.add(save)
        db.session.commit()

    def save_edit_chunks(self, chunk_maping, edited_chunk, chunk):
        chunk.chunks_recognized = edited_chunk
        chunk.word = chunk_maping[2]
        chunk.word_number = chunk_maping[3]
        db.session.add(chunk)
        db.session.commit()


def duplicate_word(segment_split_text, medium_word, number_duplicate):
    start_at = -1
    duplicates = []
    while True:
        try:
            duplicate = segment_split_text.index(medium_word, start_at + 1)
        except ValueError:
            break
        duplicates.append(duplicate)
        start_at = duplicate
    result = duplicates[number_duplicate]
    return result


def create_name(title):
    filename_draft = re.sub(r'\s', r'_', title.lower())
    filename = re.sub(r'\W', r'', filename_draft)
    return filename
