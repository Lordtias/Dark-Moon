// Tipos de efectos que actualmente pueden
// aplicar los objetos consumibles.
//
// La lista puede ampliarse en el futuro con:
//
// - Estados temporales.
// - Daño elemental.
// - Teletransporte.
// - Identificación de objetos.
// - Efectos propios de pergaminos.
export const TIPOS_EFECTO_CONSUMIBLE = Object.freeze({
  RECUPERAR_VIDA: "recuperarVida",
  RECUPERAR_MANA: "recuperarMana",
});

// Comprueba que el jugador tenga las capacidades
// necesarias para utilizar consumibles.
function validarPlayer(player) {
  if (
    !player ||
    !player.inventario ||
    typeof player.recuperarVida !== "function" ||
    typeof player.recuperarMana !== "function"
  ) {
    throw new Error("Se necesita un jugador válido para utilizar consumibles.");
  }
}

// Evalúa cuánto podría aplicar realmente
// un efecto antes de consumir el objeto.
//
// Esta evaluación permite evitar que una poción:
//
// - Se gaste con la Vida completa.
// - Consuma tiempo sin producir ningún efecto.
function evaluarEfectoConsumible(player, efecto) {
  switch (efecto.tipo) {
    case TIPOS_EFECTO_CONSUMIBLE.RECUPERAR_VIDA: {
      const cantidadAplicable = Math.min(
        efecto.cantidad,
        Math.max(0, player.vidaMaxima - player.vidaActual),
      );

      return {
        tipo: efecto.tipo,
        cantidadSolicitada: efecto.cantidad,
        cantidadAplicable,
      };
    }

    case TIPOS_EFECTO_CONSUMIBLE.RECUPERAR_MANA: {
      const cantidadAplicable = Math.min(
        efecto.cantidad,
        Math.max(0, player.manaMaximo - player.manaActual),
      );

      return {
        tipo: efecto.tipo,
        cantidadSolicitada: efecto.cantidad,
        cantidadAplicable,
      };
    }

    default:
      throw new Error(
        `El efecto consumible "${efecto.tipo}" no está implementado.`,
      );
  }
}

// Aplica un efecto previamente evaluado.
//
// La cantidad utilizada es la cantidad aplicable,
// no necesariamente la cantidad total configurada.
function aplicarEfectoConsumible(player, evaluacion) {
  switch (evaluacion.tipo) {
    case TIPOS_EFECTO_CONSUMIBLE.RECUPERAR_VIDA:
      return {
        tipo: evaluacion.tipo,

        cantidadAplicada: player.recuperarVida(evaluacion.cantidadAplicable),
      };

    case TIPOS_EFECTO_CONSUMIBLE.RECUPERAR_MANA:
      return {
        tipo: evaluacion.tipo,

        cantidadAplicada: player.recuperarMana(evaluacion.cantidadAplicable),
      };

    default:
      throw new Error(
        `El efecto consumible "${evaluacion.tipo}" no está implementado.`,
      );
  }
}

// Construye el mensaje correspondiente
// a los efectos que fueron aplicados.
function crearMensajeEfectos(efectosAplicados) {
  const partes = [];

  for (const efecto of efectosAplicados) {
    if (efecto.cantidadAplicada <= 0) {
      continue;
    }

    if (efecto.tipo === TIPOS_EFECTO_CONSUMIBLE.RECUPERAR_VIDA) {
      partes.push(`${efecto.cantidadAplicada} de Vida`);
    }

    if (efecto.tipo === TIPOS_EFECTO_CONSUMIBLE.RECUPERAR_MANA) {
      partes.push(`${efecto.cantidadAplicada} de Maná`);
    }
  }

  return partes;
}

// Crea un mensaje útil cuando ninguno
// de los efectos puede aplicarse.
function crearMensajeSinEfecto(objeto) {
  const tipos = objeto.propiedades.efectos.map((efecto) => efecto.tipo);

  const solamenteVida =
    tipos.length === 1 && tipos[0] === TIPOS_EFECTO_CONSUMIBLE.RECUPERAR_VIDA;

  if (solamenteVida) {
    return (
      "Ya tenés la Vida al máximo. " + `${objeto.nombre} no fue consumida.`
    );
  }

  const solamenteMana =
    tipos.length === 1 && tipos[0] === TIPOS_EFECTO_CONSUMIBLE.RECUPERAR_MANA;

  if (solamenteMana) {
    return (
      "Ya tenés el Maná al máximo. " + `${objeto.nombre} no fue consumida.`
    );
  }

  return (
    `${objeto.nombre} no puede producir ` + "ningún efecto en este momento."
  );
}

// Utiliza una unidad de un consumible
// ubicado en el inventario.
//
// Orden de ejecución:
//
// 1. Validar el objeto.
// 2. Evaluar sus efectos.
// 3. Confirmar que al menos uno pueda aplicarse.
// 4. Retirar una unidad de la pila.
// 5. Aplicar los efectos.
//
// Si ningún efecto es útil, no se consume
// ni el objeto ni una acción temporal.
export function usarConsumibleDesdeInventario(player, indiceInventario) {
  validarPlayer(player);

  const objeto = player.inventario.obtenerObjetoEn(indiceInventario);

  if (!objeto) {
    return {
      exito: false,

      mensaje: "Ese espacio del inventario está vacío.",
    };
  }

  if (!objeto.esConsumible) {
    return {
      exito: false,

      mensaje: `${objeto.nombre} no es un consumible.`,
    };
  }

  const evaluaciones = objeto.propiedades.efectos.map((efecto) =>
    evaluarEfectoConsumible(player, efecto),
  );

  const tieneEfectoAplicable = evaluaciones.some(
    (evaluacion) => evaluacion.cantidadAplicable > 0,
  );

  if (!tieneEfectoAplicable) {
    return {
      exito: false,
      consumible: objeto,

      mensaje: crearMensajeSinEfecto(objeto),
    };
  }

  // El objeto se retira antes de aplicar
  // definitivamente los efectos.
  //
  // La evaluación anterior garantiza que
  // el consumo producirá algún resultado.
  const consumido = player.inventario.consumirCantidadObjeto(
    (item) => item === objeto,

    1,
  );

  if (!consumido) {
    return {
      exito: false,

      mensaje: `No se pudo consumir ${objeto.nombre}.`,
    };
  }

  const efectosAplicados = evaluaciones
    .filter((evaluacion) => evaluacion.cantidadAplicable > 0)
    .map((evaluacion) => aplicarEfectoConsumible(player, evaluacion));

  const efectosMensaje = crearMensajeEfectos(efectosAplicados);

  const detalleRecuperacion =
    efectosMensaje.length > 0
      ? ` Recuperaste ${efectosMensaje.join(" y ")}.`
      : "";

  return {
    exito: true,
    consumible: objeto,
    cantidadConsumida: 1,
    efectosAplicados,

    // Juego utilizará este valor como
    // coste temporal base del consumo.
    costoConsumo: objeto.costoConsumo,

    mensaje: `Usaste ${objeto.nombre}.` + detalleRecuperacion,
  };
}
