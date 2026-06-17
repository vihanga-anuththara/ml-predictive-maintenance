from django.core.management.base import BaseCommand
from datetime import date, timedelta
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from api.models import Contract, SystemUser

class Command(BaseCommand):
    help = 'Check for contracts expiring in exactly 30 days and send professional HTML emails to Clients'

    def handle(self, *args, **kwargs):
        today = date.today()
        target_date = today + timedelta(days=30)

        self.stdout.write(f"Checking for contracts expiring exactly on: {target_date}...")

        # System Check: Check admin notification settings
        system_enabled = SystemUser.objects.filter(role='Admin', notify_contracts=True).exists()
        
        if not system_enabled:
            self.stdout.write(self.style.WARNING("Contract notifications are turned OFF globally by Admins. No emails will be sent to clients."))
            return

        # Find contracts from database
        expiring_contracts = Contract.objects.filter(
            end_date=target_date, 
            status__in=['Active', 'Expiring Soon']
        )

        if not expiring_contracts.exists():
            self.stdout.write(self.style.SUCCESS('No contracts expiring in exactly 30 days. All good!'))
            return

        # Update old active contracts to 'Expiring Soon"
        for contract in expiring_contracts:
            if contract.status == 'Active':
                contract.status = 'Expiring Soon'
                contract.save()

        # Send email to client's company
        for contract in expiring_contracts:
            company_email = contract.company.contact_email
            
            # If company has no email, ignore it
            if not company_email:
                self.stdout.write(self.style.ERROR(f"No email address found for company: {contract.company.name}"))
                continue

            subject = f"Action Required: Your Maintenance Contract Expires in 30 Days"
            
            # HTML email for client's company
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                        <h2 style="color: #2563eb; border-bottom: 2px solid #eff6ff; padding-bottom: 10px;">
                            Maintenance Contract Renewal Reminder
                        </h2>
                        <p>Dear <strong>{contract.company.name}</strong> Team,</p>
                        <p>We hope this email finds you well.</p>
                        <p>This is a friendly automated reminder that your hardware predictive maintenance and support contract is scheduled to expire in exactly <strong>30 days</strong>.</p>
                        
                        <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #1e40af;">Contract Overview:</h3>
                            <ul style="margin-bottom: 0;">
                                <li><strong>Expiration Date:</strong> {contract.end_date}</li>
                                <li><strong>Current Status:</strong> Expiring Soon</li>
                            </ul>
                        </div>
                        
                        <p>To ensure uninterrupted predictive monitoring, priority support, and maintenance of your devices, we kindly request you to initiate the renewal process.</p>
                        <p>Please reply to this email or contact your dedicated account manager at your earliest convenience to discuss renewal options.</p>
                        <br>
                        <p style="font-size: 0.9em; color: #6b7280;">
                            Best Regards,<br>
                            <strong>Predictive Maintenance Operations Team</strong>
                        </p>
                    </div>
                </body>
            </html>
            """
            
            text_content = f"Dear {contract.company.name},\n\nYour maintenance contract expires on {contract.end_date}. Please contact us to renew."

            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=getattr(settings, 'EMAIL_HOST_USER', 'noreply@predictivesystem.com'),
                to=[company_email]
            )
            msg.attach_alternative(html_content, "text/html")
            
            try:
                msg.send(fail_silently=False)
                self.stdout.write(self.style.SUCCESS(f"Successfully sent renewal reminder to {contract.company.name} ({company_email})."))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to send email to {contract.company.name}. Error: {str(e)}"))