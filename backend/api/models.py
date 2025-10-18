
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta
import uuid


class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    biometric_enabled = models.BooleanField(default=False)
    biometric_challenge = models.CharField(max_length=100, blank=True, null=True)
    biometric_action = models.CharField(max_length=20, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    profile_pic = models.ImageField(upload_to='profiles/', blank=True, null=True)
    is_private = models.BooleanField(default=True)
   
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']
    @property
    def followers_count(self):
        """Returns the number of users following this user."""
        return self.followers.count()  # Uses related_name='followers' from Follow model
    @property
    def following_count(self):
        """Returns the number of users this user is following."""
        return self.following.count()
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

class Follow(models.Model):
    follower = models.ForeignKey('api.User', on_delete=models.CASCADE, related_name='following')
    followed = models.ForeignKey('api.User', on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ['follower', 'followed']
        ordering = ['-created_at']
    def __str__(self) -> str:
        return f"{self.follower.username} follows {self.followed.username}"

class FollowRequest(models.Model):
    requester = models.ForeignKey('api.User', on_delete=models.CASCADE, related_name='sent_requests')
    recipient = models.ForeignKey('api.User', on_delete=models.CASCADE, related_name='received_requests')
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ['requester', 'recipient']
    def __str__(self) -> str:
        return f"{self.requester.username} requested to follow {self.recipient.username}"

class UserDevice(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='devices')
    session_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)  # Unique per login
    device_name = models.CharField(max_length=255)  # e.g., "Windows Chrome"
    os = models.CharField(max_length=100)  # e.g., "Windows"
    browser = models.CharField(max_length=100)  # e.g., "Chrome"
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    login_time = models.DateTimeField(default=timezone.now)
    last_activity = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-login_time']
    def __str__(self):
        return f"{self.user.username} - {self.device_name} ({self.login_time})"
    def touch(self):
        """Update last activity."""
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])


class Comment(models.Model):
    user = models.ForeignKey('api.User', on_delete=models.CASCADE, related_name='comments')
    post = models.ForeignKey('api.Post', on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Comment by {self.user.username} on Post({self.post.id})"


class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('follow_request', 'Follow Request'),
        ('follow_accept', 'Follow Accept'),
        ('like', 'Like'),
        ('comment', 'Comment'),
        ('mention', 'Mention'),
    )
    
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='actions')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Notification for {self.recipient.username}: {self.message}"
