from flask_mail import Message
from web_english import mail, celery


@celery.task
def send_email(subject, recipients, html_body):
    msg = Message(subject, recipients=recipients)
    msg.html = html_body
    mail.send(msg)
