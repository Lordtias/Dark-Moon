# PLAN MAESTRO — HABILIDADES PASIVAS Y MODIFICADORES CANÓNICOS

**Proyecto:** Dark Moon  
**Hito:** Habilidades pasivas  
**Idioma obligatorio:** Español para código nuevo, nombres técnicos nuevos, comentarios, documentación y configuraciones nuevas.  
**Fuente de verdad de implementación:** el repositorio real entregado al iniciar cada etapa.  
**Estado:** Plan maestro rector. HP0 quedó documentada y HP1 quedó cerrada tras implementar y validar la generalización de progresión/configuración. La siguiente etapa es HP2 — Auditoría exhaustiva, contrato, resolutor y afijos globales. Cada etapa requiere análisis del repositorio real, propuesta concreta y aprobación explícita antes de modificar código.

---

## 1. PROPÓSITO

Este Plan Maestro guía la incorporación de habilidades pasivas a Dark Moon sin crear un motor paralelo de reglas ni introducir excepciones específicas por habilidad, aura, maldición, objeto o nombre visible.

El objetivo no es únicamente agregar tres pasivas concretas. El hito debe dejar una infraestructura canónica y extensible capaz de soportar posteriormente muchas fuentes de modificación sobre estadísticas, combate y habilidades.

La evolución buscada es:

**Habilidad aprendida / efecto temporal / equipo → modificador declarativo → cálculo canónico existente → resultado canónico → interfaz o Phaser representa el resultado.**

Las pasivas deben compartir el mismo sistema de progresión de habilidades y los mismos puntos universales/específicos que las habilidades activas. No debe existir un `SistemaPasivasJugador` independiente que duplique progresión, persistencia o reglas.

Las auras y maldiciones deben considerarse hermanas temporales de las pasivas:

- una **pasiva** aporta modificadores mientras esté aprendida y se cumplan sus condiciones; en este hito las pasivas pertenecen al jugador salvo decisión futura explícita;
- una **aura** aporta modificadores positivos mientras su efecto temporal permanezca activo;
- una **maldición** aporta modificadores negativos mientras su efecto temporal permanezca activo;
- auras y maldiciones deben poder modificar a **cualquier combatiente afectado**, incluido un enemigo, sin crear un resolutor separado para enemigos;
- un **afijo global de equipo** aporta modificadores mientras el objeto correspondiente esté equipado;
- un **afijo local de objeto** continúa modificando únicamente al objeto que lo contiene.

El resolutor general se diseña para **combatientes**, no exclusivamente para el jugador. La fuente del modificador puede diferir por entidad: el jugador puede aportar pasivas, equipo y efectos temporales; un enemigo puede no tener pasivas propias y aun así recibir auras, maldiciones u otros efectos que modifiquen sus valores canónicos.

---

## 2. PRINCIPIOS RECTORES

### 2.1. Una sola lógica canónica

Todo el hito debe respetar:

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

Phaser representa resultados. HTML/CSS representa paneles, tooltips y estados. Ninguna capa visual debe recalcular estadísticas o habilidades.

### 2.2. No existe un sistema por atributo

No deben crearse sistemas independientes del tipo:

```text
SistemaEvasion
SistemaAlcance
SistemaCritico
SistemaArmadura
SistemaPotencia
...
```

Las ecuaciones canónicas actuales continúan siendo responsables de calcular sus valores base.

Debe existir un único contrato de objetivos modificables y un único resolutor genérico de modificadores.

Conceptualmente:

```text
Ecuación canónica
  ↓
calcula valor base
  ↓
resolver(OBJETIVO_CANONICO, base, contexto)
  ↓
valor modificado
  ↓
aplicar límites/redondeos propios de la regla
  ↓
resultado canónico
```

### 2.3. Una habilidad no modifica código

Una pasiva, aura, maldición o afijo global no debe contener lógica específica dentro de `SistemaCombate`, `EstadisticasDerivadas`, escenas Phaser o paneles.

Debe declarar únicamente:

- qué objetivo modifica;
- qué operación utiliza;
- qué valor aporta;
- qué condición debe cumplirse;
- de qué fuente proviene.

Está prohibido resolver contenido mediante condiciones equivalentes a:

```text
si tiene Ojo de halcón...
si tiene Armadura ligera...
si tiene Aura de precisión...
si objeto es X...
```

### 2.4. Sin nombres visibles como contrato

Los nombres traducibles sirven únicamente para presentación.

La lógica debe trabajar con IDs y claves canónicas estables.

Ejemplo:

```text
ojo_halcon
alcanceAtaque
arco
```

Nunca con:

```text
"Ojo de halcón"
"Alcance"
"Arco corto"
```

### 2.5. No crear un lenguaje ejecutable dentro del JSON

Las configuraciones pueden declarar datos, operaciones y condiciones soportadas por contratos canónicos.

No deben introducir:

- `eval`;
- funciones serializadas;
- expresiones JavaScript en texto;
- fragmentos de código dentro de JSON;
- callbacks configurables arbitrarios.

La extensibilidad se obtiene ampliando contratos explícitos, no ejecutando código proveniente de configuración.

---

## 3. ESTADO HEREDADO RELEVANTE

Al redactar HP0, el repositorio real dispone de estas bases aprovechables:

- `ProgresoMagicoJugador` conserva puntos universales, puntos específicos, niveles de maestría, experiencia y grados de habilidad;
- `mejorarHabilidad()` ya valida requisitos y consumo de puntos;
- la progresión actual está restringida conceptualmente y por validación a las maestrías mágicas existentes;
- `PanelHabilidadesMaestrias` ya muestra familias Mágicas, Básicas, Armas y Armaduras, aunque Armas y Armaduras todavía no poseen progresión funcional;
- `PercepcionJugador` ya posee el precedente de base + modificadores + valor actual;
- `SistemaEfectosTemporales` ya conserva duración, acumulación, renovación y eliminación de efectos;
- los efectos temporales actuales pueden modificar factores temporales, pero todavía no forman un sistema general de modificadores de estadísticas/habilidades;
- `SistemaAfijos` ya genera prefijos/sufijos mediante propiedades, operaciones, grados, pesos y compatibilidades sin depender del nombre visible;
- los catálogos actuales mezclan afijos locales del objeto con afijos que repercuten sobre estadísticas del portador;
- la persistencia de progreso actual espera las maestrías y habilidades conocidas por la configuración; para este hito se parte explícitamente de **cero partidas guardadas previas**, por lo que HP1 puede adoptar directamente el esquema nuevo sin migraciones, parches ni compatibilidad retroactiva.

El hito debe aprovechar estas piezas. No debe reemplazarlas por motores paralelos cuando sea posible generalizarlas.

### 3.1. Estado actual tras HP1

HP1 reemplazó la progresión exclusivamente mágica por el contrato general vigente:

- `ProgresoHabilidadesJugador` es la única fuente de puntos, niveles de maestría, experiencia y grados de habilidad;
- `ContextoProgresoHabilidades` carga y valida los catálogos generales;
- `ValidadorConfiguracionProgresoHabilidades` acepta categorías, maestrías y cantidades de habilidades configurables sin conocer una lista fija de elementos;
- `src/config/habilidades/Maestrias.json` y `src/config/habilidades/Habilidades.json` son las ubicaciones canónicas generales;
- cada habilidad declara `tipo: activa | pasiva`;
- las pasivas pueden progresar, pero no poseen ejecución directa, no pueden asignarse a la barra y no requieren perfil visual de ejecución;
- el panel obtiene categorías y maestrías desde configuración y admite categorías vacías sin placeholders de negocio codificados;
- la persistencia utiliza `progresoHabilidades` y versiones nuevas, sin migración ni aliases del esquema anterior;
- no sobreviven wrappers, configuraciones ni clases productivas de `ProgresoMagicoJugador`;
- las doce habilidades actuales continúan declaradas como activas; las maestrías físicas y el catálogo amplio de pasivas permanecen deliberadamente pendientes para HP3.

