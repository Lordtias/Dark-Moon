# DISEÑO MAESTRO VISUAL DE DARK MOON

Proyecto: Dark Moon
Versión del documento: 1.2
Fecha inicial: 30 de julio de 2026
Última actualización: 31 de julio de 2026
Estado: guía visual principal, editable; decisiones P0 y corte visual P2 incorporados

---

## 1. Propósito

Este documento define el lenguaje visual de Dark Moon.

Debe consultarse antes de diseñar o modificar:

- mapas;
- terrenos;
- paredes;
- puertas;
- portales;
- personajes;
- enemigos;
- objetos;
- habilidades;
- efectos;
- iluminación;
- partículas;
- cámara;
- HUD;
- paneles;
- menús;
- modales;
- iconos;
- animaciones;
- imágenes promocionales internas;
- recursos para Phaser.

Su finalidad es evitar que cada elemento sea diseñado de manera aislada.

El documento no obliga a rehacer inmediatamente los recursos existentes. Define una dirección común para que los recursos nuevos y los reemplazos futuros se acerquen progresivamente al mismo estilo.

---

# 2. VISIÓN VISUAL

## 2.1 Definición breve

Dark Moon debe verse como:

> Un roguelike táctico de fantasía medieval, ilustrado y estilizado, con iluminación clara, atmósfera de aventura oscura y una cuadrícula siempre comprensible.

## 2.2 Definición extensa

El mundo debe transmitir peligro, ruina, magia y exploración, pero no debe ser visualmente tan oscuro que el jugador tenga dificultades para distinguir:

- una casilla;
- un enemigo;
- un objeto;
- una salida;
- una habilidad;
- una zona peligrosa;
- el personaje controlado.

La palabra “Dark” describe principalmente el mundo, sus amenazas y su tono narrativo. No significa que toda la imagen deba ser negra, gris o poco legible.

La apariencia debe combinar:

- materiales medievales reconocibles;
- ilustración limpia;
- colores controlados;
- siluetas claras;
- magia visible;
- sombras suaves;
- contraste funcional;
- detalles suficientes para resultar atractivos;
- simplicidad suficiente para no saturar el tablero.

---

# 3. ESTILO ELEGIDO

## 3.1 Nombre de trabajo

**Fantasía medieval 2D ilustrada, estilizada y luminosa, con lectura táctica por casillas.**

## 3.2 Lo que significa “ilustrada”

Los recursos pueden utilizar:

- degradados suaves;
- texturas pintadas;
- volumen;
- luz;
- sombras;
- materiales diferenciados;
- bordes menos rígidos que el pixel art.

No deben parecer fotografías recortadas.

## 3.3 Lo que significa “estilizada”

Las formas pueden exagerarse para mejorar la lectura:

- espadas más anchas;
- escudos más reconocibles;
- cascos con siluetas marcadas;
- manos o cabezas ligeramente mayores;
- criaturas con rasgos distintivos;
- efectos mágicos con formas simplificadas.

La prioridad no es la proporción realista. La prioridad es reconocer el elemento durante el juego.

## 3.4 Lo que significa “luminosa”

Incluso en cementerios, alcantarillas o fortalezas:

- el jugador debe distinguir el terreno;
- los personajes deben separarse del fondo;
- la interfaz debe ser legible;
- las habilidades deben destacar;
- las sombras no deben ocultar información.

La escena puede ser sombría sin ser ilegible.

## 3.5 Lo que significa “lectura táctica”

El jugador debe comprender rápidamente:

- dónde está;
- dónde puede moverse;
- qué casillas están ocupadas;
- qué objetivo está seleccionado;
- qué alcance tiene una acción;
- qué zona será afectada;
- qué elementos son decorativos;
- qué elementos son interactivos.

---

# 4. ESTILOS DESCARTADOS COMO DIRECCIÓN PRINCIPAL

## 4.1 Pixel art estricto

No será la dirección principal.

Motivos:

- los recursos recientes poseen mayor resolución;
- muchos iconos utilizan volumen y suavizado;
- exigiría rehacer recursos para mantener consistencia;
- limita parte de la dirección ilustrada buscada.

Puede utilizarse pixel art temporalmente, pero no debe guiar nuevos recursos.

## 4.2 Fotorrealismo

No será la dirección principal.

Motivos:

- reduce la coherencia entre recursos;
- complica la lectura en tamaños pequeños;
- exige más detalle;
- dificulta las animaciones;
- puede hacer que el tablero se vea como un collage.

## 4.3 Oscuridad extrema

No se utilizarán escenas donde:

- el suelo desaparece;
- la cuadrícula no se entiende;
- los enemigos solo se ven por contorno;
- los textos pierden contraste;
- los efectos de diferentes elementos se confunden.

## 4.4 Estilo caricaturesco infantil

No se busca un mundo infantil o humorístico.

Pueden existir exageraciones estilizadas, pero el tono general debe continuar siendo de fantasía medieval peligrosa.

---

# 5. PERSPECTIVA Y COMPOSICIÓN DEL MUNDO

## 5.1 Perspectiva recomendada

Vista cenital ortográfica, sin inclinación frontal ni lateral del tablero.

Debe permitir ver:

- superficie del suelo;
- borde superior y contorno visible de paredes;
- volumen de personajes;
- puertas;
- obstáculos;
- sombras.

No debe utilizar una perspectiva isométrica estricta si esta complica el sistema de casillas actual.

## 5.2 Regla de casilla

La lógica de Dark Moon continúa siendo ortogonal.

Toda imagen debe respetar que cada entidad ocupa una o más casillas definidas.

La ilustración puede sobresalir visualmente de la casilla, pero:

- su punto de apoyo debe ser claro;
- su sombra debe indicar la casilla ocupada;
- no debe parecer que ocupa otra posición;
- el área de clic debe corresponder con la lógica;
- el solapamiento debe resolverse mediante profundidad visual.

## 5.3 Punto de anclaje

Para personajes y enemigos:

- el anclaje lógico debe estar en los pies o base;
- el centro visual puede estar más arriba;
- la sombra debe centrarse en la casilla;
- los efectos de selección deben dibujarse en el suelo.

Para objetos:

- el anclaje debe coincidir con su punto de apoyo;
- los objetos altos pueden sobresalir;
- no deben ocultar permanentemente entidades.

---

# 6. ESCALA VISUAL

## 6.1 Resolución de recursos

Los recursos pueden tener una resolución mayor que su tamaño visible.

Ejemplo:

- archivo: 128 × 128;
- tamaño lógico visible: equivalente a una casilla o una fracción de casilla.

La resolución del archivo no determina por sí sola el espacio ocupado.

La casilla lógica base queda definida en **32 × 32 unidades**. Esta medida se utiliza para posiciones, anclajes, selección y relación entre el mundo y la pantalla. No obliga a crear imágenes de 32 × 32 píxeles.

## 6.2 Principio de nitidez

Al escalar:

- evitar deformación;
- conservar proporción;
- utilizar el filtrado aprobado para el estilo;
- comprobar el resultado en zoom mínimo y máximo;
- evitar detalles tan pequeños que desaparezcan;
- evitar bordes borrosos por escalas fraccionarias innecesarias.

## 6.3 Escala relativa

Guía inicial:

- personaje jugable: referencia principal;
- humano normal: tamaño similar al personaje;
- rata: claramente menor;
- criatura gigante: mayor, sin ocultar el tablero;
- jefe: mayor y dominante;
- puerta: suficientemente grande para parecer transitable;
- barril: menor que una persona;
- arma en mundo: reconocible, pero no del tamaño de un personaje;
- icono en inventario: centrado y con margen consistente.

Estas relaciones deben ajustarse en una prueba real antes de convertirse en valores definitivos.

## 6.4 Resolución base de referencia

La referencia inicial para diseñar y probar el área visible del mundo es **1024 × 640 unidades lógicas**.

Con casillas de 32 × 32 equivale a una referencia de 32 × 20 casillas visibles. Esta medida:

- no limita el tamaño del mapa;
- no obliga a usar una ventana fija;
- no impide redimensionamiento ni pantalla completa;
- no determina cuántas casillas se verán en todas las pantallas;
- puede ajustarse después de pruebas reales sin cambiar la lógica del juego.

Los mapas futuros podrán ser considerablemente mayores. La cámara será responsable de mostrar el sector relevante sin reducir todo el mundo para hacerlo entrar.

---

# 7. CUADRÍCULA

## 7.1 Función

La cuadrícula debe apoyar la lectura táctica sin convertir el mapa en una hoja de cálculo.

## 7.2 Estado normal

En reposo puede ser:

- muy tenue;
- parcialmente sugerida por las baldosas;
- visible mediante juntas del terreno;
- reforzada solo cerca del personaje.

## 7.3 Estado de interacción

Debe hacerse más clara cuando el jugador:

- selecciona movimiento;
- selecciona ataque;
- selecciona habilidad;
- inspecciona alcance;
- apunta a una zona.

## 7.4 Colores funcionales

Los colores exactos se definirán durante implementación, pero las funciones deben diferenciarse:

- movimiento válido;
- movimiento inválido;
- objetivo seleccionable;
- objetivo actual;
- área de daño;
- área persistente;
- casilla bloqueada;
- casilla inspeccionada;
- trayectoria;
- salida o portal.

No se debe depender únicamente del color. Puede utilizarse:

- borde;
- patrón;
- intensidad;
- símbolo;
- animación;
- forma.

---

# 8. CÁMARA

## 8.1 Objetivo

La cámara debe permitir mapas mayores sin desorientar al jugador.

El mapa completo no debe achicarse progresivamente para permanecer siempre visible. La cámara mostrará una porción del mundo y conservará una escala legible de casillas, personajes y efectos.

## 8.2 Modos

Debe soportar:

- seguimiento del personaje;
- movimiento manual;
- recentrado;
- zoom;
- límites;
- retorno automático opcional.

## 8.3 Seguimiento

Mientras el seguimiento esté activo, el personaje permanece exactamente en el centro visual. El contrato se conserva después de movimiento, espera, modales, redimensionamiento, pantalla completa y cambios de zoom.

