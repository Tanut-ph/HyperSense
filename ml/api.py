"""
api.py  —  FastAPI prediction server
──────────────────────────────────────────────────────────────────────────────
Run:
    uvicorn api:app --host 0.0.0.0 --port 8000 --reload

Endpoints:
    GET  /health          — health check
    POST /predict         — ทำนายความเสี่ยงจาก patient data
    GET  /model-info      — ข้อมูล model performance
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from predict import build_features_from_visit_history, predict_patient


import os
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")
origins = (
    ["*"] if ALLOWED_ORIGINS == "*"
    else [o.strip() for o in ALLOWED_ORIGINS.split(",")]
)
app = FastAPI(
    title="HyperSense ML API",
    description="Hypertension Risk Prediction — XGBoost multi-label classifier",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = Path(__file__).parent / "models"


# ─── Request / Response schemas ──────────────────────────────────────────────

class BPVisit(BaseModel):
    date:       str
    sbp:        int   = Field(..., ge=60, le=250, description="vitalsign_sbp_P (mmHg)")
    dbp:        int   = Field(..., ge=40, le=160, description="vitalsign_dbp_P (mmHg)")
    heartRate:  int   = Field(..., ge=30, le=200, description="vitalsign_hr_P (/min)")
    weight:     float = Field(..., description="vitalsign_wt_P (kg)")
    bmi:        float = Field(..., description="vitalsign_bmi_P")


class LabValues(BaseModel):
    hba1c:      Optional[float] = Field(None, description="lab_hba1c_P (%)")
    ldl:        Optional[float] = Field(None, description="lab_ldl_P (mg/dL)")
    hdl:        Optional[float] = Field(None, description="lab_hdl_P (mg/dL)")
    creatinine: Optional[float] = Field(None, description="lab_creatinine_P (mg/dL)")
    egfr:       Optional[float] = Field(None, description="eGFR (mL/min)")
    potassium:  Optional[float] = Field(None, description="lab_potassium_P (mEq/L)")
    proBNP:     Optional[float] = Field(None, description="lab_probnp_P (pg/mL)")
    uacr:       Optional[float] = Field(None, description="lab_uacr_P")
    tg:         Optional[float] = Field(None, description="lab_tg_P (mg/dL)")
    fpg:        Optional[float] = Field(None, description="lab_fpg_P (mg/dL)")


class Comorbidities(BaseModel):
    diabetes:    bool = False   # co_dm
    ckd:         bool = False   # co_ckd
    cad:         bool = False   # co_cad
    heartFailure:bool = False   # co_hf
    stroke:      bool = False   # co_stroke
    af:          bool = False   # co_atrial_fibrillation
    arrhythmias: bool = False   # co_arrhythmias
    dementia:    bool = False   # co_dementia


class MedicationItem(BaseModel):
    drugClass: str
    drugName:  str
    dose:      str = ""
    frequency: str = ""


class PredictRequest(BaseModel):
    patientId: str
    age:       int          = Field(..., ge=0, le=120)
    sex:       str          = Field(..., pattern="^(ชาย|หญิง)$")
    visits:    List[BPVisit]
    labs:      LabValues
    comorbidities:  Comorbidities
    medications:    List[MedicationItem] = []


class SHAPEntry(BaseModel):
    feature:   str
    shap:      float
    value:     float
    direction: str


class RiskResult(BaseModel):
    target:      str
    condition:   str
    probability: float   # เป็น %
    threshold:   float   # %
    positive:    bool
    severity:    str     # low | moderate | high
    shap_top5:   List[SHAPEntry]


class PredictResponse(BaseModel):
    patientId: str
    risks:     List[RiskResult]
    summary: Dict[str, Any]


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    models_ready = (MODEL_DIR / "feature_names.json").exists()
    return {
        "status":       "ok" if models_ready else "models_not_trained",
        "models_ready": models_ready,
        "version":      "1.0.0",
    }


@app.get("/model-info")
def model_info():
    metrics_path = MODEL_DIR / "metrics.json"
    if not metrics_path.exists():
        raise HTTPException(status_code=404, detail="Models not trained yet. Run train.py first.")
    with open(metrics_path, encoding="utf-8") as f:
        return json.load(f)


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    # ตรวจสอบว่า models พร้อมแล้ว
    if not (MODEL_DIR / "feature_names.json").exists():
        raise HTTPException(
            status_code=503,
            detail="ML models not ready. Please run: python train.py --data <xlsx_path>",
        )

    if len(req.visits) < 2:
        raise HTTPException(
            status_code=422,
            detail="ต้องมีข้อมูล BP อย่างน้อย 2 visits สำหรับการทำนาย",
        )

    # แปลง request → feature dict
    visits_dicts = [v.model_dump() for v in req.visits]
    labs_dict    = req.labs.model_dump()
    co_dict      = req.comorbidities.model_dump()
    med_dicts    = [m.model_dump() for m in req.medications]

    features = build_features_from_visit_history(
        visits=visits_dicts,
        labs=labs_dict,
        comorbidities=co_dict,
        medications=med_dicts,
        age=req.age,
        sex=req.sex,
    )

    # Predict
    raw_results = predict_patient(features)

    # สร้าง summary
    high_risks = [r for r in raw_results if r["positive"]]
    summary = {
        "n_positive":    len(high_risks),
        "highest_risk":  raw_results[0]["condition"] if raw_results else None,
        "highest_prob":  raw_results[0]["probability"] if raw_results else 0,
        "avg_sbp":       round(features.get("vs_sbp_mean", 0), 1),
        "sbp_trend":     "เพิ่มขึ้น" if features.get("vs_sbp_slope", 0) > 0.5
                         else "ลดลง" if features.get("vs_sbp_slope", 0) < -0.5
                         else "คงที่",
    }

    return PredictResponse(
        patientId=req.patientId,
        risks=[RiskResult(**r) for r in raw_results],
        summary=summary,
    )


# ─── Run ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