---

## 4. PROGRESIÓN GENERAL DE HABILIDADES

### 4.1. Generalización obligatoria

La progresión deja de estar conceptualmente limitada a magia.

`ProgresoMagicoJugador` debe evolucionar a un único sistema general equivalente a:

```text
ProgresoHabilidadesJugador
```

La generalización reemplaza al sistema anterior. No deben convivir dos progresiones independientes.

El nuevo sistema conserva:

- puntos universales;
- puntos específicos por maestría;
- nivel de maestría;
- experiencia de maestría;
- grado de habilidad;
- requisitos de nivel de maestría;
- grados máximos configurables;
- validación de que un punto específico solo se utilice dentro de su maestría.

### 4.2. Configuración

Las definiciones generales de maestrías y habilidades deben salir del directorio conceptual exclusivo de magia.

Dirección aprobada:

```text
src/config/habilidades/Maestrias.json
src/config/habilidades/Habilidades.json
```

La ubicación de configuraciones exclusivamente mágicas, como efectos elementales específicos, no debe cambiar solo por uniformidad si no existe necesidad real.

### 4.3. Tipos de habilidad

Cada habilidad debe declarar un tipo canónico como mínimo:

```text
activa
pasiva
```

Una habilidad pasiva:

- puede tener grados;
- puede consumir puntos universales o específicos;
- puede requerir nivel de maestría;
- no tiene ejecución directa;
- no consume una acción por activación;
- no debe poder asignarse a la barra como habilidad ejecutable;
- deriva sus modificaciones de su definición y grado aprendido.

Una habilidad activa conserva el flujo actual de ejecución.

### 4.4. Familias y maestrías físicas

El contrato general debe permitir incorporar maestrías de armas y armaduras sin modificar validadores cada vez que aparezca una nueva familia.

Las familias visuales ya anticipadas en la interfaz deben poder estar respaldadas por datos configurables:

- Mágicas;
- Básicas;
- Armas;
- Armaduras;
- futuras categorías que utilicen el mismo contrato.

No deben fijarse en código cantidades exactas de maestrías, habilidades por maestría o secuencias de grados salvo que una regla funcional lo exija realmente.

---

## 5. CONTRATO CANÓNICO DE MODIFICADORES

### 5.1. Registro único de objetivos modificables

Debe existir una fuente única de verdad para las claves que pueden ser modificadas.

Dirección conceptual:

```text
src/juego/modificadores/ContratosModificadoresCombatiente.js
```

El nombre final podrá ajustarse al analizar la implementación, pero debe existir un único registro canónico equivalente.

Ejemplos de objetivos posibles:

```text
alcanceAtaque
evasion
precision
armadura
vidaMaxima
manaMaximo
probabilidadCritico
multiplicadorCritico
danoManoSecundaria
potenciaHabilidad
resistenciaFuego
resistenciaFrio
danoHabilidad
atributoHabilidad
...
```

La lista exacta debe crecer conforme se integren puntos reales de cálculo. No se crearán claves anticipadas que no tengan un consumidor canónico real.

HP2 debe realizar una **auditoría fuerte del universo de variables potencialmente modificables** antes de cerrar el catálogo inicial. No debe limitarse a los ejemplos ya discutidos. Debe recorrer cálculos y contratos reales de jugador, enemigos, armas, armaduras, escudos, quiver, recursos, resistencias, crítico, bloqueo, precisión, evasión, alcance, economía temporal, habilidades, efectos, equipamiento y cualquier otro subsistema que pueda exponer una variable útil al contrato común.

La auditoría debe distinguir al menos:

- valores propios del combatiente;
- valores propios de arma/ataque;
- valores propios de armadura/mitigación;
- variables de escudos y bloqueo;
- variables de quiver/flechas cuando existan en el cálculo real;
- recursos y regeneraciones;
- resistencias e inmunidades modificables;
- probabilidad/multiplicadores de crítico;
- costes temporales o de recursos cuando corresponda;
- propiedades globales aportadas por equipo/afijos;
- atributos internos de habilidades;
- variables que también deban resolverse para enemigos afectados por efectos temporales.

El objetivo de HP2 no es registrar todo por anticipación, sino identificar exhaustivamente **qué puntos reales merece la pena convertir en objetivos canónicos** y cuáles deben permanecer locales a su dominio.

### 5.2. Constantes en código y strings validados en configuración

El código productivo debe preferir constantes canónicas equivalentes a:

```text
OBJETIVOS_MODIFICADOR.EVASION
OBJETIVOS_MODIFICADOR.ALCANCE_ATAQUE
OBJETIVOS_MODIFICADOR.DANO_HABILIDAD
OBJETIVOS_MODIFICADOR.ATRIBUTO_HABILIDAD
```

Los JSON necesitan representar esas claves como texto, pero todo texto debe validarse contra el mismo catálogo.

Una clave desconocida debe producir error de configuración explícito.

No debe ignorarse silenciosamente una clave como:

```text
"evacion"
```

### 5.3. El registro no contiene las ecuaciones

El registro canónico define qué se puede modificar y qué operaciones/contextos son válidos.

No debe convertirse en un segundo `SistemaCombate`.

No debe implementar funciones específicas como:

```text
calcularEvasion()
calcularCritico()
calcularArmadura()
```

Las ecuaciones continúan en sus dominios actuales.

### 5.4. Resolutor único

Debe existir un único servicio equivalente a:

```text
SistemaModificadoresCombatiente
```

Responsabilidades:

- recibir objetivo canónico;
- recibir valor base;
- recibir contexto canónico;
- resolver para el combatiente propietario del cálculo, sea jugador o enemigo;
- reunir modificadores vigentes;
- descartar modificadores cuyas condiciones no se cumplan;
- aplicar operaciones en orden canónico;
- devolver resultado y desglose de fuentes.

No es responsable de:

- calcular la estadística base;
- decidir daño bruto;
- resolver impacto;
- ejecutar habilidades;
- mantener duración de auras/maldiciones;
- generar afijos;
- presentar HTML o Phaser.

---

## 6. OPERACIONES Y ORDEN MATEMÁTICO

### 6.1. Operaciones mínimas aprobadas

El contrato debe distinguir explícitamente:

```text
sumar
porcentaje_base
porcentaje_total
```

No debe existir una operación ambigua llamada únicamente `porcentaje`.

### 6.2. Orden canónico

Para un valor base `B`:

```text
P = suma de modificadores planos
PB = suma de porcentajes sobre base
PT = suma de porcentajes sobre total

subtotal = B + P + (B × PB)
resultadoModificado = subtotal × (1 + PT)
```

Ejemplo:

```text
Base                         100
Plano                        +20
10% sobre base              +10
Subtotal                     130
25% sobre total             +32,5
Resultado modificado        162,5
```

### 6.3. Límites y redondeos

Los límites propios de una regla continúan perteneciendo al dominio que calcula el valor.

Ejemplo: si una resistencia posee máximo canónico de 75%, el resolutor puede producir 80, pero la regla de resistencia aplica después su límite canónico.

Conceptualmente:

