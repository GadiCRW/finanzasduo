from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import random, string

from models.database import (get_db, Usuario, Familia, Ingreso, Gasto,
                              Deuda, PagoDeuda, MetaAhorro, AbonoAhorro, AporteGasto)
from models.auth import hash_password, verify_password, crear_token, obtener_usuario_actual

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────

class RegistroSchema(BaseModel):
    nombre: str
    email: str
    password: str

class LoginSchema(BaseModel):
    email: str
    password: str

class IngresoSchema(BaseModel):
    descripcion: str
    monto: float
    categoria: str = "Salario"
    quincena: int
    mes: int
    anio: int

class AporteGastoSchema(BaseModel):
    usuario_id: int
    monto: float
    es_sugerido: bool = False

class GastoSchema(BaseModel):
    descripcion: str
    monto: float
    categoria: str = "Otro"
    tipo: str = "personal"
    quincena: int
    mes: int
    anio: int
    aportes: list = []
    deuda_id: Optional[int] = None  # si es pago vinculado a una deuda

class DeudaSchema(BaseModel):
    nombre: str
    monto_original: float
    monto_restante: float
    tasa_anual: float = 0
    cuota_mensual: float = 0
    pago_minimo: float = 0
    tipo: str = "personal"
    proporcional: bool = False
    clase: str = "Otro"

class PagoDeudaSchema(BaseModel):
    monto: float
    nota: str = ""

class MetaSchema(BaseModel):
    nombre: str
    emoji: str = "🎯"
    color: str = "#378ADD"
    meta: float
    actual: float = 0
    tipo: str = "compartido"
    propietario: Optional[str] = None

class AbonoSchema(BaseModel):
    monto: float
    quincena: int = 1
    mes: int = 0
    anio: int = 0

class TemaSchema(BaseModel):
    tema: str

# ── Auth ───────────────────────────────────────────────────

@router.post("/auth/registro")
def registro(data: RegistroSchema, response: Response, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == data.email).first():
        raise HTTPException(400, "El email ya está registrado")
    # Crear familia con código único
    codigo = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    familia = Familia(nombre=f"Familia de {data.nombre}", codigo=codigo)
    db.add(familia)
    db.flush()
    usuario = Usuario(nombre=data.nombre, email=data.email,
                      password=hash_password(data.password), familia_id=familia.id)
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    token = crear_token({"sub": str(usuario.id)})
    response.set_cookie("token", token, httponly=True, max_age=86400*30, samesite="lax")
    return {"ok": True, "usuario": {"id": usuario.id, "nombre": usuario.nombre,
                                     "email": usuario.email, "familia_id": usuario.familia_id,
                                     "codigo_familia": codigo, "tema": usuario.tema}}

@router.post("/auth/login")
def login(data: LoginSchema, response: Response, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == data.email).first()
    if not usuario or not verify_password(data.password, usuario.password):
        raise HTTPException(401, "Email o contraseña incorrectos")
    token = crear_token({"sub": str(usuario.id)})
    response.set_cookie("token", token, httponly=True, max_age=86400*30, samesite="lax")
    familia = db.query(Familia).filter(Familia.id == usuario.familia_id).first()
    return {"ok": True, "usuario": {"id": usuario.id, "nombre": usuario.nombre,
                                     "email": usuario.email, "familia_id": usuario.familia_id,
                                     "codigo_familia": familia.codigo if familia else None,
                                     "tema": usuario.tema}}

@router.post("/auth/unirse")
def unirse_familia(codigo: str, response: Response,
                   usuario: Usuario = Depends(obtener_usuario_actual),
                   db: Session = Depends(get_db)):
    familia = db.query(Familia).filter(Familia.codigo == codigo.upper()).first()
    if not familia:
        raise HTTPException(404, "Código de familia no encontrado")
    usuario.familia_id = familia.id
    db.commit()
    return {"ok": True, "familia_id": familia.id}

@router.get("/auth/yo")
def yo(usuario: Usuario = Depends(obtener_usuario_actual), db: Session = Depends(get_db)):
    familia = db.query(Familia).filter(Familia.id == usuario.familia_id).first()
    # Obtener miembros de la familia
    miembros = db.query(Usuario).filter(Usuario.familia_id == usuario.familia_id).all()
    return {"id": usuario.id, "nombre": usuario.nombre, "email": usuario.email,
            "familia_id": usuario.familia_id, "tema": usuario.tema,
            "codigo_familia": familia.codigo if familia else None,
            "miembros": [{"id": m.id, "nombre": m.nombre} for m in miembros]}

