from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django_cryptography.fields import encrypt

# Users create from Settings
class SystemUser(models.Model):
    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True) 
    role = models.CharField(max_length=50, default='Technician')
    status = models.CharField(max_length=50, default='Active')

    def __str__(self):
        return f"{self.name} ({self.role})"

# Company model
class Company(models.Model):
    name = models.CharField(max_length=255)
    # Encrypt Clients' Email
    contact_email = encrypt(models.EmailField()) 
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

# Contract model
class Contract(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='contracts')
    start_date = models.DateField()
    end_date = models.DateField()
    # Encrypt value
    value = encrypt(models.CharField(max_length=100)) 
    status = models.CharField(max_length=50, default='Active')

    def __str__(self):
        return f"{self.company.name} - Contract"

# Device model
class Device(models.Model):
    DEVICE_TYPES = (
        ('Desktop', 'Desktop PC'),
        ('Laptop', 'Laptop'),
    )
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='devices')
    name = models.CharField(max_length=255)
    device_type = models.CharField(max_length=50, choices=DEVICE_TYPES) 
    installed_date = models.DateField()
    # Encrypt serial number
    serial_number = encrypt(models.CharField(max_length=100, blank=True, null=True)) 
    status = models.CharField(max_length=50, default="Healthy")

    def __str__(self):
        return f"{self.name} ({self.company.name})"

# Device Health Log model (ML Predictions)
class DeviceHealthLog(models.Model):
    RISK_LEVELS = (
        ('Low', 'Low Risk'),
        ('Medium', 'Medium Risk'),
        ('High', 'High Risk'),
    )

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='health_logs')
    hard_drive_health = models.FloatField(help_text="Hard drive health percentage (0-100%)")
    past_failure_attempts = models.IntegerField(default=0, help_text="Number of past crashes/failures")
    repair_history_count = models.IntegerField(default=0, help_text="Total number of times repaired")
    predicted_risk_level = models.CharField(max_length=10, choices=RISK_LEVELS, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.device.name} Risk: {self.predicted_risk_level}"

# Maintenance Record model
class MaintenanceRecord(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='maintenance_records')
    description = models.TextField()
    date_performed = models.DateField(auto_now_add=True)

# Technician Task Model
class TechnicianTask(models.Model):
    technician = models.ForeignKey(SystemUser, on_delete=models.CASCADE, related_name='assigned_tasks')
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='device_tasks')
    
    service_type = models.CharField(max_length=50, default='In-house')
    brought_by = models.CharField(max_length=150)
    date = models.DateField()
    deadline = models.DateField()
    status = models.CharField(max_length=50, default='Pending')
    issue = models.TextField()
    # Encrypt notes
    special_note = encrypt(models.TextField(blank=True, null=True)) 

    def __str__(self):
        return f"Task for {self.technician.name} on {self.device.name}"

# Django Signal to create SystemUser profile
@receiver(post_save, sender=User)
def create_system_user(sender, instance, created, **kwargs):
    if created:
        full_name = f"{instance.first_name} {instance.last_name}".strip()
        
        if not full_name:
            full_name = instance.email.split('@')[0] if instance.email else instance.username

        user_role = 'Admin' if instance.is_staff or instance.is_superuser else 'Technician'

        SystemUser.objects.create(
            name=full_name,
            email=instance.email,
            role=user_role, 
            status='Active'
        )