"""
train.py
──────────────────────────────────────────────────────────────────────────────
Train XGBoost multi-label classifier สำหรับทำนายโรคร่วม

Usage:
    python train.py --data "path/to/data_dictionary_hypertension_example.xlsx"

Output:
    models/model_<target>.joblib   — XGBoost model แต่ละ target
    models/feature_names.json      — รายชื่อ features
    models/thresholds.json         — optimal threshold แต่ละ target
    models/metrics.json            — ผลการประเมิน
"""

import argparse
import json
import os
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap
from imblearn.over_sampling import SMOTE
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from feature_engineering import TARGET_VARS, load_and_prepare

warnings.filterwarnings("ignore")

MODEL_DIR = Path("models")
MODEL_DIR.mkdir(exist_ok=True)


# ── XGBoost hyperparameters ─────────────────────────────────────────────────
XGB_PARAMS = {
    "n_estimators":     300,
    "max_depth":        4,
    "learning_rate":    0.05,
    "subsample":        0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 3,
    "gamma":            0.1,
    "reg_alpha":        0.1,
    "reg_lambda":       1.0,
    "eval_metric":      "auc",
    "early_stopping_rounds": 30,
    "random_state":     42,
    "n_jobs":           -1,
    "use_label_encoder": False,
}


def find_optimal_threshold(y_true: np.ndarray, y_prob: np.ndarray) -> float:
    """หา threshold ที่ให้ F1 score สูงสุด"""
    best_f1, best_thr = 0.0, 0.5
    for thr in np.arange(0.1, 0.9, 0.02):
        pred = (y_prob >= thr).astype(int)
        tp = ((pred == 1) & (y_true == 1)).sum()
        fp = ((pred == 1) & (y_true == 0)).sum()
        fn = ((pred == 0) & (y_true == 1)).sum()
        if tp + fp == 0 or tp + fn == 0:
            continue
        prec = tp / (tp + fp)
        rec  = tp / (tp + fn)
        f1   = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0
        if f1 > best_f1:
            best_f1, best_thr = f1, thr
    return best_thr


