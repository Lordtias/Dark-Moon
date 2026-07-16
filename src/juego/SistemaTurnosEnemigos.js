// Importamos Enemigo para distinguir criaturas hostiles
// de objetos destructibles como barriles.
import {
  Enemigo
} from "../entidad/destructible/combatiente/Enemigo.js";

// Importamos el buscador que encuentra el siguiente
// paso disponible hacia el jugador.
import {
  buscarSiguientePaso
} from "./BuscadorCamino.js";

/**
 * Convierte una posición en una clave de texto.
 *
 * Debe usar el mismo formato que BuscadorCamino:
 * "x,y".
 *
 * @param {number} x Posición horizontal.
 * @param {number} y Posición vertical.
 * @returns {string} Clave de la posición.
 */
function crearClavePosicion(
  x,
  y
) {
  return `${x},${y}`;
}

/**
 * Calcula la distancia entre dos entidades utilizando
 * distancia Manhattan.
 *
 * El movimiento solamente permite direcciones
 * horizontales y verticales.
 *
 * @param {Object} origen Primera posición.
 * @param {Object} destino Segunda posición.
 * @returns {number} Distancia expresada en casillas.
 */
export function calcularDistanciaManhattan(
  origen,
  destino
) {
  return (
    Math.abs(origen.x - destino.x) +
    Math.abs(origen.y - destino.y)
  );
}

/**
 * Actualiza el estado de agresividad de un enemigo.
 *
 * Los enemigos activos detectan automáticamente.
 * Los reactivos deben haber sido provocados.
 *
 * @param {Enemigo} enemigo Enemigo evaluado.
 * @param {Object} jugador Personaje controlado.
 * @returns {Object} Distancia y mensajes generados.
 */
function actualizarAgresividad(
  enemigo,
  jugador
) {
  const mensajes = [];

  const distancia =
    calcularDistanciaManhattan(
      enemigo,
      jugador
    );

  const {
    tipoAgresividad,
    percepcion
  } = enemigo.configuracionIA;

  // Un enemigo activo detecta automáticamente
  // al jugador cuando entra en su percepción.
  if (
    !enemigo.estaAgresivo &&
    tipoAgresividad === "activa" &&
    distancia <= percepcion
  ) {
    enemigo.activarAgresividad();

    mensajes.push(
      `${enemigo.nombre} te ha detectado.`
    );
  }

  // Un enemigo agresivo deja de perseguir cuando
  // el jugador supera su alcance máximo.
  if (
    enemigo.estaAgresivo &&
    distancia > enemigo.rangoPersecucion
  ) {
    enemigo.desactivarAgresividad();

    mensajes.push(
      `${enemigo.nombre} dejó de perseguirte.`
    );
  }

  return {
    distancia,
    mensajes
  };
}

/**
 * Crea el conjunto de posiciones que el enemigo
 * no puede atravesar.
 *
 * Se consideran bloqueantes:
 * - Otros enemigos vivos.
 * - Barriles.
 * - Cualquier otro objetivo no destruido.
 *
 * @param {Array<Object>} objetivos Entidades del mapa.
 * @param {Enemigo} enemigoActual Enemigo que se moverá.
 * @returns {Set<string>} Posiciones bloqueadas.
 */
function obtenerPosicionesBloqueadas(
  objetivos,
  enemigoActual
) {
  const posicionesBloqueadas =
    new Set();

  objetivos.forEach((objetivo) => {
    // El enemigo no puede bloquearse a sí mismo.
    if (objetivo === enemigoActual) {
      return;
    }

    // Los objetivos destruidos dejan libre su casilla.
    if (objetivo.estaDestruido) {
      return;
    }

    posicionesBloqueadas.add(
      crearClavePosicion(
        objetivo.x,
        objetivo.y
      )
    );
  });

  return posicionesBloqueadas;
}

/**
 * Intenta mover un enemigo hacia el jugador.
 *
 * Puede realizar tantos pasos como indique
 * movimientosPorTurno.
 *
 * El movimiento se detiene cuando:
 * - Alcanza su rango de ataque.
 * - No existe un camino.
 * - Ya utilizó todos sus movimientos.
 *
 * @param {Object} opciones Información necesaria.
 * @param {Enemigo} opciones.enemigo Enemigo actual.
 * @param {Object} opciones.jugador Jugador perseguido.
 * @param {Array<string>} opciones.mapa Mapa actual.
 * @param {Array<Object>} opciones.objetivos Entidades.
 * @returns {Object} Cantidad de movimientos realizados.
 */
