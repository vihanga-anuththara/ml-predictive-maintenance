# ML-Powered Predictive Maintenance System

An advanced, full-stack predictive maintenance platform designed to monitor hardware health, predict potential failures using a custom Machine Learning model, and automate maintenance workflows.

Built with a robust **Django REST Framework** backend, a responsive **React** frontend, and powered by **Google Gemini AI** and **Supabase (PostgreSQL)**.

## Key Features

* **Custom ML Failure Prediction:** Utilizes a custom-trained Machine Learning model to evaluate hardware risk levels based on age, disk health, and historical data.
* **AI Maintenance Insights:** Integrates Google Gemini AI to analyze hardware metrics (CPU, Disk health, Past failures) and generate real-time maintenance advice.
* **Hardware Monitoring:** Tracks active devices, contract expirations, and overall system health.
* **Advanced Security:** Secure login with JWT authentication, Two-Factor Authentication (2FA/TOTP), and automated security email alerts.
* **Automated Workflows:** Auto-assigns technician tasks and runs background processes to check for 30-day contract expirations.
* **Email Notifications:** Real-time email alerts for task assignments, contract renewals, and security warnings.
* **Safe Deletion (Trash Manager):** Soft-delete implementation for Companies, Devices, Contracts, and Tasks with a centralized Trash Manager to restore or permanently delete records.

## Tech Stack

**Frontend**

* **Framework:** React.js (Vite)
* **Styling:** Tailwind CSS / Custom CSS
* **Deployment:** Vercel

**Backend**

* **Framework:** Django & Django REST Framework (DRF)
* **Database:** Supabase (PostgreSQL)
* **Machine Learning:** Scikit-Learn / Joblib (Custom Model)
* **AI Engine:** Google GenAI SDK (Gemini 2.5 Flash)
* **Authentication:** SimpleJWT, PyOTP (For 2FA)
* **Deployment:** Render

## Environment Variables setup

To run this project locally, you need to set up the following environment variables.

**Backend (`.env` file in the Django root)**

* SECRET_KEY=your_django_secret_key
* DEBUG=True
* DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?sslmode=require
* EMAIL_HOST_USER=your_smtp_email@example.com
* EMAIL_HOST_PASSWORD=your_smtp_password_or_app_password
* GEMINI_API_KEY=your_google_gemini_api_key

**Frontend (`.env` file in the React root)**

* VITE_API_URL=[http://127.0.0.1:8000/api/](https://www.google.com/search?q=http://127.0.0.1:8000/api/)
*(Note: Change this to your Render backend URL when deploying to production).*

## Local Setup & Installation

**1. Clone the Repository**

* `git clone [https://github.com/vanu888/ml-predictive-maintenance.git](https://github.com/vanu888/ml-predictive-maintenance.git)`
* `cd ml-predictive-maintenance`

**2. Backend Setup**

* Navigate to the backend directory.
* Create a virtual environment: `python -m venv venv`
* Activate it: `source venv/bin/activate` (On Windows use: `venv\Scripts\activate`)
* Install dependencies: `pip install -r requirements.txt`
* Run migrations to sync with Supabase: `python manage.py migrate`
* Create an Admin account: `python manage.py createsuperuser`
* Start the development server: `python manage.py runserver`

**3. Frontend Setup**

* Navigate to the frontend directory.
* Install dependencies: `npm install`
* Start the development server: `npm run dev`

## Live Demo

* **Frontend:** [https://ml-predictive-maintenance.vercel.app](https://ml-predictive-maintenance.vercel.app)
* **Backend API:** [https://ml-predictive-maintenance-server-wgt5.onrender.com/api/](https://www.google.com/search?q=https://ml-predictive-maintenance-server-wgt5.onrender.com/api/)

## Author

Developed as a comprehensive solution for proactive hardware management, AI-driven risk analysis, and automated system monitoring.