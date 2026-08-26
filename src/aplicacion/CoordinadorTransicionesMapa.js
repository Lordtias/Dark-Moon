import { validarConfiguracionMapa } from "./ValidacionConfiguracionMapa.js";

// Controla el ciclo asíncrono de una transición de mapa. La sesión conserva
// la creación y propiedad del Juego; este coordinador sólo administra Loading,
// cancelación, orden de activación y recuperación visual.
export class CoordinadorTransicionesMapa {
  constructor({
    presentadorCargaMapa,
    controladorPantallas,
    invalidarEntrada,
    obtenerPresentacionMapaActivo,
    activarMapaPreparado,
  } = {}) {
    validarPresentadorCargaMapa(presentadorCargaMapa);
    validarFuncion(invalidarEntrada, "invalidarEntrada");
    validarFuncion(
      obtenerPresentacionMapaActivo,
      "obtenerPresentacionMapaActivo",
    );
    validarFuncion(activarMapaPreparado, "activarMapaPreparado");

    this.presentadorCargaMapa = presentadorCargaMapa;
    this.controladorPantallas = controladorPantallas;
    this.invalidarEntrada = invalidarEntrada;
    this.obtenerPresentacionMapaActivo = obtenerPresentacionMapaActivo;
    this.activarMapaPreparado = activarMapaPreparado;
    this.versionPreparacionMapa = 0;
    this.preparacionMapaActiva = null;
    this.promesaPreparacionMapa = null;
  }

  iniciar({ crearConfiguracionMapa, alMapaActivado = null } = {}) {
    if (typeof crearConfiguracionMapa !== "function") {
      throw new Error("La preparación de mapa necesita una fábrica válida.");
    }
    if (alMapaActivado !== null && typeof alMapaActivado !== "function") {
      throw new Error("El cierre de preparación de mapa debe ser una función.");
    }

    const token = Object.freeze({ id: ++this.versionPreparacionMapa });
    this.preparacionMapaActiva = token;

    // Se corta la entrada antes de ceder el hilo al navegador. Así no existe
    // una ventana donde el jugador o un clic tardío puedan actuar bajo Loading.
    this.invalidarEntrada();
    this.obtenerPresentacionMapaActivo()?.suspender?.();

    const promesa = this.ejecutar({
      token,
      crearConfiguracionMapa,
      alMapaActivado,
    }).catch((error) => this.manejarError({ token, error }));

    this.promesaPreparacionMapa = promesa;
    return true;
  }

  async ejecutar({ token, crearConfiguracionMapa, alMapaActivado }) {
    await this.presentadorCargaMapa.mostrar({ idCarga: token });
    if (!this.esActiva(token)) return false;

    const configuracionMapa = crearConfiguracionMapa();
    validarConfiguracionMapa(configuracionMapa);
    this.presentadorCargaMapa.actualizar({ idCarga: token, progreso: 0.12 });

    await this.activarMapaPreparado(configuracionMapa, {
      token,
      alProgreso: ({ progreso = 0 } = {}) => {
        if (!this.esActiva(token)) return;
        this.presentadorCargaMapa.actualizar({
          idCarga: token,
          progreso: 0.12 + Math.min(1, Math.max(0, progreso)) * 0.78,
        });
      },
    });

    if (!this.esActiva(token)) return false;
    alMapaActivado?.(configuracionMapa);
    this.presentadorCargaMapa.actualizar({ idCarga: token, progreso: 1 });

    // El mapa ya fue compuesto. Mantenemos la cobertura durante al menos un
    // pintado real y durante el mínimo visual acordado de un segundo.
    await this.presentadorCargaMapa.esperarPintadoMapa({ idCarga: token });
    if (!this.esActiva(token)) return false;
    await this.presentadorCargaMapa.ocultar({ idCarga: token });
    if (!this.esActiva(token)) return false;

    this.obtenerPresentacionMapaActivo()?.activar();
    this.preparacionMapaActiva = null;
    return true;
  }

  async manejarError({ token, error }) {
    console.error("No se pudo preparar el mapa:", error);
    if (!this.esActiva(token)) return false;

    try {
      await this.presentadorCargaMapa.ocultar({ idCarga: token });
    } catch (errorOcultando) {
      console.error("No se pudo cerrar la pantalla de carga:", errorOcultando);
    }

    // Si el mapa anterior todavía conserva su presentación puede recuperar la
    // entrada. En un fallo durante el primer mapa se vuelve al menú principal.
    const presentacionMapaActivo = this.obtenerPresentacionMapaActivo();
    if (presentacionMapaActivo) {
      presentacionMapaActivo.activar();
    } else {
      this.controladorPantallas?.mostrarMenuPrincipal?.();
    }

    this.preparacionMapaActiva = null;
    return false;
  }

  esActiva(token) {
    return this.preparacionMapaActiva === token;
  }

  esperar() {
    return this.promesaPreparacionMapa ?? Promise.resolve(true);
  }
}

function validarPresentadorCargaMapa(presentadorCargaMapa) {
  if (
    !presentadorCargaMapa ||
    typeof presentadorCargaMapa.mostrar !== "function" ||
    typeof presentadorCargaMapa.actualizar !== "function" ||
    typeof presentadorCargaMapa.esperarPintadoMapa !== "function" ||
    typeof presentadorCargaMapa.ocultar !== "function"
  ) {
    throw new Error(
      "CoordinadorTransicionesMapa necesita un presentador de carga de mapa.",
    );
  }
}

function validarFuncion(valor, nombre) {
  if (typeof valor !== "function") {
    throw new Error(`CoordinadorTransicionesMapa necesita "${nombre}".`);
  }
}
