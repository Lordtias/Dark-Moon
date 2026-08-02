import {
  ESTADOS_HOSTILIDAD_VISUAL,
  TIPOS_ENTIDAD_VISUAL,
} from "../TiposEscena.js";
import {
  ALTO_REFERENCIA_PHASER,
  ANCHO_REFERENCIA_PHASER,
  PROFUNDIDAD_ILUMINACION_PHASER,
  PROFUNDIDAD_SELECCION_PHASER,
  TAMANO_CASILLA_VISUAL_PHASER,
} from "./ConfiguracionPhaser.js";
import { CompositorArquitecturaPhaser } from "./CompositorArquitecturaPhaser.js";
import { obtenerRutasPuertasArquitectonicasPhaser } from "./CompositorPuertasPhaser.js";
import {
  NIVELES_PROFUNDIDAD_MUNDO_PHASER,
  calcularProfundidadOrdenablePhaser,
  obtenerLineaApoyoCasillaPhaser,
} from "./OrdenadorProfundidadPhaser.js";

const COLOR_FONDO_MUNDO = 0x0b120f;
const COLOR_SELECTOR_VALIDO = 0xffe66d;
const COLOR_SELECTOR_INVALIDO = 0xff705c;
const ESTILOS_ENTIDAD = Object.freeze({
  [TIPOS_ENTIDAD_VISUAL.JUGADOR]: {
    fondo: 0x342e0f,
    borde: 0xd6bd45,
    texto: "#ffe66d",
    tamano: 94,
    sombraAncho: 50,
    sombraAlto: 17,
  },
  [TIPOS_ENTIDAD_VISUAL.ENEMIGO]: {
    fondo: 0x371015,
    borde: 0xbd4b55,
    texto: "#ffb0b0",
    tamano: 90,
    sombraAncho: 48,
    sombraAlto: 16,
  },
  [TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE]: {
    fondo: 0x342211,
    borde: 0xa97942,
    texto: "#e2b276",
    tamano: 84,
    sombraAncho: 48,
    sombraAlto: 16,
  },
  [TIPOS_ENTIDAD_VISUAL.INTERACTUABLE]: {
    fondo: 0x12303d,
    borde: 0x68b7d3,
    texto: "#c8f1ff",
    tamano: 84,
    sombraAncho: 46,
    sombraAlto: 16,
  },
});

