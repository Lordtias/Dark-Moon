import { Destructible } from "../Destructible.js";
import { Equipamiento } from "../../../objetos/Equipamiento.js";
import {
  calcularEstadisticasDerivadas,
  calcularRecursosMaximos,
} from "./EstadisticasDerivadas.js";
import { obtenerConfiguracionAtaque } from "./ConfiguracionAtaque.js";
import {
  resolverAtaque,
  resolverAtaqueSinObjetivo,
} from "../../../juego/combate/SistemaCombate.js";
import {
  PATRONES_ATAQUE,
  normalizarPatronAtaque,
  obtenerPatronAtaquePredeterminado,
} from "../../../juego/combate/PatronesAtaque.js";
import {
  FACTORES_TEMPORALES_PREDETERMINADOS,
  TIEMPO_REFERENCIA,
} from "../../../juego/tiempo/SistemaTiempo.js";
import {
  copiarRangosDanioElementalLocal,
  normalizarResistencias,
} from "../../../juego/combate/ComponentesDanio.js";
import {
  normalizarInmunidadesEfectos,
  normalizarResistenciasEfectos,
} from "../../../juego/efectos/ResistenciasEfectos.js";
import {
  OBJETIVOS_MODIFICADOR,
  normalizarDescriptorModificador,
} from "../../../juego/modificadores/ContratosModificadoresCombatiente.js";
import { SistemaModificadoresCombatiente } from "../../../juego/modificadores/SistemaModificadoresCombatiente.js";
import { SistemaEstadosTacticosCombatiente } from "../../../juego/estado/SistemaEstadosTacticosCombatiente.js";
import { obtenerModificadoresEstadosTacticos } from "../../../juego/modificadores/ProveedorModificadoresEstadosTacticos.js";
import {
  procesarEventoEstadoTacticoCombatiente,
  TIPOS_EVENTO_ESTADO_TACTICO,
} from "../../../juego/estado/EstadosTacticosCombatiente.js";
import {
  ATRIBUTOS_COMBATIENTE_CANONICOS,
  validarClavesAtributosCombatiente,
} from "./ContratosAtributosCombatiente.js";

const TIPOS_ATAQUE_VALIDOS = ["cuerpoACuerpo", "distancia"];
const NOMBRES_FACTORES_TEMPORALES = [
  OBJETIVOS_MODIFICADOR.FACTOR_TIEMPO,
  OBJETIVOS_MODIFICADOR.FACTOR_MOVIMIENTO,
  OBJETIVOS_MODIFICADOR.FACTOR_ATAQUE,
  OBJETIVOS_MODIFICADOR.FACTOR_ACCION,
  OBJETIVOS_MODIFICADOR.FACTOR_CONSUMO,
];

function validarAtributos(nombre, atributos) {
  validarClavesAtributosCombatiente(atributos, {
    descripcion: `Los atributos de ${nombre}`,
  });
  for (const atributo of ATRIBUTOS_COMBATIENTE_CANONICOS) {
    if (!Number.isInteger(atributos[atributo]) || atributos[atributo] <= 0) {
      throw new Error(
        `El atributo "${atributo}" de ` +
          `${nombre} debe ser un entero ` +
          "mayor que 0.",
      );
    }
  }
}

