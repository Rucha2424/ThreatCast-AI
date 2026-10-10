import os
import pickle
import numpy as np
import tensorflow as tf

from tensorflow.keras import Sequential, Input
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix
)

# ============================================================
# CONFIGURATION
# ============================================================

X_FILE = r"data\DAPT2020\X_sequences.npy"
Y_FILE = r"data\DAPT2020\y_sequences.npy"
CAPTURE_FILE = r"data\DAPT2020\sequence_captures.npy"
OLD_SCALER_FILE = r"data\DAPT2020\dapt2020_scaler.pkl"

FINAL_MODEL_FILE = "dapt2020_lstm.keras"

SEED = 42

SEQUENCE_LENGTH = 5
NUM_FEATURES = 19
NUM_CLASSES = 5

CLASS_NAMES = [
    "BENIGN",
    "DATA EXFILTRATION",
    "ESTABLISH FOOTHOLD",
    "LATERAL MOVEMENT",
    "RECONNAISSANCE"
]

# ============================================================
# REPRODUCIBILITY
# ============================================================

np.random.seed(SEED)
tf.random.set_seed(SEED)

# ============================================================
# LOAD DATA
# ============================================================

print("=" * 70)
print("DAPT2020 - CAPTURE-AWARE MULTICLASS LSTM")
print("=" * 70)

X_scaled_global = np.load(X_FILE)
y = np.load(Y_FILE)
captures = np.load(CAPTURE_FILE, allow_pickle=True)

print("\nLoaded:")
print("X:", X_scaled_global.shape)
print("y:", y.shape)
print("captures:", captures.shape)

# ============================================================
# VALIDATION
# ============================================================

if len(X_scaled_global) != len(y):
    raise RuntimeError("X and y lengths do not match.")

if len(X_scaled_global) != len(captures):
    raise RuntimeError("X and capture lengths do not match.")

if X_scaled_global.ndim != 3:
    raise RuntimeError("X must have shape (samples, timesteps, features).")

if X_scaled_global.shape[1] != SEQUENCE_LENGTH:
    raise RuntimeError("Unexpected sequence length.")

if X_scaled_global.shape[2] != NUM_FEATURES:
    raise RuntimeError("Unexpected number of features.")

if np.isnan(X_scaled_global).any():
    raise RuntimeError("NaN values found in X.")

if np.isinf(X_scaled_global).any():
    raise RuntimeError("Infinite values found in X.")

# ============================================================
# RECOVER ORIGINAL FEATURE VALUES
#
# The previous sequence script scaled using the complete dataset.
# We reverse that transformation here and refit a scaler inside
# every training fold.
#
# This prevents test-capture statistics from being used for
# training.
# ============================================================

with open(OLD_SCALER_FILE, "rb") as f:
    old_scaler = pickle.load(f)

X_original = old_scaler.inverse_transform(
    X_scaled_global.reshape(-1, NUM_FEATURES)
).reshape(
    X_scaled_global.shape
)

X_original = X_original.astype(np.float32)

print("\nOriginal feature values recovered.")

# ============================================================
# CAPTURE INFORMATION
# ============================================================

unique_captures = np.unique(captures)

print("\nNumber of captures:", len(unique_captures))

print("\nCapture distribution:")

for capture in unique_captures:
    mask = captures == capture

    print(
        f"{capture}: "
        f"{np.sum(mask)} sequences"
    )

# ============================================================
# STAGE DISTRIBUTION
# ============================================================

print("\nOverall target distribution:")

for class_id, class_name in enumerate(CLASS_NAMES):

    count = np.sum(y == class_id)

    print(
        f"{class_id} -> "
        f"{class_name:25s}: {count}"
    )

# ============================================================
# BUILD MODEL
# ============================================================

