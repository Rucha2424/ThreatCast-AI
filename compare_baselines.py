import os
import sys
import numpy as np
import pandas as pd
import tensorflow as tf

from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_auc_score
)

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Input, LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping

# ============================================================
# CONFIGURATION
# ============================================================

CSV_PATH = r"data\CTU13\all_network_states.csv"

TRAIN_SCENARIOS = [1, 2, 3, 6, 7, 8, 9, 10, 11]
VAL_SCENARIOS = [4, 5]
TEST_SCENARIOS = [12, 13]

FEATURES = [
    "Flow_Count",
    "Total_Packets",
    "Total_Bytes",
    "Total_Source_Bytes",
    "Avg_Duration",
    "Avg_Packets_Per_Flow",
    "Avg_Bytes_Per_Flow",
    "Flow_Count_Change",
    "Total_Packets_Change",
    "Total_Bytes_Change",
    "Total_Source_Bytes_Change",
    "Avg_Duration_Change",
]

TARGET_COL = "Target_Early_Warning"
SEQUENCE_LENGTH = 5
NUM_FEATURES = len(FEATURES)
SEED = 42

np.random.seed(SEED)
tf.random.set_seed(SEED)

# ============================================================
# DATA PREPARATION
# ============================================================

df = pd.read_csv(CSV_PATH)
df["Timestamp"] = pd.to_datetime(df["Timestamp"])
df = df.sort_values(["Scenario", "Timestamp"]).reset_index(drop=True)

# 1. Single-Window Data Preparation
def get_single_window_data(df, scenarios, scaler=None, fit_scaler=False):
    sub_df = df[df["Scenario"].isin(scenarios)].copy()
    if fit_scaler:
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(sub_df[FEATURES].values)
    else:
        X_scaled = scaler.transform(sub_df[FEATURES].values)
    y = sub_df[TARGET_COL].values
    return X_scaled, y, scaler

X_train_sw, y_train_sw, sw_scaler = get_single_window_data(df, TRAIN_SCENARIOS, fit_scaler=True)
X_val_sw, y_val_sw, _ = get_single_window_data(df, VAL_SCENARIOS, scaler=sw_scaler, fit_scaler=False)
X_test_sw, y_test_sw, _ = get_single_window_data(df, TEST_SCENARIOS, scaler=sw_scaler, fit_scaler=False)

# 2. Sequence (5-Window) Data Preparation (Flat & 3D)
def build_sequence_data(df, scenarios, scaler=None, fit_scaler=False):
    sub_df = df[df["Scenario"].isin(scenarios)].copy()
    if fit_scaler:
        scaler = StandardScaler()
        scaler.fit(sub_df[FEATURES].values)
        
    X_3d_list = []
    X_flat_list = []
    y_list = []
    
    for sc in scenarios:
        sc_df = sub_df[sub_df["Scenario"] == sc].copy().sort_values("Timestamp").reset_index(drop=True)
        if len(sc_df) <= SEQUENCE_LENGTH:
            continue
            
        feat_vals = scaler.transform(sc_df[FEATURES].values).astype(np.float32)
        target_vals = sc_df[TARGET_COL].values.astype(np.float32)
        
        for i in range(SEQUENCE_LENGTH - 1, len(sc_df) - 1):
            seq = feat_vals[i - SEQUENCE_LENGTH + 1 : i + 1] # shape (5, 12)
            seq_flat = seq.flatten()                        # shape (60,)
            label = target_vals[i + 1]
            
            X_3d_list.append(seq)
            X_flat_list.append(seq_flat)
            y_list.append(label)
            
    return np.array(X_3d_list), np.array(X_flat_list), np.array(y_list), scaler

X_train_3d, X_train_flat, y_train_seq, seq_scaler = build_sequence_data(df, TRAIN_SCENARIOS, fit_scaler=True)
X_val_3d, X_val_flat, y_val_seq, _ = build_sequence_data(df, VAL_SCENARIOS, scaler=seq_scaler, fit_scaler=False)
X_test_3d, X_test_flat, y_test_seq, _ = build_sequence_data(df, TEST_SCENARIOS, scaler=seq_scaler, fit_scaler=False)

