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


def _any_model_available() -> bool:
    """มีไฟล์ model_<target>.joblib อย่างน้อย 1 ตัวหรือไม่"""
    return any((MODEL_DIR / f"model_{t}.joblib").exists() for t in TARGET_LABELS)


def _severity(prob: float) -> str:
    return "high" if prob >= 70 else "moderate" if prob >= 50 else "low"


def clinical_score_patient(f: Dict[str, float]) -> List[Dict]:
    """
    ตัวประเมินความเสี่ยงเชิงคลินิก (rule-based) — ใช้เมื่อยังไม่มีโมเดล XGBoost
    ทำให้ /predict ตอบผลที่มีความหมายได้ทันที และอธิบายเหตุผลได้โปร่งใส
    """
    sbp_mean = f.get("vs_sbp_mean", 0.0) or 0.0
    sbp_std  = f.get("vs_sbp_std", 0.0) or 0.0
    hr_last  = f.get("vs_hr_last", 0.0) or 0.0
    age      = f.get("age", 0.0) or 0.0
    g = lambda k: 1.0 if f.get(k, 0.0) else 0.0  # noqa: E731
    lab = lambda k: f.get(k)                      # noqa: E731

    common = []
    if sbp_mean: common.append(f"SBP เฉลี่ย {sbp_mean:.0f} mmHg")
    if sbp_std:  common.append(f"ความผันผวน BP {sbp_std:.1f} mmHg")
    if age:      common.append(f"อายุ {age:.0f} ปี")

    defs = [
        {
            "target": "ckd", "p": 0.0, "basis": [],
            "rules": [
                (g("co_ckd_base"), 35, "มีประวัติโรคไตเรื้อรัง"),
                ((lab("lab_potassium_last") or 0) >= 5.0, 12, "โพแทสเซียมสูง"),
                ((lab("lab_uacr_last") or 0) >= 30, 12, "uACR สูง"),
                (g("co_dm_base"), 10, "เบาหวานเร่งการเสื่อมของไต"),
                (sbp_mean >= 150, 12, "ความดันสูงต่อเนื่อง"),
                (age >= 65, 8, "อายุมาก"),
            ],
        },
        {
            "target": "cad", "p": 0.0, "basis": [],
            "rules": [
                (g("co_cad_base"), 38, "มีประวัติโรคหลอดเลือดหัวใจ"),
                ((lab("lab_ldl_last") or 0) >= 130, 12, "LDL สูง"),
                (g("co_dm_base"), 10, "เบาหวานเพิ่มความเสี่ยง"),
                (sbp_mean >= 150, 12, "ความดันสูง"),
                (age >= 60, 8, "อายุมาก"),
            ],
        },
        {
            "target": "hf", "p": 0.0, "basis": [],
            "rules": [
                (g("co_hf_base"), 40, "มีภาวะหัวใจล้มเหลว"),
                (g("co_cad_base"), 14, "มีโรคหลอดเลือดหัวใจร่วม"),
                ((lab("lab_probnp_last") or 0) >= 125, 16, "NT-proBNP สูง"),
                (sbp_mean >= 160, 12, "ความดันสูงมาก"),
                (hr_last >= 95, 8, "หัวใจเต้นเร็ว"),
            ],
        },
        {
            "target": "stroke", "p": 0.0, "basis": [],
            "rules": [
                (g("co_stroke_base"), 40, "มีประวัติโรคหลอดเลือดสมอง"),
                (g("co_atrial_fibrillation_base"), 16, "มี AF เพิ่มความเสี่ยง stroke"),
                (sbp_mean >= 160, 14, "ความดันสูงมาก"),
                (sbp_std >= 15, 10, "ความดันผันผวนสูง"),
                (age >= 65, 8, "อายุมาก"),
            ],
        },
        {
            "target": "atrial_fibrillation", "p": 0.0, "basis": [],
            "rules": [
                (g("co_atrial_fibrillation_base"), 40, "มีประวัติ AF"),
                (g("co_arrhythmias_base"), 18, "มีภาวะหัวใจเต้นผิดจังหวะ"),
                (hr_last >= 100, 12, "หัวใจเต้นเร็ว"),
                (g("co_hf_base"), 10, "หัวใจล้มเหลวร่วม"),
                (age >= 65, 8, "อายุมาก"),
            ],
        },
    ]

    results = []
    for d in defs:
        prob, reasons = 0.0, []
        for cond, weight, text in d["rules"]:
            if cond:
                prob += weight
                reasons.append(text)
        prob = min(95.0, prob)
        basis = (reasons[:3] if reasons else ["ไม่มีปัจจัยเสี่ยงเด่นชัด"]) + common[:1]
        results.append({
            "target":      d["target"],
            "condition":   TARGET_LABELS[d["target"]],
            "probability": round(prob, 1),
            "threshold":   50.0,
            "positive":    prob >= 50,
            "severity":    _severity(prob),
            "shap_top5":   [],
            "basis":       basis,
            "model":       "clinical",
        })

    results.sort(key=lambda r: r["probability"], reverse=True)
    return results


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
    # ยังไม่มีโมเดล XGBoost → ใช้การประเมินเชิงคลินิก (rule-based) เพื่อให้ตอบผลได้ทันที
    if not _any_model_available():
        return clinical_score_patient(patient_features)

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
            "basis":       [],
            "model":       "xgboost",
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
        "ACEI":               "med_acei",
        "ARB":                "med_arb",
        "CCB":                "med_ccb",
        "Beta-blocker":       "med_beta_blocker",
        "Diuretic":           "med_diuretics",
        "Alpha-blocker":      "med_alpha_blocker",
        "Alpha2-Agonist":     "med_alpha2_agonist",
        "ARNI":               "med_neprilysin_inhibitor",
        "Alpha-Beta-blocker": "med_alpha_beta_blocker",
        "Direct-Vasodilator": "med_hydralazine",
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
