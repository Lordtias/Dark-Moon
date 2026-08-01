# AVANCE P5.2 — Tiles mejorados por bioma

Proyecto: Dark Moon  
Etapa: P5 — Mundo jugable y mapas grandes  
Bloque: P5.2 — Tiles mejorados por bioma  
Estado: Implementado; validación manual pendiente  
Fecha: 1 de agosto de 2026

---

## 1. Objetivo

Incorporar una familia visual propia para todos los escenarios existentes y dar altura visual a sus paredes sin cambiar mapas, generación, conectividad, ocupación ni reglas jugables.

Los recursos siguen la dirección aprobada:

> Fantasía medieval 2D ilustrada, más detallada y ligeramente más realista, con lectura táctica superior por casillas.

---

## 2. Resultado implementado

P5.1 ya había permitido resolver cada símbolo mediante configuración. P5.2 utiliza ese contrato sin agregar excepciones por nombre visible.

Se incorporaron tiles de 128 × 128 que Phaser reduce a la casilla lógica de 32 × 32.

También se incorporaron doce frentes de pared de 128 × 96, dos por escenario. Phaser los reduce a fachadas de altura moderada dentro de la misma casilla lógica para producir una lectura 2.5D.

### Alcantarilla

- tres variaciones de piedra húmeda;
- muros con piedra oscura, agua y tonos verdosos;
- siete topologías: aislado, extremo, recto, esquina, unión en T, cruce e interior.

### Cementerio

- tres variaciones de tierra fría, hierba seca y terreno desgastado;
- mampostería apagada y funeraria;
- siete topologías de muro.

### Casa del Guerrero

- dos variaciones de tablones y piso rústico;
- muros con estructura de madera resistente;
- siete topologías de muro.

### Fortaleza abandonada

- tres variaciones de piedra, grietas y derrumbe;
- muros oscuros y erosionados;
- siete topologías de muro.

### Sala de guerra

- dos variaciones de losas ordenadas y severas;
- muros fortificados de piedra;
- siete topologías de muro.

### Ciudad Inicial

- dos variaciones de adoquín;
- dos variaciones de césped;
- dos variaciones de madera;
- dos variaciones de tierra;
- siete topologías de mampostería urbana.

La cuadrícula y la decoración vectorial se redujeron para evitar que compitan con el nuevo detalle de las texturas.

### Altura visual de paredes

La pared conserva su topología superior, pero cuando una cara queda expuesta el compositor agrega:

- frente texturado hacia el sur;
- lateral oscuro hacia el este;
- borde superior claro;
- sombra corta al pie.

Los recursos y medidas se declaran mediante `apariencia.phaser.pared.altura` o la configuración equivalente por símbolo. El compositor no identifica biomas por nombre.

Los frentes se dibujan por debajo de zonas, selectores y entidades para evitar que la nueva altura oculte información jugable.

---

## 3. Arquitectura conservada

El flujo continúa siendo:

```text
Mapa canónico
    ↓
Símbolo de la casilla
    ↓
ResolutorTerrenosPhaser
    ↓
Ruta configurada del PNG
    ↓
CompositorMundoPhaser
    ↓
Representación visual de 32 × 32
```

Los PNG no deciden:

- caminabilidad;
- conectividad;
- movimiento;
- ocupación;
- combate;
- IA;
- tiempo;
- experiencia;
- botín;
- persistencia.

Canvas 2D continúa siendo el backend predeterminado y no consume estos PNG ambientales de Phaser.

---

## 4. Archivos de configuración modificados en P5.2

- `src/config/mapas/mapas.json`;
- `src/config/mapas/CiudadInicial.json`.

## 5. Documentación modificada en P5.2

- `README.md`;
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`;
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`.

## 6. Documentación agregada en P5.2

- `assets/licencias/RECURSOS_GENERADOS_P5.md`;
- `docs/phaser/entregas/AVANCE_P5_2.md`;
- `docs/phaser/entregas/recursos/PREVIEW_TILES_P5_2.png`;
- `docs/phaser/entregas/recursos/PREVIEW_CIUDAD_P5_2.png`.

## 7. Recursos agregados o reemplazados

Directorio principal:

```text
assets/imagenes/mundo/
├── alcantarilla/
├── cementerio/
├── casa_guerrero/
├── fortaleza_abandonada/
├── sala_guerra/
└── ciudad/
```

Cada mapa procedural contiene:

```text
estructura_pared.png
terreno_01.png
terreno_02.png
[terreno_03.png]
paredes_altura/
├── frente_01.png
└── frente_02.png
muros/
├── muro_aislado.png
├── muro_extremo.png
├── muro_recto.png
├── muro_esquina.png
├── muro_union_t.png
├── muro_cruce.png
└── muro_interior.png
```

La Ciudad Inicial utiliza además:

```text
adoquin_01.png
adoquin_02.png
cesped_01.png
cesped_02.png
madera_01.png
madera_02.png
tierra_01.png
tierra_02.png
```

Los archivos históricos de Alcantarilla creados para P2 se conservan para no invalidar su entrega documental. La configuración activa referencia la nueva familia de P5.2.

---

## 8. Dependencias

- Phaser 4.2.1 local: sin cambios;
- dependencias nuevas: ninguna;
- instalación: ninguna;
- conexión a internet en ejecución: no necesaria.

---

## 9. Validaciones automatizadas realizadas

### Sintaxis y datos

- 162 archivos JavaScript comprobados mediante `node --check`;
- 21 archivos JSON leídos correctamente;
- cinco plantillas procedurales validadas mediante `validarConfiguracionMapas`;
- Ciudad Inicial validada mediante `validarAparienciaMapa`;
- cinco símbolos de Ciudad resueltos individualmente.