El seguimiento se desactiva solamente cuando el usuario desplaza la cámara de forma manual. Cambiar de mapa, iniciar una selección táctica o utilizar la acción de recentrado vuelve a activarlo.

## 8.4 Desplazamiento

Los controles aprobados son:

- `I`: cámara hacia arriba;
- `J`: cámara hacia la izquierda;
- `K`: cámara hacia abajo;
- `L`: cámara hacia la derecha;
- arrastre con botón derecho o central.

El desplazamiento se calcula por tiempo real para mantener una velocidad estable, normaliza las diagonales y respeta los límites del mapa. No activa movimientos del personaje, no ejecuta comandos jugables y no consume turnos.

Durante ataque, interacción o selección de habilidad, el desplazamiento manual queda bloqueado y la cámara vuelve al personaje.

## 8.5 Zoom

El zoom aprobado utiliza:

- rueda del ratón;
- `+` para acercar;
- `-` para alejar;
- pasos de 10 %;
- mínimo de 80 %;
- máximo de 160 %;
- valor inicial de 120 %.

En seguimiento o selección táctica, el personaje se conserva como centro. En cámara libre, la rueda conserva el punto situado bajo el puntero y el teclado conserva el centro visible. El zoom debe mantener la lectura de casillas, selección, entidades y paneles.

## 8.6 Recentrado

`H` vuelve al personaje y reactiva el seguimiento. El doble clic izquierdo conserva la misma función como alternativa de ratón.

## 8.7 Coordenadas

La presentación mantiene un único conversor para:

- pantalla a mundo;
- mundo a pantalla;
- mundo a casilla;
- pantalla a casilla;
- casilla a mundo;
- casilla a pantalla.

La conversión no ejecuta acciones, no contiene reglas jugables y debe reutilizarse cuando P4 traduzca entradas a intenciones canónicas.

## 8.8 Sensación

La cámara debe ser:

- estable;
- rápida;
- predecible;
- sin vibraciones innecesarias;
- sin aceleraciones que dificulten apuntar.

Las sacudidas de cámara se reservan para impactos importantes y deben poder reducirse o desactivarse.

---

# 9. TERRENOS

## 9.1 Objetivo

El terreno debe comunicar ambiente y navegabilidad.

## 9.2 Reglas generales

Cada terreno debe indicar:

- qué es;
- si puede caminarse;
- si bloquea;
- si causa peligro;
- si es decorativo;
- si contiene una transición.

## 9.3 Variación

Para evitar repetición pueden utilizarse:

- variaciones de baldosa;
- grietas;
- manchas;
- pequeños restos;
- cambios de tono;
- humedad;
- musgo;
- huesos;
- polvo.

La variación no debe parecer un objeto interactivo cuando no lo es.

## 9.4 Alcantarilla

Dirección sugerida:

- piedra húmeda;
- agua verdosa controlada;
- reflejos suaves;
- madera deteriorada;
- metal oxidado;
- suciedad;
- tuberías o desagües;
- luces cálidas puntuales.

Debe evitarse que todo sea verde oscuro.

## 9.5 Cementerio

Dirección sugerida:

- piedra fría;
- tierra;
- césped apagado;
- lápidas;
- raíces;
- niebla suave;
- luz lunar o azulada;
- puntos cálidos provenientes de velas, faroles o magia.

Debe evitarse que enemigos óseos se confundan con las lápidas.

## 9.6 Fortaleza abandonada y sala de guerra

Dirección sugerida:

- piedra militar;
- madera pesada;
- hierro;
- estandartes rotos;
- braseros;
- armas;
- mesas;
- restos de combate;
- contrastes cálidos y fríos.

Los elementos decorativos no deben ocultar rutas.

---

# 10. PAREDES, OBSTÁCULOS Y PROFUNDIDAD

## 10.1 Paredes

Las paredes deben:

- separar claramente zonas;
- poseer altura visual;
- no ocultar al personaje sin solución;
- respetar límites lógicos;
- diferenciar frente, lateral y parte superior cuando corresponda.

## 10.2 Ocultamiento

Cuando una pared o elemento alto cubra al personaje, se puede utilizar:

- transparencia temporal;
- recorte;
- ocultamiento parcial;
- contorno;
- cambio de capa.

## 10.3 Obstáculos

Un obstáculo debe distinguirse de una decoración.

Ejemplos de obstáculos:

- barril sólido;
- estatua;
- mesa;
- escombro grande;
- columna;
- muro.

Ejemplos de decoración no bloqueante:

- mancha;
- papel;
- hierba baja;
- grieta;
- sombra;
- huesos pequeños.

## 10.4 Profundidad

La profundidad debe calcularse principalmente desde la base de cada entidad.

Los objetos más bajos en pantalla pueden dibujarse delante de los que están más arriba, siempre que no contradiga la ocupación lógica.

---

# 11. PERSONAJE JUGABLE

## 11.1 Prioridad

El personaje debe ser el elemento más fácil de localizar.

## 11.2 Silueta

Cada profesión debe reconocerse por:

- postura;
- ropa;
- volumen;
- colores;
- accesorios;
- forma general.

No depender únicamente del arma equipada.

## 11.3 Guerrero

Rasgos visuales:

- estructura sólida;
- armadura;
- formas rectas;
- postura firme;
- peso visual;
- detalles de hierro, cuero o acero.

## 11.4 Rogue

Rasgos visuales:

- silueta ágil;
- capas o telas;
- formas diagonales;
- menor volumen;
- postura preparada;
- contraste entre cuero y metal ligero.

## 11.5 Mago

Rasgos visuales:

- telas;
- símbolos;
- accesorios arcanos;
- silueta vertical o fluida;
- presencia de elemento solo cuando corresponda;
- no depender de un sombrero estereotípico.

## 11.6 Personalización

Si se agregan opciones futuras:

- deben conservar lectura de profesión;
- no deben introducir combinaciones de color ilegibles;
- no deben cambiar el tamaño lógico;
- deben respetar los puntos de anclaje.

---

# 12. ENEMIGOS

## 12.1 Principio

Cada enemigo debe poder reconocerse en un vistazo.

La diferencia no debe depender únicamente del nombre o de una barra de vida.

## 12.2 Jerarquía

Las categorías pueden comunicar importancia mediante:

- tamaño;
- postura;
- armadura;
- accesorios;
- marco de selección;
- brillo;
- aura;
- sombra;
- animación;
- icono.

## 12.3 Normal

Debe tener una silueta clara y pocos efectos.

## 12.4 Variante

Debe conservar la identidad base y añadir rasgos visibles.

Ejemplos:

- enfermo: tono, postura, manchas;
- gigante: escala y masa;
- élite: equipo, aura discreta, detalle adicional.

## 12.5 Especial

Debe tener una presencia claramente superior a un enemigo normal.

## 12.6 Jefe

Debe:

- dominar visualmente;
- poseer una silueta única;
- diferenciar fases o acciones importantes;
- continuar siendo legible dentro de la cuadrícula;
- no depender de efectos permanentes que oculten todo.

## 12.7 Colores de estado

Los estados no deben reemplazar los colores naturales del enemigo por completo.

Se recomiendan indicadores combinados:

- icono;
- partícula;
- borde;
- animación;
- cambio parcial de tono.

---

# 13. OBJETOS Y BOTÍN

## 13.1 Iconos

Los iconos deben:

- ser cuadrados;
- poseer fondo transparente cuando corresponda;
- tener margen consistente;
- mostrar un solo objeto principal;
- evitar texto;
- evitar marcos incorporados si la interfaz ya los aporta;
- mantener orientación coherente por familia.

## 13.2 Armas

Orientación recomendada para inventario:

- diagonal ascendente;
- mango hacia abajo e izquierda;
- punta hacia arriba y derecha;
- objeto centrado;
- longitud visible.

Puede cambiarse si una familia requiere otra lectura, pero debe mantenerse coherencia interna.

## 13.3 Armaduras

Deben mostrar:

- una pieza principal;
- vista frontal o tres cuartos;
- material claro;
- volumen;
- ausencia de cuerpo completo si no es necesario.

## 13.4 Consumibles

Deben diferenciarse por:

- forma;
- color;
- tapa;
- contenido;
- etiqueta o símbolo simple.

No depender únicamente del color del líquido.

## 13.5 Rareza

La rareza debe comunicarse desde la interfaz mediante:

- borde;
- halo discreto;
- etiqueta;
- color;
- detalle.

El icono no debe incorporar un fondo de rareza irreversible.

## 13.6 Botín en mapa

Debe ser reconocible sin ocupar demasiado espacio.

Puede utilizar:

- destello suave;
- pequeño movimiento;
- sombra;
- icono de interacción;
- borde de rareza.

No debe parecer un enemigo o una habilidad activa.

---

# 14. HABILIDADES Y MAGIA

## 14.1 Regla elemental

Los elementos poseen identidad visual principal:

- Fuego: rojo, naranja, ámbar.
- Frío: azul, cian, blanco frío.
- Rayo: violeta eléctrico, magenta frío, blanco.
- Veneno: verde tóxico, amarillo verdoso, turquesa oscuro controlado.

Estos colores son guías, no valores absolutos.

## 14.2 Diferenciación adicional

No depender solamente del color.

### Fuego

- llamas;
- brasas;
- expansión;
- humo;
- bordes irregulares;
- movimiento ascendente.

### Frío

- cristales;
- niebla;
- fracturas;
- copos;
- bordes angulares;
- contracción o inmovilización.

### Rayo

- líneas;
- ramificaciones;
- destellos;
- pulsos;
- velocidad;
- contraste fuerte.

### Veneno

- gotas;
- vapor;
- burbujas;
- corrosión;
- manchas;
- movimiento viscoso.

## 14.3 Intensidad

La intensidad visual debe corresponder con:

- grado;
- daño;
- área;
- duración;
- importancia.

Una habilidad básica no debe parecer más destructiva que una avanzada salvo que su situación lo justifique.

## 14.4 Áreas

Toda habilidad de área debe mostrar antes de confirmar:

- origen;
- destino;
- casillas afectadas;
- alcance;
- obstáculos si influyen;
- objetivos incluidos.

## 14.5 Efectos persistentes

Deben indicar:

