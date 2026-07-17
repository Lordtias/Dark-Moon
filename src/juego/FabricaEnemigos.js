import { Enemigo } from "../entidad/destructible/combatiente/Enemigo.js";

// Esta fábrica mantiene temporalmente
// la compatibilidad con Enemigos.json.
//
// Las clases centrales reciben únicamente
// el modelo nuevo.
function calcularValorEscalado(valorBase, regla, nivel) {
  if (regla === undefined) {
    return valorBase;
  }

  const { aumento, cadaNiveles } = regla;

  if (
    typeof aumento !== "number" ||
    !Number.isInteger(cadaNiveles) ||
    cadaNiveles <= 0
  ) {
    throw new Error("Existe una regla de escalado de enemigos inválida.");
  }

  const cantidadAumentos = Math.floor((nivel - 1) / cadaNiveles);

  return valorBase + cantidadAumentos * aumento;
}

function aplicarHitos(datos, hitos, nivel) {
  if (!Array.isArray(hitos)) {
    return;
  }

  const hitosOrdenados = [...hitos].sort(
    (hitoA, hitoB) => hitoA.nivel - hitoB.nivel,
  );

  for (const hito of hitosOrdenados) {
    if (nivel < hito.nivel) {
      continue;
    }

    const cambios = hito.cambios ?? {};

    if (cambios.atributos && typeof cambios.atributos === "object") {
      datos.atributos = {
        ...datos.atributos,
        ...cambios.atributos,
      };
    }

    if (cambios.ia && typeof cambios.ia === "object") {
      datos.configuracionIA = {
        ...datos.configuracionIA,
        ...cambios.ia,
      };
    }

    // Estos campos antiguos solamente
    // existen dentro del adaptador.
    const camposCompatibles = [
      "vidaMaxima",
      "dadoDanio",
      "atributoAtaque",
      "bonificadorArmadura",
      "experienciaOtorgada",
    ];

    for (const campo of camposCompatibles) {
      if (cambios[campo] !== undefined) {
        datos[campo] = cambios[campo];
      }
    }
  }
}

function aplicarMultiplicador(valor, multiplicador, minimo) {
  return Math.max(
    minimo,

    Math.round(valor * multiplicador),
  );
}

function aplicarVariante(datos, variante) {
  const multiplicadorAtributos = variante.multiplicadorAtributos ?? 1;

  for (const atributo of Object.keys(datos.atributos)) {
    datos.atributos[atributo] = aplicarMultiplicador(
      datos.atributos[atributo],

      multiplicadorAtributos,

      1,
    );
  }

  datos.vidaMaxima = aplicarMultiplicador(
    datos.vidaMaxima,

    variante.multiplicadorVida ?? 1,

    1,
  );

  datos.experienciaOtorgada = aplicarMultiplicador(
    datos.experienciaOtorgada,

    variante.multiplicadorExperiencia ?? 1,

    0,
  );
}

// Convierte el modelo antiguo del JSON
// al nuevo modelo de Combatiente.
function adaptarDatosEnemigo(datos) {
  const constitucion = datos.atributos.constitucion;

  const inteligencia = datos.atributos.inteligencia;

  return {
    nombre: datos.nombre,

    nivel: datos.nivel,

    simbolo: datos.simbolo,

    atributos: {
      ...datos.atributos,
    },

    estadisticasBase: {
      // Compensamos el aporte de atributos
      // para conservar aproximadamente la
      // Vida configurada en Enemigos.json.
      vida: datos.vidaMaxima - 5 * constitucion,

      // Los enemigos actuales comienzan
      // sin reserva de Maná.
      mana: -4 * inteligencia,

      vidaPorNivel: 0,
      manaPorNivel: 0,

      precision: 10,
      evasion: 5,

      armadura: Math.max(
        0,

        datos.bonificadorArmadura ?? 0,
      ),

      regeneracionVida: 0,
      regeneracionMana: 0,

      probabilidadCritico: 5,
      multiplicadorCritico: 1.5,

      probabilidadBloqueo: 0,

      potenciaEfectos: 0,
      resistenciaMental: 0,
      potenciaAura: 0,

      resistencias: {
        fuego: 0,
        frio: 0,
        rayo: 0,
        veneno: 0,
      },
    },

    ataqueNatural: {
      // El antiguo d4 se adapta
      // temporalmente como rango 1-4.
      danioFisicoMinimo: 1,

      danioFisicoMaximo: Math.max(1, datos.dadoDanio),

      atributoAtaque: datos.atributoAtaque,

      precision: 0,

      alcance: datos.configuracionIA.rangoAtaque,

      tipoAtaque: "cuerpoACuerpo",

      probabilidadCritico: 5,
      multiplicadorCritico: 1.5,
    },

    experienciaOtorgada: datos.experienciaOtorgada,

    capacidadContenedor: datos.capacidadContenedor,

    objetosIniciales: [...datos.objetosIniciales],

    tablaBotin: datos.tablaBotin.map((entrada) => ({
      ...entrada,
    })),

    ranurasEquipamiento: [...datos.ranurasEquipamiento],

    equipamientoInicial: [...datos.equipamientoInicial],

    configuracionIA: {
      ...datos.configuracionIA,
    },
  };
}

