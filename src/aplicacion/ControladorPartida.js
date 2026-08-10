import { crearJugadorInicial } from "../juego/configuracion/ConfiguracionInicial.js";
import { Juego } from "../juego/Juego.js";
import { EstadoPartida } from "../partida/EstadoPartida.js";
import { GestorMapasPartida } from "../partida/GestorMapasPartida.js";
import { GestorMercaderesPartida } from "../partida/GestorMercaderesPartida.js";
import {
  normalizarSolicitudTransicionMapa,
  TIPOS_TRANSICION_MAPA,
} from "../juego/interacciones/TransicionesMapa.js";
import { aplicarResultadoAccion } from "./ProcesadorResultadoAccion.js";
import {
  EjecutorAccionesJugador,
  TIPOS_COMANDO_JUGADOR,
} from "./EjecutorAccionesJugador.js";
import { leerParametrosPruebaMapa } from "../herramientas/depuracion/ParametrosPruebaMapa.js";
import { agregarRecursosPruebaMapa } from "../herramientas/depuracion/RecursosPruebaMapa.js";
import {
  crearMensajeTraducible,
  crearParametroContenidoMensaje,
  TIPOS_MENSAJE_JUEGO,
} from "../juego/mensajes/MensajesJuego.js";
import { CoordinadorEntradaJugable } from "./CoordinadorEntradaJugable.js";

// Coordina la sesión completa y conecta
// el mapa activo con la interfaz.
//
// EstadoPartida, GestorMapasPartida y
// GestorMercaderesPartida viven durante toda la sesión.
//
// Juego y su presentación se reemplazan
// cada vez que se activa un mapa diferente.
export class ControladorPartida {
  constructor({
    controladorPantallas,
    presentadorCargaMapa,
    alJugadorDerrotado,
    crearInterfazPartida,
    crearPresentacionMapaActivo,
  } = {}) {
    if (
      !controladorPantallas ||
      typeof controladorPantallas.mostrarPartida !== "function"
    ) {
      throw new Error(
        "ControladorPartida necesita un controlador de pantallas.",
      );
    }

    if (
      !presentadorCargaMapa ||
      typeof presentadorCargaMapa.mostrar !== "function" ||
      typeof presentadorCargaMapa.actualizar !== "function" ||
      typeof presentadorCargaMapa.esperarPintadoMapa !== "function" ||
      typeof presentadorCargaMapa.ocultar !== "function"
    ) {
      throw new Error(
        "ControladorPartida necesita un presentador de carga de mapa.",
      );
    }

    if (typeof alJugadorDerrotado !== "function") {
      throw new Error(
        "ControladorPartida necesita una acción para presentar la derrota.",
      );
    }

    if (typeof crearInterfazPartida !== "function") {
      throw new Error(
        "ControladorPartida necesita una fábrica de interfaz de partida.",
      );
    }

    if (typeof crearPresentacionMapaActivo !== "function") {
      throw new Error(
        "ControladorPartida necesita una fábrica de presentación de mapa.",
      );
    }

    this.controladorPantallas = controladorPantallas;
    this.presentadorCargaMapa = presentadorCargaMapa;
    this.alJugadorDerrotado = alJugadorDerrotado;
    this.crearInterfazPartida = crearInterfazPartida;
    this.crearPresentacionMapaActivo = crearPresentacionMapaActivo;

    // Estado persistente.
    this.estadoPartida = null;
    this.gestorMapasPartida = null;
    this.gestorMercaderesPartida = null;

    // Interfaz persistente.
    this.interfazPartida = null;

    // Estado y controladores del mapa activo.
    this.juego = null;
    this.renderizador = null;
    this.ejecutorAccionesJugador = null;
    this.presentacionMapaActivo = null;

    // Configuraciones persistentes requeridas
    // por la presentación de cada mapa.
    this.configuracionObjetos = null;
    this.configuracionRarezas = null;
    this.configuracionComercio = null;
    this.configuracionHabilidadesNPC = null;
    this.partidaIniciada = false;

    // La preparación de mapas es asíncrona y versionada para impedir que una
    // carga anterior active su mapa después de una solicitud más reciente.
    this.versionPreparacionMapa = 0;
    this.preparacionMapaActiva = null;
    this.promesaPreparacionMapa = null;

    // La compuerta de entrada jugable vive en un coordinador dedicado.
    // ControladorPartida aporta solamente el contexto del mapa y la espera
    // visual del renderizador activo.
    this.coordinadorEntradaJugable = new CoordinadorEntradaJugable({
      obtenerContexto: () => this.obtenerContextoMedicionFluidez(),
      obtenerDiagnosticoPresentacion: () =>
        this.renderizador?.obtenerDiagnosticoUltimaPresentacion?.() ?? null,
      esperarPresentacionPendiente: () =>
        this.renderizador?.esperarPresentacionPendiente?.() ?? null,
    });
  }

