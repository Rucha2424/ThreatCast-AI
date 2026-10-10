import random
import numpy as np
import pandas as pd
import torch
import torch.nn as nn

from torch.utils.data import TensorDataset, DataLoader
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix
)


# ============================================================
# 1. CONFIG
# ============================================================

FILE = r"E:\Projects\SIH\data\CTU13\scenario5\network_states.csv"

SEQUENCE_LENGTH = 5
BATCH_SIZE = 32

HIDDEN_SIZE = 64
NUM_LAYERS = 2

LEARNING_RATE = 0.001
EPOCHS = 50
PATIENCE = 8

THRESHOLD = 0.50

SEED = 42


# ============================================================
# 2. REPRODUCIBILITY
# ============================================================

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)


# ============================================================
# 3. LOAD DATA
# ============================================================

df = pd.read_csv(FILE)

df["TimeWindow"] = pd.to_datetime(
    df["TimeWindow"]
)

df = (
    df
    .sort_values("TimeWindow")
    .reset_index(drop=True)
)


# ============================================================
# 4. CREATE FORECAST TARGET
# ============================================================
#
# Current state -> predict whether the NEXT 30-second
# state contains attack traffic.
#
# Attack_Flow_Count is used ONLY to create the target.
# It is NOT an input feature.
# ============================================================

df["Target_Next_Attack"] = (
    df["Attack_Flow_Count"]
    .shift(-1)
    .gt(0)
    .astype(int)
)

# Last row has no future target
df = df.iloc[:-1].copy()


# ============================================================
# 5. FEATURES
# ============================================================
#
# 12 features.
#
# IMPORTANT:
# Attack_Flow_Count and Attack_Ratio are deliberately excluded
# because they directly contain attack information.
# ============================================================

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
    "Avg_Duration_Change"
]

INPUT_SIZE = len(FEATURES)


# ============================================================
# 6. CHRONOLOGICAL SPLIT
# ============================================================

n = len(df)

train_end = int(n * 0.60)
val_end = int(n * 0.80)

train = df.iloc[:train_end].copy()
val = df.iloc[train_end:val_end].copy()
test = df.iloc[val_end:].copy()


print("=" * 60)
print("DATASET")
print("=" * 60)

print("Total states:", len(df))

print("\nNumber of features:", INPUT_SIZE)

print("\nFeatures:")
for feature in FEATURES:
    print(" -", feature)

print("\nSplit sizes:")
print("Train:", len(train))
print("Validation:", len(val))
print("Test:", len(test))

print("\nTime ranges:")

print(
    "Train:",
    train["TimeWindow"].min(),
    "to",
    train["TimeWindow"].max()
)

print(
    "Validation:",
    val["TimeWindow"].min(),
    "to",
    val["TimeWindow"].max()
)

print(
    "Test:",
    test["TimeWindow"].min(),
    "to",
    test["TimeWindow"].max()
)


# ============================================================
# 7. SCALE FEATURES
# ============================================================
#
# Fit ONLY on training data.
# ============================================================

scaler = StandardScaler()

train[FEATURES] = scaler.fit_transform(
    train[FEATURES]
)

val[FEATURES] = scaler.transform(
    val[FEATURES]
)

test[FEATURES] = scaler.transform(
    test[FEATURES]
)

print("\nScaling:")
print("Scaler fitted on training data only.")


# ============================================================
# 8. CREATE SEQUENCES
# ============================================================

def create_sequences(data):

    X = data[FEATURES].values.astype(
        np.float32
    )

    y = data["Target_Next_Attack"].values.astype(
        np.float32
    )

    sequences = []
    targets = []

    for i in range(
        SEQUENCE_LENGTH,
        len(data)
    ):

        sequence = X[
            i - SEQUENCE_LENGTH:i
        ]

        target = y[i]

        sequences.append(sequence)
        targets.append(target)

    return (
        np.asarray(
            sequences,
            dtype=np.float32
        ),
        np.asarray(
            targets,
            dtype=np.float32
        )
    )


X_train, y_train = create_sequences(train)
X_val, y_val = create_sequences(val)
X_test, y_test = create_sequences(test)


# ============================================================
# 9. CHECK SHAPES
# ============================================================

print("\nSequence shapes:")

print("X_train:", X_train.shape)
print("y_train:", y_train.shape)

