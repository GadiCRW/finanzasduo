from fastapi import FastAPI, Request, Depends, Cookie
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from models.database import crear_tablas, get_db, Usuario
from models.auth import obtener_usuario_actual
from routes.api import router
from jose import JWTError, jwt
import os

SECRET_KEY = os.getenv("SECRET_KEY", "finanzasduo-secret-key-cambiar-en-produccion")
ALGORITHM  = "HS256"

app = FastAPI(title="FinanzasDúo")

crear_tablas()

import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory="templates")

app.include_router(router, prefix="/api")

def _usuario_desde_cookie(token: str = Cookie(default=None),
                           db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = int(payload.get("sub"))
        return db.query(Usuario).filter(Usuario.id == uid).first()
    except Exception:
        return None

def render(templates, name, request, extra={}):
    """Compatible con todas las versiones de Starlette/Jinja2."""
    context = {"request": request}
    context.update(extra)
    return templates.TemplateResponse(name, context)

@app.get("/", response_class=HTMLResponse)
def index(request: Request, usuario=Depends(_usuario_desde_cookie)):
    if not usuario:
        return RedirectResponse("/login")
    return render(templates, "app.html", request, {"usuario": usuario})

@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request, usuario=Depends(_usuario_desde_cookie)):
    if usuario:
        return RedirectResponse("/")
    return render(templates, "login.html", request)

@app.get("/registro", response_class=HTMLResponse)
def registro_page(request: Request, usuario=Depends(_usuario_desde_cookie)):
    if usuario:
        return RedirectResponse("/")
    return render(templates, "registro.html", request)

@app.get("/{path:path}", response_class=HTMLResponse)
def spa(request: Request, path: str, usuario=Depends(_usuario_desde_cookie)):
    if not usuario:
        return RedirectResponse("/login")
    return render(templates, "app.html", request, {"usuario": usuario})

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
