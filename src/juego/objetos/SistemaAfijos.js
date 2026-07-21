import { seleccionarEntradaPonderada } from "./GeneradorRarezaObjeto.js";

const ESTADO_ACTIVO = "activo";
const OPERACION_SUMAR = "sumar";

// Comprueba si una rareza puede cumplir sus límites de afijos
// para una plantilla, nivel y catálogo concretos.
export function puedeGenerarRarezaParaPlantilla({
  plantilla,
  idRareza,
  configuracionRareza,
  nivelObjeto,
  catalogoPrefijos,
  catalogoSufijos,
} = {}) {
  validarEntradasPrincipales({
    plantilla,
    configuracionRareza,
    nivelObjeto,
    catalogoPrefijos,
    catalogoSufijos,
  });

  if (configuracionRareza.generaAfijosAleatorios !== true) {
    return configuracionRareza.afijosMinimos === 0;
  }

  const capacidad = calcularCapacidadAfijos({
    plantilla,
    idRareza,
    configuracionRareza,
    nivelObjeto,
    catalogoPrefijos,
    catalogoSufijos,
  });

  return capacidad.maximoTotal >= configuracionRareza.afijosMinimos;
}

// Genera cuántos afijos habrá, qué familias resultan,
// qué grados son elegidos y sus valores exactos.
export function generarAfijosObjeto({
  plantilla,
  idRareza,
  configuracionRareza,
  nivelObjeto,
  catalogoPrefijos,
  catalogoSufijos,
  aleatorio,
} = {}) {
  validarEntradasPrincipales({
    plantilla,
    configuracionRareza,
    nivelObjeto,
    catalogoPrefijos,
    catalogoSufijos,
  });
  validarAleatorio(aleatorio);

  if (configuracionRareza.generaAfijosAleatorios !== true) {
    return { prefijos: [], sufijos: [] };
  }

  const capacidad = calcularCapacidadAfijos({
    plantilla,
    idRareza,
    configuracionRareza,
    nivelObjeto,
    catalogoPrefijos,
    catalogoSufijos,
  });

  const minimo = configuracionRareza.afijosMinimos;
  const maximo = capacidad.maximoTotal;

  if (maximo < minimo) {
    throw new Error(
      `La rareza "${idRareza}" necesita ${minimo} afijos, ` +
        `pero la plantilla solamente permite ${maximo}.`,
    );
  }

  // Rarezas.json define mínimos y máximos, pero todavía no pesos
  // por cantidad. Por ahora cada cantidad del rango es equiprobable.
  // En Mágico, 1 y 2 afijos tienen inicialmente 50 % cada uno.
  const cantidadObjetivo = aleatorio.entero(minimo, maximo);
  const prefijos = [];
  const sufijos = [];
  const idsSeleccionados = new Set();
  const gruposSeleccionados = new Set();

  while (prefijos.length + sufijos.length < cantidadObjetivo) {
    const prefijosDisponibles =
      prefijos.length < configuracionRareza.prefijosMaximos
        ? obtenerAfijosCompatibles({
            catalogo: catalogoPrefijos,
            plantilla,
            idRareza,
            nivelObjeto,
            idsSeleccionados,
            gruposSeleccionados,
          })
        : [];

    const sufijosDisponibles =
      sufijos.length < configuracionRareza.sufijosMaximos
        ? obtenerAfijosCompatibles({
            catalogo: catalogoSufijos,
            plantilla,
            idRareza,
            nivelObjeto,
            idsSeleccionados,
            gruposSeleccionados,
          })
        : [];

    const tiposDisponibles = [];
    if (prefijosDisponibles.length > 0) tiposDisponibles.push("prefijo");
    if (sufijosDisponibles.length > 0) tiposDisponibles.push("sufijo");

    if (tiposDisponibles.length === 0) {
      throw new Error(
        `No quedan afijos compatibles para completar ` +
          `la rareza "${idRareza}".`,
      );
    }

    const tipo = aleatorio.elegir(tiposDisponibles);
    const opciones =
      tipo === "prefijo" ? prefijosDisponibles : sufijosDisponibles;

    // Las familias todavía no tienen un peso propio en el JSON.
    // Todas las familias compatibles son equiprobables.
    const seleccion = aleatorio.elegir(opciones);
    const generado = generarInstanciaAfijo({
      afijoSeleccionado: seleccion,
      nivelObjeto,
      aleatorio,
    });

    if (tipo === "prefijo") prefijos.push(generado);
    else sufijos.push(generado);

    idsSeleccionados.add(generado.id);
    if (generado.grupoExclusion) {
      gruposSeleccionados.add(generado.grupoExclusion);
    }
  }

  return { prefijos, sufijos };
}

