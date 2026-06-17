from apscheduler.schedulers.background import BackgroundScheduler
from django.core.management import call_command
import sys
from django.utils import timezone
from datetime import timedelta
from api.models import Company, Contract, Device, TechnicianTask

# Contract Renewal Emails
def send_contract_reminders():
    sys.stdout.write("Running Automated Contract Checker...\n")
    call_command('check_contracts')

# Auto 30-Day Trash Cleaner
def auto_clear_old_trash():
    sys.stdout.write("Running Auto Trash Cleaner...\n")
    threshold_date = timezone.now() - timedelta(days=30)
    
    # Hard Delete
    Company.objects.filter(is_deleted=True, deleted_at__lte=threshold_date).delete()
    Contract.objects.filter(is_deleted=True, deleted_at__lte=threshold_date).delete()
    Device.objects.filter(is_deleted=True, deleted_at__lte=threshold_date).delete()
    TechnicianTask.objects.filter(is_deleted=True, deleted_at__lte=threshold_date).delete()

def start():
    scheduler = BackgroundScheduler()
    
    # PRODUCTION MODE
    # Contract Job - 12 AM
    scheduler.add_job(send_contract_reminders, 'cron', hour=0, minute=0, id='contract_job', replace_existing=True)
    
    # Trash Cleaner Job - 1 AM
    scheduler.add_job(auto_clear_old_trash, 'cron', hour=1, minute=0, id='trash_job', replace_existing=True)

    scheduler.start()