function normalizarEstadisticasBase(nombre, configuracion) {
  if (
    !configuracion ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion)
  ) {
    throw new Error(`${nombre} debe tener estadísticas base válidas.`);
  }
  const valores = {
    vida: configuracion.vida,
    mana: configuracion.mana,
    vidaPorNivel: configuracion.vidaPorNivel ?? 0,
    manaPorNivel: configuracion.manaPorNivel ?? 0,
    precision: configuracion.precision ?? 10,
    evasion: configuracion.evasion ?? 5,
    armadura: configuracion.armadura ?? 0,
    regeneracionVida: configuracion.regeneracionVida ?? 0,
    regeneracionMana: configuracion.regeneracionMana ?? 0,
    probabilidadCritico: configuracion.probabilidadCritico ?? 5,
    multiplicadorCritico: configuracion.multiplicadorCritico ?? 1.5,
    probabilidadBloqueo: configuracion.probabilidadBloqueo ?? 0,
    potenciaEfectos: configuracion.potenciaEfectos ?? 0,
    resistenciaMental: configuracion.resistenciaMental ?? 0,
    potenciaAura: configuracion.potenciaAura ?? 0,
    resistencias: normalizarResistencias({
      fuego: configuracion.resistencias?.fuego ?? 0,
      frio: configuracion.resistencias?.frio ?? 0,
      rayo: configuracion.resistencias?.rayo ?? 0,
      veneno: configuracion.resistencias?.veneno ?? 0,
    }),
    resistenciasEfectos: normalizarResistenciasEfectos(
      configuracion.resistenciasEfectos ?? {},
    ),
    inmunidadesEfectos: normalizarInmunidadesEfectos(
      configuracion.inmunidadesEfectos ?? [],
    ),
  };
  const camposNumericos = [
    "vida",
    "mana",
    "vidaPorNivel",
    "manaPorNivel",
    "precision",
    "evasion",
    "armadura",
    "regeneracionVida",
    "regeneracionMana",
    "probabilidadCritico",
    "multiplicadorCritico",
    "probabilidadBloqueo",
    "potenciaEfectos",
    "resistenciaMental",
    "potenciaAura",
  ];
  for (const campo of camposNumericos) {
    if (!Number.isFinite(valores[campo])) {
      throw new Error(
        `La estadística base "${campo}" de ` + `${nombre} no es válida.`,
      );
    }
  }
  return valores;
}

function normalizarAtaqueNatural(nombre, configuracion = null) {
  const valores =
    configuracion &&
    typeof configuracion === "object" &&
    !Array.isArray(configuracion)
      ? configuracion
      : {};
  const tipoAtaque = valores.tipoAtaque ?? "cuerpoACuerpo";
  const patronSolicitado =
    valores.patronAtaque ?? obtenerPatronAtaquePredeterminado(tipoAtaque);
  const patronNormalizado = normalizarPatronAtaque(patronSolicitado);
  const rangosElementales = copiarRangosDanioElementalLocal(valores, {
    origen: `el ataque natural de ${nombre}`,
  });
  const ataque = {
    danioFisicoMinimo: valores.danioFisicoMinimo ?? 1,
    danioFisicoMaximo: valores.danioFisicoMaximo ?? 2,
    ...rangosElementales,
    atributoAtaque: valores.atributoAtaque ?? "fuerza",
    precision: valores.precision ?? 0,
    alcance: valores.alcance ?? 1,
    tipoAtaque,
    patronAtaque: patronNormalizado,
    probabilidadCritico: valores.probabilidadCritico ?? 5,
    multiplicadorCritico: valores.multiplicadorCritico ?? 1.5,
    costoAtaque: valores.costoAtaque ?? TIEMPO_REFERENCIA,
  };
  if (
    !Number.isFinite(ataque.danioFisicoMinimo) ||
    !Number.isFinite(ataque.danioFisicoMaximo) ||
    ataque.danioFisicoMinimo < 0 ||
    ataque.danioFisicoMaximo < ataque.danioFisicoMinimo
  ) {
    throw new Error(
      `El ataque natural de ${nombre} ` + "tiene un rango inválido.",
    );
  }
  if (
    typeof ataque.atributoAtaque !== "string" ||
    ataque.atributoAtaque.trim() === ""
  ) {
    throw new Error(
      `El ataque natural de ${nombre} ` + "necesita un atributo de ataque.",
    );
  }
  ataque.atributoAtaque = ataque.atributoAtaque.trim().toLowerCase();

  if (!Number.isFinite(ataque.precision)) {
    throw new Error(
      "La precisión del ataque natural de " + `${nombre} no es válida.`,
    );
  }
  if (!Number.isInteger(ataque.alcance) || ataque.alcance < 1) {
    throw new Error(
      "El alcance del ataque natural de " + `${nombre} no es válido.`,
    );
  }
  if (!TIPOS_ATAQUE_VALIDOS.includes(ataque.tipoAtaque)) {
    throw new Error(
      "El tipo de ataque natural de " + `${nombre} no es válido.`,
    );
  }
  if (!ataque.patronAtaque) {
    throw new Error(
      "El patrón del ataque natural de " + `${nombre} no es válido.`,
    );
  }
  if (
    ataque.patronAtaque === PATRONES_ATAQUE.ADYACENTE &&
    ataque.alcance !== 1
  ) {
    throw new Error(
      `El ataque natural de ${nombre} utiliza ` +
        "patrón adyacente y debe tener alcance 1.",
    );
  }
  if (
    !Number.isFinite(ataque.probabilidadCritico) ||
    !Number.isFinite(ataque.multiplicadorCritico)
  ) {
    throw new Error(
      "Los valores de crítico del ataque " +
        `natural de ${nombre} no son válidos.`,
    );
  }
  if (!Number.isInteger(ataque.costoAtaque) || ataque.costoAtaque <= 0) {
    throw new Error(
      "El costo del ataque natural de " +
        `${nombre} debe ser un entero mayor que 0.`,
    );
  }

  return ataque;
}

