import pandas as pd
import random

# 1000 Dataset
data = []
for _ in range(1000):
    age = random.randint(1, 60) # 1 month to 60 months old devices
    disk = random.uniform(20.0, 99.0) # Disk usage rate
    temp = random.uniform(35.0, 90.0) # CPU temp
    ram = random.uniform(30.0, 95.0) # RAM usage
    past_fails = random.randint(0, 5) # Past failure count
    days_since_maintenance = random.randint(0, 365) # Days since last maintenance date
    
    # Mannual risk calculate (Risk: 1 = Warnning, 0 = Healthy )
    risk = 0
    if temp > 80 or (age > 48 and days_since_maintenance > 180):
        risk = 1 
    elif past_fails > 2 and disk > 90:
        risk = 1 
    
    if days_since_maintenance < 30:
        risk = 0
        
    data.append([age, disk, temp, ram, past_fails, days_since_maintenance, risk])

# Data save on a CSV file
df = pd.DataFrame(data, columns=['device_age_months', 'disk_usage_percent', 'cpu_temp_avg', 'ram_usage_percent', 'past_failure_count', 'days_since_last_maintenance', 'failure_risk'])
df.to_csv('dataset.csv', index=False)
print("dataset.csv created successfully!")