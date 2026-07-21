// Selecciona una rareza activa mediante los pesos configurados
// en Rarezas.json. El llamador entrega solamente las rarezas
// compatibles con la plantilla concreta.
export function seleccionarRarezaObjeto({
  configuracionRarezas,
  nivelObjeto,
  aleatorio,
  idsPermitidos = null,
  rarezaForzada = null,
} = {}) {
  validarCatalogo(configuracionRarezas, "rarezas");
  validarNivelObjeto(nivelObjeto);
  validarAleatorio(aleatorio);

  const permitidas = normalizarIdsPermitidos(idsPermitidos);

  if (rarezaForzada !== null) {
    return obtenerRarezaForzada({
      configuracionRarezas,
      nivelObjeto,
      idsPermitidos: permitidas,
      rarezaForzada,
    });
  }

  const elegibles = Object.entries(configuracionRarezas)
    .filter(([idRareza, rareza]) =>
      esRarezaElegible({
        idRareza,
        rareza,
        nivelObjeto,
        idsPermitidos: permitidas,
      }),
    )
    .map(([id, configuracion]) => ({
      id,
      configuracion,

      peso: configuracion.pesoBase,
    }));

  if (elegibles.length === 0) {
    throw new Error(
      "No existe una rareza activa y elegible para generar el objeto.",
    );
  }

  return seleccionarEntradaPonderada({
    entradas: elegibles,

    obtenerPeso: (entrada) => entrada.peso,

    aleatorio,

    descripcion: "una rareza de objeto",
  });
}

// Selección ponderada reutilizable para rarezas y grados.
//
// Por ejemplo, pesos 7000 y 3000 equivalen
// a una distribución de 70 % y 30 %.
export function seleccionarEntradaPonderada({
  entradas,
  obtenerPeso,
  aleatorio,
  descripcion = "una entrada",
} = {}) {
  if (!Array.isArray(entradas) || entradas.length === 0) {
    throw new Error(
      `No se puede seleccionar ${descripcion} desde una lista vacía.`,
    );
  }

  if (typeof obtenerPeso !== "function") {
    throw new Error(
      "La selección ponderada necesita una función para obtener el peso.",
    );
  }

  validarAleatorio(aleatorio);

  const entradasConPeso = entradas.map((entrada) => {
    const peso = obtenerPeso(entrada);

    if (!Number.isFinite(peso) || peso < 0) {
      throw new Error(`Existe un peso inválido al seleccionar ${descripcion}.`);
    }

    return {
      entrada,
      peso,
    };
  });

  const pesoTotal = entradasConPeso.reduce(
    (total, elemento) => total + elemento.peso,

    0,
  );

  if (pesoTotal <= 0) {
    throw new Error(
      `La selección de ${descripcion} necesita un peso mayor que 0.`,
    );
  }

  const tirada = aleatorio.siguiente() * pesoTotal;

  let acumulado = 0;

  for (const elemento of entradasConPeso) {
    acumulado += elemento.peso;

    if (tirada < acumulado) {
      return elemento.entrada;
    }
  }

  // Respaldo ante una diferencia mínima
  // producida por números de coma flotante.
  return entradasConPeso[entradasConPeso.length - 1].entrada;
}

function obtenerRarezaForzada({
  configuracionRarezas,
  nivelObjeto,
  idsPermitidos,
  rarezaForzada,
}) {
  if (typeof rarezaForzada !== "string" || rarezaForzada.trim() === "") {
    throw new Error("La rareza forzada debe ser un identificador válido.");
  }

  const id = rarezaForzada.trim().toLowerCase();

  const configuracion = configuracionRarezas[id];

  if (!configuracion) {
    throw new Error(`No existe la rareza forzada "${id}".`);
  }

  if (
    !esRarezaElegible({
      idRareza: id,

      rareza: configuracion,

      nivelObjeto,
      idsPermitidos,

      // Una rareza forzada puede utilizarse
      // aunque tenga peso 0, siempre que esté
      // activa y sea compatible.
      ignorarPeso: true,
    })
  ) {
    throw new Error(
      `La rareza "${id}" no puede utilizarse para un objeto ` +
        `de nivel ${nivelObjeto}.`,
    );
  }

  return {
    id,
    configuracion,

    peso: configuracion.pesoBase,
  };
}

function esRarezaElegible({
  idRareza,
  rareza,
  nivelObjeto,
  idsPermitidos,
  ignorarPeso = false,
}) {
  const estaPermitida = idsPermitidos === null || idsPermitidos.has(idRareza);

  return (
    rareza.estado === "activo" &&
    estaPermitida &&
    rareza.nivelObjetoMinimo <= nivelObjeto &&
    (ignorarPeso || rareza.pesoBase > 0)
  );
}

function normalizarIdsPermitidos(idsPermitidos) {
  if (idsPermitidos === null) {
    return null;
  }

  if (!Array.isArray(idsPermitidos) && !(idsPermitidos instanceof Set)) {
    throw new Error(
      "Las rarezas permitidas deben estar dentro de una lista o conjunto.",
    );
  }

  return new Set(
    [...idsPermitidos].map((id) => {
      if (typeof id !== "string" || id.trim() === "") {
        throw new Error(
          "Existe un identificador de rareza permitido inválido.",
        );
      }

      return id.trim().toLowerCase();
    }),
  );
}

function validarCatalogo(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Se necesita un catálogo de ${descripcion} válido.`);
  }
}

function validarNivelObjeto(nivelObjeto) {
  if (!Number.isInteger(nivelObjeto) || nivelObjeto < 1) {
    throw new Error(
      "El nivel del objeto debe ser un entero mayor o igual que 1.",
    );
  }
}

function validarAleatorio(aleatorio) {
  if (!aleatorio || typeof aleatorio.siguiente !== "function") {
    throw new Error("Se necesita un generador aleatorio válido.");
  }
}