function moverEnemigoHaciaJugador({
  enemigo,
  jugador,
  mapa,
  objetivos
}) {
  let movimientosRealizados = 0;

  const movimientosPermitidos =
    enemigo.configuracionIA
      .movimientosPorTurno;

  // Ejecutamos cada movimiento de forma individual.
  //
  // Esto permite recalcular obstáculos si el enemigo
  // puede desplazarse más de una casilla por turno.
  for (
    let movimiento = 0;
    movimiento < movimientosPermitidos;
    movimiento += 1
  ) {
    const distanciaActual =
      calcularDistanciaManhattan(
        enemigo,
        jugador
      );

    // Cuando ya está dentro de su rango de ataque,
    // deja de acercarse.
    if (
      distanciaActual <=
      enemigo.configuracionIA.rangoAtaque
    ) {
      break;
    }

    // Obtenemos las posiciones ocupadas utilizando
    // el estado más reciente de todas las entidades.
    const posicionesBloqueadas =
      obtenerPosicionesBloqueadas(
        objetivos,
        enemigo
      );

    // Buscamos únicamente el próximo paso.
    const siguientePaso =
      buscarSiguientePaso({
        mapa,

        origen: {
          x: enemigo.x,
          y: enemigo.y
        },

        destino: {
          x: jugador.x,
          y: jugador.y
        },

        posicionesBloqueadas
      });

    // Si no existe un camino, el enemigo
    // permanece en su posición.
    if (!siguientePaso) {
      break;
    }

    // Movemos al enemigo una casilla.
    enemigo.x =
      siguientePaso.x;

    enemigo.y =
      siguientePaso.y;

    movimientosRealizados += 1;
  }

  return {
    movimientosRealizados
  };
}

/**
 * Procesa la fase de todos los enemigos vivos.
 *
 * Cada enemigo puede:
 * - Detectar al jugador.
 * - Abandonar la persecución.
 * - Atacar.
 * - Moverse hacia el jugador.
 *
 * @param {Object} opciones Datos necesarios.
 * @param {Array<Object>} opciones.objetivos Enemigos y objetos.
 * @param {Object} opciones.jugador Jugador actual.
 * @param {Array<string>} opciones.mapa Mapa actual.
 * @returns {Object} Resultado completo de la fase.
 */
export function procesarFaseEnemigos({
  objetivos,
  jugador,
  mapa
}) {
  const mensajes = [];

  // Los enemigos actúan de manera secuencial.
  //
  // Como sus posiciones se actualizan inmediatamente,
  // los siguientes enemigos ya reconocen las nuevas
  // casillas ocupadas.
  for (const objetivo of objetivos) {
    // Los objetos destructibles no tienen turnos.
    if (!(objetivo instanceof Enemigo)) {
      continue;
    }

    // Los enemigos derrotados no pueden actuar.
    if (!objetivo.estaVivo) {
      continue;
    }

    // Cuando el jugador muere, finaliza la fase.
    if (!jugador.estaVivo) {
      break;
    }

    const resultadoAgresividad =
      actualizarAgresividad(
        objetivo,
        jugador
      );

    mensajes.push(
      ...resultadoAgresividad.mensajes
    );

    // Los enemigos pasivos o que abandonaron
    // la persecución no realizan acciones.
    if (!objetivo.estaAgresivo) {
      continue;
    }

    const rangoAtaque =
      objetivo.configuracionIA
        .rangoAtaque;

    // Si ya está dentro del alcance,
    // ataca en lugar de moverse.
    if (
      resultadoAgresividad.distancia <=
      rangoAtaque
    ) {
      const resultadoAtaque =
        objetivo.atacar(jugador);

      mensajes.push(
        resultadoAtaque.mensaje
      );

      if (!jugador.estaVivo) {
        mensajes.push(
          "Has muerto. Recargá la página para reiniciar."
        );

        break;
      }

      // Un enemigo que atacó no se mueve
      // durante el mismo turno.
      continue;
    }

    // Si no puede atacar, intenta acercarse.
    const resultadoMovimiento =
      moverEnemigoHaciaJugador({
        enemigo: objetivo,
        jugador,
        mapa,
        objetivos
      });

    // Mostramos un único mensaje aunque el enemigo
    // tenga más de un movimiento por turno.
    if (
      resultadoMovimiento
        .movimientosRealizados > 0
    ) {
      mensajes.push(
        `${objetivo.nombre} avanza hacia vos.`
      );
    }

    // En esta primera versión, un enemigo que acaba
    // de moverse no ataca hasta su próximo turno.
  }

  return {
    mensajes,
    mensaje: mensajes.join(" ")
  };
}