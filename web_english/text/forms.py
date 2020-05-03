from wtforms import TextAreaField, SubmitField, FileField, StringField
from wtforms.validators import DataRequired
from web_english.generics.forms import GenericForm


class TextForm(GenericForm):
    title_text = StringField('Title', validators=[DataRequired()])
    text_en = TextAreaField('Text EN', validators=[DataRequired()])
    text_ru = TextAreaField('Text RU', validators=[DataRequired()])
    audio = FileField('Audio')
    submit = SubmitField('Save')


class EditForm(GenericForm):
    chunk_recognized = StringField('Распознанный: ', render_kw={'class': 'form-control', 'type': "text"})
    submit = SubmitField('Save')