- área activa;
- duración aproximada;
- peligro;
- propietario cuando sea necesario;
- momento de expiración.

No deben ocultar personajes o casillas.

## 14.6 Iconos de habilidades

Deben:

- ser 1:1;
- tener foco central;
- evitar escenas complejas;
- ser reconocibles en tamaño pequeño;
- mostrar el elemento;
- diferenciar habilidades de la misma maestría;
- mantener un marco externo separado;
- evitar texto.

---

# 15. ANIMACIÓN

## 15.1 Estrategia inicial

No se requiere animación completa de ocho direcciones para validar Phaser.

Primero pueden utilizarse:

- respiración;
- balanceo;
- desplazamiento interpolado;
- impulso al atacar;
- retroceso;
- destello de impacto;
- sombra;
- partículas;
- rotación leve;
- escalado controlado.

## 15.2 Movimiento

El personaje se mueve lógicamente de casilla a casilla.

La animación debe suavizar el desplazamiento, pero:

- no cambiar la casilla ocupada;
- no decidir cuándo termina el turno;
- no bloquear indefinidamente;
- poder acelerarse;
- poder saltarse si la lógica necesita resolver rápidamente.

## 15.3 Ataque

Una animación de ataque debe tener:

1. preparación;
2. acción;
3. impacto;
4. retorno.

La resolución lógica puede ocurrir antes o durante la animación según el contrato aprobado, pero el resultado no debe depender de la duración visual.

## 15.4 Daño

El daño puede mostrarse mediante:

- número;
- destello;
- retroceso;
- partícula;
- sonido;
- barra.

No utilizar todos los recursos con máxima intensidad en cada golpe.

## 15.5 Muerte

La muerte debe:

- confirmar claramente la derrota;
- no durar demasiado;
- liberar la lectura del tablero;
- mostrar el botín cuando corresponda;
- sincronizarse con la recompensa lógica sin duplicarla.

## 15.6 Velocidad

Debe contemplarse una opción para ajustar:

- velocidad normal;
- rápida;
- muy rápida;
- reducción de efectos.

---

# 16. ILUMINACIÓN Y SOMBRAS

## 16.1 Función

La iluminación debe crear atmósfera sin ocultar información.

## 16.2 Luz ambiental

Cada mapa puede tener una base distinta:

- alcantarilla: verde frío y puntos cálidos;
- cementerio: azul frío y luz lunar;
- fortaleza: gris frío y braseros cálidos;
- ciudad: más cálida y segura.

## 16.3 Luces locales

Fuentes posibles:

- antorchas;
- braseros;
- portales;
- hechizos;
- cristales;
- ventanas;
- charcos reflectantes.

## 16.4 Sombras

Las sombras deben:

- anclar entidades;
- ayudar a separar capas;
- indicar volumen;
- mantenerse suaves;
- no parecer casillas bloqueadas.

## 16.5 Magia

La magia puede iluminar temporalmente el entorno, pero no debe producir destellos molestos.

Debe existir especial cuidado con:

- parpadeo;
- contraste;
- frecuencia;
- sensibilidad visual.

---

# 17. PARTÍCULAS

## 17.1 Uso

Las partículas deben utilizarse para:

- magia;
- impacto;
- ambiente;
- transición;
- botín;
- estados.

## 17.2 Límites

Evitar:

- cubrir el tablero;
- emitir partículas permanentes en cada entidad;
- partículas demasiado pequeñas;
- exceso de transparencia acumulada;
- movimiento sin propósito.

## 17.3 Rendimiento

Debe existir una calidad ajustable o una estrategia de reducción si los mapas grandes y múltiples efectos afectan el rendimiento.

---

# 18. INTERFAZ HTML/CSS

## 18.1 Principio

La interfaz no debe competir con el mapa.

Debe ser:

- legible;
- compacta;
- medieval;
- limpia;
- consistente;
- funcional.

## 18.2 Paneles

Los paneles deben compartir:

- bordes;
- radios;
- sombras;
- títulos;
- espaciados;
- tipografía;
- estados;
- iconos.

## 18.3 Materiales

Se pueden sugerir materiales como:

- madera;
- piedra;
- hierro;
- cuero;
- pergamino.

Deben utilizarse de forma estilizada. No se recomienda cubrir cada panel con una textura fotográfica intensa.

## 18.4 Inventario

Debe conservar:

- borde de rareza;
- lectura de cantidad;
- estado equipado;
- estado seleccionable;
- estado incompatible;
- información al pasar o seleccionar.

## 18.5 Equipamiento

Las ranuras vacías deben mostrar un símbolo representativo:

- arma;
- secundaria;
- casco;
- pechera;
- guantes;
- botas;
- collar;
- anillos.

Los símbolos deben ser sutiles y no parecer objetos equipados.

## 18.6 Habilidades y maestrías

Deben conservar:

- identidad elemental;
- progreso;
- nivel;
- grado;
- coste;
- daño;
- alcance;
- estado bloqueado;
- posibilidad de mejora.

## 18.7 Modales

Los modales deben:

- abrirse sobre la interfaz;
- preservar contexto;
- tener cierre claro;
- no exceder la pantalla;
- permitir desplazamiento interno si es necesario;
- conservar foco de teclado;
- no activar acciones del mapa detrás.

---

# 19. TIPOGRAFÍA

## 19.1 Objetivo

La tipografía debe sugerir fantasía sin sacrificar legibilidad.

## 19.2 Uso

Puede utilizarse una fuente decorativa para:

- logo;
- títulos principales;
- nombres de mapas;
- encabezados breves.

Para:

- estadísticas;
- descripciones;
- números;
- tooltips;
- inventario;
- instrucciones;

se debe utilizar una fuente más simple y legible.

## 19.3 Reglas

- evitar texto demasiado pequeño;
- evitar párrafos en mayúsculas;
- alinear números de forma consistente;
- distinguir títulos, etiquetas y valores;
- conservar contraste;
- no utilizar demasiadas familias tipográficas.

---

# 20. COLOR

## 20.1 Paleta general

La base debe ser medieval y controlada:

- piedra;
- hierro;
- madera;
- cuero;
- tierra;
- azul nocturno;
- verdes apagados;
- rojos oscuros.

La magia y la rareza aportan colores más intensos.

## 20.2 Contraste

Todo texto y elemento interactivo debe verificarse sobre su fondo real.

## 20.3 Estado

Deben distinguirse:

- normal;
- seleccionado;
- activo;
- bloqueado;
- peligro;
- beneficio;
- daño;
- curación;
- raro;
- épico;
- legendario si existe.

No depender solamente de rojo y verde.

---

# 21. AUDIO VISUALMENTE COORDINADO

Aunque el audio pueda implementarse después, el diseño visual debe contemplar:

- impacto;
- movimiento;
- selección;
- error;
- apertura;
- recompensa;
- magia;
- ambiente.

El sonido debe reforzar la acción, no sustituir información visual.

---

# 22. ACCESIBILIDAD

## 22.1 Principios mínimos

- no depender solo del color;
- ofrecer reducción de sacudidas;
- ofrecer reducción de destellos;
- ajustar velocidad de animaciones;
- conservar texto legible;
- permitir zoom;
- mostrar estados mediante iconos y texto;
- permitir control por teclado;
- mantener foco visible;
- evitar tiempos de reacción estrictos innecesarios.

## 22.2 Estados elementales

Cada elemento debe diferenciarse también por forma y movimiento.

## 22.3 Interfaz

Los controles deben tener:

- estado enfocado;
- estado seleccionado;
- estado deshabilitado;
- texto alternativo o etiqueta cuando sea posible.

---

# 23. RENDIMIENTO

## 23.1 Principio

No optimizar por intuición antes de medir.

## 23.2 Riesgos

- mapas grandes;
- demasiados sprites;
- partículas;
- iluminación;
- transparencias;
- filtros;
- escalado;
- texto dinámico;
- efectos persistentes.

## 23.3 Estrategias posibles

Solo si las métricas lo justifican:

- reutilización de objetos;
- agrupación de recursos;
- atlas;
- reducción de partículas;
- culling;
- simplificación de luces;
- calidad configurable;
- desactivación de efectos fuera de cámara.

---

# 24. RECURSOS Y NOMENCLATURA

## 24.1 Nombres

Preferir:

- minúsculas;
- guion bajo;
- nombres descriptivos;
- categoría y variante cuando corresponda.

Ejemplos:

```text
caballero_oseo.png
caballero_oseo_elite.png
espada_acero.png
habilidad_explosion_ignea.png
terreno_alcantarilla_piedra_01.png
```

## 24.2 Separación

Estructura conceptual posible:

```text
assets/
├── personajes/
├── enemigos/
├── objetos/
├── habilidades/
├── terrenos/
├── estructuras/
├── decoraciones/
├── efectos/
├── interfaz/
└── audio/
```

La estructura real debe definirse según el repositorio durante P0.

## 24.3 Metadatos

Cuando sea necesario, los recursos visuales deberían estar referenciados desde datos y no dispersos en condiciones de código.

---

# 25. REGLAS PARA GENERAR NUEVAS IMÁGENES

Toda solicitud de imagen debe indicar:

- propósito;
- categoría;
- tamaño del archivo;
- relación de aspecto;
- fondo;
- orientación;
- estilo;
- perspectiva;
- paleta;
- nivel de detalle;
- tamaño visible;
- elementos prohibidos;
- nombre de archivo.

Plantilla:

```text
Crear [recurso] para Dark Moon.

Uso:
[mapa / inventario / habilidad / retrato / interfaz]

Estilo:
Fantasía medieval 2D ilustrada, estilizada y luminosa.

Perspectiva:
[vista superior / tres cuartos / frontal para icono]

Formato:
PNG, relación 1:1, fondo transparente.

Resolución:
[valor].

Tamaño visible previsto:
[valor o cantidad de casillas].

Composición:
[descripción].

Paleta:
[descripción].

Lectura:
Debe reconocerse con claridad en tamaño pequeño.

No incluir:
[texto, fondo, marco, magia, sangre, etc.].

Nombre:
[nombre_archivo.png]
```

---

# 26. REGLAS PARA DISEÑAR EFECTOS

Antes de crear un efecto se debe responder:

- ¿qué acción representa?
- ¿qué elemento utiliza?
- ¿qué casillas afecta?
- ¿cuándo comienza?
- ¿cuándo impacta?
- ¿cuánto dura?
- ¿es persistente?
- ¿puede confundirse con otro?
- ¿oculta entidades?
- ¿qué ocurre con varios efectos simultáneos?
- ¿qué opción de accesibilidad necesita?

---

# 27. REGLAS PARA DISEÑAR UNA PANTALLA

Antes de modificar una pantalla se debe responder:

- ¿cuál es la acción principal?
- ¿qué información debe verse sin abrir detalles?
- ¿qué información puede ocultarse?
- ¿qué panel tiene prioridad?
- ¿cómo se usa con teclado?
- ¿cómo se usa con ratón?
- ¿qué ocurre en resoluciones menores?
- ¿qué modal puede abrirse?
- ¿cómo vuelve el jugador?
- ¿cómo se comunica un error?
- ¿cómo se conserva el estilo visual?

---

# 28. LISTA DE CONTROL PARA MAPAS

Antes de aprobar un mapa visual:

- [ ] La ruta caminable es legible.
- [ ] Las paredes se distinguen.
- [ ] Los obstáculos se distinguen de la decoración.
- [ ] El personaje se localiza rápidamente.
- [ ] Los enemigos no se confunden con el fondo.
- [ ] Las salidas son visibles.
- [ ] Las casillas pueden resaltarse.
- [ ] La cámara tiene límites.
- [ ] El zoom no destruye la lectura.
- [ ] Las luces no ocultan información.
- [ ] Los elementos altos no bloquean permanentemente la vista.
- [ ] El mapa mantiene coherencia con su ambiente.
- [ ] No existe ruido visual excesivo.
- [ ] El rendimiento fue comprobado.

---

# 29. LISTA DE CONTROL PARA ENTIDADES

- [ ] Silueta reconocible.
- [ ] Tamaño coherente.
- [ ] Punto de apoyo claro.
- [ ] Sombra correcta.
- [ ] Selección visible.
- [ ] Estado visible.
- [ ] No se confunde con otra entidad.
- [ ] No oculta casillas innecesariamente.
- [ ] Funciona con zoom mínimo y máximo.
- [ ] Recurso y nombre están documentados.

---

# 30. LISTA DE CONTROL PARA HABILIDADES

- [ ] Elemento reconocible por color y forma.
- [ ] Origen visible.
- [ ] Objetivo visible.
- [ ] Área previa visible.
- [ ] Impacto visible.
- [ ] Duración visible cuando corresponde.
- [ ] Estado aplicado visible.
- [ ] No oculta el tablero.
- [ ] Intensidad coherente con el grado.
- [ ] Puede reducirse para accesibilidad.
- [ ] No altera la lógica temporal.
- [ ] Funciona con varios objetivos.

---

# 31. LISTA DE CONTROL PARA INTERFAZ

- [ ] La acción principal se identifica.
- [ ] El texto es legible.
- [ ] Los números se interpretan.
- [ ] Los estados tienen más de una señal.
- [ ] El teclado puede navegar.
- [ ] El foco es visible.
- [ ] Los modales bloquean acciones detrás.
- [ ] El panel funciona en el tamaño mínimo aprobado.
- [ ] Los iconos son coherentes.
- [ ] La rareza se mantiene.
- [ ] Los espacios vacíos son comprensibles.
- [ ] No compite visualmente con el mapa.

---

# 32. PROCESO DE APROBACIÓN VISUAL

Toda modificación visual importante debe seguir este orden:

1. identificar problema;
2. explicar objetivo;
3. mostrar propuesta;
4. indicar archivos afectados;
5. indicar qué se conservará;
6. indicar qué no se tocará;
7. explicar riesgos;
8. obtener aprobación;
9. implementar;
10. validar dentro del juego;
11. comparar antes y después;
12. documentar la decisión.

---

# 33. PREGUNTAS ABIERTAS

Estas preguntas no bloquean P0, pero deberán resolverse antes de etapas visuales avanzadas.

## 33.1 Tamaño lógico de casilla

Resuelta en P0: 32 × 32 unidades lógicas.

La decisión podrá revisarse únicamente si una prueba posterior demuestra un problema concreto. La resolución de los archivos gráficos continúa siendo independiente.

## 33.2 Perspectiva definitiva del mundo y personajes

Resuelta para el mundo en P5.1: vista cenital ortográfica.

Los personajes y enemigos deben producirse también desde arriba, con un ángulo mínimo únicamente cuando sea necesario para reconocer la silueta. Su iteración gráfica se realiza por separado y su integración no puede alterar la ocupación lógica de casillas.

## 33.3 Nivel de animación

Debe decidirse después de probar:

- movimiento interpolado;
- respiración;
- ataque simple;
- efectos.

## 33.4 Visibilidad y niebla

Debe confirmarse si se mantendrá el sistema actual, se ampliará o se dejará para una etapa posterior.

## 33.5 Minimap

No es obligatorio. Debe evaluarse según el tamaño real de los mapas.

## 33.6 Orientación de sprites

Debe definirse si los personajes necesitarán:

- una sola orientación;
- cuatro direcciones;
- ocho direcciones.

La decisión se tomará por costo y beneficio, no por aspiración.

---

# 34. DECISIONES VISUALES REGISTRADAS

## V-001 — Estilo principal

Fantasía medieval 2D ilustrada, estilizada y luminosa.

## V-002 — Lectura

La cuadrícula y las acciones tácticas tienen prioridad sobre el detalle decorativo.

## V-003 — Control

Teclado principal; ratón para inspección, selección, menús y cámara.

## V-004 — Cámara

Mapas mayores con desplazamiento, zoom, límites y recentrado.

## V-005 — Interfaz

Se mantiene híbrida durante el hito actual. Los paneles densos continúan en HTML/CSS salvo beneficio demostrado.

Una mejora o migración adicional de paneles podrá evaluarse después de cerrar este hito, sin convertirla en requisito para integrar Phaser.

## V-006 — Animación inicial

Se permiten animaciones simples y efectos antes de crear ciclos completos en múltiples direcciones.

## V-007 — Casilla lógica

La casilla lógica base es de 32 × 32 unidades. Los recursos pueden tener mayor resolución y sobresalir visualmente si conservan anclaje y lectura correctos.

## V-008 — Resolución de referencia

1024 × 640 es la referencia inicial para diseño y pruebas del área del mundo. No es un límite de mapa ni una resolución rígida de ventana.

## V-009 — Escalado de mapas grandes

Los mapas mayores se recorrerán mediante cámara, zoom y desplazamiento. No se reducirá todo el mapa hasta volver ilegibles las entidades o las casillas.

## V-010 — Corte visual de Alcantarilla

La Alcantarilla es la primera referencia visual concreta de Phaser y la primera validación cenital de P5.1. Utiliza piedra húmeda, variaciones de suelo, pared diferenciada, humedad, metal oxidado y puntos de luz fría. Los recursos propios se almacenan en `assets/imagenes/mundo/alcantarilla/`.

## V-011 — Capas y profundidad del corte

El corte Phaser se compone en este orden: fondo, terreno, decoración baja, zonas, sombras, selección, entidades e iluminación. El piso, las paredes y la colocación de entidades responden a una vista cenital ortográfica. Las entidades continúan ordenándose por fila para mantener una profundidad determinista, pero su anclaje visual se realiza en el centro de la casilla y no en la base del sprite.

## V-012 — Sombra e iluminación del mundo

Las sombras de entidades son suaves, centradas y se dimensionan a partir del contenido alfa visible del PNG. Las paredes cenitales pueden proyectar una sombra de contacto corta y configurable sobre el piso adyacente; esa sombra deriva de la misma vecindad del muro, no modifica iluminación jugable y puede desactivarse por bioma. La iluminación utiliza una base fría verdosa sin un círculo luminoso permanente alrededor del jugador. Los interactuables tampoco reciben un aura permanente porque deben integrarse naturalmente con el mapa. Ninguna luz o sombra debe ocultar cuadrícula, objetivos o casillas seleccionadas.

## V-013 — Ventanas de poca altura

Cuando el modo Phaser no dispone de altura suficiente, la pantalla puede desplazarse verticalmente antes que comprimir el mapa hasta volverlo ilegible. Esta adaptación no altera el diseño histórico de Canvas 2D.

## V-014 — Muros configurables por vecinos

La presentación Phaser debe analizar ocho vecinos y no dibujar muros como bloques aislados. Cada casilla de pared puede derivar lados expuestos, esquinas exteriores y esquinas interiores sin modificar la matriz lógica del mapa. El borde visible se define por el bioma y el interior del muro debe verse continuo. La Alcantarilla valida primero este contrato y luego P5 ampliará el mismo sistema al resto de biomas, puertas y obstáculos complejos.

## V-015 — Seguimiento permanente y selección táctica

Mientras el seguimiento esté activo, el personaje es la referencia permanente de la cámara y permanece exactamente en el centro visual. La regla se aplica desde el primer cuadro del mapa y después de esperas, redibujados, apertura o cierre de modales, cambios de zoom, redimensionamiento y pantalla completa. No se agregan excepciones por acción o nombre de modal.

El desplazamiento manual puede pasar voluntariamente a cámara libre. Al comenzar ataque, interacción o selección de habilidad, el seguimiento vuelve a activarse, se bloquea el arrastre y el zoom conserva al personaje como centro.

## V-016 — Aura reservada para objetivos contextuales

No se utiliza aura permanente para portales, objetos o enemigos comunes. Una futura misión podrá marcar desde el estado canónico una entidad como objetivo y Phaser podrá representarla con una luminiscencia pequeña y discreta. El renderizador no decidirá objetivos por nombre visible ni por tipo de enemigo.

## V-017 — Anclaje por contenido visible

Phaser calcula una vez los límites alfa de cada PNG y conserva tanto el anclaje histórico por base como el centro visible completo. P5.2 utiliza el centro horizontal y vertical visible para ubicar las entidades en el centro exacto de su casilla. El recurso mantiene su relación de aspecto y cabe dentro de un lienzo visual de 32 × 32. Los PNG originales no se recortan ni se alteran, por lo que continúan siendo reutilizables en inventario, paneles y detalles.

