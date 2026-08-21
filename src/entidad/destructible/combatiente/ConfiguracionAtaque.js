import { CONFIGURACION_COMBATE } from "../../../config/ConfiguracionCombate.js";
import { esVarita } from "../../../juego/magia/SistemaCatalizadores.js";
import {
  ataqueUsaAccionCompuesta,
  calcularCostoBaseFaseAtaque,
  FASES_ACCION_COMPUESTA,
} from "../../../juego/acciones/CostosAccionCompuesta.js";
import {
  activarPreparacionAccion,
  obtenerPreparacionAccion,
  retirarPreparacionAccion,
} from "../../../juego/acciones/PreparacionAccionesCombatiente.js";
import {
  crearMensajeTraducible,
  crearParametroContenidoMensaje,
  TIPOS_MENSAJE_JUEGO,
} from "../../../juego/mensajes/MensajesJuego.js";

const ICONO_TACTICO_FLECHA_CARGADA = "assets/imagenes/habilidades/basicas/flecha_cargada_tactica.png";
export const ID_ACCION_ATAQUE_BASICO = "ataque_basico";

// Expone etiquetas semánticas declaradas por familia para que preview, SMC y
// consumo de estados tácticos hablen el mismo idioma sin reconocer armas por ID.
export function obtenerContextoSemanticoAtaque(configuracionAtaque) {
  const familia = configuracionAtaque?.armaControladora?.familiaObjeto ?? null;
  const perfil = familia
    ? CONFIGURACION_COMBATE.accionesCompuestas?.ataque?.porFamilia?.[familia] ?? null
    : null;
  const etiquetaAccion =
    typeof perfil?.etiquetaContexto === "string" && perfil.etiquetaContexto.trim() !== ""
      ? perfil.etiquetaContexto.trim().toLowerCase()
      : null;
  const etiquetasEjecucion = Array.isArray(perfil?.etiquetasEjecucion)
    ? [...new Set(
        perfil.etiquetasEjecucion
          .filter((etiqueta) => typeof etiqueta === "string" && etiqueta.trim() !== "")
          .map((etiqueta) => etiqueta.trim().toLowerCase()),
      )]
    : [];
  return Object.freeze({
    etiquetaAccion,
    etiquetasEjecucion: Object.freeze(etiquetasEjecucion),
  });
}

// Analiza el equipo actual y determina:
//
// - Qué arma controla el ataque.
// - Cuántos golpes se realizan.
// - Qué fuente corresponde a cada mano.
// - Si el ataque requiere munición o Maná.
// - Si se usa el ataque natural como respaldo.
// - Cuánto tiempo base consume el ataque.
export function obtenerConfiguracionAtaque(
  combatiente,
  { ignorarAtaqueNaturalForzado = false } = {},
) {
  // El ataque natural puede forzarse temporalmente como respaldo sin alterar
  // ni desequipar el armamento actual.
  if (
    !ignorarAtaqueNaturalForzado &&
    combatiente.ataqueNaturalForzado === true
  ) {
    return crearConfiguracionAtaqueNatural(combatiente);
  }

  const armaPrincipal = obtenerArmaEnRanura(combatiente, "arma");
  const objetoSecundario = obtenerObjetoEnRanura(combatiente, "secundaria");
  const armaSecundaria = objetoSecundario?.esArma ? objetoSecundario : null;
  const quiver = objetoSecundario?.esQuiver ? objetoSecundario : null;

  if (armaPrincipal) {
    const propiedades = armaPrincipal.propiedades;
    const esAtaqueDual = esCombinacionDosArmas({
      armaPrincipal,
      armaSecundaria,
    });
    const fuentesDanio = esAtaqueDual
      ? crearFuentesAtaqueDual({ armaPrincipal, armaSecundaria })
      : [
          crearFuenteDesdeArma(armaPrincipal, {
            mano: "principal",
            multiplicadorGolpe: 1,
          }),
        ];

    const configuracion = {
      origen: "armaPrincipal",
      armaControladora: armaPrincipal,
      armaPrincipal,
      armaSecundaria,
      quiver,
      esAtaqueDual,
      cantidadGolpes: fuentesDanio.length,
      fuentesDanio,

      // El arma principal continúa controlando alcance, patrón y tipo.
      propiedadesControladoras: propiedades,
      requiereQuiver: armaPrincipal.requiereQuiver,
      tipoMunicion: propiedades.tipoMunicion ?? null,
    };

    return completarConfiguracionAtaque(configuracion);
  }

  // Un arma ubicada solamente en secundaria puede utilizarse cuando no existe
  // arma principal. Al ser la única fuente activa, utiliza toda su potencia.
  if (armaSecundaria) {
    const fuentesDanio = [
      crearFuenteDesdeArma(armaSecundaria, {
        mano: "secundaria",
        multiplicadorGolpe: 1,
      }),
    ];
    const configuracion = {
      origen: "armaSecundaria",
      armaControladora: armaSecundaria,
      armaPrincipal: null,
      armaSecundaria,
      quiver: null,
      esAtaqueDual: false,
      cantidadGolpes: 1,
      fuentesDanio,
      propiedadesControladoras: armaSecundaria.propiedades,
      requiereQuiver: armaSecundaria.requiereQuiver,
      tipoMunicion: armaSecundaria.propiedades.tipoMunicion ?? null,
    };

    return completarConfiguracionAtaque(configuracion);
  }

  return crearConfiguracionAtaqueNatural(combatiente);
}

