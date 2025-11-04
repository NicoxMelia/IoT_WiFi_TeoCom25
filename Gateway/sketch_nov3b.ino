/*
 * ESP32 -> Gateway
 * Colección: lecturas_sensores
 * Campos: humedad (double), presion (double), temperatura (double),
 *         id_dispositivo (string), timestamp (RFC3339 UTC)
 *
 * Librerías incluidas con el core de ESP32: WiFi.h, HTTPClient.h, time.h
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <time.h>

#include <SPI.h>
#include <nRF24L01.h>
#include <RF24.h>

// ======= WIFI =======
const char* WIFI_SSID     = "Nombre";
const char* WIFI_PASS     = "Contrasena";

const char* PROJECT_ID    = "iot-wifi-tc25";
const char* COLLECTION    = "lecturas_sensores";
// ===========================

// NTP para timestamp (UTC)
const char* NTP1 = "pool.ntp.org";
const long  GMT_OFFSET_SEC = 0; 
const int   DST_OFFSET_SEC = 0;

//NRF24l011
RF24 radio(4, 5); 
const uint64_t address = 0xF0F0F0F0E1LL;

struct Datos 
{
  float temperatura;
  float humedad;
  float presion;
  String id;
};
Datos data;

String nowRFC3339UTC() {
  time_t now;
  time(&now);
  struct tm* tm_utc = gmtime(&now);
  char buf[30];
  // Formato RFC3339: YYYY-MM-DDTHH:MM:SSZ
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", tm_utc);
  return String(buf);
}

bool postToFirestore(float temp, float hum, float pres, String Grupo_id, const String& ts) {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;
  String url = String("https://firestore.googleapis.com/v1/projects/") +
               PROJECT_ID + "/databases/(default)/documents/" + COLLECTION;

  // JSON Firestore (tipos explícitos)
  // Usamos doubleValue para evitar strings en enteros.
  String body = String("{\"fields\":{") +
    "\"id_dispositivo\":{\"stringValue\":\"" + Grupo_id + "\"}," +
    "\"temperatura\":{\"doubleValue\":" + String(temp, 2) + "}," +
    "\"humedad\":{\"doubleValue\":"     + String(hum, 2)  + "}," +
    "\"presion\":{\"doubleValue\":"     + String(pres, 2) + "}," +
    "\"timestamp\":{\"timestampValue\":\"" + ts + "\"}" +
  "}}";

  if (!https.begin(client, url)) return false;
  https.addHeader("Content-Type", "application/json");

  int code = https.POST(body);
  String resp = https.getString();
  https.end();

  Serial.printf("HTTP %d\n", code);
  if (code >= 200 && code < 300) {
    Serial.println("OK -> Documento creado");
    return true;
  } else {
    Serial.println("Respuesta:");
    Serial.println(resp);
    return false;
  }
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.print("\nIP: "); Serial.println(WiFi.localIP());
}

int recvData() {
  if ( radio.available() ) 
  {
    radio.read(&data, sizeof(Datos));
    return 1;
    }
    return 0;
}

void setup() {
  Serial.begin(115200);
  delay(200);

  radio.begin();
  connectWiFi();

  configTime(GMT_OFFSET_SEC, DST_OFFSET_SEC, NTP1);
  Serial.print("Sincronizando NTP");
  time_t now = 0;
  int tries = 0;
  while (now < 8 * 3600 * 2 && tries < 20) {
    Serial.print(".");
    delay(500);
    time(&now);
    tries++;
  }
  Serial.println("\nTiempo sincronizado.");
  randomSeed((uint32_t)now);

  radio.openReadingPipe(0, address);   //Setting the address at which we will receive the data
  radio.setPALevel(RF24_PA_MIN);       //You can set this as minimum or maximum depending on the distance between the transmitter and receiver.
  radio.startListening();              //This sets the module as receiver

}

void loop() {
  if(recvData()) {

  Serial.print("Temperatura = ");
  Serial.print(data.temperatura);
  Serial.println("*C");

  Serial.print("Presion = ");
  Serial.print(data.presion);
  Serial.println("hPa");

  Serial.print("Humedad = ");
  Serial.print(data.humedad);
  Serial.println("%");

  Serial.print("Equipo = ");
  Serial.println(data.id);
  

  Serial.println();

  //Mandar datos
  String ts = nowRFC3339UTC();

  // 3) POST a Firestore
  Serial.printf("\nEnviando -> T=%.2f°C  H=%.2f%%  P=%.2f hPa  TS=%s\n",
                data.temperatura, data.humedad, data.presion, ts.c_str());
  bool ok = postToFirestore(data.temperatura, data.humedad, data.presion, data.id, ts);
  if (!ok) {
    // reintento soft si se cayó WiFi
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi caído. Reintentando conexión...");
      connectWiFi();
    }
  }
  }
}