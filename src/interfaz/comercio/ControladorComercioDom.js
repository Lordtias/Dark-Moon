import {
  calcularPrecioCompra,
  calcularPrecioVenta,
} from "../../juego/comercio/CalculadorPreciosComercio.js";

import {
  comprarObjetoMercader,
  venderObjetoMercader,
} from "../../juego/comercio/SistemaComercio.js";

// Conecta el dominio comercial con ModalComercio.
//
// El controlador no genera stock ni calcula rarezas.
// Recibe el mercader persistente y coordina:
//
// - Precios.
// - Transacciones.
// - Mensajes.
// - Actualización visual.
export class ControladorComercioDom {
  constructor({
    juego,
    modalComercio,
    gestorMercaderesPartida,
    configuracionObjetos,
    configuracionRarezas,
    configuracionComercio,
    alEjecutarAccionJugable,
  } = {}) {
    validarJuego(juego);

    validarModal(modalComercio);

    validarGestorMercaderes(gestorMercaderesPartida);

    validarObjetoPlano(configuracionObjetos, "configuración de objetos");

    validarObjetoPlano(configuracionRarezas, "configuración de rarezas");

    validarObjetoPlano(configuracionComercio, "configuración de comercio");

    if (typeof alEjecutarAccionJugable !== "function") {
      throw new Error(
        "ControladorComercioDom necesita una acción jugable centralizada.",
      );
    }

    this.juego = juego;
    this.alEjecutarAccionJugable = alEjecutarAccionJugable;
    this.modalComercio = modalComercio;

    this.gestorMercaderesPartida = gestorMercaderesPartida;

    this.configuracionObjetos = configuracionObjetos;

    this.configuracionRarezas = configuracionRarezas;

    this.configuracionComercio = configuracionComercio;
  }

  // Abre el comercio asociado
  // al NPC seleccionado.
  abrir(idMercader) {
    const mercader = this.gestorMercaderesPartida.obtenerMercader(idMercader);

    this.modalComercio.abrir({
      mercader,

      jugador: this.juego.player,

      calcularCompra: ({ indice, cantidad }) =>
        this.calcularCompra({
          mercader,
          indice,
          cantidad,
        }),

      calcularVenta: ({ indice, cantidad }) =>
        this.calcularVenta({
          mercader,
          indice,
          cantidad,
        }),

      alComprar: ({ indice, cantidad }) =>
        this.comprar({
          mercader,
          indice,
          cantidad,
        }),

      alVender: ({ indice, cantidad }) =>
        this.vender({
          mercader,
          indice,
          cantidad,
        }),
    });
  }

  calcularCompra({ mercader, indice, cantidad }) {
    const objeto = mercader.stock.obtenerObjetoEn(indice);

    if (!objeto) {
      return null;
    }

    return calcularPrecioCompra({
      objeto,

      jugador: this.juego.player,

      idMercader: mercader.id,

      configuracionRarezas: this.configuracionRarezas,

      configuracionComercio: this.configuracionComercio,

      cantidad,
    });
  }

  calcularVenta({ mercader, indice, cantidad }) {
    const objeto = this.juego.player.inventario.obtenerObjetoEn(indice);

    if (!objeto) {
      return null;
    }

    return calcularPrecioVenta({
      objeto,

      jugador: this.juego.player,

      idMercader: mercader.id,

      configuracionRarezas: this.configuracionRarezas,

      configuracionComercio: this.configuracionComercio,

      cantidad,
    });
  }

  comprar({ mercader, indice, cantidad }) {
    return this.ejecutarAccionJugable({
      tipoEntrada: "comprar_objeto",
      ejecutar: () =>
        comprarObjetoMercader({
          jugador: this.juego.player,

          mercader,

          indiceStock: indice,

          cantidad,

          configuracionObjetos: this.configuracionObjetos,

          configuracionRarezas: this.configuracionRarezas,

          configuracionComercio: this.configuracionComercio,
        }),
    });
  }

  vender({ mercader, indice, cantidad }) {
    return this.ejecutarAccionJugable({
      tipoEntrada: "vender_objeto",
      ejecutar: () =>
        venderObjetoMercader({
          jugador: this.juego.player,

          mercader,

          indiceInventario: indice,

          cantidad,

          configuracionObjetos: this.configuracionObjetos,

          configuracionRarezas: this.configuracionRarezas,

          configuracionComercio: this.configuracionComercio,
        }),
    });
  }

  ejecutarAccionJugable({ tipoEntrada, ejecutar }) {
    const ejecucion = this.alEjecutarAccionJugable({
      tipoEntrada,
      origenEntrada: "comercio_dom",
      ejecutar,
      procesarResultado: true,
    });

    return ejecucion.aceptada ? ejecucion.resultado : null;
  }

  desactivar() {
    this.modalComercio.cerrar();
  }
}

function validarJuego(juego) {
  if (!juego?.player?.inventario) {
    throw new Error(
      "ControladorComercioDom necesita un Juego con jugador e inventario.",
    );
  }
}

function validarModal(modalComercio) {
  if (
    !modalComercio ||
    typeof modalComercio.abrir !== "function" ||
    typeof modalComercio.cerrar !== "function"
  ) {
    throw new Error(
      "ControladorComercioDom necesita un modal de comercio válido.",
    );
  }
}

function validarGestorMercaderes(gestor) {
  if (!gestor || typeof gestor.obtenerMercader !== "function") {
    throw new Error(
      "ControladorComercioDom necesita un gestor de mercaderes válido.",
    );
  }
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(
      `ControladorComercioDom necesita una ${descripcion} válida.`,
    );
  }
}
