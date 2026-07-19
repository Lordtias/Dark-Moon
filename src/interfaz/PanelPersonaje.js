import { calcularDpsCombatiente } from "../juego/combate/CalculadorDPS.js";

const ATRIBUTOS = [
  "fuerza",
  "destreza",
  "constitucion",
  "inteligencia",
  "sabiduria",
  "carisma",
];

// PanelPersonaje administra el comportamiento
// y la actualización visual del panel.
//
// La estructura HTML se encuentra en index.html,
// dentro de plantillaPanelPersonaje.
export class PanelPersonaje {
  constructor({ contenedor, plantilla } = {}) {
    if (!contenedor) {
      throw new Error("PanelPersonaje necesita un contenedor.");
    }

    if (!(plantilla instanceof HTMLTemplateElement)) {
      throw new Error("PanelPersonaje necesita una plantilla HTML válida.");
    }

    this.contenedor = contenedor;

    this.plantilla = plantilla;

    this.playerActual = null;

    this.manejarClick = this.manejarClick.bind(this);

    this.crearContenido();

    // Un único evento administra todos
    // los botones de atributos.
    this.contenedor.addEventListener("click", this.manejarClick);
  }

  // Clona la estructura definida en index.html.
  crearContenido() {
    const contenido = this.plantilla.content.cloneNode(true);

    this.contenedor.replaceChildren(contenido);

    // La plantilla todavía contiene el cuadro
    // llamado Turno.
    //
    // Lo convertimos dinámicamente en DPS para
    // no duplicar la estructura del panel
    // entre JavaScript e index.html.
    this.configurarCampoDps();
  }

  // Convierte el antiguo campo visual Turno
  // en el nuevo campo DPS.
  configurarCampoDps() {
    const valorDps = this.obtener('[data-personaje="turno"]');

    valorDps.dataset.personaje = "dps";

    const contenedorDato = valorDps.closest(".dato-personaje");

    const etiqueta = contenedorDato?.querySelector("span");

    if (!contenedorDato || !etiqueta) {
      throw new Error("No se pudo convertir el campo Turno en DPS.");
    }

    etiqueta.textContent = "DPS";

    contenedorDato.title =
      "Daño bruto medio por segundo. " +
      "Incluye la velocidad del ataque, pero no " +
      "precisión, críticos, armadura ni bloqueo.";
  }

  // Obtiene un elemento interno obligatorio.
  obtener(selector) {
    const elemento = this.contenedor.querySelector(selector);

    if (!elemento) {
      throw new Error(`No se encontró "${selector}" ` + "en PanelPersonaje.");
    }

    return elemento;
  }

  // Procesa la distribución inmediata
  // de un punto de atributo.
  manejarClick(event) {
    const boton = event.target.closest('[data-accion="sumar-atributo"]');

    if (!boton || !this.contenedor.contains(boton) || !this.playerActual) {
      return;
    }

    const nombreAtributo = boton.dataset.atributo;

    const resultado = this.playerActual.asignarPuntoAtributo(nombreAtributo);

    if (!resultado.exito) {
      return;
    }

    // Un atributo puede modificar varias
    // estadísticas derivadas y el DPS.
    this.actualizar(this.playerActual);

    boton.blur();
  }

