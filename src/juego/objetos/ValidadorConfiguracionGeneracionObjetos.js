// Estados admitidos por rarezas y afijos.
//
// Solamente "activo" permite que una entrada
// participe de la generación aleatoria actual.
const ESTADOS_CONFIGURACION = new Set([
  "activo",
  "pendiente_motor",
  "pendiente_diseno",
  "pendiente_balance",
  "reservado_raro",
  "reservado_unico",
  "descartado",
]);

const TIPOS_AFIJO = new Set(["prefijo", "sufijo"]);

const TIPOS_OBJETO_COMPATIBLES = new Set(["arma", "armadura", "quiver"]);

// En esta primera etapa todos los efectos activos
// se componen sumando un valor numérico.
//
// Las operaciones futuras pueden existir dentro
// de entradas inactivas sin romper la carga.
const OPERACIONES_ACTIVAS = new Set(["sumar"]);

// Propiedades que el motor actual ya sabe utilizar
// desde las propiedades finales de un objeto.
const PROPIEDADES_ACTIVAS = new Set([
  "danioFisicoLocalMinimo",
  "danioFisicoLocalMaximo",
  "danioFisicoLocalPorcentaje",
  "armadura",
  "vidaMaxima",
  "manaMaximo",
  "precision",
  "probabilidadCritico",
  "multiplicadorCritico",
  "evasion",
  "regeneracionVida",
  "regeneracionMana",
  "resistenciaFuego",
  "resistenciaFrio",
  "resistenciaRayo",
  "resistenciaVeneno",
  "probabilidadBloqueo",
  "mitigacionBloqueo",
]);

// Valida conjuntamente reglas generales, rarezas,
// prefijos y sufijos.
//
// El catálogo completo se conserva en memoria,
// pero la generación utiliza solamente entradas
// cuyo estado sea "activo" y cuyo peso sea mayor que cero.
export function validarConfiguracionGeneracionObjetos({
  reglas,
  rarezas,
  prefijos,
  sufijos,
} = {}) {
  validarReglasGeneracion(reglas);

  validarCatalogoRarezas(rarezas);

  const idsRarezas = new Set(Object.keys(rarezas));

  const idsRarezasActivas = new Set(
    Object.entries(rarezas)
      .filter(([, rareza]) => rareza.estado === "activo")
      .map(([idRareza]) => idRareza),
  );

  const idsAfijos = new Set();

  validarCatalogoAfijos({
    catalogo: prefijos,

    tipoEsperado: "prefijo",

    descripcionCatalogo: "el catálogo de prefijos",

    idsRarezas,
    idsRarezasActivas,
    idsAfijos,
  });

  validarCatalogoAfijos({
    catalogo: sufijos,

    tipoEsperado: "sufijo",

    descripcionCatalogo: "el catálogo de sufijos",

    idsRarezas,
    idsRarezasActivas,
    idsAfijos,
  });

  return {
    reglas,
    rarezas,
    prefijos,
    sufijos,
  };
}

function validarReglasGeneracion(reglas) {
  validarObjetoRaiz(reglas, "las reglas de generación de objetos");

  const configuracionNivel = reglas.nivelObjeto;

  validarObjetoConfiguracion({
    valor: configuracionNivel,

    descripcion: "La configuración del nivel de objeto",
  });

  validarTexto(
    configuracionNivel.descripcion,
    "descripción de la generación del nivel de objeto",
  );

  if (
    !Number.isInteger(configuracionNivel.nivelMinimo) ||
    configuracionNivel.nivelMinimo < 1
  ) {
    throw new Error(
      "El nivel mínimo de los objetos debe ser un entero mayor o igual que uno.",
    );
  }

  if (
    !Array.isArray(configuracionNivel.distribucion) ||
    configuracionNivel.distribucion.length === 0
  ) {
    throw new Error(
      "La generación del nivel de objeto necesita una distribución.",
    );
  }

  const desplazamientos = new Set();

  for (const entrada of configuracionNivel.distribucion) {
    validarObjetoConfiguracion({
      valor: entrada,

      descripcion: "Una entrada de la distribución del nivel de objeto",
    });

    if (!Number.isInteger(entrada.desplazamiento)) {
      throw new Error("Cada desplazamiento de nivel debe ser un entero.");
    }

    if (desplazamientos.has(entrada.desplazamiento)) {
      throw new Error(
        `La distribución del nivel repite el desplazamiento ` +
          `${entrada.desplazamiento}.`,
      );
    }

    desplazamientos.add(entrada.desplazamiento);

    validarEnteroPositivo(
      entrada.peso,
      `peso del desplazamiento ${entrada.desplazamiento}`,
    );
  }

  validarListaTextos({
    lista: configuracionNivel.notasDiseno ?? [],

    descripcion: "notas de diseño de la generación del nivel de objeto",

    permitirVacia: true,
  });
}

