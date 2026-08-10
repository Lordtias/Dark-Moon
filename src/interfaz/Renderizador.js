import { obtenerInstante, redondearMilisegundos } from "../utilidades/TiempoEjecucion.js";
import { normalizarMensajesJuego } from "../juego/mensajes/MensajesJuego.js";
import { resolverPresentacionMensajeJuego } from "./idiomas/PresentadorMensajesJuego.js";

import { crearEscenaJuego } from "./graficos/AdaptadorEscenaJuego.js";
import { crearPlanEventosVisuales } from "./graficos/PlanificadorEventosVisuales.js";

const MAXIMO_MENSAJES_REGISTRO = 120;

// Renderizador coordina toda la interfaz
// visible de la partida.
//
// No dibuja directamente con Canvas.
//
// La representación del mapa se delega a un
// renderizador gráfico intercambiable, mientras
// esta clase continúa actualizando:
//
// - Panel del personaje.
// - Inventario.
// - Equipamiento.
// - Historial de eventos.
export class Renderizador {
  constructor({
    renderizadorMapa,
    panelPersonaje,
    combatLogText,
    panelInventario,
    panelEquipamiento,
  } = {}) {
    if (
      !renderizadorMapa ||
      typeof renderizadorMapa.dibujar !== "function" ||
      typeof renderizadorMapa.configurarDimensiones !== "function"
    ) {
      throw new Error(
        "Renderizador necesita una implementación gráfica válida.",
      );
    }

    if (!panelPersonaje || typeof panelPersonaje.actualizar !== "function") {
      throw new Error("Renderizador necesita un PanelPersonaje.");
    }

    if (!panelInventario || typeof panelInventario.actualizar !== "function") {
      throw new Error("Renderizador necesita un PanelInventario.");
    }

    if (
      !panelEquipamiento ||
      typeof panelEquipamiento.actualizar !== "function"
    ) {
      throw new Error("Renderizador necesita un PanelEquipamiento.");
    }

    if (!combatLogText) {
      throw new Error("Renderizador necesita el registro de combate.");
    }

    this.renderizadorMapa = renderizadorMapa;
    this.panelPersonaje = panelPersonaje;
    this.panelInventario = panelInventario;
    this.panelEquipamiento = panelEquipamiento;
    this.combatLogText = combatLogText;

    // Se utiliza para interpretar correctamente
    // mensajes antiguos de combate.
    this.nombreJugador = "";

    // La primera llamada reemplazará el mensaje
    // explicativo incluido en index.html.
    this.registroInicializado = false;

    // La selección de habilidades es una capa visual del renderizador y no
    // modifica la instancia de Juego ni el contrato del backend Canvas.
    this.estadoVisualHabilidad = crearEstadoVisualHabilidad();

    // Conserva la última escena neutral creada. Phaser puede utilizarla como
    // punto de partida visual, mientras Canvas 2D continúa redibujando el
    // estado final de forma inmediata.
    this.ultimaEscenaMapa = null;
    this.ultimoDiagnosticoPresentacion = null;
    this.secuenciaPresentacion = 0;
  }

  // Permite que el controlador configure
  // las dimensiones sin conocer la tecnología
  // gráfica utilizada.
  configurarDimensionesMapa({ columnas, filas } = {}) {
    this.renderizadorMapa.configurarDimensiones({
      columnas,
      filas,
    });
  }

  esperarPresentacionPendiente() {
    if (typeof this.renderizadorMapa.esperarPresentacionPendiente !== "function") {
      return null;
    }
    return this.renderizadorMapa.esperarPresentacionPendiente();
  }

  obtenerDiagnosticoUltimaPresentacion() {
    return this.ultimoDiagnosticoPresentacion
      ? { ...this.ultimoDiagnosticoPresentacion }
      : null;
  }

  configurarAnimacionesMapa(configuracion = {}) {
    if (typeof this.renderizadorMapa.configurarAnimaciones !== "function") {
      return null;
    }

    return this.renderizadorMapa.configurarAnimaciones(configuracion);
  }

  conectarEntradaMapa(alEjecutarComando = null) {
    if (
      alEjecutarComando !== null &&
      alEjecutarComando !== undefined &&
      typeof alEjecutarComando !== "function"
    ) {
      throw new Error(
        "La entrada del mapa debe ser una función o null para desconectarla.",
      );
    }

    if (
      typeof this.renderizadorMapa.conectarEntradaJugable !== "function"
    ) {
      return false;
    }

    this.renderizadorMapa.conectarEntradaJugable(alEjecutarComando ?? null);
    return true;
  }

  // Actualiza la capa visual de selección mágica. La integración del mapa
  // activo es la única responsable de establecerla y limpiarla.
  actualizarEstadoVisualHabilidad(estado = null) {
    this.estadoVisualHabilidad = crearEstadoVisualHabilidad(estado);
    return this.estadoVisualHabilidad;
  }

