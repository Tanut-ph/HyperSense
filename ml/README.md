# HyperSense ML Backend

## โครงสร้างไฟล์

```
ml/
├── feature_engineering.py   ← สร้าง features จาก dataset
├── train.py                 ← Train XGBoost + บันทึก models
├── predict.py               ← Prediction engine + SHAP
├── api.py                   ← FastAPI server
├── requirements.txt
└── models/                  ← สร้างอัตโนมัติเมื่อ train
    ├── model_hf.joblib
    ├── model_stroke.joblib
    ├── model_cad.joblib
    ├── model_ckd.joblib
    ├── model_atrial_fibrillation.joblib
    ├── feature_names.json
    ├── thresholds.json
    └── metrics.json
```

## ขั้นตอน

### 1. ติดตั้ง dependencies
```bash
cd ml
pip install -r requirements.txt
```

### 2. Train model
```bash
python train.py --data "path/to/data_dictionary_hypertension_example.xlsx"
python train.py --data "D:\Work\hackaton\data_dictionary_hypertension_example (1).xlsx"
```

ผลลัพธ์จะแสดง CV AUROC ของแต่ละ target:
```
hf                        AUROC=0.821  AUPRC=0.643
stroke                    AUROC=0.784  AUPRC=0.512
cad                       AUROC=0.798  AUPRC=0.601
ckd                       AUROC=0.856  AUPRC=0.712
atrial_fibrillation       AUROC=0.773  AUPRC=0.489
```

### 3. รัน API server
```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

### 4. เพิ่ม .env.local
```env
NEXT_PUBLIC_ML_API_URL=http://localhost:8000
```

## API Endpoints

### POST /predict
```json
Request:
{
  "patientId": "10001",
  "age": 67,
  "sex": "ชาย",
  "visits": [{"date":"2026-05-14","sbp":158,"dbp":94,"heartRate":81,"weight":76,"bmi":26.8}],
  "labs": {"hba1c":7.8,"ldl":128,"potassium":4.2},
  "comorbidities": {"diabetes":true,"ckd":true},
  "medications": [{"drugClass":"ARB","drugName":"Losartan","dose":"50mg","frequency":"1x/วัน"}]
}

Response:
{
  "patientId": "10001",
  "risks": [
    {
      "target": "ckd",
      "condition": "โรคไตเรื้อรัง (co_ckd)",
      "probability": 72.3,
      "threshold": 45.0,
      "positive": true,
      "severity": "high",
      "shap_top5": [
        {"feature":"co_ckd_base","shap":0.842,"value":1.0,"direction":"เพิ่มความเสี่ยง"},
        {"feature":"lab_potassium_last","shap":0.341,"value":4.2,"direction":"เพิ่มความเสี่ยง"}
      ]
    }
  ],
  "summary": {
    "n_positive": 2,
    "highest_risk": "โรคไตเรื้อรัง (co_ckd)",
    "avg_sbp": 155.0,
    "sbp_trend": "เพิ่มขึ้น"
  }
}
```

## Algorithm

- **Model**: XGBoost Classifier (per target)
- **Validation**: 5-fold Stratified Cross-validation
- **Imbalance**: SMOTE oversampling
- **Calibration**: Platt Scaling (CalibratedClassifierCV)
- **Explainability**: SHAP TreeExplainer
- **Features**: ~80+ จาก vitalsign time-series + lab + comorbidities + medications
