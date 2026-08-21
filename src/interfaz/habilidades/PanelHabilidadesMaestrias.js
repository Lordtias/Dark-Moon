import { asegurarHojaEstilos, crearElemento } from "../dom/UtilidadesDom.js";
import { traducir, traducirContenido } from "../idiomas/ContextoIdioma.js";
import { OrganizadorArbolHabilidades } from "./OrganizadorArbolHabilidades.js";
import { clasificarPresentacionHabilidad } from "./ClasificadorPresentacionHabilidades.js";
import { crearConfiguracionHabilidadEfectiva } from "../../juego/habilidades/ConfiguracionHabilidadEfectiva.js";
import {
  TIPOS_RELACION_ARBOL_HABILIDADES,
} from "../../juego/habilidades/ContratosArbolHabilidades.js";
import {
  FORMAS_VISUALES_DESPLAZAMIENTO_TACTICO,
} from "../../juego/movimiento/ResolutorDesplazamientoTactico.js";
import {
  TIPOS_EVENTO_ESTADO_TACTICO,
} from "../../juego/estado/EstadosTacticosCombatiente.js";

export class PanelHabilidadesMaestrias {
  constructor({
    sistemaHabilidades,
    jugador,
    configuracionProgreso,
    configuracionEjecucion,
    alGuardarCambios = null,
    alSolicitarCierre = null,
  } = {}) {
    if (!sistemaHabilidades || !jugador || !configuracionProgreso) {
      throw new Error(
        "Faltan dependencias para construir el panel de habilidades.",
      );
    }
    this.sistema = sistemaHabilidades;
    this.jugador = jugador;
    this.configuracionProgreso = configuracionProgreso;
    this.configuracionEjecucion = configuracionEjecucion;
    this.alGuardarCambios = alGuardarCambios;
    this.alSolicitarCierre =
      typeof alSolicitarCierre === "function" ? alSolicitarCierre : null;
    const categorias = obtenerCategoriasOrdenadas(this.configuracionProgreso);
    if (categorias.length === 0) {
      throw new Error("La configuración no contiene categorías de habilidades.");
    }
    this.categoriaActiva = categorias[0].id;
    this.maestriaActiva = null;
    this.idHabilidadSeleccionada = null;
    this.organizadorArbol = new OrganizadorArbolHabilidades();
    this.manejadores = [];
    this.observadoresArbol = [];
    asegurarHojaEstilos({ id: "estilosHabilidadesMaestrias", ruta: "./assets/estilos/paneles/habilidades-maestrias.css" });
    this.dialogo = this.crearDialogo();
    this.renderizar();
  }
  estaAbierto() {
    return Boolean(this.dialogo?.open);
  }

  abrir() {
    this.renderizar();
    if (!this.dialogo.open) {
      this.dialogo.showModal();
    }
    this.dialogo.focus();
  }
  cerrar() {
    this.cerrarCapaAccion();
    if (this.dialogo.open) {
      this.dialogo.close();
    }
  }

  solicitarCierre() {
    if (this.alSolicitarCierre) {
      this.alSolicitarCierre();
      return;
    }
    this.cerrar();
  }

  manejarEscape() {
    if (!this.capaAccion.hidden) {
      this.cerrarCapaAccion();
      return true;
    }
    return false;
  }
  renderizar() {
    const detalleAbierto =
      !this.capaAccion.hidden &&
      Boolean(this.capaAccion.querySelector(".confirmacion-habilidad--detalle")) &&
      Boolean(this.idHabilidadSeleccionada);
    const resumen = obtenerResumenProgreso(this.jugador);
    this.asegurarSeleccionValida(resumen);
    this.renderizarCabecera(resumen);
    this.renderizarNavegacion();
    this.liberarObservadoresArbol();
    this.contenido.replaceChildren();
    this.renderizarCategoria(resumen);
    if (detalleAbierto && resumen.habilidades[this.idHabilidadSeleccionada]) {
      queueMicrotask(() => this.abrirDetalleHabilidad(this.idHabilidadSeleccionada));
    }
  }
  mostrarMensaje(texto, tipo = "informacion") {
    this.mensaje.textContent = texto;
    this.mensaje.dataset.tipo = tipo;
  }
  destruir() {
    this.manejadores.forEach(({ elemento, tipo, manejador, opciones }) => {
      elemento.removeEventListener(tipo, manejador, opciones);
    });
    this.manejadores = [];
    this.liberarObservadoresArbol();
    this.dialogo?.remove();
  }
  crearDialogo() {
    document.getElementById("modalHabilidadesMaestrias")?.remove();
    const dialogo = crearElemento("dialog", "modal-habilidades-maestrias");
    dialogo.id = "modalHabilidadesMaestrias";
    dialogo.setAttribute("aria-labelledby", "tituloHabilidadesMaestrias");
    const marco = crearElemento("div", "panel-habilidades");
    const cabecera = crearElemento("header", "panel-habilidades__cabecera");
    const tituloBloque = crearElemento("div");
    const sobreTitulo = crearElemento(
      "p",
      "panel-habilidades__etiqueta",
      traducir("interfaz.habilidades.progresoPersonaje", { respaldo: "Progreso del personaje" }),
    );
    const titulo = crearElemento(
      "h2",
      "panel-habilidades__titulo",
      traducir("interfaz.habilidades.titulo", { respaldo: "Habilidades y maestrías" }),
    );
    titulo.id = "tituloHabilidadesMaestrias";
    tituloBloque.append(sobreTitulo, titulo);
    this.resumenPuntos = crearElemento("div", "panel-habilidades__puntos");
    const cerrar = crearElemento("button", "panel-habilidades__cerrar", "×");
    cerrar.type = "button";
    cerrar.setAttribute("aria-label", traducir("interfaz.habilidades.cerrar", { respaldo: "Cerrar habilidades" }));
    cabecera.append(tituloBloque, this.resumenPuntos, cerrar);
    const cuerpo = crearElemento("div", "panel-habilidades__cuerpo");
    this.navegacion = crearElemento("nav", "panel-habilidades__navegacion");
    this.navegacion.setAttribute("aria-label", traducir("interfaz.habilidades.categoriasAria", { respaldo: "Categorías de maestrías" }));
    this.contenido = crearElemento("main", "panel-habilidades__contenido");
    cuerpo.append(this.navegacion, this.contenido);
    this.mensaje = crearElemento("p", "panel-habilidades__mensaje");
    this.mensaje.setAttribute("aria-live", "polite");
    this.capaAccion = crearElemento("div", "panel-habilidades__capa-accion");
    this.capaAccion.hidden = true;
    marco.append(cabecera, cuerpo, this.mensaje, this.capaAccion);
    dialogo.append(marco);
    document.body.append(dialogo);
    this.escuchar(cerrar, "click", () => this.solicitarCierre());
    this.escuchar(dialogo, "cancel", (evento) => {
      evento.preventDefault();
      this.solicitarCierre();
    });
    this.escuchar(dialogo, "click", (evento) => {
      if (evento.target === dialogo) {
        this.solicitarCierre();
      }
    });
    return dialogo;
  }
  renderizarCabecera(resumen) {
    this.resumenPuntos.replaceChildren(
      crearContador(traducir("interfaz.habilidades.universales", { respaldo: "Universales" }), resumen.puntosUniversales, "universal"),
      crearContador(
        traducir("interfaz.habilidades.especificos", { respaldo: "Específicos" }),
        Object.values(resumen.maestrias).reduce(
          (total, maestria) => total + maestria.puntosEspecificos,
          0,
        ),
        "especifico",
      ),
    );
  }
  asegurarSeleccionValida(resumen) {
    const categorias = obtenerCategoriasOrdenadas(this.configuracionProgreso);
    if (!categorias.some((categoria) => categoria.id === this.categoriaActiva)) {
      this.categoriaActiva = categorias[0]?.id ?? null;
    }
    const maestrias = obtenerMaestriasCategoria({
      configuracion: this.configuracionProgreso,
      resumen,
      idCategoria: this.categoriaActiva,
    });
    if (!maestrias.some((maestria) => maestria.id === this.maestriaActiva)) {
      this.maestriaActiva = maestrias[0]?.id ?? null;
      this.idHabilidadSeleccionada = null;
    }
  }
  renderizarNavegacion() {
    this.navegacion.replaceChildren();
    for (const categoria of obtenerCategoriasOrdenadas(this.configuracionProgreso)) {
      const boton = crearElemento(
        "button",
        "panel-habilidades__categoria",
        nombreCategoria(categoria),
      );
      boton.type = "button";
      boton.classList.toggle(
        "panel-habilidades__categoria--activa",
        categoria.id === this.categoriaActiva,
      );
      boton.addEventListener("click", () => {
        this.categoriaActiva = categoria.id;
        this.maestriaActiva = null;
        this.idHabilidadSeleccionada = null;
        this.renderizar();
      });
      this.navegacion.append(boton);
    }
  }
  renderizarCategoria(resumen) {
    const categoria = this.configuracionProgreso.categorias[this.categoriaActiva];
    const maestrias = obtenerMaestriasCategoria({
      configuracion: this.configuracionProgreso,
      resumen,
      idCategoria: this.categoriaActiva,
    });
    const habilidadesIndependientes = this.sistema
      .obtenerHabilidadesIndependientes()
      .filter((habilidad) => habilidad.categoria === this.categoriaActiva);

    if (categoria && habilidadesIndependientes.length > 0 && maestrias.length === 0) {
      this.renderizarHabilidadesIndependientes({
        categoria,
        habilidades: habilidadesIndependientes,
      });
      return;
    }

    if (!categoria || maestrias.length === 0 || !this.maestriaActiva) {
      this.renderizarCategoriaVacia(categoria);
      return;
    }

    const selector = crearElemento("div", "maestrias__selector");
    for (const definicionMaestria of maestrias) {
      const idMaestria = definicionMaestria.id;
      const estado = resumen.maestrias[idMaestria];
      const boton = crearElemento(
        "button",
        `maestria-selector maestria-selector--${idMaestria}`,
      );
      boton.type = "button";
      boton.classList.toggle(
        "maestria-selector--activa",
        idMaestria === this.maestriaActiva,
      );
      boton.append(
        crearElemento("strong", "maestria-selector__nombre", nombreMaestria(idMaestria, definicionMaestria)),
        crearElemento(
          "span",
          "maestria-selector__nivel",
          traducir("interfaz.habilidades.nivel", {
            parametros: { nivel: estado.nivel, maximo: this.configuracionProgreso.reglas.nivelMaximoMaestria },
            respaldo: `Nivel ${estado.nivel} / ${this.configuracionProgreso.reglas.nivelMaximoMaestria}`,
          }),
        ),
      );
      boton.addEventListener("click", () => {
        this.maestriaActiva = idMaestria;
        this.idHabilidadSeleccionada = null;
        this.renderizar();
      });
      selector.append(boton);
    }

    const idMaestria = this.maestriaActiva;
    const definicion = this.configuracionProgreso.maestrias[idMaestria];
    const estado = resumen.maestrias[idMaestria];
    const seccion = crearElemento(
      "section",
      `maestria-detalle maestria-detalle--${idMaestria}`,
    );
    seccion.dataset.temaMaestria = idMaestria;
    const cabecera = crearElemento("header", "maestria-detalle__cabecera");
    const identidad = crearElemento("div");
    identidad.append(
      crearElemento("p", "maestria-detalle__categoria", nombreCategoria(categoria)),
      crearElemento("h3", "maestria-detalle__nombre", nombreMaestria(idMaestria, definicion)),
    );
    const puntos = crearContador(
      traducir("interfaz.habilidades.puntosEspecificos", { respaldo: "Puntos específicos" }),
      estado.puntosEspecificos,
      "especifico",
    );
    cabecera.append(identidad, puntos);

    const progreso = crearProgresoMaestria({
      estado,
      nivelMaximo: this.configuracionProgreso.reglas.nivelMaximoMaestria,
    });
    const habilidades = Object.values(resumen.habilidades)
      .filter((habilidad) => habilidad.maestria === idMaestria);
    const estructura = this.organizadorArbol.organizar({
      idMaestria,
      habilidades,
      definiciones: this.configuracionProgreso.habilidades,
      definicionesEjecucion: this.configuracionEjecucion.habilidades,
    });
    const arbol = this.crearArbolHabilidades({
      estructura,
      estado,
      resumen,
    });

    seccion.append(cabecera, progreso, arbol);
    this.contenido.append(selector, seccion);
    requestAnimationFrame(() => mantenerOpcionActivaVisible(selector));
  }