// Aplica sobre una copia de las propiedades base los valores
// exactos almacenados por cada afijo generado.
export function componerPropiedadesObjeto({
  propiedadesBase,
  prefijos = [],
  sufijos = [],
} = {}) {
  validarObjetoPlano(propiedadesBase, "Las propiedades base");

  if (!Array.isArray(prefijos) || !Array.isArray(sufijos)) {
    throw new Error("Los afijos generados deben estar dentro de listas.");
  }

  const propiedadesFinales = copiarDatos(propiedadesBase);

  for (const afijo of [...prefijos, ...sufijos]) {
    aplicarAfijoAPropiedades({ propiedadesFinales, afijo });
  }

  return propiedadesFinales;
}

function calcularCapacidadAfijos({
  plantilla,
  idRareza,
  configuracionRareza,
  nivelObjeto,
  catalogoPrefijos,
  catalogoSufijos,
}) {
  const prefijos = obtenerAfijosCompatibles({
    catalogo: catalogoPrefijos,
    plantilla,
    idRareza,
    nivelObjeto,
  });
  const sufijos = obtenerAfijosCompatibles({
    catalogo: catalogoSufijos,
    plantilla,
    idRareza,
    nivelObjeto,
  });

  const capacidadPrefijos = Math.min(
    configuracionRareza.prefijosMaximos,
    contarGruposSeleccionables(prefijos),
  );
  const capacidadSufijos = Math.min(
    configuracionRareza.sufijosMaximos,
    contarGruposSeleccionables(sufijos),
  );

  return {
    capacidadPrefijos,
    capacidadSufijos,
    maximoTotal: Math.min(
      configuracionRareza.afijosMaximos,
      capacidadPrefijos + capacidadSufijos,
    ),
  };
}

function obtenerAfijosCompatibles({
  catalogo,
  plantilla,
  idRareza,
  nivelObjeto,
  idsSeleccionados = new Set(),
  gruposSeleccionados = new Set(),
}) {
  return Object.entries(catalogo)
    .filter(([idAfijo, afijo]) =>
      esAfijoCompatible({
        idAfijo,
        afijo,
        plantilla,
        idRareza,
        nivelObjeto,
        idsSeleccionados,
        gruposSeleccionados,
      }),
    )
    .map(([id, configuracion]) => ({ id, configuracion }));
}

function esAfijoCompatible({
  idAfijo,
  afijo,
  plantilla,
  idRareza,
  nivelObjeto,
  idsSeleccionados,
  gruposSeleccionados,
}) {
  if (afijo.estado !== ESTADO_ACTIVO || idsSeleccionados.has(idAfijo)) {
    return false;
  }

  const grupo = normalizarGrupo(afijo.grupoExclusion);
  if (grupo && gruposSeleccionados.has(grupo)) return false;
  if (!afijo.rarezasPermitidas.includes(idRareza)) return false;
  if (!afijo.aplicaA.tipos.includes(plantilla.tipo)) return false;

  const ranurasObjeto = plantilla.ranurasCompatibles ?? [];
  const incluidas = afijo.aplicaA.ranurasIncluidas;
  const excluidas = afijo.aplicaA.ranurasExcluidas;

  const cumpleIncluidas =
    incluidas.length === 0 ||
    incluidas.some((ranura) => ranurasObjeto.includes(ranura));
  const tocaExcluidas = excluidas.some((ranura) =>
    ranurasObjeto.includes(ranura),
  );

  if (!cumpleIncluidas || tocaExcluidas) return false;

  return afijo.grados.some(
    (grado) => grado.nivelObjetoMinimo <= nivelObjeto && grado.peso > 0,
  );
}