@router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("token")
    return {"ok": True}

@router.patch("/auth/tema")
def cambiar_tema(data: TemaSchema, usuario: Usuario = Depends(obtener_usuario_actual),
                 db: Session = Depends(get_db)):
    usuario.tema = data.tema
    db.commit()
    return {"ok": True}

# ── Ingresos ───────────────────────────────────────────────

@router.get("/ingresos")
def listar_ingresos(mes: int, anio: int,
                    usuario_id: int = None,
                    usuario: Usuario = Depends(obtener_usuario_actual),
                    db: Session = Depends(get_db)):
    q = db.query(Ingreso).filter(
        Ingreso.familia_id == usuario.familia_id,
        Ingreso.mes == mes, Ingreso.anio == anio
    )
    # Si se pide filtrar por usuario específico, solo sus ingresos
    if usuario_id:
        q = q.filter(Ingreso.usuario_id == usuario_id)
    return [_ingreso_dict(i) for i in q.order_by(Ingreso.fecha.desc()).all()]

@router.post("/ingresos")
def crear_ingreso(data: IngresoSchema,
                  usuario: Usuario = Depends(obtener_usuario_actual),
                  db: Session = Depends(get_db)):
    ingreso = Ingreso(**data.dict(), usuario_id=usuario.id, familia_id=usuario.familia_id)
    db.add(ingreso)
    db.commit()
    db.refresh(ingreso)
    return _ingreso_dict(ingreso)

@router.put("/ingresos/{ingreso_id}")
def actualizar_ingreso(ingreso_id: int, data: IngresoSchema,
                       usuario: Usuario = Depends(obtener_usuario_actual),
                       db: Session = Depends(get_db)):
    ingreso = db.query(Ingreso).filter(Ingreso.id == ingreso_id,
                                        Ingreso.usuario_id == usuario.id).first()
    if not ingreso:
        raise HTTPException(404, "Ingreso no encontrado")
    for k, v in data.dict().items():
        setattr(ingreso, k, v)
    db.commit()
    return _ingreso_dict(ingreso)

@router.delete("/ingresos/{ingreso_id}")
def eliminar_ingreso(ingreso_id: int,
                     usuario: Usuario = Depends(obtener_usuario_actual),
                     db: Session = Depends(get_db)):
    ingreso = db.query(Ingreso).filter(Ingreso.id == ingreso_id,
                                        Ingreso.usuario_id == usuario.id).first()
    if not ingreso:
        raise HTTPException(404, "No encontrado")
    db.delete(ingreso)
    db.commit()
    return {"ok": True}

# ── Gastos ─────────────────────────────────────────────────

@router.get("/gastos")
def listar_gastos(mes: int, anio: int,
                  usuario_id: int = None,
                  usuario: Usuario = Depends(obtener_usuario_actual),
                  db: Session = Depends(get_db)):
    from sqlalchemy import or_
    fid = usuario.familia_id

    if usuario_id:
        # Para la pestaña personal: gastos propios + gastos compartidos de toda la familia
        gastos = db.query(Gasto).filter(
            Gasto.familia_id == fid,
            Gasto.mes == mes, Gasto.anio == anio,
            or_(Gasto.usuario_id == usuario_id, Gasto.tipo == 'compartido')
        ).order_by(Gasto.fecha.desc()).all()
    else:
        # Overview: todos los gastos
        gastos = db.query(Gasto).filter(
            Gasto.familia_id == fid,
            Gasto.mes == mes, Gasto.anio == anio
        ).order_by(Gasto.fecha.desc()).all()

    return [_gasto_dict(g, db) for g in gastos]

