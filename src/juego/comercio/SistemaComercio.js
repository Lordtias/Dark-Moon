import { crearObjeto } from "../../objetos/FabricaObjetos.js";

import {
  calcularPrecioCompra,
  calcularPrecioVenta,
} from "./CalculadorPreciosComercio.js";

import { crearResultadoAccion } from "../acciones/ResultadoAccion.js";

// Ejecuta una compra desde el stock del mercader
// hacia el inventario del jugador.
//
// La operación es atómica desde la perspectiva del juego:
//
// - Se calcula y valida el precio.
// - Se comprueba el oro disponible.
// - Se comprueba que toda la cantidad pueda entrar.
// - Se transfiere exactamente la cantidad solicitada.
// - Recién entonces se descuenta el oro.
export function comprarObjetoMercader({
  jugador,
  mercader,
  indiceStock,
  cantidad = 1,
  configuracionObjetos,
  configuracionRarezas,
  configuracionComercio,
} = {}) {
  validarContextoComercio({
    jugador,
    mercader,
    configuracionObjetos,
    configuracionRarezas,
    configuracionComercio,
  });

  const objeto = mercader.stock.obtenerObjetoEn(indiceStock);

  if (!objeto) {
    return crearResultadoAccion({
      exito: false,

      mensaje: "Ese espacio del mercader está vacío.",
    });
  }

  const precio = calcularPrecioCompra({
    objeto,
    jugador,

    idMercader: mercader.id,

    configuracionRarezas,
    configuracionComercio,
    cantidad,
  });

  if (!precio.puedePagar) {
    return crearResultadoAccion({
      exito: false,

      mensaje:
        `Necesitás ${crearTextoMonedas(precio.precioTotal)} para comprar ` +
        `${crearNombreCantidad(objeto, cantidad)}.`,
    });
  }

  const transferencia = transferirCantidadExacta({
    contenedorOrigen: mercader.stock,

    contenedorDestino: jugador.inventario,

    indiceOrigen: indiceStock,

    cantidad,
    configuracionObjetos,
  });

  if (!transferencia.exito) {
    return crearResultadoAccion({
      exito: false,
      mensaje: transferencia.mensaje,
    });
  }

  // La validación previa garantiza que este gasto
  // pueda realizarse.
  //
  // Se conserva la comprobación para detectar
  // cualquier inconsistencia inesperada.
  const resultadoPago = jugador.gastarOro(precio.precioTotal);

  if (!resultadoPago.exito) {
    throw new Error(
      "La compra transfirió el objeto, pero no pudo descontar el oro.",
    );
  }

  return crearResultadoAccion({
    exito: true,
    redibujar: true,

    mensaje:
      `Compraste ${crearNombreCantidad(objeto, cantidad)} ` +
      `por ${crearTextoMonedas(precio.precioTotal)}.`,

    tipoOperacion: "compra",

    idMercader: mercader.id,

    idObjeto: objeto.id,

    cantidad,

    precioTotal: precio.precioTotal,

    oroActual: jugador.oro,
  });
}

