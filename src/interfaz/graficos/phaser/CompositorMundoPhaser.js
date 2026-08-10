import {
  ALTO_REFERENCIA_PHASER,
  ANCHO_REFERENCIA_PHASER,
  TAMANO_CASILLA_REFERENCIA,
} from "./ConfiguracionPhaser.js";
import { CreadorEstadosTemporalesPhaser } from "./CreadorEstadosTemporalesPhaser.js";
import { obtenerRutasRecursosMapaPhaser } from "./RecursosMapaPhaser.js";
import { CreadorZonasTemporalesPhaser } from "./CreadorZonasTemporalesPhaser.js";
import {
  CompositorEntidadesPhaser,
  obtenerCentroEntidadPhaser,
} from "./CompositorEntidadesPhaser.js";
import { CompositorSeleccionPhaser } from "./CompositorSeleccionPhaser.js";
import {
  CompositorTerrenoPhaser,
  normalizarConfiguracionIluminacion,
} from "./CompositorTerrenoPhaser.js";

const COLOR_NIEBLA = 0x000000;
const OPACIDAD_NO_DESCUBIERTO = 1;
const OPACIDAD_DESCUBIERTO_NO_VISIBLE = 0.58;

// Coordina la composición del mundo Phaser a partir de la escena neutral.
// Mantiene la API pública usada por cámara y reproductores, mientras delega
// terreno, entidades y selección a compositores especializados.
export class CompositorMundoPhaser {
  constructor({ escena, gestorRecursos, conversorCoordenadas } = {}) {
    if (!escena?.add || !gestorRecursos || !conversorCoordenadas) {
      throw new Error(
        "CompositorMundoPhaser necesita escena, recursos y conversor.",
      );
    }

    this.escena = escena;
    this.gestorRecursos = gestorRecursos;
    this.conversorCoordenadas = conversorCoordenadas;
    this.escenaDarkMoon = null;
    this.geometria = null;
    this.firmaTerreno = null;
    this.casillaPuntero = null;
    this.zonasTemporalesVisuales = new Map();

    this.capaFondo = escena.add.container(0, 0).setDepth(0);
    this.capaTerreno = escena.add.container(0, 0).setDepth(10);
    this.capaDecoracion = escena.add.container(0, 0).setDepth(20);
    this.capaZonas = escena.add.container(0, 0).setDepth(30);
    this.capaSombras = escena.add.container(0, 0).setDepth(40);
    this.capaSeleccion = escena.add.container(0, 0).setDepth(50);
    this.capaEntidades = escena.add.container(0, 0).setDepth(60);
    this.capaIluminacion = escena.add.container(0, 0).setDepth(70);
    this.capaEfectos = escena.add.container(0, 0).setDepth(80);
    // La visibilidad es la máscara final del mundo. Una casilla nunca
    // descubierta debe ocultar terreno, zonas, selección, entidades y efectos.
    this.capaVisibilidad = escena.add.container(0, 0).setDepth(90);

    this.creadorEstadosTemporales = new CreadorEstadosTemporalesPhaser({
      escena,
      compositor: this,
    });
    this.creadorZonasTemporales = new CreadorZonasTemporalesPhaser({
      escena,
      compositor: this,
    });

    this.compositorTerreno = new CompositorTerrenoPhaser({
      escena,
      gestorRecursos,
      capaFondo: this.capaFondo,
      capaTerreno: this.capaTerreno,
      capaDecoracion: this.capaDecoracion,
    });
    this.compositorEntidades = new CompositorEntidadesPhaser({
      escena,
      gestorRecursos,
      capaSombras: this.capaSombras,
      capaEntidades: this.capaEntidades,
      creadorEstadosTemporales: this.creadorEstadosTemporales,
      obtenerPosicionCasilla: (casilla) => this.obtenerPosicionCasilla(casilla),
    });
    this.compositorSeleccion = new CompositorSeleccionPhaser({
      escena,
      capaSeleccion: this.capaSeleccion,
      obtenerPosicionCasilla: (casilla) => this.obtenerPosicionCasilla(casilla),
    });

    // Conserva la referencia histórica para consumidores que inspeccionan el
    // compositor, aunque la autoridad sobre los nodos reside en entidades.
    this.nodosEntidades = this.compositorEntidades.nodosEntidades;
  }

