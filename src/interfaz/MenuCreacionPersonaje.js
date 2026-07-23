import {
  crearAtributosIniciales,
  generarAtributosAleatorios,
} from "../juego/generacion/GeneradorAtributos.js";
import {
  aplicarSeleccionEquipoAProfesion,
  calcularResumenSeleccionEquipo,
  crearSeleccionEquipoAleatorio,
  crearSeleccionEquipoRecomendado,
} from "../juego/generacion/GeneradorEquipoInicial.js";

const ID_HOJA_ESTILOS = "menuCreacionPersonajeStyles";
const RUTA_HOJA_ESTILOS = "./menu-creacion-personaje.css";

/**
 * Administra la pantalla de creación del personaje.
 *
 * La clase coordina:
 * - Nombre y profesión.
 * - Distribución manual o aleatoria de atributos.
 * - Vista previa de profesión, equipamiento e inventario.
 * - Selección recomendada o alternativa del equipo inicial.
 * - Una única generación aleatoria de equipo por profesión.
 * - Confirmación de los datos finales del personaje.
 */
export class MenuCreacionPersonaje {
  constructor({
    configuracion,
    configuracionObjetos,
    configuracionGeneracionObjetos,
    alConfirmar,
  }) {
    this.configuracion = configuracion;
    this.configuracionObjetos = configuracionObjetos;
    this.configuracionGeneracionObjetos = configuracionGeneracionObjetos;

    this.alConfirmar =
      typeof alConfirmar === "function" ? alConfirmar : () => {};

    this.idProfesionSeleccionada = configuracion.profesionInicial;

    this.atributos = crearAtributosIniciales(configuracion);

    // Conservamos por separado:
    // - la selección actualmente visible;
    // - la única tirada aleatoria obtenida por profesión.
    //
    // Volver al conjunto recomendado no genera una nueva tirada.
    this.seleccionesEquipo = new Map();
    this.tiradasEquipoAleatorio = new Map();

    this.prepararEstructuraInterfaz();
    this.obtenerElementos();
    this.inicializarSeleccionEquipo();
    this.cargarProfesiones();
    this.configurarEventos();
    this.renderizarTodo();
  }

  // Agrega la hoja de estilos y construye una segunda columna
  // sin obligar a modificar el HTML general de la partida.
  prepararEstructuraInterfaz() {
    this.agregarHojaEstilos();

    const panel = document.getElementById("characterCreation");

    if (!panel) {
      throw new Error("No existe el panel de creación del personaje.");
    }

    if (document.getElementById("creationLayout")) {
      return;
    }

    panel.classList.add("panel-creacion--ampliado");

    const tituloJuego = panel.querySelector("h1");
    const tituloCreacion = panel.querySelector("h2");

    const elementosFormulario = [...panel.children].filter(
      (elemento) => elemento !== tituloJuego && elemento !== tituloCreacion,
    );

    const distribucion = document.createElement("div");
    distribucion.id = "creationLayout";
    distribucion.className = "distribucion-creacion";

    const columnaFormulario = document.createElement("div");
    columnaFormulario.className =
      "columna-creacion columna-creacion--formulario";

    for (const elemento of elementosFormulario) {
      columnaFormulario.appendChild(elemento);
    }

    const columnaEquipo = document.createElement("aside");
    columnaEquipo.id = "creationEquipmentPanel";
    columnaEquipo.className = "columna-creacion columna-creacion--equipo";
    columnaEquipo.innerHTML = this.crearPlantillaEquipo();

    distribucion.append(columnaFormulario, columnaEquipo);

    panel.appendChild(distribucion);
  }

  agregarHojaEstilos() {
    if (document.getElementById(ID_HOJA_ESTILOS)) {
      return;
    }

    const enlace = document.createElement("link");
    enlace.id = ID_HOJA_ESTILOS;
    enlace.rel = "stylesheet";
    enlace.href = RUTA_HOJA_ESTILOS;
    document.head.appendChild(enlace);
  }