  iniciar({
    datosPersonaje = null,
    jugadorRestaurado = null,
    configuracionPersonaje,
    configuracionEnemigos,
    configuracionObjetos,
    configuracionGeneracionObjetos,
    configuracionMapas,
    configuracionCiudad,
    configuracionComercio,
    configuracionHabilidadesNPC,
  } = {}) {
    if (this.partidaIniciada) {
      return false;
    }

    const esContinuacion = jugadorRestaurado !== null;
    const parametrosPrueba = leerParametrosPruebaMapa();
    const jugador = esContinuacion
      ? validarJugadorRestaurado(jugadorRestaurado)
      : crearJugadorInicial({
          datosPersonaje,
          configuracionPersonaje,
          configuracionObjetos,
        });

    this.estadoPartida = new EstadoPartida({
      jugador,
    });

    this.gestorMercaderesPartida = new GestorMercaderesPartida({
      configuracionObjetos,
      configuracionGeneracionObjetos,
      configuracionComercio,
    });
    this.gestorMercaderesPartida.inicializarStocks({
      nivelReferencia: jugador.nivel,
    });

    this.gestorMapasPartida = new GestorMapasPartida({
      estadoPartida: this.estadoPartida,
      configuracionEnemigos,
      configuracionObjetos,
      configuracionGeneracionObjetos,
      configuracionMapas,
      configuracionCiudad,
    });

    this.configuracionObjetos = configuracionObjetos;
    this.configuracionRarezas = configuracionGeneracionObjetos.rarezas;
    this.configuracionComercio = configuracionComercio;
    this.configuracionHabilidadesNPC = configuracionHabilidadesNPC;

    this.interfazPartida = this.crearInterfazPartida({
      configuracionRarezas: this.configuracionRarezas,
    });

    this.renderizador = this.interfazPartida.renderizador;
    this.partidaIniciada = true;

    // Continuar siempre reconstruye una sesión segura desde la ciudad. La
    // expedición interrumpida no forma parte del guardado durable. Los
    // parámetros de prueba siguen disponibles únicamente al iniciar un
    // personaje nuevo.
    if (!esContinuacion && parametrosPrueba.activo) {
      this.iniciarNuevaExpedicion({
        semillaMapa: parametrosPrueba.semillaMapa,
        idMapaForzado: parametrosPrueba.idMapaForzado,
        nivelMapaForzado: parametrosPrueba.nivelMapaForzado,
        botinPrueba: parametrosPrueba.botinPrueba,
        portalPrueba: parametrosPrueba.portalPrueba,
        cantidadEnemigosForzada: parametrosPrueba.cantidadEnemigosForzada,
        // Los parámetros de URL forman parte del modo
        // de desarrollo y pueden abrir mapas bloqueados.
        ignorarNivelDesbloqueo: true,
        parametrosPrueba,
      });
    } else {
      this.iniciarCiudad({
        puntoEntrada: "inicioPartida",
        esInicioPartida: !esContinuacion,
      });
    }

    // La cobertura de Loading ya fue mostrada sincrónicamente por la
    // preparación del mapa. Recién entonces exponemos el contenedor de juego,
    // que permanecerá cubierto hasta completar recursos y primer pintado.
    this.controladorPantallas.mostrarPartida();
    return true;
  }

  iniciarCiudad({
    puntoEntrada = "inicioPartida",
    esInicioPartida = false,
  } = {}) {
    if (!this.partidaIniciada || !this.gestorMapasPartida) {
      throw new Error(
        "No se puede activar la ciudad sin una partida iniciada.",
      );
    }

    this.iniciarPreparacionMapa({
      crearConfiguracionMapa: () =>
        this.gestorMapasPartida.crearCiudad({ puntoEntrada }),
      alMapaActivado: () =>
        this.mostrarResumenCiudad({ esInicioPartida }),
    });

    return true;
  }

