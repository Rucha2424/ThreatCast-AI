import pandas as pd

ORIGINAL = r"data\CTU13\all_network_states.csv"
RICH = r"data\CTU13\scenario12_rich_features.csv"

print("=" * 70)
print("SCENARIO 12 FINAL ALIGNMENT VERIFICATION")
print("=" * 70)

original = pd.read_csv(ORIGINAL)
rich = pd.read_csv(RICH)

original["Timestamp"] = pd.to_datetime(original["Timestamp"])
rich["Timestamp"] = pd.to_datetime(rich["Timestamp"])

original12 = (
    original[original["Scenario"] == 12]
    .sort_values("Timestamp")
    .reset_index(drop=True)
)

rich = (
    rich
    .sort_values("Timestamp")
    .reset_index(drop=True)
)

print("\nOriginal Scenario 12 states:", len(original12))
print("Rich Scenario 12 states:", len(rich))

# ------------------------------------------------------------
# TIMESTAMP CHECK
# ------------------------------------------------------------

timestamp_match = (
    original12["Timestamp"].equals(
        rich["Timestamp"]
    )
)

print(
    "\nTimestamp alignment:",
    "PASS" if timestamp_match else "FAIL"
)

# ------------------------------------------------------------
# TARGET CHECK
# ------------------------------------------------------------

target_match = (
    original12["Target_Early_Warning"].values
    ==
    rich["Target_Early_Warning"].values
).all()

print(
    "Target alignment:",
    "PASS" if target_match else "FAIL"
)

# ------------------------------------------------------------
# ATTACK STATE CHECK
# ------------------------------------------------------------

attack_match = (
    original12["Attack_State"].values
    ==
    rich["Attack_State"].values
).all()

print(
    "Attack-state alignment:",
    "PASS" if attack_match else "FAIL"
)

# ------------------------------------------------------------
# FIRST / LAST TIMESTAMPS
# ------------------------------------------------------------

print("\nOriginal first timestamp:")
print(original12["Timestamp"].iloc[0])

print("\nRich first timestamp:")
print(rich["Timestamp"].iloc[0])

print("\nOriginal last timestamp:")
print(original12["Timestamp"].iloc[-1])

print("\nRich last timestamp:")
print(rich["Timestamp"].iloc[-1])

# ------------------------------------------------------------
# TARGET DISTRIBUTION
# ------------------------------------------------------------

print("\nOriginal target:")
print(
    original12["Target_Early_Warning"]
    .value_counts()
    .sort_index()
)

print("\nRich target:")
print(
    rich["Target_Early_Warning"]
    .value_counts()
    .sort_index()
)

# ------------------------------------------------------------
# FINAL RESULT
# ------------------------------------------------------------

print("\n" + "=" * 70)

if (
    len(original12) == len(rich)
    and timestamp_match
    and target_match
    and attack_match
):
    print("FINAL ALIGNMENT: PASS")
    print("Rich features are ready for model comparison.")
else:
    print("FINAL ALIGNMENT: FAIL")
    print("Do NOT train yet.")

print("=" * 70)