```mermaid
%%{ init : { "theme" : "default" } }%%

graph TD
    Player -->|controls| Character
    Character -->|interacts with| Enemy
    Character -->|collects| Item
    Enemy -->|drops| Item
    Item -->|used by| Player
    World -->|contains| Character
    World -->|contains| Enemy
    World -->|contains| Item
```