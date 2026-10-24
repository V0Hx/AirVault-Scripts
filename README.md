# AirVault scripts

Tampermonkey scripts for Torn. This repository contains the distributable scripts; the shared service is hosted separately.

- [Install Public Traveler Wallet](https://raw.githubusercontent.com/V0Hx/AirVault-Scripts/main/userscript/airvault-traveler.user.js)
- [Install Banker Console](https://raw.githubusercontent.com/V0Hx/AirVault-Scripts/main/userscript/airvault-banker.user.js) — operator only; server-side Torn identity verification restricts banker access.

Install Tampermonkey, open the appropriate link, confirm installation, and reload Torn. Look for AV (traveler) or AV·B (banker) in the bottom toolbar. If it does not appear there, look for the floating AirVault button.

Updates are checked by Tampermonkey on its configured schedule. You can also choose Check for userscript updates. Disable duplicate or obsolete installations.

Sign in using your own Torn API key inside the script after reading the usage disclosure. Never post API keys in issues, screenshots, or chat. No separate AirVault account registration is needed. The script discards the key after verification and stores an opaque service session.

This is a test service. All in-game transfers are manual. Travel and purchase-log monitoring are not yet enabled. Distribution of the traveler script does not indicate the service is accepting funding requests.

Both scripts are public code. Downloading the banker script does not grant banker permissions. Neither script contains service-role keys or database credentials.