```text
valor base
  ↓
SistemaModificadores
  ↓
resultado modificado
  ↓
regla propietaria aplica mínimo/máximo/redondeo
  ↓
resultado canónico final
```

El desglose para interfaz debe poder incluir ajustes finales como límites o redondeos sin recalcular el valor en el DOM.

### 6.4. Porcentajes negativos

Las mismas operaciones admiten bonificaciones y penalizaciones.

Una maldición puede aportar un porcentaje negativo sin requerir un tipo matemático diferente.

Los mínimos permitidos deben ser responsabilidad del objetivo/regla canónica correspondiente.

---

## 7. CONTEXTO Y CONDICIONES

### 7.1. Contexto canónico

Al resolver un modificador, la ecuación puede proporcionar contexto relevante.

Ejemplos:

```text
familiaArma
mano
tipoAtaque
idHabilidad
maestria
elemento
tipoHabilidad
categoriaArmadura
conjuntoArmadura
tipoCombatiente
idCombatiente cuando sea estrictamente necesario como identidad técnica y no como excepción de contenido
...
```

El contexto debe utilizar claves canónicas y datos ya existentes en el dominio.

No debe construirse a partir de nombres mostrados.

### 7.2. Condiciones declarativas

Los modificadores pueden declarar condiciones simples que el evaluador común compara contra el contexto.

Ejemplos:

```text
familiaArma = arco
mano = secundaria
idHabilidad = explosion_ignea
maestria = frio
tipoHabilidad = area
```

No debe existir código específico por pasiva.

### 7.3. Pasiva aprendida pero inactiva

Una pasiva puede estar aprendida y no aplicar en el contexto actual.

Ejemplo:

```text
Ojo de halcón
Aprendida: sí
Arma actual: espada
Estado actual: inactiva
Motivo: requiere arco
```

La interfaz debe poder diferenciar aprendizaje de aplicabilidad actual.

---

## 8. MODIFICADORES DE HABILIDADES ACTIVAS

### 8.1. Daño de habilidades

El objetivo canónico `DANO_HABILIDAD` se utiliza para alterar el daño producido por una habilidad sin crear una clave diferente por habilidad.

El contexto permite limitar el modificador a:

- una habilidad concreta;
- una maestría;
- un elemento;
- un tipo de habilidad;
- futuras propiedades canónicas.

Ejemplo conceptual:

```text
objetivo: danoHabilidad
operacion: porcentaje_base
valor: 0.15
condicion:
  elemento: fuego
```

La misma definición aplica a cualquier habilidad futura de fuego que comparta ese contexto.

### 8.2. Atributos internos de habilidad

Los parámetros no relacionados directamente con daño deben utilizar el objetivo general:

```text
ATRIBUTO_HABILIDAD
```

El modificador declara además qué atributo interno modifica.

Debe existir un registro canónico de atributos de habilidad equivalente a:

```text
ATRIBUTOS_HABILIDAD.ALCANCE
ATRIBUTOS_HABILIDAD.RADIO
ATRIBUTOS_HABILIDAD.CANTIDAD_OBJETIVOS
ATRIBUTOS_HABILIDAD.CANTIDAD_OBJETIVOS_CADENA
ATRIBUTOS_HABILIDAD.COSTO_MANA
ATRIBUTOS_HABILIDAD.PROBABILIDAD_EFECTO
ATRIBUTOS_HABILIDAD.DURACION_EFECTO
...
```

La lista debe ampliarse únicamente cuando exista un atributo real que deba ser modificable.

### 8.3. Ejemplos

Pasiva específica:

```text
Nova de escarcha gana +1 de radio

objetivo: atributoHabilidad
atributo: radio
operacion: sumar
condicion:
  idHabilidad: nova_escarcha
```

Pasiva de familia:

```text
Las habilidades de frío ganan +1 de alcance

objetivo: atributoHabilidad
atributo: alcance
operacion: sumar
condicion:
  maestria: frio
```

Afijo legendario futuro:

```text
Las habilidades en cadena ganan +2 objetivos

objetivo: atributoHabilidad
atributo: cantidadObjetivosCadena
operacion: sumar
condicion:
  tipoHabilidad: cadena
```

### 8.4. Regla de integración

Cada atributo de habilidad se integra una sola vez en su punto canónico de consumo.

Después de esa integración, nuevas pasivas, auras, maldiciones o afijos que modifiquen ese atributo no deben requerir cambios en el código de la habilidad.

---

## 9. PASIVAS

### 9.1. Definición

Una pasiva es una habilidad no ejecutable que, según su grado, declara uno o más modificadores permanentes condicionados.

El estado persistido guarda el grado aprendido, no los resultados derivados.

### 9.2. Flujo

```text
Grado aprendido
  ↓
definición de habilidad
  ↓
modificadores correspondientes al grado
  ↓
SistemaModificadores
  ↓
valor actual
```

### 9.3. Pasivas de referencia aprobadas

#### Ojo de halcón — Arco

Objetivo funcional:

```text
+1 Alcance con arcos
```

Debe condicionar el modificador por familia de arma y no por nombre del objeto.

#### Maestría dual — Dagas / combate dual

Objetivo funcional aprobado:

```text
reducir la penalización de daño de la mano secundaria
```

La penalización temporal por utilizar una segunda arma no forma parte de esta pasiva.

El valor exacto de reducción queda como parámetro de balance a fijar en la etapa de contenido correspondiente.

#### Armadura ligera — Armadura liviana

Objetivo funcional aprobado:

```text
aumentar Evasión cuando el conjunto defensivo completo sea ligero
```

Contrato de conjunto completo:

```text
cabeza
torso
manos
piernas
pies
```

Las cinco piezas deben poseer categoría `ligera`.

El escudo no forma parte de este conjunto.

El valor exacto de Evasión queda como parámetro de balance a fijar en la etapa de contenido correspondiente.

---

## 10. AURAS Y MALDICIONES

### 10.1. Reutilización del sistema temporal

No debe crearse un `SistemaAuras` ni un `SistemaMaldiciones` independiente para mantener duración.

`SistemaEfectosTemporales` continúa siendo responsable de:

- aplicación;
- duración;
- renovación;
- acumulación;
- expiración;
- resistencias e inmunidades cuando correspondan.

### 10.2. Relación con modificadores

Un efecto temporal puede declarar modificadores canónicos.

Mientras el efecto esté vigente, esos modificadores forman parte de las fuentes activas del resolutor **del combatiente afectado**.

Al vencer o retirarse el efecto, dejan de participar.

Conceptualmente:

```text
Aura / Maldición
  ↓
SistemaEfectosTemporales mantiene ciclo de vida sobre el objetivo
  ↓
modificadores vigentes del combatiente afectado
  ↓
SistemaModificadores
```

El mismo flujo debe funcionar si el objetivo es el jugador o un enemigo. No se creará un `SistemaModificadoresEnemigo` paralelo. Si una maldición del jugador reduce la Precisión, Evasión, Armadura, Alcance, velocidad/tiempo u otro objetivo soportado de un enemigo, la ecuación canónica de ese enemigo debe consultar el mismo contrato general.

El sistema temporal no debe calcular Evasión, Alcance, Daño o atributos de habilidad.

### 10.3. Signo y semántica

Arquitectónicamente, aura y maldición comparten el mismo contrato matemático.

Su diferencia funcional y visual proviene del contenido y del origen:

- aura: normalmente favorable;
- maldición: normalmente perjudicial.

No hace falta duplicar operaciones para valores positivos y negativos.

