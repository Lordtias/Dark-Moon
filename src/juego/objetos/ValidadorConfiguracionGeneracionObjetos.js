// Valida la configuración común de rarezas, prefijos y sufijos.
// Las extensiones de ETAPA 6 forman parte del mismo contrato general:
// - potenciaHabilidad es una propiedad activa.
// - familiasIncluidas/familiasExcluidas son filtros opcionales de cualquier afijo.

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
const OPERACIONES_ACTIVAS = new Set(["sumar"]);
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
  "potenciaHabilidad",
]);

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

  return { reglas, rarezas, prefijos, sufijos };
}

function validarReglasGeneracion(reglas) {
  validarObjetoRaiz(reglas, "las reglas de generación de objetos");
  const configuracionNivel = reglas.nivelObjeto;
  validarObjetoConfiguracion(configuracionNivel, "La configuración del nivel de objeto");
  validarTexto(configuracionNivel.descripcion, "descripción de la generación del nivel de objeto");
  if (!Number.isInteger(configuracionNivel.nivelMinimo) || configuracionNivel.nivelMinimo < 1) {
    throw new Error("El nivel mínimo de los objetos debe ser un entero mayor o igual que uno.");
  }
  if (!Array.isArray(configuracionNivel.distribucion) || configuracionNivel.distribucion.length === 0) {
    throw new Error("La generación del nivel de objeto necesita una distribución.");
  }
  const desplazamientos = new Set();
  for (const entrada of configuracionNivel.distribucion) {
    validarObjetoConfiguracion(entrada, "Una entrada de la distribución del nivel de objeto");
    if (!Number.isInteger(entrada.desplazamiento)) {
      throw new Error("Cada desplazamiento de nivel debe ser un entero.");
    }
    if (desplazamientos.has(entrada.desplazamiento)) {
      throw new Error(`La distribución del nivel repite el desplazamiento ${entrada.desplazamiento}.`);
    }
    desplazamientos.add(entrada.desplazamiento);
    validarEnteroPositivo(entrada.peso, `peso del desplazamiento ${entrada.desplazamiento}`);
  }
  validarListaTextos(configuracionNivel.notasDiseno ?? [], "notas de diseño de la generación del nivel de objeto", true);
}

function validarCatalogoRarezas(rarezas) {
  validarObjetoRaiz(rarezas, "el catálogo de rarezas");
  for (const [idRareza, rareza] of Object.entries(rarezas)) {
    validarIdConfiguracion(idRareza, "rareza");
    validarObjetoConfiguracion(rareza, `La rareza "${idRareza}"`);
    validarTexto(rareza.nombre, `nombre de la rareza "${idRareza}"`);
    validarEstado(rareza.estado, `la rareza "${idRareza}"`);
    validarTexto(rareza.motivoEstado, `motivo de estado de la rareza "${idRareza}"`);
    if (typeof rareza.colorInterfaz !== "string" || !/^#[0-9a-fA-F]{6}$/.test(rareza.colorInterfaz)) {
      throw new Error(`La rareza "${idRareza}" necesita un color hexadecimal de seis dígitos.`);
    }
    validarEnteroNoNegativo(rareza.pesoBase, `peso base de la rareza "${idRareza}"`);
    if (typeof rareza.generaAfijosAleatorios !== "boolean") {
      throw new Error(`La rareza "${idRareza}" debe indicar si genera afijos aleatorios.`);
    }
    for (const [campo, descripcion] of [
      ["afijosMinimos", "mínimo de afijos"],
      ["afijosMaximos", "máximo de afijos"],
      ["prefijosMaximos", "máximo de prefijos"],
      ["sufijosMaximos", "máximo de sufijos"],
    ]) validarEnteroNoNegativo(rareza[campo], `${descripcion} de "${idRareza}"`);
    if (rareza.afijosMaximos < rareza.afijosMinimos) {
      throw new Error(`La rareza "${idRareza}" tiene un máximo de afijos menor que su mínimo.`);
    }
    if (rareza.prefijosMaximos + rareza.sufijosMaximos < rareza.afijosMaximos) {
      throw new Error(`La rareza "${idRareza}" no tiene suficientes espacios de prefijo y sufijo.`);
    }
    if (!Number.isInteger(rareza.nivelObjetoMinimo) || rareza.nivelObjetoMinimo < 1) {
      throw new Error(`El nivel mínimo de la rareza "${idRareza}" debe ser un entero mayor o igual que uno.`);
    }
    validarDistribucionCantidadAfijos(idRareza, rareza);
  }
  const pesoActivo = Object.values(rarezas)
    .filter((rareza) => rareza.estado === "activo")
    .reduce((total, rareza) => total + rareza.pesoBase, 0);
  if (pesoActivo <= 0) throw new Error("Las rarezas activas necesitan un peso total mayor que cero.");
  if (rarezas.comun?.estado !== "activo") throw new Error("La rareza común debe existir y estar activa.");
  if (rarezas.magico?.estado !== "activo") throw new Error("La rareza mágica debe existir y estar activa.");
}

