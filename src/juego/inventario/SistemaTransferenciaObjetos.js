import { ContenedorObjetos } from "../../objetos/ContenedorObjetos.js";

// Motivos internos utilizados para explicar
// cómo terminó una transferencia.
//
// Estos valores no son mensajes de interfaz.
// Permiten que Juego o un controlador construyan
// textos apropiados para cada contexto.
export const RESULTADOS_TRANSFERENCIA = Object.freeze({
  COMPLETA: "completa",

  PARCIAL: "parcial",

  ORIGEN_VACIO: "origenVacio",

  SIN_ESPACIO: "sinEspacio",
});

// Transfiere el objeto almacenado en una posición
// concreta hacia otro ContenedorObjetos.
//
// Para objetos apilables:
//
// 1. Completa pilas iguales del destino.
// 2. Mueve el remanente a una posición libre.
// 3. Si no entra todo, conserva la cantidad restante
//    dentro del contenedor de origen.
//
// Para objetos no apilables:
//
// - Mueve la instancia completa cuando existe espacio.
// - No modifica ningún contenedor si el destino está lleno.
export function transferirObjetoEntreContenedores({
  contenedorOrigen,
  contenedorDestino,
  indiceOrigen,
} = {}) {
  validarContenedor(contenedorOrigen, "origen");

  validarContenedor(contenedorDestino, "destino");

  if (contenedorOrigen === contenedorDestino) {
    throw new Error(
      "El contenedor de origen y el de destino deben ser diferentes.",
    );
  }

  const objeto = contenedorOrigen.obtenerObjetoEn(indiceOrigen);

  if (!objeto) {
    return crearResultadoTransferencia({
      exito: false,

      motivo: RESULTADOS_TRANSFERENCIA.ORIGEN_VACIO,

      objeto: null,

      cantidadInicial: 0,

      cantidadTransferida: 0,

      cantidadRestante: 0,

      contenedorOrigen,
    });
  }

  const cantidadInicial = obtenerCantidadObjeto(objeto);

  let cantidadTransferida = 0;

  // Los objetos apilables intentan primero
  // completar pilas iguales que ya existen
  // dentro del contenedor de destino.
  if (objeto.apilable) {
    cantidadTransferida += completarPilasCompatibles({
      objetoOrigen: objeto,

      contenedorDestino,
    });

    // Si toda la cantidad quedó distribuida
    // entre pilas existentes, retiramos la pila
    // vacía del contenedor original.
    if (objeto.cantidad === 0) {
      contenedorOrigen.retirarObjeto(indiceOrigen);

      return crearResultadoTransferencia({
        exito: true,

        motivo: RESULTADOS_TRANSFERENCIA.COMPLETA,

        objeto,

        cantidadInicial,

        cantidadTransferida,

        cantidadRestante: 0,

        contenedorOrigen,
      });
    }
  }

  // Si todavía queda objeto por mover,
  // necesitamos una posición libre.
  if (contenedorDestino.estaLleno()) {
    return crearResultadoTransferencia({
      exito: cantidadTransferida > 0,

      motivo:
        cantidadTransferida > 0
          ? RESULTADOS_TRANSFERENCIA.PARCIAL
          : RESULTADOS_TRANSFERENCIA.SIN_ESPACIO,

      objeto,

      cantidadInicial,

      cantidadTransferida,

      cantidadRestante: obtenerCantidadObjeto(objeto),

      contenedorOrigen,
    });
  }

  // Retiramos la misma instancia del origen
  // y la insertamos en el destino.
  //
  // Si el objeto era apilable, esta instancia
  // contiene únicamente el remanente que no entró
  // en las pilas existentes.
  const objetoRetirado = contenedorOrigen.retirarObjeto(indiceOrigen);

  const cantidadRemanente = obtenerCantidadObjeto(objetoRetirado);

  const agregado = contenedorDestino.agregarObjeto(objetoRetirado);

  // La inserción no debería fallar porque
  // acabamos de comprobar que existe espacio.
  //
  // De todas maneras restauramos el objeto
  // para evitar pérdidas ante una inconsistencia.
  if (!agregado) {
    contenedorOrigen.colocarObjetoEn(indiceOrigen, objetoRetirado);

    return crearResultadoTransferencia({
      exito: cantidadTransferida > 0,

      motivo:
        cantidadTransferida > 0
          ? RESULTADOS_TRANSFERENCIA.PARCIAL
          : RESULTADOS_TRANSFERENCIA.SIN_ESPACIO,

      objeto: objetoRetirado,

      cantidadInicial,

      cantidadTransferida,

      cantidadRestante: cantidadRemanente,

      contenedorOrigen,
    });
  }

  cantidadTransferida += cantidadRemanente;

  return crearResultadoTransferencia({
    exito: true,

    motivo: RESULTADOS_TRANSFERENCIA.COMPLETA,

    objeto: objetoRetirado,

    cantidadInicial,

    cantidadTransferida,

    cantidadRestante: 0,

    contenedorOrigen,
  });
}

