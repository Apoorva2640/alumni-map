from . import views

urlpatterns = [
    path("submit/", views.submit_story, name="submit_story"),
    # ...your API routes etc.
]