print("X_val:", X_val.shape)
print("y_val:", y_val.shape)

print("X_test:", X_test.shape)
print("y_test:", y_test.shape)


assert X_train.ndim == 3
assert X_val.ndim == 3
assert X_test.ndim == 3

assert X_train.shape[1] == SEQUENCE_LENGTH
assert X_train.shape[2] == INPUT_SIZE

assert len(X_train) == len(y_train)
assert len(X_val) == len(y_val)
assert len(X_test) == len(y_test)


# ============================================================
# 10. TARGET DISTRIBUTION
# ============================================================

print("\nTarget distributions:")

print("\nTrain:")
print(
    pd.Series(y_train)
    .value_counts()
    .sort_index()
)

print("\nValidation:")
print(
    pd.Series(y_val)
    .value_counts()
    .sort_index()
)

print("\nTest:")
print(
    pd.Series(y_test)
    .value_counts()
    .sort_index()
)


# ============================================================
# 11. PYTORCH TENSORS
# ============================================================

X_train_tensor = torch.tensor(
    X_train,
    dtype=torch.float32
)

y_train_tensor = torch.tensor(
    y_train,
    dtype=torch.float32
)

X_val_tensor = torch.tensor(
    X_val,
    dtype=torch.float32
)

y_val_tensor = torch.tensor(
    y_val,
    dtype=torch.float32
)

X_test_tensor = torch.tensor(
    X_test,
    dtype=torch.float32
)

y_test_tensor = torch.tensor(
    y_test,
    dtype=torch.float32
)


# ============================================================
# 12. DATA LOADER
# ============================================================

train_dataset = TensorDataset(
    X_train_tensor,
    y_train_tensor
)

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True
)


# ============================================================
# 13. DEVICE
# ============================================================

device = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

print("\nDevice:", device)


# ============================================================
# 14. LSTM MODEL
# ============================================================

class LSTMModel(nn.Module):

    def __init__(
        self,
        input_size,
        hidden_size,
        num_layers
    ):

        super().__init__()

        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.2
            if num_layers > 1
            else 0.0
        )

        self.fc = nn.Linear(
            hidden_size,
            1
        )

    def forward(self, x):

        output, _ = self.lstm(x)

        # Use final timestep
        last_output = output[:, -1, :]

        logits = self.fc(
            last_output
        )

        return logits.squeeze(1)


model = LSTMModel(
    input_size=INPUT_SIZE,
    hidden_size=HIDDEN_SIZE,
    num_layers=NUM_LAYERS
).to(device)


print("\n" + "=" * 60)
print("MODEL")
print("=" * 60)

print(model)


# ============================================================
# 15. FORWARD PASS TEST
# ============================================================

sample_X, sample_y = next(
    iter(train_loader)
)

sample_X = sample_X.to(device)

with torch.no_grad():

    sample_output = model(
        sample_X
    )

print("\nForward pass:")
print("Input shape :", sample_X.shape)
print("Target shape:", sample_y.shape)
print("Output shape:", sample_output.shape)


# ============================================================
# 16. LOSS
# ============================================================

# Give somewhat higher importance to detecting attacks.
#
# This is NOT calculated from the test set.

POS_WEIGHT = 1.5

pos_weight = torch.tensor(
    POS_WEIGHT,
    dtype=torch.float32,
    device=device
)

criterion = nn.BCEWithLogitsLoss(
    pos_weight=pos_weight
)


# ============================================================
# 17. OPTIMIZER
# ============================================================

optimizer = torch.optim.Adam(
    model.parameters(),
    lr=LEARNING_RATE
)


# ============================================================
# 18. VALIDATION
# ============================================================

def get_validation_loss():

    model.eval()

    with torch.no_grad():

        logits = model(
            X_val_tensor.to(device)
        )

        loss = criterion(
            logits,
            y_val_tensor.to(device)
        )

    return loss.item()


# ============================================================
# 19. TRAIN
# ============================================================

print("\n" + "=" * 60)
print("STARTING TRAINING")
print("=" * 60)

best_val_loss = float("inf")

best_model_state = None

epochs_without_improvement = 0