  crearArbolHabilidades({ estructura, estado, resumen }) {
    const arbol = crearElemento("div", "arbol-habilidades");
    arbol.dataset.maestria = estructura.idMaestria;
    const lienzo = crearElemento("div", "arbol-habilidades__lienzo");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("arbol-habilidades__conexiones");
    svg.setAttribute("aria-hidden", "true");
    lienzo.append(svg);

    if (estructura.niveles.length === 0) {
      lienzo.append(
        crearElemento(
          "p",
          "seccion-en-construccion__detalle",
          traducir("interfaz.habilidades.categoriaVacia", {
            respaldo: "No hay habilidades configuradas en esta maestría.",
          }),
        ),
      );
      arbol.append(lienzo);
      return arbol;
    }

    for (const nivel of estructura.niveles) {
      const fila = crearElemento("div", "arbol-habilidades__nivel");
      fila.dataset.nivelMaestria = String(nivel.nivel);
      const etiqueta = crearElemento(
        "span",
        "arbol-habilidades__nivel-etiqueta",
        traducir("interfaz.habilidades.nivelArbol", {
          parametros: { nivel: nivel.nivel },
          respaldo: `Nivel ${nivel.nivel}`,
        }),
      );
      const nodos = crearElemento("div", "arbol-habilidades__nodos");
      for (const nodo of nivel.nodos) {
        nodos.append(this.crearNodoArbol({ habilidad: nodo, estado, resumen }));
      }
      fila.append(etiqueta, nodos);
      lienzo.append(fila);
    }
    arbol.append(lienzo);
    requestAnimationFrame(() => {
      if (arbol.isConnected) this.dibujarRelacionesArbol(arbol, estructura.relaciones);
    });
    this.observarGeometriaArbol(arbol, estructura.relaciones);
    return arbol;
  }

  crearNodoArbol({ habilidad, estado }) {
    const ejecucion = this.configuracionEjecucion.habilidades[habilidad.id];
    const bloqueada = estado.nivel < habilidad.requisitoNivelMaestria;
    const aprendida = habilidad.grado > 0;
    const maximo = habilidad.grado >= habilidad.gradoMaximo;
    const asignada = this.sistema
      .obtenerEstadoBarra()
      .some((ranura) => ranura.idHabilidad === habilidad.id);
    const boton = crearElemento("button", "nodo-habilidad");
    boton.type = "button";
    boton.dataset.idHabilidad = habilidad.id;
    boton.style.setProperty(
      "--posicion-horizontal",
      String(habilidad.posicionHorizontal ?? 0.5),
    );
    boton.classList.toggle("nodo-habilidad--no-aprendida", !aprendida);
    boton.classList.toggle("nodo-habilidad--bloqueada", bloqueada);
    boton.classList.toggle("nodo-habilidad--maximo", maximo);
    boton.classList.toggle("nodo-habilidad--asignada", asignada);
    boton.setAttribute(
      "aria-label",
      `${nombreHabilidad(habilidad)}. ${habilidad.grado}/${habilidad.gradoMaximo}`,
    );
    boton.append(crearIconoNodo(ejecucion, habilidad));
    boton.append(
      crearElemento(
        "span",
        "nodo-habilidad__grado",
        `${habilidad.grado}/${habilidad.gradoMaximo}`,
      ),
    );
    boton.addEventListener("click", () => this.abrirDetalleHabilidad(habilidad.id));
    return boton;
  }

  dibujarRelacionesArbol(arbol, relaciones) {
    const svg = arbol.querySelector(".arbol-habilidades__conexiones");
    const lienzo = arbol.querySelector(".arbol-habilidades__lienzo");
    if (!svg || !lienzo) return;
    svg.replaceChildren();
    const caja = lienzo.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${Math.max(1, caja.width)} ${Math.max(1, caja.height)}`);
    svg.setAttribute("width", String(Math.max(1, caja.width)));
    svg.setAttribute("height", String(Math.max(1, caja.height)));

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.id = `flechaArbol-${estructuraIdSeguro(arbol.dataset.maestria)}`;
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "8");
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "6");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("orient", "auto-start-reverse");
    const punta = document.createElementNS("http://www.w3.org/2000/svg", "path");
    punta.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    marker.append(punta);
    defs.append(marker);
    svg.append(defs);

    for (const relacion of relaciones) {
      const origen = arbol.querySelector(`[data-id-habilidad="${CSS.escape(relacion.desde)}"]`);
      if (!origen) continue;
      const destino = arbol.querySelector(
        `[data-id-habilidad="${CSS.escape(relacion.hacia)}"]`,
      );
      const puntos = obtenerPuntosConexionRelativos(origen, destino, caja);
      if (!puntos) continue;
      const { origen: puntoOrigen, destino: puntoDestino } = puntos;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const mitadY = (puntoOrigen.y + puntoDestino.y) / 2;
      path.setAttribute(
        "d",
        `M ${puntoOrigen.x} ${puntoOrigen.y} C ${puntoOrigen.x} ${mitadY}, ${puntoDestino.x} ${mitadY}, ${puntoDestino.x} ${puntoDestino.y}`,
      );
      path.setAttribute("marker-end", `url(#${marker.id})`);
      path.classList.add("arbol-habilidades__conexion");
      path.classList.toggle(
        "arbol-habilidades__conexion--sinergia",
        relacion.tipo === TIPOS_RELACION_ARBOL_HABILIDADES.SINERGIA,
      );
      svg.append(path);
    }
  }

  observarGeometriaArbol(arbol, relaciones) {
    const lienzo = arbol.querySelector(".arbol-habilidades__lienzo");
    if (!lienzo || typeof ResizeObserver !== "function") return;

    let cuadroPendiente = null;
    const observador = new ResizeObserver(() => {
      if (cuadroPendiente !== null) cancelAnimationFrame(cuadroPendiente);
      cuadroPendiente = requestAnimationFrame(() => {
        cuadroPendiente = null;
        if (arbol.isConnected) {
          this.dibujarRelacionesArbol(arbol, relaciones);
        }
      });
    });
    observador.observe(lienzo);
    this.observadoresArbol.push({
      observador,
      cancelar: () => {
        if (cuadroPendiente !== null) cancelAnimationFrame(cuadroPendiente);
      },
    });
  }

  liberarObservadoresArbol() {
    for (const registro of this.observadoresArbol) {
      registro.cancelar?.();
      registro.observador?.disconnect();
    }
    this.observadoresArbol = [];
  }

