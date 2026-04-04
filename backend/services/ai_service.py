import pickle
import os

# ── LOAD ALL MODELS ───────────────────────────────────────
def load(path):
    if not os.path.exists(path):
        print(f"⚠️ Model not found: {path}")
        return None

    try:
        with open(path, "rb") as f:
            model = pickle.load(f)
            print(f"✅ Loaded: {path}")
            return model
    except Exception as e:
        print(f"❌ Failed to load {path}: {e}")
        return None

vulnerability_model = load("models/vulnerability_model.pkl")
vectorizer = load("models/vectorizer.pkl")
language_vectorizer = load("models/language_vectorizer.pkl")
msr_model = load("models/msr_vulnerability_model.pkl")
risk_model = load("models/risk_model.pkl")
risk_vectorizer = load("models/risk_vectorizer.pkl")
severity_model = load("models/severity_model.pkl")

loaded = sum(1 for m in [vulnerability_model, vectorizer, language_vectorizer, msr_model, risk_model, risk_vectorizer, severity_model] if m is not None)
print(f"✅ AI Pipeline: {loaded}/7 models loaded")


# ── PREDICT LANGUAGE ──────────────────────────────────────
def predict_language(text: str) -> str:
    if language_vectorizer and msr_model:
        try:
            features = language_vectorizer.transform([text])
            return msr_model.predict(features)[0]
        except Exception as e:
            print(f"Language prediction error: {e}")
    return "unknown"


# ── PREDICT SEVERITY ──────────────────────────────────────
def predict_severity(text: str) -> str:
    if vectorizer and severity_model:
        try:
            features = vectorizer.transform([text])
            return severity_model.predict(features)[0]
        except Exception as e:
            print(f"Severity prediction error: {e}")
    return None


# ── PREDICT RISK ──────────────────────────────────────────
def predict_risk(text: str) -> str:
    if risk_vectorizer and risk_model:
        try:
            features = risk_vectorizer.transform([text])
            return risk_model.predict(features)[0]
        except Exception as e:
            print(f"Risk prediction error: {e}")
    return None


# ── PREDICT CONFIDENCE ────────────────────────────────────
def predict_confidence(text: str) -> int:
    if vectorizer and vulnerability_model:
        try:
            features = vectorizer.transform([text])
            proba = vulnerability_model.predict_proba(features)[0]
            return round(proba[1] * 100)
        except Exception as e:
            print(f"Confidence prediction error: {e}")
    return rule_based_score_from_text(text)


# ── FALLBACK RULE-BASED ───────────────────────────────────
def rule_based_score(vuln: dict) -> int:
    severity = vuln.get("severity", "low")
    vuln_type = str(vuln.get("type", "")).lower()
    base = {"critical": 90, "high": 75, "medium": 55, "low": 35}.get(severity, 50)
    if any(t in vuln_type for t in ["sql injection", "xss", "hardcoded", "shell"]):
        base = min(base + 10, 99)
    return base

def rule_based_score_from_text(text: str) -> int:
    text = text.lower()
    if any(k in text for k in ["sql", "select", "insert"]):
        return 75
    if any(k in text for k in ["xss", "innerhtml", "script"]):
        return 70
    if any(k in text for k in ["password", "secret", "token"]):
        return 65
    if any(k in text for k in ["eval", "exec", "shell"]):
        return 72
    return 45


# ── MAIN PIPELINE ─────────────────────────────────────────
def analyze_vulnerabilities(vulnerabilities: list) -> list:
    result = []

    for vuln in vulnerabilities:
        code = str(vuln.get("code", "") or "")
        description = str(vuln.get("description", "") or "")
        text = code + " " + description

        vuln_copy = vuln.copy()

        # 1. Confidence score
        confidence = predict_confidence(text)
        vuln_copy["confidence"] = confidence
        vuln_copy["ai_verdict"] = (
            "Confirmed" if confidence >= 75
            else "Likely" if confidence >= 50
            else "Review"
        )

        # 2. Predicted language
        lang = predict_language(text)
        if lang and lang != "unknown":
            vuln_copy["detected_language"] = lang

        # 3. AI predicted severity (keeps original if prediction fails)
        ai_severity = predict_severity(text)
        if ai_severity:
            vuln_copy["ai_severity"] = ai_severity

        # 4. Risk level
        risk = predict_risk(text)
        if risk:
            vuln_copy["risk_level"] = risk

        result.append(vuln_copy)

    return result