  actualizar(escenaDarkMoon) {
    validarEscena(escenaDarkMoon);
    this.escenaDarkMoon = escenaDarkMoon;

    const mapa = escenaDarkMoon.mapa.casillas;
    const filas = mapa.length;
    const columnas = mapa[0].length;
    const geometriaNueva = crearGeometria({ columnas, filas });
    const firmaNueva = crearFirmaTerreno(escenaDarkMoon);

    this.precargarRecursos(escenaDarkMoon);

    this.geometria = geometriaNueva;
    this.conversorCoordenadas.actualizarGeometria(this.geometria);
    this.compositorSeleccion.actualizarContexto({
      escenaDarkMoon: this.escenaDarkMoon,
      geometria: this.geometria,
    });

    if (firmaNueva !== this.firmaTerreno) {
      this.firmaTerreno = firmaNueva;
      this.dibujarBaseMundo();
    }

    this.dibujarVisibilidad();
    this.dibujarZonas();
    this.dibujarSombrasEntidades();
    this.dibujarSeleccion();
    this.dibujarEntidades();
    this.dibujarIluminacion();

    return {
      ...this.geometria,
      identificadorMapa: crearIdentificadorTerreno(firmaNueva),
    };
  }

  obtenerNodoEntidad(idVisual) {
    return this.compositorEntidades.obtenerNodoEntidad(idVisual);
  }

  obtenerCentroCasilla(casilla) {
    const posicion = this.obtenerPosicionCasilla(casilla);
    return posicion ? obtenerCentroEntidadPhaser(posicion) : null;
  }

  posicionarNodoEntidad(idVisual, centro) {
    return this.compositorEntidades.posicionarNodoEntidad(idVisual, centro);
  }

  actualizarHostilidadEntidad(idVisual, estadoHostilidad) {
    return this.compositorEntidades.actualizarHostilidadEntidad(
      idVisual,
      estadoHostilidad,
    );
  }

  retirarEntidadVisual(idVisual) {
    return this.compositorEntidades.retirarEntidadVisual(idVisual);
  }

  agregarEfectoTemporal(objetoVisual) {
    if (!objetoVisual || !this.capaEfectos) {
      return false;
    }

    this.capaEfectos.add(objetoVisual);
    return true;
  }

  limpiarEfectosTemporales() {
    if (!this.capaEfectos) {
      return false;
    }
    this.capaEfectos.removeAll(true);
    return true;
  }

  establecerEfectoTemporalEntidad(idVisual, efecto) {
    return this.compositorEntidades.establecerEfectoTemporalEntidad(
      idVisual,
      efecto,
    );
  }

  retirarEfectoTemporalEntidad(idVisual, efecto) {
    return this.compositorEntidades.retirarEfectoTemporalEntidad(
      idVisual,
      efecto,
    );
  }

  reconciliarEfectosTemporalesDesdeEscenaActual() {
    return this.compositorEntidades.reconciliarEfectosTemporalesDesdeEscenaActual();
  }

  reconciliarEfectosTemporalesEntidad(idVisual, efectos = []) {
    return this.compositorEntidades.reconciliarEfectosTemporalesEntidad(
      idVisual,
      efectos,
    );
  }

  obtenerZonaTemporalVisual(idZona) {
    return typeof idZona === "string"
      ? this.zonasTemporalesVisuales.get(idZona) ?? null
      : null;
  }

  establecerZonaTemporal(zona) {
    if (!zona || typeof zona.id !== "string" || !zona.perfilVisual) {
      return null;
    }

    const existente = this.obtenerZonaTemporalVisual(zona.id);
    if (existente) {
      const actualizada = this.creadorZonasTemporales?.actualizarPersistente({
        objeto: existente,
        zona,
      });
      if (actualizada) {
        existente.alpha = 1;
        return existente;
      }
      this.retirarZonaTemporal(zona.id);
    }

    const objeto = this.creadorZonasTemporales?.crearPersistente({ zona });
    if (!objeto) return null;
    this.capaZonas.add(objeto);
    this.zonasTemporalesVisuales.set(zona.id, objeto);
    return objeto;
  }

