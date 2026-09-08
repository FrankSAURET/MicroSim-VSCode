// Variateur par le HAUT : le transistor PNP est entre le + et le moteur.
//
// Un PNP conduit quand sa base est TIREE VERS LE BAS : la commande est donc
// INVERSEE. A 0 % de rapport cyclique la base reste basse en permanence et le
// moteur tourne a plein regime ; a 100 % elle reste haute et il s'arrete.
//
// M1 lit la tension moyenne aux bornes du moteur, M2 le courant, O1 montre le
// creneau de commande — dont la hauteur ne change jamais.
const int VARIATEUR = 9;   // base du PNP, a travers 1 kohm

void setup() {
  Serial.begin(115200);
  pinMode(VARIATEUR, OUTPUT);
  Serial.println("Variateur PNP : 0 % = plein regime, 100 % = arret.");
}

void loop() {
  for (int pourcent = 0; pourcent <= 100; pourcent += 25) {
    analogWrite(VARIATEUR, (pourcent * 255) / 100);
    delay(1200);
    Serial.print("rapport cyclique ");
    Serial.print(pourcent);
    Serial.println(" %  ->  le moteur ralentit");
  }
}
