# Kalaha-Arena
Gathers and manage all [Kalaha](https://en.wikipedia.org/wiki/Kalah) (a.k.s. Mancala) participants.
Click image below to join the official Discord channel.
<br>[![Discord banner2](https://discord.com/api/guilds/765291928454823936/widget.png?style=banner2)](https://discord.gg/fxgQqacSgG)

## Rules
You will receive an array that represents where the pellets are located. The first half is your side and the later is the oponents. The store is located last in each half.
The `tick`-counter starts at 0 and raised 1 after a choise is made.
The `switch`-counter starts at 0 and raised 1 when the player is swaped.

### Rules violation
If response violate any of this, the respons will be replaced with taking the first valid keep farest from the store.
- Caught exceeding the time limit (`executionSteps`) for tick execution defined by the tournament.
- Trying to movie pellets from the opponent's side or the stores.