# ============================================================
# MODEL 1: SINGLE-WINDOW LOGISTIC REGRESSION
# ============================================================
print("=" * 80)
print("PRIORITY 2: HONEST BASELINE COMPARISON")
print("=" * 80)

print("\n--- Training Model 1: Single-Window Logistic Regression ---")
lr_sw = LogisticRegression(class_weight="balanced", max_iter=1000, random_state=SEED)
lr_sw.fit(X_train_sw, y_train_sw)

val_probs_sw = lr_sw.predict_proba(X_val_sw)[:, 1]
best_th_sw = 0.50
best_f1_sw = -1
for th in np.arange(0.01, 0.90, 0.01):
    f1_th = f1_score(y_val_sw, (val_probs_sw >= th).astype(int), zero_division=0)
    if f1_th > best_f1_sw:
        best_f1_sw = f1_th
        best_th_sw = th

test_probs_sw = lr_sw.predict_proba(X_test_sw)[:, 1]
test_pred_sw = (test_probs_sw >= best_th_sw).astype(int)

acc_sw = accuracy_score(y_test_sw, test_pred_sw)
prec_sw = precision_score(y_test_sw, test_pred_sw, zero_division=0)
rec_sw = recall_score(y_test_sw, test_pred_sw, zero_division=0)
f1_sw = f1_score(y_test_sw, test_pred_sw, zero_division=0)
roc_sw = roc_auc_score(y_test_sw, test_probs_sw)
tn_sw, fp_sw, fn_sw, tp_sw = confusion_matrix(y_test_sw, test_pred_sw, labels=[0, 1]).ravel()
fpr_sw = fp_sw / max(tn_sw + fp_sw, 1)

# ============================================================
# MODEL 2: 5-WINDOW SEQUENCE-FLATTENED LOGISTIC REGRESSION
# ============================================================
print("\n--- Training Model 2: 5-Window Sequence-Flattened Logistic Regression ---")
lr_seq = LogisticRegression(class_weight="balanced", max_iter=1000, random_state=SEED)
lr_seq.fit(X_train_flat, y_train_seq)

val_probs_flat = lr_seq.predict_proba(X_val_flat)[:, 1]
best_th_flat = 0.50
best_f1_flat = -1
for th in np.arange(0.01, 0.90, 0.01):
    f1_th = f1_score(y_val_seq, (val_probs_flat >= th).astype(int), zero_division=0)
    if f1_th > best_f1_flat:
        best_f1_flat = f1_th
        best_th_flat = th

test_probs_flat = lr_seq.predict_proba(X_test_flat)[:, 1]
test_pred_flat = (test_probs_flat >= best_th_flat).astype(int)

acc_flat = accuracy_score(y_test_seq, test_pred_flat)
prec_flat = precision_score(y_test_seq, test_pred_flat, zero_division=0)
rec_flat = recall_score(y_test_seq, test_pred_flat, zero_division=0)
f1_flat = f1_score(y_test_seq, test_pred_flat, zero_division=0)
roc_flat = roc_auc_score(y_test_seq, test_probs_flat)
tn_flat, fp_flat, fn_flat, tp_flat = confusion_matrix(y_test_seq, test_pred_flat, labels=[0, 1]).ravel()
fpr_flat = fp_flat / max(tn_flat + fp_flat, 1)

# ============================================================
# MODEL 3: 5-WINDOW LSTM
# ============================================================
print("\n--- Training Model 3: 5-Window LSTM ---")
lstm_model = Sequential([
    Input(shape=(SEQUENCE_LENGTH, NUM_FEATURES)),
    LSTM(64, return_sequences=True),
    Dropout(0.2),
    LSTM(32, return_sequences=False),
    Dropout(0.2),
    Dense(16, activation="relu"),
    Dense(1, activation="sigmoid")
], name="Standard_LSTM")