  retirarZonaTemporal(idZona) {
    const objeto = this.obtenerZonaTemporalVisual(idZona);
    if (!objeto) return false;
    this.creadorZonasTemporales?.destruirPersistente(objeto);
    this.zonasTemporalesVisuales.delete(idZona);
    return true;
  }

  reconciliarZonasTemporales(zonas = []) {
    const esperadas = new Map(
      (Array.isArray(zonas) ? zonas : [])
        .filter((zona) => typeof zona?.id === "string" && zona.id !== "")
        .map((zona) => [zona.id, zona]),
    );

    for (const idZona of [...this.zonasTemporalesVisuales.keys()]) {
      if (!esperadas.has(idZona)) this.retirarZonaTemporal(idZona);
    }
    for (const zona of esperadas.values()) {
      this.establecerZonaTemporal(zona);
    }
    return true;
  }

  reconciliarZonasTemporalesDesdeEscenaActual() {
    return this.reconciliarZonasTemporales(
      this.escenaDarkMoon?.zonasTemporales ?? [],
    );
  }

  invalidarTerreno() {
    this.firmaTerreno = null;
  }

  ocultarSeleccionTemporal() {
    return this.compositorSeleccion.ocultarTemporal();
  }

  establecerCasillaPuntero(casilla) {
    this.compositorSeleccion.establecerCasillaPuntero(casilla);
    this.casillaPuntero = this.compositorSeleccion.casillaPuntero;
  }

  precargarRecursos(escenaDarkMoon) {
    const rutas = obtenerRutasRecursosMapaPhaser({ escena: escenaDarkMoon });
    this.gestorRecursos.precargar(rutas);
  }

  dibujarBaseMundo() {
    return this.compositorTerreno.dibujarBaseMundo({
      escenaDarkMoon: this.escenaDarkMoon,
      geometria: this.geometria,
    });
  }

  dibujarFondoMundo(configuracionIluminacion) {
    return this.compositorTerreno.dibujarFondoMundo(
      configuracionIluminacion,
      this.geometria,
    );
  }

  dibujarMarcoMapa() {
    return this.compositorTerreno.dibujarMarcoMapa(this.geometria);
  }

  dibujarDetallesMuro(parametros) {
    return this.compositorTerreno.dibujarDetallesMuro(parametros);
  }

  dibujarBordeMuroRespaldo(parametros) {
    return this.compositorTerreno.dibujarBordeMuroRespaldo(parametros);
  }

  dibujarEsquinaInteriorRespaldo(parametros) {
    return this.compositorTerreno.dibujarEsquinaInteriorRespaldo(parametros);
  }

  dibujarSombraContactoSuelo(parametros) {
    return this.compositorTerreno.dibujarSombraContactoSuelo(parametros);
  }

  dibujarSombraContactoRespaldo(parametros) {
    return this.compositorTerreno.dibujarSombraContactoRespaldo(parametros);
  }

  crearImagenOverlayCasilla(parametros) {
    return this.compositorTerreno.crearImagenOverlayCasilla(parametros);
  }

  dibujarDecoracionCasilla(parametros) {
    return this.compositorTerreno.dibujarDecoracionCasilla(parametros);
  }

