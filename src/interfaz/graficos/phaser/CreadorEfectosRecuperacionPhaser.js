import { esCentroValido } from "./GeometriaVisualPhaser.js";
import { limitar } from "../../../utilidades/Numeros.js";
import {
  CONFIGURACION_EFECTOS_RECUPERACION_PHASER,
  obtenerPerfilRecuperacion,
} from "./ConfiguracionEfectosRecuperacionPhaser.js";

// Crea feedback temporal para recuperaciones explícitas y subida de nivel.
// No calcula cantidades, máximos ni reglas: recibe resultados ya resueltos.
export class CreadorEfectosRecuperacionPhaser {
  constructor({ escena, compositor } = {}) {
    if (!escena?.add?.container || !escena?.add?.graphics || !compositor) {
      throw new Error(
        "El creador de recuperación necesita escena y compositor válidos.",
      );
    }
    this.escena = escena;
    this.compositor = compositor;
  }

  crearRecuperacion({ centro, recursos = [], reducido = false } = {}) {
    if (!esCentroValido(centro) || !Array.isArray(recursos) || recursos.length === 0) {
      return null;
    }

    const contenedor = this.escena.add.container(centro.x, centro.y);
    const graficos = this.escena.add.graphics();
    contenedor.add(graficos);

    recursos.forEach((recurso, indice) => {
      const perfil = obtenerPerfilRecuperacion(recurso.recurso);
      const proporcion = limitar(Number(recurso.proporcionRecuperada) || 0, 0, 1);
      const radio = 7 + proporcion * 7;
      const desplazamientoY = indice * 3;

      graficos.lineStyle?.(2, perfil.colorSecundario, reducido ? 0.35 : 0.68);
      graficos.strokeCircle?.(0, desplazamientoY, radio);
      graficos.fillStyle?.(perfil.colorPrincipal, reducido ? 0.18 : 0.32);
      graficos.fillCircle?.(0, desplazamientoY, radio * 0.62);

      if (!reducido) {
        const particulas = 3 + Math.round(proporcion * 4);
        for (let actual = 0; actual < particulas; actual += 1) {
          const angulo = -Math.PI + (Math.PI * actual) / Math.max(1, particulas - 1);
          const distancia = radio * (0.7 + (actual % 2) * 0.22);
          graficos.fillStyle?.(perfil.colorSecundario, 0.72);
          graficos.fillCircle?.(
            Math.cos(angulo) * distancia,
            desplazamientoY + Math.sin(angulo) * distancia,
            actual % 2 === 0 ? 1.4 : 1,
          );
        }
      }

      const texto = this.escena.add
        .text(
          0,
          -CONFIGURACION_EFECTOS_RECUPERACION_PHASER.texto.elevacionPx -
            indice * CONFIGURACION_EFECTOS_RECUPERACION_PHASER.texto.separacionPx,
          `+${formatearCantidad(recurso.cantidadAplicada)} ${perfil.etiqueta}`,
          {
            color: convertirHexCss(perfil.colorSecundario),
            fontFamily: "monospace",
            fontSize:
              CONFIGURACION_EFECTOS_RECUPERACION_PHASER.texto.tamanoFuente,
            fontStyle: "bold",
            stroke: "#23090d",
            strokeThickness: 3,
            align: "center",
          },
        )
        .setOrigin(0.5);
      contenedor.add(texto);
    });

    const configuracion =
      CONFIGURACION_EFECTOS_RECUPERACION_PHASER.recuperacion;
    contenedor.setAlpha?.(0);
    contenedor.setScale?.(configuracion.escalaInicial);
    this.compositor.agregarEfectoTemporal(contenedor);
    return contenedor;
  }

  crearHolyBless({ centro, nivelActual, reducido = false } = {}) {
    if (!esCentroValido(centro) || !Number.isInteger(nivelActual)) return null;

    const configuracion = CONFIGURACION_EFECTOS_RECUPERACION_PHASER.nivel;
    const contenedor = this.escena.add.container(centro.x, centro.y);
    const graficos = this.escena.add.graphics();

    const anchoAura = reducido ? 18 : configuracion.anchoAura;
    const altoAura = reducido ? 26 : configuracion.altoAura;

    graficos.fillStyle?.(configuracion.colorPrincipal, reducido ? 0.12 : 0.18);
    graficos.fillEllipse?.(0, -2, anchoAura, altoAura);
    graficos.fillStyle?.(configuracion.colorSecundario, reducido ? 0.14 : 0.22);
    graficos.fillEllipse?.(0, -4, anchoAura * 0.62, altoAura * 0.72);

    const destellos = reducido ? 3 : configuracion.cantidadDestellos;
    const baseY = altoAura * 0.22;
    for (let indice = 0; indice < destellos; indice += 1) {
      const t = destellos === 1 ? 0.5 : indice / (destellos - 1);
      const x = -anchoAura * 0.34 + anchoAura * 0.68 * t;
      const altura = altoAura * (0.34 + (indice % 2) * 0.18 + (indice === Math.floor(destellos / 2) ? 0.16 : 0));
      const inclinacion = (indice % 2 === 0 ? -1 : 1) * anchoAura * 0.06;
      graficos.lineStyle?.(reducido ? 1 : 1.6, configuracion.colorPrincipal, reducido ? 0.38 : 0.58);
      graficos.beginPath?.();
      graficos.moveTo?.(x, baseY);
      graficos.lineTo?.(x + inclinacion, baseY - altura * 0.52);
      graficos.lineTo?.(x, baseY - altura);
      graficos.strokePath?.();
      graficos.fillStyle?.(configuracion.colorSecundario, reducido ? 0.28 : 0.46);
      graficos.fillCircle?.(x, baseY - altura, reducido ? 0.9 : 1.2);
    }

    graficos.lineStyle?.(1, configuracion.colorSecundario, reducido ? 0.18 : 0.32);
    graficos.lineBetween?.(-anchoAura * 0.18, 8, -anchoAura * 0.1, -altoAura * 0.28);
    graficos.lineBetween?.(anchoAura * 0.18, 8, anchoAura * 0.1, -altoAura * 0.28);

    const texto = this.escena.add
      .text(0, -altoAura * 0.72, `NIVEL ${nivelActual}`, {
        color: "#fffbed",
        fontFamily: "monospace",
        fontSize: "13px",
        fontStyle: "bold",
        stroke: "#51452f",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    contenedor.add([graficos, texto]);
    contenedor.setAlpha?.(0);
    contenedor.setScale?.(configuracion.escalaInicial);
    this.compositor.agregarEfectoTemporal(contenedor);
    return contenedor;
  }
}

function formatearCantidad(cantidad) {
  const numero = Number(cantidad) || 0;
  return Number.isInteger(numero) ? `${numero}` : numero.toFixed(1);
}

function convertirHexCss(numero) {
  return `#${Math.max(0, numero).toString(16).padStart(6, "0")}`;
}
