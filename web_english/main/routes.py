from web_english.main import bp, views


bp.add_url_rule("/", "index", views.index)
bp.add_url_rule("/learning/<text_id>", "learning", views.learning)
bp.add_url_rule("/learning/send_chunks/<text_id>/", "send_chunks", views.send_chunks)
bp.add_url_rule('/audio/<int:text_id>', "serve_audio", views.serve_audio)
bp.add_url_rule("/learning_list", "learning_list", views.text_list_for_student)