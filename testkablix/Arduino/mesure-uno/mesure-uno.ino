// BANC DE MESURE : cinq montages sur une planche, six appareils dessus.
//
//   M1 VOLTMETRE   aux bornes du moteur       -> suit le rapport cyclique
//   M2 AMPEREMETRE en serie sur son alim      -> suit le rapport cyclique
//   O1 OSCILLOSCOPE sur la base du transistor -> montre le creneau, pas sa moyenne
//   M3 VOLTMETRE   aux bornes du ventilateur  -> l'alim s'affaisse sous 850 mA
//   M4 VOLTMETRE   aux bornes de la bobine    -> le relais colle vers 4,7 V
//   M5 VOLTMETRE   sur le curseur du pot      -> la moitie de la tension d'alim
//
// Le programme fait monter le rapport cyclique de D9 par paliers. Regarde M1 et
// M2 suivre pendant que O1 garde la meme hauteur de creneau : c'est TOUTE la
// difference entre les deux appareils. Le multimetre moyenne, l'oscilloscope
// montre. Un moteur hache a 50 % lit 2,3 V au voltmetre, mais ne voit jamais
// 2,3 V : il voit du 4,6 V une fois sur deux.
const int VARIATEUR = 9;   // base du transistor, a travers 1 kohm
const int RELAIS = 8;      // base du second transistor
const int CURSEUR = A0;    // curseur du potentiometre

void setup() {
  Serial.begin(115200);
  pinMode(VARIATEUR, OUTPUT);
  pinMode(RELAIS, OUTPUT);
  digitalWrite(RELAIS, HIGH);   // le relais colle et reste colle
  Serial.println("Banc de mesure : M1/M2 suivent le rapport cyclique, O1 non.");
}

void loop() {
  for (int pourcent = 0; pourcent <= 100; pourcent += 25) {
    analogWrite(VARIATEUR, (pourcent * 255) / 100);
    delay(1200);
    Serial.print("rapport cyclique ");
    Serial.print(pourcent);
    Serial.print(" %  |  curseur = ");
    Serial.println(analogRead(CURSEUR));
  }
}