## V-018 — Controles y coordenadas de cámara

La cámara utiliza `IJKL` para desplazamiento, `+` y `-` para zoom y `H` para volver al personaje y reactivar el seguimiento. La rueda, el arrastre derecho o central y el doble clic izquierdo continúan disponibles. Estos controles son exclusivamente visuales: no mueven al personaje, no ejecutan acciones y se ignoran en campos editables.

Las traducciones entre pantalla, mundo y casilla pertenecen a un conversor único reutilizable. El compositor dibuja y el controlador navega utilizando ese contrato, sin duplicar matemáticas de coordenadas.


## V-019 — Selección mediante puntero Phaser

Durante combate, interacción o selección de habilidad, el clic izquierdo sobre el mapa Phaser señala una casilla y mueve el selector canónico. La acción continúa confirmándose mediante `F` o `R`; seleccionar no consume turno ni ejecuta automáticamente ataques, habilidades o interacciones.

Al confirmar un ataque, la selección táctica debe retirarse antes del primer movimiento, impacto, texto o efecto de combate. El selector representa la fase de apuntado y no debe permanecer superpuesto durante la resolución visual de una acción ya confirmada.

El clic utiliza la cámara y el zoom reales mediante el conversor único. Fuera de un modo de selección no mueve al personaje ni abre información de entidades. El doble clic conserva el recentrado únicamente fuera de la selección.

El teclado jugable y la cámara permanecen en componentes especializados. Una futura pantalla de configuración deberá modificar una única asignación central de acciones y teclas para ambos componentes, evitando configuraciones paralelas.

## V-020 — Presentación cenital global de entidades

La perspectiva, el anclaje, el tamaño y la sombra de las entidades pertenecen exclusivamente a Phaser. `Player`, `Enemigo`, `Barril`, `BotinSuelo` y sus fábricas no reciben propiedades como `aparienciaVisual`. El dominio continúa entregando únicamente tipo visual, posición y `recursoVisual`.

`ConfiguracionEntidadesPhaser` define una regla general: centrar el contenido visible, conservar la relación de aspecto, limitar el lienzo a la casilla y dibujar una sombra centrada. Las diferencias de tamaño final deben resolverse primero mediante la composición y el espacio transparente del PNG, no mediante excepciones por nombre de entidad.

---

# 35. REFERENCIAS IMPLEMENTADAS EN P2, P3 Y P4

La referencia P2 aplica las siguientes decisiones concretas:

- casilla lógica de 32 × 32;
- imágenes ambientales de 64 × 64 reducidas visualmente a la casilla;
- cuadrícula más visible en suelo que en paredes;
- variación decorativa determinista para no cambiar entre redibujados;
- personaje marcado mediante sombra y aro cálido discreto;
- enemigos agresivos con indicador y apoyo visual rojo;
- portales e interactuables integrados sin aura permanente;
- muros seleccionados por vecinos cardinales y familia configurable;
- cámara con zoom entre 80 % y 160 %;
- seguimiento permanente desde la carga y después de esperas, modales o redimensionamiento;
- zoom centrado en el personaje durante seguimiento y alrededor del puntero en cámara libre;
- desplazamiento con botón derecho o central;
- doble clic izquierdo para recentrar;
- selección táctica con cámara fijada sobre el personaje;
- entidades centradas mediante el centro visible de sus PNG transparentes;
- clic izquierdo reservado a navegación visual durante P2;
- Canvas 2D conservado como backend predeterminado.

Esta referencia no define todavía animaciones finales, niebla, minimapa ni sprites direccionales.

La referencia P3 agrega:

- desplazamiento continuo con `IJKL` sin consumir turnos;
- velocidad de cámara configurable y estable por tiempo real;
- zoom por rueda y `+`/`-` dentro de 80 % a 160 %;
- `H` y doble clic izquierdo para recentrar y reactivar seguimiento;
- bloqueo de desplazamiento manual durante selección táctica;
- límites recalculados al cambiar zoom o tamaño;
- conservación del punto bajo el puntero durante zoom libre;
- conversor único entre pantalla, mundo y casilla;
- controles ignorados mientras se escribe en elementos editables.


La referencia P4 agrega:

- clic izquierdo para seleccionar una casilla durante combate, interacción o habilidad;
- confirmación conservada mediante `F` o `R`;
- conversión exacta con cámara, zoom y redimensionamiento;
- ausencia de acción jugable cuando no existe un modo de selección;
- doble clic de recentrado disponible solamente fuera de la selección;
- un único comando neutral para el selector activo;
- teclado jugable centralizado y cámara especializada, preparados para una futura configuración común de teclas.

---

# 36. CONCLUSIÓN DE DISEÑO

Dark Moon no necesita parecer un juego completamente distinto para beneficiarse de Phaser.

La meta es:

- conservar el juego táctico por casillas;
- mejorar profundidad, movimiento y ambiente;
- hacer más clara la selección;
- hacer más satisfactorio el combate;
- utilizar mapas mayores;
- integrar recursos ilustrados;
- mantener una interfaz legible;
- construir una presentación suficientemente atractiva para betatesting.

Toda decisión visual futura debe responder primero:

> ¿Mejora la comprensión, la atmósfera o la satisfacción del jugador sin romper la lectura táctica?

## V-021 — Terrenos por símbolo y familias visuales de bioma

Phaser no debe asumir un único suelo por mapa. La ciudad usa varios símbolos lógicos (`.`, `,`, `=` y `:`) y cada uno puede apuntar a una familia visual propia sin alterar caminabilidad ni la matriz canónica. P5.3 extiende esta regla a todos los biomas mediante una resolución gráfica de terrenos por símbolo y una configuración visual por mapa.

Cada bioma debe disponer de una familia coherente de recursos ambientales: variaciones de piso, masas continuas de pared, borde expuesto, esquina interior y sombra de contacto. El borde y la sombra pertenecen al lenguaje del bioma, no a una implementación fija de Alcantarilla.

## V-022 — Secuencia de cierre visual de P5

P5.3 cubre el mundo ambiental y la expansión de biomas. `P5.3Especial` incorpora los PNG activos de Guerrero, Rogue y Mago sin cambiar sus rutas. P5.4 valida esos tres recursos y cierra técnicamente el corte visual de P5: terrenos por símbolo, autotiling, presentación global de entidades, selección y regresión Canvas 2D.

## V-023 — Cierre técnico con deuda artística explícita

Una etapa visual puede cerrarse técnicamente aunque parte del arte siga siendo provisional, siempre que la sustitución futura no requiera cambiar dominio, reglas o contratos. En P5 los jugadores son los recursos definitivos auditados. Enemigos, barril, botín, portales, puerta y NPC conservan temporalmente sus PNG anteriores.

La condición para reemplazar esos recursos es mantener las rutas activas o actualizar exclusivamente la configuración que contiene `recursoVisual`. Phaser continuará calculando límites alfa, centro visible, escala y sombra de forma general. No deben agregarse excepciones por nombre de entidad para compensar un PNG mal compuesto.

## V-024 — Identidad visual y cola no autoritativa

Cada entidad conserva una identidad visual estable solamente durante la sesión. Esa identidad no modifica `Player`, `Enemigo`, destructibles o interactuables, no se serializa y no forma parte de la persistencia. Su función es relacionar la misma entidad entre escenas neutrales consecutivas.

Phaser puede conservar temporalmente la escena anterior, reproducir un plan de eventos y finalmente sincronizarse con la escena final. La cola visual no calcula impacto, daño, movimiento permitido, muerte, experiencia, botín ni tiempo. Un cambio de mapa, cierre de escena o acumulación excesiva puede cancelar o acelerar presentación secundaria, pero nunca descartar el último estado canónico.

## V-025 — Ritmo secuencial de enemigos

Cuando varios enemigos actúan dentro de una misma resolución temporal, sus acciones ofensivas deben presentarse una por una y en el orden canónico. P6.1 utiliza una señal corporal breve de aproximadamente 320 ms y una separación base de 130 ms por ataque en velocidad normal. Las colas extensas se aceleran progresivamente para conservar legibilidad sin volver lento el combate.

Los recorridos consecutivos del jugador reducen progresivamente su duración por casilla y usan transición continua para evitar que una ráfaga de teclas deje al sprite atrasado respecto del estado canónico. Una acción ofensiva u otro evento relevante corta esa racha y conserva el orden visual.

Cuando un ataque impacta y causa daño real, P6.1 muestra una reacción genérica sobre el objetivo: retroceso mínimo, destello y marca breve de golpe. Se aplica tanto al jugador como a los enemigos. No representa todavía bloqueo, crítico, evasión, tipo de arma o elemento.

P6.1 no intenta representar todavía el arma, el proyectil o el impacto definitivo. P6.2 sustituirá la señal provisional por animaciones de combate completas y reutilizará el mismo orden. Incluso entonces, la duración será exclusivamente visual y no determinará el turno de ningún actor.

## V-026 — Feedback de combate por golpe

P6.2A separa visualmente los resultados ya calculados de cada golpe. El mapa Phaser no debe mostrar un único total cuando el ataque dual produjo dos resultados: cada mano conserva su daño, fallo, bloqueo y crítico en el orden canónico. Si el primer golpe destruye al objetivo, no se representa un segundo golpe inexistente.

El lenguaje visual inicial es:

- daño: número flotante y reacción de impacto;
- fallo: desplazamiento lateral breve y texto `FALLO`, sin marca de impacto ni número cero;
- bloqueo: escudo procedural y texto `BLOQUEO`; si queda daño real, también aparece el número aplicado;
- crítico: impacto algo más intenso, marca breve y texto `CRÍTICO`;
- casilla vacía: preparación ofensiva sin objetivo ni feedback falso.

La barra de Vida de enemigos debe descender durante cada golpe utilizando únicamente la Vida anterior y posterior derivadas del resultado canónico. La barra del jugador dentro de los paneles HTML continúa mostrando el estado final inmediato hasta la coordinación completa de P6.4.

Los textos y símbolos deben conservar lectura a zoom mínimo, tener duración limitada y evitar que varios resultados se superpongan exactamente. Los efectos reducidos pueden omitir marcas decorativas, pero deben conservar las palabras y números necesarios para comprender el resultado.

