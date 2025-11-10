from django.shortcuts import render, redirect
from .forms import AlumniStoryForm


def submit_story(request):
    if request.method == "POST":
        form = AlumniStoryForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect("thank_you")  # Or homepage, as you prefer
    else:
        form = AlumniStoryForm()
    return render(request, "stories/submit_story.html", {"form": form})
