# PLAN MAESTRO — MAZMORRAS EXPANDIDAS Y CONTENIDO AMBIENTAL JUGABLE

## 1. PROPÓSITO

Este Plan Maestro guía la expansión de las mazmorras de Dark Moon para que sean mayores, más reconocibles, más densas en contenido jugable y más interesantes de recorrer, sin transformar el proyecto en una reescritura ni crear sistemas paralelos.

La evolución buscada es:

**Mazmorra procedural → mazmorra procedural con lugares reconocibles, cosas que descubrir, romper, activar, registrar y combatir.**

El plan debe conservar la arquitectura canónica vigente del juego y ampliar de forma progresiva la estructura, población y contenido de las cinco mazmorras actuales:

1. Alcantarilla.
2. Cementerio.
3. Casa del Guerrero.
4. Fortaleza abandonada.
5. Sala de guerra.

Este documento define dirección, contratos, alcance, etapas, criterios de diseño y criterios de cierre. No registra SHA ni historial de commits.

---

## 2. PRINCIPIOS RECTORES

### 2.1. Una sola lógica canónica

Todo cambio debe respetar:

- una sola lógica canónica;
- un solo estado real;
- un solo cálculo de movimiento;
- un solo cálculo de combate;
- una sola resolución de muerte;
- una sola entrega de experiencia;
- una sola entrega de botín;
- una sola persistencia;
- datos configurables;
- integración genérica;
- ausencia de excepciones por nombre visible.

Phaser representa el mundo y los resultados de la lógica. No debe convertirse en un motor paralelo de reglas.

### 2.2. Realismo funcional de los objetos

Regla de diseño:

> **Si un elemento visual representa un objeto físico reconocible del mundo, debe tener un comportamiento jugable coherente.**

Ejemplos:

- una silla debe poder destruirse, interactuarse o justificar otra función real;
- una mesa debe poder destruirse, registrarse o contener/dejar elementos cuando corresponda;
- un barril debe ser una entidad física y no una decoración puramente visual;
- un sarcófago, armario, caja, cadáver, estantería o elemento equivalente debe existir para el juego si se representa como objeto.

No se deben agregar PNG de objetos únicamente para decorar una habitación.

### 2.3. Decoración ambiental permitida

Pueden seguir siendo variaciones visuales del terreno, paredes o estructura aquellos elementos que no constituyen razonablemente un objeto independiente:

- charcos;
- humedad;
- manchas;
- sangre;
- musgo;
- grietas;
- baldosas rotas;
- roturas de piso;
- marcas en paredes;
- desgaste;
- tierra;
- variaciones de muro o suelo;
- detalles equivalentes integrados al ambiente.

Estos elementos pueden aportar identidad sin requerir una entidad jugable independiente.

### 2.4. Habitaciones ambientales reservadas

Cada plantilla de mazmorra debe declarar en su JSON un rango de **1 a 3 habitaciones ambientales sin contenido de valor inmediato**. El mínimo nunca puede ser menor que 1 y el máximo nunca puede superar 3. Cuando mínimo y máximo coinciden, la cantidad queda fijada; por ejemplo, `2/2` obliga a reservar exactamente 2 habitaciones.

La selección debe ser reproducible por semilla y formar parte del contrato canónico de población, tanto para las cinco mazmorras actuales como para cualquier mazmorra futura que utilice esta infraestructura.

Estas habitaciones pueden tener:

- variaciones de piso;
- charcos;
- grietas;
- humedad;
- roturas;
- manchas;
- otras características ambientales compatibles con el mapa.

No deben recibir automáticamente:

- cofres;
- botín valioso;
- enemigos;
- destructibles con recompensa relevante;
- fuentes;
- interactuables de beneficio;
- eventos.

Su finalidad es doble:

1. mejorar el ritmo y evitar que todas las habitaciones sean recompensas o combates;
2. reservar espacios identificables para futuros NPC, quests, eventos, fuentes, altares u otros contenidos.