  abrirDetalleHabilidad(idHabilidad) {
    const resumen = obtenerResumenProgreso(this.jugador);
    const habilidad = resumen.habilidades[idHabilidad];
    const definicion = this.configuracionProgreso.habilidades[idHabilidad];
    const ejecucion = this.configuracionEjecucion.habilidades[idHabilidad];
    if (!habilidad || !definicion || !ejecucion) return false;
    this.idHabilidadSeleccionada = idHabilidad;
    const estado = resumen.maestrias[habilidad.maestria];
    const indiceAsignado = this.sistema
      .obtenerEstadoBarra()
      .findIndex((ranura) => ranura.idHabilidad === idHabilidad);
    const asignada = indiceAsignado >= 0;
    const contenido = crearElemento("div", "detalle-habilidad-modal");
    contenido.append(this.crearCabeceraDetalleHabilidad({ habilidad, ejecucion }));
    contenido.append(
      this.crearInformacionDetalleHabilidad({
        habilidad,
        definicion,
        ejecucion,
      }),
    );
    contenido.append(
      this.crearAccionesDetalleHabilidad({
        habilidad,
        estado,
        resumen,
        ejecucion,
        asignada,
        indiceAsignado,
      }),
    );
    this.abrirCapaAccion({
      titulo: nombreHabilidad(habilidad),
      cuerpo: contenido,
      mostrarConfirmar: false,
      claseTarjeta: "confirmacion-habilidad--detalle",
    });
    return true;
  }

  crearCabeceraDetalleHabilidad({ habilidad, ejecucion }) {
    const cabecera = crearElemento("div", "detalle-habilidad-modal__cabecera");
    const icono = crearIconoDetalle(ejecucion, habilidad);
    const texto = crearElemento("div", "detalle-habilidad-modal__identidad");
    const tipo = clasificarPresentacionHabilidad({ habilidad, ejecucion, catalogoEfectos: this.configuracionEjecucion.efectos });
    texto.append(
      crearElemento("strong", "detalle-habilidad-modal__tipo", etiquetaTipoHabilidad(tipo, habilidad.maestria)),
      crearElemento(
        "span",
        "detalle-habilidad-modal__grado",
        traducir("interfaz.habilidades.grado", {
          parametros: { grado: habilidad.grado, maximo: habilidad.gradoMaximo },
          respaldo: `Grado ${habilidad.grado} / ${habilidad.gradoMaximo}`,
        }),
      ),
      crearElemento(
        "span",
        "detalle-habilidad-modal__requisito",
        traducir("interfaz.habilidades.requiereNivel", {
          parametros: { nivel: habilidad.requisitoNivelMaestria },
          respaldo: `Requiere nivel ${habilidad.requisitoNivelMaestria} de la maestría.`,
        }),
      ),
      crearElemento("p", "detalle-habilidad-modal__descripcion", descripcionHabilidad(habilidad, ejecucion)),
    );
    cabecera.append(icono, texto);
    return cabecera;
  }

  crearInformacionDetalleHabilidad({ habilidad, definicion, ejecucion }) {
    const tipo = clasificarPresentacionHabilidad({ habilidad, ejecucion, catalogoEfectos: this.configuracionEjecucion.efectos });
    const contenedor = crearElemento("div", `detalle-habilidad-modal__informacion detalle-habilidad-modal__informacion--${tipo}`);
    if (tipo === "pasiva") {
      contenedor.append(crearSeccionPasiva({ definicion, habilidad }));
      return contenedor;
    }

    const gradoVisible = habilidad.grado > 0 ? habilidad.grado : 1;
    const gradoBase = ejecucion.ejecucion.grados[gradoVisible];
    const gradoConfig = crearConfiguracionHabilidadEfectiva({
      lanzador: this.jugador,
      habilidad: ejecucion,
      gradoConfig: gradoBase,
    });
    if (tipo === "aura") {
      contenedor.append(crearSeccionAura({ gradoConfig, ejecucion, catalogoEfectos: this.configuracionEjecucion.efectos }));
    } else if (tipo === "maldicion") {
      contenedor.append(crearSeccionMaldicion({ gradoConfig, ejecucion, catalogoEfectos: this.configuracionEjecucion.efectos }));
    } else {
      contenedor.append(crearSeccionOfensiva({ gradoConfig, ejecucion, catalogoEfectos: this.configuracionEjecucion.efectos }));
    }
    contenedor.append(crearSeccionEjecucion({ gradoConfig, ejecucion }));
    return contenedor;
  }

  crearAccionesDetalleHabilidad({ habilidad, estado, resumen, ejecucion, asignada, indiceAsignado }) {
    const acciones = crearElemento("div", "detalle-habilidad-modal__acciones");
    const bloqueada = estado.nivel < habilidad.requisitoNivelMaestria;
    const maximo = habilidad.grado >= habilidad.gradoMaximo;
    const tieneEspecifico = estado.puntosEspecificos > 0;
    const tieneUniversal = resumen.puntosUniversales > 0;
    const tienePuntos = tieneEspecifico || tieneUniversal;
    let selectorOrigen = null;

    if (!bloqueada && !maximo && tieneEspecifico && tieneUniversal) {
      selectorOrigen = document.createElement("select");
      selectorOrigen.className = "detalle-habilidad-modal__origen-punto";
      selectorOrigen.append(
        crearOpcionSelect("especifico", traducir("interfaz.habilidades.especificos", { respaldo: "Punto específico" })),
        crearOpcionSelect("universal", traducir("interfaz.habilidades.universales", { respaldo: "Punto universal" })),
      );
      acciones.append(selectorOrigen);
    }

    const mejorar = crearElemento(
      "button",
      "tarjeta-habilidad__accion tarjeta-habilidad__accion--principal",
      habilidad.grado > 0
        ? traducir("interfaz.habilidades.mejorar", { respaldo: "Mejorar" })
        : traducir("interfaz.habilidades.aprender", { respaldo: "Aprender" }),
    );
    mejorar.type = "button";
    mejorar.disabled = bloqueada || maximo || !tienePuntos;
    mejorar.addEventListener("click", () => {
      const origenPunto = selectorOrigen?.value ?? (tieneEspecifico ? "especifico" : "universal");
      const resultado = mejorarHabilidadJugador(this.jugador, {
        idHabilidad: habilidad.id,
        origenPunto,
        idMaestriaPunto: origenPunto === "especifico" ? habilidad.maestria : null,
      });
      if (!resultado.exito) {
        this.mostrarMensaje(traducirMotivo(resultado.motivo), "error");
        return;
      }
      this.guardarCambios("progreso");
      this.mostrarMensaje(
        traducir("interfaz.habilidades.gradoAlcanzado", {
          parametros: { habilidad: nombreHabilidad(habilidad), grado: resultado.gradoActual },
          respaldo: `${nombreHabilidad(habilidad)} alcanzó el grado ${resultado.gradoActual}.`,
        }),
        "exito",
      );
      this.renderizar();
    });
    acciones.append(mejorar);

    if (habilidad.grado > 0 && habilidad.tipo === "activa" && ejecucion?.ejecucion) {
      const barra = crearElemento(
        "button",
        "tarjeta-habilidad__accion",
        asignada
          ? traducir("interfaz.habilidades.quitarRanura", {
              parametros: { ranura: indiceAsignado === 9 ? 0 : indiceAsignado + 1 },
              respaldo: `Quitar de ${indiceAsignado === 9 ? 0 : indiceAsignado + 1}`,
            })
          : traducir("interfaz.habilidades.asignarBarra", { respaldo: "Asignar a barra" }),
      );
      barra.type = "button";
      barra.addEventListener("click", () => {
        if (asignada) this.abrirConfirmacionQuitar({ habilidad, indiceAsignado });
        else this.abrirSelectorRanura(habilidad);
      });
      acciones.append(barra);
    }
    return acciones;
  }

  renderizarHabilidadesIndependientes({ categoria, habilidades }) {
    const seccion = crearElemento("section", "habilidades-independientes");
    const cabecera = crearElemento("header", "habilidades-independientes__cabecera");
    cabecera.append(
      crearElemento("p", "panel-habilidades__etiqueta", nombreCategoria(categoria)),
      crearElemento("h3", "", traducir("interfaz.habilidades.basicasTitulo", {
        respaldo: "Habilidades básicas",
      })),
      crearElemento(
        "p",
        "",
        traducir("interfaz.habilidades.basicasDetalle", {
          respaldo: "Siempre están aprendidas en grado 1 y pueden asignarse, moverse o quitarse libremente de la barra.",
        }),
      ),
    );

    const grilla = crearElemento("div", "habilidades-independientes__grilla");
    for (const habilidad of habilidades) {
      const indiceAsignado = this.sistema
        .obtenerEstadoBarra()
        .findIndex((ranura) => ranura.idHabilidad === habilidad.id);
      const asignada = indiceAsignado >= 0;
      const tarjeta = crearElemento("article", "habilidad-independiente");
      const identidad = crearElemento("div", "habilidad-independiente__identidad");
      identidad.append(
        crearIconoNodo({ icono: habilidad.icono }, habilidad),
        crearElemento("strong", "", nombreHabilidad(habilidad)),
        crearElemento("span", "nodo-habilidad__grado", "1/1"),
      );
      tarjeta.append(
        identidad,
        crearElemento("p", "habilidad-independiente__descripcion", descripcionHabilidad(habilidad, habilidad)),
      );

      const boton = crearElemento(
        "button",
        "tarjeta-habilidad__accion",
        asignada
          ? traducir("interfaz.habilidades.quitarRanura", {
              parametros: { ranura: indiceAsignado === 9 ? 0 : indiceAsignado + 1 },
              respaldo: `Quitar de ${indiceAsignado === 9 ? 0 : indiceAsignado + 1}`,
            })
          : traducir("interfaz.habilidades.asignarBarra", { respaldo: "Asignar a barra" }),
      );
      boton.type = "button";
      boton.addEventListener("click", () => {
        if (asignada) {
          this.abrirConfirmacionQuitar({ habilidad, indiceAsignado });
        } else {
          this.abrirSelectorRanura(habilidad);
        }
      });
      tarjeta.append(boton);
      grilla.append(tarjeta);
    }

    seccion.append(cabecera, grilla);
    this.contenido.append(seccion);
  }

