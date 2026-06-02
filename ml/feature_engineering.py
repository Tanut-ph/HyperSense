"""
feature_engineering.py
──────────────────────────────────────────────────────────────────────────────
สร้าง features จาก raw dataset (data_dictionary_hypertension_example.xlsx)

ตัวแปรอ้างอิงจาก data dictionary:
  vitalsign_sbp_P, vitalsign_dbp_P, vitalsign_hr_P, vitalsign_bmi_P
  lab_hba1c_P, lab_fpg_P, lab_ldl_P, lab_hdl_P, lab_potassium_P,
  lab_probnp_P, lab_uacr_P, lab_creatinine_P, lab_tg_P
  co_dm, co_ckd, co_cad, co_hf, co_stroke, co_atrial_fibrillation,
  co_arrhythmias, co_dementia
  med_acei, med_arb, med_ccb, med_beta_blocker, med_diuretics,
  med_alpha_blocker, med_neprilysin_inhibitor
"""

import numpy as np
import pandas as pd
from typing import List, Tuple

# ── ช่วง period ที่ใช้เป็น features (ก่อน baseline) ───────────────────────
# P = -3 ถึง 0 = 4 periods × 60 วัน = ย้อนหลัง ~8 เดือน
FEATURE_PERIODS = [-3, -2, -1, 0]

VITALSIGN_VARS = ["sbp", "dbp", "hr", "bmi", "wt", "o2sat", "resp"]
LAB_VARS = [
    "hba1c", "fpg", "ldl", "hdl", "tg", "chol",
    "potassium", "sodium", "creatinine",
    "probnp", "troponin", "uacr", "upcr",
    "wbc", "hemoglobin", "uric",
]
COMORBIDITY_VARS = [
    "co_dm", "co_ckd", "co_cad", "co_hf",
    "co_stroke", "co_atrial_fibrillation",
    "co_arrhythmias", "co_dementia",
]
MED_VARS = [
    "med_acei", "med_arb", "med_ccb", "med_beta_blocker",
    "med_diuretics", "med_alpha_blocker",
    "med_neprilysin_inhibitor", "med_alpha2_agonist",
    "med_hydralazine", "med_alpha_beta_blocker",
]

# ── Target: โรคร่วมที่เกิดขึ้นหลัง baseline ─────────────────────────────────
TARGET_VARS = [
    "co_hf", "co_stroke", "co_cad",
    "co_ckd", "co_atrial_fibrillation",
]


def _col(prefix: str, p: int) -> str:
    """สร้างชื่อคอลัมน์ เช่น vitalsign_sbp_-2"""
    return f"vitalsign_{prefix}_{p}"


def _lab_col(name: str, p: int) -> str:
    return f"lab_{name}_{p}"


