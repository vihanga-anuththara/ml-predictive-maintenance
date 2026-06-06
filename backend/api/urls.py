from .views import predict_device_risk, get_device_risks
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompanyViewSet, DeviceViewSet, DeviceHealthLogViewSet, MaintenanceRecordViewSet, 
    predict_device_risk, RegisterView, LoginView, ContractViewSet, TechnicianTaskViewSet, 
    SystemUserViewSet, change_password, VerifyLoginOTPView, setup_2fa, verify_and_enable_2fa, disable_2fa
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
    # Auth Links
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('change-password/', change_password, name='change_password'), # Password Change 
    path('predict-risk/', predict_device_risk, name='predict-risk'),
    path('device-risks/', get_device_risks, name='device-risks'),
    path('', include(router.urls)), # CRUD API Links
    path('login/', LoginView.as_view(), name='login'),
    path('login-verify-otp/', VerifyLoginOTPView.as_view(), name='login-verify-otp'),
    path('setup-2fa/', setup_2fa, name='setup-2fa'),
    path('verify-2fa/', verify_and_enable_2fa, name='verify-2fa'),
    path('disable-2fa/', disable_2fa, name='disable-2fa'),
]