function normalizarFactoresTemporales(nombre, configuracion = {}) {
  if (
    configuracion === null ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion)
  ) {
    throw new Error(
      `${nombre} debe tener una ` + "configuración temporal válida.",
    );
  }
  const factores = {
    factorTiempo:
      configuracion.factorTiempo ??
      FACTORES_TEMPORALES_PREDETERMINADOS.factorTiempo,
    factorMovimiento:
      configuracion.factorMovimiento ??
      FACTORES_TEMPORALES_PREDETERMINADOS.factorMovimiento,
    factorAtaque:
      configuracion.factorAtaque ??
      FACTORES_TEMPORALES_PREDETERMINADOS.factorAtaque,
    factorAccion:
      configuracion.factorAccion ??
      FACTORES_TEMPORALES_PREDETERMINADOS.factorAccion,
    factorConsumo:
      configuracion.factorConsumo ??
      FACTORES_TEMPORALES_PREDETERMINADOS.factorConsumo,
  };
  for (const nombreFactor of NOMBRES_FACTORES_TEMPORALES) {
    const valor = factores[nombreFactor];
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error(
        `El factor temporal "${nombreFactor}" de ` +
          `${nombre} debe ser un número mayor que 0.`,
      );
    }
  }
  return factores;
}

function normalizarModificadoresIniciales(nombre, modificadores) {
  if (!Array.isArray(modificadores)) {
    throw new Error(`${nombre} debe recibir modificadores iniciales en una lista.`);
  }
  return Object.freeze(
    modificadores.map((descriptor, indice) =>
      normalizarDescriptorModificador(
        {
          ...descriptor,
          id: descriptor?.id ?? `configuracion_combatiente:${indice}`,
          origen: descriptor?.origen ?? "configuracion_combatiente",
        },
        { origenPredeterminado: "configuracion_combatiente" },
      ),
    ),
  );
}

const RANURAS_ARMADURA_CORPORAL = Object.freeze([
  "cabeza",
  "torso",
  "manos",
  "piernas",
  "pies",
]);

function obtenerContextoArmaduraCorporal(equipamiento) {
  const piezas = RANURAS_ARMADURA_CORPORAL.map((ranura) => {
    if (!equipamiento?.tieneRanura(ranura)) return null;
    return equipamiento.obtenerObjetoEnRanura(ranura);
  });
  const categorias = piezas
    .filter(Boolean)
    .map((objeto) => objeto?.categoriaArmadura ?? null)
    .filter(Boolean);
  const conjuntoArmaduraCompleto =
    piezas.length === RANURAS_ARMADURA_CORPORAL.length &&
    piezas.every((objeto) => Boolean(objeto?.categoriaArmadura));

  if (categorias.length === 0) {
    return { categoriaArmadura: null, conjuntoArmaduraCompleto: false };
  }
  const unicas = new Set(categorias);
  return {
    categoriaArmadura: unicas.size === 1 ? categorias[0] : "mixta",
    conjuntoArmaduraCompleto,
  };
}