  crearPlantillaEquipo() {
    return `
            <header class="cabecera-profesion-creacion">
                <img
                    id="creationProfessionImage"
                    class="imagen-profesion-creacion"
                    alt=""
                />
                <div>
                    <p class="etiqueta-creacion">Profesión seleccionada</p>
                    <h3 id="selectedProfessionName"></h3>
                    <p id="selectedProfessionDescription"></p>
                    <p
                        id="selectedProfessionStyle"
                        class="estilo-profesion-creacion"
                    ></p>
                </div>
            </header>

            <section class="bloque-equipo-creacion">
                <div class="cabecera-conjunto-creacion">
                    <div>
                        <p class="etiqueta-creacion">Conjunto inicial</p>
                        <h3 id="equipmentSetName"></h3>
                    </div>
                    <span
                        id="equipmentSetOrigin"
                        class="origen-conjunto-creacion"
                    ></span>
                </div>

                <p id="equipmentSetDescription"></p>

                <div
                    id="equipmentSummary"
                    class="resumen-equipo-creacion"
                ></div>

                <h4>Equipado</h4>
                <div
                    id="initialEquipmentContainer"
                    class="lista-objetos-creacion"
                ></div>

                <h4>Inventario</h4>
                <div
                    id="initialInventoryContainer"
                    class="lista-objetos-creacion"
                ></div>

                <div class="acciones-equipo-creacion">
                    <button
                        id="recommendedEquipmentButton"
                        type="button"
                    >
                        Equipo recomendado
                    </button>
                    <button
                        id="randomEquipmentButton"
                        type="button"
                    >
                        Tirar equipo alternativo
                    </button>
                </div>

                <p
                    id="randomEquipmentStatus"
                    class="estado-equipo-aleatorio"
                    aria-live="polite"
                ></p>
            </section>
        `;
  }

  obtenerElementos() {
    this.inputNombre = document.getElementById("playerName");
    this.selectorProfesion = document.getElementById("professionSelect");
    this.contenedorAtributos = document.getElementById("attributesContainer");
    this.textoPuntosRestantes = document.getElementById("pointsRemaining");
    this.botonReiniciar = document.getElementById("resetAttributesButton");
    this.botonAleatorio = document.getElementById("randomAttributesButton");
    this.botonComenzar = document.getElementById("startGameButton");
    this.textoMensaje = document.getElementById("creationMessage");

    this.imagenProfesion = document.getElementById("creationProfessionImage");
    this.textoNombreProfesion = document.getElementById(
      "selectedProfessionName",
    );
    this.textoDescripcionProfesion = document.getElementById(
      "selectedProfessionDescription",
    );
    this.textoEstiloProfesion = document.getElementById(
      "selectedProfessionStyle",
    );
    this.textoNombreConjunto = document.getElementById("equipmentSetName");
    this.textoOrigenConjunto = document.getElementById("equipmentSetOrigin");
    this.textoDescripcionConjunto = document.getElementById(
      "equipmentSetDescription",
    );
    this.contenedorResumenEquipo = document.getElementById("equipmentSummary");
    this.contenedorEquipoInicial = document.getElementById(
      "initialEquipmentContainer",
    );
    this.contenedorInventarioInicial = document.getElementById(
      "initialInventoryContainer",
    );
    this.botonEquipoRecomendado = document.getElementById(
      "recommendedEquipmentButton",
    );
    this.botonEquipoAleatorio = document.getElementById(
      "randomEquipmentButton",
    );
    this.textoEstadoEquipoAleatorio = document.getElementById(
      "randomEquipmentStatus",
    );
  }

  inicializarSeleccionEquipo() {
    const seleccion = crearSeleccionEquipoRecomendado({
      configuracionPersonaje: this.configuracion,
      idProfesion: this.idProfesionSeleccionada,
    });

    this.seleccionesEquipo.set(this.idProfesionSeleccionada, seleccion);
  }

