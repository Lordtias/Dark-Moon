const MAPEO_TEXTOS = Object.freeze({
  "Nuevo Juego": "interfaz.menu.nuevoJuego",
  "Continuar": "interfaz.menu.continuar",
  "Configuración": "interfaz.configuracion.titulo",
  "Velocidad de animaciones": "interfaz.configuracion.velocidad",
  "Cargando...": "interfaz.configuracion.cargando",
  "Modifica únicamente la velocidad de presentación en Phaser.": "interfaz.configuracion.ayudaVelocidad",
  "Efectos visuales reducidos": "interfaz.configuracion.efectosReducidos",
  "Reduce efectos secundarios sin alterar la jugabilidad.": "interfaz.configuracion.ayudaEfectos",
  "Zoom inicial del mapa": "interfaz.configuracion.zoom",
  "Define cómo comienza la cámara. La rueda y las teclas de zoom siguen funcionando durante la partida.": "interfaz.configuracion.ayudaZoom",
  "Pantalla completa": "interfaz.configuracion.pantallaCompleta",
  "Activar pantalla completa": "interfaz.configuracion.activarPantallaCompleta",
  "Restablecer valores predeterminados": "interfaz.configuracion.restablecer",
  "Volver": "interfaz.configuracion.volver",
  "Creación del personaje": "interfaz.creacion.titulo",
  "Nombre": "interfaz.creacion.nombre",
  "Profesión": "interfaz.creacion.profesion",
  "Cargando profesiones...": "interfaz.creacion.cargandoProfesiones",
  "Atributos": "interfaz.creacion.atributos",
  "Reiniciar atributos": "interfaz.creacion.reiniciarAtributos",
  "Distribuir según profesión": "interfaz.creacion.distribuirProfesion",
  "Comenzar aventura": "interfaz.creacion.comenzar",
  "Registro de eventos": "interfaz.juego.registro",
  "Comenzá la aventura y explorá el mapa.": "interfaz.juego.mensajeInicial",
  "Inventario": "interfaz.juego.inventario",
  "El inventario está vacío.": "interfaz.juego.inventarioVacio",
  "Equipamiento": "interfaz.juego.equipamiento",
  "Personaje": "interfaz.juego.personaje",
  "Aventurero": "interfaz.personaje.aventurero",
  "Vida": "interfaz.personaje.vida",
  "Maná": "interfaz.personaje.mana",
  "Puntos": "interfaz.personaje.puntos",
  "Combate": "interfaz.personaje.combate",
  "Daño medio": "interfaz.personaje.danioMedio",
  "Turno": "interfaz.personaje.turno",
  "Precisión": "interfaz.personaje.precision",
  "Evasión": "interfaz.personaje.evasion",
  "Armadura": "interfaz.personaje.armadura",
  "Crítico": "interfaz.personaje.critico",
  "Bloqueo": "interfaz.personaje.bloqueo",
  "Regen. vida": "interfaz.personaje.regenVida",
  "Regen. maná": "interfaz.personaje.regenMana",
  "Percepción": "interfaz.personaje.percepcion",
  "Alcance": "interfaz.personaje.alcance",
  "Resistencias": "interfaz.personaje.resistencias",
  "Fuego": "interfaz.personaje.fuego",
  "Frío": "interfaz.personaje.frio",
  "Rayo": "interfaz.personaje.rayo",
  "Veneno": "interfaz.personaje.veneno",
  "Congelamiento": "interfaz.personaje.congelamiento",
  "Aturdimiento": "interfaz.personaje.aturdimiento",
  "Envenenamiento": "interfaz.personaje.envenenamiento",
  "Quemadura": "interfaz.personaje.quemadura",
  "Profesión seleccionada": "interfaz.creacion.profesionSeleccionada",
  "Conjunto inicial": "interfaz.creacion.conjuntoInicial",
  "Equipado": "interfaz.creacion.equipado",
  "Equipo recomendado": "interfaz.creacion.equipoRecomendado",
  "Tirar equipo alternativo": "interfaz.creacion.equipoAlternativo",
  "Restaurá tus recursos antes de una nueva expedición.": "interfaz.curacion.subtitulo",
  "Oro": "interfaz.curacion.oro",
  "El precio depende únicamente de los puntos que necesites recuperar.": "interfaz.curacion.introduccion",
  "Restaurar Vida": "interfaz.curacion.restaurarVida",
  "Completa todos los puntos de Vida faltantes.": "interfaz.curacion.descripcionVida",
  "Restaurar Maná": "interfaz.curacion.restaurarMana",
  "Completa todos los puntos de Maná faltantes.": "interfaz.curacion.descripcionMana",
  "Restaurar todo": "interfaz.curacion.restaurarTodo",
  "Completa Vida y Maná en una sola operación.": "interfaz.curacion.descripcionTodo",
  "Estado actual": "interfaz.curacion.estadoActual",
  "Puntos faltantes": "interfaz.curacion.puntosFaltantes",
  "Vida faltante": "interfaz.curacion.vidaFaltante",
  "Maná faltante": "interfaz.curacion.manaFaltante",
  "Precio": "interfaz.curacion.precio",
  "Precio total": "interfaz.curacion.precioTotal",
  "Calcular servicio": "interfaz.curacion.calcular",
  "Cerrar": "interfaz.curacion.cerrar",
});