  renderizarCategoriaVacia(categoria) {
    const seccion = crearElemento("section", "seccion-en-construccion");
    seccion.append(
      crearElemento(
        "p",
        "seccion-en-construccion__etiqueta",
        categoria ? nombreCategoria(categoria) : traducir("interfaz.habilidades.categoriasAria", { respaldo: "Categoría" }),
      ),
      crearElemento(
        "h3",
        "",
        traducir("interfaz.habilidades.sinMaestriasTitulo", { respaldo: "Sin maestrías configuradas" }),
      ),
      crearElemento(
        "p",
        "",
        traducir("interfaz.habilidades.sinMaestriasDetalle", {
          respaldo: "No hay maestrías configuradas en esta categoría.",
        }),
      ),
    );
    this.contenido.append(seccion);
  }
  abrirSelectorRanura(habilidad) {
    const cuerpo = crearElemento("div", "selector-ranuras-habilidad");
    const estadoBarra = this.sistema.obtenerEstadoBarra();
    estadoBarra.forEach((ranura, indice) => {
      const tecla = indice === 9 ? "0" : String(indice + 1);
      const boton = crearElemento(
        "button",
        "selector-ranuras-habilidad__ranura",
      );
      boton.type = "button";
      boton.append(
        crearElemento("strong", "", tecla),
        crearElemento("span", "", ranura.idHabilidad ? nombreHabilidad(ranura) : traducir("interfaz.habilidades.ranuraVacia", { respaldo: "Vacía" })),
      );
      boton.addEventListener("click", () => {
        if (ranura.idHabilidad) {
          this.abrirConfirmacionReemplazo({ habilidad, ranura, indice });
        } else {
          this.asignarHabilidad(habilidad, indice);
          this.cerrarCapaAccion();
        }
      });
      cuerpo.append(boton);
    });
    this.abrirCapaAccion({
      titulo: traducir("interfaz.habilidades.asignarTitulo", { parametros: { habilidad: nombreHabilidad(habilidad) }, respaldo: `Asignar ${habilidad.nombre}` }),
      cuerpo,
      mostrarConfirmar: false,
    });
  }
  abrirConfirmacionReemplazo({ habilidad, ranura, indice }) {
    const cuerpo = crearElemento("div", "confirmacion-habilidad__cuerpo");
    cuerpo.append(
      crearElemento(
        "p",
        "confirmacion-habilidad__resumen",
        traducir("interfaz.habilidades.reemplazoResumen", {
          parametros: { ranura: indice === 9 ? 0 : indice + 1, actual: nombreHabilidad(ranura), nueva: nombreHabilidad(habilidad) },
          respaldo: `La ranura ${indice === 9 ? 0 : indice + 1} contiene ${ranura.nombre}. Será reemplazada por ${habilidad.nombre}.`,
        }),
      ),
      crearElemento(
        "p",
        "confirmacion-habilidad__aviso",
        traducir("interfaz.habilidades.reemplazoAviso", { respaldo: "La habilidad reemplazada seguirá aprendida, pero quedará sin acceso rápido." }),
      ),
    );
    this.abrirCapaAccion({
      titulo: traducir("interfaz.habilidades.confirmarReemplazo", { respaldo: "Confirmar reemplazo" }),
      cuerpo,
      textoConfirmar: traducir("interfaz.habilidades.reemplazar", { respaldo: "Reemplazar" }),
      alConfirmar: () => {
        this.asignarHabilidad(habilidad, indice);
        return true;
      },
    });
  }
  abrirConfirmacionQuitar({ habilidad, indiceAsignado }) {
    const cuerpo = crearElemento("div", "confirmacion-habilidad__cuerpo");
    cuerpo.append(
      crearElemento(
        "p",
        "confirmacion-habilidad__resumen",
        traducir("interfaz.habilidades.quitarResumen", { parametros: { habilidad: nombreHabilidad(habilidad), ranura: indiceAsignado === 9 ? 0 : indiceAsignado + 1 }, respaldo: `Quitar ${habilidad.nombre} de la ranura ${indiceAsignado === 9 ? 0 : indiceAsignado + 1}.` }),
      ),
      crearElemento(
        "p",
        "confirmacion-habilidad__aviso",
        traducir("interfaz.habilidades.quitarAviso", { respaldo: "No se perderá el grado aprendido." }),
      ),
    );
    this.abrirCapaAccion({
      titulo: traducir("interfaz.habilidades.confirmarDesasignacion", { respaldo: "Confirmar desasignación" }),
      cuerpo,
      textoConfirmar: traducir("interfaz.habilidades.quitarBarra", { respaldo: "Quitar de la barra" }),
      alConfirmar: () => {
        this.sistema.desasignarHabilidad(indiceAsignado);
        this.guardarCambios("barra");
        this.mostrarMensaje(
          traducir("interfaz.habilidades.quitadaBarra", { parametros: { habilidad: nombreHabilidad(habilidad) }, respaldo: `${habilidad.nombre} fue quitada de la barra.` }),
          "exito",
        );
        this.renderizar();
        return true;
      },
    });
  }
  asignarHabilidad(habilidad, indice) {
    this.sistema.asignarHabilidad(indice, habilidad.id);
    this.guardarCambios("barra");
    this.mostrarMensaje(
      traducir("interfaz.habilidades.asignadaRanura", { parametros: { habilidad: nombreHabilidad(habilidad), ranura: indice === 9 ? 0 : indice + 1 }, respaldo: `${habilidad.nombre} fue asignada a la ranura ${indice === 9 ? 0 : indice + 1}.` }),
      "exito",
    );
    this.renderizar();
  }
  abrirCapaAccion({
    titulo,
    cuerpo,
    textoConfirmar = traducir("interfaz.habilidades.confirmar", { respaldo: "Confirmar" }),
    alConfirmar = null,
    mostrarConfirmar = true,
    claseTarjeta = "",
  }) {
    this.capaAccion.replaceChildren();
    this.capaAccion.hidden = false;
    const tarjeta = crearElemento(
      "section",
      `confirmacion-habilidad${claseTarjeta ? ` ${claseTarjeta}` : ""}`,
    );
    const cabecera = crearElemento(
      "header",
      "confirmacion-habilidad__cabecera",
    );
    cabecera.append(crearElemento("h3", "", titulo));
    const cerrar = crearElemento(
      "button",
      "confirmacion-habilidad__cerrar",
      "×",
    );
    cerrar.type = "button";
    cerrar.setAttribute("aria-label", traducir("interfaz.habilidades.cancelarAccion", { respaldo: "Cancelar acción" }));
    cerrar.addEventListener("click", () => this.cerrarCapaAccion());
    cabecera.append(cerrar);
    const acciones = crearElemento("div", "confirmacion-habilidad__acciones");
    const cancelar = crearElemento("button", "", traducir("interfaz.habilidades.cancelar", { respaldo: "Cancelar" }));
    cancelar.type = "button";
    cancelar.addEventListener("click", () => this.cerrarCapaAccion());
    acciones.append(cancelar);
    if (mostrarConfirmar) {
      const confirmar = crearElemento(
        "button",
        "confirmacion-habilidad__confirmar",
        textoConfirmar,
      );
      confirmar.type = "button";
      confirmar.addEventListener("click", () => {
        confirmar.disabled = true;
        try {
          const cerrarDespues = alConfirmar?.() !== false;
          if (cerrarDespues) {
            this.cerrarCapaAccion();
          }
        } catch (error) {
          console.error("[Dark Moon · Habilidades]", error);
          this.mostrarMensaje(
            traducir("interfaz.habilidades.errorOperacion", {
              respaldo: "No se pudo completar la operación.",
            }),
            "error",
          );
        } finally {
          confirmar.disabled = false;
        }
      });
      acciones.append(confirmar);
    }
    tarjeta.append(cabecera, cuerpo, acciones);
    this.capaAccion.append(tarjeta);
  }
  cerrarCapaAccion() {
    this.capaAccion.hidden = true;
    this.capaAccion.replaceChildren();
  }
  guardarCambios(tipo) {
    if (typeof this.alGuardarCambios === "function") {
      this.alGuardarCambios({ tipo });
    }
  }
  escuchar(elemento, tipo, manejador, opciones = undefined) {
    elemento.addEventListener(tipo, manejador, opciones);
    this.manejadores.push({ elemento, tipo, manejador, opciones });
  }
}

