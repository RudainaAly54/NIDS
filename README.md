# KDD Network Intrusion Detection System — Backend README

## What is this project?

A full-stack Machine Learning application that detects network intrusions.
A user fills in network connection details on a web page, clicks "Analyze", and the SVM model predicts whether the connection is **Normal** or an **Attack**.

---

# Screen Shots
![analysis](<analysis dahboard 1.png>) ![dashboard](dashboard.png)

## Project Structure

```
NIDS-main/
├── backend/
│   ├── main.py                  ← FastAPI server (the backend)
│   ├── requirements.txt         ← Python dependencies
│   └── kdd_pipeline.joblib      ← Trained model saved from the notebook
│
└── frontend/
    ├── src/
    │   ├── data/
    │   │   └── api.js           ← Connects frontend to backend
    │   ├── App.jsx              ← Main UI with the input form
    │   └── components/
    ├── .env                     ← Backend URL config
    └── package.json
```

---

## How Everything Connects

```
┌─────────────────────────────────────────────────────────────────┐
│                        GOOGLE COLAB                             │
│                                                                 │
│  kdd_samplek.xlsx                                               │
│       ↓                                                         │
│  [Notebook] EDA → Cleaning → Encoding → Scaler → PCA → SVM     │
│       ↓                                                         │
│  kdd_pipeline.joblib  ← saved and downloaded                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    copy to backend/ folder
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
│                                                                 │
│  main.py loads kdd_pipeline.joblib                              │
│  Runs at http://localhost:8000                                   │
│                                                                 │
│  POST /api/predict  ←──────────────────────────────────┐        │
│       ↓                                                │        │
│  preprocess input (encode categoricals, drop cols)     │        │
│       ↓                                                │        │
│  pipeline.predict() → "Normal" or "Attack"             │        │
│       ↓                                                │        │
│  return JSON response ─────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              ↑ ↓  HTTP requests
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                 │
│                                                                 │
│  React app runs at http://localhost:5173                        │
│                                                                 │
│  User fills form (8 features)                                   │
│       ↓                                                         │
│  api.js fills the remaining 33 features with defaults           │
│       ↓                                                         │
│  sends POST request to backend /api/predict                     │
│       ↓                                                         │
│  displays result: NORMAL (green) or ATTACK (red)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Pipeline — Step by Step

### Phase 1: In the Notebook (done once, on the full dataset)

These steps ran on the raw dataframe BEFORE the pipeline was built:

| Step | What happened | Why |
|------|--------------|-----|
| Remove duplicates | `df.drop_duplicates()` | Clean data |
| IQR outlier capping | clip values to [Q1-1.5IQR, Q3+1.5IQR] | Reduce noise |
| LabelEncoder | `protocol_type`, `service`, `flag` → integers | ML needs numbers |
| Drop zero-variance cols | removed `num_outbound_cmds`, `is_host_login` | Useless features |
| Train/test split | 80% train, 20% test | Evaluate generalization |
| Kernel selection | linear vs RBF on 3k subsample via cross-val | Pick best kernel |
| GridSearchCV | tune C and gamma on 20% of train set | Optimal parameters |
| Fit Scaler + PCA + SVM | on X_train | Train the model |

### Phase 2: Saved Inside the Pipeline (kdd_pipeline.joblib)

The pipeline object contains these fitted steps in order:

```
Input DataFrame (X)
      ↓
  Log1pTransformer     → apply log1p to 17 high-skew features
      ↓
  ToArray              → convert DataFrame to numpy float32 array
      ↓
  StandardScaler       → normalize all features (fitted on train data)
      ↓
  PCA                  → reduce dimensions, keep 95% variance (fitted on train data)
      ↓
  SVC                  → predict 0=Normal or 1=Attack (trained on train data)
      ↓
  Output: 0 or 1 + probabilities
```

### Phase 3: In main.py (at inference time, per request)

Because the notebook encoded categoricals BEFORE building the pipeline,
main.py must replicate those early steps on every incoming request:

```
Raw input from frontend (8 features as JSON)
      ↓
  Fill 33 missing features with safe defaults   ← done in api.js
      ↓
  Drop zero-variance cols                        ← main.py
      ↓
  Encode protocol_type → integer (icmp=0, tcp=1, udp=2)
  Encode flag          → integer (OTH=0, REJ=1, SF=9, ...)
  Encode service       → integer (http=24, ftp=19, ...)
      ↓
  Reorder columns to match notebook's X column order
      ↓
  Pass DataFrame into pipeline.predict()
      ↓
  Return { prediction, confidence, probabilities, is_attack }
```

---

## Why main.py Encodes Categoricals Manually

The notebook processed data in this order:

```
df → LabelEncode categoricals → drop cols → X → build pipeline
```

The pipeline only ever saw **already-encoded integers**, never raw strings like "tcp" or "SF".
So the pipeline has no encoder for those — main.py must do it manually to match exactly
what the notebook did before training.

---

## Why the Confidence is Sometimes Low

The frontend form only collects **8 out of 41 features**.
The remaining 33 are filled with neutral default values in `api.js`.
The SVM model was trained on all 41 features, so giving it incomplete
information makes it less certain. With all 41 features the confidence would be much higher.

---

## Running the Project

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.
Make sure the backend is running first.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/model-info` | Model metadata (kernel, accuracy, PCA components) |
| POST | `/api/predict` | Predict one connection → Normal or Attack |
| POST | `/api/predict/batch` | Predict up to 1,000 connections at once |

### Example Request
```json
POST http://localhost:8000/api/predict

{
  "duration": 0,
  "protocol_type": "tcp",
  "service": "http",
  "flag": "SF",
  "src_bytes": 215,
  "dst_bytes": 45076,
  ...
}
```

### Example Response
```json
{
  "prediction": "Normal",
  "confidence": 0.9923,
  "probabilities": {
    "Normal": 0.9923,
    "Attack": 0.0077
  },
  "is_attack": false,
  "attack_confidence": 0.0077
}
```

---

## Frontend .env Configuration

```
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=false
```

---

## Test Examples

### Normal Traffic
| Feature | Value |
|---------|-------|
| Duration | 0 |
| Protocol | tcp |
| Src Bytes | 215 |
| Dst Bytes | 45076 |
| Count | 1 |
| Failed Logins | 0 |
| Serror Rate | 0.00 |
| Dst Host Count | 150 |

### Attack Traffic (Smurf DoS)
| Feature | Value |
|---------|-------|
| Duration | 0 |
| Protocol | icmp |
| Src Bytes | 1032 |
| Dst Bytes | 0 |
| Count | 511 |
| Failed Logins | 0 |
| Serror Rate | 1.00 |
| Dst Host Count | 255 |
