// Importamos las funciones encargadas de crear
// y distribuir los atributos del personaje.
import {
  crearAtributosIniciales,
  generarAtributosAleatorios
} from "../juego/GeneradorAtributos.js";

/**
 * Administra la pantalla de creación del personaje.
 *
 * Esta clase se ocupa de:
 * - Cargar las profesiones.
 * - Mostrar los atributos.
 * - Distribuir puntos manualmente.
 * - Distribuir puntos aleatoriamente.
 * - Validar cuándo puede comenzar la partida.
 */
export class MenuCreacionPersonaje {
  /**
   * @param {Object} opciones Opciones necesarias para crear el menú.
   * @param {Object} opciones.configuracion Configuración cargada desde JSON.
   * @param {Function} opciones.alConfirmar Función que se ejecutará
   * cuando el jugador termine la creación.
   */
  constructor({
    configuracion,
    alConfirmar
  }) {
    // Guardamos la configuración completa leída desde el JSON.
    this.configuracion = configuracion;

    // Guardamos la función que recibirá el personaje terminado.
    // Si no se proporciona una función, utilizamos una función vacía.
    this.alConfirmar =
      typeof alConfirmar === "function"
        ? alConfirmar
        : () => {};

    // La profesión inicial también se obtiene desde el JSON.
    this.idProfesionSeleccionada =
      configuracion.profesionInicial;

    // Todos los atributos comienzan con el valor inicial
    // definido en configuracionPersonaje.json.
    this.atributos =
      crearAtributosIniciales(configuracion);

    // Obtenemos todos los elementos HTML que utilizará el menú.
    this.inputNombre =
      document.getElementById("playerName");

    this.selectorProfesion =
      document.getElementById("professionSelect");

    this.contenedorAtributos =
      document.getElementById("attributesContainer");

    this.textoPuntosRestantes =
      document.getElementById("pointsRemaining");

    this.botonReiniciar =
      document.getElementById("resetAttributesButton");

    this.botonAleatorio =
      document.getElementById("randomAttributesButton");

    this.botonComenzar =
      document.getElementById("startGameButton");

    this.textoMensaje =
      document.getElementById("creationMessage");

    // Construimos y activamos el menú.
    this.cargarProfesiones();
    this.configurarEventos();
    this.renderizarAtributos();
  }

  /**
   * Carga en el selector todas las profesiones
   * encontradas dentro del archivo JSON.
   */
  cargarProfesiones() {
    // Eliminamos la opción temporal
    // "Cargando profesiones...".
    this.selectorProfesion.innerHTML = "";

    // Object.entries devuelve pares con:
    // [idProfesion, datosProfesion].
    Object.entries(
      this.configuracion.profesiones
    ).forEach(([idProfesion, profesion]) => {
      const opcion = document.createElement("option");

      // El valor interno será "guerrero", "rogue" o "mago".
      opcion.value = idProfesion;

      // El texto visible será "Guerrero", "Rogue" o "Mago".
      opcion.textContent = profesion.nombre;

      // Marcamos como seleccionada la profesión inicial
      // definida dentro del JSON.
      opcion.selected =
        idProfesion === this.idProfesionSeleccionada;

      this.selectorProfesion.appendChild(opcion);
    });
  }

  /**
   * Configura los eventos de los controles del menú.
   */
  configurarEventos() {
    // Guardamos la nueva profesión seleccionada.
    //
    // Cambiar de profesión no modifica los atributos
    // distribuidos manualmente por el jugador.
    this.selectorProfesion.addEventListener(
      "change",
      () => {
        this.idProfesionSeleccionada =
          this.selectorProfesion.value;

        this.mostrarMensaje("");
      }
    );

    // Cada vez que cambia el nombre, comprobamos
    // si el jugador puede comenzar la partida.
    this.inputNombre.addEventListener(
      "input",
      () => {
        this.actualizarBotonComenzar();
        this.mostrarMensaje("");
      }
    );

    // Restablecemos todos los atributos.
    this.botonReiniciar.addEventListener(
      "click",
      () => {
        this.atributos =
          crearAtributosIniciales(
            this.configuracion
          );

        this.renderizarAtributos();
        this.mostrarMensaje("");
      }
    );

    // Generamos una distribución aleatoria utilizando
    // la profesión que esté seleccionada actualmente.
    this.botonAleatorio.addEventListener(
      "click",
      () => {
        this.atributos =
          generarAtributosAleatorios(
            this.configuracion,
            this.idProfesionSeleccionada
          );

        this.renderizarAtributos();
        this.mostrarMensaje("");
      }
    );

    // Utilizamos un único evento para todos los botones
    // de sumar y restar atributos.
    this.contenedorAtributos.addEventListener(
      "click",
      (event) => {
        // Buscamos el botón presionado.
        const boton = event.target.closest(
          "button[data-accion]"
        );

        // Si el clic no ocurrió sobre uno de esos botones,
        // no hacemos nada.
        if (!boton) {
          return;
        }

        const idAtributo =
          boton.dataset.atributo;

        const accion =
          boton.dataset.accion;

        if (accion === "sumar") {
          this.modificarAtributo(
            idAtributo,
            1
          );
        }

        if (accion === "restar") {
          this.modificarAtributo(
            idAtributo,
            -1
          );
        }
      }
    );

    // Confirmamos la creación del personaje.
    this.botonComenzar.addEventListener(
      "click",
      () => {
        this.confirmarPersonaje();
      }
    );
  }

