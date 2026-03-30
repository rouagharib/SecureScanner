import pickle
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "..", "models")

def _load(filename):
    path = os.path.join(MODELS_DIR, filename)
    with open(path, "rb") as f:
        return pickle.load(f)

try:
    vuln_model      = _load("msr_vulnerability_model.pkl")
    vuln_vectorizer = _load("language_vectorizer.pkl")
    risk_model      = _load("risk_model.pkl")
    risk_vectorizer = _load("risk_vectorizer.pkl")
    severity_model = _load("severity_model.pkl")
    language_model = _load("language_model.pkl")
    AI_AVAILABLE = True
    print("✅ AI models loaded successfully")
except Exception as e:
    AI_AVAILABLE = False
    print(f"⚠️  AI models not found, skipping AI enrichment: {e}")

def enrich_with_ai(code_snippet: str) -> dict:
    if not AI_AVAILABLE or not code_snippet:
        return None

    try:
        # Vectorization
        vuln_vec = vuln_vectorizer.transform([code_snippet])
        risk_vec = risk_vectorizer.transform([code_snippet])

        # Predictions
        vulnerability_type = vuln_model.predict(vuln_vec)[0]
        risk_level         = risk_model.predict(risk_vec)[0]

        # ADD THESE 2 LINES
        severity = severity_model.predict(vuln_vec)[0]
        language = language_model.predict([code_snippet])[0]

        # UPDATE RETURN
        return {
            "ai_vulnerability_type": str(vulnerability_type),
            "ai_risk_level":         str(risk_level),
            "ai_severity":           str(severity),
            "ai_language":           str(language)
        }

    except Exception as e:
        print(f"⚠️  AI prediction failed: {e}")
        return None