  cargarProfesiones() {
    this.selectorProfesion.innerHTML = "";

    Object.entries(this.configuracion.profesiones).forEach(
      ([idProfesion, profesion]) => {
        const opcion = document.createElement("option");
        opcion.value = idProfesion;
        opcion.textContent = profesion.nombre;
        opcion.selected = idProfesion === this.idProfesionSeleccionada;

        this.selectorProfesion.appendChild(opcion);
      },
    );
  }

  configurarEventos() {
    this.selectorProfesion.addEventListener("change", () => {
      this.idProfesionSeleccionada = this.selectorProfesion.value;

      this.asegurarSeleccionEquipoActual();
      this.renderizarProfesion();
      this.renderizarEquipoInicial();
      this.mostrarMensaje("");
    });

    this.inputNombre.addEventListener("input", () => {
      this.actualizarBotonComenzar();
      this.mostrarMensaje("");
    });

    this.botonReiniciar.addEventListener("click", () => {
      this.atributos = crearAtributosIniciales(this.configuracion);
      this.renderizarAtributos();
      this.mostrarMensaje("");
    });

    this.botonAleatorio.addEventListener("click", () => {
      this.atributos = generarAtributosAleatorios(
        this.configuracion,
        this.idProfesionSeleccionada,
      );
      this.renderizarAtributos();
      this.mostrarMensaje("");
    });

    this.contenedorAtributos.addEventListener("click", (event) => {
      const boton = event.target.closest("button[data-accion]");

      if (!boton) {
        return;
      }

      const idAtributo = boton.dataset.atributo;
      const accion = boton.dataset.accion;

      if (accion === "sumar") {
        this.modificarAtributo(idAtributo, 1);
      }

      if (accion === "restar") {
        this.modificarAtributo(idAtributo, -1);
      }
    });

    this.botonEquipoRecomendado.addEventListener("click", () => {
      const seleccion = crearSeleccionEquipoRecomendado({
        configuracionPersonaje: this.configuracion,
        idProfesion: this.idProfesionSeleccionada,
      });

      this.seleccionesEquipo.set(this.idProfesionSeleccionada, seleccion);

      this.renderizarEquipoInicial();
      this.mostrarMensaje("");
    });

    this.botonEquipoAleatorio.addEventListener("click", () => {
      this.seleccionarEquipoAleatorio();
    });

    this.botonComenzar.addEventListener("click", () => {
      this.confirmarPersonaje();
    });
  }

  seleccionarEquipoAleatorio() {
    let seleccion = this.tiradasEquipoAleatorio.get(
      this.idProfesionSeleccionada,
    );

    if (!seleccion) {
      seleccion = crearSeleccionEquipoAleatorio({
        configuracionPersonaje: this.configuracion,
        configuracionObjetos: this.configuracionObjetos,
        configuracionGeneracionObjetos: this.configuracionGeneracionObjetos,
        idProfesion: this.idProfesionSeleccionada,
      });

      this.tiradasEquipoAleatorio.set(this.idProfesionSeleccionada, seleccion);
    }

    this.seleccionesEquipo.set(this.idProfesionSeleccionada, seleccion);

    this.renderizarEquipoInicial();
    this.mostrarMensaje("");
  }

  asegurarSeleccionEquipoActual() {
    if (this.seleccionesEquipo.has(this.idProfesionSeleccionada)) {
      return;
    }

    const seleccion = crearSeleccionEquipoRecomendado({
      configuracionPersonaje: this.configuracion,
      idProfesion: this.idProfesionSeleccionada,
    });

    this.seleccionesEquipo.set(this.idProfesionSeleccionada, seleccion);
  }

