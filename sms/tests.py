import base64
import json
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from sms.sms_utils import SMSDeliveryError, send_sms


class BeemSMSTests(SimpleTestCase):
    @override_settings(
        BEEM_API="test-api-key",
        BEEM_SECRET="test-secret",
        BEEM_SENDER_ID="AC-INSIGHTS",
    )
    @patch("sms.sms_utils.urlopen")
    def test_sends_beem_payload_with_basic_auth_and_international_number(
        self,
        mocked_urlopen,
    ):
        response = MagicMock()
        response.status = 200
        mocked_urlopen.return_value.__enter__.return_value = response

        send_sms("+255700000001", "Your verification code is 123456.")

        request = mocked_urlopen.call_args.args[0]
        self.assertEqual(
            request.get_header("Authorization"),
            "Basic "
            + base64.b64encode(b"test-api-key:test-secret").decode("ascii"),
        )
        self.assertEqual(
            json.loads(request.data),
            {
                "source_addr": "AC-INSIGHTS",
                "schedule_time": "",
                "encoding": 0,
                "message": "Your verification code is 123456.",
                "recipients": [
                    {"recipient_id": 1, "dest_addr": "255700000001"}
                ],
            },
        )
        mocked_urlopen.assert_called_once_with(request, timeout=8)

    @override_settings(BEEM_API="", BEEM_SECRET="")
    @patch("sms.sms_utils.urlopen")
    def test_missing_credentials_fails_without_calling_provider(self, mocked_urlopen):
        with self.assertRaises(SMSDeliveryError):
            send_sms("+255700000001", "Code")

        mocked_urlopen.assert_not_called()
