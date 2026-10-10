import numpy as np
import pickle

from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support
)
from sklearn.utils.class_weight import compute_class_weight


# ============================================================
# CONFIGURATION
# ============================================================

X_FILE = r"data\DAPT2020\X_sequences.npy"
Y_FILE = r"data\DAPT2020\y_sequences.npy"
CAPTURE_FILE = r"data\DAPT2020\sequence_captures.npy"
OLD_SCALER_FILE = r"data\DAPT2020\dapt2020_scaler.pkl"

MODEL_FILE = "dapt2020_logistic.pkl"
SCALER_FILE = "dapt2020_logistic_scaler.pkl"

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
# LOAD DATA
# ============================================================

print("=" * 70)
print("DAPT2020 - CAPTURE-AWARE LOGISTIC REGRESSION")
print("=" * 70)

X_scaled = np.load(X_FILE)
y = np.load(Y_FILE)
captures = np.load(
    CAPTURE_FILE,
    allow_pickle=True
)

print("\nLoaded:")
print("X:", X_scaled.shape)
print("y:", y.shape)
print("captures:", captures.shape)


# ============================================================
# BASIC VALIDATION
# ============================================================

if X_scaled.ndim != 3:
    raise ValueError(
        f"Expected X to have 3 dimensions, got {X_scaled.ndim}"
    )

if X_scaled.shape[1] != SEQUENCE_LENGTH:
    raise ValueError(
        f"Expected sequence length {SEQUENCE_LENGTH}, "
        f"got {X_scaled.shape[1]}"
    )

if X_scaled.shape[2] != NUM_FEATURES:
    raise ValueError(
        f"Expected {NUM_FEATURES} features, "
        f"got {X_scaled.shape[2]}"
    )

if len(y) != len(X_scaled):
    raise ValueError(
        "X and y have different numbers of samples."
    )

if len(captures) != len(X_scaled):
    raise ValueError(
        "X and capture IDs have different numbers of samples."
    )


# ============================================================
# CHECK LABELS
# ============================================================

unique_labels = np.unique(y)

print("\nLabels present:")

for label in unique_labels:
    if 0 <= int(label) < NUM_CLASSES:
        print(
            f"{int(label)} -> {CLASS_NAMES[int(label)]}"
        )
    else:
        raise ValueError(
            f"Unexpected label value: {label}"
        )


# ============================================================
# LOAD ORIGINAL SCALER
#
# The sequence file was originally scaled during sequence
# generation.
#
# We reverse that scaling first so that every CV fold can
# fit a completely new scaler using TRAINING DATA ONLY.
#
# This prevents evaluation leakage.
# ============================================================

with open(OLD_SCALER_FILE, "rb") as f:
    old_scaler = pickle.load(f)

X_original = old_scaler.inverse_transform(
    X_scaled.reshape(-1, NUM_FEATURES)
).reshape(
    X_scaled.shape
)

X_original = X_original.astype(np.float64)

print("\nOriginal feature values recovered.")


# ============================================================
# CHECK NUMERICAL VALUES
# ============================================================

if np.isnan(X_original).any():
    raise ValueError(
        "NaN values found in recovered features."
    )

if np.isinf(X_original).any():
    raise ValueError(
        "Infinite values found in recovered features."
    )


# ============================================================
# FLATTEN SEQUENCES
#
# Logistic Regression expects a 2D matrix:
#
#       samples × features
#
# Each sequence contains:
#
#       5 timesteps × 19 features
#
# Therefore:
#
#       5 × 19 = 95 features
#
# The temporal information is represented by keeping the
# five timesteps in their original order.
# ============================================================

X_flat = X_original.reshape(
    X_original.shape[0],
    SEQUENCE_LENGTH * NUM_FEATURES
)

print(
    "Flattened feature matrix:",
    X_flat.shape
)


# ============================================================
# CAPTURE-AWARE LEAVE-ONE-CAPTURE-OUT CV
#
# Each complete capture is held out as the test set.
#
# This is important because random splitting could place
# nearly identical states from the same capture into both
# train and test sets.
# ============================================================

unique_captures = np.unique(captures)

print(
    "\nNumber of captures:",
    len(unique_captures)
)

all_true = []
all_pred = []
all_capture_ids = []

fold_results = []