// Calcula todavía el modelo anterior
// porque Enemigos.json no se migrará
// hasta terminar las reglas de combate.
export function calcularDatosEnemigo({
  configuracionEnemigos,
  idPlantilla,
  nivel = 1,
  idVariante = null,
} = {}) {
  if (!configuracionEnemigos || typeof configuracionEnemigos !== "object") {
    throw new Error("Se necesita la configuración de enemigos.");
  }

  const { plantillas, variantes } = configuracionEnemigos;

  const plantilla = plantillas?.[idPlantilla];

  if (!plantilla) {
    throw new Error(`No existe la plantilla de enemigo "${idPlantilla}".`);
  }

  if (!Number.isInteger(nivel)) {
    throw new Error("El nivel del enemigo debe ser un entero.");
  }

  const nivelMinimo = plantilla.nivelesPermitidos.minimo;

  const nivelMaximo = plantilla.nivelesPermitidos.maximo;

  if (nivel < nivelMinimo || nivel > nivelMaximo) {
    throw new Error(
      `${plantilla.nombre} solamente permite ` +
        `niveles entre ${nivelMinimo} y ` +
        `${nivelMaximo}.`,
    );
  }

  const base = plantilla.baseNivel1;

  const escalado = plantilla.escalado ?? {};

  const configuracionIA = plantilla.ia;

  const contenedor = plantilla.contenedor ?? {};

  const equipamiento = plantilla.equipamiento ?? {};

  if (!configuracionIA || typeof configuracionIA !== "object") {
    throw new Error(
      `La plantilla "${idPlantilla}" ` + "necesita configuración de IA.",
    );
  }

  const datos = {
    nombre: plantilla.nombre,

    nivel,

    simbolo: plantilla.simbolo,

    vidaMaxima: base.vidaMaxima,

    dadoDanio: base.dadoDanio,

    atributoAtaque: base.atributoAtaque,

    bonificadorArmadura: base.bonificadorArmadura ?? 0,

    experienciaOtorgada: base.experienciaOtorgada,

    atributos: {
      ...base.atributos,
    },

    capacidadContenedor: contenedor.capacidad ?? 0,

    objetosIniciales: [...(contenedor.objetosIniciales ?? [])],

    ranurasEquipamiento: [...(equipamiento.ranuras ?? [])],

    equipamientoInicial: [...(equipamiento.objetosIniciales ?? [])],

    tablaBotin: (plantilla.tablaBotin ?? []).map((entrada) => ({
      ...entrada,
    })),

    configuracionIA: {
      ...configuracionIA,
    },
  };

  datos.vidaMaxima = calcularValorEscalado(
    datos.vidaMaxima,

    escalado.vidaMaxima,

    nivel,
  );

  datos.experienciaOtorgada = calcularValorEscalado(
    datos.experienciaOtorgada,

    escalado.experienciaOtorgada,

    nivel,
  );

  datos.bonificadorArmadura = calcularValorEscalado(
    datos.bonificadorArmadura,

    escalado.bonificadorArmadura,

    nivel,
  );

  const escaladoAtributos = escalado.atributos ?? {};

  for (const atributo of Object.keys(datos.atributos)) {
    datos.atributos[atributo] = calcularValorEscalado(
      datos.atributos[atributo],

      escaladoAtributos[atributo],

      nivel,
    );
  }

  const escaladoIA = escalado.ia ?? {};

  const camposIA = [
    "percepcion",
    "margenPersecucion",
    "rangoAtaque",
    "movimientosPorTurno",
  ];

  for (const campo of camposIA) {
    if (datos.configuracionIA[campo] === undefined) {
      continue;
    }

    datos.configuracionIA[campo] = calcularValorEscalado(
      datos.configuracionIA[campo],

      escaladoIA[campo],

      nivel,
    );
  }

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
        `La variante "${idVariante}" no tiene ` +
          `nombre para el género "${genero}".`,
      );
    }

    datos.nombre += ` ${nombreVariante.toLocaleLowerCase("es")}`;
  }

  return datos;
}

export function crearEnemigo({
  configuracionEnemigos,
  idPlantilla,
  nivel = 1,
  idVariante = null,
  x = 0,
  y = 0,
} = {}) {
  const datosAntiguos = calcularDatosEnemigo({
    configuracionEnemigos,
    idPlantilla,
    nivel,
    idVariante,
  });

  const datosNuevos = adaptarDatosEnemigo(datosAntiguos);

  return new Enemigo({
    ...datosNuevos,
    x,
    y,
  });
}
