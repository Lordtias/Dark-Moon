import { obtenerConfiguracionAtaque } from "../../entidad/destructible/combatiente/ConfiguracionAtaque.js";
import * as ComponentesDanio from "../combate/ComponentesDanio.js";
import * as AtributosMagicos from "../magia/CalculadorAtributosMagicos.js";
import { crearContextoCatalizador } from "../magia/SistemaCatalizadores.js";

const CONTEXTO_CATALIZADOR_NEUTRO = Object.freeze({
  potenciaHabilidad: 0,
  multiplicadorHabilidad: 1,
  tieneCatalizador: false,
});

// Adapta la configuración común de habilidades al motor elemental existente.
// Los alias de propiedades permiten conservar compatibilidad entre las etapas
// sin duplicar la resolución de resistencias.
export function resolverDanioHabilidad({
  lanzador,
  objetivo,
  componentesConfigurados,
  idEjecucion,
  aplicarEscaladoMagico = true,
  aplicarCatalizador = true,
} = {}) {
  if (!lanzador || !objetivo) {
    throw new Error("El daño de habilidad necesita lanzador y objetivo.");
  }

  const multiplicadorAtributos = aplicarEscaladoMagico
    ? obtenerMultiplicadorDanioMagico(lanzador)
    : 1;
  const contextoCatalizador = aplicarCatalizador
    ? obtenerContextoCatalizadorHabilidad(lanzador)
    : CONTEXTO_CATALIZADOR_NEUTRO;
  const multiplicador =
    multiplicadorAtributos * contextoCatalizador.multiplicadorHabilidad;

  const componentes = componentesConfigurados.map((componente) => {
    const valorEscalado = escalarDanioMagico(
      componente.valorBase,
      multiplicador,
      lanzador,
    );
    return {
      tipo: componente.tipo,
      tipoDanio: componente.tipo,
      categoria: componente.tipo,
      valorBase: componente.valorBase,
      valor: valorEscalado,
      cantidad: valorEscalado,
      danio: valorEscalado,
      daño: valorEscalado,
    };
  });
  const vidaAntes = leerVidaActual(objetivo);
  const resolucion = invocarMotorElemental({
    lanzador,
    objetivo,
    componentes,
    idEjecucion,
  });
  const vidaDespuesDeResolver = leerVidaActual(objetivo);
  const motorAplicoDanio =
    Number.isFinite(vidaAntes) &&
    Number.isFinite(vidaDespuesDeResolver) &&
    vidaDespuesDeResolver < vidaAntes;

  const danioFinal = extraerDanioFinal(resolucion, componentes);
  let aplicacion = null;
  if (!motorAplicoDanio && danioFinal > 0) {
    aplicacion = aplicarDanioFinal(objetivo, danioFinal, {
      tipoDanio: componentes[0]?.tipo ?? "veneno",
      idEjecucion,
      fuente: lanzador,
    });
  }

  return {
    multiplicadorDanioMagico: multiplicador,
    multiplicadorAtributosMagicos: multiplicadorAtributos,
    multiplicadorCatalizador: contextoCatalizador.multiplicadorHabilidad,
    potenciaHabilidad: contextoCatalizador.potenciaHabilidad,
    componentes,
    resolucion,
    danioFinal,
    aplicacion,
    objetivoDerrotado: estaDerrotado(objetivo),
  };
}

export function obtenerContextoCatalizadorHabilidad(lanzador) {
  // Mantiene compatibles las pruebas y consumidores de ETAPA 5 que construyen
  // lanzadores mínimos sin equipamiento real.
  if (!lanzador?.equipamiento) {
    return CONTEXTO_CATALIZADOR_NEUTRO;
  }

  const configuracion = obtenerConfiguracionAtaque(lanzador, {
    // Una habilidad no deja de aprovechar el catalizador equipado por haber
    // activado temporalmente el ataque natural de respaldo.
    ignorarAtaqueNaturalForzado: true,
  });
  return crearContextoCatalizador({
    fuentes: configuracion.fuentesDanio,
  });
}

export function obtenerMultiplicadorDanioMagico(lanzador) {
  const funcion = AtributosMagicos.calcularMultiplicadorDanioMagico;
  if (typeof funcion !== "function") {
    return 1;
  }

  const atributos = leerAtributosMagicos(lanzador);
  return primerNumeroPositivo(
    [
      // Firma real vigente desde ETAPA 3.
      () => funcion(atributos),
      // Adaptadores conservados para implementaciones compatibles anteriores.
      () => funcion(lanzador),
      () => funcion({ combatiente: lanzador }),
      () => funcion({ jugador: lanzador }),
    ],
    1,
  );
}

export function obtenerMultiplicadorEfectos(lanzador) {
  const funcion = AtributosMagicos.calcularMultiplicadorEfectos;
  if (typeof funcion !== "function") {
    return 1;
  }

  const atributos = leerAtributosMagicos(lanzador);
  return primerNumeroPositivo(
    [
      // Firma real vigente desde ETAPA 3.
      () => funcion(atributos),
      // Adaptadores conservados para implementaciones compatibles anteriores.
      () => funcion(lanzador),
      () => funcion({ combatiente: lanzador }),
      () => funcion({ jugador: lanzador }),
    ],
    1,
  );
}

