from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from sms.models import OTPChallenge, SMSDelivery
from sms.sms_utils import SMSDeliveryError


User = get_user_model()


class PhoneAuthFlowTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.phone_number = "+255700000001"

    def signup_payload(self):
        return {
            "username": "fast_user",
            "phone_number": self.phone_number,
            "country": "TZ",
            "currency": "tzs",
        }

    def test_signup_creates_user_only_after_correct_code(self):
        with (
            patch("sms.services.send_sms") as send_sms,
            patch("sms.services.generate_otp", return_value="042731"),
        ):
            start = self.client.post(
                reverse("signup-request-code"),
                self.signup_payload(),
                format="json",
            )

        self.assertEqual(start.status_code, 202)
        self.assertNotIn("code", start.data)
        challenge = OTPChallenge.objects.get(
            phone_number=self.phone_number,
            purpose=OTPChallenge.Purpose.SIGNUP,
        )
        self.assertNotEqual(challenge.code_digest, "042731")
        self.assertGreater(
            challenge.expires_at - challenge.created_at,
            timedelta(seconds=599),
        )
        send_sms.assert_called_once()
        self.assertIn("042731", send_sms.call_args.args[1])
        self.assertEqual(
            SMSDelivery.objects.get(challenge=challenge).status,
            SMSDelivery.Status.SENT,
        )

        invalid = self.client.post(
            reverse("signup-verify-code"),
            {"phone_number": self.phone_number, "code": "000000"},
            format="json",
        )
        self.assertEqual(invalid.status_code, 400)
        self.assertFalse(User.objects.filter(phone_number=self.phone_number).exists())
        challenge.refresh_from_db()
        self.assertEqual(challenge.failed_attempts, 1)

        verified = self.client.post(
            reverse("signup-verify-code"),
            {"phone_number": self.phone_number, "code": "042731"},
            format="json",
        )
        self.assertEqual(verified.status_code, 201)
        user = User.objects.get(phone_number=self.phone_number)
        self.assertTrue(user.phone_number_verified)
        self.assertFalse(user.has_usable_password())
        self.assertEqual(user.country.code, "TZ")
        self.assertEqual(user.currency, "TZS")
        self.assertIn("access", verified.data)
        self.assertIn("refresh", verified.data)
        self.assertEqual(verified.data["user"]["country"], "TZ")
        self.assertEqual(verified.data["user"]["currency"], "TZS")
        self.assertFalse(OTPChallenge.objects.filter(pk=challenge.pk).exists())

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {verified.data['access']}"
        )
        current_user = self.client.get(reverse("current-user"))
        self.assertEqual(current_user.status_code, 200)
        self.assertEqual(current_user.data["phone_number"], self.phone_number)

        replay = self.client.post(
            reverse("signup-verify-code"),
            {"phone_number": self.phone_number, "code": "042731"},
            format="json",
        )
        self.assertEqual(replay.status_code, 400)

    def test_expired_signup_code_never_creates_a_user(self):
        with (
            patch("sms.services.send_sms"),
            patch("sms.services.generate_otp", return_value="123456"),
        ):
            self.client.post(
                reverse("signup-request-code"),
                self.signup_payload(),
                format="json",
            )

        OTPChallenge.objects.filter(
            phone_number=self.phone_number,
            purpose=OTPChallenge.Purpose.SIGNUP,
        ).update(expires_at=timezone.now() - timedelta(seconds=1))

        response = self.client.post(
            reverse("signup-verify-code"),
            {"phone_number": self.phone_number, "code": "123456"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(phone_number=self.phone_number).exists())
        self.assertIsNotNone(
            OTPChallenge.objects.get(
                phone_number=self.phone_number,
                purpose=OTPChallenge.Purpose.SIGNUP,
            ).consumed_at
        )

    def test_signup_exhausting_attempts_invalidates_code_and_pending_profile(self):
        with (
            patch("sms.services.send_sms"),
            patch("sms.services.generate_otp", return_value="123456"),
        ):
            self.client.post(
                reverse("signup-request-code"),
                self.signup_payload(),
                format="json",
            )
            for _ in range(5):
                response = self.client.post(
                    reverse("signup-verify-code"),
                    {"phone_number": self.phone_number, "code": "000000"},
                    format="json",
                )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Too many incorrect codes", response.data["detail"])
        self.assertFalse(User.objects.filter(phone_number=self.phone_number).exists())
        challenge = OTPChallenge.objects.get(
            phone_number=self.phone_number,
            purpose=OTPChallenge.Purpose.SIGNUP,
        )
        self.assertIsNotNone(challenge.consumed_at)
        self.assertEqual(challenge.failed_attempts, 5)
        self.assertEqual(challenge.code_digest, "")
        self.assertEqual(challenge.username, "")

    def test_wrong_login_code_starts_five_minute_resend_cooldown(self):
        User.objects.create_user(
            username="existing",
            phone_number=self.phone_number,
            country="TZ",
            currency="TZS",
            phone_number_verified=True,
        )

        with (
            patch("sms.services.send_sms") as send_sms,
            patch("sms.services.generate_otp", return_value="123456"),
        ):
            start = self.client.post(
                reverse("login-request-code"),
                {"phone_number": self.phone_number},
                format="json",
            )
            invalid = self.client.post(
                reverse("login-verify-code"),
                {"phone_number": self.phone_number, "code": "000000"},
                format="json",
            )
            resend = self.client.post(
                reverse("login-request-code"),
                {"phone_number": self.phone_number},
                format="json",
            )

        self.assertEqual(start.status_code, 202)
        self.assertEqual(invalid.status_code, 429)
        self.assertEqual(invalid.data["retry_after"], 300)
        self.assertEqual(resend.status_code, 429)
        self.assertGreater(resend.data["retry_after"], 0)
        self.assertEqual(send_sms.call_count, 1)
        challenge = OTPChallenge.objects.get(
            phone_number=self.phone_number,
            purpose=OTPChallenge.Purpose.LOGIN,
        )
        self.assertIsNotNone(challenge.consumed_at)
        self.assertEqual(challenge.failed_attempts, 1)

    def test_login_returns_rotating_jwts_and_logout_blacklists_refresh(self):
        User.objects.create_user(
            username="existing",
            phone_number=self.phone_number,
            country="TZ",
            currency="TZS",
            phone_number_verified=True,
        )

        with (
            patch("sms.services.send_sms"),
            patch("sms.services.generate_otp", return_value="654321"),
        ):
            self.client.post(
                reverse("login-request-code"),
                {"phone_number": self.phone_number},
                format="json",
            )
            login = self.client.post(
                reverse("login-verify-code"),
                {"phone_number": self.phone_number, "code": "654321"},
                format="json",
            )

        self.assertEqual(login.status_code, 200)
        refreshed = self.client.post(
            reverse("token-refresh"),
            {"refresh": login.data["refresh"]},
            format="json",
        )
        self.assertEqual(refreshed.status_code, 200)
        self.assertNotEqual(refreshed.data["refresh"], login.data["refresh"])

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {refreshed.data['access']}"
        )
        logout = self.client.post(
            reverse("logout"),
            {"refresh": refreshed.data["refresh"]},
            format="json",
        )
        self.assertEqual(logout.status_code, 205)

        revoked = self.client.post(
            reverse("token-refresh"),
            {"refresh": refreshed.data["refresh"]},
            format="json",
        )
        self.assertNotEqual(revoked.status_code, 200)

    def test_unverified_user_cannot_request_login_code(self):
        User.objects.create_user(
            username="unverified",
            phone_number=self.phone_number,
            country="TZ",
            currency="TZS",
        )

        with patch("sms.services.send_sms") as send_sms:
            response = self.client.post(
                reverse("login-request-code"),
                {"phone_number": self.phone_number},
                format="json",
            )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(OTPChallenge.objects.count(), 0)
        send_sms.assert_not_called()

    def test_sms_failure_is_recorded_and_does_not_leave_an_active_code(self):
        with patch(
            "sms.services.send_sms",
            side_effect=SMSDeliveryError("provider unavailable"),
        ):
            response = self.client.post(
                reverse("signup-request-code"),
                self.signup_payload(),
                format="json",
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(OTPChallenge.objects.count(), 0)
        delivery = SMSDelivery.objects.get()
        self.assertEqual(delivery.status, SMSDelivery.Status.FAILED)
        self.assertIsNone(delivery.challenge)

    def test_phone_number_sms_attempts_are_limited_per_hour(self):
        for _ in range(5):
            SMSDelivery.objects.create(
                phone_number=self.phone_number,
                purpose=OTPChallenge.Purpose.SIGNUP,
                status=SMSDelivery.Status.FAILED,
            )

        with patch("sms.services.send_sms") as send_sms:
            response = self.client.post(
                reverse("signup-request-code"),
                self.signup_payload(),
                format="json",
            )

        self.assertEqual(response.status_code, 429)
        self.assertGreater(response.data["retry_after"], 0)
        self.assertEqual(OTPChallenge.objects.count(), 0)
        send_sms.assert_not_called()

    def test_protected_endpoint_rejects_anonymous_requests(self):
        response = self.client.get(reverse("current-user"))
        self.assertEqual(response.status_code, 401)

    def test_local_expo_web_origin_passes_cors_preflight(self):
        response = self.client.options(
            reverse("signup-request-code"),
            HTTP_ORIGIN="http://localhost:8098",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="authorization,content-type",
        )

        self.assertEqual(
            response["access-control-allow-origin"],
            "http://localhost:8098",
        )
