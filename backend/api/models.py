from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    biometric_enabled = models.BooleanField(default=False)
    biometric_challenge = models.CharField(max_length=100, blank=True, null=True)
    biometric_action = models.CharField(max_length=20, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    profile_pic = models.ImageField(upload_to='profiles/', blank=True, null=True)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    def __str__(self) -> str:
        return self.username


class BiometricCredential(models.Model):
    user = models.ForeignKey('api.User', on_delete=models.CASCADE, related_name='biometric_credentials')
    credential_id = models.CharField(max_length=255, unique=True)
    public_key = models.TextField()
    sign_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"BiometricCredential for {self.user.username}"


class OTP(models.Model):
    PURPOSE_CHOICES = (
        ('register', 'Register'),
        ('reset', 'Reset'),
        ('login', 'Login'),
    )

    user = models.ForeignKey('api.User', on_delete=models.CASCADE, related_name='otps')
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=10, choices=PURPOSE_CHOICES)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"OTP({self.purpose}) for {self.user.username}"


class Post(models.Model):
    user = models.ForeignKey('api.User', on_delete=models.CASCADE, related_name='posts')
    image = models.ImageField(upload_to='posts/')
    caption = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    likes_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Post({self.id}) by {self.user.username}"


class Like(models.Model):
    user = models.ForeignKey('api.User', on_delete=models.CASCADE, related_name='likes')
    post = models.ForeignKey('api.Post', on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'post']
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Like by {self.user.username} on Post({self.post.id})"
