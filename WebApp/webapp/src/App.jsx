// src/App.jsx (solo esta parte)
import { db } from "./services/firebase";
import {
  collection, query, where, orderBy, getDocs, Timestamp
} from "firebase/firestore";

// fetch real a Firestore
async function fetchData({ from, to }) {
  const col = collection(db, "measurements");

  // Convertimos a Timestamp de Firestore
  const fromTs = from ? Timestamp.fromDate(new Date(from.setHours(0,0,0,0))) : null;
  const toTs   = to   ? Timestamp.fromDate(new Date(to.setHours(23,59,59,999))) : null;

  // Armamos query (rango en el MISMO campo + orderBy en ese campo)
  let q;
  if (fromTs && toTs) {
    q = query(col, where("ts", ">=", fromTs), where("ts", "<=", toTs), orderBy("ts"));
  } else if (fromTs) {
    q = query(col, where("ts", ">=", fromTs), orderBy("ts"));
  } else if (toTs) {
    q = query(col, where("ts", "<=", toTs), orderBy("ts"));
  } else {
    q = query(col, orderBy("ts")); // todo el historial (ojo con volumen)
  }

  const snap = await getDocs(q);
  const rows = snap.docs.map(d => {
    const data = d.data();
    const date = data.ts.toDate();
    return {
      time: date.toLocaleString(), // etiqueta eje X
      ts: date.getTime(),
      temp: data.temp,
      hum: data.hum,
      press: data.press,
    };
  });

  return rows;
}
