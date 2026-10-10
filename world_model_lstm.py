import os
import sys
import numpy as np
import pandas as pd
import tensorflow as tf

from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping

from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_auc_score
)

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
# DATA LOADING AND SEQUENCE CREATION
# ============================================================

def load_data(csv_path):
    df = pd.read_csv(csv_path)
    df["Timestamp"] = pd.to_datetime(df["Timestamp"])
    df = df.sort_values(["Scenario", "Timestamp"]).reset_index(drop=True)
    return df

def build_sequences_by_scenario(df, scenarios, scaler=None, fit_scaler=False):
    sub_df = df[df["Scenario"].isin(scenarios)].copy()
    
    if fit_scaler:
        scaler = StandardScaler()
        scaler.fit(sub_df[FEATURES].values)
        
    X_seq_list = []
    y_state_list = []
    y_infil_list = []
    
    for sc in scenarios:
        sc_df = sub_df[sub_df["Scenario"] == sc].copy().sort_values("Timestamp").reset_index(drop=True)
        if len(sc_df) <= SEQUENCE_LENGTH:
            continue
            
        feat_vals = scaler.transform(sc_df[FEATURES].values).astype(np.float32)
        target_vals = sc_df[TARGET_COL].values.astype(np.float32)
        
        # Build sequence: input sequence is t-4..t (length 5)
        # target state is t+1 (feature vector)
        # target infil is t+1 (early warning label)
        for i in range(SEQUENCE_LENGTH - 1, len(sc_df) - 1):
            seq = feat_vals[i - SEQUENCE_LENGTH + 1 : i + 1] # shape (5, 12)
            next_state = feat_vals[i + 1]                    # shape (12,)
            next_infil = target_vals[i + 1]                   # scalar
            
            X_seq_list.append(seq)
            y_state_list.append(next_state)
            y_infil_list.append(next_infil)
            
    X_seq = np.array(X_seq_list, dtype=np.float32)
    y_state = np.array(y_state_list, dtype=np.float32)
    y_infil = np.array(y_infil_list, dtype=np.float32)
    
    return X_seq, y_state, y_infil, scaler

# ============================================================
# WORLD MODEL DUAL-HEAD ARCHITECTURE
# ============================================================

def build_world_model(sequence_length, num_features):
    inputs = Input(shape=(sequence_length, num_features), name="seq_input")
    
    x = LSTM(64, return_sequences=True, name="lstm_1")(inputs)
    x = Dropout(0.2, name="dropout_1")(x)
    x = LSTM(32, return_sequences=False, name="lstm_2")(x)
    x = Dropout(0.2, name="dropout_2")(x)
    
    # Head 1: State Regression Head (predicts x_{t+1})
    state_dense = Dense(32, activation="relu", name="state_dense")(x)
    state_pred = Dense(num_features, activation="linear", name="state_head")(state_dense)
    
    # Head 2: Infiltration Classification Head (predicts target label)
    infil_dense = Dense(16, activation="relu", name="infil_dense")(x)
    infil_pred = Dense(1, activation="sigmoid", name="infil_head")(infil_dense)
    
    model = Model(inputs=inputs, outputs=[state_pred, infil_pred], name="World_Model_LSTM")
    
    return model

# ============================================================
# K-STEP AUTOREGRESSIVE ROLLOUT
# ============================================================

def k_step_rollout(model, x_seq, k=3):
    """
    Given a batch or single sequence x_seq of shape (N, 5, num_features):
    Autoregressively rolls out k steps forward.
    Returns:
      prob_timeline: list of k arrays of shape (N,) containing infiltration probabilities
      state_trajectory: list of k arrays of shape (N, num_features) containing predicted states
    """
    curr_seq = np.copy(x_seq)
    prob_timeline = []
    state_trajectory = []
    
    for s in range(k):
        state_pred, infil_pred = model.predict(curr_seq, verbose=0)
        
        prob_timeline.append(infil_pred.ravel())
        state_trajectory.append(state_pred)
        
        # Slide window forward: append predicted state_pred as newest timestep
        # curr_seq shape: (N, 5, num_features) -> slide [:, 1:, :] and concat state_pred[:, np.newaxis, :]
        new_step = np.expand_dims(state_pred, axis=1) # (N, 1, num_features)
        curr_seq = np.concatenate([curr_seq[:, 1:, :], new_step], axis=1)
        
    return prob_timeline, state_trajectory

# ============================================================
# MAIN TRAINING AND EVALUATION WORKFLOW
# ============================================================

