import { Enemigo } from "../entidad/destructible/combatiente/Enemigo.js";

import { crearObjetosDesdeDefiniciones } from "../objetos/FabricaObjetos.js";

import { CONFIGURACION_COMBATE } from "../config/ConfiguracionCombate.js";

// Crea una copia profunda de valores provenientes
// de los archivos JSON.
//
// De esta forma, escalar un enemigo concreto nunca
// modifica la plantilla utilizada por otros enemigos.
function clonarConfiguracion(valor) {
  if (Array.isArray(valor)) {
    return valor.map((elemento) => clonarConfiguracion(elemento));
  }

  if (valor !== null && typeof valor === "object") {
    const copia = {};

    for (const [clave, contenido] of Object.entries(valor)) {
      copia[clave] = clonarConfiguracion(contenido);
    }

    return copia;
  }

  return valor;
}

function esObjetoConfiguracion(valor) {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

// Calcula el valor de una estadística según
// su regla de escalado.
function calcularValorEscalado(valorBase, regla, nivel) {
  if (!Number.isFinite(valorBase)) {
    throw new Error("El valor base de una estadística enemiga no es válido.");
  }

  if (!esObjetoConfiguracion(regla)) {
    throw new Error("Existe una regla de escalado de enemigos inválida.");
  }

  const { aumento, cadaNiveles } = regla;

  if (
    !Number.isFinite(aumento) ||
    !Number.isInteger(cadaNiveles) ||
    cadaNiveles <= 0
  ) {
    throw new Error("Existe una regla de escalado de enemigos inválida.");
  }

  const cantidadAumentos = Math.floor((nivel - 1) / cadaNiveles);

  return valorBase + cantidadAumentos * aumento;
}

// Reconoce una regla final como:
//
// {
//   "aumento": 1,
//   "cadaNiveles": 2
// }
function esReglaEscalado(valor) {
  return (
    esObjetoConfiguracion(valor) &&
    (Object.prototype.hasOwnProperty.call(valor, "aumento") ||
      Object.prototype.hasOwnProperty.call(valor, "cadaNiveles"))
  );
}

// Aplica reglas de escalado de forma recursiva.
//
// Esto permite escalar:
//
// - Atributos.
// - Estadísticas base.
// - Ataques naturales.
// - Resistencias.
// - Configuración de IA.
function aplicarReglasEscalado(destino, reglas, nivel, ruta = "") {
  if (reglas === undefined) {
    return;
  }

  if (!esObjetoConfiguracion(destino) || !esObjetoConfiguracion(reglas)) {
    throw new Error(`El escalado de "${ruta || "enemigo"}" no es válido.`);
  }

  for (const [campo, regla] of Object.entries(reglas)) {
    const rutaCampo = ruta ? `${ruta}.${campo}` : campo;

    if (esReglaEscalado(regla)) {
      if (!Number.isFinite(destino[campo])) {
        throw new Error(
          `No se puede escalar "${rutaCampo}" porque no es numérico.`,
        );
      }

      destino[campo] = calcularValorEscalado(destino[campo], regla, nivel);

      continue;
    }

    aplicarReglasEscalado(destino[campo], regla, nivel, rutaCampo);
  }
}

// Fusiona cambios de un hito sin eliminar
// otras propiedades de la sección.
function fusionarConfiguracion(destino, cambios) {
  for (const [campo, valor] of Object.entries(cambios)) {
    if (esObjetoConfiguracion(valor) && esObjetoConfiguracion(destino[campo])) {
      fusionarConfiguracion(destino[campo], valor);

      continue;
    }

    destino[campo] = clonarConfiguracion(valor);
  }
}

// Aplica los hitos alcanzados por nivel.
function aplicarHitos(datos, hitos, nivel) {
  if (!Array.isArray(hitos)) {
    return;
  }

  const hitosOrdenados = [...hitos].sort(
    (hitoA, hitoB) => hitoA.nivel - hitoB.nivel,
  );

  for (const hito of hitosOrdenados) {
    if (!Number.isInteger(hito.nivel) || hito.nivel < 1) {
      throw new Error("Existe un hito de enemigo con nivel inválido.");
    }

    if (nivel < hito.nivel) {
      continue;
    }

    const cambios = hito.cambios ?? {};

    if (cambios.atributos) {
      fusionarConfiguracion(datos.atributos, cambios.atributos);
    }

    if (cambios.estadisticasBase) {
      fusionarConfiguracion(datos.estadisticasBase, cambios.estadisticasBase);
    }

    if (cambios.ataqueNatural) {
      fusionarConfiguracion(datos.ataqueNatural, cambios.ataqueNatural);
    }

    if (cambios.ia) {
      fusionarConfiguracion(datos.configuracionIA, cambios.ia);
    }

    if (cambios.experienciaOtorgada !== undefined) {
      datos.experienciaOtorgada = cambios.experienciaOtorgada;
    }
  }
}

function obtenerMultiplicador(variante, campo) {
  const valor = variante[campo] ?? 1;

  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error(`El multiplicador "${campo}" de la variante no es válido.`);
  }

  return valor;
}

