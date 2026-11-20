from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django_countries.fields import CountryField
from phonenumber_field.modelfields import PhoneNumberField


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(
        self,
        phone_number,
        username,
        password=None,
        **extra_fields,
    ):
        if not phone_number:
            raise ValueError("A phone number is required.")
        if not username:
            raise ValueError("A username is required.")

        try:
            normalized_phone = PhoneNumberField().clean(phone_number, None)
        except ValidationError as error:
            raise ValueError("Enter a valid international phone number.") from error

        user = self.model(
            phone_number=normalized_phone,
            username=username,
            **extra_fields,
        )
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(
        self,
        phone_number,
        username,
        password=None,
        **extra_fields,
    ):
        if not password:
            raise ValueError("A password is required for a superuser.")

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("phone_number_verified", True)

        if not extra_fields["is_staff"]:
            raise ValueError("A superuser must have is_staff=True.")
        if not extra_fields["is_superuser"]:
            raise ValueError("A superuser must have is_superuser=True.")

        return self.create_user(
            phone_number=phone_number,
            username=username,
            password=password,
            **extra_fields,
        )


class User(AbstractUser):
    phone_number = PhoneNumberField(unique=True)
    phone_number_verified = models.BooleanField(default=False)
    country = CountryField(blank=True, default="")
    currency = models.CharField(
        blank=True,
        default="",
        max_length=3,
        validators=[
            RegexValidator(
                regex=r"^[A-Z]{3}$",
                message="Currency must be a three-letter uppercase code.",
            )
        ],
    )

    USERNAME_FIELD = "phone_number"
    REQUIRED_FIELDS = ["username"]

    objects = UserManager()

    def __str__(self):
        return self.phone_number.as_e164