def main():
    print("=" * 80)
    print("PRIORITY 1: WORLD MODEL DUAL-HEAD LSTM (STATE REGRESSION + CLASSIFICATION)")
    print("=" * 80)
    
    df = load_data(CSV_PATH)
    
    X_train, y_state_train, y_infil_train, scaler = build_sequences_by_scenario(
        df, TRAIN_SCENARIOS, fit_scaler=True
    )
    X_val, y_state_val, y_infil_val, _ = build_sequences_by_scenario(
        df, VAL_SCENARIOS, scaler=scaler, fit_scaler=False
    )
    X_test, y_state_test, y_infil_test, _ = build_sequences_by_scenario(
        df, TEST_SCENARIOS, scaler=scaler, fit_scaler=False
    )
    
    print(f"\nDataset Statistics:")
    print(f"Train sequences: {X_train.shape[0]} (Positive labels: {int(y_infil_train.sum())})")
    print(f"Val sequences  : {X_val.shape[0]} (Positive labels: {int(y_infil_val.sum())})")
    print(f"Test sequences : {X_test.shape[0]} (Positive labels: {int(y_infil_test.sum())})")
    
    model = build_world_model(SEQUENCE_LENGTH, NUM_FEATURES)
    
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss={
            "state_head": "mse",
            "infil_head": "binary_crossentropy"
        },
        loss_weights={
            "state_head": 1.0,
            "infil_head": 1.0
        },
        metrics={
            "state_head": ["mae", "mse"],
            "infil_head": ["accuracy"]
        }
    )
    
    model.summary()
    
    callbacks = [
        EarlyStopping(monitor="val_loss", patience=12, restore_best_weights=True)
    ]
    
    print("\n--- Training World Model ---")
    history = model.fit(
        X_train,
        {"state_head": y_state_train, "infil_head": y_infil_train},
        validation_data=(
            X_val,
            {"state_head": y_state_val, "infil_head": y_infil_val}
        ),
        epochs=60,
        batch_size=32,
        callbacks=callbacks,
        verbose=1
    )
    
    # Save trained model and scaler
    model.save("world_model_lstm.keras")
    import pickle
    with open("world_model_scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)
    print("\nSaved world_model_lstm.keras and world_model_scaler.pkl.")
    
    print("\n" + "=" * 80)
    print("TEST EVALUATION - SEPARATE LOSSES & METRICS")
    print("=" * 80)
    
    test_eval = model.evaluate(
        X_test,
        {"state_head": y_state_test, "infil_head": y_infil_test},
        verbose=0
    )
    
    loss_names = model.metrics_names
    for name, val in zip(loss_names, test_eval):
        print(f"Test {name:25s}: {val:.4f}")
        
    state_preds, infil_preds = model.predict(X_test, verbose=0)
    infil_preds_flat = infil_preds.ravel()
    
    # State Prediction Errors per Feature (MAE and RMSE in standardized feature space)
    state_diff = y_state_test - state_preds # shape (N, 12)
    mae_per_feature = np.mean(np.abs(state_diff), axis=0)
    rmse_per_feature = np.sqrt(np.mean(state_diff ** 2, axis=0))
    
    print("\n" + "-" * 70)
    print("STATE REGRESSION HEAD EVALUATION (Per Feature Normalized Errors)")
    print("-" * 70)
    print(f"{'Feature Name':30s} | {'MAE':8s} | {'RMSE':8s}")
    print("-" * 70)
    for feat_name, mae_val, rmse_val in zip(FEATURES, mae_per_feature, rmse_per_feature):
        print(f"{feat_name:30s} | {mae_val:8.4f} | {rmse_val:8.4f}")
    print("-" * 70)
    print(f"{'MEAN OVER ALL FEATURES':30s} | {np.mean(mae_per_feature):8.4f} | {np.mean(rmse_per_feature):8.4f}")
    
    # Infiltration Classification Metrics
    # Compute threshold using validation set
    val_state_preds, val_infil_preds = model.predict(X_val, verbose=0)
    val_probs = val_infil_preds.ravel()
    
    best_thresh = 0.50
    best_val_f1 = -1
    for th in np.arange(0.01, 0.90, 0.01):
        th_f1 = f1_score(y_infil_val, (val_probs >= th).astype(int), zero_division=0)
        if th_f1 > best_val_f1:
            best_val_f1 = th_f1
            best_thresh = th
            
    test_binary = (infil_preds_flat >= best_thresh).astype(int)
    
    acc = accuracy_score(y_infil_test, test_binary)
    prec = precision_score(y_infil_test, test_binary, zero_division=0)
    rec = recall_score(y_infil_test, test_binary, zero_division=0)
    f1 = f1_score(y_infil_test, test_binary, zero_division=0)
    roc = roc_auc_score(y_infil_test, infil_preds_flat)
    
    tn, fp, fn, tp = confusion_matrix(y_infil_test, test_binary, labels=[0, 1]).ravel()
    fpr = fp / max(tn + fp, 1)
    
    print("\n" + "-" * 70)
    print("INFILTRATION CLASSIFICATION HEAD EVALUATION")
    print("-" * 70)
    print(f"Optimal Threshold (via Val): {best_thresh:.2f}")
    print(f"Accuracy : {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall   : {rec:.4f}")
    print(f"F1 Score : {f1:.4f}")
    print(f"FPR      : {fpr:.4f}")
    print(f"ROC-AUC  : {roc:.4f}")
    print(f"Confusion Matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")
    
    # Demonstrate k-step Autoregressive Rollout (k=3)
    print("\n" + "=" * 80)
    print("AUTOREGRESSIVE ROLLOUT DEMONSTRATION (k=3 steps forward)")
    print("=" * 80)
    
    sample_indices = [0, min(10, len(X_test)-1), min(50, len(X_test)-1)]
    sample_seqs = X_test[sample_indices] # shape (3, 5, 12)
    
    prob_timeline, state_traj = k_step_rollout(model, sample_seqs, k=3)
    
    for idx, sample_i in enumerate(sample_indices):
        print(f"\n--- Sample Index {sample_i} (True label at t+1: {int(y_infil_test[sample_i])}) ---")
        for step in range(3):
            prob = prob_timeline[step][idx]
            pred_state_norm = state_traj[step][idx]
            # Inverse transform to original feature scale
            pred_state_orig = scaler.inverse_transform(pred_state_norm.reshape(1, -1))[0]
            
            print(f"  Step t+{step+1}:")
            print(f"    Infiltration Probability: {prob:.4f}")
            print(f"    Predicted Flow_Count    : {pred_state_orig[0]:.1f}")
            print(f"    Predicted Total_Packets : {pred_state_orig[1]:.1f}")
            print(f"    Predicted Total_Bytes   : {pred_state_orig[2]:.1f}")
            print(f"    Predicted Avg_Duration  : {pred_state_orig[4]:.2f} sec")
            
    print("\n" + "=" * 80)
    print("WORLD MODEL EXECUTION COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    main()
