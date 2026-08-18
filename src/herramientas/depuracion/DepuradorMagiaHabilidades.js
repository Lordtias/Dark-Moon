import { cargarJson } from "../../utilidades/CargadorJson.js";
import {
  obtenerConfiguracionEjecucionHabilidades,
  obtenerConfiguracionProgresoHabilidades,
} from "../../juego/maestrias/ContextoProgresoHabilidades.js";
import {
  crearSnapshotJugador,
  guardarJugadorDurable,
  leerSnapshotJugador,
  eliminarGuardadoJugador,
  crearJugadorDesdeGuardado,
} from "../../partida/PersistenciaJugador.js";
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
} from "../../juego/magia/SistemaCatalizadores.js";
import {
  guardarConfiguracionBarraHabilidades,
  leerConfiguracionBarraHabilidades,
  eliminarConfiguracionBarraHabilidades,
} from "../../juego/habilidades/PersistenciaBarraHabilidades.js";
import {
  crearCasillasFormaImpacto,
  ORIENTACIONES_LINEA,
  TIPOS_FORMA_IMPACTO,
} from "../../juego/habilidades/GeometriaHabilidades.js";
import {
  IDS_RESISTENCIA_EFECTO,
  normalizarInmunidadesEfectos,
  normalizarResistenciaEfecto,
} from "../../juego/efectos/ResistenciasEfectos.js";

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
const HABILIDADES_AVANZADAS = Object.freeze([
  "incinerar",
  "rafaga_glacial",
  "descarga_fulminante",
  "plaga_corrosiva",
]);
const HABILIDADES_JUGABLES = Object.freeze([
  ...HABILIDADES_BASICAS,
  ...HABILIDADES_INTERMEDIAS,
  ...HABILIDADES_AVANZADAS,
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
      inyectarExperienciaMaestriaParaPrueba(contexto.obtenerJugador(), datos),
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
    prepararEnemigosEnLineaParaPrueba: (configuracion) =>
      prepararEnemigosEnLineaParaPrueba(contexto, configuracion),
    establecerVidaObjetivoParaPrueba: ({ objetivo, valor } = {}) =>
      establecerVidaObjetivoParaPrueba({ objetivo, valor }),
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
    validarContratos: () => validarContratosHabilidades(contexto),
  });

  const efectos = Object.freeze({
    obtenerCatalogo: () =>
      contexto.obtenerIntegracion().configuracionEjecucion?.efectos ?? {},
    obtenerActivos: (objetivo = contexto.obtenerJugador()) =>
      obtenerEfectosActivos(contexto.obtenerJuego(), objetivo),
    obtenerDefensas: (objetivo = contexto.obtenerJugador()) =>
      obtenerDefensasEfectos(objetivo),
    establecerResistenciaParaPrueba: ({
      objetivo = contexto.obtenerJugador(),
      id,
      valor,
    } = {}) => {
      const resultado = establecerResistenciaEfectoParaPrueba({
        objetivo,
        id,
        valor,
      });
      contexto.obtenerIntegracion().panel?.renderizar?.();
      return resultado;
    },
    establecerInmunidadesParaPrueba: ({
      objetivo = contexto.obtenerJugador(),
      inmunidades = [],
    } = {}) => {
      const defensas = establecerInmunidadesEfectosParaPrueba({
        objetivo,
        inmunidades,
      });
      const retiro = contexto
        .obtenerJuego()
        .coordinadorTiempo?.sincronizarInmunidadesEfectos?.(objetivo) ?? {
        cantidad: 0,
        eventos: [],
      };
      contexto.obtenerIntegracion().panel?.renderizar?.();
      return { ...defensas, retiro };
    },
    retirarActivos: (objetivo = contexto.obtenerJugador()) =>
      contexto
        .obtenerJuego()
        .coordinadorTiempo?.retirarEfectosTemporales?.(objetivo, {
          motivo: "depuracion",
        }) ?? { cantidad: 0, eventos: [] },
    validarContratos: () => validarContratosEfectos(contexto),
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

  const zonas = Object.freeze({
    obtenerActivas: () => contexto.obtenerJuego().obtenerZonasTemporales(),
    crearLineaParaPrueba: (configuracion) =>
      crearZonaLinealParaPrueba(contexto, configuracion),
    notificarMovimientoParaPrueba: ({ actor, origen, destino } = {}) =>
      contexto.obtenerJuego().notificarMovimientoActor({
        actor: actor ?? contexto.obtenerJugador(),
        origen,
        destino,
      }),
    validarContratos: () => validarContratosZonas(contexto),
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
        habilidadesAvanzadas: [...HABILIDADES_AVANZADAS],
      };
    },
    validarContratos: () => validarContratosInterfaz(contexto),
  });

  const arquitectura = Object.freeze({
    obtenerResumen: () => crearResumenArquitectura(contexto),
    validarCicloActivo: () => validarCicloActivo(contexto),
  });

  const balance = crearAccesoBalance(contexto);

  const magia = Object.freeze({
    progreso,
    persistencia,
    habilidades,
    efectos,
    barra,
    catalizadores,
    zonas,
    interfaz,
    arquitectura,
    balance,
    validarTodo: () => {
      const resultados = {
        progreso: progreso.validarContratos(),
        habilidades: habilidades.validarContratos(),
        efectos: efectos.validarContratos(),
        barra: barra.validarPersistencia(),
        catalizadores: catalizadores.validarContratos(),
        zonas: zonas.validarContratos(),
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

function crearAccesoBalance(contexto) {
  let aplicacionCache = null;
  let promesaAnalizador = null;

  async function obtenerAnalizador() {
    const aplicacion = contexto.obtenerAplicacion();

    if (aplicacion !== aplicacionCache || promesaAnalizador === null) {
      aplicacionCache = aplicacion;
      promesaAnalizador = Promise.all([
        import("../balance/AnalizadorBalanceJuego.js"),
        cargarObjetivosBalance(),
      ]).then(([moduloBalance, objetivosBalance]) =>
        moduloBalance.crearAnalizadorBalanceJuego({
          configuracionPersonaje: aplicacion.configuracionPersonaje,
          configuracionEnemigos: aplicacion.configuracionEnemigos,
          configuracionObjetos: aplicacion.configuracionObjetos,
          configuracionGeneracionObjetos:
            aplicacion.configuracionGeneracionObjetos,
          configuracionMapas: aplicacion.configuracionMapas,
          configuracionEntidadesMazmorra:
            aplicacion.configuracionEntidadesMazmorra,
          configuracionProgresoHabilidades: obtenerConfiguracionProgresoHabilidades(),
          configuracionEjecucionHabilidades:
            obtenerConfiguracionEjecucionHabilidades(),
          objetivosBalance,
        }),
      );
    }

    return promesaAnalizador;
  }

  const ejecutar = (metodo) => async () => {
    const analizador = await obtenerAnalizador();
    return analizador[metodo]();
  };

  return Object.freeze({
    lineaBase: ejecutar("lineaBase"),
    progresion: ejecutar("progresion"),
    maestrias: ejecutar("maestrias"),
    progresionMagica: ejecutar("progresionMagica"),
    puntosHabilidad: ejecutar("puntosHabilidad"),
    mana: ejecutar("mana"),
    sostenibilidadMana: ejecutar("sostenibilidadMana"),
    habilidades: ejecutar("habilidades"),
    armas: ejecutar("armas"),
    combate: ejecutar("combate"),
    danioArmas: ejecutar("danioArmas"),
    danioHabilidades: ejecutar("danioHabilidades"),
    potenciaHabilidad: ejecutar("potenciaHabilidad"),
    arquetipos: ejecutar("arquetipos"),
    pruebasFocalizadas: ejecutar("pruebasFocalizadas"),
    efectos: ejecutar("efectos"),
    probabilidadesEfectos: ejecutar("probabilidadesEfectos"),
    contratosEfectos: ejecutar("contratosEfectos"),
    inmunidadesEfectos: ejecutar("inmunidadesEfectos"),
    enemigosResistencias: ejecutar("enemigosResistencias"),
    afijosResistencias: ejecutar("afijosResistencias"),
    regresion: ejecutar("regresion"),
    constitucion: ejecutar("constitucion"),
    escenariosTeoricos: ejecutar("escenariosTeoricos"),
  });
}

function cargarObjetivosBalance() {
  return cargarJson(
    "./src/herramientas/balance/ObjetivosBalance.json",
    "ObjetivosBalance.json",
    { cache: "no-store" },
  );
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
      const controlador = acceso.obtenerControladorPartida();
      const integracion = obtenerIntegracionHabilidadesActiva(controlador);
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

function obtenerIntegracionHabilidadesActiva(controlador) {
  return (
    controlador?.presentacionMapaActivo?.obtenerIntegracionHabilidades?.() ??
    null
  );
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
    zonasTemporales: juego.obtenerZonasTemporales(),
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
  const habilidadesOriginalesActivas = HABILIDADES_JUGABLES.filter((id) => {
    const habilidad = configuracion?.habilidades?.[id];
    return habilidad?.tipo === "activa" && Boolean(habilidad?.ejecucion);
  });
  comprobar(
    comprobaciones,
    "Las doce habilidades mágicas originales permanecen activas",
    habilidadesOriginalesActivas.length === HABILIDADES_JUGABLES.length,
    habilidadesOriginalesActivas,
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
  for (const id of HABILIDADES_AVANZADAS) {
    const definicion = configuracion?.habilidades?.[id];
    comprobar(
      comprobaciones,
      `${id} se desbloquea en nivel de maestría 6`,
      definicion?.requisitoNivelMaestria === 6,
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

  const contratosAvanzados = {
    incinerar: { objetivo: "enemigo", forma: "linea" },
    rafaga_glacial: { objetivo: "enemigo", forma: "individual" },
    descarga_fulminante: { objetivo: "enemigo", forma: "linea" },
    plaga_corrosiva: { objetivo: "enemigo", forma: "individual" },
  };
  for (const id of HABILIDADES_AVANZADAS) {
    const habilidad = catalogo[id];
    const contrato = contratosAvanzados[id];
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

  const gradosNube = Object.values(
    catalogo.nube_toxica?.ejecucion?.grados ?? {},
  );
  comprobar(
    comprobaciones,
    "Nube tóxica declara una zona temporal en sus tres grados",
    gradosNube.length === 3 &&
      gradosNube.every(
        (grado) =>
          grado?.zonaTemporal &&
          grado.zonaTemporal.activadores?.includes("al_crear") &&
          grado.zonaTemporal.activadores?.includes("al_entrar") &&
          grado.zonaTemporal.activadores?.includes("por_intervalo"),
      ),
    gradosNube.map((grado) => grado?.zonaTemporal ?? null),
  );

  comprobar(
    comprobaciones,
    "El sistema expone tiradas deterministas sin reemplazar Math.random",
    typeof sistema.configurarTiradasDeterministas === "function" &&
      typeof sistema.restaurarTiradasAleatorias === "function" &&
      Array.isArray(sistema.obtenerEstadoTiradasDeterministas()?.efecto),
    sistema.obtenerEstadoTiradasDeterministas(),
  );
  return cerrarComprobaciones(comprobaciones);
}

function validarContratosEfectos(contexto) {
  const integracion = contexto.obtenerIntegracion();
  const catalogo = integracion.configuracionEjecucion?.efectos ?? {};
  const comprobaciones = [];

  comprobar(
    comprobaciones,
    "El catálogo canónico conserva las cuatro resistencias de efecto individuales",
    IDS_RESISTENCIA_EFECTO.every((id) => Boolean(catalogo[id])),
    Object.keys(catalogo),
  );

  const maldiciones = Object.entries(catalogo).filter(([, efecto]) =>
    efecto?.etiquetas?.includes("maldicion"),
  );
  comprobar(
    comprobaciones,
    "Todas las maldiciones configuradas usan Resistencia Mental",
    maldiciones.length > 0 &&
      maldiciones.every(([, efecto]) =>
        efecto?.resistencia?.id === "mental" &&
        efecto?.resistencia?.modo === "reducir_probabilidad_aplicacion"
      ),
    maldiciones.map(([id, efecto]) => ({ id, resistencia: efecto.resistencia })),
  );

  for (const id of IDS_RESISTENCIA_EFECTO) {
    const efecto = catalogo[id];
    comprobar(
      comprobaciones,
      `${id} reduce la probabilidad mediante su resistencia homónima`,
      efecto?.resistencia?.id === id &&
        efecto?.resistencia?.modo === "reducir_probabilidad_aplicacion",
      efecto?.resistencia ?? null,
    );
    comprobar(
      comprobaciones,
      `${id} usa una inmunidad explícita y elimina el estado al adquirirla`,
      efecto?.inmunidadId === id &&
        efecto?.eliminarAlAdquirirInmunidad === true,
      {
        inmunidadId: efecto?.inmunidadId ?? null,
        eliminarAlAdquirirInmunidad:
          efecto?.eliminarAlAdquirirInmunidad ?? null,
      },
    );
  }

  const envenenamiento = catalogo.envenenamiento;
  comprobar(
    comprobaciones,
    "Envenenamiento centraliza refresco e intensificación",
    Boolean(
      envenenamiento?.perfilesAplicacion?.refrescar_mayor_potencia &&
      envenenamiento?.perfilesAplicacion?.intensificar,
    ),
    Object.keys(envenenamiento?.perfilesAplicacion ?? {}),
  );

  comprobar(
    comprobaciones,
    "Congelamiento y Aturdimiento rechazan la renovación mientras están activos",
    ["congelamiento", "aturdimiento"].every(
      (id) =>
        catalogo[id]?.perfilesAplicacion?.ignorar_mientras_activo
          ?.politicaAcumulacion === "rechazar_duplicado",
    ),
    {
      congelamiento: catalogo.congelamiento?.perfilesAplicacion ?? null,
      aturdimiento: catalogo.aturdimiento?.perfilesAplicacion ?? null,
    },
  );

  comprobar(
    comprobaciones,
    "Congelamiento, Aturdimiento y Parálisis comparten el bloqueo total",
    ["congelamiento", "aturdimiento", "paralisis"].every(
      (id) => catalogo[id]?.tipo === "bloqueo_total",
    ),
    {
      congelamiento: catalogo.congelamiento?.tipo ?? null,
      aturdimiento: catalogo.aturdimiento?.tipo ?? null,
      paralisis: catalogo.paralisis?.tipo ?? null,
    },
  );
  comprobar(
    comprobaciones,
    "Silencio bloquea solo habilidades",
    catalogo.silencio?.tipo === "bloqueo_habilidades",
    catalogo.silencio?.tipo ?? null,
  );
  comprobar(
    comprobaciones,
    "Quemadura y Congelamiento declaran su contraefecto en el catálogo",
    catalogo.quemadura?.eliminaEfectosAlAplicarse?.includes("congelamiento") &&
      catalogo.congelamiento?.eliminaEfectosAlAplicarse?.includes("quemadura"),
    {
      quemadura: catalogo.quemadura?.eliminaEfectosAlAplicarse ?? null,
      congelamiento: catalogo.congelamiento?.eliminaEfectosAlAplicarse ?? null,
    },
  );

  return cerrarComprobaciones(comprobaciones);
}

function validarContratosZonas(contexto) {
  const juego = contexto.obtenerJuego();
  const integracion = contexto.obtenerIntegracion();
  const catalogo = integracion.configuracionEjecucion?.habilidades ?? {};
  const gradosNube = Object.values(
    catalogo.nube_toxica?.ejecucion?.grados ?? {},
  );
  const comprobaciones = [];

  comprobar(
    comprobaciones,
    "Existe un único sistema de zonas ligado al coordinador temporal",
    juego.sistemaZonasTemporales ===
      juego.coordinadorTiempo?.sistemaZonasTemporales &&
      typeof juego.crearZonaTemporal === "function" &&
      typeof juego.obtenerZonasTemporales === "function",
    juego.sistemaZonasTemporales?.constructor?.name ?? null,
  );
  comprobar(
    comprobaciones,
    "Nube tóxica persiste mediante configuración y no por su nombre",
    gradosNube.length === 3 &&
      gradosNube.every(
        (grado) =>
          grado?.zonaTemporal?.apariencia === "veneno" &&
          grado.zonaTemporal.duracion > grado.zonaTemporal.intervalo &&
          grado.danio.length === 0 &&
          grado.efectos.length > 0,
      ),
    gradosNube.map((grado) => ({
      duracion: grado?.zonaTemporal?.duracion,
      intervalo: grado?.zonaTemporal?.intervalo,
      apariencia: grado?.zonaTemporal?.apariencia,
    })),
  );
  comprobar(
    comprobaciones,
    "La geometría genérica admite líneas hacia el objetivo y perpendiculares",
    TIPOS_FORMA_IMPACTO.LINEA === "linea" &&
      ORIENTACIONES_LINEA.HACIA_OBJETIVO === "hacia_objetivo" &&
      ORIENTACIONES_LINEA.PERPENDICULAR === "perpendicular",
    {
      tipo: TIPOS_FORMA_IMPACTO.LINEA,
      orientaciones: Object.values(ORIENTACIONES_LINEA),
    },
  );
  comprobar(
    comprobaciones,
    "Las zonas activas exponen un estado visual plano",
    Array.isArray(juego.obtenerZonasTemporales()),
    juego.obtenerZonasTemporales(),
  );

  return cerrarComprobaciones(comprobaciones);
}

function crearZonaLinealParaPrueba(
  contexto,
  {
    x,
    y,
    longitud = 3,
    ancho = 1,
    orientacion = ORIENTACIONES_LINEA.PERPENDICULAR,
    duracion = 300,
    intervalo = 100,
    apariencia = "veneno",
  } = {},
) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error(
      "La zona lineal de prueba necesita coordenadas enteras x e y.",
    );
  }

  const juego = contexto.obtenerJuego();
  const jugador = contexto.obtenerJugador();
  const integracion = contexto.obtenerIntegracion();
  const gradoNube =
    integracion.configuracionEjecucion?.habilidades?.nube_toxica?.ejecucion
      ?.grados?.[1];
  if (!gradoNube) {
    throw new Error("No existe una configuración ejecutable de Nube tóxica.");
  }

  const casillas = crearCasillasFormaImpacto({
    mapa: juego.map,
    jugador,
    centro: { x, y },
    formaImpacto: {
      tipo: TIPOS_FORMA_IMPACTO.LINEA,
      longitud,
      ancho,
      orientacion,
    },
  });

  const resultado = juego.crearZonaTemporal({
    idEjecucion: `depuracion-linea-${juego.tiempoActual}-${x}-${y}`,
    idHabilidad: "zona_lineal_prueba",
    nombre: "Zona lineal de prueba",
    grado: 1,
    fuente: jugador,
    hostil: false,
    casillas,
    configuracion: {
      ...gradoNube.zonaTemporal,
      duracion,
      intervalo,
      apariencia,
      grupoSuperposicion: "zona_lineal_prueba",
    },
    contenido: {
      danio: gradoNube.danio,
      efectos: gradoNube.efectos,
    },
    contextoPotencia: crearContextoPotenciaHabilidad({
      combatiente: jugador,
    }),
  });
  contexto.obtenerControladorPartida().renderizador?.dibujarJuego(juego);
  return resultado;
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
  const entrada = integracion.puntero;
  comprobar(
    comprobaciones,
    "Existe un único controlador de entrada destruible",
    Boolean(entrada) && typeof entrada.destruir === "function",
    entrada?.constructor?.name,
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
  const integracion = obtenerIntegracionHabilidadesActiva(controlador);
  const entrada = integracion?.puntero ?? null;
  return {
    partidaIniciada: controlador.partidaIniciada === true,
    juegoActivo: Boolean(controlador.juego),
    integracionActiva: Boolean(integracion && !integracion.destruida),
    sistemaActivo: Boolean(
      integracion?.sistema && !integracion.sistema.destruido,
    ),
    barraActiva: Boolean(integracion?.barra),
    panelActivo: Boolean(integracion?.panel),
    entradaActiva: Boolean(entrada),
    sistemaZonasActivo: Boolean(
      controlador.juego?.sistemaZonasTemporales &&
      !controlador.juego.sistemaZonasTemporales.destruido,
    ),
    cantidadZonasActivas:
      controlador.juego?.obtenerZonasTemporales?.().length ?? 0,
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
      resumen.entradaActiva &&
      resumen.sistemaZonasActivo,
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

function prepararEnemigosEnLineaParaPrueba(
  contexto,
  { cantidad = 3, distanciaInicial = 1, separacion = 1 } = {},
) {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw new Error("La cantidad de enemigos debe ser un entero mayor que 0.");
  }
  if (!Number.isInteger(distanciaInicial) || distanciaInicial < 1) {
    throw new Error("La distancia inicial debe ser un entero mayor que 0.");
  }
  if (!Number.isInteger(separacion) || separacion < 1) {
    throw new Error("La separación debe ser un entero mayor que 0.");
  }

  const juego = contexto.obtenerJuego();
  const jugador = contexto.obtenerJugador();
  const enemigos = contexto.obtenerSistema().obtenerEnemigosVivos();
  if (enemigos.length < cantidad) {
    throw new Error(
      `La partida necesita al menos ${cantidad} enemigos vivos para la prueba.`,
    );
  }

  const direcciones = [
    { dx: 1, dy: 0, nombre: "este" },
    { dx: -1, dy: 0, nombre: "oeste" },
    { dx: 0, dy: 1, nombre: "sur" },
    { dx: 0, dy: -1, nombre: "norte" },
    { dx: 1, dy: 1, nombre: "sureste" },
    { dx: -1, dy: 1, nombre: "suroeste" },
    { dx: 1, dy: -1, nombre: "noreste" },
    { dx: -1, dy: -1, nombre: "noroeste" },
  ];

  const direccion = direcciones.find(({ dx, dy }) =>
    Array.from({ length: cantidad }, (_, indice) => {
      const distancia = distanciaInicial + indice * separacion;
      return {
        x: jugador.x + dx * distancia,
        y: jugador.y + dy * distancia,
      };
    }).every(
      ({ x, y }) =>
        juego.sistemaEspacial?.consultarTerreno(x, y)?.dentroMapa === true &&
        juego.sistemaEspacial.consultarTerreno(x, y).bloqueaMovimiento === false,
    ),
  );

  if (!direccion) {
    throw new Error(
      "No existe una línea de suelo suficiente alrededor del jugador.",
    );
  }

  const posiciones = [];
  for (let indice = 0; indice < cantidad; indice += 1) {
    const enemigo = enemigos[indice];
    const distancia = distanciaInicial + indice * separacion;
    enemigo.x = jugador.x + direccion.dx * distancia;
    enemigo.y = jugador.y + direccion.dy * distancia;
    posiciones.push({
      indice,
      nombre: enemigo.nombre,
      x: enemigo.x,
      y: enemigo.y,
      distancia,
    });
  }

  contexto.obtenerControladorPartida().renderizador?.dibujarJuego(juego);
  return {
    direccion: direccion.nombre,
    jugador: { x: jugador.x, y: jugador.y },
    posiciones,
  };
}

function establecerVidaObjetivoParaPrueba({ objetivo, valor } = {}) {
  if (!objetivo || typeof objetivo !== "object") {
    throw new Error("Debe indicarse un objetivo válido.");
  }
  if (!Number.isFinite(valor) || valor < 1) {
    throw new Error(
      "La Vida de prueba debe ser un número mayor o igual que 1.",
    );
  }
  const maximoActual =
    objetivo.estadisticasDerivadas?.vidaMaxima ?? objetivo.vidaMaxima ?? 0;
  if (
    maximoActual < valor &&
    Number.isFinite(objetivo.estadisticasBase?.vida)
  ) {
    objetivo.estadisticasBase.vida += valor - maximoActual;
  }
  const maximoFinal =
    objetivo.estadisticasDerivadas?.vidaMaxima ?? objetivo.vidaMaxima ?? valor;
  objetivo.vidaActual = Math.min(valor, maximoFinal);
  return {
    nombre: objetivo.nombre ?? "Objetivo",
    vidaActual: objetivo.vidaActual,
    vidaMaxima: maximoFinal,
  };
}

function obtenerDefensasEfectos(objetivo) {
  const estadisticas =
    objetivo?.estadisticasDerivadas ?? objetivo?.estadisticasBase ?? {};
  return {
    resistencias: Object.fromEntries(
      IDS_RESISTENCIA_EFECTO.map((id) => [
        id,
        estadisticas.resistenciasEfectos?.[id] ?? 0,
      ]),
    ),
    inmunidades: [...(estadisticas.inmunidadesEfectos ?? [])],
  };
}

function establecerResistenciaEfectoParaPrueba({ objetivo, id, valor } = {}) {
  if (!objetivo?.estadisticasBase) {
    throw new Error("El objetivo no expone estadísticas base modificables.");
  }
  if (!IDS_RESISTENCIA_EFECTO.includes(id)) {
    throw new Error(`La resistencia a efectos "${id}" no existe.`);
  }
  const normalizada = normalizarResistenciaEfecto(
    valor,
    `La resistencia de prueba a ${id}`,
  );
  objetivo.estadisticasBase.resistenciasEfectos = {
    ...(objetivo.estadisticasBase.resistenciasEfectos ?? {}),
    [id]: normalizada,
  };
  return obtenerDefensasEfectos(objetivo);
}

function establecerInmunidadesEfectosParaPrueba({
  objetivo,
  inmunidades = [],
} = {}) {
  if (!objetivo?.estadisticasBase) {
    throw new Error("El objetivo no expone estadísticas base modificables.");
  }
  objetivo.estadisticasBase.inmunidadesEfectos =
    normalizarInmunidadesEfectos(inmunidades);
  return obtenerDefensasEfectos(objetivo);
}

function actualizarInterfazYPersistenciaBarra(integracion) {
  integracion.guardarBarra();
  integracion.panel?.renderizar?.();
}

function obtenerResumenProgreso(jugador) {
  if (typeof jugador?.obtenerResumenProgresoHabilidades !== "function") {
    return null;
  }
  return jugador.obtenerResumenProgresoHabilidades();
}

function obtenerProgreso(jugador) {
  const progreso = jugador?.progresoHabilidades;
  if (!progreso || typeof progreso.obtenerResumen !== "function") {
    throw new Error("El jugador no expone ProgresoHabilidadesJugador.");
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
  if (typeof jugador?.registrarExperienciaMaestria !== "function") {
    throw new Error("El jugador no expone el registro canónico de XP de maestría.");
  }
  return jugador.registrarExperienciaMaestria(evento);
}

function inyectarExperienciaMaestriaParaPrueba(jugador, datos) {
  const progreso = obtenerProgreso(jugador);
  if (typeof progreso.agregarExperienciaMaestria !== "function") {
    throw new Error(
      "El progreso no permite inyectar XP de maestría para pruebas.",
    );
  }
  return progreso.agregarExperienciaMaestria(datos);
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
      "El progreso de habilidades no permite preparar una prueba aislada.",
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