  dibujarVisibilidad() {
    this.capaVisibilidad.removeAll(true);

    if (!this.escenaDarkMoon || !this.geometria) {
      return;
    }

    const visibilidad = this.escenaDarkMoon.mapa?.visibilidad ?? {};
    const campoVisible = visibilidad.campoVisible === true;
    const descubrimiento = visibilidad.descubrimiento === true;

    if (!campoVisible && !descubrimiento) {
      return;
    }

    const visibles = new Set(
      (visibilidad.casillasVisibles ?? []).map(({ x, y }) => `${x},${y}`),
    );
    const descubiertas = new Set(
      (visibilidad.casillasDescubiertas ?? []).map(({ x, y }) => `${x},${y}`),
    );
    const graficos = this.escena.add.graphics();

    for (let y = 0; y < this.geometria.filas; y++) {
      for (let x = 0; x < this.geometria.columnas; x++) {
        const clave = `${x},${y}`;
        if (visibles.has(clave)) continue;

        const fueDescubierta = descubiertas.has(clave);
        const opacidad =
          descubrimiento && fueDescubierta
            ? OPACIDAD_DESCUBIERTO_NO_VISIBLE
            : OPACIDAD_NO_DESCUBIERTO;
        const pixelX =
          this.geometria.origenX + x * TAMANO_CASILLA_REFERENCIA;
        const pixelY =
          this.geometria.origenY + y * TAMANO_CASILLA_REFERENCIA;

        graficos.fillStyle(COLOR_NIEBLA, opacidad);
        graficos.fillRect(
          pixelX,
          pixelY,
          TAMANO_CASILLA_REFERENCIA,
          TAMANO_CASILLA_REFERENCIA,
        );
      }
    }

    this.capaVisibilidad.add(graficos);
  }

  dibujarZonas() {
    this.reconciliarZonasTemporales(
      this.escenaDarkMoon?.zonasTemporales ?? [],
    );
  }

  dibujarSombrasEntidades() {
    return this.compositorEntidades.dibujarSombrasEntidades(
      this.escenaDarkMoon,
    );
  }

  dibujarSeleccion() {
    this.compositorSeleccion.casillaPuntero = this.casillaPuntero;
    const resultado = this.compositorSeleccion.dibujar({
      escenaDarkMoon: this.escenaDarkMoon,
      geometria: this.geometria,
    });
    this.casillaPuntero = this.compositorSeleccion.casillaPuntero;
    return resultado;
  }

  dibujarEntidades() {
    return this.compositorEntidades.dibujarEntidades(this.escenaDarkMoon);
  }

  establecerEntidadVisualTemporal(entidad) {
    return this.compositorEntidades.establecerEntidadVisualTemporal(entidad);
  }

  actualizarBarraVidaEntidad(
    idVisual,
    { vidaActual, vidaMaxima, mostrarAunqueCero = true } = {},
  ) {
    return this.compositorEntidades.actualizarBarraVidaEntidad(idVisual, {
      vidaActual,
      vidaMaxima,
      mostrarAunqueCero,
    });
  }

  crearNodoEntidadVisual(entidad) {
    return this.compositorEntidades.crearNodoEntidadVisual(entidad);
  }

  agregarEstadosTemporales(contenedor, efectos = []) {
    return this.compositorEntidades.agregarEstadosTemporales(
      contenedor,
      efectos,
    );
  }

  obtenerMetricasVisualesEntidad(entidad) {
    return this.compositorEntidades.obtenerMetricasVisualesEntidad(entidad);
  }

  agregarRespaldoEntidad(parametros) {
    return this.compositorEntidades.agregarRespaldoEntidad(parametros);
  }

  agregarAgresividad(contenedor) {
    return this.compositorEntidades.agregarAgresividad(contenedor);
  }

  agregarIndicadorVariante(contenedor, idVariante) {
    return this.compositorEntidades.agregarIndicadorVariante(
      contenedor,
      idVariante,
    );
  }

  agregarBarraVida(contenedor, entidad) {
    return this.compositorEntidades.agregarBarraVida(contenedor, entidad);
  }

  actualizarGraficosBarraVida(barra, parametros = {}) {
    return this.compositorEntidades.actualizarGraficosBarraVida(
      barra,
      parametros,
    );
  }

  dibujarRellenoCasilla(graficos, casilla, estilo) {
    return this.compositorSeleccion.dibujarRellenoCasilla(
      graficos,
      casilla,
      estilo,
    );
  }

  dibujarSelectorEsquinas(graficos, selector, estiloHabilidad = null) {
    return this.compositorSeleccion.dibujarSelectorEsquinas(
      graficos,
      selector,
      estiloHabilidad,
    );
  }

  dibujarRecorrido(graficos, recorrido, estiloHabilidad = null) {
    return this.compositorSeleccion.dibujarRecorrido(
      graficos,
      recorrido,
      estiloHabilidad,
    );
  }

