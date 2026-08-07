# ENTREGA P7.3A — INFRAESTRUCTURA BILINGÜE Y CONTENIDO LOCALIZADO

Fecha: 2026-08-07  
Etapa: P7.3A  
Base exacta: `93cbd48cb29c77c9af8f3de222e13437971abb32`  
Rama: `main`  
HEAD conservado: `93cbd48cb29c77c9af8f3de222e13437971abb32`  
Commit realizado: no  
Estado: validada manualmente y cerrada

## 1. Objetivo

Incorporar la primera mitad de la internacionalización de Dark Moon para la beta web: infraestructura común Español/Inglés, preferencia de idioma, selector ES/EN y localización de la interfaz estructural y del contenido presentado, sin traducir ni duplicar código, IDs o catálogos jugables.

La regla canónica aprobada es:

> Solo se traduce la presentación. Código, variables, nombres técnicos, claves jugables e IDs permanecen en español.

P7.3A no intenta todavía convertir todos los mensajes dinámicos de ejecución. Ese trabajo pertenece a P7.3B.

## 2. Cierre de P7.2

P7.2 fue probada por el usuario y commiteada en:

`93cbd48cb29c77c9af8f3de222e13437971abb32`

La arquitectura de preferencias de P7.2 se reutiliza sin crear una segunda persistencia para idioma.

## 3. Catálogos de idioma

Se agregan:

- `src/config/idiomas/es.json`;
- `src/config/idiomas/en.json`.

Los dos catálogos contienen exclusivamente información de presentación. No contienen daño, Maná, tiempo, alcance, probabilidades, reglas de estados, tablas de botín ni otra autoridad jugable.

La estructura se divide en:

- `interfaz`: botones, etiquetas, ayudas, accesibilidad y textos estructurales;
- `contenido`: nombres y descripciones localizadas indexadas por IDs canónicos.

El catálogo Español es la referencia de paridad para P7.3 y el idioma canónico inicial de la beta.

## 4. IDs y catálogos jugables

No se agregaron propiedades como:

- `nombreEN`;
- `descripcionEN`;
- `nombreES`;
- `descripcionES`.

Tampoco se crearon copias como `ArmasEN.json`, `HabilidadesEN.json` o equivalentes.

Los catálogos funcionales continúan siendo únicos y sus IDs siguen en español, por ejemplo:

- `daga_hierro`;
- `rafaga_glacial`;
- `congelamiento`;
- `curacion_lunar`.

La localización utiliza esos IDs como vínculo estable con `es.json` y `en.json`.

## 5. Fallback obligatorio de nombre y descripción

`Traductor.traducirContenido()` conserva la red de seguridad acordada con el usuario.

Para un objeto/configuración con contenido visible, la resolución es:

1. traducción del idioma activo;
2. si falta y el idioma no es Español, registrar una advertencia de desarrollo una sola vez;
3. utilizar el `nombre` o `descripcion` original recibido desde la definición jugable como respaldo explícito;
4. si no existe respaldo explícito, utilizar el catálogo Español;
5. nunca presentar `undefined` por una traducción ausente.

Ejemplo conceptual:

```text
objeto.id = daga_hierro
idioma = en
        ↓
en.json → objetos.daga_hierro.nombre
        ↓
Iron Dagger
```

Si la traducción inglesa faltara:

```text
objeto.nombre → Daga de hierro
```

La ausencia se informa en consola para desarrollo, pero no rompe la experiencia del jugador.

## 6. Infraestructura agregada

### `Traductor.js`

Responsabilidades:

- idioma activo;
- búsqueda de claves;
- interpolación `{parametro}`;
- localización de contenido por ID;
- fallback seguro;
- avisos de traducción faltante;
- suscripción al cambio de idioma;
- validación de paridad de catálogos.

### `CargadorIdiomas.js`

Carga ambos catálogos y exige paridad antes de construir el traductor.

### `ContextoIdioma.js`

