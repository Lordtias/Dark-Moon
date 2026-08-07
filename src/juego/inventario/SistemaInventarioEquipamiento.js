import { usarConsumibleDesdeInventario } from "./SistemaConsumibles.js";
import {
  crearMensajeTraducible,
  crearParametroContenidoMensaje,
  crearParametroTraduccionMensaje,
  TIPOS_MENSAJE_JUEGO,
} from "../mensajes/MensajesJuego.js";
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
function parametroObjeto(objeto) {
  return crearParametroContenidoMensaje("objetos", objeto?.id, { respaldo: objeto?.nombre ?? "" });
}

function parametroRanura(id, respaldo) {
  const mapa = {
    cabeza: "cabeza", torso: "torso", manos: "manos", piernas: "piernas", pies: "pies",
    arma: "arma", secundaria: "secundaria", collar: "collar",
    anillo_derecho: "anilloDerecho", anillo_izquierdo: "anilloIzquierdo",
  };
  const clave = mapa[id];
  return clave
    ? crearParametroTraduccionMensaje(`interfaz.equipamiento.${clave}`, { respaldo })
    : respaldo;
}

function mensajeInventario(sufijo, respaldo, tipo = TIPOS_MENSAJE_JUEGO.SISTEMA) {
  return crearMensajeTraducible(`mensajes.inventario.${sufijo}`, { tipo, respaldo });
}

function mensajeObjetoInventario(sufijo, objeto, respaldo, tipo) {
  return crearMensajeTraducible(`mensajes.inventario.${sufijo}`, {
    parametros: { objeto: parametroObjeto(objeto) },
    tipo,
    respaldo,
  });
}

