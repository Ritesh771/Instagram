from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from api.models import User, UserDevice, Follow, FollowRequest, Post
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from django.utils import timezone
import uuid

class LogoutTestCase(TestCase):
    def setUp(self):
        # Create test users
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            username='testuser1',
            email='test1@example.com',
            password='testpass123',
            is_verified=True,  # Required for login
            is_private=True
        )
        self.user2 = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123',
            is_verified=True,
            is_private=False
        )
        
        # Create test devices for user1
        self.device1 = UserDevice.objects.create(
            user=self.user1,
            device_name='Test Device 1',
            os='Windows',
            browser='Chrome',
            ip_address='127.0.0.1',
            session_token=str(uuid.uuid4()),
            is_active=True
        )
        self.device2 = UserDevice.objects.create(
            user=self.user1,
            device_name='Test Device 2',
            os='iOS',
            browser='Safari',
            ip_address='127.0.0.2',
            session_token=str(uuid.uuid4()),
            is_active=True
        )

        # Create test device for user2
        self.device3 = UserDevice.objects.create(
            user=self.user2,
            device_name='Test Device 3',
            os='Android',
            browser='Chrome',
            ip_address='127.0.0.3',
            session_token=str(uuid.uuid4()),
            is_active=True
        )

        # Get tokens for authentication
        self.refresh_token1 = RefreshToken.for_user(self.user1)
        self.access_token1 = str(self.refresh_token1.access_token)
        self.refresh_token2 = RefreshToken.for_user(self.user2)
        self.access_token2 = str(self.refresh_token2.access_token)

    def test_valid_logout_single_device(self):
        """TC1: Test valid logout for a single device"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token1}')
        response = self.client.delete(
            reverse('logout-device', kwargs={'device_id': self.device1.id}),
            {'refresh_token': str(self.refresh_token1)},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.device1.refresh_from_db()
        self.assertFalse(self.device1.is_active)
        # Verify token blacklisting
        self.assertTrue(BlacklistedToken.objects.filter(token__user=self.user1).exists())

    def test_logout_inactive_device(self):
        """TC2: Test logout attempt on already inactive device"""
        self.device1.is_active = False
        self.device1.save()
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token1}')
        response = self.client.delete(
            reverse('logout-device', kwargs={'device_id': self.device1.id}),
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_logout_invalid_token(self):
        """TC3: Test logout with invalid token"""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token')
        response = self.client.delete(
            reverse('logout-device', kwargs={'device_id': self.device1.id}),
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_another_users_device(self):
        """TC4: Test attempting to logout another user's device"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token1}')
        response = self.client.delete(
            reverse('logout-device', kwargs={'device_id': self.device3.id}),
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.device3.refresh_from_db()
        self.assertTrue(self.device3.is_active)

    def test_logout_all_devices(self):
        """TC5: Test logging out from all devices"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token1}')
        current_session = self.device1.session_token
        response = self.client.post(
            reverse('logout-all-devices'),
            {'current_session_token': current_session},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.device1.refresh_from_db()
        self.device2.refresh_from_db()
        self.assertTrue(self.device1.is_active)  # Current session remains active
        self.assertFalse(self.device2.is_active)
        # Verify token blacklisting
        self.assertTrue(BlacklistedToken.objects.filter(token__user=self.user1).exists())

    def test_logout_all_no_active_devices(self):
        """TC6: Test logout all when no active devices exist"""
        UserDevice.objects.filter(user=self.user1).update(is_active=False)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token1}')
        response = self.client.post(
            reverse('logout-all-devices'),
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_all_invalid_token(self):
        """TC7: Test logout all with invalid token"""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token')
        response = self.client.post(
            reverse('logout-all-devices'),
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_active_devices(self):
        """TC8: Test listing active device sessions"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token1}')
        response = self.client.get(reverse('device-list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Two active devices for user1
        self.assertEqual(response.data[0]['device_name'], 'Test Device 1')
        self.assertEqual(response.data[1]['device_name'], 'Test Device 2')

    def test_list_no_active_devices(self):
        """TC9: Test listing devices when no active sessions exist"""
        UserDevice.objects.filter(user=self.user1).update(is_active=False)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token1}')
        response = self.client.get(reverse('device-list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_list_devices_unauthorized(self):
        """TC10: Test listing devices without authentication"""
        response = self.client.get(reverse('device-list'))
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_reuse_after_logout(self):
        """TC11: Test token reuse after logout"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token1}')
        response = self.client.delete(
            reverse('logout-device', kwargs={'device_id': self.device1.id}),
            {'refresh_token': str(self.refresh_token1)},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Try to use same token
        response = self.client.get(reverse('device-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_all_except_current(self):
        """TC12: Test logging out all devices except current session"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token1}')
        current_session = self.device1.session_token
        response = self.client.post(
            reverse('logout-all-devices'),
            {'current_session_token': current_session},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.device1.refresh_from_db()
        self.device2.refresh_from_db()
        self.assertTrue(self.device1.is_active)
        self.assertFalse(self.device2.is_active)

    def test_concurrent_logouts(self):
        """TC13: Test handling of multiple concurrent logout requests"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token1}')
        devices = []
        for i in range(3, 8):  # Create 5 additional devices
            device = UserDevice.objects.create(
                user=self.user1,
                device_name=f'Test Device {i}',
                os='Android',
                browser='Chrome',
                ip_address=f'127.0.0.{i}',
                session_token=str(uuid.uuid4()),
                is_active=True
            )
            devices.append(device)
        
        responses = []
        for device in devices:
            response = self.client.delete(
                reverse('logout-device', kwargs={'device_id': device.id}),
                {'refresh_token': str(self.refresh_token1)},  # Use same refresh token for simplicity
                format='json'
            )
            responses.append(response)
        
        for response in responses:
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        for device in devices:
            device.refresh_from_db()
            self.assertFalse(device.is_active)

    def test_follow_private_account(self):
        """TC14: Test requesting to follow a private account"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token2}')
        response = self.client.post(
            reverse('follow-user', kwargs={'user_id': self.user1.id}),
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['detail'], 'Follow request sent')
        self.assertTrue(FollowRequest.objects.filter(
            requester=self.user2,
            recipient=self.user1
        ).exists())

    def test_access_private_profile(self):
        """TC15: Test accessing private profile without follow"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token2}')
        response = self.client.get(
            reverse('user-detail', kwargs={'pk': self.user1.id})
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['detail'], 'This account is private')

    def test_access_private_profile_after_follow(self):
        """TC16: Test accessing private profile after follow accepted"""
        # Create follow request
        FollowRequest.objects.create(requester=self.user2, recipient=self.user1)
        # Accept follow request
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token1}')
        response = self.client.post(
            reverse('accept-request', kwargs={'requester_id': self.user2.id}),
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Access profile
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token2}')
        response = self.client.get(
            reverse('user-detail', kwargs={'pk': self.user1.id})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_post_visibility_private_account(self):
        """TC17: Test post visibility for private account"""
        # Create post for user1
        post = Post.objects.create(
            user=self.user1,
            image='posts/test.jpg',
            caption='Test post'
        )
        
        # Try to access posts as user2 (not following)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token2}')
        response = self.client.get(reverse('posts'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)  # No posts visible
        
        # Follow and accept
        FollowRequest.objects.create(requester=self.user2, recipient=self.user1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token1}')
        self.client.post(
            reverse('accept-request', kwargs={'requester_id': self.user2.id}),
            format='json'
        )
        
        # Retry accessing posts
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token2}')
        response = self.client.get(reverse('posts'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # Post now visible