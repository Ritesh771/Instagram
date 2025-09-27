from django.urls import path
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import permissions

from .views import (
    RegisterView,
    VerifyOTPView,
    LoginView,
    Verify2FAView,
    ResetPasswordRequestView,
    ResetPasswordConfirmView,
    PostListCreateView,
    PostDeleteView,
    LikePostView,
    ProfileView,
    UsernamePreviewView
)
from rest_framework_simplejwt.views import TokenRefreshView


# Simple health check view
class HealthCheckView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        return Response({"status": "healthy"})


urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/verify-2fa/', Verify2FAView.as_view(), name='verify-2fa'),
    path('auth/reset-password/', ResetPasswordRequestView.as_view(), name='reset-password'),
    path('auth/reset-password/confirm/', ResetPasswordConfirmView.as_view(), name='reset-password-confirm'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/profile/', ProfileView.as_view(), name='profile'),
    path('auth/username-preview/', UsernamePreviewView.as_view(), name='username-preview'),

    path('posts/', PostListCreateView.as_view(), name='posts'),
    path('posts/<int:pk>/', PostDeleteView.as_view(), name='post-delete'),
    path('posts/<int:post_id>/like/', LikePostView.as_view(), name='post-like'),
]

