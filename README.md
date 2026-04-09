# 🫀 LifeMatch: Real-Time Organ Donation Allocation Engine

**LifeMatch** is a highly deterministic, deeply secure, real-time medical triage platform designed to instantly and fairly allocate life-saving organs using absolute rule-based criteria, zero-trust HIPAA architecture, and scalable asynchronous AWS notification workflows.

---

## 🚀 Unique Selling Propositions (USPs) & Innovations

### 1. Atomic Match Transactions (`Row-Level Locking`)
Organ transplantation implies zero-tolerance for race conditions. If two compatible recipients query at the same millisecond, standard queues break. LifeMatch leverages explicit SQL `SELECT ... FOR UPDATE SKIP LOCKED` natively within its FastAPI allocation transaction. When a donor registers, the target waitlist row is exclusively locked, ensuring 100% duplicate-allocation immunity.

### 2. Intelligent Live OCR Priority Escalation
Rather than relying solely on manually selected priority levels, patients submit their clinical Medical Reports directly in the UI. LifeMatch executes an in-memory extraction using `pytesseract`. Upon detecting trigger words like *"Emergency"*, *"Terminal"*, or *"ICU"*, it mathematically bounds the patient's algorithmic Urgency Score up to 5 points higher—saving administrative triage time. The uploaded file is subsequently instantly dropped to prevent Local PII retention.

### 3. Asymmetric Role-Based Data Abstraction (HIPAA Native)
The React architecture operates on a Zero-Trust principle powered by JWT encoding. 
- **Recipients** see an algorithmic ranking of their personal position in the global queue but are entirely sandboxed from viewing physical Donor details or other patients. 
- **Donors** track exactly when their "Gift of Life" goes from Active to matching but witness no recipient identifiers.
- **Admins** have a Master "Glass-Box" dashboard providing omniscient control, wherein all PII strings are strictly masked natively by the backend (`J*** ***n`) to assure ultimate compliance.

### 4. Direct Match Explainability!
Opaque algorithms frighten health networks. Inside the Admin Dashboard, LifeMatch evaluates its internally dumped Match JSON (stored safely stringified in PostgreSQL) to output explicit English logs mapping *why* someone received an organ (e.g., *"Matched Organ: Heart due to O+ blood compatibility and Max Urgency Profiling."*)

### 5. Instant Master Override Authority
Medical realities change faster than algorithms. The Admin features an `Emergency Override` panel that force-mutates a Patient's urgency score to absolute priority (Level 10) through a dedicated HTTP PUT call, instantly bumping them to the top of all physical arrays across the system simultaneously and firing WebSocket GUI updates to notify connected regional boards.

---

## 🛠️ Architecture & Tech Stack

*   **Backend Engine**: Python FastAPI, strictly typed Pydantic
*   **Database ORM**: SQLAlchemy 2.0 with asynchronous bindings via core Psycopg
*   **Cloud Operations**: AWS SNS (Simple Notification Services) + SQS for high-availability alerts.
*   **Real-time Handlers**: FastAPI WebSockets
*   **Security Context**: Bcrypt hashing & PyJWT Auth Headers
*   **Frontend Ecosystem**: React.js / Vite using pure CSS / Lucide-React icon kits.

---

## 🗄️ Core Database Schema 

The system executes against a high-integrity relational PostgreSQL Database consisting of decoupled domains:

### 1. Security & Hub Entities
*   **`hospitals`**: 
    *   `id` (UUID, Primary Key)
    *   `name`: e.g., "City General"
    *   `location`: String
*   **`users`**: Central Auth table
    *   `id` (UUID), `email` (PK), `hashed_password`
    *   `role`: Enum (`admin`, `donor`, `recipient`)
    *   `reference_id`: Links via UUID to either the physical `Donor` or `Recipient` tuple for isolated routing.

### 2. The Medical Actors
*   **`donors`**: 
    *   `id` (UUID), `name`, `blood_group`
    *   `age`, `contact_number`, `consent_given` (Boolean Legal Hook)
    *   `hospital_id` (FOREIGN KEY -> `hospitals.id`)
*   **`recipients`**: 
    *   `id` (UUID), `name`, `age`, `contact_number`, `medical_report_url`
    *   `blood_group`, `organ_needed`, `urgency_score` (1-10 Dynamic int)
    *   `hospital_id` (FOREIGN KEY -> `hospitals.id`)
    *   `status`: Enum (`waiting`, `allocated`)

### 3. Registration & Allocation Tracking
*   **`organs`**:
    *   `id` (UUID) 
    *   `donor_id` (FOREIGN KEY -> `donors.id`)
    *   `organ_type`: (`kidney`, `liver`, `heart`, `lungs`)
    *   `status`: Enum (`active`, `allocated`, `withdrawn`)
*   **`waiting_list`**: 
    *   The atomic queue structure. Tracks `recipient_id`, `organ_needed`, `urgency_score`, and `waiting_since` (Timestamp) for index-searching.
*   **`allocations`**:
    *   The completed algorithmic lifecycle. 
    *   `organ_id`, `recipient_id`, `allocation_time`
    *   `match_score`: (JSON Payload providing AI matching Explainability properties).

### 4. Systems Operations
*   **`blood_compatibility`**: Matrix mapping containing rules determining routing (`O-` gives to `ALL`, `A+` gives to `A+, AB+`, etc).
*   **`audit_logs`**: Immutable store of all allocations to retain accountability during system analysis.

---

## 🚀 Running Locally

1. **Backend Initialization**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python seed.py # (Injects mock Hospitals into DB)
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
2. **Frontend UI**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
*Access the Web Application at `http://localhost:5173/`.*
