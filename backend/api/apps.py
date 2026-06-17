from django.apps import AppConfig
import os

class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        if os.environ.get('RUN_MAIN') == 'true':
            # Start scheduler at startup
            from . import scheduler
            scheduler.start()