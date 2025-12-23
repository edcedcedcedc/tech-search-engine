# Install / Dev Setup

## Client (React / Vite)

```bash
cd web
npm install
npm run dev
```

* Runs frontend on [http://localhost:5173](http://localhost:5173)
* Make changes in `src/`, they reload automatically

---

## Server (Django)

* There are lots of not project related packs in requirements.txt but, that doesn't bother me, might be fixed later
```bash
cd server
python -m venv venv
python manage.py migrate
```
* Run your venv 

```bash
pip install -r requirements.txt 
```
* You can optionally **use** `run.py`, it should use your **venv**
```bash
python run.py runserver
python run.py migrate
```

---

## Environment variables

Create a `.env` file in `server/` with:

```
SECRET_KEY=your-dev-secret-key
DATABASE_URL=sqlite:///db.sqlite3
API_URL=http://localhost:8000/api
```

* `.env` should **not** be committed
* `.env.example` can be committed without real secrets

* Generate a dev `secret key`
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(__import__('django').core.management.utils.get_random_secret_key())"

```

* Run `server`
```bash
python manage.py runserver
```
* Runs backend on [http://localhost:8000](http://localhost:8000)
* Your local DB is `db.sqlite3` by default
---

## Working with models / migrations

1. If you **modify models**:

```bash
python manage.py makemigrations
```

* This generates migration files

2. **Apply migrations** to your local DB:

```bash
python manage.py migrate
```

3. **Commit migration files** with your PR

* Other developers **pull** and then run `migrate` to sync DB

---

## Notes

* There is a **separate database** per developer (default: SQLite)
* Never commit real secrets
* Pull latest migrations before creating new ones
* Only run `makemigrations` if you change models