function validarDistribucionCantidadAfijos({ idRareza, rareza }) {
  const distribucion = rareza.distribucionCantidadAfijos;

  if (!Array.isArray(distribucion) || distribucion.length === 0) {
    throw new Error(
      `La rareza "${idRareza}" necesita una distribución ` +
        "de cantidad de afijos.",
    );
  }

  const cantidades = new Set();

  for (const entrada of distribucion) {
    validarObjetoConfiguracion({
      valor: entrada,

      descripcion: `Una cantidad de afijos de la rareza "${idRareza}"`,
    });

    if (
      !Number.isInteger(entrada.cantidad) ||
      entrada.cantidad < rareza.afijosMinimos ||
      entrada.cantidad > rareza.afijosMaximos
    ) {
      throw new Error(
        `La rareza "${idRareza}" contiene la cantidad de afijos ` +
          `inválida ${entrada.cantidad}.`,
      );
    }

    if (cantidades.has(entrada.cantidad)) {
      throw new Error(
        `La rareza "${idRareza}" repite la cantidad ` +
          `${entrada.cantidad} en su distribución.`,
      );
    }

    cantidades.add(entrada.cantidad);

    validarEnteroPositivo(
      entrada.peso,
      `peso de ${entrada.cantidad} afijos en la rareza "${idRareza}"`,
    );
  }

  if (
    rareza.generaAfijosAleatorios !== true &&
    (distribucion.length !== 1 || distribucion[0].cantidad !== 0)
  ) {
    throw new Error(
      `La rareza "${idRareza}" no genera afijos aleatorios ` +
        "y solamente puede configurar la cantidad cero.",
    );
  }
}

function validarCatalogoRarezas(rarezas) {
  validarObjetoRaiz(rarezas, "el catálogo de rarezas");

  for (const [idRareza, rareza] of Object.entries(rarezas)) {
    validarIdConfiguracion({
      id: idRareza,

      descripcion: "rareza",
    });

    validarObjetoConfiguracion({
      valor: rareza,

      descripcion: `La rareza "${idRareza}"`,
    });

    validarTexto(rareza.nombre, `nombre de la rareza "${idRareza}"`);

    validarEstado({
      estado: rareza.estado,

      descripcion: `la rareza "${idRareza}"`,
    });

    validarTexto(
      rareza.motivoEstado,
      `motivo de estado de la rareza "${idRareza}"`,
    );

    if (
      typeof rareza.colorInterfaz !== "string" ||
      !/^#[0-9a-fA-F]{6}$/.test(rareza.colorInterfaz)
    ) {
      throw new Error(
        `La rareza "${idRareza}" necesita ` +
          "un color hexadecimal de seis dígitos.",
      );
    }

    validarEnteroNoNegativo(
      rareza.pesoBase,
      `peso base de la rareza "${idRareza}"`,
    );

    if (typeof rareza.generaAfijosAleatorios !== "boolean") {
      throw new Error(
        `La rareza "${idRareza}" debe indicar ` +
          "si genera afijos aleatorios.",
      );
    }

    validarEnteroNoNegativo(
      rareza.afijosMinimos,
      `mínimo de afijos de "${idRareza}"`,
    );

    validarEnteroNoNegativo(
      rareza.afijosMaximos,
      `máximo de afijos de "${idRareza}"`,
    );

    validarEnteroNoNegativo(
      rareza.prefijosMaximos,
      `máximo de prefijos de "${idRareza}"`,
    );

    validarEnteroNoNegativo(
      rareza.sufijosMaximos,
      `máximo de sufijos de "${idRareza}"`,
    );

    if (rareza.afijosMaximos < rareza.afijosMinimos) {
      throw new Error(
        `La rareza "${idRareza}" tiene ` +
          "un máximo de afijos menor que su mínimo.",
      );
    }

    if (rareza.prefijosMaximos + rareza.sufijosMaximos < rareza.afijosMaximos) {
      throw new Error(
        `La rareza "${idRareza}" no tiene ` +
          "suficientes espacios de prefijo y sufijo.",
      );
    }

    if (
      !Number.isInteger(rareza.nivelObjetoMinimo) ||
      rareza.nivelObjetoMinimo < 1
    ) {
      throw new Error(
        `El nivel mínimo de la rareza "${idRareza}" ` +
          "debe ser un entero mayor o igual que uno.",
      );
    }

    validarDistribucionCantidadAfijos({
      idRareza,
      rareza,
    });
  }

  const pesoTotalRarezasActivas = Object.values(rarezas)
    .filter((rareza) => rareza.estado === "activo")
    .reduce(
      (total, rareza) => total + rareza.pesoBase,

      0,
    );

  if (pesoTotalRarezasActivas <= 0) {
    throw new Error(
      "Las rarezas activas necesitan un peso total mayor que cero.",
    );
  }

  if (rarezas.comun?.estado !== "activo") {
    throw new Error("La rareza común debe existir y estar activa.");
  }

  if (rarezas.magico?.estado !== "activo") {
    throw new Error("La rareza mágica debe existir y estar activa.");
  }
}

