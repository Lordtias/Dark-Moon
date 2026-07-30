import { crearSemillaAleatoria } from "../juego/generacion/GeneradorAleatorio.js";

import { generarStockMercader } from "../juego/comercio/GeneradorStockMercader.js";

import { EstadoMercader } from "./EstadoMercader.js";

// Coordina los mercaderes que deben sobrevivir
// al reemplazo de Juego.
//
// El gestor no pertenece a un mapa concreto.
// Sus EstadosMercader permanecen activos durante
// toda la sesión y conservan el stock hasta la próxima
// renovación o hasta que una futura operación
// comercial lo modifique.
export class GestorMercaderesPartida {
  constructor({
    configuracionObjetos,
    configuracionGeneracionObjetos,
    configuracionComercio,
  } = {}) {
    validarObjetoPlano(configuracionObjetos, "la configuración de objetos");

    validarObjetoPlano(
      configuracionGeneracionObjetos,
      "la configuración de generación de objetos",
    );

    validarObjetoPlano(configuracionComercio, "la configuración de comercio");

    validarObjetoPlano(
      configuracionComercio.mercaderes,
      "el catálogo de mercaderes",
    );

    this.configuracionObjetos = configuracionObjetos;

    this.configuracionGeneracionObjetos = configuracionGeneracionObjetos;

    this.configuracionComercio = configuracionComercio;

    this.estadosMercaderes = new Map();

    this.inicializado = false;

    for (const [idMercader, configuracionMercader] of Object.entries(
      configuracionComercio.mercaderes,
    )) {
      this.estadosMercaderes.set(
        idMercader,

        new EstadoMercader({
          id: idMercader,

          nombre: configuracionMercader.nombre,

          capacidadStock: configuracionMercader.stock.capacidad,
        }),
      );
    }
  }

  // Crea el primer stock disponible
  // al comenzar la partida.
  //
  // Repetir la llamada no modifica
  // el stock ya inicializado.
  inicializarStocks({
    semilla = crearSemillaAleatoria(),

    nivelReferencia = 1,
  } = {}) {
    if (this.inicializado) {
      return this.obtenerResumen();
    }

    const resumen = this.renovarTodos({
      semillaBase: semilla,
      nivelReferencia,
      numeroExpedicion: 0,
      motivo: "inicio",
    });

    this.inicializado = true;

    return resumen;
  }

  // Renueva el stock después de que el jugador
  // entra en una mazmorra.
  //
  // Así, al regresar a la ciudad, los objetos fijos
  // vuelven a estar completos y los espacios
  // aleatorios muestran otra selección.
  renovarStocksTrasExpedicion({
    semillaMapa,
    nivelMapa,
    numeroExpedicion,
  } = {}) {
    if (!this.inicializado) {
      throw new Error(
        "Los mercaderes deben inicializarse antes de renovar su stock.",
      );
    }

    return this.renovarTodos({
      semillaBase: semillaMapa,

      nivelReferencia: nivelMapa,

      numeroExpedicion,

      motivo: "expedicion",
    });
  }

  // Devuelve el estado mutable de un mercader.
  //
  // La interfaz comercial futura utilizará
  // este método para acceder a su contenedor.
  obtenerMercader(idMercader) {
    if (typeof idMercader !== "string" || idMercader.trim() === "") {
      throw new Error("Se necesita el ID del mercader.");
    }

    const idNormalizado = idMercader.trim().toLowerCase();

    const estado = this.estadosMercaderes.get(idNormalizado);

    if (!estado) {
      throw new Error(`No existe el mercader "${idNormalizado}".`);
    }

    return estado;
  }

  obtenerResumen() {
    return Array.from(this.estadosMercaderes.values()).map((estado) =>
      estado.obtenerResumen(),
    );
  }

  renovarTodos({ semillaBase, nivelReferencia, numeroExpedicion, motivo }) {
    validarSemilla(semillaBase);

    if (!Number.isInteger(nivelReferencia) || nivelReferencia < 1) {
      throw new Error("El nivel de referencia de los mercaderes no es válido.");
    }

    if (!Number.isInteger(numeroExpedicion) || numeroExpedicion < 0) {
      throw new Error("El número de expedición no es válido.");
    }

    // Generamos todos los stocks antes de reemplazar
    // ninguno. Si una configuración falla, ningún
    // mercader queda parcialmente renovado.
    const stocksGenerados = [];

    for (const [idMercader, estado] of this.estadosMercaderes.entries()) {
      const configuracionMercader =
        this.configuracionComercio.mercaderes[idMercader];

      const semillaMercader =
        `${semillaBase}:${motivo}:${numeroExpedicion}:` +
        `${idMercader}:${estado.numeroRenovaciones + 1}`;

      stocksGenerados.push({
        estado,

        generacion: generarStockMercader({
          configuracionMercader,

          configuracionObjetos: this.configuracionObjetos,

          configuracionGeneracionObjetos: this.configuracionGeneracionObjetos,

          semilla: semillaMercader,

          nivelReferencia,
        }),
      });
    }

    return stocksGenerados.map(({ estado, generacion }) =>
      estado.reemplazarStock({
        objetos: generacion.objetos,

        semilla: generacion.semilla,

        numeroExpedicion,

        nivelReferencia: generacion.nivelObjeto,
      }),
    );
  }
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`GestorMercaderesPartida necesita ${descripcion}.`);
  }
}

function validarSemilla(semilla) {
  const esEntero = Number.isInteger(semilla);

  const esTexto = typeof semilla === "string" && semilla.trim() !== "";

  if (!esEntero && !esTexto) {
    throw new Error("La renovación de mercaderes necesita una semilla válida.");
  }
}
