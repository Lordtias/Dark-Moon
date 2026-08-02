import { analizarArquitecturaVisualPhaser } from "./AnalizadorArquitecturaVisualPhaser.js";
import { CompositorPuertasPhaser } from "./CompositorPuertasPhaser.js";
import { TAMANO_CASILLA_VISUAL_PHASER } from "./ConfiguracionPhaser.js";
import {
  NIVELES_PROFUNDIDAD_MUNDO_PHASER,
  calcularProfundidadOrdenablePhaser,
} from "./OrdenadorProfundidadPhaser.js";

// Dibuja una arquitectura derivada de la matriz canónica. Las tapas permanecen
// en el fondo; fachadas, laterales, esquinas, puertas y entidades se mezclan en
// la misma lista de profundidad mediante su línea de apoyo visible.
export class CompositorArquitecturaPhaser {
  constructor({ escena, gestorRecursos, capaTerreno, capaDecoracion } = {}) {
    if (!escena?.add || !gestorRecursos || !capaTerreno || !capaDecoracion) {
      throw new Error(
        "CompositorArquitecturaPhaser necesita escena, recursos y capas de base.",
      );
    }

    this.escena = escena;
    this.gestorRecursos = gestorRecursos;
    this.capaTerreno = capaTerreno;
    this.capaDecoracion = capaDecoracion;
    this.objetosOrdenables = [];
    this.compositorPuertas = new CompositorPuertasPhaser({
      escena,
      gestorRecursos,
      registrarObjeto: (objeto, profundidad) =>
        this.registrarObjetoOrdenable(objeto, profundidad),
    });
  }

  dibujar({ escenaDarkMoon, geometria } = {}) {
    this.limpiarObjetosOrdenables();

    const mapa = escenaDarkMoon?.mapa?.casillas;
    const apariencia = escenaDarkMoon?.mapa?.apariencia ?? {};
    const aparienciaPhaser = apariencia.phaser ?? {};
    const plano = analizarArquitecturaVisualPhaser({
      mapa,
      entidades: escenaDarkMoon?.entidades ?? [],
    });
    const configuracion = normalizarConfiguracion({
      apariencia,
      aparienciaPhaser,
    });

    this.dibujarSuelo({ plano, geometria, configuracion });
    this.dibujarMuros({ plano, geometria, configuracion });
    this.compositorPuertas.dibujar({
      puertas: plano.puertas,
      geometria,
      configuracion,
    });

    return plano;
  }

  dibujarSuelo({ plano, geometria, configuracion }) {
    const respaldo = this.escena.add.graphics();
    this.capaTerreno.add(respaldo);

    for (const region of plano.regionesSuelo) {
      const x = geometria.origenX + region.x * TAMANO_CASILLA_VISUAL_PHASER;
      const y = geometria.origenY + region.y * TAMANO_CASILLA_VISUAL_PHASER;
      const ancho = region.anchoCasillas * TAMANO_CASILLA_VISUAL_PHASER;
      const alto = region.altoCasillas * TAMANO_CASILLA_VISUAL_PHASER;
      const ruta = elegirRutaDeterminista(
        configuracion.rutasSuelo,
        region.x,
        region.y,
      );
      const claveTextura = this.gestorRecursos.obtener(ruta);

      respaldo.fillStyle(configuracion.colorSuelo, 1);
      respaldo.fillRect(x, y, ancho, alto);

      if (claveTextura && typeof this.escena.add.tileSprite === "function") {
        const textura = this.escena.add.tileSprite(
          x + ancho / 2,
          y + alto / 2,
          ancho,
          alto,
          claveTextura,
        );
        textura.setAlpha?.(0.96);
        textura.tilePositionX = obtenerHash(region.x, region.y) % 41;
        textura.tilePositionY = obtenerHash(region.y, region.x) % 37;
        this.capaTerreno.add(textura);
      }
    }
  }

