import { TIEMPO_REFERENCIA } from "../../juego/tiempo/SistemaTiempo.js";
import { traducir, traducirContenido } from "../idiomas/ContextoIdioma.js";

// Representa recursos, progreso y estados temporales del jugador sin conservar
// resultados derivados propios. En cada actualización relee el Juego canónico.
export class HudPartidaDom {
  constructor({ elementos = {}, configuracionHabilidades = null } = {}) {
    const requeridos = [
      "vidaTexto",
      "vidaRelleno",
      "manaTexto",
      "manaRelleno",
      "experienciaTexto",
      "experienciaRelleno",
      "nivelTexto",
      "aurasActivas",
      "maldicionesActivas",
    ];

    for (const nombre of requeridos) {
      if (!(elementos[nombre] instanceof HTMLElement)) {
        throw new Error(`HudPartidaDom necesita el elemento "${nombre}".`);
      }
    }

    this.elementos = elementos;
    this.indiceEfectos = crearIndiceEfectos(configuracionHabilidades);
  }

  actualizar(jugador, { juego = null } = {}) {
    if (!jugador) return;

    this.actualizarRecurso({
      actual: jugador.vidaActual,
      maximo: jugador.vidaMaxima,
      texto: this.elementos.vidaTexto,
      relleno: this.elementos.vidaRelleno,
      textoAlternativo: this.elementos.vidaTextoMovil,
      rellenoAlternativo: this.elementos.vidaRellenoMovil,
    });
    this.actualizarRecurso({
      actual: jugador.manaActual,
      maximo: jugador.manaMaximo,
      texto: this.elementos.manaTexto,
      relleno: this.elementos.manaRelleno,
      textoAlternativo: this.elementos.manaTextoMovil,
      rellenoAlternativo: this.elementos.manaRellenoMovil,
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

    this.actualizarEstadosTemporales(jugador, juego);
  }

  actualizarEstadosTemporales(jugador, juego) {
    this.elementos.aurasActivas.replaceChildren();
    this.elementos.maldicionesActivas.replaceChildren();
    const efectos = juego?.obtenerEfectosTemporales?.(jugador) ?? [];
    const estadosTacticos = juego?.obtenerEstadosTacticos?.(jugador) ?? [];
    const tiempoActual = Number(juego?.tiempoActual);
    if (!Array.isArray(efectos) || !Array.isArray(estadosTacticos)) return;

    for (const efecto of efectos) {
      const etiquetas = Array.isArray(efecto?.etiquetas) ? efecto.etiquetas : [];
      const esAura = etiquetas.includes("aura");
      const esMaldicion = etiquetas.includes("maldicion");
      if (!esAura && !esMaldicion) continue;
      const referencia = this.indiceEfectos.get(efecto.efectoId) ?? null;
      const nodo = crearEstadoTemporal({ efecto, referencia, tiempoActual });
      (esAura ? this.elementos.aurasActivas : this.elementos.maldicionesActivas).append(nodo);
    }

    for (const estado of estadosTacticos) {
      this.elementos.aurasActivas.append(crearEstadoTactico(estado));
    }
  }

  actualizarRecurso({
    actual,
    maximo,
    texto,
    relleno,
    textoAlternativo = null,
    rellenoAlternativo = null,
  }) {
    const actualSeguro = Number(actual) || 0;
    const maximoSeguro = Number(maximo) || 0;
    const textoValor = `${Math.floor(actualSeguro)} / ${Math.floor(maximoSeguro)}`;
    const porcentaje = maximoSeguro > 0
      ? (actualSeguro / maximoSeguro) * 100
      : 0;
    const porcentajeSeguro = `${limitarPorcentaje(porcentaje)}%`;

    if (texto) {
      texto.textContent = textoValor;
    }
    if (textoAlternativo) {
      textoAlternativo.textContent = textoValor;
    }

    if (relleno) {
      relleno.style.height = porcentajeSeguro;
      relleno.style.width = porcentajeSeguro;
    }
    if (rellenoAlternativo) {
      rellenoAlternativo.style.height = porcentajeSeguro;
      rellenoAlternativo.style.width = porcentajeSeguro;
    }
  }
}

function crearIndiceEfectos(configuracion) {
  const indice = new Map();
  const habilidades = configuracion?.habilidades ?? {};
  for (const habilidad of Object.values(habilidades)) {
    if (habilidad?.tipo !== "activa" || !habilidad?.icono) continue;
    const ids = new Set(
      Object.values(habilidad.ejecucion?.grados ?? {})
        .flatMap((grado) => (grado?.efectos ?? []).map((efecto) => efecto.efectoId).filter(Boolean)),
    );
    for (const efectoId of ids) {
      if (!indice.has(efectoId)) {
        indice.set(efectoId, {
          idHabilidad: habilidad.id,
          icono: habilidad.icono,
          nombre: habilidad.nombre,
        });
      }
    }
  }
  return indice;
}

function crearEstadoTemporal({ efecto, referencia, tiempoActual }) {
  const articulo = document.createElement("article");
  articulo.className = "hud-estado-temporal";
  const marco = document.createElement("span");
  marco.className = "hud-estado-temporal__icono";
  const nombre = traducirContenido(
    "efectos",
    efecto.efectoId,
    "nombre",
    efecto.nombreEfecto ?? referencia?.nombre ?? efecto.efectoId ?? "Efecto",
  );

  if (referencia?.icono) {
    const imagen = document.createElement("img");
    imagen.src = referencia.icono;
    imagen.alt = "";
    imagen.draggable = false;
    marco.append(imagen);
  } else {
    const inicial = document.createElement("span");
    inicial.className = "hud-estado-temporal__inicial";
    inicial.textContent = nombre.slice(0, 1).toUpperCase();
    marco.append(inicial);
  }

  const turnos = Number.isFinite(efecto?.venceEn) && Number.isFinite(tiempoActual)
    ? Math.max(0, Math.ceil((efecto.venceEn - tiempoActual) / TIEMPO_REFERENCIA))
    : null;
  const restante = document.createElement("strong");
  restante.className = "hud-estado-temporal__restante";
  restante.textContent = turnos === null ? "—" : String(turnos);
  articulo.title = turnos === null
    ? nombre
    : `${nombre} · ${turnos} ${turnos === 1 ? "turno" : "turnos"}`;
  articulo.dataset.etiquetaEfecto = articulo.title;
  articulo.tabIndex = 0;
  articulo.setAttribute("aria-label", articulo.title);
  articulo.append(marco, restante);
  return articulo;
}

function crearEstadoTactico(estado) {
  const articulo = document.createElement("article");
  articulo.className = "hud-estado-temporal hud-estado-temporal--tactico";
  const marco = document.createElement("span");
  marco.className = "hud-estado-temporal__icono";
  const nombre = estado?.nombre ?? "Estado táctico";

  if (estado?.icono) {
    const imagen = document.createElement("img");
    imagen.src = estado.icono;
    imagen.alt = "";
    imagen.draggable = false;
    marco.append(imagen);
  } else {
    const inicial = document.createElement("span");
    inicial.className = "hud-estado-temporal__inicial";
    inicial.textContent = nombre.slice(0, 1).toUpperCase();
    marco.append(inicial);
  }

  const indicador = document.createElement("strong");
  indicador.className = "hud-estado-temporal__restante hud-estado-temporal__restante--indefinido";
  indicador.textContent = "∞";
  articulo.title = estado?.descripcion ? `${nombre} · ${estado.descripcion}` : nombre;
  articulo.dataset.etiquetaEfecto = articulo.title;
  articulo.tabIndex = 0;
  articulo.setAttribute("aria-label", articulo.title);
  articulo.append(marco, indicador);
  return articulo;
}

function limitarPorcentaje(valor) {
  return Math.max(0, Math.min(100, Number(valor) || 0));
}