@router.post("/gastos")
def crear_gasto(data: GastoSchema,
                usuario: Usuario = Depends(obtener_usuario_actual),
                db: Session = Depends(get_db)):
    datos = {k:v for k,v in data.dict().items() if k not in ('aportes',)}
    gasto = Gasto(**datos, usuario_id=usuario.id, familia_id=usuario.familia_id)
    db.add(gasto)
    db.flush()
    if data.tipo == 'compartido' and data.aportes:
        for a in data.aportes:
            db.add(AporteGasto(
                gasto_id=gasto.id, usuario_id=a['usuario_id'],
                familia_id=usuario.familia_id,
                monto=a['monto'], es_sugerido=a.get('es_sugerido', False)
            ))
    # Vinculado a deuda: reducir saldo automáticamente
    if data.deuda_id:
        deuda = db.query(Deuda).filter(
            Deuda.id == data.deuda_id,
            Deuda.familia_id == usuario.familia_id
        ).first()
        if deuda:
            nuevo_saldo = max(0, deuda.monto_restante - data.monto)
            db.add(PagoDeuda(
                deuda_id=deuda.id, monto=data.monto,
                nuevo_saldo=nuevo_saldo,
                nota=f"Pago desde gasto: {data.descripcion}"
            ))
            deuda.monto_restante = nuevo_saldo
            if nuevo_saldo == 0:
                deuda.activa = False
    db.commit()
    db.refresh(gasto)
    return _gasto_dict(gasto, db)

@router.put("/gastos/{gasto_id}")
def actualizar_gasto(gasto_id: int, data: GastoSchema,
                     usuario: Usuario = Depends(obtener_usuario_actual),
                     db: Session = Depends(get_db)):
    gasto = db.query(Gasto).filter(Gasto.id == gasto_id,
                                    Gasto.usuario_id == usuario.id).first()
    if not gasto:
        raise HTTPException(404, "Gasto no encontrado")
    for k, v in data.dict().items():
        if k != 'aportes' and hasattr(gasto, k):
            setattr(gasto, k, v)
    if data.tipo == 'compartido' and data.aportes:
        db.query(AporteGasto).filter(AporteGasto.gasto_id == gasto_id).delete()
        for a in data.aportes:
            db.add(AporteGasto(
                gasto_id=gasto_id, usuario_id=a['usuario_id'],
                familia_id=usuario.familia_id,
                monto=a['monto'], es_sugerido=a.get('es_sugerido', False)
            ))
    db.commit()
    return _gasto_dict(gasto, db)

@router.post("/gastos/{gasto_id}/aportes")
def agregar_aporte_gasto(gasto_id: int, data: AporteGastoSchema,
                          usuario: Usuario = Depends(obtener_usuario_actual),
                          db: Session = Depends(get_db)):
    gasto = db.query(Gasto).filter(Gasto.id == gasto_id,
                                    Gasto.familia_id == usuario.familia_id).first()
    if not gasto:
        raise HTTPException(404, "Gasto no encontrado")
    existing = db.query(AporteGasto).filter(
        AporteGasto.gasto_id == gasto_id,
        AporteGasto.usuario_id == data.usuario_id).first()
    if existing:
        existing.monto = data.monto
        existing.es_sugerido = data.es_sugerido
    else:
        db.add(AporteGasto(
            gasto_id=gasto_id, usuario_id=data.usuario_id,
            familia_id=usuario.familia_id,
            monto=data.monto, es_sugerido=data.es_sugerido))
    db.commit()
    return _gasto_dict(gasto, db)

@router.delete("/gastos/{gasto_id}")
def eliminar_gasto(gasto_id: int,
                   usuario: Usuario = Depends(obtener_usuario_actual),
                   db: Session = Depends(get_db)):
    gasto = db.query(Gasto).filter(Gasto.id == gasto_id,
                                    Gasto.usuario_id == usuario.id).first()
    if not gasto:
        raise HTTPException(404, "No encontrado")
    db.delete(gasto)
    db.commit()
    return {"ok": True}

# ── Deudas ─────────────────────────────────────────────────

@router.get("/deudas")
def listar_deudas(usuario: Usuario = Depends(obtener_usuario_actual),
                  db: Session = Depends(get_db)):
    deudas = db.query(Deuda).filter(
        Deuda.familia_id == usuario.familia_id, Deuda.activa == True
    ).order_by(Deuda.tasa_anual.desc()).all()
    return [_deuda_dict(d, db) for d in deudas]

@router.post("/deudas")
def crear_deuda(data: DeudaSchema,
                usuario: Usuario = Depends(obtener_usuario_actual),
                db: Session = Depends(get_db)):
    datos = data.dict()
    deuda = Deuda(**datos, familia_id=usuario.familia_id,
                  usuario_id=usuario.id if data.tipo == "personal" else None)
    db.add(deuda)
    db.commit()
    db.refresh(deuda)
    return _deuda_dict(deuda, db)

