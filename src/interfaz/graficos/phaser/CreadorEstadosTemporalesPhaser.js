import { traducir, traducirContenido } from "../../idiomas/ContextoIdioma.js";
// Construye representaciones de estados ya resueltos por el dominio. Los
// objetos persistentes se adjuntan al contenedor de la entidad; las entradas,
// rechazos y retiradas utilizan la capa transitoria del compositor.
export class CreadorEstadosTemporalesPhaser {
  constructor({ escena, compositor } = {}) {
    if (
      !escena?.add?.graphics ||
      !escena?.add?.container ||
      !escena?.add?.text ||
      !compositor
    ) {
      throw new Error(
        "El creador de estados temporales necesita escena y compositor.",
      );
    }
    this.escena = escena;
    this.compositor = compositor;
  }

  crearPersistente({ efecto } = {}) {
    const perfil = efecto?.perfilVisual;
    if (!perfil) return null;

    const contenedor = this.escena.add.container(0, 0);
    const grafico = this.escena.add.graphics();
    const indicador = this.escena.add
      .text(0, -12, "", {
        color: perfil.colorSecundario,
        fontFamily: "monospace",
        fontSize: "8px",
        fontStyle: "bold",
        stroke: "#11141a",
        strokeThickness: 2,
      })
      .setOrigin?.(0.5);

    contenedor.add([grafico, indicador]);
    contenedor.__estadoTemporal = { grafico, indicador };
    this.actualizarPersistente({ objeto: contenedor, efecto });
    contenedor.setAlpha?.(0.92);
    contenedor.setName?.(`estado-temporal:${efecto.id ?? efecto.catalogoEfectoId}`);
    return contenedor;
  }

  actualizarPersistente({ objeto, efecto } = {}) {
    const perfil = efecto?.perfilVisual;
    const referencias = objeto?.__estadoTemporal;
    if (!perfil || !referencias?.grafico) return false;

    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const tamano = Number(perfil.tamanoVisualPx) || 14;
    const nivel = resolverNivelVisual(efecto, perfil);

    referencias.grafico.clear?.();
    dibujarEstadoPersistente({
      grafico: referencias.grafico,
      forma: perfil.forma,
      principal,
      secundario,
      tamano,
      nivel,
    });

    const multiplicador = resolverMultiplicadorVisible(efecto, perfil);
    if (referencias.indicador) {
      referencias.indicador.setText?.(
        multiplicador > 1 ? `×${multiplicador}` : "",
      );
      referencias.indicador.setVisible?.(multiplicador > 1);
      referencias.indicador.setColor?.(perfil.colorSecundario);
      const posicion = resolverPosicionIndicador(perfil.canal);
      referencias.indicador.setPosition?.(posicion.x, posicion.y);
    }

    objeto.__efectoTemporal = efecto;
    objeto.setAlpha?.(Math.min(1, 0.84 + nivel * 0.05));
    return true;
  }