function generarInstanciaAfijo({ afijoSeleccionado, nivelObjeto, aleatorio }) {
  const { id, configuracion } = afijoSeleccionado;
  const gradosElegibles = configuracion.grados.filter(
    (grado) => grado.nivelObjetoMinimo <= nivelObjeto && grado.peso > 0,
  );

  const grado = seleccionarEntradaPonderada({
    entradas: gradosElegibles,
    obtenerPeso: (entrada) => entrada.peso,
    aleatorio,
    descripcion: `un grado del afijo "${id}"`,
  });

  const valores = {};
  for (const [propiedad, rango] of Object.entries(grado.valores)) {
    valores[propiedad] = generarValorRango({
      rango,
      aleatorio,
      idAfijo: id,
      propiedad,
    });
  }

  return {
    id,
    nombre: configuracion.nombre,
    tipoAfijo: configuracion.tipoAfijo,
    descripcion: configuracion.descripcion,
    grupoExclusion: normalizarGrupo(configuracion.grupoExclusion),
    grado: grado.grado,
    nivelObjetoMinimo: grado.nivelObjetoMinimo,
    efectos: copiarDatos(configuracion.efectos),
    valores,
  };
}

function generarValorRango({ rango, aleatorio, idAfijo, propiedad }) {
  validarObjetoPlano(rango, `El rango "${propiedad}" del afijo "${idAfijo}"`);

  const minimo = rango.minimo;
  const maximo = rango.maximo;
  const decimales = rango.decimales ?? 0;

  if (
    !Number.isFinite(minimo) ||
    !Number.isFinite(maximo) ||
    maximo < minimo ||
    !Number.isInteger(decimales) ||
    decimales < 0
  ) {
    throw new Error(
      `El rango "${propiedad}" del afijo "${idAfijo}" no es válido.`,
    );
  }

  const factor = 10 ** decimales;
  const resultado = aleatorio.entero(
    Math.round(minimo * factor),
    Math.round(maximo * factor),
  );

  return resultado / factor;
}

function aplicarAfijoAPropiedades({ propiedadesFinales, afijo }) {
  validarObjetoPlano(afijo, "El afijo generado");
  validarObjetoPlano(afijo.valores, `Los valores del afijo "${afijo.id}"`);

  if (!Array.isArray(afijo.efectos) || afijo.efectos.length === 0) {
    throw new Error(`El afijo "${afijo.id}" no conserva sus efectos.`);
  }

  for (const efecto of afijo.efectos) {
    const valor = afijo.valores[efecto.propiedad];

    if (!Number.isFinite(valor)) {
      throw new Error(
        `El afijo "${afijo.id}" no generó un valor para ` +
          `"${efecto.propiedad}".`,
      );
    }

    if (efecto.operacion !== OPERACION_SUMAR) {
      throw new Error(
        `La operación "${efecto.operacion}" del afijo ` +
          `"${afijo.id}" todavía no está implementada.`,
      );
    }

    const actual = propiedadesFinales[efecto.propiedad] ?? 0;
    if (!Number.isFinite(actual)) {
      throw new Error(`La propiedad "${efecto.propiedad}" no es numérica.`);
    }

    propiedadesFinales[efecto.propiedad] = actual + valor;
  }
}

function contarGruposSeleccionables(afijos) {
  return new Set(
    afijos.map((afijo) => {
      const grupo = normalizarGrupo(afijo.configuracion.grupoExclusion);
      return grupo ? `grupo:${grupo}` : `afijo:${afijo.id}`;
    }),
  ).size;
}

function normalizarGrupo(grupo) {
  return typeof grupo === "string" && grupo.trim() !== ""
    ? grupo.trim().toLowerCase()
    : null;
}

function validarEntradasPrincipales({
  plantilla,
  configuracionRareza,
  nivelObjeto,
  catalogoPrefijos,
  catalogoSufijos,
}) {
  validarObjetoPlano(plantilla, "La plantilla del objeto");
  validarObjetoPlano(configuracionRareza, "La configuración de rareza");
  validarObjetoPlano(catalogoPrefijos, "El catálogo de prefijos");
  validarObjetoPlano(catalogoSufijos, "El catálogo de sufijos");

  if (!Number.isInteger(nivelObjeto) || nivelObjeto < 1) {
    throw new Error(
      "El nivel del objeto debe ser un entero mayor o igual que 1.",
    );
  }
}

function validarAleatorio(aleatorio) {
  if (
    !aleatorio ||
    typeof aleatorio.siguiente !== "function" ||
    typeof aleatorio.entero !== "function" ||
    typeof aleatorio.elegir !== "function"
  ) {
    throw new Error(
      "Se necesita un generador aleatorio válido para crear afijos.",
    );
  }
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe formar un objeto válido.`);
  }
}

function copiarDatos(valor) {
  if (Array.isArray(valor)) return valor.map(copiarDatos);

  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, contenido]) => [
        clave,
        copiarDatos(contenido),
      ]),
    );
  }

  return valor;
}