  dibujarMuros({ plano, geometria, configuracion }) {
    const bases = this.escena.add.graphics();
    const detalles = this.escena.add.graphics();
    const claveTextura = this.gestorRecursos.obtener(configuracion.rutaPared);
    const tamano = TAMANO_CASILLA_VISUAL_PHASER;

    for (const tramo of plano.tramosMuro) {
      const x = geometria.origenX + tramo.x * tamano;
      const y = geometria.origenY + tramo.y * tamano;
      const ancho =
        tramo.orientacion === "horizontal"
          ? tramo.longitudCasillas * tamano
          : tamano;
      const alto =
        tramo.orientacion === "vertical"
          ? tramo.longitudCasillas * tamano
          : tamano;

      bases.fillStyle(configuracion.colorParedOscuro, 1);
      bases.fillRect(x, y, ancho, alto);

      if (claveTextura && typeof this.escena.add.tileSprite === "function") {
        const textura = this.escena.add.tileSprite(
          x + ancho / 2,
          y + alto / 2,
          ancho,
          alto,
          claveTextura,
        );
        textura.setAlpha?.(0.98);
        this.capaDecoracion.add(textura);
      } else {
        bases.fillStyle(configuracion.colorPared, 1);
        bases.fillRect(x + 3, y + 3, ancho - 6, alto - 6);
      }

      detalles.lineStyle(2, configuracion.colorParedClaro, 0.56);
      detalles.lineBetween(x + 3, y + 4, x + ancho - 3, y + 4);
    }

    this.capaDecoracion.add([bases, detalles]);

    for (const frente of plano.frentesSur) {
      this.dibujarFachada({ frente, geometria, configuracion, claveTextura });
    }

    for (const lateral of plano.lateralesEste) {
      for (
        let desplazamiento = 0;
        desplazamiento < lateral.longitudCasillas;
        desplazamiento += 1
      ) {
        this.dibujarLateral({
          xCasilla: lateral.x,
          yCasilla: lateral.y + desplazamiento,
          lado: "este",
          geometria,
          configuracion,
        });
      }
    }

    for (const lateral of plano.lateralesOeste) {
      for (
        let desplazamiento = 0;
        desplazamiento < lateral.longitudCasillas;
        desplazamiento += 1
      ) {
        this.dibujarLateral({
          xCasilla: lateral.x,
          yCasilla: lateral.y + desplazamiento,
          lado: "oeste",
          geometria,
          configuracion,
        });
      }
    }

    for (const esquina of plano.esquinas) {
      this.dibujarEsquina({ esquina, geometria, configuracion });
    }
  }

  dibujarFachada({ frente, geometria, configuracion, claveTextura }) {
    const tamano = TAMANO_CASILLA_VISUAL_PHASER;
    const x = geometria.origenX + frente.x * tamano;
    const ancho = frente.longitudCasillas * tamano;
    const bordeSur =
      geometria.origenY +
      (frente.y + 1) * tamano +
      configuracion.solapeFrenteSur;
    const y = bordeSur - configuracion.alturaFrente;
    const profundidad = calcularProfundidadOrdenablePhaser({
      baseY: bordeSur,
      baseX: x + ancho / 2,
      nivel: NIVELES_PROFUNDIDAD_MUNDO_PHASER.FACHADA,
    });

    if (claveTextura && typeof this.escena.add.tileSprite === "function") {
      const textura = this.escena.add.tileSprite(
        x + ancho / 2,
        y + configuracion.alturaFrente / 2,
        ancho,
        configuracion.alturaFrente,
        claveTextura,
      );
      textura.setAlpha?.(0.97);
      textura.tilePositionX = obtenerHash(frente.x, frente.y) % 29;
      textura.tilePositionY = obtenerHash(frente.y, frente.x) % 31;
      this.registrarObjetoOrdenable(textura, profundidad - 0.01);
    }

    const fachada = this.escena.add.graphics();
    fachada.fillStyle(0x050806, configuracion.opacidadSombra);
    fachada.fillRect(
      x + 5,
      bordeSur - 1,
      Math.max(1, ancho - 2),
      configuracion.alturaSombra,
    );
    fachada.fillStyle(
      configuracion.colorParedFrente,
      claveTextura ? 0.32 : 1,
    );
    fachada.fillRect(x, y, ancho, configuracion.alturaFrente);

    const altoHilada = 18;
    for (
      let yLinea = y + altoHilada;
      yLinea < bordeSur - 3;
      yLinea += altoHilada
    ) {
      fachada.lineStyle(1, configuracion.colorParedOscuro, 0.45);
      fachada.lineBetween(x + 2, yLinea, x + ancho - 2, yLinea);
    }

    fachada.lineStyle(2, configuracion.colorParedClaro, 0.52);
    fachada.lineBetween(x + 2, y + 2, x + ancho - 2, y + 2);
    fachada.lineStyle(2, configuracion.colorParedOscuro, 0.72);
    fachada.lineBetween(x + 2, bordeSur - 2, x + ancho - 2, bordeSur - 2);

    this.registrarObjetoOrdenable(fachada, profundidad);
  }

