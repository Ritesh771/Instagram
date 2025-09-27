# Django REST Backend

## Quickstart

1. Create venv and install:
```
python -m venv venv
./venv/Scripts/python.exe -m pip install -r requirements.txt
```

2. Create `.env` from example and fill values:
```
copy .env.example .env
```

3. Run migrations and start server:
```
./venv/Scripts/python.exe manage.py makemigrations
./venv/Scripts/python.exe manage.py migrate
./venv/Scripts/python.exe manage.py createsuperuser
./venv/Scripts/python.exe manage.py runserver 0.0.0.0:8000
```

## Endpoints
- POST `/api/auth/register/`
- POST `/api/auth/verify-otp/`
- POST `/api/auth/login/` (JWT)
- POST `/api/auth/reset-password/`
- POST `/api/auth/reset-password/confirm/`
- GET/POST `/api/posts/`
- DELETE `/api/posts/{id}/`

Images served at `/media/` during DEBUG.
