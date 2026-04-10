import pickle
import os
import joblib

# ── LOAD ALL MODELS ───────────────────────────────────────
def load_pickle(path):
    if not os.path.exists(path):
        print(f"⚠️  Not found: {path}")
        return None
    try:
        with open(path, "rb") as f:
            return pickle.load(f)
    except Exception as e:
        print(f"⚠️  Failed to load {path}: {e}")
        return None

def load_joblib(path):
    if not os.path.exists(path):
        print(f"⚠️  Not found: {path}")
        return None
    try:
        return joblib.load(path)
    except Exception as e:
        print(f"⚠️  Failed to load {path}: {e}")
        return None

# Model 1 — Vulnerability confidence (safe/vulnerable)
vulnerability_model = load_pickle("models/vulnerability_model.pkl")
vectorizer = load_pickle("models/vectorizer.pkl")

# Model 2 — Vulnerability type classifier (MSR dataset pipeline)
msr_model = load_joblib("models/msr_vulnerability_model.pkl")

# Model 3 — Risk assessment
risk_model = load_pickle("models/risk_model.pkl")
risk_vectorizer = load_pickle("models/risk_vectorizer.pkl")

# Model 4 — Severity prediction (pipeline)
severity_model = load_joblib("models/severity_model.pkl")

loaded = sum(1 for m in [vulnerability_model, vectorizer, msr_model, risk_model, risk_vectorizer, severity_model] if m is not None)
print(f"✅ AI Pipeline: {loaded}/6 models loaded")


# ── MODEL 1: CONFIDENCE SCORE ─────────────────────────────
def predict_confidence(text: str) -> int:
    if vulnerability_model and vectorizer:
        try:
            features = vectorizer.transform([text])
            proba = vulnerability_model.predict_proba(features)[0]
            classes = list(vulnerability_model.classes_)
            if "vulnerable" in classes:
                idx = classes.index("vulnerable")
            else:
                idx = 1
            return round(proba[idx] * 100)
        except Exception as e:
            print(f"Confidence error: {e}")
    return rule_based_confidence(text)


# ── MODEL 2: VULNERABILITY TYPE ───────────────────────────
def predict_vuln_type(text: str) -> str:
    if msr_model:
        try:
            result = msr_model.predict([text])[0]
            return str(result)
        except Exception as e:
            print(f"Vuln type error: {e}")
    return None


# ── MODEL 3: RISK LEVEL ───────────────────────────────────
def predict_risk(text: str) -> str:
    if risk_model and risk_vectorizer:
        try:
            features = risk_vectorizer.transform([text])
            result = risk_model.predict(features)[0]
            return str(result)
        except Exception as e:
            print(f"Risk error: {e}")
    return None


# ── MODEL 4: SEVERITY ─────────────────────────────────────
def predict_severity(text: str) -> str:
    if severity_model:
        try:
            result = severity_model.predict([text])[0]
            return str(result)
        except Exception as e:
            print(f"Severity error: {e}")
    return None


# ── FALLBACK ──────────────────────────────────────────────
def rule_based_confidence(text: str) -> int:
    text = text.lower()
    if any(k in text for k in ["sql", "select", "insert", "delete"]):
        return 75
    if any(k in text for k in ["xss", "innerhtml", "script", "document.write"]):
        return 72
    if any(k in text for k in ["password", "secret", "token", "api_key"]):
        return 68
    if any(k in text for k in ["eval", "exec", "shell", "subprocess"]):
        return 70
    return 45


# ── MAIN PIPELINE ─────────────────────────────────────────
def analyze_vulnerabilities(vulnerabilities: list) -> list:
    result = []

    for vuln in vulnerabilities:
        code = str(vuln.get("code", "") or "")
        description = str(vuln.get("description", "") or "")
        text = code + " " + description

        vuln_copy = vuln.copy()

        # 1 — Confidence score (is it really vulnerable?)
        confidence = predict_confidence(text)
        vuln_copy["confidence"] = confidence
        vuln_copy["ai_verdict"] = (
            "Confirmed" if confidence >= 75
            else "Likely" if confidence >= 50
            else "Review"
        )

        # 2 — Vulnerability type from MSR model
        vuln_type = predict_vuln_type(text)
        if vuln_type:
            vuln_copy["ai_vuln_type"] = vuln_type

        # 3 — Risk level
        risk = predict_risk(text)
        if risk:
            vuln_copy["risk_level"] = risk

        # 4 — AI predicted severity
        ai_severity = predict_severity(text)
        if ai_severity:
            vuln_copy["ai_severity"] = ai_severity

        result.append(vuln_copy)

    return result