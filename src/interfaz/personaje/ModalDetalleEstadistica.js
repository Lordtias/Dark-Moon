import { traducir } from "../idiomas/ContextoIdioma.js";

const TIPOS_FILA = new Set(["base", "atributo", "bonificacion", "penalizacion", "multiplicador", "limite", "informacion"]);

// Presenta un desglose ya resuelto por rutas canónicas. No calcula estadísticas.
export class ModalDetalleEstadistica {
  constructor({ documento = document } = {}) {
    this.documento = documento;
    this.abierto = false;
    this.manejarTecla = this.manejarTecla.bind(this);
    this.crearEstructura();
  }
  crearEstructura() {
    this.capa = this.documento.createElement("div");
    this.capa.className = "modal-estadistica";
    this.capa.hidden = true;
    this.capa.addEventListener("click", (event) => {
      if (event.target === this.capa || event.target.closest("[data-cerrar-estadistica]")) this.cerrar();
    });
    this.dialogo = this.documento.createElement("section");
    this.dialogo.className = "modal-estadistica__dialogo";
    this.dialogo.setAttribute("role", "dialog");
    this.dialogo.setAttribute("aria-modal", "true");
    const cabecera = this.documento.createElement("header");
    cabecera.className = "modal-estadistica__cabecera";
    this.icono = this.documento.createElement("span"); this.icono.className = "modal-estadistica__icono";
    this.titulo = this.documento.createElement("h3"); this.titulo.className = "modal-estadistica__titulo";
    this.botonCerrar = this.documento.createElement("button"); this.botonCerrar.type = "button";
    this.botonCerrar.dataset.cerrarEstadistica = "true"; this.botonCerrar.className = "modal-estadistica__cerrar"; this.botonCerrar.textContent = "×";
    this.botonCerrar.setAttribute("aria-label", traducir("interfaz.personaje.cerrarDetalle", { respaldo: "Cerrar detalle" }));
    cabecera.append(this.icono, this.titulo, this.botonCerrar);
    this.descripcion = this.documento.createElement("p");
    this.descripcion.className = "modal-estadistica__descripcion";
    this.resumen = this.documento.createElement("div"); this.resumen.className = "modal-estadistica__resumen";
    const etiquetaFinal = this.documento.createElement("span"); etiquetaFinal.textContent = traducir("interfaz.personaje.valorFinal", { respaldo: "Valor final" });
    this.valorFinal = this.documento.createElement("strong"); this.resumen.append(etiquetaFinal, this.valorFinal);
    this.secciones = this.documento.createElement("div");
    this.secciones.className = "modal-estadistica__secciones";
    this.nota = this.documento.createElement("p"); this.nota.className = "modal-estadistica__nota";
    this.dialogo.append(cabecera, this.descripcion, this.resumen, this.secciones, this.nota); this.capa.append(this.dialogo); this.documento.body.append(this.capa);
  }
  abrir({ titulo, icono = "◇", valorFinal, descripcion = "", filas = [], secciones = null, nota = "" } = {}) {
    this.titulo.textContent = String(titulo ?? ""); this.icono.textContent = String(icono ?? "◇"); this.valorFinal.textContent = String(valorFinal ?? "—");
    this.descripcion.textContent = String(descripcion ?? ""); this.descripcion.hidden = this.descripcion.textContent.trim() === "";
    this.secciones.replaceChildren();
    const seccionesValidas = normalizarSecciones({ secciones, filas });
    for (const seccion of seccionesValidas) this.secciones.append(this.crearSeccion(seccion));
    this.nota.textContent = String(nota ?? ""); this.nota.hidden = this.nota.textContent.trim() === ""; this.capa.hidden = false; this.abierto = true; this.documento.addEventListener("keydown", this.manejarTecla); this.botonCerrar.focus(); return true;
  }
  crearSeccion({ etiqueta, filas = [] } = {}) {
    const seccion = this.documento.createElement("section");
    seccion.className = "modal-estadistica__seccion";
    const subtitulo = this.documento.createElement("h4");
    subtitulo.className = "modal-estadistica__subtitulo";
    subtitulo.textContent = String(etiqueta ?? traducir("interfaz.personaje.desglose", { respaldo: "Desglose" }));
    const lista = this.documento.createElement("div");
    lista.className = "modal-estadistica__lista";
    const validas = Array.isArray(filas) ? filas : [];
    for (const fila of validas) lista.append(this.crearFila(fila));
    if (validas.length === 0) {
      const vacio = this.documento.createElement("p");
      vacio.className = "modal-estadistica__vacio";
      vacio.textContent = traducir("interfaz.personaje.sinDesglose", { respaldo: "No hay un desglose adicional para este valor." });
      lista.append(vacio);
    }
    seccion.append(subtitulo, lista);
    return seccion;
  }
  crearFila(fila = {}) {
    const tipo = TIPOS_FILA.has(fila.tipo) ? fila.tipo : "informacion"; const e = this.documento.createElement("div"); e.className = `modal-estadistica__fila modal-estadistica__fila--${tipo}`;
    const i = this.documento.createElement("span"); i.className = "modal-estadistica__fila-icono"; i.textContent = fila.icono ?? ({base:"◇",atributo:"◆",bonificacion:"+",penalizacion:"−",multiplicador:"%",limite:"⌁",informacion:"•"}[tipo] ?? "•");
    const l = this.documento.createElement("span"); l.className = "modal-estadistica__fila-etiqueta"; l.textContent = String(fila.etiqueta ?? "");
    const v = this.documento.createElement("strong"); v.className = "modal-estadistica__fila-valor"; v.textContent = String(fila.valor ?? "—"); e.append(i,l,v); return e;
  }
  manejarTecla(event) { if (event.key === "Escape") this.cerrar(); }
  cerrar() { if (!this.abierto) return false; this.abierto = false; this.capa.hidden = true; this.documento.removeEventListener("keydown", this.manejarTecla); return true; }
  destruir() { this.cerrar(); this.capa.remove(); }
}

function normalizarSecciones({ secciones, filas }) {
  if (Array.isArray(secciones) && secciones.length > 0) {
    return secciones.map((seccion) => ({
      etiqueta: seccion?.etiqueta,
      filas: Array.isArray(seccion?.filas) ? seccion.filas : [],
    }));
  }
  return [{
    etiqueta: traducir("interfaz.personaje.desglose", { respaldo: "Desglose" }),
    filas: Array.isArray(filas) ? filas : [],
  }];
}