  // Actualiza todos los valores visibles.
  //
  // Ya no recibe el contador de turnos porque
  // esa información dejó de mostrarse.
  actualizar(player) {
    this.playerActual = player;

    const estadisticas = player.estadisticasDerivadas;

    const resultadoDps = calcularDpsCombatiente(player);

    this.obtener('[data-personaje="nombre"]').textContent = player.nombre;

    this.obtener('[data-personaje="clase"]').textContent =
      player.clasePersonaje;

    this.obtener('[data-personaje="nivel"]').textContent =
      `Nivel ${player.nivel}`;

    this.actualizarExperiencia(player);

    this.obtener('[data-personaje="puntos-atributo"]').textContent =
      player.puntosAtributoDisponibles;

    this.obtener('[data-personaje="danio-medio"]').textContent = this.formatear(
      estadisticas.danioFisico.promedio,
    );

    this.obtener('[data-personaje="dps"]').textContent = this.formatear(
      resultadoDps.dps,
    );

    // El tooltip muestra cómo se obtuvo
    // el DPS actualmente visible.
    this.obtener('[data-personaje="dps"]').closest(".dato-personaje").title =
      `Daño medio: ${this.formatear(resultadoDps.danioMedio)}. ` +
      `Costo efectivo: ${resultadoDps.costoAtaqueEfectivo}. ` +
      `Duración: ${this.formatear(
        resultadoDps.duracionAtaqueSegundos,
      )} segundos. ` +
      "No incluye precisión, crítico, armadura ni bloqueo.";

    this.actualizarBarra("vida", player.vidaActual, player.vidaMaxima);

    this.actualizarBarra("mana", player.manaActual, player.manaMaximo);

    this.actualizarAtributos(player);

    this.actualizarEstadisticas(player, estadisticas);

    this.actualizarBotonesAtributos(player);
  }

  // Actualiza los seis atributos principales.
  actualizarAtributos(player) {
    for (const atributo of ATRIBUTOS) {
      this.obtener(
        `.fila-atributo[data-atributo="${atributo}"] ` + '[data-campo="valor"]',
      ).textContent = player.atributos[atributo];
    }
  }

  // Actualiza estadísticas de combate
  // y resistencias elementales.
  actualizarEstadisticas(player, estadisticas) {
    const valores = {
      precision: estadisticas.precision,

      evasion: estadisticas.evasion,

      armadura: estadisticas.armadura,

      critico: `${this.formatear(estadisticas.probabilidadCritico)}%`,

      bloqueo: `${this.formatear(estadisticas.probabilidadBloqueo)}%`,

      "regen-vida": this.formatear(estadisticas.regeneracionVida),

      "regen-mana": this.formatear(estadisticas.regeneracionMana),

      alcance: player.alcanceAtaque,

      "res-fuego": `${this.formatear(estadisticas.resistencias.fuego)}%`,

      "res-frio": `${this.formatear(estadisticas.resistencias.frio)}%`,

      "res-rayo": `${this.formatear(estadisticas.resistencias.rayo)}%`,

      "res-veneno": `${this.formatear(estadisticas.resistencias.veneno)}%`,
    };

    for (const [campo, valor] of Object.entries(valores)) {
      this.obtener(`[data-personaje="${campo}"]`).textContent = valor;
    }
  }

  // Actualiza el texto y el ancho
  // de la barra de experiencia.
  actualizarExperiencia(player) {
    this.obtener('[data-personaje="experiencia-texto"]').textContent =
      `${player.experiencia} / ` + `${player.experienciaNecesaria} PX`;

    this.obtener('[data-personaje="experiencia-barra"]').style.width =
      `${this.limitarPorcentaje(player.porcentajeExperiencia)}%`;
  }

  // Habilita los botones solamente cuando
  // existen puntos disponibles.
  actualizarBotonesAtributos(player) {
    const botones = this.contenedor.querySelectorAll(
      '[data-accion="sumar-atributo"]',
    );

    const tienePuntos = player.puntosAtributoDisponibles > 0;

    for (const boton of botones) {
      boton.disabled = !tienePuntos;
    }
  }

  // Actualiza una barra de recurso.
  actualizarBarra(recurso, actual, maximo) {
    this.obtener(`[data-personaje="${recurso}-texto"]`).textContent =
      `${Math.floor(actual)} / ` + `${Math.floor(maximo)}`;

    const porcentaje = maximo > 0 ? (actual / maximo) * 100 : 0;

    this.obtener(`[data-personaje="${recurso}-barra"]`).style.width =
      `${this.limitarPorcentaje(porcentaje)}%`;
  }

  limitarPorcentaje(valor) {
    return Math.max(0, Math.min(100, valor));
  }

  formatear(valor) {
    return Number.isInteger(valor) ? `${valor}` : valor.toFixed(1);
  }

  // Elimina el evento si el panel
  // deja de utilizarse.
  destruir() {
    this.contenedor.removeEventListener("click", this.manejarClick);
  }
}