  // Genera y activa una mazmorra utilizando
  // el nivel elegido por el jugador.
  iniciarNuevaExpedicion({
    semillaMapa = null,
    idMapaForzado = null,
    nivelMapaForzado = null,
    botinPrueba = false,
    portalPrueba = false,
    cantidadEnemigosForzada = null,
    ignorarNivelDesbloqueo = false,
    parametrosPrueba = null,
  } = {}) {
    if (
      !this.partidaIniciada ||
      !this.gestorMapasPartida ||
      !this.gestorMercaderesPartida
    ) {
      throw new Error(
        "No se puede iniciar una expedición sin una partida activa.",
      );
    }

    this.iniciarPreparacionMapa({
      crearConfiguracionMapa: () => {
        const configuracionMapa = this.gestorMapasPartida.crearMazmorra({
          semillaMapa,
          idMapaForzado,
          nivelMapaForzado,
          cantidadEnemigosRecurrentes: cantidadEnemigosForzada,
          ignorarNivelDesbloqueo,
        });

        if (botinPrueba || portalPrueba) {
          agregarRecursosPruebaMapa({
            configuracionMapa,
            configuracionObjetos: this.configuracionObjetos,
            botinPrueba,
            portalPrueba,
          });
        }

        return configuracionMapa;
      },
      alMapaActivado: (configuracionMapa) => {
        const generacion = configuracionMapa.mapaSeleccionado.generacionActual;

        // La siguiente visita a la ciudad encontrará stock generado con el
        // nivel de esta expedición. Se ejecuta recién cuando el nuevo mapa
        // quedó preparado y tomó autoridad.
        this.gestorMercaderesPartida.renovarStocksTrasExpedicion({
          semillaMapa: generacion.semilla,
          nivelMapa: generacion.nivelMapa,
          numeroExpedicion: this.estadoPartida.expedicionesRealizadas,
        });

        this.mostrarResumenMazmorra({
          parametrosPrueba: parametrosPrueba ?? {
            activo:
              idMapaForzado !== null ||
              nivelMapaForzado !== null ||
              botinPrueba ||
              portalPrueba ||
              cantidadEnemigosForzada !== null ||
              semillaMapa !== null,
            idMapaForzado,
            nivelMapaForzado,
            botinPrueba,
            portalPrueba,
            cantidadEnemigosForzada,
            semillaMapa,
            ignorarNivelDesbloqueo,
          },
        });
      },
    });

    return true;
  }

  // Recibe la selección completa producida
  // por ModalSeleccionMazmorra.
  iniciarExpedicionSeleccionada(seleccion) {
    if (
      !seleccion ||
      typeof seleccion !== "object" ||
      Array.isArray(seleccion)
    ) {
      throw new Error("La selección de expedición no es válida.");
    }

    if (
      typeof seleccion.idMazmorra !== "string" ||
      seleccion.idMazmorra.trim() === ""
    ) {
      throw new Error("La expedición necesita una mazmorra seleccionada.");
    }

    if (!Number.isInteger(seleccion.nivelMapa) || seleccion.nivelMapa < 1) {
      throw new Error("La expedición necesita un nivel válido.");
    }

    return this.iniciarNuevaExpedicion({
      idMapaForzado: seleccion.idMazmorra,
      nivelMapaForzado: seleccion.nivelMapa,
    });
  }

  procesarSolicitudTransicionMapa(solicitud) {
    const solicitudNormalizada = normalizarSolicitudTransicionMapa(solicitud);

    switch (solicitudNormalizada.tipo) {
      case TIPOS_TRANSICION_MAPA.NUEVA_EXPEDICION:
        return this.iniciarNuevaExpedicion({
          semillaMapa: solicitudNormalizada.datos.semillaMapa ?? null,
          idMapaForzado: solicitudNormalizada.datos.idMapaForzado ?? null,
          nivelMapaForzado: solicitudNormalizada.datos.nivelMapaForzado ?? null,
          botinPrueba: solicitudNormalizada.datos.botinPrueba === true,
          portalPrueba: solicitudNormalizada.datos.portalPrueba === true,
          cantidadEnemigosForzada:
            solicitudNormalizada.datos.cantidadEnemigosForzada ?? null,
          ignorarNivelDesbloqueo:
            solicitudNormalizada.datos.ignorarNivelDesbloqueo === true,
        });

      case TIPOS_TRANSICION_MAPA.REGRESAR_CIUDAD:
        return this.iniciarCiudad({
          puntoEntrada:
            solicitudNormalizada.datos.puntoEntrada ?? "regresoDungeon",
        });

      case TIPOS_TRANSICION_MAPA.ACTIVAR_MAPA_FIJO:
        return this.procesarActivacionMapaFijo(solicitudNormalizada.datos);

      default:
        throw new Error(
          "ControladorPartida recibió una transición desconocida.",
        );
    }
  }

