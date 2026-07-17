// Representa cualquier espacio capaz de almacenar objetos.
//
// Puede utilizarse como:
//
// - Inventario del jugador.
// - Contenido de un cofre.
// - Mochila de un enemigo.
// - Contenido interno de un quiver.
export class ContenedorObjetos {
  constructor({ capacidad, objetosIniciales = [] } = {}) {
    if (!Number.isInteger(capacidad) || capacidad <= 0) {
      throw new Error("La capacidad del contenedor debe ser mayor que 0.");
    }

    if (!Array.isArray(objetosIniciales)) {
      throw new Error("Los objetos iniciales deben ser una lista.");
    }

    if (objetosIniciales.length > capacidad) {
      throw new Error("El contenedor no tiene capacidad suficiente.");
    }

    this.capacidad = capacidad;
    this.espacios = Array(capacidad).fill(null);

    objetosIniciales.forEach((objeto, indice) => {
      if (!objeto) {
        throw new Error("Un contenedor no puede comenzar con objetos vacíos.");
      }

      this.espacios[indice] = objeto;
    });
  }

  obtenerEspacios() {
    return [...this.espacios];
  }

  obtenerObjetos() {
    return this.espacios.filter(Boolean);
  }

  obtenerObjetoEn(indice) {
    this.validarIndice(indice);

    return this.espacios[indice];
  }

  obtenerPrimerEspacioLibre() {
    return this.espacios.findIndex((objeto) => objeto === null);
  }

  contarEspaciosLibres() {
    return this.espacios.filter((objeto) => objeto === null).length;
  }

  estaLleno() {
    return this.obtenerPrimerEspacioLibre() === -1;
  }

  estaVacio() {
    return this.espacios.every((objeto) => objeto === null);
  }

  agregarObjeto(objeto) {
    if (!objeto) {
      throw new Error("No se puede agregar un objeto vacío.");
    }

    const indiceLibre = this.obtenerPrimerEspacioLibre();

    if (indiceLibre === -1) {
      return false;
    }

    this.espacios[indiceLibre] = objeto;

    return true;
  }

  // Coloca el objeto en una posición concreta.
  //
  // Se utiliza para ocupar nuevamente el espacio
  // que dejó libre un objeto recién equipado.
  colocarObjetoEn(indice, objeto) {
    this.validarIndice(indice);

    if (!objeto) {
      throw new Error("No se puede colocar un objeto vacío.");
    }

    if (this.espacios[indice] !== null) {
      return false;
    }

    this.espacios[indice] = objeto;

    return true;
  }

  retirarObjeto(indice) {
    this.validarIndice(indice);

    const objeto = this.espacios[indice];

    this.espacios[indice] = null;

    return objeto;
  }

  buscarPrimerObjeto(criterio) {
    if (typeof criterio !== "function") {
      throw new Error("La búsqueda necesita una función de criterio.");
    }

    return (
      this.espacios.find((objeto) => objeto !== null && criterio(objeto)) ??
      null
    );
  }

  consumirCantidadObjeto(criterio, cantidad = 1) {
    if (typeof criterio !== "function") {
      throw new Error("El consumo necesita una función de criterio.");
    }

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new Error("La cantidad consumida debe ser mayor que 0.");
    }

    const indice = this.espacios.findIndex(
      (objeto) => objeto !== null && criterio(objeto),
    );

    if (indice === -1) {
      return false;
    }

    const objeto = this.espacios[indice];

    if (!Number.isInteger(objeto.cantidad) || objeto.cantidad < cantidad) {
      return false;
    }

    objeto.cantidad -= cantidad;

    if (objeto.cantidad === 0) {
      this.espacios[indice] = null;
    }

    return true;
  }

  validarIndice(indice) {
    if (!Number.isInteger(indice) || indice < 0 || indice >= this.capacidad) {
      throw new Error("La posición del contenedor no es válida.");
    }
  }
}
