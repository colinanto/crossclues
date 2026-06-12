# Security Specification for Cross Clues Digital

## 1. Data Invariants
- A `Game` must have a `hostId` and a grid of `words`.
- A `Player` must belong to an existing `Game`.
- A `Clue` must reference an existing `Game` and its author must be a player in that game.
- Coordinates must be in the format `[A-E][1-5]`.

## 2. The Dirty Dozen Payloads (Rejection Targets)
1. Creating a Game with a hostId not matching the current user.
2. Joining a game with a coordinate that doesn't exist (e.g., "Z9").
3. Submitting a clue for a game you are not a member of.
4. Modifying someone else's player profile in a game.
5. Changing the hostId of a game after creation.
6. Submitting a clue that is 1MB in size.
7. Injecting a ghost field `isAdmin: true` into a Game document.
8. Listing colors or players of a game you aren't part of.
9. Deleting a game if you aren't the host.
10. Creating a game with a future `createdAt` timestamp.
11. Updating a clue after it has been submitted (clues are generally immutable in this design).
12. Creating a player with a huge name string (10k characters).

## 3. Test Runner (Draft)
A complete `firestore.rules.test.ts` would verify these scenarios. For this turn, we focus on the rules logic.