# ============================================================
# CROSS-VALIDATION LOOP
# ============================================================

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
    # SPLIT BY CAPTURE
    # --------------------------------------------------------

    test_mask = (
        captures == test_capture
    )

    train_mask = ~test_mask

    X_train_raw = X_flat[
        train_mask
    ]

    y_train = y[
        train_mask
    ]

    X_test_raw = X_flat[
        test_mask
    ]

    y_test = y[
        test_mask
    ]


    print(
        "\nTraining samples:",
        len(y_train)
    )

    print(
        "Test samples:",
        len(y_test)
    )


    # --------------------------------------------------------
    # SHOW TRAINING CLASS DISTRIBUTION
    # --------------------------------------------------------

    print("\nTraining class distribution:")

    train_counts = np.bincount(
        y_train,
        minlength=NUM_CLASSES
    )

    for class_id in range(NUM_CLASSES):
        print(
            f"{CLASS_NAMES[class_id]:25s}: "
            f"{train_counts[class_id]}"
        )


    # --------------------------------------------------------
    # SHOW TEST CLASS DISTRIBUTION
    # --------------------------------------------------------

    print("\nTest class distribution:")

    test_counts = np.bincount(
        y_test,
        minlength=NUM_CLASSES
    )

    for class_id in range(NUM_CLASSES):
        print(
            f"{CLASS_NAMES[class_id]:25s}: "
            f"{test_counts[class_id]}"
        )


    # --------------------------------------------------------
    # SCALE TRAINING DATA ONLY
    #
    # IMPORTANT:
    # The test capture never influences the scaler.
    # --------------------------------------------------------

    scaler = StandardScaler()

    X_train = scaler.fit_transform(
        X_train_raw
    )

    X_test = scaler.transform(
        X_test_raw
    )


    # --------------------------------------------------------
    # CALCULATE BALANCED CLASS WEIGHTS
    #
    # Very rare attack classes receive larger weights.
    #
    # Maximum weight is capped at 20 to avoid extreme
    # instability from extremely rare classes.
    # --------------------------------------------------------

    present_classes = np.unique(
        y_train
    )

    weights = compute_class_weight(
        class_weight="balanced",
        classes=present_classes,
        y=y_train
    )

    class_weights = {
        int(cls): min(
            float(weight),
            20.0
        )
        for cls, weight in zip(
            present_classes,
            weights
        )
    }

    print("\nClass weights:")

    for class_id in sorted(class_weights):
        print(
            f"{CLASS_NAMES[class_id]:25s}: "
            f"{class_weights[class_id]:.4f}"
        )


    # --------------------------------------------------------
    # LOGISTIC REGRESSION
    #
    # IMPORTANT:
    # Do NOT use multi_class=...
    #
    # Your installed sklearn version does not support that
    # constructor argument.
    # --------------------------------------------------------

    model = LogisticRegression(
        max_iter=2000,
        class_weight=class_weights,
        solver="lbfgs",
        random_state=42
    )


    # --------------------------------------------------------
    # TRAIN
    # --------------------------------------------------------

    model.fit(
        X_train,
        y_train
    )


    # --------------------------------------------------------
    # PREDICT
    # --------------------------------------------------------

    y_pred = model.predict(
        X_test
    )


    # --------------------------------------------------------
    # METRICS
    # --------------------------------------------------------

    accuracy = accuracy_score(
        y_test,
        y_pred
    )

    precision, recall, f1, support = (
        precision_recall_fscore_support(
            y_test,
            y_pred,
            labels=list(
                range(NUM_CLASSES)
            ),
            zero_division=0
        )
    )

    macro_precision = np.mean(
        precision
    )

    macro_recall = np.mean(
        recall
    )

    macro_f1 = np.mean(
        f1
    )


    # --------------------------------------------------------
    # PRINT FOLD RESULTS
    # --------------------------------------------------------

    print(
        f"\nFold accuracy: {accuracy:.4f}"
    )

    print(
        f"Fold macro precision: "
        f"{macro_precision:.4f}"
    )

    print(
        f"Fold macro recall: "
        f"{macro_recall:.4f}"
    )

    print(
        f"Fold macro F1: "
        f"{macro_f1:.4f}"
    )


    print("\nClassification report:")

    print(
        classification_report(
            y_test,
            y_pred,
            labels=list(
                range(NUM_CLASSES)
            ),
            target_names=CLASS_NAMES,
            zero_division=0
        )
    )


    print("Confusion matrix:")

    print(
        confusion_matrix(
            y_test,
            y_pred,
            labels=list(
                range(NUM_CLASSES)
            )
        )
    )


    # --------------------------------------------------------
    # STORE PREDICTIONS
    # --------------------------------------------------------

    all_true.extend(
        y_test.tolist()
    )

    all_pred.extend(
        y_pred.tolist()
    )

    all_capture_ids.extend(
        [str(test_capture)] *
        len(y_test)
    )


    fold_results.append({
        "capture": str(test_capture),
        "accuracy": accuracy,
        "macro_precision": macro_precision,
        "macro_recall": macro_recall,
        "macro_f1": macro_f1
    })


# ============================================================
# CONVERT RESULTS TO ARRAYS
# ============================================================

all_true = np.asarray(
    all_true,
    dtype=int
)

all_pred = np.asarray(
    all_pred,
    dtype=int
)


