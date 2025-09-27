from datetime import timedelta
import random

from django.utils import timezone
from django.core.mail import send_mail
from django.contrib.auth import authenticate
from django.db import transaction

from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, Post, OTP, Like
from .serializers import (
    RegisterSerializer,
    VerifyOTPSerializer,
    ResetPasswordRequestSerializer,
    ResetPasswordConfirmSerializer,
    PostSerializer,
    UserSerializer,
)


def generate_otp_code() -> str:
    return f"{random.randint(100000, 999999)}"


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

        send_mail(
            subject='Your verification code',
            message=f'Your OTP is {code}. It expires in 10 minutes.',
            from_email=None,
            recipient_list=[user.email],
            fail_silently=False,
        )

        return Response({'detail': 'Registered. Check email for OTP.'}, status=status.HTTP_201_CREATED)


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        user.is_verified = True
        user.save(update_fields=['is_verified'])
        OTP.objects.filter(user=user, purpose='register', is_used=False).update(is_used=True)
        return Response({'detail': 'Account verified.'})


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
            send_mail(
                subject='Your login verification code',
                message=f'Your OTP is {code}. It expires in 10 minutes.',
                from_email=None,
                recipient_list=[user.email],
                fail_silently=False,
            )
            return Response({'detail': '2FA enabled. Check email for OTP.', 'requires_2fa': True})
        
        # No 2FA - return JWT tokens directly
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_verified': user.is_verified,
                'two_factor_enabled': user.two_factor_enabled,
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
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_verified': user.is_verified,
                'two_factor_enabled': user.two_factor_enabled,
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
        send_mail(
            subject='Password reset code',
            message=f'Your OTP is {code}. It expires in 10 minutes.',
            from_email=None,
            recipient_list=[user.email],
            fail_silently=False,
        )
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


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get current user's profile"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Update current user's profile"""
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