const MAPEO_ATRIBUTOS = Object.freeze({
  title: Object.freeze({
    "Puntos pendientes de repartir": "interfaz.personaje.puntosPendientes",
  }),
  "aria-label": Object.freeze({
    "Zoom inicial del mapa": "interfaz.configuracion.zoom",
    "Reducir zoom inicial": "interfaz.configuracion.reducirZoom",
    "Aumentar zoom inicial": "interfaz.configuracion.aumentarZoom",
    "Cerrar servicios de curación": "interfaz.curacion.cerrarServicios",
  }),
});

const SELECTORES_COMPUESTOS = Object.freeze([
  [".puntos-disponibles", "interfaz.creacion.puntosDisponibles"],
  [".controles-partida", "interfaz.juego.controles"],
]);

export class AplicadorIdiomaDom {
  constructor({ traductor, documento = globalThis.document } = {}) {
    if (!traductor || typeof traductor.traducir !== "function") {
      throw new Error("AplicadorIdiomaDom necesita un traductor.");
    }
    this.traductor = traductor;
    this.documento = documento;
  }

  aplicar() {
    if (!this.documento) return;
    this.documento.documentElement?.setAttribute?.("lang", this.traductor.obtenerIdioma());
    this.aplicarEnRaiz(this.documento);
    for (const plantilla of this.documento.querySelectorAll?.("template") ?? []) {
      this.aplicarEnRaiz(plantilla.content);
    }
  }

  aplicarEnRaiz(raiz) {
    this.marcarTextosFallback(raiz);
    this.marcarAtributosFallback(raiz);

    for (const [selector, clave] of SELECTORES_COMPUESTOS) {
      for (const elemento of raiz.querySelectorAll?.(selector) ?? []) {
        elemento.dataset.i18n = elemento.dataset.i18n ?? clave;
      }
    }

    for (const elemento of raiz.querySelectorAll?.("[data-i18n]") ?? []) {
      const clave = elemento.dataset.i18n;
      if (clave === "interfaz.creacion.puntosDisponibles") {
        const valor = elemento.querySelector?.("#pointsRemaining");
        const texto = this.traductor.traducir(clave);
        if (valor) {
          const nodoTexto = [...elemento.childNodes].find((nodo) => nodo.nodeType === 3);
          if (nodoTexto) nodoTexto.textContent = ` ${texto} `;
        }
        continue;
      }
      elemento.textContent = this.traductor.traducir(clave);
    }
    for (const elemento of raiz.querySelectorAll?.("[data-i18n-title]") ?? []) {
      elemento.setAttribute("title", this.traductor.traducir(elemento.dataset.i18nTitle));
    }
    for (const elemento of raiz.querySelectorAll?.("[data-i18n-aria-label]") ?? []) {
      elemento.setAttribute("aria-label", this.traductor.traducir(elemento.dataset.i18nAriaLabel));
    }
    for (const elemento of raiz.querySelectorAll?.("[data-i18n-placeholder]") ?? []) {
      elemento.setAttribute("placeholder", this.traductor.traducir(elemento.dataset.i18nPlaceholder));
    }
  }

  marcarTextosFallback(raiz) {
    for (const elemento of raiz.querySelectorAll?.("button, label, h2, h3, h4, p, span, strong, small, option") ?? []) {
      if (elemento.dataset?.i18n) continue;
      if (elemento.children?.length > 0) continue;
      const texto = elemento.textContent?.replace(/\s+/g, " ").trim();
      const clave = MAPEO_TEXTOS[texto];
      if (clave) elemento.dataset.i18n = clave;
    }
  }

  marcarAtributosFallback(raiz) {
    for (const [atributo, mapa] of Object.entries(MAPEO_ATRIBUTOS)) {
      for (const elemento of raiz.querySelectorAll?.(`[${atributo}]`) ?? []) {
        const valor = elemento.getAttribute(atributo)?.trim();
        const clave = mapa[valor];
        if (!clave) continue;
        const nombreDataset = atributo === "title" ? "i18nTitle" : "i18nAriaLabel";
        elemento.dataset[nombreDataset] = elemento.dataset[nombreDataset] ?? clave;
      }
    }
  }
}
