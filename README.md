# Intelligent Notification Service (AI test)

Servicio que recibe peticiones en lenguaje natural (por ejemplo, "Manda un mail a feda@test.com diciendo hola"), extrae con un motor de IA el destinatario, el mensaje y el canal, y envía la notificación a través de un proveedor externo.

- Enunciado original: [docs/test-statement.md](docs/test-statement.md)
- Motor de IA y proveedor de notificaciones (mock): [provider/](provider/), con su documentación en `http://localhost:3001/docs`

> El historial de commits sigue el orden en que se fue construyendo, por hitos.

## Requisitos

- Node.js 26 (fijado en [.node-version](.node-version)).
- Docker, para el mock, el servicio y el test de carga.

## Uso

Desde `app/`:

| Comando         | Descripción                                                   |
| --------------- | ------------------------------------------------------------- |
| `npm install`   | Instala las dependencias                                      |
| `npm test`      | Lanza los tests                                               |
| `npm run dev`   | Arranca el servicio en el puerto 5000 con recarga en caliente |
| `npm run build` | Compila a `dist/`                                             |

El servicio comparte red con el contenedor del mock (`network_mode: service:provider`), que es quien publica el puerto 5000. Para levantar ambos:

```bash
docker compose up -d provider influxdb grafana
docker compose up -d --build app
```

## Test de carga

Con el mock y el servicio levantados:

```bash
docker compose run --rm load-test
```

