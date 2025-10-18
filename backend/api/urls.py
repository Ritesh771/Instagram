
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
    CommentPostView,
    DeleteCommentView,
    ProfileView,
    UsernamePreviewView,
    BiometricChallengeView,
    BiometricRegisterView,
    BiometricAuthenticateView,
    UserDetailView,  #for viewing user profiles with privacy
    UserListView,  # for searching users
    PendingFollowRequestsView,  # Newly added for listing pending requests
    AcceptFollowRequestView,  # Newly added for accepting requests
    RejectFollowRequestView,
    CheckFollowStatusView,  # Newly added for checking follow status
    FollowUserView,
    UnfollowUserView,
    FollowersListView,
    FollowingListView,
    DeviceListView, LogoutDeviceView, LogoutAllDevicesView,  # Device management views
    NotificationListView, MarkNotificationAsReadView, MarkAllNotificationsAsReadView,  # Notification views
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
    path('auth/biometric/challenge/', BiometricChallengeView.as_view(), name='biometric-challenge'),
    path('auth/biometric/register/', BiometricRegisterView.as_view(), name='biometric-register'),
    path('auth/biometric/authenticate/', BiometricAuthenticateView.as_view(), name='biometric-authenticate'),
    path('posts/', PostListCreateView.as_view(), name='posts'),
    path('posts/<int:pk>/', PostDeleteView.as_view(), name='post-delete'),
    path('posts/<int:post_id>/like/', LikePostView.as_view(), name='post-like'),
    path('posts/<int:post_id>/comment/', CommentPostView.as_view(), name='post-comment'),
    path('comments/<int:comment_id>/', DeleteCommentView.as_view(), name='delete-comment'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:user_id>/follow/', FollowUserView.as_view(), name='follow-user'),  # Critical route
    path('users/<int:user_id>/unfollow/', UnfollowUserView.as_view(), name='unfollow-user'),
    path('users/<int:user_id>/followers/', FollowersListView.as_view(), name='user-followers'),
    path('users/<int:user_id>/following/', FollowingListView.as_view(), name='user-following'),
    path('users/<int:user_id>/follow-status/', CheckFollowStatusView.as_view(), name='user-follow-status'),
    path('follow-requests/pending/', PendingFollowRequestsView.as_view(), name='pending-requests'),
    path('follow-requests/accept/<int:requester_id>/', AcceptFollowRequestView.as_view(), name='accept-request'),
    path('follow-requests/reject/<int:requester_id>/', RejectFollowRequestView.as_view(), name='reject-request'),
    #device management
    path('devices/', DeviceListView.as_view(), name='device-list'),
    path('devices/<int:device_id>/logout/', LogoutDeviceView.as_view(), name='logout-device'),
    path('devices/logout-all/', LogoutAllDevicesView.as_view(), name='logout-all-devices'),
    # notifications
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:notification_id>/read/', MarkNotificationAsReadView.as_view(), name='mark-notification-read'),
    path('notifications/read-all/', MarkAllNotificationsAsReadView.as_view(), name='mark-all-notifications-read'),
]
