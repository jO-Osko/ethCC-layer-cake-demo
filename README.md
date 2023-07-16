# LayerCake workshop

## Getting started

Run 
```
yarn
yarn hardhat compile
```

Copy `.env.example` to `.env` and fill in the values.

Have fun :)


## Exercises

1. Start on origin chain and send some tokes to the destination chain using hardhat.

2. Deploy a contract on origin chain that can be primed to send `X` tokens to the address `Y` on the destination chain

3. Update the contract from 2 so that it also calls `onReceive` on the destination address.

4. Deploy a contract on the destination chain that immediately returns half of the tokens back to the sender