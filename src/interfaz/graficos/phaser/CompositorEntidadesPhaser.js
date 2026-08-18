import {
  ESTADOS_HOSTILIDAD_VISUAL,
  TIPOS_ENTIDAD_VISUAL,
} from "../TiposEscena.js";
import { TAMANO_CASILLA_REFERENCIA } from "./ConfiguracionPhaser.js";
import {
  calcularPresentacionEntidadPhaser,
  CONFIGURACION_ENTIDADES_PHASER,
  obtenerEstiloRespaldoEntidadPhaser,
} from "./ConfiguracionEntidadesPhaser.js";

// Compone y mantiene la representación persistente de entidades visuales.
// No decide visibilidad, selección, terreno ni reglas jugables.
export class CompositorEntidadesPhaser {
  constructor({
    escena,
    gestorRecursos,
    capaSombras,
    capaEntidades,
    creadorEstadosTemporales,
    obtenerPosicionCasilla,
  } = {}) {
    if (
      !escena?.add ||
      !gestorRecursos ||
      !capaSombras ||
      !capaEntidades ||
      !creadorEstadosTemporales ||
      typeof obtenerPosicionCasilla !== "function"
    ) {
      throw new Error(
        "CompositorEntidadesPhaser necesita escena, recursos, capas y conversión de casillas.",
      );
    }

    this.escena = escena;
    this.gestorRecursos = gestorRecursos;
    this.capaSombras = capaSombras;
    this.capaEntidades = capaEntidades;
    this.creadorEstadosTemporales = creadorEstadosTemporales;
    this.obtenerPosicionCasilla = obtenerPosicionCasilla;
    this.nodosEntidades = new Map();
    this.recursosVisualesMostrados = new Map();
  }

  obtenerNodoEntidad(idVisual) {
    return typeof idVisual === "string"
      ? this.nodosEntidades.get(idVisual) ?? null
      : null;
  }

  posicionarNodoEntidad(idVisual, centro) {
    const nodo = this.obtenerNodoEntidad(idVisual);
    if (!nodo || !Number.isFinite(centro?.x) || !Number.isFinite(centro?.y)) {
      return false;
    }

    if (nodo.contenedor) {
      nodo.contenedor.x = centro.x;
      nodo.contenedor.y = centro.y;
    }

    if (nodo.sombra) {
      nodo.sombra.x = centro.x;
      nodo.sombra.y = centro.y;
    }

    return true;
  }

  actualizarOrientacionEntidad(idVisual, origen, destino) {
    const nodo = this.obtenerNodoEntidad(idVisual);
    const recursoVisualBase = nodo?.entidad?.recursoVisual ?? null;
    if (!nodo?.contenedor || !recursoVisualBase) return false;

    const direccion = obtenerDireccionVisualEntrePosiciones(origen, destino);
    if (!direccion) return false;

    const recursoVisualActual =
      this.recursosVisualesMostrados.get(idVisual) ?? recursoVisualBase;
    const recursoVisualResuelto =
      normalizarRecursoVisual(
        nodo.entidad?.recursosVisualesDireccionales?.[direccion],
      ) ?? recursoVisualActual;

    if (recursoVisualResuelto === recursoVisualActual) return true;

    const informacionRecurso =
      this.gestorRecursos.obtenerInformacion(recursoVisualResuelto);
    if (!informacionRecurso || !nodo.imagen?.setTexture) return false;

    const metricas = calcularPresentacionEntidadPhaser(informacionRecurso);
    nodo.imagen.setTexture(informacionRecurso.claveTextura);
    nodo.imagen.setOrigin(metricas.anclaje.x, metricas.anclaje.y);
    nodo.imagen.setDisplaySize(metricas.anchoDibujo, metricas.altoDibujo);
    nodo.recursoVisualMostrado = recursoVisualResuelto;
    this.recursosVisualesMostrados.set(idVisual, recursoVisualResuelto);
    return true;
  }