function estructuraIdSeguro(valor) {
  return String(valor ?? "arbol").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function obtenerPuntosConexionRelativos(origen, destino, cajaReferencia) {
  if (!(origen instanceof Element) || !(destino instanceof Element)) return null;
  const cajaOrigen = cajaRelativa(origen, cajaReferencia);
  const cajaDestino = cajaRelativa(destino, cajaReferencia);
  const centroOrigen = {
    x: cajaOrigen.x + cajaOrigen.width / 2,
    y: cajaOrigen.y + cajaOrigen.height / 2,
  };
  const centroDestino = {
    x: cajaDestino.x + cajaDestino.width / 2,
    y: cajaDestino.y + cajaDestino.height / 2,
  };
  const dx = centroDestino.x - centroOrigen.x;
  const dy = centroDestino.y - centroOrigen.y;

  if (Math.abs(dx) >= Math.abs(dy) * 0.25 && Math.abs(dx) > 2) {
    const direccion = Math.sign(dx);
    return {
      origen: {
        x: centroOrigen.x + direccion * cajaOrigen.width / 2,
        y: centroOrigen.y,
      },
      destino: {
        x: centroDestino.x - direccion * cajaDestino.width / 2,
        y: centroDestino.y,
      },
    };
  }

  const direccion = Math.sign(dy) || 1;
  return {
    origen: {
      x: centroOrigen.x,
      y: centroOrigen.y + direccion * cajaOrigen.height / 2,
    },
    destino: {
      x: centroDestino.x,
      y: centroDestino.y - direccion * cajaDestino.height / 2,
    },
  };
}

function cajaRelativa(elemento, cajaReferencia) {
  const caja = elemento.getBoundingClientRect();
  return {
    x: caja.left - cajaReferencia.left,
    y: caja.top - cajaReferencia.top,
    width: caja.width,
    height: caja.height,
  };
}

function crearIconoNodo(ejecucion, habilidad) {
  const marco = crearElemento("span", "nodo-habilidad__icono");
  const ruta = ejecucion?.icono ?? null;
  const fallback = () => marco.replaceChildren(
    crearElemento("span", "nodo-habilidad__inicial", nombreHabilidad(habilidad).slice(0, 1).toUpperCase()),
  );
  if (!ruta) {
    fallback();
    return marco;
  }
  const imagen = document.createElement("img");
  imagen.src = ruta;
  imagen.alt = "";
  imagen.draggable = false;
  imagen.addEventListener("error", fallback, { once: true });
  marco.append(imagen);
  return marco;
}

function crearIconoDetalle(ejecucion, habilidad) {
  const marco = crearElemento("span", "detalle-habilidad-modal__icono");
  const ruta = ejecucion?.icono ?? null;
  const fallback = () => marco.replaceChildren(
    crearElemento("span", "detalle-habilidad-modal__inicial", nombreHabilidad(habilidad).slice(0, 1).toUpperCase()),
  );
  if (!ruta) {
    fallback();
    return marco;
  }
  const imagen = document.createElement("img");
  imagen.src = ruta;
  imagen.alt = "";
  imagen.draggable = false;
  imagen.addEventListener("error", fallback, { once: true });
  marco.append(imagen);
  return marco;
}

function etiquetaTipoHabilidad(tipo, idMaestria) {
  const etiquetas = {
    pasiva: traducir("interfaz.habilidades.tipoPasiva", { respaldo: "Pasiva" }),
    aura: traducir("interfaz.habilidades.tipoAura", { respaldo: "Aura" }),
    maldicion: traducir("interfaz.habilidades.tipoMaldicion", { respaldo: "Maldición" }),
    ofensiva: traducir("interfaz.habilidades.tipoOfensiva", { respaldo: "Ofensiva" }),
  };
  const maestria = traducirContenido("maestrias", idMaestria, "nombre", formatearNombre(idMaestria));
  return `${etiquetas[tipo] ?? formatearNombre(tipo)} · ${maestria}`;
}

function crearSeccionPasiva({ definicion, habilidad }) {
  const seccion = crearBloqueDetalle("Efecto");
  const gradoVisible = habilidad.grado > 0 ? habilidad.grado : 1;
  const lista = crearElemento("dl", "detalle-habilidad-modal__datos");
  const modificadores = obtenerModificadoresPasiva(definicion, gradoVisible);
  for (const modificador of modificadores) {
    const detalle = formatearDetalleModificadorPasiva(modificador);
    agregarDato(lista, detalle.etiqueta, detalle.valor);
  }
  if (modificadores.length === 0) agregarDato(lista, "Efecto", "Sin modificadores configurados");
  seccion.append(lista);

  const relaciones = new Set();
  for (const modificador of modificadores) {
    const condiciones = modificador?.condiciones ?? {};
    if (condiciones.idHabilidad) relaciones.add(nombreHabilidad({ id: condiciones.idHabilidad, nombre: condiciones.idHabilidad }));
    else if (condiciones.maestriaHabilidad) {
      relaciones.add(
        traducir("interfaz.habilidades.todaMaestria", {
          parametros: { maestria: traducirContenido("maestrias", condiciones.maestriaHabilidad, "nombre", formatearNombre(condiciones.maestriaHabilidad)) },
          respaldo: `Todas las habilidades de ${formatearNombre(condiciones.maestriaHabilidad)}`,
        }),
      );
    }
  }
  if (relaciones.size > 0) {
    const aplica = crearBloqueDetalle(traducir("interfaz.habilidades.aplicaA", { respaldo: "Aplica a" }));
    aplica.append(crearElemento("p", "detalle-habilidad-modal__texto", [...relaciones].join(", ")));
    const contenedor = crearElemento("div", "detalle-habilidad-modal__bloques");
    contenedor.append(seccion, aplica);
    return contenedor;
  }
  return seccion;
}

function crearSeccionAura({ gradoConfig, catalogoEfectos }) {
  const seccion = crearBloqueDetalle(traducir("interfaz.habilidades.tipoAura", { respaldo: "Aura" }));
  const lista = crearElemento("dl", "detalle-habilidad-modal__datos");
  for (const efecto of gradoConfig?.efectos ?? []) {
    for (const modificador of efecto.modificadores ?? []) {
      const detalle = formatearDetalleModificadorPasiva(modificador);
      agregarDato(lista, detalle.etiqueta, detalle.valor);
    }
    if (Number.isFinite(efecto.emision?.radio)) agregarDato(lista, "Radio", formatearNumero(efecto.emision.radio));
    if (efecto.emision?.afecta) agregarDato(lista, "Afecta", formatearNombre(efecto.emision.afecta));
    if (Number.isFinite(efecto.duracion)) agregarDato(lista, "Duración", formatearDuracionTurnos(efecto.duracion));
    const def = catalogoEfectos?.[efecto.efectoId];
    if (def?.nombre) agregarDato(lista, "Efecto", traducirContenido("efectos", efecto.efectoId, "nombre", def.nombre));
  }
  seccion.append(lista);
  return seccion;
}

function crearSeccionMaldicion({ gradoConfig, catalogoEfectos }) {
  const seccion = crearBloqueDetalle(traducir("interfaz.habilidades.tipoMaldicion", { respaldo: "Maldición" }));
  const lista = crearElemento("dl", "detalle-habilidad-modal__datos");
  for (const efecto of gradoConfig?.efectos ?? []) {
    const def = catalogoEfectos?.[efecto.efectoId] ?? null;
    for (const modificador of efecto.modificadores ?? []) {
      const detalle = formatearDetalleModificadorPasiva(modificador);
      agregarDato(lista, detalle.etiqueta, detalle.valor);
    }
    if (def?.tipo === "bloqueo_habilidades") agregarDato(lista, "Efecto", "Bloquea habilidades activas");
    if (Number.isFinite(efecto.probabilidadBase)) agregarDato(lista, "Probabilidad base", `${formatearNumero(efecto.probabilidadBase)}%`);
    if (Number.isFinite(efecto.duracion)) agregarDato(lista, "Duración", formatearDuracionTurnos(efecto.duracion));
    if (def?.resistenciaId) agregarDato(lista, "Resistencia", formatearNombre(def.resistenciaId));
  }
  seccion.append(lista);
  return seccion;
}

function crearSeccionOfensiva({ gradoConfig, catalogoEfectos }) {
  const contenedor = crearElemento("div", "detalle-habilidad-modal__bloques");

  if (gradoConfig?.ataqueArma) {
    const seccionArma = crearBloqueDetalle(
      traducir("interfaz.habilidades.ataqueArmaTitulo", { respaldo: "Ataque de arma" }),
    );
    const listaArma = crearElemento("dl", "detalle-habilidad-modal__datos");
    agregarDato(
      listaArma,
      traducir("interfaz.habilidades.proyectiles", { respaldo: "Proyectiles" }),
      formatearNumero(gradoConfig.ataqueArma.cantidadProyectiles),
    );
    agregarDato(
      listaArma,
      traducir("interfaz.habilidades.municion", { respaldo: "Munición" }),
      formatearNumero(gradoConfig.ataqueArma.cantidadMunicion ?? 0),
    );
    agregarDato(
      listaArma,
      traducir("interfaz.habilidades.danioPorProyectil", { respaldo: "Daño por proyectil" }),
      traducir("interfaz.habilidades.danioPorProyectilValor", {
        respaldo: "{porcentaje}% del arma",
        parametros: {
          porcentaje: formatearNumero(gradoConfig.ataqueArma.factorDanioArma * 100),
        },
      }),
    );
    agregarDato(
      listaArma,
      traducir("interfaz.habilidades.preparacion", { respaldo: "Preparación" }),
      traducir("interfaz.habilidades.preparacionValor", {
        respaldo: "×{factor} de la carga base",
        parametros: { factor: formatearNumero(gradoConfig.ataqueArma.factorPreparacion) },
      }),
    );
    if (gradoConfig.ataqueArma.distanciaDesplazamiento > 0) {
      const forma = gradoConfig.ataqueArma.desplazamientoTactico?.formaVisual ?? "movimiento";
      agregarDato(
        listaArma,
        traducir("interfaz.habilidades.desplazamiento", { respaldo: "Desplazamiento" }),
        traducir("interfaz.habilidades.desplazamientoValor", {
          respaldo: "{casillas} casillas · {forma}",
          parametros: {
            casillas: formatearNumero(gradoConfig.ataqueArma.distanciaDesplazamiento),
            forma: traducirFormaDesplazamientoTactico(forma),
          },
        }),
      );
    }
    seccionArma.append(listaArma);
    contenedor.append(seccionArma);
  }

  if (gradoConfig?.estadoTactico) {
    const estado = gradoConfig.estadoTactico;
    const seccionEstado = crearBloqueDetalle(
      estado.nombre ?? traducir("interfaz.habilidades.estadoTactico", { respaldo: "Estado táctico" }),
    );
    const listaEstado = crearElemento("dl", "detalle-habilidad-modal__datos");
    for (const modificador of estado.modificadores ?? []) {
      const detalle = formatearDetalleModificadorPasiva(modificador);
      agregarDato(listaEstado, detalle.etiqueta, detalle.valor);
    }
    if ((estado.politicas?.interrumpirPor ?? []).length > 0) {
      agregarDato(
        listaEstado,
        traducir("interfaz.habilidades.seInterrumpeAl", { respaldo: "Se interrumpe al" }),
        estado.politicas.interrumpirPor
          .map(traducirEventoEstadoTactico)
          .join(", "),
      );
    }
    seccionEstado.append(listaEstado);
    contenedor.append(seccionEstado);
  }

  const danios = Array.isArray(gradoConfig?.danio) ? gradoConfig.danio : [];
  if (danios.length > 0) {
    const seccionDanio = crearBloqueDetalle(traducir("interfaz.habilidades.danioBase", { respaldo: "Daño" }));
    const listaDanio = crearElemento("dl", "detalle-habilidad-modal__datos");
    for (const componente of danios) agregarDato(listaDanio, formatearNombre(componente.tipo), formatearNumero(componente.valorBase));
    seccionDanio.append(listaDanio);
    contenedor.append(seccionDanio);
  }

  const efectos = gradoConfig?.efectos ?? [];
  if (efectos.length > 0) {
    const seccionEfectos = crearBloqueDetalle(traducir("interfaz.habilidades.efecto", { respaldo: "Efectos" }));
    const lista = crearElemento("dl", "detalle-habilidad-modal__datos");
    for (const efecto of efectos) {
      const def = catalogoEfectos?.[efecto.efectoId] ?? null;
      const nombre = traducirContenido("efectos", efecto.efectoId, "nombre", def?.nombre ?? formatearNombre(efecto.efectoId));
      if (Number.isFinite(efecto.valorBase)) agregarDato(lista, `${nombre} · daño`, formatearNumero(efecto.valorBase));
      if (Number.isFinite(efecto.probabilidadBase) && efecto.probabilidadBase !== 100) agregarDato(lista, `${nombre} · probabilidad`, `${formatearNumero(efecto.probabilidadBase)}%`);
      if (Number.isFinite(efecto.duracion)) agregarDato(lista, `${nombre} · duración`, formatearDuracionTurnos(efecto.duracion));
      if (Number.isFinite(efecto.intervalo)) agregarDato(lista, `${nombre} · intervalo`, formatearDuracionTurnos(efecto.intervalo));
    }
    seccionEfectos.append(lista);
    contenedor.append(seccionEfectos);
  }

  if (gradoConfig?.zonaTemporal) {
    const zona = crearBloqueDetalle("Zona");
    const lista = crearElemento("dl", "detalle-habilidad-modal__datos");
    if (Number.isFinite(gradoConfig.formaImpacto?.radio)) agregarDato(lista, "Radio", formatearNumero(gradoConfig.formaImpacto.radio));
    if (Number.isFinite(gradoConfig.zonaTemporal.duracion)) agregarDato(lista, "Duración", formatearDuracionTurnos(gradoConfig.zonaTemporal.duracion));
    if (Number.isFinite(gradoConfig.zonaTemporal.intervalo)) agregarDato(lista, "Intervalo", formatearDuracionTurnos(gradoConfig.zonaTemporal.intervalo));
    if (gradoConfig.zonaTemporal.afecta) agregarDato(lista, "Afecta", formatearNombre(gradoConfig.zonaTemporal.afecta));
    if (typeof gradoConfig.zonaTemporal.bloqueaVision === "boolean") agregarDato(lista, "Bloquea visión", gradoConfig.zonaTemporal.bloqueaVision ? "Sí" : "No");
    zona.append(lista);
    contenedor.append(zona);
  }
  return contenedor;
}

function crearSeccionEjecucion({ gradoConfig, ejecucion }) {
  const seccion = crearBloqueDetalle("Ejecución");
  const lista = crearElemento("dl", "detalle-habilidad-modal__datos");
  if (Number.isFinite(gradoConfig?.costoMana)) agregarDato(lista, "Maná", formatearNumero(gradoConfig.costoMana));
  if (gradoConfig?.ataqueArma) {
    agregarDato(
      lista,
      traducir("interfaz.habilidades.tiempo", { respaldo: "Tiempo" }),
      traducir("interfaz.habilidades.tiempoAtaqueArma", {
        respaldo: "Preparación + ejecución según el arma equipada",
      }),
    );
  } else if (Number.isFinite(gradoConfig?.costoTemporalBase)) {
    agregarDato(lista, "Tiempo", formatearNumero(gradoConfig.costoTemporalBase));
  }
  if (Number.isFinite(gradoConfig?.alcance)) agregarDato(lista, "Alcance", formatearNumero(gradoConfig.alcance));
  if (ejecucion?.ejecucion?.tipoObjetivo) agregarDato(lista, "Objetivo", formatearNombre(ejecucion.ejecucion.tipoObjetivo));
  if (ejecucion?.ejecucion?.patronAtaque) agregarDato(lista, "Patrón", nombrePatronAtaque(ejecucion.ejecucion.patronAtaque));
  agregarDato(lista, "Línea de visión", ejecucion?.ejecucion?.requiereLineaVision ? "Sí" : "No");
  const forma = gradoConfig?.formaImpacto;
  if (forma?.tipo === "radio" && Number.isFinite(forma.radio)) agregarDato(lista, "Radio de impacto", formatearNumero(forma.radio));
  if (forma?.tipo === "linea") {
    if (Number.isFinite(forma.longitud)) agregarDato(lista, "Longitud", formatearNumero(forma.longitud));
    if (Number.isFinite(forma.ancho)) agregarDato(lista, "Ancho", formatearNumero(forma.ancho));
  }
  if (forma?.tipo === "cadena") {
    if (Number.isFinite(forma.maximoObjetivos)) agregarDato(lista, "Objetivos máximos", formatearNumero(forma.maximoObjetivos));
    if (Number.isFinite(forma.alcanceSalto)) agregarDato(lista, "Alcance de salto", formatearNumero(forma.alcanceSalto));
    if (Number.isFinite(forma.factorDanioPorSalto)) agregarDato(lista, "Factor por salto", `×${formatearNumero(forma.factorDanioPorSalto)}`);
  }
  seccion.append(lista);
  return seccion;
}

function crearBloqueDetalle(titulo) {
  const seccion = crearElemento("section", "detalle-habilidad-modal__bloque");
  seccion.append(crearElemento("h4", "detalle-habilidad-modal__subtitulo", titulo));
  return seccion;
}

function crearOpcionSelect(valor, texto) {
  const opcion = document.createElement("option");
  opcion.value = valor;
  opcion.textContent = texto;
  return opcion;
}

function obtenerCategoriasOrdenadas(configuracion) {
  return Object.values(configuracion?.categorias ?? {}).sort(
    (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre),
  );
}

function obtenerMaestriasCategoria({ configuracion, resumen, idCategoria }) {
  return Object.values(configuracion?.maestrias ?? {})
    .filter(
      (maestria) =>
        maestria.categoria === idCategoria && Boolean(resumen?.maestrias?.[maestria.id]),
    )
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
}

function nombreCategoria(categoria) {
  if (!categoria) return "";
  return traducirContenido(
    "categoriasHabilidades",
    categoria.id,
    "nombre",
    categoria.nombre ?? categoria.id,
  );
}

function nombreMaestria(idMaestria, definicion) {
  return traducirContenido(
    "maestrias",
    idMaestria,
    "nombre",
    definicion?.nombre ?? idMaestria,
  );
}

function nombreHabilidad(habilidad) {
  if (!habilidad) return "";
  const id = habilidad.id ?? habilidad.idHabilidad;
  return traducirContenido(
    "habilidades",
    id,
    "nombre",
    habilidad.nombre ?? id ?? "",
  );
}

function descripcionHabilidad(habilidad, ejecucion = null) {
  const id = habilidad?.id ?? habilidad?.idHabilidad;
  const respaldo = ejecucion?.descripcion ?? habilidad?.descripcion ?? "";
  return traducirContenido("habilidades", id, "descripcion", respaldo) ||
    traducir("interfaz.habilidades.sinDescripcion", { respaldo: "Sin descripción." });
}

function crearProgresoMaestria({ estado, nivelMaximo }) {
  const bloque = crearElemento("div", "progreso-maestria");
  const maximo = estado.nivel >= nivelMaximo;
  const necesaria = estado.experienciaNecesaria ?? 0;
  const porcentaje =
    maximo || necesaria <= 0
      ? 100
      : Math.min(100, Math.round((estado.experiencia / necesaria) * 100));
  const cabecera = crearElemento("div", "progreso-maestria__cabecera");
  cabecera.append(
    crearElemento(
      "strong",
      "",
      traducir("interfaz.habilidades.nivel", {
        parametros: { nivel: estado.nivel, maximo: nivelMaximo },
        respaldo: `Nivel ${estado.nivel} / ${nivelMaximo}`,
      }),
    ),
    crearElemento(
      "span",
      "",
      maximo
        ? traducir("interfaz.habilidades.nivelMaximo", { respaldo: "Nivel máximo" })
        : traducir("interfaz.habilidades.experienciaProgreso", {
            parametros: { actual: estado.experiencia, necesaria },
            respaldo: `${estado.experiencia} / ${necesaria} XP`,
          }),
    ),
  );
  const barra = crearElemento("div", "progreso-maestria__barra");
  const relleno = crearElemento("div", "progreso-maestria__relleno");
  relleno.style.width = `${porcentaje}%`;
  barra.append(relleno);
  bloque.append(
    cabecera,
    barra,
    crearElemento(
      "small",
      "",
      traducir("interfaz.habilidades.experienciaTotal", {
        parametros: { valor: estado.experienciaTotal },
        respaldo: `Experiencia total acumulada: ${estado.experienciaTotal}`,
      }),
    ),
  );
  return bloque;
}
function formatearDuracionTurnos(valor) {
  const turnos = valor / 100;
  const cantidad = formatearNumero(turnos);
  return turnos === 1 ? `${cantidad} turno` : `${cantidad} turnos`;
}
function obtenerModificadoresPasiva(habilidad, grado) {
  const porGrado = habilidad?.modificadoresPorGrado;
  if (!porGrado || typeof porGrado !== "object") {
    return [];
  }
  const modificadores = porGrado[String(grado)];
  return Array.isArray(modificadores) ? modificadores : [];
}

function formatearDetalleModificadorPasiva(modificador) {
  const objetivo = modificador?.objetivo;
  const operacion = modificador?.operacion;
  const numero = Number(modificador?.valor);
  const condiciones = modificador?.condiciones ?? {};

  if (!Number.isFinite(numero)) {
    return {
      etiqueta: nombreObjetivoModificador(objetivo),
      valor: traducir("interfaz.habilidades.valorInvalido", { respaldo: "valor inválido" }),
    };
  }

  if (objetivo === "atributoHabilidad") {
    return formatearAtributoInternoHabilidad({ operacion, numero, condiciones });
  }
  if (objetivo === "danoHabilidad") {
    return {
      etiqueta: "Daño de habilidad",
      valor: operacion.startsWith("porcentaje_")
        ? `${formatearNumeroConSigno(numero)}%`
        : formatearValorModificador({ operacion, valor: numero }),
    };
  }

  if (operacion === "multiplicar" && objetivo === "factorAtaque") {
    return {
      etiqueta: traducir("interfaz.habilidades.mejoraVelocidadAtaque", { respaldo: "Velocidad de ataque" }),
      valor: formatearPorcentajeBeneficioFactor(numero),
    };
  }
  if (operacion === "multiplicar" && objetivo === "factorMovimiento") {
    return {
      etiqueta: traducir("interfaz.habilidades.mejoraVelocidadMovimiento", { respaldo: "Velocidad de movimiento" }),
      valor: formatearPorcentajeBeneficioFactor(numero),
    };
  }
  if (operacion === "multiplicar" && objetivo === "factorAccion") {
    return {
      etiqueta: traducir("interfaz.habilidades.mejoraVelocidadAccion", { respaldo: "Velocidad de acciones" }),
      valor: formatearPorcentajeBeneficioFactor(numero),
    };
  }
  if (objetivo === "multiplicadorDanioFuente" && operacion === "sumar") {
    const secundaria = condiciones.mano === "secundaria";
    return {
      etiqueta: secundaria
        ? traducir("interfaz.habilidades.mejoraDanioSecundaria", { respaldo: "Daño de mano secundaria" })
        : traducir("interfaz.habilidades.mejoraDanio", { respaldo: "Daño" }),
      valor: `${formatearNumeroConSigno(numero * 100)}%`,
    };
  }
  if (objetivo === "multiplicadorDanioFuente" &&
      (operacion === "porcentaje_base" || operacion === "porcentaje_total")) {
    return {
      etiqueta: traducir("interfaz.habilidades.mejoraDanio", { respaldo: "Daño" }),
      valor: `${formatearNumeroConSigno(numero)}%`,
    };
  }
  if (objetivo === "multiplicadorCritico" && operacion === "sumar") {
    return {
      etiqueta: traducir("interfaz.habilidades.mejoraDanioCritico", { respaldo: "Daño crítico" }),
      valor: `${formatearNumeroConSigno(numero * 100)}%`,
    };
  }

  const objetivosPorcentuales = new Set([
    "probabilidadCritico",
    "probabilidadBloqueo",
    "mitigacionBloqueo",
    "potenciaEfectos",
    "potenciaHabilidad",
    "resistenciaFuego",
    "resistenciaFrio",
    "resistenciaRayo",
    "resistenciaVeneno",
    "resistenciaCongelamiento",
    "resistenciaAturdimiento",
    "resistenciaEnvenenamiento",
    "resistenciaQuemadura",
    "dispersion",
    "penetracionArmadura",
  ]);

  if (operacion === "sumar") {
    return {
      etiqueta: nombreObjetivoModificador(objetivo),
      valor: objetivosPorcentuales.has(objetivo)
        ? `${formatearNumeroConSigno(numero)}%`
        : formatearNumeroConSigno(numero),
    };
  }
  if (operacion === "porcentaje_base" || operacion === "porcentaje_total") {
    return {
      etiqueta: nombreObjetivoModificador(objetivo),
      valor: `${formatearNumeroConSigno(numero)}%`,
    };
  }

  return {
    etiqueta: nombreObjetivoModificador(objetivo),
    valor: formatearValorModificador({ operacion, valor: numero }),
  };
}

function formatearAtributoInternoHabilidad({ operacion, numero, condiciones }) {
  const atributo = condiciones?.atributoHabilidad ?? "atributo";
  const efectoId = condiciones?.efectoIdHabilidad ?? null;
  const nombres = {
    costoMana: "Maná",
    costoTemporal: "Velocidad de lanzamiento",
    alcance: "Alcance",
    radioImpacto: "Radio",
    longitudLinea: "Longitud",
    anchoLinea: "Ancho",
    cantidadObjetivos: "Objetivos máximos",
    alcanceSalto: "Alcance de salto",
    factorDanioPorSalto: "Daño por salto",
    probabilidadEfecto: efectoId ? `Probabilidad de ${formatearNombre(efectoId)}` : "Probabilidad de efecto",
    duracionEfecto: efectoId ? `Duración de ${formatearNombre(efectoId)}` : "Duración de efecto",
    intervaloEfecto: "Intervalo de efecto",
    maximoAcumulacionesEfecto: "Acumulaciones máximas",
    incrementoAcumulacionEfecto: "Incremento de acumulación",
    magnitudModificadorEfecto: "Magnitud de efecto",
    duracionZona: "Duración de zona",
    intervaloZona: "Intervalo de zona",
    radioAura: "Radio de aura",
  };
  let valor;
  if (atributo === "costoTemporal" && operacion === "porcentaje_inverso") {
    valor = `${formatearNumeroConSigno(numero)}%`;
  } else if (["duracionEfecto", "duracionZona", "intervaloEfecto", "intervaloZona"].includes(atributo) && operacion === "sumar") {
    const turnos = numero / 100;
    valor = `${formatearNumeroConSigno(turnos)} ${Math.abs(turnos) === 1 ? "turno" : "turnos"}`;
  } else {
    valor = formatearValorModificador({ operacion, valor: numero });
  }
  return { etiqueta: nombres[atributo] ?? formatearNombre(atributo), valor };
}

function formatearPorcentajeBeneficioFactor(factor) {
  const porcentaje = (1 - factor) * 100;
  return `${formatearNumeroConSigno(porcentaje)}%`;
}

function formatearValorModificador({ operacion, valor }) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    return traducir("interfaz.habilidades.valorInvalido", { respaldo: "valor inválido" });
  }

  if (operacion === "porcentaje_multiplicativo") {
    return `${formatearNumeroConSigno(numero)}% más`;
  }
  if (operacion === "porcentaje_inverso") {
    return `${formatearNumeroConSigno(numero)}% velocidad`;
  }
  if (operacion === "limitar_maximo") {
    return `máximo ${formatearNumero(numero)}`;
  }
  if (operacion === "multiplicar") {
    return `×${formatearNumero(numero)}`;
  }
  if (operacion === "porcentaje_base") {
    return `${formatearNumeroConSigno(numero)}% ${traducir("interfaz.habilidades.sobreBase", { respaldo: "sobre base" })}`;
  }
  if (operacion === "porcentaje_total") {
    return `${formatearNumeroConSigno(numero)}% ${traducir("interfaz.habilidades.sobreTotal", { respaldo: "sobre total" })}`;
  }
  if (operacion === "multiplicar_redondear") {
    return `×${formatearNumero(numero)} (${traducir("interfaz.habilidades.redondeoIntermedio", { respaldo: "redondeo intermedio" })})`;
  }
  if (operacion === "sumar") {
    return formatearNumeroConSigno(numero);
  }
  return `${formatearNombre(operacion)} ${formatearNumeroConSigno(numero)}`;
}