---

## 11. PREFIJOS, SUFIJOS Y OBJETOS LEGENDARIOS FUTUROS

### 11.1. SistemaAfijos conserva su responsabilidad

`SistemaAfijos` debe continuar siendo responsable de:

- generación procedural;
- rareza;
- prefijo/sufijo;
- grados;
- pesos;
- compatibilidad;
- exclusiones;
- valores generados;
- persistencia del afijo dentro del objeto.

No debe convertirse en el sistema general de estadísticas.

### 11.2. Ámbitos explícitos

Los efectos de un afijo deben distinguir explícitamente su ámbito.

Dirección conceptual:

```text
local_objeto
portador
```

El nombre final del campo se confirmará en implementación.

No debe inferirse el ámbito únicamente por el nombre de la propiedad.

### 11.3. Afijo local

Un afijo local modifica únicamente al objeto que lo contiene.

Ejemplos actuales:

- daño físico local del arma;
- precisión propia del arma;
- probabilidad de crítico propia del arma;
- multiplicador crítico propio del arma.

Ese resultado pertenece al objeto incluso si está en el suelo, inventario o equipado por otra entidad.

Flujo:

```text
plantilla de objeto
  ↓
SistemaAfijos
  ↓
afijos locales
  ↓
propiedades finales del objeto
```

### 11.4. Afijo global del portador

Un afijo global aporta modificadores al combatiente mientras el objeto esté equipado.

Ejemplos:

```text
+Evasión
+Vida máxima
+Resistencia
+Potencia de habilidad
+Daño de una familia de habilidades
+Alcance con armas a distancia
```

Flujo:

```text
objeto equipado
  ↓
afijo global
  ↓
modificador del portador
  ↓
SistemaModificadores
```

### 11.5. Legendarios futuros

Esta separación debe permitir que un objeto legendario futuro posea afijos globales potentes sin requerir código específico del objeto.

Ejemplos conceptuales:

```text
+20% daño de habilidades de fuego
+1 alcance con armas a distancia
+15% Evasión total
+2 objetivos a habilidades en cadena
```

El objeto sigue utilizando el contrato de afijos; el efecto global reutiliza el sistema común de modificadores.

---

## 12. INTEGRACIÓN CON ECUACIONES CANÓNICAS

### 12.1. Punto de modificación único por valor

Cada valor modificable se conecta una sola vez al resolutor en el lugar donde su ecuación canónica ya produce o consume dicho valor.

Ejemplo Evasión:

```text
ANTES

evasionBase = fórmula existente
resultado = evasionBase
```

```text
DESPUÉS

evasionBase = fórmula existente
resultadoModificado = resolver(EVASION, evasionBase, contexto)
resultado = aplicarReglasFinales(resultadoModificado)
```

Después de esa integración, la pasiva número 50 que modifique Evasión no debe exigir cambios en la ecuación.

### 12.2. No recalcular resultados existentes

Cuando el sistema de combate ya produce un dato final útil, otros sistemas deben consumir ese resultado.

Ejemplos:

- XP de armas utiliza daño realmente aplicado informado por combate;
- XP de armaduras utiliza daño mitigado por armadura informado por combate;
- la interfaz utiliza el desglose producido por el mismo cálculo que determina el valor real.

No debe repetirse una ecuación únicamente para calcular experiencia, tooltip o presentación.

### 12.3. Maestría dual

La penalización base de mano secundaria continúa perteneciendo a la configuración/cálculo canónico de ataque.

La pasiva modifica el factor resultante para ese personaje/contexto.

No debe cambiar globalmente la penalización base del juego.

---

## 13. EXPERIENCIA DE MAESTRÍAS FÍSICAS

### 13.1. Principio

La progresión física debe utilizar resultados reales ya resueltos por el juego.

No debe recompensarse por animaciones, intentos sin efecto o daño teórico que no llegó a aplicarse.

Los factores iniciales serán configurables y no representan una decisión final de balance.

### 13.2. Maestrías de arma

La experiencia se basa en el daño realmente aplicado por la fuente de arma correspondiente.

Hipótesis de partida para HP3, no balance final:

```text
si dañoRealAplicado <= 0:
  XP = 0

si dañoRealAplicado > 0:
  XP = max(1, round(dañoRealAplicado × factorExperienciaArma))
```

HP3 debe analizar si esta forma necesita ajustes antes de fijarla como ecuación inicial productiva. `factorExperienciaArma` debe ser configurable.

Si un ataque utiliza varias fuentes, cada fuente debe atribuir experiencia a la familia de arma que realmente produjo ese daño.

En combate dual, el daño de cada mano debe conservar trazabilidad suficiente para no asignar toda la experiencia a una única arma.

Debe existir deduplicación por resolución/fuente para impedir otorgar dos veces experiencia por el mismo daño.

### 13.3. Maestrías de armadura

La experiencia se basa en el daño realmente mitigado por Armadura, utilizando el resultado canónico de combate.

No se debe considerar como “daño mitigado por armadura” daño evitado por:

- Evasión;
- bloqueo completo;
- resistencias elementales;
- inmunidades;
- mecanismos distintos de Armadura.

La implementación debe consumir el dato canónico que corresponda. Si el resultado actual de combate no expone ese desglose, debe exponerlo desde el cálculo existente y no recomputarlo en progresión.

Hipótesis de partida para HP3:

```text
si dañoMitigadoPorArmadura <= 0:
  XP_total = 0

si dañoMitigadoPorArmadura > 0:
  XP_total = max(1, round(dañoMitigadoPorArmadura × factorExperienciaArmadura))
```

HP3 debe analizar si esta forma necesita ajustes antes de fijarla como ecuación inicial productiva. `factorExperienciaArmadura` debe ser configurable.

Cuando existen piezas de distintas categorías, la XP total se distribuye proporcionalmente según la Armadura aportada por cada categoría equipada:

```text
contribucionCategoria = suma de Armadura aportada por piezas de esa categoría
contribucionTotal = suma de Armadura de piezas con categoría de armadura
participacion = contribucionCategoria / contribucionTotal
```

La distribución entera debe conservar el total de XP obtenido. Se recomienda asignación proporcional con restos mayores o una estrategia equivalente determinista.

Si no existe contribución categorizada válida, no se genera XP específica de armadura.

### 13.4. Balance posterior

Este hito define la infraestructura y una fórmula inicial coherente.

El balance fino de:

- factores de experiencia;
- velocidad de subida;
- requisitos;
- grados;
- magnitudes de pasivas;

queda explícitamente habilitado para una etapa posterior de balance sin necesidad de cambiar la arquitectura.

---

## 14. PANEL DEL PERSONAJE Y DESGLOSE DE ESTADÍSTICAS

### 14.1. Panel HTML/CSS

El panel del personaje continúa siendo HTML/CSS.

No debe migrarse a Phaser para implementar este hito.

### 14.2. Sección de pasivas

El panel debe mostrar de forma compacta las pasivas aprendidas relevantes.

Debe poder distinguir:

```text
Activa
Inactiva por condición
```

Ejemplo:

```text
Ojo de halcón
Inactiva — requiere arco
```

### 14.3. Sección de efectos activos

El panel debe mostrar también auras y maldiciones activas relevantes.

Debe incluir, cuando corresponda:

- nombre localizado;
- efecto resumido;
- condición o acumulaciones;
- duración restante en la unidad canónica utilizada por el juego;
- diferenciación visual positiva/negativa sin depender únicamente del color.

### 14.4. Tooltip de estadísticas

