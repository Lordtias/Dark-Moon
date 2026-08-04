import {
  TIPOS_EVENTO_VISUAL,
} from "../PlanificadorEventosVisuales.js";
import { TIPOS_ENTIDAD_VISUAL } from "../TiposEscena.js";
import {
  calcularDuracionAnimacionPhaser,
  CONFIGURACION_ANIMACIONES_PHASER,
  normalizarVelocidadAnimacionPhaser,
} from "./ConfiguracionAnimacionesPhaser.js";

// Reproduce hechos ya resueltos. La cola jamás modifica el estado del juego ni
// decide el orden temporal: solamente conserva el orden recibido.
export class ReproductorEventosVisualesPhaser {
  constructor({
    escena,
    compositor,
    alAplicarEscena,
    alMoverJugadorVisual = null,
  } = {}) {
    if (!escena?.tweens || !escena?.time || !compositor) {
      throw new Error(
        "El reproductor visual necesita escena Phaser y compositor válidos.",
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
      }
    }

    if (version === this.versionCancelacion && !this.destruido) {
      this.alAplicarEscena(actualizacion.escenaFinal);
    }
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
        this.debeMostrarImpacto(evento)
          ? this.reproducirImpactoObjetivo(evento, version)
          : Promise.resolve(),
      ]);

      nodoAtacante.contenedor.scaleX = escalaXInicial;
      nodoAtacante.contenedor.scaleY = escalaYInicial;
      nodoAtacante.contenedor.y = yInicial;
    } else {
      await Promise.all([
        this.esperar(duracion, version),
        this.debeMostrarImpacto(evento)
          ? this.reproducirImpactoObjetivo(evento, version)
          : Promise.resolve(),
      ]);
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

  debeMostrarImpacto(evento) {
    return Boolean(
      evento?.idObjetivo &&
      evento.resultado?.impacto === true &&
      Number(evento.resultado?.danio) > 0,
    );
  }

  async reproducirImpactoObjetivo(evento, version) {
    const nodoObjetivo = this.compositor.obtenerNodoEntidad(evento.idObjetivo);
    if (!nodoObjetivo?.contenedor) {
      return;
    }

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
    const marca = this.efectosReducidos
      ? null
      : this.crearMarcaImpacto(posicionInicial);

    const promesas = [
      this.crearTween({
        targets: contenedor,
        x:
          posicionInicial.x +
          direccion.x * CONFIGURACION_ANIMACIONES_PHASER.desplazamientoImpactoPx,
        y:
          posicionInicial.y +
          direccion.y * CONFIGURACION_ANIMACIONES_PHASER.desplazamientoImpactoPx,
        alpha: this.efectosReducidos ? 0.72 : 0.52,
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

  crearMarcaImpacto(posicion) {
    const marca = this.escena.add.graphics({
      x: posicion.x,
      y: posicion.y,
    });
    marca.setScale?.(
      CONFIGURACION_ANIMACIONES_PHASER.escalaMarcaImpactoInicial,
    );
    marca.lineStyle(2, 0xfff0b8, 0.95);
    marca.beginPath?.();
    marca.moveTo?.(-7, -5);
    marca.lineTo?.(7, 5);
    marca.moveTo?.(6, -7);
    marca.lineTo?.(-5, 7);
    marca.strokePath?.();
    marca.fillStyle(0xffffff, 0.82);
    marca.fillCircle(0, 0, 3);
    this.compositor.agregarEfectoTemporal(marca);
    return marca;
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
