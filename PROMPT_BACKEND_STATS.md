# PROMPT: Módulo Estadísticas de Reservas — FastAPI Backend

## Contexto

Backend FastAPI existente con acceso a dos bases de datos:
- **DB propia** (PostgreSQL/SQLite): usuarios, roles, permisos, etc.
- **DB Autocab** (MS SQL Server / MySQL): contiene la tabla `bookings`.

El endpoint debe consultar directamente la DB de Autocab.
Permiso requerido: `tools:run`.

---

## Endpoint a crear

```
GET /api/stats/bookings/summary
Authorization: Bearer <token>
Query params: date_from (YYYY-MM-DD), date_to (YYYY-MM-DD)
```

---

## SQL — dos consultas a ejecutar contra la DB de Autocab

### 1. Resumen global

```sql
SELECT
    COUNT(CASE WHEN archive_reason = 'Completed' THEN 1 END) AS completed,
    COUNT(CASE WHEN archive_reason = 'Cancelled' THEN 1 END) AS cancelled,
    COUNT(*)                                                  AS total,
    COUNT(DISTINCT vehicle_callsign)                          AS unique_vehicles
FROM bookings
WHERE pickup_due_time BETWEEN :date_from AND :date_to
  AND archive_reason IN ('Completed', 'Cancelled');
```

> El rango es inclusivo: `date_from` empieza a las 00:00:00 y `date_to` termina a las 23:59:59.
> Construir los timestamps así:
> - `date_from_dt = datetime(date_from.year, date_from.month, date_from.day, 0, 0, 0)`
> - `date_to_dt   = datetime(date_to.year,   date_to.month,   date_to.day,   23, 59, 59)`

### 2. Desglose por día

```sql
SELECT
    CAST(pickup_due_time AS DATE)                             AS date,
    COUNT(CASE WHEN archive_reason = 'Completed' THEN 1 END) AS completed,
    COUNT(CASE WHEN archive_reason = 'Cancelled' THEN 1 END) AS cancelled,
    COUNT(*)                                                  AS total,
    COUNT(DISTINCT vehicle_callsign)                          AS unique_vehicles
FROM bookings
WHERE pickup_due_time BETWEEN :date_from AND :date_to
  AND archive_reason IN ('Completed', 'Cancelled')
GROUP BY CAST(pickup_due_time AS DATE)
ORDER BY date ASC;
```

> Si la DB de Autocab es MySQL usar `DATE(pickup_due_time)` en lugar de `CAST(... AS DATE)`.

---

## Schemas Pydantic

```python
from datetime import date
from pydantic import BaseModel

class BookingStatsSummary(BaseModel):
    completed:       int
    cancelled:       int
    total:           int
    unique_vehicles: int

class BookingStatsByDay(BaseModel):
    date:            date
    completed:       int
    cancelled:       int
    total:           int
    unique_vehicles: int

class BookingStatsResponse(BaseModel):
    date_from: date
    date_to:   date
    summary:   BookingStatsSummary
    by_day:    list[BookingStatsByDay]
```

---

## Endpoint completo

```python
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

# Ajustar imports según la estructura del proyecto:
# from app.db.autocab import get_autocab_db
# from app.dependencies.auth import get_current_user, require_permission

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/bookings/summary", response_model=BookingStatsResponse)
def get_booking_stats(
    date_from: date = Query(...),
    date_to:   date = Query(...),
    db = Depends(get_autocab_db),
    current_user = Depends(require_permission("tools:run")),
):
    if date_to < date_from:
        raise HTTPException(status_code=422, detail="date_to no puede ser anterior a date_from")

    dt_from = datetime(date_from.year, date_from.month, date_from.day, 0,  0,  0)
    dt_to   = datetime(date_to.year,   date_to.month,   date_to.day,   23, 59, 59)

    # --- Resumen global ---
    summary_row = db.execute(text("""
        SELECT
            COUNT(CASE WHEN archive_reason = 'Completed' THEN 1 END) AS completed,
            COUNT(CASE WHEN archive_reason = 'Cancelled' THEN 1 END) AS cancelled,
            COUNT(*)                                                  AS total,
            COUNT(DISTINCT vehicle_callsign)                          AS unique_vehicles
        FROM bookings
        WHERE pickup_due_time BETWEEN :dt_from AND :dt_to
          AND archive_reason IN ('Completed', 'Cancelled')
    """), {"dt_from": dt_from, "dt_to": dt_to}).fetchone()

    # --- Desglose por día ---
    day_rows = db.execute(text("""
        SELECT
            CAST(pickup_due_time AS DATE)                             AS date,
            COUNT(CASE WHEN archive_reason = 'Completed' THEN 1 END) AS completed,
            COUNT(CASE WHEN archive_reason = 'Cancelled' THEN 1 END) AS cancelled,
            COUNT(*)                                                  AS total,
            COUNT(DISTINCT vehicle_callsign)                          AS unique_vehicles
        FROM bookings
        WHERE pickup_due_time BETWEEN :dt_from AND :dt_to
          AND archive_reason IN ('Completed', 'Cancelled')
        GROUP BY CAST(pickup_due_time AS DATE)
        ORDER BY date ASC
    """), {"dt_from": dt_from, "dt_to": dt_to}).fetchall()

    return BookingStatsResponse(
        date_from=date_from,
        date_to=date_to,
        summary=BookingStatsSummary(
            completed=summary_row.completed       or 0,
            cancelled=summary_row.cancelled       or 0,
            total=summary_row.total               or 0,
            unique_vehicles=summary_row.unique_vehicles or 0,
        ),
        by_day=[
            BookingStatsByDay(
                date=row.date,
                completed=row.completed       or 0,
                cancelled=row.cancelled       or 0,
                total=row.total               or 0,
                unique_vehicles=row.unique_vehicles or 0,
            )
            for row in day_rows
        ],
    )
```

---

## Registro del router

En el archivo principal donde se incluyen los routers (p. ej. `app/main.py` o `app/api/router.py`):

```python
from app.api.routes.stats import router as stats_router

app.include_router(stats_router, prefix="/api")
# resultado: GET /api/stats/bookings/summary
```

---

## Errores que el endpoint debe retornar

| Código | Cuándo                                      |
|--------|---------------------------------------------|
| 401    | Token inválido o ausente                    |
| 403    | Usuario sin permiso `tools:run`             |
| 422    | `date_to` < `date_from` o params faltantes  |
| 502    | Fallo de conexión a la DB de Autocab        |

Para el 502, envolver la consulta en try/except y relanzar:

```python
from sqlalchemy.exc import OperationalError

try:
    summary_row = db.execute(...)
    day_rows    = db.execute(...)
except OperationalError as e:
    raise HTTPException(status_code=502, detail="Error consultando la base de datos de Autocab")
```

---

## Respuesta de ejemplo

```json
{
  "date_from": "2026-03-01",
  "date_to":   "2026-03-02",
  "summary": {
    "completed":       142,
    "cancelled":        38,
    "total":           180,
    "unique_vehicles":   5
  },
  "by_day": [
    { "date": "2026-03-01", "completed": 80, "cancelled": 20, "total": 100, "unique_vehicles": 4 },
    { "date": "2026-03-02", "completed": 62, "cancelled": 18, "total":  80, "unique_vehicles": 3 }
  ]
}
```