## V-027 — Ritmo autoritativo y perfiles por familia

La velocidad percibida de cualquier ataque debe derivarse del `costoFinal` que `SistemaTiempo` ya registró para esa acción. Phaser no consulta nuevamente factores del combatiente, no reconstruye el coste de cada arma y no mantiene ecuaciones separadas para ataques simples, duales, naturales o a distancia.

La única conversión de presentación transforma el coste final canónico en una duración visual total con límites de legibilidad. Las secuencias distribuyen esa duración mediante proporciones configurables: `simple`, `dual`, `estocada` y `proyectil`. Una secuencia dual obtiene su pausa entre manos como una fase de la misma duración total, no mediante una segunda fórmula.

`src/config/presentacion/PerfilesAtaquePorFamilia.json` es el catálogo canónico de presentación ofensiva. Su sección `familias` se conecta exclusivamente con `Armas.json.familiaObjeto`. Cada perfil define forma, tamaño, sentido, escala, amplitud y avance visual, además de campos reservados para futuros identificadores de sonido. No define daño, alcance, coste, factores de velocidad ni reglas jugables.

Los enemigos siguen el mismo contrato que el jugador. Un enemigo equipado utiliza el perfil completo de cada objeto y, si realiza un ataque dual, la misma secuencia y el mismo ritmo canónico. Un enemigo sin arma utiliza el fallback `ataque_natural`; nunca se selecciona una animación por nombre visible del enemigo.

La validación de arranque debe rechazar familias de armas sin perfil y perfiles que no estén conectados con ninguna familia real. El fallback de familia desconocida existe para proteger la ejecución, pero no debe ocultar una configuración incompleta durante el arranque.


## V-028 — Cuerpo a cuerpo por familia y hostilidad secuenciada

Los ataques cuerpo a cuerpo deben consumir el perfil asociado a `familiaObjeto` y las fases temporales derivadas del `costoFinal`. La forma visual no altera velocidad ni resultado:

- daga: corte corto;
- espada: corte medio;
- hacha: corte medio en sentido contrario;
- mandoble: corte grande;
- bastón: estrella de impacto grande, de ocho puntas y centro circular grueso;
- lanza: estocada lineal;
- ataque natural: golpe genérico.

La secuencia visual es preparación, avance o estocada, resultado y retorno. En doble arma, cada mano utiliza su propio perfil y la pausa proviene de la fase `pausaEntreManos` de la duración total canónica. El atacante nunca cambia su casilla lógica y su sombra acompaña todos los desplazamientos. Los ataques con perfil propio utilizan su efecto específico sin superponer la antigua marca genérica; la estocada de lanza se construye con origen local en el atacante y dirección hacia el objetivo.

Un crítico no agrega un símbolo independiente. Intensifica el efecto propio de la familia aumentando temporalmente grosor, amplitud, brillo y expansión, mientras conserva el número de daño y la palabra `CRÍTICO`. El bastón normal utiliza una estrella contundente grande con centro grueso; su versión crítica refuerza esa misma estrella en lugar de superponer otra marca.

La hostilidad también debe respetar el orden real de los hechos. Cuando un enemigo detecta al jugador, el indicador aparece antes de avanzar o atacar. Cuando pierde la persecución, desaparece antes de esperar. Cuando el jugador provoca a un enemigo pasivo, el ataque y su resultado se muestran antes de activar el indicador. Este cambio se transmite mediante `hostilidad_cambiada`, no se deduce comparando escenas.

El indicador agresivo de Phaser utiliza un círculo de 8 px de diámetro y texto de 8 px, colocado por debajo de la barra de Vida para mantener su legibilidad.


## V-029 — Actualización visual incremental de Vida y derrota

La escena neutral final continúa siendo la reconciliación autoritativa del mapa, pero los cambios relevantes deben representarse en el punto exacto de la cola donde ocurrieron. Un ataque que derrota a una entidad produce `ataque_resuelto` seguido de `entidad_derrotada`; el reproductor termina el impacto, lleva la barra a cero, retira el nodo visual y recién entonces continúa con la siguiente acción.

Los eventos canónicos `danio_periodico_aplicado` conservan `vidaAntes`, `vidaDespues` y `vidaMaxima` calculadas por el dominio. Phaser puede actualizar la barra, mostrar el daño y reaccionar sin recalcular veneno, quemadura, resistencias ni frecuencia. Si el dominio emite `combatiente_derrotado`, la entidad se retira antes del evento siguiente.

La desaparición inmediata no crea ni anima botín. P6.4 debe representar la muerte completa y hacer aparecer el botín inmediatamente después de la derrota, sin esperar al final de las demás acciones y sin duplicar la recompensa cuando se aplique la escena final.


## V-030 — Recursos visuales exactos para proyectiles y estocadas

La presentación debe representar el objeto realmente utilizado, no una imagen fija asociada a la familia. Al consumir munición, el dominio conserva una descripción inmutable con `idObjeto`, `tipoMunicion` y `recursoVisual`. El evento visual transporta esos datos y Phaser utiliza la ruta ya resuelta; no consulta `Municiones.json`, no reconstruye el carcaj y no decide qué flecha correspondía.

Las flechas y armas lineales usan como convención un PNG horizontal con la punta hacia la derecha. Phaser rota el sprite hacia el objetivo. La secuencia de arco reparte la duración canónica en preparación 40 %, lanzamiento 15 %, trayectoria 25 % y retorno 20 %. El viaje es visual y no recalcula alcance, trayectoria válida, colisión, munición ni precisión.

La lanza utiliza el recurso exacto de la fuente equipada. Su imagen mantiene un largo visual equivalente a dos casillas y el cuerpo del atacante no avanza. Para un objetivo a una casilla, el sprite se centra sobre el atacante; para un objetivo a dos casillas, se centra en la casilla intermedia de la dirección del ataque. En diagonal, la longitud visual se ajusta a la distancia geométrica entre centros sin alterar el alcance lógico.

`CreadorRecursosVisualesPhaser` es un componente genérico de presentación temporal: resuelve una textura desde una ruta, crea el sprite, aplica origen, rotación, escala, brillo y destrucción segura. P6.2C.1 lo utiliza para flechas y lanzas, y P6.2D para consumibles; su contrato permite reutilizarlo más adelante para armas o equipamiento visible, pero no asume montaje permanente ni reglas de equipamiento.

La selección automática de ataque físico mantiene la prioridad: enemigo atacable, luego destructible atacable, luego casilla inicial. Un destructible solo puede ser elegido cuando no existe ningún enemigo que cumpla todas las reglas reales de patrón, alcance y línea de visión.


### Proyectiles básicos de varita

Los ataques básicos de varita se representan mediante formas procedurales modestas y distintas por identidad, no solo por color: fuego usa un orbe irregular con brasas; frío, un fragmento angular; rayo, una chispa compacta ramificada que viaja con una estela nerviosa y termina en un impacto cruzado; veneno, una gota tóxica alargada con salpicadura viscosa. La habilidad Chispa se distingue de la varita eléctrica mediante una descarga completa anclada al ejecutor que conecta origen y objetivo en zig-zag. Este intercambio es exclusivamente visual.

Una varita utiliza la secuencia `proyectil`. Dos varitas utilizan `proyectil_dual`: preparación compartida, lanzamiento y trayectoria principal, pausa proporcional, lanzamiento y trayectoria secundaria y retorno. La secuencia distribuye una única duración procedente de `costoFinal`; no recalcula velocidad por elemento, tier, distancia ni mano. Cada proyectil conserva el elemento y resultado de su fuente. Si el primer golpe destruye al objetivo, no se representa una segunda descarga; en una casilla vacía se representan ambas fuentes sin daño ni fallo ficticios.

`CreadorProyectilesElementalesPhaser` interpreta exclusivamente perfiles visuales de fuego, frío, rayo y veneno. No conoce daño, Maná, resistencias, inventario, habilidades o nombres de armas. El crítico aumenta escala, brillo, ramificaciones o salpicadura de la misma forma elemental, manteniendo la palabra `CRÍTICO` y el daño sin agregar una marca independiente.


## V-031 — Recuperación explícita y subida de nivel

Las recuperaciones explícitas deben representar el resultado real ya aplicado. `recursos_recuperados` conserva el origen, el objeto o fuente visual, la cantidad aplicada y los valores anterior, posterior y máximo. El consumo utiliza la ejecución temporal canónica basada en `factorTiempo` y `factorConsumo`; la presentación no vuelve a calcular duración jugable.

Vida utiliza rojo como color dominante, formas ascendentes y texto con la cantidad. Maná utiliza azul-violeta y un movimiento circular distinto. El icono exacto del consumible aparece brevemente mediante `CreadorRecursosVisualesPhaser`. Una recuperación explícita de un enemigo debe actualizar su barra en el punto correspondiente de la cola. La regeneración pasiva no produce partículas, texto ni aura.

La subida de nivel utiliza un holy bless tenue mediante un aura blanca vertical tipo energía/ki, con núcleo luminoso suave, destellos ascendentes y texto del nivel final. No utiliza un aro o círculo como la recuperación, no consume tiempo y no debe confundirse con crítico, curación o habilidad ofensiva.

Lythra debe recibir una presentación mágica propia en P6.3, no una animación de bebida. Las habilidades, estados y zonas que permanezcan activos durante varios turnos deberán conservar una representación visual durante toda su duración, con aparición, estado sostenido y retirada sincronizados con sus eventos canónicos.


## V-032 — Contrato universal y lectura elemental de habilidades

Una habilidad visual parte de `habilidad_resuelta`, nunca del nombre mostrado ni de una consulta posterior al catálogo. El evento identifica al ejecutor como jugador, enemigo o NPC y conserva origen, habilidad, grado, selección, geometría, recorrido, impactos, cambios de recursos del ejecutor y de cada objetivo, efectos, zona y ejecución temporal. Phaser sustituye las referencias por IDs visuales y no decide objetivos, daño, resistencias, duración, acumulación o derrota.

