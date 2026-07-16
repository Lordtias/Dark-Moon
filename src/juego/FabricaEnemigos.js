// Importamos la clase genérica Enemigo.
// La fábrica calculará sus estadísticas antes de crearla.
import {
  Enemigo
} from "../entidad/destructible/combatiente/Enemigo.js";

/**
 * Calcula el valor de una estadística según
 * su regla de escalado y el nivel solicitado.
 *
 * Ejemplo:
 * - Valor base: 10
 * - Aumento: 1
 * - Cada niveles: 2
 * - Nivel solicitado: 5
 *
 * Resultado:
 * 10 + 2 aumentos = 12
 *
 * @param {number} valorBase Valor de nivel 1.
 * @param {Object|undefined} regla Regla configurada en el JSON.
 * @param {number} nivel Nivel solicitado.
 * @returns {number} Valor escalado.
 */
function calcularValorEscalado(
  valorBase,
  regla,
  nivel
) {
  // Si no existe una regla para esta estadística,
  // conservamos su valor base.
  if (regla === undefined) {
    return valorBase;
  }

  const {
    aumento,
    cadaNiveles
  } = regla;

  // Validamos la regla para evitar cálculos incorrectos
  // o divisiones entre cero.
  if (
    typeof aumento !== "number" ||
    !Number.isInteger(cadaNiveles) ||
    cadaNiveles <= 0
  ) {
    throw new Error(
      "Existe una regla de escalado inválida."
    );
  }

  // El nivel 1 utiliza siempre el valor base.
  // Por eso restamos uno antes de calcular
  // cuántos aumentos se alcanzaron.
  const cantidadAumentos =
    Math.floor(
      (nivel - 1) / cadaNiveles
    );

  return (
    valorBase +
    cantidadAumentos * aumento
  );
}

/**
 * Aplica al enemigo todos los hitos alcanzados.
 *
 * Por ejemplo, una rata de nivel 5 puede cambiar
 * su dado de daño de 1d4 a 1d6.
 *
 * @param {Object} estadisticas Estadísticas actuales.
 * @param {Array<Object>} hitos Hitos configurados.
 * @param {number} nivel Nivel solicitado.
 */
function aplicarHitos(
  estadisticas,
  hitos,
  nivel
) {
  // Si la plantilla no tiene hitos,
  // no necesitamos realizar ningún cambio.
  if (!Array.isArray(hitos)) {
    return;
  }

  // Ordenamos una copia para garantizar que los hitos
  // se apliquen desde el nivel más bajo al más alto.
  const hitosOrdenados =
    [...hitos].sort(
      (hitoA, hitoB) =>
        hitoA.nivel - hitoB.nivel
    );

  hitosOrdenados.forEach((hito) => {
    // Ignoramos los hitos que todavía
    // no fueron alcanzados.
    if (nivel < hito.nivel) {
      return;
    }

    const cambios =
      hito.cambios ?? {};

    // Permitimos que un hito modifique atributos
    // concretos sin reemplazar los demás.
    if (
      cambios.atributos &&
      typeof cambios.atributos === "object"
    ) {
      estadisticas.atributos = {
        ...estadisticas.atributos,
        ...cambios.atributos
      };
    }

    // Un hito también puede reemplazar valores
    // concretos de la configuración de IA.
    //
    // Ejemplo futuro:
    // Al nivel 5, aumentar movimientosPorTurno.
    if (
      cambios.ia &&
      typeof cambios.ia === "object"
    ) {
      estadisticas.configuracionIA = {
        ...estadisticas.configuracionIA,
        ...cambios.ia
      };
    }

    // Estos son los campos generales que un hito
    // puede reemplazar actualmente.
    const camposPermitidos = [
      "vidaMaxima",
      "dadoDanio",
      "atributoAtaque",
      "bonificadorArmadura",
      "experienciaOtorgada"
    ];

    camposPermitidos.forEach((campo) => {
      if (cambios[campo] !== undefined) {
        estadisticas[campo] =
          cambios[campo];
      }
    });
  });
}

/**
 * Multiplica un valor y devuelve un número entero.
 *
 * @param {number} valor Valor original.
 * @param {number} multiplicador Multiplicador aplicado.
 * @param {number} minimo Valor mínimo permitido.
 * @returns {number} Resultado redondeado.
 */
function aplicarMultiplicador(
  valor,
  multiplicador,
  minimo
) {
  return Math.max(
    minimo,
    Math.round(
      valor * multiplicador
    )
  );
}

/**
 * Aplica una variante sobre las estadísticas finales.
 *
 * La variante se aplica después del escalado y los hitos.
 *
 * @param {Object} estadisticas Estadísticas calculadas.
 * @param {Object} variante Configuración de la variante.
 */
