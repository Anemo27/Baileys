<h1><img alt="Baileys logo" src="https://raw.githubusercontent.com/WhiskeySockets/Baileys/refs/heads/master/Media/logo.png" height="75"/></h1>

## About this Fork
The original repository was removed by its author and later taken over by [WhiskeySockets](https://github.com/WhiskeySockets). This current fork is based on that. I've only made additions such as custom stores for storing authentication, messages, etc., and merged a few pull requests. That's all.


**If you encounter any issues after using this fork or any part of it, I recommend creating a new issue here rather than on WhiskeySocket's Discord server. AND EXPECT BUGS, LOTS OF BUGS (THIS IS UNSTABLE ASF)**

[![NPM Version](https://img.shields.io/npm/v/%40iamrony777%2Fbaileys?style=for-the-badge&logo=npm&label=BAILEYS&color=%2325D366)
](https://www.npmjs.com/package/@iamrony777/baileys)

[![Static Badge](https://img.shields.io/badge/READ-DOCS-d052d9?style=for-the-badge&logo=readthedocs&labelColor=white)](https://ronit.is-a.dev/Baileys/)


## Installation

Check `.env.example` first to setup databases
 

```bash
yarn install @iamrony777/baileys
```
or
```bash
yarn github:iamrony777/Baileys ## Directly from github repo
```

Then import your code using:
``` ts
import makeWASocket, { ... } from '@iamrony777/baileys'
```


## Connecting multi device (recommended)

### **I recommend to use Redis for storing auth data (as it is the fastest) and Mongo for storing chats, messages**

WhatsApp provides a multi-device API that allows Baileys to be authenticated as a second WhatsApp client by scanning a QR code with WhatsApp on your phone.

``` ts
import { MongoClient } from "mongodb";
import makeWASocket, {
  DisconnectReason,
  makeCacheableSignalKeyStore,
  makeMongoStore,
  useMongoDBAuthState,
} from "@iamrony777/baileys";
import { Boom } from "@hapi/boom";
import "dotenv/config";

async function connectToWhatsApp() {
  // MongoDB setup
  const mongo = new MongoClient(process.env.MONGODB_URL!, {
    socketTimeoutMS: 1_00_000,
    connectTimeoutMS: 1_00_000,
    waitQueueTimeoutMS: 1_00_000,
  });
  const authCollection = mongo.db("wpsessions").collection("auth");
  const { state, saveCreds } = await useMongoDBAuthState(authCollection);
  const store = makeMongoStore({ db: mongo.db("wpsessions"), autoDeleteStatusMessage: true });

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      /** caching makes the store faster to send/recv messages */
      keys: makeCacheableSignalKeyStore(state.keys),
    },

    // can provide additional config here
    printQRInTerminal: true,
  });

  // listen on events and update database
  store.bind(sock.ev);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log(
        "connection closed due to ",
        lastDisconnect?.error,
        ", reconnecting ",
        shouldReconnect
      );
      // reconnect if not logged out
      if (shouldReconnect) {
        await mongo.close();
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("opened connection");
      await sock.sendMessage(
        sock.user?.id!,
        {
          text: "Connected!",
        },
        { ephemeralExpiration: 1 * 60 }
      );
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    console.log(JSON.stringify(m, undefined, 2));

    // if message type is notify and not a protocol message
    if (
      m.type === "notify" &&
      !m.messages[0].message?.hasOwnProperty("protocolMessage")
    ) {
      console.log("replying to", m.messages[0].key.remoteJid);

      // await sock.sendMessage(m.messages[0].key.remoteJid!, {
      //   text: "Hello there!",
      // });
    }
  });

  sock.ev.on("creds.update", async () => {
    await saveCreds();
  });
}
// run in main file
connectToWhatsApp();

```

If the connection is successful, you will see a QR code printed on your terminal screen, scan it with WhatsApp on your phone and you'll be logged in!

**Note:** install `qrcode-terminal` using `yarn add qrcode-terminal` to auto-print the QR to the terminal.

**Note:** the code to support the legacy version of WA Web (pre multi-device) has been removed in v5. Only the standard multi-device connection is now supported. This is done as WA seems to have completely dropped support for the legacy version.


**Note:** I didn't add the search-by-contact-hash [implementation by purpshell](https://github.com/WhiskeySockets/Baileys/blob/ce325d11828b6f32584b39e7e427aa47b0ee555d/src/Store/make-in-memory-store.ts#L177-L181)  

## Custom funtions added to this package

### 1. `store?.getContactInfo(jid: string, socket: typeof makeWASocket)`
## Configuring the Connection

```typescript
if (events["contacts.update"]) {
  for (const update of events["contacts.update"]) {
    if (update.imgUrl === "changed") { // getting 
      const contact = await store?.getContactInfo(update.id!, sock);
      console.log(
        `contact ${contact?.name} ${contact?.id} has a new profile pic: ${contact?.imgUrl}`
      );
    }
  }
}
```




## Everything besides store and auth connectors are same as the original repo.

# [Read Official Docs](https://github.com/WhiskeySockets/Baileys?tab=readme-ov-file#baileys---typescriptjavascript-whatsapp-web-api)

![NPM Downloads](https://img.shields.io/npm/dw/%40iamrony777%2Fbaileys?label=npm&color=%23CB3837)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/iamrony777/baileys)


Baileys is a WebSockets-based TypeScript library for interacting with the WhatsApp Web API.

# Usage
A new guide has been posted at https://baileys.wiki.

# Sponsor
If you'd like to financially support this project, you can do so by supporting the current maintainer [here](https://purpshell.dev/sponsor).

# Disclaimer
This project is not affiliated, associated, authorized, endorsed by, or in any way officially connected with WhatsApp or any of its subsidiaries or its affiliates.
The official WhatsApp website can be found at whatsapp.com. "WhatsApp" as well as related names, marks, emblems and images are registered trademarks of their respective owners.

The maintainers of Baileys do not in any way condone the use of this application in practices that violate the Terms of Service of WhatsApp. The maintainers of this application call upon the personal responsibility of its users to use this application in a fair way, as it is intended to be used.
Use at your own discretion. Do not spam people with this. We discourage any stalkerware, bulk or automated messaging usage.

# License
Copyright (c) 2025 Rajeh Taher/WhiskeySockets

Licensed under the MIT License:
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Thus, the maintainers of the project can't be held liable for any potential misuse of this project.
