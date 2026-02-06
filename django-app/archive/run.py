import subprocess
import sys
import os

VENV_PYTHON = os.path.join(os.getcwd(), "venv", "Scripts", "python.exe")
MANAGE_PY = os.path.join(os.getcwd(), "manage.py")


def run(command):
    full_cmd = [VENV_PYTHON, MANAGE_PY] + command.split()
    subprocess.run(full_cmd, check=True)


def main():
    if len(sys.argv) < 2:
        print("Usage: python run.py <command>")
        print("Commands: migrate, runserver, createsuperuser, test, resetdb")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "migrate":
        run("migrate")
    elif cmd == "makemigrations":
        run("makemigrations")
    elif cmd == "runserver":
        run("runserver")
    elif cmd == "createsuperuser":
        run("createsuperuser")
    elif cmd == "test":
        run("test")
    elif cmd == "resetdb":
        db_path = os.path.join(os.getcwd(), "db.sqlite3")
        if os.path.exists(db_path):
            os.remove(db_path)
            print("SQLite database deleted.")
        else:
            print("No database found.")
    elif cmd == "install":
        subprocess.run(
            [VENV_PYTHON, "-m", "pip", "install", "-r", "requirements.txt"], check=True
        )
    else:
        print(f"Unknown command: {cmd}")


if __name__ == "__main__":
    main()