  modificarAtributo(idAtributo, cambio) {
    if (!(idAtributo in this.atributos)) {
      return;
    }

    const configuracionAtributos = this.configuracion.atributos;
    const valorActual = this.atributos[idAtributo];
    const nuevoValor = valorActual + cambio;

    if (
      nuevoValor < configuracionAtributos.valorMinimo ||
      nuevoValor > configuracionAtributos.valorMaximo
    ) {
      return;
    }

    if (cambio > 0 && this.calcularPuntosRestantes() <= 0) {
      return;
    }

    this.atributos[idAtributo] = nuevoValor;
    this.renderizarAtributos();
    this.mostrarMensaje("");
  }

  calcularPuntosRestantes() {
    const configuracionAtributos = this.configuracion.atributos;

    const puntosGastados = Object.values(this.atributos).reduce(
      (total, valorActual) => {
        const puntosDelAtributo =
          valorActual - configuracionAtributos.valorInicial;

        return total + puntosDelAtributo;
      },
      0,
    );

    return configuracionAtributos.puntosDisponibles - puntosGastados;
  }

  renderizarTodo() {
    this.renderizarAtributos();
    this.renderizarProfesion();
    this.renderizarEquipoInicial();
  }

  renderizarAtributos() {
    this.contenedorAtributos.innerHTML = "";

    const configuracionAtributos = this.configuracion.atributos;
    const puntosRestantes = this.calcularPuntosRestantes();

    configuracionAtributos.lista.forEach((atributo) => {
      const valorActual = this.atributos[atributo.id];

      const fila = document.createElement("div");
      fila.className = "fila-atributo";

      const nombre = document.createElement("span");
      nombre.className = "nombre-atributo";
      nombre.textContent = atributo.nombre;

      const botonRestar = document.createElement("button");
      botonRestar.type = "button";
      botonRestar.textContent = "−";
      botonRestar.dataset.accion = "restar";
      botonRestar.dataset.atributo = atributo.id;
      botonRestar.disabled = valorActual <= configuracionAtributos.valorMinimo;

      const valor = document.createElement("span");
      valor.className = "valor-atributo";
      valor.textContent = valorActual;

      const botonSumar = document.createElement("button");
      botonSumar.type = "button";
      botonSumar.textContent = "+";
      botonSumar.dataset.accion = "sumar";
      botonSumar.dataset.atributo = atributo.id;
      botonSumar.disabled =
        puntosRestantes <= 0 ||
        valorActual >= configuracionAtributos.valorMaximo;

      fila.append(nombre, botonRestar, valor, botonSumar);

      this.contenedorAtributos.appendChild(fila);
    });

    this.textoPuntosRestantes.textContent = puntosRestantes;

    this.actualizarBotonComenzar();
  }

  renderizarProfesion() {
    const profesion =
      this.configuracion.profesiones[this.idProfesionSeleccionada];

    this.textoNombreProfesion.textContent = profesion.nombre;
    this.textoDescripcionProfesion.textContent = profesion.descripcion ?? "";
    this.textoEstiloProfesion.textContent = profesion.estiloJuego ?? "";

    if (profesion.recursoVisual) {
      this.imagenProfesion.src = profesion.recursoVisual;
      this.imagenProfesion.alt = `Vista de ${profesion.nombre}`;
      this.imagenProfesion.hidden = false;
      this.imagenProfesion.onerror = () => {
        this.imagenProfesion.hidden = true;
      };
    } else {
      this.imagenProfesion.hidden = true;
    }
  }

