import base64
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from phonenumber_field.phonenumber import PhoneNumber

from core.main_utils import phone_number_as_e164


BEEM_SEND_URL = "https://apisms.beem.africa/v1/send"


class SMSDeliveryError(Exception):
    pass


def send_sms(phone_number: PhoneNumber | str, message: str) -> None:
    api_key = getattr(settings, "BEEM_API", "")
    api_secret = getattr(settings, "BEEM_SECRET", "")
    if not api_key or not api_secret:
        raise SMSDeliveryError("SMS provider credentials are not configured.")

    authorization = base64.b64encode(
        f"{api_key}:{api_secret}".encode("utf-8")
    ).decode("ascii")
    payload = {
        "source_addr": getattr(settings, "BEEM_SENDER_ID", "AC-INSIGHTS"),
        "schedule_time": "",
        "encoding": 0,
        "message": message,
        "recipients": [
            {
                "recipient_id": 1,
                "dest_addr": phone_number_as_e164(phone_number).lstrip("+"),
            }
        ],
    }
    request = Request(
        BEEM_SEND_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Basic {authorization}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=8) as response:
            if not 200 <= response.status < 300:
                raise SMSDeliveryError(
                    f"SMS provider returned HTTP {response.status}."
                )
    except HTTPError as error:
        raise SMSDeliveryError(
            f"SMS provider returned HTTP {error.code}."
        ) from error
    except (TimeoutError, URLError) as error:
        raise SMSDeliveryError("SMS provider could not be reached.") from error