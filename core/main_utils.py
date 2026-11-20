import hashlib
import hmac
import secrets

from django.conf import settings
from phonenumber_field.phonenumber import PhoneNumber


OTP_LENGTH = 6


def generate_otp() -> str:
    return f"{secrets.randbelow(10**OTP_LENGTH):0{OTP_LENGTH}d}"


def phone_number_as_e164(phone_number: PhoneNumber | str) -> str:
    if isinstance(phone_number, PhoneNumber):
        return phone_number.as_e164
    return phone_number


def otp_digest(phone_number: PhoneNumber | str, purpose: str, code: str) -> str:
    payload = f"fastevents:{purpose}:{phone_number_as_e164(phone_number)}:{code}"
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_otp_digest(
    phone_number: PhoneNumber | str,
    purpose: str,
    code: str,
    stored_digest: str,
) -> bool:
    return hmac.compare_digest(
        otp_digest(phone_number, purpose, code),
        stored_digest,
    )