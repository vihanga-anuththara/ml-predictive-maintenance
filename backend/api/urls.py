from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompanyViewSet, DeviceViewSet, DeviceHealthLogViewSet, MaintenanceRecordViewSet, 
    predict_device_risk, get_device_risks, RegisterView, LoginView, ContractViewSet, TechnicianTaskViewSet, 
    SystemUserViewSet, change_password, VerifyLoginOTPView, setup_2fa, verify_and_enable_2fa, disable_2fa, 
    SystemLogAPIView, ClearSystemLogsAPIView, check_2fa_status, user_preferences, trash_manager
)

# API Router for CRUD operations
router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'devices', DeviceViewSet)
router.register(r'device-health-logs', DeviceHealthLogViewSet) 
router.register(r'maintenance', MaintenanceRecordViewSet)
router.register(r'contracts', ContractViewSet)
router.register(r'tasks', TechnicianTaskViewSet)
router.register(r'system-users', SystemUserViewSet)

urlpatterns = [
    # Authentication and Security Links
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('login-verify-otp/', VerifyLoginOTPView.as_view(), name='login-verify-otp'),
    path('change-password/', change_password, name='change_password'), 
    path('setup-2fa/', setup_2fa, name='setup-2fa'),
    path('verify-2fa/', verify_and_enable_2fa, name='verify-2fa'),
    path('disable-2fa/', disable_2fa, name='disable-2fa'),
    path('check-2fa-status/', check_2fa_status, name='check-2fa-status'), 
    path('trash/', trash_manager, name='trash_manager'),
    
    # User Preferences Link (New Notification Settings)
    path('my-preferences/', user_preferences, name='my-preferences'),
    
    # ML Endpoint Links
    path('predict-risk/', predict_device_risk, name='predict-risk'),
    path('device-risks/', get_device_risks, name='device-risks'),
    
    # System Logs Links
    path('system-logs/', SystemLogAPIView.as_view(), name='system-logs'),
    path('system-logs/clear/', ClearSystemLogsAPIView.as_view(), name='clear-system-logs'),
    
    # CRUD API Links
    path('', include(router.urls)), 
]