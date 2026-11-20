import math
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from phonenumber_field.phonenumber import PhoneNumber

from core.main_utils import (
    generate_otp,
    otp_digest,
    phone_number_as_e164,
    verify_otp_digest,
)
from sms.models import OTPChallenge
from sms.models import SMSDelivery
from sms.sms_utils import SMSDeliveryError, send_sms


class OTPRequestCooldown(Exception):
    def __init__(self, retry_after: int):
        self.retry_after = max(1, retry_after)
        super().__init__(f"Retry after {self.retry_after} seconds.")


class OTPVerificationError(Exception):
    def __init__(self, detail: str, retry_after: int = 0):
        self.detail = detail
        self.retry_after = retry_after
        super().__init__(detail)


def _seconds_until(deadline, now) -> int:
    return max(1, math.ceil((deadline - now).total_seconds()))


def request_otp(
    phone_number: PhoneNumber | str,
    purpose: str,
    *,
    username: str = "",
    country: str = "",
    currency: str = "",
) -> OTPChallenge:
    normalized_phone = phone_number_as_e164(phone_number)
    now = timezone.now()
    challenge = None
    delivery = None

    try:
        with transaction.atomic():
            recent_delivery_times = list(
                SMSDelivery.objects.filter(
                    phone_number=normalized_phone,
                    purpose=purpose,
                    created_at__gte=now - timedelta(hours=1),
                )
                .order_by("created_at")
                .values_list("created_at", flat=True)[
                    : settings.OTP_MAX_SENDS_PER_HOUR
                ]
            )
            if len(recent_delivery_times) >= settings.OTP_MAX_SENDS_PER_HOUR:
                retry_after = _seconds_until(
                    recent_delivery_times[0] + timedelta(hours=1),
                    now,
                )
                raise OTPRequestCooldown(retry_after)

            previous = (
                OTPChallenge.objects.select_for_update()
                .filter(phone_number=normalized_phone, purpose=purpose)
                .first()
            )
            if previous:
                for deadline in (previous.cooldown_until, previous.resend_after):
                    if deadline and deadline > now:
                        raise OTPRequestCooldown(_seconds_until(deadline, now))
                if previous.consumed_at is None:
                    previous.consumed_at = now
                    previous.save(update_fields=["consumed_at"])

            code = generate_otp()
            challenge = OTPChallenge.objects.create(
                phone_number=normalized_phone,
                purpose=purpose,
                code_digest=otp_digest(normalized_phone, purpose, code),
                username=username,
                country=country,
                currency=currency,
                expires_at=now
                + timedelta(seconds=settings.OTP_EXPIRY_SECONDS),
                resend_after=now
                + timedelta(seconds=settings.OTP_RESEND_COOLDOWN_SECONDS),
            )
            delivery = SMSDelivery.objects.create(
                challenge=challenge,
                phone_number=normalized_phone,
                purpose=purpose,
            )
    except IntegrityError as error:
        active = (
            OTPChallenge.objects.filter(
                phone_number=normalized_phone,
                purpose=purpose,
                consumed_at__isnull=True,
            )
            .first()
        )
        if active:
            deadlines = [
                deadline
                for deadline in (active.cooldown_until, active.resend_after)
                if deadline and deadline > now
            ]
            if deadlines:
                raise OTPRequestCooldown(
                    _seconds_until(max(deadlines), now)
                ) from error
        raise

    if challenge is None or delivery is None:
        raise RuntimeError("SMS challenge creation completed without a record.")

    try:
        send_sms(
            normalized_phone,
            f"Your FastEvents verification code is {code}. It expires in 10 minutes.",
        )
    except SMSDeliveryError:
        with transaction.atomic():
            SMSDelivery.objects.filter(pk=delivery.pk).update(
                status=SMSDelivery.Status.FAILED
            )
            OTPChallenge.objects.filter(pk=challenge.pk).delete()
        raise

    SMSDelivery.objects.filter(pk=delivery.pk).update(
        status=SMSDelivery.Status.SENT
    )
    return challenge


def verify_otp(
    phone_number: PhoneNumber | str,
    purpose: str,
    code: str,
) -> OTPChallenge:
    normalized_phone = phone_number_as_e164(phone_number)
    now = timezone.now()
    verification_error = None
    verified_challenge = None

    with transaction.atomic():
        challenge = (
            OTPChallenge.objects.select_for_update()
            .filter(
                phone_number=normalized_phone,
                purpose=purpose,
                consumed_at__isnull=True,
            )
            .first()
        )
        if challenge is None:
            raise OTPVerificationError("The code is invalid or expired.")

        if challenge.cooldown_until and challenge.cooldown_until > now:
            raise OTPVerificationError(
                "Request another code after the cooldown.",
                _seconds_until(challenge.cooldown_until, now),
            )

        if challenge.expires_at <= now:
            challenge.consumed_at = now
            challenge.code_digest = ""
            update_fields = ["consumed_at", "code_digest"]
            if purpose == OTPChallenge.Purpose.SIGNUP:
                challenge.username = ""
                challenge.country = ""
                challenge.currency = ""
                update_fields.extend(["username", "country", "currency"])
            challenge.save(update_fields=update_fields)
            verification_error = OTPVerificationError(
                "The code is invalid or expired."
            )
        elif not verify_otp_digest(
            normalized_phone,
            purpose,
            code,
            challenge.code_digest,
        ):
            challenge.failed_attempts += 1
            if purpose == OTPChallenge.Purpose.LOGIN:
                challenge.cooldown_until = now + timedelta(
                    seconds=settings.LOGIN_OTP_COOLDOWN_SECONDS
                )
                challenge.consumed_at = now
                challenge.code_digest = ""
                challenge.save(
                    update_fields=[
                        "failed_attempts",
                        "cooldown_until",
                        "consumed_at",
                        "code_digest",
                    ]
                )
                verification_error = OTPVerificationError(
                    "The code is incorrect. Request a new code after 5 minutes.",
                    settings.LOGIN_OTP_COOLDOWN_SECONDS,
                )
            else:
                update_fields = ["failed_attempts", "consumed_at"]
                if challenge.failed_attempts >= settings.OTP_MAX_ATTEMPTS:
                    challenge.consumed_at = now
                    challenge.code_digest = ""
                    challenge.username = ""
                    challenge.country = ""
                    challenge.currency = ""
                    update_fields.extend(
                        ["code_digest", "username", "country", "currency"]
                    )
                challenge.save(update_fields=update_fields)
                remaining = max(
                    0,
                    settings.OTP_MAX_ATTEMPTS - challenge.failed_attempts,
                )
                detail = (
                    "Too many incorrect codes. Start registration again."
                    if remaining == 0
                    else "The code is invalid or expired."
                )
                verification_error = OTPVerificationError(detail)
        else:
            challenge.consumed_at = now
            challenge.code_digest = ""
            challenge.save(update_fields=["consumed_at", "code_digest"])
            verified_challenge = challenge

    if verification_error is not None:
        raise verification_error
    if verified_challenge is None:
        raise RuntimeError("OTP verification completed without a result.")
    return verified_challenge
