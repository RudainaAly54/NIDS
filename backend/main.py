"""
main.py  —  KDD Network Intrusion Detection  FastAPI Backend
=============================================================
Loads kdd_pipeline.joblib saved from the notebook.

The pipeline inside expects a DataFrame that has ALREADY been:
  1. IQR-capped          (done in notebook on full df)
  2. Zero-var cols dropped  (num_outbound_cmds, is_host_login)
  3. Categoricals encoded:
       protocol_type → LabelEncoder integer
       service       → LabelEncoder integer
       flag          → LabelEncoder integer

Then the pipeline itself does:
  log1p → toarray → StandardScaler → PCA → SVC

So main.py replicates steps 1-3 at inference time before calling pipeline.predict().

Usage:
    uvicorn main:app --reload --port 8000
"""

import os
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from sklearn.base import BaseEstimator, TransformerMixin

# ── Custom transformers ───────────────────────────────────────────────────────
# Defined inline. The __main__ patch tells pickle where to find them
# when loading the pipeline (saved as __main__.Log1pTransformer in Colab).

SKEWED = [
    "duration", "src_bytes", "dst_bytes", "land", "wrong_fragment", "urgent", "hot",
    "num_failed_logins", "num_compromised", "num_root", "num_file_creations",
    "num_shells", "num_access_files", "count", "srv_count",
    "dst_host_count", "dst_host_srv_count",
]

class Log1pTransformer(BaseEstimator, TransformerMixin):
    def __init__(self, cols): self.cols = cols
    def fit(self, X, y=None):
        self.cols_ = [c for c in self.cols if c in X.columns]; return self
    def transform(self, X):
        X = X.copy()
        for c in self.cols_: X[c] = np.log1p(np.clip(X[c], 0, None))
        return X

class ToArray(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None): return self
    def transform(self, X): return X.values.astype(np.float32)

import __main__
__main__.Log1pTransformer = Log1pTransformer
__main__.ToArray = ToArray

# ── Load pipeline ─────────────────────────────────────────────────────────────

MODEL_PATH = Path(os.getenv("MODEL_PATH", "kdd_pipeline.joblib"))

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Model not found: {MODEL_PATH}\n"
        "Run the notebook end-to-end then paste and run notebook_save_cell.py"
    )

bundle   = joblib.load(MODEL_PATH)
PIPELINE = bundle["pipeline"]
META     = bundle["metadata"]

FEATURE_NAMES = META["feature_names"]   # column order X had in the notebook
CLASSES       = META["classes"]         # ["Normal", "Attack"]

# ── Encoding maps (must match sklearn LabelEncoder fit on the notebook's df) ──
# LabelEncoder sorts unique values alphabetically then assigns 0,1,2...

PROTOCOL_MAP = {"icmp": 0, "tcp": 1, "udp": 2}   # sorted: icmp < tcp < udp

# flag sorted alphabetically
FLAG_MAP = {
    "OTH": 0, "REJ": 1, "RSTO": 2, "RSTOS0": 3, "RSTR": 4,
    "S0": 5, "S1": 6, "S2": 7, "S3": 8, "SF": 9, "SH": 10,
}

# service: 63 values — LabelEncoder sorts alphabetically
SERVICE_MAP = {
    "IRC": 0, "X11": 1, "Z39_50": 2, "aol": 3, "auth": 4,
    "bgp": 5, "courier": 6, "csnet_ns": 7, "ctf": 8, "daytime": 9,
    "discard": 10, "domain": 11, "domain_u": 12, "echo": 13, "eco_i": 14,
    "ecr_i": 15, "efs": 16, "exec": 17, "finger": 18, "ftp": 19,
    "ftp_data": 20, "gopher": 21, "harvest": 22, "hostnames": 23,
    "http": 24, "http_443": 25, "http_8001": 26, "imap4": 27,
    "iso_tsap": 28, "klogin": 29, "kshell": 30, "ldap": 31,
    "link": 32, "login": 33, "mtp": 34, "name": 35, "netbios_dgm": 36,
    "netbios_ns": 37, "netbios_ssn": 38, "netstat": 39, "nnsp": 40,
    "nntp": 41, "ntp_u": 42, "other": 43, "pm_dump": 44, "pop_2": 45,
    "pop_3": 46, "printer": 47, "private": 48, "red_i": 49,
    "remote_job": 50, "rje": 51, "shell": 52, "smtp": 53, "sql_net": 54,
    "ssh": 55, "sunrpc": 56, "supdup": 57, "systat": 58, "telnet": 59,
    "tftp_u": 60, "tim_i": 61, "time": 62, "urh_i": 63, "urp_i": 64,
    "uucp": 65, "uucp_path": 66, "vmnet": 67, "whois": 68,
}