  dibujarLateral({
    xCasilla,
    yCasilla,
    lado,
    geometria,
    configuracion,
  }) {
    const tamano = TAMANO_CASILLA_VISUAL_PHASER;
    const xBase = geometria.origenX + xCasilla * tamano;
    const x =
      lado === "este"
        ? xBase + tamano - configuracion.anchoLateral
        : xBase;
    const y = geometria.origenY + yCasilla * tamano + 4;
    const baseY =
      geometria.origenY +
      (yCasilla + 1) * tamano +
      configuracion.solapeFrenteSur;
    const alto = Math.max(10, baseY - y);
    const lateral = this.escena.add.graphics();

    lateral.fillStyle(configuracion.colorParedLateral, 0.94);
    lateral.fillRect(x, y, configuracion.anchoLateral, alto);
    lateral.lineStyle(1, configuracion.colorParedClaro, 0.32);
    lateral.lineBetween(
      lado === "este" ? x + 1 : x + configuracion.anchoLateral - 1,
      y + 2,
      lado === "este" ? x + 1 : x + configuracion.anchoLateral - 1,
      baseY - 2,
    );

    this.registrarObjetoOrdenable(
      lateral,
      calcularProfundidadOrdenablePhaser({
        baseY,
        baseX: x + configuracion.anchoLateral / 2,
        nivel: NIVELES_PROFUNDIDAD_MUNDO_PHASER.FACHADA,
      }),
    );
  }

  dibujarEsquina({ esquina, geometria, configuracion }) {
    const tamano = TAMANO_CASILLA_VISUAL_PHASER;
    const xCelda = geometria.origenX + esquina.x * tamano;
    const yCelda = geometria.origenY + esquina.y * tamano;
    const esSur = esquina.orientacion.startsWith("sur");
    const esEste = esquina.orientacion.endsWith("este");
    const ancho = configuracion.anchoEsquina;
    const baseY = esSur
      ? yCelda + tamano + configuracion.solapeFrenteSur
      : yCelda + tamano - 4;
    const alto = esSur
      ? configuracion.alturaFrente
      : Math.round(configuracion.alturaFrente * 0.72);
    const x = esEste ? xCelda + tamano - ancho : xCelda;
    const y = baseY - alto;
    const esquinaGrafica = this.escena.add.graphics();

    esquinaGrafica.fillStyle(configuracion.colorParedOscuro, 0.98);
    esquinaGrafica.fillRect(x - 2, y, ancho + 4, alto);
    esquinaGrafica.fillStyle(configuracion.colorParedFrente, 1);
    esquinaGrafica.fillRect(x, y + 2, ancho, alto - 4);
    esquinaGrafica.fillStyle(configuracion.colorParedClaro, 0.72);
    esquinaGrafica.fillRect(x + 2, y + 2, ancho - 4, 4);
    esquinaGrafica.lineStyle(2, configuracion.colorParedOscuro, 0.8);
    esquinaGrafica.lineBetween(x, baseY - 2, x + ancho, baseY - 2);

    // El remate sobresale sobre ambas caras. Al compartir la línea de apoyo
    // puede ocultar personajes y props en las cuatro orientaciones de esquina.
    esquinaGrafica.fillStyle(configuracion.colorParedClaro, 0.38);
    esquinaGrafica.fillRect(x - 3, y - 3, ancho + 6, 6);

    this.registrarObjetoOrdenable(
      esquinaGrafica,
      calcularProfundidadOrdenablePhaser({
        baseY,
        baseX: x + ancho / 2,
        nivel: NIVELES_PROFUNDIDAD_MUNDO_PHASER.REMATE,
      }),
    );
  }

  registrarObjetoOrdenable(objeto, profundidad) {
    objeto.setDepth?.(profundidad);
    this.objetosOrdenables.push(objeto);
    return objeto;
  }

  limpiarObjetosOrdenables() {
    for (const objeto of this.objetosOrdenables) {
      objeto?.destroy?.();
    }
    this.objetosOrdenables.length = 0;
  }