function aplicarVariante(
  estadisticas,
  variante
) {
  const multiplicadorAtributos =
    variante.multiplicadorAtributos ?? 1;

  const multiplicadorVida =
    variante.multiplicadorVida ?? 1;

  const multiplicadorExperiencia =
    variante.multiplicadorExperiencia ?? 1;

  // Aplicamos el multiplicador general a todos
  // los atributos del enemigo.
  Object.keys(
    estadisticas.atributos
  ).forEach((idAtributo) => {
    estadisticas.atributos[idAtributo] =
      aplicarMultiplicador(
        estadisticas.atributos[idAtributo],
        multiplicadorAtributos,

        // Ningún atributo puede quedar por debajo de 1.
        1
      );
  });

  // La vida máxima tampoco puede ser menor que 1.
  estadisticas.vidaMaxima =
    aplicarMultiplicador(
      estadisticas.vidaMaxima,
      multiplicadorVida,
      1
    );

  // La experiencia sí puede quedar en cero.
  estadisticas.experienciaOtorgada =
    aplicarMultiplicador(
      estadisticas.experienciaOtorgada,
      multiplicadorExperiencia,
      0
    );
}

/**
 * Calcula las estadísticas finales de un enemigo
 * sin crear todavía la instancia de Enemigo.
 *
 * Exportamos esta función porque será útil para:
 * - Realizar pruebas.
 * - Mostrar información previa.
 * - Comparar niveles y variantes.
 *
 * @param {Object} opciones Opciones de generación.
 * @param {Object} opciones.configuracionEnemigos
 * Plantillas y variantes cargadas desde JSON.
 * @param {string} opciones.idPlantilla Id de la plantilla.
 * @param {number} opciones.nivel Nivel solicitado.
 * @param {string|null} opciones.idVariante Variante opcional.
 * @returns {Object} Datos finales del enemigo.
 */
