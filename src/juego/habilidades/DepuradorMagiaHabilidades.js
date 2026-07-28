import {
  crearSnapshotJugador,
  guardarJugadorDurable,
  leerSnapshotJugador,
  eliminarGuardadoJugador,
  crearJugadorDesdeGuardado,
} from "../../Partida/PersistenciaJugador.js";
import {
  obtenerConfiguracionAtaque,
  verificarRequisitosAtaque,
} from "../../entidad/destructible/combatiente/ConfiguracionAtaque.js";
import {
  crearContextoPotenciaHabilidad,
  obtenerObjetosEquipadosParaHabilidades,
  esBaston,
  esVarita,
  validarCatalogoCatalizadores,
} from "../magia/SistemaCatalizadores.js";
import {
  guardarConfiguracionBarraHabilidades,
  leerConfiguracionBarraHabilidades,
  eliminarConfiguracionBarraHabilidades,
} from "./PersistenciaBarraHabilidades.js";

const ELEMENTOS = Object.freeze(["fuego", "frio", "rayo", "veneno"]);
const HABILIDADES_BASICAS = Object.freeze([
  "ascua",
  "esquirla_hielo",
  "chispa",
  "aguijon_toxico",
]);
const HABILIDADES_INTERMEDIAS = Object.freeze([
  "explosion_ignea",
  "nova_escarcha",
  "cadena_rayos",
  "nube_toxica",
]);
const HABILIDADES_JUGABLES = Object.freeze([
  ...HABILIDADES_BASICAS,
  ...HABILIDADES_INTERMEDIAS,
]);

