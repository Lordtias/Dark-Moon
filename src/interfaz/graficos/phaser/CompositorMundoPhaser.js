import {
  ESTADOS_HOSTILIDAD_VISUAL,
  TIPOS_ENTIDAD_VISUAL,
} from "../TiposEscena.js";
import {
  ALTO_REFERENCIA_PHASER,
  ANCHO_REFERENCIA_PHASER,
  TAMANO_CASILLA_REFERENCIA,
} from "./ConfiguracionPhaser.js";
import {
  normalizarConfiguracionAutotilingPared,
  obtenerRutasRecursosPared,
  resolverCasillaParedAutotiling,
  resolverCasillaSueloAutotiling,
} from "../mapas/ResolutorAutotilingParedes.js";
import {
  crearPredicadoParedTerrenos,
  normalizarConfiguracionTerrenosMapa,
  obtenerRutasRecursosTerreno,
  resolverCasillaTerreno,
} from "../mapas/ResolutorTerrenosMapa.js";
import {
  calcularPresentacionEntidadPhaser,
  CONFIGURACION_ENTIDADES_PHASER,
  obtenerEstiloRespaldoEntidadPhaser,
} from "./ConfiguracionEntidadesPhaser.js";

const COLOR_FONDO_MUNDO = 0x0b120f;
const COLOR_SELECTOR_VALIDO = 0xffe66d;
const COLOR_SELECTOR_INVALIDO = 0xff705c;
const OPACIDAD_REJILLA_RESPALDO = 0.2;

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
    this.nodosEntidades = new Map();

    this.capaFondo = escena.add.container(0, 0).setDepth(0);
    this.capaTerreno = escena.add.container(0, 0).setDepth(10);
    this.capaDecoracion = escena.add.container(0, 0).setDepth(20);
    this.capaZonas = escena.add.container(0, 0).setDepth(30);
    this.capaSombras = escena.add.container(0, 0).setDepth(40);
    this.capaSeleccion = escena.add.container(0, 0).setDepth(50);
    this.capaEntidades = escena.add.container(0, 0).setDepth(60);
    this.capaIluminacion = escena.add.container(0, 0).setDepth(70);
    this.capaEfectos = escena.add.container(0, 0).setDepth(80);
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
    return typeof idVisual === "string"
      ? this.nodosEntidades.get(idVisual) ?? null
      : null;
  }

  obtenerCentroCasilla(casilla) {
    const posicion = this.obtenerPosicionCasilla(casilla);
    return posicion ? obtenerCentroEntidad(posicion) : null;
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
    return true;
  }

  agregarEfectoTemporal(objetoVisual) {
    if (!objetoVisual || !this.capaEfectos) {
      return false;
    }

    this.capaEfectos.add(objetoVisual);
    return true;
  }

  invalidarTerreno() {
    this.firmaTerreno = null;
  }

  ocultarSeleccionTemporal() {
    if (!this.capaSeleccion) {
      return false;
    }

    // Al confirmar una acción, el selector táctico pertenece al estado previo.
    // Se retira antes de reproducir el ataque para que no permanezca superpuesto
    // sobre el objetivo durante el feedback visual. La escena final autoritativa
    // volverá a dibujar la selección únicamente si todavía corresponde.
    this.capaSeleccion.removeAll(true);
    return true;
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
    const apariencia = escenaDarkMoon.mapa.apariencia ?? {};
    const aparienciaPhaser = apariencia.phaser ?? {};
    const configuracionPared = normalizarConfiguracionAutotilingPared(
      aparienciaPhaser.pared,
    );
    const configuracionTerrenos = normalizarConfiguracionTerrenosMapa(
      apariencia,
    );
    const rutas = [
      ...obtenerRutasRecursosTerreno(configuracionTerrenos),
      ...obtenerRutasRecursosPared(configuracionPared),
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

    const mapa = this.escenaDarkMoon.mapa.casillas;
    const apariencia = this.escenaDarkMoon.mapa.apariencia ?? {};
    const aparienciaPhaser = apariencia.phaser ?? {};
    const configuracionTerrenos = normalizarConfiguracionTerrenosMapa(
      apariencia,
    );
    const esParedTerreno = crearPredicadoParedTerrenos(configuracionTerrenos);
    const configuracionPared = normalizarConfiguracionAutotilingPared(
      aparienciaPhaser.pared,
    );
    const colorSuelo = convertirColor(apariencia.colorSuelo, 0x26372f);
    const colorPared = convertirColor(apariencia.colorPared, 0x53695d);
    const colorGrilla = convertirColor(apariencia.colorGrilla, 0x17231d);
    const configuracionDecoracion = normalizarConfiguracionDecoracion(
      aparienciaPhaser.decoracion,
    );
    const configuracionGrilla = normalizarConfiguracionGrilla(
      aparienciaPhaser.grilla,
    );

    this.dibujarFondoMundo(aparienciaPhaser.iluminacion);

    const respaldos = this.escena.add.graphics();
    const grilla = this.escena.add.graphics();
    const decoracion = this.escena.add.graphics();
    const sombrasContacto = this.escena.add.graphics();
    const detallesMuros = this.escena.add.graphics();
    const imagenesSombrasContacto = [];
    const imagenesBordesMuros = [];

    for (let y = 0; y < this.geometria.filas; y++) {
      for (let x = 0; x < this.geometria.columnas; x++) {
        const simboloCasilla = mapa[y][x];
        const resolucionTerreno = resolverCasillaTerreno({
          configuracion: configuracionTerrenos,
          simbolo: simboloCasilla,
          x,
          y,
        });
        const esPared = resolucionTerreno.esPared;
        const pixelX =
          this.geometria.origenX + x * TAMANO_CASILLA_REFERENCIA;
        const pixelY =
          this.geometria.origenY + y * TAMANO_CASILLA_REFERENCIA;
        const resolucionPared = esPared
          ? resolverCasillaParedAutotiling({
              mapa,
              x,
              y,
              configuracion: configuracionPared,
              esPared: esParedTerreno,
            })
          : null;
        const ruta = esPared
          ? resolucionPared.recursoBase
          : resolucionTerreno.rutaBase;
        const claveTextura = esPared
          ? this.gestorRecursos.obtener(ruta) ??
            this.gestorRecursos.obtener(configuracionPared.recurso)
          : this.gestorRecursos.obtener(ruta);

        if (claveTextura) {
          const imagen = this.escena.add.image(
            pixelX + TAMANO_CASILLA_REFERENCIA / 2,
            pixelY + TAMANO_CASILLA_REFERENCIA / 2,
            claveTextura,
          );
          imagen.setDisplaySize(
            TAMANO_CASILLA_REFERENCIA,
            TAMANO_CASILLA_REFERENCIA,
          );
          if (esPared && resolucionPared.anguloBase) {
            imagen.setAngle(resolucionPared.anguloBase);
          }
          imagen.setAlpha(esPared ? 0.98 : 1);
          this.capaTerreno.add(imagen);
        } else {
          respaldos.fillStyle(resolucionTerreno.color ?? (esPared ? colorPared : colorSuelo), 1);
          respaldos.fillRect(
            pixelX,
            pixelY,
            TAMANO_CASILLA_REFERENCIA,
            TAMANO_CASILLA_REFERENCIA,
          );
        }

        const opacidadGrilla = esPared
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
          this.dibujarDetallesMuro({
            graficos: detallesMuros,
            imagenes: imagenesBordesMuros,
            pixelX,
            pixelY,
            resolucion: resolucionPared,
          });
          continue;
        }

        const resolucionSuelo = resolverCasillaSueloAutotiling({
          mapa,
          x,
          y,
          configuracion: configuracionPared,
          esPared: esParedTerreno,
        });
        this.dibujarSombraContactoSuelo({
          graficos: sombrasContacto,
          imagenes: imagenesSombrasContacto,
          pixelX,
          pixelY,
          resolucion: resolucionSuelo,
        });
        this.dibujarDecoracionCasilla({
          graficos: decoracion,
          x,
          y,
          pixelX,
          pixelY,
          configuracion: configuracionDecoracion,
        });
      }
    }

    this.capaTerreno.add([respaldos, grilla]);
    this.capaDecoracion.add([
      decoracion,
      sombrasContacto,
      ...imagenesSombrasContacto,
      detallesMuros,
      ...imagenesBordesMuros,
    ]);
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

  dibujarDetallesMuro({
    graficos,
    imagenes,
    pixelX,
    pixelY,
    resolucion,
  }) {
    const { ladosExpuestos, esquinasInteriores } = resolucion.analisis;
    const borde = resolucion.borde;
    const claveBorde = this.gestorRecursos.obtener(borde.recurso);
    const claveEsquinaInterior = this.gestorRecursos.obtener(
      borde.recursoEsquinaInterior,
    );

    const orientaciones = [
      ["norte", 0],
      ["este", 90],
      ["sur", 180],
      ["oeste", 270],
    ];

    for (const [lado, angulo] of orientaciones) {
      if (!ladosExpuestos[lado]) continue;

      if (claveBorde) {
        imagenes.push(
          this.crearImagenOverlayCasilla({
            pixelX,
            pixelY,
            claveTextura: claveBorde,
            angulo,
            alpha: borde.opacidad,
          }),
        );
      } else {
        this.dibujarBordeMuroRespaldo({
          graficos,
          pixelX,
          pixelY,
          lado,
          borde,
        });
      }
    }

    const orientacionesEsquina = [
      ["noroeste", 0],
      ["noreste", 90],
      ["sureste", 180],
      ["suroeste", 270],
    ];

    for (const [esquina, angulo] of orientacionesEsquina) {
      if (!esquinasInteriores[esquina]) continue;

      if (claveEsquinaInterior) {
        imagenes.push(
          this.crearImagenOverlayCasilla({
            pixelX,
            pixelY,
            claveTextura: claveEsquinaInterior,
            angulo,
            alpha: borde.opacidad,
          }),
        );
      } else {
        this.dibujarEsquinaInteriorRespaldo({
          graficos,
          pixelX,
          pixelY,
          esquina,
          borde,
        });
      }
    }
  }

  dibujarBordeMuroRespaldo({
    graficos,
    pixelX,
    pixelY,
    lado,
    borde,
  }) {
    const tamano = TAMANO_CASILLA_REFERENCIA;
    const grosor = borde.grosor;
    const grosorLuz = Math.min(borde.grosorLuz, grosor);
    const esHorizontal = lado === "norte" || lado === "sur";
    const x = lado === "este" ? pixelX + tamano - grosor : pixelX;
    const y = lado === "sur" ? pixelY + tamano - grosor : pixelY;
    const ancho = esHorizontal ? tamano : grosor;
    const alto = esHorizontal ? grosor : tamano;

    graficos.fillStyle(borde.color, borde.opacidad);
    graficos.fillRect(x, y, ancho, alto);
    graficos.fillStyle(borde.colorLuz, borde.opacidadLuz);
    graficos.fillRect(
      x,
      y,
      esHorizontal ? ancho : grosorLuz,
      esHorizontal ? grosorLuz : alto,
    );
    graficos.fillStyle(borde.colorSombra, borde.opacidadSombra);

    if (lado === "norte") {
      graficos.fillRect(x, y + grosor - 1, ancho, 1);
    } else if (lado === "sur") {
      graficos.fillRect(x, y, ancho, 1);
    } else if (lado === "oeste") {
      graficos.fillRect(x + grosor - 1, y, 1, alto);
    } else {
      graficos.fillRect(x, y, 1, alto);
    }
  }

  dibujarEsquinaInteriorRespaldo({
    graficos,
    pixelX,
    pixelY,
    esquina,
    borde,
  }) {
    const tamano = TAMANO_CASILLA_REFERENCIA;
    const grosor = borde.grosor;
    const x = esquina.includes("este")
      ? pixelX + tamano - grosor
      : pixelX;
    const y = esquina.includes("sur")
      ? pixelY + tamano - grosor
      : pixelY;

    graficos.fillStyle(borde.color, borde.opacidad);
    graficos.fillRect(x, y, grosor, grosor);
    graficos.lineStyle(1, borde.colorLuz, borde.opacidadLuz);
    graficos.strokeRect(x + 0.5, y + 0.5, grosor - 1, grosor - 1);
  }

  dibujarSombraContactoSuelo({
    graficos,
    imagenes,
    pixelX,
    pixelY,
    resolucion,
  }) {
    const { ladosExpuestos } = resolucion.analisis;
    const sombra = resolucion.sombraContacto;

    if (!sombra.habilitada) return;

    const claveSombra = this.gestorRecursos.obtener(sombra.recurso);
    const orientaciones = [
      ["norte", 0],
      ["este", 90],
      ["sur", 180],
      ["oeste", 270],
    ];

    for (const [lado, angulo] of orientaciones) {
      if (!ladosExpuestos[lado]) continue;

      if (claveSombra) {
        imagenes.push(
          this.crearImagenOverlayCasilla({
            pixelX,
            pixelY,
            claveTextura: claveSombra,
            angulo,
            alpha: 1,
          }),
        );
      } else {
        this.dibujarSombraContactoRespaldo({
          graficos,
          pixelX,
          pixelY,
          lado,
          sombra,
        });
      }
    }
  }

  dibujarSombraContactoRespaldo({
    graficos,
    pixelX,
    pixelY,
    lado,
    sombra,
  }) {
    const tamano = TAMANO_CASILLA_REFERENCIA;
    const grosor = sombra.grosor;
    const margen = sombra.margen;
    const largo = Math.max(0, tamano - margen * 2);
    const secundario = Math.max(1, Math.floor(grosor / 2));
    const esHorizontal = lado === "norte" || lado === "sur";
    const x = lado === "este"
      ? pixelX + tamano - margen - grosor
      : pixelX + margen;
    const y = lado === "sur"
      ? pixelY + tamano - margen - grosor
      : pixelY + margen;

    graficos.fillStyle(sombra.color, sombra.opacidad);
    graficos.fillRect(
      x,
      y,
      esHorizontal ? largo : grosor,
      esHorizontal ? grosor : largo,
    );
    graficos.fillStyle(sombra.color, sombra.opacidadSecundaria);

    if (lado === "norte") {
      graficos.fillRect(x, y + grosor, largo, secundario);
    } else if (lado === "sur") {
      graficos.fillRect(x, y - secundario, largo, secundario);
    } else if (lado === "oeste") {
      graficos.fillRect(x + grosor, y, secundario, largo);
    } else {
      graficos.fillRect(x - secundario, y, secundario, largo);
    }
  }

  crearImagenOverlayCasilla({
    pixelX,
    pixelY,
    claveTextura,
    angulo = 0,
    alpha = 1,
  }) {
    const imagen = this.escena.add.image(
      pixelX + TAMANO_CASILLA_REFERENCIA / 2,
      pixelY + TAMANO_CASILLA_REFERENCIA / 2,
      claveTextura,
    );
    imagen.setDisplaySize(
      TAMANO_CASILLA_REFERENCIA,
      TAMANO_CASILLA_REFERENCIA,
    );
    imagen.setAngle(angulo);
    imagen.setAlpha(alpha);
    return imagen;
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

    const tipo = Math.floor(hash / 1000) % 4;
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
    this.capaEntidades.removeAll(true);
    this.nodosEntidades.clear();

    const aparienciaPhaser =
      this.escenaDarkMoon?.mapa?.apariencia?.phaser ?? {};
    const configuracionSombras = normalizarConfiguracionSombras(
      aparienciaPhaser.sombras,
    );

    for (const entidad of this.escenaDarkMoon?.entidades ?? []) {
      const posicion = this.obtenerPosicionCasilla(entidad);
      if (!posicion) continue;

      const idVisual =
        typeof entidad.idVisual === "string" ? entidad.idVisual : null;
      const centro = obtenerCentroEntidad(posicion);
      const metricas = this.obtenerMetricasVisualesEntidad(entidad);
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

      if (entidad.tipo === TIPOS_ENTIDAD_VISUAL.JUGADOR) {
        sombra.lineStyle(2, 0xf1d579, 0.62);
        sombra.strokeEllipse(
          metricas.desplazamientoSombraX,
          metricas.desplazamientoSombraY,
          metricas.sombraAncho + 4,
          metricas.sombraAlto + 3,
        );
      } else if (
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
    const entidades = [...(this.escenaDarkMoon?.entidades ?? [])].sort(
      compararEntidades,
    );

    for (const entidad of entidades) {
      const posicion = this.obtenerPosicionCasilla(entidad);
      if (!posicion) continue;

      const idVisual =
        typeof entidad.idVisual === "string" ? entidad.idVisual : null;
      const estilo = obtenerEstiloRespaldoEntidadPhaser(entidad.tipo);
      const centro = obtenerCentroEntidad(posicion);
      const metricas = this.obtenerMetricasVisualesEntidad(entidad);
      const informacionRecurso = metricas.informacionRecurso;
      const contenedor = this.escena.add.container(centro.x, centro.y);

      if (informacionRecurso) {
        const imagen = this.escena.add.image(
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

      const barraVida =
        entidad.tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO
          ? this.agregarBarraVida(contenedor, entidad)
          : null;

      this.capaEntidades.add(contenedor);
      if (idVisual) {
        const nodoExistente = this.nodosEntidades.get(idVisual) ?? {};
        this.nodosEntidades.set(idVisual, {
          ...nodoExistente,
          entidad,
          contenedor,
          barraVida,
          indicadorAgresividad,
        });
      }
    }
  }

  obtenerMetricasVisualesEntidad(entidad) {
    const informacionRecurso = this.gestorRecursos.obtenerInformacion(
      entidad.recursoVisual,
    );

    return calcularPresentacionEntidadPhaser(informacionRecurso);
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


    this.capaIluminacion.add(graficos);
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
    const configuracion =
      CONFIGURACION_ENTIDADES_PHASER.indicadorAgresividad;
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
    graficos.fillRect(x + 1, y + 1, Math.max(0, (ancho - 2) * porcentaje), 2);
    graficos.setVisible?.(visible === true);
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
    this.capaZonas.destroy(true);
    this.capaSombras.destroy(true);
    this.capaSeleccion.destroy(true);
    this.capaEntidades.destroy(true);
    this.capaIluminacion.destroy(true);
    this.capaEfectos.destroy(true);
    this.nodosEntidades.clear();
    this.escenaDarkMoon = null;
    this.escena = null;
    this.gestorRecursos = null;
    this.conversorCoordenadas = null;
  }
}

function obtenerCentroEntidad(posicion) {
  return Object.freeze({
    x: posicion.x + TAMANO_CASILLA_REFERENCIA / 2,
    y: posicion.y + TAMANO_CASILLA_REFERENCIA / 2,
  });
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

function obtenerHashCasilla(x, y) {
  return Math.abs(
    Math.imul(x + 17, 73856093) ^ Math.imul(y + 31, 19349663),
  );
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
  return Object.freeze({
    densidad: limitarNumero(configuracion.densidad, 0, 0.4, 0.16),
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
      OPACIDAD_REJILLA_RESPALDO,
    ),
    opacidadPared: limitarNumero(
      configuracion.opacidadPared,
      0,
      1,
      0.08,
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
