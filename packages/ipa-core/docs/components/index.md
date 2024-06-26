---
title: Overview
sidebar_position: 1700
---

import { ImportModulesCodeBlock } from '../docComponents/ImportModulesCodeBlock'

The UI Framework exports the following components:

```jsx
const IpaDialogs = {
    GenericModal: GenericModal
}
```

```jsx
const IpaControls = {
    SimpleTable,
    IpaButton: GenericMatButton,
    IpaMiniButton: MiniButton,
    IpaMiniIconButton: MiniIconButton,
    GenericMatButton,
    EnhancedFetchControl,
    StackableDrawer,
    FancyTreeControl,
    ChartStack,
    CrossEntitySearch,
    CreatableScriptedSelects,
    ScriptedLinkedSelects,
    ScriptedSelects,
    Iframe: GenericIframe,
    Image,
    ScriptedChart,
    SimpleTextThrobber
}
```

Example Usage:

<ImportModulesCodeBlock modules={['IpaDialogs', 'IpaControls']} />

```jsx
const {GenericModal} = IpaDialogs
const {IpaButton} = IpaControls

const TestPage = (props) => {
  useEffect(() => props.onLoadComplete(), [])

  const clickHandler = () => {
    props.actions.showModal(<MyModal />)
  }

  return (
    <div>
      <h1>This is a test page</h1>
      <h2>You can put test stuff here</h2>
      <IpaButton onClick={clickHandler}>Click Me For A Sample Dialog</IpaButton>
    </div>
  )
}

const MyModal = (props) => {
  return (
    <GenericModal
      title="Test Modal"  
      modalBody={
        <div>
          This is the modal body
        </div>
      }
    />
  )
}

export default TestPage;
```

Note that any components marked (coming soon) haven’t been transferred from DigitalTwin to ipaCore yet.