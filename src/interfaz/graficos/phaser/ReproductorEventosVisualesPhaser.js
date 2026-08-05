import {
  TIPOS_EVENTO_VISUAL,
} from "../PlanificadorEventosVisuales.js";
import { obtenerPerfilAtaque } from "../ContextoPerfilesAtaquePorFamilia.js";
import {
  ESTADOS_HOSTILIDAD_VISUAL,
  TIPOS_ENTIDAD_VISUAL,
} from "../TiposEscena.js";
import {
  calcularDuracionAnimacionPhaser,
  CONFIGURACION_ANIMACIONES_PHASER,
  normalizarVelocidadAnimacionPhaser,
} from "./ConfiguracionAnimacionesPhaser.js";
import { TAMANO_CASILLA_REFERENCIA } from "./ConfiguracionPhaser.js";
import { CreadorEfectosCombatePhaser } from "./CreadorEfectosCombatePhaser.js";
import { CreadorEfectosRecuperacionPhaser } from "./CreadorEfectosRecuperacionPhaser.js";
import {
  CONFIGURACION_EFECTOS_RECUPERACION_PHASER,
} from "./ConfiguracionEfectosRecuperacionPhaser.js";
import {
  CreadorProyectilesElementalesPhaser,
} from "./CreadorProyectilesElementalesPhaser.js";
import {
  ANCLAJES_RECURSO,
  CreadorRecursosVisualesPhaser,
} from "./CreadorRecursosVisualesPhaser.js";
import {
  CONFIGURACION_EFECTOS_COMBATE_PHASER,
  TIPOS_FEEDBACK_COMBATE,
} from "./ConfiguracionEfectosCombatePhaser.js";

// Reproduce hechos ya resueltos. La cola jamás modifica el estado del juego ni
// decide el orden temporal: solamente conserva el orden recibido.
export class ReproductorEventosVisualesPhaser {
  constructor({
    escena,
    compositor,
    gestorRecursos,
    alAplicarEscena,
    alMoverJugadorVisual = null,
  } = {}) {
    if (!escena?.tweens || !escena?.time || !compositor || !gestorRecursos) {
      throw new Error(
        "El reproductor visual necesita escena, compositor y recursos válidos.",
      );
    }

    if (typeof alAplicarEscena !== "function") {
      throw new Error("El reproductor visual necesita aplicar la escena final.");
    }

    if (
      alMoverJugadorVisual !== null &&
      typeof alMoverJugadorVisual !== "function"
    ) {
      throw new Error("El seguimiento visual del jugador debe ser una función.");
    }

    this.escena = escena;
    this.compositor = compositor;
    this.alAplicarEscena = alAplicarEscena;
    this.alMoverJugadorVisual = alMoverJugadorVisual;
    this.creadorEfectos = new CreadorEfectosCombatePhaser({
      escena,
      compositor,
    });
    this.creadorEfectosRecuperacion = new CreadorEfectosRecuperacionPhaser({
      escena,
      compositor,
    });
    this.creadorProyectilesElementales =
      new CreadorProyectilesElementalesPhaser({ escena, compositor });
    this.creadorRecursosVisuales = new CreadorRecursosVisualesPhaser({
      escena,
      compositor,
      gestorRecursos,
    });
    this.cola = [];
    this.reproduciendo = false;
    this.destruido = false;
    this.velocidad = CONFIGURACION_ANIMACIONES_PHASER.velocidadInicial;
    this.efectosReducidos = false;
    this.tweensActivos = new Set();
    this.temporizadoresActivos = new Set();
    this.versionCancelacion = 0;
  }

  configurar({ velocidad, efectosReducidos } = {}) {
    if (velocidad !== undefined) {
      this.velocidad = normalizarVelocidadAnimacionPhaser(velocidad);
    }

    if (efectosReducidos !== undefined) {
      this.efectosReducidos = efectosReducidos === true;
    }

    return Object.freeze({
      velocidad: this.velocidad,
      efectosReducidos: this.efectosReducidos,
    });
  }

  encolar({ escenaFinal, eventosVisuales = [] } = {}) {
    if (this.destruido || !escenaFinal) {
      return false;
    }

    this.cola.push({
      escenaFinal,
      eventosVisuales: Array.isArray(eventosVisuales)
        ? [...eventosVisuales]
        : [],
    });
    this.iniciarProcesamiento();
    return true;
  }

  estaActivo() {
    return this.reproduciendo || this.cola.length > 0;
  }

  obtenerCantidadEventosPendientes() {
    return this.cola.reduce(
      (total, actualizacion) => total + actualizacion.eventosVisuales.length,
      0,
    );
  }

  cancelar({ aplicarUltimaEscena = false } = {}) {
    this.versionCancelacion += 1;
    const ultimaEscena = this.cola.at(-1)?.escenaFinal ?? null;
    this.cola.length = 0;

    for (const tween of this.tweensActivos) {
      tween.stop?.();
      tween.remove?.();
    }
    this.tweensActivos.clear();

    for (const espera of this.temporizadoresActivos) {
      espera.temporizador?.remove?.(false);
      espera.finalizar?.();
    }
    this.temporizadoresActivos.clear();

    this.reproduciendo = false;

    if (aplicarUltimaEscena && ultimaEscena) {
      this.alAplicarEscena(ultimaEscena);
    }
  }

  destruir() {
    if (this.destruido) return;
    this.destruido = true;
    this.cancelar();
    this.escena = null;
    this.compositor = null;
    this.alAplicarEscena = null;
    this.alMoverJugadorVisual = null;
    this.creadorEfectos = null;
    this.creadorEfectosRecuperacion = null;
    this.creadorProyectilesElementales = null;
    this.creadorRecursosVisuales = null;
  }

  async iniciarProcesamiento() {
    if (this.reproduciendo || this.destruido) {
      return;
    }

    this.reproduciendo = true;
    const version = this.versionCancelacion;

    try {
      while (this.cola.length > 0 && version === this.versionCancelacion) {
        const actualizacion = this.cola.shift();
        await this.reproducirActualizacion(actualizacion, version);
      }
    } finally {
      if (version === this.versionCancelacion) {
        this.reproduciendo = false;
      }
    }
  }

  async reproducirActualizacion(actualizacion, version) {
    for (const evento of actualizacion.eventosVisuales) {
      if (version !== this.versionCancelacion || this.destruido) return;

      if (evento.tipo === TIPOS_EVENTO_VISUAL.MOVIMIENTO_ENTIDAD) {
        await this.reproducirMovimiento(evento, version);
      } else if (evento.tipo === TIPOS_EVENTO_VISUAL.ATAQUE_RESUELTO) {
        await this.reproducirAtaqueResuelto(evento, version);
      } else if (evento.tipo === TIPOS_EVENTO_VISUAL.CAMBIO_HOSTILIDAD) {
        this.reproducirCambioHostilidad(evento);
      } else if (evento.tipo === TIPOS_EVENTO_VISUAL.DANIO_PERIODICO) {
        await this.reproducirDanioPeriodico(evento, version);
      } else if (evento.tipo === TIPOS_EVENTO_VISUAL.ENTIDAD_DERROTADA) {
        await this.reproducirEntidadDerrotada(evento, version);
      } else if (evento.tipo === TIPOS_EVENTO_VISUAL.RECURSOS_RECUPERADOS) {
        await this.reproducirRecursosRecuperados(evento, version);
      } else if (evento.tipo === TIPOS_EVENTO_VISUAL.NIVEL_AUMENTADO) {
        await this.reproducirNivelAumentado(evento, version);
      }
    }

    if (version === this.versionCancelacion && !this.destruido) {
      this.alAplicarEscena(actualizacion.escenaFinal);
    }
  }

