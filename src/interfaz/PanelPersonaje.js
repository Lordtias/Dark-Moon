import { ATRIBUTOS_COMBATIENTE_CANONICOS } from "../entidad/destructible/combatiente/ContratosAtributosCombatiente.js";
import { OPERACIONES_MODIFICADOR } from "../juego/modificadores/ContratosModificadoresCombatiente.js";
import { idiomaActivo, traducir, traducirContenido } from "./idiomas/ContextoIdioma.js";
import { ModalDetalleEstadistica } from "./personaje/ModalDetalleEstadistica.js";
import { obtenerEstadoPasivasJugador } from "./personaje/ConsultaPasivasJugador.js";
import { crearConsultaPresentacionPersonaje } from "./personaje/ConsultaPresentacionPersonaje.js";

const ATRIBUTOS = ATRIBUTOS_COMBATIENTE_CANONICOS;
const DETALLES = Object.freeze({
  "danio-medio": { etiqueta: "Daño medio", icono: "⚔" },
  dpt: { etiqueta: "DPT", icono: "✦" },
  "danio-arma": {
    etiqueta: "Arma",
    icono: "⚔",
    manoDanio: "principal",
  },
  "danio-secundaria": {
    etiqueta: "Secundaria",
    icono: "⚔",
    manoDanio: "secundaria",
  },
  precision: { etiqueta: "Precisión", icono: "◎", resolucion: "precision" },
  dispersion: {
    etiqueta: "Dispersión",
    icono: "⌁",
    resolucion: "dispersion",
    porcentaje: true,
  },
  "penetracion-armadura": {
    etiqueta: "Penetración de Armadura",
    icono: "➶",
    resolucion: "penetracionArmadura",
    porcentaje: true,
  },
  evasion: { etiqueta: "Evasión", icono: "↗", resolucion: "evasion" },
  armadura: { etiqueta: "Armadura", icono: "⬙", resolucion: "armadura" },
  critico: {
    etiqueta: "Crítico",
    icono: "✧",
    resolucion: "probabilidadCritico",
    porcentaje: true,
  },
  bloqueo: {
    etiqueta: "Bloqueo",
    icono: "◇",
    resolucion: "probabilidadBloqueo",
    porcentaje: true,
  },
  "mitigacion-bloqueo": {
    etiqueta: "Mitigación de bloqueo",
    icono: "⬘",
    resolucion: "mitigacionBloqueo",
    porcentaje: true,
  },
  "regen-vida": {
    etiqueta: "Regen. vida",
    icono: "+",
    resolucion: "regeneracionVida",
  },
  "regen-mana": {
    etiqueta: "Regen. maná",
    icono: "◈",
    resolucion: "regeneracionMana",
  },
  percepcion: { etiqueta: "Percepción", icono: "◉" },
  alcance: { etiqueta: "Alcance", icono: "↔" },
  "dano-fisico": { etiqueta: "Daño Físico", icono: "⚔", resolucion: "danoFisico", porcentaje: true },
  "dano-magico": { etiqueta: "Daño Mágico", icono: "✦", resolucion: "danoMagico", porcentaje: true },
  "dano-habilidad": { etiqueta: "Daño de Habilidad", icono: "✧", resolucion: "danoHabilidad", porcentaje: true },
  "dano-fuego": { etiqueta: "Daño de Fuego", icono: "♨", resolucion: "danoTipo:fuego", porcentaje: true },
  "dano-frio": { etiqueta: "Daño de Frío", icono: "❄", resolucion: "danoTipo:frio", porcentaje: true },
  "dano-rayo": { etiqueta: "Daño de Rayo", icono: "ϟ", resolucion: "danoTipo:rayo", porcentaje: true },
  "dano-veneno": { etiqueta: "Daño de Veneno", icono: "◒", resolucion: "danoTipo:veneno", porcentaje: true },
  "potencia-efectos": { etiqueta: "Potencia de Efectos", icono: "✺", resolucion: "potenciaEfectos", porcentaje: true },
  "potencia-quemadura": { etiqueta: "Potencia de Quemadura", icono: "♨", resolucion: "potenciaEfecto:quemadura", porcentaje: true },
  "potencia-envenenamiento": { etiqueta: "Potencia de Envenenamiento", icono: "◒", resolucion: "potenciaEfecto:envenenamiento", porcentaje: true },
  "potencia-ralentizacion": { etiqueta: "Potencia de Ralentización", icono: "❄", resolucion: "potenciaEfecto:ralentizacion", porcentaje: true },
  "potencia-electrizacion": { etiqueta: "Potencia de Electrización", icono: "ϟ", resolucion: "potenciaEfecto:electrizacion", porcentaje: true },
  "res-fuego": {
    etiqueta: "Fuego",
    icono: "♨",
    resolucion: "resistencia:fuego",
    porcentaje: true,
  },
  "res-frio": {
    etiqueta: "Frío",
    icono: "❄",
    resolucion: "resistencia:frio",
    porcentaje: true,
  },
  "res-rayo": {
    etiqueta: "Rayo",
    icono: "ϟ",
    resolucion: "resistencia:rayo",
    porcentaje: true,
  },
  "res-veneno": {
    etiqueta: "Veneno",
    icono: "◒",
    resolucion: "resistencia:veneno",
    porcentaje: true,
  },
  "res-congelamiento": {
    etiqueta: "Congelamiento",
    icono: "❄",
    resolucion: "resistenciaEfecto:congelamiento",
    porcentaje: true,
  },
  "res-aturdimiento": {
    etiqueta: "Aturdimiento",
    icono: "✹",
    resolucion: "resistenciaEfecto:aturdimiento",
    porcentaje: true,
  },
  "res-envenenamiento": {
    etiqueta: "Envenenamiento",
    icono: "◒",
    resolucion: "resistenciaEfecto:envenenamiento",
    porcentaje: true,
  },
  "res-quemadura": {
    etiqueta: "Quemadura",
    icono: "♨",
    resolucion: "resistenciaEfecto:quemadura",
    porcentaje: true,
  },
  "res-mental": {
    etiqueta: "Resistencia Mental",
    icono: "◌",
    resolucion: "resistenciaMental",
    porcentaje: true,
  },
  "ajuste-comercial": {
    etiqueta: "Ajuste comercial",
    icono: "¤",
    resolucion: "ajusteComercial",
    porcentaje: true,
    escala: 100,
  },
  "hallazgo-magico": {
    etiqueta: "Hallazgo mágico",
    icono: "✦",
    resolucion: "hallazgoMagico",
    porcentaje: true,
    limiteDominio: 100,
  },
});

