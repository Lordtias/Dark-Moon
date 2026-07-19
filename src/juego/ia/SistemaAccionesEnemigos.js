import { Enemigo } from "../../entidad/destructible/combatiente/Enemigo.js";

import { buscarSiguientePaso } from "../BuscadorCamino.js";

import {
  calcularDistanciaCuadricula,
  evaluarAtaqueCasilla,
} from "../SistemaAlcanceAtaque.js";

import { verificarRequisitosAtaque } from "../../entidad/destructible/combatiente/ConfiguracionAtaque.js";

import {
  COSTOS_TEMPORALES_BASE,
  TIPOS_ACCION_TEMPORAL,
} from "../tiempo/SistemaTiempo.js";

// Conservamos esta exportación porque la distancia
// también puede ser utilizada por otros sistemas.
export { calcularDistanciaCuadricula } from "../SistemaAlcanceAtaque.js";

// Crea una clave utilizable dentro
// de una colección Set.
function crearClavePosicion(x, y) {
  return `${x},${y}`;
}

// Actualiza la agresividad del enemigo.
//
// La percepción todavía utiliza únicamente distancia.
// Las paredes pueden impedir un ataque, pero no detectar.
function actualizarAgresividad(enemigo, jugador) {
  const mensajes = [];

  const distancia = calcularDistanciaCuadricula(enemigo, jugador);

  const { tipoAgresividad, percepcion } = enemigo.configuracionIA;

  if (
    !enemigo.estaAgresivo &&
    tipoAgresividad === "activa" &&
    distancia <= percepcion
  ) {
    enemigo.activarAgresividad();

    mensajes.push(`${enemigo.nombre} te ha detectado.`);
  }

  if (enemigo.estaAgresivo && distancia > enemigo.rangoPersecucion) {
    enemigo.desactivarAgresividad();

    mensajes.push(`${enemigo.nombre} dejó de perseguirte.`);
  }

  return {
    distancia,
    mensajes,
  };
}

// Determina qué ataque utilizará el enemigo.
//
// Primero vuelve a comprobar el arma equipada.
// Si no tiene recursos, aplica la estrategia
// configurada para ese enemigo.
function prepararAtaqueEnemigo(enemigo) {
  const estabaUsandoAtaqueNatural = enemigo.ataqueNaturalForzado;

  // Volvemos a probar el arma equipada
  // por si recuperó los recursos necesarios.
  enemigo.desactivarAtaqueNaturalForzado();

  const requisitosAtaqueEquipado = verificarRequisitosAtaque(enemigo);

  if (requisitosAtaqueEquipado.disponible) {
    const arma = requisitosAtaqueEquipado.configuracion.armaControladora;

    return {
      disponible: true,

      mensaje:
        estabaUsandoAtaqueNatural && arma
          ? `${enemigo.nombre} vuelve a utilizar ` + `${arma.nombre}.`
          : null,
    };
  }

  const estrategia = enemigo.configuracionIA.estrategiaSinRecursos;

  if (estrategia === "ataqueNatural") {
    enemigo.activarAtaqueNaturalForzado();

    const requisitosAtaqueNatural = verificarRequisitosAtaque(enemigo);

    const arma = requisitosAtaqueEquipado.configuracion.armaControladora;

    return {
      disponible: requisitosAtaqueNatural.disponible,

      // Solo se informa cuando ocurre
      // realmente el cambio de ataque.
      mensaje: !estabaUsandoAtaqueNatural
        ? `${enemigo.nombre} no puede utilizar ` +
          `${arma?.nombre ?? "su ataque equipado"} ` +
          "y cambia a su ataque natural."
        : null,
    };
  }

  // La estrategia esperar mantiene al enemigo
  // en su posición sin atacar ni avanzar.
  return {
    disponible: false,

    mensaje: requisitosAtaqueEquipado.mensaje,
  };
}

// Evalúa alcance, patrón, paredes,
// línea de visión y esquinas.
function evaluarAtaqueEnemigo({ enemigo, jugador, mapa }) {
  return evaluarAtaqueCasilla({
    atacante: enemigo,

    xObjetivo: jugador.x,

    yObjetivo: jugador.y,

    mapa,
  });
}

// Devuelve todas las posiciones ocupadas
// excepto la del enemigo que está actuando.
function obtenerPosicionesBloqueadas(objetivos, enemigoActual) {
  const posicionesBloqueadas = new Set();

  for (const objetivo of objetivos) {
    if (objetivo === enemigoActual || objetivo.estaDestruido) {
      continue;
    }

    posicionesBloqueadas.add(crearClavePosicion(objetivo.x, objetivo.y));
  }

  return posicionesBloqueadas;
}

