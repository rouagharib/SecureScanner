import subprocess
import json
import os
import zipfile
import tempfile

def run_bandit_scan(file_path: str) -> list:
    """Run Bandit on a file or folder and return parsed results"""
    
    result = subprocess.run(
        ["bandit", "-r", file_path, "-f", "json", "-q"],
        capture_output=True,
        text=True
    )

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        return []

    vulnerabilities = []
    for issue in data.get("results", []):
        vulnerabilities.append({
            "type": issue.get("test_name", "Unknown"),
            "severity": issue.get("issue_severity", "LOW").lower(),
            "file": issue.get("filename", ""),
            "line": issue.get("line_number", 0),
            "description": issue.get("issue_text", ""),
            "fix": get_fix_suggestion(issue.get("test_id", "")),
            "code": issue.get("code", "").strip()
        })

    return vulnerabilities


def extract_zip(zip_path: str, extract_to: str):
    """Extract a zip file to a folder"""
    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall(extract_to)


def get_fix_suggestion(test_id: str) -> str:
    """Return a fix suggestion based on Bandit test ID"""
    fixes = {
        "B101": "Avoid using assert statements in production code.",
        "B102": "Avoid using exec(), it can execute arbitrary code.",
        "B103": "Ensure file permissions are set securely.",
        "B104": "Binding to 0.0.0.0 exposes the service on all interfaces.",
        "B105": "Avoid hardcoded passwords in source code.",
        "B106": "Avoid hardcoded passwords in function arguments.",
        "B107": "Avoid hardcoded passwords in function defaults.",
        "B108": "Use a secure temp file location.",
        "B110": "Avoid bare except clauses, handle exceptions explicitly.",
        "B201": "Flask debug mode exposes sensitive information.",
        "B301": "Avoid using pickle, use JSON instead.",
        "B303": "Use hashlib.sha256 or stronger instead of MD5/SHA1.",
        "B304": "Use a secure cipher mode like AES-GCM.",
        "B307": "Avoid using eval(), it can execute arbitrary code.",
        "B311": "Use secrets module instead of random for security tokens.",
        "B324": "MD5 and SHA1 are not secure for cryptographic use.",
        "B404": "Be careful when using subprocess, validate all inputs.",
        "B501": "Do not disable SSL certificate verification.",
        "B601": "Avoid shell injection by not using shell=True.",
        "B602": "Avoid shell injection by not using shell=True.",
        "B608": "Use parameterized queries to prevent SQL injection.",
        "B703": "Avoid using django.utils.safestring with user input.",
    }
    return fixes.get(test_id, "Review this code and follow security best practices.")