La reserva debe formar parte del modelo de la mazmorra y no depender simplemente de que una habitación quede vacía por azar.

### 2.5. Escala sin caminata vacía

Aumentar el tamaño no significa multiplicar linealmente enemigos, barriles o distancia recorrida.

El crecimiento debe aportar:

- más estructura;
- más secciones reconocibles;
- mejor distribución de contenido;
- variedad de ritmo;
- zonas ambientales;
- objetos con función;
- capacidad futura para eventos, NPC y quests.

---

## 3. MODELO DE CONTENIDO POR HABITACIÓN O SECCIÓN

La población futura debe dejar de depender únicamente de densidades globales por superficie.

Cada habitación o sección debe poder disponer de una capacidad o presupuesto configurable.

### 3.1. Dimensiones mínimas del presupuesto

El presupuesto debe contemplar, como mínimo:

**Ocupación**
- cuánto espacio físico y táctico consume el contenido;
- cuánto puede dificultar el movimiento o la lectura de la habitación.

**Amenaza**
- cuánto peligro aporta el contenido;
- especialmente enemigos u otros elementos hostiles cuando se incorporen.

**Valor o recompensa**
- cuánto beneficio esperado puede entregar;
- debe considerar contenido directo y, cuando corresponda, drops esperados.

Los valores concretos no quedan fijados en este Plan Maestro. Deben definirse y probarse durante las etapas correspondientes.

### 3.1.1. Ecuación canónica y extensible

El presupuesto debe resolverse mediante un único contrato reutilizable. Cada contenido expresa uno o más componentes de coste y la ecuación canónica suma sus contribuciones sobre las mismas dimensiones de ocupación, amenaza y valor/recompensa.

Conceptualmente:

**coste total del contenido = suma de componentes de coste**

**presupuesto de habitación = capacidad por tamaño, respetando mínimo, máximo y multiplicadores configurados**

El máximo por habitación es parte del mismo contrato y evita que una habitación muy grande multiplique contenido de forma indefinida solo por disponer de más superficie.

Una mejora futura puede agregar nuevos componentes de coste, pero debe hacerlo extendiendo esta ecuación compartida y no creando cálculos paralelos dentro de enemigos, cofres, destructibles, mapas o perfiles concretos.

### 3.2. Objetivo del presupuesto

Evitar situaciones como:

- habitaciones saturadas porque físicamente “entra” todo;
- acumulación excesiva de cofres y destructibles valiosos;
- grandes habitaciones siempre llenas;
- pequeñas habitaciones impracticables;
- crecimiento de enemigos proporcional únicamente al área total;
- recorridos sin pausas ambientales.

### 3.3. Reglas de colocación

Toda población debe preservar:

- accesibilidad;
- conectividad;
- rutas transitables;
- puertas utilizables;
- entrada y salida de habitaciones;
- acceso al portal;
- posiciones válidas para jugador y enemigos;
- lectura táctica;
- compatibilidad con movimiento en ocho direcciones;
- compatibilidad con FOV, percepción y línea de visión.

---

## 4. PERFILES DE HABITACIÓN

El sistema debe permitir que una habitación tenga una identidad o perfil de contenido sin convertir cada perfil en un generador diferente.

Un perfil puede determinar:

- familias de objetos posibles;
- cantidad o rango de contenido;
- presupuesto disponible;
- decoración ambiental permitida;
- probabilidad de interactuables;
- probabilidad de destructibles;
- restricciones de colocación;
- contenido excluido.

La geometría de la habitación continúa perteneciendo al generador estructural.

El perfil define **cómo se usa esa habitación**, no crea un motor de mazmorra paralelo.

Los perfiles concretos se incorporarán mapa por mapa.

---

## 5. FAMILIAS DE ENTIDADES

### 5.1. Destructibles

Este plan debe ampliar el uso de destructibles como uno de sus objetivos principales.

Familias posibles, según el mapa:

- barriles;
- cajas;
- sillas;
- mesas;
- bancos;
- estanterías;
- muebles;
- urnas;
- ataúdes;
- sarcófagos;
- lápidas deterioradas;
- barricadas;
- jaulas;
- armeros;
- objetos equivalentes coherentes con cada escenario.

Un destructible puede:

- bloquear ocupación;
- recibir daño;
- destruirse;
- producir drops;
- liberar una casilla;
- producir una interacción futura.

No deben agregarse comportamientos especiales por nombre visible.

### 5.2. Registrables o contenedores

Familias posibles:

- cadáveres;
- esqueletos;
- cajas;
- arcones;
- armarios;
- escritorios;
- estanterías;
- sarcófagos;
- contenedores temáticos.

La existencia del objeto debe ser coherente con su función y con el mapa.

### 5.3. Interactuables de beneficio

Dentro de este plan se permite incorporar como primer caso:

- Fuente de Vida;
- Fuente de Maná.

El objetivo funcional inicial es simple:

**interacción → resolución canónica → recuperación configurada de Vida o Maná → resultado visual**

Si su implementación requiere un contrato genérico de obtención de beneficios, ese contrato debe nacer con un uso real y no como abstracción productiva sin consumidor.

Debe permitir futuras extensiones sin implementarlas ahora, por ejemplo:

- bendiciones;
- maldiciones;
- bonificaciones;
- penalizaciones;
- efectos temporales;
- eliminación de estados.

No se implementarán esas extensiones durante este plan salvo aprobación posterior.

---

## 6. ALCANCE EXCLUIDO

Quedan fuera del Plan Maestro actual, salvo redefinición explícita posterior:

- barriles explosivos;
- destructibles que generen fuego, veneno u otras zonas ofensivas;
- trampas;
- puzzles;
- llaves obligatorias;
- puertas con requisitos especiales;
- paredes secretas;
- habitaciones secretas complejas;
- eventos dinámicos;
- encuentros especiales por habitación;
- emboscadas;
- altares;
- bendiciones;
- maldiciones;
- quests;
- NPC procedurales;
- destrucción que cambie radicalmente la topología;
- lógica de encuentros o eventos narrativos avanzados.

La arquitectura nueva no debe bloquear estos contenidos futuros, pero tampoco debe implementarlos de forma anticipada.

---

# 7. ETAPAS DEL PLAN

## E4.A — Expansión estructural y presupuesto de población

**Estado:** Cerrada

### Objetivo

Aumentar transversalmente la escala y capacidad de contenido de las cinco mazmorras, dejando una base canónica común para los cinco hitos temáticos posteriores y para futuras mazmorras que reutilicen el mismo contrato de generación y población.

### Alcance

- revisar las dimensiones actuales de las cinco mazmorras;
- definir rangos mayores de tamaño;
- aumentar la cantidad posible de habitaciones y secciones;
- conservar conectividad y rutas válidas;
- comprobar mapas mayores que la pantalla;
- comprobar cámara, zoom y desplazamiento;
- comprobar FOV, percepción y descubrimiento;
- comprobar IA y rendimiento en mapas mayores;
- identificar habitaciones de forma estable dentro del plano generado;
- permitir clasificación o metadatos de habitación;
- reservar por mazmorra la cantidad de habitaciones ambientales indicada en su JSON, siempre dentro del rango canónico de 1 a 3;
- introducir capacidad o presupuesto por habitación/sección;
- contemplar ocupación, amenaza y valor/recompensa;
- evitar que las densidades globales multipliquen ciegamente enemigos e interactuables;
- dejar soporte para perfiles de habitación;
- mantener compatibilidad con semillas reproducibles;
- mantener el generador estructural como única fuente de geometría procedural.

### No incluye

- identidad visual profunda de cada mapa;
- nuevas familias extensas de muebles u objetos;
- eventos o encuentros especiales;
- trampas;
- altares;
- bendiciones o maldiciones;
- quests;
- NPC nuevos por el mero objetivo de llenar habitaciones.

