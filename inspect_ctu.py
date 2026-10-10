import pandas as pd

FILE = r"E:\Projects\SIH\data\CTU13\scenario5\capture20110815-2.binetflow"

prev_time = None
first_time = None
last_time = None
total_rows = 0
bad_order = 0
label_counts = {}

for chunk in pd.read_csv(FILE, chunksize=100_000):

    times = pd.to_datetime(chunk["StartTime"], errors="coerce")

    # First timestamp
    if first_time is None:
        first_time = times.iloc[0]

    # Check whether this chunk is internally chronological
    if not times.is_monotonic_increasing:
        bad_order += 1

    # Check boundary between previous chunk and current chunk
    if prev_time is not None:
        if times.iloc[0] < prev_time:
            bad_order += 1

    prev_time = times.iloc[-1]
    last_time = times.iloc[-1]

    total_rows += len(chunk)

    # Count labels
    for label, count in chunk["Label"].value_counts().items():
        label_counts[label] = label_counts.get(label, 0) + count


print("Total rows:", total_rows)
print("First timestamp:", first_time)
print("Last timestamp:", last_time)
print("Ordering problems:", bad_order)

print("\nTop 20 labels:")

for label, count in sorted(
    label_counts.items(),
    key=lambda x: x[1],
    reverse=True
)[:20]:
    print(count, "->", label)