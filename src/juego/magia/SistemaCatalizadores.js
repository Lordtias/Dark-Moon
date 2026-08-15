import { OBJETIVOS_MODIFICADOR } from "../modificadores/ContratosModificadoresCombatiente.js";

const FAMILIAS_CATALIZADOR = new Set(["baston", "varita"]);
const ELEMENTOS_VARITA = new Set(["fuego", "frio", "rayo", "veneno"]);
const RANURAS_VARITA = new Set(["arma", "secundaria"]);

export function esCatalizador(objeto) {
  return Boolean(
    objeto &&
    FAMILIAS_CATALIZADOR.has(objeto.familiaObjeto) &&
    objeto.propiedades?.esCatalizador === true,
  );
}

export function obtenerPotenciaHabilidadObjeto(objeto) {
  const potencia = objeto?.propiedades?.potenciaHabilidad ?? 0;
  if (!Number.isFinite(potencia) || potencia < 0) {
    throw new Error(
      `La Potencia de Habilidad de "${objeto?.nombre ?? objeto?.id ?? "objeto"}" no es válida.`,
    );
  }
  return potencia;
}

export function obtenerPotenciaHabilidadCatalizador(objeto) {
  if (!esCatalizador(objeto)) return 0;
  return obtenerPotenciaHabilidadObjeto(objeto);
}

export function esVarita(objeto) {
  return esCatalizador(objeto) && objeto.familiaObjeto === "varita";
}

export function esBaston(objeto) {
  return esCatalizador(objeto) && objeto.familiaObjeto === "baston";
}

export function obtenerConfiguracionBasicaVarita(objeto) {
  if (!esVarita(objeto)) return null;

  const propiedades = objeto.propiedades ?? {};
  const elemento = propiedades.elementoAtaqueBasico;
  const costoMana = propiedades.costoManaAtaqueBasico;
  const danioMinimo = propiedades.danioElementalMinimo;
  const danioMaximo = propiedades.danioElementalMaximo;
  validarElementoVarita(elemento, objeto);
  validarEnteroPositivo(
    costoMana,
    `El coste de Maná de "${objeto.nombre ?? objeto.id}"`,
  );
  validarRangoNoNegativo({
    minimo: danioMinimo,
    maximo: danioMaximo,
    descripcion: `El daño elemental de "${objeto.nombre ?? objeto.id}"`,
  });

  return Object.freeze({
    elemento,
    costoMana,
    danioMinimo,
    danioMaximo,
    potenciaHabilidad: obtenerPotenciaHabilidadCatalizador(objeto),
  });
}

export function calcularPotenciaHabilidadObjetos(objetos = []) {
  if (!Array.isArray(objetos)) {
    throw new Error("Los objetos equipados deben estar dentro de una lista.");
  }
  return objetos.reduce(
    (total, objeto) => total + obtenerPotenciaHabilidadObjeto(objeto),
    0,
  );
}

export function obtenerObjetosEquipadosParaHabilidades(combatiente) {
  const equipamiento = combatiente?.equipamiento;
  if (!equipamiento) return [];
  if (typeof equipamiento.obtenerObjetosEquipados !== "function") {
    throw new Error(
      "El equipamiento debe exponer obtenerObjetosEquipados como API canónica.",
    );
  }
  return equipamiento.obtenerObjetosEquipados();
}

export function crearContextoPotenciaHabilidad({
  combatiente = null,
  objetos = null,
} = {}) {
  const objetosEquipados = Array.isArray(objetos)
    ? objetos
    : obtenerObjetosEquipadosParaHabilidades(combatiente);
  const potenciaBase = calcularPotenciaHabilidadObjetos(objetosEquipados);
  const potenciaHabilidad = combatiente?.sistemaModificadoresCombatiente
    ? combatiente.obtenerValorModificado(
        OBJETIVOS_MODIFICADOR.POTENCIA_HABILIDAD,
        potenciaBase,
      )
    : potenciaBase;

  return Object.freeze({
    potenciaHabilidad,
    multiplicadorHabilidad: 1 + potenciaHabilidad / 100,
    cantidadObjetosAportando: objetosEquipados.filter(
      (objeto) => obtenerPotenciaHabilidadObjeto(objeto) > 0,
    ).length,
  });
}

