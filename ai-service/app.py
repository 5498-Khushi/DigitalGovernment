"""
AI Waiting-Time Prediction microservice.

Runs independently of the Node.js backend so the ML layer stays a clean,
replaceable component (per the project's architecture requirement). The
Node backend calls POST /predict with live queue features and gets back
an estimated waiting time in minutes.

No paid/third-party AI APIs are used anywhere in this service -- only a
locally trained Random Forest Regression model (scikit-learn).
"""
from flask import Flask, request, jsonify
from flask_cors import CORS

from model import load_or_train_model, predict_wait_time, train_and_save

app = Flask(__name__)
CORS(app)

print("Loading (or training) the waiting-time prediction model...")
model = load_or_train_model()
print("Model ready.")


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "ai-waiting-time-prediction"})


@app.post("/predict")
def predict():
    body = request.get_json(silent=True) or {}

    required_fields = [
        "queue_length",
        "service_id",
        "avg_historical_duration",
        "active_counters",
        "currently_serving",
    ]
    missing = [f for f in required_fields if f not in body]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    try:
        features = {
            "queue_length": float(body["queue_length"]),
            "service_id": float(body["service_id"]),
            "avg_historical_duration": float(body["avg_historical_duration"]),
            "active_counters": float(body["active_counters"]),
            "currently_serving": float(body["currently_serving"]),
        }
    except (TypeError, ValueError):
        return jsonify({"error": "All fields must be numeric."}), 400

    predicted_minutes = predict_wait_time(model, features)

    return jsonify(
        {
            "predicted_wait_time_minutes": round(predicted_minutes, 1),
            "model": "RandomForestRegressor",
            "features_used": features,
        }
    )


@app.post("/retrain")
def retrain():
    """
    Retrain endpoint. In production, wire this to pull real rows from the
    MySQL service_history table (see train.py docstring) instead of
    synthetic data, then call this endpoint (e.g. on a nightly schedule)
    so predictions keep improving as real queue data accumulates.
    """
    global model
    model = train_and_save()
    return jsonify({"message": "Model retrained successfully."})


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 6000))
    app.run(host="0.0.0.0", port=port, debug=False)
