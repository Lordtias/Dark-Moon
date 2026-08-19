// Genera números pseudoaleatorios reproducibles.
//
// Dos partidas creadas con la misma semilla
// producirán la misma secuencia de resultados.
export function crearGeneradorAleatorio(semilla) {
  const semillaNormalizada = normalizarSemilla(semilla);

  let estado = semillaNormalizada;

  // Implementación Mulberry32.
  //
  // Es pequeña, rápida y suficiente para
  // generación procedural de mapas.
  function siguiente() {
    estado = (estado + 0x6d2b79f5) >>> 0;

    let valor = estado;

    valor = Math.imul(
      valor ^ (valor >>> 15),

      valor | 1,
    );

    valor ^=
      valor +
      Math.imul(
        valor ^ (valor >>> 7),

        valor | 61,
      );

    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296;
  }

  function entero(minimo, maximo) {
    if (
      !Number.isInteger(minimo) ||
      !Number.isInteger(maximo) ||
      maximo < minimo
    ) {
      throw new Error("El rango aleatorio debe utilizar enteros válidos.");
    }

    return minimo + Math.floor(siguiente() * (maximo - minimo + 1));
  }

  function elegir(lista) {
    if (!Array.isArray(lista) || lista.length === 0) {
      throw new Error("No se puede elegir un elemento de una lista vacía.");
    }

    return lista[entero(0, lista.length - 1)];
  }

  function mezclar(lista) {
    if (!Array.isArray(lista)) {
      throw new Error("Solo se pueden mezclar listas.");
    }

    const copia = [...lista];

    for (let indice = copia.length - 1; indice > 0; indice--) {
      const indiceIntercambio = entero(0, indice);

      [copia[indice], copia[indiceIntercambio]] = [
        copia[indiceIntercambio],
        copia[indice],
      ];
    }

    return copia;
  }

  return {
    semilla: semillaNormalizada,

    siguiente,
    entero,
    elegir,
    mezclar,
  };
}

// Crea una semilla distinta para una partida nueva.
export function crearSemillaAleatoria() {
  if (globalThis.crypto?.getRandomValues) {
    const valores = new Uint32Array(1);

    globalThis.crypto.getRandomValues(valores);

    return valores[0] || 1;
  }

  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0 || 1;
}

function normalizarSemilla(semilla) {
  if (Number.isInteger(semilla)) {
    return semilla >>> 0 || 1;
  }

  if (typeof semilla === "string" && semilla.trim() !== "") {
    let resultado = 2166136261;

    for (const caracter of semilla.trim()) {
      resultado ^= caracter.charCodeAt(0);

      resultado = Math.imul(resultado, 16777619);
    }

    return resultado >>> 0 || 1;
  }

  throw new Error("La semilla debe ser un número entero o un texto.");
}

// Selección ponderada canónica para sistemas que ya consumen un generador
// reproducible. Mantiene un único consumo de RNG y conserva el orden recibido.
export function seleccionarPonderado({
  elementos,
  aleatorio,
  obtenerPeso = (elemento) => elemento?.peso,
  descripcion = "una entrada",
} = {}) {
  if (!Array.isArray(elementos) || elementos.length === 0) {
    throw new Error(
      `No se puede seleccionar ${descripcion} desde una lista vacía.`,
    );
  }
  if (!aleatorio || typeof aleatorio.siguiente !== "function") {
    throw new Error(
      `Se necesita un generador aleatorio válido para seleccionar ${descripcion}.`,
    );
  }
  if (typeof obtenerPeso !== "function") {
    throw new Error("La selección ponderada necesita una función de peso válida.");
  }

  const ponderados = elementos.map((elemento) => {
    const peso = obtenerPeso(elemento);
    if (!Number.isFinite(peso) || peso <= 0) {
      throw new Error(
        `La selección de ${descripcion} contiene un peso que no es mayor que 0.`,
      );
    }
    return { elemento, peso };
  });

  const pesoTotal = ponderados.reduce(
    (total, entrada) => total + entrada.peso,
    0,
  );
  if (!Number.isFinite(pesoTotal) || pesoTotal <= 0) {
    throw new Error(
      `La selección de ${descripcion} necesita un peso total mayor que 0.`,
    );
  }

  const objetivo = aleatorio.siguiente() * pesoTotal;
  let acumulado = 0;

  for (const entrada of ponderados) {
    acumulado += entrada.peso;
    if (objetivo < acumulado) {
      return entrada.elemento;
    }
  }

  return ponderados[ponderados.length - 1].elemento;
}