// Fachada única para validar el sistema mágico activo desde el navegador.
// Cada operación resuelve el mapa actual y no retiene integraciones destruidas.
export function crearDepuradorMagiaHabilidades({ obtenerAplicacion } = {}) {
  if (typeof obtenerAplicacion !== "function") {
    throw new Error(
      "El depurador necesita una función para obtener la aplicación.",
    );
  }

  const contexto = crearAccesoContexto(obtenerAplicacion);

  const progreso = Object.freeze({
    obtenerJugador: contexto.obtenerJugador,
    obtenerResumen: () => obtenerResumenProgreso(contexto.obtenerJugador()),
    registrarExperienciaMaestria: (evento) =>
      invocarRegistroExperiencia(contexto.obtenerJugador(), evento),
    agregarExperienciaMaestria: (datos) =>
      invocarProgreso(
        contexto.obtenerJugador(),
        "agregarExperienciaMaestria",
        datos,
      ),
    agregarPuntosUniversalesParaPrueba: (cantidad) =>
      invocarProgreso(
        contexto.obtenerJugador(),
        "agregarPuntosUniversales",
        cantidad,
      ),
    mejorarHabilidad: (datos) =>
      invocarProgreso(contexto.obtenerJugador(), "mejorarHabilidad", datos),
    prepararHabilidadParaPrueba: (datos) =>
      prepararHabilidadParaPrueba(contexto, datos),
    validarContratos: () => validarContratosProgreso(contexto),
  });

  const persistencia = Object.freeze({
    crearSnapshotJugador: () => crearSnapshotJugador(contexto.obtenerJugador()),
    guardarJugador: () =>
      guardarJugadorDurable({ jugador: contexto.obtenerJugador() }),
    leerGuardado: () => leerSnapshotJugador(),
    eliminarGuardado: () => eliminarGuardadoJugador(),
    crearJugadorDesdeGuardado: () => {
      const aplicacion = contexto.obtenerAplicacion();
      return crearJugadorDesdeGuardado({
        configuracionPersonaje: aplicacion.configuracionPersonaje,
        configuracionObjetos: aplicacion.configuracionObjetos,
      });
    },
  });

  const habilidades = Object.freeze({
    obtenerSeleccion: () =>
      contexto.obtenerSistema().obtenerSeleccionDetallada(),
    obtenerCatalogo: () =>
      contexto.obtenerIntegracion().configuracionEjecucion?.habilidades ?? {},
    seleccionarPorRanura: (ranuraHumana) =>
      contexto
        .obtenerSistema()
        .seleccionarPorRanura(normalizarRanuraHumana(ranuraHumana)),
    fijarSelector: (x, y) => contexto.obtenerSistema().fijarSelector(x, y),
    moverSelector: (dx, dy) => contexto.obtenerSistema().moverSelector(dx, dy),
    cancelar: () => contexto.obtenerSistema().cancelar(),
    confirmar: () => contexto.obtenerSistema().confirmar(),
    obtenerUltimaEjecucion: () =>
      contexto.obtenerSistema().obtenerUltimaEjecucion(),
    obtenerEnemigosVivos: () =>
      contexto.obtenerSistema().obtenerEnemigosVivos(),
    obtenerInstantaneaEjecucion: () => crearInstantaneaEjecucion(contexto),
    obtenerEfectosActivos: (objetivo = contexto.obtenerJugador()) =>
      obtenerEfectosActivos(contexto.obtenerJuego(), objetivo),
    establecerManaActualParaPrueba: (valor) =>
      establecerMana(contexto.obtenerJugador(), valor),
    configurarTiradasDeterministas: (configuracion) =>
      contexto.obtenerSistema().configurarTiradasDeterministas(configuracion),
    restaurarTiradasAleatorias: () =>
      contexto.obtenerSistema().restaurarTiradasAleatorias(),
    obtenerEstadoTiradasDeterministas: () =>
      contexto.obtenerSistema().obtenerEstadoTiradasDeterministas(),
    procesarEfectosPendientes: () =>
      contexto.obtenerSistema().procesarEfectosPendientes(),
    validarContratos: () => validarContratosHabilidades(contexto),
  });

  const barra = Object.freeze({
    obtener: () => contexto.obtenerSistema().obtenerEstadoBarra(),
    obtenerEstado: () => contexto.obtenerSistema().obtenerEstadoBarra(),
    obtenerAsignaciones: () => contexto.obtenerSistema().obtenerAsignaciones(),
    asignar: (ranuraHumana, idHabilidad) => {
      const integracion = contexto.obtenerIntegracion();
      const resultado = integracion.sistema.asignarHabilidad(
        normalizarRanuraHumana(ranuraHumana),
        idHabilidad,
      );
      actualizarInterfazYPersistenciaBarra(integracion);
      return resultado;
    },
    desasignar: (ranuraHumana) => {
      const integracion = contexto.obtenerIntegracion();
      const resultado = integracion.sistema.desasignarHabilidad(
        normalizarRanuraHumana(ranuraHumana),
      );
      actualizarInterfazYPersistenciaBarra(integracion);
      return resultado;
    },
    mover: (origenHumano, destinoHumano) => {
      const integracion = contexto.obtenerIntegracion();
      const origen = normalizarRanuraHumana(origenHumano);
      const destino = normalizarRanuraHumana(destinoHumano);
      const idHabilidad = integracion.sistema.obtenerAsignaciones()[origen];
      if (!idHabilidad) {
        throw new Error("La ranura de origen está vacía.");
      }
      const resultado = integracion.sistema.asignarHabilidad(
        destino,
        idHabilidad,
      );
      actualizarInterfazYPersistenciaBarra(integracion);
      return resultado;
    },
    vaciar: () => {
      const integracion = contexto.obtenerIntegracion();
      const resultado = integracion.sistema.vaciarBarra();
      actualizarInterfazYPersistenciaBarra(integracion);
      return resultado;
    },
    guardar: () => contexto.obtenerIntegracion().guardarBarra(),
    leerGuardada: () => leerConfiguracionBarraHabilidades(),
    eliminarGuardada: () => eliminarConfiguracionBarraHabilidades(),
    validarPersistencia: () => validarPersistenciaBarra(contexto),
  });

  const catalizadores = Object.freeze({
    obtenerResumen: () =>
      crearResumenEquipamientoMagico(contexto.obtenerJugador()),
    obtenerPotenciaHabilidad: () =>
      crearContextoPotenciaHabilidad({
        combatiente: contexto.obtenerJugador(),
      }),
    calcularPotenciaDeObjetos: (objetos) =>
      crearContextoPotenciaHabilidad({ objetos }),
    obtenerConfiguracionAtaque: () =>
      obtenerConfiguracionAtaque(contexto.obtenerJugador()),
    obtenerRequisitosAtaque: () =>
      verificarRequisitosAtaque(contexto.obtenerJugador()),
    validarContratos: () =>
      validarContratosCatalizadores({
        configuracionObjetos:
          contexto.obtenerIntegracion().configuracionObjetos ??
          contexto.obtenerJuego().configuracionObjetos,
        jugador: contexto.obtenerJugador(),
      }),
  });

  const interfaz = Object.freeze({
    abrirPanel: () => contexto.obtenerIntegracion().panel.abrir(),
    cerrarPanel: () => contexto.obtenerIntegracion().panel.cerrar(),
    estaAbierto: () => contexto.obtenerIntegracion().panel.estaAbierto(),
    obtenerResumen: () => {
      const integracion = contexto.obtenerIntegracion();
      return {
        progreso: obtenerResumenProgreso(contexto.obtenerJugador()),
        barra: integracion.sistema.obtenerEstadoBarra(),
        panelAbierto: integracion.panel.estaAbierto(),
        habilidadesBasicas: [...HABILIDADES_BASICAS],
        habilidadesIntermedias: [...HABILIDADES_INTERMEDIAS],
      };
    },
    validarContratos: () => validarContratosInterfaz(contexto),
  });

  const arquitectura = Object.freeze({
    obtenerResumen: () => crearResumenArquitectura(contexto),
    validarCicloActivo: () => validarCicloActivo(contexto),
  });

  const magia = Object.freeze({
    progreso,
    persistencia,
    habilidades,
    barra,
    catalizadores,
    interfaz,
    arquitectura,
    validarTodo: () => {
      const resultados = {
        progreso: progreso.validarContratos(),
        habilidades: habilidades.validarContratos(),
        barra: barra.validarPersistencia(),
        catalizadores: catalizadores.validarContratos(),
        interfaz: interfaz.validarContratos(),
        arquitectura: arquitectura.validarCicloActivo(),
      };
      return Object.freeze({
        aprobado: Object.values(resultados).every(resultadoAprobado),
        resultados,
      });
    },
  });

  return Object.freeze({ magia });
}

