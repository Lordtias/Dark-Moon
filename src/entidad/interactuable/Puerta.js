import { Entidad } from "../Entidad.js";
import { TIPOS_INTERACCION } from "../../juego/interacciones/TiposInteraccion.js";
import { COSTOS_TEMPORALES_BASE } from "../../juego/tiempo/SistemaTiempo.js";

export const ESTADOS_PUERTA = Object.freeze({
  ABIERTA: "abierta",
  CERRADA: "cerrada",
});

export const ORIENTACIONES_PUERTA = Object.freeze({
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
});

export const DIRECCIONES_APERTURA_PUERTA = Object.freeze({
  NORTE: "norte",
  SUR: "sur",
  ESTE: "este",
  OESTE: "oeste",
});

export const LADOS_BISAGRA_PUERTA = Object.freeze({
  INICIO: "inicio",
  FIN: "fin",
});

export const RECURSO_VISUAL_PUERTA_CERRADA_PREDETERMINADO =
  "assets/imagenes/interactuables/puerta_mazmorra.png";

const ESTADOS_VALIDOS = new Set(Object.values(ESTADOS_PUERTA));
const ORIENTACIONES_VALIDAS = new Set(Object.values(ORIENTACIONES_PUERTA));
const DIRECCIONES_VALIDAS = new Set(
  Object.values(DIRECCIONES_APERTURA_PUERTA),
);
const LADOS_BISAGRA_VALIDOS = new Set(Object.values(LADOS_BISAGRA_PUERTA));

// Entidad canónica para puertas y portones. La entidad controla el estado,
// la ocupación y la interacción; Phaser y Canvas solamente representan ese
// estado. La lista de casillas permite ampliar el mismo contrato a portones.
export class Puerta extends Entidad {
  constructor({
    id,
    nombre = "Puerta",
    x = 0,
    y = 0,
    casillas = null,
    estado = ESTADOS_PUERTA.CERRADA,
    orientacion = ORIENTACIONES_PUERTA.HORIZONTAL,
    direccionApertura = DIRECCIONES_APERTURA_PUERTA.NORTE,
    ladoBisagra = LADOS_BISAGRA_PUERTA.INICIO,
    costoAccion = COSTOS_TEMPORALES_BASE.accion,
    alcance = 1,
    prioridad = 95,
    simboloAbierto = ".",
    simboloCerrado = "#",
    recursoVisualCerrada =
      RECURSO_VISUAL_PUERTA_CERRADA_PREDETERMINADO,
    recursoVisualAbierta = null,
  } = {}) {
    validarTexto(id, "ID de puerta");
    validarTexto(nombre, "nombre de puerta");
    validarEstado(estado);
    validarOrientacion(orientacion);
    validarDireccionApertura({ orientacion, direccionApertura });
    validarLadoBisagra(ladoBisagra);
    validarNumeroPositivo(costoAccion, "costo de acción de la puerta");
    validarEnteroNoNegativo(alcance, "alcance de la puerta");
    validarNumeroFinito(prioridad, "prioridad de la puerta");
    validarSimbolo(simboloAbierto, "símbolo abierto");
    validarSimbolo(simboloCerrado, "símbolo cerrado");
    validarRecurso(recursoVisualCerrada, "recurso de puerta cerrada");
    validarRecurso(recursoVisualAbierta, "recurso de puerta abierta");

    const casillasNormalizadas = normalizarCasillas({ casillas, x, y });
    const principal = casillasNormalizadas[0];

    super({
      nombre: nombre.trim(),
      x: principal.x,
      y: principal.y,
      simbolo: estado === ESTADOS_PUERTA.ABIERTA ? "/" : "D",
    });

    this.id = id.trim();
    this.casillas = Object.freeze(
      casillasNormalizadas.map((casilla) => Object.freeze({ ...casilla })),
    );
    this.estado = estado;
    this.orientacion = orientacion;
    this.direccionApertura = direccionApertura;
    this.ladoBisagra = ladoBisagra;
    this.costoAccion = costoAccion;
    this.alcance = alcance;
    this.prioridad = prioridad;
    this.simboloAbierto = simboloAbierto;
    this.simboloCerrado = simboloCerrado;
    this.recursoVisualCerrada = normalizarRecurso(recursoVisualCerrada);
    this.recursoVisualAbierta = normalizarRecurso(recursoVisualAbierta);
    this.esPuertaArquitectonica = true;

    this.actualizarPresentacion();
  }

  get estaAbierta() {
    return this.estado === ESTADOS_PUERTA.ABIERTA;
  }

  get estaCerrada() {
    return this.estado === ESTADOS_PUERTA.CERRADA;
  }

  ocupaCasilla(x, y) {
    return this.casillas.some(
      (casilla) => casilla.x === x && casilla.y === y,
    );
  }

  bloqueaMovimientoEn(x, y) {
    return this.estaCerrada && this.ocupaCasilla(x, y);
  }

  obtenerInteracciones() {
    return [
      {
        tipo: TIPOS_INTERACCION.ALTERNAR_PUERTA,
        texto: this.estaCerrada ? `Abrir ${this.nombre}` : `Cerrar ${this.nombre}`,
        alcance: this.alcance,
        prioridad: this.prioridad,
      },
    ];
  }

  alternar({ mapa } = {}) {
    return this.estaCerrada ? this.abrir({ mapa }) : this.cerrar({ mapa });
  }