// Ejecuta una venta desde el inventario del jugador
// hacia el stock persistente del mercader.
//
// Los objetos no vendibles son rechazados por el
// calculador antes de modificar cantidades o contenedores.
export function venderObjetoMercader({
  jugador,
  mercader,
  indiceInventario,
  cantidad = 1,
  configuracionObjetos,
  configuracionRarezas,
  configuracionComercio,
} = {}) {
  validarContextoComercio({
    jugador,
    mercader,
    configuracionObjetos,
    configuracionRarezas,
    configuracionComercio,
  });

  const objeto = jugador.inventario.obtenerObjetoEn(indiceInventario);

  if (!objeto) {
    return crearResultadoAccion({
      exito: false,

      mensaje: "Ese espacio del inventario está vacío.",
    });
  }

  const precio = calcularPrecioVenta({
    objeto,
    jugador,

    idMercader: mercader.id,

    configuracionRarezas,
    configuracionComercio,
    cantidad,
  });

  if (!precio.permitido) {
    return crearResultadoAccion({
      exito: false,
      mensaje: precio.mensaje,
    });
  }

  const transferencia = transferirCantidadExacta({
    contenedorOrigen: jugador.inventario,

    contenedorDestino: mercader.stock,

    indiceOrigen: indiceInventario,

    cantidad,
    configuracionObjetos,
  });

  if (!transferencia.exito) {
    return crearResultadoAccion({
      exito: false,

      mensaje:
        transferencia.motivo === "sinEspacio"
          ? `${mercader.nombre} no tiene espacio para recibir ese objeto.`
          : transferencia.mensaje,
    });
  }

  jugador.agregarOro(precio.precioTotal);

  return crearResultadoAccion({
    exito: true,
    redibujar: true,

    mensaje:
      `Vendiste ${crearNombreCantidad(objeto, cantidad)} ` +
      `por ${crearTextoMonedas(precio.precioTotal)}.`,

    tipoOperacion: "venta",

    idMercader: mercader.id,

    idObjeto: objeto.id,

    cantidad,

    precioTotal: precio.precioTotal,

    oroActual: jugador.oro,
  });
}

// Transfiere exactamente la cantidad solicitada.
//
// A diferencia de la transferencia de botines, una
// operación comercial no debe completarse parcialmente:
//
// - Se transfiere toda la cantidad confirmada.
// - O no se modifica nada.
function transferirCantidadExacta({
  contenedorOrigen,
  contenedorDestino,
  indiceOrigen,
  cantidad,
  configuracionObjetos,
}) {
  validarContenedor(contenedorOrigen, "origen");

  validarContenedor(contenedorDestino, "destino");

  if (contenedorOrigen === contenedorDestino) {
    throw new Error(
      "El origen y el destino del comercio deben ser diferentes.",
    );
  }

  const objetoOrigen = contenedorOrigen.obtenerObjetoEn(indiceOrigen);

  if (!objetoOrigen) {
    return crearResultadoTransferenciaFallida(
      "origenVacio",
      "El objeto seleccionado ya no está disponible.",
    );
  }

  validarCantidadSolicitada(objetoOrigen, cantidad);

  if (!objetoOrigen.apilable) {
    return transferirObjetoNoApilable({
      contenedorOrigen,
      contenedorDestino,
      indiceOrigen,
      objetoOrigen,
    });
  }

  return transferirCantidadApilable({
    contenedorOrigen,
    contenedorDestino,
    indiceOrigen,
    objetoOrigen,
    cantidad,
    configuracionObjetos,
  });
}

function transferirObjetoNoApilable({
  contenedorOrigen,
  contenedorDestino,
  indiceOrigen,
  objetoOrigen,
}) {
  if (contenedorDestino.estaLleno()) {
    return crearResultadoTransferenciaFallida(
      "sinEspacio",
      "No hay una casilla disponible para recibir el objeto.",
    );
  }

  const objetoRetirado = contenedorOrigen.retirarObjeto(indiceOrigen);

  const agregado = contenedorDestino.agregarObjeto(objetoRetirado);

  if (!agregado) {
    contenedorOrigen.colocarObjetoEn(indiceOrigen, objetoRetirado);

    return crearResultadoTransferenciaFallida(
      "sinEspacio",
      "No se pudo completar la transferencia del objeto.",
    );
  }

  return {
    exito: true,
    motivo: "completa",
    cantidadTransferida: 1,
    objetoTransferido: objetoOrigen,
  };
}

