"""
predict.py
──────────────────────────────────────────────────────────────────────────────
Prediction engine — โหลด trained models และทำนาย

Input: dict ของ patient features (ตรงกับ feature_names.json)
Output: risk probabilities + feature importance (SHAP)
"""

import json
from pathlib import Path
from typing import Any, Dict, List

import joblib
import numpy as np
import shap

MODEL_DIR = Path(__file__).parent / "models"

_cache: Dict[str, Any] = {}  # cache models in memory


def _load_model(target: str) -> dict | None:
    if target in _cache:
        return _cache[target]
    path = MODEL_DIR / f"model_{target}.joblib"
    if not path.exists():
        return None
    obj = joblib.load(path)
    _cache[target] = obj
    return obj


def _load_feature_names() -> list:
    with open(MODEL_DIR / "feature_names.json", encoding="utf-8") as f:
        return json.load(f)


def _load_thresholds() -> dict:
    with open(MODEL_DIR / "thresholds.json", encoding="utf-8") as f:
        return json.load(f)


TARGET_LABELS = {
    "hf":               "หัวใจล้มเหลว (co_hf)",
    "stroke":           "โรคหลอดเลือดสมอง (co_stroke)",
    "cad":              "หลอดเลือดหัวใจ (co_cad)",
    "ckd":              "โรคไตเรื้อรัง (co_ckd)",
    "atrial_fibrillation": "หัวใจห้องบนสั่นพลิ้ว (co_atrial_fibrillation)",
}


def predict_patient(patient_features: Dict[str, float]) -> List[Dict]:
    """
    รับ dict ของ features → คืน list ของ risk predictions

    patient_features ตัวอย่าง:
    {
        "vs_sbp_mean": 158.0,
        "vs_sbp_std": 6.2,
        "vs_sbp_slope": 2.1,
        "lab_hba1c_last": 7.8,
        "lab_potassium_last": 4.2,
        "co_dm_base": 1,
        "co_ckd_base": 1,
        "age": 67,
        ...
    }
    """
    feature_names = _load_feature_names()
    thresholds    = _load_thresholds()

    # สร้าง feature vector เรียงตาม feature_names
    x = np.array([patient_features.get(f, np.nan) for f in feature_names], dtype=float)
    x = x.reshape(1, -1)

    results = []
    for target, label in TARGET_LABELS.items():
        obj = _load_model(target)
        if obj is None:
            continue

        scaler   = obj["scaler"]
        model    = obj["model"]
        features = obj["features"]

        # align features
        x_aligned = np.array([patient_features.get(f, np.nan) for f in features], dtype=float)

        # fill NaN ด้วย median (ใช้ค่าจาก training ถ้ามี)
        nan_mask = np.isnan(x_aligned)
        if nan_mask.any():
            x_aligned[nan_mask] = 0.0  # fallback

        x_scaled = scaler.transform(x_aligned.reshape(1, -1))
        prob = float(model.predict_proba(x_scaled)[0, 1])
        threshold = thresholds.get(target, 0.5)
        positive = prob >= threshold

        # SHAP values สำหรับ explainability
        try:
            base_model = model.estimator if hasattr(model, "estimator") else model
            if hasattr(base_model, "estimators_"):
                base_model = base_model.estimators_[0]
            explainer  = shap.TreeExplainer(base_model)
            shap_vals  = explainer.shap_values(x_scaled)[0]
            top_idx    = np.argsort(np.abs(shap_vals))[::-1][:5]
            top_shap   = [
                {
                    "feature":   features[i],
                    "shap":      round(float(shap_vals[i]), 4),
                    "value":     round(float(x_aligned[i]), 3),
                    "direction": "เพิ่มความเสี่ยง" if shap_vals[i] > 0 else "ลดความเสี่ยง",
                }
                for i in top_idx
            ]
        except Exception:
            top_shap = []

        severity = (
            "high"     if prob >= 0.7 else
            "moderate" if prob >= 0.4 else
            "low"
        )

        results.append({
            "target":      target,
            "condition":   label,
            "probability": round(prob * 100, 1),   # เป็น %
            "threshold":   round(threshold * 100, 1),
            "positive":    positive,
            "severity":    severity,
            "shap_top5":   top_shap,
        })

    # เรียงตาม probability สูงสุด
    results.sort(key=lambda r: r["probability"], reverse=True)
    return results


