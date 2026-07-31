import {
  ESTADOS_HOSTILIDAD_VISUAL,
  TIPOS_ENTIDAD_VISUAL,
} from "../TiposEscena.js";
import {
  ALTO_REFERENCIA_PHASER,
  ANCHO_REFERENCIA_PHASER,
  TAMANO_CASILLA_REFERENCIA,
} from "./ConfiguracionPhaser.js";

const ALTO_CABECERA = 82;
const MARGEN_MAPA = 18;

const COLORES_ENTIDADES = Object.freeze({
  [TIPOS_ENTIDAD_VISUAL.JUGADOR]: 0xffdf68,
  [TIPOS_ENTIDAD_VISUAL.ENEMIGO]: 0xe86f78,
  [TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE]: 0xc7955e,
  [TIPOS_ENTIDAD_VISUAL.INTERACTUABLE]: 0x7fd3dd,
});

// La clase se crea después de cargar Phaser para no introducir una dependencia
// global durante el arranque del modo Canvas 2D.
export function crearEscenaArranquePhaser({ Phaser, alPreparar } = {}) {
  if (!Phaser?.Scene) {
    throw new Error("No se puede crear la escena sin Phaser.Scene.");
  }

  return class EscenaArranquePhaser extends Phaser.Scene {
    constructor() {
      super({ key: "escena-tecnica-dark-moon" });

      this.escenaDarkMoon = null;
      this.dimensionesMapa = null;
      this.graficos = null;
      this.textoEstado = null;
      this.textoAyuda = null;
    }

    create() {
      this.graficos = this.add.graphics();

      this.textoEstado = this.add.text(18, 14, "", {
        color: "#f0f2ff",
        fontFamily: "monospace",
        fontSize: "16px",
        lineSpacing: 5,
      });

      this.textoAyuda = this.add
        .text(
          ANCHO_REFERENCIA_PHASER - 18,
          16,
          "MODO TÉCNICO · PUNTERO PROTEGIDO",
          {
            color: "#9da9ff",
            fontFamily: "monospace",
            fontSize: "13px",
          },
        )
        .setOrigin(1, 0);

      this.scale.on("resize", () => this.redibujar());

      if (typeof alPreparar === "function") {
        alPreparar(this);
      }

      this.redibujar();
    }

    configurarDimensionesMapa(dimensiones) {
      this.dimensionesMapa = dimensiones ? { ...dimensiones } : null;
      this.redibujar();
    }

    actualizarEscena(escena) {
      this.escenaDarkMoon = escena ?? null;
      this.redibujar();
    }

    redibujar() {
      if (!this.graficos || !this.textoEstado) {
        return;
      }

      this.graficos.clear();
      this.dibujarFondo();

      if (!this.escenaDarkMoon) {
        this.textoEstado.setText([
          `Phaser ${Phaser.VERSION}`,
          `${ANCHO_REFERENCIA_PHASER} × ${ALTO_REFERENCIA_PHASER} · esperando escena neutral`,
        ]);
        return;
      }

      const mapa = this.escenaDarkMoon.mapa?.casillas ?? [];
      const filas = mapa.length;
      const columnas = filas > 0 && Array.isArray(mapa[0]) ? mapa[0].length : 0;

      this.textoEstado.setText([
        `Phaser ${Phaser.VERSION} · Phaser.AUTO`,
        `Referencia ${ANCHO_REFERENCIA_PHASER} × ${ALTO_REFERENCIA_PHASER} · casilla ${TAMANO_CASILLA_REFERENCIA} × ${TAMANO_CASILLA_REFERENCIA}`,
        `Mapa neutral ${columnas} × ${filas}`,
      ]);

      if (columnas === 0 || filas === 0) {
        return;
      }

      const jugador = this.escenaDarkMoon.entidades?.find(
        (entidad) => entidad.tipo === TIPOS_ENTIDAD_VISUAL.JUGADOR,
      );

      const ventana = calcularVentanaVisible({
        columnas,
        filas,
        jugador,
      });

      this.dibujarCuadricula({ mapa, ventana });
      this.dibujarEntidades({ ventana });
    }

    dibujarFondo() {
      this.graficos.fillStyle(0x101526, 1);
      this.graficos.fillRect(
        0,
        0,
        ANCHO_REFERENCIA_PHASER,
        ALTO_REFERENCIA_PHASER,
      );

      this.graficos.fillStyle(0x151c35, 1);
      this.graficos.fillRect(
        0,
        ALTO_CABECERA,
        ANCHO_REFERENCIA_PHASER,
        ALTO_REFERENCIA_PHASER - ALTO_CABECERA,
      );

      this.graficos.lineStyle(1, 0x4f5f9a, 0.65);
      this.graficos.lineBetween(
        0,
        ALTO_CABECERA - 1,
        ANCHO_REFERENCIA_PHASER,
        ALTO_CABECERA - 1,
      );
    }

    dibujarCuadricula({ mapa, ventana }) {
      for (let fila = 0; fila < ventana.filas; fila++) {
        for (let columna = 0; columna < ventana.columnas; columna++) {
          const xMapa = ventana.inicioX + columna;
          const yMapa = ventana.inicioY + fila;
          const simbolo = mapa[yMapa]?.[xMapa];
          const esPared = simbolo === "#";
          const pixelX = MARGEN_MAPA + columna * TAMANO_CASILLA_REFERENCIA;
          const pixelY = ALTO_CABECERA + fila * TAMANO_CASILLA_REFERENCIA;

          this.graficos.fillStyle(esPared ? 0x3b466d : 0x242d4b, 1);
          this.graficos.fillRect(
            pixelX,
            pixelY,
            TAMANO_CASILLA_REFERENCIA,
            TAMANO_CASILLA_REFERENCIA,
          );

          this.graficos.lineStyle(1, 0x11172a, 0.8);
          this.graficos.strokeRect(
            pixelX,
            pixelY,
            TAMANO_CASILLA_REFERENCIA,
            TAMANO_CASILLA_REFERENCIA,
          );
        }
      }
    }

    dibujarEntidades({ ventana }) {
      for (const entidad of this.escenaDarkMoon.entidades ?? []) {
        if (!estaDentroDeVentana(entidad, ventana)) {
          continue;
        }

        const pixelX =
          MARGEN_MAPA +
          (entidad.x - ventana.inicioX + 0.5) * TAMANO_CASILLA_REFERENCIA;
        const pixelY =
          ALTO_CABECERA +
          (entidad.y - ventana.inicioY + 0.5) * TAMANO_CASILLA_REFERENCIA;

        const color = COLORES_ENTIDADES[entidad.tipo] ?? 0xd5daf6;
        const radio =
          entidad.tipo === TIPOS_ENTIDAD_VISUAL.JUGADOR ? 10 : 8;

        this.graficos.fillStyle(color, entidad.estaViva === false ? 0.4 : 1);
        this.graficos.fillCircle(pixelX, pixelY, radio);

        this.graficos.lineStyle(
          2,
          entidad.estadoHostilidad === ESTADOS_HOSTILIDAD_VISUAL.AGRESIVO
            ? 0xff3647
            : 0xf4f6ff,
          0.9,
        );
        this.graficos.strokeCircle(pixelX, pixelY, radio + 2);
      }
    }
  };
}