function completarConfiguracionAtaque(configuracion) {
  return {
    ...configuracion,
    costoAtaqueBase: calcularCostoBaseAtaque(configuracion),
    costoManaAtaqueBasico: calcularCostoManaAtaqueBasico(configuracion),
  };
}

// Conserva la única fórmula temporal general ya existente para cualquier
// combinación dual válida, incluidas dos varitas.
export function calcularCostoBaseAtaque(configuracion) {
  if (!configuracion || typeof configuracion !== "object") {
    throw new Error("Se necesita una configuración de ataque válida.");
  }

  if (!configuracion.esAtaqueDual) {
    return validarCostoAtaque(
      configuracion.propiedadesControladoras?.costoAtaque,
      configuracion.armaControladora?.nombre ?? "Ataque natural",
    );
  }

  const costoPrincipal = validarCostoAtaque(
    configuracion.armaPrincipal?.propiedades?.costoAtaque,
    configuracion.armaPrincipal?.nombre ?? "Arma principal",
  );
  const costoSecundaria = validarCostoAtaque(
    configuracion.armaSecundaria?.propiedades?.costoAtaque,
    configuracion.armaSecundaria?.nombre ?? "Arma secundaria",
  );
  const costoMayor = Math.max(costoPrincipal, costoSecundaria);
  const costoMenor = Math.min(costoPrincipal, costoSecundaria);
  const recargo = CONFIGURACION_COMBATE.dosArmas.recargoTemporalSecundaria;

  if (!Number.isFinite(recargo) || recargo < 0) {
    throw new Error("El recargo temporal de dos armas no es válido.");
  }

  return Math.max(1, Math.round(costoMayor + costoMenor * recargo));
}

function validarCostoAtaque(costoAtaque, nombreFuente) {
  if (!Number.isInteger(costoAtaque) || costoAtaque <= 0) {
    throw new Error(
      `El costo de ataque de "${nombreFuente}" debe ser un entero mayor que 0.`,
    );
  }
  return costoAtaque;
}

// Admite las dos combinaciones homogéneas previstas por el sistema:
// dos armas cuerpo a cuerpo de una mano o dos varitas de una mano.
// No convierte una combinación física/mágica en un ataque dual híbrido.
function esCombinacionDosArmas({ armaPrincipal, armaSecundaria }) {
  if (!armaPrincipal || !armaSecundaria) return false;

  const ambasDeUnaMano =
    armaPrincipal.propiedades.manos === 1 &&
    armaSecundaria.propiedades.manos === 1;
  if (!ambasDeUnaMano) return false;

  const ambasCuerpoACuerpo =
    armaPrincipal.propiedades.tipoAtaque === "cuerpoACuerpo" &&
    armaSecundaria.propiedades.tipoAtaque === "cuerpoACuerpo";
  const ambasVaritas = esVarita(armaPrincipal) && esVarita(armaSecundaria);

  return ambasCuerpoACuerpo || ambasVaritas;
}

