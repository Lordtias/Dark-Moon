// Interruptor temporal del panel.
//
// El sistema de tiempo continúa funcionando,
// pero su representación visual queda apagada
// hasta que su diseño resulte más claro.
const PANEL_ORDEN_TEMPORAL_ACTIVO = false;

// Identificador utilizado para evitar cargar
// varias veces la hoja de estilos del panel.
const ID_ESTILOS_ORDEN_TEMPORAL = "estilosOrdenTemporal";

// Ruta de la hoja de estilos específica.
const RUTA_ESTILOS_ORDEN_TEMPORAL = "./panel-tiempo.css";

// Cantidad predeterminada
// de actores visibles.
const MAXIMO_ACTORES_PREDETERMINADO = 8;

// Representa visualmente el estado actual
// de la agenda temporal.
//
// Aunque el panel esté apagado, conservamos
// la clase completa para poder recuperarla
// sin reconstruirla desde cero.
export class PanelOrdenTemporal {
  constructor({
    referenciaInsercion,
    maximoActores = MAXIMO_ACTORES_PREDETERMINADO,
  } = {}) {
    this.activo = PANEL_ORDEN_TEMPORAL_ACTIVO;

    this.maximoActores = maximoActores;

    this.contenedor = null;

    this.textoTiempo = null;

    this.lista = null;

    this.mensajeAdicional = null;

    // Cuando el interruptor está apagado
    // no creamos elementos, no cargamos CSS
    // y no modificamos la cuadrícula.
    if (!this.activo) {
      document.getElementById("panelOrdenTemporal")?.remove();

      document.getElementById(ID_ESTILOS_ORDEN_TEMPORAL)?.remove();

      return;
    }

    if (
      !referenciaInsercion ||
      typeof referenciaInsercion.insertAdjacentElement !== "function"
    ) {
      throw new Error(
        "PanelOrdenTemporal necesita un elemento " + "de referencia válido.",
      );
    }

    if (!Number.isInteger(maximoActores) || maximoActores <= 0) {
      throw new Error(
        "El máximo de actores temporales debe " + "ser un entero mayor que 0.",
      );
    }

    this.asegurarHojaEstilos();

    document.getElementById("panelOrdenTemporal")?.remove();

    this.contenedor = document.createElement("section");

    this.contenedor.id = "panelOrdenTemporal";

    this.contenedor.classList.add("panel-juego", "panel-orden-temporal");

    this.contenedor.setAttribute("aria-label", "Próximas acciones");

    const cabecera = document.createElement("div");

    cabecera.classList.add("cabecera-orden-temporal");

    const bloqueTitulo = document.createElement("div");

    bloqueTitulo.classList.add("bloque-titulo-orden-temporal");

    const titulo = document.createElement("h2");

    titulo.textContent = "Orden temporal";

    const descripcion = document.createElement("p");

    descripcion.classList.add("descripcion-orden-temporal");

    descripcion.textContent = "Próxima disponibilidad real de cada actor.";

    bloqueTitulo.append(titulo, descripcion);

    this.textoTiempo = document.createElement("span");

    this.textoTiempo.classList.add("tiempo-mundo");

    this.textoTiempo.textContent = "Tiempo 0";

    cabecera.append(bloqueTitulo, this.textoTiempo);

    this.lista = document.createElement("ol");

    this.lista.classList.add("lista-orden-temporal");

    this.lista.setAttribute("aria-live", "polite");

    this.mensajeAdicional = document.createElement("p");

    this.mensajeAdicional.classList.add(
      "mensaje-actores-adicionales",
      "oculto",
    );

    this.contenedor.append(cabecera, this.lista, this.mensajeAdicional);

    referenciaInsercion.insertAdjacentElement("afterend", this.contenedor);
  }

  // Agrega la hoja de estilos únicamente
  // cuando todavía no existe.
  asegurarHojaEstilos() {
    if (document.getElementById(ID_ESTILOS_ORDEN_TEMPORAL)) {
      return;
    }

    const enlace = document.createElement("link");

    enlace.id = ID_ESTILOS_ORDEN_TEMPORAL;

    enlace.rel = "stylesheet";

    enlace.href = RUTA_ESTILOS_ORDEN_TEMPORAL;

    document.head.appendChild(enlace);
  }