function formatearNumeroConSigno(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return String(valor);
  if (numero > 0) return `+${formatearNumero(numero)}`;
  return formatearNumero(numero);
}

function nombreObjetivoModificador(objetivo) {
  const claves = {
    vidaMaxima: ["interfaz.habilidades.objetivoVidaMaxima", "Vida máxima"],
    manaMaximo: ["interfaz.habilidades.objetivoManaMaximo", "Maná máximo"],
    regeneracionVida: ["interfaz.habilidades.objetivoRegeneracionVida", "Regeneración de Vida"],
    regeneracionMana: ["interfaz.habilidades.objetivoRegeneracionMana", "Regeneración de Maná"],
    precision: ["interfaz.habilidades.objetivoPrecision", "Precisión"],
    evasion: ["interfaz.habilidades.objetivoEvasion", "Evasión"],
    armadura: ["interfaz.habilidades.objetivoArmadura", "Armadura"],
    probabilidadCritico: ["interfaz.habilidades.objetivoProbabilidadCritico", "Probabilidad de crítico"],
    multiplicadorCritico: ["interfaz.habilidades.objetivoMultiplicadorCritico", "Multiplicador crítico"],
    probabilidadBloqueo: ["interfaz.habilidades.objetivoProbabilidadBloqueo", "Probabilidad de bloqueo"],
    mitigacionBloqueo: ["interfaz.habilidades.objetivoMitigacionBloqueo", "Mitigación de bloqueo"],
    potenciaEfectos: ["interfaz.habilidades.objetivoPotenciaEfectos", "Potencia de efectos"],
    potenciaHabilidad: ["interfaz.habilidades.objetivoPotenciaHabilidad", "Potencia de Habilidad"],
    resistenciaFuego: ["interfaz.habilidades.objetivoResistenciaFuego", "Resistencia al Fuego"],
    resistenciaFrio: ["interfaz.habilidades.objetivoResistenciaFrio", "Resistencia al Frío"],
    resistenciaRayo: ["interfaz.habilidades.objetivoResistenciaRayo", "Resistencia al Rayo"],
    resistenciaVeneno: ["interfaz.habilidades.objetivoResistenciaVeneno", "Resistencia al Veneno"],
    resistenciaCongelamiento: ["interfaz.habilidades.objetivoResistenciaCongelamiento", "Resistencia a Congelamiento"],
    resistenciaAturdimiento: ["interfaz.habilidades.objetivoResistenciaAturdimiento", "Resistencia a Aturdimiento"],
    resistenciaEnvenenamiento: ["interfaz.habilidades.objetivoResistenciaEnvenenamiento", "Resistencia a Envenenamiento"],
    resistenciaQuemadura: ["interfaz.habilidades.objetivoResistenciaQuemadura", "Resistencia a Quemadura"],
    resistenciaMental: ["interfaz.habilidades.objetivoResistenciaMental", "Resistencia Mental"],
    dispersion: [null, "Dispersión"],
    penetracionArmadura: [null, "Penetración de Armadura"],
    danoHabilidad: ["interfaz.habilidades.objetivoDanioHabilidad", "Daño de habilidad"],
    atributoHabilidad: ["interfaz.habilidades.objetivoAtributoHabilidad", "Atributo de habilidad"],
    alcanceAtaque: ["interfaz.habilidades.objetivoAlcanceAtaque", "Alcance de ataque"],
    percepcion: ["interfaz.habilidades.objetivoPercepcion", "Percepción"],
    factorTiempo: ["interfaz.habilidades.objetivoFactorTiempo", "Factor de tiempo"],
    factorMovimiento: ["interfaz.habilidades.objetivoFactorMovimiento", "Factor de movimiento"],
    factorAtaque: ["interfaz.habilidades.objetivoFactorAtaque", "Factor de ataque"],
    factorAccion: ["interfaz.habilidades.objetivoFactorAccion", "Factor de acción"],
    factorConsumo: ["interfaz.habilidades.objetivoFactorConsumo", "Factor de consumo"],
    multiplicadorDanioFuente: ["interfaz.habilidades.objetivoMultiplicadorDanioFuente", "Daño de la fuente"],
  };
  const [clave, respaldo] = claves[objetivo] ?? [null, formatearNombre(objetivo)];
  return clave ? traducir(clave, { respaldo }) : respaldo;
}