  actualizarHostilidadEntidad(idVisual, estadoHostilidad) {
    const nodo = this.obtenerNodoEntidad(idVisual);
    if (
      !nodo?.contenedor ||
      nodo.entidad?.tipo !== TIPOS_ENTIDAD_VISUAL.ENEMIGO ||
      !Object.values(ESTADOS_HOSTILIDAD_VISUAL).includes(estadoHostilidad)
    ) {
      return false;
    }

    if (estadoHostilidad === ESTADOS_HOSTILIDAD_VISUAL.AGRESIVO) {
      if (!nodo.indicadorAgresividad) {
        nodo.indicadorAgresividad = this.agregarAgresividad(nodo.contenedor);
      }
    } else if (nodo.indicadorAgresividad) {
      nodo.indicadorAgresividad.destroy?.();
      nodo.indicadorAgresividad = null;
    }

    nodo.entidad = {
      ...nodo.entidad,
      estadoHostilidad,
    };
    return true;
  }

  retirarEntidadVisual(idVisual) {
    const nodo = this.obtenerNodoEntidad(idVisual);
    if (!nodo) {
      return false;
    }

    nodo.contenedor?.destroy?.(true);
    nodo.sombra?.destroy?.();
    this.nodosEntidades.delete(idVisual);
    this.recursosVisualesMostrados.delete(idVisual);
    return true;
  }

  establecerEfectoTemporalEntidad(idVisual, efecto) {
    const nodo = this.obtenerNodoEntidad(idVisual);
    if (!nodo?.contenedor || !efecto?.perfilVisual) return false;
    if (omitirPersistenteEstadoJugador(nodo.entidad?.tipo, efecto)) {
      return false;
    }

    if (!(nodo.estadosTemporales instanceof Map)) {
      nodo.estadosTemporales = new Map();
    }
    const clave = obtenerClaveEstadoTemporal(efecto);
    if (!clave) return false;

    const existente = nodo.estadosTemporales.get(clave) ?? null;
    if (existente) {
      return this.creadorEstadosTemporales.actualizarPersistente({
        objeto: existente,
        efecto,
      });
    }

    const objeto = this.creadorEstadosTemporales.crearPersistente({ efecto });
    if (!objeto) return false;
    nodo.contenedor.add(objeto);
    nodo.estadosTemporales.set(clave, objeto);
    return true;
  }

  retirarEfectoTemporalEntidad(idVisual, efecto) {
    const nodo = this.obtenerNodoEntidad(idVisual);
    const clave = obtenerClaveEstadoTemporal(efecto);
    if (!nodo?.estadosTemporales || !clave) return false;
    const objeto = nodo.estadosTemporales.get(clave);
    if (!objeto) return false;
    objeto.destroy?.(true);
    nodo.estadosTemporales.delete(clave);
    return true;
  }

  reconciliarEfectosTemporalesDesdeEscenaActual() {
    for (const [idVisual, nodo] of this.nodosEntidades.entries()) {
      this.reconciliarEfectosTemporalesEntidad(
        idVisual,
        nodo.entidad?.efectosTemporales ?? [],
      );
    }
  }

  reconciliarEfectosTemporalesEntidad(idVisual, efectos = []) {
    const nodo = this.obtenerNodoEntidad(idVisual);
    if (!nodo?.contenedor) return false;
    if (!(nodo.estadosTemporales instanceof Map)) {
      nodo.estadosTemporales = new Map();
    }

    const esperados = new Map(
      (Array.isArray(efectos) ? efectos : [])
        .filter((efecto) => !omitirPersistenteEstadoJugador(nodo.entidad?.tipo, efecto))
        .map((efecto) => [obtenerClaveEstadoTemporal(efecto), efecto])
        .filter(([clave]) => Boolean(clave)),
    );

    for (const [clave, objeto] of nodo.estadosTemporales.entries()) {
      if (!esperados.has(clave)) {
        objeto.destroy?.(true);
        nodo.estadosTemporales.delete(clave);
      }
    }
    for (const efecto of esperados.values()) {
      this.establecerEfectoTemporalEntidad(idVisual, efecto);
    }
    return true;
  }