function crearAccesoContexto(obtenerAplicacion) {
  const acceso = {
    obtenerAplicacion() {
      const aplicacion = obtenerAplicacion();
      if (!aplicacion || typeof aplicacion !== "object") {
        throw new Error("No existe una aplicación activa.");
      }
      return aplicacion;
    },
    obtenerControladorPartida() {
      const controlador = acceso.obtenerAplicacion().controladorPartida;
      if (!controlador) {
        throw new Error("Todavía no existe un controlador de partida.");
      }
      return controlador;
    },
    obtenerJuego() {
      const juego = acceso.obtenerControladorPartida().juego;
      if (!juego) {
        throw new Error(
          "Todavía no existe un Juego activo. Iniciá una partida primero.",
        );
      }
      return juego;
    },
    obtenerJugador() {
      const controlador = acceso.obtenerControladorPartida();
      const jugador =
        controlador.juego?.jugador ??
        controlador.juego?.player ??
        controlador.estadoPartida?.jugador ??
        null;
      if (!jugador) {
        throw new Error(
          "Todavía no existe un jugador activo. Iniciá una partida primero.",
        );
      }
      return jugador;
    },
    obtenerIntegracion() {
      const integracion =
        acceso.obtenerControladorPartida().integracionHabilidades;
      if (!integracion || integracion.destruida) {
        throw new Error("No existe una integración activa de habilidades.");
      }
      return integracion;
    },
    obtenerSistema() {
      const sistema = acceso.obtenerIntegracion().sistema;
      if (!sistema || sistema.destruido) {
        throw new Error("No existe un sistema activo de habilidades.");
      }
      return sistema;
    },
  };
  return Object.freeze(acceso);
}

