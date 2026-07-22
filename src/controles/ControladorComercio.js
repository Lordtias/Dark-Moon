import {
  calcularPrecioCompra,
  calcularPrecioVenta,
} from "../juego/comercio/CalculadorPreciosComercio.js";

import {
  comprarObjetoMercader,
  venderObjetoMercader,
} from "../juego/comercio/SistemaComercio.js";

import { aplicarResultadoAccion } from "./ProcesadorResultadoAccion.js";

// Conecta el dominio comercial con ModalComercio.
//
// El controlador no genera stock ni calcula rarezas.
// Recibe el mercader persistente y coordina:
//
// - Precios.
// - Transacciones.
// - Mensajes.
// - Actualización visual.
export class ControladorComercio {
  constructor({
    juego,
    renderizador,
    modalComercio,
    gestorMercaderesPartida,
    configuracionObjetos,
    configuracionRarezas,
    configuracionComercio,
  } = {}) {
    validarJuego(juego);

    validarRenderizador(renderizador);

    validarModal(modalComercio);

    validarGestorMercaderes(gestorMercaderesPartida);

    validarObjetoPlano(configuracionObjetos, "configuración de objetos");

    validarObjetoPlano(configuracionRarezas, "configuración de rarezas");

    validarObjetoPlano(configuracionComercio, "configuración de comercio");

    this.juego = juego;
    this.renderizador = renderizador;
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
    const resultado = comprarObjetoMercader({
      jugador: this.juego.player,

      mercader,

      indiceStock: indice,

      cantidad,

      configuracionObjetos: this.configuracionObjetos,

      configuracionRarezas: this.configuracionRarezas,

      configuracionComercio: this.configuracionComercio,
    });

    return this.procesarResultado(resultado);
  }

  vender({ mercader, indice, cantidad }) {
    const resultado = venderObjetoMercader({
      jugador: this.juego.player,

      mercader,

      indiceInventario: indice,

      cantidad,

      configuracionObjetos: this.configuracionObjetos,

      configuracionRarezas: this.configuracionRarezas,

      configuracionComercio: this.configuracionComercio,
    });

    return this.procesarResultado(resultado);
  }

  procesarResultado(resultado) {
    return aplicarResultadoAccion({
      resultado,

      juego: this.juego,

      renderizador: this.renderizador,
    });
  }

  desactivar() {
    this.modalComercio.cerrar();
  }
}

function validarJuego(juego) {
  if (!juego?.player?.inventario) {
    throw new Error(
      "ControladorComercio necesita un Juego con jugador e inventario.",
    );
  }
}

function validarRenderizador(renderizador) {
  if (
    !renderizador ||
    typeof renderizador.dibujarJuego !== "function" ||
    typeof renderizador.mostrarMensaje !== "function"
  ) {
    throw new Error("ControladorComercio necesita un renderizador válido.");
  }
}

function validarModal(modalComercio) {
  if (
    !modalComercio ||
    typeof modalComercio.abrir !== "function" ||
    typeof modalComercio.cerrar !== "function"
  ) {
    throw new Error(
      "ControladorComercio necesita un modal de comercio válido.",
    );
  }
}

function validarGestorMercaderes(gestor) {
  if (!gestor || typeof gestor.obtenerMercader !== "function") {
    throw new Error(
      "ControladorComercio necesita un gestor de mercaderes válido.",
    );
  }
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`ControladorComercio necesita una ${descripcion} válida.`);
  }
}