function validarDistribucionCantidadAfijos(idRareza, rareza) {
  const distribucion = rareza.distribucionCantidadAfijos;
  if (!Array.isArray(distribucion) || distribucion.length === 0) {
    throw new Error(`La rareza "${idRareza}" necesita una distribución de cantidad de afijos.`);
  }
  const cantidades = new Set();
  for (const entrada of distribucion) {
    validarObjetoConfiguracion(entrada, `Una cantidad de afijos de la rareza "${idRareza}"`);
    if (!Number.isInteger(entrada.cantidad) || entrada.cantidad < rareza.afijosMinimos || entrada.cantidad > rareza.afijosMaximos) {
      throw new Error(`La rareza "${idRareza}" contiene la cantidad de afijos inválida ${entrada.cantidad}.`);
    }
    if (cantidades.has(entrada.cantidad)) {
      throw new Error(`La rareza "${idRareza}" repite la cantidad ${entrada.cantidad} en su distribución.`);
    }
    cantidades.add(entrada.cantidad);
    validarEnteroPositivo(entrada.peso, `peso de ${entrada.cantidad} afijos en la rareza "${idRareza}"`);
  }
  if (rareza.generaAfijosAleatorios !== true && (distribucion.length !== 1 || distribucion[0].cantidad !== 0)) {
    throw new Error(`La rareza "${idRareza}" no genera afijos aleatorios y solamente puede configurar la cantidad cero.`);
  }
}

function validarCatalogoAfijos({ catalogo, tipoEsperado, descripcionCatalogo, idsRarezas, idsRarezasActivas, idsAfijos }) {
  validarObjetoRaiz(catalogo, descripcionCatalogo);
  for (const [idAfijo, afijo] of Object.entries(catalogo)) {
    validarIdConfiguracion(idAfijo, tipoEsperado);
    if (idsAfijos.has(idAfijo)) {
      throw new Error(`El afijo "${idAfijo}" está repetido entre los catálogos de prefijos y sufijos.`);
    }
    idsAfijos.add(idAfijo);
    validarObjetoConfiguracion(afijo, `El afijo "${idAfijo}"`);
    validarTexto(afijo.nombre, `nombre del afijo "${idAfijo}"`);
    if (!TIPOS_AFIJO.has(afijo.tipoAfijo) || afijo.tipoAfijo !== tipoEsperado) {
      throw new Error(`El afijo "${idAfijo}" debe declararse como ${tipoEsperado}.`);
    }
    validarEstado(afijo.estado, `el afijo "${idAfijo}"`);
    validarTexto(afijo.motivoEstado, `motivo de estado del afijo "${idAfijo}"`);
    validarTexto(afijo.descripcion, `descripción del afijo "${idAfijo}"`);
    validarEnteroNoNegativo(afijo.pesoBase, `peso base del afijo "${idAfijo}"`);
    if (afijo.estado === "activo" && afijo.pesoBase <= 0) {
      throw new Error(`El afijo activo "${idAfijo}" necesita un peso base mayor que cero.`);
    }
    validarListaTextos(afijo.requiere, `dependencias del afijo "${idAfijo}"`, true);
    validarListaTextos(afijo.rarezasPermitidas, `rarezas permitidas del afijo "${idAfijo}"`, false);
    for (const idRareza of afijo.rarezasPermitidas) {
      if (!idsRarezas.has(idRareza)) throw new Error(`El afijo "${idAfijo}" referencia la rareza inexistente "${idRareza}".`);
    }
    if (afijo.estado === "activo" && !afijo.rarezasPermitidas.some((id) => idsRarezasActivas.has(id))) {
      throw new Error(`El afijo activo "${idAfijo}" no puede aparecer en ninguna rareza activa.`);
    }
    validarTexto(afijo.grupoExclusion, `grupo de exclusión del afijo "${idAfijo}"`);
    validarAplicacionAfijo(idAfijo, afijo.aplicaA);
    validarEfectosAfijo(idAfijo, afijo);
    validarGradosAfijo(idAfijo, afijo);
    validarListaTextos(afijo.notasDiseno, `notas de diseño del afijo "${idAfijo}"`, true);
    if (afijo.propuestaBalance !== undefined) validarTexto(afijo.propuestaBalance, `propuesta de balance de "${idAfijo}"`);
  }
}