def extract_time_series_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    สร้าง aggregated features จาก time-series ย้อนหลัง

    สำหรับแต่ละตัวแปร vital/lab สร้าง:
      - mean   : ค่าเฉลี่ย
      - std    : ความผันผวน (BP Variability)
      - slope  : แนวโน้ม (linear regression slope)
      - last   : ค่าล่าสุด (P=0)
      - max    : ค่าสูงสุด
    """
    features = {}

    # ── Vital signs ─────────────────────────────────────────────────────────
    for var in VITALSIGN_VARS:
        cols = [_col(var, p) for p in FEATURE_PERIODS if _col(var, p) in df.columns]
        if not cols:
            continue
        arr = df[cols].values.astype(float)

        features[f"vs_{var}_mean"]  = np.nanmean(arr, axis=1)
        features[f"vs_{var}_std"]   = np.nanstd(arr, axis=1)
        features[f"vs_{var}_last"]  = df[cols[-1]].values.astype(float)
        features[f"vs_{var}_max"]   = np.nanmax(arr, axis=1)

        # Linear regression slope
        valid_x = np.array(FEATURE_PERIODS[:len(cols)])
        slopes = []
        for row in arr:
            mask = ~np.isnan(row)
            if mask.sum() >= 2:
                x = valid_x[mask]
                y = row[mask]
                slope = np.polyfit(x, y, 1)[0]
            else:
                slope = np.nan
            slopes.append(slope)
        features[f"vs_{var}_slope"] = np.array(slopes)

    # ── SBP-specific: Cumulative load above 130 mmHg ─────────────────────
    sbp_cols = [_col("sbp", p) for p in FEATURE_PERIODS if _col("sbp", p) in df.columns]
    if sbp_cols:
        sbp_arr = df[sbp_cols].values.astype(float)
        features["sbp_load_130"] = np.nansum(np.maximum(sbp_arr - 130, 0), axis=1)
        features["sbp_load_140"] = np.nansum(np.maximum(sbp_arr - 140, 0), axis=1)
        features["sbp_n_above140"] = np.sum(sbp_arr > 140, axis=1)

    # ── Lab values ──────────────────────────────────────────────────────────
    for var in LAB_VARS:
        cols = [_lab_col(var, p) for p in FEATURE_PERIODS if _lab_col(var, p) in df.columns]
        if not cols:
            continue
        arr = df[cols].values.astype(float)
        features[f"lab_{var}_mean"] = np.nanmean(arr, axis=1)
        features[f"lab_{var}_last"] = df[cols[-1]].values.astype(float)
        # has_value flag (บางคนไม่มี lab บางชนิด)
        features[f"lab_{var}_has"]  = (~np.isnan(df[cols[-1]].values.astype(float))).astype(int)

    # ── Comorbidities at baseline (P=0) ──────────────────────────────────
    for var in COMORBIDITY_VARS:
        col = f"{var}_0"
        if col in df.columns:
            features[var] = (df[col].notna() & (df[col] == 1)).astype(int).values

    # ── Baseline comorbidities (static) ──────────────────────────────────
    for var in COMORBIDITY_VARS:
        if var in df.columns:
            features[f"{var}_base"] = df[var].fillna(0).astype(int).values

    # ── Medications at baseline ────────────────────────────────────────────
    for var in MED_VARS:
        col = f"{var}_0"
        if col in df.columns:
            features[f"{var}_now"] = (df[col].notna() & (df[col] == 1)).astype(int).values
        if var in df.columns:
            features[f"{var}_base"] = df[var].fillna(0).astype(int).values

    # ── Demographics ─────────────────────────────────────────────────────
    if "age" in df.columns:
        age_vals = pd.to_numeric(df["age"], errors="coerce")
        features["age"]        = age_vals.fillna(age_vals.median()).values
        features["age_gte_65"] = (age_vals >= 65).astype(int).values
        features["age_gte_70"] = (age_vals >= 70).astype(int).values

    if "sex" in df.columns:
        features["sex_male"] = (df["sex"].str.upper() == "MALE").astype(int).values

    return pd.DataFrame(features, index=df.index)


def build_targets(df: pd.DataFrame, horizon_periods: List[int] = [1, 2, 3]) -> pd.DataFrame:
    """
    สร้าง target labels จากโรคที่เกิดขึ้นใน period หลัง baseline

    horizon_periods = [1,2,3] = ดูว่าเกิดโรคใน 60–180 วัน หลัง ht_onset
    """
    targets = {}
    for var in TARGET_VARS:
        name = var.replace("co_", "")
        # เกิดโรคถ้า var_P == 1 ใน period ใดก็ได้ใน horizon
        occurred = np.zeros(len(df), dtype=int)
        for p in horizon_periods:
            col = f"{var}_{p}"
            if col in df.columns:
                occurred |= (df[col].notna() & (df[col] == 1)).astype(int).values
        targets[f"target_{name}"] = occurred

    return pd.DataFrame(targets, index=df.index)


def load_and_prepare(xlsx_path: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    อ่าน xlsx → feature matrix X และ target matrix y

    Returns:
        X : pd.DataFrame — features พร้อม train
        y : pd.DataFrame — targets (multi-label)
    """
    print(f"[load] reading {xlsx_path} ...")
    df = pd.read_excel(xlsx_path, sheet_name="data")
    print(f"[load] shape: {df.shape}")

    print("[feature] extracting time-series features ...")
    X = extract_time_series_features(df)

    print("[target] building target labels ...")
    y = build_targets(df)

    # ลบแถวที่ X ทุกคอลัมน์เป็น NaN
    valid = X.notna().any(axis=1)
    X = X[valid]
    y = y[valid]

    print(f"[done] X: {X.shape}, y: {y.shape}")
    print(f"[target distribution]\n{y.sum()}")
    return X, y
