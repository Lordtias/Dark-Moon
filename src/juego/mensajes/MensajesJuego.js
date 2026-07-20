// Categorías visuales disponibles para
// los mensajes del registro de eventos.
export const TIPOS_MENSAJE_JUEGO = Object.freeze({
  SISTEMA: "sistema",

  POSITIVO: "positivo",

  ALERTA: "alerta",

  NEGATIVO: "negativo",
});

const TIPOS_VALIDOS = new Set(Object.values(TIPOS_MENSAJE_JUEGO));

// Crea un mensaje explícitamente tipado.
//
// Este será el formato recomendado para
// nuevos sistemas del juego.
export function crearMensajeJuego(texto, tipo = TIPOS_MENSAJE_JUEGO.SISTEMA) {
  if (typeof texto !== "string" || texto.trim() === "") {
    throw new Error("El mensaje del juego debe contener texto.");
  }

  if (!TIPOS_VALIDOS.has(tipo)) {
    throw new Error(`El tipo de mensaje "${tipo}" no es válido.`);
  }

  return {
    texto: texto.trim(),

    tipo,
  };
}

// Convierte cualquiera de estos formatos:
//
// - Texto simple.
// - Mensaje tipado.
// - Lista de mensajes.
//
// Los textos antiguos se clasifican
// temporalmente según su contenido.
export function normalizarMensajesJuego(valor, { nombreJugador = "" } = {}) {
  if (valor === null || valor === undefined) {
    return [];
  }

  if (Array.isArray(valor)) {
    return valor.flatMap((elemento) =>
      normalizarMensajesJuego(elemento, {
        nombreJugador,
      }),
    );
  }

  if (typeof valor === "object") {
    return [normalizarMensajeTipado(valor)];
  }

  if (typeof valor === "string") {
    return convertirTextoExistente({
      texto: valor,

      nombreJugador,
    });
  }

  throw new Error("El formato del mensaje del juego no es válido.");
}

function normalizarMensajeTipado(mensaje) {
  const texto = mensaje.texto;

  const tipo = mensaje.tipo ?? TIPOS_MENSAJE_JUEGO.SISTEMA;

  return crearMensajeJuego(texto, tipo);
}

// Mantiene compatibilidad con todos los mensajes
// que actualmente se generan como texto.
//
// Los futuros sistemas podrán enviar directamente:
//
// {
//   texto: "...",
//   tipo: TIPOS_MENSAJE_JUEGO.POSITIVO
// }
function convertirTextoExistente({ texto, nombreJugador }) {
  const lineas = texto
    .split(/\r?\n/u)
    .map((linea) => linea.trim())
    .filter(Boolean);

  const mensajes = [];

  let contextoAtaque = null;

  for (const linea of lineas) {
    const resultadoContexto = determinarContextoAtaque({
      linea,
      nombreJugador,
      contextoActual: contextoAtaque,
    });

    contextoAtaque = resultadoContexto.contexto;

    const tipo = clasificarLinea({
      linea,

      nombreJugador,

      contextoAtaque: resultadoContexto.contexto,
    });

    mensajes.push(crearMensajeJuego(linea, tipo));
  }

  return mensajes;
}

function determinarContextoAtaque({ linea, nombreJugador, contextoActual }) {
  const texto = linea.toLocaleLowerCase("es");

  const jugador = nombreJugador.trim().toLocaleLowerCase("es");

  if (jugador !== "" && texto.startsWith(`${jugador} ataca a `)) {
    return {
      contexto: "jugador",
    };
  }

  if (jugador !== "" && texto.includes(` ataca a ${jugador}`)) {
    return {
      contexto: "enemigo",
    };
  }

  return {
    contexto: contextoActual,
  };
}

function clasificarLinea({ linea, nombreJugador, contextoAtaque }) {
  const texto = linea.toLocaleLowerCase("es");

  const jugador = nombreJugador.trim().toLocaleLowerCase("es");

  // Encabezado de un ataque realizado
  // por el jugador.
  if (jugador !== "" && texto.startsWith(`${jugador} ataca a `)) {
    return TIPOS_MENSAJE_JUEGO.SISTEMA;
  }

  // Encabezado de un ataque enemigo.
  if (jugador !== "" && texto.includes(` ataca a ${jugador}`)) {
    return TIPOS_MENSAJE_JUEGO.ALERTA;
  }

  // Resultado de un golpe que falló.
  if (texto.includes(" falla ") || texto.includes(" falla contra ")) {
    return contextoAtaque === "enemigo"
      ? TIPOS_MENSAJE_JUEGO.POSITIVO
      : TIPOS_MENSAJE_JUEGO.NEGATIVO;
  }

  // Resultado de un golpe exitoso.
  if (texto.includes(" impacta ") && texto.includes(" causa ")) {
    return contextoAtaque === "enemigo"
      ? TIPOS_MENSAJE_JUEGO.NEGATIVO
      : TIPOS_MENSAJE_JUEGO.POSITIVO;
  }

  // Resumen de daño dual.
  if (texto.startsWith("daño total:")) {
    return contextoAtaque === "enemigo"
      ? TIPOS_MENSAJE_JUEGO.NEGATIVO
      : TIPOS_MENSAJE_JUEGO.POSITIVO;
  }

  if (
    contieneAlguno(texto, [
      "has muerto",
      "está derrotado",
      "no puede atacar porque está derrotado",
    ])
  ) {
    return TIPOS_MENSAJE_JUEGO.NEGATIVO;
  }

  // Alertas relacionadas con enemigos
  // o acciones imposibles.
  if (
    contieneAlguno(texto, [
      "te ha detectado",
      "avanza hacia vos",
      "no podés",
      "no hay una casilla",
      "supera el alcance",
      "trayectoria está bloqueada",
      "necesita un quiver",
      "no tiene munición",
      "confirmá con",
    ])
  ) {
    return TIPOS_MENSAJE_JUEGO.ALERTA;
  }

  // Resultados favorables.
  if (
    contieneAlguno(texto, [
      "fue derrotado",
      "fue destruido",
      "ganaste ",
      "recuperaste ",
      "dejó de perseguirte",
    ])
  ) {
    return TIPOS_MENSAJE_JUEGO.POSITIVO;
  }

  // Progreso, controles y cambios internos.
  if (
    contieneAlguno(texto, [
      "mapa generado:",
      "modo combate:",
      "seleccionaste ",
      "cancelaste el modo combate",
      "te moviste por",
      "esperaste un turno",
      "atacaste una casilla",
      "munición restante:",
      "subiste al nivel",
      "subiste ",
      "obtuviste ",
      "vuelve a utilizar",
      "cambia a su ataque natural",
      "el segundo golpe no se realizó",
    ])
  ) {
    return TIPOS_MENSAJE_JUEGO.SISTEMA;
  }

  // Los mensajes aún no catalogados se muestran
  // como información general del sistema.
  return TIPOS_MENSAJE_JUEGO.SISTEMA;
}

function contieneAlguno(texto, fragmentos) {
  return fragmentos.some((fragmento) => texto.includes(fragmento));
}
