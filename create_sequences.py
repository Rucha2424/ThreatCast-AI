import pandas as pd
import numpy as np

FILE = r"E:\Projects\SIH\data\CTU13\scenario1\network_states.csv"

# How many previous 30-second states the LSTM will see
SEQUENCE_LENGTH = 10

df = pd.read_csv(FILE)

# Make sure time is ordered
df["TimeWindow"] = pd.to_datetime(df["TimeWindow"])
df = df.sort_values("TimeWindow").reset_index(drop=True)

# Target:
# 1 = attack in the NEXT 30-second window
# 0 = no attack in the NEXT 30-second window
df["Target_Next_Attack"] = (
    df["Attack_Flow_Count"].shift(-1) > 0
).astype(int)

# Last row has no next window to predict
df = df.iloc[:-1].copy()

# IMPORTANT:
# Do NOT use Attack_Flow_Count or Attack_Ratio as input features.
# They directly reveal attack information and would cause leakage.
FEATURES = [
    "Flow_Count",
    "Total_Packets",
    "Total_Bytes",
    "Total_Source_Bytes",
    "Avg_Duration",
    "Avg_Packets_Per_Flow",
    "Avg_Bytes_Per_Flow"
]

X = df[FEATURES].values.astype(np.float32)
y = df["Target_Next_Attack"].values.astype(np.float32)

print("Total states:", len(df))
print("Number of features:", len(FEATURES))
print("Sequence length:", SEQUENCE_LENGTH)

# Create sliding-window sequences
X_sequences = []
y_sequences = []

for i in range(SEQUENCE_LENGTH, len(df)):
    X_sequences.append(X[i-SEQUENCE_LENGTH:i])
    y_sequences.append(y[i])

X_sequences = np.array(X_sequences)
y_sequences = np.array(y_sequences)

print("\nSequence dataset:")
print("X shape:", X_sequences.shape)
print("y shape:", y_sequences.shape)

print("\nExpected:")
print("Samples:", len(df) - SEQUENCE_LENGTH)
print("Features:", len(FEATURES))
print("Each sequence:", SEQUENCE_LENGTH, "states")

print("\nTarget distribution:")
unique, counts = np.unique(y_sequences, return_counts=True)

for label, count in zip(unique.astype(int), counts):
    print(label, "->", count)