Al hacer hover sobre una estadística modificable, la UI debe poder mostrar el desglose real utilizado por el cálculo.

Ejemplo:

```text
Alcance actual: 8

Base: 6
Ojo de halcón: +1
Aura del explorador: +2
Maldición: -1
```

La interfaz no debe volver a calcular el resultado.

Debe consumir el descriptor generado por la misma resolución que entrega el valor canónico.

### 14.5. Fuentes en el desglose

El descriptor de modificador debe conservar información suficiente para presentar su origen, por ejemplo:

```text
tipoOrigen
idOrigen
idObjeto cuando corresponda
valor
operacion
estado de condición
```

Los nombres visibles y traducciones se resuelven en presentación, no en la lógica.

---

## 15. PERSISTENCIA

### 15.1. No persistir valores derivados

No deben guardarse campos equivalentes a:

```text
bonusAlcance = 1
evasionPasivas = 5
ojoHalconActivo = true
```

La persistencia debe conservar la fuente real:

```text
grados de habilidades
objetos y sus afijos
estado temporal cuando la política de persistencia vigente lo requiera
```

Los modificadores se reconstruyen desde esas fuentes.

### 15.2. HP1 parte sin partidas guardadas

Para este hito se asume expresamente que **no existen partidas guardadas que deban conservarse**.

Por tanto HP1 debe:

- adoptar directamente el nuevo esquema general de progresión;
- realizar los cambios normales sobre contratos y persistencia;
- no crear migradores históricos;
- no crear parches de compatibilidad;
- no crear alias temporales destinados únicamente a partidas anteriores;
- no mantener estructuras obsoletas solo para poder leer un estado que se declaró inexistente.

La única obligación de persistencia es que el nuevo esquema pueda guardarse y cargarse correctamente a partir de la implementación del hito.

### 15.3. Una sola persistencia

No debe existir un archivo de guardado específico para pasivas ni un segundo estado paralelo de modificadores.

---

## 16. VALIDACIÓN DE CONFIGURACIÓN

Toda definición de modificador debe validarse al cargar.

Como mínimo debe comprobarse:

- objetivo existente;
- operación soportada;
- valor numérico válido;
- atributo de habilidad válido cuando `objetivo = atributoHabilidad`;
- condiciones con claves reconocidas;
- valores de condición compatibles con sus catálogos cuando corresponda;
- ámbito de afijo válido;
- ausencia de campos contradictorios;
- habilidad pasiva sin contrato de ejecución incompatible;
- habilidad activa con su contrato de ejecución vigente.

Los errores deben ser explícitos y fallar temprano.

No deben convertirse configuraciones inválidas en “sin efecto” silenciosamente.

---

## 17. FLUJOS CANÓNICOS

### 17.1. Pasiva

```text
Punto de habilidad
  ↓
ProgresoHabilidadesJugador
  ↓
grado aprendido
  ↓
definición de pasiva
  ↓
modificadores candidatos
  ↓
condiciones + contexto
  ↓
SistemaModificadores
  ↓
ecuación canónica
  ↓
resultado
```

### 17.2. Aura / Maldición

```text
Habilidad ejecutada
  ↓
SistemaEfectosTemporales
  ↓
efecto activo y duración
  ↓
modificadores candidatos
  ↓
SistemaModificadores
  ↓
ecuación canónica
```

### 17.3. Afijo global

```text
Objeto generado
  ↓
SistemaAfijos
  ↓
afijo persistido
  ↓
objeto equipado
  ↓
modificador del portador
  ↓
SistemaModificadores
```

### 17.4. Afijo local

```text
Objeto generado
  ↓
SistemaAfijos
  ↓
propiedad local del objeto
  ↓
ecuación consume propiedad del objeto
```

### 17.5. Modificador de habilidad

```text
Habilidad obtiene atributo base
  ↓
ATRIBUTO_HABILIDAD / DANO_HABILIDAD
  ↓
SistemaModificadores + contexto de habilidad
  ↓
atributo efectivo
  ↓
la ejecución canónica utiliza ese valor
```

---

## 18. REGLAS PARA NUEVO CONTENIDO

Una nueva pasiva, aura, maldición o afijo global no debe exigir cambios de código cuando:

- utiliza un objetivo ya registrado;
- utiliza una operación ya soportada;
- utiliza condiciones ya soportadas;
- utiliza un atributo de habilidad ya registrado.

Debe requerirse código únicamente cuando el contenido necesita una nueva clase real de comportamiento o un nuevo punto modificable que todavía no existe.

Cuando se agregue un nuevo objetivo modificable:

1. debe registrarse canónicamente;
2. debe validarse;
3. debe integrarse una sola vez en la ecuación propietaria;
4. debe probarse con al menos una fuente de modificación;
5. debe poder exponer desglose para presentación cuando sea visible al jugador.

---

## 19. ALCANCE VISUAL

Este hito mantiene HTML/CSS como tecnología canónica para el panel del personaje, pero **no se presume que la distribución actual alcance** para presentar correctamente pasivas, auras, maldiciones y desgloses de estadísticas.

HP5 debe realizar primero un análisis de usabilidad y densidad real del panel antes de implementar la presentación final. Si el panel actual no permite mostrar la nueva información con claridad, queda autorizado proponer un **rediseño acotado o profundo del panel Personaje**, siempre respetando `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md` y requiriendo aprobación previa de la propuesta visual.

El análisis debe considerar como mínimo:

- cantidad de estadísticas visibles;
- espacio requerido por Pasivas;
- espacio requerido por Auras/Maldiciones activas;
- estados activa/inactiva de pasivas condicionales;
- tooltips con desgloses extensos;
- resoluciones pequeñas;
- redimensionamiento;
- convivencia con el resto de paneles;
- legibilidad y jerarquía visual;
- necesidad o no de pestañas, agrupadores, secciones colapsables u otra organización.

No debe crearse una HUD paralela ni trasladarse lógica de cálculo al renderizador Phaser.

---

## 20. ETAPAS DEL HITO

### HP0 — Análisis y contrato rector

**Estado al crear este documento:** cierre documental pendiente de integrar el Plan Maestro al repositorio.

Objetivo:

- auditar la arquitectura real;
- definir progresión general;
- definir contrato de modificadores;
- acordar operaciones matemáticas;
- acordar relación con auras/maldiciones;
- acordar integración de afijos;
- acordar experiencia de armas/armaduras;
- acordar representación en Personaje;
- documentar el plan completo.

Criterio de cierre:

- este Plan Maestro queda incorporado al repositorio;
- no se implementa lógica productiva en HP0.

### HP1 — Generalización de progresión y configuración

**Estado:** Cerrada. Implementación, validación estructural/contractual y pruebas manuales básicas completadas.

Objetivo:

- reemplazar la progresión exclusivamente mágica por progresión general de habilidades;
- trasladar configuraciones generales de maestrías/habilidades;
- eliminar restricciones rígidas de las cuatro maestrías mágicas;
- declarar tipos activa/pasiva;
- conservar funcionamiento de habilidades activas actuales;
- adaptar guardado/carga al esquema nuevo partiendo de cero partidas previas.

Restricción específica de HP1:

> Se asume que no existen partidas guardadas que deban conservarse. No implementar migraciones, parches, compatibilidad histórica ni estructuras temporales para estados anteriores.

Resultado esperado:

```text
un único sistema de puntos, maestrías y grados capaz de contener magia, armas, armaduras y pasivas, con persistencia nueva limpia
```

No incluye todavía modificaciones efectivas de combate.

