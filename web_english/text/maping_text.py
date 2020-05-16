import os
import re

from fuzzywuzzy import fuzz
# from logmmse import logmmse_from_file
from pydub import AudioSegment
import requests

from config import Config
from web_english import db, celery
from web_english.models import Chunk, Content


@celery.task
def recognition_start(title):
    content = Content.query.filter(Content.title_text == title).first()
    content.status = Content.PROCESSING
    db.session.add(content)
    db.session.commit()
    current_second = 0
    chunk_maping = ['', 0, '', 0]
    recognizer = Recognizer(title)
    chunks = recognizer.chunk_audiofile(title)
    try:
        for chunk in chunks:
            chunk_result = process_yandex(chunk, title)
            chunk_maping = recognizer.maping_text(
                chunk_result, chunk_maping[3])[0]
            current_second += Config.INTERVAL
            recognizer.save_chunk(chunk_maping, current_second)
        content.status = Content.DONE
        db.session.add(content)
        db.session.commit()
    except Exception:
        content.status = Content.ERROR
        db.session.add(content)
        db.session.commit()
        raise


@celery.task(bind=True)
def process_yandex(self, chunk, title):
    recognizer = Recognizer(title)
    try:
        chunk_result = recognizer.send_ya_speech_kit(chunk)
        if chunk_result:
            return chunk_result
        else:
            return " "
    except Exception as exc:
        self.retry(exc=exc, max_retries=3)


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
            print(
                f"Processing {chunk_name}chunk{counter}. Start = {start} End = {end}")
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
        response = requests.post(
            url, params=params, data=data, headers=headers)
        print(response.json())
        chunk = response.json()
        if chunk.get("error_code") is None:
            return chunk.get("result")
        return "errorChunkOrSilence"

    def maping_text(self, chunk_result, word_number):
        content = Content.query.filter(
            Content.title_text == self.title).first()
        medium_word = None
        chunk_result = chunk_result.lower()
        change_chunk_result = chunk_result
        split_text = re.sub(r"[.,!?;:]", r"", content.text_en).lower().split()
        excerpt_length_in_words = 15
        if word_number == 0:
            segment_split_text = split_text[word_number: word_number +
                                            excerpt_length_in_words]
        else:
            segment_split_text = split_text[word_number +
                                            1: word_number + excerpt_length_in_words]
        chunk_text = ' '.join(segment_split_text)
        split_chunk_result = chunk_result.split()
        acceptable_similarity = 70
        if split_chunk_result:
            for word in segment_split_text:
                for chunk_word in split_chunk_result:
                    fuzzy = fuzz.ratio(word, chunk_word)
                    if fuzzy > acceptable_similarity:
                        medium_word = word
                        index_word = split_chunk_result.index(chunk_word)
                        split_chunk_result = split_chunk_result[index_word + 1:]
                        change_chunk_result = change_chunk_result.replace(
                            chunk_word, word, 1)
                        break
        if medium_word is None:
            chunk_maping = [chunk_result, content.id, '', word_number]
            return chunk_maping, chunk_text
        number_duplicate = chunk_result.lower().split().count(medium_word) - 1
        if number_duplicate == 0:
            if word_number != 0:
                word_number += segment_split_text.index(medium_word) + 1
            else:
                word_number += segment_split_text.index(medium_word)
        else:
            number_word_segment_split_text = self.duplicate_word(
                segment_split_text, medium_word, number_duplicate)
            if word_number != 0:
                word_number = number_word_segment_split_text + word_number + 1
            else:
                word_number = number_word_segment_split_text + word_number
        chunk_maping = [change_chunk_result,
                        content.id, medium_word, word_number]
        return chunk_maping, chunk_text

    def list_chunks_text(self, text_id, chunks_result):
        chunks_text = []
        words_number = [0]
        count = 0
        chunks = Chunk.query.filter(
            Chunk.content_id == text_id).order_by(Chunk.word_time).all()
        for chunk in chunks:
            word_number = chunk.word_number
            words_number.append(word_number)
        for chunk_result in chunks_result:
            chunk_text = self.maping_text(
                chunk_result, words_number[count])[1]
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

    def compose_excerpts_for_sending(self, text_id):
        content = Content.query.filter(Content.id == text_id).first()
        chunks = Chunk.query.filter(
            Chunk.content_id == text_id).order_by(Chunk.word_time).all()
        split_text = content.text_en.split()
        word_number_start = 0
        word_number_end = 0
        excerpts_for_sending = []
        for chunk in chunks:
            word_number_start = word_number_end
            word_number_end = chunk.word_number + 1
            split_excerpt = split_text[word_number_start:word_number_end]
            join_excerpt = " ".join(split_excerpt)
            excerpts_for_sending.append(join_excerpt)
        return excerpts_for_sending

    def find_punctuations_time(self, excerpts):
        punctuations_time = [0]
        count = 0
        for excerpt in excerpts:
            if excerpt.find('.') != -1 or excerpt.find('!') != -1 or excerpt.find('?') != -1 or excerpt.find(';') != -1:
                punctuation_indexes = self.search_punctuation_indexes(excerpt)
                for punct_index in punctuation_indexes:
                    interval_in_sec = Config.INTERVAL/1000
                    punctuation_in_excerpt = (
                        interval_in_sec / len(excerpt)) * punct_index
                    punctuation_in_text = interval_in_sec * count + punctuation_in_excerpt
                    punctuations_time.append(punctuation_in_text)
            count += 1
        return punctuations_time

    def search_punctuation_indexes(self, excerpt):
        punctuation_indexes = []
        element_search = [".", "!", "?", ";"]
        for p in element_search:
            index = excerpt.find(p)
            while index != -1:
                punctuation_indexes.append(index)
                index = excerpt.find(p, index + 1)
        return punctuation_indexes

    def duplicate_word(self, segment_split_text, medium_word, number_duplicate):
        start_at = -1
        duplicates = []
        while True:
            try:
                duplicate = segment_split_text.index(medium_word, start_at + 1)
            except ValueError:
                break
            duplicates.append(duplicate)
            start_at = duplicate
        if number_duplicate <= len(duplicates) - 1:
            result = duplicates[number_duplicate]
        else:
            result = duplicates[-1]
        return result


def create_name(title):
    filename_draft = re.sub(r'\s', r'_', title.lower())
    filename = re.sub(r'\W', r'', filename_draft)
    return filename