### Criterio de cierre

La etapa puede marcarse **Cerrada** cuando las cinco mazmorras soporten satisfactoriamente la nueva escala, sus habitaciones estén identificadas y preparadas para perfiles/presupuestos, cada mapa respete su rango configurado de 1 a 3 habitaciones ambientales reservadas, las rutas continúen siendo válidas y no se detecten regresiones relevantes en generación, movimiento, cámara, FOV, IA, transición, guardado/carga o rendimiento.

---

## E4.B — Alcantarilla expandida

**Estado:** Pendiente

### Objetivo

Dar identidad jugable propia a la Alcantarilla utilizando perfiles de habitación, destructibles, registrables, interactuables y ambiente integrado al terreno.

### Perfiles candidatos

- depósito;
- almacén;
- desagüe;
- cámara inundada;
- mantenimiento;
- guarida;
- zona de desperdicios;
- habitación ambiental reservada.

### Familias candidatas

- barriles;
- cajas húmedas;
- muebles deteriorados;
- barricadas improvisadas;
- restos registrables;
- contenedores;
- elementos funcionales propios de mantenimiento o alcantarillado cuando exista una interacción coherente;
- Fuente de Vida o Fuente de Maná si su presencia resulta temática y se aprueba.

### Dirección ambiental

- charcos;
- humedad;
- suciedad;
- roturas;
- manchas;
- desgaste;
- variaciones de piso y paredes.

### Criterio de cierre

La etapa puede marcarse **Cerrada** cuando la Alcantarilla posea perfiles reconocibles, contenido jugable coherente con su ambientación, destructibles/interactuables funcionales, presupuesto respetado, habitaciones ambientales reservadas y una regresión satisfactoria del flujo completo del mapa.

---

## E4.C — Cementerio expandido

**Estado:** Pendiente

### Objetivo

Dar identidad jugable propia al Cementerio mediante contenido funerario funcional y perfiles de habitación diferenciados.

### Perfiles candidatos

- cripta;
- cámara funeraria;
- osario;
- capilla;
- depósito funerario;
- tumba importante;
- habitación ambiental reservada.

### Familias candidatas

- lápidas;
- ataúdes;
- sarcófagos;
- urnas;
- bancos;
- rejas o estructuras funcionales;
- cadáveres o esqueletos registrables;
- contenedores funerarios;
- elementos equivalentes coherentes con el escenario.

### Dirección ambiental

- grietas;
- humedad;
- polvo;
- roturas;
- manchas;
- piedra deteriorada;
- variaciones de suelo y muro.

### Criterio de cierre

La etapa puede marcarse **Cerrada** cuando el Cementerio posea identidad jugable propia, perfiles diferenciados, contenido funerario funcional, presupuesto respetado, habitaciones ambientales reservadas y una regresión satisfactoria del mapa.

---

## E4.D — Casa del Guerrero expandida

**Estado:** Pendiente

### Objetivo

Transformar la Casa del Guerrero en un espacio doméstico y militar reconocible donde los objetos físicos tengan función jugable.

### Perfiles candidatos

- dormitorio;
- cocina o comedor;
- depósito;
- entrenamiento;
- arsenal;
- despacho;
- habitación ambiental reservada.

### Familias candidatas

- mesas;
- sillas;
- camas;
- armarios;
- armeros;
- estanterías;
- cajas;
- bancos;
- mesas de trabajo;
- soportes funcionales de equipo cuando corresponda;
- cofres y otros contenedores.

### Dirección ambiental

- madera dañada;
- polvo;
- manchas;
- desgaste;
- roturas;
- variaciones de piso y paredes.

### Criterio de cierre

La etapa puede marcarse **Cerrada** cuando la Casa del Guerrero se lea como un lugar habitado y funcional, sus objetos físicos posean comportamiento coherente, los perfiles respeten presupuesto y tránsito, las habitaciones ambientales estén preservadas y el mapa supere la regresión correspondiente.