  /**
   * Suma o resta un punto a un atributo.
   *
   * @param {string} idAtributo Atributo que será modificado.
   * @param {number} cambio Debe ser 1 o -1.
   */
  modificarAtributo(
    idAtributo,
    cambio
  ) {
    // Verificamos que el atributo exista.
    if (!(idAtributo in this.atributos)) {
      return;
    }

    const configuracionAtributos =
      this.configuracion.atributos;

    const valorActual =
      this.atributos[idAtributo];

    const nuevoValor =
      valorActual + cambio;

    // No permitimos bajar del mínimo configurado.
    if (
      nuevoValor <
      configuracionAtributos.valorMinimo
    ) {
      return;
    }

    // No permitimos superar el máximo configurado.
    if (
      nuevoValor >
      configuracionAtributos.valorMaximo
    ) {
      return;
    }

    // Para sumar, debe quedar al menos un punto disponible.
    if (
      cambio > 0 &&
      this.calcularPuntosRestantes() <= 0
    ) {
      return;
    }

    // Aplicamos el cambio.
    this.atributos[idAtributo] =
      nuevoValor;

    // Volvemos a dibujar los atributos y botones.
    this.renderizarAtributos();
    this.mostrarMensaje("");
  }

  /**
   * Calcula cuántos puntos quedan sin distribuir.
   *
   * @returns {number} Cantidad de puntos restantes.
   */
  calcularPuntosRestantes() {
    const configuracionAtributos =
      this.configuracion.atributos;

    // Calculamos cuántos puntos se han gastado por encima
    // del valor inicial de cada atributo.
    const puntosGastados =
      Object.values(this.atributos).reduce(
        (total, valorActual) => {
          const puntosDelAtributo =
            valorActual -
            configuracionAtributos.valorInicial;

          return total + puntosDelAtributo;
        },
        0
      );

    return (
      configuracionAtributos.puntosDisponibles -
      puntosGastados
    );
  }

  /**
   * Dibuja todas las filas de atributos en el HTML.
   */
  renderizarAtributos() {
    // Eliminamos las filas anteriores.
    this.contenedorAtributos.innerHTML = "";

    const configuracionAtributos =
      this.configuracion.atributos;

    const puntosRestantes =
      this.calcularPuntosRestantes();

    // Recorremos los atributos definidos en el JSON.
    configuracionAtributos.lista.forEach(
      (atributo) => {
        const valorActual =
          this.atributos[atributo.id];

        // Creamos el contenedor de la fila.
        const fila =
          document.createElement("div");

        fila.className = "fila-atributo";

        // Nombre visible del atributo.
        const nombre =
          document.createElement("span");

        nombre.className = "nombre-atributo";
        nombre.textContent = atributo.nombre;

        // Botón para restar un punto.
        const botonRestar =
          document.createElement("button");

        botonRestar.type = "button";
        botonRestar.textContent = "−";
        botonRestar.dataset.accion = "restar";
        botonRestar.dataset.atributo = atributo.id;

        // No puede restarse por debajo del mínimo.
        botonRestar.disabled =
          valorActual <=
          configuracionAtributos.valorMinimo;

        // Número actual del atributo.
        const valor =
          document.createElement("span");

        valor.className = "valor-atributo";
        valor.textContent = valorActual;

        // Botón para sumar un punto.
        const botonSumar =
          document.createElement("button");

        botonSumar.type = "button";
        botonSumar.textContent = "+";
        botonSumar.dataset.accion = "sumar";
        botonSumar.dataset.atributo = atributo.id;

        // No puede sumarse cuando no quedan puntos
        // o cuando el atributo alcanzó su máximo.
        botonSumar.disabled =
          puntosRestantes <= 0 ||
          valorActual >=
            configuracionAtributos.valorMaximo;

        // Agregamos todos los elementos a la fila.
        fila.append(
          nombre,
          botonRestar,
          valor,
          botonSumar
        );

        // Agregamos la fila al menú.
        this.contenedorAtributos.appendChild(
          fila
        );
      }
    );

    // Actualizamos el contador visible.
    this.textoPuntosRestantes.textContent =
      puntosRestantes;

    // Comprobamos si puede habilitarse
    // el botón para comenzar.
    this.actualizarBotonComenzar();
  }

  /**
   * Habilita el botón solamente cuando:
   * - El nombre no está vacío.
   * - Todos los puntos fueron distribuidos.
   */
  actualizarBotonComenzar() {
    const nombreValido =
      this.inputNombre.value.trim() !== "";

    const puntosDistribuidos =
      this.calcularPuntosRestantes() === 0;

    this.botonComenzar.disabled =
      !nombreValido ||
      !puntosDistribuidos;
  }

  /**
   * Construye el objeto final del personaje
   * y lo envía a game.js.
   */
  confirmarPersonaje() {
    const nombre =
      this.inputNombre.value.trim();

    if (nombre === "") {
      this.mostrarMensaje(
        "Debés ingresar un nombre."
      );

      return;
    }

    if (this.calcularPuntosRestantes() !== 0) {
      this.mostrarMensaje(
        "Debés distribuir todos los puntos."
      );

      return;
    }

    const profesion =
      this.configuracion.profesiones[
        this.idProfesionSeleccionada
      ];

    // Este será el objeto que, en el próximo paso,
    // enviaremos a ConfiguracionInicial.js.
    const datosPersonaje = {
      nombre,

      // Identificador interno usado para consultar el JSON.
      idProfesion:
        this.idProfesionSeleccionada,

      // Nombre visible que utilizará Player por ahora.
      clasePersonaje:
        profesion.nombre,

      // Creamos una copia para evitar que otros objetos
      // modifiquen directamente los valores del menú.
      atributos: {
        ...this.atributos
      }
    };

    this.alConfirmar(datosPersonaje);
  }

  /**
   * Muestra un mensaje dentro del menú.
   *
   * @param {string} mensaje Texto que será mostrado.
   */
  mostrarMensaje(mensaje) {
    this.textoMensaje.textContent =
      mensaje;
  }
}