import { calcularDpsCombatiente } from "../juego/combate/CalculadorDPS.js";

const ATRIBUTOS = [
  "fuerza",
  "destreza",
  "constitucion",
  "inteligencia",
  "sabiduria",
  "carisma",
];

// PanelPersonaje administra el comportamiento y la actualización visual.
//
// La estructura HTML principal se encuentra en index.html, dentro de
// plantillaPanelPersonaje. La sección compacta de Magia se agrega desde este
// controlador para no duplicar una plantilla extensa por dos datos derivados.
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
    // Un único evento administra todos los botones de atributos.
    this.contenedor.addEventListener("click", this.manejarClick);
  }

  // Clona la estructura definida en index.html.
  crearContenido() {
    const contenido = this.plantilla.content.cloneNode(true);
    this.contenedor.replaceChildren(contenido);

    // La plantilla todavía contiene el cuadro llamado Turno. Se convierte
    // dinámicamente en DPS para mantener una única estructura declarativa.
    this.configurarCampoDps();
    this.crearSeccionMagia();
  }

  // Convierte el antiguo campo visual Turno en el nuevo campo DPS.
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

  // Agrega solamente los dos derivados mágicos necesarios para esta etapa.
  // El Maná máximo y su regeneración ya permanecen visibles en la plantilla.
  crearSeccionMagia() {
    const seccion = document.createElement("section");
    seccion.className = "seccion-panel seccion-magia-personaje";
    seccion.dataset.seccionPersonaje = "magia";

    const titulo = document.createElement("h3");
    titulo.textContent = "Magia";
    seccion.append(titulo);

    const resumen = document.createElement("div");
    resumen.className = "resumen-personaje";
    resumen.append(
      this.crearDatoMagico({
        etiqueta: "Daño mágico",
        campo: "danio-magico",
        descripcion:
          "Multiplicador derivado de Inteligencia y Sabiduría " +
          "que usarán las habilidades mágicas.",
      }),
      this.crearDatoMagico({
        etiqueta: "Potencia de efectos",
        campo: "potencia-efectos",
        descripcion:
          "Multiplicador derivado de Sabiduría e Inteligencia. " +
          "Cada efecto define si escala valor, duración o ambos.",
      }),
    );
    seccion.append(resumen);

    const seccionResistencias = Array.from(
      this.contenedor.querySelectorAll(".seccion-panel"),
    ).find(
      (actual) =>
        actual.querySelector("h3")?.textContent.trim() === "Resistencias",
    );

    if (seccionResistencias) {
      seccionResistencias.before(seccion);
    } else {
      this.contenedor.append(seccion);
    }
  }

  crearDatoMagico({ etiqueta, campo, descripcion }) {
    const dato = document.createElement("div");
    dato.className = "dato-personaje";
    dato.title = descripcion;

    const nombre = document.createElement("span");
    nombre.textContent = etiqueta;
    const valor = document.createElement("strong");
    valor.dataset.personaje = campo;
    valor.textContent = "×1.00";
    dato.append(nombre, valor);
    return dato;
  }

  // Obtiene un elemento interno obligatorio.
  obtener(selector) {
    const elemento = this.contenedor.querySelector(selector);
    if (!elemento) {
      throw new Error(`No se encontró "${selector}" ` + "en PanelPersonaje.");
    }
    return elemento;
  }

  // Procesa la distribución inmediata de un punto de atributo.
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

    // Un atributo puede modificar varias estadísticas derivadas y el DPS.
    this.actualizar(this.playerActual);
    boton.blur();
  }

  // Actualiza todos los valores visibles.
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

    // El tooltip muestra cómo se obtuvo el DPS actualmente visible.
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

  // Actualiza estadísticas de combate, magia y resistencias elementales.
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
      "danio-magico": this.formatearMultiplicador(
        estadisticas.multiplicadorDanioMagico,
      ),
      "potencia-efectos": this.formatearMultiplicador(
        estadisticas.multiplicadorEfectos,
      ),
      "res-fuego": `${this.formatear(estadisticas.resistencias.fuego)}%`,
      "res-frio": `${this.formatear(estadisticas.resistencias.frio)}%`,
      "res-rayo": `${this.formatear(estadisticas.resistencias.rayo)}%`,
      "res-veneno": `${this.formatear(estadisticas.resistencias.veneno)}%`,
    };

    for (const [campo, valor] of Object.entries(valores)) {
      this.obtener(`[data-personaje="${campo}"]`).textContent = valor;
    }
  }

  // Actualiza el texto y el ancho de la barra de experiencia.
  actualizarExperiencia(player) {
    this.obtener('[data-personaje="experiencia-texto"]').textContent =
      `${player.experiencia} / ` + `${player.experienciaNecesaria} PX`;
    this.obtener('[data-personaje="experiencia-barra"]').style.width =
      `${this.limitarPorcentaje(player.porcentajeExperiencia)}%`;
  }

  // Habilita los botones solamente cuando existen puntos disponibles.
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

  formatearMultiplicador(valor) {
    return `×${valor.toFixed(2)}`;
  }

  // Elimina el evento si el panel deja de utilizarse.
  destruir() {
    this.contenedor.removeEventListener("click", this.manejarClick);
  }
}