El tipo de ejecutor no determina una arquitectura gráfica distinta. Jugador, enemigo y NPC comparten las mismas fases; el perfil de la habilidad decide su lectura. P6.3A conecta solo habilidades del jugador, pero el contrato debe permitir que una IA futura ordene habilidades enemigas y que un NPC produzca curaciones o auras sin crear otro sistema de presentación.

Las habilidades básicas siguen preparación, manifestación, trayectoria, impacto y retorno. La duración total procede de `costoFinal`; el perfil distribuye esa duración y nunca incluye un multiplicador de velocidad. Los cuatro elementos no pueden diferenciarse solo por color:

- fuego: masa irregular, textura de llama, brasas ascendentes y expansión cálida;
- frío: silueta angular, facetas, polvo helado y fractura rígida;
- rayo: línea ramificada, pulso, estela quebrada y ritmo nervioso;
- veneno: forma viscosa, burbujas, gotas y salpicadura pesada.

`CreadorEfectosHabilidadesPhaser` construye formas transitorias y las registra en la capa de efectos. Cancelar la cola, destruir la escena o cambiar de mapa debe destruir conjuración, proyectil, estela e impacto. La escena final continúa siendo la reconciliación autoritativa.

La selección neutral conserva ID, maestría, grado, forma y zona. Canvas 2D y Phaser pueden colorear rango, área, recorrido, objetivos y selector por elemento, pero alcance, línea de visión, centro, validez y orden permanecen definidos por `GeometriaHabilidades`.

P6.3B.1 incorpora una primera representación persistente de estados. La escena neutral conserva las instancias activas y el perfil visual resuelto; Phaser no cuenta segundos ni interpreta duración, sino que mantiene el objeto hasta que un evento o la escena autoritativa lo retire. Los estados se adjuntan al contenedor de la entidad y utilizan canales espaciales distintos: pies para Ralentización, laterales para Electrización, contorno para Congelamiento, parte superior para Aturdimiento, lateral izquierdo para Envenenamiento y lateral derecho para Quemadura. La entrada se refuerza con texto explícito: `RALENTIZADO`, `ELECTRIZADO`, `CONGELADO`, `ATURDIDO`, `ENVENENADO` o `QUEMADO`; una renovación muestra `· RENOVADO` y una intensificación o acumulación muestra `×N`. Canvas 2D presenta el mismo feedback textual de forma breve. El movimiento interpolado representa el factor temporal resuelto mediante `costoFinal / costoBase`, de modo que una Ralentización también se lee en la velocidad del paso y no solo en la frecuencia de turnos. P6.3B.1 fue validada manualmente y cerrada en `0c61b97269509d8be8ac35c2e5af78c3a84800ba`.

P6.3B.2 completa la lectura del ciclo interno. Un tick de Envenenamiento infla y hace estallar burbujas antes del número de daño; un tick de Quemadura eleva una llamarada breve. Renovar o intensificar mantiene el mismo contenedor persistente, redibuja su densidad y agrega un pulso transitorio, evitando el parpadeo de destruir y recrear. El nivel visual se limita a tres y se acompaña de `×2` o `×3`; la cantidad futura utiliza el mismo contrato. Con cuatro o más estados, las formas se compactan levemente pero mantienen sus canales. El tick nunca aplica daño: `danio_periodico_aplicado` conserva número, barra y derrota. P6.3B.2 quedó cerrada manualmente en `ec5933cd5090042f1be6511cbd5ad12ac5a65be3`.

P6.3C.1A incorpora el patrón `area_conjurada`. Las habilidades intermedias de área conservan toda su geometría y orden desde el dominio: Phaser solo recibe centro, casillas afectadas, impactos y recursos ya resueltos. `ResolucionEspacialHabilidades` es la capa canónica de colisiones y visibilidad para formas de habilidad; reutiliza `evaluarLineaVision` y aplica políticas declarativas como `vision_desde_centro`, evitando que radio, vista previa o zonas futuras atraviesen paredes. `PatronesVisualesHabilidades` es un centralizador diferente y exclusivamente de presentación: define las estructuras `proyectil`, `area_instantanea`, `cadena`, `zona_persistente` y `linea`, mientras cada perfil aporta centro visual, efecto de casilla, efecto normal y posible efecto primario.

Toda habilidad con un patrón que representa superficie debe dibujar cada casilla incluida en `casillasAfectadas`, incluso cuando esté vacía. Una entidad agrega una reacción de impacto sobre el efecto del suelo, no sustituye la lectura del área. Explosión ígnea siempre conjura su núcleo en `posicionObjetivo`; si la selección contiene una entidad, `objetivoPrimario` permite amplificar únicamente ese golpe. Si la selección fue suelo vacío, ninguna entidad se promociona artificialmente y todos los impactos usan la misma escala normal. Nova de escarcha nace en el actor, muestra fracturas y cristales en cada casilla visible y sincroniza `RALENTIZADO`, `RENOVADO` o resistencia inmediatamente después del daño del objetivo correspondiente. Para evitar desorden en habilidades multiobjetivo, `habilidad_resuelta` transporta `idEjecucion` y el plan visual adjunta los eventos de estado derivados al impacto correcto en vez de dejarlos sueltos al final de la cola.

P6.3C.1A fue validada manualmente y cerrada en `8bf47e50eb70ebc552649716a61eb5bbef829f5d`. P6.3C.1B aplica el patrón `cadena`: la resolución espacial elige un recorrido ordenado en el que cada tramo necesita `vision_entre_saltos`. Una pared bloquea únicamente el arco que intentaría atravesarla; la cadena puede continuar por otro candidato visible y eventualmente alcanzar el otro lado mediante objetivos intermedios válidos. El primer arco nace en el actor y recibe énfasis primario; los siguientes parten de la posición almacenada del objetivo anterior. Los tramos permanecen brevemente atenuados para leer el recorrido, y el multiplicador canónico solo modifica grosor y brillo visual dentro de límites de legibilidad. Cada impacto resuelve texto, barra, Electrización y posible derrota antes del siguiente salto. Phaser nunca busca candidatos ni consulta paredes. P6.3C.1B fue validada manualmente y cerrada en `e2e2b859f2e3e25989a73ab057b5f11195e32a0e`.

P6.3C.2A establece un contrato visual independiente para zonas persistentes. `PerfilesZonasTemporalesVisuales.json` define forma, textura, movimiento ambiental y feedback de ciclo para veneno, fuego, frío, electricidad y una zona genérica. La escena neutral transporta el perfil resuelto junto con identidad, casillas y tiempos canónicos. El compositor mantiene una única instancia por `zonaId`; renovar actualiza esa instancia, vencer la disipa y la reconciliación restaura o elimina zonas después de cancelaciones y cambios de mapa. Nube tóxica debe leerse como vapor bajo y viscoso, con manchas y burbujas variables en cada casilla, sin ocultar entidades, terreno o barras. Zonas distintas pueden superponerse, pero la opacidad se limita y ninguna decisión de renovación o reemplazo vive en Phaser. Canvas 2D conserva manchas y partículas estáticas con pulsos breves de creación, renovación y vencimiento. P6.3C.2A fue validada manualmente y cerrada en `4c124b9b45489dba723f9a70848c59d316229e0c`.

P6.3C.2B diferencia tres lecturas. La creación despliega la zona y reproduce sus impactos iniciales dentro de `habilidad_resuelta`, sin repetir los eventos de activación. La entrada genera un remolino local solamente después de que el actor llega a la casilla. El intervalo genera primero una reacción global sobre todas las casillas, incluso si están vacías, y después las reacciones individuales de los ocupantes. Cada reacción individual conserva daño, fallo, crítico, estado y derrota ya resueltos. Los eventos de Envenenamiento se adjuntan mediante `idEjecucion`; nunca se agrupan al final ni se reproducen dos veces. La nube persistente permanece separada de los pulsos transitorios. P6.3C.2B fue validada manualmente y cerrada en `69a400a87c00cb7d3c85c36d3753a8f6e9a90e0a`.

P6.3D.1 aplica el patrón `linea`. La trayectoria visual nace en el actor y recorre las casillas canónicas en orden; cada casilla recibe una marca visible aunque esté vacía y cada entidad agrega una reacción, sin sustituir la lectura del suelo. Incinerar combina una cinta cálida entre centros, llamaradas por casilla, brasas y combustión. Descarga fulminante utiliza un rayo grueso quebrado con núcleo blanco, ramificaciones y fulminación local. Los rastros anteriores permanecen brevemente para leer la longitud completa y se disipan juntos durante el retorno. El objetivo seleccionado solo fija la dirección canónica: no se amplifica artificialmente. Las derrotas ocurren al llegar a la casilla correspondiente. Phaser no reconstruye dirección, obstáculos, objetivos, daño ni estados.

P6.3D.2 reutiliza el patrón `proyectil` para Plaga corrosiva. Debe leerse como una masa tóxica más grande, pesada y viscosa que Aguijón tóxico: cuerpo irregular, núcleo verde con burbujas, pequeñas masas residuales, giro lento, compresión durante el avance y gotas corrosivas amplias. El impacto forma una corrosión expansiva con charco breve, salpicaduras y burbujas. La intensidad canónica aumenta de manera acotada el radio y la densidad de esas marcas; nunca altera la trayectoria ni inventa acumulaciones. Una aplicación resistida o inmune conserva el golpe directo, pero no muestra un aumento de intensidad. Al alcanzar el máximo puede aparecer un anillo exterior breve. La derrota ocurre dentro del impacto del proyectil y no vuelve a reproducirse como evento separado.

Ráfaga glacial se define en P6.3D.3 como un ataque individual compuesto por múltiples fragmentos pequeños de hielo que viajan desde el ejecutor hasta un único objetivo. No crea cono, pared, bloque sólido, entidad destructible ni inmunidad.

Lythra debe ejecutar habilidades canónicas de NPC que no aparezcan en aprendizaje ni barra del jugador. Curación y restauración de Maná reutilizarán `habilidad_resuelta`, `recursosObjetivo` con valores anterior, posterior, máximo y cantidad real, y actualización de barras, pero tendrán perfil mágico propio, no consumirán objetos y no mostrarán el gesto de beber.

### Separación entre tiempo de consumo y legibilidad del resultado

