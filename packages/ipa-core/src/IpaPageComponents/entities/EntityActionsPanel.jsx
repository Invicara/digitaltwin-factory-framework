import React from "react"
import {compose} from "redux";
import {connect} from "react-redux";
import _ from 'lodash'
import ScriptHelper from "../../IpaUtils/ScriptHelper";

import { getEntityActionComponent } from '../../redux/slices/entityUI'

import '../../IpaStyles/DbmTooltip.scss'

const EntityActionsPanel = ({actions, entity, type, context, getEntityActionComponent}) => {
  let icons = []

  const runPreEntityActionScript = async (payload) => {

    const {action, entity, type} = payload

    if(!action.preActionScript){
      return entity;
    }

    let result = await ScriptHelper.executeScript(action.preActionScript, {entity: entity, entityType: action.entitySchema ? action.entitySchema : type.singular.toLowerCase()});

    return result ?? entity;
  }

  const doAction = async (actionName) => {
    let action = _.cloneDeep(actions[actionName])

    // populate the specific action with info needed by the action component
    action.name = actionName
    action.doEntityAction = actions.doEntityAction
    action.onSuccess = actions.onSuccess
    action.onError = actions.onError
    action.onCancel = actions.onCancel

    if (action.component) {
      // if there's a component then create it and let it handle the execution
      let factory = getEntityActionComponent(action.component.name)
      if (!factory) {
        console.error("No factory for " + action.component.name)
        return null
      }

      let newEntity = Array.isArray(entity) ? [...entity] : Object.assign({}, entity)

      newEntity = await runPreEntityActionScript({action, entity: newEntity, type})
      // the factory create method can use the app context to display the component
      // e.g. context.ifefShowModal(modal);
      factory.create({action, entity: newEntity, type, context})
    }
    else {
      // if there's no component execute the action directly
      let newEntity = action.showOnTable && Array.isArray(entity) ? [...entity] : Object.assign({}, entity)

      newEntity = await runPreEntityActionScript({action, entity: newEntity, type});

      let origEntity = action.showOnTable && !Array.isArray(entity) ? [{...entity}] : entity;

      let result = await action.doEntityAction(action.name, {new: newEntity, original: origEntity});
      if (result.success) {
        if (action.onSuccess) action.onSuccess(action.type, newEntity, result)
      }
      else {
        if (action.onError) action.onError(action.type, entity, result)
      }
    }
  }

  if (actions) {
    Object.keys(actions).forEach(actionName => {
      let action = actions[actionName]
      if (action.allow)
        icons.push(
          <div key={"icon-"+actionName} className="dbm-tooltip">
            <i className={action.icon}  onClick={e=>doAction(actionName)}/>
            <span className="dbm-tooltiptext">{actionName}</span>
          </div>
        )
    })
  }
  return <div className="entity-actions-panel">{icons}</div>;
}

//export default EntityActionsPanel
const mapStateToProps = state => ({});

const mapDispatchToProps = {
    getEntityActionComponent
}

export default compose(
    connect(mapStateToProps, mapDispatchToProps),
)(EntityActionsPanel)