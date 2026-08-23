import { calcularDpsCombatiente } from "../juego/combate/CalculadorDPS.js";
import { obtenerAportesAtributosPrimarios } from "../entidad/destructible/combatiente/EstadisticasDerivadas.js";
import { ATRIBUTOS_COMBATIENTE_CANONICOS } from "../entidad/destructible/combatiente/ContratosAtributosCombatiente.js";
import { TIEMPO_REFERENCIA } from "../juego/tiempo/SistemaTiempo.js";
import {
  OPERACIONES_MODIFICADOR,
  OBJETIVOS_MODIFICADOR,
} from "../juego/modificadores/ContratosModificadoresCombatiente.js";
import { traducir, traducirContenido } from "./idiomas/ContextoIdioma.js";
import { ModalDetalleEstadistica } from "./personaje/ModalDetalleEstadistica.js";
import { obtenerEstadoPasivasJugador } from "./personaje/ConsultaPasivasJugador.js";

const ATRIBUTOS = ATRIBUTOS_COMBATIENTE_CANONICOS;
const DETALLES = Object.freeze({
  "danio-medio": { etiqueta: "Daño medio", icono: "⚔" },
  dps: { etiqueta: "DPS", icono: "✦" },
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

const CLAVE_APORTE_ESTADISTICA = Object.freeze({
  danioFisico: ["danio-medio", "Daño del ataque actual"],
  vidaMaxima: ["vida-maxima", "Vida máxima"],
  manaMaximo: ["mana-maximo", "Maná máximo"],
  precision: ["precision", "Precisión"],
  evasion: ["evasion", "Evasión"],
  regeneracionVida: ["regen-vida", "Regeneración de vida"],
  regeneracionMana: ["regen-mana", "Regeneración de maná"],
  danoFisico: ["dano-fisico", "Daño Físico"],
  danoMagico: ["dano-magico", "Daño Mágico"],
  danoHabilidad: ["dano-habilidad", "Daño de Habilidad"],
  "danoTipo:fuego": ["dano-fuego", "Daño de Fuego"],
  "danoTipo:frio": ["dano-frio", "Daño de Frío"],
  "danoTipo:rayo": ["dano-rayo", "Daño de Rayo"],
  "danoTipo:veneno": ["dano-veneno", "Daño de Veneno"],
  potenciaEfectos: ["potencia-efectos", "Potencia de Efectos"],
  "potenciaEfecto:quemadura": ["potencia-quemadura", "Potencia de Quemadura"],
  "potenciaEfecto:envenenamiento": ["potencia-envenenamiento", "Potencia de Envenenamiento"],
  "potenciaEfecto:ralentizacion": ["potencia-ralentizacion", "Potencia de Ralentización"],
  "potenciaEfecto:electrizacion": ["potencia-electrizacion", "Potencia de Electrización"],
  resistenciaVeneno: ["res-veneno", "Resistencia a Veneno"],
  "resistencia:fuego": ["res-fuego", "Resistencia a Fuego"],
  "resistencia:frio": ["res-frio", "Resistencia a Frío"],
  "resistencia:rayo": ["res-rayo", "Resistencia a Rayo"],
  "resistencia:veneno": ["res-veneno", "Resistencia a Veneno"],
  "resistenciaEfecto:congelamiento": [
    "res-congelamiento",
    "Resistencia a Congelamiento",
  ],
  "resistenciaEfecto:aturdimiento": [
    "res-aturdimiento",
    "Resistencia a Aturdimiento",
  ],
  "resistenciaEfecto:envenenamiento": [
    "res-envenenamiento",
    "Resistencia a Envenenamiento",
  ],
  "resistenciaEfecto:quemadura": ["res-quemadura", "Resistencia a Quemadura"],
  resistenciaMental: ["res-mental", "Resistencia Mental"],
  potenciaAura: ["potencia-aura", "Potencia de Aura"],
  ajusteComercial: ["ajuste-comercial", "Ajuste comercial"],
  hallazgoMagico: ["hallazgo-magico", "Hallazgo mágico"],
});

const CLAVE_ESTADISTICA_APORTES = Object.freeze({
  "danio-medio": "danioFisico",
  precision: "precision",
  evasion: "evasion",
  "regen-vida": "regeneracionVida",
  "regen-mana": "regeneracionMana",
  "dano-fisico": "danoFisico",
  "dano-magico": "danoMagico",
  "dano-habilidad": "danoHabilidad",
  "dano-fuego": "danoTipo:fuego",
  "dano-frio": "danoTipo:frio",
  "dano-rayo": "danoTipo:rayo",
  "dano-veneno": "danoTipo:veneno",
  "potencia-efectos": "potenciaEfectos",
  "potencia-quemadura": "potenciaEfecto:quemadura",
  "potencia-envenenamiento": "potenciaEfecto:envenenamiento",
  "potencia-ralentizacion": "potenciaEfecto:ralentizacion",
  "potencia-electrizacion": "potenciaEfecto:electrizacion",
  "res-fuego": "resistencia:fuego",
  "res-frio": "resistencia:frio",
  "res-rayo": "resistencia:rayo",
  "res-veneno": "resistencia:veneno",
  "res-congelamiento": "resistenciaEfecto:congelamiento",
  "res-aturdimiento": "resistenciaEfecto:aturdimiento",
  "res-envenenamiento": "resistenciaEfecto:envenenamiento",
  "res-quemadura": "resistenciaEfecto:quemadura",
  "res-mental": "resistenciaMental",
  "ajuste-comercial": "ajusteComercial",
  "hallazgo-magico": "hallazgoMagico",
});

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
          { etiqueta: "DPS", campo: "dps", valor: "0" },
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
  actualizar(player, { juego = this.juegoActual } = {}) {
    this.playerActual = player;
    this.juegoActual = juego ?? null;
    const e = player.estadisticasDerivadas;
    this.estadisticasActuales = e;
    this.aportesAtributosActuales = obtenerAportesAtributosPrimarios(player);
    this.resolucionPercepcionActual = player.resolverModificador(
      OBJETIVOS_MODIFICADOR.PERCEPCION,
      player.percepcionBase,
    );
    this.resolucionAlcanceActual = player.resolverAlcanceAtaque?.() ?? null;
    this.dpsActual = calcularDpsCombatiente(player);
    this.obtener('[data-personaje="nombre"]').textContent = player.nombre;
    this.obtener('[data-personaje="clase"]').textContent = traducirContenido(
      "profesiones",
      player.idProfesion,
      "nombre",
      player.clasePersonaje,
    );
    this.obtener('[data-personaje="nivel"]').textContent = traducir(
      "interfaz.personaje.nivel",
      {
        parametros: { nivel: player.nivel },
        respaldo: `Nivel ${player.nivel}`,
      },
    );
    this.actualizarExperiencia(player);
    this.obtener('[data-personaje="puntos-atributo"]').textContent =
      player.puntosAtributoDisponibles;
    this.obtener('[data-personaje="danio-medio"]').textContent = formato(
      e.danioFisico.promedio,
    );
    this.obtener('[data-personaje="dps"]').textContent = formato(
      this.dpsActual.dps,
    );
    this.actualizarDanioPorRanura(player, e);
    this.actualizarBarra("vida", player.vidaActual, player.vidaMaxima);
    this.actualizarBarra("mana", player.manaActual, player.manaMaximo);
    for (const a of ATRIBUTOS)
      this.obtener(
        `.fila-atributo[data-atributo="${a}"] [data-campo="valor"]`,
      ).textContent = player.atributos[a];
    this.actualizarEstadisticas(player, e);
    for (const b of this.contenedor.querySelectorAll(
      '[data-accion="sumar-atributo"]',
    ))
      b.disabled = player.puntosAtributoDisponibles <= 0;
    this.actualizarPasivas(player);
    this.actualizarEfectos(player);
  }
  actualizarDanioPorRanura(player, estadisticas) {
    const fuentes = estadisticas?.danioFisico?.componentes ?? [];
    this.fuentesDanioPorManoActual = new Map(
      fuentes
        .filter((fuente) => fuente?.mano === "principal" || fuente?.mano === "secundaria")
        .map((fuente) => [fuente.mano, fuente]),
    );
    this.actualizarDatoDanioPorMano(
      "danio-arma",
      this.fuentesDanioPorManoActual.get("principal") ?? null,
    );

    const armaPrincipal = player.equipamiento?.tieneRanura("arma")
      ? player.equipamiento.obtenerObjetoEnRanura("arma")
      : null;
    const secundaria = this.obtener('[data-personaje="danio-secundaria"]')
      .closest(".dato-personaje");
    const usaDosManos = armaPrincipal?.propiedades?.manos === 2;
    secundaria.hidden = usaDosManos;
    this.actualizarDatoDanioPorMano(
      "danio-secundaria",
      usaDosManos
        ? null
        : this.fuentesDanioPorManoActual.get("secundaria") ?? null,
    );
  }
  actualizarDatoDanioPorMano(campo, fuente) {
    const valor = this.obtener(`[data-personaje="${campo}"]`);
    const fila = valor.closest(".dato-personaje");
    const tieneDanio = Boolean(fuente && Number.isFinite(fuente.promedio));
    valor.textContent = tieneDanio ? formato(fuente.promedio) : "--.-";
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
  actualizarEstadisticas(player, e) {
    this.asegurarMental();
    const valores = {
      precision: e.precision,
      dispersion: `${formato(e.dispersion)}%`,
      "penetracion-armadura": `${formato(e.penetracionArmadura)}%`,
      evasion: e.evasion,
      armadura: e.armadura,
      critico: `${formato(e.probabilidadCritico)}%`,
      bloqueo: `${formato(e.probabilidadBloqueo)}%`,
      "mitigacion-bloqueo": `${formato(e.mitigacionBloqueo)}%`,
      "regen-vida": formato(e.regeneracionVida),
      "regen-mana": formato(e.regeneracionMana),
      percepcion: formato(
        Math.max(0, this.resolucionPercepcionActual.resultado),
      ),
      alcance: this.resolucionAlcanceActual?.resultado ?? player.alcanceAtaque,
      "dano-fisico": signoPorcentaje(e.danoFisico),
      "dano-magico": signoPorcentaje(e.danoMagico),
      "dano-habilidad": signoPorcentaje(e.danoHabilidad),
      "dano-fuego": signoPorcentaje(e.danosPorTipo?.fuego ?? 0),
      "dano-frio": signoPorcentaje(e.danosPorTipo?.frio ?? 0),
      "dano-rayo": signoPorcentaje(e.danosPorTipo?.rayo ?? 0),
      "dano-veneno": signoPorcentaje(e.danosPorTipo?.veneno ?? 0),
      "potencia-efectos": signoPorcentaje(e.potenciaEfectos),
      "potencia-quemadura": signoPorcentaje(e.potenciasEfectosEspecificas?.quemadura ?? 0),
      "potencia-envenenamiento": signoPorcentaje(e.potenciasEfectosEspecificas?.envenenamiento ?? 0),
      "potencia-ralentizacion": signoPorcentaje(e.potenciasEfectosEspecificas?.ralentizacion ?? 0),
      "potencia-electrizacion": signoPorcentaje(e.potenciasEfectosEspecificas?.electrizacion ?? 0),
      "res-fuego": `${formato(e.resistencias.fuego)}%`,
      "res-frio": `${formato(e.resistencias.frio)}%`,
      "res-rayo": `${formato(e.resistencias.rayo)}%`,
      "res-veneno": `${formato(e.resistencias.veneno)}%`,
      "res-congelamiento": `${formato(e.resistenciasEfectos.congelamiento)}%`,
      "res-aturdimiento": `${formato(e.resistenciasEfectos.aturdimiento)}%`,
      "res-envenenamiento": `${formato(e.resistenciasEfectos.envenenamiento)}%`,
      "res-quemadura": `${formato(e.resistenciasEfectos.quemadura)}%`,
      "res-mental": `${formato(e.resistenciaMental)}%`,
      "ajuste-comercial": signoPorcentaje(e.ajusteComercial * 100),
      "hallazgo-magico": signoPorcentaje(e.hallazgoMagico),
    };
    for (const [campo, valor] of Object.entries(valores))
      this.obtener(`[data-personaje="${campo}"]`).textContent = valor;
    for (const [campo, detalle] of Object.entries(DETALLES)) {
      if (detalle.porcentaje !== true) continue;
      const valorVisible =
        this.obtener(`[data-personaje="${campo}"]`)?.textContent ?? "";
      const fila = this.obtener(`[data-personaje="${campo}"]`)?.closest(
        ".dato-personaje",
      );
      fila?.classList.toggle(
        "dato-personaje--porcentaje-negativo",
        Number.parseFloat(valorVisible) < 0,
      );
    }
  }
  actualizarPasivas(player) {
    const lista = obtenerEstadoPasivasJugador({
      jugador: player,
      configuracion: this.configuracionHabilidades,
    });
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
  actualizarEfectos(player) {
    this.listaEfectos.replaceChildren();
    const lista = this.juegoActual?.obtenerEfectosTemporales?.(player) ?? [];
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
    for (const e of lista.sort(
      (a, b) => (a.venceEn ?? Infinity) - (b.venceEn ?? Infinity),
    )) {
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
      const turns =
        Number.isFinite(e.venceEn) &&
        Number.isFinite(this.juegoActual?.tiempoActual)
          ? Math.max(
              0,
              Math.ceil(
                (e.venceEn - this.juegoActual.tiempoActual) / TIEMPO_REFERENCIA,
              ),
            )
          : null;
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
    const d = clave.startsWith("atributo:")
      ? this.detalleAtributo(clave.slice(9))
      : this.detalleEstadistica(clave);
    if (d) this.modalDetalle.abrir(d);
  }
  detalleAtributo(a) {
    const val = this.playerActual?.atributos?.[a];
    if (!Number.isFinite(val)) return null;
    const et = traducir(`interfaz.personaje.${a}`, { respaldo: ident(a) });
    const aportes = this.aportesAtributosActuales?.porAtributo?.[a] ?? [];
    const filas = [
      {
        tipo: "base",
        etiqueta: traducir("interfaz.personaje.valorActual", {
          respaldo: "Valor actual",
        }),
        valor: formato(val),
      },
    ];
    for (const aporte of aportes) {
      const [, respaldoBase] = CLAVE_APORTE_ESTADISTICA[aporte.estadistica] ?? [
        aporte.estadistica,
        ident(aporte.estadistica),
      ];
      const respaldo =
        aporte.nota === "armas_fuerza"
          ? "Daño físico con armas de Fuerza"
          : aporte.nota === "armas_destreza"
            ? "Daño físico con armas de Destreza"
            : aporte.nota === "armas_sabiduria"
              ? "Daño físico con armas de Sabiduría"
              : respaldoBase;
      const claveAporte = aporte.nota?.startsWith("armas_")
        ? aporte.nota
        : normalizarClaveTraduccion(aporte.estadistica);
      filas.push({
        tipo: aporte.valor < 0 ? "penalizacion" : "atributo",
        etiqueta: traducir(
          `interfaz.personaje.aporteEstadistica.${claveAporte}`,
          { respaldo },
        ),
        valor: formatearAporteAtributo(aporte),
        icono: "◆",
      });
    }
    return {
      titulo: et,
      icono: "◆",
      valorFinal: formato(val),
      descripcion: descripcionDetalle(`atributo:${a}`),
      filas,
      nota: traducir("interfaz.personaje.atributoAportesNota", {
        respaldo:
          "Los aportes listados son los que este atributo genera en el cálculo canónico actual. Cuando dice aporte al valor base, modificadores posteriores todavía pueden alterar el resultado final.",
      }),
    };
  }
  detalleEstadistica(k) {
    const m = DETALLES[k];
    if (!m) return null;
    const visible =
      this.contenedor.querySelector(`[data-personaje="${k}"]`)?.textContent ??
      "—";
    const porcentajeNegativo =
      m.porcentaje === true && Number.parseFloat(visible) < 0;
    const vulnerabilidad = CAMPOS_RESISTENCIA.has(k) && porcentajeNegativo;
    if (m.manoDanio) return this.detalleDanioPorMano(m, visible);
    if (k === "danio-medio") {
      const filas = [];
      for (const fuente of this.estadisticasActuales?.danioFisico
        ?.componentes ?? [])
        filas.push({
          tipo: "base",
          etiqueta: this.nombreFuenteDanio(fuente),
          valor: formato(fuente.promedio),
        });
      for (const componente of this.estadisticasActuales?.danioFisico
        ?.componentes ?? []) {
        const resolucion = componente?.resolucionMultiplicadorDanioFuente;
        for (const mod of resolucion?.desglose?.aplicados ?? []) {
          filas.push({
            tipo: tipoOperacion(mod.operacion, mod.valor),
            etiqueta: `${this.nombreFuente(mod)} · ${componente.nombre ?? "Fuente"}`,
            valor: formatearMod(mod),
          });
        }
      }
      return {
        titulo: m.etiqueta,
        icono: m.icono,
        valorFinal: visible,
        descripcion: descripcionDetalle(k),
        filas,
        nota: traducir("interfaz.personaje.desgloseDanioFuenteNota", {
          respaldo:
            "Los modificadores de fuente mostrados provienen de la misma resolución canónica utilizada para calcular el daño actual.",
        }),
      };
    }
    if (k === "dps")
      return {
        titulo: m.etiqueta,
        icono: m.icono,
        valorFinal: visible,
        descripcion: descripcionDetalle(k),
        filas: [
          {
            tipo: "base",
            etiqueta: "Daño medio",
            valor: formato(this.dpsActual?.danioMedio ?? 0),
          },
          {
            tipo: "informacion",
            etiqueta: traducir("interfaz.personaje.costoEfectivo", {
              respaldo: "Costo efectivo",
            }),
            valor: this.dpsActual?.costoAtaqueEfectivo ?? "—",
          },
          {
            tipo: "informacion",
            etiqueta: traducir("interfaz.personaje.duracionAtaque", {
              respaldo: "Duración del ataque",
            }),
            valor: `${formato(this.dpsActual?.duracionAtaqueSegundos ?? 0)} s`,
          },
        ],
        nota: traducir("interfaz.personaje.dpsAyuda", {
          respaldo:
            "Daño bruto medio por segundo. No incluye precisión, crítico, armadura ni bloqueo.",
        }),
      };
    let r = null;
    if (k === "percepcion") r = this.resolucionPercepcionActual;
    else if (k === "alcance") r = this.resolucionAlcanceActual;
    else
      r = this.estadisticasActuales?.resolucionesModificadores?.[m.resolucion];
    const filas = [];
    if (porcentajeNegativo)
      filas.push({
        tipo: "penalizacion",
        etiqueta: traducir("interfaz.personaje.estadoPorcentaje", {
          respaldo: "Estado",
        }),
        valor: etiquetaPorcentajeNegativo(k),
        icono: "!",
      });
    if (r) {
      filas.push({
        tipo: "base",
        etiqueta: traducir("interfaz.personaje.valorBase", {
          respaldo: "Valor base",
        }),
        valor: valorResolucion(r.valorBase, m.porcentaje, m.escala ?? 1),
      });
      for (const aporte of this.aportesAtributosEstadistica(k))
        filas.push({
          tipo: "atributo",
          etiqueta: `${nombreAtributo(aporte.atributo)} · ${traducir("interfaz.personaje.incluidoEnBase", { respaldo: "incluido en base" })}`,
          valor: formatearAporteAtributo(aporte),
          icono: "◆",
        });
      for (const mod of r.desglose?.aplicados ?? [])
        filas.push({
          tipo: tipoOperacion(mod.operacion, mod.valor),
          etiqueta: this.nombreFuente(mod),
          valor: formatearMod(mod, m.escala ?? 1, m.porcentaje === true),
        });
      if (r.limiteDominio?.aplicado) {
        const esMinimo =
          (r.resultadoAntesLimite ?? r.resultado) < r.limiteDominio.minima;
        filas.push({
          tipo: "limite",
          etiqueta: traducir(
            esMinimo
              ? "interfaz.personaje.limiteVulnerabilidad"
              : "interfaz.personaje.limiteDominio",
            {
              respaldo: esMinimo
                ? "Límite de vulnerabilidad"
                : "Límite del dominio",
            },
          ),
          valor: `${esMinimo ? r.limiteDominio.minima : r.limiteDominio.maxima}%`,
        });
      } else if (m.limiteDominio && r.resultado > m.limiteDominio)
        filas.push({
          tipo: "limite",
          etiqueta: traducir("interfaz.personaje.limiteDominio", {
            respaldo: "Límite del dominio",
          }),
          valor: `${m.limiteDominio}%`,
        });
    } else {
      for (const aporte of this.aportesAtributosEstadistica(k))
        filas.push({
          tipo: "atributo",
          etiqueta: nombreAtributo(aporte.atributo),
          valor: formatearAporteAtributo(aporte),
          icono: "◆",
        });
    }
    return {
      titulo: m.etiqueta,
      icono: m.icono,
      valorFinal: visible,
      descripcion: vulnerabilidad
        ? descripcionVulnerabilidad(k)
        : descripcionDetalle(k),
      filas,
      nota: r
        ? traducir("interfaz.personaje.desgloseCanonicoNota", {
            respaldo:
              "El detalle usa la misma resolución canónica que produjo la estadística; la interfaz no recalcula el resultado.",
          })
        : traducir("interfaz.personaje.sinDesgloseCanonico", {
            respaldo:
              "Este valor no expone todavía un desglose canónico adicional.",
          }),
    };
  }
  detalleDanioPorMano(detalle, visible) {
    const fuente = this.fuentesDanioPorManoActual?.get(detalle.manoDanio);
    if (!fuente || !Number.isFinite(fuente.promedio)) return null;

    const filas = [];
    filas.push({
      tipo: "base",
      etiqueta: traducir("interfaz.personaje.rangoFinal", {
        respaldo: "Rango final",
      }),
      valor: formatearRango(fuente.minimo, fuente.maximo),
    });
    if (Number.isFinite(fuente.minimoLocal) && Number.isFinite(fuente.maximoLocal))
      filas.push({
        tipo: "base",
        etiqueta: traducir("interfaz.personaje.rangoBaseLocal", {
          respaldo: "Rango base/local",
        }),
        valor: formatearRango(fuente.minimoLocal, fuente.maximoLocal),
      });
    const bonoAtributo = Number(fuente.bonoAtributo);
    if (
      fuente.esAtaqueMagicoBasico !== true &&
      fuente.atributoOfensivo &&
      Number.isFinite(bonoAtributo) &&
      Math.abs(bonoAtributo) > Number.EPSILON
    )
      filas.push({
        tipo: bonoAtributo < 0 ? "penalizacion" : "atributo",
        etiqueta: traducir(
          `interfaz.personaje.aporteEstadistica.armas_${fuente.atributoOfensivo}`,
          {
            respaldo: `Daño físico con armas de ${nombreAtributo(fuente.atributoOfensivo)}`,
          },
        ),
        valor: signoPorcentaje(bonoAtributo * 100),
        icono: "◆",
      });

    const multiplicadorManoSecundaria = Number(
      fuente.resolucionMultiplicadorDanioFuente?.resultado,
    );
    if (
      detalle.manoDanio === "secundaria" &&
      Number.isFinite(multiplicadorManoSecundaria) &&
      Math.abs(multiplicadorManoSecundaria - 1) > Number.EPSILON
    ) {
      const variacionManoSecundaria =
        (multiplicadorManoSecundaria - 1) * 100;
      const esPenalizacion = variacionManoSecundaria < 0;
      filas.push({
        tipo: esPenalizacion ? "penalizacion" : "bonificacion",
        etiqueta: traducir(
          esPenalizacion
            ? "interfaz.personaje.penalizacionManoSecundaria"
            : "interfaz.personaje.bonificacionManoSecundaria",
          {
            respaldo: esPenalizacion
              ? "Penalización de mano secundaria"
              : "Bonificación de mano secundaria",
          },
        ),
        valor: signoPorcentaje(variacionManoSecundaria),
      });
    }

    this.agregarModificadoresDanioFuente(
      filas,
      fuente.resolucionMultiplicadorDanioFuente,
      this.nombreFuenteDanio(fuente),
    );
    for (const componente of fuente.componentesDanio ?? []) {
      const escalado = componente.resolucionEscaladoDanio;
      const etiquetaComponente = nombreTipoDanio(componente.tipo);
      for (const resolucion of [
        escalado?.danioFisico,
        escalado?.danioMagico,
        escalado?.danioTipo,
      ])
        this.agregarModificadoresDanioFuente(
          filas,
          resolucion,
          etiquetaComponente,
        );
    }
    const rangosFinales = (fuente.rangosComponentes ?? []).filter((rango) =>
      Number.isFinite(rango?.promedio),
    );
    if (rangosFinales.length > 1)
      for (const rango of rangosFinales)
        filas.push({
          tipo: "informacion",
          etiqueta: traducir("interfaz.personaje.componenteFinalDanio", {
            parametros: { tipo: nombreTipoDanio(rango.tipo) },
            respaldo: `Componente final: ${nombreTipoDanio(rango.tipo)}`,
          }),
          valor: formatearRango(rango.minimo, rango.maximo),
        });
    return {
      titulo: detalle.etiqueta,
      icono: detalle.icono,
      valorFinal: visible,
      descripcion: descripcionDetalle(
        detalle.manoDanio === "principal"
          ? "danio-arma"
          : "danio-secundaria",
      ),
      filas,
      nota: traducir("interfaz.personaje.desgloseDanioFuenteNota", {
        respaldo:
          "Los rangos y modificadores mostrados son la salida canónica del ataque actual; la interfaz no los recalcula.",
      }),
    };
  }
  agregarModificadoresDanioFuente(filas, resolucion, etiqueta) {
    for (const mod of resolucion?.desglose?.aplicados ?? [])
      filas.push({
        tipo: tipoOperacion(mod.operacion, mod.valor),
        etiqueta: `${this.nombreFuente(mod)} · ${etiqueta}`,
        valor: formatearMod(
          mod,
          1,
          esObjetivoDanioPorcentual(resolucion?.objetivo),
        ),
      });
  }
  aportesAtributosEstadistica(k) {
    const clave = CLAVE_ESTADISTICA_APORTES[k];
    if (!clave) return [];
    return this.aportesAtributosActuales?.porEstadistica?.[clave] ?? [];
  }
  nombreFuente(mod) {
    const f = mod?.fuente ?? {};
    if (f.tipo === "pasiva" && f.idHabilidad) {
      const h = this.configuracionHabilidades?.habilidades?.[f.idHabilidad];
      return traducirContenido(
        "habilidades",
        f.idHabilidad,
        "nombre",
        h?.nombre ?? f.idHabilidad,
      );
    }
    return (
      f.afijoNombre ??
      f.objetoNombre ??
      f.nombre ??
      (mod?.origen ? ident(mod.origen) : "Modificador")
    );
  }
  nombreFuenteDanio(fuente) {
    const mano =
      fuente?.mano === "principal"
        ? traducir("interfaz.personaje.arma", { respaldo: "Arma" })
        : fuente?.mano === "secundaria"
          ? traducir("interfaz.personaje.secundaria", { respaldo: "Secundaria" })
          : traducir("interfaz.personaje.ataqueNatural", {
              respaldo: "Ataque natural",
            });
    return fuente?.nombre ? `${mano} · ${fuente.nombre}` : mano;
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
function tipoOperacion(op, v) {
  if (op === OPERACIONES_MODIFICADOR.LIMITAR_MAXIMO) return "limite";
  if (
    [
      OPERACIONES_MODIFICADOR.MULTIPLICAR,
      OPERACIONES_MODIFICADOR.MULTIPLICAR_REDONDEAR,
      OPERACIONES_MODIFICADOR.PORCENTAJE_MULTIPLICATIVO,
      OPERACIONES_MODIFICADOR.PORCENTAJE_INVERSO,
    ].includes(op)
  )
    return "multiplicador";
  return v < 0 ? "penalizacion" : "bonificacion";
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
    return `×${original}`;
  if (m?.operacion === OPERACIONES_MODIFICADOR.LIMITAR_MAXIMO)
    return forzarPorcentaje ? `máx. ${formato(v)}%` : `máx. ${formato(v)}`;
  return forzarPorcentaje ? `${s}${formato(v)}%` : `${s}${formato(v)}`;
}
function esObjetivoDanioPorcentual(objetivo) {
  return [
    OBJETIVOS_MODIFICADOR.DANO_FISICO,
    OBJETIVOS_MODIFICADOR.DANO_MAGICO,
    OBJETIVOS_MODIFICADOR.DANO_HABILIDAD,
    OBJETIVOS_MODIFICADOR.DANO_TIPO,
  ].includes(objetivo);
}
function formatearRango(minimo, maximo) {
  if (!Number.isFinite(minimo) || !Number.isFinite(maximo)) return "—";
  return minimo === maximo
    ? formato(minimo)
    : `${formato(minimo)}–${formato(maximo)}`;
}
function nombreTipoDanio(tipo) {
  const claves = {
    fisico: ["danoFisico", "Daño Físico"],
    fuego: ["danoFuego", "Fuego"],
    frio: ["danoFrio", "Frío"],
    rayo: ["danoRayo", "Rayo"],
    veneno: ["danoVeneno", "Veneno"],
  };
  const [clave, respaldo] = claves[tipo] ?? [null, ident(tipo ?? "daño")];
  return clave
    ? traducir(`interfaz.personaje.${clave}`, { respaldo })
    : respaldo;
}
function etiquetaPorcentajeNegativo(clave) {
  if (CAMPOS_RESISTENCIA.has(clave))
    return traducir("interfaz.personaje.vulnerabilidad", {
      respaldo: "Vulnerabilidad",
    });
  const estados = {
    "dano-fisico": ["penalizacionDanio", "Penalización de daño"],
    "dano-magico": ["penalizacionDanio", "Penalización de daño"],
    "dano-habilidad": ["penalizacionDanio", "Penalización de daño"],
    "dano-fuego": ["penalizacionDanio", "Penalización de daño"],
    "dano-frio": ["penalizacionDanio", "Penalización de daño"],
    "dano-rayo": ["penalizacionDanio", "Penalización de daño"],
    "dano-veneno": ["penalizacionDanio", "Penalización de daño"],
    "potencia-efectos": ["penalizacionEfectos", "Penalización de efectos"],
    "ajuste-comercial": ["desventajaComercial", "Desventaja comercial"],
    dispersion: ["penalizacionPrecision", "Penalización de precisión"],
  };
  const [claveTraduccion, respaldo] = estados[clave] ?? [
    "penalizacionPorcentual",
    "Penalización",
  ];
  return traducir(`interfaz.personaje.${claveTraduccion}`, { respaldo });
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
      "Promedio final de la fuente equipada en Arma. Incluye sus componentes y modificadores canónicos del ataque básico actual.",
    "danio-secundaria":
      "Promedio final de la fuente equipada en Secundaria cuando participa en el ataque básico actual.",
    dps: "Daño bruto medio por segundo según el daño medio y el tiempo efectivo del ataque actual.",
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
function formatearAporteAtributo(aporte) {
  const v = Number(aporte?.valor) || 0;
  const s = v > 0 ? "+" : "";
  return aporte?.unidad === "porcentaje"
    ? `${s}${formato(v)}%`
    : `${s}${formato(v)}`;
}
function nombreAtributo(id) {
  return traducir(`interfaz.personaje.${id}`, { respaldo: ident(id) });
}
function normalizarClaveTraduccion(v) {
  return String(v ?? "").replace(/[:.-]/g, "_");
}
function formato(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const redondeado = Number(n.toFixed(1));
  return Number.isInteger(redondeado)
    ? String(redondeado)
    : redondeado.toFixed(1);
}
function signoPorcentaje(v) {
  const n = Number(v) || 0;
  return `${n >= 0 ? "+" : ""}${formato(n)}%`;
}
function valorResolucion(v, p, escala = 1) {
  const s = formato(Number(v) * escala);
  return p && s !== "—" ? `${s}%` : s;
}
function ident(v) {
  return typeof v !== "string" || !v.trim()
    ? "—"
    : v
        .trim()
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
}