  // Actualiza toda la representación
  // visible de la partida.
  dibujarJuego(juego, { eventos = [] } = {}) {
    this.nombreJugador = juego.player.nombre;

    // Convertimos Juego en una escena plana
    // antes de entregarla al backend gráfico.
    const escena = crearEscenaJuego(juego, {
      habilidad: this.estadoVisualHabilidad,
    });

    const inicioPlanificacionVisual = obtenerInstante();
    const eventosVisuales = crearPlanEventosVisuales({
      eventos,
      escenaAnterior: this.ultimaEscenaMapa,
      escenaFinal: escena,
    });
    const duracionPlanificacionVisualMs = redondearMilisegundos(
      obtenerInstante() - inicioPlanificacionVisual,
    );

    this.renderizadorMapa.dibujar(escena, {
      escenaAnterior: this.ultimaEscenaMapa,
      eventosVisuales,
    });
    this.ultimoDiagnosticoPresentacion = Object.freeze({
      idPresentacion: ++this.secuenciaPresentacion,
      duracionPlanificacionVisualMs,
      eventosVisualesGenerados: eventosVisuales.length,
      ...(this.renderizadorMapa.obtenerDiagnosticoUltimaPresentacion?.() ?? {}),
    });

    this.ultimaEscenaMapa = escena;

    // Los paneles HTML continúan siendo
    // independientes del backend del mapa.
    this.panelPersonaje.actualizar(juego.player);

    // PanelInventario recibe también al jugador
    // porque el oro no forma parte del contenedor
    // ni ocupa una casilla de inventario.
    this.panelInventario.actualizar(juego.player.inventario, juego.player);
    this.panelEquipamiento.actualizar(juego.player.equipamiento);
  }

  // Agrega mensajes al historial
  // sin borrar eventos anteriores.
  mostrarMensaje(mensaje) {
    const mensajes = normalizarMensajesJuego(mensaje, {
      nombreJugador: this.nombreJugador,
    });

    if (mensajes.length === 0) {
      return;
    }

    if (!this.registroInicializado) {
      this.combatLogText.replaceChildren();
      this.registroInicializado = true;
    }

    const fragmento = document.createDocumentFragment();

    for (const evento of mensajes) {
      const elemento = document.createElement("p");
      elemento.classList.add(
        "mensaje-registro",
        `mensaje-registro--${evento.tipo}`,
      );
      elemento.dataset.tipo = evento.tipo;
      const presentacion = resolverPresentacionMensajeJuego(evento);
      if (presentacion.destacado) {
        const destacado = document.createElement("strong");
        destacado.className = "mensaje-registro__destacado";
        destacado.textContent = presentacion.destacado;
        elemento.appendChild(destacado);
      }
      if (presentacion.texto) {
        if (presentacion.destacado) elemento.appendChild(document.createTextNode(" "));
        elemento.appendChild(document.createTextNode(presentacion.texto));
      }
      fragmento.appendChild(elemento);
    }

    this.combatLogText.appendChild(fragmento);
    this.limitarHistorialMensajes();

    // Mantiene visible automáticamente
    // el evento más reciente.
    this.combatLogText.scrollTop = this.combatLogText.scrollHeight;
  }

  // Evita que el historial crezca
  // indefinidamente.
  limitarHistorialMensajes() {
    while (this.combatLogText.childElementCount > MAXIMO_MENSAJES_REGISTRO) {
      this.combatLogText.firstElementChild?.remove();
    }
  }
}

function crearEstadoVisualHabilidad(estado = null) {
  const selector = estado?.selector;
  const selectorValido =
    selector && Number.isInteger(selector.x) && Number.isInteger(selector.y)
      ? Object.freeze({
          x: selector.x,
          y: selector.y,
          objetivoValido: selector.objetivoValido === true,
          puedeEjecutar: selector.geometria?.puedeEjecutar === true,
        })
      : null;

  const habilidad = selectorValido
    ? Object.freeze({
        id: typeof selector.idHabilidad === "string" ? selector.idHabilidad : null,
        nombre: typeof selector.nombre === "string" ? selector.nombre : null,
        maestria: typeof selector.idMaestria === "string"
          ? selector.idMaestria
          : typeof selector.maestria === "string"
            ? selector.maestria
            : null,
        grado: Number.isInteger(selector.grado) ? selector.grado : null,
        tipoObjetivo:
          typeof selector.tipoObjetivo === "string" ? selector.tipoObjetivo : null,
        formaImpacto: congelarValorSimple(selector.formaImpacto),
        zonaTemporal: congelarValorSimple(selector.zonaTemporal),
      })
    : null;

  return Object.freeze({
    activo: estado?.activo === true,
    habilidad,
    selector: selectorValido,
    casillasSeleccionables: congelarListaPosiciones(
      selector?.casillasSeleccionables,
    ),
    casillasAfectadas: congelarListaPosiciones(selector?.casillasAfectadas),
    objetivosAfectados: congelarListaObjetivos(selector?.objetivosAfectados),
    recorrido: congelarListaRecorrido(selector?.recorrido),
  });
}

function congelarValorSimple(valor) {
  if (valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) {
    return Object.freeze(valor.map((item) => congelarValorSimple(item)));
  }
  return Object.freeze(
    Object.fromEntries(
      Object.entries(valor).map(([clave, contenido]) => [
        clave,
        congelarValorSimple(contenido),
      ]),
    ),
  );
}

function congelarListaPosiciones(lista) {
  if (!Array.isArray(lista)) return Object.freeze([]);
  return Object.freeze(
    lista
      .filter((item) => Number.isInteger(item?.x) && Number.isInteger(item?.y))
      .map((item) => Object.freeze({ x: item.x, y: item.y })),
  );
}

function congelarListaObjetivos(lista) {
  if (!Array.isArray(lista)) return Object.freeze([]);
  return Object.freeze(
    lista
      .filter((item) => Number.isInteger(item?.x) && Number.isInteger(item?.y))
      .map((item) =>
        Object.freeze({
          x: item.x,
          y: item.y,
          orden: Number.isInteger(item.orden) ? item.orden : 0,
        }),
      ),
  );
}

function congelarListaRecorrido(lista) {
  if (!Array.isArray(lista)) return Object.freeze([]);
  return Object.freeze(
    lista
      .filter((item) => Number.isInteger(item?.x) && Number.isInteger(item?.y))
      .map((item) =>
        Object.freeze({
          x: item.x,
          y: item.y,
          orden: Number.isInteger(item.orden) ? item.orden : 0,
        }),
      ),
  );
}
