from django.contrib.auth import get_user_model
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from core.serializers import (
    AuthenticatedUserSerializer,
    OTPVerifySerializer,
    PhoneRequestSerializer,
    SignupRequestSerializer,
)
from sms.models import OTPChallenge
from sms.services import (
    OTPRequestCooldown,
    OTPVerificationError,
    request_otp,
    verify_otp,
)
from sms.sms_utils import SMSDeliveryError


User = get_user_model()
ELIGIBLE_REQUEST_MESSAGE = (
    "If these details are eligible, a verification code has been sent."
)


def _otp_requested_response():
    return Response(
        {
            "detail": ELIGIBLE_REQUEST_MESSAGE,
            "expires_in": settings.OTP_EXPIRY_SECONDS,
            "resend_after": settings.OTP_RESEND_COOLDOWN_SECONDS,
        },
        status=status.HTTP_202_ACCEPTED,
    )


def _session_response(user, response_status=status.HTTP_200_OK):
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": AuthenticatedUserSerializer(user).data,
        },
        status=response_status,
    )


def _cooldown_response(error):
    return Response(
        {
            "detail": "Please wait before requesting another verification code.",
            "retry_after": error.retry_after,
        },
        status=status.HTTP_429_TOO_MANY_REQUESTS,
        headers={"Retry-After": str(error.retry_after)},
    )


def _verification_error_response(error):
    response_status = (
        status.HTTP_429_TOO_MANY_REQUESTS
        if error.retry_after
        else status.HTTP_400_BAD_REQUEST
    )
    response = Response(
        {
            "detail": error.detail,
            "retry_after": error.retry_after,
        },
        status=response_status,
    )
    if error.retry_after:
        response["Retry-After"] = str(error.retry_after)
    return response


class SignupRequestCodeView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp_request"

    def post(self, request):
        serializer = SignupRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        signup = serializer.validated_data

        if User.objects.filter(
            Q(username=signup["username"])
            | Q(phone_number=signup["phone_number"])
        ).exists():
            return _otp_requested_response()

        try:
            request_otp(
                signup["phone_number"],
                OTPChallenge.Purpose.SIGNUP,
                username=signup["username"],
                country=signup["country"],
                currency=signup["currency"],
            )
        except OTPRequestCooldown as error:
            return _cooldown_response(error)
        except SMSDeliveryError:
            return Response(
                {
                    "detail": (
                        "SMS delivery is temporarily unavailable. "
                        "Please try again."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return _otp_requested_response()


class SignupVerifyCodeView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp_verify"

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        verification = serializer.validated_data

        try:
            challenge = verify_otp(
                verification["phone_number"],
                OTPChallenge.Purpose.SIGNUP,
                verification["code"],
            )
        except OTPVerificationError as error:
            return _verification_error_response(error)

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=challenge.username,
                    phone_number=challenge.phone_number,
                    country=challenge.country,
                    currency=challenge.currency,
                    phone_number_verified=True,
                )
                challenge.delete()
        except IntegrityError:
            OTPChallenge.objects.filter(pk=challenge.pk).delete()
            return Response(
                {
                    "detail": (
                        "Registration could not be completed. "
                        "Request a new verification code."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        return _session_response(user, status.HTTP_201_CREATED)


class LoginRequestCodeView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp_request"

    def post(self, request):
        serializer = PhoneRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone_number = serializer.validated_data["phone_number"]

        eligible = User.objects.filter(
            phone_number=phone_number,
            phone_number_verified=True,
            is_active=True,
        ).exists()
        if not eligible:
            return _otp_requested_response()

        try:
            request_otp(phone_number, OTPChallenge.Purpose.LOGIN)
        except OTPRequestCooldown as error:
            return _cooldown_response(error)
        except SMSDeliveryError:
            return Response(
                {
                    "detail": (
                        "SMS delivery is temporarily unavailable. "
                        "Please try again."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return _otp_requested_response()


class LoginVerifyCodeView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp_verify"

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        verification = serializer.validated_data

        try:
            challenge = verify_otp(
                verification["phone_number"],
                OTPChallenge.Purpose.LOGIN,
                verification["code"],
            )
        except OTPVerificationError as error:
            return _verification_error_response(error)

        with transaction.atomic():
            user = (
                User.objects.filter(
                    phone_number=challenge.phone_number,
                    phone_number_verified=True,
                    is_active=True,
                )
                .first()
            )
            challenge.delete()

        if user is None:
            return Response(
                {"detail": "The code is invalid or expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return _session_response(user)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(AuthenticatedUserSerializer(request.user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_value = request.data.get("refresh")
        if not isinstance(refresh_value, str) or not refresh_value:
            return Response(
                {"detail": "A refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            refresh = RefreshToken(refresh_value)
        except TokenError:
            return Response(
                {"detail": "The refresh token is invalid or expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if str(refresh.get("user_id")) != str(request.user.pk):
            return Response(
                {"detail": "The refresh token does not match this session."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refresh.blacklist()
        return Response(status=status.HTTP_205_RESET_CONTENT)