### HP2 — Auditoría exhaustiva, contrato, resolutor y afijos globales

HP2 es una etapa de **análisis arquitectónico fuerte**. No debe comenzar implementando una lista cerrada tomada del Plan Maestro.

Primero debe recorrer el código real y elaborar un inventario de variables, ecuaciones, propiedades y puntos de consumo potencialmente modificables. Debe analizar especialmente, sin limitarse a:

- estadísticas de jugador;
- estadísticas y cálculos equivalentes de enemigos;
- armas y fuentes de ataque;
- armaduras y mitigación;
- escudos y bloqueo;
- quiver/flechas;
- crítico;
- precisión/evasión;
- alcance;
- Vida/Maná y regeneraciones;
- resistencias;
- costes temporales y de acciones cuando corresponda;
- equipamiento;
- afijos actuales;
- cualquier otra variable descubierta cuyo carácter global/condicional justifique integrarla al contrato.

Debe clasificar qué valores:

1. deben registrarse como objetivos modificables del combatiente;
2. deben permanecer como propiedades locales del objeto;
3. necesitan contexto adicional;
4. no deben exponerse al motor porque pertenecen exclusivamente a una ecuación interna no modificable.

Después del análisis, HP2 debe:

- crear el registro único de objetivos modificables;
- crear operaciones `sumar`, `porcentaje_base`, `porcentaje_total`;
- crear contexto y condiciones declarativas;
- crear resolutor único con desglose;
- validar claves desconocidas;
- garantizar que el mismo resolutor funcione para jugador y enemigos;
- distinguir afijos `local_objeto` y `portador`;
- conservar afijos locales en `SistemaAfijos`;
- conectar al resolutor los afijos globales del portador que ya existan o resulten apropiados;
- dejar preparado el contrato para afijos legendarios globales futuros;
- integrar casos representativos reales suficientes para demostrar que no se creó un motor paralelo.

Resultado esperado:

```text
motor canónico general validado contra el universo real de variables del juego, usable por cualquier combatiente y ya conectado con equipamiento/afijos globales
```

### HP3 — Diseño de contenido pasivo y progresión física

HP3 es una etapa de **diseño fuerte de contenido y progresión**, no solo la implementación de tres ejemplos.

Antes de programar debe proponer un **catálogo amplio** y coherente de contenido, no una muestra mínima:

- pasivas de maestrías de armas;
- pasivas de maestrías de armadura;
- pasivas básicas u otras familias si la arquitectura real las justifica;
- un conjunto amplio de auras;
- un conjunto amplio de maldiciones;
- relaciones, requisitos, grados y condiciones;
- distribución razonable de puntos universales/específicos;
- identidad funcional de cada maestría evitando pasivas redundantes;
- cobertura deliberada de distintos objetivos del motor de modificadores, sin crear contenido únicamente para “probar que funciona”.

HP3 define el **diseño funcional del contenido**: qué hace cada pasiva/aura/maldición, para quién, bajo qué condición y con qué progresión inicial. Las auras o maldiciones que necesiten modificar parámetros internos de habilidades pueden quedar técnicamente pendientes de HP4, pero su intención funcional debe quedar diseñada en HP3.

La propuesta debe permitir revisar variedad, identidad, cobertura y posibles solapamientos antes de implementar contenido.

En la misma etapa debe analizar y definir con mayor precisión la XP física:

- fórmula de XP de armas basada en daño realmente aplicado;
- atribución por fuente/mano/familia;
- fórmula de XP de armaduras basada en daño mitigado por Armadura;
- distribución entre categorías por contribución real;
- factores iniciales configurables;
- ritmo aproximado esperado aunque el balance fino quede para un hito posterior;
- protección contra duplicaciones o explotación obvia.

Luego debe:

- conectar pasivas aprendidas al resolutor;
- integrar los puntos modificables reales requeridos por el catálogo aprobado;
- implementar una primera colección significativa de pasivas, no únicamente los tres ejemplos de HP0;
- utilizar Ojo de halcón, Maestría dual y Armadura ligera como casos de referencia, no como límite del diseño;
- implementar XP física según la propuesta aprobada.

Resultado esperado:

```text
primer sistema amplio de pasivas funcionales y progresión física con identidad suficiente para poder jugar, probar y balancear posteriormente
```

### HP4 — Diseño exhaustivo de modificadores de habilidades, auras y maldiciones

HP4 es también una etapa de **análisis y diseño fuerte**.

Antes de implementar debe auditar todas las habilidades activas y sus contratos reales para identificar qué parámetros tiene sentido exponer al sistema de modificadores. No debe limitarse a alcance, radio, daño o cantidad de objetivos ya citados.

Debe revisar, según existan realmente:

- daño;
- alcance;
- radio/área;
- formas o patrones de selección;
- cantidad de objetivos;
- cantidad y alcance de saltos/cadenas;
- coste de Maná;
- costes temporales;
- probabilidad de aplicar efectos;
- duración/intensidad/acumulaciones de efectos;
- intervalos/ticks;
- cantidades de proyectiles o impactos;
- parámetros de zonas temporales;
- condiciones de objetivo;
- cualquier otra variable de habilidad que pueda ser modificada sin convertir el JSON en código.

Después debe proponer y aprobar el catálogo inicial de `ATRIBUTOS_HABILIDAD` y sus puntos exactos de integración.

Debe tomar el catálogo funcional de auras/maldiciones aprobado en HP3 y **refinar su representación técnica** cuando dependa de atributos internos de habilidades o nuevos tipos de modificador descubiertos en esta auditoría. HP4 puede proponer ajustes si el análisis real demuestra que algún diseño de HP3 no puede expresarse limpiamente sin romper los contratos canónicos.

Requisitos específicos:

- incorporar `DANO_HABILIDAD`;
- incorporar `ATRIBUTO_HABILIDAD`;
- integrar cada atributo una sola vez en su consumidor canónico;
- permitir modificadores generales, por maestría, elemento, tipo o habilidad específica mediante contexto;
- permitir que auras/maldiciones modifiquen tanto al jugador como a enemigos afectados;
- comprobar explícitamente casos donde una maldición lanzada por el jugador altera una estadística o capacidad de un enemigo sin lógica específica del enemigo;
- conservar `SistemaEfectosTemporales` como dueño del ciclo de vida.

Resultado esperado:

```text
habilidades activas y efectos temporales completamente integrados al mismo contrato de modificadores para jugador y enemigos, con un catálogo de atributos basado en auditoría real
```

### HP5 — Interfaz, posible rediseño, regresión y cierre

HP5 comienza con un análisis específico de la pantalla de Personaje.

No se asume de antemano que basten cambios mínimos. Debe decidirse, mediante propuesta previa, si corresponde:

- conservar la estructura actual;
- reorganizar secciones;
- incorporar agrupadores/pestañas;
- rediseñar parcialmente;
- realizar un rediseño más profundo del panel manteniendo HTML/CSS y el diseño maestro visual.

Debe contemplar la cantidad final de pasivas, efectos y desgloses producidos por HP2–HP4.

Luego debe:

- mostrar Pasivas en el panel de habilidades;
- mostrar pasivas aprendidas activas/inactivas en Personaje;
- mostrar auras/maldiciones activas;
- mostrar desgloses de estadísticas usando el resultado real del resolutor;
- completar i18n;
- revisar herramientas de balance/depuración afectadas;
- validar persistencia nueva, web, Electron y regresión funcional;
- validar presentación con redimensionamiento y densidad real de contenido;
- actualizar documentación correspondiente;
- generar entrega final del hito.