function transferirCantidadApilable({
  contenedorOrigen,
  contenedorDestino,
  indiceOrigen,
  objetoOrigen,
  cantidad,
  configuracionObjetos,
}) {
  const pilasCompatibles = contenedorDestino
    .obtenerEspacios()
    .map((objeto, indice) => ({
      objeto,
      indice,
    }))
    .filter(
      ({ objeto }) =>
        objeto && sonPilasComercialmenteCompatibles(objetoOrigen, objeto),
    );

  const espacioEnPilas = pilasCompatibles.reduce(
    (total, { objeto }) =>
      total +
      Math.max(
        0,

        objeto.cantidadMaxima - objeto.cantidad,
      ),

    0,
  );

  const cantidadDespuesDePilas = Math.max(0, cantidad - espacioEnPilas);

  const necesitaNuevaPila = cantidadDespuesDePilas > 0;

  if (necesitaNuevaPila && contenedorDestino.estaLleno()) {
    return crearResultadoTransferenciaFallida(
      "sinEspacio",
      "No hay espacio suficiente para recibir toda la cantidad seleccionada.",
    );
  }

  // Creamos la nueva pila antes de modificar
  // las existentes.
  //
  // Así, un error de configuración no deja
  // una operación incompleta.
  const nuevaPila = necesitaNuevaPila
    ? crearCopiaPila({
        objetoOrigen,

        cantidad: cantidadDespuesDePilas,

        configuracionObjetos,
      })
    : null;

  const modificaciones = [];
  let restante = cantidad;

  for (const { objeto } of pilasCompatibles) {
    if (restante === 0) {
      break;
    }

    const cantidadAnterior = objeto.cantidad;

    const espacioDisponible = objeto.cantidadMaxima - objeto.cantidad;

    const cantidadAMover = Math.min(restante, espacioDisponible);

    objeto.cantidad += cantidadAMover;

    restante -= cantidadAMover;

    modificaciones.push({
      objeto,
      cantidadAnterior,
    });
  }

  if (nuevaPila) {
    const agregada = contenedorDestino.agregarObjeto(nuevaPila);

    if (!agregada) {
      restaurarCantidades(modificaciones);

      return crearResultadoTransferenciaFallida(
        "sinEspacio",
        "No se pudo crear la nueva pila en el contenedor de destino.",
      );
    }

    restante -= nuevaPila.cantidad;
  }

  if (restante !== 0) {
    // No debería ocurrir porque la capacidad
    // fue calculada antes de modificar nada.
    if (nuevaPila) {
      retirarInstanciaDeContenedor(contenedorDestino, nuevaPila);
    }

    restaurarCantidades(modificaciones);

    throw new Error(
      "La transferencia comercial no pudo distribuir la cantidad exacta.",
    );
  }

  objetoOrigen.cantidad -= cantidad;

  if (objetoOrigen.cantidad === 0) {
    contenedorOrigen.retirarObjeto(indiceOrigen);
  }

  return {
    exito: true,
    motivo: "completa",

    cantidadTransferida: cantidad,

    objetoTransferido: nuevaPila ?? objetoOrigen,
  };
}

// Recrea una pila conservando:
//
// - Rareza.
// - Nivel.
// - Afijos.
// - Propiedades finales.
//
// Los objetos contenedores no llegan aquí porque
// actualmente no son apilables.
function crearCopiaPila({ objetoOrigen, cantidad, configuracionObjetos }) {
  if (
    objetoOrigen.contenedorObjetos &&
    typeof objetoOrigen.contenedorObjetos.obtenerObjetos === "function"
  ) {
    throw new Error(
      "No se puede dividir comercialmente un objeto apilable con contenido interno.",
    );
  }

  return crearObjeto({
    configuracionObjetos,

    idObjeto: objetoOrigen.id,

    cantidad,

    rareza: objetoOrigen.rareza,

    nivelObjeto: objetoOrigen.nivelObjeto,

    prefijos: objetoOrigen.prefijos ?? [],

    sufijos: objetoOrigen.sufijos ?? [],

    propiedadesFinales: objetoOrigen.propiedades,
  });
}

