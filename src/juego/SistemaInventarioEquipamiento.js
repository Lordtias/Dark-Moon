import { usarConsumibleDesdeInventario } from "./SistemaConsumibles.js";

const ETIQUETAS_RANURAS = {
  cabeza: "Cabeza",
  torso: "Torso",
  manos: "Manos",
  piernas: "Piernas",
  pies: "Pies",
  arma: "Arma",
  secundaria: "Secundaria",
  collar: "Collar",
  anillo_derecho: "Anillo derecho",
  anillo_izquierdo: "Anillo izquierdo",
};

// Decide qué hacer al seleccionar
// un objeto del inventario.
//
// Prioridades:
//
// 1. Munición: cargar en el carcaj.
// 2. Consumible: utilizar una unidad.
// 3. Equipable: equipar.
// 4. Otros objetos: informar que aún no se usan.
export function interactuarConObjetoInventario(player, indiceInventario) {
  validarPlayer(player);

  const objeto = player.inventario.obtenerObjetoEn(indiceInventario);

  if (!objeto) {
    return {
      exito: false,

      mensaje: "Ese espacio del inventario está vacío.",
    };
  }

  // Las municiones se cargan
  // en el carcaj equipado.
  if (objeto.esMunicion) {
    return cargarMunicionDesdeInventario(player, indiceInventario);
  }

  // Los consumibles aplican sus efectos
  // y reducen una unidad de su pila.
  if (objeto.esConsumible) {
    return usarConsumibleDesdeInventario(player, indiceInventario);
  }

  if (!objeto.esEquipable) {
    return {
      exito: false,

      mensaje: `${objeto.nombre} no puede utilizarse por ahora.`,
    };
  }

  return equiparObjetoDesdeInventario(player, indiceInventario);
}

// Carga munición desde el inventario
// al carcaj equipado.
export function cargarMunicionDesdeInventario(player, indiceInventario) {
  validarPlayer(player);

  const municion = player.inventario.obtenerObjetoEn(indiceInventario);

  if (!municion?.esMunicion) {
    return {
      exito: false,

      mensaje: "El objeto seleccionado no es munición.",
    };
  }

  const quiver = obtenerQuiverEquipado(player);

  if (!quiver) {
    return {
      exito: false,

      mensaje: "Necesitás un carcaj equipado en secundaria.",
    };
  }

  if (quiver.propiedades.tipoMunicion !== municion.propiedades.tipoMunicion) {
    return {
      exito: false,

      mensaje: `${quiver.nombre} no admite ${municion.nombre}.`,
    };
  }

  const contenedor = quiver.contenedorObjetos;

  // Solamente se apilan
  // objetos idénticos.
  const pilaExistente = contenedor.buscarPrimerObjeto(
    (objeto) => objeto.esMunicion && objeto.id === municion.id,
  );

  if (pilaExistente) {
    const espacioDisponible =
      pilaExistente.cantidadMaxima - pilaExistente.cantidad;

    if (espacioDisponible <= 0) {
      return {
        exito: false,

        mensaje:
          `${quiver.nombre} ya tiene la pila de ` +
          `${municion.nombre} completa.`,
      };
    }

    const cantidadTransferida = Math.min(espacioDisponible, municion.cantidad);

    pilaExistente.cantidad += cantidadTransferida;

    municion.cantidad -= cantidadTransferida;

    if (municion.cantidad === 0) {
      player.inventario.retirarObjeto(indiceInventario);
    }

    return {
      exito: true,
      cantidadTransferida,

      mensaje:
        `Cargaste ${cantidadTransferida} ` +
        `${municion.nombre} en ${quiver.nombre}.\n` +
        `Ahora contiene ${quiver.cantidadMunicion}.`,
    };
  }

  // Si no existe una pila igual,
  // se necesita una posición libre
  // dentro del carcaj.
  if (contenedor.estaLleno()) {
    const contenidoActual = contenedor.obtenerObjetos()[0];

    return {
      exito: false,

      mensaje:
        `${quiver.nombre} ya contiene ` +
        `${contenidoActual?.nombre ?? "otra munición"}.`,
    };
  }

  const objetoRetirado = player.inventario.retirarObjeto(indiceInventario);

  const agregado = contenedor.agregarObjeto(objetoRetirado);

  if (!agregado) {
    player.inventario.colocarObjetoEn(indiceInventario, objetoRetirado);

    return {
      exito: false,

      mensaje: "No se pudo cargar la munición en el carcaj.",
    };
  }

  return {
    exito: true,

    cantidadTransferida: objetoRetirado.cantidad,

    mensaje:
      `Cargaste ${objetoRetirado.cantidad} ` +
      `${objetoRetirado.nombre} en ${quiver.nombre}.`,
  };
}