Resultado esperado:

```text
hito completamente visible, utilizable, verificable y preparado para balance y contenido posterior
```

---

## 21. DEPENDENCIAS ENTRE ETAPAS

```text
HP0
 ↓
HP1
 ↓
HP2
 ↓
HP3
 ↓
HP4
 ↓
HP5
```

La secuencia es deliberada:

- HP1 elimina la restricción conceptual a magia sin cargar deuda de migraciones inexistentes;
- HP2 realiza el inventario exhaustivo y cierra el motor canónico junto con la integración de afijos globales, evitando una etapa pequeña separada;
- HP3 utiliza ese motor para diseñar un catálogo amplio de pasivas y cerrar la progresión física;
- HP4 audita profundamente las habilidades y diseña/integra auras y maldiciones, incluyendo efectos sobre enemigos;
- HP5 decide la arquitectura visual final cuando ya conoce la densidad real de contenido y cierra regresión/documentación.

Una etapa puede dividirse internamente en bloques de trabajo si resulta extensa, pero no deben crearse motores temporales que luego se descarten.

---

## 22. PRUEBAS OBLIGATORIAS DEL HITO

### 22.1. Progresión

- creación de personaje;
- puntos universales;
- puntos específicos correctos;
- rechazo de punto específico de otra maestría;
- grado máximo;
- requisito de nivel;
- habilidad activa existente sin regresión;
- pasiva no asignable a barra ejecutable.

### 22.2. Modificadores

- inventario documentado de objetivos potenciales encontrado en HP2;
- revisión explícita de variables de escudo/bloqueo;
- revisión explícita de variables de quiver/flechas;
- comprobación de valores equivalentes en jugador y enemigos cuando compartan contrato;

- modificador plano;
- porcentaje sobre base;
- porcentaje sobre total;
- combinación de los tres;
- valor negativo;
- condición cumplida;
- condición no cumplida;
- múltiples fuentes simultáneas;
- clave desconocida rechazada;
- operación desconocida rechazada;
- límites finales de la estadística conservados.

### 22.3. Pasivas de referencia

- arco con Ojo de halcón;
- arma no arco con Ojo de halcón aprendido pero inactivo;
- combate dual con modificación únicamente de penalización de daño secundaria;
- set completo ligero;
- ruptura del set al cambiar una pieza;
- escudo sin afectar la definición de set completo.

### 22.4. Progresión física

- daño 0 no genera XP de arma;
- daño real aplicado genera XP;
- exceso de daño sobre vida restante no genera XP por daño inexistente;
- dos fuentes de ataque atribuyen XP correctamente;
- mitigación 0 no genera XP de armadura;
- mitigación real genera XP;
- conjunto mixto distribuye XP según contribución;
- la suma distribuida conserva la XP total;
- bloqueo/resistencia/evasión no se cuentan como mitigación de Armadura.

### 22.5. Habilidades

- daño de habilidad modificado por maestría/elemento;
- atributo específico de una habilidad;
- atributo general por tipo de habilidad;
- alcance;
- radio;
- cantidad de objetivos/cadena cuando exista caso real;
- coste de Maná cuando se integre;
- pasiva y aura actuando simultáneamente;
- maldición reduciendo el mismo atributo;
- expiración del efecto restableciendo el cálculo automáticamente;
- aura/maldición aplicada a enemigo modifica el valor real del enemigo;
- retirar/expirar el efecto en enemigo restablece su cálculo sin recrear la entidad.

### 22.6. Afijos

- afijo local conserva propiedad dentro del objeto;
- afijo local no se aplica globalmente al portador;
- afijo global solo aplica mientras el objeto esté equipado;
- desequipar elimina el modificador global;
- dos objetos con modificadores compatibles se combinan por el contrato común;
- persistencia del objeto mantiene sus afijos;
- futuras rarezas/legendarios pueden utilizar el mismo contrato sin excepción por ID de objeto.

### 22.7. Interfaz

- tooltip muestra base;
- tooltip muestra modificadores planos;
- tooltip distingue porcentaje sobre base y total;
- tooltip muestra límite final cuando corresponda;
- pasiva aprendida activa;
- pasiva aprendida inactiva con motivo;
- aura activa y duración;
- maldición activa y duración;
- traducción ES/EN;
- redimensionamiento;
- zoom sin afectar paneles HTML;
- ninguna estadística es recalculada por presentación.

### 22.8. Compatibilidad y regresión

- inicio web;
- creación de personaje;
- carga;
- combate físico;
- magia;
- estados temporales;
- inventario;
- equipamiento;
- muerte;
- experiencia;
- botín;
- guardado/carga;
- GitHub Pages;
- Electron;
- ejecución offline en los términos ya soportados por el proyecto;
- sintaxis JS;
- parseo JSON;
- ausencia de configuraciones paralelas.

---

## 23. RIESGOS Y CONTROLES

### 23.1. Convertir el resolutor en un segundo motor

Control:

- el resolutor solo aplica modificadores;
- cada dominio conserva su ecuación base y reglas finales.

### 23.2. Strings libres y errores silenciosos

Control:

- catálogo canónico;
- constantes en código;
- validación estricta de JSON;
- error temprano ante claves desconocidas.

### 23.3. Acumulación ambigua de porcentajes

Control:

- operaciones diferentes para base y total;
- orden matemático único documentado.

### 23.4. Duplicación de estado

Control:

- persistir fuentes, no resultados derivados;
- reconstruir modificadores al cargar.

### 23.5. Condiciones especiales por pasiva

Control:

- contexto y condiciones declarativas;
- prohibición de `if` por nombre/ID de contenido dentro de ecuaciones generales.

### 23.6. Afijos locales y globales mezclados

Control:

- ámbito explícito;
- afijos locales permanecen en composición del objeto;
- afijos globales se convierten en fuentes del portador.

### 23.7. XP física calculada dos veces

Control:

- consumir resultados canónicos de combate;
- deduplicar resoluciones;
- no recomputar daño o mitigación en progresión.

### 23.8. Tooltips que divergen del juego

Control:

- el resolutor devuelve resultado + desglose;
- la UI no mantiene una fórmula duplicada.

### 23.9. Jugador y enemigos divergen en el motor de modificadores

Control:

- el resolutor se diseña para combatientes;
- las ecuaciones equivalentes de enemigos deben consultar los mismos objetivos cuando corresponda;
- auras/maldiciones no pueden depender de una implementación exclusiva de `Player` para alterar estadísticas del objetivo;
- las diferencias legítimas entre tipos de combatiente se expresan mediante contexto/contratos, no mediante un segundo motor.

### 23.10. Catálogo incompleto por diseñar solo a partir de ejemplos

Control:

- HP2 y HP4 son etapas de auditoría fuerte;
- se exige recorrer consumidores reales antes de cerrar objetivos/atributos;
- escudos, quiver y demás dominios descubiertos deben evaluarse expresamente aunque finalmente se decida no exponerlos.

---

## 24. COMPATIBILIDAD WEB, PHASER Y ELECTRON

### Web

El hito debe conservar la arquitectura web estática actual:

- módulos JavaScript;
- JSON;
- HTML/CSS;
- rutas compatibles con publicación web vigente.

No necesita backend ni nuevas dependencias.

### Phaser

Phaser no calcula pasivas, auras, maldiciones, afijos ni atributos modificados.

Solo representa los resultados canónicos cuando una modificación tenga consecuencia visual.

### Electron

Electron debe continuar reutilizando la misma lógica del juego.