// Dos pilas solamente pueden mezclarse cuando
// representan exactamente la misma versión
// comercial del objeto.
function sonPilasComercialmenteCompatibles(primera, segunda) {
  return (
    primera !== segunda &&
    primera.apilable === true &&
    segunda.apilable === true &&
    primera.id === segunda.id &&
    primera.cantidadMaxima === segunda.cantidadMaxima &&
    primera.rareza === segunda.rareza &&
    primera.nivelObjeto === segunda.nivelObjeto &&
    crearFirmaDatos(primera.propiedades) ===
      crearFirmaDatos(segunda.propiedades) &&
    crearFirmaDatos(primera.prefijos ?? []) ===
      crearFirmaDatos(segunda.prefijos ?? []) &&
    crearFirmaDatos(primera.sufijos ?? []) ===
      crearFirmaDatos(segunda.sufijos ?? [])
  );
}

function crearFirmaDatos(valor) {
  return JSON.stringify(ordenarDatos(valor));
}

function ordenarDatos(valor) {
  if (Array.isArray(valor)) {
    return valor.map(ordenarDatos);
  }

  if (valor && typeof valor === "object") {
    return Object.keys(valor)
      .sort()
      .reduce(
        (resultado, clave) => {
          resultado[clave] = ordenarDatos(valor[clave]);

          return resultado;
        },

        {},
      );
  }

  return valor;
}

function retirarInstanciaDeContenedor(contenedor, instancia) {
  const espacios = contenedor.obtenerEspacios();

  const indice = espacios.findIndex((objeto) => objeto === instancia);

  if (indice !== -1) {
    contenedor.retirarObjeto(indice);
  }
}

function restaurarCantidades(modificaciones) {
  for (const modificacion of modificaciones) {
    modificacion.objeto.cantidad = modificacion.cantidadAnterior;
  }
}

function crearResultadoTransferenciaFallida(motivo, mensaje) {
  return {
    exito: false,
    motivo,
    mensaje,
    cantidadTransferida: 0,
  };
}

function crearTextoMonedas(cantidad) {
  return cantidad === 1 ? "1 moneda" : `${cantidad} monedas`;
}

function crearNombreCantidad(objeto, cantidad) {
  return cantidad > 1 ? `${cantidad} × ${objeto.nombre}` : objeto.nombre;
}

function validarCantidadSolicitada(objeto, cantidad) {
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new Error("La cantidad comercial debe ser un entero mayor que 0.");
  }

  const disponible = objeto.apilable ? objeto.cantidad : 1;

  if (cantidad > disponible) {
    throw new Error(
      `No hay ${cantidad} unidades disponibles de ${objeto.nombre}.`,
    );
  }

  if (!objeto.apilable && cantidad !== 1) {
    throw new Error(
      `${objeto.nombre} solamente puede comerciarse de a una unidad.`,
    );
  }
}

function validarContextoComercio({
  jugador,
  mercader,
  configuracionObjetos,
  configuracionRarezas,
  configuracionComercio,
}) {
  if (
    !jugador?.inventario ||
    typeof jugador.gastarOro !== "function" ||
    typeof jugador.agregarOro !== "function"
  ) {
    throw new Error(
      "El comercio necesita un jugador con inventario y operaciones de oro.",
    );
  }

  if (!mercader || typeof mercader.id !== "string" || !mercader.stock) {
    throw new Error("El comercio necesita un mercader válido.");
  }

  validarObjetoPlano(configuracionObjetos, "configuración de objetos");

  validarObjetoPlano(configuracionRarezas, "configuración de rarezas");

  validarObjetoPlano(configuracionComercio, "configuración de comercio");
}

function validarContenedor(contenedor, descripcion) {
  if (
    !contenedor ||
    typeof contenedor.obtenerObjetoEn !== "function" ||
    typeof contenedor.obtenerEspacios !== "function" ||
    typeof contenedor.retirarObjeto !== "function" ||
    typeof contenedor.agregarObjeto !== "function" ||
    typeof contenedor.colocarObjetoEn !== "function" ||
    typeof contenedor.estaLleno !== "function"
  ) {
    throw new Error(`El contenedor de ${descripcion} no es válido.`);
  }
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Se necesita una ${descripcion} válida.`);
  }
}