---

## E4.E — Fortaleza abandonada expandida

**Estado:** Pendiente

### Objetivo

Dar a la Fortaleza abandonada una identidad militar de mayor escala, con objetos, barreras, mobiliario y sectores funcionales.

### Perfiles candidatos

- barracas;
- arsenal;
- prisión;
- almacén;
- comedor;
- puesto de guardia;
- sector de mantenimiento;
- habitación ambiental reservada.

### Familias candidatas

- barricadas;
- cajas;
- armeros;
- mesas;
- bancos;
- estanterías;
- jaulas;
- camas;
- soportes;
- mobiliario militar;
- contenedores.

### Dirección ambiental

- piedra rota;
- humedad;
- polvo;
- desgaste;
- grietas;
- manchas;
- daños estructurales no interactuables integrados al terreno.

### Criterio de cierre

La etapa puede marcarse **Cerrada** cuando la Fortaleza abandonada posea sectores militares reconocibles, contenido funcional coherente, destructibles y registrables integrados al presupuesto, habitaciones ambientales reservadas y regresión satisfactoria.

---

## E4.F — Sala de guerra expandida

**Estado:** Pendiente

### Objetivo

Dar a la Sala de guerra una identidad de mando, estrategia y jerarquía, utilizando contenido jugable de mayor importancia visual y funcional.

### Perfiles candidatos

- sala estratégica;
- despacho;
- sala de oficiales;
- archivo;
- arsenal;
- cámara protegida;
- depósito;
- habitación ambiental reservada.

### Familias candidatas

- grandes mesas;
- sillas;
- arcones;
- armarios;
- estanterías;
- documentos registrables;
- mapas o mesas tácticas cuando tengan una interacción real;
- elementos militares de mando;
- contenedores y mobiliario funcional.

### Dirección ambiental

- desgaste;
- polvo;
- piedra dañada;
- marcas de combate;
- roturas;
- manchas;
- variaciones de piso y paredes.

### Criterio de cierre

La etapa puede marcarse **Cerrada** cuando la Sala de guerra tenga identidad propia de mando y estrategia, sus objetos visuales relevantes posean función jugable, se respeten presupuestos y habitaciones ambientales y se complete la regresión del mapa.

---

# 8. REUTILIZACIÓN Y GENERALIZACIÓN

Cada etapa de mapa puede introducir contenido específico.

Cuando una necesidad sea reutilizable:

- extender el contrato genérico existente;
- reutilizar familias ya creadas;
- configurar diferencias mediante datos;
- evitar clases o sistemas duplicados por escenario;
- evitar excepciones por nombre visible.

Ejemplo conceptual:

Una caja creada para Alcantarilla debe poder reutilizarse en otro mapa si su comportamiento es el mismo, variando configuración, recurso visual, resistencia, contenido u otros datos permitidos.

No crear `CajaAlcantarilla`, `CajaCementerio` o equivalentes si representan el mismo concepto funcional.

A la vez, no se debe crear una mega-abstracción anticipada para resolver casos que todavía no existen.

---

# 9. CONTENIDO, DROPS Y BALANCE

El valor de un objeto no debe analizarse únicamente por su presencia.

Cuando un destructible, registrable, enemigo o contenedor pueda producir drops, su aporte al presupuesto de recompensa debe considerar el valor esperado de esos resultados.

El balance debe evitar:

- exceso de objetos por habitación;
- exceso de recompensa;
- exceso de amenaza;
- saturación visual;
- bloqueo de rutas;
- habitaciones iguales entre sí;
- obligación de destruir cada objeto para progresar;
- sensación de “limpieza compulsiva” del escenario.

Los destructibles pueden tener recompensa nula o baja cuando resulte coherente. Su función puede ser espacial, táctica o ambiental.

---

# 10. PERSISTENCIA Y REPRODUCIBILIDAD

Todo cambio debe revisar explícitamente:

