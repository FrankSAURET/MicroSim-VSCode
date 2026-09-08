# Variateur par le HAUT : le transistor PNP est entre le + et le moteur.
#
# Un PNP conduit quand sa base est TIREE VERS LE BAS : la commande est donc
# INVERSEE. A 0 % de rapport cyclique le moteur tourne a plein regime, a 100 %
# il s'arrete.
from machine import Pin, PWM
import time

variateur = PWM(Pin(15))
variateur.freq(1000)

print("Variateur PNP : 0 % = plein regime, 100 % = arret.")

while True:
    for pourcent in range(0, 101, 25):
        variateur.duty_u16(pourcent * 65535 // 100)
        time.sleep_ms(1200)
        print("rapport cyclique", pourcent, "%  ->  le moteur ralentit")
