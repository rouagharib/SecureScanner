from dotenv import load_dotenv
import os

load_dotenv()

# MongoDB
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "securescan")

# JWT
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Email
MAIL_EMAIL = os.getenv("MAIL_EMAIL", "")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
APP_URL = os.getenv("APP_URL", "http://localhost:5173")

# Git
GIT_EXECUTABLE = os.getenv("GIT_EXECUTABLE", "git")

# Scanning
MAX_SCAN_PAGES = int(os.getenv("MAX_SCAN_PAGES", "10"))
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", str(500 * 1024)))  # 500KB
ALLOWED_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".php", ".go", ".rb", ".c", ".cpp", ".zip"}

# Skip folders in git scan
SKIP_FOLDERS = {
    'node_modules', '.git', 'vendor', 'dist', 'build',
    '__pycache__', '.venv', 'venv', 'env', 'target',
    'bin', 'obj', '.idea', '.vscode'
}