function validarCatalogoAfijos({
  catalogo,
  tipoEsperado,
  descripcionCatalogo,
  idsRarezas,
  idsRarezasActivas,
  idsAfijos,
}) {
  validarObjetoRaiz(catalogo, descripcionCatalogo);

  for (const [idAfijo, afijo] of Object.entries(catalogo)) {
    validarIdConfiguracion({
      id: idAfijo,

      descripcion: tipoEsperado,
    });

    if (idsAfijos.has(idAfijo)) {
      throw new Error(
        `El afijo "${idAfijo}" está repetido ` +
          "entre los catálogos de prefijos y sufijos.",
      );
    }

    idsAfijos.add(idAfijo);

    validarObjetoConfiguracion({
      valor: afijo,

      descripcion: `El afijo "${idAfijo}"`,
    });

    validarTexto(afijo.nombre, `nombre del afijo "${idAfijo}"`);

    if (!TIPOS_AFIJO.has(afijo.tipoAfijo) || afijo.tipoAfijo !== tipoEsperado) {
      throw new Error(
        `El afijo "${idAfijo}" debe declararse ` + `como ${tipoEsperado}.`,
      );
    }

    validarEstado({
      estado: afijo.estado,

      descripcion: `el afijo "${idAfijo}"`,
    });

    validarTexto(afijo.motivoEstado, `motivo de estado del afijo "${idAfijo}"`);

    validarTexto(afijo.descripcion, `descripción del afijo "${idAfijo}"`);

    validarEnteroNoNegativo(afijo.pesoBase, `peso base del afijo "${idAfijo}"`);

    if (afijo.estado === "activo" && afijo.pesoBase <= 0) {
      throw new Error(
        `El afijo activo "${idAfijo}" necesita ` +
          "un peso base mayor que cero.",
      );
    }

    validarListaTextos({
      lista: afijo.requiere,

      descripcion: `dependencias del afijo "${idAfijo}"`,

      permitirVacia: true,
    });

    validarListaTextos({
      lista: afijo.rarezasPermitidas,

      descripcion: `rarezas permitidas del afijo "${idAfijo}"`,

      permitirVacia: false,
    });

    for (const idRareza of afijo.rarezasPermitidas) {
      if (!idsRarezas.has(idRareza)) {
        throw new Error(
          `El afijo "${idAfijo}" referencia ` +
            `la rareza inexistente "${idRareza}".`,
        );
      }
    }

    if (
      afijo.estado === "activo" &&
      !afijo.rarezasPermitidas.some((idRareza) =>
        idsRarezasActivas.has(idRareza),
      )
    ) {
      throw new Error(
        `El afijo activo "${idAfijo}" no puede ` +
          "aparecer en ninguna rareza activa.",
      );
    }

    validarTexto(
      afijo.grupoExclusion,
      `grupo de exclusión del afijo "${idAfijo}"`,
    );

    validarAplicacionAfijo({
      idAfijo,
      aplicaA: afijo.aplicaA,
    });

    validarEfectosAfijo({
      idAfijo,
      afijo,
    });

    validarGradosAfijo({
      idAfijo,
      afijo,
    });

    validarListaTextos({
      lista: afijo.notasDiseno,

      descripcion: `notas de diseño del afijo "${idAfijo}"`,

      permitirVacia: true,
    });

    if (
      afijo.propuestaBalance !== undefined &&
      (typeof afijo.propuestaBalance !== "string" ||
        afijo.propuestaBalance.trim() === "")
    ) {
      throw new Error(
        `La propuesta de balance de "${idAfijo}" ` +
          "debe ser un texto válido.",
      );
    }
  }
}

