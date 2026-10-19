import os
from pathlib import Path

import joblib
import pandas as pd

from flask import Flask, render_template, request, flash, jsonify
from dotenv import load_dotenv
from sklearn.model_selection import train_test_split

from filtros import (
    LoadDatasetFilter,
    ValidateDatasetFilter,
    PrepareDataFilter,
    TrainModelFilter,
    EvaluateModelFilter,
    PredictDataFilter
)

load_dotenv()
# Configuración de Flask
app = Flask(
    __name__,
    static_folder="public",
    static_url_path="/public"
)
app.secret_key = os.getenv("SECRET_KEY", "DEFAULT-KAY")

# Configuración del modelo con variables de entorno
ruta_modelo = os.getenv("MODEL_PATH", "models/weather_model.joblib")
MODEL_PATH = Path(ruta_modelo)
MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
TARGET = "rain"

@app.route("/", methods=["GET"])
def index():
    return render_template(
        "index.html",
        results=None,
        prediction_features=None,
        prediction_result=None
    )

@app.route("/train", methods=["POST"])
def train():
    uploaded = request.files.get("dataset")

    if uploaded is None or not uploaded.filename:
        flash("Selecciona un archivo CSV.")
        return index()

    if not uploaded.filename.lower().endswith(".csv"):
        flash("El archivo debe tener extensión .csv.")
        return index()

    try:
        # Filtro 1: carga del dataset
        raw = LoadDatasetFilter().run(uploaded.stream)

        # Filtro 2: validación
        validated = ValidateDatasetFilter(TARGET).run(raw)

        # Filtro 3: preparación de los datos
        X, y, info = PrepareDataFilter(TARGET).run(validated)

        # Separación de datos de entrenamiento y prueba
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.20,
            random_state=42,
            stratify=y
        )

        # Filtro 4: entrenamiento
        model = TrainModelFilter().run(
            X_train,
            y_train,
            info
        )

        # Filtro 5: evaluación
        metrics = EvaluateModelFilter().run(
            model,
            X_test,
            y_test
        )

        # Guardar modelo y configuración
        joblib.dump(
            {
                "model": model,
                "features": list(X.columns),
                "target": info["target"]
            },
            MODEL_PATH
        )

        results = {
            "rows": len(validated),
            "features": len(X.columns),
            "target": info["target"],
            "class_distribution": {
                str(key): int(value)
                for key, value in y.value_counts().items()
            },
            "metrics": metrics,
            "model_path": str(MODEL_PATH)
        }

        return render_template(
            "index.html",
            results=results,
            prediction_features=list(X.columns),
            prediction_result=None
        )

    except Exception as exc:
        app.logger.exception("Error durante el entrenamiento")
        flash(f"No se pudo procesar el dataset: {exc}")
        return index()

@app.route("/predict", methods=["POST"])
def predict():
    if not MODEL_PATH.exists():
        return jsonify({"error": "Primero entrena un modelo subiendo un dataset."}), 400

    try:
        saved = joblib.load(MODEL_PATH)
        model = saved["model"]
        features = saved["features"]

        # Generar predicción usando el filtro
        prediction_result = PredictDataFilter().run(model, features, request.form)

        # Devolver respuesta limpia en JSON
        return jsonify({
            "success": True,
            "prediction_result": prediction_result
        })

    except ValueError as val_err:
        return jsonify({"error": str(val_err)}), 400
    except Exception as exc:
        app.logger.exception("Error durante la predicción")
        return jsonify({"error": f"Ocurrió un error inesperado: {exc}"}), 500

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5001,
        debug=True
    )