  abrir({ mapa } = {}) {
    if (this.estaAbierta) {
      return false;
    }

    this.estado = ESTADOS_PUERTA.ABIERTA;
    this.actualizarPresentacion();
    this.sincronizarMapa(mapa);
    return true;
  }

  cerrar({ mapa } = {}) {
    if (this.estaCerrada) {
      return false;
    }

    this.estado = ESTADOS_PUERTA.CERRADA;
    this.actualizarPresentacion();
    this.sincronizarMapa(mapa);
    return true;
  }

  sincronizarMapa(mapa) {
    validarMapa(mapa);
    const simbolo = this.estaCerrada
      ? this.simboloCerrado
      : this.simboloAbierto;

    for (const casilla of this.casillas) {
      if (!mapa[casilla.y] || mapa[casilla.y][casilla.x] === undefined) {
        throw new Error(
          `${this.nombre} ocupa una casilla inexistente (${casilla.x}, ${casilla.y}).`,
        );
      }

      mapa[casilla.y][casilla.x] = simbolo;
    }
  }

  obtenerEstadoVisual() {
    return Object.freeze({
      tipo: "puerta",
      id: this.id,
      estado: this.estado,
      orientacion: this.orientacion,
      direccionApertura: this.direccionApertura,
      ladoBisagra: this.ladoBisagra,
      casillas: this.casillas.map((casilla) => ({ ...casilla })),
      abierta: this.estaAbierta,
    });
  }

  actualizarPresentacion() {
    this.simbolo = this.estaAbierta ? "/" : "D";
    this.recursoVisual = this.estaAbierta
      ? this.recursoVisualAbierta
      : this.recursoVisualCerrada;
  }
}

function normalizarCasillas({ casillas, x, y }) {
  const origen = casillas ?? [{ x, y }];

  if (!Array.isArray(origen) || origen.length === 0) {
    throw new Error("Una puerta necesita al menos una casilla.");
  }

  const normalizadas = [];
  const claves = new Set();

  for (const casilla of origen) {
    if (!Number.isInteger(casilla?.x) || !Number.isInteger(casilla?.y)) {
      throw new Error("Las casillas de una puerta deben usar coordenadas enteras.");
    }

    const clave = `${casilla.x},${casilla.y}`;
    if (claves.has(clave)) {
      throw new Error(`La puerta repite la casilla ${clave}.`);
    }

    claves.add(clave);
    normalizadas.push({ x: casilla.x, y: casilla.y });
  }

  return normalizadas;
}

function validarDireccionApertura({ orientacion, direccionApertura }) {
  if (!DIRECCIONES_VALIDAS.has(direccionApertura)) {
    throw new Error(`Dirección de apertura inválida: ${direccionApertura}.`);
  }

  const compatibles =
    orientacion === ORIENTACIONES_PUERTA.HORIZONTAL
      ? new Set([
          DIRECCIONES_APERTURA_PUERTA.NORTE,
          DIRECCIONES_APERTURA_PUERTA.SUR,
        ])
      : new Set([
          DIRECCIONES_APERTURA_PUERTA.ESTE,
          DIRECCIONES_APERTURA_PUERTA.OESTE,
        ]);

  if (!compatibles.has(direccionApertura)) {
    throw new Error(
      `Una puerta ${orientacion} no puede abrir hacia ${direccionApertura}.`,
    );
  }
}

function validarLadoBisagra(ladoBisagra) {
  if (!LADOS_BISAGRA_VALIDOS.has(ladoBisagra)) {
    throw new Error(`Lado de bisagra inválido: ${ladoBisagra}.`);
  }
}

function validarEstado(estado) {
  if (!ESTADOS_VALIDOS.has(estado)) {
    throw new Error(`Estado de puerta inválido: ${estado}.`);
  }
}

function validarOrientacion(orientacion) {
  if (!ORIENTACIONES_VALIDAS.has(orientacion)) {
    throw new Error(`Orientación de puerta inválida: ${orientacion}.`);
  }
}

function validarMapa(mapa) {
  if (!Array.isArray(mapa) || mapa.length === 0) {
    throw new Error("La puerta necesita un mapa mutable válido.");
  }
}

function validarTexto(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`Se necesita un ${descripcion} válido.`);
  }
}

function validarSimbolo(valor, descripcion) {
  if (typeof valor !== "string" || Array.from(valor).length !== 1) {
    throw new Error(`El ${descripcion} debe contener un único carácter.`);
  }
}

function validarEnteroNoNegativo(valor, descripcion) {
  if (!Number.isInteger(valor) || valor < 0) {
    throw new Error(`El ${descripcion} debe ser un entero no negativo.`);
  }
}

function validarNumeroPositivo(valor, descripcion) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`El ${descripcion} debe ser mayor que cero.`);
  }
}

function validarNumeroFinito(valor, descripcion) {
  if (!Number.isFinite(valor)) {
    throw new Error(`La ${descripcion} debe ser numérica.`);
  }
}

function validarRecurso(valor, descripcion) {
  if (
    valor !== null &&
    valor !== undefined &&
    (typeof valor !== "string" || valor.trim() === "")
  ) {
    throw new Error(`El ${descripcion} debe ser una ruta válida o null.`);
  }
}

function normalizarRecurso(valor) {
  return typeof valor === "string" ? valor.trim() : null;
}