  procesarActivacionMapaFijo(datos) {
    const idMapa = datos?.idMapa;

    if (idMapa === this.gestorMapasPartida.idCiudad) {
      return this.iniciarCiudad({
        puntoEntrada: datos.puntoEntrada ?? "inicioPartida",
      });
    }

    this.renderizador.mostrarMensaje(
      crearMensajeTraducible("mensajes.juego.mapaFijoNoDisponible", {
        parametros: { id: idMapa },
        tipo: TIPOS_MENSAJE_JUEGO.ALERTA,
        respaldo: `El mapa fijo "${idMapa}" todavía no está disponible.`,
      }),
    );

    return false;
  }

  // Punto común para ejecutar acciones desde cualquier adaptador de entrada.
  // El teclado DOM, la barra, el puntero, una futura escena de Phaser, la
  // consola y las pruebas deterministas utilizan el mismo camino.
  ejecutarComandoJugador(comando) {
    const origenEntrada = comando?.origenEntrada ?? "comando";
    const tipoEntrada = comando?.tipo ?? "comando";

    const ejecucion = this.ejecutarConControlEntrada({
      tipoEntrada,
      origenEntrada,
      ejecutarLogica: () => this.ejecutarComandoJugadorSinControlEntrada(comando),
      obtenerResultadoTemporal: (contexto) => contexto?.resultado ?? null,
      procesarResultado: (contexto) =>
        this.procesarContextoComandoJugador(contexto),
    });

    return ejecucion.aceptada ? ejecucion.resultado : null;
  }

  // Ejecuta una mutación jugable originada fuera del traductor de comandos,
  // por ejemplo equipamiento, botín, curación, comercio o una transición
  // solicitada desde un modal. Todas esas rutas comparten la misma compuerta.
  ejecutarAccionJugable({
    tipoEntrada = "accion",
    origenEntrada = "dom",
    ejecutar,
    procesarResultado = true,
    presentarInteraccion = false,
  } = {}) {
    if (typeof ejecutar !== "function") {
      throw new Error(
        "La entrada jugable necesita una acción válida para ejecutar.",
      );
    }

    return this.ejecutarConControlEntrada({
      tipoEntrada,
      origenEntrada,
      ejecutarLogica: ejecutar,
      obtenerResultadoTemporal: (resultado) => resultado,
      procesarResultado: (resultado) => {
        if (!procesarResultado) {
          return resultado;
        }

        const resultadoProcesado = this.procesarResultadoAccion(resultado);
        if (presentarInteraccion) {
          this.presentarInteraccionResultado(resultadoProcesado);
        }
        return resultadoProcesado;
      },
    });
  }

  ejecutarComandoJugadorSinControlEntrada(comando) {
    if (
      !this.partidaIniciada ||
      !this.juego ||
      !this.renderizador ||
      !this.ejecutorAccionesJugador
    ) {
      throw new Error(
        "No se puede ejecutar un comando sin un mapa activo.",
      );
    }

    const contextoHabilidad = crearContextoHabilidadParaComando({
      comando,
      integracionHabilidades:
        this.presentacionMapaActivo?.obtenerIntegracionHabilidades() ?? null,
    });
    const integracionHabilidades =
      this.presentacionMapaActivo?.obtenerIntegracionHabilidades() ?? null;
    const contextoProcesamiento = contextoHabilidad.esComandoHabilidad
      ? integracionHabilidades.iniciarProcesamientoComando({
          suprimirRedibujado: contextoHabilidad.esConfirmacion,
        })
      : null;

    let resultado;
    try {
      resultado = this.ejecutorAccionesJugador.ejecutar(comando);
    } catch (error) {
      integracionHabilidades?.cancelarProcesamientoComando(
        contextoProcesamiento,
      );
      throw error;
    }

    return {
      comando,
      resultado,
      contextoHabilidad,
      contextoProcesamiento,
      integracionHabilidades,
    };
  }

  procesarContextoComandoJugador(contexto) {
    const {
      comando,
      resultado,
      contextoHabilidad,
      contextoProcesamiento,
      integracionHabilidades,
    } = contexto;

    const estadoProcesamiento = contextoProcesamiento
      ? integracionHabilidades.finalizarProcesamientoComando(
          contextoProcesamiento,
        )
      : { cambioEmitido: false };

    const resultadoHabilidad = this.procesarResultadoComandoHabilidad({
      comando,
      resultado,
      contextoHabilidad,
      estadoProcesamiento,
    });

    if (resultadoHabilidad.procesado) {
      return resultadoHabilidad.resultado;
    }

    const resultadoProcesado = this.procesarResultadoAccion(resultado);
    this.presentarInteraccionResultado(resultadoProcesado);
    return resultadoProcesado;
  }