function crearInstantaneaEjecucion(contexto) {
  const juego = contexto.obtenerJuego();
  const jugador = contexto.obtenerJugador();
  const sistema = contexto.obtenerSistema();
  const resumen = obtenerResumenProgreso(jugador);
  const maestrias = Object.fromEntries(
    ELEMENTOS.map((id) => [
      id,
      {
        nivel: resumen?.maestrias?.[id]?.nivel ?? 0,
        experiencia:
          resumen?.maestrias?.[id]?.experienciaActual ??
          resumen?.maestrias?.[id]?.experiencia ??
          0,
        experienciaTotal: resumen?.maestrias?.[id]?.experienciaTotal ?? 0,
      },
    ]),
  );
  const grados = Object.fromEntries(
    HABILIDADES_JUGABLES.map((id) => [
      id,
      resumen?.habilidades?.[id]?.grado ?? obtenerGrado(jugador, id),
    ]),
  );

  return {
    manaActual: leerNumero(jugador.manaActual ?? jugador.mana),
    manaMaximo: leerNumero(jugador.manaMaximo ?? jugador.manaMaxima),
    tiempoActual: leerTiempoActual(juego),
    estaEnCombate: Boolean(juego.estaEnCombate),
    maestrias,
    grados,
    potenciaHabilidad: crearContextoPotenciaHabilidad({ combatiente: jugador }),
    seleccion: sistema.obtenerSeleccionDetallada(),
    ultimaEjecucion: sistema.obtenerUltimaEjecucion(),
    barra: sistema.obtenerEstadoBarra(),
    tiradasDeterministas: sistema.obtenerEstadoTiradasDeterministas(),
  };
}

function validarContratosProgreso(contexto) {
  const integracion = contexto.obtenerIntegracion();
  const configuracion = integracion.configuracionProgreso;
  const comprobaciones = [];
  const idsMaestrias = Object.keys(configuracion?.maestrias ?? {});
  const habilidades = Object.values(configuracion?.habilidades ?? {});

  comprobar(
    comprobaciones,
    "Existen las cuatro maestrías mágicas iniciales",
    ELEMENTOS.every((id) => idsMaestrias.includes(id)),
    idsMaestrias,
  );
  comprobar(
    comprobaciones,
    "Existen doce habilidades en el progreso mágico",
    habilidades.length === 12,
    habilidades.length,
  );
  for (const id of HABILIDADES_BASICAS) {
    const definicion = configuracion?.habilidades?.[id];
    comprobar(
      comprobaciones,
      `${id} se desbloquea en nivel de maestría 0`,
      definicion?.requisitoNivelMaestria === 0,
      definicion?.requisitoNivelMaestria,
    );
    comprobar(
      comprobaciones,
      `${id} admite exactamente cuatro grados`,
      definicion?.gradoMaximo === 4,
      definicion?.gradoMaximo,
    );
  }
  for (const id of HABILIDADES_INTERMEDIAS) {
    const definicion = configuracion?.habilidades?.[id];
    comprobar(
      comprobaciones,
      `${id} se desbloquea en nivel de maestría 3`,
      definicion?.requisitoNivelMaestria === 3,
      definicion?.requisitoNivelMaestria,
    );
    comprobar(
      comprobaciones,
      `${id} admite exactamente tres grados`,
      definicion?.gradoMaximo === 3,
      definicion?.gradoMaximo,
    );
  }
  return cerrarComprobaciones(comprobaciones);
}