Expone el traductor activo únicamente a la capa de presentación. No pertenece al dominio jugable.

### `AplicadorIdiomaDom.js`

Aplica textos y atributos localizados al DOM y a los `<template>` existentes, incluidos:

- texto visible;
- `title`;
- `aria-label`;
- placeholders;
- atributo `<html lang>`.

### `ControladorIdiomaDom.js`

Administra los switches sincronizados ES/EN y su estado accesible `aria-pressed`.

## 7. Preferencia de idioma

`src/config/presentacion/PreferenciasInterfaz.json` avanza a versión 2 y declara:

```json
"idioma": {
  "valorInicial": "es",
  "opciones": ["es", "en"]
}
```

Se mantienen las reglas de P7.2:

- el default pertenece al JSON canónico, no a JavaScript;
- si el usuario nunca cambia idioma no se escribe un override;
- elegir Inglés persiste solamente `idioma: "en"` si no existen otros overrides;
- volver a Español elimina ese override;
- preferencias persistidas con formato v1 continúan siendo legibles y reciben Español como valor inicial de la nueva preferencia.

El idioma no forma parte del guardado del personaje.

## 8. Selector ES / EN

Se incorpora un selector compacto:

```text
ES | EN
```

En:

- esquina superior derecha del menú principal;
- pantalla de Configuración.

Ambos controles están sincronizados. Cambiar idioma:

- no recarga la página;
- actualiza la preferencia efectiva;
- reaplica la interfaz estática;
- actualiza `lang` del documento;
- actualiza las pantallas de creación y Configuración;
- conserva Nuevo Juego, Continuar y el guardado sin alteraciones.

## 9. Contenido cubierto en P7.3A

La cobertura canónica ES/EN incluye los IDs funcionales principales:

| Categoría | Cantidad |
|---|---:|
| Objetos | 63 |
| Afijos | 58 |
| Enemigos | 11 |
| Variantes de enemigo | 3 |
| Efectos temporales | 8 |
| Habilidades jugador + NPC | 14 |
| Maestrías | 4 |
| Profesiones | 3 |
| Mapas, incluida ciudad | 6 |

También se localizaron atributos, rarezas, conjuntos iniciales, entidades de ciudad y el mercader.

La interfaz estructural cubierta incluye:

- menú principal;
- Configuración;
- creación de personaje;
- panel de personaje/HUD;
- inventario;
- equipamiento;
- detalle y comparación de objetos;
- contenedores y botín inspeccionable;
- comercio;
- Lythra;
- selector de mazmorra;
- habilidades y maestrías.

## 10. Cambio arquitectónico importante

Se eliminó una dependencia visual accidental del texto Español en `PanelPersonaje`: la inserción de la sección Magia ya no busca el encabezado literal `Resistencias`, sino un marcador semántico `data-seccion-personaje="resistencias"`.

Esto evita que el orden del panel cambie al traducir `Resistencias` como `Resistances`.

La regla aplica como criterio para P7.3: el idioma no puede controlar lógica o estructura por comparación de cadenas visibles.

## 11. Validación de catálogos

`validarParidadCatalogos()` exige:

- mismas rutas de texto en ES y EN;
- valores de texto no vacíos;
- mismos parámetros `{...}` en ambos idiomas;
- ausencia de claves adicionales accidentales.

La validación final de P7.3A pasó correctamente.

Además se comprobaron todas las referencias literales `interfaz.*` encontradas en JavaScript:

- referencias verificadas: 323 o más según la auditoría final;
- claves faltantes en ES: 0;
- claves faltantes en EN: 0.

## 12. Compatibilidad de contenido

Se compararon los IDs de los catálogos jugables principales contra los catálogos de presentación.

Resultado:

