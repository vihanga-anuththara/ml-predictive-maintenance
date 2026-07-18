## API Endpoints Documentation

### 1. Authentication & Security
*   **POST** `/api/register/` - Register a new user (Admin/Technician).
*   **POST** `/api/login/` - Login to the system (Returns JWT or `OTP_REQUIRED` if 2FA is active).
*   **POST** `/api/login-verify-otp/` - Verify 2FA code during login.
*   **POST** `/api/change-password/` - Change account password.
*   **GET** `/api/check-2fa-status/` - Check if 2FA is enabled for the current user.
*   **GET** `/api/setup-2fa/` - Generate 2FA QR code and secret for setup.
*   **POST** `/api/verify-2fa/` - Verify code to enable 2FA.
*   **POST** `/api/disable-2fa/` - Disable 2FA (Triggers security email alert).

### 2. Core Entities (CRUD)
*These endpoints support GET, POST, PUT, PATCH, and DELETE operations. Deleting routes items to the Trash Manager (Soft Delete).*
*   `/api/companies/` - Manage client companies.
*   `/api/devices/` - Manage hardware devices.
*   `/api/contracts/` - Manage maintenance contracts.
*   `/api/tasks/` - Manage technician assignments (Triggers email to technician on creation).
*   `/api/system-users/` - Manage system users and roles.
*   `/api/device-health-logs/` - View/Add device health metrics.
*   `/api/maintenance/` - View/Add maintenance records.

### 3. AI & Machine Learning
*   **GET** `/api/device-risks/` - Retrieve ML predictions for device failure risks using the trained Random Forest model.
*   **POST** `/api/predict-risk/` - Get instant maintenance advice via Google Gemini AI based on current hardware metrics.

### 4. System & Utilities
*   **GET / PUT** `/api/my-preferences/` - Manage user notification settings (Tasks, Contracts, Security alerts).
*   **GET** `/api/trash/` - View soft-deleted items (Companies, Devices, Contracts, Tasks).
*   **POST** `/api/trash/` - Restore or permanently delete items from the trash.
*   **GET** `/api/system-logs/` - View the system activity logs.
*   **DELETE** `/api/system-logs/clear/` - Permanently clear all system logs.