  ejecutarConControlEntrada({
    tipoEntrada,
    origenEntrada,
    ejecutarLogica,
    obtenerResultadoTemporal,
    procesarResultado,
  }) {
    this.validarMapaActivoParaEntrada();

    return this.coordinadorEntradaJugable.ejecutar({
      tipoEntrada,
      origenEntrada,
      ejecutarLogica,
      obtenerResultadoTemporal,
      procesarResultado,
    });
  }

  validarMapaActivoParaEntrada() {
    if (
      !this.partidaIniciada ||
      !this.juego ||
      !this.renderizador ||
      !this.ejecutorAccionesJugador
    ) {
      throw new Error(
        "No se puede ejecutar una entrada jugable sin un mapa activo.",
      );
    }
  }

  obtenerContextoMedicionFluidez() {
    const filasMapa = Array.isArray(this.juego?.map) ? this.juego.map.length : 0;
    const columnasMapa = filasMapa > 0 ? this.juego.map[0]?.length ?? 0 : 0;

    return {
      mapaId: this.juego?.mapaSeleccionado?.id ?? null,
      columnasMapa,
      filasMapa,
      casillasMapa: columnasMapa * filasMapa,
      objetivosTotales: Array.isArray(this.juego?.objetivos)
        ? this.juego.objetivos.length
        : 0,
      entidadesConIA: Array.isArray(this.juego?.objetivos)
        ? this.juego.objetivos.filter((entidad) => entidad?.configuracionIA).length
        : 0,
      renderizador:
        globalThis.darkMoonRenderizador?.tipo ?? "desconocido",
    };
  }

  obtenerResumenFluidez() {
    return this.coordinadorEntradaJugable.obtenerResumen();
  }

  reiniciarMedicionFluidez() {
    return this.coordinadorEntradaJugable.reiniciarMedicion();
  }

  procesarResultadoAccion(resultado) {
    return aplicarResultadoAccion({
      resultado,
      juego: this.juego,
      renderizador: this.renderizador,
      alJugadorDerrotado: (detalle) => this.procesarJugadorDerrotado(detalle),
    });
  }

  procesarJugadorDerrotado(detalle) {
    // La derrota cierra el guardado durable desde la capa de partida antes de
    // delegar cualquier decisión de presentación al adaptador visual.
    this.estadoPartida?.eliminarEstadoDurable();
    return this.alJugadorDerrotado(detalle);
  }

  presentarInteraccionResultado(resultado) {
    if (!resultado?.interaccion) {
      return false;
    }

    if (!this.presentacionMapaActivo) {
      throw new Error(
        "No se puede presentar una interacción sin un mapa activo.",
      );
    }

    this.presentacionMapaActivo.presentarInteraccion(resultado.interaccion);
    return true;
  }

  procesarResultadoComandoHabilidad({
    comando,
    resultado,
    contextoHabilidad,
    estadoProcesamiento,
  }) {
    if (!contextoHabilidad.esComandoHabilidad) {
      return { procesado: false, resultado };
    }

    const integracion =
      this.presentacionMapaActivo?.obtenerIntegracionHabilidades() ?? null;

    if (contextoHabilidad.esConfirmacion) {
      integracion.registrarResultado(resultado);

      const resultadoParaProcesar =
        estadoProcesamiento.cambioEmitido &&
        resultado &&
        resultado.redibujar !== true
          ? { ...resultado, redibujar: true }
          : resultado;

      return {
        procesado: true,
        resultado: this.procesarResultadoAccion(resultadoParaProcesar),
      };
    }

    if (
      contextoHabilidad.esBloqueoRespaldo ||
      (contextoHabilidad.esSeleccionRanura &&
        resultado?.exito === false &&
        comando.silenciarRechazo !== true)
    ) {
      integracion.procesarResultado(resultado);
    }

    return { procesado: true, resultado };
  }

  iniciarPreparacionMapa({
    crearConfiguracionMapa,
    alMapaActivado = null,
  } = {}) {
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
    this.coordinadorEntradaJugable.invalidarSincronizacion();
    this.presentacionMapaActivo?.suspender?.();

    const promesa = this.ejecutarPreparacionMapa({
      token,
      crearConfiguracionMapa,
      alMapaActivado,
    }).catch((error) => this.manejarErrorPreparacionMapa({ token, error }));

    this.promesaPreparacionMapa = promesa;
    return true;
  }