  crearPulsoActualizacion({ centro, efecto } = {}) {
    const perfil = efecto?.perfilVisual;
    if (!esCentroValido(centro) || !perfil) return null;
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const radio = Math.max(7, (Number(perfil.tamanoVisualPx) || 14) * 0.58);
    const nivel = resolverNivelVisual(efecto, perfil);

    grafico.lineStyle?.(2 + Math.min(1, nivel - 1), principal, 0.9);
    grafico.strokeCircle?.(0, 0, radio);
    grafico.lineStyle?.(1, secundario, 0.72);
    grafico.strokeCircle?.(0, 0, radio * 0.62);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearPulsoTick({ centro, efecto } = {}) {
    const perfil = efecto?.perfilVisual;
    if (!esCentroValido(centro) || !perfil || perfil.pulsoTick === "ninguno") {
      return null;
    }

    const contenedor = this.escena.add.container(centro.x, centro.y);
    const grafico = this.escena.add.graphics();
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const nivel = resolverNivelVisual(efecto, perfil);

    if (perfil.pulsoTick === "burbuja_estallido") {
      const cantidad = 2 + nivel;
      grafico.fillStyle?.(principal, 0.76);
      grafico.lineStyle?.(1, secundario, 0.9);
      for (let indice = 0; indice < cantidad; indice += 1) {
        const x = -8 + indice * (16 / Math.max(1, cantidad - 1));
        const y = 5 - (indice % 2) * 6;
        const radio = 2 + (indice % 2);
        grafico.fillCircle?.(x, y, radio);
        grafico.strokeCircle?.(x, y, radio + 1);
      }
    } else {
      grafico.fillStyle?.(principal, 0.88);
      grafico.beginPath?.();
      grafico.moveTo?.(-7, 8);
      grafico.lineTo?.(-2, -8 - nivel * 2);
      grafico.lineTo?.(1, -2);
      grafico.lineTo?.(5, -11 - nivel);
      grafico.lineTo?.(8, 8);
      grafico.closePath?.();
      grafico.fillPath?.();
      grafico.fillStyle?.(secundario, 0.9);
      grafico.fillCircle?.(1, 2, 2 + nivel * 0.3);
    }

    contenedor.add(grafico);
    contenedor.setScale?.(0.78);
    contenedor.setAlpha?.(0.96);
    this.compositor.agregarEfectoTemporal(contenedor);
    return contenedor;
  }

  crearEntrada({ centro, efecto } = {}) {
    const perfil = efecto?.perfilVisual;
    if (!esCentroValido(centro) || !perfil) return null;
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const radio = Math.max(7, (Number(perfil.tamanoVisualPx) || 14) * 0.62);

    grafico.lineStyle?.(2, principal, 0.9);
    grafico.strokeCircle?.(0, 0, radio);
    grafico.lineStyle?.(1, secundario, 0.75);
    grafico.strokeCircle?.(0, 0, radio * 0.58);
    grafico.setScale?.(0.62);
    grafico.setAlpha?.(0.92);
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearFeedbackEstado({ centro, efecto, operacion = "aplicado" } = {}) {
    const perfil = efecto?.perfilVisual;
    if (!esCentroValido(centro) || !perfil) return null;

    const textoEstado = resolverTextoEstado({
      perfil,
      efecto,
      operacion,
    });
    if (!textoEstado) return null;

    const texto = this.escena.add
      .text(centro.x, centro.y - 18, textoEstado, {
        color: perfil.colorSecundario,
        fontFamily: "monospace",
        fontSize: "11px",
        fontStyle: "bold",
        stroke: "#11141a",
        strokeThickness: 3,
        align: "center",
      })
      .setOrigin?.(0.5);

    texto.setAlpha?.(0.98);
    this.compositor.agregarEfectoTemporal(texto);
    return texto;
  }

  crearRetirada({ centro, efecto } = {}) {
    const perfil = efecto?.perfilVisual;
    if (!esCentroValido(centro) || !perfil) return null;
    const grafico = this.escena.add.graphics({ x: centro.x, y: centro.y });
    const principal = convertirColor(perfil.colorPrincipal);
    const secundario = convertirColor(perfil.colorSecundario);
    const radio = Math.max(6, (Number(perfil.tamanoVisualPx) || 14) * 0.54);

    grafico.lineStyle?.(2, principal, 0.72);
    grafico.strokeCircle?.(0, 0, radio);
    grafico.lineStyle?.(1, secundario, 0.52);
    for (let indice = 0; indice < 4; indice += 1) {
      const angulo = (Math.PI * 2 * indice) / 4;
      grafico.lineBetween?.(
        Math.cos(angulo) * radio * 0.45,
        Math.sin(angulo) * radio * 0.45,
        Math.cos(angulo) * radio * 1.18,
        Math.sin(angulo) * radio * 1.18,
      );
    }
    this.compositor.agregarEfectoTemporal(grafico);
    return grafico;
  }

  crearNoAplicado({ centro, feedback, motivo = null } = {}) {
    if (!esCentroValido(centro) || !feedback) return null;
    const contenedor = this.escena.add.container(centro.x, centro.y - 8);
    const grafico = this.escena.add.graphics();
    const principal = convertirColor(feedback.colorPrincipal);
    const secundario = convertirColor(feedback.colorSecundario);

    dibujarFeedbackNoAplicado({
      grafico,
      forma: feedback.forma,
      principal,
      secundario,
    });
    const texto = this.escena.add
      .text(0, -13, resolverTextoNoAplicado({ feedback, motivo }), {
        color: feedback.colorSecundario,
        fontFamily: "monospace",
        fontSize: "11px",
        fontStyle: "bold",
        stroke: "#11141a",
        strokeThickness: 3,
      })
      .setOrigin?.(0.5);
    contenedor.add([grafico, texto]);
    contenedor.setScale?.(0.9);
    contenedor.setAlpha?.(0.96);
    this.compositor.agregarEfectoTemporal(contenedor);
    return contenedor;
  }
}

function dibujarEstadoPersistente({
  grafico,
  forma,
  principal,
  secundario,
  tamano,
  nivel = 1,
}) {
  const radio = tamano / 2;

  if (forma === "fragmentos_pies") {
    grafico.lineStyle?.(2, principal, 0.86);
    grafico.lineBetween?.(-radio, radio * 0.66, -radio * 0.2, radio * 0.34);
    grafico.lineBetween?.(-radio * 0.2, radio * 0.34, radio * 0.3, radio * 0.7);
    grafico.lineBetween?.(radio * 0.3, radio * 0.7, radio, radio * 0.38);
    grafico.lineStyle?.(1, secundario, 0.78);
    grafico.lineBetween?.(-radio * 0.5, radio * 0.82, radio * 0.52, radio * 0.82);
    return;
  }

  if (forma === "arcos_laterales") {
    grafico.lineStyle?.(2, principal, 0.92);
    dibujarZigzag(grafico, -radio * 0.92, -radio * 0.28, -radio * 0.72, radio * 0.58);
    dibujarZigzag(grafico, radio * 0.78, -radio * 0.58, radio * 0.92, radio * 0.34);
    grafico.fillStyle?.(secundario, 0.9);
    grafico.fillCircle?.(-radio * 0.84, -radio * 0.48, 1.4);
    grafico.fillCircle?.(radio * 0.86, radio * 0.5, 1.2);
    return;
  }

  if (forma === "escarcha_inmovilizante") {
    grafico.lineStyle?.(2, principal, 0.9);
    grafico.beginPath?.();
    grafico.moveTo?.(-radio * 0.92, radio * 0.62);
    grafico.lineTo?.(-radio * 0.58, radio * 0.2);
    grafico.lineTo?.(-radio * 0.36, -radio * 0.62);
    grafico.strokePath?.();
    grafico.beginPath?.();
    grafico.moveTo?.(radio * 0.92, radio * 0.62);
    grafico.lineTo?.(radio * 0.54, radio * 0.16);
    grafico.lineTo?.(radio * 0.34, -radio * 0.56);
    grafico.strokePath?.();
    grafico.lineStyle?.(1, secundario, 0.78);
    grafico.lineBetween?.(-radio * 0.72, radio * 0.78, radio * 0.72, radio * 0.78);
    grafico.lineBetween?.(-radio * 0.5, radio * 0.36, -radio * 0.12, radio * 0.72);
    grafico.lineBetween?.(radio * 0.48, radio * 0.32, radio * 0.1, radio * 0.72);
    return;
  }

  if (forma === "anillos_paralisis") {
    grafico.lineStyle?.(2, principal, 0.9);
    grafico.strokeEllipse?.(0, -radio * 0.24, radio * 1.7, radio * 0.48);
    grafico.strokeEllipse?.(0, radio * 0.42, radio * 1.82, radio * 0.42);
    grafico.lineStyle?.(1, secundario, 0.84);
    grafico.lineBetween?.(-radio * 0.88, -radio * 0.08, -radio * 0.64, radio * 0.32);
    grafico.lineBetween?.(radio * 0.88, -radio * 0.08, radio * 0.64, radio * 0.32);
    return;
  }

  if (forma === "sello_silencio") {
    const y = -radio * 1.05;
    grafico.lineStyle?.(2, principal, 0.9);
    grafico.strokeCircle?.(0, y, radio * 0.38);
    grafico.lineStyle?.(1.6, secundario, 0.9);
    grafico.lineBetween?.(-radio * 0.24, y - radio * 0.24, radio * 0.24, y + radio * 0.24);
    grafico.lineBetween?.(-radio * 0.24, y + radio * 0.24, radio * 0.24, y - radio * 0.24);
    return;
  }

  if (forma === "carcasa_fragmentada") {
    grafico.lineStyle?.(2, principal, 0.9);
    grafico.beginPath?.();
    grafico.moveTo?.(-radio * 0.92, radio * 0.45);
    grafico.lineTo?.(-radio * 0.74, -radio * 0.72);
    grafico.lineTo?.(-radio * 0.25, -radio);
    grafico.strokePath?.();
    grafico.beginPath?.();
    grafico.moveTo?.(radio * 0.28, -radio);
    grafico.lineTo?.(radio * 0.78, -radio * 0.62);
    grafico.lineTo?.(radio * 0.9, radio * 0.5);
    grafico.strokePath?.();
    grafico.lineStyle?.(1, secundario, 0.72);
    grafico.lineBetween?.(-radio * 0.74, -radio * 0.72, -radio * 0.34, -radio * 0.2);
    grafico.lineBetween?.(radio * 0.78, -radio * 0.62, radio * 0.34, -radio * 0.12);
    return;
  }

  if (forma === "runas_superiores") {
    grafico.lineStyle?.(2, principal, 0.9);
    const y = -radio * 1.05;
    grafico.strokeCircle?.(0, y, radio * 0.36);
    grafico.lineBetween?.(-radio * 0.68, y, -radio * 0.42, y);
    grafico.lineBetween?.(radio * 0.42, y, radio * 0.68, y);
    grafico.fillStyle?.(secundario, 0.9);
    grafico.fillCircle?.(0, y, 1.5);
    return;
  }

  if (forma === "burbujas_viscosas") {
    const posiciones = [
      [-0.72, 0.34, 0.22],
      [-0.94, -0.16, 0.15],
      [-0.58, -0.62, 0.11],
      [-1.08, 0.58, 0.12],
      [-0.42, 0.02, 0.1],
      [-0.82, -0.88, 0.09],
    ];
    const cantidad = Math.min(posiciones.length, 2 + nivel * 2);
    grafico.fillStyle?.(principal, Math.min(0.92, 0.7 + nivel * 0.07));
    grafico.lineStyle?.(1, secundario, 0.8);
    for (const [x, y, tamanoBurbuja] of posiciones.slice(0, cantidad)) {
      grafico.fillCircle?.(radio * x, radio * y, radio * tamanoBurbuja);
      grafico.strokeCircle?.(radio * x, radio * y, radio * tamanoBurbuja);
    }
    return;
  }

  // Brasas y pequeñas lenguas de fuego en el lateral derecho.
  grafico.fillStyle?.(principal, 0.84);
  grafico.beginPath?.();
  grafico.moveTo?.(radio * 0.58, radio * 0.65);
  grafico.lineTo?.(radio * 0.92, -radio * 0.18);
  grafico.lineTo?.(radio * 0.66, -radio * 0.02);
  grafico.lineTo?.(radio * 0.78, -radio * 0.82);
  grafico.lineTo?.(radio * 0.36, -radio * 0.2);
  grafico.closePath?.();
  grafico.fillPath?.();
  grafico.fillStyle?.(secundario, 0.9);
  grafico.fillCircle?.(radio * 0.9, radio * 0.48, 1.4);
  grafico.fillCircle?.(radio * 0.58, -radio * 0.72, 1.1);
  if (nivel >= 2) {
    grafico.fillCircle?.(radio * 1.02, -radio * 0.12, 1.2);
    grafico.lineStyle?.(1.5, secundario, 0.78);
    grafico.lineBetween?.(radio * 0.92, radio * 0.34, radio * 1.08, -radio * 0.42);
  }
  if (nivel >= 3) {
    grafico.fillCircle?.(radio * 0.42, radio * 0.18, 1.3);
    grafico.lineBetween?.(radio * 0.46, radio * 0.42, radio * 0.32, -radio * 0.68);
  }
}

function dibujarZigzag(grafico, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  grafico.beginPath?.();
  grafico.moveTo?.(x1, y1);
  grafico.lineTo?.(x1 + dx * 0.36 - 2, y1 + dy * 0.32);
  grafico.lineTo?.(x1 + dx * 0.62 + 2, y1 + dy * 0.64);
  grafico.lineTo?.(x2, y2);
  grafico.strokePath?.();
}

function dibujarFeedbackNoAplicado({
  grafico,
  forma,
  principal,
  secundario,
}) {
  if (forma === "sello_cerrado") {
    grafico.lineStyle?.(2, principal, 0.9);
    grafico.strokeCircle?.(0, 0, 9);
    grafico.lineStyle?.(2, secundario, 0.82);
    grafico.lineBetween?.(-5, -5, 5, 5);
    grafico.lineBetween?.(5, -5, -5, 5);
    return;
  }
  if (forma === "pulso_tenue") {
    grafico.lineStyle?.(1.5, principal, 0.72);
    grafico.strokeCircle?.(0, 0, 8);
    grafico.lineStyle?.(1, secundario, 0.54);
    grafico.strokeCircle?.(0, 0, 4);
    return;
  }
  grafico.lineStyle?.(2, principal, 0.84);
  grafico.beginPath?.();
  grafico.moveTo?.(-10, 0);
  grafico.quadraticCurveTo?.(0, -8, 10, 0);
  grafico.quadraticCurveTo?.(0, 8, -10, 0);
  grafico.strokePath?.();
  grafico.fillStyle?.(secundario, 0.86);
  grafico.fillCircle?.(0, 0, 2);
}

function resolverNivelVisual(efecto, perfil) {
  const maximo = Number.isInteger(perfil?.densidadMaxima)
    ? Math.max(1, perfil.densidadMaxima)
    : 3;
  return Math.min(maximo, resolverMultiplicadorBase(efecto));
}

function resolverMultiplicadorVisible(efecto, perfil) {
  if (perfil?.mostrarMultiplicador !== true) return 1;
  return resolverNivelVisual(efecto, perfil);
}

function resolverMultiplicadorBase(efecto) {
  return Math.max(
    1,
    Number.isFinite(efecto?.intensidad) ? Math.round(efecto.intensidad) : 1,
    Number.isFinite(efecto?.cantidad) ? Math.round(efecto.cantidad) : 1,
  );
}

function resolverPosicionIndicador(canal) {
  if (canal === "lateral_izquierdo") return { x: -11, y: -10 };
  if (canal === "lateral_derecho") return { x: 11, y: -10 };
  if (canal === "superior") return { x: 10, y: -13 };
  if (canal === "pies") return { x: 10, y: 8 };
  return { x: 10, y: -10 };
}

function convertirColor(color) {
  if (typeof color === "number" && Number.isInteger(color)) return color;
  if (typeof color !== "string") return 0xffffff;
  const normalizado = color.trim().replace(/^#/, "");
  const convertido = Number.parseInt(normalizado, 16);
  return Number.isInteger(convertido) ? convertido : 0xffffff;
}

function esCentroValido(centro) {
  return Number.isFinite(centro?.x) && Number.isFinite(centro?.y);
}

function resolverTextoNoAplicado({ feedback, motivo }) {
  const claves = {
    resistencia: "resistido",
    inmunidad: "inmune",
    duplicado: "yaActivo",
  };
  const sufijo = claves[motivo];
  return sufijo
    ? traducir(`mensajes.feedback.${sufijo}`, { respaldo: feedback?.texto ?? "" })
    : feedback?.texto ?? "";
}

function resolverTextoEstado({ perfil, efecto, operacion }) {
  const respaldo = typeof perfil?.textoEstado === "string"
    ? perfil.textoEstado.trim()
    : "";
  const idEfecto = efecto?.catalogoEfectoId ?? efecto?.efectoId ?? efecto?.idDefinicion ?? null;
  const base = idEfecto
    ? traducirContenido("efectos", idEfecto, "textoEstado", respaldo)
    : respaldo;
  if (!base) return null;

  if (operacion === "renovado") {
    return `${base} · ${traducir("mensajes.feedback.renovado", { respaldo: "RENOVADO" })}`;
  }

  if (operacion === "intensificado" || operacion === "acumulado") {
    const multiplicador = Math.max(
      1,
      Number.isFinite(efecto?.intensidad) ? Math.round(efecto.intensidad) : 1,
      Number.isFinite(efecto?.cantidad) ? Math.round(efecto.cantidad) : 1,
    );
    return multiplicador > 1 ? `${base} ×${multiplicador}` : base;
  }

  return base;
}
