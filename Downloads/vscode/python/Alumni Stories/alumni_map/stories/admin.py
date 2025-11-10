from django.contrib import admin
from .models import AlumniStory


@admin.register(AlumniStory)
class AlumniStoryAdmin(admin.ModelAdmin):
    list_display = ("__str__", "approved")
    list_filter = ("approved",)
    actions = ["approve_stories"]

    def approve_stories(self, request, queryset):
        queryset.update(approved=True)

    approve_stories.short_description = "Approve selected stories"


# End of alumni_map/stories/admin.py