def train_single_target(
    X: pd.DataFrame,
    y_series: pd.Series,
    target_name: str,
    feature_names: list,
) -> dict:
    """
    Train + evaluate สำหรับ 1 target ด้วย 5-fold cross-validation
    """
    print(f"\n{'='*60}")
    print(f"  Training: {target_name}")
    pos = y_series.sum()
    print(f"  Positive: {pos}/{len(y_series)} ({pos/len(y_series)*100:.1f}%)")

    if pos < 5:
        print(f"  [SKIP] ไม่มีตัวอย่าง positive เพียงพอ")
        return {}

    X_arr = X.fillna(X.median()).values
    y_arr = y_series.values

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    oof_probs = np.zeros(len(y_arr))
    fold_aucs, fold_aps = [], []

    for fold, (tr_idx, va_idx) in enumerate(cv.split(X_arr, y_arr)):
        X_tr, X_va = X_arr[tr_idx], X_arr[va_idx]
        y_tr, y_va = y_arr[tr_idx], y_arr[va_idx]

        # SMOTE เฉพาะเมื่อ imbalanced มาก
        if pos / len(y_arr) < 0.2 and y_tr.sum() >= 3:
            smote = SMOTE(random_state=42, k_neighbors=min(3, y_tr.sum()-1))
            try:
                X_tr, y_tr = smote.fit_resample(X_tr, y_tr)
            except Exception:
                pass

        # Scale features
        scaler = StandardScaler()
        X_tr = scaler.fit_transform(X_tr)
        X_va = scaler.transform(X_va)

        model = XGBClassifier(**XGB_PARAMS)
        model.fit(
            X_tr, y_tr,
            eval_set=[(X_va, y_va)],
            verbose=False,
        )

        probs = model.predict_proba(X_va)[:, 1]
        oof_probs[va_idx] = probs

        if y_va.sum() > 0:
            auc = roc_auc_score(y_va, probs)
            ap  = average_precision_score(y_va, probs)
            fold_aucs.append(auc)
            fold_aps.append(ap)
            print(f"  Fold {fold+1}: AUROC={auc:.3f}  AUPRC={ap:.3f}")

    mean_auc = np.mean(fold_aucs) if fold_aucs else 0
    mean_ap  = np.mean(fold_aps)  if fold_aps  else 0
    print(f"  CV AUROC: {mean_auc:.3f} ± {np.std(fold_aucs):.3f}")
    print(f"  CV AUPRC: {mean_ap:.3f}  ± {np.std(fold_aps):.3f}")

    # Train final model บน full dataset
    scaler_final = StandardScaler()
    X_scaled = scaler_final.fit_transform(X.fillna(X.median()).values)

    # Split 80/20 สำหรับ early stopping
    split = int(0.8 * len(X_scaled))
    final_model = XGBClassifier(**XGB_PARAMS)
    final_model.fit(
        X_scaled[:split], y_arr[:split],
        eval_set=[(X_scaled[split:], y_arr[split:])],
        verbose=False,
    )

    # Calibrate probabilities
    calibrated = CalibratedClassifierCV(final_model, cv="prefit", method="sigmoid")
    calibrated.fit(X_scaled, y_arr)

    # Optimal threshold
    threshold = find_optimal_threshold(y_arr, oof_probs)
    print(f"  Optimal threshold: {threshold:.2f}")

    # SHAP feature importance
    explainer = shap.TreeExplainer(final_model)
    shap_values = explainer.shap_values(X_scaled[:min(50, len(X_scaled))])
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    top10_idx = np.argsort(mean_abs_shap)[::-1][:10]
    top_features = [
        {"feature": feature_names[i], "importance": float(mean_abs_shap[i])}
        for i in top10_idx
    ]

    # Save model + scaler
    joblib.dump({
        "model":    calibrated,
        "scaler":   scaler_final,
        "features": feature_names,
    }, MODEL_DIR / f"model_{target_name}.joblib")

    metrics = {
        "target":    target_name,
        "cv_auroc":  round(mean_auc, 4),
        "cv_auprc":  round(mean_ap, 4),
        "threshold": round(threshold, 3),
        "n_positive": int(pos),
        "n_total":    len(y_arr),
        "top_features": top_features,
    }
    return metrics


def main(xlsx_path: str):
    X, y = load_and_prepare(xlsx_path)

    feature_names = list(X.columns)
    with open(MODEL_DIR / "feature_names.json", "w", encoding="utf-8") as f:
        json.dump(feature_names, f, ensure_ascii=False, indent=2)
    print(f"\n[features] บันทึก {len(feature_names)} features")

    all_metrics  = {}
    all_thresholds = {}

    for var in TARGET_VARS:
        target_name = var.replace("co_", "")
        target_col  = f"target_{target_name}"
        if target_col not in y.columns:
            continue
        metrics = train_single_target(X, y[target_col], target_name, feature_names)
        if metrics:
            all_metrics[target_name]    = metrics
            all_thresholds[target_name] = metrics["threshold"]

    # Save summary
    with open(MODEL_DIR / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(all_metrics, f, ensure_ascii=False, indent=2)
    with open(MODEL_DIR / "thresholds.json", "w", encoding="utf-8") as f:
        json.dump(all_thresholds, f, ensure_ascii=False, indent=2)

    print("\n" + "="*60)
    print("TRAINING COMPLETE")
    print("="*60)
    for name, m in all_metrics.items():
        print(f"  {name:25s}  AUROC={m['cv_auroc']:.3f}  AUPRC={m['cv_auprc']:.3f}")
    print(f"\nModels saved to: {MODEL_DIR.absolute()}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="path to xlsx file")
    args = parser.parse_args()
    main(args.data)
