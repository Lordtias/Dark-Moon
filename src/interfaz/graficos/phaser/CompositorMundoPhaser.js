import {
  ESTADOS_HOSTILIDAD_VISUAL,
  TIPOS_ENTIDAD_VISUAL,
} from "../TiposEscena.js";
import {
  ALTO_REFERENCIA_PHASER,
  ANCHO_REFERENCIA_PHASER,
  TAMANO_CASILLA_REFERENCIA,
} from "./ConfiguracionPhaser.js";
import { ResolutorTerrenosPhaser } from "./ResolutorTerrenosPhaser.js";

const COLOR_FONDO_MUNDO = 0x0b120f;
const COLOR_SELECTOR_VALIDO = 0xffe66d;
const COLOR_SELECTOR_INVALIDO = 0xff705c;
const OPACIDAD_REJILLA_RESPALDO = 0.2;

const ESTILOS_ENTIDAD = Object.freeze({
  [TIPOS_ENTIDAD_VISUAL.JUGADOR]: {
    fondo: 0x342e0f,
    borde: 0xd6bd45,
    texto: "#ffe66d",
    tamano: 44,
    sombraAncho: 26,
    sombraAlto: 10,
  },
  [TIPOS_ENTIDAD_VISUAL.ENEMIGO]: {
    fondo: 0x371015,
    borde: 0xbd4b55,
    texto: "#ffb0b0",
    tamano: 42,
    sombraAncho: 24,
    sombraAlto: 9,
  },
  [TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE]: {
    fondo: 0x342211,
    borde: 0xa97942,
    texto: "#e2b276",
    tamano: 38,
    sombraAncho: 24,
    sombraAlto: 9,
  },
  [TIPOS_ENTIDAD_VISUAL.INTERACTUABLE]: {
    fondo: 0x12303d,
    borde: 0x68b7d3,
    texto: "#c8f1ff",
    tamano: 42,
    sombraAncho: 28,
    sombraAlto: 10,
  },
});