function crearFuentesAtaqueDual({ armaPrincipal, armaSecundaria }) {
  const configuracion = CONFIGURACION_COMBATE.dosArmas;
  return [
    crearFuenteDesdeArma(armaPrincipal, {
      mano: "principal",
      multiplicadorGolpe: configuracion.multiplicadorManoPrincipal,
    }),
    crearFuenteDesdeArma(armaSecundaria, {
      mano: "secundaria",
      multiplicadorGolpe: configuracion.multiplicadorManoSecundaria,
    }),
  ];
}

function crearConfiguracionAtaqueNatural(combatiente) {
  const fuentesDanio = [
    {
      nombre: "Ataque natural",
      objeto: null,
      mano: "natural",
      multiplicadorGolpe: 1,
      propiedades: combatiente.ataqueNatural,
    },
  ];
  const configuracion = {
    origen: "ataqueNatural",
    armaControladora: null,
    armaPrincipal: null,
    armaSecundaria: null,
    quiver: null,
    esAtaqueDual: false,
    cantidadGolpes: 1,
    fuentesDanio,
    propiedadesControladoras: combatiente.ataqueNatural,
    requiereQuiver: false,
    tipoMunicion: null,
  };

  return completarConfiguracionAtaque(configuracion);
}

export function calcularCostoManaAtaqueBasico(configuracion) {
  if (!configuracion || !Array.isArray(configuracion.fuentesDanio)) {
    throw new Error("No se puede calcular el coste de Maná del ataque.");
  }

  return configuracion.fuentesDanio.reduce((total, fuente) => {
    if (!esVarita(fuente?.objeto)) return total;

    const costo = fuente.propiedades?.costoManaAtaqueBasico;
    if (!Number.isInteger(costo) || costo <= 0) {
      throw new Error(
        `El costo de Maná de "${fuente.nombre}" debe ser un entero mayor que 0.`,
      );
    }
    return total + costo;
  }, 0);
}

function parametroObjeto(objeto, respaldo = "") {
  return crearParametroContenidoMensaje("objetos", objeto?.id, {
    respaldo: objeto?.nombre ?? respaldo,
  });
}

// Comprueba únicamente la política de munición declarada por la acción. Una
// habilidad de arma puede requerir o no munición con independencia del ataque
// básico del arma; por eso este contrato no consulta el coste de Maná del
// ataque básico ni fuerza el uso de quiver cuando la acción declara que no lo
// necesita.
export function verificarRequisitosMunicionAtaque(
  combatiente,
  {
    requiereMunicion = true,
    cantidadMunicionRequerida = 1,
  } = {},
) {
  if (typeof requiereMunicion !== "boolean") {
    throw new Error("La política de munición debe declarar requiereMunicion como booleano.");
  }
  if (
    !Number.isInteger(cantidadMunicionRequerida) ||
    cantidadMunicionRequerida < 0 ||
    (requiereMunicion && cantidadMunicionRequerida <= 0)
  ) {
    throw new Error(
      "La cantidad de munición requerida debe ser un entero no negativo y mayor que 0 cuando la acción requiere munición.",
    );
  }
  const configuracion = obtenerConfiguracionAtaque(combatiente);
  return verificarRequisitosMunicionConfiguracion({
    configuracion,
    requiereMunicion,
    cantidadMunicionRequerida,
  });
}