  dibujarObjetivosHabilidad(objetivos, estiloHabilidad = null) {
    return this.compositorSeleccion.dibujarObjetivosHabilidad(
      objetivos,
      estiloHabilidad,
    );
  }

  dibujarIluminacion() {
    this.capaIluminacion.removeAll(true);

    if (!this.escenaDarkMoon || !this.geometria) {
      return;
    }

    const configuracion = normalizarConfiguracionIluminacion(
      this.escenaDarkMoon.mapa.apariencia?.phaser?.iluminacion,
    );
    const graficos = this.escena.add.graphics();

    graficos.fillStyle(
      configuracion.colorSombraAmbiente,
      configuracion.intensidad,
    );
    graficos.fillRect(
      this.geometria.origenX,
      this.geometria.origenY,
      this.geometria.anchoMapa,
      this.geometria.altoMapa,
    );

    this.capaIluminacion.add(graficos);
  }

  obtenerPosicionCasilla(casilla) {
    return this.conversorCoordenadas.casillaAMundo(casilla);
  }

  destruir() {
    for (const idZona of [...this.zonasTemporalesVisuales.keys()]) {
      this.retirarZonaTemporal(idZona);
    }

    this.compositorTerreno?.destruir();
    this.compositorEntidades?.destruir();
    this.compositorSeleccion?.destruir();

    this.capaFondo.destroy(true);
    this.capaTerreno.destroy(true);
    this.capaDecoracion.destroy(true);
    this.capaVisibilidad.destroy(true);
    this.capaZonas.destroy(true);
    this.capaSombras.destroy(true);
    this.capaSeleccion.destroy(true);
    this.capaEntidades.destroy(true);
    this.capaIluminacion.destroy(true);
    this.capaEfectos.destroy(true);
    this.nodosEntidades.clear();
    this.zonasTemporalesVisuales.clear();
    this.creadorEstadosTemporales = null;
    this.creadorZonasTemporales = null;
    this.compositorTerreno = null;
    this.compositorEntidades = null;
    this.compositorSeleccion = null;
    this.escenaDarkMoon = null;
    this.escena = null;
    this.gestorRecursos = null;
    this.conversorCoordenadas = null;
  }
}

function crearGeometria({ columnas, filas }) {
  const anchoMapa = columnas * TAMANO_CASILLA_REFERENCIA;
  const altoMapa = filas * TAMANO_CASILLA_REFERENCIA;
  const anchoMundo = Math.max(anchoMapa, ANCHO_REFERENCIA_PHASER);
  const altoMundo = Math.max(altoMapa, ALTO_REFERENCIA_PHASER);

  return Object.freeze({
    columnas,
    filas,
    anchoMapa,
    altoMapa,
    anchoMundo,
    altoMundo,
    origenX: Math.floor((anchoMundo - anchoMapa) / 2),
    origenY: Math.floor((altoMundo - altoMapa) / 2),
  });
}

function crearFirmaTerreno(escena) {
  return JSON.stringify({
    mapa: escena.mapa.casillas,
    apariencia: escena.mapa.apariencia,
  });
}

function crearIdentificadorTerreno(firma) {
  let hash = 2166136261;

  for (let indice = 0; indice < firma.length; indice++) {
    hash ^= firma.charCodeAt(indice);
    hash = Math.imul(hash, 16777619);
  }

  return `${firma.length}:${(hash >>> 0).toString(16)}`;
}

function validarEscena(escena) {
  const mapa = escena?.mapa?.casillas;

  if (!Array.isArray(mapa) || mapa.length === 0 || !Array.isArray(mapa[0])) {
    throw new Error("El compositor Phaser necesita un mapa neutral válido.");
  }

  const columnas = mapa[0].length;

  if (columnas === 0 || mapa.some((fila) => fila.length !== columnas)) {
    throw new Error("El mapa neutral debe ser rectangular y no estar vacío.");
  }

  if (!Array.isArray(escena.entidades)) {
    throw new Error("El compositor Phaser necesita entidades visuales.");
  }
}