function validarAplicacionAfijo({ idAfijo, aplicaA }) {
  validarObjetoConfiguracion({
    valor: aplicaA,

    descripcion: `La aplicación del afijo "${idAfijo}"`,
  });

  validarListaTextos({
    lista: aplicaA.tipos,

    descripcion: `tipos compatibles del afijo "${idAfijo}"`,

    permitirVacia: false,
  });

  for (const tipoObjeto of aplicaA.tipos) {
    if (!TIPOS_OBJETO_COMPATIBLES.has(tipoObjeto)) {
      throw new Error(
        `El afijo "${idAfijo}" utiliza ` +
          `el tipo de objeto no reconocido "${tipoObjeto}".`,
      );
    }
  }

  validarListaTextos({
    lista: aplicaA.ranurasIncluidas,

    descripcion: `ranuras incluidas del afijo "${idAfijo}"`,

    permitirVacia: true,
  });

  validarListaTextos({
    lista: aplicaA.ranurasExcluidas,

    descripcion: `ranuras excluidas del afijo "${idAfijo}"`,

    permitirVacia: true,
  });
}

function validarEfectosAfijo({ idAfijo, afijo }) {
  if (!Array.isArray(afijo.efectos) || afijo.efectos.length === 0) {
    throw new Error(`El afijo "${idAfijo}" necesita al menos un efecto.`);
  }

  const propiedades = new Set();

  for (const efecto of afijo.efectos) {
    validarObjetoConfiguracion({
      valor: efecto,

      descripcion: `Un efecto del afijo "${idAfijo}"`,
    });

    validarTexto(efecto.propiedad, `propiedad de un efecto de "${idAfijo}"`);

    validarTexto(efecto.operacion, `operación de un efecto de "${idAfijo}"`);

    if (propiedades.has(efecto.propiedad)) {
      throw new Error(
        `El afijo "${idAfijo}" repite ` + `la propiedad "${efecto.propiedad}".`,
      );
    }

    propiedades.add(efecto.propiedad);

    // Las propiedades y operaciones futuras
    // son aceptadas mientras el afijo no esté activo.
    if (
      afijo.estado === "activo" &&
      !PROPIEDADES_ACTIVAS.has(efecto.propiedad)
    ) {
      throw new Error(
        `El afijo "${idAfijo}" está activo, ` +
          `pero utiliza la propiedad no soportada ` +
          `"${efecto.propiedad}".`,
      );
    }

    if (
      afijo.estado === "activo" &&
      !OPERACIONES_ACTIVAS.has(efecto.operacion)
    ) {
      throw new Error(
        `El afijo "${idAfijo}" está activo, ` +
          `pero utiliza la operación no soportada ` +
          `"${efecto.operacion}".`,
      );
    }
  }
}