Resultado: **Correcto**.

### Recursos

- 89 rutas de imágenes declaradas en configuraciones de mapas comprobadas;
- ninguna ruta ausente;
- 69 imágenes ambientales nuevas o reemplazadas verificadas en 128 × 128;
- 12 frentes de pared verificados en 128 × 96 con transparencia RGBA;
- 36 variantes de muro verificadas con transparencia real;
- cada mapa procedural expone entre 12 y 13 recursos ambientales;
- Ciudad Inicial expone 18 recursos ambientales.

Resultado: **Correcto**.

### Composición 2.5D sin navegador

Se ejecutó el compositor con una escena Phaser simulada para las cinco plantillas procedurales y la Ciudad Inicial.

- seis escenarios procesados;
- 132 fachadas 2.5D solicitadas en los mapas de prueba;
- carga de recursos resuelta mediante las rutas configuradas;
- destrucción de las capas completada sin error.

Resultado: **Correcto como validación estructural**. No sustituye la partida real.

### Conservación de lógica

Se compararon los JSON actuales con el ZIP base de P4 después de retirar únicamente la sección `apariencia`.

- `src/config/mapas/mapas.json`: lógica no visual idéntica;
- `src/config/mapas/CiudadInicial.json`: lógica no visual idéntica.

Resultado: **Correcto**.

### Publicación estática

Mediante servidor HTTP local se obtuvieron respuestas 200 para:

- `index.html`;
- `game.js`;
- Phaser 4.2.1 local;
- configuraciones JSON;
- tiles de Alcantarilla, Cementerio y Ciudad Inicial.

Resultado: **Correcto**.

### Revisión visual fuera del juego

Se generaron dos vistas de comprobación:

- catálogo de materiales y esquinas;
- composición completa de la Ciudad Inicial a escala de 32 × 32.

Resultado: **Correcto como comprobación previa**. No sustituye la partida real.

---

## 10. Validación manual requerida

Iniciar mediante un servidor HTTP:

```bash
python3 -m http.server 8000
```

Abrir:

```text
http://localhost:8000/?render=phaser
```

### Prueba 1 — Ciudad Inicial

Preparación:

- comenzar o cargar una partida;
- permanecer en la ciudad.

Pasos:

1. recorrer el borde exterior;
2. atravesar las zonas de adoquín;
3. observar césped, madera y tierra;
4. utilizar zoom mínimo y máximo;
5. comprobar que los muros muestran cara frontal y altura sin ocultar al personaje;
6. mover la cámara y recentrar con `H`;
7. redimensionar la ventana.

Resultado esperado:

- los cinco símbolos conservan su posición canónica;
- adoquín, césped, madera y tierra se distinguen claramente;
- los muros forman tramos y esquinas continuos;
- los frentes y laterales aportan altura sin invadir la lectura de casillas;
- la selección continúa siendo visible;
- no hay huecos negros, tiles ausentes ni parpadeos.

Estado obtenido: **Pendiente**.

### Prueba 2 — Cinco mapas procedurales

Repetir para:

- Alcantarilla;
- Cementerio;
- Casa del Guerrero;
- Fortaleza abandonada;
- Sala de guerra.

Pasos:

1. entrar al mapa;
2. recorrer pasillos y habitaciones;
3. observar muros aislados, extremos, rectos y esquinas;
4. combatir;
5. utilizar una habilidad;
6. interactuar con objetos y salidas;
7. volver a la ciudad.

Resultado esperado:

- cada bioma posee identidad propia;
- ninguna textura modifica colisiones o posiciones;
- enemigos, objetos, portales y selección permanecen por encima del terreno;
- la transición reconstruye los recursos del mapa correcto.

Estado obtenido: **Pendiente**.

### Prueba 3 — Mapa máximo

Preparación:

- seleccionar una expedición que genere el tamaño máximo disponible.

Pasos:

1. recorrer los extremos del mapa;
2. desplazar la cámara en las cuatro direcciones;
3. probar zoom mínimo, máximo y recentrado;
4. iniciar selección táctica junto a un borde.

Resultado esperado:

- la cámara respeta los límites;
- no aparece espacio exterior navegable;
- la selección coincide con la casilla correcta;
- no se reduce todo el mapa para hacerlo entrar.

Estado obtenido: **Pendiente**.

### Prueba 4 — Regresión Canvas 2D

Abrir:

```text
http://localhost:8000/?render=canvas2d
```

Pasos:

1. cargar o crear personaje;
2. recorrer ciudad y un mapa;
3. combatir, interactuar, guardar y cargar.

Resultado esperado:

- Canvas 2D mantiene su apariencia histórica;
- no intenta cargar tiles Phaser;
- no cambia ningún resultado jugable.

Estado obtenido: **Pendiente**.

---

## 11. Riesgos pendientes

- un tile puede resultar demasiado detallado al verse dentro del juego, aunque la composición previa mantiene lectura clara;
- alguna topología de muro puede requerir un ajuste visual puntual al combinarse con un mapa procedural real;
- una pantalla pequeña puede necesitar un ajuste de contraste de cuadrícula;
- la validación interactiva completa depende de la prueba manual del usuario.

No existe un riesgo conocido para persistencia o reglas canónicas.

---

## 12. Cierre

P5.2 está implementada, pero P5 no debe considerarse cerrada hasta aprobar la validación manual de los seis escenarios y Canvas 2D.

Después de esa aprobación corresponde:

1. corregir incidencias si existen;
2. crear `docs/phaser/entregas/ENTREGA_P5.md`;
3. proponer el Conventional Commit final de P5;
4. preparar el enlace hacia P6.
