import os
from django.utils import timezone
import joblib 
import pyotp
import threading
from django.db import transaction 
from django.core.mail import send_mail
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

# Helper Function to send Security Emails in background
def send_security_alert_email(user_email, user_name, action_title, action_desc):
    def send():
        try:
            subject = f"Security Alert: {action_title}"
            message = f"Hello {user_name},\n\nThis is an automated security alert from your Predictive Maintenance System.\n\nEvent: {action_desc}\n\nIf you did not perform this action, please contact the System Administrator immediately to secure your account.\n\nBest Regards,\nSystem Administrator"
            
            send_mail(subject, message, getattr(settings, 'EMAIL_HOST_USER', ''), [user_email], fail_silently=False)
            print(f"Security email sent successfully to {user_email}!")
            
        except Exception as e:
            print(f"CRITICAL SECURITY EMAIL ERROR: {str(e)}")
            
    threading.Thread(target=send).start()

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
            
            SystemLog.objects.create(user=f"{user.first_name} {user.last_name}", action="Logged in using 2FA/Recovery", status="Success")

            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'name': f"{user.first_name} {user.last_name}",
                'role': real_role
            })
        
        SystemLog.objects.create(user=f"{user.first_name} {user.last_name}", action="Failed 2FA attempt", status="Warning")
        
        # Security Alert
        if sys_user.notify_security and sys_user.email:
            send_security_alert_email(sys_user.email, sys_user.name, "Failed Login Attempt", "A failed attempt was made to access your account using an incorrect 2FA code.")

        return Response({"error": "Invalid Authenticator Code"}, status=status.HTTP_400_BAD_REQUEST)

