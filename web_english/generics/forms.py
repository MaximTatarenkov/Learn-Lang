from flask_wtf import FlaskForm
from wtforms.validators import DataRequired


class GenericForm(FlaskForm):
    service_fields = ("submit", "csrf_token")

    @property
    def fields(self):
        return [getattr(self, field) for field in self.data.keys() if field not in self.service_fields]

    @property
    def required_fields(self):
        result = []
        for field in self.data.keys():
            if field in self.service_fields:
                continue
            f = getattr(self, field)
            for validator in f.validators:
                if isinstance(validator, DataRequired):
                    result.append(field)
        return result
