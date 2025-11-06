#include <SPI.h>
#include <Wire.h>
#include <nRF24L01.h>
#include <RF24.h>

RF24 radio(4, 5); 
const uint64_t address = 0xF0F0F0F0E1LL;
int counter = 0;


float temperatura;
float humedad;
float presion;


struct Datos 
{
  float temperatura;
  float humedad;
  float presion;
  String id;
};
Datos data;

void setup() 
{
Serial.begin(115200);
radio.begin();              
radio.openWritingPipe(address); 
radio.setPALevel(RF24_PA_MIN); 
radio.stopListening();         

}
void loop()
{
  data.temperatura = 23;
  data.presion = 950;
  data.humedad = 50;
  data.id = "Mariano"; //Id de su grupo
  
  
  Serial.print("Temperatura = ");
  Serial.print(data.temperatura);
  Serial.println("*C");

  Serial.print("Presion = ");
  Serial.print(data.presion);
  Serial.println("hPa");

  Serial.print("Humedad = ");
  Serial.print(data.humedad);
  Serial.println("%");

  Serial.println();
  
  radio.write(&data, sizeof(Datos));
  
  Serial.println("Paquete de Datos Enviado");
  Serial.println("");

  delay(15000);
}