  renderizarEquipoInicial() {
    this.asegurarSeleccionEquipoActual();

    const seleccion = this.seleccionesEquipo.get(this.idProfesionSeleccionada);

    const resumen = calcularResumenSeleccionEquipo({
      seleccion,
      configuracionObjetos: this.configuracionObjetos,
    });

    this.textoNombreConjunto.textContent = seleccion.nombre;
    this.textoDescripcionConjunto.textContent = seleccion.descripcion;
    this.textoOrigenConjunto.textContent =
      seleccion.origen === "aleatorio" ? "Alternativo" : "Recomendado";
    this.textoOrigenConjunto.dataset.origen = seleccion.origen;

    this.renderizarResumenEquipo(resumen);
    this.renderizarListaObjetos({
      contenedor: this.contenedorEquipoInicial,
      objetos: resumen.objetos.equipamiento,
      mensajeVacio: "No hay objetos equipados.",
    });
    this.renderizarListaObjetos({
      contenedor: this.contenedorInventarioInicial,
      objetos: resumen.objetos.inventario,
      mensajeVacio: "El inventario inicial está vacío.",
    });

    this.actualizarEstadoEquipoAleatorio(seleccion);
  }

  renderizarResumenEquipo(resumen) {
    this.contenedorResumenEquipo.innerHTML = "";

    const arma = resumen.armaPrincipal;

    const datos = [
      {
        etiqueta: "Armadura",
        valor: resumen.armaduraTotal,
      },
      {
        etiqueta: "Daño base",
        valor: arma
          ? `${arma.propiedades.danioFisicoMinimo}-${arma.propiedades.danioFisicoMaximo}`
          : "—",
      },
      {
        etiqueta: "Alcance",
        valor: arma ? arma.propiedades.alcance : "—",
      },
      {
        etiqueta: "Mágicos",
        valor: resumen.cantidadObjetosMagicos,
      },
    ];

    for (const dato of datos) {
      const tarjeta = document.createElement("div");
      tarjeta.className = "dato-resumen-equipo";

      const etiqueta = document.createElement("span");
      etiqueta.textContent = dato.etiqueta;

      const valor = document.createElement("strong");
      valor.textContent = dato.valor;

      tarjeta.append(etiqueta, valor);
      this.contenedorResumenEquipo.appendChild(tarjeta);
    }
  }

  renderizarListaObjetos({ contenedor, objetos, mensajeVacio }) {
    contenedor.innerHTML = "";

    if (objetos.length === 0) {
      const mensaje = document.createElement("p");
      mensaje.className = "objeto-creacion-vacio";
      mensaje.textContent = mensajeVacio;
      contenedor.appendChild(mensaje);
      return;
    }

    for (const objeto of objetos) {
      contenedor.appendChild(this.crearTarjetaObjeto(objeto));
    }
  }

  crearTarjetaObjeto(objeto) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-objeto-creacion";
    tarjeta.dataset.rareza = objeto.rareza ?? "comun";

    const imagen = document.createElement("img");
    imagen.className = "icono-objeto-creacion";
    imagen.alt = "";

    if (objeto.recursoVisual) {
      imagen.src = objeto.recursoVisual;
      imagen.onerror = () => {
        imagen.hidden = true;
      };
    } else {
      imagen.hidden = true;
    }

    const contenido = document.createElement("div");

    const nombre = document.createElement("strong");
    nombre.textContent = objeto.nombreCompleto ?? objeto.nombre;

    const metadatos = document.createElement("span");
    metadatos.className = "metadatos-objeto-creacion";
    metadatos.textContent = this.crearTextoMetadatosObjeto(objeto);

    const detalle = document.createElement("span");
    detalle.className = "detalle-objeto-creacion";
    detalle.textContent = this.crearTextoDetalleObjeto(objeto);

    contenido.append(nombre, metadatos, detalle);
    tarjeta.append(imagen, contenido);