function mantenerOpcionActivaVisible(selector) {
  if (!(selector instanceof HTMLElement)) return;
  const activa = selector.querySelector(".maestria-selector--activa");
  if (!(activa instanceof HTMLElement)) return;

  const inicioVisible = selector.scrollLeft;
  const finVisible = inicioVisible + selector.clientWidth;
  const inicioOpcion = activa.offsetLeft;
  const finOpcion = inicioOpcion + activa.offsetWidth;

  if (inicioOpcion < inicioVisible) {
    selector.scrollLeft = inicioOpcion;
  } else if (finOpcion > finVisible) {
    selector.scrollLeft = Math.max(0, finOpcion - selector.clientWidth);
  }
}

function crearContador(etiqueta, valor, tipo) {
  const contador = crearElemento(
    "div",
    `contador-puntos contador-puntos--${tipo}`,
  );
  contador.append(
    crearElemento("span", "", etiqueta),
    crearElemento("strong", "", String(valor)),
  );
  return contador;
}
function crearOpcionPunto({ valor, texto, marcado }) {
  const etiqueta = crearElemento("label", "opcion-punto-habilidad");
  const input = document.createElement("input");
  input.type = "radio";
  input.name = "origen-punto-habilidad";
  input.value = valor;
  input.checked = marcado;
  etiqueta.append(input, crearElemento("span", "", texto));
  return etiqueta;
}
function agregarDato(lista, termino, valor) {
  lista.append(
    crearElemento("dt", "", termino),
    crearElemento("dd", "", String(valor)),
  );
}
function agregarInsignia(contenedor, texto, estado) {
  const insignia = crearElemento(
    "span",
    `estado-habilidad estado-habilidad--${estado}`,
    texto,
  );
  contenedor.append(insignia);
}
function mejorarHabilidadJugador(jugador, datos) {
  if (typeof jugador.mejorarHabilidad !== "function") {
    throw new Error("El jugador no expone la mejora canónica de habilidades.");
  }
  return jugador.mejorarHabilidad(datos);
}
function obtenerResumenProgreso(jugador) {
  if (typeof jugador.obtenerResumenProgresoHabilidades !== "function") {
    throw new Error("El jugador no expone su resumen de progreso de habilidades.");
  }
  return jugador.obtenerResumenProgresoHabilidades();
}
function traducirMotivo(motivo) {
  const claves = {
    NIVEL_MAESTRIA_INSUFICIENTE: [
      "interfaz.habilidades.motivoNivelMaestria",
      "La maestría todavía no cumple el requisito.",
    ],
    GRADO_MAXIMO_ALCANZADO: [
      "interfaz.habilidades.motivoGradoMaximo",
      "La habilidad ya alcanzó su grado máximo.",
    ],
    SIN_PUNTOS_UNIVERSALES: [
      "interfaz.habilidades.motivoSinUniversales",
      "No quedan puntos universales.",
    ],
    SIN_PUNTOS_ESPECIFICOS: [
      "interfaz.habilidades.motivoSinEspecificos",
      "No quedan puntos específicos de esa maestría.",
    ],
    PUNTO_DE_OTRA_MAESTRIA: [
      "interfaz.habilidades.motivoPuntoOtraMaestria",
      "El punto específico pertenece a otra maestría.",
    ],
  };
  const [clave, respaldo] = claves[motivo] ?? [];
  if (clave) return traducir(clave, { respaldo });
  return traducir("interfaz.habilidades.motivoOperacion", {
    parametros: { motivo },
    respaldo: `No se pudo completar la operación (${motivo}).`,
  });
}
function formatearDanioBase(componentes) {
  if (!Array.isArray(componentes) || componentes.length === 0) {
    return "—";
  }
  const valoresPorTipo = new Map();
  for (const componente of componentes) {
    const valor = Number(componente?.valorBase);
    if (!Number.isFinite(valor)) {
      continue;
    }
    const tipo = nombreTipoDanio(componente?.tipo);
    valoresPorTipo.set(tipo, (valoresPorTipo.get(tipo) ?? 0) + valor);
  }
  if (valoresPorTipo.size === 0) {
    return "—";
  }
  return [...valoresPorTipo.entries()]
    .map(([tipo, valor]) => `${formatearNumero(valor)} ${tipo}`)
    .join(" + ");
}
function formatearNumero(valor) {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1);
}
function nombreTipoDanio(tipo) {
  const claves = {
    fisico: ["interfaz.habilidades.danioFisico", "Físico"],
    fuego: ["interfaz.personaje.fuego", "Fuego"],
    frio: ["interfaz.personaje.frio", "Frío"],
    rayo: ["interfaz.personaje.rayo", "Rayo"],
    veneno: ["interfaz.personaje.veneno", "Veneno"],
  };
  const [clave, respaldo] = claves[tipo] ?? [null, formatearNombre(tipo ?? "sin tipo")];
  return clave ? traducir(clave, { respaldo }) : respaldo;
}