  async ejecutarPreparacionMapa({
    token,
    crearConfiguracionMapa,
    alMapaActivado,
  }) {
    await this.presentadorCargaMapa.mostrar({ idCarga: token });
    if (!this.esPreparacionMapaActiva(token)) return false;

    const configuracionMapa = crearConfiguracionMapa();
    validarConfiguracionMapa(configuracionMapa);
    this.presentadorCargaMapa.actualizar({ idCarga: token, progreso: 0.12 });

    await this.activarMapaPreparado(configuracionMapa, {
      token,
      alProgreso: ({ progreso = 0 } = {}) => {
        if (!this.esPreparacionMapaActiva(token)) return;
        this.presentadorCargaMapa.actualizar({
          idCarga: token,
          progreso: 0.12 + Math.min(1, Math.max(0, progreso)) * 0.78,
        });
      },
    });

    if (!this.esPreparacionMapaActiva(token)) return false;
    alMapaActivado?.(configuracionMapa);
    this.presentadorCargaMapa.actualizar({ idCarga: token, progreso: 1 });

    // El mapa ya fue compuesto. Mantenemos la cobertura durante al menos un
    // pintado real y durante el mínimo visual acordado de un segundo.
    await this.presentadorCargaMapa.esperarPintadoMapa({ idCarga: token });
    if (!this.esPreparacionMapaActiva(token)) return false;
    await this.presentadorCargaMapa.ocultar({ idCarga: token });
    if (!this.esPreparacionMapaActiva(token)) return false;

    this.presentacionMapaActivo?.activar();
    this.preparacionMapaActiva = null;
    return true;
  }

  async manejarErrorPreparacionMapa({ token, error }) {
    console.error("No se pudo preparar el mapa:", error);
    if (!this.esPreparacionMapaActiva(token)) return false;

    try {
      await this.presentadorCargaMapa.ocultar({ idCarga: token });
    } catch (errorOcultando) {
      console.error("No se pudo cerrar la pantalla de carga:", errorOcultando);
    }

    // Si el mapa anterior todavía conserva su presentación puede recuperar la
    // entrada. En un fallo durante el primer mapa se vuelve al menú principal.
    if (this.presentacionMapaActivo) {
      this.presentacionMapaActivo.activar();
    } else {
      this.controladorPantallas.mostrarMenuPrincipal?.();
    }

    this.preparacionMapaActiva = null;
    return false;
  }

  esPreparacionMapaActiva(token) {
    return this.preparacionMapaActiva === token;
  }

  esperarPreparacionMapa() {
    return this.promesaPreparacionMapa ?? Promise.resolve(true);
  }

  async activarMapaPreparado(configuracionMapa, {
    token,
    alProgreso = null,
  } = {}) {
    validarConfiguracionMapa(configuracionMapa);

    if (!this.interfazPartida) {
      throw new Error("No se puede activar un mapa sin una interfaz creada.");
    }

    // La presentación pertenece al mapa activo. Se destruye únicamente cuando
    // la nueva configuración ya fue generada correctamente.
    this.presentacionMapaActivo?.destruir();
    this.presentacionMapaActivo = null;
    this.ejecutorAccionesJugador = null;

    // La transición no consume tiempo. El jugador conserva sus efectos con
    // duración y próximo tick relativos; las entidades del mapa anterior se
    // limpian junto con su agenda temporal.
    this.juego?.destruir({
      preservarEfectosJugador: true,
    });

    const { renderizador } = this.interfazPartida;
    const cantidadFilas = configuracionMapa.map.length;
    const cantidadColumnas = configuracionMapa.map[0].length;

    renderizador.configurarDimensionesMapa({
      columnas: cantidadColumnas,
      filas: cantidadFilas,
    });

    const juego = new Juego({
      ...configuracionMapa,
      player: this.estadoPartida.jugador,
      configuracionObjetos: this.configuracionObjetos,
    });

    this.juego = juego;
    this.renderizador = renderizador;

    // La precarga recibe un manifiesto visual neutral. Los enemigos ocultos
    // aportan sus rutas, nunca sus posiciones ni su estado de visibilidad.
    await renderizador.prepararMapa(juego, { alProgreso });
    if (!this.esPreparacionMapaActiva(token)) {
      juego.destruir({ preservarEfectosJugador: true });
      return false;
    }

    const ejecutorAccionesJugador = new EjecutorAccionesJugador({
      juego,
      obtenerSistemaHabilidades: () =>
        this.presentacionMapaActivo?.obtenerSistemaHabilidades() ?? null,
    });
    this.ejecutorAccionesJugador = ejecutorAccionesJugador;

    const juegoActivo = juego;
    const presentacionMapaActivo = this.crearPresentacionMapaActivo({
      juego,
      interfazPartida: this.interfazPartida,
      gestorMercaderesPartida: this.gestorMercaderesPartida,
      configuracionObjetos: this.configuracionObjetos,
      configuracionRarezas: this.configuracionRarezas,
      configuracionComercio: this.configuracionComercio,
      configuracionHabilidadesNPC: this.configuracionHabilidadesNPC,
      obtenerMazmorrasDisponibles: () =>
        this.gestorMapasPartida.obtenerMazmorrasDisponibles(),
      alSeleccionarMazmorra: (seleccion) =>
        this.iniciarExpedicionSeleccionada(seleccion),
      alSolicitarTransicionMapa: (solicitud) =>
        this.procesarSolicitudTransicionMapa(solicitud),
      alProcesarResultado: (resultado) =>
        this.procesarResultadoAccion(resultado),
      alEjecutarAccionJugable: (configuracion) =>
        this.juego === juegoActivo
          ? this.ejecutarAccionJugable(configuracion)
          : { aceptada: false, resultado: null },
      alEjecutarComando: (comando) =>
        this.ejecutarComandoJugador(comando),
      alSolicitarGuardadoJugador: () =>
        this.estadoPartida.guardarEstadoDurable(),
      esJuegoActivo: () =>
        this.partidaIniciada === true && this.juego === juegoActivo,
    });

    this.presentacionMapaActivo = presentacionMapaActivo;
    this.renderizador.dibujarJuego(this.juego);
    return true;
  }

