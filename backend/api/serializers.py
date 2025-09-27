from datetime import timedelta

from django.utils import timezone
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from rest_framework import serializers

from .models import User, Post, OTP, Like


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'password']

    def create(self, validated_data):
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name', '')
        password = validated_data.pop('password')
        
        # Generate username from first and last name
        if last_name.strip():
            base_username = f"{first_name.lower()}{last_name.lower()}"
        else:
            base_username = first_name.lower()
        
        username = base_username
        
        # Check if username exists, if so use email prefix as username
        if User.objects.filter(username=username).exists():
            email = validated_data.get('email', '')
            username = email.split('@')[0] if '@' in email else base_username
            # If email prefix also exists, keep trying with counter (fallback)
            counter = 1
            original_username = username
            while User.objects.filter(username=username).exists():
                username = f"{original_username}{counter}"
                counter += 1
        
        user = User(
            username=username,
            first_name=first_name,
            last_name=last_name,
            **validated_data
        )
        user.set_password(password)
        user.is_active = True
        user.save()
        return user


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)

    def validate(self, attrs):
        email = attrs['email']
        code = attrs['code']
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({'email': 'User not found'})
        now = timezone.now()
        otp_qs = OTP.objects.filter(user=user, purpose='register', code=code, is_used=False, expires_at__gte=now)
        if not otp_qs.exists():
            raise serializers.ValidationError({'code': 'Invalid or expired code'})
        attrs['user'] = user
        return attrs


class ResetPasswordRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate(self, attrs):
        email = attrs['email']
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({'email': 'User not found'})
        attrs['user'] = user
        return attrs


class ResetPasswordConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs['email']
        code = attrs['code']
        new_password = attrs['new_password']
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({'email': 'User not found'})
        now = timezone.now()
        otp_qs = OTP.objects.filter(user=user, purpose='reset', code=code, is_used=False, expires_at__gte=now)
        if not otp_qs.exists():
            raise serializers.ValidationError({'code': 'Invalid or expired code'})
        try:
            validate_password(new_password, user)
        except ValidationError as e:
            raise serializers.ValidationError({'new_password': e.messages})
        attrs['user'] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_verified', 'two_factor_enabled', 'bio', 'profile_pic', 'biometric_enabled']
        read_only_fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_verified']


class PostSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    is_liked = serializers.SerializerMethodField()
    likes_count = serializers.ReadOnlyField()

    class Meta:
        model = Post
        fields = ['id', 'user', 'image', 'caption', 'created_at', 'likes_count', 'is_liked']

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