@router.put("/deudas/{deuda_id}")
def editar_deuda(deuda_id: int, data: DeudaSchema,
                 usuario: Usuario = Depends(obtener_usuario_actual),
                 db: Session = Depends(get_db)):
    deuda = db.query(Deuda).filter(Deuda.id == deuda_id,
                                    Deuda.familia_id == usuario.familia_id).first()
    if not deuda:
        raise HTTPException(404, "Deuda no encontrada")
    for k, v in data.dict().items():
        if hasattr(deuda, k):
            setattr(deuda, k, v)
    db.commit()
    return _deuda_dict(deuda, db)

@router.post("/deudas/{deuda_id}/pago")
def registrar_pago(deuda_id: int, data: PagoDeudaSchema,
                   usuario: Usuario = Depends(obtener_usuario_actual),
                   db: Session = Depends(get_db)):
    deuda = db.query(Deuda).filter(Deuda.id == deuda_id,
                                    Deuda.familia_id == usuario.familia_id).first()
    if not deuda:
        raise HTTPException(404, "Deuda no encontrada")
    nuevo_saldo = max(0, deuda.monto_restante - data.monto)
    pago = PagoDeuda(deuda_id=deuda_id, monto=data.monto,
                     nuevo_saldo=nuevo_saldo, nota=data.nota)
    db.add(pago)
    deuda.monto_restante = nuevo_saldo
    if nuevo_saldo == 0:
        deuda.activa = False
    db.commit()
    return _deuda_dict(deuda, db)

@router.delete("/deudas/{deuda_id}")
def eliminar_deuda(deuda_id: int,
                   usuario: Usuario = Depends(obtener_usuario_actual),
                   db: Session = Depends(get_db)):
    deuda = db.query(Deuda).filter(Deuda.id == deuda_id,
                                    Deuda.familia_id == usuario.familia_id).first()
    if not deuda:
        raise HTTPException(404, "No encontrada")
    deuda.activa = False
    db.commit()
    return {"ok": True}

# ── Ahorros ────────────────────────────────────────────────

@router.get("/ahorros")
def listar_ahorros(usuario: Usuario = Depends(obtener_usuario_actual),
                   db: Session = Depends(get_db)):
    metas = db.query(MetaAhorro).filter(
        MetaAhorro.familia_id == usuario.familia_id, MetaAhorro.activa == True
    ).all()
    return [_meta_dict(m, db) for m in metas]

@router.post("/ahorros")
def crear_meta(data: MetaSchema,
               usuario: Usuario = Depends(obtener_usuario_actual),
               db: Session = Depends(get_db)):
    meta = MetaAhorro(**data.dict(), familia_id=usuario.familia_id,
                      usuario_id=usuario.id if data.tipo == "personal" else None)
    db.add(meta)
    db.commit()
    db.refresh(meta)
    return _meta_dict(meta, db)

@router.put("/ahorros/{meta_id}")
def editar_meta(meta_id: int, data: MetaSchema,
                usuario: Usuario = Depends(obtener_usuario_actual),
                db: Session = Depends(get_db)):
    meta = db.query(MetaAhorro).filter(MetaAhorro.id == meta_id,
                                        MetaAhorro.familia_id == usuario.familia_id).first()
    if not meta:
        raise HTTPException(404, "Meta no encontrada")
    meta.nombre = data.nombre
    meta.meta   = data.meta
    meta.actual = data.actual
    meta.tipo   = data.tipo
    meta.propietario = data.propietario
    db.commit()
    return _meta_dict(meta, db)

@router.post("/ahorros/{meta_id}/abono")
def abonar_meta(meta_id: int, data: AbonoSchema,
                usuario: Usuario = Depends(obtener_usuario_actual),
                db: Session = Depends(get_db)):
    from datetime import datetime as dt
    meta = db.query(MetaAhorro).filter(MetaAhorro.id == meta_id,
                                        MetaAhorro.familia_id == usuario.familia_id).first()
    if not meta:
        raise HTTPException(404, "Meta no encontrada")
    nuevo_total = min(meta.meta, meta.actual + data.monto)
    now = dt.utcnow()
    abono = AbonoAhorro(
        meta_id=meta_id, monto=data.monto, nuevo_total=nuevo_total,
        usuario_id=usuario.id,
        mes=data.mes or now.month,
        anio=data.anio or now.year,
        quincena=data.quincena
    )
    db.add(abono)
    meta.actual = nuevo_total
    db.commit()
    return _meta_dict(meta, db)