export class Combatiente extends Destructible {
  constructor({
    nombre,
    descripcion = "",
    nivel = 1,
    x = 0,
    y = 0,
    simbolo = "?",
    atributos,
    estadisticasBase,
    ataqueNatural = null,
    factoresTemporales = {},
    modificadoresIniciales = [],
    tipoContextoModificadores = "combatiente",
    capacidadContenedor = 0,
    objetosIniciales = [],
    solicitudBotin = null,
    ranurasEquipamiento = [],
    equipamientoInicial = [],
  } = {}) {
    if (!Number.isInteger(nivel) || nivel < 1) {
      throw new Error(
        `${nombre} debe tener un nivel entero ` + "igual o mayor que 1.",
      );
    }
    validarAtributos(nombre, atributos);
    const atributosNormalizados = { ...atributos };
    const baseNormalizada = normalizarEstadisticasBase(
      nombre,
      estadisticasBase,
    );
    const ataqueNormalizado = normalizarAtaqueNatural(nombre, ataqueNatural);
    const factoresTemporalesNormalizados = normalizarFactoresTemporales(
      nombre,
      factoresTemporales,
    );
    const modificadoresInicialesNormalizados = normalizarModificadoresIniciales(
      nombre,
      modificadoresIniciales,
    );
    if (
      typeof tipoContextoModificadores !== "string" ||
      tipoContextoModificadores.trim() === ""
    ) {
      throw new Error(`${nombre} necesita un tipo de contexto de modificadores.`);
    }
    if (
      !Object.prototype.hasOwnProperty.call(
        atributosNormalizados,
        ataqueNormalizado.atributoAtaque,
      )
    ) {
      throw new Error(
        `${nombre} no tiene el atributo ` +
          `"${ataqueNormalizado.atributoAtaque}" ` +
          "usado por su ataque natural.",
      );
    }
    const equipamiento = new Equipamiento({
      ranurasDisponibles: ranurasEquipamiento,
      objetosIniciales: equipamientoInicial,
    });
    const objetosEquipados = Object.values(
      equipamiento.obtenerRanuras(),
    ).filter(Boolean);
    const recursosIniciales = calcularRecursosMaximos({
      nivel,
      atributos: atributosNormalizados,
      estadisticasBase: baseNormalizada,
      objetosEquipados,
    });
    super({
      nombre,
      descripcion,
      x,
      y,
      simbolo,
      vidaMaxima: recursosIniciales.vidaMaxima,
      armadura: 0,
      capacidadContenedor,
      objetosIniciales,
      solicitudBotin,
      // Un combatiente ocupa su casilla, pero no sella una esquina como un
      // obstáculo estructural. La casilla destino continúa bloqueada por la
      // regla normal de ocupación.
      bloqueaCruceDiagonal: false,
    });
    this.nivel = nivel;
    this.atributos = atributosNormalizados;
    this.estadisticasBase = baseNormalizada;
    // Solamente Player activa este aporte. Los enemigos conservan las
    // resistencias explícitas de sus catálogos.
    this.aplicaBonoConstitucionResistenciasEfectos = false;
    this.ataqueNatural = ataqueNormalizado;
    this.equipamiento = equipamiento;
    this._factoresTemporalesBase = { ...factoresTemporalesNormalizados };
    this.tipoContextoModificadores = tipoContextoModificadores.trim().toLowerCase();
    this.sistemaModificadoresCombatiente = new SistemaModificadoresCombatiente({
      combatiente: this,
    });
    this.sistemaEstadosTacticosCombatiente = new SistemaEstadosTacticosCombatiente({
      combatiente: this,
    });
    this.sistemaModificadoresCombatiente.registrarProveedor({
      id: "estados_tacticos",
      obtenerModificadores: ({ combatiente }) =>
        obtenerModificadoresEstadosTacticos({ combatiente }),
    });
    if (modificadoresInicialesNormalizados.length > 0) {
      this.sistemaModificadoresCombatiente.registrarProveedor({
        id: "configuracion_combatiente",
        obtenerModificadores: () => modificadoresInicialesNormalizados,
      });
    }

    // El cálculo previo a super solamente permite construir el Destructible.
    // Una vez disponible el centralizador, los máximos iniciales se resuelven
    // por el mismo camino canónico que utilizará el resto de la partida.
    const estadisticasIniciales = calcularEstadisticasDerivadas(this);
    this.vidaMaxima = estadisticasIniciales.vidaMaxima;
    this.vidaActual = estadisticasIniciales.vidaMaxima;
    this.manaMaximo = estadisticasIniciales.manaMaximo;
    this.manaActual = estadisticasIniciales.manaMaximo;
    this.acumuladorRegeneracionVida = 0;
    this.acumuladorRegeneracionMana = 0;
  }