# Notification Preferences API
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_preferences(request):
    sys_user = SystemUser.objects.filter(email=request.user.email).first()
    
    if not sys_user:
        return Response({"error": "User not found"}, status=404)

    if request.method == 'GET':
        return Response({
            "notify_tasks": sys_user.notify_tasks,
            "notify_contracts": sys_user.notify_contracts,
            "notify_security": sys_user.notify_security
        })
        
    elif request.method == 'PUT':
        sys_user.notify_tasks = request.data.get('notify_tasks', sys_user.notify_tasks)
        sys_user.notify_contracts = request.data.get('notify_contracts', sys_user.notify_contracts)
        sys_user.notify_security = request.data.get('notify_security', sys_user.notify_security)
        sys_user.save()
        
        SystemLog.objects.create(user=sys_user.name, action="Updated Notification Preferences", status="Success")
        return Response({"message": "Preferences updated successfully!"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_2fa_status(request):
    sys_user = SystemUser.objects.filter(email=request.user.email).first()
    if sys_user:
        return Response({"is_2fa_enabled": sys_user.is_2fa_enabled})
    return Response({"is_2fa_enabled": False})

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
        
        # Security Email Alert
        if sys_user.notify_security and sys_user.email:
            send_security_alert_email(sys_user.email, sys_user.name, "2FA Disabled", "Two-Factor Authentication has been completely disabled on your account.")

        return Response({"message": "2FA disabled successfully."})
    return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    current_password = request.data.get('current')
    new_password = request.data.get('new')
    
    # Check if current password is correct
    if not user.check_password(current_password):
        return Response({"error": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
    
    # Prevent setting the same password as the new password
    if current_password == new_password:
        return Response({"error": "New password cannot be the same as your current password."}, status=status.HTTP_400_BAD_REQUEST)
        
    # Save the new password
    user.set_password(new_password)
    user.save()
    
    admin_name = request.user.first_name or request.user.username
    SystemLog.objects.create(user=admin_name, action="Changed account password", status="Success")
    
    # Security Email Alert (Sent to the account owner)
    sys_user = SystemUser.objects.filter(email=user.email).first()
    if sys_user and sys_user.notify_security and sys_user.email:
        send_security_alert_email(sys_user.email, sys_user.name, "Password Changed", "Your account password was recently updated.")

    return Response({"message": "Password updated successfully!"}, status=status.HTTP_200_OK)

class SystemUserViewSet(viewsets.ModelViewSet):
    queryset = SystemUser.objects.all()
    serializer_class = SystemUserSerializer

    def perform_update(self, serializer):
        instance = serializer.save() 
        try:
            # Find django internal auth user
            django_user = User.objects.get(email=instance.email)
            
            # Update status
            django_user.is_active = instance.status not in ['Inactive', 'Locked']
            
            # Update permissions depends on role
            if instance.role == 'Admin':
                django_user.is_staff = True
            else:
                django_user.is_staff = False
                
            django_user.save()
        except User.DoesNotExist:
            pass

class CompanyViewSet(viewsets.ModelViewSet):
    # Only show active items (not in trash)
    queryset = Company.objects.filter(is_deleted=False)
    serializer_class = CompanySerializer

    def destroy(self, request, *args, **kwargs):
        try:
            company = self.get_object()
            with transaction.atomic():
                # Soft Delete Company
                company.is_deleted = True
                company.deleted_at = timezone.now()
                company.save()
                
                # Cascade Soft Delete for Devices and Tasks
                devices = Device.objects.filter(company=company, is_deleted=False)
                for device in devices:
                    device.is_deleted = True
                    device.deleted_at = timezone.now()
                    device.save()
                    TechnicianTask.objects.filter(device=device, is_deleted=False).update(is_deleted=True, deleted_at=timezone.now())
                
                # Cascade Soft Delete for Contracts
                Contract.objects.filter(company=company, is_deleted=False).update(is_deleted=True, deleted_at=timezone.now())
                
            return Response({"message": "Moved to Trash!"}, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.filter(is_deleted=False)
    serializer_class = ContractSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.filter(is_deleted=False)
    serializer_class = DeviceSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save()
        
        # Cascade soft delete tasks related to this device
        TechnicianTask.objects.filter(device=instance, is_deleted=False).update(is_deleted=True, deleted_at=timezone.now())
        return Response(status=status.HTTP_204_NO_CONTENT)

class TechnicianTaskViewSet(viewsets.ModelViewSet):
    queryset = TechnicianTask.objects.filter(is_deleted=False)
    serializer_class = TechnicianTaskSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # Override create to trigger emails for Task Assignments
    def perform_create(self, serializer):
        task = serializer.save()

        def send_email():
            try:
                technician = task.technician
                if technician.notify_tasks and technician.email:
                    subject = f"New Task Assigned: {task.device.name}"
                    message = f"Hello {technician.name},\n\nA new maintenance task has been assigned to you.\n\nDevice: {task.device.name}\nCompany: {task.device.company.name}\nIssue: {task.issue}\nDeadline: {task.deadline}\n\nPlease log in to the predictive maintenance system to view more details.\n\nBest Regards,\nSystem Administrator"
                    
                    send_mail(
                        subject, 
                        message, 
                        getattr(settings, 'EMAIL_HOST_USER', ''), 
                        [technician.email], 
                        fail_silently=False
                    )
                    print(f"Task email sent successfully to {technician.email}!")
                else:
                    print(f"Email not sent: Technician has no email or notifications are OFF.")
            except Exception as e:
                print(f"CRITICAL TASK EMAIL ERROR: {str(e)}")
        
        # Process the email in background
        threading.Thread(target=send_email).start()

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

# Trash Manager API
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def trash_manager(request):
    if request.method == 'GET':
        companies = Company.objects.filter(is_deleted=True).values('id', 'name', 'deleted_at')
        contracts = Contract.objects.filter(is_deleted=True).values('id', 'company__name', 'deleted_at')
        devices = Device.objects.filter(is_deleted=True).values('id', 'name', 'company__name', 'deleted_at')
        tasks = TechnicianTask.objects.filter(is_deleted=True).values('id', 'device__name', 'issue', 'deleted_at')
        
        return Response({
            "companies": list(companies),
            "contracts": list(contracts),
            "devices": list(devices),
            "tasks": list(tasks)
        })

    elif request.method == 'POST':
        action = request.data.get('action') # 'restore' or 'permanent_delete'
        item_type = request.data.get('type') # 'company', 'contract', 'device', 'task'
        item_id = request.data.get('id')

        model_map = {'company': Company, 'contract': Contract, 'device': Device, 'task': TechnicianTask}
        ModelClass = model_map.get(item_type)
        
        if not ModelClass:
            return Response({"error": "Invalid type"}, status=400)
            
        obj = ModelClass.objects.filter(id=item_id, is_deleted=True).first()
        if not obj:
            return Response({"error": "Item not found in trash"}, status=404)
            
        admin_name = request.user.first_name or request.user.username

        if action == 'restore':
            obj.is_deleted = False
            obj.deleted_at = None
            obj.save()
            SystemLog.objects.create(user=admin_name, action=f"Restored {item_type} ID: {item_id} from Trash", status="Success")
            return Response({"message": "Restored successfully"})
            
        elif action == 'permanent_delete':
            obj.delete() # Hard delete from database
            SystemLog.objects.create(user=admin_name, action=f"Permanently deleted {item_type} ID: {item_id}", status="Warning")
            return Response({"message": "Permanently deleted"})

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
            
            # Skip if the device is deleted (in trash)
            if device.is_deleted:
                continue
                
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