@router.post("/ahorros/{meta_id}/usar")
def usar_ahorro(meta_id: int, data: AbonoSchema,
                usuario: Usuario = Depends(obtener_usuario_actual),
                db: Session = Depends(get_db)):
    """Registra que se usó una porción del ahorro (reduce el saldo disponible)."""
    meta = db.query(MetaAhorro).filter(MetaAhorro.id == meta_id,
                                        MetaAhorro.familia_id == usuario.familia_id).first()
    if not meta:
        raise HTTPException(404, "Meta no encontrada")
    uso = min(data.monto, meta.actual)  # no puede usar más de lo ahorrado
    meta.utilizado = (meta.utilizado or 0) + uso
    meta.actual    = max(0, meta.actual - uso)
    db.commit()
    return _meta_dict(meta, db)

@router.get("/ahorros/movimientos")
def movimientos_ahorro(mes: int, anio: int,
                        usuario_id: int = None,
                        usuario: Usuario = Depends(obtener_usuario_actual),
                        db: Session = Depends(get_db)):
    """Retorna todos los abonos de ahorro del mes, opcionalmente filtrado por usuario."""
    q = db.query(AbonoAhorro).join(
        MetaAhorro, AbonoAhorro.meta_id == MetaAhorro.id
    ).filter(MetaAhorro.familia_id == usuario.familia_id)
    if usuario_id:
        q = q.filter(AbonoAhorro.usuario_id == usuario_id)
    abonos = q.filter(
        AbonoAhorro.mes == mes, AbonoAhorro.anio == anio
    ).order_by(AbonoAhorro.fecha.desc()).all()
    result = []
    for a in abonos:
        u = db.query(Usuario).filter(Usuario.id == a.usuario_id).first()
        result.append({
            "id": a.id, "meta_id": a.meta_id,
            "meta_nombre": a.meta_ahorro.nombre if a.meta_ahorro else "",
            "monto": a.monto, "quincena": a.quincena or 1,
            "mes": a.mes, "anio": a.anio,
            "usuario_id": a.usuario_id,
            "usuario_nombre": u.nombre if u else "",
            "fecha": a.fecha.isoformat()
        })
    return result

@router.patch("/ahorros/{meta_id}/cumplida")
def marcar_cumplida(meta_id: int,
                    usuario: Usuario = Depends(obtener_usuario_actual),
                    db: Session = Depends(get_db)):
    """Marca la meta como cumplida sin eliminarla — mantiene el historial."""
    meta = db.query(MetaAhorro).filter(MetaAhorro.id == meta_id,
                                        MetaAhorro.familia_id == usuario.familia_id).first()
    if not meta:
        raise HTTPException(404, "No encontrada")
    meta.cumplida = True
    db.commit()
    return _meta_dict(meta, db)

@router.delete("/ahorros/{meta_id}")
def eliminar_meta(meta_id: int,
                  usuario: Usuario = Depends(obtener_usuario_actual),
                  db: Session = Depends(get_db)):
    """Elimina la meta y TODOS sus abonos vinculados."""
    meta = db.query(MetaAhorro).filter(MetaAhorro.id == meta_id,
                                        MetaAhorro.familia_id == usuario.familia_id).first()
    if not meta:
        raise HTTPException(404, "No encontrada")
    # Eliminar todos los abonos vinculados (cascade)
    db.query(AbonoAhorro).filter(AbonoAhorro.meta_id == meta_id).delete()
    # Eliminar la meta completamente (no solo marcar inactiva)
    db.delete(meta)
    db.commit()
    return {"ok": True}

# ── Balance proporcional justo ────────────────────────────