  obtenerContextoModificadores(contexto = {}) {
    const configuracionAtaque = obtenerConfiguracionAtaque(this);
    const secundaria = this.equipamiento?.tieneRanura("secundaria")
      ? this.equipamiento.obtenerObjetoEnRanura("secundaria")
      : null;
    const contextoArmadura = obtenerContextoArmaduraCorporal(this.equipamiento);

    return {
      tipoCombatiente: this.tipoContextoModificadores,
      familiaArma: configuracionAtaque.armaControladora?.familiaObjeto ?? null,
      familiaSecundaria:
        secundaria?.familiaObjeto ?? secundaria?.tipo ?? null,
      tipoAtaque: configuracionAtaque.propiedadesControladoras?.tipoAtaque ?? null,
      esAtaqueDual: configuracionAtaque.esAtaqueDual === true,
      categoriaArmadura: contextoArmadura.categoriaArmadura,
      conjuntoArmaduraCompleto: contextoArmadura.conjuntoArmaduraCompleto,
      ...contexto,
      tipoCombatiente: this.tipoContextoModificadores,
    };
  }

  resolverModificador(objetivo, valorBase, contexto = {}) {
    return this.sistemaModificadoresCombatiente.resolver(
      objetivo,
      valorBase,
      this.obtenerContextoModificadores(contexto),
    );
  }

  obtenerValorModificado(objetivo, valorBase, contexto = {}) {
    return this.resolverModificador(objetivo, valorBase, contexto).resultado;
  }

  recibirDanio(cantidad, contexto = {}) {
    const aplicado = super.recibirDanio(cantidad);
    if (aplicado > 0 && contexto?.hostil === true) {
      procesarEventoEstadoTacticoCombatiente(this, TIPOS_EVENTO_ESTADO_TACTICO.DANIO_RECIBIDO, {
        cantidad: aplicado,
        fuente: contexto.fuente ?? null,
        tipoAccion: contexto.tipoAccion ?? null,
      });
    }
    return aplicado;
  }

  obtenerFactoresTemporalesBase() {
    return { ...this._factoresTemporalesBase };
  }

  obtenerFactorTemporal(nombreFactor) {
    const valorBase = this._factoresTemporalesBase?.[nombreFactor];
    if (!Number.isFinite(valorBase) || valorBase <= 0) {
      throw new Error(
        `El factor temporal base "${nombreFactor}" de ${this.nombre} no es válido.`,
      );
    }
    return this.obtenerValorModificado(nombreFactor, valorBase);
  }

  get factorTiempo() {
    return this.obtenerFactorTemporal(OBJETIVOS_MODIFICADOR.FACTOR_TIEMPO);
  }

  get factorMovimiento() {
    return this.obtenerFactorTemporal(OBJETIVOS_MODIFICADOR.FACTOR_MOVIMIENTO);
  }

  get factorAtaque() {
    return this.obtenerFactorTemporal(OBJETIVOS_MODIFICADOR.FACTOR_ATAQUE);
  }

  get factorAccion() {
    return this.obtenerFactorTemporal(OBJETIVOS_MODIFICADOR.FACTOR_ACCION);
  }

  get factorConsumo() {
    return this.obtenerFactorTemporal(OBJETIVOS_MODIFICADOR.FACTOR_CONSUMO);
  }

  get estadisticasDerivadas() {
    const estadisticas = calcularEstadisticasDerivadas(this);
    this.vidaMaxima = estadisticas.vidaMaxima;
    this.manaMaximo = estadisticas.manaMaximo;
    this.vidaActual = Math.min(this.vidaActual, this.vidaMaxima);
    this.manaActual = Math.min(this.manaActual, this.manaMaximo);
    return estadisticas;
  }

  obtenerEstadisticasDerivadasContextuales(contexto = {}) {
    return calcularEstadisticasDerivadas(this, contexto);
  }

  get armaEquipada() {
    if (!this.equipamiento.tieneRanura("arma")) {
      return null;
    }
    const objeto = this.equipamiento.obtenerObjetoEnRanura("arma");
    return objeto?.tipo === "arma" ? objeto : null;
  }

  get configuracionAtaqueActual() {
    return obtenerConfiguracionAtaque(this);
  }

  get atributoAtaqueActual() {
    return this.configuracionAtaqueActual.propiedadesControladoras
      .atributoAtaque;
  }

  get costoAtaqueActual() {
    const costoAtaque = this.configuracionAtaqueActual.costoAtaqueBase;
    if (!Number.isInteger(costoAtaque) || costoAtaque <= 0) {
      throw new Error(
        `El costo de ataque actual de ${this.nombre} ` + "no es válido.",
      );
    }
    return costoAtaque;
  }

