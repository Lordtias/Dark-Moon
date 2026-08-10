import { TAMANO_CASILLA_REFERENCIA } from "./ConfiguracionPhaser.js";
import {
  normalizarConfiguracionAutotilingPared,
  resolverCasillaParedAutotiling,
  resolverCasillaSueloAutotiling,
} from "../mapas/ResolutorAutotilingParedes.js";
import {
  crearPredicadoParedTerrenos,
  normalizarConfiguracionTerrenosMapa,
  resolverCasillaTerreno,
} from "../mapas/ResolutorTerrenosMapa.js";

const COLOR_FONDO_MUNDO = 0x0b120f;
const OPACIDAD_REJILLA_RESPALDO = 0.2;

const TIPOS_DECORACION = Object.freeze({
  CHARCO: 0,
  REJILLA: 1,
  ESCOMBROS: 2,
  MANCHA: 3,
});

// Compone las capas persistentes del terreno. No conoce entidades, selección,
// visibilidad ni reglas del dominio.
export class CompositorTerrenoPhaser {
  constructor({ escena, gestorRecursos, capaFondo, capaTerreno, capaDecoracion } = {}) {
    if (
      !escena?.add ||
      !gestorRecursos ||
      !capaFondo ||
      !capaTerreno ||
      !capaDecoracion
    ) {
      throw new Error(
        "CompositorTerrenoPhaser necesita escena, recursos y capas de terreno.",
      );
    }

    this.escena = escena;
    this.gestorRecursos = gestorRecursos;
    this.capaFondo = capaFondo;
    this.capaTerreno = capaTerreno;
    this.capaDecoracion = capaDecoracion;
  }

  dibujarBaseMundo({ escenaDarkMoon, geometria } = {}) {
    this.capaFondo.removeAll(true);
    this.capaTerreno.removeAll(true);
    this.capaDecoracion.removeAll(true);

    const mapa = escenaDarkMoon.mapa.casillas;
    const apariencia = escenaDarkMoon.mapa.apariencia ?? {};
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

    this.dibujarFondoMundo(aparienciaPhaser.iluminacion, geometria);

    const respaldos = this.escena.add.graphics();
    const grilla = this.escena.add.graphics();
    const decoracion = this.escena.add.graphics();
    const sombrasContacto = this.escena.add.graphics();
    const detallesMuros = this.escena.add.graphics();
    const imagenesSombrasContacto = [];
    const imagenesBordesMuros = [];

    for (let y = 0; y < geometria.filas; y++) {
      for (let x = 0; x < geometria.columnas; x++) {
        const simboloCasilla = mapa[y][x];
        const resolucionTerreno = resolverCasillaTerreno({
          configuracion: configuracionTerrenos,
          simbolo: simboloCasilla,
          x,
          y,
        });
        const esPared = resolucionTerreno.esPared;
        const pixelX = geometria.origenX + x * TAMANO_CASILLA_REFERENCIA;
        const pixelY = geometria.origenY + y * TAMANO_CASILLA_REFERENCIA;
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
          respaldos.fillStyle(
            resolucionTerreno.color ?? (esPared ? colorPared : colorSuelo),
            1,
          );
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
    this.dibujarMarcoMapa(geometria);
  }

  dibujarFondoMundo(configuracionIluminacion, geometria) {
    const iluminacion = normalizarConfiguracionIluminacion(
      configuracionIluminacion,
    );
    const fondo = this.escena.add.graphics();
    fondo.fillStyle(COLOR_FONDO_MUNDO, 1);
    fondo.fillRect(0, 0, geometria.anchoMundo, geometria.altoMundo);

    fondo.fillStyle(iluminacion.colorAmbiente, iluminacion.intensidad * 0.55);
    fondo.fillRect(
      geometria.origenX,
      geometria.origenY,
      geometria.anchoMapa,
      geometria.altoMapa,
    );

    this.capaFondo.add(fondo);
  }

  dibujarMarcoMapa(geometria) {
    const marco = this.escena.add.graphics();
    const { origenX, origenY, anchoMapa, altoMapa } = geometria;

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

  dibujarBordeMuroRespaldo({ graficos, pixelX, pixelY, lado, borde }) {
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
    const x =
      lado === "este"
        ? pixelX + tamano - margen - grosor
        : pixelX + margen;
    const y =
      lado === "sur"
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
        graficos.lineBetween(
          pixelX + 10,
          pixelY + 18,
          pixelX + 20,
          pixelY + 16,
        );
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
        graficos.fillRect(
          pixelX + desplazamientoX,
          pixelY + desplazamientoY,
          4,
          3,
        );
        graficos.fillRect(
          pixelX + desplazamientoX + 6,
          pixelY + desplazamientoY + 2,
          3,
          4,
        );
        graficos.fillRect(
          pixelX + desplazamientoX - 3,
          pixelY + desplazamientoY + 5,
          3,
          2,
        );
        break;

      case TIPOS_DECORACION.MANCHA:
      default:
        graficos.fillStyle(configuracion.colorMancha, 0.16);
        graficos.fillCircle(
          pixelX + desplazamientoX,
          pixelY + desplazamientoY,
          5,
        );
        graficos.fillCircle(
          pixelX + desplazamientoX + 5,
          pixelY + desplazamientoY + 2,
          3,
        );
        graficos.fillCircle(
          pixelX + desplazamientoX - 4,
          pixelY + desplazamientoY + 3,
          2,
        );
        break;
    }
  }

  destruir() {
    this.escena = null;
    this.gestorRecursos = null;
    this.capaFondo = null;
    this.capaTerreno = null;
    this.capaDecoracion = null;
  }
}

export function normalizarConfiguracionIluminacion(configuracion = {}) {
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

function limitarNumero(valor, minimo, maximo, respaldo) {
  if (!Number.isFinite(valor)) {
    return respaldo;
  }

  return Math.max(minimo, Math.min(maximo, valor));
}
