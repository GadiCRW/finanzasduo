from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./finanzasduo.db")

# Railway a veces usa postgres:// en lugar de postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ── Modelos ────────────────────────────────────────────────

class Usuario(Base):
    __tablename__ = "usuarios"
    id         = Column(Integer, primary_key=True, index=True)
    nombre     = Column(String, nullable=False)
    email      = Column(String, unique=True, index=True, nullable=False)
    password   = Column(String, nullable=False)
    familia_id = Column(Integer, ForeignKey("familias.id"), nullable=True)
    tema       = Column(String, default="light")
    creado_en  = Column(DateTime, default=datetime.utcnow)

    ingresos   = relationship("Ingreso", back_populates="usuario")
    gastos     = relationship("Gasto", back_populates="usuario")

class Familia(Base):
    __tablename__ = "familias"
    id        = Column(Integer, primary_key=True, index=True)
    nombre    = Column(String, default="Mi Familia")
    codigo    = Column(String, unique=True, index=True)
    gemini_key = Column(String, nullable=True)
    creado_en = Column(DateTime, default=datetime.utcnow)

class Ingreso(Base):
    __tablename__ = "ingresos"
    id          = Column(Integer, primary_key=True, index=True)
    usuario_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    familia_id  = Column(Integer, nullable=False)
    descripcion = Column(String, nullable=False)
    monto       = Column(Float, nullable=False)
    categoria   = Column(String, default="Salario")
    quincena    = Column(Integer, nullable=False)  # 1 o 2
    mes         = Column(Integer, nullable=False)
    anio        = Column(Integer, nullable=False)
    fecha       = Column(DateTime, default=datetime.utcnow)
    creado_en   = Column(DateTime, default=datetime.utcnow)

    usuario     = relationship("Usuario", back_populates="ingresos")

class AporteGasto(Base):
    """Aporte manual de cada persona a un gasto compartido."""
    __tablename__ = "aportes_gasto"
    id          = Column(Integer, primary_key=True, index=True)
    gasto_id    = Column(Integer, ForeignKey("gastos.id"), nullable=False)
    usuario_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    familia_id  = Column(Integer, nullable=False)
    monto       = Column(Float, nullable=False)
    es_sugerido = Column(Boolean, default=True)  # True=automático, False=manual
    fecha       = Column(DateTime, default=datetime.utcnow)

class Gasto(Base):
    __tablename__ = "gastos"
    id                = Column(Integer, primary_key=True, index=True)
    usuario_id        = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    familia_id        = Column(Integer, nullable=False)
    descripcion       = Column(String, nullable=False)
    monto             = Column(Float, nullable=False)
    categoria         = Column(String, default="Otro")
    tipo              = Column(String, default="personal")  # personal | compartido
    deuda_id          = Column(Integer, nullable=True)       # si es pago de deuda
    quincena          = Column(Integer, nullable=False)
    mes               = Column(Integer, nullable=False)
    anio              = Column(Integer, nullable=False)
    fecha             = Column(DateTime, default=datetime.utcnow)
    creado_en         = Column(DateTime, default=datetime.utcnow)

    usuario           = relationship("Usuario", back_populates="gastos")
    aportes           = relationship("AporteGasto", backref="gasto", cascade="all, delete-orphan")

class Deuda(Base):
    __tablename__ = "deudas"
    id              = Column(Integer, primary_key=True, index=True)
    familia_id      = Column(Integer, nullable=False)
    usuario_id      = Column(Integer, nullable=True)   # null = compartida
    nombre          = Column(String, nullable=False)
    monto_original  = Column(Float, nullable=False)
    monto_restante  = Column(Float, nullable=False)
    tasa_anual      = Column(Float, nullable=False)
    cuota_mensual   = Column(Float, nullable=False)
    pago_minimo     = Column(Float, nullable=False)
    tipo            = Column(String, default="personal")  # personal | compartida
    proporcional    = Column(Boolean, default=False)
    clase           = Column(String, default="Otro")
    activa          = Column(Boolean, default=True)
    creado_en       = Column(DateTime, default=datetime.utcnow)

    pagos           = relationship("PagoDeuda", back_populates="deuda")

class PagoDeuda(Base):
    __tablename__ = "pagos_deuda"
    id             = Column(Integer, primary_key=True, index=True)
    deuda_id       = Column(Integer, ForeignKey("deudas.id"), nullable=False)
    monto          = Column(Float, nullable=False)
    nuevo_saldo    = Column(Float, nullable=False)
    nota           = Column(String, default="")
    fecha          = Column(DateTime, default=datetime.utcnow)

    deuda          = relationship("Deuda", back_populates="pagos")

class MetaAhorro(Base):
    __tablename__ = "metas_ahorro"
    id           = Column(Integer, primary_key=True, index=True)
    familia_id   = Column(Integer, nullable=False)
    usuario_id   = Column(Integer, nullable=True)  # null = compartida
    nombre       = Column(String, nullable=False)
    emoji        = Column(String, default="🎯")
    color        = Column(String, default="#378ADD")
    meta         = Column(Float, nullable=False)
    actual       = Column(Float, default=0)
    utilizado    = Column(Float, default=0)
    cumplida     = Column(Boolean, default=False)  # meta marcada como completada
    tipo         = Column(String, default="compartido")  # compartido | personal
    propietario  = Column(String, nullable=True)
    activa       = Column(Boolean, default=True)
    creado_en    = Column(DateTime, default=datetime.utcnow)

    abonos       = relationship("AbonoAhorro", back_populates="meta_ahorro")

class AbonoAhorro(Base):
    __tablename__ = "abonos_ahorro"
    id           = Column(Integer, primary_key=True, index=True)
    meta_id      = Column(Integer, ForeignKey("metas_ahorro.id"), nullable=False)
    usuario_id   = Column(Integer, nullable=True)   # quién hizo el abono
    monto        = Column(Float, nullable=False)
    nuevo_total  = Column(Float, nullable=False)
    mes          = Column(Integer, nullable=True)
    anio         = Column(Integer, nullable=True)
    quincena     = Column(Integer, nullable=True)
    fecha        = Column(DateTime, default=datetime.utcnow)

    meta_ahorro  = relationship("MetaAhorro", back_populates="abonos")

def crear_tablas():
    Base.metadata.create_all(bind=engine)
