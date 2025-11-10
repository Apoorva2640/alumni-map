from rest_framework import serializers
from .models import AlumniStory


class AlumniStorySerializer(serializers.ModelSerializer):
    photo = serializers.ImageField(
        required=False, allow_null=True
    )  # explicit for ImageField

    class Meta:
        model = AlumniStory
        fields = "__all__"


# End of alumni/serializers.py
# alumni/serializers.py