  get alcanceAtaque() {
    const alcance =
      this.configuracionAtaqueActual.propiedadesControladoras.alcance;
    if (!Number.isInteger(alcance) || alcance < 1) {
      throw new Error(`El alcance de ${this.nombre} no es válido.`);
    }
    const configuracion = this.configuracionAtaqueActual;
    const arma = configuracion.armaControladora;
    const contexto = {
      familiaArma: arma?.familiaObjeto ?? null,
      tipoAtaque: configuracion.propiedadesControladoras.tipoAtaque,
      esAtaqueDual: configuracion.esAtaqueDual,
    };
    return Math.max(
      1,
      Math.round(
        this.obtenerValorModificado(
          OBJETIVOS_MODIFICADOR.ALCANCE_ATAQUE,
          alcance,
          contexto,
        ),
      ),
    );
  }

  get tipoAtaqueActual() {
    const tipo =
      this.configuracionAtaqueActual.propiedadesControladoras.tipoAtaque;
    if (!TIPOS_ATAQUE_VALIDOS.includes(tipo)) {
      throw new Error(`El tipo de ataque de ${this.nombre} no es válido.`);
    }
    return tipo;
  }

  get patronAtaqueActual() {
    const patronAtaque =
      this.configuracionAtaqueActual.propiedadesControladoras.patronAtaque;
    const normalizado = normalizarPatronAtaque(patronAtaque);
    if (!normalizado) {
      throw new Error(`El patrón de ataque de ${this.nombre} no es válido.`);
    }
    return normalizado;
  }

  get estaVivo() {
    return !this.estaDestruido;
  }

  recuperarVida(cantidad) {
    if (!Number.isFinite(cantidad)) {
      throw new Error("La recuperación de Vida debe ser numérica.");
    }
    const anterior = this.vidaActual;
    this.vidaActual = Math.min(
      this.vidaMaxima,
      this.vidaActual + Math.max(0, cantidad),
    );
    return this.vidaActual - anterior;
  }

  recuperarMana(cantidad) {
    if (!Number.isFinite(cantidad)) {
      throw new Error("La recuperación de Maná debe ser numérica.");
    }
    const anterior = this.manaActual;
    this.manaActual = Math.min(
      this.manaMaximo,
      this.manaActual + Math.max(0, cantidad),
    );
    return this.manaActual - anterior;
  }

  gastarMana(cantidad) {
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      throw new Error("El costo de Maná no es válido.");
    }
    if (this.manaActual < cantidad) {
      return false;
    }
    this.manaActual -= cantidad;
    return true;
  }

  procesarRegeneracionVida(estadisticas = this.estadisticasDerivadas) {
    if (!this.estaVivo || this.vidaActual >= this.vidaMaxima) {
      this.acumuladorRegeneracionVida = 0;
      return 0;
    }
    this.acumuladorRegeneracionVida += estadisticas.regeneracionVida;
    const vidaEntera = Math.floor(this.acumuladorRegeneracionVida);
    if (vidaEntera <= 0) {
      return 0;
    }
    const vidaRecuperada = this.recuperarVida(vidaEntera);
    this.acumuladorRegeneracionVida -= vidaEntera;
    return vidaRecuperada;
  }

  procesarRegeneracionMana(estadisticas = this.estadisticasDerivadas) {
    if (!this.estaVivo || this.manaActual >= this.manaMaximo) {
      this.acumuladorRegeneracionMana = 0;
      return 0;
    }
    this.acumuladorRegeneracionMana += estadisticas.regeneracionMana;
    const manaEntero = Math.floor(this.acumuladorRegeneracionMana);
    if (manaEntero <= 0) {
      return 0;
    }
    const manaRecuperado = this.recuperarMana(manaEntero);
    this.acumuladorRegeneracionMana -= manaEntero;
    return manaRecuperado;
  }

  procesarPulsoRegeneracion() {
    if (!this.estaVivo) {
      return { vidaRecuperada: 0, manaRecuperado: 0 };
    }
    const estadisticas = this.estadisticasDerivadas;
    return {
      vidaRecuperada: this.procesarRegeneracionVida(estadisticas),
      manaRecuperado: this.procesarRegeneracionMana(estadisticas),
    };
  }

  atacarCasillaVacia() {
    return resolverAtaqueSinObjetivo({ atacante: this });
  }

  atacar(objetivo) {
    return resolverAtaque({ atacante: this, objetivo });
  }
}