La imagen del consumible representa la acción del combatiente y, por tanto, su aparición y retirada se ajustan al `costoFinal` canónico del consumo. El texto de recuperación y las partículas o auras representan el resultado para el jugador: utilizan una duración fija de entrada, lectura y salida, pueden continuar en paralelo con la acción visual siguiente y no se comprimen por `factorConsumo`, velocidad de animación ni cantidad de eventos pendientes.

La subida de nivel es un acontecimiento meta sin coste temporal. Su holy bless blanco utiliza una duración fija y apreciable, con aparición, permanencia y salida diferenciadas. Solo la aparición breve espera dentro de la cola visual; permanencia y salida continúan en paralelo para evitar una pausa que parezca lag. El evento `nivel_aumentado` debe conservarse junto con los eventos de la derrota tanto en muertes directas como en derrotas pendientes; nunca debe reducirse solamente al mensaje textual de progresión.


- **Subida de nivel:** se representa como un aura blanca suave tipo energía/ki alrededor del jugador, con destellos verticales y texto `NIVEL N`. Solo la entrada bloquea brevemente la cola; la permanencia y salida continúan en paralelo para evitar sensación de traba.


### Estado de cierre visual de P6.2

P6.2 queda cerrada y validada manualmente. Sus contratos finales de presentación son:

- ataques y proyectiles distribuyen una única duración derivada del tiempo canónico;
- la forma de una familia nunca modifica la velocidad jugable;
- la imagen de un consumible sigue el `costoFinal` de consumo;
- el texto y los efectos de recuperación usan una duración fija para asegurar lectura;
- la regeneración pasiva no genera feedback visual;
- la subida de nivel utiliza un aura blanca vertical tipo energía/ki, diferente de los aros de recuperación;
- la permanencia y salida del aura de nivel no detienen el combate visual;
- habilidades, zonas y estados persistentes deberán mantener su representación durante toda su duración en P6.3.

## V-033 — Estados temporales persistentes y reconciliación

Un estado visual nunca determina si el efecto existe. `SistemaEfectosTemporales` conserva la instancia, intensidad, cantidad, vencimiento y próximo tick; la escena neutral copia solamente la información necesaria y adjunta un perfil de presentación validado contra `Efectos.json`.

Los eventos se normalizan en aplicación, actualización, no aplicación y retirada. Resistencia, inmunidad y duplicado generan feedback transitorio, pero nunca crean un objeto persistente. Una renovación o intensificación actualiza la misma instancia visual; no crea calendarios gráficos independientes.

Los estados persistentes pertenecen al contenedor de la entidad y no a la capa general de proyectiles. Por eso acompañan movimiento interpolado, desaparecen al retirar la entidad y se reconstruyen al aplicar una escena nueva. La limpieza de proyectiles, textos o partículas no debe destruir estados que continúan activos.

Cancelar una cola puede interrumpir una aplicación o retirada antes de aplicar la escena final. En ese caso el compositor reconcilia sus estados contra la última escena autoritativa ya dibujada. Cambiar de mapa destruye los contenedores anteriores y reconstruye únicamente los efectos que el dominio haya preservado, como los estados válidos del jugador.

P6.3D.3 consolida Congelamiento como escarcha inmovilizante de bloqueo total, pero sin inmunidad al daño. La entidad permanece visible y atacable; daño directo y periódico continúan normalmente. La representación no debe sugerir una pared o un bloque con Vida propia.

La duración canónica no se transforma en una cuenta regresiva de milisegundos Phaser. Un estado puede tener movimiento ambiental continuo, pero permanece visible hasta recibir retirada o desaparecer de la escena. P6.3B.2 agrega pulsos de daño periódico, indicadores de intensidad y convivencia avanzada sin alterar esta autoridad.


### Ráfaga glacial y controles totales

Ráfaga glacial nace en el ejecutor como un conjunto de pequeños fragmentos de hielo que avanzan agrupados hacia un único objetivo. Su gramática de selección es similar a Chispa, pero sustituye la descarga por múltiples cristales, estelas heladas y un impacto compacto de escarcha. No debe parecer un cono ni una habilidad de área. El perfil utiliza `rafaga_glacial`, `impulso_fuerte`, `fragmentos_helados`, `cristales_arrastrados` y `escarcha_fragmentada`.

Cuando Congelamiento se aplica, la presentación persistente usa `escarcha_inmovilizante`: placas finas y cristales alrededor del contorno, dejando visible al actor y su barra. No existe bloque opaco ni carcasa invulnerable. Aturdimiento conserva su identidad eléctrica o contundente; Parálisis usa anillos de control; Silencio usa un sello discreto en la zona superior.

Los contraefectos son hechos del dominio. Si una aplicación aceptada de Quemadura retira Congelamiento, o viceversa, el plan visual reproduce primero `efecto_temporal_retirado` y después `efecto_temporal_aplicado` dentro del mismo impacto. Phaser no compara elementos ni decide incompatibilidades.

Canvas 2D dibuja una marca de escarcha equivalente y sigue siendo funcional sin depender de los recursos Phaser.


### Habilidades lunares de Lythra

P6.3E define una familia visual propia para las recuperaciones de Lythra. No deben reutilizar el sprite de una poción ni el gesto de consumo. `Curación lunar` nace en Lythra como un orbe suave de luz blanca y rosada, viaja hacia el jugador con destellos lunares y termina en un pulso de sanación ascendente. `Restauración lunar` comparte la misma familia, pero utiliza azul, violeta y motas arcanas para distinguir Maná.

Ambas son habilidades de objetivo individual y usan el patrón reusable `proyectil`. El resultado canónico llega mediante `recursosObjetivo`; la presentación solo muestra la cantidad realmente recuperada y puede reutilizar `CreadorEfectosRecuperacionPhaser`. Su duración es exclusivamente visual: no representa coste temporal, Maná, cooldown ni turno de Lythra. El servicio «Ambos» reproduce las dos habilidades en el orden Vida → Maná cuando ambos recursos necesitan recuperación.

### Regresión visual de cierre de P6.3

P6.3F no introduce una nueva familia estética. Su objetivo visual es comprobar que los contratos ya definidos conviven sin contradicciones: `proyectil`, `area_instantanea`, `cadena`, `zona_persistente` y `linea` deben conservar su identidad, orden de impactos y limpieza de recursos al cancelar o cambiar de mapa. Las derrotas integradas de proyectil, cadena y línea se reproducen una sola vez en el punto canónico correspondiente.

Los estados persistentes deben seguir al actor y reconciliarse con la escena; Congelamiento continúa siendo escarcha inmovilizante sin bloque sólido ni invulnerabilidad. Quemadura y Congelamiento deben retirar visualmente el estado opuesto únicamente cuando el nuevo efecto fue aceptado. Envenenamiento puede seguir causando daño periódico mientras el actor está congelado. `efectosReducidos` debe reducir ornamentación sin ocultar daño, fallo, crítico, estado, recuperación o derrota.

Lythra mantiene su familia lunar diferenciada de consumibles y el valor `+N VIDA` / `+N MANÁ` debe corresponder a `cantidadReal`. Canvas 2D continúa siendo una presentación funcional equivalente, aunque deliberadamente más simple. La regresión automatizada valida contratos y planificación; la sensación de ritmo, legibilidad con cámara real y limpieza visual tras cancelaciones debe confirmarse manualmente en navegador antes del cierre definitivo de P6.3.

### P6.4A — Muerte y botín en la misma continuidad visual

La aparición de botín debe leerse como consecuencia inmediata de una derrota. La secuencia es impacto final → desaparición del actor → aparición del botín → continuación de la acción siguiente. El botín no espera al final de la ronda ni se deduce comparando escenas: `botin_generado` transporta el resultado ya resuelto por el dominio y el planificador lo correlaciona con la muerte que lo originó.

Una pila nueva utiliza una entrada corta desde 60 % de escala y alpha cero, supera levemente el tamaño final y se asienta en 100 %. Si la casilla ya contenía una pila, no aparece una segunda bolsa: el objeto visual existente realiza un pulso breve y la escena final reconcilia la instancia actualizada. Las habilidades secuenciales deben conservar este orden dentro del propio impacto; por ejemplo, si un salto de Cadena de rayos mata, la bolsa aparece antes del salto siguiente.

No se introducen cadáveres persistentes. La desaparición del derrotado continúa siendo breve y limpia, de modo que la misma casilla queda disponible visualmente para el botín. El modal de derrota del jugador no debe cubrir prematuramente la animación Phaser: la capa de aplicación puede esperar la inactividad de la presentación sin hacer que el dominio espere ni trasladar reglas de muerte a Phaser. Canvas 2D conserva notificación inmediata.


### P6.4B — Regresión visual transversal y frontera de cierre de P6

P6.4B no introduce una familia estética nueva. Su función es comprobar que las capas construidas durante P6 pueden convivir sin que la presentación altere el estado jugable. Movimiento, ataques físicos, proyectiles, consumibles, habilidades, estados, zonas, recuperaciones, derrotas y botín deben mantener el orden canónico que entrega el plan visual.

La muerte y el botín conservan una continuidad única: el derrotado desaparece y la recompensa ya resuelta aparece inmediatamente después. En cadenas, líneas, áreas o zonas esa recompensa pertenece al impacto concreto que produjo la derrota. Una reconciliación posterior con la escena autoritativa no debe crear una segunda bolsa.

Los estados persistentes continúan unidos al actor; las zonas pertenecen a su `zonaId`; las partículas, textos, proyectiles y representaciones anticipadas de botín son transitorias. Cancelar una cola o cambiar de mapa debe destruir lo transitorio y reconstruir únicamente lo que exista en la escena final canónica.

Canvas 2D continúa siendo el respaldo funcional y el backend predeterminado. Phaser puede interpolar, animar, pulir, sincronizar y esperar su propia presentación, pero no puede decidir daño, críticos, fallos, objetivos, paredes, duración, resistencias, inmunidades, muerte, botín, experiencia o coste temporal. La auditoría final de P6.4B mantiene esa frontera.

P6 solo debe considerarse visualmente cerrada después de la validación manual final de ritmo, legibilidad, cancelación, cambios de mapa, muerte, botín y modal de derrota en navegador.