for epoch in range(EPOCHS):

    model.train()

    total_loss = 0.0

    for batch_X, batch_y in train_loader:

        batch_X = batch_X.to(device)
        batch_y = batch_y.to(device)

        optimizer.zero_grad()

        logits = model(
            batch_X
        )

        loss = criterion(
            logits,
            batch_y
        )

        loss.backward()

        torch.nn.utils.clip_grad_norm_(
            model.parameters(),
            max_norm=1.0
        )

        optimizer.step()

        total_loss += loss.item()


    train_loss = (
        total_loss
        / len(train_loader)
    )

    val_loss = get_validation_loss()


    print(
        f"Epoch {epoch + 1:02d}/{EPOCHS} "
        f"- Train Loss: {train_loss:.4f} "
        f"- Val Loss: {val_loss:.4f}"
    )


    # --------------------------------------------------------
    # Save best model
    # --------------------------------------------------------

    if val_loss < best_val_loss:

        best_val_loss = val_loss

        best_model_state = {
            key: value.cpu().clone()
            for key, value
            in model.state_dict().items()
        }

        epochs_without_improvement = 0

    else:

        epochs_without_improvement += 1

        if (
            epochs_without_improvement
            >= PATIENCE
        ):

            print(
                "\nEarly stopping."
            )

            break


# ============================================================
# 20. RESTORE BEST MODEL
# ============================================================

if best_model_state is not None:

    model.load_state_dict(
        best_model_state
    )

    model.to(device)


print(
    "\nBest validation loss:",
    round(best_val_loss, 4)
)


# ============================================================
# 21. TEST
# ============================================================

model.eval()

with torch.no_grad():

    test_logits = model(
        X_test_tensor.to(device)
    )

    test_probabilities = torch.sigmoid(
        test_logits
    ).cpu().numpy()


# ============================================================
# 22. PROBABILITY ANALYSIS
# ============================================================

print("\n" + "=" * 60)
print("TEST PROBABILITIES")
print("=" * 60)

print(
    "Minimum:",
    round(
        float(test_probabilities.min()),
        4
    )
)

print(
    "Maximum:",
    round(
        float(test_probabilities.max()),
        4
    )
)

print(
    "Mean:",
    round(
        float(test_probabilities.mean()),
        4
    )
)

print("\nFirst 20 probabilities:")

print(
    np.round(
        test_probabilities[:20],
        4
    )
)


# ============================================================
# 23. PREDICTIONS
# ============================================================

test_predictions = (
    test_probabilities >= THRESHOLD
).astype(int)

test_actual = y_test.astype(int)


# ============================================================
# 24. METRICS
# ============================================================

accuracy = accuracy_score(
    test_actual,
    test_predictions
)

precision = precision_score(
    test_actual,
    test_predictions,
    zero_division=0
)

recall = recall_score(
    test_actual,
    test_predictions,
    zero_division=0
)

f1 = f1_score(
    test_actual,
    test_predictions,
    zero_division=0
)

tn, fp, fn, tp = confusion_matrix(
    test_actual,
    test_predictions,
    labels=[0, 1]
).ravel()

fpr = (
    fp / (fp + tn)
    if (fp + tn) > 0
    else 0.0
)


# ============================================================
# 25. FINAL RESULTS
# ============================================================

print("\n" + "=" * 60)
print("FINAL TEST RESULTS")
print("=" * 60)

print(
    f"Threshold : {THRESHOLD:.2f}"
)

print(
    f"Accuracy  : {accuracy:.4f}"
)

print(
    f"Precision : {precision:.4f}"
)

print(
    f"Recall    : {recall:.4f}"
)

print(
    f"F1 Score  : {f1:.4f}"
)

print(
    f"FPR       : {fpr:.4f}"
)


print("\nConfusion Matrix:")

print("TN:", tn)
print("FP:", fp)
print("FN:", fn)
print("TP:", tp)


# ============================================================
# 26. SAVE MODEL
# ============================================================

MODEL_PATH = (
    r"E:\Projects\SIH\lstm_attack_forecaster.pt"
)

torch.save(
    {
        "model_state_dict":
            model.state_dict(),

        "input_size":
            INPUT_SIZE,

        "hidden_size":
            HIDDEN_SIZE,

        "num_layers":
            NUM_LAYERS,

        "sequence_length":
            SEQUENCE_LENGTH,

        "features":
            FEATURES,

        "threshold":
            THRESHOLD
    },
    MODEL_PATH
)


print("\nModel saved to:")
print(MODEL_PATH)