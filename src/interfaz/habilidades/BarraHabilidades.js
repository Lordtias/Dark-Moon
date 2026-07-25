const ID_ESTILOS = "dark-moon-estilos-habilidades-etapa5";

// Adaptador visual tolerante a la barra existente. Si la plantilla todavía no
// expone un contenedor reconocible, crea una barra técnica de respaldo.
export class BarraHabilidades {
  constructor({ sistemaHabilidades }) {
    this.sistema = sistemaHabilidades;
    this.contenedor = obtenerOCrearContenedor();
    this.ranuras = obtenerOCrearRanuras(this.contenedor);
    this.instalarEstilos();
    this.instalarEventos();
    this.desuscribir = this.sistema.suscribirCambio(() => this.renderizar());
    this.intervalo = window.setInterval(() => {
      this.sistema.procesarEfectosPendientes();
      this.renderizar();
    }, 250);
    this.renderizar();
  }

  renderizar() {
    const estado = this.sistema.obtenerEstadoBarra();
    const seleccion = this.sistema.obtenerSeleccionDetallada();

    estado.forEach((ranura, indice) => {
      const elemento = this.ranuras[indice];
      if (!elemento) {
        return;
      }

      elemento.dataset.ranuraHabilidad = String(indice);
      elemento.classList.toggle("habilidad-seleccionada", ranura.seleccionada);
      elemento.classList.toggle("habilidad-vacia", !ranura.idHabilidad);
      elemento.classList.toggle(
        "habilidad-bloqueada",
        Boolean(ranura.idHabilidad) && (!ranura.configurada || ranura.grado <= 0),
      );
      elemento.classList.toggle(
        "habilidad-sin-mana",
        Boolean(ranura.idHabilidad) && !ranura.manaSuficiente,
      );

      elemento.replaceChildren();
      const tecla = document.createElement("span");
      tecla.className = "habilidad-tecla";
      tecla.textContent = ranura.tecla;
      elemento.append(tecla);

      if (ranura.icono) {
        const imagen = document.createElement("img");
        imagen.className = "habilidad-icono";
        imagen.src = ranura.icono;
        imagen.alt = ranura.nombre;
        imagen.draggable = false;
        elemento.append(imagen);
      } else if (ranura.idHabilidad) {
        const inicial = document.createElement("span");
        inicial.className = "habilidad-inicial";
        inicial.textContent = ranura.nombre.slice(0, 1).toUpperCase();
        elemento.append(inicial);
      }

      if (ranura.grado > 0) {
        const grado = document.createElement("span");
        grado.className = "habilidad-grado";
        grado.textContent = `G${ranura.grado}`;
        elemento.append(grado);
      }

      if (ranura.costoMana !== null) {
        const mana = document.createElement("span");
        mana.className = "habilidad-mana";
        mana.textContent = String(ranura.costoMana);
        elemento.append(mana);
      }

      elemento.title = crearTitulo(ranura);
    });

    actualizarSelectorMapa(seleccion);
  }

  destruir() {
    this.desuscribir?.();
    window.clearInterval(this.intervalo);
    for (const ranura of this.ranuras) {
      ranura.replaceWith(ranura.cloneNode(true));
    }
    limpiarSelectorMapa();
  }

  instalarEventos() {
    for (const [indice, ranura] of this.ranuras.entries()) {
      ranura.addEventListener("click", (evento) => {
        evento.preventDefault();
        this.sistema.seleccionarPorRanura(indice);
        this.renderizar();
      });
    }
  }

