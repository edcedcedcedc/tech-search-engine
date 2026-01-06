# LibreTranslate Server Setup for Price Aggregator

---

## 1. Prepare the Project

Inside your Django project:

```
server/
├─ venv/                  # Python virtual environment
├─ translate_models/      # Folder for Argos translation models
```

Download the models you need (RO→EN, RO→RU) and put them in `translate_models/`.

---

## 2. Install Dependencies (Python)

```powershell
# Activate your virtual environment
.\venv\Scripts\activate   # Windows
source venv/bin/activate   # Linux/macOS

# Optional: update pip
pip install --upgrade pip
```

---

## 3. Install Docker

* **Windows:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* **Linux:** Use your distro’s Docker package (`apt install docker.io` or `yum install docker`)

Check Docker version:

```bash
docker -v
```

---

## 4. Run LibreTranslate in Docker

```powershell
docker run -d `
  -p 5000:5000 `
  -v ${PWD}/translate_models:/app/translate_models `
  --name libretranslate `
  libretranslate/libretranslate `
  --load-only ro,en,ru `
  --disable-web-ui
```

**Notes:**

* `--load-only ro,en,ru` → only load Romanian, English, Russian models
* `--disable-web-ui` → runs server without frontend
* Mounted folder `${PWD}/translate_models` contains your `.argosmodel` files

Check running container:

```powershell
docker ps
```

---

## 5. Test the Translation Server

**PowerShell (Windows):**

```powershell
Invoke-RestMethod -Method POST -Uri http://localhost:5000/translate -Body @{ q="Salut"; source="ro"; target="en" }
Invoke-RestMethod -Method POST -Uri http://localhost:5000/translate -Body @{ q="Salut"; source="ro"; target="ru" }
```

**Expected output:**

```json
translatedText
--------------
Hi
```

---

## 6. Stopping and Removing the Server

```powershell
docker stop libretranslate
docker rm libretranslate
```

* Safe to rerun with updated models or Docker configuration.

---

## 7. Notes for Linux Deployment

* Same Docker command works on Linux (mount path adjusted if needed):

```bash
-v /path/to/project/translate_models:/app/translate_models
```

* Ensure your Python virtual environment is set up for Django API calls to this server.
* Use standard `curl` on Linux or `Invoke-RestMethod` on PowerShell for testing.

---

✅ **Result:** You now have a reusable, containerized translation server for RO→EN & RO→RU, ready for Windows development and Linux production.
