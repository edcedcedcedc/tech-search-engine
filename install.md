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

```bash
cd djangoapp
python -m venv venv
python -m venv venv_translate

```
* Run your venv 
* Run your venv_translate

```bash
pip install -r requirements-venv.txt 
```

```bash
pip install -r requirements-venv-translate.txt 
```


---

Create a `.env` file in `djangoapp/` with:

```
SECRET_KEY=your-dev-secret-key
DATABASE_URL=sqlite:///db.sqlite3
OPENAI_API_KEY=your-api-key
API_URL=http://localhost:8000/api
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
ADMIN_EMAIL=
```

* Generate a dev `secret key`
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(__import__('django').core.management.utils.get_random_secret_key())"

```
* Migrate `djangoapp`
```bash
python manage.py migrations
```
---

* Run `djangoapp`
```bash
python manage.py runserver
```
* Runs backend on [http://localhost:8000](http://localhost:8000)
* Your local DB is `db.sqlite3` by default
---

* Run `docker`
```bash
docker-compose -f docker-compose-elastic.yml up -d
docker-compose -f docker-compose-redis.yml down
```
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
or to apply to all local DBs
```bash
python manage.py migrations
```
3. **Commit migration files** with your PR

* Other developers **pull** and then run `migrate` to sync DB

---

## Notes

* There is a **separate database** per developer (default: SQLite)
* Never commit real secrets
* Pull latest migrations before creating new ones
* Only run `makemigrations` if you change models
