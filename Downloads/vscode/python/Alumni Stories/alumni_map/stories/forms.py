from django import forms
from .models import AlumniStory
from captcha.fields import CaptchaField


class AlumniStoryForm(forms.ModelForm):
    captcha = CaptchaField()

    class Meta:
        model = AlumniStory
        fields = "__all__"  # Or list fields you want in the form
        exclude = ["approved", "submitted_by", "created", "updated"]
