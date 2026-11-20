from django.contrib import admin

from sms.models import SMSDelivery


@admin.register(SMSDelivery)
class SMSDeliveryAdmin(admin.ModelAdmin):
    list_display = ("created_at", "purpose", "phone_number", "status")
    list_filter = ("purpose", "status", "created_at")
    ordering = ("-created_at",)
    readonly_fields = ("challenge", "phone_number", "purpose", "status", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
