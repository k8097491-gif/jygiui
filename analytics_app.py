import hmac
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Header, HTTPException, Query
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
from analytics_logic import scope_for, shape_summary

load_dotenv()
DATABASE_URL = os.environ.get("POSTGRES_URL")
SERVICE_TOKEN = os.environ.get("ANALYTICS_TOKEN", "")

def open_database():
    return psycopg.connect(DATABASE_URL, connect_timeout=3, row_factory=dict_row) if DATABASE_URL else psycopg.connect("", connect_timeout=3, row_factory=dict_row)

@asynccontextmanager
async def lifespan(app):
    if not DATABASE_URL and not os.environ.get("PGHOST"):
        raise RuntimeError("PostgreSQL connection settings are required.")
    yield

app = FastAPI(title="Campus Helpdesk Analytics", version="1.0.0", lifespan=lifespan)

@app.get("/health")
def health():
    if not DATABASE_URL and not os.environ.get("PGHOST"):
        raise HTTPException(status_code=503, detail="Database configuration is missing.")
    try:
        with open_database() as connection:
            connection.execute("SET TRANSACTION READ ONLY")
            connection.execute("SELECT 1")
        return {"status": "ok", "database": "connected"}
    except Exception as error:
        raise HTTPException(status_code=503, detail="Analytics database is unavailable.") from error

@app.get("/summary")
def summary(
    userId: str = Query(min_length=36, max_length=36),
    role: str = Query(pattern="^(requester|specialist|dispatcher|manager|admin)$"),
    x_internal_token: str = Header(default="", alias="x-internal-token"),
):
    if not SERVICE_TOKEN or not hmac.compare_digest(x_internal_token, SERVICE_TOKEN):
        raise HTTPException(status_code=401, detail="Internal service token is invalid.")
    predicate, params = scope_for(userId, role)
    sql = (
        "SELECT count(*) AS total, "
        "count(*) FILTER (WHERE status NOT IN ('Closed','Resolved')) AS open, "
        "count(*) FILTER (WHERE status NOT IN ('Closed','Resolved') AND due_at < now()) AS overdue, "
        "round(avg(rating)::numeric,1) AS average_rating "
        "FROM tickets WHERE deleted_at IS NULL AND " + predicate
    )
    with open_database() as connection:
        connection.execute("SET TRANSACTION READ ONLY")
        totals = connection.execute(sql, params).fetchone()
        categories = connection.execute(
            "SELECT category AS name,count(*) AS count FROM tickets WHERE deleted_at IS NULL AND " + predicate + " GROUP BY category ORDER BY count DESC,name LIMIT 6",
            params,
        ).fetchall()
    return shape_summary(totals, categories)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8001")))