function validarGradosAfijo({ idAfijo, afijo }) {
  if (!Array.isArray(afijo.grados)) {
    throw new Error(`Los grados del afijo "${idAfijo}" deben ser una lista.`);
  }

  if (afijo.estado === "activo" && afijo.grados.length === 0) {
    throw new Error(`El afijo activo "${idAfijo}" necesita al menos un grado.`);
  }

  const gradosRegistrados = new Set();

  const propiedadesEfecto = afijo.efectos.map((efecto) => efecto.propiedad);

  for (const configuracionGrado of afijo.grados) {
    validarObjetoConfiguracion({
      valor: configuracionGrado,

      descripcion: `Un grado del afijo "${idAfijo}"`,
    });

    if (
      !Number.isInteger(configuracionGrado.grado) ||
      configuracionGrado.grado < 1
    ) {
      throw new Error(`Existe un grado inválido en el afijo "${idAfijo}".`);
    }

    if (gradosRegistrados.has(configuracionGrado.grado)) {
      throw new Error(
        `El afijo "${idAfijo}" repite ` +
          `el grado ${configuracionGrado.grado}.`,
      );
    }

    gradosRegistrados.add(configuracionGrado.grado);

    if (
      !Number.isInteger(configuracionGrado.nivelObjetoMinimo) ||
      configuracionGrado.nivelObjetoMinimo < 1
    ) {
      throw new Error(
        `El grado ${configuracionGrado.grado} de ` +
          `"${idAfijo}" necesita un nivel mínimo válido.`,
      );
    }

    validarEnteroNoNegativo(
      configuracionGrado.peso,
      `peso del grado ${configuracionGrado.grado} de "${idAfijo}"`,
    );

    if (afijo.estado === "activo" && configuracionGrado.peso <= 0) {
      throw new Error(
        `El grado ${configuracionGrado.grado} del afijo activo ` +
          `"${idAfijo}" necesita un peso mayor que cero.`,
      );
    }

    validarObjetoConfiguracion({
      valor: configuracionGrado.valores,

      descripcion:
        `Los valores del grado ${configuracionGrado.grado} ` +
        `de "${idAfijo}"`,
    });

    const propiedadesConfiguradas = Object.keys(configuracionGrado.valores);

    for (const propiedad of propiedadesEfecto) {
      if (!propiedadesConfiguradas.includes(propiedad)) {
        throw new Error(
          `El grado ${configuracionGrado.grado} de ` +
            `"${idAfijo}" no define valores para ` +
            `"${propiedad}".`,
        );
      }
    }

    for (const propiedad of propiedadesConfiguradas) {
      if (!propiedadesEfecto.includes(propiedad)) {
        throw new Error(
          `El grado ${configuracionGrado.grado} de ` +
            `"${idAfijo}" contiene la propiedad adicional ` +
            `"${propiedad}".`,
        );
      }

      validarRangoGrado({
        idAfijo,
        numeroGrado: configuracionGrado.grado,
        propiedad,
        rango: configuracionGrado.valores[propiedad],
      });
    }
  }
}

function validarRangoGrado({ idAfijo, numeroGrado, propiedad, rango }) {
  validarObjetoConfiguracion({
    valor: rango,

    descripcion:
      `El rango "${propiedad}" del grado ${numeroGrado} ` + `de "${idAfijo}"`,
  });

  if (
    !Number.isFinite(rango.minimo) ||
    !Number.isFinite(rango.maximo) ||
    rango.maximo < rango.minimo
  ) {
    throw new Error(
      `El rango "${propiedad}" del grado ${numeroGrado} ` +
        `de "${idAfijo}" no es válido.`,
    );
  }

  const decimales = rango.decimales ?? 0;

  if (!Number.isInteger(decimales) || decimales < 0 || decimales > 4) {
    throw new Error(
      `Los decimales del rango "${propiedad}" de ` +
        `"${idAfijo}" deben estar entre cero y cuatro.`,
    );
  }
}

function validarEstado({ estado, descripcion }) {
  if (typeof estado !== "string" || !ESTADOS_CONFIGURACION.has(estado)) {
    throw new Error(`El estado de ${descripcion} no es válido.`);
  }
}

function validarObjetoRaiz(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`La raíz de ${descripcion} debe ser un objeto JSON.`);
  }
}

function validarObjetoConfiguracion({ valor, descripcion }) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe ser un objeto válido.`);
  }
}

function validarIdConfiguracion({ id, descripcion }) {
  if (typeof id !== "string" || !/^[a-z0-9_]+$/.test(id)) {
    throw new Error(
      `El ID de ${descripcion} "${id}" no es válido. ` +
        "Utilizá solamente minúsculas, números y guiones bajos.",
    );
  }
}

function validarTexto(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`El campo ${descripcion} debe ser un texto válido.`);
  }
}

function validarListaTextos({ lista, descripcion, permitirVacia }) {
  if (!Array.isArray(lista) || (!permitirVacia && lista.length === 0)) {
    throw new Error(
      `La configuración de ${descripcion} debe ser una lista válida.`,
    );
  }

  const normalizados = new Set();

  for (const valor of lista) {
    validarTexto(valor, descripcion);

    const normalizado = valor.trim();

    if (normalizados.has(normalizado)) {
      throw new Error(
        `La configuración de ${descripcion} contiene ` +
          `el valor repetido "${normalizado}".`,
      );
    }

    normalizados.add(normalizado);
  }
}

function validarEnteroPositivo(valor, descripcion) {
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(
      `El campo ${descripcion} debe ser un entero mayor que cero.`,
    );
  }
}

function validarEnteroNoNegativo(valor, descripcion) {
  if (!Number.isInteger(valor) || valor < 0) {
    throw new Error(`El campo ${descripcion} debe ser un entero no negativo.`);
  }
}