// Intenta avanzar exactamente una casilla.
//
// La rapidez ya no se representa moviendo varias
// casillas durante una misma fase. Un enemigo rápido
// recibirá su siguiente acción antes.
function moverEnemigoHaciaJugador({ enemigo, jugador, mapa, objetivos }) {
  const posicionesBloqueadas = obtenerPosicionesBloqueadas(objetivos, enemigo);

  const siguientePaso = buscarSiguientePaso({
    mapa,

    origen: {
      x: enemigo.x,
      y: enemigo.y,
    },

    destino: {
      x: jugador.x,
      y: jugador.y,
    },

    posicionesBloqueadas,
  });

  if (!siguientePaso) {
    return {
      seMovio: false,
    };
  }

  enemigo.x = siguientePaso.x;

  enemigo.y = siguientePaso.y;

  return {
    seMovio: true,
  };
}

// Crea una respuesta común para cualquier
// acción temporal de un enemigo.
function crearResultadoAccion({ tipoAccion, costoBase, mensajes = [] }) {
  const mensajesLimpios = mensajes.filter(Boolean);

  return {
    tipoAccion,
    costoBase,
    mensajes: mensajesLimpios,

    mensaje: mensajesLimpios.join("\n"),
  };
}

// Procesa una única acción del enemigo.
//
// El resultado informa:
//
// - Qué tipo de acción realizó.
// - Cuál es su coste base.
// - Qué mensajes produjo.
//
// Juego registrará posteriormente ese coste
// dentro de SistemaTiempo.
export function procesarAccionEnemigo({
  enemigo,
  jugador,
  mapa,
  objetivos,
} = {}) {
  if (!(enemigo instanceof Enemigo)) {
    throw new Error(
      "Se necesita un enemigo válido " + "para procesar su acción.",
    );
  }

  if (!Array.isArray(objetivos)) {
    throw new Error("Los objetivos deben estar dentro " + "de una lista.");
  }

  const mensajes = [];

  // Un enemigo destruido no debería llegar
  // normalmente hasta aquí.
  if (!enemigo.estaVivo) {
    return crearResultadoAccion({
      tipoAccion: TIPOS_ACCION_TEMPORAL.ESPERA,

      costoBase: COSTOS_TEMPORALES_BASE.espera,
    });
  }

  const resultadoAgresividad = actualizarAgresividad(enemigo, jugador);

  mensajes.push(...resultadoAgresividad.mensajes);

  // Los enemigos que no están agresivos
  // igualmente dejan pasar el tiempo.
  if (!enemigo.estaAgresivo) {
    return crearResultadoAccion({
      tipoAccion: TIPOS_ACCION_TEMPORAL.ESPERA,

      costoBase: COSTOS_TEMPORALES_BASE.espera,

      mensajes,
    });
  }

  const preparacionAtaque = prepararAtaqueEnemigo(enemigo);

  if (preparacionAtaque.mensaje) {
    mensajes.push(preparacionAtaque.mensaje);
  }

  // Sin ataque disponible, la acción
  // utilizada será esperar.
  if (!preparacionAtaque.disponible) {
    return crearResultadoAccion({
      tipoAccion: TIPOS_ACCION_TEMPORAL.ESPERA,

      costoBase: COSTOS_TEMPORALES_BASE.espera,

      mensajes,
    });
  }

  const evaluacionAtaque = evaluarAtaqueEnemigo({
    enemigo,
    jugador,
    mapa,
  });

  if (evaluacionAtaque.puedeAtacar) {
    // Capturamos el coste antes de resolver
    // el ataque y consumir sus recursos.
    const costoAtaque = enemigo.costoAtaqueActual;

    const resultadoAtaque = enemigo.atacar(jugador);

    mensajes.push(resultadoAtaque.mensaje);

    if (!jugador.estaVivo) {
      mensajes.push("Has muerto. Recargá la página para reiniciar.");
    }

    return crearResultadoAccion({
      tipoAccion: TIPOS_ACCION_TEMPORAL.ATAQUE,

      costoBase: costoAtaque,

      mensajes,
    });
  }

  const resultadoMovimiento = moverEnemigoHaciaJugador({
    enemigo,
    jugador,
    mapa,
    objetivos,
  });

  if (resultadoMovimiento.seMovio) {
    mensajes.push(`${enemigo.nombre} avanza hacia vos.`);

    return crearResultadoAccion({
      tipoAccion: TIPOS_ACCION_TEMPORAL.MOVIMIENTO,

      costoBase: COSTOS_TEMPORALES_BASE.movimiento,

      mensajes,
    });
  }

  // Si no puede atacar ni encuentra camino,
  // consume una acción de espera.
  return crearResultadoAccion({
    tipoAccion: TIPOS_ACCION_TEMPORAL.ESPERA,

    costoBase: COSTOS_TEMPORALES_BASE.espera,

    mensajes,
  });
}