def build_model():

    model = Sequential([
        Input(
            shape=(
                SEQUENCE_LENGTH,
                NUM_FEATURES
            )
        ),

        LSTM(64),

        Dropout(0.30),

        Dense(
            32,
            activation="relu"
        ),

        Dropout(0.20),

        Dense(
            NUM_CLASSES,
            activation="softmax"
        )
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(
            learning_rate=0.001
        ),

        loss="sparse_categorical_crossentropy",

        metrics=["accuracy"]
    )

    return model


# ============================================================
# CAPTURE-AWARE CROSS-VALIDATION
#
# Every capture is kept completely inside one fold.
#
# This prevents sequences from the same capture appearing in
# both training and testing.
# ============================================================

print("\n" + "=" * 70)
print("CAPTURE-AWARE CROSS-VALIDATION")
print("=" * 70)

all_predictions = []
all_true = []
all_capture_ids = []

fold_results = []

# We use leave-one-capture-out evaluation.
# This is particularly appropriate here because DAPT2020 has
# only 10 capture files.

for fold_number, test_capture in enumerate(
    unique_captures,
    start=1
):

    print("\n" + "-" * 70)
    print(
        f"FOLD {fold_number}/{len(unique_captures)}"
    )
    print(
        "TEST CAPTURE:",
        test_capture
    )
    print("-" * 70)

    # --------------------------------------------------------
    # TEST MASK
    # --------------------------------------------------------

    test_mask = (
        captures == test_capture
    )

    train_mask = ~test_mask

    X_train_raw = X_original[
        train_mask
    ]

    y_train = y[
        train_mask
    ]

    X_test_raw = X_original[
        test_mask
    ]

    y_test = y[
        test_mask
    ]

    # --------------------------------------------------------
    # PRINT CLASS DISTRIBUTIONS
    # --------------------------------------------------------

    print("\nTraining classes:")

    for class_id, class_name in enumerate(CLASS_NAMES):

        count = np.sum(
            y_train == class_id
        )

        print(
            f"{class_name:25s}: {count}"
        )

    print("\nTest classes:")

    for class_id, class_name in enumerate(CLASS_NAMES):

        count = np.sum(
            y_test == class_id
        )

        print(
            f"{class_name:25s}: {count}"
        )

    # --------------------------------------------------------
    # FIT SCALER ONLY ON TRAINING DATA
    # --------------------------------------------------------

    fold_scaler = StandardScaler()

    X_train_2d = X_train_raw.reshape(
        -1,
        NUM_FEATURES
    )

    X_test_2d = X_test_raw.reshape(
        -1,
        NUM_FEATURES
    )

    fold_scaler.fit(
        X_train_2d
    )

    X_train = fold_scaler.transform(
        X_train_2d
    ).reshape(
        X_train_raw.shape
    ).astype(np.float32)

    X_test = fold_scaler.transform(
        X_test_2d
    ).reshape(
        X_test_raw.shape
    ).astype(np.float32)

    # --------------------------------------------------------
    # CLASS WEIGHTS
    #
    # Only classes actually present in training are weighted.
    # The extremely rare Data Exfiltration class may have zero
    # training examples in some folds.
    # --------------------------------------------------------

    present_classes = np.unique(
        y_train
    )

    class_weights_array = compute_class_weight(
        class_weight="balanced",
        classes=present_classes,
        y=y_train
    )

    class_weights = {
        int(class_id): min(
            float(weight),
            20.0
        )
        for class_id, weight
        in zip(
            present_classes,
            class_weights_array
        )
    }

    print("\nClass weights:")

    for class_id in sorted(
        class_weights
    ):

        print(
            f"{CLASS_NAMES[class_id]:25s}: "
            f"{class_weights[class_id]:.4f}"
        )

    # --------------------------------------------------------
    # MODEL
    # --------------------------------------------------------

    tf.keras.backend.clear_session()

    model = build_model()

    # --------------------------------------------------------
    # VALIDATION
    #
    # Take the final 20% of the TRAINING CAPTURES as validation
    # rather than randomly mixing sequences.
    #
    # To keep the held-out test capture completely untouched,
    # validation is selected from the training captures only.
    # --------------------------------------------------------

    train_captures = np.unique(
        captures[train_mask]
    )

    if len(train_captures) >= 3:

        validation_capture = train_captures[-1]

        validation_mask_global = (
            captures == validation_capture
        )

        # Must also be inside training set
        validation_mask_global = (
            validation_mask_global &
            train_mask
        )

        fit_mask = (
            train_mask &
            (~validation_mask_global)
        )

        X_fit_raw = X_original[
            fit_mask
        ]

        y_fit = y[
            fit_mask
        ]

        X_val_raw = X_original[
            validation_mask_global
        ]

        y_val = y[
            validation_mask_global
        ]

        # Fit scaler again using ONLY actual fitting data
        training_scaler = StandardScaler()

        training_scaler.fit(
            X_fit_raw.reshape(
                -1,
                NUM_FEATURES
            )
        )

        X_fit = training_scaler.transform(
            X_fit_raw.reshape(
                -1,
                NUM_FEATURES
            )
        ).reshape(
            X_fit_raw.shape
        ).astype(np.float32)

        X_val = training_scaler.transform(
            X_val_raw.reshape(
                -1,
                NUM_FEATURES
            )
        ).reshape(
            X_val_raw.shape
        ).astype(np.float32)

        # Recalculate weights on actual fit set
        present_fit_classes = np.unique(
            y_fit
        )

        fit_weights_array = compute_class_weight(
            class_weight="balanced",
            classes=present_fit_classes,
            y=y_fit
        )

        fit_class_weights = {
            int(class_id): min(
                float(weight),
                20.0
            )
            for class_id, weight
            in zip(
                present_fit_classes,
                fit_weights_array
            )
        }

    else:

        X_fit = X_train
        y_fit = y_train

        X_val = None
        y_val = None

        training_scaler = fold_scaler

        fit_class_weights = class_weights

    # --------------------------------------------------------
    # TRAIN
    # --------------------------------------------------------

    early_stopping = EarlyStopping(
        monitor="val_loss"
        if X_val is not None
        else "loss",

        patience=8,

        restore_best_weights=True,

        verbose=1
    )

    if X_val is not None:

        history = model.fit(
            X_fit,
            y_fit,

            validation_data=(
                X_val,
                y_val
            ),

            epochs=40,

            batch_size=32,

            class_weight=fit_class_weights,

            callbacks=[
                early_stopping
            ],

            verbose=1
        )

    else:

        history = model.fit(
            X_fit,
            y_fit,

            epochs=40,

            batch_size=32,

            class_weight=fit_class_weights,

            callbacks=[
                early_stopping
            ],

            verbose=1
        )

    # --------------------------------------------------------
    # PREDICT TEST CAPTURE
    # --------------------------------------------------------

    probabilities = model.predict(
        X_test,
        verbose=0
    )

    predictions = np.argmax(
        probabilities,
        axis=1
    )

    # --------------------------------------------------------
    # FOLD METRICS
    # --------------------------------------------------------

    accuracy = accuracy_score(
        y_test,
        predictions
    )

    precision, recall, f1, support = (
        precision_recall_fscore_support(
            y_test,
            predictions,

            labels=list(
                range(NUM_CLASSES)
            ),

            zero_division=0
        )
    )

    print(
        f"\nFold accuracy: "
        f"{accuracy:.4f}"
    )

    print("\nFold classification report:")

    print(
        classification_report(
            y_test,
            predictions,

            labels=list(
                range(NUM_CLASSES)
            ),

            target_names=CLASS_NAMES,

            zero_division=0
        )
    )

    print("Fold confusion matrix:")

    print(
        confusion_matrix(
            y_test,
            predictions,

            labels=list(
                range(NUM_CLASSES)
            )
        )
    )

    # --------------------------------------------------------
    # SAVE PREDICTIONS
    # --------------------------------------------------------

    all_true.extend(
        y_test.tolist()
    )

    all_predictions.extend(
        predictions.tolist()
    )

    all_capture_ids.extend(
        [test_capture] *
        len(y_test)
    )

    fold_results.append({
        "capture": test_capture,
        "accuracy": accuracy,
        "macro_f1": np.mean(f1),
        "weighted_f1": (
            np.average(
                f1,
                weights=support
            )
            if np.sum(support) > 0
            else 0.0
        )
    })


# ============================================================
# OVERALL CROSS-CAPTURE RESULTS
# ============================================================

all_true = np.asarray(
    all_true
)

all_predictions = np.asarray(
    all_predictions
)

print("\n" + "=" * 70)
print("FINAL CAPTURE-AWARE RESULTS")
print("=" * 70)

overall_accuracy = accuracy_score(
    all_true,
    all_predictions
)

precision, recall, f1, support = (
    precision_recall_fscore_support(
        all_true,
        all_predictions,

        labels=list(
            range(NUM_CLASSES)
        ),

        zero_division=0
    )
)

print(
    f"\nOverall accuracy: "
    f"{overall_accuracy:.4f}"
)

print(
    f"Macro precision: "
    f"{np.mean(precision):.4f}"
)

print(
    f"Macro recall: "
    f"{np.mean(recall):.4f}"
)

print(
    f"Macro F1: "
    f"{np.mean(f1):.4f}"
)

print("\nOverall classification report:")

print(
    classification_report(
        all_true,
        all_predictions,

        labels=list(
            range(NUM_CLASSES)
        ),

        target_names=CLASS_NAMES,

        zero_division=0
    )
)

print("\nOverall confusion matrix:")

print(
    confusion_matrix(
        all_true,
        all_predictions,

        labels=list(
            range(NUM_CLASSES)
        )
    )
)

# ============================================================
# PER-CAPTURE SUMMARY
# ============================================================

print("\n" + "=" * 70)
print("PER-CAPTURE SUMMARY")
print("=" * 70)

for result in fold_results:

    print(
        f"\n{result['capture']}"
    )

    print(
        f"  Accuracy:    "
        f"{result['accuracy']:.4f}"
    )

    print(
        f"  Macro F1:    "
        f"{result['macro_f1']:.4f}"
    )

    print(
        f"  Weighted F1: "
        f"{result['weighted_f1']:.4f}"
    )

# ============================================================
# TRAIN FINAL DEPLOYMENT MODEL
#
# After unbiased cross-capture evaluation, train one final
# model on ALL available data for later application integration.
#
# This model is NOT used for reporting test performance.
# ============================================================

print("\n" + "=" * 70)
print("TRAINING FINAL DEPLOYMENT MODEL")
print("=" * 70)

final_scaler = StandardScaler()

final_scaler.fit(
    X_original.reshape(
        -1,
        NUM_FEATURES
    )
)

X_final = final_scaler.transform(
    X_original.reshape(
        -1,
        NUM_FEATURES
    )
).reshape(
    X_original.shape
).astype(np.float32)

present_classes = np.unique(
    y
)

final_weights_array = compute_class_weight(
    class_weight="balanced",
    classes=present_classes,
    y=y
)

final_class_weights = {
    int(class_id): min(
        float(weight),
        20.0
    )
    for class_id, weight
    in zip(
        present_classes,
        final_weights_array
    )
}

print("\nFinal model class weights:")

for class_id in sorted(
    final_class_weights
):

    print(
        f"{CLASS_NAMES[class_id]:25s}: "
        f"{final_class_weights[class_id]:.4f}"
    )

tf.keras.backend.clear_session()

final_model = build_model()

final_model.fit(
    X_final,
    y,

    epochs=30,

    batch_size=32,

    class_weight=final_class_weights,

    verbose=1
)

final_model.save(
    FINAL_MODEL_FILE
)

# Save deployment scaler
FINAL_SCALER_FILE = (
    "dapt2020_lstm_scaler.pkl"
)

with open(
    FINAL_SCALER_FILE,
    "wb"
) as f:

    pickle.dump(
        final_scaler,
        f
    )

# ============================================================
# FINAL
# ============================================================

print("\n" + "=" * 70)
print("DAPT2020 LSTM COMPLETE")
print("=" * 70)

print(
    "\nEvaluation model:"
    " capture-aware cross-validation"
)

print(
    "Deployment model:",
    FINAL_MODEL_FILE
)

print(
    "Deployment scaler:",
    FINAL_SCALER_FILE
)

print(
    "\nIMPORTANT:"
)

print(
    "Data Exfiltration has only one network-state sample."
)

print(
    "Its performance cannot support a meaningful "
    "learned-class claim."
)

print(
    "\nDo NOT use overall accuracy alone."
)

print(
    "Use macro F1, per-stage recall/F1, "
    "and the confusion matrix."
)

print("\n" + "=" * 70)