lstm_model.compile(
    optimizer=Adam(learning_rate=0.001),
    loss="binary_crossentropy",
    metrics=["accuracy"]
)

callbacks = [EarlyStopping(monitor="val_loss", patience=12, restore_best_weights=True)]

lstm_model.fit(
    X_train_3d, y_train_seq,
    validation_data=(X_val_3d, y_val_seq),
    epochs=60,
    batch_size=32,
    callbacks=callbacks,
    verbose=0
)

val_probs_lstm = lstm_model.predict(X_val_3d, verbose=0).ravel()
best_th_lstm = 0.50
best_f1_lstm = -1
for th in np.arange(0.01, 0.90, 0.01):
    f1_th = f1_score(y_val_seq, (val_probs_lstm >= th).astype(int), zero_division=0)
    if f1_th > best_f1_lstm:
        best_f1_lstm = f1_th
        best_th_lstm = th

test_probs_lstm = lstm_model.predict(X_test_3d, verbose=0).ravel()
test_pred_lstm = (test_probs_lstm >= best_th_lstm).astype(int)

acc_lstm = accuracy_score(y_test_seq, test_pred_lstm)
prec_lstm = precision_score(y_test_seq, test_pred_lstm, zero_division=0)
rec_lstm = recall_score(y_test_seq, test_pred_lstm, zero_division=0)
f1_lstm = f1_score(y_test_seq, test_pred_lstm, zero_division=0)
roc_lstm = roc_auc_score(y_test_seq, test_probs_lstm)
tn_lstm, fp_lstm, fn_lstm, tp_lstm = confusion_matrix(y_test_seq, test_pred_lstm, labels=[0, 1]).ravel()
fpr_lstm = fp_lstm / max(tn_lstm + fp_lstm, 1)

# ============================================================
# COMPARISON TABLE SUMMARY
# ============================================================

print("\n" + "=" * 95)
print("HONEST BASELINE COMPARISON SUMMARY (EVALUATED ON TEST SCENARIOS 12 & 13)")
print("=" * 95)
print(f"{'Model Configuration':35s} | {'F1':6s} | {'Prec':6s} | {'Rec':6s} | {'ROC-AUC':7s} | {'FPR':6s} | {'Conf Matrix (TN/FP/FN/TP)':25s}")
print("-" * 95)
print(f"{'1. Single-Window Logistic Reg':35s} | {f1_sw:6.4f} | {prec_sw:6.4f} | {rec_sw:6.4f} | {roc_sw:7.4f} | {fpr_sw:6.4f} | {f'{tn_sw}/{fp_sw}/{fn_sw}/{tp_sw}':25s}")
print(f"{'2. 5-Window Sequence-Flat LR':35s} | {f1_flat:6.4f} | {prec_flat:6.4f} | {rec_flat:6.4f} | {roc_flat:7.4f} | {fpr_flat:6.4f} | {f'{tn_flat}/{fp_flat}/{fn_flat}/{tp_flat}':25s}")
print(f"{'3. 5-Window LSTM':35s} | {f1_lstm:6.4f} | {prec_lstm:6.4f} | {rec_lstm:6.4f} | {roc_lstm:7.4f} | {fpr_lstm:6.4f} | {f'{tn_lstm}/{fp_lstm}/{fn_lstm}/{tp_lstm}':25s}")
print("=" * 95)

print("\nRESEARCH FINDINGS & ANALYSIS:")
print("1. Single-Window LR baseline evaluates state-by-state without temporal sequence history.")
print("2. Sequence-Flattened LR captures temporal window history linearly across 60 features.")
print("3. 5-Window LSTM captures non-linear recurrent state dependencies.")
print(f"   -> Result: Single-Window F1: {f1_sw:.4f}, Sequence-Flat F1: {f1_flat:.4f}, LSTM F1: {f1_lstm:.4f}")
print("=" * 95)
