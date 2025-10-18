from datetime import timedelta
import random
import json
import base64
import hashlib
import secrets

from django.utils import timezone
from django.core.mail import send_mail
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction, models
from django.db.models import Q

from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, Post, OTP, Like, Follow, FollowRequest, UserDevice, Notification
from .serializers import (
    RegisterSerializer,
    VerifyOTPSerializer,
    ResetPasswordRequestSerializer,
    ResetPasswordConfirmSerializer,
    PostSerializer,
    UserSerializer,
    DeviceSerializer,
    NotificationSerializer,
    FollowRequestSerializer,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken


def generate_otp_code() -> str:
    return f"{random.randint(100000, 999999)}"


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def parse_user_agent(user_agent):
    """Parse user agent string to extract device information"""
    if not user_agent or user_agent == 'Unknown':
        return {
            'device_name': 'Unknown Device',
            'os': 'Unknown OS',
            'browser': 'Unknown Browser'
        }
    
    # Simple parsing - in production, you might want to use a library like user-agents
    user_agent_lower = user_agent.lower()
    
    # Determine OS
    if 'windows' in user_agent_lower:
        os_name = 'Windows'
    elif 'macintosh' in user_agent_lower or 'mac os' in user_agent_lower:
        os_name = 'macOS'
    elif 'android' in user_agent_lower:
        os_name = 'Android'
    elif 'iphone' in user_agent_lower or 'ipad' in user_agent_lower:
        os_name = 'iOS'
    elif 'linux' in user_agent_lower:
        os_name = 'Linux'
    else:
        os_name = 'Unknown OS'
    
    # Determine browser
    if 'chrome' in user_agent_lower and 'edg' not in user_agent_lower:
        browser = 'Chrome'
    elif 'firefox' in user_agent_lower:
        browser = 'Firefox'
    elif 'safari' in user_agent_lower and 'chrome' not in user_agent_lower:
        browser = 'Safari'
    elif 'edg' in user_agent_lower:
        browser = 'Edge'
    else:
        browser = 'Unknown Browser'
    
    device_name = f"{os_name} {browser}"
    
    return {
        'device_name': device_name,
        'os': os_name,
        'browser': browser
    }


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user: User = serializer.save()

        code = generate_otp_code()
        otp = OTP.objects.create(
            user=user,
            code=code,
            purpose='register',
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        print(f"OTP for {user.email}: {code}")  # Development debugging

        try:
            html_message = f"""
                <html>
                    <body style="font-family: Arial, sans-serif; padding: 20px;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                            <h2 style="color: #333; margin-bottom: 20px;">Account Verification Code</h2>
                            <p style="color: #666; font-size: 16px;">Welcome! Please verify your account using this code:</p>
                            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
                                <strong>{code}</strong>
                            </div>
                            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
                            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't create an account, please ignore this email.</p>
                        </div>
                    </body>
                </html>
                """
            send_mail(
                subject='Verify Your Account',
                message=f'Your verification code is: {code}. It expires in 10 minutes.',
                from_email=None,  # Uses DEFAULT_FROM_EMAIL from settings
                recipient_list=[user.email],
                fail_silently=False,
                html_message=html_message
            )
            print(f"Verification email sent to {user.email}")
        except Exception as e:
            print(f"Failed to send verification email to {user.email}: {e}")
            # Continue with registration even if email fails

        return Response({
            'detail': 'Registered. Check email for OTP.',
            'username': user.username
        }, status=status.HTTP_201_CREATED)


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        user.is_verified = True
        user.save(update_fields=['is_verified'])
        OTP.objects.filter(user=user, purpose='register', is_used=False).update(is_used=True)
        
        # After successful registration verification, automatically log the user in
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'detail': 'Account verified and logged in successfully.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'is_verified': user.is_verified,
                'two_factor_enabled': user.two_factor_enabled,
                'biometric_enabled': user.biometric_enabled,
                'bio': user.bio,
                'profile_pic': user.profile_pic.url if user.profile_pic else None,
            }
        })


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = authenticate(username=username, password=password)
        if not user:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_verified:
            return Response({'error': 'Account not verified'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if 2FA is enabled
        if user.two_factor_enabled:
            # Send OTP for 2FA
            code = generate_otp_code()
            OTP.objects.create(
                user=user,
                code=code,
                purpose='login',
                expires_at=timezone.now() + timedelta(minutes=10),
            )
            print(f"2FA OTP for {user.email}: {code}")  # Development debugging
            try:
                html_message = f"""
                <html>
                    <body style="font-family: Arial, sans-serif; padding: 20px;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                            <h2 style="color: #333; margin-bottom: 20px;">Login Verification Code</h2>
                            <p style="color: #666; font-size: 16px;">Your verification code is:</p>
                            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
                                <strong>{code}</strong>
                            </div>
                            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
                            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
                        </div>
                    </body>
                </html>
                """
                send_mail(
                    subject='Login Verification Code',
                    message=f'Your verification code is: {code}. It expires in 10 minutes.',
                    from_email=None,  # Uses DEFAULT_FROM_EMAIL from settings
                    recipient_list=[user.email],
                    fail_silently=False,
                    html_message=html_message
                )
            except Exception as e:
                print(f"Failed to send 2FA email to {user.email}: {e}")
                return Response({'error': 'Failed to send 2FA email'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            return Response({'detail': '2FA enabled. Check email for OTP.', 'requires_2fa': True})
        
        # No 2FA - return JWT tokens directly
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        # Create device record
        user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
        ip_address = get_client_ip(request)
        device_info = parse_user_agent(user_agent)
        
        UserDevice.objects.create(
            user=user,
            device_name=device_info['device_name'],
            os=device_info['os'],
            browser=device_info['browser'],
            ip_address=ip_address,
        )
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'is_verified': user.is_verified,
                'two_factor_enabled': user.two_factor_enabled,
                'bio': user.bio,
                'profile_pic': user.profile_pic.url if user.profile_pic else None,
            }
        })


class Verify2FAView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        code = request.data.get('code')
        
        if not username or not code:
            return Response({'error': 'Username and code required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        now = timezone.now()
        otp_qs = OTP.objects.filter(
            user=user, 
            purpose='login', 
            code=code, 
            is_used=False, 
            expires_at__gte=now
        )
        
        if not otp_qs.exists():
            return Response({'error': 'Invalid or expired code'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark OTP as used
        otp_qs.update(is_used=True)
        
        # Return JWT tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        # Create device record
        user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
        ip_address = get_client_ip(request)
        device_info = parse_user_agent(user_agent)
        
        UserDevice.objects.create(
            user=user,
            device_name=device_info['device_name'],
            os=device_info['os'],
            browser=device_info['browser'],
            ip_address=ip_address,
        )
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'is_verified': user.is_verified,
                'two_factor_enabled': user.two_factor_enabled,
                'bio': user.bio,
                'profile_pic': user.profile_pic.url if user.profile_pic else None,
            }
        })


class ResetPasswordRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user: User = serializer.validated_data['user']
        code = generate_otp_code()
        OTP.objects.create(
            user=user,
            code=code,
            purpose='reset',
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        print(f"Password reset OTP for {user.email}: {code}")  # Development debugging
        try:
            html_message = f"""
                <html>
                    <body style="font-family: Arial, sans-serif; padding: 20px;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Code</h2>
                            <p style="color: #666; font-size: 16px;">You requested to reset your password. Use this code to continue:</p>
                            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
                                <strong>{code}</strong>
                            </div>
                            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
                            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request a password reset, please ignore this email and ensure your account is secure.</p>
                        </div>
                    </body>
                </html>
                """
            send_mail(
                subject='Reset Your Password',
                message=f'Your password reset code is: {code}. It expires in 10 minutes.',
                from_email=None,  # Uses DEFAULT_FROM_EMAIL from settings
                recipient_list=[user.email],
                fail_silently=False,
                html_message=html_message
            )
            print(f"Password reset email sent to {user.email}")
        except Exception as e:
            print(f"Failed to send password reset email to {user.email}: {e}")
            return Response({'error': 'Failed to send reset email'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({'detail': 'Reset OTP sent.'})


class ResetPasswordConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user: User = serializer.validated_data['user']
        new_password: str = serializer.validated_data['new_password']
        user.set_password(new_password)
        user.save(update_fields=['password'])
        OTP.objects.filter(user=user, purpose='reset', is_used=False).update(is_used=True)
        return Response({'detail': 'Password reset successful.'})


class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = User.objects.all()
        search = self.request.query_params.get('search', None)
        if search:
            # More precise search - match username exactly or as a prefix
            # Also allow searching by ID if the search term is numeric
            if search.isdigit():
                # If search term is numeric, search by ID or username
                queryset = queryset.filter(
                    Q(id=int(search)) |
                    Q(username__icontains=search) |
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search)
                )
            else:
                # For non-numeric search terms, do exact or prefix matching
                queryset = queryset.filter(
                    Q(username__iexact=search) |  # Exact match
                    Q(username__istartswith=search) |  # Prefix match
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search)
                )
        return queryset


class PostListCreateView(generics.ListCreateAPIView):
    queryset = Post.objects.select_related('user').all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class PostDeleteView(generics.DestroyAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise PermissionDenied('Not allowed to delete this post.')
        super().perform_destroy(instance)


class LikePostView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        """Like a post"""
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
        
        like, created = Like.objects.get_or_create(user=request.user, post=post)
        if created:
            # Update likes count
            post.likes_count += 1
            post.save(update_fields=['likes_count'])
            
            # Create notification for like (only if the post owner is not the liker)
            if post.user != request.user:
                Notification.objects.create(
                    recipient=post.user,
                    actor=request.user,
                    notification_type='like',
                    post=post,
                    message=f'{request.user.username} liked your post'
                )
            
            return Response({'liked': True, 'likes_count': post.likes_count})
        else:
            return Response({'error': 'Already liked'}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, post_id):
        """Unlike a post"""
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            like = Like.objects.get(user=request.user, post=post)
            like.delete()
            # Update likes count
            post.likes_count = max(0, post.likes_count - 1)
            post.save(update_fields=['likes_count'])
            return Response({'liked': False, 'likes_count': post.likes_count})
        except Like.DoesNotExist:
            return Response({'error': 'Not liked'}, status=status.HTTP_400_BAD_REQUEST)


class CommentPostView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        """Comment on a post"""
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
        
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Comment content is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the comment
        comment = Comment.objects.create(
            user=request.user,
            post=post,
            content=content
        )
        
        # Create notification for comment (only if the post owner is not the commenter)
        if post.user != request.user:
            Notification.objects.create(
                recipient=post.user,
                actor=request.user,
                notification_type='comment',
                post=post,
                message=f'{request.user.username} commented on your post: {content[:50]}{"..." if len(content) > 50 else ""}'
            )
        
        serializer = CommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DeleteCommentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, comment_id):
        """Delete a comment"""
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is the owner of the comment or the post
        if comment.user != request.user and comment.post.user != request.user:
            return Response({'error': 'Not allowed to delete this comment'}, status=status.HTTP_403_FORBIDDEN)
        
        comment.delete()
        return Response({'detail': 'Comment deleted'}, status=status.HTTP_200_OK)


class UsernamePreviewView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        email = request.data.get('email', '').strip()
        
        if not first_name:
            return Response({'error': 'First name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate username using same logic as RegisterSerializer
        if last_name:
            base_username = f"{first_name.lower()}{last_name.lower()}"
        else:
            base_username = first_name.lower()
        
        username = base_username
        
        # Check if username exists, if so use email prefix
        if User.objects.filter(username=username).exists():
            email_prefix = email.split('@')[0] if '@' in email else ''
            if email_prefix:
                username = email_prefix
                # If email prefix also exists, add counter
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{email_prefix}{counter}"
                    counter += 1
        
        return Response({'username': username})


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get current user's profile"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Update current user's profile"""
        # Allow updating bio, two_factor_enabled, and biometric_enabled
        allowed_fields = {'bio', 'two_factor_enabled', 'biometric_enabled'}
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}
        
        serializer = UserSerializer(request.user, data=update_data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Simplified Biometric Authentication Views (WebAuthn implementation)
import secrets
import base64
import json
import hashlib
from django.utils import timezone
class BiometricChallengeView(APIView):
    def get_permissions(self):
        """Allow unauthenticated access for authentication challenges"""
        if self.request.method == 'POST':
            action = self.request.data.get('action')
            if action == 'authenticate':
                return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def post(self, request):
        """Generate a challenge for biometric registration/authentication"""
        action = request.data.get('action')
        if action not in ['register', 'authenticate']:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate a cryptographic challenge
        challenge = secrets.token_bytes(32)
        challenge_b64 = base64.b64encode(challenge).decode('utf-8')

        if action == 'register':
            # For registration, user must be authenticated
            if not request.user.is_authenticated:
                return Response({'error': 'Authentication required for registration'}, status=status.HTTP_401_UNAUTHORIZED)

            # Store challenge in user model for verification
            request.user.biometric_challenge = challenge_b64
            request.user.biometric_action = action
            request.user.save(update_fields=['biometric_challenge', 'biometric_action'])

            # Create challenge response for registration
            challenge_data = {
                'challenge': challenge_b64,
                'rp': {
                    'name': 'React Pics Share',
                    'id': 'localhost'  # In production, use your actual domain
                },
                'user': {
                    'id': base64.b64encode(str(request.user.id).encode()).decode(),
                    'name': request.user.username,
                    'displayName': request.user.get_full_name() or request.user.username
                },
                'pubKeyCredParams': [
                    {'alg': -7, 'type': 'public-key'},  # ES256
                    {'alg': -257, 'type': 'public-key'}  # RS256
                ],
                'timeout': 60000,
                'attestation': 'direct'
            }
        else:  # action == 'authenticate'
            # For authentication, we need to know which user or provide a way to identify them
            # For now, we'll require a username to be passed for authentication
            username = request.data.get('username')
            if not username:
                return Response({'error': 'Username required for biometric authentication'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

            # Check if user has biometric enabled
            if not user.biometric_enabled:
                return Response({'error': 'Biometric login not enabled for this user'}, status=status.HTTP_400_BAD_REQUEST)

            # Store challenge temporarily (we'll verify it during authentication)
            user.biometric_challenge = challenge_b64
            user.biometric_action = action
            user.save(update_fields=['biometric_challenge', 'biometric_action'])

            # Get user's biometric credentials
            from .models import BiometricCredential
            credentials = BiometricCredential.objects.filter(user=user)
            if not credentials.exists():
                return Response({'error': 'No biometric credentials registered'}, status=status.HTTP_400_BAD_REQUEST)

            # Create challenge response for authentication
            challenge_data = {
                'challenge': challenge_b64,
                'allowCredentials': [
                    {
                        'type': 'public-key',
                        'id': base64.b64encode(base64.urlsafe_b64decode(cred.credential_id + '==')).decode('utf-8'),
                        'debug_info': f'Credential for user {user.username}, created {cred.created_at}'
                    } for cred in credentials
                ],
                'timeout': 60000
            }

        return Response(challenge_data)


class BiometricRegisterView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Register biometric authentication (WebAuthn)"""
        try:
            credential_data = request.data.get('credential')
            if not credential_data:
                return Response({'error': 'Credential data required'}, status=status.HTTP_400_BAD_REQUEST)

            # Parse the credential response
            credential = json.loads(credential_data)

            # Verify the credential ID and public key
            credential_id_b64url = credential.get('id')
            public_key = credential.get('publicKey')

            if not credential_id_b64url or not public_key:
                return Response({'error': 'Invalid credential data'}, status=status.HTTP_400_BAD_REQUEST)

            # Convert base64url to base64 for storage
            # Add padding if needed
            missing_padding = len(credential_id_b64url) % 4
            if missing_padding:
                credential_id_b64url += '=' * (4 - missing_padding)
            
            # Convert from base64url to bytes, then to base64
            credential_id_bytes = base64.urlsafe_b64decode(credential_id_b64url)
            credential_id_b64 = base64.b64encode(credential_id_bytes).decode('utf-8')

            # Store the credential
            from .models import BiometricCredential
            BiometricCredential.objects.create(
                user=request.user,
                credential_id=credential_id_b64,
                public_key=json.dumps(public_key)
            )

            # Enable biometric login for the user
            request.user.biometric_enabled = True
            request.user.save(update_fields=['biometric_enabled'])

            return Response({'detail': 'Biometric authentication registered successfully'})

        except Exception as e:
            print(f"Biometric registration error: {e}")
            return Response({'error': 'Failed to register biometric credential'}, status=status.HTTP_400_BAD_REQUEST)


class BiometricAuthenticateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Authenticate using biometric (WebAuthn)"""
        try:
            credential_data = request.data.get('credential')
            if not credential_data:
                return Response({'error': 'Credential data required'}, status=status.HTTP_400_BAD_REQUEST)

            # Parse the credential response
            credential = json.loads(credential_data)

            # Get the credential ID
            credential_id = credential.get('id')
            if not credential_id:
                return Response({'error': 'Invalid credential data'}, status=status.HTTP_400_BAD_REQUEST)

            # Convert base64url to standard base64 for database lookup
            missing_padding = len(credential_id) % 4
            if missing_padding:
                credential_id += '=' * (4 - missing_padding)
            credential_id_bytes = base64.urlsafe_b64decode(credential_id)
            credential_id_b64 = base64.b64encode(credential_id_bytes).decode('utf-8')

            # Find the user by credential
            from .models import BiometricCredential
            try:
                bio_cred = BiometricCredential.objects.get(credential_id=credential_id_b64)
                user = bio_cred.user
            except BiometricCredential.DoesNotExist:
                return Response({'error': 'Biometric credential not found'}, status=status.HTTP_400_BAD_REQUEST)

            # Verify user has biometric enabled
            if not user.biometric_enabled:
                return Response({'error': 'Biometric login not enabled for this user'}, status=status.HTTP_400_BAD_REQUEST)

            # Update last used timestamp
            bio_cred.last_used_at = timezone.now()
            bio_cred.save(update_fields=['last_used_at'])

            # Return JWT tokens
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'is_verified': user.is_verified,
                    'two_factor_enabled': user.two_factor_enabled,
                    'biometric_enabled': user.biometric_enabled,
                    'bio': user.bio,
                    'profile_pic': user.profile_pic.url if user.profile_pic else None,
                }
            })

        except Exception as e:
            print(f"Biometric authentication error: {e}")
            return Response({'error': 'Biometric authentication failed'}, status=status.HTTP_400_BAD_REQUEST)


# Follow System Views
class FollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        try:
            to_follow = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if request.user == to_follow:
            return Response({'error': 'Cannot follow yourself'}, status=status.HTTP_400_BAD_REQUEST)
        
        if Follow.objects.filter(follower=request.user, followed=to_follow).exists():
            return Response({'error': 'Already following'}, status=status.HTTP_400_BAD_REQUEST)
        
        if FollowRequest.objects.filter(requester=request.user, recipient=to_follow).exists():
            return Response({'error': 'Follow request already sent'}, status=status.HTTP_400_BAD_REQUEST)
        
        if to_follow.is_private:
            FollowRequest.objects.create(requester=request.user, recipient=to_follow)
            # Create notification for follow request
            Notification.objects.create(
                recipient=to_follow,
                actor=request.user,
                notification_type='follow_request',
                message=f'{request.user.username} wants to follow you'
            )
            return Response({'detail': 'Follow request sent'}, status=status.HTTP_200_OK)
        else:
            Follow.objects.create(follower=request.user, followed=to_follow)
            # Create notification for follow
            Notification.objects.create(
                recipient=to_follow,
                actor=request.user,
                notification_type='follow_accept',
                message=f'{request.user.username} started following you'
            )
            return Response({'followed': True}, status=status.HTTP_200_OK)


class UnfollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        try:
            target = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        follow = Follow.objects.filter(follower=request.user, followed=target)
        if follow.exists():
            follow.delete()
            return Response({'detail': 'Unfollowed'}, status=status.HTTP_200_OK)
        
        req = FollowRequest.objects.filter(requester=request.user, recipient=target)
        if req.exists():
            req.delete()
            return Response({'detail': 'Follow request cancelled'}, status=status.HTTP_200_OK)
        
        return Response({'error': 'Not following or requested'}, status=status.HTTP_400_BAD_REQUEST)


class FollowersListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return User.objects.none()
        
        # Allow users to see their own followers
        if user == self.request.user:
            follower_ids = Follow.objects.filter(followed_id=user_id).values_list('follower_id', flat=True)
            return User.objects.filter(id__in=follower_ids)
        
        # Check privacy settings for other users
        if user.is_private and not Follow.objects.filter(follower=self.request.user, followed=user).exists():
            # For private users that the current user doesn't follow, return an empty queryset
            return User.objects.none()
        
        follower_ids = Follow.objects.filter(followed_id=user_id).values_list('follower_id', flat=True)
        return User.objects.filter(id__in=follower_ids)


class FollowingListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return User.objects.none()
        
        # Allow users to see their own following
        if user == self.request.user:
            following_ids = Follow.objects.filter(follower_id=user_id).values_list('followed_id', flat=True)
            return User.objects.filter(id__in=following_ids)
        
        # Check privacy settings for other users
        if user.is_private and not Follow.objects.filter(follower=self.request.user, followed=user).exists():
            return User.objects.none()
        
        following_ids = Follow.objects.filter(follower_id=user_id).values_list('followed_id', flat=True)
        return User.objects.filter(id__in=following_ids)


class UserPostsListView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Post.objects.none()
        
        # Allow users to see their own posts
        if user == self.request.user:
            return Post.objects.filter(user_id=user_id).select_related('user').order_by('-created_at')
        
        # Check privacy settings for other users
        if user.is_private and not Follow.objects.filter(follower=self.request.user, followed=user).exists():
            return Post.objects.none()
        
        return Post.objects.filter(user_id=user_id).select_related('user').order_by('-created_at')


class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        user = self.get_object()
        # Allow users to see their own profile
        if user == request.user:
            return super().get(request, *args, **kwargs)
        # Check privacy settings for other users
        if user.is_private and not Follow.objects.filter(follower=request.user, followed=user).exists():
            return Response({'detail': 'This account is private'}, status=status.HTTP_403_FORBIDDEN)
        return super().get(request, *args, **kwargs)


class PendingFollowRequestsView(generics.ListAPIView):
    serializer_class = FollowRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FollowRequest.objects.filter(recipient=self.request.user).select_related('requester')


class AcceptFollowRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, requester_id):
        try:
            requester = User.objects.get(id=requester_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        req = FollowRequest.objects.filter(requester=requester, recipient=request.user)
        if not req.exists():
            return Response({'error': 'No follow request found'}, status=status.HTTP_404_NOT_FOUND)
        
        Follow.objects.create(follower=requester, followed=request.user)
        req.delete()
        
        # Create notification for follow accept
        Notification.objects.create(
            recipient=requester,
            actor=request.user,
            notification_type='follow_accept',
            message=f'{request.user.username} accepted your follow request'
        )
        
        # Mark the follow_request notification as read for the recipient (current user)
        Notification.objects.filter(
            recipient=request.user,
            actor=requester,
            notification_type='follow_request'
        ).update(is_read=True)
        
        return Response({'detail': 'Follow request accepted'})


class RejectFollowRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, requester_id):
        try:
            requester = User.objects.get(id=requester_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        req = FollowRequest.objects.filter(requester=requester, recipient=request.user)
        if req.exists():
            req.delete()
            # Mark the follow_request notification as read for the recipient (current user)
            Notification.objects.filter(
                recipient=request.user,
                actor=requester,
                notification_type='follow_request'
            ).update(is_read=True)
            return Response({'detail': 'Follow request rejected'})
        
        return Response({'error': 'No follow request found'}, status=status.HTTP_404_NOT_FOUND)


class CommentPostView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        """Add a comment to a post"""
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
        
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Content is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the comment
        comment = Comment.objects.create(
            user=request.user,
            post=post,
            content=content
        )
        
        # Serialize the comment for response
        serializer = CommentSerializer(comment)
        
        # Create notification for post owner (if it's not their own post)
        if post.user != request.user:
            Notification.objects.create(
                recipient=post.user,
                actor=request.user,
                notification_type='comment',
                post=post,
                message=f"{request.user.username} commented on your post: {content[:50]}{'...' if len(content) > 50 else ''}"
            )
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DeleteCommentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, comment_id):
        """Delete a comment"""
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is the comment owner or post owner
        if comment.user != request.user and comment.post.user != request.user:
            return Response({'error': 'Not allowed to delete this comment'}, status=status.HTTP_403_FORBIDDEN)
        
        comment.delete()
        return Response({'detail': 'Comment deleted'}, status=status.HTTP_200_OK)



class CheckFollowStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if target_user == request.user:
            return Response({'status': 'self'})
        
        # Check if already following
        if Follow.objects.filter(follower=request.user, followed=target_user).exists():
            return Response({'status': 'following'})
        
        # Check if follow request sent
        if FollowRequest.objects.filter(requester=request.user, recipient=target_user).exists():
            return Response({'status': 'requested'})
        
        return Response({'status': 'not_following'})


class DeviceListView(generics.ListAPIView):
    serializer_class = DeviceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserDevice.objects.filter(user=self.request.user, is_active=True)


class LogoutDeviceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, device_id):
        try:
            device = UserDevice.objects.get(id=device_id, user=request.user)
        except UserDevice.DoesNotExist:
            return Response({'error': 'Device not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Don't allow logging out current device
        # We can identify current device by session or token if needed
        device.is_active = False
        device.save()
        return Response({'detail': 'Device logged out successfully'})


class LogoutAllDevicesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Log out all devices except current one
        UserDevice.objects.filter(user=request.user).update(is_active=False)
        return Response({'detail': 'All devices logged out successfully'})


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class MarkNotificationAsReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, notification_id):
        try:
            notification = Notification.objects.get(id=notification_id, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
        
        notification.is_read = True
        notification.save()
        return Response({'detail': 'Notification marked as read'})


class MarkAllNotificationsAsReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'All notifications marked as read'})
