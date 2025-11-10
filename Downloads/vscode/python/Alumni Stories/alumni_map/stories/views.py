# alumni/views.py

from rest_framework import viewsets, permissions
from .models import AlumniStory
from .serializers import AlumniStorySerializer


class IsModeratorOrReadOnly(permissions.BasePermission):
    """
    Only allow moderators (is_staff) to approve/edit/delete.
    Everyone can view and submit.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class AlumniStoryViewSet(viewsets.ModelViewSet):
    serializer_class = AlumniStorySerializer
    permission_classes = [IsModeratorOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.is_staff:
            return AlumniStory.objects.all()
        return AlumniStory.objects.filter(approved=True)

    def perform_create(self, serializer):
        # All new stories are attached to the user and not approved
        serializer.save(submitted_by=self.request.user, approved=False)


# End of alumni/views.py