function calcularVentanaVisible({ columnas, filas, jugador }) {
  const columnasVisibles = Math.max(
    1,
    Math.min(
      columnas,
      Math.floor(
        (ANCHO_REFERENCIA_PHASER - MARGEN_MAPA * 2) /
          TAMANO_CASILLA_REFERENCIA,
      ),
    ),
  );

  const filasVisibles = Math.max(
    1,
    Math.min(
      filas,
      Math.floor(
        (ALTO_REFERENCIA_PHASER - ALTO_CABECERA - MARGEN_MAPA) /
          TAMANO_CASILLA_REFERENCIA,
      ),
    ),
  );

  const centroX = Number.isInteger(jugador?.x)
    ? jugador.x
    : Math.floor(columnas / 2);
  const centroY = Number.isInteger(jugador?.y)
    ? jugador.y
    : Math.floor(filas / 2);

  return {
    inicioX: limitar(
      centroX - Math.floor(columnasVisibles / 2),
      0,
      Math.max(0, columnas - columnasVisibles),
    ),
    inicioY: limitar(
      centroY - Math.floor(filasVisibles / 2),
      0,
      Math.max(0, filas - filasVisibles),
    ),
    columnas: columnasVisibles,
    filas: filasVisibles,
  };
}

function estaDentroDeVentana(entidad, ventana) {
  return (
    Number.isInteger(entidad?.x) &&
    Number.isInteger(entidad?.y) &&
    entidad.x >= ventana.inicioX &&
    entidad.y >= ventana.inicioY &&
    entidad.x < ventana.inicioX + ventana.columnas &&
    entidad.y < ventana.inicioY + ventana.filas
  );
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}
