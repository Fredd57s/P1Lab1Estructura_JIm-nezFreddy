import pandas as pd
from typing import List, Dict, Any

class PredictDataFilter:
    """Convierte los datos de entrada, los formatea y genera una predicción."""
    
    def run(self, model: Any, features_list: List[str], raw_values_dict: Dict[str, str]) -> Dict[str, Any]:
        values = {}
        
        for feature in features_list:
            raw_value = raw_values_dict.get(feature, "").strip()
            if raw_value == "":
                raise ValueError(f"El campo '{feature}' es obligatorio.")
            
            # Convertir a número cuando corresponda
            try:
                values[feature] = float(raw_value)
            except ValueError:
                values[feature] = raw_value
                
        # Crear el DataFrame con un solo registro
        sample = pd.DataFrame([values], columns=features_list)
        
        # Generar predicción
        prediction = model.predict(sample)[0]
        probability = None
        
        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(sample)[0]
            probability = round(float(max(probabilities)) * 100, 2)
            
        return {
            "label": str(prediction),
            "probability": probability
        }