Los resultados se ven en [Grafana](http://localhost:3000/d/ia-performance-scorecard/).

### Evolución

Resultados del test tras cada paso. Es una ejecución por paso: sirven para ver la tendencia, no como cifras exactas.

- **Checks OK:** comprobaciones de k6 que pasan.
- **`/process`:** tiempo medio de respuesta. El scorecard lo marca en verde por debajo de 400 ms.
- **Enviadas:** peticiones que acaban en `sent`, sobre las procesadas durante el test.
- **Descartadas por la IA:** peticiones que acaban en `failed` porque la respuesta de la IA no contiene una notificación utilizable.
- **Llamadas a la IA:** llamadas a `/v1/ai/extract` por cada `/process`. El scorecard la marca en verde por debajo de 1,5.

| Paso | Checks OK | `/process` | Enviadas | Descartadas por la IA | Llamadas a la IA |
| ---- | --------- | ---------- | -------- | --------------------- | ---------------- |
| Endpoints sin procesamiento | 100 % | < 1 ms | — | — | — |
| Procesamiento síncrono | 100 % | 2,3 s | 18 % (200 de 1142) | 48 % | 1,00 |
| Limpieza y validación de la respuesta | 100 % | 2,3 s | 18 % (204 de 1143) | 9 % | 1,00 |
| Procesamiento en segundo plano | 100 % | 0,5 ms | 7 % (203 de 2749) | 11 % | 1,00 |

- Con `/process` vacío, el tiempo de respuesta es solo el del servicio: sirve de referencia para los pasos siguientes.
- Con el procesamiento síncrono, `/process` tarda lo que la IA (1,5–3 s). Las peticiones que no se envían fallan por tres causas, según los logs: la respuesta de la IA no es JSON (30 %: texto alrededor, bloques de Markdown, JSON mal formado o negativas), el JSON no tiene la forma esperada (18 %: claves con otro nombre o campos que faltan), y el proveedor de notificaciones rechaza el envío por límite de peticiones (34 %).
- Con la limpieza, las respuestas de la IA que fallan son solo las negativas, que no contienen datos. Las enviadas no suben porque el proveedor de notificaciones acepta unas 50 cada 10 s, y el resto se rechaza por límite de peticiones (73 %).
- En segundo plano, `/process` responde sin esperar a la IA y cada usuario del test completa más peticiones en el mismo tiempo. Los envíos aceptados siguen siendo unos 200, así que el porcentaje baja: el 82 % se rechaza por límite de peticiones. Las enviadas se cuentan cuando termina el procesamiento pendiente, unos segundos después del test.

## Stack

Node.js 26 · TypeScript · Hono · Zod · Vitest.

El enunciado pide FastAPI; la empresa dejó elegir el lenguaje, y el servicio respeta el mismo contrato HTTP en el puerto 5000.

## Configuración

Por variables de entorno, en [app/.env](app/.env). `npm run dev`, `npm start` y la imagen de Docker lo cargan al arrancar. Si falta alguna variable, el servicio no arranca e indica cuál.

| Variable           | Descripción                                           |
| ------------------ | ----------------------------------------------------- |
| `PROVIDER_URL`     | URL del motor de IA y del proveedor de notificaciones |
| `PROVIDER_API_KEY` | API key del proveedor                                 |

> **El `.env` está en el repositorio a propósito**, para que el servicio funcione sin pasos previos y con el `docker-compose.yaml` del enunciado sin modificarlo. Solo contiene la API key del entorno de pruebas que da el enunciado. En un proyecto real no se versionaría ni se incluiría en la imagen: las variables se pasarían al desplegar y la key vendría de un gestor de secretos.

## Estructura

```
app/
  src/app.ts                          composición de la app y manejo de errores
  src/server.ts                       arranque del servidor HTTP
  src/config.ts                       configuración leída del entorno
  src/requests/routes.ts              endpoints de /v1/requests
  src/requests/store.ts               almacenamiento de las peticiones
  src/requests/process-request.ts     procesamiento: extracción, envío y estado
  src/extraction/extractor.ts         prompt y validación de la respuesta de la IA
  src/extraction/json-candidate.ts    localiza el JSON en el texto de la respuesta
  src/extraction/json-repair.ts       repara el JSON mal formado
  src/extraction/fields.ts            normaliza los nombres de los campos
  src/extraction/recipient.ts         reconoce emails y teléfonos
  src/notifications/notification.ts   tipo de la notificación
  src/provider/                       clientes HTTP del motor de IA y de notificaciones
  test/                               tests
```

## API

| Método y ruta                    | Respuesta                                    |
| -------------------------------- | -------------------------------------------- |
| `POST /v1/requests`              | `201 { id }`                                 |
| `POST /v1/requests/{id}/process` | `202 { id, status }`                         |
| `GET /v1/requests/{id}`          | `200 { id, status }`                         |

`status` es `queued`, `processing`, `sent` o `failed`. Los errores devuelven `{ error }`: 400 si el JSON está mal formado, 422 si `user_input` falta o está vacío y 404 si la petición no existe.

## Decisiones

- **Peticiones en memoria.** El enunciado no pide persistencia y el servicio corre en una sola instancia. El almacenamiento queda detrás de una clase propia, así que cambiarlo por una base de datos no afecta a las rutas.
- **422 para entradas inválidas**, el código que devolvería FastAPI con el mismo contrato, y 400 solo cuando el cuerpo no es JSON.
- **La app recibe sus dependencias como parámetro** (`createApp({ store, ai, notifier })`): cada test empieza con un almacenamiento vacío y usa clientes falsos, sin red.
- **`/process` responde 202 y el procesamiento sigue en segundo plano.** La IA tarda segundos en responder; el estado se consulta con `GET /v1/requests/{id}`.
- **Una petición solo se procesa una vez.** `/process` solo la pone en marcha si está en `queued`; si no, devuelve su estado actual. Así una llamada repetida no envía la notificación dos veces.
- **Los clientes del proveedor solo traducen HTTP.** Una respuesta que no es 2xx se convierte en un `ProviderError` con el endpoint y el código; qué hacer con ella lo decide el procesamiento.
- **La respuesta de la IA se limpia y se valida antes de enviar nada**, en pasos separados que se prueban por separado:
  1. Se localiza el JSON: dentro de un bloque de Markdown, rodeado de texto o sin cerrar.
  2. Se repara el JSON mal formado de las formas que produce el motor: cortado con `...`, con comillas simples o con claves sin comillas. Las cadenas no se modifican.
  3. Se normalizan los nombres de los campos (`Recipient`, `destination`, `body`, `channel`…) y se descartan los que sobran.
  4. Si falta el tipo, se deduce del destinatario: un email es `email` y un teléfono, `sms`.
  5. Si falta el destinatario, se toma del texto del usuario, solo si contiene uno.
  6. El destinatario tiene que ser un email o un teléfono que aparezca en el texto del usuario, y el tipo tiene que corresponder con él.

  Si algún paso falla, la petición queda en `failed` y el motivo en el log.
- **La reparación del JSON es propia y cubre los casos conocidos del motor**, con un test por cada tipo de respuesta.
- **El texto del usuario se envía a la IA tal cual**, como mensaje `user` aparte del `system`, sin mezclarlo con las instrucciones.
- **La configuración es obligatoria y se comprueba al arrancar.**
