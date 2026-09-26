"""
Random Forest Regression model for waiting-time prediction.

This module is intentionally separated from app.py (the HTTP layer) so the
prediction logic can be swapped for a model trained on real production
service_history data without touching the API. To retrain on real data,
replace generate_sample_data() with a query against the MySQL
`service_history` table (see train_on_dataframe) and re-run train.py.
"""
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

from data.sample_data import generate_sample_data

MODEL_PATH = os.path.join(os.path.dirname(__file__), "waiting_time_model.joblib")

FEATURE_COLUMNS = [
    "queue_length",
    "service_id",
    "avg_historical_duration",
    "active_counters",
    "currently_serving",
]


def train_on_dataframe(df: pd.DataFrame) -> RandomForestRegressor:
    X = df[FEATURE_COLUMNS]
    y = df["wait_time_minutes"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    mae = mean_absolute_error(y_test, model.predict(X_test))
    print(f"Model trained. Mean Absolute Error on held-out data: {mae:.2f} minutes")

    return model


def train_and_save(df: pd.DataFrame = None) -> RandomForestRegressor:
    if df is None:
        df = generate_sample_data()
    model = train_on_dataframe(df)
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")
    return model


def load_or_train_model() -> RandomForestRegressor:
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return train_and_save()


def predict_wait_time(model: RandomForestRegressor, features: dict) -> float:
    row = pd.DataFrame([{col: features[col] for col in FEATURE_COLUMNS}])
    prediction = model.predict(row)[0]
    return max(float(prediction), 1.0)