# ============================================================
# FINAL CROSS-VALIDATED RESULTS
# ============================================================

print("\n" + "=" * 70)
print("FINAL LOGISTIC REGRESSION RESULTS")
print("=" * 70)


overall_accuracy = accuracy_score(
    all_true,
    all_pred
)

precision, recall, f1, support = (
    precision_recall_fscore_support(
        all_true,
        all_pred,
        labels=list(
            range(NUM_CLASSES)
        ),
        zero_division=0
    )
)

macro_precision = np.mean(
    precision
)

macro_recall = np.mean(
    recall
)

macro_f1 = np.mean(
    f1
)


print(
    f"\nOverall accuracy: "
    f"{overall_accuracy:.4f}"
)

print(
    f"Macro precision: "
    f"{macro_precision:.4f}"
)

print(
    f"Macro recall: "
    f"{macro_recall:.4f}"
)

print(
    f"Macro F1: "
    f"{macro_f1:.4f}"
)


# ============================================================
# OVERALL CLASSIFICATION REPORT
# ============================================================

print("\nOverall classification report:")

print(
    classification_report(
        all_true,
        all_pred,
        labels=list(
            range(NUM_CLASSES)
        ),
        target_names=CLASS_NAMES,
        zero_division=0
    )
)


# ============================================================
# OVERALL CONFUSION MATRIX
# ============================================================

overall_cm = confusion_matrix(
    all_true,
    all_pred,
    labels=list(
        range(NUM_CLASSES)
    )
)

print("\nOverall confusion matrix:")

print(
    overall_cm
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
        f"  Accuracy: "
        f"{result['accuracy']:.4f}"
    )

    print(
        f"  Macro precision: "
        f"{result['macro_precision']:.4f}"
    )

    print(
        f"  Macro recall: "
        f"{result['macro_recall']:.4f}"
    )

    print(
        f"  Macro F1: "
        f"{result['macro_f1']:.4f}"
    )


# ============================================================
# TRAIN FINAL DEPLOYMENT MODEL
#
# After evaluation is finished, train one final model using
# ALL available DAPT2020 sequences.
#
# This model is NOT used to calculate the CV results above.
# ============================================================

print("\n" + "=" * 70)
print("TRAINING FINAL LOGISTIC DEPLOYMENT MODEL")
print("=" * 70)


# ------------------------------------------------------------
# FINAL SCALER
# ------------------------------------------------------------

final_scaler = StandardScaler()

X_final = final_scaler.fit_transform(
    X_flat
)


# ------------------------------------------------------------
# FINAL CLASS WEIGHTS
# ------------------------------------------------------------

present_classes = np.unique(
    y
)

final_weights = compute_class_weight(
    class_weight="balanced",
    classes=present_classes,
    y=y
)

final_class_weights = {
    int(cls): min(
        float(weight),
        20.0
    )
    for cls, weight in zip(
        present_classes,
        final_weights
    )
}


print("\nFinal model class weights:")

for class_id in sorted(final_class_weights):

    print(
        f"{CLASS_NAMES[class_id]:25s}: "
        f"{final_class_weights[class_id]:.4f}"
    )


# ------------------------------------------------------------
# FINAL MODEL
# ------------------------------------------------------------

final_model = LogisticRegression(
    max_iter=2000,
    class_weight=final_class_weights,
    solver="lbfgs",
    random_state=42
)


# ------------------------------------------------------------
# TRAIN
# ------------------------------------------------------------

final_model.fit(
    X_final,
    y
)


# ============================================================
# SAVE FINAL MODEL
# ============================================================

with open(
    MODEL_FILE,
    "wb"
) as f:

    pickle.dump(
        final_model,
        f
    )


with open(
    SCALER_FILE,
    "wb"
) as f:

    pickle.dump(
        final_scaler,
        f
    )


# ============================================================
# VERIFY SAVED MODEL
# ============================================================

print("\nSaved:")

print(
    f"Model : {MODEL_FILE}"
)

print(
    f"Scaler: {SCALER_FILE}"
)


# ============================================================
# FINAL INFORMATION
# ============================================================

print("\n" + "=" * 70)
print("DAPT2020 LOGISTIC REGRESSION COMPLETE")
print("=" * 70)

print(
    "\nEvaluation:"
)

print(
    "Capture-aware leave-one-capture-out "
    "cross-validation"
)

print(
    "\nInput representation:"
)

print(
    "5 network states × 19 features = 95 "
    "Logistic Regression features"
)

print(
    "\nImportant:"
)

print(
    "Data Exfiltration has only one "
    "network-state sequence."
)

print(
    "Its class-specific performance cannot "
    "support a meaningful learned-class claim."
)

print(
    "\nDo NOT use overall accuracy alone."
)

print(
    "Use macro F1, per-stage recall/F1, "
    "and the confusion matrix."
)