const ID_VARIANTE_NORMAL = "normal";

// Resuelve si una expedición recibe un encuentro especial.
//
// La función solamente decide:
//
// - Si el encuentro aparece.
// - Qué plantilla especial fue seleccionada.
// - Qué variante recibirá.
// - Qué botín adicional aporta esa aparición.
//
// GeneradorContenidoMapa continúa siendo responsable
// de encontrar una posición válida y crear la instancia.
//
// Como se devuelve una única selección, una expedición
// nunca puede recibir más de un encuentro especial.
export function resolverEncuentroEspecial({
  configuracion = null,
  aleatorio,
} = {}) {
  validarAleatorio(aleatorio);

  if (configuracion === null || configuracion === undefined) {
    return crearResultadoSinConfiguracion();
  }

  validarConfiguracionEncuentro(configuracion);

  const probabilidadAparicion = configuracion.probabilidadAparicion;

  const tirada = aleatorio.siguiente() * 100;

  const aparece = tirada < probabilidadAparicion;

  if (!aparece) {
    return {
      configurado: true,
      probabilidadAparicion,
      tirada,
      aparece: false,
      idEnemigo: null,
      idVariante: null,
      variante: null,
      tablaBotinAdicional: [],
    };
  }

  const candidato = seleccionarPonderado({
    elementos: configuracion.permitidos,
    aleatorio,
    descripcion: "los enemigos del encuentro especial",
  });

  const idVariante = seleccionarVariante({
    probabilidades: configuracion.probabilidadesVariantes,
    aleatorio,
  });

  return {
    configurado: true,
    probabilidadAparicion,
    tirada,
    aparece: true,
    idEnemigo: candidato.id,
    idVariante,
    variante: idVariante ?? ID_VARIANTE_NORMAL,
    tablaBotinAdicional: clonarLista(candidato.tablaBotinAdicional ?? []),
  };
}

function crearResultadoSinConfiguracion() {
  return {
    configurado: false,
    probabilidadAparicion: 0,
    tirada: null,
    aparece: false,
    idEnemigo: null,
    idVariante: null,
    variante: null,
    tablaBotinAdicional: [],
  };
}

function seleccionarVariante({ probabilidades, aleatorio }) {
  const opciones = Object.entries(probabilidades)
    .filter(([, probabilidad]) => probabilidad > 0)
    .map(([id, probabilidad]) => ({
      id,
      peso: probabilidad,
    }));

  const seleccion = seleccionarPonderado({
    elementos: opciones,
    aleatorio,
    descripcion: "las variantes del encuentro especial",
  });

  return seleccion.id === ID_VARIANTE_NORMAL ? null : seleccion.id;
}

function seleccionarPonderado({ elementos, aleatorio, descripcion }) {
  if (!Array.isArray(elementos) || elementos.length === 0) {
    throw new Error(
      `No se puede realizar una selección vacía sobre ${descripcion}.`,
    );
  }

  const pesoTotal = elementos.reduce((total, elemento) => {
    if (!Number.isFinite(elemento.peso) || elemento.peso <= 0) {
      throw new Error(
        `El peso de "${elemento.id}" dentro de ${descripcion} ` +
          "debe ser mayor que 0.",
      );
    }

    return total + elemento.peso;
  }, 0);

  let valor = aleatorio.siguiente() * pesoTotal;

  for (const elemento of elementos) {
    valor -= elemento.peso;

    if (valor < 0) {
      return elemento;
    }
  }

  return elementos[elementos.length - 1];
}

function validarConfiguracionEncuentro(configuracion) {
  if (
    configuracion === null ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion)
  ) {
    throw new Error(
      "La configuración del encuentro especial debe ser un objeto válido.",
    );
  }

  if (
    !Number.isFinite(configuracion.probabilidadAparicion) ||
    configuracion.probabilidadAparicion < 0 ||
    configuracion.probabilidadAparicion > 100
  ) {
    throw new Error(
      "La probabilidad del encuentro especial debe estar entre 0 y 100.",
    );
  }

  if (
    !Array.isArray(configuracion.permitidos) ||
    configuracion.permitidos.length === 0
  ) {
    throw new Error(
      "El encuentro especial necesita al menos un enemigo permitido.",
    );
  }

  if (
    configuracion.probabilidadesVariantes === null ||
    typeof configuracion.probabilidadesVariantes !== "object" ||
    Array.isArray(configuracion.probabilidadesVariantes)
  ) {
    throw new Error(
      "El encuentro especial necesita probabilidades de variantes válidas.",
    );
  }
}

function validarAleatorio(aleatorio) {
  if (!aleatorio || typeof aleatorio.siguiente !== "function") {
    throw new Error(
      "Se necesita un generador aleatorio válido para resolver el encuentro especial.",
    );
  }
}

function clonarLista(lista) {
  return lista.map((entrada) => ({
    ...entrada,
  }));
}