  dibujarSombrasEntidades(escenaDarkMoon) {
    this.capaSombras.removeAll(true);
    this.capaEntidades.removeAll(true);
    this.nodosEntidades.clear();

    const aparienciaPhaser = escenaDarkMoon?.mapa?.apariencia?.phaser ?? {};
    const configuracionSombras = normalizarConfiguracionSombras(
      aparienciaPhaser.sombras,
    );

    for (const entidad of escenaDarkMoon?.entidades ?? []) {
      const posicion = this.obtenerPosicionCasilla(entidad);
      if (!posicion) continue;

      const idVisual =
        typeof entidad.idVisual === "string" ? entidad.idVisual : null;
      const centro = obtenerCentroEntidad(posicion);
      const recursoVisualMostrado = this.obtenerRecursoVisualMostrado(
        entidad,
        idVisual,
      );
      const metricas = this.obtenerMetricasVisualesEntidad(
        entidad,
        recursoVisualMostrado,
      );
      const opacidad =
        entidad.estaViva === false
          ? configuracionSombras.opacidadEntidades * 0.45
          : configuracionSombras.opacidadEntidades;
      const sombra = this.escena.add.graphics({
        x: centro.x,
        y: centro.y,
      });

      sombra.fillStyle(configuracionSombras.color, opacidad);
      sombra.fillEllipse(
        metricas.desplazamientoSombraX,
        metricas.desplazamientoSombraY,
        metricas.sombraAncho,
        metricas.sombraAlto,
      );

      if (
        entidad.tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO &&
        entidad.estadoHostilidad === ESTADOS_HOSTILIDAD_VISUAL.AGRESIVO
      ) {
        sombra.lineStyle(1, 0xf06b64, 0.48);
        sombra.strokeEllipse(
          metricas.desplazamientoSombraX,
          metricas.desplazamientoSombraY,
          metricas.sombraAncho + 2,
          metricas.sombraAlto + 2,
        );
      }

      this.capaSombras.add(sombra);
      if (idVisual) {
        this.nodosEntidades.set(idVisual, {
          entidad,
          sombra,
          contenedor: null,
          barraVida: null,
        });
      }
    }
  }

  dibujarEntidades(escenaDarkMoon) {
    const entidades = [...(escenaDarkMoon?.entidades ?? [])].sort(
      compararEntidades,
    );

    for (const entidad of entidades) {
      this.crearNodoEntidadVisual(entidad);
    }
  }

  establecerEntidadVisualTemporal(entidad) {
    if (!entidad || typeof entidad !== "object") return null;
    const idVisual =
      typeof entidad.idVisual === "string" ? entidad.idVisual : null;
    const existente = idVisual
      ? this.nodosEntidades.get(idVisual) ?? null
      : null;
    if (existente?.contenedor) return existente;
    return this.crearNodoEntidadVisual(entidad);
  }

  crearNodoEntidadVisual(entidad) {
    const posicion = this.obtenerPosicionCasilla(entidad);
    if (!posicion) return null;

    const idVisual =
      typeof entidad.idVisual === "string" ? entidad.idVisual : null;
    const estilo = obtenerEstiloRespaldoEntidadPhaser(entidad.tipo);
    const centro = obtenerCentroEntidad(posicion);
    const recursoVisualMostrado = this.obtenerRecursoVisualMostrado(
      entidad,
      idVisual,
    );
    const metricas = this.obtenerMetricasVisualesEntidad(
      entidad,
      recursoVisualMostrado,
    );
    const informacionRecurso = metricas.informacionRecurso;
    const contenedor = this.escena.add.container(centro.x, centro.y);
    let imagen = null;

    if (
      entidad.tipo === TIPOS_ENTIDAD_VISUAL.INTERACTUABLE &&
      entidad.activo === false &&
      entidad.atenuarInactivo !== false
    ) {
      contenedor.setAlpha(
        CONFIGURACION_ENTIDADES_PHASER.opacidadInteractuableInactivo,
      );
    }

    if (informacionRecurso) {
      imagen = this.escena.add.image(
        0,
        0,
        informacionRecurso.claveTextura,
      );
      imagen.setOrigin(metricas.anclaje.x, metricas.anclaje.y);
      imagen.setDisplaySize(metricas.anchoDibujo, metricas.altoDibujo);
      imagen.setAlpha(
        entidad.estaViva === false
          ? CONFIGURACION_ENTIDADES_PHASER.opacidadEntidadMuerta
          : 1,
      );
      contenedor.add(imagen);
    } else {
      this.agregarRespaldoEntidad({
        contenedor,
        entidad,
        estilo,
      });
    }

    const indicadorAgresividad =
      entidad.tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO &&
      entidad.estadoHostilidad === ESTADOS_HOSTILIDAD_VISUAL.AGRESIVO
        ? this.agregarAgresividad(contenedor)
        : null;

    const indicadorVariante =
      entidad.tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO
        ? this.agregarIndicadorVariante(contenedor, entidad.idVariante)
        : null;

    const barraVida =
      entidad.tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO
        ? this.agregarBarraVida(contenedor, entidad)
        : null;

    const estadosTemporales = this.agregarEstadosTemporales(
      contenedor,
      entidad.efectosTemporales,
      entidad.tipo,
    );

    this.capaEntidades.add(contenedor);
    if (!idVisual) {
      return {
        entidad,
        contenedor,
        barraVida,
        indicadorAgresividad,
        indicadorVariante,
        estadosTemporales,
        imagen,
        recursoVisualMostrado,
      };
    }

    const nodoExistente = this.nodosEntidades.get(idVisual) ?? {};
    const nodo = {
      ...nodoExistente,
      entidad,
      contenedor,
      barraVida,
      indicadorAgresividad,
      indicadorVariante,
      estadosTemporales,
      imagen,
      recursoVisualMostrado,
    };
    this.nodosEntidades.set(idVisual, nodo);
    if (recursoVisualMostrado) {
      this.recursosVisualesMostrados.set(idVisual, recursoVisualMostrado);
    }
    return nodo;
  }