function aplicarMultiplicadorEntero(valor, multiplicador, minimo) {
  return Math.max(minimo, Math.round(valor * multiplicador));
}

// Aplica Enfermo, Gigante o Élite.
//
// El multiplicador de Vida se incorpora a la
// estadística base para que EstadisticasDerivadas
// continúe siendo la fuente real de Vida máxima.
function aplicarVariante(datos, variante) {
  const multiplicadorAtributos = obtenerMultiplicador(
    variante,
    "multiplicadorAtributos",
  );

  const multiplicadorVida = obtenerMultiplicador(variante, "multiplicadorVida");

  const multiplicadorExperiencia = obtenerMultiplicador(
    variante,
    "multiplicadorExperiencia",
  );

  for (const atributo of Object.keys(datos.atributos)) {
    datos.atributos[atributo] = aplicarMultiplicadorEntero(
      datos.atributos[atributo],
      multiplicadorAtributos,
      1,
    );
  }

  // La Vida máxima se calcula como:
  //
  // vida base
  // + Vida por nivel
  // + aporte de Constitución.
  //
  // Ajustamos la base para multiplicar el resultado
  // completo sin escribir directamente vidaMaxima.
  const aporteConstitucion =
    CONFIGURACION_COMBATE.atributos.vidaPorConstitucion *
    datos.atributos.constitucion;

  datos.estadisticasBase.vida =
    datos.estadisticasBase.vida * multiplicadorVida +
    aporteConstitucion * (multiplicadorVida - 1);

  datos.estadisticasBase.vidaPorNivel *= multiplicadorVida;

  datos.experienciaOtorgada = aplicarMultiplicadorEntero(
    datos.experienciaOtorgada,
    multiplicadorExperiencia,
    0,
  );
}

function validarPlantilla(plantilla, idPlantilla) {
  if (!esObjetoConfiguracion(plantilla.baseNivel1)) {
    throw new Error(`La plantilla "${idPlantilla}" necesita baseNivel1.`);
  }

  const base = plantilla.baseNivel1;

  if (!esObjetoConfiguracion(base.atributos)) {
    throw new Error(`La plantilla "${idPlantilla}" necesita atributos.`);
  }

  if (!esObjetoConfiguracion(base.estadisticasBase)) {
    throw new Error(
      `La plantilla "${idPlantilla}" necesita estadísticas base.`,
    );
  }

  if (!esObjetoConfiguracion(base.ataqueNatural)) {
    throw new Error(
      `La plantilla "${idPlantilla}" necesita un ataque natural.`,
    );
  }

  if (!esObjetoConfiguracion(plantilla.ia)) {
    throw new Error(
      `La plantilla "${idPlantilla}" necesita configuración de IA.`,
    );
  }
}

