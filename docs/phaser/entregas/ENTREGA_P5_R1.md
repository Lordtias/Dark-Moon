# ENTREGA P5.R1 — BASE VISUAL RECONSTRUIDA Y PUERTAS INTERACTUABLES

Proyecto: Dark Moon  
Fecha: 1 de agosto de 2026  
Base de trabajo: P4 (`d7f0bf618a0dba43fd55723a7260a33b4bdbc91f`)  
Estado: implementada; pendiente de validación manual visual y jugable

---

## 1. Qué se hizo

Esta entrega reconstruye la primera base de P5 desde P4. No reutiliza el compositor visual completo de P5.2R.

Se incorporó:

- una grilla lógica única, independiente de su tamaño visual;
- representación Phaser inicial de 64 × 64 píxeles por casilla;
- pisos agrupados en regiones visuales mayores;
- paredes agrupadas en tramos continuos;
- fachadas y laterales capaces de superponerse a entidades;
- selección táctica por encima de las fachadas;
- una entidad canónica `Puerta`;
- generación de una puerta en Alcantarilla;
- apertura y cierre mediante el sistema normal de interacción;
- cambio real de caminabilidad al abrir o cerrar;
- bloqueo del cierre cuando el paso está ocupado;
- coste temporal relacionado con `factorTiempo` y `factorAccion`;
- cuatro aperturas visuales: norte, sur, este y oeste;
- preparación multicelda para portones futuros;
- compatibilidad del contrato con Canvas 2D.

No se implementaron todavía:

- portones de varias casillas dentro de los mapas;
- llaves, cerraduras, ganzúas o destrucción de puertas;
- enemigos capaces de abrir puertas;
- persistencia permanente del estado de los mapas;
- equipamiento visible por capas;
- recursos gráficos definitivos de la nueva arquitectura.

---

## 2. Separación entre lógica y representación

La posición canónica continúa expresándose como coordenadas de casilla:

```text
x = 4
y = 7
```

Phaser representa actualmente esa separación usando 64 píxeles. El valor visual está centralizado en:

```text
src/interfaz/graficos/phaser/ConfiguracionPhaser.js
```

Cambiar ese valor no modifica por sí mismo:

- movimiento;
- IA;
- combate;
- alcance;
- ocupación;
- generación;
- persistencia del jugador.

Los PNG del personaje y del equipamiento futuro podrán tener una resolución fuente mayor que 64 × 64 y compartir un anclaje común en los pies.

---

## 3. Arquitectura visual

El flujo nuevo es:

```text
matriz canónica
      ↓
AnalizadorArquitecturaVisualPhaser
      ↓
regiones de suelo, tramos de muro, fachadas y puertas
      ↓
CompositorArquitecturaPhaser
      ↓
CompositorMundoPhaser
```

`AnalizadorArquitecturaVisualPhaser` no decide reglas. Solo deriva una lectura visual.

`CompositorArquitecturaPhaser` puede dibujar un tramo de pared de varias casillas como una unidad continua. Las fachadas se ubican en una capa situada delante de las entidades. La selección se mantiene por encima para no perder lectura táctica.

---

## 4. Puertas

### Estado canónico

Una puerta conoce:

- identificador;
- nombre;
- casillas controladas;
- abierta o cerrada;
- orientación horizontal o vertical;
- dirección de apertura;
- coste base de acción.

Una puerta cerrada escribe `#` en sus casillas. Una puerta abierta escribe `.`.

Por eso el mismo mapa utilizado por movimiento e IA refleja el estado real de la puerta. Phaser no decide si la casilla es caminable.

### Acción temporal

Abrir o cerrar utiliza:

```text
TIPOS_ACCION_TEMPORAL.ACCION
```

El coste efectivo se calcula mediante el sistema temporal existente:

```text
coste base × factorTiempo / 100 × factorAccion / 100
```

Ejemplo validado:

```text
100 × 110 / 100 × 120 / 100 = 132
```

Un intento inválido no consume tiempo.

### Cierre ocupado

No se permite cerrar cuando alguna casilla controlada contiene:

- jugador;
- enemigo u otro objetivo vigente;
- otro interactuable.

### Direcciones visuales

- Puerta horizontal: norte o sur.
- Puerta vertical: este u oeste.