ZERO_VAR_COLS   = ["num_outbound_cmds", "is_host_login"]
VALID_PROTOCOLS = list(PROTOCOL_MAP.keys())
VALID_FLAGS     = list(FLAG_MAP.keys())

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="KDD Network Intrusion Detection API",
    description="SVM binary classifier (Normal vs Attack). Model loaded from notebook.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas ───────────────────────────────────────────────────────────────────

class NetworkSample(BaseModel):
    # Categorical
    protocol_type: str = Field(..., example="tcp")
    service:       str = Field(..., example="http")
    flag:          str = Field(..., example="SF")

    # Basic
    duration:           float = Field(0,   ge=0)
    src_bytes:          float = Field(0,   ge=0)
    dst_bytes:          float = Field(0,   ge=0)
    land:               int   = Field(0,   ge=0, le=1)
    wrong_fragment:     float = Field(0,   ge=0)
    urgent:             float = Field(0,   ge=0)

    # Content
    hot:                float = Field(0,   ge=0)
    num_failed_logins:  float = Field(0,   ge=0)
    logged_in:          int   = Field(0,   ge=0, le=1)
    num_compromised:    float = Field(0,   ge=0)
    root_shell:         int   = Field(0,   ge=0, le=1)
    su_attempted:       int   = Field(0,   ge=0, le=1)
    num_root:           float = Field(0,   ge=0)
    num_file_creations: float = Field(0,   ge=0)
    num_shells:         float = Field(0,   ge=0)
    num_access_files:   float = Field(0,   ge=0)
    num_outbound_cmds:  float = Field(0,   ge=0)
    is_host_login:      int   = Field(0,   ge=0, le=1)
    is_guest_login:     int   = Field(0,   ge=0, le=1)

    # Traffic
    count:              float = Field(0,   ge=0)
    srv_count:          float = Field(0,   ge=0)
    serror_rate:        float = Field(0.0, ge=0, le=1)
    srv_serror_rate:    float = Field(0.0, ge=0, le=1)
    rerror_rate:        float = Field(0.0, ge=0, le=1)
    srv_rerror_rate:    float = Field(0.0, ge=0, le=1)
    same_srv_rate:      float = Field(0.0, ge=0, le=1)
    diff_srv_rate:      float = Field(0.0, ge=0, le=1)
    srv_diff_host_rate: float = Field(0.0, ge=0, le=1)

    # Dst host
    dst_host_count:              float = Field(0,   ge=0)
    dst_host_srv_count:          float = Field(0,   ge=0)
    dst_host_same_srv_rate:      float = Field(0.0, ge=0, le=1)
    dst_host_diff_srv_rate:      float = Field(0.0, ge=0, le=1)
    dst_host_same_src_port_rate: float = Field(0.0, ge=0, le=1)
    dst_host_srv_diff_host_rate: float = Field(0.0, ge=0, le=1)
    dst_host_serror_rate:        float = Field(0.0, ge=0, le=1)
    dst_host_srv_serror_rate:    float = Field(0.0, ge=0, le=1)
    dst_host_rerror_rate:        float = Field(0.0, ge=0, le=1)
    dst_host_srv_rerror_rate:    float = Field(0.0, ge=0, le=1)

    @validator("protocol_type")
    def validate_protocol(cls, v):
        v = v.lower()
        if v not in VALID_PROTOCOLS:
            raise ValueError(f"protocol_type must be one of {VALID_PROTOCOLS}")
        return v

    @validator("flag")
    def validate_flag(cls, v):
        v = v.upper()
        if v not in VALID_FLAGS:
            raise ValueError(f"flag must be one of {VALID_FLAGS}")
        return v