// Calcula todos los datos finales sin crear
// todavía la instancia de Enemigo.
export function calcularDatosEnemigo({
  configuracionEnemigos,
  idPlantilla,
  nivel = 1,
  idVariante = null,
} = {}) {
  if (!esObjetoConfiguracion(configuracionEnemigos)) {
    throw new Error("Se necesita la configuración de enemigos.");
  }

  const { plantillas, variantes } = configuracionEnemigos;

  const plantilla = plantillas?.[idPlantilla];

  if (!plantilla) {
    throw new Error(`No existe la plantilla de enemigo "${idPlantilla}".`);
  }

  validarPlantilla(plantilla, idPlantilla);

  if (!Number.isInteger(nivel)) {
    throw new Error("El nivel del enemigo debe ser un entero.");
  }

  const nivelMinimo = plantilla.nivelesPermitidos?.minimo;

  const nivelMaximo = plantilla.nivelesPermitidos?.maximo;

  if (
    !Number.isInteger(nivelMinimo) ||
    !Number.isInteger(nivelMaximo) ||
    nivel < nivelMinimo ||
    nivel > nivelMaximo
  ) {
    throw new Error(
      `${plantilla.nombre} solamente permite ` +
        `niveles entre ${nivelMinimo} y ${nivelMaximo}.`,
    );
  }

  const base = plantilla.baseNivel1;

  const contenedor = plantilla.contenedor ?? {};

  const equipamiento = plantilla.equipamiento ?? {};

  const datos = {
    nombre: plantilla.nombre,

    nivel,

    simbolo: plantilla.simbolo,

    atributos: clonarConfiguracion(base.atributos),

    estadisticasBase: clonarConfiguracion(base.estadisticasBase),

    ataqueNatural: clonarConfiguracion(base.ataqueNatural),

    experienciaOtorgada: base.experienciaOtorgada,

    capacidadContenedor: contenedor.capacidad ?? 0,

    // Estas definiciones se convertirán
    // en objetos reales al crear la instancia.
    objetosIniciales: clonarConfiguracion(contenedor.objetosIniciales ?? []),

    ranurasEquipamiento: clonarConfiguracion(equipamiento.ranuras ?? []),

    equipamientoInicial: clonarConfiguracion(
      equipamiento.objetosIniciales ?? [],
    ),

    // El botín continúa fuera de este hito.
    tablaBotin: clonarConfiguracion(plantilla.tablaBotin ?? []),

    configuracionIA: clonarConfiguracion(plantilla.ia),
  };

  const escalado = plantilla.escalado ?? {};

  if (escalado.experienciaOtorgada) {
    datos.experienciaOtorgada = calcularValorEscalado(
      datos.experienciaOtorgada,
      escalado.experienciaOtorgada,
      nivel,
    );
  }

  aplicarReglasEscalado(
    datos.atributos,
    escalado.atributos,
    nivel,
    "atributos",
  );

  aplicarReglasEscalado(
    datos.estadisticasBase,
    escalado.estadisticasBase,
    nivel,
    "estadisticasBase",
  );

  aplicarReglasEscalado(
    datos.ataqueNatural,
    escalado.ataqueNatural,
    nivel,
    "ataqueNatural",
  );

  aplicarReglasEscalado(datos.configuracionIA, escalado.ia, nivel, "ia");

  aplicarHitos(datos, plantilla.hitos, nivel);

  if (idVariante !== null) {
    const variante = variantes?.[idVariante];

    if (!variante) {
      throw new Error(`No existe la variante "${idVariante}".`);
    }

    aplicarVariante(datos, variante);

    const genero = plantilla.genero ?? "masculino";

    const nombreVariante = variante.nombreSegunGenero?.[genero];

    if (!nombreVariante) {
      throw new Error(
        `La variante "${idVariante}" no tiene nombre ` +
          `para el género "${genero}".`,
      );
    }

    datos.nombre += ` ${nombreVariante.toLocaleLowerCase("es")}`;
  }

  return datos;
}

// Crea la instancia real y convierte los IDs
// de inventario y equipamiento en objetos.
export function crearEnemigo({
  configuracionEnemigos,
  configuracionObjetos,
  idPlantilla,
  nivel = 1,
  idVariante = null,
  x = 0,
  y = 0,
} = {}) {
  const datos = calcularDatosEnemigo({
    configuracionEnemigos,
    idPlantilla,
    nivel,
    idVariante,
  });

  const objetosIniciales = crearObjetosDesdeDefiniciones({
    configuracionObjetos,

    definiciones: datos.objetosIniciales,
  });

  const equipamientoInicial = crearObjetosDesdeDefiniciones({
    configuracionObjetos,

    definiciones: datos.equipamientoInicial,
  });

  return new Enemigo({
    ...datos,
    x,
    y,
    objetosIniciales,
    equipamientoInicial,
  });
}
