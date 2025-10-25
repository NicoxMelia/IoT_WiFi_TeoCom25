import logo from "../assets/logoFacultadNoBG.png"; // sin tildes ni espacios

export default function Header() {
  return (
    <div className="card">
      <div className="header">
        <div>
           <img src={logo} alt="Logo FCEFyN" width={64} height={64} />
        </div>
        <div>
          <h1>FCEFyN — Lectura de Datos Ambientales mediante sensores comunicados por LoRa y WiFi
          </h1>
          <p>Temperatura • Humedad • Presión — Datos IoT</p>
        </div>
      </div>
    </div>
  );
}
