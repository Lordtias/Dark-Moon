import { traducir } from "../idiomas/ContextoIdioma.js";

// Representa recursos y progreso del jugador sin conservar un estado propio.
// Todos los valores se leen del jugador canónico en cada redibujado.
export class HudPartidaDom {
  constructor({ elementos = {} } = {}) {
    const requeridos = [
      "vidaTexto",
      "vidaRelleno",
      "manaTexto",
      "manaRelleno",
      "experienciaTexto",
      "experienciaRelleno",
      "nivelTexto",
    ];

    for (const nombre of requeridos) {
      if (!(elementos[nombre] instanceof HTMLElement)) {
        throw new Error(`HudPartidaDom necesita el elemento "${nombre}".`);
      }
    }

    this.elementos = elementos;
  }

  actualizar(jugador) {
    if (!jugador) return;

    this.actualizarRecurso({
      actual: jugador.vidaActual,
      maximo: jugador.vidaMaxima,
      texto: this.elementos.vidaTexto,
      relleno: this.elementos.vidaRelleno,
    });
    this.actualizarRecurso({
      actual: jugador.manaActual,
      maximo: jugador.manaMaximo,
      texto: this.elementos.manaTexto,
      relleno: this.elementos.manaRelleno,
    });

    const experiencia = Number(jugador.experiencia) || 0;
    const necesaria = Number(jugador.experienciaNecesaria) || 0;
    const porcentaje = Number.isFinite(jugador.porcentajeExperiencia)
      ? jugador.porcentajeExperiencia
      : necesaria > 0
        ? (experiencia / necesaria) * 100
        : 0;

    this.elementos.experienciaTexto.textContent =
      `${experiencia} / ${necesaria} ` +
      traducir("interfaz.personaje.xp", { respaldo: "PX" });
    this.elementos.experienciaRelleno.style.width =
      `${limitarPorcentaje(porcentaje)}%`;
    this.elementos.nivelTexto.textContent = traducir(
      "interfaz.personaje.nivel",
      {
        parametros: { nivel: jugador.nivel },
        respaldo: `Nivel ${jugador.nivel}`,
      },
    );
  }

  actualizarRecurso({ actual, maximo, texto, relleno }) {
    const actualSeguro = Number(actual) || 0;
    const maximoSeguro = Number(maximo) || 0;
    texto.textContent = `${Math.floor(actualSeguro)} / ${Math.floor(maximoSeguro)}`;
    const porcentaje = maximoSeguro > 0
      ? (actualSeguro / maximoSeguro) * 100
      : 0;
    relleno.style.height = `${limitarPorcentaje(porcentaje)}%`;
  }
}

function limitarPorcentaje(valor) {
  return Math.max(0, Math.min(100, Number(valor) || 0));
}