@router.get("/balance-proporcional")
def balance_proporcional(mes: int, anio: int,
                          usuario: Usuario = Depends(obtener_usuario_actual),
                          db: Session = Depends(get_db)):
    fid = usuario.familia_id
    miembros = db.query(Usuario).filter(Usuario.familia_id == fid).all()

    ingresos = db.query(Ingreso).filter(
        Ingreso.familia_id == fid, Ingreso.mes == mes, Ingreso.anio == anio).all()
    gastos = db.query(Gasto).filter(
        Gasto.familia_id == fid, Gasto.mes == mes, Gasto.anio == anio).all()

    total_ing = sum(i.monto for i in ingresos)
    gastos_compartidos = [g for g in gastos if g.tipo == 'compartido']
    total_compartido = sum(g.monto for g in gastos_compartidos)

    resultado = {}
    for m in miembros:
        ing_m = sum(i.monto for i in ingresos if i.usuario_id == m.id)
        # Porcentaje proporcional según ingresos
        pct_ing = ing_m / total_ing if total_ing > 0 else 1/len(miembros)
        # Lo que debería aportar según ingresos
        debe_aportar = total_compartido * pct_ing
        # Lo que ya aportó (gastos compartidos que él registró)
        ya_aporto = sum(g.monto for g in gastos_compartidos if g.usuario_id == m.id)
        # Balance: positivo = pagó de más, negativo = debe pagar
        balance = ya_aporto - debe_aportar

        resultado[m.id] = {
            "nombre": m.nombre,
            "ingreso": ing_m,
            "pct_ingreso": round(pct_ing * 100, 1),
            "debe_aportar": round(debe_aportar, 0),
            "ya_aporto": round(ya_aporto, 0),
            "balance": round(balance, 0),
            "pendiente": round(max(0, debe_aportar - ya_aporto), 0),
            "pagó_extra": round(max(0, ya_aporto - debe_aportar), 0),
        }

    # Para cada gasto compartido, calcular aporte sugerido por miembro
    gastos_con_sugerencia = []
    for g in gastos_compartidos:
        aportes = {}
        for m in miembros:
            ing_m = sum(i.monto for i in ingresos if i.usuario_id == m.id)
            pct = ing_m / total_ing if total_ing > 0 else 1/len(miembros)
            aportes[m.id] = {
                "nombre": m.nombre,
                "sugerido": round(g.monto * pct, 0),
                "pct": round(pct * 100, 1)
            }
        gd = _gasto_dict(g)
        gd["aportes_sugeridos"] = aportes
        gastos_con_sugerencia.append(gd)

    return {
        "por_miembro": resultado,
        "total_compartido": total_compartido,
        "gastos_compartidos": gastos_con_sugerencia,
    }

# ── Resumen overview ───────────────────────────────────────

@router.get("/resumen")
def resumen(mes: int, anio: int,
            usuario: Usuario = Depends(obtener_usuario_actual),
            db: Session = Depends(get_db)):
    fid = usuario.familia_id
    miembros = db.query(Usuario).filter(Usuario.familia_id == fid).all()

    ingresos = db.query(Ingreso).filter(Ingreso.familia_id == fid,
                                         Ingreso.mes == mes, Ingreso.anio == anio).all()
    gastos = db.query(Gasto).filter(Gasto.familia_id == fid,
                                     Gasto.mes == mes, Gasto.anio == anio).all()
    deudas = db.query(Deuda).filter(Deuda.familia_id == fid, Deuda.activa == True).all()
    metas = db.query(MetaAhorro).filter(MetaAhorro.familia_id == fid,
                                         MetaAhorro.activa == True).all()

    total_ing = sum(i.monto for i in ingresos)
    total_gas = sum(g.monto for g in gastos)
    total_deu = sum(d.monto_restante for d in deudas)
    total_aho = sum(m.actual for m in metas)

    # Proporcional por quincena
    prop = {}
    for m in miembros:
        ing_m = sum(i.monto for i in ingresos if i.usuario_id == m.id)
        prop[m.id] = {"nombre": m.nombre, "ingreso": ing_m,
                      "pct": round(ing_m / total_ing * 100, 1) if total_ing > 0 else 0}

    return {
        "total_ingresos": total_ing, "total_gastos": total_gas,
        "total_deudas": total_deu, "total_ahorros": total_aho,
        "balance": total_ing - total_gas,
        "proporcional": prop,
        "miembros": [{"id": m.id, "nombre": m.nombre} for m in miembros]
    }

# ── Helpers ────────────────────────────────────────────────