// Comprueba conjuntamente munición y Maná antes de que el ataque básico pueda
// alterar hostilidad, Vida, selector o agenda temporal.
export function verificarRequisitosAtaque(
  combatiente,
  { cantidadMunicionRequerida = 1 } = {},
) {
  if (!Number.isInteger(cantidadMunicionRequerida) || cantidadMunicionRequerida <= 0) {
    throw new Error("La cantidad de munición requerida debe ser un entero mayor que 0.");
  }
  const configuracion = obtenerConfiguracionAtaque(combatiente);
  const costoMana = configuracion.costoManaAtaqueBasico ?? 0;
  const manaActual = Number.isFinite(combatiente.manaActual)
    ? combatiente.manaActual
    : 0;

  if (costoMana > manaActual) {
    return {
      disponible: false,
      configuracion,
      cantidadMunicion: configuracion.requiereQuiver ? 0 : null,
      cantidadMunicionRequerida: configuracion.requiereQuiver
        ? cantidadMunicionRequerida
        : 0,
      requiereMunicion: configuracion.requiereQuiver === true,
      costoMana,
      manaActual,
      mensaje:
        `No tenés Maná suficiente para atacar con ` +
        `${configuracion.armaControladora?.nombre ?? "la varita"}. ` +
        `Necesitás ${costoMana} y tenés ${manaActual}. ` +
        "Podés usar G para el ataque de respaldo, esperar o cambiar de arma.",
      mensajePresentacion: crearMensajeTraducible("mensajes.combate.manaInsuficiente", {
        tipo: TIPOS_MENSAJE_JUEGO.ALERTA,
        parametros: {
          arma: parametroObjeto(configuracion.armaControladora, "la varita"),
          necesario: costoMana,
          actual: manaActual,
        },
      }),
    };
  }

  const requisitosMunicion = verificarRequisitosMunicionConfiguracion({
    configuracion,
    requiereMunicion: configuracion.requiereQuiver === true,
    cantidadMunicionRequerida: configuracion.requiereQuiver
      ? cantidadMunicionRequerida
      : 0,
  });
  return {
    ...requisitosMunicion,
    costoMana,
    manaActual,
  };
}

function verificarRequisitosMunicionConfiguracion({
  configuracion,
  requiereMunicion,
  cantidadMunicionRequerida,
}) {
  if (!requiereMunicion) {
    return {
      disponible: true,
      configuracion,
      requiereMunicion: false,
      cantidadMunicion: null,
      cantidadMunicionRequerida: 0,
      mensaje: null,
      mensajePresentacion: null,
    };
  }

  if (!configuracion.quiver) {
    return {
      disponible: false,
      configuracion,
      requiereMunicion: true,
      cantidadMunicion: 0,
      cantidadMunicionRequerida,
      mensaje:
        `${configuracion.armaControladora?.nombre ?? "El arma"} ` +
        "necesita un quiver equipado en secundaria.",
      mensajePresentacion: crearMensajeTraducible("mensajes.combate.requiereQuiver", {
        tipo: TIPOS_MENSAJE_JUEGO.ALERTA,
        parametros: { arma: parametroObjeto(configuracion.armaControladora) },
      }),
    };
  }

  if (
    !configuracion.tipoMunicion ||
    configuracion.quiver.propiedades.tipoMunicion !== configuracion.tipoMunicion
  ) {
    return {
      disponible: false,
      configuracion,
      requiereMunicion: true,
      cantidadMunicion: 0,
      cantidadMunicionRequerida,
      mensaje:
        `${configuracion.quiver.nombre} no admite la munición requerida por ` +
        `${configuracion.armaControladora?.nombre ?? "el arma"}.`,
      mensajePresentacion: crearMensajeTraducible("mensajes.combate.quiverIncompatible", {
        tipo: TIPOS_MENSAJE_JUEGO.ALERTA,
        parametros: {
          quiver: parametroObjeto(configuracion.quiver),
          arma: parametroObjeto(configuracion.armaControladora),
        },
      }),
    };
  }

  const cantidadMunicion = contarMunicionCompatible(configuracion);
  if (cantidadMunicion < cantidadMunicionRequerida) {
    return {
      disponible: false,
      configuracion,
      requiereMunicion: true,
      cantidadMunicion,
      cantidadMunicionRequerida,
      mensaje: cantidadMunicion <= 0
        ? `${configuracion.quiver.nombre} no tiene munición compatible.`
        : `${configuracion.quiver.nombre} tiene ${cantidadMunicion} de ${cantidadMunicionRequerida} municiones requeridas.`,
      mensajePresentacion: crearMensajeTraducible("mensajes.combate.sinMunicion", {
        tipo: TIPOS_MENSAJE_JUEGO.ALERTA,
        parametros: { quiver: parametroObjeto(configuracion.quiver) },
      }),
    };
  }

  return {
    disponible: true,
    configuracion,
    requiereMunicion: true,
    cantidadMunicion,
    cantidadMunicionRequerida,
    mensaje: null,
    mensajePresentacion: null,
  };
}

export function ataqueRequierePreparacion(combatiente) {
  return ataqueUsaAccionCompuesta(obtenerConfiguracionAtaque(combatiente));
}