  // Actualiza la agenda temporal visible.
  //
  // Cuando el panel está apagado,
  // la operación termina inmediatamente.
  actualizar(juego) {
    if (!this.activo) {
      return;
    }

    if (
      !juego ||
      !juego.sistemaTiempo ||
      typeof juego.sistemaTiempo.obtenerOrdenActual !== "function"
    ) {
      throw new Error(
        "PanelOrdenTemporal necesita una partida " +
          "con un sistema de tiempo válido.",
      );
    }

    const tiempoActual = juego.sistemaTiempo.tiempoActual;

    this.textoTiempo.textContent = `Tiempo ${tiempoActual}`;

    const agenda = juego.sistemaTiempo
      .obtenerOrdenActual()
      .filter(
        (registro) => registro.actor && registro.actor.estaVivo !== false,
      );

    this.lista.replaceChildren();

    if (agenda.length === 0) {
      this.mostrarAgendaVacia();
      return;
    }

    const registrosVisibles = agenda.slice(0, this.maximoActores);

    const fragmento = document.createDocumentFragment();

    registrosVisibles.forEach((registro, indice) => {
      fragmento.appendChild(
        this.crearElementoActor({
          registro,
          indice,
          juego,
          tiempoActual,
        }),
      );
    });

    this.lista.appendChild(fragmento);

    this.actualizarMensajeAdicional(agenda.length - registrosVisibles.length);
  }

  crearElementoActor({ registro, indice, juego, tiempoActual }) {
    const { actor, proximoTurno } = registro;

    const esJugador = actor === juego.player;

    const diferenciaTemporal = Math.max(0, proximoTurno - tiempoActual);

    const elemento = document.createElement("li");

    elemento.classList.add(
      "actor-orden-temporal",

      esJugador
        ? "actor-orden-temporal--jugador"
        : "actor-orden-temporal--enemigo",
    );

    if (indice === 0 && diferenciaTemporal === 0) {
      elemento.classList.add("actor-orden-temporal--actual");
    }

    const posicion = document.createElement("span");

    posicion.classList.add("posicion-orden-temporal");

    posicion.textContent = `${indice + 1}`;

    const simbolo = document.createElement("span");

    simbolo.classList.add("simbolo-orden-temporal");

    simbolo.textContent = actor.simbolo ?? "?";

    const datos = document.createElement("span");

    datos.classList.add("datos-actor-temporal");

    const nombre = document.createElement("strong");

    nombre.textContent = esJugador ? `${actor.nombre} (vos)` : actor.nombre;

    const detalle = document.createElement("span");

    detalle.textContent = this.crearTextoDiferencia({
      indice,
      diferenciaTemporal,
    });

    datos.append(nombre, detalle);

    elemento.append(posicion, simbolo, datos);

    elemento.title = this.crearDescripcionActor({
      actor,
      esJugador,
      proximoTurno,
      diferenciaTemporal,
    });

    elemento.setAttribute("aria-label", elemento.title);

    return elemento;
  }

  crearTextoDiferencia({ indice, diferenciaTemporal }) {
    if (diferenciaTemporal === 0 && indice === 0) {
      return "Ahora";
    }

    if (diferenciaTemporal === 0) {
      return "Mismo instante";
    }

    return `En ${diferenciaTemporal} ` + "unidades";
  }

  crearDescripcionActor({
    actor,
    esJugador,
    proximoTurno,
    diferenciaTemporal,
  }) {
    const nombre = esJugador ? `${actor.nombre}, jugador` : actor.nombre;

    const partes = [
      nombre,

      `próximo turno absoluto: ${proximoTurno}`,

      `diferencia temporal: ${diferenciaTemporal}`,

      `factor global: ${actor.factorTiempo ?? 100}`,

      `factor de movimiento: ${actor.factorMovimiento ?? 100}`,

      `factor de ataque: ${actor.factorAtaque ?? 100}`,
    ];

    return partes.join(". ");
  }

  mostrarAgendaVacia() {
    const elemento = document.createElement("li");

    elemento.classList.add("agenda-temporal-vacia");

    elemento.textContent = "No hay actores registrados.";

    this.lista.appendChild(elemento);

    this.actualizarMensajeAdicional(0);
  }

  actualizarMensajeAdicional(cantidadAdicional) {
    const hayAdicionales = cantidadAdicional > 0;

    this.mensajeAdicional.classList.toggle("oculto", !hayAdicionales);

    this.mensajeAdicional.textContent = hayAdicionales
      ? `+${cantidadAdicional} actores más en la agenda.`
      : "";
  }

  destruir() {
    this.contenedor?.remove();

    document.getElementById(ID_ESTILOS_ORDEN_TEMPORAL)?.remove();
  }
}