No se moverá lógica de modificadores a Node.js ni al proceso principal.

No se requiere una dependencia nueva para este hito salvo que una etapa futura demuestre una necesidad concreta y reciba aprobación explícita.

---

## 25. ARCHIVOS Y ÁREAS CLAVE INICIALES

HP1 cerró la migración de progresión y deja como herencia canónica para las etapas siguientes:

```text
src/juego/maestrias/ContextoProgresoHabilidades.js
src/juego/maestrias/ProgresoHabilidadesJugador.js
src/juego/maestrias/ValidadorConfiguracionProgresoHabilidades.js
src/config/habilidades/Maestrias.json
src/config/habilidades/Habilidades.json
src/interfaz/habilidades/PanelHabilidadesMaestrias.js
src/interfaz/habilidades/IntegracionHabilidadesDom.js
src/partida/PersistenciaJugador.js
src/partida/EstadoPartida.js
```

Las etapas siguientes deben revisar según alcance:

```text
src/entidad/destructible/combatiente/EstadisticasDerivadas.js
src/entidad/destructible/combatiente/ConfiguracionAtaque.js
src/juego/visibilidad/PercepcionJugador.js
src/juego/efectos/ContratosEfectosTemporales.js
src/juego/efectos/SistemaEfectosTemporales.js
src/juego/objetos/SistemaAfijos.js
src/entidad/destructible/combatiente/Combatiente.js
src/entidad/destructible/combatiente/Player.js
src/config/objetos/afijos/Prefijos.json
src/config/objetos/afijos/Sufijos.json
src/interfaz/PanelPersonaje.js
```

No debe asumirse que esta lista reemplaza el análisis de imports, instancias y flujo real obligatorio de cada etapa.

---

## 26. DECISIONES CERRADAS

Quedan aprobadas como dirección del hito:

1. existe un único sistema general de progresión de habilidades;
2. HP1 reemplazó `ProgresoMagicoJugador` por `ProgresoHabilidadesJugador`, sin duplicarlo ni conservar wrappers;
3. Maestrías/Habilidades generales salen del directorio conceptual exclusivo de magia;
4. pasivas consumen los mismos puntos universales/específicos que las activas;
5. pasivas, auras, maldiciones y afijos globales comparten un sistema canónico de modificadores;
6. auras/maldiciones mantienen su ciclo de vida mediante el sistema temporal existente;
7. no existe un sistema independiente por estadística;
8. las ecuaciones solicitan modificaciones mediante claves registradas canónicamente;
9. las configuraciones validan esas claves y fallan ante desconocidas;
10. se distinguen `sumar`, `porcentaje_base` y `porcentaje_total`;
11. los límites finales continúan perteneciendo a la regla propietaria;
12. `DANO_HABILIDAD` modifica daño de habilidades;
13. `ATRIBUTO_HABILIDAD` modifica parámetros internos como alcance, radio o cantidad de objetivos;
14. los atributos de habilidad también utilizan un registro canónico;
15. las condiciones se basan en contexto canónico y no en nombres visibles;
16. los afijos locales continúan perteneciendo al objeto;
17. los afijos globales del portador reutilizan el resolutor común;
18. esta infraestructura debe permitir futuros afijos legendarios globales;
19. XP de armas se basa en daño realmente aplicado;
20. XP de armaduras se basa en daño mitigado por Armadura y se distribuye por contribución de categoría;
21. el set completo ligero se compone de cabeza, torso, manos, piernas y pies; el escudo queda fuera;
22. Maestría dual reduce la penalización de daño de la mano secundaria, no el recargo temporal;
23. el panel Personaje muestra pasivas y efectos activos;
24. una pasiva aprendida puede mostrarse inactiva si no cumple su condición;
25. los tooltips utilizan el mismo resultado/desglose canónico y no recalculan estadísticas;
26. HP1 parte sin partidas guardadas previas y no implementa migraciones/parches históricos;
27. HP2 debe auditar exhaustivamente objetivos potenciales, incluyendo escudos, quiver y variables no enumeradas inicialmente;
28. el resolutor canónico pertenece al concepto de combatiente y debe funcionar también para enemigos afectados por auras/maldiciones;
29. la integración de afijos globales se absorbe en HP2 y deja de ser una etapa independiente;
30. HP3 debe diseñar una colección amplia de pasivas y definir con mayor precisión la XP física antes de implementar;
31. HP4 debe auditar exhaustivamente atributos modificables de habilidades y diseñar una colección amplia de auras/maldiciones;
32. HP5 debe evaluar si la pantalla de Personaje requiere rediseño antes de implementar la presentación final.

---

## 27. DECISIONES DE BALANCE ABIERTAS

No bloquean la arquitectura y se resolverán en la etapa de implementación/contenido correspondiente:

- magnitud exacta de Maestría dual;
- magnitud exacta de Evasión otorgada por Armadura ligera;
- factores iniciales `factorExperienciaArma` y `factorExperienciaArmadura`;
- requisitos de nivel, grados y escalado de futuras pasivas físicas;
- catálogo inicial amplio de objetivos modificables, a cerrar en HP2 tras auditoría real;
- catálogo inicial amplio de atributos de habilidad modificables, a cerrar en HP4 tras auditoría real;
- catálogo y magnitudes concretas de pasivas, auras y maldiciones diseñadas en HP3/HP4.

Estos valores deben quedar configurables siempre que la arquitectura real lo permita.

---

## 28. CRITERIOS DE CIERRE DEL HITO

El hito completo solo puede cerrarse cuando:

- existe una única progresión general de habilidades;
- no queda una progresión productiva paralela exclusivamente mágica para el mismo propósito;
- existe un único registro canónico de objetivos modificables;
- existe un único resolutor de modificadores;
- no existen implementaciones por nombre visible para las pasivas incorporadas;
- porcentaje sobre base y porcentaje sobre total producen resultados reproducibles;
- pasivas reales modifican estadísticas/combate mediante el resolutor;
- atributos de habilidades pueden ser modificados mediante el mismo contrato;
- auras/maldiciones reutilizan el ciclo de vida temporal existente y pueden modificar jugador o enemigos mediante el mismo resolutor;
- afijos globales reutilizan modificadores y afijos locales continúan siendo locales;
- XP de armas y armaduras usa resultados canónicos;
- el panel Personaje muestra pasivas y efectos activos;
- los tooltips muestran desgloses coherentes con los valores reales;
- persistencia no guarda resultados derivados duplicados;
- el nuevo esquema de persistencia guarda y carga correctamente sin depender de migraciones históricas;
- herramientas de balance/depuración afectadas están actualizadas;
- versión web funciona;
- Electron funciona cuando corresponda a la validación disponible;
- documentación visual se actualiza si el contrato de presentación cambia;
- no se instalaron dependencias no aprobadas;
- Git status final fue revisado;
- existe documento de entrega del cierre;
- existe Conventional Commit propuesto;
- no se avanzó automáticamente a otro hito.

---

## 29. REGLA DE ORO DEL HITO

> **El contenido declara modificaciones; las ecuaciones canónicas declaran puntos modificables; un único resolutor conecta ambos mediante IDs y contexto canónicos.**

Si agregar una nueva pasiva, aura, maldición o afijo global sobre un objetivo ya soportado obliga a editar `SistemaCombate`, una habilidad concreta, un enemigo concreto o un panel para introducir una excepción, la implementación no está respetando este Plan Maestro. El mismo objetivo canónico debe poder resolverse para cualquier combatiente compatible con esa regla.