  reproducirCambioHostilidad(evento) {
    if (
      !Object.values(ESTADOS_HOSTILIDAD_VISUAL).includes(evento.estadoActual)
    ) {
      return false;
    }

    return this.compositor.actualizarHostilidadEntidad?.(
      evento.idEntidad,
      evento.estadoActual,
    ) === true;
  }

  async reproducirMovimiento(evento, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idEntidad);
    const origen = this.compositor.obtenerCentroCasilla(evento.origen);
    const destino = this.compositor.obtenerCentroCasilla(evento.destino);

    if (!nodo || !origen || !destino) {
      return;
    }

    this.compositor.posicionarNodoEntidad(evento.idEntidad, origen);

    const distancia = Math.hypot(
      evento.destino.x - evento.origen.x,
      evento.destino.y - evento.origen.y,
    );
    const movimientosJugadorPendientes =
      evento.tipoEntidad === TIPOS_ENTIDAD_VISUAL.JUGADOR
        ? this.obtenerRachaMovimientosJugadorPendientes()
        : 0;
    const duracionBaseMovimiento = this.obtenerDuracionBaseMovimiento({
      tipoEntidad: evento.tipoEntidad,
      movimientosJugadorPendientes,
    });
    const duracionBase =
      duracionBaseMovimiento * Math.max(1, Math.min(Math.SQRT2, distancia));
    const duracion = calcularDuracionAnimacionPhaser(duracionBase, {
      velocidad: this.velocidad,
      cantidadPendiente: 0,
    });

    await this.crearTween({
      targets: [nodo.contenedor, nodo.sombra].filter(Boolean),
      x: destino.x,
      y: destino.y,
      duration: duracion,
      ease: movimientosJugadorPendientes > 0 ? "Linear" : "Sine.easeInOut",
      onUpdate: () => {
        if (
          evento.tipoEntidad === TIPOS_ENTIDAD_VISUAL.JUGADOR &&
          typeof this.alMoverJugadorVisual === "function"
        ) {
          this.alMoverJugadorVisual({
            x: nodo.contenedor.x,
            y: nodo.contenedor.y,
          });
        }
      },
    }, version);

