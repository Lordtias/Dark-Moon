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
  crearContextoCatalizador,
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

// Fachada única para las validaciones manuales de magia, habilidades, barra,
// catalizadores e interfaz. Resuelve siempre el contexto activo para no retener
// referencias a mapas o integraciones destruidas.
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
      invocarMejora(contexto.obtenerJugador(), datos),
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
      (Array.isArray(contexto.obtenerJuego().objetivos)
        ? contexto.obtenerJuego().objetivos
        : []
      ).filter((objetivo) => !estaDerrotado(objetivo)),
    obtenerInstantaneaEjecucion: () => crearInstantaneaEjecucion(contexto),
    establecerManaActualParaPrueba: (valor) =>
      establecerMana(contexto.obtenerJugador(), valor),
    procesarEfectosPendientes: () =>
      contexto.obtenerSistema().procesarEfectosPendientes(),
    validarContratos: () => validarContratosHabilidades(contexto),
  });

  const barra = Object.freeze({
    obtener: () => contexto.obtenerSistema().obtenerEstadoBarra(),
    obtenerAsignaciones: () => contexto.obtenerSistema().obtenerAsignaciones(),
    asignar: (ranuraHumana, idHabilidad) => {
      const integracion = contexto.obtenerIntegracion();
      const resultado = integracion.sistema.asignarHabilidad(
        normalizarRanuraHumana(ranuraHumana),
        idHabilidad,
      );
      integracion.guardarBarra();
      integracion.panel.renderizar();
      return resultado;
    },
    desasignar: (ranuraHumana) => {
      const integracion = contexto.obtenerIntegracion();
      const resultado = integracion.sistema.desasignarHabilidad(
        normalizarRanuraHumana(ranuraHumana),
      );
      integracion.guardarBarra();
      integracion.panel.renderizar();
      return resultado;
    },
    mover: (origenHumano, destinoHumano) => {
      const integracion = contexto.obtenerIntegracion();
      const origen = normalizarRanuraHumana(origenHumano);
      const destino = normalizarRanuraHumana(destinoHumano);
      const asignaciones = integracion.sistema.obtenerAsignaciones();
      const idHabilidad = asignaciones[origen];
      if (!idHabilidad) {
        throw new Error("La ranura de origen está vacía.");
      }
      const resultado = integracion.sistema.asignarHabilidad(
        destino,
        idHabilidad,
      );
      integracion.guardarBarra();
      integracion.panel.renderizar();
      return resultado;
    },
    vaciar: () => {
      const integracion = contexto.obtenerIntegracion();
      const resultado = integracion.sistema.vaciarBarra();
      integracion.guardarBarra();
      integracion.panel.renderizar();
      return resultado;
    },
    guardar: () => contexto.obtenerIntegracion().guardarBarra(),
    leerGuardada: () => leerConfiguracionBarraHabilidades(),
    eliminarGuardada: () => eliminarConfiguracionBarraHabilidades(),
    validarPersistencia: () => validarPersistenciaBarra(contexto),
  });

  const catalizadores = Object.freeze({
    obtenerResumen: () =>
      crearResumenCatalizadores({
        juego: contexto.obtenerJuego(),
        jugador: contexto.obtenerJugador(),
      }),
    obtenerConfiguracionAtaque: () =>
      obtenerConfiguracionAtaque(contexto.obtenerJugador()),
    obtenerRequisitosAtaque: () =>
      verificarRequisitosAtaque(contexto.obtenerJugador()),
    validarContratos: () =>
      validarContratosCatalizadores({ juego: contexto.obtenerJuego() }),
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
        seccionesFuturas: {
          basicas: [],
          armas: "En construcción",
          armaduras: ["liviana", "media", "pesada"],
        },
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
      if (!sistema) {
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
  return {
    manaActual: leerNumero(jugador.manaActual ?? jugador.mana),
    manaMaximo: leerNumero(jugador.manaMaximo ?? jugador.manaMaxima),
    tiempoActual: leerNumero(
      typeof juego.tiempoActual === "number"
        ? juego.tiempoActual
        : juego.sistemaTiempo?.tiempoActual,
    ),
    estaEnCombate: Boolean(juego.estaEnCombate),
    experienciaVeneno:
      resumen?.maestrias?.veneno?.experienciaActual ??
      resumen?.maestrias?.veneno?.experiencia ??
      0,
    gradoAguijonToxico:
      resumen?.habilidades?.aguijon_toxico?.grado ??
      sistema
        .obtenerEstadoBarra()
        .find((ranura) => ranura.idHabilidad === "aguijon_toxico")?.grado ??
      0,
    seleccion: sistema.obtenerSeleccionDetallada(),
    ultimaEjecucion: sistema.obtenerUltimaEjecucion(),
    barra: sistema.obtenerEstadoBarra(),
  };
}

function validarContratosProgreso(contexto) {
  const integracion = contexto.obtenerIntegracion();
  const configuracionProgreso = integracion.configuracionProgreso;
  const comprobaciones = [];
  const idsMaestrias = Object.keys(configuracionProgreso.maestrias);
  const habilidades = Object.values(configuracionProgreso.habilidades);
  comprobar(
    comprobaciones,
    "Existen las cuatro maestrías mágicas",
    ELEMENTOS.every((id) => idsMaestrias.includes(id)) &&
      idsMaestrias.length === 4,
    idsMaestrias,
  );
  comprobar(
    comprobaciones,
    "Existen doce habilidades",
    habilidades.length === 12,
    habilidades.length,
  );
  for (const idMaestria of idsMaestrias) {
    const requisitos = habilidades
      .filter((habilidad) => habilidad.maestria === idMaestria)
      .map((habilidad) => habilidad.requisitoNivelMaestria)
      .sort((a, b) => a - b);
    const maximos = habilidades
      .filter((habilidad) => habilidad.maestria === idMaestria)
      .map((habilidad) => habilidad.gradoMaximo)
      .sort((a, b) => b - a);
    comprobar(
      comprobaciones,
      `${idMaestria}: requisitos 0/3/6`,
      JSON.stringify(requisitos) === JSON.stringify([0, 3, 6]),
      requisitos,
    );
    comprobar(
      comprobaciones,
      `${idMaestria}: grados máximos 4/3/3`,
      JSON.stringify(maximos) === JSON.stringify([4, 3, 3]),
      maximos,
    );
  }
  return cerrarComprobaciones(comprobaciones);
}

function validarContratosHabilidades(contexto) {
  const comprobaciones = [];
  const sistema = contexto.obtenerSistema();
  const jugador = contexto.obtenerJugador();
  const integracion = contexto.obtenerIntegracion();
  const idsAsignados = sistema.obtenerAsignaciones().filter(Boolean);
  comprobar(
    comprobaciones,
    "Toda habilidad asignada está aprendida y es jugable",
    idsAsignados.every(
      (id) =>
        integracion.configuracionEjecucion.habilidades[id]?.ejecucion &&
        obtenerGrado(jugador, id) > 0,
    ),
    idsAsignados,
  );
  comprobar(
    comprobaciones,
    "El sistema conserva un único contador de ejecución por jugador",
    typeof sistema.obtenerUltimaEjecucion === "function",
    sistema.obtenerUltimaEjecucion(),
  );
  comprobar(
    comprobaciones,
    "La selección y confirmación usan el mismo sistema activo",
    integracion.sistema === sistema,
    integracion.sistema?.constructor?.name,
  );
  return cerrarComprobaciones(comprobaciones);
}

function validarPersistenciaBarra(contexto) {
  const sistema = contexto.obtenerSistema();
  const comprobaciones = [];
  const barraOriginal = sistema.obtenerAsignaciones();
  const idsAsignados = barraOriginal.filter(Boolean);
  comprobar(
    comprobaciones,
    "La barra contiene diez ranuras",
    barraOriginal.length === 10,
    barraOriginal.length,
  );
  comprobar(
    comprobaciones,
    "No hay habilidades duplicadas en la barra",
    new Set(idsAsignados).size === idsAsignados.length,
    idsAsignados,
  );

  let luegoDeConsultar = [];
  try {
    sistema.vaciarBarra();
    luegoDeConsultar = sistema.obtenerEstadoBarra();
    comprobar(
      comprobaciones,
      "Una barra vacía permanece vacía al consultarla",
      luegoDeConsultar.every((ranura) => ranura.idHabilidad === null),
      luegoDeConsultar.map((ranura) => ranura.idHabilidad),
    );
  } finally {
    sistema.restaurarBarra(barraOriginal);
  }

  const almacenamiento = crearAlmacenamientoMemoria();
  guardarConfiguracionBarraHabilidades({
    ranuras: barraOriginal,
    almacenamiento,
  });
  const restaurada = leerConfiguracionBarraHabilidades({ almacenamiento });
  comprobar(
    comprobaciones,
    "La persistencia conserva las diez ranuras",
    JSON.stringify(restaurada.ranuras) === JSON.stringify(barraOriginal),
    restaurada.ranuras,
  );
  return cerrarComprobaciones(comprobaciones);
}

function validarContratosInterfaz(contexto) {
  const integracion = contexto.obtenerIntegracion();
  const comprobaciones = [];
  comprobar(
    comprobaciones,
    "Existe un único panel conectado al sistema activo",
    Boolean(integracion.panel) &&
      integracion.panel.sistema === integracion.sistema,
    integracion.panel?.constructor?.name,
  );
  comprobar(
    comprobaciones,
    "Existe un único controlador de entrada conectado al sistema activo",
    Boolean(integracion.entrada) &&
      integracion.entrada.sistema === integracion.sistema,
    integracion.entrada?.constructor?.name,
  );
  comprobar(
    comprobaciones,
    "La barra visual usa el sistema activo",
    Boolean(integracion.barra) &&
      integracion.barra.sistema === integracion.sistema,
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
    sistemaActivo: Boolean(integracion?.sistema),
    barraActiva: Boolean(integracion?.barra),
    panelActivo: Boolean(integracion?.panel),
    entradaActiva: Boolean(integracion?.entrada),
    intervaloEfectosActivo: integracion?.intervaloEfectos !== null,
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
    "La integración conserva un solo sistema, barra, panel y entrada",
    resumen.sistemaActivo &&
      resumen.barraActiva &&
      resumen.panelActivo &&
      resumen.entradaActiva,
    resumen,
  );
  comprobar(
    comprobaciones,
    "El intervalo de efectos está activo una sola vez en la integración",
    resumen.intervaloEfectosActivo,
    resumen.intervaloEfectosActivo,
  );
  return cerrarComprobaciones(comprobaciones);
}

function crearResumenCatalizadores({ juego, jugador }) {
  const configuracion = obtenerConfiguracionAtaque(jugador);
  const contexto = crearContextoCatalizador({
    fuentes: configuracion.fuentesDanio,
  });
  return {
    manaActual: numero(jugador.manaActual),
    manaMaximo: numero(jugador.manaMaximo),
    origenAtaque: configuracion.origen,
    esAtaqueDual: configuracion.esAtaqueDual,
    cantidadGolpes: configuracion.cantidadGolpes,
    costoAtaqueBase: configuracion.costoAtaqueBase,
    costoManaAtaqueBasico: configuracion.costoManaAtaqueBasico,
    potenciaHabilidad: contexto.potenciaHabilidad,
    multiplicadorHabilidad: contexto.multiplicadorHabilidad,
    fuentes: configuracion.fuentesDanio.map((fuente) => ({
      nombre: fuente.nombre,
      mano: fuente.mano,
      multiplicadorGolpe: fuente.multiplicadorGolpe,
      familia: fuente.objeto?.familiaObjeto ?? "natural",
      elemento: fuente.propiedades?.elementoAtaqueBasico ?? null,
      potenciaHabilidad: fuente.propiedades?.potenciaHabilidad ?? 0,
    })),
    estaEnCombate: Boolean(juego?.estaEnCombate),
  };
}

function validarContratosCatalizadores({ juego }) {
  const catalogo = juego?.configuracionObjetos;
  validarCatalogoCatalizadores(catalogo);

  const plantillas = Object.entries(catalogo);
  const varitas = plantillas.filter(([, plantilla]) =>
    esVarita(crearObjetoPrueba(plantilla)),
  );
  const bastones = plantillas.filter(([, plantilla]) =>
    esBaston(crearObjetoPrueba(plantilla)),
  );
  const comprobaciones = [];
  comprobar(
    comprobaciones,
    "Hay ocho varitas",
    varitas.length === 8,
    varitas.length,
  );
  comprobar(
    comprobaciones,
    "Hay dos bastones",
    bastones.length === 2,
    bastones.length,
  );
  for (const tier of [1, 2]) {
    const elementos = new Set(
      varitas
        .filter(([, plantilla]) => plantilla.tierBase === tier)
        .map(([, plantilla]) => plantilla.propiedades.elementoAtaqueBasico),
    );
    comprobar(
      comprobaciones,
      `Tier ${tier} contiene cuatro elementos`,
      ELEMENTOS.every((elemento) => elementos.has(elemento)) &&
        elementos.size === 4,
      [...elementos],
    );
  }
  const principal = crearObjetoPrueba(
    catalogo.varita_aprendiz,
    "varita_aprendiz",
  );
  const secundaria = crearObjetoPrueba(
    catalogo.varita_frio_aprendiz,
    "varita_frio_aprendiz",
  );
  const baston = crearObjetoPrueba(catalogo.baston_aprendiz, "baston_aprendiz");
  const unaVarita = crearCombatientePrueba({ arma: principal, mana: 1 });
  const dobleVarita = crearCombatientePrueba({
    arma: principal,
    secundaria,
    mana: 2,
  });
  const dobleSinMana = crearCombatientePrueba({
    arma: principal,
    secundaria,
    mana: 1,
  });
  const conBaston = crearCombatientePrueba({ arma: baston, mana: 0 });
  const configUna = obtenerConfiguracionAtaque(unaVarita);
  const configDoble = obtenerConfiguracionAtaque(dobleVarita);
  const configBaston = obtenerConfiguracionAtaque(conBaston);
  const requisitosSinMana = verificarRequisitosAtaque(dobleSinMana);
  comprobar(
    comprobaciones,
    "Una varita cuesta 1 de Maná",
    configUna.costoManaAtaqueBasico === 1,
    configUna.costoManaAtaqueBasico,
  );
  comprobar(
    comprobaciones,
    "Dos varitas cuestan 2 de Maná",
    configDoble.costoManaAtaqueBasico === 2,
    configDoble.costoManaAtaqueBasico,
  );
  comprobar(
    comprobaciones,
    "Dos varitas usan ataque dual",
    configDoble.esAtaqueDual === true,
    configDoble.esAtaqueDual,
  );
  comprobar(
    comprobaciones,
    "Dos varitas conservan dos fuentes",
    configDoble.fuentesDanio.length === 2,
    configDoble.fuentesDanio.length,
  );
  comprobar(
    comprobaciones,
    "El coste temporal dual usa la regla común",
    configDoble.costoAtaqueBase === 111,
    configDoble.costoAtaqueBase,
  );
  comprobar(
    comprobaciones,
    "Maná parcial rechaza toda la acción",
    requisitosSinMana.disponible === false,
    requisitosSinMana,
  );
  comprobar(
    comprobaciones,
    "El bastón no consume Maná",
    configBaston.costoManaAtaqueBasico === 0,
    configBaston.costoManaAtaqueBasico,
  );
  comprobar(
    comprobaciones,
    "El bastón conserva cuerpo a cuerpo",
    configBaston.propiedadesControladoras.tipoAtaque === "cuerpoACuerpo",
    configBaston.propiedadesControladoras.tipoAtaque,
  );
  const contextoUna = crearContextoCatalizador({
    fuentes: configUna.fuentesDanio,
  });
  const contextoDoble = crearContextoCatalizador({
    fuentes: configDoble.fuentesDanio,
  });
  comprobar(
    comprobaciones,
    "Una varita Tier I aporta 8 %",
    contextoUna.potenciaHabilidad === 8,
    contextoUna.potenciaHabilidad,
  );
  comprobar(
    comprobaciones,
    "Doble varita reutiliza multiplicadores de mano",
    contextoDoble.potenciaHabilidad === 12,
    contextoDoble.potenciaHabilidad,
  );
  return cerrarComprobaciones(comprobaciones);
}

function obtenerResumenProgreso(jugador) {
  const metodos = ["obtenerResumenProgresoMagico", "obtenerResumenMagico"];
  for (const nombre of metodos) {
    if (typeof jugador?.[nombre] === "function") {
      return jugador[nombre]();
    }
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

function invocarMejora(jugador, datos) {
  return invocarProgreso(jugador, "mejorarHabilidad", datos);
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

function establecerMana(jugador, valor) {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error("El Maná de prueba debe ser un número no negativo.");
  }
  if ("manaActual" in jugador) {
    jugador.manaActual = valor;
    return jugador.manaActual;
  }
  if ("mana" in jugador) {
    jugador.mana = valor;
    return jugador.mana;
  }
  throw new Error("El jugador no expone Maná modificable para la prueba.");
}

function normalizarRanuraHumana(valor) {
  if (!Number.isInteger(valor) || valor < 1 || valor > 10) {
    throw new Error("La ranura debe indicarse entre 1 y 10.");
  }
  return valor - 1;
}

function estaDerrotado(objetivo) {
  if (typeof objetivo?.estaDerrotado === "function") {
    return Boolean(objetivo.estaDerrotado());
  }
  return Number.isFinite(objetivo?.vidaActual)
    ? objetivo.vidaActual <= 0
    : false;
}

function crearObjetoPrueba(plantilla, id = null) {
  return {
    ...plantilla,
    id: id ?? plantilla.id ?? plantilla.nombre,
    esArma: plantilla.tipo === "arma",
    propiedades: { ...plantilla.propiedades },
  };
}

function crearCombatientePrueba({ arma = null, secundaria = null, mana = 0 }) {
  const ranuras = { arma, secundaria };
  return {
    nombre: "Combatiente de prueba",
    manaActual: mana,
    ataqueNaturalForzado: false,
    ataqueNatural: {
      danioFisicoMinimo: 1,
      danioFisicoMaximo: 2,
      atributoAtaque: "fuerza",
      precision: 0,
      alcance: 1,
      tipoAtaque: "cuerpoACuerpo",
      patronAtaque: "adyacente",
      probabilidadCritico: 5,
      multiplicadorCritico: 1.5,
      costoAtaque: 100,
    },
    equipamiento: {
      tieneRanura: (nombre) =>
        Object.prototype.hasOwnProperty.call(ranuras, nombre),
      obtenerObjetoEnRanura: (nombre) => ranuras[nombre] ?? null,
    },
  };
}

function crearAlmacenamientoMemoria() {
  const datos = new Map();
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
  };
}

function comprobar(lista, nombre, condicion, valor) {
  lista.push(Object.freeze({ nombre, exito: Boolean(condicion), valor }));
}

function cerrarComprobaciones(comprobaciones) {
  const aprobadas = comprobaciones.filter((item) => item.exito).length;
  return Object.freeze({
    aprobado: aprobadas === comprobaciones.length,
    exito: aprobadas === comprobaciones.length,
    aprobadas,
    total: comprobaciones.length,
    comprobaciones,
  });
}

function resultadoAprobado(resultado) {
  return resultado?.aprobado === true || resultado?.exito === true;
}

function numero(valor) {
  return Number.isFinite(valor) ? valor : 0;
}

function leerNumero(valor) {
  return Number.isFinite(valor) ? valor : 0;
}
