# Historical note: browser-only VIBE credits

**Original experiment: 4 October 2026 · superseded 5 October 2026**

This English summary preserves the intent of the earlier browser prototype. The implemented account ledger is specified in [source Call rules](VIBE_SOURCE_CALL_PRD.md).

The experiment gave a browser 1,000 free VIBE, accepted integer amounts of 10–500 per demo Call, rejected duplicate entries and refunded void Calls. Correct predictions did not award extra credits in that initial version. State lived in `vibe-virtual-wallet-v1` in localStorage, with Web Locks where supported.

It was editable by the browser owner, not synchronized between devices, and not a trusted server ledger. Clearing browser data could recreate the grant. It did not deploy an ERC-20, change the Monad proof contract or support purchase, transfer or cash-out.

The later implementation moved identity and balances to the server, added fixed 2× total returns and real source-based settlement. Do not use the old rules to explain today's product.

The original detailed Indonesian record remains available in [Git history](https://github.com/enzerra/Project-Monad/blob/3bc68b2/VIBE_VIRTUAL_TOKEN_PRD.md).
