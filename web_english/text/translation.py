import re
import requests

from fuzzywuzzy import fuzz

from config import Config
from web_english import db, celery
from web_english.models import Word, Translation, Content


@celery.task
def translation_start(title_text):
    content = Content.query.filter_by(title_text=title_text).first()
    text_en = content.text_en
    split_text = split_clean_text(text_en)
    for word in split_text:
        check_database = Word.query.filter_by(word=word).first()
        if not check_database:
            translation = translation_word(word)
            if translation:
                save = Word(word=word,
                            translation_word=translation)
                db.session.add(save)
    db.session.commit()
    text_id = content.id
    translation_in_context(text_id)


def split_clean_text(text):
    split_text = re.sub(r"[^\w, ,']", r"", text)
    split_text = re.sub(r"[\d,_]", r"", split_text).lower().split()
    return split_text


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
            if w.get('pos') and w.get('pos') != "foreign word":
                part_of_speech = w['pos']
                translation[part_of_speech] = []
                for word in w['tr']:
                    translation[part_of_speech].append(word['text'])
                    if word.get('syn'):
                        for word_syn in word['syn']:
                            translation[part_of_speech].append(
                                word_syn['text'])
        return translation
    return False


def translation_in_context(text_id):
    content = Content.query.get(text_id)
    english_sentences = re.split(r'[.!?;]', content.text_en)
    russian_sentences = re.split(r'[.!?;]', content.text_ru)
    count_sentence = 0
    count_word_in_en_sentence = 0
    for en_sentence in english_sentences:
        split_en_sentence = split_clean_text(en_sentence)
        split_ru_sentence = split_clean_text(russian_sentences[count_sentence])
        for en_word in split_en_sentence:
            translation_word_dict = Word.query.filter_by(word=en_word).first()
            if translation_word_dict:
                translation_word_value = translation_word_dict.translation_word.values()
                word_translations = []
                for w in translation_word_value:
                    word_translations += w
                saving_comparison_results(word_translations, split_ru_sentence,
                                          en_word, text_id, count_sentence,
                                          count_word_in_en_sentence)
            count_word_in_en_sentence += 1
        count_word_in_en_sentence = 0
        count_sentence += 1


def saving_comparison_results(word_translations, split_ru_sentence,
                              en_word, text_id, count_sentence,
                              count_word_in_en_sentence):
    for translation in word_translations:
        count_word_in_ru_sentence = 0
        for russian_word in split_ru_sentence:
            fuzzy = fuzz.ratio(translation, russian_word)
            # Если слова похожи на 70%, то...
            if fuzzy > 70:
                save = Translation(word=en_word,
                                   text_id=text_id,
                                   sentence=count_sentence,
                                   in_en_sentence=count_word_in_en_sentence,
                                   in_ru_sentence=count_word_in_ru_sentence
                                   )
                db.session.add(save)
                count_word_in_ru_sentence = 0
                # split_ru_sentence.remove(russian_word)
                break
            count_word_in_ru_sentence += 1
        if fuzzy > 70:
            break
    db.session.commit()