export function calcularDatosEnemigo({
  configuracionEnemigos,
  idPlantilla,
  nivel = 1,
  idVariante = null
}) {
  // Validamos que se haya recibido la configuración
  // cargada desde los archivos JSON.
  if (
    configuracionEnemigos === null ||
    typeof configuracionEnemigos !== "object"
  ) {
    throw new Error(
      "Se necesita la configuración de enemigos."
    );
  }

  const {
    plantillas,
    variantes
  } = configuracionEnemigos;

  // Buscamos la plantilla solicitada.
  const plantilla =
    plantillas[idPlantilla];

  if (!plantilla) {
    throw new Error(
      `No existe la plantilla de enemigo "${idPlantilla}".`
    );
  }

  // El nivel debe ser un número entero.
  if (!Number.isInteger(nivel)) {
    throw new Error(
      "El nivel del enemigo debe ser un número entero."
    );
  }

  const nivelMinimo =
    plantilla.nivelesPermitidos.minimo;

  const nivelMaximo =
    plantilla.nivelesPermitidos.maximo;

  // Evitamos crear enemigos fuera del rango
  // establecido por la plantilla.
  if (
    nivel < nivelMinimo ||
    nivel > nivelMaximo
  ) {
    throw new Error(
      `${plantilla.nombre} solamente permite niveles ` +
      `entre ${nivelMinimo} y ${nivelMaximo}.`
    );
  }

  const base =
    plantilla.baseNivel1;

  const escalado =
    plantilla.escalado ?? {};

  // La IA forma parte obligatoria de cada
  // plantilla de enemigo.
  const configuracionIABase =
    plantilla.ia;

    // Configuración opcional del contenedor.
    //
    // Una criatura sin inventario utiliza capacidad 0.
    const configuracionContenedor =
        plantilla.contenedor ?? {};

    // Configuración opcional del equipamiento.
    const configuracionEquipamiento =
        plantilla.equipamiento ?? {};

  // Validamos que la plantilla tenga al menos
  // un objeto de configuración de IA.
  //
  // Las validaciones específicas de sus campos
  // también serán realizadas por Enemigo.
  if (
    configuracionIABase === null ||
    typeof configuracionIABase !== "object" ||
    Array.isArray(configuracionIABase)
  ) {
    throw new Error(
      `La plantilla "${idPlantilla}" necesita ` +
      "una configuración de IA."
    );
  }

  const estadisticas = {
    vidaMaxima:
      base.vidaMaxima,

    dadoDanio:
      base.dadoDanio,

    atributoAtaque:
      base.atributoAtaque,

    bonificadorArmadura:
      base.bonificadorArmadura ?? 0,

    experienciaOtorgada:
      base.experienciaOtorgada,

    // Capacidad para almacenar objetos.
    capacidadContenedor:
        configuracionContenedor.capacidad ?? 0,

    // Objetos que ya contiene al aparecer.
    objetosIniciales: [
        ...(
            configuracionContenedor
                .objetosIniciales ?? []
        )
    ],

    // Posiciones de equipamiento disponibles.
    ranurasEquipamiento: [
        ...(
            configuracionEquipamiento
                .ranuras ?? []
        )
    ],

    // Por ahora conservamos los identificadores.
    //
    // En el próximo paso FabricaObjetos los convertirá
    // en instancias reales antes de crear al enemigo.
    equipamientoInicial: [
        ...(
            configuracionEquipamiento
                .objetosIniciales ?? []
        )
    ],

    // Posibles objetos generados al derrotarlo.
    //
    // Todavía solamente almacenamos la configuración;
    // el generador de botín vendrá después.
    tablaBotin: (
        plantilla.tablaBotin ?? []
    ).map(
        (entrada) => ({
            ...entrada
        })
    ),

    atributos: {
      ...base.atributos
    },

    // Guardamos una copia independiente de la IA.
    //
    // Así el escalado de una rata concreta no modifica
    // la plantilla original cargada desde el JSON.
    configuracionIA: {
      ...configuracionIABase
    }
  };

  // Escalamos la vida máxima.
  estadisticas.vidaMaxima =
    calcularValorEscalado(
      estadisticas.vidaMaxima,
      escalado.vidaMaxima,
      nivel
    );

  // Escalamos la experiencia entregada.
  estadisticas.experienciaOtorgada =
    calcularValorEscalado(
      estadisticas.experienciaOtorgada,
      escalado.experienciaOtorgada,
      nivel
    );

  // Permitimos escalar la armadura en futuras plantillas,
  // aunque la rata actual no utilice esta opción.
  estadisticas.bonificadorArmadura =
    calcularValorEscalado(
      estadisticas.bonificadorArmadura,
      escalado.bonificadorArmadura,
      nivel
    );

  // Aplicamos el escalado individual
  // configurado para cada atributo.
  const escaladoAtributos =
    escalado.atributos ?? {};

  Object.keys(
    estadisticas.atributos
  ).forEach((idAtributo) => {
    estadisticas.atributos[idAtributo] =
      calcularValorEscalado(
        estadisticas.atributos[idAtributo],
        escaladoAtributos[idAtributo],
        nivel
      );
  });

  // Obtenemos las reglas de escalado de IA.
  const escaladoIA =
    escalado.ia ?? {};

  // Estos son los valores numéricos de IA que podrían
  // escalar en futuras plantillas.
  //
  // Actualmente la rata solo escala percepción,
  // pero la fábrica queda preparada para los demás.
  const camposIAEscalables = [
    "percepcion",
    "margenPersecucion",
    "rangoAtaque",
    "movimientosPorTurno"
  ];

  camposIAEscalables.forEach((campoIA) => {
    // Si la plantilla no tiene este campo,
    // no intentamos calcularlo.
    if (
      estadisticas.configuracionIA[campoIA] ===
      undefined
    ) {
      return;
    }

    estadisticas.configuracionIA[campoIA] =
      calcularValorEscalado(
        estadisticas.configuracionIA[campoIA],

        // Si el campo no tiene una regla,
        // calcularValorEscalado conserva su valor base.
        escaladoIA[campoIA],

        nivel
      );
  });

  // Aplicamos cambios especiales por nivel,
  // como cambiar el dado de daño.
  aplicarHitos(
    estadisticas,
    plantilla.hitos,
    nivel
  );

  let nombreFinal =
    plantilla.nombre;

  // La variante es opcional.
  if (idVariante !== null) {
    const variante =
      variantes[idVariante];

    if (!variante) {
      throw new Error(
        `No existe la variante "${idVariante}".`
      );
    }

    // Aplicamos sus multiplicadores.
    aplicarVariante(
      estadisticas,
      variante
    );

    // Elegimos el nombre de la variante
    // según el género de la plantilla.
    const genero =
      plantilla.genero ?? "masculino";

    const nombreVariante =
      variante.nombreSegunGenero[genero];

    if (!nombreVariante) {
      throw new Error(
        `La variante "${idVariante}" no tiene ` +
        `un nombre para el género "${genero}".`
      );
    }

    // Ejemplos:
    // "Rata enferma", "Rata gigante", "Rata élite".
    nombreFinal +=
      ` ${nombreVariante.toLocaleLowerCase("es")}`;
  }

  return {
    nombre: nombreFinal,
    nivel,
    simbolo: plantilla.simbolo,
    ...estadisticas
  };
}

/**
 * Crea una instancia real de Enemigo utilizando
 * una plantilla, nivel, variante y posición.
 *
 * @param {Object} opciones Opciones de generación.
 * @param {Object} opciones.configuracionEnemigos
 * Configuración cargada desde JSON.
 * @param {string} opciones.idPlantilla Plantilla utilizada.
 * @param {number} opciones.nivel Nivel solicitado.
 * @param {string|null} opciones.idVariante Variante opcional.
 * @param {number} opciones.x Posición horizontal.
 * @param {number} opciones.y Posición vertical.
 * @returns {Enemigo} Enemigo completamente creado.
 */
export function crearEnemigo({
  configuracionEnemigos,
  idPlantilla,
  nivel = 1,
  idVariante = null,
  x = 0,
  y = 0
}) {
  // Primero calculamos todas las estadísticas finales.
  const datosEnemigo =
    calcularDatosEnemigo({
      configuracionEnemigos,
      idPlantilla,
      nivel,
      idVariante
    });

  // Después creamos la instancia real.
  return new Enemigo({
    ...datosEnemigo,
    x,
    y
  });
}