  instalarEstilos() {
    if (document.getElementById(ID_ESTILOS)) {
      return;
    }
    const estilos = document.createElement("style");
    estilos.id = ID_ESTILOS;
    estilos.textContent = `
      .barra-habilidades-etapa5 { display:flex; gap:4px; position:fixed; left:50%; bottom:12px; transform:translateX(-50%); z-index:50; }
      [data-ranura-habilidad] { position:relative; width:44px; height:44px; box-sizing:border-box; border:1px solid #66583f; background:#16130f; overflow:hidden; cursor:pointer; user-select:none; }
      [data-ranura-habilidad].habilidad-seleccionada { outline:2px solid #d9c35a; box-shadow:0 0 8px #d9c35a; }
      [data-ranura-habilidad].habilidad-bloqueada { filter:grayscale(1); opacity:.45; }
      [data-ranura-habilidad].habilidad-sin-mana { box-shadow:inset 0 0 0 2px #335db4; }
      .habilidad-icono { width:100%; height:100%; object-fit:contain; image-rendering:pixelated; image-rendering:crisp-edges; }
      .habilidad-inicial { display:grid; place-items:center; width:100%; height:100%; font:bold 20px serif; color:#7fcf5b; }
      .habilidad-tecla,.habilidad-grado,.habilidad-mana { position:absolute; z-index:2; padding:0 2px; background:rgba(0,0,0,.72); color:#eee; font:10px monospace; line-height:13px; }
      .habilidad-tecla { left:1px; top:1px; }
      .habilidad-grado { right:1px; top:1px; }
      .habilidad-mana { right:1px; bottom:1px; color:#7db7ff; }
      .selector-habilidad-etapa5 { outline:2px solid #73d63d !important; box-shadow:inset 0 0 0 1px #152c0f !important; }
      .selector-habilidad-invalido-etapa5 { outline-color:#c94a4a !important; }
    `;
    document.head.append(estilos);
  }
}

function obtenerOCrearContenedor() {
  const selectores = [
    "#barra-habilidades",
    ".barra-habilidades",
    "[data-barra-habilidades]",
  ];
  for (const selector of selectores) {
    const elemento = document.querySelector(selector);
    if (elemento) {
      return elemento;
    }
  }

  const contenedor = document.createElement("div");
  contenedor.id = "barra-habilidades-etapa5";
  contenedor.className = "barra-habilidades-etapa5";
  contenedor.dataset.barraHabilidades = "etapa5";
  document.body.append(contenedor);
  return contenedor;
}

function obtenerOCrearRanuras(contenedor) {
  const candidatas = Array.from(
    contenedor.querySelectorAll(
      "[data-ranura-habilidad], .ranura-habilidad, .slot-habilidad, .habilidad-slot",
    ),
  );

  if (candidatas.length >= 10) {
    return candidatas.slice(0, 10);
  }

  if (candidatas.length === 0) {
    for (let indice = 0; indice < 10; indice += 1) {
      const ranura = document.createElement("button");
      ranura.type = "button";
      ranura.className = "ranura-habilidad";
      ranura.dataset.ranuraHabilidad = String(indice);
      contenedor.append(ranura);
      candidatas.push(ranura);
    }
  } else {
    while (candidatas.length < 10) {
      const ranura = document.createElement("button");
      ranura.type = "button";
      ranura.className = "ranura-habilidad";
      ranura.dataset.ranuraHabilidad = String(candidatas.length);
      contenedor.append(ranura);
      candidatas.push(ranura);
    }
  }

  contenedor.classList.add("barra-habilidades-etapa5");
  return candidatas.slice(0, 10);
}

function crearTitulo(ranura) {
  if (!ranura.idHabilidad) {
    return `Ranura ${ranura.tecla}: vacía`;
  }
  const partes = [
    `${ranura.nombre} — grado ${ranura.grado}`,
    ranura.descripcion,
    ranura.costoMana !== null ? `Maná: ${ranura.costoMana}` : "",
    ranura.configurada ? "Lista para usar" : "Contenido pendiente",
  ];
  return partes.filter(Boolean).join("\n");
}

function actualizarSelectorMapa(seleccion) {
  limpiarSelectorMapa();
  if (!seleccion) {
    return;
  }

  const selectores = [
    `[data-x="${seleccion.x}"][data-y="${seleccion.y}"]`,
    `[data-columna="${seleccion.x}"][data-fila="${seleccion.y}"]`,
    `[data-pos-x="${seleccion.x}"][data-pos-y="${seleccion.y}"]`,
  ];

  for (const selector of selectores) {
    const casilla = document.querySelector(selector);
    if (casilla) {
      casilla.classList.add("selector-habilidad-etapa5");
      if (!seleccion.objetivoValido || !seleccion.geometria?.puedeEjecutar) {
        casilla.classList.add("selector-habilidad-invalido-etapa5");
      }
      return;
    }
  }
}

function limpiarSelectorMapa() {
  document
    .querySelectorAll(
      ".selector-habilidad-etapa5, .selector-habilidad-invalido-etapa5",
    )
    .forEach((elemento) => {
      elemento.classList.remove(
        "selector-habilidad-etapa5",
        "selector-habilidad-invalido-etapa5",
      );
    });
}