La hoja puede desbordar su casilla visual y aparecer delante o detrás de las entidades según la dirección de apertura.

---

## 5. Archivos nuevos

- `src/entidad/interactuable/Puerta.js`
- `src/juego/generacion/GeneradorPuertasMapa.js`
- `src/interfaz/graficos/phaser/AnalizadorArquitecturaVisualPhaser.js`
- `src/interfaz/graficos/phaser/CompositorArquitecturaPhaser.js`

---

## 6. Archivos principales modificados

- `src/config/mapas/mapas.json`
- `src/partida/GestorMapasPartida.js`
- `src/juego/interacciones/TiposInteraccion.js`
- `src/juego/interacciones/SistemaInteracciones.js`
- `src/juego/interacciones/SistemaInteraccionJugador.js`
- `src/juego/Juego.js`
- `src/interfaz/interacciones/AdaptadorInteraccionesDom.js`
- `src/interfaz/graficos/AdaptadorEscenaJuego.js`
- `src/interfaz/graficos/phaser/ConfiguracionPhaser.js`
- `src/interfaz/graficos/phaser/ConversorCoordenadasPhaser.js`
- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`
- `src/juego/configuracion/ValidadorConfiguracionMapas.js`

---

## 7. Verificaciones realizadas

- sintaxis de todos los archivos JavaScript;
- validez de todos los JSON;
- resolución de imports relativos;
- validación completa de `mapas.json`;
- 30 generaciones deterministas de Alcantarilla con puerta;
- compatibilidad entre orientación y dirección de apertura;
- apertura y cierre real sobre la matriz;
- coste temporal 132 con factores 110 y 120;
- rechazo del cierre ocupado sin consumo de acción;
- derivación de regiones y tramos arquitectónicos;
- simulación del compositor con casilla visual de 64;
- representación simulada de las cuatro direcciones de apertura.

El entorno bloqueó la navegación del Chromium local mediante `ERR_BLOCKED_BY_ADMINISTRATOR`. Por ese motivo la validación visual real debe completarse manualmente en el equipo del usuario.

---

## 8. Pruebas manuales obligatorias

### Arranque

1. Abrir el juego normalmente y comprobar Canvas 2D.
2. Abrir con `?render=phaser`.
3. Crear o cargar una partida sin errores de consola.

### Alcantarilla

1. Entrar a Alcantarilla desde nivel 1.
2. Confirmar que aparece una puerta.
3. Acercarse hasta quedar a una casilla.
4. Iniciar la interacción normal.
5. Abrirla y atravesarla.
6. Intentar cerrarla mientras el jugador está en el paso.
7. Confirmar que el cierre se rechaza.
8. Salir del paso y cerrarla.
9. Confirmar que ya no puede atravesarse.
10. Verificar que los enemigos tampoco atraviesan la puerta cerrada.

### Visual

1. Comprobar escalas de 64 × 64.
2. Probar zoom mínimo, inicial y máximo.
3. Revisar paredes continuas y fachadas.
4. Confirmar que una fachada puede ocultar parte del personaje.
5. Confirmar que la selección sigue visible por encima.
6. Observar puertas abiertas hacia las direcciones generadas.
7. Probar redimensionamiento de ventana y cámara.

### Regresión

- combate;
- habilidades;
- interacción con botín;
- portales;
- transición ciudad–mazmorra–ciudad;
- muerte y reinicio;
- persistencia del personaje;
- Canvas 2D.

---

## 9. Git y respaldo

Dentro de esta entrega:

- `main` parte de P4;
- `respaldo-p5-2r` conserva `1140843`;
- GitHub no fue modificado;
- no se creó commit;
- no se realizó push.

Los pasos de publicación están en:

```text
docs/phaser/entregas/GUIA_REEMPLAZO_P5_EN_MAIN.md
```

---

## 10. Criterio para continuar

P5.R1 no debe considerarse cerrada hasta aprobar manualmente:

- escala de 64;
- cámara y cantidad de casillas visibles;
- composición de paredes;
- oclusión;
- interacción con la puerta;
- coste temporal;
- regresión Canvas 2D.

Después corresponderá decidir qué proporciones visuales se ajustan antes de producir recursos definitivos o extender el sistema a otros biomas.
