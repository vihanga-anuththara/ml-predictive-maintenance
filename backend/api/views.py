import os
import joblib 
import pyotp
from django.db import transaction 
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from datetime import date
from google import genai 
from .models import Company, Device, DeviceHealthLog, MaintenanceRecord, Contract, TechnicianTask, SystemUser, SystemLog
from .serializers import (
    CompanySerializer, DeviceSerializer, DeviceHealthLogSerializer, 
    MaintenanceRecordSerializer, ContractSerializer, TechnicianTaskSerializer, SystemUserSerializer, SystemLogSerializer
)

# Authentication and User Management Views
class RegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        data = request.data
        email = data.get('email', '')
        password = data.get('password', '')
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        requested_role = data.get('role', 'Technician')
        username = data.get('username', email) 

        if not username or not password:
            return Response({"error": "Email and Password are required!"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if User.objects.filter(username=username).exists() or User.objects.filter(email=email).exists():
                return Response({"error": "An account with this email already exists!"}, status=status.HTTP_400_BAD_REQUEST)
            
            user = User.objects.create_user(username=username, email=email, password=password, first_name=first_name, last_name=last_name)
            if requested_role == 'Admin':
                user.is_staff = True
                user.is_superuser = False
                user.save()
            return Response({"message": "Account created successfully!"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=email, password=password)
        
        if user:
            sys_user = SystemUser.objects.filter(email=user.email).first()
            
            if sys_user and sys_user.is_2fa_enabled:
                return Response({
                    "message": "OTP_REQUIRED", 
                    "email": user.email
                }, status=status.HTTP_200_OK)

            refresh = RefreshToken.for_user(user)
            real_role = 'Admin' if user.is_staff or user.is_superuser else 'Technician'
            
            # Record Log
            SystemLog.objects.create(user=f"{user.first_name} {user.last_name}", action="Logged into the system", status="Success")

            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'name': f"{user.first_name} {user.last_name}",
                'role': real_role
            })
        else:
            return Response({"error": "Invalid Credentials"}, status=status.HTTP_401_UNAUTHORIZED)

class VerifyLoginOTPView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code', '').strip()
        
        user = User.objects.filter(email=email).first() or User.objects.filter(username=email).first()
        if not user:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
        sys_user = SystemUser.objects.filter(email=user.email).first()
        if not sys_user or not sys_user.totp_secret:
            return Response({"error": "2FA is not setup"}, status=status.HTTP_400_BAD_REQUEST)
            
        totp = pyotp.TOTP(sys_user.totp_secret)
        
        if totp.verify(code) or code == sys_user.totp_secret:
            refresh = RefreshToken.for_user(user)
            real_role = 'Admin' if user.is_staff or user.is_superuser else 'Technician'
            
            # Record Log
            SystemLog.objects.create(user=f"{user.first_name} {user.last_name}", action="Logged in using 2FA/Recovery", status="Success")

            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'name': f"{user.first_name} {user.last_name}",
                'role': real_role
            })
        
        # Log Failed 2FA
        SystemLog.objects.create(user=f"{user.first_name} {user.last_name}", action="Failed 2FA attempt", status="Warning")
        return Response({"error": "Invalid Authenticator Code"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def setup_2fa(request):
    sys_user = SystemUser.objects.filter(email=request.user.email).first()
    if not sys_user:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
    if not sys_user.totp_secret:
        sys_user.totp_secret = pyotp.random_base32()
        sys_user.save()
        
    totp = pyotp.TOTP(sys_user.totp_secret)
    provisioning_uri = totp.provisioning_uri(name=sys_user.email, issuer_name="Predict Failures System")
    
    return Response({"qr_uri": provisioning_uri, "secret": sys_user.totp_secret})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_and_enable_2fa(request):
    code = request.data.get('code')
    sys_user = SystemUser.objects.filter(email=request.user.email).first()
    
    totp = pyotp.TOTP(sys_user.totp_secret)
    if totp.verify(code):
        sys_user.is_2fa_enabled = True
        sys_user.save()
        SystemLog.objects.create(user=sys_user.name, action="Enabled Two-Factor Authentication", status="Success")
        return Response({"message": "Two-Factor Authentication enabled successfully!"})
        
    return Response({"error": "Invalid verification code"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disable_2fa(request):
    sys_user = SystemUser.objects.filter(email=request.user.email).first()
    if sys_user:
        sys_user.is_2fa_enabled = False
        sys_user.totp_secret = None 
        sys_user.save()
        SystemLog.objects.create(user=sys_user.name, action="Disabled Two-Factor Authentication", status="Warning")
        return Response({"message": "2FA disabled successfully."})
    return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    current_password = request.data.get('current')
    new_password = request.data.get('new')
    if not user.check_password(current_password):
        return Response({"error": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(new_password)
    user.save()
    
    admin_name = request.user.first_name or request.user.username
    SystemLog.objects.create(user=admin_name, action="Changed account password", status="Success")
    
    return Response({"message": "Password updated successfully!"}, status=status.HTTP_200_OK)

class SystemUserViewSet(viewsets.ModelViewSet):
    queryset = SystemUser.objects.all()
    serializer_class = SystemUserSerializer

    def perform_update(self, serializer):
        instance = serializer.save() 
        try:
            django_user = User.objects.get(email=instance.email)
            django_user.is_active = instance.status not in ['Inactive', 'Locked']
            django_user.save()
        except User.DoesNotExist:
            pass

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer

    def destroy(self, request, *args, **kwargs):
        try:
            company = self.get_object()
            with transaction.atomic():
                devices = Device.objects.filter(company=company)
                for device in devices:
                    DeviceHealthLog.objects.filter(device=device).delete()
                    MaintenanceRecord.objects.filter(device=device).delete()
                    TechnicianTask.objects.filter(device=device).delete()
                    device.delete() 
                Contract.objects.filter(company=company).delete()
                company.delete()
            return Response({"message": "Successfully deleted!"}, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.all()
    serializer_class = ContractSerializer

class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer

class TechnicianTaskViewSet(viewsets.ModelViewSet):
    queryset = TechnicianTask.objects.all()
    serializer_class = TechnicianTaskSerializer

class DeviceHealthLogViewSet(viewsets.ModelViewSet):
    queryset = DeviceHealthLog.objects.all()
    serializer_class = DeviceHealthLogSerializer

class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRecord.objects.all()
    serializer_class = MaintenanceRecordSerializer

class SystemLogAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logs = SystemLog.objects.all()[:1000]
        serializer = SystemLogSerializer(logs, many=True)
        return Response(serializer.data)

class ClearSystemLogsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        SystemLog.objects.all().delete()
        admin_name = request.user.first_name or request.user.username
        SystemLog.objects.create(
            user=admin_name,
            action="Permanently cleared all system logs",
            status="Warning"
        )
        return Response({"message": "Logs cleared successfully"}, status=status.HTTP_204_NO_CONTENT)

# ML Logic
try:
    model_path = os.path.join(settings.BASE_DIR, 'ml_engine', 'model.pkl')
    device_risk_model = joblib.load(model_path)
except Exception as e:
    device_risk_model = None

@api_view(['GET'])
def get_device_risks(request):
    try:
        logs = DeviceHealthLog.objects.select_related('device', 'device__company').all().order_by('-timestamp')
        devices_data = []
        for log in logs:
            device = log.device
            age_days = (date.today() - device.installed_date).days if device.installed_date else 0
            age_months = age_days // 30
            disk = log.hard_drive_health or 100
            fails = log.past_failure_attempts or 0
            days_maint = (log.repair_history_count * 30) or 0

            model_risk = "Low"
            model_prob = 0
            if device_risk_model:
                features = [[age_months, disk, 65, 75, fails, days_maint]]
                model_risk = str(device_risk_model.predict(features)[0]).capitalize()
                model_prob = int(max(device_risk_model.predict_proba(features)[0]) * 100)

            hard_risk = "Low"
            if disk < 40 or fails > 5: hard_risk = "High"
            elif disk < 70 or fails > 2: hard_risk = "Medium"

            final_risk = "High" if (model_risk == "High" or hard_risk == "High") else ("Medium" if (model_risk == "Medium" or hard_risk == "Medium") else "Low")
            final_prob = model_prob
            if hard_risk == "High" and final_prob < 80: final_prob = 85
            if hard_risk == "Medium" and final_prob < 50: final_prob = 60

            devices_data.append({
                "id": device.id,
                "device": f"{device.name} ({device.company.name})",
                "issue": f"Disk Health: {disk}%, Past Failures: {fails}",
                "riskLevel": final_risk,
                "probability": final_prob,
                "statusText": "Immediate Action Required" if final_risk == 'High' else "Monitoring",
                "age": age_months,
                "disk": disk,
                "cpu": 65, 
                "ram": 75,
                "pastFails": fails,
                "daysSinceMaint": days_maint
            })
        return Response(devices_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def predict_device_risk(request):
    try:
        data = request.data
        gemini_api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.getenv("GEMINI_API_KEY")
        if not gemini_api_key:
            return Response({"error": "Gemini API key is missing."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        client = genai.Client(api_key=gemini_api_key)
        prompt = f"""
        Analyze these hardware metrics and provide maintenance advice (max 1 sentence). 
        IMPORTANT: Ignore device age/installation date. Focus strictly on health and failures:
        - Drive Health: {data.get('disk_usage_percent', 0)}%
        - CPU Temp: {data.get('cpu_temp_avg', 0)}°C
        - RAM Usage: {data.get('ram_usage_percent', 0)}%
        - Past Failures: {data.get('past_failure_count', 0)}
        - Days since maintenance: {data.get('days_since_last_maintenance', 0)}
        """
        response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        return Response({"status": "Success", "ai_advice": response.text}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)