  agregarEstadosTemporales(contenedor, efectos = [], tipoEntidad = null) {
    const objetos = new Map();
    if (!contenedor || !Array.isArray(efectos)) return objetos;

    for (const efecto of efectos) {
      if (omitirPersistenteEstadoJugador(tipoEntidad, efecto)) continue;
      const clave = obtenerClaveEstadoTemporal(efecto);
      if (!clave || !efecto?.perfilVisual) continue;
      const objeto = this.creadorEstadosTemporales.crearPersistente({ efecto });
      if (!objeto) continue;
      contenedor.add(objeto);
      objetos.set(clave, objeto);
    }
    return objetos;
  }

  obtenerRecursoVisualMostrado(entidad, idVisual = null) {
    const recursoVisualBase = entidad?.recursoVisual ?? null;
    if (!recursoVisualBase || !idVisual) return recursoVisualBase;

    const recursoPersistido = this.recursosVisualesMostrados.get(idVisual);
    const recursosPermitidos = new Set([
      recursoVisualBase,
      ...Object.values(entidad?.recursosVisualesDireccionales ?? {}),
    ]);

    return recursosPermitidos.has(recursoPersistido)
      ? recursoPersistido
      : recursoVisualBase;
  }

  obtenerMetricasVisualesEntidad(entidad, recursoVisual = null) {
    const informacionRecurso = this.gestorRecursos.obtenerInformacion(
      recursoVisual ?? entidad.recursoVisual,
    );

    return calcularPresentacionEntidadPhaser(informacionRecurso);
  }