- Objetos: cobertura exacta ES/EN;
- Afijos: cobertura exacta ES/EN;
- Enemigos: cobertura exacta ES/EN;
- Efectos: cobertura exacta ES/EN;
- Habilidades: cobertura exacta ES/EN;
- Maestrías: cobertura exacta ES/EN;
- Profesiones: cobertura exacta ES/EN;
- Mapas: cobertura exacta ES/EN.

No se cambió ningún ID funcional para conseguir esa cobertura.

## 13. Validaciones técnicas

Se ejecutaron antes del empaquetado final:

- sintaxis de todos los JavaScript;
- lectura de todos los JSON;
- resolución de imports relativos;
- paridad ES/EN;
- pruebas dirigidas del traductor;
- fallback a `nombre`/`descripcion` originales;
- interpolación de parámetros;
- cambio ES → EN → ES;
- default `es` desde `PreferenciasInterfaz.json`;
- persistencia de override `en`;
- eliminación del override al volver al default;
- compatibilidad con persistencia de preferencias v1;
- IDs HTML sin duplicados;
- existencia de los cuatro controles ES/EN;
- controlador DOM del selector y `aria-pressed`;
- ausencia de `.mjs` y `.patch`;
- `git diff --check` sobre una copia limpia de HEAD con los cambios reales aplicados;
- aplicación del incremental sobre una copia limpia de la base;
- comparación exacta contra el ZIP completo.

Los conteos finales se registran también en la respuesta de entrega.

## 14. Validación en navegador

El entorno de ejecución no permite conectar mediante HTTP a `127.0.0.1`, aunque el servidor local puede iniciarse. Por ese motivo no fue posible automatizar una sesión interactiva real del navegador en esta entrega.

Pruebas manuales requeridas:

1. abrir sin preferencias y confirmar Español;
2. cambiar a EN desde el menú y comprobar cambio inmediato;
3. recargar y comprobar persistencia EN;
4. volver a ES y confirmar eliminación del override de idioma;
5. abrir Configuración y verificar que el switch esté sincronizado;
6. recorrer Nueva partida en Inglés;
7. comprobar profesión, conjunto inicial, objetos y descripciones;
8. iniciar partida y revisar HUD/personaje;
9. revisar inventario/equipamiento y detalles de objeto;
10. abrir habilidades/maestrías;
11. abrir selector de mazmorra;
12. comerciar y abrir Lythra;
13. revisar que nombres/descripciones sigan apareciendo aunque se fuerce una traducción faltante durante desarrollo;
14. comprobar que Continuar utiliza el mismo guardado en ambos idiomas;
15. comprobar `?render=canvas2d` como fallback.

## 15. Alcance excluido — P7.3B

P7.3A no declara terminada la internacionalización completa.

P7.3B debe abordar expresamente:

- mensajes dinámicos de combate;
- movimiento e interacciones;
- resultados dinámicos de comercio/curación/consumibles;
- estados, zonas y progresión;
- muerte y botín;
- textos transitorios Phaser y Canvas 2D;
- eliminación de la clasificación de mensajes basada en buscar frases españolas dentro de `MensajesJuego.js`;
- auditoría final de textos visibles literales.

Los mensajes técnicos de excepciones y diagnóstico para desarrollo pueden continuar en español: no forman parte de la experiencia localizada del jugador.

## 16. Riesgos conocidos

- Inglés puede ocupar más ancho que Español; debe revisarse visualmente el wrapping de botones, tarjetas y modales.
- Mientras P7.3B no esté terminada, algunos mensajes de ejecución continuarán apareciendo en Español aun con EN seleccionado.
- No se debe eliminar `nombre`/`descripcion` de los JSON jugables durante P7.3: continúan siendo datos canónicos/fallback útiles y consumidores existentes pueden depender de ellos.

## 17. Próximo paso

Después de la validación manual y commit de P7.3A:

**P7.3B — mensajes dinámicos, feedback Phaser/Canvas y cierre bilingüe.**

La prioridad será convertir significado a contratos semánticos antes de traducir texto, para que ninguna clasificación o decisión dependa de palabras españolas.
