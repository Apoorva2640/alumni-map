from rest_framework.routers import DefaultRouter
from .views import AlumniStoryViewSet

router = DefaultRouter()
router.register(r"alumni", AlumniStoryViewSet, basename="alumnistory")

urlpatterns = router.urls  # provides /api/alumni/ endpoint
# End of alumni_map/stories/urls.py