function validarContratosHabilidades(contexto) {
  const integracion = contexto.obtenerIntegracion();
  const sistema = contexto.obtenerSistema();
  const catalogo = integracion.configuracionEjecucion?.habilidades ?? {};
  const comprobaciones = [];

  comprobar(
    comprobaciones,
    "La integración usa el único sistema activo",
    integracion.sistema === sistema,
    sistema.constructor?.name,
  );
  for (const id of HABILIDADES_BASICAS) {
    const habilidad = catalogo[id];
    comprobar(
      comprobaciones,
      `${id} tiene ejecución jugable`,
      Boolean(habilidad?.ejecucion),
      habilidad?.ejecucion ?? null,
    );
    comprobar(
      comprobaciones,
      `${id} usa selección libre y objetivo enemigo`,
      habilidad?.ejecucion?.patronAtaque === "libre" &&
        habilidad?.ejecucion?.tipoObjetivo === "enemigo",
      {
        patron: habilidad?.ejecucion?.patronAtaque,
        objetivo: habilidad?.ejecucion?.tipoObjetivo,
      },
    );
    comprobar(
      comprobaciones,
      `${id} declara cuatro grados ejecutables`,
      Object.keys(habilidad?.ejecucion?.grados ?? {}).length === 4,
      Object.keys(habilidad?.ejecucion?.grados ?? {}),
    );
  }
  const contratosIntermedios = {
    explosion_ignea: { objetivo: "casilla", forma: "radio" },
    nova_escarcha: { objetivo: "propio", forma: "radio" },
    cadena_rayos: { objetivo: "enemigo", forma: "cadena" },
    nube_toxica: { objetivo: "casilla", forma: "radio" },
  };
  for (const id of HABILIDADES_INTERMEDIAS) {
    const habilidad = catalogo[id];
    const contrato = contratosIntermedios[id];
    const grados = Object.values(habilidad?.ejecucion?.grados ?? {});
    comprobar(
      comprobaciones,
      `${id} tiene ejecución jugable`,
      Boolean(habilidad?.ejecucion),
      habilidad?.ejecucion ?? null,
    );
    comprobar(
      comprobaciones,
      `${id} usa objetivo y forma de impacto configurables`,
      habilidad?.ejecucion?.tipoObjetivo === contrato.objetivo &&
        grados.every((grado) => grado?.formaImpacto?.tipo === contrato.forma),
      {
        objetivo: habilidad?.ejecucion?.tipoObjetivo,
        formas: grados.map((grado) => grado?.formaImpacto?.tipo ?? null),
      },
    );
    comprobar(
      comprobaciones,
      `${id} declara tres grados ejecutables`,
      grados.length === 3,
      grados.length,
    );
  }
  comprobar(
    comprobaciones,
    "El sistema expone tiradas deterministas sin reemplazar Math.random",
    typeof sistema.configurarTiradasDeterministas === "function" &&
      typeof sistema.restaurarTiradasAleatorias === "function",
    sistema.obtenerEstadoTiradasDeterministas(),
  );
  comprobar(
    comprobaciones,
    "No existe procesador alternativo de efectos pendientes",
    Array.isArray(sistema.procesarEfectosPendientes()) &&
      sistema.procesarEfectosPendientes().length === 0,
    sistema.procesarEfectosPendientes(),
  );
  return cerrarComprobaciones(comprobaciones);
}

function validarPersistenciaBarra(contexto) {
  const sistema = contexto.obtenerSistema();
  const comprobaciones = [];
  const original = sistema.obtenerAsignaciones();
  const ids = original.filter(Boolean);

  comprobar(
    comprobaciones,
    "La barra contiene diez referencias",
    original.length === 10,
    original.length,
  );
  comprobar(
    comprobaciones,
    "La barra no contiene habilidades duplicadas",
    new Set(ids).size === ids.length,
    ids,
  );

  const almacenamiento = crearAlmacenamientoMemoria();
  guardarConfiguracionBarraHabilidades({
    ranuras: original,
    almacenamiento,
  });
  const restaurada = leerConfiguracionBarraHabilidades({ almacenamiento });
  comprobar(
    comprobaciones,
    "La persistencia conserva únicamente las diez referencias",
    JSON.stringify(restaurada?.ranuras) === JSON.stringify(original),
    restaurada?.ranuras,
  );
  return cerrarComprobaciones(comprobaciones);
}

