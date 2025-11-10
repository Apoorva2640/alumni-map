# alumni/models.py

from django.db import models


class AlumniStory(models.Model):
    name = models.CharField(max_length=100)
    year = models.CharField(max_length=20)  # Accepts "2027" or "2023-2027"
    city = models.CharField(max_length=100)
    lat = models.FloatField()
    lng = models.FloatField()
    company = models.CharField(max_length=100)
    role = models.CharField(max_length=100)
    story = models.TextField(blank=True)
    link = models.CharField(
        max_length=256, blank=True
    )  # Accepts any text, not just URL
    photo = models.ImageField(upload_to="alumni_photos/", blank=True, null=True)
    approved = models.BooleanField(default=False)
    submitted_by = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL, null=True, blank=True
    )
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]


# End of alumni/models.py