function validarAplicacionAfijo(idAfijo, aplicaA) {
  validarObjetoConfiguracion(aplicaA, `La aplicación del afijo "${idAfijo}"`);
  validarListaTextos(aplicaA.tipos, `tipos compatibles del afijo "${idAfijo}"`, false);
  for (const tipoObjeto of aplicaA.tipos) {
    if (!TIPOS_OBJETO_COMPATIBLES.has(tipoObjeto)) {
      throw new Error(`El afijo "${idAfijo}" utiliza el tipo de objeto no reconocido "${tipoObjeto}".`);
    }
  }
  validarListaTextos(aplicaA.ranurasIncluidas, `ranuras incluidas del afijo "${idAfijo}"`, true);
  validarListaTextos(aplicaA.ranurasExcluidas, `ranuras excluidas del afijo "${idAfijo}"`, true);
  validarListaTextos(aplicaA.familiasIncluidas ?? [], `familias incluidas del afijo "${idAfijo}"`, true);
  validarListaTextos(aplicaA.familiasExcluidas ?? [], `familias excluidas del afijo "${idAfijo}"`, true);
}

function validarEfectosAfijo(idAfijo, afijo) {
  if (!Array.isArray(afijo.efectos) || afijo.efectos.length === 0) {
    throw new Error(`El afijo "${idAfijo}" necesita al menos un efecto.`);
  }
  const propiedades = new Set();
  for (const efecto of afijo.efectos) {
    validarObjetoConfiguracion(efecto, `Un efecto del afijo "${idAfijo}"`);
    validarTexto(efecto.propiedad, `propiedad de un efecto de "${idAfijo}"`);
    validarTexto(efecto.operacion, `operación de un efecto de "${idAfijo}"`);
    if (propiedades.has(efecto.propiedad)) throw new Error(`El afijo "${idAfijo}" repite la propiedad "${efecto.propiedad}".`);
    propiedades.add(efecto.propiedad);
    if (afijo.estado === "activo" && !PROPIEDADES_ACTIVAS.has(efecto.propiedad)) {
      throw new Error(`El afijo "${idAfijo}" está activo, pero utiliza la propiedad no soportada "${efecto.propiedad}".`);
    }
    if (afijo.estado === "activo" && !OPERACIONES_ACTIVAS.has(efecto.operacion)) {
      throw new Error(`El afijo "${idAfijo}" está activo, pero utiliza la operación no soportada "${efecto.operacion}".`);
    }
  }
}

