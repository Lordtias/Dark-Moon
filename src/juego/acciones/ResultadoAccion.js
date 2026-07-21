// Define la estructura común utilizada por las acciones del juego.
//
// Una acción puede representar:
//
// - Movimiento.
// - Ataque.
// - Espera.
// - Equipamiento.
// - Consumo de objetos.
// - Interacción.
// - Movimiento de un selector.
//
// Centralizar esta estructura evita que cada sistema construya
// resultados ligeramente diferentes.
//
// La propiedad "eventos" todavía no participa de la interfaz,
// pero queda preparada para que Phaser pueda reproducir:
// movimientos, ataques, daño, muertes y aparición de botín.
export function crearResultadoAccion({
  exito = true,
  mensaje = null,
  turnoConsumido = false,
  redibujar = false,
  eventos = [],
  ...datosAdicionales
} = {}) {
  validarBooleano(exito, "exito");
  validarMensaje(mensaje);
  validarBooleano(turnoConsumido, "turnoConsumido");
  validarBooleano(redibujar, "redibujar");
  validarEventos(eventos);

  return {
    // Conservamos información específica de determinadas acciones,
    // como "interaccion", "entidad", "cantidadTransferida", etc.
    ...datosAdicionales,

    // Las propiedades comunes siempre quedan presentes.
    exito,
    mensaje,
    turnoConsumido,
    redibujar,

    // Copiamos la lista para evitar que quien recibe el resultado
    // modifique accidentalmente la lista original.
    eventos: [...eventos],
  };
}

// Convierte un resultado antiguo o incompleto
// al nuevo formato común.
//
// Esto permite migrar Juego.js progresivamente, sin tener
// que reemplazar de golpe todos sus resultados actuales.
export function normalizarResultadoAccion(resultado) {
  if (resultado === null || resultado === undefined) {
    return null;
  }

  if (typeof resultado !== "object" || Array.isArray(resultado)) {
    throw new Error("El resultado de una acción debe ser un objeto válido.");
  }

  return crearResultadoAccion({
    ...resultado,

    // Algunos resultados actuales de Juego.js no incluyen "exito".
    // Mientras dure la migración, asumimos que fueron exitosos.
    exito: resultado.exito ?? true,

    // Un mensaje ausente se interpreta como ausencia de mensaje.
    mensaje: resultado.mensaje ?? null,

    // Una acción no consume tiempo salvo que lo indique.
    turnoConsumido: resultado.turnoConsumido ?? false,

    // Una acción no solicita redibujado salvo que lo indique.
    redibujar: resultado.redibujar ?? false,

    // Los eventos se incorporarán gradualmente.
    eventos: resultado.eventos ?? [],
  });
}

// Valida las propiedades booleanas del resultado.
function validarBooleano(valor, nombrePropiedad) {
  if (typeof valor !== "boolean") {
    throw new Error(
      `La propiedad "${nombrePropiedad}" del resultado ` + "debe ser booleana.",
    );
  }
}

// El mensaje puede ser texto o null cuando no hay nada que mostrar.
function validarMensaje(mensaje) {
  if (mensaje !== null && typeof mensaje !== "string") {
    throw new Error(
      'La propiedad "mensaje" del resultado debe ser texto o null.',
    );
  }
}

// Cada evento futuro deberá incluir un tipo.
//
// Ejemplo:
//
// {
//   tipo: "entidad_movida",
//   entidad: jugador,
//   desde: { x: 3, y: 4 },
//   hasta: { x: 4, y: 4 }
// }
function validarEventos(eventos) {
  if (!Array.isArray(eventos)) {
    throw new Error('La propiedad "eventos" del resultado debe ser una lista.');
  }

  eventos.forEach((evento, indice) => {
    if (
      evento === null ||
      typeof evento !== "object" ||
      Array.isArray(evento)
    ) {
      throw new Error(
        `El evento ubicado en la posición ${indice} no es válido.`,
      );
    }

    if (typeof evento.tipo !== "string" || evento.tipo.trim() === "") {
      throw new Error(
        `El evento ubicado en la posición ${indice} ` +
          'necesita una propiedad "tipo".',
      );
    }
  });
}
