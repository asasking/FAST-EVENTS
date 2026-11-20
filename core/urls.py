from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from core.views import (
    CurrentUserView,
    LoginRequestCodeView,
    LoginVerifyCodeView,
    LogoutView,
    SignupRequestCodeView,
    SignupVerifyCodeView,
)


urlpatterns = [
    path(
        "signup/request-code/",
        SignupRequestCodeView.as_view(),
        name="signup-request-code",
    ),
    path(
        "signup/verify-code/",
        SignupVerifyCodeView.as_view(),
        name="signup-verify-code",
    ),
    path(
        "login/request-code/",
        LoginRequestCodeView.as_view(),
        name="login-request-code",
    ),
    path(
        "login/verify-code/",
        LoginVerifyCodeView.as_view(),
        name="login-verify-code",
    ),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
]
