import pickle
import numpy as np
import pandas as pd
import torch
import torch.nn as nn


# ============================================================
# PATHS
# ============================================================

FILE = r"E:\Projects\SIH\data\CTU13\all_network_states.csv"

MODEL_PATH = r"E:\Projects\SIH\lstm_early_warning_multiscenario.pt"

SCALER_PATH = r"E:\Projects\SIH\lstm_early_warning_scaler.pkl"


# ============================================================
# CONFIG
# ============================================================

SEQUENCE_LENGTH = 5


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

TARGET = "Target_Early_Warning"

INPUT_SIZE = len(FEATURES)

HIDDEN_SIZE = 64

NUM_LAYERS = 2


# ============================================================
# LOAD DATA
# ============================================================

df = pd.read_csv(FILE)

df["TimeWindow"] = pd.to_datetime(
    df["TimeWindow"]
)

df = df.sort_values(
    ["Scenario", "TimeWindow"]
).reset_index(drop=True)


# ============================================================
# GET SCENARIO 5
# ============================================================

data = df[
    df["Scenario"] == "scenario5"
].copy()

data = data.sort_values(
    "TimeWindow"
).reset_index(drop=True)


# ============================================================
# LOAD SCALER
# ============================================================

with open(
    SCALER_PATH,
    "rb"
) as f:

    scaler = pickle.load(f)


data[FEATURES] = scaler.transform(
    data[FEATURES]
)


# ============================================================
# LSTM MODEL
# ============================================================

class ThreatCastLSTM(nn.Module):

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
        )

        self.fc = nn.Linear(
            hidden_size,
            1
        )


    def forward(self, x):

        output, _ = self.lstm(x)

        last_output = output[:, -1, :]

        logits = self.fc(
            last_output
        )

        return logits.squeeze(1)


# ============================================================
# LOAD MODEL
# ============================================================

checkpoint = torch.load(
    MODEL_PATH,
    map_location="cpu"
)


model = ThreatCastLSTM(
    INPUT_SIZE,
    HIDDEN_SIZE,
    NUM_LAYERS
)


model.load_state_dict(
    checkpoint["model_state_dict"]
)

model.eval()


# ============================================================
# SAVED THRESHOLD
# ============================================================

threshold = checkpoint.get(
    "threshold",
    0.30
)


print("=" * 90)
print("THREATCAST SCENARIO 5 PREDICTION INSPECTION")
print("=" * 90)

print()
print("Saved threshold:", threshold)
print("Sequence length:", SEQUENCE_LENGTH)
print("Scenario:", "scenario5")


# ============================================================
# CREATE PADDED SEQUENCES
# ============================================================

X = data[
    FEATURES
].values.astype(np.float32)


sequences = []


for i in range(len(data)):

    sequence = np.zeros(
        (
            SEQUENCE_LENGTH,
            INPUT_SIZE
        ),
        dtype=np.float32
    )


    start = max(
        0,
        i - SEQUENCE_LENGTH + 1
    )


    history = X[
        start:i + 1
    ]


    sequence[
        -len(history):
    ] = history


    sequences.append(
        sequence
    )


X_sequences = np.asarray(
    sequences,
    dtype=np.float32
)


# ============================================================
# PREDICT
# ============================================================

with torch.no_grad():

    tensor = torch.tensor(
        X_sequences,
        dtype=torch.float32
    )

    logits = model(
        tensor
    )

    probabilities = torch.sigmoid(
        logits
    ).numpy()


# ============================================================
# RESULTS TABLE
# ============================================================

results = pd.DataFrame(
    {
        "TimeWindow":
            data["TimeWindow"],

        "Actual":
            data[TARGET].astype(int),

        "Probability":
            probabilities,

        "Prediction":
            (
                probabilities >= threshold
            ).astype(int)
    }
)


# ============================================================
# PRINT ALL RESULTS
# ============================================================

print()
print("=" * 90)
print("ALL SCENARIO 5 PREDICTIONS")
print("=" * 90)

print(
    results.to_string(
        index=True,
        formatters={
            "Probability":
                lambda x: f"{x:.4f}"
        }
    )
)


# ============================================================
# WARNING PERIOD ONLY
# ============================================================

print()
print("=" * 90)
print("WARNING PERIOD")
print("=" * 90)

warning_period = results[
    results["Actual"] == 1
]

print(
    warning_period.to_string(
        index=True,
        formatters={
            "Probability":
                lambda x: f"{x:.4f}"
        }
    )
)


# ============================================================
# PROBABILITY COMPARISON
# ============================================================

normal = results[
    results["Actual"] == 0
]["Probability"]

warning = results[
    results["Actual"] == 1
]["Probability"]


print()
print("=" * 90)
print("PROBABILITY COMPARISON")
print("=" * 90)

print(
    "\nNormal states:"
)

print(
    "Mean probability:",
    f"{normal.mean():.4f}"
)

print(
    "Maximum probability:",
    f"{normal.max():.4f}"
)


print(
    "\nEarly-warning states:"
)

print(
    "Mean probability:",
    f"{warning.mean():.4f}"
)

print(
    "Minimum probability:",
    f"{warning.min():.4f}"
)

print(
    "Maximum probability:",
    f"{warning.max():.4f}"
)


# ============================================================
# DETECTION
# ============================================================

actual_positive_count = (
    results["Actual"] == 1
).sum()


detected_positive_count = (
    results[
        results["Actual"] == 1
    ]["Prediction"] == 1
).sum()


print()
print("=" * 90)
print("EARLY-WARNING DETECTION")
print("=" * 90)

print(
    "Actual warning states:",
    actual_positive_count
)

print(
    "Detected warning states:",
    detected_positive_count
)

print(
    "Detection rate:",
    f"{detected_positive_count / actual_positive_count:.2%}"
)


print()
print("=" * 90)
print("DONE")
print("=" * 90)