  agregarRespaldoEntidad({ contenedor, entidad, estilo }) {
    const tamano = CONFIGURACION_ENTIDADES_PHASER.respaldo.tamano;
    const graficos = this.escena.add.graphics();
    graficos.fillStyle(estilo.fondo, 0.94);
    graficos.fillRect(-tamano / 2, -tamano / 2, tamano, tamano);
    graficos.lineStyle(2, estilo.borde, 1);
    graficos.strokeRect(
      -tamano / 2 + 0.5,
      -tamano / 2 + 0.5,
      tamano - 1,
      tamano - 1,
    );

    const texto = this.escena.add
      .text(0, 0, entidad.simbolo ?? "?", {
        color: estilo.texto,
        fontFamily: "monospace",
        fontSize: "16px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    contenedor.add([graficos, texto]);
  }

  agregarAgresividad(contenedor) {
    const configuracion = CONFIGURACION_ENTIDADES_PHASER.indicadorAgresividad;
    const indicador = this.escena.add.container(
      configuracion.desplazamientoX,
      configuracion.desplazamientoY,
    );
    const graficos = this.escena.add.graphics();
    graficos.fillStyle(0x37080d, 0.95);
    graficos.fillCircle(0, 0, configuracion.radio);
    graficos.lineStyle(configuracion.grosorBorde, 0xff3f4d, 1);
    graficos.strokeCircle(0, 0, configuracion.radio);

    const texto = this.escena.add
      .text(0, 0, "!", {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: configuracion.tamanoTexto,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    indicador.add([graficos, texto]);
    contenedor.add(indicador);
    return indicador;
  }

  agregarIndicadorVariante(contenedor, idVariante) {
    const estilos = {
      enfermo: {
        forma: "gota",
        relleno: 0x4ecf69,
        borde: 0x173f21,
      },
      gigante: {
        forma: "rombo",
        relleno: 0xff9d3f,
        borde: 0x5c2f0d,
      },
      elite: {
        forma: "estrella",
        relleno: 0xffe66d,
        borde: 0x6b5412,
      },
    };
    const estilo = estilos[idVariante];
    if (!estilo) return null;

    const configuracion = CONFIGURACION_ENTIDADES_PHASER.indicadorVariante;
    const indicador = this.escena.add.container(
      configuracion.desplazamientoX,
      configuracion.desplazamientoY,
    );
    const graficos = this.escena.add.graphics();
    const radio = configuracion.tamano / 2;

    graficos.fillStyle(estilo.relleno, 1);
    graficos.lineStyle(configuracion.grosorBorde, estilo.borde, 1);
    graficos.beginPath();

    if (estilo.forma === "rombo") {
      graficos.moveTo(0, -radio);
      graficos.lineTo(radio, 0);
      graficos.lineTo(0, radio);
      graficos.lineTo(-radio, 0);
    } else if (estilo.forma === "gota") {
      graficos.moveTo(0, -radio);
      graficos.lineTo(radio * 0.72, radio * 0.25);
      graficos.lineTo(radio * 0.45, radio * 0.75);
      graficos.lineTo(0, radio);
      graficos.lineTo(-radio * 0.45, radio * 0.75);
      graficos.lineTo(-radio * 0.72, radio * 0.25);
    } else {
      for (let indice = 0; indice < 10; indice += 1) {
        const angulo = -Math.PI / 2 + indice * (Math.PI / 5);
        const radioPunto = indice % 2 === 0 ? radio : radio * 0.44;
        const x = Math.cos(angulo) * radioPunto;
        const y = Math.sin(angulo) * radioPunto;
        if (indice === 0) graficos.moveTo(x, y);
        else graficos.lineTo(x, y);
      }
    }

    graficos.closePath();
    graficos.fillPath();
    graficos.strokePath();
    indicador.add(graficos);
    contenedor.add(indicador);
    return indicador;
  }

  agregarBarraVida(contenedor, entidad) {
    const graficos = this.escena.add.graphics();
    const barra = { graficos };
    contenedor.add(graficos);
    this.actualizarGraficosBarraVida(barra, {
      vidaActual: entidad.vidaActual,
      vidaMaxima: entidad.vidaMaxima,
      visible: entidad.mostrarBarraVida === true,
    });
    return barra;
  }

  actualizarBarraVidaEntidad(
    idVisual,
    { vidaActual, vidaMaxima, mostrarAunqueCero = true } = {},
  ) {
    const nodo = this.obtenerNodoEntidad(idVisual);
    if (
      !nodo?.barraVida ||
      nodo.entidad?.tipo !== TIPOS_ENTIDAD_VISUAL.ENEMIGO ||
      !Number.isFinite(vidaActual) ||
      !Number.isFinite(vidaMaxima) ||
      vidaMaxima <= 0
    ) {
      return false;
    }

    this.actualizarGraficosBarraVida(nodo.barraVida, {
      vidaActual,
      vidaMaxima,
      visible:
        vidaActual < vidaMaxima && (mostrarAunqueCero || vidaActual > 0),
    });
    return true;
  }

  actualizarGraficosBarraVida(
    barra,
    { vidaActual, vidaMaxima, visible = true } = {},
  ) {
    const graficos = barra?.graficos;
    if (!graficos) return;

    const porcentaje = Math.max(
      0,
      Math.min(1, Number(vidaActual) / Number(vidaMaxima)),
    );
    const ancho = TAMANO_CASILLA_REFERENCIA - 6;
    const color =
      porcentaje <= 0.25
        ? 0xe55555
        : porcentaje <= 0.5
          ? 0xe4c44e
          : 0x55cf72;
    const x = -TAMANO_CASILLA_REFERENCIA / 2 + 3;
    const y = -TAMANO_CASILLA_REFERENCIA / 2 + 2;

    graficos.clear?.();
    graficos.fillStyle(0x0a0a0c, 0.9);
    graficos.fillRect(x, y, ancho, 4);
    graficos.fillStyle(color, 1);
    graficos.fillRect(
      x + 1,
      y + 1,
      Math.max(0, (ancho - 2) * porcentaje),
      2,
    );
    graficos.setVisible?.(visible === true);
  }

  destruir() {
    this.nodosEntidades.clear();
    this.recursosVisualesMostrados.clear();
    this.escena = null;
    this.gestorRecursos = null;
    this.capaSombras = null;
    this.capaEntidades = null;
    this.creadorEstadosTemporales = null;
    this.obtenerPosicionCasilla = null;
  }
}

export function obtenerCentroEntidadPhaser(posicion) {
  return obtenerCentroEntidad(posicion);
}

function omitirPersistenteEstadoJugador(tipoEntidad, efecto) {
  if (tipoEntidad !== TIPOS_ENTIDAD_VISUAL.JUGADOR) return false;
  const etiquetas = Array.isArray(efecto?.etiquetas) ? efecto.etiquetas : [];
  return etiquetas.includes("aura") || etiquetas.includes("maldicion");
}

function obtenerClaveEstadoTemporal(efecto) {
  if (!efecto || typeof efecto !== "object") return null;
  if (typeof efecto.id === "string" && efecto.id !== "") return efecto.id;
  if (
    typeof efecto.catalogoEfectoId === "string" &&
    efecto.catalogoEfectoId !== ""
  ) {
    return `catalogo:${efecto.catalogoEfectoId}`;
  }
  return null;
}

function obtenerCentroEntidad(posicion) {
  return Object.freeze({
    x: posicion.x + TAMANO_CASILLA_REFERENCIA / 2,
    y: posicion.y + TAMANO_CASILLA_REFERENCIA / 2,
  });
}

function obtenerDireccionVisualEntrePosiciones(origen, destino) {
  if (!esPosicionVisual(origen) || !esPosicionVisual(destino)) return null;

  const desplazamientoX = Math.sign(destino.x - origen.x);
  const desplazamientoY = Math.sign(destino.y - origen.y);

  if (desplazamientoX === 0 && desplazamientoY === 0) return null;
  if (desplazamientoY < 0 && desplazamientoX < 0) return "arriba_izquierda";
  if (desplazamientoY < 0 && desplazamientoX > 0) return "arriba_derecha";
  if (desplazamientoY > 0 && desplazamientoX < 0) return "abajo_izquierda";
  if (desplazamientoY > 0 && desplazamientoX > 0) return "abajo_derecha";
  if (desplazamientoY < 0) return "arriba";
  if (desplazamientoY > 0) return "abajo";
  if (desplazamientoX < 0) return "izquierda";
  return "derecha";
}

function esPosicionVisual(posicion) {
  return (
    posicion !== null &&
    typeof posicion === "object" &&
    Number.isFinite(posicion.x) &&
    Number.isFinite(posicion.y)
  );
}

function normalizarRecursoVisual(recursoVisual) {
  if (typeof recursoVisual !== "string") return null;
  const normalizado = recursoVisual.trim();
  return normalizado === "" ? null : normalizado;
}

function compararEntidades(a, b) {
  const baseA = Number.isFinite(a.y) ? a.y : -1;
  const baseB = Number.isFinite(b.y) ? b.y : -1;
  if (baseA !== baseB) return baseA - baseB;
  if (a.x !== b.x) return a.x - b.x;
  return prioridadEntidad(a.tipo) - prioridadEntidad(b.tipo);
}

function prioridadEntidad(tipo) {
  switch (tipo) {
    case TIPOS_ENTIDAD_VISUAL.INTERACTUABLE:
      return 0;
    case TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE:
      return 1;
    case TIPOS_ENTIDAD_VISUAL.ENEMIGO:
      return 2;
    case TIPOS_ENTIDAD_VISUAL.JUGADOR:
      return 3;
    default:
      return 4;
  }
}

function normalizarConfiguracionSombras(configuracion = {}) {
  return Object.freeze({
    color: convertirColor(configuracion.color, 0x06100c),
    opacidadMuros: limitarNumero(
      configuracion.opacidadMuros,
      0,
      0.8,
      0.34,
    ),
    opacidadEntidades: limitarNumero(
      configuracion.opacidadEntidades,
      0,
      0.8,
      0.42,
    ),
  });
}

function convertirColor(valor, respaldo) {
  if (typeof valor !== "string" || !/^#[0-9a-f]{6}$/i.test(valor)) {
    return respaldo;
  }

  return Number.parseInt(valor.slice(1), 16);
}

function limitarNumero(valor, minimo, maximo, respaldo) {
  if (!Number.isFinite(valor)) {
    return respaldo;
  }

  return Math.max(minimo, Math.min(maximo, valor));
}