// Equipa un objeto desde
// una posición del inventario.
export function equiparObjetoDesdeInventario(
  player,
  indiceInventario,
  ranuraPreferida = null,
) {
  validarPlayer(player);

  const objeto = player.inventario.obtenerObjetoEn(indiceInventario);

  if (!objeto) {
    return {
      exito: false,

      mensaje: "Ese espacio del inventario está vacío.",
    };
  }

  if (!objeto.esEquipable) {
    return {
      exito: false,

      mensaje: `${objeto.nombre} no puede equiparse.`,
    };
  }

  const ranura = ranuraPreferida ?? elegirRanuraAutomatica(player, objeto);

  if (!ranura) {
    return {
      exito: false,

      mensaje: `${objeto.nombre} no tiene una ranura compatible.`,
    };
  }

  let objetosDesplazados;

  try {
    objetosDesplazados = player.equipamiento.previsualizarObjetosDesplazados(
      ranura,
      objeto,
    );
  } catch (error) {
    return {
      exito: false,
      mensaje: error.message,
    };
  }

  // Al retirar el objeto elegido se libera
  // una posición adicional del inventario.
  const espaciosDisponibles = player.inventario.contarEspaciosLibres() + 1;

  if (objetosDesplazados.length > espaciosDisponibles) {
    return {
      exito: false,

      mensaje:
        "No hay espacio suficiente para guardar " +
        "los objetos que serían desequipados.",
    };
  }

  const objetoRetirado = player.inventario.retirarObjeto(indiceInventario);

  let resultado;

  try {
    resultado = player.equipamiento.equiparEnRanura(ranura, objetoRetirado);
  } catch (error) {
    player.inventario.colocarObjetoEn(indiceInventario, objetoRetirado);

    return {
      exito: false,
      mensaje: error.message,
    };
  }

  guardarObjetosDesplazados(
    player,
    resultado.objetosDesequipados,
    indiceInventario,
  );

  const etiqueta =
    ETIQUETAS_RANURAS[resultado.ranuraAsignada] ?? resultado.ranuraAsignada;

  const nombresDesplazados = resultado.objetosDesequipados.map(
    (item) => item.nombre,
  );

  let mensaje = `Equipaste ${objeto.nombre} en ${etiqueta}.`;

  if (nombresDesplazados.length === 1) {
    mensaje += ` ${nombresDesplazados[0]} volvió al inventario.`;
  } else if (nombresDesplazados.length > 1) {
    mensaje +=
      ` ${nombresDesplazados.join(", ")} ` + "volvieron al inventario.";
  }

  return {
    exito: true,
    mensaje,
    ...resultado,
  };
}

// Devuelve un objeto equipado
// al inventario.
export function desequiparObjetoAInventario(player, nombreRanura) {
  validarPlayer(player);

  if (player.inventario.estaLleno()) {
    return {
      exito: false,

      mensaje: "El inventario está lleno.",
    };
  }

  const estados = player.equipamiento.obtenerEstadoRanuras();

  const estado = estados[nombreRanura];

  if (!estado) {
    return {
      exito: false,

      mensaje: "La ranura seleccionada no existe.",
    };
  }

  const objeto = estado.objeto ?? estado.reservadaPor;

  if (!objeto) {
    return {
      exito: false,

      mensaje: "Esa ranura está vacía.",
    };
  }

  const objetoDesequipado = player.equipamiento.desequipar(nombreRanura);

  if (!objetoDesequipado) {
    return {
      exito: false,

      mensaje: "No se pudo desequipar el objeto.",
    };
  }

  const agregado = player.inventario.agregarObjeto(objetoDesequipado);

  if (!agregado) {
    return {
      exito: false,

      mensaje: "No se pudo devolver el objeto al inventario.",
    };
  }

  return {
    exito: true,
    objetoDesequipado,

    mensaje: `${objetoDesequipado.nombre} volvió al inventario.`,
  };
}

// Decide automáticamente la ranura
// más práctica.
function elegirRanuraAutomatica(player, objeto) {
  const compatibles = objeto.ranurasCompatibles.filter((ranura) =>
    player.equipamiento.tieneRanura(ranura),
  );

  if (compatibles.length === 0) {
    return null;
  }

  if (compatibles.length === 1) {
    return compatibles[0];
  }

  const puedePrincipal = compatibles.includes("arma");

  const puedeSecundaria = compatibles.includes("secundaria");

  if (objeto.esArma && puedePrincipal && puedeSecundaria) {
    const principal = player.equipamiento.obtenerObjetoEnRanura("arma");

    const secundaria = player.equipamiento.obtenerObjetoEnRanura("secundaria");

    const secundariaReservada =
      player.equipamiento.estaRanuraReservada("secundaria");

    if (!principal) {
      return "arma";
    }

    if (principal.bloqueaSecundaria) {
      return "arma";
    }

    // Con arco principal, una espada
    // se coloca en secundaria para
    // facilitar el cambio.
    if (principal.propiedades?.tipoAtaque === "distancia") {
      return "secundaria";
    }

    if (!secundaria && !secundariaReservada) {
      return "secundaria";
    }

    return "secundaria";
  }

  const ranuraLibre = compatibles.find(
    (ranura) =>
      player.equipamiento.obtenerObjetoEnRanura(ranura) === null &&
      !player.equipamiento.estaRanuraReservada(ranura),
  );

  return ranuraLibre ?? compatibles[0];
}

function guardarObjetosDesplazados(player, objetos, indiceOriginal) {
  objetos.forEach((objeto, indice) => {
    const usarEspacioOriginal =
      indice === 0 &&
      player.inventario.obtenerObjetoEn(indiceOriginal) === null;

    const agregado = usarEspacioOriginal
      ? player.inventario.colocarObjetoEn(indiceOriginal, objeto)
      : player.inventario.agregarObjeto(objeto);

    if (!agregado) {
      throw new Error(
        `No se pudo guardar ${objeto.nombre} ` + "en el inventario.",
      );
    }
  });
}

function obtenerQuiverEquipado(player) {
  if (!player.equipamiento.tieneRanura("secundaria")) {
    return null;
  }

  const objeto = player.equipamiento.obtenerObjetoEnRanura("secundaria");

  return objeto?.esQuiver ? objeto : null;
}

function validarPlayer(player) {
  if (!player?.inventario || !player?.equipamiento) {
    throw new Error("Se necesita un jugador con inventario y equipamiento.");
  }
}
