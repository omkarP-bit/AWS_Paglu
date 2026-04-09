# 🫀 Real-Time Organ Donation Match & Allocation System

A **critical event-driven healthcare system** that enables real-time, rule-based organ allocation between donors and recipients, ensuring **fairness, urgency prioritization, and atomic consistency**.

---

## 🚨 Problem Statement

Organ transplantation is highly time-sensitive. Delays or incorrect matching can lead to life-threatening consequences. Hospitals require systems that ensure:

- Instant donor-recipient matching  
- Strict adherence to medical compatibility rules  
- Fair and transparent allocation  
- Real-time notifications and monitoring  

---

## 🎯 Objective

Build a **real-time allocation system** that:

- Matches donors with compatible recipients instantly  
- Applies strict rule-based medical logic (NO ML)  
- Prioritizes recipients based on urgency and waiting time  
- Ensures **atomic allocation (no duplicates)**  
- Sends real-time alerts  
- Provides a live dashboard  

---

## 🧠 Key Features

### 🔹 Rule-Based Matching Engine
- Organ type matching  
- Blood group compatibility  
- Deterministic selection logic  

### 🔹 Priority-Based Allocation
- Higher urgency → higher priority  
- Tie-breaker → longer waiting time  

### 🔹 Atomic Allocation
- Uses database transactions  
- Prevents duplicate organ assignment  
- Concurrency-safe (`FOR UPDATE SKIP LOCKED`)  

### 🔹 Real-Time Notifications
- Trigger alerts immediately after allocation  

### 🔹 Audit Logging
- Tracks every action for transparency  
- Explainable allocation decisions  

---

## 🏗️ System Architecture

```
Frontend (React)
        ↓
FastAPI Backend (API Layer)
        ↓
SQLAlchemy ORM
        ↓
PostgreSQL (RDS / Local)
```

---

## 🛠️ Tech Stack

| Layer        | Technology        |
|-------------|-----------------|
| Backend      | FastAPI         |
| Database     | PostgreSQL      |
| ORM          | SQLAlchemy      |
| Frontend     | React           |
| Deployment   | AWS (EC2, RDS, S3) |

---

## 🗄️ Database Design

### Core Tables

- **donors** → donor details  
- **organs** → organ inventory  
- **recipients** → patient details  
- **waiting_list** → priority queue  
- **allocations** → final assignments  
- **notifications** → alert system  
- **audit_logs** → system traceability  

---

## ⚡ Allocation Logic (Core Algorithm)

1. Donor enters system  
2. Find compatible recipients:
   - Organ type match  
   - Blood group compatibility  
3. Sort candidates:
   - urgency_score DESC  
   - waiting_since ASC  
4. Lock rows (`FOR UPDATE SKIP LOCKED`)  
5. Allocate organ atomically  
6. Update system state  
7. Send notification  

---

## 🔒 Concurrency & Safety

- PostgreSQL transactions ensure atomic operations  
- Row-level locking prevents race conditions  
- Unique constraints prevent duplicate allocation  

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/organ-allocation-system.git
cd organ-allocation-system
```

---

### 2. Setup backend

```bash
pip install -r requirements.txt
```

---

### 3. Configure environment

Create `.env` file:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/organ_db
```

---

### 4. Run the server

```bash
uvicorn app.main:app --reload
```

---

### 5. Open API docs

```
http://127.0.0.1:8000/docs
```

---

## 📊 Sample API Endpoints

| Endpoint | Description |
|--------|------------|
| GET /recipients | Get all recipients |
| POST /donor | Add new donor |
| POST /allocate | Trigger allocation |
| GET /allocations | View allocations |

---

## 🧪 Testing Scenario

- Add donor (kidney, O+)  
- System fetches compatible recipients  
- Applies priority rules  
- Allocates to highest priority patient  
- Updates DB atomically  

---

## 🌐 Deployment (AWS)

- Backend → EC2  
- Database → RDS (PostgreSQL)  
- Frontend → S3 + CloudFront  

---

## 🔥 What Makes This Unique

- Fully **rule-based deterministic system**  
- **No machine learning** → explainable decisions  
- **Real-time + concurrency-safe design**  
- **Production-grade DB modeling**  

---

## 📈 Future Enhancements

- WebSocket-based live dashboard  
- Multi-hospital coordination  
- Organ transport tracking  
- AI-assisted prediction layer (optional)  

---

## 👨‍💻 Contributors

- Your Name  
- Team Members  

---

## 📜 License

MIT License

---

## 💡 Acknowledgment

Built for **AI Cloudverse Hackathon** 🚀
