from rest_framework import serializers
from .models import Company, Device, DeviceHealthLog, MaintenanceRecord, Contract, TechnicianTask, SystemUser

class CompanySerializer(serializers.ModelSerializer):
    devices_count = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = ['id', 'name', 'contact_email', 'devices_count']

    def get_devices_count(self, obj):
        # Count of company devices
        return Device.objects.filter(company=obj).count()

class DeviceSerializer(serializers.ModelSerializer):
    company = serializers.CharField() 

    class Meta:
        model = Device
        fields = '__all__'

    # Use company name for ID
    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['company'] = instance.company.name
        return rep

    # Save / Update data using company name
    def create(self, validated_data):
        company_name = validated_data.pop('company')
        
        company_obj, created = Company.objects.get_or_create(
            name=company_name,
            defaults={'contact_email': 'info@unknown.com'} 
        )
        
        validated_data['company'] = company_obj
        return super().create(validated_data)

    # Update device data
    def update(self, instance, validated_data):
        if 'company' in validated_data:
            company_name = validated_data.pop('company')
            company_obj, created = Company.objects.get_or_create(
                name=company_name,
                defaults={'contact_email': 'info@unknown.com'}
            )
            instance.company = company_obj
            
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class DeviceHealthLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceHealthLog # Model name
        fields = '__all__'

class MaintenanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRecord # Model name
        fields = '__all__'

class ContractSerializer(serializers.ModelSerializer):
    company = serializers.CharField() 

    class Meta:
        model = Contract
        fields = '__all__'

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['company'] = instance.company.name
        return rep

    def create(self, validated_data):
        company_name = validated_data.pop('company')
        company_obj, created = Company.objects.get_or_create(
            name=company_name,
            defaults={'contact_email': 'info@unknown.com'} 
        )
        validated_data['company'] = company_obj
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'company' in validated_data:
            company_name = validated_data.pop('company')
            company_obj, created = Company.objects.get_or_create(
                name=company_name,
                defaults={'contact_email': 'info@unknown.com'}
            )
            instance.company = company_obj
            
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class TechnicianTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = TechnicianTask
        fields = '__all__'

class SystemUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemUser
        fields = '__all__'