const TIPOS_DECORACION = Object.freeze({
  CHARCO: 0,
  REJILLA: 1,
  ESCOMBROS: 2,
  MANCHA: 3,
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
    this.resolutorTerrenos = null;

    this.capaFondo = escena.add.container(0, 0).setDepth(0);
    this.capaTerreno = escena.add.container(0, 0).setDepth(10);
    this.capaDecoracion = escena.add.container(0, 0).setDepth(20);
    this.capaMurosAltos = escena.add.container(0, 0).setDepth(25);
    this.capaZonas = escena.add.container(0, 0).setDepth(30);
    this.capaSombras = escena.add.container(0, 0).setDepth(40);
    this.capaSeleccion = escena.add.container(0, 0).setDepth(50);
    this.capaEntidades = escena.add.container(0, 0).setDepth(60);
    this.capaIluminacion = escena.add.container(0, 0).setDepth(70);
  }

  actualizar(escenaDarkMoon) {
    validarEscena(escenaDarkMoon);
    this.escenaDarkMoon = escenaDarkMoon;

    const mapa = escenaDarkMoon.mapa.casillas;
    const filas = mapa.length;
    const columnas = mapa[0].length;
    const geometriaNueva = crearGeometria({ columnas, filas });
    const firmaNueva = crearFirmaTerreno(escenaDarkMoon);

    this.resolutorTerrenos = new ResolutorTerrenosPhaser({
      mapa,
      apariencia: escenaDarkMoon.mapa.apariencia,
    });
    this.precargarRecursos(escenaDarkMoon);

    this.geometria = geometriaNueva;
    this.conversorCoordenadas.actualizarGeometria(this.geometria);

    if (firmaNueva !== this.firmaTerreno) {
      this.firmaTerreno = firmaNueva;
      this.dibujarBaseMundo();
    }

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
    const rutas = [
      ...(this.resolutorTerrenos?.obtenerRutasRecursos() ?? []),
      ...(escenaDarkMoon.entidades ?? []).map(
        (entidad) => entidad.recursoVisual,
      ),
    ].filter(Boolean);

    this.gestorRecursos.precargar(rutas);
  }

  dibujarBaseMundo() {
    this.capaFondo.removeAll(true);
    this.capaTerreno.removeAll(true);
    this.capaDecoracion.removeAll(true);
    this.capaMurosAltos.removeAll(true);

    const mapa = this.escenaDarkMoon.mapa.casillas;
    const apariencia = this.escenaDarkMoon.mapa.apariencia ?? {};
    const aparienciaPhaser = apariencia.phaser ?? {};
    const colorGrilla = convertirColor(apariencia.colorGrilla, 0x17231d);
    const configuracionSombras = normalizarConfiguracionSombras(
      aparienciaPhaser.sombras,
    );
    const configuracionGrilla = normalizarConfiguracionGrilla(
      aparienciaPhaser.grilla,
    );
    const resolutorTerrenos = this.resolutorTerrenos;
    const esParedEn = (x, y) => resolutorTerrenos?.esPared(x, y) === true;

    this.dibujarFondoMundo(aparienciaPhaser.iluminacion);

    const respaldos = this.escena.add.graphics();
    const grilla = this.escena.add.graphics();
    const volumenMuros = this.escena.add.graphics();
    const decoracion = this.escena.add.graphics();
    const sombrasMuros = this.escena.add.graphics();
    const sombrasAlturaMuros = this.escena.add.graphics();
    const carasLateralesMuros = this.escena.add.graphics();

    this.capaMurosAltos.add([
      sombrasAlturaMuros,
      carasLateralesMuros,
    ]);

    for (let y = 0; y < this.geometria.filas; y++) {
      for (let x = 0; x < this.geometria.columnas; x++) {
        const terreno = resolutorTerrenos.resolver(x, y);
        const esPared = terreno.esPared;
        const colorTerreno = convertirColor(
          terreno.color,
          esPared ? 0x53695d : 0x26372f,
        );
        const configuracionPared = normalizarConfiguracionPared(
          terreno.pared,
        );
        const pixelX =
          this.geometria.origenX + x * TAMANO_CASILLA_REFERENCIA;
        const pixelY =
          this.geometria.origenY + y * TAMANO_CASILLA_REFERENCIA;
        const varianteMuro = esPared
          ? clasificarMuro(mapa, x, y, esParedEn)
          : null;
        const ruta = esPared
          ? obtenerRutaMuro(configuracionPared, varianteMuro.tipo)
          : elegirRutaDeterminista(terreno.recursos, x, y);
        const claveTextura = esPared
          ? this.gestorRecursos.obtener(ruta) ??
            this.gestorRecursos.obtener(configuracionPared.recurso)
          : this.gestorRecursos.obtener(ruta);

        if (esPared) {
          respaldos.fillStyle(mezclarColor(colorTerreno, 0x000000, 0.26), 1);
          respaldos.fillRect(
            pixelX,
            pixelY,
            TAMANO_CASILLA_REFERENCIA,
            TAMANO_CASILLA_REFERENCIA,
          );
          this.dibujarSuperficieMuro({
            pixelX,
            pixelY,
            colorPared: colorTerreno,
            claveTextura,
            varianteMuro,
          });
        } else if (claveTextura) {
          const imagen = this.escena.add.image(
            pixelX + TAMANO_CASILLA_REFERENCIA / 2,
            pixelY + TAMANO_CASILLA_REFERENCIA / 2,
            claveTextura,
          );
          imagen.setDisplaySize(
            TAMANO_CASILLA_REFERENCIA,
            TAMANO_CASILLA_REFERENCIA,
          );
          imagen.setAlpha(1);
          this.capaTerreno.add(imagen);
        } else {
          respaldos.fillStyle(colorTerreno, 1);
          respaldos.fillRect(
            pixelX,
            pixelY,
            TAMANO_CASILLA_REFERENCIA,
            TAMANO_CASILLA_REFERENCIA,
          );
        }

        const opacidadGrilla = Number.isFinite(terreno.opacidadGrilla)
          ? limitarNumero(terreno.opacidadGrilla, 0, 1, 0)
          : esPared
            ? configuracionGrilla.opacidadPared
            : configuracionGrilla.opacidadSuelo;
        grilla.lineStyle(1, colorGrilla, opacidadGrilla);
        grilla.strokeRect(
          pixelX + 0.5,
          pixelY + 0.5,
          TAMANO_CASILLA_REFERENCIA - 1,
          TAMANO_CASILLA_REFERENCIA - 1,
        );

        if (esPared) {
          this.dibujarVolumenMuro({
            graficos: volumenMuros,
            sombras: sombrasMuros,
            mapa,
            x,
            y,
            pixelX,
            pixelY,
            colorPared: colorTerreno,
            configuracionSombras,
            esParedEn,
          });
          this.dibujarAlturaMuro({
            sombras: sombrasAlturaMuros,
            laterales: carasLateralesMuros,
            x,
            y,
            pixelX,
            pixelY,
            colorPared: colorTerreno,
            configuracionPared,
            configuracionSombras,
            esParedEn,
          });
        } else {
          this.dibujarDecoracionCasilla({
            graficos: decoracion,
            x,
            y,
            pixelX,
            pixelY,
            configuracion: normalizarConfiguracionDecoracion(
              terreno.decoracion,
            ),
          });
        }
      }
    }

    this.capaTerreno.add([respaldos, grilla]);
    this.capaDecoracion.add([sombrasMuros, decoracion, volumenMuros]);
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

    fondo.fillStyle(iluminacion.colorAmbiente, iluminacion.intensidad * 0.72);
    fondo.fillRect(
      this.geometria.origenX,
      this.geometria.origenY,
      this.geometria.anchoMapa,
      this.geometria.altoMapa,
    );

    const grosorVinyeta = 28;
    fondo.fillStyle(iluminacion.colorSombraAmbiente, Math.min(0.44, iluminacion.intensidad + 0.16));
    fondo.fillRect(
      this.geometria.origenX,
      this.geometria.origenY,
      this.geometria.anchoMapa,
      grosorVinyeta,
    );
    fondo.fillRect(
      this.geometria.origenX,
      this.geometria.origenY + this.geometria.altoMapa - grosorVinyeta,
      this.geometria.anchoMapa,
      grosorVinyeta,
    );
    fondo.fillRect(
      this.geometria.origenX,
      this.geometria.origenY,
      grosorVinyeta,
      this.geometria.altoMapa,
    );
    fondo.fillRect(
      this.geometria.origenX + this.geometria.anchoMapa - grosorVinyeta,
      this.geometria.origenY,
      grosorVinyeta,
      this.geometria.altoMapa,
    );

    this.capaFondo.add(fondo);
  }

  dibujarMarcoMapa() {
    const marco = this.escena.add.graphics();
    const { origenX, origenY, anchoMapa, altoMapa } = this.geometria;

    marco.lineStyle(6, 0x050807, 0.66);
    marco.strokeRect(
      origenX - 3,
      origenY - 3,
      anchoMapa + 6,
      altoMapa + 6,
    );
    marco.lineStyle(1, 0x7b8a82, 0.24);
    marco.strokeRect(
      origenX - 0.5,
      origenY - 0.5,
      anchoMapa + 1,
      altoMapa + 1,
    );

    this.capaDecoracion.add(marco);
  }

  dibujarVolumenMuro({
    graficos,
    sombras,
    mapa,
    x,
    y,
    pixelX,
    pixelY,
    colorPared,
    configuracionSombras,
    esParedEn,
  }) {
    const tieneCasillaAbajo = mapa[y + 1]?.[x] !== undefined;
    const tieneCasillaDerecha = mapa[y]?.[x + 1] !== undefined;
    const tieneSueloAbajo = tieneCasillaAbajo && !esParedEn(x, y + 1);
    const tieneSueloDerecha =
      tieneCasillaDerecha && !esParedEn(x + 1, y);
    const colorClaro = mezclarColor(colorPared, 0xffffff, 0.28);
    const colorOscuro = mezclarColor(colorPared, 0x000000, 0.55);

    graficos.lineStyle(1, colorClaro, 0.48);
    graficos.lineBetween(
      pixelX + 3,
      pixelY + 3.5,
      pixelX + TAMANO_CASILLA_REFERENCIA - 3,
      pixelY + 3.5,
    );
    graficos.lineStyle(2, colorOscuro, 0.58);
    graficos.lineBetween(
      pixelX + 2,
      pixelY + TAMANO_CASILLA_REFERENCIA - 2,
      pixelX + TAMANO_CASILLA_REFERENCIA - 2,
      pixelY + TAMANO_CASILLA_REFERENCIA - 2,
    );

    if (tieneSueloAbajo) {
      sombras.fillStyle(
        configuracionSombras.color,
        configuracionSombras.opacidadMuros,
      );
      sombras.fillRect(
        pixelX + 2,
        pixelY + TAMANO_CASILLA_REFERENCIA,
        TAMANO_CASILLA_REFERENCIA - 4,
        6,
      );
      sombras.fillStyle(
        configuracionSombras.color,
        configuracionSombras.opacidadMuros * 0.45,
      );
      sombras.fillRect(
        pixelX + 5,
        pixelY + TAMANO_CASILLA_REFERENCIA + 6,
        TAMANO_CASILLA_REFERENCIA - 10,
        3,
      );
    }

    if (tieneSueloDerecha) {
      sombras.fillStyle(
        configuracionSombras.color,
        configuracionSombras.opacidadMuros * 0.6,
      );
      sombras.fillRect(
        pixelX + TAMANO_CASILLA_REFERENCIA,
        pixelY + 4,
        4,
        TAMANO_CASILLA_REFERENCIA - 8,
      );
    }
  }

  dibujarSuperficieMuro({
    pixelX,
    pixelY,
    colorPared,
    claveTextura,
    varianteMuro,
  }) {
    const anchoVisual = TAMANO_CASILLA_REFERENCIA + 1;
    const altoVisual = 16;
    const centroX = pixelX + TAMANO_CASILLA_REFERENCIA / 2;
    const centroY = pixelY + 8;

    if (claveTextura) {
      const imagen = this.escena.add.image(centroX, centroY, claveTextura);
      imagen.setDisplaySize(anchoVisual, altoVisual);
      imagen.setAngle(varianteMuro?.angulo ?? 0);
      imagen.setAlpha(0.98);
      this.capaTerreno.add(imagen);
      return;
    }

    const tope = this.escena.add.graphics();
    const colorTope = mezclarColor(colorPared, 0xffffff, 0.14);
    const colorSombra = mezclarColor(colorPared, 0x000000, 0.46);
    tope.fillStyle(colorTope, 0.96);
    tope.fillRect(pixelX, pixelY, TAMANO_CASILLA_REFERENCIA, 12);
    tope.lineStyle(1, colorSombra, 0.65);
    tope.lineBetween(
      pixelX + 1,
      pixelY + 11.5,
      pixelX + TAMANO_CASILLA_REFERENCIA - 1,
      pixelY + 11.5,
    );
    this.capaTerreno.add(tope);
  }

  dibujarAlturaMuro({
    sombras,
    laterales,
    x,
    y,
    pixelX,
    pixelY,
    colorPared,
    configuracionPared,
    configuracionSombras,
    esParedEn,
  }) {
    const altura = normalizarConfiguracionAlturaPared(
      configuracionPared.altura,
    );
    const expuestoSur = !esParedEn(x, y + 1);
    const expuestoEste = !esParedEn(x + 1, y);

    if (!expuestoSur && !expuestoEste) {
      return;
    }

    const colorFrente = mezclarColor(colorPared, 0x000000, 0.34);
    const colorLateral = mezclarColor(colorPared, 0x000000, 0.52);

    if (expuestoSur) {
      const altoVisual = altura.altoVisual;
      const baseVisual =
        pixelY + TAMANO_CASILLA_REFERENCIA + altura.solapeSuperior;
      const inicioVisual = baseVisual - altoVisual;
      const rutaFrente = elegirRutaDeterminista(altura.frentes, x, y);
      const claveTextura = this.gestorRecursos.obtener(rutaFrente);

      sombras.fillStyle(
        configuracionSombras.color,
        configuracionSombras.opacidadMuros * 0.68,
      );
      sombras.fillRect(
        pixelX + 2,
        baseVisual,
        TAMANO_CASILLA_REFERENCIA - 4,
        altura.sombraProyectada,
      );

      if (claveTextura) {
        const frente = this.escena.add.image(
          pixelX + TAMANO_CASILLA_REFERENCIA / 2,
          inicioVisual + altoVisual / 2,
          claveTextura,
        );
        frente.setDisplaySize(
          TAMANO_CASILLA_REFERENCIA + 1,
          altoVisual,
        );
        frente.setAlpha(altura.opacidad);
        this.capaMurosAltos.add(frente);
      } else {
        laterales.fillStyle(colorFrente, altura.opacidad);
        laterales.fillRect(
          pixelX,
          inicioVisual,
          TAMANO_CASILLA_REFERENCIA,
          altoVisual,
        );
      }

      laterales.lineStyle(1, mezclarColor(colorPared, 0xffffff, 0.2), 0.6);
      laterales.lineBetween(
        pixelX + 1,
        inicioVisual + 0.5,
        pixelX + TAMANO_CASILLA_REFERENCIA - 1,
        inicioVisual + 0.5,
      );
      laterales.lineStyle(1, mezclarColor(colorPared, 0x000000, 0.7), 0.72);
      laterales.lineBetween(
        pixelX + 1,
        baseVisual - 0.5,
        pixelX + TAMANO_CASILLA_REFERENCIA - 1,
        baseVisual - 0.5,
      );
    }

    if (expuestoEste && altura.anchoLateral > 0) {
      const ancho = altura.anchoLateral;
      const inicioY = pixelY + 6;
      const finalY = pixelY + TAMANO_CASILLA_REFERENCIA;

      laterales.fillStyle(colorLateral, altura.opacidad * 0.9);
      laterales.fillPoints(
        [
          { x: pixelX + TAMANO_CASILLA_REFERENCIA - ancho, y: inicioY },
          { x: pixelX + TAMANO_CASILLA_REFERENCIA, y: inicioY + 2 },
          { x: pixelX + TAMANO_CASILLA_REFERENCIA, y: finalY },
          {
            x: pixelX + TAMANO_CASILLA_REFERENCIA - ancho,
            y: finalY - 2,
          },
        ],
        true,
      );
    }
  }

  dibujarDecoracionCasilla({
    graficos,
    x,
    y,
    pixelX,
    pixelY,
    configuracion,
  }) {
    const hash = obtenerHashCasilla(x, y);
    const valor = (hash % 1000) / 1000;

    if (valor >= configuracion.densidad) {
      return;
    }

    const tipos = configuracion.tipos;
    const tipo = tipos[Math.floor(hash / 1000) % tipos.length];
    const desplazamientoX = 5 + (hash % 15);
    const desplazamientoY = 7 + (Math.floor(hash / 17) % 13);

    switch (tipo) {
      case TIPOS_DECORACION.CHARCO:
        graficos.fillStyle(configuracion.colorHumedad, 0.24);
        graficos.fillEllipse(
          pixelX + TAMANO_CASILLA_REFERENCIA / 2,
          pixelY + 20,
          22,
          9,
        );
        graficos.lineStyle(1, configuracion.colorReflejo, 0.28);
        graficos.lineBetween(pixelX + 10, pixelY + 18, pixelX + 20, pixelY + 16);
        break;

      case TIPOS_DECORACION.REJILLA:
        graficos.fillStyle(configuracion.colorMetal, 0.55);
        graficos.fillRect(pixelX + 9, pixelY + 10, 14, 12);
        graficos.lineStyle(1, configuracion.colorOxido, 0.7);
        for (let indice = 0; indice < 4; indice++) {
          const lineaX = pixelX + 11 + indice * 3;
          graficos.lineBetween(lineaX, pixelY + 11, lineaX, pixelY + 21);
        }
        break;

      case TIPOS_DECORACION.ESCOMBROS:
        graficos.fillStyle(configuracion.colorEscombro, 0.6);
        graficos.fillRect(pixelX + desplazamientoX, pixelY + desplazamientoY, 4, 3);
        graficos.fillRect(pixelX + desplazamientoX + 6, pixelY + desplazamientoY + 2, 3, 4);
        graficos.fillRect(pixelX + desplazamientoX - 3, pixelY + desplazamientoY + 5, 3, 2);
        break;

      case TIPOS_DECORACION.MANCHA:
      default:
        graficos.fillStyle(configuracion.colorMancha, 0.16);
        graficos.fillCircle(pixelX + desplazamientoX, pixelY + desplazamientoY, 5);
        graficos.fillCircle(pixelX + desplazamientoX + 5, pixelY + desplazamientoY + 2, 3);
        graficos.fillCircle(pixelX + desplazamientoX - 4, pixelY + desplazamientoY + 3, 2);
        break;
    }
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
          TAMANO_CASILLA_REFERENCIA - 6,
          TAMANO_CASILLA_REFERENCIA - 6,
        );
        graficos.lineStyle(1, estilo.borde, 0.65);
        graficos.strokeRect(
          posicion.x + 3.5,
          posicion.y + 3.5,
          TAMANO_CASILLA_REFERENCIA - 7,
          TAMANO_CASILLA_REFERENCIA - 7,
        );
      }
    }

    this.capaZonas.add(graficos);
  }

  dibujarSombrasEntidades() {
    this.capaSombras.removeAll(true);

    const aparienciaPhaser =
      this.escenaDarkMoon?.mapa?.apariencia?.phaser ?? {};
    const configuracionSombras = normalizarConfiguracionSombras(
      aparienciaPhaser.sombras,
    );
    const graficos = this.escena.add.graphics();

    for (const entidad of this.escenaDarkMoon?.entidades ?? []) {
      const posicion = this.obtenerPosicionCasilla(entidad);
      if (!posicion) continue;

      const estilo =
        ESTILOS_ENTIDAD[entidad.tipo] ??
        ESTILOS_ENTIDAD[TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE];
      const centroX = posicion.x + TAMANO_CASILLA_REFERENCIA / 2;
      const baseY = obtenerBaseEntidad(posicion);
      const metricas = this.obtenerMetricasVisualesEntidad(entidad, estilo);
      const opacidad =
        entidad.estaViva === false
          ? configuracionSombras.opacidadEntidades * 0.45
          : configuracionSombras.opacidadEntidades;

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
    }

    this.capaSombras.add(graficos);
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
    this.capaEntidades.removeAll(true);

    const entidades = [...(this.escenaDarkMoon?.entidades ?? [])].sort(
      compararEntidades,
    );

    for (const entidad of entidades) {
      const posicion = this.obtenerPosicionCasilla(entidad);
      if (!posicion) continue;

      const estilo =
        ESTILOS_ENTIDAD[entidad.tipo] ??
        ESTILOS_ENTIDAD[TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE];
      const centroX = posicion.x + TAMANO_CASILLA_REFERENCIA / 2;
      const baseY = obtenerBaseEntidad(posicion);
      const metricas = this.obtenerMetricasVisualesEntidad(entidad, estilo);
      const informacionRecurso = metricas.informacionRecurso;

      if (informacionRecurso) {
        const imagen = this.escena.add.image(
          centroX,
          baseY,
          informacionRecurso.claveTextura,
        );
        imagen.setOrigin(
          informacionRecurso.anclaje.x,
          informacionRecurso.anclaje.y,
        );
        imagen.setDisplaySize(estilo.tamano, estilo.tamano);
        imagen.setAlpha(entidad.estaViva === false ? 0.42 : 1);
        this.capaEntidades.add(imagen);
      } else {
        this.dibujarRespaldoEntidad({ entidad, estilo, centroX, baseY });
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
        sombraAncho: estilo.sombraAncho,
        sombraAlto: estilo.sombraAlto,
      });
    }

    const escala = estilo.tamano / Math.max(1, informacionRecurso.ancho);
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

      const centroX = posicion.x + TAMANO_CASILLA_REFERENCIA / 2;
      const centroY = posicion.y + TAMANO_CASILLA_REFERENCIA / 2;
      const radio = 30;
      const opacidad = 0.025;

      graficos.fillStyle(configuracion.colorJugador, opacidad);
      graficos.fillCircle(centroX, centroY, radio);
      graficos.fillStyle(configuracion.colorJugador, opacidad * 1.8);
      graficos.fillCircle(centroX, centroY, Math.round(radio * 0.55));
    }

    this.capaIluminacion.add(graficos);
  }

  dibujarRespaldoEntidad({ entidad, estilo, centroX, baseY }) {
    const tamano = 24;
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

    this.capaEntidades.add([graficos, texto]);
  }

  dibujarAgresividad(posicion) {
    const centroX = posicion.x + TAMANO_CASILLA_REFERENCIA - 6;
    const centroY = posicion.y + 9;
    const graficos = this.escena.add.graphics();
    graficos.fillStyle(0x37080d, 0.95);
    graficos.fillCircle(centroX, centroY, 6);
    graficos.lineStyle(2, 0xff3f4d, 1);
    graficos.strokeCircle(centroX, centroY, 6);
    this.capaEntidades.add(graficos);

    const texto = this.escena.add
      .text(centroX, centroY, "!", {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "10px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.capaEntidades.add(texto);
  }

  dibujarBarraVida(entidad, posicion) {
    const porcentaje = Math.max(
      0,
      Math.min(1, entidad.vidaActual / entidad.vidaMaxima),
    );
    const ancho = TAMANO_CASILLA_REFERENCIA - 6;
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
    this.capaEntidades.add(graficos);
  }

  dibujarRellenoCasilla(graficos, casilla, estilo) {
    const posicion = this.obtenerPosicionCasilla(casilla);
    if (!posicion) return;

    const margen = estilo.margen ?? 1;
    graficos.fillStyle(estilo.relleno, estilo.alphaRelleno);
    graficos.fillRect(
      posicion.x + margen,
      posicion.y + margen,
      TAMANO_CASILLA_REFERENCIA - margen * 2,
      TAMANO_CASILLA_REFERENCIA - margen * 2,
    );
    graficos.lineStyle(1, estilo.borde, estilo.alphaBorde);
    graficos.strokeRect(
      posicion.x + margen + 0.5,
      posicion.y + margen + 0.5,
      TAMANO_CASILLA_REFERENCIA - margen * 2 - 1,
      TAMANO_CASILLA_REFERENCIA - margen * 2 - 1,
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
    const x1 = posicion.x + TAMANO_CASILLA_REFERENCIA - margen;
    const y1 = posicion.y + TAMANO_CASILLA_REFERENCIA - margen;

    graficos.fillStyle(color, 0.1);
    graficos.fillRect(
      posicion.x + 1,
      posicion.y + 1,
      TAMANO_CASILLA_REFERENCIA - 2,
      TAMANO_CASILLA_REFERENCIA - 2,
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
      const x = posicion.x + TAMANO_CASILLA_REFERENCIA / 2;
      const y = posicion.y + TAMANO_CASILLA_REFERENCIA / 2;
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
        TAMANO_CASILLA_REFERENCIA - 11,
        TAMANO_CASILLA_REFERENCIA - 11,
      );
      this.capaSeleccion.add(graficos);

      const texto = this.escena.add
        .text(
          posicion.x + TAMANO_CASILLA_REFERENCIA - 7,
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

  destruir() {
    this.capaFondo.destroy(true);
    this.capaTerreno.destroy(true);
    this.capaDecoracion.destroy(true);
    this.capaMurosAltos.destroy(true);
    this.capaZonas.destroy(true);
    this.capaSombras.destroy(true);
    this.capaSeleccion.destroy(true);
    this.capaEntidades.destroy(true);
    this.capaIluminacion.destroy(true);
    this.escenaDarkMoon = null;
    this.escena = null;
    this.gestorRecursos = null;
    this.conversorCoordenadas = null;
    this.resolutorTerrenos = null;
  }
}

function obtenerBaseEntidad(posicion) {
  return posicion.y + TAMANO_CASILLA_REFERENCIA - 2;
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

function elegirRutaDeterminista(rutas, x, y) {
  if (rutas.length === 0) return null;
  const hash = obtenerHashCasilla(x, y);
  return rutas[hash % rutas.length];
}

function obtenerHashCasilla(x, y) {
  return Math.abs(
    Math.imul(x + 17, 73856093) ^ Math.imul(y + 31, 19349663),
  );
}

function normalizarConfiguracionPared(configuracion = {}) {
  const variantesEntrada = configuracion?.variantes ?? {};

  return Object.freeze({
    recurso: normalizarRuta(configuracion?.recurso),
    variantes: Object.freeze({
      aislado: normalizarRuta(variantesEntrada.aislado),
      extremo: normalizarRuta(variantesEntrada.extremo),
      recto: normalizarRuta(variantesEntrada.recto),
      esquina: normalizarRuta(variantesEntrada.esquina),
      unionT: normalizarRuta(variantesEntrada.unionT),
      cruce: normalizarRuta(variantesEntrada.cruce),
      interior: normalizarRuta(variantesEntrada.interior),
    }),
    altura: normalizarConfiguracionAlturaPared(configuracion?.altura),
  });
}

function normalizarConfiguracionAlturaPared(configuracion = {}) {
  return Object.freeze({
    frentes: Object.freeze(
      Array.isArray(configuracion?.frentes)
        ? configuracion.frentes.map(normalizarRuta).filter(Boolean)
        : [],
    ),
    altoVisual: limitarNumero(configuracion?.altoVisual, 8, 30, 20),
    solapeSuperior: limitarNumero(
      configuracion?.solapeSuperior,
      0,
      8,
      2,
    ),
    anchoLateral: limitarNumero(configuracion?.anchoLateral, 0, 12, 5),
    sombraProyectada: limitarNumero(
      configuracion?.sombraProyectada,
      0,
      16,
      6,
    ),
    opacidad: limitarNumero(configuracion?.opacidad, 0.1, 1, 1),
  });
}

function obtenerRutaMuro(configuracion, tipo) {
  return configuracion.variantes[tipo] ?? configuracion.recurso;
}

function clasificarMuro(mapa, x, y, esParedEn) {
  const comprobarPared =
    typeof esParedEn === "function"
      ? esParedEn
      : (columna, fila) => mapa[fila]?.[columna] === "#";
  const norte = comprobarPared(x, y - 1);
  const este = comprobarPared(x + 1, y);
  const sur = comprobarPared(x, y + 1);
  const oeste = comprobarPared(x - 1, y);
  const cantidad = [norte, este, sur, oeste].filter(Boolean).length;

  if (cantidad === 0) {
    return { tipo: "aislado", angulo: 0 };
  }

  if (cantidad === 1) {
    return {
      tipo: "extremo",
      angulo: norte ? 0 : este ? 90 : sur ? 180 : 270,
    };
  }

  if (cantidad === 2) {
    if ((norte && sur) || (este && oeste)) {
      return {
        tipo: "recto",
        angulo: norte && sur ? 90 : 0,
      };
    }

    return {
      tipo: "esquina",
      angulo: norte && este ? 0 : este && sur ? 90 : sur && oeste ? 180 : 270,
    };
  }

  if (cantidad === 3) {
    return {
      tipo: "unionT",
      angulo: !sur ? 0 : !oeste ? 90 : !norte ? 180 : 270,
    };
  }

  const diagonalesCompletas =
    comprobarPared(x - 1, y - 1) &&
    comprobarPared(x + 1, y - 1) &&
    comprobarPared(x + 1, y + 1) &&
    comprobarPared(x - 1, y + 1);

  return {
    tipo: diagonalesCompletas ? "interior" : "cruce",
    angulo: 0,
  };
}

function normalizarRuta(ruta) {
  return typeof ruta === "string" && ruta.trim() !== "" ? ruta.trim() : null;
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

function normalizarConfiguracionDecoracion(configuracion = {}) {
  const tiposDisponibles = Object.freeze({
    charco: TIPOS_DECORACION.CHARCO,
    rejilla: TIPOS_DECORACION.REJILLA,
    escombros: TIPOS_DECORACION.ESCOMBROS,
    mancha: TIPOS_DECORACION.MANCHA,
  });
  const tiposConfigurados = Array.isArray(configuracion.tipos)
    ? configuracion.tipos
        .map((tipo) =>
          typeof tipo === "string"
            ? tiposDisponibles[tipo.trim().toLowerCase()]
            : undefined,
        )
        .filter((tipo) => tipo !== undefined)
    : [];

  return Object.freeze({
    densidad: limitarNumero(configuracion.densidad, 0, 0.4, 0.16),
    tipos: Object.freeze(
      tiposConfigurados.length > 0
        ? [...new Set(tiposConfigurados)]
        : Object.values(TIPOS_DECORACION),
    ),
    colorHumedad: convertirColor(configuracion.colorHumedad, 0x2f7568),
    colorReflejo: convertirColor(configuracion.colorReflejo, 0x8ec9b9),
    colorMetal: convertirColor(configuracion.colorMetal, 0x45504b),
    colorOxido: convertirColor(configuracion.colorOxido, 0x9a6338),
    colorEscombro: convertirColor(configuracion.colorEscombro, 0x858d7f),
    colorMancha: convertirColor(configuracion.colorMancha, 0x172a23),
  });
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

function normalizarConfiguracionGrilla(configuracion = {}) {
  return Object.freeze({
    opacidadSuelo: limitarNumero(
      configuracion.opacidadSuelo,
      0,
      1,
      0.03,
    ),
    opacidadPared: limitarNumero(
      configuracion.opacidadPared,
      0,
      1,
      0.015,
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
    intensidad: limitarNumero(configuracion.intensidad, 0, 0.36, 0.14),
  });
}

function limitarNumero(valor, minimo, maximo, respaldo) {
  if (!Number.isFinite(valor)) {
    return respaldo;
  }

  return Math.max(minimo, Math.min(maximo, valor));
}

function mezclarColor(colorA, colorB, proporcion) {
  const t = Math.max(0, Math.min(1, proporcion));
  const ar = (colorA >> 16) & 0xff;
  const ag = (colorA >> 8) & 0xff;
  const ab = colorA & 0xff;
  const br = (colorB >> 16) & 0xff;
  const bg = (colorB >> 8) & 0xff;
  const bb = colorB & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | b;
}