function validarGradosAfijo(idAfijo, afijo) {
  if (!Array.isArray(afijo.grados)) throw new Error(`Los grados del afijo "${idAfijo}" deben ser una lista.`);
  if (afijo.estado === "activo" && afijo.grados.length === 0) throw new Error(`El afijo activo "${idAfijo}" necesita al menos un grado.`);
  const registrados = new Set();
  const propiedadesEfecto = afijo.efectos.map((efecto) => efecto.propiedad);
  for (const grado of afijo.grados) {
    validarObjetoConfiguracion(grado, `Un grado del afijo "${idAfijo}"`);
    if (!Number.isInteger(grado.grado) || grado.grado < 1) throw new Error(`Existe un grado inválido en el afijo "${idAfijo}".`);
    if (registrados.has(grado.grado)) throw new Error(`El afijo "${idAfijo}" repite el grado ${grado.grado}.`);
    registrados.add(grado.grado);
    if (!Number.isInteger(grado.nivelObjetoMinimo) || grado.nivelObjetoMinimo < 1) {
      throw new Error(`El grado ${grado.grado} de "${idAfijo}" necesita un nivel mínimo válido.`);
    }
    validarEnteroNoNegativo(grado.peso, `peso del grado ${grado.grado} de "${idAfijo}"`);
    if (afijo.estado === "activo" && grado.peso <= 0) throw new Error(`El grado ${grado.grado} del afijo activo "${idAfijo}" necesita un peso mayor que cero.`);
    validarObjetoConfiguracion(grado.valores, `Los valores del grado ${grado.grado} de "${idAfijo}"`);
    const configuradas = Object.keys(grado.valores);
    for (const propiedad of propiedadesEfecto) {
      if (!configuradas.includes(propiedad)) throw new Error(`El grado ${grado.grado} de "${idAfijo}" no define valores para "${propiedad}".`);
    }
    for (const propiedad of configuradas) {
      if (!propiedadesEfecto.includes(propiedad)) throw new Error(`El grado ${grado.grado} de "${idAfijo}" contiene la propiedad adicional "${propiedad}".`);
      validarRangoGrado(idAfijo, grado.grado, propiedad, grado.valores[propiedad]);
    }
  }
}

function validarRangoGrado(idAfijo, numeroGrado, propiedad, rango) {
  validarObjetoConfiguracion(rango, `El rango "${propiedad}" del grado ${numeroGrado} de "${idAfijo}"`);
  if (!Number.isFinite(rango.minimo) || !Number.isFinite(rango.maximo) || rango.maximo < rango.minimo) {
    throw new Error(`El rango "${propiedad}" del grado ${numeroGrado} de "${idAfijo}" no es válido.`);
  }
  const decimales = rango.decimales ?? 0;
  if (!Number.isInteger(decimales) || decimales < 0 || decimales > 4) {
    throw new Error(`Los decimales del rango "${propiedad}" de "${idAfijo}" deben estar entre cero y cuatro.`);
  }
}

function validarEstado(estado, descripcion) {
  if (typeof estado !== "string" || !ESTADOS_CONFIGURACION.has(estado)) throw new Error(`El estado de ${descripcion} no es válido.`);
}
function validarObjetoRaiz(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) throw new Error(`La raíz de ${descripcion} debe ser un objeto JSON.`);
}
function validarObjetoConfiguracion(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) throw new Error(`${descripcion} debe ser un objeto válido.`);
}
function validarIdConfiguracion(id, descripcion) {
  if (typeof id !== "string" || !/^[a-z0-9_]+$/.test(id)) throw new Error(`El ID de ${descripcion} "${id}" no es válido. Utilizá solamente minúsculas, números y guiones bajos.`);
}
function validarTexto(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") throw new Error(`El campo ${descripcion} debe ser un texto válido.`);
}
function validarListaTextos(lista, descripcion, permitirVacia) {
  if (!Array.isArray(lista) || (!permitirVacia && lista.length === 0)) throw new Error(`La configuración de ${descripcion} debe ser una lista válida.`);
  const normalizados = new Set();
  for (const valor of lista) {
    validarTexto(valor, descripcion);
    const normalizado = valor.trim();
    if (normalizados.has(normalizado)) throw new Error(`La configuración de ${descripcion} contiene el valor repetido "${normalizado}".`);
    normalizados.add(normalizado);
  }
}
function validarEnteroPositivo(valor, descripcion) {
  if (!Number.isInteger(valor) || valor <= 0) throw new Error(`El campo ${descripcion} debe ser un entero mayor que cero.`);
}
function validarEnteroNoNegativo(valor, descripcion) {
  if (!Number.isInteger(valor) || valor < 0) throw new Error(`El campo ${descripcion} debe ser un entero no negativo.`);
}