function validarContratosCatalizadores({ configuracionObjetos, jugador }) {
  const comprobaciones = [];
  let catalogoValido = false;
  let errorCatalogo = null;
  try {
    validarCatalogoCatalizadores(configuracionObjetos);
    catalogoValido = true;
  } catch (error) {
    errorCatalogo = error.message;
  }
  comprobar(
    comprobaciones,
    "El catálogo de varitas y bastones conserva sus contratos",
    catalogoValido,
    errorCatalogo,
  );

  const ejemplo = crearContextoPotenciaHabilidad({
    objetos: [
      { nombre: "Objeto A", propiedades: { potenciaHabilidad: 12 } },
      { nombre: "Objeto B", propiedades: { potenciaHabilidad: 8 } },
    ],
  });
  comprobar(
    comprobaciones,
    "Dos objetos aportan 12 % + 8 % = 20 % sin penalización de mano",
    ejemplo.potenciaHabilidad === 20 &&
      ejemplo.multiplicadorHabilidad === 1.2 &&
      ejemplo.cantidadObjetosAportando === 2,
    ejemplo,
  );

  const actual = crearContextoPotenciaHabilidad({ combatiente: jugador });
  comprobar(
    comprobaciones,
    "La potencia actual se calcula una sola vez desde todo el equipamiento",
    Number.isFinite(actual.potenciaHabilidad) &&
      actual.multiplicadorHabilidad === 1 + actual.potenciaHabilidad / 100,
    actual,
  );
  return cerrarComprobaciones(comprobaciones);
}

function validarContratosInterfaz(contexto) {
  const integracion = contexto.obtenerIntegracion();
  const comprobaciones = [];
  comprobar(
    comprobaciones,
    "Existe un único panel funcional en la integración activa",
    Boolean(integracion.panel) &&
      typeof integracion.panel.abrir === "function" &&
      typeof integracion.panel.cerrar === "function" &&
      typeof integracion.panel.estaAbierto === "function",
    integracion.panel?.constructor?.name,
  );
  comprobar(
    comprobaciones,
    "Existe un único controlador de entrada destruible",
    Boolean(integracion.entrada) &&
      typeof integracion.entrada.destruir === "function",
    integracion.entrada?.constructor?.name,
  );
  comprobar(
    comprobaciones,
    "Existe una única barra visual destruible",
    Boolean(integracion.barra) &&
      typeof integracion.barra.destruir === "function",
    integracion.barra?.constructor?.name,
  );
  return cerrarComprobaciones(comprobaciones);
}

function crearResumenArquitectura(contexto) {
  const controlador = contexto.obtenerControladorPartida();
  const integracion = controlador.integracionHabilidades;
  return {
    partidaIniciada: controlador.partidaIniciada === true,
    juegoActivo: Boolean(controlador.juego),
    integracionActiva: Boolean(integracion && !integracion.destruida),
    sistemaActivo: Boolean(
      integracion?.sistema && !integracion.sistema.destruido,
    ),
    barraActiva: Boolean(integracion?.barra),
    panelActivo: Boolean(integracion?.panel),
    entradaActiva: Boolean(integracion?.entrada),
    procesadorParaleloEfectos: Boolean(integracion?.intervaloEfectos),
    oyentesSistema: integracion?.sistema?.oyentesCambio?.size ?? null,
    destruida: integracion?.destruida ?? null,
  };
}

function validarCicloActivo(contexto) {
  const resumen = crearResumenArquitectura(contexto);
  const comprobaciones = [];
  comprobar(
    comprobaciones,
    "Existe una integración activa para el Juego actual",
    resumen.juegoActivo && resumen.integracionActiva,
    resumen,
  );
  comprobar(
    comprobaciones,
    "La integración conserva un sistema, una barra, un panel y una entrada",
    resumen.sistemaActivo &&
      resumen.barraActiva &&
      resumen.panelActivo &&
      resumen.entradaActiva,
    resumen,
  );
  comprobar(
    comprobaciones,
    "Los efectos no usan intervalos ni procesadores paralelos",
    resumen.procesadorParaleloEfectos === false,
    resumen.procesadorParaleloEfectos,
  );
  return cerrarComprobaciones(comprobaciones);
}