const CAMPOS_RESISTENCIA_DANIO = new Set([
  "res-fuego",
  "res-frio",
  "res-rayo",
  "res-veneno",
]);
const CAMPOS_RESISTENCIA_EFECTO = new Set([
  "res-congelamiento",
  "res-aturdimiento",
  "res-envenenamiento",
  "res-quemadura",
  "res-mental",
]);
const CAMPOS_RESISTENCIA = new Set([
  ...CAMPOS_RESISTENCIA_DANIO,
  ...CAMPOS_RESISTENCIA_EFECTO,
]);

export class PanelPersonaje {
  constructor({
    contenedor,
    plantilla,
    configuracionHabilidades = null,
    configuracionEjecucionHabilidades = null,
  } = {}) {
    if (!contenedor) throw new Error("PanelPersonaje necesita un contenedor.");
    if (!(plantilla instanceof HTMLTemplateElement))
      throw new Error("PanelPersonaje necesita una plantilla HTML válida.");
    this.contenedor = contenedor;
    this.plantilla = plantilla;
    this.configuracionHabilidades = configuracionHabilidades;
    this.configuracionEjecucionHabilidades = configuracionEjecucionHabilidades;
    this.playerActual = null;
    this.juegoActual = null;
    this.indiceEfectos = crearIndiceEfectos(configuracionEjecucionHabilidades);
    this.modalDetalle = new ModalDetalleEstadistica();
    this.manejarClick = this.manejarClick.bind(this);
    this.manejarTecla = this.manejarTecla.bind(this);
    this.crearContenido();
    contenedor.addEventListener("click", this.manejarClick);
    contenedor.addEventListener("keydown", this.manejarTecla);
  }
  crearContenido() {
    this.contenedor.replaceChildren(this.plantilla.content.cloneNode(true));
    const secciones = [
      ...this.contenedor.querySelectorAll(":scope > .seccion-panel"),
    ];
    secciones
      .find((s) => s.querySelector(".lista-atributos"))
      ?.setAttribute("data-seccion-personaje", "atributos");
    secciones
      .find((s) => s.querySelector('[data-personaje="precision"]'))
      ?.setAttribute("data-seccion-personaje", "combate");
    this.crearCombateAvanzado();
    this.crearSuerte();
    this.crearDanio();
    this.crearAfinidadesDanio();
    this.crearPotenciasEfectos();
    this.crearPasivas();
    this.crearEfectos();
    this.configurarDesgloses();
  }
  crearDato(etiqueta, campo, valor = "—") {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "dato-personaje dato-personaje--desglosable";
    b.dataset.desglose = campo;
    const s = document.createElement("span");
    s.textContent = etiqueta;
    const st = document.createElement("strong");
    st.dataset.personaje = campo;
    st.textContent = valor;
    const i = document.createElement("i");
    i.className = "dato-personaje__detalle";
    i.textContent = "i";
    i.setAttribute("aria-hidden", "true");
    b.append(s, st, i);
    return b;
  }
  crearCombateAvanzado() {
    const r = this.contenedor.querySelector(
      '[data-seccion-personaje="combate"] .resumen-personaje',
    );
    if (!r) return;
    r.append(
      this.crearDato(
        traducir("interfaz.personaje.dispersion", { respaldo: "Dispersión" }),
        "dispersion",
        "0%",
      ),
      this.crearDato(
        traducir("interfaz.personaje.penetracionArmadura", {
          respaldo: "Penetración de Armadura",
        }),
        "penetracion-armadura",
        "0%",
      ),
    );
  }
  crearSuerte() {
    const r = this.contenedor.querySelector(
      '[data-seccion-personaje="combate"] .resumen-personaje',
    );
    if (!r) return;
    r.append(
      this.crearDato(
        traducir("interfaz.personaje.ajusteComercial", {
          respaldo: "Ajuste comercial",
        }),
        "ajuste-comercial",
        "+0%",
      ),
      this.crearDato(
        traducir("interfaz.personaje.hallazgoMagico", {
          respaldo: "Hallazgo mágico",
        }),
        "hallazgo-magico",
        "+0%",
      ),
    );
  }
  crearSeccionEstadisticas({ id, titulo, datos }) {
    const s = document.createElement("section");
    s.className = `seccion-panel seccion-${id}-personaje`;
    s.dataset.seccionPersonaje = id;
    const h = document.createElement("h3");
    h.textContent = titulo;
    const r = document.createElement("div");
    r.className = "resumen-personaje";
    for (const dato of datos) r.append(this.crearDato(dato.etiqueta, dato.campo, "+0%"));
    s.append(h, r);
    this.contenedor
      .querySelector('[data-seccion-personaje="resistencias"]')
      ?.before(s);
  }
  crearGrupoEstadisticas({ titulo, datos }) {
    const grupo = document.createElement("div");
    grupo.className = "grupo-estadisticas-personaje";
    const encabezado = document.createElement("h4");
    encabezado.textContent = titulo;
    const resumen = document.createElement("div");
    resumen.className = "resumen-personaje";
    for (const dato of datos)
      resumen.append(this.crearDato(dato.etiqueta, dato.campo, dato.valor ?? "+0%"));
    grupo.append(encabezado, resumen);
    return grupo;
  }
  crearDanio() {
    const seccion = document.createElement("section");
    seccion.className = "seccion-panel seccion-dano-personaje";
    seccion.dataset.seccionPersonaje = "dano";
    const titulo = document.createElement("h3");
    titulo.textContent = traducir("interfaz.personaje.dano", { respaldo: "Daño" });
    seccion.append(
      titulo,
      this.crearGrupoEstadisticas({
        titulo: traducir("interfaz.personaje.danoFinal", {
          respaldo: "Daño final",
        }),
        datos: [
          {
            etiqueta: traducir("interfaz.personaje.danioMedio", {
              respaldo: "Daño medio",
            }),
            campo: "danio-medio",
            valor: "0",
          },
          { etiqueta: "DPT", campo: "dpt", valor: "0" },
        ],
      }),
      this.crearGrupoEstadisticas({
        titulo: traducir("interfaz.personaje.danoArmas", {
          respaldo: "Daño de armas",
        }),
        datos: [
          {
            etiqueta: traducir("interfaz.personaje.arma", {
              respaldo: "Arma",
            }),
            campo: "danio-arma",
            valor: "--.-",
          },
          {
            etiqueta: traducir("interfaz.personaje.secundaria", {
              respaldo: "Secundaria",
            }),
            campo: "danio-secundaria",
            valor: "--.-",
          },
        ],
      }),
      this.crearGrupoEstadisticas({
        titulo: traducir("interfaz.personaje.danosGlobales", {
          respaldo: "Daños globales",
        }),
        datos: [
          {
            etiqueta: traducir("interfaz.personaje.danoFisico", {
              respaldo: "Daño Físico",
            }),
            campo: "dano-fisico",
          },
          {
            etiqueta: traducir("interfaz.personaje.danoMagico", {
              respaldo: "Daño Mágico",
            }),
            campo: "dano-magico",
          },
          {
            etiqueta: traducir("interfaz.personaje.danoHabilidad", {
              respaldo: "Daño de Habilidad",
            }),
            campo: "dano-habilidad",
          },
        ],
      }),
    );
    this.contenedor
      .querySelector('[data-seccion-personaje="resistencias"]')
      ?.before(seccion);
  }
  crearAfinidadesDanio() {
    this.crearSeccionEstadisticas({
      id: "afinidades-dano",
      titulo: traducir("interfaz.personaje.afinidadesDanio", { respaldo: "Afinidades de daño" }),
      datos: [
        { etiqueta: traducir("interfaz.personaje.danoFuego", { respaldo: "Fuego" }), campo: "dano-fuego" },
        { etiqueta: traducir("interfaz.personaje.danoFrio", { respaldo: "Frío" }), campo: "dano-frio" },
        { etiqueta: traducir("interfaz.personaje.danoRayo", { respaldo: "Rayo" }), campo: "dano-rayo" },
        { etiqueta: traducir("interfaz.personaje.danoVeneno", { respaldo: "Veneno" }), campo: "dano-veneno" },
      ],
    });
  }
  crearPotenciasEfectos() {
    this.crearSeccionEstadisticas({
      id: "potencias-efectos",
      titulo: traducir("interfaz.personaje.potenciasEfectos", { respaldo: "Potencia de efectos" }),
      datos: [
        { etiqueta: traducir("interfaz.personaje.potenciaEfectos", { respaldo: "General" }), campo: "potencia-efectos" },
        { etiqueta: traducir("interfaz.personaje.potenciaQuemadura", { respaldo: "Quemadura" }), campo: "potencia-quemadura" },
        { etiqueta: traducir("interfaz.personaje.potenciaEnvenenamiento", { respaldo: "Envenenamiento" }), campo: "potencia-envenenamiento" },
        { etiqueta: traducir("interfaz.personaje.potenciaRalentizacion", { respaldo: "Ralentización" }), campo: "potencia-ralentizacion" },
        { etiqueta: traducir("interfaz.personaje.potenciaElectrizacion", { respaldo: "Electrización" }), campo: "potencia-electrizacion" },
      ],
    });
  }
  crearPasivas() {
    const s = document.createElement("section");
    s.className = "seccion-panel seccion-pasivas-personaje";
    s.dataset.seccionPersonaje = "pasivas";
    const h = document.createElement("h3");
    h.textContent = traducir("interfaz.personaje.pasivasAprendidas", {
      respaldo: "Pasivas aprendidas",
    });
    this.listaPasivas = document.createElement("div");
    this.listaPasivas.className = "lista-pasivas-personaje";
    s.append(h, this.listaPasivas);
    this.contenedor.append(s);
  }
  crearEfectos() {
    const s = document.createElement("section");
    s.className = "seccion-panel seccion-efectos-personaje";
    s.dataset.seccionPersonaje = "efectos";
    const h = document.createElement("h3");
    h.textContent = traducir("interfaz.personaje.efectosActivos", {
      respaldo: "Efectos activos",
    });
    this.listaEfectos = document.createElement("div");
    this.listaEfectos.className = "lista-efectos-personaje";
    s.append(h, this.listaEfectos);
    this.contenedor.append(s);
  }
  configurarDesgloses() {
    for (const campo of Object.keys(DETALLES)) {
      const f = this.contenedor
        .querySelector(`[data-personaje="${campo}"]`)
        ?.closest(".dato-personaje");
      if (!f || f.matches("button")) continue;
      f.dataset.desglose = campo;
      f.classList.add("dato-personaje--desglosable");
      f.tabIndex = 0;
      const i = document.createElement("i");
      i.className = "dato-personaje__detalle";
      i.textContent = "i";
      i.setAttribute("aria-hidden", "true");
      f.append(i);
    }
    for (const f of this.contenedor.querySelectorAll(".fila-atributo")) {
      f.dataset.desglose = `atributo:${f.dataset.atributo}`;
      f.classList.add("fila-atributo--desglosable");
    }
  }
  obtener(sel) {
    const e = this.contenedor.querySelector(sel);
    if (!e) throw new Error(`No se encontró "${sel}" en PanelPersonaje.`);
    return e;
  }
  manejarClick(event) {
    const b = event.target.closest('[data-accion="sumar-atributo"]');
    if (b && this.playerActual) {
      event.stopPropagation();
      const r = this.playerActual.asignarPuntoAtributo(b.dataset.atributo);
      if (r.exito)
        this.actualizar(this.playerActual, { juego: this.juegoActual });
      b.blur();
      return;
    }
    const d = event.target.closest("[data-desglose]");
    if (d && this.contenedor.contains(d) && this.playerActual)
      this.abrirDetalle(d.dataset.desglose);
  }
  manejarTecla(event) {
    if (
      !["Enter", " "].includes(event.key) ||
      event.target.closest('[data-accion="sumar-atributo"]')
    )
      return;
    const d = event.target.closest("[data-desglose]");
    if (d && this.playerActual) {
      event.preventDefault();
      this.abrirDetalle(d.dataset.desglose);
    }
  }
  actualizar(player, { juego = this.juegoActual, consulta = null } = {}) {
    this.playerActual = player;
    this.juegoActual = juego ?? null;
    this.consultaActual = consulta ?? crearConsultaPresentacionPersonaje({
      jugador: player,
      juego: this.juegoActual,
      configuracionHabilidades: this.configuracionHabilidades,
    });
    const presentacion = this.consultaActual;
    const e = presentacion.valores;
    this.obtener('[data-personaje="nombre"]').textContent = presentacion.identidad.nombre;
    this.obtener('[data-personaje="clase"]').textContent = traducirContenido(
      "profesiones",
      player.idProfesion,
      "nombre",
      presentacion.identidad.clasePersonaje,
    );
    this.obtener('[data-personaje="nivel"]').textContent = traducir(
      "interfaz.personaje.nivel",
      {
        parametros: { nivel: presentacion.identidad.nivel },
        respaldo: `Nivel ${presentacion.identidad.nivel}`,
      },
    );
    this.actualizarExperiencia(presentacion.progreso);
    this.obtener('[data-personaje="puntos-atributo"]').textContent =
      presentacion.progreso.puntosAtributoDisponibles;
    this.obtener('[data-personaje="danio-medio"]').textContent =
      formatearValorContrato(
        e["danio-medio"],
        presentacion.detalles["danio-medio"],
        { sufijo: false },
      );
    this.obtener('[data-personaje="dpt"]').textContent =
      formatearValorContrato(e.dpt, presentacion.detalles.dpt, { sufijo: false });
    this.actualizarDanioPorRanura(presentacion);
    this.actualizarBarra("vida", presentacion.recursos.vidaActual, presentacion.recursos.vidaMaxima);
    this.actualizarBarra("mana", presentacion.recursos.manaActual, presentacion.recursos.manaMaximo);
    for (const a of ATRIBUTOS)
      this.obtener(
        `.fila-atributo[data-atributo="${a}"] [data-campo="valor"]`,
      ).textContent = presentacion.atributos[a];
    this.actualizarEstadisticas(presentacion);
    for (const b of this.contenedor.querySelectorAll(
      '[data-accion="sumar-atributo"]',
    ))
      b.disabled = presentacion.progreso.puntosAtributoDisponibles <= 0;
    this.actualizarPasivas(presentacion);
    this.actualizarEfectos(presentacion);
  }
  actualizarDanioPorRanura(presentacion) {
    this.actualizarDatoDanioPorMano("danio-arma", presentacion.valores["danio-arma"]);

    const secundaria = this.obtener('[data-personaje="danio-secundaria"]')
      .closest(".dato-personaje");
    const usaDosManos = presentacion.usaDosManos;
    secundaria.hidden = usaDosManos;
    this.actualizarDatoDanioPorMano(
      "danio-secundaria",
      usaDosManos
        ? null
        : presentacion.valores["danio-secundaria"],
    );
  }
  actualizarDatoDanioPorMano(campo, rango) {
    const valor = this.obtener(`[data-personaje="${campo}"]`);
    const fila = valor.closest(".dato-personaje");
    const tieneDanio = Boolean(
      rango && Number.isFinite(rango.minimo) && Number.isFinite(rango.maximo),
    );
    valor.textContent = tieneDanio
      ? formatearValorContrato(
          rango,
          this.consultaActual?.detalles?.[campo],
          { sufijo: false },
        )
      : "--";
    fila.disabled = !tieneDanio;
    fila.classList.toggle("dato-personaje--sin-danio", !tieneDanio);
    fila.setAttribute("aria-disabled", String(!tieneDanio));
    if (tieneDanio) fila.dataset.desglose = campo;
    else fila.removeAttribute("data-desglose");
  }
  asegurarMental() {
    if (this.contenedor.querySelector('[data-personaje="res-mental"]')) return;
    this.obtener('[data-personaje="res-quemadura"]')
      .closest(".resumen-personaje")
      .append(
        this.crearDato(
          traducir("interfaz.personaje.resistenciaMental", {
            respaldo: "Resistencia Mental",
          }),
          "res-mental",
          "0%",
        ),
      );
  }
  actualizarEstadisticas(presentacion) {
    this.asegurarMental();
    const e = presentacion.valores;
    for (const campo of Object.keys(DETALLES)) {
      if (["danio-medio", "danio-arma", "danio-secundaria", "dpt"].includes(campo)) continue;
      const elemento = this.contenedor.querySelector(`[data-personaje="${campo}"]`);
      if (!elemento) continue;
      const detalle = presentacion.detalles[campo];
      elemento.textContent = formatearValorContrato(e[campo], detalle, {
        sufijo: false,
      });
      const fila = elemento.closest(".dato-personaje");
      fila?.classList.toggle(
        "dato-personaje--porcentaje-negativo",
        detalle?.unidad === "porcentaje" && Number(e[campo]) < 0,
      );
    }
  }
  actualizarPasivas(presentacion) {
    const lista = presentacion.pasivas;
    this.listaPasivas.replaceChildren();
    if (!lista.length) {
      this.listaPasivas.append(
        vacio(
          traducir("interfaz.personaje.sinPasivas", {
            respaldo: "Sin pasivas aprendidas.",
          }),
        ),
      );
      return;
    }
    let m = null;
    for (const p of lista) {
      if (p.maestria !== m) {
        m = p.maestria;
        const h = document.createElement("h4");
        h.className = "lista-pasivas-personaje__maestria";
        h.textContent = traducirContenido("maestrias", m, "nombre", ident(m));
        this.listaPasivas.append(h);
      }
      const a = document.createElement("article");
      a.className = `pasiva-personaje pasiva-personaje--${p.estado}`;
      const rutaIcono =
        this.configuracionEjecucionHabilidades?.habilidades?.[p.idHabilidad]
          ?.icono ?? p.icono;
      const img = icono(rutaIcono, p.nombre, "pasiva-personaje__icono");
      const c = document.createElement("div");
      c.className = "pasiva-personaje__cuerpo";
      const n = document.createElement("strong");
      n.textContent = traducirContenido(
        "habilidades",
        p.idHabilidad,
        "nombre",
        p.nombre,
      );
      const meta = document.createElement("span");
      const grado = traducir("interfaz.personaje.gradoPasiva", {
        parametros: { grado: p.grado },
        respaldo: `Grado ${p.grado}`,
      });
      const motivo = motivoPasiva(p);
      meta.textContent = motivo ? `${grado} · ${motivo}` : grado;
      c.append(n, meta);
      const estado = document.createElement("span");
      estado.className = "pasiva-personaje__estado";
      estado.textContent = traducir(
        `interfaz.personaje.pasivaEstado.${p.estado}`,
        { respaldo: p.estado },
      );
      a.append(img, c, estado);
      this.listaPasivas.append(a);
    }
  }
  actualizarEfectos(presentacion) {
    this.listaEfectos.replaceChildren();
    const lista = presentacion.efectos;
    if (!lista.length) {
      this.listaEfectos.append(
        vacio(
          traducir("interfaz.personaje.sinEfectos", {
            respaldo: "Sin efectos temporales activos.",
          }),
        ),
      );
      return;
    }
    for (const e of lista) {
      const hab = this.indiceEfectos.get(e.efectoId);
      const a = document.createElement("article");
      a.className = `efecto-personaje efecto-personaje--${e.beneficioso ? "beneficioso" : "perjudicial"}`;
      const im = icono(hab?.icono, e.nombreEfecto, "efecto-personaje__icono");
      const c = document.createElement("div");
      c.className = "efecto-personaje__cuerpo";
      const n = document.createElement("strong");
      n.textContent = traducirContenido(
        "efectos",
        e.efectoId,
        "nombre",
        e.nombreEfecto,
      );
      const tipo = document.createElement("span");
      tipo.textContent = tipoEfecto(e);
      const d = document.createElement("small");
      d.textContent = descripcionEfecto(e);
      c.append(n, tipo, d);
      const tm = document.createElement("span");
      tm.className = "efecto-personaje__tiempo";
      const turns = e.turnosRestantes;
      tm.textContent =
        turns === null
          ? "—"
          : traducir("interfaz.personaje.turnosRestantesCorto", {
              parametros: { turnos: turns },
              respaldo: `${turns} t`,
            });
      a.append(im, c, tm);
      this.listaEfectos.append(a);
    }
  }
  abrirDetalle(clave) {
    const d = this.crearDetalleDesdeConsulta(clave);
    if (d) this.modalDetalle.abrir(d);
  }
  crearDetalleDesdeConsulta(clave) {
    const detalle = this.consultaActual?.detalles?.[clave];
    if (!detalle) return null;
    const metadatos = clave.startsWith("atributo:")
      ? { etiqueta: nombreAtributo(clave.slice(9)), icono: "◆" }
      : DETALLES[clave] ?? { etiqueta: ident(clave), icono: "◇" };
    const valorFinal = formatearValorContrato(detalle.valorFinal, detalle);
    const porcentajeNegativo = DETALLES[clave]?.porcentaje === true && Number(detalle.valorFinal) < 0;
    return {
      titulo: metadatos.etiqueta,
      icono: metadatos.icono,
      valorFinal,
      descripcion: porcentajeNegativo && CAMPOS_RESISTENCIA.has(clave)
        ? descripcionVulnerabilidad(clave)
        : descripcionDetalle(clave),
      secciones: detalle.secciones.map((seccion) => ({
        etiqueta: seccion.etiqueta,
        filas: seccion.filas.map((fila) => formatearFilaContrato(fila)),
      })),
      nota: traducir("interfaz.personaje.desgloseCanonicoNota", {
        respaldo: "El detalle y su orden provienen de la consulta canónica; la interfaz solo los representa.",
      }),
    };
  }
  actualizarExperiencia(p) {
    this.obtener('[data-personaje="experiencia-texto"]').textContent =
      `${p.experiencia} / ${p.experienciaNecesaria} ${traducir("interfaz.personaje.xp", { respaldo: "PX" })}`;
    this.obtener('[data-personaje="experiencia-barra"]').style.width =
      `${Math.max(0, Math.min(100, p.porcentajeExperiencia))}%`;
  }
  actualizarBarra(r, a, m) {
    this.obtener(`[data-personaje="${r}-texto"]`).textContent =
      `${Math.floor(a)} / ${Math.floor(m)}`;
    this.obtener(`[data-personaje="${r}-barra"]`).style.width =
      `${Math.max(0, Math.min(100, m > 0 ? (a / m) * 100 : 0))}%`;
  }
  destruir() {
    this.contenedor.removeEventListener("click", this.manejarClick);
    this.contenedor.removeEventListener("keydown", this.manejarTecla);
    this.modalDetalle?.destruir();
  }
}
function formatearFilaContrato(fila = {}) {
  const tipo = fila.tipo ?? "informacion";
  return {
    tipo,
    icono: {
      base: "◇",
      atributo: "◆",
      bonificacion: "+",
      penalizacion: "−",
      multiplicador: "%",
      limite: "⌁",
      informacion: "•",
    }[tipo] ?? "•",
    etiqueta: fila.etiqueta ?? "—",
    valor: formatearValorContrato(fila.valor, fila, {
      mostrarSigno: ["atributo", "bonificacion", "penalizacion", "multiplicador"].includes(tipo),
    }),
  };
}