def _ingreso_dict(i: Ingreso):
    return {"id": i.id, "descripcion": i.descripcion, "monto": i.monto,
            "categoria": i.categoria, "quincena": i.quincena, "mes": i.mes,
            "anio": i.anio, "usuario_id": i.usuario_id,
            "usuario_nombre": i.usuario.nombre if i.usuario else "",
            "fecha": i.fecha.isoformat()}

def _gasto_dict(g: Gasto, db=None):
    aportes = []
    if db:
        aps = db.query(AporteGasto).filter(AporteGasto.gasto_id == g.id).all()
        for a in aps:
            u = db.query(Usuario).filter(Usuario.id == a.usuario_id).first()
            aportes.append({
                "id": a.id, "usuario_id": a.usuario_id,
                "nombre": u.nombre if u else "", "monto": a.monto,
                "es_sugerido": a.es_sugerido,
                "fecha": a.fecha.isoformat()
            })
    return {"id": g.id, "descripcion": g.descripcion, "monto": g.monto,
            "categoria": g.categoria, "tipo": g.tipo, "quincena": g.quincena,
            "mes": g.mes, "anio": g.anio, "usuario_id": g.usuario_id,
            "usuario_nombre": g.usuario.nombre if g.usuario else "",
            "fecha": g.fecha.isoformat(), "aportes": aportes}

def _deuda_dict(d: Deuda, db):
    pagos = db.query(PagoDeuda).filter(PagoDeuda.deuda_id == d.id).order_by(PagoDeuda.fecha).all()
    return {"id": d.id, "nombre": d.nombre, "monto_original": d.monto_original,
            "monto_restante": d.monto_restante, "tasa_anual": d.tasa_anual,
            "cuota_mensual": d.cuota_mensual, "pago_minimo": d.pago_minimo,
            "tipo": d.tipo, "proporcional": d.proporcional, "activa": d.activa,
            "clase": d.clase or "Otro", "usuario_id": d.usuario_id,
            "pagos": [{"monto": p.monto, "nuevo_saldo": p.nuevo_saldo,
                       "fecha": p.fecha.isoformat()} for p in pagos]}

def _meta_dict(m: MetaAhorro, db):
    abonos = db.query(AbonoAhorro).filter(AbonoAhorro.meta_id == m.id).order_by(AbonoAhorro.fecha).all()
    return {"id": m.id, "nombre": m.nombre, "emoji": m.emoji, "color": m.color,
            "meta": m.meta, "actual": m.actual, "utilizado": m.utilizado or 0,
            "cumplida": m.cumplida or False,
            "tipo": m.tipo, "propietario": m.propietario, "activa": m.activa,
            "abonos": [{"monto": a.monto, "nuevo_total": a.nuevo_total,
                        "fecha": a.fecha.isoformat()} for a in abonos]}

# ── Métricas detalladas ────────────────────────────────────

