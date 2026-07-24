import { usarConsumibleDesdeInventario } from "./SistemaConsumibles.js";
import { transferirObjetoEntreContenedores } from "./SistemaTransferenciaObjetos.js";
import {
  capturarEstadoRecursos,
  restaurarRecursosTrasRecalculo,
} from "../magia/CalculadorAtributosMagicos.js";

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

// Decide qué hacer al seleccionar un objeto del inventario.
//
// Prioridades:
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

  if (objeto.esMunicion) {
    return cargarMunicionDesdeInventario(player, indiceInventario);
  }

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

// Carga munición desde el inventario al carcaj equipado.
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

  const nombreMunicion = municion.nombre;
  const resultadoTransferencia = transferirObjetoEntreContenedores({
    contenedorOrigen: player.inventario,
    contenedorDestino: quiver.contenedorObjetos,
    indiceOrigen: indiceInventario,
  });

  if (!resultadoTransferencia.exito) {
    const contenidoActual = quiver.contenedorObjetos.obtenerObjetos()[0];
    return {
      exito: false,
      mensaje: contenidoActual
        ? `${quiver.nombre} ya contiene ` +
          `${contenidoActual.nombre} y no tiene espacio disponible.`
        : `No se pudo cargar ${nombreMunicion} ` + `en ${quiver.nombre}.`,
    };
  }

  const mensajes = [
    `Cargaste ${resultadoTransferencia.cantidadTransferida} ` +
      `${nombreMunicion} en ${quiver.nombre}.`,
    `Ahora contiene ${quiver.cantidadMunicion}.`,
  ];

  // Una transferencia puede ser parcial cuando solamente existe espacio
  // dentro de una pila ya iniciada.
  if (resultadoTransferencia.cantidadRestante > 0) {
    mensajes.push(
      `Quedaron ${resultadoTransferencia.cantidadRestante} ` +
        `${nombreMunicion} en el inventario.`,
    );
  }

  return {
    exito: true,
    cantidadTransferida: resultadoTransferencia.cantidadTransferida,
    cantidadRestante: resultadoTransferencia.cantidadRestante,
    transferenciaCompleta: resultadoTransferencia.completa,
    mensaje: mensajes.join("\n"),
  };
}

// Equipa un objeto desde una posición del inventario.
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

  // Al retirar el objeto elegido se libera una posición adicional.
  const espaciosDisponibles = player.inventario.contarEspaciosLibres() + 1;
  if (objetosDesplazados.length > espaciosDisponibles) {
    return {
      exito: false,
      mensaje:
        "No hay espacio suficiente para guardar " +
        "los objetos que serían desequipados.",
    };
  }

  const estadoRecursosAnterior = capturarRecursosAntesCambioEquipo(player);
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
  recalcularRecursosTrasCambioEquipo(player, estadoRecursosAnterior);

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

// Devuelve un objeto equipado al inventario.
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

  const estadoRecursosAnterior = capturarRecursosAntesCambioEquipo(player);
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

  recalcularRecursosTrasCambioEquipo(player, estadoRecursosAnterior);

  return {
    exito: true,
    objetoDesequipado,
    mensaje: `${objetoDesequipado.nombre} volvió al inventario.`,
  };
}

// Decide automáticamente la ranura más práctica.
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

    // Con arco principal, una espada se coloca en secundaria para
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

function capturarRecursosAntesCambioEquipo(player) {
  // Asegura que los máximos reflejen el equipo actual antes de la mutación.
  player.estadisticasDerivadas;
  return capturarEstadoRecursos(player);
}

function recalcularRecursosTrasCambioEquipo(player, estadoAnterior) {
  // Recalcula una sola vez después de una operación confirmada. El Maná
  // conserva su proporción, incluso si una pieza modifica el máximo.
  player.estadisticasDerivadas;
  restaurarRecursosTrasRecalculo(player, estadoAnterior);
}

function validarPlayer(player) {
  if (!player?.inventario || !player?.equipamiento) {
    throw new Error("Se necesita un jugador con inventario y equipamiento.");
  }
}
