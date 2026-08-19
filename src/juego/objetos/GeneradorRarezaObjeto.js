import { seleccionarPonderado } from "../generacion/GeneradorAleatorio.js";

// Selecciona una rareza habilitada mediante los pesos configurados
// en Rarezas.json. El llamador entrega solamente las rarezas
// compatibles con la plantilla concreta.
export function seleccionarRarezaObjeto({
  configuracionRarezas,
  nivelObjeto,
  aleatorio,
  idsPermitidos = null,
  rarezaForzada = null,
  hallazgoMagico = 0,
} = {}) {
  validarCatalogo(configuracionRarezas, "rarezas");
  validarNivelObjeto(nivelObjeto);
  validarAleatorio(aleatorio);
  validarHallazgoMagico(hallazgoMagico);

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

      peso: calcularPesoRareza({
        idRareza: id,
        pesoBase: configuracion.pesoBase,
        hallazgoMagico,
      }),
    }));

  if (elegibles.length === 0) {
    throw new Error(
      "No existe una rareza habilitada y elegible para generar el objeto.",
    );
  }

  return seleccionarPonderado({
    elementos: elegibles,
    obtenerPeso: (entrada) => entrada.peso,
    aleatorio,
    descripcion: "una rareza de objeto",
  });
}

function calcularPesoRareza({ idRareza, pesoBase, hallazgoMagico }) {
  if (idRareza === "comun") return pesoBase;
  return pesoBase * (1 + hallazgoMagico / 100);
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
      // habilitada y sea compatible.
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
    rareza.generacionHabilitada === true &&
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

function validarHallazgoMagico(hallazgoMagico) {
  if (!Number.isFinite(hallazgoMagico) || hallazgoMagico < 0) {
    throw new Error("Hallazgo mágico debe ser un número igual o mayor que 0.");
  }
}
