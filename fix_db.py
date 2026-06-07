from models.database import engine
import sqlalchemy as sa

migraciones = [
    "ALTER TABLE deudas ADD COLUMN clase VARCHAR DEFAULT 'Otro'",
    "ALTER TABLE familias ADD COLUMN gemini_key VARCHAR",
    """CREATE TABLE IF NOT EXISTS aportes_gasto (
        id INTEGER PRIMARY KEY,
        gasto_id INTEGER REFERENCES gastos(id),
        usuario_id INTEGER REFERENCES usuarios(id),
        familia_id INTEGER NOT NULL,
        monto FLOAT NOT NULL,
        es_sugerido BOOLEAN DEFAULT 1,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",
    "ALTER TABLE metas_ahorro ADD COLUMN utilizado FLOAT DEFAULT 0",
    "ALTER TABLE abonos_ahorro ADD COLUMN usuario_id INTEGER",
    "ALTER TABLE abonos_ahorro ADD COLUMN mes INTEGER",
    "ALTER TABLE abonos_ahorro ADD COLUMN anio INTEGER",
    "ALTER TABLE abonos_ahorro ADD COLUMN quincena INTEGER DEFAULT 1",
]

with engine.connect() as conn:
    for sql in migraciones:
        try:
            conn.execute(sa.text(sql))
            conn.commit()
            print(f"OK: {sql[:55].strip()}...")
        except Exception as e:
            print(f"Ya existe: {str(e)[:60]}")

print("Migracion completa")

# Agregar columna deuda_id a gastos si no existe
with engine.connect() as conn:
    for sql in [
        "ALTER TABLE gastos ADD COLUMN deuda_id INTEGER",
    ]:
        try:
            conn.execute(sa.text(sql))
            conn.commit()
            print(f"OK: {sql}")
        except Exception as e:
            print(f"Ya existe: {str(e)[:50]}")

# Nuevas columnas
with engine.connect() as conn:
    for sql in [
        "ALTER TABLE metas_ahorro ADD COLUMN cumplida BOOLEAN DEFAULT 0",
    ]:
        try:
            conn.execute(sa.text(sql))
            conn.commit()
            print(f"OK: {sql}")
        except Exception as e:
            print(f"Ya existe: {str(e)[:50]}")