def build_features_from_visit_history(
    visits: List[Dict],        # [{date, sbp, dbp, heartRate, weight, bmi}, ...]
    labs: Dict,                # {hba1c, ldl, hdl, creatinine, egfr, potassium, ...}
    comorbidities: Dict,       # {diabetes, ckd, cad, heartFailure, stroke, af, arrhythmias, dementia}
    medications: List[Dict],   # [{drugClass, ...}]
    age: int,
    sex: str,
) -> Dict[str, float]:
    """
    แปลง patient data จาก HyperSense format → feature dict สำหรับ predict_patient()
    """
    features: Dict[str, float] = {}

    # ── Vital signs จาก visit history ────────────────────────────────────
    if visits:
        sbps  = [v["sbp"]       for v in visits]
        dbps  = [v["dbp"]       for v in visits]
        hrs   = [v["heartRate"] for v in visits]
        bmis  = [v.get("bmi", 0) for v in visits]
        wts   = [v.get("weight", 0) for v in visits]

        def _feat(name: str, vals: list):
            arr = np.array(vals, dtype=float)
            features[f"vs_{name}_mean"]  = float(np.nanmean(arr))
            features[f"vs_{name}_std"]   = float(np.nanstd(arr))
            features[f"vs_{name}_last"]  = float(arr[-1])
            features[f"vs_{name}_max"]   = float(np.nanmax(arr))
            if len(arr) >= 2:
                x = np.arange(len(arr), dtype=float)
                features[f"vs_{name}_slope"] = float(np.polyfit(x, arr, 1)[0])
            else:
                features[f"vs_{name}_slope"] = 0.0

        _feat("sbp", sbps); _feat("dbp", dbps); _feat("hr", hrs)
        _feat("bmi", bmis); _feat("wt", wts)

        sbp_arr = np.array(sbps)
        features["sbp_load_130"]   = float(np.maximum(sbp_arr - 130, 0).sum())
        features["sbp_load_140"]   = float(np.maximum(sbp_arr - 140, 0).sum())
        features["sbp_n_above140"] = int((sbp_arr > 140).sum())

    # ── Lab values ────────────────────────────────────────────────────────
    lab_map = {
        "hba1c":      "hba1c",
        "ldl":        "ldl",
        "hdl":        "hdl",
        "creatinine": "creatinine",
        "potassium":  "potassium",
        "egfr":       "creatinine",  # proxy
        "proBNP":     "probnp",
        "uacr":       "uacr",
        "tg":         "tg",
        "fpg":        "fpg",
    }
    for src_key, feat_key in lab_map.items():
        val = labs.get(src_key)
        if val is not None:
            features[f"lab_{feat_key}_last"] = float(val)
            features[f"lab_{feat_key}_mean"] = float(val)
            features[f"lab_{feat_key}_has"]  = 1.0
        else:
            features[f"lab_{feat_key}_has"] = 0.0

    # ── Comorbidities ─────────────────────────────────────────────────────
    co_map = {
        "diabetes":    "co_dm",
        "ckd":         "co_ckd",
        "cad":         "co_cad",
        "heartFailure":"co_hf",
        "stroke":      "co_stroke",
        "af":          "co_atrial_fibrillation",
        "arrhythmias": "co_arrhythmias",
        "dementia":    "co_dementia",
    }
    for src_key, feat_key in co_map.items():
        val = 1.0 if comorbidities.get(src_key) else 0.0
        features[f"{feat_key}_base"] = val
        features[feat_key] = val

    # ── Medications ───────────────────────────────────────────────────────
    drug_classes = {m.get("drugClass", "") for m in medications}
    med_map = {
        "ACEI":  "med_acei",
        "ARB":   "med_arb",
        "CCB-DHP":   "med_ccb",
        "CCB-NonDHP":"med_ccb",
        "Beta-blocker": "med_beta_blocker",
        "Diuretic-Thiazide": "med_diuretics",
        "Diuretic-Loop":     "med_diuretics",
        "Diuretic-KSparing": "med_diuretics",
        "Alpha-blocker":     "med_alpha_blocker",
        "ARNI":  "med_neprilysin_inhibitor",
    }
    seen_meds = set()
    for dc in drug_classes:
        feat = med_map.get(dc)
        if feat:
            seen_meds.add(feat)
    for feat in set(med_map.values()):
        features[f"{feat}_base"] = 1.0 if feat in seen_meds else 0.0
        features[f"{feat}_now"]  = 1.0 if feat in seen_meds else 0.0

    # ── Demographics ──────────────────────────────────────────────────────
    features["age"]        = float(age)
    features["age_gte_65"] = 1.0 if age >= 65 else 0.0
    features["age_gte_70"] = 1.0 if age >= 70 else 0.0
    features["sex_male"]   = 1.0 if sex == "ชาย" else 0.0

    return features
