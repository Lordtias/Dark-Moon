import { IntegracionHabilidadesEtapa5 } from "./IntegracionHabilidadesEtapa5.js";

const integraciones = new WeakMap();
let instalacionProgramada = false;
let juegoActivo = null;
let configuracionEjecucionActiva = null;

// Instala la etapa sin duplicar el ciclo de partida. La instrumentación sólo
// descubre instancias ya creadas de Juego y les adjunta el adaptador; todas las
// reglas de combate, tiempo y progresión continúan en sus sistemas originales.
export function programarInstalacionEtapa5(configuracionEjecucion) {
  if (configuracionEjecucion?.habilidades) {
    configuracionEjecucionActiva = configuracionEjecucion;
  }
  if (!configuracionEjecucionActiva) {
    throw new Error("Falta la configuración de ejecución para instalar ETAPA 5.");
  }
  if (instalacionProgramada) {
    return;
  }
  instalacionProgramada = true;

  window.setTimeout(async () => {
    try {
      const moduloJuego = await import("../Juego.js");
      const Juego = moduloJuego.Juego ?? moduloJuego.default;
      if (Juego?.prototype) {
        instrumentarPrototipoJuego(Juego.prototype);
      }
    } catch (error) {
      console.error("[Dark Moon · ETAPA 5] No se pudo instrumentar Juego.", error);
    }

    try {
      const moduloControlador = await import("../../controles/ControladorPartida.js");
      const ControladorPartida =
        moduloControlador.ControladorPartida ?? moduloControlador.default;
      if (ControladorPartida?.prototype) {
        instrumentarPrototipoControlador(ControladorPartida.prototype);
      }
    } catch (error) {
      console.warn(
        "[Dark Moon · ETAPA 5] El descubrimiento por ControladorPartida no está disponible.",
        error,
      );
    }
  }, 0);
}

export function registrarJuegoParaHabilidades(juego) {
  if (!pareceJuego(juego)) {
    return null;
  }

  juegoActivo = juego;
  if (integraciones.has(juego)) {
    return integraciones.get(juego);
  }

  if (!configuracionEjecucionActiva) {
    return null;
  }

  const integracion = new IntegracionHabilidadesEtapa5({
    juego,
    esJuegoActivo: () => juegoActivo === juego,
    configuracionEjecucion: configuracionEjecucionActiva,
  });
  integraciones.set(juego, integracion);
  protegerDestruccion(juego, integracion);
  return integracion;
}

function instrumentarPrototipoJuego(prototipo) {
  const nombres = [
    "moverJugador",
    "esperarTurno",
    "entrarModoCombate",
    "moverSelectorCombate",
    "confirmarAtaque",
    "entrarModoInteraccion",
    "interactuar",
    "equiparObjetoJugador",
    "desequiparObjetoJugador",
    "usarObjetoJugador",
  ];

  for (const nombre of nombres) {
    envolverMetodo(prototipo, nombre, function registrarAntes() {
      registrarJuegoParaHabilidades(this);
    });
  }

  for (const nombre of ["modoCombate", "modoInteraccion", "tiempoActual", "estaEnCombate"]) {
    envolverGetter(prototipo, nombre);
  }
}

function instrumentarPrototipoControlador(prototipo) {
  for (const nombre of Object.getOwnPropertyNames(prototipo)) {
    if (nombre === "constructor") {
      continue;
    }
    envolverMetodo(prototipo, nombre, function descubrirDespues(resultado) {
      const registrar = () => descubrirJuegos(this).forEach(registrarJuegoParaHabilidades);
      if (resultado && typeof resultado.then === "function") {
        resultado.finally(registrar);
      } else {
        queueMicrotask(registrar);
      }
    }, true);
  }
}

function envolverMetodo(prototipo, nombre, accion, ejecutarDespues = false) {
  const descriptor = Object.getOwnPropertyDescriptor(prototipo, nombre);
  if (!descriptor || typeof descriptor.value !== "function" || descriptor.value.__etapa5) {
    return;
  }

  const original = descriptor.value;
  const envuelto = function metodoInstrumentado(...argumentos) {
    if (!ejecutarDespues) {
      accion.call(this);
    }
    const resultado = original.apply(this, argumentos);
    if (ejecutarDespues) {
      accion.call(this, resultado);
    }
    return resultado;
  };
  Object.defineProperty(envuelto, "__etapa5", { value: true });
  Object.defineProperty(prototipo, nombre, { ...descriptor, value: envuelto });
}

function envolverGetter(prototipo, nombre) {
  const descriptor = Object.getOwnPropertyDescriptor(prototipo, nombre);
  if (!descriptor?.get || descriptor.get.__etapa5) {
    return;
  }

  const original = descriptor.get;
  const getter = function getterInstrumentado() {
    registrarJuegoParaHabilidades(this);
    return original.call(this);
  };
  Object.defineProperty(getter, "__etapa5", { value: true });
  Object.defineProperty(prototipo, nombre, { ...descriptor, get: getter });
}

function descubrirJuegos(raiz) {
  const encontrados = new Set();
  const visitados = new WeakSet();

  function visitar(valor, profundidad) {
    if (!valor || typeof valor !== "object" || visitados.has(valor) || profundidad > 3) {
      return;
    }
    visitados.add(valor);
    if (pareceJuego(valor)) {
      encontrados.add(valor);
      return;
    }
    let propiedades = [];
    try {
      propiedades = Object.values(valor);
    } catch {
      return;
    }
    for (const propiedad of propiedades) {
      visitar(propiedad, profundidad + 1);
    }
  }

  visitar(raiz, 0);
  return [...encontrados];
}

function pareceJuego(valor) {
  return Boolean(
    valor?.jugador &&
      valor?.mapa &&
      (typeof valor.finalizarResultadoAccionJugador === "function" ||
        typeof valor.finalizarAccionJugador === "function") &&
      (typeof valor.obtenerObjetivoEn === "function" || Array.isArray(valor.objetivos)),
  );
}

function protegerDestruccion(juego, integracion) {
  if (typeof juego.destruir !== "function" || juego.destruir.__etapa5) {
    return;
  }
  const original = juego.destruir;
  const destruccion = function destruirConHabilidades(...argumentos) {
    integracion.destruir();
    if (juegoActivo === this) {
      juegoActivo = null;
    }
    return original.apply(this, argumentos);
  };
  Object.defineProperty(destruccion, "__etapa5", { value: true });
  Object.defineProperty(juego, "destruir", {
    configurable: true,
    writable: true,
    value: destruccion,
  });
}
