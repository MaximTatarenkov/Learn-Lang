import unicodedata
import re
import requests

from fuzzywuzzy import fuzz
from ponstrans import translate

from config import Config
from web_english import db, celery
from web_english.models import Word, Translation, Content


def split_clean_text(text):
    split_text = re.sub(r"[^\w, ,']", r"", text)
    split_text = re.sub(r"[\d,_]", r"", split_text).lower().split()
    return split_text


def translation_word_yandex(word):
    params = {
        "key": Config.DICTIONARY_KEY,
        "lang": "en-ru",
        "text": word
    }
    url = "https://dictionary.yandex.net/api/v1/dicservice.json/lookup?"
    response = requests.post(url, params=params)
    translated_text = response.json()
    if translated_text.get("def"):
        translation = []
        for w in translated_text.get("def"):
            for word in w['tr']:
                translation.append(word['text'])
                if word.get('syn'):
                    for word_syn in word['syn']:
                        translation.append(
                            word_syn['text'])
        return translation
    return False


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
                break
            count_word_in_ru_sentence += 1
        if fuzzy > 70:
            break
    db.session.commit()


@celery.task
def translation_start(title_text):
    content = Content.query.filter_by(title_text=title_text).first()
    text_en = content.text_en
    split_text = split_clean_text(text_en)
    for word in split_text:
        check_database = Word.query.filter_by(word=word).first()
        if not check_database:
            translations_pons = translation_word_pons(word)
            translations_yandex = translation_word_yandex(word)
            if translations_pons or translations_yandex:
                translations_for_click = create_translations_for_click(
                    word, translations_pons, translations_yandex)
                translations_for_highlight = create_translations_for_highlight(
                    word, translations_for_click)
                save = Word(word=word,
                            translations_for_click=translations_for_click,
                            translations_for_highlight=translations_for_highlight)
                db.session.add(save)
    db.session.commit()
    text_id = content.id
    translation_in_context(text_id)


def translation_word_pons(word):
    translation = translate(
        word=word, source_language="en", target_language="ru")
    if translation:
        return translation
    return False


def create_translations_for_highlight(word, translations_for_click):
    translations_for_highlight = {"translations": []}
    print(translations_for_click["translations"])
    for translation in translations_for_click["translations"]:
        if translation["en"] == word and not (" " in translation["ru"]):
            translations_for_highlight["translations"].append([
                translation["ru"]])
    return translations_for_highlight


def strip_accents(string):
    without_accent = ''
    for w in string:
        if unicodedata.category(w) != 'Mn':
            without_accent += w
    return without_accent


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
                translation_word_value = translation_word_dict.translations_for_highlight[
                    'translations']
                word_translations = []
                for word in translation_word_value:
                    word_translations += word
                saving_comparison_results(word_translations, split_ru_sentence,
                                          en_word, text_id, count_sentence,
                                          count_word_in_en_sentence)
            count_word_in_en_sentence += 1
        count_word_in_en_sentence = 0
        count_sentence += 1


def create_translations_for_click(word, translations_pons, translations_yandex):
    translations_for_click = {"translations": []}
    if translations_pons:
        for translation_pons in translations_pons:
            translation = check_word(word, translation_pons)
            if translation:
                translations_for_click['translations'].append(translation)
        if not translations_for_click["translations"] and word[-1] == 's':
            word_without_s = word[:-1]
            for translation_pons in translations_pons:
                translation = check_word(word_without_s, translation_pons)
                if translation:
                    translations_for_click['translations'].append(translation)
    if translations_yandex:
        for translation_ya in translations_yandex:
            if translation_ya:
                translation_for_comparison = {"en": word, "ru": translation_ya}
                if translation_for_comparison not in translations_for_click['translations']:
                    translations_for_click['translations'].append(
                        {"en": word, "ru": translation_ya})
    return translations_for_click


def check_word(word, translation_pons):
    check = len(re.findall(rf"\b{word}\b", translation_pons["source"]))
    if check >= 1:
        cleaned_en_string = re.sub(
            r'-', ' ', translation_pons["source"])
        cleaned_en_string = re.sub(
            r'\bsth\b', 'something', cleaned_en_string)
        cleaned_en_string = re.sub(
            r'\bsb\b', 'somebody', cleaned_en_string)
        cleaned_en_string = re.sub(
            r'\bsb/sth\b', 'somebody/something', cleaned_en_string)
        without_accent = strip_accents(translation_pons["target"])
        cleaned_ru_string = re.sub(
            r'[a-z]', '', without_accent)
        cleaned_ru_string = re.sub(
            r'\bмн\b', '', cleaned_ru_string)
        cleaned_ru_string = re.sub(
            r'  ', ' ', cleaned_ru_string)
        cleaned_ru_string = re.sub(
            r'ё', 'е', cleaned_ru_string)
        cleaned_ru_string = re.sub(
            r' ,', ',', cleaned_ru_string).strip()
        translation_for_array = {
            "en": cleaned_en_string, "ru": cleaned_ru_string}
        return translation_for_array
    return False