function formatearValorContrato(
  valor,
  descriptor = {},
  { mostrarSigno = false, sufijo = true } = {},
) {
  const unidad = descriptor?.unidad ?? "puntos";
  if (unidad === "rango_danio") {
    return valor && typeof valor === "object"
      ? formatearRango(valor.minimo, valor.maximo)
      : "—";
  }
  if (unidad === "texto") {
    return typeof valor === "string" ? valor : "—";
  }
  if (unidad === "velocidad_ataque_con_costo") {
    const velocidad = Number(valor?.velocidadAtaque);
    const costo = Number(valor?.costoBase);
    if (!Number.isFinite(velocidad) || !Number.isFinite(costo)) return "—";
    return `${formato(velocidad, 2)} ataques/s (${formato(costo)})`;
  }
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "—";
  const signo = mostrarSigno && numero >= 0 ? "+" : "";
  if (unidad === "porcentaje" || unidad === "porcentaje_factor") {
    return `${signo}${formato(numero)}%`;
  }
  if (unidad === "ataques_por_segundo") {
    return `${formato(numero, 2)} ataques/s`;
  }
  if (unidad === "dpt") {
    return `${signo}${formato(numero)}${sufijo ? " DPT" : ""}`;
  }
  return `${signo}${formato(numero)}`;
}
function crearIndiceEfectos(c) {
  const m = new Map();
  for (const [id, h] of Object.entries(c?.habilidades ?? {}))
    for (const g of Object.values(h?.ejecucion?.grados ?? {}))
      for (const e of g?.efectos ?? [])
        if (!m.has(e.efectoId)) m.set(e.efectoId, { id, ...h });
  return m;
}
function icono(r, n, cl) {
  const s = document.createElement("span");
  s.className = cl;
  if (r) {
    const i = document.createElement("img");
    i.src = r;
    i.alt = "";
    s.append(i);
  } else
    s.textContent = String(n ?? "?")
      .charAt(0)
      .toUpperCase();
  return s;
}
function vacio(t) {
  const p = document.createElement("p");
  p.className = "mensaje-vacio mensaje-vacio--compacto";
  p.textContent = t;
  return p;
}
function motivoPasiva(p) {
  if (p.estado === "condicional")
    return traducir("interfaz.personaje.pasivaCondicional", {
      respaldo: "Aplica al contexto de la habilidad correspondiente",
    });
  if (p.estado !== "inactiva") return "";
  const k = p.condicionesNoCumplidas?.[0]?.clave ?? "generico";
  return traducir(`interfaz.personaje.pasivaMotivo.${k}`, {
    respaldo: "Condición actual no cumplida",
  });
}
function tipoEfecto(e) {
  const q = new Set(e?.etiquetas ?? []);
  if (q.has("aura") || e.emision)
    return traducir("interfaz.personaje.efectoAura", { respaldo: "Aura" });
  if (q.has("maldicion") || e.resistenciaId === "mental")
    return traducir("interfaz.personaje.efectoMaldicion", {
      respaldo: "Maldición",
    });
  return traducir(
    e.beneficioso
      ? "interfaz.personaje.efectoBeneficioso"
      : "interfaz.personaje.efectoPerjudicial",
    { respaldo: e.beneficioso ? "Beneficioso" : "Perjudicial" },
  );
}
function descripcionEfecto(e) {
  const ms = Array.isArray(e.modificadores) ? e.modificadores : [];
  if (ms.length)
    return ms.map((m) => `${ident(m.objetivo)} ${formatearMod(m)}`).join(" · ");
  if (e.tipo === "bloqueo_habilidades")
    return traducir("interfaz.personaje.efectoBloqueaHabilidades", {
      respaldo: "Bloquea habilidades activas",
    });
  if (e.tipo === "bloqueo_total")
    return traducir("interfaz.personaje.efectoBloqueoTotal", {
      respaldo: "Impide actuar temporalmente",
    });
  if (e.tipo === "danio_periodico")
    return traducir("interfaz.personaje.efectoDanioPeriodico", {
      respaldo: "Daño periódico",
    });
  return e.nombreEfecto ?? "Efecto temporal";
}
function formatearMod(m, escala = 1, forzarPorcentaje = false) {
  const original = Number(m?.valor) || 0,
    v = original * escala,
    s = v > 0 ? "+" : "";
  if (
    [
      OPERACIONES_MODIFICADOR.PORCENTAJE_BASE,
      OPERACIONES_MODIFICADOR.PORCENTAJE_TOTAL,
      OPERACIONES_MODIFICADOR.PORCENTAJE_MULTIPLICATIVO,
      OPERACIONES_MODIFICADOR.PORCENTAJE_INVERSO,
    ].includes(m?.operacion)
  )
    return `${original > 0 ? "+" : ""}${original}%`;
  if (
    [
      OPERACIONES_MODIFICADOR.MULTIPLICAR,
      OPERACIONES_MODIFICADOR.MULTIPLICAR_REDONDEAR,
    ].includes(m?.operacion)
  )
    return `${original >= 1 ? "+" : ""}${formato((original - 1) * 100)}%`;
  if (m?.operacion === OPERACIONES_MODIFICADOR.LIMITAR_MAXIMO)
    return forzarPorcentaje ? `máx. ${formato(v)}%` : `máx. ${formato(v)}`;
  return forzarPorcentaje ? `${s}${formato(v)}%` : `${s}${formato(v)}`;
}
function formatearRango(minimo, maximo) {
  if (!Number.isFinite(minimo) || !Number.isFinite(maximo)) return "—";
  return minimo === maximo
    ? formato(minimo)
    : `${formato(minimo)}–${formato(maximo)}`;
}
function descripcionVulnerabilidad(clave) {
  if (CAMPOS_RESISTENCIA_DANIO.has(clave))
    return traducir("interfaz.personaje.descripcionVulnerabilidadDanio", {
      respaldo:
        "Vulnerabilidad: este valor negativo aumenta el daño recibido de este tipo.",
    });
  return traducir("interfaz.personaje.descripcionVulnerabilidadEfecto", {
    respaldo:
      "Vulnerabilidad: este valor negativo aumenta la probabilidad de recibir este efecto o Maldición.",
  });
}
function descripcionDetalle(clave) {
  const fallback = {
    "atributo:fuerza":
      "Atributo físico principal. Modifica el daño físico de las armas cuya estadística ofensiva sea Fuerza.",
    "atributo:destreza":
      "Atributo de precisión y agilidad. Aumenta Precisión y Evasión, y puede gobernar el daño físico de armas ágiles.",
    "atributo:constitucion":
      "Atributo de resistencia corporal y presencia. Aporta Vida máxima, regeneración de Vida, Potencia de Aura y defensas frente a Veneno y estados perjudiciales.",
    "atributo:inteligencia":
      "Atributo de poder mágico. Aporta Maná máximo, daño mágico y Potencia de Efectos.",
    "atributo:sabiduria":
      "Atributo de control, resistencia mágica y combate con Bastón. Aporta Maná, regeneración, daño directo con Bastones, daño y efectos mágicos, resistencia a Fuego, Frío y Rayo, y Resistencia Mental.",
    "atributo:suerte":
      "Atributo de fortuna. Ajusta los precios comerciales y aumenta el peso relativo de rarezas superiores a Común al materializar botín.",
    "danio-medio":
      "Promedio del daño bruto del ataque actual antes de precisión, crítico, Armadura y Bloqueo del objetivo.",
    "danio-arma":
      "Rango final de la fuente equipada en Arma. Incluye sus componentes y modificadores canónicos del ataque básico actual.",
    "danio-secundaria":
      "Rango final de la fuente equipada en Secundaria cuando participa en el ataque básico actual.",
    dpt: "Daño bruto medio por turno según el daño medio y el coste temporal efectivo del ataque actual.",
    precision:
      "Valor usado para determinar la probabilidad de impactar frente a la Evasión del objetivo.",
    dispersion:
      "Pérdida máxima de Precisión a larga distancia. Se aplica progresivamente después de la mitad del alcance; cuanto más cerca de 0%, mejor.",
    "penetracion-armadura":
      "Puntos porcentuales que se restan a la mitigación producida por la Armadura. El excedente puede generar vulnerabilidad física.",
    evasion:
      "Valor defensivo que reduce la probabilidad de que los ataques enemigos impacten.",
    armadura:
      "Defensa física cuyo porcentaje de mitigación depende del daño físico de cada golpe y de la Penetración de Armadura del atacante; no equivale a una resistencia física fija.",
    critico: "Probabilidad de que un ataque válido sea crítico.",
    bloqueo:
      "Probabilidad de bloquear un golpe cuando la configuración actual permite Bloqueo.",
    "mitigacion-bloqueo":
      "Porcentaje del daño de un golpe bloqueado que se evita cuando el Bloqueo tiene éxito.",
    "regen-vida": "Vida recuperada en cada pulso de tiempo de referencia.",
    "regen-mana": "Maná recuperado en cada pulso de tiempo de referencia.",
    percepcion:
      "Cantidad de casillas que el combatiente puede percibir para visión y detección.",
    alcance: "Alcance máximo del ataque básico actual.",
    "dano-fisico":
      "Aumenta el componente físico de todas las armas equipadas, independientemente del atributo con el que escalen. Al ser global, beneficia también a ambas armas al usar duales.",
    "dano-magico":
      "Aumenta todo daño mágico directo de Fuego, Frío, Rayo y Veneno. Se acumula con la bonificación específica del tipo de daño correspondiente.",
    "dano-habilidad":
      "Aumenta una sola vez el daño directo generado por cualquier habilidad. No modifica ataques básicos ni efectos.",
    "dano-fuego":
      "Aumenta únicamente el daño directo de Fuego. Se acumula con Daño Mágico cuando corresponde.",
    "dano-frio":
      "Aumenta únicamente el daño directo de Frío. Se acumula con Daño Mágico cuando corresponde.",
    "dano-rayo":
      "Aumenta únicamente el daño directo de Rayo. Se acumula con Daño Mágico cuando corresponde.",
    "dano-veneno":
      "Aumenta únicamente el daño directo de Veneno. Se acumula con Daño Mágico cuando corresponde.",
    "potencia-efectos":
      "Aumenta los aspectos escalables de todos los efectos. Se acumula con la potencia específica del efecto cuando corresponda.",
    "potencia-quemadura":
      "Aumenta la potencia de Quemadura. Se acumula con Potencia de Efectos y no recibe Daño Mágico ni Daño de Habilidad.",
    "potencia-envenenamiento":
      "Aumenta la potencia de Envenenamiento. Se acumula con Potencia de Efectos y no recibe Daño Mágico ni Daño de Habilidad.",
    "potencia-ralentizacion":
      "Aumenta la intensidad escalable de Ralentización. Se acumula con Potencia de Efectos.",
    "potencia-electrizacion":
      "Aumenta la intensidad escalable de Electrización. Se acumula con Potencia de Efectos.",
    "res-fuego":
      "Reduce el daño de Fuego recibido. Un valor negativo representa Vulnerabilidad y aumenta ese daño.",
    "res-frio":
      "Reduce el daño de Frío recibido. Un valor negativo representa Vulnerabilidad y aumenta ese daño.",
    "res-rayo":
      "Reduce el daño de Rayo recibido. Un valor negativo representa Vulnerabilidad y aumenta ese daño.",
    "res-veneno":
      "Reduce el daño de Veneno recibido. Un valor negativo representa Vulnerabilidad y aumenta ese daño.",
    "res-congelamiento":
      "Reduce la probabilidad de recibir Congelamiento. Un valor negativo representa Vulnerabilidad y aumenta esa probabilidad.",
    "res-aturdimiento":
      "Reduce la probabilidad de recibir Aturdimiento. Un valor negativo representa Vulnerabilidad y aumenta esa probabilidad.",
    "res-envenenamiento":
      "Reduce la probabilidad de recibir Envenenamiento. Un valor negativo representa Vulnerabilidad y aumenta esa probabilidad.",
    "res-quemadura":
      "Reduce la probabilidad de recibir Quemadura. Un valor negativo representa Vulnerabilidad y aumenta esa probabilidad.",
    "res-mental":
      "Reduce la probabilidad de recibir Maldiciones. Un valor negativo representa Vulnerabilidad y aumenta esa probabilidad.",
    "ajuste-comercial":
      "Modificador canónico de precios derivado de Suerte. Los comerciantes consumen este resultado sin recalcular Suerte.",
    "hallazgo-magico":
      "Aumenta el peso relativo de rarezas superiores a Común cuando el botín se materializa. No cambia cantidad, Tier ni presupuesto.",
  };
  return traducir(
    `interfaz.personaje.descripcionEstadistica.${normalizarClaveTraduccion(clave)}`,
    {
      respaldo:
        fallback[clave] ??
        "Describe el valor canónico actual y su función en el juego.",
    },
  );
}
function nombreAtributo(id) {
  return traducir(`interfaz.personaje.${id}`, { respaldo: ident(id) });
}
function normalizarClaveTraduccion(v) {
  return String(v ?? "").replace(/[:.-]/g, "_");
}
function formato(v, decimalesMaximos = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(idiomaActivo() === "en" ? "en-US" : "es-UY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalesMaximos,
  }).format(n);
}
function ident(v) {
  return typeof v !== "string" || !v.trim()
    ? "—"
    : v
        .trim()
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
}