function crearResumenEquipamientoMagico(jugador) {
  const objetos = obtenerObjetosEquipados(jugador);
  const contextoPotencia = crearContextoPotenciaHabilidad({ objetos });
  const configuracionAtaque = obtenerConfiguracionAtaqueSeguro(jugador);
  return {
    potenciaHabilidad: contextoPotencia.potenciaHabilidad,
    multiplicadorHabilidad: contextoPotencia.multiplicadorHabilidad,
    cantidadObjetosAportandoPotencia: contextoPotencia.cantidadObjetosAportando,
    cantidadObjetosEquipados: objetos.length,
    objetos: objetos.map((objeto) => ({
      id: objeto.id ?? null,
      nombre: objeto.nombre ?? "Objeto",
      familiaObjeto: objeto.familiaObjeto ?? null,
      esVarita: esVarita(objeto),
      esBaston: esBaston(objeto),
      potenciaHabilidad: numero(objeto.propiedades?.potenciaHabilidad),
    })),
    ataqueBasico: configuracionAtaque
      ? {
          origen: configuracionAtaque.origen,
          esAtaqueDual: configuracionAtaque.esAtaqueDual,
          cantidadGolpes: configuracionAtaque.cantidadGolpes,
          costoAtaqueBase: configuracionAtaque.costoAtaqueBase,
          costoManaAtaqueBasico: configuracionAtaque.costoManaAtaqueBasico,
        }
      : null,
    reglaHabilidades:
      "El tipo de objeto no habilita ni bloquea habilidades; sus afijos se acumulan una vez.",
  };
}

function obtenerObjetosEquipados(jugador) {
  return obtenerObjetosEquipadosParaHabilidades(jugador);
}

function obtenerConfiguracionAtaqueSeguro(jugador) {
  try {
    return obtenerConfiguracionAtaque(jugador);
  } catch {
    return null;
  }
}

function obtenerEfectosActivos(juego, objetivo) {
  if (
    typeof juego?.coordinadorTiempo?.obtenerEfectosTemporales === "function"
  ) {
    return juego.coordinadorTiempo.obtenerEfectosTemporales(objetivo);
  }
  return [];
}

function actualizarInterfazYPersistenciaBarra(integracion) {
  integracion.guardarBarra();
  integracion.panel?.renderizar?.();
}

function obtenerResumenProgreso(jugador) {
  const metodos = ["obtenerResumenProgresoMagico", "obtenerResumenMagico"];
  for (const nombre of metodos) {
    if (typeof jugador?.[nombre] === "function") return jugador[nombre]();
  }
  const progreso = jugador.progresoMagico ?? jugador.progresoMagicoJugador;
  return typeof progreso?.obtenerResumen === "function"
    ? progreso.obtenerResumen()
    : null;
}

function obtenerProgreso(jugador) {
  const progreso = jugador.progresoMagico ?? jugador.progresoMagicoJugador;
  if (!progreso || typeof progreso.obtenerResumen !== "function") {
    throw new Error("El jugador no expone ProgresoMagicoJugador.");
  }
  return progreso;
}

function invocarProgreso(jugador, nombreMetodo, datos) {
  if (typeof jugador?.[nombreMetodo] === "function") {
    return jugador[nombreMetodo](datos);
  }
  const progreso = obtenerProgreso(jugador);
  if (typeof progreso[nombreMetodo] === "function") {
    return progreso[nombreMetodo](datos);
  }
  throw new Error(`El jugador no expone ${nombreMetodo}.`);
}

function invocarRegistroExperiencia(jugador, evento) {
  if (typeof jugador.registrarExperienciaMaestria === "function") {
    return jugador.registrarExperienciaMaestria(evento);
  }
  const progreso = obtenerProgreso(jugador);
  if (typeof progreso.registrarEjecucionEfectiva === "function") {
    return progreso.registrarEjecucionEfectiva(evento);
  }
  throw new Error("El jugador no expone el registro de XP de maestría.");
}