    return tarjeta;
  }

  crearTextoMetadatosObjeto(objeto) {
    const partes = [
      this.capitalizar(objeto.tipo),
      `Tier ${objeto.tierBase ?? 1}`,
    ];

    if (objeto.rareza && objeto.rareza !== "comun") {
      partes.push(this.capitalizar(objeto.rareza));
    }

    if (objeto.cantidad > 1) {
      partes.push(`Cantidad ${objeto.cantidad}`);
    }

    return partes.join(" · ");
  }

  crearTextoDetalleObjeto(objeto) {
    if (objeto.esArma) {
      return (
        `Daño ${objeto.propiedades.danioFisicoMinimo}-` +
        `${objeto.propiedades.danioFisicoMaximo} · ` +
        `Alcance ${objeto.propiedades.alcance}`
      );
    }

    if (objeto.esArmadura) {
      const armadura = objeto.propiedades.armadura ?? 0;
      const bloqueo = objeto.propiedades.probabilidadBloqueo ?? 0;

      return bloqueo > 0
        ? `Armadura ${armadura} · Bloqueo ${bloqueo}%`
        : `Armadura ${armadura}`;
    }

    if (objeto.esQuiver) {
      return `Flechas incluidas: ${objeto.cantidadMunicion}`;
    }

    if (objeto.esConsumible) {
      return "Consumible inicial";
    }

    return objeto.descripcion ?? "";
  }

  actualizarEstadoEquipoAleatorio(seleccion) {
    const tirada = this.tiradasEquipoAleatorio.get(
      this.idProfesionSeleccionada,
    );

    if (!tirada) {
      this.botonEquipoAleatorio.textContent = "Tirar equipo alternativo";
      this.textoEstadoEquipoAleatorio.textContent =
        "Podés realizar una única tirada de equipo para esta profesión.";
      this.textoEstadoEquipoAleatorio.dataset.estado = "disponible";
      return;
    }

    this.botonEquipoAleatorio.textContent = "Usar equipo obtenido";

    if (tirada.objetoMagico) {
      this.textoEstadoEquipoAleatorio.textContent = `Tirada utilizada. Obtuviste: ${tirada.objetoMagico.nombre}.`;
      this.textoEstadoEquipoAleatorio.dataset.estado = "magico";
      return;
    }

    this.textoEstadoEquipoAleatorio.textContent =
      "Tirada utilizada. El conjunto alternativo no obtuvo un objeto mágico.";
    this.textoEstadoEquipoAleatorio.dataset.estado =
      seleccion.origen === "aleatorio" ? "seleccionado" : "utilizado";
  }

  actualizarBotonComenzar() {
    const nombreValido = this.inputNombre.value.trim() !== "";
    const puntosDistribuidos = this.calcularPuntosRestantes() === 0;
    const equipoSeleccionado = this.seleccionesEquipo.has(
      this.idProfesionSeleccionada,
    );

    this.botonComenzar.disabled = !(
      nombreValido &&
      puntosDistribuidos &&
      equipoSeleccionado
    );
  }

  confirmarPersonaje() {
    const nombre = this.inputNombre.value.trim();

    if (nombre === "") {
      this.mostrarMensaje("Debés ingresar un nombre.");
      return;
    }

    if (this.calcularPuntosRestantes() !== 0) {
      this.mostrarMensaje("Debés distribuir todos los puntos.");
      return;
    }

    const profesion =
      this.configuracion.profesiones[this.idProfesionSeleccionada];

    const seleccion = this.seleccionesEquipo.get(this.idProfesionSeleccionada);

    if (!seleccion) {
      this.mostrarMensaje("Debés seleccionar un conjunto inicial.");
      return;
    }

    aplicarSeleccionEquipoAProfesion({
      configuracionPersonaje: this.configuracion,
      idProfesion: this.idProfesionSeleccionada,
      seleccion,
    });

    const datosPersonaje = {
      nombre,
      idProfesion: this.idProfesionSeleccionada,
      clasePersonaje: profesion.nombre,
      atributos: {
        ...this.atributos,
      },
      equipoInicial: this.copiarProfundo(seleccion),
    };

    this.alConfirmar(datosPersonaje);
  }

  mostrarMensaje(mensaje) {
    this.textoMensaje.textContent = mensaje;
  }

  capitalizar(texto) {
    if (typeof texto !== "string" || texto === "") {
      return "";
    }

    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  copiarProfundo(valor) {
    return JSON.parse(JSON.stringify(valor));
  }
}
