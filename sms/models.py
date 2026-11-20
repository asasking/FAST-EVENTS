from django.db import models
from django.db.models import Q
from django.utils import timezone
from django_countries.fields import CountryField
from phonenumber_field.modelfields import PhoneNumberField


class OTPChallenge(models.Model):
    class Purpose(models.TextChoices):
        SIGNUP = "signup", "Signup"
        LOGIN = "login", "Login"

    phone_number = PhoneNumberField()
    purpose = models.CharField(max_length=8, choices=Purpose.choices)
    code_digest = models.CharField(max_length=64)
    username = models.CharField(max_length=150, blank=True)
    country = CountryField(blank=True, default="")
    currency = models.CharField(max_length=3, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    resend_after = models.DateTimeField()
    cooldown_until = models.DateTimeField(null=True, blank=True)
    failed_attempts = models.PositiveSmallIntegerField(default=0)
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["phone_number", "purpose", "-created_at"],
                name="sms_otp_phone_purp_created_idx",
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["phone_number", "purpose"],
                condition=Q(consumed_at__isnull=True),
                name="sms_unique_active_otp",
            )
        ]
        ordering = ["-created_at"]

    @property
    def is_expired(self):
        return self.expires_at <= timezone.now()


class SMSDelivery(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    challenge = models.ForeignKey(
        OTPChallenge,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sms_deliveries",
    )
    phone_number = PhoneNumberField()
    purpose = models.CharField(max_length=8, choices=OTPChallenge.Purpose.choices)
    status = models.CharField(
        max_length=8,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["phone_number", "purpose", "created_at"],
                name="sms_delivery_phone_hour_idx",
            ),
            models.Index(
                fields=["-created_at", "purpose", "status"],
                name="sms_delivery_status_idx",
            )
        ]
        ordering = ["-created_at"]
