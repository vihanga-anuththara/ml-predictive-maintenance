import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib
import os

# Read dataset
current_dir = os.path.dirname(__file__)
dataset_path = os.path.join(current_dir, 'dataset.csv')

print("Loading dataset...")
df = pd.read_csv(dataset_path)

# Train data X
X = df[['device_age_months', 'disk_usage_percent', 'cpu_temp_avg', 'ram_usage_percent', 'past_failure_count', 'days_since_last_maintenance']]
# Risk Y
y = df['failure_risk']

# Data for training and testing
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Use Random Forest model
print("Training the model...")
model = RandomForestClassifier(n_estimators=100, random_state=42)

# Train the model
model.fit(X_train, y_train)

# Test the model
predictions = model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)
print(f"Model trained successfully! Accuracy: {accuracy * 100:.2f}%")

# Save the model
model_path = os.path.join(current_dir, 'model.pkl')
joblib.dump(model, model_path)
print(f"Model saved to: {model_path}")