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

Vista superior con una inclinación ligera de tres cuartos.

Debe permitir ver:

- superficie del suelo;
- parte frontal o lateral de paredes;
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

## 33.2 Perspectiva definitiva de personajes

Opciones:

- superior;
- superior inclinada;
- tres cuartos más marcado.

Debe decidirse con una escena real en P2.

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

La Alcantarilla es la primera referencia visual concreta de Phaser. Utiliza piedra húmeda, variaciones de suelo, pared diferenciada, humedad, metal oxidado y puntos de luz fría. Los recursos propios se almacenan en `assets/imagenes/mundo/alcantarilla/`.

## V-011 — Capas y profundidad del corte

El corte P2 se compone en este orden: fondo, terreno, decoración baja, zonas, sombras, selección, entidades e iluminación. Las entidades se ordenan principalmente por la base vertical para conservar una lectura superior o de tres cuartos sin adoptar perspectiva isométrica estricta.

## V-012 — Sombra e iluminación de P2

Las sombras son elipses suaves que anclan entidades y bandas discretas junto a muros. La iluminación utiliza una base fría verdosa y un apoyo cálido muy suave alrededor del jugador. Los interactuables no reciben un aura permanente porque deben integrarse naturalmente con el mapa. Ninguna luz debe ocultar cuadrícula, objetivos o casillas seleccionadas.

## V-013 — Ventanas de poca altura

Cuando el modo Phaser no dispone de altura suficiente, la pantalla puede desplazarse verticalmente antes que comprimir el mapa hasta volverlo ilegible. Esta adaptación no altera el diseño histórico de Canvas 2D.

## V-014 — Muros configurables por vecinos

La presentación Phaser clasifica cada muro mediante sus vecinos cardinales. Puede representar bloques aislados, extremos, tramos rectos, esquinas, uniones en T, cruces e interiores sin modificar la matriz lógica del mapa. La Alcantarilla incorpora la primera familia de recursos; P5 ampliará el mismo contrato a otros biomas, puertas y obstáculos complejos.

## V-015 — Seguimiento permanente y selección táctica

Mientras el seguimiento esté activo, el personaje es la referencia permanente de la cámara y permanece exactamente en el centro visual. La regla se aplica desde el primer cuadro del mapa y después de esperas, redibujados, apertura o cierre de modales, cambios de zoom, redimensionamiento y pantalla completa. No se agregan excepciones por acción o nombre de modal.

El desplazamiento manual puede pasar voluntariamente a cámara libre. Al comenzar ataque, interacción o selección de habilidad, el seguimiento vuelve a activarse, se bloquea el arrastre y el zoom conserva al personaje como centro.

## V-016 — Aura reservada para objetivos contextuales

No se utiliza aura permanente para portales, objetos o enemigos comunes. Una futura misión podrá marcar desde el estado canónico una entidad como objetivo y Phaser podrá representarla con una luminiscencia pequeña y discreta. El renderizador no decidirá objetivos por nombre visible ni por tipo de enemigo.

## V-017 — Anclaje por contenido visible

Los PNG transparentes se apoyan mediante su contenido visible y no mediante el borde completo del archivo. Phaser calcula una vez los límites alfa de cada recurso, utiliza el centro visible como eje horizontal y apoya el último píxel visible sobre la base de la casilla. Las sombras adaptan discretamente su ancho al dibujo real. Los PNG originales no se recortan ni se alteran, por lo que continúan siendo reutilizables en inventario, paneles y detalles.

## V-018 — Controles y coordenadas de cámara

La cámara utiliza `IJKL` para desplazamiento, `+` y `-` para zoom y `H` para volver al personaje y reactivar el seguimiento. La rueda, el arrastre derecho o central y el doble clic izquierdo continúan disponibles. Estos controles son exclusivamente visuales: no mueven al personaje, no ejecutan acciones y se ignoran en campos editables.

Las traducciones entre pantalla, mundo y casilla pertenecen a un conversor único reutilizable. El compositor dibuja y el controlador navega utilizando ese contrato, sin duplicar matemáticas de coordenadas.


## V-019 — Selección mediante puntero Phaser

Durante combate, interacción o selección de habilidad, el clic izquierdo sobre el mapa Phaser señala una casilla y mueve el selector canónico. La acción continúa confirmándose mediante `F` o `R`; seleccionar no consume turno ni ejecuta automáticamente ataques, habilidades o interacciones.

El clic utiliza la cámara y el zoom reales mediante el conversor único. Fuera de un modo de selección no mueve al personaje ni abre información de entidades. El doble clic conserva el recentrado únicamente fuera de la selección.

El teclado jugable y la cámara permanecen en componentes especializados. Una futura pantalla de configuración deberá modificar una única asignación central de acciones y teclas para ambos componentes, evitando configuraciones paralelas.

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
- entidades apoyadas mediante los límites visibles de sus PNG transparentes;
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
