from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django_countries.serializer_fields import CountryField
from phonenumber_field.serializerfields import PhoneNumberField
from rest_framework import serializers


User = get_user_model()


class SignupRequestSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, trim_whitespace=True)
    phone_number = PhoneNumberField()
    country = CountryField()
    currency = serializers.RegexField(r"^[A-Za-z]{3}$", max_length=3)

    def validate_username(self, value):
        try:
            return User._meta.get_field("username").clean(value, None)
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages) from error

    def validate_currency(self, value):
        return value.upper()


class PhoneRequestSerializer(serializers.Serializer):
    phone_number = PhoneNumberField()


class OTPVerifySerializer(PhoneRequestSerializer):
    code = serializers.RegexField(r"^\d{6}$", max_length=6)


class AuthenticatedUserSerializer(serializers.ModelSerializer):
    phone_number = PhoneNumberField(read_only=True)
    country = CountryField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "phone_number",
            "phone_number_verified",
            "country",
            "currency",
        )
        read_only_fields = fields