  obtenerContextoDiagnostico() {
    const mapa = this.juego?.mapaSeleccionado ?? null;
    const jugador = this.estadoPartida?.jugador ?? this.juego?.jugador ?? null;
    return {
      partidaIniciada: this.partidaIniciada === true,
      ubicacion: this.estadoPartida?.tipoUbicacionActual ??
        (mapa?.bioma === "ciudad" ? "ciudad" : "mazmorra"),
      mapaId: mapa?.id ?? null,
      mapaNombre: mapa?.nombre ?? null,
      nivelJugador: Number.isFinite(jugador?.nivel) ? jugador.nivel : null,
    };
  }

  mostrarResumenCiudad({ esInicioPartida } = {}) {
    const mapaSeleccionado = this.juego.mapaSeleccionado;
    const mapa = crearParametroContenidoMensaje("mapas", mapaSeleccionado.id, {
      respaldo: mapaSeleccionado.nombre ?? "",
    });
    const mensajePrincipal = crearMensajeTraducible(
      esInicioPartida ? "mensajes.juego.ciudadInicio" : "mensajes.juego.ciudadRegreso",
      {
        parametros: { mapa },
        tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
        respaldo: esInicioPartida
          ? `Comenzaste tu aventura en ${mapaSeleccionado.nombre}.`
          : `Regresaste a ${mapaSeleccionado.nombre}.`,
      },
    );

    this.renderizador.mostrarMensaje([
      mensajePrincipal,
      crearMensajeTraducible("mensajes.juego.ciudadAyuda", {
        tipo: TIPOS_MENSAJE_JUEGO.SISTEMA,
        respaldo: "Acercate al mercader y presioná R para comerciar. La entrada a las mazmorras se encuentra al norte.",
      }),
    ]);


  }

