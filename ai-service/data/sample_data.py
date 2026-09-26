"""
Generates realistic synthetic training data for the waiting-time prediction
model, standing in for real historical queue records until the system has
collected enough of its own (see /retrain, which replaces this file's
output with real service_history data from the database).

Ground-truth relationship (with noise) that the Random Forest learns:

    wait_time ≈ (queue_length * avg_historical_duration) / active_counters
                 - (currently_serving * 0.5)
                 + service-specific offset
                 + random noise

This keeps the model's behaviour intuitive and inspectable, which matters
for a citizen-facing government system: predictions should track queue
math, not become an unexplainable black box.
"""
import numpy as np
import pandas as pd

SERVICE_IDS = [1, 2, 3, 4, 5, 6]
SERVICE_BASE_DURATION = {1: 10, 2: 8, 3: 12, 4: 15, 5: 9, 6: 11}

rng = np.random.default_rng(42)


def generate_sample_data(n_rows: int = 4000) -> pd.DataFrame:
    rows = []
    for _ in range(n_rows):
        service_id = int(rng.choice(SERVICE_IDS))
        base_duration = SERVICE_BASE_DURATION[service_id]

        queue_length = int(rng.integers(0, 40))
        active_counters = int(rng.integers(1, 5))
        currently_serving = int(rng.integers(0, active_counters + 1))
        avg_historical_duration = max(
            float(rng.normal(base_duration, 1.5)), 3.0
        )

        true_wait = (
            (queue_length * avg_historical_duration) / active_counters
            - currently_serving * 0.5
        )
        noise = rng.normal(0, max(true_wait * 0.08, 1.0))
        wait_time = max(true_wait + noise, 1.0)

        rows.append(
            {
                "queue_length": queue_length,
                "service_id": service_id,
                "avg_historical_duration": round(avg_historical_duration, 2),
                "active_counters": active_counters,
                "currently_serving": currently_serving,
                "wait_time_minutes": round(wait_time, 2),
            }
        )

    return pd.DataFrame(rows)


if __name__ == "__main__":
    df = generate_sample_data()
    df.to_csv("data/sample_training_data.csv", index=False)
    print(f"Generated {len(df)} synthetic training rows -> data/sample_training_data.csv")