export function validarPreparacionAtaque(combatiente, { retirarSiInvalida = true } = {}) {
  const configuracion = obtenerConfiguracionAtaque(combatiente);
  if (!ataqueUsaAccionCompuesta(configuracion)) {
    const estadoExistente = obtenerPreparacionAccion(combatiente);
    // El ataque natural forzado es un respaldo transitorio y no representa un
    // cambio de arma. No invalida una preparación del arma equipada.
    if (combatiente.ataqueNaturalForzado === true) {
      return { valida: true, requierePreparacion: false, configuracion, estado: estadoExistente };
    }
    if (retirarSiInvalida) retirarPreparacionAccion(combatiente);
    return { valida: true, requierePreparacion: false, configuracion, estado: null };
  }

  const estado = obtenerPreparacionAccion(combatiente);
  const requisitos = verificarRequisitosAtaque(combatiente);
  const valida = Boolean(
    estado &&
    estado.datos?.tipoAccion === "ataque_arma" &&
    estado.datos?.idAccion === ID_ACCION_ATAQUE_BASICO &&
    estado.datos?.arma === configuracion.armaControladora &&
    estado.datos?.quiver === configuracion.quiver &&
    estado.datos?.tipoMunicion === configuracion.tipoMunicion &&
    requisitos.disponible
  );
  if (
    !valida &&
    retirarSiInvalida &&
    estado?.datos?.tipoAccion === "ataque_arma" &&
    estado?.datos?.idAccion === ID_ACCION_ATAQUE_BASICO
  ) {
    retirarPreparacionAccion(combatiente);
  }
  return { valida, requierePreparacion: true, configuracion, estado: valida ? estado : null, requisitos };
}

// Valida la preparación de arma activa sin asumir que pertenece al ataque
// básico. Sirve para conservar un único slot de preparación compartido por
// ataques y habilidades, e invalidarlo únicamente cuando cambia el equipo o
// deja de existir la munición que ese estado declaró necesitar.
export function validarPreparacionAtaqueArmaActual(
  combatiente,
  { retirarSiInvalida = true } = {},
) {
  const estado = obtenerPreparacionAccion(combatiente);
  if (!estado || estado.datos?.tipoAccion !== "ataque_arma") {
    return { valida: true, estado, requisitos: null };
  }
  const requiereMunicion = estado.datos?.requiereMunicion !== false;
  const cantidadMunicionRequerida = requiereMunicion
    ? Math.max(1, Math.round(estado.datos?.cantidadMunicionRequerida ?? 1))
    : 0;
  const configuracion = obtenerConfiguracionAtaque(combatiente);
  const requisitos = verificarRequisitosMunicionAtaque(combatiente, {
    requiereMunicion,
    cantidadMunicionRequerida,
  });
  const valida = Boolean(
    requisitos.disponible &&
    estado.datos?.arma === configuracion.armaControladora &&
    (!requiereMunicion || estado.datos?.quiver === configuracion.quiver) &&
    (!requiereMunicion || estado.datos?.tipoMunicion === configuracion.tipoMunicion)
  );
  if (!valida && retirarSiInvalida) retirarPreparacionAccion(combatiente);
  return { valida, estado: valida ? estado : null, requisitos, configuracion };
}

export function prepararAtaque(combatiente) {
  const requisitos = verificarRequisitosAtaque(combatiente);
  const configuracion = requisitos.configuracion;
  if (!ataqueUsaAccionCompuesta(configuracion)) {
    return { preparado: false, requierePreparacion: false, requisitos, costoBase: 0, estado: null };
  }
  const actual = validarPreparacionAtaque(combatiente, { retirarSiInvalida: false });
  if (actual.valida) {
    return { preparado: true, yaPreparado: true, requierePreparacion: true, requisitos, costoBase: 0, estado: actual.estado };
  }
  if (!requisitos.disponible) {
    return { preparado: false, requierePreparacion: true, requisitos, costoBase: 0, estado: null };
  }

  const municion = obtenerDescriptorMunicionCompatible(configuracion);
  const estado = activarPreparacionAccion(combatiente, {
    tipoAccion: "ataque_arma",
    nombre: configuracion.tipoMunicion === "flecha" ? "Flecha cargada" : "Arma preparada",
    descripcion:
      configuracion.tipoMunicion === "flecha"
        ? "El arco quedó cargado y listo para disparar."
        : "Preparación lista para ejecutar el ataque.",
    icono:
      configuracion.tipoMunicion === "flecha"
        ? ICONO_TACTICO_FLECHA_CARGADA
        : municion?.recursoVisual ?? configuracion.armaControladora?.recursoVisual ?? null,
    datos: {
      idAccion: ID_ACCION_ATAQUE_BASICO,
      arma: configuracion.armaControladora,
      quiver: configuracion.quiver,
      tipoMunicion: configuracion.tipoMunicion,
      requiereMunicion: configuracion.requiereQuiver === true,
      consumeMunicion: configuracion.requiereQuiver === true,
      cantidadMunicionRequerida: configuracion.requiereQuiver ? 1 : 0,
    },
  });
  const costoBase = calcularCostoBaseFaseAtaque({
    combatiente,
    configuracionAtaque: configuracion,
    fase: FASES_ACCION_COMPUESTA.PREPARACION,
  });
  return { preparado: true, yaPreparado: false, requierePreparacion: true, requisitos, costoBase, estado };
}