@router.get("/metricas")
def metricas(mes: int, anio: int,
             usuario: Usuario = Depends(obtener_usuario_actual),
             db: Session = Depends(get_db)):
    fid = usuario.familia_id
    miembros = db.query(Usuario).filter(Usuario.familia_id == fid).all()

    # Datos del mes actual
    ingresos = db.query(Ingreso).filter(Ingreso.familia_id == fid,
                                         Ingreso.mes == mes, Ingreso.anio == anio).all()
    gastos   = db.query(Gasto).filter(Gasto.familia_id == fid,
                                       Gasto.mes == mes, Gasto.anio == anio).all()
    deudas   = db.query(Deuda).filter(Deuda.familia_id == fid, Deuda.activa == True).all()
    metas    = db.query(MetaAhorro).filter(MetaAhorro.familia_id == fid, MetaAhorro.activa == True).all()

    # Gastos por categoría
    cats = {}
    for g in gastos:
        cats[g.categoria] = cats.get(g.categoria, 0) + g.monto

    # Gastos por tipo (compartido vs personal)
    tipo_gas = {"compartido": 0, "personal": 0}
    for g in gastos:
        tipo_gas[g.tipo] = tipo_gas.get(g.tipo, 0) + g.monto

    # Ingresos y gastos por quincena
    q_data = {}
    for q in [1, 2]:
        q_data[q] = {
            "ingresos": sum(i.monto for i in ingresos if i.quincena == q),
            "gastos":   sum(g.monto for g in gastos   if g.quincena == q),
        }

    # Por miembro
    por_miembro = {}
    total_ing = sum(i.monto for i in ingresos)
    for m in miembros:
        ing_m = sum(i.monto for i in ingresos if i.usuario_id == m.id)
        gas_m = sum(g.monto for g in gastos   if g.usuario_id == m.id)
        por_miembro[m.id] = {
            "nombre": m.nombre,
            "ingresos": ing_m,
            "gastos": gas_m,
            "pct_ingreso": round(ing_m / total_ing * 100, 1) if total_ing > 0 else 0,
        }

    # Últimos 6 meses (tendencia)
    tendencia = []
    for i in range(5, -1, -1):
        m_idx = mes - i
        a_idx = anio
        while m_idx <= 0:
            m_idx += 12; a_idx -= 1
        ing_m = db.query(func.sum(Ingreso.monto)).filter(
            Ingreso.familia_id == fid, Ingreso.mes == m_idx, Ingreso.anio == a_idx).scalar() or 0
        gas_m = db.query(func.sum(Gasto.monto)).filter(
            Gasto.familia_id == fid, Gasto.mes == m_idx, Gasto.anio == a_idx).scalar() or 0
        tendencia.append({"mes": f"{m_idx}/{a_idx}", "ingresos": ing_m, "gastos": gas_m, "ahorro": ing_m - gas_m})

    # Deudas por clase
    deu_clase = {}
    for d in deudas:
        c = d.clase or "Otro"
        deu_clase[c] = deu_clase.get(c, 0) + d.monto_restante

    # Ahorros progreso
    ahorros_prog = [{"nombre": m.nombre, "actual": m.actual, "meta": m.meta,
                     "pct": round(m.actual/m.meta*100, 1) if m.meta > 0 else 0,
                     "tipo": m.tipo} for m in metas]

    # Ahorros: usar saldo actual de metas como fuente de verdad
    # Si hay abonos, usamos el acumulado; si no (ingresado manualmente), usamos meta.actual
    todos_abonos = db.query(AbonoAhorro).join(
        MetaAhorro, AbonoAhorro.meta_id == MetaAhorro.id
    ).filter(MetaAhorro.familia_id == fid).all()

    saldo_total_real = sum(m.actual for m in metas)

    ahorros_por_mes = {}
    for t in tendencia:
        m_str = t["mes"]
        m_idx, a_idx = map(int, m_str.split('/'))
        es_mes_actual = (m_idx == mes and a_idx == anio)
        abonos_acum = sum(
            a.monto for a in todos_abonos
            if (a.fecha.year < a_idx) or (a.fecha.year == a_idx and a.fecha.month <= m_idx)
        )
        # Para el mes actual: usar el saldo real (más preciso que solo abonos)
        ahorros_por_mes[m_str] = saldo_total_real if es_mes_actual else abonos_acum

    return {
        "gastos_por_categoria": cats,
        "gastos_por_tipo": tipo_gas,
        "quincenas": q_data,
        "por_miembro": por_miembro,
        "tendencia_6m": tendencia,
        "deudas_por_clase": deu_clase,
        "ahorros": ahorros_prog,
        "ahorros_por_mes": ahorros_por_mes,
        "totales": {
            "ingresos": sum(i.monto for i in ingresos),
            "gastos": sum(g.monto for g in gastos),
            "deudas": sum(d.monto_restante for d in deudas),
            "ahorros": sum(m.actual for m in metas),
        }
    }

# ── Gemini API Key compartida por familia ─────────────────

class GeminiKeySchema(BaseModel):
    gemini_key: str

@router.post("/familia/gemini-key")
def guardar_gemini_key(data: GeminiKeySchema,
                       usuario: Usuario = Depends(obtener_usuario_actual),
                       db: Session = Depends(get_db)):
    familia = db.query(Familia).filter(Familia.id == usuario.familia_id).first()
    if not familia:
        raise HTTPException(404, "Familia no encontrada")
    familia.gemini_key = data.gemini_key
    db.commit()
    return {"ok": True}

@router.get("/familia/gemini-key")
def obtener_gemini_key(usuario: Usuario = Depends(obtener_usuario_actual),
                       db: Session = Depends(get_db)):
    familia = db.query(Familia).filter(Familia.id == usuario.familia_id).first()
    if not familia:
        raise HTTPException(404, "Familia no encontrada")
    return {"gemini_key": familia.gemini_key or ""}