export function interactuarConObjetoInventario(player, indiceInventario) {
  validarPlayer(player);
  const objeto = player.inventario.obtenerObjetoEn(indiceInventario);

  if (!objeto) {
    return {
      exito: false,
      mensaje: mensajeInventario("espacioVacio", "Ese espacio del inventario está vacío.", TIPOS_MENSAJE_JUEGO.ALERTA),
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
      mensaje: mensajeObjetoInventario("noUtilizable", objeto, `${objeto.nombre} no puede utilizarse por ahora.`, TIPOS_MENSAJE_JUEGO.ALERTA),
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
      mensaje: mensajeInventario("noMunicion", "El objeto seleccionado no es munición.", TIPOS_MENSAJE_JUEGO.NEGATIVO),
    };
  }

  const quiver = obtenerQuiverEquipado(player);
  if (!quiver) {
    return {
      exito: false,
      mensaje: mensajeInventario("necesitaCarcaj", "Necesitás un carcaj equipado en secundaria.", TIPOS_MENSAJE_JUEGO.NEGATIVO),
    };
  }

  if (quiver.propiedades.tipoMunicion !== municion.propiedades.tipoMunicion) {
    return {
      exito: false,
      mensaje: crearMensajeTraducible("mensajes.inventario.municionIncompatible", {
        parametros: { quiver: parametroObjeto(quiver), municion: parametroObjeto(municion) },
        tipo: TIPOS_MENSAJE_JUEGO.NEGATIVO,
        respaldo: `${quiver.nombre} no admite ${municion.nombre}.`,
      }),
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
        ? crearMensajeTraducible("mensajes.inventario.carcajOcupado", {
            parametros: { quiver: parametroObjeto(quiver), contenido: parametroObjeto(contenidoActual) },
            tipo: TIPOS_MENSAJE_JUEGO.NEGATIVO,
            respaldo: `${quiver.nombre} ya contiene ${contenidoActual.nombre} y no tiene espacio disponible.`,
          })
        : crearMensajeTraducible("mensajes.inventario.cargaFallo", {
            parametros: { municion: parametroObjeto(municion), quiver: parametroObjeto(quiver) },
            tipo: TIPOS_MENSAJE_JUEGO.NEGATIVO,
            respaldo: `No se pudo cargar ${nombreMunicion} en ${quiver.nombre}.`,
          }),
    };
  }

  const mensajes = [
    crearMensajeTraducible("mensajes.inventario.cargasteEn", {
      parametros: {
        cantidad: resultadoTransferencia.cantidadTransferida,
        municion: parametroObjeto(municion),
        quiver: parametroObjeto(quiver),
      },
      tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
      respaldo: `Cargaste ${resultadoTransferencia.cantidadTransferida} ${nombreMunicion} en ${quiver.nombre}.`,
    }),
    crearMensajeTraducible("mensajes.inventario.carcajCantidad", {
      parametros: { cantidad: quiver.cantidadMunicion },
      tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
      respaldo: `Ahora contiene ${quiver.cantidadMunicion}.`,
    }),
  ];

  // Una transferencia puede ser parcial cuando solamente existe espacio
  // dentro de una pila ya iniciada.
  if (resultadoTransferencia.cantidadRestante > 0) {
    mensajes.push(
      crearMensajeTraducible("mensajes.inventario.restanteInventario", {
        parametros: { cantidad: resultadoTransferencia.cantidadRestante, municion: parametroObjeto(municion) },
        tipo: TIPOS_MENSAJE_JUEGO.ALERTA,
        respaldo: `Quedaron ${resultadoTransferencia.cantidadRestante} ${nombreMunicion} en el inventario.`,
      }),
    );
  }

  return {
    exito: true,
    cantidadTransferida: resultadoTransferencia.cantidadTransferida,
    cantidadRestante: resultadoTransferencia.cantidadRestante,
    transferenciaCompleta: resultadoTransferencia.completa,
    mensaje: mensajes,
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
      mensaje: mensajeInventario("espacioVacio", "Ese espacio del inventario está vacío.", TIPOS_MENSAJE_JUEGO.ALERTA),
    };
  }

  if (!objeto.esEquipable) {
    return {
      exito: false,
      mensaje: mensajeObjetoInventario("noEquipable", objeto, `${objeto.nombre} no puede equiparse.`, TIPOS_MENSAJE_JUEGO.NEGATIVO),
    };
  }

  const ranura = ranuraPreferida ?? elegirRanuraAutomatica(player, objeto);
  if (!ranura) {
    return {
      exito: false,
      mensaje: mensajeObjetoInventario("sinRanura", objeto, `${objeto.nombre} no tiene una ranura compatible.`, TIPOS_MENSAJE_JUEGO.NEGATIVO),
    };
  }

  let objetosDesplazados;
  try {
    objetosDesplazados = player.equipamiento.previsualizarObjetosDesplazados(
      ranura,
      objeto,
    );
  } catch (error) {
    console.error("[Dark Moon · Inventario]", error);
    return {
      exito: false,
      mensaje: mensajeInventario(
        "equiparFallo",
        "No se pudo equipar el objeto.",
        TIPOS_MENSAJE_JUEGO.NEGATIVO,
      ),
    };
  }

  // Al retirar el objeto elegido se libera una posición adicional.
  const espaciosDisponibles = player.inventario.contarEspaciosLibres() + 1;
  if (objetosDesplazados.length > espaciosDisponibles) {
    return {
      exito: false,
      mensaje: mensajeInventario(
        "sinEspacioDesplazados",
        "No hay espacio suficiente para guardar los objetos que serían desequipados.",
        TIPOS_MENSAJE_JUEGO.NEGATIVO,
      ),
    };
  }

  const estadoRecursosAnterior = capturarRecursosAntesCambioEquipo(player);
  const objetoRetirado = player.inventario.retirarObjeto(indiceInventario);
  let resultado;

  try {
    resultado = player.equipamiento.equiparEnRanura(ranura, objetoRetirado);
  } catch (error) {
    player.inventario.colocarObjetoEn(indiceInventario, objetoRetirado);
    console.error("[Dark Moon · Inventario]", error);
    return {
      exito: false,
      mensaje: mensajeInventario(
        "equiparFallo",
        "No se pudo equipar el objeto.",
        TIPOS_MENSAJE_JUEGO.NEGATIVO,
      ),
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
  const mensajes = [
    crearMensajeTraducible("mensajes.inventario.equipadoRanura", {
      parametros: {
        objeto: parametroObjeto(objeto),
        ranura: parametroRanura(resultado.ranuraAsignada, etiqueta),
      },
      tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
      respaldo: `Equipaste ${objeto.nombre} en ${etiqueta}.`,
    }),
  ];
  if (resultado.objetosDesequipados.length === 1) {
    const desplazado = resultado.objetosDesequipados[0];
    mensajes.push(crearMensajeTraducible("mensajes.inventario.desplazadoUno", {
      parametros: { objeto: parametroObjeto(desplazado) },
      respaldo: `${desplazado.nombre} volvió al inventario.`,
    }));
  } else if (resultado.objetosDesequipados.length > 1) {
    mensajes.push(crearMensajeTraducible("mensajes.inventario.desplazadosVarios", {
      parametros: { objetos: resultado.objetosDesequipados.map(parametroObjeto) },
      respaldo: `${resultado.objetosDesequipados.map((item) => item.nombre).join(", ")} volvieron al inventario.`,
    }));
  }
  const mensaje = mensajes;

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
      mensaje: mensajeInventario("inventarioLleno", "El inventario está lleno.", TIPOS_MENSAJE_JUEGO.NEGATIVO),
    };
  }

  const estados = player.equipamiento.obtenerEstadoRanuras();
  const estado = estados[nombreRanura];
  if (!estado) {
    return {
      exito: false,
      mensaje: mensajeInventario("ranuraInexistente", "La ranura seleccionada no existe.", TIPOS_MENSAJE_JUEGO.NEGATIVO),
    };
  }

  const objeto = estado.objeto ?? estado.reservadaPor;
  if (!objeto) {
    return {
      exito: false,
      mensaje: mensajeInventario("ranuraVacia", "Esa ranura está vacía.", TIPOS_MENSAJE_JUEGO.ALERTA),
    };
  }

  const estadoRecursosAnterior = capturarRecursosAntesCambioEquipo(player);
  const objetoDesequipado = player.equipamiento.desequipar(nombreRanura);
  if (!objetoDesequipado) {
    return {
      exito: false,
      mensaje: mensajeInventario("desequiparFallo", "No se pudo desequipar el objeto.", TIPOS_MENSAJE_JUEGO.NEGATIVO),
    };
  }

  const agregado = player.inventario.agregarObjeto(objetoDesequipado);
  if (!agregado) {
    return {
      exito: false,
      mensaje: mensajeInventario("devolverFallo", "No se pudo devolver el objeto al inventario.", TIPOS_MENSAJE_JUEGO.NEGATIVO),
    };
  }

  recalcularRecursosTrasCambioEquipo(player, estadoRecursosAnterior);

  return {
    exito: true,
    objetoDesequipado,
    mensaje: crearMensajeTraducible("mensajes.inventario.devuelto", {
      parametros: { objeto: parametroObjeto(objetoDesequipado) },
      tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
      respaldo: `${objetoDesequipado.nombre} volvió al inventario.`,
    }),
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