export function validarCatalogoCatalizadores(configuracionObjetos) {
  validarObjetoPlano(
    configuracionObjetos,
    "La configuración combinada de objetos",
  );

  const varitasPorTier = new Map();
  let cantidadBastones = 0;
  let cantidadVaritas = 0;

  for (const [id, plantilla] of Object.entries(configuracionObjetos)) {
    const familia = plantilla?.familiaObjeto;
    const declaraCatalizador = plantilla?.propiedades?.esCatalizador === true;
    if (declaraCatalizador && !FAMILIAS_CATALIZADOR.has(familia)) {
      throw new Error(
        `El objeto "${id}" se declara catalizador, pero su familia no es válida.`,
      );
    }
    if (!FAMILIAS_CATALIZADOR.has(familia)) continue;

    validarPlantillaComun({ id, plantilla });
    validarPotenciaHabilidad({ id, plantilla });

    if (familia === "baston") {
      validarBaston({ id, plantilla });
      cantidadBastones++;
      continue;
    }
    validarVarita({ id, plantilla });
    cantidadVaritas++;

    const tier = plantilla.tierBase;
    const elemento = plantilla.propiedades.elementoAtaqueBasico;
    const elementosTier = varitasPorTier.get(tier) ?? new Set();
    if (elementosTier.has(elemento)) {
      throw new Error(
        `El Tier ${tier} repite una varita del elemento "${elemento}".`,
      );
    }
    elementosTier.add(elemento);
    varitasPorTier.set(tier, elementosTier);
  }
  if (cantidadBastones === 0) {
    throw new Error("El catálogo necesita al menos un bastón catalizador.");
  }
  if (cantidadVaritas === 0) {
    throw new Error("El catálogo necesita varitas catalizadoras.");
  }
  for (const [tier, elementos] of varitasPorTier) {
    if (
      elementos.size !== ELEMENTOS_VARITA.size ||
      [...ELEMENTOS_VARITA].some((elemento) => !elementos.has(elemento))
    ) {
      throw new Error(
        `El Tier ${tier} debe contener una varita de Fuego, Frío, Rayo y Veneno.`,
      );
    }
  }

  return configuracionObjetos;
}

function validarPlantillaComun({ id, plantilla }) {
  validarObjetoPlano(plantilla, `La plantilla "${id}"`);
  const textos = ["nombre", "tipo", "familiaObjeto", "descripcion"];
  for (const campo of textos) {
    if (
      typeof plantilla[campo] !== "string" ||
      plantilla[campo].trim() === ""
    ) {
      throw new Error(`El catalizador "${id}" necesita el campo "${campo}".`);
    }
  }
  if (plantilla.tipo !== "arma") {
    throw new Error(`El catalizador "${id}" debe ser un arma.`);
  }
  validarEnteroPositivo(plantilla.tierBase, `El Tier de "${id}"`);
  validarEnteroPositivo(
    plantilla.nivelMinimoGeneracion,
    `El nivel mínimo de "${id}"`,
  );
  if (!Array.isArray(plantilla.ranurasCompatibles)) {
    throw new Error(`Las ranuras compatibles de "${id}" no son válidas.`);
  }
  validarObjetoPlano(plantilla.propiedades, `Las propiedades de "${id}"`);
}

function validarPotenciaHabilidad({ id, plantilla }) {
  if (plantilla.propiedades.esCatalizador !== true) {
    throw new Error(`El arma mágica "${id}" debe declararse catalizador.`);
  }
  const potencia = plantilla.propiedades.potenciaHabilidad;
  if (!Number.isFinite(potencia) || potencia < 0) {
    throw new Error(`La Potencia de Habilidad de "${id}" no es válida.`);
  }
}

function validarBaston({ id, plantilla }) {
  const propiedades = plantilla.propiedades;
  if (
    propiedades.manos !== 2 ||
    propiedades.bloqueaSecundaria !== true ||
    propiedades.tipoAtaque !== "cuerpoACuerpo" ||
    propiedades.alcance !== 1 ||
    propiedades.requiereQuiver !== false ||
    plantilla.ranurasCompatibles.length !== 1 ||
    plantilla.ranurasCompatibles[0] !== "arma"
  ) {
    throw new Error(
      `El bastón "${id}" debe ser de dos manos, cuerpo a cuerpo y bloquear secundaria.`,
    );
  }
}

function validarVarita({ id, plantilla }) {
  const propiedades = plantilla.propiedades;
  if (
    propiedades.manos !== 1 ||
    propiedades.bloqueaSecundaria !== false ||
    propiedades.tipoAtaque !== "distancia" ||
    propiedades.requiereQuiver !== false
  ) {
    throw new Error(
      `La varita "${id}" debe ser de una mano, a distancia y sin munición.`,
    );
  }
  const ranuras = new Set(plantilla.ranurasCompatibles);
  if (
    ranuras.size !== RANURAS_VARITA.size ||
    [...RANURAS_VARITA].some((ranura) => !ranuras.has(ranura))
  ) {
    throw new Error(
      `La varita "${id}" debe admitir las ranuras arma y secundaria.`,
    );
  }

  obtenerConfiguracionBasicaVarita({
    id,
    nombre: plantilla.nombre,
    familiaObjeto: plantilla.familiaObjeto,
    propiedades,
  });
}

function validarElementoVarita(elemento, objeto) {
  if (!ELEMENTOS_VARITA.has(elemento)) {
    throw new Error(
      `La varita "${objeto.nombre ?? objeto.id}" no tiene un elemento válido.`,
    );
  }
}

function validarRangoNoNegativo({ minimo, maximo, descripcion }) {
  if (
    !Number.isFinite(minimo) ||
    minimo < 0 ||
    !Number.isFinite(maximo) ||
    maximo < minimo
  ) {
    throw new Error(`${descripcion} no es válido.`);
  }
}

function validarEnteroPositivo(valor, descripcion) {
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un entero mayor que cero.`);
  }
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe ser un objeto válido.`);
  }
}