  mostrarResumenMazmorra({ parametrosPrueba } = {}) {
    const mapaSeleccionado = this.juego.mapaSeleccionado;
    const generacion = mapaSeleccionado.generacionActual;
    const tiposEnemigos = formatearConteo(generacion.enemigosPorTipo);
    const variantes = formatearConteo(generacion.variantes);

    const mensajesResumen = [
      crearMensajeTraducible("mensajes.juego.mapaGenerado", {
        parametros: {
          mapa: crearParametroContenidoMensaje("mapas", mapaSeleccionado.id, { respaldo: mapaSeleccionado.nombre ?? "" }),
        },
        tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
        respaldo: `Mapa generado: ${mapaSeleccionado.nombre}.`,
      }),
      crearMensajeTraducible("mensajes.juego.mapaResumen", {
        parametros: {
          bioma: mapaSeleccionado.bioma,
          nivel: generacion.nivelMapa,
          semilla: generacion.semilla,
          ancho: generacion.ancho,
          alto: generacion.alto,
          paredes: generacion.porcentajeNoCaminableReal,
          conectividad: generacion.porcentajeConectado,
          habitaciones: generacion.cantidadHabitaciones,
          pasillos: generacion.cantidadPasillos,
          puntosConexion: generacion.cantidadPuntosConexion,
          enemigos: generacion.cantidadEnemigos,
          tipos: tiposEnemigos,
          variantes,
        },
        respaldo: `Bioma: ${mapaSeleccionado.bioma}. Nivel seleccionado: ${generacion.nivelMapa}. Semilla: ${generacion.semilla}. Tamaño: ${generacion.ancho} × ${generacion.alto}. Paredes: ${generacion.porcentajeNoCaminableReal}%. Conectividad: ${generacion.porcentajeConectado}%. Estructura: ${generacion.cantidadHabitaciones} habitaciones, ${generacion.cantidadPasillos} pasillos, ${generacion.cantidadPuntosConexion} puntos de conexión. Enemigos: ${generacion.cantidadEnemigos} (${tiposEnemigos}). Variantes: ${variantes}.`,
      }),
      crearMensajeTraducible("mensajes.juego.mapaResumenFinal", {
        parametros: { destructibles: generacion.cantidadDestructibles },
        respaldo: `Destructibles: ${generacion.cantidadDestructibles}. La salida hacia la ciudad está ubicada en un borde del mapa.`,
      }),
    ];
    if (parametrosPrueba?.activo) mensajesResumen.push(crearMensajeTraducible("mensajes.juego.modoPrueba", { respaldo: "Modo de prueba activo." }));
    if (parametrosPrueba?.botinPrueba) mensajesResumen.push(crearMensajeTraducible("mensajes.juego.botinPrueba", { respaldo: "Botín de prueba activo: acercate y presioná R para revisarlo." }));
    if (parametrosPrueba?.portalPrueba) mensajesResumen.push(crearMensajeTraducible("mensajes.juego.portalPrueba", { respaldo: "Portal de prueba activo: acercate y presioná R para generar otra mazmorra." }));
    this.renderizador.mostrarMensaje(mensajesResumen);


  }

}

function validarJugadorRestaurado(jugador) {
  if (
    !jugador ||
    typeof jugador !== "object" ||
    typeof jugador.nombre !== "string" ||
    !Number.isInteger(jugador.nivel)
  ) {
    throw new Error("No se puede continuar con un jugador restaurado inválido.");
  }

  return jugador;
}

function crearContextoHabilidadParaComando({
  comando,
  integracionHabilidades,
}) {
  const sistemaHabilidades =
    integracionHabilidades?.obtenerSistemaParaEntrada() ?? null;
  const modoHabilidadAntes = sistemaHabilidades?.modoHabilidad === true;
  const tipo = comando?.tipo;
  const esSeleccionRanura =
    tipo === TIPOS_COMANDO_JUGADOR.SELECCIONAR_HABILIDAD_RANURA;
  const esSeleccionCasilla =
    modoHabilidadAntes &&
    tipo === TIPOS_COMANDO_JUGADOR.SELECCIONAR_CASILLA;
  const esConfirmacion =
    modoHabilidadAntes &&
    tipo === TIPOS_COMANDO_JUGADOR.ACTIVAR_O_CONFIRMAR_SELECCION;
  const esBloqueoRespaldo =
    modoHabilidadAntes &&
    tipo === TIPOS_COMANDO_JUGADOR.ACTIVAR_ATAQUE_RESPALDO;
  const esMovimiento =
    modoHabilidadAntes && tipo === TIPOS_COMANDO_JUGADOR.MOVER;
  const esCancelacion =
    modoHabilidadAntes &&
    tipo === TIPOS_COMANDO_JUGADOR.CANCELAR_SELECCION;

  return {
    esSeleccionRanura,
    esSeleccionCasilla,
    esConfirmacion,
    esBloqueoRespaldo,
    esMovimiento,
    esCancelacion,
    esComandoHabilidad:
      Boolean(sistemaHabilidades) &&
      (esSeleccionRanura ||
        esSeleccionCasilla ||
        esConfirmacion ||
        esBloqueoRespaldo ||
        esMovimiento ||
        esCancelacion),
  };
}

function formatearConteo(conteo) {
  const elementos = Object.entries(conteo ?? {});

  if (elementos.length === 0) {
    return "ninguno";
  }

  return elementos
    .map(([id, cantidad]) => `${formatearId(id)}: ${cantidad}`)
    .join(", ");
}

function formatearId(id) {
  return id.replaceAll("_", " ");
}

function validarConfiguracionMapa(configuracionMapa) {
  if (
    !configuracionMapa ||
    !Array.isArray(configuracionMapa.map) ||
    configuracionMapa.map.length === 0 ||
    !configuracionMapa.player ||
    !Array.isArray(configuracionMapa.objetivos) ||
    !Array.isArray(configuracionMapa.interactuables) ||
    !configuracionMapa.mapaSeleccionado
  ) {
    throw new Error(
      "ControladorPartida recibió una configuración de mapa inválida.",
    );
  }
}
