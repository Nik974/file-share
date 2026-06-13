# Aplikacja do wymiany plików

Webowa aplikacja do tymczasowego przesyłania plików między urządzeniami bez konta — przez 6-cyfrowy kod.

## Funkcje

- Upload do 5 plików jednocześnie (max 100MB każdy)
- Generowanie unikalnego 6-cyfrowego kodu
- Odbiór przez wpisanie kodu — pojedynczy plik lub ZIP dla wielu
- Automatyczne usuwanie po 15 minutach lub po pierwszym pobraniu

## Tech stack

- Backend: ASP.NET Core, Entity Framework Core, PostgreSQL
- Frontend: React (Vite), Material UI

## Wymagania

- .NET 10 SDK
- Node.js 18+
- Docker (do PostgreSQL)

## Konfiguracja

### 1. Sklonuj repo

```bash
git clone <adres-repo>
cd WebApplication3
```

### 2. Zmienne środowiskowe

Stwórz plik `.env` w głównym folderze (na podstawie `.env.example`):

```env
DB_USER=fileexchange_user
DB_PASSWORD=twoje_haslo
```

### 3. Connection string

Stwórz `appsettings.Development.json` (na podstawie `appsettings.Development.json.example`):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=FileExchangeDb;Username=fileexchange_user;Password=twoje_haslo;Timezone=UTC"
  }
}
```

### 4. Postaw bazę danych

```bash
docker-compose up -d
```

### 5. Migracje

```bash
dotnet ef database update
```

### 6. Zainstaluj zależności frontendu

```bash
cd client
npm install
cd ..
```

## Uruchomienie

W dwóch terminalach:

```bash
# Terminal 1 — frontend
cd client
npm run dev
```

```bash
# Terminal 2 — backend
dotnet run
```

Aplikacja będzie dostępna na `http://localhost:5287`.

## Struktura projektu

```
WebApplication3/
├── Controllers/      # API endpoints
├── Models/           # Modele EF Core
├── Data/             # DbContext
├── Services/         # Background services (cleanup)
├── client/           # Frontend React
├── docker-compose.yml
└── README.md
```