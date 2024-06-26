---
title: Install Node.JS and Set Up Client Application Structure
sidebar_position: 100
---

import { InstallCodeBlock } from './docComponents/InstallCodeBlock'

# Installation

<InstallCodeBlock />

##  Client application Structure

In order for the framework to load your pages and components, your
client application must have the following structure:

```
rootFolderOfApp/
├── node_modules/
└── app/
    ├── ipaCore/
    ├── components/
    ├── pageComponents/
    └── redux/
```

You may have any other folders and organize your client code any way you
wish, but the framework will require this structure for any content you
wish to use to extend the pages, components, and state management
handled by the UI framework.