  destruir() {
    this.limpiarObjetosOrdenables();
    this.compositorPuertas?.destruir?.();
    this.compositorPuertas = null;
    this.escena = null;
    this.gestorRecursos = null;
    this.capaTerreno = null;
    this.capaDecoracion = null;
  }
}

function normalizarConfiguracion({ apariencia, aparienciaPhaser }) {
  const arquitectura = aparienciaPhaser.arquitectura ?? {};
  const colorPared = convertirColor(apariencia.colorPared, 0x53695d);

  return Object.freeze({
    rutasSuelo: normalizarRutas(aparienciaPhaser.suelo?.recursos),
    rutaPared: normalizarRuta(aparienciaPhaser.pared?.recurso),
    colorSuelo: convertirColor(apariencia.colorSuelo, 0x26372f),
    colorPared,
    colorParedClaro: mezclarColor(colorPared, 0xffffff, 0.25),
    colorParedOscuro: mezclarColor(colorPared, 0x000000, 0.5),
    colorParedFrente: mezclarColor(colorPared, 0x000000, 0.24),
    colorParedLateral: mezclarColor(colorPared, 0x000000, 0.58),
    colorMarco: mezclarColor(colorPared, 0x5a3721, 0.48),
    colorMarcoOscuro: mezclarColor(colorPared, 0x130d09, 0.68),
    colorHoja: convertirColor(arquitectura.colorHojaPuerta, 0x6d4328),
    colorHojaOscuro: convertirColor(
      arquitectura.colorHojaPuertaOscuro,
      0x2b1a11,
    ),
    colorHojaClaro: convertirColor(
      arquitectura.colorHojaPuertaClaro,
      0xb48755,
    ),
    // La fachada necesita altura suficiente para que un muro situado delante
    // cubra aproximadamente la mitad de una entidad de 94 px. El solape de la
    // base se conserva para no desplazar la arquitectura hacia abajo.
    alturaFrente: limitar(arquitectura.alturaFrente, 96, 150, 132),
    // La puerta cerrada debe alcanzar la misma presencia vertical que la
    // fachada, pero manteniendo un margen superior para que el marco no
    // parezca una segunda pared sólida.
    alturaMarcoPuerta: limitar(arquitectura.alturaMarcoPuerta, 96, 150, 132),
    solapeFrenteSur: limitar(arquitectura.solapeFrenteSur, 10, 26, 18),
    anchoLateral: limitar(arquitectura.anchoLateral, 8, 18, 12),
    anchoEsquina: limitar(arquitectura.anchoEsquina, 12, 24, 16),
    alturaSombra: limitar(arquitectura.alturaSombra, 4, 18, 10),
    opacidadSombra: limitar(arquitectura.opacidadSombra, 0, 1, 0.34),
  });
}

function normalizarRutas(rutas) {
  return Array.isArray(rutas) ? rutas.map(normalizarRuta).filter(Boolean) : [];
}

function normalizarRuta(ruta) {
  return typeof ruta === "string" && ruta.trim() !== "" ? ruta.trim() : null;
}

function elegirRutaDeterminista(rutas, x, y) {
  if (!Array.isArray(rutas) || rutas.length === 0) return null;
  return rutas[obtenerHash(x, y) % rutas.length];
}

function obtenerHash(x, y) {
  return Math.abs(
    Math.imul(x + 17, 73856093) ^ Math.imul(y + 31, 19349663),
  );
}

function convertirColor(valor, respaldo) {
  if (typeof valor !== "string" || !/^#[0-9a-f]{6}$/i.test(valor)) {
    return respaldo;
  }
  return Number.parseInt(valor.slice(1), 16);
}

function mezclarColor(origen, destino, proporcion) {
  const r1 = (origen >> 16) & 0xff;
  const g1 = (origen >> 8) & 0xff;
  const b1 = origen & 0xff;
  const r2 = (destino >> 16) & 0xff;
  const g2 = (destino >> 8) & 0xff;
  const b2 = destino & 0xff;
  const mezclar = (a, b) => Math.round(a + (b - a) * proporcion);
  return (mezclar(r1, r2) << 16) | (mezclar(g1, g2) << 8) | mezclar(b1, b2);
}

function limitar(valor, minimo, maximo, respaldo) {
  if (!Number.isFinite(valor)) return respaldo;
  return Math.max(minimo, Math.min(maximo, valor));
}
