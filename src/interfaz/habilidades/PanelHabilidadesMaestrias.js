const CATEGORIAS = Object.freeze([
  { id: "magicas", nombre: "Mágicas" },
  { id: "basicas", nombre: "Básicas" },
  { id: "armas", nombre: "Armas" },
  { id: "armaduras", nombre: "Armaduras" },
]);
const ORDEN_MAESTRIAS = Object.freeze(["fuego", "frio", "rayo", "veneno"]);
export class PanelHabilidadesMaestrias {
  constructor({
    sistemaHabilidades,
    jugador,
    configuracionProgreso,
    configuracionEjecucion,
    familiasArmas = [],
    alGuardarCambios = null,
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
    this.familiasArmas = [...new Set(familiasArmas)].sort();
    this.alGuardarCambios = alGuardarCambios;
    this.categoriaActiva = "magicas";
    this.maestriaActiva = "fuego";
    this.idHabilidadSeleccionada = null;
    this.manejadores = [];
    asegurarHojaEstilos();
    this.botonAbrir = this.crearBotonAbrir();
    this.dialogo = this.crearDialogo();
    this.instalarEventosGlobales();
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
  renderizar() {
    const resumen = obtenerResumenProgreso(this.jugador);
    this.renderizarCabecera(resumen);
    this.renderizarNavegacion();
    this.contenido.replaceChildren();
    if (this.categoriaActiva === "magicas") {
      this.renderizarMagicas(resumen);
    } else if (this.categoriaActiva === "basicas") {
      this.renderizarBasicas();
    } else if (this.categoriaActiva === "armas") {
      this.renderizarConstruccion(
        "Maestrías de armas",
        this.familiasArmas,
        "Las familias ya quedan visibles como recordatorio, pero todavía no ganan experiencia ni conceden puntos.",
      );
    } else {
      this.renderizarConstruccion(
        "Maestrías de armaduras",
        ["liviana", "media", "pesada"],
        "La progresión por uso y mitigación de armaduras se diseñará en un hito futuro.",
      );
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
    this.separadorBarra?.remove();
    this.botonAbrir?.remove();
    this.dialogo?.remove();
  }
  crearBotonAbrir() {
    const barra = document.querySelector(
      "#barra-habilidades, .barra-habilidades, [data-barra-habilidades]",
    );
    if (!barra) {
      throw new Error("No se encontró la barra donde ubicar Habilidades.");
    }
    document.getElementById("botonHabilidadesMaestrias")?.remove();
    barra
      .querySelectorAll(".barra-habilidades__separador")
      .forEach((elemento) => elemento.remove());
    const separador = crearElemento("span", "barra-habilidades__separador");
    separador.setAttribute("aria-hidden", "true");
    const boton = crearElemento(
      "button",
      "boton-habilidades-maestrias",
      "Habilidades",
    );
    boton.id = "botonHabilidadesMaestrias";
    boton.type = "button";
    boton.title = "Abrir habilidades y maestrías";
    barra.append(separador, boton);
    this.separadorBarra = separador;
    return boton;
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
      "Progreso del personaje",
    );
    const titulo = crearElemento(
      "h2",
      "panel-habilidades__titulo",
      "Habilidades y maestrías",
    );
    titulo.id = "tituloHabilidadesMaestrias";
    tituloBloque.append(sobreTitulo, titulo);
    this.resumenPuntos = crearElemento("div", "panel-habilidades__puntos");
    const cerrar = crearElemento("button", "panel-habilidades__cerrar", "×");
    cerrar.type = "button";
    cerrar.setAttribute("aria-label", "Cerrar habilidades");
    cabecera.append(tituloBloque, this.resumenPuntos, cerrar);
    const cuerpo = crearElemento("div", "panel-habilidades__cuerpo");
    this.navegacion = crearElemento("nav", "panel-habilidades__navegacion");
    this.navegacion.setAttribute("aria-label", "Categorías de maestrías");
    this.contenido = crearElemento("main", "panel-habilidades__contenido");
    cuerpo.append(this.navegacion, this.contenido);
    this.mensaje = crearElemento("p", "panel-habilidades__mensaje");
    this.mensaje.setAttribute("aria-live", "polite");
    this.capaAccion = crearElemento("div", "panel-habilidades__capa-accion");
    this.capaAccion.hidden = true;
    marco.append(cabecera, cuerpo, this.mensaje, this.capaAccion);
    dialogo.append(marco);
    document.body.append(dialogo);
    this.escuchar(cerrar, "click", () => this.cerrar());
    this.escuchar(dialogo, "cancel", (evento) => {
      evento.preventDefault();
      this.cerrar();
    });
    this.escuchar(dialogo, "click", (evento) => {
      if (evento.target === dialogo) {
        this.cerrar();
      }
    });
    return dialogo;
  }
  instalarEventosGlobales() {
    this.escuchar(this.botonAbrir, "click", () => this.abrir());
    this.escuchar(
      window,
      "keydown",
      (evento) => {
        if (!this.estaAbierto()) {
          return;
        }
        if (evento.key === "Escape") {
          evento.preventDefault();
          evento.stopImmediatePropagation();
          if (!this.capaAccion.hidden) {
            this.cerrarCapaAccion();
          } else {
            this.cerrar();
          }
        }
      },
      true,
    );
  }
  renderizarCabecera(resumen) {
    this.resumenPuntos.replaceChildren(
      crearContador("Universales", resumen.puntosUniversales, "universal"),
      crearContador(
        "Específicos",
        Object.values(resumen.maestrias).reduce(
          (total, maestria) => total + maestria.puntosEspecificos,
          0,
        ),
        "especifico",
      ),
    );
  }
  renderizarNavegacion() {
    this.navegacion.replaceChildren();
    for (const categoria of CATEGORIAS) {
      const boton = crearElemento(
        "button",
        "panel-habilidades__categoria",
        categoria.nombre,
      );
      boton.type = "button";
      boton.classList.toggle(
        "panel-habilidades__categoria--activa",
        categoria.id === this.categoriaActiva,
      );
      boton.addEventListener("click", () => {
        this.categoriaActiva = categoria.id;
        this.idHabilidadSeleccionada = null;
        this.renderizar();
      });
      this.navegacion.append(boton);
    }
  }
  renderizarMagicas(resumen) {
    const selector = crearElemento("div", "maestrias-magicas__selector");
    for (const idMaestria of ORDEN_MAESTRIAS) {
      const definicion = this.configuracionProgreso.maestrias[idMaestria];
      const estado = resumen.maestrias[idMaestria];
      if (!definicion || !estado) {
        continue;
      }
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
        crearElemento("strong", "maestria-selector__nombre", definicion.nombre),
        crearElemento(
          "span",
          "maestria-selector__nivel",
          `Nivel ${estado.nivel} / ${this.configuracionProgreso.reglas.nivelMaximoMaestria}`,
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
      crearElemento("p", "maestria-detalle__categoria", "Maestría mágica"),
      crearElemento("h3", "maestria-detalle__nombre", definicion.nombre),
    );
    const puntos = crearContador(
      "Puntos específicos",
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
    seccion.append(cabecera, progreso, tarjetas);
    this.contenido.append(selector, seccion);
  }
  crearTarjetaHabilidad({ habilidad, estado, resumen }) {
    const ejecucion = this.configuracionEjecucion.habilidades[habilidad.id];
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
      crearElemento("h4", "tarjeta-habilidad__nombre", habilidad.nombre),
      crearElemento(
        "p",
        "tarjeta-habilidad__grado",
        `Grado ${grado} / ${habilidad.gradoMaximo}`,
      ),
    );
    cabecera.append(icono, identidad);
    const insignias = crearElemento("div", "tarjeta-habilidad__estados");
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
      ejecucion?.descripcion ?? "Sin descripción.",
    );
    const requisito = crearElemento(
      "p",
      "tarjeta-habilidad__requisito",
      bloqueada
        ? `Requiere nivel ${habilidad.requisitoNivelMaestria} de la maestría.`
        : `Requisito de maestría cumplido: nivel ${habilidad.requisitoNivelMaestria}.`,
    );
    const detalle = crearDetalleEjecucion({ ejecucion, grado });
    const acciones = crearElemento("div", "tarjeta-habilidad__acciones");
    const botonMejora = crearElemento(
      "button",
      "tarjeta-habilidad__accion tarjeta-habilidad__accion--principal",
      aprendida ? "Mejorar" : "Aprender",
    );
    botonMejora.type = "button";
    botonMejora.disabled = bloqueada || maximo || !tienePuntos;
    botonMejora.addEventListener("click", (evento) => {
      evento.stopPropagation();
      this.abrirConfirmacionMejora({ habilidad, estado, resumen });
    });
    acciones.append(botonMejora);
    if (aprendida && ejecucion?.ejecucion) {
      const botonBarra = crearElemento(
        "button",
        "tarjeta-habilidad__accion",
        asignada
          ? `Quitar de ${indiceAsignado === 9 ? 0 : indiceAsignado + 1}`
          : "Asignar a barra",
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
    if (!ejecucion?.ejecucion) {
      acciones.append(
        crearElemento(
          "span",
          "tarjeta-habilidad__pendiente",
          "Ejecución en construcción",
        ),
      );
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
      habilidad,
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
        `${habilidad.nombre}: grado ${habilidad.grado} → ${gradoNuevo}.`,
      ),
    );
    let obtenerOrigen;
    if (tieneUniversal && tieneEspecifico) {
      const opciones = crearElemento(
        "fieldset",
        "confirmacion-habilidad__opciones",
      );
      opciones.append(crearElemento("legend", "", "Elegí qué punto consumir"));
      opciones.append(
        crearOpcionPunto({
          valor: "especifico",
          texto: `Específico de ${this.maestriaActiva} (${estado.puntosEspecificos} disponibles)`,
          marcado: true,
        }),
        crearOpcionPunto({
          valor: "universal",
          texto: `Universal (${resumen.puntosUniversales} disponibles)`,
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
            ? `Se consumirá 1 punto específico. Quedarán ${estado.puntosEspecificos - 1}.`
            : `Se consumirá 1 punto universal. Quedarán ${resumen.puntosUniversales - 1}.`,
        ),
      );
      obtenerOrigen = () => origen;
    }
    this.abrirCapaAccion({
      titulo:
        habilidad.grado > 0 ? "Confirmar mejora" : "Confirmar aprendizaje",
      cuerpo,
      textoConfirmar:
        habilidad.grado > 0 ? "Mejorar un grado" : "Aprender habilidad",
      alConfirmar: () => {
        const origenPunto = obtenerOrigen();
        if (!origenPunto) {
          throw new Error("Debés elegir el origen del punto.");
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
          `${habilidad.nombre} alcanzó el grado ${resultado.gradoActual}.`,
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
        crearElemento("span", "", ranura.idHabilidad ? ranura.nombre : "Vacía"),
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
      titulo: `Asignar ${habilidad.nombre}`,
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
        `La ranura ${indice === 9 ? 0 : indice + 1} contiene ${ranura.nombre}. Será reemplazada por ${habilidad.nombre}.`,
      ),
      crearElemento(
        "p",
        "confirmacion-habilidad__aviso",
        "La habilidad reemplazada seguirá aprendida, pero quedará sin acceso rápido.",
      ),
    );
    this.abrirCapaAccion({
      titulo: "Confirmar reemplazo",
      cuerpo,
      textoConfirmar: "Reemplazar",
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
        `Quitar ${habilidad.nombre} de la ranura ${indiceAsignado === 9 ? 0 : indiceAsignado + 1}.`,
      ),
      crearElemento(
        "p",
        "confirmacion-habilidad__aviso",
        "No se perderá el grado aprendido.",
      ),
    );
    this.abrirCapaAccion({
      titulo: "Confirmar desasignación",
      cuerpo,
      textoConfirmar: "Quitar de la barra",
      alConfirmar: () => {
        this.sistema.desasignarHabilidad(indiceAsignado);
        this.guardarCambios("barra");
        this.mostrarMensaje(
          `${habilidad.nombre} fue quitada de la barra.`,
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
      `${habilidad.nombre} fue asignada a la ranura ${indice === 9 ? 0 : indice + 1}.`,
      "exito",
    );
    this.renderizar();
  }
  abrirCapaAccion({
    titulo,
    cuerpo,
    textoConfirmar = "Confirmar",
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
    cerrar.setAttribute("aria-label", "Cancelar acción");
    cerrar.addEventListener("click", () => this.cerrarCapaAccion());
    cabecera.append(cerrar);
    const acciones = crearElemento("div", "confirmacion-habilidad__acciones");
    const cancelar = crearElemento("button", "", "Cancelar");
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
          this.mostrarMensaje(error.message, "error");
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
  renderizarBasicas() {
    const seccion = crearElemento("section", "seccion-en-construccion");
    seccion.append(
      crearElemento("p", "seccion-en-construccion__etiqueta", "Básicas"),
      crearElemento("h3", "", "Habilidades generales"),
      crearElemento("p", "", "Todavía no hay habilidades básicas disponibles."),
      crearElemento(
        "p",
        "seccion-en-construccion__detalle",
        "Esta sección queda preparada como recordatorio visual para futuras acciones como Descansar, Investigar y otras dinámicas generales.",
      ),
      crearElemento(
        "strong",
        "seccion-en-construccion__estado",
        "Sección vacía",
      ),
    );
    this.contenido.append(seccion);
  }
  renderizarConstruccion(titulo, familias, descripcion) {
    const seccion = crearElemento("section", "seccion-en-construccion");
    seccion.append(
      crearElemento(
        "p",
        "seccion-en-construccion__etiqueta",
        "Extensión futura",
      ),
      crearElemento("h3", "", titulo),
      crearElemento("p", "", descripcion),
    );
    const lista = crearElemento("div", "familias-en-construccion");
    familias.forEach((familia) => {
      const tarjeta = crearElemento("article", "familia-en-construccion");
      tarjeta.append(
        crearElemento("strong", "", formatearNombre(familia)),
        crearElemento("span", "", "En construcción"),
      );
      lista.append(tarjeta);
    });
    seccion.append(lista);
    this.contenido.append(seccion);
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
    crearElemento("strong", "", `Nivel ${estado.nivel} / ${nivelMaximo}`),
    crearElemento(
      "span",
      "",
      maximo ? "Nivel máximo" : `${estado.experiencia} / ${necesaria} XP`,
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
      `Experiencia total acumulada: ${estado.experienciaTotal}`,
    ),
  );
  return bloque;
}
function crearDetalleEjecucion({ ejecucion, grado }) {
  const lista = crearElemento("dl", "detalle-ejecucion-habilidad");
  if (!ejecucion?.ejecucion) {
    agregarDato(lista, "Lanzamiento", "Pendiente de una etapa de contenido");
    return lista;
  }
  const gradoVisible = grado > 0 ? grado : 1;
  const definicionGrado = ejecucion.ejecucion.grados[gradoVisible];
  lista.classList.add("detalle-ejecucion-habilidad--con-danio");
  agregarDato(lista, "Daño base", formatearDanioBase(definicionGrado?.danio));
  agregarDato(lista, "Maná", definicionGrado?.costoMana ?? "—");
  agregarDato(lista, "Tiempo", definicionGrado?.costoTemporalBase ?? "—");
  agregarDato(lista, "Alcance", definicionGrado?.alcance ?? "—");
  agregarDato(
    lista,
    "Patrón",
    formatearNombre(ejecucion.ejecucion.patronAtaque),
  );
  agregarDato(
    lista,
    "Línea de visión",
    ejecucion.ejecucion.requiereLineaVision ? "Sí" : "No",
  );
  return lista;
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
  if (bloqueada) agregarInsignia(contenedor, "Bloqueada", "bloqueada");
  if (!bloqueada && !aprendida)
    agregarInsignia(contenedor, "Disponible", "disponible");
  if (aprendida) agregarInsignia(contenedor, "Aprendida", "aprendida");
  if (mejorable) agregarInsignia(contenedor, "Mejorable", "mejorable");
  if (maximo) agregarInsignia(contenedor, "Grado máximo", "maximo");
  if (!bloqueada && !maximo && !tienePuntos) {
    agregarInsignia(contenedor, "Sin puntos", "sin-puntos");
  }
  if (asignada) {
    agregarInsignia(
      contenedor,
      `Asignada: ${indiceAsignado === 9 ? 0 : indiceAsignado + 1}`,
      "asignada",
    );
  }
  if (seleccionada) agregarInsignia(contenedor, "Seleccionada", "seleccionada");
}
function crearIconoHabilidad(ejecucion, habilidad) {
  const marco = crearElemento("span", "tarjeta-habilidad__icono");
  const ruta = ejecucion?.icono ?? null;
  const fallback = () => {
    marco.replaceChildren(
      crearElemento("span", "tarjeta-habilidad__inicial", habilidad.nombre[0]),
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
  const lineas = [
    `${habilidad.nombre} — grado ${grado}/${habilidad.gradoMaximo}`,
    `Maestría: ${formatearNombre(habilidad.maestria)} (nivel ${estado.nivel})`,
    `Requisito: nivel ${habilidad.requisitoNivelMaestria}`,
    ejecucion?.descripcion ?? "",
  ];
  if (ejecucion?.ejecucion) {
    const gradoVisible = grado > 0 ? grado : 1;
    const config = ejecucion.ejecucion.grados[gradoVisible];
    lineas.push(
      `Daño base: ${formatearDanioBase(config.danio)}`,
      `Maná: ${config.costoMana}`,
      `Tiempo: ${config.costoTemporalBase}`,
      `Alcance: ${config.alcance}`,
      `Patrón: ${formatearNombre(ejecucion.ejecucion.patronAtaque)}`,
      `Línea de visión: ${ejecucion.ejecucion.requiereLineaVision ? "sí" : "no"}`,
    );
  } else {
    lineas.push("Ejecución jugable: en construcción");
  }
  if (asignada) {
    lineas.push(`Ranura: ${indiceAsignado === 9 ? 0 : indiceAsignado + 1}`);
  }
  return lineas.filter(Boolean).join("\n");
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
  if (typeof jugador.mejorarHabilidad === "function") {
    return jugador.mejorarHabilidad(datos);
  }
  const progreso = jugador.progresoMagico ?? jugador.progresoMagicoJugador;
  if (typeof progreso?.mejorarHabilidad === "function") {
    return progreso.mejorarHabilidad(datos);
  }
  throw new Error("El jugador no expone la mejora de habilidades.");
}
function obtenerResumenProgreso(jugador) {
  if (typeof jugador.obtenerResumenProgresoMagico === "function") {
    return jugador.obtenerResumenProgresoMagico();
  }
  const progreso = jugador.progresoMagico ?? jugador.progresoMagicoJugador;
  if (typeof progreso?.obtenerResumen === "function") {
    return progreso.obtenerResumen();
  }
  throw new Error("El jugador no expone su resumen de progreso mágico.");
}
function traducirMotivo(motivo) {
  const mensajes = {
    NIVEL_MAESTRIA_INSUFICIENTE: "La maestría todavía no cumple el requisito.",
    GRADO_MAXIMO_ALCANZADO: "La habilidad ya alcanzó su grado máximo.",
    SIN_PUNTOS_UNIVERSALES: "No quedan puntos universales.",
    SIN_PUNTOS_ESPECIFICOS: "No quedan puntos específicos de esa maestría.",
    PUNTO_DE_OTRA_MAESTRIA: "El punto específico pertenece a otra maestría.",
  };
  return mensajes[motivo] ?? `No se pudo completar la operación (${motivo}).`;
}
function asegurarHojaEstilos() {
  if (document.getElementById("estilosHabilidadesMaestrias")) {
    return;
  }
  const enlace = document.createElement("link");
  enlace.id = "estilosHabilidadesMaestrias";
  enlace.rel = "stylesheet";
  enlace.href = "./assets/estilos/paneles/habilidades-maestrias.css";
  document.head.append(enlace);
}
function crearElemento(etiqueta, clase = "", texto = "") {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== "") elemento.textContent = texto;
  return elemento;
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
    const tipo = formatearNombre(componente?.tipo ?? "sin tipo");
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
function formatearNombre(valor) {
  if (!valor) return "—";
  const texto = String(valor).replaceAll("_", " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
