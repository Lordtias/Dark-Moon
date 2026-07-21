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

// Valida conjuntamente rarezas, prefijos y sufijos.
//
// El catálogo completo se conserva en memoria,
// pero el generador futuro utilizará solamente
// entradas cuyo estado sea "activo".
export function validarConfiguracionGeneracionObjetos({
  rarezas,
  prefijos,
  sufijos,
} = {}) {
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
    rarezas,
    prefijos,
    sufijos,
  };
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

    if (rareza.estado === "activo" && rareza.pesoBase <= 0) {
      throw new Error(
        `La rareza activa "${idRareza}" ` +
          "necesita un peso base mayor que cero.",
      );
    }

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

function validarEnteroNoNegativo(valor, descripcion) {
  if (!Number.isInteger(valor) || valor < 0) {
    throw new Error(`El campo ${descripcion} debe ser un entero no negativo.`);
  }
}
