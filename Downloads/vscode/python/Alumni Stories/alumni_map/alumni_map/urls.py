from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("stories.urls")),  # API endpoints for alumni
    path("captcha/", include("captcha.urls")),  # CAPTCHA endpoints
]

# Serve uploaded media files in development:
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