export function consumirPreparacionAtaque(combatiente) {
  return retirarPreparacionAccion(combatiente);
}

export function obtenerCostoEjecucionAtaque(combatiente) {
  const configuracion = obtenerConfiguracionAtaque(combatiente);
  if (!ataqueUsaAccionCompuesta(configuracion)) return configuracion.costoAtaqueBase;
  return calcularCostoBaseFaseAtaque({
    combatiente,
    configuracionAtaque: configuracion,
    fase: FASES_ACCION_COMPUESTA.EJECUCION,
  });
}

export function consumirRecursosAtaque(
  combatiente,
  {
    requiereMunicion = null,
    consumirMunicion = true,
    cantidadMunicion = 1,
    consumirManaAtaqueBasico = true,
  } = {},
) {
  if (typeof consumirMunicion !== "boolean" || typeof consumirManaAtaqueBasico !== "boolean") {
    throw new Error("La política de consumo del ataque debe usar valores booleanos.");
  }
  const configuracion = obtenerConfiguracionAtaque(combatiente);
  const requiereMunicionResuelto = requiereMunicion === null
    ? configuracion.requiereQuiver === true
    : requiereMunicion;
  if (typeof requiereMunicionResuelto !== "boolean") {
    throw new Error("La política de consumo debe declarar requiereMunicion como booleano.");
  }
  if (!Number.isInteger(cantidadMunicion) || cantidadMunicion < 0) {
    throw new Error("La cantidad de munición a consumir debe ser un entero no negativo.");
  }
  if (requiereMunicionResuelto && cantidadMunicion <= 0) {
    throw new Error("Una acción que requiere munición debe solicitar al menos una unidad.");
  }
  const consumirMunicionResuelto = requiereMunicionResuelto && consumirMunicion;

  const requisitos = consumirManaAtaqueBasico
    ? verificarRequisitosAtaque(combatiente, {
        cantidadMunicionRequerida: requiereMunicionResuelto ? cantidadMunicion : 1,
      })
    : verificarRequisitosMunicionAtaque(combatiente, {
        requiereMunicion: requiereMunicionResuelto,
        cantidadMunicionRequerida: cantidadMunicion,
      });
  const resultadoBase = {
    consumida: false,
    restante: requisitos.cantidadMunicion,
    municionUtilizada: null,
    manaConsumido: 0,
    manaRestante: combatiente.manaActual,
    requisitos,
  };

  if (!requisitos.disponible) return resultadoBase;

  const costoMana = consumirManaAtaqueBasico ? requisitos.costoMana ?? 0 : 0;
  const manaAnterior = combatiente.manaActual;

  if (costoMana > 0) {
    if (typeof combatiente.gastarMana !== "function") {
      throw new Error(`${combatiente.nombre} no puede consumir Maná.`);
    }
    const gastado = combatiente.gastarMana(costoMana);
    const diferencia = manaAnterior - combatiente.manaActual;
    if (!gastado || diferencia !== costoMana) {
      combatiente.manaActual = manaAnterior;
      throw new Error(
        "No fue posible descontar el Maná del ataque de forma atómica.",
      );
    }
  }

  let municionConsumida = false;
  let municionUtilizada = null;
  if (consumirMunicionResuelto) {
    const contenedorMunicion = configuracion.quiver.contenedorObjetos;
    const objetoMunicion = contenedorMunicion.buscarPrimerObjeto(
      (objeto) =>
        objeto.esMunicion &&
        objeto.propiedades.tipoMunicion === configuracion.tipoMunicion,
    );

    if (!objetoMunicion) {
      combatiente.manaActual = manaAnterior;
      throw new Error("No fue posible localizar la munición del ataque.");
    }

    municionUtilizada = Object.freeze({
      ...crearDescriptorRecursoMunicion(objetoMunicion),
      cantidad: cantidadMunicion,
    });
    municionConsumida = consumirMunicionCompatibleAtomica({
      contenedor: contenedorMunicion,
      tipoMunicion: configuracion.tipoMunicion,
      cantidad: cantidadMunicion,
    });

    if (!municionConsumida) {
      combatiente.manaActual = manaAnterior;
      throw new Error("No fue posible consumir los recursos del ataque.");
    }
  }

  return {
    consumida: municionConsumida,
    restante: requiereMunicionResuelto
      ? contarMunicionCompatible(configuracion)
      : null,
    municionUtilizada,
    manaConsumido: costoMana,
    manaRestante: combatiente.manaActual,
    requisitos,
  };
}