function nombrePatronAtaque(patron) {
  const claves = {
    adyacente: ["interfaz.habilidades.patronAdyacente", "Adyacente"],
    lineal: ["interfaz.habilidades.patronLineal", "Lineal"],
    libre: ["interfaz.habilidades.patronLibre", "Libre"],
  };
  const [clave, respaldo] = claves[patron] ?? [null, formatearNombre(patron)];
  return clave ? traducir(clave, { respaldo }) : respaldo;
}

function traducirFormaDesplazamientoTactico(forma) {
  const claves = {
    [FORMAS_VISUALES_DESPLAZAMIENTO_TACTICO.MOVIMIENTO]: "interfaz.habilidades.formaMovimiento",
    [FORMAS_VISUALES_DESPLAZAMIENTO_TACTICO.DASH]: "interfaz.habilidades.formaDash",
    [FORMAS_VISUALES_DESPLAZAMIENTO_TACTICO.SALTO]: "interfaz.habilidades.formaSalto",
    [FORMAS_VISUALES_DESPLAZAMIENTO_TACTICO.TELETRANSPORTE]: "interfaz.habilidades.formaTeletransporte",
  };
  const clave = claves[forma];
  return clave ? traducir(clave, { respaldo: formatearNombre(forma) }) : formatearNombre(forma);
}

function traducirEventoEstadoTactico(tipoEvento) {
  const claves = {
    [TIPOS_EVENTO_ESTADO_TACTICO.MOVIMIENTO]: "interfaz.habilidades.eventoMovimiento",
    [TIPOS_EVENTO_ESTADO_TACTICO.ESPERA]: "interfaz.habilidades.eventoEspera",
    [TIPOS_EVENTO_ESTADO_TACTICO.ACCION]: "interfaz.habilidades.eventoAccion",
    [TIPOS_EVENTO_ESTADO_TACTICO.CONSUMO]: "interfaz.habilidades.eventoConsumo",
    [TIPOS_EVENTO_ESTADO_TACTICO.DANIO_RECIBIDO]: "interfaz.habilidades.eventoDanioRecibido",
    [TIPOS_EVENTO_ESTADO_TACTICO.HABILIDAD_EJECUTADA]: "interfaz.habilidades.eventoHabilidadEjecutada",
    [TIPOS_EVENTO_ESTADO_TACTICO.ACCION_EJECUTADA]: "interfaz.habilidades.eventoAccionEjecutada",
  };
  const clave = claves[tipoEvento];
  return clave
    ? traducir(clave, { respaldo: formatearNombre(tipoEvento) })
    : formatearNombre(tipoEvento);
}

function formatearNombre(valor) {
  if (!valor) return "—";
  const texto = String(valor).replaceAll("_", " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
