from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from core.models import User


class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username", "phone_number")


class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    fieldsets = UserAdmin.fieldsets + (
        (
            "Phone and market",
            {
                "fields": (
                    "phone_number",
                    "phone_number_verified",
                    "country",
                    "currency",
                )
            },
        ),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Phone and market",
            {
                "classes": ("wide",),
                "fields": (
                    "phone_number",
                    "phone_number_verified",
                    "country",
                    "currency",
                ),
            },
        ),
    )
    list_display = (
        "username",
        "phone_number",
        "country",
        "currency",
        "phone_number_verified",
        "is_staff",
    )
    search_fields = ("username", "phone_number")
    ordering = ("username",)
