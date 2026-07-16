/**
 * Crea un objeto con todos los atributos en su valor inicial.
 *
 * La lista de atributos y el valor inicial se obtienen
 * desde configuracionPersonaje.json.
 *
 * @param {Object} configuracion Configuración completa del personaje.
 * @returns {Object} Atributos inicializados.
 */
export function crearAtributosIniciales(configuracion) {
  // Extraemos del JSON la configuración general de atributos.
  const configuracionAtributos = configuracion.atributos;

  // Este objeto contendrá valores como:
  // {
  //   fuerza: 8,
  //   destreza: 8,
  //   ...
  // }
  const atributosIniciales = {};

  // Recorremos la lista de atributos definida en el JSON.
  configuracionAtributos.lista.forEach((atributo) => {
    // Utilizamos el id como nombre de la propiedad.
    atributosIniciales[atributo.id] =
      configuracionAtributos.valorInicial;
  });

  return atributosIniciales;
}

/**
 * Selecciona aleatoriamente un atributo teniendo en cuenta
 * el peso configurado para cada uno.
 *
 * Un atributo con peso 5 tiene más posibilidades de ser
 * seleccionado que uno con peso 1.
 *
 * @param {Array<Object>} candidatos Atributos que pueden recibir puntos.
 * @returns {string} Id del atributo seleccionado.
 */
function seleccionarAtributoPorPeso(candidatos) {
  // Sumamos todos los pesos disponibles.
  const pesoTotal = candidatos.reduce(
    (total, candidato) => total + candidato.peso,
    0
  );

  // Generamos un número aleatorio entre 0 y el peso total.
  let valorAleatorio = Math.random() * pesoTotal;

  // Recorremos los candidatos y descontamos sus pesos.
  // El candidato donde el valor llegue a cero será elegido.
  for (const candidato of candidatos) {
    valorAleatorio -= candidato.peso;

    if (valorAleatorio < 0) {
      return candidato.id;
    }
  }

  // Este retorno funciona como protección ante posibles
  // errores de precisión con números decimales.
  return candidatos[candidatos.length - 1].id;
}

/**
 * Distribuye aleatoriamente los puntos de atributos
 * según los pesos correspondientes a una profesión.
 *
 * @param {Object} configuracion Configuración completa del personaje.
 * @param {string} idProfesion Id de la profesión seleccionada.
 * @returns {Object} Atributos con todos los puntos distribuidos.
 */
export function generarAtributosAleatorios(
  configuracion,
  idProfesion
) {
  // Obtenemos la configuración general de atributos.
  const configuracionAtributos = configuracion.atributos;

  // Buscamos la profesión usando su id:
  // "guerrero", "rogue" o "mago".
  const profesion = configuracion.profesiones[idProfesion];

  // Si el id recibido no existe en el JSON,
  // detenemos el proceso con un error claro.
  if (!profesion) {
    throw new Error(
      `No existe la profesión "${idProfesion}" en la configuración.`
    );
  }

  // Todos los atributos comienzan en el valor inicial
  // configurado, que actualmente es 8.
  const atributosGenerados =
    crearAtributosIniciales(configuracion);

  // Guardamos la cantidad de puntos que debemos repartir.
  let puntosRestantes =
    configuracionAtributos.puntosDisponibles;

  // Continuamos hasta distribuir todos los puntos.
  while (puntosRestantes > 0) {
    // Creamos la lista de atributos que todavía pueden
    // recibir puntos sin superar el máximo.
    const candidatos = configuracionAtributos.lista
      .map((atributo) => {
        return {
          id: atributo.id,

          // Obtenemos el peso de este atributo para
          // la profesión seleccionada.
          peso:
            profesion.pesosAtributos[atributo.id] ?? 0
        };
      })
      .filter((candidato) => {
        // Un candidato es válido cuando:
        // 1. Tiene un peso mayor que cero.
        // 2. Todavía no alcanzó el valor máximo.
        return (
          candidato.peso > 0 &&
          atributosGenerados[candidato.id] <
            configuracionAtributos.valorMaximo
        );
      });

    // Esta validación evita un bucle infinito si el JSON
    // tuviera una configuración imposible.
    if (candidatos.length === 0) {
      throw new Error(
        "No hay atributos disponibles para distribuir " +
        `${puntosRestantes} puntos restantes.`
      );
    }

    // Elegimos un atributo teniendo en cuenta los pesos.
    const atributoSeleccionado =
      seleccionarAtributoPorPeso(candidatos);

    // Sumamos un punto al atributo seleccionado.
    atributosGenerados[atributoSeleccionado] += 1;

    // Descontamos el punto que acabamos de asignar.
    puntosRestantes -= 1;
  }

  return atributosGenerados;
}