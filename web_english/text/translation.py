import re
import requests

from config import Config
from web_english import db, celery
from web_english.models import Word


@celery.task
def translation_start(text):
    split_text = re.sub(r"[^\w, ,']", r"", text)
    split_text = re.sub(r"[\d,_]", r"", split_text).lower().split()
    for word in split_text:
        in_database = Word.query.filter_by(word=word).first()
        if not in_database:
            translation = translation_word(word)
            if translation:
                save = Word(word=word,
                            translation_word=translation)
                db.session.add(save)
    db.session.commit()


def translation_word(word):
    params = {
        "key": Config.DICTIONARY_KEY,
        "lang": "en-ru",
        "text": word
    }
    url = "https://dictionary.yandex.net/api/v1/dicservice.json/lookup?"
    response = requests.post(url, params=params)
    translated_text = response.json()
    if translated_text.get("def"):
        translation = {}
        for w in translated_text.get("def"):
            # count = 0
            if w.get('pos') and w.get('pos') != "foreign word":
                part_of_speech = w['pos']
                translation[part_of_speech] = []
                for word in w['tr']:
                    translation[part_of_speech].append(word['text'])
                    if word.get('syn'):
                        for word_syn in word['syn']:
                            translation[part_of_speech].append(
                                word_syn['text'])

                    # count += 1
                    # if count == 3:
                    #     break
        return translation
    return False