// Compone el mundo Phaser a partir de la escena neutral. La clase solo dibuja:
// no ejecuta comandos ni consulta objetos del dominio.
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

    this.capaFondo = escena.add.container(0, 0).setDepth(0);
    this.capaTerreno = escena.add.container(0, 0).setDepth(10);
    this.capaDecoracion = escena.add.container(0, 0).setDepth(20);
    this.capaZonas = escena.add.container(0, 0).setDepth(30);
    this.capaSeleccion = escena.add
      .container(0, 0)
      .setDepth(PROFUNDIDAD_SELECCION_PHASER);
    this.capaIndicadores = escena.add
      .container(0, 0)
      .setDepth(PROFUNDIDAD_SELECCION_PHASER + 10);
    this.capaIluminacion = escena.add
      .container(0, 0)
      .setDepth(PROFUNDIDAD_ILUMINACION_PHASER);
    this.objetosEntidadesProfundidad = [];

    this.compositorArquitectura = new CompositorArquitecturaPhaser({
      escena,
      gestorRecursos,
      capaTerreno: this.capaTerreno,
      capaDecoracion: this.capaDecoracion,
    });
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

    if (firmaNueva !== this.firmaTerreno) {
      this.firmaTerreno = firmaNueva;
      this.dibujarBaseMundo();
    }

    this.limpiarObjetosEntidadesProfundidad();
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

  invalidarTerreno() {
    this.firmaTerreno = null;
  }

  establecerCasillaPuntero(casilla) {
    const normalizada = normalizarCasilla(casilla, this.geometria);

    if (
      normalizada?.x === this.casillaPuntero?.x &&
      normalizada?.y === this.casillaPuntero?.y
    ) {
      return;
    }

    this.casillaPuntero = normalizada;
    this.dibujarSeleccion();
  }

  precargarRecursos(escenaDarkMoon) {
    const aparienciaPhaser = escenaDarkMoon.mapa.apariencia?.phaser ?? {};
    const rutas = [
      ...(aparienciaPhaser.suelo?.recursos ?? []),
      aparienciaPhaser.pared?.recurso,
      ...obtenerRutasPuertasArquitectonicasPhaser(),
      ...(escenaDarkMoon.entidades ?? [])
        .filter((entidad) => entidad.arquitectura?.tipo !== "puerta")
        .map((entidad) => entidad.recursoVisual),
    ].filter(Boolean);

    this.gestorRecursos.precargar(rutas);
  }

  dibujarBaseMundo() {
    this.capaFondo.removeAll(true);
    this.capaTerreno.removeAll(true);
    this.capaDecoracion.removeAll(true);

    const aparienciaPhaser =
      this.escenaDarkMoon.mapa.apariencia?.phaser ?? {};

    this.dibujarFondoMundo(aparienciaPhaser.iluminacion);
    this.compositorArquitectura.dibujar({
      escenaDarkMoon: this.escenaDarkMoon,
      geometria: this.geometria,
    });
    this.dibujarMarcoMapa();
  }

  dibujarFondoMundo(configuracionIluminacion) {
    const iluminacion = normalizarConfiguracionIluminacion(
      configuracionIluminacion,
    );
    const fondo = this.escena.add.graphics();
    fondo.fillStyle(COLOR_FONDO_MUNDO, 1);
    fondo.fillRect(
      0,
      0,
      this.geometria.anchoMundo,
      this.geometria.altoMundo,
    );

    fondo.fillStyle(iluminacion.colorAmbiente, iluminacion.intensidad * 0.55);
    fondo.fillRect(
      this.geometria.origenX,
      this.geometria.origenY,
      this.geometria.anchoMapa,
      this.geometria.altoMapa,
    );

    this.capaFondo.add(fondo);
  }

  dibujarMarcoMapa() {
    const marco = this.escena.add.graphics();
    const { origenX, origenY, anchoMapa, altoMapa } = this.geometria;

    marco.lineStyle(10, 0x050807, 0.78);
    marco.strokeRect(
      origenX - 5,
      origenY - 5,
      anchoMapa + 10,
      altoMapa + 10,
    );
    marco.lineStyle(2, 0x728078, 0.42);
    marco.strokeRect(
      origenX - 0.5,
      origenY - 0.5,
      anchoMapa + 1,
      altoMapa + 1,
    );

    this.capaDecoracion.add(marco);
  }

  dibujarZonas() {
    this.capaZonas.removeAll(true);
    const graficos = this.escena.add.graphics();

    for (const zona of this.escenaDarkMoon?.zonasTemporales ?? []) {
      const estilo = obtenerEstiloZona(zona.apariencia);

      for (const casilla of zona.casillas ?? []) {
        const posicion = this.obtenerPosicionCasilla(casilla);
        if (!posicion) continue;

        graficos.fillStyle(estilo.relleno, 0.22);
        graficos.fillRect(
          posicion.x + 3,
          posicion.y + 3,
          TAMANO_CASILLA_VISUAL_PHASER - 6,
          TAMANO_CASILLA_VISUAL_PHASER - 6,
        );
        graficos.lineStyle(1, estilo.borde, 0.65);
        graficos.strokeRect(
          posicion.x + 3.5,
          posicion.y + 3.5,
          TAMANO_CASILLA_VISUAL_PHASER - 7,
          TAMANO_CASILLA_VISUAL_PHASER - 7,
        );
      }
    }

    this.capaZonas.add(graficos);
  }

  dibujarSombrasEntidades() {
    const aparienciaPhaser =
      this.escenaDarkMoon?.mapa?.apariencia?.phaser ?? {};
    const configuracionSombras = normalizarConfiguracionSombras(
      aparienciaPhaser.sombras,
    );

    for (const entidad of this.escenaDarkMoon?.entidades ?? []) {
      if (entidad.arquitectura?.tipo === "puerta") continue;

      const posicion = this.obtenerPosicionCasilla(entidad);
      if (!posicion) continue;

      const estilo =
        ESTILOS_ENTIDAD[entidad.tipo] ??
        ESTILOS_ENTIDAD[TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE];
      const centroX = posicion.x + TAMANO_CASILLA_VISUAL_PHASER / 2;
      const baseY = obtenerBaseEntidad(posicion);
      const metricas = this.obtenerMetricasVisualesEntidad(entidad, estilo);
      const opacidad =
        entidad.estaViva === false
          ? configuracionSombras.opacidadEntidades * 0.45
          : configuracionSombras.opacidadEntidades;
      const graficos = this.escena.add.graphics();

      graficos.fillStyle(configuracionSombras.color, opacidad);
      graficos.fillEllipse(
        centroX,
        baseY,
        metricas.sombraAncho,
        metricas.sombraAlto,
      );

      if (entidad.tipo === TIPOS_ENTIDAD_VISUAL.JUGADOR) {
        graficos.lineStyle(2, 0xf1d579, 0.62);
        graficos.strokeEllipse(
          centroX,
          baseY,
          metricas.sombraAncho + 4,
          metricas.sombraAlto + 3,
        );
      } else if (
        entidad.tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO &&
        entidad.estadoHostilidad === ESTADOS_HOSTILIDAD_VISUAL.AGRESIVO
      ) {
        graficos.lineStyle(1, 0xf06b64, 0.48);
        graficos.strokeEllipse(
          centroX,
          baseY,
          metricas.sombraAncho + 2,
          metricas.sombraAlto + 2,
        );
      }

      this.registrarObjetoEntidadProfundidad(
        graficos,
        calcularProfundidadOrdenablePhaser({
          baseY,
          baseX: centroX,
          nivel: NIVELES_PROFUNDIDAD_MUNDO_PHASER.SOMBRA,
        }),
      );
    }
  }

  dibujarSeleccion() {
    this.capaSeleccion.removeAll(true);

    if (!this.escenaDarkMoon || !this.geometria) {
      return;
    }

    const combate = this.escenaDarkMoon.combate ?? {};
    const graficos = this.escena.add.graphics();
    const esHabilidad = combate.modo === "habilidad";

    for (const casilla of combate.casillasAtacables ?? []) {
      this.dibujarRellenoCasilla(graficos, casilla, {
        relleno: esHabilidad ? 0x5578eb : 0xdc3737,
        borde: esHabilidad ? 0x7da5ff : 0xff6e6e,
        alphaRelleno: 0.1,
        alphaBorde: 0.28,
        margen: 1,
      });
    }

    for (const casilla of combate.casillasAfectadas ?? []) {
      this.dibujarRellenoCasilla(graficos, casilla, {
        relleno: 0xaa50e6,
        borde: 0xe19bff,
        alphaRelleno: 0.18,
        alphaBorde: 0.48,
        margen: 2,
      });
    }

    this.dibujarRecorrido(graficos, combate.recorrido);

    if (this.casillaPuntero) {
      this.dibujarRellenoCasilla(graficos, this.casillaPuntero, {
        relleno: 0xdce8ff,
        borde: 0xeaf2ff,
        alphaRelleno: 0.07,
        alphaBorde: 0.42,
        margen: 2,
      });
    }

    if (combate.selector) {
      this.dibujarSelectorEsquinas(graficos, combate.selector);
    }

    this.capaSeleccion.add(graficos);
    this.dibujarObjetivosHabilidad(combate.objetivosAfectados);
  }

  dibujarEntidades() {
    this.capaIndicadores.removeAll(true);

    const entidades = [...(this.escenaDarkMoon?.entidades ?? [])].sort(
      compararEntidades,
    );

    for (const entidad of entidades) {
      if (entidad.arquitectura?.tipo === "puerta") continue;

      const posicion = this.obtenerPosicionCasilla(entidad);
      if (!posicion) continue;

      const estilo =
        ESTILOS_ENTIDAD[entidad.tipo] ??
        ESTILOS_ENTIDAD[TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE];
      const centroX = posicion.x + TAMANO_CASILLA_VISUAL_PHASER / 2;
      const baseY = obtenerBaseEntidad(posicion);
      const metricas = this.obtenerMetricasVisualesEntidad(entidad, estilo);
      const informacionRecurso = metricas.informacionRecurso;
      const profundidad = calcularProfundidadOrdenablePhaser({
        baseY,
        baseX: centroX,
        nivel: NIVELES_PROFUNDIDAD_MUNDO_PHASER.ENTIDAD,
      });

      if (informacionRecurso) {
        const imagen = this.escena.add.image(
          centroX,
          baseY,
          informacionRecurso.claveTextura,
        );
        imagen.setOrigin?.(
          informacionRecurso.anclaje.x,
          informacionRecurso.anclaje.y,
        );
        imagen.setDisplaySize?.(
          metricas.anchoVisual,
          metricas.altoVisual,
        );
        imagen.setAlpha?.(entidad.estaViva === false ? 0.42 : 1);
        this.registrarObjetoEntidadProfundidad(imagen, profundidad);
      } else {
        this.dibujarRespaldoEntidad({
          entidad,
          estilo,
          centroX,
          baseY,
          profundidad,
        });
      }

      if (
        entidad.tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO &&
        entidad.estadoHostilidad === ESTADOS_HOSTILIDAD_VISUAL.AGRESIVO
      ) {
        this.dibujarAgresividad(posicion);
      }

      if (entidad.mostrarBarraVida) {
        this.dibujarBarraVida(entidad, posicion);
      }
    }
  }


  obtenerMetricasVisualesEntidad(entidad, estilo) {
    const informacionRecurso = this.gestorRecursos.obtenerInformacion(
      entidad.recursoVisual,
    );

    if (!informacionRecurso) {
      return Object.freeze({
        informacionRecurso: null,
        anchoVisual: estilo.tamano,
        altoVisual: estilo.tamano,
        sombraAncho: estilo.sombraAncho,
        sombraAlto: estilo.sombraAlto,
      });
    }

    const escala =
      estilo.tamano / Math.max(1, informacionRecurso.limitesVisibles.alto);
    const anchoVisual = Math.max(1, informacionRecurso.ancho * escala);
    const altoVisual = Math.max(1, informacionRecurso.alto * escala);
    const anchoVisible =
      informacionRecurso.limitesVisibles.ancho * escala;
    const sombraAncho = limitarNumero(
      Math.round(anchoVisible * 0.78),
      Math.max(8, Math.round(estilo.sombraAncho * 0.5)),
      estilo.sombraAncho,
      estilo.sombraAncho,
    );
    const sombraAlto = limitarNumero(
      Math.round(sombraAncho * 0.34),
      4,
      estilo.sombraAlto,
      estilo.sombraAlto,
    );

    return Object.freeze({
      informacionRecurso,
      anchoVisual,
      altoVisual,
      sombraAncho,
      sombraAlto,
    });
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

    graficos.fillStyle(configuracion.colorSombraAmbiente, configuracion.intensidad);
    graficos.fillRect(
      this.geometria.origenX,
      this.geometria.origenY,
      this.geometria.anchoMapa,
      this.geometria.altoMapa,
    );

    for (const entidad of this.escenaDarkMoon.entidades ?? []) {
      if (entidad.tipo !== TIPOS_ENTIDAD_VISUAL.JUGADOR) {
        continue;
      }

      const posicion = this.obtenerPosicionCasilla(entidad);
      if (!posicion) continue;

      const centroX = posicion.x + TAMANO_CASILLA_VISUAL_PHASER / 2;
      const centroY = posicion.y + TAMANO_CASILLA_VISUAL_PHASER / 2;
      const radio = 30;
      const opacidad = 0.025;

      graficos.fillStyle(configuracion.colorJugador, opacidad);
      graficos.fillCircle(centroX, centroY, radio);
      graficos.fillStyle(configuracion.colorJugador, opacidad * 1.8);
      graficos.fillCircle(centroX, centroY, Math.round(radio * 0.55));
    }

    this.capaIluminacion.add(graficos);
  }

  dibujarRespaldoEntidad({
    entidad,
    estilo,
    centroX,
    baseY,
    profundidad,
  }) {
    const tamano = 30;
    const graficos = this.escena.add.graphics();
    graficos.fillStyle(estilo.fondo, 0.94);
    graficos.fillRect(centroX - tamano / 2, baseY - tamano, tamano, tamano);
    graficos.lineStyle(2, estilo.borde, 1);
    graficos.strokeRect(
      centroX - tamano / 2 + 0.5,
      baseY - tamano + 0.5,
      tamano - 1,
      tamano - 1,
    );

    const texto = this.escena.add
      .text(centroX, baseY - tamano / 2, entidad.simbolo ?? "?", {
        color: estilo.texto,
        fontFamily: "monospace",
        fontSize: "16px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.registrarObjetoEntidadProfundidad(graficos, profundidad);
    this.registrarObjetoEntidadProfundidad(texto, profundidad + 0.001);
  }

  dibujarAgresividad(posicion) {
    const centroX = posicion.x + TAMANO_CASILLA_VISUAL_PHASER - 6;
    const centroY = posicion.y + 9;
    const graficos = this.escena.add.graphics();
    graficos.fillStyle(0x37080d, 0.95);
    graficos.fillCircle(centroX, centroY, 6);
    graficos.lineStyle(2, 0xff3f4d, 1);
    graficos.strokeCircle(centroX, centroY, 6);
    this.capaIndicadores.add(graficos);

    const texto = this.escena.add
      .text(centroX, centroY, "!", {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "10px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.capaIndicadores.add(texto);
  }

  dibujarBarraVida(entidad, posicion) {
    const porcentaje = Math.max(
      0,
      Math.min(1, entidad.vidaActual / entidad.vidaMaxima),
    );
    const ancho = TAMANO_CASILLA_VISUAL_PHASER - 6;
    const color =
      porcentaje <= 0.25
        ? 0xe55555
        : porcentaje <= 0.5
          ? 0xe4c44e
          : 0x55cf72;
    const graficos = this.escena.add.graphics();
    graficos.fillStyle(0x0a0a0c, 0.9);
    graficos.fillRect(posicion.x + 3, posicion.y + 2, ancho, 4);
    graficos.fillStyle(color, 1);
    graficos.fillRect(
      posicion.x + 4,
      posicion.y + 3,
      Math.max(0, (ancho - 2) * porcentaje),
      2,
    );
    this.capaIndicadores.add(graficos);
  }

  dibujarRellenoCasilla(graficos, casilla, estilo) {
    const posicion = this.obtenerPosicionCasilla(casilla);
    if (!posicion) return;

    const margen = estilo.margen ?? 1;
    graficos.fillStyle(estilo.relleno, estilo.alphaRelleno);
    graficos.fillRect(
      posicion.x + margen,
      posicion.y + margen,
      TAMANO_CASILLA_VISUAL_PHASER - margen * 2,
      TAMANO_CASILLA_VISUAL_PHASER - margen * 2,
    );
    graficos.lineStyle(1, estilo.borde, estilo.alphaBorde);
    graficos.strokeRect(
      posicion.x + margen + 0.5,
      posicion.y + margen + 0.5,
      TAMANO_CASILLA_VISUAL_PHASER - margen * 2 - 1,
      TAMANO_CASILLA_VISUAL_PHASER - margen * 2 - 1,
    );
  }

  dibujarSelectorEsquinas(graficos, selector) {
    const posicion = this.obtenerPosicionCasilla(selector);
    if (!posicion) return;

    const color = selector.esValido
      ? COLOR_SELECTOR_VALIDO
      : COLOR_SELECTOR_INVALIDO;
    const margen = 3;
    const longitud = 8;
    const x0 = posicion.x + margen;
    const y0 = posicion.y + margen;
    const x1 = posicion.x + TAMANO_CASILLA_VISUAL_PHASER - margen;
    const y1 = posicion.y + TAMANO_CASILLA_VISUAL_PHASER - margen;

    graficos.fillStyle(color, 0.1);
    graficos.fillRect(
      posicion.x + 1,
      posicion.y + 1,
      TAMANO_CASILLA_VISUAL_PHASER - 2,
      TAMANO_CASILLA_VISUAL_PHASER - 2,
    );
    graficos.lineStyle(3, color, 1);
    graficos.lineBetween(x0, y0, x0 + longitud, y0);
    graficos.lineBetween(x0, y0, x0, y0 + longitud);
    graficos.lineBetween(x1, y0, x1 - longitud, y0);
    graficos.lineBetween(x1, y0, x1, y0 + longitud);
    graficos.lineBetween(x0, y1, x0 + longitud, y1);
    graficos.lineBetween(x0, y1, x0, y1 - longitud);
    graficos.lineBetween(x1, y1, x1 - longitud, y1);
    graficos.lineBetween(x1, y1, x1, y1 - longitud);
  }

  dibujarRecorrido(graficos, recorrido) {
    if (!Array.isArray(recorrido) || recorrido.length < 2) return;

    const pasos = [...recorrido].sort((a, b) => a.orden - b.orden);
    graficos.lineStyle(3, 0xb9dcff, 0.88);
    graficos.beginPath();

    pasos.forEach((paso, indice) => {
      const posicion = this.obtenerPosicionCasilla(paso);
      if (!posicion) return;
      const x = posicion.x + TAMANO_CASILLA_VISUAL_PHASER / 2;
      const y = posicion.y + TAMANO_CASILLA_VISUAL_PHASER / 2;
      if (indice === 0) graficos.moveTo(x, y);
      else graficos.lineTo(x, y);
    });

    graficos.strokePath();
  }

  dibujarObjetivosHabilidad(objetivos) {
    for (const objetivo of objetivos ?? []) {
      const posicion = this.obtenerPosicionCasilla(objetivo);
      if (!posicion) continue;

      const graficos = this.escena.add.graphics();
      graficos.lineStyle(2, 0xf5e1ff, 0.95);
      graficos.strokeRect(
        posicion.x + 5.5,
        posicion.y + 5.5,
        TAMANO_CASILLA_VISUAL_PHASER - 11,
        TAMANO_CASILLA_VISUAL_PHASER - 11,
      );
      this.capaSeleccion.add(graficos);

      const texto = this.escena.add
        .text(
          posicion.x + TAMANO_CASILLA_VISUAL_PHASER - 7,
          posicion.y + 7,
          String((objetivo.orden ?? 0) + 1),
          {
            color: "#ffffff",
            backgroundColor: "#50236e",
            fontFamily: "monospace",
            fontSize: "9px",
            fontStyle: "bold",
            padding: { x: 2, y: 1 },
          },
        )
        .setOrigin(0.5);
      this.capaSeleccion.add(texto);
    }
  }

  obtenerPosicionCasilla(casilla) {
    return this.conversorCoordenadas.casillaAMundo(casilla);
  }

  registrarObjetoEntidadProfundidad(objeto, profundidad) {
    objeto.setDepth?.(profundidad);
    this.objetosEntidadesProfundidad.push(objeto);
    return objeto;
  }

  limpiarObjetosEntidadesProfundidad() {
    for (const objeto of this.objetosEntidadesProfundidad) {
      objeto?.destroy?.();
    }
    this.objetosEntidadesProfundidad.length = 0;
  }

  destruir() {
    this.limpiarObjetosEntidadesProfundidad();
    this.compositorArquitectura?.destruir?.();
    this.capaFondo.destroy(true);
    this.capaTerreno.destroy(true);
    this.capaDecoracion.destroy(true);
    this.capaZonas.destroy(true);
    this.capaSeleccion.destroy(true);
    this.capaIndicadores.destroy(true);
    this.capaIluminacion.destroy(true);
    this.compositorArquitectura = null;
    this.escenaDarkMoon = null;
    this.escena = null;
    this.gestorRecursos = null;
    this.conversorCoordenadas = null;
  }
}

function obtenerBaseEntidad(posicion) {
  return obtenerLineaApoyoCasillaPhaser({
    posicion,
    tamanoCasilla: TAMANO_CASILLA_VISUAL_PHASER,
    desplazamiento: -3,
  });
}

function crearGeometria({ columnas, filas }) {
  const anchoMapa = columnas * TAMANO_CASILLA_VISUAL_PHASER;
  const altoMapa = filas * TAMANO_CASILLA_VISUAL_PHASER;
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
    arquitectura: (escena.entidades ?? [])
      .map((entidad) => entidad.arquitectura)
      .filter(Boolean),
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

function normalizarCasilla(casilla, geometria) {
  if (
    !geometria ||
    !Number.isInteger(casilla?.x) ||
    !Number.isInteger(casilla?.y) ||
    casilla.x < 0 ||
    casilla.y < 0 ||
    casilla.x >= geometria.columnas ||
    casilla.y >= geometria.filas
  ) {
    return null;
  }

  return { x: casilla.x, y: casilla.y };
}

function convertirColor(valor, respaldo) {
  if (typeof valor !== "string" || !/^#[0-9a-f]{6}$/i.test(valor)) {
    return respaldo;
  }

  return Number.parseInt(valor.slice(1), 16);
}

function compararEntidades(a, b) {
  const baseA = Number.isFinite(a.y) ? a.y : -1;
  const baseB = Number.isFinite(b.y) ? b.y : -1;
  if (baseA !== baseB) return baseA - baseB;

  const xA = Number.isFinite(a.x) ? a.x : -1;
  const xB = Number.isFinite(b.x) ? b.x : -1;
  if (xA !== xB) return xA - xB;

  return String(a.id ?? a.nombre ?? "").localeCompare(
    String(b.id ?? b.nombre ?? ""),
  );
}

function obtenerEstiloZona(apariencia) {
  switch (apariencia) {
    case "fuego":
      return { relleno: 0xf06b35, borde: 0xffbd72 };
    case "frio":
      return { relleno: 0x58a7e8, borde: 0xc2ecff };
    case "rayo":
      return { relleno: 0x8b67e8, borde: 0xe0d2ff };
    case "veneno":
      return { relleno: 0x56a75a, borde: 0xb7ef89 };
    default:
      return { relleno: 0x8f78b8, borde: 0xd8c9ef };
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

function normalizarConfiguracionIluminacion(configuracion = {}) {
  return Object.freeze({
    colorAmbiente: convertirColor(configuracion.colorAmbiente, 0x27483f),
    colorSombraAmbiente: convertirColor(
      configuracion.colorSombraAmbiente,
      0x071411,
    ),
    colorJugador: convertirColor(configuracion.colorJugador, 0xe6c56a),
    intensidad: limitarNumero(configuracion.intensidad, 0, 0.3, 0.1),
  });
}

function limitarNumero(valor, minimo, maximo, respaldo) {
  if (!Number.isFinite(valor)) {
    return respaldo;
  }

  return Math.max(minimo, Math.min(maximo, valor));
}
