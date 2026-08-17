import { asegurarHojaEstilos, crearElemento } from "../dom/UtilidadesDom.js";
import { traducir, traducirContenido } from "../idiomas/ContextoIdioma.js";

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
    this.manejadores = [];
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
    const resumen = obtenerResumenProgreso(this.jugador);
    this.asegurarSeleccionValida(resumen);
    this.renderizarCabecera(resumen);
    this.renderizarNavegacion();
    this.contenido.replaceChildren();
    this.renderizarCategoria(resumen);
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
    const tarjetas = crearElemento("div", "lista-habilidades-maestria");
    const habilidades = Object.values(resumen.habilidades)
      .filter((habilidad) => habilidad.maestria === idMaestria)
      .sort(
        (a, b) =>
          a.requisitoNivelMaestria - b.requisitoNivelMaestria ||
          a.nombre.localeCompare(b.nombre),
      );
    habilidades.forEach((habilidad) => {
      tarjetas.append(
        this.crearTarjetaHabilidad({ habilidad, estado, resumen }),
      );
    });
    if (habilidades.length === 0) {
      tarjetas.append(
        crearElemento(
          "p",
          "seccion-en-construccion__detalle",
          traducir("interfaz.habilidades.categoriaVacia", {
            respaldo: "No hay habilidades configuradas en esta maestría.",
          }),
        ),
      );
    }
    seccion.append(cabecera, progreso, tarjetas);
    this.contenido.append(selector, seccion);
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
  crearTarjetaHabilidad({ habilidad, estado, resumen }) {
    const ejecucion = this.configuracionEjecucion.habilidades[habilidad.id];
    const definicionHabilidad = this.configuracionProgreso.habilidades[habilidad.id];
    if (!definicionHabilidad) {
      throw new Error(
        `La habilidad "${habilidad.id}" no existe en la configuración canónica de progreso.`,
      );
    }
    const habilidadPresentacion = {
      id: habilidad.id,
      ...definicionHabilidad,
    };
    const grado = habilidad.grado;
    const bloqueada = estado.nivel < habilidad.requisitoNivelMaestria;
    const aprendida = grado > 0;
    const maximo = grado >= habilidad.gradoMaximo;
    const tieneUniversal = resumen.puntosUniversales > 0;
    const tieneEspecifico = estado.puntosEspecificos > 0;
    const tienePuntos = tieneUniversal || tieneEspecifico;
    const mejorable = !bloqueada && !maximo && tienePuntos;
    const indiceAsignado = this.sistema
      .obtenerEstadoBarra()
      .findIndex((ranura) => ranura.idHabilidad === habilidad.id);
    const asignada = indiceAsignado >= 0;
    const seleccionada = this.idHabilidadSeleccionada === habilidad.id;
    const tarjeta = crearElemento("article", "tarjeta-habilidad");
    tarjeta.dataset.idHabilidad = habilidad.id;
    tarjeta.classList.toggle("tarjeta-habilidad--bloqueada", bloqueada);
    tarjeta.classList.toggle("tarjeta-habilidad--aprendida", aprendida);
    tarjeta.classList.toggle("tarjeta-habilidad--mejorable", mejorable);
    tarjeta.classList.toggle("tarjeta-habilidad--maximo", maximo);
    tarjeta.classList.toggle(
      "tarjeta-habilidad--sin-puntos",
      !bloqueada && !maximo && !tienePuntos,
    );
    tarjeta.classList.toggle("tarjeta-habilidad--asignada", asignada);
    tarjeta.classList.toggle("tarjeta-habilidad--seleccionada", seleccionada);
    tarjeta.addEventListener("click", () => {
      this.idHabilidadSeleccionada = habilidad.id;
      this.renderizar();
    });
    const cabecera = crearElemento("div", "tarjeta-habilidad__cabecera");
    const icono = crearIconoHabilidad(ejecucion, habilidad);
    const identidad = crearElemento("div", "tarjeta-habilidad__identidad");
    identidad.append(
      crearElemento("h4", "tarjeta-habilidad__nombre", nombreHabilidad(habilidad)),
      crearElemento(
        "p",
        "tarjeta-habilidad__grado",
        traducir("interfaz.habilidades.grado", {
          parametros: { grado, maximo: habilidad.gradoMaximo },
          respaldo: `Grado ${grado} / ${habilidad.gradoMaximo}`,
        }),
      ),
    );
    cabecera.append(icono, identidad);
    const insignias = crearElemento("div", "tarjeta-habilidad__estados");
    agregarInsignia(
      insignias,
      habilidad.tipo === "pasiva"
        ? traducir("interfaz.habilidades.tipoPasiva", { respaldo: "Pasiva" })
        : traducir("interfaz.habilidades.tipoActiva", { respaldo: "Activa" }),
      habilidad.tipo === "pasiva" ? "tipo-pasiva" : "tipo-activa",
    );
    crearEstadosVisuales({
      contenedor: insignias,
      bloqueada,
      aprendida,
      mejorable,
      maximo,
      tienePuntos,
      asignada,
      seleccionada,
      indiceAsignado,
    });
    const descripcion = crearElemento(
      "p",
      "tarjeta-habilidad__descripcion",
      descripcionHabilidad(habilidad, ejecucion),
    );
    const requisito = crearElemento(
      "p",
      "tarjeta-habilidad__requisito",
      bloqueada
        ? traducir("interfaz.habilidades.requiereNivel", {
            parametros: { nivel: habilidad.requisitoNivelMaestria },
            respaldo: `Requiere nivel ${habilidad.requisitoNivelMaestria} de la maestría.`,
          })
        : traducir("interfaz.habilidades.requisitoCumplido", {
            parametros: { nivel: habilidad.requisitoNivelMaestria },
            respaldo: `Requisito de maestría cumplido: nivel ${habilidad.requisitoNivelMaestria}.`,
          }),
    );
    const detalle = crearDetalleEjecucion({
      ejecucion,
      habilidad: habilidadPresentacion,
      grado,
      tipo: habilidad.tipo,
      catalogoEfectos: this.configuracionEjecucion.efectos ?? {},
    });
    const acciones = crearElemento("div", "tarjeta-habilidad__acciones");
    const botonMejora = crearElemento(
      "button",
      "tarjeta-habilidad__accion tarjeta-habilidad__accion--principal",
      aprendida
        ? traducir("interfaz.habilidades.mejorar", { respaldo: "Mejorar" })
        : traducir("interfaz.habilidades.aprender", { respaldo: "Aprender" }),
    );
    botonMejora.type = "button";
    botonMejora.disabled = bloqueada || maximo || !tienePuntos;
    botonMejora.addEventListener("click", (evento) => {
      evento.stopPropagation();
      this.abrirConfirmacionMejora({ habilidad, estado, resumen });
    });
    acciones.append(botonMejora);
    if (aprendida && habilidad.tipo === "activa" && ejecucion?.ejecucion) {
      const botonBarra = crearElemento(
        "button",
        "tarjeta-habilidad__accion",
        asignada
          ? traducir("interfaz.habilidades.quitarRanura", {
              parametros: { ranura: indiceAsignado === 9 ? 0 : indiceAsignado + 1 },
              respaldo: `Quitar de ${indiceAsignado === 9 ? 0 : indiceAsignado + 1}`,
            })
          : traducir("interfaz.habilidades.asignarBarra", { respaldo: "Asignar a barra" }),
      );
      botonBarra.type = "button";
      botonBarra.addEventListener("click", (evento) => {
        evento.stopPropagation();
        if (asignada) {
          this.abrirConfirmacionQuitar({ habilidad, indiceAsignado });
        } else {
          this.abrirSelectorRanura(habilidad);
        }
      });
      acciones.append(botonBarra);
    }
    tarjeta.append(
      cabecera,
      insignias,
      descripcion,
      requisito,
      detalle,
      acciones,
    );
    tarjeta.title = crearTooltipTexto({
      habilidad: habilidadPresentacion,
      ejecucion,
      grado,
      estado,
      asignada,
      indiceAsignado,
    });
    return tarjeta;
  }
  abrirConfirmacionMejora({ habilidad, estado, resumen }) {
    const tieneUniversal = resumen.puntosUniversales > 0;
    const tieneEspecifico = estado.puntosEspecificos > 0;
    const gradoNuevo = habilidad.grado + 1;
    const cuerpo = crearElemento("div", "confirmacion-habilidad__cuerpo");
    cuerpo.append(
      crearElemento(
        "p",
        "confirmacion-habilidad__resumen",
        traducir("interfaz.habilidades.resumenGrado", {
          parametros: {
            habilidad: nombreHabilidad(habilidad),
            actual: habilidad.grado,
            nuevo: gradoNuevo,
          },
          respaldo: `${habilidad.nombre}: grado ${habilidad.grado} → ${gradoNuevo}.`,
        }),
      ),
    );
    let obtenerOrigen;
    if (tieneUniversal && tieneEspecifico) {
      const opciones = crearElemento(
        "fieldset",
        "confirmacion-habilidad__opciones",
      );
      opciones.append(
        crearElemento(
          "legend",
          "",
          traducir("interfaz.habilidades.elegirPuntoConsumir", {
            respaldo: "Elegí qué punto consumir",
          }),
        ),
      );
      opciones.append(
        crearOpcionPunto({
          valor: "especifico",
          texto: traducir("interfaz.habilidades.puntoEspecificoDisponible", {
            parametros: {
              maestria: nombreMaestria(
                this.maestriaActiva,
                this.configuracionProgreso.maestrias[this.maestriaActiva],
              ),
              cantidad: estado.puntosEspecificos,
            },
            respaldo: `Específico de ${this.maestriaActiva} (${estado.puntosEspecificos} disponibles)`,
          }),
          marcado: true,
        }),
        crearOpcionPunto({
          valor: "universal",
          texto: traducir("interfaz.habilidades.puntoUniversalDisponible", {
            parametros: { cantidad: resumen.puntosUniversales },
            respaldo: `Universal (${resumen.puntosUniversales} disponibles)`,
          }),
          marcado: false,
        }),
      );
      cuerpo.append(opciones);
      obtenerOrigen = () =>
        opciones.querySelector('input[name="origen-punto-habilidad"]:checked')
          ?.value ?? null;
    } else {
      const origen = tieneEspecifico ? "especifico" : "universal";
      cuerpo.append(
        crearElemento(
          "p",
          "confirmacion-habilidad__origen",
          origen === "especifico"
            ? traducir("interfaz.habilidades.consumiraEspecifico", { parametros: { cantidad: estado.puntosEspecificos - 1 }, respaldo: `Se consumirá 1 punto específico. Quedarán ${estado.puntosEspecificos - 1}.` })
            : traducir("interfaz.habilidades.consumiraUniversal", { parametros: { cantidad: resumen.puntosUniversales - 1 }, respaldo: `Se consumirá 1 punto universal. Quedarán ${resumen.puntosUniversales - 1}.` }),
        ),
      );
      obtenerOrigen = () => origen;
    }
    this.abrirCapaAccion({
      titulo:
        habilidad.grado > 0 ? traducir("interfaz.habilidades.confirmarMejora", { respaldo: "Confirmar mejora" }) : traducir("interfaz.habilidades.confirmarAprendizaje", { respaldo: "Confirmar aprendizaje" }),
      cuerpo,
      textoConfirmar:
        habilidad.grado > 0 ? traducir("interfaz.habilidades.mejorarGrado", { respaldo: "Mejorar un grado" }) : traducir("interfaz.habilidades.aprenderHabilidad", { respaldo: "Aprender habilidad" }),
      alConfirmar: () => {
        const origenPunto = obtenerOrigen();
        if (!origenPunto) {
          throw new Error(traducir("interfaz.habilidades.elegirOrigen", { respaldo: "Debés elegir el origen del punto." }));
        }
        const resultado = mejorarHabilidadJugador(this.jugador, {
          idHabilidad: habilidad.id,
          origenPunto,
          idMaestriaPunto:
            origenPunto === "especifico" ? habilidad.maestria : null,
        });
        if (!resultado.exito) {
          this.mostrarMensaje(traducirMotivo(resultado.motivo), "error");
          return false;
        }
        this.guardarCambios("progreso");
        this.mostrarMensaje(
          traducir("interfaz.habilidades.gradoAlcanzado", {
            parametros: { habilidad: nombreHabilidad(habilidad), grado: resultado.gradoActual },
            respaldo: `${habilidad.nombre} alcanzó el grado ${resultado.gradoActual}.`,
          }),
          "exito",
        );
        this.renderizar();
        return true;
      },
    });
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
  }) {
    this.capaAccion.replaceChildren();
    this.capaAccion.hidden = false;
    const tarjeta = crearElemento("section", "confirmacion-habilidad");
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
function crearDetalleEjecucion({ ejecucion, habilidad, grado, tipo, catalogoEfectos = {} }) {
  const lista = crearElemento("dl", "detalle-ejecucion-habilidad");
  if (tipo === "pasiva") {
    const gradoVisible = grado > 0 ? grado : 1;
    const modificadores = obtenerModificadoresPasiva(habilidad, gradoVisible);
    lista.classList.add("detalle-ejecucion-habilidad--pasiva");

    if (modificadores.length === 0) {
      agregarDato(
        lista,
        traducir("interfaz.habilidades.efecto", { respaldo: "Efecto" }),
        traducir("interfaz.habilidades.sinModificadoresPasiva", {
          respaldo: "Sin modificadores configurados",
        }),
      );
      return lista;
    }

    modificadores.forEach((modificador) => {
      const detalle = formatearDetalleModificadorPasiva(modificador);
      agregarDato(lista, detalle.etiqueta, detalle.valor);
    });

    return lista;
  }
  if (!ejecucion?.ejecucion) {
    return lista;
  }
  const gradoVisible = grado > 0 ? grado : 1;
  const definicionGrado = ejecucion.ejecucion.grados[gradoVisible];
  lista.classList.add("detalle-ejecucion-habilidad--con-danio");
  agregarDato(
    lista,
    traducir("interfaz.habilidades.danioBase", { respaldo: "Daño base" }),
    formatearDanioBase(definicionGrado?.danio),
  );
  agregarDato(
    lista,
    traducir("interfaz.habilidades.manaEtiqueta", { respaldo: "Maná" }),
    definicionGrado?.costoMana ?? "—",
  );
  agregarDato(
    lista,
    traducir("interfaz.habilidades.tiempo", { respaldo: "Tiempo" }),
    definicionGrado?.costoTemporalBase ?? "—",
  );
  agregarDato(
    lista,
    traducir("interfaz.habilidades.alcance", { respaldo: "Alcance" }),
    definicionGrado?.alcance ?? "—",
  );
  agregarDato(
    lista,
    traducir("interfaz.habilidades.patron", { respaldo: "Patrón" }),
    nombrePatronAtaque(ejecucion.ejecucion.patronAtaque),
  );
  agregarDato(
    lista,
    traducir("interfaz.habilidades.lineaVision", { respaldo: "Línea de visión" }),
    ejecucion.ejecucion.requiereLineaVision
      ? traducir("interfaz.habilidades.si", { respaldo: "Sí" })
      : traducir("interfaz.habilidades.no", { respaldo: "No" }),
  );
  agregarDetallesEfectosActivos(lista, definicionGrado, catalogoEfectos);
  return lista;
}

function agregarDetallesEfectosActivos(lista, definicionGrado, catalogoEfectos) {
  const efectos = Array.isArray(definicionGrado?.efectos)
    ? definicionGrado.efectos
    : [];
  for (const efecto of efectos) {
    const definicionEfecto = catalogoEfectos?.[efecto.efectoId] ?? null;
    const modificadores = Array.isArray(efecto.modificadores)
      ? efecto.modificadores
      : [];
    for (const modificador of modificadores) {
      const detalle = formatearDetalleModificadorPasiva(modificador);
      agregarDato(lista, detalle.etiqueta, detalle.valor);
    }

    if (definicionEfecto?.tipo === "bloqueo_habilidades") {
      agregarDato(
        lista,
        traducir("interfaz.habilidades.efecto", { respaldo: "Efecto" }),
        traducir("interfaz.habilidades.bloqueaHabilidadesActivas", {
          respaldo: "Bloquea habilidades activas",
        }),
      );
    }

    const esMaldicion = definicionEfecto?.etiquetas?.includes("maldicion") === true;
    if (Number.isFinite(efecto.probabilidadBase) &&
        (esMaldicion || efecto.probabilidadBase !== 100)) {
      agregarDato(
        lista,
        traducir("interfaz.habilidades.probabilidad", { respaldo: "Probabilidad" }),
        `${formatearNumero(efecto.probabilidadBase)}%`,
      );
    }
    if (Number.isFinite(efecto.duracion)) {
      agregarDato(
        lista,
        traducir("interfaz.habilidades.duracion", { respaldo: "Duración" }),
        formatearDuracionTurnos(efecto.duracion),
      );
    }
    if (Number.isFinite(efecto.emision?.radio)) {
      agregarDato(
        lista,
        traducir("interfaz.habilidades.radioAura", { respaldo: "Radio de aura" }),
        formatearNumero(efecto.emision.radio),
      );
    }
  }
}

function formatearDuracionTurnos(valor) {
  const turnos = valor / 100;
  const cantidad = formatearNumero(turnos);
  return turnos === 1 ? `${cantidad} turno` : `${cantidad} turnos`;
}
function crearEstadosVisuales({
  contenedor,
  bloqueada,
  aprendida,
  mejorable,
  maximo,
  tienePuntos,
  asignada,
  seleccionada,
  indiceAsignado,
}) {
  if (bloqueada) agregarInsignia(contenedor, traducir("interfaz.habilidades.bloqueada", { respaldo: "Bloqueada" }), "bloqueada");
  if (!bloqueada && !aprendida)
    agregarInsignia(contenedor, traducir("interfaz.habilidades.disponible", { respaldo: "Disponible" }), "disponible");
  if (aprendida) agregarInsignia(contenedor, traducir("interfaz.habilidades.aprendida", { respaldo: "Aprendida" }), "aprendida");
  if (mejorable) agregarInsignia(contenedor, traducir("interfaz.habilidades.mejorable", { respaldo: "Mejorable" }), "mejorable");
  if (maximo) agregarInsignia(contenedor, traducir("interfaz.habilidades.gradoMaximo", { respaldo: "Grado máximo" }), "maximo");
  if (!bloqueada && !maximo && !tienePuntos) {
    agregarInsignia(contenedor, traducir("interfaz.habilidades.sinPuntos", { respaldo: "Sin puntos" }), "sin-puntos");
  }
  if (asignada) {
    agregarInsignia(
      contenedor,
      traducir("interfaz.habilidades.asignada", {
        parametros: { ranura: indiceAsignado === 9 ? 0 : indiceAsignado + 1 },
        respaldo: `Asignada: ${indiceAsignado === 9 ? 0 : indiceAsignado + 1}`,
      }),
      "asignada",
    );
  }
  if (seleccionada) agregarInsignia(contenedor, traducir("interfaz.habilidades.seleccionada", { respaldo: "Seleccionada" }), "seleccionada");
}
function crearIconoHabilidad(ejecucion, habilidad) {
  const marco = crearElemento("span", "tarjeta-habilidad__icono");
  const ruta = ejecucion?.icono ?? null;
  const fallback = () => {
    marco.replaceChildren(
      crearElemento("span", "tarjeta-habilidad__inicial", nombreHabilidad(habilidad)[0]),
    );
  };
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
function crearTooltipTexto({
  habilidad,
  ejecucion,
  grado,
  estado,
  asignada,
  indiceAsignado,
}) {
  const nombreMaestriaVisible = traducirContenido(
    "maestrias",
    habilidad.maestria,
    "nombre",
    formatearNombre(habilidad.maestria),
  );
  const lineas = [
    `${nombreHabilidad(habilidad)} — ${traducir("interfaz.habilidades.grado", { parametros: { grado, maximo: habilidad.gradoMaximo }, respaldo: `grado ${grado}/${habilidad.gradoMaximo}` })}`,
    traducir("interfaz.habilidades.tooltipMaestria", {
      parametros: { maestria: nombreMaestriaVisible, nivel: estado.nivel },
      respaldo: `Maestría: ${nombreMaestriaVisible} (nivel ${estado.nivel})`,
    }),
    traducir("interfaz.habilidades.tooltipRequisito", {
      parametros: { nivel: habilidad.requisitoNivelMaestria },
      respaldo: `Requisito: nivel ${habilidad.requisitoNivelMaestria}`,
    }),
    descripcionHabilidad(habilidad, ejecucion),
  ];
  if (ejecucion?.ejecucion) {
    const gradoVisible = grado > 0 ? grado : 1;
    const config = ejecucion.ejecucion.grados[gradoVisible];
    lineas.push(
      traducir("interfaz.habilidades.tooltipDanioBase", {
        parametros: { valor: formatearDanioBase(config.danio) },
        respaldo: `Daño base: ${formatearDanioBase(config.danio)}`,
      }),
      traducir("interfaz.habilidades.mana", {
        parametros: { valor: config.costoMana },
        respaldo: `Maná: ${config.costoMana}`,
      }),
      traducir("interfaz.habilidades.tooltipTiempo", {
        parametros: { valor: config.costoTemporalBase },
        respaldo: `Tiempo: ${config.costoTemporalBase}`,
      }),
      traducir("interfaz.habilidades.tooltipAlcance", {
        parametros: { valor: config.alcance },
        respaldo: `Alcance: ${config.alcance}`,
      }),
      traducir("interfaz.habilidades.tooltipPatron", {
        parametros: { patron: nombrePatronAtaque(ejecucion.ejecucion.patronAtaque) },
        respaldo: `Patrón: ${nombrePatronAtaque(ejecucion.ejecucion.patronAtaque)}`,
      }),
      traducir("interfaz.habilidades.tooltipLineaVision", {
        parametros: {
          valor: ejecucion.ejecucion.requiereLineaVision
            ? traducir("interfaz.habilidades.si", { respaldo: "sí" })
            : traducir("interfaz.habilidades.no", { respaldo: "no" }),
        },
        respaldo: `Línea de visión: ${ejecucion.ejecucion.requiereLineaVision ? "sí" : "no"}`,
      }),
    );
  } else if (habilidad.tipo === "pasiva") {
    const gradoVisible = grado > 0 ? grado : 1;
    const modificadores = obtenerModificadoresPasiva(habilidad, gradoVisible);
    lineas.push(
      ...modificadores.map((modificador) => {
        const detalle = formatearDetalleModificadorPasiva(modificador);
        return `${detalle.etiqueta}: ${detalle.valor}`;
      }),
    );
  }
  if (asignada) {
    lineas.push(
      traducir("interfaz.habilidades.ranura", {
        parametros: { ranura: indiceAsignado === 9 ? 0 : indiceAsignado + 1 },
        respaldo: `Ranura: ${indiceAsignado === 9 ? 0 : indiceAsignado + 1}`,
      }),
    );
  }
  return lineas.filter(Boolean).join("\n");
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

function formatearNombre(valor) {
  if (!valor) return "—";
  const texto = String(valor).replaceAll("_", " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