    this.compositor.posicionarNodoEntidad(evento.idEntidad, destino);
  }

  obtenerDuracionBaseMovimiento({
    tipoEntidad,
    movimientosJugadorPendientes = 0,
  } = {}) {
    if (tipoEntidad !== TIPOS_ENTIDAD_VISUAL.JUGADOR) {
      return CONFIGURACION_ANIMACIONES_PHASER.movimientoEnemigoCasillaMs;
    }

    if (
      movimientosJugadorPendientes >=
      CONFIGURACION_ANIMACIONES_PHASER.umbralMovimientosJugadorColaLarga
    ) {
      return CONFIGURACION_ANIMACIONES_PHASER.movimientoCasillaColaLargaMs;
    }

    if (
      movimientosJugadorPendientes >=
      CONFIGURACION_ANIMACIONES_PHASER.umbralMovimientosJugadorColaMedia
    ) {
      return CONFIGURACION_ANIMACIONES_PHASER.movimientoCasillaColaMediaMs;
    }

    return CONFIGURACION_ANIMACIONES_PHASER.movimientoJugadorCasillaMs;
  }

  obtenerRachaMovimientosJugadorPendientes() {
    let cantidad = 0;

    for (const actualizacion of this.cola) {
      const eventos = actualizacion?.eventosVisuales ?? [];
      if (eventos.length === 0) break;

      for (const evento of eventos) {
        if (
          evento?.tipo !== TIPOS_EVENTO_VISUAL.MOVIMIENTO_ENTIDAD ||
          evento.tipoEntidad !== TIPOS_ENTIDAD_VISUAL.JUGADOR
        ) {
          return cantidad;
        }
        cantidad += 1;
      }
    }

    return cantidad;
  }

  async reproducirAtaqueResuelto(evento, version) {
    this.compositor.ocultarSeleccionTemporal?.();

    const golpes = this.obtenerGolpesVisuales(evento);
    if (this.esAtaqueVarita(evento) && evento.ritmoVisual) {
      await this.reproducirAtaqueVarita(evento, golpes, version);
    } else if (this.esAtaqueArco(evento) && evento.ritmoVisual) {
      await this.reproducirAtaqueArco(evento, golpes, version);
    } else if (this.esAtaqueCuerpoACuerpo(evento) && evento.ritmoVisual) {
      await this.reproducirAtaqueCuerpoACuerpo(evento, golpes, version);
    } else {
      await this.reproducirAtaqueProvisional(evento, golpes, version);
    }

    if (evento.esAtaqueEnemigo) {
      await this.esperar(
        this.calcularDuracion(
          CONFIGURACION_ANIMACIONES_PHASER.pausaEntreAtaquesEnemigosMs,
        ),
        version,
      );
    }
  }

  esAtaqueCuerpoACuerpo(evento) {
    const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
    return fuentes.length === 0 || fuentes.every(
      (fuente) =>
        fuente?.esAtaqueNatural === true ||
        fuente?.tipoAtaque === "cuerpoACuerpo",
    );
  }

  esAtaqueArco(evento) {
    const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
    return fuentes.length === 1 &&
      fuentes[0]?.familiaObjeto === "arco" &&
      fuentes[0]?.tipoAtaque === "distancia";
  }

  esAtaqueVarita(evento) {
    const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
    return fuentes.length > 0 &&
      fuentes.every(
        (fuente) =>
          fuente?.familiaObjeto === "varita" &&
          fuente?.tipoAtaque === "distancia" &&
          typeof fuente?.elementoAtaqueBasico === "string",
      );
  }

  async reproducirAtaqueProvisional(evento, golpes, version) {
    for (let indice = 0; indice < golpes.length; indice += 1) {
      if (version !== this.versionCancelacion || this.destruido) return;
      await this.reproducirGolpeProvisional(
        evento,
        golpes[indice],
        indice,
        version,
      );

      if (indice < golpes.length - 1) {
        await this.esperar(
          this.calcularDuracion(
            CONFIGURACION_EFECTOS_COMBATE_PHASER.golpe.pausaEntreGolpesMs,
          ),
          version,
        );
      }
    }
  }

  async reproducirAtaqueArco(evento, golpes, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idAtacante);
    const centroBase = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : this.compositor.obtenerCentroCasilla(evento.origenAtacante);
    const centroObjetivo = this.compositor.obtenerCentroCasilla(
      evento.posicionObjetivo,
    );
    const municion = evento?.resultado?.municionUtilizada ?? null;

    if (
      !nodo?.contenedor ||
      !centroBase ||
      !centroObjetivo ||
      !municion?.recursoVisual
    ) {
      await this.reproducirAtaqueProvisional(evento, golpes, version);
      return;
    }

    const golpe = golpes[0] ?? null;
    const perfil = this.obtenerPerfilGolpe(evento, golpe, 0);
    const fases = evento.ritmoVisual?.fases ?? {};
    const direccion = normalizarDireccionImpacto({
      origen: centroBase,
      destino: centroObjetivo,
    });
    const lateral = { x: -direccion.y, y: direccion.x };
    const signoDesvio =
      ((evento.posicionObjetivo?.x ?? 0) +
        (evento.posicionObjetivo?.y ?? 0)) %
        2 ===
      0
        ? 1
        : -1;
    const centroPreparado = {
      x: centroBase.x - direccion.x * 3,
      y: centroBase.y - direccion.y * 3,
    };

    await this.moverNodoAtaque({
      nodo,
      destino: centroPreparado,
      duracion: this.calcularDuracion(
        fases.preparacion ?? CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs,
      ),
      ease: "Sine.easeOut",
      version,
    });

    if (version !== this.versionCancelacion || this.destruido) {
      this.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
      return;
    }

    const angulo = Math.atan2(direccion.y, direccion.x);
    const proyectil = this.efectosReducidos
      ? null
      : await this.creadorRecursosVisuales?.crearSpriteTemporal({
          recursoVisual: municion.recursoVisual,
          centro: centroBase,
          longitudVisiblePx: Number(perfil?.animacion?.tamanoVisualPx) || 24,
          anguloRad: angulo,
          orientacionBaseGrados:
            Number(perfil?.animacion?.orientacionBaseGrados) || 0,
          anclaje: ANCLAJES_RECURSO.CENTRO,
          alpha: 0.72,
          tint: golpe?.critico === true ? 0xffe49a : null,
        });

    if (version !== this.versionCancelacion || this.destruido) {
      proyectil?.destroy?.();
      this.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
      return;
    }

    const duracionLanzamiento = this.calcularDuracion(
      fases.lanzamiento ?? 1,
    );
    const duracionTrayectoria = this.calcularDuracion(
      fases.trayectoria ?? 1,
    );
    const destinoProyectil =
      golpe?.impacto === false && evento.idObjetivo
        ? {
            x:
              centroObjetivo.x +
              lateral.x * signoDesvio * 9 +
              direccion.x * 5,
            y:
              centroObjetivo.y +
              lateral.y * signoDesvio * 9 +
              direccion.y * 5,
          }
        : centroObjetivo;

    if (proyectil) {
      const escalaX = proyectil.scaleX ?? 1;
      const escalaY = proyectil.scaleY ?? 1;
      if (golpe?.critico === true) proyectil.scaleY = escalaY * 1.22;

      await this.crearTween({
        targets: proyectil,
        x: centroBase.x + direccion.x * 5,
        y: centroBase.y + direccion.y * 5,
        alpha: 1,
        duration: duracionLanzamiento,
        ease: "Quad.easeOut",
      }, version);

      await this.crearTween({
        targets: proyectil,
        x: destinoProyectil.x,
        y: destinoProyectil.y,
        alpha: golpe?.impacto === false ? 0.72 : 1,
        scaleX: escalaX,
        scaleY: golpe?.critico === true ? escalaY * 1.22 : escalaY,
        duration: duracionTrayectoria,
        ease: "Linear",
      }, version);
    } else {
      await this.esperar(duracionLanzamiento + duracionTrayectoria, version);
    }

    const resultadosPendientes = [];
    if (golpe) {
      resultadosPendientes.push(
        this.reproducirResultadoGolpe(evento, golpe, 0, version, {
          esperarDecorativos: false,
        }),
      );
    }

    const impacto =
      golpe?.impacto === true && evento.idObjetivo && !this.efectosReducidos
        ? this.creadorEfectos?.crearImpactoProyectil({
            centro: centroObjetivo,
            critico: golpe?.critico === true,
          })
        : null;

    proyectil?.destroy?.();

    await Promise.all([
      this.moverNodoAtaque({
        nodo,
        destino: centroBase,
        duracion: this.calcularDuracion(fases.retorno ?? 1),
        ease: "Sine.easeInOut",
        version,
      }),
      this.animarEfectoAtaque(
        impacto,
        Math.max(1, Math.round(duracionTrayectoria * 0.65)),
        version,
        { critico: golpe?.critico === true },
      ),
      ...resultadosPendientes,
    ]);

    this.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
  }

  async reproducirAtaqueVarita(evento, golpes, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idAtacante);
    const centroBase = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : this.compositor.obtenerCentroCasilla(evento.origenAtacante);
    const centroObjetivo = this.compositor.obtenerCentroCasilla(
      evento.posicionObjetivo,
    );
    const disparos = this.obtenerDisparosVarita(evento, golpes);

    if (
      !nodo?.contenedor ||
      !centroBase ||
      !centroObjetivo ||
      disparos.length === 0
    ) {
      await this.reproducirAtaqueProvisional(evento, golpes, version);
      return;
    }

    const fases = evento.ritmoVisual?.fases ?? {};
    const fuentesCanalizacion = (evento?.configuracionAtaque?.fuentes ?? [])
      .filter((fuente) => fuente?.familiaObjeto === "varita");
    const direccion = normalizarDireccionImpacto({
      origen: centroBase,
      destino: centroObjetivo,
    });
    const lateral = { x: -direccion.y, y: direccion.x };
    const canalizacion = this.efectosReducidos
      ? null
      : this.creadorProyectilesElementales?.crearCanalizacion({
          centro: centroBase,
          elementos: fuentesCanalizacion.map(
            (fuente) => fuente.elementoAtaqueBasico,
          ),
          criticos: fuentesCanalizacion.map((fuente) =>
            disparos.some(
              (disparo) =>
                disparo.fuente.mano === fuente.mano &&
                disparo.golpe?.critico === true,
            ),
          ),
        });
    const duracionPreparacion = this.calcularDuracion(
      fases.preparacion ?? CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs,
    );

    if (canalizacion) {
      canalizacion.setScale?.(0.65);
      await this.crearTween({
        targets: canalizacion,
        scaleX: 1.16,
        scaleY: 1.16,
        alpha: 0.9,
        angle: disparos.length > 1 ? 35 : 18,
        duration: duracionPreparacion,
        ease: "Sine.easeOut",
      }, version);
      canalizacion.destroy?.();
    } else {
      await this.esperar(duracionPreparacion, version);
    }

    for (let indice = 0; indice < disparos.length; indice += 1) {
      if (version !== this.versionCancelacion || this.destruido) break;
      const disparo = disparos[indice];
      const esSecundaria = disparo.fuente.mano === "secundaria";
      const signoLateral = esSecundaria ? -1 : 1;
      const origenProyectil = {
        x: centroBase.x + lateral.x * signoLateral * 3,
        y: centroBase.y + lateral.y * signoLateral * 3,
      };
      const golpe = disparo.golpe;
      const destinoProyectil =
        golpe?.impacto === false && evento.idObjetivo
          ? {
              x:
                centroObjetivo.x +
                lateral.x * signoLateral * 10 +
                direccion.x * 4,
              y:
                centroObjetivo.y +
                lateral.y * signoLateral * 10 +
                direccion.y * 4,
            }
          : centroObjetivo;
      const angulo = Math.atan2(
        destinoProyectil.y - origenProyectil.y,
        destinoProyectil.x - origenProyectil.x,
      );
      const esDual = evento.ritmoVisual.secuencia === "proyectil_dual";
      const idLanzamiento = esDual
        ? esSecundaria
          ? "lanzamientoSecundaria"
          : "lanzamientoPrincipal"
        : "lanzamiento";
      const idTrayectoria = esDual
        ? esSecundaria
          ? "trayectoriaSecundaria"
          : "trayectoriaPrincipal"
        : "trayectoria";
      const duracionLanzamiento = this.calcularDuracion(
        fases[idLanzamiento] ?? 1,
      );
      const duracionTrayectoria = this.calcularDuracion(
        fases[idTrayectoria] ?? 1,
      );
      const proyectil = this.efectosReducidos
        ? null
        : this.creadorProyectilesElementales?.crearProyectil({
            elemento: disparo.fuente.elementoAtaqueBasico,
            centro: origenProyectil,
            destino: destinoProyectil,
            anguloRad: angulo,
            critico: golpe?.critico === true,
            mano: disparo.fuente.mano,
          });

      const esDescargaRayo = disparo.fuente.elementoAtaqueBasico === "rayo";
      if (proyectil) {
        proyectil.setScale?.(0.72);
        await this.crearTween({
          targets: proyectil,
          x: esDescargaRayo ? origenProyectil.x : origenProyectil.x + direccion.x * 5,
          y: esDescargaRayo ? origenProyectil.y : origenProyectil.y + direccion.y * 5,
          scaleX: golpe?.critico === true ? 1.18 : 1,
          scaleY: golpe?.critico === true ? 1.18 : 1,
          alpha: 1,
          duration: duracionLanzamiento,
          ease: "Quad.easeOut",
        }, version);
        await this.crearTween({
          targets: proyectil,
          x: esDescargaRayo ? origenProyectil.x : destinoProyectil.x,
          y: esDescargaRayo ? origenProyectil.y : destinoProyectil.y,
          alpha: golpe?.impacto === false ? 0.42 : 1,
          duration: duracionTrayectoria,
          ease: esDescargaRayo ? "Sine.easeOut" : "Linear",
        }, version);
      } else {
        await this.esperar(duracionLanzamiento + duracionTrayectoria, version);
      }

      if (version !== this.versionCancelacion || this.destruido) {
        proyectil?.destroy?.();
        break;
      }

      const impacto =
        golpe?.impacto === true && evento.idObjetivo && !this.efectosReducidos
          ? this.creadorProyectilesElementales?.crearImpacto({
              elemento: disparo.fuente.elementoAtaqueBasico,
              centro: centroObjetivo,
              critico: golpe?.critico === true,
            })
          : null;
      proyectil?.destroy?.();

      await Promise.all([
        golpe
          ? this.reproducirResultadoGolpe(evento, golpe, indice, version, {
              esperarDecorativos: false,
            })
          : Promise.resolve(),
        this.animarEfectoAtaque(
          impacto,
          Math.max(1, Math.round(duracionTrayectoria * 0.72)),
          version,
          { critico: golpe?.critico === true },
        ),
      ]);

      if (indice < disparos.length - 1) {
        await this.esperar(
          this.calcularDuracion(fases.pausaEntreManos ?? 1),
          version,
        );
      }
    }

    await this.esperar(
      this.calcularDuracion(fases.retorno ?? 1),
      version,
    );
    this.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
  }

  obtenerDisparosVarita(evento, golpes) {
    const fuentes = (evento?.configuracionAtaque?.fuentes ?? []).filter(
      (fuente) => fuente?.familiaObjeto === "varita",
    );

    if (!evento.idObjetivo) {
      return fuentes.map((fuente) => Object.freeze({ fuente, golpe: null }));
    }

    const golpesValidos = (Array.isArray(golpes) ? golpes : []).filter(Boolean);
    return golpesValidos.map((golpe, indice) => {
      const fuente =
        fuentes.find((actual) => golpe?.mano && actual?.mano === golpe.mano) ??
        fuentes[indice] ??
        fuentes[0];
      return Object.freeze({ fuente, golpe });
    }).filter((disparo) => disparo.fuente);
  }

  async reproducirAtaqueCuerpoACuerpo(evento, golpes, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idAtacante);
    const centroBase = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : this.compositor.obtenerCentroCasilla(evento.origenAtacante);
    const centroObjetivo = this.compositor.obtenerCentroCasilla(
      evento.posicionObjetivo,
    );

    if (!nodo?.contenedor || !centroBase || !centroObjetivo) {
      await this.reproducirAtaqueProvisional(evento, golpes, version);
      return;
    }

    const direccion = normalizarDireccionImpacto({
      origen: centroBase,
      destino: centroObjetivo,
    });
    const resultadosPendientes = [];
    const fases = evento.ritmoVisual?.fases ?? {};
    const perfilInicial = this.obtenerPerfilGolpe(evento, golpes[0], 0);
    const avanceInicial = this.obtenerAvancePixeles(perfilInicial);
    const centroPreparado = {
      x: centroBase.x - direccion.x * avanceInicial * 0.22,
      y: centroBase.y - direccion.y * avanceInicial * 0.22,
    };

    await this.moverNodoAtaque({
      nodo,
      destino: centroPreparado,
      duracion: this.calcularDuracion(
        fases.preparacion ?? CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs / 4,
      ),
      ease: "Sine.easeOut",
      version,
    });

    if (version !== this.versionCancelacion || this.destruido) {
      this.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
      return;
    }

    if (evento.ritmoVisual.secuencia === "estocada") {
      await this.reproducirEstocada({
        evento,
        golpe: golpes[0],
        perfil: perfilInicial,
        nodo,
        centroBase,
        centroPreparado,
        centroObjetivo,
        direccion,
        fases,
        resultadosPendientes,
        version,
      });
    } else {
      for (let indice = 0; indice < golpes.length; indice += 1) {
        if (version !== this.versionCancelacion || this.destruido) break;
        const golpe = golpes[indice];
        const perfil = this.obtenerPerfilGolpe(evento, golpe, indice);
        const idFase = evento.ritmoVisual.secuencia === "dual"
          ? indice === 0
            ? "golpePrincipal"
            : "golpeSecundario"
          : "accion";
        await this.reproducirGolpeFisico({
          evento,
          golpe,
          indiceGolpe: indice,
          perfil,
          nodo,
          centroPreparado,
          centroObjetivo,
          direccion,
          duracion: this.calcularDuracion(
            fases[idFase] ?? CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs,
          ),
          resultadosPendientes,
          version,
        });

        if (indice < golpes.length - 1) {
          await this.esperar(
            this.calcularDuracion(fases.pausaEntreManos ?? 1),
            version,
          );
        }
      }
    }

    await this.moverNodoAtaque({
      nodo,
      destino: centroBase,
      duracion: this.calcularDuracion(
        fases.retorno ?? CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs / 3,
      ),
      ease: "Sine.easeInOut",
      version,
    });
    await Promise.all(resultadosPendientes);
    this.compositor.posicionarNodoEntidad(evento.idAtacante, centroBase);
  }

  async reproducirGolpeFisico({
    evento,
    golpe,
    indiceGolpe,
    perfil,
    nodo,
    centroPreparado,
    centroObjetivo,
    direccion,
    duracion,
    resultadosPendientes,
    version,
  }) {
    const avance = this.obtenerAvancePixeles(perfil);
    const lateral = { x: -direccion.y, y: direccion.x };
    const signoMano = golpe?.mano === "secundaria" ? -1 : 1;
    const centroAtaque = {
      x: centroPreparado.x + direccion.x * avance + lateral.x * signoMano * 1.5,
      y: centroPreparado.y + direccion.y * avance + lateral.y * signoMano * 1.5,
    };
    const ida = Math.max(1, Math.round(duracion * 0.55));
    const vuelta = Math.max(1, duracion - ida);

    await this.moverNodoAtaque({
      nodo,
      destino: centroAtaque,
      duracion: ida,
      ease: "Quad.easeOut",
      version,
    });

    if (version !== this.versionCancelacion || this.destruido) {
      return;
    }

    const efecto = this.efectosReducidos
      ? null
      : this.creadorEfectos?.crearEfectoAtaqueCuerpoACuerpo({
          centroAtacante: centroAtaque,
          centroObjetivo,
          animacion: perfil.animacion,
          mano: golpe?.mano ?? null,
          critico: golpe?.critico === true,
        });
    if (golpe) {
      resultadosPendientes.push(
        this.reproducirResultadoGolpe(
          evento,
          golpe,
          indiceGolpe,
          version,
          { esperarDecorativos: false },
        ),
      );
    }

    await Promise.all([
      this.moverNodoAtaque({
        nodo,
        destino: centroPreparado,
        duracion: vuelta,
        ease: "Sine.easeIn",
        version,
      }),
      this.animarEfectoAtaque(efecto, duracion, version, {
        critico: golpe?.critico === true,
      }),
    ]);
  }

  async reproducirEstocada({
    evento,
    golpe,
    perfil,
    nodo,
    centroBase,
    centroPreparado,
    centroObjetivo,
    direccion,
    fases,
    resultadosPendientes,
    version,
  }) {
    const fuente = this.obtenerFuenteGolpe(evento, golpe, 0);
    const recursoVisual = fuente?.recursoVisual ?? null;
    const dxCasillas =
      (evento.posicionObjetivo?.x ?? 0) -
      (evento.origenAtacante?.x ?? 0);
    const dyCasillas =
      (evento.posicionObjetivo?.y ?? 0) -
      (evento.origenAtacante?.y ?? 0);
    const distanciaCasillas = Math.max(
      Math.abs(dxCasillas),
      Math.abs(dyCasillas),
    );
    const origenVisual =
      distanciaCasillas >= 2
        ? {
            x:
              centroBase.x +
              Math.sign(dxCasillas) * TAMANO_CASILLA_REFERENCIA,
            y:
              centroBase.y +
              Math.sign(dyCasillas) * TAMANO_CASILLA_REFERENCIA,
          }
        : centroBase;
    const pasoDiagonal =
      Math.abs(direccion.x) > 0.01 && Math.abs(direccion.y) > 0.01
        ? Math.SQRT2
        : 1;
    const longitudVisual =
      (Number(perfil?.animacion?.longitudVisualCasillas) || 2) *
      TAMANO_CASILLA_REFERENCIA *
      pasoDiagonal;
    const angulo = Math.atan2(direccion.y, direccion.x);
    const lanza =
      this.efectosReducidos || !recursoVisual
        ? null
        : await this.creadorRecursosVisuales?.crearSpriteTemporal({
            recursoVisual,
            centro: origenVisual,
            longitudVisiblePx: longitudVisual,
            anguloRad: angulo,
            orientacionBaseGrados:
              Number(perfil?.animacion?.orientacionBaseGrados) || 0,
            anclaje: ANCLAJES_RECURSO.CENTRO,
            alpha: 0,
            tint: golpe?.critico === true ? 0xffe49a : null,
          });

    if (version !== this.versionCancelacion || this.destruido) {
      lanza?.destroy?.();
      return;
    }

    const duracionAparicion = this.calcularDuracion(fases.avance ?? 1);
    const duracionEstocada = this.calcularDuracion(fases.estocada ?? 1);

    if (lanza) {
      const escalaX = lanza.scaleX ?? 1;
      const escalaY = lanza.scaleY ?? 1;
      lanza.scaleX = escalaX * 0.82;
      if (golpe?.critico === true) lanza.scaleY = escalaY * 1.2;
      await this.crearTween({
        targets: lanza,
        scaleX: escalaX,
        scaleY: golpe?.critico === true ? escalaY * 1.2 : escalaY,
        alpha: 1,
        duration: duracionAparicion,
        ease: "Quad.easeOut",
      }, version);
    } else {
      await this.esperar(duracionAparicion, version);
    }

    if (version !== this.versionCancelacion || this.destruido) {
      lanza?.destroy?.();
      return;
    }

    if (golpe) {
      resultadosPendientes.push(
        this.reproducirResultadoGolpe(evento, golpe, 0, version, {
          esperarDecorativos: false,
        }),
      );
    }

    if (lanza) {
      const escalaY = lanza.scaleY ?? 1;
      await this.crearTween({
        targets: lanza,
        alpha: 0.2,
        scaleY: golpe?.critico === true ? escalaY * 1.08 : escalaY,
        duration: duracionEstocada,
        ease: "Sine.easeInOut",
      }, version);
      lanza.destroy?.();
    } else {
      await this.esperar(duracionEstocada, version);
    }

    this.compositor.posicionarNodoEntidad(evento.idAtacante, centroPreparado);
  }

  obtenerPerfilGolpe(evento, golpe, indiceGolpe) {
    const fuente = this.obtenerFuenteGolpe(evento, golpe, indiceGolpe);
    return obtenerPerfilAtaque({
      familiaObjeto: fuente?.familiaObjeto ?? null,
      esAtaqueNatural: fuente?.esAtaqueNatural === true || fuente === null,
    });
  }

  obtenerFuenteGolpe(evento, golpe, indiceGolpe) {
    const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
    return (
      fuentes.find((actual) => golpe?.mano && actual?.mano === golpe.mano) ??
      fuentes[indiceGolpe] ??
      fuentes[0] ??
      null
    );
  }

  obtenerAvancePixeles(perfil) {
    return Math.max(2,
      (Number(perfil?.animacion?.avanceCasilla) || 0.25) *
        TAMANO_CASILLA_REFERENCIA,
    );
  }

  moverNodoAtaque({ nodo, destino, duracion, ease, version }) {
    return this.crearTween({
      targets: [nodo.contenedor, nodo.sombra].filter(Boolean),
      x: destino.x,
      y: destino.y,
      duration: Math.max(1, duracion),
      ease,
    }, version);
  }

  async animarEfectoAtaque(
    efecto,
    duracion,
    version,
    { critico = false } = {},
  ) {
    if (!efecto) return;
    efecto.setScale?.(critico ? 0.82 : 0.75);
    await this.crearTween({
      targets: efecto,
      scaleX: critico ? 1.42 : 1.18,
      scaleY: critico ? 1.42 : 1.18,
      alpha: 0,
      duration: Math.max(1, duracion),
      ease: "Quad.easeOut",
    }, version);
    efecto.destroy?.();
  }

  obtenerGolpesVisuales(evento) {
    const golpes = evento?.resultado?.golpes;
    if (Array.isArray(golpes) && golpes.length > 0) {
      return golpes;
    }

    const golpesRealizados = evento?.resultado?.golpesRealizados;
    if (
      evento?.idObjetivo &&
      golpesRealizados === undefined &&
      evento?.resultado
    ) {
      return [
        Object.freeze({
          mano: null,
          impacto: evento.resultado.impacto === true,
          bloqueado: evento.resultado.bloqueado === true,
          critico: evento.resultado.critico === true,
          danio: Number(evento.resultado.danio) || 0,
          vidaObjetivoAntes: null,
          vidaObjetivoDespues: evento.estadoObjetivoFinal?.vidaActual ?? null,
          vidaObjetivoMaxima: evento.estadoObjetivoFinal?.vidaMaxima ?? null,
        }),
      ];
    }

    // Un ataque a casilla vacía conserva preparación, pero no inventa fallo,
    // objetivo ni daño.
    return [null];
  }

  async reproducirGolpeProvisional(evento, golpe, indiceGolpe, version) {
    const nodoAtacante = this.compositor.obtenerNodoEntidad(evento.idAtacante);
    const duracion = this.calcularDuracion(
      CONFIGURACION_ANIMACIONES_PHASER.senalAtaqueMs,
    );

    if (nodoAtacante?.contenedor && !this.efectosReducidos) {
      const yInicial = nodoAtacante.contenedor.y;
      const escalaXInicial = nodoAtacante.contenedor.scaleX ?? 1;
      const escalaYInicial = nodoAtacante.contenedor.scaleY ?? 1;
      const mitad = Math.max(1, Math.round(duracion / 2));

      await this.crearTween({
        targets: nodoAtacante.contenedor,
        scaleX:
          escalaXInicial *
          CONFIGURACION_ANIMACIONES_PHASER.escalaPulsoAtaque,
        scaleY:
          escalaYInicial *
          CONFIGURACION_ANIMACIONES_PHASER.escalaPulsoAtaque,
        y: yInicial - CONFIGURACION_ANIMACIONES_PHASER.elevacionPulsoAtaque,
        duration: mitad,
        ease: "Sine.easeOut",
      }, version);

      await Promise.all([
        this.crearTween({
          targets: nodoAtacante.contenedor,
          scaleX: escalaXInicial,
          scaleY: escalaYInicial,
          y: yInicial,
          duration: mitad,
          ease: "Sine.easeIn",
        }, version),
        golpe
          ? this.reproducirResultadoGolpe(
              evento,
              golpe,
              indiceGolpe,
              version,
            )
          : Promise.resolve(),
      ]);

      nodoAtacante.contenedor.scaleX = escalaXInicial;
      nodoAtacante.contenedor.scaleY = escalaYInicial;
      nodoAtacante.contenedor.y = yInicial;
      return;
    }

    await Promise.all([
      this.esperar(duracion, version),
      golpe
        ? this.reproducirResultadoGolpe(evento, golpe, indiceGolpe, version)
        : Promise.resolve(),
    ]);
  }

  async reproducirResultadoGolpe(
    evento,
    golpe,
    indiceGolpe,
    version,
    { esperarDecorativos = true } = {},
  ) {
    if (!evento.idObjetivo) return;

    const esenciales = [];
    const decorativos = [];

    if (golpe.impacto !== true) {
      esenciales.push(this.reproducirFalloObjetivo(evento, version));
      decorativos.push(
        this.reproducirTextoResultado({
          evento,
          texto: "FALLO",
          tipo: TIPOS_FEEDBACK_COMBATE.FALLO,
          indiceGolpe,
          version,
        }),
      );
      await Promise.all(esenciales);
      await this.resolverDecorativos(decorativos, esperarDecorativos);
      return;
    }

    const danio = Math.max(0, Number(golpe.danio) || 0);

    if (danio > 0) {
      esenciales.push(
        this.reproducirImpactoObjetivo(evento, golpe, version),
        this.reproducirCambioVida(evento, golpe, version),
      );
      decorativos.push(
        this.reproducirTextoResultado({
          evento,
          texto: `${formatearDanio(danio)}`,
          tipo: TIPOS_FEEDBACK_COMBATE.DANIO,
          indiceGolpe,
          version,
        }),
      );
    }

    if (golpe.bloqueado === true) {
      decorativos.push(
        this.reproducirBloqueo(evento, indiceGolpe, version),
        this.reproducirTextoResultado({
          evento,
          texto: "BLOQUEO",
          tipo: TIPOS_FEEDBACK_COMBATE.BLOQUEO,
          indiceGolpe,
          desplazamientoY: 8,
          version,
        }),
      );
    }

    if (golpe.critico === true) {
      decorativos.push(
        this.reproducirTextoResultado({
          evento,
          texto: "CRÍTICO",
          tipo: TIPOS_FEEDBACK_COMBATE.CRITICO,
          indiceGolpe,
          desplazamientoY: -8,
          version,
        }),
      );
    }

    await Promise.all(esenciales);
    await this.resolverDecorativos(decorativos, esperarDecorativos);
  }

  resolverDecorativos(promesas, esperar) {
    const grupo = Promise.all(promesas);
    if (esperar) {
      return grupo;
    }
    void grupo.catch(() => {});
    return Promise.resolve();
  }

  async reproducirFalloObjetivo(evento, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idObjetivo);
    if (!nodo?.contenedor || this.efectosReducidos) return;

    const contenedor = nodo.contenedor;
    const posicionInicial = { x: contenedor.x, y: contenedor.y };
    const direccion = normalizarDireccionImpacto({
      origen: evento.origenAtacante,
      destino: evento.posicionObjetivo,
    });
    const lateral = { x: -direccion.y, y: direccion.x };
    const desplazamiento =
      CONFIGURACION_EFECTOS_COMBATE_PHASER.esquiva.desplazamientoPx;

    await this.crearTween({
      targets: contenedor,
      x: posicionInicial.x + lateral.x * desplazamiento,
      y: posicionInicial.y + lateral.y * desplazamiento,
      duration: this.calcularDuracion(
        CONFIGURACION_EFECTOS_COMBATE_PHASER.esquiva.duracionMs,
      ),
      yoyo: true,
      ease: "Sine.easeOut",
    }, version);

    contenedor.x = posicionInicial.x;
    contenedor.y = posicionInicial.y;
  }

  async reproducirImpactoObjetivo(evento, golpe, version) {
    const nodoObjetivo = this.compositor.obtenerNodoEntidad(evento.idObjetivo);
    if (!nodoObjetivo?.contenedor) return;

    const contenedor = nodoObjetivo.contenedor;
    const posicionInicial = {
      x: contenedor.x,
      y: contenedor.y,
      alpha: contenedor.alpha ?? 1,
    };
    const direccion = normalizarDireccionImpacto({
      origen: evento.origenAtacante,
      destino: evento.posicionObjetivo,
    });
    const duracion = this.calcularDuracion(
      CONFIGURACION_ANIMACIONES_PHASER.impactoObjetivoMs,
    );
    const factorCritico = golpe.critico === true
      ? CONFIGURACION_EFECTOS_COMBATE_PHASER.golpe.impactoCriticoEscala
      : 1;
    const usarMarcaGenerica = this.debeUsarMarcaImpactoGenerica(evento);
    const marca = this.efectosReducidos || !usarMarcaGenerica
      ? null
      : this.creadorEfectos?.crearMarcaImpacto({
          centro: posicionInicial,
          critico: golpe.critico === true,
        });

    if (marca) {
      marca.setScale?.(
        CONFIGURACION_ANIMACIONES_PHASER.escalaMarcaImpactoInicial,
      );
    }

    const promesas = [
      this.crearTween({
        targets: contenedor,
        x:
          posicionInicial.x +
          direccion.x *
            CONFIGURACION_ANIMACIONES_PHASER.desplazamientoImpactoPx *
            factorCritico,
        y:
          posicionInicial.y +
          direccion.y *
            CONFIGURACION_ANIMACIONES_PHASER.desplazamientoImpactoPx *
            factorCritico,
        alpha: this.efectosReducidos ? 0.72 : golpe.critico ? 0.4 : 0.52,
        duration: Math.max(1, Math.round(duracion / 2)),
        yoyo: true,
        ease: "Quad.easeOut",
      }, version),
    ];

    if (marca) {
      promesas.push(
        this.crearTween({
          targets: marca,
          scaleX: CONFIGURACION_ANIMACIONES_PHASER.escalaMarcaImpactoFinal,
          scaleY: CONFIGURACION_ANIMACIONES_PHASER.escalaMarcaImpactoFinal,
          alpha: 0,
          duration: duracion,
          ease: "Quad.easeOut",
        }, version),
      );
    }

    await Promise.all(promesas);

    contenedor.x = posicionInicial.x;
    contenedor.y = posicionInicial.y;
    contenedor.alpha = posicionInicial.alpha;
    marca?.destroy?.();
  }

  debeUsarMarcaImpactoGenerica(evento) {
    if (this.esAtaqueArco(evento) || this.esAtaqueVarita(evento)) return false;
    if (!this.esAtaqueCuerpoACuerpo(evento)) return true;

    const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
    return !fuentes.some((fuente) => {
      const perfil = obtenerPerfilAtaque({
        familiaObjeto: fuente?.familiaObjeto ?? null,
        esAtaqueNatural: fuente?.esAtaqueNatural === true || fuente == null,
      });
      return perfil?.animacion?.tipo === "corte" ||
        perfil?.animacion?.tipo === "golpe" ||
        perfil?.animacion?.tipo === "estocada" ||
        perfil?.animacion?.tipo === "estocada_recurso";
    });
  }

  async reproducirDanioPeriodico(evento, version) {
    if (!evento.idObjetivo || evento.danio <= 0) {
      return;
    }

    const golpeVisual = {
      vidaObjetivoAntes: evento.vidaAntes,
      vidaObjetivoDespues: evento.vidaDespues,
      vidaObjetivoMaxima: evento.vidaMaxima,
    };
    const nodo = this.compositor.obtenerNodoEntidad(evento.idObjetivo);
    const centro = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : this.compositor.obtenerCentroCasilla(evento.posicionObjetivo);
    const promesas = [
      this.reproducirCambioVida(evento, golpeVisual, version),
    ];

    if (centro) {
      promesas.push(
        this.reproducirTextoResultado({
          evento,
          texto: `${formatearDanio(evento.danio)}`,
          tipo: TIPOS_FEEDBACK_COMBATE.DANIO,
          indiceGolpe: 0,
          desplazamientoY: 0,
          version,
        }),
      );
    }

    if (nodo?.contenedor && !this.efectosReducidos) {
      const alphaInicial = nodo.contenedor.alpha ?? 1;
      promesas.push(
        this.crearTween({
          targets: nodo.contenedor,
          alpha: 0.48,
          duration: this.calcularDuracion(90),
          yoyo: true,
          ease: "Sine.easeOut",
        }, version).then(() => {
          if (nodo.contenedor) nodo.contenedor.alpha = alphaInicial;
        }),
      );
    }

    await Promise.all(promesas);
  }

  async reproducirEntidadDerrotada(evento, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idEntidad);
    if (!nodo) {
      return;
    }

    const objetivos = [nodo.contenedor, nodo.sombra].filter(Boolean);
    if (objetivos.length > 0 && !this.efectosReducidos) {
      await this.crearTween({
        targets: objetivos,
        alpha: 0,
        scaleX: 0.82,
        scaleY: 0.82,
        duration: this.calcularDuracion(160),
        ease: "Quad.easeIn",
      }, version);
    }

    if (version === this.versionCancelacion && !this.destruido) {
      this.compositor.retirarEntidadVisual?.(evento.idEntidad);
    }
  }

  async reproducirBloqueo(evento, indiceGolpe, version) {
    if (this.efectosReducidos) return;
    const centro = this.obtenerCentroObjetivo(evento);
    const escudo = this.creadorEfectos?.crearEscudoBloqueo({
      centro,
      indiceGolpe,
    });
    if (!escudo) return;

    await this.crearTween({
      targets: escudo,
      scaleX: CONFIGURACION_EFECTOS_COMBATE_PHASER.bloqueo.escalaFinal,
      scaleY: CONFIGURACION_EFECTOS_COMBATE_PHASER.bloqueo.escalaFinal,
      alpha: 0,
      duration: this.calcularDuracion(
        CONFIGURACION_EFECTOS_COMBATE_PHASER.bloqueo.duracionMs,
      ),
      ease: "Quad.easeOut",
    }, version);
    escudo.destroy?.();
  }

  async reproducirTextoResultado({
    evento,
    texto,
    tipo,
    indiceGolpe,
    desplazamientoY = 0,
    version,
  } = {}) {
    const centro = this.obtenerCentroObjetivo(evento);
    const objeto = this.creadorEfectos?.crearTextoFlotante({
      centro,
      texto,
      tipo,
      indiceGolpe,
      desplazamientoY,
    });
    if (!objeto) return;

    const duracion = this.calcularDuracion(
      CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.duracionMs,
    );
    const yInicial = objeto.y;

    await this.crearTween({
      targets: objeto,
      y:
        yInicial - CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.elevacionPx,
      scaleX: CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.escalaFinal,
      scaleY: CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.escalaFinal,
      alpha: 0,
      duration: duracion,
      ease: "Quad.easeOut",
    }, version);
    objeto.destroy?.();
  }

  async reproducirCambioVida(evento, golpe, version) {
    const vidaAntes = Number(golpe.vidaObjetivoAntes);
    const vidaDespues = Number(golpe.vidaObjetivoDespues);
    const vidaMaxima = Number(golpe.vidaObjetivoMaxima);

    if (
      !Number.isFinite(vidaAntes) ||
      !Number.isFinite(vidaDespues) ||
      !Number.isFinite(vidaMaxima) ||
      vidaMaxima <= 0 ||
      vidaAntes === vidaDespues
    ) {
      return;
    }

    const estado = { vida: vidaAntes };
    const actualizable = this.compositor.actualizarBarraVidaEntidad(
      evento.idObjetivo,
      {
        vidaActual: vidaAntes,
        vidaMaxima,
      },
    );
    if (!actualizable) return;

    await this.crearTween({
      targets: estado,
      vida: vidaDespues,
      duration: this.calcularDuracion(
        CONFIGURACION_EFECTOS_COMBATE_PHASER.barraVida.duracionMs,
      ),
      ease: "Linear",
      onUpdate: () => {
        this.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
          vidaActual: estado.vida,
          vidaMaxima,
        });
      },
    }, version);

    this.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
      vidaActual: vidaDespues,
      vidaMaxima,
    });
  }

  async reproducirRecursosRecuperados(evento, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idObjetivo);
    const centro = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : this.compositor.obtenerCentroCasilla(evento.posicionObjetivo);
    if (!centro || !Array.isArray(evento.recursos) || evento.recursos.length === 0) {
      return;
    }

    const fases = evento.ritmoVisual?.fases ?? {};
    const duracionPreparacion = this.calcularDuracion(
      fases.preparacion ?? 60,
    );
    const duracionUso = this.calcularDuracion(fases.uso ?? 60);
    const duracionResultado = this.calcularDuracion(
      (fases.recuperacion ?? 120) + (fases.retorno ?? 45),
    );

    await this.esperar(duracionPreparacion, version);
    if (version !== this.versionCancelacion || this.destruido) return;

    const configuracionRecurso =
      CONFIGURACION_EFECTOS_RECUPERACION_PHASER.recursoVisual;
    const sprite = evento.fuente?.recursoVisual
      ? await this.creadorRecursosVisuales?.crearSpriteTemporal({
          recursoVisual: evento.fuente.recursoVisual,
          centro: {
            x: centro.x + configuracionRecurso.desplazamientoX,
            y: centro.y + configuracionRecurso.desplazamientoY,
          },
          longitudVisiblePx: configuracionRecurso.longitudVisiblePx,
          anclaje: ANCLAJES_RECURSO.CENTRO,
          alpha: 0.2,
        })
      : null;

    const escalaSpriteX = sprite?.scaleX ?? 1;
    const escalaSpriteY = sprite?.scaleY ?? 1;
    if (sprite) {
      sprite.scaleX = escalaSpriteX * 0.72;
      sprite.scaleY = escalaSpriteY * 0.72;
      await this.crearTween({
        targets: sprite,
        scaleX: escalaSpriteX * 1.05,
        scaleY: escalaSpriteY * 1.05,
        alpha: 1,
        y: sprite.y - 3,
        duration: duracionUso,
        ease: "Sine.easeOut",
      }, version);
    } else {
      await this.esperar(duracionUso, version);
    }

    if (version !== this.versionCancelacion || this.destruido) {
      sprite?.destroy?.();
      return;
    }

    const efecto = this.creadorEfectosRecuperacion?.crearRecuperacion({
      centro,
      recursos: evento.recursos,
      reducido: this.efectosReducidos,
    });
    if (efecto) {
      void this.animarRecuperacionFija(efecto, centro, version).catch(() => {});
    }
    void this.reproducirAumentoVidaExplicito(evento, version).catch(() => {});

    if (sprite) {
      await this.crearTween({
        targets: sprite,
        alpha: 0,
        scaleX: escalaSpriteX * 0.82,
        scaleY: escalaSpriteY * 0.82,
        duration: Math.max(1, duracionResultado),
        ease: "Sine.easeIn",
      }, version);
      sprite.destroy?.();
    } else {
      await this.esperar(Math.max(1, duracionResultado), version);
    }
  }

  async animarRecuperacionFija(efecto, centro, version) {
    const configuracion =
      CONFIGURACION_EFECTOS_RECUPERACION_PHASER.recuperacion;

    await this.crearTween({
      targets: efecto,
      scaleX: configuracion.escalaVisible,
      scaleY: configuracion.escalaVisible,
      alpha: 1,
      duration: configuracion.entradaMs,
      ease: "Sine.easeOut",
    }, version);

    if (version !== this.versionCancelacion || this.destruido) {
      efecto.destroy?.(true);
      return;
    }

    await this.esperar(configuracion.permanenciaMs, version);
    await this.crearTween({
      targets: efecto,
      scaleX: configuracion.escalaFinal,
      scaleY: configuracion.escalaFinal,
      alpha: 0,
      y: centro.y - configuracion.elevacionSalidaPx,
      duration: configuracion.salidaMs,
      ease: "Quad.easeOut",
    }, version);
    efecto.destroy?.(true);
  }

  async reproducirAumentoVidaExplicito(evento, version) {
    const vida = evento.recursos.find((recurso) => recurso.recurso === "vida");
    if (!vida) return;
    const valorAntes = Number(vida.valorAntes);
    const valorDespues = Number(vida.valorDespues);
    const valorMaximo = Number(vida.valorMaximo);
    if (
      !Number.isFinite(valorAntes) ||
      !Number.isFinite(valorDespues) ||
      !Number.isFinite(valorMaximo) ||
      valorMaximo <= 0 ||
      valorDespues <= valorAntes
    ) {
      return;
    }

    const estado = { vida: valorAntes };
    const actualizable = this.compositor.actualizarBarraVidaEntidad(
      evento.idObjetivo,
      { vidaActual: valorAntes, vidaMaxima: valorMaximo },
    );
    if (!actualizable) return;

    await this.crearTween({
      targets: estado,
      vida: valorDespues,
      duration: this.calcularDuracion(
        CONFIGURACION_EFECTOS_COMBATE_PHASER.barraVida.duracionMs,
      ),
      ease: "Linear",
      onUpdate: () => {
        this.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
          vidaActual: estado.vida,
          vidaMaxima: valorMaximo,
        });
      },
    }, version);
    this.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
      vidaActual: valorDespues,
      vidaMaxima: valorMaximo,
    });
  }

  async reproducirNivelAumentado(evento, version) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idJugador);
    const centro = nodo?.contenedor
      ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
      : this.compositor.obtenerCentroCasilla(evento.posicion);
    if (!centro) return;

    const efecto = this.creadorEfectosRecuperacion?.crearHolyBless({
      centro,
      nivelActual: evento.nivelActual,
      reducido: this.efectosReducidos,
    });
    if (!efecto) return;

    const configuracion =
      CONFIGURACION_EFECTOS_RECUPERACION_PHASER.nivel;
    await this.crearTween({
      targets: efecto,
      scaleX: configuracion.escalaVisible,
      scaleY: configuracion.escalaVisible,
      alpha: 1,
      duration: configuracion.entradaMs,
      ease: "Sine.easeOut",
    }, version);

    if (version !== this.versionCancelacion || this.destruido) {
      efecto.destroy?.(true);
      return;
    }

    void this.finalizarHolyBless(efecto, centro, version).catch(() => {});
  }

  async finalizarHolyBless(efecto, centro, version) {
    const configuracion =
      CONFIGURACION_EFECTOS_RECUPERACION_PHASER.nivel;

    await this.esperar(configuracion.permanenciaMs, version);
    await this.crearTween({
      targets: efecto,
      scaleX: configuracion.escalaFinal,
      scaleY: configuracion.escalaFinal,
      alpha: 0,
      y: centro.y - configuracion.elevacionSalidaPx,
      duration: configuracion.salidaMs,
      ease: "Sine.easeOut",
    }, version);
    efecto.destroy?.(true);
  }

  obtenerCentroObjetivo(evento) {
    const nodo = this.compositor.obtenerNodoEntidad(evento.idObjetivo);
    if (nodo?.contenedor) {
      return { x: nodo.contenedor.x, y: nodo.contenedor.y };
    }

    return this.compositor.obtenerCentroCasilla(evento.posicionObjetivo);
  }

  calcularDuracion(duracionBase) {
    return calcularDuracionAnimacionPhaser(duracionBase, {
      velocidad: this.velocidad,
      cantidadPendiente: this.obtenerCantidadEventosPendientes(),
    });
  }

  crearTween(configuracion, version) {
    return new Promise((resolver) => {
      if (version !== this.versionCancelacion || this.destruido) {
        resolver();
        return;
      }

      let tween = null;
      let finalizado = false;
      const finalizar = () => {
        if (finalizado) return;
        finalizado = true;
        if (tween) this.tweensActivos.delete(tween);
        resolver();
      };

      tween = this.escena.tweens.add({
        ...configuracion,
        onComplete: finalizar,
        onStop: finalizar,
      });
      this.tweensActivos.add(tween);
    });
  }

  esperar(duracion, version) {
    return new Promise((resolver) => {
      if (version !== this.versionCancelacion || this.destruido) {
        resolver();
        return;
      }

      let finalizado = false;
      const espera = {
        temporizador: null,
        finalizar: null,
      };
      const finalizar = () => {
        if (finalizado) return;
        finalizado = true;
        this.temporizadoresActivos.delete(espera);
        resolver();
      };

      espera.finalizar = finalizar;
      espera.temporizador = this.escena.time.delayedCall(duracion, finalizar);
      this.temporizadoresActivos.add(espera);
    });
  }
}

function normalizarDireccionImpacto({ origen, destino } = {}) {
  const diferenciaX = Number(destino?.x) - Number(origen?.x);
  const diferenciaY = Number(destino?.y) - Number(origen?.y);
  const longitud = Math.hypot(diferenciaX, diferenciaY);

  if (!Number.isFinite(longitud) || longitud === 0) {
    return Object.freeze({ x: 0, y: -1 });
  }

  return Object.freeze({
    x: diferenciaX / longitud,
    y: diferenciaY / longitud,
  });
}

function formatearDanio(valor) {
  return Number.isInteger(valor) ? `${valor}` : valor.toFixed(1);
}
