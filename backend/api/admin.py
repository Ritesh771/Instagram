from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User, Post, OTP, Follow, FollowRequest

@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ('username', 'email', 'is_verified', 'is_private', 'is_staff', 'date_joined', 'followers_count', 'following_count')
    list_filter = ('is_verified', 'is_private', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email')
    readonly_fields = ('followers_count', 'following_count')
    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'bio', 'profile_pic', 'is_private')}),
        ('Permissions', {'fields': ('is_active', 'is_verified', 'is_staff', 'is_superuser', 'two_factor_enabled', 'biometric_enabled')}),
        ('Dates', {'fields': ('date_joined', 'last_login')}),
        ('Counts', {'fields': ('followers_count', 'following_count')}),
    )

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'caption', 'created_at', 'likes_count')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'caption')
    readonly_fields = ('likes_count',)

@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ('user', 'purpose', 'code', 'is_used', 'created_at', 'expires_at')
    list_filter = ('purpose', 'is_used')
    search_fields = ('user__username', 'user__email', 'code')

@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ('follower', 'followed', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('follower__username', 'followed__username')

@admin.register(FollowRequest)
class FollowRequestAdmin(admin.ModelAdmin):
    list_display = ('requester', 'recipient', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('requester__username', 'recipient__username')