- semillas reproducibles;
- reconstrucción del mapa;
- identidad de entidades;
- destrucción persistida cuando corresponda;
- apertura o registro de interactuables;
- consumo de fuentes si corresponde;
- compatibilidad con guardado y carga;
- comportamiento ante partidas previas cuando el contrato cambie.

No debe introducirse una segunda persistencia específica para mazmorras.

---

# 11. RENDIMIENTO Y ESCALA

El aumento de tamaño debe validarse con escenarios de carga realistas.

Debe comprobarse:

- generación;
- tiempo de entrada a mapa;
- render;
- cámara;
- zoom;
- FOV;
- percepción;
- IA;
- búsqueda de posiciones;
- interacción;
- destrucción;
- cantidad de entidades;
- guardado/carga;
- transición;
- memoria observable;
- fluidez durante combate y movimiento.

No se debe considerar satisfactoria una escala mayor si solo “entra en memoria” pero degrada claramente la experiencia de juego.

---

# 12. PRUEBAS TRANSVERSALES

Cada etapa debe adaptar las pruebas a su alcance, pero mantener regresión sobre los sistemas afectados.

Como mínimo considerar:

- generación con varias semillas;
- conectividad;
- entrada y salida;
- portal;
- puertas;
- movimiento cardinal y diagonal;
- espera;
- cámara;
- zoom;
- redimensionamiento;
- pantalla completa;
- FOV;
- descubrimiento;
- percepción;
- enemigos visibles y ocultos;
- IA;
- combate;
- destructibles;
- interacción;
- botín;
- inventario;
- guardado;
- carga;
- versión web;
- ejecución offline cuando corresponda;
- rutas de assets;
- rendimiento.

Para mapas ampliados deben incluirse casos mínimos, medios y grandes.

---

# 13. CRITERIOS GENERALES DE CIERRE DEL PLAN

El Plan Maestro de Mazmorras Expandidas puede considerarse completado cuando:

- E4.A esté Cerrada;
- E4.B esté Cerrada;
- E4.C esté Cerrada;
- E4.D esté Cerrada;
- E4.E esté Cerrada;
- E4.F esté Cerrada;
- las cinco mazmorras utilicen la infraestructura transversal común;
- todas conserven conectividad y recorrido válido;
- cada mapa posea identidad jugable propia;
- los objetos físicos relevantes tengan función;
- existan habitaciones ambientales reservadas;
- el presupuesto de contenido sea funcional;
- no existan motores paralelos de generación o población;
- la persistencia siga siendo única;
- la versión web continúe operativa;
- los riesgos pendientes estén documentados.

---

# 14. ESTADO DEL PLAN

| Etapa | Nombre | Estado |
|---|---|---|
| E4.A | Expansión estructural y presupuesto de población | Cerrada |
| E4.B | Alcantarilla expandida | Pendiente |
| E4.C | Cementerio expandido | Pendiente |
| E4.D | Casa del Guerrero expandida | Pendiente |
| E4.E | Fortaleza abandonada expandida | Pendiente |
| E4.F | Sala de guerra expandida | Pendiente |

Al cerrar una etapa solo debe actualizarse su **Estado** a `Cerrada` o, si corresponde, `Cerrada con pendientes`.

Este Plan Maestro no debe incorporar seguimiento de SHA, historial de commits ni bitácora de commits.

---

# 15. PRINCIPIO FINAL

El objetivo no es llenar las mazmorras de objetos.

El objetivo es que cada espacio tenga una razón de existir, que los objetos visibles pertenezcan realmente al mundo y que la exploración alterne de forma natural entre:

- desplazamiento;
- observación;
- combate;
- destrucción;
- interacción;
- registro;
- recompensa;
- espacios ambientales de pausa.

Toda incorporación debe preguntarse:

> **¿Este contenido hace que la mazmorra sea más creíble, más legible o más interesante de recorrer?**

Si la respuesta es no, no debe agregarse únicamente para llenar espacio.