function consumirMunicionCompatibleAtomica({ contenedor, tipoMunicion, cantidad }) {
  const candidatos = contenedor.obtenerObjetos().filter(
    (objeto) =>
      objeto.esMunicion &&
      objeto.propiedades.tipoMunicion === tipoMunicion,
  );
  const total = candidatos.reduce((suma, objeto) => suma + objeto.cantidad, 0);
  if (total < cantidad) return false;

  let restante = cantidad;
  for (const objeto of candidatos) {
    if (restante <= 0) break;
    const consumir = Math.min(restante, objeto.cantidad);
    const ok = contenedor.consumirCantidadObjeto(
      (candidato) => candidato === objeto,
      consumir,
    );
    if (!ok) {
      throw new Error("El contenedor cambió durante el consumo atómico de munición.");
    }
    restante -= consumir;
  }
  return restante === 0;
}

function crearDescriptorRecursoMunicion(objeto) {
  if (!objeto?.esMunicion) return null;
  return Object.freeze({
    idObjeto: objeto.id,
    tipoMunicion: objeto.propiedades?.tipoMunicion ?? null,
    recursoVisual: objeto.recursoVisual ?? null,
  });
}

export function obtenerDescriptorMunicionCompatible(configuracion) {
  if (!configuracion?.requiereQuiver || !configuracion.quiver?.contenedorObjetos) return null;
  const objeto = configuracion.quiver.contenedorObjetos.buscarPrimerObjeto(
    (candidato) =>
      candidato.esMunicion &&
      candidato.propiedades.tipoMunicion === configuracion.tipoMunicion,
  );
  return crearDescriptorRecursoMunicion(objeto);
}

function obtenerArmaEnRanura(combatiente, nombreRanura) {
  const objeto = obtenerObjetoEnRanura(combatiente, nombreRanura);
  return objeto?.esArma ? objeto : null;
}

function obtenerObjetoEnRanura(combatiente, nombreRanura) {
  if (!combatiente.equipamiento?.tieneRanura(nombreRanura)) return null;
  return combatiente.equipamiento.obtenerObjetoEnRanura(nombreRanura);
}

function crearFuenteDesdeArma(arma, { mano, multiplicadorGolpe }) {
  if (!Number.isFinite(multiplicadorGolpe) || multiplicadorGolpe < 0) {
    throw new Error(
      `El multiplicador de golpe de ${arma.nombre} no es válido.`,
    );
  }
  return {
    nombre: arma.nombre,
    objeto: arma,
    mano,
    multiplicadorGolpe,
    propiedades: arma.propiedades,
  };
}

export function contarMunicionCompatible(configuracion) {
  if (!configuracion.quiver?.contenedorObjetos || !configuracion.tipoMunicion) {
    return 0;
  }
  return configuracion.quiver.contenedorObjetos
    .obtenerObjetos()
    .filter(
      (objeto) =>
        objeto.esMunicion &&
        objeto.propiedades.tipoMunicion === configuracion.tipoMunicion,
    )
    .reduce((total, objeto) => total + objeto.cantidad, 0);
}
