const ATRIBUTOS = [
  ["fuerza", "Fuerza"],
  ["destreza", "Destreza"],
  ["constitucion", "Constitución"],
  ["inteligencia", "Inteligencia"],
  ["sabiduria", "Sabiduría"],
  ["carisma", "Carisma"],
];

export class PanelPersonaje {
  constructor({ contenedor } = {}) {
    if (!contenedor) {
      throw new Error("PanelPersonaje necesita un contenedor.");
    }

    this.contenedor = contenedor;
    this.playerActual = null;
    this.turnoActual = 0;

    this.manejarClick = this.manejarClick.bind(this);

    this.crearContenido();

    this.contenedor.addEventListener("click", this.manejarClick);
  }

  crearContenido() {
    const filasAtributos = ATRIBUTOS.map(
      ([id, nombre]) => `
        <div
          class="fila-atributo"
          data-atributo="${id}"
        >
          <span class="nombre-atributo-panel">
            ${nombre}
          </span>

          <strong data-campo="valor">
            0
          </strong>

          <button
            type="button"
            class="boton-sumar-atributo"
            data-accion="sumar-atributo"
            data-atributo="${id}"
            aria-label="Aumentar ${nombre}"
            title="Asignar un punto a ${nombre}"
          >
            +
          </button>
        </div>
      `,
    ).join("");

    this.contenedor.innerHTML = `
      <h2>Personaje</h2>

      <div class="identidad-personaje">
        <strong data-personaje="nombre">
          Cargando...
        </strong>

        <span data-personaje="clase">
          Aventurero
        </span>
      </div>

      <div class="experiencia-personaje">
        <div class="cabecera-experiencia">
          <strong data-personaje="nivel">
            Nivel 1
          </strong>

          <span data-personaje="experiencia-texto">
            0 / 0 PX
          </span>
        </div>

        <div class="barra-experiencia">
          <div
            class="relleno-experiencia"
            data-personaje="experiencia-barra"
          ></div>
        </div>
      </div>

      ${this.crearRecurso("Vida", "vida", "relleno-vida")}

      ${this.crearRecurso("Maná", "mana", "relleno-mana")}

      <section class="seccion-panel">
        <div class="cabecera-seccion-atributos">
          <h3>Atributos</h3>

          <div
            class="contador-puntos-atributo"
            title="Puntos pendientes de repartir"
          >
            <span>Puntos</span>

            <strong data-personaje="puntos-atributo">
              0
            </strong>
          </div>
        </div>

        <div class="lista-atributos">
          ${filasAtributos}
        </div>
      </section>

      <section class="seccion-panel">
        <h3>Combate</h3>

        <div class="resumen-personaje">
          ${this.crearDato("Daño medio", "danio-medio")}

          ${this.crearDato("Turno", "turno")}

          ${this.crearDato("Precisión", "precision")}

          ${this.crearDato("Evasión", "evasion")}

          ${this.crearDato("Armadura", "armadura")}

          ${this.crearDato("Crítico", "critico")}

          ${this.crearDato("Bloqueo", "bloqueo")}

          ${this.crearDato("Regen. vida", "regen-vida")}

          ${this.crearDato("Regen. maná", "regen-mana")}

          ${this.crearDato("Alcance", "alcance")}
        </div>
      </section>

      <section class="seccion-panel">
        <h3>Resistencias</h3>

        <div class="resumen-personaje">
          ${this.crearDato("Fuego", "res-fuego")}

          ${this.crearDato("Frío", "res-frio")}

          ${this.crearDato("Rayo", "res-rayo")}

          ${this.crearDato("Veneno", "res-veneno")}
        </div>
      </section>
    `;
  }

  crearDato(nombre, campo) {
    return `
      <div class="dato-personaje">
        <span>${nombre}</span>

        <strong data-personaje="${campo}">
          0
        </strong>
      </div>
    `;
  }

  crearRecurso(nombre, id, claseRelleno) {
    return `
      <div class="recurso-personaje">
        <div class="cabecera-recurso">
          <span>${nombre}</span>

          <span data-personaje="${id}-texto">
            0 / 0
          </span>
        </div>

        <div class="barra-recurso">
          <div
            class="relleno-recurso ${claseRelleno}"
            data-personaje="${id}-barra"
          ></div>
        </div>
      </div>
    `;
  }

  obtener(selector) {
    const elemento = this.contenedor.querySelector(selector);

    if (!elemento) {
      throw new Error(`No se encontró "${selector}" ` + "en PanelPersonaje.");
    }

    return elemento;
  }

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

    this.actualizar(this.playerActual, this.turnoActual);

    boton.blur();
  }

  actualizar(player, turno) {
    this.playerActual = player;
    this.turnoActual = turno;

    const estadisticas = player.estadisticasDerivadas;

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

    this.obtener('[data-personaje="turno"]').textContent = turno;

    this.actualizarBarra("vida", player.vidaActual, player.vidaMaxima);

    this.actualizarBarra("mana", player.manaActual, player.manaMaximo);

    for (const [id] of ATRIBUTOS) {
      this.obtener(
        `[data-atributo="${id}"] ` + '[data-campo="valor"]',
      ).textContent = player.atributos[id];
    }

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

    this.actualizarBotonesAtributos(player);
  }

  actualizarExperiencia(player) {
    this.obtener('[data-personaje="experiencia-texto"]').textContent =
      `${player.experiencia} / ` + `${player.experienciaNecesaria} PX`;

    this.obtener('[data-personaje="experiencia-barra"]').style.width =
      `${Math.max(0, Math.min(100, player.porcentajeExperiencia))}%`;
  }

  actualizarBotonesAtributos(player) {
    const botones = this.contenedor.querySelectorAll(
      '[data-accion="sumar-atributo"]',
    );

    const tienePuntos = player.puntosAtributoDisponibles > 0;

    for (const boton of botones) {
      boton.disabled = !tienePuntos;
    }
  }

  actualizarBarra(recurso, actual, maximo) {
    this.obtener(`[data-personaje="${recurso}-texto"]`).textContent =
      `${Math.floor(actual)} / ` + `${Math.floor(maximo)}`;

    const porcentaje = maximo > 0 ? (actual / maximo) * 100 : 0;

    this.obtener(`[data-personaje="${recurso}-barra"]`).style.width =
      `${Math.max(0, Math.min(100, porcentaje))}%`;
  }

  formatear(valor) {
    return Number.isInteger(valor) ? `${valor}` : valor.toFixed(1);
  }

  destruir() {
    this.contenedor.removeEventListener("click", this.manejarClick);
  }
}
