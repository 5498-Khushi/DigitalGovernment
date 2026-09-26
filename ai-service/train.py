"""
Run this manually to (re)train the waiting-time model on synthetic data:

    python train.py

Once the system has collected real queue history in MySQL's
service_history table, point this at a real dataframe instead, e.g.:

    import pandas as pd
    import mysql.connector
    conn = mysql.connector.connect(...)
    df = pd.read_sql('''
        SELECT
          COUNT(*) OVER (PARTITION BY service_id) AS queue_length, -- illustrative only
          service_id,
          AVG(service_duration) OVER (PARTITION BY service_id) AS avg_historical_duration,
          ... active_counters, currently_serving ...
          waiting_duration AS wait_time_minutes
        FROM service_history
    ''', conn)
    train_and_save(df)
"""
from model import train_and_save

if __name__ == "__main__":
    train_and_save()
