import { Enemigo } from "../entidad/destructible/combatiente/Enemigo.js";

import { buscarSiguientePaso } from "./BuscadorCamino.js";

import {
  calcularDistanciaCuadricula,
  evaluarAtaqueCasilla,
} from "./SistemaAlcanceAtaque.js";

// Conservamos esta exportación para no romper
// posibles consumidores anteriores.
export { calcularDistanciaCuadricula } from "./SistemaAlcanceAtaque.js";

function crearClavePosicion(x, y) {
  return `${x},${y}`;
}

// La percepción utiliza únicamente distancia.
//
// Por ahora una pared no impide detectar al jugador.
// La pared sí puede impedir el ataque.
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

// Comprueba si el enemigo puede atacar al jugador
// desde su posición actual.
//
// Esta validación incluye:
//
// - Alcance del arma.
// - Patrón de ataque.
// - Línea de visión.
// - Paredes y esquinas.
function evaluarAtaqueEnemigo({ enemigo, jugador, mapa }) {
  return evaluarAtaqueCasilla({
    atacante: enemigo,
    xObjetivo: jugador.x,
    yObjetivo: jugador.y,
    mapa,
  });
}

function obtenerPosicionesBloqueadas(objetivos, enemigoActual) {
  const posicionesBloqueadas = new Set();

  for (const objetivo of objetivos) {
    if (objetivo === enemigoActual) {
      continue;
    }

    if (objetivo.estaDestruido) {
      continue;
    }

    posicionesBloqueadas.add(crearClavePosicion(objetivo.x, objetivo.y));
  }

  return posicionesBloqueadas;
}

// Acerca al enemigo hasta que:
//
// - Puede atacar.
// - Agota sus movimientos.
// - No encuentra un camino.
function moverEnemigoHaciaJugador({ enemigo, jugador, mapa, objetivos }) {
  let movimientosRealizados = 0;

  const movimientosPermitidos = enemigo.configuracionIA.movimientosPorTurno;

  for (let movimiento = 0; movimiento < movimientosPermitidos; movimiento++) {
    const evaluacionAtaque = evaluarAtaqueEnemigo({
      enemigo,
      jugador,
      mapa,
    });

    // Un arquero se detiene cuando tiene alcance
    // y línea de visión.
    //
    // Un combatiente cuerpo a cuerpo se detiene
    // cuando llega a una casilla atacable.
    if (evaluacionAtaque.puedeAtacar) {
      break;
    }

    const posicionesBloqueadas = obtenerPosicionesBloqueadas(
      objetivos,
      enemigo,
    );

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
      break;
    }

    enemigo.x = siguientePaso.x;

    enemigo.y = siguientePaso.y;

    movimientosRealizados++;
  }

  return {
    movimientosRealizados,
  };
}

// Procesa de forma secuencial el turno
// de todos los enemigos vivos.
export function procesarFaseEnemigos({ objetivos, jugador, mapa }) {
  const mensajes = [];

  for (const objetivo of objetivos) {
    if (!(objetivo instanceof Enemigo)) {
      continue;
    }

    if (!objetivo.estaVivo) {
      continue;
    }

    if (!jugador.estaVivo) {
      break;
    }

    const resultadoAgresividad = actualizarAgresividad(objetivo, jugador);

    mensajes.push(...resultadoAgresividad.mensajes);

    if (!objetivo.estaAgresivo) {
      continue;
    }

    const evaluacionAtaque = evaluarAtaqueEnemigo({
      enemigo: objetivo,
      jugador,
      mapa,
    });

    // El alcance ya no proviene de configuracionIA.
    //
    // Una espada, un arco o un ataque natural
    // utilizan automáticamente sus propias reglas.
    if (evaluacionAtaque.puedeAtacar) {
      const resultadoAtaque = objetivo.atacar(jugador);

      mensajes.push(resultadoAtaque.mensaje);

      if (!jugador.estaVivo) {
        mensajes.push("Has muerto. Recargá la página para reiniciar.");

        break;
      }

      continue;
    }

    const resultadoMovimiento = moverEnemigoHaciaJugador({
      enemigo: objetivo,
      jugador,
      mapa,
      objetivos,
    });

    if (resultadoMovimiento.movimientosRealizados > 0) {
      mensajes.push(`${objetivo.nombre} avanza hacia vos.`);
    }

    // Conservamos la regla actual:
    // un enemigo que se movió no ataca
    // durante el mismo turno.
  }

  return {
    mensajes,
    mensaje: mensajes.join(" "),
  };
}
