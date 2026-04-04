import os
import shutil
import tempfile
import git
from services.sast_service import run_scan
# Tell GitPython where Git is on Windows
os.environ['GIT_PYTHON_GIT_EXECUTABLE'] = 'C:\\Program Files\\Git\\bin\\git.exe'

# folders to skip
SKIP_FOLDERS = {
    'node_modules', '.git', 'vendor', 'dist', 'build',
    '__pycache__', '.venv', 'venv', 'env', 'target',
    'bin', 'obj', '.idea', '.vscode'
}

# max file size 500KB
MAX_FILE_SIZE = 500 * 1024

def clean_repo(path: str):
    """Remove unnecessary folders to speed up scanning"""
    for root, dirs, files in os.walk(path, topdown=True):
        dirs[:] = [d for d in dirs if d not in SKIP_FOLDERS]
        for file in files:
            file_path = os.path.join(root, file)
            try:
                if os.path.getsize(file_path) > MAX_FILE_SIZE:
                    os.remove(file_path)
            except:
                continue

def clone_and_scan(repo_url: str) -> dict:
    """Clone a Git repository and scan it"""
    temp_dir = tempfile.mkdtemp()

    try:
        print(f"Cloning {repo_url}...")
        git.Repo.clone_from(
            repo_url,
            temp_dir,
            depth=1,
            no_single_branch=False
        )
        print("Clone complete. Cleaning...")
        clean_repo(temp_dir)
        print("Scanning...")

        scan_result = run_scan(temp_dir)
        return {
            "success": True,
            "vulnerabilities": scan_result["vulnerabilities"],
            "languages": scan_result["languages"]
        }

    except git.exc.GitCommandError as e:
        return {
            "success": False,
            "error": f"Could not clone repository. Make sure it's public.",
            "vulnerabilities": [],
            "languages": []
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "vulnerabilities": [],
            "languages": []
        }
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)