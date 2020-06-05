from web_english.text import bp, views

bp.add_url_rule("/create", "create", views.create)
bp.add_url_rule("/process_create", "process_create",
                views.process_create, methods=['POST'])
bp.add_url_rule("/texts_list", "texts_list", views.texts_list)
bp.add_url_rule("/edit_maping/<text_id>", "edit_maping", views.edit_maping)
bp.add_url_rule("/process_edit_maping", "process_edit_maping",
                views.process_edit_maping, methods=['POST'])
bp.add_url_rule("/progress/<text_id>", "progress", views.progress_bar)
bp.add_url_rule('/audio/<int:text_id>/<int:count>',
                "serve_audio", views.serve_audio)
bp.add_url_rule('/edit_hover/<text_id>', "edit_hover", views.edit_hover)
bp.add_url_rule('/content-list-for-edit', "content-list-for-edit",
                views.give_content_list_for_edit)