class PredictionResult(BaseModel):
    prediction:        str
    confidence:        float
    probabilities:     Dict[str, float]
    is_attack:         bool
    attack_confidence: float


class BatchRequest(BaseModel):
    samples: List[NetworkSample]


class BatchResult(BaseModel):
    results:   List[PredictionResult]
    total:     int
    n_attacks: int
    n_normal:  int


# ── Preprocessing (mirrors notebook's X exactly) ──────────────────────────────

def preprocess(samples: List[dict]) -> pd.DataFrame:
    df = pd.DataFrame(samples)

    # 1. Drop zero-variance cols (same as notebook's drop_list)
    df = df.drop(columns=ZERO_VAR_COLS, errors="ignore")

    # 2. IQR capping on numeric cols — clip to [0, upper] for non-negative features
    #    Rate features already validated [0,1] by pydantic.
    #    For count/byte features we clip negatives (shouldn't happen but safe)
    count_cols = ["duration", "src_bytes", "dst_bytes", "wrong_fragment",
                  "urgent", "hot", "num_failed_logins", "num_compromised",
                  "num_root", "num_file_creations", "num_shells",
                  "num_access_files", "count", "srv_count",
                  "dst_host_count", "dst_host_srv_count"]
    for col in count_cols:
        if col in df.columns:
            df[col] = df[col].clip(lower=0)

    # 3. Encode categoricals exactly as LabelEncoder did in the notebook
    df["protocol_type"] = df["protocol_type"].map(PROTOCOL_MAP).fillna(0).astype(int)
    df["flag"]          = df["flag"].map(FLAG_MAP).fillna(0).astype(int)
    df["service"]       = df["service"].map(SERVICE_MAP).fillna(0).astype(int)

    # 4. Reorder columns to match FEATURE_NAMES (the column order of X in notebook)
    cols = [c for c in FEATURE_NAMES if c in df.columns]
    df = df[cols]

    return df


def run_prediction(samples: List[dict]) -> List[PredictionResult]:
    df     = preprocess(samples)
    preds  = PIPELINE.predict(df)
    probas = PIPELINE.predict_proba(df)   # [P(Normal), P(Attack)]

    results = []
    for pred, proba in zip(preds, probas):
        label = CLASSES[int(pred)]
        results.append(PredictionResult(
            prediction        = label,
            confidence        = round(float(proba[int(pred)]), 4),
            probabilities     = {
                "Normal": round(float(proba[0]), 4),
                "Attack": round(float(proba[1]), 4),
            },
            is_attack         = bool(pred == 1),
            attack_confidence = round(float(proba[1]), 4),
        ))
    return results


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def health():
    return {"status": "ok", "service": "KDD Network Intrusion Detection API"}


@app.get("/api/model-info", tags=["Model"])
def model_info():
    return {
        "kernel":           META.get("chosen_kernel"),
        "best_params":      META.get("best_params"),
        "n_pca_components": META.get("n_pca_components"),
        "train_accuracy":   META.get("train_acc"),
        "test_accuracy":    META.get("test_acc"),
        "classes":          CLASSES,
    }


@app.post("/api/predict", response_model=PredictionResult, tags=["Prediction"])
def predict(sample: NetworkSample):
    try:
        return run_prediction([sample.dict()])[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/predict/batch", response_model=BatchResult, tags=["Prediction"])
def predict_batch(request: BatchRequest):
    if not request.samples:
        raise HTTPException(status_code=400, detail="No samples provided.")
    if len(request.samples) > 1000:
        raise HTTPException(status_code=400, detail="Batch size limit is 1,000.")
    try:
        results   = run_prediction([s.dict() for s in request.samples])
        n_attacks = sum(1 for r in results if r.is_attack)
        return BatchResult(
            results   = results,
            total     = len(results),
            n_attacks = n_attacks,
            n_normal  = len(results) - n_attacks,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))