function obtenerGrado(jugador, idHabilidad) {
  if (typeof jugador.obtenerGradoHabilidad === "function") {
    return jugador.obtenerGradoHabilidad(idHabilidad);
  }
  return obtenerProgreso(jugador).obtenerGradoHabilidad(idHabilidad);
}

function prepararHabilidadParaPrueba(
  contexto,
  { idHabilidad, grado = 1 } = {},
) {
  const integracion = contexto.obtenerIntegracion();
  const definicion =
    integracion.configuracionProgreso?.habilidades?.[idHabilidad];
  if (!definicion) {
    throw new Error(`La habilidad "${idHabilidad}" no existe.`);
  }
  if (!Number.isInteger(grado) || grado < 0 || grado > definicion.gradoMaximo) {
    throw new Error(
      `El grado de prueba debe estar entre 0 y ${definicion.gradoMaximo}.`,
    );
  }

  const progreso = obtenerProgreso(contexto.obtenerJugador());
  if (
    typeof progreso.exportarEstado !== "function" ||
    typeof progreso.restaurarEstado !== "function"
  ) {
    throw new Error(
      "El progreso mágico no permite preparar una prueba aislada.",
    );
  }

  const estado = progreso.exportarEstado();
  const maestria = estado.maestrias?.[definicion.maestria];
  if (!maestria) {
    throw new Error(
      `La profesión activa no tiene la maestría "${definicion.maestria}".`,
    );
  }
  maestria.nivel = Math.max(
    maestria.nivel,
    grado > 0 ? definicion.requisitoNivelMaestria : 0,
  );
  maestria.experiencia = 0;
  estado.gradosHabilidades[idHabilidad] = grado;
  const resultado = progreso.restaurarEstado(estado);
  contexto.obtenerIntegracion().panel?.renderizar?.();
  return {
    exito: resultado?.exito === true,
    idHabilidad,
    grado,
    idMaestria: definicion.maestria,
    nivelMaestria: maestria.nivel,
    resumen: obtenerResumenProgreso(contexto.obtenerJugador()),
  };
}

function establecerMana(jugador, valor) {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error("El Maná de prueba debe ser un número no negativo.");
  }
  const maximo = leerNumero(jugador.manaMaximo ?? jugador.manaMaxima);
  const normalizado = Math.min(valor, maximo > 0 ? maximo : valor);
  if ("manaActual" in jugador) {
    jugador.manaActual = normalizado;
    return jugador.manaActual;
  }
  if ("mana" in jugador) {
    jugador.mana = normalizado;
    return jugador.mana;
  }
  throw new Error("El jugador no expone Maná modificable para la prueba.");
}

function normalizarRanuraHumana(ranura) {
  if (!Number.isInteger(ranura) || ranura < 1 || ranura > 10) {
    throw new Error("La ranura visible debe estar entre 1 y 10.");
  }
  return ranura - 1;
}

function leerTiempoActual(juego) {
  const candidatos = [
    juego?.coordinadorTiempo?.tiempoActual,
    juego?.sistemaTiempo?.tiempoActual,
    juego?.tiempoActual,
  ];
  return leerNumero(candidatos.find(Number.isFinite));
}

function leerNumero(valor) {
  return Number.isFinite(valor) ? valor : 0;
}

function numero(valor) {
  return Number.isFinite(valor) ? valor : 0;
}

function comprobar(lista, descripcion, aprobado, detalle = null) {
  lista.push({ descripcion, aprobado: Boolean(aprobado), detalle });
}

function cerrarComprobaciones(comprobaciones) {
  return Object.freeze({
    aprobado: comprobaciones.every((item) => item.aprobado),
    comprobaciones: Object.freeze(
      comprobaciones.map((item) => Object.freeze({ ...item })),
    ),
  });
}

function resultadoAprobado(resultado) {
  return resultado?.aprobado === true;
}

function crearAlmacenamientoMemoria() {
  const datos = new Map();
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
  };
}