function escalarDanioMagico(valorBase, multiplicador, lanzador) {
  const funcion = AtributosMagicos.escalarDanioMagico;
  if (typeof funcion === "function") {
    const resultado = primerNumeroNoNegativo(
      [
        () => funcion(valorBase, multiplicador),
        () => funcion({ danioBase: valorBase, multiplicador }),
        () => funcion({ valorBase, lanzador }),
        () => funcion(valorBase, lanzador),
      ],
      null,
    );
    if (resultado !== null) {
      return Math.round(resultado);
    }
  }
  return Math.max(0, Math.round(valorBase * multiplicador));
}

function invocarMotorElemental({
  lanzador,
  objetivo,
  componentes,
  idEjecucion,
}) {
  const funcion = ComponentesDanio.resolverPaqueteDanio;
  if (typeof funcion !== "function") {
    return {
      motorDisponible: false,
      danioFinal: componentes.reduce(
        (total, componente) => total + componente.valor,
        0,
      ),
      componentes,
    };
  }
  const intentos = [
    () => funcion({ atacante: lanzador, objetivo, componentes, idEjecucion }),
    () =>
      funcion({
        fuente: lanzador,
        objetivo,
        componentesDanio: componentes,
        idEjecucion,
      }),
    () => funcion({ objetivo, componentes }),
    () => funcion(componentes, objetivo),
  ];
  let ultimoError = null;
  for (const intento of intentos) {
    try {
      const resultado = intento();
      return (
        resultado ?? {
          motorDisponible: true,
          danioFinal: componentes.reduce(
            (total, componente) => total + componente.valor,
            0,
          ),
          componentes,
        }
      );
    } catch (error) {
      ultimoError = error;
    }
  }

  throw new Error(
    `No fue posible invocar resolverPaqueteDanio: ${
      ultimoError?.message ?? "contrato desconocido"
    }.`,
  );
}

function extraerDanioFinal(resolucion, componentes) {
  if (Number.isFinite(resolucion)) {
    return Math.max(0, Math.round(resolucion));
  }

  const candidatos = [
    resolucion?.danioFinal,
    resolucion?.dañoFinal,
    resolucion?.totalFinal,
    resolucion?.totalDanioFinal,
    resolucion?.totalDañoFinal,
    resolucion?.total,
    resolucion?.resultado?.danioFinal,
  ];
  for (const candidato of candidatos) {
    if (Number.isFinite(candidato)) {
      return Math.max(0, Math.round(candidato));
    }
  }
  const detalles = resolucion?.componentes ?? resolucion?.desglose;
  if (Array.isArray(detalles)) {
    return Math.max(
      0,
      Math.round(
        detalles.reduce(
          (total, componente) =>
            total +
            (componente.danioFinal ??
              componente.dañoFinal ??
              componente.valorFinal ??
              componente.valor ??
              0),
          0,
        ),
      ),
    );
  }
  return Math.max(
    0,
    Math.round(
      componentes.reduce((total, componente) => total + componente.valor, 0),
    ),
  );
}

function aplicarDanioFinal(objetivo, danioFinal, contexto) {
  const metodos = [
    "recibirDanio",
    "recibirDaño",
    "aplicarDanio",
    "aplicarDaño",
  ];
  for (const nombre of metodos) {
    if (typeof objetivo[nombre] === "function") {
      return objetivo[nombre](danioFinal, contexto);
    }
  }
  throw new Error(
    "El objetivo no expone un método compatible para recibir daño.",
  );
}

function leerVidaActual(objetivo) {
  const candidatos = [
    objetivo?.vidaActual,
    objetivo?.vida,
    objetivo?.recursos?.vidaActual,
  ];
  return candidatos.find(Number.isFinite) ?? null;
}

function estaDerrotado(objetivo) {
  if (typeof objetivo?.estaDerrotado === "function") {
    return Boolean(objetivo.estaDerrotado());
  }
  if (typeof objetivo?.estaMuerto === "function") {
    return Boolean(objetivo.estaMuerto());
  }
  const vida = leerVidaActual(objetivo);
  return Number.isFinite(vida) ? vida <= 0 : false;
}

function leerAtributosMagicos(combatiente) {
  return {
    inteligencia: leerAtributo(combatiente, "inteligencia"),
    sabiduria: leerAtributo(combatiente, "sabiduria"),
  };
}

function leerAtributo(combatiente, idAtributo) {
  const metodos = ["obtenerAtributo", "getAtributo"];
  for (const nombre of metodos) {
    if (typeof combatiente?.[nombre] === "function") {
      try {
        const valor = combatiente[nombre](idAtributo);
        if (Number.isFinite(valor)) {
          return valor;
        }
      } catch {
        // Se prueban las propiedades directas de atributos.
      }
    }
  }
  return (
    combatiente?.[idAtributo] ??
    combatiente?.atributos?.[idAtributo] ??
    combatiente?.atributosBase?.[idAtributo] ??
    0
  );
}

function primerNumeroPositivo(intentos, fallback) {
  for (const intento of intentos) {
    try {
      const resultado = intento();
      if (Number.isFinite(resultado) && resultado > 0) {
        return resultado;
      }
    } catch {
      // Se prueba el siguiente contrato compatible.
    }
  }
  return fallback;
}

function primerNumeroNoNegativo(intentos, fallback) {
  for (const intento of intentos) {
    try {
      const resultado = intento();
      if (Number.isFinite(resultado) && resultado >= 0) {
        return resultado;
      }
    } catch {
      // Se prueba el siguiente contrato compatible.
    }
  }
  return fallback;
}
