# ABC Simulation Set
## A
+ Act as a timestamp manager, history dependent.
+ Broadcast message to B and C.
+ Receive message from C as a confirmation, then increment the timestamp.

## B
+ Receive the timestamp, multiply it by 2, and publish it.

## C
+ Receive the timestamp and the value of B.
+ Divide B by 2.
+ Publish the value after an assertion check.

## Diagram
+ Initial A
+ A -> B, C
+ B -> C
+ C -> A