// Intenta transferir todos los objetos
// almacenados en el contenedor de origen.
//
// Cada posición se procesa de manera independiente.
//
// Esto permite que:
//
// - Algunos objetos se transfieran completamente.
// - Otros se transfieran parcialmente.
// - Otros permanezcan en el origen por falta de espacio.
//
// La función no consume tiempo.
// Juego decidirá posteriormente si esta operación
// debe registrar una única acción temporal.
export function transferirTodosLosObjetos({
  contenedorOrigen,
  contenedorDestino,
} = {}) {
  validarContenedor(contenedorOrigen, "origen");

  validarContenedor(contenedorDestino, "destino");

  if (contenedorOrigen === contenedorDestino) {
    throw new Error(
      "El contenedor de origen y el de destino deben ser diferentes.",
    );
  }

  const resultados = [];

  let cantidadPosicionesAfectadas = 0;

  let cantidadUnidadesTransferidas = 0;

  // Los contenedores no desplazan sus posiciones
  // al retirar un objeto.
  //
  // Por eso podemos recorrer los índices originales
  // sin que cambien las posiciones siguientes.
  for (let indice = 0; indice < contenedorOrigen.capacidad; indice++) {
    const objeto = contenedorOrigen.obtenerObjetoEn(indice);

    if (!objeto) {
      continue;
    }

    const resultado = transferirObjetoEntreContenedores({
      contenedorOrigen,
      contenedorDestino,
      indiceOrigen: indice,
    });

    resultados.push(resultado);

    if (resultado.cantidadTransferida > 0) {
      cantidadPosicionesAfectadas++;

      cantidadUnidadesTransferidas += resultado.cantidadTransferida;
    }
  }

  return {
    exito: cantidadUnidadesTransferidas > 0,

    resultados,

    cantidadPosicionesAfectadas,

    cantidadUnidadesTransferidas,

    origenVacio: contenedorOrigen.estaVacio(),
  };
}

// Distribuye la pila de origen entre
// todas las pilas compatibles del destino.
//
// La función modifica las cantidades
// de ambas instancias y devuelve cuántas
// unidades fueron transferidas.
function completarPilasCompatibles({ objetoOrigen, contenedorDestino }) {
  let cantidadTransferida = 0;

  const objetosDestino = contenedorDestino.obtenerObjetos();

  for (const objetoDestino of objetosDestino) {
    if (!sonPilasCompatibles(objetoOrigen, objetoDestino)) {
      continue;
    }

    const espacioDisponible =
      objetoDestino.cantidadMaxima - objetoDestino.cantidad;

    if (espacioDisponible <= 0) {
      continue;
    }

    const cantidadAMover = Math.min(espacioDisponible, objetoOrigen.cantidad);

    objetoDestino.cantidad += cantidadAMover;

    objetoOrigen.cantidad -= cantidadAMover;

    cantidadTransferida += cantidadAMover;

    if (objetoOrigen.cantidad === 0) {
      break;
    }
  }

  return cantidadTransferida;
}

// Dos pilas son compatibles únicamente cuando:
//
// - Ambas son apilables.
// - Representan el mismo ID de objeto.
// - Comparten el mismo máximo por pila.
//
// La última condición ayuda a detectar
// instancias inconsistentes creadas desde
// configuraciones diferentes.
function sonPilasCompatibles(objetoOrigen, objetoDestino) {
  return (
    objetoOrigen !== objetoDestino &&
    objetoOrigen.apilable === true &&
    objetoDestino.apilable === true &&
    objetoOrigen.id === objetoDestino.id &&
    objetoOrigen.cantidadMaxima === objetoDestino.cantidadMaxima
  );
}

// Los objetos no apilables representan
// siempre una sola unidad.
function obtenerCantidadObjeto(objeto) {
  if (!objeto) {
    return 0;
  }

  return objeto.apilable ? objeto.cantidad : 1;
}

// Crea una respuesta uniforme para
// transferencias completas, parciales o fallidas.
function crearResultadoTransferencia({
  exito,
  motivo,
  objeto,
  cantidadInicial,
  cantidadTransferida,
  cantidadRestante,
  contenedorOrigen,
}) {
  return {
    exito,
    motivo,

    objeto,

    idObjeto: objeto?.id ?? null,

    nombreObjeto: objeto?.nombre ?? null,

    cantidadInicial,

    cantidadTransferida,

    cantidadRestante,

    completa: cantidadRestante === 0 && cantidadTransferida > 0,

    origenVacio: contenedorOrigen.estaVacio(),
  };
}

function validarContenedor(contenedor, nombre) {
  if (!(contenedor instanceof ContenedorObjetos)) {
    throw new Error(`El contenedor de ${nombre} no es válido.`);
  }
}
